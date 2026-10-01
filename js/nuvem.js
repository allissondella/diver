/*
 * nuvem.js — conversa com o Supabase usando só fetch (sem biblioteca externa).
 *
 *  - Login: e-mail e senha (Auth do Supabase), renovação automática da sessão, troca de senha
 *  - Perfil (tipo de conta: aluno, professor ou admin) e matrículas (quais cursos a pessoa vê)
 *  - Sincronia: espelha no banco (tabela "estado") tudo que o app guarda no navegador
 *    com chave "diver:v1:*" (progresso, tarefas, eventos...). PDFs ficam só no aparelho.
 *
 * Sem configuração em js/config.js, Nuvem.ativa = false e o app segue no "modo local".
 */
const Nuvem = (() => {
  const cfg = window.DIVER_CONFIG || {};
  const URL_BASE = String(cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
  const CHAVE_API = String(cfg.supabaseChave || '').trim();
  const CHAVE_SESSAO = 'diver:sessao';
  const PREFIXO_SYNC = 'diver:v1:';

  /** Protege contra o erro mais perigoso: colar a chave secreta no site público. */
  function chaveSecreta(chave) {
    if (chave.startsWith('sb_secret_')) return true;
    try {
      const corpo = JSON.parse(atob(chave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return corpo.role === 'service_role';
    } catch (e) {
      return false;
    }
  }
  const secreta = CHAVE_API && chaveSecreta(CHAVE_API);
  if (secreta) console.error('Diver: a chave em js/config.js é SECRETA (service_role). Troque pela chave anon/publishable.');
  const ativa = !!(URL_BASE && CHAVE_API) && !secreta;

  let sessao = lerSessao();
  let perfil = null;
  let matriculas = [];

  /* ---------- Sessão (guardada no navegador) ---------- */
  function lerSessao() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO)) || null;
    } catch (e) {
      return null;
    }
  }
  function gravarSessao(dados) {
    sessao = dados
      ? {
        access_token: dados.access_token,
        refresh_token: dados.refresh_token,
        expires_at: dados.expires_at || Math.floor(Date.now() / 1000) + (dados.expires_in || 3600),
        user: { id: dados.user.id, email: dados.user.email },
      }
      : null;
    try {
      if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
      else localStorage.removeItem(CHAVE_SESSAO);
    } catch (e) {
      /* sem armazenamento: a sessão vale só enquanto a aba estiver aberta */
    }
  }

  /* ---------- Requisições ---------- */
  /** Traduz os erros mais comuns para mensagens gentis em português. */
  function mensagemDeErro(dados, status) {
    const bruto = (dados && (dados.erro || dados.message || dados.msg || dados.error_description || dados.error)) || '';
    if (/invalid login credentials/i.test(bruto)) return 'E-mail ou senha incorretos.';
    if (/banned/i.test(bruto)) return 'Seu acesso está desativado. Fale com o admin.';
    if (/should be different|same.*password/i.test(bruto)) return 'A nova senha precisa ser diferente da atual.';
    if (/password should be at least|weak/i.test(bruto)) return 'Essa senha é fraca demais. Use pelo menos 8 caracteres.';
    if (/jwt expired|invalid jwt|not authenticated/i.test(bruto) || status === 401) return 'Sua sessão expirou. Entre de novo.';
    if (/failed to fetch|network/i.test(bruto)) return 'Sem conexão com o servidor. Confira sua internet.';
    return bruto || `Algo deu errado (código ${status}).`;
  }

  async function requisicao(metodo, caminho, { corpo, comSessao = true, prefer, keepalive = false, tentouRenovar = false } = {}) {
    if (comSessao && sessao && sessao.expires_at - 60 < Date.now() / 1000 && !tentouRenovar) await renovar();
    const cabecalhos = { apikey: CHAVE_API, 'Content-Type': 'application/json' };
    cabecalhos.Authorization = `Bearer ${comSessao && sessao ? sessao.access_token : CHAVE_API}`;
    if (prefer) cabecalhos.Prefer = prefer;
    let resp;
    try {
      resp = await fetch(URL_BASE + caminho, { method: metodo, headers: cabecalhos, body: corpo === undefined ? undefined : JSON.stringify(corpo), keepalive });
    } catch (e) {
      const erro = new Error(mensagemDeErro({ message: 'failed to fetch' }, 0));
      erro.semConexao = true;
      throw erro;
    }
    if (resp.status === 401 && comSessao && sessao && !tentouRenovar) {
      await renovar();
      return requisicao(metodo, caminho, { corpo, comSessao, prefer, keepalive, tentouRenovar: true });
    }
    const texto = await resp.text();
    let dados = null;
    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch (e) {
      dados = texto;
    }
    if (!resp.ok) {
      const erro = new Error(mensagemDeErro(dados, resp.status));
      erro.status = resp.status;
      throw erro;
    }
    return dados;
  }

  const rest = (metodo, caminho, opcoes) => requisicao(metodo, '/rest/v1/' + caminho, opcoes);
  const rpc = (nome, args = {}) => rest('POST', 'rpc/' + nome, { corpo: args });

  /* ---------- Login ---------- */
  async function entrar(email, senha) {
    const dados = await requisicao('POST', '/auth/v1/token?grant_type=password', { corpo: { email: email.trim().toLowerCase(), password: senha }, comSessao: false });
    gravarSessao(dados);
    return carregarPerfil();
  }

  async function renovar() {
    if (!sessao || !sessao.refresh_token) throw new Error('Sua sessão expirou. Entre de novo.');
    try {
      const dados = await requisicao('POST', '/auth/v1/token?grant_type=refresh_token', { corpo: { refresh_token: sessao.refresh_token }, comSessao: false });
      gravarSessao(dados);
    } catch (e) {
      if (!e.semConexao) gravarSessao(null);
      throw e;
    }
  }

  /** Carrega perfil e cursos da pessoa logada. Retorna o perfil (ou null se a sessão não vale mais). */
  async function carregarPerfil() {
    if (!sessao) return null;
    const id = encodeURIComponent(sessao.user.id);
    const [perfis, mats] = await Promise.all([
      rest('GET', `perfis?id=eq.${id}&select=id,email,nome,admin,papel,trocar_senha,ativo`),
      rest('GET', `matriculas?aluno_id=eq.${id}&select=trilha_id`),
    ]);
    perfil = perfis && perfis[0] ? perfis[0] : null;
    matriculas = (mats || []).map((m) => m.trilha_id);
    if (!perfil) throw new Error('Sua conta ainda não tem perfil no Diver. Fale com o admin.');
    if (!perfil.ativo) {
      gravarSessao(null);
      throw new Error('Seu acesso está desativado. Fale com o admin.');
    }
    return perfil;
  }

  /**
   * Reautenticação: pede a senha de novo e troca a sessão por uma novinha. O token novo leva
   * no claim "amr" o horário desta senha, e é isso que o banco (fila_aprovar) e a Edge Function
   * mergulho-triplo conferem antes de qualquer ação paga. A senha não fica guardada em lugar nenhum.
   */
  async function confirmarSenha(senha) {
    if (!sessao) throw new Error('Sua sessão expirou. Entre de novo.');
    const dados = await requisicao('POST', '/auth/v1/token?grant_type=password', { corpo: { email: sessao.user.email, password: senha }, comSessao: false });
    if (!dados.user || dados.user.id !== sessao.user.id) throw new Error('Essa senha é de outra conta.');
    gravarSessao(dados);
  }

  /** Chama uma Edge Function do Supabase com a sessão atual. */
  function funcao(nome, corpo = {}) {
    return requisicao('POST', '/functions/v1/' + encodeURIComponent(nome), { corpo }).catch((e) => {
      if (e.status === 404) e.message = `A função "${nome}" ainda não foi publicada no Supabase.`;
      throw e;
    });
  }

  async function trocarSenha(nova) {
    await requisicao('PUT', '/auth/v1/user', { corpo: { password: nova } });
    await rpc('senha_trocada');
    perfil.trocar_senha = false;
  }

  /** Sai: envia o que falta, avisa o servidor, limpa o navegador. */
  async function sair() {
    try {
      await Sincronia.enviar();
    } catch (e) {
      /* se não der, paciência: o que já foi sincronizado está salvo */
    }
    try {
      await requisicao('POST', '/auth/v1/logout', {});
    } catch (e) {
      /* a sessão pode já ter expirado */
    }
    Sincronia.parar();
    Sincronia.limparLocal();
    gravarSessao(null);
    perfil = null;
    matriculas = [];
  }

  /* =========================================================
     SINCRONIA: navegador <-> tabela "estado"
     ========================================================= */
  const Sincronia = (() => {
    let enviado = {}; // chave -> texto que o servidor já tem
    let timer = null;
    let enviando = false;
    let status = 'ok'; // ok | salvando | erro
    const ouvintes = [];

    function chavesLocais() {
      try {
        return Object.keys(localStorage).filter((k) => k.startsWith(PREFIXO_SYNC));
      } catch (e) {
        return [];
      }
    }

    function mudarStatus(s) {
      if (s === status) return;
      status = s;
      ouvintes.forEach((fn) => fn(s));
    }

    function limparLocal() {
      chavesLocais().forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (e) {
          /* nada */
        }
      });
      enviado = {};
    }

    /** Traz tudo do servidor para o navegador (no login). */
    async function baixar() {
      const linhas = await rest('GET', `estado?usuario_id=eq.${encodeURIComponent(sessao.user.id)}&select=chave,valor`);
      limparLocal();
      (linhas || []).forEach(({ chave, valor }) => {
        // valores que não eram JSON (ex.: id da última trilha) viajam embrulhados em { __texto }
        const texto = valor && typeof valor === 'object' && '__texto' in valor ? String(valor.__texto) : JSON.stringify(valor);
        try {
          localStorage.setItem(chave, texto);
        } catch (e) {
          /* sem espaço: segue */
        }
        enviado[chave] = texto;
      });
    }

    /** Envia o que mudou no navegador desde o último envio. */
    async function enviar({ keepalive = false } = {}) {
      if (!sessao || enviando) return;
      const mudou = [];
      const locais = chavesLocais();
      locais.forEach((k) => {
        let texto;
        try {
          texto = localStorage.getItem(k);
        } catch (e) {
          return;
        }
        if (enviado[k] === texto) return;
        let valor;
        try {
          valor = JSON.parse(texto);
        } catch (e) {
          valor = { __texto: texto }; // texto puro: embrulha para caber na coluna jsonb
        }
        mudou.push({ chave: k, texto, valor });
      });
      const removidas = Object.keys(enviado).filter((k) => !locais.includes(k));
      if (!mudou.length && !removidas.length) return;

      enviando = true;
      mudarStatus('salvando');
      try {
        const uid = sessao.user.id;
        if (mudou.length) {
          await rest('POST', 'estado?on_conflict=usuario_id,chave', {
            corpo: mudou.map((m) => ({ usuario_id: uid, chave: m.chave, valor: m.valor, atualizado_em: new Date().toISOString() })),
            prefer: 'resolution=merge-duplicates,return=minimal',
            keepalive,
          });
          mudou.forEach((m) => (enviado[m.chave] = m.texto));
        }
        if (removidas.length) {
          const lista = removidas.map((k) => `"${k.replace(/"/g, '')}"`).join(',');
          await rest('DELETE', `estado?usuario_id=eq.${encodeURIComponent(uid)}&chave=in.(${encodeURIComponent(lista)})`, { keepalive });
          removidas.forEach((k) => delete enviado[k]);
        }
        mudarStatus('ok');
      } catch (e) {
        mudarStatus('erro'); // tenta de novo no próximo ciclo
      } finally {
        enviando = false;
      }
    }

    function iniciar() {
      parar();
      timer = setInterval(() => enviar(), 4000);
      window.addEventListener('pagehide', aoSair);
      document.addEventListener('visibilitychange', aoEsconder);
    }
    function parar() {
      clearInterval(timer);
      timer = null;
      window.removeEventListener('pagehide', aoSair);
      document.removeEventListener('visibilitychange', aoEsconder);
    }
    function aoSair() {
      enviar({ keepalive: true });
    }
    function aoEsconder() {
      if (document.visibilityState === 'hidden') enviar({ keepalive: true });
    }

    return { baixar, enviar, iniciar, parar, limparLocal, status: () => status, aoMudar: (fn) => ouvintes.push(fn) };
  })();

  /** Tipo de conta: 'aluno', 'professor' ou 'admin' (null sem login). */
  function papel() {
    if (!perfil) return null;
    return perfil.papel || (perfil.admin ? 'admin' : 'aluno');
  }

  return {
    ativa,
    temSessao: () => !!sessao,
    usuario: () => (sessao ? sessao.user : null),
    perfil: () => perfil,
    papel,
    ehAdmin: () => papel() === 'admin',
    ehProfessor: () => papel() === 'professor',
    matriculas: () => [...matriculas],
    entrar,
    sair,
    carregarPerfil,
    trocarSenha,
    confirmarSenha,
    funcao,
    rest,
    rpc,
    Sincronia,
  };
})();

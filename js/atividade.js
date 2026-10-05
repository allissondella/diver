/*
 * atividade.js — o log de atividade do Diver (docs/ATIVIDADE.md).
 *
 * Tudo que o aluno faz vira um "evento": responder questão, terminar um jogo, uma sessão de
 * Mergulho, Revisão, Simulado ou Prova (e, no futuro, emitir certificado). É a base das
 * estatísticas, do ranking da Palavrinha e da retrospectiva do ano.
 *
 * Com login (Supabase): o evento entra numa fila no navegador e vai para a tabela
 * eventos_atividade em lotes (20 eventos, a cada 30 s ou quando a aba fecha). Sem internet,
 * espera e envia depois. Cada evento tem um id próprio: reenviar não duplica.
 * Sem login (modo local): fica num log no próprio navegador (os 5.000 mais recentes).
 *
 * As chaves NÃO começam com "diver:v1:" de propósito: o log não entra no espelho da tabela "estado".
 * Nada de texto digitado pelo aluno vai para o log: só identificadores e números.
 */
const Atividade = (() => {
  const CHAVE_FILA = 'diver:atividade:fila';
  const CHAVE_LOCAL = 'diver:atividade:local';
  const MAX_LOCAL = 5000;
  const MAX_FILA = 2000;
  const LOTE = 100;
  const ENVIAR_A_CADA = 20; // eventos
  const TIPOS = ['questao_respondida', 'jogo_concluido', 'mergulho_sessao', 'revisao_sessao', 'simulado_concluido', 'prova_concluida', 'certificado_emitido', 'cronograma_criado', 'bloco_concluido'];

  let timer = null;
  let enviando = null;

  const naNuvem = () => typeof Nuvem !== 'undefined' && Nuvem.ativa && Nuvem.temSessao();

  function ler(chave) {
    try {
      const v = JSON.parse(localStorage.getItem(chave));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }
  function gravar(chave, lista) {
    try {
      localStorage.setItem(chave, JSON.stringify(lista));
      return true;
    } catch (e) {
      return false; // sem espaço ou sem armazenamento: o app segue, só não guarda este evento
    }
  }

  function novoId() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {
      /* segue para o plano B */
    }
    const b = new Uint8Array(16);
    (crypto && crypto.getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => (b[i] = Math.floor(Math.random() * 256))));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const x = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
  }

  /** Só números, sim/não, textos curtos e listas/objetos pequenos (nada de texto livre longo). */
  function limpar(detalhes) {
    const out = {};
    Object.entries(detalhes || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || Number.isNaN(v)) return;
      if (typeof v === 'string') out[k] = v.slice(0, 120);
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
      else if (Array.isArray(v)) out[k] = v.slice(0, 20).filter((x) => ['number', 'string', 'boolean'].includes(typeof x)).map((x) => (typeof x === 'string' ? x.slice(0, 60) : x));
    });
    return out;
  }

  /**
   * Registra um evento. Nunca atrapalha o app: qualquer falha é engolida aqui.
   * tipo: um de TIPOS · cursoId: id da trilha (ou null) · detalhes: objeto pequeno.
   */
  function registrar(tipo, cursoId, detalhes = {}) {
    try {
      if (!TIPOS.includes(tipo)) throw new Error(`tipo desconhecido: ${tipo}`);
      const ev = { id: novoId(), curso_id: cursoId || null, tipo, detalhes: limpar(detalhes), criado_em: new Date().toISOString() };
      if (naNuvem()) {
        const fila = ler(CHAVE_FILA);
        fila.push({ ...ev, aluno_id: Nuvem.usuario().id });
        gravar(CHAVE_FILA, fila.slice(-MAX_FILA));
        if (fila.filter((e) => e.aluno_id === Nuvem.usuario().id).length >= ENVIAR_A_CADA) enviar();
      } else {
        const log = ler(CHAVE_LOCAL);
        log.push(ev);
        gravar(CHAVE_LOCAL, log.slice(-MAX_LOCAL));
      }
      return ev;
    } catch (e) {
      console.warn('[Diver] atividade não registrada', e);
      return null;
    }
  }

  /** Manda a fila (só os eventos de quem está logado) para o Supabase. Um envio de cada vez. */
  function enviar({ keepalive = false } = {}) {
    if (!naNuvem()) return Promise.resolve(0);
    if (enviando) return enviando;
    const envio = enviarAgora(keepalive);
    enviando = envio;
    envio.finally(() => {
      if (enviando === envio) enviando = null; // solta a trava depois (mesmo quando a fila estava vazia)
    });
    return envio;
  }

  async function enviarAgora(keepalive) {
    const uid = Nuvem.usuario().id;
    let enviados = 0;
    try {
      for (;;) {
        const meus = ler(CHAVE_FILA).filter((e) => e.aluno_id === uid).slice(0, LOTE);
        if (!meus.length) break;
        await Nuvem.rest('POST', 'eventos_atividade?on_conflict=id', {
          corpo: meus.map(({ id, aluno_id, curso_id, tipo, detalhes, criado_em }) => ({ id, aluno_id, curso_id, tipo, detalhes, criado_em })),
          prefer: 'resolution=ignore-duplicates,return=minimal',
          keepalive,
        });
        const ids = new Set(meus.map((e) => e.id));
        gravar(CHAVE_FILA, ler(CHAVE_FILA).filter((e) => !ids.has(e.id)));
        enviados += meus.length;
        if (keepalive) break; // ao fechar a aba, um lote só
      }
    } catch (e) {
      /* sem internet ou banco fora do ar: tenta de novo no próximo ciclo */
    }
    return enviados;
  }

  function iniciar() {
    clearInterval(timer);
    timer = setInterval(() => enviar(), 30000);
    window.addEventListener('pagehide', () => enviar({ keepalive: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') enviar({ keepalive: true });
    });
    enviar();
  }

  /** Eventos ainda não enviados (de quem está logado). */
  function pendentes() {
    if (!naNuvem()) return [];
    const uid = Nuvem.usuario().id;
    return ler(CHAVE_FILA).filter((e) => e.aluno_id === uid);
  }

  /**
   * Lista eventos de quem está logado (ou do log local), mais recentes por último.
   * filtro: { tipo, cursoId, jogo } (jogo filtra detalhes.jogo, para os jogos).
   */
  async function listar({ tipo = null, cursoId = null, jogo = null } = {}) {
    const passa = (e) => (!tipo || e.tipo === tipo) && (!cursoId || e.curso_id === cursoId) && (!jogo || (e.detalhes && e.detalhes.jogo === jogo));
    if (!naNuvem()) return ler(CHAVE_LOCAL).filter(passa);
    await enviar();
    const uid = Nuvem.usuario().id;
    const filtros = [`aluno_id=eq.${encodeURIComponent(uid)}`];
    if (tipo) filtros.push(`tipo=eq.${encodeURIComponent(tipo)}`);
    if (cursoId) filtros.push(`curso_id=eq.${encodeURIComponent(cursoId)}`);
    if (jogo) filtros.push(`detalhes->>jogo=eq.${encodeURIComponent(jogo)}`);
    const linhas = [];
    for (let de = 0; de < 20000; de += 1000) {
      const pagina = await Nuvem.rest('GET', `eventos_atividade?${filtros.join('&')}&select=id,curso_id,tipo,detalhes,criado_em&order=criado_em.asc&offset=${de}&limit=1000`);
      linhas.push(...(pagina || []));
      if (!pagina || pagina.length < 1000) break;
    }
    const vistos = new Set(linhas.map((e) => e.id));
    return linhas.concat(pendentes().filter((e) => !vistos.has(e.id) && passa(e)));
  }

  /* ---------- Estatísticas (a mesma conta da função estatisticas_atividade do banco) ---------- */
  const num = (d, k) => (d && typeof d[k] === 'number' ? d[k] : null);
  const sim = (d, k) => !!(d && d[k] === true);
  const arred1 = (x) => Math.round(x * 10) / 10;
  const diaSP = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  function resumir(eventos) {
    const r = { questoes: { total: 0, acertos: 0 }, questoes_por_modo: {}, jogos: [], sessoes: {}, dias_ativos: 0, primeiro: null, ultimo: null };
    const jogos = {};
    const notas = {};
    const dias = new Set();
    eventos.forEach((e) => {
      const d = e.detalhes || {};
      dias.add(diaSP(e.criado_em));
      if (!r.primeiro || e.criado_em < r.primeiro) r.primeiro = e.criado_em;
      if (!r.ultimo || e.criado_em > r.ultimo) r.ultimo = e.criado_em;
      if (e.tipo === 'questao_respondida') {
        const modo = typeof d.modo === 'string' ? d.modo : 'outro';
        const m = (r.questoes_por_modo[modo] = r.questoes_por_modo[modo] || { total: 0, acertos: 0 });
        m.total++;
        r.questoes.total++;
        if (sim(d, 'acertou')) {
          m.acertos++;
          r.questoes.acertos++;
        }
      } else if (e.tipo === 'jogo_concluido') {
        if (typeof d.jogo !== 'string') return;
        const j = (jogos[d.jogo] = jogos[d.jogo] || { jogo: d.jogo, partidas: 0, acertos: 0, total: 0, melhor: null, vitorias: 0 });
        j.partidas++;
        j.acertos += num(d, 'acertos') || 0;
        j.total += num(d, 'total') || 0;
        if (num(d, 'pontuacao') !== null) j.melhor = j.melhor === null ? num(d, 'pontuacao') : Math.max(j.melhor, num(d, 'pontuacao'));
        if (sim(d, 'venceu')) j.vitorias++;
      } else {
        const s = (r.sessoes[e.tipo] = r.sessoes[e.tipo] || { total: 0, concluidas: 0, media_nota: null, melhor_nota: null, aprovadas: 0 });
        s.total++;
        if ((typeof d.motivo === 'string' ? d.motivo : 'fim') !== 'saiu') s.concluidas++;
        if (sim(d, 'aprovado')) s.aprovadas++;
        if (num(d, 'nota') !== null) {
          (notas[e.tipo] = notas[e.tipo] || []).push(num(d, 'nota'));
          s.melhor_nota = s.melhor_nota === null ? num(d, 'nota') : Math.max(s.melhor_nota, num(d, 'nota'));
        }
      }
    });
    Object.entries(notas).forEach(([t, lista]) => (r.sessoes[t].media_nota = arred1(lista.reduce((a, b) => a + b, 0) / lista.length)));
    r.jogos = Object.values(jogos).sort((a, b) => b.partidas - a.partidas || a.jogo.localeCompare(b.jogo));
    r.dias_ativos = dias.size;
    return r;
  }

  /**
   * Estatísticas de uma pessoa: { aluno (id; padrão quem está logado), cursoId (padrão: todos) }.
   * Com login, o banco faz a conta (e respeita quem pode ver o quê); sem login, a conta é feita aqui.
   */
  async function estatisticas({ aluno = null, cursoId = null } = {}) {
    if (!naNuvem()) return resumir(ler(CHAVE_LOCAL).filter((e) => !cursoId || e.curso_id === cursoId));
    if (!aluno || aluno === Nuvem.usuario().id) await enviar();
    return Nuvem.rpc('estatisticas_atividade', { p_aluno: aluno, p_curso: cursoId });
  }

  return { TIPOS, registrar, enviar, iniciar, listar, estatisticas, resumir, pendentes, naNuvem };
})();

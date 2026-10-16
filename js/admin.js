/*
 * admin.js — área da equipe.
 *  - Admin ("Pessoas e cursos"): cadastra aluno, professor ou admin (gera senha temporária),
 *    atribui cursos, muda o tipo de conta, gera nova senha, ativa/desativa e vê o progresso.
 *  - Professor ("Meus alunos"): só acompanha os alunos dos cursos dele e o progresso nesses cursos.
 * Tudo passa pelas funções e regras seguras do banco (supabase/setup.sql); o navegador nunca
 * tem poder de admin sozinho: quem decide o que cada um vê é o banco.
 */
const Admin = (() => {
  const { h, icone, limpar } = UI;
  const estado = { busca: '', filtroPapel: '', pessoas: [], abertos: new Set() };

  const PAPEIS = {
    aluno: { nome: 'Aluno', plural: 'Alunos', dica: 'Estuda os cursos marcados abaixo.' },
    professor: { nome: 'Professor', plural: 'Professores', dica: 'Estuda os cursos marcados e acompanha o progresso dos alunos desses cursos (sem editar nada).' },
    admin: { nome: 'Admin', plural: 'Admins', dica: 'Vê todos os cursos e gerencia pessoas, cursos e senhas. Dê só para quem é de confiança.' },
  };
  const papelDe = (p) => p.papel || (p.admin ? 'admin' : 'aluno');

  function nomeTrilha(id) {
    if (ehPacote(id)) { const sala = salaDoPacote(id); return sala ? sala.nome : PACOTES_ANTIGOS[id] || id.replace('pacote:', ''); }
    const t = App.trilhas().find((x) => x.id === id);
    return t ? t.nome : `${id} (não encontrado)`;
  }

  /*
   * Salas na matrícula (2026-10-12): o admin marca a sala inteira (Mergulho no Enem e Vestibular, Radiologia, Tecnologia;
   * na Tecnologia também curso a curso, porque são produtos diferentes), igual ao que o aluno vê. A matrícula guarda os cursos da sala e um marcador
   * "pacote:<id da sala>" (o "pacote:enem" de 2026-10-09 continua valendo); "Atualizar pacotes" acrescenta os
   * cursos publicados depois. Não muda o banco: a coluna trilha_id aceita texto, e Nuvem.matriculas() ignora os marcadores.
   */
  // Marcadores das salas de um curso só que viraram a sala Tecnologia (2026-10-13): continuam valendo como "só aquele curso"
  // e o "Atualizar salas" não dá a eles os cursos novos da sala (só quem tem pacote:tecnologia recebe).
  const PACOTES_ANTIGOS = { 'pacote:iso': 'ISO/IEC 27001:2022 Foundation', 'pacote:ciber': 'Cibersegurança Essencial' };
  const ehPacote = (id) => typeof id === 'string' && id.startsWith('pacote:');
  const salasDoCatalogo = () => Grupos.salas(App.trilhas().filter((t) => !Trilhas.ehImportada(t.id)));
  const salaDoPacote = (id) => salasDoCatalogo().find((s) => `pacote:${s.id}` === id) || null;
  const cursosDoPacote = (id) => { const sala = salaDoPacote(id); return sala ? sala.trilhas.map((t) => t.id) : []; };
  /** Mensagem pronta para mandar à pessoa (WhatsApp, e-mail...). */
  function mensagemAcesso(nome, email, senha, papel = 'aluno') {
    const site = location.href.split('#')[0];
    const como = papel === 'aluno' ? '' : ` (como ${PAPEIS[papel].nome.toLowerCase()})`;
    return `Olá, ${nome.split(' ')[0]}! Seu acesso ao Diver${como} está pronto.\n\nSite: ${site}\nE-mail: ${email}\nSenha temporária: ${senha}\n\nNo primeiro acesso você vai criar a sua própria senha. Bora mergulhar!`;
  }

  async function copiar(texto, botao) {
    try {
      await navigator.clipboard.writeText(texto);
      const antes = botao.textContent;
      botao.textContent = 'Copiado!';
      setTimeout(() => (botao.textContent = antes), 1800);
    } catch (e) {
      UI.toast('Não deu para copiar', 'Selecione o texto e copie manualmente.', 'i-x');
    }
  }

  function cartaoSenha(nome, email, senha, titulo, papel) {
    const texto = mensagemAcesso(nome, email, senha, papel);
    const botao = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: (e) => copiar(texto, e.currentTarget) }, 'Copiar mensagem');
    return h('div', { class: 'senha-temp', role: 'status' },
      h('p', { class: 'senha-temp__titulo' }, icone('i-check'), titulo),
      h('p', {}, 'Senha temporária de ', h('strong', { text: nome }), ':'),
      h('code', { class: 'senha-temp__codigo', text: senha }),
      h('p', { class: 'texto-suave', text: 'Ela só aparece agora. A pessoa cria a própria senha no primeiro acesso.' }),
      h('textarea', { class: 'campo campo--area senha-temp__mensagem', readonly: true, rows: '7', 'aria-label': 'Mensagem para enviar', value: texto }),
      botao);
  }

  /** O acesso de uma pessoa em etiquetas, uma por sala: "Radiologia" (sala inteira) ou "Tecnologia · 1 de 3". */
  function etiquetasAcesso(cursos) {
    return salasDoCatalogo().map((sala) => {
      const ids = sala.trilhas.map((t) => t.id);
      const n = ids.filter((id) => cursos.includes(id)).length;
      const inteira = cursos.includes(`pacote:${sala.id}`) || (!sala.porCurso && n > 0 && n === ids.length);
      if (!inteira && !n) return null;
      return { sala, inteira, texto: inteira || sala.unica ? sala.nome : `${sala.nome} · ${n} de ${ids.length}` };
    }).filter(Boolean);
  }
  const chipSala = (e) => h('span', { class: `chip chip--sala sala--${e.sala.cor}`, title: e.inteira ? 'Sala inteira' : 'Cursos separados' }, icone(e.sala.icone), e.texto);

  /** "2 salas inteiras e 1 curso separado" (o rodapé da escolha). */
  function textoContagem({ inteiras, avulsos }) {
    const partes = [inteiras ? UI.plural(inteiras, 'sala inteira', 'salas inteiras') : '', avulsos ? UI.plural(avulsos, 'curso separado', 'cursos separados') : ''].filter(Boolean);
    return partes.length ? partes.join(' e ') : 'Nenhum curso marcado';
  }

  /**
   * Janela do Admin (dialog nativo, 2026-10-14): cabeçalho com título e X, corpo que rola e pé com os botões.
   * Com aoEnviar, a caixa é um formulário (Enter envia; clicar fora não fecha, para não perder o que foi digitado).
   */
  function janela({ titulo, sub = '', corpo, pe = null, classe = '', aoEnviar = null, aoFechar = () => {} }) {
    const antes = document.activeElement;
    const tid = `janela-${Math.random().toString(36).slice(2, 8)}`;
    const conteudo = [
      h('header', { class: 'janela__cabeca' },
        h('div', {}, h('h2', { class: 'janela__titulo', id: tid, text: titulo }), sub ? h('p', { class: 'texto-suave janela__sub', text: sub }) : null),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar', onclick: () => dialogo.close() }, icone('i-x'))),
      h('div', { class: 'janela__corpo' }, corpo),
      pe ? h('footer', { class: 'janela__pe' }, pe) : null];
    const caixa = aoEnviar
      ? h('form', { class: 'janela__caixa', onsubmit: (e) => { e.preventDefault(); aoEnviar(); } }, conteudo)
      : h('div', { class: 'janela__caixa' }, conteudo);
    const dialogo = h('dialog', { class: `dialogo janela ${classe}`.trim(), 'aria-labelledby': tid }, caixa);
    dialogo.addEventListener('keydown', (e) => e.stopPropagation()); // os atalhos da tela de trás não disparam
    if (!aoEnviar) dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
    dialogo.addEventListener('close', () => {
      aoFechar(dialogo.returnValue);
      dialogo.remove();
      if (antes && antes.isConnected && typeof antes.focus === 'function') antes.focus({ preventScroll: true });
    }, { once: true });
    document.body.append(dialogo);
    dialogo.showModal();
    return dialogo;
  }

  /**
   * Escolher salas e cursos (repaginada do Admin, 2026-10-14, pedido do usuário): uma linha por sala, com o
   * quadradinho da sala inteira, o ícone, o nome e o estado ("4 cursos · sala inteira", "15 matérias · 2 de 15"),
   * e a setinha que abre os cursos da sala, por área, para liberar separado (vale para todas as salas).
   * Marcar a sala = todos os cursos + o marcador "pacote:<sala>" (recebe também os publicados depois).
   * Busca por sala ou curso. Devolve o elemento com .escolhidos() (cursos + marcadores a gravar), .contagem(),
   * .limpar() e o evento "change" a cada mudança. Matrícula fora das salas e marcadores antigos (pacote:iso) ficam como estão.
   */
  function escolhaDeAcesso(selecionados = []) {
    const salas = salasDoCatalogo();
    const conhecidos = new Set(salas.flatMap((s) => [`pacote:${s.id}`, ...s.trilhas.map((t) => t.id)]));
    const raiz = h('div', { class: 'acesso' });
    const avisar = () => raiz.dispatchEvent(new Event('change', { bubbles: true }));
    const sufixo = Math.random().toString(36).slice(2, 7);

    const linhas = salas.map((sala) => {
      const ids = sala.trilhas.map((t) => t.id);
      const tem = ids.filter((id) => selecionados.includes(id));
      const inteira = selecionados.includes(`pacote:${sala.id}`) || (!sala.porCurso && ids.length > 0 && tem.length === ids.length);
      const st = { inteira, cursos: new Set(inteira ? ids : tem), aberto: false };
      const unidade = (n) => (n === 1 ? sala.unidade[0] : sala.unidade[1]);
      const marcaSala = h('input', { type: 'checkbox' });
      const estadoTxt = h('span', { class: 'acesso__estado' });
      const idPainel = `acesso-${sala.id}-${sufixo}`;
      const abrir = ids.length > 1 ? h('button', { type: 'button', class: 'acesso__abrir', 'aria-expanded': 'false', 'aria-controls': idPainel,
        'aria-label': `Escolher os cursos da sala ${sala.nome} separados`, title: 'Escolher os cursos separados' }, icone('i-seta-dir')) : null;

      // os cursos da sala, por área (o "Comece por aqui" do Enem no topo)
      const marcas = new Map();
      const areas = [...(sala.destaque ? [{ area: { nome: sala.destaqueSelo || 'Comece por aqui', cor: 'amarelo', icone: 'i-estrela' }, trilhas: [sala.destaque] }] : []), ...sala.areas];
      const blocos = areas.map(({ area, trilhas }) => h('div', { class: `acesso__area sala--${area.cor || sala.cor}` },
        area.nome ? h('p', { class: 'acesso__area-nome' }, area.icone ? icone(area.icone) : null, area.nome) : null,
        h('div', { class: 'acesso__cursos' }, trilhas.map((t) => {
          const c = h('input', { type: 'checkbox' });
          c.addEventListener('change', () => {
            if (c.checked) st.cursos.add(t.id); else { st.cursos.delete(t.id); st.inteira = false; } // tirou um curso: deixa de ser a sala inteira
            desenhar();
            avisar();
          });
          const item = h('label', { class: 'acesso__curso', 'data-busca': UI.normalizar(t.nome) }, c, h('span', { text: Grupos.nomeCurto(sala, t) }));
          marcas.set(t.id, { c, item });
          return item;
        }))));
      const painel = h('div', { class: 'acesso__painel', id: idPainel, hidden: true },
        h('p', { class: 'texto-suave acesso__dica', text: `Marque só ${sala.unidade[1] === 'matérias' ? 'as matérias' : 'os cursos'} que a pessoa vai estudar. Para liberar tudo, inclusive o que for publicado depois, marque a sala.` }),
        blocos);
      const linha = h('div', { class: `acesso__sala sala--${sala.cor}` },
        h('div', { class: 'acesso__topo' },
          h('label', { class: 'acesso__rotulo' }, marcaSala,
            h('span', { class: 'acesso__icone', 'aria-hidden': 'true' }, icone(sala.icone)),
            h('span', { class: 'acesso__textos' }, h('strong', { class: 'acesso__nome' }, sala.nome), estadoTxt)),
          abrir),
        painel);

      marcaSala.addEventListener('change', () => {
        st.inteira = marcaSala.checked;
        st.cursos = new Set(st.inteira ? ids : []);
        desenhar();
        avisar();
      });
      if (abrir) abrir.addEventListener('click', () => { st.aberto = !st.aberto; mostrar(st.aberto); });
      function mostrar(aberto) {
        painel.hidden = !aberto;
        if (abrir) abrir.setAttribute('aria-expanded', String(aberto));
        linha.classList.toggle('acesso__sala--aberta', aberto);
      }
      function desenhar() {
        const n = st.inteira ? ids.length : st.cursos.size;
        marcaSala.checked = st.inteira;
        marcaSala.indeterminate = !st.inteira && n > 0;
        linha.dataset.estado = st.inteira ? 'inteira' : n ? 'parte' : 'nada';
        estadoTxt.textContent = `${sala.unica ? sala.unica.nome : `${ids.length} ${unidade(ids.length)}`} · ${st.inteira ? 'sala inteira' : n ? `${n} de ${ids.length}` : 'sem acesso'}`;
        marcas.forEach(({ c }, id) => { c.checked = st.inteira || st.cursos.has(id); });
      }
      function filtrar(termo) {
        if (!termo) {
          linha.hidden = false;
          marcas.forEach(({ item }) => { item.hidden = false; });
          blocos.forEach((b) => { b.hidden = false; });
          mostrar(st.aberto);
          return;
        }
        const salaBate = UI.normalizar(sala.nome).includes(termo);
        let algum = false;
        marcas.forEach(({ item }) => { const bate = salaBate || item.dataset.busca.includes(termo); item.hidden = !bate; algum = algum || bate; });
        blocos.forEach((b) => { b.hidden = ![...b.querySelectorAll('.acesso__curso')].some((i) => !i.hidden); });
        linha.hidden = !salaBate && !algum;
        mostrar(salaBate ? st.aberto : algum); // achou pelo curso: abre a sala para mostrar onde ele está
      }
      desenhar();
      return {
        sala, st, linha, filtrar,
        escolhidos: () => (st.inteira ? [`pacote:${sala.id}`, ...ids] : [...st.cursos]),
        limpar() { st.inteira = false; st.cursos = new Set(); st.aberto = false; desenhar(); mostrar(false); },
      };
    });

    const vazio = h('p', { class: 'texto-suave acesso__vazio', hidden: true, text: 'Nenhuma sala ou curso com esse nome.' });
    const campoBusca = h('input', { class: 'campo acesso__busca', type: 'search', placeholder: 'Buscar sala ou curso…', 'aria-label': 'Buscar sala ou curso', autocomplete: 'off',
      oninput: (e) => {
        const termo = UI.normalizar(e.target.value.trim());
        linhas.forEach((l) => l.filtrar(termo));
        vazio.hidden = linhas.some((l) => !l.linha.hidden);
      },
      onkeydown: (e) => { if (e.key === 'Enter') e.preventDefault(); } }); // Enter na busca não envia o formulário
    raiz.append(campoBusca, h('div', { class: 'acesso__lista', role: 'group', 'aria-label': 'Salas e cursos' }, linhas.map((l) => l.linha)), vazio);

    raiz.escolhidos = () => [...new Set([
      ...selecionados.filter((c) => !conhecidos.has(c)), // matrícula de curso fora das salas (ou marcador antigo, como pacote:iso): fica como está
      ...linhas.flatMap((l) => l.escolhidos()),
    ])];
    raiz.contagem = () => ({
      inteiras: linhas.filter((l) => l.st.inteira).length,
      avulsos: linhas.filter((l) => !l.st.inteira).reduce((n, l) => n + l.st.cursos.size, 0),
    });
    raiz.limpar = () => {
      linhas.forEach((l) => l.limpar());
      campoBusca.value = '';
      linhas.forEach((l) => l.filtrar(''));
      vazio.hidden = true;
    };
    return raiz;
  }

  /* ---------- Resumo do progresso de uma pessoa (a partir da tabela "estado") ---------- */
  async function progressoDe(pessoa, alvo) {
    alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'Carregando progresso…' }));
    try {
      const linhas = await Nuvem.rest('GET', `estado?usuario_id=eq.${encodeURIComponent(pessoa.id)}&chave=like.${encodeURIComponent('diver:v1:trilha:*')}&select=chave,valor,atualizado_em`);
      const porTrilha = new Map((linhas || []).map((l) => [l.chave.replace('diver:v1:trilha:', ''), l]));
      let cursos = [...new Set([...pessoa.cursos, ...porTrilha.keys()])].filter((c) => !ehPacote(c));
      if (!Nuvem.ehAdmin()) cursos = cursos.filter((c) => Nuvem.matriculas().includes(c));
      if (!cursos.length) return alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'Nenhum curso atribuído ainda.' }));
      alvo.replaceChildren(h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela tabela--compacta' },
        h('thead', {}, h('tr', {}, ['Curso', 'Nível', 'Fases', 'Acertos', 'Melhor simulado', 'Prova final', 'Última atividade'].map((c) => h('th', { scope: 'col', text: c })))),
        h('tbody', {}, cursos.map((tid) => {
          const linha = porTrilha.get(tid);
          const trilha = App.trilhas().find((t) => t.id === tid);
          if (!linha) return h('tr', {}, h('th', { scope: 'row', text: nomeTrilha(tid) }), h('td', { colspan: '6', class: 'texto-suave', text: 'Ainda não começou.' }));
          const p = linha.valor || {};
          const stats = p.stats || {};
          const fases = trilha ? trilha.fases.filter((f) => p.fases && p.fases[f.id] && p.fases[f.id].concluida).length : Object.values(p.fases || {}).filter((f) => f.concluida).length;
          const melhorSim = (p.simulados || []).reduce((m, s) => Math.max(m, s.nota), -1);
          const provas = p.provas || [];
          const aprovado = provas.find((x) => x.aprovado);
          const melhorProva = provas.reduce((m, s) => Math.max(m, s.nota), -1);
          const nivel = Progresso.nivel(p.xp || 0);
          return h('tr', {},
            h('th', { scope: 'row', text: nomeTrilha(tid) }),
            h('td', { text: `${nivel.numero} · ${p.xp || 0} XP` }),
            h('td', { text: trilha ? `${fases}/${trilha.fases.length}` : String(fases) }),
            h('td', { text: stats.respondidas ? `${Math.round((stats.acertos / stats.respondidas) * 100)}% de ${stats.respondidas}` : '—' }),
            h('td', { text: melhorSim >= 0 ? melhorSim.toLocaleString('pt-BR') : '—' }),
            h('td', { class: aprovado ? 'texto-sucesso' : '', text: aprovado ? `Aprovado (${aprovado.nota.toLocaleString('pt-BR')})` : melhorProva >= 0 ? `Não aprovado (${melhorProva.toLocaleString('pt-BR')})` : '—' }),
            h('td', { text: (p.streak && p.streak.ultimoDia) ? UI.formatarData(p.streak.ultimoDia, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(linha.atualizado_em).toLocaleDateString('pt-BR') }));
        })))),
      Estatisticas.bloco({ aluno: pessoa.id, cursos })); // do log de atividade (o professor vê só os cursos dele)
    } catch (erro) {
      alvo.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
    }
  }

  /* ---------- Tela (repaginada em 2026-10-14) ----------
   * Topo: busca, filtro por tipo (com a contagem) e "+ Cadastrar pessoa" (abre a janela do cadastro).
   * Faixa "Salas completas" só quando falta curso novo para alguém. Lista compacta: uma linha por pessoa
   * (nome, tipo, acesso em etiquetas, situação) e "Gerenciar", que abre o painel da pessoa. O acesso
   * é mudado na janela "Salas e cursos" e só grava no "Salvar".
   */
  /* ---------- Mapa das Profissões: números derivados do log (eventos_atividade), sem tabela nova ---------- */
  const TIPOS_PROFISSOES = ['profissao_vista', 'profissao_pedido', 'profissao_carta', 'profissao_dia_inicio', 'profissao_dia_concluido',
    'tecnologia_area_vista', 'tecnologia_jogo_inicio', 'tecnologia_jogo_concluido'];
  function blocoProfissoes() {
    const corpo = h('div', { class: 'admin-profissoes', 'aria-live': 'polite' });
    let carregado = false;
    const caixa = h('details', { class: 'cartao admin-profissoes-caixa', id: 'admin-profissoes' },
      h('summary', {}, icone('i-bussola'), 'Mapa das Profissões: o que os alunos exploram'),
      corpo);
    caixa.addEventListener('toggle', () => {
      if (!caixa.open || carregado) return;
      carregado = true;
      corpo.replaceChildren(h('p', { class: 'texto-suave', text: 'Lendo o log de atividade…' }));
      carregarProfissoes().then((partes) => corpo.replaceChildren(...partes), () => {
        carregado = false;
        corpo.replaceChildren(h('p', { class: 'texto-suave', text: 'Não deu para ler o log agora. Feche e abra de novo para tentar outra vez.' }));
      });
    });
    return caixa;
  }

  async function carregarProfissoes() {
    const [ix, tec, eventos] = await Promise.all([
      fetch('data/profissoes/indice.json').then((r) => r.json()).catch(() => ({ profissoes: [] })),
      fetch('data/profissoes/tecnologia.json').then((r) => r.json()).catch(() => ({ areas: [] })),
      (async () => {
        const linhas = [];
        for (let de = 0; de < 50000; de += 1000) {
          const pagina = await Nuvem.rest('GET', `eventos_atividade?tipo=in.(${TIPOS_PROFISSOES.join(',')})&select=aluno_id,tipo,detalhes&order=criado_em.desc&offset=${de}&limit=1000`);
          linhas.push(...(pagina || []));
          if (!pagina || pagina.length < 1000) break;
        }
        return linhas;
      })(),
    ]);
    const panoramas = { tecnologia: 'Panorama da Tecnologia' };
    const nome = (id) => (id === 'outra' ? 'Outra (busca livre)' : panoramas[id] || ((ix.profissoes || []).find((p) => p.id === id) || {}).nome || id);
    const nomeArea = (id) => ((tec.areas || []).find((a) => a.id === id) || {}).nome || id;
    const prof = (e) => (e.detalhes && typeof e.detalhes.profissao === 'string' ? e.detalhes.profissao : null);
    const area = (e) => (e.detalhes && typeof e.detalhes.area === 'string' ? e.detalhes.area : null);
    const primeiraArea = (e) => (e.detalhes && Array.isArray(e.detalhes.top) && typeof e.detalhes.top[0] === 'string' ? e.detalhes.top[0] : null);
    // conta por profissão (ou pela chave que se pedir): total de eventos e pessoas diferentes
    const contar = (filtro, chave = prof) => {
      const m = new Map();
      eventos.filter(filtro).forEach((e) => {
        const id = chave(e);
        if (!id) return;
        const x = m.get(id) || { vezes: 0, pessoas: new Set() };
        x.vezes++; x.pessoas.add(e.aluno_id);
        m.set(id, x);
      });
      return [...m.entries()].map(([id, x]) => ({ id, vezes: x.vezes, pessoas: x.pessoas.size })).sort((a, b) => b.pessoas - a.pessoas || b.vezes - a.vezes);
    };
    const tabela = (titulo, linhas, colunas, vazio) => h('div', { class: 'admin-profissoes__bloco' },
      h('h3', { class: 'cartao__titulo', text: titulo }),
      linhas.length
        ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' },
          h('thead', {}, h('tr', {}, colunas.map(([c]) => h('th', { scope: 'col', text: c })))),
          h('tbody', {}, linhas.slice(0, 10).map((l) => h('tr', {}, colunas.map(([c, f], i) => (i === 0 ? h('th', { scope: 'row', text: f(l) }) : h('td', { 'data-rotulo': c, text: f(l) }))))))))
        : h('p', { class: 'texto-suave', text: vazio }));

    const vistas = contar((e) => e.tipo === 'profissao_vista');
    const pedidos = contar((e) => e.tipo === 'profissao_pedido');
    const interesse = contar((e) => e.tipo === 'profissao_carta' && e.detalhes && e.detalhes.interesse === true);
    const inicios = contar((e) => e.tipo === 'profissao_dia_inicio');
    const fins = new Map(contar((e) => e.tipo === 'profissao_dia_concluido').map((x) => [x.id, x.pessoas]));
    const dia = inicios.map((x) => ({ ...x, concluiram: fins.get(x.id) || 0 }));
    const alunos = new Set(eventos.map((e) => e.aluno_id)).size;
    // Panorama da Tecnologia: áreas abertas e o resultado do jogo (a área em 1º lugar de cada partida)
    const areasVistas = contar((e) => e.tipo === 'tecnologia_area_vista', area);
    const pessoasDe = (tipo) => new Set(eventos.filter((e) => e.tipo === tipo).map((e) => e.aluno_id)).size;
    const jogoComecou = pessoasDe('tecnologia_jogo_inicio');
    const jogoTerminou = pessoasDe('tecnologia_jogo_concluido');
    const primeiras = contar((e) => e.tipo === 'tecnologia_jogo_concluido', primeiraArea);

    return [
      h('p', { class: 'texto-suave', text: `${UI.plural(alunos, 'pessoa já usou', 'pessoas já usaram')} o Mapa (fichas, Maré de cartas ou "Um dia como"). Os números vêm do log de atividade; cada linha mostra as 10 primeiras.` }),
      tabela('Fichas mais vistas', vistas, [['Profissão', (l) => nome(l.id)], ['Pessoas', (l) => String(l.pessoas)], ['Aberturas', (l) => String(l.vezes)]], 'Nenhuma ficha aberta ainda.'),
      tabela('Fichas pedidas ("Em breve")', pedidos, [['Profissão', (l) => nome(l.id)], ['Pedidos', (l) => String(l.pessoas)]], 'Nenhum pedido ainda.'),
      tabela('"Me interessa" na Maré de cartas', interesse, [['Profissão', (l) => nome(l.id)], ['Pessoas', (l) => String(l.pessoas)]], 'Ninguém passou pela Maré ainda.'),
      tabela('"Um dia como": quem começa e quem termina', dia, [['Profissão', (l) => nome(l.id)], ['Começaram', (l) => String(l.pessoas)], ['Terminaram', (l) => String(l.concluiram)], ['Conclusão', (l) => `${Math.round((100 * l.concluiram) / Math.max(1, l.pessoas))}%`]], 'Ninguém viveu um dia ainda.'),
      tabela('Panorama da Tecnologia: áreas mais vistas', areasVistas, [['Área', (l) => nomeArea(l.id)], ['Pessoas', (l) => String(l.pessoas)], ['Aberturas', (l) => String(l.vezes)]], 'Nenhuma área aberta ainda.'),
      h('p', { class: 'texto-suave', text: jogoComecou ? `Jogo "Que área da tecnologia é a sua praia?": ${UI.plural(jogoComecou, 'pessoa começou', 'pessoas começaram')} e ${UI.plural(jogoTerminou, 'terminou', 'terminaram')} (${Math.round((100 * jogoTerminou) / Math.max(1, jogoComecou))}%).` : 'Ninguém jogou "Que área da tecnologia é a sua praia?" ainda.' }),
      tabela('Jogo da Tecnologia: área em 1º lugar', primeiras, [['Área', (l) => nomeArea(l.id)], ['Pessoas', (l) => String(l.pessoas)], ['Partidas', (l) => String(l.vezes)]], 'Nenhuma partida terminada ainda.'),
    ];
  }

  async function render(secao) {
    limpar(secao);
    const ehAdmin = Nuvem.ehAdmin();
    if (!estado.gerenciando) estado.gerenciando = new Set();
    const lista = h('div', { class: 'pessoas', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Carregando pessoas…' }));
    const faixaPacotes = h('div', { class: 'admin-faixa', 'aria-live': 'polite', hidden: true });
    const contagemTxt = h('p', { class: 'texto-suave admin-contagem' });
    const busca = h('input', { class: 'campo admin-busca', type: 'search', placeholder: 'Buscar por nome ou e-mail…', value: estado.busca, 'aria-label': 'Buscar pessoas',
      oninput: (e) => { estado.busca = e.target.value; desenharLista(); } });
    const botoesFiltro = [['', 'Todos'], ...Object.entries(PAPEIS).map(([k, v]) => [k, v.plural])].map(([k, nome]) => {
      const conta = h('span', { class: 'admin-filtro__conta' });
      const b = h('button', { type: 'button', 'aria-pressed': String(estado.filtroPapel === k), onclick: () => {
        estado.filtroPapel = k;
        botoesFiltro.forEach((x) => x.b.setAttribute('aria-pressed', String(x.b === b)));
        desenharLista();
      } }, nome, conta);
      return { k, b, conta };
    });
    const filtros = h('div', { class: 'segmentado admin-filtros', role: 'group', 'aria-label': 'Filtrar por tipo de conta' }, botoesFiltro.map((x) => x.b));

    secao.append(...[
      ehAdmin
        ? UI.cabecalho('Admin', 'Pessoas e cursos', 'Cadastre alunos, professores e admins, libere salas e cursos e acompanhe o progresso.')
        : UI.cabecalho('Professor', 'Meus alunos', 'Os alunos dos seus cursos e o progresso de cada um. Para cadastrar ou mudar cursos, fale com o admin.'),
      ehAdmin ? faixaPacotes : null,
      h('div', { class: 'admin-topo' },
        busca,
        ehAdmin ? h('button', { type: 'button', class: 'botao botao--primario admin-topo__novo', id: 'admin-cadastrar', onclick: () => abrirCadastro() }, icone('i-mais'), 'Cadastrar pessoa') : null),
      h('div', { class: 'admin-filtros-linha' }, ehAdmin ? filtros : null, contagemTxt),
      lista,
      ehAdmin ? blocoProfissoes() : null].filter(Boolean));

    /** Quem tem o marcador do pacote e ainda não tem algum curso dele (ex.: curso publicado depois). */
    function pendentesDosPacotes() {
      return estado.pessoas.filter((p) => p.papel !== 'admin').flatMap((p) => p.cursos.filter(ehPacote).map((pid) => ({
        pessoa: p, pacote: pid, faltam: cursosDoPacote(pid).filter((c) => !p.cursos.includes(c)),
      }))).filter((x) => x.faltam.length);
    }

    /** "Salas completas": só aparece quando há curso publicado depois faltando para quem tem a sala inteira. */
    function desenharPacotes() {
      if (!ehAdmin) return;
      const pend = pendentesDosPacotes();
      const novos = pend.reduce((n, x) => n + x.faltam.length, 0);
      faixaPacotes.hidden = !pend.length;
      if (!pend.length) return faixaPacotes.replaceChildren();
      const botao = h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', id: 'admin-atualizar-pacotes', onclick: async () => {
        if (!(await UI.confirmar({ titulo: 'Atualizar as salas?', texto: `${UI.plural(pend.length, 'pessoa ganha', 'pessoas ganham')} ${UI.plural(novos, 'curso novo', 'cursos novos')} das salas. O que cada uma já tem continua igual.`, sim: 'Atualizar salas', humor: 'feliz' }))) return;
        botao.disabled = true;
        let falhas = 0;
        for (const x of pend) {
          const novaLista = [...new Set([...x.pessoa.cursos, ...x.faltam])];
          try {
            await Nuvem.rpc('admin_definir_matriculas', { p_usuario: x.pessoa.id, p_trilhas: novaLista });
            x.pessoa.cursos = novaLista;
          } catch (e) {
            falhas++;
          }
        }
        UI.toast(falhas ? 'Salas atualizadas em parte' : 'Salas atualizadas', falhas ? `${falhas} não deram certo; tente de novo.` : `${UI.plural(novos, 'matrícula nova', 'matrículas novas')}.`, 'i-livro');
        carregar();
      } }, icone('i-revisao'), 'Atualizar salas');
      faixaPacotes.replaceChildren(icone('i-alerta', 'admin-faixa__icone'),
        h('p', {}, h('strong', { text: 'Cursos novos nas salas. ' }),
          `${UI.plural(novos, 'curso publicado depois falta', 'cursos publicados depois faltam')} para ${UI.plural(pend.length, 'pessoa', 'pessoas')} com sala inteira.`),
        botao);
    }

    async function carregar() {
      try {
        const dados = await Nuvem.rest('GET', 'perfis?select=id,email,nome,admin,papel,trocar_senha,ativo,criado_em,matriculas(trilha_id)&order=nome.asc');
        estado.pessoas = (dados || []).map((p) => ({ ...p, papel: papelDe(p), cursos: (p.matriculas || []).map((m) => m.trilha_id) }))
          .filter((p) => ehAdmin || (p.id !== Nuvem.usuario().id && p.papel === 'aluno')); // professor: só os alunos
        desenharLista();
        desenharPacotes();
      } catch (erro) {
        lista.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
      }
    }

    /* ---------- Cadastro (janela) ---------- */
    function abrirCadastro() {
      const nome = h('input', { class: 'campo', id: 'admin-nome', required: true, maxlength: '120', autocomplete: 'off', placeholder: 'Ex.: Maria da Silva Souza' });
      const email = h('input', { class: 'campo', id: 'admin-email', type: 'email', required: true, autocomplete: 'off', placeholder: 'maria@empresa.com' });
      const escolha = escolhaDeAcesso([]);
      const blocoAcesso = h('fieldset', { class: 'grupo-campos janela__grupo' }, h('legend', { text: 'Salas e cursos' }), escolha);
      const dicaPapel = h('p', { class: 'texto-suave form-admin__dica', text: PAPEIS.aluno.dica });
      let papel = 'aluno';
      const seletorPapel = h('div', { class: 'segmentado', role: 'radiogroup', 'aria-label': 'Tipo de conta' },
        Object.entries(PAPEIS).map(([k, v]) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(k === papel), 'aria-pressed': String(k === papel), text: v.nome,
          onclick: (e) => {
            papel = k;
            seletorPapel.querySelectorAll('button').forEach((b) => {
              b.setAttribute('aria-checked', String(b === e.currentTarget));
              b.setAttribute('aria-pressed', String(b === e.currentTarget));
            });
            dicaPapel.textContent = v.dica;
            blocoAcesso.hidden = k === 'admin'; // admin já vê todos os cursos
            contar();
          },
        })));
      const conta = h('span', { class: 'janela__conta', 'aria-live': 'polite' });
      const contar = () => { conta.textContent = papel === 'admin' ? 'Admin vê todos os cursos' : textoContagem(escolha.contagem()); };
      escolha.addEventListener('change', contar);
      contar();
      const erro = h('div', { 'aria-live': 'polite' });
      const enviar = h('button', { type: 'submit', class: 'botao botao--primario', id: 'admin-enviar' }, icone('i-mais'), 'Cadastrar e gerar senha');
      const corpo = h('div', { class: 'form-admin' },
        h('div', { class: 'form-admin__papel' }, h('span', { class: 'rotulo-campo', text: 'Tipo de conta' }), seletorPapel, dicaPapel),
        h('div', { class: 'form-admin__linha' },
          h('div', {}, h('label', { for: 'admin-nome', class: 'rotulo-campo', text: 'Nome completo' }), nome),
          h('div', {}, h('label', { for: 'admin-email', class: 'rotulo-campo', text: 'E-mail' }), email)),
        blocoAcesso, erro);
      const dlg = janela({
        titulo: 'Cadastrar pessoa', sub: 'A pessoa recebe uma senha temporária e cria a dela no primeiro acesso.', corpo, classe: 'janela--cadastro',
        pe: [conta, h('div', { class: 'janela__botoes' }, h('button', { type: 'button', class: 'botao botao--fantasma janela__cancelar', text: 'Cancelar', onclick: () => dlg.close() }), enviar)],
        aoEnviar: async () => {
          const escolhidos = papel === 'admin' ? [] : escolha.escolhidos();
          if (!nome.value.trim() || !email.value.trim()) {
            erro.replaceChildren(h('p', { class: 'texto-erro', text: 'Preencha nome completo e e-mail.' }));
            return;
          }
          if (papel === 'admin' && !(await UI.confirmar({ titulo: 'Criar uma conta de admin?', texto: `${nome.value.trim()} vai poder cadastrar pessoas, mudar cursos e gerar senhas.`, sim: 'Criar conta de admin' }))) return;
          enviar.disabled = true;
          erro.replaceChildren(h('p', { class: 'texto-suave', text: 'Cadastrando…' }));
          try {
            const senha = await Nuvem.rpc('admin_criar_usuario', { p_email: email.value.trim(), p_nome: nome.value.trim(), p_trilhas: escolhidos, p_papel: papel });
            corpo.replaceChildren(cartaoSenha(nome.value.trim(), email.value.trim().toLowerCase(), senha, `${PAPEIS[papel].nome} cadastrado!`, papel));
            dlg.querySelector('.janela__pe').replaceChildren(h('div', { class: 'janela__botoes' },
              h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { dlg.close(); abrirCadastro(); } }, icone('i-mais'), 'Cadastrar outra pessoa'),
              h('button', { type: 'button', class: 'botao botao--primario', id: 'admin-concluir', text: 'Concluir', onclick: () => dlg.close() })));
            dlg.querySelector('#admin-concluir').focus({ preventScroll: true });
            carregar();
          } catch (e) {
            enviar.disabled = false;
            erro.replaceChildren(h('p', { class: 'texto-erro', text: e.message }));
          }
        },
      });
      nome.focus();
    }

    /* ---------- Acesso de uma pessoa (janela) ---------- */
    function editarAcesso(p) {
      const escolha = escolhaDeAcesso(p.cursos);
      const conta = h('span', { class: 'janela__conta', 'aria-live': 'polite' });
      const contar = () => { conta.textContent = textoContagem(escolha.contagem()); };
      escolha.addEventListener('change', contar);
      contar();
      const salvar = h('button', { type: 'submit', class: 'botao botao--primario', id: 'acesso-salvar' }, icone('i-check'), 'Salvar');
      const dlg = janela({
        titulo: `Salas e cursos de ${p.nome}`,
        sub: 'Marque a sala para liberar tudo, inclusive o que for publicado depois. Para liberar só alguns cursos, abra a setinha da sala.',
        corpo: escolha, classe: 'janela--acesso',
        pe: [conta, h('div', { class: 'janela__botoes' }, h('button', { type: 'button', class: 'botao botao--fantasma janela__cancelar', text: 'Cancelar', onclick: () => dlg.close() }), salvar)],
        aoEnviar: async () => {
          const escolhidos = escolha.escolhidos();
          salvar.disabled = true;
          try {
            await Nuvem.rpc('admin_definir_matriculas', { p_usuario: p.id, p_trilhas: escolhidos });
            p.cursos = escolhidos;
            dlg.close();
            desenharLista();
            desenharPacotes();
            const nomes = etiquetasAcesso(escolhidos).map((e) => e.texto);
            UI.toast('Acesso atualizado', `${p.nome}: ${nomes.length ? nomes.join(', ') : 'nenhum curso'}`, 'i-livro');
          } catch (erro) {
            salvar.disabled = false;
            UI.toast('Não deu certo', erro.message, 'i-x');
          }
        },
      });
      escolha.querySelector('.acesso__busca').focus({ preventScroll: true });
    }

    /* ---------- Lista ---------- */
    function desenharLista() {
      const termo = UI.normalizar(estado.busca);
      const filtradas = estado.pessoas.filter((p) => (!termo || UI.normalizar(`${p.nome} ${p.email}`).includes(termo)) && (!ehAdmin || !estado.filtroPapel || p.papel === estado.filtroPapel));
      botoesFiltro.forEach((x) => { x.conta.textContent = String(x.k ? estado.pessoas.filter((p) => p.papel === x.k).length : estado.pessoas.length); });
      limpar(lista);
      if (!estado.pessoas.length) {
        contagemTxt.textContent = '';
        return lista.append(UI.vazio(ehAdmin ? 'Ninguém cadastrado ainda. Use "Cadastrar pessoa", aqui em cima.' : 'Nenhum aluno nos seus cursos ainda. Quando o admin matricular alguém, aparece aqui.'));
      }
      contagemTxt.textContent = ehAdmin
        ? `${UI.plural(filtradas.length, 'pessoa', 'pessoas')}${termo || estado.filtroPapel ? ' neste filtro' : ''}`
        : `${UI.plural(filtradas.length, 'aluno', 'alunos')} · ${estado.pessoas.filter((p) => p.ativo).length} com acesso ativo`;
      if (!filtradas.length) return lista.append(h('p', { class: 'texto-suave', text: 'Ninguém com esse nome ou e-mail neste filtro.' }));
      filtradas.forEach((p) => lista.append(linhaPessoa(p)));
    }

    /** Uma linha por pessoa; "Gerenciar" (admin) ou "Progresso" (professor) abre o painel embaixo. */
    function linhaPessoa(p) {
      const aberto = estado.gerenciando.has(p.id);
      const painel = h('div', { class: 'pessoa__painel', id: `pessoa-painel-${p.id}`, hidden: !aberto });
      const meus = ehAdmin ? p.cursos : p.cursos.filter((c) => !ehPacote(c) && Nuvem.matriculas().includes(c));
      const etiquetas = p.papel === 'admin' ? [h('span', { class: 'chip', text: 'Todos os cursos' })] : etiquetasAcesso(meus).map(chipSala);
      const situacao = !p.ativo ? h('span', { class: 'chip chip--atrasada', text: 'Desativado' })
        : p.trocar_senha ? h('span', { class: 'chip chip--aviso', text: '1º acesso pendente' }) : h('span', { class: 'chip chip--ativo', text: 'Ativo' });
      const preencher = () => (ehAdmin ? painelAdmin(p, painel) : painelProfessor(p, painel));
      const botao = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno pessoa__gerenciar', 'aria-expanded': String(aberto), 'aria-controls': painel.id,
        onclick: () => {
          const abrir = painel.hidden;
          painel.hidden = !abrir;
          botao.setAttribute('aria-expanded', String(abrir));
          linha.classList.toggle('pessoa--aberta', abrir);
          if (abrir) { estado.gerenciando.add(p.id); preencher(); } else estado.gerenciando.delete(p.id);
        } }, ehAdmin ? 'Gerenciar' : 'Progresso', icone('i-seta-dir', 'pessoa__seta'));
      const linha = h('article', { class: `pessoa ${p.ativo ? '' : 'pessoa--inativa'} ${aberto ? 'pessoa--aberta' : ''}`.replace(/\s+/g, ' ').trim() },
        h('div', { class: 'pessoa__linha' },
          h('span', { class: 'pessoa__avatar', 'aria-hidden': 'true', text: p.nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() }),
          h('div', { class: 'pessoa__info' },
            h('h3', { class: 'pessoa__nome', text: p.nome }),
            h('span', { class: 'texto-suave pessoa__email', text: p.email })),
          h('div', { class: 'pessoa__etiquetas' },
            ehAdmin ? h('span', { class: `chip pessoa__papel-chip pessoa__papel-chip--${p.papel}`, text: PAPEIS[p.papel].nome }) : null,
            ...etiquetas,
            !etiquetas.length ? h('span', { class: 'chip', text: 'Sem curso' }) : null,
            situacao),
          botao),
        painel);
      if (aberto) preencher();
      return linha;
    }

    /** Professor: só o progresso nos cursos em comum. */
    function painelProfessor(p, painel) {
      painel.replaceChildren(h('div', { class: 'pessoa__progresso' }));
      progressoDe(p, painel.firstChild);
    }

    /** Admin: tipo de conta, acesso e ações da pessoa. */
    function painelAdmin(p, painel) {
      const eu = p.id === Nuvem.usuario().id;
      const seletorPapel = h('select', { class: 'campo pessoa__papel', 'aria-label': `Tipo de conta de ${p.nome}`, disabled: eu, title: eu ? 'Você não pode mudar o seu próprio tipo de conta' : null,
        onchange: async (e) => {
          const novo = e.target.value;
          if (novo === 'admin' && !(await UI.confirmar({ titulo: 'Dar acesso de admin?', texto: `${p.nome} vai poder cadastrar pessoas, mudar cursos e gerar senhas.`, sim: 'Dar acesso de admin' }))) {
            e.target.value = p.papel;
            return;
          }
          try {
            await Nuvem.rpc('admin_definir_papel', { p_usuario: p.id, p_papel: novo });
            UI.toast('Tipo de conta alterado', `${p.nome} agora é ${PAPEIS[novo].nome.toLowerCase()}.`, 'i-usuario');
            carregar();
          } catch (erro) {
            e.target.value = p.papel;
            UI.toast('Não deu certo', erro.message, 'i-x');
          }
        } },
      Object.entries(PAPEIS).map(([k, v]) => h('option', { value: k, selected: k === p.papel, text: v.nome })));
      const areaProgresso = h('div', { class: 'pessoa__progresso', hidden: !estado.abertos.has(p.id) });
      const areaSenha = h('div', { 'aria-live': 'polite' });
      if (estado.abertos.has(p.id)) progressoDe(p, areaProgresso);
      const etiquetas = etiquetasAcesso(p.cursos);

      painel.replaceChildren(
        h('div', { class: 'pessoa__grade' },
          h('div', { class: 'pessoa__campo' }, h('span', { class: 'rotulo-campo', text: 'Tipo de conta' }), seletorPapel),
          h('div', { class: 'pessoa__campo' }, h('span', { class: 'rotulo-campo', text: 'Salas e cursos' }),
            p.papel === 'admin'
              ? h('p', { class: 'texto-suave', text: 'Admin vê todos os cursos.' })
              : h('div', { class: 'pessoa__acesso' },
                h('span', { class: 'texto-suave', text: etiquetas.length ? etiquetas.map((e) => (e.inteira ? `${e.sala.nome} (sala inteira)` : e.texto)).join(' · ') : 'Nenhum curso ainda' }),
                h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno pessoa__editar-acesso', onclick: () => editarAcesso(p) }, icone('i-livro'), 'Editar salas e cursos')))),
        h('div', { class: 'pessoa__acoes' },
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-expanded': String(estado.abertos.has(p.id)), onclick: (e) => {
            const abrir = areaProgresso.hidden;
            areaProgresso.hidden = !abrir;
            e.currentTarget.setAttribute('aria-expanded', String(abrir));
            if (abrir) {
              estado.abertos.add(p.id);
              progressoDe(p, areaProgresso);
            } else estado.abertos.delete(p.id);
          } }, icone('i-estrela'), 'Progresso'),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: async () => {
            if (!(await UI.confirmar({ titulo: 'Gerar uma nova senha?', texto: `A senha atual de ${p.nome} deixa de funcionar e ela recebe uma senha temporária.`, sim: 'Gerar nova senha', perigo: true }))) return;
            try {
              const senha = await Nuvem.rpc('admin_redefinir_senha', { p_usuario: p.id });
              p.trocar_senha = true;
              areaSenha.replaceChildren(cartaoSenha(p.nome, p.email, senha, 'Nova senha temporária gerada!', p.papel));
            } catch (erro) {
              UI.toast('Não deu certo', erro.message, 'i-x');
            }
          } }, icone('i-revisao'), 'Nova senha temporária'),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: async () => {
            const novo = await UI.perguntar({ titulo: 'Editar nome', campo: { rotulo: 'Nome completo', valor: p.nome }, humor: null });
            if (novo === null || !novo.trim() || novo.trim() === p.nome) return;
            try {
              await Nuvem.rpc('admin_atualizar_usuario', { p_usuario: p.id, p_nome: novo.trim(), p_ativo: p.ativo });
              carregar();
            } catch (erro) {
              UI.toast('Não deu certo', erro.message, 'i-x');
            }
          } }, icone('i-nota'), 'Editar nome'),
          eu ? null : h('button', { type: 'button', class: `botao botao--pequeno pessoa__ativar ${p.ativo ? 'botao--erro' : 'botao--secundario'}`, onclick: async () => {
            if (!(await UI.confirmar({ titulo: `${p.ativo ? 'Desativar' : 'Reativar'} o acesso de ${p.nome}?`, texto: p.ativo ? 'A pessoa não entra mais, mas o progresso fica guardado.' : 'A pessoa volta a entrar com a senha dela.', sim: p.ativo ? 'Desativar acesso' : 'Reativar acesso', perigo: p.ativo, humor: p.ativo ? 'triste' : 'feliz' }))) return;
            try {
              await Nuvem.rpc('admin_atualizar_usuario', { p_usuario: p.id, p_nome: p.nome, p_ativo: !p.ativo });
              UI.toast(p.ativo ? 'Acesso desativado' : 'Acesso reativado', p.nome, 'i-usuario');
              carregar();
            } catch (erro) {
              UI.toast('Não deu certo', erro.message, 'i-x');
            }
          } }, p.ativo ? 'Desativar acesso' : 'Reativar acesso')),
        areaSenha, areaProgresso);
    }

    carregar();
  }

  return { render };
})();

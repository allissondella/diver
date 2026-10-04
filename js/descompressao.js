/*
 * descompressao.js — a Sala de Descompressão: um lugar para brincar e respirar entre um estudo e outro.
 *
 * - É de todo mundo: não depende de curso, trilha ou matrícula. Os pontos valem SÓ o placar da sala
 *   (nada de XP ou pérolas dos cursos). Cada partida vira um evento "jogo_concluido" sem curso no log de
 *   atividade (detalhes.jogo = "sala-<id>"), e o placar (função ranking_sala do banco) soma a partir dele.
 * - Admin e professores podem fechar a sala em horários de estudo (tabela sala_bloqueios): o admin para
 *   todos os alunos ou para um curso; o professor, para os cursos dele. Admin e professor nunca ficam presos.
 * - Os jogos ficam em js/descompressao/ e se registram aqui com Descompressao.registrar({ ... }).
 *   Contrato do jogo: { id, nome, icone, descricao, duracao, diario, abrir(ctx) → { parar(), emAndamento() } }
 *   ctx = { container, voltar(), pontuar(pontos, extras), hoje, aleatorio(semente), hash(texto), guia(passos, forcar),
 *           estado(), gravar(parcial), recorde() }.
 */
const Descompressao = (() => {
  const { h, icone, plural, dataLocal } = UI;
  const CHAVE = 'diver:v1:descompressao'; // { recordes: { id: n }, hoje: { id: { data, pontos } }, jogos: { id: {...} } }
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const jogos = [];
  let tela = null;
  let atual = null; // { def, controlador }
  let status = { aberta: true };
  let renderVez = 0; // duas chamadas seguidas de render(): só a última desenha (evita a tela em dobro)

  /* ---------- Utilidades compartilhadas pelos jogos ---------- */
  function hash(texto) {
    let x = 2166136261;
    for (let i = 0; i < texto.length; i++) {
      x ^= texto.charCodeAt(i);
      x = Math.imul(x, 16777619) >>> 0;
    }
    return x >>> 0;
  }
  function aleatorio(semente) { // mulberry32: a mesma semente gera a mesma sequência em qualquer aparelho
    let a = (typeof semente === 'string' ? hash(semente) : semente) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ler() {
    const d = Dados.ler(CHAVE, null);
    return d && typeof d === 'object' ? { recordes: d.recordes || {}, hoje: d.hoje || {}, jogos: d.jogos || {} } : { recordes: {}, hoje: {}, jogos: {} };
  }
  function gravarTudo(d) {
    Dados.gravar(CHAVE, d);
  }

  function registrar(def) {
    jogos.push(def);
  }
  const obter = (id) => jogos.find((j) => j.id === id);
  const nome = (idEvento) => {
    const j = obter(String(idEvento || '').replace(/^sala-/, ''));
    return j ? `${j.nome} (Sala de Descompressão)` : null;
  };

  /* ---------- Horário: a sala está aberta para mim? ---------- */
  const naNuvem = () => Nuvem.ativa && Nuvem.temSessao();
  const ehEquipe = () => naNuvem() && (Nuvem.ehAdmin() || Nuvem.ehProfessor());

  async function conferirStatus() {
    if (!naNuvem() || ehEquipe()) return (status = { aberta: true });
    try {
      status = (await Nuvem.rpc('sala_status')) || { aberta: true };
    } catch (e) {
      status = { aberta: true }; // sem conexão: a sala não fica trancada por erro
    }
    return status;
  }

  /* ---------- Tela principal ---------- */
  async function render(container) {
    tela = container;
    const vez = ++renderVez;
    parar();
    container.classList.remove('sd--jogando');
    container.replaceChildren(UI.cabecalho('Respira, Diver', 'Sala de Descompressão', 'Um intervalo para brincar e distrair. Aqui não tem matéria: os pontos valem só o placar da sala.'));
    await conferirStatus();
    if (vez !== renderVez || tela !== container || atual) return; // outra chamada mais nova, ou a pessoa abriu um jogo enquanto conferia
    if (!status.aberta) {
      container.append(fechada());
      return;
    }
    const d = ler();
    const hoje = dataLocal();
    const grade = h('div', { class: 'sd-jogos', id: 'sd-jogos' }, jogos.map((j) => {
      const feito = j.diario && d.hoje[j.id] && d.hoje[j.id].data === hoje;
      const recorde = d.recordes[j.id];
      return h('article', { class: `jogo-card jogo-card--disponivel sd-card sd-card--${j.id}` },
        h('div', { class: 'jogo-card__topo' },
          h('span', { class: 'jogo-card__icone', 'aria-hidden': 'true' }, icone(j.icone)),
          h('div', {}, h('h2', { class: 'jogo-card__nome', text: j.nome }), h('span', { class: 'texto-suave', text: j.duracao }))),
        h('p', { class: 'jogo-card__descricao', text: j.descricao }),
        h('div', { class: 'jogo-card__rodape' },
          feito ? h('span', { class: 'chip chip--ativo' }, icone('i-check'), `Hoje: ${plural(d.hoje[j.id].pontos, 'ponto', 'pontos')}`)
            : recorde ? h('span', { class: 'jogo-card__hist', text: `Recorde: ${recorde}` })
              : j.diario ? h('span', { class: 'chip chip--hoje', text: 'Novo hoje' }) : null,
          h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => abrir(j.id), 'aria-label': `${feito && !j.treino ? 'Ver' : 'Jogar'} ${j.nome}` }, feito && !j.treino ? 'Ver' : 'Jogar')));
    }));
    const verRanking = h('div', { class: 'sd-ver-ranking' },
      h('button', { type: 'button', class: 'botao botao--secundario', id: 'sd-ver-ranking', onclick: () => abrirRanking('geral') }, icone('i-trofeu'), 'Ver ranking'),
      h('span', { class: 'texto-suave', text: 'De cada jogo e geral, deste mês e o total.' }));
    container.append(...[verRanking, grade, ehEquipe() ? horarios() : null].filter(Boolean));
  }

  function fechada() {
    return h('section', { class: 'cartao sd-fechada', role: 'status' },
      UI.mascote('sd-fechada__mascote mascote--pensando'),
      h('h2', { text: 'A sala está fechada agora' }),
      h('p', { text: `Este é um horário de foco combinado pela sua equipe de estudos. A sala abre de novo às ${status.ate || 'mais tarde'}.` }),
      h('p', { class: 'texto-suave', text: 'Que tal um mergulho rápido enquanto isso? Depois a gente brinca.' }),
      h('div', { class: 'acoes-linha' }, h('a', { class: 'botao botao--primario', href: '#inicio' }, 'Bora mergulhar!')));
  }

  /* ---------- Ranking (todo mundo junto): geral ou de cada jogo, deste mês e total ---------- */
  const REGRA = {
    investigacao: 'Soma o melhor resultado de cada dia.',
    palavrinha: 'Palavra do dia: o melhor de cada dia, somado. Treino livre: até 60 por dia.',
    tiro: 'Vale o seu recorde.',
    batata: 'Vitórias do dia (até 150 por dia) + o recorde do modo Sozinho.',
    pitstop: 'Vale o seu recorde.',
    cardume: 'Vale o seu recorde.',
  };
  const PERIODOS = [['mes', 'Este mês'], ['geral', 'Total']];
  const MEDALHA = ['🥇', '🥈', '🥉'];

  function segmentado(rotulo, opcoes, atual, aoMudar) {
    const grupo = h('div', { class: 'segmentado', role: 'group', 'aria-label': rotulo });
    opcoes.forEach(([v, texto]) => grupo.append(h('button', { type: 'button', 'aria-pressed': String(atual === v), onclick: (e) => {
      grupo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      aoMudar(v);
    } }, texto)));
    return grupo;
  }

  /** Enche `lista` com o ranking de um jogo (ou 'geral') no período ('mes' ou 'geral' = total). */
  async function carregarRanking(lista, jogo, periodo) {
    if (!naNuvem()) {
      const d = ler();
      const doJogo = jogos.filter((j) => (jogo === 'geral' || j.id === jogo) && d.recordes[j.id]);
      lista.replaceChildren(doJogo.length ? h('ol', { class: 'pal-ranking__itens' }, doJogo.map((j) => h('li', { class: 'pal-ranking__item' },
        h('span', { class: 'pal-ranking__pos' }, icone('i-trofeu')),
        h('span', { class: 'pal-ranking__quem' }, h('span', { class: 'pal-ranking__nome', text: jogo === 'geral' ? j.nome : 'Seu recorde' })),
        h('span', { class: 'pal-ranking__pontos', text: `${d.recordes[j.id]} pts` }))))
        : h('p', { class: 'texto-suave', text: 'Seus recordes aparecem aqui.' }),
      h('p', { class: 'texto-suave pal-ranking__nota', text: 'Entre com sua conta para disputar o ranking com todo mundo.' }));
      return;
    }
    const vez = (lista.dataset.vez = String(Number(lista.dataset.vez || 0) + 1));
    lista.replaceChildren(h('p', { class: 'texto-suave', text: 'Contando os pontos…' }));
    try {
      const linhas = (await Nuvem.rpc('ranking_sala', { p_jogo: jogo, p_periodo: periodo })) || [];
      if (lista.dataset.vez !== vez) return; // a pessoa trocou o filtro enquanto carregava
      const eu = linhas.find((l) => l.sou_eu);
      const top = linhas.slice(0, 10);
      if (eu && !top.includes(eu)) top.push(eu);
      const quando = periodo === 'mes' ? 'neste mês' : 'no total';
      lista.replaceChildren(
        top.length ? h('p', { class: 'sd-ranking__eu', text: eu
          ? `Você está em ${eu.posicao}º de ${linhas.length} ${quando}, com ${plural(eu.pontos, 'ponto', 'pontos')}.`
          : `${plural(linhas.length, 'pessoa', 'pessoas')} no ranking ${quando}. Jogue para entrar!` }) : null,
        top.length ? h('ol', { class: 'pal-ranking__itens' }, top.map((l) => h('li', { class: `pal-ranking__item ${l.sou_eu ? 'pal-ranking__item--eu' : ''}`.trim() },
          h('span', { class: 'pal-ranking__pos', text: l.posicao <= 3 ? MEDALHA[l.posicao - 1] : `${l.posicao}º`, 'aria-label': `${l.posicao}º lugar` }),
          h('span', { class: 'pal-ranking__quem' }, h('span', { class: 'pal-ranking__nome', text: l.sou_eu ? `${l.nome} (você)` : l.nome })),
          h('span', { class: 'pal-ranking__pontos', text: `${l.pontos} pts` }))))
          : h('p', { class: 'texto-suave', text: 'Ninguém pontuou ainda. A primeira posição está esperando você.' }),
        h('p', { class: 'texto-suave pal-ranking__nota', text: jogo === 'geral'
          ? 'Geral: a soma de todos os jogos. Investigação e palavra do dia: o melhor de cada dia, somado; treino da Palavrinha: até 60 por dia. Tiro ao Alvo, Pit Stop e Cardume: o recorde. Batata Quente: vitórias do dia (até 150 por dia) + o recorde do Sozinho.'
          : REGRA[jogo] || '' }));
    } catch (e) {
      if (lista.dataset.vez === vez) lista.replaceChildren(h('p', { class: 'texto-erro', text: e.message || 'Não consegui carregar o ranking agora.' }));
    }
  }

  /** Ranking numa janela: na sala abre no geral (dá para escolher o jogo); dentro de um jogo, abre naquele jogo. */
  function abrirRanking(id = 'geral') {
    const def = id === 'geral' ? null : obter(id);
    let dialogo = document.getElementById('sd-ranking');
    if (!dialogo) {
      dialogo = h('dialog', { id: 'sd-ranking', class: 'dialogo dialogo--estreito sd-ranking', 'aria-labelledby': 'sd-ranking-titulo' });
      dialogo.addEventListener('keydown', (e) => e.stopPropagation()); // as teclas não chegam no jogo de trás
      dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
      window.addEventListener('hashchange', () => dialogo.open && dialogo.close());
      document.body.append(dialogo);
    }
    const antes = document.activeElement;
    const filtro = { jogo: id, periodo: 'mes' };
    const lista = h('div', { class: 'pal-ranking__lista', 'aria-live': 'polite' });
    const titulo = h('h2', { class: 'dialogo__titulo', id: 'sd-ranking-titulo', text: def ? def.nome : 'Sala de Descompressão' });
    const carregar = () => {
      titulo.textContent = filtro.jogo === 'geral' ? 'Sala de Descompressão' : obter(filtro.jogo).nome;
      carregarRanking(lista, filtro.jogo, filtro.periodo);
    };
    const fechar = h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar', onclick: () => dialogo.close() }, icone('i-x'));
    dialogo.replaceChildren(h('div', { class: 'dialogo__caixa' },
      h('header', { class: 'dialogo__topo' },
        h('div', {}, h('span', { class: 'rotulo', text: 'Ranking de todo mundo' }), titulo),
        fechar),
      h('div', { class: 'dialogo__corpo pal-ranking' },
        def ? null : segmentado('Jogo', [['geral', 'Geral'], ...jogos.map((j) => [j.id, j.curto || j.nome])], filtro.jogo, (v) => { filtro.jogo = v; carregar(); }),
        naNuvem() ? segmentado('Período', PERIODOS, filtro.periodo, (v) => { filtro.periodo = v; carregar(); }) : null,
        lista)));
    dialogo.addEventListener('close', () => { if (antes && antes.isConnected && antes.focus) antes.focus({ preventScroll: true }); }, { once: true });
    dialogo.showModal();
    fechar.focus({ preventScroll: true });
    carregar();
  }

  /* ---------- Horários de foco (admin e professor) ---------- */
  function horarios() {
    const eu = Nuvem.usuario().id;
    const admin = Nuvem.ehAdmin();
    const cursos = (admin ? App.trilhas().map((t) => t.id) : Nuvem.matriculas()).filter((c, i, a) => a.indexOf(c) === i);
    const lista = h('div', { class: 'sd-horarios__lista', 'aria-live': 'polite' });
    const msg = h('p', { class: 'sd-horarios__msg', 'aria-live': 'polite' });
    const nomeAlvo = (t) => (t ? App.nomeCurso(t) : 'Todos os alunos');

    async function carregar() {
      try {
        const linhas = (await Nuvem.rest('GET', 'sala_bloqueios?select=id,criado_por,trilha_id,dias,inicio,fim&order=criado_em.asc')) || [];
        const visiveis = admin ? linhas : linhas.filter((l) => l.trilha_id === null || cursos.includes(l.trilha_id));
        lista.replaceChildren(visiveis.length ? h('ul', { class: 'sd-horarios__itens' }, visiveis.map((l) => h('li', { class: 'sd-horario' },
          h('span', { class: 'sd-horario__quando' }, icone('i-relogio'), `${[...l.dias].sort().map((d) => DIAS[d]).join(', ')} · ${String(l.inicio).slice(0, 5)} às ${String(l.fim).slice(0, 5)}`),
          h('span', { class: 'chip chip--papel', text: nomeAlvo(l.trilha_id) }),
          admin || l.criado_por === eu ? h('button', { type: 'button', class: 'botao-icone', 'aria-label': `Apagar o horário de ${nomeAlvo(l.trilha_id)}`, onclick: () => apagar(l) }, icone('i-lixo')) : null)))
          : h('p', { class: 'texto-suave', text: 'Nenhum horário de foco: a sala fica aberta o tempo todo.' }));
      } catch (e) {
        lista.replaceChildren(h('p', { class: 'texto-erro', text: e.message }));
      }
    }
    async function apagar(l) {
      if (!(await UI.confirmar({ titulo: 'Apagar este horário?', texto: 'A sala volta a ficar aberta nesse horário.', sim: 'Apagar', perigo: true, humor: 'triste' }))) return;
      try {
        await Nuvem.rest('DELETE', `sala_bloqueios?id=eq.${encodeURIComponent(l.id)}`);
        carregar();
      } catch (e) {
        msg.textContent = e.message;
      }
    }

    const dias = h('fieldset', { class: 'sd-dias' }, h('legend', { text: 'Dias' }),
      DIAS.map((d, i) => h('label', { class: 'sd-dia' }, h('input', { type: 'checkbox', value: String(i), checked: i >= 1 && i <= 5 }), h('span', { text: d }))));
    const inicio = h('input', { class: 'campo', type: 'time', id: 'sd-inicio', value: '08:00', required: true });
    const fim = h('input', { class: 'campo', type: 'time', id: 'sd-fim', value: '12:00', required: true });
    const alvo = h('select', { class: 'campo', id: 'sd-alvo' },
      admin ? h('option', { value: '', text: 'Todos os alunos' }) : null,
      cursos.map((c) => h('option', { value: c, text: App.nomeCurso(c) })));
    const form = h('form', { class: 'sd-horarios__form', onsubmit: async (e) => {
      e.preventDefault();
      const marcados = [...dias.querySelectorAll('input:checked')].map((x) => Number(x.value));
      if (!marcados.length) return (msg.textContent = 'Escolha pelo menos um dia.');
      if (!inicio.value || !fim.value || fim.value <= inicio.value) return (msg.textContent = 'O fim precisa ser depois do início (no mesmo dia).');
      if (!admin && !alvo.value) return (msg.textContent = 'Escolha um dos seus cursos.');
      try {
        await Nuvem.rest('POST', 'sala_bloqueios', { corpo: { dias: marcados, inicio: inicio.value, fim: fim.value, trilha_id: alvo.value || null }, prefer: 'return=minimal' });
        msg.textContent = 'Horário salvo. Nesse período, os alunos veem a sala fechada.';
        carregar();
      } catch (err) {
        msg.textContent = err.message;
      }
    } },
    dias,
    h('div', { class: 'sd-horarios__campos' },
      h('label', { class: 'sd-campo', for: 'sd-inicio' }, h('span', { text: 'Das' }), inicio),
      h('label', { class: 'sd-campo', for: 'sd-fim' }, h('span', { text: 'Até' }), fim),
      h('label', { class: 'sd-campo', for: 'sd-alvo' }, h('span', { text: 'Para quem' }), alvo)),
    h('div', { class: 'acoes-linha' }, h('button', { type: 'submit', class: 'botao botao--primario', disabled: !admin && !cursos.length }, 'Fechar a sala nesse horário')),
    msg);
    carregar();
    return h('section', { class: 'cartao sd-horarios', id: 'sd-horarios', 'aria-labelledby': 'sd-horarios-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'sd-horarios-titulo', text: 'Horários de foco' }),
      h('p', { class: 'texto-suave', text: admin
        ? 'Feche a sala para os alunos em horários de estudo (horário de Brasília). Admin e professores continuam entrando.'
        : 'Feche a sala para os alunos dos seus cursos em horários de estudo (horário de Brasília).' }),
      lista, form);
  }

  /* ---------- Abrir um jogo ---------- */
  async function abrir(id) {
    const def = obter(id);
    if (!def || !tela) return;
    await conferirStatus();
    if (!status.aberta) return render(tela);
    parar();
    const container = h('div', { class: `sd-jogo sd-jogo--${id}` });
    const voltar = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno sd-voltar', onclick: () => sairDoJogo() }, icone('i-voltar'), 'Sala');
    tela.classList.add('sd--jogando');
    const ranking = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno sd-barra__ranking', id: 'sd-ranking-botao', onclick: () => abrirRanking(id), 'aria-label': `Ranking de ${def.nome}` }, icone('i-trofeu'), h('span', { class: 'sd-barra__ranking-texto', text: 'Ranking' }));
    tela.replaceChildren(h('div', { class: 'sd-barra' }, voltar, h('h1', { class: 'sd-barra__titulo', tabindex: '-1', text: def.nome }), ranking), container);
    document.body.classList.add('modo-foco');
    window.scrollTo(0, 0);
    tela.querySelector('h1').focus({ preventScroll: true });
    const hoje = dataLocal();
    const ctx = {
      container,
      hoje,
      hash,
      aleatorio,
      voltar: () => sairDoJogo(true),
      estado: () => ler().jogos[id] || null,
      gravar: (parcial) => {
        const d = ler();
        d.jogos[id] = { ...(d.jogos[id] || {}), ...parcial };
        gravarTudo(d);
      },
      recorde: () => ler().recordes[id] || 0,
      guia: (passos, forcar = false) => Tutorial.guiar(`descompressao-${id}`, passos, { forcar }),
      pontuar: (pontos, extras = {}) => {
        const p = Math.max(0, Math.round(Number(pontos) || 0));
        const d = ler();
        if (p > (d.recordes[id] || 0)) d.recordes[id] = p;
        const dia = d.hoje[id] && d.hoje[id].data === hoje ? d.hoje[id] : { data: hoje, pontos: 0 };
        dia.pontos = id === 'batata' ? Math.min(150, dia.pontos + p) : Math.max(dia.pontos, p);
        d.hoje[id] = dia;
        gravarTudo(d);
        Atividade.registrar('jogo_concluido', null, { ...extras, jogo: `sala-${id}`, pontos: p, pontuacao: p, data: hoje });
      },
    };
    atual = { def, controlador: null };
    atual.controlador = def.abrir(ctx) || null;
  }

  function emAndamento() {
    return !!(atual && atual.controlador && atual.controlador.emAndamento && atual.controlador.emAndamento());
  }

  function parar() {
    if (atual && atual.controlador && atual.controlador.parar) atual.controlador.parar();
    atual = null;
    document.body.classList.remove('modo-foco');
  }

  async function sairDoJogo(semPerguntar = false) {
    if (!semPerguntar && emAndamento() && !(await UI.confirmar({
      titulo: 'Voltar para a sala?', texto: 'A partida em andamento termina aqui.', sim: 'Voltar', nao: 'Continuar jogando', humor: 'triste',
    }))) return;
    parar();
    if (tela) render(tela);
    Tutorial.fechar(false);
  }

  return { registrar, render, abrir, abrirRanking, parar, emAndamento, nome, hash, aleatorio, lista: () => [...jogos] };
})();

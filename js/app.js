/*
 * app.js — telas, eventos e renderização do Diver.
 * As regras ficam em quiz.js, progresso.js e conquistas.js; aqui é só a "cara" do app.
 */
(() => {
  /* ---------- Estado da aplicação ---------- */
  const estado = {
    trilhas: [],
    selecionada: null, // id da trilha marcada na tela inicial
    trilha: null, // trilha aberta
    prog: null, // progresso da trilha aberta
    sessao: null, // sessão de estudo em andamento
    respondida: false, // a questão atual já foi respondida?
    ordem: [], // ordem embaralhada das alternativas da questão atual
    timer: null,
    avisouUltimoMinuto: false,
  };

  const NOMES_MODO = { mergulho: 'Mergulho', simulado: 'Simulado', revisao: 'Revisão' };
  const NOMES_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
  const LETRAS = 'ABCDEF';
  const MSGS_ERRO = [
    'Quase! Essa foi por pouco.',
    'Não foi dessa vez.',
    'Essa correnteza te pegou.',
    'Errar faz parte do mergulho.',
  ];

  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Utilitários de DOM ---------- */
  const $ = (id) => document.getElementById(id);

  /** Cria um elemento. Textos entram sempre como texto (nunca como HTML). */
  function h(tag, props = {}, ...filhos) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    filhos.flat().forEach((f) => {
      if (f === null || f === undefined || f === false) return;
      el.append(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
    });
    return el;
  }

  /** Ícone do sprite SVG do index.html. */
  function icone(nome, classe = '') {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', `icone ${classe}`.trim());
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + nome);
    svg.append(use);
    return svg;
  }

  function limpar(el) {
    el.replaceChildren();
    return el;
  }

  function embaralhar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sortear(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
  }

  function formatarTempo(seg) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function plural(n, singular, pluralTxt) {
    return `${n} ${n === 1 ? singular : pluralTxt}`;
  }

  /* ---------- Troca de telas ---------- */
  function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach((t) => (t.hidden = t.id !== id));
    window.scrollTo(0, 0);
    // Move o foco para o título da tela (bom para leitores de tela)
    const titulo = $(id).querySelector('h1[tabindex], h2[tabindex]');
    if (titulo) titulo.focus({ preventScroll: true });
  }

  /* ---------- Mascote ---------- */
  function montarMascotes() {
    const molde = $('molde-mascote');
    document.querySelectorAll('[data-mascote]').forEach((el) => {
      el.append(molde.content.cloneNode(true));
    });
  }

  /** humor: 'feliz' | 'triste' | null (neutro) */
  function humorMascote(container, humor) {
    container.querySelectorAll('[data-mascote]').forEach((m) => {
      m.classList.remove('mascote--feliz', 'mascote--triste');
      void m.offsetWidth; // reinicia a animação
      if (humor) m.classList.add('mascote--' + humor);
    });
  }

  /* ---------- Bolhas do fundo ---------- */
  function criarBolhas() {
    if (movimentoReduzido) return;
    const area = document.querySelector('.bolhas');
    for (let i = 0; i < 16; i++) {
      const tam = 6 + Math.random() * 22;
      area.append(h('span', {
        class: 'bolha',
        style: `left:${Math.random() * 100}%;width:${tam}px;height:${tam}px;` +
          `animation-duration:${12 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s`,
      }));
    }
  }

  /* ---------- Avisos rápidos (toasts) ---------- */
  function toast(titulo, texto, nomeIcone = 'i-trofeu') {
    const el = h('div', { class: 'toast', role: 'status' },
      h('span', { class: 'toast__icone' }, icone(nomeIcone)),
      h('div', {}, h('p', { class: 'toast__titulo', text: titulo }), h('p', { class: 'toast__texto', text: texto })),
    );
    const area = $('toasts');
    area.append(el);
    // No máximo 2 avisos por vez, para não cobrir a questão
    while (area.children.length > 2) area.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('saindo');
      setTimeout(() => el.remove(), 320);
    }, 3000);
  }

  function avisarConquistas(lista) {
    lista.forEach((c, i) => setTimeout(() => toast('Conquista desbloqueada', c.nome, c.icone), i * 600));
  }

  /* =========================================================
     TELA INICIAL
     ========================================================= */
  async function carregarTrilhas() {
    const { trilhas, problemas, semServidor } = await Trilhas.carregarTodas();
    estado.trilhas = trilhas;
    const ultima = Progresso.ultimaTrilha();
    estado.selecionada = trilhas.some((t) => t.id === ultima) ? ultima : trilhas[0] && trilhas[0].id;
    renderizarTrilhas();
    renderizarAvisos(problemas, semServidor && trilhas.length === 0);
  }

  function renderizarTrilhas() {
    const lista = limpar($('lista-trilhas'));
    if (!estado.trilhas.length) {
      lista.append(h('p', { class: 'carregando', text: 'Nenhuma trilha por aqui ainda.' }));
    }
    estado.trilhas.forEach((t) => {
      const prog = Progresso.carregar(t.id);
      const nivel = Progresso.nivel(prog.xp);
      const concluidas = t.fases.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida).length;
      const marcada = t.id === estado.selecionada;
      const card = h('button', {
        class: 'trilha',
        type: 'button',
        role: 'radio',
        'aria-checked': String(marcada),
        tabindex: marcada ? '0' : '-1',
        'data-id': t.id,
        onclick: () => selecionarTrilha(t.id, true),
        ondblclick: () => abrirTrilha(t.id),
      },
      t.categoria ? h('span', { class: 'rotulo', text: t.categoria }) : null,
      h('span', { class: 'trilha__nome', text: t.nome }),
      h('span', { class: 'trilha__descricao', text: t.descricao }),
      h('span', { class: 'trilha__meta' },
        h('span', {}, icone('i-seta-baixo'), `${concluidas}/${t.fases.length} fases`),
        h('span', {}, plural(t.questoes.length, 'questão', 'questões')),
        prog.xp > 0 ? h('span', {}, icone('i-estrela'), `Nível ${nivel.numero}`) : null,
        Progresso.streakVigente(prog) > 0 ? h('span', {}, icone('i-onda'), plural(Progresso.streakVigente(prog), 'dia', 'dias')) : null,
      ));
      lista.append(card);
    });
    $('btn-bora').disabled = !estado.selecionada;
  }

  function selecionarTrilha(id, focar) {
    estado.selecionada = id;
    document.querySelectorAll('.trilha').forEach((c) => {
      const sel = c.dataset.id === id;
      c.setAttribute('aria-checked', String(sel));
      c.tabIndex = sel ? 0 : -1;
      if (sel && focar) c.focus();
    });
    $('btn-bora').disabled = false;
  }

  /** Setas do teclado navegam entre as trilhas (padrão de radiogroup). */
  function teclasTrilhas(e) {
    const cards = [...document.querySelectorAll('.trilha')];
    const i = cards.findIndex((c) => c.dataset.id === estado.selecionada);
    let novo = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') novo = (i + 1) % cards.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') novo = (i - 1 + cards.length) % cards.length;
    if (novo !== null && cards.length) {
      e.preventDefault();
      selecionarTrilha(cards[novo].dataset.id, true);
    }
  }

  function renderizarAvisos(problemas, semServidor) {
    const aviso = limpar($('aviso-trilhas'));
    if (semServidor) {
      aviso.append(
        h('p', {}, h('strong', { text: 'Não consegui ler a pasta de trilhas. ' }),
          'Isso acontece quando o index.html é aberto direto do disco: o navegador bloqueia a leitura dos arquivos JSON por segurança.'),
        h('p', {}, 'Duas saídas: abra o projeto com a extensão ', h('strong', { text: 'Live Server' }),
          ' do VS Code (ou rode ', h('code', { text: 'python3 -m http.server' }), '), ou use o botão ',
          h('strong', { text: 'Carregar trilha (.json)' }), ' e escolha os arquivos de ', h('code', { text: 'data/trilhas/' }), '.'),
      );
    }
    if (problemas.length) {
      aviso.append(h('p', {}, h('strong', { text: 'Algumas trilhas têm problemas e ficaram de fora:' })));
      problemas.forEach((p) => {
        aviso.append(h('p', { text: p.origem }), h('ul', {}, p.erros.slice(0, 6).map((e) => h('li', { text: e }))));
      });
    }
    aviso.hidden = !semServidor && !problemas.length;
  }

  async function importarTrilhas(e) {
    const arquivos = [...e.target.files];
    if (!arquivos.length) return;
    const { ok, erros } = await Trilhas.importarArquivos(arquivos);
    if (ok.length) toast('Trilha carregada', ok.join(', '), 'i-upload');
    await carregarTrilhas();
    if (erros.length) renderizarAvisos(erros, false);
    e.target.value = '';
  }

  /* =========================================================
     PAINEL DA TRILHA
     ========================================================= */
  function abrirTrilha(id) {
    const trilha = estado.trilhas.find((t) => t.id === id);
    if (!trilha) return;
    estado.trilha = trilha;
    estado.prog = Progresso.carregar(id);
    Progresso.definirUltimaTrilha(id);
    renderizarPainel();
    mostrarTela('tela-painel');
  }

  function salvar() {
    Progresso.salvar(estado.trilha.id, estado.prog);
  }

  function renderizarPainel() {
    const { trilha, prog } = estado;
    $('painel-titulo').textContent = trilha.nome;
    $('painel-categoria').textContent = trilha.categoria || 'Trilha';
    renderizarStatus();
    renderizarMapa();
    renderizarModos();
    renderizarConquistas();
  }

  function renderizarStatus() {
    const prog = estado.prog;
    const nivel = Progresso.nivel(prog.xp);
    $('st-nivel-num').textContent = `Nível ${nivel.numero}`;
    $('st-nivel-nome').textContent = nivel.nome;
    $('st-xp-preenchimento').style.width = nivel.pct + '%';
    $('st-xp-barra').setAttribute('aria-valuenow', nivel.pct);
    $('st-xp-texto').textContent = nivel.max
      ? `${prog.xp} XP. Nível máximo: você é Mestre Diver.`
      : `${prog.xp} XP · faltam ${nivel.xpParaProximo - nivel.xpNoNivel} para ${nivel.proximoNome}`;

    $('st-perolas').textContent = prog.perolas;
    const streak = Progresso.streakVigente(prog);
    $('st-streak').textContent = streak;
    $('st-streak-rotulo').textContent = streak === 1 ? 'dia seguido' : 'dias seguidos';

    const hoje = Progresso.respondidasHoje(prog);
    $('st-meta').textContent = `${Math.min(hoje, prog.metaDiaria)}/${prog.metaDiaria}`;
    const pctMeta = Math.min(100, Math.round((hoje / prog.metaDiaria) * 100));
    $('st-meta-preenchimento').style.width = pctMeta + '%';
    $('st-meta-barra').setAttribute('aria-valuemax', prog.metaDiaria);
    $('st-meta-barra').setAttribute('aria-valuenow', Math.min(hoje, prog.metaDiaria));

    const select = limpar($('select-meta'));
    Progresso.METAS_DIARIAS.forEach((n) => {
      select.append(h('option', { value: n, selected: n === prog.metaDiaria, text: `${n} questões` }));
    });
  }

  function renderizarMapa() {
    const { trilha, prog } = estado;
    const mapa = limpar($('mapa-fases'));
    const n = trilha.fases.length;

    trilha.fases.forEach((fase, i) => {
      const liberada = Progresso.faseDesbloqueada(prog, trilha, i);
      const info = prog.fases[fase.id];
      const concluida = !!(info && info.concluida);
      const qtd = Trilhas.questoesDaFase(trilha, fase.id).length;

      let estadoTxt;
      if (!liberada) estadoTxt = `Bloqueada: complete ${trilha.fases[i - 1].nome} para descer`;
      else if (concluida) estadoTxt = 'Concluída';
      else estadoTxt = plural(qtd, 'questão', 'questões');

      const estrelas = h('span', { class: 'estrelas', 'aria-hidden': 'true' },
        [1, 2, 3].map((k) => icone('i-estrela', concluida && info.estrelas >= k ? 'ativa' : '')));

      const botao = h('button', {
        type: 'button',
        class: `fase ${concluida ? 'fase--concluida' : ''} ${liberada ? '' : 'fase--bloqueada'}`,
        style: `--prof:${n > 1 ? i / (n - 1) : 0}`,
        disabled: !liberada,
        'aria-label': `${fase.nome}${fase.profundidade ? ', ' + fase.profundidade : ''}. ${estadoTxt}` +
          (concluida ? `, ${info.estrelas} de 3 estrelas` : ''),
        onclick: () => iniciarSessao('mergulho', { faseId: fase.id }),
      },
      h('span', { class: 'fase__no', 'aria-hidden': 'true' },
        !liberada ? icone('i-cadeado') : concluida ? icone('i-check') : String(i + 1)),
      h('span', { class: 'fase__info' },
        h('span', { class: 'fase__nome' }, fase.nome, fase.profundidade ? h('span', { class: 'fase__prof', text: fase.profundidade }) : null),
        fase.descricao ? h('span', { class: 'fase__descricao', text: fase.descricao }) : null,
        h('span', { class: 'fase__estado' }, concluida ? estrelas : null, estadoTxt),
      ),
      liberada ? h('span', { class: 'fase__cta', 'aria-hidden': 'true', text: concluida ? 'Refazer' : 'Mergulhar' }) : null);

      mapa.append(h('li', {}, botao));
    });
  }

  function renderizarModos() {
    const { trilha, prog } = estado;

    // Simulado: opções de quantidade de questões
    const total = trilha.questoes.length;
    const select = limpar($('select-simulado'));
    const opcoes = [5, 10, 20].filter((n) => n < total);
    opcoes.forEach((n) => select.append(h('option', { value: n, text: String(n) })));
    select.append(h('option', { value: total, text: `Todas (${total})` }));
    select.value = opcoes.includes(10) ? '10' : String(total);

    // Histórico dos últimos simulados
    const hist = limpar($('historico-simulados'));
    if (prog.simulados.length) {
      hist.append(h('span', { text: 'Últimos simulados' }), h('ul', {}, prog.simulados.slice(0, 4).map((s) =>
        h('li', {},
          h('span', { text: new Date(s.data).toLocaleDateString('pt-BR') + ` · ${s.acertos}/${s.total} · ${formatarTempo(s.tempoSeg)}` }),
          h('strong', { text: `Nota ${s.nota.toLocaleString('pt-BR')}` })))));
    }

    // Revisão
    const qtd = Progresso.paraRevisar(prog, trilha).length;
    $('revisao-texto').textContent = qtd
      ? `${plural(qtd, 'questão esperando', 'questões esperando')} por você: as que você errou ou marcou. Mergulho de volta, sem pressão.`
      : 'Nada pra revisar por enquanto. As questões que você errar ou marcar aparecem aqui.';
    $('btn-revisao').disabled = qtd === 0;
  }

  function renderizarConquistas() {
    const prog = estado.prog;
    const lista = limpar($('lista-conquistas'));
    let feitas = 0;
    Conquistas.LISTA.forEach((c) => {
      const ok = !!prog.conquistas[c.id];
      if (ok) feitas++;
      lista.append(h('li', {},
        h('div', { class: `conquista ${ok ? '' : 'conquista--bloqueada'}` },
          h('span', { class: 'conquista__icone' }, icone(ok ? c.icone : 'i-cadeado')),
          h('span', { class: 'conquista__nome', text: c.nome }),
          h('span', { class: 'conquista__desc', text: c.descricao }),
          h('span', { class: 'visualmente-oculto', text: ok ? 'Desbloqueada' : 'Bloqueada' }))));
    });
    $('conquistas-contagem').textContent = `${feitas}/${Conquistas.LISTA.length}`;
  }

  /* =========================================================
     SESSÃO DE ESTUDO (QUIZ)
     ========================================================= */
  function iniciarSessao(modo, opcoes = {}) {
    const s = Quiz.criar(modo, estado.trilha, estado.prog, opcoes);
    if (!s.fila.length) {
      toast('Ops', modo === 'revisao' ? 'Não há questões para revisar.' : 'Essa fase ainda não tem questões.', 'i-bolha');
      return;
    }
    estado.sessao = s;
    estado.nivelInicial = Progresso.nivel(estado.prog.xp).numero;
    estado.subiuNivel = null;
    salvar();

    $('quiz-oxigenio').hidden = s.oxigenio === null;
    $('quiz-timer').hidden = s.limiteSeg === null;
    $('quiz-modo').textContent = s.fase ? `${NOMES_MODO[modo]} · ${s.fase.nome}` : NOMES_MODO[modo];

    pararTimer();
    if (s.limiteSeg !== null) {
      estado.avisouUltimoMinuto = false;
      atualizarTimer();
      estado.timer = setInterval(atualizarTimer, 1000);
    }

    mostrarTela('tela-quiz');
    renderizarQuestao();
  }

  function pararTimer() {
    clearInterval(estado.timer);
    estado.timer = null;
  }

  function atualizarTimer() {
    const s = estado.sessao;
    const resta = Quiz.segundosRestantes(s);
    const el = $('quiz-timer');
    el.querySelector('span').textContent = formatarTempo(resta);
    el.classList.toggle('acabando', resta <= 60);
    el.setAttribute('aria-label', `Tempo restante: ${formatarTempo(resta)}`);
    if (resta <= 60 && !estado.avisouUltimoMinuto && s.limiteSeg > 60) {
      estado.avisouUltimoMinuto = true;
      toast('Atenção', 'Falta 1 minuto!', 'i-relogio');
    }
    if (resta <= 0) encerrarSessao('tempo');
  }

  function renderizarOxigenio(perdeuAgora) {
    const s = estado.sessao;
    if (s.oxigenio === null) return;
    const box = limpar($('quiz-oxigenio'));
    box.setAttribute('aria-label', `Oxigênio: ${s.oxigenio} de ${s.oxigenioMax}`);
    for (let i = 0; i < s.oxigenioMax; i++) {
      const vazio = i >= s.oxigenio;
      box.append(icone('i-oxigenio', `${vazio ? 'vazio' : ''} ${perdeuAgora && i === s.oxigenio ? 'perdeu' : ''}`));
    }
  }

  function renderizarQuestao() {
    const s = estado.sessao;
    const q = Quiz.atual(s);
    estado.respondida = false;

    $('quiz-feedback').hidden = true;
    humorMascote($('tela-quiz'), null);
    renderizarOxigenio(false);

    const pct = Math.round((s.indice / s.fila.length) * 100);
    $('quiz-barra-preenchimento').style.width = pct + '%';
    $('quiz-barra').setAttribute('aria-valuemax', s.fila.length);
    $('quiz-barra').setAttribute('aria-valuenow', s.indice);
    $('quiz-contador').textContent = `${s.indice + 1} de ${s.fila.length}`;

    $('quiz-tema').textContent = q.tema;
    const dif = $('quiz-dificuldade');
    dif.textContent = NOMES_DIFICULDADE[q.dificuldade];
    dif.className = `tag tag--${q.dificuldade}`;
    $('quiz-volta').hidden = s.indice < Quiz.totalPlanejado(s);

    $('quiz-enunciado').textContent = q.enunciado;
    // As alternativas aparecem embaralhadas: a resposta certa não fica sempre na mesma letra.
    // estado.ordem[posição na tela] = índice original no JSON
    estado.ordem = embaralhar(q.alternativas.map((_, i) => i));
    const alts = limpar($('quiz-alternativas'));
    estado.ordem.forEach((original, pos) => {
      alts.append(h('button', {
        type: 'button',
        class: 'alternativa',
        'data-indice': original,
        'aria-keyshortcuts': `${pos + 1} ${LETRAS[pos]}`,
        onclick: () => responder(original),
      }, h('span', { class: 'alternativa__letra', 'aria-hidden': 'true', text: LETRAS[pos] }), h('span', { text: q.alternativas[original] })));
    });

    atualizarBotaoMarcar();
    $('quiz-enunciado').focus({ preventScroll: true });
  }

  function atualizarBotaoMarcar() {
    const q = Quiz.atual(estado.sessao);
    const e = estado.prog.questoes[q.id];
    const marcada = !!(e && e.marcada);
    const btn = $('btn-marcar');
    btn.setAttribute('aria-pressed', String(marcada));
    btn.querySelector('use').setAttribute('href', marcada ? '#i-marcador-cheio' : '#i-marcador');
    btn.querySelector('span').textContent = marcada ? 'Marcada para revisar' : 'Marcar para revisar';
  }

  function responder(indice) {
    if (estado.respondida || !estado.sessao || estado.sessao.encerrada) return;
    estado.respondida = true;
    const s = estado.sessao;
    const q = Quiz.atual(s);
    const r = Quiz.responder(s, indice, estado.prog);
    const botoes = [...document.querySelectorAll('.alternativa')];
    botoes.forEach((b) => (b.disabled = true));

    // Conquistas e nível podem mudar a cada resposta
    const novas = Conquistas.verificar(estado.prog, estado.trilha);
    salvar();
    avisarConquistas(novas);
    checarNivel();

    // Simulado: sem feedback, segue direto para a próxima
    if (s.modo === 'simulado') {
      botoes.find((b) => Number(b.dataset.indice) === indice).classList.add('alternativa--escolhida');
      setTimeout(continuar, movimentoReduzido ? 0 : 280);
      return;
    }

    // Mergulho e Revisão: mostra certo/errado e a explicação
    botoes.forEach((b) => {
      const i = Number(b.dataset.indice);
      if (i === q.correta) b.classList.add('alternativa--correta');
      else if (i === indice) b.classList.add('alternativa--errada');
      else b.classList.add('alternativa--apagada');
    });
    renderizarOxigenio(!r.acertou && s.oxigenio !== null);
    humorMascote($('tela-quiz'), r.acertou ? 'feliz' : 'triste');

    const painel = $('quiz-feedback');
    painel.classList.toggle('feedback--erro', !r.acertou);
    if (r.acertou) {
      $('feedback-titulo').textContent = 'Mandou bem, Diver!';
      const partes = [`+${r.xp} XP`, `+${r.perolas} ${r.perolas === 1 ? 'pérola' : 'pérolas'}`];
      if (r.combo >= 3) partes.push(`sequência de ${r.combo}`);
      $('feedback-ganho').textContent = partes.join(' · ');
    } else {
      $('feedback-titulo').textContent = r.semOxigenio ? 'Acabou o oxigênio!' : sortear(MSGS_ERRO);
      $('feedback-ganho').textContent = `Resposta certa: ${LETRAS[estado.ordem.indexOf(q.correta)]}) ${q.alternativas[q.correta]}`;
    }
    $('feedback-explicacao').textContent = q.explicacao;
    const ultima = r.semOxigenio || s.indice === s.fila.length - 1;
    $('btn-continuar').textContent = ultima ? 'Ver resumo' : 'Continuar';
    painel.hidden = false;
    $('btn-continuar').focus({ preventScroll: true });
  }

  function continuar() {
    const s = estado.sessao;
    if (!s || s.encerrada) return;
    if (Quiz.avancar(s)) renderizarQuestao();
    else encerrarSessao(s.oxigenio !== null && s.oxigenio <= 0 ? 'sem-oxigenio' : 'fim');
  }

  function checarNivel() {
    const nivel = Progresso.nivel(estado.prog.xp);
    if (nivel.numero > estado.nivelInicial) {
      estado.nivelInicial = nivel.numero;
      estado.subiuNivel = nivel;
      toast('Subiu de nível!', `Nível ${nivel.numero}: ${nivel.nome}`, 'i-estrela');
    }
  }

  function sairDoQuiz() {
    const s = estado.sessao;
    if (!s) return;
    const temRespostas = s.respostas.length > 0;
    const msg = temRespostas
      ? 'Subir agora? O que você já respondeu fica salvo.'
      : 'Subir agora? Nada foi respondido ainda.';
    if (!window.confirm(msg)) return;
    if (temRespostas) encerrarSessao('saiu');
    else {
      pararTimer();
      estado.sessao = null;
      renderizarPainel();
      mostrarTela('tela-painel');
    }
  }

  function encerrarSessao(motivo) {
    const s = estado.sessao;
    if (!s || s.encerrada) return;
    pararTimer();
    $('quiz-feedback').hidden = true;
    const resumo = Quiz.finalizar(s, estado.prog, motivo);
    checarNivel();
    const novas = Conquistas.verificar(estado.prog, estado.trilha);
    salvar();
    avisarConquistas(novas);
    renderizarResumo(resumo, novas);
    mostrarTela('tela-resumo');
  }

  /* =========================================================
     RESUMO DA SESSÃO
     ========================================================= */
  function textosResumo(r) {
    const { trilha } = estado;
    if (r.modo === 'mergulho') {
      if (r.motivo === 'fim') {
        const i = trilha.fases.findIndex((f) => f.id === r.fase.id);
        const proxima = trilha.fases[i + 1];
        let sub;
        if (!proxima) sub = 'Você tocou o fundo desta trilha. Lá embaixo é silencioso, e o silêncio é de respeito.';
        else if (r.bonus && r.bonus.primeiraVez) sub = `${proxima.nome} liberado. A água fica mais escura, mas você também chega mais preparado.`;
        else sub = 'Mais uma volta pela fase para fixar o conteúdo. É assim que se ganha fôlego.';
        return { titulo: 'Fase completa!', sub };
      }
      if (r.motivo === 'sem-oxigenio') {
        return { titulo: 'Acabou o oxigênio', sub: 'Faz parte. Suba, respire, confira o que revisar e volte mais forte.' };
      }
      return { titulo: 'Mergulho interrompido', sub: 'O que você respondeu ficou salvo. A água continua aqui.' };
    }
    if (r.modo === 'simulado') {
      if (r.nota === null) return { titulo: 'Simulado interrompido', sub: 'Sem nota desta vez, mas suas respostas contam para a revisão.' };
      const nota = r.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 });
      let sub;
      if (r.nota >= 9) sub = 'Nível prova de fogo. Mandou muito bem.';
      else if (r.nota >= 7) sub = 'Bom resultado! Dá pra lapidar os temas mais fracos abaixo.';
      else if (r.nota >= 5) sub = 'Na média. O desempenho por tema mostra onde vale mergulhar.';
      else sub = 'Ainda está raso, e tudo bem: simulado existe exatamente pra isso.';
      if (r.motivo === 'tempo') sub = 'O tempo acabou. ' + sub;
      return { titulo: `Nota ${nota}`, sub };
    }
    const restam = Progresso.paraRevisar(estado.prog, trilha).length;
    return {
      titulo: 'Revisão concluída',
      sub: restam ? `Ainda ${restam === 1 ? 'resta 1 questão' : `restam ${restam} questões`} na sua lista de revisão.` : 'Lista de revisão zerada. Nada ficou pra trás.',
    };
  }

  function renderizarResumo(r, novasConquistas) {
    const { trilha, prog } = estado;
    const { titulo, sub } = textosResumo(r);

    $('resumo-rotulo').textContent = r.fase ? `${NOMES_MODO[r.modo]} · ${r.fase.nome}` : NOMES_MODO[r.modo];
    $('resumo-titulo').textContent = titulo;
    $('resumo-subtitulo').textContent = sub;
    humorMascote($('tela-resumo'), r.pct >= 60 || r.faseConcluida ? 'feliz' : null);

    const estrelas = $('resumo-estrelas');
    estrelas.hidden = !r.faseConcluida;
    limpar(estrelas).setAttribute('aria-label', `${r.estrelas} de 3 estrelas`);
    estrelas.setAttribute('role', 'img');
    [1, 2, 3].forEach((k) => estrelas.append(icone('i-estrela', r.estrelas >= k ? 'ativa' : '')));

    $('rs-acertos').textContent = `${r.acertos}/${r.total}`;
    $('rs-tempo').textContent = formatarTempo(r.tempoSeg);
    $('rs-xp').textContent = `+${r.xp}`;
    $('rs-perolas').textContent = `+${r.perolas}`;

    // Selos: nível novo, conquistas, bônus
    const extras = limpar($('resumo-extras'));
    const selo = (nomeIcone, ...conteudo) => extras.append(h('div', { class: 'selo' }, icone(nomeIcone), h('span', {}, ...conteudo)));
    if (estado.subiuNivel) selo('i-estrela', 'Subiu para o ', h('strong', { text: `nível ${estado.subiuNivel.numero}: ${estado.subiuNivel.nome}` }));
    novasConquistas.forEach((c) => selo(c.icone, 'Conquista: ', h('strong', { text: c.nome })));
    if (r.bonus && (r.bonus.xp || r.bonus.perolas)) {
      selo('i-perola', `Bônus da fase: +${r.bonus.xp} XP e +${r.bonus.perolas} pérolas`, r.estrelas === 3 ? ' (fôlego de sobra!)' : '');
    }
    if (r.maiorCombo >= 3) selo('i-raio', `Maior sequência: ${r.maiorCombo} acertos seguidos`);
    if (r.emBranco) selo('i-relogio', `${plural(r.emBranco, 'questão ficou', 'questões ficaram')} em branco`);

    // Desempenho por tema
    const temas = limpar($('resumo-temas'));
    r.porTema.forEach((t) => {
      const pct = Math.round((t.acertos / t.total) * 100);
      temas.append(h('li', {},
        h('div', { class: 'tema__linha' }, h('span', { text: t.tema }), h('strong', { text: `${t.acertos}/${t.total} · ${pct}%` })),
        h('div', { class: 'tema__barra', 'aria-hidden': 'true' }, h('div', { style: `width:${pct}%` }))));
    });

    // O que revisar
    const revisar = limpar($('resumo-revisar'));
    if (!r.paraRevisar.length) {
      revisar.append(h('p', { class: 'vazio-texto', text: r.total ? 'Nada pra revisar. Mergulho limpo!' : 'Nenhuma questão respondida.' }));
    }
    r.paraRevisar.forEach(({ questao: q, escolhida }) => {
      revisar.append(h('details', { class: 'revisar-item' },
        h('summary', { text: q.enunciado }),
        h('div', { class: 'revisar-item__corpo' },
          h('span', { class: 'rotulo', text: q.tema }),
          h('p', { class: 'revisar-item__sua', text: escolhida === null ? 'Você deixou em branco.' : `Sua resposta: ${q.alternativas[escolhida]}` }),
          h('p', { class: 'revisar-item__certa', text: `Resposta certa: ${q.alternativas[q.correta]}` }),
          h('p', { class: 'revisar-item__explicacao', text: q.explicacao }))));
    });

    // Botões de ação
    const principal = $('btn-resumo-principal');
    principal.hidden = false;
    principal.onclick = null;
    if (r.modo === 'mergulho') {
      const i = trilha.fases.findIndex((f) => f.id === r.fase.id);
      const proxima = trilha.fases[i + 1];
      if (r.faseConcluida && proxima) {
        principal.textContent = `Descer para ${proxima.nome}`;
        principal.onclick = () => iniciarSessao('mergulho', { faseId: proxima.id });
      } else {
        principal.textContent = r.faseConcluida ? 'Refazer fase' : 'Tentar de novo';
        principal.onclick = () => iniciarSessao('mergulho', { faseId: r.fase.id });
      }
    } else if (r.modo === 'simulado') {
      principal.textContent = 'Novo simulado';
      principal.onclick = () => iniciarSessao('simulado', { quantidade: r.total });
    } else {
      principal.textContent = 'Revisar de novo';
      principal.onclick = () => iniciarSessao('revisao');
    }
    const qtdRevisao = Progresso.paraRevisar(prog, trilha).length;
    $('btn-resumo-revisar').hidden = qtdRevisao === 0;
    if (r.modo === 'revisao') principal.hidden = qtdRevisao === 0;
  }

  /* =========================================================
     EVENTOS
     ========================================================= */
  function ligarEventos() {
    $('lista-trilhas').addEventListener('keydown', teclasTrilhas);
    $('btn-bora').addEventListener('click', () => estado.selecionada && abrirTrilha(estado.selecionada));
    $('input-importar').addEventListener('change', importarTrilhas);

    $('btn-trocar-trilha').addEventListener('click', () => {
      renderizarTrilhas();
      mostrarTela('tela-inicio');
    });
    $('select-meta').addEventListener('change', (e) => {
      estado.prog.metaDiaria = Number(e.target.value);
      avisarConquistas(Conquistas.verificar(estado.prog, estado.trilha));
      salvar();
      renderizarStatus();
      renderizarConquistas();
    });
    $('btn-simulado').addEventListener('click', () => {
      iniciarSessao('simulado', { quantidade: Number($('select-simulado').value) });
    });
    $('btn-revisao').addEventListener('click', () => iniciarSessao('revisao'));
    $('btn-zerar').addEventListener('click', () => {
      if (!window.confirm(`Zerar todo o progresso de "${estado.trilha.nome}"? XP, pérolas, fases e conquistas desta trilha voltam ao zero.`)) return;
      Progresso.zerar(estado.trilha.id);
      estado.prog = Progresso.carregar(estado.trilha.id);
      renderizarPainel();
      toast('Pronto', 'Progresso zerado. Mergulho novo!', 'i-bolha');
    });

    $('btn-sair-quiz').addEventListener('click', sairDoQuiz);
    $('btn-continuar').addEventListener('click', continuar);
    $('btn-marcar').addEventListener('click', () => {
      const q = Quiz.atual(estado.sessao);
      const marcada = Progresso.alternarMarcada(estado.prog, q.id);
      salvar();
      atualizarBotaoMarcar();
      toast(marcada ? 'Marcada' : 'Desmarcada', marcada ? 'Essa volta no modo Revisão.' : 'Saiu da lista de revisão.', 'i-marcador');
    });

    $('btn-resumo-revisar').addEventListener('click', () => iniciarSessao('revisao'));
    $('btn-resumo-mapa').addEventListener('click', () => {
      estado.sessao = null;
      renderizarPainel();
      mostrarTela('tela-painel');
    });

    // Atalhos no quiz: 1–6 ou A–F escolhem a alternativa
    document.addEventListener('keydown', (e) => {
      if ($('tela-quiz').hidden || estado.respondida || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      const tecla = e.key.toUpperCase();
      let i = '123456'.indexOf(tecla);
      if (i < 0) i = LETRAS.indexOf(tecla);
      const q = estado.sessao && Quiz.atual(estado.sessao);
      if (q && i >= 0 && i < q.alternativas.length) {
        e.preventDefault();
        responder(estado.ordem[i]); // posição na tela -> índice original
      }
    });
  }

  /* ---------- Início ---------- */
  montarMascotes();
  criarBolhas();
  ligarEventos();
  carregarTrilhas();
})();

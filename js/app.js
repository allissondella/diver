/*
 * app.js — telas, navegação (barra lateral) e renderização do Diver.
 * As regras ficam em quiz.js, progresso.js, economia.js e conquistas.js;
 * os jogos em js/jogos/; as áreas em organizar.js, biblioteca.js e perfil.js.
 * Aqui é a "cara" do app e a cola entre as partes.
 */
const App = (() => {
  const { $, h, icone, limpar, embaralhar, sortear, formatarTempo, plural, toast, avisarConquistas, humorMascote, movimentoReduzido } = UI;

  /* ---------- Estado da aplicação ---------- */
  const estado = {
    trilhas: [],
    selecionada: null, // id da trilha marcada na tela inicial
    trilha: null, // trilha atual (escolhida na tela inicial ou na barra lateral)
    prog: null, // progresso da trilha atual
    secao: 'inicio', // área aberta na barra lateral
    sessao: null, // sessão de quiz em andamento (Mergulho, Simulado, Revisão)
    origem: 'mergulho', // área para onde voltar depois do quiz
    jogo: null, // partida da Sala de Jogos em andamento
    respondida: false, // a questão atual já foi respondida?
    ordem: [], // ordem embaralhada das alternativas da questão atual
    timer: null,
    avisouUltimoMinuto: false,
    cartasCache: {}, // cartas derivadas por trilha
  };

  const NOMES_MODO = { mergulho: 'Mergulho', simulado: 'Simulado', revisao: 'Revisão', prova: 'Prova final', enviada: 'Prova enviada' };
  const NOMES_DIFICULDADE = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
  const LETRAS = 'ABCDEF';
  const MSGS_ERRO = [
    'Quase! Essa foi por pouco.',
    'Não foi dessa vez.',
    'Essa correnteza te pegou.',
    'Errar faz parte do mergulho.',
  ];
  const CHAVE_DESAFIOS = 'diver:v1:desafios';

  /* =========================================================
     NAVEGAÇÃO (barra lateral + endereço #secao)
     ========================================================= */
  const ROTAS = {
    inicio: { tela: 'tela-inicio', render: renderizarInicio },
    mergulho: { tela: 'tela-painel', precisaTrilha: true, render: renderizarPainel },
    simulado: { tela: 'tela-simulado', precisaTrilha: true, render: renderizarSimulado },
    revisao: { tela: 'tela-revisao', precisaTrilha: true, render: renderizarRevisao },
    jogos: { tela: 'tela-jogos', precisaTrilha: true, render: renderizarSala },
    tarefas: { tela: 'tela-tarefas', render: () => Quadros.render($('tela-tarefas')) },
    calendario: { tela: 'tela-calendario', render: () => Organizar.renderCalendario($('tela-calendario')) },
    foco: { tela: 'tela-foco', render: () => Organizar.renderFoco($('tela-foco')) },
    cursos: { tela: 'tela-cursos', render: () => Biblioteca.renderCursos($('tela-cursos')) },
    pdfs: { tela: 'tela-pdfs', render: () => Biblioteca.renderPdfs($('tela-pdfs')) },
    perfil: { tela: 'tela-perfil', render: () => Perfil.render($('tela-perfil')) },
    prova: { tela: 'tela-prova', precisaTrilha: true, render: renderizarProva },
    'upload-prova': { tela: 'tela-upload-prova', precisaTrilha: true, render: () => ProvasEnviadas.renderUpload($('tela-upload-prova')) },
    admin: { tela: 'tela-admin', soEquipe: true, render: () => Admin.render($('tela-admin')) },
  };
  const TELAS_FOCO = ['tela-quiz', 'tela-jogo']; // sem barra lateral: uma ação principal por tela

  /** Vai para uma área (atualiza o endereço, o que permite usar o botão Voltar do navegador). */
  function irPara(secao) {
    if (location.hash === '#' + secao) navegar(secao);
    else location.hash = secao;
  }

  function navegar(secao) {
    const rota = ROTAS[secao];
    if (!rota) return;
    // Saindo no meio de um quiz ou jogo pelo botão Voltar do navegador
    if (emAndamento() && !window.confirm('Sair agora? O que você já respondeu fica salvo, mas a partida termina.')) {
      history.replaceState(null, '', '#' + estado.secao);
      return;
    }
    abandonarAndamento();
    if (rota.soEquipe && !Nuvem.ehAdmin() && !Nuvem.ehProfessor()) {
      secao = 'inicio';
      history.replaceState(null, '', '#inicio');
    }
    if (ROTAS[secao].precisaTrilha && !estado.trilha) {
      toast('Escolha uma trilha', 'Primeiro escolha o que estudar.', 'i-livro');
      secao = 'inicio';
      history.replaceState(null, '', '#inicio');
    }
    estado.secao = secao;
    ROTAS[secao].render();
    mostrarTela(ROTAS[secao].tela);
  }

  function emAndamento() {
    const quiz = estado.sessao && !estado.sessao.encerrada && !$('tela-quiz').hidden;
    const jogo = estado.jogo && !estado.jogo.fim && !$('tela-jogo').hidden;
    return quiz || jogo;
  }

  function abandonarAndamento() {
    if (estado.sessao && !estado.sessao.encerrada && !$('tela-quiz').hidden) {
      if (estado.sessao.respostas.length) {
        Quiz.finalizar(estado.sessao, estado.prog, 'saiu');
        salvar();
      }
      pararTimer();
    }
    estado.sessao = null;
    if (estado.jogo && !estado.jogo.fim) {
      const c = estado.jogo.controlador;
      if (c && c.destruir) c.destruir();
    }
    estado.jogo = null;
  }

  function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach((t) => (t.hidden = t.id !== id));
    document.body.classList.toggle('modo-foco', TELAS_FOCO.includes(id));
    document.querySelectorAll('.lateral__nav a').forEach((a) => {
      if (a.dataset.secao === estado.secao) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    fecharMenu();
    atualizarLateral();
    window.scrollTo(0, 0);
    // Move o foco para o título da tela (bom para leitores de tela)
    const titulo = $(id).querySelector('h1[tabindex], h2[tabindex]');
    if (titulo) titulo.focus({ preventScroll: true });
  }

  /* ---------- Barra lateral (fixa no computador, gaveta no celular) ---------- */
  function abrirMenu() {
    $('barra-lateral').classList.add('lateral--aberta');
    $('lateral-fundo').hidden = false;
    $('btn-menu').setAttribute('aria-expanded', 'true');
    $('barra-lateral').querySelector('.lateral__nav a[aria-current]') ? $('barra-lateral').querySelector('.lateral__nav a[aria-current]').focus() : $('btn-fechar-menu').focus();
  }

  function fecharMenu() {
    const aberta = $('barra-lateral').classList.contains('lateral--aberta');
    $('barra-lateral').classList.remove('lateral--aberta');
    $('lateral-fundo').hidden = true;
    $('btn-menu').setAttribute('aria-expanded', 'false');
    if (aberta && document.activeElement && $('barra-lateral').contains(document.activeElement)) $('btn-menu').focus();
  }

  function atualizarLateral() {
    const select = limpar($('select-trilha-lateral'));
    if (!estado.trilhas.length) select.append(h('option', { value: '', text: 'Nenhuma trilha' }));
    estado.trilhas.forEach((t) => select.append(h('option', { value: t.id, selected: estado.trilha && t.id === estado.trilha.id, text: t.nome })));

    atualizarConta();
    const status = limpar($('lateral-status'));
    $('topo-perolas').replaceChildren();
    if (!estado.trilha) return;
    const prog = estado.prog;
    const nivel = Progresso.nivel(prog.xp);
    const streak = Progresso.streakVigente(prog);
    status.append(
      h('div', { class: 'lateral__nivel' }, h('span', { class: 'status__nivel-num', text: `Nv. ${nivel.numero}` }), h('span', { text: nivel.nome })),
      h('div', { class: 'barra-xp barra-xp--fina', 'aria-hidden': 'true' }, h('div', { class: 'barra-xp__preenchimento', style: `width:${nivel.pct}%` })),
      h('div', { class: 'lateral__numeros' },
        h('span', { title: 'Pérolas' }, icone('i-perola', 'icone--perola'), String(prog.perolas)),
        h('span', { title: 'Dias seguidos' }, icone('i-onda', 'icone--streak'), String(streak)),
        h('span', { title: 'Meta de hoje' }, icone('i-alvo', 'icone--meta'), `${Math.min(Progresso.respondidasHoje(prog), prog.metaDiaria)}/${prog.metaDiaria}`)));
    $('topo-perolas').append(icone('i-perola', 'icone--perola'), String(prog.perolas));
    $('topo-perolas').setAttribute('aria-label', `${prog.perolas} pérolas`);

    const qtd = Progresso.paraRevisar(prog, estado.trilha).length;
    $('badge-revisao').hidden = qtd === 0;
    $('badge-revisao').textContent = String(qtd);
    $('badge-foco').hidden = !Organizar.focoAtivo();
  }

  /** Cartão da pessoa logada (nome, tipo de conta, status da nuvem, Sair). No modo local, some. */
  function atualizarConta() {
    const area = limpar($('lateral-conta'));
    const perfil = Nuvem.perfil();
    // Admin: "Pessoas e cursos" (cadastra e gerencia). Professor: "Meus alunos" (só acompanha).
    const equipe = Nuvem.ehAdmin() || Nuvem.ehProfessor();
    document.querySelectorAll('[data-so-equipe]').forEach((el) => (el.hidden = !equipe));
    if (equipe) {
      $('lateral-grupo-equipe').textContent = Nuvem.ehAdmin() ? 'Admin' : 'Professor';
      $('lateral-link-equipe-texto').textContent = Nuvem.ehAdmin() ? 'Pessoas e cursos' : 'Meus alunos';
    }
    document.querySelectorAll('[data-so-gestao]').forEach((el) => (el.hidden = !podeGerenciar()));
    area.hidden = !perfil;
    if (!perfil) return;
    const status = { ok: 'Progresso salvo na nuvem', salvando: 'Salvando…', erro: 'Sem conexão: tentando de novo' }[Nuvem.Sincronia.status()];
    area.append(
      h('span', { class: 'pessoa__avatar pessoa__avatar--mini', 'aria-hidden': 'true', text: perfil.nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() }),
      h('div', { class: 'lateral__conta-info' },
        h('strong', { text: perfil.nome.split(' ')[0] }, Nuvem.ehAdmin() ? h('span', { class: 'chip chip--aviso chip--mini', text: 'Admin' }) : Nuvem.ehProfessor() ? h('span', { class: 'chip chip--mini', text: 'Professor' }) : null),
        h('span', { class: `lateral__nuvem lateral__nuvem--${Nuvem.Sincronia.status()}`, text: status })),
      h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: () => Conta.sair() }, 'Sair'));
  }

  /** Pode importar/criar trilhas? No modo local, sempre; com login, só o admin. */
  function podeGerenciar() {
    return !Nuvem.ativa || Nuvem.ehAdmin();
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

  /* =========================================================
     TRILHAS
     ========================================================= */
  async function carregarTrilhas() {
    const resultado = await Trilhas.carregarTodas();
    const { problemas, semServidor } = resultado;
    // Com login: o admin vê tudo; aluno e professor veem só os cursos atribuídos a eles
    const trilhas = Nuvem.ativa && !Nuvem.ehAdmin()
      ? resultado.trilhas.filter((t) => Nuvem.matriculas().includes(t.id))
      : resultado.trilhas;
    estado.trilhas = trilhas;
    estado.cartasCache = {};
    const ultima = Progresso.ultimaTrilha();
    const atualId = estado.trilha && trilhas.some((t) => t.id === estado.trilha.id) ? estado.trilha.id : null;
    const escolhida = atualId || (trilhas.some((t) => t.id === ultima) ? ultima : trilhas[0] && trilhas[0].id);
    if (escolhida) definirTrilha(escolhida, false);
    else {
      estado.trilha = null;
      estado.prog = null;
    }
    estado.selecionada = escolhida || null;
    renderizarTrilhas();
    renderizarAvisos(problemas, semServidor && trilhas.length === 0);
  }

  /** Define a trilha atual (sem trocar de tela). */
  function definirTrilha(id, lembrar = true) {
    const trilha = estado.trilhas.find((t) => t.id === id);
    if (!trilha) return;
    estado.trilha = trilha;
    estado.prog = Progresso.carregar(id);
    estado.selecionada = id;
    if (lembrar) Progresso.definirUltimaTrilha(id);
    atualizarLateral();
  }

  function cartasDa(trilha) {
    if (!estado.cartasCache[trilha.id]) estado.cartasCache[trilha.id] = Cartas.derivar(trilha);
    return estado.cartasCache[trilha.id];
  }

  function salvar() {
    Progresso.salvar(estado.trilha.id, estado.prog);
  }

  /* =========================================================
     INÍCIO (escolha de trilha + Seu dia)
     ========================================================= */
  function renderizarInicio() {
    renderizarTrilhas();
    renderizarHoje();
  }

  function renderizarTrilhas() {
    const lista = limpar($('lista-trilhas'));
    if (!estado.trilhas.length) {
      lista.append(Nuvem.ativa && !Nuvem.ehAdmin()
        ? UI.vazio('Seu acesso está pronto, mas nenhum curso foi atribuído a você ainda. Fale com quem te convidou para o Diver.')
        : h('p', { class: 'carregando', text: 'Nenhuma trilha por aqui ainda.' }));
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
    renderizarHoje();
    if (erros.length) renderizarAvisos(erros, false);
    e.target.value = '';
  }

  /* ---------- Desafio do Dia: jogo + trilha sorteados pela data (funciona offline) ---------- */
  function desafioDoDia() {
    const hoje = UI.dataLocal();
    const opcoes = [];
    [...estado.trilhas].sort((a, b) => a.id.localeCompare(b.id)).forEach((t) => {
      Jogos.lista()
        .filter((j) => !j.nucleo && !j.emBreve && Jogos.estado(j, cartasDa(t)) === 'disponivel')
        .forEach((j) => opcoes.push({ trilha: t, jogo: j }));
    });
    if (!opcoes.length) return null;
    // "semente" da data: o mesmo desafio o dia todo, outro amanhã
    let semente = 0;
    for (const c of hoje) semente = (semente * 31 + c.charCodeAt(0)) >>> 0;
    const feito = !!Dados.ler(CHAVE_DESAFIOS, {})[hoje];
    return { ...opcoes[semente % opcoes.length], feito, data: hoje };
  }

  function renderizarHoje() {
    const area = limpar($('hoje'));
    if (!estado.trilhas.length) return;
    const desafio = desafioDoDia();
    const { tarefas, eventos } = Organizar.resumoDoDia();
    const prog = estado.prog;
    const feitas = prog ? Math.min(Progresso.respondidasHoje(prog), prog.metaDiaria) : 0;

    area.append(h('h2', { class: 'secao-titulo', text: 'Seu dia' }), h('div', { class: 'hoje__grade' },
      desafio ? h('article', { class: `cartao hoje__card hoje__card--desafio ${desafio.feito ? 'hoje__card--feito' : ''}` },
        h('span', { class: 'rotulo', text: 'Desafio do Dia' }),
        h('h3', { class: 'hoje__titulo' }, icone(desafio.jogo.icone), desafio.jogo.nome),
        h('p', { class: 'texto-suave', text: `${desafio.trilha.nome} · XP em dobro` }),
        desafio.feito
          ? h('p', { class: 'texto-sucesso' }, icone('i-check'), 'Desafio cumprido! Amanhã tem outro.')
          : h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => {
            definirTrilha(desafio.trilha.id);
            estado.secao = 'jogos';
            history.replaceState(null, '', '#jogos');
            iniciarJogo(desafio.jogo.id, {}, { desafio: true });
          } }, 'Aceitar desafio')) : null,
      prog ? h('article', { class: 'cartao hoje__card' },
        h('span', { class: 'rotulo', text: 'Meta de hoje' }),
        h('h3', { class: 'hoje__titulo' }, icone('i-alvo', 'icone--meta'), `${feitas}/${prog.metaDiaria} questões`),
        h('div', { class: 'barra-meta', 'aria-hidden': 'true' }, h('div', { class: 'barra-meta__preenchimento', style: `width:${Math.round((feitas / prog.metaDiaria) * 100)}%` })),
        h('p', { class: 'texto-suave', text: feitas >= prog.metaDiaria ? 'Meta batida. O resto é lucro!' : `${Progresso.streakVigente(prog)} ${Progresso.streakVigente(prog) === 1 ? 'dia seguido' : 'dias seguidos'} em ${estado.trilha.nome}.` })) : null,
      h('article', { class: 'cartao hoje__card' },
        h('span', { class: 'rotulo', text: 'Tarefas para hoje' }),
        tarefas.length
          ? h('ul', { class: 'hoje__lista' }, tarefas.slice(0, 3).map((t) => h('li', {}, h('span', { class: t.prazo < UI.dataLocal() ? 'texto-erro' : '', text: t.prazo < UI.dataLocal() ? 'Atrasada · ' : '' }), t.titulo)))
          : h('p', { class: 'texto-suave', text: 'Nada com prazo pra hoje. Maré calma.' }),
        h('a', { class: 'botao botao--link botao--pequeno', href: '#tarefas' }, 'Ver tarefas', icone('i-seta-dir'))),
      h('article', { class: 'cartao hoje__card' },
        h('span', { class: 'rotulo', text: 'Próximos 3 dias' }),
        eventos.length
          ? h('ul', { class: 'hoje__lista' }, eventos.slice(0, 3).map((e) => h('li', {}, h('span', { class: `ponto ponto--${e.tipo}`, 'aria-hidden': 'true' }), `${UI.formatarData(e.data, { weekday: 'short', day: '2-digit' })}${e.hora ? ' ' + e.hora : ''} · ${e.titulo}`)))
          : h('p', { class: 'texto-suave', text: 'Agenda livre. Que tal gerar um cronograma?' }),
        h('a', { class: 'botao botao--link botao--pequeno', href: '#calendario' }, 'Abrir calendário', icone('i-seta-dir')))));
  }

  /* =========================================================
     MERGULHO: PAINEL DA TRILHA
     ========================================================= */
  function abrirTrilha(id) {
    definirTrilha(id);
    irPara('mergulho');
  }

  function renderizarPainel() {
    const { trilha } = estado;
    $('painel-titulo').textContent = trilha.nome;
    $('painel-categoria').textContent = trilha.categoria || 'Trilha';
    renderizarStatus();
    renderizarMapa();
    renderizarConquistas();
    const qtd = Progresso.paraRevisar(estado.prog, trilha).length;
    $('atalho-revisao').textContent = qtd ? plural(qtd, 'questão esperando', 'questões esperando') : 'Nada pendente';
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
    $('mapa-sub').textContent = trilha.fasesLivres
      ? 'Todas as fases estão abertas: escolha o tema que quer estudar. A ordem do mapa é só uma sugestão.'
      : 'Complete uma profundidade para liberar a próxima. Quanto mais fundo, mais pérolas.';

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

      // "Antes de mergulhar": leitura curta da fase (opcional no JSON). Fica aberta mesmo com a fase bloqueada.
      const estudo = fase.resumo
        ? h('button', { type: 'button', class: 'fase__estudo', onclick: () => abrirResumo(fase, liberada) },
          icone('i-livro'), `Antes de mergulhar: ${fase.nome}`)
        : null;
      mapa.append(h('li', {}, botao, estudo));
    });
  }

  /* ---------- "Antes de mergulhar": pontos-chave, tabela e pérolas da fase ---------- */
  /** Texto com **negrito** vira nós (nunca HTML). */
  function comNegrito(texto) {
    return String(texto).split(/(\*\*[^*]+\*\*)/).filter(Boolean)
      .map((parte) => (parte.startsWith('**') && parte.endsWith('**') ? h('strong', { text: parte.slice(2, -2) }) : parte));
  }

  function abrirResumo(fase, liberada) {
    const r = fase.resumo || {};
    let dialogo = $('dialogo-resumo');
    if (!dialogo) {
      dialogo = h('dialog', { id: 'dialogo-resumo', class: 'dialogo', 'aria-labelledby': 'dialogo-resumo-titulo' });
      dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); }); // clique fora fecha
      window.addEventListener('hashchange', () => dialogo.open && dialogo.close()); // Voltar do navegador fecha
      document.body.append(dialogo);
    }
    const tabela = r.tabela && Array.isArray(r.tabela.colunas) && Array.isArray(r.tabela.linhas) ? r.tabela : null;
    limpar(dialogo).append(h('div', { class: 'dialogo__caixa' },
      h('header', { class: 'dialogo__topo' },
        h('div', {},
          h('span', { class: 'rotulo', text: 'Antes de mergulhar' }),
          h('h2', { id: 'dialogo-resumo-titulo', class: 'dialogo__titulo', text: fase.nome })),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar', onclick: () => dialogo.close() }, icone('i-x'))),
      h('div', { class: 'dialogo__corpo' },
        r.introducao ? h('p', { class: 'resumo__intro' }, comNegrito(r.introducao)) : null,
        Array.isArray(r.pontos) && r.pontos.length
          ? h('section', {}, h('h3', { class: 'resumo__titulo' }, icone('i-alvo'), 'Pontos-chave'),
            h('ul', { class: 'resumo__lista' }, r.pontos.map((p) => h('li', {}, comNegrito(p)))))
          : null,
        tabela
          ? h('section', {}, h('h3', { class: 'resumo__titulo' }, icone('i-colunas'), tabela.titulo || 'Diagnóstico diferencial'),
            h('div', { class: 'tabela-rolagem', tabindex: '0', role: 'region', 'aria-label': tabela.titulo || 'Tabela' },
              h('table', { class: 'tabela tabela--resumo' },
                h('thead', {}, h('tr', {}, tabela.colunas.map((c) => h('th', { scope: 'col', text: c })))),
                h('tbody', {}, tabela.linhas.map((linha) => h('tr', {}, linha.map((c, k) => (k === 0 ? h('th', { scope: 'row' }, comNegrito(c)) : h('td', {}, comNegrito(c))))))))))
          : null,
        Array.isArray(r.perolas) && r.perolas.length
          ? h('section', { class: 'resumo__perolas' }, h('h3', { class: 'resumo__titulo' }, icone('i-perola'), 'Pérolas e pegadinhas'),
            h('ul', { class: 'resumo__lista' }, r.perolas.map((p) => h('li', {}, comNegrito(p)))))
          : null),
      h('footer', { class: 'dialogo__rodape' },
        h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => dialogo.close() }, 'Fechar'),
        liberada
          ? h('button', { type: 'button', class: 'botao botao--primario', onclick: () => { dialogo.close(); iniciarSessao('mergulho', { faseId: fase.id }); } }, 'Bora mergulhar!')
          : h('span', { class: 'texto-suave resumo__bloqueio', text: 'Complete a fase anterior para mergulhar aqui.' }))));
    dialogo.showModal();
    dialogo.querySelector('.dialogo__corpo').scrollTop = 0;
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
     SIMULADO E REVISÃO (telas próprias)
     ========================================================= */
  function renderizarSimulado() {
    const { trilha, prog } = estado;
    $('simulado-trilha').textContent = trilha.nome;
    renderizarProvasEnviadas();

    // Opções de quantidade de questões
    const total = trilha.questoes.length;
    const select = limpar($('select-simulado'));
    const opcoes = [5, 10, 20].filter((n) => n < total);
    opcoes.forEach((n) => select.append(h('option', { value: n, text: String(n) })));
    select.append(h('option', { value: total, text: `Todas (${total})` }));
    select.value = opcoes.includes(10) ? '10' : String(total);

    // Histórico de notas
    const hist = limpar($('historico-simulados'));
    if (!prog.simulados.length) {
      hist.append(h('p', { class: 'texto-suave', text: 'Nenhum simulado ainda. O primeiro é sempre o mais importante: ele mostra de onde você parte.' }));
      return;
    }
    const media = prog.simulados.reduce((n, s) => n + s.nota, 0) / prog.simulados.length;
    hist.append(
      h('p', {}, 'Média: ', h('strong', { text: media.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }), ` em ${plural(prog.simulados.length, 'simulado', 'simulados')}.`),
      h('ul', {}, prog.simulados.slice(0, 10).map((s) =>
        h('li', {},
          h('span', { text: new Date(s.data).toLocaleDateString('pt-BR') + ` · ${s.acertos}/${s.total} · ${formatarTempo(s.tempoSeg)}` }),
          h('strong', { text: `Nota ${s.nota.toLocaleString('pt-BR')}` })))));
  }

  /** Provas enviadas (Upload de prova) aparecem no Simulado, logo abaixo de "Montar simulado". */
  function renderizarProvasEnviadas() {
    ProvasEnviadas.renderLista($('provas-enviadas'));
  }

  function renderizarRevisao() {
    const { trilha, prog } = estado;
    $('revisao-trilha').textContent = trilha.nome;
    const pendentes = Progresso.paraRevisar(prog, trilha);
    $('revisao-texto').textContent = pendentes.length
      ? `${plural(pendentes.length, 'questão esperando', 'questões esperando')} por você: as que você errou ou marcou. Mergulho de volta, sem pressão.`
      : 'Nada pra revisar por enquanto. As questões que você errar ou marcar aparecem aqui.';
    $('btn-revisao').disabled = pendentes.length === 0;

    const lista = limpar($('revisao-lista'));
    if (!pendentes.length) {
      lista.append(h('li', {}, UI.vazio('Lista limpa. Nada ficou pra trás.')));
      return;
    }
    pendentes
      .map((q) => ({ q, e: prog.questoes[q.id] }))
      .sort((a, b) => b.e.peso - a.e.peso)
      .forEach(({ q, e }) => {
        lista.append(h('li', { class: 'item-revisao' },
          h('div', { class: 'item-revisao__texto' },
            h('span', { class: 'rotulo', text: q.tema }),
            h('strong', { text: q.enunciado }),
            h('span', { class: 'texto-suave', text: [e.erros ? plural(e.erros, 'erro', 'erros') : null, e.marcada ? 'marcada por você' : null].filter(Boolean).join(' · ') })),
          h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: () => {
            e.peso = 0;
            e.marcada = false;
            salvar();
            renderizarRevisao();
            atualizarLateral();
          } }, 'Tirar da fila')));
      });
  }

  /* =========================================================
     PROVA FINAL
     Regras no bloco opcional "prova" da trilha: { questoes, minutos, aprovacao, exigeFases }
     ========================================================= */
  function configProva(trilha) {
    const c = trilha.prova || {};
    const quantidade = Math.min(c.questoes || 40, trilha.questoes.length);
    return {
      quantidade,
      minutos: c.minutos || Math.ceil(quantidade * 1.5),
      aprovacao: c.aprovacao || 70,
      exigeFases: c.exigeFases !== false,
    };
  }

  function renderizarProva() {
    const { trilha, prog } = estado;
    const cfg = configProva(trilha);
    const concluidas = trilha.fases.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida);
    const fasesOk = concluidas.length === trilha.fases.length;
    const liberada = !cfg.exigeFases || fasesOk || Nuvem.ehAdmin() || Nuvem.ehProfessor();
    const provas = prog.provas || [];
    const aprovacao = provas.find((p) => p.aprovado);
    const area = limpar($('tela-prova'));

    area.append(...[
      UI.cabecalho(trilha.nome, 'Prova final', 'O último mergulho da trilha: sem dicas no meio do caminho, com cronômetro e nota mínima para aprovação.'),
      aprovacao ? h('div', { class: 'selo selo--grande' }, icone('i-trofeu'), h('span', {}, h('strong', { text: 'Aprovado! ' }), `Nota ${aprovacao.nota.toLocaleString('pt-BR')} em ${new Date(aprovacao.data).toLocaleDateString('pt-BR')}.`)) : null,
      h('div', { class: 'cartao prova' },
        h('h2', { class: 'cartao__titulo', text: 'Como funciona' }),
        h('ul', { class: 'prova__regras' },
          h('li', {}, icone('i-livro'), h('span', {}, h('strong', { text: `${cfg.quantidade} questões` }), ' sorteadas da trilha inteira')),
          h('li', {}, icone('i-relogio'), h('span', {}, h('strong', { text: `${cfg.minutos} minutos` }), ' no total; o que ficar em branco conta como erro')),
          h('li', {}, icone('i-alvo'), h('span', {}, h('strong', { text: `${cfg.aprovacao}% de acertos` }), ` para ser aprovado (${Math.ceil((cfg.aprovacao / 100) * cfg.quantidade)} de ${cfg.quantidade})`)),
          h('li', {}, icone('i-check'), h('span', { text: 'Correção só no final, com a explicação de cada erro' }))),
        cfg.exigeFases ? h('div', { class: 'prova__fases' },
          h('p', { class: 'rotulo-campo', text: `Pré-requisito: completar as ${trilha.fases.length} fases do Mergulho (${concluidas.length}/${trilha.fases.length})` }),
          h('ul', { class: 'prova__lista-fases' }, trilha.fases.map((f) => {
            const ok = prog.fases[f.id] && prog.fases[f.id].concluida;
            return h('li', { class: ok ? 'texto-sucesso' : 'texto-suave' }, icone(ok ? 'i-check' : 'i-cadeado'), f.nome);
          }))) : null,
        !fasesOk && cfg.exigeFases && (Nuvem.ehAdmin() || Nuvem.ehProfessor()) ? h('p', { class: 'jogo-card__dica', text: `Como ${Nuvem.ehAdmin() ? 'admin' : 'professor'}, você pode fazer a prova sem completar as fases (para conferir).` }) : null,
        liberada
          ? h('button', { type: 'button', class: 'botao botao--primario botao--grande', onclick: iniciarProva }, icone('i-trofeu'), provas.length ? 'Fazer a prova de novo' : 'Começar a prova')
          : h('a', { class: 'botao botao--secundario', href: '#mergulho' }, 'Voltar ao mapa e completar as fases')),
      h('div', { class: 'cartao' },
        h('h2', { class: 'cartao__titulo', text: 'Suas tentativas' }),
        provas.length
          ? h('div', { class: 'historico' }, h('ul', {}, provas.slice(0, 10).map((p) => h('li', {},
            h('span', { text: `${new Date(p.data).toLocaleDateString('pt-BR')} · ${p.acertos}/${p.total} (${p.pct}%) · ${formatarTempo(p.tempoSeg)}` }),
            h('strong', { class: p.aprovado ? 'texto-sucesso' : 'texto-erro', text: p.aprovado ? `Aprovado · ${p.nota.toLocaleString('pt-BR')}` : `Nota ${p.nota.toLocaleString('pt-BR')}` })))))
          : h('p', { class: 'texto-suave', text: 'Nenhuma tentativa ainda. Quando estiver pronto, é só começar.' }))].filter(Boolean));
  }

  function iniciarProva() {
    const cfg = configProva(estado.trilha);
    if (!window.confirm(`A prova tem ${cfg.quantidade} questões e ${cfg.minutos} minutos. O cronômetro começa assim que você confirmar. Bora?`)) return;
    iniciarSessao('prova', { quantidade: cfg.quantidade, minutos: cfg.minutos, aprovacao: cfg.aprovacao });
  }

  /* =========================================================
     SALA DE JOGOS
     ========================================================= */
  function renderizarSala() {
    const { trilha, prog } = estado;
    $('jogos-trilha').textContent = trilha.nome;
    const cartas = cartasDa(trilha);
    const area = limpar($('jogos-lista'));

    Jogos.GRUPOS.forEach((g) => {
      const jogos = Jogos.lista().filter((j) => j.grupo === g.id);
      if (!jogos.length) return;
      const grade = h('div', { class: 'sala' });
      jogos.forEach((j) => grade.append(cardJogo(j, Jogos.estado(j, cartas), prog)));
      area.append(h('section', { class: 'sala-grupo', 'aria-label': g.nome },
        h('h2', { class: 'secao-titulo', text: g.nome }), h('p', { class: 'secao-sub', text: g.descricao }), grade));
    });
  }

  function cardJogo(j, situacao, prog) {
    const hist = prog.jogos && prog.jogos[j.id];
    const selects = (j.opcoes || []).map((o) => h('label', { class: 'jogo-card__opcao' },
      h('span', { class: 'visualmente-oculto', text: `${o.rotulo} de ${j.nome}` }),
      h('select', { 'data-opcao': o.id }, o.valores.map(([v, n]) => h('option', { value: v, selected: v === o.padrao, text: n })))));
    const jogar = () => {
      if (j.nucleo) return irPara(j.nucleo);
      const opcoes = {};
      selects.forEach((l) => {
        const s = l.querySelector('select');
        opcoes[s.dataset.opcao] = Number(s.value);
      });
      iniciarJogo(j.id, opcoes);
    };
    const selo = {
      disponivel: null,
      precisa: h('span', { class: 'chip chip--aviso', text: 'Precisa de conteúdo' }),
      embreve: h('span', { class: 'chip', text: `Em breve · ${j.emBreve}` }),
    }[situacao];
    const dicaConteudo = situacao === 'precisa'
      ? h('p', { class: 'jogo-card__dica', text: `Esta trilha ainda não tem ${Object.keys(j.requer).map((t) => ({ pares: 'pares termo ↔ definição', adivinhas: 'adivinhas', sequencias: 'sequências', palavras: 'palavras-chave', flash: 'cartas', multipla: 'questões suficientes' }[t] || t)).join(' e ')}.` })
      : null;
    return h('article', { class: `jogo-card jogo-card--${situacao}` },
      h('div', { class: 'jogo-card__topo' },
        h('span', { class: 'jogo-card__icone', 'aria-hidden': 'true' }, icone(j.icone || 'i-controle')),
        h('div', {}, h('h3', { class: 'jogo-card__nome', text: j.nome }), h('span', { class: 'texto-suave', text: j.duracao }))),
      h('p', { class: 'jogo-card__descricao', text: j.descricao }),
      dicaConteudo,
      h('div', { class: 'jogo-card__rodape' },
        selo,
        hist ? h('span', { class: 'jogo-card__hist', text: hist.melhor ? `Recorde: ${hist.melhor}` : plural(hist.partidas, 'partida', 'partidas') }) : null,
        situacao === 'disponivel' ? selects : null,
        situacao === 'disponivel'
          ? h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: jogar, 'aria-label': `Jogar ${j.nome}` }, j.nucleo ? 'Abrir' : 'Jogar')
          : null));
  }

  function iniciarJogo(id, opcoes = {}, { desafio = false } = {}) {
    const def = Jogos.obter(id);
    if (!def || !estado.trilha) return;
    const cartas = cartasDa(estado.trilha);
    if (Jogos.estado(def, cartas) !== 'disponivel') {
      toast('Ainda não dá', 'Esta trilha não tem conteúdo para esse jogo.', 'i-bolha');
      return;
    }
    abandonarAndamento();
    estado.nivelInicial = Progresso.nivel(estado.prog.xp).numero;
    estado.subiuNivel = null;
    estado.jogo = { def, opcoes, desafio, controlador: null, fim: false };
    $('jogo-titulo').textContent = def.nome;
    $('jogo-rotulo').textContent = desafio ? 'Desafio do Dia · XP em dobro' : estado.trilha.nome;
    const container = limpar($('jogo-palco'));
    mostrarTela('tela-jogo');

    const partida = estado.jogo;
    const ctx = {
      container,
      trilha: estado.trilha,
      cartas,
      prog: estado.prog,
      opcoes,
      aoTerminar: (resultado) => {
        if (estado.jogo === partida) terminarJogo(resultado);
      },
      gastarPerolas: (n) => {
        const ok = Economia.gastar(estado.prog, n);
        if (ok) {
          salvar();
          atualizarLateral();
          toast('Pérola usada', `−${n} · saldo: ${estado.prog.perolas}`, 'i-perola');
        }
        return ok;
      },
    };
    try {
      partida.controlador = def.iniciar(ctx) || {};
    } catch (erro) {
      console.error(erro);
      toast('Ops', 'Esse jogo tropeçou. Tente outro enquanto a gente conserta.', 'i-x');
      estado.jogo = null;
      irPara('jogos');
    }
  }

  function terminarJogo(res) {
    const partida = estado.jogo;
    if (!partida || partida.fim) return;
    partida.fim = true;
    if (partida.controlador && partida.controlador.destruir) partida.controlador.destruir();

    const r = Economia.aplicarResultado(res, estado.trilha, estado.prog, { dobro: partida.desafio });
    if (partida.desafio) {
      const feitos = Dados.ler(CHAVE_DESAFIOS, {});
      feitos[UI.dataLocal()] = true;
      Dados.gravar(CHAVE_DESAFIOS, feitos);
    }
    salvar();
    avisarConquistas(r.novas);
    checarNivel();

    const validos = res.detalhes.filter((d) => !d.neutro);
    const temas = {};
    validos.forEach((d) => {
      temas[d.tema] = temas[d.tema] || { tema: d.tema, acertos: 0, total: 0 };
      temas[d.tema].total++;
      if (d.acertou) temas[d.tema].acertos++;
    });
    renderizarResumo({
      modo: 'jogo', jogo: partida.def, titulo: res.titulo, sub: res.subtitulo, desafio: partida.desafio,
      total: validos.length, acertos: res.acertos, pct: validos.length ? Math.round((res.acertos / validos.length) * 100) : 0,
      tempoSeg: res.tempoSegundos, porTema: Object.values(temas).sort((a, b) => a.acertos / a.total - b.acertos / b.total),
      paraRevisar: validos.filter((d) => !d.acertou),
      maiorCombo: r.comboMaximo, xp: r.xp, perolas: r.perolas, bonusJogo: res.bonus,
      emBranco: 0, faseConcluida: false, estrelas: 0, fase: null, nota: null,
    }, r.novas);
    mostrarTela('tela-resumo');
  }

  function sairDoJogo() {
    if (!estado.jogo) return;
    if (!window.confirm('Sair do jogo? Esta partida não vale XP.')) return;
    abandonarAndamento();
    irPara('jogos');
  }

  /* =========================================================
     SESSÃO DE ESTUDO (QUIZ) — Mergulho, Simulado e Revisão
     ========================================================= */
  function iniciarSessao(modo, opcoes = {}) {
    const s = Quiz.criar(modo, estado.trilha, estado.prog, opcoes);
    if (modo === 'enviada') s.provaRef = estado.ultimaProvaEnviada = opcoes.ref;
    if (!s.fila.length) {
      toast('Ops', modo === 'revisao' ? 'Não há questões para revisar.' : 'Essa fase ainda não tem questões.', 'i-bolha');
      return;
    }
    estado.sessao = s;
    estado.origem = modo === 'enviada' ? 'simulado' : modo; // volta para a área de onde saiu (mergulho, simulado ou revisao)
    estado.nivelInicial = Progresso.nivel(estado.prog.xp).numero;
    estado.subiuNivel = null;
    salvar();

    $('quiz-oxigenio').hidden = s.oxigenio === null;
    $('quiz-timer').hidden = s.limiteSeg === null;
    $('quiz-modo').textContent = s.fase ? `${NOMES_MODO[modo]} · ${s.fase.nome}` : s.titulo ? `${NOMES_MODO[modo]} · ${s.titulo}` : NOMES_MODO[modo];

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
    if (!s) return pararTimer();
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
    dif.hidden = s.modo === 'enviada'; // prova enviada não tem nível de dificuldade
    $('btn-marcar').hidden = s.modo === 'enviada'; // nem entra na Revisão (as questões não são da trilha)
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
    const botoes = [...document.querySelectorAll('#quiz-alternativas .alternativa')];
    botoes.forEach((b) => (b.disabled = true));

    // Conquistas e nível podem mudar a cada resposta
    const novas = Conquistas.verificar(estado.prog, estado.trilha);
    salvar();
    avisarConquistas(novas);
    checarNivel();

    // Simulado: sem feedback, segue direto para a próxima
    if (s.modo === 'simulado' || s.modo === 'prova' || s.modo === 'enviada') {
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
    const msg = s.modo === 'enviada'
      ? 'Sair da prova? Ela só vale nota e pontos quando é entregue até o fim.'
      : temRespostas
      ? 'Subir agora? O que você já respondeu fica salvo.'
      : 'Subir agora? Nada foi respondido ainda.';
    if (!window.confirm(msg)) return;
    if (temRespostas) encerrarSessao('saiu');
    else {
      pararTimer();
      estado.sessao = null;
      irPara(estado.origem);
    }
  }

  function encerrarSessao(motivo) {
    const s = estado.sessao;
    if (!s || s.encerrada) return;
    pararTimer();
    $('quiz-feedback').hidden = true;
    const resumo = Quiz.finalizar(s, estado.prog, motivo);
    if (s.modo === 'enviada' && motivo !== 'saiu') ProvasEnviadas.registrarTentativa(s.provaRef, resumo);
    checarNivel();
    const novas = Conquistas.verificar(estado.prog, estado.trilha);
    salvar();
    avisarConquistas(novas);
    renderizarResumo(resumo, novas);
    mostrarTela('tela-resumo');
  }

  /* =========================================================
     RESUMO DA SESSÃO (quiz e jogos)
     ========================================================= */
  function textosResumo(r) {
    const { trilha } = estado;
    if (r.modo === 'jogo') {
      return { titulo: r.titulo || `${r.acertos} de ${r.total} acertos`, sub: (r.desafio ? 'Desafio do Dia cumprido: XP em dobro! ' : '') + (r.sub || '') };
    }
    if (r.modo === 'mergulho') {
      if (r.motivo === 'fim') {
        const i = trilha.fases.findIndex((f) => f.id === r.fase.id);
        const proxima = trilha.fases[i + 1];
        let sub;
        if (!proxima) sub = 'Você tocou o fundo desta trilha. Lá embaixo é silencioso, e o silêncio é de respeito.';
        else if (r.bonus && r.bonus.primeiraVez && trilha.fasesLivres) sub = `Fase no bolso! Próxima parada sugerida: ${proxima.nome}. Ou escolha outra no mapa.`;
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
    if (r.modo === 'enviada') {
      if (r.nota === null) return { titulo: 'Prova interrompida', sub: 'Sem nota e sem pontos desta vez: a prova só vale quando é entregue.' };
      const nota = r.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 });
      let sub = r.nota >= 7 ? 'Mandou bem, Diver! Essa prova não te assusta mais.' : r.nota >= 5 ? 'Na média. Veja abaixo o que revisar e tente de novo.' : 'Prova antiga serve pra isso: mostrar onde mergulhar. Confira as correções abaixo.';
      if (r.motivo === 'tempo') sub = 'O tempo acabou. ' + sub;
      return { titulo: `Nota ${nota}`, sub: `${r.acertos} de ${r.total} acertos. ${sub}` };
    }
    if (r.modo === 'prova') {
      if (r.nota === null || r.nota === undefined) return { titulo: 'Prova interrompida', sub: 'Sem nota desta vez. Quando quiser, é só começar de novo.' };
      const nota = r.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 });
      const base = `Você acertou ${r.pct}% (mínimo para aprovação: ${r.aprovacao}%).`;
      return r.aprovado
        ? { titulo: `Aprovado! Nota ${nota}`, sub: `${base} Mandou bem, Diver: esse mergulho foi até o fundo.` }
        : { titulo: `Ainda não foi desta vez · Nota ${nota}`, sub: `${r.motivo === 'tempo' ? 'O tempo acabou. ' : ''}${base} Revise os temas mais fracos abaixo e tente de novo quando quiser.` };
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

    $('resumo-rotulo').textContent = r.modo === 'jogo'
      ? `${r.jogo.nome} · ${trilha.nome}`
      : r.fase ? `${NOMES_MODO[r.modo]} · ${r.fase.nome}` : r.titulo ? `${NOMES_MODO[r.modo]} · ${r.titulo}` : NOMES_MODO[r.modo];
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
    if (r.bonusJogo && (r.bonusJogo.xp || r.bonusJogo.perolas)) {
      selo('i-perola', `Bônus do jogo: +${Math.min(r.bonusJogo.xp || 0, Economia.CONFIG.bonusMaximo.xp)} XP e +${Math.min(r.bonusJogo.perolas || 0, Economia.CONFIG.bonusMaximo.perolas)} pérolas`,
        r.bonusJogo.motivo ? ` (${r.bonusJogo.motivo})` : '');
    }
    if (r.desafio) selo('i-raio', 'Desafio do Dia: XP em dobro');
    if (r.modo === 'enviada' && r.nota !== null && r.pontos && r.pontos.motivo) selo('i-alvo', r.pontos.motivo);
    if (r.maiorCombo >= 3) selo('i-raio', `Maior sequência: ${r.maiorCombo} acertos seguidos`);
    if (r.emBranco) selo('i-relogio', `${plural(r.emBranco, 'questão ficou', 'questões ficaram')} em branco`);

    // Desempenho por tema
    const temas = limpar($('resumo-temas'));
    if (!r.porTema.length) temas.append(h('li', { class: 'vazio-texto', text: 'Sem respostas para medir desta vez.' }));
    r.porTema.forEach((t) => {
      const pct = Math.round((t.acertos / t.total) * 100);
      temas.append(h('li', {},
        h('div', { class: 'tema__linha' }, h('span', { text: t.tema }), h('strong', { text: `${t.acertos}/${t.total} · ${pct}%` })),
        h('div', { class: 'tema__barra', 'aria-hidden': 'true' }, h('div', { style: `width:${pct}%` }))));
    });

    // O que revisar (questões do quiz ou detalhes dos jogos)
    const revisar = limpar($('resumo-revisar'));
    if (!r.paraRevisar.length) {
      revisar.append(h('p', { class: 'vazio-texto', text: r.total ? 'Nada pra revisar. Mergulho limpo!' : 'Nenhuma questão respondida.' }));
    }
    r.paraRevisar.forEach((item) => {
      const q = item.questao;
      const dados = q
        ? { pergunta: q.enunciado, tema: q.tema, sua: item.escolhida === null ? 'Você deixou em branco.' : `Sua resposta: ${q.alternativas[item.escolhida]}`, certa: q.alternativas[q.correta], explicacao: q.explicacao }
        : { pergunta: item.pergunta, tema: item.tema, sua: item.sua ? (item.sua.startsWith('Você') || item.sua.startsWith('O tempo') || item.sua.startsWith('A jangada') || item.sua.startsWith('Seu') || /\d de \d/.test(item.sua) ? item.sua : `Sua resposta: ${item.sua}`) : '', certa: item.resposta, explicacao: item.explicacao };
      revisar.append(h('details', { class: 'revisar-item' },
        h('summary', { text: dados.pergunta }),
        h('div', { class: 'revisar-item__corpo' },
          h('span', { class: 'rotulo', text: dados.tema }),
          dados.sua ? h('p', { class: 'revisar-item__sua', text: dados.sua }) : null,
          dados.certa ? h('p', { class: 'revisar-item__certa', text: `Resposta certa: ${dados.certa}` }) : null,
          dados.explicacao ? h('p', { class: 'revisar-item__explicacao', text: dados.explicacao }) : null)));
    });

    // Botões de ação
    const principal = $('btn-resumo-principal');
    const voltar = $('btn-resumo-mapa');
    principal.hidden = false;
    principal.onclick = null;
    if (r.modo === 'jogo') {
      principal.textContent = 'Jogar de novo';
      principal.onclick = () => iniciarJogo(r.jogo.id, estado.ultimoJogoOpcoes || {});
      voltar.textContent = 'Voltar à Sala de Jogos';
      voltar.onclick = () => irPara('jogos');
      estado.ultimoJogoOpcoes = estado.jogo ? estado.jogo.opcoes : {};
    } else if (r.modo === 'mergulho') {
      const i = trilha.fases.findIndex((f) => f.id === r.fase.id);
      const proxima = trilha.fases[i + 1];
      if (r.faseConcluida && proxima) {
        principal.textContent = `Descer para ${proxima.nome}`;
        principal.onclick = () => iniciarSessao('mergulho', { faseId: proxima.id });
      } else {
        principal.textContent = r.faseConcluida ? 'Refazer fase' : 'Tentar de novo';
        principal.onclick = () => iniciarSessao('mergulho', { faseId: r.fase.id });
      }
      voltar.textContent = 'Voltar ao mapa';
      voltar.onclick = () => irPara('mergulho');
    } else if (r.modo === 'prova') {
      principal.textContent = r.aprovado ? 'Ver a prova final' : 'Tentar a prova de novo';
      principal.onclick = () => (r.aprovado ? irPara('prova') : iniciarProva());
      voltar.textContent = 'Voltar ao mapa';
      voltar.onclick = () => irPara('mergulho');
    } else if (r.modo === 'enviada') {
      principal.textContent = 'Refazer a prova';
      principal.onclick = () => ProvasEnviadas.comecar(estado.ultimaProvaEnviada);
      voltar.textContent = 'Voltar ao simulado';
      voltar.onclick = () => irPara('simulado');
    } else if (r.modo === 'simulado') {
      principal.textContent = 'Novo simulado';
      principal.onclick = () => iniciarSessao('simulado', { quantidade: r.total });
      voltar.textContent = 'Voltar ao simulado';
      voltar.onclick = () => irPara('simulado');
    } else {
      principal.textContent = 'Revisar de novo';
      principal.onclick = () => iniciarSessao('revisao');
      voltar.textContent = 'Voltar à revisão';
      voltar.onclick = () => irPara('revisao');
    }
    const qtdRevisao = Progresso.paraRevisar(prog, trilha).length;
    $('btn-resumo-revisar').hidden = qtdRevisao === 0;
    if (r.modo === 'revisao') principal.hidden = qtdRevisao === 0;
  }

  /* =========================================================
     API para as áreas (organizar.js, biblioteca.js, perfil.js)
     ========================================================= */
  /** Concede XP/pérolas via Economia (tarefas, foco). trilhaId nulo = trilha atual. */
  function concederXP(trilhaId, valores, motivo) {
    const trilha = estado.trilhas.find((t) => t.id === trilhaId) || estado.trilha;
    if (!trilha) return;
    const atual = estado.trilha && trilha.id === estado.trilha.id;
    const prog = atual ? estado.prog : Progresso.carregar(trilha.id);
    const antes = Progresso.nivel(prog.xp).numero;
    const novas = Economia.conceder(prog, trilha, valores);
    Progresso.salvar(trilha.id, prog);
    toast(motivo, `+${valores.xp} XP · +${valores.perolas} ${valores.perolas === 1 ? 'pérola' : 'pérolas'} em ${trilha.nome}`, 'i-estrela');
    avisarConquistas(novas);
    const depois = Progresso.nivel(prog.xp);
    if (depois.numero > antes) setTimeout(() => toast('Subiu de nível!', `Nível ${depois.numero}: ${depois.nome}`, 'i-estrela'), 700);
    atualizarLateral();
  }

  async function recarregarTrilhas() {
    await carregarTrilhas();
    atualizarLateral();
  }

  /* =========================================================
     EVENTOS
     ========================================================= */
  function ligarEventos() {
    window.addEventListener('hashchange', () => navegar(location.hash.slice(1)));
    // Links internos (#secao): também funcionam quando o endereço já é o mesmo
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const secao = a.getAttribute('href').slice(1);
      if (!ROTAS[secao]) return;
      e.preventDefault();
      irPara(secao);
    });

    $('btn-menu').addEventListener('click', abrirMenu);
    $('btn-fechar-menu').addEventListener('click', fecharMenu);
    $('lateral-fundo').addEventListener('click', fecharMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('barra-lateral').classList.contains('lateral--aberta')) fecharMenu();
    });
    $('select-trilha-lateral').addEventListener('change', (e) => {
      if (!e.target.value) return;
      definirTrilha(e.target.value);
      const rota = ROTAS[estado.secao];
      if (rota && $(rota.tela) && !$(rota.tela).hidden) {
        rota.render();
        atualizarLateral();
      }
      toast('Trilha atual', estado.trilha.nome, 'i-livro');
    });

    $('lista-trilhas').addEventListener('keydown', teclasTrilhas);
    $('btn-bora').addEventListener('click', () => estado.selecionada && abrirTrilha(estado.selecionada));
    $('input-importar').addEventListener('change', importarTrilhas);

    $('btn-trocar-trilha').addEventListener('click', () => irPara('inicio'));
    $('select-meta').addEventListener('change', (e) => {
      estado.prog.metaDiaria = Number(e.target.value);
      avisarConquistas(Conquistas.verificar(estado.prog, estado.trilha));
      salvar();
      renderizarStatus();
      renderizarConquistas();
      atualizarLateral();
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
      atualizarLateral();
      toast('Pronto', 'Progresso zerado. Mergulho novo!', 'i-bolha');
    });

    $('btn-sair-quiz').addEventListener('click', sairDoQuiz);
    $('btn-sair-jogo').addEventListener('click', sairDoJogo);
    $('btn-continuar').addEventListener('click', continuar);
    $('btn-marcar').addEventListener('click', () => {
      const q = Quiz.atual(estado.sessao);
      const marcada = Progresso.alternarMarcada(estado.prog, q.id);
      salvar();
      atualizarBotaoMarcar();
      toast(marcada ? 'Marcada' : 'Desmarcada', marcada ? 'Essa volta no modo Revisão.' : 'Saiu da lista de revisão.', 'i-marcador');
    });

    $('btn-resumo-revisar').addEventListener('click', () => iniciarSessao('revisao'));

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
  async function iniciar() {
    UI.montarMascotes();
    criarBolhas();
    ligarEventos();
    await Conta.garantir(); // com Supabase configurado: login + senha própria + progresso da nuvem
    Nuvem.Sincronia.aoMudar(() => atualizarConta());
    await carregarTrilhas();
    const secao = location.hash.slice(1);
    navegar(ROTAS[secao] ? secao : 'inicio');
  }

  // Deixa o resto do código carregar antes de começar (outros scripts usam App.*)
  document.addEventListener('DOMContentLoaded', iniciar);

  return {
    trilhas: () => estado.trilhas,
    trilhaAtual: () => estado.trilha,
    definirTrilha,
    abrirTrilha,
    irPara,
    iniciarProvaEnviada: (opcoes) => iniciarSessao('enviada', opcoes),
    concederXP,
    recarregarTrilhas,
    podeGerenciar,
  };
})();

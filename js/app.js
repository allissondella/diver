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
    salaId: null, // sala aberta na tela "Sala" (js/grupos.js)
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
  /* Pacotes de scripts que chegam na primeira vez que a área abre (Onda 6). A ordem dentro de cada pacote importa. */
  const PACOTES = {
    jogos: ['js/jogos/comum.js', 'js/jogos/cartas-do-fundo.js', 'js/jogos/quiz-relampago.js', 'js/jogos/memoria.js', 'js/jogos/adivinha-ai.js',
      'js/jogos/caca-ao-tesouro.js', 'js/jogos/chefao.js', 'js/jogos/mare-alta.js', 'js/jogos/forca.js', 'js/jogos/palavrinha.js',
      'js/jogos/corrente-do-tempo.js', 'js/jogos/caso-resolvido.js',
      'js/laboratorio/executor.js', 'js/laboratorio/editor.js', 'js/laboratorio/mundo-robo.js', 'js/laboratorio/laboratorio.js', 'js/laboratorio/lab-python.js',
      'js/laboratorio/lab-js.js', 'js/laboratorio/motor-portas.js', 'js/laboratorio/motor-sala.js', 'js/laboratorio/motor-rede.js', 'js/laboratorio/terminal.js', 'js/laboratorio/motor-shell.js', 'js/laboratorio/motor-git.js',
      'js/jogos/robo-entregador.js', 'js/jogos/primeiros-programas.js', 'js/jogos/lupa-do-codigo.js', 'js/jogos/caca-bugs.js', 'js/jogos/oficina-de-funcoes.js',
      'js/jogos/caca-ao-numero.js', 'js/jogos/organizador-de-pasta.js', 'js/jogos/banco-ao-vivo.js', 'js/jogos/servidor-sumido.js',
      'js/jogos/fabrica-de-portas.js', 'js/jogos/sala-de-controle.js', 'js/jogos/jornada-do-pacote.js',
      'js/jogos/mini-servidor.js', 'js/jogos/laboratorio-de-rede.js', 'js/jogos/missoes-no-terminal.js', 'js/jogos/linha-do-tempo-do-codigo.js', 'js/jogos/mini-masmorra.js', 'js/jogos/arena-de-robos.js'],
    cronograma: ['js/cronograma-gerador.js', 'js/diagnostica.js', 'js/cronograma.js'],
    nivelamento: ['js/cronograma-gerador.js', 'js/diagnostica.js'], // o js/mapa-partida.js já vem no núcleo (o Plano de estudos usa)
    provas: ['js/leitor-prova.js', 'js/provas-enviadas.js'],
    biblioteca: ['js/biblioteca.js'],
    perfil: ['js/perfil.js'],
    estatisticas: ['js/estatisticas.js'],
    admin: ['js/estatisticas.js', 'js/admin.js'],
    fila: ['js/fila-validacao.js'],
    profissoes: ['js/profissoes-infograficos.js', 'js/profissoes-artes.js', 'js/profissoes.js', 'js/profissoes-panorama.js', 'js/profissoes-mergulho.js'], // Mapa das Profissões (docs/MAPA_PROFISSOES_INTEGRACAO.md); as artes vêm antes da tela; os panoramas (Tecnologia, Medicina) e o mergulho "Quão fundo" são extensões e vêm depois
    descompressao: ['js/dicionario.js', 'js/descompressao.js', 'js/descompressao/investigacao.js', 'js/descompressao/palavrinha-dia.js',
      'js/descompressao/tiro.js', 'js/descompressao/batata.js', 'js/descompressao/pitstop.js', 'js/descompressao/cardume.js'],
  };
  const pacotesProntos = new Set();
  /** Garante os pacotes; depois dos jogos, as cartas são refeitas (os laboratórios entram nelas). */
  function carregarPacotes(nomes = []) {
    const faltam = nomes.filter((n) => !pacotesProntos.has(n));
    if (!faltam.length) return Promise.resolve();
    return UI.carregarScripts(faltam.flatMap((n) => PACOTES[n])).then(() => {
      faltam.forEach((n) => pacotesProntos.add(n));
      if (faltam.includes('jogos')) estado.cartasCache = {};
    });
  }
  const pacotesProntosPara = (nomes = []) => nomes.every((n) => pacotesProntos.has(n));

  const ROTAS = {
    inicio: { tela: 'tela-inicio', render: renderizarInicio },
    sala: { tela: 'tela-sala', lateral: 'inicio', pacotes: ['cronograma'], render: renderizarSalaEstudo }, // endereço #sala-<id> (js/grupos.js)
    mergulho: { tela: 'tela-painel', precisaTrilha: true, pacotes: ['jogos'], render: renderizarPainel },
    simulado: { tela: 'tela-simulado', precisaTrilha: true, pacotes: ['provas'], render: renderizarSimulado },
    revisao: { tela: 'tela-revisao', precisaTrilha: true, render: renderizarRevisao },
    jogos: { tela: 'tela-jogos', precisaTrilha: true, pacotes: ['jogos'], render: renderizarSala },
    tarefas: { tela: 'tela-tarefas', render: () => Quadros.render($('tela-tarefas')) },
    calendario: { tela: 'tela-calendario', render: () => Organizar.renderCalendario($('tela-calendario')) },
    cronograma: { tela: 'tela-cronograma', pacotes: ['cronograma'], render: () => Cronograma.render($('tela-cronograma')) },
    diagnostica: { tela: 'tela-diagnostica', pacotes: ['cronograma'], render: () => Diagnostica.render($('tela-diagnostica')) },
    'mapa-partida': { tela: 'tela-mapa-partida', pacotes: ['nivelamento'], render: () => MapaPartida.render($('tela-mapa-partida')) }, // sala Ensino Médio (js/mapa-partida.js)
    foco: { tela: 'tela-foco', render: () => Organizar.renderFoco($('tela-foco')) },
    cursos: { tela: 'tela-cursos', pacotes: ['biblioteca'], render: () => Biblioteca.renderCursos($('tela-cursos')) },
    pdfs: { tela: 'tela-pdfs', pacotes: ['biblioteca'], render: () => Biblioteca.renderPdfs($('tela-pdfs')) },
    perfil: { tela: 'tela-perfil', pacotes: ['perfil'], render: () => Perfil.render($('tela-perfil')) },
    estatisticas: { tela: 'tela-estatisticas', pacotes: ['estatisticas'], render: () => Estatisticas.render($('tela-estatisticas')) },
    descompressao: { tela: 'tela-descompressao', pacotes: ['descompressao'], render: () => Descompressao.render($('tela-descompressao')) },
    profissoes: { tela: 'tela-profissoes', pacotes: ['profissoes'], render: renderizarProfissoes }, // endereços #profissoes, #profissoes-cartas, #profissoes-metodo, #profissoes-fundo, #profissoes-comparar[-<a>--<b>], #profissao-<id>[-dia|-mitos] e da Tecnologia (#profissoes-tecnologia[-jogo], #tecnologia-<área>)
    prova: { tela: 'tela-prova', precisaTrilha: true, render: renderizarProva },
    'upload-prova': { tela: 'tela-upload-prova', precisaTrilha: true, pacotes: ['provas'], render: () => ProvasEnviadas.renderUpload($('tela-upload-prova')) },
    admin: { tela: 'tela-admin', soEquipe: true, pacotes: ['admin'], render: () => Admin.render($('tela-admin')) },
    fila: { tela: 'tela-fila', soAdmin: true, pacotes: ['fila'], render: () => FilaValidacao.render($('tela-fila')) },
  };
  const TELAS_FOCO = ['tela-quiz', 'tela-jogo']; // sem barra lateral: uma ação principal por tela

  /** Vai para uma área (atualiza o endereço, o que permite usar o botão Voltar do navegador). */
  function irPara(secao) {
    if (location.hash === '#' + secao) navegar(secao);
    else location.hash = secao;
  }

  /** Endereços do Mapa das Profissões que caem na tela "profissoes" (o módulo desenha a rota certa). */
  const ehRotaProfissoes = (secao) => /^profissoes(-cartas|-metodo|-fundo|-tecnologia|-tecnologia-jogo|-medicina|-medicina-jogo)?$|^profissoes-comparar(-[a-z0-9-]+)?$|^profissao-[a-z0-9-]+$|^(tecnologia|medicina)-[a-z-]+$/.test(secao || '');

  /** O endereço existe? (#secao, #sala-<id> ou uma rota do Mapa das Profissões) */
  function rotaExiste(secao) {
    return !!ROTAS[secao] || /^sala-./.test(secao || '') || ehRotaProfissoes(secao);
  }

  let saidaConfirmada = false; // a pessoa já disse "Sair agora" na caixa: a próxima navegação passa direto

  function navegar(secao) {
    const alvoOriginal = secao;
    let salaId = null;
    if (/^sala-./.test(secao)) { // #sala-enem → tela "Sala" com a sala enem
      salaId = secao.slice(5);
      secao = 'sala';
    }
    let rotaProfissoes = null;
    if (ehRotaProfissoes(secao)) { // #profissao-enfermagem → tela "Profissões" com a ficha
      rotaProfissoes = secao;
      secao = 'profissoes';
    }
    const rota = ROTAS[secao];
    if (!rota) return;
    // Saindo no meio de um quiz ou jogo pelo botão Voltar do navegador: volta o endereço e pergunta
    if (emAndamento() && !saidaConfirmada) {
      history.replaceState(null, '', '#' + estado.secao);
      UI.confirmar({
        titulo: 'Sair agora?', texto: 'O que você já respondeu fica salvo, mas a partida termina.',
        sim: 'Sair agora', nao: 'Continuar aqui', humor: 'triste',
      }).then((ok) => {
        if (!ok) return;
        saidaConfirmada = true;
        irPara(alvoOriginal);
      });
      return;
    }
    saidaConfirmada = false;
    abandonarAndamento();
    if (secao === 'sala') {
      const sala = Grupos.salas(estado.trilhas).find((s) => s.id === salaId);
      if (!sala) { // sala que não existe (ou sem curso para esta pessoa): volta ao Início
        secao = 'inicio';
        history.replaceState(null, '', '#inicio');
      } else if (sala.unica) { // sala de um curso só: abre o curso direto
        definirTrilha(sala.unica.id);
        secao = 'mergulho';
        history.replaceState(null, '', '#mergulho');
      }
    }
    if ((rota.soEquipe && !Nuvem.ehAdmin() && !Nuvem.ehProfessor()) || (rota.soAdmin && !Nuvem.ehAdmin())) {
      secao = 'inicio';
      history.replaceState(null, '', '#inicio');
    }
    if (ROTAS[secao].precisaTrilha && !estado.trilha) {
      toast('Escolha uma trilha', 'Primeiro escolha o que estudar.', 'i-livro');
      secao = 'inicio';
      history.replaceState(null, '', '#inicio');
    }
    // Curso que veio só do catálogo: baixa o curso inteiro antes de abrir a área
    if (ROTAS[secao].precisaTrilha && estado.trilha._parcial) {
      const alvo = secao;
      if (alvo === 'mergulho') mostrarEsqueletoDoCurso();
      comCursoCompleto(() => {
        tirarEsqueletoDoCurso();
        if (location.hash === '#' + alvo || estado.secao === alvo) navegar(alvo);
      });
      return;
    }
    // Área que precisa de um pacote ainda não baixado: baixa e volta aqui (Onda 6)
    if (!pacotesProntosPara(ROTAS[secao].pacotes)) {
      const alvo = location.hash.slice(1) || secao;
      if (secao === 'mergulho') mostrarEsqueletoDoCurso();
      carregarPacotes(ROTAS[secao].pacotes).then(() => {
        tirarEsqueletoDoCurso();
        if (location.hash.slice(1) === alvo) navegar(alvo);
      }, () => toast('Sem conexão', 'Não deu para abrir esta área agora. Confira a internet e tente de novo.', 'i-x'));
      return;
    }
    Tutorial.fechar(false);
    if (estado.secao === 'profissoes' && secao !== 'profissoes' && typeof Profissoes !== 'undefined') Profissoes.desmontar();
    estado.secao = secao;
    if (secao === 'sala') estado.salaId = salaId;
    if (secao === 'profissoes') estado.rotaProfissoes = rotaProfissoes;
    ROTAS[secao].render();
    mostrarTela(ROTAS[secao].tela);
    Tutorial.aoEntrar(secaoTutorial()); // primeira visita? o Diver mostra a página
  }

  /** O roteiro do tutorial desta página (uma sala pode ter o seu, como a Ensino Médio: "sala-ensino-medio"). */
  function secaoTutorial() {
    const propria = estado.secao === 'sala' && `sala-${estado.salaId}`;
    return propria && Tutorial.tem(propria) ? propria : estado.secao;
  }

  function emAndamento() {
    const quiz = estado.sessao && !estado.sessao.encerrada && !$('tela-quiz').hidden;
    const jogo = estado.jogo && !estado.jogo.fim && !$('tela-jogo').hidden;
    return quiz || jogo || (typeof Descompressao !== 'undefined' && Descompressao.emAndamento());
  }

  function abandonarAndamento() {
    if (estado.sessao && !estado.sessao.encerrada && !$('tela-quiz').hidden) {
      if (estado.sessao.respostas.length) {
        registrarSessao(estado.sessao, Quiz.finalizar(estado.sessao, estado.prog, 'saiu'), 'saiu');
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
    if (typeof Descompressao !== 'undefined') Descompressao.parar(); // jogo da Sala de Descompressão aberto? fecha (a partida online avisa o outro lado)
  }

  /** O filete turquesa da barra lateral desliza até o item atual (Onda 5; só desenho). */
  function moverFilete() {
    const nav = document.querySelector('.lateral__nav');
    if (!nav) return;
    let filete = nav.querySelector('.lateral__filete');
    if (!filete) {
      filete = h('span', { class: 'lateral__filete', 'aria-hidden': 'true' });
      nav.prepend(filete);
      window.addEventListener('resize', moverFilete); // a altura dos itens muda entre o celular e o computador
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(moverFilete);
    }
    const atual = nav.querySelector('a[aria-current="page"]');
    if (!atual) { filete.hidden = true; return; }
    filete.hidden = false;
    filete.style.transform = `translateY(${atual.offsetTop}px)`;
    filete.style.height = `${atual.offsetHeight}px`;
  }

  function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach((t) => (t.hidden = t.id !== id));
    document.body.classList.toggle('modo-foco', TELAS_FOCO.includes(id));
    const naLateral = (ROTAS[estado.secao] && ROTAS[estado.secao].lateral) || estado.secao; // a Sala fica sob "Início"
    document.querySelectorAll('.lateral__nav a').forEach((a) => {
      if (a.dataset.secao === naLateral) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    moverFilete();
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
    document.body.classList.add('gaveta-aberta'); // Onda 3: o fundo não rola com a gaveta aberta
    $('btn-menu').setAttribute('aria-expanded', 'true');
    $('barra-lateral').querySelector('.lateral__nav a[aria-current]') ? $('barra-lateral').querySelector('.lateral__nav a[aria-current]').focus() : $('btn-fechar-menu').focus();
  }

  function fecharMenu() {
    const aberta = $('barra-lateral').classList.contains('lateral--aberta');
    $('barra-lateral').classList.remove('lateral--aberta');
    $('lateral-fundo').hidden = true;
    document.body.classList.remove('gaveta-aberta');
    $('btn-menu').setAttribute('aria-expanded', 'false');
    if (aberta && document.activeElement && $('barra-lateral').contains(document.activeElement)) $('btn-menu').focus();
  }

  function atualizarLateral() {
    desenharSeletorTrilha();

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

    const qtd = estado.trilha._parcial ? 0 : Progresso.paraRevisar(prog, estado.trilha).length;
    $('badge-revisao').hidden = qtd === 0;
    $('badge-revisao').textContent = String(qtd);
    $('badge-foco').hidden = !Organizar.focoAtivo();
  }

  /* ---------- "Sala atual": botão que abre a lista das salas (padrão listbox, funciona no teclado) ---------- */
  /** A sala do curso atual (ou null). */
  function salaAtual() {
    return estado.trilha ? Grupos.salaDoCurso(estado.trilhas, estado.trilha.id) : null;
  }

  function desenharSeletorTrilha() {
    const box = $('seletor-trilha');
    const estavaAberto = box.classList.contains('seletor-trilha--aberto');
    const atual = salaAtual();
    const curso = atual && !atual.unica && estado.trilha ? Grupos.nomeCurto(atual, estado.trilha) : null;
    const botao = h('button', {
      type: 'button', class: `seletor-trilha__botao${atual ? ` sala--${atual.cor}` : ''}`, id: 'seletor-trilha-botao',
      'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': 'seletor-trilha-lista',
      disabled: !estado.trilhas.length,
      onclick: () => abrirSeletorTrilha(!box.classList.contains('seletor-trilha--aberto')),
    },
    atual ? h('span', { class: 'seletor-trilha__icone', 'aria-hidden': 'true' }, icone(atual.icone)) : null,
    h('span', { class: 'seletor-trilha__textos' },
      h('span', { class: 'rotulo', text: 'Sala atual' }),
      h('span', { class: 'seletor-trilha__nome', text: atual ? atual.nome : 'Nenhuma sala' }),
      curso ? h('span', { class: 'seletor-trilha__cat', text: curso }) : null),
    icone('i-seta-dir', 'seletor-trilha__seta'));

    const lista = h('div', {
      class: 'seletor-trilha__lista', id: 'seletor-trilha-lista', role: 'listbox', tabindex: '-1',
      'aria-label': 'Escolha a sala', hidden: true,
      onkeydown: teclasSeletorTrilha,
    }, Grupos.salas(estado.trilhas).map((sala) => {
      const r = Grupos.resumo(sala);
      const sel = !!atual && sala.id === atual.id;
      return h('div', {
        role: 'option', id: `opcao-sala-${sala.id}`, class: `seletor-trilha__opcao sala--${sala.cor}`, 'data-id': sala.id,
        'aria-selected': String(sel),
        onclick: () => escolherSala(sala.id),
      },
      h('span', { class: 'seletor-trilha__opcao-icone', 'aria-hidden': 'true' }, icone(sala.icone)),
      h('span', { class: 'seletor-trilha__opcao-textos' },
        h('span', { class: 'seletor-trilha__opcao-nome', text: sala.nome }),
        h('span', { class: 'seletor-trilha__opcao-meta', text: `${Grupos.numeros(sala, r)[0]} · ${r.pct}% feito` }),
        h('span', { class: 'trilha__progresso', 'aria-hidden': 'true' }, h('span', { style: `width:${r.pct}%` }))),
      sel ? icone('i-check', 'seletor-trilha__marca') : null);
    }));
    box.replaceChildren(botao, lista);
    if (estavaAberto) abrirSeletorTrilha(true);
  }

  function abrirSeletorTrilha(abrir) {
    const box = $('seletor-trilha');
    const lista = $('seletor-trilha-lista');
    const botao = $('seletor-trilha-botao');
    if (!lista || !botao) return;
    box.classList.toggle('seletor-trilha--aberto', abrir);
    lista.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
    if (abrir) {
      const opcoes = [...lista.querySelectorAll('[role="option"]')];
      const ativa = opcoes.find((o) => o.getAttribute('aria-selected') === 'true') || opcoes[0];
      marcarOpcaoAtiva(ativa);
      lista.focus({ preventScroll: true });
    }
  }

  function marcarOpcaoAtiva(opcao) {
    const lista = $('seletor-trilha-lista');
    lista.querySelectorAll('[role="option"]').forEach((o) => o.classList.toggle('seletor-trilha__opcao--ativa', o === opcao));
    if (opcao) {
      lista.setAttribute('aria-activedescendant', opcao.id);
      opcao.scrollIntoView({ block: 'nearest' });
    }
  }

  function teclasSeletorTrilha(e) {
    const lista = $('seletor-trilha-lista');
    const opcoes = [...lista.querySelectorAll('[role="option"]')];
    const i = opcoes.findIndex((o) => o.classList.contains('seletor-trilha__opcao--ativa'));
    const ir = (k) => marcarOpcaoAtiva(opcoes[Math.max(0, Math.min(opcoes.length - 1, k))]);
    if (e.key === 'ArrowDown') ir(i + 1);
    else if (e.key === 'ArrowUp') ir(i - 1);
    else if (e.key === 'Home') ir(0);
    else if (e.key === 'End') ir(opcoes.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') { if (opcoes[i]) escolherSala(opcoes[i].dataset.id); }
    else if (e.key === 'Escape') {
      e.stopPropagation(); // não fecha a gaveta do celular junto
      abrirSeletorTrilha(false);
      $('seletor-trilha-botao').focus();
    } else if (e.key === 'Tab') abrirSeletorTrilha(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  }

  /**
   * Escolheu uma sala na barra lateral: a sala com vários cursos abre a tela da sala;
   * a de um curso só troca o curso atual (nas telas do curso, como Simulado e Sala de Jogos, fica na mesma tela) ou abre o curso.
   */
  function escolherSala(salaId) {
    abrirSeletorTrilha(false);
    $('seletor-trilha-botao').focus();
    const sala = Grupos.salas(estado.trilhas).find((s) => s.id === salaId);
    if (!sala) return;
    fecharMenu();
    if (!sala.unica) return irPara(`sala-${sala.id}`);
    const rota = ROTAS[estado.secao];
    if (rota && rota.precisaTrilha) return escolherTrilhaAtual(sala.unica.id);
    abrirTrilha(sala.unica.id);
  }

  function escolherTrilhaAtual(id) {
    if (!id || (estado.trilha && estado.trilha.id === id)) return;
    definirTrilha(id);
    const rota = ROTAS[estado.secao];
    if (rota && $(rota.tela) && !$(rota.tela).hidden) {
      const secao = estado.secao;
      comCursoCompleto(() => {
        if (estado.secao !== secao) return;
        rota.render();
        atualizarLateral();
      });
    }
    toast('Sala atual', estado.trilha.nome, 'i-livro');
  }

  /** Cartão da pessoa logada (nome, tipo de conta, status da nuvem, Sair). No modo local, some. */
  function atualizarConta() {
    const area = limpar($('lateral-conta'));
    const perfil = Nuvem.perfil();
    // Admin: "Pessoas e cursos" (cadastra e gerencia). Professor: "Meus alunos" (só acompanha).
    const equipe = Nuvem.ehAdmin() || Nuvem.ehProfessor();
    document.querySelectorAll('[data-so-equipe]').forEach((el) => (el.hidden = !equipe));
    document.querySelectorAll('[data-so-admin]').forEach((el) => (el.hidden = !Nuvem.ehAdmin())); // Fila de Validação (IAs pagas)
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

  /* ---------- Cortina de transição (bolhas + Diver, até 700 ms) ---------- */
  function cortina(texto) {
    if (movimentoReduzido) return;
    const el = $('transicao');
    $('transicao-texto').textContent = texto;
    clearTimeout(estado.cortinaTimer);
    el.classList.remove('transicao--saindo');
    el.classList.add('transicao--on');
    // Onda 5: no máximo 700 ms no total (entra 150, fica até 400, sai em 300)
    estado.cortinaTimer = setTimeout(() => {
      el.classList.add('transicao--saindo');
      estado.cortinaTimer = setTimeout(() => el.classList.remove('transicao--on', 'transicao--saindo'), 300);
    }, 400);
  }

  /**
   * Curso inteiro sob demanda (catálogo leve, Trilhas.completar): roda fn quando o curso atual estiver
   * completo. Se ainda não está, mostra a cortina enquanto baixa. Sem internet: avisa e não abre nada.
   */
  /** Tela do curso com o esqueleto das aulas enquanto o curso inteiro baixa (catálogo leve → curso completo). */
  function mostrarEsqueletoDoCurso() {
    const tela = $('tela-painel');
    tirarEsqueletoDoCurso();
    const n = Math.min(6, (estado.trilha.fases || []).length || 4);
    tela.prepend(UI.esqueleto('fase', n, `Abrindo ${estado.trilha.nome}…`));
    tela.classList.add('tela--carregando');
    document.querySelectorAll('.tela').forEach((t) => (t.hidden = t !== tela));
  }
  function tirarEsqueletoDoCurso() {
    const tela = $('tela-painel');
    tela.classList.remove('tela--carregando');
    tela.querySelectorAll(':scope > .esqueleto-area').forEach((el) => el.remove());
  }

  function comCursoCompleto(fn, texto = 'Abrindo o curso…') {
    const t = estado.trilha;
    if (!t || !t._parcial) return fn();
    cortina(texto);
    const lento = setTimeout(() => toast('Abrindo o curso…', 'Baixando as aulas, só um instante.', 'i-livro'), 1200);
    Trilhas.completar(t).finally(() => clearTimeout(lento)).then(() => {
      if (estado.trilha !== t) return;
      estado.cartasCache = {};
      atualizarLateral();
      fn();
    }, () => { tirarEsqueletoDoCurso(); toast('Não consegui abrir o curso', 'Confira a internet e tente de novo.', 'i-alerta'); });
  }

  /* ---------- Bolhas do fundo ---------- */
  function criarBolhas() {
    if (movimentoReduzido) return;
    const area = document.querySelector('.bolhas');
    // Onda 5: no máximo 12 bolhas, e paradas com a aba escondida (e no quiz e nos jogos, pelo CSS: .modo-foco)
    document.addEventListener('visibilitychange', () => document.body.classList.toggle('aba-oculta', document.hidden));
    for (let i = 0; i < 12; i++) {
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
    estado.trilhas = Grupos.ordenar(trilhas); // mesma ordem em todo o app: Mergulho no Enem, Radiologia, depois os avulsos
    // Nome de todos os cursos (até os que a pessoa não faz): o ranking global mostra o curso de cada um
    estado.nomesCursos = new Map(resultado.trilhas.map((t) => [t.id, t.nome]));
    estado.cartasCache = {};
    const ultima = Progresso.ultimaTrilha();
    const atualId = estado.trilha && trilhas.some((t) => t.id === estado.trilha.id) ? estado.trilha.id : null;
    const escolhida = atualId || (trilhas.some((t) => t.id === ultima) ? ultima : trilhas[0] && trilhas[0].id);
    if (escolhida) definirTrilha(escolhida, false);
    else {
      estado.trilha = null;
      estado.prog = null;
    }
    renderizarSalas();
    renderizarAvisos(problemas, semServidor && trilhas.length === 0);
  }

  /** Define a trilha atual (sem trocar de tela). */
  function definirTrilha(id, lembrar = true) {
    const trilha = estado.trilhas.find((t) => t.id === id);
    if (!trilha) return;
    estado.trilha = trilha;
    estado.prog = Progresso.carregar(id);
    if (Progresso.conhecerFasesNovas(estado.prog, trilha)) Progresso.salvar(id, estado.prog);
    if (lembrar) Progresso.definirUltimaTrilha(id);
    atualizarLateral();
    // catálogo leve: o curso escolhido já começa a baixar (quando a pessoa entrar, provavelmente já chegou)
    if (trilha._parcial) Trilhas.completar(trilha).then(() => { if (estado.trilha === trilha) atualizarLateral(); }, () => {});
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
    $('tela-inicio').classList.remove('tela-inicio--cedo'); // a abertura antecipada (index.html) mostrava só o herói
    renderizarContinuar();
    Caminho.cardInicio($('inicio-retomada')); // "Avaliação de nivelamento" (sala Ensino Médio)
    renderizarSalas();
    renderizarHoje();
  }

  /* ---------- "Continuar de onde parou" ---------- */
  /** Já estudou neste curso? (mergulhou numa fase, respondeu algo ou concluiu alguma fase) */
  function temHistorico(prog) {
    return !!(prog.ultimaFase || prog.stats.respondidas > 0 || Object.values(prog.fases).some((f) => f && f.concluida));
  }

  /**
   * O curso para continuar: o último escolhido (se já tiver estudo nele) ou o que teve atividade mais recente.
   * A fase é a da última vez; se ela já foi concluída (ou está trancada), a próxima liberada que falta.
   * Devolve null na primeira visita (sem histórico) e { concluido: true } quando todas as fases acabaram.
   */
  function cursoParaContinuar(trilhas = estado.trilhas) {
    const comHistorico = trilhas.map((t) => ({ trilha: t, prog: Progresso.carregar(t.id) })).filter((c) => temHistorico(c.prog));
    if (!comHistorico.length) return null;
    const quando = (c) => Math.max(Date.parse(c.prog.ultimaFase && c.prog.ultimaFase.quando) || 0, Date.parse(c.prog.streak.ultimoDia) || 0);
    const c = comHistorico.find((x) => x.trilha.id === Progresso.ultimaTrilha()) || comHistorico.sort((a, b) => quando(b) - quando(a))[0];
    const { trilha, prog } = c;
    const feita = (k) => !!(prog.fases[trilha.fases[k].id] && prog.fases[trilha.fases[k].id].concluida);
    const concluidas = trilha.fases.filter((f, k) => feita(k)).length;
    if (concluidas === trilha.fases.length) return { trilha, prog, concluidas, concluido: true };
    const livre = (k) => Progresso.faseDesbloqueada(prog, trilha, k);
    let i = prog.ultimaFase ? trilha.fases.findIndex((f) => f.id === prog.ultimaFase.id) : -1;
    if (i < 0 || feita(i) || !livre(i)) {
      const comeco = Math.max(0, i);
      const ordem = [...trilha.fases.keys()];
      const proxima = [...ordem.slice(comeco), ...ordem.slice(0, comeco)].find((k) => !feita(k) && livre(k));
      i = proxima !== undefined ? proxima : trilha.fases.findIndex((f, k) => !feita(k));
    }
    return { trilha, prog, concluidas, fase: trilha.fases[i], indice: i, concluido: false };
  }

  /** Marca a fase como "a última em que mergulhou" (vale para o card "Continuar" do Início). */
  function lembrarFase(faseId) {
    if (!estado.trilha || !estado.prog) return;
    estado.prog.ultimaFase = { id: faseId, quando: new Date().toISOString() };
    Progresso.definirUltimaTrilha(estado.trilha.id);
  }

  /* ---------- Leitura obrigatória: o Mergulho da fase só abre depois do "Antes de mergulhar" ---------- */
  /** A fase pede leitura? Só quando tem artigo (fases[].resumo) e o aluno ainda não abriu. */
  function precisaLer(fase) {
    if (!fase || !fase.resumo || !estado.prog) return false;
    return !(estado.prog.artigosLidos || {})[fase.id];
  }

  function marcarLido(fase) {
    if (!estado.prog) return;
    if (!estado.prog.artigosLidos) estado.prog.artigosLidos = {};
    if (!estado.prog.artigosLidos[fase.id]) estado.prog.artigosLidos[fase.id] = new Date().toISOString();
  }

  /** Clicou em Mergulhar sem ler: a caixa do Diver explica e oferece o artigo. */
  async function avisarLeitura(fase) {
    const abrir = await UI.confirmar({
      titulo: 'Antes de mergulhar, uma leitura rápida',
      texto: `O Mergulho de "${fase.nome}" abre depois que você der uma olhada no artigo da fase (o "Antes de mergulhar"). ` +
        'São poucos minutos e as questões ficam bem mais fáceis. Depois de abrir uma vez, o Mergulho fica liberado de vez.',
      sim: 'Abrir o artigo',
      nao: 'Agora não',
      humor: 'pensando',
    });
    if (abrir) abrirResumo(fase, true);
  }

  function renderizarContinuar() {
    const area = limpar($('continuar'));
    const c = cursoParaContinuar();
    area.hidden = !c;
    if (!c) return;
    const { trilha, prog, concluidas } = c;
    const total = trilha.fases.length;
    const pct = total ? Math.round((concluidas / total) * 100) : 0;
    const sala = Grupos.salaDoCurso(estado.trilhas, trilha.id);
    const verSala = sala && !sala.unica
      ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => irPara(`sala-${sala.id}`) }, icone(sala.icone), `Entrar na sala ${sala.nome}`)
      : null;
    const verMapa = h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => abrirTrilha(trilha.id) }, icone('i-ancora'), 'Ver mapa do curso');

    if (c.concluido) {
      const aprovado = (prog.provas || []).some((p) => p.aprovado);
      area.append(h('section', { class: 'continuar continuar--concluido', 'aria-labelledby': 'continuar-titulo' },
        UI.mascote('continuar__mascote mascote--feliz'),
        h('div', { class: 'continuar__texto' },
          h('span', { class: 'rotulo', text: 'Curso concluído' }),
          h('h2', { class: 'continuar__titulo', id: 'continuar-titulo', text: `Parabéns! Você concluiu ${trilha.nome}` }),
          h('p', { class: 'continuar__sub', text: !aprovado && temDetetive(trilha)
            ? `As ${total} fases foram exploradas até o fundo. Antes da Prova final, que tal relaxar com a Operação Recife Sombrio?`
            : `${total === 1 ? 'A fase foi explorada' : `As ${total} fases foram exploradas`} até o fundo${aprovado ? ' e a prova final está aprovada' : ''}. Bora para a próxima travessia?` })),
        h('div', { class: 'continuar__acoes' },
          aprovado ? null : h('button', { type: 'button', class: 'botao botao--primario', onclick: () => { definirTrilha(trilha.id); irPara('prova'); } }, icone('i-trofeu'), 'Fazer a Prova final'),
          !aprovado && temDetetive(trilha) ? h('button', { type: 'button', class: 'botao botao--secundario', onclick: () => { definirTrilha(trilha.id); abrirDetetive(); } }, icone('i-lupa'), 'Relaxar no detetive') : null,
          h('button', { type: 'button', class: aprovado ? 'botao botao--primario' : 'botao botao--secundario', onclick: () => mostrarSalas(true) }, icone('i-livro'), 'Escolher o próximo curso'),
          verSala, verMapa)));
    } else {
      area.append(h('section', { class: 'continuar', 'aria-labelledby': 'continuar-titulo' },
        h('button', { type: 'button', class: 'continuar__principal', id: 'btn-continuar-curso', onclick: () => continuarCurso(c), 'aria-describedby': 'continuar-fase' },
          h('span', { class: 'continuar__texto' },
            h('span', { class: 'rotulo', text: 'Continuar de onde parou' }),
            h('span', { class: 'continuar__titulo', id: 'continuar-titulo', text: `Continuar ${trilha.nome}` }),
            h('span', { class: 'continuar__fase', id: 'continuar-fase', text: `Fase ${c.indice + 1} · ${c.fase.nome}` }),
            h('span', { class: 'trilha__progresso continuar__barra', 'aria-hidden': 'true' }, h('span', { style: `width:${pct}%` })),
            h('span', { class: 'continuar__meta', text: `${concluidas}/${total} fases concluídas · Nível ${Progresso.nivel(prog.xp).numero}` })),
          h('span', { class: 'continuar__play', 'aria-hidden': 'true' }, icone('i-seta-dir'))),
        h('div', { class: 'continuar__acoes' }, verMapa, verSala)));
    }
  }

  /** Toque no card: entra no curso e começa a rodada naquela fase (como o "play"). */
  function continuarCurso(c) {
    definirTrilha(c.trilha.id);
    iniciarSessao('mergulho', { faseId: c.fase.id });
  }

  /** Rola até as salas do Início e põe o foco na primeira. */
  function mostrarSalas(focar) {
    $('inicio-cursos').scrollIntoView({ behavior: movimentoReduzido ? 'auto' : 'smooth', block: 'start' });
    const primeira = document.querySelector('#lista-salas .sala-porta');
    if (focar && primeira) primeira.focus({ preventScroll: true });
  }

  /** Progresso de um curso para os cartões da sala. */
  function resumoCurso(t) {
    const prog = Progresso.carregar(t.id);
    const concluidas = t.fases.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida).length;
    return { prog, concluidas, pct: t.fases.length ? Math.round((concluidas / t.fases.length) * 100) : 0 };
  }

  /** Entra numa sala: a de vários cursos abre a tela da sala; a de um curso só abre o curso. */
  function entrarNaSala(sala) {
    if (sala.unica) abrirTrilha(sala.unica.id);
    else irPara(`sala-${sala.id}`);
  }

  /* ---------- Início: as salas ---------- */
  function renderizarSalas() {
    const lista = limpar($('lista-salas'));
    if (!estado.trilhas.length) {
      lista.append(Nuvem.ativa && !Nuvem.ehAdmin()
        ? UI.vazio('Seu acesso está pronto, mas nenhum curso foi atribuído a você ainda. Fale com quem te convidou para o Diver.')
        : h('p', { class: 'carregando', text: 'Nenhuma sala por aqui ainda.' }));
      return;
    }
    Grupos.salas(estado.trilhas).forEach((sala) => lista.append(Grupos.cartao(sala, entrarNaSala)));
  }

  /* =========================================================
     SALA (o conteúdo de uma sala: o "Comece por aqui" e os cursos por área)
     ========================================================= */
  /**
   * Cartão de um curso dentro da sala: um toque abre o mapa do curso.
   * estilo: 'normal' (com descrição), 'destaque' (o "Comece por aqui") ou 'compacto' (matéria dentro de uma área).
   */
  function cartaoCurso(t, { estilo = 'normal', nome = t.nome, selo = null, rotuloAula = 'fases' } = {}) {
    const { prog, concluidas, pct } = resumoCurso(t);
    const nivel = Progresso.nivel(prog.xp);
    const compacto = estilo === 'compacto';
    const comeco = concluidas === 0 && !temHistorico(prog);
    return h('button', {
      class: `trilha${compacto ? ' trilha--compacta' : ''}${estilo === 'destaque' ? ' trilha--destaque' : ''}`,
      type: 'button',
      'data-id': t.id,
      onclick: () => abrirTrilha(t.id),
    },
    selo ? h('span', { class: 'trilha__selo' }, icone('i-estrela'), selo) : null,
    h('span', { class: 'trilha__nome', text: nome }),
    compacto ? null : h('span', { class: 'trilha__descricao', text: t.descricao }),
    h('span', { class: 'trilha__progresso', 'aria-hidden': 'true' }, h('span', { style: `width:${pct}%` })),
    h('span', { class: 'trilha__meta' },
      h('span', {}, icone('i-seta-baixo'), `${concluidas}/${t.fases.length} ${rotuloAula}`),
      compacto ? null : h('span', {}, plural(Trilhas.totalQuestoes(t), 'questão', 'questões')),
      prog.xp > 0 ? h('span', {}, icone('i-estrela'), `Nível ${nivel.numero}`) : null,
      !compacto && Progresso.streakVigente(prog) > 0 ? h('span', {}, icone('i-onda'), plural(Progresso.streakVigente(prog), 'dia', 'dias')) : null),
    h('span', { class: 'trilha__ir', 'aria-hidden': 'true' }, comeco ? 'Começar' : 'Abrir', icone('i-seta-dir')));
  }

  function renderizarSalaEstudo() {
    const sala = Grupos.salas(estado.trilhas).find((s) => s.id === estado.salaId);
    const tela = limpar($('tela-sala'));
    if (!sala) return;
    // o curso atual passa a ser desta sala (a "Sala atual" da barra lateral acompanha)
    const c = cursoParaContinuar(sala.trilhas);
    if (!estado.trilha || !sala.trilhas.includes(estado.trilha)) definirTrilha((c ? c.trilha : sala.destaque || sala.trilhas[0]).id, false);
    const r = Grupos.resumo(sala);
    tela.className = `tela tela--larga sala-tela sala--${sala.cor}`;
    const rotuloAula = (t) => (t.rotuloAula ? `${t.rotuloAula.toLowerCase()}s` : sala.rotuloAula);

    const continuar = c && !c.concluido
      ? h('button', { type: 'button', class: 'sala-continuar', id: 'sala-continuar', onclick: () => continuarCurso(c) },
        h('span', { class: 'sala-continuar__textos' },
          h('span', { class: 'rotulo', text: 'Continuar de onde parou' }),
          h('span', { class: 'sala-continuar__nome', text: Grupos.nomeCurto(sala, c.trilha) }),
          h('span', { class: 'sala-continuar__fase', text: /^(aula|oficina|fase)\s+\d/i.test(c.fase.nome) ? c.fase.nome : `Fase ${c.indice + 1} · ${c.fase.nome}` })),
        h('span', { class: 'continuar__play', 'aria-hidden': 'true' }, icone('i-seta-dir')))
      : null;

    const umaArea = sala.areas.length === 1 && !sala.areas[0].area.nome;
    const temPlano = Cronograma.temPlano();
    const cronograma = sala.cronograma
      ? h('section', { class: 'sala-cronograma', id: 'sala-cronograma', 'aria-labelledby': 'sala-cronograma-titulo' },
        h('span', { class: 'sala-cronograma__icone', 'aria-hidden': 'true' }, icone('i-calendario')),
        h('div', { class: 'sala-cronograma__textos' },
          h('h2', { class: 'sala-cronograma__titulo', id: 'sala-cronograma-titulo', text: temPlano ? 'Seu cronograma de estudos' : 'Monte seu cronograma de estudos' }),
          h('p', { class: 'sala-cronograma__texto', text: temPlano
            ? 'Seu plano até a prova já está pronto. Confira o que estudar hoje e marque o que fez.'
            : 'O Diver monta um plano até a sua prova: matéria por matéria, com revisão, simulados e redação toda semana.' })),
        h('button', { type: 'button', class: 'botao botao--link sala-cronograma__botao', onclick: () => irPara('cronograma') },
          icone('i-alvo'), temPlano ? 'Ver meu cronograma' : 'Montar meu cronograma'))
      : null;
    tela.append(...[
      h('button', { type: 'button', class: 'botao botao--link sala-voltar', onclick: () => irPara('inicio') }, icone('i-voltar'), 'Todas as salas'),
      h('header', { class: 'sala-hero' },
        h('span', { class: 'sala-porta__escotilha sala-hero__escotilha', 'aria-hidden': 'true' }, icone(sala.icone)),
        h('div', { class: 'sala-hero__textos' },
          h('span', { class: 'rotulo sala-porta__rotulo', text: `Sala · ${sala.rotulo}` }),
          h('h1', { class: 'sala-hero__nome', id: 'sala-titulo', tabindex: '-1', text: sala.nome }),
          h('p', { class: 'sala-hero__descricao', text: sala.descricao }),
          h('div', { class: 'sala-porta__numeros' }, Grupos.numeros(sala, r).map((n) => h('span', { text: n }))),
          h('div', { class: 'sala-hero__progresso' },
            h('span', { class: 'trilha__progresso sala-porta__barra', role: 'progressbar', 'aria-label': 'Progresso na sala', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(r.pct) }, h('span', { style: `width:${r.pct}%` })),
            h('span', { class: 'sala-porta__pct', text: `${r.feitas}/${r.total} · ${r.pct}% feito` })))),
      cronograma,
      sala.caminho ? Caminho.secaoSala(sala) : continuar, // Ensino Médio: "Plano de estudos" e as duas portas no lugar do "Continuar"
      h('div', { class: 'sala-conteudo', id: 'sala-conteudo' },
        sala.destaque ? cartaoCurso(sala.destaque, { estilo: 'destaque', nome: Grupos.nomeCurto(sala, sala.destaque), selo: sala.destaqueSelo, rotuloAula: 'fases' }) : null,
        umaArea
          ? h('div', { class: 'lista-trilhas' }, sala.areas[0].trilhas.map((t) => cartaoCurso(t, { nome: Grupos.nomeCurto(sala, t), rotuloAula: rotuloAula(t) })))
          : sala.areas.map(({ area, trilhas: lista }) => h('section', { class: `grupo-area grupo-area--${area.cor}`, 'aria-label': area.nome || sala.nome },
            area.nome ? h('h2', { class: 'grupo-area__titulo' },
              area.icone ? h('span', { class: 'grupo-area__icone', 'aria-hidden': 'true' }, icone(area.icone)) : null,
              h('span', { text: area.nome }),
              h('span', { class: 'grupo-area__conta', text: plural(lista.length, ...sala.unidade) })) : null,
            h('div', { class: 'grupo-area__lista' },
              lista.map((t) => cartaoCurso(t, { estilo: 'compacto', nome: Grupos.nomeCurto(sala, t), rotuloAula: rotuloAula(t) }))))))].filter(Boolean));
    avisarCronograma(sala);
    if (sala.caminho) Caminho.aoEntrarNaSala(sala);
  }

  /**
   * Primeira vez na sala que indica o Cronograma (Mergulho no Enem) e ainda sem plano: a caixa do Diver convida.
   * Espera o tutorial da sala terminar, para não aparecer uma janela por cima da outra; só aparece uma vez.
   */
  const CHAVE_AVISO_CRONOGRAMA = 'diver:v1:aviso-cronograma';
  function avisarCronograma(sala) {
    if (!sala.cronograma || Cronograma.temPlano()) return;
    const vistos = Dados.ler(CHAVE_AVISO_CRONOGRAMA, {}) || {};
    if (vistos[sala.id]) return;
    const nestaSala = () => estado.secao === 'sala' && estado.salaId === sala.id && !$('tela-sala').hidden;
    const tentar = (espera) => setTimeout(async () => {
      if (!nestaSala()) return; // saiu da sala antes: o aviso fica para a próxima visita
      if (Tutorial.aberto() || document.querySelector('dialog[open]')) return tentar(600);
      Dados.gravar(CHAVE_AVISO_CRONOGRAMA, { ...(Dados.ler(CHAVE_AVISO_CRONOGRAMA, {}) || {}), [sala.id]: new Date().toISOString() });
      const ok = await UI.confirmar({
        titulo: 'Que tal montar o seu cronograma?',
        texto: 'Diga a data da prova e quanto tempo você tem por dia: o Diver monta um plano semana a semana, com todas as matérias, revisão e simulados. '
          + 'Leva uns 5 minutos e dá para ajustar quando quiser. Ele também fica aqui no topo da sala, no botão "Montar meu cronograma".',
        sim: 'Montar meu cronograma', nao: 'Agora não', humor: 'feliz', foco: 'sim',
      });
      if (ok) irPara('cronograma');
    }, espera);
    tentar(1500); // depois do tutorial da sala, que abre em ~1 s na primeira visita
  }

  /** Botão Voltar do mapa do curso: volta para a sala dele (ou para o Início, se a sala tem um curso só). */
  function voltarDoCurso() {
    const sala = salaAtual();
    irPara(sala && !sala.unica ? `sala-${sala.id}` : 'inicio');
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
  /**
   * A "semente" da data sorteia o curso; depois, o jogo entre os que o curso tem. O mesmo desafio o dia
   * todo, outro amanhã. Curso que ainda não foi baixado (catálogo leve) volta como { pendente: true }:
   * o Início baixa só ele e desenha de novo.
   */
  function desafioDoDia() {
    const hoje = UI.dataLocal();
    let semente = 0;
    for (const c of hoje) semente = (semente * 31 + c.charCodeAt(0)) >>> 0;
    const feito = !!Dados.ler(CHAVE_DESAFIOS, {})[hoje];
    const cursos = [...estado.trilhas].sort((a, b) => a.id.localeCompare(b.id));
    for (let k = 0; k < cursos.length; k++) {
      const t = cursos[(semente + k) % cursos.length];
      if (t._parcial) return { trilha: t, pendente: true, feito, data: hoje };
      const jogos = Jogos.lista().filter((j) => !j.nucleo && !j.emBreve && Jogos.estado(j, cartasDa(t)) === 'disponivel');
      if (jogos.length) return { trilha: t, jogo: jogos[semente % jogos.length], feito, data: hoje };
    }
    return null;
  }

  function renderizarHoje() {
    const area = limpar($('hoje'));
    if (!estado.trilhas.length) return;
    // Os jogos chegam em pacote (Onda 6): o Início aparece primeiro e o "Seu dia" se redesenha quando eles chegam
    if (!pacotesProntos.has('jogos')) {
      // só quando o navegador estiver ocioso: o Início aparece antes, com os 20 scripts do núcleo
      const quandoOcioso = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
      quandoOcioso(() => carregarPacotes(['jogos']).then(() => { if (estado.secao === 'inicio') renderizarHoje(); }, () => {}), { timeout: 2500 });
    }
    let desafio = pacotesProntos.has('jogos') ? desafioDoDia() : null;
    if (desafio && desafio.pendente) {
      // baixa só o curso sorteado e desenha "Seu dia" de novo (se a pessoa ainda estiver no Início)
      const t = desafio.trilha;
      Trilhas.completar(t).then(() => { estado.cartasCache = {}; if (estado.secao === 'inicio') renderizarHoje(); }, () => {});
      desafio = null;
    }
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
  /**
   * Abre o mapa do curso. Opções (Cronograma): { proximaAula: true } rola até a próxima aula não feita
   * e põe o foco nela; { fase: '<id>' } faz o mesmo com uma fase certa.
   */
  function abrirTrilha(id, { proximaAula = false, fase = null } = {}) {
    definirTrilha(id);
    estado.focarNoMapa = fase || (proximaAula ? 'proxima' : null);
    cortina('Bora mergulhar!');
    irPara('mergulho');
  }

  /** Rola o mapa até a aula (abrindo o módulo dela) e põe o foco no botão. */
  function focarAula(faseId) {
    const li = $('mapa-fases').querySelector(`li[data-fase="${CSS.escape(faseId)}"]`);
    if (!li) return;
    const det = li.closest('details');
    if (det) det.open = true;
    li.scrollIntoView({ behavior: movimentoReduzido ? 'auto' : 'smooth', block: 'center' });
    const alvo = li.querySelector('.fase');
    if (alvo) alvo.focus({ preventScroll: true });
  }

  /** A próxima aula não feita (e liberada) do curso atual. */
  function proximaAula() {
    const { trilha, prog } = estado;
    return trilha.fases.find((f, i) => !(prog.fases[f.id] && prog.fases[f.id].concluida) && Progresso.faseDesbloqueada(prog, trilha, i));
  }

  function renderizarPainel() {
    const { trilha } = estado;
    const sala = salaAtual();
    const naSala = !!sala && !sala.unica; // curso dentro de uma sala com vários cursos: a sala em cima, o nome curto embaixo
    $('painel-titulo').textContent = naSala ? Grupos.nomeCurto(sala, trilha) : trilha.nome;
    $('painel-categoria').textContent = naSala ? sala.nome : trilha.categoria || 'Trilha';
    $('btn-trocar-trilha').setAttribute('aria-label', naSala ? `Voltar para a sala ${sala.nome}` : 'Voltar para o Início');
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
    UI.progresso($('st-xp-barra'), nivel.pct);
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
    UI.progresso($('st-meta-barra'), pctMeta);
    $('st-meta-barra').setAttribute('aria-valuemax', prog.metaDiaria);
    $('st-meta-barra').setAttribute('aria-valuenow', Math.min(hoje, prog.metaDiaria));

    const select = limpar($('select-meta'));
    Progresso.METAS_DIARIAS.forEach((n) => {
      select.append(h('option', { value: n, selected: n === prog.metaDiaria, text: `${n} questões` }));
    });
  }

  function renderizarMapa() {
    const { trilha, prog } = estado;
    // Módulos que a pessoa abriu continuam abertos quando o mapa é redesenhado (ex.: ao fechar o artigo)
    const antes = $('mapa-fases');
    const abertos = antes.dataset.trilha === trilha.id
      ? new Set([...antes.querySelectorAll('li[data-modulo] > details[open]')].map((d) => d.parentElement.dataset.modulo))
      : new Set();
    const mapa = limpar(antes);
    mapa.dataset.trilha = trilha.id;
    const n = trilha.fases.length;
    const porModulo = trilha.fases.some((f) => f.modulo);
    $('mapa-sub').textContent = porModulo
      ? 'Todas as aulas estão abertas: a ordem é uma sugestão. Cada módulo fecha com uma revisão.'
      : trilha.fasesLivres
        ? 'Todas as fases estão abertas: escolha o tema que quer estudar. A ordem do mapa é só uma sugestão.'
        : 'Complete uma profundidade para liberar a próxima. Quanto mais fundo, mais pérolas.';
    mapa.classList.toggle('mapa--modulos', porModulo);
    // "Você está aqui": a próxima aula (no Ensino Médio, a do plano de estudos), com borda turquesa no mapa
    const atual = (Caminho.ehRetomada(trilha) && Caminho.proximaAula(trilha, prog)) || proximaAula();
    estado.aulaAtual = atual ? atual.id : null;
    if (porModulo) renderizarMapaModulos(mapa, abertos);
    else trilha.fases.forEach((fase, i) => mapa.append(itemFase(fase, i)));
    if (trilha.questoes.length) mapa.append(itemProva()); // a chegada: deixa claro onde o curso termina
    if (estado.focarNoMapa) {
      const alvo = estado.focarNoMapa === 'proxima' ? proximaAula() : { id: estado.focarNoMapa };
      estado.focarNoMapa = null;
      if (alvo) setTimeout(() => focarAula(alvo.id), 50);
    }
  }

  /** Uma fase (aula) do mapa: o botão de mergulhar e o "Antes de mergulhar". */
  function itemFase(fase, i) {
    const { trilha, prog } = estado;
    const n = trilha.fases.length;
    const liberada = Progresso.faseDesbloqueada(prog, trilha, i);
    const info = prog.fases[fase.id];
    const concluida = !!(info && info.concluida);
    const qtd = Trilhas.questoesDaFase(trilha, fase.id).length;
    const ler = liberada && precisaLer(fase);
    const atual = liberada && !concluida && estado.aulaAtual === fase.id;

    let estadoTxt;
    if (!liberada) estadoTxt = `Bloqueada: complete ${trilha.fases.slice(0, i).reverse().find((f) => !f.novaEm).nome} para descer`;
    else if (concluida) estadoTxt = 'Concluída';
    else estadoTxt = plural(qtd, 'questão', 'questões');

    const estrelas = h('span', { class: 'estrelas', 'aria-hidden': 'true' },
      [1, 2, 3].map((k) => icone('i-estrela', concluida && info.estrelas >= k ? 'ativa' : '')));

    const botao = h('button', {
      type: 'button',
      class: `fase ${concluida ? 'fase--concluida' : ''} ${liberada ? '' : 'fase--bloqueada'} ${atual ? 'fase--atual' : ''}`.replace(/\s+/g, ' ').trim(),
      style: `--prof:${n > 1 ? i / (n - 1) : 0}`,
      disabled: !liberada,
      'aria-label': `${fase.nome}${fase.profundidade ? ', ' + fase.profundidade : ''}. ${atual ? 'Você está aqui. ' : ''}${estadoTxt}` +
        (concluida ? `, ${info.estrelas} de 3 estrelas` : '') + (ler ? '. Abra o "Antes de mergulhar" para liberar o Mergulho' : ''),
      onclick: () => iniciarSessao('mergulho', { faseId: fase.id }),
    },
    h('span', { class: 'fase__no', 'aria-hidden': 'true' },
      !liberada ? icone('i-cadeado') : concluida ? icone('i-check') : String(i + 1)),
    h('span', { class: 'fase__info' },
      atual ? h('span', { class: 'fase__aqui', text: 'Você está aqui' }) : null,
      h('span', { class: 'fase__nome' }, fase.nome, fase.profundidade ? h('span', { class: 'fase__prof', text: fase.profundidade }) : null),
      fase.descricao ? h('span', { class: 'fase__descricao', text: fase.descricao }) : null,
      h('span', { class: 'fase__estado' }, concluida ? estrelas : null, estadoTxt),
    ),
    liberada ? h('span', { class: `fase__cta ${ler ? 'fase__cta--ler' : ''}`, 'aria-hidden': 'true' },
      ler ? icone('i-livro') : null, ler ? 'Ler primeiro' : concluida ? 'Refazer' : 'Mergulhar') : null);

    // "Antes de mergulhar": leitura curta da fase (opcional no JSON). Fica aberta mesmo com a fase bloqueada.
    // Fica no pé do cartão da aula, em linhas iguais: ícone, nome e, à direita, o estado (2026-10-13).
    const fim = (estadoEl) => h('span', { class: 'fase__estudo-fim' }, estadoEl, icone('i-seta-dir', 'fase__estudo-seta'));
    const estudo = fase.resumo
      ? h('button', { type: 'button', class: `fase__estudo ${ler ? 'fase__estudo--pendente' : ''}`, onclick: () => abrirResumo(fase, liberada),
        'aria-label': fase.modulo ? `Antes de mergulhar: ${fase.nome}${ler ? '. Leia para liberar' : ''}` : null },
        icone('i-livro'), h('span', { class: 'fase__estudo-nome', text: fase.modulo ? 'Antes de mergulhar' : `Antes de mergulhar: ${fase.nome}` }),
        fim(ler ? h('span', { class: 'fase__selo', text: 'Leia para liberar' }) : null))
      : null;
    // "Mão na massa": o laboratório da aula (fases[].laboratorio, Explora Tech), sempre aberto, como o artigo
    const labs = (Array.isArray(fase.laboratorio) ? fase.laboratorio : fase.laboratorio ? [fase.laboratorio] : [])
      .map((id) => Jogos.obter(id)).filter(Boolean);
    const maos = labs.map((def) => {
      const feito = typeof Laboratorios !== 'undefined' && Laboratorios.labDaAulaFeito(trilha.id, def.id, fase.id);
      return h('button', { type: 'button', class: 'fase__estudo fase__lab', onclick: () => iniciarJogo(def.id, { fase: fase.id }),
        'aria-label': `Mão na massa: laboratório ${def.nome}, da ${fase.nome}${feito ? '. Feito' : ''}` },
        icone('i-codigo'), h('span', { class: 'fase__estudo-nome', text: `Mão na massa: ${def.nome}` }),
        fim(feito ? h('span', { class: 'fase__feito' }, icone('i-check'), 'Feito') : null));
    });
    const classeLi = `${concluida ? 'mapa__feito' : ''} ${atual ? 'mapa__atual' : ''}`.trim() || null;
    if (!estudo && !maos.length) return h('li', { 'data-fase': fase.id, class: classeLi }, botao);
    // A aula é um cartão só (2026-10-13, pedido do usuário): a leitura e os laboratórios ficam no pé do cartão,
    // alinhados embaixo do título, para não ficar em dúvida de qual aula eles são.
    const classeGrupo = `fase-grupo ${concluida ? 'fase-grupo--concluida' : ''} ${liberada ? '' : 'fase-grupo--bloqueada'} ${classeLi || ''}`.replace(/\s+/g, ' ').trim();
    return h('li', { 'data-fase': fase.id, class: classeGrupo, style: `--prof:${n > 1 ? i / (n - 1) : 0}` },
      botao,
      h('div', { class: 'fase-grupo__extras', role: 'group', 'aria-label': `Estudo e prática da ${fase.nome}` }, estudo, ...maos));
  }

  /** O fim do mapa: a Prova final, no mesmo desenho das aulas (pedido do usuário, 2026-10-13). */
  function itemProva() {
    const { trilha, prog } = estado;
    const cfg = configProva(trilha);
    const exigidas = Progresso.fasesExigidas(prog, trilha);
    const feitas = exigidas.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida).length;
    const atalho = Caminho.provaPorAtalho(trilha, prog) && feitas < exigidas.length; // dispensa por nivelamento (Ensino Médio)
    const pronta = !cfg.exigeFases || feitas === exigidas.length || atalho;
    const aprovacao = (prog.provas || []).find((p) => p.aprovado);
    const rotulo = trilha.rotuloAula === 'Oficina' ? 'oficinas' : trilha.fases.some((f) => f.modulo) ? 'aulas' : 'fases';
    const estadoTxt = aprovacao ? `Aprovado · nota ${aprovacao.nota.toLocaleString('pt-BR')}`
      : atalho ? 'Liberada pelo nivelamento' : pronta ? 'Pronta para você'
        : `Libera quando você concluir as ${exigidas.length} ${rotulo} (${feitas} de ${exigidas.length})`;
    return h('li', { class: 'mapa__fim', 'data-prova': '' },
      h('button', {
        type: 'button', class: `fase fase--final ${aprovacao ? 'fase--concluida' : ''}`.trim(), style: '--prof:1',
        'aria-label': `Fim do curso: Prova final. ${cfg.quantidade} questões, ${cfg.minutos} minutos, ${cfg.aprovacao}% para aprovar. ${estadoTxt}`,
        onclick: () => irPara('prova'),
      },
      h('span', { class: 'fase__no', 'aria-hidden': 'true' }, icone(aprovacao ? 'i-check' : 'i-trofeu')),
      h('span', { class: 'fase__info' },
        h('span', { class: 'fase__nome' }, 'Prova final', h('span', { class: 'fase__prof', text: 'Fim do curso' })),
        h('span', { class: 'fase__descricao', text: `${cfg.quantidade} questões · ${cfg.minutos} min · ${cfg.aprovacao}% para aprovar` }),
        h('span', { class: 'fase__estado' }, estadoTxt)),
      h('span', { class: 'fase__cta', 'aria-hidden': 'true', text: aprovacao ? 'Ver a prova' : pronta ? 'Fazer a prova' : 'Ver a prova' })));
  }

  /**
   * Curso por matéria (fases com "modulo"): um bloco recolhível por módulo, com "x de y aulas" e barra
   * de progresso; o módulo da próxima aula fica aberto. No topo, "Ir para a próxima aula".
   */
  function renderizarMapaModulos(mapa, abertos = new Set()) {
    const { trilha, prog } = estado;
    const feita = (f) => !!(prog.fases[f.id] && prog.fases[f.id].concluida);
    // Sala Ensino Médio: cada módulo tem um estado (js/caminho.js) e a próxima aula segue o plano de estudos
    const caminho = Caminho.ehRetomada(trilha) ? Caminho.estados(trilha, prog) : null;
    const proxima = (caminho && Caminho.proximaAula(trilha, prog)) || proximaAula();
    const modulos = [];
    trilha.fases.forEach((f, i) => {
      const ultimo = modulos[modulos.length - 1];
      if (ultimo && ultimo.nome === f.modulo) ultimo.fases.push([f, i]);
      else modulos.push({ id: f.moduloId || f.modulo || 'outras', nome: f.modulo || 'Outras aulas', fases: [[f, i]] });
    });
    const redesenhar = (moduloId) => {
      renderizarMapa();
      const li = $('mapa-fases').querySelector(`li[data-modulo="${CSS.escape(moduloId)}"]`);
      const det = li && li.querySelector('details');
      if (det) { det.open = true; det.querySelector('summary').focus(); }
    };
    if (proxima) {
      mapa.append(h('li', { class: 'mapa__atalho' },
        h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', id: 'btn-proxima-aula', onclick: () => focarAula(proxima.id) },
          icone('i-seta-baixo'), `Ir para a próxima aula: ${proxima.nome}`)));
    }
    modulos.forEach((m) => {
      const total = m.fases.length;
      const feitas = m.fases.filter(([f]) => feita(f)).length;
      const x = caminho && caminho.get(m.id);
      const aberto = (proxima ? m.fases.some(([f]) => f === proxima) : false) || abertos.has(m.id);
      mapa.append(h('li', { class: `modulo ${feitas === total ? 'modulo--feito' : ''} ${x ? `modulo--${x.estado}` : ''}`.replace(/\s+/g, ' ').trim(), 'data-modulo': m.id },
        h('details', { class: 'modulo__caixa', open: aberto },
          h('summary', { class: 'modulo__cabeca' },
            h('span', { class: 'modulo__nome', text: m.nome }),
            x ? Caminho.selo(x) : null,
            h('span', { class: 'modulo__progresso' },
              h('span', { class: 'modulo__barra', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.round((feitas / total) * 100)}%` })),
              h('span', { class: 'modulo__conta', text: `${feitas} de ${total} ${trilha.rotuloAula === 'Oficina' ? (total === 1 ? 'oficina' : 'oficinas') : (total === 1 ? 'aula' : 'aulas')}` }))),
          h('ol', { class: 'mapa modulo__aulas' }, m.fases.map(([f, i]) => itemFase(f, i)))),
        x ? Caminho.acoesModulo(trilha, { id: m.id, nome: m.nome, fases: m.fases.map(([f]) => f) }, x, redesenhar) : null));
    });
  }

  /* ---------- "Antes de mergulhar": pontos-chave, tabela e pérolas da fase ---------- */
  /** Texto com **negrito** vira nós (nunca HTML). */
  function comNegrito(texto) {
    return String(texto).split(/(\*\*[^*]+\*\*)/).filter(Boolean)
      .map((parte) => (parte.startsWith('**') && parte.endsWith('**') ? h('strong', { text: parte.slice(2, -2) }) : parte));
  }

  function abrirResumo(fase, liberada) {
    if (typeof Artigo === 'undefined') { // o artigo chega na primeira vez que um "Antes de mergulhar" abre (Onda 6)
      UI.carregarScript('js/artigo.js').then(() => abrirResumo(fase, liberada), () => toast('Sem conexão', 'Não deu para abrir o artigo agora.', 'i-x'));
      return;
    }
    const r = fase.resumo || {};
    const eraNovo = precisaLer(fase);
    lembrarFase(fase.id);
    marcarLido(fase);
    salvar();
    if (eraNovo && $('mapa-fases') && estado.trilha) renderizarMapa(); // o botão vira "Mergulhar"
    if (eraNovo && liberada) toast('Mergulho liberado', `Pode mergulhar em ${fase.nome} quando quiser.`, 'i-check');
    let dialogo = $('dialogo-resumo');
    if (!dialogo) {
      dialogo = h('dialog', { id: 'dialogo-resumo', class: 'dialogo', 'aria-labelledby': 'dialogo-resumo-titulo' });
      dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); }); // clique fora fecha
      window.addEventListener('hashchange', () => dialogo.open && dialogo.close()); // Voltar do navegador fecha
      document.body.append(dialogo);
    }
    const tabela = r.tabela && Array.isArray(r.tabela.colunas) && Array.isArray(r.tabela.linhas) ? r.tabela : null;
    // Artigo da fase (js/artigo.js): Aprender → Associar → Praticar → Desafio → Revisar (ícones do sprite)
    const blocoAprender = Artigo.aprender(r);
    const blocoAssociar = Artigo.associar(r);
    const ancoraAssociar = blocoAssociar.length ? h('div', { class: 'artigo__etapa', id: 'artigo-associar' },
      h('p', { class: 'artigo__etapa-rotulo' }, icone('i-cerebro'), 'Associar'), blocoAssociar) : null;
    const rolarPara = (alvo) => {
      const corpo = dialogo.querySelector('.dialogo__corpo');
      if (!alvo) { corpo.scrollTop = 0; return; }
      corpo.scrollTo({ top: alvo.offsetTop - corpo.offsetTop - 8, behavior: movimentoReduzido ? 'auto' : 'smooth' });
    };
    const temJogo = (id) => { const def = Jogos.obter(id); return def && estado.trilha && Jogos.estado(def, cartasDa(estado.trilha)) === 'disponivel'; };
    const passos = Artigo.caminho({
      aprender: () => rolarPara(null),
      associar: () => {
        if (ancoraAssociar) return rolarPara(ancoraAssociar);
        if (temJogo('memoria')) { dialogo.close(); iniciarJogo('memoria'); } else rolarPara(null);
      },
      praticar: () => {
        if (!liberada) return toast('Ainda não', 'Complete a fase anterior para mergulhar aqui.', 'i-cadeado');
        dialogo.close(); iniciarSessao('mergulho', { faseId: fase.id });
      },
      desafio: () => {
        dialogo.close();
        if (temJogo('chefao')) iniciarJogo('chefao'); else irPara('prova');
      },
      revisar: () => { dialogo.close(); iniciarSessao('revisao'); },
    });
    limpar(dialogo).append(h('div', { class: 'dialogo__caixa' },
      h('header', { class: 'dialogo__topo' },
        h('div', {},
          h('span', { class: 'rotulo', text: 'Antes de mergulhar' }),
          h('h2', { id: 'dialogo-resumo-titulo', class: 'dialogo__titulo', text: fase.nome })),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar', onclick: () => dialogo.close() }, icone('i-x'))),
      h('div', { class: 'dialogo__corpo' },
        passos,
        h('p', { class: 'artigo__etapa-rotulo' }, icone('i-livro'), 'Aprender'),
        r.introducao ? h('p', { class: 'resumo__intro' }, comNegrito(r.introducao)) : null,
        blocoAprender,
        ancoraAssociar,
        h('p', { class: 'artigo__etapa-rotulo' }, icone('i-revisao'), 'Para revisar'),
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
    const todas = Conquistas.daTrilha(estado.trilha);
    todas.forEach((c) => {
      const ok = !!prog.conquistas[c.id];
      if (ok) feitas++;
      lista.append(h('li', {},
        h('div', { class: `conquista ${ok ? '' : 'conquista--bloqueada'}` },
          // Bloqueada: o ícone da própria conquista, apagado; o cadeado só aparece ao passar o mouse (Onda 3)
          h('span', { class: 'conquista__icone' }, icone(c.icone), ok ? null : h('span', { class: 'conquista__cadeado', 'aria-hidden': 'true' }, icone('i-cadeado'))),
          h('span', { class: 'conquista__nome', text: c.nome }),
          h('span', { class: 'conquista__desc', text: c.descricao }),
          h('span', { class: 'visualmente-oculto', text: ok ? 'Desbloqueada' : 'Bloqueada' }))));
    });
    $('conquistas-contagem').textContent = `${feitas}/${todas.length}`;
  }

  /* =========================================================
     MAPA DAS PROFISSÕES (js/profissoes.js, pacote "profissoes")
     O módulo desenha as seis telas; aqui ele é ligado ao app pelos ganchos
     (docs/MAPA_PROFISSOES_INTEGRACAO.md, seção 3.3).
     ========================================================= */
  let profissoesLigadas = false;
  function ligarProfissoes() {
    if (profissoesLigadas) return;
    profissoesLigadas = true;
    const g = Profissoes.ganchos;
    // XP e pérolas pela economia central, no curso atual (como o Modo Foco), dentro do teto de bônus.
    // "Uma vez por profissão" o próprio módulo garante (diaConcluido / mitosConcluido).
    g.recompensar = (ev) => {
      const trilha = estado.trilha || estado.trilhas[0];
      if (!trilha || !ev) return;
      const teto = Economia.CONFIG.bonusMaximo;
      const valores = { xp: Math.min(Math.max(0, ev.xp || 0), teto.xp), perolas: Math.min(Math.max(0, ev.perolas || 0), teto.perolas) };
      const motivo = { profissao_dia: 'Um dia completo!', tecnologia_jogo: 'Descobriu as suas áreas!', medicina_jogo: 'Descobriu as suas especialidades!' }[ev.tipo] || 'Mito ou verdade concluído';
      concederXP(trilha.id, valores, motivo);
    };
    // Log de atividade (sem tabela nova). Nada digitado vai para o log: um pedido feito pela busca livre vira "outra".
    g.registrar = (evento, dados) => {
      Profissoes.indice().then((ix) => {
        const d = { ...(dados || {}) };
        if (d.profissao && !ix.profissoes.some((p) => p.id === d.profissao) && !(ix.panoramas || []).some((p) => p.id === d.profissao)) d.profissao = 'outra';
        if (d.indicadores && typeof d.indicadores === 'object' && !Array.isArray(d.indicadores)) {
          Object.entries(d.indicadores).forEach(([k, v]) => { if (typeof v === 'number') d[`ind_${k}`] = v; });
          delete d.indicadores;
        }
        Atividade.registrar(evento, null, d);
        if (['profissao_vista', 'profissao_dia_concluido', 'profissao_carta_gerada', 'tecnologia_area_vista', 'medicina_area_vista'].includes(evento)) {
          avisarConquistas(Conquistas.verificarGerais(ix.profissoes.filter((p) => p.arquivo && p.status === 'publicada').map((p) => p.id)));
        }
      }).catch(() => { /* sem o índice, o evento não vale a pena */ });
    };
    g.confirmar = (texto) => UI.confirmar(typeof texto === 'string' ? { titulo: texto, sim: 'Sim', nao: 'Agora não' } : texto);
    // Matéria-chave → o curso dela na sala do Enem, na próxima aula
    g.abrirCurso = (idCurso) => {
      if (estado.trilhas.some((t) => t.id === idCurso)) abrirTrilha(idCurso, { proximaAula: true });
      else {
        const sala = Grupos.LISTA.find((s) => s.pertence && s.pertence({ id: idCurso }));
        toast('Curso fora das suas salas', `${sala ? `Este curso fica na sala ${sala.nome}.` : 'Este curso fica em outra sala.'} Peça acesso ao admin.`, 'i-livro');
      }
    };
    g.nomeCurso = (idCurso) => {
      const t = estado.trilhas.find((x) => x.id === idCurso);
      const nome = (t && t.nome) || (estado.nomesCursos && estado.nomesCursos.get(idCurso)) || idCurso;
      return nome.split('·').pop().trim(); // "Mergulho no Enem · Biologia" → "Biologia"
    };
    // Ficha em rascunho ou validada: só a equipe (admin e professor) e o modo local veem; para o aluno ela é "Em breve"
    g.verRascunho = () => !Nuvem.ativa || Nuvem.ehAdmin() || Nuvem.ehProfessor();
    // A navegação das seções da ficha gruda logo abaixo do topo do celular (e da faixa do ambiente de testes)
    const ajustarTopo = () => {
      const topo = document.querySelector('.topo');
      const faixa = document.querySelector('.faixa-testes');
      const alto = Math.max(topo && getComputedStyle(topo).display !== 'none' ? topo.getBoundingClientRect().bottom : 0,
        faixa ? faixa.getBoundingClientRect().bottom : 0);
      $('tela-profissoes').style.setProperty('--prof-topo-fixo', `${Math.max(0, Math.round(alto))}px`);
    };
    window.addEventListener('resize', ajustarTopo);
    ajustarTopo();
  }

  function renderizarProfissoes() {
    ligarProfissoes();
    const tela = $('tela-profissoes');
    Profissoes.montar(tela, estado.rotaProfissoes || 'profissoes').then(() => {
      const titulo = tela.querySelector('h1');
      if (titulo && !tela.hidden) { titulo.tabIndex = -1; titulo.focus({ preventScroll: true }); }
    });
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

  /* ---------- Revisar a fundo: um assunto de cada vez (Revisão) ---------- */
  /** Os assuntos com questões na fila, do que tem mais erros para o que tem menos. */
  function temasParaFundo(pendentes) {
    const { trilha, prog } = estado;
    const porTema = new Map();
    pendentes.forEach((q) => {
      if (!q.tema) return;
      const t = porTema.get(q.tema) || { tema: q.tema, fase: q.fase, questoes: [], erros: 0 };
      t.questoes.push(q);
      t.erros += (prog.questoes[q.id] && prog.questoes[q.id].erros) || 0;
      porTema.set(q.tema, t);
    });
    return [...porTema.values()]
      .map((t) => ({ ...t, faseObj: trilha.fases.find((f) => f.id === t.fase) }))
      .sort((a, b) => b.erros - a.erros || b.questoes.length - a.questoes.length);
  }

  function renderizarTemasFundo(pendentes) {
    const temas = temasParaFundo(pendentes);
    $('revisao-fundo').hidden = !temas.length;
    const lista = limpar($('revisao-temas'));
    temas.forEach((t) => {
      lista.append(h('li', {},
        h('button', { type: 'button', class: 'tema-fundo', onclick: () => abrirFichaTema(t.tema) },
          h('span', { class: 'tema-fundo__info' },
            h('strong', { class: 'tema-fundo__nome', text: t.tema }),
            h('span', { class: 'texto-suave', text: [t.faseObj && t.faseObj.nome, plural(t.questoes.length, 'questão na fila', 'questões na fila')].filter(Boolean).join(' · ') })),
          h('span', { class: 'tema-fundo__cta', 'aria-hidden': 'true', text: 'Revisar a fundo' }))));
    });
  }

  /** Ficha do assunto: resumo do tema (bloco "fichas" da trilha), o que a pessoa errou e a rodada. */
  function abrirFichaTema(tema) {
    const { trilha, prog } = estado;
    const t = temasParaFundo(Progresso.paraRevisar(prog, trilha)).find((x) => x.tema === tema)
      || { tema, questoes: [], faseObj: null };
    const ficha = trilha.fichas && trilha.fichas[tema];
    const paragrafos = ficha ? [].concat(ficha.texto || []) : [];
    let dialogo = $('dialogo-tema');
    if (!dialogo) {
      dialogo = h('dialog', { id: 'dialogo-tema', class: 'dialogo', 'aria-labelledby': 'dialogo-tema-titulo' });
      dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
      window.addEventListener('hashchange', () => dialogo.open && dialogo.close());
      document.body.append(dialogo);
    }
    const lista = (titulo, icone_, itens, classe) => (itens && itens.length
      ? h('section', { class: classe || '' }, h('h3', { class: 'resumo__titulo' }, icone(icone_), titulo),
        h('ul', { class: 'resumo__lista' }, itens.map((p) => h('li', {}, comNegrito(p)))))
      : null);
    const corte = (txt) => String(txt).split(/Dica de mergulhador:/i)[0].trim();
    limpar(dialogo).append(h('div', { class: 'dialogo__caixa' },
      h('header', { class: 'dialogo__topo' },
        h('div', {},
          h('span', { class: 'rotulo', text: t.faseObj ? `Revisar a fundo · ${t.faseObj.nome}` : 'Revisar a fundo' }),
          h('h2', { id: 'dialogo-tema-titulo', class: 'dialogo__titulo', text: tema })),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar', onclick: () => dialogo.close() }, icone('i-x'))),
      h('div', { class: 'dialogo__corpo' },
        paragrafos.length ? h('section', { class: 'ficha__texto' }, paragrafos.map((p) => h('p', {}, comNegrito(p)))) : null,
        ficha ? lista('Para não esquecer', 'i-alvo', ficha.pontos) : null,
        ficha ? lista('Pegadinhas', 'i-perola', ficha.pegadinhas, 'resumo__perolas') : null,
        t.questoes.length
          ? h('section', {}, h('h3', { class: 'resumo__titulo' }, icone('i-revisao'), 'O que você errou'),
            h('ul', { class: 'ficha__erros' }, t.questoes.slice(0, 6).map((q) => h('li', {},
              h('p', { class: 'ficha__enunciado', text: q.enunciado }),
              h('p', {}, h('strong', { text: 'Certa: ' }), q.alternativas[q.correta]),
              h('p', { class: 'texto-suave' }, comNegrito(corte(q.explicacao)))))))
          : null,
        !ficha && t.faseObj && t.faseObj.resumo
          ? h('p', { class: 'texto-suave', text: 'Quer o contexto todo? O artigo da fase explica o assunto do começo.' })
          : null),
      h('footer', { class: 'dialogo__rodape' },
        t.faseObj && t.faseObj.resumo
          ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { dialogo.close(); abrirResumo(t.faseObj, true); } }, 'Ler o artigo da fase')
          : h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => dialogo.close() }, 'Fechar'),
        h('button', { type: 'button', class: 'botao botao--primario', onclick: () => { dialogo.close(); iniciarSessao('revisao', { tema, titulo: `A fundo: ${tema}` }); } }, 'Mergulhar no tema'))));
    dialogo.showModal();
    dialogo.querySelector('.dialogo__corpo').scrollTop = 0;
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
    renderizarTemasFundo(pendentes);

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
      reforco: !!c.reforco, // sorteio com reforço dos módulos mais errados (Ensino Médio, js/caminho.js)
    };
  }

  function renderizarProva() {
    const { trilha, prog } = estado;
    const cfg = configProva(trilha);
    const exigidas = Progresso.fasesExigidas(prog, trilha);
    const concluidas = exigidas.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida);
    const fasesOk = concluidas.length === exigidas.length;
    const retomada = Caminho.ehRetomada(trilha);
    const atalho = !fasesOk && Caminho.provaPorAtalho(trilha, prog); // dispensa por nivelamento (Ensino Médio)
    const liberada = !cfg.exigeFases || fasesOk || atalho || Nuvem.ehAdmin() || Nuvem.ehProfessor();
    const provas = prog.provas || [];
    const aprovacao = provas.find((p) => p.aprovado);
    const area = limpar($('tela-prova'));
    const retorno = Caminho.cartaoRetorno(trilha, prog);

    area.append(...[
      UI.cabecalho(trilha.nome, 'Prova final', 'O último mergulho da trilha: sem dicas no meio do caminho, com cronômetro e nota mínima para aprovação.'),
      aprovacao ? retorno : null, // "Boletim da disciplina" (Ensino Médio): com a prova aprovada, vem primeiro
      aprovacao ? h('div', { class: 'selo selo--grande' }, icone('i-trofeu'), h('span', {}, h('strong', { text: 'Aprovado! ' }), `Nota ${aprovacao.nota.toLocaleString('pt-BR')} em ${new Date(aprovacao.data).toLocaleDateString('pt-BR')}.`)) : null,
      h('div', { class: 'cartao prova' },
        h('h2', { class: 'cartao__titulo', text: 'Como funciona' }),
        h('ul', { class: 'prova__regras' },
          h('li', {}, icone('i-livro'), h('span', {}, h('strong', { text: `${cfg.quantidade} questões` }), cfg.reforco ? ' de todos os módulos, com mais questões dos que você mais errou' : ' sorteadas da trilha inteira')),
          h('li', {}, icone('i-relogio'), h('span', {}, h('strong', { text: `${cfg.minutos} minutos` }), ' no total; o que ficar em branco conta como erro')),
          h('li', {}, icone('i-alvo'), h('span', {}, h('strong', { text: `${cfg.aprovacao}% de acertos` }), ` para ser aprovado (${Math.ceil((cfg.aprovacao / 100) * cfg.quantidade)} de ${cfg.quantidade})`)),
          h('li', {}, icone('i-check'), h('span', { text: 'Correção só no final, com a explicação de cada erro' }))),
        cfg.exigeFases ? h('div', { class: 'prova__fases' },
          h('p', { class: 'rotulo-campo', text: retomada && !exigidas.length
            ? 'Sem pré-requisito: os módulos que você já domina contam como feitos'
            : `Pré-requisito: completar as ${exigidas.length} ${retomada ? 'aulas' : 'fases do Mergulho'} (${concluidas.length}/${exigidas.length})` }),
          h('ul', { class: 'prova__lista-fases' }, trilha.fases.map((f) => {
            const ok = prog.fases[f.id] && prog.fases[f.id].concluida;
            const dominada = !ok && retomada && !exigidas.includes(f); // Ensino Médio: aula de módulo dominado (js/caminho.js)
            const recomendada = !ok && !dominada && !exigidas.includes(f);
            return h('li', { class: ok ? 'texto-sucesso' : 'texto-suave' }, icone(ok ? 'i-check' : dominada ? 'i-trofeu' : recomendada ? 'i-estrela' : 'i-cadeado'), f.nome, dominada ? ' (módulo dominado)' : recomendada ? ' (nova, recomendada)' : '');
          }))) : null,
        atalho ? h('p', { class: 'prova__atalho' }, icone('i-trofeu'), h('span', {}, h('strong', { text: 'Dispensa por nivelamento: ' }), 'a avaliação de nivelamento indicou nível avançado nesta disciplina, e a prova final já está liberada. As aulas continuam disponíveis para revisão.')) : null,
        !fasesOk && !atalho && cfg.exigeFases && (Nuvem.ehAdmin() || Nuvem.ehProfessor()) ? h('p', { class: 'jogo-card__dica', text: `Como ${Nuvem.ehAdmin() ? 'admin' : 'professor'}, você pode fazer a prova sem completar as fases (para conferir).` }) : null,
        liberada
          ? h('button', { type: 'button', class: 'botao botao--primario botao--grande', onclick: iniciarProva }, icone('i-trofeu'), provas.length ? 'Fazer a prova de novo' : 'Começar a prova')
          : h('a', { class: 'botao botao--secundario', href: '#mergulho' }, 'Voltar ao mapa e completar as fases')),
      aprovacao ? null : retorno, // com os módulos em dia e a prova por fazer, depois do "Como funciona"
      fasesOk && !aprovacao && temDetetive(trilha) ? h('div', { class: 'cartao prova-detetive' },
        h('h2', { class: 'cartao__titulo', text: 'Antes da prova, relaxe' }),
        h('p', { class: 'texto-suave', text: 'Que tal um caso da Operação Recife Sombrio antes de começar? A Diver foi invadida, e você investiga com o que aprendeu. Ajuda a chegar na prova de cabeça leve.' }),
        h('button', { type: 'button', class: 'botao botao--secundario', onclick: abrirDetetive }, icone('i-lupa'), 'Jogar o detetive')) : null,
      h('div', { class: 'cartao' },
        h('h2', { class: 'cartao__titulo', text: 'Suas tentativas' }),
        provas.length
          ? h('div', { class: 'historico' }, h('ul', {}, provas.slice(0, 10).map((p) => h('li', {},
            h('span', { text: `${new Date(p.data).toLocaleDateString('pt-BR')} · ${p.acertos}/${p.total} (${p.pct}%) · ${formatarTempo(p.tempoSeg)}` }),
            h('strong', { class: p.aprovado ? 'texto-sucesso' : 'texto-erro', text: p.aprovado ? `Aprovado · ${p.nota.toLocaleString('pt-BR')}` : `Nota ${p.nota.toLocaleString('pt-BR')}` })))))
          : h('p', { class: 'texto-suave', text: 'Nenhuma tentativa ainda. Quando estiver pronto, é só começar.' }))].filter(Boolean));
  }

  async function iniciarProva() {
    if (estado.trilha._parcial) return comCursoCompleto(iniciarProva); // o sorteio com reforço precisa das questões
    const cfg = configProva(estado.trilha);
    if (!(await UI.confirmar({
      titulo: 'Começar a prova final?', texto: `A prova tem ${cfg.quantidade} questões e ${cfg.minutos} minutos. O cronômetro começa assim que você confirmar.`,
      sim: 'Bora!', nao: 'Agora não', foco: 'sim',
    }))) return;
    const trilha = estado.trilha;
    const questoesProva = cfg.reforco ? Caminho.questoesDaProva(trilha, estado.prog, cfg.quantidade) : undefined;
    iniciarSessao('prova', { quantidade: cfg.quantidade, minutos: cfg.minutos, aprovacao: cfg.aprovacao, questoesProva });
  }

  /* =========================================================
     SALA DE JOGOS
     ========================================================= */
  function renderizarSala() {
    const { trilha, prog } = estado;
    $('jogos-trilha').textContent = trilha.nome;
    const cartas = cartasDa(trilha);
    const area = limpar($('jogos-lista'));

    // Só aparece o que este curso realmente suporta: jogo sem conteúdo suficiente ou "em breve"
    // simplesmente não aparece (nada de card desabilitado). Grupo que fica vazio some junto.
    Jogos.GRUPOS.forEach((g) => {
      const jogos = Jogos.lista().filter((j) => j.grupo === g.id && (j.nucleo || Jogos.estado(j, cartas) === 'disponivel'));
      if (!jogos.length) return;
      const grade = h('div', { class: 'sala' });
      jogos.forEach((j) => grade.append(cardJogo(j, prog)));
      area.append(h('section', { class: 'sala-grupo', 'aria-label': g.nome },
        h('h2', { class: 'secao-titulo', text: g.nome }), h('p', { class: 'secao-sub', text: g.descricao }), grade));
    });
  }

  function cardJogo(j, prog) {
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
    return h('article', { class: 'jogo-card jogo-card--disponivel' },
      h('div', { class: 'jogo-card__topo' },
        h('span', { class: 'jogo-card__icone', 'aria-hidden': 'true' }, icone(j.icone || 'i-controle')),
        h('div', {}, h('h3', { class: 'jogo-card__nome', text: j.nome }), h('span', { class: 'texto-suave jogo-card__duracao', text: j.duracao }))),
      h('p', { class: 'jogo-card__descricao', text: j.descricao }),
      h('div', { class: 'jogo-card__rodape' },
        hist ? h('span', { class: 'jogo-card__hist', text: hist.melhor ? `Recorde: ${hist.melhor}` : plural(hist.partidas, 'partida', 'partidas') }) : null,
        selects,
        h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: jogar, 'aria-label': `Jogar ${j.nome}` }, j.nucleo ? 'Abrir' : 'Jogar')));
  }

  function iniciarJogo(id, opcoes = {}, { desafio = false } = {}) {
    if (!pacotesProntos.has('jogos')) return carregarPacotes(['jogos']).then(() => iniciarJogo(id, opcoes, { desafio }));
    if (estado.trilha && estado.trilha._parcial) return comCursoCompleto(() => iniciarJogo(id, opcoes, { desafio }));
    const def = Jogos.obter(id);
    if (!def || !estado.trilha) return;
    const cartas = cartasDa(estado.trilha);
    if (Jogos.estado(def, cartas) !== 'disponivel') {
      toast('Ainda não dá', 'Esta trilha não tem conteúdo para esse jogo.', 'i-bolha');
      return;
    }
    abandonarAndamento();
    cortina(`Abrindo ${def.nome}…`);
    estado.nivelInicial = Progresso.nivel(estado.prog.xp).numero;
    estado.subiuNivel = null;
    estado.jogo = { def, opcoes, desafio, controlador: null, fim: false };
    $('jogo-titulo').textContent = def.nome;
    const faseFlash = opcoes.fase && estado.trilha.fases.find((f) => f.id === opcoes.fase);
    $('jogo-rotulo').textContent = desafio ? 'Desafio do Dia · XP em dobro' : faseFlash ? `${estado.trilha.nome} · ${faseFlash.nome}` : estado.trilha.nome;
    $('tela-jogo').classList.toggle('tela--larga', !!def.largo); // ex.: Caso Resolvido (painel + log ao lado)
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
    Atividade.registrar('jogo_concluido', estado.trilha && estado.trilha.id, {
      jogo: partida.def.id, acertos: res.acertos, erros: res.erros, total: res.total, pontuacao: res.pontuacao,
      tempo_seg: res.tempoSegundos, perfeito: res.perfeito, desafio: !!partida.desafio, xp: r.xp, perolas: r.perolas,
      ...(res.registro || {}), // dados próprios do jogo (ex.: Palavrinha: variante, palavra do dia, tentativas)
    });
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
      modo: 'jogo', jogo: partida.def, opcoes: partida.opcoes, titulo: res.titulo, sub: res.subtitulo, desafio: partida.desafio, textoDeNovo: res.textoDeNovo,
      total: validos.length, acertos: res.acertos, pct: validos.length ? Math.round((res.acertos / validos.length) * 100) : 0,
      tempoSeg: res.tempoSegundos, porTema: Object.values(temas).sort((a, b) => a.acertos / a.total - b.acertos / b.total),
      paraRevisar: validos.filter((d) => !d.acertou),
      maiorCombo: r.comboMaximo, xp: r.xp, perolas: r.perolas, bonusJogo: res.bonus,
      emBranco: 0, faseConcluida: false, estrelas: 0, fase: null, nota: null,
    }, r.novas);
    mostrarTela('tela-resumo');
  }

  async function sairDoJogo() {
    if (!estado.jogo) return;
    if (!(await UI.confirmar({ titulo: 'Sair do jogo?', texto: 'Esta partida não vale XP.', sim: 'Sair do jogo', nao: 'Continuar jogando', humor: 'triste' }))) return;
    if (!estado.jogo) return;
    const daFase = !!(estado.jogo.opcoes && estado.jogo.opcoes.fase);
    abandonarAndamento();
    irPara(daFase ? 'mergulho' : 'jogos');
  }

  /* Flashcards da fase (fim do Mergulho → Cartas do Fundo → volta para a trilha) */
  function flashcardsDaFase(fase) {
    if (!fase || !estado.trilha || !Jogos.obter('cartas-do-fundo')) return 0;
    return cartasDa(estado.trilha).flash.filter((c) => c.fase === fase.id).length;
  }

  function abrirFlashcards(fase) {
    iniciarJogo('cartas-do-fundo', { fase: fase.id });
  }

  /* Detetive antes da prova: cursos com o Caso Resolvido (hoje, Cibersegurança) sugerem
     relaxar na Operação Recife Sombrio quando todas as fases estão feitas e a prova ainda não. */
  function temDetetive(trilha) {
    if (trilha && trilha._parcial) return !!(trilha.contagem && trilha.contagem.casos); // pelo catálogo
    const def = Jogos.obter('caso');
    return !!(def && trilha && Jogos.estado(def, cartasDa(trilha)) === 'disponivel');
  }

  function cursoCompleto(trilha, prog) {
    return Progresso.fasesExigidas(prog, trilha).every((f) => prog.fases[f.id] && prog.fases[f.id].concluida);
  }

  function detetiveAntesDaProva(trilha, prog) {
    return temDetetive(trilha) && cursoCompleto(trilha, prog) && !(prog.provas || []).some((p) => p.aprovado);
  }

  function abrirDetetive() {
    iniciarJogo('caso', { antesDaProva: true });
  }

  function sugerirDetetive() {
    setTimeout(async () => {
      if ($('tela-resumo').hidden || document.querySelector('dialog[open]')) return;
      const ok = await UI.confirmar({
        titulo: 'Antes da prova, um caso para relaxar?',
        texto: 'Você completou todas as fases! Antes da Prova final, que tal desligar um pouco com a Operação Recife Sombrio? A Diver foi invadida e quem investiga é você, usando o que aprendeu no curso.\n\nA prova continua esperando: quando quiser, é só voltar.',
        sim: 'Jogar o detetive', nao: 'Agora não', humor: 'feliz', foco: 'sim',
      });
      if (ok && !$('tela-resumo').hidden) abrirDetetive();
    }, movimentoReduzido ? 300 : 900);
  }

  /** Caixa do Diver logo depois do resultado: sugere fixar a matéria com flashcards. */
  function sugerirFlashcards(fase) {
    setTimeout(async () => {
      if ($('tela-resumo').hidden || document.querySelector('dialog[open]')) return;
      const ok = await UI.confirmar({
        titulo: 'Bora fixar com flashcards?',
        texto: `Você acabou de mergulhar em ${fase.nome}. Agora, umas cartas rápidas dessa matéria ajudam a guardar o que caiu.\n\nQuando terminar, um botão traz você de volta para a trilha.`,
        sim: 'Fazer flashcards', nao: 'Agora não', humor: 'feliz', foco: 'sim',
      });
      if (ok && !$('tela-resumo').hidden) abrirFlashcards(fase);
    }, movimentoReduzido ? 300 : 900);
  }

  /* =========================================================
     SESSÃO DE ESTUDO (QUIZ) — Mergulho, Simulado e Revisão
     ========================================================= */
  function iniciarSessao(modo, opcoes = {}) {
    if (estado.trilha && estado.trilha._parcial) return comCursoCompleto(() => iniciarSessao(modo, opcoes));
    if (modo === 'mergulho' && opcoes.faseId) {
      const fase = estado.trilha.fases.find((f) => f.id === opcoes.faseId);
      if (precisaLer(fase)) { avisarLeitura(fase); return; }
    }
    const s = Quiz.criar(modo, estado.trilha, estado.prog, opcoes);
    Caminho.antesDaSessao(s); // Ensino Médio: há quantos dias não estudava (bônus "Retorno aos estudos")
    if (modo === 'enviada') s.provaRef = estado.ultimaProvaEnviada = opcoes.ref;
    if (!s.fila.length) {
      toast('Ops', modo === 'revisao' ? 'Não há questões para revisar.' : 'Essa fase ainda não tem questões.', 'i-bolha');
      return;
    }
    cortina({
      mergulho: s.fase ? `Descendo para ${s.fase.nome}…` : 'Bora mergulhar!',
      simulado: 'Preparando o simulado…',
      revisao: opcoes.tema ? `Mergulhando fundo em ${opcoes.tema}…` : 'Voltando ao que ficou pra trás…',
      prova: 'Prova final: respira fundo…',
      enviada: `Abrindo ${s.titulo || 'a prova'}…`,
    }[modo] || 'Bora mergulhar!');
    estado.sessao = s;
    if (modo === 'mergulho' && s.fase) lembrarFase(s.fase.id);
    estado.origem = modo === 'enviada' ? 'simulado' : modo; // volta para a área de onde saiu (mergulho, simulado ou revisao)
    estado.nivelInicial = Progresso.nivel(estado.prog.xp).numero;
    estado.subiuNivel = null;
    salvar();

    $('quiz-oxigenio').hidden = s.oxigenio === null;
    $('quiz-timer').hidden = s.limiteSeg === null;
    $('quiz-modo').textContent = s.fase ? `${NOMES_MODO[modo]} · ${s.fase.nome}` : s.titulo ? `${NOMES_MODO[modo]} · ${s.titulo}` : NOMES_MODO[modo];
    $('quiz-contador').title = $('quiz-modo').textContent; // no celular o rótulo some; o nome da sessão fica na dica do contador

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
    UI.progresso($('quiz-barra'), pct);
    $('quiz-barra').setAttribute('aria-valuemax', s.fila.length);
    $('quiz-barra').setAttribute('aria-valuenow', s.indice);
    $('quiz-contador').textContent = `${s.indice + 1}/${s.fila.length}`;
    $('quiz-contador').setAttribute('aria-label', `Questão ${s.indice + 1} de ${s.fila.length}`);

    $('quiz-tema').textContent = q.tema;
    const dif = $('quiz-dificuldade');
    dif.textContent = NOMES_DIFICULDADE[q.dificuldade];
    dif.className = `tag tag--${q.dificuldade}`;
    dif.hidden = s.modo === 'enviada'; // prova enviada não tem nível de dificuldade
    // Revisão: avisa quando a questão é uma versão nova (variante) ou outra do mesmo tema (substituta)
    const versao = $('quiz-versao');
    versao.hidden = !q.tipoRevisao;
    versao.textContent = q.tipoRevisao === 'variante' ? 'Versão nova' : 'Mesmo tema';
    versao.title = q.tipoRevisao === 'variante'
      ? 'Mesma habilidade da questão que você errou, com outros números e outra situação.'
      : 'Outra questão do mesmo assunto, para treinar o que ficou pra trás.';
    $('btn-marcar').hidden = s.modo === 'enviada'; // nem entra na Revisão (as questões não são da trilha)
    $('quiz-volta').hidden = s.indice < Quiz.totalPlanejado(s);

    $('quiz-enunciado').textContent = q.enunciado;
    // Questão com código (campo opcional "codigo", Explora Tech): bloco monoespaçado abaixo do enunciado
    $('quiz-codigo').hidden = !q.codigo;
    $('quiz-codigo').firstElementChild.textContent = q.codigo ? String(q.codigo).replace(/\n+$/, '') : '';
    // As alternativas aparecem embaralhadas: a resposta certa não fica sempre na mesma letra.
    // estado.ordem[posição na tela] = índice original no JSON
    estado.ordem = embaralhar(q.alternativas.map((_, i) => i));
    const alts = limpar($('quiz-alternativas'));
    estado.ordem.forEach((original, pos) => {
      alts.append(h('button', {
        type: 'button',
        class: q.alternativasCodigo ? 'alternativa alternativa--codigo' : 'alternativa',
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
    const e = estado.prog.questoes[Quiz.idNoProgresso(q)];
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
    Atividade.registrar('questao_respondida', estado.trilha && estado.trilha.id, {
      modo: s.modo, questao: q.id, revisa_de: q.revisaDe, acertou: r.acertou,
      dificuldade: q.dificuldade, tema: q.tema, fase: q.fase || (s.fase && s.fase.id),
    });
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
      // Os números contam de 0 até o ganho (Onda 5); o texto final é o mesmo de antes
      const xpEl = h('span', { text: '0' });
      const perolasEl = h('span', { text: '0' });
      limpar($('feedback-ganho')).append('+', xpEl, ' XP · +', perolasEl, ` ${r.perolas === 1 ? 'pérola' : 'pérolas'}`,
        r.combo >= 3 ? ` · sequência de ${r.combo}` : '');
      UI.contar(xpEl, 0, r.xp);
      UI.contar(perolasEl, 0, r.perolas);
    } else {
      $('feedback-titulo').textContent = r.semOxigenio ? 'Acabou o oxigênio!' : sortear(MSGS_ERRO);
      $('feedback-ganho').textContent = `Resposta certa: ${LETRAS[estado.ordem.indexOf(q.correta)]}) ${q.alternativas[q.correta]}`;
    }
    mostrarExplicacao(q);
    const ultima = r.semOxigenio || s.indice === s.fila.length - 1;
    $('btn-continuar').textContent = ultima ? 'Ver resumo' : 'Continuar';
    painel.hidden = false;
    // O painel entra logo abaixo das alternativas (não cobre a questão); a página rola só o necessário
    requestAnimationFrame(() => painel.scrollIntoView({ block: 'nearest', behavior: movimentoReduzido ? 'auto' : 'smooth' }));
    $('btn-continuar').focus({ preventScroll: true });
  }

  /**
   * Explicação da questão: o texto principal, "Por que não as outras" (comentarios[i], um por
   * alternativa, na ordem do JSON; aparece na ordem em que as letras estão na tela) e a
   * "Dica de mergulhador" em destaque (quando a explicação traz esse trecho).
   */
  function mostrarExplicacao(q) {
    const caixa = limpar($('feedback-explicacao'));
    const texto = String(q.explicacao || '');
    const corte = texto.search(/Dica de mergulhador:/i);
    const principal = (corte >= 0 ? texto.slice(0, corte) : texto).trim();
    const dica = corte >= 0 ? texto.slice(corte).replace(/^Dica de mergulhador:\s*/i, '').trim() : '';
    if (principal) caixa.append(h('p', {}, comNegrito(principal)));
    const comentarios = Array.isArray(q.comentarios) ? q.comentarios : [];
    const erradas = estado.ordem
      .map((original, pos) => ({ original, pos }))
      .filter(({ original }) => original !== q.correta && comentarios[original]);
    if (erradas.length) {
      caixa.append(h('div', { class: 'feedback__outras' },
        h('p', { class: 'feedback__outras-titulo', text: 'Por que não as outras' }),
        h('ul', {}, erradas.map(({ original, pos }) => h('li', {},
          h('strong', { text: `${LETRAS[pos]}) ` }), comNegrito(comentarios[original]))))));
    }
    if (dica) caixa.append(h('p', { class: 'feedback__dica' }, h('strong', { text: 'Dica de mergulhador: ' }), comNegrito(dica)));
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

  async function sairDoQuiz() {
    const s = estado.sessao;
    if (!s) return;
    const temRespostas = s.respostas.length > 0;
    const caixa = s.modo === 'enviada'
      ? { titulo: 'Sair da prova?', texto: 'Ela só vale nota e pontos quando é entregue até o fim.', sim: 'Sair da prova', nao: 'Continuar a prova' }
      : { titulo: 'Subir agora?', texto: temRespostas ? 'O que você já respondeu fica salvo.' : 'Nada foi respondido ainda.', sim: 'Subir agora', nao: 'Continuar mergulhando' };
    if (!(await UI.confirmar({ ...caixa, humor: 'triste' }))) return;
    if (estado.sessao !== s) return; // a sessão acabou enquanto a caixa estava aberta (ex.: o tempo da prova)
    if (temRespostas) encerrarSessao('saiu');
    else {
      pararTimer();
      estado.sessao = null;
      irPara(estado.origem);
    }
  }

  /** Log de atividade: uma linha por sessão de estudo (docs/ATIVIDADE.md). */
  const TIPO_SESSAO = { mergulho: 'mergulho_sessao', revisao: 'revisao_sessao', simulado: 'simulado_concluido', enviada: 'simulado_concluido', prova: 'prova_concluida' };
  function registrarSessao(s, resumo, motivo) {
    if (!TIPO_SESSAO[s.modo] || !resumo) return;
    Atividade.registrar(TIPO_SESSAO[s.modo], s.trilha && s.trilha.id, {
      modo: s.modo, motivo, total: resumo.total, acertos: resumo.acertos, pct: resumo.pct, tempo_seg: resumo.tempoSeg,
      fase: s.fase && s.fase.id, estrelas: resumo.estrelas || undefined, fase_concluida: s.modo === 'mergulho' ? !!resumo.faseConcluida : undefined,
      nota: resumo.nota === null ? undefined : resumo.nota, aprovado: s.modo === 'prova' && motivo !== 'saiu' ? !!resumo.aprovado : undefined,
      em_branco: resumo.emBranco || undefined, origem: s.modo === 'enviada' ? 'prova_enviada' : undefined,
      xp: resumo.xp, perolas: resumo.perolas,
    });
  }

  function encerrarSessao(motivo) {
    const s = estado.sessao;
    if (!s || s.encerrada) return;
    pararTimer();
    $('quiz-feedback').hidden = true;
    const resumo = Quiz.finalizar(s, estado.prog, motivo);
    registrarSessao(s, resumo, motivo);
    if (s.modo === 'enviada' && motivo !== 'saiu') ProvasEnviadas.registrarTentativa(s.provaRef, resumo);
    Caminho.depoisDaSessao(s, resumo, estado.prog); // Ensino Médio: bônus "Primeira aula concluída" e "Retorno aos estudos"
    estado.respostasProva = s.modo === 'prova' ? s.respostas : null;
    checarNivel();
    const novas = Conquistas.verificar(estado.prog, estado.trilha);
    salvar();
    avisarConquistas(novas);
    renderizarResumo(resumo, novas);
    mostrarTela('tela-resumo');
    if (s.modo === 'mergulho' && resumo.faseConcluida && resumo.bonus && resumo.bonus.primeiraVez && detetiveAntesDaProva(estado.trilha, estado.prog)) sugerirDetetive();
    else if (s.modo === 'mergulho' && resumo.faseConcluida && labPendente(s.fase)) sugerirLaboratorio(s.fase);
    else if (s.modo === 'mergulho' && motivo !== 'saiu' && flashcardsDaFase(s.fase) >= 4) sugerirFlashcards(s.fase);
  }

  /* ---------- Caminho da aula com laboratório (Explora Tech): Ler → Questões → Mão na massa → próxima aula ---------- */
  /** O laboratório ainda não feito da aula (id), ou null. */
  function labPendente(fase) {
    if (!fase || typeof Laboratorios === 'undefined' || !estado.trilha) return null;
    const id = Laboratorios.pendenteDaAula(estado.trilha.id, fase);
    return id && Jogos.obter(id) ? id : null;
  }
  function abrirLaboratorio(fase, id = labPendente(fase) || Laboratorios.daAula(fase)[0]) {
    if (id && Jogos.obter(id)) iniciarJogo(id, { fase: fase.id });
  }
  /** A aula seguinte do curso (ou null no fim). */
  function aulaSeguinte(fase) {
    const fases = estado.trilha.fases;
    const i = fases.findIndex((f) => f.id === fase.id);
    return i >= 0 ? fases[i + 1] || null : null;
  }
  /** Vai para a próxima aula: abre o mapa nela e o "Antes de mergulhar" (o passo 1 do caminho). */
  function irParaAula(fase) {
    irPara('mergulho');
    setTimeout(() => {
      focarAula(fase.id);
      const i = estado.trilha.fases.findIndex((f) => f.id === fase.id);
      if (fase.resumo) abrirResumo(fase, Progresso.faseDesbloqueada(estado.prog, estado.trilha, i));
    }, movimentoReduzido ? 50 : 400);
  }
  /** Caixa do Diver logo depois das questões: o próximo passo é pôr a mão na massa. */
  function sugerirLaboratorio(fase) {
    const id = labPendente(fase);
    const def = id && Jogos.obter(id);
    if (!def) return;
    setTimeout(async () => {
      if ($('tela-resumo').hidden || document.querySelector('dialog[open]')) return;
      const ok = await UI.confirmar({
        titulo: 'Agora, mão na massa!',
        texto: `Você terminou as questões de ${fase.nome}. O próximo passo é o laboratório ${def.nome}: é ali que você escreve o código e vê acontecer. Depois dele, vem a próxima aula.`,
        sim: `Abrir o ${def.nome}`, nao: 'Agora não', humor: 'feliz', foco: 'sim',
      });
      if (ok && !$('tela-resumo').hidden) abrirLaboratorio(fase, id);
    }, movimentoReduzido ? 300 : 900);
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
        if (detetiveAntesDaProva(trilha, estado.prog)) sub = 'Todas as fases feitas! Antes da Prova final, relaxe com a Operação Recife Sombrio: o caso usa tudo o que você aprendeu.';
        else if (!proxima) sub = 'Você tocou o fundo desta trilha. Lá embaixo é silencioso, e o silêncio é de respeito.';
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

    const faseFlash = r.modo === 'jogo' && r.opcoes && r.opcoes.fase && trilha.fases.find((f) => f.id === r.opcoes.fase);
    $('resumo-rotulo').textContent = r.modo === 'jogo'
      ? `${r.jogo.nome} · ${faseFlash ? faseFlash.nome : trilha.nome}`
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
    const rsXp = h('span', { text: '0' });
    const rsPerolas = h('span', { text: '0' });
    limpar($('rs-xp')).append('+', rsXp);
    limpar($('rs-perolas')).append('+', rsPerolas);
    UI.contar(rsXp, 0, r.xp, 600);
    UI.contar(rsPerolas, 0, r.perolas, 600);
    if (r.faseConcluida && r.bonus && r.bonus.primeiraVez) UI.confete(); // fim de fase: comemoração discreta

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
    const blocoProva = r.modo === 'prova' && estado.respostasProva ? Caminho.blocoResumoProva(trilha, r, estado.respostasProva) : null;
    if (blocoProva) extras.append(blocoProva); // Ensino Médio: "Módulos para revisar" ou "Disciplina concluída"

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
    const flash = $('btn-resumo-flash');
    flash.hidden = true;
    const detetive = $('btn-resumo-detetive');
    detetive.hidden = true;
    detetive.onclick = abrirDetetive;
    const ehLab = r.modo === 'jogo' && r.jogo && r.jogo.grupo === 'laboratorios';
    if (ehLab && faseFlash) {
      // Laboratório aberto pela aula: o caminho segue para o próximo laboratório da aula ou para a próxima aula
      const outro = labPendente(faseFlash);
      const seguinte = aulaSeguinte(faseFlash);
      if (outro && outro !== r.jogo.id) {
        principal.textContent = `Próximo passo: ${Jogos.obter(outro).nome}`;
        principal.onclick = () => abrirLaboratorio(faseFlash, outro);
      } else if (!outro && seguinte) {
        principal.textContent = `Próxima aula: ${seguinte.nome}`;
        principal.onclick = () => irParaAula(seguinte);
      } else {
        principal.textContent = outro ? 'Continuar o laboratório' : 'Voltar ao mapa';
        principal.onclick = () => (outro ? abrirLaboratorio(faseFlash, outro) : irPara('mergulho'));
      }
      voltar.textContent = 'Voltar ao laboratório';
      voltar.onclick = () => iniciarJogo(r.jogo.id, { fase: faseFlash.id });
    } else if (r.modo === 'jogo' && faseFlash) {
      // Flashcards que vieram do fim do Mergulho: o caminho principal é voltar para a trilha
      principal.textContent = 'Voltar para a trilha';
      principal.onclick = () => irPara('mergulho');
      voltar.textContent = 'Mais cartas desta fase';
      voltar.onclick = () => abrirFlashcards(faseFlash);
    } else if (r.modo === 'jogo') {
      principal.textContent = r.textoDeNovo || 'Jogar de novo'; // ex.: Caso Resolvido: "Voltar às missões"
      principal.onclick = () => iniciarJogo(r.jogo.id, estado.ultimoJogoOpcoes || {});
      const antesDaProva = r.opcoes && r.opcoes.antesDaProva;
      voltar.textContent = antesDaProva ? 'Ir para a Prova final' : 'Voltar à Sala de Jogos';
      voltar.onclick = () => irPara(antesDaProva ? 'prova' : 'jogos');
      estado.ultimoJogoOpcoes = estado.jogo ? estado.jogo.opcoes : {};
    } else if (r.modo === 'mergulho') {
      const i = trilha.fases.findIndex((f) => f.id === r.fase.id);
      const proxima = trilha.fases[i + 1];
      const lab = r.faseConcluida && labPendente(r.fase);
      if (lab) {
        // Aula com laboratório (Explora Tech): depois das questões, o próximo passo é a mão na massa
        principal.textContent = `Próximo passo: ${Jogos.obter(lab).nome}`;
        principal.onclick = () => abrirLaboratorio(r.fase, lab);
      } else if (r.faseConcluida && proxima) {
        principal.textContent = `Descer para ${proxima.nome}`;
        principal.onclick = () => (typeof Laboratorios !== 'undefined' && Laboratorios.daAula(r.fase).length ? irParaAula(proxima) : iniciarSessao('mergulho', { faseId: proxima.id }));
      } else {
        principal.textContent = r.faseConcluida ? 'Refazer fase' : 'Tentar de novo';
        principal.onclick = () => iniciarSessao('mergulho', { faseId: r.fase.id });
      }
      voltar.textContent = 'Voltar ao mapa';
      voltar.onclick = () => irPara('mergulho');
      if (r.motivo !== 'saiu' && flashcardsDaFase(r.fase) >= 4) {
        flash.hidden = false;
        flash.onclick = () => abrirFlashcards(r.fase);
      }
      if (r.faseConcluida && detetiveAntesDaProva(trilha, prog)) {
        detetive.hidden = false;
        principal.textContent = 'Ir para a Prova final';
        principal.onclick = () => irPara('prova');
      }
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
    $('btn-tutorial').addEventListener('click', () => {
      fecharMenu();
      if (Tutorial.tem(secaoTutorial())) Tutorial.iniciar(secaoTutorial());
      else toast('Sem tutorial por aqui', 'Esta página é tranquila: é só explorar.', 'i-bolha');
    });

    // Fecha o seletor "Trilha atual" ao clicar fora dele
    document.addEventListener('click', (e) => {
      const box = $('seletor-trilha');
      if (box.classList.contains('seletor-trilha--aberto') && !box.contains(e.target)) abrirSeletorTrilha(false);
    });

    $('input-importar').addEventListener('change', importarTrilhas);

    $('btn-trocar-trilha').addEventListener('click', voltarDoCurso);
    $('select-meta').addEventListener('change', (e) => {
      estado.prog.metaDiaria = Number(e.target.value);
      avisarConquistas(Conquistas.verificar(estado.prog, estado.trilha));
      salvar();
      renderizarStatus();
      renderizarConquistas();
      atualizarLateral();
    });
    $('btn-simulado').addEventListener('click', () => {
      const b = $('btn-simulado');
      UI.carregando(b, true);
      Promise.resolve().then(() => iniciarSessao('simulado', { quantidade: Number($('select-simulado').value) })).finally(() => UI.carregando(b, false));
    });
    $('btn-revisao').addEventListener('click', () => iniciarSessao('revisao'));
    $('btn-zerar').addEventListener('click', async () => {
      if (!(await UI.confirmar({
        titulo: 'Zerar o progresso?', texto: `XP, pérolas, fases e conquistas de "${estado.trilha.nome}" voltam ao zero.`,
        sim: 'Zerar progresso', humor: 'triste', perigo: true,
      }))) return;
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
      const marcada = Progresso.alternarMarcada(estado.prog, Quiz.idNoProgresso(q)); // variante marca a original
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
    Mascotes.aplicar(); // rosto escolhido no Perfil (o padrão é o pinguim de penacho)
    UI.montarMascotes();
    criarBolhas();
    ligarEventos();
    await Conta.garantir(); // com Supabase configurado: login + senha própria + progresso da nuvem
    Mascotes.aplicar(); // a escolha pode ter vindo da nuvem junto com o progresso
    Nuvem.Sincronia.aoMudar(() => atualizarConta());
    Atividade.iniciar(); // log de atividade: envia em lotes (com login) ou guarda no navegador
    await carregarTrilhas();
    const secao = location.hash.slice(1);
    navegar(rotaExiste(secao) ? secao : 'inicio');
  }

  // Deixa o resto do código carregar antes de começar (outros scripts usam App.*)
  document.addEventListener('DOMContentLoaded', iniciar);

  return {
    trilhas: () => estado.trilhas,
    nomeCurso: (id) => (estado.nomesCursos && estado.nomesCursos.get(id)) || id,
    trilhaAtual: () => estado.trilha,
    progAtual: () => estado.prog,
    salvarAtual: () => { if (estado.trilha && estado.prog) salvar(); },
    comCursoCompleto,
    definirTrilha,
    abrirTrilha,
    entrarNaSala,
    irPara,
    iniciarProvaEnviada: (opcoes) => iniciarSessao('enviada', opcoes),
    concederXP,
    recarregarTrilhas,
    podeGerenciar,
  };
})();

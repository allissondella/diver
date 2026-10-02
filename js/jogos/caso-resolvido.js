/*
 * Caso Resolvido (caso) — "Operação Recife Sombrio": investigação em 4 missões.
 *
 * Só existe no curso que tem o bloco "casos" com tipo "operacao" (hoje: Cibersegurança Essencial).
 * A Sombra invadiu a Diver e roubou o código do Diver 2.0. O jogador é do time de resposta (SOC):
 *  - Painel do caso: seu cartão (pontos, pistas, chave-mestra), as 4 missões em sequência
 *    (terminou uma, abre a próxima) e o LOG DE EVENTOS ao lado.
 *  - Missão 1 · A Isca: triagem de 8 e-mails (@diver.app.br e domínios imitados), com
 *    "Ver cabeçalho" (SPF, DKIM, DMARC, Return-Path), endereço real dos links e armadilhas.
 *    Triagem certa → perícia: decodificar o X-Trace (Base64) do e-mail falso → Pista A (QUEM).
 *  - Missões 2 a 4, chaves do dia e tabuleiro de acusação: nas próximas partes.
 * Pontos da missão (créditos) viram XP e pérolas pela economia central (Jogos.resultado → aoTerminar).
 * Missão já concluída pode ser refeita como treino (sem pontos de missão).
 * Estado em localStorage "diver:v1:operacao" (sincroniza com a nuvem como o resto do "diver:v1:").
 * Formato do bloco: docs/JOGOS.md, "Caso Resolvido".
 */
const CasoResolvido = (() => {
  const CHAVE = 'diver:v1:operacao';
  const LOG_MAX = 80;

  const texto = (v) => typeof v === 'string' && v.trim() !== '';

  /** O caso tem o mínimo para jogar? (vem de JSON, então conferimos) */
  function valido(c) {
    if (!c || c.tipo !== 'operacao' || !texto(c.id) || !texto(c.titulo)) return false;
    if (!Array.isArray(c.missoes) || !c.missoes.length || !Array.isArray(c.pistas)) return false;
    const emails = c.isca && c.isca.emails;
    return Array.isArray(emails) && emails.length >= 4
      && emails.every((e) => e && texto(e.id) && texto(e.email) && texto(e.assunto) && Array.isArray(e.corpo) && typeof e.phishing === 'boolean')
      && emails.some((e) => e.forense && e.cabecalho && e.cabecalho.extra && texto(e.cabecalho.extra['X-Trace']));
  }

  /** Estado salvo de um caso: { missoes: { id: { pontos, quando } }, pistas: ['A'], chave: [], log: [] } */
  function ler(casoId) {
    const tudo = Dados.ler(CHAVE, {}) || {};
    const e = tudo[casoId] || {};
    return {
      missoes: e.missoes && typeof e.missoes === 'object' ? e.missoes : {},
      pistas: Array.isArray(e.pistas) ? e.pistas : [],
      chave: Array.isArray(e.chave) ? e.chave : [],
      log: Array.isArray(e.log) ? e.log.slice(0, LOG_MAX) : [],
    };
  }

  function gravar(casoId, estado) {
    const tudo = Dados.ler(CHAVE, {}) || {};
    tudo[casoId] = { ...estado, log: estado.log.slice(0, LOG_MAX) };
    Dados.gravar(CHAVE, tudo);
  }

  /** A Sombra: polvo sombrio, vilão do caso (SVG fixo deste arquivo). */
  const SOMBRA = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 8 C25 8 17 29 19 49 C20 59 23 65 27 69 Q21 81 12 85 Q25 89 34 76 Q36 86 31 95 Q42 91 44 78 Q47 90 50 97 Q53 90 56 78 Q58 91 69 95 Q64 86 66 76 Q75 89 88 85 Q79 81 73 69 C77 65 80 59 81 49 C83 29 75 8 50 8 Z"
      fill="#0A1A33" stroke="#C4B5FD" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 26 Q50 14 70 26" fill="none" stroke="#C4B5FD" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>
    <path d="M32 42 L46 47 L44 54 L33 51 Z" fill="#FB7185"/><path d="M68 42 L54 47 L56 54 L67 51 Z" fill="#FB7185"/>
    <circle cx="41" cy="50" r="1.6" fill="#FFE4E8"/><circle cx="59" cy="50" r="1.6" fill="#FFE4E8"/>
    <path d="M39 63 L43 60 L47 63 L51 60 L55 63 L59 60 L62 62" fill="none" stroke="#5EEAD4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  /** Texto do JSON com **negrito** e quebras de linha, sem innerHTML. */
  function rico(t) {
    const nos = [];
    String(t || '').split('\n').forEach((linha, i) => {
      if (i) nos.push(UI.h('br'));
      linha.split(/\*\*(.+?)\*\*/).forEach((parte, j) => {
        if (parte) nos.push(j % 2 ? UI.h('strong', { text: parte }) : parte);
      });
    });
    return nos;
  }

  /** Base64 → texto (UTF-8). Devolve null se não for Base64 válido. */
  function deBase64(valor) {
    try {
      const bin = atob(String(valor).replace(/\s+/g, ''));
      return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    } catch (e) {
      return null;
    }
  }

  const hostDe = (url) => {
    try { return new URL(url).host; } catch (e) { return String(url || ''); }
  };

  return { CHAVE, valido, ler, gravar, SOMBRA, rico, deBase64, hostDe };
})();

Jogos.registrar({
  id: 'caso',
  nome: 'Caso Resolvido',
  grupo: 'estrategia',
  icone: 'i-lupa',
  largo: true, // a tela do jogo usa a largura grande (painel + log de eventos)
  descricao: 'Operação Recife Sombrio: quatro missões de investigação para pegar a Sombra antes do lançamento.',
  duracao: '10-20 min por missão',
  requer: { casos: 1 },

  iniciar(ctx) {
    const { h, icone } = UI;
    const { rico, hostDe } = CasoResolvido;
    const caso = ctx.cartas.casos[0];
    const est = CasoResolvido.ler(caso.id);
    const raiz = ctx.container;
    let limparTela = () => {}; // desliga cronômetros e atalhos da tela atual

    const salvar = () => CasoResolvido.gravar(caso.id, est);
    const pontosTotais = () => Object.values(est.missoes).reduce((s, m) => s + (Number(m.pontos) || 0), 0);
    const pistaDe = (letra) => (caso.pistas || []).find((p) => p.letra === letra);
    const mm = (seg) => `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
    const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeJogador = () => {
      const p = typeof Nuvem !== 'undefined' && Nuvem.perfil && Nuvem.perfil();
      return (p && p.nome && p.nome.trim().split(/\s+/)[0]) || 'Diver';
    };

    /* ---------- Log de eventos (fica salvo; o mais novo em cima) ---------- */
    const listaLog = h('ol', { class: 'op-log__lista' });
    const contadorLog = h('span', { class: 'op-log__contador' });

    function registrar(tipo, textoLog, pts = null) {
      est.log.unshift({ t: Date.now(), tipo, texto: textoLog, pts });
      salvar();
      desenharLog();
    }

    function desenharLog() {
      contadorLog.textContent = String(est.log.length);
      listaLog.replaceChildren(...(est.log.length
        ? est.log.map((e) => h('li', { class: 'op-log__item' },
          h('span', { class: 'op-log__hora', text: hora(e.t) }),
          h('span', { class: `op-log__tipo op-log__tipo--${String(e.tipo).split('.')[0]}`, text: e.tipo }),
          h('span', { class: 'op-log__texto', text: e.texto }),
          h('span', { class: `op-log__pts ${e.pts > 0 ? 'op-log__pts--mais' : e.pts < 0 ? 'op-log__pts--menos' : ''}`, text: e.pts ? `${e.pts > 0 ? '+' : ''}${e.pts}` : '' })))
        : [h('li', { class: 'op-log__vazio', text: 'Nada por aqui ainda. Cada passo da investigação aparece neste log.' })]));
    }

    const lateral = h('aside', { class: 'op-lateral', 'aria-label': 'Log de eventos' },
      h('details', { class: 'op-log', open: true },
        h('summary', { class: 'op-log__cabeca' },
          h('span', { class: 'op-rotulo', text: 'Log de eventos' }), contadorLog,
          h('span', { class: 'op-log__quem', text: nomeJogador() })),
        listaLog));
    const principal = h('div', { class: 'op-principal' });
    raiz.replaceChildren(h('div', { class: 'op-raiz' }, h('div', { class: 'op' }, principal, lateral)));
    // No celular o log começa fechado (fica embaixo da missão)
    if (window.matchMedia && window.matchMedia('(max-width: 699px)').matches) lateral.querySelector('details').open = false;
    desenharLog();

    function mostrar(...filhos) {
      limparTela();
      limparTela = () => {};
      principal.replaceChildren(...filhos);
      principal.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
    }

    /** Caixas "Como jogar" e "Créditos" do topo de cada missão. */
    function instrucoes(passos, creditos) {
      return h('div', { class: 'op-regras' },
        h('section', { class: 'op-caixa' },
          h('h3', { class: 'op-rotulo', text: 'Como jogar' }),
          h('ol', { class: 'op-regras__passos' }, passos.map((p) => h('li', {}, rico(p))))),
        h('section', { class: 'op-caixa' },
          h('h3', { class: 'op-rotulo', text: 'Créditos' }),
          h('dl', { class: 'op-creditos' }, creditos.map(([rotulo, valor]) => h('div', {},
            h('dt', { text: rotulo }),
            h('dd', { class: /^[+]|liberada|até \+/.test(valor) ? 'op-mais' : /^[−-]/.test(valor) ? 'op-menos' : '', text: valor }))))));
    }

    /* =====================================================================
       Painel do caso
       ===================================================================== */
    const MISSOES = { isca: missaoIsca }; // as outras chegam nas próximas partes

    /** Situação de cada missão: 'feita' | 'aberta' | 'trancada' | 'embreve' */
    function situacao(i) {
      const m = caso.missoes[i];
      if (est.missoes[m.id]) return 'feita';
      if (!MISSOES[m.id]) return 'embreve';
      const anterior = caso.missoes[i - 1];
      return !anterior || est.missoes[anterior.id] ? 'aberta' : 'trancada';
    }

    function painel() {
      const pontos = pontosTotais();
      const nPistas = est.pistas.length;
      const chave = [0, 1, 2, 3].map((i) => est.chave[i] || '_').join(' ');
      const proximaI = caso.missoes.findIndex((m, i) => situacao(i) === 'aberta');
      const proxima = caso.missoes[proximaI];

      const perfil = h('section', { class: 'op-caixa op-perfil', 'aria-label': 'Seu cartão de agente' },
        h('div', { class: 'op-perfil__topo' },
          UI.mascote('op-perfil__mascote'),
          h('div', {},
            h('strong', { class: 'op-perfil__nome', text: nomeJogador() }),
            h('span', { class: 'op-perfil__cargo', text: `SOC · nível ${Progresso.nivel(ctx.prog.xp).numero}` }))),
        h('dl', { class: 'op-perfil__numeros' },
          h('div', {}, h('dt', { text: 'pontos' }), h('dd', { text: String(pontos) })),
          h('div', { title: 'O ranking do caso chega na próxima atualização' }, h('dt', { text: 'ranking' }), h('dd', { text: '—' })),
          h('div', {}, h('dt', { text: 'pistas' }), h('dd', { text: `${nPistas}/4` }))),
        h('div', { class: 'op-barra', role: 'progressbar', 'aria-label': 'Pistas encontradas', 'aria-valuemin': '0', 'aria-valuemax': '4', 'aria-valuenow': String(nPistas) },
          h('span', { style: `width:${(nPistas / 4) * 100}%` })),
        h('p', { class: 'op-perfil__chave' }, 'chave-mestra: ', h('span', { text: chave })));
      perfil.querySelector('.op-perfil__mascote').setAttribute('aria-hidden', 'true');

      const sombra = h('span', { class: 'op-sombra', 'aria-hidden': 'true' });
      sombra.innerHTML = CasoResolvido.SOMBRA; // SVG fixo deste arquivo
      const banner = h('section', { class: 'op-caixa op-banner' },
        sombra,
        h('div', {},
          h('p', { class: 'op-rotulo op-rotulo--lilas', text: `Caso aberto · ${caso.titulo}` }),
          h('h2', { class: 'op-banner__titulo' }, `Lançamento do ${caso.lancamento || 'app'} `, h('span', { text: 'na sexta' })),
          h('p', { class: 'op-banner__texto', text: 'A Sombra tem o código do app. Feche o caso antes do lançamento.' }),
          h('details', { class: 'op-banner__arquivo' },
            h('summary', { text: 'Ler o arquivo do caso' }),
            h('p', { text: caso.historia || '' }))));

      const dias = h('ol', { class: 'op-dias', 'aria-label': 'Andamento do caso' }, caso.missoes.map((m, i) => {
        const s = situacao(i);
        return h('li', { class: `op-dia op-dia--${s}` },
          h('span', { text: `Dia ${m.dia || i + 1}` }),
          h('strong', { text: i === caso.missoes.length - 1 ? 'Acusação' : m.titulo }),
          s === 'feita' ? icone('i-check') : null,
          h('span', { class: 'visualmente-oculto', text: { feita: ' (concluída)', aberta: ' (liberada)', trancada: ' (trancada)', embreve: ' (em breve)' }[s] }));
      }));

      const destaque = proxima
        ? h('section', { class: 'op-caixa op-destaque' },
          h('div', {},
            h('p', { class: 'op-rotulo', text: 'Próxima missão' }),
            h('h3', { class: 'op-destaque__titulo', text: `Dia ${proxima.dia || proximaI + 1} · ${proxima.titulo}` }),
            h('p', { class: 'op-destaque__texto', text: proxima.resumo || '' })),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => MISSOES[proxima.id](false) }, 'Jogar'))
        : h('section', { class: 'op-caixa op-destaque' },
          h('div', {},
            h('p', { class: 'op-rotulo', text: 'Em andamento' }),
            h('h3', { class: 'op-destaque__titulo', text: 'Missão 1 concluída. A próxima chega na atualização do caso.' }),
            h('p', { class: 'op-destaque__texto', text: 'Sua pista fica guardada no caderno. Enquanto isso, dá para treinar a triagem de novo.' })));

      const ESTRELAS = ['★', '★★', '★★★', '★★★★'];
      const cards = h('ul', { class: 'op-missoes' }, caso.missoes.map((m, i) => {
        const s = situacao(i);
        const feita = est.missoes[m.id];
        const status = feita ? `concluída · card ${m.pista || ''} · +${feita.pontos} pts`
          : s === 'embreve' ? 'chega na próxima atualização'
            : s === 'trancada' ? `termine a Missão ${i}` : 'liberada';
        let botao;
        if (s === 'feita') botao = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => MISSOES[m.id] && MISSOES[m.id](true), disabled: !MISSOES[m.id] }, 'Treinar de novo');
        else if (s === 'aberta') botao = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => MISSOES[m.id](false) }, 'Jogar');
        else botao = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', disabled: true }, s === 'embreve' ? 'Em breve' : 'Trancada');
        return h('li', { class: `op-missao op-missao--${s} op-missao--n${i + 1}` },
          h('div', { class: 'op-missao__topo' },
            h('span', { class: 'op-missao__nivel', text: `Dia ${m.dia || i + 1} · ${m.nivel || ''}` }),
            h('span', { class: 'op-missao__estrelas', 'aria-label': `dificuldade ${i + 1} de 4`, text: ESTRELAS[i] || '' })),
          h('h3', { class: 'op-missao__titulo' }, m.titulo, feita ? icone('i-check') : null),
          h('p', { class: 'op-missao__resumo', text: m.resumo || '' }),
          h('p', { class: 'op-missao__status', text: status }),
          botao);
      }));

      mostrar(h('div', { class: 'op-painel' },
        h('div', { class: 'op-painel__topo' }, banner, perfil),
        dias, destaque, cards));
    }

    /* =====================================================================
       Missão 1 · A Isca — triagem de e-mails + perícia do cabeçalho
       ===================================================================== */
    function missaoIsca(treino) {
      const missao = caso.missoes.find((m) => m.id === 'isca');
      const emails = caso.isca.emails;
      const suspeito = emails.find((e) => e.forense) || emails.find((e) => e.phishing);
      const trace = suspeito.cabecalho.extra['X-Trace'];
      const inicio = Date.now();
      const marcado = {}; // id → 'legitimo' | 'phishing'
      const revisar = new Set(); // ids que o SOC devolveu
      const armadilhas = new Set(); // "emailId:url" já cobrados
      const detalhes = [];
      let penalidade = 0;
      let atual = 0;
      let verCabecalho = false;
      let primeiroEnvio = true;

      registrar('mission.open', `Missão 1 · ${missao.titulo}${treino ? ' (treino)' : ''}`);

      const relogio = h('span', { class: 'op-relogio', text: '00:00' });
      const contador = h('span', { class: 'op-contador' });
      const lista = h('ul', { class: 'op-caixa-entrada__lista' });
      const leitor = h('div', { class: 'op-leitor', 'aria-live': 'polite' });
      const aviso = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const botaoEnviar = h('button', { type: 'button', class: 'botao botao--primario', onclick: enviar }, icone('i-check'), 'Enviar triagem ao SOC');

      const nMarcados = () => emails.filter((e) => marcado[e.id]).length;
      function atualizarContagem() {
        contador.textContent = `${nMarcados()}/${emails.length} classificados`;
        botaoEnviar.disabled = nMarcados() < emails.length;
      }

      const tique = setInterval(() => (relogio.textContent = mm(Math.round((Date.now() - inicio) / 1000))), 1000);

      /* ----- caixa de entrada ----- */
      function desenharLista() {
        lista.replaceChildren(...emails.map((e, i) => {
          const m = marcado[e.id];
          const tag = revisar.has(e.id) ? h('span', { class: 'op-tag op-tag--revisar', text: 'revisar' })
            : m === 'phishing' ? h('span', { class: 'op-tag op-tag--reportado', text: 'reportado' })
              : m === 'legitimo' ? h('span', { class: 'op-tag op-tag--legitimo', text: 'legítimo' }) : null;
          return h('li', {},
            h('button', { type: 'button', class: `op-email ${i === atual ? 'op-email--atual' : ''} ${m ? '' : 'op-email--novo'}`, 'aria-current': i === atual ? 'true' : null, onclick: () => abrir(i) },
              h('span', { class: `op-avatar op-avatar--${e.cor || 'turquesa'}`, 'aria-hidden': 'true', text: (e.de || '?')[0] }),
              h('span', { class: 'op-email__meio' },
                h('span', { class: 'op-email__de', text: e.de }),
                h('span', { class: 'op-email__assunto', text: e.assunto }),
                h('span', { class: 'op-email__previa', text: e.previa || '' }),
                tag),
              h('span', { class: 'op-email__hora', text: e.hora || '' })));
        }));
      }

      /* ----- leitor de e-mail ----- */
      function abrir(i, { rolar = true } = {}) {
        atual = i;
        verCabecalho = false;
        aviso.replaceChildren();
        registrar('mail.open', emails[i].assunto);
        desenharLista();
        desenharLeitor();
        if (rolar && window.matchMedia && window.matchMedia('(max-width: 759px)').matches) {
          leitor.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
        }
      }

      function armadilha(e, chave, msg) {
        if (armadilhas.has(chave)) {
          aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'De novo, não! ' }), msg));
          return;
        }
        armadilhas.add(chave);
        penalidade += 25;
        registrar('trap', `armadilha: ${e.de}`, -25);
        aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'Armadilha! −25. ' }), msg));
      }

      function desenharLeitor() {
        const e = emails[atual];
        const barra = h('p', { class: 'op-status-link', 'aria-live': 'polite', text: 'Passe o mouse (ou toque uma vez) num link para ver o endereço real.' });
        const mostrarUrl = (url) => { barra.replaceChildren(icone('i-link'), ' ', url); barra.classList.add('op-status-link--ativo'); };
        const esconderUrl = () => { barra.textContent = 'Passe o mouse (ou toque uma vez) num link para ver o endereço real.'; barra.classList.remove('op-status-link--ativo'); };
        let toque = false; // último toque foi com o dedo/caneta?
        const semMouse = () => toque || !!(window.matchMedia && window.matchMedia('(hover: none)').matches);

        const corpo = e.corpo.map((b) => {
          if (b.p) return h('p', {}, rico(b.p));
          if (b.nota) return h('p', { class: 'op-carta__nota', text: b.nota });
          if (b.codigo) return h('pre', { class: 'op-carta__codigo', text: b.codigo });
          if (b.link) {
            const a = h('a', {
              href: '#', class: b.botao ? `op-carta__botao ${b.botao === 'perigo' ? 'op-carta__botao--perigo' : ''}` : 'op-carta__link',
              // sem mouse (celular), o endereço fica à mostra até o próximo link
              onpointerdown: (ev) => { toque = ev.pointerType !== 'mouse'; },
              onmouseenter: () => mostrarUrl(b.url), onmouseleave: () => !semMouse() && esconderUrl(), onfocus: () => mostrarUrl(b.url), onblur: () => !semMouse() && esconderUrl(),
              onclick: (ev) => {
                ev.preventDefault();
                // Sem mouse (celular): o 1º toque só mostra o endereço; o 2º "abre"
                if (semMouse() && !a.dataset.visto) { a.dataset.visto = '1'; mostrarUrl(b.url); return; }
                if (b.falso) {
                  armadilha(e, `${e.id}:${b.url}`, `Esse link ia para ${hostDe(b.url)}, que não é da Diver. Num ataque de verdade, a página pediria sua senha.`);
                } else {
                  registrar('mail.link', hostDe(b.url));
                  aviso.replaceChildren(h('p', { class: 'op-aviso', role: 'status', text: `Abriria ${hostDe(b.url)}. Endereço conferido; aqui no jogo a página não abre.` }));
                }
              },
            }, b.link);
            return h('p', { class: 'op-carta__acao' }, a);
          }
          if (b.anexo) {
            return h('p', { class: 'op-carta__acao' }, h('button', {
              type: 'button', class: 'op-anexo',
              onclick: () => (b.perigoso
                ? armadilha(e, `${e.id}:anexo`, `${b.anexo} é uma planilha com macro: "habilitar o conteúdo" instalaria um programa malicioso.`)
                : aviso.replaceChildren(h('p', { class: 'op-aviso', role: 'status', text: 'Anexo aberto: só um PDF comum.' }))),
            }, icone('i-arquivo'), h('span', { text: b.anexo }), h('span', { class: 'op-anexo__tam', text: b.tamanho ? `· ${b.tamanho}` : '' })));
          }
          return null;
        });

        const c = e.cabecalho || {};
        const sinal = (v) => {
          const s = String(v || '—');
          const cls = /^pass/i.test(s) ? 'ok' : /^(fail|none|softfail)/i.test(s) ? 'ruim' : 'neutro';
          return h('span', { class: `op-sinal op-sinal--${cls}`, text: s });
        };
        const cabecalho = verCabecalho ? h('dl', { class: 'op-cabecalho', 'aria-label': 'Cabeçalho do e-mail' },
          [['From', `${e.de} <${e.email}>`], ['Return-Path', c.returnPath || `<${e.email}>`], ['Received', c.recebido || '—']]
            .map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))),
          [['SPF', c.spf], ['DKIM', c.dkim], ['DMARC', c.dmarc]].map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', {}, sinal(v)))),
          Object.entries(c.extra || {}).map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { class: 'op-cabecalho__longo', text: v })))) : null;

        const m = marcado[e.id];
        leitor.replaceChildren(
          h('p', { class: 'op-rotulo', text: `E-mail ${atual + 1} de ${emails.length} · ${nMarcados()} classificado(s)` }),
          h('ol', { class: 'op-passos' }, h('li', { text: 'investigue' }), h('li', { text: 'classifique' }), h('li', { class: 'op-passos__fim', text: 'o próximo abre sozinho' })),
          h('article', { class: 'op-carta', 'aria-label': `E-mail: ${e.assunto}` },
            h('header', { class: 'op-carta__cabeca' },
              h('span', { class: `op-avatar op-avatar--${e.cor || 'turquesa'}`, 'aria-hidden': 'true', text: (e.de || '?')[0] }),
              h('div', {},
                h('h3', { class: 'op-carta__assunto', text: e.assunto }),
                h('p', { class: 'op-carta__de' }, h('strong', { text: e.de }), ' ', h('span', { class: 'op-carta__end', text: `<${e.email}>` })),
                h('p', { class: 'op-carta__para', text: `para ${caso.caixa} · ${caso.data || ''}, ${e.hora || ''}` }))),
            cabecalho,
            h('div', { class: 'op-carta__corpo' }, corpo),
            barra),
          aviso,
          h('section', { class: 'op-decisao', 'aria-label': 'Classificar este e-mail' },
            h('div', { class: 'op-decisao__topo' },
              h('p', {}, h('span', { class: 'op-rotulo', text: 'Passo 2' }), h('strong', { text: ' Este e-mail é…' })),
              h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-pressed': String(verCabecalho), onclick: alternarCabecalho },
                verCabecalho ? 'Esconder cabeçalho' : 'Ver cabeçalho')),
            h('div', { class: 'op-decisao__botoes' },
              h('button', { type: 'button', class: `op-escolha op-escolha--legitimo ${m === 'legitimo' ? 'op-escolha--sim' : ''}`, 'aria-pressed': String(m === 'legitimo'), onclick: () => marcar('legitimo') },
                icone('i-check'), 'Legítimo', h('kbd', { text: 'L' })),
              h('button', { type: 'button', class: `op-escolha op-escolha--phishing ${m === 'phishing' ? 'op-escolha--sim' : ''}`, 'aria-pressed': String(m === 'phishing'), onclick: () => marcar('phishing') },
                icone('i-alerta'), 'Reportar phishing', h('kbd', { text: 'P' })))));
      }

      function alternarCabecalho() {
        verCabecalho = !verCabecalho;
        if (verCabecalho) registrar('mail.header', emails[atual].email);
        desenharLeitor();
        const b = leitor.querySelector('.op-decisao__topo .botao');
        if (b) b.focus({ preventScroll: true });
      }

      function marcar(tipo) {
        const e = emails[atual];
        marcado[e.id] = tipo;
        revisar.delete(e.id);
        registrar('mail.mark', `${tipo === 'phishing' ? 'reportado' : 'legítimo'}: ${e.de}`);
        atualizarContagem();
        desenharLista();
        desenharLeitor();
        // o próximo ainda não classificado abre sozinho
        const ordem = emails.map((_, k) => (atual + 1 + k) % emails.length);
        const prox = ordem.find((k) => !marcado[emails[k].id] || revisar.has(emails[k].id));
        if (prox !== undefined && prox !== atual) {
          setTimeout(() => { if (lista.isConnected) abrir(prox, { rolar: false }); }, UI.movimentoReduzido ? 0 : 450);
        } else if (nMarcados() === emails.length) {
          botaoEnviar.focus({ preventScroll: true });
        }
      }

      /* ----- enviar ao SOC ----- */
      function enviar() {
        const errados = emails.filter((e) => (marcado[e.id] === 'phishing') !== e.phishing);
        if (primeiroEnvio) {
          primeiroEnvio = false;
          emails.forEach((e) => {
            const carta = { id: `caso:${caso.id}:${e.id}`, tema: 'Phishing e e-mail', dificuldade: 'medio', enunciado: `E-mail "${e.assunto}" de ${e.email}`, explicacao: e.explicacao || '' };
            detalhes.push(JogoComum.detalhe(carta, (marcado[e.id] === 'phishing') === e.phishing, {
              inicio, sua: marcado[e.id] === 'phishing' ? 'Você reportou como phishing.' : 'Você marcou como legítimo.',
              resposta: e.phishing ? 'Phishing: reportar' : 'Legítimo',
            }));
          });
        }
        if (errados.length) {
          penalidade += 10 * errados.length;
          errados.forEach((e) => revisar.add(e.id));
          registrar('puzzle.fail', `triagem devolvida · ${errados.length} não batem`, -10 * errados.length);
          abrir(emails.indexOf(errados[0]), { rolar: false });
          aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' },
            h('strong', { text: `O SOC devolveu a triagem: ${errados.length === 1 ? '1 e-mail não bate' : `${errados.length} e-mails não batem`} (−${10 * errados.length}). ` }),
            'Eles estão marcados com "revisar" na caixa de entrada. Abra o cabeçalho e confira de novo.'));
          leitor.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
          return;
        }
        registrar('puzzle.step', `triagem correta · ${emails.length}/${emails.length}`);
        clearInterval(tique);
        pericia();
      }

      /* ----- perícia: decodificar o X-Trace ----- */
      function pericia() {
        const entrada = h('input', { class: 'campo op-decodificador__campo', type: 'text', placeholder: 'cole o valor do X-Trace', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Valor do X-Trace' });
        const saida = h('div', { class: 'op-decodificador__saida', 'aria-live': 'polite' });
        const valor = h('span', { class: 'op-trace', text: trace });
        const copiar = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: async () => {
          try {
            await navigator.clipboard.writeText(trace);
            copiar.textContent = 'Copiado!';
          } catch (e) {
            const sel = window.getSelection();
            const r = document.createRange();
            r.selectNodeContents(valor);
            sel.removeAllRanges();
            sel.addRange(r);
            copiar.textContent = 'Selecionado: copie';
          }
        } }, 'Copiar valor');

        function decodificar(ev) {
          ev.preventDefault();
          const v = entrada.value.replace(/\s+/g, '');
          if (!v) return;
          if (v !== trace) {
            penalidade += 2;
            registrar('puzzle.fail', 'valor errado no decodificador', -2);
            saida.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'Esse não é o X-Trace (−2). ' }), 'Copie só o texto que vem depois de "X-Trace:".'));
            return;
          }
          const claro = CasoResolvido.deBase64(v) || (caso.isca.forense && caso.isca.forense.decodificado) || '';
          registrar('puzzle.step', 'X-Trace decodificado');
          saida.replaceChildren(
            h('p', { class: 'op-rotulo', text: 'Texto decodificado' }),
            h('pre', { class: 'op-decodificado', text: claro }),
            h('p', { class: 'texto-suave', text: 'Base64 não esconde nada: é só outro jeito de escrever o mesmo texto. Qualquer um decodifica.' }),
            h('button', { type: 'button', class: 'botao botao--primario', onclick: concluir }, icone('i-lupa'), 'Guardar a pista'));
          saida.querySelector('.botao').focus({ preventScroll: true });
        }

        const linhas = [['From', suspeito.email], ['Return-Path', suspeito.cabecalho.returnPath || '']]
          .concat(Object.entries(suspeito.cabecalho.extra || {}).filter(([k]) => k !== 'X-Trace'));
        mostrar(h('section', { class: 'op-missao-tela' },
          h('header', { class: 'op-titulo' }, h('h2', { text: 'Cabeçalho do e-mail suspeito' })),
          instrucoes(
            ['O e-mail reportado foi para a perícia. Copie o valor do campo **X-Trace**.',
              'Cole no decodificador e aperte Enter: é **Base64**, um jeito de escrever dados, não criptografia.',
              'O texto decodificado é a sua **Pista 1**.'],
            [['Decodificou', 'pista liberada'], ['Valor errado', '−2']]),
          h('pre', { class: 'op-terminal' },
            linhas.map(([k, v]) => h('span', { class: 'op-terminal__linha' }, h('span', { class: 'op-terminal__chave', text: `${k}: ` }), v)),
            h('span', { class: 'op-terminal__linha' }, h('span', { class: 'op-terminal__chave', text: 'X-Trace: ' }), valor)),
          h('div', { class: 'op-linha-botoes' }, copiar),
          h('form', { class: 'op-decodificador', onsubmit: decodificar },
            entrada,
            h('button', { type: 'submit', class: 'botao botao--primario' }, 'Decodificar Base64')),
          saida));
        entrada.focus({ preventScroll: true });
      }

      /* ----- fim: pista e pontos ----- */
      function concluir() {
        const seg = Math.round((Date.now() - inicio) / 1000);
        const velocidade = seg <= 180 ? 5 : seg <= 300 ? 3 : seg <= 480 ? 1 : 0;
        const pontos = treino ? 0 : Math.max(0, 60 + velocidade - penalidade);
        const pista = pistaDe(missao.pista || 'A');
        if (!treino) {
          est.missoes.isca = { pontos, quando: Date.now(), penalidade, segundos: seg };
          if (!est.pistas.includes(pista.letra)) est.pistas.push(pista.letra);
          registrar('puzzle.done', `${missao.titulo} · triagem + perícia`, pontos);
          registrar('clue.get', `Pista 1 · card ${pista.letra} guardada no caderno`);
        } else {
          registrar('puzzle.done', `${missao.titulo} · treino (sem pontos)`);
        }
        const resultado = Jogos.resultado({
          jogoId: 'caso', trilha: ctx.trilha, detalhes, inicio, concluido: true,
          bonus: treino ? { xp: 0, perolas: 0 } : { xp: Math.round(pontos / 2), perolas: Math.round(pontos / 10), motivo: `Missão 1 · ${pontos} pts` },
          pontuacao: pontos,
          titulo: treino ? 'Treino da Missão 1 concluído' : 'Missão 1 concluída',
          subtitulo: treino ? 'Treino não vale pontos de missão, mas cada e-mail certo conta como estudo.' : `${caso.titulo}: a Pista ${pista.letra} está no seu caderno.`,
        });
        resultado.registro = { operacao: caso.id, missao: 'isca', treino: !!treino, pontos_missao: pontos };
        resultado.textoDeNovo = 'Voltar às missões';

        mostrar(h('section', { class: 'op-missao-tela' },
          h('header', { class: 'op-titulo' },
            h('h2', { text: treino ? 'Treino concluído' : 'Missão 1 concluída' }),
            h('span', { class: 'op-titulo__pts', text: treino ? 'treino · sem pontos' : `+${pontos} pts` })),
          cartaoPista(pista, 1),
          h('p', { class: 'op-caixa op-nota', text: `Esta é a Pista 1 (card ${pista.letra} · ${pista.grupo}). Ela fica guardada no seu caderno do caso até a acusação, no último dia.` }),
          h('p', { class: 'op-resumo-numeros', text: `${mm(seg)} · ${penalidade ? `−${penalidade} em penalidades` : 'nenhuma penalidade'}${!treino && velocidade ? ` · +${velocidade} de velocidade` : ''}` }),
          h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
            h('button', { type: 'button', class: 'botao botao--primario', onclick: () => ctx.aoTerminar(resultado) }, 'Receber pontos e voltar às missões'))));
        principal.querySelector('.op-linha-botoes--fim .botao').focus({ preventScroll: true });
      }

      async function sair() {
        const ok = await UI.confirmar({
          titulo: 'Sair da missão?', texto: 'A triagem desta rodada não fica salva. Dá para começar de novo quando quiser.',
          sim: 'Sair', nao: 'Continuar investigando', humor: 'triste',
        });
        if (ok) {
          registrar('mission.exit', `Missão 1 · ${missao.titulo}`);
          painel();
        }
      }

      mostrar(h('section', { class: 'op-missao-tela' },
        h('header', { class: 'op-titulo' },
          h('h2', { text: `${missao.titulo} · triagem de e-mails` }),
          h('p', { class: 'op-titulo__info' }, contador, relogio)),
        instrucoes(
          ['Abra cada um dos 8 e-mails e leia com calma.',
            'Passe o mouse nos links (no celular, toque uma vez): o endereço real aparece na barra de baixo. Confira o domínio letra por letra.',
            'Abra **"Ver cabeçalho"** quando desconfiar: SPF, DKIM, DMARC e Return-Path contam a verdade.',
            'Classifique todos como **Legítimo** ou **Reportar phishing** e envie ao SOC. O e-mail reportado libera a pista.'],
          [['Triagem aprovada', '+60'], ['Bônus de velocidade', 'até +5'], ['Cada e-mail mal classificado', '−10'], ['Clicar em link falso / abrir anexo perigoso', '−25']]),
        h('div', { class: 'op-correio' },
          h('nav', { class: 'op-caixa-entrada', 'aria-label': 'Caixa de entrada' },
            h('div', { class: 'op-caixa-entrada__cabeca' },
              h('span', { class: 'op-avatar op-avatar--turquesa', 'aria-hidden': 'true', text: 'A' }),
              h('div', {}, h('strong', { text: caso.caixa }), h('span', { text: `Caixa de entrada · ${emails.length}` }))),
            lista),
          leitor),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          botaoEnviar,
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: sair }, 'Sair'))));

      const tirarTeclas = JogoComum.teclas((ev) => {
        if (!lista.isConnected || document.querySelector('dialog[open]')) return;
        const k = ev.key.toLowerCase();
        if (k === 'l') marcar('legitimo');
        else if (k === 'p') marcar('phishing');
        else if (k === 'c') alternarCabecalho();
        else if (k === 'arrowdown' || k === 'j') { ev.preventDefault(); abrir(Math.min(emails.length - 1, atual + 1), { rolar: false }); }
        else if (k === 'arrowup' || k === 'k') { ev.preventDefault(); abrir(Math.max(0, atual - 1), { rolar: false }); }
      });
      limparTela = () => { clearInterval(tique); tirarTeclas(); };
      atualizarContagem();
      abrir(0, { rolar: false });
    }

    /** Card de pista (Pista N · card X · GRUPO). */
    function cartaoPista(pista, n) {
      return h('article', { class: 'op-pista' },
        h('div', { class: 'op-pista__topo' },
          h('span', { class: 'op-pista__selo', text: `Pista ${n} · card ${pista.letra} · ${pista.grupo}` }),
          h('span', { class: 'op-pista__estado', text: 'desbloqueada' })),
        h('h3', { class: 'op-pista__titulo', text: pista.titulo }),
        h('p', { class: 'op-pista__texto', text: `“${pista.texto}”` }),
        h('p', { class: 'op-pista__codigo', text: `Código do card: ${pista.codigo || ''}` }));
    }

    painel();
    return { destruir: () => limparTela() };
  },
});

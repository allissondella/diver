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
 *  - Chave do dia 2 (cofre de 5 dígitos em 90 s) → Missão 2 · O Cofre: posts do Dr. Dobrão → senha
 *    fraca (barra quente/frio) → commits do repositório → PIN esquecido no histórico → Pista B.
 *  - Chave do dia 3 (capturar x-part-1..5 no tráfego ao vivo) → Missão 3 · A Trilha: 6 painéis de log
 *    (fusos BRT/AMT), marcar exatamente 3 anomalias → Pista C.
 *  - Missão 4 · O Resgate: bilhete da Sombra em Vigenère com a chave-mestra (letras das missões) → Pista D.
 *  - Tabuleiro de acusação: QUEM / COM O QUÊ / COMO (10 itens cada), riscar com X, uma acusação só.
 *  - Ranking ao vivo da turma do curso (função ranking_caso no Supabase), ao lado do log.
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
      && emails.some((e) => e.forense && e.cabecalho && e.cabecalho.extra && texto(e.cabecalho.extra['X-Trace']))
      && ['A', 'B', 'C', 'D'].every((l) => c.pistas.some((p) => p && p.letra === l && texto(p.titulo)))
      && !!(c.cofre && Array.isArray(c.cofre.commits) && texto(c.cofre.senha) && /^\d+$/.test(c.cofre.pin || ''))
      && !!(c.trilha && Array.isArray(c.trilha.paineis) && c.trilha.paineis.some((p) => p.linhas.some((l) => l.anomalia)))
      && !!(c.resgate && texto(c.resgate.cifrado) && /^[A-Z]{4}$/.test(c.chaveMestra || ''))
      && !!(c.tabuleiro && c.solucao && ['quem', 'comQue', 'como'].every((k) => Array.isArray(c.tabuleiro[k]) && c.tabuleiro[k].some((x) => x.id === c.solucao[k])));
  }

  /** Estado salvo de um caso: { missoes: { id: { pontos, quando } }, pistas: ['A'], chave: ['M'], log: [], chaves, riscados, acusacao } */
  function ler(casoId) {
    const tudo = Dados.ler(CHAVE, {}) || {};
    const e = tudo[casoId] || {};
    return {
      missoes: e.missoes && typeof e.missoes === 'object' ? e.missoes : {},
      pistas: Array.isArray(e.pistas) ? e.pistas : [],
      chave: Array.isArray(e.chave) ? e.chave : [],
      log: Array.isArray(e.log) ? e.log.slice(0, LOG_MAX) : [],
      chaves: e.chaves && typeof e.chaves === 'object' ? e.chaves : {}, // chaves dos dias: { cofre: { pontos, pago } }
      riscados: e.riscados && typeof e.riscados === 'object' ? e.riscados : {}, // anotações do tabuleiro: { quem: [ids] }
      acusacao: e.acusacao && typeof e.acusacao === 'object' ? e.acusacao : null, // { escolha, acertos, pontos, quando }
      pendente: e.pendente && typeof e.pendente === 'object' ? e.pendente : null, // resultado que ainda não passou pela economia
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

  const CONTORNO = 'stroke="#06172D" stroke-width="3" stroke-linejoin="round"';
  const cor = (c, padrao) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : padrao); // só aceita cor em hex (o caso vem de JSON)

  /** Retrato de suspeito no estilo figurinha, a partir de { pele, cabelo, penteado, roupa, acessorio }. */
  function retrato(v = {}) {
    const pele = cor(v.pele, '#F2B28C');
    const cabelo = cor(v.cabelo, '#7A4630');
    const roupa = cor(v.roupa, '#14B8A6');
    const cab = {
      curto: `<path d="M30 44 Q28 22 50 21 Q72 22 70 44 Q64 32 50 31 Q36 32 30 44 Z" fill="${cabelo}" ${CONTORNO}/>`,
      coque: `<circle cx="50" cy="17" r="9" fill="${cabelo}" ${CONTORNO}/><path d="M30 44 Q28 22 50 21 Q72 22 70 44 Q64 30 50 29 Q36 30 30 44 Z" fill="${cabelo}" ${CONTORNO}/>`,
      rabo: `<path d="M67 34 Q88 42 78 64 Q74 52 66 46 Z" fill="${cabelo}" ${CONTORNO}/><path d="M30 44 Q28 22 50 21 Q72 22 70 44 Q64 31 50 30 Q36 31 30 44 Z" fill="${cabelo}" ${CONTORNO}/>`,
      cacheado: `<g fill="${cabelo}" ${CONTORNO}><circle cx="30" cy="40" r="9"/><circle cx="70" cy="40" r="9"/><circle cx="34" cy="27" r="9"/><circle cx="66" cy="27" r="9"/><circle cx="50" cy="21" r="10"/><circle cx="27" cy="54" r="7"/><circle cx="73" cy="54" r="7"/></g>`,
      bigode: `<path d="M32 38 Q34 24 50 24 Q66 24 68 38 Q60 32 50 32 Q40 32 32 38 Z" fill="${cabelo}" ${CONTORNO}/>`,
    }[v.penteado] || '';
    const bigode = v.penteado === 'bigode' ? `<path d="M40 53 Q50 47 60 53 Q50 57 40 53 Z" fill="${cabelo}" ${CONTORNO}/>` : '';
    const boca = v.penteado === 'bigode' ? '<path d="M45 58 Q50 61 55 58" fill="none" stroke="#06172D" stroke-width="2.5" stroke-linecap="round"/>' : '<path d="M44 53 Q50 58 56 53" fill="none" stroke="#06172D" stroke-width="2.5" stroke-linecap="round"/>';
    const acessorio = {
      oculos: '<g fill="rgba(230,241,255,.25)" stroke="#06172D" stroke-width="2.5"><circle cx="43" cy="44" r="6.5"/><circle cx="57" cy="44" r="6.5"/><path d="M49.5 44 H50.5"/></g>',
      fone: '<path d="M28 44 Q28 16 50 16 Q72 16 72 44" fill="none" stroke="#06172D" stroke-width="4"/><rect x="23" y="38" width="9" height="14" rx="4" fill="#14B8A6" stroke="#06172D" stroke-width="2.5"/><rect x="68" y="38" width="9" height="14" rx="4" fill="#14B8A6" stroke="#06172D" stroke-width="2.5"/>',
      quepe: `<path d="M28 32 Q30 12 50 12 Q70 12 72 32 Z" fill="#0B2545" ${CONTORNO}/><path d="M26 32 H74 L70 37 H30 Z" fill="#12325A" ${CONTORNO}/><circle cx="50" cy="22" r="4" fill="#FACC15"/>`,
      bone: `<path d="M30 34 Q30 16 50 16 Q70 16 70 34 Z" fill="#FACC15" ${CONTORNO}/><path d="M62 32 L86 35 L70 38 Z" fill="#FACC15" ${CONTORNO}/>`,
      capacete: `<path d="M27 36 Q27 14 50 14 Q73 14 73 36 Z" fill="#FACC15" ${CONTORNO}/><rect x="22" y="34" width="56" height="6" rx="3" fill="#FACC15" ${CONTORNO}/><path d="M50 14 V34" stroke="#C99A0B" stroke-width="3"/>`,
      brincos: '<circle cx="29" cy="52" r="3.5" fill="#F5F0E6" stroke="#06172D" stroke-width="1.5"/><circle cx="71" cy="52" r="3.5" fill="#F5F0E6" stroke="#06172D" stroke-width="1.5"/>',
    }[v.acessorio] || '';
    const sardas = v.acessorio === 'bone' ? '<g fill="#C9754B" opacity=".7"><circle cx="40" cy="50" r="1.2"/><circle cx="43" cy="52" r="1.2"/><circle cx="60" cy="50" r="1.2"/><circle cx="57" cy="52" r="1.2"/></g>' : '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#0C354C" stroke="#5EEAD4" stroke-width="3"/>
      <path d="M16 100 Q18 72 50 70 Q82 72 84 100 Z" fill="${roupa}" ${CONTORNO}/>
      <rect x="44" y="58" width="12" height="14" fill="${pele}"/>
      ${v.penteado === 'cacheado' ? cab : ''}
      <circle cx="50" cy="44" r="20" fill="${pele}" ${CONTORNO}/>
      ${v.penteado !== 'cacheado' ? cab : ''}
      <circle cx="43" cy="45" r="2.6" fill="#06172D"/><circle cx="57" cy="45" r="2.6" fill="#06172D"/>
      ${sardas}${bigode}${boca}${acessorio}
    </svg>`;
  }

  /** Vigenère: decifra com a chave (letras; null = desconhecida, vira "·"). Só A–Z andam na chave. */
  function decifrar(texto, chave) {
    let i = 0;
    return String(texto).split('').map((ch) => {
      if (ch < 'A' || ch > 'Z') return ch;
      const k = chave[i % chave.length];
      i++;
      if (!k) return '·';
      return String.fromCharCode(((ch.charCodeAt(0) - 65 - (k.charCodeAt(0) - 65) + 26) % 26) + 65);
    }).join('');
  }

  /** Texto comparável: sem acento, minúsculo, só letras e números. */
  const normal = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  return { CHAVE, valido, ler, gravar, SOMBRA, rico, deBase64, hostDe, retrato, decifrar, normal };
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
    const pontosTotais = () => Object.values(est.missoes).reduce((s, m) => s + (Number(m.pontos) || 0), 0) + ((est.acusacao && Number(est.acusacao.pontos)) || 0);
    const CHAVE_DA = { cofre: 'cofre', trilha: 'rastro' }; // missão → chave do dia que abre antes dela
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

    /* ---------- Ranking ao vivo (turma do curso; só com login) ---------- */
    const listaRanking = h('ol', { class: 'op-ranking__lista' });
    let minhaPosicao = null;

    async function carregarRanking() {
      const naNuvem = typeof Atividade !== 'undefined' && Atividade.naNuvem && Atividade.naNuvem();
      if (!naNuvem) {
        listaRanking.replaceChildren(h('li', { class: 'op-ranking__vazio', text: `Com login, aqui aparece o placar da turma do curso. Seus pontos: ${pontosTotais()}.` }));
        return;
      }
      listaRanking.replaceChildren(h('li', { class: 'op-ranking__vazio', text: 'Buscando o placar…' }));
      try {
        await Atividade.enviar();
        const linhas = (await Nuvem.rpc('ranking_caso', { p_curso: ctx.trilha.id, p_caso: caso.id })) || [];
        if (!linhas.length) {
          listaRanking.replaceChildren(h('li', { class: 'op-ranking__vazio', text: 'Ninguém da turma pontuou ainda. Que tal abrir o placar?' }));
          return;
        }
        const top = linhas.slice(0, 10);
        const eu = linhas.find((l) => l.sou_eu);
        if (eu && !top.includes(eu)) top.push(eu);
        const maximo = Math.max(1, ...linhas.map((l) => Number(l.pontos) || 0));
        minhaPosicao = eu ? eu.posicao : null;
        const dd = principal.querySelector('[data-ranking]');
        if (dd) dd.textContent = minhaPosicao ? `#${minhaPosicao}` : '—';
        listaRanking.replaceChildren(...top.map((l) => h('li', { class: `op-ranking__item ${l.sou_eu ? 'op-ranking__item--eu' : ''}` },
          h('span', { class: 'op-ranking__pos', text: String(l.posicao) }),
          h('span', { class: 'op-ranking__nome', text: l.sou_eu ? `${l.nome} (você)` : l.nome }),
          h('span', { class: 'op-ranking__barra', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.round(((Number(l.pontos) || 0) / maximo) * 100)}%` })),
          h('span', { class: 'op-ranking__pts', text: String(l.pontos) }))));
      } catch (e) {
        listaRanking.replaceChildren(h('li', { class: 'op-ranking__vazio', text: 'Não deu para carregar o ranking agora.' }));
      }
    }

    const lateral = h('aside', { class: 'op-lateral', 'aria-label': 'Log de eventos e ranking' },
      h('details', { class: 'op-log', open: true },
        h('summary', { class: 'op-log__cabeca' },
          h('span', { class: 'op-rotulo', text: 'Log de eventos' }), contadorLog,
          h('span', { class: 'op-log__quem', text: nomeJogador() })),
        listaLog),
      h('section', { class: 'op-ranking', 'aria-label': 'Ranking ao vivo da turma' },
        h('div', { class: 'op-ranking__cabeca' }, h('span', { class: 'op-rotulo', text: 'Ranking ao vivo' }), h('span', { class: 'op-ranking__sub', text: 'turma do curso' })),
        listaRanking));
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
    const MISSOES = { isca: missaoIsca, cofre: missaoCofre, trilha: missaoTrilha, resgate: missaoResgate };

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
          h('div', { title: 'Posição no ranking da turma (com login)' }, h('dt', { text: 'ranking' }), h('dd', { 'data-ranking': '', text: minhaPosicao ? `#${minhaPosicao}` : '—' })),
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
        const ultimo = i === caso.missoes.length - 1;
        let s = situacao(i);
        if (ultimo && s === 'feita' && !est.acusacao) s = 'aberta'; // o último dia só fecha com a acusação
        return h('li', { class: `op-dia op-dia--${s}` },
          h('span', { text: `Dia ${m.dia || i + 1}` }),
          h('strong', { text: ultimo ? 'Acusação' : m.titulo }),
          s === 'feita' ? icone('i-check') : null,
          h('span', { class: 'visualmente-oculto', text: { feita: ' (concluída)', aberta: ' (liberada)', trancada: ' (trancada)', embreve: ' (em breve)' }[s] }));
      }));

      const caixaDestaque = (rotulo, titulo, textoD, botaoTexto, acao) => h('section', { class: 'op-caixa op-destaque' },
        h('div', {},
          h('p', { class: 'op-rotulo', text: rotulo }),
          h('h3', { class: 'op-destaque__titulo', text: titulo }),
          h('p', { class: 'op-destaque__texto', text: textoD })),
        h('button', { type: 'button', class: 'botao botao--primario', onclick: acao }, botaoTexto));
      let destaque;
      if (est.pendente) {
        destaque = caixaDestaque('Pontos esperando por você', est.pendente.titulo || 'Missão concluída',
          'Você fechou o jogo antes de receber os pontos desta missão. Eles continuam guardados.', 'Receber agora', () => entregar(est.pendente));
      } else if (proxima) {
        const chaveAntes = CHAVE_DA[proxima.id] && !est.chaves[CHAVE_DA[proxima.id]];
        destaque = caixaDestaque(chaveAntes ? 'Próxima missão · chave do dia primeiro' : 'Próxima missão',
          `Dia ${proxima.dia || proximaI + 1} · ${proxima.titulo}`, proxima.resumo || '', 'Jogar', () => MISSOES[proxima.id](false));
      } else if (!est.acusacao) {
        destaque = caixaDestaque('Dia final · acusação', 'Tabuleiro de acusação',
          'As 4 pistas estão no caderno. Cruze tudo e acuse quem, com o quê e como. Uma tentativa só.', 'Abrir o tabuleiro', tabuleiro);
      } else {
        const a = est.acusacao;
        destaque = caixaDestaque('Caso encerrado', a.acertos === 3 ? 'Mandou bem, Diver! A Sombra foi pega.' : `Você acertou ${a.acertos} de 3 na acusação.`,
          `+${a.pontos} pts na acusação. Dá para treinar as missões de novo quando quiser.`, 'Ver o tabuleiro', tabuleiro);
      }

      const ESTRELAS = ['★', '★★', '★★★', '★★★★'];
      const cards = h('ul', { class: 'op-missoes' }, caso.missoes.map((m, i) => {
        const s = situacao(i);
        const feita = est.missoes[m.id];
        const chaveDia = CHAVE_DA[m.id];
        const nomeChave = { cofre: 'cofre de 5 dígitos', rastro: 'rastro na rede' }[chaveDia];
        const status = feita ? `concluída · card ${m.pista || ''} · +${feita.pontos} pts`
          : s === 'embreve' ? 'chega na próxima atualização'
            : m.id === 'resgate' ? `chave-mestra ${[0, 1, 2, 3].map((k) => est.chave[k] || '?').join(' ')}`
              : chaveDia ? `${est.chaves[chaveDia] ? 'chave aberta' : 'chave'}: ${nomeChave}`
                : s === 'trancada' ? `termine a Missão ${i}` : 'liberada';
        let botao;
        if (s === 'feita') botao = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => MISSOES[m.id] && MISSOES[m.id](true), disabled: !MISSOES[m.id] }, 'Treinar de novo');
        else if (s === 'aberta') botao = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => MISSOES[m.id](false) }, 'Jogar');
        else botao = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', disabled: true }, s === 'embreve' ? 'Em breve' : `Termine a Missão ${i}`);
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
        dias, destaque, cards,
        h('div', { class: 'op-linha-botoes' },
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: tabuleiro }, icone('i-colunas'), 'Tabuleiro de acusação'))));
      carregarRanking();
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
      let abreSozinho = null; // "o próximo abre sozinho" (cancelado se a pessoa escolher outro e-mail antes)

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
            h('button', { type: 'button', class: `op-email ${i === atual ? 'op-email--atual' : ''} ${m ? '' : 'op-email--novo'}`, 'aria-current': i === atual ? 'true' : null, onclick: () => { clearTimeout(abreSozinho); abrir(i); } },
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
          clearTimeout(abreSozinho);
          abreSozinho = setTimeout(() => { if (lista.isConnected) abrir(prox, { rolar: false }); }, UI.movimentoReduzido ? 0 : 450);
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
        fecharMissao({ id: 'isca', treino, inicio, penalidade, detalhes, limites: [180, 300, 480], resumo: 'triagem + perícia',
          textoTreino: 'Treino não vale pontos de missão, mas cada e-mail certo conta como estudo.' });
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
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDaMissao(`Missão 1 · ${missao.titulo}`) }, 'Sair'))));

      const tirarTeclas = JogoComum.teclas((ev) => {
        if (!lista.isConnected || document.querySelector('dialog[open]')) return;
        const k = ev.key.toLowerCase();
        if (k === 'l') marcar('legitimo');
        else if (k === 'p') marcar('phishing');
        else if (k === 'c') alternarCabecalho();
        else if (k === 'arrowdown' || k === 'j') { ev.preventDefault(); clearTimeout(abreSozinho); abrir(Math.min(emails.length - 1, atual + 1), { rolar: false }); }
        else if (k === 'arrowup' || k === 'k') { ev.preventDefault(); clearTimeout(abreSozinho); abrir(Math.max(0, atual - 1), { rolar: false }); }
      });
      limparTela = () => { clearInterval(tique); clearTimeout(abreSozinho); tirarTeclas(); };
      atualizarContagem();
      abrir(0, { rolar: false });
    }

    /* =====================================================================
       Peças comuns das missões
       ===================================================================== */
    const ordinal = (n) => ['', 'primeira', 'segunda', 'terceira', 'quarta'][n] || `${n}ª`;

    /** Cabeçalho da missão: título, contador opcional e cronômetro que sobe. Devolve { el, parar }. */
    function topoMissao(titulo, ...extras) {
      const relogio = h('span', { class: 'op-relogio', text: '00:00' });
      const inicio = Date.now();
      const tique = setInterval(() => (relogio.textContent = mm(Math.round((Date.now() - inicio) / 1000))), 1000);
      return { inicio, el: h('header', { class: 'op-titulo' }, h('h2', { text: titulo }), h('p', { class: 'op-titulo__info' }, ...extras, relogio)), parar: () => clearInterval(tique) };
    }

    async function sairDaMissao(nome) {
      const ok = await UI.confirmar({
        titulo: 'Sair da missão?', texto: 'O que você fez nesta rodada não fica salvo (a chave do dia, se já abriu, fica). Dá para voltar quando quiser.',
        sim: 'Sair', nao: 'Continuar investigando', humor: 'triste',
      });
      if (ok) {
        registrar('mission.exit', nome);
        painel();
      }
    }

    /** Terminal com as três bolinhas e um título em fonte mono. */
    const terminal = (titulo, classe, ...corpo) => h('section', { class: `op-term ${classe || ''}`.trim(), 'aria-label': titulo },
      h('div', { class: 'op-term__barra', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('span', { text: titulo })),
      h('div', { class: 'op-term__corpo' }, ...corpo));

    /** Detalhe "de estudo" de uma missão (conta como resposta e aparece no "O que revisar"). */
    const detalheMissao = (id, tema, enunciado, acertou, sua, resposta, explicacao, inicio) =>
      JogoComum.detalhe({ id: `caso:${caso.id}:${id}`, tema, dificuldade: 'medio', enunciado, explicacao }, acertou, { inicio, sua, resposta });

    /**
     * Fecha uma missão: soma os créditos (+60, velocidade, penalidades e a chave do dia, se ainda não foi paga),
     * guarda pista e letra da chave-mestra, registra no log e mostra o card da pista.
     * O XP e as pérolas saem pela economia central (ctx.aoTerminar).
     */
    function fecharMissao({ id, treino, inicio, penalidade, detalhes, limites, resumo, textoTreino }) {
      const i = caso.missoes.findIndex((m) => m.id === id);
      const missao = caso.missoes[i];
      const n = i + 1;
      const seg = Math.round((Date.now() - inicio) / 1000);
      const velocidade = seg <= limites[0] ? 5 : seg <= limites[1] ? 3 : seg <= limites[2] ? 1 : 0;
      const chave = !treino && CHAVE_DA[id] ? est.chaves[CHAVE_DA[id]] : null;
      const ptsChave = chave && !chave.pago ? Number(chave.pontos) || 0 : 0;
      if (chave) chave.pago = true;
      const ptsMissao = treino ? 0 : Math.max(0, 60 + velocidade - penalidade);
      const pontos = ptsMissao + ptsChave;
      const pista = pistaDe(missao.pista);
      if (!treino) {
        est.missoes[id] = { pontos, quando: Date.now(), penalidade, segundos: seg };
        if (!est.pistas.includes(pista.letra)) est.pistas.push(pista.letra);
        if (missao.letra) est.chave[i] = missao.letra;
        registrar('puzzle.done', `${missao.titulo} · ${resumo} · ${mm(seg)}`, ptsMissao);
        registrar('clue.get', `Pista ${n} · card ${pista.letra} guardada no caderno`);
        if (missao.letra) registrar('key.letter', `chave-mestra: ${ordinal(n)} letra = ${missao.letra}`);
      } else {
        registrar('puzzle.done', `${missao.titulo} · treino (sem pontos)`);
      }
      const resultado = Jogos.resultado({
        jogoId: 'caso', trilha: ctx.trilha, detalhes, inicio, concluido: true,
        bonus: treino ? { xp: 0, perolas: 0 } : { xp: Math.round(pontos / 2), perolas: Math.round(pontos / 10), motivo: `Missão ${n} · ${pontos} pts` },
        pontuacao: pontos,
        titulo: treino ? `Treino da Missão ${n} concluído` : `Missão ${n} concluída`,
        subtitulo: treino ? (textoTreino || 'Treino não vale pontos de missão, mas conta como estudo.') : `${caso.titulo}: a Pista ${pista.letra} está no seu caderno.`,
      });
      resultado.registro = { operacao: caso.id, missao: id, treino: !!treino, pontos_missao: pontos };
      resultado.textoDeNovo = 'Voltar às missões';
      guardarPendente(resultado);
      carregarRanking();

      const nota = n === caso.missoes.length
        ? 'Pista 4 em mãos. Cruze com as outras três no tabuleiro e faça a acusação: uma tentativa, sem volta.'
        : `Esta é a Pista ${n} (card ${pista.letra} · ${pista.grupo}). Ela fica guardada no seu caderno do caso até a acusação, no último dia.`;
      const numeros = [mm(seg), penalidade ? `−${penalidade} em penalidades` : 'nenhuma penalidade'];
      if (!treino && velocidade) numeros.push(`+${velocidade} de velocidade`);
      if (ptsChave) numeros.push(`+${ptsChave} da chave do dia`);
      mostrar(h('section', { class: 'op-missao-tela' },
        h('header', { class: 'op-titulo' },
          h('h2', { text: treino ? 'Treino concluído' : `Missão ${n} concluída` }),
          h('span', { class: 'op-titulo__pts', text: treino ? 'treino · sem pontos' : `+${pontos} pts` })),
        cartaoPista(pista, n, treino ? null : missao.letra),
        h('p', { class: 'op-caixa op-nota', text: nota }),
        h('p', { class: 'op-resumo-numeros', text: numeros.join(' · ') }),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => entregar(resultado) }, 'Receber pontos e voltar às missões'))));
      principal.querySelector('.op-linha-botoes--fim .botao').focus({ preventScroll: true });
    }

    /** Resultado ainda não entregue à economia (se a pessoa fechar o app no card da pista, o painel oferece de novo). */
    function guardarPendente(resultado) {
      est.pendente = resultado;
      salvar();
    }
    function entregar(resultado) {
      est.pendente = null;
      salvar();
      ctx.aoTerminar(resultado);
    }

    /** Card de pista (Pista N · card X · GRUPO), com a letra da chave-mestra quando houver. */
    function cartaoPista(pista, n, letra = null, mini = false) {
      return h('article', { class: `op-pista op-pista--${pista.letra.toLowerCase()} ${mini ? 'op-pista--mini' : ''}`.trim() },
        h('div', { class: 'op-pista__topo' },
          h('span', { class: 'op-pista__selo', text: `Pista ${n} · card ${pista.letra} · ${pista.grupo}` }),
          mini ? null : h('span', { class: 'op-pista__estado', text: 'desbloqueada' })),
        h('h3', { class: 'op-pista__titulo', text: pista.titulo }),
        h('p', { class: 'op-pista__texto', text: `“${pista.texto}”` }),
        h('p', { class: 'op-pista__codigo', text: `código ${pista.codigo || ''}${letra ? ` · letra da chave-mestra: ${letra}` : ''}` }));
    }

    /** Tela de "chave aberta", com a Sombra provocando. */
    function chaveAberta(titulo, fala, botaoTexto, depois) {
      const sombra = h('span', { class: 'op-sombra op-sombra--mini', 'aria-hidden': 'true' });
      sombra.innerHTML = CasoResolvido.SOMBRA; // SVG fixo deste arquivo
      mostrar(h('section', { class: 'op-destravado', role: 'status' },
        h('span', { class: 'op-destravado__cadeado', 'aria-hidden': 'true' }, icone('i-cadeado')),
        h('p', { class: 'op-destravado__selo', text: titulo }),
        h('div', { class: 'op-destravado__fala' }, sombra, h('p', { text: fala })),
        h('button', { type: 'button', class: 'botao botao--primario', onclick: depois }, botaoTexto)));
      principal.querySelector('.op-destravado .botao').focus({ preventScroll: true });
    }

    /** Barra e número da contagem regressiva das chaves. */
    function contagem(total) {
      const numero = h('span', { class: 'op-contagem__num', text: String(total) });
      const barra = h('div', { class: 'op-contagem', role: 'timer', 'aria-label': 'Tempo restante' }, h('span'));
      return {
        numero, barra,
        mostrar(restante) {
          numero.textContent = String(Math.max(0, Math.ceil(restante)));
          numero.classList.toggle('op-contagem__num--pouco', restante <= 15);
          barra.firstChild.style.width = `${Math.max(0, (restante / total) * 100)}%`;
        },
      };
    }

    /* =====================================================================
       Chave do dia 2 · Cofre de 5 dígitos (senha com dicas de cor, 90 s)
       ===================================================================== */
    function chaveCofre(depois) {
      const N = (caso.cofre && caso.cofre.chaveDigitos) || 5;
      const TEMPO = 90;
      let segredo = [];
      let rodada = 0;
      let inicioRodada = 0;
      let penalidade = 0;
      let tentativas = [];
      const status = {}; // dígito → verde | amarelo | vermelho (o melhor que já se sabe)

      registrar('key.open', 'cofre do dia 2');
      const tempo = contagem(TEMPO);
      const info = h('span', { class: 'op-contador' });
      const caixas = Array.from({ length: N }, (_, i) => h('input', {
        class: 'op-digito', type: 'text', inputmode: 'numeric', maxlength: '1', autocomplete: 'off', 'aria-label': `Dígito ${i + 1} de ${N}`,
      }));
      const teclado = h('div', { class: 'op-teclado', role: 'group', 'aria-label': 'Teclado numérico' });
      const linhas = h('ol', { class: 'op-palpites', 'aria-label': 'Palpites' });
      const aviso = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });

      function nova({ trocouPorTempo = false } = {}) {
        segredo = Array.from({ length: N }, () => String(Math.floor(Math.random() * 10)));
        rodada++;
        inicioRodada = Date.now();
        tentativas = [];
        Object.keys(status).forEach((k) => delete status[k]);
        caixas.forEach((c) => (c.value = ''));
        linhas.replaceChildren();
        if (!trocouPorTempo) aviso.replaceChildren();
        desenharTeclado();
        info.textContent = 'tentativa 0';
      }

      function desenharTeclado() {
        teclado.replaceChildren(...'0123456789'.split('').map((d) => h('button', {
          type: 'button', class: `op-tecla ${status[d] ? `op-tecla--${status[d]}` : ''}`, text: d,
          'aria-label': `${d}${status[d] ? ` (${{ verde: 'certo no lugar', amarelo: 'existe em outra posição', vermelho: 'não existe' }[status[d]]})` : ''}`,
          onclick: () => {
            const vazia = caixas.find((c) => !c.value) || caixas[N - 1];
            vazia.value = d;
            const prox = caixas.find((c) => !c.value);
            (prox || vazia).focus({ preventScroll: true });
          },
        })));
      }

      /** Cores de um palpite (estilo "senha"): verde no lugar, amarelo em outra posição, vermelho não existe. */
      function avaliar(palpite) {
        const cores = Array(N).fill('vermelho');
        const resto = {};
        segredo.forEach((d, i) => { if (palpite[i] === d) cores[i] = 'verde'; else resto[d] = (resto[d] || 0) + 1; });
        palpite.forEach((d, i) => { if (cores[i] !== 'verde' && resto[d]) { cores[i] = 'amarelo'; resto[d]--; } });
        return cores;
      }

      function testar() {
        const palpite = caixas.map((c) => c.value);
        if (palpite.some((d) => !/^\d$/.test(d))) {
          aviso.replaceChildren(h('p', { class: 'op-aviso', role: 'status', text: `Digite os ${N} números antes de testar.` }));
          (caixas.find((c) => !c.value) || caixas[0]).focus({ preventScroll: true });
          return;
        }
        aviso.replaceChildren();
        const cores = avaliar(palpite);
        tentativas.push(palpite);
        const PESO = { vermelho: 1, amarelo: 2, verde: 3 };
        palpite.forEach((d, i) => { if (!status[d] || PESO[cores[i]] > PESO[status[d]]) status[d] = cores[i]; });
        const verdes = cores.filter((c) => c === 'verde').length;
        registrar('key.try', `cofre dia 2 · ${palpite.join('')} · ${verdes} ${verdes === 1 ? 'verde' : 'verdes'}`);
        linhas.prepend(h('li', { class: 'op-palpite', 'aria-label': `Palpite ${palpite.join(' ')}: ${verdes} no lugar certo` },
          ...palpite.map((d, i) => h('span', { class: `op-cel op-cel--${cores[i]}`, text: d }))));
        info.textContent = `tentativa ${tentativas.length}`;
        desenharTeclado();
        caixas.forEach((c) => (c.value = ''));
        caixas[0].focus({ preventScroll: true });
        if (verdes === N) abriu();
      }

      function abriu() {
        clearInterval(tique);
        const n = tentativas.length;
        const bonus = n <= 3 ? 10 : n <= 4 ? 8 : n <= 5 ? 6 : n <= 6 ? 4 : n <= 7 ? 2 : 1;
        const pontos = Math.max(0, 30 + bonus - penalidade);
        const seg = Math.round((Date.now() - inicioRodada) / 1000);
        est.chaves.cofre = { pontos, quando: Date.now(), tentativas: n, segundos: seg, pago: false };
        registrar('key.ok', `senha do dia 2 · ${n} ${n === 1 ? 'tentativa' : 'tentativas'} · ${seg}s`, pontos);
        chaveAberta('Cofre destravado', `Cinco dígitos em ${seg} segundos? Tá, tá. Vamos ver se você acha o resto.`, 'Abrir a Missão 2', depois);
      }

      const tique = setInterval(() => {
        const restante = TEMPO - (Date.now() - inicioRodada) / 1000;
        tempo.mostrar(restante);
        if (restante <= 0) {
          penalidade += 5;
          registrar('key.timeout', 'cofre dia 2 · senha trocada', -5);
          nova({ trocouPorTempo: true });
          aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'Acabou o tempo (−5). ' }), 'A senha mudou e as tentativas zeraram.'));
        }
      }, 250);

      caixas.forEach((c, i) => {
        // colar os 5 de uma vez (o maxlength=1 cortaria o texto colado)
        c.addEventListener('paste', (e) => {
          const t = ((e.clipboardData && e.clipboardData.getData('text')) || '').replace(/\D/g, '');
          if (!t) return;
          e.preventDefault();
          t.slice(0, N - i).split('').forEach((x, k) => (caixas[i + k].value = x));
          (caixas[Math.min(N - 1, i + t.length)] || c).focus();
        });
        c.addEventListener('input', () => {
          const d = c.value.replace(/\D/g, '');
          if (d.length > 1) { // colou vários de uma vez
            d.slice(0, N - i).split('').forEach((x, k) => (caixas[i + k].value = x));
            (caixas[Math.min(N - 1, i + d.length)] || c).focus();
            return;
          }
          c.value = d;
          if (d && caixas[i + 1]) caixas[i + 1].focus();
        });
        c.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); testar(); }
          else if (e.key === 'Backspace' && !c.value && caixas[i - 1]) { caixas[i - 1].focus(); caixas[i - 1].value = ''; e.preventDefault(); }
          else if (e.key === 'ArrowLeft' && caixas[i - 1]) caixas[i - 1].focus();
          else if (e.key === 'ArrowRight' && caixas[i + 1]) caixas[i + 1].focus();
        });
      });

      mostrar(h('section', { class: 'op-missao-tela' },
        h('header', { class: 'op-titulo' }, h('h2', { text: 'Chave do dia 2 · Cofre de 5 dígitos' }), h('p', { class: 'op-titulo__info' }, info, tempo.numero)),
        tempo.barra,
        instrucoes(
          [`A senha tem ${N} dígitos sorteados; números podem se repetir (ex.: 3 3 7 0 3).`,
            'Digite um palpite e aperte Enter. Cada dígito volta colorido: **verde** certo no lugar, **amarelo** existe em outra posição, **vermelho** não existe.',
            'O teclado embaixo guarda o que você já descobriu.',
            'Você tem 90 segundos. Acabou o tempo, a senha muda e as tentativas zeram.'],
          [['Senha aberta', '+30'], ['Bônus por poucas tentativas', '+10 a +1'], ['Tempo esgotado', '−5'], ['Sem limite de palpites', '0']]),
        h('div', { class: 'op-cofre' },
          h('div', { class: 'op-digitos' }, caixas),
          teclado,
          h('p', { class: 'op-dica-pequena', text: `Digite os ${N} números e aperte Enter. Pode colar os ${N} de uma vez.` }),
          aviso,
          linhas),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('div', { class: 'op-linha-botoes' },
            h('button', { type: 'button', class: 'botao botao--primario', onclick: testar }, 'Testar senha'),
            h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { registrar('key.reset', 'cofre dia 2 · nova senha'); nova(); caixas[0].focus(); } }, 'Nova senha')),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDaMissao('chave do dia 2') }, 'Sair'))));
      limparTela = () => clearInterval(tique);
      nova();
      caixas[0].focus({ preventScroll: true });
    }

    /* =====================================================================
       Missão 2 · O Cofre — rede social → senha fraca → repositório → PIN
       ===================================================================== */
    function missaoCofre(treino) {
      if (!treino && !est.chaves.cofre) return chaveCofre(() => missaoCofre(false));
      const c = caso.cofre;
      const { normal } = CasoResolvido;
      const topo = topoMissao('Missão 2 · O Cofre');
      const inicio = topo.inicio;
      let penalidade = 0;
      let errosSenha = 0;
      let errosPin = 0;
      let executou = false;
      let logado = false;
      let abertoHash = null;
      registrar('mission.open', `Missão 2 · O Cofre${treino ? ' (treino)' : ''}`);

      const campoSenha = h('input', { class: 'campo', type: 'text', placeholder: 'senha', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Senha do login corporativo' });
      const termometro = h('div', { class: 'op-termometro', role: 'meter', 'aria-label': 'Quente ou frio', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, h('span'));
      const msgSenha = h('p', { class: 'op-dica-pequena', 'aria-live': 'polite', text: 'Quente ou frio: a barra diz o quanto você chegou perto.' });
      const repo = h('div', { class: 'op-repo' });
      const aviso = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const campoPin = h('input', { class: 'campo op-pin', type: 'text', inputmode: 'numeric', maxlength: String(c.pin.length), placeholder: '0'.repeat(c.pin.length), autocomplete: 'off', 'aria-label': `Código de ${c.pin.length} dígitos do cofre`, disabled: true });
      const botaoPin = h('button', { type: 'submit', class: 'botao botao--primario', disabled: true }, 'Abrir cofre');

      function tentarSenha(ev) {
        ev.preventDefault();
        const v = normal(campoSenha.value);
        if (!v || logado) return;
        if (v === normal(c.senha)) {
          logado = true;
          campoSenha.disabled = true;
          termometro.firstChild.style.width = '100%';
          termometro.setAttribute('aria-valuenow', '100');
          msgSenha.textContent = 'Entrou! Senha com o nome do pet e o ano: fácil de adivinhar para quem lê os posts.';
          registrar('login.ok', `login de ${c.perfil.usuario}`);
          campoPin.disabled = false;
          botaoPin.disabled = false;
          desenharRepo();
          return;
        }
        penalidade += 5;
        errosSenha++;
        const acertos = c.partes.filter((p) => v.includes(normal(p.trecho)));
        let pct;
        let msg;
        if (acertos.length) {
          pct = 30 + Math.round((60 * acertos.length) / c.partes.length);
          msg = `Quente! ${c.partes.map((p) => (v.includes(normal(p.trecho)) ? p.certo : p.falta)).join('; ')}.`;
        } else if ((c.mornos || []).some((m) => v.includes(normal(m)))) {
          pct = 20;
          msg = 'Morno: é algo que ele postou, mas não é isso.';
        } else {
          pct = 5;
          msg = 'Frio: nada a ver com o que ele posta.';
        }
        termometro.firstChild.style.width = `${pct}%`;
        termometro.setAttribute('aria-valuenow', String(pct));
        msgSenha.textContent = `${msg} (−5)`;
        registrar('login.fail', `senha errada · ${pct}% quente`, -5);
      }

      function desenharRepo() {
        if (!logado) {
          repo.replaceChildren(h('p', { class: 'op-repo__trancado' }, icone('i-cadeado'), ' repositório trancado: entre com a senha do Dr. Dobrão'));
          return;
        }
        const aberto = c.commits.find((k) => k.hash === abertoHash);
        repo.replaceChildren(
          h('ul', { class: 'op-commits' }, c.commits.map((k) => h('li', {},
            h('button', { type: 'button', class: `op-commit ${k.hash === abertoHash ? 'op-commit--aberto' : ''}`, 'aria-expanded': String(k.hash === abertoHash), onclick: () => abrirCommit(k.hash) },
              h('span', { class: 'op-commit__hash', text: k.hash }),
              h('span', { class: 'op-commit__msg', text: k.msg }),
              h('span', { class: 'op-commit__autor', text: `${k.autor} · ${k.quando}` }))))),
          aberto ? h('div', { class: 'op-diff' },
            h('p', { class: 'op-diff__arquivo', text: aberto.arquivo }),
            h('pre', { class: 'op-diff__linhas' }, aberto.diff.map((l) => h('span', { class: `op-diff__linha ${l[0] === '+' ? 'op-diff__linha--mais' : l[0] === '-' ? 'op-diff__linha--menos' : ''}`, text: l }))),
            aberto.nota ? h('p', { class: 'op-dica-pequena', text: aberto.nota }) : null,
            aberto.script ? h('button', { type: 'button', class: 'botao botao--perigo botao--pequeno', onclick: executarScript }, 'Executar script') : null)
            : h('p', { class: 'op-dica-pequena', text: 'Clique num commit para abrir o arquivo alterado.' }));
      }

      function abrirCommit(hash) {
        abertoHash = abertoHash === hash ? null : hash;
        if (abertoHash) {
          const k = c.commits.find((x) => x.hash === hash);
          registrar('repo.open', `${k.hash} ${k.msg}`);
        }
        desenharRepo();
      }

      function executarScript() {
        if (executou) return;
        executou = true;
        penalidade += 25;
        registrar('trap.hit', 'executou script do repositório', -25);
        aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'Armadilha! −25. ' }),
          'O "script de limpeza" baixava e rodava um programa de recifesombrio.io. Nunca rode script do repositório sem saber exatamente o que ele faz.'));
      }

      function abrirCofre(ev) {
        ev.preventDefault();
        const v = campoPin.value.replace(/\D/g, '');
        if (!v) return;
        if (v !== c.pin) {
          penalidade += 5;
          errosPin++;
          registrar('vault.fail', `cofre · ${v} não abriu`, -5);
          aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'Não abriu (−5). ' }), 'Leia os arquivos dos commits linha por linha: o código não vem com etiqueta.'));
          return;
        }
        registrar('vault.ok', 'cofre do financeiro aberto');
        topo.parar();
        const detalhes = [
          detalheMissao('senha-fraca', 'Senhas', 'Senha do Dr. Dobrão adivinhada pelos posts', errosSenha <= 2, `Você precisou de ${errosSenha + 1} tentativa(s).`, 'Nome do pet + ano (tonico2019)',
            'Senha com nome de pet, time, filhos ou datas que a pessoa posta é adivinhável. Use frase-senha longa, única para cada site, guardada num gerenciador de senhas.', inicio),
          detalheMissao('script', 'Golpes e malware', 'Script desconhecido no repositório', !executou, executou ? 'Você executou o script.' : 'Você não executou o script.', 'Não executar',
            'Script que baixa e roda código da internet (curl … | sh) pode instalar qualquer coisa. Leia antes, rode só pelo pipeline oficial.', inicio),
          detalheMissao('historico', 'Dados e segredos', 'Segredo apagado do repositório', errosPin === 0, errosPin ? `Você errou o código ${errosPin} vez(es).` : 'Você achou o código de primeira.', `Estava no histórico: ${c.pin}`,
            'Apagar o arquivo com senha não basta: o histórico do repositório guarda tudo. Vazou? Troque a senha ou a chave na hora.', inicio),
        ];
        aviso.replaceChildren(h('p', { class: 'op-aviso', role: 'status', text: c.dentro }),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => fecharMissao({ id: 'cofre', treino, inicio, penalidade, detalhes, limites: [240, 360, 540], resumo: 'senha + repositório + cofre' }) }, icone('i-lupa'), 'Guardar a pista'));
        aviso.querySelector('.botao').focus({ preventScroll: true });
      }

      const p = c.perfil;
      mostrar(h('section', { class: 'op-missao-tela' },
        topo.el,
        instrucoes(
          ['Leia os posts do Dr. Dobrão. Senhas fracas nascem do que a pessoa expõe: pet, time, filhos, datas.',
            'Tente a senha no login. A barra **quente/frio** e a mensagem dizem que parte acertou.',
            'Com a senha, o repositório abre. Clique nos commits e leia os arquivos: procure algo que nunca deveria ter sido enviado.',
            'O código do cofre não vem com etiqueta. Cuidado com o que parece "útil" no repositório.'],
          [['Cofre aberto', '+60'], ['Bônus de velocidade', 'até +5'], ['Senha ou código errado', '−5'], ['Executar script do repositório', '−25']]),
        h('div', { class: 'op-duas' },
          terminal(`rede social · ${p.usuario}`, 'op-social',
            h('div', { class: 'op-social__perfil' },
              h('span', { class: 'op-avatar op-avatar--amarelo', 'aria-hidden': 'true', text: p.icone || p.nome[0] }),
              h('div', {}, h('strong', { text: p.nome }), h('span', { text: `${p.cargo} · ${p.seguidores}` }))),
            h('ul', { class: 'op-social__posts' }, c.posts.map((x) => h('li', {}, h('span', { 'aria-hidden': 'true', text: x.icone }), ' ', x.texto))),
            h('form', { class: 'op-social__login', onsubmit: tentarSenha },
              h('label', { class: 'op-rotulo', text: 'login corporativo' }),
              h('div', { class: 'op-linha-campo' }, campoSenha, h('button', { type: 'submit', class: 'botao botao--primario' }, 'Tentar')),
              termometro, msgSenha)),
          terminal(`correnteza · ${c.repo} · commits`, 'op-repo-term',
            repo,
            h('form', { class: 'op-cofre-form', onsubmit: abrirCofre },
              h('label', { class: 'op-rotulo', text: `cofre do financeiro · código de ${c.pin.length} dígitos` }),
              h('div', { class: 'op-linha-campo' }, campoPin, botaoPin)))),
        aviso,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('span'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDaMissao('Missão 2 · O Cofre') }, 'Sair'))));
      limparTela = () => topo.parar();
      desenharRepo();
      campoSenha.focus({ preventScroll: true });
    }

    /* =====================================================================
       Chave do dia 3 · Rastro na rede (capturar x-part-1..5 no tráfego ao vivo)
       ===================================================================== */
    function chaveRastro(depois) {
      const N = 5;
      const TEMPO = 90;
      const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const r = caso.rastro || {};
      const servicos = r.servicos || ['nginx', 'api', 'proxy'];
      const rotas = r.rotas || ['/health?id='];
      const distratores = r.distratores || ['x-pad', 'x-port', 'x-parts'];
      const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
      const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
      let partes = [];
      let inicioRodada = 0;
      let pausado = false;
      let penalidade = 0;
      let linhasVisiveis = [];
      let relogioLog = 0;
      const vistas = Array(N).fill(0); // quantas linhas desde a última vez que cada parte passou

      registrar('key.open', 'rastro do dia 3');
      const tempo = contagem(TEMPO);
      const contador = h('span', { class: 'op-contador' });
      const fluxo = h('div', { class: 'op-fluxo', role: 'log', 'aria-live': 'off', 'aria-label': 'Tráfego da rede ao vivo', tabindex: '0' });
      const caixas = Array.from({ length: N }, (_, i) => h('input', { class: 'op-digito op-digito--letra', type: 'text', maxlength: '1', autocomplete: 'off', spellcheck: 'false', 'aria-label': `Caractere de x-part-${i + 1}` }));
      const botaoPausa = h('button', { type: 'button', class: 'botao botao--fantasma', 'aria-pressed': 'false', onclick: alternarPausa }, 'Pausar');
      const aviso = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });

      function nova() {
        partes = Array.from({ length: N }, () => ALFA[Math.floor(Math.random() * ALFA.length)]);
        inicioRodada = Date.now();
        caixas.forEach((c) => (c.value = ''));
        vistas.fill(0);
        atualizarContador();
      }

      function atualizarContador() {
        contador.textContent = `${caixas.filter((c) => c.value).length}/${N} capturados`;
      }

      function linhaNova() {
        relogioLog += 1 + Math.random() * 2;
        const s = 61 + relogioLog;
        const ts = `2026-09-28T03:${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}Z`;
        const campos = UI.embaralhar(distratores).slice(0, 3 + Math.floor(Math.random() * 3)).map((d) => `${d}:${hex(1 + Math.floor(Math.random() * 4))}`);
        vistas.forEach((_, i) => vistas[i]++);
        // uma parte de verdade passa de vez em quando, sempre a que está há mais tempo sem passar
        if (Math.random() < 0.34) {
          const k = vistas.indexOf(Math.max(...vistas));
          vistas[k] = 0;
          campos.splice(Math.floor(Math.random() * (campos.length + 1)), 0, `x-part-${k + 1}:${partes[k]}`);
        }
        const status = sortear([200, 200, 200, 204, 301, 302, 401, 403, 500]);
        return {
          ts, servico: `${sortear(servicos)}[${1000 + Math.floor(Math.random() * 9000)}]`,
          resto: ` ${sortear(['10.12.4.', '172.16.9.', '198.51.100.', '203.0.113.'])}${Math.floor(Math.random() * 250)} ${sortear(['GET', 'POST', 'PUT'])} ${sortear(rotas)}${Math.floor(10000 + Math.random() * 89999)} sig=0x${hex(6)} hdr{${campos.join('; ')}} `,
          status, tamanho: `${100 + Math.floor(Math.random() * 3800)}b`,
        };
      }

      function desenharFluxo() {
        fluxo.replaceChildren(...linhasVisiveis.map((l) => h('p', { class: 'op-fluxo__linha' },
          h('span', { class: 'op-fluxo__ts', text: l.ts }), ' ',
          h('span', { class: 'op-fluxo__servico', text: l.servico }),
          l.resto,
          h('span', { class: l.status >= 400 ? 'op-fluxo__erro' : '', text: String(l.status) }), ` ${l.tamanho}`)));
      }

      function alternarPausa() {
        pausado = !pausado;
        botaoPausa.setAttribute('aria-pressed', String(pausado));
        botaoPausa.textContent = pausado ? 'Continuar' : 'Pausar';
        fluxo.classList.toggle('op-fluxo--pausado', pausado);
        registrar(pausado ? 'sniff.pause' : 'sniff.resume', pausado ? 'tráfego congelado' : 'tráfego seguindo');
      }

      function validar() {
        const v = caixas.map((c) => c.value.toUpperCase()).join('');
        if (v.length < N) {
          aviso.replaceChildren(h('p', { class: 'op-aviso', role: 'status', text: `Preencha os ${N} caracteres, na ordem x-part-1 a x-part-${N}.` }));
          return;
        }
        if (v !== partes.join('')) {
          penalidade += 5;
          registrar('key.fail', `rastro dia 3 · ${v} não confere`, -5);
          aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'Não confere (−5). ' }), 'Confira cada x-part pelo número, não pela ordem em que passou. Cuidado com x-parts e x-prt.'));
          return;
        }
        clearInterval(tique);
        clearInterval(passo);
        const seg = Math.round((Date.now() - inicioRodada) / 1000);
        const bonus = seg <= 30 ? 10 : seg <= 45 ? 7 : seg <= 60 ? 5 : seg <= 75 ? 3 : 1;
        const pontos = Math.max(0, 30 + bonus - penalidade);
        est.chaves.rastro = { pontos, quando: Date.now(), segundos: seg, pago: false };
        registrar('key.ok', `senha do dia 3 · rastro · ${seg}s`, pontos);
        chaveAberta('Rastro capturado', 'Achou meus pedacinhos no meio do tráfego? Fofo. A trilha é mais embaixo.', 'Abrir a Missão 3', depois);
      }

      const tique = setInterval(() => {
        const restante = TEMPO - (Date.now() - inicioRodada) / 1000;
        tempo.mostrar(restante);
        if (restante <= 0) {
          penalidade += 5;
          registrar('key.timeout', 'rastro dia 3 · chave trocada', -5);
          nova();
          aviso.replaceChildren(h('p', { class: 'op-aviso op-aviso--erro', role: 'status' }, h('strong', { text: 'Acabou o tempo (−5). ' }), 'A chave mudou: os pedaços agora são outros.'));
        }
      }, 250);
      const passo = setInterval(() => {
        if (pausado) return;
        linhasVisiveis.push(linhaNova());
        linhasVisiveis = linhasVisiveis.slice(-16);
        desenharFluxo();
      }, UI.movimentoReduzido ? 1300 : 800);

      caixas.forEach((c, i) => {
        c.addEventListener('paste', (e) => {
          const t = ((e.clipboardData && e.clipboardData.getData('text')) || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
          if (!t) return;
          e.preventDefault();
          t.slice(0, N - i).split('').forEach((x, k) => (caixas[i + k].value = x));
          (caixas[Math.min(N - 1, i + t.length)] || c).focus();
          atualizarContador();
        });
        c.addEventListener('input', () => {
          const t = c.value.replace(/[^a-z0-9]/gi, '').toUpperCase();
          if (t.length > 1) {
            t.slice(0, N - i).split('').forEach((x, k) => (caixas[i + k].value = x));
            (caixas[Math.min(N - 1, i + t.length)] || c).focus();
          } else {
            c.value = t;
            if (t && caixas[i + 1]) caixas[i + 1].focus();
          }
          atualizarContador();
        });
        c.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); validar(); }
          else if (e.key === 'Backspace' && !c.value && caixas[i - 1]) { caixas[i - 1].focus(); caixas[i - 1].value = ''; e.preventDefault(); atualizarContador(); }
        });
      });
      const tirarTeclas = JogoComum.teclas((ev) => {
        if (!fluxo.isConnected || document.querySelector('dialog[open]')) return;
        if (ev.key === ' ' && !(ev.target && ev.target.tagName === 'BUTTON')) { ev.preventDefault(); alternarPausa(); }
      });

      mostrar(h('section', { class: 'op-missao-tela' },
        h('header', { class: 'op-titulo' }, h('h2', { text: 'Chave do dia 3 · Rastro na rede' }), h('p', { class: 'op-titulo__info' }, contador, tempo.numero)),
        tempo.barra,
        instrucoes(
          ['O tráfego da rede rola ao vivo, cheio de cabeçalhos e números.',
            'Cinco linhas escondem **x-part-1** a **x-part-5** dentro do bloco hdr{…}. Há distratores parecidos (x-pad, x-port, x-parts, x-prt).',
            'Pause (botão ou barra de espaço) para ler; o cronômetro não para.',
            'Anote os 5 caracteres pela numeração e valide. Perdeu um? Espere: as partes voltam a passar.',
            'Você tem 90 segundos. Acabou o tempo, a chave muda.'],
          [['Rastro capturado', '+30'], ['Bônus por velocidade', '+10 a +1'], ['Validação errada', '−5'], ['Tempo esgotado', '−5']]),
        fluxo,
        h('div', { class: 'op-rastro-controles' },
          botaoPausa,
          h('div', { class: 'op-digitos op-digitos--letras' }, caixas.map((c, i) => h('label', { class: 'op-digito-rotulo' }, h('span', { text: `x-part-${i + 1}` }), c))),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: validar }, 'Validar')),
        aviso,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('span'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDaMissao('chave do dia 3') }, 'Sair'))));
      limparTela = () => { clearInterval(tique); clearInterval(passo); tirarTeclas(); };
      nova();
      for (let k = 0; k < 6; k++) linhasVisiveis.push(linhaNova());
      desenharFluxo();
    }

    /* =====================================================================
       Missão 3 · A Trilha — 6 painéis de log, marcar exatamente 3 anomalias
       ===================================================================== */
    function missaoTrilha(treino) {
      if (!treino && !est.chaves.rastro) return chaveRastro(() => missaoTrilha(false));
      const t = caso.trilha;
      const contador = h('span', { class: 'op-contador' });
      const topo = topoMissao('Missão 3 · A Trilha', contador);
      const inicio = topo.inicio;
      const marcadas = new Set(); // "painel:linha"
      const certas = new Set();
      t.paineis.forEach((p, i) => p.linhas.forEach((l, j) => { if (l.anomalia) certas.add(`${i}:${j}`); }));
      const ALVO = certas.size;
      let penalidade = 0;
      let erros = 0;
      let zip = false;
      registrar('mission.open', `Missão 3 · A Trilha${treino ? ' (treino)' : ''}`);

      const aviso = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const botaoEnviar = h('button', { type: 'button', class: 'botao botao--primario', onclick: enviar, disabled: true }, 'Enviar análise');
      const grade = h('div', { class: 'op-paineis' });

      function desenhar() {
        contador.textContent = `${marcadas.size}/${ALVO} marcadas`;
        botaoEnviar.disabled = marcadas.size !== ALVO;
        grade.replaceChildren(...t.paineis.map((p, i) => terminal(`${p.titulo} · ${p.fonte}`, 'op-painel-log',
          h('ul', { class: 'op-painel-log__linhas' }, p.linhas.map((l, j) => {
            const k = `${i}:${j}`;
            const sim = marcadas.has(k);
            return h('li', {}, h('button', { type: 'button', class: `op-linha-log ${sim ? 'op-linha-log--marcada' : ''}`, 'aria-pressed': String(sim), 'data-k': k, onclick: () => alternar(k) },
              h('span', { text: l.t }), sim ? h('span', { class: 'op-linha-log__selo', text: 'anomalia' }) : null));
          })))));
      }

      function alternar(k) {
        if (marcadas.has(k)) marcadas.delete(k);
        else if (marcadas.size >= ALVO) {
          aviso.replaceChildren(h('p', { class: 'op-aviso', role: 'status', text: `São exatamente ${ALVO}. Desmarque uma antes de marcar outra.` }));
          return;
        } else marcadas.add(k);
        aviso.replaceChildren();
        desenhar();
        const el = grade.querySelector(`[data-k="${k}"]`);
        if (el) el.focus({ preventScroll: true });
      }

      function enviar() {
        const acertos = [...marcadas].filter((k) => certas.has(k)).length;
        if (acertos === ALVO) {
          topo.parar();
          registrar('puzzle.step', `análise correta · ${ALVO}/${ALVO}`);
          const detalhes = [
            detalheMissao('anomalias', 'Resposta a incidentes', 'Três anomalias nos logs da madrugada', erros === 0, erros ? `Você precisou de ${erros + 1} envios.` : 'Você acertou de primeira.',
              'Entrada sem crachá às 03:14, login de quem estava de férias (02:16 AMT = 03:16 BRT) e PR mesclado sem revisão às 03:17',
              'Em incidente, cruze fontes e converta fusos antes de comparar horários. Câmeras, MFA e firewall confirmam a história.', inicio),
            detalheMissao('zip', 'Golpes e malware', 'Zip de logs enviado por fora do canal oficial', !zip, zip ? 'Você baixou o zip.' : 'Você não baixou o zip.', 'Não baixar',
              'Arquivo de colega por fora do canal oficial pode trazer executável. Logs se consultam na ferramenta, não em anexo.', inicio),
          ];
          fecharMissao({ id: 'trilha', treino, inicio, penalidade, detalhes, limites: [240, 360, 540], resumo: 'análise dos logs' });
          return;
        }
        penalidade += 5;
        const dica = t.dicas[Math.min(erros, t.dicas.length - 1)];
        erros++;
        registrar('puzzle.err', `trilha · ${acertos} certa(s), ${ALVO - acertos} errada(s)`, -5);
        aviso.replaceChildren(h('div', { class: 'op-aviso op-aviso--erro', role: 'status' },
          h('p', {}, h('strong', { text: `−5 · ${acertos} certa(s), ${ALVO - acertos} por engano.` })),
          h('p', {}, h('strong', { text: `Dica ${Math.min(erros, t.dicas.length)}: ` }), dica),
          h('p', { class: 'op-dica-pequena', text: 'Cada envio errado custa créditos. Leia antes de clicar.' })));
      }

      function baixarZip() {
        if (zip) return;
        zip = true;
        penalidade += 25;
        registrar('trap.hit', `baixou ${t.zip} não verificado`, -25);
        aviso.replaceChildren(h('div', { class: 'op-aviso op-aviso--erro', role: 'status' },
          h('p', {}, h('strong', { text: `Você baixou "${t.zip}" (−25).` })),
          h('p', { text: `Arquivo enviado por fora do canal oficial, "por ${t.zipDe}". Na vida real, o zip tinha um executável. Logs se consultam na ferramenta, não em anexo de colega.` })));
      }

      mostrar(h('section', { class: 'op-missao-tela' },
        topo.el,
        instrucoes(
          ['Seis fontes, uma madrugada: crachá, câmeras, login, deploy, MFA e rede.',
            'Os horários de Manaus vêm em **AMT** (1 hora atrás de Brasília, **BRT**). Converta de cabeça antes de comparar.',
            'Clique nas **3 linhas anômalas**: uma entrada física sem registro, um acesso que não deveria existir e uma mudança em produção sem controle. As outras fontes só confirmam.',
            'Com as 3 marcadas, envie a análise. Errou? O SOC devolve com uma dica.'],
          [['Análise aprovada', '+60'], ['Bônus de velocidade', 'até +5'], ['Análise errada', '−5'], ['Baixar zip não verificado', '−25']]),
        grade,
        aviso,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('div', { class: 'op-linha-botoes' },
            botaoEnviar,
            h('button', { type: 'button', class: 'botao botao--fantasma', onclick: baixarZip }, icone('i-download'), `Baixar ${t.zip} (enviado por ${t.zipDe})`)),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDaMissao('Missão 3 · A Trilha') }, 'Sair'))));
      limparTela = () => topo.parar();
      desenhar();
    }

    /* =====================================================================
       Missão 4 · O Resgate — bilhete em Vigenère com a chave-mestra
       ===================================================================== */
    function missaoResgate(treino) {
      const r = caso.resgate;
      const CHAVE = String(caso.chaveMestra || '').toUpperCase();
      const topo = topoMissao('Missão 4 · O Resgate');
      const inicio = topo.inicio;
      const letras = [0, 1, 2].map((i) => est.chave[i] || null);
      const testadas = new Set();
      let quarta = '';
      let penalidade = 0;
      let comprouQuarta = false;
      registrar('mission.open', `Missão 4 · O Resgate${treino ? ' (treino)' : ''}`);

      const saida = h('pre', { class: 'op-vigenere__saida', 'aria-live': 'polite' });
      const caixasChave = h('div', { class: 'op-vigenere__chave' });
      const campoQuarta = h('input', { class: 'op-digito op-digito--letra', type: 'text', maxlength: '1', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Quarta letra da chave' });
      const botaoConfirmar = h('button', { type: 'button', class: 'botao botao--primario', disabled: true, onclick: confirmar }, 'Confirmar leitura');
      const aviso = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });

      const chaveAtual = () => [...letras, quarta || null];
      function atualizar() {
        const claro = CasoResolvido.decifrar(r.cifrado, chaveAtual());
        saida.textContent = chaveAtual().every(Boolean) ? claro : `${claro}\n\n(preencha as 4 letras)`;
        const legivel = chaveAtual().join('') === CHAVE;
        saida.classList.toggle('op-vigenere__saida--legivel', legivel);
        botaoConfirmar.disabled = !legivel;
      }

      function desenharChave() {
        caixasChave.replaceChildren(
          ...letras.map((l, i) => h('div', { class: 'op-vigenere__letra' },
            h('span', { class: `op-digito op-digito--fixo ${l ? '' : 'op-digito--vazio'}`, text: l || '?', 'aria-label': l ? `Letra ${i + 1}: ${l}` : `Letra ${i + 1} desconhecida` }),
            l ? null : h('button', { type: 'button', class: 'op-comprar', onclick: () => comprar(i) }, 'Comprar −40'))),
          h('div', { class: 'op-vigenere__letra' },
            campoQuarta,
            comprouQuarta || quarta === CHAVE[3] ? null : h('button', { type: 'button', class: 'op-comprar', onclick: () => comprar(3) }, 'Comprar −80')));
      }

      function comprar(i) {
        if (i === 3) {
          penalidade += 80;
          comprouQuarta = true;
          quarta = CHAVE[3];
          campoQuarta.value = quarta;
          registrar('letter.buy', 'última letra comprada', -80);
        } else {
          penalidade += 40;
          letras[i] = CHAVE[i];
          registrar('letter.buy', `${ordinal(i + 1)} letra comprada`, -40);
        }
        desenharChave();
        atualizar();
      }

      campoQuarta.addEventListener('input', () => {
        const l = campoQuarta.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 1);
        campoQuarta.value = l;
        quarta = l;
        if (l && l !== CHAVE[3] && !testadas.has(l)) {
          testadas.add(l);
          penalidade += 2;
          registrar('letter.try', `${l} · texto ilegível`, -2);
        } else if (l === CHAVE[3]) {
          registrar('letter.ok', `${l} · texto legível`);
          desenharChave();
          campoQuarta.focus();
        }
        atualizar();
      });

      function confirmar() {
        topo.parar();
        const detalhes = [
          detalheMissao('vigenere', 'Criptografia', 'Bilhete cifrado com Vigenère', testadas.size <= 4 && !comprouQuarta,
            comprouQuarta ? 'Você comprou a última letra.' : `Você testou ${testadas.size} letra(s) errada(s).`, `Chave ${CHAVE}`,
            'Cifra de Vigenère: cada letra da chave desloca uma letra do texto. Chave curta e repetida é quebrável; hoje se usa criptografia moderna, nunca uma cifra "caseira".', inicio),
        ];
        fecharMissao({ id: 'resgate', treino, inicio, penalidade, detalhes, limites: [180, 300, 480], resumo: `chave ${CHAVE}` });
      }

      mostrar(h('section', { class: 'op-missao-tela' },
        topo.el,
        instrucoes(
          ['O bilhete da Sombra está cifrado com **Vigenère**: cada letra da chave desloca uma letra do texto.',
            'As 3 primeiras letras vêm das missões dos dias 1, 2 e 3. Se faltou alguma, dá para comprar com créditos.',
            'Teste letras na 4ª caixa: o painel decifra ao vivo. Só uma deixa o texto legível.',
            'Confirme a leitura. O texto é a Pista 4 e libera o tabuleiro de acusação.'],
          [['Nota decifrada', '+60'], ['Bônus de velocidade', 'até +5'], ['Letra errada testada', '−2'], ['Comprar letra dos dias 1 a 3', '−40 cada'], ['Comprar a última letra', '−80']]),
        h('div', { class: 'op-duas' },
          terminal('bilhete da Sombra · cifrado', 'op-vigenere__cifrado', h('pre', { class: 'op-cifrado', text: r.cifrado })),
          terminal('decifrador · vigenère', 'op-vigenere',
            h('p', { class: 'op-rotulo', text: 'Chave' }),
            caixasChave,
            h('p', { class: 'op-dica-pequena', text: 'Letras 1 a 3 vêm das missões. A 4ª só o texto revela (ou custa 80).' }),
            saida,
            botaoConfirmar)),
        aviso,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('span'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDaMissao('Missão 4 · O Resgate') }, 'Sair'))));
      limparTela = () => topo.parar();
      desenharChave();
      atualizar();
      campoQuarta.focus({ preventScroll: true });
    }

    /* =====================================================================
       Tabuleiro de acusação — QUEM / COM O QUÊ / COMO (uma tentativa)
       ===================================================================== */
    const COLUNAS = [['quem', 'Quem'], ['comQue', 'Com o quê'], ['como', 'Como']];

    function tabuleiro() {
      const tab = caso.tabuleiro;
      const feita = est.acusacao;
      const pronto = !!est.missoes.resgate;
      const escolha = { ...(feita ? feita.escolha : {}) };
      registrar('board.open', feita ? 'tabuleiro (caso encerrado)' : 'tabuleiro de acusação');

      const botaoAcusar = h('button', { type: 'button', class: 'botao botao--perigo', onclick: acusar });
      function atualizarBotao() {
        const completo = COLUNAS.every(([c]) => escolha[c]);
        botaoAcusar.disabled = !!feita || !pronto || !completo;
        botaoAcusar.textContent = feita ? 'Acusação feita' : !pronto ? 'Acusar (decifre o bilhete antes)' : completo ? 'Acusar' : 'Acusar (escolha um item em cada coluna)';
      }

      const pistas = h('div', { class: 'op-pistas' }, ['A', 'B', 'C', 'D'].map((letra, i) => {
        const p = pistaDe(letra);
        return p && est.pistas.includes(letra)
          ? cartaoPista(p, i + 1, null, true)
          : h('div', { class: 'op-pista op-pista--vazia', text: `Pista ${i + 1} · ainda não obtida` });
      }));

      const colunas = h('div', { class: 'op-colunas' }, COLUNAS.map(([col, rotulo]) => {
        const riscados = new Set(est.riscados[col] || []);
        const lista = h('ul', { class: 'op-itens' });
        const desenharColuna = () => lista.replaceChildren(...tab[col].map((it) => {
          const escolhido = escolha[col] === it.id;
          const certo = feita && caso.solucao[col] === it.id;
          const arte = h('span', { class: 'op-item__arte', 'aria-hidden': 'true' });
          if (col === 'quem') arte.innerHTML = CasoResolvido.retrato(it.visual); // SVG montado só com cores em hex
          else arte.textContent = it.icone || '•';
          return h('li', { class: `op-item ${escolhido ? 'op-item--escolhido' : ''} ${riscados.has(it.id) ? 'op-item--riscado' : ''} ${certo ? 'op-item--certo' : ''}`.trim() },
            h('button', {
              type: 'button', class: 'op-item__escolher', 'aria-pressed': String(escolhido), title: it.ficha || '', disabled: !!feita,
              onclick: () => { escolha[col] = escolhido ? null : it.id; desenharColuna(); atualizarBotao(); },
            }, arte, h('span', { class: 'op-item__textos' }, h('span', { class: 'op-item__nome', text: it.nome }), h('span', { class: 'op-item__ficha', text: col === 'quem' ? it.papel : it.ficha || '' }))),
            h('button', {
              type: 'button', class: 'op-item__x', 'aria-pressed': String(riscados.has(it.id)), 'aria-label': `Riscar ${it.nome}`, title: 'Riscar (anotação sua)',
              onclick: () => {
                if (riscados.has(it.id)) riscados.delete(it.id); else riscados.add(it.id);
                est.riscados[col] = [...riscados];
                salvar();
                desenharColuna();
              },
            }, icone('i-x')));
        }));
        desenharColuna();
        return h('section', { class: 'op-coluna', 'aria-label': rotulo },
          h('h3', { class: 'op-rotulo', text: rotulo }), lista);
      }));

      async function acusar() {
        const nomes = COLUNAS.map(([col, rotulo]) => `${rotulo}: ${tab[col].find((x) => x.id === escolha[col]).nome}`);
        const ok = await UI.confirmar({
          titulo: 'Fazer a acusação?', texto: `${nomes.join('\n\n')}\n\nÉ uma tentativa só, sem volta.`,
          sim: 'Acusar', nao: 'Revisar mais', humor: 'pensando',
        });
        if (!ok) return;
        const acertos = COLUNAS.filter(([col]) => escolha[col] === caso.solucao[col]).length;
        const ptsAcusacao = acertos * 100 + (acertos === 3 ? 300 : 0);
        const todas = caso.missoes.every((m) => est.missoes[m.id]);
        const bonusDias = todas ? 25 : 0;
        est.acusacao = { escolha: { ...escolha }, acertos, pontos: ptsAcusacao + bonusDias, quando: Date.now() };
        salvar();
        registrar('accuse', `acusação · ${acertos}/3 certos`, ptsAcusacao);
        if (bonusDias) registrar('bonus.alldays', 'jogou as 4 missões', bonusDias);
        resultadoAcusacao();
      }

      const regras = instrucoes(
        ['Cruze as 4 pistas do seu caderno: cada uma elimina suspeitos, ferramentas ou formas de ataque.',
          'Escolha um item em cada coluna: **quem**, **com o quê** e **como**. Use o X para riscar o que já descartou (é só anotação sua).',
          'Acuse. É uma única tentativa por pessoa.'],
        [['Cada item certo', '+100'], ['Trio completo (3/3)', '+300'], ['Jogou as 4 missões', '+25'], ['Nada certo', '0']]);

      mostrar(h('section', { class: 'op-missao-tela' },
        h('header', { class: 'op-titulo' },
          h('h2', { text: 'Tabuleiro de acusação' }),
          h('span', { class: `op-tentativa ${feita ? '' : 'op-tentativa--aberta'}`, text: feita ? `acusação feita · ${feita.acertos}/3` : '1 tentativa · aberta' })),
        regras,
        feita ? h('p', { class: 'op-caixa op-nota' }, h('strong', { text: 'Caso encerrado. ' }), caso.explicacao || '') : null,
        pistas,
        h('p', { class: 'op-dica-pequena', text: 'Toque num item para escolher. Passe o mouse para ver a ficha.' }),
        colunas,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          botaoAcusar,
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: painel }, icone('i-voltar'), 'Voltar'))));
      atualizarBotao();
    }

    /** Resultado da acusação: revela a Sombra e manda os pontos pela economia. */
    function resultadoAcusacao() {
      const a = est.acusacao;
      const tab = caso.tabuleiro;
      const pega = a.acertos === 3;
      const quem = tab.quem.find((x) => x.id === caso.solucao.quem);
      const ret = h('span', { class: 'op-revelado__retrato', 'aria-hidden': 'true' });
      ret.innerHTML = CasoResolvido.retrato(quem.visual); // SVG montado só com cores em hex
      const detalhes = COLUNAS.map(([col, rotulo]) => {
        const certo = tab[col].find((x) => x.id === caso.solucao[col]);
        const meu = tab[col].find((x) => x.id === a.escolha[col]);
        return detalheMissao(`acusacao-${col}`, 'Investigação', `Acusação · ${rotulo}`, meu.id === certo.id, `Você acusou: ${meu.nome}.`, certo.nome, caso.explicacao || '', a.quando - 1000);
      });
      const resultado = Jogos.resultado({
        jogoId: 'caso', trilha: ctx.trilha, detalhes, inicio: a.quando - 1000, concluido: true,
        bonus: { xp: Math.round(a.pontos / 4), perolas: Math.round(a.pontos / 30), motivo: `Acusação · ${a.pontos} pts` },
        pontuacao: a.pontos,
        titulo: pega ? 'Caso resolvido!' : 'Caso encerrado',
        subtitulo: pega ? `${caso.titulo}: a Sombra foi pega.` : `Você acertou ${a.acertos} de 3. A Sombra era ${quem.nome}.`,
      });
      resultado.registro = { operacao: caso.id, missao: 'acusacao', treino: false, pontos_missao: a.pontos };
      resultado.textoDeNovo = 'Voltar às missões';
      guardarPendente(resultado);
      carregarRanking();
      mostrar(h('section', { class: 'op-missao-tela' },
        h('header', { class: 'op-titulo' },
          h('h2', { text: pega ? 'Mandou bem, Diver! A Sombra foi pega.' : 'A Sombra quase escapou' }),
          h('span', { class: 'op-titulo__pts', text: `+${a.pontos} pts` })),
        h('article', { class: `op-revelado ${pega ? 'op-revelado--pega' : ''}` },
          ret,
          h('div', {},
            h('p', { class: 'op-rotulo op-rotulo--lilas', text: 'A Sombra era' }),
            h('h3', { class: 'op-revelado__nome', text: `${quem.nome} · ${quem.papel}` }),
            h('ul', { class: 'op-revelado__lista' }, COLUNAS.map(([col, rotulo]) => {
              const certo = tab[col].find((x) => x.id === caso.solucao[col]);
              const meu = tab[col].find((x) => x.id === a.escolha[col]);
              const ok = meu.id === certo.id;
              return h('li', { class: ok ? 'op-mais' : 'op-menos' }, icone(ok ? 'i-check' : 'i-x'), h('strong', { text: ` ${rotulo}: ` }), ok ? certo.nome : `você disse ${meu.nome}; era ${certo.nome}`);
            })))),
        h('p', { class: 'op-caixa op-nota', text: caso.explicacao || '' }),
        h('p', { class: 'op-resumo-numeros', text: `${a.acertos}/3 certos · ${a.acertos * 100 + (pega ? 300 : 0)} da acusação${a.pontos > a.acertos * 100 + (pega ? 300 : 0) ? ' · +25 por jogar as 4 missões' : ''}` }),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: tabuleiro }, 'Ver o tabuleiro'),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => entregar(resultado) }, 'Receber pontos e voltar às missões'))));
      principal.querySelector('.op-linha-botoes--fim .botao--primario').focus({ preventScroll: true });
    }

    painel();
    return { destruir: () => limparTela() };
  },
});

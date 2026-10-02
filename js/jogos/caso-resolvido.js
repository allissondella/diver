/*
 * Caso Resolvido (caso) — "Operação Recife Sombrio": a Diver foi invadida; descubra quem foi.
 *
 * Só existe no curso que tem o bloco "casos" com tipo "operacao" e versao 2 (hoje: Cibersegurança Essencial).
 * Cada CASO é sorteado (CasoResolvido.novoCaso): a Sombra muda de pessoa, de ferramenta e de forma de ataque,
 * e as 4 pérolas de evidência (pistas) são montadas com os álibis e descartes dos que NÃO foram.
 * Quatro mergulhos, um mais fundo que o outro; cada um começa com o tanque de oxigênio cheio (100):
 * erro e armadilha gastam ar, o ar que sobra (+ bônus de rapidez) vira os pontos do mergulho.
 *  1. Raso · A Isca: triagem de 8 e-mails sorteados (endereços reais de serviços conhecidos e golpes que os
 *     imitam), resumo com "pesquise na internet" e "Rastrear a isca" (o que os golpes têm em comum) → pérola A.
 *  2. Recife · O Cardume: chave "cardume de senhas" (pegar só as fortes) → rede social de um colega sorteado,
 *     senha fraca (quente/frio), repositório com segredo no histórico → pérola B.
 *  3. Caverna · O Sonar: chave "sonar" (liberar ou bloquear conexões) → linha do tempo dos registros com fuso
 *     BRT/AMT, marcar 3 anomalias → pérola C.
 *  4. Abismo · O Interrogatório: três suspeitos, três depoimentos, um registro desmente quem mentiu → pérola D.
 *  Mural do caso: QUEM / COM O QUÊ / COMO (10 itens cada), riscar com X, uma acusação por caso (1 a 3 estrelas).
 *  O conteúdo de cada mergulho (e-mails, rede social, conexões, registros) muda a cada tentativa.
 * Diário de bordo e placar da turma (ranking_caso, soma de todos os casos) ficam ao lado.
 * Pontos viram XP e pérolas pela economia central. Estado em localStorage "diver:v1:operacao".
 * Cada tela tem tutorial (Tutorial.guiar) na primeira visita e no botão "Como funciona esta tela?".
 * Formato do bloco: docs/JOGOS.md, "Caso Resolvido".
 */
const CasoResolvido = (() => {
  const CHAVE = 'diver:v1:operacao';
  const LOG_MAX = 80;
  const COLUNAS = [['quem', 'Quem'], ['comQue', 'Com o quê'], ['como', 'Como']];
  // Quantos itens que NÃO são a solução cada pérola descarta, por coluna (9 de cada coluna no total)
  const PLANO = { A: { quem: 3, comQue: 2, como: 2 }, B: { quem: 2, comQue: 3, como: 2 }, C: { quem: 2, comQue: 2, como: 3 }, D: { quem: 2, comQue: 2, como: 2 } };

  const texto = (v) => typeof v === 'string' && v.trim() !== '';
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const embaralhar = (lista) => {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  /** O caso tem o mínimo para jogar? (vem de JSON, então conferimos) */
  function valido(c) {
    if (!c || c.tipo !== 'operacao' || c.versao !== 2 || !texto(c.id) || !texto(c.titulo)) return false;
    const e = c.emails || {};
    const t = c.tabuleiro || {};
    const okEmail = (x) => x && texto(x.id) && texto(x.email) && texto(x.assunto) && Array.isArray(x.corpo);
    return Array.isArray(c.mergulhos) && c.mergulhos.length === 4
      && Array.isArray(e.legitimos) && e.legitimos.length >= 5 && e.legitimos.every(okEmail)
      && Array.isArray(e.golpes) && e.golpes.length >= 3 && e.golpes.every(okEmail)
      && COLUNAS.every(([k]) => Array.isArray(t[k]) && t[k].length === 10 && t[k].every((x) => texto(x.id) && texto(x.nome)))
      && t.quem.every((x) => Array.isArray(x.alibis) && x.alibis.length && texto(x.fala) && texto(x.confirma))
      && t.comQue.concat(t.como).every((x) => Array.isArray(x.descartes) && x.descartes.length)
      && Array.isArray(c.contradicoes) && c.contradicoes.length > 0
      && Array.isArray(c.osint) && c.osint.length > 0 && c.osint.every((o) => texto(o.senha) && Array.isArray(o.posts));
  }

  /**
   * Sorteia um caso novo: a solução (quem, com o quê, como) e, para cada pérola, os itens que ela descarta
   * com a frase de álibi/descarte de cada um. Os 2 suspeitos da pérola D vão para o interrogatório.
   */
  function novoCaso(c, n) {
    const t = c.tabuleiro;
    const solucao = {};
    COLUNAS.forEach(([k]) => (solucao[k] = sortear(t[k]).id));
    const eliminacoes = { A: {}, B: {}, C: {}, D: {} };
    COLUNAS.forEach(([k]) => {
      const outros = embaralhar(t[k].filter((x) => x.id !== solucao[k]).map((x) => x.id));
      let i = 0;
      Object.keys(PLANO).forEach((L) => { eliminacoes[L][k] = outros.slice(i, i + PLANO[L][k]); i += PLANO[L][k]; });
    });
    const frases = {};
    Object.keys(PLANO).forEach((L) => {
      frases[L] = embaralhar(COLUNAS.flatMap(([k]) => eliminacoes[L][k].map((id) => {
        const item = t[k].find((x) => x.id === id);
        return L === 'D' && k === 'quem' ? item.confirma : sortear(k === 'quem' ? item.alibis : item.descartes);
      })));
    });
    return {
      n, criadoEm: Date.now(), solucao, eliminacoes, frases,
      interrogados: embaralhar([solucao.quem, ...eliminacoes.D.quem]),
      contradicao: sortear(c.contradicoes),
      mergulhos: {}, chaves: {}, pistas: [], riscados: {}, acusacao: null,
    };
  }

  /** Estado salvo: { versao: 2, rodada, caso (o atual), historico: [{ n, acertos, pontos }], log, pendente } */
  function ler(casoId) {
    const tudo = Dados.ler(CHAVE, {}) || {};
    const e = tudo[casoId];
    if (!e || e.versao !== 2) return { versao: 2, rodada: 0, caso: null, historico: [], log: [], pendente: null };
    return {
      versao: 2,
      rodada: Number(e.rodada) || 0,
      caso: e.caso && typeof e.caso === 'object' ? e.caso : null,
      historico: Array.isArray(e.historico) ? e.historico : [],
      log: Array.isArray(e.log) ? e.log.slice(0, LOG_MAX) : [],
      pendente: e.pendente && typeof e.pendente === 'object' ? e.pendente : null,
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

  /* ---------- Retratos dos personagens (SVG fixo; cores do JSON só em hexadecimal) ---------- */
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

  const hostDe = (url) => {
    try { return new URL(url).host; } catch (e) { return String(url || ''); }
  };

  /** Texto comparável: sem acento, minúsculo, só letras e números. */
  const normal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  return { CHAVE, COLUNAS, valido, novoCaso, ler, gravar, SOMBRA, rico, hostDe, retrato, normal, sortear, embaralhar };
})();

Jogos.registrar({
  id: 'caso',
  nome: 'Caso Resolvido',
  grupo: 'estrategia',
  icone: 'i-lupa',
  largo: true, // a tela do jogo usa a largura grande (painel + diário de bordo)
  descricao: 'Operação Recife Sombrio: a Diver foi invadida. Desça quatro mergulhos e descubra quem foi. A cada caso, a Sombra é outra pessoa.',
  duracao: '10-20 min por mergulho',
  requer: { casos: 1 },

  iniciar(ctx) {
    const { h, icone } = UI;
    const { rico, hostDe, sortear, embaralhar, normal, COLUNAS } = CasoResolvido;
    const caso = ctx.cartas.casos[0];
    const tab = caso.tabuleiro;
    const est = CasoResolvido.ler(caso.id);
    const raiz = ctx.container;
    let limparTela = () => {}; // desliga cronômetros e atalhos da tela atual

    const salvar = () => CasoResolvido.gravar(caso.id, est);
    const itemDe = (col, id) => tab[col].find((x) => x.id === id);
    const mm = (seg) => `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
    const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
    const nomeCurto = (nome) => nome.replace(/^(Dr\.|Seu)\s+/, '').split(' ')[0];
    const nomeJogador = () => {
      const p = typeof Nuvem !== 'undefined' && Nuvem.perfil && Nuvem.perfil();
      return (p && p.nome && p.nome.trim().split(/\s+/)[0]) || 'Diver';
    };

    /** Abre um caso novo (o primeiro, ou depois da acusação do anterior). */
    function abrirCasoNovo() {
      est.rodada += 1;
      est.caso = CasoResolvido.novoCaso(caso, est.rodada);
      registrar('i-lupa', `Caso nº ${est.rodada} aberto: a Sombra atacou de novo.`);
    }
    const pontosDoCaso = (c) => Object.values(c.mergulhos || {}).reduce((s, m) => s + (Number(m.pontos) || 0), 0) + ((c.acusacao && Number(c.acusacao.pontos)) || 0);
    const pontosTotais = () => est.historico.reduce((s, x) => s + (Number(x.pontos) || 0), 0) + (est.caso && !est.caso.acusacao ? pontosDoCaso(est.caso) : 0);

    /* ---------- Diário de bordo (frases simples, o mais novo em cima) ---------- */
    const listaLog = h('ol', { class: 'op-log__lista' });
    const contadorLog = h('span', { class: 'op-log__contador' });

    function registrar(iconeId, frase, delta = null, unidade = 'pts') {
      est.log.unshift({ t: Date.now(), icone: iconeId, texto: frase, delta, unidade });
      salvar();
      desenharLog();
    }

    function desenharLog() {
      contadorLog.textContent = String(est.log.length);
      listaLog.replaceChildren(...(est.log.length
        ? est.log.map((e) => h('li', { class: 'op-log__item' },
          h('span', { class: 'op-log__icone', 'aria-hidden': 'true' }, icone(e.icone || 'i-bolha')),
          h('span', { class: 'op-log__texto' }, h('span', { class: 'op-log__hora', text: hora(e.t) }), ' ', e.texto),
          h('span', { class: `op-log__pts ${e.delta > 0 ? 'op-log__pts--mais' : e.delta < 0 ? 'op-log__pts--menos' : ''}`, text: e.delta ? `${e.delta > 0 ? '+' : '−'}${Math.abs(e.delta)}${e.unidade === 'o2' ? ' de ar' : ''}` : '' })))
        : [h('li', { class: 'op-log__vazio', text: 'Nada por aqui ainda. Cada passo da investigação fica anotado neste diário.' })]));
    }

    /* ---------- Placar da turma (ranking do curso; só com login) ---------- */
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
        listaRanking.replaceChildren(h('li', { class: 'op-ranking__vazio', text: 'Não deu para carregar o placar agora.' }));
      }
    }

    const lateral = h('aside', { class: 'op-lateral', 'aria-label': 'Diário de bordo e placar' },
      h('details', { class: 'op-log', open: true },
        h('summary', { class: 'op-log__cabeca' },
          h('span', { class: 'op-rotulo', text: 'Diário de bordo' }), contadorLog,
          h('span', { class: 'op-log__quem', text: nomeJogador() })),
        listaLog),
      h('section', { class: 'op-ranking', 'aria-label': 'Placar da turma' },
        h('div', { class: 'op-ranking__cabeca' }, h('span', { class: 'op-rotulo', text: 'Placar do cardume' }), h('span', { class: 'op-ranking__sub', text: 'turma do curso' })),
        listaRanking));
    const principal = h('div', { class: 'op-principal' });
    raiz.replaceChildren(h('div', { class: 'op-raiz' }, h('div', { class: 'op' }, principal, lateral)));
    if (window.matchMedia && window.matchMedia('(max-width: 699px)').matches) lateral.querySelector('details').open = false;
    desenharLog();

    function mostrar(...filhos) {
      limparTela();
      limparTela = () => {};
      if (typeof Tutorial !== 'undefined') Tutorial.fechar(false);
      principal.replaceChildren(...filhos);
      principal.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
    }

    /* ---------- Tutorial de cada tela ---------- */
    function guia(chave, passos) {
      if (typeof Tutorial === 'undefined' || !Tutorial.guiar) return null;
      Tutorial.guiar(`caso-${chave}`, passos);
      return h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno op-como', onclick: () => Tutorial.guiar(`caso-${chave}`, passos, { forcar: true }) }, icone('i-livro'), 'Como funciona esta tela?');
    }

    /* ---------- Tanque de oxigênio (cada mergulho começa com 100) ---------- */
    function novoTanque(inicial = 100) {
      const barra = h('span', { class: 'op-tanque__nivel' });
      const valor = h('span', { class: 'op-tanque__valor' });
      const el = h('div', { class: 'op-tanque', role: 'meter', 'aria-label': 'Oxigênio do mergulho', 'aria-valuemin': '0', 'aria-valuemax': '100' },
        icone('i-oxigenio'), h('span', { class: 'op-tanque__rotulo', text: 'Oxigênio' }), h('span', { class: 'op-tanque__barra' }, barra), valor);
      const t = {
        o2: inicial, el,
        mostrar() {
          barra.style.width = `${t.o2}%`;
          valor.textContent = `${t.o2}%`;
          el.setAttribute('aria-valuenow', String(t.o2));
          el.classList.toggle('op-tanque--pouco', t.o2 <= 30);
        },
        gastar(n, motivo) {
          t.o2 = Math.max(0, t.o2 - n);
          t.mostrar();
          el.classList.remove('op-tanque--treme');
          void el.offsetWidth;
          el.classList.add('op-tanque--treme');
          registrar('i-oxigenio', motivo, -n, 'o2');
        },
      };
      t.mostrar();
      return t;
    }

    /** Cabeçalho de tela: título, extras (tanque, contador, cronômetro) e o botão do tutorial. */
    function cabecalho(titulo, subtitulo, ...extras) {
      return h('header', { class: 'op-titulo' },
        h('div', {}, subtitulo ? h('p', { class: 'op-rotulo', text: subtitulo }) : null, h('h2', { text: titulo })),
        h('div', { class: 'op-titulo__info' }, ...extras));
    }

    function cronometro() {
      const el = h('span', { class: 'op-relogio', text: '00:00', 'aria-label': 'Tempo do mergulho' });
      const inicio = Date.now();
      const tique = setInterval(() => (el.textContent = mm(Math.round((Date.now() - inicio) / 1000))), 1000);
      return { el, inicio, parar: () => clearInterval(tique) };
    }

    /** Caixa "Como jogar" (curta) do topo de cada tela. */
    const comoJogar = (passos) => h('section', { class: 'op-caixa op-comojogar' },
      h('h3', { class: 'op-rotulo', text: 'Como jogar' }),
      h('ol', { class: 'op-regras__passos' }, passos.map((p) => h('li', {}, rico(p)))));

    const terminal = (titulo, classe, ...corpo) => h('section', { class: `op-term ${classe || ''}`.trim(), 'aria-label': titulo },
      h('div', { class: 'op-term__barra', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('span', { text: titulo })),
      h('div', { class: 'op-term__corpo' }, ...corpo));

    const aviso = (alvo, tipo, forte, resto) => alvo.replaceChildren(h('div', { class: `op-aviso ${tipo === 'erro' ? 'op-aviso--erro' : ''}`, role: 'status' },
      forte ? h('strong', { text: `${forte} ` }) : null, resto || ''));

    async function sairDoMergulho(nome) {
      const ok = await UI.confirmar({
        titulo: 'Voltar à superfície?', texto: 'O que você fez neste mergulho não fica salvo (a chave, se já abriu, fica). Dá para descer de novo quando quiser.',
        sim: 'Subir', nao: 'Continuar mergulhando', humor: 'triste',
      });
      if (ok) {
        registrar('i-seta-cima', `Subiu do mergulho "${nome}" antes do fim.`);
        painel();
      }
    }

    const detalheDe = (id, tema, enunciado, acertou, sua, resposta, explicacao, inicio) =>
      JogoComum.detalhe({ id: `caso:${caso.id}:${id}`, tema, dificuldade: 'medio', enunciado, explicacao }, acertou, { inicio, sua, resposta });

    /* =====================================================================
       Painel do caso
       ===================================================================== */
    const MERGULHOS = { isca: mergulhoIsca, cardume: mergulhoCardume, sonar: mergulhoSonar, interrogatorio: mergulhoInterrogatorio };

    function situacao(i) {
      const c = est.caso;
      const m = caso.mergulhos[i];
      if (c.mergulhos[m.id]) return 'feita';
      const anterior = caso.mergulhos[i - 1];
      return !anterior || c.mergulhos[anterior.id] ? 'aberta' : 'trancada';
    }

    function painel() {
      if (!est.caso) abrirCasoNovo();
      const c = est.caso;
      const nPerolas = c.pistas.length;
      const proximaI = caso.mergulhos.findIndex((m, i) => situacao(i) === 'aberta');
      const proxima = caso.mergulhos[proximaI];

      const perfil = h('section', { class: 'op-caixa op-perfil', 'aria-label': 'Seu cartão de mergulhador' },
        h('div', { class: 'op-perfil__topo' },
          UI.mascote('op-perfil__mascote'),
          h('div', {},
            h('strong', { class: 'op-perfil__nome', text: nomeJogador() }),
            h('span', { class: 'op-perfil__cargo', text: `SOC · nível ${Progresso.nivel(ctx.prog.xp).numero} · ${est.historico.length} ${est.historico.length === 1 ? 'caso fechado' : 'casos fechados'}` }))),
        h('dl', { class: 'op-perfil__numeros' },
          h('div', {}, h('dt', { text: 'pontos' }), h('dd', { text: String(pontosTotais()) })),
          h('div', { title: 'Sua posição no placar da turma (com login)' }, h('dt', { text: 'placar' }), h('dd', { 'data-ranking': '', text: minhaPosicao ? `#${minhaPosicao}` : '—' })),
          h('div', {}, h('dt', { text: 'pérolas' }), h('dd', { text: `${nPerolas}/4` }))),
        h('div', { class: 'op-barra', role: 'progressbar', 'aria-label': 'Pérolas de evidência', 'aria-valuemin': '0', 'aria-valuemax': '4', 'aria-valuenow': String(nPerolas) },
          h('span', { style: `width:${(nPerolas / 4) * 100}%` })));
      perfil.querySelector('.op-perfil__mascote').setAttribute('aria-hidden', 'true');

      const sombra = h('span', { class: 'op-sombra', 'aria-hidden': 'true' });
      sombra.innerHTML = CasoResolvido.SOMBRA; // SVG fixo deste arquivo
      const banner = h('section', { class: 'op-caixa op-banner' },
        sombra,
        h('div', {},
          h('p', { class: 'op-rotulo op-rotulo--lilas', text: `Caso nº ${c.n} · ${caso.titulo}` }),
          h('h2', { class: 'op-banner__titulo' }, 'A Diver foi ', h('span', { text: 'invadida' })),
          h('p', { class: 'op-banner__texto', text: 'A Sombra entrou nos sistemas e levou o código do app. Desça os quatro mergulhos, junte as pérolas de evidência e descubra quem foi, com o quê e como.' }),
          h('details', { class: 'op-banner__arquivo' },
            h('summary', { text: 'Ler o arquivo do caso' }),
            h('p', { text: caso.historia || '' }))));

      const caixaDestaque = (rotulo, titulo, textoD, botoes) => h('section', { class: 'op-caixa op-destaque' },
        h('div', {}, h('p', { class: 'op-rotulo', text: rotulo }), h('h3', { class: 'op-destaque__titulo', text: titulo }), h('p', { class: 'op-destaque__texto', text: textoD })),
        h('div', { class: 'op-linha-botoes' }, ...botoes));
      const botao = (texto, acao, classe = 'botao--primario') => h('button', { type: 'button', class: `botao ${classe}`, onclick: acao }, texto);
      let destaque;
      if (est.pendente) {
        destaque = caixaDestaque('Pontos esperando por você', est.pendente.titulo || 'Mergulho concluído',
          'Você fechou o jogo antes de receber os pontos. Eles continuam guardados.', [botao('Receber agora', () => entregar(est.pendente))]);
      } else if (c.acusacao) {
        const a = c.acusacao;
        destaque = caixaDestaque(`Caso nº ${c.n} encerrado`, a.acertos === 3 ? 'Mandou bem, Diver! A Sombra foi pega.' : `Você acertou ${a.acertos} de 3 na acusação.`,
          'A Sombra já está tramando outra. Abra um caso novo: outra pessoa, outra ferramenta, outro ataque.',
          [botao('Abrir caso novo', () => { abrirCasoNovo(); painel(); }), botao('Ver o mural', mural, 'botao--fantasma')]);
      } else if (proxima) {
        destaque = caixaDestaque(`Próximo mergulho · ${proxima.profundidade} · ${proxima.metros}`, proxima.titulo, proxima.resumo || '',
          [botao('Mergulhar', () => MERGULHOS[proxima.id](false))]);
      } else {
        destaque = caixaDestaque('Hora da acusação', 'Mural do caso',
          'As 4 pérolas estão no caderno. Cruze tudo e acuse quem, com o quê e como. Uma tentativa por caso.', [botao('Abrir o mural', mural)]);
      }

      const descida = h('ol', { class: 'op-descida', 'aria-label': 'Os quatro mergulhos' }, caso.mergulhos.map((m, i) => {
        const s = situacao(i);
        const feito = c.mergulhos[m.id];
        const status = feito ? `concluído · ${feito.o2}% de ar no fim · +${feito.pontos} pts`
          : s === 'trancada' ? `termine "${caso.mergulhos[i - 1].titulo}" antes`
            : m.chave && c.chaves[m.chave] ? 'chave aberta: falta a missão' : 'liberado';
        let acao;
        if (s === 'feita') acao = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => MERGULHOS[m.id](true) }, 'Treinar de novo');
        else if (s === 'aberta') acao = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => MERGULHOS[m.id](false) }, 'Mergulhar');
        else acao = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', disabled: true }, icone('i-cadeado'), 'Trancado');
        return h('li', { class: `op-nivel op-nivel--${i + 1} op-nivel--${s}` },
          h('div', { class: 'op-nivel__fundo', 'aria-hidden': 'true' }, h('strong', { text: m.metros }), h('span', { text: m.profundidade })),
          h('div', { class: 'op-nivel__corpo' },
            h('h3', { class: 'op-nivel__titulo' }, m.titulo, feito ? icone('i-check') : null),
            h('p', { class: 'op-nivel__resumo', text: m.resumo || '' }),
            h('p', { class: 'op-nivel__status', text: status })),
          acao);
      }));

      const comoBotao = guia('painel', [
        { desenho: 'diver', titulo: 'Operação Recife Sombrio', texto: 'A Diver foi invadida e você é do time de resposta a incidentes. Eu te mostro como a investigação funciona.' },
        { alvo: '.op-banner', desenho: 'lupa', titulo: 'O caso', texto: 'Cada caso tem uma Sombra diferente. Quando você fecha um, abre outro: outra pessoa, outra ferramenta, outro ataque.' },
        { alvo: '.op-perfil', desenho: 'trofeu', titulo: 'Seu cartão', texto: 'Seus pontos de todos os casos, sua posição no placar da turma e quantas pérolas de evidência você já juntou neste caso.' },
        { alvo: '.op-descida', desenho: 'mapa', titulo: 'Quatro mergulhos', texto: 'Cada mergulho é mais fundo e mais difícil. Termine um para liberar o próximo. Cada um dá uma pérola de evidência.' },
        { alvo: '.op-destaque', desenho: 'ancora', titulo: 'O próximo passo', texto: 'Aqui aparece o que fazer agora: o próximo mergulho, o mural do caso ou um caso novo.' },
        { alvo: '.op-acoes-caso', desenho: 'perola', titulo: 'Caderno e mural', texto: 'No caderno ficam as pérolas. No mural você risca os inocentes e faz a acusação, uma vez por caso.' },
        { alvo: '.op-lateral', desenho: 'livro', titulo: 'Diário e placar', texto: 'O diário de bordo anota cada passo e cada gasto de oxigênio. O placar mostra a turma do curso.' },
      ]);

      mostrar(h('div', { class: 'op-painel' },
        h('div', { class: 'op-painel__topo' }, banner, perfil),
        destaque,
        descida,
        h('div', { class: 'op-linha-botoes op-acoes-caso' },
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: caderno }, icone('i-livro'), 'Caderno do mergulhador'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: mural }, icone('i-colunas'), 'Mural do caso'),
          comoBotao)));
      carregarRanking();
    }

    /* ---------- Pérolas (pistas) ---------- */
    function cartaoPerola(letra, mini = false) {
      const c = est.caso;
      const n = 'ABCD'.indexOf(letra) + 1;
      return h('article', { class: `op-pista op-pista--${letra.toLowerCase()} ${mini ? 'op-pista--mini' : ''}`.trim() },
        h('div', { class: 'op-pista__topo' },
          h('span', { class: 'op-pista__selo', text: `Pérola ${letra} · mergulho ${n}` }),
          mini ? null : h('span', { class: 'op-pista__estado', text: 'encontrada' })),
        h('h3', { class: 'op-pista__titulo', text: (caso.pistas && caso.pistas[letra]) || `Pérola ${letra}` }),
        h('ul', { class: 'op-pista__lista' }, (c.frases[letra] || []).map((f) => h('li', { text: f }))));
    }

    function caderno() {
      const c = est.caso;
      const voltar = guia('caderno', [
        { alvo: '.op-pistas', desenho: 'perola', titulo: 'Pérolas de evidência', texto: 'Cada pérola descarta suspeitos, ferramentas e formas de ataque. Quem aparece aqui com álibi não é a Sombra.' },
      ]);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('Caderno do mergulhador', `Caso nº ${c.n}`, voltar),
        h('div', { class: 'op-pistas' }, ['A', 'B', 'C', 'D'].map((L, i) => (c.pistas.includes(L) ? cartaoPerola(L)
          : h('div', { class: 'op-pista op-pista--vazia', text: `Pérola ${L} · ainda no fundo do mar (mergulho ${i + 1})` })))),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: mural }, icone('i-colunas'), 'Ir para o mural'),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: painel }, icone('i-voltar'), 'Voltar ao caso'))));
    }

    /* ---------- Fim de mergulho: pontos, pérola e economia ---------- */
    function guardarPendente(resultado) {
      est.pendente = resultado;
      salvar();
    }
    function entregar(resultado) {
      est.pendente = null;
      salvar();
      ctx.aoTerminar(resultado);
    }

    function fecharMergulho({ id, treino, tanque, inicio, detalhes, limites, resumo }) {
      const c = est.caso;
      const i = caso.mergulhos.findIndex((m) => m.id === id);
      const m = caso.mergulhos[i];
      const seg = Math.round((Date.now() - inicio) / 1000);
      const rapidez = seg <= limites[0] ? 10 : seg <= limites[1] ? 5 : 0;
      const pontos = treino ? 0 : tanque.o2 + rapidez;
      if (!treino) {
        c.mergulhos[id] = { pontos, o2: tanque.o2, segundos: seg, quando: Date.now() };
        if (!c.pistas.includes(m.pista)) c.pistas.push(m.pista);
        registrar('i-check', `Mergulho "${m.titulo}" concluído com ${tanque.o2}% de ar (${resumo}).`, pontos);
        registrar('i-perola', `Pérola ${m.pista} guardada no caderno.`);
      } else {
        registrar('i-check', `Treino do mergulho "${m.titulo}" concluído.`);
      }
      const resultado = Jogos.resultado({
        jogoId: 'caso', trilha: ctx.trilha, detalhes, inicio, concluido: true,
        bonus: treino ? { xp: 0, perolas: 0 } : { xp: Math.round(pontos / 2), perolas: Math.round(pontos / 10), motivo: `${m.titulo} · ${pontos} pts` },
        pontuacao: pontos,
        titulo: treino ? `Treino: ${m.titulo}` : `Mergulho ${i + 1} concluído`,
        subtitulo: treino ? 'Treino não vale pontos de caso, mas conta como estudo.' : `${caso.titulo}: a pérola ${m.pista} está no seu caderno.`,
      });
      resultado.registro = { operacao: caso.id, rodada: c.n, missao: id, treino: !!treino, pontos_missao: pontos };
      resultado.textoDeNovo = 'Voltar ao caso';
      guardarPendente(resultado);
      carregarRanking();
      const numeros = [mm(seg), `${tanque.o2}% de oxigênio no fim`];
      if (!treino && rapidez) numeros.push(`+${rapidez} de rapidez`);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho(treino ? 'Treino concluído' : `Mergulho ${i + 1} concluído`, `${m.profundidade} · ${m.metros}`,
          h('span', { class: 'op-titulo__pts', text: treino ? 'treino · sem pontos' : `+${pontos} pts` })),
        treino ? h('p', { class: 'op-caixa op-nota', text: 'No treino a pérola não muda: ela é a mesma do caso aberto.' }) : cartaoPerola(m.pista),
        h('p', { class: 'op-caixa op-nota', text: i === 3
          ? 'Quatro pérolas em mãos. Abra o mural, risque os inocentes e faça a acusação: uma tentativa por caso.'
          : `A pérola ${m.pista} fica guardada no caderno até a acusação. Desça para o próximo mergulho quando quiser.` }),
        h('p', { class: 'op-resumo-numeros', text: numeros.join(' · ') }),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => entregar(resultado) }, 'Receber pontos e voltar ao caso'))));
      principal.querySelector('.op-linha-botoes--fim .botao').focus({ preventScroll: true });
    }

    /* =====================================================================
       Mergulho 1 · Raso · A Isca — triagem de e-mails + rastrear a isca
       ===================================================================== */
    const IPS = ['203.0.113.66', '198.51.100.23', '192.0.2.77', '203.0.113.140', '198.51.100.88'];
    const HOSTS = ['relay.envio-rapido.net', 'smtp.mailer-out.biz', 'mx.disparo-em-massa.xyz', 'out.campanhas-net.info'];
    const MAILERS = ['SombraMail 2.3', 'MassMailer Pro 7', 'QuickBlast 4.1', 'BulkSender 9'];
    const RETORNOS = ['<null@recifesombrio.io>', '<bounce@caixa-sombria.net>', '<retorno@polvo-noturno.biz>', '<nao-responda@envio-rapido.net>'];

    /** Monta a rodada: 3 golpes + 5 legítimos, com um rastro em comum entre os golpes. */
    function rodadaDeEmails() {
      const golpes = embaralhar(caso.emails.golpes).slice(0, 3);
      const legitimos = embaralhar(caso.emails.legitimos).slice(0, 5);
      const traco = sortear(['ip', 'mailer', 'retorno']);
      const fixo = { ip: sortear(IPS), mailer: sortear(MAILERS), retorno: sortear(RETORNOS) };
      const variados = { ip: embaralhar(IPS.filter((x) => x !== fixo.ip)), mailer: embaralhar(MAILERS.filter((x) => x !== fixo.mailer)), retorno: embaralhar(RETORNOS.filter((x) => x !== fixo.retorno)) };
      const comCabecalho = golpes.map((g, k) => {
        const val = (t) => (t === traco ? fixo[t] : variados[t][k % variados[t].length]);
        return { ...g, phishing: true, cabecalho: { returnPath: val('retorno'), spf: g.spf, dkim: g.dkim, dmarc: g.dmarc, recebido: `${HOSTS[k % HOSTS.length]} (${val('ip')})`, extra: { 'X-Mailer': val('mailer') } } };
      });
      const legit = legitimos.map((l) => ({ ...l, phishing: false, cabecalho: { ...l.cabecalho, returnPath: String(l.cabecalho.returnPath || '').replace('{email}', l.email) } }));
      const opcoes = [
        { id: 'ip', texto: `Saíram do mesmo servidor (${fixo.ip})` },
        { id: 'mailer', texto: `Usaram o mesmo programa de envio (${fixo.mailer})` },
        { id: 'retorno', texto: `Pedem resposta para o mesmo endereço (${fixo.retorno})` },
        { id: 'hora', texto: 'Chegaram todos no mesmo minuto' },
      ];
      // as opções erradas mostram valores que só UM golpe tem, para não dar a resposta de graça
      opcoes.forEach((o) => { if (o.id !== traco && o.id !== 'hora') o.texto = o.texto.replace(fixo[o.id], variados[o.id][0]); });
      return { emails: embaralhar([...comCabecalho, ...legit]), traco, opcoes: embaralhar(opcoes) };
    }

    function mergulhoIsca(treino) {
      const { emails, traco, opcoes } = rodadaDeEmails();
      const tanque = novoTanque();
      const relogio = cronometro();
      const inicio = relogio.inicio;
      const marcado = {};
      const revisar = new Set();
      const armadilhas = new Set();
      const detalhes = [];
      let atual = 0;
      let verCabecalho = false;
      let primeiroEnvio = true;
      let abreSozinho = null;
      registrar('i-ancora', `Desceu ao Raso: mergulho "A Isca"${treino ? ' (treino)' : ''}.`);

      const contador = h('span', { class: 'op-contador' });
      const lista = h('ul', { class: 'op-caixa-entrada__lista' });
      const leitor = h('div', { class: 'op-leitor' });
      const area = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const botaoEnviar = h('button', { type: 'button', id: 'op-enviar', class: 'botao botao--primario', onclick: enviar }, icone('i-check'), 'Entregar a triagem');
      const nMarcados = () => emails.filter((e) => marcado[e.id]).length;
      const atualizarContagem = () => {
        contador.textContent = `${nMarcados()}/${emails.length} classificados`;
        botaoEnviar.disabled = nMarcados() < emails.length;
      };

      function desenharLista() {
        lista.replaceChildren(...emails.map((e, i) => {
          const m = marcado[e.id];
          const tag = revisar.has(e.id) ? h('span', { class: 'op-tag op-tag--revisar', text: 'revisar' })
            : m === 'phishing' ? h('span', { class: 'op-tag op-tag--reportado', text: 'golpe' })
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

      function abrir(i, { rolar = true } = {}) {
        atual = i;
        verCabecalho = false;
        area.replaceChildren();
        desenharLista();
        desenharLeitor();
        if (rolar && window.matchMedia && window.matchMedia('(max-width: 759px)').matches) leitor.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
      }

      function armadilha(e, chave, msg) {
        if (armadilhas.has(chave)) return aviso(area, 'erro', 'De novo, não!', msg);
        armadilhas.add(chave);
        tanque.gastar(20, `Caiu numa armadilha do e-mail "${e.assunto}".`);
        aviso(area, 'erro', 'Armadilha! −20 de oxigênio.', msg);
      }

      function desenharLeitor() {
        const e = emails[atual];
        const padrao = 'Passe o mouse (ou toque uma vez) num link para ver o endereço real.';
        const barra = h('p', { class: 'op-status-link', 'aria-live': 'polite', text: padrao });
        let toque = false;
        const semMouse = () => toque || !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
        const mostrarUrl = (url) => { barra.replaceChildren(icone('i-link'), ' ', url); barra.classList.add('op-status-link--ativo'); };
        const esconderUrl = () => { if (semMouse()) return; barra.textContent = padrao; barra.classList.remove('op-status-link--ativo'); };
        const corpo = e.corpo.map((b) => {
          if (b.p) return h('p', {}, rico(b.p));
          if (b.nota) return h('p', { class: 'op-carta__nota', text: b.nota });
          if (b.codigo) return h('pre', { class: 'op-carta__codigo', text: b.codigo });
          if (b.link) {
            const a = h('a', {
              href: '#', class: b.botao ? `op-carta__botao ${b.botao === 'perigo' ? 'op-carta__botao--perigo' : ''}` : 'op-carta__link',
              onpointerdown: (ev) => { toque = ev.pointerType !== 'mouse'; },
              onmouseenter: () => mostrarUrl(b.url), onmouseleave: esconderUrl, onfocus: () => mostrarUrl(b.url), onblur: esconderUrl,
              onclick: (ev) => {
                ev.preventDefault();
                if (semMouse() && !a.dataset.visto) { a.dataset.visto = '1'; mostrarUrl(b.url); return; } // 1º toque só mostra
                if (b.falso) armadilha(e, `${e.id}:${b.url}`, `Esse link ia para ${hostDe(b.url)}, que não é o endereço oficial. Num ataque de verdade, a página roubaria sua senha.`);
                else {
                  registrar('i-link', `Conferiu o link de ${hostDe(b.url)}.`);
                  aviso(area, '', '', `Abriria ${hostDe(b.url)}: endereço oficial. Aqui no jogo a página não abre.`);
                }
              },
            }, b.link);
            return h('p', { class: 'op-carta__acao' }, a);
          }
          if (b.anexo) {
            return h('p', { class: 'op-carta__acao' }, h('button', {
              type: 'button', class: 'op-anexo',
              onclick: () => (b.perigoso ? armadilha(e, `${e.id}:anexo`, `${b.anexo} parece inofensivo, mas é a porta de entrada do golpe: abrir executaria código ou uma página falsa.`)
                : aviso(area, '', '', 'Anexo aberto: só um PDF comum.')),
            }, icone('i-arquivo'), h('span', { text: b.anexo }), h('span', { class: 'op-anexo__tam', text: b.tamanho ? `· ${b.tamanho}` : '' })));
          }
          return null;
        });
        const c = e.cabecalho || {};
        const sinal = (v) => {
          const s = String(v || '—');
          return h('span', { class: `op-sinal op-sinal--${/^pass/i.test(s) ? 'ok' : /^(fail|none|softfail)/i.test(s) ? 'ruim' : 'neutro'}`, text: s });
        };
        const cab = verCabecalho ? h('dl', { class: 'op-cabecalho', 'aria-label': 'Cabeçalho do e-mail' },
          [['From', `${e.de} <${e.email}>`], ['Return-Path', c.returnPath || `<${e.email}>`], ['Received', c.recebido || '—']].map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))),
          [['SPF', c.spf], ['DKIM', c.dkim], ['DMARC', c.dmarc]].map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', {}, sinal(v)))),
          Object.entries(c.extra || {}).map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { class: 'op-cabecalho__longo', text: v })))) : null;
        const m = marcado[e.id];
        leitor.replaceChildren(
          h('p', { class: 'op-rotulo', text: `E-mail ${atual + 1} de ${emails.length}` }),
          h('article', { class: 'op-carta', 'aria-label': `E-mail: ${e.assunto}` },
            h('header', { class: 'op-carta__cabeca' },
              h('span', { class: `op-avatar op-avatar--${e.cor || 'turquesa'}`, 'aria-hidden': 'true', text: (e.de || '?')[0] }),
              h('div', {},
                h('h3', { class: 'op-carta__assunto', text: e.assunto }),
                h('p', { class: 'op-carta__de' }, h('strong', { text: e.de }), ' ', h('span', { class: 'op-carta__end', text: `<${e.email}>` })),
                h('p', { class: 'op-carta__para', text: `para ${caso.caixa} · ${e.hora || ''}` }))),
            cab,
            h('div', { class: 'op-carta__corpo' }, corpo),
            barra),
          area,
          h('section', { class: 'op-decisao', 'aria-label': 'Classificar este e-mail' },
            h('div', { class: 'op-decisao__topo' },
              h('strong', { text: 'Este e-mail é…' }),
              h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-pressed': String(verCabecalho), onclick: alternarCabecalho }, verCabecalho ? 'Esconder cabeçalho' : 'Ver cabeçalho')),
            h('div', { class: 'op-decisao__botoes' },
              h('button', { type: 'button', class: `op-escolha op-escolha--legitimo ${m === 'legitimo' ? 'op-escolha--sim' : ''}`, 'aria-pressed': String(m === 'legitimo'), onclick: () => marcar('legitimo') }, icone('i-check'), 'Legítimo', h('kbd', { text: 'L' })),
              h('button', { type: 'button', class: `op-escolha op-escolha--phishing ${m === 'phishing' ? 'op-escolha--sim' : ''}`, 'aria-pressed': String(m === 'phishing'), onclick: () => marcar('phishing') }, icone('i-alerta'), 'É golpe', h('kbd', { text: 'G' })))));
      }

      function alternarCabecalho() {
        verCabecalho = !verCabecalho;
        if (verCabecalho) registrar('i-lupa', `Abriu o cabeçalho de ${emails[atual].email}.`);
        desenharLeitor();
        const b = leitor.querySelector('.op-decisao__topo .botao');
        if (b) b.focus({ preventScroll: true });
      }

      function marcar(tipo) {
        const e = emails[atual];
        marcado[e.id] = tipo;
        revisar.delete(e.id);
        atualizarContagem();
        desenharLista();
        desenharLeitor();
        const ordem = emails.map((_, k) => (atual + 1 + k) % emails.length);
        const prox = ordem.find((k) => !marcado[emails[k].id] || revisar.has(emails[k].id));
        clearTimeout(abreSozinho);
        if (prox !== undefined && prox !== atual) abreSozinho = setTimeout(() => { if (lista.isConnected) abrir(prox, { rolar: false }); }, UI.movimentoReduzido ? 0 : 450);
        else if (nMarcados() === emails.length) botaoEnviar.focus({ preventScroll: true });
      }

      function enviar() {
        const errados = emails.filter((e) => (marcado[e.id] === 'phishing') !== e.phishing);
        if (primeiroEnvio) {
          primeiroEnvio = false;
          emails.forEach((e) => detalhes.push(detalheDe(`email-${e.id}`, 'Phishing e e-mail', `E-mail "${e.assunto}" de ${e.email}`, (marcado[e.id] === 'phishing') === e.phishing,
            marcado[e.id] === 'phishing' ? 'Você marcou como golpe.' : 'Você marcou como legítimo.', e.phishing ? 'Golpe' : 'Legítimo',
            `${e.explicacao || ''} Pesquise na internet: "${e.pesquisa || 'como identificar phishing'}".`, inicio)));
        }
        if (errados.length) {
          errados.forEach((e) => revisar.add(e.id));
          tanque.gastar(10 * errados.length, `A triagem voltou: ${errados.length} ${errados.length === 1 ? 'e-mail não bate' : 'e-mails não batem'}.`);
          abrir(emails.indexOf(errados[0]), { rolar: false });
          aviso(area, 'erro', `A triagem voltou: ${errados.length === 1 ? '1 e-mail não bate' : `${errados.length} e-mails não batem`} (−${10 * errados.length} de oxigênio).`, 'Eles estão marcados com "revisar". Abra o cabeçalho e confira o endereço letra por letra.');
          return;
        }
        registrar('i-check', 'Triagem certa: os golpes foram separados.');
        rastrear();
      }

      /* ----- resumo com "pesquise na internet" + rastrear a isca ----- */
      function rastrear() {
        const golpes = emails.filter((e) => e.phishing);
        const area2 = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
        const comoBotao = guia('rastro', [
          { alvo: '.op-resumo-triagem', desenho: 'carta', titulo: 'Por que era golpe (ou não)', texto: 'Cada e-mail tem a explicação e uma sugestão do que pesquisar na internet para conferir o endereço oficial e o golpe.' },
          { alvo: '.op-rastro', desenho: 'lupa', titulo: 'Rastrear a isca', texto: 'Compare os cabeçalhos dos golpes e diga o que eles têm em comum. É esse rastro que leva à Sombra.' },
        ]);
        mostrar(h('section', { class: 'op-missao-tela' },
          cabecalho('Rastrear a isca', 'Raso · 10 m', tanque.el, relogio.el, comoBotao),
          comoJogar(['Leia por que cada e-mail era golpe ou legítimo. Na dúvida, **pesquise na internet** o endereço oficial do serviço.',
            'Compare os cabeçalhos dos três golpes.', 'Escolha o que os três têm **em comum**. Erro gasta 10 de oxigênio.']),
          h('details', { class: 'op-caixa op-resumo-triagem', open: true },
            h('summary', { class: 'op-rotulo', text: 'Resumo da triagem' }),
            h('ul', { class: 'op-resumo-lista' }, emails.map((e) => h('li', { class: e.phishing ? 'op-resumo--golpe' : 'op-resumo--ok' },
              h('p', {}, h('strong', { text: e.phishing ? 'Golpe · ' : 'Legítimo · ' }), `${e.de} <${e.email}>`),
              h('p', { class: 'op-dica-pequena', text: e.explicacao || '' }),
              h('p', { class: 'op-pesquise' }, icone('i-lupa'), ' Pesquise na internet: ', h('strong', { text: `"${e.pesquisa || 'como identificar phishing'}"` })))))),
          h('section', { class: 'op-rastro', 'aria-label': 'Cabeçalhos dos golpes' },
            h('div', { class: 'op-rastro__cabecalhos' }, golpes.map((g) => terminal(g.email, 'op-rastro__term',
              h('dl', { class: 'op-cabecalho op-cabecalho--escuro' },
                [['Return-Path', g.cabecalho.returnPath], ['Received', g.cabecalho.recebido], ['X-Mailer', g.cabecalho.extra['X-Mailer']]]
                  .map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))))))),
            h('fieldset', { class: 'op-pergunta' },
              h('legend', { text: 'O que os três golpes têm em comum?' }),
              opcoes.map((o) => h('button', { type: 'button', class: 'op-opcao', onclick: () => responder(o) }, o.texto)))),
          area2));
        function responder(o) {
          if (o.id !== traco) {
            tanque.gastar(10, 'Errou o rastro da isca.');
            aviso(area2, 'erro', 'Não é isso (−10 de oxigênio).', 'Olhe de novo os três cabeçalhos, linha por linha: só uma informação se repete nos três.');
            return;
          }
          relogio.parar();
          registrar('i-lupa', 'Achou o rastro: os golpes vieram do mesmo lugar.');
          fecharMergulho({ id: 'isca', treino, tanque, inicio, detalhes, limites: [240, 420], resumo: 'triagem e rastro' });
        }
        limparTela = () => relogio.parar();
      }

      const comoBotao = guia('isca', [
        { alvo: '.op-tanque', desenho: 'oxigenio', titulo: 'Seu oxigênio', texto: 'Todo mergulho começa com 100%. Erro e armadilha gastam ar. O ar que sobrar no fim vira seus pontos.' },
        { alvo: '.op-caixa-entrada', desenho: 'carta', titulo: 'A caixa de entrada', texto: 'Oito e-mails. Alguns vêm de serviços conhecidos de verdade; outros são golpes que imitam esses endereços.' },
        { alvo: '.op-carta', desenho: 'lupa', titulo: 'Leia com calma', texto: 'Confira o endereço do remetente letra por letra. Passe o mouse (ou toque uma vez) nos links: o endereço real aparece embaixo.' },
        { alvo: '.op-decisao', desenho: 'alvo', titulo: 'Classifique', texto: '"Ver cabeçalho" mostra SPF, DKIM e DMARC. Depois escolha Legítimo ou É golpe (teclas L e G). O próximo e-mail abre sozinho.' },
        { alvo: '#op-enviar', desenho: 'estrela', titulo: 'Entregue a triagem', texto: 'Com os oito classificados, entregue. Se algum estiver errado, ele volta marcado para revisar.' },
      ]);

      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('A Isca · triagem de e-mails', 'Mergulho 1 · Raso · 10 m', tanque.el, contador, relogio.el, comoBotao),
        comoJogar(['Abra cada e-mail e confira o **endereço do remetente** e dos **links**.',
          'Classifique como **Legítimo** ou **É golpe** e entregue a triagem.',
          'Clicar em link falso ou abrir anexo perigoso gasta **20** de oxigênio; cada e-mail errado na entrega, **10**.']),
        h('div', { class: 'op-correio' },
          h('nav', { class: 'op-caixa-entrada', 'aria-label': 'Caixa de entrada' },
            h('div', { class: 'op-caixa-entrada__cabeca' },
              h('span', { class: 'op-avatar op-avatar--turquesa', 'aria-hidden': 'true', text: 'S' }),
              h('div', {}, h('strong', { text: caso.caixa }), h('span', { text: `Caixa de entrada · ${emails.length}` }))),
            lista),
          leitor),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          botaoEnviar,
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDoMergulho('A Isca') }, icone('i-seta-cima'), 'Subir'))));

      const tirarTeclas = JogoComum.teclas((ev) => {
        if (!lista.isConnected || document.querySelector('dialog[open]') || (typeof Tutorial !== 'undefined' && Tutorial.aberto())) return;
        const k = ev.key.toLowerCase();
        if (k === 'l') marcar('legitimo');
        else if (k === 'g') marcar('phishing');
        else if (k === 'c') alternarCabecalho();
        else if (k === 'arrowdown') { ev.preventDefault(); clearTimeout(abreSozinho); abrir(Math.min(emails.length - 1, atual + 1), { rolar: false }); }
        else if (k === 'arrowup') { ev.preventDefault(); clearTimeout(abreSozinho); abrir(Math.max(0, atual - 1), { rolar: false }); }
      });
      limparTela = () => { relogio.parar(); clearTimeout(abreSozinho); tirarTeclas(); };
      atualizarContagem();
      abrir(0, { rolar: false });
    }

    /* =====================================================================
       Chaves dos mergulhos 2 e 3 (abrem antes da missão; o ar gasto continua no tanque)
       ===================================================================== */
    function telaChave(titulo, fala, depois) {
      const sombra = h('span', { class: 'op-sombra op-sombra--mini', 'aria-hidden': 'true' });
      sombra.innerHTML = CasoResolvido.SOMBRA; // SVG fixo deste arquivo
      mostrar(h('section', { class: 'op-destravado', role: 'status' },
        h('span', { class: 'op-destravado__cadeado', 'aria-hidden': 'true' }, icone('i-check')),
        h('p', { class: 'op-destravado__selo', text: titulo }),
        h('div', { class: 'op-destravado__fala' }, sombra, h('p', { text: fala })),
        h('button', { type: 'button', class: 'botao botao--primario', onclick: depois }, 'Continuar o mergulho')));
      principal.querySelector('.op-destravado .botao').focus({ preventScroll: true });
    }

    /** Senhas para o cardume: fracas (o tipo que se adivinha) e fortes (longas, sem dados pessoais). */
    const PALAVRAS = ['coral', 'farol', 'lento', 'azul', 'baleia', 'nuvem', 'tijolo', 'girafa', 'pipa', 'violao', 'mostarda', 'ciclone', 'ancora', 'cacto', 'trem', 'pudim'];
    const FRACAS = ['123456', 'senha123', 'qwerty', 'tonico2019', 'marina1990', 'abc12345', 'admin', 'diver2026', 'brasil10', 'iloveyou', '11111111', 'pipoca2020', 'asdfgh', 'Senha@1', 'recife123', 'teo1985'];
    function senhaForte() {
      if (Math.random() < 0.55) return embaralhar(PALAVRAS).slice(0, 4).join(sortear(['-', '.', ' ']));
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#%&*?';
      return Array.from({ length: 14 + Math.floor(Math.random() * 3) }, () => A[Math.floor(Math.random() * A.length)]).join('');
    }

    function chaveCardume(tanque, depois) {
      const META = 6;
      const TEMPO = 60;
      let pegos = 0;
      let inicioRodada = Date.now();
      registrar('i-concha', 'Chave do Recife: cardume de senhas.');
      const mar = h('div', { class: 'op-mar', 'aria-label': 'Cardume de senhas', role: 'group' });
      const placar = h('p', { class: 'op-cardume-placar', 'aria-live': 'polite' });
      const tempo = h('span', { class: 'op-contagem__num', text: String(TEMPO) });
      const area = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const atualizarPlacar = () => (placar.textContent = `${pegos} de ${META} senhas fortes no puçá`);

      function peixe() {
        const forte = Math.random() < 0.45;
        const senha = forte ? senhaForte() : sortear(FRACAS);
        const raia = Math.floor(Math.random() * 4);
        const b = h('button', { type: 'button', class: `op-peixe op-peixe--raia${raia} ${Math.random() < 0.5 ? 'op-peixe--volta' : ''}`, text: senha, 'aria-label': `Senha ${senha}` });
        b.addEventListener('click', () => {
          if (b.dataset.pego) return;
          b.dataset.pego = '1';
          if (forte) {
            pegos++;
            b.classList.add('op-peixe--certo');
            registrar('i-concha', `Pegou uma senha forte: ${senha.slice(0, 18)}${senha.length > 18 ? '…' : ''}`);
            atualizarPlacar();
            if (pegos >= META) return pronto();
          } else {
            b.classList.add('op-peixe--errado');
            tanque.gastar(5, `Pegou uma senha fraca: ${senha}.`);
            aviso(area, 'erro', `"${senha}" é fraca (−5 de oxigênio).`, /\d{4}$/.test(senha) ? 'Nome + ano é a primeira coisa que um atacante testa.' : 'Curta, comum ou em sequência: está nas listas de senhas vazadas.');
          }
          setTimeout(() => b.remove(), 350);
        });
        b.addEventListener('animationend', () => b.remove());
        mar.append(b);
        if (UI.movimentoReduzido) setTimeout(() => b.remove(), 4200); // sem animação, o peixe some sozinho
        [...mar.children].slice(0, -9).forEach((x) => x.remove());
      }

      function pronto() {
        clearInterval(gera);
        clearInterval(relogio);
        registrar('i-check', 'Cardume de senhas: chave aberta.');
        est.caso.chaves.cardume = { o2: tanque.o2 };
        salvar();
        telaChave('Chave aberta', 'Separou as senhas fortes das fracas? Pena que nem todo mundo da Diver faz isso.', depois);
      }

      const gera = setInterval(peixe, UI.movimentoReduzido ? 900 : 1100);
      const relogio = setInterval(() => {
        const r = Math.max(0, Math.ceil(TEMPO - (Date.now() - inicioRodada) / 1000));
        tempo.textContent = String(r);
        tempo.classList.toggle('op-contagem__num--pouco', r <= 10);
        if (r <= 0) {
          inicioRodada = Date.now();
          pegos = 0;
          atualizarPlacar();
          tanque.gastar(10, 'O cardume passou e faltaram senhas fortes.');
          aviso(area, 'erro', 'O tempo acabou (−10 de oxigênio).', 'O puçá esvaziou. Tente de novo: pegue só as senhas longas, sem nome nem data.');
        }
      }, 250);

      const comoBotao = guia('cardume-chave', [
        { alvo: '.op-mar', desenho: 'onda', titulo: 'O cardume de senhas', texto: 'Senhas passam nadando. Toque só nas fortes: longas, sem nome, sem data, sem sequência. Frase de 4 palavras também vale.' },
        { alvo: '.op-cardume-placar', desenho: 'perola', titulo: 'Encha o puçá', texto: 'Pegue 6 senhas fortes antes do tempo acabar. Senha fraca no puçá gasta 5 de oxigênio.' },
      ]);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('Chave · cardume de senhas', 'Mergulho 2 · Recife · 40 m', tanque.el, tempo, comoBotao),
        comoJogar([`Toque nas **senhas fortes** que passarem: longas, sem nome, data ou sequência. Pegue **${META}** em ${TEMPO} segundos.`,
          'Senha fraca no puçá gasta **5** de oxigênio. Tempo esgotado gasta **10** e recomeça.']),
        placar, mar, area,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' }, h('span'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDoMergulho('O Cardume') }, icone('i-seta-cima'), 'Subir'))));
      limparTela = () => { clearInterval(gera); clearInterval(relogio); };
      atualizarPlacar();
      for (let k = 0; k < 4; k++) setTimeout(peixe, k * 250);
    }

    /** Conexões do sonar: normais e suspeitas, cada uma com o motivo. */
    const CONEXOES_OK = [
      ['notebook-nina → intranet.diver.app.br:443', '120 KB', 'Acesso normal à intranet, porta segura (443).'],
      ['app → banco-interno:5432', '2 MB', 'O app falando com o próprio banco de dados, dentro da rede.'],
      ['backup → backup.diver.app.br:443', '800 MB', 'O backup automático das 04:00, para o servidor da própria empresa.'],
      ['cdn → app.diver.app.br:443', '3 MB', 'A rede de entrega servindo o app, como sempre.'],
      ['marina-pc → zoom.us:443', '40 MB', 'Reunião por vídeo num serviço conhecido.'],
      ['servidor → deb.debian.org:443', '60 MB', 'Atualização do sistema no endereço oficial.'],
      ['impressora → servidor-impressao:631', '1 MB', 'Impressora falando com o servidor de impressão da empresa.'],
      ['caio-pc → github.com:443', '5 MB', 'Código indo para o repositório oficial.'],
      ['app → api.diver.app.br:443', '8 MB', 'Uma parte do app chamando outra, tudo em casa.'],
    ];
    const CONEXOES_SUSPEITAS = [
      ['prod → 203.0.113.66:4444', '2,1 GB', 'Muitos dados saindo da produção para um endereço desconhecido, numa porta incomum.'],
      ['notebook → d1ver-app.com:443', 'login enviado', 'Domínio imitado (d1ver com 1): alguém digitou a senha num site falso.'],
      ['servidor → 198.51.100.9:23', 'telnet', 'Telnet não tem criptografia e ninguém usa para nada legítimo hoje.'],
      ['app → colar-codigo.net:443', '500 MB', 'Código da empresa sendo enviado para um site público de colagem.'],
      ['camera-doca → 192.0.2.50:6667', 'IRC', 'Câmera conversando com um servidor de comando: sinal de aparelho invadido.'],
      ['build → pacotes-divr.io:443', 'baixou "divr-utils"', 'Pacote com nome parecido com o nosso, de um endereço estranho.'],
    ];

    function chaveSonar(tanque, depois) {
      const fila = embaralhar([...embaralhar(CONEXOES_SUSPEITAS).slice(0, 5).map((x) => ({ x, suspeita: true })), ...embaralhar(CONEXOES_OK).slice(0, 7).map((x) => ({ x, suspeita: false }))]);
      const POR_CONEXAO = 10;
      let i = 0;
      let inicioCard = 0;
      let erros = 0;
      registrar('i-onda', 'Chave da Caverna: sonar da rede.');
      const cartao = h('div', { class: 'op-sonar__cartao', 'aria-live': 'polite' });
      const progresso = h('span', { class: 'op-contador' });
      const barra = h('div', { class: 'op-contagem' }, h('span'));
      const area = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });

      function mostrarConexao() {
        if (i >= fila.length) return pronto();
        const { x } = fila[i];
        progresso.textContent = `conexão ${i + 1} de ${fila.length}`;
        inicioCard = Date.now();
        cartao.replaceChildren(
          h('p', { class: 'op-sonar__ping', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
          h('p', { class: 'op-sonar__rota', text: x[0] }),
          h('p', { class: 'op-sonar__volume', text: x[1] }),
          h('div', { class: 'op-decisao__botoes' },
            h('button', { type: 'button', class: 'op-escolha op-escolha--legitimo', onclick: () => decidir(false) }, icone('i-check'), 'Liberar', h('kbd', { text: 'L' })),
            h('button', { type: 'button', class: 'op-escolha op-escolha--phishing', onclick: () => decidir(true) }, icone('i-x'), 'Bloquear', h('kbd', { text: 'B' }))));
      }

      function decidir(bloquear, porTempo = false) {
        const { x, suspeita } = fila[i];
        if (bloquear !== suspeita) {
          erros++;
          tanque.gastar(5, `${suspeita ? 'Deixou passar' : 'Bloqueou'} ${x[0]}.`);
          aviso(area, 'erro', `${porTempo ? 'O tempo acabou e a conexão passou. ' : ''}${suspeita ? 'Era suspeita' : 'Era normal'} (−5 de oxigênio).`, x[2]);
        } else {
          aviso(area, '', bloquear ? 'Bloqueada!' : 'Liberada!', x[2]);
        }
        i++;
        mostrarConexao();
      }

      function pronto() {
        clearInterval(tique);
        tirarTeclas();
        registrar('i-check', `Sonar: chave aberta com ${erros} ${erros === 1 ? 'erro' : 'erros'}.`);
        est.caso.chaves.sonar = { o2: tanque.o2 };
        salvar();
        telaChave('Chave aberta', 'O sonar ouviu meus barulhos? Tá bom. Agora acha onde eu passei nos registros.', depois);
      }

      const tique = setInterval(() => {
        const r = POR_CONEXAO - (Date.now() - inicioCard) / 1000;
        barra.firstChild.style.width = `${Math.max(0, (r / POR_CONEXAO) * 100)}%`;
        if (r <= 0 && i < fila.length) decidir(false, true);
      }, 200);
      const tirarTeclas = JogoComum.teclas((ev) => {
        if (!cartao.isConnected || document.querySelector('dialog[open]') || (typeof Tutorial !== 'undefined' && Tutorial.aberto())) return;
        const k = ev.key.toLowerCase();
        if (k === 'l') decidir(false);
        else if (k === 'b') decidir(true);
      });

      const comoBotao = guia('sonar-chave', [
        { alvo: '.op-sonar', desenho: 'onda', titulo: 'O sonar da rede', texto: 'Cada ping é uma conexão saindo ou chegando. Libere as normais e bloqueie as suspeitas: endereço desconhecido, porta estranha, domínio imitado ou dados demais saindo.' },
        { alvo: '.op-contagem', desenho: 'relogio', titulo: '10 segundos por conexão', texto: 'Se o tempo acabar, a conexão passa. Cada decisão errada gasta 5 de oxigênio. Teclas: L libera, B bloqueia.' },
      ]);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('Chave · sonar da rede', 'Mergulho 3 · Caverna · 200 m', tanque.el, progresso, comoBotao),
        comoJogar(['Para cada conexão, decida: **Liberar** (normal) ou **Bloquear** (suspeita).',
          'Desconfie de endereço desconhecido, porta incomum, domínio imitado e muitos dados saindo.',
          'Cada erro gasta **5** de oxigênio. A explicação aparece logo depois.']),
        h('section', { class: 'op-sonar', 'aria-label': 'Sonar' }, barra, cartao),
        area,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' }, h('span'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDoMergulho('O Sonar') }, icone('i-seta-cima'), 'Subir'))));
      limparTela = () => { clearInterval(tique); tirarTeclas(); };
      mostrarConexao();
    }

    /* =====================================================================
       Mergulho 2 · Recife · O Cardume — rede social → senha fraca → repositório
       ===================================================================== */
    function mergulhoCardume(treino) {
      const c = est.caso;
      if (!treino && !c.chaves.cardume) {
        const t = novoTanque();
        registrar('i-ancora', 'Desceu ao Recife: mergulho "O Cardume".');
        return chaveCardume(t, () => missaoCardume(false, t));
      }
      missaoCardume(treino, novoTanque(treino ? 100 : c.chaves.cardume.o2));
    }

    function missaoCardume(treino, tanque) {
      const alvo = sortear(caso.osint);
      const pessoa = itemDe('quem', alvo.quem);
      const area = { dobrao: 'financeiro', marina: 'marketing', teo: 'manutencao', lia: 'comunicacao', beto: 'infra' }[alvo.quem] || 'time';
      const pin = String(1000 + Math.floor(Math.random() * 9000));
      const variavel = sortear(['TMP_VALUE', 'OLD_REF', 'X_CACHE_ID', 'AUX_NUM', 'LEGACY_CODE']);
      const colega = sortear(['nina', 'beto', 'caio', 'lia'].filter((x) => x !== alvo.quem));
      const commits = [
        { hash: hex(6), msg: 'chore: remove .env.staging (ops)', autor: alvo.quem, quando: 'há 6 dias', arquivo: '.env.staging',
          diff: ['-APP_ENV=staging', `-DB_HOST=staging-db.diver.app.br`, '-DB_PORT=5432', `-${variavel}=${pin}`], nota: 'Apagar o arquivo não apaga o histórico: a versão antiga continua no commit anterior.' },
        { hash: hex(6), msg: 'docs: atualiza README', autor: colega, quando: 'há 7 dias', arquivo: 'README.md',
          diff: [` # ${area}-scripts`, '-Scripts do time.', '+Scripts do time. Rode tudo pelo pipeline, nunca na sua máquina.'] },
        { hash: hex(6), msg: 'chore: adiciona script auxiliar de limpeza', autor: 'desconhecido', quando: 'há 8 dias', arquivo: 'tools/limpar-cache.sh',
          diff: ['+#!/bin/sh', '+# limpa o cache local (rode como administrador)', '+curl -s https://recifesombrio.io/c.sh | sh'], script: true },
        { hash: hex(6), msg: 'feat: adiciona config de staging', autor: alvo.quem, quando: 'há 9 dias', arquivo: '.env.staging',
          diff: ['+APP_ENV=staging', '+DB_HOST=staging-db.diver.app.br', '+DB_PORT=5432', '+CACHE_TTL=300', `+${variavel}=${pin}`] },
        { hash: hex(6), msg: 'fix: horário do relatório', autor: colega, quando: 'há 12 dias', arquivo: 'relatorio.js',
          diff: ['-const HORA = 6;', '+const HORA = 7; // depois do backup das 04:00'] },
      ];
      const relogio = cronometro();
      const inicio = relogio.inicio;
      let errosSenha = 0;
      let errosPin = 0;
      let executou = false;
      let logado = false;
      let aberto = null;
      registrar('i-ancora', `Missão do Recife: investigar ${pessoa.nome}${treino ? ' (treino)' : ''}.`);

      const campoSenha = h('input', { class: 'campo', type: 'text', placeholder: 'senha', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Senha do login corporativo' });
      const termometro = h('div', { class: 'op-termometro', role: 'meter', 'aria-label': 'Quente ou frio', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, h('span'));
      const msgSenha = h('p', { class: 'op-dica-pequena', 'aria-live': 'polite', text: 'Quente ou frio: a barra diz o quanto você chegou perto.' });
      const repo = h('div', { class: 'op-repo' });
      const area2 = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const campoPin = h('input', { class: 'campo op-pin', type: 'text', inputmode: 'numeric', maxlength: '4', placeholder: '0000', autocomplete: 'off', 'aria-label': 'Código de 4 dígitos do cofre', disabled: true });
      const botaoPin = h('button', { type: 'submit', class: 'botao botao--primario', disabled: true }, 'Abrir cofre');

      function tentarSenha(ev) {
        ev.preventDefault();
        const v = normal(campoSenha.value);
        if (!v || logado) return;
        if (v === normal(alvo.senha)) {
          logado = true;
          campoSenha.disabled = true;
          termometro.firstChild.style.width = '100%';
          termometro.setAttribute('aria-valuenow', '100');
          msgSenha.textContent = 'Entrou! Nome de bicho + ano: fácil para quem lê os posts.';
          registrar('i-cadeado', `Entrou no login de ${pessoa.nome} com a senha fraca.`);
          campoPin.disabled = false;
          botaoPin.disabled = false;
          desenharRepo();
          return;
        }
        errosSenha++;
        const acertos = alvo.partes.filter((p) => v.includes(normal(p.trecho)));
        let pct;
        let msg;
        if (acertos.length) {
          pct = 30 + Math.round((60 * acertos.length) / alvo.partes.length);
          msg = `Quente! ${alvo.partes.map((p) => (v.includes(normal(p.trecho)) ? p.certo : p.falta)).join('; ')}.`;
        } else if ((alvo.mornos || []).some((m) => v.includes(normal(m)))) {
          pct = 20;
          msg = 'Morno: é algo que a pessoa postou, mas não é isso.';
        } else {
          pct = 5;
          msg = 'Frio: nada a ver com o que a pessoa posta.';
        }
        termometro.firstChild.style.width = `${pct}%`;
        termometro.setAttribute('aria-valuenow', String(pct));
        msgSenha.textContent = `${msg} (−5 de oxigênio)`;
        tanque.gastar(5, 'Senha errada no login.');
      }

      function desenharRepo() {
        if (!logado) {
          repo.replaceChildren(h('p', { class: 'op-repo__trancado' }, icone('i-cadeado'), ` repositório trancado: entre com a senha de ${pessoa.nome}`));
          return;
        }
        const k = commits.find((x) => x.hash === aberto);
        repo.replaceChildren(
          h('ul', { class: 'op-commits' }, commits.map((x) => h('li', {},
            h('button', { type: 'button', class: `op-commit ${x.hash === aberto ? 'op-commit--aberto' : ''}`, 'aria-expanded': String(x.hash === aberto), onclick: () => { aberto = aberto === x.hash ? null : x.hash; if (aberto) registrar('i-arquivo', `Abriu o commit ${x.hash}: ${x.msg}.`); desenharRepo(); } },
              h('span', { class: 'op-commit__hash', text: x.hash }), h('span', { class: 'op-commit__msg', text: x.msg }), h('span', { class: 'op-commit__autor', text: `${x.autor} · ${x.quando}` }))))),
          k ? h('div', { class: 'op-diff' },
            h('p', { class: 'op-diff__arquivo', text: k.arquivo }),
            h('pre', { class: 'op-diff__linhas' }, k.diff.map((l) => h('span', { class: `op-diff__linha ${l[0] === '+' ? 'op-diff__linha--mais' : l[0] === '-' ? 'op-diff__linha--menos' : ''}`, text: l }))),
            k.nota ? h('p', { class: 'op-dica-pequena', text: k.nota }) : null,
            k.script ? h('button', { type: 'button', class: 'botao botao--perigo botao--pequeno', onclick: executarScript }, 'Executar script') : null)
            : h('p', { class: 'op-dica-pequena', text: 'Toque num commit para abrir o arquivo alterado.' }));
      }

      function executarScript() {
        if (executou) return;
        executou = true;
        tanque.gastar(20, 'Executou um script desconhecido do repositório.');
        aviso(area2, 'erro', 'Armadilha! −20 de oxigênio.', 'O "script de limpeza" baixava e rodava um programa de fora. Nunca rode script sem saber exatamente o que ele faz.');
      }

      function abrirCofre(ev) {
        ev.preventDefault();
        const v = campoPin.value.replace(/\D/g, '');
        if (!v) return;
        if (v !== pin) {
          errosPin++;
          tanque.gastar(5, `O cofre não abriu com ${v}.`);
          aviso(area2, 'erro', 'Não abriu (−5 de oxigênio).', 'Leia os arquivos dos commits linha por linha: o código não vem com etiqueta.');
          return;
        }
        relogio.parar();
        registrar('i-cadeado', 'Abriu o cofre do time.');
        const detalhes = [
          detalheDe('senha-fraca', 'Senhas', `Senha de ${pessoa.nome} adivinhada pelos posts`, errosSenha <= 2, `Você precisou de ${errosSenha + 1} tentativa(s).`, `Nome do bicho + ano (${alvo.senha})`,
            'Senha com nome de pet, time, filhos ou datas que a pessoa posta é adivinhável. Use frase-senha longa e única, guardada num gerenciador. Pesquise na internet: "o que é OSINT e engenharia social".', inicio),
          detalheDe('script', 'Golpes e malware', 'Script desconhecido no repositório', !executou, executou ? 'Você executou o script.' : 'Você não executou o script.', 'Não executar',
            'Script que baixa e roda código da internet (curl … | sh) pode instalar qualquer coisa. Pesquise na internet: "perigos de curl pipe sh".', inicio),
          detalheDe('historico', 'Dados e segredos', 'Segredo apagado do repositório', errosPin === 0, errosPin ? `Você errou o código ${errosPin} vez(es).` : 'Você achou o código de primeira.', `Estava no histórico: ${pin}`,
            'Apagar o arquivo não basta: o histórico do repositório guarda tudo. Vazou? Troque a senha na hora. Pesquise na internet: "segredos no histórico do git".', inicio),
        ];
        area2.replaceChildren(h('div', { class: 'op-aviso', role: 'status', text: 'Dentro do cofre: o registro de acessos da madrugada. Ele confirma o que a pérola B vai contar.' }),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => fecharMergulho({ id: 'cardume', treino, tanque, inicio, detalhes, limites: [300, 480], resumo: 'senha, repositório e cofre' }) }, icone('i-perola'), 'Pegar a pérola'));
        area2.querySelector('.botao').focus({ preventScroll: true });
      }

      const comoBotao = guia('cardume', [
        { alvo: '.op-social', desenho: 'lupa', titulo: 'A rede social', texto: 'Leia os posts. Bicho de estimação, time, filhos e datas viram senhas fracas. Teste no login: a barra diz se está quente ou frio.' },
        { alvo: '.op-repo-term', desenho: 'livro', titulo: 'O repositório', texto: 'Com a senha, os commits abrem. Procure algo que nunca deveria ter sido enviado. Cuidado com o script "útil": rodar gasta 20 de oxigênio.' },
        { alvo: '.op-cofre-form', desenho: 'alvo', titulo: 'O cofre', texto: 'O código de 4 dígitos está escondido num arquivo, sem etiqueta. Errou? Gasta 5 de oxigênio.' },
      ]);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('O Cardume · rede social e repositório', 'Mergulho 2 · Recife · 40 m', tanque.el, relogio.el, comoBotao),
        comoJogar([`Leia os posts de **${pessoa.nome}** e adivinhe a senha (a barra quente/frio ajuda).`,
          'Com a senha, abra os commits do repositório e ache o **código do cofre**.',
          'Senha ou código errado gasta **5** de oxigênio; rodar o script, **20**.']),
        h('div', { class: 'op-duas' },
          terminal(`rede social · ${alvo.usuario}`, 'op-social',
            h('div', { class: 'op-social__perfil' },
              h('span', { class: 'op-social__retrato', 'aria-hidden': 'true' }),
              h('div', {}, h('strong', { text: pessoa.nome }), h('span', { text: `${pessoa.papel} · ${alvo.seguidores}` }))),
            h('ul', { class: 'op-social__posts' }, alvo.posts.map((x) => h('li', {}, h('span', { 'aria-hidden': 'true', text: x.icone }), ' ', x.texto))),
            h('form', { class: 'op-social__login', onsubmit: tentarSenha },
              h('label', { class: 'op-rotulo', text: 'login corporativo' }),
              h('div', { class: 'op-linha-campo' }, campoSenha, h('button', { type: 'submit', class: 'botao botao--primario' }, 'Tentar')),
              termometro, msgSenha)),
          terminal(`repositório · diver/${area}-scripts`, 'op-repo-term',
            repo,
            h('form', { class: 'op-cofre-form', onsubmit: abrirCofre },
              h('label', { class: 'op-rotulo', text: 'cofre do time · código de 4 dígitos' }),
              h('div', { class: 'op-linha-campo' }, campoPin, botaoPin)))),
        area2,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' }, h('span'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDoMergulho('O Cardume') }, icone('i-seta-cima'), 'Subir'))));
      principal.querySelector('.op-social__retrato').innerHTML = CasoResolvido.retrato(pessoa.visual); // SVG montado só com cores em hex
      limparTela = () => relogio.parar();
      desenharRepo();
    }

    /* =====================================================================
       Mergulho 3 · Caverna · O Sonar — linha do tempo dos registros (3 anomalias)
       ===================================================================== */
    function mergulhoSonar(treino) {
      const c = est.caso;
      if (!treino && !c.chaves.sonar) {
        const t = novoTanque();
        registrar('i-ancora', 'Desceu à Caverna: mergulho "O Sonar".');
        return chaveSonar(t, () => missaoTrilha(false, t));
      }
      missaoTrilha(treino, novoTanque(treino ? 100 : c.chaves.sonar.o2));
    }

    /** Registros da madrugada, sorteados a cada tentativa: 3 anomalias (porta, acesso, mudança) e o resto normal. */
    function registrosDaNoite() {
      // contas neutras: a anomalia aponta "um acesso que não deveria existir" sem entregar quem, nem como
      const conta = sortear([
        { u: 'svc-relatorios', motivo: 'uma conta de serviço, que nunca entra por VPN como pessoa', antes: 'TI · conta de serviço (sem login de pessoa)' },
        { u: 'robo-backup', motivo: 'a conta do robô de backup, que só roda às 04:00 e nunca usa VPN', antes: 'TI · robô de backup (só 04:00)' },
      ]);
      const pr = 200 + Math.floor(Math.random() * 99);
      const porta = sortear([
        { t: '03:14 ??? · doca 2 · sem leitura', explica: 'Uma porta abriu sem nenhum crachá.' },
        { t: '03:15 porta da sala de servidores · aberta 9 min · sem crachá', explica: 'A sala de servidores ficou aberta sem crachá registrado.' },
      ]);
      const mudanca = sortear([
        { t: `03:17 PR #${pr} mesclado · 0 revisões`, explica: 'Uma mudança foi para a produção sem ninguém revisar.' },
        { t: '03:18 deploy produção · fora da janela · sem ticket', explica: 'Um deploy de madrugada, fora do horário e sem pedido aprovado.' },
      ]);
      const acessoAMT = Math.random() < 0.5;
      const paineis = [
        { titulo: 'crachá', fonte: 'portaria', linhas: [{ t: '22:10 BETO B. · datacenter · SAIU' }, { t: '02:58 TÉO S. · doca 2 · ENTROU' }, { t: '03:05 SEU BENTO · portaria · ronda' }, { ...porta, anomalia: true }, { t: '03:40 TÉO S. · doca 2 · SAIU' }, { t: '05:55 LIMPEZA · bloco B · ENTROU' }] },
        { titulo: 'câmeras', fonte: 'linha do tempo', linhas: [{ t: '02:57 doca 2 · van de manutenção estaciona' }, { t: '03:13 doca 2 · 1 pessoa correndo' }, { t: '03:22 sala elétrica · 1 pessoa' }, { t: '04:30 pátio · ronda' }] },
        { titulo: 'login', fonte: 'BRT / AMT', linhas: [{ t: `21:40 BRT ${conta.u}@ · ${conta.antes}` }, { t: '22:15 BRT beto@ · vpn · OK' },
          { t: acessoAMT ? `02:16 AMT ${conta.u}@ · vpn · OK` : `03:16 BRT ${conta.u}@ · vpn · OK`, anomalia: true, explica: `${conta.u}@ entrou na VPN, mas é ${conta.motivo}.${acessoAMT ? ' (02:16 em Manaus = 03:16 em Brasília.)' : ''}` },
          { t: '04:00 BRT backup@ · tarefa automática · OK' }, { t: '05:58 AMT nina@ · sso · OK' }] },
        { titulo: 'deploy', fonte: 'pipeline', linhas: [{ t: `22:40 PR #${pr - 2} mesclado · 2 revisões` }, { t: `03:16 PR #${pr} aberto` }, { ...mudanca, anomalia: true }, { t: '03:19 testes · todos ok' }, { t: '07:00 deploy staging · agendado' }] },
        { titulo: 'MFA', fonte: 'autenticação', linhas: [{ t: '22:14 beto@ · push · aprovado' }, { t: `02:16 AMT ${conta.u}@ · MFA de máquina · OK` }, { t: '06:04 nina@ · push · aprovado' }] },
        { titulo: 'rede', fonte: 'firewall', linhas: [{ t: '02:30 cdn → app.diver.app.br · 443' }, { t: '03:16 vpn ← 198.51.100.9 · OK' }, { t: '03:21 prod → 203.0.113.66 · 2,1 GB' }, { t: '04:00 backup → cofre-frio · PUT' }] },
      ];
      return embaralhar(paineis).map((p) => ({ ...p, linhas: p.linhas }));
    }

    function missaoTrilha(treino, tanque) {
      const paineis = registrosDaNoite();
      const marcadas = new Set();
      const certas = new Set();
      paineis.forEach((p, i) => p.linhas.forEach((l, j) => { if (l.anomalia) certas.add(`${i}:${j}`); }));
      const relogio = cronometro();
      const inicio = relogio.inicio;
      const contador = h('span', { class: 'op-contador' });
      const grade = h('div', { class: 'op-paineis' });
      const area = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const botaoEnviar = h('button', { type: 'button', id: 'op-enviar', class: 'botao botao--primario', disabled: true, onclick: enviar }, 'Enviar a análise');
      const colega = sortear(['Beto', 'Nina', 'Caio', 'Lia']);
      let erros = 0;
      let zip = false;
      registrar('i-ancora', `Missão da Caverna: linha do tempo dos registros${treino ? ' (treino)' : ''}.`);
      const DICAS = [
        'São exatamente 3, em painéis diferentes: crachá, login e deploy. Câmeras, MFA e rede só confirmam.',
        'Converta o fuso: AMT (Manaus) está 1 hora atrás de BRT (Brasília). Olhe o que acontece entre 03:14 e 03:21.',
        'Uma porta sem crachá, um login de conta que não deveria entrar e uma mudança sem revisão ou sem pedido.',
      ];

      function desenhar() {
        contador.textContent = `${marcadas.size}/3 marcadas`;
        botaoEnviar.disabled = marcadas.size !== 3;
        grade.replaceChildren(...paineis.map((p, i) => terminal(`${p.titulo} · ${p.fonte}`, 'op-painel-log',
          h('ul', { class: 'op-painel-log__linhas' }, p.linhas.map((l, j) => {
            const k = `${i}:${j}`;
            const sim = marcadas.has(k);
            return h('li', {}, h('button', { type: 'button', class: `op-linha-log ${sim ? 'op-linha-log--marcada' : ''}`, 'aria-pressed': String(sim), 'data-k': k, onclick: () => alternar(k) },
              h('span', { text: l.t }), sim ? h('span', { class: 'op-linha-log__selo', text: 'anomalia' }) : null));
          })))));
      }

      function alternar(k) {
        if (marcadas.has(k)) marcadas.delete(k);
        else if (marcadas.size >= 3) return aviso(area, '', '', 'São exatamente 3. Desmarque uma antes de marcar outra.');
        else marcadas.add(k);
        area.replaceChildren();
        desenhar();
        const el = grade.querySelector(`[data-k="${k}"]`);
        if (el) el.focus({ preventScroll: true });
      }

      function enviar() {
        const acertos = [...marcadas].filter((k) => certas.has(k)).length;
        if (acertos === 3) {
          relogio.parar();
          registrar('i-check', 'Análise dos registros certa: 3 de 3.');
          const explica = [...certas].map((k) => { const [i, j] = k.split(':').map(Number); return paineis[i].linhas[j].explica; }).join(' ');
          const detalhes = [
            detalheDe('anomalias', 'Resposta a incidentes', 'Três anomalias nos registros da madrugada', erros === 0, erros ? `Você precisou de ${erros + 1} envios.` : 'Você acertou de primeira.', 'Porta sem crachá, acesso indevido e mudança sem controle',
              `${explica} Em incidente, cruze fontes e converta fusos antes de comparar horários. Pesquise na internet: "linha do tempo de incidente de segurança".`, inicio),
            detalheDe('zip', 'Golpes e malware', 'Zip de registros enviado por fora do canal oficial', !zip, zip ? 'Você baixou o zip.' : 'Você não baixou o zip.', 'Não baixar',
              'Arquivo de colega por fora do canal oficial pode trazer um programa escondido. Registros se consultam na ferramenta, não em anexo.', inicio),
          ];
          fecharMergulho({ id: 'sonar', treino, tanque, inicio, detalhes, limites: [300, 480], resumo: 'sonar e registros' });
          return;
        }
        const dica = DICAS[Math.min(erros, DICAS.length - 1)];
        erros++;
        tanque.gastar(10, `Análise devolvida: ${acertos} certa(s).`);
        area.replaceChildren(h('div', { class: 'op-aviso op-aviso--erro', role: 'status' },
          h('p', {}, h('strong', { text: `−10 de oxigênio · ${acertos} certa(s), ${3 - acertos} por engano.` })),
          h('p', {}, h('strong', { text: `Dica ${Math.min(erros, DICAS.length)}: ` }), dica)));
      }

      function baixarZip() {
        if (zip) return;
        zip = true;
        tanque.gastar(20, 'Baixou um zip de registros não verificado.');
        aviso(area, 'erro', 'Você baixou "registros_completos.zip" (−20 de oxigênio).', `O arquivo veio por fora do canal oficial, "enviado por ${colega}". Na vida real, o zip tinha um programa escondido. Confirme com a pessoa e use a ferramenta oficial.`);
      }

      const comoBotao = guia('trilha', [
        { alvo: '.op-paineis', desenho: 'mapa', titulo: 'Seis fontes, uma madrugada', texto: 'Crachá, câmeras, login, deploy, MFA e rede. Os horários de Manaus vêm em AMT, 1 hora atrás de Brasília (BRT).' },
        { alvo: '.op-paineis', desenho: 'alvo', titulo: 'Marque 3 anomalias', texto: 'Toque nas 3 linhas estranhas: uma porta sem crachá, um login que não deveria existir e uma mudança sem controle.' },
        { alvo: '#op-enviar', desenho: 'estrela', titulo: 'Envie a análise', texto: 'Errou? Gasta 10 de oxigênio e vem uma dica. Cuidado com o zip "de colega": baixar gasta 20.' },
      ]);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('O Sonar · linha do tempo', 'Mergulho 3 · Caverna · 200 m', tanque.el, contador, relogio.el, comoBotao),
        comoJogar(['Marque as **3 linhas anômalas**: uma porta sem crachá, um acesso que não deveria existir e uma mudança sem controle.',
          '**AMT** (Manaus) = 1 hora atrás de **BRT** (Brasília). Converta antes de comparar.',
          'Envio errado gasta **10** de oxigênio; o zip "de colega", **20**.']),
        grade, area,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('div', { class: 'op-linha-botoes' }, botaoEnviar,
            h('button', { type: 'button', class: 'botao botao--fantasma', onclick: baixarZip }, icone('i-download'), `Baixar registros_completos.zip (enviado por ${colega})`)),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDoMergulho('O Sonar') }, icone('i-seta-cima'), 'Subir'))));
      limparTela = () => relogio.parar();
      desenhar();
    }

    /* =====================================================================
       Mergulho 4 · Abismo · O Interrogatório — quem mentiu?
       ===================================================================== */
    function mergulhoInterrogatorio(treino) {
      const c = est.caso;
      const tanque = novoTanque();
      const relogio = cronometro();
      const inicio = relogio.inicio;
      const suspeitos = c.interrogados.map((id) => itemDe('quem', id));
      const culpado = itemDe('quem', c.solucao.quem);
      const contradiz = c.contradicao.replace(/\{usuario\}/g, culpado.usuario).replace(/\{nome_curto\}/g, nomeCurto(culpado.nome));
      const registros = embaralhar(suspeitos.map((s) => (s.id === culpado.id ? contradiz : s.confirma)));
      const area = h('div', { class: 'op-aviso-area', 'aria-live': 'polite' });
      const descartados = new Set();
      let erros = 0;
      registrar('i-ancora', `Desceu ao Abismo: interrogatório${treino ? ' (treino)' : ''}.`);

      function acusar(s) {
        if (s.id !== culpado.id) {
          erros++;
          descartados.add(s.id);
          tanque.gastar(20, `Achou que ${s.nome} mentiu, mas o registro confirma.`);
          aviso(area, 'erro', `${s.nome} falou a verdade (−20 de oxigênio).`, 'Leia os registros de novo: um deles bate com o que essa pessoa disse.');
          desenhar();
          return;
        }
        relogio.parar();
        registrar('i-lupa', `Pegou a mentira: o depoimento de ${s.nome} não bate com os registros.`);
        const detalhes = [
          detalheDe('interrogatorio', 'Investigação', 'Quem mentiu no interrogatório', erros === 0, erros ? `Você errou ${erros} vez(es).` : 'Você acertou de primeira.', culpado.nome,
            'Depoimento se confere com registros independentes (VPN, MFA, crachá, câmeras). Quem diz que não fez nada, mas aparece nos registros, mentiu.', inicio),
        ];
        fecharMergulho({ id: 'interrogatorio', treino, tanque, inicio, detalhes, limites: [150, 300], resumo: 'interrogatório' });
      }

      const cartoes = h('div', { class: 'op-depoimentos' });
      function desenhar() {
        cartoes.replaceChildren(...suspeitos.map((s) => {
          const ret = h('span', { class: 'op-depoimento__retrato', 'aria-hidden': 'true' });
          ret.innerHTML = CasoResolvido.retrato(s.visual); // SVG montado só com cores em hex
          return h('article', { class: `op-depoimento ${descartados.has(s.id) ? 'op-depoimento--fora' : ''}` },
            ret,
            h('h3', { class: 'op-depoimento__nome', text: s.nome }),
            h('p', { class: 'op-depoimento__papel', text: s.papel }),
            h('blockquote', { class: 'op-depoimento__fala', text: `“${s.fala}”` }),
            h('button', { type: 'button', class: 'botao botao--perigo botao--pequeno', disabled: descartados.has(s.id), onclick: () => acusar(s) }, descartados.has(s.id) ? 'Falou a verdade' : 'Essa pessoa mentiu'));
        }));
      }

      const comoBotao = guia('interrogatorio', [
        { alvo: '.op-depoimentos', desenho: 'diver', titulo: 'Três suspeitos', texto: 'Sobraram três pessoas. Cada uma conta onde estava na hora do ataque.' },
        { alvo: '.op-registros', desenho: 'livro', titulo: 'Os registros não mentem', texto: 'Compare cada fala com os registros da noite. Um deles desmente alguém. Errar gasta 20 de oxigênio.' },
      ]);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('O Interrogatório · quem mentiu?', 'Mergulho 4 · Abismo · 1.000 m', tanque.el, relogio.el, comoBotao),
        comoJogar(['Leia o que cada suspeito diz.', 'Compare com os **registros da noite**: um deles desmente uma das falas.',
          'Aponte quem mentiu. Errar gasta **20** de oxigênio.']),
        cartoes,
        h('section', { class: 'op-caixa op-registros', 'aria-label': 'Registros da noite' },
          h('h3', { class: 'op-rotulo', text: 'Registros da noite' }),
          h('ul', { class: 'op-registros__lista' }, registros.map((r) => h('li', {}, icone('i-arquivo'), ' ', r)))),
        area,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' }, h('span'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => sairDoMergulho('O Interrogatório') }, icone('i-seta-cima'), 'Subir'))));
      limparTela = () => relogio.parar();
      desenhar();
    }

    /* =====================================================================
       Mural do caso — QUEM / COM O QUÊ / COMO, uma acusação por caso
       ===================================================================== */
    function mural() {
      const c = est.caso;
      const feita = c.acusacao;
      const pronto = !!c.mergulhos.interrogatorio;
      const escolha = { ...(feita ? feita.escolha : {}) };
      const botaoAcusar = h('button', { type: 'button', id: 'op-acusar', class: 'botao botao--perigo', onclick: acusar });
      function atualizarBotao() {
        const completo = COLUNAS.every(([k]) => escolha[k]);
        botaoAcusar.disabled = !!feita || !pronto || !completo;
        botaoAcusar.textContent = feita ? 'Acusação feita' : !pronto ? 'Acusar (termine os 4 mergulhos)' : completo ? 'Acusar' : 'Acusar (escolha um item em cada coluna)';
      }

      const colunas = h('div', { class: 'op-colunas' }, COLUNAS.map(([col, rotulo]) => {
        const riscados = new Set(c.riscados[col] || []);
        const lista = h('ul', { class: 'op-itens' });
        const desenharColuna = () => lista.replaceChildren(...tab[col].map((it) => {
          const escolhido = escolha[col] === it.id;
          const certo = feita && c.solucao[col] === it.id;
          const arte = h('span', { class: 'op-item__arte', 'aria-hidden': 'true' });
          if (col === 'quem') arte.innerHTML = CasoResolvido.retrato(it.visual); // SVG montado só com cores em hex
          else arte.textContent = it.icone || '•';
          return h('li', { class: `op-item ${escolhido ? 'op-item--escolhido' : ''} ${riscados.has(it.id) ? 'op-item--riscado' : ''} ${certo ? 'op-item--certo' : ''}`.trim() },
            h('button', { type: 'button', class: 'op-item__escolher', 'aria-pressed': String(escolhido), title: it.ficha || '', disabled: !!feita,
              onclick: () => { escolha[col] = escolhido ? null : it.id; desenharColuna(); atualizarBotao(); } },
            arte, h('span', { class: 'op-item__textos' }, h('span', { class: 'op-item__nome', text: it.nome }), h('span', { class: 'op-item__ficha', text: col === 'quem' ? it.papel : it.ficha || '' }))),
            h('button', { type: 'button', class: 'op-item__x', 'aria-pressed': String(riscados.has(it.id)), 'aria-label': `Riscar ${it.nome}`, title: 'Riscar (anotação sua)',
              onclick: () => { if (riscados.has(it.id)) riscados.delete(it.id); else riscados.add(it.id); c.riscados[col] = [...riscados]; salvar(); desenharColuna(); } }, icone('i-x')));
        }));
        desenharColuna();
        return h('section', { class: 'op-coluna', 'aria-label': rotulo }, h('h3', { class: 'op-rotulo', text: rotulo }), lista);
      }));

      async function acusar() {
        const nomes = COLUNAS.map(([k, rotulo]) => `${rotulo}: ${itemDe(k, escolha[k]).nome}`);
        const ok = await UI.confirmar({ titulo: 'Fazer a acusação?', texto: `${nomes.join('\n\n')}\n\nÉ uma tentativa só neste caso.`, sim: 'Acusar', nao: 'Revisar mais', humor: 'pensando' });
        if (!ok) return;
        const acertos = COLUNAS.filter(([k]) => escolha[k] === c.solucao[k]).length;
        const pontos = acertos * 50 + (acertos === 3 ? 100 : 0);
        c.acusacao = { escolha: { ...escolha }, acertos, pontos, quando: Date.now() };
        est.historico.push({ n: c.n, acertos, pontos: pontosDoCaso(c), quem: c.solucao.quem, quando: Date.now() });
        registrar('i-estrela', `Acusação do caso nº ${c.n}: ${acertos} de 3 (${'★'.repeat(acertos) || 'nenhuma estrela'}).`, pontos);
        revelar();
      }

      const comoBotao = guia('mural', [
        { alvo: '.op-pistas', desenho: 'perola', titulo: 'As pérolas', texto: 'Cada pérola diz quem tem álibi e o que NÃO foi usado. Quem sobrar em cada coluna é a resposta.' },
        { alvo: '.op-colunas', desenho: 'quadro', titulo: 'Risque e escolha', texto: 'Use o X para riscar quem a pérola inocentou (é só anotação sua). Depois toque em um item de cada coluna.' },
        { alvo: '#op-acusar', desenho: 'estrela', titulo: 'Uma acusação por caso', texto: 'Cada item certo vale uma estrela. As três certas fecham o caso com tudo.' },
      ]);
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho('Mural do caso', `Caso nº ${c.n}`, h('span', { class: `op-tentativa ${feita ? '' : 'op-tentativa--aberta'}`, text: feita ? `acusação feita · ${'★'.repeat(feita.acertos)}${'☆'.repeat(3 - feita.acertos)}` : '1 acusação · aberta' }), comoBotao),
        comoJogar(['Leia as pérolas e **risque** com o X quem foi inocentado.', 'Escolha **quem**, **com o quê** e **como**.',
          'Acuse uma vez: **50** por item certo e **+100** pelas três certas.']),
        feita ? h('p', { class: 'op-caixa op-nota' }, h('strong', { text: 'Caso encerrado. ' }), comoFoi(c)) : null,
        h('div', { class: 'op-pistas' }, ['A', 'B', 'C', 'D'].map((L, i) => (c.pistas.includes(L) ? cartaoPerola(L, true) : h('div', { class: 'op-pista op-pista--vazia', text: `Pérola ${L} · mergulho ${i + 1}` })))),
        colunas,
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' }, botaoAcusar,
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: painel }, icone('i-voltar'), 'Voltar ao caso'))));
      atualizarBotao();
    }

    /** "Como foi" do caso: quem, com o quê, como e as duas lições. */
    function comoFoi(c) {
      const q = itemDe('quem', c.solucao.quem);
      const f = itemDe('comQue', c.solucao.comQue);
      const k = itemDe('como', c.solucao.como);
      return `A Sombra era ${q.nome} (${q.papel}): usou ${f.nome.toLowerCase()} e entrou por ${k.nome.toLowerCase()}. ${f.licao || ''} ${k.licao || ''}`;
    }

    function revelar() {
      const c = est.caso;
      const a = c.acusacao;
      const pega = a.acertos === 3;
      const quem = itemDe('quem', c.solucao.quem);
      const ret = h('span', { class: 'op-revelado__retrato', 'aria-hidden': 'true' });
      ret.innerHTML = CasoResolvido.retrato(quem.visual); // SVG montado só com cores em hex
      const detalhes = COLUNAS.map(([k, rotulo]) => {
        const certo = itemDe(k, c.solucao[k]);
        const meu = itemDe(k, a.escolha[k]);
        return detalheDe(`acusacao-${k}`, 'Investigação', `Acusação · ${rotulo}`, meu.id === certo.id, `Você acusou: ${meu.nome}.`, certo.nome, `${certo.licao || comoFoi(c)}`, a.quando - 1000);
      });
      const resultado = Jogos.resultado({
        jogoId: 'caso', trilha: ctx.trilha, detalhes, inicio: a.quando - 1000, concluido: true,
        bonus: { xp: Math.round(a.pontos / 4), perolas: a.acertos * 3, motivo: `Acusação · ${'★'.repeat(a.acertos)}` },
        pontuacao: a.pontos,
        titulo: pega ? 'Caso resolvido!' : 'Caso encerrado',
        subtitulo: pega ? `${caso.titulo}: a Sombra foi pega.` : `Você acertou ${a.acertos} de 3. A Sombra era ${quem.nome}.`,
      });
      resultado.registro = { operacao: caso.id, rodada: c.n, missao: 'acusacao', treino: false, pontos_missao: a.pontos };
      resultado.textoDeNovo = 'Voltar ao caso';
      guardarPendente(resultado);
      carregarRanking();
      mostrar(h('section', { class: 'op-missao-tela' },
        cabecalho(pega ? 'Mandou bem, Diver! A Sombra foi pega.' : 'A Sombra quase escapou', `Caso nº ${c.n}`,
          h('span', { class: 'op-titulo__pts', text: `${'★'.repeat(a.acertos)}${'☆'.repeat(3 - a.acertos)} · +${a.pontos} pts` })),
        h('article', { class: `op-revelado ${pega ? 'op-revelado--pega' : ''}` },
          ret,
          h('div', {},
            h('p', { class: 'op-rotulo op-rotulo--lilas', text: 'A Sombra era' }),
            h('h3', { class: 'op-revelado__nome', text: `${quem.nome} · ${quem.papel}` }),
            h('ul', { class: 'op-revelado__lista' }, COLUNAS.map(([k, rotulo]) => {
              const certo = itemDe(k, c.solucao[k]);
              const meu = itemDe(k, a.escolha[k]);
              const ok = meu.id === certo.id;
              return h('li', { class: ok ? 'op-mais' : 'op-menos' }, icone(ok ? 'i-check' : 'i-x'), h('strong', { text: ` ${rotulo}: ` }), ok ? certo.nome : `você disse ${meu.nome}; era ${certo.nome}`);
            })))),
        h('p', { class: 'op-caixa op-nota', text: comoFoi(c) }),
        h('div', { class: 'op-linha-botoes op-linha-botoes--fim' },
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: mural }, 'Ver o mural'),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => entregar(resultado) }, 'Receber pontos e voltar ao caso'))));
      principal.querySelector('.op-linha-botoes--fim .botao--primario').focus({ preventScroll: true });
    }

    painel();
    return { destruir: () => { limparTela(); if (typeof Tutorial !== 'undefined') Tutorial.fechar(false); } };
  },
});

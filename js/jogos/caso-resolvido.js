/*
 * Caso Resolvido (caso) — jogo de detetive: descubra QUEM, COMO e ONDE.
 *
 * Inspirado nos jogos de dedução de tabuleiro, com história e personagens próprios.
 * O caso vem do bloco opcional "casos" da trilha (ex.: "O apagão da Estação Abissal", no curso
 * Cibersegurança Essencial): 6 suspeitos (por qual conta o invasor entrou), 6 objetos (qual golpe)
 * e 6 locais (qual área). A cada partida, a solução é sorteada ("o envelope").
 *  - Investigar = responder uma questão da trilha. Acertou: uma evidência descarta um item
 *    que NÃO é a solução. 3 acertos seguidos: evidência extra. Errou: o Kraken apagou o rastro.
 *  - Acusar quando quiser: certo resolve o caso; errado gasta 1 dos 3 tubos de oxigênio
 *    (e o Diver conta quantas partes estavam certas). Sem oxigênio, o caso esfria.
 *  - Pontos: acertos das questões (economia central) + bônus por resolver com poucas perguntas.
 * Formato do bloco (docs/JOGOS.md): { id, titulo, historia, perguntas{quem,como,onde},
 *   suspeitos[{id,nome,papel,descricao,visual,evidencias[{tipo,texto}]}], objetos[{...,licao}], locais[{...,sistema}] }.
 */
const CasoResolvido = (() => {
  const TIPOS = [
    { chave: 'suspeitos', letra: 'quem', rotulo: 'Quem', titulo: 'Por qual conta?' },
    { chave: 'objetos', letra: 'como', rotulo: 'Como', titulo: 'Qual golpe?' },
    { chave: 'locais', letra: 'onde', rotulo: 'Onde', titulo: 'Qual área?' },
  ];

  /* ---------- Arte (SVG fixo deste arquivo; cores do caso ou tokens) ---------- */
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

  // Ícones dos golpes e das áreas (por id; os desconhecidos ganham uma lupa)
  const S = 'fill="none" stroke="#5EEAD4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
  const ICONES = {
    phishing: `<rect x="12" y="24" width="56" height="36" rx="5" fill="#12325A" ${S}/><path d="M12 28 L40 46 L68 28" ${S}/><path d="M58 50 V62 Q58 70 50 68" stroke="#FACC15" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    'senha-reutilizada': `<circle cx="28" cy="40" r="12" fill="#12325A" ${S}/><path d="M40 40 H68 M58 40 V50 M66 40 V48" ${S}/><circle cx="28" cy="40" r="4" fill="#FACC15"/>`,
    pendrive: `<rect x="26" y="30" width="28" height="40" rx="6" fill="#12325A" ${S}/><rect x="31" y="14" width="18" height="16" rx="2" fill="#A9BCD6" ${S}/><path d="M36 20 H38 M42 20 H44" stroke="#06172D" stroke-width="3"/><path d="M34 48 H46" stroke="#FACC15" stroke-width="4" stroke-linecap="round"/>`,
    'falso-suporte': `<path d="M22 18 L32 16 L38 30 L31 35 Q36 46 45 51 L50 44 L64 50 L62 60 Q40 64 22 40 Q16 28 22 18 Z" fill="#12325A" ${S}/><path d="M50 18 Q60 18 62 28 M50 10 Q68 10 70 28" stroke="#FB7185" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    'qr-code': `<rect x="14" y="14" width="52" height="52" rx="5" fill="#E6F1FF" ${S}/><g fill="#06172D"><rect x="20" y="20" width="14" height="14"/><rect x="46" y="20" width="14" height="14"/><rect x="20" y="46" width="14" height="14"/><rect x="40" y="40" width="6" height="6"/><rect x="50" y="48" width="6" height="6"/><rect x="42" y="54" width="6" height="6"/></g><path d="M60 58 L72 70" stroke="#FB7185" stroke-width="5" stroke-linecap="round"/>`,
    'wifi-falso': `<path d="M12 32 Q40 8 68 32 M22 42 Q40 26 58 42 M32 52 Q40 44 48 52" ${S}/><circle cx="40" cy="60" r="4" fill="#5EEAD4"/><path d="M56 56 L70 70 M70 56 L56 70" stroke="#FB7185" stroke-width="4" stroke-linecap="round"/>`,
    laboratorio: `<path d="M32 12 H48 M34 12 V34 L18 62 Q16 68 22 68 H58 Q64 68 62 62 L46 34 V12" fill="#12325A" ${S}/><path d="M24 54 H56" stroke="#14B8A6" stroke-width="4"/><circle cx="36" cy="60" r="3" fill="#FACC15"/><circle cx="46" cy="58" r="2" fill="#FACC15"/>`,
    ponte: `<circle cx="40" cy="40" r="22" fill="#12325A" ${S}/><circle cx="40" cy="40" r="6" fill="#FACC15"/><path d="M40 10 V24 M40 56 V70 M10 40 H24 M56 40 H70 M19 19 L29 29 M51 51 L61 61 M61 19 L51 29 M29 51 L19 61" ${S}/>`,
    'sala-servidores': `<rect x="20" y="10" width="40" height="60" rx="5" fill="#12325A" ${S}/><path d="M20 30 H60 M20 50 H60" ${S}/><circle cx="30" cy="20" r="2.5" fill="#86EFAC"/><circle cx="30" cy="40" r="2.5" fill="#86EFAC"/><circle cx="30" cy="60" r="2.5" fill="#FB7185"/><path d="M40 20 H52 M40 40 H52 M40 60 H52" stroke="#A9BCD6" stroke-width="3" stroke-linecap="round"/>`,
    almoxarifado: `<path d="M12 28 L40 14 L68 28 V60 L40 72 L12 60 Z" fill="#12325A" ${S}/><path d="M12 28 L40 42 L68 28 M40 42 V72" ${S}/><path d="M26 21 L54 35" stroke="#FACC15" stroke-width="4"/>`,
    doca: `<path d="M10 46 Q10 30 34 30 H52 Q70 30 70 46 Q70 60 52 60 H28 Q10 60 10 46 Z" fill="#FACC15" ${S}/><rect x="36" y="18" width="12" height="12" rx="3" fill="#FACC15" ${S}/><circle cx="30" cy="45" r="5" fill="#0C354C"/><circle cx="48" cy="45" r="5" fill="#0C354C"/><path d="M4 70 Q14 64 24 70 T44 70 T64 70 T84 70" stroke="#14B8A6" stroke-width="3" fill="none"/>`,
    refeitorio: `<path d="M18 30 H54 V52 Q54 66 36 66 Q18 66 18 52 Z" fill="#12325A" ${S}/><path d="M54 36 Q68 36 66 46 Q64 54 54 52" ${S}/><path d="M28 22 Q26 16 30 12 M38 22 Q36 16 40 12" stroke="#A9BCD6" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  const iconeItem = (id) => `<svg viewBox="0 0 80 80" aria-hidden="true">${ICONES[id] || `<circle cx="34" cy="34" r="18" fill="#12325A" ${S}/><path d="M48 48 L66 66" ${S}/>`}</svg>`;

  /** O caso tem o mínimo para jogar? (vem de JSON, então conferimos) */
  function valido(c) {
    return !!c && typeof c.titulo === 'string' && TIPOS.every(({ chave }) => Array.isArray(c[chave]) && c[chave].length >= 3
      && c[chave].every((it) => it && it.id && it.nome && Array.isArray(it.evidencias) && it.evidencias.length));
  }

  return { TIPOS, retrato, iconeItem, valido };
})();

Jogos.registrar({
  id: 'caso',
  nome: 'Caso Resolvido',
  grupo: 'estrategia',
  icone: 'i-lupa',
  descricao: 'Um mistério no fundo do mar: responda para liberar evidências e descubra quem, como e onde.',
  duracao: '8-15 min',
  requer: { casos: 1, multipla: 6 },

  iniciar(ctx) {
    const { h, icone } = UI;
    const { TIPOS, retrato, iconeItem } = CasoResolvido;
    const caso = UI.sortear(ctx.cartas.casos);
    const OXIGENIO = 3;
    const inicio = Date.now();
    const perguntas = UI.embaralhar(ctx.cartas.multipla);
    const detalhes = [];
    const descartados = new Set(); // "tipo:id"
    const evidencias = []; // { tipo (rótulo), texto, item, grupo }
    let oxigenio = OXIGENIO;
    let respondidas = 0;
    let acertosSeguidos = 0;
    let comboMaximo = 0;
    let acusacoesErradas = 0;
    let ip = 0; // próxima pergunta
    let questaoAtual = null;
    let resolvido = false;

    // O envelope: uma solução sorteada por partida
    const solucao = {};
    TIPOS.forEach(({ chave, letra }) => (solucao[letra] = UI.sortear(caso[chave])));
    const chaveDe = (letra, item) => `${letra}:${item.id}`;
    const ehSolucao = (letra, item) => solucao[letra].id === item.id;

    const raiz = ctx.container;

    /* ---------- 1. Abertura do caso ---------- */
    function abertura() {
      raiz.replaceChildren(
        h('article', { class: 'caso-terminal' },
          h('div', { class: 'caso-terminal__barra' }, h('i'), h('i'), h('i'), h('span', { text: `arquivo do caso · ${caso.id || 'confidencial'}` })),
          h('div', { class: 'caso-terminal__corpo' },
            h('p', { class: 'rotulo', text: 'Caso Resolvido' }),
            h('h2', { class: 'caso-titulo', text: caso.titulo }),
            h('p', { class: 'caso-historia', text: caso.historia || '' }),
            h('ul', { class: 'caso-perguntas' }, TIPOS.map(({ letra, rotulo }) => h('li', {},
              h('span', { class: 'chip', text: rotulo }),
              h('span', { text: (caso.perguntas && caso.perguntas[letra]) || '' })))),
            h('details', { class: 'caso-como-jogar' },
              h('summary', { text: 'Como jogar' }),
              h('ul', {},
                h('li', { text: 'Toque em "Investigar" e responda uma pergunta do curso.' }),
                h('li', { text: 'Acertou? Uma evidência descarta um suspeito, um golpe ou uma área. Três acertos seguidos valem uma evidência extra.' }),
                h('li', { text: 'Quando tiver certeza, faça a acusação: quem, como e onde.' }),
                h('li', { text: 'Acusação errada gasta 1 dos 3 tubos de oxigênio. Quanto menos perguntas usar, mais pontos.' }))),
            h('button', { type: 'button', class: 'botao botao--primario botao--largo', onclick: caderno }, icone('i-lupa'), 'Abrir o caso'))));
      raiz.querySelector('.botao--primario').focus({ preventScroll: true });
    }

    /* ---------- 2. Caderno do detetive ---------- */
    const hud = h('div', { class: 'jogo-hud caso-hud' });
    const acoes = h('div', { class: 'caso-acoes' });
    const palco = h('div', { class: 'caso-palco', 'aria-live': 'polite' });
    const quadro = h('div', { class: 'caso-quadro' });
    const listaEvidencias = h('ol', { class: 'caso-evidencias__lista', reversed: true });

    function atualizarHud() {
      hud.replaceChildren(
        JogoComum.oxigenio(oxigenio, OXIGENIO),
        h('span', { class: 'caso-hud__num', text: `Perguntas: ${respondidas}` }),
        h('span', { class: 'caso-hud__num', text: `Evidências: ${evidencias.length}` }));
    }

    function cartao(tipo, item) {
      const fora = descartados.has(chaveDe(tipo.letra, item));
      const arte = tipo.chave === 'suspeitos' ? retrato(item.visual) : iconeItem(item.id);
      const card = h('li', { class: `caso-card ${fora ? 'caso-card--fora' : ''}`, 'data-chave': chaveDe(tipo.letra, item) },
        h('span', { class: 'caso-card__arte', 'aria-hidden': 'true' }),
        h('span', { class: 'caso-card__nome', text: item.nome }),
        h('span', { class: 'caso-card__papel', text: item.papel || item.sistema || '' }),
        fora ? h('span', { class: 'caso-card__carimbo', text: 'Descartado' }) : null,
        h('span', { class: 'visualmente-oculto', text: fora ? ' (descartado)' : ' (ainda suspeito)' }));
      card.querySelector('.caso-card__arte').innerHTML = arte; // SVG fixo deste arquivo
      card.title = item.descricao || '';
      return card;
    }

    function desenharQuadro() {
      quadro.replaceChildren(...TIPOS.map((tipo) => {
        const restantes = caso[tipo.chave].filter((it) => !descartados.has(chaveDe(tipo.letra, it))).length;
        return h('section', { class: 'caso-grupo', 'aria-label': `${tipo.rotulo}: ${tipo.titulo}` },
          h('h3', { class: 'caso-grupo__titulo' }, h('span', { class: 'chip', text: tipo.rotulo }), (caso.perguntas && caso.perguntas[tipo.letra]) || tipo.titulo,
            h('span', { class: 'caso-grupo__resta', text: `${restantes} de ${caso[tipo.chave].length}` })),
          h('ul', { class: 'caso-cards' }, caso[tipo.chave].map((item) => cartao(tipo, item))));
      }));
    }

    function desenharAcoes() {
      acoes.replaceChildren(
        h('button', { type: 'button', class: 'botao botao--primario', onclick: investigar }, icone('i-lupa'), 'Investigar'),
        h('button', { type: 'button', class: 'botao botao--secundario', onclick: acusacao }, icone('i-alvo'), 'Fazer acusação'));
    }

    function caderno() {
      atualizarHud();
      desenharQuadro();
      desenharAcoes();
      palco.replaceChildren(h('p', { class: 'caso-dica', text: evidencias.length ? 'Confira as evidências e siga investigando, ou acuse se já tiver certeza.' : 'Comece investigando: cada acerto revela uma evidência.' }));
      raiz.replaceChildren(hud, acoes, palco, quadro,
        h('section', { class: 'caso-terminal caso-evidencias' },
          h('div', { class: 'caso-terminal__barra' }, h('i'), h('i'), h('i'), h('span', { text: 'evidências' })),
          evidencias.length ? listaEvidencias : h('p', { class: 'caso-evidencias__vazio', text: 'Nenhuma evidência ainda.' })));
      acoes.querySelector('.botao--primario').focus({ preventScroll: true });
    }

    /* ---------- Investigar: uma pergunta, uma evidência ---------- */
    function investigar() {
      const q = perguntas[ip % perguntas.length];
      ip++;
      acoes.replaceChildren();
      palco.replaceChildren();
      palco.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
      let achados = [];
      questaoAtual = JogoComum.questao(palco, q, {
        aoResponder: (acertou, d) => {
          detalhes.push(d);
          respondidas++;
          if (acertou) {
            acertosSeguidos++;
            comboMaximo = Math.max(comboMaximo, acertosSeguidos);
            achados = [revelar()];
            if (acertosSeguidos % 3 === 0) achados.push(revelar(true));
          } else {
            acertosSeguidos = 0;
          }
          achados = achados.filter(Boolean);
          atualizarHud();
          // Mostra a evidência logo abaixo da explicação (o painel de feedback é montado logo depois deste aviso)
          setTimeout(() => {
            const fb = palco.querySelector('.jogo-feedback');
            if (!fb) return;
            const aviso = acertou && achados.length
              ? h('div', { class: 'caso-nova' }, ...achados.map((e) => h('p', {}, h('span', { class: 'caso-evidencia__tipo', text: e.tipo }), ` ${e.texto} `, h('strong', { text: `→ ${e.item} descartado${e.extra ? ' (sequência de 3: evidência extra!)' : ''}` }))))
              : h('p', { class: 'caso-nova caso-nova--nada', text: acertou ? 'Você já descartou tudo o que dava: hora de acusar!' : 'O Kraken apagou esse rastro. Nenhuma evidência desta vez.' });
            fb.insertBefore(aviso, fb.querySelector('button'));
          }, 0);
        },
        aoContinuar: () => {
          if (questaoAtual) questaoAtual.destruir();
          questaoAtual = null;
          caderno();
          // Destaca no quadro o que acabou de ser descartado
          achados.forEach((e) => {
            const el = quadro.querySelector(`[data-chave="${e.chave}"]`);
            if (el) el.classList.add('caso-card--agora');
          });
        },
        textoContinuar: 'Voltar ao caderno',
      });
    }

    /** Descarta um item que não é a solução e registra a evidência. */
    function revelar(extra = false) {
      const candidatos = [];
      TIPOS.forEach((tipo) => caso[tipo.chave].forEach((item) => {
        if (!ehSolucao(tipo.letra, item) && !descartados.has(chaveDe(tipo.letra, item))) candidatos.push({ tipo, item });
      }));
      if (!candidatos.length) return null;
      const { tipo, item } = UI.sortear(candidatos);
      const ev = UI.sortear(item.evidencias);
      descartados.add(chaveDe(tipo.letra, item));
      const e = { tipo: ev.tipo || 'PISTA', texto: ev.texto || '', item: item.nome, chave: chaveDe(tipo.letra, item), extra };
      evidencias.unshift(e);
      listaEvidencias.prepend(h('li', { class: 'caso-evidencia' },
        h('span', { class: 'caso-evidencia__tipo', text: e.tipo }),
        h('span', { class: 'caso-evidencia__texto', text: e.texto }),
        h('span', { class: 'caso-evidencia__efeito', text: `${tipo.rotulo}: ${item.nome} descartado` })));
      return e;
    }

    /* ---------- Acusação ---------- */
    function acusacao() {
      const escolha = {};
      const botaoAcusar = h('button', { type: 'button', class: 'botao botao--primario', disabled: true, onclick: () => acusar(escolha) }, icone('i-alvo'), 'Acusar');
      const grupos = TIPOS.map((tipo) => h('fieldset', { class: 'caso-escolha' },
        h('legend', {}, h('span', { class: 'chip', text: tipo.rotulo }), ' ', (caso.perguntas && caso.perguntas[tipo.letra]) || tipo.titulo),
        h('div', { class: 'caso-escolha__opcoes' }, caso[tipo.chave].map((item) => {
          const fora = descartados.has(chaveDe(tipo.letra, item));
          return h('label', { class: `caso-opcao ${fora ? 'caso-opcao--fora' : ''}` },
            h('input', { type: 'radio', name: `acusar-${tipo.letra}`, value: item.id, onchange: () => {
              escolha[tipo.letra] = item;
              botaoAcusar.disabled = TIPOS.some((t) => !escolha[t.letra]);
            } }),
            h('span', { text: item.nome }),
            fora ? h('span', { class: 'caso-opcao__marca', text: 'descartado' }) : null);
        }))));
      acoes.replaceChildren();
      palco.replaceChildren(h('form', { class: 'cartao caso-acusacao', onsubmit: (e) => e.preventDefault() },
        h('h3', { class: 'caso-acusacao__titulo', text: 'Sua acusação' }),
        h('p', { class: 'texto-suave', text: `Acusação errada gasta 1 tubo de oxigênio (você tem ${oxigenio}).` }),
        ...grupos,
        h('div', { class: 'caso-acusacao__botoes' },
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: caderno }, 'Voltar ao caderno'),
          botaoAcusar)));
      palco.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
      const primeiro = palco.querySelector('input');
      if (primeiro) primeiro.focus({ preventScroll: true });
    }

    function acusar(escolha) {
      const certos = TIPOS.filter((t) => escolha[t.letra].id === solucao[t.letra].id).length;
      if (certos === TIPOS.length) {
        resolvido = true;
        return relatorio();
      }
      oxigenio--;
      acusacoesErradas++;
      // Quem foi acusado errado e não é solução fica descartado (ele tinha álibi)
      TIPOS.forEach((t) => { if (!ehSolucao(t.letra, escolha[t.letra])) descartados.add(chaveDe(t.letra, escolha[t.letra])); });
      if (oxigenio <= 0) return relatorio();
      caderno();
      palco.replaceChildren(h('div', { class: 'caso-nova caso-nova--erro', role: 'status' },
        h('strong', { text: 'Não fechou.' }),
        ` ${certos} de 3 partes estavam certas. As partes erradas ficaram descartadas no caderno. Você perdeu 1 tubo de oxigênio.`));
    }

    /* ---------- 3. Relatório do caso ---------- */
    function relatorio() {
      atualizarHud();
      const { quem, como, onde } = solucao;
      const bonus = resolvido
        ? { xp: Math.max(15, 60 - respondidas * 3), perolas: Math.max(3, 12 - Math.floor(respondidas / 2)) - acusacoesErradas, motivo: `caso resolvido com ${respondidas} ${respondidas === 1 ? 'pergunta' : 'perguntas'}` }
        : { xp: 0, perolas: 0 };
      bonus.perolas = Math.max(0, bonus.perolas);
      const resultado = Jogos.resultado({
        jogoId: 'caso', trilha: ctx.trilha, detalhes, inicio, comboMaximo, oxigenioRestante: oxigenio, bonus, concluido: resolvido,
        pontuacao: resolvido ? Math.max(1, 1000 - respondidas * 40 - acusacoesErradas * 100) : 0,
        titulo: resolvido ? 'Caso resolvido!' : 'O caso esfriou',
        subtitulo: `${quem.nome}, ${como.nome.toLowerCase()}, ${onde.nome.toLowerCase()}. ${resolvido ? 'Dedução de mergulhador experiente.' : 'Faltou fôlego, não talento: tente de novo, o envelope muda a cada partida.'}`,
      });
      const ret = h('span', { class: 'caso-solucao__retrato', 'aria-hidden': 'true' });
      ret.innerHTML = retrato(quem.visual); // SVG fixo deste arquivo
      raiz.replaceChildren(hud,
        h('article', { class: `caso-terminal caso-relatorio ${resolvido ? 'caso-relatorio--ok' : ''}` },
          h('div', { class: 'caso-terminal__barra' }, h('i'), h('i'), h('i'), h('span', { text: 'relatório do caso' })),
          h('div', { class: 'caso-terminal__corpo' },
            h('p', { class: 'rotulo', text: resolvido ? 'Caso resolvido' : 'Caso encerrado' }),
            h('h2', { class: 'caso-titulo', text: resolvido ? 'Mandou bem, Diver! O Kraken foi pego.' : 'O Kraken escapou desta vez.' }),
            h('div', { class: 'caso-solucao' }, ret,
              h('div', {},
                h('p', {}, h('span', { class: 'chip', text: 'Quem' }), ' ', h('strong', { text: quem.nome }), ` (${quem.papel || ''})`),
                h('p', {}, h('span', { class: 'chip', text: 'Como' }), ' ', h('strong', { text: como.nome }), `: ${como.descricao || ''}`),
                h('p', {}, h('span', { class: 'chip', text: 'Onde' }), ' ', h('strong', { text: onde.nome }), onde.sistema ? ` (${onde.sistema})` : ''))),
            h('p', { class: 'caso-licao' }, h('strong', { text: 'Como evitar: ' }), como.licao || 'Desconfie, confirme por outro canal e reporte rápido.'),
            h('p', { class: 'texto-suave', text: `Ninguém aqui é vilão: ${quem.nome.split(' ').slice(-2).join(' ')} foi alvo de um golpe bem feito. Por isso a segurança é trabalho de todo mundo.` }),
            h('p', { class: 'caso-numeros', text: `${respondidas} ${respondidas === 1 ? 'pergunta' : 'perguntas'} · ${evidencias.length} evidências · ${acusacoesErradas} ${acusacoesErradas === 1 ? 'acusação errada' : 'acusações erradas'}` }),
            h('button', { type: 'button', class: 'botao botao--primario botao--largo', onclick: () => ctx.aoTerminar(resultado) }, 'Ver resumo e pontos'))));
      raiz.querySelector('.caso-relatorio .botao--primario').focus({ preventScroll: true });
    }

    abertura();
    return { destruir: () => questaoAtual && questaoAtual.destruir() };
  },
});

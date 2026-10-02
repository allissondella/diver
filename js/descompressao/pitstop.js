/*
 * Pit Stop Mental (Sala de Descompressão) — reflexo e cálculo no box de uma equipe de corrida.
 * - O box aparece visto de cima: o carro para nas marcas e 8 mecânicos esperam, dois em cada roda.
 * - Cada pit stop tem 4 contas (uma por roda), com o valor de x: "x + 4x·1 = ?" com x = 3 → 15.
 *   Acertou: a dupla daquela roda troca o pneu e levanta o braço. As 4 prontas: luz verde e o carro arranca.
 * - Tempo: começa no tempo base (6 s na fase 1) e cada acerto desconta (perfeito, dentro da barra: −1 s;
 *   bom: −0,6 s; lento: −0,25 s). Erro: +0,8 s, a porca cai e a próxima conta demora um instante.
 *   Abaixo de 2,5 s: "Pit stop recorde!"; até 4 s: "rápido"; acima: "lento". Bater o rival libera a próxima fase.
 * - Combo: 3 acertos seguidos ligam o "box sincronizado": a próxima resposta certa troca duas rodas.
 * - Fases: 1–2 contas simples, 3–4 ordem das operações, 5–6 produtos de dois termos, 7–8 parênteses,
 *   9+ tudo misturado com x negativo. O tempo base cai e o rival fica mais rápido a cada fase.
 * - Modos: Alternativas (4 opções, teclas 1 a 4) ou Digitar (vale ×1,5).
 * - Pontos (só no placar da sala): recorde 100, rápido 60, lento 20; +30 se vencer o rival. Vale o recorde.
 * - Resumo: tempo de cada roda, as contas erradas resolvidas passo a passo e o melhor pit stop.
 * O carro e o box são desenhos nossos (SVG neste arquivo), sem marcas de categorias de corrida.
 */
(() => {
  const { h, icone, plural } = UI;
  /* =====================================================================
     CONTAS — cada uma devolve { texto, x, valor, passos } (passos = resolução para o resumo)
     Faixas: 0 simples · 1 ordem das operações · 2 produtos de dois termos · 3 parênteses · 4 x negativo
     ===================================================================== */
  const M = '−'; // sinal de menos tipográfico (o jogador pode digitar "-")
  const num = (n) => (n < 0 ? `${M}${-n}` : String(n));
  const coef = (c, v = 'x') => (c === 1 ? v : c === -1 ? `${M}${v}` : `${num(c)}${v}`);
  /** "3x + 5", "x − 2", "−4x"... a partir de um coeficiente e uma constante */
  const linear = (a, k, v = 'x') => {
    if (!a) return num(k);
    if (!k) return coef(a, v);
    return `${coef(a, v)} ${k < 0 ? M : '+'} ${Math.abs(k)}`;
  };
  const vezes = (a, x) => `${num(a)}·${x < 0 ? `(${num(x)})` : x}`;
  const inteiro = (a, b, r) => a + Math.floor(r() * (b - a + 1));
  const sortear = (l, r) => l[Math.floor(r() * l.length)];

  const MODELOS = [
    // 0 · simples
    [
      (r, x) => { const a = inteiro(2, 6, r); const b = inteiro(1, 5, r); const s = a + b;
        return { texto: `${coef(a)} + ${coef(b)}`, valor: s * x, passos: [`${coef(a)} + ${coef(b)} = ${coef(s)}`, `${vezes(s, x)} = ${num(s * x)}`] }; },
      (r, x) => { const b = inteiro(2, 6, r); const s = b + 1;
        return { texto: `x + ${b}x·1`, valor: s * x, passos: [`${b}x·1 = ${b}x`, `x + ${b}x = ${coef(s)}`, `${vezes(s, x)} = ${num(s * x)}`] }; },
      (r, x) => { const a = inteiro(3, 7, r); const b = inteiro(1, 4, r); const c = inteiro(1, a + b - 1, r); const s = a + b - c;
        return { texto: `${coef(a)} + ${coef(b)} ${M} ${coef(c)}`, valor: s * x, passos: [`${coef(a)} + ${coef(b)} ${M} ${coef(c)} = ${coef(s)}`, `${vezes(s, x)} = ${num(s * x)}`] }; },
    ],
    // 1 · ordem das operações
    [
      (r, x) => { const a = inteiro(3, 7, r); const b = inteiro(1, a - 1, r); const d = inteiro(2, 4, r); const q = inteiro(1, 4, r); const c = d * q; const s = a - b;
        return { texto: `${a}x ${M} ${b}·x + ${c} ÷ ${d}`, valor: s * x + q,
          passos: [`Primeiro multiplicação e divisão: ${b}·x = ${coef(b)} e ${c} ÷ ${d} = ${q}`, `${coef(a)} ${M} ${coef(b)} = ${coef(s)}`, `${vezes(s, x)} + ${q} = ${num(s * x + q)}`] }; },
      (r, x) => { const k = inteiro(2, 9, r); const a = inteiro(2, 5, r); const b = inteiro(2, 4, r); const s = a * b;
        return { texto: `${k} + ${a}·${b}x`, valor: k + s * x, passos: [`Primeiro a multiplicação: ${a}·${b}x = ${coef(s)}`, `${k} + ${vezes(s, x)} = ${num(k + s * x)}`] }; },
      (r, x) => { const d = inteiro(2, 3, r); const a = d * inteiro(2, 4, r); const b = inteiro(1, 3, r); const s = a / d + b;
        return { texto: `${a}x ÷ ${d} + ${coef(b)}`, valor: s * x, passos: [`Primeiro a divisão: ${a}x ÷ ${d} = ${coef(a / d)}`, `${coef(a / d)} + ${coef(b)} = ${coef(s)}`, `${vezes(s, x)} = ${num(s * x)}`] }; },
    ],
    // 2 · produtos de dois termos
    [
      (r, x) => { const a = inteiro(2, 4, r); const b = inteiro(2, 4, r); const c = inteiro(1, 5, r); const p = a * b; const s = p + c;
        return { texto: `${a}x·${b} + ${coef(c)}`, valor: s * x, passos: [`${a}x·${b} = ${coef(p)}`, `${coef(p)} + ${coef(c)} = ${coef(s)}`, `${vezes(s, x)} = ${num(s * x)}`] }; },
      (r, x) => { const a = inteiro(1, 3, r); const b = inteiro(2, 3, r); const p = a * b;
        return { texto: `${coef(a)}·${b}x`, valor: p * x * x, passos: [`${coef(a)}·${b}x = ${p === 1 ? '' : p}x²`, `x² = ${x < 0 ? `(${num(x)})` : x}² = ${x * x}`, `${p}·${x * x} = ${num(p * x * x)}`] }; },
      (r, x) => { const a = inteiro(2, 3, r); const b = inteiro(2, 4, r); const c = inteiro(1, a * b - 1, r); const s = a * b - c;
        return { texto: `${a}·${b}x ${M} ${coef(c)}`, valor: s * x, passos: [`${a}·${b}x = ${coef(a * b)}`, `${coef(a * b)} ${M} ${coef(c)} = ${coef(s)}`, `${vezes(s, x)} = ${num(s * x)}`] }; },
    ],
    // 3 · parênteses
    [
      (r, x) => { const a = inteiro(2, 4, r); const b = inteiro(1, 5, r); const c = inteiro(1, a - 1, r); const s = a - c;
        return { texto: `${a}(x + ${b}) ${M} ${coef(c)}`, valor: s * x + a * b,
          passos: [`Distribua: ${a}(x + ${b}) = ${a}x + ${a * b}`, `${a}x ${M} ${coef(c)} = ${coef(s)} → ${linear(s, a * b)}`, `${vezes(s, x)} + ${a * b} = ${num(s * x + a * b)}`] }; },
      (r, x) => { const a = inteiro(2, 3, r); const b = inteiro(2, 3, r); const c = inteiro(1, 4, r); const s = a * b + 1;
        return { texto: `${a}(${b}x ${M} ${c}) + x`, valor: s * x - a * c,
          passos: [`Distribua: ${a}(${b}x ${M} ${c}) = ${a * b}x ${M} ${a * c}`, `${a * b}x + x = ${coef(s)} → ${linear(s, -a * c)}`, `${vezes(s, x)} ${M} ${a * c} = ${num(s * x - a * c)}`] }; },
      (r, x) => { const a = inteiro(2, 4, r); const b = inteiro(1, 4, r); const c = inteiro(1, 3, r); const s = a + c;
        return { texto: `${a}(x ${M} ${b}) + ${coef(c)}`, valor: s * x - a * b,
          passos: [`Distribua: ${a}(x ${M} ${b}) = ${a}x ${M} ${a * b}`, `${a}x + ${coef(c)} = ${coef(s)} → ${linear(s, -a * b)}`, `${vezes(s, x)} ${M} ${a * b} = ${num(s * x - a * b)}`] }; },
    ],
  ];

  /** Faixa da fase: 1–2 simples, 3–4 ordem, 5–6 produtos, 7–8 parênteses, 9+ tudo misturado com x negativo. */
  const faixaDaFase = (f) => (f <= 2 ? 0 : f <= 4 ? 1 : f <= 6 ? 2 : f <= 8 ? 3 : 4);

  function novaConta(fase, r) {
    const faixa = faixaDaFase(fase);
    const grupo = faixa === 4 ? sortear(MODELOS.slice(1), r) : MODELOS[faixa];
    const negativo = faixa === 4 || (faixa === 3 && r() < 0.25);
    const x = negativo ? -inteiro(1, 5, r) : inteiro(faixa === 2 ? 2 : 1, faixa === 0 ? 6 : 5, r);
    const c = sortear(grupo, r)(r, x);
    return { texto: `${c.texto} = ?`, x, valor: c.valor, passos: c.passos, faixa };
  }

  /** Quatro alternativas: a certa + três "pegadinhas" perto dela (erro de sinal, de ordem, de um a mais). */
  function alternativas(conta, r) {
    const v = conta.valor;
    const ideias = [v + conta.x, v - conta.x, -v, v + 1, v - 1, v + 2, v * 2, v + 10, v - 3].filter((n) => n !== v);
    const escolhidas = [];
    for (const n of ideias.sort(() => r() - 0.5)) if (!escolhidas.includes(n) && escolhidas.length < 3) escolhidas.push(n);
    return [...escolhidas, v].sort(() => r() - 0.5);
  }

  /* =====================================================================
     O JOGO
     ===================================================================== */
  const RODAS = ['Dianteira esquerda', 'Dianteira direita', 'Traseira esquerda', 'Traseira direita'];
  const DESCONTO = { perfeito: 1.0, bom: 0.6, lento: 0.25 };
  const PENALIDADE = 0.8;
  const COMBO_CHEIO = 3;
  const EXTRA_PERFEITO = [0, 1, 1, 1.5, 2]; // segundos a mais para o "perfeito" nas contas mais longas
  const PONTOS = { recorde: 100, rapido: 60, lento: 20 };
  const BONUS_VITORIA = 30;
  const parametros = (fase) => ({
    base: Math.max(5, 6 - 0.1 * (fase - 1)),
    rival: Math.max(2.2, 4 - 0.18 * (fase - 1)),
    perfeito: 2 + EXTRA_PERFEITO[faixaDaFase(fase)],
  });
  const seg = (s) => s.toFixed(2).replace('.', ',');
  const categoria = (t) => (t < 2.5 ? 'recorde' : t <= 4 ? 'rapido' : 'lento');
  const TITULO = { recorde: 'Pit stop recorde!', rapido: 'Pit stop rápido', lento: 'Pit stop lento' };

  /** O box visto de cima: faixa, marcas no chão, carro, 4 rodas com 2 mecânicos cada e o semáforo. */
  function cena() {
    const mecanicos = (rx, ry, lado) => {
      const fora = lado < 0 ? rx - 46 : rx + 46;
      return `<g class="ps-mec ps-mec--pistola" transform="translate(${fora} ${ry - 14})"><circle r="11" class="ps-capacete"/><rect class="ps-pistola" x="${lado < 0 ? 8 : -22}" y="-3" width="14" height="6" rx="2"/><path class="ps-braco" d="M0 0 L${lado < 0 ? -8 : 8} -16" /></g>
        <g class="ps-mec ps-mec--pneu" transform="translate(${fora} ${ry + 18})"><circle r="11" class="ps-capacete ps-capacete--2"/><circle class="ps-pneu-novo" cx="${lado < 0 ? -20 : 20}" cy="0" r="8"/><path class="ps-braco" d="M0 0 L${lado < 0 ? -8 : 8} -16"/></g>`;
    };
    const rodas = [[118, 128, -1], [242, 128, 1], [118, 292, -1], [242, 292, 1]].map(([x, y, lado], i) => `
      <g class="ps-roda" data-r="${i}">
        <rect class="ps-marca" x="${x - 20}" y="${y - 30}" width="40" height="60" rx="6"/>
        ${mecanicos(x, y, lado)}
        <g class="ps-pneu"><rect x="${x - 14}" y="${y - 24}" width="28" height="48" rx="7"/><rect class="ps-pneu__aro" x="${x - 6}" y="${y - 10}" width="12" height="20" rx="3"/></g>
        <circle class="ps-porca" cx="${x}" cy="${y}" r="3.5"/>
        <g class="ps-ok" transform="translate(${x} ${y})"><circle r="13"/><path d="M-6 0 L-1.5 5 L7 -5"/></g>
      </g>`).join('');
    return `<svg class="ps-cena" viewBox="0 0 360 420" role="img" aria-label="Box de corrida visto de cima: o carro parado e oito mecânicos, dois em cada roda">
      <rect class="ps-asfalto" x="0" y="0" width="360" height="420"/>
      <path class="ps-faixa" d="M40 0 V420 M320 0 V420"/>
      <g class="ps-semaforo" transform="translate(180 22)"><rect x="-34" y="-14" width="68" height="28" rx="14"/><circle class="ps-luz ps-luz--vermelha" cx="-15" cy="0" r="9"/><circle class="ps-luz ps-luz--verde" cx="15" cy="0" r="9"/></g>
      <g class="ps-carro">
        <path class="ps-asa" d="M120 92 H240 V104 H120 Z"/>
        <path class="ps-corpo" d="M168 96 Q180 70 192 96 L204 170 Q214 196 210 250 L208 318 Q180 334 152 318 L150 250 Q146 196 156 170 Z"/>
        <path class="ps-lateral" d="M150 200 Q130 210 132 250 L134 290 Q150 296 152 280 Z M210 200 Q230 210 228 250 L226 290 Q210 296 208 280 Z"/>
        <ellipse class="ps-cockpit" cx="180" cy="208" rx="12" ry="22"/>
        <circle class="ps-piloto" cx="180" cy="204" r="9"/>
        <path class="ps-asa" d="M128 324 H232 V340 H128 Z"/>
        <text class="ps-numero" x="180" y="292" text-anchor="middle">7</text>
      </g>
      ${rodas}
    </svg>`;
  }

  Descompressao.registrar({
    id: 'pitstop',
    nome: 'Pit Stop Mental',
    curto: 'Pit Stop',
    icone: 'i-bandeira',
    duracao: '1 a 2 min por corrida',
    diario: false,
    descricao: 'Comande a equipe de box: cada conta certa troca uma roda. Responda rápido para fazer um pit stop recorde e vencer o rival. As contas ficam mais difíceis a cada fase.',
    abrir(ctx) {
      const salvo = ctx.estado() || {};
      const cfg = { modo: salvo.modo || 'alternativas', fase: salvo.fase || 1, melhor: salvo.melhor || null };
      const guardar = () => ctx.gravar({ modo: cfg.modo, fase: cfg.fase, melhor: cfg.melhor });
      let corrida = null;
      let timers = [];
      let aoTeclar = null;
      const depois = (ms, fn) => timers.push(setTimeout(fn, UI.movimentoReduzido ? Math.min(ms, 150) : ms));
      const limparTimers = () => { timers.forEach(clearTimeout); timers = []; };

      /* ---------- Menu ---------- */
      function menu() {
        limparTimers();
        corrida = null;
        const p = parametros(cfg.fase);
        const recorde = ctx.recorde();
        ctx.container.replaceChildren(h('div', { class: 'ps' }, h('section', { class: 'cartao ps-menu', id: 'ps-menu' },
          h('div', { class: 'ps-menu__topo' },
            h('h2', { class: 'cartao__titulo', text: `Fase ${cfg.fase}` }),
            h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => guia(true) }, icone('i-livro'), 'Como jogar')),
          h('p', { text: `Cada pit stop tem 4 contas, uma por roda. O cronômetro começa em ${seg(p.base)} s e cada acerto tira tempo: quanto mais rápido, mais tira. O rival desta fase fez ${seg(p.rival)} s.` }),
          h('div', { class: 'ps-menu__opcao' },
            h('span', { class: 'ps-menu__rotulo', text: 'Como responder' }),
            h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Como responder' },
              [['alternativas', 'Alternativas'], ['digitar', 'Digitar (vale ×1,5)']].map(([m, t]) => h('button', { type: 'button', 'aria-pressed': String(cfg.modo === m), onclick: () => { cfg.modo = m; guardar(); menu(); } }, t)))),
          h('ul', { class: 'ps-menu__dados' },
            h('li', {}, h('strong', { text: cfg.melhor ? `${seg(cfg.melhor)} s` : '—' }), h('span', { text: 'seu melhor pit stop' })),
            h('li', {}, h('strong', { text: recorde ? String(recorde) : '—' }), h('span', { text: 'recorde de pontos' }))),
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--primario', id: 'ps-comecar', onclick: comecar }, icone('i-bandeira'), 'Começar a corrida'),
            cfg.fase > 1 ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: async () => {
              if (!(await UI.confirmar({ titulo: 'Voltar para a fase 1?', texto: 'As contas voltam a ser as mais simples.', sim: 'Voltar à fase 1', nao: 'Ficar aqui', humor: 'pensando' }))) return;
              cfg.fase = 1; guardar(); menu();
            } }, 'Recomeçar da fase 1') : null))));
        ctx.container.querySelector('#ps-comecar').focus({ preventScroll: true });
        guia(false);
      }

      /* ---------- Corrida ---------- */
      function comecar() {
        limparTimers();
        const p = parametros(cfg.fase);
        const r = Math.random;
        corrida = { fase: cfg.fase, p, r, tempo: p.base, rodas: RODAS.map(() => ({ feita: false, segundos: 0, erros: 0, nota: null })), combo: 0, sincronizado: false, erradas: [], conta: null, inicio: 0, travado: true, fim: false };
        const cronometro = h('div', { class: 'ps-cronometro', 'aria-live': 'off' },
          h('span', { class: 'ps-cronometro__rotulo', text: 'PIT STOP' }), h('strong', { class: 'ps-cronometro__valor', id: 'ps-tempo', text: seg(p.base) }));
        const rival = h('div', { class: 'ps-rival' }, h('span', { text: 'RIVAL' }), h('strong', { text: seg(p.rival) }));
        const combo = h('div', { class: 'ps-combo', id: 'ps-combo', role: 'meter', 'aria-label': 'Combo', 'aria-valuemin': '0', 'aria-valuemax': String(COMBO_CHEIO) },
          h('span', { class: 'ps-combo__rotulo', text: 'Combo' }), h('span', { class: 'ps-combo__trilho' }, h('span', { class: 'ps-combo__barra' })));
        const palco = h('div', { class: 'ps-palco' });
        palco.innerHTML = cena(); // SVG fixo deste arquivo (nada vem de fora)
        const conta = h('div', { class: 'ps-conta', id: 'ps-conta', 'aria-live': 'polite' });
        const respostas = h('div', { class: 'ps-respostas', id: 'ps-respostas' });
        const janela = h('div', { class: 'ps-janela', 'aria-hidden': 'true' }, h('span', { class: 'ps-janela__barra' }));
        const aviso = h('p', { class: 'ps-aviso', 'aria-live': 'assertive' });
        ctx.container.replaceChildren(h('div', { class: 'ps ps--corrida' },
          h('div', { class: 'ps-painel' }, h('span', { class: 'chip chip--hoje', text: `Fase ${cfg.fase}` }), cronometro, rival, combo),
          h('div', { class: 'ps-pista' }, palco, h('div', { class: 'ps-comando' }, conta, janela, respostas, aviso))));
        corrida.el = { cronometro, palco, conta, respostas, janela, aviso, combo };
        const svg = palco.querySelector('.ps-cena');
        svg.classList.add('ps-cena--chegando');
        void svg.getBoundingClientRect();
        depois(60, () => svg.classList.remove('ps-cena--chegando'));
        conta.replaceChildren(h('p', { class: 'ps-conta__aviso', text: 'O carro está entrando no box…' }));
        depois(900, proximaConta);
        aoTeclar = (e) => {
          if (!corrida || corrida.travado || cfg.modo !== 'alternativas' || Tutorial.aberto() || document.querySelector('dialog[open]')) return;
          const i = '1234'.indexOf(e.key);
          if (i >= 0) {
            const b = respostas.querySelectorAll('button')[i];
            if (b) { e.preventDefault(); b.click(); }
          }
        };
        document.addEventListener('keydown', aoTeclar);
      }

      const rodaDaVez = () => corrida.rodas.findIndex((x) => !x.feita);

      function proximaConta() {
        if (!corrida || corrida.fim) return;
        const c = corrida;
        const i = rodaDaVez();
        c.conta = novaConta(c.fase, c.r);
        c.inicio = performance.now();
        c.travado = false;
        c.el.palco.querySelectorAll('.ps-roda').forEach((g) => g.classList.toggle('ps-roda--vez', Number(g.dataset.r) === i || (c.sincronizado && Number(g.dataset.r) === proximaPendente(i))));
        c.el.conta.replaceChildren(
          h('p', { class: 'ps-conta__roda', text: c.sincronizado ? `Box sincronizado: ${RODAS[i].toLowerCase()} + mais uma!` : RODAS[i] }),
          h('p', { class: 'ps-conta__x', text: `x = ${num(c.conta.x)}` }),
          h('p', { class: 'ps-conta__expressao', text: c.conta.texto }));
        // barra do "perfeito": esvazia no tempo da resposta perfeita
        const barra = c.el.janela.querySelector('.ps-janela__barra');
        barra.style.transition = 'none';
        barra.style.width = '100%';
        void barra.offsetWidth;
        barra.style.transition = UI.movimentoReduzido ? 'none' : `width ${c.p.perfeito}s linear`;
        barra.style.width = '0%';
        if (cfg.modo === 'alternativas') {
          c.el.respostas.replaceChildren(...alternativas(c.conta, c.r).map((v, k) => h('button', { type: 'button', class: 'ps-alternativa', onclick: () => responder(v) }, h('kbd', { text: String(k + 1) }), num(v))));
          c.el.respostas.querySelector('button').focus({ preventScroll: true });
        } else {
          const campo = h('input', { class: 'campo ps-campo', id: 'ps-campo', inputmode: 'text', autocomplete: 'off', 'aria-label': 'Resultado da conta' });
          c.el.respostas.replaceChildren(h('form', { class: 'ps-form', onsubmit: (e) => {
            e.preventDefault();
            const t = campo.value.trim().replace(/[−–]/g, '-').replace(',', '.');
            if (!/^-?\d+$/.test(t)) { c.el.aviso.textContent = 'Digite só o número (pode ser negativo, como -12).'; return; }
            responder(Number(t));
          } }, campo, h('button', { type: 'submit', class: 'botao botao--primario' }, 'Pronto')));
          campo.focus({ preventScroll: true });
        }
      }

      function proximaPendente(i) {
        return corrida.rodas.findIndex((x, k) => k !== i && !x.feita);
      }

      function atualizarPainel() {
        const c = corrida;
        c.el.cronometro.querySelector('#ps-tempo').textContent = seg(c.tempo);
        c.el.cronometro.classList.toggle('ps-cronometro--batendo', c.tempo < c.p.rival);
        const f = Math.min(1, c.combo / COMBO_CHEIO);
        c.el.combo.style.setProperty('--combo', String(f));
        c.el.combo.classList.toggle('ps-combo--cheio', c.sincronizado);
        c.el.combo.setAttribute('aria-valuenow', String(c.combo));
      }

      function responder(valor) {
        const c = corrida;
        if (!c || c.travado || c.fim) return;
        c.travado = true;
        const segundos = (performance.now() - c.inicio) / 1000;
        const i = rodaDaVez();
        const roda = c.rodas[i];
        roda.segundos += segundos;
        const g = c.el.palco.querySelector(`.ps-roda[data-r="${i}"]`);
        if (valor !== c.conta.valor) {
          roda.erros++;
          c.tempo += PENALIDADE;
          c.combo = 0;
          c.sincronizado = false;
          c.erradas.push({ roda: RODAS[i], conta: c.conta, resposta: valor });
          g.classList.remove('ps-roda--erro');
          void g.getBoundingClientRect();
          g.classList.add('ps-roda--erro');
          c.el.aviso.className = 'ps-aviso ps-aviso--erro';
          c.el.aviso.textContent = `${sortear(['A porca caiu!', 'A pistola travou!', 'O pneu escorregou!'], c.r)} +${seg(PENALIDADE)} s. Era ${num(c.conta.valor)}.`;
          c.el.respostas.querySelectorAll('button, input').forEach((b) => (b.disabled = true));
          atualizarPainel();
          depois(1100, () => { g.classList.remove('ps-roda--erro'); proximaConta(); });
          return;
        }
        const nota = segundos < c.p.perfeito ? 'perfeito' : segundos < c.p.perfeito + 2.5 ? 'bom' : 'lento';
        const usarSincronizado = c.sincronizado && proximaPendente(i) >= 0;
        const alvo = usarSincronizado ? [i, proximaPendente(i)] : [i];
        alvo.forEach((k) => {
          const rr = c.rodas[k];
          rr.feita = true;
          rr.nota = nota;
          c.tempo = Math.max(0.8, c.tempo - DESCONTO[nota]);
          const gg = c.el.palco.querySelector(`.ps-roda[data-r="${k}"]`);
          gg.classList.remove('ps-roda--vez');
          gg.classList.add('ps-roda--trocando');
          depois(450, () => { gg.classList.remove('ps-roda--trocando'); gg.classList.add('ps-roda--pronta'); });
        });
        if (usarSincronizado) { c.sincronizado = false; c.combo = 0; } else {
          c.combo++;
          if (c.combo >= COMBO_CHEIO) c.sincronizado = true;
        }
        c.el.aviso.className = `ps-aviso ps-aviso--${nota}`;
        c.el.aviso.textContent = `${nota === 'perfeito' ? 'Perfeito!' : nota === 'bom' ? 'Boa!' : 'Certo, mas devagar.'} −${seg(DESCONTO[nota] * alvo.length)} s${usarSincronizado ? ' · box sincronizado: duas rodas!' : c.sincronizado ? ' · combo cheio: a próxima troca duas rodas!' : ''}`;
        atualizarPainel();
        if (c.rodas.every((x) => x.feita)) return depois(600, largada);
        depois(500, proximaConta);
      }

      function largada() {
        const c = corrida;
        c.fim = true;
        c.el.palco.querySelector('.ps-semaforo').classList.add('ps-semaforo--verde');
        c.el.respostas.replaceChildren();
        c.el.conta.replaceChildren(h('p', { class: 'ps-conta__aviso', text: 'Luz verde! O carro arranca…' }));
        depois(350, () => c.el.palco.querySelector('.ps-cena').classList.add('ps-cena--saindo'));
        depois(1300, resultado);
      }

      function resultado() {
        const c = corrida;
        const cat = categoria(c.tempo);
        const venceu = c.tempo < c.p.rival;
        const pontos = Math.round((PONTOS[cat] + (venceu ? BONUS_VITORIA : 0)) * (cfg.modo === 'digitar' ? 1.5 : 1));
        const recordeAntes = ctx.recorde();
        ctx.pontuar(pontos, { fase: c.fase, modo: cfg.modo, tempo: Math.round(c.tempo * 100) / 100, venceu, perfeitos: c.rodas.filter((x) => x.nota === 'perfeito').length, erros: c.erradas.length });
        const novoMelhor = !cfg.melhor || c.tempo < cfg.melhor;
        if (novoMelhor) cfg.melhor = Math.round(c.tempo * 100) / 100;
        const faseJogada = c.fase;
        if (venceu) cfg.fase = faseJogada + 1;
        guardar();
        document.removeEventListener('keydown', aoTeclar);
        ctx.container.replaceChildren(h('div', { class: 'ps' }, h('section', { class: 'cartao ps-resumo', id: 'ps-resumo', 'aria-labelledby': 'ps-resumo-titulo' },
          h('h2', { class: `ps-resumo__titulo ps-resumo__titulo--${cat}`, id: 'ps-resumo-titulo', tabindex: '-1', text: TITULO[cat] }),
          h('p', { class: 'ps-resumo__tempo' }, h('strong', { text: `${seg(c.tempo)} s` }), ` contra ${seg(c.p.rival)} s do rival`),
          h('p', { class: venceu ? 'texto-sucesso' : 'texto-erro', text: venceu
            ? `Mandou bem, Diver! O carro voltou à pista na frente. Fase ${faseJogada + 1} liberada.`
            : 'O carro voltou à pista atrás do rival. Bora tentar de novo?' }),
          h('p', { class: 'ps-resumo__pontos' }, icone('i-estrela'), `${plural(pontos, 'ponto', 'pontos')} no placar da sala${pontos > recordeAntes ? ' · novo recorde!' : ''}`),
          h('h3', { class: 'ps-resumo__sub', text: 'Tempo de cada roda' }),
          h('ul', { class: 'ps-resumo__rodas' }, c.rodas.map((x, k) => h('li', { class: `ps-resumo__roda ps-resumo__roda--${x.nota}` },
            h('span', { text: RODAS[k] }),
            h('strong', { text: x.segundos ? `${seg(x.segundos)} s` : 'junto (box sincronizado)' }),
            h('span', { class: 'texto-suave', text: `${x.nota === 'perfeito' ? 'perfeito' : x.nota === 'bom' ? 'bom' : 'lento'}${x.erros ? ` · ${plural(x.erros, 'erro', 'erros')}` : ''}` })))),
          c.erradas.length ? h('div', { class: 'ps-resumo__erros' },
            h('h3', { class: 'ps-resumo__sub', text: 'As contas que escaparam, passo a passo' }),
            h('ol', {}, c.erradas.map((e) => h('li', {},
              h('p', {}, h('strong', { text: e.conta.texto.replace(' = ?', '') }), ` com x = ${num(e.conta.x)} · você respondeu ${num(e.resposta)}, o certo é ${num(e.conta.valor)}`),
              h('ol', { class: 'ps-resumo__passos' }, e.conta.passos.map((s) => h('li', { text: s }))))))) : h('p', { class: 'texto-suave', text: 'Nenhuma conta errada. Box afiado!' }),
          h('p', { class: 'texto-suave', text: `Seu melhor pit stop: ${seg(cfg.melhor)} s${novoMelhor ? ' (é este!)' : ''}.` }),
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--primario', id: 'ps-de-novo', onclick: comecar }, icone('i-bandeira'), venceu ? `Correr a fase ${cfg.fase}` : 'Tentar de novo'),
            h('button', { type: 'button', class: 'botao botao--fantasma', onclick: menu }, 'Menu'),
            h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala')))));
        corrida = null;
        ctx.container.querySelector('#ps-resumo-titulo').focus({ preventScroll: true });
        window.scrollTo(0, 0);
      }

      function guia(forcar) {
        ctx.guia([
          { desenho: 'relogio', titulo: 'Pit Stop Mental', texto: 'Você comanda a equipe de box. Cada pit stop tem 4 contas, uma por roda: acertou, a dupla de mecânicos troca o pneu.' },
          { alvo: '#ps-menu', desenho: 'alvo', titulo: 'Tempo e rival', texto: `O cronômetro começa no tempo base e cada acerto tira segundos: resposta perfeita (dentro da barra) tira ${seg(DESCONTO.perfeito)} s, boa tira ${seg(DESCONTO.bom)} s, lenta tira ${seg(DESCONTO.lento)} s. Erro soma ${seg(PENALIDADE)} s. Bata o tempo do rival para liberar a próxima fase.` },
          { desenho: 'estrela', titulo: 'Combo e box sincronizado', texto: `${COMBO_CHEIO} acertos seguidos enchem o combo: a próxima resposta certa troca duas rodas de uma vez.` },
          { desenho: 'trofeu', titulo: 'Pontos', texto: `Pit stop recorde (abaixo de 2,5 s) vale ${PONTOS.recorde}; rápido (até 4 s), ${PONTOS.rapido}; lento, ${PONTOS.lento}. Vencer o rival dá +${BONUS_VITORIA}. No modo Digitar tudo vale ×1,5. O placar guarda o seu recorde.` },
        ], forcar);
      }

      // Só para os testes automáticos (window.__diverTeste existe apenas quando o teste cria)
      if (window.__diverTeste) window.__diverTeste.pitstop = { corrida: () => corrida };
      menu();
      return {
        emAndamento: () => !!(corrida && !corrida.fim),
        parar() {
          limparTimers();
          corrida = null;
          if (aoTeclar) document.removeEventListener('keydown', aoTeclar);
        },
      };
    },
  });
})();

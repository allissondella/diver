/*
 * A bomba da Batata Quente (2026-10-18, a partir do conceito do usuário, "bomba-batata.svg"): um aparelho caseiro movido a
 * batatas. Duas batatas com eletrodos de cobre e de zinco (a pilha de batata) mandam a energia pelos fios até a caixa,
 * que tem a faixa de alerta, os parafusos, o LED que pisca, o teclado de 12 teclas e o visor vermelho de 7 segmentos com
 * os segundos e os centésimos que faltam. Desenho nosso em SVG, com luz e sombra no estilo da pistola do Tiro ao Alvo
 * (lado em 3/4, brilho nas bordas, sombra no chão). As cores são tokens (css/tokens.css, grupo "Bomba de batata"),
 * aplicadas pelas classes bb-* em css/descompressao.css. Pacote "descompressao", antes de batata.js.
 *
 * BombaBatata.criar() → { svg, mostrar(ms), estado({ quase, fim }) }
 *   mostrar(ms): o visor marca o tempo que falta ("07.43"); acima de 99,99 s fica "99.99".
 */
const BombaBatata = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  let serie = 0; // ids únicos dos degradês (cada partida monta a bomba de novo)

  /* ---------- O visor: dígitos de 7 segmentos desenhados por nós ---------- */
  const W = 21; // largura do dígito
  const H = 38; // altura
  const T = 4.6; // espessura do segmento
  const D = 0.7; // folga entre segmentos
  const hor = (x, y, l) => `${x + T / 2},${y} ${x + l - T / 2},${y} ${x + l},${y + T / 2} ${x + l - T / 2},${y + T} ${x + T / 2},${y + T} ${x},${y + T / 2}`;
  const ver = (x, y, l) => `${x + T / 2},${y} ${x + T},${y + T / 2} ${x + T},${y + l - T / 2} ${x + T / 2},${y + l} ${x},${y + l - T / 2} ${x},${y + T / 2}`;
  const SEGMENTOS = {
    a: hor(D, 0, W - 2 * D),
    b: ver(W - T, D, H / 2 - D),
    c: ver(W - T, H / 2 + D, H / 2 - 2 * D),
    d: hor(D, H - T, W - 2 * D),
    e: ver(0, H / 2 + D, H / 2 - 2 * D),
    f: ver(0, D, H / 2 - D),
    g: hor(D, H / 2 - T / 2, W - 2 * D),
  };
  const ACESOS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];

  function el(tag, attrs = {}, filhos = []) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    filhos.forEach((f) => n.append(f));
    return n;
  }

  /* As batatas: o contorno irregular, o brilho, as "gemas" (olhinhos) e as pintinhas */
  function batata(lado, id) {
    const espelho = lado === 'dir' ? 'translate(320 0) scale(-1 1)' : '';
    const g = el('g', { class: 'bb-batata', transform: `${espelho} translate(0 254) scale(1 1.24) translate(0 -254)` }); // alta como no conceito: cresce para cima, a partir da base
    g.append(
      el('path', { class: 'bb-sombra-macia', d: 'M60,104 C80,96 100,98 118,108 C134,118 140,140 142,170 C143,196 138,214 128,228 C114,246 90,254 66,250 C44,246 30,232 26,212 C21,190 27,170 26,150 C26,128 40,112 60,104 Z', transform: 'translate(4 5)' }),
      el('path', { class: 'bb-contorno', fill: `url(#${id}-batata)`, d: 'M60,104 C80,96 100,98 118,108 C134,118 140,140 142,170 C143,196 138,214 128,228 C114,246 90,254 66,250 C44,246 30,232 26,212 C21,190 27,170 26,150 C26,128 40,112 60,104 Z' }),
      el('path', { class: 'bb-batata-brilho', d: 'M48,124 C60,110 82,104 98,108 C82,114 62,126 52,146 C44,142 43,132 48,124 Z' }),
      el('path', { class: 'bb-batata-reflexo', d: 'M124,150 C130,170 130,196 122,214', fill: 'none' }),
    );
    [[50, 150, 3.6, -20], [68, 214, 3, 15], [44, 124, 2.6, -35], [58, 182, 2.2, 0], [40, 202, 2.4, 25], [80, 132, 2, -10]].forEach(([x, y, r, rot]) => {
      g.append(el('g', { transform: `rotate(${rot} ${x} ${y})` },
        [el('ellipse', { class: 'bb-olho', cx: x, cy: y, rx: r * 1.8, ry: r }), el('path', { class: 'bb-olho-borda', d: `M${x - r * 1.8},${y - 0.4} q${r * 1.8},${-r * 1.4} ${r * 3.6},0`, fill: 'none' })]));
    });
    [[62, 162], [84, 152], [52, 224], [36, 168], [74, 226], [104, 110]].forEach(([x, y]) => g.append(el('circle', { class: 'bb-pinta', cx: x, cy: y, r: 0.9 })));
    return g;
  }

  /* Um eletrodo espetado na batata: cobre (+) ou zinco (−), com o brilho do metal e o terminal */
  function eletrodo(x, y, tipo, id) {
    return el('g', {}, [
      el('rect', { class: 'bb-contorno-fino', x, y, width: 7, height: 60, rx: 1.5, fill: `url(#${id}-${tipo})` }),
      el('rect', { class: 'bb-metal-brilho', x: x + 2, y: y + 3, width: 1.5, height: 30, rx: 0.75 }),
      el('circle', { class: `bb-terminal bb-terminal--${tipo}`, cx: x + 3.5, cy: y + 4, r: 2.8 }),
    ]);
  }

  /* O fio em mola (o cabo de telefone do conceito): uma curva de Bézier com voltinhas em volta dela.
     Cada volta é um laço (trocoide): o ponto anda na curva e gira em volta dela; nas pontas o giro some. */
  function mola(p0, c1, c2, p3, voltas, raio) {
    const B = (t, a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
    const dB = (t, a, b, c, d) => 3 * (1 - t) ** 2 * (b - a) + 6 * (1 - t) * t * (c - b) + 3 * t ** 2 * (d - c);
    const pts = [];
    const n = voltas * 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = B(t, p0[0], c1[0], c2[0], p3[0]);
      const y = B(t, p0[1], c1[1], c2[1], p3[1]);
      const tx = dB(t, p0[0], c1[0], c2[0], p3[0]);
      const ty = dB(t, p0[1], c1[1], c2[1], p3[1]);
      const m = Math.hypot(tx, ty) || 1;
      const ang = 2 * Math.PI * voltas * t;
      const env = Math.min(1, t / 0.07, (1 - t) / 0.07);
      const r = raio * env;
      // o laço: para trás e para o lado (a mola vista de lado)
      const ox = (-Math.sin(ang) * tx) / m * r + (1 - Math.cos(ang)) * (-ty / m) * r * 0.9;
      const oy = (-Math.sin(ang) * ty) / m * r + (1 - Math.cos(ang)) * (tx / m) * r * 0.9;
      pts.push(`${(x + ox).toFixed(1)},${(y + oy).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  }

  /* A ponta do fio: o jacaré de metal que prende no eletrodo ou no borne */
  function ponta(x, y) {
    return el('g', {}, [
      el('circle', { class: 'bb-ponta', cx: x, cy: y, r: 2.9 }),
      el('circle', { class: 'bb-parafuso-brilho', cx: x - 0.8, cy: y - 0.9, r: 0.9 }),
    ]);
  }

  /* Um fio: o contorno escuro, a cor e o brilho de cima (o mesmo jeito do jato da pistola) */
  function fio(d, cor) {
    return el('g', { class: 'bb-fio' }, [
      el('path', { class: 'bb-fio-borda', d }),
      el('path', { class: `bb-fio-cor bb-fio-cor--${cor}`, d }),
      el('path', { class: 'bb-fio-brilho', d, transform: 'translate(-0.4 -0.5)' }),
    ]);
  }

  function degrade(id, classes, extra = {}) {
    return el(extra.radial ? 'radialGradient' : 'linearGradient', { id, ...extra.attrs }, classes.map(([o, c]) => el('stop', { offset: o, class: c })));
  }

  function criar() {
    const id = `bb${++serie}`;
    const svg = el('svg', { viewBox: '0 0 320 272', class: 'bb', 'aria-hidden': 'true', focusable: 'false' });
    const defs = el('defs', {}, [
      degrade(`${id}-batata`, [[0, 'bb-s-batata-claro'], [0.55, 'bb-s-batata'], [1, 'bb-s-batata-escuro']], { radial: true, attrs: { cx: '38%', cy: '30%', r: '78%' } }),
      degrade(`${id}-cobre`, [[0, 'bb-s-cobre-claro'], [0.5, 'bb-s-cobre'], [1, 'bb-s-cobre-escuro']], { attrs: { x1: 0, x2: 1 } }),
      degrade(`${id}-zinco`, [[0, 'bb-s-zinco-claro'], [0.5, 'bb-s-zinco'], [1, 'bb-s-zinco-escuro']], { attrs: { x1: 0, x2: 1 } }),
      degrade(`${id}-corpo`, [[0, 'bb-s-corpo-claro'], [0.55, 'bb-s-corpo'], [1, 'bb-s-corpo-escuro']], { attrs: { x1: 0, y1: 0, x2: 0.35, y2: 1 } }),
      degrade(`${id}-lado`, [[0, 'bb-s-corpo'], [1, 'bb-s-corpo-escuro']], { attrs: { x1: 0, x2: 1 } }),
      degrade(`${id}-tecla`, [[0, 'bb-s-tecla'], [1, 'bb-s-tecla-sombra']], { attrs: { x1: 0, y1: 0, x2: 0, y2: 1 } }),
      degrade(`${id}-visor`, [[0, 'bb-s-visor'], [1, 'bb-s-visor-fundo']], { attrs: { x1: 0, y1: 0, x2: 0, y2: 1 } }),
      degrade(`${id}-vidro`, [[0, 'bb-s-vidro'], [0.45, 'bb-s-vidro-some'], [1, 'bb-s-vidro-some']], { attrs: { x1: 0, y1: 0, x2: 0.4, y2: 1 } }),
      el('pattern', { id: `${id}-alerta`, width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        [el('rect', { class: 'bb-alerta-a', width: 12, height: 12 }), el('rect', { class: 'bb-alerta-b', width: 6, height: 12 })]),
      el('filter', { id: `${id}-brilho`, x: '-30%', y: '-60%', width: '160%', height: '220%' },
        [el('feGaussianBlur', { stdDeviation: 1.6, result: 'b' }), el('feMerge', {}, [el('feMergeNode', { in: 'b' }), el('feMergeNode', { in: 'SourceGraphic' })])]),
      el('filter', { id: `${id}-led`, x: '-150%', y: '-150%', width: '400%', height: '400%' }, [el('feGaussianBlur', { stdDeviation: 2.6 })]),
      el('filter', { id: `${id}-chao`, x: '-20%', y: '-200%', width: '140%', height: '500%' }, [el('feGaussianBlur', { stdDeviation: 4 })]),
      el('clipPath', { id: `${id}-corte` }, [el('rect', { x: 92, y: 112, width: 142, height: 140, rx: 15 })]),
    ]);
    svg.append(defs);

    // a sombra no chão (macia), as batatas e os eletrodos
    svg.append(el('ellipse', { class: 'bb-chao', cx: 162, cy: 262, rx: 140, ry: 9, filter: `url(#${id}-chao)` }));
    // os eletrodos espetados (a ponta de baixo fica dentro da batata) e as batatas por cima
    svg.append(eletrodo(55, 42, 'cobre', id), eletrodo(99, 36, 'zinco', id), eletrodo(214, 37, 'cobre', id), eletrodo(257, 44, 'zinco', id));
    svg.append(batata('esq', id), batata('dir', id));

    // o fio branco em mola que liga as duas batatas por cima (a ponte da pilha)
    svg.append(fio(mola([102.5, 40], [116, 4], [204, 4], [217.5, 41], 26, 3.4), 'branco'));

    // a caixa: o lado em 3/4 (a espessura), a frente com o degradê, a faixa de alerta e o brilho da borda de cima
    svg.append(
      el('path', { class: 'bb-contorno', fill: `url(#${id}-lado)`, d: 'M234,124 L242,130 L242,250 Q242,258 234,258 L106,258 L98,252 L226,252 Q234,252 234,244 Z' }),
      el('rect', { class: 'bb-sombra-caixa', x: 96, y: 118, width: 142, height: 140, rx: 15 }),
      el('rect', { x: 92, y: 112, width: 142, height: 140, rx: 15, fill: `url(#${id}-corpo)` }),
    );
    svg.append(el('g', { 'clip-path': `url(#${id}-corte)` }, [
      el('rect', { x: 92, y: 239, width: 142, height: 13, fill: `url(#${id}-alerta)` }),
      el('rect', { class: 'bb-alerta-linha', x: 92, y: 237, width: 142, height: 2 }),
      el('rect', { class: 'bb-borda-luz', x: 97, y: 115, width: 132, height: 4, rx: 2 }),
      el('rect', { class: 'bb-borda-luz bb-borda-luz--lado', x: 95, y: 120, width: 3, height: 110, rx: 1.5 }),
    ]));
    svg.append(el('rect', { class: 'bb-contorno', x: 92, y: 112, width: 142, height: 140, rx: 15, fill: 'none' }));
    [[101, 121], [225, 121], [101, 231], [225, 231]].forEach(([x, y]) => svg.append(el('g', {}, [
      el('circle', { class: 'bb-parafuso', cx: x, cy: y, r: 3 }),
      el('path', { class: 'bb-parafuso-fenda', d: `M${x - 1.8},${y - 1.8} L${x + 1.8},${y + 1.8}` }),
      el('circle', { class: 'bb-parafuso-brilho', cx: x - 0.9, cy: y - 1, r: 0.9 }),
    ])));

    // os bornes de cima (vermelho = +, preto = −) e os fios que vêm das batatas
    svg.append(
      el('rect', { class: 'bb-contorno-fino bb-borne-base', x: 107, y: 107, width: 14, height: 7, rx: 2 }),
      el('rect', { class: 'bb-contorno-fino bb-borne bb-borne--mais', x: 110, y: 101, width: 8, height: 8, rx: 1.5 }),
      el('rect', { class: 'bb-contorno-fino bb-borne-base', x: 199, y: 107, width: 14, height: 7, rx: 2 }),
      el('rect', { class: 'bb-contorno-fino bb-borne bb-borne--menos', x: 202, y: 101, width: 8, height: 8, rx: 1.5 }),
    );
    svg.append(
      fio(mola([58.5, 46], [84, 36], [106, 66], [114, 101], 15, 3), 'vermelho'),
      fio(mola([260.5, 48], [236, 38], [214, 66], [206, 101], 15, 3), 'preto'),
    );
    [[58.5, 46], [102.5, 40], [217.5, 41], [260.5, 48], [114, 101], [206, 101]].forEach(([x, y]) => svg.append(ponta(x, y)));

    // o LED que pisca
    const led = el('g', { class: 'bb-led' }, [
      el('circle', { class: 'bb-led-base', cx: 163, cy: 121, r: 4.6 }),
      el('g', { class: 'bb-led-luz' }, [
        el('circle', { class: 'bb-led-halo', cx: 163, cy: 121, r: 6.5, filter: `url(#${id}-led)` }),
        el('circle', { class: 'bb-led-miolo', cx: 163, cy: 121, r: 3.3 }),
        el('circle', { class: 'bb-led-reflexo', cx: 162, cy: 120, r: 1.1 }),
      ]),
    ]);
    svg.append(led);

    // o visor: a moldura, o vidro escuro, os "88.88" apagados atrás e os dígitos acesos
    svg.append(
      el('rect', { class: 'bb-contorno bb-moldura', x: 101, y: 129, width: 124, height: 50, rx: 9 }),
      el('rect', { x: 106, y: 134, width: 114, height: 40, rx: 5, fill: `url(#${id}-visor)` }),
    );
    const digitos = el('g', { transform: 'translate(113 135.5) skewX(-6)' });
    const acesos = [];
    const xs = [0, 25, 56, 81];
    xs.forEach((x, i) => {
      const fundo = el('g', { class: 'bb-seg-apagado', transform: `translate(${x} 0)` });
      const luz = el('g', { class: 'bb-seg-aceso', transform: `translate(${x} 0)`, filter: `url(#${id}-brilho)` });
      const mapa = {};
      Object.entries(SEGMENTOS).forEach(([s, pts]) => {
        fundo.append(el('polygon', { points: pts }));
        const p = el('polygon', { points: pts });
        luz.append(p);
        mapa[s] = p;
      });
      digitos.append(fundo, luz);
      acesos[i] = mapa;
    });
    digitos.append(el('circle', { class: 'bb-ponto', cx: 50.5, cy: H - 2.6, r: 2.4, filter: `url(#${id}-brilho)` }));
    svg.append(digitos);
    svg.append(el('rect', { x: 106, y: 134, width: 114, height: 40, rx: 5, fill: `url(#${id}-vidro)`, class: 'bb-vidro' }));

    // o teclado: 12 teclas com a base que aparece embaixo (a tecla tem altura)
    svg.append(el('rect', { class: 'bb-contorno-fino bb-teclado', x: 109, y: 182, width: 108, height: 54, rx: 6 }));
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].forEach((c, i) => {
      const x = 113 + (i % 3) * 34.5;
      const y = 185 + Math.floor(i / 3) * 12.6;
      svg.append(el('g', {}, [
        el('rect', { class: 'bb-contorno-fino bb-tecla-base', x, y: y + 1.6, width: 31, height: 9.6, rx: 2.4 }),
        el('rect', { class: 'bb-contorno-fino', x, y, width: 31, height: 9.6, rx: 2.4, fill: `url(#${id}-tecla)` }),
        el('text', { class: 'bb-tecla-letra', x: x + 15.5, y: y + 5.1, 'font-size': 7 }, [document.createTextNode(c)]),
      ]));
    });

    let ultimo = '';
    function mostrar(ms) {
      const cent = Math.max(0, Math.min(9999, Math.ceil(Math.max(0, ms) / 10)));
      const txt = String(cent).padStart(4, '0');
      if (txt === ultimo) return;
      ultimo = txt;
      txt.split('').forEach((d, i) => {
        const on = ACESOS[Number(d)];
        Object.entries(acesos[i]).forEach(([s, p]) => p.classList.toggle('bb-on', on.includes(s)));
      });
    }
    function estado({ quase = false, fim = false } = {}) {
      svg.classList.toggle('bb--quase', quase);
      svg.classList.toggle('bb--fim', fim);
    }
    mostrar(0);
    return { svg, mostrar, estado };
  }

  return { criar };
})();

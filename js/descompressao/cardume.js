/*
 * Cardume (Sala de Descompressão) — corrida com cardume, em 3D falso no <canvas>.
 * - O Diver nada sozinho por um corredor de areia no fundo do mar; você só arrasta para os lados
 *   (dedo, mouse ou setas). Divers perdidos pelo caminho entram no cardume ao serem tocados.
 * - Portais de bolha em pares: turquesa soma ou multiplica (+7, x2, x3); coral tira (−4, ÷2). Escolha um lado.
 * - Perigos tiram gente do cardume: água-viva, ouriço que rola, coral giratório e pedra −N (absorve N e quebra).
 *   O líder sozinho só leva um esbarrão, e portal nunca baixa de 1: a partida só termina no chefão.
 * - No fim de cada fase, um chefão gigante. O cardume ataca sozinho: cada Diver que chega tira 1 de vida.
 *   Venceu? Baú da sorte e próxima fase (outro chefão, outra água). Acabou o cardume: fim de jogo.
 * - Cada fase dura uns 30 segundos (25 s de corrida + a briga com o chefão) e fica um pouco mais difícil.
 * - Pontos só do placar da sala: 50 × fase + sobreviventes + pérolas + baú. Vale o recorde.
 * Personagens "gelatina": desenhados uma vez em sprites (8 quadros), com squash & stretch na hora de desenhar.
 * Com "reduzir movimento": sem tremida de tela, sem câmera lenta e menos partículas.
 */
(() => {
  const { h, icone, plural } = UI;
  const reduzir = () => !!UI.movimentoReduzido;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const elastico = (t) => (t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
  const TAU = Math.PI * 2;
  const quadroDe = (ciclo) => Math.floor((((ciclo % 1) + 1) % 1) * 8) % 8;

  const MEIA = 3.5;        // meia largura da pista (unidades)
  const LIM = 3.15;        // até onde o líder vai
  const DPLAYER = 7;       // distância da câmera até o líder
  const VMAX = 140;        // seguidores desenhados (o número pode ser maior)
  const CORRIDA = 25;      // segundos de corrida por fase
  const ESP = 0.4;         // espaço entre os Divers na formação

  /* ---------- Águas e chefões ---------- */
  const TEMAS = [
    { nome: 'Raso', topo: '#8BE9F6', horiz: '#2FB8DA', fundo: '#1A7EA6', pista: ['#FBF1DC', '#F1E2C4'], borda: '#2DD4BF', lado: '#0F766E', raios: 0.12, luzes: false },
    { nome: 'Recife', topo: '#6FD6EA', horiz: '#2196C2', fundo: '#155F8C', pista: ['#FDEBE2', '#F8D9CB'], borda: '#FB7185', lado: '#BE123C', raios: 0.09, luzes: false },
    { nome: 'Caverna', topo: '#2F5F93', horiz: '#1C3D6E', fundo: '#0F2648', pista: ['#DCE7F7', '#C7D6EE'], borda: '#A78BFA', lado: '#6D28D9', raios: 0.04, luzes: true },
    { nome: 'Abismo', topo: '#10305A', horiz: '#0B2545', fundo: '#06172D', pista: ['#D3F7EF', '#B8ECE2'], borda: '#FACC15', lado: '#A16207', raios: 0, luzes: true },
  ];
  const CHEFES = [
    { tipo: 'baiacu', nome: 'Baiacu Bravo' },
    { tipo: 'polvo', nome: 'Polvo Rei' },
    { tipo: 'caranguejo', nome: 'Caranguejo de Ferro' },
    { tipo: 'tubarao', nome: 'Tubarão Martelão' },
  ];

  /* =========================================================
     SPRITES: Diver gelatina (costas, frente e líder), 8 quadros
     ========================================================= */
  const SW = 96;
  const SH = 124;
  const Q = 2;
  const CONTORNO = '#075E57';

  function novaTela(w, hh) {
    const c = document.createElement('canvas');
    c.width = w * Q;
    c.height = hh * Q;
    const g = c.getContext('2d');
    g.scale(Q, Q);
    return [c, g];
  }
  function gradCorpo(g, cx, cy, r) {
    const gr = g.createRadialGradient(cx - r * 0.42, cy - r * 0.5, r * 0.08, cx, cy, r * 1.25);
    gr.addColorStop(0, '#E6FFFA');
    gr.addColorStop(0.22, '#7CF0DC');
    gr.addColorStop(0.6, '#14B8A6');
    gr.addColorStop(1, '#0A7A70');
    return gr;
  }
  function brilho(g, x, y, rx, ry, rot, a) {
    g.save();
    g.globalAlpha = a;
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, TAU);
    g.fill();
    g.restore();
  }
  function retRed(g, x, y, w, hh, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + hh, r);
    g.arcTo(x + w, y + hh, x, y + hh, r);
    g.arcTo(x, y + hh, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function estrela(g, x, y, r, cor) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = cor;
    g.fill();
  }
  function nadadeira(g, x, y, ang) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    const gr = g.createLinearGradient(0, -4, 0, 14);
    gr.addColorStop(0, '#FEF3C7');
    gr.addColorStop(0.45, '#FACC15');
    gr.addColorStop(1, '#D9A40A');
    g.fillStyle = gr;
    g.strokeStyle = '#9A6A06';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-5, -3);
    g.quadraticCurveTo(-13, 8, -10, 14);
    g.quadraticCurveTo(0, 18, 10, 14);
    g.quadraticCurveTo(13, 8, 5, -3);
    g.closePath();
    g.fill();
    g.stroke();
    brilho(g, -4, 4, 2, 4, 0.3, 0.45);
    g.restore();
  }
  function perna(g, x, y0, y1) {
    g.lineCap = 'round';
    g.strokeStyle = CONTORNO;
    g.lineWidth = 11.5;
    g.beginPath();
    g.moveTo(x, y0);
    g.lineTo(x, y1);
    g.stroke();
    g.strokeStyle = '#1FC7B3';
    g.lineWidth = 8;
    g.stroke();
  }
  function braco(g, x, y, ang) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.fillStyle = gradCorpo(g, -2, 6, 12);
    g.strokeStyle = CONTORNO;
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(0, 9, 6.5, 11.5, 0, 0, TAU);
    g.fill();
    g.stroke();
    brilho(g, -2.5, 4, 1.8, 3.5, 0, 0.45);
    g.restore();
  }
  function snorkel(g, x0, y0, cx, cy, x1, y1, capa = '#FACC15') {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const tubo = () => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); };
    tubo();
    g.strokeStyle = '#9F1239';
    g.lineWidth = 10;
    g.stroke();
    tubo();
    g.strokeStyle = '#FB7185';
    g.lineWidth = 6.8;
    g.stroke();
    g.save();
    g.translate(-1.4, -0.6);
    tubo();
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1.8;
    g.stroke();
    g.restore();
    g.fillStyle = capa;
    g.strokeStyle = '#9A6A06';
    g.lineWidth = 1.8;
    g.beginPath();
    g.arc(x1, y1, 5, 0, TAU);
    g.fill();
    g.stroke();
    brilho(g, x1 - 1.5, y1 - 1.5, 1.6, 1.2, 0, 0.8);
  }
  function corpo(g, cx, by) {
    g.fillStyle = gradCorpo(g, cx, by - 34, 27);
    g.strokeStyle = CONTORNO;
    g.lineWidth = 2.6;
    g.beginPath();
    g.ellipse(cx, by - 33, 22, 23.5, 0, 0, TAU);
    g.fill();
    g.stroke();
  }
  function cabeca(g, cx, hy) {
    g.fillStyle = gradCorpo(g, cx, hy, 25);
    g.strokeStyle = CONTORNO;
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(cx, hy, 23.5, 0, TAU);
    g.fill();
    g.stroke();
  }

  /** Diver de costas (o cardume e o líder). f: 0..1 do ciclo de nado. */
  function diverCostas(g, f, lider) {
    const cx = SW / 2;
    const by = SH - 10;
    const k = Math.sin(f * TAU);
    nadadeira(g, cx - 11, by - 6, -0.12 + k * 0.38);
    nadadeira(g, cx + 11, by - 6, 0.12 - k * 0.38);
    perna(g, cx - 10, by - 22, by - 8 - k * 2.2);
    perna(g, cx + 10, by - 22, by - 8 + k * 2.2);
    braco(g, cx - 22, by - 43, 0.55 + k * 0.45);
    braco(g, cx + 22, by - 43, -0.55 + k * 0.45);
    corpo(g, cx, by);
    const hy = by - 65;
    cabeca(g, cx, hy);
    // tira da máscara, por trás da cabeça
    g.save();
    g.beginPath();
    g.arc(cx, hy, 23.5, 0, TAU);
    g.clip();
    const gs = g.createLinearGradient(0, hy - 4, 0, hy + 14);
    gs.addColorStop(0, '#FEF9C3');
    gs.addColorStop(0.45, '#FACC15');
    gs.addColorStop(1, '#C48A05');
    g.fillStyle = gs;
    g.beginPath();
    g.moveTo(cx - 30, hy - 3);
    g.quadraticCurveTo(cx, hy + 8, cx + 30, hy - 3);
    g.lineTo(cx + 30, hy + 7);
    g.quadraticCurveTo(cx, hy + 18, cx - 30, hy + 7);
    g.closePath();
    g.fill();
    g.fillStyle = '#A16207';
    retRed(g, cx - 5, hy + 5, 10, 7, 2.5);
    g.fill();
    g.restore();
    g.strokeStyle = CONTORNO;
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(cx, hy, 23.5, 0, TAU);
    g.stroke();
    snorkel(g, cx + 18, hy + 4, cx + 30, hy - 12, cx + 22, hy - 34, lider ? '#FDE047' : '#FACC15');
    brilho(g, cx - 9, hy - 12, 7.5, 4.2, -0.5, 0.8);
    brilho(g, cx - 15, hy - 3, 2.2, 2.2, 0, 0.6);
    brilho(g, cx - 10, by - 43, 5, 8, -0.3, 0.32);
    if (lider) {
      g.save();
      g.shadowColor = 'rgba(250, 204, 21, 0.9)';
      g.shadowBlur = 6;
      estrela(g, cx, by - 33, 8.5, '#FACC15');
      g.restore();
      estrela(g, cx - 1, by - 34, 3, '#FEF9C3');
    }
  }

  /** Diver de frente (os perdidos esperando no caminho): máscara, olhos e um tchauzinho. */
  function diverFrente(g, f) {
    const cx = SW / 2;
    const by = SH - 10;
    const k = Math.sin(f * TAU);
    nadadeira(g, cx - 11, by - 6, -0.25 + k * 0.12);
    nadadeira(g, cx + 11, by - 6, 0.25 - k * 0.12);
    perna(g, cx - 10, by - 22, by - 8);
    perna(g, cx + 10, by - 22, by - 8);
    braco(g, cx + 22, by - 43, -0.45 + k * 0.12);
    corpo(g, cx, by);
    // barriguinha mais clara
    brilho(g, cx, by - 28, 12, 13, 0, 0.18);
    braco(g, cx - 21, by - 49, 2.45 + k * 0.45); // acenando
    const hy = by - 65;
    cabeca(g, cx, hy);
    // máscara amarela com duas lentes
    const gm = g.createLinearGradient(0, hy - 13, 0, hy + 9);
    gm.addColorStop(0, '#FEF9C3');
    gm.addColorStop(0.5, '#FACC15');
    gm.addColorStop(1, '#CA8A04');
    g.fillStyle = gm;
    g.strokeStyle = '#8A5A04';
    g.lineWidth = 2;
    retRed(g, cx - 20, hy - 13, 40, 21, 10);
    g.fill();
    g.stroke();
    const piscando = f > 0.86 && f < 0.94;
    for (const lx of [-9.5, 9.5]) {
      const gl = g.createLinearGradient(0, hy - 9, 0, hy + 5);
      gl.addColorStop(0, '#F0F9FF');
      gl.addColorStop(1, '#93D8F8');
      g.fillStyle = gl;
      retRed(g, cx + lx - 7.5, hy - 9.5, 15, 14, 6);
      g.fill();
      g.fillStyle = '#0B2545';
      if (piscando) {
        g.fillRect(cx + lx - 3.5, hy - 1.5, 7, 2);
      } else {
        g.beginPath();
        g.ellipse(cx + lx, hy - 2, 3.4, 4.4, 0, 0, TAU);
        g.fill();
        brilho(g, cx + lx + 1.2, hy - 3.6, 1.3, 1.3, 0, 1);
      }
      brilho(g, cx + lx - 3.5, hy - 6, 2.2, 1.1, -0.5, 0.7);
    }
    // bochechas e bocal
    for (const bx of [-15, 15]) {
      g.fillStyle = 'rgba(251, 113, 133, 0.45)';
      g.beginPath();
      g.ellipse(cx + bx, hy + 10, 4, 2.6, 0, 0, TAU);
      g.fill();
    }
    snorkel(g, cx + 3, hy + 13, cx + 31, hy + 10, cx + 25, hy - 32);
    g.fillStyle = '#FB7185';
    g.strokeStyle = '#9F1239';
    g.lineWidth = 1.6;
    retRed(g, cx - 4, hy + 10, 9, 6, 3);
    g.fill();
    g.stroke();
    brilho(g, cx - 10, hy - 17, 6, 3, -0.4, 0.75);
  }

  let SPRITES = null;
  function sprites() {
    if (SPRITES) return SPRITES;
    const fazer = (fn, ...a) => Array.from({ length: 8 }, (_, i) => {
      const [c, g] = novaTela(SW, SH);
      fn(g, i / 8, ...a);
      return c;
    });
    SPRITES = { costas: fazer(diverCostas, false), lider: fazer(diverCostas, true), frente: fazer(diverFrente) };
    return SPRITES;
  }

  /* =========================================================
     FASES: geradas com semente; o chefão é calibrado pelo melhor caminho
     ========================================================= */
  const inteiro = (a, b, r) => a + Math.floor(r() * (b - a + 1));
  const aplicar = (op, c) => (op.t === '+' ? c + op.v : op.t === 'x' ? c * op.v : op.t === '-' ? c - op.v : Math.ceil(c / op.v));
  const rotuloOp = (op) => ({ '+': `+${op.v}`, x: `x${op.v}`, '-': `−${op.v}`, '÷': `÷${op.v}` }[op.t]);
  const bom = (op) => op.t === '+' || op.t === 'x';

  function gerarFase(n, r) {
    const v = Math.min(13.5, 9 + 0.45 * (n - 1));
    const comprimento = Math.round(v * CORRIDA);
    const eventos = [];
    const opBom = () => {
      const s = r();
      if (n >= 3 && s < 0.14) return { t: 'x', v: 3 };
      if (s < 0.42) return { t: 'x', v: 2 };
      return { t: '+', v: inteiro(4, 7 + 3 * n, r) };
    };
    const opRuim = () => (n >= 3 && r() < 0.3 ? { t: '÷', v: 2 } : { t: '-', v: inteiro(2, 4 + 2 * n, r) });
    let z = 14;
    let i = 0;
    while (z < comprimento - 20) {
      let tipo;
      if (i === 0) tipo = 'recrutas';
      else if (i === 1) tipo = 'portal';
      else {
        const pesos = { recrutas: 3, portal: 3, perigo: 2 + n * 0.45, perolas: 1.4, pedra: n >= 2 ? 1 + n * 0.3 : 0 };
        const total = Object.values(pesos).reduce((a, b) => a + b, 0);
        let s = r() * total;
        tipo = Object.keys(pesos).find((k) => (s -= pesos[k]) < 0) || 'portal';
        if (eventos.length && eventos[eventos.length - 1].tipo === tipo && tipo !== 'recrutas') tipo = 'recrutas';
      }
      if (tipo === 'recrutas') {
        const gx = (r() * 2 - 1) * 2.3;
        const qtd = inteiro(2, 4 + Math.min(4, n), r);
        const gente = Array.from({ length: qtd }, (_, j) => {
          const a = j * 2.39996 + r();
          const rr = 0.42 * Math.sqrt(j);
          return { x: clamp(gx + Math.cos(a) * rr, -3.1, 3.1), z: z + Math.sin(a) * rr * 0.8, fase: r(), junto: false };
        });
        eventos.push({ tipo, z, gente });
      } else if (tipo === 'portal') {
        const dilema = r() < 0.35;
        const a = opBom();
        let b = dilema ? opBom() : opRuim();
        if (dilema && b.t === a.t && b.v === a.v) b = { t: '+', v: a.v + inteiro(3, 8, r) };
        const ops = r() < 0.5 ? [a, b] : [b, a];
        eventos.push({ tipo, z, ops, feito: false });
      } else if (tipo === 'perigo') {
        const s = r();
        if (s < 0.38) {
          const qtd = n >= 3 && r() < 0.5 ? 2 : 1;
          const xs = qtd === 2 ? [-1.7, 1.7] : [(r() * 2 - 1) * 2.2];
          eventos.push({ tipo: 'agua', z, itens: xs.map((x) => ({ x, ph: r() * TAU })) });
        } else if (s < 0.7) {
          eventos.push({ tipo: 'ourico', z, x0: 0, amp: 2.6, w: 1.5 + 0.18 * n + r() * 0.5, ph: r() * TAU });
        } else {
          eventos.push({ tipo: 'coral', z, cx: [-1.4, 0, 1.4][inteiro(0, 2, r)], meio: 2.4, w: (1.3 + 0.15 * n) * (r() < 0.5 ? 1 : -1), ph: r() * TAU });
        }
      } else if (tipo === 'pedra') {
        const lado = inteiro(0, 2, r);
        const faixas = [[-MEIA, -0.2], [0.2, MEIA], [-1.6, 1.6]][lado];
        eventos.push({ tipo, z, x0: faixas[0], x1: faixas[1], n: 4 + 3 * n + inteiro(0, 4, r), quebrou: false });
      } else {
        const x = (r() * 2 - 1) * 2.4;
        const dx = (r() * 2 - 1) * 0.12;
        eventos.push({ tipo: 'perolas', z, itens: Array.from({ length: 6 }, (_, j) => ({ x: clamp(x + dx * j * 6, -3.1, 3.1), z: z + j * 1.5, pega: false, ph: j * 0.4 })) });
      }
      z += tipo === 'perolas' ? 15 : inteiro(10, 13, r);
      i++;
    }
    // melhor caminho (sem perder ninguém): o chefão pede uma parte dele
    let c = 1;
    for (const e of eventos) {
      if (e.tipo === 'recrutas') c += e.gente.length;
      if (e.tipo === 'portal') c = Math.max(aplicar(e.ops[0], c), aplicar(e.ops[1], c));
      c = Math.min(9999, c);
    }
    const fator = Math.min(0.62, 0.34 + 0.06 * (n - 1));
    const tema = TEMAS[(n - 1) % TEMAS.length];
    const chefe = CHEFES[(n - 1) % CHEFES.length];
    return { n, v, comprimento, eventos, melhor: c, hp: Math.max(5, Math.round(c * fator)), tema, chefe };
  }

  /* =========================================================
     Chefões (desenho em unidades do mundo; 1 unidade = s px)
     ========================================================= */
  function olho(g, x, y, r, olhar, bravo, lado) {
    g.fillStyle = '#FFFFFF';
    g.strokeStyle = '#1E293B';
    g.lineWidth = r * 0.16;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = '#0B2545';
    g.beginPath();
    g.arc(x + olhar * r * 0.25, y + r * 0.2, r * 0.48, 0, TAU);
    g.fill();
    brilho(g, x + olhar * r * 0.25 - r * 0.18, y, r * 0.16, r * 0.16, 0, 1);
    if (bravo) {
      g.strokeStyle = '#0B2545';
      g.lineWidth = r * 0.42;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - r * 1.05 * lado, y - r * 1.35);
      g.lineTo(x + r * 0.9 * lado, y - r * 0.85);
      g.stroke();
    }
  }
  function gradBola(g, x, y, r, cores) {
    const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.05, x, y, r * 1.2);
    cores.forEach((c, i) => gr.addColorStop(i / (cores.length - 1), c));
    return gr;
  }

  function desenharChefe(g, tipo, st) {
    const t = st.t;
    const at = st.ataque; // 0..1 golpe
    const inf = 1 + st.dano * 0.12;
    if (tipo === 'baiacu') {
      const r = 2.25 * inf * (1 + Math.sin(t * 2) * 0.03);
      const cy = -2.9 - Math.sin(t * 2) * 0.12 + at * 0.6;
      // espinhos
      g.fillStyle = '#92400E';
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU + t * 0.1;
        const b = 0.13;
        g.beginPath();
        g.moveTo(Math.cos(a - b) * r * 0.95, cy + Math.sin(a - b) * r * 0.95);
        g.lineTo(Math.cos(a) * r * 1.28, cy + Math.sin(a) * r * 1.28);
        g.lineTo(Math.cos(a + b) * r * 0.95, cy + Math.sin(a + b) * r * 0.95);
        g.fill();
      }
      for (const lado of [-1, 1]) {
        g.save();
        g.translate(lado * r * 0.95, cy + 0.2);
        g.rotate(lado * (0.4 + Math.sin(t * 9) * 0.35));
        g.fillStyle = gradBola(g, 0, 0, 0.8, ['#FEF3C7', '#FBBF24', '#D97706']);
        g.strokeStyle = '#92400E';
        g.lineWidth = 0.07;
        g.beginPath();
        g.ellipse(lado * 0.45, 0, 0.7, 0.35, 0, 0, TAU);
        g.fill();
        g.stroke();
        g.restore();
      }
      g.fillStyle = gradBola(g, 0, cy, r, ['#FFFBEB', '#FDE047', '#F59E0B', '#B45309']);
      g.strokeStyle = '#7C2D12';
      g.lineWidth = 0.09;
      g.beginPath();
      g.arc(0, cy, r, 0, TAU);
      g.fill();
      g.stroke();
      brilho(g, 0, cy + r * 0.45, r * 0.62, r * 0.38, 0, 0.35);
      for (const [px, py] of [[-1.2, -0.7], [1.0, -1.1], [-0.4, -1.5], [1.4, 0.2]]) {
        g.fillStyle = 'rgba(146, 64, 14, 0.35)';
        g.beginPath();
        g.arc(px * r / 2.25, cy + py * r / 2.25, 0.18, 0, TAU);
        g.fill();
      }
      olho(g, -0.75, cy - 0.45, 0.48, Math.sin(t), true, -1);
      olho(g, 0.75, cy - 0.45, 0.48, Math.sin(t), true, 1);
      g.fillStyle = '#9F1239';
      g.beginPath();
      g.ellipse(0, cy + 0.65, 0.32 + at * 0.2, 0.22 + at * 0.25, 0, 0, TAU);
      g.fill();
      brilho(g, -r * 0.42, cy - r * 0.5, r * 0.3, r * 0.17, -0.6, 0.85);
    } else if (tipo === 'polvo') {
      const cy = -3.6 + Math.sin(t * 2) * 0.1;
      // tentáculos
      for (let i = 0; i < 6; i++) {
        const base = -1.35 + i * 0.54;
        const frente = i === 2 || i === 3;
        const ondula = Math.sin(t * 3 + i) * 0.35;
        const ergue = frente ? at * 1.8 : 0;
        const pts = [[base, cy + 1.3], [base * 1.5 + ondula, cy + 2.6 - ergue], [base * 2.2 - ondula, 0 - ergue * 1.3]];
        g.lineCap = 'round';
        g.strokeStyle = '#9F1239';
        g.lineWidth = 0.62;
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
        g.stroke();
        g.strokeStyle = '#FB7185';
        g.lineWidth = 0.46;
        g.stroke();
        g.fillStyle = '#FFE4E6';
        for (let k = 1; k <= 3; k++) {
          const u = k / 4;
          const x = (1 - u) * (1 - u) * pts[0][0] + 2 * (1 - u) * u * pts[1][0] + u * u * pts[2][0];
          const y = (1 - u) * (1 - u) * pts[0][1] + 2 * (1 - u) * u * pts[1][1] + u * u * pts[2][1];
          g.beginPath();
          g.arc(x, y, 0.09, 0, TAU);
          g.fill();
        }
      }
      const rx = 2.15 * inf;
      const ry = 2.05 * inf;
      g.fillStyle = gradBola(g, 0, cy, rx, ['#FFF1F2', '#FDA4AF', '#F43F5E', '#9F1239']);
      g.strokeStyle = '#881337';
      g.lineWidth = 0.09;
      g.beginPath();
      g.ellipse(0, cy, rx, ry, 0, 0, TAU);
      g.fill();
      g.stroke();
      for (const [px, py, pr] of [[-1.1, -1.0, 0.24], [0.9, -1.3, 0.18], [1.35, -0.2, 0.2], [-1.5, 0.1, 0.14]]) {
        g.fillStyle = 'rgba(255, 228, 230, 0.5)';
        g.beginPath();
        g.arc(px, cy + py, pr, 0, TAU);
        g.fill();
      }
      olho(g, -0.72, cy + 0.15, 0.5, Math.sin(t * 0.8), true, -1);
      olho(g, 0.72, cy + 0.15, 0.5, Math.sin(t * 0.8), true, 1);
      // coroa
      g.fillStyle = gradBola(g, 0, cy - ry - 0.3, 0.9, ['#FEF9C3', '#FACC15', '#B45309']);
      g.strokeStyle = '#854D0E';
      g.lineWidth = 0.06;
      g.beginPath();
      g.moveTo(-0.8, cy - ry + 0.25);
      g.lineTo(-0.85, cy - ry - 0.55);
      g.lineTo(-0.4, cy - ry - 0.2);
      g.lineTo(0, cy - ry - 0.75);
      g.lineTo(0.4, cy - ry - 0.2);
      g.lineTo(0.85, cy - ry - 0.55);
      g.lineTo(0.8, cy - ry + 0.25);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#2DD4BF';
      g.beginPath();
      g.arc(0, cy - ry - 0.2, 0.13, 0, TAU);
      g.fill();
      brilho(g, -rx * 0.42, cy - ry * 0.55, rx * 0.28, ry * 0.15, -0.5, 0.85);
    } else if (tipo === 'caranguejo') {
      const cy = -2.0 + Math.sin(t * 3) * 0.06;
      g.strokeStyle = '#3B0764';
      g.lineCap = 'round';
      g.lineWidth = 0.22;
      for (const lado of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const mex = Math.sin(t * 6 + i * 1.3) * 0.15;
          g.beginPath();
          g.moveTo(lado * 1.6, cy + 0.3 + i * 0.25);
          g.lineTo(lado * (2.5 + i * 0.25), cy - 0.3 + i * 0.3 + mex);
          g.lineTo(lado * (2.9 + i * 0.3), 0);
          g.stroke();
        }
      }
      // olhos nas antenas
      for (const lado of [-1, 1]) {
        g.strokeStyle = '#4C1D95';
        g.lineWidth = 0.16;
        g.beginPath();
        g.moveTo(lado * 0.55, cy - 1.0);
        g.lineTo(lado * 0.75, cy - 1.95);
        g.stroke();
        olho(g, lado * 0.75, cy - 2.05, 0.38, Math.sin(t), true, lado);
      }
      const rx = 2.35 * inf;
      g.fillStyle = gradBola(g, 0, cy, rx, ['#F5F3FF', '#C4B5FD', '#7C3AED', '#3B0764']);
      g.strokeStyle = '#2E1065';
      g.lineWidth = 0.09;
      g.beginPath();
      g.ellipse(0, cy, rx, 1.35 * inf, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = '#E9D5FF';
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.arc(i * 0.55, cy + 0.85 - Math.abs(i) * 0.08, 0.07, 0, TAU);
        g.fill();
      }
      g.strokeStyle = '#2E1065';
      g.lineWidth = 0.1;
      g.beginPath();
      g.arc(0, cy + 0.3, 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
      brilho(g, -0.9, cy - 0.65, 0.7, 0.25, -0.2, 0.75);
      // garras
      for (const lado of [-1, 1]) {
        const ab = 0.25 + (Math.sin(t * 5 + lado) * 0.5 + 0.5) * 0.35;
        const gx = lado * 2.75;
        const gy = cy - 1.6 + at * 1.7;
        g.strokeStyle = '#4C1D95';
        g.lineWidth = 0.32;
        g.beginPath();
        g.moveTo(lado * 1.9, cy - 0.2);
        g.quadraticCurveTo(lado * 2.9, cy - 0.3, gx, gy + 0.6);
        g.stroke();
        g.save();
        g.translate(gx, gy);
        for (const s of [-1, 1]) {
          g.save();
          g.rotate(s * ab * lado);
          g.fillStyle = gradBola(g, 0, -0.5, 0.9, ['#EDE9FE', '#A78BFA', '#5B21B6']);
          g.strokeStyle = '#2E1065';
          g.lineWidth = 0.07;
          g.beginPath();
          g.ellipse(s * 0.28, -0.55, 0.36, 0.78, s * 0.25, 0, TAU);
          g.fill();
          g.stroke();
          g.restore();
        }
        g.restore();
      }
    } else {
      // tubarão-martelo
      const cy = -2.6 + Math.sin(t * 2.2) * 0.1;
      const lunge = 1 + at * 0.12;
      g.save();
      g.scale(lunge, lunge);
      for (const lado of [-1, 1]) {
        g.save();
        g.translate(lado * 1.45, cy + 0.6);
        g.rotate(lado * (0.9 + Math.sin(t * 4) * 0.15));
        g.fillStyle = gradBola(g, 0, 0, 1, ['#E2E8F0', '#94A3B8', '#475569']);
        g.strokeStyle = '#1E293B';
        g.lineWidth = 0.07;
        g.beginPath();
        g.ellipse(0, 0.6, 0.38, 0.95, 0, 0, TAU);
        g.fill();
        g.stroke();
        g.restore();
      }
      g.fillStyle = gradBola(g, 0, cy, 2, ['#F1F5F9', '#A5B4C8', '#5B6B82', '#273449']);
      g.strokeStyle = '#1E293B';
      g.lineWidth = 0.09;
      g.beginPath();
      g.ellipse(0, cy, 1.55 * inf, 2.2 * inf, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(248, 250, 252, 0.85)';
      g.beginPath();
      g.ellipse(0, cy + 0.6, 1.0, 1.35, 0, 0, TAU);
      g.fill();
      // martelo
      const hy = cy - 2.0;
      g.fillStyle = gradBola(g, 0, hy, 2.5, ['#F8FAFC', '#A5B4C8', '#475569']);
      g.strokeStyle = '#1E293B';
      g.lineWidth = 0.09;
      retRed(g, -2.6, hy - 0.55, 5.2, 1.1, 0.55);
      g.fill();
      g.stroke();
      olho(g, -2.15, hy - 0.05, 0.36, Math.sin(t), true, -1);
      olho(g, 2.15, hy - 0.05, 0.36, Math.sin(t), true, 1);
      brilho(g, -1.1, hy - 0.3, 0.9, 0.16, 0, 0.8);
      // boca com dentes
      const ab = 0.25 + at * 0.45;
      g.fillStyle = '#7F1D1D';
      g.beginPath();
      g.ellipse(0, cy - 0.3, 0.95, ab, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#FFFFFF';
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(i * 0.25 - 0.11, cy - 0.3 - ab * 0.85);
        g.lineTo(i * 0.25, cy - 0.3 - ab * 0.85 + 0.22);
        g.lineTo(i * 0.25 + 0.11, cy - 0.3 - ab * 0.85);
        g.fill();
      }
      brilho(g, -0.6, cy - 1.2, 0.4, 0.8, -0.2, 0.4);
      g.restore();
    }
  }

  /* =========================================================
     Som (sintetizado na hora; dá para desligar)
     ========================================================= */
  function criarSom(ligado) {
    let ac = null;
    const ultimo = {};
    const som = {
      ligado,
      iniciar() {
        try {
          ac = ac || new (window.AudioContext || window.webkitAudioContext)();
          if (ac.state === 'suspended') ac.resume();
        } catch (e) { ac = null; }
      },
      tom(freq, dur, tipo = 'sine', vol = 0.1, desliza = 1, atraso = 0, chave = null, minimo = 0) {
        if (!som.ligado || !ac) return;
        const agora = ac.currentTime;
        if (chave) {
          if (ultimo[chave] && agora - ultimo[chave] < minimo) return;
          ultimo[chave] = agora;
        }
        try {
          const t = agora + atraso;
          const o = ac.createOscillator();
          const v = ac.createGain();
          o.type = tipo;
          o.frequency.setValueAtTime(freq, t);
          if (desliza !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * desliza), t + dur);
          v.gain.setValueAtTime(0.0001, t);
          v.gain.exponentialRampToValueAtTime(vol, t + 0.012);
          v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(v).connect(ac.destination);
          o.start(t);
          o.stop(t + dur + 0.03);
        } catch (e) { /* sem som, sem problema */ }
      },
      fechar() { try { if (ac) ac.close(); } catch (e) { /* nada */ } ac = null; },
    };
    return som;
  }
  const vibrar = (ms) => { try { if (!reduzir() && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } };

  /* =========================================================
     O jogo
     ========================================================= */
  Descompressao.registrar({
    id: 'cardume',
    nome: 'Cardume',
    curto: 'Cardume',
    icone: 'i-onda',
    duracao: '30 s por fase',
    diario: false,
    descricao: 'Arraste para os lados, junte Divers perdidos, escolha os portais certos e chegue no chefão com o maior cardume possível.',
    abrir(ctx) {
      const SPR = sprites();
      const salvo = ctx.estado() || {};
      const som = criarSom(salvo.som !== false);
      let P = null; // partida
      let quadro = 0;
      let ultimoT = 0;
      let limpar = [];

      /* ---------- Tela ---------- */
      const faseEl = h('span', { class: 'sd-car__fase', id: 'sd-car-fase' });
      const barra = h('span');
      const pontosEl = h('span', { class: 'sd-car__pontos', id: 'sd-car-pontos' }, icone('i-perola'), h('span', { text: '0' }));
      const botaoSom = h('button', { type: 'button', class: 'sd-car__som', 'aria-pressed': String(som.ligado), 'aria-label': 'Som', onclick: alternarSom });
      const hud = h('div', { class: 'sd-car__hud' }, faseEl, h('span', { class: 'sd-car__barra', 'aria-hidden': 'true' }, barra), pontosEl, botaoSom);
      const aviso = h('p', { class: 'visualmente-oculto', 'aria-live': 'polite' });
      const tela = h('canvas', { class: 'sd-car__canvas', id: 'sd-car-canvas', tabindex: '0', 'aria-label': 'Cardume: arraste para os lados ou use as setas para guiar o Diver' });
      const abertura = h('div', { class: 'sd-car__abertura' });
      const palco = h('div', { class: 'sd-car__palco' }, tela, hud, abertura);
      ctx.container.replaceChildren(h('div', { class: 'sd-car' }, palco, aviso));
      const g = tela.getContext('2d');
      let L = 360;
      let A = 640;
      let F = 360;
      let HOR = 190;
      let CAMH = 5;

      function desenharBotaoSom() {
        botaoSom.setAttribute('aria-pressed', String(som.ligado));
        botaoSom.replaceChildren(h('span', { 'aria-hidden': 'true', text: som.ligado ? '🔊' : '🔇' }), h('span', { class: 'visualmente-oculto', text: som.ligado ? 'Desligar o som' : 'Ligar o som' }));
      }
      function alternarSom() {
        som.ligado = !som.ligado;
        if (som.ligado) som.iniciar();
        ctx.gravar({ som: som.ligado });
        desenharBotaoSom();
      }
      desenharBotaoSom();

      function medir() {
        const largura = Math.max(280, palco.clientWidth || 360);
        const topo = palco.getBoundingClientRect().top || 120;
        const altura = Math.round(clamp(window.innerHeight - topo - 16, 420, Math.min(900, largura * 2)));
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        tela.width = Math.round(largura * dpr);
        tela.height = Math.round(altura * dpr);
        tela.style.height = `${altura}px`;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        L = largura;
        A = altura;
        HOR = A * 0.27;
        F = Math.min(L * 0.94, A * 0.95);
        CAMH = clamp(((A * 0.8 - HOR) * DPLAYER) / F, 2.4, 7.5);
        if (!P || P.estado === 'abertura') desenharParado();
      }

      /* ---------- Câmera ---------- */
      let camZ = 0;
      let camX = 0;
      function proj(x, y, z) {
        const d = z - camZ;
        if (!(d >= 0.35) || !Number.isFinite(x) || !Number.isFinite(camX)) return null;
        const s = F / d;
        return { x: L / 2 + (x - camX) * s, y: HOR + (CAMH - y) * s, s, d };
      }
      const nevoa = (d) => clamp((d - 26) / 44, 0, 0.88);
      function misturar(c1, c2, t) {
        const a = parseInt(c1.slice(1), 16);
        const b = parseInt(c2.slice(1), 16);
        const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
        const gg = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
        const bb = Math.round((a & 255) * (1 - t) + (b & 255) * t);
        return `rgb(${r},${gg},${bb})`;
      }

      /* ---------- Partida ---------- */
      function novaPartida() {
        P = { estado: 'correndo', n: 0, total: 0, t: 0, particulas: [], textos: [], tremor: 0, lento: 0, recorde: ctx.recorde() };
        proximaFase();
      }

      function proximaFase() {
        P.n += 1;
        const fase = gerarFase(P.n, ctx.aleatorio(`cardume-${Date.now()}-${P.n}`));
        Object.assign(P, {
          fase, estado: 'correndo', z: 0, x: 0, alvoX: 0, vx: 0, count: 1, membros: [], perolas: 0,
          invul: 0, contaPulso: 0, combo: 0, comboT: 0, chefe: null, liberar: 0, fimT: 0, sobreviventes: 0,
          bolhasFundo: P.bolhasFundo || Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, v: 0.02 + Math.random() * 0.05 })),
        });
        faseEl.textContent = `Fase ${P.n} · ${fase.tema.nome}`;
        aviso.textContent = `Fase ${P.n}. Chefão: ${fase.chefe.nome}, com ${fase.hp} de vida.`;
        atualizarPontos();
        abertura.hidden = true;
        tela.focus({ preventScroll: true });
      }

      function atualizarPontos() {
        pontosEl.lastChild.textContent = String(P ? P.total + (P.perolas || 0) : 0);
      }

      /* ---------- Cardume ---------- */
      function alvo(i, k) {
        const a = (i + 1) * 2.39996;
        const r = ESP * Math.sqrt(i + 1);
        return [Math.cos(a) * r * k.x, Math.sin(a) * r * 0.82 * k.z];
      }
      function compressao() {
        const n = P.membros.length;
        const raio = ESP * Math.sqrt(n + 1);
        return { x: Math.min(1, 2.7 / Math.max(0.01, raio)), z: Math.min(1, 3.4 / Math.max(0.01, raio)) };
      }
      function novoMembro(x, dz) {
        if (P.membros.length >= VMAX) return;
        P.membros.push({ x, dz, pop: 0, fase: Math.random(), vel: 0.9 + Math.random() * 0.3, carga: false });
      }
      function sincronizar(x0, dz0) {
        const quer = Math.min(VMAX, Math.max(0, P.count - 1));
        while (P.membros.length < quer) novoMembro(x0 + (Math.random() - 0.5) * 1.2, dz0 + Math.random() * 0.8);
        while (P.membros.length > quer) {
          const i = Math.floor(Math.random() * P.membros.length);
          const m = P.membros[i];
          poof(m.x, P.z + m.dz, '#FB7185');
          P.membros.splice(i, 1);
        }
      }
      function ganhar(qtd, x, dz) {
        P.count = Math.min(9999, P.count + qtd);
        P.contaPulso = 1;
        sincronizar(x, dz);
      }
      function matarMembro(i, cor = '#FB7185') {
        const m = P.membros[i];
        poof(m.x, P.z + m.dz, cor);
        P.count -= 1;
        if (P.count - 1 < P.membros.length) P.membros.splice(i, 1);
        P.contaPulso = 1;
        if (!reduzir()) P.tremor = Math.max(P.tremor, 0.12);
        som.tom(220, 0.14, 'triangle', 0.08, 0.5, 0, 'morte', 0.05);
        vibrar(6);
      }
      function atingirLider() {
        if (P.invul > 0) return;
        P.invul = 0.45;
        if (P.count > 1) {
          let perto = 0;
          let melhor = 99;
          P.membros.forEach((m, i) => { const d = Math.abs(m.x - P.x) + Math.abs(m.dz); if (d < melhor) { melhor = d; perto = i; } });
          if (P.membros.length) matarMembro(perto);
          else { P.count -= 1; P.contaPulso = 1; }
        } else {
          // sozinho, o líder só leva um esbarrão: a partida termina no chefão, nunca no meio do caminho
          P.invul = 0.9;
          poof(P.x, P.z, '#FB7185', 1.4);
          if (!reduzir()) P.tremor = 0.2;
          som.tom(260, 0.18, 'triangle', 0.08, 0.6, 0, 'esbarrao', 0.2);
          vibrar(15);
        }
      }

      /* ---------- Partículas e textos ---------- */
      function poof(x, z, cor, forca = 1) {
        const p = proj(x, 0.5, z);
        if (!p) return;
        const qtd = Math.round((reduzir() ? 4 : 10) * forca);
        for (let i = 0; i < qtd; i++) {
          const a = Math.random() * TAU;
          const v = (40 + Math.random() * 90) * forca;
          P.particulas.push({ tipo: 'bolha', x: p.x, y: p.y - p.s * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, r: (2 + Math.random() * 4) * (p.s / 50), vida: 0.6 + Math.random() * 0.3, t: 0, cor });
        }
        P.particulas.push({ tipo: 'anel', x: p.x, y: p.y - p.s * 0.2, r: p.s * 0.2, vida: 0.35, t: 0, cor });
      }
      function faiscas(sx, sy, cor = '#FACC15', qtd = 8, escala = 1) {
        const n = reduzir() ? Math.ceil(qtd / 3) : qtd;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU;
          const v = 60 + Math.random() * 160;
          P.particulas.push({ tipo: 'estrela', x: sx, y: sy, vx: Math.cos(a) * v * escala, vy: Math.sin(a) * v * escala - 40, r: (3 + Math.random() * 4) * escala, vida: 0.55 + Math.random() * 0.35, t: 0, cor, giro: Math.random() * TAU });
        }
      }
      function confete(qtd) {
        const cores = ['#14B8A6', '#5EEAD4', '#FACC15', '#FB7185', '#E6F1FF', '#A78BFA'];
        for (let i = 0; i < (reduzir() ? 0 : qtd); i++) {
          P.particulas.push({ tipo: 'confete', x: Math.random() * L, y: -10 - Math.random() * A * 0.4, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120, r: 4 + Math.random() * 4, vida: 2.8, t: 0, cor: cores[i % cores.length], giro: Math.random() * TAU });
        }
      }
      function texto(sx, sy, txt, cor, tam = 34) {
        P.textos.push({ x: sx, y: sy, txt, cor, tam, t: 0, vida: 1.0 });
      }

      /* ---------- Atualizar ---------- */
      function passo(dtReal) {
        const dt = dtReal * (P.lento > 0 ? 0.35 : 1);
        P.lento = Math.max(0, P.lento - dtReal);
        P.t += dt;
        P.tremor = Math.max(0, P.tremor - dtReal);
        P.contaPulso = Math.max(0, P.contaPulso - dtReal * 3);
        P.invul = Math.max(0, P.invul - dt);
        P.comboT = Math.max(0, P.comboT - dt);
        if (!P.comboT) P.combo = 0;
        for (const b of P.bolhasFundo) { b.y -= b.v * dt; if (b.y < -0.05) { b.y = 1.05; b.x = Math.random(); } }
        if (P.estado === 'correndo') correr(dt);
        else if (P.estado === 'chefe') brigar(dt);
        else if (P.estado === 'vitoria') comemorar(dt);
        moverMembros(dt);
        camZ = P.z - DPLAYER;
        camX += (P.x * 0.28 - camX) * Math.min(1, dt * 4);
        for (const p of P.particulas) {
          p.t += dtReal;
          if (p.vx !== undefined) { p.x += p.vx * dtReal; p.y += p.vy * dtReal; }
          if (p.tipo === 'bolha') { p.vx *= 0.94; p.vy = p.vy * 0.94 - 30 * dtReal; }
          if (p.tipo === 'estrela') { p.vx *= 0.92; p.vy = p.vy * 0.92 + 140 * dtReal; p.giro += dtReal * 6; }
          if (p.tipo === 'confete') { p.giro += dtReal * 5; p.x += Math.sin(p.t * 4 + p.giro) * 0.6; }
        }
        P.particulas = P.particulas.filter((p) => p.t < p.vida);
        for (const t of P.textos) t.t += dtReal;
        P.textos = P.textos.filter((t) => t.t < t.vida);
      }

      function correr(dt) {
        const f = P.fase;
        P.z += f.v * dt;
        if (teclas.esq) P.alvoX -= 7.5 * dt;
        if (teclas.dir) P.alvoX += 7.5 * dt;
        P.alvoX = clamp(P.alvoX, -LIM, LIM);
        const antes = P.x;
        P.x += (P.alvoX - P.x) * Math.min(1, dt * 13);
        P.vx = (P.x - antes) / Math.max(dt, 0.001);
        barra.style.width = `${clamp(P.z / f.comprimento, 0, 1) * 100}%`;
        const corpos = () => [{ x: P.x, z: P.z, lider: true }, ...P.membros.map((m, i) => ({ x: m.x, z: P.z + m.dz, i }))];
        for (const e of f.eventos) {
          if (e.z > P.z + 9 || e.z < P.z - 6) continue;
          if (e.tipo === 'recrutas') {
            const cs = corpos();
            for (const r of e.gente) {
              if (r.junto) continue;
              if (cs.some((c) => Math.abs(c.x - r.x) < 0.62 && Math.abs(c.z - r.z) < 0.65)) {
                r.junto = true;
                P.combo += 1;
                P.comboT = 0.5;
                P.count = Math.min(9999, P.count + 1);
                P.contaPulso = 1;
                novoMembro(r.x, r.z - P.z);
                const p = proj(r.x, 1.0, r.z);
                if (p) faiscas(p.x, p.y, '#5EEAD4', 5, 0.7);
                som.tom(500 + Math.min(14, P.combo) * 45, 0.09, 'sine', 0.09, 1.5, 0, 'pop', 0.03);
                vibrar(4);
              }
            }
          } else if (e.tipo === 'portal' && !e.feito && P.z >= e.z) {
            e.feito = true;
            const lado = P.x < 0 ? 0 : 1;
            e.escolha = lado;
            const op = e.ops[lado];
            const antes2 = P.count;
            const depois = clamp(aplicar(op, P.count), 1, 9999); // portal nunca leva o líder
            const meio = lado === 0 ? -MEIA / 2 : MEIA / 2;
            const p = proj(meio, 1.4, e.z);
            if (p) {
              for (let i = 0; i < (reduzir() ? 8 : 26); i++) {
                P.particulas.push({ tipo: 'bolha', x: p.x + (Math.random() - 0.5) * p.s * 3, y: p.y + (Math.random() - 0.5) * p.s * 1.6, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 120, r: 2 + Math.random() * 5, vida: 0.8, t: 0, cor: bom(op) ? '#5EEAD4' : '#FB7185' });
              }
            }
            const lp = proj(P.x, 2.2, P.z);
            if (lp) texto(lp.x, lp.y - 30, rotuloOp(op), bom(op) ? '#FACC15' : '#FB7185', 44);
            if (depois > antes2) {
              P.count = depois;
              P.contaPulso = 1;
              sincronizar(meio * 0.6, 1.2);
              som.tom(523, 0.12, 'sine', 0.09);
              som.tom(659, 0.12, 'sine', 0.09, 1, 0.07);
              som.tom(784, 0.18, 'sine', 0.1, 1, 0.14);
              vibrar(12);
            } else {
              P.count = depois;
              P.contaPulso = 1;
              sincronizar(P.x, 0);
              if (!reduzir()) P.tremor = 0.25;
              som.tom(200, 0.3, 'triangle', 0.12, 0.45);
              vibrar(25);
            }
            aviso.textContent = `Portal ${rotuloOp(op)}: cardume com ${P.count}.`;
          } else if (e.tipo === 'agua' || e.tipo === 'ourico' || e.tipo === 'coral') {
            colidirPerigo(e);
            if (P.estado !== 'correndo') return;
          } else if (e.tipo === 'pedra' && !e.quebrou) {
            const naPedra = (x, z) => x > e.x0 - 0.2 && x < e.x1 + 0.2 && z > e.z - 0.35 && z < e.z + 0.9;
            for (let i = P.membros.length - 1; i >= 0 && e.n > 0; i--) {
              const m = P.membros[i];
              if (naPedra(m.x, P.z + m.dz)) { matarMembro(i, '#F97316'); e.n -= 1; e.bate = 0.15; }
            }
            if (e.n > 0 && naPedra(P.x, P.z) && P.invul <= 0) { atingirLider(); e.n -= 1; e.bate = 0.15; }
            if (P.estado !== 'correndo') return;
            if (e.n <= 0) {
              e.quebrou = true;
              const p = proj((e.x0 + e.x1) / 2, 0.6, e.z);
              if (p) faiscas(p.x, p.y, '#F97316', 16, 1.2);
              som.tom(120, 0.25, 'square', 0.06, 0.6);
            }
          } else if (e.tipo === 'perolas') {
            const cs = corpos();
            for (const pe of e.itens) {
              if (pe.pega) continue;
              if (cs.some((c) => Math.abs(c.x - pe.x) < 0.6 && Math.abs(c.z - pe.z) < 0.6)) {
                pe.pega = true;
                P.perolas += 1;
                const p = proj(pe.x, 0.6, pe.z);
                if (p) faiscas(p.x, p.y, '#FEF9C3', 6, 0.6);
                som.tom(1100 + (P.perolas % 6) * 90, 0.07, 'sine', 0.05, 1.3, 0, 'perola', 0.04);
                atualizarPontos();
              }
            }
          }
        }
        if (P.count <= 0) { perder(); return; }
        if (P.z >= f.comprimento) iniciarChefe();
      }

      function colidirPerigo(e) {
        const pontos = [];
        if (e.tipo === 'agua') e.itens.forEach((a) => pontos.push({ x: a.x, z: e.z, r: 0.62 }));
        if (e.tipo === 'ourico') pontos.push({ x: e.x0 + Math.sin(P.t * e.w + e.ph) * e.amp, z: e.z, r: 0.62 });
        const segmento = e.tipo === 'coral' ? (() => {
          const a = P.t * e.w + e.ph;
          return [e.cx + Math.cos(a) * e.meio, e.z + Math.sin(a) * e.meio * 0.6, e.cx - Math.cos(a) * e.meio, e.z - Math.sin(a) * e.meio * 0.6];
        })() : null;
        const toca = (x, z) => {
          if (pontos.some((p) => Math.hypot(x - p.x, (z - p.z) * 1.2) < p.r)) return true;
          if (segmento) {
            const [x1, z1, x2, z2] = segmento;
            const vx = x2 - x1;
            const vz = z2 - z1;
            const u = clamp(((x - x1) * vx + (z - z1) * vz) / (vx * vx + vz * vz), 0, 1);
            return Math.hypot(x - (x1 + vx * u), z - (z1 + vz * u)) < 0.38;
          }
          return false;
        };
        for (let i = P.membros.length - 1; i >= 0; i--) {
          const m = P.membros[i];
          if (toca(m.x, P.z + m.dz)) matarMembro(i, e.tipo === 'agua' ? '#F0ABFC' : '#FB7185');
        }
        if (toca(P.x, P.z)) atingirLider();
      }

      function moverMembros(dt) {
        const k = compressao();
        const vivo = P.estado === 'correndo' || P.estado === 'chefe';
        P.membros.forEach((m, i) => {
          m.pop = Math.min(1, m.pop + dt * 2.6);
          if (m.carga) return;
          const [dx, dz] = alvo(i, k);
          const tx = clamp(P.x + dx, -3.3, 3.3);
          const suave = Math.min(1, dt * (vivo ? 7 : 3));
          m.x += (tx - m.x) * suave;
          m.dz += (dz - m.dz) * suave;
        });
      }

      /* ---------- Chefão ---------- */
      function iniciarChefe() {
        const f = P.fase;
        P.estado = 'chefe';
        P.chefe = { hp: f.hp, max: f.hp, z: f.comprimento + 15, t: 0, dano: 0, ataque: 0, proxAtaque: 1.6, morto: 0, mostra: f.hp };
        P.liberar = 0;
        barra.style.width = '100%';
        aviso.textContent = `${f.chefe.nome}! Seu cardume tem ${P.count}, ele tem ${f.hp} de vida.`;
        som.tom(110, 0.5, 'sawtooth', 0.05, 0.7);
      }

      function brigar(dt) {
        const c = P.chefe;
        c.t += dt;
        c.dano = Math.max(0, c.dano - dt * 5);
        c.ataque = Math.max(0, c.ataque - dt * 2.4);
        c.mostra += (c.hp - c.mostra) * Math.min(1, dt * 10);
        const parada = c.z - 8;
        if (P.z < parada) {
          P.z = Math.min(parada, P.z + P.fase.v * 0.6 * dt);
          P.x += (0 - P.x) * Math.min(1, dt * 2);
          return;
        }
        // solta o cardume em ondas
        const ritmo = clamp(P.count / 2.5, 14, 70);
        P.liberar += ritmo * dt;
        const fila = P.membros.filter((m) => !m.carga).sort((a, b) => b.dz - a.dz);
        while (P.liberar >= 1 && fila.length) {
          P.liberar -= 1;
          const m = fila.shift();
          m.carga = true;
          m.alvoX = (Math.random() - 0.5) * 3.2;
          m.vz = 9 + Math.random() * 4;
        }
        // força de cada Diver desenhado (o cardume pode ter mais gente do que desenhamos)
        const visiveis = P.membros.length + 1;
        const golpe = Math.max(1, Math.round(P.count / visiveis));
        for (let i = P.membros.length - 1; i >= 0; i--) {
          const m = P.membros[i];
          if (!m.carga) continue;
          m.dz += m.vz * dt;
          m.x += (m.alvoX - m.x) * Math.min(1, dt * 3);
          if (P.z + m.dz >= c.z - 1.6) {
            const p = proj(m.x, 1.4 + Math.random() * 2.5, c.z - 1.2);
            if (p) faiscas(p.x, p.y, '#FACC15', 4, 0.8);
            const tira = Math.min(golpe, P.count - 1, c.hp);
            c.hp -= Math.max(1, tira);
            P.count -= Math.max(1, tira);
            P.membros.splice(i, 1);
            c.dano = 1;
            som.tom(160 + Math.random() * 60, 0.05, 'square', 0.035, 0.7, 0, 'golpe', 0.035);
            if (c.hp <= 0) { vencer(); return; }
          }
        }
        // o chefão revida
        c.proxAtaque -= dt;
        if (c.proxAtaque <= 0) {
          c.proxAtaque = Math.max(0.8, 1.5 - P.n * 0.05);
          c.ataque = 1;
          const alvos = P.membros.map((m, i) => ({ m, i })).filter((o) => o.m.carga).sort((a, b) => b.m.dz - a.m.dz).slice(0, 1 + Math.floor(P.n / 2));
          alvos.sort((a, b) => b.i - a.i).forEach((o) => matarMembro(o.i, '#FB7185'));
          const p = proj(0, 0.1, c.z - 2.5);
          if (p) P.particulas.push({ tipo: 'anel', x: p.x, y: p.y, r: p.s * 0.5, vida: 0.45, t: 0, cor: '#E6F1FF', largo: true });
          if (!reduzir()) P.tremor = 0.3;
          som.tom(70, 0.35, 'sawtooth', 0.07, 0.6);
          vibrar(30);
        }
        // sobrou só o líder: ele vai junto
        if (!P.membros.length) {
          P.z += 10 * dt;
          if (P.z >= c.z - 1.8) {
            const tira = Math.min(P.count, c.hp);
            c.hp -= tira;
            P.count -= tira;
            c.dano = 1;
            if (c.hp <= 0) vencer();
            else perder();
          }
        }
      }

      function vencer() {
        const c = P.chefe;
        c.hp = 0;
        c.morto = 0.001;
        P.estado = 'vitoria';
        P.fimT = 0;
        P.sobreviventes = Math.max(1, P.count);
        if (!reduzir()) P.lento = 0.6;
        const p = proj(0, 3, c.z);
        if (p) {
          faiscas(p.x, p.y, '#FACC15', 30, 2.2);
          faiscas(p.x, p.y, '#5EEAD4', 20, 1.8);
          for (let i = 0; i < (reduzir() ? 10 : 40); i++) {
            const a = Math.random() * TAU;
            P.particulas.push({ tipo: 'bolha', x: p.x + Math.cos(a) * p.s, y: p.y + Math.sin(a) * p.s, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 80, r: 3 + Math.random() * 7, vida: 1.1, t: 0, cor: '#E6F1FF' });
          }
        }
        confete(70);
        P.membros.forEach((m) => { m.carga = false; });
        [523, 659, 784, 1047].forEach((f, i) => som.tom(f, 0.22, 'sine', 0.1, 1, i * 0.1));
        vibrar(40);
        aviso.textContent = `Você venceu o ${P.fase.chefe.nome}!`;
      }

      function comemorar(dt) {
        P.fimT += dt;
        if (P.chefe) {
          P.chefe.morto = Math.min(1, P.chefe.morto + dt * 1.6);
          P.chefe.t += dt;
        }
        if (P.fimT > 1.8 && !P.bauAberto) {
          P.bauAberto = true;
          mostrarBau();
        }
      }

      function perder() {
        if (P.estado === 'fim') return;
        P.estado = 'fim';
        [392, 330, 262, 196].forEach((f, i) => som.tom(f, 0.25, 'triangle', 0.08, 1, i * 0.12));
        vibrar(60);
        const total = P.total + P.perolas;
        P.total = total;
        P.perolas = 0;
        P.pontuado = true;
        const novo = total > (P.recorde || 0);
        ctx.pontuar(total, { fase: P.n });
        atualizarPontos();
        setTimeout(() => mostrarFim(total, novo), reduzir() ? 200 : 900);
      }

      /* ---------- Cartões ---------- */
      function mostrarAbertura() {
        const recorde = ctx.recorde();
        abertura.hidden = false;
        abertura.replaceChildren(h('div', { class: 'cartao sd-car__cartao' },
          h('h2', { text: 'Bora juntar o cardume!' }),
          h('ul', { class: 'sd-car__regras' },
            h('li', {}, 'Arraste para os lados (ou use as setas). O Diver nada sozinho.'),
            h('li', {}, 'Toque nos Divers perdidos para eles entrarem no cardume.'),
            h('li', {}, h('strong', { text: 'Portal turquesa ajuda; portal coral atrapalha.' }), ' Escolha o lado.'),
            h('li', {}, 'Fuja das águas-vivas, dos ouriços e do coral que gira.'),
            h('li', {}, 'No fim, o chefão: chegue com gente suficiente para vencer.')),
          recorde ? h('p', { class: 'texto-suave', text: `Seu recorde: ${plural(recorde, 'ponto', 'pontos')}` }) : null,
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-car-comecar', onclick: comecar }, icone('i-onda'), 'Começar'))));
        abertura.querySelector('#sd-car-comecar').focus({ preventScroll: true });
      }

      function mostrarBau() {
        const f = P.fase;
        const bonusFase = 50 * P.n;
        const ganhoCardume = P.sobreviventes;
        const ganhoPerolas = P.perolas;
        const r = ctx.aleatorio(`bau-${Date.now()}`);
        const premios = [10, 15, 20, 25, 30, 40, 50, 60, 100].sort(() => r() - 0.5);
        let escolhido = -1;
        const proxima = h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-car-proxima', disabled: true, onclick: () => { P.bauAberto = false; proximaFase(); } }, icone('i-seta-dir'), 'Próxima fase');
        const baus = premios.map((v, i) => h('button', {
          type: 'button', class: 'sd-car__bau', 'aria-label': `Baú ${i + 1}`,
          onclick: () => {
            if (escolhido >= 0) return;
            escolhido = i;
            P.total += bonusFase + ganhoCardume + ganhoPerolas + v;
            P.perolas = 0;
            atualizarPontos();
            baus.forEach((b, j) => {
              b.classList.add('sd-car__bau--aberto');
              if (j === i) b.classList.add('sd-car__bau--escolhido');
              b.replaceChildren(h('span', { class: 'sd-car__bau-valor', text: `+${premios[j]}` }));
              b.disabled = true;
            });
            som.tom(880, 0.12, 'sine', 0.1);
            som.tom(1175, 0.2, 'sine', 0.1, 1, 0.09);
            aviso.textContent = `Baú com ${v} pontos! Total: ${P.total}.`;
            proxima.disabled = false;
            proxima.focus({ preventScroll: true });
          },
        }, icone('i-bau')));
        abertura.hidden = false;
        abertura.replaceChildren(h('div', { class: 'cartao sd-car__cartao' },
          h('h2', { text: `${f.chefe.nome} derrotado!` }),
          h('ul', { class: 'sd-car__soma' },
            h('li', {}, h('span', { text: `Fase ${P.n}` }), h('strong', { text: `+${bonusFase}` })),
            h('li', {}, h('span', { text: `Cardume que sobrou (${ganhoCardume})` }), h('strong', { text: `+${ganhoCardume}` })),
            h('li', {}, h('span', { text: 'Pérolas' }), h('strong', { text: `+${ganhoPerolas}` }))),
          h('p', { class: 'sd-car__escolha', text: 'Escolha um baú da sorte:' }),
          h('div', { class: 'sd-car__baus' }, baus),
          h('div', { class: 'acoes-linha' }, proxima)));
        baus[4].focus({ preventScroll: true });
      }

      function mostrarFim(total, novo) {
        abertura.hidden = false;
        abertura.replaceChildren(h('div', { class: 'cartao sd-car__cartao' },
          h('h2', { class: 'texto-erro', text: 'O cardume se espalhou!' }),
          h('p', {}, `Você chegou à fase ${P.n}.`),
          h('p', { class: 'sd-car__total' }, h('strong', { text: plural(total, 'ponto', 'pontos') }), novo && total > 0 ? ' · novo recorde!' : ''),
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-car-comecar', onclick: comecar }, icone('i-onda'), 'Jogar de novo'),
            h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala'))));
        abertura.querySelector('#sd-car-comecar').focus({ preventScroll: true });
      }

      function comecar() {
        som.iniciar();
        novaPartida();
        ultimoT = performance.now();
        cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(laco);
      }

      function laco(agora) {
        if (!P) return;
        const dt = clamp((agora - ultimoT) / 1000, 0, 0.05);
        ultimoT = agora;
        if (!document.hidden && P.estado !== 'pausa') passo(dt);
        desenhar();
        quadro = requestAnimationFrame(laco);
      }

      /* =========================================================
         Desenho
         ========================================================= */
      function desenharParado() {
        camZ = -DPLAYER;
        camX = 0;
        const tema = TEMAS[0];
        fundo(tema, 0);
        pista(tema, { comprimento: 999, eventos: [] });
        const p = proj(0, 0, 0);
        if (p) {
          sombra(0, 0, 1.3);
          personagem(SPR.lider[0], p, 1.6, 1, 0, 1);
        }
        [-1.6, 1.6, -2.4, 2.4].forEach((x, i) => {
          const q = proj(x, 0, 4 + (i > 1 ? 2 : 0));
          if (q) personagem(SPR.frente[(i * 2) % 8], q, 1.2, 1, 0, 1);
        });
      }

      function fundo(tema, t) {
        const gr = g.createLinearGradient(0, 0, 0, HOR + A * 0.05);
        gr.addColorStop(0, tema.topo);
        gr.addColorStop(1, tema.horiz);
        g.fillStyle = gr;
        g.fillRect(0, 0, L, A);
        const gb = g.createLinearGradient(0, HOR, 0, A);
        gb.addColorStop(0, tema.horiz);
        gb.addColorStop(1, tema.fundo);
        g.fillStyle = gb;
        g.fillRect(0, HOR, L, A - HOR);
        // raios de luz
        if (tema.raios) {
          g.save();
          g.globalAlpha = tema.raios;
          g.fillStyle = '#FFFFFF';
          for (let i = 0; i < 5; i++) {
            const bx = (i / 5) * L * 1.2 - L * 0.1 + (reduzir() ? 0 : Math.sin(t * 0.3 + i) * 18);
            g.beginPath();
            g.moveTo(bx, -10);
            g.lineTo(bx + 40, -10);
            g.lineTo(bx + 120 - camX * 8, HOR * 1.6);
            g.lineTo(bx + 30 - camX * 8, HOR * 1.6);
            g.fill();
          }
          g.restore();
        }
        // morros ao longe
        g.save();
        g.fillStyle = misturar(tema.fundo, tema.horiz, 0.45);
        for (let i = -1; i < 7; i++) {
          const bx = i * L * 0.2 - camX * 6;
          g.beginPath();
          g.ellipse(bx, HOR + 6, L * 0.14, 16 + (i % 3) * 8, 0, Math.PI, TAU);
          g.fill();
        }
        g.restore();
        // bolhas e luzinhas
        if (P && P.bolhasFundo) {
          g.save();
          for (const b of P.bolhasFundo) {
            g.globalAlpha = 0.35;
            g.strokeStyle = tema.luzes ? '#5EEAD4' : '#FFFFFF';
            g.lineWidth = 1;
            g.beginPath();
            g.arc(b.x * L, b.y * A, b.r, 0, TAU);
            if (tema.luzes) { g.fillStyle = 'rgba(94, 234, 212, 0.5)'; g.fill(); } else g.stroke();
          }
          g.restore();
        }
      }

      function quad(a, b, c, d, cor) {
        g.fillStyle = cor;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.lineTo(c.x, c.y);
        g.lineTo(d.x, d.y);
        g.closePath();
        g.fill();
      }

      function pista(tema, f) {
        const fim = f.comprimento + 26;
        const z0 = Math.floor(camZ / 2) * 2;
        for (let z = Math.min(z0 + 72, fim); z >= z0; z -= 2) {
          const za = Math.max(z, camZ + 0.4);
          const zb = Math.min(z + 2, fim);
          if (zb <= za) continue;
          const d = (za + zb) / 2 - camZ;
          const nv = nevoa(d);
          const a1 = proj(-MEIA, 0, za);
          const a2 = proj(MEIA, 0, za);
          const b1 = proj(-MEIA, 0, zb);
          const b2 = proj(MEIA, 0, zb);
          if (!a1 || !b1) continue;
          const listra = Math.floor(z / 2) % 2 === 0;
          quad(a1, a2, b2, b1, misturar(tema.pista[listra ? 0 : 1], tema.horiz, nv));
          for (const s of [-1, 1]) {
            const ti = proj(s * MEIA, 0.24, za);
            const te = proj(s * (MEIA + 0.32), 0.24, za);
            const ui = proj(s * MEIA, 0.24, zb);
            const ue = proj(s * (MEIA + 0.32), 0.24, zb);
            const bi = proj(s * MEIA, 0, za);
            const ci = proj(s * MEIA, 0, zb);
            if (ti && te && ui && ue && bi && ci) {
              quad(bi, ti, ui, ci, misturar(tema.lado, tema.horiz, nv));
              quad(ti, te, ue, ui, misturar(tema.borda, tema.horiz, nv));
            }
          }
        }
        // arena do chefão
        if (P && P.fase) {
          const cz = f.comprimento + 15;
          const pts = [];
          for (let i = 0; i <= 28; i++) {
            const a = (i / 28) * TAU;
            const p = proj(Math.cos(a) * 6.5, 0.02, cz + Math.sin(a) * 6.5);
            if (p) pts.push(p);
          }
          if (pts.length > 10) {
            const d = cz - camZ;
            g.fillStyle = misturar(tema.pista[0], tema.horiz, nevoa(d) * 0.8);
            g.beginPath();
            pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
            g.fill();
            g.strokeStyle = misturar(tema.borda, tema.horiz, nevoa(d) * 0.8);
            g.lineWidth = Math.max(2, F / d * 0.25);
            g.stroke();
          }
        }
      }

      function sombra(x, z, tam = 1) {
        const p = proj(x, 0, z);
        if (!p) return;
        g.fillStyle = 'rgba(6, 23, 45, 0.22)';
        g.beginPath();
        g.ellipse(p.x, p.y, p.s * 0.36 * tam, p.s * 0.13 * tam, 0, 0, TAU);
        g.fill();
      }

      /** Desenha um sprite com squash & stretch: pés no ponto p, altura em unidades. */
      function personagem(img, p, altura, esticar, inclina, alfa) {
        const hh = p.s * altura;
        const ww = hh * (SW / SH);
        g.save();
        g.globalAlpha = alfa;
        g.translate(p.x, p.y);
        g.rotate(inclina);
        g.scale(1 / Math.sqrt(esticar), esticar);
        g.drawImage(img, -ww / 2, -hh, ww, hh);
        g.restore();
      }

      function alfaDist(d) { return 1 - clamp((d - 48) / 22, 0, 1); }

      function desenharObjetos() {
        const f = P.fase;
        const tema = f.tema;
        const lista = [];
        const t = P.t;
        for (const e of f.eventos) {
          const d = e.z - camZ;
          if (d < 0.4 || d > 72) continue;
          if (e.tipo === 'recrutas') {
            for (const r of e.gente) {
              if (r.junto) continue;
              lista.push({ d: r.z - camZ, f: () => {
                const p = proj(r.x, 0.06 + Math.abs(Math.sin(t * 5 + r.fase * 6)) * 0.18, r.z);
                if (!p) return;
                sombra(r.x, r.z);
                const quadroF = quadroDe(t * 1.6 + r.fase);
                personagem(SPR.frente[quadroF], p, 1.2, 1 + Math.sin(t * 10 + r.fase * 6) * 0.06, 0, alfaDist(p.d));
              } });
            }
          } else if (e.tipo === 'portal') {
            lista.push({ d, f: () => desenharPortal(e) });
          } else if (e.tipo === 'agua') {
            e.itens.forEach((a) => lista.push({ d, f: () => aguaViva(a.x, e.z, t + a.ph) }));
          } else if (e.tipo === 'ourico') {
            const x = e.x0 + Math.sin(t * e.w + e.ph) * e.amp;
            lista.push({ d, f: () => ourico(x, e.z, t * e.w * 2) });
          } else if (e.tipo === 'coral') {
            lista.push({ d, f: () => coralGira(e, t) });
          } else if (e.tipo === 'pedra' && !e.quebrou) {
            lista.push({ d: d + 0.4, f: () => pedra(e) });
          } else if (e.tipo === 'perolas') {
            e.itens.forEach((pe) => { if (!pe.pega) lista.push({ d: pe.z - camZ, f: () => perola(pe, t) }); });
          }
        }
        if (P.chefe || f.comprimento - P.z < 70) {
          const cz = f.comprimento + 15;
          lista.push({ d: cz - camZ + 1, f: () => chefe(cz) });
        }
        // cardume
        P.membros.forEach((m) => {
          const z = P.z + m.dz;
          lista.push({ d: z - camZ, f: () => {
            const pulo = P.estado === 'vitoria' ? Math.abs(Math.sin(t * 7 + m.fase * 6)) * 0.55 : Math.abs(Math.sin(t * 6 * m.vel + m.fase * 6)) * 0.12;
            const p = proj(m.x, pulo, z);
            if (!p) return;
            const qf = quadroDe(t * 1.8 * m.vel + m.fase);
            const pop = m.pop < 1 ? 0.55 + elastico(m.pop) * 0.45 : 1;
            const est = (1 + Math.sin(t * 12 * m.vel + m.fase * 6) * 0.05) * (m.pop < 1 ? 1 + (1 - m.pop) * 0.35 : 1);
            personagem(SPR.costas[qf], p, 1.2 * pop, est, clamp(-P.vx * 0.025, -0.3, 0.3), alfaDist(p.d));
          } });
        });
        if (P.estado !== 'fim' || P.count > 0) {
          lista.push({ d: P.z - camZ - 0.01, f: () => {
            const pulo = P.estado === 'vitoria' ? Math.abs(Math.sin(t * 7)) * 0.7 : Math.abs(Math.sin(t * 6)) * 0.14;
            const p = proj(P.x, pulo, P.z);
            if (!p) return;
            // anel de luz do líder
            const pc = proj(P.x, 0.01, P.z);
            g.save();
            g.globalAlpha = 0.55;
            g.strokeStyle = '#FACC15';
            g.lineWidth = Math.max(2, pc.s * 0.05);
            g.beginPath();
            g.ellipse(pc.x, pc.y, pc.s * 0.5, pc.s * 0.17, 0, 0, TAU);
            g.stroke();
            g.restore();
            const qf = quadroDe(t * 1.9);
            const pisca = P.invul > 0 && Math.floor(P.invul * 20) % 2 === 0;
            personagem(SPR.lider[qf], p, 1.6, 1 + Math.sin(t * 12) * 0.05, clamp(-P.vx * 0.03, -0.35, 0.35), pisca ? 0.35 : 1);
          } });
        }
        lista.sort((a, b) => b.d - a.d);
        // sombras do cardume primeiro (por baixo de tudo que está perto)
        P.membros.forEach((m) => sombra(m.x, P.z + m.dz, 1.15));
        sombra(P.x, P.z, 1.5);
        for (const o of lista) o.f();
        void tema;
      }

      function desenharPortal(e) {
        const t = P.t;
        e.ops.forEach((op, i) => {
          const x0 = i === 0 ? -MEIA + 0.08 : 0.08;
          const x1 = i === 0 ? -0.08 : MEIA - 0.08;
          const alt = 2.1;
          const a = proj(x0, 0, e.z);
          const b = proj(x1, 0, e.z);
          const c = proj(x1, alt, e.z);
          const d = proj(x0, alt, e.z);
          if (!a || !c) return;
          const usado = e.feito;
          if (usado && e.escolha === i) return; // o portal escolhido estourou
          const cor = bom(op) ? (op.t === 'x' ? ['#FDE68A', '#FACC15'] : ['#99F6E4', '#14B8A6']) : ['#FECDD3', '#FB7185'];
          g.save();
          g.globalAlpha = usado ? 0.25 : 0.62 * alfaDist(a.d);
          const gr = g.createLinearGradient(0, d.y, 0, a.y);
          gr.addColorStop(0, cor[0]);
          gr.addColorStop(1, cor[1]);
          g.fillStyle = gr;
          retRed(g, d.x, d.y, c.x - d.x, a.y - d.y, Math.min(14, (c.x - d.x) * 0.12));
          g.fill();
          // bolhinhas subindo dentro do portal
          g.globalAlpha = usado ? 0.15 : 0.55;
          g.fillStyle = '#FFFFFF';
          for (let k = 0; k < 5; k++) {
            const u = (k * 0.21 + t * 0.35 + i * 0.13) % 1;
            g.beginPath();
            g.arc(d.x + (c.x - d.x) * ((k * 0.37 + i * 0.2) % 1), a.y - (a.y - d.y) * u, Math.max(1.5, a.s * 0.05), 0, TAU);
            g.fill();
          }
          g.restore();
          // moldura e postes
          g.save();
          g.globalAlpha = usado ? 0.3 : alfaDist(a.d);
          g.strokeStyle = '#FFFFFF';
          g.lineWidth = Math.max(2, a.s * 0.06);
          retRed(g, d.x, d.y, c.x - d.x, a.y - d.y, Math.min(14, (c.x - d.x) * 0.12));
          g.stroke();
          const tam = Math.min(a.s * 0.72, (c.x - d.x) * 0.42);
          if (tam < 10) { g.restore(); return; }
          g.font = `800 ${tam}px 'Plus Jakarta Sans', system-ui, sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.lineWidth = Math.max(3, tam * 0.14);
          g.strokeStyle = bom(op) ? '#0B5550' : '#881337';
          g.strokeText(rotuloOp(op), (a.x + b.x) / 2, (a.y + d.y) / 2);
          g.fillStyle = '#FFFFFF';
          g.fillText(rotuloOp(op), (a.x + b.x) / 2, (a.y + d.y) / 2);
          g.restore();
        });
      }

      function aguaViva(x, z, t) {
        const bob = Math.sin(t * 2.4) * 0.15;
        const p = proj(x, 0.9 + bob, z);
        if (!p) return;
        sombra(x, z, 1.3);
        const s = p.s;
        g.save();
        g.globalAlpha = alfaDist(p.d);
        g.translate(p.x, p.y);
        // tentáculos
        g.strokeStyle = 'rgba(240, 171, 252, 0.85)';
        g.lineWidth = Math.max(1.5, s * 0.05);
        g.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(i * s * 0.14, 0);
          for (let k = 1; k <= 4; k++) g.lineTo(i * s * 0.14 + Math.sin(t * 4 + k + i) * s * 0.06, k * s * 0.17);
          g.stroke();
        }
        const gr = g.createRadialGradient(-s * 0.15, -s * 0.35, s * 0.03, 0, -s * 0.15, s * 0.6);
        gr.addColorStop(0, '#FDF4FF');
        gr.addColorStop(0.4, '#F0ABFC');
        gr.addColorStop(1, 'rgba(192, 38, 211, 0.85)');
        g.shadowColor = 'rgba(240, 171, 252, 0.8)';
        g.shadowBlur = s * 0.25;
        g.fillStyle = gr;
        g.beginPath();
        g.ellipse(0, 0, s * 0.5, s * 0.46 * (1 + Math.sin(t * 2.4) * 0.06), 0, Math.PI, TAU);
        for (let i = 0; i <= 6; i++) g.lineTo(s * 0.5 - (i / 6) * s, Math.sin(i * 1.7) * s * 0.05 + s * 0.04);
        g.fill();
        g.shadowBlur = 0;
        brilho(g, -s * 0.18, -s * 0.28, s * 0.13, s * 0.07, -0.4, 0.85);
        // carinha brava
        g.fillStyle = '#4A044E';
        g.beginPath();
        g.arc(-s * 0.12, -s * 0.12, s * 0.045, 0, TAU);
        g.arc(s * 0.12, -s * 0.12, s * 0.045, 0, TAU);
        g.fill();
        g.restore();
      }

      function ourico(x, z, giro) {
        const p = proj(x, 0.55, z);
        if (!p) return;
        sombra(x, z, 1.3);
        const s = p.s;
        g.save();
        g.globalAlpha = alfaDist(p.d);
        g.translate(p.x, p.y);
        g.rotate(giro);
        g.strokeStyle = '#3B0764';
        g.lineWidth = Math.max(1.5, s * 0.05);
        g.lineCap = 'round';
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          g.beginPath();
          g.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
          g.lineTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62);
          g.stroke();
        }
        g.rotate(-giro);
        g.fillStyle = gradBola(g, 0, 0, s * 0.42, ['#F5D0FE', '#A855F7', '#581C87']);
        g.beginPath();
        g.arc(0, 0, s * 0.4, 0, TAU);
        g.fill();
        brilho(g, -s * 0.14, -s * 0.16, s * 0.1, s * 0.06, -0.5, 0.8);
        g.restore();
      }

      function coralGira(e, t) {
        const a = t * e.w + e.ph;
        const pc = proj(e.cx, 0, e.z);
        if (!pc) return;
        sombra(e.cx, e.z, 1.6);
        const ponta = (s) => proj(e.cx + Math.cos(a) * e.meio * s, 0.55, e.z + Math.sin(a) * e.meio * 0.6 * s);
        const p1 = ponta(1);
        const p2 = ponta(-1);
        const centro = proj(e.cx, 0.55, e.z);
        g.save();
        g.globalAlpha = alfaDist(pc.d);
        // poste
        g.strokeStyle = '#E2B07A';
        g.lineWidth = Math.max(3, pc.s * 0.18);
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(pc.x, pc.y);
        g.lineTo(centro.x, centro.y);
        g.stroke();
        if (p1 && p2) {
          g.strokeStyle = '#9F1239';
          g.lineWidth = Math.max(5, pc.s * 0.26);
          g.beginPath();
          g.moveTo(p1.x, p1.y);
          g.lineTo(p2.x, p2.y);
          g.stroke();
          g.strokeStyle = '#FB7185';
          g.lineWidth = Math.max(3, pc.s * 0.18);
          g.stroke();
          for (let k = -4; k <= 4; k++) {
            if (!k) continue;
            const q = ponta(k / 4);
            if (!q) continue;
            g.fillStyle = '#FDA4AF';
            g.beginPath();
            g.arc(q.x, q.y - q.s * 0.12, Math.max(2, q.s * 0.11), 0, TAU);
            g.fill();
          }
        }
        g.fillStyle = '#FACC15';
        g.beginPath();
        g.arc(centro.x, centro.y, Math.max(3, pc.s * 0.14), 0, TAU);
        g.fill();
        g.restore();
      }

      function pedra(e) {
        const alt = 0.95;
        const fr = [proj(e.x0, 0, e.z), proj(e.x1, 0, e.z), proj(e.x1, alt, e.z), proj(e.x0, alt, e.z)];
        const tp = [proj(e.x0, alt, e.z), proj(e.x1, alt, e.z), proj(e.x1, alt, e.z + 0.8), proj(e.x0, alt, e.z + 0.8)];
        if (fr.some((p) => !p) || tp.some((p) => !p)) return;
        const bate = e.bate > 0 ? (e.bate -= 1 / 60, 1) : 0;
        g.save();
        g.globalAlpha = alfaDist(fr[0].d);
        g.translate(bate ? (Math.random() - 0.5) * 4 : 0, 0);
        quad(tp[0], tp[1], tp[2], tp[3], '#FDBA74');
        const gr = g.createLinearGradient(0, fr[3].y, 0, fr[0].y);
        gr.addColorStop(0, '#FB923C');
        gr.addColorStop(1, '#C2410C');
        g.fillStyle = gr;
        g.beginPath();
        fr.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
        g.closePath();
        g.fill();
        g.strokeStyle = '#7C2D12';
        g.lineWidth = Math.max(1.5, fr[0].s * 0.04);
        g.stroke();
        const tam = Math.max(14, fr[0].s * 0.55);
        g.font = `800 ${tam}px 'Plus Jakarta Sans', system-ui, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = Math.max(3, tam * 0.14);
        g.strokeStyle = '#7C2D12';
        const cx = (fr[0].x + fr[1].x) / 2;
        const cy = (fr[0].y + fr[3].y) / 2;
        g.strokeText(`−${e.n}`, cx, cy);
        g.fillStyle = '#FFFFFF';
        g.fillText(`−${e.n}`, cx, cy);
        g.restore();
      }

      function perola(pe, t) {
        const p = proj(pe.x, 0.45 + Math.sin(t * 3 + pe.ph) * 0.12, pe.z);
        if (!p) return;
        const r = Math.max(3, p.s * 0.2);
        g.save();
        g.globalAlpha = alfaDist(p.d);
        g.shadowColor = 'rgba(254, 249, 195, 0.9)';
        g.shadowBlur = r;
        g.fillStyle = gradBola(g, p.x, p.y, r, ['#FFFFFF', '#FDF2F8', '#F9A8D4', '#DB2777']);
        g.beginPath();
        g.arc(p.x, p.y, r, 0, TAU);
        g.fill();
        g.shadowBlur = 0;
        brilho(g, p.x - r * 0.35, p.y - r * 0.35, r * 0.3, r * 0.2, -0.5, 0.95);
        g.restore();
      }

      function chefe(cz) {
        const f = P.fase;
        const c = P.chefe || { t: P.t, dano: 0, ataque: 0, morto: 0, hp: f.hp, max: f.hp, mostra: f.hp };
        const p = proj(0, 0, cz);
        if (!p) return;
        const morte = c.morto || 0;
        const tam = 1.32 * (1 - morte * 0.85);
        if (tam <= 0.05) return;
        g.save();
        g.globalAlpha = alfaDist(p.d) * (1 - morte * 0.6);
        g.fillStyle = 'rgba(6, 23, 45, 0.28)';
        g.beginPath();
        g.ellipse(p.x, p.y, p.s * 3.4 * tam, p.s * 0.9 * tam, 0, 0, TAU);
        g.fill();
        g.translate(p.x, p.y);
        const sq = 1 + c.dano * 0.08;
        g.scale(p.s * tam * sq, p.s * tam / sq);
        g.rotate(morte * 0.6);
        desenharChefe(g, f.chefe.tipo, { t: c.t || P.t, dano: c.dano, ataque: c.ataque });
        g.restore();
        // nome e vida
        if (P.chefe && !morte) {
          const topo = proj(0, 9.4, cz);
          if (!topo) return;
          const w = Math.min(L * 0.7, 260);
          const x = L / 2 - w / 2;
          const y = Math.max(54, topo.y);
          g.save();
          g.font = `800 14px 'Plus Jakarta Sans', system-ui, sans-serif`;
          g.textAlign = 'center';
          g.lineWidth = 4;
          g.strokeStyle = 'rgba(6, 23, 45, 0.75)';
          g.strokeText(f.chefe.nome, L / 2, y - 8);
          g.fillStyle = '#FFFFFF';
          g.fillText(f.chefe.nome, L / 2, y - 8);
          g.fillStyle = 'rgba(6, 23, 45, 0.6)';
          retRed(g, x, y, w, 14, 7);
          g.fill();
          g.fillStyle = '#FB7185';
          retRed(g, x + 2, y + 2, Math.max(0, (w - 4) * (c.mostra / c.max)), 10, 5);
          g.fill();
          g.font = `800 11px 'Plus Jakarta Sans', system-ui, sans-serif`;
          g.fillStyle = '#FFFFFF';
          g.fillText(String(Math.max(0, Math.ceil(c.hp))), L / 2, y + 11);
          g.restore();
        }
      }

      function contador() {
        if (P.estado === 'fim' && P.count <= 0) return;
        const p = proj(P.x, 1.95, P.z);
        if (!p) return;
        const pulso = 1 + P.contaPulso * 0.35;
        const txt = String(Math.max(0, P.count));
        g.save();
        g.translate(p.x, p.y - 4);
        g.scale(pulso, pulso);
        g.font = `800 18px 'Plus Jakarta Sans', system-ui, sans-serif`;
        const w = Math.max(40, g.measureText(txt).width + 22);
        g.fillStyle = 'rgba(6, 23, 45, 0.72)';
        retRed(g, -w / 2, -14, w, 28, 14);
        g.fill();
        g.strokeStyle = '#5EEAD4';
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = '#E6F1FF';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(txt, 0, 1);
        g.restore();
      }

      function desenharParticulas() {
        for (const p of P.particulas) {
          const u = p.t / p.vida;
          g.save();
          g.globalAlpha = Math.max(0, 1 - u);
          if (p.tipo === 'bolha') {
            g.strokeStyle = p.cor;
            g.lineWidth = 1.5;
            g.beginPath();
            g.arc(p.x, p.y, p.r * (1 + u * 0.5), 0, TAU);
            g.stroke();
            brilho(g, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, p.r * 0.18, 0, 0.8 * (1 - u));
          } else if (p.tipo === 'anel') {
            g.strokeStyle = p.cor;
            g.lineWidth = p.largo ? 4 : 2.5;
            g.beginPath();
            g.ellipse(p.x, p.y, p.r * (1 + u * (p.largo ? 6 : 2.5)), p.r * 0.4 * (1 + u * (p.largo ? 6 : 2.5)), 0, 0, TAU);
            g.stroke();
          } else if (p.tipo === 'estrela') {
            g.translate(p.x, p.y);
            g.rotate(p.giro);
            estrela(g, 0, 0, p.r * (1 - u * 0.4), p.cor);
          } else if (p.tipo === 'confete') {
            g.translate(p.x, p.y);
            g.rotate(p.giro);
            g.fillStyle = p.cor;
            g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
          }
          g.restore();
        }
        for (const t of P.textos) {
          const u = t.t / t.vida;
          const esc = u < 0.2 ? 0.6 + elastico(u / 0.2) * 0.4 : 1;
          g.save();
          g.globalAlpha = 1 - Math.max(0, (u - 0.6) / 0.4);
          g.translate(t.x, t.y - u * 50);
          g.scale(esc, esc);
          g.font = `800 ${t.tam}px 'Plus Jakarta Sans', system-ui, sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.lineWidth = 6;
          g.strokeStyle = 'rgba(6, 23, 45, 0.8)';
          g.strokeText(t.txt, 0, 0);
          g.fillStyle = t.cor;
          g.fillText(t.txt, 0, 0);
          g.restore();
        }
      }

      function desenhar() {
        if (!P) { desenharParado(); return; }
        const tema = P.fase.tema;
        g.save();
        if (P.tremor > 0) g.translate((Math.random() - 0.5) * 10 * P.tremor, (Math.random() - 0.5) * 10 * P.tremor);
        fundo(tema, P.t);
        pista(tema, P.fase);
        desenharObjetos();
        contador();
        desenharParticulas();
        g.restore();
      }

      /* ---------- Entrada ---------- */
      const teclas = { esq: false, dir: false };
      let arrasto = null;
      function aoTecla(ev, baixo) {
        if (!P || P.estado !== 'correndo') return;
        if (['ArrowLeft', 'a', 'A'].includes(ev.key)) { teclas.esq = baixo; ev.preventDefault(); }
        if (['ArrowRight', 'd', 'D'].includes(ev.key)) { teclas.dir = baixo; ev.preventDefault(); }
      }
      const tDown = (ev) => aoTecla(ev, true);
      const tUp = (ev) => aoTecla(ev, false);
      tela.addEventListener('keydown', tDown);
      tela.addEventListener('keyup', tUp);
      tela.addEventListener('pointerdown', (ev) => {
        if (!P || P.estado !== 'correndo') return;
        arrasto = { x: ev.clientX, alvo: P.alvoX };
        try { tela.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      });
      tela.addEventListener('pointermove', (ev) => {
        if (!arrasto || !P) return;
        const porUnidade = F / DPLAYER;
        P.alvoX = clamp(arrasto.alvo + ((ev.clientX - arrasto.x) / porUnidade) * 1.15, -LIM, LIM);
      });
      const soltar = () => { arrasto = null; };
      tela.addEventListener('pointerup', soltar);
      tela.addEventListener('pointercancel', soltar);
      const aoRedim = () => medir();
      window.addEventListener('resize', aoRedim);
      const aoVisivel = () => { ultimoT = performance.now(); teclas.esq = false; teclas.dir = false; };
      document.addEventListener('visibilitychange', aoVisivel);
      limpar = [() => window.removeEventListener('resize', aoRedim), () => document.removeEventListener('visibilitychange', aoVisivel)];

      ctx.guia([
        { alvo: '#sd-car-canvas', desenho: 'onda', titulo: 'Guie o Diver', texto: 'Ele nada sozinho. Arraste para os lados (ou use as setas) e encoste nos Divers perdidos: eles entram no cardume.' },
        { alvo: '#sd-car-canvas', desenho: 'estrela', titulo: 'Portais e perigos', texto: 'Portal turquesa ou amarelo ajuda (+7, x2); coral atrapalha (−4, ÷2). Água-viva, ouriço, coral que gira e pedra tiram gente do cardume.' },
        { alvo: '#sd-car-pontos', desenho: 'trofeu', titulo: 'O chefão', texto: 'Cada fase dura uns 30 segundos e termina num chefão. Chegue com gente suficiente, abra um baú da sorte e siga para a próxima. Os pontos valem só o placar da sala.' },
      ]);
      medir();
      if (window.__diverTeste) {
        window.__diverTeste.cardume = {
          partida: () => P,
          mover: (x) => { if (P && Number.isFinite(x)) P.alvoX = clamp(x, -LIM, LIM); },
          avancar: (seg) => { for (let i = 0; i < seg * 60 && P && ['correndo', 'chefe', 'vitoria'].includes(P.estado); i++) passo(1 / 60); },
        };
      }
      faseEl.textContent = 'Cardume';
      mostrarAbertura();

      return {
        emAndamento: () => !!(P && ['correndo', 'chefe', 'vitoria'].includes(P.estado)),
        parar() {
          cancelAnimationFrame(quadro);
          if (P && !P.pontuado && P.total + P.perolas > 0) ctx.pontuar(P.total + P.perolas, { fase: P.n, saiu: true });
          P = null;
          som.fechar();
          limpar.forEach((f) => f());
        },
      };
    },
  });
})();

/*
 * Tiro ao Alvo: a pistola d'água em primeira pessoa (2026-10-17, pedido do usuário: a mesma visão dos jogos de tiro em
 * primeira pessoa, mas de água). A pistola fica no canto de baixo, à direita, vista por trás e segura por uma mão de
 * luva de mergulho, com o braço na roupa de neoprene. O desenho é nosso: uma pistola d'água de brinquedo com tanque
 * transparente, tampinha de encher, presilhas, manômetro, cano com anéis, mira, bomba e bico.
 * Um modelo 3D pequeno (prismas e cilindros) projetado em perspectiva no <canvas>: luz de cima, vincos finos, contorno de
 * figurinha e a água do tanque sempre na horizontal do mundo (cortada por um plano), com marola e bolhas.
 * Pistola3D.criar({ COR }) devolve:
 *   alvo(L, A, x, y) → { guinada, arfagem }: a pose que a pistola quer para mirar em (x, y) (ela segue a mira só em parte)
 *   desenhar(c, e)   → desenha no contexto c; e = { L, A, guinada, arfagem, t, coice, nivel, bomba, slosh, tilt, bolhas, rm }
 *   bico(e)          → { x, y, a, r }: a ponta do bico na tela, a direção do cano na tela e o raio do furo
 *   silhueta()       → o contorno (convexo) da pistola inteira no último desenho, em px da tela
 *   cobre(x, y)      → o ponto (x, y) fica atrás de alguma peça da pistola no último desenho?
 *   mao(L, A)        → onde fica a mão na tela
 *   tanque           → { y, r, z0, z1 }: o tanque em unidades da pistola (para as bolhas)
 * Unidades da pistola: x para a direita, y para cima, z para a frente; a origem é a mão. Faz parte do pacote
 * "descompressao" (PACOTES em js/app.js) e vem antes de js/descompressao/tiro.js.
 */
window.Pistola3D = {
  criar({ COR }) {
    // cores: aceitam "#rrggbb", "rgb(...)" ou [r, g, b] (o canvas não entende color-mix)
    const rgbDe = (c) => {
      if (Array.isArray(c)) return c;
      const s = String(c).trim();
      const m = /^#?([0-9a-f]{6})$/i.exec(s);
      if (m) {
        const n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
      const d = s.match(/\d+(\.\d+)?/g);
      return d ? d.slice(0, 3).map(Number) : [0, 0, 0];
    };
    const misturar = (a, b, t) => {
      const x = rgbDe(a);
      const y = rgbDe(b);
      return x.map((q, i) => q + (y[i] - q) * t);
    };
    const alfa = (c, a = 1) => `rgba(${rgbDe(c).map(Math.round).join(',')},${a})`;

    /* ---------- vetores ---------- */
    const v = (x, y, z) => ({ x, y, z });
    const mais = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z);
    const menos = (a, b) => v(a.x - b.x, a.y - b.y, a.z - b.z);
    const vezes = (a, k) => v(a.x * k, a.y * k, a.z * k);
    const ponto = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
    const cruz = (a, b) => v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    const unit = (a) => {
      const n = Math.hypot(a.x, a.y, a.z) || 1;
      return v(a.x / n, a.y / n, a.z / n);
    };
    const media = (pts) => vezes(pts.reduce((s, q) => mais(s, q), v(0, 0, 0)), 1 / pts.length);
    /** Rotação: rolagem (em volta de z), depois arfagem (em volta de x; o bico sobe com ângulo positivo), depois guinada
        (em volta de y; o bico vai para a direita com ângulo positivo) */
    function rotacao(guinada, arfagem, rolagem) {
      const cy = Math.cos(guinada);
      const sy = Math.sin(guinada);
      const cx = Math.cos(arfagem);
      const sx = Math.sin(arfagem);
      const cz = Math.cos(rolagem);
      const sz = Math.sin(rolagem);
      return (p) => {
        let x = p.x * cz - p.y * sz;
        let y = p.x * sz + p.y * cz;
        let z = p.z;
        const y2 = y * cx - z * sx;
        z = y * sx + z * cx;
        y = y2;
        const x2 = x * cy + z * sy;
        z = -x * sy + z * cy;
        x = x2;
        return v(x, y, z);
      };
    }

    /* ---------- peças: prismas (um perfil 2D puxado ao longo de um eixo), cilindros e tubos ---------- */
    /** Perfil de retângulo de cantos redondos */
    function perfilArredondado(w, h, r, passos = 3) {
      const pts = [];
      const cantos = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
      for (const [cx, cy, a0] of cantos) {
        for (let i = 0; i <= passos; i++) {
          const a = a0 + (i / passos) * (Math.PI / 2);
          pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
      }
      return pts;
    }
    const perfilCirculo = (r, n = 20) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r]);
    /** As arestas da peça e quem divide cada uma (para achar o contorno e os vincos) */
    function montar(verts, faces, o) {
      const arestas = new Map();
      faces.forEach((f, fi) => f.idx.forEach((a, k) => {
        const b = f.idx[(k + 1) % f.idx.length];
        const chave = a < b ? `${a}:${b}` : `${b}:${a}`;
        const e = arestas.get(chave) || { a, b, faces: [] };
        e.faces.push(fi);
        arestas.set(chave, e);
      }));
      return { verts, faces, arestas: [...arestas.values()], cor: o.cor, brilho: o.brilho ?? 0.35, vinco: o.vinco ?? 0.35, vazado: !!o.vazado };
    }
    /** Prisma ao longo de z: perfil (x, y) de z0 a z1, com escala s1 no fim (afina) e o perfil deslocado (dx, dy) */
    function prisma(perfil, z0, z1, o = {}) {
      const s1 = o.s1 ?? 1;
      const dx = o.dx || 0;
      const dy = o.dy || 0;
      const n = perfil.length;
      const verts = [];
      perfil.forEach(([x, y]) => verts.push(v(x + dx, y + dy, z0)));
      perfil.forEach(([x, y]) => verts.push(v(x * s1 + dx, y * s1 + dy, z1)));
      const faces = [];
      for (let i = 0; i < n; i++) faces.push({ idx: [i, n + i, n + ((i + 1) % n), (i + 1) % n] });
      if (!o.vazado) { // um anel vazado não tem tampas
        faces.push({ idx: Array.from({ length: n }, (_, i) => n - 1 - i) });
        faces.push({ idx: Array.from({ length: n }, (_, i) => n + i) });
      }
      return montar(verts, faces, o);
    }
    const cilindro = (r, z0, z1, o = {}) => prisma(perfilCirculo(r, o.n || 16), z0, z1, o);
    /** Prisma puxado para baixo (ao longo de y): o perfil fica no plano x-z (o cabo e a mão) */
    function prismaY(perfil, y0, y1, o = {}) {
      const n = perfil.length;
      const s1 = o.s1 ?? 1;
      const [ax, az, bx, bz] = o.desloc || [0, 0, 0, 0];
      const verts = [];
      perfil.forEach(([x, z]) => verts.push(v(x + ax, y0, z + az)));
      perfil.forEach(([x, z]) => verts.push(v(x * s1 + bx, y1, z * s1 + bz)));
      const faces = [];
      for (let i = 0; i < n; i++) faces.push({ idx: [i, (i + 1) % n, n + ((i + 1) % n), n + i] });
      faces.push({ idx: Array.from({ length: n }, (_, i) => i) });
      faces.push({ idx: Array.from({ length: n }, (_, i) => 2 * n - 1 - i) });
      return montar(verts, faces, o);
    }
    /** Cilindro entre dois pontos quaisquer (dedos, punho, braço): raio r0 em a e r1 em b */
    function tubo(a, b, r0, r1, o = {}) {
      const eixo = menos(b, a);
      const comp = Math.hypot(eixo.x, eixo.y, eixo.z);
      const w = unit(eixo);
      const u = unit(cruz(Math.abs(w.y) < 0.9 ? v(0, 1, 0) : v(1, 0, 0), w));
      const t = cruz(w, u);
      const p = prisma(perfilCirculo(r0, o.n || 10), 0, comp, { ...o, s1: r1 / r0 });
      p.verts = p.verts.map((q) => mais(a, mais(mais(vezes(u, q.x), vezes(t, q.y)), vezes(w, q.z))));
      return p;
    }
    /** Move e gira uma peça (no espaço da pistola) */
    function mover(p, giro, desloc = v(0, 0, 0)) {
      p.verts = p.verts.map((q) => mais(giro ? giro(q) : q, desloc));
      return p;
    }

    /* ---------- o modelo ---------- */
    const TQ = { y: 3.75, r: 1.55, z0: -1.2, z1: 6.6 }; // o tanque: altura do eixo, raio e onde começa e termina
    const BICO = v(0, 1.0, 18.0); // de onde a água sai
    const giroCabo = rotacao(0, -0.26, 0); // o cabo inclina para trás
    function modelo() {
      const P = {};
      P.corpo = prisma(perfilArredondado(2.9, 3.1, 1.0), -3.2, 8.4, { cor: COR.turquesa, dy: 0.9 });
      P.traseira = prisma(perfilArredondado(2.5, 2.2, 0.8), -3.9, -3.0, { cor: COR.turquesaEscura, dy: 1.05 });
      P.cano = cilindro(0.72, 8.2, 16.4, { cor: COR.amarelo, dy: 1.0, s1: 0.92 });
      P.anel1 = cilindro(0.86, 10.6, 11.2, { cor: COR.amareloSombra, dy: 1.0 });
      P.anel2 = cilindro(0.82, 13.4, 14.0, { cor: COR.amareloSombra, dy: 1.0 });
      P.bico = cilindro(0.98, 16.3, 17.9, { cor: COR.coral, dy: 1.0, s1: 0.9 });
      P.miraFrente = prisma(perfilArredondado(0.45, 1.1, 0.18), 16.5, 17.6, { cor: COR.coral, dy: 2.25 });
      P.bomba = cilindro(1.1, 9.2, 13.6, { cor: COR.coral, dy: -0.6 });
      P.cabo = mover(prismaY(perfilArredondado(2.6, 3.8, 1.0), -0.2, -9.2, { cor: COR.turquesaEscura, s1: 0.94, desloc: [0, -1.3, 0, -1.3] }), giroCabo);
      P.guardaBaixo = prisma(perfilArredondado(0.7, 0.6, 0.25), 0.4, 4.6, { cor: COR.turquesaEscura, dy: -3.4 });
      P.guardaFrente = mover(cilindro(0.38, -3.4, -0.4, { cor: COR.turquesaEscura, n: 8 }), rotacao(0, -Math.PI / 2, 0), v(0, 0, 4.3));
      P.gatilho = mover(prisma(perfilArredondado(0.55, 0.7, 0.25), -2.5, -0.4, { cor: COR.coral }), rotacao(0, -Math.PI / 2 + 0.25, 0), v(0, 0, 2.0));
      P.tanqueTras = cilindro(1.66, TQ.z0 - 0.3, TQ.z0 + 0.35, { cor: COR.turquesa, dy: TQ.y, n: 20, vazado: true }); // o aro de trás, aberto: dá para ver a água
      P.tampa = mover(cilindro(0.62, 0, 0.75, { cor: COR.amarelo, n: 12 }), rotacao(0, -Math.PI / 2, 0), v(0, TQ.y + TQ.r - 0.25, TQ.z0 + 1.6)); // a tampinha de encher
      P.tanqueFrente = cilindro(1.64, TQ.z1 - 0.15, TQ.z1 + 0.45, { cor: COR.turquesa, dy: TQ.y, n: 20 });
      P.tanqueBase = prisma(perfilArredondado(1.4, 0.8, 0.3), TQ.z0 + 0.2, TQ.z1 - 0.2, { cor: COR.turquesaEscura, dy: 2.55 });
      P.presilha1 = cilindro(1.66, 0.6, 1.1, { cor: COR.turquesaEscura, dy: TQ.y, n: 20 });
      P.presilha2 = cilindro(1.66, 4.2, 4.7, { cor: COR.turquesaEscura, dy: TQ.y, n: 20 });
      P.miraTras1 = prisma(perfilArredondado(0.42, 1.0, 0.16), -3.0, -2.4, { cor: COR.coral, dx: -0.62, dy: 2.85 });
      P.miraTras2 = prisma(perfilArredondado(0.42, 1.0, 0.16), -3.0, -2.4, { cor: COR.coral, dx: 0.62, dy: 2.85 });
      // a luva de neoprene segurando o cabo e o braço com a roupa de mergulho
      const luva = { cor: misturar(COR.suave, COR.fundo, 0.5), brilho: 0.18, vinco: 0.2 };
      P.mao = mover(prismaY(perfilArredondado(3.6, 5.0, 1.5, 4), 0.4, -5.6, { ...luva, s1: 0.95, desloc: [0.35, -1.6, 0.35, -1.9] }), giroCabo);
      P.polegar = tubo(giroCabo(v(-1.5, -0.5, -2.4)), v(-1.68, 0.15, 0.6), 0.82, 0.7, luva);
      P.polegarPonta = tubo(v(-1.68, 0.15, 0.6), v(-1.58, 0.3, 1.5), 0.7, 0.42, luva);
      P.indicador1 = tubo(giroCabo(v(-1.25, -1.6, 0.7)), v(-1.0, -1.9, 2.55), 0.62, 0.56, luva);
      P.indicador2 = tubo(v(-1.0, -1.9, 2.55), v(-0.15, -2.15, 2.25), 0.56, 0.5, luva);
      [[-3.3, 0.85], [-4.5, 0.75], [-5.6, 0.65]].forEach(([y, r], i) => {
        P[`dedo${i}`] = tubo(giroCabo(v(-1.45, y, 0.9)), giroCabo(v(0.9, y - 0.1, 1.15)), r, r * 0.9, luva);
      });
      const pulso = giroCabo(v(0.5, -6.6, -2.6));
      const cotovelo = v(5.5, -16, -17);
      const rumo = unit(menos(cotovelo, pulso));
      const noBraco = (d) => mais(pulso, vezes(rumo, d));
      P.punho = tubo(pulso, noBraco(1.4), 2.55, 2.6, { cor: COR.turquesa, brilho: 0.2, n: 14 });
      P.braco = tubo(noBraco(1.3), cotovelo, 2.5, 3.6, { cor: misturar(COR.marinho, COR.fundo, 0.3), brilho: 0.1, vinco: 0.1, n: 14 });
      P.faixa = tubo(noBraco(5.5), noBraco(6.4), 2.85, 2.95, { cor: COR.turquesa, brilho: 0.2, n: 14 });
      return P;
    }
    const PECAS = Object.entries(modelo());
    // o vidro do tanque e a água ficam à parte: primeiro o fundo do vidro, depois a água, depois o vidro da frente
    const VIDRO = cilindro(TQ.r, TQ.z0, TQ.z1, { cor: COR.branco, dy: TQ.y, n: 20 });

    /* ---------- câmera e pose ---------- */
    let cam = { cx: 0, cy: 0, f: 1, k: 1 };
    let cascos = []; // o contorno de cada peça no desenho de agora (cada peça é convexa): para saber o que a pistola cobre
    let silhueta = null;
    const projetar = (p) => {
      const z = Math.max(0.5, p.z);
      return { x: cam.cx + (cam.f * p.x) / z, y: cam.cy - (cam.f * p.y) / z };
    };
    const emPe = (L, A) => A > L * 1.2;
    /** A câmera pelo tamanho da tela; em pé (celular), o centro da perspectiva desce para a pistola olhar para a frente */
    function camera(L, A) {
      const k = Math.min(A, L * 1.25);
      const pe = emPe(L, A);
      cam = { cx: L / 2, cy: pe ? A * 0.6 : A / 2, f: k * (pe ? 1.05 : 0.95), k };
      return cam;
    }
    /** A mão: presa no canto de baixo, à direita */
    const maoNaTela = (L, A) => {
      const k = Math.min(A, L * 1.25);
      return { x: L - k * 0.17, y: A - k * 0.085 };
    };
    const PROFUNDO = 31; // a que distância da câmera fica a mão
    /** As direções (guinada e arfagem) de um ponto da tela, vistas da câmera */
    const angulos = (x, y) => {
      const r = unit(v((x - cam.cx) / cam.f, -(y - cam.cy) / cam.f, 1));
      return [Math.atan2(r.x, r.z), Math.atan2(r.y, Math.hypot(r.x, r.z))];
    };
    /** Como nos jogos em primeira pessoa, o cano aponta para o meio da tela e acompanha só uma parte do caminho até a mira.
        Em pé, a pistola fica de três quartos, virada para a esquerda (de costas, o cano sumiria atrás dela). */
    function alvo(L, A, x, y) {
      camera(L, A);
      const pe = emPe(L, A);
      const [g0, a0] = pe ? [-0.62, 0.02] : angulos(L * 0.46, cam.cy - A * 0.03);
      const [g1, a1] = angulos(x, y);
      const segue = pe ? 0.35 : 0.5;
      return {
        guinada: Math.max(pe ? -0.8 : -0.5, Math.min(pe ? -0.2 : 0.12, g0 + (g1 - g0) * segue)),
        arfagem: Math.max(-0.2, Math.min(0.36, a0 + (a1 - a0) * segue)),
      };
    }
    /** A pose: a mão (no espaço da câmera), o giro, o coice (o bico sobe e a pistola recua) e um balanço bem leve */
    function pose(e) {
      camera(e.L, e.A);
      const m = maoNaTela(e.L, e.A);
      const mao = v(((m.x - cam.cx) * PROFUNDO) / cam.f, (-(m.y - cam.cy) * PROFUNDO) / cam.f, PROFUNDO);
      const c = e.coice || 0;
      const t = e.t || 0;
      const b = e.rm ? 0 : 1;
      const R = rotacao(e.guinada + c * 0.02, e.arfagem + c * 0.16 + Math.sin(t * 1.6) * 0.006 * b, -0.07 - c * 0.03);
      const pos = mais(mao, v(c * 0.35 + Math.sin(t * 0.8) * 0.08 * b, c * 0.45 + Math.sin(t * 1.6) * 0.1 * b, -c * 1.6));
      return { R, pos };
    }
    const paraCamera = (ps, q) => mais(ps.pos, ps.R(q));

    /* ---------- luz e cor ---------- */
    const LUZ = unit(v(-0.5, 0.78, -0.45)); // de cima, da esquerda, um pouco do nosso lado
    const RECHEIO = unit(v(0.7, -0.2, -0.6));
    function tom(base, n, centro, brilho) {
      const k = 0.42 + Math.max(0, ponto(n, LUZ)) * 0.62 + Math.max(0, ponto(n, RECHEIO)) * 0.18;
      const meio = unit(mais(LUZ, unit(vezes(centro, -1))));
      const esp = Math.pow(Math.max(0, ponto(n, meio)), 28) * brilho;
      const cor = k >= 1 ? misturar(base, COR.branco, Math.min(0.35, (k - 1) * 0.6)) : misturar(misturar(COR.fundo, base, 0.25), base, Math.max(0, Math.min(1, (k - 0.42) / 0.58)));
      return alfa(esp > 0.02 ? misturar(cor, COR.branco, Math.min(0.85, esp)) : cor);
    }
    /** As faces da peça já na câmera: a normal virada para fora, o centro e se ela está virada para nós */
    function facesNaCamera(p, vc) {
      const miolo = media(vc);
      return p.faces.map((f) => {
        const a = vc[f.idx[0]];
        const centro = media(f.idx.map((k) => vc[k]));
        let n = unit(cruz(menos(vc[f.idx[1]], a), menos(vc[f.idx[2]], a)));
        if (ponto(n, menos(centro, miolo)) < 0) n = vezes(n, -1);
        return { n, centro, vis: ponto(n, a) < 0 };
      });
    }
    const caminho = (c, idx, vp) => {
      c.beginPath();
      idx.forEach((k, j) => (j ? c.lineTo(vp[k].x, vp[k].y) : c.moveTo(vp[k].x, vp[k].y)));
      c.closePath();
    };

    /** Desenha uma peça convexa: as faces viradas para nós, os vincos finos e o contorno grosso */
    function desenharPeca(c, p, ps, local) {
      const vc = p.verts.map((q) => paraCamera(ps, local ? local(q) : q));
      const vp = vc.map(projetar);
      guardarCasco(vp);
      const frente = facesNaCamera(p, vc);
      // num anel vazado, primeiro o lado de dentro (escuro), depois o de fora
      if (p.vazado) {
        p.faces.forEach((f, i) => {
          if (frente[i].vis) return;
          caminho(c, f.idx, vp);
          c.fillStyle = alfa(misturar(p.cor, COR.fundo, 0.55));
          c.fill();
        });
      }
      c.lineWidth = 0.8;
      p.faces.forEach((f, i) => {
        if (!frente[i].vis) return;
        caminho(c, f.idx, vp);
        c.fillStyle = tom(p.cor, frente[i].n, frente[i].centro, p.brilho);
        c.fill();
        c.strokeStyle = c.fillStyle; // fecha a frestinha entre faces vizinhas
        c.stroke();
      });
      // contorno (aresta entre uma face virada para nós e uma de costas), vincos (entre faces visíveis bem diferentes) e a
      // borda aberta do anel: cada tipo vira um caminho só, riscado de uma vez
      const esp = Math.max(1.2, cam.k / 360);
      const tipos = { borda: [], contorno: [], vinco: [] };
      p.arestas.forEach((e) => {
        if (e.faces.length < 2) {
          if (p.vazado) tipos.borda.push(e);
          return;
        }
        const [f1, f2] = e.faces;
        const v1 = frente[f1].vis;
        const v2 = frente[f2].vis;
        if (v1 !== v2) tipos.contorno.push(e);
        else if (v1 && v2 && ponto(frente[f1].n, frente[f2].n) < 0.55) tipos.vinco.push(e);
      });
      [['vinco', alfa(COR.fundo, p.vinco), esp * 0.9], ['borda', alfa(COR.fundo, 0.85), esp * 1.6], ['contorno', alfa(COR.fundo, 0.9), esp * 2.1]].forEach(([tipo, cor, largura]) => {
        if (!tipos[tipo].length) return;
        c.beginPath();
        tipos[tipo].forEach((e) => {
          c.moveTo(vp[e.a].x, vp[e.a].y);
          c.lineTo(vp[e.b].x, vp[e.b].y);
        });
        c.strokeStyle = cor;
        c.lineWidth = largura;
        c.stroke();
      });
    }
    /** A distância do miolo da peça até a câmera, para desenhar do fundo para a frente */
    const profundidade = (p, ps) => {
      const m = paraCamera(ps, media(p.verts));
      return Math.hypot(m.x, m.y, m.z);
    };

    /* ---------- o tanque e a água: o tanque cortado por um plano horizontal do mundo ---------- */
    function cortar(poli, n, d) { // fica o lado com ponto(n, p) <= d
      const out = [];
      for (let i = 0; i < poli.length; i++) {
        const a = poli[i];
        const b = poli[(i + 1) % poli.length];
        const da = ponto(n, a) - d;
        const db = ponto(n, b) - d;
        if (da <= 0) out.push(a);
        if ((da <= 0) !== (db <= 0)) out.push(mais(a, vezes(menos(b, a), da / (da - db))));
      }
      return out;
    }
    function desenharTanque(c, ps, e) {
      const vc = VIDRO.verts.map((q) => paraCamera(ps, q));
      const vp = vc.map(projetar);
      guardarCasco(vp);
      const frente = facesNaCamera(VIDRO, vc);
      const poli = (pts) => {
        c.beginPath();
        pts.forEach((p, i) => {
          const q = projetar(p);
          if (i) c.lineTo(q.x, q.y);
          else c.moveTo(q.x, q.y);
        });
        c.closePath();
      };
      // 1. o fundo do vidro (as faces de trás, vistas por dentro)
      c.fillStyle = alfa(misturar(COR.azul, COR.fundo, 0.5), 0.35);
      VIDRO.faces.forEach((f, i) => {
        if (frente[i].vis) return;
        caminho(c, f.idx, vp);
        c.fill();
      });
      // 2. a água: o plano fica na horizontal do mundo, inclina quando a pistola gira e faz marola
      const nivel = Math.max(0, Math.min(1, e.nivel ?? 1));
      if (nivel > 0.01) {
        const eixo = unit(menos(paraCamera(ps, v(0, TQ.y, TQ.z1)), paraCamera(ps, v(0, TQ.y, TQ.z0))));
        const lado = unit(menos(paraCamera(ps, v(1, TQ.y, 0)), paraCamera(ps, v(0, TQ.y, 0))));
        const meio = paraCamera(ps, v(0, TQ.y, (TQ.z0 + TQ.z1) / 2));
        const marola = (e.slosh || 0) * Math.sin((e.t || 0) * 9) * 0.12;
        const cima = unit(mais(mais(v(0, 1, 0), vezes(lado, (e.tilt || 0) * 0.6)), vezes(eixo, marola)));
        const alto = TQ.r * Math.sqrt(Math.max(0, 1 - ponto(eixo, cima) ** 2)) + ((TQ.z1 - TQ.z0) / 2) * Math.abs(ponto(eixo, cima));
        const d = ponto(cima, meio) + alto * (2 * nivel - 1) * 0.92;
        const agua = [];
        const corte = [];
        VIDRO.faces.forEach((f, i) => {
          const pts = cortar(f.idx.map((k) => vc[k]), cima, d);
          if (pts.length >= 3) agua.push({ pts, n: frente[i].n });
          pts.forEach((p) => { if (Math.abs(ponto(cima, p) - d) < 1e-6) corte.push(p); });
        });
        if (corte.length >= 3) { // a superfície: os pontos do corte, em volta do miolo
          const cen = media(corte);
          const u = unit(cruz(cima, eixo));
          const w = cruz(cima, u);
          const sup = corte.map((p) => ({ p, a: Math.atan2(ponto(menos(p, cen), w), ponto(menos(p, cen), u)) })).sort((a, b) => a.a - b.a).map((x) => x.p);
          agua.push({ pts: sup, n: cima, sup: true });
        }
        agua.forEach((f) => {
          if (ponto(f.n, f.pts[0]) >= 0) return;
          poli(f.pts);
          c.fillStyle = f.sup ? alfa(misturar(COR.claro, COR.branco, 0.25), 0.95) : alfa(misturar(COR.turquesa, COR.claro, 0.3 + Math.max(0, ponto(f.n, LUZ)) * 0.6), 0.9);
          c.fill();
          if (f.sup) { // a linha d'água brilha
            c.strokeStyle = alfa(COR.branco, 0.85);
            c.lineWidth = Math.max(1, cam.k / 500);
            c.stroke();
          }
        });
        // as bolhas: só as que estão embaixo da linha d'água
        c.strokeStyle = alfa(COR.branco, 0.85);
        c.lineWidth = 1;
        (e.bolhas || []).forEach((b) => {
          const p = paraCamera(ps, b);
          if (ponto(cima, p) > d - 0.2) return;
          const q = projetar(p);
          c.beginPath();
          c.arc(q.x, q.y, Math.max(1, (cam.f * b.r) / p.z), 0, Math.PI * 2);
          c.stroke();
        });
      }
      // 3. o vidro da frente, com o reflexo do lado da luz, e o contorno
      VIDRO.faces.forEach((f, i) => {
        if (!frente[i].vis) return;
        caminho(c, f.idx, vp);
        c.fillStyle = alfa(misturar(COR.azul, COR.branco, 0.6), 0.1 + Math.pow(Math.max(0, ponto(frente[i].n, LUZ)), 5) * 0.5);
        c.fill();
      });
      c.beginPath();
      VIDRO.arestas.forEach((a) => {
        if (a.faces.length < 2 || frente[a.faces[0]].vis === frente[a.faces[1]].vis) return;
        c.moveTo(vp[a.a].x, vp[a.a].y);
        c.lineTo(vp[a.b].x, vp[a.b].y);
      });
      c.strokeStyle = alfa(COR.fundo, 0.85);
      c.lineWidth = Math.max(1.2, cam.k / 360) * 2;
      c.stroke();
    }

    /** Guarda o contorno de uma peça, com a caixa em volta (para descartar rápido) */
    function guardarCasco(vp) {
      const pts = contorno(vp);
      if (!pts) return;
      const xs = pts.map((q) => q.x);
      const ys = pts.map((q) => q.y);
      cascos.push({ pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
    }
    /** O contorno convexo dos pontos (cadeia monótona) */
    function contorno(pts) {
      const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
      if (p.length < 3) return null;
      const giro = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
      const baixo = [];
      const cima = [];
      p.forEach((q) => {
        while (baixo.length >= 2 && giro(baixo[baixo.length - 2], baixo[baixo.length - 1], q) <= 0) baixo.pop();
        baixo.push(q);
      });
      for (let i = p.length - 1; i >= 0; i--) {
        while (cima.length >= 2 && giro(cima[cima.length - 2], cima[cima.length - 1], p[i]) <= 0) cima.pop();
        cima.push(p[i]);
      }
      return baixo.slice(0, -1).concat(cima.slice(0, -1));
    }

    /* ---------- desenho ---------- */
    function desenhar(c, e) {
      const ps = pose(e);
      const bomba = (e.bomba || 0) * -2.2; // a bomba vai e volta na recarga
      const puxa = (e.coice || 0) * -0.5; // o gatilho puxa no tiro
      const local = { bomba: (q) => mais(q, v(0, 0, bomba)), gatilho: (q) => mais(q, v(0, 0, puxa)) };
      const lista = PECAS.map(([k, p]) => ({ k, p, d: profundidade(p, ps) }));
      lista.push({ k: 'tanque', p: VIDRO, d: profundidade(VIDRO, ps) + 0.6 });
      lista.sort((a, b) => b.d - a.d);
      cascos = [];
      c.save();
      c.lineJoin = 'round';
      c.lineCap = 'round';
      lista.forEach(({ k, p }) => (k === 'tanque' ? desenharTanque(c, ps, e) : desenharPeca(c, p, ps, local[k])));
      // o manômetro, na lateral esquerda do corpo: o ponteiro mostra quanta água ainda tem
      const c0 = paraCamera(ps, v(-1.46, 1.55, -1.9));
      if (ponto(unit(menos(paraCamera(ps, v(-2.46, 1.55, -1.9)), c0)), c0) < 0) {
        const q = projetar(c0);
        const r = (cam.f * 0.85) / c0.z;
        const ex = projetar(paraCamera(ps, v(-1.46, 1.55, -1.05)));
        const ey = projetar(paraCamera(ps, v(-1.46, 2.4, -1.9)));
        c.save();
        c.translate(q.x, q.y);
        c.transform((ex.x - q.x) / r, (ex.y - q.y) / r, (ey.x - q.x) / r, (ey.y - q.y) / r, 0, 0);
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fillStyle = COR.perola;
        c.fill();
        c.lineWidth = r * 0.18;
        c.strokeStyle = alfa(COR.fundo, 0.9);
        c.stroke();
        c.strokeStyle = COR.coral;
        c.lineWidth = r * 0.12;
        c.beginPath();
        c.arc(0, 0, r * 0.7, Math.PI * 0.75, Math.PI * 1.05);
        c.stroke();
        const pa = Math.PI * 0.75 + Math.max(0, Math.min(1, e.nivel ?? 1)) * Math.PI * 1.5;
        c.strokeStyle = COR.escuro;
        c.lineWidth = r * 0.14;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(pa) * r * 0.72, Math.sin(pa) * r * 0.72);
        c.stroke();
        c.restore();
      }
      // o furo do bico
      const fb = paraCamera(ps, v(0, 1.0, 17.95));
      const qb = projetar(fb);
      c.fillStyle = alfa(COR.fundo, 0.85);
      c.beginPath();
      c.arc(qb.x, qb.y, Math.max(1.5, (cam.f * 0.42) / fb.z), 0, Math.PI * 2);
      c.fill();
      c.restore();
      silhueta = contorno(cascos.flatMap((k) => k.pts));
    }
    /** A ponta do bico na tela (de onde a água sai), a direção do cano na tela e o raio do furo */
    function bico(e) {
      const ps = pose(e);
      const p = paraCamera(ps, BICO);
      const a = projetar(p);
      const b = projetar(paraCamera(ps, v(0, 1.0, 30)));
      return { x: a.x, y: a.y, a: Math.atan2(b.y - a.y, b.x - a.x), r: (cam.f * 0.42) / Math.max(0.5, p.z) };
    }
    /** O ponto fica dentro de um contorno convexo? */
    function dentro(s, x, y) {
      let sinal = 0;
      for (let i = 0; i < s.length; i++) {
        const a = s[i];
        const b = s[(i + 1) % s.length];
        const g = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
        if (!g) continue;
        if (!sinal) sinal = Math.sign(g);
        else if (Math.sign(g) !== sinal) return false;
      }
      return true;
    }
    /** O ponto (x, y) fica atrás de alguma peça da pistola no último desenho? */
    const cobre = (x, y) => cascos.some((k) => x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1 && dentro(k.pts, x, y));
    return { alvo, desenhar, bico, cobre, silhueta: () => silhueta, mao: maoNaTela, tanque: TQ };
  },
};

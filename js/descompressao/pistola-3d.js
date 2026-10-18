/*
 * Tiro ao Alvo: a pistola d'água em primeira pessoa (2026-10-17, pedido do usuário: a mesma visão dos jogos de tiro em
 * primeira pessoa, mas de água). A pistola fica no canto de baixo, à direita, vista por trás e segura por uma mão de
 * luva de mergulho, com o braço na roupa de neoprene. O desenho é nosso: uma pistola d'água de brinquedo com tanque
 * transparente, tampinha de encher, presilhas, manômetro, cano com anéis, mira, bomba e bico.
 * Um modelo 3D pequeno (prismas e cilindros) projetado em perspectiva no <canvas>: luz de cima, vincos finos, contorno de
 * figurinha e a água do tanque sempre na horizontal do mundo (cortada por um plano), com marola e bolhas.
 * A luva (2026-10-18, pedido do usuário: "deixa mais real") é feita de peças macias: o contorno de esferas, liso e com a
 * sombra em degradê (sem facetas), dedos em falanges com as dobras nas juntas, costuras e o punho com a tira. As peças
 * macias seguidas formam um grupo: a borda forte vai só em volta dele, e dentro fica a dobra fraca onde uma encosta na outra.
 * Pistola3D.criar({ COR }) devolve:
 *   alvo(L, A, x, y) → { guinada, arfagem }: a pose que a pistola quer para mirar em (x, y) (ela segue a mira só em parte)
 *   desenhar(c, e)   → desenha no contexto c; e = { L, A, guinada, arfagem, t, coice, nivel, bomba, slosh, tilt, bolhas, rm }
 *   bico(e)          → { x, y, a, r }: a ponta do bico na tela, a direção do cano na tela e o raio do furo
 *   silhueta()       → o contorno (convexo) da pistola inteira no último desenho, em px da tela
 *   contornoDe(e)    → o mesmo contorno numa pose qualquer, sem desenhar (é só conta: o Tiro de Reflexo usa para saber
 *                      onde a pistola pode tampar em todas as poses)
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
    /** Rotação: rolagem (em volta de z), depois arfagem (em volta de x; o bico desce com ângulo positivo), depois guinada
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
    /** Move e gira uma peça (no espaço da pistola) */
    function mover(p, giro, desloc = v(0, 0, 0)) {
      p.verts = p.verts.map((q) => mais(giro ? giro(q) : q, desloc));
      return p;
    }

    /** Peça macia (a luva e a manga), desenhada lisa, com a sombra em degradê e sem facetas. Os centros das esferas (ou dos
        anéis) ficam em verts: assim a ordem de desenho vale para ela. Tipos (o.tipo):
          'bola'   o contorno convexo de algumas esferas (a palma, a base do polegar)
          'dedo'   esferas em fila, ligadas duas a duas (as falanges); a linha entre elas some e fica só a dobra
          'tronco' a parede de um cilindro entre dois anéis (o punho, a manga, as faixas), sem as tampas
        o.costura: o lado (uma direção) por onde corre uma costura; o.anel: costura em volta, no começo do dedo (0 a 1);
        o.sobre: a peça que ela veste (desenhada logo depois dela) */
    function macia(esferas, o = {}) {
      return { macia: o.tipo || 'bola', verts: esferas.map((s) => s[0]), raios: esferas.map((s) => s[1]), cor: o.cor, brilho: o.brilho ?? 0.3, costura: o.costura || null, anel: o.anel ?? null, sobre: o.sobre || null };
    }

    /* ---------- o modelo ---------- */
    const TQ = { y: 3.75, r: 1.55, z0: -1.2, z1: 6.6 }; // o tanque: altura do eixo, raio e onde começa e termina
    const BICO = v(0, 1.0, 18.0); // de onde a água sai
    const giroCabo = rotacao(0, 0.2, 0); // o cabo inclina para trás, como numa pistola de verdade
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
      P.guardaBaixo = prisma(perfilArredondado(0.7, 0.6, 0.25), -0.4, 4.6, { cor: COR.turquesaEscura, dy: -3.4 });
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
      // A mão direita de luva de mergulho (2026-10-18, pedido do usuário: "deixa mais real"). Peças macias: o contorno de
      // algumas esferas, liso e com a sombra em degradê (sem facetas); os dedos em falanges, com as juntas marcando as dobras.
      // As medidas são do cabo antes de ele inclinar (G gira junto com o cabo): o cabo vai de x -1,3 a 1,3, de z -3,2 (as
      // costas) a 0,6 (a frente) e de y -0,2 a -9,2. A palma e o dorso ficam do lado direito do cabo e o calcanhar da mão
      // atrás; o polegar corre pelo lado esquerdo da armação, o indicador vai no gatilho e os outros três dedos dão a volta
      // na frente do cabo, com as pontas no lado esquerdo.
      const G = (x, y, z) => giroCabo(v(x, y, z));
      const luva = { cor: misturar(COR.fundo, COR.suave, 0.4), brilho: 0.32 };
      // a mão: o dorso e a palma (do lado direito e atrás do cabo) e a base do polegar, com o vão até o indicador
      P.mao = macia([[G(1.95, -1.3, -1.15), 1.0], [G(1.95, -6.75, -1.0), 0.85], [G(0.55, -1.35, -3.75), 1.1], [G(0.8, -5.6, -4.15), 1.35], [G(2.35, -3.9, -2.55), 1.25]], luva);
      P.tenar = macia([[G(-0.1, -0.75, -3.45), 0.95], [G(-1.15, -1.75, -3.0), 1.0], [G(-0.75, -3.7, -3.55), 1.15]], luva);
      // o polegar deitado na armação, com a costura por cima e a costura em volta da base
      P.polegar = macia([[G(-1.5, -1.45, -2.45), 0.9], [v(-1.98, -0.38, -0.75), 0.82], [v(-2.0, -0.08, 0.8), 0.74]], { ...luva, tipo: 'dedo', costura: v(-0.55, 0.83, 0), anel: 0.2 });
      // o indicador: a falange de baixo corre pelo lado direito da armação e as outras abraçam o gatilho (a ponta aparece
      // do lado esquerdo dele)
      P.indicadorBase = macia([[G(2.0, -1.3, -0.9), 0.66], [v(1.35, -1.55, 1.45), 0.6]], { ...luva, tipo: 'dedo' });
      P.indicador = macia([[v(1.35, -1.55, 1.45), 0.6], [v(0.25, -1.95, 2.25), 0.55], [v(-0.75, -2.2, 1.95), 0.5]], { ...luva, tipo: 'dedo' });
      // médio, anelar e mínimo: a falange de baixo do lado direito do cabo, as outras dando a volta na frente dele (as
      // pontas ficam do lado esquerdo)
      [[-4.3, 0.64], [-5.7, 0.6], [-7.0, 0.52]].forEach(([y, r], d) => {
        const junta = G(1.45, y - 0.05, 1.3);
        P[`dedoBase${d}`] = macia([[G(2.05, y, -1.0), r], [junta, r]], { ...luva, tipo: 'dedo' });
        P[`dedo${d}`] = macia([[junta, r], [G(-0.55, y - 0.1, 1.45), r * 0.93], [G(-1.75, y + 0.05, 0.25), r * 0.86]], { ...luva, tipo: 'dedo' });
      });
      // o punho da luva com a tira, e o braço com a roupa de mergulho e a faixa
      const pulso = G(0.85, -6.5, -4.55);
      const cotovelo = v(5.5, -16, -17);
      const rumo = unit(menos(cotovelo, pulso));
      const noBraco = (d) => mais(pulso, vezes(rumo, d));
      const tronco = { tipo: 'tronco' };
      P.punho = macia([[noBraco(-0.4), 2.0], [noBraco(2.3), 2.25]], { ...luva, ...tronco });
      P.tira = macia([[noBraco(0.6), 2.3], [noBraco(1.5), 2.33]], { cor: COR.turquesa, brilho: 0.2, ...tronco, sobre: 'punho' });
      P.braco = macia([[noBraco(2.1), 2.3], [cotovelo, 3.4]], { cor: misturar(COR.marinho, COR.fundo, 0.3), brilho: 0.12, ...tronco });
      P.faixa = macia([[noBraco(5.5), 2.62], [noBraco(6.4), 2.75]], { cor: COR.turquesa, brilho: 0.2, ...tronco, sobre: 'braco' });
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
    /** A mão: presa no canto de baixo, à direita. Onde a tela tem altura, ela sobe um pouco para a luva aparecer; no
        celular deitado, não (ali a pistola já chega perto do trilho do meio) */
    const maoNaTela = (L, A) => {
      const k = Math.min(A, L * 1.25);
      return { x: L - k * 0.17, y: A - k * (0.085 + 0.04 * Math.max(0, Math.min(1, (A - 420) / 200))) };
    };
    const PROFUNDO = 31; // a que distância da câmera fica a mão
    const PIVO = v(0, 3.5, 11); // o ponto em volta do qual a pistola sobe e desce o bico
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
      // a rotação abaixa o bico com arfagem positiva: aqui o sinal vira, para o bico subir quando a mira sobe (e no coice)
      const R = rotacao(e.guinada + c * 0.02, -(e.arfagem + c * 0.16 + Math.sin(t * 1.6) * 0.006 * b), -0.07 - c * 0.03);
      const base = mais(mao, v(c * 0.35 + Math.sin(t * 0.8) * 0.08 * b, c * 0.45 + Math.sin(t * 1.6) * 0.1 * b, -c * 1.6));
      // a arfagem gira em volta da frente do corpo, não da mão: o bico sobe, a mão desce um pouco e o alto da pistola fica
      // no lugar (ela não passa do trilho do meio)
      const R0 = rotacao(e.guinada + c * 0.02, 0, -0.07 - c * 0.03);
      return { R, pos: mais(base, menos(R0(PIVO), R(PIVO))) };
    }
    const paraCamera = (ps, q) => mais(ps.pos, ps.R(q));

    /* ---------- luz e cor ---------- */
    const LUZ = unit(v(-0.5, 0.78, -0.45)); // de cima, da esquerda, um pouco do nosso lado
    const RECHEIO = unit(v(0.7, -0.2, -0.6));
    /** A cor de um ponto da peça pela normal: luz, recheio e o brilho (expoente menor espalha o brilho, como no tecido da
        luva); "meio" (entre a luz e a vista) pode vir pronto quando a mesma peça pede várias cores */
    function tom(base, n, centro, brilho, expoente = 28, meio = unit(mais(LUZ, unit(vezes(centro, -1))))) {
      const k = 0.42 + Math.max(0, ponto(n, LUZ)) * 0.62 + Math.max(0, ponto(n, RECHEIO)) * 0.18;
      const esp = Math.pow(Math.max(0, ponto(n, meio)), expoente) * brilho;
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
    /** Um círculo no espaço (centro, raio e a normal do plano dele), projetado na tela em n pontos */
    function circuloNaTela(centro, r, normal, n, pts) {
      const a = unit(cruz(normal, Math.abs(normal.y) < 0.9 ? v(0, 1, 0) : v(1, 0, 0)));
      const b = cruz(normal, a);
      for (let j = 0; j < n; j++) {
        const t = (j / n) * Math.PI * 2;
        pts.push(projetar(mais(centro, mais(vezes(a, r * Math.cos(t)), vezes(b, r * Math.sin(t))))));
      }
    }
    /** O contorno liso: a curva passa pelo meio de cada lado do contorno convexo */
    function liso(c, pts) {
      const n = pts.length;
      const meio = (i) => ({ x: (pts[i].x + pts[(i + 1) % n].x) / 2, y: (pts[i].y + pts[(i + 1) % n].y) / 2 });
      const m0 = meio(n - 1);
      c.beginPath();
      c.moveTo(m0.x, m0.y);
      for (let i = 0; i < n; i++) {
        const m = meio(i);
        c.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
      }
      c.closePath();
    }
    /** O centro, os eixos e o giro do contorno (pelos momentos da área): a elipse que mais se parece com ele */
    function forma(pts) {
      const o = pts[0];
      let A = 0;
      let cx = 0;
      let cy = 0;
      let xx = 0;
      let yy = 0;
      let xy = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const x0 = pts[i].x - o.x;
        const y0 = pts[i].y - o.y;
        const x1 = pts[j].x - o.x;
        const y1 = pts[j].y - o.y;
        const k = x0 * y1 - x1 * y0;
        A += k;
        cx += (x0 + x1) * k;
        cy += (y0 + y1) * k;
        xx += (x0 * x0 + x0 * x1 + x1 * x1) * k;
        yy += (y0 * y0 + y0 * y1 + y1 * y1) * k;
        xy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * k;
      }
      A /= 2;
      if (Math.abs(A) < 1e-6) return null;
      cx /= 6 * A;
      cy /= 6 * A;
      const sxx = xx / (12 * A) - cx * cx;
      const syy = yy / (12 * A) - cy * cy;
      const sxy = xy / (24 * A) - cx * cy;
      const m = (sxx + syy) / 2;
      const d = Math.hypot((sxx - syy) / 2, sxy);
      return { x: cx + o.x, y: cy + o.y, ang: 0.5 * Math.atan2(2 * sxy, sxx - syy), a: Math.max(1, 2 * Math.sqrt(m + d)), b: Math.max(1, 2 * Math.sqrt(Math.max(0, m - d))) };
    }
    /** O contorno de uma esfera na tela: a vista tangencia a esfera num círculo um pouco mais perto da câmera */
    function esferaNaTela(q, r, pts) {
      const d2 = ponto(q, q);
      if (d2 <= r * r * 1.05) return;
      const k = 1 - (r * r) / d2;
      circuloNaTela(vezes(q, k), r * Math.sqrt(k), unit(q), 12, pts);
    }
    /** A sombra de um pedaço comprido (uma falange, o punho): faixas ao longo do eixo, como num cilindro. Devolve false
        quando o eixo aponta para a câmera (aí a sombra redonda fica melhor) */
    function sombraCilindro(c, p, a, b, rm) {
      const centro = vezes(mais(a, b), 0.5);
      const w = unit(menos(b, a));
      const V = unit(vezes(centro, -1));
      const deLado = menos(V, vezes(w, ponto(V, w)));
      if (Math.hypot(deLado.x, deLado.y, deLado.z) < 0.5) return false;
      const fr = unit(deLado);
      const e = cruz(w, fr);
      const q0 = projetar(mais(centro, vezes(e, -rm)));
      const q1 = projetar(mais(centro, vezes(e, rm)));
      const g = c.createLinearGradient(q0.x, q0.y, q1.x, q1.y);
      const meio = unit(mais(LUZ, V));
      [-1, -0.85, -0.5, 0, 0.5, 0.85, 1].forEach((u) => g.addColorStop((u + 1) / 2, tom(p.cor, unit(mais(vezes(fr, Math.sqrt(1 - u * u)), vezes(e, u))), centro, p.brilho, 9, meio)));
      c.fillStyle = g;
      c.fill();
      return true;
    }
    /** A sombra de uma bola: um degradê redondo, esticado na forma do contorno, mais claro do lado da luz */
    function sombraBola(c, p, centro, casco) {
      const f = forma(casco);
      if (!f) return;
      const V = unit(vezes(centro, -1));
      const L3 = menos(LUZ, vezes(V, ponto(LUZ, V)));
      const b3 = Math.hypot(L3.x, L3.y, L3.z);
      const d3 = b3 > 1e-3 ? vezes(L3, 1 / b3) : v(0, 1, 0);
      const q0 = projetar(centro);
      const q1 = projetar(mais(centro, vezes(d3, 0.5)));
      const co = Math.cos(-f.ang);
      const si = Math.sin(-f.ang);
      const dx = q1.x - q0.x;
      const dy = q1.y - q0.y;
      let ux = (dx * co - dy * si) / f.a;
      let uy = (dx * si + dy * co) / f.b;
      const un = Math.hypot(ux, uy) || 1;
      ux /= un;
      uy /= un;
      const xf = (b3 + Math.max(0, ponto(unit(mais(LUZ, V)), d3))) / 2; // entre o ponto mais claro e o brilho
      const s = 0.25;
      c.save();
      c.translate(f.x, f.y);
      c.rotate(f.ang);
      c.scale(f.a, f.b);
      const g = c.createRadialGradient(ux * xf, uy * xf, 0, ux * s, uy * s, 1 + s);
      const meio = unit(mais(LUZ, V));
      [0, 0.15, 0.32, 0.5, 0.68, 0.86, 1].forEach((t) => {
        const x = Math.max(-1, xf - t * (1 + xf));
        g.addColorStop(t, tom(p.cor, unit(mais(vezes(d3, x), vezes(V, Math.sqrt(1 - x * x)))), centro, p.brilho, 9, meio));
      });
      c.fillStyle = g;
      c.fill();
      c.restore();
    }
    /** A borda das peças macias, sempre por baixo do preenchimento (que cobre a metade de dentro; por isso a largura
        dobra). "fora": a borda forte, em volta do grupo de peças macias vizinhas; sem ela, a dobra fraca onde uma peça do
        grupo encosta na outra, com uma sombrinha larga */
    function borda(c, pts, esp, fora) {
      liso(c, pts);
      c.strokeStyle = alfa(COR.fundo, fora ? 0.2 : 0.12);
      c.lineWidth = esp * (fora ? 6.4 : 4.4);
      c.stroke();
      c.strokeStyle = alfa(COR.fundo, fora ? 0.88 : 0.5);
      c.lineWidth = esp * (fora ? 2.6 : 1.5);
      c.stroke();
    }
    /** Uma linha na tela (os pontos já projetados, em trechos), com o traço e a cor dados */
    function riscar(c, trechos, cor, largura, tracos) {
      c.beginPath();
      trechos.forEach((tr) => tr.forEach((q, j) => (j ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))));
      if (tracos) c.setLineDash(tracos);
      c.strokeStyle = cor;
      c.lineWidth = largura;
      c.stroke();
      if (tracos) c.setLineDash([]);
    }
    /** A costura de verdade: o vinco escuro e os pontos claros por cima */
    function pesponto(c, p, trechos, esp) {
      riscar(c, trechos, alfa(COR.fundo, 0.4), esp * 0.9);
      riscar(c, trechos, alfa(misturar(p.cor, COR.branco, 0.45), 0.55), esp * 0.55, [esp * 1.3, esp * 1.5]);
    }
    /** Os pontos de um anel em volta do eixo (no plano perpendicular a ele), separados em trechos virados para nós.
        "So" escolhe só a parte do anel que vai para um lado (o dorso do dedo) */
    function anelNaTela(centro, r, eixo, so, limite = 0, N = 24) {
      const a = unit(cruz(eixo, Math.abs(eixo.y) < 0.9 ? v(0, 1, 0) : v(1, 0, 0)));
      const b = cruz(eixo, a);
      const marca = [];
      for (let j = 0; j < N; j++) {
        const t = (j / N) * Math.PI * 2;
        const n = mais(vezes(a, Math.cos(t)), vezes(b, Math.sin(t)));
        const q = mais(centro, vezes(n, r));
        marca.push({ q, ok: ponto(n, unit(q)) < -limite && (!so || ponto(n, so) > 0.15) });
      }
      const k0 = marca.findIndex((x, j) => x.ok && !marca[(j + N - 1) % N].ok);
      if (k0 < 0) return [];
      const trechos = [[]];
      for (let j = 0; j < N; j++) {
        const x = marca[(k0 + j) % N];
        if (x.ok) trechos[trechos.length - 1].push(projetar(x.q));
        else if (trechos[trechos.length - 1].length) trechos.push([]);
      }
      return trechos.filter((tr) => tr.length > 1);
    }
    /** Uma bola: o contorno convexo das esferas */
    function prepararBola(p, vc, esp) {
      const pts = [];
      vc.forEach((q, i) => esferaNaTela(q, p.raios[i], pts));
      const casco = contorno(pts);
      if (!casco) return null;
      guardarContorno(casco);
      return {
        contornos: [casco],
        pintar(c) {
          borda(c, casco, esp);
          liso(c, casco);
          sombraBola(c, p, media(vc), casco);
        },
      };
    }
    /** Um dedo: as falanges (cada uma, o contorno de duas esferas); as bordas vão todas antes dos preenchimentos, para a
        linha entre as falanges sumir; depois vêm as dobras das juntas e as costuras */
    function prepararDedo(p, vc, ps, esp) {
      const fal = [];
      for (let i = 0; i + 1 < vc.length; i++) {
        const pts = [];
        esferaNaTela(vc[i], p.raios[i], pts);
        esferaNaTela(vc[i + 1], p.raios[i + 1], pts);
        const casco = contorno(pts);
        const m = vezes(mais(vc[i], vc[i + 1]), 0.5);
        if (casco) fal.push({ i, casco, d: Math.hypot(m.x, m.y, m.z) });
      }
      if (!fal.length) return null;
      fal.sort((a, b) => b.d - a.d);
      fal.forEach((f) => guardarContorno(f.casco));
      return {
        contornos: fal.map((f) => f.casco),
        pintar(c) {
          fal.forEach((f) => borda(c, f.casco, esp));
          fal.forEach((f) => {
            liso(c, f.casco);
            if (!sombraCilindro(c, p, vc[f.i], vc[f.i + 1], (p.raios[f.i] + p.raios[f.i + 1]) / 2)) sombraBola(c, p, vezes(mais(vc[f.i], vc[f.i + 1]), 0.5), f.casco);
          });
          const dorso = p.costura ? ps.R(p.costura) : null;
          // as dobras: dois risquinhos em volta de cada junta, no dorso do dedo (o polegar, o que mais aparece)
          for (let i = 1; dorso && i + 1 < vc.length; i++) {
            const eixo = unit(mais(unit(menos(vc[i + 1], vc[i])), unit(menos(vc[i], vc[i - 1]))));
            [-0.18, 0.16].forEach((d) => riscar(c, anelNaTela(mais(vc[i], vezes(eixo, d * p.raios[i])), p.raios[i] * 0.99, eixo, dorso, 0.2), alfa(COR.fundo, 0.3), esp * 0.8));
          }
          // a costura em volta da base (onde o dedo é costurado na luva)
          if (p.anel != null) {
            const eixo = unit(menos(vc[1], vc[0]));
            const r = p.raios[0] + (p.raios[1] - p.raios[0]) * p.anel;
            pesponto(c, p, anelNaTela(mais(vc[0], vezes(menos(vc[1], vc[0]), p.anel)), r * 0.99, eixo, null, 0.1), esp);
          }
          // a costura pelo dorso, de ponta a ponta
          if (dorso) {
            const trechos = [[]];
            const t0 = Math.max(0.04, (p.anel ?? 0) + 0.08);
            for (let i = 0; i + 1 < vc.length; i++) {
              const w = unit(menos(vc[i + 1], vc[i]));
              const s = unit(menos(dorso, vezes(w, ponto(dorso, w))));
              const ini = i ? 0 : t0;
              const fim = i + 2 === vc.length ? 0.92 : 1;
              for (let j = i ? 1 : 0; j <= 6; j++) {
                const t = ini + (j / 6) * (fim - ini);
                const q = mais(mais(vc[i], vezes(menos(vc[i + 1], vc[i]), t)), vezes(s, (p.raios[i] + (p.raios[i + 1] - p.raios[i]) * t) * 0.97));
                if (ponto(s, unit(q)) < -0.12) trechos[trechos.length - 1].push(projetar(q));
                else if (trechos[trechos.length - 1].length) trechos.push([]);
              }
            }
            pesponto(c, p, trechos.filter((tr) => tr.length > 1), esp);
          }
        },
      };
    }
    /** Um tronco: só a parede, entre o lado visível de cada anel */
    function prepararTronco(p, vc, esp) {
      const eixo = unit(menos(vc[1], vc[0]));
      const lado = (q, r) => anelNaTela(q, r, eixo, null, 0, 20).flat();
      const a0 = lado(vc[0], p.raios[0]);
      const a1 = lado(vc[1], p.raios[1]);
      if (a0.length < 2 || a1.length < 2) return null;
      const poli = a0.concat(a1.reverse());
      const casco = contorno(poli);
      if (casco) guardarContorno(casco);
      return {
        contornos: [poli],
        pintar(c) {
          borda(c, poli, esp);
          liso(c, poli);
          if (!sombraCilindro(c, p, vc[0], vc[1], (p.raios[0] + p.raios[1]) / 2) && casco) sombraBola(c, p, media(vc), casco);
        },
      };
    }
    /** Prepara uma peça macia: devolve os contornos (para a borda do grupo) e a pintura */
    function prepararMacia(p, ps, esp) {
      const vc = p.verts.map((q) => paraCamera(ps, q));
      if (p.macia === 'dedo') return prepararDedo(p, vc, ps, esp);
      if (p.macia === 'tronco') return prepararTronco(p, vc, esp);
      return prepararBola(p, vc, esp);
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

    /** Guarda o contorno convexo dos pontos de uma peça */
    function guardarCasco(vp) {
      const pts = contorno(vp);
      if (pts) guardarContorno(pts);
    }
    /** Guarda um contorno já pronto, com a caixa em volta (para descartar rápido) */
    function guardarContorno(pts) {
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
      const fundo = Object.fromEntries(lista.map((x) => [x.k, x.d]));
      lista.forEach((x) => { if (x.p.sobre) x.d = fundo[x.p.sobre] - 0.01; }); // o que veste outra peça vem logo depois dela
      lista.push({ k: 'tanque', p: VIDRO, d: profundidade(VIDRO, ps) + 0.6 });
      lista.sort((a, b) => b.d - a.d);
      cascos = [];
      c.save();
      c.lineJoin = 'round';
      c.lineCap = 'round';
      const esp = Math.max(1.2, cam.k / 360);
      for (let i = 0; i < lista.length;) {
        const { k, p } = lista[i];
        if (!p.macia) {
          if (k === 'tanque') desenharTanque(c, ps, e);
          else desenharPeca(c, p, ps, local[k]);
          i++;
          continue;
        }
        // as peças macias seguidas (a mão, os dedos, o punho, a manga): a borda forte vai em volta do grupo todo e, dentro
        // dele, cada peça marca só uma dobra fraca onde encosta na outra
        const grupo = [];
        for (; i < lista.length && lista[i].p.macia; i++) {
          const m = prepararMacia(lista[i].p, ps, esp);
          if (m) grupo.push(m);
        }
        grupo.forEach((m) => m.contornos.forEach((pts) => borda(c, pts, esp, true)));
        grupo.forEach((m) => m.pintar(c));
      }
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
    /** O contorno (convexo) da pistola inteira na pose e, sem desenhar nada: as pontas das peças duras e do tanque e a
        borda das esferas das peças macias, projetadas. Cobre um tiquinho mais que silhueta() (as esferas inteiras) */
    function contornoDe(e) {
      const ps = pose(e);
      const pts = [];
      for (const [, p] of PECAS) {
        const vc = p.verts.map((q) => paraCamera(ps, q));
        if (p.macia) vc.forEach((q, i) => esferaNaTela(q, p.raios[i] * 1.06, pts));
        else vc.forEach((q) => pts.push(projetar(q)));
      }
      VIDRO.verts.forEach((q) => pts.push(projetar(paraCamera(ps, q))));
      return contorno(pts);
    }
    return { alvo, desenhar, bico, cobre, silhueta: () => silhueta, contornoDe, mao: maoNaTela, tanque: TQ };
  },
};

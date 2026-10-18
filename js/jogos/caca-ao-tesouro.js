/*
 * Caça ao Tesouro (caca-ao-tesouro) — um mapa do fundo do mar com paradas; cada pergunta
 * respondida libera o próximo trecho até o baú de pérolas. Cada caça é gerada diferente:
 * perguntas sorteadas e em ordem crescente de dificuldade.
 * Erro custa 1 oxigênio (3 no total); sem oxigênio, termina com prêmio parcial.
 * Baú final: +25 XP e +5 pérolas.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): a areia de um naufrágio, com raios de luz, algas, peixes e moedas
 * que brilham; a cada trecho a cena anda (o caminho) e o baú do fundo aparece e brilha mais. A carta náutica fica presa
 * no alto: no acerto o mergulhador nada pelo trecho que abriu; no erro, as bolhas escapam do tanque. Regras, oxigênio,
 * bônus e XP iguais; o fim fica no próprio jogo, com "Jogar de novo" (outra caça, outro caminho).
 */
Jogos.registrar({
  id: 'caca-ao-tesouro',
  nome: 'Caça ao Tesouro',
  grupo: 'aventuras',
  icone: 'i-bau',
  descricao: 'Siga o mapa: cada acerto libera o trecho seguinte até o baú.',
  duracao: '3-6 min',
  requer: { multipla: 5 },
  telaCheia: true,

  iniciar(ctx) {
    const { h } = UI;
    const OXIGENIO = 3;
    const peso = { facil: 0, medio: 1, dificil: 2 };
    const paradas = Math.min(ctx.opcoes.paradas || 6, ctx.cartas.multipla.length);
    const palco = Palco.montar(ctx, { id: 'caca-ao-tesouro', cena: cenaNaufragio() });
    palco.estado.ida = 0; // o quanto do caminho já foi (a cena anda e o baú do fundo brilha mais)
    let atual = null;
    let rodada = null; // { perguntas, pontos, bau, fundo, detalhes, inicio, feitas, oxigenio, erros }
    let nado = 0; // o quadro da animação do mergulhador

    /* ---------- A carta náutica (SVG montado só com números e cores do código, nunca com texto de JSON) ---------- */
    const topo = h('div', { class: 'tesouro__topo' }); // o oxigênio e a parada, presos com a carta
    const carta = h('div', { class: 'tesouro__carta', role: 'img' });
    const mapa = h('div', { class: 'tesouro__mapa' }, topo, carta);
    const questao = h('div', { class: 'tesouro__questao' });
    const n1 = (v) => Math.round(v * 10) / 10;
    let largura = 0; // a largura do desenho (a altura é sempre 100): acompanha a forma do painel

    function medirMapa() {
      const w = carta.clientWidth || 320;
      const baixa = palco.raiz.clientHeight < 520; // celular deitado: a carta vai para o lado da pergunta
      const alt = baixa && w < 460 ? 110 : baixa ? 84 : w >= 600 ? 150 : 104;
      return Math.max(280, Math.min(1000, Math.round((w / alt) * 100)));
    }
    /** As paradas (e o baú) em pixels do desenho */
    const posicoes = (W) => [...rodada.pontos, rodada.bau].map((p) => ({ x: 18 + p.fx * (W - 36), y: 14 + p.fy * 72 }));
    const controle = (a, b) => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 16 });
    const curva = (a, b) => { const c = controle(a, b); return `M${n1(a.x)} ${n1(a.y)} Q${n1(c.x)} ${n1(c.y)} ${n1(b.x)} ${n1(b.y)}`; };
    const naCurva = (a, b, k) => { // o ponto e a direção da curva no instante k (0 a 1)
      const c = controle(a, b);
      const u = 1 - k;
      return {
        x: u * u * a.x + 2 * u * k * c.x + k * k * b.x, y: u * u * a.y + 2 * u * k * c.y + k * k * b.y,
        dx: 2 * u * (c.x - a.x) + 2 * k * (b.x - c.x), dy: 2 * u * (c.y - a.y) + 2 * k * (b.y - c.y),
      };
    };
    /** Uma linha de profundidade fechada e macia em volta de (cx, cy) */
    function isobata(cx, cy, rx, ry, raios) {
      const pts = raios.map((r, i) => {
        const a = (i / raios.length) * Math.PI * 2;
        return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r };
      });
      const meio = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      let d = `M${n1(meio(pts[pts.length - 1], pts[0]).x)} ${n1(meio(pts[pts.length - 1], pts[0]).y)}`;
      pts.forEach((p, i) => { const m = meio(p, pts[(i + 1) % pts.length]); d += ` Q${n1(p.x)} ${n1(p.y)} ${n1(m.x)} ${n1(m.y)}`; });
      return `${d}Z`;
    }
    const MERGULHADOR = `<g class="tesouro__bolhas"><circle cx="9" cy="-9" r="1.6"/><circle cx="11" cy="-14" r="1.2"/><circle cx="8.5" cy="-19" r=".9"/></g>
      <circle r="12" class="tesouro__halo"/>
      <circle r="8.5" style="fill:var(--turquesa)"/>
      <path d="M6 -1.5q4.5 -1 4 -8.5" style="fill:none;stroke:var(--amarelo);stroke-width:2;stroke-linecap:round"/>
      <rect x="-7" y="-4" width="14" height="7.5" rx="3.75" style="fill:var(--amarelo)"/>
      <rect x="-5.4" y="-2.6" width="10.8" height="4.7" rx="2.35" style="fill:var(--marinho)"/>
      <circle cx="-2.3" cy="-.3" r="1.1" style="fill:var(--claro)"/><circle cx="2.3" cy="-.3" r="1.1" style="fill:var(--claro)"/>`;

    function desenharMapa(abriu = -1) {
      const W = medirMapa();
      largura = W;
      const { feitas } = rodada;
      const P = posicoes(W);
      const achou = feitas >= paradas;
      let s = `<svg viewBox="0 0 ${W} 100" aria-hidden="true">`;
      s += '<g class="tesouro__grade">';
      for (let x = 40; x < W; x += 40) s += `<path d="M${x} 0V100"/>`;
      for (let y = 25; y < 100; y += 25) s += `<path d="M0 ${y}H${W}"/>`;
      s += '</g>';
      rodada.fundo.bancos.forEach((b) => (s += `<ellipse class="tesouro__banco" cx="${n1(b.fx * W)}" cy="${n1(b.fy * 100)}" rx="${n1(b.r * W)}" ry="${n1(b.r * 60)}"/>`));
      rodada.fundo.linhas.forEach((l) => (s += `<path class="tesouro__isobata" d="${isobata(l.fx * W, l.fy * 100, l.rx * W, l.ry * 100, l.raios)}"/>`));
      // a rosa dos ventos, no canto
      s += `<g class="tesouro__rosa" transform="translate(${W - 20} 19)"><circle r="11"/><path d="M0 -10L3 0H-3Z" style="fill:var(--amarelo)"/><path d="M0 10L3 0H-3Z" style="fill:var(--texto-suave);opacity:.5"/><text y="-13" text-anchor="middle" font-size="7">N</text></g>`;
      // os trechos: tracejado o que falta, aceso o que já abriu
      for (let k = 0; k < P.length - 1; k++) {
        const d = curva(P[k], P[k + 1]);
        s += k < feitas
          ? `<path class="tesouro__brilho" data-k="${k}" d="${d}"/><path class="tesouro__trecho tesouro__trecho--aberto" data-k="${k}" d="${d}"/>`
          : `<path class="tesouro__trecho" d="${d}"/>`;
      }
      // as paradas (boias numeradas)
      rodada.pontos.forEach((_, k) => {
        const { x, y } = P[k];
        if (k < feitas) {
          s += `<g class="tesouro__parada tesouro__parada--feita" transform="translate(${n1(x)} ${n1(y)})"><circle r="7.5"/><path d="M-3.5 0l2.6 2.6l4.6 -5"/></g>`;
        } else if (k === feitas) {
          s += `<g class="tesouro__parada tesouro__parada--atual" transform="translate(${n1(x)} ${n1(y)})"><circle class="tesouro__pulso" r="9"/><circle r="9"/><text y="3.6" text-anchor="middle" font-size="10">${k + 1}</text></g>`;
        } else {
          s += `<g class="tesouro__parada" transform="translate(${n1(x)} ${n1(y)})"><circle r="7.5"/><text y="3.2" text-anchor="middle" font-size="9">${k + 1}</text></g>`;
        }
      });
      // o baú (com o X embaixo); no fim, a tampa abre e as pérolas brilham
      const b = P[P.length - 1];
      s += `<g class="tesouro__bau ${achou ? 'tesouro__bau--aberto' : ''}" transform="translate(${n1(b.x)} ${n1(b.y)})">
        <path class="tesouro__x" d="M-13 -1l26 13M13 -1l-26 13"/>
        <g class="tesouro__raios"><path d="M0 -16V-26M-12 -12l-7 -7M12 -12l7 -7M-17 -4h-8M17 -4h8"/></g>
        <g class="tesouro__perolas"><circle cx="-6" cy="-9" r="2.6"/><circle cx="0" cy="-10.5" r="3"/><circle cx="6" cy="-9" r="2.4"/></g>
        <rect x="-14" y="-8" width="28" height="16" rx="2.5" class="tesouro__bau-corpo"/>
        <path class="tesouro__bau-faixa" d="M-14 -1.5H14M-8 -8V8M8 -8V8"/>
        <path class="tesouro__tampa" d="M-14 -7.5C-14 -16 14 -16 14 -7.5Z"/>
        <rect x="-2.5" y="-4.5" width="5" height="6.5" rx="1.2" class="tesouro__fecho"/>
      </g>`;
      // o mergulhador, um pouco acima da parada em que está (no baú, ao lado dele)
      const onde = acima(P, Math.min(feitas, P.length - 1));
      s += `<g class="tesouro__mergulhador" transform="translate(${n1(onde.x)} ${n1(onde.y)})">${MERGULHADOR}</g>`;
      s += '</svg>';
      carta.innerHTML = s;
      carta.setAttribute('aria-label', achou ? `Mapa do tesouro: as ${paradas} paradas foram liberadas e o baú está aberto.` : `Mapa do tesouro: ${feitas} de ${paradas} paradas liberadas.`);
      if (abriu >= 0) nadar(abriu, P);
    }
    /** Onde o mergulhador fica na parada k: em cima da boia; no baú, do lado esquerdo dele */
    const acima = (P, k) => (k === P.length - 1 ? { x: P[k].x - 27, y: P[k].y - 8 } : { x: P[k].x, y: P[k].y - 17 });

    /** O trecho k acabou de abrir: a linha se desenha e o mergulhador nada por ela (sem animação com "reduzir movimento") */
    function nadar(k, P) {
      if (UI.movimentoReduzido) return;
      const trechos = [...carta.querySelectorAll(`[data-k="${k}"]`)].map((el) => ({ el, len: el.getTotalLength ? el.getTotalLength() : 0 })).filter((t) => t.len);
      trechos.forEach(({ el, len }) => { el.style.strokeDasharray = `${len}`; el.style.strokeDashoffset = `${len}`; });
      const g = carta.querySelector('.tesouro__mergulhador');
      const a = acima(P, k);
      const b = acima(P, k + 1);
      const dur = 950;
      const t0 = performance.now();
      cancelAnimationFrame(nado);
      if (g) g.setAttribute('transform', `translate(${n1(a.x)} ${n1(a.y)})`); // sai da parada de antes
      const passo = (agora) => {
        const k1 = Math.min(1, (agora - t0) / dur);
        const e = k1 < 0.5 ? 2 * k1 * k1 : 1 - Math.pow(-2 * k1 + 2, 2) / 2; // devagar, rápido, devagar
        const p = naCurva(a, b, e);
        const giro = Math.max(-28, Math.min(28, (Math.atan2(p.dy, p.dx) * 180) / Math.PI * 0.6));
        if (g) g.setAttribute('transform', `translate(${n1(p.x)} ${n1(p.y)}) rotate(${n1(k1 < 1 ? giro : 0)})`);
        trechos.forEach(({ el, len }) => { el.style.strokeDashoffset = `${len * (1 - e)}`; });
        if (k1 < 1) nado = requestAnimationFrame(passo);
        else trechos.forEach(({ el }) => { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
      };
      nado = requestAnimationFrame(passo);
    }

    // a carta acompanha a largura da tela (o desenho é refeito quando a forma do painel muda)
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (rodada && carta.isConnected && medirMapa() !== largura) desenharMapa(); }) : null;
    if (observador) observador.observe(carta);

    /* ---------- Uma caça ---------- */
    function comecar() {
      const r = Math.random;
      rodada = {
        perguntas: UI.embaralhar(ctx.cartas.multipla).slice(0, paradas).sort((a, b) => peso[a.dificuldade] - peso[b.dificuldade]),
        // da esquerda para a direita, subindo e descendo como um recife (cada caça, outro caminho)
        pontos: Array.from({ length: paradas }, (_, k) => ({ fx: (k * 0.86) / Math.max(1, paradas - 1), fy: k % 2 === 0 ? 0.24 + r() * 0.22 : 0.6 + r() * 0.22 })),
        bau: { fx: 1, fy: 0.78 },
        fundo: {
          bancos: Array.from({ length: 2 }, () => ({ fx: 0.15 + r() * 0.7, fy: 0.3 + r() * 0.5, r: 0.06 + r() * 0.06 })),
          linhas: Array.from({ length: 3 }, () => ({ fx: 0.1 + r() * 0.8, fy: 0.25 + r() * 0.5, rx: 0.06 + r() * 0.08, ry: 0.18 + r() * 0.16, raios: Array.from({ length: 8 }, () => 0.75 + r() * 0.4) })),
        },
        detalhes: [], inicio: Date.now(), feitas: 0, oxigenio: OXIGENIO, erros: 0,
      };
      palco.estado.ida = 0;
      palco.area.replaceChildren(h('div', { class: 'tesouro' }, mapa, questao));
      placar();
      desenharMapa();
      proxima();
    }

    function placar(perdeu = false) {
      const tanques = JogoComum.oxigenio(rodada.oxigenio, OXIGENIO);
      tanques.classList.add('palco__pilula', 'tesouro__tanques');
      if (perdeu) tanques.querySelectorAll('.icone')[rodada.oxigenio].classList.add('perdeu');
      topo.replaceChildren(tanques,
        palco.pilula(rodada.feitas >= paradas ? 'Baú aberto!' : `Parada ${rodada.feitas + 1} de ${paradas}`, { icone: rodada.feitas >= paradas ? 'i-bau' : 'i-bandeira', classe: rodada.feitas >= paradas ? 'palco__pilula--destaque' : 'palco__pilula--turquesa' }));
      return tanques;
    }

    function proxima() {
      if (atual) atual.destruir();
      if (rodada.feitas >= paradas || rodada.oxigenio <= 0) return fim();
      const q = rodada.perguntas[rodada.feitas];
      palco.topo();
      atual = JogoComum.questao(questao, q, {
        palco,
        aoResponder(acertou, d) {
          rodada.detalhes.push(d);
          if (acertou) {
            rodada.feitas++;
            palco.estado.ida = rodada.feitas / paradas;
            desenharMapa(rodada.feitas - 1);
            placar();
            palco.tocar('bolhas');
          } else {
            rodada.oxigenio--;
            rodada.erros++;
            // A pergunta errada vai para o fim da caça (se ainda houver fôlego)
            rodada.perguntas.push(rodada.perguntas.splice(rodada.feitas, 1)[0]);
            const tanques = placar(true);
            palco.reagir('vazou', { el: tanques });
            const g = carta.querySelector('.tesouro__mergulhador');
            if (g) { // o susto (de novo a cada erro)
              g.classList.remove('tesouro__mergulhador--susto');
              g.getBoundingClientRect();
              g.classList.add('tesouro__mergulhador--susto');
            }
          }
        },
        aoContinuar: proxima,
        get textoContinuar() {
          return rodada.feitas >= paradas || rodada.oxigenio <= 0 ? 'Ver resultado' : 'Seguir no mapa';
        },
      });
    }

    function fim() {
      if (atual) atual.destruir();
      atual = null;
      const { feitas, oxigenio, detalhes, inicio, erros } = rodada;
      const achou = feitas >= paradas;
      palco.area.replaceChildren();
      if (achou) palco.reagir('tesouro');
      palco.terminar(Jogos.resultado({
        jogoId: 'caca-ao-tesouro', trilha: ctx.trilha, detalhes, inicio, oxigenioRestante: oxigenio, concluido: achou, pontuacao: feitas,
        bonus: achou ? { xp: 25, perolas: 5 } : { xp: 0, perolas: Math.floor(feitas / 2) },
        titulo: achou ? 'Baú encontrado!' : `Faltou fôlego na parada ${feitas + 1}`,
        subtitulo: achou ? 'O tesouro é seu: +25 XP e +5 pérolas de bônus.' : `Você passou por ${feitas} de ${paradas} paradas e levou um prêmio parcial. O mapa muda na próxima!`,
      }), {
        tom: achou ? 'vitoria' : 'derrota',
        numeros: [['Paradas', `${feitas}/${paradas}`, true], ['Oxigênio', `${oxigenio}/${OXIGENIO}`], ['Erros', erros], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
        aoJogarDeNovo: comecar,
        textoDeNovo: 'Outra caça',
      });
    }

    palco.abertura({
      rotulo: 'Mapa na mão',
      titulo: 'Caça ao Tesouro',
      lead: 'Siga o mapa pelo fundo do mar: cada acerto libera o trecho seguinte, até o baú.',
      passos: [
        ['01', 'Uma pergunta por parada. ', 'Começa nas fáceis e vai apertando; cada caça sorteia outras perguntas e outro caminho.'],
        ['02', 'Errou? Perde 1 oxigênio. ', `A pergunta vai para o fim do caminho. Sem oxigênio (são ${OXIGENIO}), a caça acaba com um prêmio parcial.`],
        ['03', 'Chegou ao baú? ', 'O tesouro é seu: +25 XP e +5 pérolas de bônus.'],
      ],
      numeros: [['Paradas', paradas, true], ['Oxigênio', OXIGENIO]],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() {
        if (atual) atual.destruir();
        cancelAnimationFrame(nado);
        if (observador) observador.disconnect();
        palco.parar();
      },
    };

    /* ---------- A cena: a areia de um naufrágio, que anda a cada trecho ---------- */
    function cenaNaufragio() {
      const { COR, misturar, alfa, degrade, raios, poeira, seme, tela } = Palco.pintar;
      let agua = null; // a água (guardada)
      let longe = null; // as pedras e o navio afundado lá longe (mais largo que a tela: anda devagar)
      let perto = null; // a areia e as pedras da frente (anda mais rápido)
      let chave = '';
      let algas = [];
      let moedas = [];
      let peixes = [];
      let ida = 0; // o caminho que a cena já andou (vai atrás de estado.ida devagar)
      let ouro = 0; // o brilho do baú quando a caça acaba
      const bolhas = []; // o ar que escapa no erro
      let bau = { x: 0, y: 0 };
      const ANDA_LONGE = 0.3;
      const ANDA_PERTO = 0.26;

      function navio(f, x, y, s, cor) { // a silhueta de um veleiro antigo, adernado na areia
        f.save();
        f.translate(x, y);
        f.rotate(-0.13);
        f.fillStyle = cor;
        f.beginPath();
        f.moveTo(-s * 0.5, -s * 0.2);
        f.quadraticCurveTo(-s * 0.47, s * 0.04, -s * 0.3, s * 0.09);
        f.lineTo(s * 0.3, s * 0.09);
        f.quadraticCurveTo(s * 0.48, s * 0.03, s * 0.57, -s * 0.2);
        f.lineTo(s * 0.4, -s * 0.13);
        f.lineTo(-s * 0.36, -s * 0.14);
        f.closePath();
        f.fill();
        f.fillRect(-s * 0.5, -s * 0.3, s * 0.17, s * 0.13); // o castelo de popa
        f.fillRect(-s * 0.1, -s * 0.66, s * 0.024, s * 0.53); // o mastro grande
        f.fillRect(s * 0.2, -s * 0.38, s * 0.022, s * 0.25); // o mastro quebrado
        f.save();
        f.translate(-s * 0.09, -s * 0.52);
        f.rotate(0.4);
        f.fillRect(-s * 0.15, -s * 0.009, s * 0.3, s * 0.018); // a verga caída
        f.restore();
        f.globalAlpha = 0.55; // a vela rasgada
        f.beginPath();
        f.moveTo(-s * 0.08, -s * 0.6);
        f.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.02, -s * 0.34);
        f.lineTo(-s * 0.08, -s * 0.38);
        f.closePath();
        f.fill();
        f.globalAlpha = 1;
        f.restore();
      }

      function morros(f, W, A, base, cor, r, altura) {
        f.fillStyle = cor;
        f.beginPath();
        f.moveTo(0, A);
        f.lineTo(0, A * base);
        let x = 0;
        while (x < W) {
          const w = 70 + r() * 150;
          f.quadraticCurveTo(x + w / 2, A * base - A * altura * (0.4 + r()), x + w, A * base + (r() - 0.5) * A * 0.02);
          x += w;
        }
        f.lineTo(W, A);
        f.closePath();
        f.fill();
      }

      function pintar(L, A) {
        const r = seme(23);
        agua = tela(L, A);
        const a = agua.getContext('2d');
        a.fillStyle = degrade(a, 0, A, [[0, misturar(COR.turquesaEscura, COR.marinho, 0.4)], [0.5, misturar(COR.marinho, COR.turquesaEscura, 0.14)], [1, COR.fundo]]);
        a.fillRect(0, 0, L, A);
        // lá longe: morros e o navio, meio apagados pela água
        const WL = Math.round(L * (1 + ANDA_LONGE) + 40);
        longe = tela(WL, A);
        const f = longe.getContext('2d');
        const corLonge = alfa(misturar(COR.marinho, COR.turquesaEscura, 0.32), 0.7);
        morros(f, WL, A, 0.8, corLonge, r, 0.05);
        navio(f, L * 0.98, A * 0.8, Math.max(220, Math.min(L, A) * 0.55), corLonge);
        f.globalCompositeOperation = 'source-atop'; // a névoa da água por cima (o longe fica azulado)
        f.fillStyle = degrade(f, A * 0.4, A, [[0, alfa(misturar(COR.turquesaEscura, COR.marinho, 0.4), 0.55)], [1, alfa(COR.fundo, 0.15)]]);
        f.fillRect(0, 0, WL, A);
        f.globalCompositeOperation = 'source-over';
        // perto: a areia em dunas, com marcas de ondulação, e pedras escuras
        const WP = Math.round(L * (1 + ANDA_PERTO) + 40);
        perto = tela(WP, A);
        const p = perto.getContext('2d');
        morros(p, WP, A, 0.88, misturar(COR.marinho, COR.fundo, 0.35), r, 0.06);
        const areia = misturar(COR.perola, COR.marinho, 0.72);
        p.fillStyle = degrade(p, A * 0.86, A, [[0, areia], [1, misturar(COR.perola, COR.fundo, 0.86)]]);
        p.beginPath();
        p.moveTo(0, A);
        p.lineTo(0, A * 0.92);
        for (let x = 0; x <= WP; x += 24) p.lineTo(x, A * 0.92 + Math.sin(x / 140) * A * 0.012 + Math.sin(x / 47) * A * 0.004);
        p.lineTo(WP, A);
        p.closePath();
        p.fill();
        p.strokeStyle = alfa(COR.perola, 0.07);
        p.lineWidth = 1;
        for (let i = 0; i < 26; i++) { // as marcas que a água deixa na areia
          const x = r() * WP;
          const y = A * (0.935 + r() * 0.055);
          const w = 30 + r() * 60;
          p.beginPath();
          p.moveTo(x - w / 2, y);
          p.quadraticCurveTo(x, y - 4, x + w / 2, y);
          p.stroke();
        }
        algas = Array.from({ length: Math.max(7, Math.round(WP / 110)) }, () => ({ x: r() * WP, alt: A * (0.1 + r() * 0.16), fase: r() * 6, larg: 3 + r() * 4, cor: r() }));
        moedas = Array.from({ length: Math.max(6, Math.round(WP / 130)) }, () => ({ x: r() * WP, y: A * (0.94 + r() * 0.045), fase: r() * 6 }));
        peixes = Array.from({ length: 3 }, (_, i) => ({ y: A * (0.3 + i * 0.16), v: 22 + r() * 18, x0: r(), n: 4 + Math.round(r() * 5), cor: [COR.amarelo, COR.lilas, COR.perola][i % 3] }));
        bau = { x: L * (1 + ANDA_PERTO) - L * 0.18, y: A * 0.93 }; // começa fora da tela, à direita; aparece no caminho
      }

      function peixe(g, x, y, s, cor) {
        g.fillStyle = cor;
        g.beginPath();
        g.ellipse(x, y, s, s * 0.45, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(x + s * 0.8, y);
        g.lineTo(x + s * 1.6, y - s * 0.5);
        g.lineTo(x + s * 1.6, y + s * 0.5);
        g.closePath();
        g.fill();
      }

      function desenhar(g, L, A, t, dt, est) {
        const nova = `${L}x${A}`;
        if (!agua || nova !== chave) { chave = nova; pintar(L, A); }
        const alvo = est.ida || 0;
        ida = est.rm ? alvo : ida + (alvo - ida) * Math.min(1, dt * 1.6);
        g.drawImage(agua, 0, 0, L, A);
        raios(g, L, A * 0.86, t, COR.claro, 0.1);
        g.drawImage(longe, -ida * L * ANDA_LONGE, 0);
        // os cardumes, nadando contra o caminho
        for (const c of peixes) {
          const base = ((c.x0 * (L + 300) - t * c.v) % (L + 300) + (L + 300)) % (L + 300) - 150;
          for (let i = 0; i < c.n; i++) {
            const x = base + (i % 3) * 16 + Math.floor(i / 3) * 22;
            const y = c.y + Math.sin(t * 1.4 + i * 0.9) * 4 + (i % 2) * 9;
            peixe(g, x, y, 4 + (i % 2), alfa(c.cor, 0.45));
          }
        }
        const dx = -ida * L * ANDA_PERTO;
        g.drawImage(perto, dx, 0);
        // as algas balançando
        for (const a of algas) {
          const x = a.x + dx;
          if (x < -40 || x > L + 40) continue;
          const y0 = A * 0.95;
          const balanco = Math.sin(t * 0.9 + a.fase) * 9;
          g.strokeStyle = misturar(misturar(COR.turquesaEscura, COR.fundo, 0.35), COR.verde, 0.18 * a.cor);
          g.lineWidth = a.larg;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(x, y0);
          g.quadraticCurveTo(x + balanco, y0 - a.alt * 0.55, x + balanco * 1.6, y0 - a.alt);
          g.stroke();
        }
        // as moedas perdidas na areia, piscando
        for (const m of moedas) {
          const x = m.x + dx;
          if (x < -10 || x > L + 10) continue;
          g.fillStyle = alfa(misturar(COR.amarelo, COR.laranja, 0.3), 0.8);
          g.beginPath();
          g.ellipse(x, m.y, 4, 1.8, 0, 0, Math.PI * 2);
          g.fill();
          const k = Math.max(0, Math.sin(t * 1.7 + m.fase) - 0.75) * 4; // um brilho de vez em quando
          if (k > 0) {
            g.strokeStyle = alfa(COR.amarelo, 0.8 * k);
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(x - 6 * k, m.y - 2);
            g.lineTo(x + 6 * k, m.y - 2);
            g.moveTo(x, m.y - 2 - 6 * k);
            g.lineTo(x, m.y - 2 + 6 * k);
            g.stroke();
          }
        }
        // o baú meio enterrado: aparece no caminho e brilha mais perto do fim
        ouro = Math.max(0, ouro - dt * 0.5);
        const bx = bau.x + dx;
        const by = bau.y;
        const forca = 0.12 + ida * 0.45 + ouro;
        const halo = g.createRadialGradient(bx, by - 10, 0, bx, by - 10, 70 + ouro * 120);
        halo.addColorStop(0, alfa(COR.amarelo, Math.min(0.75, 0.35 * forca)));
        halo.addColorStop(1, alfa(COR.amarelo, 0));
        g.fillStyle = halo;
        g.fillRect(bx - 200, by - 210, 400, 400);
        g.save();
        g.translate(bx, by);
        g.rotate(-0.08);
        g.fillStyle = misturar(COR.amarelo, COR.marinho, 0.45);
        g.fillRect(-22, -16, 44, 18);
        g.fillStyle = misturar(COR.coral, COR.marinho, 0.45);
        g.beginPath();
        g.moveTo(-22, -15);
        g.quadraticCurveTo(0, -30, 22, -15);
        g.closePath();
        g.fill();
        g.fillStyle = alfa(COR.amarelo, 0.5 + 0.5 * forca);
        g.fillRect(-2.5, -12, 5, 7);
        g.restore();
        g.fillStyle = misturar(COR.perola, COR.marinho, 0.72); // a areia que cobre o pé do baú
        g.beginPath();
        g.ellipse(bx, by + 3, 34, 6, 0, 0, Math.PI * 2);
        g.fill();
        poeira(g, L, A, t, alfa(COR.perola, 0.4), 40, 9);
        // o ar que escapou do tanque
        for (let i = bolhas.length - 1; i >= 0; i--) {
          const b = bolhas[i];
          b.v -= dt;
          if (b.v <= 0) { bolhas.splice(i, 1); continue; }
          b.y += b.vy * dt;
          b.x += Math.sin((1.6 - b.v) * 6 + b.fase) * 18 * dt;
          g.strokeStyle = alfa(COR.perola, Math.min(1, b.v) * 0.7);
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = alfa(COR.branco, Math.min(1, b.v) * 0.5);
          g.beginPath();
          g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2);
          g.fill();
        }
      }

      function reagir(tipo, info, est) {
        if (tipo === 'vazou') {
          info.tocar('bolhas');
          if (est.rm) return;
          for (let i = 0; i < 14; i++) bolhas.push({ x: info.x + (Math.random() - 0.5) * 30, y: info.y + 10, vy: -(50 + Math.random() * 90), r: 2 + Math.random() * 4, v: 1 + Math.random() * 0.8, fase: Math.random() * 6 });
        } else if (tipo === 'tesouro') {
          info.tocar('combo');
          if (est.rm) return;
          ouro = 1;
          const x = bau.x - ida * info.L * ANDA_PERTO;
          info.espirrar(x, bau.y - 14, COR.amarelo, 26, 1.3);
          info.espirrar(x, bau.y - 14, COR.perola, 12, 1);
        }
      }

      return { desenhar, reagir };
    }
  },
});

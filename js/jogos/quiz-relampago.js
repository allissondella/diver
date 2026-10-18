/*
 * Quiz Relâmpago (quiz-relampago) — múltipla escolha e verdadeiro ou falso, rapidinho.
 * Cronômetro opcional por pergunta (15, 30 ou 60 s), mostrado como uma onda que sobe.
 * Combo: a partir do 3º acerto seguido, +5 XP por acerto (calculado pela economia).
 * Sem oxigênio. 10 perguntas por padrão. Teclado: 1–6 / A–F; V e F no verdadeiro ou falso.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): uma tempestade no mar à noite. A onda do tempo é o próprio mar,
 * que sobe na tela enquanto o relógio corre e baixa quando você responde; no acerto cai um raio (amarelo no combo), no
 * erro o trovão. Regras, pontos e XP iguais; o fim fica no próprio jogo, com "Jogar de novo".
 */
Jogos.registrar({
  id: 'quiz-relampago',
  nome: 'Quiz Relâmpago',
  grupo: 'rapidos',
  icone: 'i-raio',
  descricao: 'Múltipla escolha e verdadeiro ou falso, com combo e onda do tempo.',
  duracao: '2-4 min',
  requer: { multipla: 4 },
  telaCheia: true,
  opcoes: [{ id: 'tempo', rotulo: 'Tempo por pergunta', valores: [[0, 'Sem tempo'], [15, '15 s'], [30, '30 s'], [60, '60 s']], padrao: 30 }],

  iniciar(ctx) {
    const { h } = UI;
    const tempo = ctx.opcoes.tempo ?? 30;
    const palco = Palco.montar(ctx, { id: 'relampago', cena: cenaTempestade() });
    let atual = null; // controlador da pergunta atual
    let relogio = null;
    let rodada = null; // o estado da rodada

    function comecar() {
      const total = Math.min(ctx.opcoes.quantidade || 10, ctx.cartas.multipla.length + ctx.cartas.vf.length);
      // Mistura: cerca de 1 em cada 3 perguntas é verdadeiro ou falso
      const mc = UI.embaralhar(ctx.cartas.multipla);
      const vf = UI.embaralhar(ctx.cartas.vf);
      const fila = [];
      for (let k = 0; k < total; k++) {
        const querVF = k % 3 === 2 && vf.length;
        fila.push(querVF || !mc.length ? { tipo: 'vf', carta: vf.shift() } : { tipo: 'mc', carta: mc.shift() });
      }
      rodada = { fila, detalhes: [], inicio: Date.now(), i: 0, combo: 0, comboMaximo: 0, resta: tempo };
      desenhar();
    }

    function atualizarHud() {
      const r = rodada;
      palco.hud(
        palco.pilula(`${r.i + 1} de ${r.fila.length}`, { icone: 'i-raio', classe: 'palco__pilula--turquesa', rotulo: `Pergunta ${r.i + 1} de ${r.fila.length}` }),
        palco.pilula(r.combo >= 3 ? `Combo x${r.combo}` : `Sequência: ${r.combo}`, { classe: r.combo >= 3 ? 'palco__pilula--destaque' : '' }),
        tempo ? palco.pilula(`${Math.ceil(r.resta)} s`, { icone: 'i-relogio', classe: r.resta <= 5 ? 'palco__pilula--perigo' : '', rotulo: `Faltam ${Math.ceil(r.resta)} segundos` }) : null);
    }

    function iniciarRelogio() {
      clearInterval(relogio);
      palco.estado.agua = 0;
      if (!tempo) return;
      const fim = Date.now() + tempo * 1000;
      let ultimo = tempo;
      const tick = () => {
        const resta = Math.max(0, fim - Date.now());
        rodada.resta = resta / 1000;
        palco.estado.agua = 1 - resta / (tempo * 1000); // o mar sobe com o tempo
        const s = Math.ceil(rodada.resta);
        if (s !== ultimo) {
          ultimo = s;
          atualizarHud();
          if (s <= 5 && s > 0) palco.tocar('tique');
        }
        if (resta <= 0) {
          clearInterval(relogio);
          palco.reagir('onda', { x: palco.medidas().L / 2, y: palco.medidas().A * 0.3 }); // a onda quebra
          tempoEsgotado();
        }
      };
      tick();
      relogio = setInterval(tick, 100);
    }

    function registrar(acertou, d) {
      clearInterval(relogio);
      const r = rodada;
      r.combo = acertou ? r.combo + 1 : 0;
      r.comboMaximo = Math.max(r.comboMaximo, r.combo);
      r.detalhes.push(d);
      palco.estado.agua = 0; // respondeu: a água baixa
      palco.estado.combo = r.combo;
      if (acertou && r.combo >= 3) palco.reagir('combo');
      atualizarHud();
    }

    function proxima() {
      if (atual && atual.destruir) atual.destruir();
      rodada.i++;
      if (rodada.i < rodada.fila.length) desenhar();
      else terminar();
    }

    function tempoEsgotado() {
      const item = rodada.fila[rodada.i];
      if (item.tipo === 'mc') {
        atual.responder(-1); // nenhuma posição: conta como erro
      } else {
        responderVF(null);
      }
    }

    /* ---- Verdadeiro ou falso ---- */
    let respondidaVF = false;
    function desenharVF(c) {
      respondidaVF = false;
      const feedback = h('div', { class: 'jogo-feedback', hidden: true, 'aria-live': 'polite' });
      const cartao = h('article', { class: 'cartao questao jogo-questao' },
        h('div', { class: 'questao__tags' }, h('span', { class: 'tag', text: c.tema }), h('span', { class: 'tag tag--medio', text: 'Verdadeiro ou falso' })),
        c.pergunta
          ? [h('p', { class: 'vf__pergunta', text: c.pergunta }), h('h2', { class: 'questao__enunciado', tabindex: '-1', text: `Resposta proposta: ${c.proposta}` })]
          : h('h2', { class: 'questao__enunciado', tabindex: '-1', text: c.afirmacao }),
        h('div', { class: 'vf__botoes' },
          h('button', { type: 'button', class: 'alternativa vf__botao', 'data-v': 'true', 'aria-keyshortcuts': 'V', onclick: () => responderVF(true) },
            h('span', { class: 'alternativa__letra', 'aria-hidden': 'true', text: 'V' }), 'Verdadeiro'),
          h('button', { type: 'button', class: 'alternativa vf__botao', 'data-v': 'false', 'aria-keyshortcuts': 'F', onclick: () => responderVF(false) },
            h('span', { class: 'alternativa__letra', 'aria-hidden': 'true', text: 'F' }), 'Falso')),
        feedback);
      palco.area.replaceChildren(cartao);
      cartao.querySelector('h2').focus({ preventScroll: true });
      atual = {
        destruir: JogoComum.teclas((e) => {
          const t = e.key.toUpperCase();
          if (!respondidaVF && (t === 'V' || t === 'F')) {
            e.preventDefault();
            responderVF(t === 'V');
          }
        }),
      };
    }

    function responderVF(escolha) {
      if (respondidaVF) return;
      respondidaVF = true;
      const c = rodada.fila[rodada.i].carta;
      const acertou = escolha === c.verdadeira;
      let escolhido = null;
      palco.area.querySelectorAll('.vf__botao').forEach((b) => {
        b.disabled = true;
        const v = b.dataset.v === 'true';
        if (v === escolha) escolhido = b;
        if (v === c.verdadeira) b.classList.add('alternativa--correta');
        else if (v === escolha) b.classList.add('alternativa--errada');
        else b.classList.add('alternativa--apagada');
      });
      palco.reagir(acertou ? 'acerto' : 'erro', { el: escolhido || palco.area.querySelector('.vf__botoes') });
      registrar(acertou, JogoComum.detalhe(c, acertou, {
        pergunta: c.pergunta ? `${c.pergunta} → ${c.proposta}` : c.afirmacao,
        resposta: c.verdadeira ? 'Verdadeiro' : 'Falso',
        sua: escolha === null ? 'O tempo acabou.' : escolha ? 'Verdadeiro' : 'Falso',
      }));
      const feedback = palco.area.querySelector('.jogo-feedback');
      feedback.classList.toggle('jogo-feedback--erro', !acertou);
      const botao = h('button', { class: 'botao botao--primario botao--largo', type: 'button', text: rodada.i === rodada.fila.length - 1 ? 'Ver resultado' : 'Próxima', onclick: proxima });
      feedback.replaceChildren(...[
        h('p', { class: 'jogo-feedback__titulo', text: acertou ? 'Mandou bem, Diver!' : escolha === null ? 'O tempo acabou!' : UI.sortear(JogoComum.MSGS_ERRO) }),
        h('p', { class: 'jogo-feedback__certa', text: `É ${c.verdadeira ? 'verdadeiro' : 'falso'}.` }),
        c.explicacao ? h('p', { class: 'jogo-feedback__texto', text: c.explicacao }) : null,
        botao].filter(Boolean));
      feedback.hidden = false;
      botao.focus({ preventScroll: true });
      botao.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
    }

    function desenhar() {
      const item = rodada.fila[rodada.i];
      rodada.resta = tempo;
      atualizarHud();
      if (item.tipo === 'vf') desenharVF(item.carta);
      else {
        atual = JogoComum.questao(palco.area, item.carta, {
          palco,
          aoResponder: (acertou, d) => {
            if (!acertou && !d.sua) d.sua = 'O tempo acabou.';
            registrar(acertou, d);
          },
          aoContinuar: proxima,
          textoContinuar: rodada.i === rodada.fila.length - 1 ? 'Ver resultado' : 'Próxima',
        });
      }
      iniciarRelogio();
    }

    function terminar() {
      clearInterval(relogio);
      const { fila, detalhes, inicio, comboMaximo } = rodada;
      const acertos = detalhes.filter((d) => d.acertou).length;
      palco.area.replaceChildren();
      palco.hud();
      palco.terminar(Jogos.resultado({
        jogoId: 'quiz-relampago', trilha: ctx.trilha, detalhes, inicio, comboMaximo, pontuacao: acertos,
        titulo: acertos === fila.length ? 'Relâmpago perfeito!' : `${acertos} de ${fila.length} no relâmpago`,
        subtitulo: comboMaximo >= 3 ? `Maior combo: ${comboMaximo} seguidos. Quem é rápido assim?` : 'Rápido e rasteiro. Bora de novo pra subir o combo?',
      }), {
        tom: acertos >= fila.length / 2 ? 'vitoria' : 'derrota',
        numeros: [['Acertos', `${acertos}/${fila.length}`, true], ['Maior combo', comboMaximo], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
        aoJogarDeNovo: comecar,
      });
    }

    palco.abertura({
      rotulo: 'Tempestade no mar',
      titulo: 'Quiz Relâmpago',
      lead: 'Múltipla escolha e verdadeiro ou falso, rapidinho. Acertou, cai um raio; três seguidas, combo.',
      passos: [
        ['01', tempo ? 'Responda antes da onda. ' : 'Sem pressa desta vez. ', tempo ? `O mar sobe enquanto o relógio corre: são ${tempo} s por pergunta.` : 'Você escolheu "Sem tempo": o mar fica calmo.'],
        ['02', 'Três seguidas, combo. ', 'A partir do 3º acerto seguido, cada acerto vale +5 XP.'],
        ['03', `${Math.min(ctx.opcoes.quantidade || 10, ctx.cartas.multipla.length + ctx.cartas.vf.length)} perguntas. `, 'No fim, o XP da rodada e o que revisar. No teclado: 1 a 6 ou A a F; V e F.'],
      ],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() {
        clearInterval(relogio);
        if (atual && atual.destruir) atual.destruir();
        palco.parar();
      },
    };

    /* ---------- A cena: tempestade no mar, à noite ---------- */
    function cenaTempestade() {
      const { COR, misturar, alfa, degrade, mar, seme, tela, nuvem, nuvemBaixa } = Palco.pintar;
      let ceu = null; // o céu com a lua por trás, guardado (só refaz quando a tela muda)
      let deck = null; // o teto de nuvens, que se repete na largura (anda devagar sem emenda)
      let deckClaro = null; // o mesmo teto aceso: o clarão do raio dentro das nuvens
      let rascunho = null; // onde o clarão é recortado em volta do raio
      let nuvens = []; // as nuvens baixas, que andam na frente do teto
      const raios = [];
      const pingos = []; // a chuva batendo no mar
      let brilho = 0; // o céu clareando no raio
      let xBrilho = 0;
      let corBrilho = COR.lilas;
      let proximo = 3; // segundos até o próximo raio ao longe
      let aguaVis = 0;
      let crista = 0; // a onda que quebra quando o tempo acaba
      let L0 = 0;
      let A0 = 0;
      // as cores das nuvens: escuras contra o céu, com o contorno aceso pela lua ("forro de prata"); ACESA é o clarão do raio
      const CORES = {
        topo: misturar(COR.fundo, COR.marinho, 0.6), meio: misturar(COR.sup, COR.fundo, 0.3), base: misturar(COR.sup, COR.sup2, 0.45),
        luz: misturar(COR.sup3, COR.lilas, 0.3), forro: alfa(misturar(COR.lilas, COR.sup3, 0.4), 0.55),
      };
      const ACESA = {
        topo: misturar(COR.lilas, COR.sup2, 0.45), meio: misturar(COR.lilas, COR.branco, 0.15), base: misturar(COR.lilas, COR.branco, 0.4),
        luz: COR.branco, forro: alfa(COR.branco, 0.6),
      };

      /** O teto de nuvens: gomos grandes no alto (saindo da tela) e, na frente, a borda de baixo em gomos de vários tamanhos */
      function gomosDoTeto(L, H, base) {
        const r = seme(7);
        const bolas = [];
        const fileira = (raio0, raioVar, y0, yVar, passo, luz) => {
          for (let x = r() * base * 0.1; x < L; ) {
            const raio = base * (raio0 + r() * raioVar);
            bolas.push({ x, y: H * (y0 + r() * yVar), r: raio, luz: luz && r() < 0.6 });
            x += raio * passo * (0.7 + r() * 0.6);
          }
        };
        fileira(0.16, 0.08, -0.16, 0.14, 0.7, false); // a camada grossa
        fileira(0.08, 0.07, 0.14, 0.16, 0.85, true); // o meio
        fileira(0.05, 0.045, 0.3, 0.12, 0.8, true); // a borda de baixo, em gomos colados no meio
        return bolas;
      }

      function medir(L, A) {
        L0 = L;
        A0 = A;
        // o céu: escuro no alto, um pouco mais claro perto do horizonte, e a lua por trás das nuvens (só o halo)
        ceu = tela(L, A);
        const f = ceu.getContext('2d');
        f.fillStyle = degrade(f, 0, A, [[0, COR.fundo], [0.5, misturar(COR.marinho, COR.lilas, 0.1)], [0.82, misturar(COR.fundo2, COR.lilas, 0.16)], [1, COR.fundo]]);
        f.fillRect(0, 0, L, A);
        const lx = L * 0.76;
        const ly = A * 0.12;
        const lr = Math.max(L, A) * 0.4;
        const lua = f.createRadialGradient(lx, ly, 0, lx, ly, lr);
        lua.addColorStop(0, alfa(misturar(COR.lilas, COR.branco, 0.4), 0.2));
        lua.addColorStop(1, alfa(COR.lilas, 0));
        f.fillStyle = lua;
        f.fillRect(0, 0, L, A);
        // o teto de nuvens, nas duas cores (a normal e a do clarão)
        const H = Math.round(A * 0.42);
        const bolas = gomosDoTeto(L, H, Math.min(L, A));
        deck = nuvem(L, H, bolas, CORES, L);
        deckClaro = nuvem(L, H, bolas, ACESA, L);
        rascunho = tela(L, H);
        // as nuvens baixas
        const rn = seme(5);
        nuvens = Array.from({ length: Math.max(3, Math.round(L / 380)) }, (_, i) => {
          const w = Math.max(200, Math.min(L, A) * (0.42 + rn() * 0.3));
          return { img: nuvemBaixa(w, rn, CORES), x: rn() * L, y: A * (0.12 + rn() * 0.12), v: 7 + rn() * 9 + i, a: 0.75 + rn() * 0.2 };
        });
      }

      /** Uma linha quebrada de a até b: cada pedaço se parte ao meio e o meio desvia um pouco (cada vez menos) */
      function zigue(a, b, niveis, desvio) {
        let pts = [a, b];
        let d = desvio;
        for (let n = 0; n < niveis; n++) {
          const novos = [pts[0]];
          for (let i = 1; i < pts.length; i++) {
            const [ax, ay] = pts[i - 1];
            const [bx, by] = pts[i];
            novos.push([(ax + bx) / 2 + (Math.random() - 0.5) * d, (ay + by) / 2 + (Math.random() - 0.5) * d * 0.25], pts[i]);
          }
          pts = novos;
          d *= 0.55;
        }
        return pts;
      }

      /** Um raio: da base das nuvens até (x1, y1), todo quebrado, com dois ou três galhos */
      function novoRaio(x1, y1, cor, largura = 1) {
        const r = Math.random;
        const x0 = x1 + (r() - 0.5) * L0 * 0.25;
        const y0 = A0 * 0.14;
        const alto = Math.max(60, y1 - y0);
        const pts = zigue([x0, y0], [x1, y1], 5, Math.max(40, alto * 0.22));
        const galhos = [];
        for (let i = 0, n = 2 + Math.floor(r() * 2); i < n; i++) {
          const [gx, gy] = pts[Math.floor(pts.length * (0.15 + r() * 0.5))];
          const comp = alto * (0.12 + r() * 0.18);
          galhos.push(zigue([gx, gy], [gx + (r() - 0.5) * comp * 1.4, gy + comp], 3, comp * 0.3));
        }
        raios.push({ pts, galhos, t0: performance.now(), cor, largura, x1, y1 });
        brilho = 1;
        xBrilho = x0;
        corBrilho = cor;
      }

      /** O teto de nuvens andando (duas cópias lado a lado); com o raio, acende por dentro em volta dele */
      function desenharTeto(g, L, t) {
        const dx = -((t * 4) % L);
        g.drawImage(deck, dx, 0);
        g.drawImage(deck, dx + L, 0);
        if (brilho <= 0.02) return;
        const f = rascunho.getContext('2d');
        const H = rascunho.height;
        f.clearRect(0, 0, L, H);
        f.drawImage(deckClaro, dx, 0);
        f.drawImage(deckClaro, dx + L, 0);
        f.globalCompositeOperation = 'destination-in';
        const m = f.createRadialGradient(xBrilho, H * 0.4, 0, xBrilho, H * 0.4, Math.max(220, L * 0.35));
        m.addColorStop(0, alfa(COR.branco, 1));
        m.addColorStop(1, alfa(COR.branco, 0));
        f.fillStyle = m;
        f.fillRect(0, 0, L, H);
        f.globalCompositeOperation = 'source-over';
        g.globalAlpha = Math.min(1, brilho * 0.9);
        g.drawImage(rascunho, 0, 0);
        g.globalAlpha = 1;
      }

      function desenhar(g, L, A, t, dt, est) {
        if (!ceu || L0 !== L || A0 !== A) medir(L, A);
        g.drawImage(ceu, 0, 0, L, A);
        brilho = Math.max(0, brilho - dt * 2.2);
        if (brilho > 0) { // o céu todo clareia um pouco no raio
          g.fillStyle = alfa(corBrilho, 0.1 * brilho);
          g.fillRect(0, 0, L, A);
        }
        // o mar: sobe com o tempo da pergunta (sem tempo, fica baixo e calmo)
        const alvo = Math.max(0, Math.min(1, est.agua || 0));
        aguaVis = est.rm ? alvo : aguaVis + (alvo - aguaVis) * Math.min(1, dt * (alvo > aguaVis ? 8 : 2.5));
        const perigo = Math.max(0, Math.min(1, (aguaVis - 0.68) / 0.2)); // perto do fim do tempo, a crista vai ficando coral
        const yMar = A - A * (0.16 + 0.6 * aguaVis);
        // a névoa no horizonte, logo acima da água
        g.fillStyle = degrade(g, yMar - A * 0.14, yMar + 10, [[0, alfa(COR.lilas, 0)], [1, alfa(misturar(COR.lilas, COR.sup2, 0.5), 0.12)]]);
        g.fillRect(0, yMar - A * 0.14, L, A * 0.14 + 10);
        // os raios ao longe, sozinhos, de vez em quando
        if (!est.rm) {
          proximo -= dt;
          if (proximo <= 0) {
            proximo = 4 + Math.random() * 6;
            novoRaio(L * (0.1 + Math.random() * 0.8), yMar + 4, COR.lilas, 0.6);
          }
        }
        desenharTeto(g, L, t);
        const agora = performance.now();
        for (let i = raios.length - 1; i >= 0; i--) {
          const r = raios[i];
          const k = (agora - r.t0) / 380;
          if (k >= 1) { raios.splice(i, 1); continue; }
          const pisca = k < 0.25 || (k > 0.4 && k < 0.6) ? 1 : 0.35;
          const tracar = (pts, w, cor, a) => {
            g.strokeStyle = alfa(cor, a * pisca * (1 - k));
            g.lineWidth = w;
            g.lineJoin = 'round';
            g.lineCap = 'round';
            g.beginPath();
            pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y)));
            g.stroke();
          };
          // o brilho em volta (largo e fraco), o corpo na cor do raio e o miolo branco; os galhos mais finos
          tracar(r.pts, 22 * r.largura, r.cor, 0.07);
          tracar(r.pts, 9 * r.largura, r.cor, 0.16);
          for (const gl of r.galhos) tracar(gl, 5 * r.largura, r.cor, 0.12);
          tracar(r.pts, 3 * r.largura, r.cor, 0.85);
          for (const gl of r.galhos) tracar(gl, 1.6 * r.largura, r.cor, 0.7);
          tracar(r.pts, 1.4 * r.largura, COR.branco, 1);
          // onde ele bate na água, um clarão
          const bate = g.createRadialGradient(r.x1, r.y1, 0, r.x1, r.y1, 46 * r.largura);
          bate.addColorStop(0, alfa(COR.branco, 0.5 * pisca * (1 - k)));
          bate.addColorStop(1, alfa(r.cor, 0));
          g.fillStyle = bate;
          g.fillRect(r.x1 - 46 * r.largura, r.y1 - 46 * r.largura, 92 * r.largura, 92 * r.largura);
        }
        // as nuvens baixas andam devagar, na frente do teto (com o raio, acendem um pouco)
        for (const n of nuvens) {
          const w = n.img.width;
          const x = ((n.x + t * n.v) % (L + w)) - w;
          g.globalAlpha = n.a;
          g.drawImage(n.img, x, n.y);
          if (brilho > 0.05) {
            g.globalAlpha = 0.3 * brilho;
            g.globalCompositeOperation = 'lighter';
            g.drawImage(n.img, x, n.y);
            g.globalCompositeOperation = 'source-over';
          }
          g.globalAlpha = 1;
        }
        // a chuva, inclinada, em duas distâncias, só acima da água
        if (!est.rm) {
          for (const [n, cor, w, vel, comp] of [[70, alfa(COR.claro, 0.12), 1, 0.7, 11], [60, alfa(COR.claro, 0.24), 1.3, 1, 17]]) {
            g.strokeStyle = cor;
            g.lineWidth = w;
            g.beginPath();
            for (let i = 0; i < n; i++) {
              const sx = ((i * 7919 + n) % 1000) / 1000;
              const sy = ((i * 104729 + n * 31) % 1000) / 1000;
              const x = (((sx * (L + 200) - t * 160 * vel) % (L + 200)) + L + 200) % (L + 200) - 100;
              const y = (sy * A + t * (520 + (i % 7) * 40) * vel) % A;
              if (y > yMar) continue;
              g.moveTo(x, y);
              g.lineTo(x - comp * 0.3, y + comp);
            }
            g.stroke();
          }
        }
        // o mar (Palco.pintar.mar); perto do fim do tempo, a crista vai ficando coral
        crista = Math.max(0, crista - dt * 1.2);
        const fase = est.rm ? 0 : t;
        const { yFrente } = mar(g, L, A, yMar, fase, {
          corTopo: misturar(misturar(COR.turquesaEscura, COR.marinho, 0.3), misturar(COR.turquesaEscura, COR.coralSombra, 0.5), perigo),
          corFundo: misturar(COR.turquesaEscura, COR.fundo, 0.72), crista,
          espuma: perigo > 0.5 ? COR.coral : COR.claro, espumaA: 0.3 + 0.35 * perigo,
        });
        // o reflexo do raio na água: uma faixa de luz embaixo dele, que abre e some para baixo (bordas macias)
        if (brilho > 0.02) {
          g.save();
          g.globalCompositeOperation = 'lighter';
          const faixas = 5;
          for (let i = 0; i < faixas; i++) {
            const y0 = yFrente - 4 + ((A - yFrente) * i) / faixas;
            const y1 = yFrente - 4 + ((A - yFrente) * (i + 1)) / faixas;
            const meia = 24 + 60 * ((i + 0.5) / faixas);
            const d = g.createLinearGradient(xBrilho - meia, 0, xBrilho + meia, 0);
            const a = 0.2 * brilho * (1 - i / faixas);
            d.addColorStop(0, alfa(corBrilho, 0));
            d.addColorStop(0.5, alfa(corBrilho, a));
            d.addColorStop(1, alfa(corBrilho, 0));
            g.fillStyle = d;
            g.fillRect(xBrilho - meia, y0, meia * 2, y1 - y0 + 1);
          }
          g.restore();
        }
        // a chuva batendo no mar: rodinhas que abrem e somem
        if (!est.rm) {
          const nascem = dt * 22;
          const quantos = Math.floor(nascem) + (Math.random() < nascem % 1 ? 1 : 0);
          for (let i = 0; i < quantos; i++) {
            const prof = Math.random(); // 0 = longe (perto do horizonte), 1 = perto
            pingos.push({ x: Math.random() * L, y: yFrente + 14 + prof * prof * (A - yFrente - 20), e: 0.5 + prof, k: 0 });
          }
          if (pingos.length > 60) pingos.splice(0, pingos.length - 60);
          g.lineWidth = 1;
          for (let i = pingos.length - 1; i >= 0; i--) {
            const p = pingos[i];
            p.k += dt * 2.2;
            if (p.k >= 1) { pingos.splice(i, 1); continue; }
            g.strokeStyle = alfa(COR.claro, 0.28 * (1 - p.k));
            g.beginPath();
            g.ellipse(p.x, p.y, (2 + p.k * 9) * p.e, (0.7 + p.k * 2.6) * p.e, 0, 0, Math.PI * 2);
            g.stroke();
          }
        }
        est.yMar = yFrente;
      }

      function reagir(tipo, info, est) {
        const y = est.yMar || A0 * 0.8;
        if (est.rm && tipo !== 'erro') return; // com "reduzir movimento", sem raio, clarão nem onda (o trovão continua)
        if (tipo === 'acerto') {
          const combo = (est.combo || 0) >= 2;
          novoRaio(info.x + (Math.random() - 0.5) * 60, y, combo ? COR.amarelo : COR.claro, combo ? 1.3 : 1);
          info.espirrar(info.x, y, COR.claro, 10, 0.8);
        } else if (tipo === 'combo') {
          novoRaio(L0 * (0.2 + Math.random() * 0.6), y, COR.amarelo, 1.4);
        } else if (tipo === 'erro') {
          info.tocar('trovao');
          info.tremer(0.8);
        } else if (tipo === 'onda') {
          crista = 1;
          info.tremer(1);
          for (let i = 0; i < 6; i++) info.espirrar(L0 * (0.1 + i * 0.16), y - 20, COR.claro, 8, 1.1);
        }
      }

      return { medir, desenhar, reagir };
    }
  },
});

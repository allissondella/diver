/*
 * Maré Alta (mare-alta) — sobrevivência sem fim: as perguntas continuam até a água
 * chegar ao topo. Cada erro sobe a maré; a cada 5 acertos seguidos ela baixa um pouco.
 * A dificuldade sobe aos poucos (fácil → médio → difícil). Recorde salvo por trilha.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): um cais ao entardecer, com a lua nascendo, um farol que gira e
 * uma régua de maré na água. A maré é o próprio mar, que sobe a régua a cada erro (com uma onda que quebra) e baixa
 * com brilhos a cada 5 seguidos (o farol pisca amarelo). Regras, pontos, XP e recorde iguais; o fim fica no próprio
 * jogo, com "Jogar de novo".
 */
Jogos.registrar({
  id: 'mare-alta',
  nome: 'Maré Alta',
  grupo: 'aventuras',
  icone: 'i-onda',
  descricao: 'Sobrevivência: a maré sobe a cada erro. Quanto tempo você aguenta?',
  duracao: '3-10 min',
  requer: { multipla: 4 },
  telaCheia: true,

  iniciar(ctx) {
    const { h } = UI;
    const SOBE = 25; // % por erro
    const DESCE = 15; // % a cada 5 acertos seguidos
    const peso = { facil: 0, medio: 1, dificil: 2 };
    const palco = Palco.montar(ctx, { id: 'mare', cena: cenaCais() });
    const lerRecorde = () => (ctx.prog.jogos && ctx.prog.jogos['mare-alta'] && ctx.prog.jogos['mare-alta'].melhor) || 0;
    let recorde = lerRecorde();
    let detalhes = [];
    let inicio = Date.now();
    let fila = [];
    let rodada = 0;
    let nivel = 0;
    let acertos = 0;
    let seguidos = 0;
    let comboMaximo = 0;
    let atual = null;

    // Cada volta pela trilha fica em ordem de dificuldade (embaralhada dentro de cada nível)
    function reabastecer() {
      fila = UI.embaralhar(ctx.cartas.multipla).sort((a, b) => peso[a.dificuldade] - peso[b.dificuldade]);
      rodada++;
    }

    function atualizar() {
      palco.estado.nivel = nivel;
      const medidor = h('span', {
        class: `palco__pilula ${nivel >= 75 ? 'palco__pilula--perigo' : 'palco__pilula--turquesa'}`, role: 'meter', 'aria-label': 'Nível da maré',
        'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(nivel),
      }, UI.icone('i-onda'), `Maré: ${nivel}%`);
      palco.hud(medidor,
        palco.pilula(`Acertos: ${acertos}`, { icone: 'i-check' }),
        palco.pilula(`Recorde: ${Math.max(recorde, acertos)}`, { icone: 'i-trofeu', classe: acertos > recorde && recorde > 0 ? 'palco__pilula--destaque' : '' }),
        palco.pilula(seguidos ? `${seguidos} seguidos` : 'Respira fundo', { classe: seguidos >= 5 ? 'palco__pilula--destaque' : '' }));
    }

    function proxima() {
      if (atual) atual.destruir();
      if (nivel >= 100) return terminar();
      if (!fila.length) reabastecer();
      const q = fila.shift();
      atual = JogoComum.questao(palco.area, q, {
        palco,
        aoResponder(acertou, d) {
          detalhes.push(d);
          if (acertou) {
            acertos++;
            seguidos++;
            comboMaximo = Math.max(comboMaximo, seguidos);
            if (seguidos % 5 === 0) {
              nivel = Math.max(0, nivel - DESCE);
              palco.reagir('combo', { x: palco.medidas().L / 2, y: palco.medidas().A * 0.6 });
              palco.reagir('baixa');
            }
          } else {
            seguidos = 0;
            nivel = Math.min(100, nivel + SOBE);
            palco.reagir('onda');
          }
          atualizar();
        },
        aoContinuar: proxima,
        // lido depois da resposta: se a maré encheu, o botão já leva ao resultado
        get textoContinuar() {
          return nivel >= 100 ? 'Ver resultado' : 'Próxima';
        },
      });
    }

    function comecar() {
      recorde = lerRecorde(); // a rodada de antes pode ter batido o recorde
      detalhes = [];
      inicio = Date.now();
      fila = [];
      rodada = 0;
      nivel = 0;
      acertos = 0;
      seguidos = 0;
      comboMaximo = 0;
      reabastecer();
      atualizar();
      proxima();
    }

    function terminar() {
      if (atual) atual.destruir();
      atual = null;
      const bateu = acertos > recorde;
      palco.area.replaceChildren();
      palco.hud();
      palco.terminar(Jogos.resultado({
        jogoId: 'mare-alta', trilha: ctx.trilha, detalhes, inicio, comboMaximo, pontuacao: acertos,
        bonus: { xp: bateu ? 15 : 0, perolas: bateu ? 3 : 0 },
        titulo: bateu ? `Novo recorde: ${UI.plural(acertos, 'acerto', 'acertos')}!` : `A maré subiu depois de ${UI.plural(acertos, 'acerto', 'acertos')}`,
        subtitulo: bateu ? 'Você aguentou mais que nunca. Recorde guardado.' : `Seu recorde nesta trilha é ${recorde}. A água baixa, e você volta.`,
      }), {
        tom: bateu ? 'vitoria' : 'derrota',
        numeros: [['Acertos', acertos, true], ['Maior sequência', comboMaximo], ['Recorde', Math.max(recorde, acertos)], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
        aoJogarDeNovo: comecar,
      });
      palco.estado.nivel = 0; // a maré baixa atrás do cartão
    }

    palco.abertura({
      rotulo: 'Na beira do cais',
      titulo: 'Maré Alta',
      lead: 'Sobrevivência: as perguntas não acabam, mas a maré sobe a cada erro. Quanto tempo você aguenta?',
      passos: [
        ['01', 'Errou, a maré sobe. ', `Cada erro põe +${SOBE}% de água na régua; em 100%, acabou.`],
        ['02', 'Cinco seguidos, ela baixa. ', `A cada 5 acertos seguidos, a água desce ${DESCE}%.`],
        ['03', 'Vai ficando difícil. ', 'As perguntas vão do fácil ao difícil. Bater o seu recorde vale +15 XP e +3 pérolas.'],
      ],
      numeros: [['Seu recorde', recorde, true]],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() {
        if (atual) atual.destruir();
        palco.parar();
      },
    };

    /* ---------- A cena: um cais ao entardecer, com o farol e a régua de maré ---------- */
    function cenaCais() {
      const { COR, misturar, alfa, degrade, mar, seme, tela, nuvemBaixa } = Palco.pintar;
      let ceu = null;
      let L0 = 0;
      let A0 = 0;
      let nuvens = [];
      let aguaVis = 0;
      let velAgua = 0; // a água sobe com uma sobra e assenta (mola)
      let crista = 0; // a onda que quebra no erro
      let farol = 0; // o farol piscando amarelo quando a maré baixa
      let fonte = 'sans-serif'; // a fonte do app, para os números da régua
      const brilhos = []; // as faíscas douradas na água quando a maré baixa
      const CORES_NUVEM = { // nuvens do fim de tarde: a barriga rosada pelo sol que já foi
        topo: misturar(COR.sup2, COR.lilas, 0.22), meio: misturar(COR.sup3, COR.coral, 0.18), base: misturar(COR.coral, COR.lilas, 0.45),
        luz: misturar(COR.lilas, COR.branco, 0.4), forro: alfa(misturar(COR.coral, COR.branco, 0.45), 0.5),
      };

      const horizonte = (A) => A * 0.5;
      const yNivel = (A, n) => A * 0.9 - (A * 0.9 - A * 0.2) * (n / 100); // a régua: 0% perto do chão, 100% lá no alto

      function medir(L, A) {
        L0 = L;
        A0 = A;
        fonte = `800 10px ${getComputedStyle(document.body).fontFamily}`;
        ceu = tela(L, A);
        const f = ceu.getContext('2d');
        const hz = horizonte(A);
        // o céu do entardecer: noite em cima, lilás no meio e a faixa rosada no horizonte
        f.fillStyle = degrade(f, 0, hz, [[0, COR.fundo], [0.45, misturar(COR.marinho, COR.lilas, 0.22)], [0.82, misturar(COR.lilas, COR.coral, 0.45)], [1, misturar(COR.coral, COR.laranja, 0.35)]]);
        f.fillRect(0, 0, L, hz + 1);
        // as primeiras estrelas
        const r = seme(23);
        for (let i = 0; i < 50; i++) {
          f.fillStyle = alfa(COR.texto, 0.25 + r() * 0.5);
          f.fillRect(r() * L, r() * hz * 0.45, 1.4, 1.4);
        }
        // a lua nascendo, grande e pálida, com o halo
        const lx = L * 0.2;
        const ly = hz * 0.62;
        const lr = Math.max(18, Math.min(L, A) * 0.045);
        const halo = f.createRadialGradient(lx, ly, lr, lx, ly, lr * 5);
        halo.addColorStop(0, alfa(COR.perola, 0.22));
        halo.addColorStop(1, alfa(COR.perola, 0));
        f.fillStyle = halo;
        f.fillRect(lx - lr * 5, ly - lr * 5, lr * 10, lr * 10);
        f.fillStyle = degrade(f, ly - lr, ly + lr, [[0, COR.perola], [1, misturar(COR.perola, COR.coral, 0.25)]]);
        f.beginPath();
        f.arc(lx, ly, lr, 0, Math.PI * 2);
        f.fill();
        // o mar lá longe, calmo, com o reflexo rosado e o da lua
        f.fillStyle = degrade(f, hz, A, [[0, misturar(COR.lilas, COR.turquesaEscura, 0.55)], [0.3, misturar(COR.turquesaEscura, COR.marinho, 0.55)], [1, COR.fundo]]);
        f.fillRect(0, hz, L, A - hz);
        for (let i = 0; i < 26; i++) {
          const y = hz + 3 + Math.pow(i / 26, 1.6) * (A - hz) * 0.5;
          const w = 20 + r() * 60 + i * 3;
          f.fillStyle = alfa(i % 3 ? COR.lilas : COR.perola, 0.1 + r() * 0.12);
          f.fillRect(lx - w / 2 + (r() - 0.5) * 40, y, w, 1.5);
        }
        // as pedras e o farol, à direita, na linha do horizonte
        const fx = L * 0.82;
        f.fillStyle = misturar(COR.fundo, COR.marinho, 0.4);
        f.beginPath();
        f.moveTo(fx - Math.max(60, L * 0.07), hz + 4);
        f.quadraticCurveTo(fx - 30, hz - 22, fx, hz - 18);
        f.quadraticCurveTo(fx + 34, hz - 24, fx + Math.max(70, L * 0.08), hz + 4);
        f.closePath();
        f.fill();
        const alt = Math.max(70, A * 0.16);
        const base = Math.max(12, alt * 0.16);
        const topo = base * 0.62;
        for (let i = 0; i < 4; i++) { // a torre listrada (vermelho e branco, mais escura no entardecer)
          const y0 = hz - 18 - (alt * i) / 4;
          const y1 = hz - 18 - (alt * (i + 1)) / 4;
          const w0 = base - ((base - topo) * i) / 4;
          const w1 = base - ((base - topo) * (i + 1)) / 4;
          f.fillStyle = i % 2 ? misturar(COR.branco, COR.lilas, 0.35) : misturar(COR.coralSombra, COR.fundo, 0.25);
          f.beginPath();
          f.moveTo(fx - w0 / 2, y0);
          f.lineTo(fx + w0 / 2, y0);
          f.lineTo(fx + w1 / 2, y1);
          f.lineTo(fx - w1 / 2, y1);
          f.closePath();
          f.fill();
        }
        f.fillStyle = misturar(COR.fundo, COR.marinho, 0.3); // a casinha da lanterna
        f.fillRect(fx - topo * 0.7, hz - 18 - alt - topo * 0.9, topo * 1.4, topo * 0.9);
        f.beginPath();
        f.moveTo(fx - topo * 0.8, hz - 18 - alt - topo * 0.9);
        f.lineTo(fx, hz - 18 - alt - topo * 1.6);
        f.lineTo(fx + topo * 0.8, hz - 18 - alt - topo * 0.9);
        f.closePath();
        f.fill();
        ceu.farol = { x: fx, y: hz - 18 - alt - topo * 0.45, r: topo * 0.5 };
        const rn = seme(31);
        nuvens = Array.from({ length: Math.max(2, Math.round(L / 520)) }, (_, i) => {
          const w = Math.max(180, Math.min(L, A) * (0.36 + rn() * 0.2));
          return { img: nuvemBaixa(w, rn, CORES_NUVEM), x: rn() * L, y: hz * (0.18 + rn() * 0.28), v: 4 + rn() * 5 + i, a: 0.85 };
        });
      }

      /** A régua de maré: um poste com a placa marcada de 10 em 10% (0, 25, 50, 75 e 100 escritos na placa) */
      function regua(g, A, x, alfaGeral) {
        const y0 = yNivel(A, 0) + 30;
        const y1 = yNivel(A, 100) - 16;
        g.globalAlpha = alfaGeral;
        g.fillStyle = misturar(COR.amareloSombra, COR.fundo, 0.55); // o poste de madeira
        g.fillRect(x - 5, y1 - 10, 10, A - y1 + 10);
        g.fillStyle = misturar(COR.branco, COR.lilas, 0.15); // a placa
        g.fillRect(x + 5, y1, 36, y0 - y1);
        g.font = fonte;
        g.textBaseline = 'middle';
        g.textAlign = 'right';
        for (let n = 0; n <= 100; n += 5) {
          const y = yNivel(A, n);
          const nome = n % 25 === 0;
          g.fillStyle = n >= 75 ? COR.coralSombra : COR.escuro;
          g.fillRect(x + 5, y - 1, nome ? 10 : n % 10 === 0 ? 7 : 4, 2);
          if (nome) g.fillText(String(n), x + 38, y);
        }
        g.textAlign = 'start';
        g.globalAlpha = 1;
      }

      function desenhar(g, L, A, t, dt, est) {
        if (!ceu || L0 !== L || A0 !== A) medir(L, A);
        g.drawImage(ceu, 0, 0, L, A);
        // as nuvens andando devagar
        for (const n of nuvens) {
          const w = n.img.width;
          const x = ((n.x + t * n.v) % (L + w)) - w;
          g.globalAlpha = n.a;
          g.drawImage(n.img, x, n.y);
          g.globalAlpha = 1;
        }
        // o facho do farol, girando (amarelo quando a maré baixa)
        farol = Math.max(0, farol - dt * 1.2);
        const fa = ceu.farol;
        if (fa) {
          const ang = est.rm ? -0.3 : t * 1.1;
          const corFacho = farol > 0 ? misturar(COR.perola, COR.amarelo, farol) : COR.perola;
          g.save();
          g.globalCompositeOperation = 'lighter';
          for (const lado of [0, Math.PI]) {
            const a = ang + lado;
            const comp = Math.max(L, A) * 0.55;
            const visivel = 0.35 + 0.65 * Math.abs(Math.cos(a)); // de frente, mais forte
            const d = g.createRadialGradient(fa.x, fa.y, 0, fa.x, fa.y, comp);
            d.addColorStop(0, alfa(corFacho, (0.22 + 0.25 * farol) * visivel));
            d.addColorStop(1, alfa(corFacho, 0));
            g.fillStyle = d;
            g.beginPath();
            g.moveTo(fa.x, fa.y);
            g.lineTo(fa.x + Math.cos(a - 0.06) * comp, fa.y + Math.sin(a - 0.06) * comp * 0.35);
            g.lineTo(fa.x + Math.cos(a + 0.06) * comp, fa.y + Math.sin(a + 0.06) * comp * 0.35);
            g.closePath();
            g.fill();
          }
          const luz = g.createRadialGradient(fa.x, fa.y, 0, fa.x, fa.y, fa.r * 5);
          luz.addColorStop(0, alfa(COR.amarelo, 0.9));
          luz.addColorStop(0.25, alfa(COR.amarelo, 0.35 + 0.4 * farol));
          luz.addColorStop(1, alfa(COR.amarelo, 0));
          g.fillStyle = luz;
          g.fillRect(fa.x - fa.r * 5, fa.y - fa.r * 5, fa.r * 10, fa.r * 10);
          g.restore();
        }
        // o mar lá longe, com umas ondulações que andam devagar
        g.lineWidth = 1;
        const hz = horizonte(A);
        for (let i = 1; i <= 6; i++) {
          const y = hz + Math.pow(i / 7, 1.7) * (A - hz) * 0.55;
          g.strokeStyle = alfa(COR.perola, 0.05 + 0.02 * (i % 2));
          g.beginPath();
          for (let x = 0; x <= L + 12; x += 12) {
            const yy = y + Math.sin(x / (60 + i * 30) + (est.rm ? 0 : t) * (0.4 + i * 0.08) + i * 1.7) * (0.6 + i * 0.5);
            if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
          }
          g.stroke();
        }
        // a régua de maré, à esquerda, na frente (só onde sobra lugar ao lado da pergunta; no celular, a pílula diz a maré)
        const xr = Math.max(18, (L - 760) / 4);
        const temRegua = L >= 900;
        if (temRegua) regua(g, A, xr, 1);
        // a água: sobe com uma sobra e assenta (no erro), baixa devagar (nos 5 seguidos)
        const alvo = Math.max(0, Math.min(100, est.nivel || 0));
        if (est.rm) { aguaVis = alvo; velAgua = 0; } else { // uma mola amortecida: passa uns 10% e assenta em menos de 1 s
          velAgua += ((alvo - aguaVis) * 60 - velAgua * 9) * dt;
          aguaVis += velAgua * dt;
        }
        const perigo = Math.max(0, Math.min(1, (aguaVis - 65) / 25));
        crista = Math.max(0, crista - dt * 1.1);
        const fase = est.rm ? 0 : t;
        const yMar = yNivel(A, aguaVis) - 22;
        const { yFrente } = mar(g, L, A, yMar, fase, {
          corTopo: misturar(misturar(COR.turquesa, COR.lilas, 0.3), misturar(COR.turquesaEscura, COR.coralSombra, 0.5), perigo),
          corFundo: misturar(COR.turquesaEscura, COR.fundo, 0.62), crista,
          espuma: perigo > 0.5 ? COR.coral : COR.perola, espumaA: 0.35 + 0.3 * perigo,
        });
        // o poste continua embaixo d'água, apagado
        if (temRegua) {
          g.save();
          g.beginPath();
          g.rect(0, yFrente + 4, L, A);
          g.clip();
          regua(g, A, xr, 0.28);
          g.restore();
        }
        // as faíscas douradas quando a maré baixa
        for (let i = brilhos.length - 1; i >= 0; i--) {
          const b = brilhos[i];
          b.k += dt * 1.4;
          if (b.k >= 1) { brilhos.splice(i, 1); continue; }
          const s = Math.sin(Math.PI * b.k);
          const y = yFrente + b.dy;
          g.strokeStyle = alfa(COR.amarelo, 0.85 * s);
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(b.x - 6 * s, y);
          g.lineTo(b.x + 6 * s, y);
          g.moveTo(b.x, y - 6 * s);
          g.lineTo(b.x, y + 6 * s);
          g.stroke();
        }
      }

      function reagir(tipo, info, est) {
        if (est.rm) return; // com "reduzir movimento", a água só muda de altura
        if (tipo === 'onda') {
          crista = 1;
          info.tremer(0.8);
          const y = yNivel(A0, est.nivel || 0) - 10;
          for (let i = 0; i < 7; i++) info.espirrar(L0 * (0.08 + i * 0.14), y, COR.perola, 7, 1.1);
        } else if (tipo === 'baixa') {
          farol = 1;
          for (let i = 0; i < 18; i++) brilhos.push({ x: Math.random() * L0, dy: 6 + Math.random() * 40, k: -Math.random() * 0.6 });
        }
      }

      return { medir, desenhar, reagir };
    }
  },
});

/*
 * Cartas do Fundo (cartas-do-fundo) — flashcards com autoavaliação.
 * Vire a carta, veja a resposta e diga: Sabia · Quase · Não sabia.
 * Alimenta as caixas de Leitner (1 a 5): Sabia sobe, Quase mantém, Não sabia volta à 1.
 * Só "Sabia" conta como acerto; "Não sabia" vai para a Revisão.
 * Teclado: Espaço vira; 1, 2 e 3 avaliam.
 * opcoes.fase: só as cartas daquela fase (vindo do fim do Mergulho). Com menos de 4, usa a trilha toda.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): a zona do crepúsculo, com águas-vivas que pulsam e brilham no
 * escuro. "Sabia" acende a água-viva mais perto da carta; "Quase" e "Não sabia" só mudam de carta (é uma conversa
 * consigo mesmo, sem bronca). Regras, caixas e XP iguais; o fim fica no próprio jogo, com "Jogar de novo" (na fase,
 * "Voltar para a trilha" é o principal e "Mais cartas desta fase" joga de novo).
 */
Jogos.registrar({
  id: 'cartas-do-fundo',
  nome: 'Cartas do Fundo',
  grupo: 'rapidos',
  icone: 'i-livro',
  descricao: 'Vire a carta e diga se sabia. As que você não sabe voltam mais cedo.',
  duracao: '2-5 min',
  requer: { flash: 4 },
  telaCheia: true,

  iniciar(ctx) {
    const { h } = UI;
    const quantidade = ctx.opcoes.quantidade || 10;
    const leitner = ctx.prog.leitner || (ctx.prog.leitner = {});
    const palco = Palco.montar(ctx, { id: 'cartas', cena: cenaCrepusculo() });
    let rodada = null; // { fila, detalhes, inicio, i, virada, inicioCarta }

    function comecar() {
      // Caixas menores primeiro: o que você sabe menos aparece antes
      const daFase = ctx.opcoes.fase ? ctx.cartas.flash.filter((c) => c.fase === ctx.opcoes.fase) : [];
      const fila = UI.embaralhar(daFase.length >= 4 ? daFase : ctx.cartas.flash)
        .sort((a, b) => (leitner[a.id] || 1) - (leitner[b.id] || 1))
        .slice(0, quantidade);
      rodada = { fila, detalhes: [], inicio: Date.now(), i: 0, virada: false, inicioCarta: Date.now() };
      desenhar();
    }

    function contar() {
      const d = rodada.detalhes;
      return { sabia: d.filter((x) => x.acertou).length, quase: d.filter((x) => x.neutro).length, nao: d.filter((x) => !x.acertou && !x.neutro).length };
    }

    function desenhar() {
      const { fila, i } = rodada;
      const c = fila[i];
      rodada.virada = false;
      rodada.inicioCarta = Date.now();
      const n = contar();
      palco.hud(
        palco.pilula(`Carta ${i + 1} de ${fila.length}`, { icone: 'i-cartas', classe: 'palco__pilula--turquesa' }),
        palco.pilula(`Caixa ${leitner[c.id] || 1} de 5`, { icone: 'i-arquivo', rotulo: `Esta carta está na caixa ${leitner[c.id] || 1} de 5` }),
        palco.pilula(`Sabia: ${n.sabia}`, { icone: 'i-check', classe: n.sabia ? 'palco__pilula--destaque' : '' }));
      const carta = h('button', { type: 'button', class: 'flash', 'aria-pressed': 'false', 'aria-label': 'Carta: toque ou aperte Espaço para virar', onclick: virar },
        h('span', { class: 'flash__lado flash__frente' },
          h('span', { class: 'rotulo', text: c.tema }),
          h('span', { class: 'flash__texto', text: c.frente }),
          c.codigo ? h('span', { class: 'codigo', text: String(c.codigo).replace(/\n+$/, '') }) : null, // dentro do botão: sem foco próprio
          h('span', { class: 'flash__dica', text: 'Toque para virar' })),
        h('span', { class: 'flash__lado flash__verso' },
          h('span', { class: 'rotulo', text: 'Resposta' }),
          h('strong', { class: 'flash__resposta', text: c.verso }),
          h('span', { class: 'flash__explicacao', text: c.explicacao })));
      const avaliacao = h('div', { class: 'flash-avaliacao', hidden: true },
        h('p', { class: 'flash-avaliacao__pergunta', text: 'E aí, você sabia?' }),
        h('div', { class: 'flash-avaliacao__botoes' },
          h('button', { type: 'button', class: 'botao botao--erro', 'aria-keyshortcuts': '3', onclick: () => avaliar('nao') }, 'Não sabia', h('kbd', { text: '3' })),
          h('button', { type: 'button', class: 'botao botao--fantasma', 'aria-keyshortcuts': '2', onclick: () => avaliar('quase') }, 'Quase', h('kbd', { text: '2' })),
          h('button', { type: 'button', class: 'botao botao--primario', 'aria-keyshortcuts': '1', onclick: () => avaliar('sabia') }, 'Sabia', h('kbd', { text: '1' }))));
      palco.area.replaceChildren(h('div', { class: 'flash-palco' }, carta, avaliacao));
      carta.focus({ preventScroll: true });
    }

    function virar() {
      if (!rodada || rodada.virada) return;
      rodada.virada = true;
      const carta = palco.area.querySelector('.flash');
      carta.classList.add('flash--virada');
      carta.setAttribute('aria-pressed', 'true');
      carta.setAttribute('aria-label', `Resposta: ${rodada.fila[rodada.i].verso}`);
      palco.tocar('virar');
      const av = palco.area.querySelector('.flash-avaliacao');
      av.hidden = false;
      av.querySelector('.botao--primario').focus({ preventScroll: true });
    }

    function avaliar(nota) {
      if (!rodada || !rodada.virada) return;
      const c = rodada.fila[rodada.i];
      const caixa = leitner[c.id] || 1;
      leitner[c.id] = nota === 'sabia' ? Math.min(5, caixa + 1) : nota === 'nao' ? 1 : caixa;
      rodada.detalhes.push(JogoComum.detalhe(c, nota === 'sabia', {
        inicio: rodada.inicioCarta, pergunta: c.frente, resposta: c.verso, neutro: nota === 'quase',
        sua: nota === 'nao' ? 'Você marcou "Não sabia".' : '',
      }));
      const carta = palco.area.querySelector('.flash');
      if (nota === 'sabia') palco.reagir('acerto', { el: carta });
      else palco.tocar('clique');
      palco.reagir(nota === 'sabia' ? 'acende' : 'segue', { el: carta });
      rodada.i++;
      if (rodada.i < rodada.fila.length) desenhar();
      else terminar();
    }

    function terminar() {
      const { fila, detalhes, inicio } = rodada;
      const n = contar();
      rodada = null;
      palco.area.replaceChildren();
      palco.hud();
      palco.terminar(Jogos.resultado({
        jogoId: 'cartas-do-fundo', trilha: ctx.trilha, detalhes, inicio,
        titulo: n.sabia === fila.length ? 'Baú completo!' : 'Baú revisado',
        subtitulo: `Você sabia ${n.sabia} de ${fila.length} cartas. As que ficaram para trás voltam mais cedo.`,
      }), {
        tom: n.sabia >= fila.length / 2 ? 'vitoria' : 'derrota',
        numeros: [['Sabia', `${n.sabia}/${fila.length}`, true], ['Quase', n.quase], ['Não sabia', n.nao], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
        aoJogarDeNovo: comecar,
      });
    }

    const desligar = JogoComum.teclas((e) => {
      if (!rodada) return;
      if (e.key === ' ' && !rodada.virada) {
        e.preventDefault();
        virar();
      } else if (rodada.virada && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        avaliar({ 1: 'sabia', 2: 'quase', 3: 'nao' }[e.key]);
      }
    });

    const daFase = ctx.opcoes.fase ? ctx.cartas.flash.filter((c) => c.fase === ctx.opcoes.fase).length : 0;
    palco.abertura({
      rotulo: 'Na zona do crepúsculo',
      titulo: 'Cartas do Fundo',
      lead: 'Vire a carta, confira a resposta e seja sincero: você sabia? As que você não sabe voltam mais cedo.',
      passos: [
        ['01', 'Vire a carta. ', 'Toque nela ou aperte Espaço.'],
        ['02', 'Diga se sabia. ', '"Sabia" sobe a carta de caixa, "Quase" mantém e "Não sabia" volta para a caixa 1 (no teclado: 1, 2 e 3).'],
        ['03', 'Só "Sabia" vale acerto. ', `São ${Math.min(quantidade, daFase >= 4 ? daFase : ctx.cartas.flash.length)} cartas${daFase >= 4 ? ' desta fase' : ''}, das caixas menores para as maiores.`],
      ],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() {
        desligar();
        palco.parar();
      },
    };

    /* ---------- A cena: a zona do crepúsculo, com águas-vivas ---------- */
    function cenaCrepusculo() {
      const { COR, misturar, alfa, degrade, raios, poeira, seme, tela } = Palco.pintar;
      let fundo = null;
      let L0 = 0;
      let A0 = 0;
      let aguas = [];

      function medir(L, A) {
        L0 = L;
        A0 = A;
        fundo = tela(L, A);
        const f = fundo.getContext('2d');
        f.fillStyle = degrade(f, 0, A, [[0, misturar(COR.marinho, COR.turquesaEscura, 0.25)], [0.45, COR.marinho], [1, COR.fundo]]);
        f.fillRect(0, 0, L, A);
        const r = seme(53);
        aguas = Array.from({ length: Math.max(5, Math.round(L / 240)) }, (_, i) => {
          const perto = r(); // as de perto são maiores, mais rápidas e mais nítidas
          return {
            x: r() * L, y: r() * A, s: 16 + perto * 30, v: 6 + perto * 10, fase: r() * 6, perto,
            cor: i % 3 === 0 ? COR.lilas : i % 3 === 1 ? COR.claro : misturar(COR.coral, COR.lilas, 0.5), acesa: 0,
          };
        });
      }

      /** Uma água-viva: o sino pulsando, o brilho em volta e os tentáculos ondulando */
      function aguaViva(g, a, t) {
        const pulso = 0.5 + 0.5 * Math.sin(t * 1.6 + a.fase); // 1 = aberta, 0 = contraída
        const larg = a.s * (0.85 + 0.25 * pulso);
        const alt = a.s * (0.75 - 0.15 * pulso);
        const brilho = 0.12 + 0.1 * a.perto + 0.5 * a.acesa;
        const halo = g.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.s * 2.4);
        halo.addColorStop(0, alfa(a.cor, brilho));
        halo.addColorStop(1, alfa(a.cor, 0));
        g.fillStyle = halo;
        g.fillRect(a.x - a.s * 2.4, a.y - a.s * 2.4, a.s * 4.8, a.s * 4.8);
        // os tentáculos
        g.strokeStyle = alfa(a.cor, 0.25 + 0.2 * a.perto + 0.4 * a.acesa);
        g.lineWidth = 1.2 + a.perto;
        g.lineCap = 'round';
        for (let k = 0; k < 5; k++) {
          const x0 = a.x - larg * 0.6 + (larg * 1.2 * k) / 4;
          g.beginPath();
          g.moveTo(x0, a.y);
          for (let j = 1; j <= 6; j++) {
            const y = a.y + (a.s * 1.6 * j) / 6;
            g.lineTo(x0 + Math.sin(t * 2 + a.fase + k + j * 0.7) * (2 + j * 1.2), y);
          }
          g.stroke();
        }
        // o sino
        const d = g.createRadialGradient(a.x, a.y - alt * 0.5, 0, a.x, a.y - alt * 0.3, larg);
        d.addColorStop(0, alfa(misturar(a.cor, COR.branco, 0.4), 0.55 + 0.35 * a.acesa));
        d.addColorStop(0.7, alfa(a.cor, 0.28 + 0.2 * a.perto));
        d.addColorStop(1, alfa(a.cor, 0.05));
        g.fillStyle = d;
        g.beginPath();
        g.moveTo(a.x - larg, a.y);
        g.bezierCurveTo(a.x - larg, a.y - alt * 1.4, a.x + larg, a.y - alt * 1.4, a.x + larg, a.y);
        g.quadraticCurveTo(a.x, a.y - alt * 0.25, a.x - larg, a.y);
        g.fill();
      }

      function desenhar(g, L, A, t, dt, est) {
        if (!fundo || L0 !== L || A0 !== A) medir(L, A);
        g.drawImage(fundo, 0, 0, L, A);
        raios(g, L, A * 0.6, t, COR.claro, 0.04);
        poeira(g, L, A, t, alfa(COR.texto, 0.4), 50, 6);
        for (const a of aguas) {
          if (!est.rm) { // com "reduzir movimento", elas ficam paradas
            a.y -= a.v * dt * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.6 + a.fase))); // sobe no ritmo do pulso
            if (a.y < -a.s * 3) { a.y = A + a.s * 2; a.x = Math.random() * L; }
            a.x += Math.sin(t * 0.3 + a.fase) * dt * 4;
          }
          a.acesa = Math.max(0, a.acesa - dt * 0.8);
          aguaViva(g, a, t);
        }
      }

      function reagir(tipo, info, est) {
        if (est.rm || tipo !== 'acende') return; // com "reduzir movimento", as águas-vivas não piscam
        // a água-viva mais perto da carta acende
        let melhor = null;
        let dist = Infinity;
        for (const a of aguas) {
          const d = Math.hypot(a.x - info.x, a.y - info.y);
          if (d < dist) { dist = d; melhor = a; }
        }
        if (melhor) melhor.acesa = 1;
        info.espirrar(info.x, info.y, COR.claro, 10, 0.6);
      }

      return { medir, desenhar, reagir };
    }
  },
});

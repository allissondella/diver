/*
 * Chefão do Abismo (chefao) — um monstro marinho com barra de vida, um por profundidade.
 * Vida = nº de questões da fase × 10. Acerto causa dano (fácil 10, médio 15, difícil 20);
 * combo (3+ seguidos) multiplica por 1,5. Erro = −1 oxigênio e o chefão ataca.
 * Vitória: +30 XP e +5 pérolas; sem perder oxigênio, +5 pérolas extras.
 * O chefão do Raso está sempre liberado; os outros, ao completar a fase no Mergulho.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): o abismo, mais escuro a cada profundidade, com raios de luz,
 * neve marinha e algas no fundo; o chefão fica grande no alto, com um brilho na cor dele. Cada acerto é um golpe (onda
 * de choque, bolhas e o dano subindo); cada erro, um ataque (a borda da tela fica coral). Regras, dano, vida, oxigênio,
 * bônus e XP iguais; o fim fica no próprio jogo ("Revanche" ou "Escolher outro chefão").
 */
Jogos.registrar({
  id: 'chefao',
  nome: 'Chefão do Abismo',
  grupo: 'aventuras',
  icone: 'i-kraken',
  descricao: 'Um monstro marinho por profundidade. Cada acerto é um golpe.',
  duracao: '3-6 min',
  requer: { multipla: 4 },
  telaCheia: true,

  iniciar(ctx) {
    const { h } = UI;
    const DANO = { facil: 10, medio: 15, dificil: 20 };
    const OXIGENIO = 3;
    // Arte provisória em SVG (ilustrações finais na Semana 23). Cores = tokens da paleta; cor = o brilho dele na cena.
    const CHEFOES = [
      { nome: 'Baiacu Bravo', cor: 'amarelo', svg: '<circle cx="60" cy="52" r="32" style="fill:var(--amarelo)"/><g style="stroke:var(--marinho);stroke-width:4;stroke-linecap:round"><path d="M60 14v-8M60 90v8M22 52h-8M98 52h8M33 25l-6-6M87 25l6-6M33 79l-6 6M87 79l6 6"/></g><circle cx="48" cy="45" r="7" fill="#fff"/><circle cx="72" cy="45" r="7" fill="#fff"/><circle cx="49" cy="47" r="3.5" style="fill:var(--marinho)"/><circle cx="71" cy="47" r="3.5" style="fill:var(--marinho)"/><path d="M40 36l14 5M80 36l-14 5" style="stroke:var(--marinho);stroke-width:3.5;stroke-linecap:round"/><ellipse cx="60" cy="66" rx="9" ry="6" style="fill:var(--coral)"/>' },
      { nome: 'Moreia Mal-Humorada', cor: 'turquesa', svg: '<path d="M8 80 Q30 40 50 70 T96 50" fill="none" style="stroke:var(--turquesa-sombra);stroke-width:22;stroke-linecap:round"/><circle cx="96" cy="42" r="18" style="fill:var(--turquesa)"/><circle cx="100" cy="36" r="5" fill="#fff"/><circle cx="101" cy="37" r="2.5" style="fill:var(--marinho)"/><path d="M84 50 L112 50 L108 56 L104 51 L100 56 L96 51 L92 56 L88 51Z" fill="#fff" style="stroke:var(--marinho);stroke-width:1.5"/>' },
      { nome: 'Peixe-Lanterna', cor: 'amarelo', svg: '<path d="M60 18 Q70 2 88 10" fill="none" style="stroke:var(--texto-suave);stroke-width:3"/><circle cx="90" cy="12" r="7" style="fill:var(--amarelo)"/><ellipse cx="58" cy="58" rx="42" ry="30" style="fill:var(--superficie-2)"/><path d="M96 58 L116 40 L116 76Z" style="fill:var(--superficie-2)"/><circle cx="40" cy="46" r="8" fill="#fff"/><circle cx="38" cy="47" r="4" style="fill:var(--marinho)"/><path d="M18 64 Q40 84 64 64Z" style="fill:var(--marinho)"/><path d="M22 66l5 7 4-8 5 9 4-9 5 8 4-8 5 6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' },
      { nome: 'Kraken', cor: 'coral', svg: '<g style="stroke:var(--coral);stroke-width:9;stroke-linecap:round;fill:none"><path d="M30 60 Q14 80 24 96"/><path d="M46 66 Q40 86 52 98"/><path d="M74 66 Q80 86 68 98"/><path d="M90 60 Q106 80 96 96"/></g><ellipse cx="60" cy="42" rx="36" ry="32" style="fill:var(--coral)"/><circle cx="46" cy="44" r="8" fill="#fff"/><circle cx="74" cy="44" r="8" fill="#fff"/><circle cx="47" cy="46" r="4" style="fill:var(--marinho)"/><circle cx="73" cy="46" r="4" style="fill:var(--marinho)"/><path d="M50 60 Q60 54 70 60" fill="none" style="stroke:var(--marinho);stroke-width:3.5;stroke-linecap:round"/>' },
    ];
    const fases = ctx.trilha.fases;
    const palco = Palco.montar(ctx, { id: 'chefao', cena: cenaAbismo() });
    palco.estado.ponto = palco.pontoDe; // a cena acha o chefão na tela (para o brilho atrás dele)
    let atual = null;

    const liberado = (i) => Progresso.faseDesbloqueada(ctx.prog, ctx.trilha, i);
    const chefeDe = (i) => CHEFOES[Math.min(i, CHEFOES.length - 1)];

    function arte(i, classe = '') {
      const c = chefeDe(i);
      const div = h('div', { class: `chefe ${classe}`, 'aria-hidden': 'true' });
      div.innerHTML = `<svg viewBox="0 0 120 104">${c.svg}</svg>`; // SVG fixo do código, não vem de JSON
      return div;
    }

    /* ---- Escolha do chefão (ainda não vale: sair daqui não pergunta) ---- */
    function escolher() {
      if (atual) atual.destruir();
      atual = null;
      palco.jogando(false);
      palco.estado.chefe = null;
      palco.estado.profundidade = 0;
      palco.hud();
      const lista = h('div', { class: 'chefoes' });
      fases.forEach((f, i) => {
        const ok = liberado(i);
        const nome = chefeDe(i).nome;
        lista.append(h('button', {
          type: 'button', class: `chefe-opcao ${ok ? '' : 'chefe-opcao--bloqueada'}`, disabled: !ok,
          onclick: () => lutar(i),
          'aria-label': ok ? `Enfrentar ${nome}, chefão do ${f.nome}` : `${nome}, bloqueado: complete a fase ${f.nome} no Mergulho`,
        }, arte(i), h('strong', { text: nome }), h('span', { text: ok ? `Chefão do ${f.nome}` : `Complete ${f.nome} no Mergulho` })));
      });
      palco.area.replaceChildren(h('p', { class: 'jogo-intro', text: 'Escolha quem enfrentar. Cada acerto é um golpe; cada erro, um ataque do chefão.' }), lista);
      lista.querySelector('button:not(:disabled)').focus({ preventScroll: true });
    }

    /* ---- Batalha ---- */
    function lutar(indice) {
      palco.jogando(true);
      const inicio = Date.now();
      const fase = fases[indice];
      const nome = chefeDe(indice).nome;
      const daFase = UI.embaralhar(Trilhas.questoesDaFase(ctx.trilha, fase.id));
      const reserva = UI.embaralhar(ctx.cartas.multipla.filter((q) => q.fase !== fase.id));
      const vidaMax = Math.max(40, daFase.length * 10);
      let vida = vidaMax;
      let oxigenio = OXIGENIO;
      let combo = 0;
      let comboMaximo = 0;
      let golpes = 0;
      const detalhes = [];

      const figura = arte(indice, 'chefe--batalha');
      const barra = h('div', { class: 'vida', role: 'meter', 'aria-label': `Vida do ${nome}`, 'aria-valuemin': '0', 'aria-valuemax': String(vidaMax) }, h('div', { class: 'vida__barra' }));
      const vidaTexto = h('span', { class: 'chefe-vida' });
      const narracao = h('p', { class: 'chefe-narracao', 'aria-live': 'polite', text: `${nome} apareceu!` });
      const arena = h('div', { class: 'arena' }, figura, h('div', { class: 'arena__info' }, h('strong', { class: 'arena__nome', text: nome }), barra, vidaTexto));
      const area = h('div', { class: 'chefe-batalha__questao' });
      // o chefão fica sempre à vista: ao lado da pergunta na tela larga, preso no alto no celular
      palco.area.replaceChildren(h('div', { class: 'chefe-batalha' }, h('div', { class: 'chefe-batalha__lado' }, arena, narracao), area));
      palco.estado.chefe = { el: figura, cor: Palco.COR[chefeDe(indice).cor] };
      palco.estado.profundidade = fases.length > 1 ? indice / (fases.length - 1) : 0;

      function atualizar(perdeu = false) {
        barra.firstChild.style.width = `${(vida / vidaMax) * 100}%`;
        barra.setAttribute('aria-valuenow', String(vida));
        vidaTexto.textContent = `Vida: ${vida}/${vidaMax}`;
        const tanques = JogoComum.oxigenio(oxigenio, OXIGENIO);
        tanques.classList.add('palco__pilula');
        if (perdeu) tanques.querySelectorAll('.icone')[oxigenio].classList.add('perdeu');
        palco.hud(tanques,
          palco.pilula(combo >= 3 ? 'Combo x1,5' : `Sequência: ${combo}`, { classe: combo >= 3 ? 'palco__pilula--destaque' : '' }),
          palco.pilula(`${golpes} ${golpes === 1 ? 'golpe' : 'golpes'}`, { icone: 'i-raio', classe: 'palco__pilula--turquesa' }));
      }

      function efeito(classe) {
        figura.classList.remove(classe);
        void figura.offsetWidth;
        figura.classList.add(classe);
        figura.addEventListener('animationend', () => figura.classList.remove(classe), { once: true }); // e volta a flutuar
      }

      /** O dano sobe do chefão e some */
      function mostrarDano(dano, critico) {
        const n = h('span', { class: `chefe-dano ${critico ? 'chefe-dano--critico' : ''}`, 'aria-hidden': 'true', text: `−${dano}` });
        arena.append(n);
        setTimeout(() => n.remove(), 950);
      }

      function proxima() {
        if (atual) atual.destruir();
        if (vida <= 0 || oxigenio <= 0) return fim();
        const q = daFase.shift() || reserva.shift() || UI.sortear(ctx.cartas.multipla);
        atual = JogoComum.questao(area, q, {
          palco,
          aoResponder(acertou, d) {
            detalhes.push(d);
            if (acertou) {
              combo++;
              golpes++;
              comboMaximo = Math.max(comboMaximo, combo);
              const dano = Math.round(DANO[q.dificuldade] * (combo >= 3 ? 1.5 : 1));
              vida = Math.max(0, vida - dano);
              narracao.textContent = combo >= 3 ? `Golpe crítico! −${dano} de vida.` : `Acertou em cheio! −${dano} de vida.`;
              efeito('chefe--dano');
              mostrarDano(dano, combo >= 3);
              palco.reagir('golpe', { el: figura });
              if (vida <= 0) figura.classList.add('chefe--derrotado');
              atualizar();
            } else {
              combo = 0;
              oxigenio--;
              narracao.textContent = `${nome} atacou! Você perdeu 1 oxigênio.`;
              efeito('chefe--ataca');
              palco.reagir('ataque', { el: figura });
              atualizar(true);
            }
          },
          aoContinuar: proxima,
          get textoContinuar() {
            return vida <= 0 || oxigenio <= 0 ? 'Ver resultado' : 'Próxima';
          },
        });
      }

      function fim() {
        const venceu = vida <= 0;
        const bonus = venceu ? { xp: 30, perolas: 5 + (oxigenio === OXIGENIO ? 5 : 0) } : { xp: 0, perolas: 0 };
        palco.area.replaceChildren();
        palco.hud();
        palco.estado.chefe = null;
        palco.terminar(Jogos.resultado({
          jogoId: 'chefao', trilha: ctx.trilha, detalhes, inicio, comboMaximo, oxigenioRestante: oxigenio, bonus,
          concluido: venceu, pontuacao: venceu ? indice + 1 : 0,
          titulo: venceu ? `${nome} derrotado!` : `${nome} venceu desta vez`,
          subtitulo: venceu
            ? (oxigenio === OXIGENIO ? 'Sem perder oxigênio. Isso foi uma aula.' : 'Vitória suada, mas vitória. O fundo do mar agradece.')
            : 'Faltou fôlego, não coragem. Revise os pontos abaixo e volte pra revanche.',
        }), {
          tom: venceu ? 'vitoria' : 'derrota',
          numeros: [['Golpes', golpes, true], ['Vida do chefão', `${Math.round((vida / vidaMax) * 100)}%`], ['Oxigênio', `${oxigenio}/${OXIGENIO}`], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
          aoJogarDeNovo: venceu ? escolher : () => lutar(indice),
          textoDeNovo: venceu ? 'Escolher outro chefão' : 'Revanche',
        });
      }

      atualizar();
      proxima();
    }

    const liberados = fases.filter((f, i) => liberado(i)).length;
    palco.abertura({
      rotulo: 'No fundo do mar',
      titulo: 'Chefão do Abismo',
      lead: 'Um monstro marinho por profundidade. Cada acerto é um golpe; cada erro, um ataque.',
      passos: [
        ['01', 'Escolha o chefão. ', 'O do Raso está sempre liberado; os outros, quando você completa a fase no Mergulho.'],
        ['02', 'Acerto é golpe. ', 'Fácil tira 10 de vida, médio 15 e difícil 20; do 3º acerto seguido em diante, golpe crítico (×1,5).'],
        ['03', 'Erro é ataque. ', `Cada um custa 1 de ${OXIGENIO} oxigênios. Vencer vale +30 XP e +5 pérolas; sem perder oxigênio, +5 pérolas.`],
      ],
      numeros: [['Chefões liberados', `${liberados}/${fases.length}`, true]],
      aoComecar: escolher,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() {
        if (atual) atual.destruir();
        palco.parar();
      },
    };

    /* ---------- A cena: o abismo, mais escuro a cada profundidade ---------- */
    function cenaAbismo() {
      const { COR, misturar, alfa, degrade, raios, poeira, seme, tela } = Palco.pintar;
      let fundo = null; // a água e as pedras do fundo, guardadas (refaz quando a tela ou a profundidade mudam)
      let chave = '';
      let algas = [];
      let brilhos = []; // pontinhos que brilham no escuro (das profundidades do meio para baixo)
      const ondas = []; // as ondas de choque dos golpes
      let ataque = 0; // a borda coral do ataque
      let golpe = 0; // o brilho do chefão quando apanha

      function pintarFundo(L, A, prof) {
        fundo = tela(L, A);
        const f = fundo.getContext('2d');
        const alto = misturar(misturar(COR.turquesaEscura, COR.marinho, 0.45), misturar(COR.marinho, COR.fundo, 0.6), prof);
        const meio = misturar(misturar(COR.marinho, COR.turquesaEscura, 0.15), COR.fundo, 0.35 + prof * 0.45);
        f.fillStyle = degrade(f, 0, A, [[0, alto], [0.55, meio], [1, COR.fundo]]);
        f.fillRect(0, 0, L, A);
        // as pedras do fundo: três fileiras de morros, a de trás mais clara
        const r = seme(17);
        [[0.8, 0.35], [0.86, 0.6], [0.93, 1]].forEach(([base, perto]) => {
          f.fillStyle = misturar(misturar(COR.marinho, COR.turquesaEscura, 0.12 * (1 - prof)), COR.fundo, 0.35 + perto * 0.55);
          f.beginPath();
          f.moveTo(0, A);
          let x = 0;
          f.lineTo(0, A * base);
          while (x < L) {
            const w = 60 + r() * 140;
            const alt = A * (0.02 + r() * 0.06) * (0.6 + perto * 0.6);
            f.quadraticCurveTo(x + w / 2, A * base - alt * 2, x + w, A * base + (r() - 0.5) * A * 0.02);
            x += w;
          }
          f.lineTo(L, A);
          f.closePath();
          f.fill();
        });
        algas = Array.from({ length: Math.max(6, Math.round(L / 90)) }, () => ({ x: r() * L, alt: A * (0.08 + r() * 0.14), fase: r() * 6, larg: 3 + r() * 4, perto: r() }));
        brilhos = prof < 0.4 ? [] : Array.from({ length: Math.round(18 * prof) }, () => ({ x: r() * L, y: A * (0.25 + r() * 0.6), fase: r() * 6, cor: r() < 0.6 ? COR.claro : COR.lilas }));
      }

      function desenhar(g, L, A, t, dt, est) {
        const prof = est.profundidade || 0;
        const nova = `${L}x${A}:${prof.toFixed(3)}`;
        if (!fundo || nova !== chave) { chave = nova; pintarFundo(L, A, prof); }
        g.drawImage(fundo, 0, 0, L, A);
        // a luz da superfície, cada vez mais fraca para baixo
        raios(g, L, A * 0.85, t, COR.claro, 0.08 * (1 - prof * 0.75));
        // as algas balançando no fundo
        for (const a of algas) {
          const y0 = A * 0.97;
          const balanco = Math.sin(t * 0.8 + a.fase) * 10;
          g.strokeStyle = misturar(misturar(COR.turquesaEscura, COR.fundo, 0.55 + prof * 0.3), COR.marinho, a.perto * 0.3);
          g.lineWidth = a.larg;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(a.x, y0);
          g.quadraticCurveTo(a.x + balanco, y0 - a.alt * 0.55, a.x + balanco * 1.6, y0 - a.alt);
          g.stroke();
        }
        // os brilhos do escuro e a neve marinha
        for (const b of brilhos) {
          const k = 0.5 + 0.5 * Math.sin(t * 1.4 + b.fase);
          g.fillStyle = alfa(b.cor, 0.15 + 0.45 * k);
          g.beginPath();
          g.arc(b.x + Math.sin(t * 0.3 + b.fase) * 6, b.y, 1.2 + k, 0, Math.PI * 2);
          g.fill();
        }
        poeira(g, L, A, t, alfa(COR.texto, 0.45), 46, 7);
        // o brilho atrás do chefão, na cor dele (mais forte quando apanha)
        golpe = Math.max(0, golpe - dt * 2.4);
        if (est.chefe && est.chefe.el && est.ponto) {
          const p = est.ponto(est.chefe.el);
          const pulsa = est.rm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.6);
          const raio = Math.max(90, Math.min(L, A) * 0.2) * (1 + golpe * 0.4);
          const d = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio);
          d.addColorStop(0, alfa(est.chefe.cor, 0.16 + 0.08 * pulsa + 0.3 * golpe));
          d.addColorStop(1, alfa(est.chefe.cor, 0));
          g.fillStyle = d;
          g.fillRect(p.x - raio, p.y - raio, raio * 2, raio * 2);
        }
        // as ondas de choque dos golpes
        const agora = performance.now();
        for (let i = ondas.length - 1; i >= 0; i--) {
          const o = ondas[i];
          const k = (agora - o.t0) / 650;
          if (k >= 1) { ondas.splice(i, 1); continue; }
          g.strokeStyle = alfa(o.cor, 0.6 * (1 - k));
          g.lineWidth = 3 * (1 - k) + 1;
          g.beginPath();
          g.arc(o.x, o.y, 30 + k * 150, 0, Math.PI * 2);
          g.stroke();
        }
        // o ataque: a borda da tela fica coral por um instante
        ataque = Math.max(0, ataque - dt * 1.8);
        if (ataque > 0) {
          const d = g.createRadialGradient(L / 2, A / 2, Math.min(L, A) * 0.3, L / 2, A / 2, Math.max(L, A) * 0.75);
          d.addColorStop(0, alfa(COR.coral, 0));
          d.addColorStop(1, alfa(COR.coral, 0.4 * ataque));
          g.fillStyle = d;
          g.fillRect(0, 0, L, A);
        }
      }

      function reagir(tipo, info, est) {
        if (est.rm) return; // com "reduzir movimento", sem onda de choque nem borda piscando
        if (tipo === 'golpe') {
          ondas.push({ x: info.x, y: info.y, t0: performance.now(), cor: (est.chefe && est.chefe.cor) || COR.amarelo });
          info.espirrar(info.x, info.y, COR.claro, 16, 1);
          info.espirrar(info.x, info.y, COR.branco, 6, 0.6);
          golpe = 1;
        } else if (tipo === 'ataque') {
          ataque = 1;
          info.tremer(1);
        }
      }

      return { desenhar, reagir };
    }
  },
});

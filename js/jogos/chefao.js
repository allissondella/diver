/*
 * Chefão do Abismo (chefao) — um monstro marinho com barra de vida, um por profundidade.
 * Vida = nº de questões da fase × 10. Acerto causa dano (fácil 10, médio 15, difícil 20);
 * combo (3+ seguidos) multiplica por 1,5. Erro = −1 oxigênio e o chefão ataca.
 * Vitória: +30 XP e +5 pérolas; sem perder oxigênio, +5 pérolas extras.
 * O chefão do Raso está sempre liberado; os outros, ao completar a fase no Mergulho.
 */
Jogos.registrar({
  id: 'chefao',
  nome: 'Chefão do Abismo',
  grupo: 'aventuras',
  icone: 'i-kraken',
  descricao: 'Um monstro marinho por profundidade. Cada acerto é um golpe.',
  duracao: '3-6 min',
  requer: { multipla: 4 },

  iniciar(ctx) {
    const { h } = UI;
    const DANO = { facil: 10, medio: 15, dificil: 20 };
    const OXIGENIO = 3;
    // Arte provisória em SVG (ilustrações finais na Semana 23). Cores = tokens da paleta.
    const CHEFOES = [
      { nome: 'Baiacu Bravo', svg: '<circle cx="60" cy="52" r="32" style="fill:var(--amarelo)"/><g style="stroke:var(--marinho);stroke-width:4;stroke-linecap:round"><path d="M60 14v-8M60 90v8M22 52h-8M98 52h8M33 25l-6-6M87 25l6-6M33 79l-6 6M87 79l6 6"/></g><circle cx="48" cy="45" r="7" fill="#fff"/><circle cx="72" cy="45" r="7" fill="#fff"/><circle cx="49" cy="47" r="3.5" style="fill:var(--marinho)"/><circle cx="71" cy="47" r="3.5" style="fill:var(--marinho)"/><path d="M40 36l14 5M80 36l-14 5" style="stroke:var(--marinho);stroke-width:3.5;stroke-linecap:round"/><ellipse cx="60" cy="66" rx="9" ry="6" style="fill:var(--coral)"/>' },
      { nome: 'Moreia Mal-Humorada', svg: '<path d="M8 80 Q30 40 50 70 T96 50" fill="none" style="stroke:var(--turquesa-sombra);stroke-width:22;stroke-linecap:round"/><circle cx="96" cy="42" r="18" style="fill:var(--turquesa)"/><circle cx="100" cy="36" r="5" fill="#fff"/><circle cx="101" cy="37" r="2.5" style="fill:var(--marinho)"/><path d="M84 50 L112 50 L108 56 L104 51 L100 56 L96 51 L92 56 L88 51Z" fill="#fff" style="stroke:var(--marinho);stroke-width:1.5"/>' },
      { nome: 'Peixe-Lanterna', svg: '<path d="M60 18 Q70 2 88 10" fill="none" style="stroke:var(--texto-suave);stroke-width:3"/><circle cx="90" cy="12" r="7" style="fill:var(--amarelo)"/><ellipse cx="58" cy="58" rx="42" ry="30" style="fill:var(--superficie-2)"/><path d="M96 58 L116 40 L116 76Z" style="fill:var(--superficie-2)"/><circle cx="40" cy="46" r="8" fill="#fff"/><circle cx="38" cy="47" r="4" style="fill:var(--marinho)"/><path d="M18 64 Q40 84 64 64Z" style="fill:var(--marinho)"/><path d="M22 66l5 7 4-8 5 9 4-9 5 8 4-8 5 6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' },
      { nome: 'Kraken', svg: '<g style="stroke:var(--coral);stroke-width:9;stroke-linecap:round;fill:none"><path d="M30 60 Q14 80 24 96"/><path d="M46 66 Q40 86 52 98"/><path d="M74 66 Q80 86 68 98"/><path d="M90 60 Q106 80 96 96"/></g><ellipse cx="60" cy="42" rx="36" ry="32" style="fill:var(--coral)"/><circle cx="46" cy="44" r="8" fill="#fff"/><circle cx="74" cy="44" r="8" fill="#fff"/><circle cx="47" cy="46" r="4" style="fill:var(--marinho)"/><circle cx="73" cy="46" r="4" style="fill:var(--marinho)"/><path d="M50 60 Q60 54 70 60" fill="none" style="stroke:var(--marinho);stroke-width:3.5;stroke-linecap:round"/>' },
    ];
    const fases = ctx.trilha.fases;
    const inicio = Date.now();
    let atual = null;

    const liberado = (i) => Progresso.faseDesbloqueada(ctx.prog, ctx.trilha, i);

    function arte(i, classe = '') {
      const c = CHEFOES[Math.min(i, CHEFOES.length - 1)];
      const div = h('div', { class: `chefe ${classe}`, 'aria-hidden': 'true' });
      div.innerHTML = `<svg viewBox="0 0 120 104">${c.svg}</svg>`; // SVG fixo do código, não vem de JSON
      return div;
    }

    /* ---- Escolha do chefão ---- */
    function escolher() {
      const lista = h('div', { class: 'chefoes' });
      fases.forEach((f, i) => {
        const ok = liberado(i);
        const nome = CHEFOES[Math.min(i, CHEFOES.length - 1)].nome;
        lista.append(h('button', {
          type: 'button', class: `chefe-opcao ${ok ? '' : 'chefe-opcao--bloqueada'}`, disabled: !ok,
          onclick: () => lutar(i),
          'aria-label': ok ? `Enfrentar ${nome}, chefão do ${f.nome}` : `${nome}, bloqueado: complete a fase ${f.nome} no Mergulho`,
        }, arte(i), h('strong', { text: nome }), h('span', { text: ok ? `Chefão do ${f.nome}` : `Complete ${f.nome} no Mergulho` })));
      });
      ctx.container.replaceChildren(h('p', { class: 'jogo-intro', text: 'Escolha quem enfrentar. Cada acerto é um golpe; cada erro, um ataque do chefão.' }), lista);
      lista.querySelector('button:not(:disabled)').focus({ preventScroll: true });
    }

    /* ---- Batalha ---- */
    function lutar(indice) {
      const fase = fases[indice];
      const nome = CHEFOES[Math.min(indice, CHEFOES.length - 1)].nome;
      const daFase = UI.embaralhar(Trilhas.questoesDaFase(ctx.trilha, fase.id));
      const reserva = UI.embaralhar(ctx.cartas.multipla.filter((q) => q.fase !== fase.id));
      const vidaMax = Math.max(40, daFase.length * 10);
      let vida = vidaMax;
      let oxigenio = OXIGENIO;
      let combo = 0;
      let comboMaximo = 0;
      const detalhes = [];

      const figura = arte(indice, 'chefe--batalha');
      const barra = h('div', { class: 'vida', role: 'meter', 'aria-label': `Vida do ${nome}`, 'aria-valuemin': '0', 'aria-valuemax': String(vidaMax) }, h('div', { class: 'vida__barra' }));
      const status = h('div', { class: 'jogo-hud' });
      const narracao = h('p', { class: 'chefe-narracao', 'aria-live': 'polite', text: `${nome} apareceu!` });
      const palco = h('div');
      ctx.container.replaceChildren(h('div', { class: 'arena' }, figura, h('div', { class: 'arena__info' }, h('strong', { text: nome }), barra)), status, narracao, palco);

      function atualizar() {
        barra.firstChild.style.width = `${(vida / vidaMax) * 100}%`;
        barra.setAttribute('aria-valuenow', String(vida));
        status.replaceChildren(JogoComum.oxigenio(oxigenio, OXIGENIO), h('span', { text: `Vida: ${vida}/${vidaMax}` }), h('span', { class: `combo ${combo >= 3 ? 'combo--ativo' : ''}`, text: combo >= 3 ? `Combo x1,5` : `Sequência: ${combo}` }));
      }

      function efeito(classe) {
        figura.classList.remove(classe);
        void figura.offsetWidth;
        figura.classList.add(classe);
      }

      function proxima() {
        if (atual) atual.destruir();
        if (vida <= 0 || oxigenio <= 0) return fim();
        const q = daFase.shift() || reserva.shift() || UI.sortear(ctx.cartas.multipla);
        atual = JogoComum.questao(palco, q, {
          aoResponder(acertou, d) {
            detalhes.push(d);
            if (acertou) {
              combo++;
              comboMaximo = Math.max(comboMaximo, combo);
              const dano = Math.round(DANO[q.dificuldade] * (combo >= 3 ? 1.5 : 1));
              vida = Math.max(0, vida - dano);
              narracao.textContent = combo >= 3 ? `Golpe crítico! −${dano} de vida.` : `Acertou em cheio! −${dano} de vida.`;
              efeito('chefe--dano');
            } else {
              combo = 0;
              oxigenio--;
              narracao.textContent = `${nome} atacou! Você perdeu 1 oxigênio.`;
              efeito('chefe--ataca');
            }
            atualizar();
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
        ctx.aoTerminar(Jogos.resultado({
          jogoId: 'chefao', trilha: ctx.trilha, detalhes, inicio, comboMaximo, oxigenioRestante: oxigenio, bonus,
          concluido: venceu, pontuacao: venceu ? indice + 1 : 0,
          titulo: venceu ? `${nome} derrotado!` : `${nome} venceu desta vez`,
          subtitulo: venceu
            ? (oxigenio === OXIGENIO ? 'Sem perder oxigênio. Isso foi uma aula.' : 'Vitória suada, mas vitória. O fundo do mar agradece.')
            : 'Faltou fôlego, não coragem. Revise os pontos abaixo e volte pra revanche.',
        }));
      }

      atualizar();
      proxima();
    }

    escolher();
    return { destruir: () => atual && atual.destruir() };
  },
});

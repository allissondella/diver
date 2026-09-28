/*
 * Caça ao Tesouro (caca-ao-tesouro) — um mapa do fundo do mar com paradas; cada pergunta
 * respondida libera o próximo trecho até o baú de pérolas. Cada caça é gerada diferente:
 * perguntas sorteadas e em ordem crescente de dificuldade.
 * Erro custa 1 oxigênio (3 no total); sem oxigênio, termina com prêmio parcial.
 * Baú final: +25 XP e +5 pérolas.
 */
Jogos.registrar({
  id: 'caca-ao-tesouro',
  nome: 'Caça ao Tesouro',
  grupo: 'aventuras',
  icone: 'i-bau',
  descricao: 'Siga o mapa: cada acerto libera o trecho seguinte até o baú.',
  duracao: '3-6 min',
  requer: { multipla: 5 },

  iniciar(ctx) {
    const { h } = UI;
    const OXIGENIO = 3;
    const peso = { facil: 0, medio: 1, dificil: 2 };
    const paradas = Math.min(ctx.opcoes.paradas || 6, ctx.cartas.multipla.length);
    const perguntas = UI.embaralhar(ctx.cartas.multipla).slice(0, paradas).sort((a, b) => peso[a.dificuldade] - peso[b.dificuldade]);
    const detalhes = [];
    const inicio = Date.now();
    let feitas = 0;
    let oxigenio = OXIGENIO;
    let atual = null;

    // Pontos do mapa: da esquerda para a direita, subindo e descendo como um recife
    const pontos = perguntas.map((_, k) => ({
      x: 24 + (k * 272) / Math.max(1, paradas - 1),
      y: k % 2 === 0 ? 34 + Math.random() * 18 : 70 + Math.random() * 18,
    }));
    const bau = { x: 300, y: 104 };

    const mapa = h('div', { class: 'mapa-tesouro', role: 'img' });
    const status = h('div', { class: 'jogo-hud' });
    const palco = h('div');
    ctx.container.replaceChildren(mapa, status, palco);

    function desenharMapa() {
      const todos = [...pontos, bau];
      let svg = '<svg viewBox="0 0 320 124" preserveAspectRatio="xMidYMid meet">';
      svg += '<path d="M0 116 Q40 108 80 116 T160 116 T240 116 T320 116 V124 H0Z" style="fill:var(--superficie-2)"/>';
      for (let k = 0; k < todos.length - 1; k++) {
        const a = todos[k];
        const b = todos[k + 1];
        const aberto = k < feitas;
        svg += `<path d="M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 18} ${b.x} ${b.y}" fill="none" style="stroke:${aberto ? 'var(--turquesa)' : 'var(--texto-suave)'};stroke-width:${aberto ? 4 : 2};opacity:${aberto ? 1 : 0.45}" stroke-dasharray="${aberto ? '0' : '5 6'}" stroke-linecap="round"/>`;
      }
      pontos.forEach((p, k) => {
        const feita = k < feitas;
        const agora = k === feitas;
        svg += `<circle cx="${p.x}" cy="${p.y}" r="${agora ? 11 : 9}" class="${agora ? 'parada-atual' : ''}" style="fill:${feita ? 'var(--turquesa)' : agora ? 'var(--amarelo)' : 'var(--superficie)'};stroke:var(--fundo-fundo);stroke-width:3"/>`;
        svg += `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="10" font-weight="800" style="fill:var(--texto-escuro)">${feita ? '✓' : k + 1}</text>`;
      });
      const aberto = feitas >= paradas;
      svg += `<g transform="translate(${bau.x - 14} ${bau.y - 22})"><rect width="28" height="20" rx="4" style="fill:var(--amarelo);stroke:var(--fundo-fundo);stroke-width:3"/><rect y="${aberto ? -8 : 0}" width="28" height="8" rx="3" style="fill:var(--coral);stroke:var(--fundo-fundo);stroke-width:3"/><circle cx="14" cy="11" r="3" style="fill:var(--fundo-fundo)"/></g>`;
      svg += '</svg>';
      mapa.innerHTML = svg; // SVG montado só com números e cores do código, não com texto de JSON
      mapa.setAttribute('aria-label', `Mapa do tesouro: ${feitas} de ${paradas} paradas liberadas.`);
      status.replaceChildren(JogoComum.oxigenio(oxigenio, OXIGENIO), h('span', { text: `Parada ${Math.min(feitas + 1, paradas)} de ${paradas}` }));
    }

    function proxima() {
      if (atual) atual.destruir();
      if (feitas >= paradas || oxigenio <= 0) return fim();
      const q = perguntas[feitas];
      atual = JogoComum.questao(palco, q, {
        aoResponder(acertou, d) {
          detalhes.push(d);
          if (acertou) feitas++;
          else {
            oxigenio--;
            // A pergunta errada vai para o fim da caça (se ainda houver fôlego)
            perguntas.push(perguntas.splice(feitas, 1)[0]);
          }
          desenharMapa();
        },
        aoContinuar: proxima,
        get textoContinuar() {
          return feitas >= paradas || oxigenio <= 0 ? 'Ver resultado' : 'Seguir no mapa';
        },
      });
    }

    function fim() {
      const achou = feitas >= paradas;
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'caca-ao-tesouro', trilha: ctx.trilha, detalhes, inicio, oxigenioRestante: oxigenio, concluido: achou, pontuacao: feitas,
        bonus: achou ? { xp: 25, perolas: 5 } : { xp: 0, perolas: Math.floor(feitas / 2) },
        titulo: achou ? 'Baú encontrado!' : `Faltou fôlego na parada ${feitas + 1}`,
        subtitulo: achou ? 'O tesouro é seu: +25 XP e +5 pérolas de bônus.' : `Você passou por ${feitas} de ${paradas} paradas e levou um prêmio parcial. O mapa muda na próxima!`,
      }));
    }

    desenharMapa();
    proxima();
    return { destruir: () => atual && atual.destruir() };
  },
});

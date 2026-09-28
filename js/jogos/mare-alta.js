/*
 * Maré Alta (mare-alta) — sobrevivência sem fim: as perguntas continuam até a água
 * chegar ao topo. Cada erro sobe a maré; a cada 5 acertos seguidos ela baixa um pouco.
 * A dificuldade sobe aos poucos (fácil → médio → difícil). Recorde salvo por trilha.
 */
Jogos.registrar({
  id: 'mare-alta',
  nome: 'Maré Alta',
  grupo: 'aventuras',
  icone: 'i-onda',
  descricao: 'Sobrevivência: a maré sobe a cada erro. Quanto tempo você aguenta?',
  duracao: '3-10 min',
  requer: { multipla: 4 },

  iniciar(ctx) {
    const { h } = UI;
    const SOBE = 25; // % por erro
    const DESCE = 15; // % a cada 5 acertos seguidos
    const peso = { facil: 0, medio: 1, dificil: 2 };
    const recorde = (ctx.prog.jogos && ctx.prog.jogos['mare-alta'] && ctx.prog.jogos['mare-alta'].melhor) || 0;
    const detalhes = [];
    const inicio = Date.now();
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

    const agua = h('div', { class: 'mare', 'aria-hidden': 'true' }, h('div', { class: 'mare__onda' }));
    const hud = h('div', { class: 'jogo-hud' });
    const medidor = h('div', { class: 'mare-medidor', role: 'meter', 'aria-label': 'Nível da maré', 'aria-valuemin': '0', 'aria-valuemax': '100' });
    const palco = h('div', { class: 'mare-palco' });
    ctx.container.replaceChildren(agua, hud, medidor, palco);

    function atualizar() {
      agua.style.height = `${nivel}%`;
      medidor.setAttribute('aria-valuenow', String(nivel));
      medidor.textContent = `Maré: ${nivel}%`;
      medidor.classList.toggle('mare-medidor--perigo', nivel >= 75);
      hud.replaceChildren(
        h('span', { text: `Acertos: ${acertos}` }),
        h('span', { text: `Recorde: ${Math.max(recorde, acertos)}` }),
        h('span', { text: seguidos ? `${seguidos} seguidos` : 'Respira fundo' }));
    }

    function proxima() {
      if (atual) atual.destruir();
      if (nivel >= 100) return terminar();
      if (!fila.length) reabastecer();
      const q = fila.shift();
      atual = JogoComum.questao(palco, q, {
        aoResponder(acertou, d) {
          detalhes.push(d);
          if (acertou) {
            acertos++;
            seguidos++;
            comboMaximo = Math.max(comboMaximo, seguidos);
            if (seguidos % 5 === 0) nivel = Math.max(0, nivel - DESCE);
          } else {
            seguidos = 0;
            nivel = Math.min(100, nivel + SOBE);
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

    function terminar() {
      const bateu = acertos > recorde;
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'mare-alta', trilha: ctx.trilha, detalhes, inicio, comboMaximo, pontuacao: acertos,
        bonus: { xp: bateu ? 15 : 0, perolas: bateu ? 3 : 0 },
        titulo: bateu ? `Novo recorde: ${acertos} acertos!` : `A maré subiu depois de ${acertos} acertos`,
        subtitulo: bateu ? 'Você aguentou mais que nunca. Recorde guardado.' : `Seu recorde nesta trilha é ${recorde}. A água baixa, e você volta.`,
      }));
    }

    reabastecer();
    atualizar();
    proxima();
    return { destruir: () => atual && atual.destruir() };
  },
});

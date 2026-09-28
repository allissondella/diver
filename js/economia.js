/*
 * economia.js — o único lugar que concede XP e pérolas fora do Mergulho/Simulado/Revisão.
 *
 * Todo jogo devolve um Resultado padrão (docs/JOGOS.md) e passa por aplicarResultado().
 * Tarefas concluídas e ciclos do Modo Foco usam conceder().
 * Os valores ficam em CONFIG. As recompensas por acerto são as mesmas do Mergulho
 * (Progresso.RECOMPENSA), para os jogos ficarem coerentes com a tabela de docs/PRODUTO.md.
 */
const Economia = (() => {
  const CONFIG = {
    comboAPartirDe: 3, // a partir do 3º acerto seguido...
    bonusCombo: 5, // ...+5 XP por acerto
    bonusMaximo: { xp: 60, perolas: 15 }, // teto do bônus próprio de cada jogo
    tarefa: { xp: 10, perolas: 1 }, // mover uma tarefa para "Feito" (uma vez só)
    foco: { xp: 15, perolas: 2 }, // completar um ciclo de foco
    desafioMultiplicador: 2, // Desafio do Dia: XP em dobro
    precoDica: 1, // pérolas por dica extra (Forca do Náufrago)
  };

  function recompensa(dificuldade) {
    return Progresso.RECOMPENSA[dificuldade] || Progresso.RECOMPENSA.medio;
  }

  /**
   * Aplica o Resultado padrão de um jogo ao progresso da trilha.
   * - atualiza revisão espaçada, streak, meta e estatísticas
   * - calcula XP e pérolas (acertos + combo + bônus do jogo, com teto)
   * - guarda partidas e recorde do jogo
   * Retorna { xp, perolas, novas (conquistas), comboMaximo }.
   */
  function aplicarResultado(resultado, trilha, prog, { dobro = false } = {}) {
    const questoes = new Map(trilha.questoes.map((q) => [q.id, q]));
    let xp = 0;
    let perolas = 0;
    let combo = 0;
    let comboMaximo = 0;

    (resultado.detalhes || []).forEach((d) => {
      const questao = questoes.get(d.cartaId);
      if (questao && !d.neutro) Progresso.registrarResposta(prog, questao, d.acertou, resultado.jogoId);
      else Progresso.registrarAvulsa(prog, d.acertou, d.neutro);

      if (d.acertou && !d.neutro) {
        combo++;
        comboMaximo = Math.max(comboMaximo, combo);
        const base = recompensa(d.dificuldade || (questao && questao.dificuldade));
        xp += base.xp + (combo >= CONFIG.comboAPartirDe ? CONFIG.bonusCombo : 0);
        perolas += base.perolas;
      } else if (!d.neutro) {
        combo = 0;
      }
    });

    const bonus = resultado.bonus || {};
    xp += Math.min(Math.max(0, bonus.xp || 0), CONFIG.bonusMaximo.xp);
    perolas += Math.min(Math.max(0, bonus.perolas || 0), CONFIG.bonusMaximo.perolas);
    if (dobro) xp *= CONFIG.desafioMultiplicador;

    prog.xp += xp;
    prog.perolas += perolas;
    prog.stats.sessoes++;
    prog.stats.maiorCombo = Math.max(prog.stats.maiorCombo, comboMaximo, resultado.comboMaximo || 0);

    // Histórico do jogo (partidas e recorde, quando o jogo tem pontuação)
    prog.jogos = prog.jogos || {};
    const hist = prog.jogos[resultado.jogoId] || { partidas: 0, melhor: 0 };
    hist.partidas++;
    if (typeof resultado.pontuacao === 'number') hist.melhor = Math.max(hist.melhor, resultado.pontuacao);
    prog.jogos[resultado.jogoId] = hist;

    const novas = Conquistas.verificar(prog, trilha);
    return { xp, perolas, novas, comboMaximo: Math.max(comboMaximo, resultado.comboMaximo || 0) };
  }

  /** Concede XP/pérolas avulsos (tarefa concluída, ciclo de foco). */
  function conceder(prog, trilha, { xp = 0, perolas = 0 }) {
    prog.xp += xp;
    prog.perolas += perolas;
    // Não conta para streak nem meta diária: esses medem questões respondidas.
    return Conquistas.verificar(prog, trilha);
  }

  /** Gasta pérolas, se houver saldo. Retorna true se deu certo. */
  function gastar(prog, quantidade) {
    if (prog.perolas < quantidade) return false;
    prog.perolas -= quantidade;
    return true;
  }

  return { CONFIG, aplicarResultado, conceder, gastar };
})();

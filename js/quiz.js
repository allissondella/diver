/*
 * quiz.js — motor das sessões de estudo.
 *
 * Modos:
 *  - mergulho: questões de uma fase, com oxigênio e feedback imediato
 *  - simulado: N questões da trilha toda, cronometrado, correção no final
 *  - revisao:  questões erradas (peso > 0) ou marcadas, com feedback imediato
 *  - prova:    prova final do curso
 *  - enviada:  prova antiga que alguém subiu (Simulado → Upload de prova). Correção no final;
 *              os pontos só entram na entrega, pelo Economia.pontuarProvaEnviada
 *
 * Este arquivo não mexe na tela: só cuida das regras. Quem desenha é o app.js.
 */
const Quiz = (() => {
  const OXIGENIO_MAX = 3;
  const TAMANHO_RODADA = { mergulho: 8, revisao: 10 };
  const SEGUNDOS_POR_QUESTAO_SIMULADO = 60;

  function embaralhar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Repetição espaçada simples: escolhe n questões priorizando as de peso maior
   * (erradas recentemente) e as nunca vistas. Um pouco de sorte evita rodadas repetidas.
   */
  function selecionar(pool, prog, n) {
    const prioridade = (q) => {
      const e = prog.questoes[q.id];
      const peso = e ? e.peso : 0;
      const nuncaVista = !e || e.acertos + e.erros === 0;
      return peso * 10 + (nuncaVista ? 5 : 0) + Math.random() * 4;
    };
    const escolhidas = pool
      .map((q) => ({ q, p: prioridade(q) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, n)
      .map((x) => x.q);
    return embaralhar(escolhidas);
  }

  /**
   * Cria uma sessão.
   * opcoes: { faseId } no Mergulho, { quantidade } no Simulado.
   */
  function criar(modo, trilha, prog, opcoes = {}) {
    let fila = [];
    let fase = null;

    if (modo === 'mergulho') {
      fase = trilha.fases.find((f) => f.id === opcoes.faseId);
      fila = selecionar(Trilhas.questoesDaFase(trilha, fase.id), prog, TAMANHO_RODADA.mergulho);
      Progresso.registrarTentativaFase(prog, fase.id);
    } else if (modo === 'simulado') {
      const n = Math.min(opcoes.quantidade || 10, trilha.questoes.length);
      fila = selecionar(trilha.questoes, prog, n);
    } else if (modo === 'revisao') {
      fila = selecionar(Progresso.paraRevisar(prog, trilha), prog, TAMANHO_RODADA.revisao);
    } else if (modo === 'prova') {
      // Prova final: sorteio simples da trilha toda (sem priorizar os erros, como numa prova de verdade)
      fila = embaralhar(trilha.questoes).slice(0, Math.min(opcoes.quantidade, trilha.questoes.length));
    } else if (modo === 'enviada') {
      fila = [...opcoes.questoes]; // na ordem da prova original
    }

    return {
      modo,
      trilha,
      fase,
      fila,
      indice: 0,
      oxigenio: modo === 'mergulho' ? OXIGENIO_MAX : null,
      oxigenioMax: modo === 'mergulho' ? OXIGENIO_MAX : null,
      respostas: [], // { questao, escolhida, acertou }
      voltaram: new Set(), // ids que já voltaram ao fim da fila nesta rodada
      combo: 0,
      maiorCombo: 0,
      xp: 0,
      perolas: 0,
      inicio: Date.now(),
      limiteSeg: modo === 'simulado' ? fila.length * SEGUNDOS_POR_QUESTAO_SIMULADO
        : modo === 'prova' || (modo === 'enviada' && opcoes.minutos) ? opcoes.minutos * 60 : null,
      titulo: opcoes.titulo || null, // prova enviada
      pontos: modo === 'enviada' ? { fator: opcoes.fator || 0, comPerolas: !!opcoes.comPerolas, motivo: opcoes.motivo || '' } : null,
      aprovacao: modo === 'prova' ? opcoes.aprovacao : null, // % mínima para passar na prova final
      encerrada: false,
    };
  }

  function atual(s) {
    return s.fila[s.indice] || null;
  }

  /** Quantas questões "diferentes" a rodada tem (sem contar as que voltaram). */
  function totalPlanejado(s) {
    return s.fila.length - s.voltaram.size;
  }

  /**
   * Registra a resposta da questão atual.
   * Retorna { acertou, correta, xp, perolas, combo, semOxigenio }.
   */
  function responder(s, escolhida, prog) {
    const q = atual(s);
    const acertou = escolhida === q.correta;
    const r = { acertou, correta: q.correta, xp: 0, perolas: 0, combo: 0, semOxigenio: false };

    s.respostas.push({ questao: q, escolhida, acertou });
    if (s.modo === 'enviada') return r; // questões de fora da trilha: sem revisão espaçada, pontos só na entrega
    Progresso.registrarResposta(prog, q, acertou, s.modo);

    if (acertou) {
      s.combo++;
      s.maiorCombo = Math.max(s.maiorCombo, s.combo);
      prog.stats.maiorCombo = Math.max(prog.stats.maiorCombo, s.combo);
      const base = Progresso.RECOMPENSA[q.dificuldade];
      r.xp = base.xp + (s.combo >= 3 ? Progresso.BONUS_COMBO : 0);
      r.perolas = base.perolas;
      r.combo = s.combo;
    } else {
      s.combo = 0;
      if (s.modo === 'mergulho') {
        s.oxigenio--;
        r.semOxigenio = s.oxigenio <= 0;
        // Repetição espaçada dentro da rodada: a questão errada volta no fim (uma vez)
        if (!r.semOxigenio && !s.voltaram.has(q.id)) {
          s.voltaram.add(q.id);
          s.fila.push(q);
        }
      }
    }

    s.xp += r.xp;
    s.perolas += r.perolas;
    prog.xp += r.xp;
    prog.perolas += r.perolas;
    return r;
  }

  /** Vai para a próxima questão. Retorna false se a sessão acabou. */
  function avancar(s) {
    s.indice++;
    if (s.oxigenio !== null && s.oxigenio <= 0) return false;
    return s.indice < s.fila.length;
  }

  function segundosRestantes(s) {
    if (s.limiteSeg === null) return null;
    return Math.max(0, s.limiteSeg - Math.floor((Date.now() - s.inicio) / 1000));
  }

  /**
   * Encerra a sessão, aplica bônus e devolve o resumo.
   * motivo: 'fim' | 'sem-oxigenio' | 'tempo' | 'saiu'
   */
  function finalizar(s, prog, motivo) {
    s.encerrada = true;
    const tempoSeg = Math.round((Date.now() - s.inicio) / 1000);

    // No Simulado e na Prova final, o que não foi respondido conta como em branco (errado).
    // Se o Diver saiu no meio, vale só o que foi respondido.
    const emBranco = [];
    if ((s.modo === 'simulado' || s.modo === 'prova' || s.modo === 'enviada') && motivo !== 'saiu') {
      s.fila.slice(s.respostas.length).forEach((q) => {
        emBranco.push(q);
        s.respostas.push({ questao: q, escolhida: null, acertou: false });
      });
    }

    const total = s.respostas.length;
    const acertos = s.respostas.filter((r) => r.acertou).length;

    // Desempenho por tema/tag
    const temas = {};
    s.respostas.forEach(({ questao, acertou }) => {
      temas[questao.tema] = temas[questao.tema] || { tema: questao.tema, acertos: 0, total: 0 };
      temas[questao.tema].total++;
      if (acertou) temas[questao.tema].acertos++;
    });
    const porTema = Object.values(temas).sort((a, b) => a.acertos / a.total - b.acertos / b.total);

    // O que revisar: questões erradas (sem repetir), com a última resposta dada
    const erradas = new Map();
    s.respostas.forEach((r) => {
      if (!r.acertou) erradas.set(r.questao.id, r);
    });

    const resumo = {
      modo: s.modo,
      motivo,
      fase: s.fase,
      total,
      acertos,
      pct: total ? Math.round((acertos / total) * 100) : 0,
      tempoSeg,
      porTema,
      paraRevisar: [...erradas.values()],
      emBranco: emBranco.length,
      maiorCombo: s.maiorCombo,
      xp: s.xp,
      perolas: s.perolas,
      faseConcluida: false,
      estrelas: 0,
      nota: null,
    };

    if (s.modo === 'mergulho' && motivo === 'fim') {
      const errosNaFase = s.oxigenioMax - s.oxigenio;
      resumo.estrelas = Math.max(1, 3 - errosNaFase);
      resumo.faseConcluida = true;
      const bonus = Progresso.concluirFase(prog, s.fase.id, resumo.estrelas);
      resumo.bonus = bonus;
      prog.xp += bonus.xp;
      prog.perolas += bonus.perolas;
      resumo.xp += bonus.xp;
      resumo.perolas += bonus.perolas;
    }

    if (s.modo === 'simulado' && motivo !== 'saiu') {
      resumo.nota = total ? Math.round((acertos / total) * 100) / 10 : 0;
      prog.simulados.unshift({ data: Date.now(), total, acertos, nota: resumo.nota, tempoSeg });
      prog.simulados = prog.simulados.slice(0, 20);
    }

    if (s.modo === 'prova' && motivo !== 'saiu') {
      resumo.nota = total ? Math.round((acertos / total) * 100) / 10 : 0;
      resumo.aprovacao = s.aprovacao;
      resumo.aprovado = resumo.pct >= s.aprovacao;
      prog.provas = prog.provas || [];
      prog.provas.unshift({ data: Date.now(), total, acertos, nota: resumo.nota, pct: resumo.pct, aprovado: resumo.aprovado, tempoSeg });
      prog.provas = prog.provas.slice(0, 20);
    }

    if (s.modo === 'enviada') {
      resumo.titulo = s.titulo;
      resumo.pontos = s.pontos;
      if (motivo !== 'saiu') {
        resumo.nota = total ? Math.round((acertos / total) * 100) / 10 : 0;
        const ganho = Economia.pontuarProvaEnviada(s.respostas, prog, s.pontos);
        resumo.xp = ganho.xp;
        resumo.perolas = ganho.perolas;
        resumo.maiorCombo = ganho.comboMaximo;
      }
    }

    prog.stats.sessoes++;
    return resumo;
  }

  return { criar, atual, responder, avancar, finalizar, segundosRestantes, totalPlanejado, OXIGENIO_MAX };
})();

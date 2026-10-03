/*
 * quiz.js — motor das sessões de estudo.
 *
 * Modos:
 *  - mergulho: questões de uma fase, com oxigênio e feedback imediato. Rodada em rampa
 *              (fácil → médio → difícil); na primeira rodada da fase, sem as difíceis; e a
 *              fase inteira também sobe: as nunca vistas saem das fáceis para as difíceis
 *  - simulado: N questões da trilha toda, cronometrado, correção no final
 *  - revisao:  questões erradas (peso > 0) ou marcadas, com feedback imediato e em rampa;
 *              pode mostrar uma variante aprovada ou uma substituta (veja versaoParaRevisar).
 *              Com { tema }: "Revisar a fundo" um assunto (as pendentes + outras do tema)
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
   * Devolve na ordem de prioridade: quem chama decide se embaralha ou monta a rampa.
   */
  function selecionar(pool, prog, n) {
    const prioridade = (q) => {
      const e = prog.questoes[q.id];
      const peso = e ? e.peso : 0;
      const nuncaVista = !e || e.acertos + e.erros === 0;
      return peso * 10 + (nuncaVista ? 5 : 0) + Math.random() * 4;
    };
    return pool
      .map((q) => ({ q, p: prioridade(q) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, n)
      .map((x) => x.q);
  }

  /* ---------- Dificuldade progressiva ---------- */
  const NIVEL = { facil: 0, medio: 1, dificil: 2 };
  const nivel = (q) => (q.dificuldade in NIVEL ? NIVEL[q.dificuldade] : 1);

  /** Rampa: fácil → médio → difícil (sorteio só dentro de cada nível). */
  function emRampa(lista) {
    return embaralhar(lista).sort((a, b) => nivel(a) - nivel(b));
  }

  /**
   * Questões que podem entrar numa rodada do Mergulho. Na primeira rodada da fase,
   * só fácil e médio: as difíceis entram a partir da segunda. (Fase só com difíceis: usa todas.)
   */
  function poolDoMergulho(trilha, fase, prog) {
    const daFase = Trilhas.questoesDaFase(trilha, fase.id);
    const jaTentou = !!(prog.fases[fase.id] && prog.fases[fase.id].tentativas);
    const semDificeis = daFase.filter((q) => q.dificuldade !== 'dificil');
    return jaTentou || !semDificeis.length ? daFase : semDificeis;
  }

  /**
   * Escolha do Mergulho com a fase inteira em rampa (pedido da revisão de 2026-10-03):
   * entre as questões que o aluno nunca viu, primeiro as fáceis, depois as médias e por
   * último as difíceis. Assim a 1ª rodada fixa a base e as avançadas ficam para o fim da fase.
   * As que ele errou continuam com prioridade (peso), como antes.
   */
  function selecionarMergulho(pool, prog, n) {
    const prioridade = (q) => {
      const e = prog.questoes[q.id];
      const peso = e ? e.peso : 0;
      const nuncaVista = !e || e.acertos + e.erros === 0;
      return peso * 10 + (nuncaVista ? 30 - nivel(q) * 10 : 0) + Math.random() * 4;
    };
    return pool
      .map((q) => ({ q, p: prioridade(q) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, n)
      .map((x) => x.q);
  }

  /* ---------- Revisão com variantes ---------- */
  /** Id que guarda o progresso: a variante ou a substituta contam para a questão original. */
  function idNoProgresso(q) {
    return q.revisaDe || q.id;
  }

  /** Rodízio: primeiro o que nunca apareceu; depois o que apareceu há mais tempo. */
  function porRodizio(candidatos, vistas) {
    const pos = (c) => vistas.indexOf(c.id); // -1 = nunca vista
    return embaralhar(candidatos).sort((a, b) => pos(a) - pos(b))[0];
  }

  /**
   * O que mostrar na Revisão no lugar de uma questão pendente (docs/MOTOR_DIVER.md, seção 12):
   *  - origem "enem": NUNCA variante (licença Sem Derivações). Outra questão nossa do mesmo
   *    tema, de nível igual ou menor (da mesma fase, se houver); sem nenhuma, a literal de novo;
   *  - nossa, com variante aprovada: uma variante, em rodízio;
   *  - nossa, ainda sem variante: a própria questão.
   */
  function versaoParaRevisar(q, trilha, prog, usadas) {
    const vistas = (prog.questoes[q.id] && prog.questoes[q.id].vistas) || [];
    let escolhida = null;
    let tipo = null;
    if (q.origem === 'enem') {
      const mesmoTema = trilha.questoes.filter((x) => x.id !== q.id && x.origem !== 'enem' && x.tema === q.tema
        && nivel(x) <= nivel(q) && !usadas.has(x.id));
      const mesmaFase = mesmoTema.filter((x) => x.fase === q.fase);
      const candidatos = mesmaFase.length ? mesmaFase : mesmoTema;
      if (candidatos.length) {
        escolhida = porRodizio(candidatos, vistas);
        tipo = 'substituta';
      }
    } else {
      const variantes = Trilhas.variantesDe(trilha, q.id);
      if (variantes.length) {
        escolhida = porRodizio(variantes, vistas);
        tipo = 'variante';
      }
    }
    if (!escolhida) return q;
    usadas.add(escolhida.id);
    return { ...escolhida, revisaDe: q.id, tipoRevisao: tipo };
  }

  /**
   * Revisão a fundo de um assunto (Revisão → "Revisar a fundo"): primeiro as questões do tema
   * que estão na fila (com variante, se houver); depois completa com outras do mesmo tema,
   * as nunca vistas antes. Tudo em rampa, fácil → difícil.
   */
  function montarRevisaoTema(trilha, prog, tema) {
    const doTema = trilha.questoes.filter((q) => q.tema === tema);
    const pendentes = selecionar(Progresso.paraRevisar(prog, trilha).filter((q) => q.tema === tema), prog, TAMANHO_RODADA.revisao);
    const usadas = new Set(pendentes.map((q) => q.id));
    const fila = pendentes.map((q) => versaoParaRevisar(q, trilha, prog, usadas));
    const resto = selecionar(doTema.filter((q) => !usadas.has(q.id)), prog, TAMANHO_RODADA.revisao - fila.length);
    return emRampa([...fila, ...resto]);
  }

  function montarRevisao(trilha, prog) {
    const pendentes = selecionar(Progresso.paraRevisar(prog, trilha), prog, TAMANHO_RODADA.revisao);
    const usadas = new Set(pendentes.map((q) => q.id)); // a substituta não repete uma pendente da mesma rodada
    return emRampa(pendentes.map((q) => versaoParaRevisar(q, trilha, prog, usadas)));
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
      fila = emRampa(selecionarMergulho(poolDoMergulho(trilha, fase, prog), prog, TAMANHO_RODADA.mergulho));
      Progresso.registrarTentativaFase(prog, fase.id);
    } else if (modo === 'simulado') {
      const n = Math.min(opcoes.quantidade || 10, trilha.questoes.length);
      fila = embaralhar(selecionar(trilha.questoes, prog, n)); // como numa prova: sem rampa
    } else if (modo === 'revisao') {
      fila = opcoes.tema ? montarRevisaoTema(trilha, prog, opcoes.tema) : montarRevisao(trilha, prog);
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
      titulo: opcoes.titulo || null, // prova enviada ou assunto da Revisão a fundo
      tema: opcoes.tema || null, // Revisão a fundo
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
    Progresso.registrarResposta(prog, { id: idNoProgresso(q) }, acertou, s.modo);
    if (q.revisaDe) Progresso.registrarVista(prog, q.revisaDe, q.id);

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

  return { criar, atual, responder, idNoProgresso, avancar, finalizar, segundosRestantes, totalPlanejado, OXIGENIO_MAX };
})();

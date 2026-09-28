/*
 * progresso.js — tudo que fica salvo no navegador, separado por trilha:
 * XP, nível, pérolas, fases, streak, meta diária, conquistas,
 * pesos da repetição espaçada e histórico de simulados.
 */
const Progresso = (() => {
  const PREFIXO = 'diver:v1:trilha:';
  const CHAVE_ULTIMA = 'diver:v1:ultimaTrilha';

  // Tabela de níveis: XP mínimo para cada um. O último é o nível máximo.
  const NIVEIS = [
    { xp: 0, nome: 'Banhista' },
    { xp: 60, nome: 'Snorkeler' },
    { xp: 150, nome: 'Mergulhador de raso' },
    { xp: 280, nome: 'Explorador de recife' },
    { xp: 450, nome: 'Caçador de pérolas' },
    { xp: 670, nome: 'Mergulhador de caverna' },
    { xp: 940, nome: 'Navegador de correntes' },
    { xp: 1270, nome: 'Desbravador do abismo' },
    { xp: 1660, nome: 'Lenda das profundezas' },
    { xp: 2100, nome: 'Mestre Diver' },
  ];

  const METAS_DIARIAS = [5, 10, 20, 30];

  // Recompensas por acerto, conforme a dificuldade
  const RECOMPENSA = {
    facil: { xp: 10, perolas: 1 },
    medio: { xp: 15, perolas: 2 },
    dificil: { xp: 20, perolas: 3 },
  };
  const BONUS_COMBO = 5; // XP extra a partir do 3º acerto seguido
  const BONUS_FASE = { xp: 30, perolas: 5 }; // primeira vez que completa a fase
  const BONUS_FASE_PERFEITA = 5; // pérolas extras sem perder oxigênio

  function novo() {
    return {
      versao: 1,
      xp: 0,
      perolas: 0,
      fases: {}, // { [faseId]: { concluida, estrelas, tentativas } }
      questoes: {}, // { [questaoId]: { peso, acertos, erros, marcada } }
      streak: { atual: 0, melhor: 0, ultimoDia: null },
      metaDiaria: 10,
      hoje: { data: null, respondidas: 0 },
      conquistas: {}, // { [conquistaId]: timestamp }
      simulados: [], // [{ data, total, acertos, nota, tempoSeg }]
      provas: [], // prova final: [{ data, total, acertos, nota, pct, aprovado, tempoSeg }]
      jogos: {}, // { [jogoId]: { partidas, melhor } } — Sala de Jogos
      leitner: {}, // { [cartaId]: caixa de 1 a 5 } — Cartas do Fundo
      stats: { respondidas: 0, acertos: 0, maiorCombo: 0, sessoes: 0, acertosRevisao: 0 },
    };
  }

  /** Carrega o progresso de uma trilha (ou cria um novo). */
  function carregar(trilhaId) {
    try {
      const salvo = JSON.parse(localStorage.getItem(PREFIXO + trilhaId));
      if (salvo && salvo.versao === 1) {
        // Mescla com o modelo para garantir campos novos em progressos antigos
        const base = novo();
        return { ...base, ...salvo, stats: { ...base.stats, ...salvo.stats } };
      }
    } catch (e) {
      /* progresso corrompido: começa do zero */
    }
    return novo();
  }

  function salvar(trilhaId, prog) {
    try {
      localStorage.setItem(PREFIXO + trilhaId, JSON.stringify(prog));
    } catch (e) {
      console.warn('Não foi possível salvar o progresso:', e);
    }
  }

  // As funções abaixo também usam try/catch: se o navegador bloquear o armazenamento
  // (modo privado, cota cheia), o app segue funcionando, só sem lembrar das coisas.
  function zerar(trilhaId) {
    try {
      localStorage.removeItem(PREFIXO + trilhaId);
    } catch (e) {
      console.warn('Não foi possível zerar o progresso:', e);
    }
  }

  function ultimaTrilha() {
    try {
      return localStorage.getItem(CHAVE_ULTIMA);
    } catch (e) {
      return null;
    }
  }
  function definirUltimaTrilha(id) {
    try {
      localStorage.setItem(CHAVE_ULTIMA, id);
    } catch (e) {
      /* sem armazenamento: só não lembra a última trilha */
    }
  }

  /* ---------- Datas (sempre no fuso local) ---------- */

  function dataLocal(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function ontem() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dataLocal(d);
  }

  /* ---------- Nível ---------- */

  function nivel(xp) {
    let i = 0;
    while (i + 1 < NIVEIS.length && xp >= NIVEIS[i + 1].xp) i++;
    const atual = NIVEIS[i];
    const proximo = NIVEIS[i + 1];
    return {
      numero: i + 1,
      nome: atual.nome,
      max: !proximo,
      xpNoNivel: xp - atual.xp,
      xpParaProximo: proximo ? proximo.xp - atual.xp : 0,
      pct: proximo ? Math.round(((xp - atual.xp) / (proximo.xp - atual.xp)) * 100) : 100,
      proximoNome: proximo ? proximo.nome : null,
    };
  }

  /* ---------- Streak e meta diária ---------- */

  /** Streak que vale hoje: se o último estudo foi antes de ontem, zerou. */
  function streakVigente(prog) {
    const u = prog.streak.ultimoDia;
    return u === dataLocal() || u === ontem() ? prog.streak.atual : 0;
  }

  /** Questões respondidas hoje (zera sozinho quando o dia muda). */
  function respondidasHoje(prog) {
    return prog.hoje.data === dataLocal() ? prog.hoje.respondidas : 0;
  }

  /** Marca o dia de hoje como dia de estudo e atualiza streak/meta. */
  function registrarEstudo(prog) {
    const hoje = dataLocal();
    if (prog.streak.ultimoDia !== hoje) {
      prog.streak.atual = prog.streak.ultimoDia === ontem() ? prog.streak.atual + 1 : 1;
      prog.streak.ultimoDia = hoje;
      prog.streak.melhor = Math.max(prog.streak.melhor, prog.streak.atual);
    }
    if (prog.hoje.data !== hoje) prog.hoje = { data: hoje, respondidas: 0 };
    prog.hoje.respondidas++;
  }

  /* ---------- Questões: repetição espaçada ---------- */

  function estadoQuestao(prog, id) {
    if (!prog.questoes[id]) prog.questoes[id] = { peso: 0, acertos: 0, erros: 0, marcada: false };
    return prog.questoes[id];
  }

  /**
   * Registra a resposta de uma questão.
   * Errou: peso sobe 2 (máx. 6). Acertou: peso desce 1 (ou 2 no modo Revisão).
   */
  function registrarResposta(prog, questao, acertou, modo) {
    const q = estadoQuestao(prog, questao.id);
    if (acertou) {
      q.acertos++;
      q.peso = Math.max(0, q.peso - (modo === 'revisao' ? 2 : 1));
      if (modo === 'revisao') {
        q.marcada = false; // acertou na revisão: sai da lista de marcadas
        prog.stats.acertosRevisao++;
      }
      prog.stats.acertos++;
    } else {
      q.erros++;
      q.peso = Math.min(6, q.peso + 2);
    }
    prog.stats.respondidas++;
    registrarEstudo(prog);
  }

  /**
   * Resposta que não é uma questão da trilha (par da Memória, palavra da Forca...).
   * Conta para streak, meta e estatísticas, mas não mexe na repetição espaçada.
   * neutro = true: estudou, mas não conta como acerto nem como erro ("Quase", nas Cartas do Fundo).
   */
  function registrarAvulsa(prog, acertou, neutro = false) {
    if (acertou && !neutro) prog.stats.acertos++;
    prog.stats.respondidas++;
    registrarEstudo(prog);
  }

  function alternarMarcada(prog, questaoId) {
    const q = estadoQuestao(prog, questaoId);
    q.marcada = !q.marcada;
    return q.marcada;
  }

  /** Questões que entram no modo Revisão. */
  function paraRevisar(prog, trilha) {
    return trilha.questoes.filter((q) => {
      const e = prog.questoes[q.id];
      return e && (e.peso > 0 || e.marcada);
    });
  }

  /* ---------- Fases ---------- */

  function faseDesbloqueada(prog, trilha, indice) {
    if (indice === 0) return true;
    const anterior = trilha.fases[indice - 1];
    return !!(prog.fases[anterior.id] && prog.fases[anterior.id].concluida);
  }

  /** Registra o fim de uma fase. Retorna os bônus concedidos. */
  function concluirFase(prog, faseId, estrelas) {
    const f = prog.fases[faseId] || { concluida: false, estrelas: 0, tentativas: 0 };
    const bonus = { xp: 0, perolas: 0, primeiraVez: !f.concluida };
    if (!f.concluida) {
      bonus.xp += BONUS_FASE.xp;
      bonus.perolas += BONUS_FASE.perolas;
    }
    if (estrelas === 3) bonus.perolas += BONUS_FASE_PERFEITA;
    f.concluida = true;
    f.estrelas = Math.max(f.estrelas, estrelas);
    prog.fases[faseId] = f;
    return bonus;
  }

  function registrarTentativaFase(prog, faseId) {
    const f = prog.fases[faseId] || { concluida: false, estrelas: 0, tentativas: 0 };
    f.tentativas++;
    prog.fases[faseId] = f;
  }

  return {
    NIVEIS, METAS_DIARIAS, RECOMPENSA, BONUS_COMBO,
    carregar, salvar, zerar, ultimaTrilha, definirUltimaTrilha,
    nivel, streakVigente, respondidasHoje,
    registrarResposta, registrarAvulsa, registrarEstudo, alternarMarcada, paraRevisar,
    faseDesbloqueada, concluirFase, registrarTentativaFase,
  };
})();

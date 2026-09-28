/*
 * cartas.js — transforma o conteúdo de uma trilha em "cartas" para os jogos.
 *
 * Usa os blocos opcionais da trilha quando existem (pares, verdadeiroFalso, adivinhas,
 * sequencias, palavras) e, quando não, DERIVA cartas das questões de múltipla escolha.
 * Regras de derivação: docs/JOGOS.md, seção 2.
 */
const Cartas = (() => {
  const lista = (v) => (Array.isArray(v) ? v : []);
  const texto = (v) => typeof v === 'string' && v.trim().length > 0;

  function correta(q) {
    return q.alternativas[q.correta];
  }

  /** Verdadeiro ou falso: bloco próprio + "enunciado → alternativa" (certa = V, outra = F). */
  function derivarVF(trilha) {
    const doBloco = lista(trilha.verdadeiroFalso)
      .filter((c) => texto(c.afirmacao) && typeof c.verdadeira === 'boolean')
      .map((c, i) => ({ id: c.id || `vf-${i}`, afirmacao: c.afirmacao, verdadeira: c.verdadeira, explicacao: c.explicacao || '', tema: c.tema || 'Geral', dificuldade: c.dificuldade || 'facil' }));
    const derivadas = trilha.questoes.map((q) => {
      const verdadeira = Math.random() < 0.5;
      const erradas = q.alternativas.filter((_, i) => i !== q.correta);
      const proposta = verdadeira ? correta(q) : UI.sortear(erradas);
      return {
        id: q.id,
        pergunta: q.enunciado,
        proposta,
        verdadeira,
        explicacao: `Resposta certa: ${correta(q)}. ${q.explicacao}`,
        tema: q.tema,
        dificuldade: q.dificuldade,
      };
    });
    return [...doBloco, ...derivadas];
  }

  /** Flashcards: frente = enunciado; verso = alternativa correta + explicação. */
  function derivarFlash(trilha) {
    return trilha.questoes.map((q) => ({
      id: q.id, frente: q.enunciado, verso: correta(q), explicacao: q.explicacao, tema: q.tema, dificuldade: q.dificuldade,
    }));
  }

  /** Pares termo ↔ definição: bloco próprio ou questões com enunciado e resposta curtos. */
  function derivarPares(trilha) {
    const doBloco = lista(trilha.pares)
      .filter((p) => texto(p.termo) && texto(p.definicao))
      .map((p, i) => ({ id: p.id || `par-${i}`, termo: p.termo, definicao: p.definicao, tema: p.tema || 'Geral', dificuldade: p.dificuldade || 'facil' }));
    const derivados = trilha.questoes
      .filter((q) => q.enunciado.length <= 90 && correta(q).length <= 40)
      .map((q) => ({ id: q.id, termo: q.enunciado, definicao: correta(q), tema: q.tema, dificuldade: q.dificuldade }));
    return [...doBloco, ...derivados];
  }

  function derivarAdivinhas(trilha) {
    return lista(trilha.adivinhas)
      .filter((a) => texto(a.resposta) && lista(a.dicas).length > 0)
      .map((a, i) => ({
        id: a.id || `adivinha-${i}`, resposta: a.resposta, aceitas: lista(a.aceitas), dicas: a.dicas.slice(0, 10),
        explicacao: a.explicacao || '', tema: a.tema || 'Geral', dificuldade: a.dificuldade || 'medio',
      }));
  }

  function derivarSequencias(trilha) {
    return lista(trilha.sequencias)
      .filter((s) => texto(s.titulo) && lista(s.itens).length >= 3)
      .map((s, i) => ({ id: s.id || `seq-${i}`, titulo: s.titulo, itens: s.itens, explicacao: s.explicacao || '', tema: s.tema || 'Geral', dificuldade: s.dificuldade || 'medio' }));
  }

  /** Palavras para a Forca: bloco próprio ou respostas de uma palavra só (4 a 14 letras). */
  function derivarPalavras(trilha) {
    const soLetras = (p) => UI.normalizar(p).replace(/ /g, '');
    const doBloco = lista(trilha.palavras)
      .filter((p) => texto(p.palavra) && /^[a-z]{3,16}$/.test(soLetras(p.palavra)))
      .map((p, i) => ({ id: p.id || `palavra-${i}`, palavra: soLetras(p.palavra).toUpperCase(), original: p.palavra, dica: p.dica || p.tema || '', tema: p.tema || 'Geral', dificuldade: p.dificuldade || 'medio' }));
    const derivadas = trilha.questoes
      .filter((q) => /^[A-Za-zÀ-ÿ]{4,14}$/.test(correta(q).trim()))
      .map((q) => ({ id: q.id, palavra: soLetras(correta(q)).toUpperCase(), original: correta(q), dica: q.enunciado, tema: q.tema, dificuldade: q.dificuldade }));
    const vistas = new Set();
    return [...doBloco, ...derivadas].filter((p) => !vistas.has(p.palavra) && vistas.add(p.palavra));
  }

  /** Todas as cartas de uma trilha, já prontas para os jogos. */
  function derivar(trilha) {
    return {
      multipla: trilha.questoes,
      vf: derivarVF(trilha),
      flash: derivarFlash(trilha),
      pares: derivarPares(trilha),
      adivinhas: derivarAdivinhas(trilha),
      sequencias: derivarSequencias(trilha),
      palavras: derivarPalavras(trilha),
    };
  }

  /**
   * O jogo tem conteúdo suficiente nesta trilha?
   * def.requer = { tipo: quantidadeMinima }, ex.: { pares: 6 }.
   */
  function temConteudo(def, cartas) {
    return Object.entries(def.requer || { multipla: 4 }).every(([tipo, min]) => (cartas[tipo] || []).length >= min);
  }

  return { derivar, temConteudo };
})();

/*
 * trilhas.js — encontra, carrega e valida as trilhas de estudo.
 *
 * Fontes (em ordem):
 *  1. data/trilhas/indice.json (lista de arquivos)
 *  2. listagem do diretório data/trilhas/ (se o servidor oferecer)
 *  3. trilhas importadas manualmente (salvas no localStorage)
 *
 * Catálogo leve (2026-10-09): se existir data/trilhas/catalogo.json (scripts/gerar-catalogo.mjs), os cursos
 * dele entram só com o "cabeçalho" (nome, fases, contagens) e a marca _parcial; o curso inteiro é baixado
 * por completar(trilha) quando o aluno entra nele, NO MESMO OBJETO (quem guardou a referência continua
 * valendo). Arquivo do índice que não está no catálogo é carregado inteiro, como antes.
 */
const Trilhas = (() => {
  const PASTA = 'data/trilhas/';
  const CHAVE_IMPORTADAS = 'diver:v1:trilhasImportadas';
  const DIFICULDADES = ['facil', 'medio', 'dificil'];

  /** Valida uma trilha e devolve uma lista de problemas (vazia = tudo certo). */
  function validar(t) {
    const erros = [];
    if (!t || typeof t !== 'object') return ['o arquivo não contém um objeto JSON'];
    ['id', 'nome', 'descricao'].forEach((campo) => {
      if (typeof t[campo] !== 'string' || !t[campo].trim()) erros.push(`campo "${campo}" ausente`);
    });
    if (!Array.isArray(t.fases) || t.fases.length === 0) {
      erros.push('"fases" precisa ser uma lista com pelo menos uma fase');
      return erros;
    }
    const idsFases = t.fases.map((f) => f && f.id);
    if (idsFases.some((id) => typeof id !== 'string')) erros.push('toda fase precisa de "id"');
    if (!Array.isArray(t.questoes) || t.questoes.length === 0) {
      erros.push('"questoes" precisa ser uma lista com pelo menos uma questão');
      return erros;
    }

    const vistos = new Set();
    t.questoes.forEach((q, i) => {
      const ref = `questão ${q && q.id ? `"${q.id}"` : '#' + (i + 1)}`;
      if (!q || typeof q !== 'object') return erros.push(`${ref}: formato inválido`);
      if (!q.id) erros.push(`${ref}: sem "id"`);
      else if (vistos.has(q.id)) erros.push(`${ref}: id repetido`);
      vistos.add(q.id);
      if (!q.enunciado) erros.push(`${ref}: sem "enunciado"`);
      if (!q.tema) erros.push(`${ref}: sem "tema"`);
      if (!idsFases.includes(q.fase)) erros.push(`${ref}: fase "${q.fase}" não existe na trilha`);
      if (!DIFICULDADES.includes(q.dificuldade)) erros.push(`${ref}: dificuldade deve ser facil, medio ou dificil`);
      if (!Array.isArray(q.alternativas) || q.alternativas.length < 2 || q.alternativas.length > 6) {
        erros.push(`${ref}: "alternativas" precisa ter de 2 a 6 itens`);
      } else if (!Number.isInteger(q.correta) || q.correta < 0 || q.correta >= q.alternativas.length) {
        erros.push(`${ref}: "correta" deve ser o índice (a partir de 0) de uma alternativa`);
      }
      if (!q.explicacao) erros.push(`${ref}: sem "explicacao"`);
    });
    return erros;
  }

  /**
   * Bloco opcional "variantes" (docs/MOTOR_DIVER.md, seção 12): versões novas de questões NOSSAS,
   * usadas só pela Revisão. Tira da trilha toda variante com problema, sem derrubar o curso:
   * principalmente as que apontam para questão origem "enem" (licença Sem Derivações, trava 3 de 3).
   * Devolve a lista de variantes descartadas, com o motivo.
   */
  function limparVariantes(t) {
    if (t.variantes === undefined) return [];
    if (!Array.isArray(t.variantes)) {
      t.variantes = [];
      return ['"variantes" precisa ser uma lista'];
    }
    const questoes = new Map(t.questoes.map((q) => [q.id, q]));
    const ids = new Set();
    const descartadas = [];
    t.variantes = t.variantes.filter((v, i) => {
      const ref = `variante ${v && v.id ? `"${v.id}"` : '#' + (i + 1)}`;
      const original = v && questoes.get(v.varianteDe);
      let motivo = null;
      if (!v || typeof v !== 'object' || !v.id) motivo = 'sem "id"';
      else if (questoes.has(v.id) || ids.has(v.id)) motivo = 'id repetido';
      else if (!original) motivo = `"varianteDe" não aponta para uma questão da trilha`;
      else if (original.origem === 'enem' || v.origem === 'enem') motivo = 'questão do Enem não pode ter variante (licença Sem Derivações)';
      else if (v.fase !== original.fase) motivo = 'fase diferente da questão original';
      else if (!v.enunciado || v.enunciado === original.enunciado) motivo = 'enunciado ausente ou igual ao da original';
      else if (!v.tema || !DIFICULDADES.includes(v.dificuldade) || !v.explicacao) motivo = 'falta tema, dificuldade ou explicação';
      else if (!Array.isArray(v.alternativas) || v.alternativas.length < 2 || v.alternativas.length > 6
        || !Number.isInteger(v.correta) || v.correta < 0 || v.correta >= v.alternativas.length) motivo = 'alternativas ou "correta" inválidas';
      if (motivo) {
        descartadas.push(`${ref}: ${motivo}`);
        return false;
      }
      ids.add(v.id);
      return true;
    });
    return descartadas;
  }

  /** Variantes de uma questão que já passaram pelo Mergulho Triplo (só essas aparecem para o aluno). */
  function variantesDe(trilha, questaoId) {
    return (trilha.variantes || []).filter((v) => v.varianteDe === questaoId && v.validacao && v.validacao.pronta === true);
  }

  /** Busca um JSON; devolve null se falhar (arquivo ausente, file://, etc.). */
  async function buscarJSON(url) {
    try {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    }
  }

  /** Lê a listagem HTML do diretório (Live Server, http.server) e extrai os .json. */
  async function listarDiretorio() {
    try {
      const resp = await fetch(PASTA, { cache: 'no-cache' });
      if (!resp.ok || !(resp.headers.get('content-type') || '').includes('html')) return [];
      const html = await resp.text();
      const base = new URL(PASTA, location.href);
      const nomes = [...html.matchAll(/href="([^"]+?\.json)"/gi)]
        .map((m) => decodeURIComponent(new URL(m[1], base).pathname.split('/').pop()));
      return nomes.filter((n) => n !== 'indice.json' && n !== 'catalogo.json');
    } catch (e) {
      return [];
    }
  }

  function lerImportadas() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_IMPORTADAS)) || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Carrega todas as trilhas.
   * Retorna { trilhas, problemas, semServidor }.
   */
  async function carregarTodas() {
    const [indice, doDiretorio, catalogo] = await Promise.all([buscarJSON(PASTA + 'indice.json'), listarDiretorio(), buscarJSON(PASTA + 'catalogo.json')]);
    const doCatalogo = catalogo && Array.isArray(catalogo.cursos)
      ? catalogo.cursos.filter((c) => c && typeof c.id === 'string' && typeof c.arquivo === 'string' && Array.isArray(c.fases) && c.fases.length)
      : [];
    const noCatalogo = new Set(doCatalogo.map((c) => c.arquivo));
    const arquivos = [...new Set([...(Array.isArray(indice) ? indice : []), ...doDiretorio])].filter((a) => !noCatalogo.has(a));

    const trilhas = [];
    const problemas = [];
    const ids = new Set();

    function adicionar(t, origem) {
      const erros = validar(t);
      if (erros.length) return problemas.push({ origem, erros });
      if (ids.has(t.id)) return; // mesma trilha vinda de duas fontes: fica a primeira
      ids.add(t.id);
      const descartadas = limparVariantes(t);
      if (descartadas.length) console.warn(`[Diver] ${origem}: variantes ignoradas`, descartadas);
      trilhas.push(t);
    }

    // cabeçalhos do catálogo primeiro (na ordem do catálogo); o curso inteiro vem depois, por completar()
    doCatalogo.forEach((c) => {
      if (ids.has(c.id)) return;
      ids.add(c.id);
      trilhas.push({ ...c, _parcial: true, _arquivo: c.arquivo });
    });

    const conteudos = await Promise.all(arquivos.map((a) => buscarJSON(PASTA + a)));
    conteudos.forEach((t, i) => {
      if (t === null) problemas.push({ origem: arquivos[i], erros: ['não foi possível ler o arquivo (JSON inválido?)'] });
      else adicionar(t, arquivos[i]);
    });
    lerImportadas().forEach((t) => adicionar(t, `${t.nome || 'trilha'} (importada)`));

    // Se nem o indice.json respondeu, provavelmente o app foi aberto via file://
    const semServidor = indice === null && doDiretorio.length === 0;
    return { trilhas, problemas, semServidor };
  }

  /* ---------- Curso inteiro sob demanda ---------- */
  const completando = new Map();

  /**
   * Garante o curso inteiro (questões, blocos e artigos). Curso que já veio inteiro resolve na hora.
   * Copia o conteúdo para o MESMO objeto e tira a marca _parcial. Falhou (sem internet)? Rejeita e
   * deixa tentar de novo depois.
   */
  function completar(t) {
    if (!t || !t._parcial) return Promise.resolve(t);
    if (!completando.has(t.id)) {
      completando.set(t.id, buscarJSON(PASTA + t._arquivo).then((cheia) => {
        const erros = cheia ? validar(cheia) : ['não foi possível baixar o curso'];
        if (!erros.length && cheia.id !== t.id) erros.push('o arquivo não é deste curso');
        if (erros.length) throw new Error(erros[0]);
        const descartadas = limparVariantes(cheia);
        if (descartadas.length) console.warn(`[Diver] ${t._arquivo}: variantes ignoradas`, descartadas);
        Object.keys(t).forEach((k) => { if (!(k in cheia)) delete t[k]; }); // sai o que era só do catálogo (_parcial, contagem…)
        Object.assign(t, cheia);
        return t;
      }).catch((e) => {
        completando.delete(t.id);
        throw e;
      }));
    }
    return completando.get(t.id);
  }

  /** Quantas questões o curso tem (do catálogo, se ele ainda não foi baixado). */
  const totalQuestoes = (t) => (t._parcial ? (t.contagem && t.contagem.questoes) || 0 : t.questoes.length);

  /** Importa arquivos .json escolhidos pelo usuário. Retorna { ok, erros }. */
  async function importarArquivos(listaArquivos) {
    const importadas = lerImportadas();
    const resultado = { ok: [], erros: [] };
    for (const arq of listaArquivos) {
      try {
        const t = JSON.parse(await arq.text());
        const erros = validar(t);
        if (erros.length) {
          resultado.erros.push({ origem: arq.name, erros });
          continue;
        }
        limparVariantes(t);
        const pos = importadas.findIndex((x) => x.id === t.id);
        if (pos >= 0) importadas[pos] = t;
        else importadas.push(t);
        resultado.ok.push(t.nome);
      } catch (e) {
        resultado.erros.push({ origem: arq.name, erros: ['JSON inválido: ' + e.message] });
      }
    }
    try {
      localStorage.setItem(CHAVE_IMPORTADAS, JSON.stringify(importadas));
    } catch (e) {
      resultado.erros.push({ origem: 'armazenamento', erros: ['não foi possível salvar no navegador'] });
    }
    return resultado;
  }

  /** A trilha veio do botão "importar" ou do "criar trilha" (e não de data/trilhas/)? */
  function ehImportada(id) {
    return lerImportadas().some((t) => t.id === id);
  }

  /** Guarda (ou atualiza) uma trilha criada/importada no navegador. */
  function salvarImportada(trilha) {
    const importadas = lerImportadas().filter((t) => t.id !== trilha.id);
    importadas.push(trilha);
    try {
      localStorage.setItem(CHAVE_IMPORTADAS, JSON.stringify(importadas));
      return true;
    } catch (e) {
      return false;
    }
  }

  function removerImportada(id) {
    try {
      localStorage.setItem(CHAVE_IMPORTADAS, JSON.stringify(lerImportadas().filter((t) => t.id !== id)));
    } catch (e) {
      /* sem armazenamento */
    }
  }

  /** Questões de uma fase específica. */
  function questoesDaFase(trilha, faseId) {
    return trilha.questoes.filter((q) => q.fase === faseId);
  }

  return { carregarTodas, completar, totalQuestoes, importarArquivos, validar, limparVariantes, variantesDe, questoesDaFase, ehImportada, salvarImportada, removerImportada };
})();

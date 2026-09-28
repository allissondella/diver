/*
 * trilhas.js — encontra, carrega e valida as trilhas de estudo.
 *
 * Fontes (em ordem):
 *  1. data/trilhas/indice.json (lista de arquivos)
 *  2. listagem do diretório data/trilhas/ (se o servidor oferecer)
 *  3. trilhas importadas manualmente (salvas no localStorage)
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
      return nomes.filter((n) => n !== 'indice.json');
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
    const indice = await buscarJSON(PASTA + 'indice.json');
    const doDiretorio = await listarDiretorio();
    const arquivos = [...new Set([...(Array.isArray(indice) ? indice : []), ...doDiretorio])];

    const trilhas = [];
    const problemas = [];
    const ids = new Set();

    function adicionar(t, origem) {
      const erros = validar(t);
      if (erros.length) return problemas.push({ origem, erros });
      if (ids.has(t.id)) return; // mesma trilha vinda de duas fontes: fica a primeira
      ids.add(t.id);
      trilhas.push(t);
    }

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

  return { carregarTodas, importarArquivos, validar, questoesDaFase, ehImportada, salvarImportada, removerImportada };
})();

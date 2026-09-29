/*
 * leitor-prova.js — transforma o texto de uma prova antiga em questões do Diver.
 *
 * Sem IA: reconhece o formato mais comum das provas em português.
 *  - questão:     "1.", "1)", "01 -", "Questão 1", "QUESTÃO 01"
 *  - alternativa: "A)", "(A)", "a.", "A -" (na mesma linha ou uma por linha)
 *  - gabarito:    bloco "Gabarito" no fim ("1-C 2-A", "01. B", ou tabela com números e letras)
 *                 ou linha "Resposta: C" logo depois da questão; "*A)" ou "(correta)" também valem
 *  - comentário:  linha "Comentário:", "Explicação:" ou "Resolução:" vira a explicação
 * PDF: o texto sai da biblioteca pdf.js (lib/pdfjs, carregada só quando alguém envia um PDF).
 * PDF escaneado (foto) não tem texto: aí o leitor avisa e sugere colar o texto.
 */
const LeitorProva = (() => {
  const LETRAS = 'ABCDEFGH';
  const RE_QUESTAO_PALAVRA = /^(?:quest[ãa]o|q\.)\s*n?[º°o.]?\s*(\d{1,3})\b\s*[.):\-–—]?\s*(.*)$/i;
  const RE_QUESTAO_NUMERO = /^(\d{1,3})\s*[.)\-–—]\s*(.*)$/;
  const RE_ALTERNATIVA = /^(\*?)\s*\(?([a-hA-H])\s*[).\-–—:]\s*(.*)$/;
  const RE_RESPOSTA = /^(?:resposta(?:\s+correta)?|gabarito|alternativa\s+correta|resp\.)\s*[:\-–—]?\s*(?:letra\s*)?\(?([a-hA-H])\)?(?:[\s.,;:]|$)/i;
  const RE_COMENTARIO = /^(?:coment[áa]rio|explica[çc][ãa]o|resolu[çc][ãa]o|justificativa)\s*[:\-–—]\s*(.*)$/i;
  const RE_GABARITO = /^(?:gabarito(?:\s+(?:oficial|definitivo|preliminar))?|respostas|folha\s+de\s+respostas)\s*[:\-–—]?\s*(.*)$/i;
  const RE_CORRETA_FIM = /\s*(?:\((?:correta|certa)\)|✔|✓)\s*$/i;
  const RE_ANULADA = /anulad[ao]/i;

  /* ---------- Texto ---------- */

  function limparLinhas(texto) {
    const linhas = String(texto || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[   \t]/g, ' ')
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim());

    // Cabeçalho e rodapé que se repetem em toda página (só linhas longas, para não perder "Todas as anteriores")
    const contagem = new Map();
    linhas.forEach((l) => l.length > 25 && contagem.set(l, (contagem.get(l) || 0) + 1));
    return linhas.filter((l) => l
      && !/^\d{1,3}$/.test(l) // número de página solto
      && !/^p[áa]g(?:ina)?\.?\s*\d+(\s*(de|\/)\s*\d+)?$/i.test(l)
      && !(contagem.get(l) >= 3 && !RE_ALTERNATIVA.test(l)));
  }

  /** Junta um pedaço de texto ao anterior (desfaz a hifenização do fim da linha). */
  function juntar(base, mais) {
    if (!base) return mais;
    if (/[a-zà-ú]-$/i.test(base) && /^[a-zà-ú]/.test(mais)) return base.slice(0, -1) + mais;
    return `${base} ${mais}`;
  }

  /* ---------- Gabarito ---------- */

  /** Lê um bloco de gabarito. Devolve Map(número → índice da letra, ou 'anulada'). */
  function lerGabarito(linhas) {
    const mapa = new Map();
    // Formato tabela: uma linha só de números e, embaixo, uma linha só de letras
    for (let i = 0; i < linhas.length - 1; i++) {
      const nums = linhas[i].split(/\s+/);
      const letras = linhas[i + 1].split(/\s+/);
      if (nums.length > 1 && nums.length === letras.length && nums.every((n) => /^\d{1,3}$/.test(n)) && letras.every((l) => /^([a-hA-H]|\*|x|X|anulada)$/i.test(l))) {
        nums.forEach((n, k) => mapa.set(Number(n), /^[a-h]$/i.test(letras[k]) ? LETRAS.indexOf(letras[k].toUpperCase()) : 'anulada'));
        i++;
      }
    }
    // Formato lista: "1-C 2-A", "01. B", "1) c", "Questão 3: D", "4 - Anulada"
    const texto = linhas.join(' ');
    const re = /(?:quest[ãa]o\s*)?\b(\d{1,3})\s*[.)\-–—:=]?\s*(?:letra\s*)?\(?\b([a-hA-H]|anulad[ao])\b\)?/gi;
    let m;
    while ((m = re.exec(texto))) {
      const n = Number(m[1]);
      if (mapa.has(n)) continue;
      mapa.set(n, RE_ANULADA.test(m[2]) ? 'anulada' : LETRAS.indexOf(m[2].toUpperCase()));
    }
    return mapa;
  }

  /* ---------- Questões ---------- */

  /** Divide "a) um b) dois c) três" que veio numa linha só. */
  function dividirAlternativasNaLinha(texto, proximaLetra) {
    const partes = [];
    let resto = texto;
    let letra = proximaLetra;
    for (;;) {
      const L = LETRAS[letra];
      if (!L) break;
      const re = new RegExp(`\\s\\(?(${L}|${L.toLowerCase()})\\s*[).\\-–—:]\\s+`);
      const m = re.exec(resto);
      if (!m || m.index === 0) break;
      partes.push(resto.slice(0, m.index).trim());
      resto = resto.slice(m.index + m[0].length);
      letra++;
    }
    partes.push(resto.trim());
    return partes;
  }

  /**
   * Interpreta o texto de uma prova.
   * Retorna { questoes: [{ numero, enunciado, alternativas, correta (índice ou null), explicacao, anulada }], avisos: [] }
   */
  function interpretar(texto) {
    let linhas = limparLinhas(texto);
    const avisos = [];

    // O gabarito costuma vir no fim: a partir da ÚLTIMA linha de título "Gabarito" (ou "Respostas").
    // "Gabarito: C" logo depois de uma questão é a resposta dela, não o bloco.
    let gabarito = new Map();
    for (let i = linhas.length - 1; i >= 0; i--) {
      const m = RE_GABARITO.exec(linhas[i]);
      if (!m || (m[1] && !/^\d/.test(m[1]))) continue;
      const lido = lerGabarito([m[1], ...linhas.slice(i + 1)].filter(Boolean));
      if (lido.size) {
        gabarito = lido;
        linhas = linhas.slice(0, i);
      }
      break;
    }

    const questoes = [];
    const descartadas = new Set(); // números "falsos" (instruções numeradas antes da 1ª questão)
    let atual = null;
    const RE_ALTS_NA_LINHA = /\s\(?[Aa]\s*[).\-–—:]\s+.*\s\(?[Bb]\s*[).\-–—:]\s+/;
    const temAlternativas = (q) => q.alternativas.length >= 2 || RE_ALTS_NA_LINHA.test(q.enunciado);
    let campo = 'enunciado'; // onde a linha de continuação entra: enunciado, alternativa ou explicacao

    const novaQuestao = (numero, resto) => {
      atual = { numero, enunciado: resto || '', alternativas: [], correta: null, explicacao: '', anulada: RE_ANULADA.test(resto || '') };
      questoes.push(atual);
      campo = 'enunciado';
    };
    const addAlternativa = (texto, marcada) => {
      let t = texto;
      if (RE_CORRETA_FIM.test(t)) {
        t = t.replace(RE_CORRETA_FIM, '');
        marcada = true;
      }
      if (marcada) atual.correta = atual.alternativas.length;
      atual.alternativas.push(t);
      campo = 'alternativa';
    };

    linhas.forEach((linha) => {
      const esperado = atual ? atual.numero + 1 : null;
      let m = RE_QUESTAO_PALAVRA.exec(linha);
      if (m) return novaQuestao(Number(m[1]), m[2]);
      m = RE_QUESTAO_NUMERO.exec(linha);
      if (m) {
        const n = Number(m[1]);
        // Número solto só abre questão nova se for a próxima da sequência (ou a primeira da prova).
        // Se a "questão" anterior não tinha alternativas e a contagem recomeça em 1, eram instruções numeradas.
        if (!atual || (n === esperado && temAlternativas(atual))) return novaQuestao(n, m[2]);
        if (n === 1 && !temAlternativas(atual)) {
          questoes.pop();
          descartadas.add(atual.numero);
          return novaQuestao(n, m[2]);
        }
      }
      if (!atual) return; // cabeçalho da prova, instruções...

      m = RE_RESPOSTA.exec(linha);
      if (m && atual.alternativas.length >= 2) {
        atual.correta = LETRAS.indexOf(m[1].toUpperCase());
        campo = 'resposta';
        return;
      }
      m = RE_COMENTARIO.exec(linha);
      if (m && atual.alternativas.length >= 2) {
        atual.explicacao = juntar(atual.explicacao, m[1]);
        campo = 'explicacao';
        return;
      }
      m = RE_ALTERNATIVA.exec(linha);
      if (m && campo !== 'explicacao' && LETRAS.indexOf(m[2].toUpperCase()) === atual.alternativas.length) {
        const partes = dividirAlternativasNaLinha(m[3], atual.alternativas.length + 1);
        partes.forEach((p, k) => addAlternativa(p.replace(/^\*\s*/, ''), k === 0 ? m[1] === '*' : false));
        return;
      }
      // Continuação da linha anterior
      if (campo === 'alternativa') {
        const k = atual.alternativas.length - 1;
        atual.alternativas[k] = juntar(atual.alternativas[k], linha);
      } else if (campo === 'explicacao') {
        atual.explicacao = juntar(atual.explicacao, linha);
      } else if (campo === 'enunciado') {
        // "a) b) c)" podem vir no fim do enunciado, na mesma linha
        atual.enunciado = juntar(atual.enunciado, linha);
      }
    });

    // Alternativas que vieram coladas no enunciado ("... ? (A) x (B) y (C) z")
    questoes.forEach((q) => {
      if (q.alternativas.length >= 2) return;
      const m = /\s\(?[Aa]\s*[).\-–—:]\s+/.exec(q.enunciado);
      if (!m) return;
      const partes = dividirAlternativasNaLinha(q.enunciado.slice(m.index + m[0].length), 1);
      if (partes.length >= 2) {
        q.enunciado = q.enunciado.slice(0, m.index).trim();
        q.alternativas = partes;
      }
    });

    // Aplica o gabarito e limpa
    const validas = [];
    questoes.forEach((q) => {
      q.alternativas = q.alternativas.map((a) => a.trim()).filter(Boolean);
      const doGabarito = gabarito.get(q.numero);
      if (doGabarito === 'anulada') q.anulada = true;
      else if (typeof doGabarito === 'number' && doGabarito >= 0) q.correta = doGabarito;
      if (q.correta !== null && q.correta >= q.alternativas.length) q.correta = null;
      if (q.anulada) return avisos.push(`Questão ${q.numero}: anulada, ficou de fora.`);
      if (q.alternativas.length < 2) return descartadas.has(q.numero) ? null : avisos.push(`Questão ${q.numero}: não achei as alternativas. Confira no texto original.`);
      validas.push(q);
    });

    const semResposta = validas.filter((q) => q.correta === null).length;
    if (validas.length && semResposta) {
      avisos.unshift(gabarito.size
        ? `${semResposta} ${semResposta === 1 ? 'questão ficou' : 'questões ficaram'} sem resposta no gabarito: marque a certa na conferência.`
        : 'Não encontrei o gabarito. Marque a resposta certa de cada questão na conferência.');
    }
    return { questoes: validas, avisos, temGabarito: gabarito.size > 0 };
  }

  /* ---------- PDF ---------- */

  let carregando = null;
  /** Carrega o pdf.js do próprio repositório, só na primeira vez que alguém envia um PDF. */
  function carregarPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!carregando) {
      carregando = new Promise((ok, falhou) => {
        const s = document.createElement('script');
        s.src = 'lib/pdfjs/pdf.min.js';
        s.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdfjs/pdf.worker.min.js';
          ok(window.pdfjsLib);
        };
        s.onerror = () => {
          carregando = null;
          falhou(new Error('Não consegui abrir o leitor de PDF. Confira a conexão e tente de novo.'));
        };
        document.head.append(s);
      });
    }
    return carregando;
  }

  /** Extrai o texto de um PDF, linha por linha, na ordem em que foi escrito (respeita duas colunas). */
  async function textoDoPdf(arquivo) {
    const pdfjs = await carregarPdfJs();
    const dados = new Uint8Array(await arquivo.arrayBuffer());
    // isEvalSupported: false fecha a brecha conhecida de PDFs com fontes maliciosas
    const doc = await pdfjs.getDocument({ data: dados, isEvalSupported: false }).promise;
    const paginas = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const pagina = await doc.getPage(p);
      const conteudo = await pagina.getTextContent();
      let linha = '';
      let ultimoY = null;
      const linhas = [];
      conteudo.items.forEach((item) => {
        const y = item.transform ? item.transform[5] : null;
        if (ultimoY !== null && y !== null && Math.abs(y - ultimoY) > Math.max(2, (item.height || 10) * 0.6) && linha.trim()) {
          linhas.push(linha);
          linha = '';
        }
        linha += item.str;
        if (item.hasEOL) {
          linhas.push(linha);
          linha = '';
        }
        if (y !== null && item.str.trim()) ultimoY = y;
      });
      if (linha.trim()) linhas.push(linha);
      paginas.push(linhas.join('\n'));
    }
    const texto = paginas.join('\n');
    if (texto.replace(/\s/g, '').length < 40 * doc.numPages * 0.25) {
      const erro = new Error('Esse PDF parece ser uma foto (escaneado): não tem texto para eu ler. Copie o texto da prova e cole no campo "Colar texto".');
      erro.escaneado = true;
      throw erro;
    }
    return texto;
  }

  return { interpretar, textoDoPdf, LETRAS };
})();

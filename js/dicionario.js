/*
 * dicionario.js — o dicionário brasileiro da Sala de Descompressão (Palavrinha do Dia e Batata Quente).
 *
 * Fonte: VERO, o corretor do LibreOffice para o português do Brasil (LGPLv3/MPL; data/dicionario/leia-me-vero.txt),
 * expandido em todas as formas (plural, feminino, conjugações): 4,4 milhões de palavras.
 * Tudo em minúsculas, sem acento (ç vira c) e só de 2 a 20 letras a–z: "Ação" e "acao" são a mesma palavra.
 *
 * Arquivos (todos dentro do repositório, nada vem de fora):
 *  - data/dicionario/pt-br.txt   lista completa em "front coding": cada linha começa com um caractere que diz
 *                                quantas letras ela repete da palavra anterior (48 + n, ou seja, '0' = nenhuma)
 *                                e depois vem o resto. A cada 32 linhas vem uma palavra inteira ('0'), o que
 *                                permite busca binária sem montar 4 milhões de textos na memória.
 *  - data/dicionario/palavrinha/<n>.txt  Palavrinha do Dia: só as de n letras (5 a 10), já com todos os prefixos, no
 *                                mesmo formato. O jogo baixa só o tamanho da palavra do dia (de ~20 KB a ~700 KB).
 * Palavrões, ofensas e insultos foram tirados de todas as listas na hora de gerar (a lista de bloqueio não fica aqui).
 *  - data/dicionario/comuns.txt  radicais do dicionário de 3 a 12 letras (as jogadas do robô da Batata Quente).
 * O navegador baixa cada arquivo uma vez (comprimido, ~2,7 MB o maior) e guarda no cache.
 */
const Dicionario = (() => {
  const BLOCO = 32;
  const cache = {};

  /** "Ação!" → "acao" (minúsculas, sem acento, só letras). */
  function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function baixar(caminho) {
    if (!cache[caminho]) {
      cache[caminho] = fetch(caminho).then((r) => {
        if (!r.ok) throw new Error(`Não consegui abrir ${caminho} (${r.status})`);
        return r.text();
      });
      cache[caminho].catch(() => delete cache[caminho]); // deu erro? a próxima chamada tenta de novo
    }
    return cache[caminho];
  }

  /* ---------- Lista completa (front coding + busca binária) ---------- */
  /** Onde começa cada bloco de 32 linhas (a linha de abertura traz a palavra inteira). */
  function indexar(texto) {
    const inicios = [];
    let linha = 0;
    let pos = 0;
    while (pos < texto.length) {
      if (linha % BLOCO === 0) inicios.push(pos);
      const fim = texto.indexOf('\n', pos);
      pos = fim < 0 ? texto.length : fim + 1;
      linha++;
    }
    return { texto, inicios: Int32Array.from(inicios), total: linha };
  }

  let completo = null;
  function carregar() {
    if (!completo) {
      completo = baixar('data/dicionario/pt-br.txt').then(indexar);
      completo.catch(() => (completo = null));
    }
    return completo;
  }

  function linhaEm(texto, pos) {
    const fim = texto.indexOf('\n', pos);
    return fim < 0 ? texto.slice(pos) : texto.slice(pos, fim);
  }

  function procurar(d, palavra) {
    const { texto, inicios } = d;
    // Último bloco cuja primeira palavra é <= palavra
    let lo = 0;
    let hi = inicios.length - 1;
    while (lo < hi) {
      const meio = (lo + hi + 1) >> 1;
      if (linhaEm(texto, inicios[meio]).slice(1) <= palavra) lo = meio;
      else hi = meio - 1;
    }
    let pos = inicios[lo];
    let atual = '';
    for (let i = 0; i < BLOCO && pos < texto.length; i++) {
      const l = linhaEm(texto, pos);
      atual = atual.slice(0, l.charCodeAt(0) - 48) + l.slice(1);
      if (atual === palavra) return true;
      if (atual > palavra) return false;
      pos += l.length + 1;
    }
    return false;
  }

  /*
   * Prefixos do VERO que NÃO foram expandidos na lista (ela ficaria com 15 milhões de palavras): a palavra vale
   * se for prefixo + palavra da lista, respeitando a regra do prefixo ("aero" + "porto", "inter" + "valo",
   * "anti" + "rugas" vira "antirrugas"). [prefixo, começo permitido do resto]. Os prefixos re, des, in/im/i/ir,
   * co, pro, pre e a já estão expandidos na lista.
   */
  const PREFIXOS = [
    ['aero', /./], ['anfi', /./], ['ante', /^[^ehrs]/], ['anter', /^r/], ['antes', /^s/], ['anti', /^[^ihrs]/], ['antir', /^r/], ['antis', /^s/],
    ['arqui', /^[^ihrs]/], ['arquir', /^r/], ['arquis', /^s/], ['auto', /^[^ohrs]/], ['autor', /^r/], ['autos', /^s/], ['bio', /./], ['cis', /./],
    ['contra', /^[^ahrs]/], ['contrar', /^r/], ['contras', /^s/], ['extra', /^[^ahrs]/], ['extrar', /^r/], ['extras', /^s/], ['hepta', /./],
    ['hexa', /^[^ahrs]/], ['hexar', /^r/], ['hexas', /^s/], ['hiper', /^[^hr]/], ['hipo', /^[^ohrs]/], ['hipor', /^r/], ['hipos', /^s/],
    ['infra', /^[^ahrs]/], ['infrar', /^r/], ['infras', /^s/], ['inter', /^[^hr]/], ['intra', /^[^ahrs]/], ['intrar', /^r/], ['intras', /^s/],
    ['macro', /^[^ohrs]/], ['macror', /^r/], ['macros', /^s/], ['micro', /^[^ohrs]/], ['micror', /^r/], ['micros', /^s/], ['neo', /^[^ohrs]/],
    ['neor', /^r/], ['neos', /^s/], ['penta', /./], ['poli', /./], ['pos', /./], ['proto', /^[^ohrs]/], ['protor', /^r/], ['protos', /^s/],
    ['pseudo', /^[^ohrs]/], ['pseudor', /^r/], ['pseudos', /^s/], ['semi', /^[^ihrs]/], ['semir', /^r/], ['semis', /^s/], ['sesqui', /./],
    ['sobre', /^[^ehrs]/], ['sobrer', /^r/], ['sobres', /^s/], ['sub', /^[^bhr]/], ['super', /^[^hr]/], ['supra', /^[^ahrs]/], ['suprar', /^r/],
    ['supras', /^s/], ['tragi', /./], ['trans', /./], ['ultra', /^[^ahrs]/], ['ultrar', /^r/], ['ultras', /^s/], ['zoo', /./],
  ];
  function comPrefixo(d, p) {
    return PREFIXOS.some(([pre, regra]) => {
      if (!p.startsWith(pre)) return false;
      const resto = p.slice(pre.length);
      return resto.length >= 3 && regra.test(resto) && procurar(d, resto);
    });
  }
  const confere = (d, p) => procurar(d, p) || comPrefixo(d, p);

  /** A palavra está no dicionário? (carrega a lista na primeira vez; acentos não importam) */
  async function existe(palavra) {
    const p = normalizar(palavra);
    if (p.length < 2 || p.length > 20) return false;
    return confere(await carregar(), p);
  }

  /** Versão sem espera, para depois de carregar(): null se a lista ainda não chegou. */
  let pronto = null;
  function aquecer() {
    return carregar().then((d) => (pronto = d));
  }
  function existeJa(palavra) {
    if (!pronto) return null;
    const p = normalizar(palavra);
    return p.length >= 2 && p.length <= 20 && confere(pronto, p);
  }

  /* ---------- Palavrinha do Dia: uma lista por tamanho (5 a 10 letras), com todos os prefixos ---------- */
  const listas = {};
  /** Lista das palavras de n letras; devolve { existe(palavra) }. Só baixa o tamanho pedido. */
  function tamanho(n) {
    if (!listas[n]) {
      listas[n] = baixar(`data/dicionario/palavrinha/${n}.txt`).then((texto) => {
        const d = indexar(texto);
        return { existe: (palavra) => procurar(d, normalizar(palavra)) };
      });
      listas[n].catch(() => delete listas[n]);
    }
    return listas[n];
  }

  let comuns = null;
  function palavrasComuns() {
    if (!comuns) {
      comuns = baixar('data/dicionario/comuns.txt').then((t) => t.split('\n').filter(Boolean));
      comuns.catch(() => (comuns = null));
    }
    return comuns;
  }

  return { normalizar, carregar: aquecer, existe, existeJa, tamanho, palavrasComuns };
})();

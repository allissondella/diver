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
 *  - data/dicionario/pt-br-5.txt só as de 5 letras (Palavrinha do Dia), uma por linha.
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
  let completo = null;
  function carregar() {
    if (!completo) {
      completo = baixar('data/dicionario/pt-br.txt').then((texto) => {
        // Onde começa cada bloco de 32 linhas (a linha de abertura traz a palavra inteira)
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
      });
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

  /** A palavra está no dicionário? (carrega a lista na primeira vez; acentos não importam) */
  async function existe(palavra) {
    const p = normalizar(palavra);
    if (p.length < 2 || p.length > 20) return false;
    return procurar(await carregar(), p);
  }

  /** Versão sem espera, para depois de carregar(): null se a lista ainda não chegou. */
  let pronto = null;
  function aquecer() {
    return carregar().then((d) => (pronto = d));
  }
  function existeJa(palavra) {
    if (!pronto) return null;
    const p = normalizar(palavra);
    return p.length >= 2 && p.length <= 20 && procurar(pronto, p);
  }

  /* ---------- Listas menores ---------- */
  let cinco = null;
  function cincoLetras() {
    if (!cinco) {
      cinco = baixar('data/dicionario/pt-br-5.txt').then((t) => new Set(t.split('\n').filter(Boolean)));
      cinco.catch(() => (cinco = null));
    }
    return cinco;
  }

  let comuns = null;
  function palavrasComuns() {
    if (!comuns) {
      comuns = baixar('data/dicionario/comuns.txt').then((t) => t.split('\n').filter(Boolean));
      comuns.catch(() => (comuns = null));
    }
    return comuns;
  }

  return { normalizar, carregar: aquecer, existe, existeJa, cincoLetras, palavrasComuns };
})();

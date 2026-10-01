/*
 * acervo.mjs — o Acervo Diver no repositório (docs/MOTOR_DIVER.md): um JSON por matéria em
 * data/acervo/, com as questões aprovadas pelo Mergulho Triplo. Quem grava aqui é o
 * "node scripts/fila.mjs baixar <id>", a partir do resultado que a Edge Function deixou na fila.
 * Só conteúdo nosso ou questão literal do Enem (seção 4): o item é montado por itemDoAcervo,
 * que copia apenas os campos da questão, nunca material de referência.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './config.mjs';
import { textoParaEmbedding, slugMateria } from '../../supabase/functions/_shared/mergulho-nucleo.mjs';

export { slugMateria };

export const PASTA_ACERVO = join(RAIZ, 'data', 'acervo');

export const caminhoAcervo = (materia) => join(PASTA_ACERVO, `${slugMateria(materia)}.json`);

export function lerAcervo(materia) {
  const caminho = caminhoAcervo(materia);
  if (!existsSync(caminho)) return { materia: slugMateria(materia), versao: 1, itens: [] };
  const dados = JSON.parse(readFileSync(caminho, 'utf8'));
  if (!Array.isArray(dados.itens)) throw new Error(`${caminho}: formato inesperado (falta a lista "itens")`);
  return dados;
}

/** Grava JSON com 2 espaços, como os arquivos de trilha (troca atômica: nunca deixa arquivo pela metade). */
export function gravarJSON(caminho, dados) {
  const tmp = `${caminho}.tmp`;
  writeFileSync(tmp, JSON.stringify(dados, null, 2) + '\n');
  renameSync(tmp, caminho);
}

export function gravarAcervo(materia, acervo) {
  mkdirSync(PASTA_ACERVO, { recursive: true });
  gravarJSON(caminhoAcervo(materia), acervo);
}

/** Coloca ou troca (mesmo id e trilha) um item no acervo. */
export function guardarNoAcervo(acervo, item) {
  const i = acervo.itens.findIndex((x) => x.id === item.id && x.trilha === item.trilha);
  if (i >= 0) acervo.itens[i] = item;
  else acervo.itens.push(item);
}

/* ---------- Busca por palavras (TF-IDF + cosseno), sem API e sem custo ---------- */
const PALAVRAS_VAZIAS = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela para com sem e ou que se ao aos '
  + 'como mais menos qual quais quanto quantos cada entre sobre seu sua seus suas ele ela eles elas isso esse essa este esta '
  + 'foi ser sao era tem ter sua ja nao sim muito muita mesmo mesma depois antes ate dela dele alternativa alternativas '
  + 'questao enunciado tema dificuldade facil medio dificil').split(' '));

export function palavras(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9%]+/).filter((w) => w.length > 2 && !PALAVRAS_VAZIAS.has(w));
}

/**
 * Ranqueia itens pela parecença com a consulta: cada texto vira um vetor de pesos TF-IDF
 * (palavra frequente no item e rara no acervo pesa mais) e a comparação é o cosseno.
 */
export function ranquearPorPalavras(consulta, itens) {
  const docs = itens.map((i) => palavras(textoParaEmbedding(i)));
  const df = new Map();
  docs.forEach((d) => new Set(d).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
  const n = docs.length;
  const vetor = (lista) => {
    const tf = new Map();
    lista.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
    const v = new Map();
    tf.forEach((f, w) => v.set(w, (1 + Math.log(f)) * Math.log(1 + n / (1 + (df.get(w) || 0)))));
    return v;
  };
  const norma = (v) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  const q = vetor(palavras(consulta));
  const nq = norma(q);
  return itens.map((item, k) => {
    const d = vetor(docs[k]);
    let p = 0;
    q.forEach((x, w) => { if (d.has(w)) p += x * d.get(w); });
    const nd = norma(d);
    return { item, nota: nq && nd ? p / (nq * nd) : 0 };
  }).sort((a, b) => b.nota - a.nota);
}

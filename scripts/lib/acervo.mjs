/*
 * acervo.mjs — o Acervo Diver (docs/MOTOR_DIVER.md): um JSON por matéria em data/acervo/,
 * com cada questão aprovada pelo Mergulho Triplo e o vetor de significado (embedding) dela.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './config.mjs';

export const PASTA_ACERVO = join(RAIZ, 'data', 'acervo');
const LETRAS = 'ABCDEF';

/** "Matemática" → "matematica" (nome do arquivo: minúsculas, sem acento, com hífen). */
export function slugMateria(nome) {
  const s = String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) throw new Error('matéria vazia: informe --materia (ex.: --materia matematica)');
  return s;
}

export const caminhoAcervo = (materia) => join(PASTA_ACERVO, `${slugMateria(materia)}.json`);

export function lerAcervo(materia) {
  const caminho = caminhoAcervo(materia);
  if (!existsSync(caminho)) return { materia: slugMateria(materia), versao: 1, itens: [] };
  const dados = JSON.parse(readFileSync(caminho, 'utf8'));
  if (!Array.isArray(dados.itens)) throw new Error(`${caminho}: formato inesperado (falta a lista "itens")`);
  return dados;
}

/** Grava JSON com 2 espaços, do mesmo jeito dos arquivos de trilha (troca atômica: nunca deixa arquivo pela metade). */
export function gravarJSON(caminho, dados) {
  const tmp = `${caminho}.tmp`;
  writeFileSync(tmp, JSON.stringify(dados, null, 2) + '\n');
  renameSync(tmp, caminho);
}

export function gravarAcervo(materia, acervo) {
  mkdirSync(PASTA_ACERVO, { recursive: true });
  gravarJSON(caminhoAcervo(materia), acervo);
}

/** Explicação em texto corrido: aceita a de 3 camadas ({ superficie, fundo, dica }) e a antiga (texto). */
export function explicacaoEmTexto(explicacao) {
  if (!explicacao) return '';
  if (typeof explicacao === 'string') return explicacao;
  return [
    explicacao.superficie && `Na superfície: ${explicacao.superficie}`,
    explicacao.fundo && `Mergulhando fundo: ${explicacao.fundo}`,
    explicacao.dica && `Dica de mergulhador: ${explicacao.dica}`,
  ].filter(Boolean).join('\n');
}

export const alternativasEmTexto = (alternativas) => (alternativas || []).map((a, i) => `${LETRAS[i]}) ${a}`).join('\n');
export const letra = (i) => LETRAS[i];

/** O texto que vira vetor: igual na hora de guardar e na hora de buscar. */
export function textoParaEmbedding(item) {
  return [`Tema: ${item.tema || ''}`, `Dificuldade: ${item.dificuldade || ''}`, item.enunciado || '', alternativasEmTexto(item.alternativas), explicacaoEmTexto(item.explicacao)]
    .filter(Boolean).join('\n');
}

/** Cópia da questão aprovada que entra no acervo (sem campos de auditoria da trilha). */
export function itemDoAcervo(questao, { trilhaId, materia, validacao }) {
  return {
    id: questao.id,
    trilha: trilhaId,
    materia: slugMateria(materia),
    fase: questao.fase,
    tema: questao.tema,
    dificuldade: questao.dificuldade,
    origem: questao.origem || 'diver',
    ...(questao.fonte ? { fonte: questao.fonte } : {}),
    enunciado: questao.enunciado,
    alternativas: questao.alternativas,
    correta: questao.correta,
    explicacao: questao.explicacao,
    validado_em: validacao.data,
    validacao: { modelo_fato: validacao.modelo_fato, modelo_logica: validacao.modelo_logica },
  };
}

/** Coloca ou troca (mesmo id) um item no acervo. */
export function guardarNoAcervo(acervo, item) {
  const i = acervo.itens.findIndex((x) => x.id === item.id && x.trilha === item.trilha);
  if (i >= 0) acervo.itens[i] = { ...acervo.itens[i], ...item };
  else acervo.itens.push(item);
}

/* ---------- Similaridade ---------- */
export function cosseno(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let p = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { p += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? p / Math.sqrt(na * nb) : -1;
}

/** Plano B sem chave de API: parecença por palavras em comum (Jaccard). Bem mais fraco que o embedding. */
export function parecencaPorPalavras(a, b) {
  const palavras = (t) => new Set(String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9%]+/).filter((w) => w.length > 2));
  const A = palavras(a), B = palavras(b);
  if (!A.size || !B.size) return 0;
  let comum = 0;
  A.forEach((w) => { if (B.has(w)) comum++; });
  return comum / (A.size + B.size - comum);
}

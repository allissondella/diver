#!/usr/bin/env node
/*
 * gerar-catalogo.mjs — gera data/trilhas/catalogo.json: o "cabeçalho" de cada curso, sem as questões.
 *
 * O app abre lendo só o catálogo (leve) e baixa o curso inteiro quando o aluno entra nele
 * (Trilhas.completar). Rode sempre que mudar uma trilha; o conferir-trilha.mjs acusa catálogo
 * desatualizado e o fila.mjs regenera sozinho depois de aplicar um resultado.
 *
 * No catálogo vai: id, nome, descrição, categoria, fasesLivres, prova, rotuloAula, as fases
 * (sem o "Antes de mergulhar", só a marca temResumo) e as contagens. Nada de questão, bloco ou artigo.
 *
 * Uso: node scripts/gerar-catalogo.mjs            grava
 *      node scripts/gerar-catalogo.mjs --conferir  só confere (sai com 1 se estiver desatualizado)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const PASTA = 'data/trilhas';
const CAMPOS_FASE = ['id', 'nome', 'modulo', 'descricao', 'profundidade', 'novaEm', 'habilidades', 'minutos'];
const BLOCOS = ['variantes', 'pares', 'verdadeiroFalso', 'adivinhas', 'sequencias', 'palavras', 'casos'];

/** O cabeçalho de uma trilha (o que o app precisa antes de abrir o curso). */
export function metaDe(t, arquivo) {
  const porFase = {};
  (t.questoes || []).forEach((q) => { porFase[q.fase] = (porFase[q.fase] || 0) + 1; });
  const meta = { arquivo, id: t.id, nome: t.nome, descricao: t.descricao };
  ['categoria', 'fasesLivres', 'prova', 'rotuloAula'].forEach((k) => { if (t[k] !== undefined) meta[k] = t[k]; });
  meta.fases = (t.fases || []).map((f) => {
    const m = {};
    CAMPOS_FASE.forEach((k) => { if (f[k] !== undefined) m[k] = f[k]; });
    if (f.resumo) m.temResumo = true;
    m.questoes = porFase[f.id] || 0;
    return m;
  });
  meta.contagem = { questoes: (t.questoes || []).length };
  BLOCOS.forEach((k) => { if (Array.isArray(t[k]) && t[k].length) meta.contagem[k] = t[k].length; });
  return meta;
}

export function gerarCatalogo(pasta = PASTA) {
  const indice = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8'));
  const cursos = indice.map((arquivo) => metaDe(JSON.parse(readFileSync(join(pasta, arquivo), 'utf8')), arquivo));
  return { versao: 1, cursos };
}

export const textoCatalogo = (cat) => `${JSON.stringify(cat, null, 2)}\n`;

/** Grava o catálogo; devolve true se mudou. */
export function atualizarCatalogo(pasta = PASTA) {
  const caminho = join(pasta, 'catalogo.json');
  const novo = textoCatalogo(gerarCatalogo(pasta));
  const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : '';
  if (novo === atual) return false;
  writeFileSync(caminho, novo);
  return true;
}

// ---------- linha de comando ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const caminho = join(PASTA, 'catalogo.json');
  if (process.argv.includes('--conferir')) {
    const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : '';
    const ok = atual === textoCatalogo(gerarCatalogo());
    console.log(ok ? 'Catálogo em dia.' : 'Catálogo desatualizado: rode node scripts/gerar-catalogo.mjs');
    process.exit(ok ? 0 : 1);
  }
  const mudou = atualizarCatalogo();
  const tamanho = readFileSync(caminho).length;
  console.log(`${mudou ? 'Catálogo gravado' : 'Catálogo já estava em dia'}: ${caminho} (${Math.round(tamanho / 1024)} KB).`);
}

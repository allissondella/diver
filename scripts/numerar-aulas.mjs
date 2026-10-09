#!/usr/bin/env node
/*
 * numerar-aulas.mjs — numera as aulas e os módulos de um curso por matéria (Enem e vestibular).
 *
 * A numeração nunca é escrita à mão: este script lê a ordem do array "fases" e reescreve
 *   fases[].modulo     → "Módulo 3 · Geometria plana"
 *   fases[].nome       → "Aula 14 · Áreas de figuras planas"   (ou "Oficina 7 · …" na Redação)
 *   fases[].descricao  → "Módulo 3 · aula 2 de 6 · 35 min · treina as habilidades H8 e H9"
 * O id da fase não muda (ele não leva número): dá para reordenar as fases sem perder o histórico.
 *
 * Só mexe em fases que têm "modulo". Curso sem módulos (ex.: "Comece por aqui") fica como está.
 * Campos da trilha (opcionais): "rotuloAula" ("Aula" ou "Oficina"; padrão "Aula").
 * Campos da fase (opcionais): "minutos" (padrão 35) e "habilidades" (ex.: ["H8", "H9"]).
 *
 * Uso:
 *   node scripts/numerar-aulas.mjs data/trilhas/enem-matematica.json            grava
 *   node scripts/numerar-aulas.mjs data/trilhas/enem-matematica.json --conferir  só confere (sai com 1 se faltar numerar)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const tirarNumero = (texto, rotulo) => String(texto || '').replace(new RegExp(`^${rotulo}\\s+\\d+\\s*·\\s*`, 'i'), '').trim();

/** "H8" · "H8 e H9" · "H1, H2 e H3" (o texto de cada item fica como veio, ex.: "H1–H5"). */
function listar(itens) {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

function frasesHabilidades(hab, oficina) {
  if (!Array.isArray(hab) || !hab.length) return '';
  const varias = hab.length > 1 || /[–-]/.test(hab[0]);
  if (oficina) return `treina ${varias ? 'as competências' : 'a competência'} ${listar(hab)}`;
  return `treina ${varias ? 'as habilidades' : 'a habilidade'} ${listar(hab)}`;
}

export function numerar(trilha) {
  const rotulo = trilha.rotuloAula === 'Oficina' ? 'Oficina' : 'Aula';
  const oficina = rotulo === 'Oficina';
  const fases = trilha.fases || [];
  const comModulo = fases.filter((f) => f.modulo);
  if (!comModulo.length) return { mudou: 0, avisos: [] };

  // módulos na ordem em que aparecem; cada módulo precisa ser um bloco contínuo de fases
  const titulos = [];
  const avisos = [];
  comModulo.forEach((f) => {
    const t = tirarNumero(f.modulo, 'Módulo');
    if (titulos[titulos.length - 1] !== t) {
      if (titulos.includes(t)) avisos.push(`o módulo "${t}" aparece separado em dois lugares (fase ${f.id})`);
      titulos.push(t);
    }
  });
  const tamanho = {};
  comModulo.forEach((f) => { const t = tirarNumero(f.modulo, 'Módulo'); tamanho[t] = (tamanho[t] || 0) + 1; });
  Object.entries(tamanho).forEach(([t, n]) => { if (n < 5 || n > 7) avisos.push(`o módulo "${t}" tem ${n} ${rotulo.toLowerCase()}${n === 1 ? '' : 's'} (o padrão é de 5 a 7)`); });

  let mudou = 0;
  let numero = 0;
  const posicao = {};
  fases.forEach((f) => {
    if (!f.modulo) return;
    numero += 1;
    const t = tirarNumero(f.modulo, 'Módulo');
    const m = titulos.indexOf(t) + 1;
    posicao[t] = (posicao[t] || 0) + 1;
    const novo = {
      modulo: `Módulo ${m} · ${t}`,
      nome: `${rotulo} ${numero} · ${tirarNumero(f.nome, rotulo)}`,
      descricao: [`Módulo ${m}`, `${rotulo.toLowerCase()} ${posicao[t]} de ${tamanho[t]}`, `${f.minutos || 35} min`, frasesHabilidades(f.habilidades, oficina)].filter(Boolean).join(' · '),
    };
    if (novo.modulo !== f.modulo || novo.nome !== f.nome || novo.descricao !== f.descricao) mudou += 1;
    Object.assign(f, novo);
  });
  return { mudou, avisos };
}

// ---------- linha de comando ----------
const principal = import.meta.url === `file://${process.argv[1]}`;
const [, , arquivo, ...resto] = process.argv;
if (principal && arquivo) {
  const conferir = resto.includes('--conferir');
  const trilha = JSON.parse(readFileSync(arquivo, 'utf8'));
  const { mudou, avisos } = numerar(trilha);
  avisos.forEach((a) => console.log(`AVISO: ${a}`));
  if (conferir) {
    console.log(mudou ? `${mudou} fase(s) precisam ser renumeradas: rode sem --conferir.` : 'Numeração em dia.');
    process.exit(mudou ? 1 : 0);
  }
  if (mudou) writeFileSync(arquivo, `${JSON.stringify(trilha, null, 2)}\n`);
  console.log(mudou ? `${mudou} fase(s) renumerada(s) em ${arquivo}.` : 'Nada a mudar: a numeração já estava em dia.');
} else if (principal) {
  console.log('Uso: node scripts/numerar-aulas.mjs <trilha.json> [--conferir]');
}

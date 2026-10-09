#!/usr/bin/env node
/*
 * conferir-trilha.mjs — confere uma trilha antes de publicar (skill criar-trilha, seção 5).
 * Sem IA e sem rede: só lê o JSON.
 *
 * Uso: node scripts/conferir-trilha.mjs data/trilhas/<trilha>.json
 *
 * ERRO (não publica): ids repetidos, gabarito fora, alternativas iguais, fase sem "Antes de mergulhar",
 *   menos de 8 fáceis+médias numa fase, termo leigo proibido em curso de Medicina.
 * AVISO (o professor decide): certa muito mais longa, dica da Palavrinha que entrega a palavra,
 *   e o "padrão Georgia" (docs/cadernos/professor-diver.md, seção 7): comentário por alternativa,
 *   Dica de mergulhador, ~20 questões por fase, Aprender completo, revisão enxuta, conceito
 *   repetido em blocos demais e ficha para os assuntos da "Revisar a fundo".
 *   Regra da repetição (Georgia, 2026-10-04): o mais importante e difícil (resumo.reforcar, 3 a 5 conceitos)
 *   faz o caminho Aprender → mapa mental ou associações → pontos-chave; os pontos-chave retomam o Aprender.
 */
import { readFileSync } from 'node:fs';
import { numerar } from './numerar-aulas.mjs';

const arq = process.argv[2];
if (!arq) {
  console.log('Uso: node scripts/conferir-trilha.mjs data/trilhas/<trilha>.json');
  process.exit(2);
}
const t = JSON.parse(readFileSync(arq, 'utf8'));
const erros = [];
const avisos = [];
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Palavras comuns que não contam como "retomar o assunto" do Aprender
const COMUNS = new Set('sempre quando porque depois antes entre sobre outro outra outros outras nunca muito muita mesmo mesma fazer feito pode podem deve devem ainda todos todas toda todo cada primeiro primeira quem onde nossa nosso sinal coisa coisas parte maior menor melhor tanto quanto assim desde durante contra sobre isso essa esse esta este aquela aquele numa nesse nessa dessa desse pelos pelas tambem apenas mais menos qual quais tipo forma'.split(' '));
const palavras = (s) => String(s).split(/\s+/).filter(Boolean).length;
const textoDe = (x) => (x == null ? '' : typeof x === 'string' ? x : Array.isArray(x) ? x.map(textoDe).join(' ') : typeof x === 'object' ? Object.values(x).map(textoDe).join(' ') : String(x));

/* ---------- Estrutura ---------- */
const ids = new Set();
const todos = [...t.questoes, ...(t.variantes || []), ...(t.pares || []), ...(t.verdadeiroFalso || []), ...(t.adivinhas || []), ...(t.sequencias || []), ...(t.palavras || [])];
for (const x of todos) { if (ids.has(x.id)) erros.push('id repetido ' + x.id); ids.add(x.id); }
const fases = new Set(t.fases.map((f) => f.id));
const qids = new Set(t.questoes.map((q) => q.id));
let semComentarios = 0;
let semDica = 0;
for (const q of [...t.questoes, ...(t.variantes || [])]) {
  if (!fases.has(q.fase)) erros.push(`${q.id}: fase ${q.fase} não existe`);
  if (!['facil', 'medio', 'dificil'].includes(q.dificuldade)) erros.push(`${q.id}: dificuldade ${q.dificuldade}`);
  if (!Array.isArray(q.alternativas) || q.alternativas.length < 4) erros.push(`${q.id}: poucas alternativas`);
  if (!(q.correta >= 0 && q.correta < q.alternativas.length)) erros.push(`${q.id}: correta fora`);
  if (new Set(q.alternativas.map(semAcento)).size !== q.alternativas.length) erros.push(`${q.id}: alternativas repetidas`);
  if (!q.explicacao || q.explicacao.length < 40) erros.push(`${q.id}: explicação curta`);
  if (!q.enunciado || !q.tema) erros.push(`${q.id}: sem enunciado/tema`);
  if (q.varianteDe && !qids.has(q.varianteDe)) erros.push(`${q.id}: varianteDe inexistente`);
  if (q.varianteDe && qids.has(q.varianteDe) && semAcento(q.enunciado) === semAcento(t.questoes.find((o) => o.id === q.varianteDe).enunciado)) erros.push(`${q.id}: igual à original`);
  // a certa não pode ser de longe a mais longa (entrega a resposta)
  const tam = q.alternativas.map((a) => a.length);
  const outras = tam.filter((_, i) => i !== q.correta);
  if (tam[q.correta] > 1.9 * Math.max(...outras) && tam[q.correta] > 60) avisos.push(`${q.id}: certa bem mais longa que as outras`);
  // comentário por alternativa: comentarios[i] na ordem do JSON; todas as erradas comentadas
  if (q.comentarios !== undefined) {
    if (!Array.isArray(q.comentarios) || q.comentarios.length !== q.alternativas.length) erros.push(`${q.id}: "comentarios" precisa ter um item por alternativa`);
    else if (q.comentarios.some((c, i) => i !== q.correta && !String(c || '').trim())) erros.push(`${q.id}: alternativa errada sem comentário`);
  } else semComentarios++;
  if (!/Dica de mergulhador:/i.test(q.explicacao || '')) semDica++;
}

/* ---------- Fases e "Antes de mergulhar" ---------- */
for (const f of t.fases) {
  const qs = t.questoes.filter((q) => q.fase === f.id);
  const c = { facil: 0, medio: 0, dificil: 0 };
  qs.forEach((q) => c[q.dificuldade]++);
  const r = f.resumo || {};
  const aprender = palavras(textoDe(r.introducao)) + palavras(textoDe(r.secoes));
  console.log(`${f.id}: ${qs.length} questões (${c.facil} fáceis, ${c.medio} médias, ${c.dificil} difíceis) · Aprender ${aprender} palavras · ${(r.pontos || []).length} pontos · ${(r.perolas || []).length} pérolas`);
  if (c.facil + c.medio < 8) erros.push(`${f.id}: menos de 8 fáceis+médias`);
  if (!f.resumo || !r.introducao || !(r.pontos || []).length) erros.push(`${f.id}: sem "Antes de mergulhar"`);
  if (qs.length < 20) avisos.push(`${f.id}: ${qs.length} questões (o padrão é ~20 por fase, cobrindo a aula toda)`);
  if (f.resumo && aprender < 350) avisos.push(`${f.id}: Aprender com ${aprender} palavras (o padrão pede um resumo completo da aula, 350+)`);
  if ((r.pontos || []).length > 8) avisos.push(`${f.id}: ${r.pontos.length} pontos-chave (máximo 8: revisão enxuta)`);
  if ((r.perolas || []).length > 6) avisos.push(`${f.id}: ${r.perolas.length} pérolas (máximo 6)`);
  // Conceito repetido demais: cada termo em **negrito** é procurado nos blocos do "Antes de mergulhar"
  // (o Aprender — introdução + seções — conta como um bloco; depois mapa mental, associações, tabela,
  // linha do tempo, mapa, pontos e pérolas). Máximo 3 blocos, para todos (regra da Georgia: até 3 vezes).
  if (f.resumo) {
    const blocos = [[r.introducao, r.secoes], r.mapaMental, r.associacoes, r.tabela, r.linhaDoTempo, r.mapa, r.pontos, r.perolas]
      .map((b) => semAcento(textoDe(b))).filter(Boolean);
    const termos = new Set((textoDe(r).match(/\*\*([^*]+)\*\*/g) || []).map((m) => semAcento(m.slice(2, -2)).trim()).filter((x) => x.length >= 5));
    for (const termo of termos) {
      const vezes = blocos.filter((b) => b.includes(termo)).length;
      if (vezes > 3) avisos.push(`${f.id}: "${termo}" aparece em ${vezes} blocos do resumo (máximo 3)`);
    }
    // O mais importante e difícil faz o caminho completo: Aprender → mapa mental ou associações → pontos-chave
    const aprenderTxt = semAcento(textoDe([r.introducao, r.secoes]));
    const associarTxt = semAcento(textoDe([r.mapaMental, r.associacoes]));
    const pontosTxt = semAcento(textoDe(r.pontos));
    const reforcar = (r.reforcar || []).map(semAcento);
    if (reforcar.length < 3 || reforcar.length > 5) avisos.push(`${f.id}: resumo.reforcar com ${reforcar.length} conceitos (liste os 3 a 5 mais importantes e difíceis)`);
    for (const termo of reforcar) {
      const falta = [[aprenderTxt, 'Aprender'], [associarTxt, 'mapa mental/associações'], [pontosTxt, 'pontos-chave']].filter(([b]) => !b.includes(termo)).map(([, n]) => n);
      if (falta.length) avisos.push(`${f.id}: "${termo}" (reforçar) não aparece em: ${falta.join(', ')}`);
      const vezes = blocos.filter((b) => b.includes(termo)).length;
      if (vezes > 3) avisos.push(`${f.id}: "${termo}" (reforçar) aparece em ${vezes} blocos do resumo (máximo 3: Aprender → mapa ou associações → pontos)`);
    }
    // Ponto-chave e item do mapa mental retomam o que o Aprender explicou (não trazem assunto novo)
    const raizes = (txt) => semAcento(txt).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 5 && !COMUNS.has(w)).map((w) => w.slice(0, 5));
    const doAprender = new Set(raizes(aprenderTxt));
    const ecoa = (txt) => { const rz = raizes(txt); return !rz.length || rz.filter((w) => doAprender.has(w)).length >= Math.min(2, rz.length); };
    (r.pontos || []).forEach((p) => { if (!ecoa(p)) avisos.push(`${f.id}: ponto-chave não retoma o Aprender: "${p}"`); });
    ((r.mapaMental && r.mapaMental.ramos) || []).forEach((ramo) => (ramo.itens || []).forEach((it) => { if (!ecoa(it)) avisos.push(`${f.id}: item do mapa mental fora do Aprender: "${it}"`); }));
  }
}

/* ---------- Linguagem técnica (Medicina) ---------- */
if (/medicina/i.test(t.categoria || '')) {
  const PROIBIDOS = [
    [/\bbrilh\w*/gi, 'use hiperintenso/hipersinal (RM), hiperdenso (TC) ou hiperecogênico (US)'],
    [/\bgeod[oa]s?\b/gi, 'use "cisto subcondral"'],
    [/\bacend\w*/gi, 'use realce ou captação'],
  ];
  const EVITAR = [
    [/\bescur[oa]s?\b|\bescurec\w*/gi, 'prefira hipointenso/hipossinal, hipodenso ou hipoecogênico'],
    [/\bapagad[oa]s?\b|\bapaga\b/gi, 'prefira supressão/saturação de gordura ou queda de sinal'],
  ];
  const textos = [];
  t.fases.forEach((f) => textos.push([`fase ${f.id}`, textoDe(f.resumo)]));
  [...t.questoes, ...(t.variantes || [])].forEach((q) => textos.push([q.id, textoDe([q.enunciado, q.alternativas, q.explicacao, q.comentarios])]));
  ['pares', 'verdadeiroFalso', 'adivinhas', 'sequencias', 'palavras'].forEach((b) => (t[b] || []).forEach((x) => textos.push([x.id, textoDe(x)])));
  Object.entries(t.fichas || {}).forEach(([tema, x]) => textos.push([`ficha ${tema}`, textoDe(x)]));
  for (const [onde, txt] of textos) {
    for (const [re, dica] of PROIBIDOS) for (const m of txt.match(re) || []) erros.push(`${onde}: "${m}" — ${dica}`);
    for (const [re, dica] of EVITAR) for (const m of txt.match(re) || []) avisos.push(`${onde}: "${m}" — ${dica}`);
  }
}

/* ---------- Fichas da "Revisar a fundo" ---------- */
const porTema = {};
t.questoes.forEach((q) => { porTema[q.tema] = (porTema[q.tema] || 0) + 1; });
const fichas = t.fichas || {};
const semFicha = Object.entries(porTema).filter(([tema, n]) => n >= 3 && !fichas[tema]).map(([tema]) => tema);
Object.keys(fichas).forEach((tema) => { if (!porTema[tema]) erros.push(`ficha "${tema}": nenhuma questão tem esse tema`); });

/* ---------- Blocos dos jogos ---------- */
const pos = [0, 0, 0, 0, 0];
t.questoes.forEach((q) => pos[q.correta]++);
console.log('posição da certa (A–E):', pos.join(' '));
for (const a of t.adivinhas || []) if (!a.dicas || a.dicas.length < 3 || !a.aceitas.length) erros.push(`${a.id}: adivinha incompleta`);
for (const s of t.sequencias || []) if (!s.itens || s.itens.length < 3) erros.push(`${s.id}: sequência curta`);
const palavrinha = (t.palavras || []).filter((p) => !/[\s-]/.test(p.palavra) && /^[a-z]{4,8}$/.test(semAcento(p.palavra)));
for (const p of t.palavras || []) {
  const P = semAcento(p.palavra).replace(/\s/g, '');
  if (semAcento(p.dica).replace(/[^a-z ]/g, ' ').split(/\s+/).some((w) => w.length > 2 && (w.includes(P) || (P.includes(w) && w.length >= P.length - 2)))) avisos.push(`${p.id}: dica pode entregar "${p.palavra}"`);
}
console.log(`blocos: pares ${(t.pares || []).length}, V/F ${(t.verdadeiroFalso || []).length}, adivinhas ${(t.adivinhas || []).length}, sequências ${(t.sequencias || []).length}, palavras ${(t.palavras || []).length} (Palavrinha: ${palavrinha.length})`);
if (palavrinha.length < 40) avisos.push(`Palavrinha com ${palavrinha.length} palavras (x2/x4 pedem 40)`);
if ((t.pares || []).length < 10) avisos.push('Memória com menos de 10 pares');
if (t.prova) {
  console.log('prova:', JSON.stringify(t.prova));
  if (t.questoes.length < t.prova.questoes) erros.push('prova pede mais questões do que existem');
}
const total = t.questoes.length + (t.variantes || []).length;
console.log(`padrão Georgia: comentários por alternativa ${total - semComentarios}/${total} · Dica de mergulhador ${total - semDica}/${total} · fichas ${Object.keys(fichas).length} (faltam ${semFicha.length} temas com 3+ questões)`);
if (semComentarios) avisos.push(`${semComentarios} questões sem "comentarios" (um por alternativa)`);
if (semDica) avisos.push(`${semDica} questões sem "Dica de mergulhador:" na explicação`);
if (semFicha.length) avisos.push(`temas sem ficha: ${semFicha.join('; ')}`);
console.log('variantes:', (t.variantes || []).length, '| revisar:', t.questoes.filter((q) => q.revisar).length);
/* ---------- Cursos por matéria: módulos e numeração das aulas (scripts/numerar-aulas.mjs) ---------- */
if (t.fases.some((f) => f.modulo)) {
  const copia = JSON.parse(JSON.stringify(t));
  const { mudou, avisos: avisosNumeracao } = numerar(copia);
  if (mudou) erros.push(`${mudou} fase(s) com nome, módulo ou descrição fora da numeração: rode node scripts/numerar-aulas.mjs ${arq}`);
  avisosNumeracao.forEach((a) => avisos.push(a));
  t.fases.filter((f) => f.modulo && f.profundidade).forEach((f) => avisos.push(`fase ${f.id}: curso por matéria não usa "profundidade"`));
}

avisos.forEach((a) => console.log('AVISO', a));
erros.forEach((e) => console.log('ERRO', e));
console.log(erros.length ? `${erros.length} erro(s), ${avisos.length} aviso(s)` : `OK, sem erros (${avisos.length} aviso(s))`);
process.exit(erros.length ? 1 : 0);

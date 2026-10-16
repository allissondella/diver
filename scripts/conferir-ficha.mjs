#!/usr/bin/env node
/* Confere uma ficha do Mapa das Profissões.
   Uso: node scripts/conferir-ficha.mjs data/profissoes/<id>.json [--publicar]
   Sai com código 1 se houver erro. Avisos não bloqueiam. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const caminho = process.argv[2];
if (!caminho) { console.error('Uso: node scripts/conferir-ficha.mjs data/profissoes/<id>.json'); process.exit(2); }
const f = JSON.parse(readFileSync(caminho, 'utf8'));
let indice = null;
try { indice = JSON.parse(readFileSync(resolve(dirname(caminho), 'indice.json'), 'utf8')); } catch { /* opcional */ }

const erros = [], avisos = [];
const erro = m => erros.push(m), aviso = m => avisos.push(m);
const HOJE = new Date();
const dias = iso => Math.round((HOJE - new Date(iso)) / 86400000);

// 1. Campos obrigatórios
['id', 'versao', 'nome', 'area', 'frase', 'status', 'conferido_em', 'revisao', 'tags', 'numeros', 'secoes', 'mitos', 'fontes'].forEach(k => { if (!(k in f)) erro(`Campo obrigatório ausente: ${k}`); });
if (!['planejada', 'rascunho', 'validada', 'publicada'].includes(f.status)) erro(`status inválido: ${f.status}`);
if (f.status === 'publicada' && !(f.revisao && f.revisao.profissional === 'ok' && f.revisao.revisor)) erro('status "publicada" exige revisao.profissional = "ok" com revisor e data');
if (indice) {
  const p = indice.profissoes.find(x => x.id === f.id);
  if (!p) erro(`id "${f.id}" não está em indice.json`);
  else if (!indice.areas.some(a => a.id === f.area)) erro(`area "${f.area}" não existe em indice.json`);
  // Os filtros do mapa leem as tags do índice (leve): elas precisam ser as mesmas da ficha
  if (p && p.tags && JSON.stringify(p.tags) !== JSON.stringify(f.tags)) erro(`tags do indice.json (${p.tags.join(', ')}) diferentes das da ficha (${(f.tags || []).join(', ')})`);
  if (p && p.arquivo && !p.tags) aviso('indice.json sem as tags desta ficha: os filtros do mapa não vão encontrá-la');
}

// 2. Fontes
const ids = new Set((f.fontes || []).map(x => x.id));
(f.fontes || []).forEach(fo => {
  ['id', 'titulo', 'orgao', 'url', 'consultado_em', 'tipo'].forEach(k => { if (!fo[k]) erro(`Fonte ${fo.id || '?'} sem campo ${k}`); });
  if (fo.tipo && !['primaria', 'secundaria'].includes(fo.tipo)) erro(`Fonte ${fo.id}: tipo deve ser primaria ou secundaria`);
  if (fo.tipo === 'secundaria' && !fo.nota && f.status === 'publicada') aviso(`Fonte secundária ${fo.id} sem nota de pendência em ficha publicada`);
});
const usadas = new Set();
function varrer(o, trilha) {
  if (Array.isArray(o)) return o.forEach((x, i) => varrer(x, `${trilha}[${i}]`));
  if (o && typeof o === 'object') for (const k in o) {
    if ((k === 'fontes' || k.endsWith('_fontes')) && Array.isArray(o[k]) && o[k].every(x => typeof x === 'string')) {
      o[k].forEach(id => { usadas.add(id); if (!ids.has(id)) erro(`${trilha}.${k} cita fonte inexistente: ${id}`); });
    } else varrer(o[k], `${trilha}.${k}`);
  }
}
varrer({ ...f, fontes: undefined }, 'ficha');
ids.forEach(id => { if (!usadas.has(id)) aviso(`Fonte ${id} não é citada em nenhum lugar`); });

// 3. Números principais
['duracao', 'formato', 'salario', 'registro'].forEach(k => {
  const n = f.numeros && f.numeros[k];
  if (!n) return aviso(`numeros.${k} ausente`);
  if (!n.valor) erro(`numeros.${k} sem valor`);
  if (!n.fontes || !n.fontes.length) erro(`numeros.${k} sem fonte`);
});

// 4. Seções
const S = f.secoes || {};
['o_que_faz', 'dia_a_dia', 'o_que_estuda', 'como_entrar', 'quanto_ganha', 'caminhos', 'ninguem_conta', 'vizinhas'].forEach(k => { if (!S[k]) erro(`Seção obrigatória ausente: secoes.${k}`); });
if (S.ninguem_conta && (!S.ninguem_conta.itens || S.ninguem_conta.itens.length < 3)) erro('"O que ninguém te conta" precisa de pelo menos 3 itens');
if (S.quanto_ganha) {
  (S.quanto_ganha.medias || []).forEach(m => {
    if (!m.fontes || !m.fontes.length) erro(`Média salarial de ${m.cargo} sem fonte`);
    (m.fontes || []).forEach(id => { const fo = (f.fontes || []).find(x => x.id === id); const ref = fo && (fo.dados_atualizados_em || fo.consultado_em); if (ref && dias(ref) > 180) erro(`Fonte de salário ${id} vencida (${dias(ref)} dias; limite 180)`); else if (ref && dias(ref) > 150) aviso(`Fonte de salário ${id} vence em breve (${dias(ref)} dias)`); });
  });
  (S.quanto_ganha.pisos || []).forEach(p => { if (!p.fontes || !p.fontes.length) erro(`Piso de ${p.cargo} sem fonte`); });
}
if (S.vizinhas && indice) S.vizinhas.forEach(v => { if (!indice.profissoes.some(p => p.id === v.id)) aviso(`Vizinha "${v.id}" não está no índice`); });
if (S.como_entrar && S.como_entrar.materias_chave) {
  // Os ids precisam ser cursos reais (o botão abre o curso na Sala Enem): confere no catálogo leve do app
  let catalogo = null;
  try { catalogo = JSON.parse(readFileSync(resolve(dirname(caminho), '..', 'trilhas', 'catalogo.json'), 'utf8')); } catch { /* fora do repositório */ }
  const ids = catalogo ? new Set((catalogo.cursos || []).map(t => t.id)) : null;
  if (!ids) aviso('Sem data/trilhas/catalogo.json por perto: confira à mão os ids de materias_chave: ' + S.como_entrar.materias_chave.join(', '));
  else S.como_entrar.materias_chave.forEach(id => { if (!ids.has(id)) erro(`materias_chave "${id}" não é um curso de data/trilhas/catalogo.json (os da Sala Enem são enem-<matéria>)`); });
}

// 5. Mitos
if (!f.mitos || f.mitos.length < 5) erro('A ficha precisa de pelo menos 5 mitos');
(f.mitos || []).forEach(m => { if (typeof m.verdade !== 'boolean') erro(`Mito ${m.id}: campo verdade deve ser true ou false`); if (!m.explicacao) erro(`Mito ${m.id} sem explicação`); if (!m.fontes || !m.fontes.length) aviso(`Mito ${m.id} sem fonte`); });

// 6. Um dia como
if (f.dia) {
  const ind = new Set((f.dia.indicadores || []).map(i => i.id));
  if (!f.dia.cenas || f.dia.cenas.length < 4) erro('"Um dia como" precisa de pelo menos 4 cenas');
  (f.dia.cenas || []).forEach(c => {
    const n = (c.opcoes || []).filter(o => o.melhor).length;
    if (n !== 1) erro(`Cena ${c.id}: exatamente uma opção deve ter melhor: true (tem ${n})`);
    if ((c.opcoes || []).length < 2) erro(`Cena ${c.id}: precisa de 2 ou mais opções`);
    (c.opcoes || []).forEach(o => { Object.keys(o.efeitos || {}).forEach(k => { if (!ind.has(k)) erro(`Cena ${c.id}: efeito em indicador desconhecido "${k}"`); }); if (!o.retorno) erro(`Cena ${c.id}: opção sem retorno`); });
  });
  if (!f.dia.recompensa || !f.dia.recompensa.xp) erro('"Um dia como" sem recompensa');
  if (!f.dia.aviso) aviso('"Um dia como" sem aviso de que as cenas são simplificadas');
  if (f.status === 'publicada' && f.dia.revisar_com_profissional) erro('Ficha publicada com "Um dia como" ainda marcado para revisão profissional');
}

// 7. Agora mesmo
if (f.agora) {
  const cobertura = f.agora.reduce((t, a) => t + (a.ate - a.de), 0);
  if (cobertura !== 24) erro(`"agora" cobre ${cobertura} h; precisa cobrir exatamente 24`);
  const ordenado = [...f.agora].sort((a, b) => a.de - b.de);
  for (let i = 1; i < ordenado.length; i++) if (ordenado[i].de !== ordenado[i - 1].ate) erro(`"agora": buraco ou sobreposição entre ${ordenado[i - 1].ate}h e ${ordenado[i].de}h`);
}

// 8. DNA e dilemas
if (f.dna) ['pessoas', 'pressao', 'corpo', 'rotina', 'numeros', 'criatividade'].forEach(k => { const v = f.dna[k]; if (typeof v !== 'number' || v < 0 || v > 100) erro(`dna.${k} deve ser número de 0 a 100`); });
if (f.dna && f.status === 'publicada' && !f.dna_calibrado) aviso('DNA não calibrado em ficha publicada');
(f.dilemas || []).forEach(d => { const n = (d.opcoes || []).filter(o => o.recomendada).length; if (n !== 1) erro(`Dilema ${d.id}: exatamente uma opção recomendada (tem ${n})`); if (!d.resposta) erro(`Dilema ${d.id} sem resposta`); if (!d.fontes || !d.fontes.length) aviso(`Dilema ${d.id} sem fonte`); });

// 9. Texto marcado para revisão
if (f.status === 'publicada') {
  const pend = [];
  (function buscar(o, t) { if (Array.isArray(o)) return o.forEach((x, i) => buscar(x, `${t}[${i}]`)); if (o && typeof o === 'object') for (const k in o) { if (k === 'revisar_com_profissional' && o[k]) pend.push(t); buscar(o[k], `${t}.${k}`); } })(f, 'ficha');
  if (pend.length) erro('Ficha publicada com trechos marcados revisar_com_profissional: ' + pend.join(', '));
}

// Resultado
const nome = `${f.nome || caminho} (${f.status || '?'})`;
if (avisos.length) console.log(`Avisos (${avisos.length}):\n  - ` + avisos.join('\n  - '));
if (erros.length) { console.error(`\n${nome}: ${erros.length} erro(s)\n  - ` + erros.join('\n  - ')); process.exit(1); }
console.log(`\n${nome}: ok. ${ids.size} fontes, ${(f.mitos || []).length} mitos${f.dia ? `, ${f.dia.cenas.length} cenas` : ''}${f.dilemas ? `, ${f.dilemas.length} dilema(s)` : ''}.`);

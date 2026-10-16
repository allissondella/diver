#!/usr/bin/env node
/* Confere um panorama de área (ex.: data/profissoes/tecnologia.json).
   Uso: node scripts/conferir-panorama.mjs data/profissoes/tecnologia.json */
import { readFileSync } from 'node:fs';
const caminho = process.argv[2]; if (!caminho) { console.error('Uso: node scripts/conferir-panorama.mjs <arquivo.json>'); process.exit(2); }
const t = JSON.parse(readFileSync(caminho, 'utf8'));
const erros = [], avisos = [];
const ids = new Set(t.fontes.map(f => f.id)); const usadas = new Set();
const HOJE = new Date(); const dias = iso => Math.round((HOJE - new Date(iso)) / 86400000);
(function varrer(o, tr) { if (Array.isArray(o)) return o.forEach((x, i) => varrer(x, `${tr}[${i}]`)); if (o && typeof o === 'object') for (const k in o) { if ((k === 'fontes' || k.endsWith('_fontes')) && Array.isArray(o[k]) && o[k].every(x => typeof x === 'string')) o[k].forEach(id => { usadas.add(id); if (!ids.has(id)) erros.push(`${tr}.${k} cita fonte inexistente: ${id}`); }); else varrer(o[k], `${tr}.${k}`); } })({ ...t, fontes: undefined }, 'panorama');
ids.forEach(id => { if (!usadas.has(id)) avisos.push(`Fonte ${id} não citada`); });
t.fontes.forEach(f => ['id', 'titulo', 'orgao', 'url', 'consultado_em', 'tipo'].forEach(k => { if (!f[k]) erros.push(`Fonte ${f.id || '?'} sem ${k}`); }));
const areas = new Set(t.areas.map(a => a.id));
t.areas.forEach(a => {
  ['id', 'nome', 'apelido', 'resumo', 'o_que_faz', 'dia', 'ferramentas', 'gosta_de', 'nao_gosta_se', 'dna', 'salarios', 'formacao', 'caminhos', 'ninguem_conta', 'vizinhas'].forEach(k => { if (!(k in a)) erros.push(`Área ${a.id}: falta ${k}`); });
  if (a.dia && a.dia.length < 5) erros.push(`Área ${a.id}: "dia" precisa de 5 ou mais momentos`);
  if (a.ninguem_conta && a.ninguem_conta.length < 3) erros.push(`Área ${a.id}: "ninguem_conta" precisa de 3 itens`);
  (a.salarios || []).forEach(s => { if (!s.fontes || !s.fontes.length) erros.push(`Área ${a.id}: salário ${s.cargo} sem fonte`); if (!(s.p25 < s.media && s.media < s.p75)) avisos.push(`Área ${a.id}: média fora da faixa P25–P75 em ${s.cargo}`); (s.fontes || []).forEach(id => { const fo = t.fontes.find(x => x.id === id); const ref = fo && (fo.dados_atualizados_em || fo.consultado_em); if (ref && dias(ref) > 180) erros.push(`Fonte de salário ${id} vencida (${dias(ref)} dias)`); }); });
  ['pessoas', 'pressao', 'corpo', 'rotina', 'numeros', 'criatividade'].forEach(k => { const v = a.dna && a.dna[k]; if (typeof v !== 'number' || v < 0 || v > 100) erros.push(`Área ${a.id}: dna.${k} inválido`); });
  (a.vizinhas || []).forEach(v => { if (!areas.has(v)) erros.push(`Área ${a.id}: vizinha "${v}" não existe`); });
});
const J = t.jogo; if (!J || !J.cenas || J.cenas.length < 10) erros.push('Jogo precisa de pelo menos 10 situações');
const cobertura = {}; (J.cenas || []).forEach(c => { if (!c.opcoes || c.opcoes.length < 3) erros.push(`Situação ${c.id}: 3 ou mais opções`); c.opcoes.forEach(o => Object.keys(o.pontos || {}).forEach(k => { if (!areas.has(k)) erros.push(`Situação ${c.id}: área desconhecida "${k}"`); cobertura[k] = (cobertura[k] || 0) + 1; })); });
areas.forEach(a => { if ((cobertura[a] || 0) < 5) avisos.push(`Área ${a} aparece em só ${cobertura[a] || 0} opções do jogo (ideal: 5 ou mais)`); });
if (avisos.length) console.log(`Avisos (${avisos.length}):\n  - ` + avisos.join('\n  - '));
if (erros.length) { console.error(`\n${t.titulo}: ${erros.length} erro(s)\n  - ` + erros.join('\n  - ')); process.exit(1); }
console.log(`\n${t.titulo} (${t.status}): ok. ${t.areas.length} áreas, ${t.fontes.length} fontes, ${J.cenas.length} situações no jogo.`);

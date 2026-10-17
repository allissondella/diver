#!/usr/bin/env node
/*
 * gerar-numeros-profissoes.mjs — gera data/profissoes/numeros.json: os números que comparam
 * uma profissão com as outras (o relatório da ficha e o mapa leem daqui, sem baixar as 22 fichas).
 *
 * Tudo sai das próprias fichas, com a fonte que elas já citam. Nada de número novo:
 *   - ranking das matrículas de 2024: só as fichas com contexto.matriculas_2024 E
 *     contexto.posicao_ranking_matriculas (o total do curso, o mesmo critério para todas);
 *     número só do presencial ou só da EAD não entra, porque não se compara com o total;
 *   - o nome do curso é o do Censo quando a ficha tem contexto.curso_censo (Sistemas: "Sistemas de Informação");
 *   - por profissão: a média de contratação do cargo principal, os anos da graduação e as matrículas.
 *
 * Uso: node scripts/gerar-numeros-profissoes.mjs            grava
 *      node scripts/gerar-numeros-profissoes.mjs --conferir  só confere (sai com 1 se estiver desatualizado)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = 'data/profissoes';
const SAIDA = join(PASTA, 'numeros.json');
const ler = (a) => JSON.parse(readFileSync(a, 'utf8'));
const indice = ler(join(PASTA, 'indice.json'));

const ranking = [], profissoes = {}, avisos = [];
let fonteRanking = null;
for (const p of indice.profissoes) {
  if (!p.arquivo || !existsSync(join(PASTA, p.arquivo))) continue;
  const f = ler(join(PASTA, p.arquivo));
  const ctx = f.contexto || {};
  const media = ((f.secoes && f.secoes.quanto_ganha && f.secoes.quanto_ganha.medias) || [])[0];
  const grad = ((f.formacao && f.formacao.etapas) || []).find((e) => e.tipo === 'principal');
  profissoes[f.id] = {
    nome: f.nome,
    area: f.area,
    salario: media ? { cargo: media.cargo, media: Math.round(media.valor), fontes: media.fontes } : null,
    graduacao_anos: grad ? grad.anos_de : null,
    matriculas_2024: ctx.posicao_ranking_matriculas ? ctx.matriculas_2024 : null,
  };
  if (ctx.matriculas_2024 && ctx.posicao_ranking_matriculas) {
    const fo = (f.fontes || []).find((x) => (ctx.fontes || []).includes(x.id));
    if (!fo) { avisos.push(`${f.id}: contexto sem fonte`); continue; }
    if (fonteRanking && fonteRanking.url !== fo.url) avisos.push(`${f.id}: a fonte das matrículas (${fo.url}) é diferente da das outras fichas (${fonteRanking.url})`);
    fonteRanking = fonteRanking || { id: fo.id, orgao: fo.orgao.replace(/\s*\(.*\)$/, ''), url: fo.url };
    ranking.push({ id: f.id, nome: ctx.curso_censo || f.nome, matriculas: ctx.matriculas_2024, posicao: ctx.posicao_ranking_matriculas });
  }
}
ranking.sort((a, b) => a.posicao - b.posicao);
ranking.forEach((r, i) => { if (r.posicao !== i + 1) avisos.push(`ranking das matrículas: falta a posição ${i + 1} (veio ${r.nome} na ${r.posicao}ª)`); });
for (let i = 1; i < ranking.length; i++) if (ranking[i].matriculas > ranking[i - 1].matriculas) avisos.push(`ranking das matrículas: ${ranking[i].nome} tem mais matrículas que ${ranking[i - 1].nome}, mas vem depois`);

const dados = {
  aviso: 'Gerado por scripts/gerar-numeros-profissoes.mjs a partir das fichas. Não edite à mão: mude a ficha e rode o script.',
  matriculas_2024: ranking.length ? { titulo: 'Os cursos com mais matrículas no Brasil em 2024', fonte: fonteRanking, itens: ranking } : null,
  profissoes,
};
const texto = JSON.stringify(dados, null, 2) + '\n';

avisos.forEach((a) => console.log('AVISO: ' + a));
if (process.argv.includes('--conferir')) {
  const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
  if (atual !== texto) { console.error(`${SAIDA} está desatualizado: rode node scripts/gerar-numeros-profissoes.mjs`); process.exit(1); }
  console.log(`${SAIDA} em dia.`);
} else {
  writeFileSync(SAIDA, texto);
  console.log(`${SAIDA}: ${ranking.length} cursos no ranking das matrículas, ${Object.keys(profissoes).length} profissões.`);
}

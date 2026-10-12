#!/usr/bin/env node
/*
 * montar-radiologia.mjs — monta um curso de Radiologia (fases sem módulo, sem numeração de aula,
 * com "profundidade" em metros) a partir do formato .aula de montar-aulas.mjs.
 *
 * Por que existe: os cursos de Radiologia seguem o formato do Digestivo e do Musculoesquelético
 * (9 a 12 fases livres, sem variantes), e não o dos cursos do Enem por matéria (módulos e "Aula N").
 * O texto é o mesmo .aula; este script só troca o acabamento:
 *   - "modulo:" não é obrigatório e não vai para o JSON;
 *   - "descricao:" e "profundidade:" de cada fase vêm de linhas "% descricao: ..." e "% profundidade: ..."
 *     logo depois do "@@ aula" (o leitor do .aula ignora as linhas que começam com "%");
 *   - não há variantes nem numeração.
 *
 * Uso: node scripts/montar-radiologia.mjs <arquivo.aula> [...] --curso data/trilhas/radiologia-<area>.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { lerAulas, aplicarAulas } from './montar-aulas.mjs';
import { atualizarCatalogo } from './gerar-catalogo.mjs';

const args = process.argv.slice(2);
const ic = args.indexOf('--curso');
if (ic < 0 || !args[ic + 1]) { console.log('Uso: node scripts/montar-radiologia.mjs <arquivo.aula> [...] --curso data/trilhas/<curso>.json'); process.exit(2); }
const caminho = resolve(args[ic + 1]);
const arquivos = args.filter((_, i) => i !== ic && i !== ic + 1);
if (!existsSync(caminho)) { console.error(`Curso não encontrado: ${caminho} (crie o cabeçalho primeiro)`); process.exit(1); }
const trilha = JSON.parse(readFileSync(caminho, 'utf8'));

try {
  for (const arq of arquivos) {
    const bruto = readFileSync(arq, 'utf8');
    // metadados de fase em linhas "% chave: valor" (o leitor do .aula não as conhece)
    const extras = {};
    let atual = null;
    const limpo = bruto.split(/\r?\n/).map((l) => {
      const a = l.match(/^@@ aula\s+(\S+)/);
      if (a) { atual = a[1]; extras[atual] = {}; return `${l}\nmodulo: -`; }
      const m = l.match(/^%\s*(descricao|profundidade):\s*(.+)$/);
      if (m) { if (!atual) throw new Error(`${basename(arq)}: "${l}" antes de "@@ aula"`); extras[atual][m[1]] = m[2].trim(); return ''; }
      return l;
    }).join('\n');
    const lido = lerAulas(limpo, basename(arq));
    aplicarAulas(trilha, lido, basename(arq));
    for (const f of trilha.fases) {
      if (!extras[f.id]) continue;
      const { resumo } = f;
      delete f.modulo; delete f.resumo; delete f.descricao;
      if (!extras[f.id].descricao || !extras[f.id].profundidade) throw new Error(`${basename(arq)}: fase ${f.id} sem "% descricao:" ou "% profundidade:"`);
      Object.assign(f, { profundidade: extras[f.id].profundidade, descricao: extras[f.id].descricao, resumo });
    }
  }
} catch (e) { console.error('ERRO', e.message); process.exit(1); }

if (!trilha.variantes?.length) delete trilha.variantes;
writeFileSync(caminho, `${JSON.stringify(trilha, null, 2)}\n`);
const pasta = dirname(caminho);
const indice = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8'));
if (!indice.includes(basename(caminho))) { indice.push(basename(caminho)); writeFileSync(join(pasta, 'indice.json'), `${JSON.stringify(indice, null, 2)}\n`); console.log('Curso acrescentado ao indice.json.'); }
atualizarCatalogo(pasta);
console.log(`${basename(caminho)}: ${trilha.fases.length} fases, ${trilha.questoes.length} questões, ${Object.keys(trilha.fichas).length} fichas.`);

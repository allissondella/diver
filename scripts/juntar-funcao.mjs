#!/usr/bin/env node
/*
 * juntar-funcao.mjs — gera a Edge Function "mergulho-triplo" em UM arquivo só, para colar no painel
 * do Supabase (Edge Functions → Deploy a new function → Via Editor), sem precisar de terminal.
 *
 * Junta, nesta ordem: _shared/mergulho-nucleo.mjs, _shared/ias.mjs, _shared/processar-lote.mjs e
 * mergulho-triplo/index.ts (tirando os "import" entre eles e os "export"). O código é o mesmo da pasta
 * supabase/functions/: quem muda a função muda lá e roda este script de novo.
 *
 * Uso:
 *   node scripts/juntar-funcao.mjs             gera supabase/painel/mergulho-triplo.ts
 *   node scripts/juntar-funcao.mjs --conferir  só confere se o arquivo gerado está em dia (erro se não estiver)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './lib/config.mjs';

const PASTA = join(RAIZ, 'supabase', 'functions');
const PARTES = ['_shared/mergulho-nucleo.mjs', '_shared/ias.mjs', '_shared/processar-lote.mjs', 'mergulho-triplo/index.ts'];
export const DESTINO = join(RAIZ, 'supabase', 'painel', 'mergulho-triplo.ts');

export function juntar() {
  const externos = [];
  const corpo = PARTES.map((parte) => {
    const texto = readFileSync(join(PASTA, parte), 'utf8')
      .replace(/^import\s+[^\n]+from\s+'(jsr|npm|https?):[^']+';\n/gm, (linha) => { externos.push(linha.trim()); return ''; }) // vão para o topo
      .replace(/^import\s+\{[^}]*\}\s+from\s+'\.\.?\/[^']+';\n/gm, '') // imports entre as partes (o conteúdo já está aqui)
      .replace(/^export\s+(?=(async\s+)?(function|const|class|let)\b)/gm, '');
    if (/^import .* from '\.\.?\//m.test(texto)) throw new Error(`${parte}: sobrou um import local que este script não sabe juntar`);
    return `// ═══════════ ${parte} ═══════════\n${texto.trim()}\n`;
  }).join('\n');
  return `// @ts-nocheck
/*
 * ARQUIVO GERADO por scripts/juntar-funcao.mjs — não edite aqui; edite supabase/functions/ e gere de novo.
 * Edge Function "mergulho-triplo" num arquivo só, para colar no painel do Supabase:
 * Edge Functions → Deploy a new function → Via Editor → nome: mergulho-triplo → apague o exemplo,
 * cole TODO este arquivo → Deploy. Deixe "Verify JWT" ligado. Guia: docs/MOTOR_DIVER.md, seção 11.6.
 * Chaves: GEMINI_API_KEY e OPENAI_API_KEY só nos Secrets das Edge Functions (Deno.env.get).
 */
${externos.join('\n')}

${corpo}`;
}

if (process.argv[1] && process.argv[1].endsWith('juntar-funcao.mjs')) {
  const novo = juntar();
  if (process.argv.includes('--conferir')) {
    const atual = existsSync(DESTINO) ? readFileSync(DESTINO, 'utf8') : '';
    if (atual !== novo) {
      console.error('supabase/painel/mergulho-triplo.ts está desatualizado: rode node scripts/juntar-funcao.mjs');
      process.exitCode = 1;
    } else console.log('supabase/painel/mergulho-triplo.ts em dia.');
  } else {
    writeFileSync(DESTINO, novo);
    console.log(`Gerado: supabase/painel/mergulho-triplo.ts (${novo.split('\n').length} linhas). Cole no painel do Supabase.`);
  }
}

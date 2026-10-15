#!/usr/bin/env node
/*
 * auditar-design.mjs — confere se o CSS do Diver só usa o sistema de tokens (css/tokens.css).
 * Falha (código de saída 1) se encontrar:
 *   - cor em hexadecimal fora de css/tokens.css (nos CSS e nos JS que desenham com cores: tutorial, Caso Resolvido, Tiro ao Alvo);
 *   - font-size que não seja um token da escala (--t-xs … --t-display), 0 ou inherit; font: com tamanho numérico;
 *   - z-index numérico (só var(--z-*) ou calc com ele);
 *   - @media com largura fora dos 4 cortes (sm 480 · md 768 · lg 1024 · xl 1280).
 * Uso: node scripts/auditar-design.mjs          (regras em docs/DESIGN.md, "Como auditar")
 */
import { readFileSync, readdirSync } from 'node:fs';

const CSS = readdirSync('css').filter((f) => f.endsWith('.css')).map((f) => 'css/' + f);
const JS_COM_COR = ['js/tutorial.js', 'js/jogos/caso-resolvido.js', 'js/descompressao/tiro.js'];
const LARGURAS = new Set([479, 480, 767, 768, 1023, 1024, 1279, 1280]);
const erros = [];
const erro = (arquivo, linha, msg) => erros.push(`${arquivo}:${linha}  ${msg}`);

const linhas = (txt) => txt.split('\n');

for (const f of CSS) {
  const txt = readFileSync(f, 'utf8');
  linhas(txt).forEach((l, i) => {
    const n = i + 1;
    if (f !== 'css/tokens.css') {
      for (const m of l.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        // ids de seletor (#tela-x) não são cor: cor tem só dígitos hex e vem depois de ":" ou "," ou "(" ou espaço
        const antes = l[m.index - 1] || ' ';
        if (/[\s:,(]/.test(antes) && !/^#[0-9a-fA-F]{3,8}-/.test(l.slice(m.index))) erro(f, n, `cor solta ${m[0]} (use um token de css/tokens.css)`);
      }
    }
    for (const m of l.matchAll(/font-size:\s*([^;}]+)/g)) {
      const v = m[1].trim().replace(/\s*!important$/, '');
      if (!/^var\(--t-(xs|sm|md|lg|xl|2xl|3xl|display)\)$/.test(v) && v !== '0' && v !== 'inherit') erro(f, n, `font-size fora da escala: ${v}`);
    }
    for (const m of l.matchAll(/(?:^|[\s;{])font:\s*([^;}]+)/g)) {
      if (/\d(rem|em|px)\b/.test(m[1])) erro(f, n, `font: com tamanho numérico (${m[1].trim()})`);
    }
    for (const m of l.matchAll(/z-index:\s*([^;}]+)/g)) {
      const v = m[1].trim();
      if (!/^(var\(--z-[a-z0-9-]+\)|calc\(var\(--z-[a-z0-9-]+\)\s*[-+]\s*\d+\)|auto)$/.test(v)) erro(f, n, `z-index solto: ${v}`);
    }
    for (const m of l.matchAll(/@media[^{]*?\((?:min|max)-width:\s*(\d+)px\)/g)) {
      if (!LARGURAS.has(Number(m[1]))) erro(f, n, `@media com largura fora dos 4 cortes: ${m[1]}px`);
    }
  });
}

for (const f of JS_COM_COR) {
  const txt = readFileSync(f, 'utf8');
  linhas(txt).forEach((l, i) => {
    for (const m of l.matchAll(/#[0-9a-fA-F]{6}\b/g)) erro(f, i + 1, `cor solta ${m[0]} (use UI.cor('token'))`);
  });
}

if (erros.length) {
  console.log(`Auditoria de design: ${erros.length} problema(s)\n`);
  erros.forEach((e) => console.log('  ' + e));
  process.exit(1);
}
console.log(`Auditoria de design: OK (${CSS.length} arquivos CSS e ${JS_COM_COR.length} JS conferidos; nenhum hex solto, font-size fora da escala, z-index numérico ou @media fora dos 4 cortes).`);

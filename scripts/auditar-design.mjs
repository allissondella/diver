#!/usr/bin/env node
/*
 * auditar-design.mjs — confere se o CSS do Diver só usa o sistema de tokens (css/tokens.css).
 * Falha (código de saída 1) se encontrar:
 *   - cor em hexadecimal fora de css/tokens.css (nos CSS e nos JS que desenham com cores: tutorial, Caso Resolvido, Tiro ao Alvo);
 *   - font-size que não seja um token da escala (--t-xs … --t-display), 0 ou inherit; font: com tamanho numérico;
 *   - z-index numérico (só var(--z-*) ou calc com ele);
 *   - @media com largura fora dos 4 cortes (sm 480 · md 768 · lg 1024 · xl 1280);
 *   - docs/componentes.html desatualizado (scripts/gerar-componentes.mjs --conferir).
 * Uso: node scripts/auditar-design.mjs          (regras em docs/DESIGN.md, "Como auditar")
 *
 * Com --navegador (Onda 4), também abre o app no Chromium (Playwright) num servidor local e, em cada tela,
 * nas larguras 360, 390, 430, 768, 1024, 1280 e 1440 px, falha se encontrar:
 *   - transbordo horizontal (scrollWidth > clientWidth);
 *   - alvo de toque menor que 44 × 44 px no celular (até 768 px, com toque): button, a, [role=button], input, select, summary;
 *   - texto com font-size computado menor que 12 px.
 *   node scripts/auditar-design.mjs --navegador [--porta 8124] [--larguras 390,1440] [--telas inicio,perfil]
 *   (servidor: python3 -m http.server 8124 --bind 127.0.0.1 na raiz; Playwright global: NODE_PATH=$(npm root -g))
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

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

// O catálogo vivo (docs/componentes.html) acompanha os tokens, o sprite e o mascote (Onda 7)
try {
  execSync('node scripts/gerar-componentes.mjs --conferir', { stdio: 'pipe' });
} catch {
  erros.push('docs/componentes.html desatualizado: rode node scripts/gerar-componentes.mjs');
}

if (process.argv.includes('--navegador')) await auditarNoNavegador();

if (erros.length) {
  console.log(`Auditoria de design: ${erros.length} problema(s)\n`);
  erros.forEach((e) => console.log('  ' + e));
  process.exit(1);
}
console.log(`Auditoria de design: OK (${CSS.length} arquivos CSS e ${JS_COM_COR.length} JS conferidos; nenhum hex solto, font-size fora da escala, z-index numérico ou @media fora dos 4 cortes${process.argv.includes('--navegador') ? '; no navegador: nenhum transbordo, alvo de toque < 44 px ou texto < 12 px' : ''}).`);

/* ---------- Auditoria no navegador (Onda 4) ---------- */
async function auditarNoNavegador() {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); } catch {
    ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright'));
  }
  const arg = (nome, padrao) => { const i = process.argv.indexOf('--' + nome); return i > 0 ? process.argv[i + 1] : padrao; };
  const base = `http://127.0.0.1:${arg('porta', '8124')}/`;
  const larguras = arg('larguras', '360,390,430,768,1024,1280,1440').split(',').map(Number);
  const soTelas = arg('telas', '') ? arg('telas', '').split(',') : null;
  const TELAS = ['inicio', 'sala-enem', 'sala-ensino-medio', 'sala-tecnologia', 'sala-radiologia', 'mergulho', 'artigo', 'quiz', 'quiz-feedback',
    'simulado', 'revisao', 'jogos', 'prova', 'upload-prova', 'tarefas', 'calendario', 'cronograma', 'diagnostica', 'mapa-partida', 'foco',
    'cursos', 'pdfs', 'perfil', 'estatisticas', 'descompressao',
    'profissoes', 'profissoes-cartas', 'profissoes-metodo', 'profissao-enfermagem', 'profissao-enfermagem-dia', 'profissao-enfermagem-mitos', 'profissao-pedagogia', 'profissao-sistemas', 'profissao-medicina', 'profissao-direito-dia', 'profissoes-comparar',
    'profissoes-tecnologia', 'tecnologia-seguranca', 'profissoes-tecnologia-jogo', 'login'].filter((t) => !soTelas || soTelas.includes(t));
  const vistos = {};
  ['inicio', 'sala', 'sala-enem', 'sala-ensino-medio', 'sala-tecnologia', 'sala-radiologia', 'mergulho', 'trilha', 'quiz', 'artigo', 'resumo', 'simulado', 'revisao', 'jogos', 'tarefas', 'quadros',
    'calendario', 'cronograma', 'foco', 'perfil', 'estatisticas', 'descompressao', 'diagnostica', 'mapa-partida', 'prova', 'pdfs', 'cursos', 'upload-prova', 'profissoes'].forEach((k) => { vistos[k] = 99; });

  /* O que medir numa tela (roda dentro da página) */
  const medir = ({ toque }) => {
    const visivel = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
      if (el.closest('[hidden], .visualmente-oculto, [inert]')) return false;
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return false;
      return true;
    };
    const nome = (el) => {
      const id = el.id ? '#' + el.id : '';
      const cl = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      const txt = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      return `${el.tagName.toLowerCase()}${id}${cl}${txt ? ` "${txt}"` : ''}`;
    };
    const achados = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) {
      // quem passa da borda direita
      const largo = [...document.querySelectorAll('body *')].filter((el) => visivel(el) && el.getBoundingClientRect().right > doc.clientWidth + 1 && !el.closest('.qd, .tabela-rolagem, .caminho__lista, .cal-filtros, .status__numeros'))
        .slice(0, 3).map(nome).join(' | ');
      achados.push(`transbordo: scrollWidth ${doc.scrollWidth} > ${doc.clientWidth} (${largo})`);
    }
    if (toque) {
      const raiz = document.querySelector('dialog[open]') || document;
      for (const el of raiz.querySelectorAll('button, a[href], [role="button"], input:not([type="hidden"]), select, summary')) {
        if (!visivel(el)) continue;
        if (el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label')) continue; // o alvo é o rótulo inteiro
        if (el.tagName === 'A' && el.closest('p, li') && getComputedStyle(el).display === 'inline') continue; // link no meio do texto (exceção da WCAG)
        if (el.tagName === 'A' && el.closest('sup') && getComputedStyle(el).display === 'inline') continue; // notinha de fonte [1] no meio do texto (Mapa das Profissões)
        if (el.closest('.lateral') && !document.querySelector('.lateral--aberta')) continue; // gaveta fechada
        const r = el.getBoundingClientRect();
        if (r.width < 43.5 || r.height < 43.5) achados.push(`alvo pequeno ${Math.round(r.width)}×${Math.round(r.height)}: ${nome(el)}`);
      }
    }
    const raizTexto = document.querySelector('dialog[open]') || document.body;
    const walker = document.createTreeWalker(raizTexto, NodeFilter.SHOW_TEXT);
    const pequenos = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode;
      if (!t.textContent.trim()) continue;
      const el = t.parentElement;
      if (!el || el.closest('svg, script, style, noscript, canvas') || !visivel(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs > 0 && fs < 11.95) pequenos.add(`texto ${fs}px: ${nome(el)}`);
    }
    achados.push(...pequenos);
    return achados;
  };

  const navegador = await chromium.launch();
  const resultado = new Map(); // achado -> larguras/telas
  for (const larg of larguras) {
    const toque = larg <= 768;
    const ctx = await navegador.newContext({ viewport: { width: larg, height: larg <= 768 ? 844 : 900 }, isMobile: toque, hasTouch: toque, reducedMotion: 'reduce' });
    await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.DIVER_CONFIG = { supabaseUrl: '', supabaseChave: '' };" }));
    await ctx.addInitScript((v) => {
      try {
        localStorage.setItem('diver:v1:tutorial', JSON.stringify({ vistos: v }));
        localStorage.setItem('diver:v1:aviso-cronograma', JSON.stringify({ enem: '2026-01-01', 'ensino-medio': '2026-01-01' }));
      } catch {}
    }, vistos);
    const p = await ctx.newPage();
    const errosPagina = [];
    p.on('pageerror', (e) => errosPagina.push(e.message));
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
    const limpar = async () => {
      for (let i = 0; i < 3; i++) {
        if (await p.locator('#tour').count()) { await p.keyboard.press('Escape'); await esperar(120); }
        const d = p.locator('dialog.dialogo--confirmar[open] button[value="nao"]');
        if (await d.count()) { await d.first().click(); await esperar(150); }
      }
    };
    const anotar = async (tela) => {
      for (const a of await p.evaluate(medir, { toque })) {
        const k = `${tela}: ${a}`;
        if (!resultado.has(k)) resultado.set(k, []);
        resultado.get(k).push(larg);
      }
    };
    await p.goto(`${base}?a=${Date.now()}#inicio`);
    await p.waitForSelector('.app', { state: 'attached' });
    await esperar(800); await limpar();
    await p.evaluate(() => App.abrirTrilha('enem-matematica'));
    await p.waitForSelector('#mapa-fases li[data-fase]', { timeout: 20000 });
    for (const tela of TELAS) {
      try {
        if (tela === 'login') continue; // abaixo, com um Supabase de mentira
        if (tela === 'artigo' || tela === 'quiz' || tela === 'quiz-feedback') {
          if (tela === 'artigo') {
            await p.evaluate(() => { location.hash = 'mergulho'; }); await esperar(600); await limpar();
            const li = p.locator('#mapa-fases li[data-fase]').first();
            await li.evaluate((el) => { const d = el.closest('details'); if (d) d.open = true; });
            await li.locator('.fase__estudo').click(); await esperar(500);
            await anotar(tela);
            await p.keyboard.press('Escape'); await esperar(300); await limpar();
          } else if (tela === 'quiz') {
            await p.evaluate(() => { location.hash = 'mergulho'; }); await esperar(500); await limpar();
            const li = p.locator('#mapa-fases li[data-fase]').first();
            await li.evaluate((el) => { const d = el.closest('details'); if (d) d.open = true; });
            await li.locator('.fase').first().click(); await esperar(900); await limpar();
            await anotar(tela);
          } else {
            const alt = p.locator('#quiz-alternativas .alternativa').first();
            if (await alt.count()) { await alt.click(); await esperar(500); await anotar(tela); }
            await p.locator('#btn-sair-quiz').click().catch(() => {}); await esperar(300); await limpar();
          }
          continue;
        }
        // cada tela abre do zero (sem sobra de quiz, caixa ou gaveta da tela anterior)
        await p.goto(`${base}?a=${Date.now()}#${tela}`); await p.waitForSelector('.app', { state: 'attached' });
        await esperar(tela.startsWith('sala') || tela === 'descompressao' || /^(profiss|tecnologia-)/.test(tela) ? 1000 : 700); await limpar();
        const id = tela.startsWith('sala-') ? 'tela-sala' : tela === 'mergulho' ? 'tela-painel' : /^(profiss|tecnologia-)/.test(tela) ? 'tela-profissoes' : 'tela-' + tela;
        if (await p.locator(`#${id}[hidden]`).count()) {
          await p.evaluate(() => App.abrirTrilha('enem-matematica')); await esperar(500);
          await p.evaluate((h) => { location.hash = h; }, tela); await esperar(700); await limpar();
        }
        if (await p.locator(`#${id}[hidden]`).count()) throw new Error(`a tela #${id} não apareceu`);
        await anotar(tela);
      } catch (e) { resultado.set(`${tela}: não deu para abrir (${e.message.split('\n')[0]})`, [larg]); }
    }
    if (!soTelas || soTelas.includes('login')) {
      const pl = await ctx.newPage();
      await pl.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.DIVER_CONFIG = { supabaseUrl: 'https://exemplo.supabase.co', supabaseChave: 'anon-de-mentira', ambiente: 'testes' };" }));
      await pl.route('https://exemplo.supabase.co/**', (r) => r.abort());
      await pl.goto(`${base}?a=${Date.now()}#inicio`);
      for (let i = 0; i < 20; i++) { if (await pl.locator('#login-email').count()) break; await esperar(300); }
      for (const a of await pl.evaluate(medir, { toque })) {
        const k = `login: ${a}`;
        if (!resultado.has(k)) resultado.set(k, []);
        resultado.get(k).push(larg);
      }
      await pl.close();
    }
    errosPagina.forEach((m) => { const k = `erro de página: ${m}`; if (!resultado.has(k)) resultado.set(k, []); resultado.get(k).push(larg); });
    await ctx.close();
  }
  await navegador.close();
  for (const [k, ls] of resultado) erros.push(`[navegador ${[...new Set(ls)].join(',')}] ${k}`);
}

#!/usr/bin/env node
/*
 * fotos-design.mjs — fotografa as telas do Diver no celular (390×844) e no computador (1440×900)
 * para comparar o antes e o depois de uma onda da revisão de design (docs/REVISAO_DESIGN.md).
 *
 * Uso:
 *   node scripts/fotos-design.mjs --onda onda-1 --fase antes [--porta 8765] [--telas inicio,quiz] [--png]
 *
 * Precisa de um servidor local servindo a raiz do repositório (ex.: python3 -m http.server 8765)
 * e do Playwright instalado (global: NODE_PATH=$(npm root -g)). Roda no modo local: o js/config.js
 * é trocado por um vazio, então nada de login nem de dados de aluno. As fotos vão para
 * docs/fotos/design/<onda>/<fase>/<tela>-<celular|computador>.jpg (JPEG 1×, leve para o repositório;
 * com --png, PNG em alta resolução).
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright'));
}

const arg = (nome, padrao) => { const i = process.argv.indexOf('--' + nome); return i > 0 ? process.argv[i + 1] : padrao; };
const onda = arg('onda', 'onda-1');
const fase = arg('fase', 'antes');
const porta = arg('porta', '8765');
const soTelas = arg('telas', '') ? arg('telas', '').split(',') : null;
const png = process.argv.includes('--png');
const base = `http://127.0.0.1:${porta}/`;
const pasta = `docs/fotos/design/${onda}/${fase}`;
mkdirSync(pasta, { recursive: true });

const APARELHOS = [
  { nome: 'celular', viewport: { width: 390, height: 844 }, deviceScaleFactor: png ? 2 : 1, isMobile: true, hasTouch: true },
  { nome: 'computador', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fecha a caixa do Diver e o tutorial, se estiverem abertos. */
async function limparTela(p) {
  for (let i = 0; i < 4; i++) {
    const tour = p.locator('#tour');
    if (await tour.count()) { await p.keyboard.press('Escape'); await esperar(150); }
    const d = p.locator('dialog.dialogo--confirmar[open] button[value="nao"]');
    if (await d.count()) { await d.first().click(); await esperar(200); }
  }
}

async function ir(p, hash) {
  await p.goto(`${base}?f=${Date.now()}#${hash}`);
  await p.waitForSelector('.app', { state: 'attached' });
  await esperar(900);
  await limparTela(p);
}

/* Cada tela: nome do arquivo e como chegar lá. As de quiz são encadeadas (artigo → quiz → feedback → resumo). */
const TELAS = [
  { nome: 'inicio', async ir(p) { await ir(p, 'inicio'); await p.waitForSelector('#lista-salas .sala-porta'); } },
  { nome: 'sala', async ir(p) { await ir(p, 'sala-enem'); await p.waitForSelector('#sala-conteudo .trilha'); await esperar(400); await limparTela(p); } },
  { nome: 'mapa', async ir(p) { await ir(p, 'inicio'); await p.evaluate(() => App.abrirTrilha('enem-matematica')); await p.waitForSelector('#mapa-fases li[data-fase]', { timeout: 20000 }); await esperar(500); await limparTela(p); } },
  { nome: 'simulado', async ir(p) { await ir(p, 'simulado'); } },
  { nome: 'revisao', async ir(p) { await ir(p, 'revisao'); } },
  { nome: 'jogos', async ir(p) { await ir(p, 'jogos'); } },
  { nome: 'tarefas', async ir(p) { await ir(p, 'tarefas'); } },
  { nome: 'calendario', async ir(p) { await ir(p, 'calendario'); } },
  { nome: 'cronograma', async ir(p) { await ir(p, 'cronograma'); } },
  { nome: 'foco', async ir(p) { await ir(p, 'foco'); } },
  { nome: 'perfil', async ir(p) { await ir(p, 'perfil'); } },
  { nome: 'estatisticas', async ir(p) { await ir(p, 'estatisticas'); } },
  { nome: 'descompressao', async ir(p) { await ir(p, 'descompressao'); await esperar(800); await limparTela(p); } },
];

/** Artigo → quiz (antes e depois de responder) → resumo, numa sequência só. */
async function sequenciaQuiz(p, aparelho, foto) {
  await ir(p, 'inicio');
  await p.evaluate(() => App.abrirTrilha('enem-matematica'));
  await p.waitForSelector('#mapa-fases li[data-fase]', { timeout: 20000 });
  const li = p.locator('#mapa-fases li[data-fase]').first();
  await li.evaluate((el) => { const d = el.closest('details'); if (d) d.open = true; });
  await li.locator('.fase__estudo').click();
  await esperar(900);
  await foto('artigo');
  await p.keyboard.press('Escape'); await esperar(400); await limparTela(p);
  await li.locator('.fase').click();
  await esperar(1400); await limparTela(p);
  await foto('quiz-antes');
  await p.locator('#quiz-alternativas .alternativa').first().click();
  await esperar(700);
  await foto('quiz-depois');
  for (let i = 0; i < 14; i++) {
    if (!(await p.locator('#tela-quiz:not([hidden])').count())) break;
    const bt = p.locator('#btn-continuar');
    if (await bt.isVisible()) await bt.click();
    await esperar(150);
    const livre = p.locator('#quiz-alternativas .alternativa:not([disabled])');
    if (await livre.count()) await livre.first().click();
    await esperar(150);
  }
  await p.waitForSelector('#tela-resumo:not([hidden])', { timeout: 10000 });
  await esperar(1200); await limparTela(p);
  await foto('resumo');
}

/** Tela de login: liga um Supabase de mentira só para a página de entrar aparecer (a rede é bloqueada). */
async function telaLogin(ctx, foto) {
  const p = await ctx.newPage();
  await p.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.DIVER_CONFIG = { supabaseUrl: 'https://exemplo.supabase.co', supabaseChave: 'anon-de-mentira', ambiente: 'testes' };" }));
  await p.route('https://exemplo.supabase.co/**', (r) => r.abort());
  await p.goto(`${base}?f=${Date.now()}#inicio`);
  for (let i = 0; i < 20; i++) { if (await p.locator('#login-email').count()) break; await esperar(300); }
  await esperar(400);
  await foto('login', p);
  await p.close();
}

(async () => {
  const navegador = await chromium.launch();
  const falhas = [];
  for (const ap of APARELHOS) {
    const ctx = await navegador.newContext({ viewport: ap.viewport, deviceScaleFactor: ap.deviceScaleFactor, isMobile: !!ap.isMobile, hasTouch: !!ap.hasTouch, reducedMotion: 'reduce' });
    await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.DIVER_CONFIG = { supabaseUrl: '', supabaseChave: '' };" }));
    await ctx.addInitScript(() => {
      try {
        const vistos = {};
        ['inicio', 'sala', 'sala-enem', 'sala-ensino-medio', 'mergulho', 'trilha', 'quiz', 'artigo', 'resumo', 'simulado', 'revisao', 'jogos', 'tarefas', 'quadros', 'calendario', 'cronograma', 'foco', 'perfil', 'estatisticas', 'descompressao', 'diagnostica', 'mapa-partida', 'prova', 'pdfs', 'cursos'].forEach((k) => { vistos[k] = 99; });
        localStorage.setItem('diver:v1:tutorial', JSON.stringify({ vistos }));
        localStorage.setItem('diver:v1:aviso-cronograma', JSON.stringify({ enem: '2026-01-01', 'ensino-medio': '2026-01-01' })); // o convite da sala do Enem não cobre a foto
      } catch {}
    });
    const p = await ctx.newPage();
    const foto = async (nome, pagina = p) => {
      const arquivo = `${pasta}/${nome}-${ap.nome}.${png ? 'png' : 'jpg'}`;
      await pagina.screenshot(png ? { path: arquivo, fullPage: true } : { path: arquivo, fullPage: true, type: 'jpeg', quality: 72 });
      console.log('  foto:', arquivo);
    };
    console.log(`\n== ${ap.nome} (${ap.viewport.width}×${ap.viewport.height})`);
    for (const t of TELAS) {
      if (soTelas && !soTelas.includes(t.nome)) continue;
      try { await t.ir(p); await foto(t.nome); } catch (e) { falhas.push(`${t.nome}/${ap.nome}: ${e.message.split('\n')[0]}`); }
    }
    if (!soTelas || soTelas.includes('quiz')) {
      try { await sequenciaQuiz(p, ap, foto); } catch (e) { falhas.push(`quiz/${ap.nome}: ${e.message.split('\n')[0]}`); }
    }
    if (!soTelas || soTelas.includes('login')) {
      try { await telaLogin(ctx, foto); } catch (e) { falhas.push(`login/${ap.nome}: ${e.message.split('\n')[0]}`); }
    }
    await ctx.close();
  }
  await navegador.close();
  if (falhas.length) { console.log('\nTelas que não deu para fotografar:'); falhas.forEach((f) => console.log('  -', f)); }
  console.log(`\nPronto: ${pasta}`);
})();

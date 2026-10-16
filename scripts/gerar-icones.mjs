#!/usr/bin/env node
/*
 * gerar-icones.mjs — desenha os ícones do app (PWA) e a imagem de compartilhamento (og:image) com o Chromium.
 * Fonte: assets/icones/diver-mascara.svg (a máscara do Diver, a mesma do ícone da aba) e assets/mascote/diver.svg.
 * Saída: assets/icones/icone-192.png, icone-512.png, icone-maskable-512.png, apple-touch-icon.png (180) e assets/og.png (1200 × 630).
 * Uso: NODE_PATH=$(npm root -g) node scripts/gerar-icones.mjs   (rode de novo só se o desenho mudar)
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright'));
}
const mascara = readFileSync('assets/icones/diver-mascara.svg', 'utf8');
const mascote = readFileSync('assets/mascote/diver.svg', 'utf8');
const fundo = '#0B2545';

const icone = (tam, { maskable = false } = {}) => `<!doctype html><html><body style="margin:0;background:${maskable ? fundo : 'transparent'}">
  <div style="width:${tam}px;height:${tam}px;display:grid;place-items:center">
    <div style="width:${maskable ? Math.round(tam * 0.8) : tam}px;height:${maskable ? Math.round(tam * 0.8) : tam}px">${mascara.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
  </div></body></html>`;

const og = `<!doctype html><html><body style="margin:0">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:72px 96px;display:flex;align-items:center;gap:72px;
    background:linear-gradient(160deg,#0B2545 0%,#0A2140 55%,#06172D 100%);font-family:'Plus Jakarta Sans','DejaVu Sans',sans-serif;color:#E6F1FF">
    <div style="width:380px;flex:none">${mascote.replace('<svg ', '<svg width="100%" ')}</div>
    <div>
      <div style="font-size:132px;font-weight:800;letter-spacing:-3px;color:#5EEAD4;line-height:1">Diver</div>
      <div style="margin-top:28px;font-size:46px;font-weight:700;line-height:1.2">Mergulhe. Acerte.<br>Suba de nível.</div>
      <div style="margin-top:28px;font-size:30px;color:#A9BCD6">Plataforma de estudos gamificada</div>
    </div>
  </div></body></html>`;

const navegador = await chromium.launch();
const p = await navegador.newPage();
const foto = async (html, w, h, arquivo, transparente) => {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(html);
  await p.screenshot({ path: arquivo, omitBackground: !!transparente, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('  ', arquivo);
};
await foto(icone(192), 192, 192, 'assets/icones/icone-192.png', true);
await foto(icone(512), 512, 512, 'assets/icones/icone-512.png', true);
await foto(icone(512, { maskable: true }), 512, 512, 'assets/icones/icone-maskable-512.png');
await foto(icone(180, { maskable: true }), 180, 180, 'assets/icones/apple-touch-icon.png');
await foto(og, 1200, 630, 'assets/og.png');
await navegador.close();

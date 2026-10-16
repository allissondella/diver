#!/usr/bin/env node
/*
 * gerar-componentes.mjs — gera docs/componentes.html, o "catálogo vivo" do design do Diver (Onda 7).
 *
 * Uma página só, aberta direto no navegador (funciona com file://), que usa os CSS de verdade do app
 * (../css/*.css) e mostra: todos os tokens (cores com o contraste calculado contra o fundo), a escala
 * de texto, espaços, raios, sombras, botões em todos os estados, campos, cartões, tags, barras, toast,
 * esqueleto, todos os ícones do sprite (com o nome) e o mascote nas 4 expressões.
 *
 * O sprite de ícones e o molde do mascote são copiados do index.html e os tokens são lidos do
 * css/tokens.css: rode de novo sempre que um deles mudar. Peça nova entra aqui primeiro.
 *
 * Uso: node scripts/gerar-componentes.mjs            grava docs/componentes.html
 *      node scripts/gerar-componentes.mjs --conferir  só confere (sai com 1 se estiver desatualizado)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SAIDA = 'docs/componentes.html';
const tokensCss = readFileSync('css/tokens.css', 'utf8');
const indice = readFileSync('index.html', 'utf8');

/* ---------- Tokens: só o primeiro :root (o do computador redefine os papéis de ritmo) ---------- */
const raiz = tokensCss.slice(tokensCss.indexOf(':root {'), tokensCss.indexOf('\n}', tokensCss.indexOf(':root {')));
const tokens = [];
let grupo = '';
for (const linha of raiz.split('\n')) {
  const g = /\/\* -+ (.+?) -+ \*\//.exec(linha);
  if (g) { grupo = g[1].replace(/\(.*?\)/g, '').replace(/:.*$/, '').trim(); continue; }
  const m = /^\s*--([a-z0-9-]+):\s*([^;]+);(?:\s*\/\*\s*(.*?)\s*\*\/)?/.exec(linha);
  if (m) tokens.push({ grupo, nome: m[1], valor: m[2].trim(), nota: m[3] || '' });
}
const porGrupo = (teste) => tokens.filter((t) => teste.test(t.grupo));
const valorDe = (nome) => (tokens.find((t) => t.nome === nome) || {}).valor;

/* ---------- Contraste (WCAG 2): cor sólida ou rgba sobre o fundo --fundo-1 ---------- */
const hexRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const fundo = hexRgb(valorDe('fundo-1'));
function rgbDe(valor) {
  if (/^#[0-9a-f]{3,8}$/i.test(valor)) return hexRgb(valor);
  const m = /^rgba?\(([^)]+)\)$/.exec(valor);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(',').map((x) => parseFloat(x));
  return [r, g, b].map((c, i) => Math.round(c * a + fundo[i] * (1 - a)));
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
const selo = (c) => (c >= 7 ? 'AAA' : c >= 4.5 ? 'AA' : c >= 3 ? 'AA grande' : 'decorativo');

/* ---------- Peças copiadas do index.html ---------- */
const iniSprite = indice.indexOf('<svg width="0" height="0"');
const sprite = indice.slice(iniSprite, indice.indexOf('</svg>', indice.lastIndexOf('</symbol>')) + 6);
const icones = [...sprite.matchAll(/<symbol id="([a-z0-9-]+)"/g)].map((m) => m[1]);
const molde = /<template id="molde-mascote">([\s\S]*?)<\/template>/.exec(indice)[1].trim();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const icone = (id) => `<svg class="icone" aria-hidden="true"><use href="#${id}"/></svg>`;
const secao = (id, titulo, sub, corpo) => `
    <section class="vc-secao" id="${id}" aria-labelledby="${id}-t">
      <h2 class="secao-titulo" id="${id}-t">${titulo}</h2>
      ${sub ? `<p class="secao-sub">${sub}</p>` : ''}
      ${corpo}
    </section>`;

/* ---------- Seções ---------- */
const cores = tokens.filter((t) => /cor/i.test(t.grupo) && !/apelido|antigos/i.test(t.grupo) && rgbDe(t.valor));
const amostrasCor = Object.entries(cores.reduce((acc, t) => { (acc[t.grupo] = acc[t.grupo] || []).push(t); return acc; }, {}))
  .map(([g, lista]) => `<h3 class="vc-sub">${esc(g)}</h3><ul class="vc-cores">${lista.map((t) => {
    const c = contraste(rgbDe(t.valor), fundo);
    return `<li class="vc-cor"><span class="vc-cor__amostra" style="background:var(--${t.nome})"></span>
      <span class="vc-cor__nome">--${t.nome}</span><span class="vc-cor__valor">${esc(t.valor)}</span>
      <span class="vc-cor__contraste" title="Contraste contra --fundo-1">${c.toFixed(2)}:1 · ${selo(c)}</span>
      ${t.nota ? `<span class="vc-cor__nota">${esc(t.nota)}</span>` : ''}</li>`;
  }).join('')}</ul>`).join('');

const escala = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'display'].map((k) =>
  `<li class="vc-tipo"><span class="vc-tipo__nome">--t-${k}<br><small>${esc(valorDe('t-' + k))}</small></span><span style="font-size:var(--t-${k});font-weight:800;line-height:var(--lh-apertada)">Mergulhe. Acerte.</span></li>`).join('');

const espacos = porGrupo(/espa/i).filter((t) => /^esp-\d$/.test(t.nome)).map((t) =>
  `<li class="vc-esp"><span class="vc-esp__nome">--${t.nome} · ${esc(t.valor)}</span><span class="vc-esp__barra" style="width:var(--${t.nome})"></span></li>`).join('');
const raios = tokens.filter((t) => /^raio-(sm|md|lg|xl|pilula)$/.test(t.nome)).map((t) =>
  `<li class="vc-caixa" style="border-radius:var(--${t.nome})"><span>--${t.nome}</span><small>${esc(t.valor)}</small></li>`).join('');
const sombras = tokens.filter((t) => /^sombra-\d$/.test(t.nome)).map((t) =>
  `<li class="vc-caixa" style="box-shadow:var(--${t.nome})"><span>--${t.nome}</span><small>${esc(t.nota)}</small></li>`).join('');
const camadas = tokens.filter((t) => /^z-/.test(t.nome)).map((t) =>
  `<tr><th scope="row"><code>--${t.nome}</code></th><td class="vc-num">${esc(t.valor)}</td><td>${esc(t.nota)}</td></tr>`).join('');
const movimento = tokens.filter((t) => /^(dur|ease)-/.test(t.nome)).map((t) =>
  `<tr><th scope="row"><code>--${t.nome}</code></th><td><code>${esc(t.valor)}</code></td><td>${esc(t.nota)}</td></tr>`).join('');

const variantes = [['primario', 'Primário'], ['secundario', 'Secundário'], ['fantasma', 'Fantasma'], ['perigo', 'Perigo'], ['link', 'Link']];
const botoes = `
      <div class="vc-grade-botoes">
        ${variantes.map(([v, n]) => `<div class="vc-linha">
          <span class="vc-rotulo">.botao--${v}</span>
          <button type="button" class="botao botao--${v} botao--pequeno">${n} 36</button>
          <button type="button" class="botao botao--${v}">${icone('i-ancora')}${n} 44</button>
          <button type="button" class="botao botao--${v} botao--grande">${n} 52</button>
          <button type="button" class="botao botao--${v} vc-foco">Foco</button>
          <button type="button" class="botao botao--${v}" disabled>Desabilitado</button>
          <button type="button" class="botao botao--${v}" aria-busy="true">${icone('i-ancora')}Carregando…</button>
        </div>`).join('')}
        <div class="vc-linha"><span class="vc-rotulo">.botao-icone</span>
          <button type="button" class="botao-icone" aria-label="Voltar">${icone('i-voltar')}</button>
          <button type="button" class="botao-icone" aria-label="Fechar">${icone('i-x')}</button>
          <button type="button" class="botao-icone" aria-label="Menu">${icone('i-menu')}</button></div>
      </div>
      <p class="vc-nota">Passe o mouse para ver o hover (sobe 1 px) e clique para ver o "afundar" (3 px). Uma ação primária por tela. Carregando: <code>UI.carregando(botao, true, 'Entrando…')</code>.</p>`;

const campos = `
      <div class="vc-campos">
        <label class="vc-campo"><span class="rotulo-campo">E-mail <span class="rotulo-campo__obrigatorio">(obrigatório)</span></span>
          <input class="campo" type="email" placeholder="voce@exemplo.com" aria-describedby="vc-ajuda"><span class="campo-ajuda" id="vc-ajuda">Ajuda abaixo do campo, em --t-xs.</span></label>
        <label class="vc-campo"><span class="rotulo-campo">Com erro</span>
          <input class="campo" value="nao-e-email" aria-invalid="true" aria-describedby="vc-erro"><span class="campo-erro" id="vc-erro">${icone('i-alerta')}Confira o e-mail.</span></label>
        <label class="vc-campo"><span class="rotulo-campo">Lista de opções</span>
          <select><option>10 questões</option><option>20 questões</option></select></label>
        <label class="vc-campo"><span class="rotulo-campo">Desabilitado</span><input class="campo" value="Não dá para mudar" disabled></label>
        <label class="vc-campo"><span class="rotulo-campo">Texto longo</span><textarea class="campo" rows="3">Campo de várias linhas.</textarea></label>
        <div class="vc-campo"><span class="rotulo-campo">Escolhas</span>
          <label class="check"><input type="checkbox" checked> Caixa marcada</label>
          <label class="check check--radio"><input type="radio" name="vc-r" checked> Rádio</label></div>
      </div>`;

const cartoes = `
      <div class="vc-cartoes">
        <div class="cartao"><h3 class="cartao__titulo">.cartao</h3><p class="texto-suave">Superfície-1, borda sutil e sombra-1. Sem desfoque.</p>
          <div class="cartao vc-aninhado"><strong>Cartão dentro de cartão</strong><p class="texto-suave">Superfície-2, sem borda e sem sombra.</p></div></div>
        <button type="button" class="cartao cartao--interativo vc-cartao-botao"><h3 class="cartao__titulo">.cartao--interativo</h3><p class="texto-suave">Sobe 2 px com sombra-2 no hover e no foco. É um botão de verdade.</p></button>
        <div class="cartao cartao--destaque" style="--cartao-filete:var(--destaque)"><h3 class="cartao__titulo">.cartao--destaque</h3><p class="texto-suave">Filete de 4 px à esquerda (<code>--cartao-filete</code>).</p></div>
        <div class="cartao cartao--heroi" style="--sala-cor:var(--sala-enem)"><h3 class="cartao__titulo">.cartao--heroi</h3><p class="texto-suave">Canto de 24 px e degradê leve da cor da sala.</p></div>
      </div>`;

const tags = ['neutra', 'primaria', 'destaque', 'sucesso', 'erro', 'mono', 'facil', 'medio', 'dificil', 'volta', 'versao'].map((v) =>
  `<span class="tag tag--${v}">${v === 'mono' ? '7.170 questões' : '.tag--' + v}</span>`).join(' ');

const barras = `
      <div class="vc-barras">
        <div><span class="vc-rotulo">.barra (8 px) · 35 %</span><div class="barra" role="progressbar" aria-valuenow="35" aria-valuemin="0" aria-valuemax="100" aria-label="Exemplo"><span style="width:35%"></span></div></div>
        <div><span class="vc-rotulo">.barra--fina (6 px) · 70 %</span><div class="barra barra--fina" role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100" aria-label="Exemplo"><span style="width:70%"></span></div></div>
        <div><span class="vc-rotulo">.barra--grossa (12 px) · 100 %</span><div class="barra barra--grossa" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Exemplo"><span style="width:100%"></span></div></div>
        <div><span class="vc-rotulo">.barra-xp (amarela) · 55 %</span><div class="barra-xp" role="progressbar" aria-valuenow="55" aria-valuemin="0" aria-valuemax="100" aria-label="Exemplo"><div class="barra-xp__preenchimento" style="width:55%"></div></div></div>
      </div>`;

const toast = `
      <div class="vc-toasts">
        <div class="toast" role="status"><span class="toast__icone">${icone('i-check')}</span><div><p class="toast__titulo">Mergulho liberado</p><p class="toast__texto">Pode mergulhar na Aula 1 quando quiser.</p></div></div>
        <div class="toast toast--conquista" role="status"><span class="toast__icone">${icone('i-trofeu')}</span><div><p class="toast__titulo">Conquista desbloqueada</p><p class="toast__texto">Primeiro mergulho</p></div></div>
      </div>
      <p class="vc-nota"><code>UI.toast(titulo, texto, icone, { conquista })</code>: no máximo 3 por vez, somem em 4 s; no computador, no canto superior direito.</p>`;

const esqueleto = `
      <div class="esqueleto-area"><div class="esqueletos esqueletos--sala" aria-hidden="true">${'<div class="esqueleto esqueleto--sala"><span class="esqueleto__circulo"></span><span class="esqueleto__linhas"><span class="esqueleto__linha esqueleto__linha--titulo"></span><span class="esqueleto__linha"></span><span class="esqueleto__linha esqueleto__linha--curta"></span></span></div>'.repeat(2)}</div></div>
      <p class="vc-nota"><code>UI.esqueleto('sala' | 'curso' | 'fase', n, aviso)</code>: blocos com brilho; estáticos com "reduzir movimento".</p>`;

const listaIcones = `<ul class="vc-icones">${icones.map((id) => `<li class="vc-icone">${icone(id)}<code>${id}</code></li>`).join('')}</ul>
      <p class="vc-nota">${icones.length} ícones no sprite do <code>index.html</code>, todos com traço 2 e pontas redondas. Use <code>UI.icone('i-nome')</code>. Nada de emoji na interface.</p>`;

const humores = [['', 'Normal'], ['mascote--feliz', 'Feliz'], ['mascote--triste', 'Triste'], ['mascote--pensando', 'Pensando']];
const mascotes = `<ul class="vc-mascotes">${humores.map(([c, n]) =>
  `<li><div class="mascote vc-mascote ${c}" data-mascote>${molde}</div><span>${n}${c ? ` <code>.${c}</code>` : ''}</span></li>`).join('')}</ul>
      <p class="vc-nota"><code>UI.humorMascote(container, 'feliz' | 'triste' | 'pensando' | null)</code>. O rosto padrão é o pinguim de penacho; os outros rostos ficam no Perfil (<code>js/mascotes.js</code>).</p>`;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Diver · catálogo de componentes</title>
  <!-- Gerado por scripts/gerar-componentes.mjs: não edite à mão (rode o script de novo). -->
  <link rel="stylesheet" href="../css/tokens.css">
  <link rel="stylesheet" href="../css/estilo.css">
  <link rel="stylesheet" href="../css/areas.css">
  <link rel="stylesheet" href="../css/ritmo.css">
  <style>
    .vc { max-width: 1120px; margin: 0 auto; padding: var(--esp-7) var(--esp-4) var(--esp-9); }
    .vc-topo { display: grid; gap: var(--esp-2); margin-bottom: var(--esp-6); }
    .vc-indice { display: flex; flex-wrap: wrap; gap: var(--esp-2); margin: var(--esp-4) 0 0; padding: 0; list-style: none; }
    .vc-indice a { color: var(--primaria-clara); font-weight: 700; font-size: var(--t-sm); }
    .vc-secao { margin-top: var(--esp-8); }
    .vc-sub { margin: var(--esp-5) 0 var(--esp-2); font-size: var(--t-sm); color: var(--texto-2); text-transform: uppercase; letter-spacing: 0.06em; font-family: var(--fonte-mono); }
    .vc-nota { margin-top: var(--esp-3); font-size: var(--t-sm); color: var(--texto-2); max-width: var(--medida-leitura); }
    .vc-rotulo { display: block; font-family: var(--fonte-mono); font-size: var(--t-xs); color: var(--texto-3); }
    .vc-cores { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--esp-3); grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .vc-cor { display: grid; gap: 2px; padding: var(--esp-3); border-radius: var(--raio-md); background: var(--superficie-1); border: 1px solid var(--borda-sutil); }
    .vc-cor__amostra { height: 48px; border-radius: var(--raio-sm); border: 1px solid var(--borda-sutil); margin-bottom: var(--esp-2); }
    .vc-cor__nome { font-family: var(--fonte-mono); font-size: var(--t-sm); font-weight: 700; }
    .vc-cor__valor, .vc-cor__contraste, .vc-cor__nota { font-size: var(--t-xs); color: var(--texto-2); }
    .vc-cor__contraste { font-family: var(--fonte-mono); }
    .vc-tipos, .vc-esps, .vc-caixas { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--esp-3); }
    .vc-tipo { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: var(--esp-4); align-items: baseline; }
    .vc-tipo > span:last-child { min-width: 0; overflow-wrap: anywhere; }
    @media (max-width: 479px) { .vc-tipo { grid-template-columns: minmax(0, 1fr); gap: var(--esp-1); } .vc-linha .vc-rotulo { flex-basis: 100%; } }
    .vc-tipo__nome, .vc-esp__nome { font-family: var(--fonte-mono); font-size: var(--t-xs); color: var(--texto-2); }
    .vc-esp { display: grid; grid-template-columns: 140px 1fr; align-items: center; gap: var(--esp-3); }
    .vc-esp__barra { display: block; height: 16px; border-radius: var(--raio-sm); background: var(--primaria); }
    .vc-caixas { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    .vc-caixa { display: grid; gap: 2px; place-content: center; min-height: 96px; padding: var(--esp-3); text-align: center; background: var(--superficie-1); border: 1px solid var(--borda-sutil); border-radius: var(--raio-md); font-family: var(--fonte-mono); font-size: var(--t-sm); }
    .vc-caixa small { font-size: var(--t-xs); color: var(--texto-2); font-family: var(--fonte); }
    .vc-tabela { width: 100%; border-collapse: collapse; font-size: var(--t-sm); }
    .vc-tabela th, .vc-tabela td { padding: var(--esp-2); border-bottom: 1px solid var(--borda-sutil); text-align: left; }
    .vc-num { font-family: var(--fonte-mono); }
    .vc-grade-botoes { display: grid; gap: var(--esp-4); }
    .vc-linha { display: flex; flex-wrap: wrap; align-items: center; gap: var(--esp-3); }
    .vc-linha .vc-rotulo { flex: 0 0 140px; }
    .vc-foco { outline: 3px solid var(--borda-foco); outline-offset: 3px; }
    .vc-campos { display: grid; gap: var(--esp-5); grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .vc-campo { display: grid; gap: var(--esp-1); }
    .vc-cartoes { display: grid; gap: var(--ritmo-cartoes); grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .vc-cartoes .cartao + .cartao { margin-top: 0; }
    .vc-aninhado { margin-top: var(--esp-3); }
    .vc-cartao-botao { text-align: left; font: inherit; color: inherit; }
    .vc-barras { display: grid; gap: var(--esp-4); max-width: 520px; }
    .vc-toasts { display: grid; gap: var(--esp-3); max-width: 420px; }
    .vc-toasts .toast { position: static; animation: none; }
    .vc-icones { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--esp-2); grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .vc-icone { display: flex; align-items: center; gap: var(--esp-2); padding: var(--esp-2); border-radius: var(--raio-sm); background: var(--superficie-1); }
    .vc-icone .icone { width: 24px; height: 24px; color: var(--primaria-clara); flex: none; }
    .vc-icone code { font-size: var(--t-xs); }
    .vc-mascotes { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--esp-4); grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); text-align: center; }
    .vc-mascotes li { display: grid; justify-items: center; align-content: start; gap: var(--esp-2); }
    .vc-mascote { width: 120px; }
  </style>
</head>
<body>
  ${sprite}
  <main class="vc">
    <header class="vc-topo">
      <span class="rotulo">Diver · sistema de design</span>
      <h1>Catálogo de componentes</h1>
      <p class="texto-suave">Tudo o que o app usa, com os CSS de verdade (<code>css/tokens.css</code>, <code>estilo.css</code>, <code>areas.css</code>, <code>ritmo.css</code>). Peça nova entra aqui primeiro. Gerado por <code>node scripts/gerar-componentes.mjs</code>; as regras estão em <code>docs/DESIGN.md</code>.</p>
      <ul class="vc-indice">
        ${[['cores', 'Cores'], ['texto', 'Texto'], ['espacos', 'Espaços'], ['raios', 'Raios e sombras'], ['camadas', 'Camadas e movimento'], ['botoes', 'Botões'], ['campos', 'Campos'], ['cartoes', 'Cartões'], ['tags', 'Tags'], ['barras', 'Barras'], ['avisos', 'Avisos'], ['esqueleto', 'Esqueleto'], ['icones', 'Ícones'], ['mascote', 'Mascote']]
          .map(([id, n]) => `<li><a href="#${id}">${n}</a></li>`).join('')}
      </ul>
    </header>
    ${secao('cores', 'Cores', 'O contraste é calculado contra o fundo do app (<code>--fundo-1</code>; cores com transparência, misturadas sobre ele). AA pede 4,5:1 para texto comum e 3:1 para texto grande e ícones.', amostrasCor)}
    ${secao('texto', 'Escala de texto', `8 tamanhos; <code>--t-xs</code> (12 px) é o mínimo. Entrelinhas: <code>--lh-apertada</code> ${esc(valorDe('lh-apertada'))}, <code>--lh-normal</code> ${esc(valorDe('lh-normal'))}, <code>--lh-leitura</code> ${esc(valorDe('lh-leitura'))}; leitura em até <code>--medida-leitura</code> (${esc(valorDe('medida-leitura'))}). Fontes: Plus Jakarta Sans e, para números e rótulos, JetBrains Mono.`, `<ul class="vc-tipos">${escala}</ul>`)}
    ${secao('espacos', 'Espaços', 'Régua de 4/8 px. As regras usam os papéis (<code>--ritmo-secao</code>, <code>--ritmo-cartoes</code>, <code>--ritmo-cartao-pad</code>, <code>--ritmo-pagina-x</code>), que crescem no computador.', `<ul class="vc-esps">${espacos}</ul>`)}
    ${secao('raios', 'Raios e sombras', 'Sombras sem brilho turquesa.', `<ul class="vc-caixas">${raios}</ul><h3 class="vc-sub">Sombras</h3><ul class="vc-caixas">${sombras}</ul>`)}
    ${secao('camadas', 'Camadas e movimento', 'Nunca um <code>z-index</code> numérico. Toda animação some com "reduzir movimento".', `<table class="vc-tabela"><tbody>${camadas}</tbody></table><h3 class="vc-sub">Movimento</h3><table class="vc-tabela"><tbody>${movimento}</tbody></table>`)}
    ${secao('botoes', 'Botões', '', botoes)}
    ${secao('campos', 'Campos', 'Rótulo acima, ajuda e erro abaixo, ligados por <code>aria-describedby</code>.', campos)}
    ${secao('cartoes', 'Cartões', '', cartoes)}
    ${secao('tags', 'Tags', 'Pílula de 24 px. <code>--destaque</code> só para "Recomendado" e "Novo hoje".', `<p class="vc-linha">${tags}</p>`)}
    ${secao('barras', 'Barras de progresso', 'Sempre com <code>role="progressbar"</code>; <code>UI.progresso(barra, pct)</code> põe a largura e o brilho rápido ao subir.', barras)}
    ${secao('avisos', 'Avisos (toasts)', '', toast)}
    ${secao('esqueleto', 'Esqueleto de carregamento', '', esqueleto)}
    ${secao('icones', 'Ícones', '', listaIcones)}
    ${secao('mascote', 'Mascote', '', mascotes)}
  </main>
</body>
</html>
`;

if (process.argv.includes('--conferir')) {
  const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
  if (atual !== html) { console.log(`${SAIDA} está desatualizado: rode node scripts/gerar-componentes.mjs`); process.exit(1); }
  console.log(`${SAIDA} em dia.`);
} else {
  writeFileSync(SAIDA, html);
  console.log(`Gravado ${SAIDA}: ${tokens.length} tokens, ${cores.length} cores, ${icones.length} ícones.`);
}

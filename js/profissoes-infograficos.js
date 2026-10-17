/* Mapa das Profissões · infográficos em SVG
   Funções puras: recebem dados, devolvem um elemento <svg>. Ficou só o radar do DNA: desde o formato de relatório
   (2026-10-17), os outros gráficos são HTML e CSS em js/profissoes.js (o texto fica legível em qualquer largura).
   Cores só por classes CSS (tokens em css/profissoes.css). Nenhuma cor solta. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function no(tag, attrs, pai) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, String(attrs[k]));
    if (pai) pai.appendChild(e);
    return e;
  }
  function texto(pai, x, y, conteudo, attrs) {
    const t = no('text', Object.assign({ x, y }, attrs || {}), pai);
    t.textContent = conteudo;
    return t;
  }
  function svg(largura, altura, rotulo) {
    const s = no('svg', { viewBox: `0 0 ${largura} ${altura}`, class: 'prof-info', role: 'img', 'aria-label': rotulo || '' });
    s.style.aspectRatio = `${largura} / ${altura}`;
    // Na página larga o gráfico não cresce além de 15% do tamanho desenhado (o texto não fica enorme)
    if (largura >= 400) s.style.maxWidth = Math.round(largura * 1.15) + 'px';
    return s;
  }
  function titulo(pai, t) { const el = no('title', null, pai); el.textContent = t; return el; }

  /* ---------------- Radar (DNA) ----------------
     eixos: ['Pessoas', ...]; series: [{ nome, valores[0-100], classe: 'profissao'|'voce' }] */
  function radar(opts) {
    const eixos = opts.eixos, n = eixos.length, R = 76, C = 120;
    const s = svg(240, 240, opts.rotulo || 'Radar de afinidade');
    const ponto = (v, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n, r = v / 100 * R; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
    const poligono = vals => vals.map((v, i) => ponto(v, i).map(x => x.toFixed(1)).join(',')).join(' ');
    [25, 50, 75, 100].forEach(r => no('polygon', { points: poligono(eixos.map(() => r)), class: 'prof-info-grade' }, s));
    eixos.forEach((e, i) => {
      const [x, y] = ponto(100, i);
      no('line', { x1: C, y1: C, x2: x, y2: y, class: 'prof-info-grade' }, s);
      const [lx, ly] = ponto(122, i);
      texto(s, lx, ly + 4, e, { 'text-anchor': Math.abs(lx - C) < 6 ? 'middle' : lx > C ? 'start' : 'end', 'font-size': 11 });
    });
    (opts.series || []).forEach(serie => {
      const g = no('g', null, s);
      const p = no('polygon', { points: poligono(serie.valores) }, g);
      if (serie.classe === 'voce') {
        p.style.fill = 'var(--amarelo)'; p.style.fillOpacity = '.14'; p.style.stroke = 'var(--amarelo)'; p.style.strokeWidth = '2'; p.setAttribute('stroke-dasharray', '5 4');
      } else {
        p.style.fill = 'var(--turquesa)'; p.style.fillOpacity = '.32'; p.style.stroke = 'var(--turquesa-claro)'; p.style.strokeWidth = '2';
      }
      serie.valores.forEach((v, i) => {
        const [x, y] = ponto(v, i);
        const c = no('circle', { cx: x, cy: y, r: 3.5 }, g);
        c.style.fill = serie.classe === 'voce' ? 'var(--amarelo)' : 'var(--turquesa-claro)';
        c.style.stroke = 'var(--marinho)'; c.style.strokeWidth = '2';
        titulo(c, `${serie.nome} · ${eixos[i]}: ${v}`);
      });
    });
    return s;
  }

  window.ProfissoesInfograficos = { radar };
})();

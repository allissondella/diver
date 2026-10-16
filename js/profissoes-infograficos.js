/* Mapa das Profissões · infográficos em SVG
   Funções puras: recebem dados, devolvem um elemento <svg>.
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
    return s;
  }
  function titulo(pai, t) { const el = no('title', null, pai); el.textContent = t; return el; }
  const brl = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');

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

  /* ---------------- Relógio de 24 horas ----------------
     faixas: [{de, ate, texto}], hora: 0-23, minuto */
  function relogio(opts) {
    const s = svg(120, 120, 'Relógio de 24 horas com o período atual destacado');
    const C = 60, R = 50, esp = 12;
    const arco = (a0, a1, r) => {
      const p = a => [C + r * Math.cos(a), C + r * Math.sin(a)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      const grande = a1 - a0 > Math.PI ? 1 : 0;
      return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${grande} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    };
    const ang = h => -Math.PI / 2 + h / 24 * 2 * Math.PI;
    const folga = 0.02;
    opts.faixas.forEach(f => {
      const atual = opts.hora >= f.de && opts.hora < f.ate;
      const path = no('path', { d: arco(ang(f.de) + folga, ang(f.ate) - folga, R), fill: 'none', 'stroke-width': esp, 'stroke-linecap': 'butt' }, s);
      path.style.stroke = atual ? 'var(--amarelo)' : 'var(--superficie)';
      titulo(path, `${String(f.de).padStart(2, '0')}h às ${String(f.ate).padStart(2, '0')}h: ${f.texto}`);
    });
    // marcador da hora atual
    const a = ang(opts.hora + (opts.minuto || 0) / 60);
    const m = no('circle', { cx: C + R * Math.cos(a), cy: C + R * Math.sin(a), r: 4 }, s);
    m.style.fill = 'var(--texto)'; m.style.stroke = 'var(--marinho)'; m.style.strokeWidth = '2';
    [[0, '0h'], [6, '6h'], [12, '12h'], [18, '18h']].forEach(([h, r]) => {
      const aa = ang(h), rr = R - esp / 2 - 10;
      texto(s, C + rr * Math.cos(aa), C + rr * Math.sin(aa) + 3.5, r, { 'text-anchor': 'middle', 'font-size': 9 });
    });
    texto(s, C, C + 6, `${String(opts.hora).padStart(2, '0')}:${String(opts.minuto || 0).padStart(2, '0')}`, { 'text-anchor': 'middle', class: 'prof-info-amarelo', 'font-size': 17 });
    return s;
  }

  /* ---------------- Faixa salarial ----------------
     { min, max, faixa:{de,ate,rotulo}, media, piso, chute } */
  function faixaSalarial(o) {
    const L = 640, A = 130, x0 = 24, x1 = L - 24, y = 72;
    const s = svg(L, A, 'Faixa salarial com média, piso por lei e seu chute');
    const px = v => x0 + (Math.min(Math.max(v, o.min), o.max) - o.min) / (o.max - o.min) * (x1 - x0);
    // eixo e ticks a cada R$ 2.000
    no('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'prof-info-eixo' }, s);
    for (let v = Math.ceil(o.min / 2000) * 2000; v <= o.max; v += 2000) {
      no('line', { x1: px(v), y1: y - 4, x2: px(v), y2: y + 4, class: 'prof-info-eixo' }, s);
      texto(s, px(v), y + 20, (v / 1000) + ' mil', { 'text-anchor': 'middle', 'font-size': 11 });
    }
    // faixa comum
    if (o.faixa) {
      const r = no('rect', { x: px(o.faixa.de), y: y - 9, width: px(o.faixa.ate) - px(o.faixa.de), height: 18, rx: 4, class: 'prof-info-barra--suave' }, s);
      r.classList.add('prof-info-barra--suave');
      titulo(r, `${o.faixa.rotulo || 'Faixa comum'}: ${brl(o.faixa.de)} a ${brl(o.faixa.ate)}`);
    }
    // marcadores
    const marca = (v, rotulo, classe, acima, dy) => {
      const g = no('g', null, s);
      const l = no('line', { x1: px(v), y1: y - 16, x2: px(v), y2: y + 16, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
      l.style.stroke = classe === 'amarelo' ? 'var(--amarelo)' : classe === 'turquesa' ? 'var(--turquesa-claro)' : 'var(--texto)';
      texto(g, px(v), acima ? y - 24 - (dy || 0) : y + 38 + (dy || 0), `${rotulo} ${brl(v)}`, { 'text-anchor': 'middle', 'font-size': 12, class: classe === 'amarelo' ? 'prof-info-amarelo' : classe === 'turquesa' ? 'prof-info-turquesa' : 'prof-info-forte' });
      titulo(g, `${rotulo}: ${brl(v)}`);
    };
    if (o.media != null) marca(o.media, 'média', 'turquesa', true, 0);
    if (o.piso != null) marca(o.piso, 'piso por lei', 'forte', Math.abs(px(o.piso) - px(o.media || 0)) < 90 ? true : true, Math.abs(px(o.piso) - px(o.media || 0)) < 90 ? 18 : 0);
    if (o.chute != null) marca(o.chute, 'seu chute', 'amarelo', false, 10);
    return s;
  }

  /* ---------------- Barras horizontais ----------------
     itens: [{rotulo, valor, sub, destaque}], max, sufixo */
  function barras(o) {
    const linha = o.itens.some(i => i.sub) ? 36 : 30, topo = 6, L = 640, esq = o.larguraRotulo || 170, dir = 70;
    const A = topo + o.itens.length * linha + 6;
    const s = svg(L, A, o.rotulo || 'Gráfico de barras');
    const max = o.max || Math.max(...o.itens.map(i => i.valor), 1);
    const px = v => esq + v / max * (L - esq - dir);
    o.itens.forEach((it, i) => {
      const y = topo + i * linha, yb = y + (linha - 14) / 2;
      const g = no('g', { class: 'prof-info-interativo', tabindex: 0 }, s);
      texto(g, esq - 10, it.sub ? y + 15 : yb + 11, it.rotulo, { 'text-anchor': 'end', 'font-size': 12.5, class: 'prof-info-forte' });
      no('rect', { x: esq, y: yb, width: L - esq - dir, height: 14, rx: 4, class: 'prof-info-grade', fill: 'none' }, g);
      const b = no('rect', { x: esq, y: yb, width: Math.max(px(it.valor) - esq, 2), height: 14, rx: 4, class: 'prof-info-barra' + (it.destaque ? ' prof-info-barra--amarela' : '') }, g);
      texto(g, px(it.valor) + 8, yb + 11, `${it.valor}${o.sufixo || ''}`, { 'font-size': 12, class: 'prof-info-forte' });
      if (it.sub) texto(g, esq - 10, y + 28, it.sub, { 'text-anchor': 'end', 'font-size': 10 });
      titulo(g, `${it.rotulo}: ${it.valor}${o.sufixo || ''}${it.sub ? ' · ' + it.sub : ''}`);
      b.style.transition = 'width .5s';
    });
    return s;
  }

  /* ---------------- Sazonalidade (12 meses, base 100) ---------------- */
  function sazonalidade(o) {
    const L = 640, A = 176, x0 = 36, x1 = L - 16, yBase = 98, esc = 2;
    const s = svg(L, A, 'Interesse por mês, comparado com a média do ano');
    const meses = o.meses || ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const lw = (x1 - x0) / 12, bw = lw * 0.58;
    const max = Math.max(...o.valores);
    no('line', { x1: x0, y1: yBase, x2: x1, y2: yBase, class: 'prof-info-eixo' }, s);
    texto(s, x0 - 6, yBase + 4, '100', { 'text-anchor': 'end', 'font-size': 10 });
    texto(s, x0 - 6, yBase - 30 * esc + 4, '130', { 'text-anchor': 'end', 'font-size': 10 });
    no('line', { x1: x0, y1: yBase - 30 * esc, x2: x1, y2: yBase - 30 * esc, class: 'prof-info-grade' }, s);
    o.valores.forEach((v, i) => {
      const x = x0 + i * lw + (lw - bw) / 2, h = Math.abs(v - 100) * esc;
      const g = no('g', { class: 'prof-info-interativo', tabindex: 0 }, s);
      const r = no('rect', { x, y: v >= 100 ? yBase - h : yBase, width: bw, height: Math.max(h, 1.5), rx: 3, class: 'prof-info-barra' + (v === max ? ' prof-info-barra--amarela' : v < 100 ? ' prof-info-barra--suave' : '') }, g);
      texto(g, x + bw / 2, A - 8, meses[i], { 'text-anchor': 'middle', 'font-size': 11 });
      if (v === max || v === Math.min(...o.valores)) texto(g, x + bw / 2, v >= 100 ? yBase - h - 6 : yBase + h + 13, String(v), { 'text-anchor': 'middle', 'font-size': 11, class: v === max ? 'prof-info-amarelo' : '' });
      titulo(g, `${meses[i]}: ${v} (média do ano = 100)`);
      r.setAttribute('aria-label', `${meses[i]}: ${v}`);
    });
    return s;
  }

  /* ---------------- Linha da formação ----------------
     etapas: [{nome, anos_de, anos_ate, tipo:'alternativa'|'principal'|'depois'}] */
  function linhaFormacao(o) {
    const L = 640, esq = 218, dir = 16, linha = 44, topo = 30;
    const etapas = o.etapas;
    const A = topo + etapas.length * linha + 24;
    const s = svg(L, A, 'Linha do tempo da formação, em anos');
    const maxAnos = o.maxAnos || 8;
    const px = a => esq + a / maxAnos * (L - esq - dir);
    for (let a = 0; a <= maxAnos; a++) {
      no('line', { x1: px(a), y1: topo - 10, x2: px(a), y2: A - 20, class: 'prof-info-grade' }, s);
      texto(s, px(a), topo - 14, a === 0 ? 'início' : `${a} ano${a > 1 ? 's' : ''}`, { 'text-anchor': 'middle', 'font-size': 10 });
    }
    let cursor = 0;
    etapas.forEach((e, i) => {
      const y = topo + i * linha;
      const inicio = e.tipo === 'depois' ? cursor : 0;
      const g = no('g', { class: 'prof-info-interativo', tabindex: 0 }, s);
      texto(g, esq - 12, y + 14, e.nome, { 'text-anchor': 'end', 'font-size': 12.5, class: 'prof-info-forte' });
      texto(g, esq - 12, y + 28, e.anos_de === e.anos_ate ? `${e.anos_de} anos` : `${e.anos_de} a ${e.anos_ate} anos`, { 'text-anchor': 'end', 'font-size': 10.5 });
      const w1 = px(inicio + e.anos_de) - px(inicio), w2 = px(inicio + e.anos_ate) - px(inicio);
      const r = no('rect', { x: px(inicio), y: y + 6, width: Math.max(w1, 3), height: 16, rx: 4, class: 'prof-info-barra' + (e.tipo === 'principal' ? '' : e.tipo === 'alternativa' ? ' prof-info-barra--amarela' : ' prof-info-barra--suave') }, g);
      if (w2 > w1) no('rect', { x: px(inicio) + w1, y: y + 6, width: w2 - w1, height: 16, rx: 4, class: 'prof-info-barra--suave' }, g).style.opacity = '.6';
      // marca "mercado"
      const mx = px(inicio + e.anos_de);
      if (e.tipo !== 'depois') {
        const c = no('circle', { cx: mx, cy: y + 14, r: 5 }, g); c.style.fill = 'var(--texto)'; c.style.stroke = 'var(--marinho)'; c.style.strokeWidth = '2';
        texto(g, mx + 10, y + 18, 'entra no mercado', { 'font-size': 10.5 });
      }
      titulo(g, `${e.nome}: ${e.texto || ''}`);
      if (e.tipo === 'principal') cursor = e.anos_ate;
      r.setAttribute('aria-label', e.nome);
    });
    return s;
  }

  /* ---------------- Mini barra (indicador) ---------------- */
  function anel(o) {
    const s = svg(64, 64, o.rotulo || 'Indicador');
    const C = 32, R = 26, circ = 2 * Math.PI * R;
    no('circle', { cx: C, cy: C, r: R, fill: 'none', 'stroke-width': 7, class: 'prof-info-grade' }, s).style.stroke = 'var(--superficie)';
    const p = no('circle', { cx: C, cy: C, r: R, fill: 'none', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': `${circ * o.valor / 100} ${circ}`, transform: `rotate(-90 ${C} ${C})` }, s);
    p.style.stroke = o.classe === 'amarelo' ? 'var(--amarelo)' : 'var(--turquesa)';
    texto(s, C, C + 5, `${Math.round(o.valor)}%`, { 'text-anchor': 'middle', class: 'prof-info-forte', 'font-size': 13 });
    return s;
  }

  window.ProfissoesInfograficos = { radar, relogio, faixaSalarial, barras, sazonalidade, linhaFormacao, anel };
})();

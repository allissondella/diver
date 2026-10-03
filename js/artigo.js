/*
 * Artigo da fase ("Antes de mergulhar") — monta as partes visuais opcionais de fases[].resumo:
 *   secoes        [{ titulo, texto | [parágrafos] }]          artigo curto, com **negrito**
 *   linhaDoTempo  [{ quando, fato }]                          linha do tempo (quando fizer sentido)
 *   mapaMental    { centro, ramos: [{ titulo, itens: [] }] }  mapa mental
 *   associacoes   [{ icone, conceito, liga, porque }]         imagens de associação (emoji + gancho)
 *   mapa          { tipo: 'brasil' | 'corpo', titulo, pontos: [{ titulo, texto, lat, lon | onde }] }
 * e o caminho da fase: Aprender → Associar → Praticar → Desafio → Revisar.
 * Tudo entra como texto (nunca como HTML). Campos ausentes simplesmente não aparecem.
 */
const Artigo = (() => {
  const { h } = UI;
  const NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs = {}, ...filhos) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    filhos.forEach((f) => f && el.append(f));
    return el;
  }

  /** Texto com **negrito** vira nós. */
  function negrito(texto) {
    return String(texto).split(/(\*\*[^*]+\*\*)/).filter(Boolean)
      .map((p) => (p.startsWith('**') && p.endsWith('**') ? h('strong', { text: p.slice(2, -2) }) : p));
  }

  const lista = (x) => (Array.isArray(x) ? x : []);

  /* ---------- Caminho da fase ---------- */
  const PASSOS = [
    { id: 'aprender', emoji: '📚', nome: 'Aprender', dica: 'Ler o artigo' },
    { id: 'associar', emoji: '🧠', nome: 'Associar', dica: 'Mapa mental e associações' },
    { id: 'praticar', emoji: '🃏', nome: 'Praticar', dica: 'Mergulho da fase' },
    { id: 'desafio', emoji: '⚔️', nome: 'Desafio', dica: 'Chefão ou prova' },
    { id: 'revisar', emoji: '🔄', nome: 'Revisar', dica: 'Revisão espaçada' }
  ];

  /** acoes = { aprender(), associar(), praticar(), desafio(), revisar() } */
  function caminho(acoes) {
    return h('nav', { class: 'caminho', 'aria-label': 'Caminho da fase' },
      h('ol', { class: 'caminho__lista' }, PASSOS.map((p, i) => h('li', { class: 'caminho__item' },
        h('button', { type: 'button', class: 'caminho__passo', 'data-passo': p.id, onclick: () => acoes[p.id] && acoes[p.id]() },
          h('span', { class: 'caminho__emoji', 'aria-hidden': 'true', text: p.emoji }),
          h('span', { class: 'caminho__nome', text: p.nome }),
          h('span', { class: 'caminho__dica', text: p.dica })),
        i < PASSOS.length - 1 ? h('span', { class: 'caminho__seta', 'aria-hidden': 'true', text: '→' }) : null))));
  }

  /* ---------- Blocos do artigo ---------- */
  function secoes(itens) {
    const s = lista(itens).filter((x) => x && x.titulo);
    if (!s.length) return null;
    return h('div', { class: 'artigo' }, s.map((sec) => h('section', { class: 'artigo__secao' },
      h('h3', { class: 'artigo__titulo', text: sec.titulo }),
      (Array.isArray(sec.texto) ? sec.texto : [sec.texto]).filter(Boolean).map((p) => h('p', {}, negrito(p))))));
  }

  function linhaDoTempo(itens) {
    const l = lista(itens).filter((x) => x && x.quando);
    if (!l.length) return null;
    return h('section', { class: 'artigo__bloco' },
      h('h3', { class: 'artigo__titulo', text: 'Linha do tempo' }),
      h('ol', { class: 'tempo' }, l.map((x) => h('li', { class: 'tempo__item' },
        h('span', { class: 'tempo__quando', text: x.quando }),
        h('span', { class: 'tempo__fato' }, negrito(x.fato || ''))))));
  }

  function mapaMental(mm) {
    if (!mm || !mm.centro || !lista(mm.ramos).length) return null;
    return h('section', { class: 'artigo__bloco' },
      h('h3', { class: 'artigo__titulo', text: 'Mapa mental' }),
      h('div', { class: 'mm', role: 'group', 'aria-label': `Mapa mental: ${mm.centro}` },
        h('div', { class: 'mm__centro', text: mm.centro }),
        h('ul', { class: 'mm__ramos' }, mm.ramos.map((r, i) => h('li', { class: `mm__ramo mm__ramo--${i % 5}` },
          h('span', { class: 'mm__ramo-titulo', text: r.titulo }),
          h('ul', { class: 'mm__itens' }, lista(r.itens).map((it) => h('li', { class: 'mm__item' }, negrito(it)))))))));
  }

  function associacoes(itens) {
    const l = lista(itens).filter((x) => x && x.conceito);
    if (!l.length) return null;
    return h('section', { class: 'artigo__bloco' },
      h('h3', { class: 'artigo__titulo', text: 'Associe para lembrar' }),
      h('ul', { class: 'assoc' }, l.map((a) => h('li', { class: 'assoc__item' },
        h('span', { class: 'assoc__icone', 'aria-hidden': 'true', text: a.icone || '💡' }),
        h('div', { class: 'assoc__texto' },
          h('p', { class: 'assoc__par' }, h('strong', { text: a.conceito }), h('span', { class: 'assoc__seta', 'aria-hidden': 'true', text: ' → ' }), h('span', { class: 'visualmente-oculto', text: ' liga-se a ' }), a.liga || ''),
          a.porque ? h('p', { class: 'assoc__porque' }, negrito(a.porque)) : null)))));
  }

  /* ---------- Mapas ---------- */
  // Contorno do Brasil simplificado (esquema, fora de escala exata), projetado em 0–100.
  const BRASIL = 'M55.9 3.9L58.3 9.3L59.8 13.4L63.4 17.6L69.5 17.1L73.7 20.7L80.5 21.7L87.8 23.7L95.6 27.3L96.8 32.2L95.6 37.1L91.0 42.0L87.8 46.3L86.3 52.4L85.9 58.3L83.4 64.1L81.7 67.3L79.3 70.5L76.3 70.7L72.7 71.7L68.8 73.2L64.1 77.3L63.2 83.7L59.3 89.0L54.6 93.2L51.5 96.8L51.0 93.7L46.1 90.0L41.2 88.3L45.6 83.4L50.2 81.0L48.5 77.1L49.5 73.4L46.6 72.9L45.6 69.0L41.0 68.5L40.7 63.2L40.0 57.3L34.9 54.4L34.6 47.8L29.8 46.6L22.4 43.2L19.3 38.8L12.0 41.5L5.1 39.0L1.7 32.7L3.9 27.3L10.7 24.9L12.4 17.6L11.2 12.0L17.6 10.2L21.7 12.4L27.1 9.3L25.4 5.4L33.7 2.0L35.4 8.0L36.3 11.0L39.0 11.5L44.1 10.0L47.6 8.8L49.8 9.5L52.7 9.3Z';
  const projetar = (lat, lon) => [((lon + 74.5) / 41) * 100, ((6 - lat) / 41) * 100];
  // Pontos do corpo (vista de frente; o lado esquerdo da figura é o lado direito do paciente).
  const CORPO = {
    cranio: [50, 7], cervical: [50, 16], ombro: [37, 21], cotovelo: [31, 35], punho: [28, 47], mao: [26, 53],
    toracica: [50, 28], lombar: [50, 41], pelve: [50, 49], quadril: [44, 52], femur: [43, 62], joelho: [42, 71],
    tibia: [42, 80], tornozelo: [42, 89], pe: [40, 94], halux: [37, 96]
  };

  function desenhoBrasil() {
    return svg('svg', { class: 'geo__desenho', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' },
      svg('path', { d: BRASIL, class: 'geo__terra' }));
  }

  function desenhoCorpo() {
    const l = (x1, y1, x2, y2) => svg('line', { x1, y1, x2, y2, class: 'geo__osso' });
    return svg('svg', { class: 'geo__desenho', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' },
      svg('circle', { cx: 50, cy: 7, r: 5.5, class: 'geo__osso' }),
      l(50, 13, 50, 49), l(37, 21, 63, 21), l(37, 21, 31, 35), l(31, 35, 28, 47), l(28, 47, 26, 54),
      l(63, 21, 69, 35), l(69, 35, 72, 47), l(72, 47, 74, 54), l(43, 50, 57, 50),
      l(44, 51, 42, 71), l(42, 71, 42, 89), l(42, 89, 37, 95), l(56, 51, 58, 71), l(58, 71, 58, 89), l(58, 89, 63, 95));
  }

  /** Pontos muito próximos se sobrepõem: empurra uns dos outros até ficarem a ~7% de distância (só o desenho muda). */
  function afastar(pontos, minimo = 7) {
    for (let volta = 0; volta < 30; volta++) {
      let mexeu = false;
      for (let i = 0; i < pontos.length; i++) {
        for (let j = i + 1; j < pontos.length; j++) {
          const a = pontos[i]; const b = pontos[j];
          let dx = b.x - a.x; let dy = b.y - a.y; let d = Math.hypot(dx, dy);
          if (d >= minimo) continue;
          if (d < 0.01) { dx = 1; dy = 0; d = 1; }
          const passo = (minimo - d) / 2;
          a.x -= (dx / d) * passo; a.y -= (dy / d) * passo; b.x += (dx / d) * passo; b.y += (dy / d) * passo;
          mexeu = true;
        }
      }
      if (!mexeu) break;
    }
    pontos.forEach((p) => { p.x = Math.min(96, Math.max(4, p.x)); p.y = Math.min(96, Math.max(4, p.y)); });
  }

  function mapa(m) {
    if (!m || !lista(m.pontos).length) return null;
    const corpo = m.tipo === 'corpo';
    const pontos = m.pontos.map((p) => {
      const pos = corpo ? CORPO[p.onde] : (typeof p.lat === 'number' ? projetar(p.lat, p.lon) : null);
      return pos ? { ...p, x: pos[0], y: pos[1] } : null;
    }).filter(Boolean);
    if (!pontos.length) return null;
    afastar(pontos);
    const detalhe = h('div', { class: 'geo__detalhe', 'aria-live': 'polite' },
      h('p', { class: 'texto-suave', text: 'Toque num ponto do mapa para ver o que acontece ali.' }));
    const botoes = pontos.map((p, i) => h('button', {
      type: 'button', class: 'geo__ponto', style: `left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%`,
      'aria-label': p.titulo, title: p.titulo,
      onclick: (e) => {
        palco.querySelectorAll('.geo__ponto').forEach((b) => b.removeAttribute('aria-pressed'));
        e.currentTarget.setAttribute('aria-pressed', 'true');
        detalhe.replaceChildren(h('p', { class: 'geo__detalhe-titulo' }, h('strong', { text: `${i + 1}. ${p.titulo}` })), h('p', {}, negrito(p.texto || '')));
      }
    }, String(i + 1)));
    const palco = h('div', { class: `geo__palco ${corpo ? 'geo__palco--corpo' : ''}` }, corpo ? desenhoCorpo() : desenhoBrasil(), botoes);
    return h('section', { class: 'artigo__bloco' },
      h('h3', { class: 'artigo__titulo', text: m.titulo || (corpo ? 'Mapa do corpo' : 'Mapa') }),
      h('figure', { class: 'geo' }, palco,
        h('figcaption', { class: 'texto-suave geo__legenda', text: corpo ? 'Esquema do corpo, fora de escala.' : 'Esquema do Brasil, fora de escala.' })),
      detalhe,
      h('ol', { class: 'visualmente-oculto' }, pontos.map((p) => h('li', {}, `${p.titulo}: ${p.texto || ''}`))));
  }

  /** Partes do passo "Aprender" e do passo "Associar". */
  function aprender(r) { return [secoes(r.secoes), linhaDoTempo(r.linhaDoTempo), mapa(r.mapa)].filter(Boolean); }
  function associar(r) { return [mapaMental(r.mapaMental), associacoes(r.associacoes)].filter(Boolean); }

  return { caminho, aprender, associar, negrito, PASSOS, projetar, CORPO };
})();

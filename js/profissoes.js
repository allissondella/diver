/* Mapa das Profissões · js/profissoes.js
   Script clássico (defer). Expõe window.Profissoes.
   Regras do Diver: conteúdo dos JSON entra por textContent; armazenamento em try/catch;
   nenhuma cor solta; XP e pérolas só pelos ganchos (economia.js liga em Profissoes.ganchos). */
(function () {
  'use strict';

  const BASE = 'data/profissoes/';
  const CHAVE = 'diver:v1:profissoes';
  const IG = () => window.ProfissoesInfograficos;

  /* =========================================================
     Estado do aluno (espelhado na nuvem pelo mecanismo diver:v1:*)
     ========================================================= */
  let estado = { vistas: {}, mira: [], cartasSim: [], cartasNao: [], pedidos: [], dna: null, diaConcluido: [], mitosConcluido: [], chutes: {}, votos: {}, cartasGeradas: [] };
  function carregarEstado() { try { const s = localStorage.getItem(CHAVE); if (s) estado = Object.assign(estado, JSON.parse(s)); } catch (e) { /* sem armazenamento: segue em memória */ } }
  function salvarEstado() { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* ignora */ } }

  /* =========================================================
     Ganchos: o app liga aqui (ver docs/MAPA_PROFISSOES_INTEGRACAO.md)
     ========================================================= */
  const ganchos = {
    navegar: rota => { location.hash = rota; },
    recompensar: function (ev) { /* economia.js: ev = {tipo, xp, perolas, profissao} */ },
    registrar: function (evento, dados) { /* atividade.js: eventos_atividade */ },
    confirmar: texto => Promise.resolve(true), /* UI.confirmar */
    abrirCurso: function (idCurso) { aviso('No app, isso abre o curso na Sala Enem e Vestibular.'); },
    nomeCurso: idCurso => idCurso.charAt(0).toUpperCase() + idCurso.slice(1), /* o app troca pelo nome do curso no catálogo */
    verRascunho: () => true, /* o app esconde do aluno as fichas ainda não publicadas (viram "Em breve") */
    mascote: null /* opcional: função que devolve um elemento com o mascote */
  };
  /* A ficha abre para esta conta? Rascunho e validada só para quem o app deixar ver (equipe). */
  const temFicha = p => !!(p && p.arquivo && (p.status === 'publicada' || ganchos.verRascunho()));
  /* O panorama de uma área (ex.: Tecnologia) segue a mesma regra: rascunho só para a equipe. */
  const temPanorama = pn => !!(pn && (pn.status === 'publicada' || ganchos.verRascunho()));

  /* =========================================================
     Dados
     ========================================================= */
  const cache = { indice: null, fichas: {}, trends: undefined, numeros: null };
  async function lerJson(caminho) { const r = await fetch(caminho); if (!r.ok) throw new Error('Não foi possível carregar ' + caminho); return r.json(); }
  async function indice() { if (!cache.indice) cache.indice = await lerJson(BASE + 'indice.json'); return cache.indice; }
  async function ficha(id) {
    if (!cache.fichas[id]) {
      const ix = await indice(); const p = ix.profissoes.find(x => x.id === id);
      if (!temFicha(p)) return null;
      cache.fichas[id] = await lerJson(BASE + p.arquivo);
    }
    return cache.fichas[id];
  }
  /** numeros.json (gerado das fichas): uma busca só, mesmo com os 22 cartões do mapa pedindo ao mesmo tempo */
  function numerosProf() {
    if (!cache.numeros) cache.numeros = lerJson(BASE + 'numeros.json').catch(() => null);
    return cache.numeros;
  }
  async function trends() {
    if (cache.trends === undefined) { try { cache.trends = await lerJson(BASE + 'trends/trends.json'); } catch (e) { cache.trends = null; } }
    return cache.trends;
  }

  /* =========================================================
     Utilidades de DOM
     ========================================================= */
  function el(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) e.style.setProperty(p, v[p]); else e.style[p] = v[p]; } }
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat()) { if (f === null || f === undefined || f === false) continue; e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); }
    return e;
  }
  const ICONES = {
    bussola: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'm16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z'],
    esquerda: ['M19 12H5', 'm12 19-7-7 7-7'], direita: ['M5 12h14', 'm12 5 7 7-7 7'],
    alvo: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z', 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
    certo: ['M20 6 9 17l-5-5'], play: ['m6 3 14 9-14 9V3z'], relogio: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
    balanca: ['M12 3v18', 'M3 7h18', 'm5 7-3 7a4 4 0 0 0 6 0L5 7', 'm19 7-3 7a4 4 0 0 0 6 0l-3-7'],
    olho: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    camadas: ['m12 2-10 5 10 5 10-5-10-5z', 'm2 17 10 5 10-5', 'm2 12 10 5 10-5'],
    busca: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3'],
    livro: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
    link: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
    estrela: ['m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'],
    baixar: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
    embaralhar: ['M16 3h5v5', 'M4 20 21 3', 'M21 16v5h-5', 'm15 15 6 6', 'm4 4 5 5'],
    info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
    x: ['M18 6 6 18', 'm6 6 12 12'], baixo: ['M12 5v14', 'm19 12-7 7-7-7'], abre: ['m6 9 6 6 6-6'],
    ancora: ['M12 22V8', 'M5 12H2a10 10 0 0 0 20 0h-3', 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    grade: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'], lista: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
    bolhas: ['M8 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M17 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', 'M17.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'], cadeado: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
    filtro: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
    dado: ['M3 3h18v18H3z', 'M8 8h.01', 'M16 8h.01', 'M12 12h.01', 'M8 16h.01', 'M16 16h.01'],
    menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'], expandir: ['M15 3h6v6', 'M9 21H3v-6', 'm21 3-7 7', 'm3 21 7-7']
  };
  function icone(nome) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'prof-ico');
    (ICONES[nome] || []).forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); });
    return s;
  }
  let avisoEl = null, avisoTimer = null;
  function aviso(texto) {
    if (!avisoEl) { avisoEl = el('div', { class: 'prof-aviso', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(avisoEl); }
    avisoEl.textContent = texto; avisoEl.classList.add('visivel');
    clearTimeout(avisoTimer); avisoTimer = setTimeout(() => avisoEl.classList.remove('visivel'), 2800);
  }
  const normalizar = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const brl = n => 'R$\u00a0' + Math.round(n).toLocaleString('pt-BR');
  const dataBR = iso => { if (!iso) return ''; const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
  const corArea = (ix, areaId) => { const a = ix.areas.find(x => x.id === areaId); return a ? `var(${a.cor})` : 'var(--turquesa)'; };
  const nomeArea = (ix, areaId) => { const a = ix.areas.find(x => x.id === areaId); return a ? a.nome : ''; };
  function botao(texto, opts) {
    const o = opts || {};
    const b = el('button', { type: 'button', class: 'prof-btn ' + (o.classe || ''), onclick: o.onclick, 'aria-pressed': o.pressed, disabled: o.disabled }, o.icone ? icone(o.icone) : null, texto, o.iconeDepois ? icone(o.iconeDepois) : null);
    return b;
  }
  function link(texto, rota, opts) {
    const o = opts || {};
    return el('a', { href: '#' + rota, class: o.classe || '' }, o.icone ? icone(o.icone) : null, texto, o.iconeDepois ? icone(o.iconeDepois) : null);
  }

  /* =========================================================
     Citações discretas (2026-10-17, pedido do usuário: "fontes mais escondidas, mas de fácil acesso"):
     depois de cada informação, um pontinho apagado que acende no toque ou no foco e abre as fontes dela num cartão.
     "Mostrar as fontes" (no topo) acende todos e troca os pontinhos pelos números (.prof-raiz--fontes).
     ========================================================= */
  function numeroFonte(f, id) { const i = (f.fontes || []).findIndex(x => x.id === id); return i >= 0 ? i + 1 : null; }
  const juntarE = l => l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
  /* Um botão só por informação, mesmo com várias fontes (antes, uma bolinha por fonte, que se encostavam) */
  function citar(f, ids) {
    const lista = [...new Set(ids || [])].filter(id => numeroFonte(f, id));
    if (!lista.length) return null;
    const nums = lista.map(id => numeroFonte(f, id));
    const rotulo = lista.length === 1 ? `Fonte ${nums[0]}: ${f.fontes.find(x => x.id === lista[0]).titulo}` : `Fontes ${juntarE(nums)}`;
    return el('sup', { class: 'prof-cit' }, el('button', { type: 'button', class: 'prof-cit-b', 'aria-label': rotulo, title: lista.length === 1 ? 'Ver a fonte' : 'Ver as fontes',
      onclick: e => { e.stopPropagation(); abrirFontes(f, lista, e.currentTarget); } }, el('span', { class: 'prof-cit-n', 'aria-hidden': 'true', text: nums.join(' · ') })));
  }
  const metaFonte = fo => `${fo.orgao}. Consultado em ${dataBR(fo.consultado_em)}${fo.dados_atualizados_em ? ', dados atualizados em ' + dataBR(fo.dados_atualizados_em) : ''}. Fonte ${fo.tipo === 'primaria' ? 'primária' : 'secundária'}.`;
  /* "Mostrar as fontes": só neste aparelho, como o "Esconder menu" */
  const CHAVE_FONTES = 'diver-local:v1:profissoes-fontes';
  const lerFontes = () => { try { return localStorage.getItem(CHAVE_FONTES) === '1'; } catch (e) { return false; } };
  function botaoFontes(total) {
    const b = el('button', { type: 'button', class: 'prof-link-botao prof-fontes-alterna' });
    const pintar = on => { b.textContent = ''; b.append(icone('olho'), on ? 'Esconder as fontes' : total ? `Mostrar as ${total} fontes` : 'Mostrar as fontes'); b.setAttribute('aria-pressed', String(on)); };
    b.addEventListener('click', () => {
      const raiz = b.closest('.prof-raiz'); if (!raiz) return;
      const on = !raiz.classList.contains('prof-raiz--fontes');
      raiz.classList.toggle('prof-raiz--fontes', on);
      try { localStorage.setItem(CHAVE_FONTES, on ? '1' : '0'); } catch (e) { /* sem armazenamento: vale só agora */ }
      pintar(on);
    });
    pintar(lerFontes());
    return b;
  }
  let popFonte = null;
  function fecharFonte() {
    if (!popFonte) return;
    const { caixa, origem, sair } = popFonte; popFonte = null;
    sair(); caixa.remove();
    if (origem && origem.isConnected) origem.focus({ preventScroll: true });
  }
  /* A lista inteira (capítulo Fontes) aberta no item pedido, com um destaque rápido */
  function irParaFonte(id) {
    const ol = document.getElementById('prof-lista-fontes'); if (!ol) return;
    if (ol.hidden) { const b = document.querySelector('[aria-controls="prof-lista-fontes"]'); if (b) b.click(); }
    const li = document.getElementById('fonte-' + id) || ol;
    li.classList.remove('prof-fontes-destaque'); void li.offsetWidth; li.classList.add('prof-fontes-destaque');
    li.setAttribute('tabindex', '-1'); ir(li); li.focus({ preventScroll: true });
  }
  /** Cartão com as fontes de uma informação (ids) ou de um gráfico (extra: { titulo, texto }). */
  function abrirFontes(f, ids, origem, extra) {
    const fos = [...new Set(ids || [])].map(id => (f.fontes || []).find(x => x.id === id)).filter(Boolean);
    if (!fos.length && !(extra && extra.texto)) return;
    fecharFonte();
    const nums = fos.map(fo => numeroFonte(f, fo.id)), total = (f.fontes || []).length;
    const titulo = extra && extra.titulo ? extra.titulo : fos.length === 1 ? `Fonte ${nums[0]} de ${total}` : `Fontes ${juntarE(nums)}`;
    const fechar = el('button', { type: 'button', class: 'prof-pop-fechar', 'aria-label': 'Fechar', onclick: fecharFonte }, icone('x'));
    const temLista = !!document.getElementById('prof-lista-fontes');
    const caixa = el('div', { class: 'prof-pop', role: 'dialog', 'aria-label': titulo },
      el('div', { class: 'prof-pop-cab' }, el('span', { class: 'prof-pop-ico' }, icone('livro')), el('span', { class: 'prof-rotulo', text: titulo }), fechar),
      extra && extra.texto ? el('p', { class: 'prof-pop-resumo', text: extra.texto }) : null,
      fos.length ? el('ol', { class: 'prof-pop-lista' }, fos.map(fo => el('li', null,
        el('p', { class: 'prof-pop-titulo' }, el('span', { class: 'prof-pop-n', text: String(numeroFonte(f, fo.id)) }),
          fo.url ? el('a', { href: fo.url, target: '_blank', rel: 'noopener' }, fo.titulo, ' ', icone('link')) : fo.titulo),
        el('p', { class: 'prof-micro', text: metaFonte(fo) }),
        fo.nota ? el('p', { class: 'prof-fontes-nota', text: 'Pendência: ' + fo.nota }) : null))) : null,
      temLista && fos.length ? el('button', { type: 'button', class: 'prof-link-botao prof-pop-lista-todas', onclick: () => { const id = fos[0].id; fecharFonte(); irParaFonte(id); } },
        `Ver na lista das ${total} fontes`, icone('direita')) : null);
    const tecla = e => { if (e.key === 'Escape') fecharFonte(); };
    const fora = e => { if (!caixa.contains(e.target)) fecharFonte(); };
    document.addEventListener('keydown', tecla);
    setTimeout(() => document.addEventListener('click', fora), 0);
    popFonte = { caixa, origem, sair: () => { document.removeEventListener('keydown', tecla); document.removeEventListener('click', fora); } };
    document.body.appendChild(caixa);
    // No computador, o cartão abre junto do pontinho tocado; no celular, sobe do rodapé
    if (origem && innerWidth >= 768) {
      const r = origem.getBoundingClientRect(), w = caixa.offsetWidth, h = caixa.offsetHeight;
      const x = Math.min(Math.max(r.left + r.width / 2 - w / 2, 16), innerWidth - w - 16);
      const y = r.bottom + 10 + h < innerHeight - 16 ? r.bottom + 10 : Math.max(16, r.top - h - 10);
      caixa.classList.add('prof-pop--ancorado'); caixa.style.left = x + 'px'; caixa.style.top = y + 'px';
      const topo0 = r.top;
      const rolou = () => { if (Math.abs(origem.getBoundingClientRect().top - topo0) > 40) fecharFonte(); };
      document.addEventListener('scroll', rolou, { passive: true, capture: true });
      const sair = popFonte.sair; popFonte.sair = () => { sair(); document.removeEventListener('scroll', rolou, { capture: true }); };
    }
    fechar.focus({ preventScroll: true });
  }
  const abrirFonte = (f, id, origem) => abrirFontes(f, [id], origem);
  function prosa(f, textoProsa, ids, classe) { return el('p', { class: classe || 'prof-prosa' }, textoProsa, citar(f, ids)); }

  /* =========================================================
     Roteador
     ========================================================= */
  const limpezas = []; /* listeners de teclado da tela anterior */
  const extensoes = []; /* módulos extras (ex.: js/profissoes-panorama.js) registram { aceita(rota, ix), montar(raiz, rota, ix) } */
  let jaMontou = false; /* o véu de pixels só aparece quando a ficha abre a partir de outra tela da aba */
  async function montar(raiz, rota) {
    const deDentro = jaMontou; jaMontou = true;
    carregarEstado();
    fecharFonte();
    while (limpezas.length) { try { limpezas.pop()(); } catch (e) { /* ignora */ } }
    raiz.textContent = '';
    raiz.classList.add('prof-raiz');
    raiz.classList.remove('prof-raiz--estreita', 'prof-raiz--media', 'prof-raiz--cartas');
    raiz.classList.toggle('prof-raiz--fontes', lerFontes());
    raiz.style.removeProperty('--cor-area');
    document.body.classList.toggle('prof-sem-menu', lerSemMenu()); // "Esconder menu" vale só nesta aba (desmontar tira)
    const r = (rota || 'profissoes').replace(/^#/, '');
    try {
      const ix = await indice();
      if (r === 'profissoes' || r === '') return telaMapa(raiz, ix);
      if (r === 'profissoes-cartas') return telaCartas(raiz, ix);
      if (r === 'profissoes-metodo') return telaMetodo(raiz, ix);
      if (r === 'profissoes-comparar' || r.startsWith('profissoes-comparar-')) return await telaComparar(raiz, ix, r.slice('profissoes-comparar-'.length));
      for (const ext of extensoes) if (ext.aceita(r, ix)) return await ext.montar(raiz, r, ix);
      let m = r.match(/^profissao-(.+)-(dia|mitos)$/);
      if (m) { const f = await ficha(m[1]); if (!f) return naoEncontrada(raiz, m[1], ix); return m[2] === 'dia' ? telaDia(raiz, f, ix) : telaMitos(raiz, f, ix); }
      m = r.match(/^profissao-(.+)$/);
      if (m) { const f = await ficha(m[1]); if (!f) return naoEncontrada(raiz, m[1], ix); telaFicha(raiz, f, ix); if (deDentro) veuDePixels(corArea(ix, f.area)); return; }
      return telaMapa(raiz, ix);
    } catch (e) {
      raiz.appendChild(el('div', { class: 'prof-vazio' }, el('p', { text: 'Não deu para carregar o Mapa das Profissões agora. Tente de novo em instantes.' }), el('p', { class: 'prof-micro', text: String(e.message || e) })));
    }
  }
  /* A ficha que tem um panorama com o mesmo id (Medicina) leva até ele: as especialidades ficam lá */
  function linkPanorama(f, ix) {
    const pn = (ix.panoramas || []).find(x => x.id === f.id);
    const area = pn && ix.areas.find(a => a.panorama && a.panorama.rota === pn.rota);
    if (!pn || !area || !temPanorama(pn)) return null;
    return el('a', { href: '#' + pn.rota, class: 'prof-cab-pan' }, el('span', { class: 'prof-micro', text: 'Explore por dentro' }), el('b', null, area.panorama.titulo, icone('direita')), el('span', { class: 'prof-min', text: area.panorama.frase }));
  }
  function naoEncontrada(raiz, id, ix) {
    const p = ix && ix.profissoes.find(x => x.id === id);
    raiz.classList.add('prof-raiz--estreita');
    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' }));
    raiz.appendChild(el('div', { class: 'prof-vazio' },
      el('h1', { text: p ? p.nome : 'Ficha não encontrada', style: { fontSize: 'var(--t-2xl)', marginBottom: '8px' } }),
      el('p', { text: p ? 'Esta ficha ainda está em produção. Cada ficha passa por pesquisa com fontes oficiais e revisão de um profissional da área antes de ser publicada.' : 'Não existe ficha com esse endereço.' }),
      el('div', { style: { marginTop: '14px' } }, botao('Quero esta ficha', { classe: 'prof-btn--primario', icone: 'estrela', onclick: () => pedir(id, p ? p.nome : id) }))));
  }
  function pedir(id, nome) {
    if (!estado.pedidos.includes(id)) { estado.pedidos.push(id); salvarEstado(); ganchos.registrar('profissao_pedido', { profissao: id }); }
    aviso(`Anotado. ${nome} sobe na fila de produção.`);
  }

  /* =========================================================
     Peças da página (repaginada em 2026-10-16, pedido do usuário: "parece um quadro invisível", "atropelado",
     "pesada", "usar toda a parte que não pega o menu lateral")
     Nada some ao rolar: tudo aparece pronto. Cabeçalho compacto; uma faixa de capítulos presa no topo;
     capítulos em grade que usam a largura toda da aba; "Esconder menu" (só no computador) abre a aba em tela cheia.
     ========================================================= */
  const semMovimento = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const ir = alvo => { if (alvo) alvo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' }); };
  /* "Esconder menu": só neste aparelho (diver-local não vai para a nuvem); o app tira a classe ao sair da aba */
  const CHAVE_SEM_MENU = 'diver-local:v1:profissoes-sem-menu';
  const lerSemMenu = () => { try { return localStorage.getItem(CHAVE_SEM_MENU) === '1'; } catch (e) { return false; } };
  function botaoMenu() {
    const b = el('button', { type: 'button', class: 'prof-menu-alterna' });
    const pintar = () => {
      const sem = document.body.classList.contains('prof-sem-menu');
      b.textContent = ''; b.append(icone(sem ? 'menu' : 'expandir'), sem ? 'Mostrar menu' : 'Esconder menu');
      b.setAttribute('aria-pressed', String(sem));
    };
    b.addEventListener('click', () => {
      const sem = !document.body.classList.contains('prof-sem-menu');
      document.body.classList.toggle('prof-sem-menu', sem);
      try { localStorage.setItem(CHAVE_SEM_MENU, sem ? '1' : '0'); } catch (e) { /* sem armazenamento: vale só agora */ }
      pintar();
    });
    pintar();
    return b;
  }
  /** Linha do topo: voltar (opcional), selo (opcional) e o botão do menu. */
  function topoPagina(voltar, selo) {
    return el('div', { class: 'prof-topo' },
      voltar ? link(voltar.texto, voltar.rota, { classe: 'prof-voltar', icone: 'esquerda' }) : el('span'),
      el('div', { class: 'prof-topo-dir' }, selo || null, botaoMenu()));
  }
  /** Cabeçalho compacto: rótulo, título e frase; o extra fica à direita e as ações numa linha embaixo. */
  function cabecalho(o) {
    const acoes = (o.acoes || []).filter(Boolean);
    return el('header', { class: 'prof-cab' + (o.extra ? ' prof-cab--extra' : '') },
      el('div', { class: 'prof-cab-texto' },
        o.rotulo ? el('span', { class: 'prof-rotulo prof-rotulo--area', text: o.rotulo }) : null,
        el('h1', { text: o.titulo }),
        o.frase ? (o.frase instanceof Node ? o.frase : el('p', { class: 'prof-lead', text: o.frase })) : null),
      o.extra ? el('div', { class: 'prof-cab-lado' }, o.extra) : null,
      acoes.length ? el('div', { class: 'prof-cab-acoes' }, acoes) : null);
  }
  /** Faixa de capítulos presa no topo; o capítulo da vez fica aceso (um observador só, sem conta a cada rolagem). */
  function indiceCapitulos(corpo, rotulo) {
    const caps = [...corpo.querySelectorAll(':scope > .prof-cap')];
    if (caps.length < 2) return;
    const nav = el('nav', { class: 'prof-indice', 'aria-label': rotulo || 'Capítulos' });
    const links = caps.map(c => {
      const a = el('a', { href: '#' + c.id, text: c.querySelector('h2').textContent, onclick: e => { e.preventDefault(); ir(c); } });
      nav.appendChild(a);
      return a;
    });
    corpo.before(nav);
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const i = caps.indexOf(e.target);
      links.forEach((a, k) => { if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      const a = links[i];
      if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: 'auto' });
    }), { rootMargin: '-25% 0px -65% 0px' });
    caps.forEach(c => io.observe(c));
    limpezas.push(() => io.disconnect());
  }
  /** Conta do zero até o número que abre o texto: só no resultado do jogo (quando a pessoa pede o resultado). */
  function contar(alvo, texto) {
    const m = /^(\D*?)(\d[\d.]*)(.*)$/.exec(texto);
    if (!m || semMovimento()) { alvo.textContent = texto; return; }
    const fim = Number(m[2].replace(/\./g, '')), ms = 700, t0 = performance.now();
    const passo = t => {
      const k = Math.min(1, (t - t0) / ms), v = Math.round(fim * (1 - Math.pow(1 - k, 3)));
      alvo.textContent = k < 1 ? m[1] + (m[2].includes('.') ? v.toLocaleString('pt-BR') : String(v)) + m[3] : texto;
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
  /** Os dados de um panorama (Medicina, Tecnologia): uma cópia só para o mapa e para js/profissoes-panorama.js */
  const cachePanoramas = {};
  function dadosPanorama(pn) { if (!cachePanoramas[pn.id]) cachePanoramas[pn.id] = lerJson(BASE + pn.arquivo); return cachePanoramas[pn.id]; }

  /* =========================================================
     Tela: Mapa
     ========================================================= */
  function telaMapa(raiz, ix) {
    ganchos.registrar('profissoes_mapa', {});
    const total = ix.profissoes.length;
    const exploradas = ix.profissoes.filter(p => estado.vistas[p.id]).length;

    raiz.appendChild(topoPagina(null, null));
    const mira = estado.mira.map(id => ix.profissoes.find(x => x.id === id)).filter(Boolean);
    const album = albumSelos(ix, exploradas, total);
    const progresso = el('div', { class: 'prof-mapa-progresso' }, album.envelope,
      mira.length ? el('div', { class: 'prof-mira-linha' }, el('span', { class: 'prof-micro' }, icone('alvo'), 'Na sua mira'),
        el('div', { class: 'prof-chips' }, mira.map(p => link(p.nome, 'profissao-' + p.id, { classe: 'prof-chip prof-chip--link' })))) : null);
    raiz.appendChild(cabecalho({ rotulo: 'Futuro', titulo: 'Mapa das Profissões', frase: fraseQueTroca(), extra: progresso }));
    raiz.appendChild(album.painel);
    raiz.appendChild(faixaAgora(ix));

    // Outros jeitos de explorar
    const atalho = (rota, ic, titulo, texto) => el('a', { href: '#' + rota, class: 'prof-atalho' },
      el('span', { class: 'prof-atalho-ico', 'aria-hidden': 'true' }, icone(ic)),
      el('span', { class: 'prof-atalho-texto' }, el('b', { text: titulo }), el('span', { class: 'prof-min', text: texto })), icone('direita'));
    const atalhos = [
      atalho('profissoes-cartas', 'camadas', 'Maré de cartas', 'Uma profissão por vez: diga o que te interessa.'),
      ix.profissoes.filter(temFicha).length >= 2 ? atalho('profissoes-comparar', 'balanca', 'Comparar duas', 'Duração, salário e DNA lado a lado.') : null,
      ix.profissoes.filter(temFicha).length >= 3 ? atalho('profissoes-fundo', 'ancora', 'Quão fundo é cada carreira', 'Os anos de estudo, do raso ao abismo.') : null,
      atalho('profissoes-metodo', 'info', 'Como fazemos as fichas', 'Fonte oficial e data em cada número.')].filter(Boolean);
    raiz.appendChild(el('nav', { class: 'prof-atalhos', 'aria-label': 'Outros jeitos de explorar' }, el('div', { class: 'prof-atalhos-grade', style: { '--n': String(atalhos.length) } }, atalhos)));

    // Explore por dentro: as carreiras grandes demais para uma ficha só (Medicina, Tecnologia)
    const pans = (ix.panoramas || []).map(pn => ({ pn, area: ix.areas.find(a => a.panorama && a.panorama.rota === pn.rota) })).filter(x => x.area);
    const cartoesPan = pans.map(x => ({ ...x, cartao: cartaoPanorama(x.area, x.pn) }));
    const secPan = pans.length ? el('section', { class: 'prof-bloco-mapa', 'aria-labelledby': 'tit-dentro' },
      el('div', { class: 'prof-cap-cab' }, el('h2', { id: 'tit-dentro', text: 'Explore por dentro' }),
        el('p', { class: 'prof-min', text: 'Algumas carreiras são grandes demais para uma ficha só. Aqui elas se abrem em especialidades e áreas, cada uma com o seu dia a dia.' })),
      el('div', { class: 'prof-panoramas' }, cartoesPan.map(x => x.cartao))) : null;
    if (secPan) raiz.appendChild(secPan);

    // Busca e filtros
    let filtroArea = 'todas', soProntas = false, termo = '';
    const tagsSel = new Set(); // características marcadas (vale a profissão que tem todas)
    const grade = el('div', { class: 'prof-regioes' });
    const busca = el('input', { type: 'search', id: 'prof-busca', placeholder: 'Busque: enfermagem, psiquiatria, programador, RH…', 'aria-label': 'Buscar profissão, especialidade ou área', autocomplete: 'off', oninput: e => { termo = normalizar(e.target.value); render(); } });
    const abas = el('div', { class: 'prof-chips prof-abas', role: 'group', 'aria-label': 'Filtrar por área' });
    const chipTodas = el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': 'true', onclick: () => { filtroArea = 'todas'; render(); } }, 'Todas ', el('span', { class: 'prof-chip-n', text: String(total) }));
    abas.appendChild(chipTodas);
    ix.areas.forEach(a => {
      const n = ix.profissoes.filter(p => p.area === a.id).length;
      if (n || a.panorama) abas.appendChild(el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': 'false', dataset: { area: a.id }, style: { '--cor-area': `var(${a.cor})` }, onclick: () => { filtroArea = a.id; render(); } }, el('i', { class: 'prof-chip-cor', 'aria-hidden': 'true' }), a.nome + ' ', el('span', { class: 'prof-chip-n', text: String(n) })));
    });
    const chipProntas = el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': 'false', text: 'Só com ficha', onclick: () => { soProntas = !soProntas; render(); } });
    // Características (Fase 2): as tags de cada profissão vêm do índice, que o conferir-ficha mantém igual às fichas
    const filtros = ix.filtros || [];
    const caracts = filtros.length ? el('div', { class: 'prof-chips prof-caracts', id: 'prof-caracts', role: 'group', 'aria-label': 'Filtrar por característica', hidden: true },
      el('span', { class: 'prof-micro', text: 'Marque o que importa para você:' }),
      filtros.map(fl => el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': 'false', text: fl.nome, dataset: { tag: fl.id }, onclick: () => { tagsSel.has(fl.id) ? tagsSel.delete(fl.id) : tagsSel.add(fl.id); render(); } }))) : null;
    const rotuloCaract = el('span', { text: 'Características' });
    const btnCaract = caracts ? el('button', { type: 'button', class: 'prof-chip prof-chip--abre', 'aria-expanded': 'false', 'aria-controls': 'prof-caracts',
      onclick: () => { const abrir = caracts.hidden; caracts.hidden = !abrir; btnCaract.setAttribute('aria-expanded', String(abrir)); } }, icone('filtro'), rotuloCaract) : null;
    // Ver como (2026-10-17, inspirado num vídeo que o usuário mandou): cartões, lista em letra grande ou aquário; fica no aparelho
    let vista = lerVista();
    const outra = el('div', { class: 'prof-outra-vista', hidden: true });
    const VISTAS = [['cartoes', 'grade', 'Cartões'], ['lista', 'lista', 'Lista'], ['aquario', 'bolhas', 'Aquário']];
    const botoesVista = VISTAS.map(([id, ic, nome]) => el('button', { type: 'button', class: 'prof-vista-b', 'aria-pressed': String(id === vista),
      onclick: () => { vista = id; try { localStorage.setItem(CHAVE_VISTA, id); } catch (e) { /* vale só agora */ } render(); } }, icone(ic), nome));
    raiz.appendChild(el('section', { class: 'prof-ferramentas', 'aria-label': 'Buscar e filtrar' },
      el('div', { class: 'prof-ferramentas-linha' }, el('div', { class: 'prof-busca' }, icone('busca'), busca), el('div', { class: 'prof-chips' }, btnCaract, chipProntas)),
      abas, caracts,
      el('div', { class: 'prof-vistas' }, el('span', { class: 'prof-micro', id: 'prof-vistas-rot', text: 'Ver como' }),
        el('div', { class: 'prof-vistas-b', role: 'group', 'aria-labelledby': 'prof-vistas-rot' }, botoesVista))));
    raiz.appendChild(grade);
    raiz.appendChild(outra);
    let pararAquario = () => {};
    limpezas.push(() => pararAquario());

    function render() {
      abas.querySelectorAll('.prof-chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      (filtroArea === 'todas' ? chipTodas : abas.querySelector(`[data-area="${filtroArea}"]`)).setAttribute('aria-pressed', 'true');
      chipProntas.setAttribute('aria-pressed', String(soProntas));
      if (caracts) {
        caracts.querySelectorAll('.prof-chip').forEach(c => c.setAttribute('aria-pressed', String(tagsSel.has(c.dataset.tag))));
        rotuloCaract.textContent = tagsSel.size ? `Características (${tagsSel.size})` : 'Características';
        btnCaract.classList.toggle('prof-chip--ativo', tagsSel.size > 0);
      }
      // Os panoramas seguem a área e a busca (o nome de uma especialidade acha o panorama dela)
      let panVisiveis = 0;
      cartoesPan.forEach(x => {
        const ok = !tagsSel.size && (filtroArea === 'todas' || filtroArea === x.area.id) && (!soProntas || temPanorama(x.pn))
          && (!termo || normalizar(`${x.area.nome} ${x.area.panorama.titulo} ${x.area.panorama.frase} ${x.pn.busca || ''}`).includes(termo));
        x.cartao.hidden = !ok; if (ok) panVisiveis++;
      });
      if (secPan) secPan.hidden = !panVisiveis;
      const temTags = p => [...tagsSel].every(tg => (p.tags || []).includes(tg));
      botoesVista.forEach((b, i) => b.setAttribute('aria-pressed', String(VISTAS[i][0] === vista)));
      grade.textContent = ''; outra.textContent = ''; pararAquario(); pararAquario = () => {};
      grade.hidden = vista !== 'cartoes'; outra.hidden = vista === 'cartoes';
      const grupos = [];
      ix.areas.forEach(a => {
        if (filtroArea !== 'todas' && filtroArea !== a.id) return;
        const lista = ix.profissoes.filter(p => p.area === a.id && (!soProntas || temFicha(p)) && temTags(p) && (!termo || normalizar(p.nome + ' ' + (p.busca || '')).includes(termo)));
        if (lista.length) grupos.push({ a, lista });
      });
      const n = grupos.reduce((t, g) => t + g.lista.length, 0), todas = grupos.flatMap(g => g.lista);
      if (vista === 'cartoes') {
        grupos.forEach(({ a, lista }) => grade.appendChild(el('section', { class: 'prof-regiao', dataset: { n: String(lista.length) }, style: { '--cor-area': `var(${a.cor})` }, 'aria-label': a.nome },
          el('div', { class: 'prof-regiao-cab' }, el('h2', null, el('span', { class: 'prof-regiao-cor', 'aria-hidden': 'true' }), a.nome), el('span', { class: 'prof-min', text: `${lista.length} ${lista.length === 1 ? 'profissão' : 'profissões'}` })),
          el('div', { class: 'prof-grade' }, lista.map(p => ilha(p, ix))))));
        colunas();
      } else if (n && vista === 'lista') outra.appendChild(vistaLista(todas, ix));
      else if (n) { const aq = vistaAquario(todas, ix); outra.appendChild(aq.el); pararAquario = aq.parar; }
      const alvo = vista === 'cartoes' ? grade : outra;
      if (!n && !panVisiveis && tagsSel.size) alvo.appendChild(el('div', { class: 'prof-vazio' }, el('p', { text: 'Nenhuma profissão tem todas essas características juntas. Tire uma delas.' }), el('div', { class: 'prof-espaco' }, botao('Limpar características', { classe: 'prof-btn--linha prof-btn--pequeno', onclick: () => { tagsSel.clear(); render(); } }))));
      else if (!n && !panVisiveis) alvo.appendChild(el('div', { class: 'prof-vazio' }, el('p', { text: 'Nenhuma profissão com esse nome por aqui ainda.' }), el('div', { class: 'prof-espaco' }, botao('Pedir esta profissão', { classe: 'prof-btn--linha prof-btn--pequeno', onclick: () => pedir(normalizar(busca.value).replace(/\s+/g, '-'), busca.value || 'essa profissão') }))));
    }
    /* Colunas pela largura de verdade da grade (com ou sem o menu): cada área ocupa as colunas que os cartões dela pedem,
       e as pequenas se encaixam ao lado das grandes (grid denso). Cabeçalhos e cartões de uma mesma linha alinham pelo subgrid. */
    function colunas() {
      const cols = Math.max(1, Math.min(4, Math.floor((grade.clientWidth + 16) / (270 + 16))));
      grade.style.setProperty('--cols', cols);
      grade.querySelectorAll(':scope > .prof-regiao').forEach(r => { r.style.gridColumn = 'span ' + Math.min(Number(r.dataset.n) || 1, cols); });
    }
    render();
    if ('ResizeObserver' in window) { let largura = 0; const ro = new ResizeObserver(() => { if (grade.clientWidth !== largura) { largura = grade.clientWidth; colunas(); } }); ro.observe(grade); limpezas.push(() => ro.disconnect()); }

    // As profissões lado a lado (2026-10-17): duas comparações sem salário (o salário fica para o palpite de cada ficha)
    const ladoALado = el('section', { class: 'prof-bloco-mapa prof-lado', 'aria-labelledby': 'tit-lado', hidden: true });
    raiz.appendChild(ladoALado);
    numerosProf().then(d => montarLadoALado(ladoALado, ix, d));

    raiz.appendChild(el('p', { class: 'prof-fonte-nota prof-rodape' }, 'Fatos das cartas: Censo da Educação Superior 2024 (Inep), leis e decretos federais, Sisu 2026, Google Trends 2021–2026, Novo Caged e Brasscom. Cada ficha traz a lista completa de fontes, com data de consulta. ', link('Veja como fazemos as fichas', 'profissoes-metodo')));
  }
  /** A frase do mapa com a palavra que troca a cada 2,4 s: faz, estuda, vive. A caixa da palavra tem a largura da maior
      (o resto da frase não pula); o leitor de tela ouve a frase inteira; com "reduzir movimento", fica "faz, estuda e vive". */
  function fraseQueTroca() {
    const PALAVRAS = ['faz', 'estuda', 'vive'];
    const resto = ' no dia a dia, com fonte e data em cada número. O Diver informa; quem decide é você.';
    const inteira = 'O que cada profissão faz, estuda e vive' + resto;
    if (semMovimento()) return el('p', { class: 'prof-lead', text: inteira });
    const caixa = el('span', { class: 'prof-troca-palavra' }, PALAVRAS.map(w => el('span', { class: 'prof-troca-medida', text: w })), el('span', { class: 'prof-troca-atual', text: PALAVRAS[0] }));
    const p = el('p', { class: 'prof-lead' }, el('span', { class: 'prof-oculto', text: inteira }), el('span', { 'aria-hidden': 'true' }, 'O que cada profissão ', caixa, resto));
    let i = 0;
    const t = setInterval(() => {
      if (!p.isConnected) { clearInterval(t); return; }
      if (document.hidden) return;
      i = (i + 1) % PALAVRAS.length;
      const velha = caixa.querySelector('.prof-troca-atual:not(.prof-troca-sai)');
      if (velha) { velha.classList.add('prof-troca-sai'); setTimeout(() => velha.remove(), 500); }
      caixa.appendChild(el('span', { class: 'prof-troca-atual prof-troca-entra', text: PALAVRAS[i] }));
    }, 2400);
    limpezas.push(() => clearInterval(t));
    return p;
  }
  /** Véu de pixels na cor da área ao abrir uma ficha vindo de outra tela da aba: os quadradinhos somem em ~0,5 s,
      sem travar nada (não pega clique). Nada com "reduzir movimento". */
  function veuDePixels(cor) {
    if (semMovimento()) return;
    const veu = el('div', { class: 'prof-veu', 'aria-hidden': 'true', style: { '--cor-area': cor } },
      Array.from({ length: 96 }, () => el('i', { style: { '--atraso': Math.round(Math.random() * 220) + 'ms' } })));
    document.body.appendChild(veu);
    setTimeout(() => veu.remove(), 700);
  }

  /* ---------- Mapa: as peças de 2026-10-17 (vídeos de referência do usuário) ---------- */
  const CHAVE_VISTA = 'diver-local:v1:profissoes-vista';
  const lerVista = () => { try { const v = localStorage.getItem(CHAVE_VISTA); return ['cartoes', 'lista', 'aquario'].includes(v) ? v : 'cartoes'; } catch (e) { return 'cartoes'; } };
  /* A inicial de cada palavra que importa ("Medicina Veterinária" → MV; "Direito" → D) */
  const sigla = nome => nome.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /** Álbum de selos: cada ficha aberta vira um selo. No envelope aparecem os últimos quatro; tocar abre o álbum inteiro. */
  function albumSelos(ix, exploradas, total) {
    const ordem = Object.keys(estado.vistas || {}).map(id => ix.profissoes.find(p => p.id === id)).filter(Boolean); // na ordem da primeira visita
    const amostra = ordem.slice(-4);
    const selo = (p, i) => el('span', { class: 'prof-postal', style: { '--cor-area': corArea(ix, p.area), '--i': String(i - (amostra.length - 1) / 2) } }, el('b', { text: sigla(p.nome) }));
    const painel = el('section', { class: 'prof-album', id: 'prof-album', 'aria-label': 'Álbum de selos', hidden: true },
      el('p', { class: 'prof-min', text: exploradas ? 'Cada ficha que você abre vira um selo. Os que faltam estão em cinza: toque para abrir.' : 'Abra a primeira ficha para ganhar o primeiro selo.' }),
      el('ul', { class: 'prof-album-grade' }, ix.profissoes.map(p => {
        const tem = !!estado.vistas[p.id], aberta = temFicha(p);
        const conteudo = [el('span', { class: 'prof-postal prof-postal--grande' + (tem ? '' : ' prof-postal--falta'), 'aria-hidden': 'true' }, el('b', { text: sigla(p.nome) })),
          el('span', { class: 'prof-album-nome', text: p.nome }), el('span', { class: 'prof-micro', text: tem ? 'No álbum' : aberta ? 'Falta' : 'Em breve' })];
        return el('li', { style: { '--cor-area': corArea(ix, p.area) } }, aberta ? el('a', { href: '#profissao-' + p.id, class: 'prof-album-item' }, ...conteudo) : el('span', { class: 'prof-album-item prof-album-item--breve' }, ...conteudo));
      })));
    const envelope = el('button', { type: 'button', class: 'prof-envelope', 'aria-expanded': 'false', 'aria-controls': 'prof-album',
      onclick: () => { const abrir = painel.hidden; painel.hidden = !abrir; envelope.setAttribute('aria-expanded', String(abrir)); if (abrir) ir(painel); } },
      el('span', { class: 'prof-envelope-selos', 'aria-hidden': 'true' }, amostra.map(selo)),
      el('span', { class: 'prof-envelope-frente' },
        el('span', { class: 'prof-envelope-tit' }, icone('estrela'), 'Seu álbum de selos'),
        el('span', { class: 'prof-min' }, el('b', { class: 'prof-num', text: `${exploradas} de ${total}` }), ' profissões exploradas'),
        el('span', { class: 'prof-trilho', 'aria-hidden': 'true' }, el('i', { style: { '--fracao': exploradas / total } }))));
    return { envelope, painel };
  }

  /** "Agora, às 22h": o que cada profissão costuma estar fazendo nesta hora (as cenas do dia das fichas), rolando devagar.
      Com "reduzir movimento", fica parada e rola com o dedo. Muda sozinha na virada da hora. */
  function faixaAgora(ix) {
    const sec = el('section', { class: 'prof-agora', 'aria-labelledby': 'tit-agora', hidden: true });
    let hora = -1;
    const pintar = d => {
      const h = new Date().getHours(); if (h === hora) return; hora = h;
      const itens = ix.profissoes.filter(temFicha).map(p => {
        const cena = d.profissoes[p.id] && (d.profissoes[p.id].agora || []).find(x => h >= x.de && h < x.ate);
        return cena ? { p, texto: cena.texto } : null;
      }).filter(Boolean);
      sec.textContent = '';
      if (!itens.length) { sec.hidden = true; return; }
      const item = (x, copia) => el('a', { href: '#profissao-' + x.p.id, class: 'prof-agora-item', tabindex: copia ? '-1' : null, style: { '--cor-area': corArea(ix, x.p.area) } },
        el('i', { class: 'prof-agora-cor', 'aria-hidden': 'true' }), el('b', { text: x.p.nome }), el('span', { text: x.texto }));
      sec.style.setProperty('--dur', Math.max(60, itens.length * 9) + 's');
      sec.append(el('h2', { class: 'prof-agora-rot', id: 'tit-agora' }, el('span', { class: 'prof-agora-pulso', 'aria-hidden': 'true' }), `Agora, às ${h}h`),
        el('div', { class: 'prof-agora-janela' }, el('div', { class: 'prof-agora-trilho' },
          el('div', { class: 'prof-agora-grupo' }, itens.map(x => item(x))),
          el('div', { class: 'prof-agora-grupo', 'aria-hidden': 'true' }, itens.map(x => item(x, true))))));
      sec.hidden = false;
    };
    numerosProf().then(d => {
      if (!d || !d.profissoes || !sec.isConnected) return;
      pintar(d);
      const t = setInterval(() => { if (sec.isConnected) pintar(d); else clearInterval(t); }, 60000);
      limpezas.push(() => clearInterval(t));
    });
    return sec;
  }

  /** Vista em lista: os nomes em letra grande, um por linha. Com mouse, o cartão da profissão segue o ponteiro;
      no toque, a frase aparece embaixo do nome. */
  function vistaLista(lista, ix) {
    const previa = el('div', { class: 'prof-lg-previa', 'aria-hidden': 'true', hidden: true });
    previa.inert = true;
    let atual = null;
    const mover = e => {
      const w = previa.offsetWidth || 320, h = previa.offsetHeight || 220;
      const x = e.clientX + 24 + w < innerWidth - 8 ? e.clientX + 24 : e.clientX - 24 - w;
      const y = Math.min(Math.max(8, e.clientY - h / 2), innerHeight - h - 8);
      previa.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };
    const itens = lista.map((p, i) => {
      const aberta = temFicha(p);
      const conteudo = [el('span', { class: 'prof-lg-n prof-num', 'aria-hidden': 'true', text: String(i + 1).padStart(2, '0') }),
        el('span', { class: 'prof-lg-texto' }, el('span', { class: 'prof-lg-nome', text: p.nome }), p.frase ? el('span', { class: 'prof-lg-frase', text: p.frase }) : null),
        el('span', { class: 'prof-lg-area' }, el('i', { class: 'prof-regiao-cor', 'aria-hidden': 'true' }), nomeArea(ix, p.area)),
        aberta ? icone('direita') : el('span', { class: 'prof-selo', text: 'Em breve' })];
      const estilo = { '--cor-area': corArea(ix, p.area) };
      const item = aberta ? el('a', { href: '#profissao-' + p.id, class: 'prof-lg-item', style: estilo }, ...conteudo)
        : el('button', { type: 'button', class: 'prof-lg-item prof-lg-item--breve', style: estilo, onclick: () => pedir(p.id, p.nome) }, ...conteudo);
      item.addEventListener('pointerenter', e => {
        if (e.pointerType !== 'mouse') return;
        if (atual !== p.id) { atual = p.id; previa.textContent = ''; previa.appendChild(ilha(p, ix)); }
        previa.hidden = false; mover(e);
      });
      item.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !previa.hidden) mover(e); });
      item.addEventListener('pointerleave', () => { previa.hidden = true; });
      return el('li', null, item);
    });
    return el('div', { class: 'prof-lg-caixa' }, el('ol', { class: 'prof-lg' }, itens), previa);
  }

  /** Vista aquário: cada profissão é uma bolha que boia devagar. Parada com "reduzir movimento", fora da tela ou em
      outra aba. Passar o mouse ou focar mostra a frase embaixo. Devolve { el, parar }. */
  function vistaAquario(lista, ix) {
    const legenda = el('p', { class: 'prof-aquario-legenda', 'aria-live': 'polite', text: 'Passe o mouse, foque ou toque numa bolha.' });
    const bolhas = lista.map(p => {
      const aberta = temFicha(p);
      const conteudo = [el('span', { class: 'prof-bolha-nome', text: p.nome })];
      const estilo = { '--cor-area': corArea(ix, p.area) };
      const b = aberta ? el('a', { href: '#profissao-' + p.id, class: 'prof-bolha', style: estilo }, ...conteudo)
        : el('button', { type: 'button', class: 'prof-bolha prof-bolha--breve', style: estilo, onclick: () => pedir(p.id, p.nome) }, ...conteudo);
      const contar = () => { legenda.textContent = ''; legenda.append(el('b', { text: p.nome }), ` · ${nomeArea(ix, p.area)}`, p.frase ? `: ${p.frase}` : '', aberta ? '' : ' (em breve)'); };
      b.addEventListener('pointerenter', contar); b.addEventListener('focus', contar);
      return { p, b, x: 0, y: 0 };
    });
    const tanque = el('ul', { class: 'prof-aquario-tanque' }, bolhas.map(o => el('li', null, o.b)));
    const caixa = el('div', { class: 'prof-aquario' }, tanque, legenda);
    // semente fixa por profissão: a mesma arrumação toda vez
    const sorte = id => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); };
    let quadro = 0, visivel = true, larguraFeita = 0, t0 = 0;
    let regua2d = null;
    function arrumar() {
      const W = tanque.clientWidth; if (!W || W === larguraFeita) return; larguraFeita = W;
      // o tamanho de cada bolha sai da maior palavra do nome (medida na fonte de verdade): o nome cabe dentro do círculo
      regua2d = regua2d || document.createElement('canvas').getContext('2d');
      regua2d.font = getComputedStyle(bolhas[0].b.querySelector('.prof-bolha-nome')).font;
      bolhas.forEach(o => {
        const maior = Math.max(...o.p.nome.split(/\s+/).map(w => regua2d.measureText(w).width));
        const d = Math.min(176, Math.max(78, maior / 0.7 + 12, Math.sqrt(regua2d.measureText(o.p.nome).width * 36)));
        o.r = d / 2; o.b.style.setProperty('--d', Math.round(d) + 'px');
      });
      const areaTotal = bolhas.reduce((t, o) => t + Math.PI * o.r * o.r, 0);
      const estreito = W < 480, H = Math.max(380, Math.round(areaTotal * (estreito ? 1.9 : 2.3) / W));
      tanque.style.height = H + 'px';
      // começa numa grade com sacudida (as cores se misturam, sempre do mesmo jeito) e afasta as que se encostam
      const ordem = bolhas.map(o => ({ o, k: sorte(o.p.id + 'ordem')() })).sort((a, c) => a.k - c.k).map(x => x.o);
      const cols = Math.max(1, Math.round(Math.sqrt(ordem.length * W / H))), linhas = Math.ceil(ordem.length / cols);
      ordem.forEach((o, i) => {
        const r = sorte(o.p.id);
        o.x = ((i % cols) + 0.5 + (r() - 0.5) * 0.5) * W / cols; o.y = (Math.floor(i / cols) + 0.5 + (r() - 0.5) * 0.5) * H / linhas;
        o.amp = estreito ? 3 + r() * 5 : 5 + r() * 8; o.w = 0.25 + r() * 0.35; o.f = r() * 6.28;
      });
      const prender = o => { const m = o.r * 1.08 + o.amp; o.x = Math.min(W - m, Math.max(m, o.x)); o.y = Math.min(H - m, Math.max(m, o.y)); }; // 1.08: o zoom do mouse
      for (let k = 0; k < 220; k++) {
        for (let i = 0; i < bolhas.length; i++) for (let j = i + 1; j < bolhas.length; j++) {
          const a = bolhas[i], c = bolhas[j], dx = c.x - a.x, dy = c.y - a.y, dist = Math.hypot(dx, dy) || 0.01, min = a.r + c.r + a.amp + c.amp + 6;
          if (dist < min) { const m = (min - dist) / 2, ux = dx / dist, uy = dy / dist; a.x -= ux * m; a.y -= uy * m; c.x += ux * m; c.y += uy * m; }
        }
        bolhas.forEach(prender);
      }
      bolhas.forEach(o => { o.ax = o.x; o.ay = o.y; });
      pintar(0);
    }
    function pintar(t) {
      const mexe = !semMovimento();
      bolhas.forEach(o => {
        const x = o.ax + (mexe ? Math.sin(t * o.w + o.f) * o.amp : 0), y = o.ay + (mexe ? Math.cos(t * o.w * 0.8 + o.f) * o.amp * 0.7 : 0);
        o.b.style.transform = `translate(${(x - o.r).toFixed(1)}px, ${(y - o.r).toFixed(1)}px)`;
      });
    }
    const passo = agora => { quadro = 0; if (!visivel || document.hidden || semMovimento()) return; if (!t0) t0 = agora; pintar((agora - t0) / 1000); quadro = requestAnimationFrame(passo); };
    const andar = () => { if (!quadro && !semMovimento()) quadro = requestAnimationFrame(passo); };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(e => { visivel = e[0].isIntersecting; if (visivel) andar(); }) : null;
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { arrumar(); }) : null;
    const aba = () => { if (!document.hidden) andar(); };
    requestAnimationFrame(() => { arrumar(); andar(); });
    if (io) io.observe(tanque); if (ro) ro.observe(tanque);
    document.addEventListener('visibilitychange', aba);
    const parar = () => { if (quadro) cancelAnimationFrame(quadro); quadro = 0; visivel = false; if (io) io.disconnect(); if (ro) ro.disconnect(); document.removeEventListener('visibilitychange', aba); };
    return { el: caixa, parar };
  }
  /** "As profissões lado a lado": quanto dura a graduação e onde dá para estudar a distância, com as fichas que a pessoa pode abrir.
      Os dados vêm de numeros.json (gerado das fichas). Com menos de 3 fichas abertas, o bloco não aparece. */
  function montarLadoALado(sec, ix, d) {
    if (!d || !d.profissoes || !sec.isConnected) return;
    const abertas = ix.profissoes.filter(temFicha).map(p => ({ p, n: d.profissoes[p.id] })).filter(x => x.n);
    if (abertas.length < 3) return;
    const juntar = nomes => nomes.length < 2 ? nomes.join('') : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
    const chip = ({ p }) => el('a', { href: '#profissao-' + p.id, class: 'prof-lado-chip', style: { '--cor-area': corArea(ix, p.area) } }, p.nome);
    const linha = (rotulo, lista, max) => el('li', { class: 'prof-lado-linha' },
      el('div', { class: 'prof-lado-rot' },
        el('b', { text: rotulo }),
        el('span', { class: 'prof-micro', text: `${lista.length} ${lista.length === 1 ? 'profissão' : 'profissões'}` }),
        el('span', { class: 'prof-lado-barra', 'aria-hidden': 'true' }, el('i', { style: { '--p': lista.length / max } }))),
      el('div', { class: 'prof-lado-chips' }, lista.map(chip)));
    const agrupar = chave => { const g = {}; abertas.forEach(x => { const k = chave(x.n); if (k != null) (g[k] = g[k] || []).push(x); }); return g; };
    const porAnos = agrupar(n => n.graduacao_anos), anos = Object.keys(porAnos).map(Number).sort((a, b) => a - b);
    const maxAnos = Math.max(...anos.map(a => porAnos[a].length));
    const curtos = abertas.filter(x => x.n.caminho_curto).map(x => x.p.nome);
    const FORMATOS = [['presencial', 'Só presencial'], ['semi', 'Presencial ou semi\u00ADpresencial'], ['ead', 'Também a distância'], ['depende', 'Depende do curso']];
    const porFormato = agrupar(n => n.formato), formatos = FORMATOS.filter(([k]) => porFormato[k]);
    const maxFormato = Math.max(...formatos.map(([k]) => porFormato[k].length));
    const fontes = d.fontes_mapa || {};
    sec.append(
      el('div', { class: 'prof-cap-cab' }, el('h2', { id: 'tit-lado', text: 'As profissões lado a lado' }),
        el('p', { class: 'prof-min', text: 'Quanto dura a graduação e onde dá para estudar a distância. Toque numa profissão para abrir a ficha.' })),
      el('div', { class: 'prof-grade-2' },
        el('figure', { class: 'prof-caixa prof-lado-fig' },
          el('figcaption', null, el('b', { text: 'Quanto dura a graduação' }), el('span', { class: 'prof-micro', text: 'Duração mínima do curso principal de cada profissão.' })),
          el('ol', { class: 'prof-lado-lista' }, anos.map(a => linha(`${a} anos`, porAnos[a], maxAnos))),
          curtos.length ? el('p', { class: 'prof-micro prof-espaco', text: `${juntar(curtos)} também ${curtos.length === 1 ? 'tem' : 'têm'} um caminho mais curto, de técnico ou tecnólogo: veja a linha do tempo na ficha.` }) : null,
          fontes.duracao ? fonteLinha({}, [], fontes.duracao + '.') : null),
        el('figure', { class: 'prof-caixa prof-lado-fig' },
          el('figcaption', null, el('b', { text: 'Onde dá para estudar a distância' }), el('span', { class: 'prof-micro', text: 'Formato em que o curso pode ser oferecido, pelas regras de 2025.' })),
          el('ol', { class: 'prof-lado-lista' }, formatos.map(([k, rotulo]) => linha(rotulo, porFormato[k], maxFormato))),
          fontes.formato ? fonteLinha({}, [], fontes.formato + '.') : null)));
    sec.hidden = false;
  }
  /* Panorama de uma área (Medicina, Tecnologia): cartão grande com as primeiras especialidades pelo apelido
     (aberto para a equipe; "Em breve" para o aluno enquanto é rascunho) */
  function cartaoPanorama(a, pn) {
    const aberto = temPanorama(pn);
    const apelidos = el('div', { class: 'prof-pan-apelidos', 'aria-hidden': 'true' });
    const conteudo = [
      el('span', { class: 'prof-rotulo prof-rotulo--area', text: a.nome }),
      el('h3', { text: a.panorama.titulo }),
      el('p', { text: a.panorama.frase }),
      apelidos,
      el('span', { class: 'prof-pan-pe' }, aberto
        ? [el('span', { class: 'prof-selo prof-selo--pronta', text: pn.status === 'publicada' ? 'Aberto' : 'Em revisão' }), el('span', { class: 'prof-pan-ir' }, 'Explorar', icone('direita'))]
        : [el('span', { class: 'prof-selo', text: 'Em breve' }), el('span', { class: 'prof-min', text: 'Toque para pedir prioridade' })])];
    const estilo = { '--cor-area': `var(${a.cor})` };
    const cartao = aberto ? el('a', { href: '#' + a.panorama.rota, class: 'prof-pan', style: estilo }, ...conteudo)
      : el('button', { type: 'button', class: 'prof-pan prof-pan--breve', style: estilo, onclick: () => pedir(pn.id, a.panorama.titulo) }, ...conteudo);
    if (aberto) dadosPanorama(pn).then(t => {
      apelidos.append(el('b', { class: 'prof-num', text: `${t.areas.length} ${t.rotulo_areas || 'áreas'}` }), ...t.areas.slice(0, 4).map(x => el('span', { text: x.apelido })), el('span', { text: 'e mais' }));
    }).catch(() => { /* sem os apelidos, o cartão continua */ });
    return cartao;
  }
  /** O cartão de cada profissão no mapa: o mesmo desenho dos panoramas (pedido do usuário, 2026-10-17: "todos iguais aos
      de Tecnologia e Medicina"). A área, o nome, a frase, as etiquetas (duração, formato e registro; salário nunca) e, no pé,
      a situação e "Abrir a ficha". As etiquetas vêm de numeros.json e chegam depois; o cartão já aparece sem elas. */
  const FORMATO_CURTO = { presencial: 'Presencial', semi: 'Presencial ou semi', ead: 'Também a distância', depende: 'Depende do curso' };
  const registroCurto = r => !r ? null : /^(sem|não)\b/i.test(r) ? 'Sem conselho' : r;
  function ilha(p, ix) {
    const aberta = temFicha(p), naMira = estado.mira.includes(p.id), vista = !!estado.vistas[p.id];
    const selo = !aberta ? el('span', { class: 'prof-selo', text: 'Em breve' })
      : naMira ? el('span', { class: 'prof-selo prof-selo--mira' }, icone('alvo'), 'Na mira')
      : vista ? el('span', { class: 'prof-selo prof-selo--vista' }, icone('certo'), 'Explorada')
      : el('span', { class: 'prof-selo prof-selo--pronta', text: p.status === 'publicada' ? 'Ficha pronta' : 'Em revisão' });
    const etiquetas = el('div', { class: 'prof-pan-apelidos' });
    numerosProf().then(d => {
      const n = d && d.profissoes && d.profissoes[p.id]; if (!n) return;
      etiquetas.append(...[n.duracao ? el('b', { class: 'prof-num', text: n.duracao }) : null,
        FORMATO_CURTO[n.formato] ? el('span', { text: FORMATO_CURTO[n.formato] }) : null,
        registroCurto(n.registro) ? el('span', { text: registroCurto(n.registro) }) : null].filter(Boolean));
    });
    const conteudo = [
      el('span', { class: 'prof-rotulo prof-rotulo--area', text: nomeArea(ix, p.area) }),
      el('h3', { text: p.nome }),
      el('p', { text: p.frase || 'Ficha em produção.' }),
      etiquetas,
      el('span', { class: 'prof-pan-pe' }, selo, el('span', { class: 'prof-pan-ir' }, aberta ? 'Abrir a ficha' : 'Pedir prioridade', icone(aberta ? 'direita' : 'estrela')))];
    const estilo = { '--cor-area': corArea(ix, p.area) };
    if (aberta) return el('a', { href: '#profissao-' + p.id, class: 'prof-pan prof-pan--ficha', style: estilo }, ...conteudo);
    return el('button', { type: 'button', class: 'prof-pan prof-pan--ficha prof-pan--breve', style: estilo, onclick: () => pedir(p.id, p.nome) }, ...conteudo);
  }

  /* =========================================================
     Tela: Ficha em formato de relatório (2026-10-17, pedido do usuário: "olha esses que a Globo faz").
     Capa com "Em números", "Ver resumo", capítulos numerados em faixas, uma frase-tese por capítulo
     (f.manchetes, opcional) e um gráfico diferente em cada bloco, com "Fonte:" embaixo.
     O conteúdo é o do JSON da ficha; os números que comparam profissões vêm de numeros.json.
     ========================================================= */
  function telaFicha(raiz, f, ix) {
    estado.vistas[f.id] = (estado.vistas[f.id] || 0) + 1; salvarEstado();
    ganchos.registrar('profissao_vista', { profissao: f.id });
    if (!estado.salarioRevelado) estado.salarioRevelado = {};
    raiz.style.setProperty('--cor-area', corArea(ix, f.area));
    const S = f.secoes || {}, M = f.manchetes || {}, nums = f.numeros || {};

    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' },
      f.status !== 'publicada' ? el('span', { class: 'prof-selo prof-selo--rascunho', text: f.revisao && f.revisao.profissional === 'ok' ? 'Validada' : 'Em revisão por profissional' }) : null));

    // ---------- Capa: título e ações à esquerda; "Em números" à direita (no lugar da foto dos relatórios) ----------
    const vizComFicha = (S.vizinhas || []).map(v => ix.profissoes.find(x => x.id === v.id)).find(p => temFicha(p));
    const btnMira = botao(estado.mira.includes(f.id) ? 'Na mira' : 'Pôr na mira', { classe: 'prof-btn--linha prof-btn--mira', icone: estado.mira.includes(f.id) ? 'certo' : 'alvo', pressed: String(estado.mira.includes(f.id)), onclick: () => alternarMira(f, btnMira) });
    const acoes = [
      f.dia ? link('Viver um dia', 'profissao-' + f.id + '-dia', { classe: 'prof-btn prof-btn--primario', icone: 'play' }) : null,
      btnMira,
      f.mitos && f.mitos.length ? link('Mito ou verdade', 'profissao-' + f.id + '-mitos', { classe: 'prof-btn prof-btn--linha', icone: 'dado' }) : null,
      vizComFicha ? link('Comparar', `profissoes-comparar-${f.id}--${vizComFicha.id}`, { classe: 'prof-btn prof-btn--linha', icone: 'balanca' }) : null].filter(Boolean);
    const linhaNumero = (rotulo, n) => linhaEmNumeros(rotulo, n.valor.replace(/semipresencial/g, 'semi\u00adpresencial'), n.detalhe, citar(f, n.fontes));
    // O salário fica para o palpite (capítulo "O dinheiro"); aqui só o convite, e depois dele a média
    const linhaSalario = el('div', { class: 'prof-emnum-linha prof-emnum-linha--salario' });
    const pintarSalario = () => {
      const n = nums.salario; linhaSalario.textContent = ''; if (!n) { linhaSalario.hidden = true; return; }
      const visto = (estado.salarioRevelado[f.id] || 0) > 0;
      linhaSalario.append(el('dt', { text: visto ? 'Média de contratação' : 'Quanto ganha?' }),
        el('dd', null,
          visto ? el('b', { class: 'prof-emnum-salario', text: n.valor }) : el('button', { type: 'button', class: 'prof-link-botao prof-emnum-palpite', onclick: () => ir(document.getElementById('sec-dinheiro')) }, icone('alvo'), 'Dar meu palpite primeiro'),
          el('span', { class: 'prof-micro' }, visto ? n.detalhe : 'Antes do número, arraste a régua até o seu palpite.', visto ? citar(f, n.fontes) : null)));
    };
    pintarSalario();
    // "Ver resumo": as frases-tese (ou, sem elas, os fatos centrais da ficha); fica na coluna da capa
    raiz.appendChild(capaRelatorio({
      rotulo: nomeArea(ix, f.area), titulo: f.nome, frase: f.frase,
      meta: [f.conferido_em ? `Ficha conferida em ${dataBR(f.conferido_em)}` : null, 'Mapa das Profissões do Diver'],
      fontes: (f.fontes || []).length ? botaoFontes((f.fontes || []).length) : null,
      acoes, resumo: caixaResumo(resumoDe(f), 'desta ficha', { fonte: f, nome: f.nome }),
      numeros: [...[['duracao', 'Duração'], ['formato', 'Formato'], ['registro', 'Registro profissional']].filter(([k]) => nums[k]).map(([k, r]) => linhaNumero(r, nums[k])), linhaSalario],
      pe: linkPanorama(f, ix) }));

    const corpo = el('div', { class: 'prof-corpo' });
    raiz.appendChild(corpo);
    let n = 0;
    const cap = (id, titulo, sub, ...conteudo) => corpo.appendChild(capituloRelatorio(f, ++n, id, titulo, M[id], sub, ...conteudo));

    // ---------- 01. O trabalho: o que faz × o que não faz; o dia em 24 horas ----------
    const trabalho = [];
    if (S.o_que_faz) trabalho.push(el('div', { class: 'prof-grade-2 prof-versus' },
      el('div', { class: 'prof-versus-card prof-versus-card--sim' }, el('p', { class: 'prof-versus-tit' }, icone('certo'), 'O que faz'), prosa(f, S.o_que_faz.texto, S.o_que_faz.fontes)),
      S.o_que_faz.nao_faz ? el('div', { class: 'prof-versus-card prof-versus-card--nao' }, el('p', { class: 'prof-versus-tit' }, icone('x'), 'O que não faz'), prosa(f, S.o_que_faz.nao_faz, S.o_que_faz.fontes)) : null));
    // em caixa, com o título na mesma altura do das 24 horas ao lado
    const diaTexto = S.dia_a_dia ? el('div', { class: 'prof-caixa prof-dia-texto' },
      el('div', { class: 'prof-dia-texto-cab' }, el('h3', { text: 'Um dia de trabalho' }),
        S.dia_a_dia.revisar_com_profissional ? el('span', { class: 'prof-micro', text: 'Descrição típica, em revisão com profissionais da área.' }) : null),
      prosa(f, S.dia_a_dia.texto, S.dia_a_dia.fontes),
      f.dia ? el('div', { class: 'prof-espaco' }, link('Viver ' + f.dia.titulo.charAt(0).toLowerCase() + f.dia.titulo.slice(1), 'profissao-' + f.id + '-dia', { classe: 'prof-btn prof-btn--linha', icone: 'play' })) : null) : null;
    const dia24 = f.agora && f.agora.length ? linhaDoDia(f) : null;
    if (diaTexto || dia24) trabalho.push(el('div', { class: 'prof-grade-2 prof-rel-espaco' }, diaTexto, dia24));
    if (trabalho.length) cap('trabalho', 'O trabalho', null, ...trabalho);

    // ---------- 02. A formação: o que estuda, como entrar e a linha do tempo até trabalhar ----------
    const formacao = [];
    if (S.o_que_estuda || S.como_entrar) formacao.push(el('div', { class: 'prof-grade-2' },
      S.o_que_estuda ? el('div', { class: 'prof-caixa' }, el('h3', { text: 'O que estuda' }), prosa(f, S.o_que_estuda.texto, S.o_que_estuda.fontes),
        S.o_que_estuda.disciplinas ? el('div', { class: 'prof-chips-lista' }, S.o_que_estuda.disciplinas.map(d => el('span', { text: d }))) : null) : null,
      S.como_entrar ? el('div', { class: 'prof-caixa' }, el('h3', { text: 'Como entrar' }), prosa(f, S.como_entrar.texto, S.como_entrar.fontes),
        S.como_entrar.materias_chave ? el('div', null, el('p', { class: 'prof-min prof-espaco', text: 'Matérias que mais pesam. Toque para estudar no Diver:' }),
          el('div', { class: 'prof-chips-lista' }, S.como_entrar.materias_chave.map(m => el('a', { href: '#', onclick: e => { e.preventDefault(); ganchos.registrar('profissao_materias_chave', { profissao: f.id, curso: m }); ganchos.abrirCurso(m); } }, icone('livro'), ganchos.nomeCurso(m))))) : null) : null));
    if (f.formacao && f.formacao.etapas && f.formacao.etapas.length) formacao.push(ganttFormacao(f));
    if (formacao.length) cap('formacao', 'A formação', null, ...formacao);

    // ---------- 03. O dinheiro: o palpite e, depois dele, todos os valores ----------
    if (S.quanto_ganha) cap('dinheiro', 'O dinheiro', 'Salário-base de quem foi contratado com carteira. Adicionais não entram.', blocoSalario(f, S.quanto_ganha, pintarSalario));

    // ---------- 04. O mercado: o número grande, o ranking, onde se busca e o "Você sabia?" ----------
    const mercado = [], ctx = f.contexto || {};
    const nMat = ctx.matriculas_2024 || ctx.matriculas_ead_2024;
    if (nMat) mercado.push(faixaNumero({
      valor: `${Math.round(nMat / 1000).toLocaleString('pt-BR')} mil`,
      rotulo: ctx.matriculas_2024 ? 'matrículas em 2024' : 'matrículas a distância em 2024',
      texto: ctx.texto, cit: citar(f, ctx.fontes), fonte: fonteLinha(f, ctx.fontes) }));
    const ranking = el('div', { class: 'prof-rel-espaco', hidden: true });
    if (ctx.posicao_ranking_matriculas) {
      mercado.push(ranking);
      numerosProf().then(d => { if (d && d.matriculas_2024 && d.matriculas_2024.itens.some(x => x.id === f.id)) { ranking.appendChild(rankingMatriculas(f, ix, d.matriculas_2024)); ranking.hidden = false; } });
    }
    let buscas = null;
    if (f.trends_id) { buscas = el('div', { class: 'prof-rel-espaco' }, el('p', { class: 'prof-min prof-carregando', text: 'Carregando dados de busca…' })); mercado.push(buscas); }
    if (f.carta) mercado.push(el('aside', { class: 'prof-banda prof-rel-espaco' }, el('p', { class: 'prof-banda-rot', text: 'Você sabia?' }), el('p', { class: 'prof-banda-texto' }, f.carta.fato, citar(f, f.carta.fontes))));
    if (mercado.length) cap('mercado', 'O mercado', null, ...mercado);
    if (buscas) trends().then(t => blocoBuscas(buscas, f, t));

    // ---------- 05. A carreira: outros caminhos e profissões vizinhas ----------
    const carreira = [];
    if (S.caminhos) carreira.push(el('h3', { class: 'prof-sub', text: 'Outros caminhos' }), el('div', { class: 'prof-cards' }, S.caminhos.itens.map(c => el('div', { class: 'prof-caixa' }, el('h3', { text: c.titulo }), el('p', null, c.texto, citar(f, c.fontes))))));
    if (S.vizinhas) carreira.push(el('h3', { class: 'prof-sub', text: 'Profissões vizinhas' }), el('p', { class: 'prof-min prof-espaco-b', text: 'Para quem está em dúvida entre duas.' }),
      el('div', { class: 'prof-cards' }, S.vizinhas.map(v => {
        const p = ix.profissoes.find(x => x.id === v.id);
        if (temFicha(p)) return el('a', { href: '#profissao-' + p.id, class: 'prof-caixa prof-vizinha' }, el('h3', null, p.nome, icone('direita')), el('p', { text: v.diferenca }));
        return el('div', { class: 'prof-caixa' }, el('h3', { text: p ? p.nome : v.id }), el('p', { text: v.diferenca }), p ? el('p', { class: 'prof-micro prof-espaco-p', text: 'Ficha em breve' }) : null);
      })),
      vizComFicha ? el('div', { class: 'prof-espaco' }, link(`Comparar com ${vizComFicha.nome}`, `profissoes-comparar-${f.id}--${vizComFicha.id}`, { classe: 'prof-btn prof-btn--linha', icone: 'balanca' })) : null);
    if (carreira.length) cap('carreira', 'A carreira', null, ...carreira);

    // ---------- 06. O que ninguém te conta: tudo à vista, numerado ----------
    if (S.ninguem_conta) cap('ninguem', 'O que ninguém te conta', 'Os pontos difíceis, sem rodeio.', calloutsNumerados(f, S.ninguem_conta.itens));

    // ---------- 07. Combina com você? DNA e o dilema ----------
    const combina = [];
    if (f.dna && IG()) combina.push(el('h3', { class: 'prof-sub', text: 'DNA da profissão' }), el('p', { class: 'prof-min', text: f.dna_calibrado ? 'Calibrado com profissionais da área.' : 'Estimativa inicial, a calibrar com profissionais da área.' }), blocoDna(f, ix));
    if (f.dilemas && f.dilemas.length) combina.push(el('h3', { class: 'prof-sub', text: 'O que você faria?' }), el('p', { class: 'prof-min', text: 'Um dilema real da profissão. Vote e veja o que a lei diz.' }), blocoDilema(f, f.dilemas[0]));
    if (combina.length) cap('combina', 'Combina com você?', null, ...combina);

    // ---------- Fontes: guardadas; a lista abre no botão ----------
    cap('fontes', 'Fontes', `Conferidas em ${dataBR(f.conferido_em)}. Toque no pontinho depois de uma informação para ver de onde ela vem, ou em "Mostrar as fontes", no topo, para ver todas.`,
      ...fontesGuardadas(f, f.fontes || [], `Ver as ${(f.fontes || []).length} fontes desta ficha`),
      el('div', { class: 'prof-revisao' },
        el('span', { class: f.revisao && f.revisao.fontes === 'conferidas' ? 'ok' : 'pendente' }, icone(f.revisao && f.revisao.fontes === 'conferidas' ? 'certo' : 'relogio'), 'Fontes: ' + (f.revisao ? f.revisao.fontes : 'pendente')),
        el('span', { class: f.revisao && f.revisao.ia === 'ok' ? 'ok' : 'pendente' }, icone(f.revisao && f.revisao.ia === 'ok' ? 'certo' : 'relogio'), 'Validação por IA (Mergulho Triplo): ' + (f.revisao ? f.revisao.ia : 'pendente')),
        el('span', { class: f.revisao && f.revisao.profissional === 'ok' ? 'ok' : 'pendente' }, icone(f.revisao && f.revisao.profissional === 'ok' ? 'certo' : 'relogio'), f.revisao && f.revisao.profissional === 'ok' ? `Revisada por ${f.revisao.revisor} em ${dataBR(f.revisao.data)}` : 'Revisão por profissional da área: pendente')),
      el('p', { class: 'prof-fonte-nota' }, 'Achou um erro? Conte para a equipe do Diver: a correção entra na fila de revisão. ', link('Como fazemos as fichas', 'profissoes-metodo')));

    indiceCapitulos(corpo, 'Capítulos da ficha');
  }

  /* ---------- Peças do relatório ---------- */
  /** Capa dos relatórios (ficha, panorama e cada área de um panorama): o texto e as ações à esquerda; "Em números" à direita, no lugar da foto. */
  function capaRelatorio(o) {
    const acoes = (o.acoes || []).filter(Boolean), numeros = (o.numeros || []).filter(Boolean);
    return el('header', { class: 'prof-capa' + (numeros.length ? '' : ' prof-capa--so-texto') },
      el('div', { class: 'prof-capa-texto' },
        o.rotulo ? el('span', { class: 'prof-rotulo prof-rotulo--area', text: o.rotulo }) : null,
        el('h1', { text: o.titulo }),
        o.frase ? el('p', { class: 'prof-lead', text: o.frase }) : null,
        o.meta ? el('p', { class: 'prof-capa-meta', text: o.meta.filter(Boolean).join(' · ') }) : null,
        o.fontes ? el('p', { class: 'prof-capa-meta prof-capa-fontes' }, o.fontes) : null,
        acoes.length ? el('div', { class: 'prof-cab-acoes' }, acoes) : null,
        o.resumo || null),
      numeros.length ? el('aside', { class: 'prof-emnum', 'aria-labelledby': 'prof-emnum-tit' },
        el('p', { class: 'prof-emnum-tit', id: 'prof-emnum-tit', text: 'Em números' }),
        el('dl', null, numeros),
        o.pe || null) : null);
  }
  /** Uma linha do "Em números": o rótulo, o valor em destaque (texto ou um elemento pronto) e o detalhe com a fonte. */
  function linhaEmNumeros(rotulo, valor, detalhe, cit) {
    return el('div', { class: 'prof-emnum-linha' },
      el('dt', { text: rotulo }),
      el('dd', null, valor instanceof Node ? valor : el('b', { text: valor }), el('span', { class: 'prof-micro' }, detalhe || '', cit || null)));
  }
  /** "Ver resumo" (2026-10-17, inspirado num vídeo que o usuário mandou): um baralho de cartas em pé, uma por frase-tese,
      com o texto em dois tons, o número grande que conta, a borda acesa na cor da área e a troca em fatia.
      itens = [{ rotulo, icone, alvo, titulo, texto, ids, semNumero }]; o = { fonte (quem tem a lista de fontes), nome } */
  function caixaResumo(itens, deQue, o) {
    if (!itens.length) return null;
    const b = el('button', { type: 'button', class: 'prof-resumo prof-resumo-abre', 'aria-haspopup': 'dialog' },
      el('span', { class: 'prof-resumo-rot' }, icone('livro'), 'Ver resumo'), el('span', { class: 'prof-micro', text: `${itens.length} cartas ${deQue}` }), icone('direita'));
    b.addEventListener('click', () => baralhoResumo(itens, Object.assign({ origem: b }, o || {})));
    return b;
  }
  /* O número grande de cada carta: o primeiro número do texto, com a palavra que vem depois ("7.200 horas", "284 mil") */
  const UNIDADES_CARTA = 'horas|anos|vagas|candidatos|estudantes|pessoas|profissionais|especialistas|cursos|pontos|desligamentos|matrículas|residentes';
  const RE_NUMERO_CARTA = new RegExp(`(R\\$\\s?)?(\\d{1,3}(?:\\.\\d{3})+|\\d+(?:,\\d+)?)(?:\\sa\\s(\\d+(?:,\\d+)?))?(\\s?%|º|ª)?(\\s(?:mil|milhões|milhão))?(?:\\s(${UNIDADES_CARTA})(?![\\wÀ-ú]))?`, 'g');
  function numeroDaCarta(it) {
    if (it.semNumero) return null;
    const txt = `${it.titulo || ''} ${it.texto || ''}`;
    for (const m of txt.matchAll(RE_NUMERO_CARTA)) {
      const [todo, real, n, ate, marca, mil, unidade] = m, pct = !!marca && marca.trim() === '%';
      if (real || txt[m.index - 1] === '/' || txt[m.index + todo.length] === '/') continue; // dinheiro (é do palpite) e datas (set/2024)
      if (marca && !pct) continue; // ordinal ("4º curso"): fica o ícone
      if (!pct && !mil && !unidade) continue; // ano solto ("Desde 2025") ou número sem dizer do quê
      return { valor: n + (ate ? ' a ' + ate : '') + (pct ? '%' : '') + (mil || ''), unidade: unidade || '' };
    }
    return null;
  }
  function baralhoResumo(itens, o) {
    let atual = 0, trocando = false;
    const fonte = o.fonte || { fontes: [] };
    const palco = el('div', { class: 'prof-rc-palco', 'aria-live': 'polite' });
    const pontos = itens.map((_, i) => el('button', { type: 'button', class: 'prof-rc-ponto', 'aria-label': `Carta ${i + 1} de ${itens.length}`, onclick: () => virar(i) }, el('i')));
    const ant = el('button', { type: 'button', class: 'prof-rc-seta', 'aria-label': 'Carta anterior', onclick: () => virar(atual - 1) }, icone('esquerda'));
    const prox = el('button', { type: 'button', class: 'prof-rc-seta', 'aria-label': 'Próxima carta', onclick: () => virar(atual + 1) }, icone('direita'));
    const fechar = el('button', { type: 'button', class: 'prof-pop-fechar', 'aria-label': 'Fechar o resumo', onclick: () => sair() }, icone('x'));
    const caixa = el('div', { class: 'prof-rc', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Resumo${o.nome ? ' de ' + o.nome : ''}`, tabindex: '-1' },
      el('div', { class: 'prof-rc-topo' }, el('span', { class: 'prof-rotulo', text: `Resumo${o.nome ? ' · ' + o.nome : ''}` }), fechar),
      palco,
      el('div', { class: 'prof-rc-nav' }, ant, el('div', { class: 'prof-rc-pontos' }, pontos), prox),
      el('p', { class: 'prof-micro prof-rc-dica', text: 'Arraste a carta para o lado ou use as setas.' }));
    // fora da raiz da aba: leva a cor da área e o "Mostrar as fontes" junto
    const fundo = el('div', { class: 'prof-rc-fundo' + (o.origem.closest('.prof-raiz--fontes') ? ' prof-raiz--fontes' : ''), style: { '--cor-area': getComputedStyle(o.origem).getPropertyValue('--cor-area').trim() || 'var(--turquesa)' } }, caixa);
    function carta(i) {
      const it = itens[i], n = numeroDaCarta(it);
      const num = n ? el('b', { class: 'prof-num' }) : null;
      const c = el('article', { class: 'prof-carta-r' },
        el('div', { class: 'prof-carta-r-topo' }, el('span', { text: String(i + 1).padStart(2, '0') + (it.rotulo ? ' · ' + it.rotulo : '') }), el('span', { text: `${i + 1} de ${itens.length}` })),
        el('p', { class: 'prof-carta-r-texto' }, it.titulo ? el('b', { text: it.titulo + ' ' }) : null, el('span', { text: it.texto || '' }), citar(fonte, it.ids)),
        el('div', { class: 'prof-carta-r-meio', 'aria-hidden': 'true' }, n ? num : icone(it.icone || 'livro'), n && n.unidade ? el('span', { text: n.unidade }) : null),
        it.alvo && document.getElementById(it.alvo) ? el('button', { type: 'button', class: 'prof-link-botao prof-carta-r-ir', onclick: () => { const alvo = document.getElementById(it.alvo); sair(); ir(alvo); } }, 'Ler o capítulo', icone('direita')) : null);
      if (num) { if (n.valor.includes(' a ')) num.textContent = n.valor; else contar(num, n.valor); } // conta de zero até o número (direto numa faixa e com "reduzir movimento")
      return c;
    }
    function pintarNav() {
      pontos.forEach((p, k) => p.setAttribute('aria-current', String(k === atual)));
      ant.disabled = atual === 0; prox.disabled = atual === itens.length - 1;
    }
    function virar(i) {
      if (i < 0 || i >= itens.length || i === atual || trocando) return;
      const dir = i > atual ? 1 : -1; atual = i;
      const nova = carta(i), velha = palco.firstChild;
      pintarNav();
      if (!velha || semMovimento()) { palco.textContent = ''; palco.appendChild(nova); return; }
      // a troca em fatia: a carta nova entra como uma cortina, da direita (ou da esquerda, voltando)
      trocando = true;
      nova.classList.add(dir > 0 ? 'prof-carta-r--entra' : 'prof-carta-r--volta');
      palco.appendChild(nova);
      const fim = () => { trocando = false; nova.classList.remove('prof-carta-r--entra', 'prof-carta-r--volta'); if (velha.isConnected) velha.remove(); };
      nova.addEventListener('animationend', fim, { once: true }); setTimeout(() => { if (trocando) fim(); }, 700);
    }
    // arrastar para os lados (dedo ou mouse)
    let x0 = null;
    palco.addEventListener('pointerdown', e => { if (e.target.closest('button, a')) return; x0 = e.clientX; });
    palco.addEventListener('pointerup', e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) virar(atual + (dx < 0 ? 1 : -1)); });
    palco.addEventListener('pointercancel', () => { x0 = null; });
    const tecla = e => {
      if (e.key === 'Escape') { if (!document.querySelector('.prof-pop')) { e.preventDefault(); sair(); } return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); virar(atual + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); virar(atual - 1); }
      if (e.key === 'Tab') { // o foco fica dentro do baralho
        const focaveis = [...caixa.querySelectorAll('button:not([disabled]), a[href]')]; if (!focaveis.length) return;
        const pri = focaveis[0], ult = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); } else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
      }
    };
    function sair() {
      document.removeEventListener('keydown', tecla); fundo.remove(); document.body.classList.remove('prof-rc-aberto');
      if (o.origem && o.origem.isConnected) o.origem.focus({ preventScroll: true });
    }
    fundo.addEventListener('click', e => { if (e.target === fundo) sair(); });
    document.addEventListener('keydown', tecla);
    limpezas.push(() => { if (fundo.isConnected) sair(); });
    palco.appendChild(carta(0)); pintarNav();
    document.body.appendChild(fundo); document.body.classList.add('prof-rc-aberto');
    caixa.focus({ preventScroll: true });
  }
  /** "O que ninguém te conta": tudo à vista, numerado (01, 02...), cada ponto com a sua fonte. */
  function calloutsNumerados(f, itens, classe) {
    return el('ol', { class: 'prof-callouts' + (classe ? ' ' + classe : '') }, itens.map((it, i) => el('li', { class: 'prof-callout' },
      el('span', { class: 'prof-callout-n', 'aria-hidden': 'true', text: String(i + 1).padStart(2, '0') }), el('p', null, it.texto, citar(f, it.fontes)))));
  }
  /** Capítulo com a faixa numerada ("01 · O trabalho") e, se a ficha tiver, a frase-tese com a linha de apoio. */
  function capituloRelatorio(f, n, id, titulo, tese, sub, ...conteudo) {
    return el('section', { class: 'prof-cap prof-rel-cap', id: 'sec-' + id, 'aria-labelledby': 'tit-' + id },
      el('div', { class: 'prof-faixa-cap' }, el('span', { class: 'prof-faixa-n', 'aria-hidden': 'true', text: String(n).padStart(2, '0') }), el('h2', { id: 'tit-' + id, text: titulo })),
      tese && tese.titulo ? el('div', { class: 'prof-tese' }, el('p', { class: 'prof-tese-titulo', text: tese.titulo }), tese.linha ? el('p', { class: 'prof-tese-linha' }, tese.linha, citar(f, tese.fontes)) : null) : null,
      sub ? el('p', { class: 'prof-min prof-rel-sub', text: sub }) : null,
      ...conteudo);
  }
  /** Os pontos do "Ver resumo": as frases-tese, ou, sem elas, os fatos centrais que a ficha já tem. O salário fica fora (é do palpite). */
  function resumoDe(f) {
    const S = f.secoes || {}, M = f.manchetes || {}, itens = [];
    const CAPS = { trabalho: ['O trabalho', 'relogio'], formacao: ['A formação', 'livro'], dinheiro: ['O dinheiro', 'alvo'], mercado: ['O mercado', 'camadas'] };
    const teses = Object.keys(CAPS).filter(k => M[k] && M[k].titulo);
    if (teses.length) teses.forEach(k => itens.push({ rotulo: CAPS[k][0], icone: CAPS[k][1], alvo: 'sec-' + k, titulo: M[k].titulo, texto: M[k].linha, ids: M[k].fontes, semNumero: k === 'dinheiro' }));
    else {
      if (S.o_que_faz) itens.push({ rotulo: 'O trabalho', icone: 'relogio', alvo: 'sec-trabalho', texto: S.o_que_faz.texto.split(/(?<=\.)\s/)[0], ids: S.o_que_faz.fontes });
      const grad = f.formacao && (f.formacao.etapas || []).find(e => e.tipo === 'principal');
      if (grad) itens.push({ rotulo: 'A formação', icone: 'livro', alvo: 'sec-formacao', titulo: grad.nome + ':', texto: grad.texto, ids: grad.fontes });
      if (f.contexto && f.contexto.texto) itens.push({ rotulo: 'O mercado', icone: 'camadas', alvo: 'sec-mercado', texto: f.contexto.texto, ids: f.contexto.fontes });
      const dura = S.ninguem_conta && S.ninguem_conta.itens && S.ninguem_conta.itens[0];
      if (dura) itens.push({ rotulo: 'O que ninguém te conta', icone: 'info', alvo: 'sec-ninguem', texto: dura.texto, ids: dura.fontes });
    }
    // o "Você sabia?" fica fora quando fala de salário (o salário só aparece depois do palpite)
    // ou quando repete o número de uma carta anterior (é o mesmo fato contado de novo)
    const carta = f.carta && { rotulo: 'Você sabia?', icone: 'estrela', texto: f.carta.fato, ids: f.carta.fontes };
    const mesmoNumero = (a, b) => a && b && a.valor === b.valor && a.unidade === b.unidade;
    if (carta && !/R\$/.test(carta.texto) && !itens.some(x => mesmoNumero(numeroDaCarta(x), numeroDaCarta(carta)))) itens.push(carta);
    return itens;
  }
  /** A fonte de cada gráfico: um botãozinho "Fonte" no canto de baixo, que abre o cartão; com "Mostrar as fontes",
      a linha inteira "Fonte: ..." volta, como nos relatórios. */
  function fonteLinha(f, ids, texto) {
    const fs = [...new Set(ids || [])].map(id => (f.fontes || []).find(x => x.id === id)).filter(Boolean);
    if (!fs.length && !texto) return null;
    const curto = fo => {
      const t = fo.titulo.split(':')[0].trim();
      const o = (fo.orgao || '').replace(/\s*\(\d{2}\/\d{2}\/\d{4}\)/g, '').replace(/\s*\(.*\)$/, '').replace(/,\s*(\d{2}\/\d{2}\/\d{4}|[a-zç]+ de \d{4})$/i, '').trim();
      return o && !t.includes(o) ? `${t}, ${o}` : t;
    };
    const resumo = texto || fs.map(curto).join(' · ');
    return el('div', { class: 'prof-fonte' },
      el('button', { type: 'button', class: 'prof-fonte-canto', 'aria-label': 'Fonte deste gráfico: ' + resumo,
        onclick: e => { e.stopPropagation(); abrirFontes(f, fs.map(x => x.id), e.currentTarget, { titulo: 'Fonte deste gráfico', texto: resumo }); } }, icone('livro'), 'Fonte'),
      el('p', { class: 'prof-fonte-linha' }, el('b', { text: 'Fonte: ' }), resumo, fs.length ? citar(f, fs.map(x => x.id)) : null));
  }
  /** O número gigante numa faixa (o "R$ 1,2 trilhão por ano" dos relatórios). Um por página. */
  function faixaNumero(o) {
    return el('div', { class: 'prof-numero-grande' },
      el('p', { class: 'prof-numero-grande-v', text: o.valor }),
      el('p', { class: 'prof-numero-grande-rot', text: o.rotulo }),
      o.texto ? el('p', { class: 'prof-numero-grande-txt' }, o.texto, o.cit || null) : null,
      o.fonte || null);
  }
  /** Ranking dos cursos com mais matrículas: a profissão da ficha em turquesa, as outras em cinza (ênfase, não arco-íris). */
  function rankingMatriculas(f, ix, R) {
    const max = R.itens[0].matriculas;
    const mil = v => `${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;
    return el('figure', { class: 'prof-ranking' },
      el('figcaption', null, el('b', { text: R.titulo }), el('span', { class: 'prof-micro', text: 'Total de matrículas de cada curso, somando presencial e a distância.' })),
      el('ol', null, R.itens.map(it => {
        const eu = it.id === f.id, p = ix.profissoes.find(x => x.id === it.id);
        return el('li', { class: eu ? 'prof-ranking-eu' : null, 'aria-current': eu ? 'true' : null },
          el('span', { class: 'prof-ranking-pos prof-num', text: it.posicao + 'º' }),
          el('span', { class: 'prof-ranking-nome' }, !eu && temFicha(p) ? el('a', { href: '#profissao-' + it.id, text: it.nome }) : it.nome),
          el('span', { class: 'prof-ranking-trilho', title: `${it.nome}: ${it.matriculas.toLocaleString('pt-BR')} matrículas` },
            el('i', { style: { '--p': it.matriculas / max } }), el('span', { class: 'prof-ranking-valor', text: mil(it.matriculas) })));
      })),
      fonteLinha(f, [R.fonte && R.fonte.id].filter(Boolean)));
  }
  /** O dia em 24 horas: uma faixa com os blocos do dia (o de agora aceso) e a lista hora a hora. Lê o relógio do aparelho. */
  function linhaDoDia(f) {
    const d = new Date(), h = d.getHours(), agoraPct = (h + d.getMinutes() / 60) / 24 * 100;
    const faixas = [...f.agora].sort((a, b) => a.de - b.de);
    const hh = v => String(v % 24).padStart(2, '0') + 'h';
    const ehAgora = x => h >= x.de && h < x.ate;
    const atual = faixas.find(ehAgora);
    return el('figure', { class: 'prof-dia24' },
      el('figcaption', null, el('b', { text: 'As 24 horas de um dia típico' }), el('span', { class: 'prof-micro', text: f.agora_nota || 'Cenas típicas; cada lugar tem a sua rotina.' })),
      el('div', { class: 'prof-dia24-faixa', role: 'img', 'aria-label': `Linha do dia, das 0h às 24h. Agora, às ${hh(h)}${atual ? ': ' + atual.texto : ''}` },
        faixas.map((x, i) => el('span', { class: 'prof-dia24-bloco' + (ehAgora(x) ? ' prof-dia24-bloco--agora' : '') + (i % 2 ? ' prof-dia24-bloco--par' : ''), style: { flexGrow: x.ate - x.de }, title: `${hh(x.de)} às ${hh(x.ate)}: ${x.texto}` })),
        el('span', { class: 'prof-dia24-agora' + (agoraPct < 8 ? ' prof-dia24-agora--ini' : agoraPct > 92 ? ' prof-dia24-agora--fim' : ''), style: { left: agoraPct + '%' }, 'aria-hidden': 'true' }, el('span', { text: 'agora' }))),
      el('div', { class: 'prof-dia24-escala', 'aria-hidden': 'true' }, ['0h', '6h', '12h', '18h', '24h'].map(t => el('span', { text: t }))),
      el('ol', { class: 'prof-dia24-lista' }, faixas.map(x => el('li', { class: ehAgora(x) ? 'prof-dia24-item--agora' : null },
        el('span', { class: 'prof-dia24-h prof-num', text: `${hh(x.de)}–${hh(x.ate)}` }),
        el('span', null, x.texto, ehAgora(x) ? el('span', { class: 'prof-tag-agora', text: 'agora' }) : null)))));
  }
  /** Quanto tempo até trabalhar: uma linha por etapa, na mesma régua de anos (o caminho técnico corre em paralelo). */
  function ganttFormacao(f) {
    const etapas = f.formacao.etapas, bruto = anosFormacao(etapas), passo = bruto > 8 ? 2 : 1, max = Math.ceil(bruto / passo) * passo;
    const fmt = v => v.toLocaleString('pt-BR');
    const anos = e => e.anos_de === e.anos_ate ? `${fmt(e.anos_de)} ${e.anos_de === 1 ? 'ano' : 'anos'}` : `${fmt(e.anos_de)} a ${fmt(e.anos_ate)} anos`;
    const pct = v => (v / max * 100) + '%';
    const ticks = [];
    for (let a = 0; a <= max; a += passo) ticks.push(a);
    let cursor = 0;
    const linhas = etapas.map(e => { const inicio = e.tipo === 'depois' ? cursor : 0; if (e.tipo === 'principal') cursor = e.anos_ate; return { e, inicio }; });
    const tipos = [...new Set(etapas.map(e => e.tipo))];
    const NOME_TIPO = { alternativa: 'caminho técnico', principal: 'graduação', depois: 'depois da graduação' };
    const COR_TIPO = { alternativa: 'var(--amarelo)', principal: 'var(--turquesa)', depois: 'color-mix(in srgb, var(--turquesa) 55%, var(--superficie))' };
    return el('figure', { class: 'prof-gantt prof-rel-espaco', style: { '--anos': max } },
      el('figcaption', null, el('b', { text: 'Quanto tempo até trabalhar' }), el('span', { class: 'prof-micro', text: f.formacao.nota || '' })),
      el('div', { class: 'prof-gantt-grade' },
        el('div', { class: 'prof-gantt-linha prof-gantt-linha--escala', 'aria-hidden': 'true' }, el('span'),
          el('div', { class: 'prof-gantt-escala' }, ticks.map((a, i) => el('span', { class: i % 2 && i < ticks.length - 1 ? 'prof-gantt-tick--menor' : null, style: { left: pct(a) }, text: i === ticks.length - 1 ? `${a} anos` : String(a) })))),
        linhas.map(({ e, inicio }) => el('div', { class: 'prof-gantt-linha' },
          el('div', { class: 'prof-gantt-rot' }, el('b', { text: e.nome }), el('span', { class: 'prof-micro', text: anos(e) + (e.tipo === 'depois' ? ', depois da graduação' : '') })),
          el('div', { class: 'prof-gantt-trilho', role: 'img', 'aria-label': `${e.nome}: ${anos(e)}` },
            el('span', { class: 'prof-gantt-seg prof-gantt-seg--' + e.tipo, style: { left: pct(inicio), width: pct(e.anos_de) } }),
            e.anos_ate > e.anos_de ? el('span', { class: 'prof-gantt-seg prof-gantt-seg--faixa prof-gantt-seg--' + e.tipo, style: { left: pct(inicio + e.anos_de), width: pct(e.anos_ate - e.anos_de) } }) : null,
            e.tipo !== 'depois' ? el('span', { class: 'prof-gantt-mercado', style: { left: pct(inicio + e.anos_de) } }, el('span', { text: 'entra no mercado' })) : null)))),
      el('div', { class: 'prof-legenda' }, tipos.map(t => el('span', null, el('i', { style: { '--cor': COR_TIPO[t] } }), NOME_TIPO[t] || t)),
        etapas.some(e => e.anos_ate > e.anos_de) ? el('span', null, el('i', { class: 'prof-gantt-chave-faixa', style: { '--cor': COR_TIPO.depois } }), 'depende do caminho') : null),
      el('ul', { class: 'prof-lista prof-espaco' }, etapas.map(e => el('li', null, el('b', { text: e.nome + ': ' }), e.texto, citar(f, e.fontes)))),
      fonteLinha(f, etapas.flatMap(e => e.fontes || [])));
  }

  /** Fontes guardadas: o botão abre e fecha a lista (numerada como em f.fontes). Devolve [botão, lista]. */
  function fontesGuardadas(f, lista, rotulo) {
    const ol = el('ol', { class: 'prof-fontes', id: 'prof-lista-fontes', hidden: true }, lista.map(fo => el('li', { id: 'fonte-' + fo.id },
      el('div', null, el('b', { text: `${numeroFonte(f, fo.id)}. ` }), fo.url ? el('a', { href: fo.url, target: '_blank', rel: 'noopener' }, fo.titulo, ' ', icone('link')) : fo.titulo),
      el('div', { class: 'prof-fontes-meta', text: metaFonte(fo) }),
      fo.nota ? el('div', { class: 'prof-fontes-nota', text: 'Pendência: ' + fo.nota }) : null)));
    const b = botao(rotulo, { classe: 'prof-btn--linha', icone: 'livro', onclick: () => {
      const aberta = ol.hidden; ol.hidden = !aberta; b.setAttribute('aria-expanded', String(aberta));
      b.lastChild.textContent = aberta ? 'Guardar as fontes' : rotulo;
    } });
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'prof-lista-fontes');
    return [b, ol];
  }
  /* Escala da linha da formação: 8 anos ou mais, se a graduação somada ao que vem depois (residência, mestrado) passar disso */
  function anosFormacao(etapas) {
    let cursor = 0, fim = 0;
    etapas.forEach(e => { const inicio = e.tipo === 'depois' ? cursor : 0; fim = Math.max(fim, inicio + e.anos_ate); if (e.tipo === 'principal') cursor = e.anos_ate; });
    return Math.max(8, Math.ceil(fim));
  }
  function alternarMira(f, btn) {
    const i = estado.mira.indexOf(f.id);
    if (i >= 0) { estado.mira.splice(i, 1); aviso(`${f.nome} saiu da sua mira.`); } else { estado.mira.push(f.id); aviso(`${f.nome} está na sua mira.`); }
    salvarEstado(); ganchos.registrar('profissao_mira', { profissao: f.id, ativa: i < 0 });
    btn.textContent = ''; btn.appendChild(icone(i < 0 ? 'certo' : 'alvo')); btn.appendChild(document.createTextNode(i < 0 ? 'Na mira' : 'Pôr na mira')); btn.setAttribute('aria-pressed', String(i < 0));
  }

  /* ---------- Quanto ganha ----------
     O palpite em régua (2026-10-17, inspirado num vídeo que o usuário mandou): uma fileira de risquinhos de R$ 1 mil a
     R$ 30 mil, em escala que cresce em porcentagem e é igual para todas as profissões (a posição não entrega a resposta).
     Passar o dedo ou o mouse aumenta os risquinhos perto e mostra o valor numa bolha; soltar (ou Enter) confirma.
     Aí aparecem a média, a diferença e a cor: verde perto, laranja no meio do caminho, coral longe. */
  const nmil = v => (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const CHUTE = { min: 1000, max: 30000, n: 49 };
  const valorBarra = i => CHUTE.min * Math.pow(CHUTE.max / CHUTE.min, i / (CHUTE.n - 1));
  const posicaoValor = v => Math.log(Math.max(CHUTE.min, Math.min(CHUTE.max, v)) / CHUTE.min) / Math.log(CHUTE.max / CHUTE.min) * (CHUTE.n - 1);
  const redondo = v => v < 10000 ? Math.round(v / 100) * 100 : Math.round(v / 500) * 500;
  const pctBarra = p => (p + 0.5) / CHUTE.n * 100;
  /** Quão perto o palpite ficou: 'certo' (até 10%), 'perto' (até 30%) ou 'longe'. */
  const proximidade = (valor, media) => { const d = Math.abs(valor - media) / media; return d <= 0.1 ? 'certo' : d <= 0.3 ? 'perto' : 'longe'; };
  /** A régua do palpite. o = { rotulo, aoEscolher(valor) }. Devolve { el, revelar(valor, media), focar() }. */
  function reguaPalpite(o) {
    let atual = null, travada = false, arrastando = false;
    const barras = Array.from({ length: CHUTE.n }, () => el('i'));
    const bolha = el('span', { class: 'prof-chute-bolha', 'aria-hidden': 'true', hidden: true });
    const media = el('span', { class: 'prof-chute-media', hidden: true });
    const trilho = el('div', { class: 'prof-chute-barras', 'aria-hidden': 'true' }, barras);
    const regua = el('div', { class: 'prof-chute', role: 'slider', tabindex: '0', 'aria-label': o.rotulo,
      'aria-valuemin': String(CHUTE.min), 'aria-valuemax': String(CHUTE.max) }, bolha, trilho, media);
    const escala = el('div', { class: 'prof-chute-escala', 'aria-hidden': 'true' },
      [1000, 3000, 10000, 30000].map(v => el('span', { style: { left: pctBarra(posicaoValor(v)) + '%' }, text: `R$ ${nmil(v)} mil` })));
    const lupa = !semMovimento();
    function pintar(i, foco) {
      barras.forEach((b, k) => {
        b.classList.toggle('on', i != null && k <= i);
        b.style.setProperty('--s', lupa && foco != null ? (1 + 1.5 * Math.exp(-((k - foco) ** 2) / 8)).toFixed(3) : '1');
      });
      if (i == null) { bolha.hidden = true; return; }
      bolha.hidden = false; bolha.textContent = brl(redondo(valorBarra(i)));
      bolha.style.setProperty('--x', pctBarra(i) + '%');
    }
    const indice = x => { const r = trilho.getBoundingClientRect(); return Math.max(0, Math.min(CHUTE.n - 1, Math.round((x - r.left) / r.width * CHUTE.n - 0.5))); };
    function escolher(i) {
      atual = i; pintar(i, i);
      regua.setAttribute('aria-valuenow', String(redondo(valorBarra(i))));
      regua.setAttribute('aria-valuetext', brl(redondo(valorBarra(i))));
    }
    function confirmar() { if (travada || atual == null) return; o.aoEscolher(redondo(valorBarra(atual))); }
    regua.addEventListener('pointermove', e => {
      if (travada) return;
      if (arrastando) { escolher(indice(e.clientX)); return; }
      if (e.pointerType === 'mouse') pintar(indice(e.clientX), indice(e.clientX)); // só olhando: mostra, não escolhe
    });
    regua.addEventListener('pointerleave', () => { if (!travada && !arrastando) pintar(atual, null); });
    regua.addEventListener('pointerdown', e => {
      if (travada || (e.pointerType === 'mouse' && e.button !== 0)) return;
      arrastando = true; escolher(indice(e.clientX));
      try { regua.setPointerCapture(e.pointerId); } catch (erro) { /* sem captura: segue igual */ }
    });
    regua.addEventListener('pointerup', () => { if (!arrastando) return; arrastando = false; confirmar(); });
    regua.addEventListener('pointercancel', () => { arrastando = false; if (!travada) pintar(atual, null); }); // a página rolou: não vale
    regua.addEventListener('keydown', e => {
      if (travada) return;
      const passo = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (passo) { e.preventDefault(); escolher(Math.max(0, Math.min(CHUTE.n - 1, (atual == null ? Math.floor(CHUTE.n / 2) : atual) + passo))); o.aoMexer && o.aoMexer(); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); escolher(e.key === 'Home' ? 0 : CHUTE.n - 1); o.aoMexer && o.aoMexer(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && atual != null) { e.preventDefault(); confirmar(); }
    });
    /** Mostra o resultado: a média com o losango embaixo e as barras na cor da proximidade (valor null: sem palpite). */
    function revelar(valor, m) {
      travada = true; arrastando = false;
      regua.setAttribute('aria-disabled', 'true'); regua.removeAttribute('tabindex');
      regua.classList.add('prof-chute--travada');
      if (valor != null) { escolher(Math.round(posicaoValor(valor))); bolha.textContent = brl(valor); regua.classList.add('prof-chute--' + proximidade(valor, m)); pintar(atual, null); bolha.textContent = brl(valor); }
      else pintar(null, null);
      media.hidden = false; media.textContent = 'média';
      media.style.setProperty('--x', pctBarra(posicaoValor(m)) + '%');
      regua.setAttribute('aria-valuetext', valor != null ? `Seu palpite: ${brl(valor)}. Média: ${brl(m)}` : `Média: ${brl(m)}`);
    }
    return { el: el('div', { class: 'prof-chute-caixa' }, regua, escala), revelar, focar: () => regua.focus(), temValor: () => atual != null, confirmar };
  }
  /** O palpite. o = { id, pergunta, cargo, media, faixa, citacao(), salvo, revelado, aoResponder({ valor, acertou, diferenca }) } */
  function palpite(o) {
    const resposta = el('div', { class: 'prof-palpite-resposta', 'aria-live': 'polite' });
    const confirmar = el('button', { type: 'button', class: 'prof-btn prof-btn--primario prof-btn--pequeno', hidden: true, onclick: () => r.confirmar() }, icone('alvo'), 'Confirmar palpite');
    const r = reguaPalpite({ rotulo: 'Seu palpite de salário: use as setas e Enter', aoEscolher: v => responder(v, false), aoMexer: () => { confirmar.hidden = false; } });
    const pular = el('button', { type: 'button', class: 'prof-link-botao', text: 'Prefiro ver direto', onclick: () => responder(null, false) });
    const dica = el('span', { class: 'prof-micro', text: 'Toque ou arraste na régua e solte no seu palpite. Salário-base mensal, sem adicionais.' });
    const caixa = el('div', { class: 'prof-palpite' },
      el('p', { class: 'prof-palpite-pergunta', text: o.pergunta }),
      r.el,
      el('div', { class: 'prof-palpite-pe' }, dica, el('div', { class: 'prof-palpite-botoes' }, confirmar, pular)),
      resposta);
    function responder(valor, jaSalvo) {
      r.revelar(valor, o.media);
      pular.hidden = true; confirmar.hidden = true; dica.textContent = 'Salário-base mensal, sem adicionais.';
      const dif = valor == null ? null : valor - o.media, perto = valor == null ? null : proximidade(valor, o.media);
      const titulo = valor == null ? 'A média de contratação' : perto === 'certo' ? 'Na mosca!' : perto === 'perto' ? 'Quase!' : dif < 0 ? 'Mais do que você imaginou' : 'Menos do que você imaginou';
      const difTexto = valor == null ? null : Math.abs(dif) < 50 ? 'Exatamente a média.' : `Seu palpite, ${brl(valor)}, ficou ${brl(Math.abs(dif))} ${dif > 0 ? 'acima' : 'abaixo'} da média.`;
      const dominio = dominioDe([{ media: o.media, faixa: o.faixa }]);
      resposta.textContent = '';
      resposta.append(
        el('p', { class: 'prof-palpite-titulo' + (perto ? ' prof-palpite-titulo--' + perto : '') }, titulo),
        difTexto ? el('p', { class: 'prof-palpite-dif', text: difTexto }) : null,
        el('p', { class: 'prof-palpite-valor' }, el('b', { class: 'prof-num', text: brl(o.media) }), el('span', null, ` é a média de contratação de ${o.cargo.toLowerCase()}`, o.citacao(), '.')),
        regua({ dominio, media: o.media, faixa: o.faixa }),
        o.faixa ? el('div', { class: 'prof-regua-legenda' }, el('span', null, el('i', { class: 'prof-legenda-faixa', 'aria-hidden': 'true' }), `A maior parte dos contratos: ${brl(o.faixa.de)} a ${brl(o.faixa.ate)}`), el('span', null, el('i', { class: 'prof-legenda-media', 'aria-hidden': 'true' }), 'a média')) : null);
      if (!jaSalvo) o.aoResponder({ valor, acertou: perto === 'certo', diferenca: dif });
    }
    // Palpite guardado: o valor (régua) ou, de antes da régua, só a faixa (aí mostra a média, sem o palpite)
    if (o.salvo && typeof o.salvo.valor === 'number') responder(o.salvo.valor, true);
    else if ((o.salvo && o.salvo.faixa !== undefined) || o.revelado) responder(null, true);
    return caixa;
  }
  /** Régua: a faixa comum (onde fica a maior parte dos contratos) e a média marcada. Também serve a várias linhas. */
  function regua(o) {
    const [a, b] = o.dominio, pct = v => Math.max(0, Math.min(100, (v - a) / (b - a) * 100));
    return el('div', { class: 'prof-regua' + (o.fina ? ' prof-regua--fina' : ''), role: 'img', 'aria-label': `Média ${brl(o.media)}${o.faixa ? `; faixa comum de ${brl(o.faixa.de)} a ${brl(o.faixa.ate)}` : ''}` },
      el('span', { class: 'prof-regua-trilho' }),
      o.faixa ? el('span', { class: 'prof-regua-faixa', style: { left: pct(o.faixa.de) + '%', width: (pct(o.faixa.ate) - pct(o.faixa.de)) + '%' } }) : null,
      el('span', { class: 'prof-regua-media', style: { left: pct(o.media) + '%' } }));
  }
  const dominioDe = itens => {
    const lo = Math.min(...itens.map(i => Math.min(i.media, i.faixa ? i.faixa.de : i.media)));
    const hi = Math.max(...itens.map(i => Math.max(i.media, i.faixa ? i.faixa.ate : i.media)));
    return [Math.max(0, Math.floor(lo * 0.7 / 500) * 500), Math.ceil(hi * 1.15 / 500) * 500];
  };
  /** Cargos e médias, um por linha, todos na mesma régua (ficha e áreas dos panoramas). itens = [{cargo, sub, media, faixa, fontes, nota}] */
  function linhasCargos(itens, citarItem) {
    const dominio = dominioDe(itens);
    return el('ul', { class: 'prof-cargos' }, itens.map(it => el('li', { class: 'prof-cargo' },
      el('div', { class: 'prof-cargo-nome' }, el('b', { text: it.cargo }), it.sub ? el('span', { class: 'prof-micro', text: it.sub }) : null),
      el('div', { class: 'prof-cargo-valor' }, el('b', { class: 'prof-num', text: brl(it.media) }), el('span', { class: 'prof-micro', text: 'média' }), citarItem(it)),
      el('div', { class: 'prof-cargo-regua' }, regua({ dominio, media: it.media, faixa: it.faixa, fina: true }),
        it.faixa ? el('span', { class: 'prof-micro prof-num', text: `faixa comum: ${brl(it.faixa.de)} a ${brl(it.faixa.ate)}` }) : null),
      it.nota ? el('p', { class: 'prof-fonte-nota prof-cargo-nota', text: it.nota }) : null)));
  }
  /* Bloco "Quanto ganha" da ficha: o palpite no cargo principal e, depois dele, todos os cargos, os pisos e a regra. */
  function blocoSalario(f, q, aoRevelar) {
    const raiz = el('div', { class: 'prof-salario' });
    const medias = q.medias || [], pisos = q.pisos || [];
    const principal = medias[0];
    const detalhes = el('div', { class: 'prof-salario-detalhes' });
    const revelado = () => (estado.salarioRevelado[f.id] || 0) > 0;
    function mostrarDetalhes() {
      detalhes.textContent = '';
      if (medias.length > 1 || pisos.length) detalhes.appendChild(el('h3', { class: 'prof-sub', text: medias.length > 1 ? 'Todos os cargos' : 'Média e piso' }));
      if (medias.length > 1) detalhes.appendChild(linhasCargos(medias.map(m => ({ cargo: m.cargo, sub: m.periodo, media: m.valor, faixa: m.faixa, fontes: m.fontes })), it => citar(f, it.fontes)));
      if (pisos.length) detalhes.appendChild(el('ul', { class: 'prof-pisos' }, pisos.map(p => el('li', null,
        el('span', null, (q.piso_rotulo || 'Piso por lei (44 h)') + ' · ', el('b', { text: p.cargo })), el('b', { class: 'prof-num' }, brl(p.valor), citar(f, p.fontes))))));
      if (q.texto) detalhes.appendChild(prosa(f, q.texto, q.fontes, 'prof-prosa prof-espaco'));
      if (q.piso_regra) detalhes.appendChild(el('p', { class: 'prof-fonte-nota' }, q.piso_regra, citar(f, q.piso_regra_fontes)));
    }
    if (principal) raiz.appendChild(palpite({
      id: f.id, cargo: principal.cargo, media: principal.valor, faixa: principal.faixa,
      pergunta: (q.chute && q.chute.pergunta) || `Quanto ganha, por mês, quem trabalha como ${principal.cargo.toLowerCase()} com carteira assinada?`,
      citacao: () => citar(f, principal.fontes),
      salvo: (estado.chutes[f.id + ':palpite'] && typeof estado.chutes[f.id + ':palpite'] === 'object') ? estado.chutes[f.id + ':palpite'] : null,
      revelado: revelado(),
      aoResponder: r => {
        estado.chutes[f.id + ':palpite'] = { valor: r.valor, data: new Date().toISOString().slice(0, 10) };
        estado.salarioRevelado[f.id] = 2; salvarEstado();
        if (r.valor != null) ganchos.registrar('profissao_chute_salario', { profissao: f.id, cargo: principal.cargo, chute: r.valor, media: principal.valor, diferenca: r.diferenca, acertou: r.acertou });
        mostrarDetalhes();
        if (aoRevelar) aoRevelar();
      }
    }));
    else mostrarDetalhes();
    if (principal && revelado()) mostrarDetalhes();
    raiz.appendChild(detalhes);
    return raiz;
  }

  /* ---------- Bloco: DNA + Carta Diver ---------- */
  const EIXOS = [['pessoas', 'Pessoas'], ['pressao', 'Pressão'], ['corpo', 'Corpo'], ['rotina', 'Rotina'], ['numeros', 'Números'], ['criatividade', 'Criatividade']];
  function blocoDna(f, ix) {
    const prof = EIXOS.map(([k]) => f.dna[k] ?? 50);
    if (!estado.dna) estado.dna = EIXOS.map(() => 50);
    const raiz = el('div');
    const area = el('div', { class: 'prof-dna' });
    const graficoWrap = el('div', { class: 'prof-dna-grafico' });
    const afin = el('div', { class: 'prof-afinidade' }, el('span', { class: 'prof-min', text: `Sua afinidade com ${f.nome}` }), el('b', { class: 'prof-num' }));
    const controles = el('div', { class: 'prof-dna-controles' });
    EIXOS.forEach(([k, nome], i) => {
      const out = el('output', { text: String(estado.dna[i]) });
      const r = el('input', { type: 'range', min: 0, max: 100, step: 5, value: estado.dna[i], id: 'prof-dna-' + k, 'aria-label': `Seu nível em ${nome}` });
      r.addEventListener('input', () => { estado.dna[i] = +r.value; out.textContent = r.value; salvarEstado(); desenhar(); });
      controles.appendChild(el('label', { for: 'prof-dna-' + k }, el('span', { text: nome }), r, out));
    });
    const carta = el('div', { class: 'prof-carta-area' });
    const btnCarta = botao('Gerar minha carta', { classe: 'prof-btn--primario', icone: 'camadas', onclick: () => gerarCarta(f, ix, prof, carta) });
    area.append(graficoWrap, el('div', null, afin, controles, el('p', { class: 'prof-micro', style: { marginTop: '8px' }, text: 'Turquesa: a profissão. Amarelo tracejado: você. Afinidade é informação, não veredito.' }), el('div', { style: { marginTop: '12px' } }, btnCarta)));
    raiz.append(area, carta);
    function desenhar() {
      graficoWrap.textContent = '';
      graficoWrap.appendChild(IG().radar({ eixos: EIXOS.map(e => e[1]), series: [{ nome: f.nome, valores: prof, classe: 'profissao' }, { nome: 'Você', valores: estado.dna, classe: 'voce' }] }));
      graficoWrap.appendChild(el('div', { class: 'prof-legenda' }, el('span', null, el('i', { style: { '--cor': 'var(--turquesa)' } }), f.nome), el('span', null, el('i', { class: 'prof-legenda--tracejado', style: { '--cor': 'var(--amarelo)' } }), 'Você')));
      const a = Math.round(100 - prof.reduce((t, p, i) => t + Math.abs(p - estado.dna[i]), 0) / prof.length);
      afin.lastChild.textContent = a + '%';
      afin.className = 'prof-afinidade ' + (a >= 70 ? 'prof-afinidade--alta' : a >= 50 ? 'prof-afinidade--media' : 'prof-afinidade--baixa');
      afin.lastChild.title = a >= 70 ? 'Bem parecido com você hoje.' : a >= 50 ? 'Parecido em parte. Veja o que pesa.' : 'Menos parecido com você hoje. Vale olhar o que pesa.';
    }
    desenhar();
    return raiz;
  }
  function gerarCarta(f, ix, prof, alvo) {
    const afin = Math.round(100 - prof.reduce((t, p, i) => t + Math.abs(p - estado.dna[i]), 0) / prof.length);
    const c = document.createElement('canvas'); c.width = 720; c.height = 1000;
    const g = c.getContext('2d');
    const cor = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#000';
    const marinho = cor('--marinho'), fundo = cor('--fundo-fundo'), amarelo = cor('--amarelo'), turquesa = cor('--turquesa'), tc = cor('--turquesa-claro'), texto = cor('--texto'), suave = cor('--texto-suave'), sup = cor('--superficie');
    const fonte = 'Plus Jakarta Sans, system-ui, sans-serif';
    const grad = g.createLinearGradient(0, 0, 0, c.height); grad.addColorStop(0, marinho); grad.addColorStop(1, fundo);
    g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = amarelo; g.lineWidth = 6; roundRect(g, 18, 18, c.width - 36, c.height - 36, 36); g.stroke();
    g.fillStyle = suave; g.font = `600 22px ${fonte}`; g.fillText('CARTA DIVER · MAPA DAS PROFISSÕES', 56, 86);
    g.textAlign = 'right'; g.fillText((nomeArea(ix, f.area) || '').toUpperCase(), c.width - 56, 86); g.textAlign = 'left';
    g.fillStyle = texto; g.font = `800 64px ${fonte}`; g.fillText(f.nome, 56, 170);
    g.fillStyle = suave; g.font = `500 24px ${fonte}`; quebrar(g, f.frase, 56, 214, c.width - 112, 32);
    let y = 330;
    EIXOS.forEach(([k, nome], i) => {
      g.fillStyle = suave; g.font = `600 22px ${fonte}`; g.fillText(nome, 56, y + 18);
      g.fillStyle = sup; roundRect(g, 240, y, 360, 18, 9); g.fill();
      g.fillStyle = turquesa; roundRect(g, 240, y, 360 * prof[i] / 100, 18, 9); g.fill();
      g.fillStyle = amarelo; g.beginPath(); g.arc(240 + 360 * estado.dna[i] / 100, y + 9, 10, 0, Math.PI * 2); g.fill();
      g.strokeStyle = marinho; g.lineWidth = 3; g.stroke();
      g.fillStyle = texto; g.font = `800 24px ${fonte}`; g.textAlign = 'right'; g.fillText(String(prof[i]), c.width - 56, y + 20); g.textAlign = 'left';
      y += 58;
    });
    g.fillStyle = tc; g.font = `600 20px ${fonte}`; g.fillText('Barra turquesa: a profissão. Bolinha amarela: você.', 56, y + 10);
    y += 70;
    g.fillStyle = sup; roundRect(g, 56, y, c.width - 112, 130, 24); g.fill();
    g.fillStyle = suave; g.font = `600 24px ${fonte}`; g.fillText('Sua afinidade hoje', 84, y + 52);
    g.fillStyle = amarelo; g.font = `800 72px ${fonte}`; g.textAlign = 'right'; g.fillText(afin + '%', c.width - 84, y + 96); g.textAlign = 'left';
    g.fillStyle = suave; g.font = `500 20px ${fonte}`; g.fillText(`Diver · ${new Date().toLocaleDateString('pt-BR')} · aprender é a parte divertida`, 56, c.height - 60);
    const img = el('img', { alt: `Carta Diver de ${f.nome} com afinidade de ${afin}%`, src: c.toDataURL('image/png') });
    alvo.textContent = '';
    const acoes = el('div', null,
      el('p', { class: 'prof-prosa', text: 'Sua carta está pronta. No app, ela entra na sua coleção e pode ser compartilhada como imagem.' }),
      el('div', { style: { marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' } },
        el('a', { class: 'prof-btn prof-btn--linha', href: img.src, download: `carta-diver-${f.id}.png` }, icone('baixar'), 'Baixar imagem'),
        botao('Refazer', { classe: 'prof-btn--linha', icone: 'embaralhar', onclick: () => gerarCarta(f, ix, prof, alvo) })),
      el('p', { class: 'prof-micro', style: { marginTop: '10px' }, text: 'Colecionar todas as cartas do mapa é a conquista "Baralho completo".' }));
    alvo.append(img, acoes);
    if (!estado.cartasGeradas.includes(f.id)) { estado.cartasGeradas.push(f.id); salvarEstado(); ganchos.registrar('profissao_carta_gerada', { profissao: f.id, afinidade: afin }); }
    function roundRect(ctx, x, y0, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y0); ctx.arcTo(x + w, y0, x + w, y0 + h, r); ctx.arcTo(x + w, y0 + h, x, y0 + h, r); ctx.arcTo(x, y0 + h, x, y0, r); ctx.arcTo(x, y0, x + w, y0, r); ctx.closePath(); }
    function quebrar(ctx, t, x, y0, larg, alt) { const palavras = (t || '').split(' '); let linha = ''; for (const p of palavras) { const teste = linha ? linha + ' ' + p : p; if (ctx.measureText(teste).width > larg && linha) { ctx.fillText(linha, x, y0); y0 += alt; linha = p; } else linha = teste; } if (linha) ctx.fillText(linha, x, y0); }
  }

  /* ---------- Bloco: Dilema ---------- */
  function blocoDilema(f, d) {
    const raiz = el('div', { class: 'prof-caixa' });
    raiz.appendChild(el('p', { class: 'prof-dilema-situacao', text: d.situacao }));
    const ops = el('div');
    const resposta = el('div', { class: 'prof-resposta' });
    const votado = estado.votos[f.id + ':' + d.id];
    d.opcoes.forEach((o, i) => ops.appendChild(el('button', { type: 'button', class: 'prof-opcao' + (o.recomendada ? ' prof-opcao--boa' : ''), 'aria-pressed': String(votado === i), onclick: () => votar(i) }, el('kbd', { text: String(i + 1) }), o.texto)));
    raiz.append(ops, resposta);
    if (votado !== undefined) mostrar(votado);
    function votar(i) {
      estado.votos[f.id + ':' + d.id] = i; salvarEstado(); ganchos.registrar('profissao_dilema_voto', { profissao: f.id, dilema: d.id, opcao: i });
      ops.querySelectorAll('.prof-opcao').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      mostrar(i);
    }
    function mostrar(i) {
      resposta.textContent = '';
      const o = d.opcoes[i];
      resposta.append(
        el('p', { class: 'prof-min', text: o.recomendada ? 'Você escolheu o caminho que a profissão espera.' : 'Caminho comum, mas não é o que a profissão espera. Veja por quê.' }),
        el('div', { class: 'prof-caixa prof-caixa--turquesa', style: { marginTop: '10px' } }, el('h3', null, icone('balanca'), 'O que a lei diz'), el('p', { class: 'prof-prosa' }, d.resposta, citar(f, d.fontes))),
        el('p', { class: 'prof-micro', style: { marginTop: '10px' }, text: 'A distribuição dos votos dos Divers aparece aqui quando houver pelo menos 50 votos. Na fase 2, um profissional da área grava a resposta dele.' }));
    }
    return raiz;
  }

  /* ---------- Bloco: Onde e quando se busca (2026-10-17: mapa do Brasil em quadradinhos, um por estado) ---------- */
  // Cada estado é um quadradinho na posição aproximada do mapa: [linha, coluna]
  const GRADE_UF = { RR: [1, 2], AP: [1, 3], AM: [2, 2], PA: [2, 3], MA: [2, 4], CE: [2, 5], RN: [2, 6], AC: [3, 1], RO: [3, 2], TO: [3, 3], PI: [3, 4], PE: [3, 5], PB: [3, 6], MT: [4, 2], GO: [4, 3], BA: [4, 4], SE: [4, 5], AL: [4, 6], MS: [5, 2], DF: [5, 3], MG: [5, 4], ES: [5, 5], PR: [6, 2], SP: [6, 3], RJ: [6, 4], SC: [7, 2], RS: [8, 2] };
  /** Quando se busca: uma coluna por mês, a barra sobe ou desce a partir da média do ano (100); o pico em amarelo.
      Em HTML (não SVG) para os meses ficarem legíveis no celular. */
  function barrasMeses(valores) {
    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const max = Math.max(...valores), min = Math.min(...valores);
    const escala = Math.max(30, ...valores.map(v => Math.abs(v - 100))); // pelo menos ±30, para variação pequena não parecer grande
    return el('div', { class: 'prof-meses', role: 'img', 'aria-label': 'Interesse por mês, com a média do ano igual a 100: ' + valores.map((v, i) => `${MESES[i]} ${v}`).join(', ') },
      valores.map((v, i) => el('div', { class: 'prof-mes' + (v === max ? ' prof-mes--max' : '') + (v < 100 ? ' prof-mes--abaixo' : ''), title: `${MESES[i]}: ${v} (média do ano = 100)`, style: { '--h': Math.abs(v - 100) / escala } },
        el('span', { class: 'prof-mes-barra' }),
        v === max || v === min ? el('span', { class: 'prof-mes-v prof-num', text: String(v) }) : null,
        el('span', { class: 'prof-mes-rot', text: MESES[i] }))));
  }
  function blocoBuscas(sec, f, t) {
    const carregando = sec.querySelector('.prof-carregando'); if (carregando) carregando.remove();
    if (!t || !f.trends_id || !t.sazonalidade[f.trends_id]) { sec.appendChild(el('p', { class: 'prof-min', text: 'Sem dados de busca para esta profissão ainda.' })); return; }
    const a = f.trends_id, outros = Object.keys(t.nomes).filter(id => id !== a);
    let b = outros.includes('ciencias-contabeis') ? 'ciencias-contabeis' : outros[0];
    const sel = el('select', { class: 'prof-selecao', 'aria-label': 'Comparar com outra profissão', onchange: e => { b = e.target.value; desenhar(); } }, outros.map(id => el('option', { value: id, text: t.nomes[id], selected: id === b })));
    const mapas = el('div', { class: 'prof-mapas-uf' });
    const escala = el('div', { class: 'prof-escala-uf' });
    const leitura = el('p', { class: 'prof-min prof-espaco' });
    const tabela = el('details', { class: 'prof-tabela-uf' });
    const saz = t.sazonalidade[a];
    const maxMes = saz.indexOf(Math.max(...saz)), minMes = saz.indexOf(Math.min(...saz));
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    sec.append(el('h3', { class: 'prof-sub', text: 'Onde e quando se busca' }),
      el('div', { class: 'prof-buscas' },
        el('figure', { class: 'prof-caixa prof-buscas-mapa' },
          el('figcaption', { class: 'prof-grafico-cab' }, el('b', { text: 'Onde o curso pesa mais nas buscas' }), el('label', { class: 'prof-min' }, 'Comparar com ', sel)),
          el('div', { class: 'prof-buscas-corpo' }, mapas, el('div', { class: 'prof-buscas-lado' }, escala, leitura, tabela))),
        el('figure', { class: 'prof-caixa prof-buscas-meses' },
          el('figcaption', { class: 'prof-grafico-cab' }, el('b', { text: 'Quando o Brasil pesquisa ' + f.nome }), el('span', { class: 'prof-min', text: 'média do ano = 100' })),
          barrasMeses(saz),
          el('p', { class: 'prof-min prof-espaco', text: `O pico é em ${meses[maxMes]} (${saz[maxMes]}) e o vale em ${meses[minMes]} (${saz[minMes]}). Em cursos de saúde, os picos acompanham o começo dos semestres; em Medicina e Engenharia, o Sisu de janeiro.` }))),
      fonteLinha(f, [], `${t.fonte}. ${t.nota}`));
    function desenhar() {
      const todos = t.estados.flatMap(e => [e.valores[a] || 0, e.valores[b] || 0]);
      const lo = Math.min(...todos), hi = Math.max(...todos);
      const mapa = id => el('div', { class: 'prof-mapa-uf' },
        el('p', { class: 'prof-mapa-uf-tit', text: t.nomes[id] }),
        el('div', { class: 'prof-uf-grade', role: 'img', 'aria-label': `Peso de ${t.nomes[id]} nas buscas de cada estado. Os valores estão na tabela logo abaixo.` },
          t.estados.map(e => {
            const pos = GRADE_UF[e.uf]; if (!pos) return null;
            const v = e.valores[id] || 0, r = (v - lo) / ((hi - lo) || 1);
            return el('span', { class: 'prof-uf' + (r >= 0.55 ? ' prof-uf--claro' : ''), style: { gridRow: pos[0], gridColumn: pos[1], '--v': r.toFixed(3) }, title: `${e.nome}: ${v}%` },
              el('b', { text: e.uf }), el('span', { text: v + '%' }));
          })));
      mapas.textContent = ''; mapas.append(mapa(a), mapa(b));
      escala.textContent = '';
      escala.append(el('span', { class: 'prof-num', text: lo + '%' }), el('i', { 'aria-hidden': 'true' }), el('span', { class: 'prof-num', text: hi + '%' }),
        el('span', { class: 'prof-micro prof-escala-uf-rot', text: 'parcela de cada curso nas buscas do estado, entre os 7 cursos comparados' }));
      leitura.textContent = `${f.nome} pesa mais ${regiaoDominante('a')}; ${t.nomes[b]} pesa mais ${regiaoDominante('b')}.`;
      const linhas = [...t.estados].sort((x, y) => (y.valores[a] || 0) - (x.valores[a] || 0));
      tabela.textContent = '';
      tabela.append(el('summary', null, 'Ver os 27 estados em tabela'),
        el('div', { class: 'prof-rolagem' }, el('table', { class: 'prof-tabela' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Estado' }), el('th', { scope: 'col', text: t.nomes[a] }), el('th', { scope: 'col', text: t.nomes[b] }))),
          el('tbody', null, linhas.map(e => el('tr', null, el('th', { scope: 'row', text: `${e.nome} (${e.uf})` }), el('td', { class: 'prof-num', text: (e.valores[a] || 0) + '%' }), el('td', { class: 'prof-num', text: (e.valores[b] || 0) + '%' })))))));
    }
    function regiaoDominante(k) {
      const id = k === 'a' ? a : b, soma = {}, n = {};
      t.estados.forEach(e => { soma[e.regiao] = (soma[e.regiao] || 0) + (e.valores[id] || 0); n[e.regiao] = (n[e.regiao] || 0) + 1; });
      const ordem = Object.keys(soma).sort((x, y) => soma[y] / n[y] - soma[x] / n[x]);
      return `no ${ordem[0]} e no ${ordem[1]}`;
    }
    desenhar();
  }

  /* =========================================================
     Tela: Um dia como…
     ========================================================= */
  function telaDia(raiz, f, ix) {
    const d = f.dia;
    let i = 0; const ind = {}; d.indicadores.forEach(x => ind[x.id] = x.inicial);
    ganchos.registrar('profissao_dia_inicio', { profissao: f.id });
    raiz.classList.add('prof-raiz--estreita');
    raiz.appendChild(topoPagina({ texto: 'Ficha de ' + f.nome, rota: 'profissao-' + f.id }));
    // o lugar da cena vai em cima do título (no celular, à direita do Voltar, ele ficava solto numa linha)
    raiz.appendChild(el('span', { class: 'prof-rotulo', text: d.subtitulo }));
    raiz.appendChild(el('h1', { text: d.titulo, style: { fontSize: 'var(--t-3xl)', fontWeight: 800, margin: 'var(--esp-1) 0 6px' } }));
    raiz.appendChild(el('p', { class: 'prof-min', text: d.aviso, style: { marginBottom: '16px' } }));
    const indicadores = el('div', { class: 'prof-indicadores' });
    const progresso = el('div', { class: 'prof-progresso', 'aria-hidden': 'true' }, d.cenas.map(() => el('i')));
    const palco = el('div');
    raiz.append(indicadores, progresso, palco);
    function barras() {
      indicadores.textContent = '';
      d.indicadores.forEach(x => indicadores.appendChild(el('div', { class: 'prof-indicador' }, el('div', { class: 'prof-min' }, el('span', { text: x.nome }), el('b', { class: 'prof-num', text: ind[x.id] + '%' })), el('div', { class: 'prof-barra' + (x.id === 'energia' ? ' prof-barra--amarela' : '') }, el('span', { style: { width: ind[x.id] + '%' } })))));
      progresso.querySelectorAll('i').forEach((p, k) => { p.className = k < i ? 'feita' : k === i ? 'atual' : ''; });
    }
    function cena() {
      barras();
      const c = d.cenas[i];
      palco.textContent = '';
      const ops = el('div');
      const retorno = el('div');
      const card = el('div', { class: 'prof-cena' }, el('div', { class: 'prof-hora', text: `${c.hora} · Cena ${i + 1} de ${d.cenas.length}` }), el('h2', { text: c.titulo }), el('p', { class: 'prof-situacao', text: c.situacao }), ops, retorno);
      c.opcoes.forEach((o, k) => ops.appendChild(el('button', { type: 'button', class: 'prof-opcao', onclick: () => escolher(k) }, el('kbd', { text: String(k + 1) }), o.texto)));
      palco.appendChild(card);
      function escolher(k) {
        const o = c.opcoes[k];
        Object.keys(o.efeitos || {}).forEach(id => { if (id in ind) ind[id] = Math.max(0, Math.min(100, ind[id] + o.efeitos[id])); });
        barras();
        ops.querySelectorAll('.prof-opcao').forEach((b, idx) => { b.disabled = true; b.setAttribute('aria-pressed', String(idx === k)); if (idx === k && o.melhor) b.classList.add('prof-opcao--boa'); });
        retorno.textContent = '';
        retorno.appendChild(el('div', { class: 'prof-retorno ' + (o.melhor ? 'prof-retorno--bom' : 'prof-retorno--melhor') }, el('p', { class: 'prof-veredito', text: o.melhor ? 'Boa decisão.' : 'Dá para fazer melhor.' }), el('p', { text: o.retorno }), el('div', { style: { marginTop: '12px' } }, botao(i < d.cenas.length - 1 ? 'Próxima cena' : 'Encerrar o dia', { classe: 'prof-btn--primario', iconeDepois: 'direita', onclick: () => { i++; i < d.cenas.length ? cena() : fim(); } }))));
        document.removeEventListener('keydown', teclas);
      }
      function teclas(e) { const n = +e.key; if (n >= 1 && n <= c.opcoes.length && !ops.querySelector('.prof-opcao').disabled) escolher(n - 1); }
      document.addEventListener('keydown', teclas);
      limpezas.push(() => document.removeEventListener('keydown', teclas));
    }
    function fim() {
      barras(); progresso.querySelectorAll('i').forEach(p => p.className = 'feita');
      palco.textContent = '';
      const primeira = !estado.diaConcluido.includes(f.id);
      if (primeira) { estado.diaConcluido.push(f.id); salvarEstado(); ganchos.recompensar({ tipo: 'profissao_dia', xp: d.recompensa.xp, perolas: d.recompensa.perolas, profissao: f.id }); }
      ganchos.registrar('profissao_dia_concluido', { profissao: f.id, indicadores: ind });
      palco.appendChild(el('div', { class: 'prof-cena' }, el('h2', { text: 'Dia encerrado' }), el('p', { class: 'prof-situacao', text: d.fechamento }),
        primeira ? el('p', { class: 'prof-recompensa', text: `+${d.recompensa.xp} XP · +${d.recompensa.perolas} pérolas` }) : el('p', { class: 'prof-min', style: { marginTop: '10px' }, text: 'Você já ganhou a recompensa deste dia. Jogar de novo vale pela experiência.' }),
        el('div', { style: { marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' } }, botao('Viver de novo', { classe: 'prof-btn--primario', icone: 'embaralhar', onclick: () => { i = 0; d.indicadores.forEach(x => ind[x.id] = x.inicial); cena(); } }), link('Voltar à ficha', 'profissao-' + f.id, { classe: 'prof-btn prof-btn--linha' }))));
    }
    cena();
  }

  /* =========================================================
     Tela: Mito ou verdade
     ========================================================= */
  function telaMitos(raiz, f, ix) {
    let i = 0; const acertos = [];
    ganchos.registrar('profissao_mitos_inicio', { profissao: f.id });
    raiz.classList.add('prof-raiz--estreita');
    raiz.appendChild(topoPagina({ texto: 'Ficha de ' + f.nome, rota: 'profissao-' + f.id }));
    raiz.appendChild(el('h1', { text: 'Mito ou verdade: ' + f.nome, style: { fontSize: 'var(--t-3xl)', fontWeight: 800, marginBottom: '14px' } }));
    const placar = el('div', { class: 'prof-placar', 'aria-hidden': 'true' }, f.mitos.map(() => el('i')));
    const palco = el('div');
    raiz.append(placar, palco);
    function render() {
      placar.querySelectorAll('i').forEach((p, k) => p.className = k < acertos.length ? (acertos[k] ? 'certo' : 'errado') : '');
      const m = f.mitos[i];
      palco.textContent = '';
      const resp = el('div', { class: 'prof-mito-resposta' });
      const botoes = el('div', { class: 'prof-mito-botoes' }, botao('Mito', { classe: 'prof-btn--linha', onclick: () => responder(false) }), botao('Verdade', { classe: 'prof-btn--linha', onclick: () => responder(true) }));
      palco.appendChild(el('div', { class: 'prof-mito' }, el('p', { class: 'prof-min', text: `${i + 1} de ${f.mitos.length}` }), el('p', { class: 'prof-afirmacao', text: m.afirmacao }), botoes, resp));
      function responder(v) {
        const ok = v === m.verdade; acertos.push(ok);
        placar.querySelectorAll('i').forEach((p, k) => p.className = k < acertos.length ? (acertos[k] ? 'certo' : 'errado') : '');
        botoes.querySelectorAll('button').forEach(b => b.disabled = true);
        resp.className = 'prof-mito-resposta ' + (ok ? 'prof-mito-resposta--certo' : 'prof-mito-resposta--errado');
        resp.append(el('p', { class: 'prof-veredito', text: `${m.verdade ? 'Verdade' : 'Mito'}. ${ok ? 'Mandou bem, Diver!' : 'Essa pega muita gente.'}` }), el('p', { class: 'prof-prosa' }, m.explicacao, citar(f, m.fontes)),
          el('div', { style: { marginTop: '12px' } }, botao(i < f.mitos.length - 1 ? 'Próxima' : 'Ver resultado', { classe: 'prof-btn--primario', iconeDepois: 'direita', onclick: () => { i++; i < f.mitos.length ? render() : fim(); } })));
      }
    }
    function fim() {
      const n = acertos.filter(Boolean).length;
      const primeira = !estado.mitosConcluido.includes(f.id);
      if (primeira) { estado.mitosConcluido.push(f.id); salvarEstado(); ganchos.recompensar({ tipo: 'profissao_mitos', xp: 20, perolas: 2, profissao: f.id }); }
      ganchos.registrar('profissao_mitos_concluido', { profissao: f.id, acertos: n, total: f.mitos.length });
      palco.textContent = '';
      palco.appendChild(el('div', { class: 'prof-mito' }, el('h2', { text: `${n} de ${f.mitos.length}`, style: { fontSize: 'var(--t-3xl)', fontWeight: 800, color: 'var(--amarelo)' } }), el('p', { class: 'prof-prosa', style: { marginTop: '8px' }, text: n === f.mitos.length ? 'Você já conhece bem esta profissão. Agora é ver se o dia a dia combina com você.' : 'Cada mito derrubado é uma decisão melhor lá na frente. As explicações ficam na ficha, com as fontes.' }),
        primeira ? el('p', { class: 'prof-recompensa', text: '+20 XP · +2 pérolas' }) : null,
        el('div', { style: { marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' } }, botao('Jogar de novo', { classe: 'prof-btn--primario', icone: 'embaralhar', onclick: () => { i = 0; acertos.length = 0; render(); } }), link('Voltar à ficha', 'profissao-' + f.id, { classe: 'prof-btn prof-btn--linha' }))));
    }
    render();
  }

  /* =========================================================
     Tela: Maré de cartas
     ========================================================= */
  function telaCartas(raiz, ix) {
    ganchos.registrar('profissoes_cartas_inicio', {});
    const todas = ix.profissoes.filter(p => p.carta);
    const pendentes = todas.filter(p => !estado.cartasSim.includes(p.id) && !estado.cartasNao.includes(p.id));
    let baralho = (pendentes.length >= 3 ? pendentes : todas).slice();
    for (let k = baralho.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [baralho[k], baralho[j]] = [baralho[j], baralho[k]]; }
    let idx = 0; const sim = [], nao = [];
    raiz.classList.add('prof-raiz--estreita', 'prof-raiz--cartas');
    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' }));
    const wrap = el('div', { class: 'prof-baralho' });
    wrap.appendChild(el('h1', { text: 'Maré de cartas', style: { fontSize: 'var(--t-3xl)', fontWeight: 800 } }));
    wrap.appendChild(el('p', { class: 'prof-lead prof-suave', text: 'Uma profissão por vez, um fato que surpreende. Arraste, use as setas do teclado ou os botões. No fim, seu rastro.', style: { margin: '8px 0 18px', fontSize: 'var(--t-md)' } }));
    const pilha = el('div', { class: 'prof-pilha' });
    const acoes = el('div', { class: 'prof-carta-acoes' }, botao('Não é pra mim', { classe: 'prof-btn--linha', icone: 'esquerda', onclick: () => decidir(false) }), botao('Me interessa', { classe: 'prof-btn--primario', iconeDepois: 'direita', onclick: () => decidir(true) }));
    const rastro = el('div', { class: 'prof-rastro' });
    wrap.append(pilha, acoes, rastro);
    raiz.appendChild(wrap);
    function teclas(e) { if (idx >= baralho.length) return; if (e.key === 'ArrowRight') decidir(true); if (e.key === 'ArrowLeft') decidir(false); }
    document.addEventListener('keydown', teclas);
    limpezas.push(() => document.removeEventListener('keydown', teclas));

    function cartaEl(p, classe) {
      const c = el('article', { class: 'prof-carta ' + (classe || ''), 'aria-label': p.nome },
        el('div', { class: 'prof-carta-cab' }, el('span', { text: nomeArea(ix, p.area) }), el('span', { text: `${Math.min(idx + 1, baralho.length)} de ${baralho.length}` })),
        el('h2', { text: p.nome }),
        el('p', { class: 'prof-fato' }, el('b', { text: 'Você sabia? ' }), p.carta.fato),
        el('p', { class: 'prof-micro', text: 'Fonte: ' + ((ix.fontes_cartas || {})[p.carta.fonte] || p.carta.fonte) }),
        el('span', { class: 'prof-carta-carimbo prof-carta-carimbo--sim', text: 'Me interessa', 'aria-hidden': 'true' }),
        el('span', { class: 'prof-carta-carimbo prof-carta-carimbo--nao', text: 'Não é pra mim', 'aria-hidden': 'true' }));
      c.style.setProperty('border-color', corArea(ix, p.area));
      return c;
    }
    function render() {
      pilha.textContent = '';
      if (idx >= baralho.length) { acoes.hidden = true; return fim(); }
      if (baralho[idx + 2]) pilha.appendChild(cartaEl(baralho[idx + 2], 'prof-carta--fundo2'));
      if (baralho[idx + 1]) pilha.appendChild(cartaEl(baralho[idx + 1], 'prof-carta--fundo'));
      const topo = cartaEl(baralho[idx], 'prof-carta--topo');
      pilha.appendChild(topo);
      arrastar(topo);
    }
    function arrastar(c) {
      let x0 = null, dx = 0;
      const sim = c.querySelector('.prof-carta-carimbo--sim'), nao = c.querySelector('.prof-carta-carimbo--nao');
      c.addEventListener('pointerdown', e => { x0 = e.clientX; c.style.transition = 'none'; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', e => { if (x0 === null) return; dx = e.clientX - x0; c.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; sim.style.opacity = Math.min(1, Math.max(0, dx / 80)); nao.style.opacity = Math.min(1, Math.max(0, -dx / 80)); });
      const soltar = () => { if (x0 === null) return; x0 = null; c.style.transition = ''; if (Math.abs(dx) > 90) decidir(dx > 0); else { c.style.transform = ''; sim.style.opacity = 0; nao.style.opacity = 0; } dx = 0; };
      c.addEventListener('pointerup', soltar); c.addEventListener('pointercancel', soltar);
    }
    function decidir(gostou) {
      const p = baralho[idx]; if (!p) return;
      (gostou ? sim : nao).push(p);
      const lista = gostou ? estado.cartasSim : estado.cartasNao; if (!lista.includes(p.id)) lista.push(p.id);
      if (gostou && !estado.mira.includes(p.id) && temFicha(p)) estado.mira.push(p.id);
      salvarEstado(); ganchos.registrar('profissao_carta', { profissao: p.id, interesse: gostou });
      const topo = pilha.querySelector('.prof-carta--topo');
      if (topo) { topo.style.transform = `translateX(${gostou ? 140 : -140}%) rotate(${gostou ? 10 : -10}deg)`; topo.style.opacity = '0'; }
      idx++;
      setTimeout(render, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320);
    }
    function fim() {
      const areas = {}; sim.forEach(p => areas[p.area] = (areas[p.area] || 0) + 1);
      const topArea = Object.keys(areas).sort((a, b) => areas[b] - areas[a])[0];
      const vistas = new Set(baralho.map(p => p.id));
      let sugestao = topArea ? ix.profissoes.find(p => p.area === topArea && !vistas.has(p.id)) : null;
      if (!sugestao && topArea) { const vizinhas = { saude: 'engenharia', negocios: 'tecnologia', tecnologia: 'engenharia', engenharia: 'tecnologia', educacao: 'direito-sociedade', 'direito-sociedade': 'negocios', comunicacao: 'negocios' }; sugestao = ix.profissoes.find(p => p.area === vizinhas[topArea] && !vistas.has(p.id)); }
      rastro.textContent = '';
      rastro.appendChild(el('div', { class: 'prof-caixa' },
        el('h2', { text: 'Seu rastro', style: { fontSize: 'var(--t-xl)', fontWeight: 800 } }),
        el('p', { class: 'prof-prosa', style: { marginTop: '8px' } }, sim.length ? ['Te interessaram: ', el('b', { text: sim.map(p => p.nome).join(', ') }), '. ', sim.some(p => temFicha(p)) ? 'As que já têm ficha entraram na sua mira.' : ''] : 'Nada te interessou desta vez. Isso também é informação: saber o que não quer encurta o caminho.'),
        topArea ? el('p', { class: 'prof-prosa', style: { marginTop: '8px' } }, 'A área que mais apareceu: ', el('b', { text: nomeArea(ix, topArea) }), '.') : null,
        sugestao ? el('p', { class: 'prof-sugestao' }, 'Uma que talvez você não tenha considerado: ', el('b', { text: sugestao.nome }), temFicha(sugestao) ? ['. ', link('Abrir a ficha', 'profissao-' + sugestao.id)] : '. A ficha dela está em produção.') : null,
        el('div', { style: { marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' } },
          botao('Embaralhar de novo', { classe: 'prof-btn--primario', icone: 'embaralhar', onclick: () => { idx = 0; sim.length = 0; nao.length = 0; baralho = todas.slice().sort(() => Math.random() - .5); rastro.textContent = ''; acoes.hidden = false; render(); } }),
          link('Ver o mapa', 'profissoes', { classe: 'prof-btn prof-btn--linha' }))));
      ganchos.registrar('profissoes_cartas_fim', { interesse: sim.map(p => p.id), area: topArea });
    }
    render();
  }

  /* =========================================================
     Tela: Como fazemos as fichas
     ========================================================= */
  /* =========================================================
     Tela: Comparar duas profissões (Fase 2) · #profissoes-comparar[-<a>--<b>]
     Os 4 números, como entrar, os caminhos e o DNA lado a lado, com as fontes de cada ficha.
     Só entram as fichas que esta conta pode abrir. O salário segue a regra da ficha: se ainda estiver
     escondido, um botão mostra os dois de uma vez (vale como "Prefiro só ver os números").
     ========================================================= */
  /* ---------- Roleta (comparador; 2026-10-17, inspirada num vídeo que o usuário mandou) ----------
     Fechada, é um botão com a cor da área e o nome. Aberta, uma roda: o nome do meio fica em destaque e os outros vão
     sumindo para cima e para baixo, com risquinhos do lado. Gira com a rolagem, o dedo ou as setas; o toque num nome
     (ou Enter) escolhe; Esc fecha sem mudar. o = { rotulo, opcoes: [{ id, nome, cor }], atual, lado: 'dir'?, aoEscolher(id) } */
  let roletas = 0;
  function roleta(o) {
    const uid = 'prof-roleta-' + (++roletas), LINHA = 44;
    const ini = Math.max(0, o.opcoes.findIndex(x => x.id === o.atual)), escolhida = o.opcoes[ini];
    const botaoR = el('button', { type: 'button', class: 'prof-roleta-botao', id: uid + '-bt', 'aria-haspopup': 'listbox', 'aria-expanded': 'false',
      'aria-labelledby': `${uid}-rot ${uid}-bt`, style: { '--cor-area': escolhida.cor } },
      el('i', { class: 'prof-roleta-cor', 'aria-hidden': 'true' }), el('span', { class: 'prof-roleta-nome', text: escolhida.nome }), icone('abre'));
    const itens = o.opcoes.map((op, i) => el('li', { class: 'prof-roleta-op', role: 'option', id: `${uid}-${i}`, 'aria-selected': 'false',
      style: { '--cor-area': op.cor }, onclick: () => escolher(i) }, el('i', { class: 'prof-roleta-cor', 'aria-hidden': 'true' }), op.nome));
    const lista = el('ul', { class: 'prof-roleta-lista', role: 'listbox', tabindex: '0', 'aria-labelledby': uid + '-rot' }, itens);
    const roda = el('div', { class: 'prof-roleta-roda', hidden: true }, el('span', { class: 'prof-roleta-faixa', 'aria-hidden': 'true' }, icone('direita')), lista);
    const caixa = el('div', { class: 'prof-roleta' + (o.lado === 'dir' ? ' prof-roleta--dir' : '') },
      el('span', { class: 'prof-min', id: uid + '-rot', text: o.rotulo }), botaoR, roda);
    let centro = ini, quadro = 0, aberta = false;
    function marcar(i) {
      centro = i;
      itens.forEach((li, k) => { li.setAttribute('aria-selected', String(k === i)); li.classList.toggle('prof-roleta-op--centro', k === i); });
      lista.setAttribute('aria-activedescendant', itens[i].id);
    }
    // cada nome some e encolhe conforme se afasta do meio; os risquinhos descrevem um arco
    function desenhar() {
      quadro = 0;
      const pos = lista.scrollTop / LINHA;
      itens.forEach((li, i) => {
        const d = i - pos, ad = Math.min(Math.abs(d), 3);
        li.style.opacity = String(Math.max(0.08, 1 - ad * 0.3).toFixed(2));
        li.style.transform = `translateX(${(Math.min(d * d, 9) * 3).toFixed(1)}px) scale(${(1 - ad * 0.06).toFixed(3)})`;
      });
      const c = Math.max(0, Math.min(itens.length - 1, Math.round(pos)));
      if (c !== centro) marcar(c);
    }
    lista.addEventListener('scroll', () => { if (!quadro) quadro = requestAnimationFrame(desenhar); }, { passive: true });
    const rolarPara = (i, suave) => lista.scrollTo({ top: i * LINHA, behavior: suave && !semMovimento() ? 'smooth' : 'auto' });
    const fora = e => { if (!caixa.contains(e.target)) fechar(false); };
    function abrir() {
      if (aberta) return; aberta = true;
      roda.hidden = false; botaoR.setAttribute('aria-expanded', 'true'); caixa.classList.add('prof-roleta--aberta');
      marcar(centro); rolarPara(centro, false); desenhar(); lista.focus({ preventScroll: true });
      setTimeout(() => document.addEventListener('pointerdown', fora, true), 0);
    }
    function fechar(devolverFoco) {
      if (!aberta) return; aberta = false;
      roda.hidden = true; botaoR.setAttribute('aria-expanded', 'false'); caixa.classList.remove('prof-roleta--aberta');
      document.removeEventListener('pointerdown', fora, true);
      if (devolverFoco) botaoR.focus({ preventScroll: true });
    }
    function escolher(i) { const op = o.opcoes[i]; fechar(true); if (op && op.id !== o.atual) o.aoEscolher(op.id); }
    botaoR.addEventListener('click', () => { if (aberta) fechar(true); else abrir(); });
    botaoR.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); abrir(); } });
    lista.addEventListener('keydown', e => {
      const passo = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
      const ir = i => { const k = Math.max(0, Math.min(itens.length - 1, i)); marcar(k); rolarPara(k, true); };
      if (passo) { e.preventDefault(); ir(centro + passo); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); ir(e.key === 'Home' ? 0 : itens.length - 1); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(centro); return; }
      if (e.key === 'Escape') { e.preventDefault(); fechar(true); return; }
      if (e.key === 'Tab') { fechar(false); return; }
      if (e.key.length === 1 && /\S/.test(e.key)) { // uma letra: o próximo nome que começa com ela
        const l = normalizar(e.key);
        for (let k = 1; k <= itens.length; k++) { const i = (centro + k) % itens.length; if (normalizar(o.opcoes[i].nome).startsWith(l)) { ir(i); break; } }
      }
    });
    limpezas.push(() => document.removeEventListener('pointerdown', fora, true));
    return caixa;
  }
  async function telaComparar(raiz, ix, par) {
    const abertas = ix.profissoes.filter(temFicha);
    raiz.classList.add('prof-raiz--media');
    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' }));
    raiz.appendChild(el('header', { class: 'prof-comp-topo' },
      el('span', { class: 'prof-rotulo', text: 'Comparar' }),
      el('h1', { text: 'Duas profissões lado a lado' }),
      el('p', { class: 'prof-lead', text: 'Duração, formato, salário, registro, como entrar, caminhos e o DNA de cada uma. Os números são os das fichas, com as mesmas fontes.' }),
      el('p', { class: 'prof-capa-meta prof-capa-fontes' }, botaoFontes())));
    if (abertas.length < 2) {
      raiz.appendChild(el('div', { class: 'prof-vazio' }, el('p', { text: 'Para comparar, é preciso ter pelo menos duas fichas no ar. Elas estão em revisão por profissionais e chegam em breve.' })));
      return;
    }
    if (!estado.salarioRevelado) estado.salarioRevelado = {};
    const ids = abertas.map(p => p.id);
    let [a, b] = String(par || '').split('--');
    if (!ids.includes(a)) a = estado.mira.find(id => ids.includes(id)) || ids[0];
    if (!ids.includes(b) || b === a) b = estado.mira.find(id => ids.includes(id) && id !== a) || ids.find(id => id !== a);
    const ir = (na, nb) => { location.hash = `profissoes-comparar-${na}--${nb}`; };
    // as fichas abertas na ordem das áreas (a cor da área no lugar da bandeira); a escolhida do outro lado fica fora
    const emOrdem = ix.areas.flatMap(ar => abertas.filter(p => p.area === ar.id));
    const opcoes = outro => emOrdem.filter(p => p.id !== outro).map(p => ({ id: p.id, nome: p.nome, cor: corArea(ix, p.area) }));
    raiz.appendChild(el('div', { class: 'prof-comp-escolhas' },
      roleta({ rotulo: 'Profissão 1', opcoes: opcoes(b), atual: a, aoEscolher: v => ir(v, b) }),
      botao('Trocar de lado', { classe: 'prof-btn--linha prof-btn--pequeno', icone: 'embaralhar', onclick: () => ir(b, a) }),
      roleta({ rotulo: 'Profissão 2', opcoes: opcoes(a), atual: b, lado: 'dir', aoEscolher: v => ir(a, v) })));
    const [fa, fb] = await Promise.all([ficha(a), ficha(b)]);
    if (!fa || !fb) return naoEncontrada(raiz, !fa ? a : b, ix);
    const par2 = [fa, fb];

    // Cabeçalho das colunas: fica preso no topo enquanto rola
    raiz.appendChild(el('div', { class: 'prof-comp-linha prof-comp-cab' }, par2.map(f => el('a', { href: '#profissao-' + f.id, class: 'prof-comp-nome', style: { '--cor-area': corArea(ix, f.area) } },
      el('span', { class: 'prof-rotulo', text: nomeArea(ix, f.area) }), el('b', null, f.nome, icone('direita'))))));
    const bloco = (titulo, celulas, extra) => el('section', { class: 'prof-comp-bloco' }, el('h2', { text: titulo }),
      celulas ? el('div', { class: 'prof-comp-linha' }, celulas.map(c => el('div', { class: 'prof-comp-cel' }, c))) : null, extra || null);
    const numero = (f, k) => {
      const n = f.numeros && f.numeros[k];
      if (!n) return el('p', { class: 'prof-min', text: 'Sem este dado na ficha.' });
      return [el('div', { class: 'prof-comp-valor', text: n.valor.replace(/semipresencial/g, 'semi­presencial') }), el('p', { class: 'prof-micro' }, n.detalhe, citar(f, n.fontes))];
    };
    raiz.appendChild(bloco('Duração', par2.map(f => numero(f, 'duracao'))));
    raiz.appendChild(bloco('Formato', par2.map(f => numero(f, 'formato'))));

    // Salário: os dois juntos, para a comparação ser justa
    const visto = f => (estado.salarioRevelado[f.id] || 0) >= 1;
    const secSalario = el('div');
    const desenharSalario = () => {
      secSalario.textContent = '';
      if (par2.every(visto)) { secSalario.appendChild(bloco('Média de contratação', par2.map(f => numero(f, 'salario')))); return; }
      secSalario.appendChild(bloco('Média de contratação', par2.map(f => visto(f) ? numero(f, 'salario') : [el('div', { class: 'prof-comp-valor prof-sigilo', text: 'R$ ?' }), el('p', { class: 'prof-micro', text: 'Escondido até você chutar na ficha.' })]),
        el('div', { class: 'prof-comp-acao' }, botao('Mostrar os dois salários', { classe: 'prof-btn--linha prof-btn--pequeno', icone: 'olho', onclick: () => {
          par2.forEach(f => { if (!visto(f)) estado.salarioRevelado[f.id] = 1; }); salvarEstado(); desenharSalario();
        } }), el('span', { class: 'prof-micro', text: 'Quer chutar antes? Abra a ficha.' }))));
    };
    desenharSalario();
    raiz.appendChild(secSalario);
    raiz.appendChild(bloco('Registro profissional', par2.map(f => numero(f, 'registro'))));

    // Como entrar: as matérias que mais pesam
    raiz.appendChild(bloco('Matérias que mais pesam para entrar', par2.map(f => {
      const ce = f.secoes && f.secoes.como_entrar;
      const mats = (ce && ce.materias_chave) || [];
      return mats.length ? el('div', { class: 'prof-chips-lista' }, mats.map(m => el('span', { text: ganchos.nomeCurso(m) }))) : el('p', { class: 'prof-min', text: 'Veja a ficha.' });
    })));
    // Caminhos depois de formado
    raiz.appendChild(bloco('Caminhos depois de formado', par2.map(f => {
      const itens = (f.secoes && f.secoes.caminhos && f.secoes.caminhos.itens) || [];
      return el('ul', { class: 'prof-comp-lista' }, itens.map(c => el('li', { text: c.titulo })));
    })));

    // DNA: as duas no mesmo radar e uma frase com a maior diferença
    if (fa.dna && fb.dna && IG()) {
      const va = EIXOS.map(e => fa.dna[e[0]]), vb = EIXOS.map(e => fb.dna[e[0]]);
      const difs = EIXOS.map((e, i) => ({ nome: e[1].toLowerCase(), d: va[i] - vb[i] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
      const maisA = difs.find(x => x.d >= 15), maisB = difs.find(x => x.d <= -15);
      const leitura = maisA && maisB ? `${fa.nome} pesa mais em ${maisA.nome}; ${fb.nome}, em ${maisB.nome}.`
        : maisA ? `${fa.nome} pesa mais em ${maisA.nome}.` : maisB ? `${fb.nome} pesa mais em ${maisB.nome}.` : 'As duas têm um DNA parecido: a diferença está nos detalhes da ficha.';
      raiz.appendChild(bloco('DNA da profissão', null, el('div', { class: 'prof-comp-dna' },
        el('div', { class: 'prof-comp-radar' }, IG().radar({ eixos: EIXOS.map(e => e[1]), rotulo: `DNA de ${fa.nome} e de ${fb.nome}`, series: [{ nome: fa.nome, valores: va, classe: 'profissao' }, { nome: fb.nome, valores: vb, classe: 'voce' }] }),
          el('div', { class: 'prof-legenda' }, el('span', null, el('i', { style: { '--cor': 'var(--turquesa)' } }), fa.nome), el('span', null, el('i', { class: 'prof-legenda--tracejado', style: { '--cor': 'var(--amarelo)' } }), fb.nome))),
        el('div', null, el('p', { class: 'prof-prosa prof-prosa--grande', text: leitura }), el('p', { class: 'prof-micro', style: { marginTop: '8px' }, text: 'Estimativa inicial, a calibrar com profissionais de cada área.' })))));
    }

    // Para seguir: as duas fichas e o "Um dia como", quando houver
    raiz.appendChild(el('div', { class: 'prof-comp-fim' }, par2.map(f => el('div', { class: 'prof-comp-cel' },
      link('Abrir a ficha de ' + f.nome, 'profissao-' + f.id, { classe: 'prof-btn prof-btn--linha', icone: 'direita' }),
      f.dia ? link(f.dia.titulo, 'profissao-' + f.id + '-dia', { classe: 'prof-btn prof-btn--linha', icone: 'play' }) : null))));
  }

  function telaMetodo(raiz, ix) {
    raiz.classList.add('prof-raiz--estreita');
    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' }));
    raiz.appendChild(el('h1', { text: 'Como fazemos as fichas', style: { fontSize: 'var(--t-3xl)', fontWeight: 800, marginBottom: '8px' } }));
    raiz.appendChild(el('p', { class: 'prof-lead prof-suave', text: 'Escolher uma profissão é uma decisão grande. Por isso cada ficha segue o mesmo caminho, e você pode conferir cada passo.', style: { marginBottom: '20px', fontSize: 'var(--t-lg)', maxWidth: '36em' } }));
    const passos = [
      ['Pesquisa em fontes oficiais', 'Leis, decretos e resoluções do MEC e do CNE; dados do Inep e do Sisu; conselhos profissionais; e o Novo Caged, do Ministério do Trabalho, para salários. Imprensa só para contexto, nunca como única fonte de um número.'],
      ['Todo número com fonte e data', 'Os colchetes numerados ao longo da ficha levam à lista de fontes, com órgão, data da consulta e link. Fontes de salário vencem em 180 dias e são renovadas.'],
      ['Honestidade obrigatória', 'Toda ficha tem a seção "O que ninguém te conta", com os pontos difíceis da profissão. Sem ela, a ficha não é publicada.'],
      ['Validação por IA, com aprovação humana', 'Os fatos passam pelo Mergulho Triplo, a validação do Diver, sempre com aprovação do administrador e custo visível. Nenhuma IA roda enquanto você usa o app.'],
      ['Revisão por quem vive a profissão', 'Um profissional da área lê a ficha e as cenas do "Um dia como" antes da publicação. O nome e a data da revisão ficam no rodapé da ficha.'],
      ['Você decide', 'O Diver não diz o que escolher. Afinidade, votos e rankings são informação, não veredito.']
    ];
    raiz.appendChild(el('div', { class: 'prof-passos' }, passos.map(([t, d]) => el('div', { class: 'prof-caixa' }, el('h3', { text: t }), el('p', { class: 'prof-prosa', text: d })))));
    raiz.appendChild(el('div', { class: 'prof-caixa prof-caixa--turquesa', style: { marginTop: '20px' } }, el('h3', { text: 'O que significa "média de contratação"' }), el('p', { class: 'prof-prosa', text: 'É a média do salário-base de quem foi contratado com carteira nos últimos 12 meses, segundo o Novo Caged. Não inclui adicionais (noturno, insalubridade, plantões extras) nem o setor público estatutário. Por isso pode ficar abaixo do piso por lei, que vale para 44 horas semanais e, no setor privado, passa por negociação coletiva.' })));
    raiz.appendChild(el('p', { class: 'prof-fonte-nota', style: { marginTop: '20px' } }, 'Achou um erro em alguma ficha? Conte para a equipe do Diver: a correção entra na fila de revisão com prioridade.'));
  }

  /* =========================================================
     Início standalone (profissoes.html): roteia pelo hash
     ========================================================= */
  function iniciar(raiz) {
    const rotear = () => montar(raiz, location.hash.slice(1) || 'profissoes').then(() => { if (!/^#sec-|^#fonte-/.test(location.hash)) window.scrollTo({ top: 0 }); });
    window.addEventListener('hashchange', rotear);
    rotear();
  }

  /* No app: ao sair da área, solta os atalhos de teclado da tela (Maré de cartas, Um dia como). */
  function desmontar() { jaMontou = false; fecharFonte(); document.body.classList.remove('prof-sem-menu'); while (limpezas.length) { try { limpezas.pop()(); } catch (e) { /* ignora */ } } }
  window.Profissoes = {
    montar, desmontar, iniciar, ganchos, estado: () => estado, indice, ficha, BASE,
    registrarExtensao: ext => extensoes.push(ext),
    /* Peças para as extensões (js/profissoes-panorama.js): as mesmas da ficha, para o desenho ficar igual */
    _util: { el, icone, aviso, botao, link, citar, prosa, brl, dataBR, normalizar, nomeArea, corArea, salvarEstado, lerJson, limpezas, IG, EIXOS,
      temFicha, temPanorama, pedir, semMovimento, contar, ir, fontesGuardadas, abrirFonte, abrirFontes, botaoFontes, numeroFonte, dadosPanorama,
      topoPagina, cabecalho, indiceCapitulos, linhasCargos,
      capituloRelatorio, fonteLinha, faixaNumero, numerosProf, capaRelatorio, linhaEmNumeros, caixaResumo, calloutsNumerados, regua, dominioDe }
  };
})();

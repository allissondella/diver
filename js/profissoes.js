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
  const cache = { indice: null, fichas: {}, trends: undefined };
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
    x: ['M18 6 6 18', 'm6 6 12 12'], baixo: ['M12 5v14', 'm19 12-7 7-7-7'], cadeado: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
    dado: ['M3 3h18v18H3z', 'M8 8h.01', 'M16 8h.01', 'M12 12h.01', 'M8 16h.01', 'M16 16h.01']
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
  const brl = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
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
     Citações: marcação numerada que leva à lista de fontes
     ========================================================= */
  function numeroFonte(f, id) { const i = (f.fontes || []).findIndex(x => x.id === id); return i >= 0 ? i + 1 : null; }
  /* Cada fonte citada vira uma bolinha com o número; o toque abre a fonte num cartão (as fontes ficam guardadas até alguém pedir). */
  function citar(f, ids) {
    const lista = (ids || []).filter(id => numeroFonte(f, id));
    if (!lista.length) return null;
    const sup = el('sup', { class: 'prof-cit' });
    lista.forEach(id => {
      const fonte = f.fontes.find(x => x.id === id), n = numeroFonte(f, id);
      sup.appendChild(el('button', { type: 'button', class: 'prof-cit-b', 'aria-label': `Fonte ${n}: ${fonte.titulo}`, title: 'Ver a fonte', text: String(n), onclick: e => { e.stopPropagation(); abrirFonte(f, id, e.currentTarget); } }));
    });
    return sup;
  }
  const metaFonte = fo => `${fo.orgao}. Consultado em ${dataBR(fo.consultado_em)}${fo.dados_atualizados_em ? ', dados atualizados em ' + dataBR(fo.dados_atualizados_em) : ''}. Fonte ${fo.tipo === 'primaria' ? 'primária' : 'secundária'}.`;
  let popFonte = null;
  function fecharFonte() {
    if (!popFonte) return;
    const { caixa, origem, sair } = popFonte; popFonte = null;
    sair(); caixa.remove();
    if (origem && origem.isConnected) origem.focus({ preventScroll: true });
  }
  function abrirFonte(f, id, origem) {
    const fo = (f.fontes || []).find(x => x.id === id); if (!fo) return;
    fecharFonte();
    const n = numeroFonte(f, id);
    const fechar = el('button', { type: 'button', class: 'prof-pop-fechar', 'aria-label': 'Fechar a fonte', onclick: fecharFonte }, icone('x'));
    const caixa = el('div', { class: 'prof-pop', role: 'dialog', 'aria-label': `Fonte ${n}` },
      el('div', { class: 'prof-pop-cab' }, el('span', { class: 'prof-pop-n', text: String(n) }), el('span', { class: 'prof-rotulo', text: `Fonte ${n} de ${f.fontes.length}` }), fechar),
      el('p', { class: 'prof-pop-titulo' }, fo.url ? el('a', { href: fo.url, target: '_blank', rel: 'noopener' }, fo.titulo, ' ', icone('link')) : fo.titulo),
      el('p', { class: 'prof-micro', text: metaFonte(fo) }),
      fo.nota ? el('p', { class: 'prof-fontes-nota', text: 'Pendência: ' + fo.nota }) : null);
    const tecla = e => { if (e.key === 'Escape') fecharFonte(); };
    const fora = e => { if (!caixa.contains(e.target)) fecharFonte(); };
    document.addEventListener('keydown', tecla);
    setTimeout(() => document.addEventListener('click', fora), 0);
    popFonte = { caixa, origem, sair: () => { document.removeEventListener('keydown', tecla); document.removeEventListener('click', fora); } };
    document.body.appendChild(caixa);
    // No computador, o cartão abre junto da bolinha tocada; no celular, sobe do rodapé
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
  function prosa(f, textoProsa, ids, classe) { return el('p', { class: classe || 'prof-prosa' }, textoProsa, citar(f, ids)); }

  /* =========================================================
     Roteador
     ========================================================= */
  const limpezas = []; /* listeners de teclado da tela anterior */
  const extensoes = []; /* módulos extras (ex.: js/profissoes-tecnologia.js) registram { aceita(rota), montar(raiz, rota, ix) } */
  async function montar(raiz, rota) {
    carregarEstado();
    fecharFonte();
    while (limpezas.length) { try { limpezas.pop()(); } catch (e) { /* ignora */ } }
    raiz.textContent = '';
    raiz.classList.add('prof-raiz');
    const r = (rota || 'profissoes').replace(/^#/, '');
    try {
      const ix = await indice();
      if (r === 'profissoes' || r === '') return telaMapa(raiz, ix);
      if (r === 'profissoes-cartas') return telaCartas(raiz, ix);
      if (r === 'profissoes-metodo') return telaMetodo(raiz, ix);
      for (const ext of extensoes) if (ext.aceita(r)) return await ext.montar(raiz, r, ix);
      let m = r.match(/^profissao-(.+)-(dia|mitos)$/);
      if (m) { const f = await ficha(m[1]); if (!f) return naoEncontrada(raiz); return m[2] === 'dia' ? telaDia(raiz, f, ix) : telaMitos(raiz, f, ix); }
      m = r.match(/^profissao-(.+)$/);
      if (m) { const f = await ficha(m[1]); if (!f) return naoEncontrada(raiz, m[1], ix); return telaFicha(raiz, f, ix); }
      return telaMapa(raiz, ix);
    } catch (e) {
      raiz.appendChild(el('div', { class: 'prof-vazio' }, el('p', { text: 'Não deu para carregar o Mapa das Profissões agora. Tente de novo em instantes.' }), el('p', { class: 'prof-micro', text: String(e.message || e) })));
    }
  }
  function naoEncontrada(raiz, id, ix) {
    const p = ix && ix.profissoes.find(x => x.id === id);
    raiz.appendChild(el('div', { class: 'prof-topo' }, link('Mapa das Profissões', 'profissoes', { classe: 'prof-voltar', icone: 'esquerda' })));
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
     Tela: Mapa
     ========================================================= */
  function telaMapa(raiz, ix) {
    ganchos.registrar('profissoes_mapa', {});
    const prontas = ix.profissoes.filter(p => temFicha(p));
    const exploradas = Object.keys(estado.vistas).length;

    const hero = el('section', { class: 'prof-hero' },
      el('div', null,
        el('span', { class: 'prof-rotulo', text: 'Futuro' }),
        el('h1', { text: 'Mapa das Profissões' }),
        el('p', { class: 'prof-lead', text: 'O que cada profissão faz, estuda e vive no dia a dia. Todo número tem fonte e data. O Diver informa; quem decide é você.' }),
        el('div', { class: 'prof-hero-acoes' },
          link('Começar pela Maré de cartas', 'profissoes-cartas', { classe: 'prof-btn prof-btn--primario', icone: 'camadas' }),
          link('Como fazemos as fichas', 'profissoes-metodo', { classe: 'prof-btn prof-btn--linha', icone: 'info' }))),
      el('div', { class: 'prof-painel' },
        tile('Profissões no mapa', ix.profissoes.length),
        tile('Fichas no ar', prontas.length, 'turquesa', prontas.length ? `${prontas.filter(p => p.status === 'rascunho').length} em revisão` : ''),
        tile('Exploradas por você', exploradas, 'turquesa'),
        tile('Na sua mira', estado.mira.length, 'amarelo')));
    raiz.appendChild(hero);

    // Ferramentas
    let filtroArea = 'todas', soProntas = false, termo = '';
    const grade = el('div');
    const busca = el('input', { type: 'search', id: 'prof-busca', placeholder: 'Busque: enfermagem, direito, programador, RH…', 'aria-label': 'Buscar profissão', autocomplete: 'off', oninput: e => { termo = normalizar(e.target.value); render(); } });
    const chips = el('div', { class: 'prof-chips', role: 'group', 'aria-label': 'Filtrar por área' });
    const chipTodas = el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': 'true', text: 'Todas', onclick: () => { filtroArea = 'todas'; render(); } });
    chips.appendChild(chipTodas);
    ix.areas.forEach(a => chips.appendChild(el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': 'false', text: a.nome, dataset: { area: a.id }, onclick: () => { filtroArea = a.id; render(); } })));
    const chipProntas = el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': 'false', text: 'Só com ficha', onclick: () => { soProntas = !soProntas; render(); } });
    chips.appendChild(chipProntas);
    raiz.appendChild(el('section', { class: 'prof-ferramentas' }, el('div', { class: 'prof-busca' }, icone('busca'), busca), chips));

    // Na mira
    if (estado.mira.length) {
      const faixa = el('section', { class: 'prof-faixa' }, el('h2', null, icone('alvo'), 'Na sua mira'), el('div', { class: 'prof-chips' }));
      estado.mira.forEach(id => { const p = ix.profissoes.find(x => x.id === id); if (p) faixa.lastChild.appendChild(link(p.nome, 'profissao-' + id, { classe: 'prof-chip' })); });
      raiz.appendChild(faixa);
    }
    // Mais exploradas (no protótipo, deste aparelho)
    const top = Object.entries(estado.vistas).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) {
      const faixa = el('section', { class: 'prof-faixa' }, el('h2', null, icone('estrela'), 'Mais exploradas'), el('div', { class: 'prof-chips' }), el('span', { class: 'prof-micro', text: 'Neste aparelho.' }));
      top.forEach(([id, n]) => { const p = ix.profissoes.find(x => x.id === id); if (p) faixa.children[1].appendChild(link(`${p.nome} · ${n}`, 'profissao-' + id, { classe: 'prof-chip' })); });
      raiz.appendChild(faixa);
    }
    raiz.appendChild(grade);

    function render() {
      chips.querySelectorAll('.prof-chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      (filtroArea === 'todas' ? chipTodas : chips.querySelector(`[data-area="${filtroArea}"]`)).setAttribute('aria-pressed', 'true');
      chipProntas.setAttribute('aria-pressed', String(soProntas));
      grade.textContent = '';
      let total = 0;
      ix.areas.forEach(a => {
        if (filtroArea !== 'todas' && filtroArea !== a.id) return;
        const lista = ix.profissoes.filter(p => p.area === a.id && (!soProntas || temFicha(p)) && (!termo || normalizar(p.nome + ' ' + (p.busca || '')).includes(termo)));
        const pn = a.panorama ? (ix.panoramas || []).find(x => x.rota === a.panorama.rota) : null;
        const panorama = pn && (!soProntas || temPanorama(pn)) && (!termo || normalizar(`${a.nome} ${a.panorama.titulo} ${a.panorama.frase} ${pn.busca || ''}`).includes(termo)) ? ilhaPanorama(a, pn) : null;
        if (!lista.length && !panorama) return;
        total += lista.length + (panorama ? 1 : 0);
        const sec = el('section', { class: 'prof-regiao', style: { '--cor-area': `var(${a.cor})` } },
          el('div', { class: 'prof-regiao-cab' }, el('h2', null, el('span', { 'aria-hidden': 'true' }), a.nome), el('span', { class: 'prof-min', text: `${lista.length} ${lista.length === 1 ? 'profissão' : 'profissões'}` })),
          el('div', { class: 'prof-grade' }, panorama, lista.map(p => ilha(p, ix))));
        grade.appendChild(sec);
      });
      if (!total) grade.appendChild(el('div', { class: 'prof-vazio' }, el('p', { text: 'Nenhuma profissão com esse nome por aqui ainda.' }), el('div', { style: { marginTop: '10px' } }, botao('Pedir esta profissão', { classe: 'prof-btn--linha prof-btn--pequeno', onclick: () => pedir(normalizar(busca.value).replace(/\s+/g, '-'), busca.value || 'essa profissão') }))));
    }
    render();

    raiz.appendChild(el('p', { class: 'prof-fonte-nota', style: { marginTop: '28px' } }, 'Fatos das cartas: Censo da Educação Superior 2024 (Inep), leis e decretos federais, Sisu 2026, Google Trends 2021–2026, Novo Caged e Brasscom. Cada ficha traz a lista completa de fontes, com data de consulta. ', link('Veja como fazemos as fichas', 'profissoes-metodo')));

    function tile(rotulo, valor, cor, sub) { return el('div', { class: 'prof-tile' + (cor ? ' prof-tile--' + cor : '') }, el('div', { class: 'prof-min', text: rotulo }), el('div', { class: 'prof-tile-v prof-num', text: String(valor) }), sub ? el('div', { class: 'prof-micro', text: sub }) : null); }
  }
  /* Panorama de uma área: um cartão largo no topo da região (aberto para a equipe; "Em breve" para o aluno enquanto é rascunho) */
  function ilhaPanorama(a, pn) {
    const corpo = [el('span', { class: 'prof-selo prof-selo--pronta', text: pn.status === 'publicada' ? 'Panorama' : 'Panorama em revisão' }), el('h3', { text: a.panorama.titulo }), el('p', { text: a.panorama.frase })];
    if (temPanorama(pn)) return el('a', { href: '#' + a.panorama.rota, class: 'prof-ilha prof-ilha--panorama', style: { '--cor-area': `var(${a.cor})` } }, ...corpo, el('span', { class: 'prof-ilha-seta', 'aria-hidden': 'true' }, icone('direita')));
    corpo[0] = el('span', { class: 'prof-selo', text: 'Em breve' });
    return el('button', { type: 'button', class: 'prof-ilha prof-ilha--panorama prof-ilha--breve', style: { '--cor-area': `var(${a.cor})`, textAlign: 'left', font: 'inherit' }, onclick: () => pedir(pn.id, a.panorama.titulo) }, ...corpo);
  }
  function ilha(p, ix) {
    const naMira = estado.mira.includes(p.id), vista = !!estado.vistas[p.id];
    const selo = temFicha(p)
      ? (naMira ? el('span', { class: 'prof-selo prof-selo--mira' }, icone('alvo'), 'Na mira') : vista ? el('span', { class: 'prof-selo prof-selo--vista' }, icone('certo'), 'Explorada') : el('span', { class: 'prof-selo prof-selo--pronta', text: p.status === 'rascunho' ? 'Ficha em revisão' : 'Ficha pronta' }))
      : el('span', { class: 'prof-selo', text: 'Em breve' });
    const fato = p.carta ? el('p', { class: 'prof-fato' }, el('b', { text: 'Você sabia? ' }), p.carta.fato) : (p.frase ? el('p', { text: p.frase }) : el('p', { text: 'Ficha em produção. Toque para pedir prioridade.' }));
    if (temFicha(p)) return el('a', { href: '#profissao-' + p.id, class: 'prof-ilha', style: { '--cor-area': corArea(ix, p.area) } }, selo, el('h3', { text: p.nome }), fato);
    return el('button', { type: 'button', class: 'prof-ilha prof-ilha--breve', style: { '--cor-area': corArea(ix, p.area), textAlign: 'left', font: 'inherit' }, onclick: () => pedir(p.id, p.nome) }, selo, el('h3', { text: p.nome }), fato);
  }

  /* =========================================================
     Tela: Ficha (2026-10-16: a ficha se conta enquanto o aluno rola)
     Abertura em tela cheia; cada parte é uma "cena" que acende ao entrar na tela e, em algumas, o desenho se monta
     (relógio, números, linha da formação, DNA); guia fixo com progresso e as seções; doca com as ações no rodapé;
     salário escondido até o chute; fontes guardadas, abertas no toque. O conteúdo é o mesmo do JSON, sem mudança.
     ========================================================= */
  const semMovimento = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  /** Palavras em <span> para entrarem uma a uma (o texto continua o mesmo). */
  function palavras(texto) {
    const out = [];
    String(texto).split(' ').forEach((p, i) => { if (i) out.push(' '); out.push(el('span', { class: 'prof-palavra', style: { '--i': i }, text: p })); });
    return out;
  }
  /** Conta do zero até o número que abre o texto ("5 anos", "R$ 4.503") e termina no texto exato. */
  function contar(alvo, texto) {
    const m = /^(\D*?)(\d[\d.]*)(.*)$/.exec(texto);
    if (!m || semMovimento()) { alvo.textContent = texto; return; }
    const fim = Number(m[2].replace(/\./g, '')), ms = 900, t0 = performance.now();
    const passo = t => {
      const k = Math.min(1, (t - t0) / ms), v = Math.round(fim * (1 - Math.pow(1 - k, 3)));
      alvo.textContent = k < 1 ? m[1] + (m[2].includes('.') ? v.toLocaleString('pt-BR') : String(v)) + m[3] : texto;
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
  /** Cenas: acendem uma vez ao entrar na tela e chamam o "aoAparecer" de cada uma. */
  function observarCenas(raiz) {
    const cenas = [...raiz.querySelectorAll('.prof-surge')];
    const acender = c => { if (c.classList.contains('prof-surge--viva')) return; c.classList.add('prof-surge--viva'); if (c._aoAparecer) c._aoAparecer(); };
    if (!('IntersectionObserver' in window) || semMovimento()) { cenas.forEach(acender); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { acender(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    cenas.forEach(c => io.observe(c));
    limpezas.push(() => io.disconnect());
  }

  function telaFicha(raiz, f, ix) {
    estado.vistas[f.id] = (estado.vistas[f.id] || 0) + 1; salvarEstado();
    ganchos.registrar('profissao_vista', { profissao: f.id });
    if (!estado.salarioRevelado) estado.salarioRevelado = {};
    const cor = corArea(ix, f.area);
    raiz.style.setProperty('--cor-area', cor);

    raiz.appendChild(el('div', { class: 'prof-topo' }, link('Mapa das Profissões', 'profissoes', { classe: 'prof-voltar', icone: 'esquerda' }),
      f.status !== 'publicada' ? el('span', { class: 'prof-selo prof-selo--rascunho', text: f.revisao && f.revisao.profissional === 'ok' ? 'Validada' : 'Em revisão por profissional' }) : null));

    // Abertura em tela cheia e o guia fixo (as seções entram no guia no fim, só as que existem)
    const historia = abrirHistoria(raiz, { rotulo: nomeArea(ix, f.area), cor, titulo: f.nome, frase: f.frase, rotuloNav: 'Seções da ficha' });
    const raizSecoes = raiz; raiz = historia.corpo;

    // Agora mesmo: o relógio gira até a hora de agora
    if (f.agora && f.agora.length && IG()) {
      const d = new Date(), h = d.getHours(), mi = d.getMinutes();
      const faixa = f.agora.find(x => h >= x.de && h < x.ate) || f.agora[0];
      raiz.appendChild(el('section', { class: 'prof-agora prof-surge', 'aria-label': 'Agora mesmo' },
        el('div', { class: 'prof-agora-relogio' }, IG().relogio({ faixas: f.agora, hora: h, minuto: mi })),
        el('div', null,
          el('div', { class: 'prof-agora-hora' }, 'Agora, às ', el('span', { text: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` }), ', um profissional de ', f.nome.toLowerCase(), ' provavelmente está em:'),
          el('p', { class: 'prof-agora-texto' }, el('b', { text: faixa.texto })),
          f.agora_nota ? el('p', { class: 'prof-micro', text: f.agora_nota, style: { marginTop: '6px' } }) : null)));
    }

    // Quatro números: contam do zero ao aparecer; o salário fica escondido até o chute
    const nums = f.numeros || {};
    const ordem = [['duracao', 'Duração'], ['formato', 'Formato'], ['salario', 'Média de contratação', 'amarelo'], ['registro', 'Registro profissional']];
    const contaveis = [];
    let cartaoSalario = null;
    const secNumeros = el('section', { class: 'prof-numeros prof-surge', 'aria-label': 'Números principais' }, ordem.filter(([k]) => nums[k]).map(([k, rotulo, corN], i) => {
      const n = nums[k];
      const txt = n.valor.replace(/semipresencial/g, 'semi\u00ADpresencial'); // hífen opcional: quebra como "semi-presencial" no celular
      const valor = el('span', { class: 'prof-numero-txt', text: txt });
      const fontes = (n.fontes || []).filter(id => numeroFonte(f, id));
      const cartao = el('div', { class: 'prof-numero' + (corN ? ' prof-numero--' + corN : ''), style: { '--i': i } },
        el('div', { class: 'prof-min', text: rotulo }),
        el('div', { class: 'prof-numero-v prof-num' + (n.valor.length > 12 ? ' prof-numero-v--texto' : '') }, valor),
        el('div', { class: 'prof-micro', text: n.detalhe }),
        fontes.length ? el('div', { class: 'prof-numero-fontes' }, fontes.map(id => el('button', { type: 'button', class: 'prof-fonte-mini', onclick: e => { e.stopPropagation(); abrirFonte(f, id, e.currentTarget); } }, icone('info'), `Fonte ${numeroFonte(f, id)}`))) : null);
      if (k === 'salario') cartaoSalario = { cartao, valor, texto: n.valor };
      else contaveis.push([valor, txt]);
      return cartao;
    }));
    secNumeros._aoAparecer = () => contaveis.forEach(([alvo, texto]) => contar(alvo, texto));
    raiz.appendChild(secNumeros);

    // O salário só aparece depois do chute (ou de "Prefiro só ver os números"): 1 = a média do topo; 2 = tudo
    const segredos = [];
    const nivelSalario = () => estado.salarioRevelado[f.id] || 0;
    function revelarSalario(nivel) {
      if (nivel <= nivelSalario()) return;
      estado.salarioRevelado[f.id] = nivel; salvarEstado();
      aplicarSalario(true);
    }
    function aplicarSalario(animar) {
      const nivel = nivelSalario();
      if (cartaoSalario) {
        const { cartao, valor, texto } = cartaoSalario;
        const tampa = cartao.querySelector('.prof-numero-tampa');
        if (nivel >= 1) {
          cartao.classList.remove('prof-numero--segredo');
          if (tampa) tampa.remove();
          valor.hidden = false;
          if (animar) { cartao.classList.add('prof-revelado'); contar(valor, texto); } else valor.textContent = texto;
        } else if (!tampa) {
          cartao.classList.add('prof-numero--segredo');
          valor.hidden = true;
          cartao.querySelector('.prof-numero-v').append(el('span', { class: 'prof-numero-tampa' }, el('span', { class: 'prof-numero-oculto', 'aria-hidden': 'true', text: 'R$ ?' }),
            el('button', { type: 'button', class: 'prof-btn prof-btn--linha prof-btn--pequeno', onclick: irParaChute }, icone('alvo'), 'Chutar primeiro')));
        }
      }
      segredos.forEach(sg => sg(nivel >= 2, animar));
    }
    function irParaChute() {
      const sec = document.getElementById('sec-quanto-ganha'); if (!sec) return;
      sec.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' });
      const r = sec.querySelector('input[type="range"]'); if (r) setTimeout(() => r.focus({ preventScroll: true }), semMovimento() ? 0 : 600);
    }

    const S = f.secoes || {};
    const secao = (id, titulo, sub, ...conteudo) => el('section', { class: 'prof-secao prof-surge', id: 'sec-' + id }, el('h2', null, titulo, sub ? el('small', { text: sub }) : null), ...conteudo);

    // 1. O que faz: chave entre "o que faz" e "o que não faz"
    if (S.o_que_faz) {
      const faz = el('div', { class: 'prof-lado', role: 'tabpanel' }, prosa(f, S.o_que_faz.texto, S.o_que_faz.fontes));
      const conteudo = [];
      if (S.o_que_faz.nao_faz) {
        const naoFaz = el('div', { class: 'prof-lado prof-caixa prof-caixa--turquesa', role: 'tabpanel', hidden: true }, el('h3', { text: 'O que não faz' }), prosa(f, S.o_que_faz.nao_faz, S.o_que_faz.fontes, 'prof-prosa'));
        const b1 = el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', text: 'O que faz', onclick: () => trocar(true) });
        const b2 = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', text: 'O que não faz', onclick: () => trocar(false) });
        function trocar(lado) { b1.setAttribute('aria-selected', String(lado)); b2.setAttribute('aria-selected', String(!lado)); faz.hidden = !lado; naoFaz.hidden = lado; (lado ? faz : naoFaz).classList.add('prof-lado--entra'); }
        conteudo.push(el('div', { class: 'prof-chave', role: 'tablist', 'aria-label': 'O que faz e o que não faz' }, b1, b2), faz, naoFaz);
      } else conteudo.push(faz);
      raiz.appendChild(secao('o-que-faz', 'O que faz', null, ...conteudo));
    }

    // 2. Dia a dia
    if (S.dia_a_dia) raiz.appendChild(secao('dia-a-dia', 'Um dia de trabalho', S.dia_a_dia.revisar_com_profissional ? 'Descrição típica, em revisão com profissionais da área.' : null,
      prosa(f, S.dia_a_dia.texto, S.dia_a_dia.fontes),
      f.dia ? el('div', { style: { marginTop: '14px' } }, link('Viver um dia como ' + f.nome.toLowerCase(), 'profissao-' + f.id + '-dia', { classe: 'prof-btn prof-btn--primario', icone: 'play' })) : null));

    // 3. O que estuda: a linha da formação cresce ano a ano ao aparecer
    if (S.o_que_estuda) {
      const conteudo = [prosa(f, S.o_que_estuda.texto, S.o_que_estuda.fontes)];
      if (S.o_que_estuda.disciplinas) conteudo.push(el('div', { class: 'prof-chips-lista' }, S.o_que_estuda.disciplinas.map((d, i) => el('span', { text: d, style: { '--i': i } }))));
      if (f.formacao && IG()) {
        conteudo.push(el('div', { class: 'prof-caixa prof-formacao', style: { marginTop: '16px' } },
          el('div', { class: 'prof-grafico-cab' }, el('h3', { text: 'Quanto tempo até trabalhar' }), el('span', { class: 'prof-min', text: f.formacao.nota })),
          IG().linhaFormacao({ etapas: f.formacao.etapas, maxAnos: anosFormacao(f.formacao.etapas) }),
          el('div', { class: 'prof-legenda' }, el('span', null, el('i', { style: { '--cor': 'var(--amarelo)' } }), 'caminho técnico'), el('span', null, el('i', { style: { '--cor': 'var(--turquesa)' } }), 'graduação'), el('span', null, el('i', { style: { '--cor': 'color-mix(in srgb, var(--turquesa) 35%, transparent)' } }), 'depois da graduação')),
          el('ul', { class: 'prof-lista', style: { marginTop: '12px' } }, f.formacao.etapas.map(e => el('li', null, el('b', { text: e.nome + ': ' }), e.texto, citar(f, e.fontes))))));
      }
      raiz.appendChild(secao('o-que-estuda', 'O que estuda', null, ...conteudo));
    }

    // 4. Como entrar
    if (S.como_entrar) raiz.appendChild(secao('como-entrar', 'Como entrar', null,
      prosa(f, S.como_entrar.texto, S.como_entrar.fontes),
      S.como_entrar.materias_chave ? el('div', null, el('p', { class: 'prof-min', style: { marginTop: '12px' }, text: 'Matérias que mais pesam. Toque para estudar na Sala Enem e Vestibular:' }),
        el('div', { class: 'prof-chips-lista' }, S.como_entrar.materias_chave.map((m, i) => el('a', { href: '#', style: { '--i': i }, onclick: e => { e.preventDefault(); ganchos.registrar('profissao_materias_chave', { profissao: f.id, curso: m }); ganchos.abrirCurso(m); } }, icone('livro'), ganchos.nomeCurso(m))))) : null));

    // 5. Quanto ganha: o chute vem primeiro; os valores ficam cobertos até o fim do chute
    if (S.quanto_ganha) raiz.appendChild(secao('quanto-ganha', 'Quanto ganha', 'Salário-base de quem foi contratado com carteira. Adicionais não entram.',
      blocoSalario(f, S.quanto_ganha, { aoRevelar: revelarSalario, segredo: sg => segredos.push(sg), semChute: () => revelarSalario(2) })));

    // 6. Caminhos
    if (S.caminhos) raiz.appendChild(secao('caminhos', 'Outros caminhos', null, el('div', { class: 'prof-cards' }, S.caminhos.itens.map((c, i) => el('div', { class: 'prof-caixa', style: { '--i': i } }, el('h3', { text: c.titulo }), el('p', null, c.texto, citar(f, c.fontes)))))));

    // 7. DNA e carta: o gráfico se monta ao aparecer
    if (f.dna && IG()) raiz.appendChild(secao('dna', 'DNA da profissão', f.dna_calibrado ? 'Calibrado com profissionais da área.' : 'Estimativa inicial, a calibrar com profissionais da área.', blocoDna(f, ix)));

    // 8. Dilema
    if (f.dilemas && f.dilemas.length) raiz.appendChild(secao('dilema', 'O que você faria?', 'Um dilema real da profissão. Vote e veja o que a lei diz.', blocoDilema(f, f.dilemas[0])));

    // 9. Ninguém conta: cartas viradas, uma por vez
    if (S.ninguem_conta) {
      const itens = S.ninguem_conta.itens;
      const viradas = new Set();
      const cartas = itens.map((it, i) => {
        const verso = el('div', { class: 'prof-virar-verso', hidden: true }, el('p', null, it.texto, citar(f, it.fontes)));
        const frente = el('button', { type: 'button', class: 'prof-virar-frente', 'aria-expanded': 'false', onclick: () => virar(i) },
          el('span', { class: 'prof-virar-n', text: String(i + 1) }), el('span', { text: 'Toque para revelar' }), icone('olho'));
        return { caixa: el('li', { class: 'prof-virar', style: { '--i': i } }, frente, verso), frente, verso };
      });
      const todas = botao('Revelar todos', { classe: 'prof-btn--linha prof-btn--pequeno', icone: 'olho', onclick: () => itens.forEach((_, i) => virar(i)) });
      function virar(i) {
        const c = cartas[i]; if (viradas.has(i)) return;
        viradas.add(i); c.frente.hidden = true; c.verso.hidden = false; c.caixa.classList.add('prof-virar--aberta');
        if (viradas.size === itens.length) todas.hidden = true;
      }
      raiz.appendChild(secao('ninguem-conta', 'O que ninguém te conta', null,
        el('div', { class: 'prof-caixa prof-caixa--coral' }, el('h3', null, icone('olho'), 'Os pontos difíceis, sem rodeio'),
          el('ol', { class: 'prof-virar-lista' }, cartas.map(c => c.caixa)), el('div', { style: { marginTop: '12px' } }, todas))));
    }

    // 10. Buscas (assíncrono)
    const secBuscas = secao('buscas', 'Onde e quando se busca', 'Google Trends, Brasil, 2021 a 2026. Índices relativos, não volumes.', el('p', { class: 'prof-min', text: 'Carregando dados…' }));
    raiz.appendChild(secBuscas);
    trends().then(t => blocoBuscas(secBuscas, f, ix, t));

    // 11. Vizinhas
    if (S.vizinhas) raiz.appendChild(secao('vizinhas', 'Profissões vizinhas', 'Para quem está em dúvida entre duas.', el('div', { class: 'prof-cards' }, S.vizinhas.map((v, i) => {
      const p = ix.profissoes.find(x => x.id === v.id);
      // Com ficha aberta, o cartão inteiro é o link (alvo de toque grande), como nas áreas vizinhas do Panorama
      if (temFicha(p)) return el('a', { href: '#profissao-' + p.id, class: 'prof-caixa prof-vizinha', style: { '--i': i } }, el('h3', null, p.nome, icone('direita')), el('p', { text: v.diferenca }));
      return el('div', { class: 'prof-caixa', style: { '--i': i } }, el('h3', { text: p ? p.nome : v.id }), el('p', { text: v.diferenca }), p ? el('p', { class: 'prof-micro', style: { marginTop: '6px' }, text: 'Ficha em breve' }) : null);
    }))));

    // 12. Fontes: guardadas; a lista abre no botão
    raiz.appendChild(secao('fontes', 'Fontes', `Conferidas em ${dataBR(f.conferido_em)}. Toque num número ao longo da ficha para ver de onde ele vem.`,
      ...fontesGuardadas(f, f.fontes || [], `Ver as ${(f.fontes || []).length} fontes desta ficha`),
      el('div', { class: 'prof-revisao' },
        el('span', { class: f.revisao && f.revisao.fontes === 'conferidas' ? 'ok' : 'pendente' }, icone(f.revisao && f.revisao.fontes === 'conferidas' ? 'certo' : 'relogio'), 'Fontes: ' + (f.revisao ? f.revisao.fontes : 'pendente')),
        el('span', { class: f.revisao && f.revisao.ia === 'ok' ? 'ok' : 'pendente' }, icone(f.revisao && f.revisao.ia === 'ok' ? 'certo' : 'relogio'), 'Validação por IA (Mergulho Triplo): ' + (f.revisao ? f.revisao.ia : 'pendente')),
        el('span', { class: f.revisao && f.revisao.profissional === 'ok' ? 'ok' : 'pendente' }, icone(f.revisao && f.revisao.profissional === 'ok' ? 'certo' : 'relogio'), f.revisao && f.revisao.profissional === 'ok' ? `Revisada por ${f.revisao.revisor} em ${dataBR(f.revisao.data)}` : 'Revisão por profissional da área: pendente')),
      el('p', { class: 'prof-fonte-nota' }, 'Achou um erro? Conte para a equipe do Diver: a correção entra na fila de revisão. ', link('Como fazemos as fichas', 'profissoes-metodo'))));

    // Doca com as ações no rodapé: aparece depois da abertura
    const btnMira = botao(estado.mira.includes(f.id) ? 'Na mira' : 'Pôr na mira', { classe: 'prof-btn--linha prof-btn--mira', icone: estado.mira.includes(f.id) ? 'certo' : 'alvo', pressed: String(estado.mira.includes(f.id)), onclick: () => alternarMira(f, btnMira) });
    const doca = el('div', { class: 'prof-doca', role: 'region', 'aria-label': 'Ações da ficha' }, btnMira,
      f.dia ? link('Viver um dia', 'profissao-' + f.id + '-dia', { classe: 'prof-btn prof-btn--primario', icone: 'play' }) : null,
      f.mitos && f.mitos.length ? link('Mito ou verdade', 'profissao-' + f.id + '-mitos', { classe: 'prof-btn prof-btn--linha', icone: 'dado' }) : null);

    aplicarSalario(false);
    fecharHistoria(raizSecoes, historia, doca);
    raiz = raizSecoes;
  }

  /* ---------- A história que se conta ao rolar: peças da ficha, usadas também pelos panoramas (js/profissoes-tecnologia.js) ---------- */
  /** Abertura em tela cheia (o título entra palavra por palavra e um convite chama para rolar) e o guia fixo vazio.
      o = { rotulo, cor, titulo, frase, rotuloNav }. Devolve { palco, barra, nav, corpo }: as seções vão no corpo. */
  function abrirHistoria(raiz, o) {
    const descer = el('button', { type: 'button', class: 'prof-mergulhe', onclick: () => { const alvo = raiz.querySelector('.prof-surge'); if (alvo) alvo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' }); } }, 'Role para mergulhar', icone('baixo'));
    const palco = el('header', { class: 'prof-palco' },
      el('span', { class: 'prof-rotulo', text: o.rotulo, style: { color: o.cor } }),
      el('h1', { class: 'prof-palco-titulo', 'aria-label': o.titulo }, palavras(o.titulo)),
      o.frase ? el('p', { class: 'prof-lead prof-palco-frase' }, palavras(o.frase)) : null,
      descer);
    raiz.appendChild(palco);
    const barra = el('i');
    const nav = el('nav', { class: 'prof-nav', 'aria-label': o.rotuloNav || 'Seções' });
    raiz.appendChild(el('div', { class: 'prof-guia' }, el('div', { class: 'prof-guia-barra', 'aria-hidden': 'true' }, barra), nav));
    const corpo = el('div', { class: 'prof-corpo' });
    raiz.appendChild(corpo);
    return { palco, barra, nav, corpo };
  }
  /** Fecha a história: um chip por seção no guia, o "Próximo" no pé de cada uma, a seção atual acesa,
      a doca (opcional) depois da abertura, a barra de progresso e as cenas que acendem. */
  function fecharHistoria(raiz, h, doca) {
    const { palco, barra, nav, corpo } = h;
    const secoes = [...corpo.querySelectorAll('.prof-secao')];
    const chips = secoes.map(sec => {
      const titulo = sec.querySelector('h2').firstChild.textContent;
      const a = el('a', { href: '#' + sec.id.replace(/^sec-/, ''), text: titulo, onclick: e => { e.preventDefault(); sec.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' }); } });
      nav.appendChild(a);
      return a;
    });
    secoes.forEach((sec, i) => {
      const prox = secoes[i + 1]; if (!prox) return;
      sec.appendChild(el('button', { type: 'button', class: 'prof-proximo', onclick: () => prox.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' }) },
        el('span', { class: 'prof-micro', text: 'Próximo' }), el('b', { text: prox.querySelector('h2').firstChild.textContent }), icone('baixo')));
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        const i = secoes.indexOf(e.target);
        chips.forEach((c, k) => { if (k === i) { c.setAttribute('aria-current', 'true'); c.scrollIntoView({ block: 'nearest', inline: 'center' }); } else c.removeAttribute('aria-current'); });
      }), { rootMargin: '-40% 0px -55% 0px' });
      secoes.forEach(s => io.observe(s));
      limpezas.push(() => io.disconnect());
    }
    if (doca) raiz.appendChild(doca);

    // Progresso da leitura e a doca (um só ouvinte de rolagem, em qualquer contêiner)
    let pendente = false;
    const medir = () => {
      pendente = false;
      if (!raiz.isConnected) return;
      const r = corpo.getBoundingClientRect(), alto = Math.max(1, r.height - innerHeight * 0.6);
      barra.style.transform = `scaleX(${Math.min(1, Math.max(0, -r.top / alto))})`;
      if (doca) doca.classList.toggle('prof-doca--visivel', palco.getBoundingClientRect().bottom < innerHeight * 0.55);
    };
    const aoRolar = () => { if (!pendente) { pendente = true; requestAnimationFrame(medir); } };
    document.addEventListener('scroll', aoRolar, { passive: true, capture: true });
    addEventListener('resize', aoRolar, { passive: true });
    limpezas.push(() => { document.removeEventListener('scroll', aoRolar, { capture: true }); removeEventListener('resize', aoRolar); });

    observarCenas(corpo);
    requestAnimationFrame(medir);
  }
  /** Fontes guardadas: o botão abre e fecha a lista (numerada como em f.fontes). Devolve [botão, lista]. */
  function fontesGuardadas(f, lista, rotulo) {
    const ol = el('ol', { class: 'prof-fontes', id: 'prof-lista-fontes', hidden: true }, lista.map((fo, i) => el('li', { id: 'fonte-' + fo.id, style: { '--i': i } },
      el('div', null, el('b', { text: `${numeroFonte(f, fo.id)}. ` }), fo.url ? el('a', { href: fo.url, target: '_blank', rel: 'noopener' }, fo.titulo, ' ', icone('link')) : fo.titulo),
      el('div', { class: 'prof-fontes-meta', text: metaFonte(fo) }),
      fo.nota ? el('div', { class: 'prof-fontes-nota', text: 'Pendência: ' + fo.nota }) : null)));
    const b = botao(rotulo, { classe: 'prof-btn--linha', icone: 'livro', onclick: () => {
      const aberta = ol.hidden; ol.hidden = !aberta; b.setAttribute('aria-expanded', String(aberta));
      b.lastChild.textContent = aberta ? 'Guardar as fontes' : rotulo;
      if (aberta) ol.classList.add('prof-fontes--abrindo');
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

  /* ---------- Bloco: Quanto ganha (chute + faixa + tabela) ---------- */
  /* opcoes: aoRevelar(nivel) avisa a ficha (1 = média do topo, 2 = tudo); segredo(fn) registra a tampa da tabela;
     semChute() revela tudo sem jogar. */
  function blocoSalario(f, q, opcoes) {
    const op = opcoes || {};
    const avisar = n => { if (op.aoRevelar) op.aoRevelar(n); };
    const raiz = el('div');
    const medias = q.medias || [];
    const pisos = q.pisos || [];
    const ch = q.chute;
    if (ch && medias.length && IG()) {
      let rodada = 0;
      const caixa = el('div', { class: 'prof-chute' });
      const pergunta = el('p', { class: 'prof-chute-pergunta', text: ch.pergunta });
      const faixa = el('input', { type: 'range', id: 'prof-chute-' + f.id, min: ch.min, max: ch.max, step: ch.passo, value: ch.inicial, 'aria-label': 'Seu chute de salário mensal' });
      const valor = el('span', { class: 'prof-chute-valor prof-num', text: brl(ch.inicial) });
      faixa.addEventListener('input', () => valor.textContent = brl(faixa.value));
      const resultado = el('div', { class: 'prof-chute-resultado' });
      const btn = botao('Confirmar chute', { classe: 'prof-btn--primario', onclick: revelar });
      caixa.append(pergunta, faixa, el('div', { class: 'prof-chute-linha' }, valor, btn), resultado);
      raiz.appendChild(caixa);

      function revelar() {
        const m = medias[rodada]; const piso = pisos[rodada];
        const chute = +faixa.value; const dif = Math.round((chute - m.valor) / m.valor * 100);
        estado.chutes[f.id + ':' + rodada] = chute; salvarEstado(); ganchos.registrar('profissao_chute_salario', { profissao: f.id, cargo: m.cargo, chute, media: m.valor });
        resultado.textContent = '';
        resultado.appendChild(IG().faixaSalarial({ min: ch.min, max: ch.max, faixa: m.faixa, media: m.valor, piso: piso ? piso.valor : null, chute }));
        resultado.appendChild(el('p', { class: 'prof-veredito' }, 'Você chutou ', el('b', { text: `${Math.abs(dif)}% ${dif >= 0 ? 'acima' : 'abaixo'}` }), ` da média de contratação de ${m.cargo.toLowerCase()}, que é ${brl(m.valor)}`, citar(f, m.fontes), m.faixa ? `. A faixa turquesa é onde fica a maior parte dos contratos: ${brl(m.faixa.de)} a ${brl(m.faixa.ate)}.` : '.'));
        if (piso) resultado.appendChild(el('p', { class: 'prof-min', style: { marginTop: '8px' } }, `Piso por lei para ${piso.cargo.toLowerCase()}: ${brl(piso.valor)}`, citar(f, piso.fontes), '. A regra de aplicação do piso está logo abaixo, na tabela.'));
        faixa.disabled = true; btn.disabled = true;
        avisar(rodada === 0 && medias[1] && ch.segunda ? 1 : 2);
        if (rodada === 0 && medias[1] && ch.segunda) {
          resultado.appendChild(el('div', { style: { marginTop: '12px' } }, botao(ch.segunda.pergunta, { classe: 'prof-btn--linha', iconeDepois: 'direita', onclick: () => { rodada = 1; pergunta.textContent = ch.segunda.pergunta; faixa.disabled = false; btn.disabled = false; faixa.value = ch.segunda.inicial; valor.textContent = brl(ch.segunda.inicial); resultado.textContent = ''; } })));
        }
      }
    }
    if (q.texto) raiz.appendChild(prosa(f, q.texto, q.fontes, 'prof-prosa' + (ch ? ' prof-espaco' : '')));
    if (pisos.length || medias.length) {
      // Uma linha por cargo (dos pisos e das médias). Sem piso por lei, a coluna do piso dá lugar à faixa comum.
      const rotuloPiso = q.piso_rotulo || 'Piso por lei (44 h)';
      const cargos = [...new Set([...pisos.map(p => p.cargo), ...medias.map(m => m.cargo)])];
      const colunas = pisos.length ? ['Cargo', rotuloPiso, 'Média de contratação', 'Período'] : ['Cargo', 'Média de contratação', 'Faixa comum', 'Período'];
      const tabela = el('table', { class: 'prof-tabela' },
        el('thead', null, el('tr', null, colunas.map(c => el('th', { text: c })))),
        el('tbody', null, cargos.map(cargo => {
          const p = pisos.find(x => x.cargo === cargo), m = medias.find(x => x.cargo === cargo);
          const celMedia = el('td', { class: 'prof-num', 'data-rotulo': 'Média de contratação' }, m ? [brl(m.valor), citar(f, m.fontes)] : '—');
          const celPeriodo = el('td', { class: 'prof-min', 'data-rotulo': 'Período', text: m ? m.periodo : '' });
          if (pisos.length) return el('tr', null, el('td', { text: cargo }), el('td', { class: 'prof-num', 'data-rotulo': rotuloPiso }, p ? [brl(p.valor), citar(f, p.fontes)] : '—'), celMedia, celPeriodo);
          return el('tr', null, el('td', { text: cargo }), celMedia, el('td', { class: 'prof-num', 'data-rotulo': 'Faixa comum', text: m && m.faixa ? `${brl(m.faixa.de)} a ${brl(m.faixa.ate)}` : '—' }), celPeriodo);
        })));
      const valores = el('div', { class: 'prof-segredo-conteudo' }, el('div', { class: 'prof-rolagem' }, tabela),
        q.piso_regra ? el('p', { class: 'prof-fonte-nota' }, q.piso_regra, citar(f, q.piso_regra_fontes)) : null);
      const tampa = el('div', { class: 'prof-segredo-tampa' }, icone('cadeado'),
        el('p', { text: ch ? 'Os valores aparecem depois do seu chute.' : 'Toque para ver os valores.' }),
        botao('Prefiro só ver os números', { classe: 'prof-btn--linha prof-btn--pequeno', onclick: () => (op.semChute ? op.semChute() : abrir(true, true)) }));
      const caixaSegredo = el('div', { class: 'prof-segredo' }, valores, tampa);
      function abrir(aberto, animar) {
        caixaSegredo.classList.toggle('prof-segredo--aberto', aberto);
        if (aberto) { valores.removeAttribute('inert'); valores.removeAttribute('aria-hidden'); tampa.hidden = true; if (animar) caixaSegredo.classList.add('prof-revelado'); }
        else { valores.setAttribute('inert', ''); valores.setAttribute('aria-hidden', 'true'); tampa.hidden = false; }
      }
      abrir(false, false);
      if (op.segredo) op.segredo(abrir); else abrir(true, false);
      raiz.appendChild(caixaSegredo);
    }
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

  /* ---------- Bloco: Onde e quando se busca ---------- */
  function blocoBuscas(sec, f, ix, t) {
    const corpo = sec.querySelector('p'); if (corpo) corpo.remove();
    if (!t || !f.trends_id || !t.sazonalidade[f.trends_id]) { sec.appendChild(el('p', { class: 'prof-min', text: 'Sem dados de busca para esta profissão ainda.' })); return; }
    const outros = Object.keys(t.nomes).filter(id => id !== f.trends_id);
    let comparar = outros.includes('ciencias-contabeis') ? 'ciencias-contabeis' : outros[0];
    const sel = el('select', { class: 'prof-selecao', 'aria-label': 'Comparar com outra profissão', onchange: e => { comparar = e.target.value; desenharEstados(); } }, outros.map(id => el('option', { value: id, text: t.nomes[id], selected: id === comparar })));
    const estadosWrap = el('div');
    const leitura = el('p', { class: 'prof-min', style: { marginTop: '8px' } });
    const caixaEstados = el('div', { class: 'prof-caixa' }, el('div', { class: 'prof-grafico-cab' }, el('h3', { text: 'Onde o curso pesa mais nas buscas' }), el('label', { class: 'prof-min' }, 'Comparar com ', sel)), estadosWrap, leitura);
    const saz = t.sazonalidade[f.trends_id];
    const maxMes = saz.indexOf(Math.max(...saz)), minMes = saz.indexOf(Math.min(...saz));
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const caixaSaz = el('div', { class: 'prof-caixa' }, el('div', { class: 'prof-grafico-cab' }, el('h3', { text: 'Quando o Brasil pesquisa ' + f.nome }), el('span', { class: 'prof-min', text: 'média do ano = 100' })), IG().sazonalidade({ valores: saz }),
      el('p', { class: 'prof-min', style: { marginTop: '8px' }, text: `O pico é em ${meses[maxMes]} (${saz[maxMes]}) e o vale em ${meses[minMes]} (${saz[minMes]}). Em cursos de saúde, os picos acompanham o começo dos semestres; em Medicina e Engenharia, o Sisu de janeiro.` }));
    sec.append(el('div', { class: 'prof-duas' }, caixaEstados, caixaSaz), el('p', { class: 'prof-fonte-nota', text: t.fonte + '. ' + t.nota }));
    function desenharEstados() {
      estadosWrap.textContent = '';
      const a = f.trends_id, b = comparar;
      const itens = t.estados.map(e => ({ uf: e.uf, nome: e.nome, regiao: e.regiao, a: e.valores[a] || 0, b: e.valores[b] || 0 }));
      const topA = [...itens].sort((x, y) => y.a - x.a).slice(0, 6), botA = [...itens].sort((x, y) => x.a - y.a).slice(0, 2);
      const lista = [...topA, ...botA];
      const maxV = Math.max(...itens.map(i => Math.max(i.a, i.b)));
      estadosWrap.appendChild(IG().barras({ itens: lista.map(i => ({ rotulo: `${i.nome} (${i.uf})`, valor: i.a, sub: i.regiao, destaque: false })), max: maxV, sufixo: '%', larguraRotulo: 190, rotulo: `Parcela das buscas por estado: ${f.nome}` }));
      estadosWrap.appendChild(el('p', { class: 'prof-min', style: { margin: '6px 0' }, text: `${t.nomes[b]}, nos mesmos estados:` }));
      estadosWrap.appendChild(IG().barras({ itens: lista.map(i => ({ rotulo: `${i.nome} (${i.uf})`, valor: i.b, sub: i.regiao, destaque: true })), max: maxV, sufixo: '%', larguraRotulo: 190, rotulo: `Parcela das buscas por estado: ${t.nomes[b]}` }));
      const regA = regiaoDominante(itens, 'a'), regB = regiaoDominante(itens, 'b');
      leitura.textContent = `${f.nome} pesa mais ${regA}; ${t.nomes[b]} pesa mais ${regB}. Seis estados onde ${f.nome} mais pesa e os dois onde menos pesa.`;
    }
    function regiaoDominante(itens, k) {
      const soma = {}; const n = {};
      itens.forEach(i => { soma[i.regiao] = (soma[i.regiao] || 0) + i[k]; n[i.regiao] = (n[i.regiao] || 0) + 1; });
      const ordem = Object.keys(soma).sort((x, y) => soma[y] / n[y] - soma[x] / n[x]);
      const art = r => r === 'Norte' || r === 'Nordeste' || r === 'Centro-Oeste' || r === 'Sul' || r === 'Sudeste' ? 'no ' + r : 'em ' + r;
      return `${art(ordem[0])} e ${art(ordem[1])}`;
    }
    desenharEstados();
  }

  /* =========================================================
     Tela: Um dia como…
     ========================================================= */
  function telaDia(raiz, f, ix) {
    const d = f.dia;
    let i = 0; const ind = {}; d.indicadores.forEach(x => ind[x.id] = x.inicial);
    ganchos.registrar('profissao_dia_inicio', { profissao: f.id });
    raiz.appendChild(el('div', { class: 'prof-topo' }, link('Ficha de ' + f.nome, 'profissao-' + f.id, { classe: 'prof-voltar', icone: 'esquerda' }), el('span', { class: 'prof-min', text: d.subtitulo })));
    raiz.appendChild(el('h1', { text: d.titulo, style: { fontSize: 'var(--t-3xl)', fontWeight: 800, marginBottom: '6px' } }));
    raiz.appendChild(el('p', { class: 'prof-min', text: d.aviso, style: { marginBottom: '16px', maxWidth: '65ch' } }));
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
    raiz.appendChild(el('div', { class: 'prof-topo' }, link('Ficha de ' + f.nome, 'profissao-' + f.id, { classe: 'prof-voltar', icone: 'esquerda' })));
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
    raiz.appendChild(el('div', { class: 'prof-topo' }, link('Mapa das Profissões', 'profissoes', { classe: 'prof-voltar', icone: 'esquerda' })));
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
  function telaMetodo(raiz, ix) {
    raiz.appendChild(el('div', { class: 'prof-topo' }, link('Mapa das Profissões', 'profissoes', { classe: 'prof-voltar', icone: 'esquerda' })));
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
  function desmontar() { fecharFonte(); while (limpezas.length) { try { limpezas.pop()(); } catch (e) { /* ignora */ } } }
  window.Profissoes = {
    montar, desmontar, iniciar, ganchos, estado: () => estado, indice, ficha, BASE,
    registrarExtensao: ext => extensoes.push(ext),
    /* Peças para as extensões (js/profissoes-tecnologia.js): as mesmas da ficha, para o desenho ficar igual */
    _util: { el, icone, aviso, botao, link, citar, prosa, brl, dataBR, normalizar, nomeArea, corArea, salvarEstado, lerJson, limpezas, IG, EIXOS,
      temFicha, temPanorama, pedir, semMovimento, palavras, contar, abrirHistoria, fecharHistoria, fontesGuardadas, abrirFonte, numeroFonte }
  };
})();

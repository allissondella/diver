/* Mapa das Profissões · "Quão fundo é cada carreira" (2026-10-17, inspirado no Size of Life que o usuário mandou)
   Um mergulho de cima para baixo: quanto mais fundo, mais anos de estudo até poder trabalhar. Cada parada junta as
   profissões com a mesma duração mínima do curso principal; os caminhos curtos (técnico e tecnólogo) ficam no raso e,
   no fim, a Medicina com a residência, tracejada (é o caminho para ser especialista). O mar escurece com a
   profundidade e o profundímetro marca os anos. Dados: numeros.json (gerado das fichas, com as fontes de cada etapa)
   e o "Você sabia?" das cartas do índice. Rota: #profissoes-fundo. Sem evento novo no log (a lista do banco não muda). */
(function () {
  'use strict';
  const P = window.Profissoes; if (!P || !P._util) return;
  const { el, icone, link, temFicha, corArea, numerosProf, topoPagina, semMovimento, limpezas, abrirFontes, nomeArea } = P._util;

  const anosTexto = (de, ate) => {
    const n = v => String(v).replace('.', ',');
    return de === ate ? `${n(de)} ${de === 1 ? 'ano' : 'anos'}` : `${n(de)} a ${n(ate)} anos`;
  };

  /** As paradas, do raso ao fundo: caminhos curtos, uma por duração da graduação e o abismo da residência. */
  function paradas(ix, d) {
    const abertas = ix.profissoes.filter(temFicha).map(p => ({ p, n: d.profissoes[p.id] })).filter(x => x.n && x.n.formacao);
    const etapa = (x, tipo) => x.n.formacao.find(e => e.tipo === tipo);
    const lista = [];
    // raso: o técnico e o tecnólogo (de 1,5 a 3 anos), como caminho mais curto ou como o curso principal
    const curtos = [];
    abertas.forEach(x => {
      const pr = etapa(x, 'principal');
      if (pr && pr.anos_ate <= 3) curtos.push({ ...x, etapa: pr });
      const alt = x.n.formacao.find(e => e.tipo === 'alternativa' && pr && e.anos_ate < pr.anos_de);
      if (alt) curtos.push({ ...x, etapa: alt, curto: true });
    });
    if (curtos.length) lista.push({ anos: 2, rotulo: '1,5 a 3 anos', titulo: 'O raso: técnico e tecnólogo', texto: 'Cursos mais curtos, de nível técnico ou tecnólogo. Em algumas profissões são outro caminho; em outras, o principal.', itens: curtos });
    // uma parada por duração da graduação (de 4 anos para cima)
    const porAnos = {};
    abertas.forEach(x => { const pr = etapa(x, 'principal'); if (pr && pr.anos_de >= 4) (porAnos[pr.anos_de] = porAnos[pr.anos_de] || []).push({ ...x, etapa: pr }); });
    Object.keys(porAnos).map(Number).sort((a, b) => a - b).forEach(a => {
      const itens = porAnos[a];
      lista.push({ anos: a, rotulo: anosTexto(a, a), titulo: itens.length === 1 ? itens[0].p.nome : `${itens.length} profissões`,
        texto: itens.length === 1 ? 'A graduação mais longa do mapa.' : `Graduações de ${a} anos.`, itens });
    });
    // o abismo: a residência médica depois da graduação (tracejada: é para quem quer ser especialista)
    const fundo = abertas.map(x => ({ x, pr: etapa(x, 'principal'), dep: x.n.formacao.find(e => e.tipo === 'depois' && /^Residência médica/i.test(e.nome)) })).filter(y => y.pr && y.dep);
    fundo.forEach(({ x, pr, dep }) => lista.push({ anos: pr.anos_de + dep.anos_de, ate: pr.anos_de + dep.anos_ate, abismo: true,
      rotulo: anosTexto(pr.anos_de + dep.anos_de, pr.anos_de + dep.anos_ate), titulo: `O abismo: ${x.p.nome} com residência`,
      texto: `${pr.anos_de} anos de graduação e mais ${anosTexto(dep.anos_de, dep.anos_ate)} de ${dep.nome.toLowerCase()} para ser especialista.`, itens: [{ ...x, etapa: dep, depois: pr }] }));
    return lista;
  }

  function telaFundo(raiz, ix) {
    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' }));
    raiz.appendChild(el('header', { class: 'prof-fundo-cab' },
      el('span', { class: 'prof-rotulo', text: 'Mergulho' }),
      el('h1', { text: 'Quão fundo é cada carreira' }),
      el('p', { class: 'prof-lead', text: 'Quanto mais fundo, mais anos de estudo até poder trabalhar. Role para descer: cada parada mostra quem mora naquela profundidade.' }),
      el('p', { class: 'prof-micro', text: 'A profundidade é a duração mínima do curso principal, pelas normas nacionais citadas em cada ficha. A residência médica aparece no fim, tracejada.' })));
    const mar = el('div', { class: 'prof-fundo-mar' }, el('p', { class: 'prof-carregando prof-min', text: 'Enchendo o mar…' }));
    raiz.appendChild(mar);
    numerosProf().then(d => { if (d && d.profissoes && mar.isConnected) montarMar(mar, ix, d); });
  }

  function montarMar(mar, ix, d) {
    const lista = paradas(ix, d);
    mar.textContent = '';
    if (!lista.length) { mar.appendChild(el('div', { class: 'prof-vazio' }, el('p', { text: 'As fichas estão em revisão por profissionais. O mergulho abre quando elas forem publicadas.' }))); return; }
    const fontesF = { fontes: Object.values(d.fontes_formacao || {}) };
    const maxAnos = Math.ceil(Math.max(...lista.map(x => x.ate || x.anos)));
    // o profundímetro: a escala de anos ao lado e o ponteiro que desce junto
    const ponteiro = el('span', { class: 'prof-prof-ponteiro' }, el('b', { class: 'prof-num', text: '0 anos' }));
    const medidor = el('aside', { class: 'prof-profundimetro', 'aria-hidden': 'true' },
      el('span', { class: 'prof-prof-trilho' }, Array.from({ length: maxAnos + 1 }, (_, i) => el('i', { style: { top: (i / maxAnos * 100) + '%' } }, i % 2 ? null : el('span', { text: String(i) })))),
      ponteiro);
    const superficie = el('section', { class: 'prof-parada prof-parada--superficie', dataset: { anos: '0' } },
      el('p', { class: 'prof-parada-marca prof-num', text: '0 anos' }),
      el('h2', { text: 'A superfície' }),
      el('p', { class: 'prof-prosa', text: 'Aqui começa: com o Ensino Médio completo, a porta de entrada é o vestibular ou a nota do Enem.' }));
    const secoes = [superficie];
    let anterior = 0;
    lista.forEach((st, k) => {
      const dy = Math.max(0.6, st.anos - anterior); anterior = st.ate || st.anos;
      secoes.push(parada(st, k, dy, ix, fontesF));
    });
    // o fosso: o espaço até o fim mede os anos da residência, com a linha tracejada e o nome dela
    const ultima = lista[lista.length - 1], fosso = ultima.abismo ? ultima.ate - ultima.anos : 0;
    const fim = el('section', { class: 'prof-parada prof-parada--fim' + (fosso ? ' prof-parada--fosso' : ''), dataset: { anos: String(maxAnos) }, style: { '--dy': String(fosso || 1) } },
      fosso ? el('span', { class: 'prof-fosso-rot', 'aria-hidden': 'true', text: `+${fosso} anos de profundidade possível na residência` }) : null,
      el('h2', { text: 'Chegou ao fundo' }),
      el('p', { class: 'prof-prosa', text: 'Mais fundo não quer dizer melhor: cada profundidade tem a sua vida. Quer ver duas profissões lado a lado?' }),
      el('div', { class: 'prof-cab-acoes' },
        link('Comparar duas', 'profissoes-comparar', { classe: 'prof-btn prof-btn--primario', icone: 'balanca' }),
        el('button', { type: 'button', class: 'prof-btn prof-btn--linha', onclick: () => irPara(superficie) }, icone('esquerda'), 'Voltar à superfície')));
    secoes.push(fim);
    // "Mergulhar mais fundo" no pé de cada parada (menos a última)
    secoes.slice(0, -1).forEach((s, i) => s.appendChild(el('button', { type: 'button', class: 'prof-btn prof-btn--linha prof-btn--pequeno prof-parada-desce', onclick: () => irPara(secoes[i + 1]) }, 'Mergulhar mais fundo', icone('baixo'))));
    mar.append(medidor, el('div', { class: 'prof-paradas' }, secoes));

    function irPara(sec) {
      sec.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' });
      const alvo = sec.querySelector('h2'); if (alvo) { alvo.setAttribute('tabindex', '-1'); alvo.focus({ preventScroll: true }); }
    }
    // o ponteiro: entre duas paradas, os anos andam junto com a rolagem
    let quadro = 0;
    function medir() {
      quadro = 0;
      const meio = innerHeight * 0.45;
      const tops = secoes.map(s => ({ y: s.getBoundingClientRect().top, anos: Number(s.dataset.anos) }));
      let anos = 0;
      for (let i = 0; i < tops.length; i++) {
        if (tops[i].y <= meio) { const prox = tops[i + 1]; anos = tops[i].anos; if (prox && prox.y > meio) anos += (prox.anos - tops[i].anos) * (meio - tops[i].y) / (prox.y - tops[i].y); }
      }
      anos = Math.max(0, Math.min(maxAnos, anos));
      ponteiro.style.top = (anos / maxAnos * 100) + '%';
      const arred = Math.round(anos * 2) / 2;
      ponteiro.firstChild.textContent = `${String(arred).replace('.', ',')} ${arred === 1 ? 'ano' : 'anos'}`;
    }
    const rolou = () => { if (!quadro) quadro = requestAnimationFrame(medir); };
    addEventListener('scroll', rolou, { passive: true }); addEventListener('resize', rolou, { passive: true });
    limpezas.push(() => { removeEventListener('scroll', rolou); removeEventListener('resize', rolou); if (quadro) cancelAnimationFrame(quadro); });
    medir();
  }

  /** Uma parada: a profundidade, quem mora ali (com os botões das profissões quando são várias) e o detalhe da escolhida. */
  function parada(st, k, dy, ix, fontesF) {
    const detalhe = el('div', { class: 'prof-parada-detalhe', 'aria-live': 'polite' });
    const mostrar = (x, botoes, i) => {
      if (botoes) botoes.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      detalhe.textContent = '';
      detalhe.style.setProperty('--cor-area', corArea(ix, x.p.area));
      const e = x.etapa, fontesEtapa = (e.fontes || []).concat(x.depois ? x.depois.fontes || [] : []);
      const carta = x.p.carta && !/R\$/.test(x.p.carta.fato) ? x.p.carta : null; // salário só depois do palpite, na ficha
      const fonteCarta = carta && (ix.fontes_cartas || {})[carta.fonte];
      const botaoFonte = (ids, texto, titulo) => el('button', { type: 'button', class: 'prof-fonte-canto', 'aria-label': titulo + ': ' + (texto || ''),
        onclick: ev => { ev.stopPropagation(); abrirFontes(ids.length ? fontesF : {}, ids, ev.currentTarget, { titulo, texto }); } }, icone('livro'), 'Fonte');
      detalhe.append(
        el('span', { class: 'prof-rotulo prof-rotulo--area', text: nomeArea(ix, x.p.area) }),
        el('h3', { text: x.p.nome }),
        el('p', { class: 'prof-parada-etapa' }, el('b', { text: e.nome + ': ' }), anosTexto(e.anos_de, e.anos_ate), x.curto ? ' (um caminho mais curto)' : '', '. ', e.texto || ''),
        fontesEtapa.length ? el('div', { class: 'prof-fonte' }, botaoFonte(fontesEtapa, `${e.nome}: ${anosTexto(e.anos_de, e.anos_ate)}`, 'Fonte da duração')) : null,
        carta ? el('div', { class: 'prof-parada-sabia' }, el('p', null, el('b', { text: 'Você sabia? ' }), carta.fato),
          fonteCarta ? el('div', { class: 'prof-fonte' }, botaoFonte([], fonteCarta, 'Fonte do "Você sabia?"')) : null) : null,
        link('Abrir a ficha', 'profissao-' + x.p.id, { classe: 'prof-btn prof-btn--linha prof-btn--pequeno', iconeDepois: 'direita' }));
    };
    const sec = el('section', { class: 'prof-parada' + (st.abismo ? ' prof-parada--abismo' : ''), id: 'parada-' + k, dataset: { anos: String(st.anos) }, style: { '--dy': String(dy) }, 'aria-labelledby': 'parada-tit-' + k },
      el('p', { class: 'prof-parada-marca prof-num', text: st.rotulo }),
      el('h2', { id: 'parada-tit-' + k, text: st.titulo }),
      el('p', { class: 'prof-prosa', text: st.texto }));
    if (st.itens.length > 1) {
      const botoes = st.itens.map((x, i) => el('button', { type: 'button', class: 'prof-chip prof-parada-chip', 'aria-pressed': 'false', style: { '--cor-area': corArea(ix, x.p.area) },
        onclick: () => mostrar(x, botoes, i) }, el('i', { class: 'prof-chip-cor', 'aria-hidden': 'true' }), x.p.nome, x.curto ? el('span', { class: 'prof-micro', text: ' · ' + x.etapa.nome }) : null));
      sec.appendChild(el('div', { class: 'prof-chips prof-parada-chips', role: 'group', 'aria-label': 'Profissões nesta profundidade' }, botoes));
      mostrar(st.itens[0], botoes, 0);
    } else mostrar(st.itens[0], null, 0);
    sec.appendChild(detalhe);
    return sec;
  }

  P.registrarExtensao({ aceita: r => r === 'profissoes-fundo', montar: (raiz, r, ix) => telaFundo(raiz, ix) });
})();

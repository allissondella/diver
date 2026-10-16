/* Mapa das Profissões · Panorama da Tecnologia (js/profissoes-tecnologia.js)
   Extensão de js/profissoes.js: carrega depois dele (pacote "profissoes" em js/app.js) e se registra sozinha.
   Rotas: #profissoes-tecnologia (panorama) · #tecnologia-<área> (uma das dez áreas) · #profissoes-tecnologia-jogo (jogo de afinidade).
   Mesmo desenho da ficha (2026-10-16): abertura em tela cheia, partes que acendem ao rolar, guia com progresso,
   salário escondido até o chute e fontes guardadas, abertas no toque. Os textos vêm de data/profissoes/tecnologia.json, sem mudança.
   Enquanto o panorama for rascunho (data/profissoes/indice.json, panoramas[].status), só a equipe vê; o aluno vê "Em breve". */
(function () {
  'use strict';
  const P = window.Profissoes; if (!P || !P._util) return;
  const { el, icone, botao, link, citar, brl, dataBR, salvarEstado, lerJson, limpezas, IG, EIXOS, temFicha, temPanorama, pedir,
    semMovimento, contar, abrirHistoria, fecharHistoria, fontesGuardadas, abrirFonte, numeroFonte, corArea } = P._util;

  const ID = 'tecnologia';
  /* Onde estudar no Diver (sala Tecnologia): o app abre o curso pelo gancho abrirCurso */
  const CURSO_ENTRADA = 'explora-tech-fundamentos';
  const CURSOS_DA_AREA = { seguranca: ['ciberseguranca-essencial', 'iso-27001-foundation'] };
  const cursosDe = a => [CURSO_ENTRADA, ...(CURSOS_DA_AREA[a.id] || [])];

  let cache = null;
  async function dados() { if (!cache) cache = await lerJson(P.BASE + 'tecnologia.json'); return cache; }
  /* Estado do aluno, dentro do estado do Mapa (diver:v1:profissoes → vai para a nuvem):
     areasVistas { id: vezes } · jogo { pontos, data } · jogoConcluido · salario { panorama: {aposta}, <área>: true } */
  const est = () => {
    const e = P.estado();
    e.tec = e.tec || {};
    e.tec.areasVistas = e.tec.areasVistas || {};
    e.tec.salario = e.tec.salario || {};
    if (!('jogo' in e.tec)) e.tec.jogo = null;
    return e.tec;
  };
  const salarioAberto = idArea => !!(est().salario.panorama || (idArea && est().salario[idArea]));
  const ir = (alvo, bloco) => { if (alvo) alvo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: bloco || 'start' }); };

  P.registrarExtensao({
    aceita: r => r === 'profissoes-tecnologia' || r === 'profissoes-tecnologia-jogo' || /^tecnologia-[a-z-]+$/.test(r),
    montar: async (raiz, r, ix) => {
      const pn = (ix.panoramas || []).find(x => x.id === ID);
      if (!temPanorama(pn)) return emBreve(raiz, pn);
      const t = await dados();
      if (r === 'profissoes-tecnologia') return telaPanorama(raiz, t, ix);
      if (r === 'profissoes-tecnologia-jogo') return telaJogo(raiz, t, ix);
      const a = t.areas.find(x => 'tecnologia-' + x.id === r);
      return a ? telaArea(raiz, t, a, ix) : telaPanorama(raiz, t, ix);
    }
  });

  /* ---------------- Peças ---------------- */
  const secao = (id, titulo, sub, ...conteudo) => el('section', { class: 'prof-secao prof-surge', id: 'sec-' + id }, el('h2', null, titulo, sub ? el('small', { text: sub }) : null), ...conteudo);
  const salarioPrincipal = a => a.salarios && a.salarios[0];
  const nomeCurto = a => a.nome.replace('Inteligência artificial e aprendizado de máquina', 'Inteligência artificial');
  const uniq = l => [...new Set(l)];
  function topo(texto, rota, selo) {
    return el('div', { class: 'prof-topo' }, link(texto, rota, { classe: 'prof-voltar', icone: 'esquerda' }), selo ? el('span', { class: 'prof-selo prof-selo--rascunho', text: selo }) : null);
  }
  /* "Fonte N" no pé de um número: abre a fonte no cartão */
  function botoesFonte(t, ids) {
    const l = (ids || []).filter(id => numeroFonte(t, id));
    return l.length ? el('div', { class: 'prof-numero-fontes' }, l.map(id => el('button', { type: 'button', class: 'prof-fonte-mini', onclick: e => { e.stopPropagation(); abrirFonte(t, id, e.currentTarget); } }, icone('info'), `Fonte ${numeroFonte(t, id)}`))) : null;
  }
  function linhaRevisao(t) {
    const rv = t.revisao || {};
    const item = (ok, texto) => el('span', { class: ok ? 'ok' : 'pendente' }, icone(ok ? 'certo' : 'relogio'), texto);
    return el('div', { class: 'prof-revisao' },
      item(rv.fontes === 'conferidas', 'Fontes: ' + (rv.fontes || 'pendente')),
      item(rv.ia === 'ok', 'Validação por IA: ' + (rv.ia || 'pendente')),
      item(rv.profissional === 'ok', rv.profissional === 'ok' ? `Revisado por ${rv.revisor} em ${dataBR(rv.data)}` : 'Revisão por profissionais de cada área: pendente'));
  }
  function estudar(curso) { P.ganchos.registrar('profissao_materias_chave', { profissao: ID, curso }); P.ganchos.abrirCurso(curso); }
  const botaoEstudar = (classe) => botao('Estudar tecnologia', { classe, icone: 'livro', onclick: () => estudar(CURSO_ENTRADA) });
  /* Número que conta do zero ao aparecer: só inteiros ("111 mil", "18%"); "2,13 milhões" fica como está */
  const contavel = v => /^\d[\d.]*(?![\d,])/.test(String(v));

  function emBreve(raiz, pn) {
    raiz.appendChild(topo('Mapa das Profissões', 'profissoes'));
    raiz.appendChild(el('div', { class: 'prof-vazio' },
      el('h1', { text: 'Panorama da Tecnologia', style: { fontSize: 'var(--t-2xl)', marginBottom: '8px' } }),
      el('p', { text: 'Este panorama ainda está em revisão com profissionais de cada área. Ele abre para todos assim que a revisão terminar.' }),
      el('div', { style: { marginTop: '14px' } }, botao('Quero ver este panorama', { classe: 'prof-btn--primario', icone: 'estrela', onclick: () => pedir(pn ? pn.id : ID, 'O Panorama da Tecnologia') }))));
  }

  /* =====================================================================
     Panorama
     ===================================================================== */
  function telaPanorama(raiz, t, ix) {
    P.ganchos.registrar('tecnologia_panorama', {});
    const cor = corArea(ix, ID);
    raiz.style.setProperty('--cor-area', cor);
    raiz.appendChild(topo('Mapa das Profissões', 'profissoes', t.status !== 'publicada' ? 'Em revisão por profissionais' : null));
    const h = abrirHistoria(raiz, { rotulo: 'Tecnologia', cor, titulo: t.titulo, frase: t.frase, rotuloNav: 'Seções do panorama' });
    const corpo = h.corpo;
    const j = est().jogo;
    const rank = j ? ranking(t, j.pontos) : null;

    // Quatro números: contam do zero ao aparecer
    const contaveis = [];
    const secNumeros = el('section', { class: 'prof-numeros prof-surge', 'aria-label': 'O setor em números' }, t.numeros.map((n, i) => {
      const valor = el('span', { class: 'prof-numero-txt', text: n.valor });
      if (contavel(n.valor)) contaveis.push([valor, n.valor]);
      return el('div', { class: 'prof-numero' + (i === 0 ? ' prof-numero--amarelo' : ''), style: { '--i': i } },
        el('div', { class: 'prof-min', text: n.rotulo }),
        el('div', { class: 'prof-numero-v prof-num' + (n.valor.length > 12 ? ' prof-numero-v--texto' : '') }, valor),
        el('div', { class: 'prof-micro', text: n.detalhe }),
        botoesFonte(t, n.fontes));
    }));
    secNumeros._aoAparecer = () => contaveis.forEach(([alvo, texto]) => contar(alvo, texto));
    corpo.appendChild(secNumeros);

    // Antes de escolher: a ideia do panorama e o retrato do setor, um cartão por vez
    corpo.appendChild(secao('antes', 'Antes de escolher', null,
      el('p', { class: 'prof-prosa prof-prosa--grande', text: t.intro }),
      el('div', { class: 'prof-cards prof-cards--contexto' }, t.contexto.map((c, i) => el('div', { class: 'prof-caixa', style: { '--i': i } }, el('p', null, c.texto, citar(t, c.fontes)))))));

    // Resultado do jogo, se houver
    if (rank) corpo.appendChild(secao('suas-areas', 'Suas áreas, pelo jogo', null,
      el('div', { class: 'prof-chips' }, rank.slice(0, 3).map(x => link(`${nomeCurto(x.area)} · ${x.pct}%`, 'tecnologia-' + x.area.id, { classe: 'prof-chip' }))),
      el('div', { style: { marginTop: '10px' } }, link('Refazer o jogo', 'profissoes-tecnologia-jogo', { classe: 'prof-btn prof-btn--linha prof-btn--pequeno', icone: 'embaralhar' }))));

    // Quanto paga cada área: a aposta vem antes das barras
    // (depois da aposta, os cartões das dez áreas também mostram a média)
    const mostrarMedias = () => corpo.querySelectorAll('.prof-area b.prof-sigilo').forEach(b => { b.textContent = b.dataset.media; b.classList.remove('prof-sigilo'); });
    corpo.appendChild(secao('salarios', 'Quanto paga cada área', 'Média de contratação com carteira (salário-base) da ocupação mais próxima de cada área. Novo Caged, 12 meses.', blocoApostaSalarios(t, mostrarMedias)));

    // As dez áreas
    const vistas = t.areas.filter(a => est().areasVistas[a.id]).length;
    corpo.appendChild(secao('areas', 'As dez áreas', 'Toque em uma para ver o dia a dia, a formação, o salário e o que ninguém te conta.',
      el('div', { class: 'prof-dez', role: 'img', 'aria-label': `${vistas} de ${t.areas.length} áreas exploradas` },
        el('div', { class: 'prof-dez-barra', 'aria-hidden': 'true' }, el('i', { style: { '--fracao': vistas / t.areas.length } })),
        el('span', { class: 'prof-micro', 'aria-hidden': 'true', text: `${vistas} de ${t.areas.length} exploradas` })),
      el('div', { class: 'prof-cards prof-cards--areas' }, t.areas.map((a, i) => cartaoArea(t, a, rank, i)))));

    // Que curso fazer: a duração de cada curso cresce como uma barra
    corpo.appendChild(secao('formacao', 'Que curso fazer', t.formacao_geral.nota, blocoCursos(t)));

    // Jogo
    corpo.appendChild(secao('jogo', t.jogo.titulo, t.jogo.subtitulo,
      el('div', { class: 'prof-jogo-convite' },
        el('ul', { class: 'prof-jogo-fatos', 'aria-label': 'Como é o jogo' },
          el('li', null, el('b', { class: 'prof-num', text: String(t.jogo.cenas.length) }), 'situações'),
          el('li', null, el('b', { class: 'prof-num', text: String(Math.max(...t.jogo.cenas.map(c => c.opcoes.length))) }), 'escolhas em cada'),
          el('li', null, el('b', { class: 'prof-num', text: '3' }), 'áreas no fim')),
        rank ? el('p', { class: 'prof-min', text: 'Seu último resultado: ' + rank.slice(0, 3).map(x => `${nomeCurto(x.area)} (${x.pct}%)`).join(', ') + '.' }) : null,
        link(rank ? 'Jogar de novo' : 'Começar o jogo', 'profissoes-tecnologia-jogo', { classe: 'prof-btn prof-btn--linha', icone: rank ? 'embaralhar' : 'play' }))));

    // Comece a estudar: a ponte com a sala Tecnologia
    corpo.appendChild(secao('estudar', 'Comece a estudar', null,
      el('p', { class: 'prof-prosa', text: 'A sala Tecnologia do Diver começa pelo Explora Tech · Fundamentos: lógica, Python, como o computador e a internet funcionam, Linux e Git, com laboratórios para pôr a mão no código. Serve de base para qualquer uma das dez áreas.' }),
      el('div', { style: { marginTop: '12px' } }, botao('Abrir o Explora Tech', { classe: 'prof-btn--linha', icone: 'livro', iconeDepois: 'direita', onclick: () => estudar(CURSO_ENTRADA) }))));

    // Fontes guardadas
    corpo.appendChild(secao('fontes', 'Fontes', `Conferidas em ${dataBR(t.conferido_em)}. Toque num número ao longo da página para ver de onde ele vem.`,
      ...fontesGuardadas(t, t.fontes, `Ver as ${t.fontes.length} fontes deste panorama`), linhaRevisao(t)));

    const doca = el('div', { class: 'prof-doca', role: 'region', 'aria-label': 'Ações do panorama' },
      link(rank ? 'Refazer o jogo' : 'Descobrir a minha área', 'profissoes-tecnologia-jogo', { classe: 'prof-btn prof-btn--primario', icone: 'play' }),
      botaoEstudar('prof-btn--linha'));
    fecharHistoria(raiz, h, doca);
  }

  /* A aposta: "qual paga mais?"; as barras ficam cobertas até a escolha (ou até "Prefiro só ver os números") */
  function blocoApostaSalarios(t, aoAbrir) {
    const itens = t.areas.map(a => { const s = salarioPrincipal(a); return { area: a, valor: s.media, cargo: s.cargo.split(' (')[0], fontes: s.fontes }; }).sort((x, y) => y.valor - x.valor);
    const raiz = el('div');
    const pergunta = el('div', { class: 'prof-chute prof-caixa' },
      el('p', { class: 'prof-chute-pergunta', text: 'Antes de ver: qual destas áreas você acha que paga mais na contratação?' }),
      el('div', { class: 'prof-aposta', role: 'group', 'aria-label': 'Sua aposta' }, t.areas.map(a => el('button', { type: 'button', class: 'prof-chip', text: nomeCurto(a), onclick: () => apostar(a.id) }))));
    const resultado = el('div', { class: 'prof-chute-resultado', 'aria-live': 'polite' });
    const barras = el('ol', { class: 'prof-pagas', 'aria-label': 'Média de contratação por área, da maior para a menor' });
    const max = 16000;
    itens.forEach((it, i) => barras.appendChild(el('li', { style: { '--i': i } },
      el('a', { href: '#tecnologia-' + it.area.id, class: 'prof-paga' },
        el('span', { class: 'prof-paga-rotulo' }, el('b', { text: nomeCurto(it.area) }), el('small', { text: it.cargo })),
        el('span', { class: 'prof-paga-trilho', 'aria-hidden': 'true' }, el('i', { style: { '--fracao': Math.min(1, it.valor / max) } })),
        el('span', { class: 'prof-paga-valor prof-num', text: brl(it.valor) })))));
    const nota = el('p', { class: 'prof-fonte-nota' }, 'Uma ocupação por área, como aproximação. Quatro áreas não têm CBO próprio (IA, jogos, embarcados e produto) e usam a ocupação em que costumam ser registradas; veja a nota em cada área. Fontes: ',
      ...uniq(itens.flatMap(i => i.fontes)).map(id => citar(t, [id])));
    const valores = el('div', { class: 'prof-segredo-conteudo' }, barras, nota);
    const tampa = el('div', { class: 'prof-segredo-tampa' }, icone('cadeado'), el('p', { text: 'As barras aparecem depois da sua aposta.' }),
      botao('Prefiro só ver os números', { classe: 'prof-btn--linha prof-btn--pequeno', onclick: () => abrir(null, true) }));
    const caixa = el('div', { class: 'prof-segredo' }, valores, tampa);
    raiz.append(pergunta, resultado, caixa);

    function apostar(id) { est().salario.panorama = { aposta: id }; salvarEstado(); abrir(id, true); }
    function abrir(aposta, animar) {
      if (!est().salario.panorama) { est().salario.panorama = { aposta: null }; salvarEstado(); }
      caixa.classList.add('prof-segredo--aberto'); valores.removeAttribute('inert'); valores.removeAttribute('aria-hidden'); tampa.hidden = true;
      if (animar) caixa.classList.add('prof-revelado');
      pergunta.hidden = true;
      barras.classList.add('prof-pagas--crescer');
      if (aoAbrir) aoAbrir();
      resultado.textContent = '';
      if (aposta) {
        const pos = itens.findIndex(x => x.area.id === aposta), it = itens[pos], topo1 = itens[0];
        barras.children[pos].classList.add('prof-paga--aposta');
        barras.children[pos].querySelector('.prof-paga-rotulo').appendChild(el('span', { class: 'prof-paga-tag', text: 'sua aposta' }));
        resultado.appendChild(el('p', { class: 'prof-veredito' }, pos === 0
          ? ['Mandou bem, Diver! ', el('b', { text: nomeCurto(it.area) }), ` é a que mais paga na contratação: ${brl(it.valor)} de média.`]
          : ['Você apostou em ', el('b', { text: nomeCurto(it.area) }), `: ${pos + 1}º lugar entre as dez, com ${brl(it.valor)} de média. A que mais paga é `, el('b', { text: nomeCurto(topo1.area) }), `, com ${brl(topo1.valor)}.`]));
      }
    }
    const feita = est().salario.panorama;
    if (feita) abrir(feita.aposta, false);
    else { valores.setAttribute('inert', ''); valores.setAttribute('aria-hidden', 'true'); }
    return raiz;
  }

  function cartaoArea(t, a, rank, i) {
    const s = salarioPrincipal(a); const vista = est().areasVistas[a.id]; const afin = rank ? rank.find(r => r.area.id === a.id) : null;
    const salario = salarioAberto(a.id) ? [el('b', { text: brl(s.media) }), ' média'] : [el('b', { class: 'prof-sigilo', text: 'R$ ?', dataset: { media: brl(s.media) } }), ' média'];
    return el('a', { href: '#tecnologia-' + a.id, class: 'prof-ilha prof-area', style: { '--cor-area': 'var(--azul)', '--i': i } },
      el('div', { class: 'prof-area-cab' }, vista ? el('span', { class: 'prof-selo prof-selo--vista' }, icone('certo'), 'Explorada') : el('span', { class: 'prof-selo', text: a.apelido }),
        afin ? el('span', { class: 'prof-area-afin prof-num', text: afin.pct + '%', title: 'Sua afinidade pelo jogo' }) : null),
      el('h3', { text: a.nome }), el('p', { text: a.resumo }),
      el('div', { class: 'prof-area-rodape' }, el('span', { class: 'prof-num' }, ...salario), el('span', { class: 'prof-micro', text: a.gosta_de[0] })));
  }

  function blocoCursos(t) {
    const anos = c => Math.max(...(String(c.duracao).match(/\d+/g) || ['1']).map(Number));
    const max = Math.max(...t.formacao_geral.cursos.map(anos));
    return el('ol', { class: 'prof-cursos' }, t.formacao_geral.cursos.map((c, i) => el('li', { class: 'prof-curso', style: { '--i': i } },
      el('div', { class: 'prof-curso-cab' }, el('b', { text: c.nome }), el('span', { class: 'prof-selo', text: c.nivel })),
      el('div', { class: 'prof-curso-linha' },
        el('span', { class: 'prof-curso-trilho', 'aria-hidden': 'true' }, el('i', { style: { '--fracao': anos(c) / max } })),
        el('span', { class: 'prof-num prof-curso-duracao', text: c.duracao })),
      el('p', { class: 'prof-min' }, c.texto, ' ', el('span', { class: 'prof-num', text: `Mínimo de ${c.horas.toLocaleString('pt-BR')} horas.` }), citar(t, c.fontes)))));
  }

  /* =====================================================================
     Uma área
     ===================================================================== */
  function telaArea(raiz, t, a, ix) {
    est().areasVistas[a.id] = (est().areasVistas[a.id] || 0) + 1; salvarEstado();
    P.ganchos.registrar('tecnologia_area_vista', { area: a.id });
    const cor = corArea(ix, ID);
    raiz.style.setProperty('--cor-area', cor);
    raiz.appendChild(topo('Panorama da Tecnologia', 'profissoes-tecnologia', 'Rotina típica, em revisão com profissionais'));
    const h = abrirHistoria(raiz, { rotulo: a.apelido, cor, titulo: a.nome, frase: a.resumo, rotuloNav: 'Seções da área' });
    const corpo = h.corpo;
    const s = salarioPrincipal(a);
    const j = est().jogo; const afin = j ? ranking(t, j.pontos).find(r => r.area.id === a.id) : null;

    // Quatro números: os dois de salário ficam escondidos até o chute
    const segredos = [];
    const contaveis = [];
    const numero = (rotulo, texto, detalhe, o) => {
      const op = o || {};
      const valor = el('span', { class: 'prof-numero-txt', text: texto });
      const v = el('div', { class: 'prof-numero-v prof-num' + (op.menor ? ' prof-numero-v--texto' : '') }, valor);
      const cartao = el('div', { class: 'prof-numero' + (op.cor ? ' prof-numero--' + op.cor : ''), style: { '--i': op.i || 0 } }, el('div', { class: 'prof-min', text: rotulo }), v, el('div', { class: 'prof-micro', text: detalhe }), op.fontes ? botoesFonte(t, op.fontes) : null);
      if (op.segredo) segredos.push({ cartao, valor, v, texto, chamar: op.chamar });
      else if (contavel(texto)) contaveis.push([valor, texto]);
      return cartao;
    };
    const secNumeros = el('section', { class: 'prof-numeros prof-surge', 'aria-label': 'Números principais' },
      numero('Média de contratação', brl(s.media), `${s.cargo}, CBO ${s.cbo}`, { cor: 'amarelo', fontes: s.fontes, segredo: true, chamar: true, i: 0 }),
      numero('Faixa comum', `${brl(s.p25)} a ${brl(s.p75)}`, 'percentis 25 e 75', { segredo: true, menor: true, i: 1 }),
      numero('Lida com pessoas', a.dna.pessoas + '/100', 'no DNA da área', { i: 2 }),
      numero('Sua afinidade', afin ? afin.pct + '%' : '—', afin ? 'pelo jogo' : 'jogue para descobrir', { i: 3 }));
    secNumeros._aoAparecer = () => contaveis.forEach(([alvo, texto]) => contar(alvo, texto));
    corpo.appendChild(secNumeros);
    function aplicarSegredos(animar) {
      const aberto = salarioAberto(a.id);
      segredos.forEach(sg => {
        const tampa = sg.cartao.querySelector('.prof-numero-tampa');
        if (aberto) {
          sg.cartao.classList.remove('prof-numero--segredo'); if (tampa) tampa.remove(); sg.valor.hidden = false;
          if (animar) { sg.cartao.classList.add('prof-revelado'); if (contavel(sg.texto.replace('R$ ', ''))) contar(sg.valor, sg.texto); } else sg.valor.textContent = sg.texto;
        } else if (!tampa) {
          sg.cartao.classList.add('prof-numero--segredo'); sg.valor.hidden = true;
          sg.v.append(el('span', { class: 'prof-numero-tampa' }, el('span', { class: 'prof-numero-oculto', 'aria-hidden': 'true', text: 'R$ ?' }),
            sg.chamar ? el('button', { type: 'button', class: 'prof-btn prof-btn--linha prof-btn--pequeno', onclick: irParaChute }, icone('alvo'), 'Chutar primeiro') : el('span', { class: 'prof-micro', text: 'depois do chute' })));
        }
      });
    }
    function irParaChute() {
      const sec = document.getElementById('sec-salario'); ir(sec);
      const r = sec && sec.querySelector('input[type="range"]'); if (r) setTimeout(() => r.focus({ preventScroll: true }), semMovimento() ? 0 : 600);
    }

    // Um dia típico: os momentos entram um por um; o mais perto da hora de agora fica marcado
    const agora = new Date(); const minutos = agora.getHours() * 60 + agora.getMinutes();
    const emMin = hh => { const [x, y] = String(hh).split(':').map(Number); return x * 60 + (y || 0); };
    let atual = -1; a.dia.forEach((d, i) => { if (emMin(d.hora) <= minutos) atual = i; });
    if (atual === a.dia.length - 1 && minutos > emMin(a.dia[atual].hora) + 120) atual = -1;
    corpo.appendChild(secao('dia', 'Um dia típico', 'Rotina ilustrativa de um dia comum, a revisar com profissionais da área. Cada empresa é diferente.',
      el('ol', { class: 'prof-dia' }, a.dia.map((d, i) => el('li', { class: i === atual ? 'prof-dia--agora' : null, style: { '--i': i } },
        el('span', { class: 'prof-dia-hora prof-num', text: d.hora }),
        el('span', null, d.texto, i === atual ? el('span', { class: 'prof-dia-tag', text: 'agora' }) : null))))));

    // O que faz: chave entre "Combina com quem" e "Pense duas vezes se"
    const gosta = el('div', { class: 'prof-lado prof-caixa prof-caixa--turquesa', role: 'tabpanel' }, el('ul', { class: 'prof-lista' }, a.gosta_de.map(g => el('li', { text: g }))));
    const naoGosta = el('div', { class: 'prof-lado prof-caixa prof-caixa--coral', role: 'tabpanel', hidden: true }, el('ul', { class: 'prof-lista prof-lista--coral' }, a.nao_gosta_se.map(g => el('li', { text: g }))));
    const b1 = el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', text: 'Combina com quem', onclick: () => trocar(true) });
    const b2 = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => trocar(false) }, 'Pense duas vezes se');
    function trocar(lado) { b1.setAttribute('aria-selected', String(lado)); b2.setAttribute('aria-selected', String(!lado)); gosta.hidden = !lado; naoGosta.hidden = lado; (lado ? gosta : naoGosta).classList.add('prof-lado--entra'); }
    corpo.appendChild(secao('o-que-faz', 'O que faz', null, el('p', { class: 'prof-prosa', text: a.o_que_faz }),
      el('div', { class: 'prof-espaco' }, el('div', { class: 'prof-chave', role: 'tablist', 'aria-label': 'Combina com quem e pense duas vezes se' }, b1, b2), gosta, naoGosta)));

    // Ferramentas
    corpo.appendChild(secao('ferramentas', 'Ferramentas do dia a dia', null, el('div', { class: 'prof-chips-lista' }, a.ferramentas.map((f, i) => el('span', { text: f, style: { '--i': i } }))),
      a.ferramentas_fontes && a.ferramentas_fontes.length ? el('p', { class: 'prof-fonte-nota' }, 'Linguagens e ferramentas mais usadas segundo pesquisa global de desenvolvedores', citar(t, a.ferramentas_fontes)) : null));

    // Quanto ganha: o chute primeiro; as faixas ficam cobertas até ele
    corpo.appendChild(secao('salario', 'Quanto ganha', 'Salário-base de quem foi contratado com carteira nos últimos 12 meses. Adicionais, PJ e bônus não entram.',
      blocoChute(t, a, () => aplicarSegredos(true))));

    // DNA: o radar se monta ao aparecer
    const prof = EIXOS.map(([k]) => a.dna[k] ?? 50); const e = P.estado(); if (!e.dna) e.dna = EIXOS.map(() => 50);
    const afDna = Math.round(100 - prof.reduce((tt, p, i) => tt + Math.abs(p - e.dna[i]), 0) / prof.length);
    const fichaDna = ix.profissoes.find(p => temFicha(p) && p.arquivo);
    corpo.appendChild(secao('dna', 'DNA da área', 'Turquesa: a área. Amarelo tracejado: o seu DNA, ajustado em qualquer ficha. Estimativa inicial, a calibrar com profissionais.',
      el('div', { class: 'prof-dna' },
        el('div', null, el('div', { class: 'prof-dna-grafico' }, IG().radar({ eixos: EIXOS.map(x => x[1]), series: [{ nome: a.nome, valores: prof, classe: 'profissao' }, { nome: 'Você', valores: e.dna, classe: 'voce' }] })),
          el('div', { class: 'prof-legenda' }, el('span', null, el('i', { style: { '--cor': 'var(--turquesa)' } }), a.nome), el('span', null, el('i', { class: 'prof-legenda--tracejado', style: { '--cor': 'var(--amarelo)' } }), 'Você'))),
        el('div', null,
          el('div', { class: 'prof-afinidade ' + (afDna >= 70 ? 'prof-afinidade--alta' : afDna >= 50 ? 'prof-afinidade--media' : 'prof-afinidade--baixa') }, el('span', { class: 'prof-min', text: 'Afinidade pelo DNA' }), el('b', { class: 'prof-num', text: afDna + '%' })),
          el('p', { class: 'prof-min', text: 'O jogo mede afinidade por decisões; o DNA mede por perfil. Os dois juntos dizem mais que cada um sozinho.' }),
          fichaDna ? el('div', { style: { marginTop: '10px' } }, link('Ajustar meu DNA na ficha de ' + fichaDna.nome, 'profissao-' + fichaDna.id, { classe: 'prof-btn prof-btn--linha prof-btn--pequeno' })) : null))));

    // Formação, com os cursos do Diver que servem a esta área
    corpo.appendChild(secao('formacao', 'Formação', null, el('p', { class: 'prof-prosa' }, a.formacao, citar(t, a.formacao_fontes)),
      el('p', { class: 'prof-min', style: { marginTop: '12px' }, text: 'Para começar no Diver, na sala Tecnologia:' }),
      el('div', { class: 'prof-chips-lista' }, cursosDe(a).map((c, i) => el('a', { href: '#', style: { '--i': i }, onclick: ev => { ev.preventDefault(); estudar(c); } }, icone('livro'), c === CURSO_ENTRADA ? 'Explora Tech · Fundamentos' : P.ganchos.nomeCurso(c)))),
      el('p', { class: 'prof-min', style: { marginTop: '10px' } }, 'As durações e cargas dos cursos estão no ', link('panorama', 'profissoes-tecnologia'), '.')));

    // Carreira: uma escada que sobe degrau por degrau
    corpo.appendChild(secao('caminhos', 'Como a carreira costuma andar', 'Nomes e prazos variam por empresa.',
      el('ol', { class: 'prof-escada', style: { '--degraus': a.caminhos.length } }, a.caminhos.map((c, i) => el('li', { text: c, style: { '--i': i, '--n': a.caminhos.length } })))));

    // O que ninguém te conta: cartas para virar
    const itens = a.ninguem_conta; const viradas = new Set();
    const cartas = itens.map((it, i) => {
      const verso = el('div', { class: 'prof-virar-verso', hidden: true }, el('p', null, it.texto, citar(t, it.fontes)));
      const frente = el('button', { type: 'button', class: 'prof-virar-frente', 'aria-expanded': 'false', onclick: () => virar(i) }, el('span', { class: 'prof-virar-n', text: String(i + 1) }), el('span', { text: 'Toque para revelar' }), icone('olho'));
      return { caixa: el('li', { class: 'prof-virar', style: { '--i': i } }, frente, verso), frente, verso };
    });
    const todas = botao('Revelar todos', { classe: 'prof-btn--linha prof-btn--pequeno', icone: 'olho', onclick: () => itens.forEach((_, i) => virar(i)) });
    function virar(i) {
      const c = cartas[i]; if (viradas.has(i)) return;
      viradas.add(i); c.frente.hidden = true; c.verso.hidden = false; c.caixa.classList.add('prof-virar--aberta');
      if (viradas.size === itens.length) todas.hidden = true;
    }
    corpo.appendChild(secao('ninguem-conta', 'O que ninguém te conta', null, el('div', { class: 'prof-caixa prof-caixa--coral' }, el('h3', null, icone('olho'), 'Os pontos difíceis, sem rodeio'),
      el('ol', { class: 'prof-virar-lista' }, cartas.map(c => c.caixa)), el('div', { style: { marginTop: '12px' } }, todas))));

    // Áreas vizinhas
    corpo.appendChild(secao('vizinhas', 'Áreas vizinhas', 'Para quem está em dúvida entre duas.', el('div', { class: 'prof-cards' }, a.vizinhas.map((id, i) => {
      const v = t.areas.find(x => x.id === id);
      return v ? el('a', { href: '#tecnologia-' + v.id, class: 'prof-caixa prof-vizinha', style: { '--i': i } }, el('h3', null, v.nome, icone('direita')), el('p', { text: v.resumo })) : null;
    }))));

    // Fontes: só as citadas nesta área (a numeração é a do panorama)
    const ids = new Set(); JSON.stringify(a, (k, v) => { if ((k === 'fontes' || k.endsWith('_fontes')) && Array.isArray(v)) v.forEach(x => ids.add(x)); return v; });
    const lista = t.fontes.filter(fo => ids.has(fo.id));
    corpo.appendChild(secao('fontes', 'Fontes', `Conferidas em ${dataBR(t.conferido_em)}. Só as fontes citadas nesta área; a numeração é a do panorama.`,
      ...fontesGuardadas(t, lista, lista.length === 1 ? 'Ver a fonte desta área' : `Ver as ${lista.length} fontes desta área`), linhaRevisao(t)));

    // Anterior e próxima: as dez áreas em sequência
    const k = t.areas.indexOf(a), ant = t.areas[(k + t.areas.length - 1) % t.areas.length], prox = t.areas[(k + 1) % t.areas.length];
    corpo.appendChild(el('nav', { class: 'prof-areas-nav', 'aria-label': 'Outras áreas' },
      link(nomeCurto(ant), 'tecnologia-' + ant.id, { classe: 'prof-btn prof-btn--linha prof-btn--pequeno', icone: 'esquerda' }),
      el('span', { class: 'prof-micro prof-num', text: `Área ${k + 1} de ${t.areas.length}` }),
      link(nomeCurto(prox), 'tecnologia-' + prox.id, { classe: 'prof-btn prof-btn--linha prof-btn--pequeno', iconeDepois: 'direita' })));

    const doca = el('div', { class: 'prof-doca', role: 'region', 'aria-label': 'Ações da área' },
      j ? botaoEstudar('prof-btn--primario') : link('Que área é a minha?', 'profissoes-tecnologia-jogo', { classe: 'prof-btn prof-btn--primario', icone: 'play' }),
      j ? link('Refazer o jogo', 'profissoes-tecnologia-jogo', { classe: 'prof-btn prof-btn--linha', icone: 'embaralhar' }) : botaoEstudar('prof-btn--linha'));
    aplicarSegredos(false);
    fecharHistoria(raiz, h, doca);
  }

  /* Chute do salário da área: a régua, depois a faixa de cada cargo com o chute marcado no primeiro */
  function blocoChute(t, a, aoRevelar) {
    const s = salarioPrincipal(a);
    const chave = ID + ':' + a.id;
    const raiz = el('div');
    const MIN = 1000, MAX = 20000, PASSO = 250, INICIAL = 5000;
    const faixa = el('input', { type: 'range', id: 'prof-chute-' + a.id, min: MIN, max: MAX, step: PASSO, value: INICIAL, 'aria-label': 'Seu chute de salário mensal' });
    const valor = el('span', { class: 'prof-chute-valor prof-num', text: brl(INICIAL) });
    faixa.addEventListener('input', () => valor.textContent = brl(faixa.value));
    const btn = botao('Confirmar chute', { classe: 'prof-btn--primario', onclick: () => revelar(+faixa.value, true) });
    const veredito = el('div', { 'aria-live': 'polite' });
    const chute = el('div', { class: 'prof-chute prof-caixa' }, el('p', { class: 'prof-chute-pergunta', text: `Seu chute: quanto ganha, na contratação com carteira, quem trabalha como ${s.cargo.toLowerCase()}?` }),
      faixa, el('div', { class: 'prof-chute-linha' }, valor, btn), veredito);
    const caixas = el('div', { class: 'prof-segredo-conteudo' });
    const desenhar = meuChute => {
      caixas.textContent = '';
      a.salarios.forEach((sx, i) => caixas.appendChild(el('div', { class: 'prof-caixa' + (i ? ' prof-espaco' : '') + (i === 0 && meuChute ? ' prof-chute-resultado' : '') },
        el('div', { class: 'prof-grafico-cab' }, el('h3', null, sx.cargo, ' ', el('span', { class: 'prof-micro', text: 'CBO ' + sx.cbo })), el('span', { class: 'prof-min' }, 'média ', el('b', { class: 'prof-num', text: brl(sx.media) }), citar(t, sx.fontes))),
        el('div', { class: 'prof-rolagem prof-faixa-rolagem' }, IG().faixaSalarial({ min: MIN, max: MAX, faixa: { de: sx.p25, ate: sx.p75, rotulo: 'faixa comum (percentis 25 e 75)' }, media: sx.media, piso: null, chute: i === 0 ? meuChute : null })),
        sx.nota ? el('p', { class: 'prof-fonte-nota', text: sx.nota }) : null)));
    };
    desenhar(null);
    const tampa = el('div', { class: 'prof-segredo-tampa' }, icone('cadeado'), el('p', { text: 'Os valores aparecem depois do seu chute.' }),
      botao('Prefiro só ver os números', { classe: 'prof-btn--linha prof-btn--pequeno', onclick: () => revelar(null, true) }));
    const segredo = el('div', { class: 'prof-segredo' }, caixas, tampa);
    raiz.append(chute, segredo);

    function revelar(meuChute, agora) {
      if (meuChute != null) {
        const dif = Math.round((meuChute - s.media) / s.media * 100);
        if (agora) { P.estado().chutes[chave] = meuChute; P.ganchos.registrar('profissao_chute_salario', { profissao: ID, cargo: s.cargo, chute: meuChute, media: s.media }); }
        faixa.value = meuChute; valor.textContent = brl(meuChute);
        veredito.textContent = '';
        veredito.appendChild(el('p', { class: 'prof-veredito' }, 'Você chutou ', el('b', { text: `${Math.abs(dif)}% ${dif >= 0 ? 'acima' : 'abaixo'}` }), ` da média de contratação de ${s.cargo.toLowerCase()}, que é ${brl(s.media)}`, citar(t, s.fontes), `. A faixa turquesa é onde fica a maior parte dos contratos: ${brl(s.p25)} a ${brl(s.p75)}.`));
      }
      faixa.disabled = true; btn.disabled = true;
      desenhar(meuChute);
      segredo.classList.add('prof-segredo--aberto'); caixas.removeAttribute('inert'); caixas.removeAttribute('aria-hidden'); tampa.hidden = true;
      if (agora) { segredo.classList.add('prof-revelado'); est().salario[a.id] = true; salvarEstado(); aoRevelar(); }
      if (meuChute == null && !P.estado().chutes[chave]) chute.hidden = true;
    }
    const anterior = (P.estado().chutes || {})[chave];
    if (salarioAberto(a.id)) revelar(anterior != null ? anterior : null, false);
    else { caixas.setAttribute('inert', ''); caixas.setAttribute('aria-hidden', 'true'); }
    return raiz;
  }

  /* =====================================================================
     Jogo: "Que área da tecnologia é a sua?"
     ===================================================================== */
  function maximos(t) { const m = {}; t.areas.forEach(a => m[a.id] = 0); t.jogo.cenas.forEach(c => { const best = {}; c.opcoes.forEach(o => Object.entries(o.pontos).forEach(([k, v]) => best[k] = Math.max(best[k] || 0, v))); Object.entries(best).forEach(([k, v]) => m[k] += v); }); return m; }
  function ranking(t, pontos) { const m = maximos(t); return t.areas.map(a => ({ area: a, pts: pontos[a.id] || 0, pct: Math.round((pontos[a.id] || 0) / (m[a.id] || 1) * 100) })).sort((x, y) => y.pct - x.pct); }

  function telaJogo(raiz, t, ix) {
    const J = t.jogo; let i = 0; const pontos = {}; const escolhas = [];
    let tecla = null;
    const soltarTecla = () => { if (tecla) { document.removeEventListener('keydown', tecla); tecla = null; } };
    limpezas.push(soltarTecla);
    P.ganchos.registrar('tecnologia_jogo_inicio', {});
    raiz.style.setProperty('--cor-area', corArea(ix, ID));
    raiz.appendChild(topo('Panorama da Tecnologia', 'profissoes-tecnologia'));
    raiz.appendChild(el('header', { class: 'prof-jogo-cab' },
      el('span', { class: 'prof-rotulo', text: 'Tecnologia', style: { color: 'var(--cor-area)' } }),
      el('h1', { text: J.titulo }),
      el('p', { class: 'prof-lead prof-suave', text: J.subtitulo })));
    const progresso = el('div', { class: 'prof-progresso', 'aria-hidden': 'true' }, J.cenas.map(() => el('i')));
    const palco = el('div', { class: 'prof-jogo-palco' }); raiz.append(progresso, palco);

    function cena(volta) {
      soltarTecla();
      progresso.querySelectorAll('i').forEach((p, k) => p.className = k < i ? 'feita' : k === i ? 'atual' : '');
      const c = J.cenas[i]; palco.textContent = '';
      const titulo = el('h2', { text: c.texto, tabindex: '-1' });
      const ops = el('div', { class: 'prof-opcoes' });
      const card = el('div', { class: 'prof-cena prof-lado--entra' },
        el('div', { class: 'prof-hora', text: `Situação ${i + 1} de ${J.cenas.length}` }), titulo, ops,
        el('div', { class: 'prof-jogo-pe' },
          i > 0 ? botao('Voltar', { classe: 'prof-btn--linha prof-btn--pequeno', icone: 'esquerda', onclick: voltar }) : el('span'),
          el('span', { class: 'prof-micro prof-so-teclado', text: `Teclas 1 a ${c.opcoes.length}` })));
      c.opcoes.forEach((o, k) => ops.appendChild(el('button', { type: 'button', class: 'prof-opcao', style: { '--i': k }, onclick: e => escolher(k, e.currentTarget) }, el('kbd', { text: String(k + 1) }), o.texto)));
      palco.appendChild(card);
      if (i > 0 || volta) titulo.focus({ preventScroll: true });
      let feita = false;
      function escolher(k, botaoEl) {
        if (feita) return; feita = true; soltarTecla();
        const o = c.opcoes[k]; Object.entries(o.pontos).forEach(([ar, v]) => pontos[ar] = (pontos[ar] || 0) + v); escolhas.push(o.pontos);
        const b = botaoEl || ops.children[k]; if (b) b.setAttribute('aria-pressed', 'true');
        setTimeout(() => { i++; i < J.cenas.length ? cena() : fim(); }, semMovimento() ? 0 : 260);
      }
      tecla = e => { if (e.altKey || e.ctrlKey || e.metaKey) return; const n = +e.key; if (n >= 1 && n <= c.opcoes.length) escolher(n - 1); };
      document.addEventListener('keydown', tecla);
    }
    function voltar() { i--; const u = escolhas.pop(); if (u) Object.entries(u).forEach(([k, v]) => pontos[k] -= v); cena(true); }

    function fim() {
      soltarTecla();
      progresso.querySelectorAll('i').forEach(p => p.className = 'feita');
      const r = ranking(t, pontos); const top = r.slice(0, 3); const resto = r.slice(3);
      const e = est(); e.jogo = { pontos: { ...pontos }, data: new Date().toISOString().slice(0, 10) };
      const primeira = !e.jogoConcluido;
      if (primeira) { e.jogoConcluido = true; P.ganchos.recompensar({ tipo: 'tecnologia_jogo', xp: J.resultado.recompensa.xp, perolas: J.resultado.recompensa.perolas, profissao: ID }); }
      salvarEstado(); P.ganchos.registrar('tecnologia_jogo_concluido', { top: top.map(x => x.area.id), pct: top.map(x => x.pct) });
      palco.textContent = '';
      const titulo = el('h2', { class: 'prof-jogo-fim', text: 'Suas três áreas', tabindex: '-1' });
      palco.appendChild(titulo);
      palco.appendChild(el('p', { class: 'prof-min prof-jogo-aviso', text: J.aviso }));
      const contas = [];
      palco.appendChild(el('div', { class: 'prof-cards prof-cards--resultado' }, top.map((x, k) => {
        const s = salarioPrincipal(x.area);
        const pct = el('b', { class: 'prof-num prof-resultado-pct', text: x.pct + '%' }); contas.push([pct, x.pct + '%']);
        return el('div', { class: 'prof-caixa prof-resultado' + (k === 0 ? ' prof-resultado--topo' : ''), style: { '--i': k } },
          el('div', { class: 'prof-resultado-cab' }, el('span', { class: 'prof-rotulo', text: k === 0 ? 'Mais parecida' : k === 1 ? 'Segunda' : 'Terceira' }), pct),
          el('h3', { text: x.area.nome }),
          el('p', { text: `${x.area.nome} ${x.pct >= 60 ? J.resultado.texto_alto : x.pct >= 35 ? J.resultado.texto_medio : J.resultado.texto_baixo}` }),
          el('p', { class: 'prof-min prof-espaco-p', text: 'Combina com quem gosta de: ' + x.area.gosta_de.slice(0, 2).join('; ').toLowerCase() + '.' }),
          el('div', { class: 'prof-area-rodape' }, el('span', { class: 'prof-num' }, salarioAberto(x.area.id) ? el('b', { text: brl(s.media) }) : el('b', { class: 'prof-sigilo', text: 'R$ ?' }), ' média'),
            link('Ver o dia a dia', 'tecnologia-' + x.area.id, { classe: 'prof-btn prof-btn--pequeno ' + (k === 0 ? 'prof-btn--primario' : 'prof-btn--linha'), iconeDepois: 'direita' })));
      })));
      palco.appendChild(el('div', { class: 'prof-caixa prof-espaco' }, el('h3', { text: 'As outras sete' }), el('div', { class: 'prof-mini-barras' }, resto.map((x, k) => el('a', { href: '#tecnologia-' + x.area.id, class: 'prof-mini-barra', style: { '--i': k } }, el('span', { text: x.area.nome }), el('i', { 'aria-hidden': 'true' }, el('b', { style: { '--fracao': x.pct / 100 } })), el('span', { class: 'prof-num', text: x.pct + '%' }))))));
      palco.appendChild(el('div', { class: 'prof-jogo-acoes' },
        primeira ? el('p', { class: 'prof-recompensa', text: `+${J.resultado.recompensa.xp} XP · +${J.resultado.recompensa.perolas} pérolas` }) : null,
        botao('Jogar de novo', { classe: 'prof-btn--linha', icone: 'embaralhar', onclick: () => { i = 0; Object.keys(pontos).forEach(k => delete pontos[k]); escolhas.length = 0; palco.classList.remove('prof-jogo-palco--fim'); cena(true); } }),
        link('Ver o panorama', 'profissoes-tecnologia', { classe: 'prof-btn prof-btn--linha' }),
        botaoEstudar('prof-btn--linha')));
      requestAnimationFrame(() => { palco.classList.add('prof-jogo-palco--fim'); contas.forEach(([alvo, texto]) => contar(alvo, texto)); });
      titulo.focus({ preventScroll: true });
      ir(raiz.querySelector('.prof-jogo-cab'));
    }
    cena();
  }
})();

/* Mapa das Profissões · Panoramas de área (js/profissoes-panorama.js)
   Extensão de js/profissoes.js: carrega depois dele (pacote "profissoes" em js/app.js) e se registra sozinha.
   Serve todos os panoramas de indice.json → panoramas[] (hoje: Tecnologia e Medicina). Para cada <id>:
   rotas #profissoes-<id> (panorama) · #<id>-<área> (uma área) · #profissoes-<id>-jogo (jogo de afinidade);
   eventos <id>_panorama, <id>_area_vista, <id>_jogo_inicio e <id>_jogo_concluido; recompensa do jogo <id>_jogo.
   Os rótulos ("área" ou "especialidade", cor, títulos) vêm do JSON de cada panorama.
   Repaginado em 2026-10-16 (pedido do usuário: "está bem bagunçado de entender para a pessoa separar por especialidade"):
   o panorama abre com as especialidades (ou áreas) lado a lado, cada uma com o apelido, o perfil em barrinhas e o
   salário, e botões que reordenam pelo que importa para a pessoa; a página de cada uma tem a faixa para trocar de
   especialidade, o dia típico ao lado do "combina com quem" e o salário (desde 2026-10-17, depois do palpite: ver "O salário só depois
   do palpite", abaixo). Nada some ao rolar. Os textos vêm do JSON de cada panorama, sem mudança.
   Em 2026-10-17 virou relatório, como a ficha (pedido do usuário: "no estilo dos relatórios da Globo"): capa com "Em números",
   capítulos em faixas numeradas, o dinheiro de todas na mesma régua, os cem quadradinhos do número em porcentagem e
   "Fonte:" embaixo de cada gráfico. Só o desenho mudou: textos, números, rotas, XP e log são os mesmos.
   Enquanto o panorama for rascunho (data/profissoes/indice.json, panoramas[].status), só a equipe vê; o aluno vê "Em breve". */
(function () {
  'use strict';
  const P = window.Profissoes; if (!P || !P._util) return;
  const { el, icone, botao, link, citar, brl, dataBR, salvarEstado, limpezas, IG, EIXOS, temFicha, temPanorama, pedir,
    semMovimento, contar, ir, fontesGuardadas, dadosPanorama, corArea,
    topoPagina, indiceCapitulos, linhasCargos, regua, dominioDe, palpite, semReais, revelarReais,
    capaRelatorio, linhaEmNumeros, caixaResumo, calloutsNumerados, capituloRelatorio, fonteLinha, botaoFontes } = P._util;

  /* O panorama da tela atual: montar() define antes de desenhar (as telas são desenhadas uma de cada vez) */
  let ID = 'tecnologia', T = null;
  /* Onde estudar no Diver: o app abre o curso pelo gancho abrirCurso */
  const PONTES = {
    tecnologia: {
      entrada: 'explora-tech-fundamentos', nomeEntrada: 'Explora Tech · Fundamentos', botao: 'Estudar tecnologia', abrir: 'Abrir o Explora Tech', onde: 'na sala Tecnologia', lugar: 'Cada empresa é diferente.',
      texto: 'A sala Tecnologia do Diver começa pelo Explora Tech · Fundamentos: lógica, Python, como o computador e a internet funcionam, Linux e Git, com laboratórios para pôr a mão no código. Serve de base para qualquer uma das dez áreas.',
      porArea: { seguranca: ['ciberseguranca-essencial', 'iso-27001-foundation'] }
    },
    medicina: {
      entrada: 'enem-biologia', nomeEntrada: 'Mergulho no Enem · Biologia', botao: 'Estudar para entrar', abrir: 'Abrir Enem · Biologia', onde: 'para entrar em Medicina', lugar: 'Cada serviço de saúde é diferente.',
      texto: 'Antes da especialidade vem a aprovação. Biologia, Química e Física costumam pesar no Enem, junto com a redação, e estão na sala Mergulho no Enem e Vestibular, uma matéria por curso. Quem já está na Medicina encontra na sala Radiologia os cursos de diagnóstico por imagem.',
      porArea: { radiologia: ['radiologia-musculoesqueletico', 'radiologia-aparelho-digestivo', 'radiologia-cabeca-pescoco', 'radiologia-geniturinario'] }
    }
  };
  const ponte = () => PONTES[ID] || null;
  const cursosDe = a => { const pt = ponte(); return pt ? [pt.entrada, ...(pt.porArea[a.id] || [])] : []; };
  const evento = nome => ID + '_' + nome;
  const rot = (campo, padrao) => (T && T[campo]) || padrao;
  const umaArea = () => rot('rotulo_area', 'área'); // "área" ou "especialidade" (as duas pedem "da", "desta", "nesta")
  const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);
  const corPan = ix => (T && T.cor ? `var(${T.cor})` : corArea(ix, ID));
  const NUMERAIS = { 1: 'uma', 2: 'duas', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze' }; // femininos: "áreas", "especialidades"
  const extenso = n => NUMERAIS[n] || String(n);

  /* Estado do aluno, dentro do estado do Mapa (diver:v1:profissoes → vai para a nuvem), um por panorama
     (Tecnologia em "tec", como sempre foi; Medicina em "med"): areasVistas { id: vezes } · jogo { pontos, data } · jogoConcluido */
  const CHAVE_ESTADO = { tecnologia: 'tec', medicina: 'med' };
  const est = () => {
    const e = P.estado(), k = CHAVE_ESTADO[ID] || 'pan_' + ID;
    e[k] = e[k] || {};
    e[k].areasVistas = e[k].areasVistas || {};
    e[k].salario = e[k].salario || {};
    if (!('jogo' in e[k])) e[k].jogo = null;
    return e[k];
  };

  P.registrarExtensao({
    aceita: (r, ix) => !!panoramaDa(r, ix),
    montar: async (raiz, r, ix) => {
      const pn = panoramaDa(r, ix);
      if (!temPanorama(pn)) { ID = pn.id; T = null; return emBreve(raiz, pn, ix); }
      const t = await dadosPanorama(pn);
      ID = pn.id; T = t;
      if (r === 'profissoes-' + ID) return telaPanorama(raiz, t, ix);
      if (r === 'profissoes-' + ID + '-jogo') return telaJogo(raiz, t, ix);
      const a = t.areas.find(x => ID + '-' + x.id === r);
      return a ? telaArea(raiz, t, a, ix) : telaPanorama(raiz, t, ix);
    }
  });

  /* De qual panorama é esta rota? (#profissoes-<id>, #profissoes-<id>-jogo ou #<id>-<área>) */
  function panoramaDa(r, ix) {
    return ((ix && ix.panoramas) || []).find(pn => r === 'profissoes-' + pn.id || r === 'profissoes-' + pn.id + '-jogo' || r.startsWith(pn.id + '-')) || null;
  }

  /* ---------------- Peças ---------------- */
  const salarioPrincipal = a => a.salarios && a.salarios[0];
  const nomeCurto = a => a.nome_curto || a.nome.replace('Inteligência artificial e aprendizado de máquina', 'Inteligência artificial');
  /* Área sem ocupação própria no Caged (usa a de outra como referência): o salário aparece marcado como referência */
  const ehReferencia = a => { const s = salarioPrincipal(a); return !s || /referência|ocupação mais próxima|ocupação usada/i.test(s.cargo); };
  const uniq = l => [...new Set(l)];
  const selo = texto => el('span', { class: 'prof-selo prof-selo--rascunho', text: texto });

  /* ---------------- O salário só depois do palpite (2026-10-17) ----------------
     Pedido do usuário: "quando clico em medicina ele também entrega de cara os salários aí acaba não tendo tanta graça para adivinhar".
     Cada especialidade (ou área) mostra "R$ ?" até o palpite na página dela, na mesma régua da ficha. O dinheiro de todas na mesma
     régua e a ordem "Maior salário" abrem depois do "Quem ganha mais?" (duas por vez, cinco rodadas) ou do "Prefiro ver direto".
     Um número em reais da capa (a bolsa de residência) também vira palpite. Fica em est().salario:
     { <área>: { valor, data } (valor null: "Prefiro ver direto"), 'numero:<rótulo>': { valor, data }, panorama: { via, acertos, rodadas, data } }.
     O que ficou de antes da repaginação de 2026-10-16 (true numa área, { aposta } no panorama) continua valendo como "já viu".
     Log: profissao_chute_salario com panorama e area (ou numero, ou jogo: 'quem-ganha-mais'); nenhum tipo novo no banco. */
  const sal = () => est().salario;
  const todasAbertas = () => !!sal().panorama;
  const aberta = a => todasAbertas() || !!sal()[a.id];
  const hoje = () => new Date().toISOString().slice(0, 10);
  const slug = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  /** "R$ 4.106" vira 4106; o que não for um valor em reais, null */
  const emReais = v => { const m = /^R\$\s?(\d[\d.]*)(?:,(\d+))?$/.exec(String(v).trim()); return m ? Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : '')) : null; };
  const chaveNumero = n => 'numero:' + slug(n.rotulo);
  const cargoLimpo = sx => sx.cargo.replace(/\s*\(.*\)\s*$/, ''); // "Médico clínico (referência)" → "Médico clínico"
  const minuscula = x => x.charAt(0).toLowerCase() + x.slice(1);
  /** Leva ao palpite e põe o foco na régua (quem usa o teclado chega direto nela) */
  function irAoPalpite(id) {
    const alvo = document.getElementById(id); if (!alvo) return;
    ir(alvo); const r = alvo.querySelector('.prof-chute[tabindex]'); if (r) r.focus({ preventScroll: true });
  }
  const botaoPalpite = id => el('button', { type: 'button', class: 'prof-link-botao prof-emnum-palpite', onclick: () => irAoPalpite(id) }, icone('alvo'), 'Dar meu palpite primeiro');
  const salarioFechado = () => el('span', { class: 'prof-esp-salario prof-esp-salario--fechado' }, icone('alvo'),
    el('b', { class: 'prof-num', 'aria-hidden': 'true', text: 'R$ ?' }), el('span', { class: 'prof-oculto', text: 'Salário escondido até o seu palpite' }));
  const salarioAberto = a => el('span', { class: 'prof-esp-salario' }, el('b', { class: 'prof-num', text: brl(salarioPrincipal(a).media) }), ehReferencia(a) ? ' referência' : ' média');

  /** O palpite de uma especialidade (ou área): a média de contratação do cargo principal, na régua da ficha */
  function palpiteArea(t, a, aoResponder) {
    const sx = salarioPrincipal(a), salvo = sal()[a.id], cargo = minuscula(cargoLimpo(sx)), ref = ehReferencia(a);
    return palpite({
      idCaixa: 'palpite-' + a.id, cargo: sx.cargo, media: sx.media, faixa: { de: sx.p25, ate: sx.p75 },
      pergunta: (ref ? `${maiuscula(umaArea())} sem ocupação própria no Caged: a referência é a de ${cargo}. ` : '') + `Quanto ganha, por mês, quem é contratado como ${cargo} com carteira assinada?`,
      textoValor: ` é a média de contratação de ${cargo}${ref ? `, a referência desta ${umaArea()}` : ''}`,
      citacao: () => citar(t, sx.fontes),
      salvo: salvo && typeof salvo === 'object' && 'valor' in salvo ? salvo : null, revelado: aberta(a),
      aoResponder: r => {
        sal()[a.id] = { valor: r.valor, data: hoje() }; salvarEstado();
        if (r.valor != null) P.ganchos.registrar('profissao_chute_salario', { profissao: ID, panorama: ID, area: a.id, cargo: sx.cargo, chute: r.valor, media: sx.media, diferenca: r.diferenca, acertou: r.acertou });
        aoResponder();
      }
    });
  }
  /** Um número em reais da capa (a bolsa de residência): a linha do "Em números" espera o palpite, que fica em "Antes de escolher" */
  function linhaNumeroReais(t, n) {
    const linha = el('div', { class: 'prof-emnum-linha prof-emnum-linha--salario' });
    const pintar = () => {
      const visto = !!sal()[chaveNumero(n)];
      linha.textContent = '';
      linha.append(el('dt', { text: n.rotulo }), el('dd', null,
        visto ? el('b', { class: 'prof-emnum-salario', text: n.valor }) : botaoPalpite('palpite-' + slug(n.rotulo)),
        el('span', { class: 'prof-micro' }, visto ? n.detalhe || '' : 'Antes do número, arraste a régua até o seu palpite.', visto ? citar(t, n.fontes) : null)));
    };
    pintar();
    return { el: linha, pintar };
  }
  function palpiteNumero(t, n, aoResponder) {
    const k = chaveNumero(n), salvo = sal()[k], valor = emReais(n.valor);
    return palpite({
      idCaixa: 'palpite-' + slug(n.rotulo), cargo: n.rotulo, media: valor, faixa: null, marca: 'valor',
      pergunta: `${n.rotulo}: quanto você acha que é, por mês?`, rotulo: `Seu palpite para ${minuscula(n.rotulo)}: use as setas e Enter`,
      dica: 'Toque ou arraste na régua e solte no seu palpite. Valor por mês.', dicaDepois: 'Valor por mês.',
      tituloSemPalpite: n.rotulo, textoValor: ` é o valor de hoje${n.detalhe ? ', ' + n.detalhe : ''}`, citacao: () => citar(t, n.fontes),
      salvo: salvo && typeof salvo === 'object' && 'valor' in salvo ? salvo : null, revelado: !!salvo,
      aoResponder: r => {
        sal()[k] = { valor: r.valor, data: hoje() }; salvarEstado();
        if (r.valor != null) P.ganchos.registrar('profissao_chute_salario', { profissao: ID, panorama: ID, numero: slug(n.rotulo), chute: r.valor, media: valor, diferenca: r.diferenca, acertou: r.acertou });
        aoResponder();
      }
    });
  }

  /* "Quem ganha mais?": duas especialidades (ou áreas) por vez, cinco rodadas; no fim, o dinheiro de todas abre na mesma régua.
     Só entram as que têm ocupação própria no Caged (as de referência repetiriam o mesmo valor), em pares com 6% ou mais de diferença. */
  const RODADAS = 5;
  function paresDoJogo(t) {
    const itens = t.areas.filter(a => salarioPrincipal(a) && !ehReferencia(a)), pares = [];
    itens.forEach((x, i) => itens.slice(i + 1).forEach(y => {
      const mx = salarioPrincipal(x).media, my = salarioPrincipal(y).media;
      if (Math.abs(mx - my) / Math.max(mx, my) >= 0.06) pares.push([x, y]);
    }));
    for (let i = pares.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pares[i], pares[j]] = [pares[j], pares[i]]; }
    // cada uma entra no máximo duas vezes (três, se faltar par)
    for (const limite of [2, 3]) {
      const usos = {}, escolhidos = [];
      for (const par of pares) {
        if (escolhidos.length === RODADAS) break;
        if (par.some(a => (usos[a.id] || 0) >= limite)) continue;
        par.forEach(a => { usos[a.id] = (usos[a.id] || 0) + 1; });
        escolhidos.push(Math.random() < 0.5 ? par : [par[1], par[0]]);
      }
      if (escolhidos.length === RODADAS || limite === 3) return escolhidos;
    }
    return [];
  }
  /** O convite e as rodadas, numa caixa só; aoAbrir() redesenha o que mostra o dinheiro de todas */
  function quemGanhaMais(t, aoAbrir) {
    const caixa = el('div', { class: 'prof-caixa prof-qgm' });
    const plural = rot('rotulo_areas', 'áreas');
    function abrir(via, acertos, rodadas) {
      sal().panorama = { via, acertos: acertos == null ? null : acertos, rodadas: rodadas == null ? null : rodadas, data: hoje() }; salvarEstado();
      aoAbrir();
    }
    function jogar() {
      const pares = paresDoJogo(t), total = pares.length;
      if (!total) { abrir('direto'); return; }
      let i = 0, acertos = 0;
      const textoPlacar = () => `Rodada ${i + 1} de ${total} · ${acertos} ${acertos === 1 ? 'acerto' : 'acertos'}`;
      function rodada() {
        const [x, y] = pares[i], mx = salarioPrincipal(x).media, my = salarioPrincipal(y).media, maior = mx > my ? x : y;
        const placar = el('p', { class: 'prof-micro prof-qgm-placar prof-num', text: textoPlacar() });
        const retorno = el('p', { class: 'prof-qgm-retorno', 'aria-live': 'polite' });
        const seguir = botao(i + 1 < total ? 'Próxima rodada' : 'Ver todas na mesma régua', { classe: 'prof-btn--primario prof-btn--pequeno', iconeDepois: 'direita',
          onclick: () => { i++; if (i < total) rodada(); else { P.ganchos.registrar('profissao_chute_salario', { profissao: ID, panorama: ID, jogo: 'quem-ganha-mais', acertos, rodadas: total, acertou: acertos === total }); abrir('jogo', acertos, total); } } });
        seguir.hidden = true;
        let feita = false;
        const ops = [x, y].map(a => {
          const valor = el('b', { class: 'prof-qgm-valor prof-num', text: 'R$ ?' });
          const b = el('button', { type: 'button', class: 'prof-qgm-op', onclick: () => escolher(a) },
            el('span', { class: 'prof-esp-apelido', text: a.apelido }), el('span', { class: 'prof-qgm-nome', text: nomeCurto(a) }), valor);
          return { a, b, valor };
        });
        function escolher(a) {
          if (feita) return; feita = true;
          const certo = a === maior; if (certo) acertos++;
          ops.forEach(o => {
            o.b.setAttribute('aria-disabled', 'true');
            o.b.classList.add(o.a === maior ? 'prof-qgm-op--maior' : 'prof-qgm-op--menor');
            if (o.a === a) { o.b.classList.add('prof-qgm-op--escolhida'); o.b.setAttribute('aria-pressed', 'true'); }
            if (o.a === maior) o.b.appendChild(el('span', { class: 'prof-qgm-tag' }, icone('certo'), 'Ganha mais'));
            contar(o.valor, brl(salarioPrincipal(o.a).media));
          });
          placar.textContent = textoPlacar();
          retorno.textContent = `${certo ? 'Acertou!' : 'Não desta vez.'} ${nomeCurto(maior)}: média de ${brl(Math.max(mx, my))}, contra ${brl(Math.min(mx, my))}.`;
          seguir.hidden = false; seguir.focus({ preventScroll: true });
        }
        caixa.textContent = '';
        caixa.append(placar, el('h3', { class: 'prof-qgm-tit', text: 'Quem ganha mais?' }),
          el('div', { class: 'prof-qgm-par' }, ops[0].b, el('span', { class: 'prof-qgm-ou', 'aria-hidden': 'true', text: 'ou' }), ops[1].b),
          retorno, el('div', { class: 'prof-qgm-pe' }, seguir));
        ops[0].b.focus({ preventScroll: true });
      }
      rodada();
    }
    caixa.append(
      el('h3', { class: 'prof-qgm-tit', text: 'Quem ganha mais?' }),
      el('p', { class: 'prof-prosa', text: `Duas ${plural} por vez: toque na que você acha que ganha mais. São ${extenso(RODADAS)} rodadas; no fim, todas aparecem na mesma régua.` }),
      el('div', { class: 'prof-palpite-botoes' },
        botao('Jogar', { classe: 'prof-btn--primario', icone: 'play', onclick: jogar }),
        el('button', { type: 'button', class: 'prof-link-botao', text: 'Prefiro ver direto', onclick: () => abrir('direto') })));
    return caixa;
  }
  /** Depois de abrir o dinheiro, o foco vai para o que apareceu (o botão que a pessoa tocou sumiu com a caixa do jogo) */
  function focarNovo(caixa) { const alvo = caixa.querySelector('.prof-qgm-resultado, .prof-salareas'); if (alvo) { alvo.setAttribute('tabindex', '-1'); alvo.focus({ preventScroll: true }); } }
  /** O dinheiro de todas: a régua comum, ou o "Quem ganha mais?" antes dela (com o placar, depois do jogo) */
  function dinheiroDeTodas(t, destaque, aoAbrir) {
    if (!todasAbertas()) return quemGanhaMais(t, aoAbrir);
    const j = sal().panorama;
    return el('div', null,
      j.via === 'jogo' && j.rodadas ? el('p', { class: 'prof-qgm-resultado' }, icone('alvo'), el('span', null, 'No "Quem ganha mais?", você acertou ', el('b', { class: 'prof-num', text: `${j.acertos} de ${j.rodadas}` }),
        j.acertos === j.rodadas ? '. Na mosca em todas!' : j.acertos >= j.rodadas - 1 ? '. Mandou bem!' : '. O dinheiro engana: veja todas na mesma régua.')) : null,
      comparaSalarios(t, destaque));
  }
  function linhaRevisao(t) {
    const rv = t.revisao || {};
    const item = (ok, texto) => el('span', { class: ok ? 'ok' : 'pendente' }, icone(ok ? 'certo' : 'relogio'), texto);
    return el('div', { class: 'prof-revisao' },
      item(rv.fontes === 'conferidas', 'Fontes: ' + (rv.fontes || 'pendente')),
      item(rv.ia === 'ok', 'Validação por IA: ' + (rv.ia || 'pendente')),
      item(rv.profissional === 'ok', rv.profissional === 'ok' ? `Revisado por ${rv.revisor} em ${dataBR(rv.data)}` : `Revisão por profissionais de cada ${umaArea()}: pendente`));
  }
  function estudar(curso) { P.ganchos.registrar('profissao_materias_chave', { profissao: ID, panorama: ID, curso }); P.ganchos.abrirCurso(curso); }
  const botaoEstudar = classe => ponte() ? botao(ponte().botao, { classe, icone: 'livro', onclick: () => estudar(ponte().entrada) }) : null;
  const linkJogo = (rank, classe) => link(rank ? 'Refazer o jogo' : ((T.jogo && T.jogo.chamada) || 'Descobrir a minha área'), 'profissoes-' + ID + '-jogo', { classe: 'prof-btn ' + classe, icone: rank ? 'embaralhar' : 'play' });

  function emBreve(raiz, pn, ix) {
    const area = ((ix && ix.areas) || []).find(a => a.panorama && a.panorama.rota === pn.rota);
    const titulo = area ? area.panorama.titulo : 'Panorama';
    raiz.classList.add('prof-raiz--estreita');
    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' }));
    raiz.appendChild(el('div', { class: 'prof-vazio' },
      el('h1', { text: titulo }),
      el('p', { text: 'Este panorama ainda está em revisão com profissionais de cada área. Ele abre para todos assim que a revisão terminar.' }),
      el('div', { class: 'prof-espaco' }, botao('Quero ver este panorama', { classe: 'prof-btn--primario', icone: 'estrela', onclick: () => pedir(pn.id, 'O ' + titulo) }))));
  }

  /* =====================================================================
     Panorama, no formato de relatório (2026-10-17): a capa com "Em números", os capítulos numerados (as especialidades
     ou áreas primeiro, o dinheiro na mesma régua, o contexto, os cursos e o jogo) e a fonte embaixo de cada gráfico
     ===================================================================== */
  /** "48%" vira 48; o que não for porcentagem, null */
  const porcento = v => { const m = /^(\d+(?:,\d+)?)\s*%$/.exec(String(v).trim()); return m ? Number(m[1].replace(',', '.')) : null; };
  const juntar = nomes => nomes.length < 2 ? nomes.join('') : nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];

  function telaPanorama(raiz, t, ix) {
    P.ganchos.registrar(evento('panorama'), {});
    raiz.style.setProperty('--cor-area', corPan(ix));
    const j = est().jogo;
    const rank = j ? ranking(t, j.pontos) : null;

    raiz.appendChild(topoPagina({ texto: 'Mapa das Profissões', rota: 'profissoes' }, t.status !== 'publicada' ? selo('Em revisão por profissionais') : null));
    // O número em porcentagem vira os cem quadradinhos de "Antes de escolher"; os outros ficam na capa (cada número aparece uma vez).
    // Um número em reais (a bolsa de residência) espera o palpite, que também fica em "Antes de escolher".
    const cem = t.numeros.find(n => porcento(n.valor) != null);
    const reais = t.numeros.filter(n => n !== cem && emReais(n.valor) != null).map(n => ({ n, linha: linhaNumeroReais(t, n) }));
    // Esse valor também aparece no texto de um curso ("com bolsa de R$ 4.106"): fica "R$ ?" até o palpite
    const reaisAbertos = () => (reais.length ? reais.every(r => !!sal()[chaveNumero(r.n)]) : todasAbertas());
    const respondeuNumero = r => () => { r.linha.pintar(); if (reaisAbertos()) revelarReais(document.getElementById('sec-formacao')); };
    raiz.appendChild(capaRelatorio({
      rotulo: rot('rotulo', 'Panorama'), titulo: t.titulo, frase: t.frase,
      meta: [`Panorama conferido em ${dataBR(t.conferido_em)}`, 'Mapa das Profissões do Diver'], fontes: botaoFontes(t.fontes.length),
      acoes: [linkJogo(rank, 'prof-btn--primario'), botaoEstudar('prof-btn--linha')],
      resumo: caixaResumo(t.contexto.map(c => ({ icone: 'info', texto: c.texto, ids: c.fontes })), 'deste panorama', { fonte: t, nome: t.titulo }),
      numeros: t.numeros.filter(n => n !== cem).map(n => { const r = reais.find(x => x.n === n); return r ? r.linha.el : linhaEmNumeros(n.rotulo, n.valor, n.detalhe, citar(t, n.fontes)); }) }));

    const corpo = el('div', { class: 'prof-corpo' });
    raiz.appendChild(corpo);
    let n = 0;
    const cap = (id, titulo, sub, ...conteudo) => corpo.appendChild(capituloRelatorio(t, ++n, id, titulo, null, sub, ...conteudo));

    // 01. As especialidades (ou áreas) lado a lado
    const vistas = t.areas.filter(a => est().areasVistas[a.id]).length;
    const exp = explorador(t, rank);
    cap('areas', rot('titulo_areas', 'As áreas'),
      `${maiuscula(extenso(t.areas.length))} ${rot('rotulo_areas', 'áreas')}, cada uma com o seu dia a dia. ${vistas ? `Você já explorou ${vistas}. ` : ''}Toque numa para ver por dentro.`,
      exp.el);

    // 02. O dinheiro: todas na mesma régua, depois do "Quem ganha mais?" (ou do "Prefiro ver direto")
    const dinheiro = el('div');
    const pintarDinheiro = () => { dinheiro.textContent = ''; dinheiro.appendChild(dinheiroDeTodas(t, null, abriuTudo)); };
    function abriuTudo() {
      pintarDinheiro(); exp.redesenhar();
      const alvo = document.getElementById('sec-dinheiro'); if (alvo) ir(alvo);
      focarNovo(dinheiro);
    }
    pintarDinheiro();
    cap('dinheiro', 'O dinheiro', `Salário-base de quem foi contratado com carteira nos últimos 12 meses, na ocupação mais próxima de cada ${umaArea()}. Adicionais, PJ e bônus não entram.`,
      dinheiro);

    // 03. Antes de escolher: a introdução, os cem quadradinhos, o palpite de um número em reais (a bolsa de residência) e o contexto
    cap('antes', 'Antes de escolher', null,
      el('div', { class: 'prof-antes' + (cem ? '' : ' prof-antes--so-texto') }, el('p', { class: 'prof-prosa prof-prosa--grande', text: t.intro }), cem ? cemQuadrados(t, cem) : null),
      reais.length ? el('div', { class: 'prof-rel-espaco prof-pilha-caixas' }, reais.map(r => palpiteNumero(t, r.n, respondeuNumero(r)))) : null,
      el('div', { class: 'prof-rel-espaco' }, calloutsNumerados(t, t.contexto, 'prof-callouts--fatos')));

    // 04. Que curso fazer
    cap('formacao', 'Que curso fazer', t.formacao_geral.nota, blocoCursos(t, reaisAbertos()));

    // 05. O jogo
    cap('jogo', t.jogo.titulo, t.jogo.subtitulo,
      el('div', { class: 'prof-caixa prof-jogo-convite' },
        el('ul', { class: 'prof-jogo-fatos', 'aria-label': 'Como é o jogo' },
          el('li', null, el('b', { class: 'prof-num', text: String(t.jogo.cenas.length) }), 'situações'),
          el('li', null, el('b', { class: 'prof-num', text: String(Math.max(...t.jogo.cenas.map(c => c.opcoes.length))) }), 'escolhas em cada'),
          el('li', null, el('b', { class: 'prof-num', text: '3' }), rot('rotulo_areas', 'áreas') + ' no fim')),
        rank ? el('div', null, el('p', { class: 'prof-min', text: 'Seu último resultado:' }),
          el('div', { class: 'prof-chips prof-espaco-p' }, rank.slice(0, 3).map(x => link(`${nomeCurto(x.area)} · ${x.pct}%`, ID + '-' + x.area.id, { classe: 'prof-chip prof-chip--link' })))) : null,
        linkJogo(rank, rank ? 'prof-btn--linha' : 'prof-btn--primario')));

    // 06. Comece a estudar
    if (ponte()) cap('estudar', 'Comece a estudar', null,
      el('div', { class: 'prof-caixa prof-ponte' }, el('p', { class: 'prof-prosa', text: ponte().texto }),
        el('div', { class: 'prof-espaco' }, botao(ponte().abrir, { classe: 'prof-btn--linha', icone: 'livro', iconeDepois: 'direita', onclick: () => estudar(ponte().entrada) }))));

    cap('fontes', 'Fontes', `Conferidas em ${dataBR(t.conferido_em)}. Toque no pontinho depois de uma informação para ver de onde ela vem, ou em "Mostrar as fontes", no topo, para ver todas.`,
      ...fontesGuardadas(t, t.fontes, `Ver as ${t.fontes.length} fontes deste panorama`), linhaRevisao(t));

    indiceCapitulos(corpo, 'Capítulos do panorama');
  }

  /* As especialidades lado a lado: apelido, perfil em barrinhas, salário ("R$ ?" até o palpite); os botões reordenam pelo que importa.
     "Maior salário" fica com cadeado até o dinheiro de todas abrir. Devolve { el, redesenhar }. */
  const NOME_EIXO = { pessoas: 'Pessoas', pressao: 'Pressão', corpo: 'Esforço físico', rotina: 'Rotina', numeros: 'Números', criatividade: 'Criatividade' };
  function explorador(t, rank) {
    const ordens = [
      { id: 'diver', nome: 'Todas' },
      rank ? { id: 'afinidade', nome: 'Mais parecidas comigo' } : null,
      { id: 'pessoas', nome: 'Mais contato com pessoas', eixo: 'pessoas' },
      { id: 'pressao', nome: 'Mais pressão e adrenalina', eixo: 'pressao' },
      { id: 'rotina', nome: 'Mais rotina', eixo: 'rotina' },
      { id: 'corpo', nome: 'Mais esforço físico', eixo: 'corpo' },
      { id: 'numeros', nome: 'Mais números', eixo: 'numeros' },
      { id: 'criatividade', nome: 'Mais criatividade', eixo: 'criatividade' },
      { id: 'salario', nome: 'Maior salário' }].filter(Boolean);
    let atual = ordens[0];
    const grade = el('div', { class: 'prof-esps' });
    const aviso = el('p', { class: 'prof-micro prof-ordens-aviso', 'aria-live': 'polite' });
    const botoes = ordens.map(o => el('button', { type: 'button', class: 'prof-chip', 'aria-pressed': String(o === atual), text: o.nome, onclick: () => {
      if (o.id === 'salario' && !todasAbertas()) {
        aviso.textContent = '';
        aviso.append('A ordem por salário abre depois do "Quem ganha mais?", no capítulo "O dinheiro". ', el('button', { type: 'button', class: 'prof-link-botao', text: 'Ir para o jogo', onclick: () => ir(document.getElementById('sec-dinheiro')) }));
        return;
      }
      atual = o; desenhar();
    } }));
    const chipSalario = botoes[ordens.findIndex(o => o.id === 'salario')];
    const refs = t.areas.filter(ehReferencia);
    const fontesSal = uniq(t.areas.flatMap(a => (salarioPrincipal(a) || {}).fontes || []));
    const nota = el('p', { class: 'prof-fonte-nota' });
    function desenhar() {
      aviso.textContent = '';
      chipSalario.textContent = '';
      chipSalario.append(todasAbertas() ? '' : icone('cadeado'), 'Maior salário');
      nota.textContent = '';
      nota.append('Perfil: estimativa inicial, a calibrar com profissionais. Salário: média de contratação com carteira no Novo Caged, ',
        todasAbertas() ? 'comparada no capítulo "O dinheiro"' : `"R$ ?" até o seu palpite, na página de cada ${umaArea()}, ou até o "Quem ganha mais?", no capítulo "O dinheiro"`,
        refs.length ? ' ("referência" quando é o de uma ocupação próxima)' : '', '.', citar(t, fontesSal));
      botoes.forEach((b, i) => b.setAttribute('aria-pressed', String(ordens[i] === atual)));
      const afin = id => (rank ? (rank.find(r => r.area.id === id) || {}).pct || 0 : 0);
      const lista = t.areas.slice();
      if (atual.eixo) lista.sort((x, y) => (y.dna[atual.eixo] || 0) - (x.dna[atual.eixo] || 0));
      else if (atual.id === 'salario') lista.sort((x, y) => (ehReferencia(x) - ehReferencia(y)) || (salarioPrincipal(y).media - salarioPrincipal(x).media));
      else if (atual.id === 'afinidade') lista.sort((x, y) => afin(y.id) - afin(x.id));
      // as três barrinhas: pessoas, pressão e rotina; com uma ordem por eixo, ele vem primeiro e aceso
      const eixos = atual.eixo ? [atual.eixo, ...['pessoas', 'pressao', 'rotina'].filter(e => e !== atual.eixo)].slice(0, 3) : ['pessoas', 'pressao', 'rotina'];
      grade.textContent = '';
      lista.forEach((a, i) => grade.appendChild(cartaoEsp(t, a, { eixos, aceso: atual.eixo, salario: atual.id === 'salario', posicao: atual.id === 'diver' ? null : i + 1, afin: rank ? afin(a.id) : null })));
    }
    desenhar();
    return {
      el: el('div', null,
        el('div', { class: 'prof-chips prof-ordens', role: 'group', 'aria-label': 'Ordenar pelo que importa para você' }, el('span', { class: 'prof-micro', text: 'O que importa para você?' }), botoes),
        aviso, grade, nota),
      redesenhar: desenhar };
  }
  function cartaoEsp(t, a, o) {
    const s = salarioPrincipal(a), vista = est().areasVistas[a.id];
    return el('a', { href: '#' + ID + '-' + a.id, class: 'prof-esp' + (o.salario ? ' prof-esp--salario' : '') },
      el('div', { class: 'prof-esp-cab' },
        el('span', { class: 'prof-esp-apelido', text: a.apelido }),
        o.posicao ? el('span', { class: 'prof-esp-pos prof-num', text: o.posicao + 'º' }) : null),
      el('h3', { text: a.nome }),
      el('p', { class: 'prof-esp-resumo', text: a.resumo }),
      el('div', { class: 'prof-esp-perfil' }, o.eixos.map(e => el('div', { class: 'prof-esp-eixo' + (e === o.aceso ? ' prof-esp-eixo--aceso' : ''), role: 'img', 'aria-label': `${NOME_EIXO[e]}: ${a.dna[e]} de 100` },
        el('span', { class: 'prof-micro', text: NOME_EIXO[e] }), el('span', { class: 'prof-esp-barra' }, el('i', { style: { '--fracao': (a.dna[e] || 0) / 100 } }))))),
      el('div', { class: 'prof-esp-pe' },
        !s ? el('span') : aberta(a) ? salarioAberto(a) : salarioFechado(),
        vista ? el('span', { class: 'prof-esp-vista' }, icone('certo'), 'Explorada') : o.afin != null ? el('span', { class: 'prof-esp-afin prof-num', text: o.afin + '% com você' }) : el('span', { class: 'prof-esp-ir', 'aria-hidden': 'true' }, icone('direita'))));
  }

  /** O dinheiro lado a lado: cada especialidade (ou área) com ocupação própria no Caged, na mesma régua (a faixa comum e a média),
      da maior para a menor média. Na página de uma delas, ela fica acesa e as outras em cinza (ênfase, sem arco-íris).
      As que usam o salário de uma ocupação próxima ("referência") ficam fora, com o nome delas embaixo. */
  function comparaSalarios(t, destaque) {
    const itens = t.areas.filter(a => salarioPrincipal(a) && !ehReferencia(a))
      .map(a => { const s = salarioPrincipal(a); return { a, s, media: s.media, faixa: { de: s.p25, ate: s.p75 } }; })
      .sort((x, y) => y.media - x.media);
    if (!itens.length) return null;
    const refs = t.areas.filter(ehReferencia), dominio = dominioDe(itens), notaPan = rot('nota_salarios', '');
    return el('figure', { class: 'prof-salareas' + (destaque ? ' prof-salareas--destaque' : '') },
      el('figcaption', null,
        el('b', { text: destaque ? `${nomeCurto(destaque)} e as outras ${rot('rotulo_areas', 'áreas')}` : `A média de cada ${umaArea()}` }),
        el('span', { class: 'prof-micro', text: 'Da maior para a menor média, todas na mesma régua.' })),
      // Cada linha inteira abre a especialidade (alvo grande no toque); a da página atual não é link
      el('ol', null, itens.map(it => {
        const eu = it.a === destaque;
        const linha = [
          el('span', { class: 'prof-salareas-nome' }, el('b', { text: nomeCurto(it.a) }), el('span', { class: 'prof-micro', text: it.s.cargo })),
          regua({ dominio, media: it.media, faixa: it.faixa, fina: true }),
          el('b', { class: 'prof-salareas-valor prof-num', text: brl(it.media) })];
        return el('li', { class: eu ? 'prof-salareas-eu' : null, 'aria-current': eu ? 'true' : null },
          eu ? el('div', { class: 'prof-salareas-linha' }, linha)
            : el('a', { href: '#' + ID + '-' + it.a.id, class: 'prof-salareas-linha', 'aria-label': `${nomeCurto(it.a)}: média de ${brl(it.media)}, faixa comum de ${brl(it.faixa.de)} a ${brl(it.faixa.ate)}. Ver por dentro` }, linha));
      })),
      el('div', { class: 'prof-regua-legenda' }, el('span', null, el('i', { class: 'prof-legenda-faixa', 'aria-hidden': 'true' }), 'faixa comum (percentis 25 e 75)'), el('span', null, el('i', { class: 'prof-legenda-media', 'aria-hidden': 'true' }), 'a média')),
      notaPan || refs.length ? el('p', { class: 'prof-fonte-nota' }, notaPan,
        refs.length ? `${notaPan ? ' ' : ''}${refs.length > 1 ? 'Ficam fora da comparação as que usam' : 'Fica fora da comparação a que usa'} o salário de uma ocupação próxima como referência: ${juntar(refs.map(nomeCurto))}.` : '') : null,
      fonteLinha(t, uniq(itens.flatMap(it => it.s.fontes || [])), 'Novo Caged (Ministério do Trabalho e Emprego), via Portal Salário'));
  }

  /** "De cada 100": o número e a frase em cima, cem quadradinhos com os da parte acesos (uma cor só, o resto em cinza) e a fonte embaixo. */
  function cemQuadrados(t, n) {
    const acesos = Math.round(porcento(n.valor));
    return el('figure', { class: 'prof-cem' },
      el('figcaption', null,
        el('b', { class: 'prof-cem-v prof-num', text: n.valor }),
        el('span', { class: 'prof-cem-rot', text: n.rotulo }),
        n.detalhe ? el('span', { class: 'prof-micro', text: n.detalhe }) : null),
      el('div', { class: 'prof-cem-grade', 'aria-hidden': 'true' }, Array.from({ length: 100 }, (_, i) => el('i', { class: i < acesos ? 'prof-cem-sim' : null }))),
      el('p', { class: 'prof-micro', text: `Cada quadradinho é 1 em 100; ${acesos} estão acesos.` }),
      fonteLinha(t, n.fontes));
  }

  /** Que curso fazer: um curso (ou etapa) por linha, as durações na mesma régua de anos. O que não se mede em anos (uma prova) fica sem barra.
      Um valor em reais no texto espera o palpite (dinheiroVisto false: "R$ ?"). */
  function blocoCursos(t, dinheiroVisto) {
    const cursos = t.formacao_geral.cursos;
    const anos = c => (String(c.duracao).match(/\d+(?:,\d+)?/g) || []).map(x => Number(x.replace(',', '.')));
    const max = Math.max(1, ...cursos.flatMap(anos));
    return el('figure', { class: 'prof-cursos-fig' },
      el('figcaption', null, el('b', { text: 'Quanto tempo leva cada etapa' }), el('span', { class: 'prof-micro', text: 'Em anos, todas na mesma régua. A parte listrada é o que varia de um caminho para outro.' })),
      el('ol', { class: 'prof-cursos' }, cursos.map(c => {
        const a = anos(c), de = a.length ? Math.min(...a) : 0, ate = a.length ? Math.max(...a) : 0;
        return el('li', { class: 'prof-curso' },
          el('div', { class: 'prof-curso-rot' }, el('b', { text: c.nome }), el('span', { class: 'prof-selo', text: c.nivel })),
          el('div', { class: 'prof-curso-linha' },
            a.length ? el('span', { class: 'prof-curso-trilho', 'aria-hidden': 'true' },
              el('i', { style: { '--fracao': de / max } }),
              ate > de ? el('i', { class: 'prof-curso-faixa', style: { '--de': de / max, '--fracao': (ate - de) / max } }) : null) : null,
            el('span', { class: 'prof-num prof-curso-duracao' + (a.length ? '' : ' prof-curso-duracao--texto'), text: c.duracao })),
          el('p', { class: 'prof-min prof-curso-txt' }, semReais(c.texto, dinheiroVisto), c.horas ? ' ' : null, c.horas ? el('span', { class: 'prof-num', text: `Mínimo de ${c.horas.toLocaleString('pt-BR')} horas.` }) : null, citar(t, c.fontes)));
      })),
      fonteLinha(t, uniq(cursos.flatMap(c => c.fontes || []))));
  }

  /* =====================================================================
     Uma especialidade (ou área), no formato de relatório: a faixa para trocar, a capa com "Em números"
     e os capítulos (o trabalho, o dinheiro com a comparação, a formação, o perfil, o que ninguém conta, as vizinhas)
     ===================================================================== */
  function telaArea(raiz, t, a, ix) {
    est().areasVistas[a.id] = (est().areasVistas[a.id] || 0) + 1; salvarEstado();
    P.ganchos.registrar(evento('area_vista'), { area: a.id });
    raiz.style.setProperty('--cor-area', corPan(ix));
    const s = salarioPrincipal(a), k = t.areas.indexOf(a);
    const j = est().jogo; const afin = j ? ranking(t, j.pontos).find(r => r.area.id === a.id) : null;

    raiz.appendChild(topoPagina({ texto: t.titulo, rota: 'profissoes-' + ID }, selo('Rotina típica, em revisão com profissionais')));
    // Todas as especialidades à mão: trocar é um toque
    const troca = el('nav', { class: 'prof-troca', 'aria-label': `Todas as ${rot('rotulo_areas', 'áreas')}` }, t.areas.map(x =>
      el('a', { href: '#' + ID + '-' + x.id, class: 'prof-troca-item', 'aria-current': x.id === a.id ? 'page' : null }, nomeCurto(x))));
    raiz.appendChild(troca);
    // A faixa rola de lado; a especialidade da vez aparece no meio (sem mexer na rolagem da página)
    requestAnimationFrame(() => { const atual = troca.querySelector('[aria-current]'); if (atual) troca.scrollLeft = atual.offsetLeft - (troca.clientWidth - atual.offsetWidth) / 2; });
    // O salário fica para o palpite (capítulo "O dinheiro"); aqui só o convite e, depois dele, a média e a faixa comum
    const linhaSal = el('div', { class: 'prof-emnum-linha prof-emnum-linha--salario' }), linhaFaixa = el('div', { class: 'prof-emnum-linha' });
    const pintarCapa = () => {
      const visto = aberta(a);
      linhaSal.textContent = ''; linhaFaixa.textContent = ''; linhaFaixa.hidden = !visto;
      linhaSal.append(el('dt', { text: !visto ? 'Quanto ganha?' : ehReferencia(a) ? 'Média de contratação (referência)' : 'Média de contratação' }),
        el('dd', null, visto ? el('b', { class: 'prof-emnum-salario', text: brl(s.media) }) : botaoPalpite('palpite-' + a.id),
          el('span', { class: 'prof-micro' }, visto ? `${s.cargo}, CBO ${s.cbo}` : 'Antes do número, arraste a régua até o seu palpite.', visto ? citar(t, s.fontes) : null)));
      if (visto) linhaFaixa.append(el('dt', { text: 'Faixa comum' }), el('dd', null, el('b', { text: `${brl(s.p25)} a ${brl(s.p75)}` }), el('span', { class: 'prof-micro', text: 'onde fica a maior parte dos contratos' })));
    };
    if (s) pintarCapa();
    raiz.appendChild(capaRelatorio({
      rotulo: a.apelido, titulo: a.nome, frase: a.resumo,
      meta: [`${maiuscula(umaArea())} ${k + 1} de ${t.areas.length}`, t.titulo, 'Mapa das Profissões do Diver'], fontes: botaoFontes(),
      acoes: [j ? botaoEstudar('prof-btn--primario') : link((t.jogo && t.jogo.chamada_curta) || 'Que área é a minha?', 'profissoes-' + ID + '-jogo', { classe: 'prof-btn prof-btn--primario', icone: 'play' }),
        j ? link('Refazer o jogo', 'profissoes-' + ID + '-jogo', { classe: 'prof-btn prof-btn--linha', icone: 'embaralhar' }) : botaoEstudar('prof-btn--linha')],
      numeros: s ? [linhaSal, linhaFaixa,
        linhaEmNumeros('Sua afinidade', afin ? afin.pct + '%' : '—', afin ? 'pelo jogo' : 'jogue para descobrir')] : [] }));

    const corpo = el('div', { class: 'prof-corpo' });
    raiz.appendChild(corpo);
    let n = 0;
    const cap = (id, titulo, sub, ...conteudo) => corpo.appendChild(capituloRelatorio(t, ++n, id, titulo, null, sub, ...conteudo));

    // 01. O trabalho: o que faz; o dia típico ao lado de com quem combina e de quem deve pensar duas vezes; as ferramentas
    const agora = new Date(); const minutos = agora.getHours() * 60 + agora.getMinutes();
    const emMin = hh => { const [x, y] = String(hh).split(':').map(Number); return x * 60 + (y || 0); };
    let atual = -1; a.dia.forEach((d, i) => { if (emMin(d.hora) <= minutos) atual = i; });
    if (atual === a.dia.length - 1 && minutos > emMin(a.dia[atual].hora) + 120) atual = -1;
    cap('trabalho', 'O trabalho', `Rotina ilustrativa de um dia comum, a revisar com profissionais da ${umaArea()}. ${(ponte() && ponte().lugar) || 'Cada lugar de trabalho é diferente.'}`,
      el('p', { class: 'prof-prosa prof-prosa--grande', text: a.o_que_faz }),
      el('div', { class: 'prof-grade-2 prof-rel-espaco' },
        el('figure', { class: 'prof-dia-fig' },
          el('figcaption', null, el('b', { text: 'Um dia típico' }), atual >= 0 ? el('span', { class: 'prof-micro', text: 'Em amarelo, a hora de agora no seu aparelho.' }) : null),
          el('ol', { class: 'prof-dia' }, a.dia.map((d, i) => el('li', { class: i === atual ? 'prof-dia--agora' : null },
            el('span', { class: 'prof-dia-hora prof-num', text: d.hora }),
            el('span', null, d.texto, i === atual ? el('span', { class: 'prof-dia-tag', text: 'agora' }) : null))))),
        el('div', { class: 'prof-pilha-caixas' },
          el('div', { class: 'prof-versus-card prof-versus-card--sim' }, el('p', { class: 'prof-versus-tit' }, icone('certo'), 'Combina com quem gosta de'), el('ul', { class: 'prof-lista' }, a.gosta_de.map(g => el('li', { text: g })))),
          el('div', { class: 'prof-versus-card prof-versus-card--nao' }, el('p', { class: 'prof-versus-tit' }, icone('x'), 'Pense duas vezes se'), el('ul', { class: 'prof-lista' }, a.nao_gosta_se.map(g => el('li', { text: g })))))),
      el('div', { class: 'prof-rel-espaco' },
        el('h3', { class: 'prof-sub', text: 'Ferramentas do dia a dia' }),
        el('div', { class: 'prof-chips-lista' }, a.ferramentas.map(f => el('span', { text: f }))),
        a.ferramentas_fontes && a.ferramentas_fontes.length ? fonteLinha(t, a.ferramentas_fontes) : null));

    // 02. O dinheiro: o palpite (a régua da ficha); depois dele, cada cargo na mesma régua e a especialidade entre as outras
    // (essa comparação mostra o salário de todas: abre depois do "Quem ganha mais?", como no panorama)
    const detalhes = el('div', { class: 'prof-salario-detalhes' });
    function pintarDetalhes() {
      detalhes.textContent = '';
      if (!aberta(a)) return;
      if (a.salarios.length > 1) detalhes.append(el('h3', { class: 'prof-sub', text: 'Todos os cargos' }),
        linhasCargos(a.salarios.map(sx => ({ cargo: sx.cargo, sub: 'CBO ' + sx.cbo, media: sx.media, faixa: { de: sx.p25, ate: sx.p75 }, fontes: sx.fontes, nota: sx.nota })), it => citar(t, it.fontes)),
        el('div', { class: 'prof-regua-legenda' }, el('span', null, el('i', { class: 'prof-legenda-faixa', 'aria-hidden': 'true' }), 'faixa comum (percentis 25 e 75)'), el('span', null, el('i', { class: 'prof-legenda-media', 'aria-hidden': 'true' }), 'a média')));
      else if (s.nota) detalhes.appendChild(el('p', { class: 'prof-fonte-nota', text: s.nota }));
      detalhes.appendChild(ehReferencia(a)
        ? el('p', { class: 'prof-fonte-nota' }, `Como o salário aqui é o de uma ocupação próxima, esta ${umaArea()} não entra na comparação entre as ${rot('rotulo_areas', 'áreas')}, no capítulo "O dinheiro" do `, link('panorama', 'profissoes-' + ID), '.')
        : el('div', { class: 'prof-rel-espaco' }, el('h3', { class: 'prof-sub', text: `E entre as outras ${rot('rotulo_areas', 'áreas')}?` }),
          dinheiroDeTodas(t, a, () => { pintarDetalhes(); revelarReais(raiz); focarNovo(detalhes); })));
    }
    if (s) pintarDetalhes();
    if (s) cap('dinheiro', 'O dinheiro', 'Salário-base de quem foi contratado com carteira nos últimos 12 meses. Adicionais, PJ e bônus não entram.',
      el('div', { class: 'prof-salario' }, palpiteArea(t, a, () => { pintarCapa(); pintarDetalhes(); revelarReais(raiz); }), detalhes));

    // 03. Formação e carreira, lado a lado
    cap('formacao', 'Formação e carreira', null,
      el('div', { class: 'prof-grade-2' },
        el('div', { class: 'prof-caixa' }, el('h3', { text: 'Formação' }), el('p', { class: 'prof-prosa' }, a.formacao, citar(t, a.formacao_fontes)),
          ponte() ? el('p', { class: 'prof-min prof-espaco', text: `Para começar no Diver, ${ponte().onde}:` }) : null,
          ponte() ? el('div', { class: 'prof-chips-lista' }, cursosDe(a).map(c => el('a', { href: '#', onclick: ev => { ev.preventDefault(); estudar(c); } }, icone('livro'), c === ponte().entrada ? ponte().nomeEntrada : P.ganchos.nomeCurso(c)))) : null,
          el('p', { class: 'prof-micro prof-espaco' }, 'As durações e cargas dos cursos estão no ', link('panorama', 'profissoes-' + ID), '.')),
        el('div', { class: 'prof-caixa' }, el('h3', { text: 'Como a carreira costuma andar' }), el('p', { class: 'prof-micro', text: 'Nomes e prazos variam.' }),
          el('ol', { class: 'prof-escada' }, a.caminhos.map(c => el('li', { text: c }))))));

    // 04. Combina com você? O radar do perfil (o seu DNA é ajustado em qualquer ficha)
    const prof = EIXOS.map(([x]) => a.dna[x] ?? 50); const e = P.estado(); if (!e.dna) e.dna = EIXOS.map(() => 50);
    const afDna = Math.round(100 - prof.reduce((tt, p, i) => tt + Math.abs(p - e.dna[i]), 0) / prof.length);
    const fichaDna = ix.profissoes.find(p => temFicha(p) && p.arquivo);
    cap('dna', 'Combina com você?', `Turquesa: a ${umaArea()}. Amarelo tracejado: o seu perfil, ajustado em qualquer ficha. Estimativa inicial, a calibrar com profissionais.`,
      el('div', { class: 'prof-caixa prof-dna' },
        el('div', null, el('div', { class: 'prof-dna-grafico' }, IG().radar({ eixos: EIXOS.map(x => x[1]), series: [{ nome: a.nome, valores: prof, classe: 'profissao' }, { nome: 'Você', valores: e.dna, classe: 'voce' }] })),
          el('div', { class: 'prof-legenda' }, el('span', null, el('i', { style: { '--cor': 'var(--turquesa)' } }), a.nome), el('span', null, el('i', { class: 'prof-legenda--tracejado', style: { '--cor': 'var(--amarelo)' } }), 'Você'))),
        el('div', null,
          el('div', { class: 'prof-afinidade ' + (afDna >= 70 ? 'prof-afinidade--alta' : afDna >= 50 ? 'prof-afinidade--media' : 'prof-afinidade--baixa') }, el('span', { class: 'prof-min', text: 'Afinidade pelo perfil' }), el('b', { class: 'prof-num', text: afDna + '%' })),
          el('p', { class: 'prof-min', text: 'O jogo mede afinidade por decisões; o perfil mede por jeito de ser. Os dois juntos dizem mais que cada um sozinho.' }),
          fichaDna ? el('div', { class: 'prof-espaco' }, link('Ajustar meu perfil na ficha de ' + fichaDna.nome, 'profissao-' + fichaDna.id, { classe: 'prof-btn prof-btn--linha prof-btn--pequeno' })) : null)));

    // 05. O que ninguém te conta: tudo à vista, numerado (como na ficha)
    cap('ninguem', 'O que ninguém te conta', 'Os pontos difíceis, sem rodeio.', calloutsNumerados(t, a.ninguem_conta.map(it => ({ ...it, texto: semReais(it.texto, aberta(a)) }))));

    // 06. Vizinhas
    cap('vizinhas', rot('rotulo_vizinhas', 'Áreas vizinhas'), 'Para quem está em dúvida entre duas.', el('div', { class: 'prof-cards prof-cards--linhas' }, a.vizinhas.map(id => {
      const v = t.areas.find(x => x.id === id);
      return v ? el('a', { href: '#' + ID + '-' + v.id, class: 'prof-caixa prof-vizinha' }, el('span', { class: 'prof-esp-apelido', text: v.apelido }), el('h3', null, v.nome, icone('direita')), el('p', { text: v.resumo })) : null;
    })));

    // Fontes: só as citadas nesta área (a numeração é a do panorama)
    const ids = new Set(); JSON.stringify(a, (x, v) => { if ((x === 'fontes' || x.endsWith('_fontes')) && Array.isArray(v)) v.forEach(id => ids.add(id)); return v; });
    const lista = t.fontes.filter(fo => ids.has(fo.id));
    cap('fontes', 'Fontes', `Conferidas em ${dataBR(t.conferido_em)}. Só as fontes citadas nesta ${umaArea()}; a numeração é a do panorama.`,
      ...fontesGuardadas(t, lista, lista.length === 1 ? 'Ver a fonte desta ' + umaArea() : `Ver as ${lista.length} fontes desta ${umaArea()}`), linhaRevisao(t));

    // Anterior e próxima
    const ant = t.areas[(k + t.areas.length - 1) % t.areas.length], prox = t.areas[(k + 1) % t.areas.length];
    corpo.appendChild(el('nav', { class: 'prof-areas-nav', 'aria-label': 'Outras ' + rot('rotulo_areas', 'áreas') },
      link(nomeCurto(ant), ID + '-' + ant.id, { classe: 'prof-btn prof-btn--linha prof-btn--pequeno', icone: 'esquerda' }),
      el('span', { class: 'prof-micro prof-num', text: `${maiuscula(umaArea())} ${k + 1} de ${t.areas.length}` }),
      link(nomeCurto(prox), ID + '-' + prox.id, { classe: 'prof-btn prof-btn--linha prof-btn--pequeno', iconeDepois: 'direita' })));

    indiceCapitulos(corpo, 'Capítulos da ' + umaArea());
  }

  /* =====================================================================
     Jogo de afinidade ("Que área da tecnologia é a sua praia?", "Que especialidade médica é a sua?")
     ===================================================================== */
  function maximos(t) { const m = {}; t.areas.forEach(a => m[a.id] = 0); t.jogo.cenas.forEach(c => { const best = {}; c.opcoes.forEach(o => Object.entries(o.pontos).forEach(([k, v]) => best[k] = Math.max(best[k] || 0, v))); Object.entries(best).forEach(([k, v]) => m[k] += v); }); return m; }
  function ranking(t, pontos) { const m = maximos(t); return t.areas.map(a => ({ area: a, pts: pontos[a.id] || 0, pct: Math.round((pontos[a.id] || 0) / (m[a.id] || 1) * 100) })).sort((x, y) => y.pct - x.pct); }

  function telaJogo(raiz, t, ix) {
    const J = t.jogo; let i = 0; const pontos = {}; const escolhas = [];
    let tecla = null;
    const soltarTecla = () => { if (tecla) { document.removeEventListener('keydown', tecla); tecla = null; } };
    limpezas.push(soltarTecla);
    P.ganchos.registrar(evento('jogo_inicio'), {});
    raiz.classList.add('prof-raiz--estreita');
    raiz.style.setProperty('--cor-area', corPan(ix));
    raiz.appendChild(topoPagina({ texto: t.titulo, rota: 'profissoes-' + ID }));
    raiz.appendChild(el('header', { class: 'prof-jogo-cab' },
      el('span', { class: 'prof-rotulo prof-rotulo--area', text: rot('rotulo', 'Panorama') }),
      el('h1', { text: J.titulo }),
      el('p', { class: 'prof-lead', text: J.subtitulo })));
    const progresso = el('div', { class: 'prof-progresso', 'aria-hidden': 'true' }, J.cenas.map(() => el('i')));
    const palco = el('div', { class: 'prof-jogo-palco' }); raiz.append(progresso, palco);

    function cena(volta) {
      soltarTecla();
      progresso.querySelectorAll('i').forEach((p, k) => p.className = k < i ? 'feita' : k === i ? 'atual' : '');
      const c = J.cenas[i]; palco.textContent = '';
      const titulo = el('h2', { text: c.texto, tabindex: '-1' });
      const ops = el('div', { class: 'prof-opcoes' });
      const card = el('div', { class: 'prof-cena' },
        el('div', { class: 'prof-hora', text: `Situação ${i + 1} de ${J.cenas.length}` }), titulo, ops,
        el('div', { class: 'prof-jogo-pe' },
          i > 0 ? botao('Voltar', { classe: 'prof-btn--linha prof-btn--pequeno', icone: 'esquerda', onclick: voltar }) : el('span'),
          el('span', { class: 'prof-micro prof-so-teclado', text: `Teclas 1 a ${c.opcoes.length}` })));
      c.opcoes.forEach((o, k) => ops.appendChild(el('button', { type: 'button', class: 'prof-opcao', onclick: e => escolher(k, e.currentTarget) }, el('kbd', { text: String(k + 1) }), o.texto)));
      palco.appendChild(card);
      if (i > 0 || volta) titulo.focus({ preventScroll: true });
      let feita = false;
      function escolher(k, botaoEl) {
        if (feita) return; feita = true; soltarTecla();
        const o = c.opcoes[k]; Object.entries(o.pontos).forEach(([ar, v]) => pontos[ar] = (pontos[ar] || 0) + v); escolhas.push(o.pontos);
        const b = botaoEl || ops.children[k]; if (b) b.setAttribute('aria-pressed', 'true');
        setTimeout(() => { i++; i < J.cenas.length ? cena() : fim(); }, semMovimento() ? 0 : 220);
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
      if (primeira) { e.jogoConcluido = true; P.ganchos.recompensar({ tipo: evento('jogo'), xp: J.resultado.recompensa.xp, perolas: J.resultado.recompensa.perolas, profissao: ID }); }
      salvarEstado(); P.ganchos.registrar(evento('jogo_concluido'), { top: top.map(x => x.area.id), pct: top.map(x => x.pct) });
      palco.textContent = '';
      const titulo = el('h2', { class: 'prof-jogo-fim', text: J.titulo_resultado || `Suas três ${rot('rotulo_areas', 'áreas')}`, tabindex: '-1' });
      palco.appendChild(titulo);
      palco.appendChild(el('p', { class: 'prof-min prof-jogo-aviso', text: J.aviso }));
      const contas = [];
      palco.appendChild(el('div', { class: 'prof-cards prof-cards--resultado' }, top.map((x, k) => {
        const s = salarioPrincipal(x.area);
        const pct = el('b', { class: 'prof-num prof-resultado-pct', text: x.pct + '%' }); contas.push([pct, x.pct + '%']);
        return el('div', { class: 'prof-caixa prof-resultado' + (k === 0 ? ' prof-resultado--topo' : '') },
          el('div', { class: 'prof-resultado-cab' }, el('span', { class: 'prof-rotulo', text: k === 0 ? 'Mais parecida' : k === 1 ? 'Segunda' : 'Terceira' }), pct),
          el('span', { class: 'prof-esp-apelido', text: x.area.apelido }),
          el('h3', { text: x.area.nome }),
          el('p', { text: `${x.area.nome} ${x.pct >= 60 ? J.resultado.texto_alto : x.pct >= 35 ? J.resultado.texto_medio : J.resultado.texto_baixo}` }),
          el('p', { class: 'prof-min prof-espaco-p', text: 'Combina com quem gosta de: ' + x.area.gosta_de.slice(0, 2).join('; ').toLowerCase() + '.' }),
          el('div', { class: 'prof-area-rodape' }, !s ? el('span') : aberta(x.area) ? salarioAberto(x.area) : salarioFechado(),
            link('Ver por dentro', ID + '-' + x.area.id, { classe: 'prof-btn prof-btn--pequeno ' + (k === 0 ? 'prof-btn--primario' : 'prof-btn--linha'), iconeDepois: 'direita' })));
      })));
      palco.appendChild(el('div', { class: 'prof-caixa prof-espaco' }, el('h3', { text: 'As outras ' + extenso(resto.length) }), el('div', { class: 'prof-mini-barras' }, resto.map(x => el('a', { href: '#' + ID + '-' + x.area.id, class: 'prof-mini-barra' }, el('span', { text: x.area.nome }), el('i', { 'aria-hidden': 'true' }, el('b', { style: { '--fracao': x.pct / 100 } })), el('span', { class: 'prof-num', text: x.pct + '%' }))))));
      palco.appendChild(el('div', { class: 'prof-jogo-acoes' },
        primeira ? el('p', { class: 'prof-recompensa', text: `+${J.resultado.recompensa.xp} XP · +${J.resultado.recompensa.perolas} pérolas` }) : null,
        botao('Jogar de novo', { classe: 'prof-btn--linha', icone: 'embaralhar', onclick: () => { i = 0; Object.keys(pontos).forEach(k => delete pontos[k]); escolhas.length = 0; cena(true); } }),
        link('Ver o panorama', 'profissoes-' + ID, { classe: 'prof-btn prof-btn--linha' }),
        botaoEstudar('prof-btn--linha')));
      contas.forEach(([alvo, texto]) => contar(alvo, texto));
      titulo.focus({ preventScroll: true });
      ir(raiz.querySelector('.prof-jogo-cab'));
    }
    cena();
  }
})();

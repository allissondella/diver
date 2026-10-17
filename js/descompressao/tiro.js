/*
 * Tiro ao Alvo (Sala de Descompressão) — pistola d'água em primeira pessoa, por níveis.
 * - Cada nível tem uma REGRA ("Só os peixes", "Números primos", "Peixes OU frutas", "Tudo MENOS aves"...) e uma
 *   leva de placas. Acertou todas as placas certas da leva? Sobe de nível (e a regra muda).
 * - Acertou uma placa errada: eliminação na hora. Deixou uma placa certa escapar: eliminação na hora também.
 * - 1 ponto por acerto. Vale o recorde no placar da sala.
 * - Dificuldade: o nível 1 é de aquecimento; do 2 em diante as placas somem mais rápido, ficam menores, deslizam
 *   (e balançam a partir do 3), aparecem várias ao mesmo tempo e a leva cresce 5 placas certas por nível.
 *   Do nível 4 em diante podem vir regras em dupla ("A OU B"); do 5 em diante, "Tudo MENOS ...".
 * Desenho todo no <canvas> (nada de imagem de fora): uma barraca de tiro na beira do mar ao pôr do sol (2026-10-17),
 * com as placas em três trilhos (fundo, meio e frente). As placas de um trilho andam juntas, então nunca uma
 * passa por cima da outra. Com "reduzir movimento", as placas não sobem, não deslizam nem pulam e não há respingos
 * (o jogo continua acelerando pelo tempo de cada placa).
 */
(() => {
  const { h, icone, plural } = UI;
  // Cores do canvas vêm dos tokens do css/tokens.css (UI.cor)
  const COR = { turquesa: UI.cor('primaria'), claro: UI.cor('primaria-clara'), amarelo: UI.cor('destaque'), coral: UI.cor('erro'), texto: UI.cor('texto-1'), suave: UI.cor('texto-2'), fundo: UI.cor('fundo-0'), marinho: UI.cor('fundo-1'), sup: UI.cor('superficie-1'), sup2: UI.cor('superficie-2'), escuro: UI.cor('texto-inverso'),
    sup3: UI.cor('superficie-3'), turquesaEscura: UI.cor('primaria-escura'), turquesaSombra: UI.cor('primaria-sombra'), amareloSombra: UI.cor('amarelo-sombra'), coralSombra: UI.cor('erro-sombra'), coralPalida: UI.cor('erro-palida'),
    laranja: UI.cor('aviso'), lilas: UI.cor('lilas'), azul: UI.cor('info'), perola: UI.cor('perola'), branco: UI.cor('claro') };
  // Misturas de cor feitas a partir dos tokens (o canvas não entende color-mix)
  const rgb = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); const n = m ? parseInt(m[1], 16) : 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const misturar = (a, b, t) => { const x = rgb(a); const y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
  const alfa = (c, a) => `rgba(${rgb(c).join(',')},${a})`;
  const suave = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3); // desacelera no fim
  const FONTE = '"Plus Jakarta Sans", system-ui, sans-serif';
  const TANQUE = 12;
  const RECARGA = 0.22; // segundos por jato

  /* ---------- Itens (rótulo + etiquetas) ---------- */
  const lista = (texto, tags, dica = '') => texto.split(' ').map((r) => ({ rotulo: r.replace(/_/g, ' '), tags: tags.split(' '), dica }));
  const ANIMAIS = [
    ...lista('TILÁPIA SARDINHA ATUM ROBALO TAINHA PESCADA DOURADO LINGUADO BAGRE PIRARUCU TUCUNARÉ GAROUPA PACU LAMBARI TUBARÃO RAIA MOREIA CAVALO-MARINHO PEIXE-PALHAÇO', 'animal peixe aquatico'),
    ...lista('GOLFINHO BALEIA PEIXE-BOI', 'animal mamifero aquatico', 'é mamífero'),
    ...lista('FOCA LONTRA', 'animal mamifero aquatico', 'é mamífero'),
    ...lista('POLVO LULA', 'animal aquatico', 'é molusco'),
    ...lista('CARANGUEJO CAMARÃO SIRI LAGOSTA', 'animal aquatico', 'é crustáceo'),
    ...lista('ÁGUA-VIVA ESTRELA-DO-MAR', 'animal aquatico', 'não é peixe'),
    ...lista('TARTARUGA', 'animal reptil aquatico', 'é réptil'),
    ...lista('GATO CACHORRO CAVALO LEÃO TIGRE URSO COELHO ONÇA CAPIVARA GIRAFA ELEFANTE ZEBRA CAMELO TAMANDUÁ PREGUIÇA', 'animal mamifero'),
    ...lista('MORCEGO', 'animal mamifero voa', 'é mamífero que voa'),
    ...lista('PATO CORUJA TUCANO GAIVOTA BEIJA-FLOR ARARA PAPAGAIO GAVIÃO SABIÁ', 'animal ave voa'),
    ...lista('PINGUIM AVESTRUZ EMA', 'animal ave', 'é ave, mas não voa'),
    ...lista('ABELHA BORBOLETA JOANINHA MOSQUITO LIBÉLULA', 'animal inseto voa'),
    ...lista('FORMIGA GRILO CUPIM', 'animal inseto'),
    ...lista('JACARÉ COBRA LAGARTO JABUTI', 'animal reptil', 'é réptil'),
  ];
  const COMIDAS = [
    ...lista('BANANA MAÇÃ UVA CAJU MANGA ACEROLA GOIABA CAQUI PERA KIWI MELANCIA ABACAXI JABUTICABA PITANGA AÇAÍ MORANGO LIMÃO', 'comida fruta'),
    ...lista('ALFACE CENOURA BATATA CEBOLA BRÓCOLIS COUVE ARROZ FEIJÃO MANDIOCA BETERRABA PÃO QUEIJO OVO PIPOCA', 'comida'),
  ];
  const OBJETOS = [
    ...lista('VIOLÃO PIANO FLAUTA BATERIA SANFONA CAVAQUINHO PANDEIRO TROMPETE VIOLINO BERIMBAU ZABUMBA SAXOFONE TAMBOR', 'objeto instrumento'),
    ...lista('CADEIRA MARTELO PANELA TESOURA LÁPIS ESCOVA GARFO SAPATO MOCHILA RELÓGIO VASSOURA TOALHA', 'objeto'),
  ];
  const CORES = [
    ...lista('AZUL VERDE ROXO AMARELO VERMELHO CINZA MARROM BRANCO PRETO BEGE', 'cor'),
    ...lista('MESA NUVEM CHUVA PEDRA PONTE JANELA PRAIA TRILHA CORDA GARRAFA', 'coisa'),
  ];
  const LUGARES = [
    ...lista('RECIFE SALVADOR MANAUS BELÉM NATAL CURITIBA PALMAS MACEIÓ VITÓRIA CUIABÁ ARACAJU GOIÂNIA TERESINA FORTALEZA MACAPÁ SÃO_LUÍS RIO_BRANCO BOA_VISTA PORTO_ALEGRE JOÃO_PESSOA', 'cidade capital'),
    ...lista('CAMPINAS SANTOS OLINDA PETRÓPOLIS JOINVILLE LONDRINA SOROCABA CARUARU MOSSORÓ NITERÓI PARATY BLUMENAU JUAZEIRO OURO_PRETO', 'cidade'),
    ...lista('BRASIL ARGENTINA CHILE PERU URUGUAI PARAGUAI BOLÍVIA EQUADOR COLÔMBIA VENEZUELA GUIANA SURINAME', 'pais sul'),
    ...lista('MÉXICO PORTUGAL ESPANHA JAPÃO CANADÁ CUBA ITÁLIA ANGOLA PANAMÁ EGITO FRANÇA ÍNDIA', 'pais'),
  ];
  const PALAVRAS = [...lista('CAFÉ SOFÁ AVÓ MÁGICO LÂMPADA PÁSSARO ÔNIBUS MÚSICA LIMÃO ÁRVORE FÓSFORO ÍMÃ BAÚ JACARÉ PÊSSEGO', 'palavra'),
    ...lista('CASA BOLO LIVRO JANELA PORTA CHAVE MESA SAPATO GELO NAVIO PRAIA VENTO BARCO FOLHA PEDRA', 'palavra')];
  const temAcento = (it) => /[ÁÀÂÃÉÊÍÓÔÕÚÜ]/.test(it.rotulo);
  const PRIMOS = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);
  const sortear = (l, r) => l[Math.floor(r() * l.length)];
  const inteiro = (a, b, r) => a + Math.floor(r() * (b - a + 1));
  const numero = (r) => { const n = inteiro(1, 99, r); return { rotulo: String(n), valor: n, tags: ['numero'] }; };
  const conta = (r) => {
    const v = inteiro(6, 14, r);
    const tipo = inteiro(0, 2, r);
    if (tipo === 0) { const a = inteiro(1, v - 1, r); return { rotulo: `${a}+${v - a}`, valor: v, tags: ['conta'] }; }
    if (tipo === 1) { const b = inteiro(1, 9, r); return { rotulo: `${v + b}−${b}`, valor: v, tags: ['conta'] }; }
    const divs = [1, 2, 3, 4, 5, 6, 7].filter((d) => v % d === 0 && v / d <= 9 && d > 1);
    if (!divs.length) { const a = inteiro(1, v - 1, r); return { rotulo: `${a}+${v - a}`, valor: v, tags: ['conta'] }; }
    const d = sortear(divs, r);
    return { rotulo: `${d}×${v / d}`, valor: v, tags: ['conta'] };
  };
  const letra = (r) => { const l = sortear('ABCDEFGHIJLMNOPRSTUVXZAEIOU'.split(''), r); return { rotulo: l, tags: ['letra', 'AEIOU'.includes(l) ? 'vogal' : 'consoante'] }; };
  const forma = (r) => { const f = sortear(['circulo', 'quadrado', 'triangulo', 'estrela'], r); return { forma: f, rotulo: { circulo: 'círculo', quadrado: 'quadrado', triangulo: 'triângulo', estrela: 'estrela' }[f], tags: ['forma', f] }; };
  const de = (itens) => (r) => ({ ...sortear(itens, r) });
  const tag = (t) => (it) => it.tags.includes(t);

  /* ---------- Regras (domínio = de onde saem as placas; teste = é certa?) ---------- */
  const REGRAS = [
    { id: 'peixes', texto: 'os PEIXES', dominio: de(ANIMAIS), teste: tag('peixe') },
    { id: 'mamiferos', texto: 'os MAMÍFEROS', dominio: de(ANIMAIS), teste: tag('mamifero') },
    { id: 'aves', texto: 'as AVES', dominio: de(ANIMAIS), teste: tag('ave') },
    { id: 'voam', texto: 'os bichos que VOAM', dominio: de(ANIMAIS), teste: tag('voa') },
    { id: 'insetos', texto: 'os INSETOS', dominio: de(ANIMAIS), teste: tag('inseto') },
    { id: 'repteis', texto: 'os RÉPTEIS', dominio: de(ANIMAIS), teste: tag('reptil') },
    { id: 'frutas', texto: 'as FRUTAS', dominio: de(COMIDAS), teste: tag('fruta') },
    { id: 'instrumentos', texto: 'os INSTRUMENTOS musicais', dominio: de(OBJETOS), teste: tag('instrumento') },
    { id: 'cores', texto: 'as CORES', dominio: de(CORES), teste: tag('cor') },
    { id: 'capitais', texto: 'as CAPITAIS do Brasil', dominio: de(LUGARES.filter(tag('cidade'))), teste: tag('capital') },
    { id: 'sul', texto: 'os países da AMÉRICA DO SUL', dominio: de(LUGARES.filter(tag('pais'))), teste: tag('sul') },
    { id: 'acento', texto: 'as palavras com ACENTO', dominio: de(PALAVRAS), teste: temAcento },
    { id: 'pares', texto: 'os números PARES', dominio: numero, teste: (it) => it.valor % 2 === 0 },
    { id: 'impares', texto: 'os números ÍMPARES', dominio: numero, teste: (it) => it.valor % 2 === 1 },
    { id: 'maior50', texto: 'os números MAIORES que 50', dominio: numero, teste: (it) => it.valor > 50 },
    { id: 'menor20', texto: 'os números MENORES que 20', dominio: numero, teste: (it) => it.valor < 20 },
    { id: 'mult3', texto: 'os MÚLTIPLOS de 3', dominio: numero, teste: (it) => it.valor % 3 === 0 },
    { id: 'mult5', texto: 'os MÚLTIPLOS de 5', dominio: numero, teste: (it) => it.valor % 5 === 0 },
    { id: 'primos', texto: 'os números PRIMOS', dominio: numero, teste: (it) => PRIMOS.has(it.valor), nivelMin: 3 },
    { id: 'conta10', texto: 'as contas que dão 10', dominio: conta, teste: (it) => it.valor === 10 },
    { id: 'conta12', texto: 'as contas que dão 12', dominio: conta, teste: (it) => it.valor === 12, nivelMin: 3 },
    { id: 'vogais', texto: 'as VOGAIS', dominio: letra, teste: tag('vogal') },
    { id: 'consoantes', texto: 'as CONSOANTES', dominio: letra, teste: tag('consoante') },
    { id: 'circulos', texto: 'os CÍRCULOS', dominio: forma, teste: tag('circulo') },
    { id: 'triangulos', texto: 'os TRIÂNGULOS', dominio: forma, teste: tag('triangulo') },
    { id: 'estrelas', texto: 'as ESTRELAS', dominio: forma, teste: tag('estrela') },
  ];
  const so = (regra) => ({ ...regra, texto: `Só ${regra.texto}` });

  /** Regra do nível: simples no começo; em dupla (A OU B) a partir do 4; "Tudo MENOS" a partir do 5. */
  function regraDoNivel(n, r, anterior) {
    const simples = REGRAS.filter((x) => (x.nivelMin || 1) <= n && x.id !== anterior);
    const sorteio = r();
    if (n >= 5 && sorteio < 0.25) {
      const a = sortear(simples, r);
      return { id: `menos-${a.id}`, texto: `Tudo MENOS ${a.texto}`, dominio: a.dominio, teste: (it) => !a.teste(it), explica: a };
    }
    if (n >= 4 && sorteio < 0.6) {
      const a = sortear(simples, r);
      const b = sortear(simples.filter((x) => x.id !== a.id && x.dominio !== a.dominio && !(x.id.startsWith('conta') && a.id.startsWith('conta'))), r);
      return { id: `${a.id}+${b.id}`, texto: `${a.texto.replace(/^(os|as) /, '').toUpperCase()} ou ${b.texto.replace(/^(os|as) /, '').toUpperCase()}`.replace(/^/, 'Só '), dominio: (rr) => (rr() < 0.5 ? a.dominio : b.dominio)(rr), teste: (it) => a.teste(it) || b.teste(it) };
    }
    return so(sortear(simples, r));
  }

  /** Números do nível n (1 = aquecimento; a partir do 2, bem mais difícil). */
  function parametros(n) {
    return {
      meta: 8 + (n - 1) * 5,
      vida: n === 1 ? 2.8 : Math.max(0.9, 2.05 - (n - 2) * 0.15),
      intervalo: n === 1 ? 0.95 : Math.max(0.26, 0.6 - (n - 2) * 0.05),
      raio: Math.max(0.62, 1 - (n - 1) * 0.06),
      desliza: n === 1 ? 0 : 45 + (n - 2) * 22,
      balanca: n >= 3 ? Math.min(40, 12 + (n - 3) * 6) : 0,
      certas: n === 1 ? 0.5 : 0.42,
      maximo: n === 1 ? 4 : 4 + n,
    };
  }

  Descompressao.registrar({
    id: 'tiro',
    nome: 'Tiro ao Alvo',
    curto: 'Tiro',
    icone: 'i-alvo',
    duracao: 'quanto você aguentar',
    diario: false,
    telaCheia: true, // o jogo ocupa a janela inteira (2026-10-17); a barra da Sala fica por cima
    descricao: 'Pistola d\'água na mão: acerte só as placas da regra. Placa errada ou placa certa que escapa: eliminação. Cada nível fica mais rápido.',
    abrir(ctx) {
      let jogo = null; // partida em andamento
      let quadro = 0;
      let limpar = [];

      // Tela toda (2026-10-17): o palco é a janela inteira; a regra e o placar ficam por cima dele, em pílulas
      const hudDados = h('div', { class: 'sd-tiro__dados' });
      const hud = h('div', { class: 'sd-tiro__hud', 'aria-live': 'off' }, hudDados);
      const regraEl = h('p', { class: 'sd-tiro__regra', id: 'sd-tiro-regra', 'aria-live': 'assertive' });
      const topo = h('div', { class: 'sd-tiro__topo' }, regraEl, hud);
      const tela = h('canvas', { class: 'sd-tiro__canvas', id: 'sd-tiro-canvas', tabindex: '-1', 'aria-label': 'Área de tiro: mire e clique nas placas da regra' });
      const palco = h('div', { class: 'sd-tiro__palco' }, tela);
      const abertura = h('div', { class: 'sd-tiro__abertura' });
      const raiz = h('div', { class: 'sd-tiro' }, palco, topo, abertura);
      ctx.container.replaceChildren(raiz);
      const g = tela.getContext('2d');
      let L = 0;
      let A = 0;
      let T = 0; // onde começa o campo das placas (abaixo da regra e do placar)
      let mira = null; // { x, y } do ponteiro (mouse); no toque, só aparece no disparo

      // "Tela cheia" de verdade (sem as barras do navegador), onde ele deixa; o botão fica na barra de cima
      const podeTelaCheia = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
      const botaoCheia = podeTelaCheia ? h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno sd-tiro__cheia', 'aria-pressed': 'false', onclick: alternarTelaCheia }) : null;
      function pintarCheia() {
        const on = !!document.fullscreenElement;
        botaoCheia.setAttribute('aria-pressed', String(on));
        botaoCheia.replaceChildren(icone(on ? 'i-recolher' : 'i-expandir'), h('span', { class: 'sd-barra__texto', text: on ? 'Sair da tela cheia' : 'Tela cheia' }));
      }
      function alternarTelaCheia() {
        const pedido = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        if (pedido && pedido.catch) pedido.catch(() => { /* o navegador recusou: segue na janela */ });
        tela.focus({ preventScroll: true });
      }
      if (botaoCheia && ctx.barra) {
        pintarCheia();
        ctx.barra(botaoCheia);
        document.addEventListener('fullscreenchange', pintarCheia);
        limpar.push(() => document.removeEventListener('fullscreenchange', pintarCheia));
      }

      /** O campo das placas: do pé do placar até o balcão */
      const baseCampo = () => balcaoY();
      const meioCampo = () => (T + baseCampo()) / 2;
      function medir() {
        const largura = Math.max(280, palco.clientWidth || 320);
        const altura = Math.max(240, palco.clientHeight || 320);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        tela.width = Math.round(largura * dpr);
        tela.height = Math.round(altura * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        L = largura;
        A = altura;
        const r = topo.getBoundingClientRect();
        T = Math.min(A * 0.4, Math.max(0, Math.round(r.bottom - palco.getBoundingClientRect().top)) + 8);
        if (!jogo) desenharParado();
        else desenhar();
      }

      /* ---------- Abertura e fim ---------- */
      /** Abertura e fim: um cartão só, no desenho das Profissões (rótulo, título, passos numerados e "Em números") */
      function mostrarAbertura(fim = null) {
        const recorde = ctx.recorde();
        raiz.classList.remove('sd-tiro--jogando');
        abertura.hidden = false;
        const numero = (rotulo, valor, destaque) => h('div', {}, h('dt', { text: rotulo }), h('dd', { class: destaque ? 'sd-tiro__destaque' : '', text: String(valor) }));
        // passo numerado: o negrito sozinho já se entende (na tela bem baixa, o resto some)
        const passo = (n, forte, mais) => h('li', {}, h('span', { class: 'sd-tiro__n', 'aria-hidden': 'true', text: n }), h('p', {}, h('b', { text: forte }), h('span', { class: 'sd-tiro__passo-mais', text: mais })));
        const corpo = fim
          ? [h('p', { class: 'sd-tiro__rotulo', text: 'Fim da partida' }),
            h('h2', { class: 'sd-tiro__titulo', text: fim.motivo === 'errada' ? 'Placa errada!' : 'Deixou escapar!' }),
            h('p', { class: 'sd-tiro__porque', text: fim.porque }),
            h('dl', { class: 'sd-tiro__numeros' },
              numero('Pontos', fim.pontos, true),
              numero('Nível', fim.nivel),
              numero(fim.pontos >= recorde && fim.pontos > 0 ? 'Novo recorde' : 'Recorde', Math.max(recorde, fim.pontos)))]
          : [h('p', { class: 'sd-tiro__rotulo', text: 'Pistola carregada' }),
            h('h2', { class: 'sd-tiro__titulo', text: 'Tiro ao Alvo' }),
            h('p', { class: 'sd-tiro__lead', text: 'Pistola d\'água na mão: acerte só as placas da regra. 1 ponto por acerto.' }),
            h('ol', { class: 'sd-tiro__passos' },
              passo('01', 'Leia a regra. ', 'Cada nível tem uma, e só valem as placas que combinam com ela.'),
              passo('02', 'Errou ou deixou escapar, acabou. ', 'Placa errada ou placa certa que some: eliminação.'),
              passo('03', 'Acertou todas, sobe de nível. ', 'Regra nova e mais placas. O nível 1 é aquecimento: do 2 em diante, segura firme!')),
            recorde ? h('dl', { class: 'sd-tiro__numeros' }, numero('Seu recorde', plural(recorde, 'ponto', 'pontos'), true)) : null];
        abertura.replaceChildren(h('div', { class: 'sd-tiro__cartao' + (fim ? ' sd-tiro__cartao--fim' : '') }, ...corpo,
          h('div', { class: 'acoes-linha sd-tiro__acoes' },
            h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-tiro-comecar', onclick: comecar }, icone('i-alvo'), fim ? 'Jogar de novo' : 'Começar'),
            fim ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala') : null)));
        const b = abertura.querySelector('#sd-tiro-comecar');
        if (b) b.focus({ preventScroll: true });
      }

      function desenharParado() {
        desenhar();
        desenharPistola(L / 2, meioCampo(), 0);
      }

      /* ---------- Partida ---------- */
      function comecar() {
        abertura.hidden = true;
        raiz.classList.add('sd-tiro--jogando');
        jogo = {
          r: Math.random, t: 0, pontos: 0, nivel: 0, agua: TANQUE, recarga: 0, placas: [], respingos: [], jatos: [],
          regra: null, pausa: 0, proxima: 0.6, coice: 0, fim: false, acertosNivel: 0, certasCriadas: 0, p: null,
        };
        proximoNivel();
        cancelAnimationFrame(quadro);
        let antes = performance.now();
        const passo = (agora) => {
          if (!jogo || jogo.fim) return;
          const dt = Math.min(0.05, (agora - antes) / 1000);
          antes = agora;
          atualizar(dt);
          desenhar();
          quadro = requestAnimationFrame(passo);
        };
        quadro = requestAnimationFrame(passo);
        tela.focus({ preventScroll: true });
      }

      function proximoNivel() {
        jogo.nivel++;
        jogo.p = parametros(jogo.nivel);
        jogo.regra = regraDoNivel(jogo.nivel, jogo.r, jogo.regra && jogo.regra.id);
        jogo.acertosNivel = 0;
        jogo.certasCriadas = 0;
        jogo.placas = [];
        // três trilhos (fundo, meio, frente); cada um anda inteiro num sentido, como numa barraca de parque
        const mexe = !UI.movimentoReduzido;
        jogo.trilhos = [0.8, 1, 1.2].map((f, i) => ({ i, dir: jogo.r() < 0.5 ? -1 : 1, vel: mexe ? jogo.p.desliza * f : 0 }));
        jogo.pausa = jogo.nivel === 1 ? 1.4 : 1.8; // respiro para ler a regra nova
        jogo.proxima = 0.3;
        regraEl.textContent = jogo.regra.texto;
        regraEl.classList.toggle('sd-tiro__regra--longa', jogo.regra.texto.length > 28);
        regraEl.classList.remove('sd-tiro__regra--nova');
        void regraEl.offsetWidth;
        regraEl.classList.add('sd-tiro__regra--nova');
        hudDesenhar();
      }

      function criarPlaca() {
        const p = jogo.p;
        const faltamCertas = p.meta - jogo.certasCriadas;
        if (jogo.placas.length >= p.maximo) return;
        // Quando já saíram todas as certas da leva, só aparecem erradas (até você acertar as que estão na tela)
        const certa = faltamCertas > 0 && jogo.r() < p.certas;
        let item = null;
        for (let i = 0; i < 80 && !item; i++) {
          const it = jogo.regra.dominio(jogo.r);
          if (!!jogo.regra.teste(it) === certa && !jogo.placas.some((x) => x.rotulo === it.rotulo)) item = it;
        }
        if (!item) return;
        // Procura um trilho com um vão livre (placa nascendo em cima de outra seria injusto); sem vão, espera a próxima vez
        const ordem = [0, 1, 2].sort(() => jogo.r() - 0.5);
        for (const i of ordem) {
          const tam = medidasPlaca(item, i);
          const nas = jogo.placas.filter((o) => o.trilho === i);
          const borda = beira() + tam.w / 2;
          for (let t = 0; t < 12; t++) {
            const x = borda + jogo.r() * Math.max(0, L - borda * 2);
            if (nas.some((o) => Math.abs(o.x - x) < (o.w + tam.w) / 2 + 14)) continue;
            if (certa) jogo.certasCriadas++;
            // o pulo na haste nunca leva a placa para baixo da regra e do placar
            const amp = UI.movimentoReduzido ? 0 : Math.max(0, Math.min(p.balanca, faixa() * 0.18, (trilhoY(i) - tam.poste - tam.h - T) / 2));
            jogo.placas.push({ ...item, ...tam, certa, trilho: i, x, y: trilhoY(i) - tam.h / 2, nasceu: jogo.t, vida: p.vida * (0.9 + jogo.r() * 0.2),
              amp, fase: jogo.r() * Math.PI * 2, regra: jogo.regra });
            return;
          }
        }
      }

      function atualizar(dt) {
        jogo.t += dt;
        jogo.coice = Math.max(0, jogo.coice - dt * 6);
        if (jogo.agua < TANQUE) {
          jogo.recarga += dt;
          while (jogo.recarga >= RECARGA && jogo.agua < TANQUE) {
            jogo.recarga -= RECARGA;
            jogo.agua++;
          }
        } else jogo.recarga = 0;
        if (jogo.pausa > 0) jogo.pausa -= dt;
        else {
          jogo.proxima -= dt;
          if (jogo.proxima <= 0) {
            criarPlaca();
            jogo.proxima = jogo.p.intervalo * (0.8 + jogo.r() * 0.4);
          }
        }
        // trilhos: as placas de um trilho andam juntas e o trilho vira de sentido na beira (nunca uma passa por cima da outra)
        for (const tr of jogo.trilhos) {
          const nas = jogo.placas.filter((o) => o.trilho === tr.i);
          if (!tr.vel || !nas.length) continue;
          const esq = Math.min(...nas.map((o) => o.x - o.w / 2));
          const dir = Math.max(...nas.map((o) => o.x + o.w / 2));
          if (tr.dir > 0 && dir >= L - beira()) tr.dir = -1;
          else if (tr.dir < 0 && esq <= beira()) tr.dir = 1;
          const dx = Math.max(beira() - esq, Math.min(L - beira() - dir, tr.dir * tr.vel * dt));
          nas.forEach((o) => { o.x += dx; });
        }
        for (const p of jogo.placas) {
          posicionar(p);
          if (jogo.t - p.nasceu >= p.vida && p.certa) return terminar('escapou', p);
        }
        jogo.placas = jogo.placas.filter((p) => jogo.t - p.nasceu < p.vida);
        jogo.respingos = jogo.respingos.filter((s) => {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += 500 * dt;
          s.v -= dt;
          return s.v > 0;
        });
        jogo.jatos = jogo.jatos.filter((j) => (j.v -= dt) > 0);
        hudDesenhar(true);
      }

      function atirar(x, y, folga = 6) {
        if (!jogo || jogo.fim || jogo.pausa > 0) return;
        if (jogo.agua <= 0) return; // tanque vazio: a barra de água mostra a recarga
        jogo.agua--;
        jogo.coice = 1;
        jogo.jatos.push({ x, y, v: 0.12 });
        // a placa mais na frente (trilho da frente, depois a mais nova) que contém o ponto
        const alvo = [...jogo.placas].sort((a, b) => b.trilho - a.trilho || b.nasceu - a.nasceu)
          .find((p) => Math.abs(p.x - x) <= p.w / 2 + folga && Math.abs(p.y - y) <= p.h / 2 + folga);
        if (!alvo) {
          respingar(x, y, COR.claro, 6);
          return;
        }
        if (!alvo.certa) {
          respingar(alvo.x, alvo.y, COR.coral, 18);
          terminar('errada', alvo);
          return;
        }
        jogo.placas = jogo.placas.filter((p) => p !== alvo);
        jogo.pontos++;
        jogo.acertosNivel++;
        respingar(alvo.x, alvo.y, COR.turquesa, 14);
        hudDesenhar();
        if (jogo.acertosNivel >= jogo.p.meta) {
          UI.toast(`Nível ${jogo.nivel} completo!`, 'Mandou bem, Diver! Agora fica mais rápido.', 'i-estrela');
          proximoNivel();
        }
      }

      function respingar(x, y, cor, n) {
        if (UI.movimentoReduzido) return;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 80 + Math.random() * 180;
          jogo.respingos.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, v: 0.5 + Math.random() * 0.3, cor });
        }
      }

      function explicar(p, motivo) {
        const menos = /^Tudo MENOS/.test(p.regra.texto);
        const nome = p.rotulo.toUpperCase();
        if (motivo === 'errada') return menos ? `${nome} é justamente o que a regra “${p.regra.texto}” deixa de fora.` : `${nome} não vale em “${p.regra.texto}”${p.dica ? ` (${p.dica})` : ''}.`;
        return `${nome} valia em “${p.regra.texto}” e escapou antes do seu jato.`;
      }

      function terminar(motivo, placa) {
        if (!jogo || jogo.fim) return;
        jogo.fim = true;
        cancelAnimationFrame(quadro);
        desenhar(placa);
        const fim = { motivo, pontos: jogo.pontos, nivel: jogo.nivel, porque: explicar(placa, motivo) };
        ctx.pontuar(jogo.pontos, { acertos: jogo.pontos, nivel: jogo.nivel, segundos: Math.round(jogo.t), motivo });
        regraEl.textContent = motivo === 'errada' ? 'Placa errada!' : 'Deixou escapar!';
        setTimeout(() => {
          jogo = null;
          mostrarAbertura(fim);
        }, UI.movimentoReduzido ? 200 : 1100);
      }

      let hudAntes = '';
      function hudDesenhar(soSeMudou = false) {
        if (!jogo) return;
        const chave = `${jogo.pontos}|${jogo.nivel}|${jogo.acertosNivel}|${jogo.agua}`;
        if (soSeMudou && chave === hudAntes) return;
        hudAntes = chave;
        hudDados.replaceChildren(
          h('span', { class: 'sd-tiro__pontos' }, icone('i-estrela'), `${jogo.pontos}`),
          h('span', { class: 'sd-tiro__nivel', text: `Nível ${jogo.nivel}` }),
          h('span', { class: 'sd-tiro__seq' }, `${jogo.acertosNivel}/${jogo.p.meta}`, h('span', { class: 'sd-tiro__seq-rotulo', text: ' do nível' })),
          h('span', { class: 'sd-tiro__agua' }, h('span', { class: 'sd-tiro__agua-barra', style: `width:${(jogo.agua / TANQUE) * 100}%` }), h('span', { class: 'visualmente-oculto', text: `${jogo.agua} jatos` })));
      }

      /* ---------- Desenho: a barraca de tiro na beira do mar (2026-10-17) ----------
         O fundo (céu e mar ao pôr do sol, com o sol e uma ilhota) e a moldura da barraca (toldo listrado, luzinhas,
         bandeirinhas e colunas) ficam em duas imagens guardadas, que só mudam quando a tela muda de tamanho. A cada
         quadro entram só as placas, os trilhos, o balcão, a pistola, os jatos e a mira. As placas ficam em três
         trilhos (fundo, meio e frente): as do fundo são menores, e todas nascem de trás do trilho. */
      function balcaoY() { return A - Math.max(56, Math.round(A * 0.17)); }
      function faixa() { return Math.max(40, (balcaoY() - (T + 6)) / 3); }
      function trilhoY(i) { return T + 6 + faixa() * (i + 1); }
      function coluna() { return Math.max(10, Math.min(18, L * 0.012)); }
      function beira() { return coluna() + 8; }
      const ESCALA_TRILHO = [0.82, 0.91, 1];

      /** Tamanho da placa: a letra nunca fica menor que 12 px; no fundo e nos níveis altos, a placa encolhe */
      function medidasPlaca(item, i) {
        const base = Math.max(17, Math.min(34, L / 42));
        const nivel = jogo && jogo.p ? jogo.p.raio : 1;
        let fonte = Math.max(12, Math.round(base * ESCALA_TRILHO[i] * nivel));
        const cabe = faixa() - 10; // a placa e a haste cabem na faixa do trilho
        if (fonte * 2.4 + 6 > cabe) fonte = Math.max(12, Math.floor((cabe - 6) / 2.4));
        const alt = Math.max(32, Math.round(fonte * 2.4)); // nunca menor que um alvo de dedo
        if (item.forma) {
          const lado = Math.max(40, alt);
          return { w: lado, h: lado, fonte, poste: Math.max(6, Math.min(40, Math.round((cabe - lado) * 0.45))) };
        }
        const poste = Math.max(6, Math.min(40, Math.round((cabe - alt) * 0.45)));
        g.font = `800 ${fonte}px ${FONTE}`;
        return { w: Math.round(Math.max(46, fonte * 3.4, g.measureText(item.rotulo).width + fonte * 1.5)), h: alt, fonte, poste };
      }

      /** Onde a placa está agora: sobe de trás do trilho ao nascer e, nos níveis altos, pula na haste */
      function posicionar(p) {
        const entra = UI.movimentoReduzido ? 1 : suave((jogo.t - p.nasceu) / 0.18);
        const pulo = p.amp ? (Math.sin(jogo.t * 3 + p.fase) - 1) * p.amp : 0;
        p.y = trilhoY(p.trilho) - p.poste - p.h / 2 + pulo + (1 - entra) * (p.h + p.poste + 8);
      }

      function arredondado(c, x, y, w, alt, r) {
        c.beginPath();
        if (c.roundRect) c.roundRect(x, y, w, alt, r);
        else c.rect(x, y, w, alt);
      }

      /* --- as imagens guardadas --- */
      let fundoMar = null;
      let moldura = null;
      let cenarioChave = '';
      const FOLGA = 24; // sobra dos lados para o fundo andar um tiquinho com a mira
      function novaImagem(largura) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const c = document.createElement('canvas');
        c.width = Math.round(largura * dpr);
        c.height = Math.round(A * dpr);
        const f = c.getContext('2d');
        f.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { c, f };
      }
      function prepararCenario() {
        const chave = `${L}x${A}x${T}`;
        if (fundoMar && cenarioChave === chave) return;
        cenarioChave = chave;
        const fm = novaImagem(L + FOLGA * 2);
        fm.f.translate(FOLGA, 0);
        pintarMar(fm.f, -FOLGA, L + FOLGA);
        fundoMar = fm.c;
        const mo = novaImagem(L);
        pintarMoldura(mo.f);
        moldura = mo.c;
      }

      function pintarMar(f, x0, x1) {
        const W = x1 - x0;
        const horiz = Math.round(T + (balcaoY() - T) * 0.36);
        // céu: noite lá em cima, pôr do sol perto do mar
        const ceu = f.createLinearGradient(0, 0, 0, horiz);
        ceu.addColorStop(0, COR.fundo);
        ceu.addColorStop(0.45, misturar(COR.marinho, COR.lilas, 0.22));
        ceu.addColorStop(0.82, misturar(COR.coral, COR.marinho, 0.35));
        ceu.addColorStop(1, misturar(COR.laranja, COR.coral, 0.25));
        f.fillStyle = ceu;
        f.fillRect(x0, 0, W, horiz);
        // o sol, metade já no mar, com o brilho em volta
        const sx = L * 0.68;
        const raio = Math.max(26, Math.min(84, Math.min(L, A) * 0.07));
        const brilho = f.createRadialGradient(sx, horiz, raio * 0.4, sx, horiz, raio * 3.4);
        brilho.addColorStop(0, alfa(COR.amarelo, 0.45));
        brilho.addColorStop(1, alfa(COR.amarelo, 0));
        f.fillStyle = brilho;
        f.fillRect(sx - raio * 3.4, horiz - raio * 3.4, raio * 6.8, raio * 3.4);
        f.save();
        f.beginPath();
        f.rect(x0, 0, W, horiz);
        f.clip();
        f.beginPath();
        f.arc(sx, horiz, raio, 0, Math.PI * 2);
        f.fillStyle = misturar(COR.amarelo, COR.laranja, 0.25);
        f.fill();
        f.restore();
        // uma ilhota com coqueiro, à esquerda
        const ix = L * 0.16;
        const iw = Math.max(70, L * 0.13);
        const sombraIlha = misturar(COR.fundo, COR.lilas, 0.12);
        f.fillStyle = sombraIlha;
        f.beginPath();
        f.ellipse(ix, horiz, iw / 2, raio * 0.42, 0, Math.PI, 0);
        f.fill();
        f.strokeStyle = sombraIlha;
        f.lineWidth = Math.max(3, raio * 0.09);
        f.lineCap = 'round';
        const topoX = ix + raio * 0.35;
        const topoY = horiz - raio * 1.35;
        f.beginPath();
        f.moveTo(ix - raio * 0.05, horiz - raio * 0.3);
        f.quadraticCurveTo(ix + raio * 0.05, horiz - raio * 0.9, topoX, topoY);
        f.stroke();
        f.lineWidth = Math.max(2.5, raio * 0.07);
        [[-1, -0.25], [-0.75, 0.35], [0.85, 0.3], [1, -0.2], [0.15, -0.65]].forEach(([dx, dy]) => {
          f.beginPath();
          f.moveTo(topoX, topoY);
          f.quadraticCurveTo(topoX + dx * raio * 0.45, topoY + dy * raio * 0.45 - raio * 0.2, topoX + dx * raio * 0.75, topoY + dy * raio * 0.6 + raio * 0.15);
          f.stroke();
        });
        // o mar
        const mar = f.createLinearGradient(0, horiz, 0, A);
        mar.addColorStop(0, misturar(COR.turquesaEscura, COR.marinho, 0.35));
        mar.addColorStop(0.5, misturar(COR.turquesaEscura, COR.fundo, 0.7));
        mar.addColorStop(1, COR.fundo);
        f.fillStyle = mar;
        f.fillRect(x0, horiz, W, A - horiz);
        // o reflexo do sol e os brilhos na água (sorteio fixo, para a imagem ficar sempre igual)
        let semente = 7;
        const sorte = () => { semente = (semente * 9301 + 49297) % 233280; return semente / 233280; };
        for (let k = 0; k < 16; k++) {
          const y = horiz + 5 + k * k * 1.5;
          if (y > balcaoY()) break;
          const w = raio * (1.7 - k * 0.07) * (0.6 + sorte() * 0.6);
          f.fillStyle = alfa(COR.amarelo, Math.max(0.05, 0.55 - k * 0.035));
          f.fillRect(sx - w / 2 + (sorte() - 0.5) * 12, y, w, 2);
        }
        f.strokeStyle = alfa(COR.claro, 0.13);
        f.lineWidth = 1.5;
        for (let k = 0; k < 30; k++) {
          const y = horiz + 8 + sorte() * (balcaoY() - horiz - 8);
          const x = x0 + sorte() * W;
          f.beginPath();
          f.moveTo(x, y);
          f.lineTo(x + 16 + sorte() * 46, y);
          f.stroke();
        }
        f.fillStyle = alfa(COR.amarelo, 0.32);
        f.fillRect(x0, horiz - 1, W, 2);
      }

      function pintarMoldura(f) {
        // o toldo listrado, com a barra de baixo em ondinhas
        const listra = Math.max(24, Math.min(56, L / 18, A / 13));
        const fimToldo = Math.max(28, T - listra * 0.45);
        const caminho = (x) => {
          f.beginPath();
          f.moveTo(x, 0);
          f.lineTo(x + listra, 0);
          f.lineTo(x + listra, fimToldo);
          f.arc(x + listra / 2, fimToldo, listra / 2, 0, Math.PI, false);
          f.closePath();
        };
        const sombra = f.createLinearGradient(0, 0, 0, fimToldo + listra / 2);
        sombra.addColorStop(0, alfa(COR.fundo, 0.62));
        sombra.addColorStop(1, alfa(COR.fundo, 0.08));
        for (let x = 0, k = 0; x < L; x += listra, k++) {
          caminho(x);
          f.fillStyle = k % 2 ? COR.perola : COR.turquesa;
          f.fill();
          f.fillStyle = sombra;
          f.fill();
        }
        // as luzinhas na ponta de cada ondinha
        for (let x = listra / 2; x < L; x += listra) {
          const y = fimToldo + listra / 2 + 5;
          const halo = f.createRadialGradient(x, y, 1, x, y, 15);
          halo.addColorStop(0, alfa(COR.amarelo, 0.5));
          halo.addColorStop(1, alfa(COR.amarelo, 0));
          f.fillStyle = halo;
          f.fillRect(x - 15, y - 15, 30, 30);
          f.fillStyle = COR.amarelo;
          f.beginPath();
          f.arc(x, y, 3.5, 0, Math.PI * 2);
          f.fill();
        }
        // o cordão de bandeirinhas, meio caído no meio (a ponta das do meio desce pouco no campo das placas)
        const queda = Math.max(10, listra * 0.45);
        const passo = Math.max(30, listra * 0.85);
        const yb = T + Math.min(listra * 0.66, faixa() * 0.25) - queda - passo * 0.6;
        const fioY = (x) => yb + 4 * queda * (x / L) * (1 - x / L);
        f.strokeStyle = alfa(COR.texto, 0.5);
        f.lineWidth = 1.5;
        f.beginPath();
        for (let x = 0; x <= L; x += 8) (x ? f.lineTo(x, fioY(x)) : f.moveTo(x, fioY(x)));
        f.stroke();
        const cores = [COR.coral, COR.amarelo, COR.claro, COR.lilas, COR.azul, COR.laranja];
        for (let x = passo * 0.5, k = 0; x < L - passo * 0.3; x += passo, k++) {
          const a = x - passo * 0.32;
          const b = x + passo * 0.32;
          f.fillStyle = cores[k % cores.length];
          f.beginPath();
          f.moveTo(a, fioY(a));
          f.lineTo(b, fioY(b));
          f.lineTo(x, fioY(x) + passo * 0.6);
          f.closePath();
          f.fill();
        }
        // as colunas da barraca nas laterais
        const c = coluna();
        [0, L - c].forEach((x) => {
          const col = f.createLinearGradient(x, 0, x + c, 0);
          col.addColorStop(0, COR.sup3);
          col.addColorStop(1, COR.sup);
          f.fillStyle = col;
          f.fillRect(x, 0, c, balcaoY());
          f.fillStyle = alfa(COR.claro, 0.25);
          f.fillRect(x + c * 0.25, 0, 2, balcaoY());
        });
      }

      function desenharCena() {
        prepararCenario();
        const desloca = mira && !UI.movimentoReduzido ? (0.5 - mira.x / L) * FOLGA : 0; // o mar lá no fundo anda com a mira
        g.drawImage(fundoMar, -FOLGA + desloca, 0, L + FOLGA * 2, A);
        g.drawImage(moldura, 0, 0, L, A);
      }

      function desenharTrilho(i) {
        const y = trilhoY(i);
        const alt = Math.max(6, Math.round(A * 0.011));
        const x0 = coluna();
        const w = L - x0 * 2;
        g.fillStyle = COR.sup3;
        g.fillRect(x0, y, w, alt);
        g.fillStyle = alfa(COR.claro, 0.35);
        g.fillRect(x0, y, w, 1.5);
        g.fillStyle = alfa(COR.fundo, 0.45);
        g.fillRect(x0, y + alt - 2, w, 2);
        g.fillStyle = alfa(COR.fundo, 0.55);
        for (let x = x0 + 26; x < L - x0; x += 64) {
          g.beginPath();
          g.arc(x, y + alt / 2, 1.8, 0, Math.PI * 2);
          g.fill();
        }
      }

      function desenharBalcao() {
        const y = balcaoY();
        const frente = g.createLinearGradient(0, y, 0, A);
        frente.addColorStop(0, COR.sup2);
        frente.addColorStop(1, COR.sup);
        g.fillStyle = frente;
        g.fillRect(0, y, L, A - y);
        // as tábuas
        g.strokeStyle = alfa(COR.fundo, 0.32);
        g.lineWidth = 2;
        const tabua = Math.max(48, L / 14);
        for (let x = tabua; x < L; x += tabua) {
          g.beginPath();
          g.moveTo(x, y + 10);
          g.lineTo(x, A);
          g.stroke();
        }
        // a faixa coral com bolinhas, enfeite de barraca
        const fy = y + Math.min(26, (A - y) * 0.32);
        g.fillStyle = COR.coral;
        g.fillRect(0, fy, L, 10);
        g.fillStyle = alfa(COR.branco, 0.85);
        for (let x = 12; x < L; x += 24) {
          g.beginPath();
          g.arc(x, fy + 5, 2.2, 0, Math.PI * 2);
          g.fill();
        }
        // o tampo amarelo
        g.fillStyle = COR.amarelo;
        g.fillRect(0, y - 4, L, 8);
        g.fillStyle = COR.amareloSombra;
        g.fillRect(0, y + 4, L, 3);
        // os prêmios: peixinhos de pelúcia nas pontas
        const peixe = (x, cor, lado, t) => {
          g.save();
          g.translate(x, y - 4 - t * 0.55);
          g.scale(lado, 1);
          g.fillStyle = cor;
          g.strokeStyle = COR.fundo;
          g.lineWidth = 2.5;
          g.beginPath();
          g.ellipse(0, 0, t, t * 0.62, 0, 0, Math.PI * 2);
          g.moveTo(-t * 0.85, 0);
          g.lineTo(-t * 1.5, -t * 0.55);
          g.lineTo(-t * 1.5, t * 0.55);
          g.closePath();
          g.fill();
          g.stroke();
          g.fillStyle = COR.fundo;
          g.beginPath();
          g.arc(t * 0.45, -t * 0.12, t * 0.13, 0, Math.PI * 2);
          g.fill();
          g.restore();
        };
        const t = Math.max(12, Math.min(22, L / 60));
        peixe(coluna() + t * 2.2, COR.coral, 1, t);
        peixe(coluna() + t * 4.6, COR.lilas, 1, t * 0.8);
        peixe(L - coluna() - t * 2.2, COR.amarelo, -1, t);
      }

      function desenharPlaca(p, destaque = false) {
        const idade = jogo ? jogo.t - p.nasceu : 1;
        const resto = jogo ? Math.max(0, 1 - idade / p.vida) : 1;
        const base = trilhoY(p.trilho);
        const x = p.x;
        const y = p.y;
        const w = p.w;
        const alt = p.h;
        const r = Math.round(alt * 0.22);
        g.save();
        g.beginPath();
        g.rect(0, 0, L, base); // a placa nasce de trás do trilho
        g.clip();
        // haste
        g.fillStyle = COR.sup3;
        g.fillRect(x - 3, y + alt / 2 - 2, 6, base - (y + alt / 2) + 4);
        // sombra e placa
        g.fillStyle = alfa(COR.fundo, 0.35);
        arredondado(g, x - w / 2 + 3, y - alt / 2 + 4, w, alt, r);
        g.fill();
        const fundoPlaca = g.createLinearGradient(0, y - alt / 2, 0, y + alt / 2);
        fundoPlaca.addColorStop(0, destaque ? COR.coralPalida : COR.branco);
        fundoPlaca.addColorStop(1, destaque ? misturar(COR.coralPalida, COR.coral, 0.25) : COR.perola);
        g.fillStyle = fundoPlaca;
        arredondado(g, x - w / 2, y - alt / 2, w, alt, r);
        g.fill();
        g.lineWidth = Math.max(2.5, alt * 0.06);
        g.strokeStyle = destaque ? COR.coral : COR.turquesa;
        g.stroke();
        // o tempo que falta: barrinha amarela embaixo (coral no fim)
        const folga = Math.max(6, alt * 0.14);
        const bw = w - folga * 2;
        const by = y + alt / 2 - folga * 0.7 - 3;
        g.fillStyle = alfa(COR.escuro, 0.12);
        arredondado(g, x - bw / 2, by, bw, 4, 2);
        g.fill();
        if (resto > 0) {
          g.fillStyle = resto > 0.35 ? COR.amarelo : COR.coral;
          arredondado(g, x - bw / 2, by, Math.max(4, bw * resto), 4, 2);
          g.fill();
        }
        // o que a placa diz
        g.fillStyle = destaque ? COR.coralSombra : COR.escuro;
        if (p.forma) {
          g.translate(x, y - alt * 0.06);
          desenharForma(p.forma, alt * 0.27);
        } else {
          g.font = `800 ${p.fonte}px ${FONTE}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(p.rotulo, x, y - alt * 0.07);
        }
        g.restore();
      }

      function desenharForma(forma, s) {
        g.beginPath();
        if (forma === 'circulo') g.arc(0, 0, s, 0, Math.PI * 2);
        else if (forma === 'quadrado') g.rect(-s * 0.9, -s * 0.9, s * 1.8, s * 1.8);
        else if (forma === 'triangulo') {
          g.moveTo(0, -s);
          g.lineTo(s * 1.05, s * 0.8);
          g.lineTo(-s * 1.05, s * 0.8);
          g.closePath();
        } else {
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const rr = i % 2 ? s * 0.45 : s * 1.05;
            g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          g.closePath();
        }
        g.fill();
      }

      /* --- a pistola d'água: cabo coral, corpo turquesa, tanque transparente com a água que sobra e o cano amarelo --- */
      const BICO = 132; // do pé da pistola até a ponta do bico
      // a pistola cresce com o balcão e só a ponta passa dele (não cobre as placas da frente)
      const escalaPistola = () => Math.max(0.62, Math.min(1.3, (A - balcaoY() + 16) / BICO));
      function desenharPistola(mx, my, coice) {
        const s = escalaPistola();
        const bx = L / 2;
        const by = A + 6 * s;
        g.save();
        g.translate(bx, by);
        g.rotate(Math.atan2(my - by, mx - bx) + Math.PI / 2);
        g.scale(s, s);
        g.translate(0, coice * 12);
        g.lineJoin = 'round';
        g.lineWidth = 4;
        g.strokeStyle = COR.fundo;
        // cabo
        g.fillStyle = COR.coral;
        arredondado(g, -16, -22, 32, 62, 12);
        g.fill();
        g.stroke();
        g.fillStyle = alfa(COR.coralSombra, 0.55);
        for (let k = 0; k < 3; k++) {
          arredondado(g, -10, -10 + k * 13, 20, 5, 2.5);
          g.fill();
        }
        // corpo
        g.fillStyle = COR.turquesa;
        arredondado(g, -28, -62, 56, 48, 16);
        g.fill();
        g.stroke();
        g.fillStyle = alfa(COR.claro, 0.6);
        arredondado(g, -20, -56, 9, 34, 4.5);
        g.fill();
        // tanque transparente: a água baixa a cada jato e volta sozinha
        const nivel = jogo ? jogo.agua / TANQUE : 1;
        g.save();
        arredondado(g, -22, -100, 44, 40, 18);
        g.fillStyle = alfa(COR.branco, 0.16);
        g.fill();
        g.clip();
        g.fillStyle = COR.claro;
        g.fillRect(-24, -60 - 40 * nivel, 48, 40 * nivel + 2);
        g.fillStyle = alfa(COR.branco, 0.65);
        [[-7, -70, 3], [6, -80, 2.2], [-1, -89, 1.6]].forEach(([x, y, r]) => {
          if (y > -60 - 40 * nivel) {
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
          }
        });
        g.restore();
        arredondado(g, -22, -100, 44, 40, 18);
        g.lineWidth = 3.5;
        g.stroke();
        // cano e bico
        g.lineWidth = 4;
        g.fillStyle = COR.amarelo;
        arredondado(g, -8, -126, 16, 30, 6);
        g.fill();
        g.stroke();
        g.fillStyle = COR.coral;
        arredondado(g, -11, -BICO - 2, 22, 12, 5);
        g.fill();
        g.stroke();
        g.restore();
      }

      function desenharMira(x, y) {
        g.save();
        g.lineCap = 'round';
        const tracos = () => {
          g.beginPath();
          g.arc(x, y, 15, 0, Math.PI * 2);
          [[-25, -9], [9, 25]].forEach(([a, b]) => {
            g.moveTo(x + a, y);
            g.lineTo(x + b, y);
            g.moveTo(x, y + a);
            g.lineTo(x, y + b);
          });
        };
        g.strokeStyle = alfa(COR.fundo, 0.7);
        g.lineWidth = 5;
        tracos();
        g.stroke();
        g.strokeStyle = COR.amarelo;
        g.lineWidth = 2.5;
        tracos();
        g.stroke();
        g.fillStyle = COR.amarelo;
        g.beginPath();
        g.arc(x, y, 2.5, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }

      function desenhar(errada = null) {
        desenharCena();
        if (!jogo) {
          desenharTrilho(0);
          desenharTrilho(1);
          desenharBalcao();
          return;
        }
        // do fundo para a frente: placas do trilho, depois o trilho (que esconde o pé delas)
        for (const i of [0, 1, 2]) {
          jogo.placas.forEach((p) => { if (p.trilho === i) desenharPlaca(p, p === errada); });
          if (i < 2) desenharTrilho(i);
          else desenharBalcao();
        }
        // jatos d'água: do bico até o ponto
        const s = escalaPistola();
        const by = A + 6 * s;
        jogo.jatos.forEach((j) => {
          const ang = Math.atan2(j.y - by, j.x - L / 2);
          const ox = L / 2 + Math.cos(ang) * BICO * s;
          const oy = by + Math.sin(ang) * BICO * s;
          const k = Math.max(0, j.v / 0.12);
          g.save();
          g.lineCap = 'round';
          g.strokeStyle = alfa(COR.claro, 0.25 + 0.35 * k);
          g.lineWidth = 9 * s;
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(j.x, j.y);
          g.stroke();
          g.strokeStyle = alfa(COR.branco, 0.85 * k);
          g.lineWidth = 3 * s;
          g.stroke();
          g.restore();
        });
        jogo.respingos.forEach((r) => {
          g.globalAlpha = Math.max(0, Math.min(1, r.v * 2));
          g.fillStyle = r.cor;
          g.beginPath();
          g.arc(r.x, r.y, 3.5, 0, Math.PI * 2);
          g.fill();
        });
        g.globalAlpha = 1;
        if (jogo.pausa > 0 && !jogo.fim) {
          const meio = meioCampo();
          g.fillStyle = alfa(COR.fundo, 0.62);
          g.fillRect(0, T, L, balcaoY() - T);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = COR.claro;
          g.font = `800 ${Math.max(16, Math.min(22, L / 26))}px ${FONTE}`;
          g.fillText(`NÍVEL ${jogo.nivel} · ${jogo.p.meta} placas certas`, L / 2, meio - 26);
          g.fillStyle = COR.amarelo;
          let tam = Math.max(18, Math.min(34, L / 18));
          g.font = `800 ${tam}px ${FONTE}`;
          while (g.measureText(jogo.regra.texto).width > L - 32 && tam > 12) {
            tam -= 1;
            g.font = `800 ${tam}px ${FONTE}`;
          }
          g.fillText(jogo.regra.texto, L / 2, meio + 18);
        }
        const m = mira || { x: L / 2, y: meioCampo() };
        desenharPistola(m.x, m.y, jogo.coice);
        if (mira) desenharMira(mira.x, mira.y);
      }

      /* ---------- Controles ---------- */
      const ponto = (e) => {
        const r = tela.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const aoMover = (e) => {
        if (e.pointerType === 'mouse') mira = ponto(e);
      };
      const aoSair = () => (mira = null);
      const aoAtirar = (e) => {
        e.preventDefault();
        const p = ponto(e);
        if (e.pointerType !== 'mouse') mira = p;
        atirar(p.x, p.y, e.pointerType === 'mouse' ? 6 : 10);
      };
      tela.addEventListener('pointermove', aoMover);
      tela.addEventListener('pointerleave', aoSair);
      tela.addEventListener('pointerdown', aoAtirar);
      // O palco muda de tamanho com a janela, o celular girando e a tela cheia: mede de novo
      const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => medir()) : null;
      if (observador) { observador.observe(palco); observador.observe(topo); } // a regra pode quebrar em duas linhas
      else window.addEventListener('resize', medir);
      limpar.push(() => (observador ? observador.disconnect() : window.removeEventListener('resize', medir)));

      ctx.guia([
        { alvo: '#sd-tiro-canvas', desenho: 'alvo', titulo: 'Pistola d\'água', texto: `Mire e clique (ou toque) nas placas. A pistola tem ${TANQUE} jatos e recarrega sozinha.` },
        { alvo: '.sd-tiro__passos', desenho: 'estrela', titulo: 'Leia a regra', texto: 'Cada nível tem uma regra, que aparece no alto da tela. Acertar uma placa que NÃO combina com ela elimina na hora.' },
        { desenho: 'relogio', titulo: 'Não deixe escapar', texto: 'A barrinha amarela embaixo de cada placa mostra quanto tempo ela fica. Placa certa que some também elimina. Acertou todas as certas do nível? Sobe de nível. 1 ponto por acerto; vale o seu recorde.' },
      ]);
      medir();
      // Só para os testes automáticos (window.__diverTeste existe apenas quando o teste cria): ver a partida e atirar numa placa
      if (window.__diverTeste) window.__diverTeste.tiro = { jogo: () => jogo, atirar: (x, y) => atirar(x, y), medidas: () => ({ L, A, T, balcao: balcaoY(), pistola: BICO * escalaPistola() }) };
      regraEl.textContent = 'Tiro ao Alvo';
      mostrarAbertura();

      return {
        emAndamento: () => !!(jogo && !jogo.fim),
        parar() {
          cancelAnimationFrame(quadro);
          jogo = null;
          limpar.forEach((f) => f());
          if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { /* já saiu */ });
        },
      };
    },
  });
})();

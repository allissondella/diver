/*
 * Tiro ao Alvo (Sala de Descompressão) — pistola d'água em primeira pessoa, por níveis.
 * - Cada nível tem uma REGRA ("Só os peixes", "Números primos", "Peixes OU frutas", "Tudo MENOS aves"...) e uma
 *   leva de placas. Acertou todas as placas certas da leva? Sobe de nível (e a regra muda).
 * - Acertou uma placa errada: eliminação na hora. Deixou uma placa certa escapar: eliminação na hora também.
 * - 1 ponto por acerto. Vale o recorde no placar da sala.
 * - Dificuldade: o nível 1 é de aquecimento; do 2 em diante as placas somem mais rápido, ficam menores, deslizam
 *   (e balançam a partir do 3), aparecem várias ao mesmo tempo e a leva cresce 5 placas certas por nível.
 *   Do nível 4 em diante podem vir regras em dupla ("A OU B"); do 5 em diante, "Tudo MENOS ...".
 * Desenho todo no <canvas> (nada de imagem de fora). Com "reduzir movimento", as placas não deslizam nem balançam
 * e não há respingos (o jogo continua acelerando pelo tempo de cada placa).
 */
(() => {
  const { h, icone, plural } = UI;
  const COR = { turquesa: '#14B8A6', claro: '#5EEAD4', amarelo: '#FACC15', coral: '#FB7185', texto: '#E6F1FF', suave: '#A9BCD6', fundo: '#06172D', marinho: '#0B2545', sup: '#12325A', sup2: '#1A416F', escuro: '#0B2545' };
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
    descricao: 'Pistola d\'água na mão: acerte só as placas da regra. Placa errada ou placa certa que escapa: eliminação. Cada nível fica mais rápido.',
    abrir(ctx) {
      let jogo = null; // partida em andamento
      let quadro = 0;
      let limpar = [];

      const hud = h('div', { class: 'sd-tiro__hud', 'aria-live': 'off' });
      const regraEl = h('p', { class: 'sd-tiro__regra', id: 'sd-tiro-regra', 'aria-live': 'assertive' });
      const tela = h('canvas', { class: 'sd-tiro__canvas', id: 'sd-tiro-canvas', tabindex: '-1', 'aria-label': 'Área de tiro: mire e clique nas placas da regra' });
      const palco = h('div', { class: 'sd-tiro__palco' }, tela);
      const abertura = h('div', { class: 'sd-tiro__abertura' });
      ctx.container.replaceChildren(h('div', { class: 'sd-tiro' }, regraEl, hud, palco, abertura));
      const g = tela.getContext('2d');
      let L = 0;
      let A = 0;
      let mira = null; // { x, y } do ponteiro (mouse); no toque, só aparece no disparo

      function medir() {
        const largura = Math.max(280, palco.clientWidth || 320);
        const alturaUtil = window.innerHeight - (palco.getBoundingClientRect().top || 160) - 24;
        const altura = Math.round(Math.max(320, Math.min(largura * 0.72, alturaUtil, 620)));
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        tela.width = Math.round(largura * dpr);
        tela.height = Math.round(altura * dpr);
        tela.style.height = `${altura}px`;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        L = largura;
        A = altura;
        if (!jogo) desenharParado();
      }

      /* ---------- Abertura e fim ---------- */
      function mostrarAbertura(fim = null) {
        const recorde = ctx.recorde();
        abertura.hidden = false;
        abertura.replaceChildren(h('div', { class: 'cartao sd-tiro__cartao' },
          fim ? h('h2', { class: 'texto-erro', text: fim.motivo === 'errada' ? 'Placa errada!' : 'Deixou escapar!' }) : h('h2', { text: 'Pistola carregada' }),
          fim ? h('p', { text: fim.porque }) : null,
          fim ? h('p', { class: 'sd-tiro__total' }, h('strong', { text: plural(fim.pontos, 'ponto', 'pontos') }), ` · chegou ao nível ${fim.nivel}${fim.pontos >= recorde && fim.pontos > 0 ? ' · novo recorde!' : ''}`)
            : h('ul', { class: 'sd-tiro__regras' },
              h('li', {}, 'Cada nível tem uma regra. Acerte só as placas que combinam com ela.'),
              h('li', {}, h('strong', { text: 'Placa errada = eliminação. Placa certa que escapa = eliminação.' })),
              h('li', {}, 'Acertou todas as placas certas do nível? Sobe de nível, com regra nova e mais placas.'),
              h('li', {}, '1 ponto por acerto. O nível 1 é aquecimento: do 2 em diante, segura firme!')),
          recorde ? h('p', { class: 'texto-suave', text: `Seu recorde: ${plural(recorde, 'ponto', 'pontos')}` }) : null,
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-tiro-comecar', onclick: comecar }, icone('i-alvo'), fim ? 'Jogar de novo' : 'Começar'),
            fim ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala') : null)));
        const b = abertura.querySelector('#sd-tiro-comecar');
        if (b) b.focus({ preventScroll: true });
      }

      function desenharParado() {
        desenharFundo();
        desenharPistola(L / 2, A * 0.35, 0);
      }

      /* ---------- Partida ---------- */
      function comecar() {
        abertura.hidden = true;
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
        jogo.pausa = jogo.nivel === 1 ? 1.4 : 1.8; // respiro para ler a regra nova
        jogo.proxima = 0.3;
        regraEl.textContent = jogo.regra.texto;
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
        if (certa) jogo.certasCriadas++;
        const raio = Math.max(26, Math.min(54, L / 11)) * p.raio;
        const margem = raio + 8;
        // Procura um lugar livre (placa nascendo em cima de outra seria injusto)
        let x = 0;
        let y = 0;
        for (let t = 0; t < 12; t++) {
          x = margem + jogo.r() * (L - margem * 2);
          y = margem + 30 + jogo.r() * Math.max(10, A * 0.64 - margem - 30);
          if (!jogo.placas.some((o) => Math.hypot(o.x - x, o.y - y) < o.raio + raio + 8)) break;
        }
        const mexe = !UI.movimentoReduzido;
        jogo.placas.push({ ...item, certa, x, y, y0: y, raio, nasceu: jogo.t, vida: p.vida * (0.9 + jogo.r() * 0.2),
          vx: mexe && p.desliza ? (jogo.r() < 0.5 ? -1 : 1) * p.desliza * (0.7 + jogo.r() * 0.6) : 0,
          amp: mexe ? p.balanca : 0, fase: jogo.r() * Math.PI * 2, regra: jogo.regra });
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
        // placas: andam, balançam e somem
        for (const p of jogo.placas) {
          p.x += p.vx * dt;
          if (p.x < p.raio || p.x > L - p.raio) p.vx = -p.vx;
          if (p.amp) p.y = p.y0 + Math.sin(jogo.t * 3 + p.fase) * p.amp;
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

      function atirar(x, y) {
        if (!jogo || jogo.fim || jogo.pausa > 0) return;
        if (jogo.agua <= 0) return; // tanque vazio: a barra de água mostra a recarga
        jogo.agua--;
        jogo.coice = 1;
        jogo.jatos.push({ x, y, v: 0.12 });
        // placa mais "na frente" (a mais nova) que contém o ponto
        const alvo = [...jogo.placas].reverse().find((p) => Math.hypot(p.x - x, p.y - y) <= p.raio + 6);
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
        hud.replaceChildren(
          h('span', { class: 'sd-tiro__pontos' }, icone('i-estrela'), `${jogo.pontos}`),
          h('span', { class: 'sd-tiro__nivel', text: `Nível ${jogo.nivel}` }),
          h('span', { class: 'sd-tiro__seq', text: `${jogo.acertosNivel}/${jogo.p.meta} do nível` }),
          h('span', { class: 'sd-tiro__agua' }, h('span', { class: 'sd-tiro__agua-barra', style: `width:${(jogo.agua / TANQUE) * 100}%` }), h('span', { class: 'visualmente-oculto', text: `${jogo.agua} jatos` })));
      }

      /* ---------- Desenho ---------- */
      function desenharFundo() {
        const grad = g.createLinearGradient(0, 0, 0, A);
        grad.addColorStop(0, COR.marinho);
        grad.addColorStop(1, COR.fundo);
        g.fillStyle = grad;
        g.fillRect(0, 0, L, A);
        // faixas de luz e o "balcão" da barraca de tiro
        g.globalAlpha = 0.06;
        g.fillStyle = COR.claro;
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.moveTo(L * (0.1 + i * 0.25), 0);
          g.lineTo(L * (0.2 + i * 0.25), 0);
          g.lineTo(L * (0.05 + i * 0.25), A);
          g.lineTo(L * (-0.05 + i * 0.25), A);
          g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = COR.sup;
        g.fillRect(0, A * 0.82, L, A * 0.18);
        g.fillStyle = COR.turquesa;
        g.fillRect(0, A * 0.82, L, 4);
      }

      function desenharPlaca(p, destaque = false) {
        const idade = jogo ? jogo.t - p.nasceu : 1;
        const entra = UI.movimentoReduzido ? 1 : Math.min(1, idade / 0.15);
        const resto = jogo ? Math.max(0, 1 - idade / p.vida) : 1;
        const r = p.raio * entra;
        g.save();
        g.translate(p.x, p.y);
        // haste
        g.fillStyle = COR.sup2;
        g.fillRect(-3, r * 0.6, 6, A);
        // placa
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.fillStyle = destaque ? COR.coral : COR.texto;
        g.fill();
        g.lineWidth = 5;
        g.strokeStyle = destaque ? COR.coral : COR.turquesa;
        g.stroke();
        g.beginPath();
        g.arc(0, 0, r * 0.78, 0, Math.PI * 2);
        g.lineWidth = 2;
        g.strokeStyle = 'rgba(11, 37, 69, 0.25)';
        g.stroke();
        // tempo restante (anel amarelo que vai fechando)
        g.beginPath();
        g.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * resto);
        g.lineWidth = 3;
        g.strokeStyle = COR.amarelo;
        g.stroke();
        g.fillStyle = COR.escuro;
        if (p.forma) desenharForma(p.forma, r * 0.5);
        else {
          const texto = p.rotulo;
          let tam = r * (texto.length <= 2 ? 0.8 : texto.length <= 5 ? 0.46 : 0.34);
          g.font = `800 ${tam}px "Plus Jakarta Sans", system-ui, sans-serif`;
          while (g.measureText(texto).width > r * 1.7 && tam > 9) {
            tam -= 1;
            g.font = `800 ${tam}px "Plus Jakarta Sans", system-ui, sans-serif`;
          }
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(texto, 0, 1);
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

      const escalaPistola = () => Math.max(1, Math.min(1.5, A / 420));
      function desenharPistola(mx, my, coice) {
        const bx = L / 2;
        const by = A + 10;
        const ang = Math.atan2(my - by, mx - bx);
        g.save();
        g.translate(bx, by);
        g.rotate(ang + Math.PI / 2);
        g.scale(escalaPistola(), escalaPistola());
        g.translate(0, coice * 12);
        // cabo
        g.fillStyle = COR.coral;
        g.strokeStyle = COR.fundo;
        g.lineWidth = 4;
        g.beginPath();
        g.roundRect ? g.roundRect(-22, -40, 44, 80, 12) : g.rect(-22, -40, 44, 80);
        g.fill();
        g.stroke();
        // cano
        g.fillStyle = COR.turquesa;
        g.beginPath();
        g.roundRect ? g.roundRect(-12, -110, 24, 80, 8) : g.rect(-12, -110, 24, 80);
        g.fill();
        g.stroke();
        // bico
        g.fillStyle = COR.amarelo;
        g.fillRect(-7, -122, 14, 14);
        g.strokeRect(-7, -122, 14, 14);
        // tanque d'água
        const nivelAgua = jogo ? jogo.agua / TANQUE : 1;
        g.fillStyle = 'rgba(230, 241, 255, 0.25)';
        g.beginPath();
        g.arc(0, -46, 20, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.save();
        g.beginPath();
        g.arc(0, -46, 18, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = COR.claro;
        g.fillRect(-20, -46 + 18 - 36 * nivelAgua, 40, 36 * nivelAgua);
        g.restore();
        g.restore();
      }

      function desenharMira(x, y) {
        g.save();
        g.strokeStyle = COR.amarelo;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(x, y, 14, 0, Math.PI * 2);
        g.moveTo(x - 22, y);
        g.lineTo(x - 8, y);
        g.moveTo(x + 8, y);
        g.lineTo(x + 22, y);
        g.moveTo(x, y - 22);
        g.lineTo(x, y - 8);
        g.moveTo(x, y + 8);
        g.lineTo(x, y + 22);
        g.stroke();
        g.restore();
      }

      function desenhar(errada = null) {
        desenharFundo();
        if (!jogo) return;
        jogo.placas.forEach((p) => desenharPlaca(p, p === errada));
        // jatos d'água (do bico até o ponto)
        jogo.jatos.forEach((j) => {
          g.save();
          g.strokeStyle = 'rgba(94, 234, 212, 0.8)';
          g.lineWidth = 5;
          g.lineCap = 'round';
          g.beginPath();
          const bico = 110 * escalaPistola();
          const ang = Math.atan2(j.y - (A + 10), j.x - L / 2);
          g.moveTo(L / 2 + Math.cos(ang) * bico, A + 10 + Math.sin(ang) * bico);
          g.lineTo(j.x, j.y);
          g.stroke();
          g.restore();
        });
        jogo.respingos.forEach((s) => {
          g.globalAlpha = Math.max(0, Math.min(1, s.v * 2));
          g.fillStyle = s.cor;
          g.beginPath();
          g.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
          g.fill();
        });
        g.globalAlpha = 1;
        if (jogo.pausa > 0 && !jogo.fim) {
          g.fillStyle = 'rgba(6, 23, 45, 0.6)';
          g.fillRect(0, 0, L, A);
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = COR.claro;
          g.font = `800 ${Math.max(16, Math.min(22, L / 26))}px "Plus Jakarta Sans", system-ui, sans-serif`;
          g.fillText(`NÍVEL ${jogo.nivel} · ${jogo.p.meta} placas certas`, L / 2, A * 0.3);
          g.fillStyle = COR.amarelo;
          let tam = Math.max(18, Math.min(34, L / 18));
          g.font = `800 ${tam}px "Plus Jakarta Sans", system-ui, sans-serif`;
          while (g.measureText(jogo.regra.texto).width > L - 32 && tam > 12) {
            tam -= 1;
            g.font = `800 ${tam}px "Plus Jakarta Sans", system-ui, sans-serif`;
          }
          g.fillText(jogo.regra.texto, L / 2, A * 0.42);
        }
        const m = mira || { x: L / 2, y: A * 0.35 };
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
        atirar(p.x, p.y);
      };
      tela.addEventListener('pointermove', aoMover);
      tela.addEventListener('pointerleave', aoSair);
      tela.addEventListener('pointerdown', aoAtirar);
      const aoRedim = () => medir();
      window.addEventListener('resize', aoRedim);
      limpar = [() => window.removeEventListener('resize', aoRedim)];

      ctx.guia([
        { alvo: '#sd-tiro-canvas', desenho: 'alvo', titulo: 'Pistola d\'água', texto: `Mire e clique (ou toque) nas placas. A pistola tem ${TANQUE} jatos e recarrega sozinha.` },
        { alvo: '#sd-tiro-regra', desenho: 'estrela', titulo: 'Leia a regra', texto: 'Cada nível tem uma regra. Acertar uma placa que NÃO combina com ela elimina na hora.' },
        { desenho: 'relogio', titulo: 'Não deixe escapar', texto: 'O anel amarelo mostra quanto tempo a placa fica. Placa certa que some também elimina. Acertou todas as certas do nível? Sobe de nível. 1 ponto por acerto; vale o seu recorde.' },
      ]);
      medir();
      // Só para os testes automáticos (window.__diverTeste existe apenas quando o teste cria): ver a partida e atirar numa placa
      if (window.__diverTeste) window.__diverTeste.tiro = { jogo: () => jogo, atirar: (x, y) => atirar(x, y) };
      regraEl.textContent = 'Tiro ao Alvo';
      mostrarAbertura();

      return {
        emAndamento: () => !!(jogo && !jogo.fim),
        parar() {
          cancelAnimationFrame(quadro);
          jogo = null;
          limpar.forEach((f) => f());
        },
      };
    },
  });
})();

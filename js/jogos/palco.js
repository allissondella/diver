/*
 * jogos/palco.js — o palco em tela toda dos jogos da Sala de Jogos (2026-10-18, pedido do usuário: "vamos atualizar nossos
 * jogos para esse estilo de design que ficou o jogo da pistola, tela cheia, bonito, da uma sensação de entrar realmente no
 * jogo [...] o realismo a fluidez, pode aplicar para todos"). Regras, pontos, XP e conteúdo de cada jogo ficam iguais: o
 * palco é a roupa.
 * - A cena: um <canvas> atrás de tudo, desenhado pelo jogo (cada um tem a sua), com as reações comuns de acerto, erro,
 *   combo e fim (partículas, clarão e tremidinha). Com "reduzir movimento", a cena fica parada e não há partículas nem
 *   tremidinha; ela só muda quando o jogo muda (a água sobe, o chefão perde vida).
 * - O conteúdo do jogo numa coluna por cima da cena (a pergunta num cartão de vidro escuro) e o placar em pílulas.
 * - A abertura e o fim num cartão só, no desenho do Tiro ao Alvo: "Em números", o XP da rodada, "O que revisar" e
 *   "Jogar de novo" sem sair do jogo (ctx.concluirRodada; o fim nunca leva para outra tela).
 * - Som sintetizado na hora (botão "Som" na barra; a escolha fica só no aparelho) e "Tela cheia" de verdade.
 * Palco.montar(ctx, { id, cena }) → { area, hud(...), reagir(tipo, onde), estado, abertura({...}), terminar(res, {...}),
 *   som, jogando(), parar() }. A cena: { desenhar(g, L, A, t, dt, estado), reagir?(tipo, info, estado), medir?(L, A) }.
 * Desenho e cores: tokens do css/tokens.css (UI.cor). Faz parte do pacote "jogos" e vem antes dos jogos.
 */
const Palco = (() => {
  const { h, icone, plural } = UI;
  const COR = {
    turquesa: UI.cor('primaria'), claro: UI.cor('primaria-clara'), amarelo: UI.cor('destaque'), coral: UI.cor('erro'),
    coralClaro: UI.cor('erro-clara'), texto: UI.cor('texto-1'), suave: UI.cor('texto-2'), fundo: UI.cor('fundo-0'), marinho: UI.cor('fundo-1'),
    fundo2: UI.cor('fundo-2'), sup: UI.cor('superficie-1'), sup2: UI.cor('superficie-2'), sup3: UI.cor('superficie-3'),
    turquesaEscura: UI.cor('primaria-escura'), turquesaSombra: UI.cor('primaria-sombra'), lilas: UI.cor('lilas'), azul: UI.cor('info'),
    laranja: UI.cor('aviso'), verde: UI.cor('sucesso'), perola: UI.cor('perola'), branco: UI.cor('claro'), escuro: UI.cor('texto-inverso'),
    amareloSombra: UI.cor('amarelo-sombra'), coralSombra: UI.cor('erro-sombra'),
  };
  /** [r, g, b] de '#RRGGBB' ou de 'rgb(r,g,b)' (o que misturar() devolve: assim dá para pôr transparência numa mistura) */
  const rgb = (c) => {
    const s = String(c).trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(s);
    if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const r = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
    return r ? [Number(r[1]), Number(r[2]), Number(r[3])] : [0, 0, 0];
  };
  const misturar = (a, b, t) => { const x = rgb(a); const y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
  const alfa = (c, a) => `rgba(${rgb(c).join(',')},${a})`;
  const suave = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const vibrar = (ms) => { try { if (!UI.movimentoReduzido && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } };

  /* ---------- Som (sintetizado na hora, sem arquivo) ---------- */
  const CHAVE_SOM = 'diver-local:v1:jogos-som';
  const lerSom = () => { try { return localStorage.getItem(CHAVE_SOM) !== '0'; } catch (e) { return true; } };
  const gravarSom = (ligado) => { try { localStorage.setItem(CHAVE_SOM, ligado ? '1' : '0'); } catch (e) { /* sem armazenamento: vale só agora */ } };
  function criarSom() {
    let ac = null;
    let saida = null;
    let ruido = null;
    const som = {
      ligado: lerSom(),
      iniciar() {
        try {
          if (!ac) {
            ac = new (window.AudioContext || window.webkitAudioContext)();
            saida = ac.createDynamicsCompressor();
            saida.threshold.value = -16;
            saida.ratio.value = 4;
            saida.connect(ac.destination);
            ruido = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
            const d = ruido.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          }
          if (ac.state === 'suspended') ac.resume();
        } catch (e) { ac = null; }
      },
      tom(freq, dur, tipo = 'sine', vol = 0.08, desliza = 1, atraso = 0) {
        if (!som.ligado || !ac) return;
        try {
          const t = ac.currentTime + atraso;
          const o = ac.createOscillator();
          const v = ac.createGain();
          o.type = tipo;
          o.frequency.setValueAtTime(freq, t);
          if (desliza !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * desliza), t + dur);
          v.gain.setValueAtTime(0.0001, t);
          v.gain.exponentialRampToValueAtTime(vol, t + 0.012);
          v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(v).connect(saida);
          o.start(t);
          o.stop(t + dur + 0.03);
        } catch (e) { /* sem som, sem problema */ }
      },
      chiado({ filtro = 'bandpass', de = 2000, ate = de, q = 1, vol = 0.1, dur = 0.15, ataque = 0.005, atraso = 0 } = {}) {
        if (!som.ligado || !ac || !ruido) return;
        try {
          const t = ac.currentTime + atraso;
          const fonte = ac.createBufferSource();
          fonte.buffer = ruido;
          const f = ac.createBiquadFilter();
          f.type = filtro;
          f.Q.value = q;
          f.frequency.setValueAtTime(de, t);
          if (ate !== de) f.frequency.exponentialRampToValueAtTime(ate, t + dur);
          const v = ac.createGain();
          v.gain.setValueAtTime(0.0001, t);
          v.gain.exponentialRampToValueAtTime(vol, t + ataque);
          v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          fonte.connect(f).connect(v).connect(saida);
          fonte.start(t, Math.random() * 0.5);
          fonte.stop(t + dur + 0.05);
        } catch (e) { /* sem som, sem problema */ }
      },
      fechar() { try { if (ac) ac.close(); } catch (e) { /* nada */ } ac = null; },
    };
    return som;
  }
  const varia = () => 0.94 + Math.random() * 0.12;
  const SONS = {
    acerto: (s) => { const r = varia(); s.tom(660 * r, 0.12, 'sine', 0.08, 1.5); s.tom(990 * r, 0.16, 'sine', 0.05, 1.2, 0.07); s.chiado({ filtro: 'highpass', de: 5000, vol: 0.03, dur: 0.12, atraso: 0.05 }); },
    erro: (s) => { s.tom(300, 0.22, 'triangle', 0.07, 0.75); s.tom(200, 0.26, 'sine', 0.06, 0.8, 0.08); },
    combo: (s) => [784, 988, 1175, 1568].forEach((f, i) => s.tom(f, 0.12, 'sine', 0.055, 1, i * 0.06)),
    clique: (s) => s.tom(1200 * varia(), 0.03, 'sine', 0.03),
    tique: (s) => s.tom(1500, 0.025, 'square', 0.025),
    virar: (s) => s.chiado({ de: 900, ate: 2400, q: 0.8, vol: 0.06, dur: 0.16 }),
    bolhas: (s) => { for (let i = 0; i < 4; i++) s.tom(500 + Math.random() * 500, 0.06, 'sine', 0.035, 2.2, i * 0.05 + Math.random() * 0.03); },
    onda: (s) => { s.chiado({ filtro: 'lowpass', de: 600, ate: 2200, q: 0.6, vol: 0.18, dur: 0.6, ataque: 0.25 }); s.chiado({ filtro: 'lowpass', de: 1800, ate: 300, q: 0.6, vol: 0.12, dur: 0.8, atraso: 0.35 }); },
    trovao: (s) => { s.chiado({ filtro: 'lowpass', de: 220, ate: 80, q: 0.5, vol: 0.32, dur: 1.4, ataque: 0.02 }); s.chiado({ filtro: 'lowpass', de: 900, ate: 120, q: 0.4, vol: 0.12, dur: 0.5 }); },
    golpe: (s) => { const r = varia(); s.tom(180 * r, 0.12, 'triangle', 0.1, 0.5); s.chiado({ de: 1400 * r, ate: 400, q: 0.9, vol: 0.22, dur: 0.18 }); },
    ataque: (s) => { s.tom(110, 0.4, 'sawtooth', 0.05, 0.6); s.chiado({ filtro: 'lowpass', de: 500, ate: 140, q: 0.7, vol: 0.2, dur: 0.45 }); },
    vitoria: (s) => [523, 659, 784, 1047].forEach((f, i) => s.tom(f, 0.22, 'sine', 0.08, 1, i * 0.1)),
    derrota: (s) => [392, 330, 262, 196].forEach((f, i) => s.tom(f, 0.24, 'triangle', 0.06, 1, i * 0.12)),
  };

  /* ---------- Ajudas de desenho para as cenas ---------- */
  const pintar = {
    COR, misturar, alfa, suave,
    /** Um degradê vertical com as paradas [[0, cor], [1, cor]] */
    degrade(g, y0, y1, paradas) {
      const d = g.createLinearGradient(0, y0, 0, y1);
      paradas.forEach(([k, c]) => d.addColorStop(k, c));
      return d;
    },
    /** Uma linha d'água ondulada de x0 a x1 na altura y (amplitude a, comprimento c, fase f); fecha até "fundo" */
    agua(g, x0, x1, y, a, c, f, fundo) {
      g.beginPath();
      g.moveTo(x0, fundo);
      for (let x = x0; x <= x1 + 8; x += 8) g.lineTo(x, y + Math.sin(x / c + f) * a + Math.sin(x / (c * 0.43) - f * 1.7) * a * 0.35);
      g.lineTo(x1, fundo);
      g.closePath();
    },
    /** Raios de luz que descem da superfície (a luz no fundo do mar) */
    raios(g, L, A, t, cor, forca = 0.12) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = L * (0.12 + i * 0.17) + Math.sin(t * 0.2 + i * 1.7) * L * 0.03;
        const w = L * (0.05 + (i % 3) * 0.025);
        const d = g.createLinearGradient(0, 0, 0, A);
        d.addColorStop(0, alfa(cor, forca * (0.6 + 0.4 * Math.sin(t * 0.5 + i))));
        d.addColorStop(1, alfa(cor, 0));
        g.fillStyle = d;
        g.beginPath();
        g.moveTo(x - w * 0.3, 0);
        g.lineTo(x + w * 0.3, 0);
        g.lineTo(x + w * 1.6 + L * 0.06, A);
        g.lineTo(x - w * 0.4 + L * 0.06, A);
        g.closePath();
        g.fill();
      }
      g.restore();
    },
    /** Pontinhos que boiam (neve marinha, bolhinhas): sempre os mesmos, andando com o tempo */
    poeira(g, L, A, t, cor, n = 40, sobe = 12) {
      g.fillStyle = cor;
      for (let i = 0; i < n; i++) {
        const sx = (i * 9301 + 49297) % 233280 / 233280;
        const sy = (i * 4337 + 1777) % 1000 / 1000;
        const x = (sx * L + Math.sin(t * 0.3 + i) * 12) % L;
        const y = (((sy * A - t * sobe * (0.5 + (i % 5) * 0.2)) % A) + A) % A;
        const r = 0.8 + (i % 4) * 0.5;
        g.globalAlpha = 0.25 + (i % 3) * 0.15;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    },
  };

  /* ---------- O palco ---------- */
  function montar(ctx, { id = 'jogo', cena = {} } = {}) {
    const rm = UI.movimentoReduzido;
    const canvas = h('canvas', { class: 'palco__cena', 'aria-hidden': 'true' });
    const hudEl = h('div', { class: 'palco__hud' });
    const area = h('div', { class: 'palco__area' });
    const coluna = h('div', { class: 'palco__coluna' }, hudEl, area);
    const rolagem = h('div', { class: 'palco__rolagem' }, coluna);
    const camada = h('div', { class: 'sd-tiro__abertura palco__camada', hidden: true });
    const aviso = h('p', { class: 'visualmente-oculto', 'aria-live': 'polite' });
    const raiz = h('div', { class: `palco palco--${id}` }, canvas, rolagem, camada, aviso);
    ctx.container.replaceChildren(raiz);
    const g = canvas.getContext('2d');
    const som = criarSom();
    const estado = { rm }; // livre para a cena (o jogo põe o que ela precisa desenhar)
    const limpar = [];
    let L = 0;
    let A = 0;
    let dpr = 1;
    let vivo = true;
    let jogando = false;
    let quadro = 0;
    let t = 0;
    const particulas = [];
    let clarao = null; // { cor, k }
    let tremor = 0;

    // Os botões do jogo na barra de cima: "Som" e, onde o navegador deixa, "Tela cheia" de verdade
    const botaoSom = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-label': 'Som', onclick: () => {
      som.ligado = !som.ligado;
      gravarSom(som.ligado);
      if (som.ligado) som.iniciar();
      pintarSom();
    } });
    function pintarSom() {
      botaoSom.setAttribute('aria-pressed', String(som.ligado));
      botaoSom.replaceChildren(icone(som.ligado ? 'i-som' : 'i-mudo'), h('span', { class: 'sd-barra__texto', text: 'Som' }));
    }
    pintarSom();
    const podeCheia = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
    const botaoCheia = podeCheia ? h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-pressed': 'false', onclick: () => {
      const pedido = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (pedido && pedido.catch) pedido.catch(() => { /* o navegador recusou: segue na janela */ });
    } }) : null;
    function pintarCheia() {
      const on = !!document.fullscreenElement;
      botaoCheia.setAttribute('aria-pressed', String(on));
      botaoCheia.replaceChildren(icone(on ? 'i-recolher' : 'i-expandir'), h('span', { class: 'sd-barra__texto', text: on ? 'Sair da tela cheia' : 'Tela cheia' }));
    }
    if (ctx.barra) ctx.barra(h('div', { class: 'sd-tiro__botoes' }, botaoSom, botaoCheia));
    if (botaoCheia) {
      pintarCheia();
      document.addEventListener('fullscreenchange', pintarCheia);
      limpar.push(() => document.removeEventListener('fullscreenchange', pintarCheia));
    }

    /* --- o canvas acompanha o tamanho da tela --- */
    function medir() {
      const r = raiz.getBoundingClientRect();
      L = Math.max(280, Math.round(r.width));
      A = Math.max(240, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(L * dpr);
      canvas.height = Math.round(A * dpr);
      if (cena.medir) cena.medir(L, A, estado);
      desenhar(0);
    }
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => medir()) : null;
    if (observador) observador.observe(raiz);
    else window.addEventListener('resize', medir);
    limpar.push(() => (observador ? observador.disconnect() : window.removeEventListener('resize', medir)));

    function desenhar(dt) {
      if (!L) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const treme = tremor > 0 && !rm ? tremor * 6 : 0;
      if (treme) g.translate((Math.random() - 0.5) * treme, (Math.random() - 0.5) * treme);
      if (cena.desenhar) cena.desenhar(g, L, A, rm ? 0 : t, dt, estado);
      else {
        g.fillStyle = pintar.degrade(g, 0, A, [[0, COR.marinho], [1, COR.fundo]]);
        g.fillRect(0, 0, L, A);
      }
      // as partículas comuns (gotas, faíscas, bolhas)
      for (const p of particulas) {
        g.globalAlpha = Math.max(0, Math.min(1, p.v * 2));
        g.fillStyle = p.cor;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      if (clarao && clarao.k > 0) { // o clarão do acerto (turquesa) ou do erro (coral), na tela toda
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = alfa(clarao.cor, 0.22 * clarao.k);
        g.fillRect(0, 0, L, A);
      }
    }

    let antes = performance.now();
    function passo(agora) {
      if (!vivo) return;
      const dt = Math.max(0, Math.min(0.05, (agora - antes) / 1000));
      antes = agora;
      if (!document.hidden) {
        t += dt;
        for (let i = particulas.length - 1; i >= 0; i--) {
          const p = particulas[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += p.peso * dt;
          p.v -= dt;
          if (p.v <= 0) particulas.splice(i, 1);
        }
        if (clarao) clarao.k = Math.max(0, clarao.k - dt * 2.6);
        tremor = Math.max(0, tremor - dt * 4);
        desenhar(dt);
      }
      quadro = requestAnimationFrame(passo);
    }
    quadro = requestAnimationFrame(passo);

    /** Onde, na tela, fica o meio de um elemento (para as partículas saírem dele) */
    function pontoDe(el) {
      if (!el || !el.getBoundingClientRect) return { x: L / 2, y: A * 0.45 };
      const r = el.getBoundingClientRect();
      const base = raiz.getBoundingClientRect();
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    }
    function espirrar(x, y, cor, n, forca = 1) {
      if (rm) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (60 + Math.random() * 220) * forca;
        particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80 * forca, peso: 420, v: 0.5 + Math.random() * 0.4, cor, r: 1.5 + Math.random() * 2.5 });
      }
      if (particulas.length > 300) particulas.splice(0, particulas.length - 300);
    }

    /**
     * Reação comum: som, partículas, clarão e tremidinha. tipo: 'acerto' | 'erro' | 'combo' | 'vitoria' | 'derrota' |
     * ou o nome de um som. onde: { el } (as partículas saem do elemento) ou { x, y }.
     */
    function reagir(tipo, onde = {}) {
      const p = onde.el ? pontoDe(onde.el) : { x: onde.x ?? L / 2, y: onde.y ?? A * 0.45 };
      if (SONS[tipo]) SONS[tipo](som);
      if (tipo === 'acerto') {
        espirrar(p.x, p.y, COR.claro, 14);
        espirrar(p.x, p.y, COR.branco, 6, 0.7);
        if (!rm) clarao = { cor: COR.turquesa, k: 0.5 };
        vibrar(10);
      } else if (tipo === 'erro') {
        espirrar(p.x, p.y, COR.coral, 10, 0.8);
        if (!rm) { clarao = { cor: COR.coral, k: 0.7 }; tremor = 0.6; }
        vibrar(60);
      } else if (tipo === 'combo') {
        espirrar(p.x, p.y, COR.amarelo, 18, 1.2);
      } else if (tipo === 'vitoria') {
        for (let i = 0; i < 5; i++) espirrar(L * (0.2 + i * 0.15), A * 0.4, [COR.amarelo, COR.claro, COR.coral, COR.lilas][i % 4], 16, 1.3);
      } else if (tipo === 'derrota') {
        if (!rm) clarao = { cor: COR.coral, k: 0.6 };
      }
      if (cena.reagir) cena.reagir(tipo, { ...p, L, A, espirrar, tocar: (n) => SONS[n] && SONS[n](som), tremer: (k) => { if (!rm) tremor = Math.max(tremor, k); }, clarear: (cor, k) => { if (!rm) clarao = { cor, k }; } }, estado);
    }

    /** O placar em pílulas: cada item é um nó (ou um texto) */
    function hud(...itens) {
      hudEl.replaceChildren(...itens.filter(Boolean).map((x) => (typeof x === 'string' ? h('span', { class: 'palco__pilula', text: x }) : x)));
    }
    /** Uma pílula do placar (ícone opcional) */
    const pilula = (texto, { icone: ic, classe = '', rotulo } = {}) => h('span', { class: `palco__pilula ${classe}`.trim(), 'aria-label': rotulo || null }, ic ? icone(ic) : null, texto);

    /* --- a abertura e o fim (o cartão do Tiro ao Alvo) --- */
    const passoEl = (n, forte, mais) => h('li', {}, h('span', { class: 'sd-tiro__n', 'aria-hidden': 'true', text: n }), h('p', {}, h('b', { text: forte }), h('span', { class: 'sd-tiro__passo-mais', text: mais })));
    const numeroEl = (rotulo, valor, destaque) => h('div', {}, h('dt', { text: rotulo }), h('dd', { class: destaque ? 'sd-tiro__destaque' : '', text: String(valor) }));
    function mostrarCartao(cartao, focar) {
      camada.replaceChildren(cartao);
      camada.hidden = false;
      rolagem.inert = true; // o jogo de trás não pega o Tab
      raiz.classList.add('palco--cartao');
      const b = camada.querySelector(focar || '.botao--primario');
      if (b) b.focus({ preventScroll: true });
    }
    function esconderCartao() {
      camada.hidden = true;
      camada.replaceChildren();
      rolagem.inert = false;
      raiz.classList.remove('palco--cartao');
    }
    /** A abertura: { rotulo, titulo, lead, passos: [[n, forte, mais]], numeros: [[rotulo, valor, destaque]], botao, aoComecar } */
    function abertura({ rotulo = 'Pronto para mergulhar', titulo, lead, passos = [], numeros = [], botao = 'Começar', aoComecar }) {
      jogando = false;
      mostrarCartao(h('div', { class: 'sd-tiro__cartao' },
        h('p', { class: 'sd-tiro__rotulo', text: rotulo }),
        h('h2', { class: 'sd-tiro__titulo', text: titulo }),
        lead ? h('p', { class: 'sd-tiro__lead', text: lead }) : null,
        passos.length ? h('ol', { class: 'sd-tiro__passos' }, passos.map(([n, f, m]) => passoEl(n, f, m))) : null,
        numeros.length ? h('dl', { class: 'sd-tiro__numeros' }, numeros.map(([r, v, d]) => numeroEl(r, v, d))) : null,
        h('div', { class: 'acoes-linha sd-tiro__acoes' },
          h('button', { type: 'button', class: 'botao botao--primario', id: 'palco-comecar', onclick: () => comecar(aoComecar) }, icone('i-raio'), botao))));
    }
    /** Começa uma rodada: some o cartão, liga o som (o clique é o gesto que o navegador pede) e chama o jogo */
    function comecar(fn) {
      som.iniciar();
      esconderCartao();
      jogando = true;
      rolagem.scrollTop = 0;
      if (fn) fn();
    }

    /**
     * O fim da rodada: aplica o resultado na hora (ctx.concluirRodada) e mostra o cartão.
     * extra: { titulo, texto, tom ('vitoria' | 'derrota'), numeros: [[rotulo, valor, destaque]], aoJogarDeNovo, textoDeNovo }
     */
    function terminar(res, { titulo, texto, tom = 'vitoria', numeros, aoJogarDeNovo, textoDeNovo = 'Jogar de novo' } = {}) {
      jogando = false;
      const ganho = ctx.concluirRodada ? ctx.concluirRodada(res) : null;
      reagir(tom);
      const validos = (res.detalhes || []).filter((d) => !d.neutro);
      const revisar = validos.filter((d) => !d.acertou);
      const nums = numeros || [['Acertos', `${res.acertos}/${validos.length}`, true], ['Tempo', UI.formatarTempo(res.tempoSegundos)]];
      const ganhos = ganho
        ? h('p', { class: 'sd-tiro__ganhos' }, icone('i-estrela'), ganho.xp || ganho.perolas
          ? h('span', {}, h('b', { text: `+${ganho.xp} XP` }), ganho.perolas ? ` e +${plural(ganho.perolas, 'pérola', 'pérolas')}` : '', ' no curso', ganho.dobro ? ' (Desafio do Dia: XP em dobro)' : '')
          : h('span', { text: 'Desta vez, sem XP. Bora de novo?' }))
        : null;
      // o botão de sair vem do app (ctx.fim): "Voltar para a Sala de Jogos"; nos flashcards da fase, "Voltar para a trilha"
      // é o principal; no detetive antes da prova, "Ir para a Prova final"
      const saida = ctx.fim || { texto: 'Voltar para a Sala de Jogos' };
      const deNovo = h('button', { type: 'button', class: `botao ${saida.principal ? 'botao--secundario' : 'botao--primario'}`, id: 'palco-de-novo', onclick: () => comecar(aoJogarDeNovo) }, icone('i-revisao'), saida.deNovo || textoDeNovo);
      const sair = h('button', { type: 'button', class: `botao ${saida.principal ? 'botao--primario' : 'botao--fantasma'}`, id: 'palco-sair', onclick: () => ctx.sair && ctx.sair(saida.destino) }, saida.texto);
      mostrarCartao(h('div', { class: `sd-tiro__cartao sd-tiro__cartao--fim palco__fim palco__fim--${tom}` },
        h('p', { class: 'sd-tiro__rotulo', text: 'Fim da rodada' }),
        h('h2', { class: 'sd-tiro__titulo', text: titulo || res.titulo }),
        texto || res.subtitulo ? h('p', { class: 'sd-tiro__porque', text: texto || res.subtitulo }) : null,
        h('section', { class: 'sd-tiro__em-numeros', 'aria-labelledby': 'palco-em-numeros' },
          h('div', { class: 'sd-tiro__em-numeros-topo' }, h('h3', { class: 'sd-tiro__sobre', id: 'palco-em-numeros', text: 'Em números' })),
          h('dl', { class: `sd-tiro__numeros sd-tiro__numeros--fim palco__numeros--${Math.min(4, nums.length)}`, style: `--colunas:${Math.min(4, nums.length)}` }, nums.map(([r, v, d]) => numeroEl(r, v, d))),
          ganhos),
        revisar.length ? h('details', { class: 'palco__revisar' },
          h('summary', { text: `O que revisar (${revisar.length})` }),
          h('div', { class: 'palco__revisar-lista' }, revisar.map((d) => h('details', { class: 'revisar-item' },
            h('summary', { text: d.pergunta }),
            h('div', { class: 'revisar-item__corpo' },
              d.tema ? h('span', { class: 'rotulo', text: d.tema }) : null,
              d.sua ? h('p', { class: 'revisar-item__sua', text: d.sua.startsWith('O tempo') || d.sua.startsWith('Você') ? d.sua : `Sua resposta: ${d.sua}` }) : null,
              d.resposta ? h('p', { class: 'revisar-item__certa', text: `Resposta certa: ${d.resposta}` }) : null,
              d.explicacao ? h('p', { class: 'revisar-item__explicacao', text: d.explicacao }) : null))))) : null,
        h('div', { class: 'acoes-linha sd-tiro__acoes' }, ...(saida.principal ? [sair, deNovo] : [deNovo, sair]))));
      aviso.textContent = `${titulo || res.titulo}. ${ganho && ganho.xp ? `Mais ${ganho.xp} XP.` : ''}`;
    }

    function parar() {
      vivo = false;
      cancelAnimationFrame(quadro);
      limpar.forEach((f) => f());
      som.fechar();
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { /* já saiu */ });
    }

    medir();
    const api = {
      area, estado, som, raiz, reagir, hud, pilula, abertura, terminar, parar, espirrar,
      tocar: (nome) => SONS[nome] && SONS[nome](som),
      avisar: (texto) => { aviso.textContent = texto; },
      jogando: () => jogando,
      medidas: () => ({ L, A }),
      pontoDe,
    };
    if (window.__diverTeste) window.__diverTeste.palco = api; // só nos testes automáticos (o teste cria __diverTeste)
    return api;
  }

  return { montar, pintar, COR, SONS };
})();

/*
 * Batata Quente (Sala de Descompressão) — uma sílaba aparece; digite uma palavra que tenha essa sílaba
 * antes de a bomba explodir na sua mão.
 * - Só valem palavras do dicionário brasileiro (VERO; js/dicionario.js), com 3 letras ou mais e sem repetir
 *   palavra na mesma partida. Acento não conta: "AÇÃO" se digita ACAO.
 * - Cada pessoa começa com 3 vidas. A bomba explodiu na sua vez? Perde uma vida e a vez passa.
 *   O pavio encurta a cada rodada (menos 0,4 s por rodada, nunca abaixo de 5 s).
 * - Bônus do alfabeto: usou todas as letras de A a Z (sem K, W e Y) nas suas palavras? Ganha uma vida (até 5).
 * - Modos: Sozinho (a bomba volta sempre para você; o pavio encurta a cada palavra e o nível sobe a cada
 *   30 s: pavio menor e sílabas mais difíceis), Treino (igual, mas a bomba não tira vida e não vale ponto),
 *   contra o robô (Fácil, Médio ou Difícil), lado a lado no mesmo computador e online, com outra pessoa
 *   (sala com código de 4 letras; o banco confere vez, tempo, sílaba e repetidas: funções batata_*).
 * - Pontos (só no placar da sala): Sozinho = 1 por palavra + 5 por nível alcançado, vale o recorde;
 *   vitória online 30; contra o robô 10 (Fácil), 15 (Médio) ou 25 (Difícil); lado a lado e treino não valem.
 *   As vitórias somam até 150 por dia.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): um luau na praia à noite (o mar com a lua, o varal de lâmpadas e as
 * fogueiras). Quanto mais o pavio queima, mais o fogo cresce, as brasas sobem, o tique-taque acelera e a tela esquenta; a
 * explosão clareia tudo e treme; palavra aceita acalma o fogo. A bomba pende para quem está com a vez. O menu é o cartão de
 * abertura do palco e o fim vem no cartão de "Em números". Regras, modos, tempos e pontos iguais.
 */
(() => {
  const { h, icone, plural } = UI;
  const ALFABETO = 'abcdefghijlmnopqrstuvxz';
  const VIDAS = 3;
  const MAX_VIDAS = 5;
  const PAVIOS = [10, 15, 20];
  const ROBOS = {
    facil: { nome: 'Fácil', pontos: 10, espera: [3200, 6500], falha: 0.22, maxLetras: 7 },
    medio: { nome: 'Médio', pontos: 15, espera: [1800, 4200], falha: 0.1, maxLetras: 10 },
    dificil: { nome: 'Difícil', pontos: 25, espera: [900, 2400], falha: 0.03, maxLetras: 14 },
  };
  const PONTOS_ONLINE = 30;
  const SOBE_NIVEL = 30; // segundos por nível no Sozinho e no Treino
  const duracao = (tempo, rodada) => Math.max(5000, tempo * 1000 - rodada * 400);
  let silabas = null;

  function carregarSilabas() {
    if (!silabas) {
      silabas = fetch('data/sala/silabas.json').then((r) => {
        if (!r.ok) throw new Error('Não consegui abrir as sílabas.');
        return r.json();
      });
      silabas.catch(() => (silabas = null));
    }
    return silabas;
  }
  function sortearSilaba(s, rodada) {
    const lista = rodada < 6 || Math.random() < 0.5 ? s.faceis : s.dificeis;
    return lista[Math.floor(Math.random() * lista.length)];
  }
  function novasLetras(letras, palavra) {
    let l = letras;
    palavra.split('').forEach((c) => {
      if (ALFABETO.includes(c) && !l.includes(c)) l += c;
    });
    return l;
  }

  Descompressao.registrar({
    id: 'batata',
    nome: 'Batata Quente',
    curto: 'Batata',
    icone: 'i-raio',
    duracao: '2 a 6 min por partida',
    diario: false,
    descricao: 'Uma sílaba, uma bomba e o relógio correndo: digite uma palavra com a sílaba antes de explodir. Contra o robô, lado a lado ou online.',
    telaCheia: true, // o palco: a janela inteira, com a barra da Sala por cima
    abrir(ctx) {
      const cfg = { modo: 'sozinho', robo: 'medio', tempo: 15, nomes: [primeiroNome() || 'Jogador 1', 'Jogador 2'], ...(ctx.estado() || {}).cfg };
      const palcoTela = Palco.montar(Palco.daSala(ctx), { id: 'batata', cena: cenaLuau() });
      const area = palcoTela.area;
      let partida = null; // motor local (robô e lado a lado)
      let online = null; // { codigo, dados, poll, offset, explodindo, registrado }
      let relogio = 0;
      let roboTimer = 0;
      let encerrado = false;
      let ultimoTique = 0;

      function primeiroNome() {
        const p = Nuvem.ativa && Nuvem.perfil && Nuvem.perfil();
        return p && p.nome ? String(p.nome).trim().split(/\s+/)[0] : '';
      }
      const guardarCfg = () => ctx.gravar({ cfg: { modo: cfg.modo, robo: cfg.robo, tempo: cfg.tempo, nomes: cfg.nomes } });

      /* ---------- Menu: o cartão de abertura do palco (modo, pavio e o online) ---------- */
      const EXPLICA = {
        sozinho: () => `A bomba volta sempre para você. O pavio começa com ${cfg.tempo} s e encurta a cada palavra; a cada ${SOBE_NIVEL} s o nível sobe (pavio menor e sílabas mais difíceis). 3 vidas. Vale 1 ponto por palavra + 5 por nível: conta o seu recorde.`,
        treino: () => `Igual ao Sozinho (o nível também sobe a cada ${SOBE_NIVEL} s), mas a bomba não tira vida e não vale ponto. Encerre quando quiser.`,
        robo: () => `A bomba vai e volta entre você e o robô, e o pavio encurta a cada rodada. Quem deixar explodir perde uma vida (3 para cada). Vencer o robô ${ROBOS[cfg.robo].nome} vale ${ROBOS[cfg.robo].pontos} pontos.`,
        local: () => 'Duas pessoas no mesmo aparelho, uma de cada vez. Quem deixar a bomba explodir perde uma vida (3 para cada). Não vale ponto: é pela glória.',
        online: () => `Com um colega, cada um no seu aparelho: crie a sala e passe o código de 4 letras, ou entre com o código que recebeu. Vencer vale ${PONTOS_ONLINE} pontos.`,
      };
      function menu(aviso = '', focar = '') {
        pararTudo();
        area.replaceChildren();
        const dic = h('p', { class: 'sd-bat__dic texto-suave', 'aria-live': 'polite', text: 'Abrindo o dicionário brasileiro…' });
        Promise.all([Dicionario.carregar(), carregarSilabas(), Dicionario.palavrasComuns()])
          .then(() => (dic.textContent = 'Dicionário pronto: 4,4 milhões de palavras brasileiras.'))
          .catch(() => (dic.textContent = 'Não consegui abrir o dicionário. Confira a internet e volte à sala.'));
        const seg = (rotulo, campo, opcoes, classe = '') => h('div', { class: 'sd-bat__opcao' },
          h('span', { class: 'sd-bat__rotulo', text: rotulo }),
          h('div', { class: `segmentado ${classe}`.trim(), role: 'group', 'aria-label': rotulo, 'data-campo': campo }, opcoes.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(cfg[campo] === v), onclick: () => {
            cfg[campo] = v;
            guardarCfg();
            menu('', campo); // o texto do cartão muda com o modo, o robô e o pavio
          } }, t))));
        const extras = cfg.modo === 'robo' ? seg('Robô', 'robo', Object.entries(ROBOS).map(([k, r]) => [k, r.nome]))
          : cfg.modo === 'local' ? h('div', { class: 'sd-bat__nomes' }, [0, 1].map((i) => h('label', { class: 'sd-campo' }, h('span', { text: i ? 'Quem fica à direita' : 'Quem fica à esquerda' }),
            h('input', { class: 'campo', maxlength: '16', value: cfg.nomes[i], oninput: (e) => {
              cfg.nomes[i] = e.target.value.trim() || `Jogador ${i + 1}`;
              guardarCfg();
            } }))))
            : null;
        const pode = Nuvem.ativa && Nuvem.temSessao();
        let online = null;
        if (cfg.modo === 'online') {
          const cod = h('input', { class: 'campo sd-bat__codigo-campo', id: 'sd-bat-codigo', maxlength: '4', autocomplete: 'off', placeholder: 'ABCD', 'aria-label': 'Código da sala' });
          online = pode ? h('form', { class: 'sd-bat__entrar', onsubmit: (e) => {
            e.preventDefault();
            palcoTela.comecar(() => entrarSala(cod.value));
          } }, h('span', { class: 'texto-suave', text: 'Recebeu um código?' }), cod, h('button', { type: 'submit', class: 'botao botao--secundario' }, 'Entrar'))
            : h('p', { class: 'texto-suave', text: 'Para jogar online, entre com sua conta do Diver.' });
        }
        const comecar = cfg.modo === 'sozinho' ? () => comecarSozinho(false) : cfg.modo === 'treino' ? () => comecarSozinho(true) : cfg.modo === 'online' ? criarSala : comecarLocal;
        const recorde = ctx.recorde();
        palcoTela.abertura({
          id: 'sd-bat-menu',
          rotulo: `Luau na praia · ${recorde ? `seu recorde: ${recorde}` : 'como vai ser?'}`,
          titulo: 'Batata Quente',
          lead: 'Digite uma palavra com a sílaba antes de a bomba explodir na sua mão.',
          mais: h('div', { class: 'palco__opcoes sd-bat__opcoes' },
            seg('Modo', 'modo', [['sozinho', 'Sozinho'], ['treino', 'Treino'], ['robo', 'Contra o robô'], ['local', 'Lado a lado'], ['online', 'Online']], 'sd-bat__modos'),
            h('p', { class: 'texto-suave sd-bat__explica', text: EXPLICA[cfg.modo]() }),
            extras,
            seg(cfg.modo === 'online' ? 'Pavio (de quem cria a sala)' : cfg.modo === 'sozinho' || cfg.modo === 'treino' ? 'Pavio no começo' : 'Pavio', 'tempo', PAVIOS.map((t) => [t, `${t} s`])),
            online,
            aviso ? h('p', { class: 'texto-erro', role: 'alert', text: aviso }) : null,
            dic),
          botao: cfg.modo === 'online' ? (pode ? 'Criar sala' : null) : cfg.modo === 'treino' ? 'Começar o treino' : 'Começar',
          icone: cfg.modo === 'online' ? 'i-mais' : 'i-raio',
          aoComecar: comecar,
          acoes: [h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => guia(true) }, icone('i-livro'), 'Como jogar')],
        });
        if (focar) { const b = document.querySelector(`#sd-bat-menu [data-campo="${focar}"] [aria-pressed="true"]`); if (b) b.focus({ preventScroll: true }); }
        guia(false);
      }

      /* ---------- Tabuleiro (igual para os três modos) ---------- */
      function montarTabuleiro(nomes) {
        const lados = nomes.map((n, i) => h('section', { class: 'sd-bat__lado', 'data-lado': String(i), 'aria-label': n },
          h('div', { class: 'sd-bat__nome' }, h('span', { text: n }), h('span', { class: 'sd-bat__vidas' })),
          h('div', { class: 'sd-bat__alfabeto', 'aria-hidden': 'true' }, ALFABETO.split('').map((c) => h('span', { 'data-c': c, text: c.toUpperCase() }))),
          h('p', { class: 'sd-bat__ultima', 'aria-live': 'polite' })));
        const silaba = h('div', { class: 'sd-bat__silaba', id: 'sd-bat-silaba', 'aria-live': 'polite' });
        const pavio = h('div', { class: 'sd-bat__pavio', role: 'progressbar', 'aria-label': 'Tempo do pavio', 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('span', { class: 'sd-bat__chama' }));
        const vez = h('p', { class: 'sd-bat__vez', 'aria-live': 'polite' });
        const campo = h('input', { class: 'campo sd-bat__campo', id: 'sd-bat-campo', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', maxlength: '25', 'aria-label': 'Sua palavra' });
        const msg = h('p', { class: 'sd-bat__msg', 'aria-live': 'assertive' });
        const form = h('form', { class: 'sd-bat__form' }, campo, h('button', { type: 'submit', class: 'botao botao--primario' }, 'Enviar'));
        const bomba = h('div', { class: 'sd-bat__bomba', 'aria-hidden': 'true' },
          h('div', { class: 'sd-bat__bomba-corpo' }), h('div', { class: 'sd-bat__bomba-luz' }));
        const centro = h('div', { class: 'sd-bat__centro' }, bomba, silaba, pavio, vez, form, msg);
        const raiz = h('div', { class: 'sd-bat sd-bat--jogo' }, h('div', { class: 'sd-bat__mesa' }, lados[0], centro, lados[1]));
        area.replaceChildren(raiz);
        palcoTela.topo();
        return { raiz, lados, silaba, pavio, vez, campo, msg, form, bomba };
      }

      function pintarLado(t, i, { nome, vidas, letras, ultima, daVez }) {
        const lado = t.lados[i];
        lado.classList.toggle('sd-bat__lado--vez', !!daVez);
        lado.querySelector('.sd-bat__vidas').replaceChildren(...Array.from({ length: Math.max(VIDAS, vidas) }, (_, k) => h('span', { class: `sd-bat__vida ${k < vidas ? '' : 'sd-bat__vida--vazia'}`.trim(), 'aria-hidden': 'true' })),
          h('span', { class: 'visualmente-oculto', text: `${plural(vidas, 'vida', 'vidas')}` }));
        lado.querySelectorAll('.sd-bat__alfabeto span').forEach((s) => s.classList.toggle('sd-bat__letra--ok', letras.includes(s.dataset.c)));
        if (ultima !== undefined) lado.querySelector('.sd-bat__ultima').textContent = ultima || '';
        lado.setAttribute('aria-label', `${nome}: ${plural(vidas, 'vida', 'vidas')}${daVez ? ', é a vez' : ''}`);
      }

      function pintarPavio(t, resta, total) {
        const f = Math.max(0, Math.min(1, resta / total));
        t.pavio.style.setProperty('--resta', String(f));
        t.pavio.setAttribute('aria-valuenow', String(Math.round(f * 100)));
        t.bomba.classList.toggle('sd-bat__bomba--quase', f < 0.3);
        palcoTela.estado.calor = 1 - f; // o luau esquenta: fogo, brasas, tique-taque
        if (f > 0 && f < 0.5) { // o tique-taque: da metade do pavio até o fim, cada vez mais rápido
          const agora = performance.now();
          if (agora - ultimoTique >= 120 + 900 * f) { ultimoTique = agora; palcoTela.tocar('tique'); }
        }
      }

      function sacudir(t, texto, tipo = 'erro') {
        t.msg.textContent = texto;
        t.msg.className = `sd-bat__msg sd-bat__msg--${tipo}`;
        if (tipo === 'ok') palcoTela.reagir('acerto', { el: t.silaba }); // palavra aceita: o fogo acalma
        else if (tipo === 'bonus') palcoTela.reagir('combo', { el: t.silaba });
        else if (tipo === 'erro') palcoTela.tocar('erro');
        if (tipo !== 'erro' || UI.movimentoReduzido) return;
        t.form.classList.remove('sd-bat__form--tremer');
        void t.form.offsetWidth;
        t.form.classList.add('sd-bat__form--tremer');
      }

      function explosao(t) {
        palcoTela.reagir('explosao', { el: t.bomba });
        if (UI.movimentoReduzido) return;
        t.raiz.classList.remove('sd-bat--boom');
        void t.raiz.offsetWidth;
        t.raiz.classList.add('sd-bat--boom');
      }

      /** Confere a palavra (dicionário, sílaba, repetida). Devolve a palavra normalizada ou lança o motivo. */
      function conferir(texto, silaba, usadas) {
        const p = Dicionario.normalizar(texto);
        if (p.length < 3) throw new Error('Use palavras com 3 letras ou mais.');
        if (!p.includes(silaba)) throw new Error(`A palavra precisa ter "${silaba.toUpperCase()}".`);
        if (usadas.includes(p)) throw new Error('Essa palavra já foi usada nesta partida.');
        const ok = Dicionario.existeJa(p);
        if (ok === null) throw new Error('O dicionário ainda está abrindo. Tente de novo em um instante.');
        if (!ok) throw new Error('Essa palavra não faz parte do nosso dicionário brasileiro.');
        return p;
      }

      /* ---------- Sozinho e Treino: a bomba sempre volta para você ---------- */
      function silabaSolo(s, nivel) {
        const dificil = nivel >= 5 ? 0.75 : nivel >= 3 ? 0.5 : 0;
        const lista = Math.random() < dificil ? s.dificeis : s.faceis;
        return lista[Math.floor(Math.random() * lista.length)];
      }
      const duracaoSolo = (p) => Math.max(3500, p.tempo * 1000 - (p.nivel - 1) * 1200 - p.palavras * 120);

      async function comecarSozinho(treino) {
        clearInterval(relogio);
        clearTimeout(roboTimer);
        let s;
        try {
          [s] = await Promise.all([carregarSilabas(), Dicionario.carregar()]);
        } catch (e) {
          return menu('Não consegui abrir o dicionário. Confira a internet e tente de novo.');
        }
        if (encerrado) return;
        const t = montarTabuleiro([treino ? 'Treino' : cfg.nomes[0] || 'Você']);
        t.raiz.querySelector('.sd-bat__mesa').classList.add('sd-bat__mesa--solo');
        const painel = h('p', { class: 'sd-bat__nivel', id: 'sd-bat-nivel' });
        t.bomba.before(painel);
        if (treino) t.form.after(h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno sd-bat__encerrar', onclick: () => terminarSozinho() }, 'Encerrar treino'));
        partida = {
          solo: true, treino, t, s, painel, tempo: cfg.tempo, inicio: performance.now(), nivel: 1, palavras: 0, explosoes: 0,
          vidas: VIDAS, letras: '', ultima: '', usadas: [], silaba: silabaSolo(s, 1), prazo: 0, total: 0, fim: false,
        };
        novaBombaSolo(true);
        t.form.addEventListener('submit', (e) => {
          e.preventDefault();
          jogarSozinho(t.campo.value);
        });
        relogio = setInterval(tiqueSozinho, 100);
      }

      function novaBombaSolo(primeira = false) {
        const p = partida;
        p.total = duracaoSolo(p);
        p.prazo = performance.now() + p.total;
        p.t.silaba.textContent = p.silaba.toUpperCase();
        p.t.vez.textContent = p.treino ? 'Treino: sem pressa de vida, só de tempo!' : 'A bomba é sua!';
        p.t.campo.value = '';
        p.t.campo.placeholder = `Uma palavra com ${p.silaba.toUpperCase()}`;
        pintarLado(p.t, 0, { nome: p.treino ? 'Treino' : cfg.nomes[0], vidas: p.treino ? 0 : p.vidas, letras: p.letras, ultima: p.ultima, daVez: true });
        if (p.treino) p.t.lados[0].querySelector('.sd-bat__vidas').replaceChildren(h('span', { class: 'chip chip--ativo', text: 'sem vidas: é treino' }));
        p.t.campo.focus({ preventScroll: !primeira });
      }

      function tiqueSozinho() {
        const p = partida;
        if (!p || !p.solo || p.fim) return;
        const agora = performance.now();
        const decorrido = (agora - p.inicio) / 1000;
        const nivel = 1 + Math.floor(decorrido / SOBE_NIVEL);
        if (nivel > p.nivel) {
          p.nivel = nivel;
          sacudir(p.t, `Nível ${nivel}! O pavio encurtou${nivel >= 3 ? ' e as sílabas ficaram mais difíceis' : ''}.`, 'bonus');
        }
        const falta = Math.ceil(SOBE_NIVEL - (decorrido % SOBE_NIVEL));
        p.painel.textContent = `Nível ${p.nivel} · sobe em ${falta} s · ${plural(p.palavras, 'palavra', 'palavras')}`;
        const resta = p.prazo - agora;
        pintarPavio(p.t, resta, p.total);
        if (resta <= 0) explodirSozinho();
      }

      function explodirSozinho() {
        const p = partida;
        explosao(p.t);
        p.ultima = `Bum! "${p.silaba.toUpperCase()}" explodiu.`;
        if (p.treino) {
          p.explosoes++;
          sacudir(p.t, 'Bum! No treino a bomba não tira vida. Lá vem outra sílaba.', 'boom');
        } else {
          p.vidas--;
          sacudir(p.t, p.vidas > 0 ? `Bum! Sobrou ${plural(p.vidas, 'vida', 'vidas')}.` : 'Bum! Acabaram as vidas.', 'boom');
          if (p.vidas <= 0) return terminarSozinho();
        }
        p.silaba = silabaSolo(p.s, p.nivel);
        novaBombaSolo();
      }

      function jogarSozinho(texto) {
        const p = partida;
        if (!p || !p.solo || p.fim) return;
        let palavra;
        try {
          palavra = conferir(texto, p.silaba, p.usadas);
        } catch (e) {
          sacudir(p.t, e.message);
          p.t.campo.select();
          return;
        }
        p.usadas.push(palavra);
        p.palavras++;
        p.ultima = palavra.toUpperCase();
        p.letras = novasLetras(p.letras, palavra);
        if (p.letras.length >= ALFABETO.length) {
          p.letras = '';
          if (!p.treino) p.vidas = Math.min(MAX_VIDAS, p.vidas + 1);
          sacudir(p.t, p.treino ? 'Alfabeto completo! (No jogo valendo, isso dá uma vida.)' : 'Alfabeto completo! Ganhou uma vida.', 'bonus');
        } else sacudir(p.t, `${palavra.toUpperCase()}: boa!`, 'ok');
        p.silaba = silabaSolo(p.s, p.nivel);
        novaBombaSolo();
      }

      function terminarSozinho() {
        const p = partida;
        if (!p || p.fim) return;
        p.fim = true;
        clearInterval(relogio);
        p.t.campo.disabled = true;
        const enc = p.t.raiz.querySelector('.sd-bat__encerrar');
        if (enc) enc.remove();
        const pontos = p.palavras + 5 * (p.nivel - 1);
        const segundos = Math.round((performance.now() - p.inicio) / 1000);
        if (!p.treino) ctx.pontuar(pontos, { modo: 'sozinho', palavras: p.palavras, nivel: p.nivel, segundos });
        const recorde = ctx.recorde();
        const melhor = pontos >= recorde && pontos > 0;
        fimDePartida(p.t, {
          titulo: p.treino ? 'Treino encerrado' : melhor ? 'Seu melhor até agora!' : 'Bum! Acabaram as vidas',
          texto: p.treino
            ? `Treino encerrado: ${plural(p.palavras, 'palavra', 'palavras')} até o nível ${p.nivel}${p.explosoes ? `, com ${plural(p.explosoes, 'explosão', 'explosões')} no caminho` : ''}.`
            : `${plural(p.palavras, 'palavra', 'palavras')} até o nível ${p.nivel}: ${plural(pontos, 'ponto', 'pontos')} no placar da sala${melhor ? ' (seu melhor!)' : ''}.`,
          feliz: p.palavras > 0,
          deNovo: () => comecarSozinho(p.treino),
          numeros: [['Palavras', p.palavras, true], ['Nível', p.nivel], p.treino ? ['Explosões', p.explosoes] : ['Pontos', pontos], ['Tempo', UI.formatarTempo(segundos)]],
        });
      }

      /* ---------- Partida local: robô ou lado a lado ---------- */
      async function comecarLocal() {
        clearInterval(relogio);
        clearTimeout(roboTimer);
        let s;
        try {
          [s] = await Promise.all([carregarSilabas(), Dicionario.carregar(), cfg.modo === 'robo' ? Dicionario.palavrasComuns() : null]);
        } catch (e) {
          return menu('Não consegui abrir o dicionário. Confira a internet e tente de novo.');
        }
        if (encerrado) return;
        const robo = cfg.modo === 'robo' ? ROBOS[cfg.robo] : null;
        const nomes = robo ? [cfg.nomes[0], `Robô ${robo.nome}`] : [cfg.nomes[0] || 'Jogador 1', cfg.nomes[1] || 'Jogador 2'];
        const t = montarTabuleiro(nomes);
        partida = {
          t, s, robo, nomes, tempo: cfg.tempo, rodada: 0, vez: robo ? 0 : Math.round(Math.random()), usadas: [],
          vidas: [VIDAS, VIDAS], letras: ['', ''], ultima: ['', ''], palavras: [0, 0], silaba: sortearSilaba(s, 0), prazo: 0, total: 0, fim: false,
        };
        novaVez(true);
        t.form.addEventListener('submit', (e) => {
          e.preventDefault();
          jogarLocal(t.campo.value);
        });
        relogio = setInterval(tique, 100);
      }

      function novaVez(primeira = false) {
        const p = partida;
        p.total = duracao(p.tempo, p.rodada);
        p.prazo = performance.now() + p.total;
        p.t.silaba.textContent = p.silaba.toUpperCase();
        const ehRobo = p.robo && p.vez === 1;
        p.t.vez.textContent = ehRobo ? `${p.nomes[1]} está pensando…` : p.robo ? 'Sua vez!' : `Vez de ${p.nomes[p.vez]}`;
        p.t.campo.disabled = ehRobo;
        p.t.campo.value = '';
        p.t.campo.placeholder = `Uma palavra com ${p.silaba.toUpperCase()}`;
        p.t.raiz.dataset.vez = String(p.vez);
        pintarTodos();
        if (!ehRobo) p.t.campo.focus({ preventScroll: !primeira });
        clearTimeout(roboTimer);
        if (ehRobo) roboJogar();
      }

      function pintarTodos() {
        const p = partida;
        [0, 1].forEach((i) => pintarLado(p.t, i, { nome: p.nomes[i], vidas: p.vidas[i], letras: p.letras[i], ultima: p.ultima[i], daVez: p.vez === i && !p.fim }));
      }

      function tique() {
        const p = partida;
        if (!p || p.fim) return;
        const resta = p.prazo - performance.now();
        pintarPavio(p.t, resta, p.total);
        if (resta <= 0) explodirLocal();
      }

      function explodirLocal() {
        const p = partida;
        clearTimeout(roboTimer);
        p.vidas[p.vez]--;
        p.ultima[p.vez] = `Bum! Ninguém achou "${p.silaba.toUpperCase()}" a tempo.`;
        explosao(p.t);
        sacudir(p.t, `A bomba explodiu na mão de ${p.nomes[p.vez]}!`, 'boom');
        if (p.vidas[p.vez] <= 0) return terminarLocal(1 - p.vez);
        proxima();
      }

      function proxima() {
        const p = partida;
        p.rodada++;
        p.vez = 1 - p.vez;
        p.silaba = sortearSilaba(p.s, p.rodada);
        novaVez();
      }

      function aceitar(quem, palavra) {
        const p = partida;
        p.usadas.push(palavra);
        p.palavras[quem]++;
        p.letras[quem] = novasLetras(p.letras[quem], palavra);
        p.ultima[quem] = palavra.toUpperCase();
        if (p.letras[quem].length >= ALFABETO.length) {
          p.letras[quem] = '';
          p.vidas[quem] = Math.min(MAX_VIDAS, p.vidas[quem] + 1);
          sacudir(p.t, `Alfabeto completo! ${p.nomes[quem]} ganhou uma vida.`, 'bonus');
        } else sacudir(p.t, `${p.nomes[quem]}: ${palavra.toUpperCase()}`, 'ok');
        proxima();
      }

      function jogarLocal(texto) {
        const p = partida;
        if (!p || p.fim || (p.robo && p.vez === 1)) return;
        try {
          aceitar(p.vez, conferir(texto, p.silaba, p.usadas));
        } catch (e) {
          sacudir(p.t, e.message);
          p.t.campo.select();
        }
      }

      function roboJogar() {
        const p = partida;
        const r = p.robo;
        const espera = r.espera[0] + Math.random() * (r.espera[1] - r.espera[0]);
        // Robô "trava" de vez em quando (e mais quando o pavio está curto)
        const curto = p.total < espera + 600;
        if (Math.random() < r.falha || curto) return; // deixa a bomba explodir
        roboTimer = setTimeout(async () => {
          if (!partida || partida !== p || p.fim || p.vez !== 1) return;
          const comuns = await Dicionario.palavrasComuns();
          const faltam = ALFABETO.split('').filter((c) => !p.letras[1].includes(c));
          let opcoes = comuns.filter((w) => w.length <= r.maxLetras && w.includes(p.silaba) && !p.usadas.includes(w));
          if (!opcoes.length) return; // sem ideia: a bomba vai explodir
          if (cfg.robo === 'dificil') opcoes.sort((a, b) => faltam.filter((c) => b.includes(c)).length - faltam.filter((c) => a.includes(c)).length);
          const palavra = cfg.robo === 'dificil' ? opcoes[Math.floor(Math.random() * Math.min(5, opcoes.length))] : opcoes[Math.floor(Math.random() * opcoes.length)];
          // "digitando" letra a letra
          let i = 0;
          const ultima = p.t.lados[1].querySelector('.sd-bat__ultima');
          const digita = () => {
            if (!partida || partida !== p || p.fim || p.vez !== 1) return;
            i++;
            ultima.textContent = palavra.slice(0, i).toUpperCase();
            if (i < palavra.length) roboTimer = setTimeout(digita, UI.movimentoReduzido ? 0 : 70);
            else if (performance.now() < p.prazo) aceitar(1, palavra);
          };
          digita();
        }, espera);
      }

      function terminarLocal(vencedor) {
        const p = partida;
        p.fim = true;
        clearInterval(relogio);
        clearTimeout(roboTimer);
        pintarTodos();
        p.t.campo.disabled = true;
        const souEu = !p.robo || vencedor === 0;
        const pontos = p.robo && vencedor === 0 ? p.robo.pontos : 0;
        ctx.pontuar(pontos, { modo: p.robo ? `robo-${cfg.robo}` : 'local', venceu: p.robo ? vencedor === 0 : null, rodadas: p.rodada, palavras: p.usadas.length });
        fimDePartida(p.t, {
          titulo: p.robo ? (vencedor === 0 ? `Você venceu o Robô ${p.robo.nome}!` : `O Robô ${p.robo.nome} venceu dessa vez`) : `${p.nomes[vencedor]} venceu!`,
          texto: p.robo ? (vencedor === 0 ? `+${pontos} pontos no placar da sala.` : 'Revanche?') : 'Boa partida, Divers.',
          feliz: souEu,
          deNovo: comecarLocal,
          numeros: p.robo
            ? [['Rodadas', p.rodada, true], ['Suas palavras', p.palavras[0]], ['Suas vidas', Math.max(0, p.vidas[0])], ['Pontos', pontos]]
            : [['Rodadas', p.rodada, true], [p.nomes[0], plural(p.palavras[0], 'palavra', 'palavras')], [p.nomes[1], plural(p.palavras[1], 'palavra', 'palavras')]],
        });
      }

      /** O fim no cartão do palco: { titulo, texto, feliz, deNovo (sem ele, o botão é "Trocar modo"), numeros } */
      function fimDePartida(t, { titulo, texto, feliz, deNovo, numeros }) {
        t.vez.textContent = '';
        t.form.hidden = true;
        palcoTela.estado.calor = 0;
        palcoTela.terminar({ titulo, subtitulo: texto, detalhes: [] }, {
          tom: feliz ? 'vitoria' : 'derrota',
          numeros,
          aoJogarDeNovo: deNovo || (() => menu()),
          textoDeNovo: deNovo ? 'Jogar de novo' : 'Trocar modo',
          mais: deNovo ? h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno sd-bat__trocar', onclick: () => menu() }, icone('i-engrenagem'), 'Trocar modo') : null,
        });
      }

      /* ---------- Online ---------- */
      async function criarSala() {
        try {
          await Promise.all([Dicionario.carregar(), carregarSilabas()]);
          entrarOnline(await Nuvem.rpc('batata_criar', { p_tempo: cfg.tempo }));
        } catch (e) {
          menu(e.message || 'Não consegui criar a sala.');
        }
      }
      async function entrarSala(codigo) {
        const c = String(codigo || '').trim().toUpperCase();
        if (!/^[A-Z]{4}$/.test(c)) return menu('O código tem 4 letras.');
        try {
          await Dicionario.carregar();
          entrarOnline(await Nuvem.rpc('batata_entrar', { p_codigo: c }));
        } catch (e) {
          menu(e.message || 'Não consegui entrar na sala.');
        }
      }

      function entrarOnline(dados) {
        pararTudo();
        online = { codigo: dados.codigo, dados: null, t: null, offset: 0, explodindo: 0, registrado: false, poll: 0, versao: -1 };
        aplicarOnline(dados);
        online.poll = setInterval(atualizarOnline, 700);
        relogio = setInterval(tiqueOnline, 100);
      }

      async function atualizarOnline() {
        const o = online;
        if (!o || o.buscando) return;
        o.buscando = true;
        try {
          const d = await Nuvem.rpc('batata_ver', { p_codigo: o.codigo });
          if (online === o && d) aplicarOnline(d);
        } catch (e) {
          /* sem conexão: tenta de novo no próximo ciclo */
        } finally {
          o.buscando = false;
        }
      }

      function aplicarOnline(d) {
        const o = online;
        o.offset = Number(d.agora) - Date.now();
        if (d.versao === o.versao && (o.t || o.esperando)) return;
        const antes = o.dados;
        o.dados = d;
        o.versao = d.versao;
        const e = d.estado;
        if (e.status === 'aguardando') {
          if (!o.esperando) salaDeEspera();
          o.esperando = true;
          return;
        }
        if (!o.t) {
          o.t = montarTabuleiro(d.nomes.map((n, i) => (i === d.eu ? `${n} (você)` : n)));
          o.t.form.addEventListener('submit', (ev) => {
            ev.preventDefault();
            jogarOnline(o.t.campo.value);
          });
        }
        const t = o.t;
        t.raiz.dataset.vez = String(e.vez); // a bomba pende para quem está com a vez
        const ult = e.ultima;
        const mudouVez = !antes || antes.estado.vez !== e.vez || antes.estado.rodada !== e.rodada;
        [0, 1].forEach((i) => pintarLado(t, i, {
          nome: d.nomes[i] || '…', vidas: e.vidas[i], letras: e.letras[i] || '', daVez: e.status === 'jogando' && e.vez === i,
          ultima: ult && ult.quem === i ? (ult.tipo === 'boom' ? `Bum! "${String(ult.silaba || '').toUpperCase()}" explodiu.` : ult.tipo === 'saiu' ? 'Saiu da partida.' : String(ult.palavra || '').toUpperCase()) : undefined,
        }));
        if (ult && antes && antes.versao !== d.versao) {
          const quem = d.nomes[ult.quem];
          if (ult.tipo === 'boom') {
            explosao(t);
            sacudir(t, `A bomba explodiu na mão de ${ult.quem === d.eu ? 'você' : quem}!`, 'boom');
          } else if (ult.tipo === 'bonus') sacudir(t, `Alfabeto completo! ${quem} ganhou uma vida.`, 'bonus');
          else if (ult.tipo === 'ok') sacudir(t, `${quem}: ${String(ult.palavra).toUpperCase()}`, 'ok');
        }
        if (e.status === 'fim') return terminarOnline();
        t.silaba.textContent = String(e.silaba || '').toUpperCase();
        const minha = e.vez === d.eu;
        t.vez.textContent = minha ? 'Sua vez!' : `Vez de ${d.nomes[e.vez]}`;
        t.campo.disabled = !minha;
        t.campo.placeholder = minha ? `Uma palavra com ${String(e.silaba).toUpperCase()}` : 'Aguarde a sua vez';
        if (mudouVez) {
          t.campo.value = '';
          if (minha) t.campo.focus({ preventScroll: true });
        }
      }

      function salaDeEspera() {
        const o = online;
        area.replaceChildren(h('div', { class: 'sd-bat' }, h('section', { class: 'cartao sd-bat__espera' },
          h('h2', { class: 'cartao__titulo', text: 'Sala criada' }),
          h('p', { text: 'Passe este código para quem vai jogar com você:' }),
          h('p', { class: 'sd-bat__codigo', 'aria-label': `Código ${o.codigo.split('').join(' ')}`, text: o.codigo }),
          h('p', { class: 'texto-suave', 'aria-live': 'polite', text: 'Esperando a outra pessoa entrar… A partida começa sozinha.' }),
          h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => menu() }, 'Cancelar')))));
      }

      function tiqueOnline() {
        const o = online;
        if (!o || !o.t || !o.dados || o.dados.estado.status !== 'jogando') return;
        const e = o.dados.estado;
        const agora = Date.now() + o.offset;
        const total = duracao(e.tempo, e.rodada);
        const resta = Number(e.prazo) - agora;
        pintarPavio(o.t, resta, total);
        // Passou do prazo: qualquer um dos dois pede a explosão (o banco confere o horário)
        if (resta < -300 && Date.now() - o.explodindo > 1500) {
          o.explodindo = Date.now();
          Nuvem.rpc('batata_explodir', { p_codigo: o.codigo }).then((d) => online === o && d && aplicarOnline(d)).catch(() => {});
        }
      }

      async function jogarOnline(texto) {
        const o = online;
        if (!o || !o.dados || o.enviando) return;
        const e = o.dados.estado;
        if (e.status !== 'jogando' || e.vez !== o.dados.eu) return;
        let palavra;
        try {
          palavra = conferir(texto, e.silaba, e.usadas || []);
        } catch (err) {
          sacudir(o.t, err.message);
          o.t.campo.select();
          return;
        }
        o.enviando = true;
        try {
          const d = await Nuvem.rpc('batata_jogar', { p_codigo: o.codigo, p_palavra: palavra });
          if (online === o && d) aplicarOnline(d);
        } catch (err) {
          sacudir(o.t, err.message || 'Não deu para enviar. Tente de novo.');
        } finally {
          o.enviando = false;
        }
      }

      function terminarOnline() {
        const o = online;
        const d = o.dados;
        const e = d.estado;
        clearInterval(o.poll);
        clearInterval(relogio);
        o.t.campo.disabled = true;
        o.t.silaba.textContent = '';
        const venci = e.vencedor === d.eu;
        if (!o.registrado) {
          o.registrado = true;
          ctx.pontuar(venci ? PONTOS_ONLINE : 0, { modo: 'online', venceu: venci, rodadas: e.rodada, palavras: (e.usadas || []).length });
        }
        const saiu = e.ultima && e.ultima.tipo === 'saiu' && e.ultima.quem !== d.eu;
        fimDePartida(o.t, {
          titulo: venci ? 'Você venceu!' : `${d.nomes[e.vencedor] || 'A outra pessoa'} venceu dessa vez`,
          texto: venci ? `${saiu ? 'A outra pessoa saiu. ' : ''}+${PONTOS_ONLINE} pontos no placar da sala.` : 'Revanche?',
          feliz: venci,
          deNovo: null,
          numeros: [['Rodadas', e.rodada, true], ['Palavras', (e.usadas || []).length], ['Pontos', venci ? PONTOS_ONLINE : 0]],
        });
      }

      function sairOnline() {
        const o = online;
        if (!o) return;
        clearInterval(o.poll);
        if (!o.dados || o.dados.estado.status !== 'fim') Nuvem.rpc('batata_sair', { p_codigo: o.codigo }).catch(() => {});
        online = null;
      }

      /* ---------- Geral ---------- */
      function pararTudo() {
        clearInterval(relogio);
        clearTimeout(roboTimer);
        partida = null;
        palcoTela.estado.calor = 0;
        sairOnline();
      }

      function guia(forcar) {
        ctx.guia([
          { desenho: 'relogio', titulo: 'Batata Quente', texto: 'Aparece uma sílaba. Digite uma palavra que tenha essa sílaba antes de a bomba explodir na sua mão. Depois, a bomba passa para o outro lado.' },
          { desenho: 'livro', titulo: 'Só palavras de verdade', texto: 'Vale qualquer palavra do dicionário brasileiro com 3 letras ou mais, sem repetir na mesma partida. Acento não conta.' },
          { desenho: 'estrela', titulo: 'Vidas e bônus', texto: 'Cada um começa com 3 vidas. Usou todas as letras do alfabeto (sem K, W e Y) nas suas palavras? Ganha uma vida extra.' },
          { alvo: '#sd-bat-menu', desenho: 'controle', titulo: 'Cinco jeitos de jogar', texto: `Sozinho (o pavio encurta e o nível sobe a cada ${SOBE_NIVEL} s; vale o recorde), Treino (sem vidas e sem pontos), contra o robô (Fácil, Médio ou Difícil), lado a lado no mesmo computador ou online com um colega, por código.` },
        ], forcar);
      }

      menu();
      return {
        emAndamento: () => !!((partida && !partida.fim) || (online && online.dados && online.dados.estado.status === 'jogando')),
        parar() {
          encerrado = true;
          pararTudo();
          palcoTela.parar();
        },
      };

      /* ---------- A cena: um luau na praia à noite, que esquenta com o pavio ---------- */
      function cenaLuau() {
        const { COR, misturar, alfa, degrade, seme, tela } = Palco.pintar;
        let fundo = null; // o céu, a lua, o mar parado, a areia e os coqueiros, guardados (só refaz quando a tela muda)
        let chave = '';
        let geo = null;
        let brilhos = []; // o brilho de cada cor de lâmpada, desenhado uma vez
        let calor = 0; // o calor que se vê (vai atrás de estado.calor, sem pulo)
        let alivio = 0; // palavra aceita: o fogo baixa um instante
        let boom = 0; // o clarão da explosão
        let onda = null; // a onda de choque da explosão: { x, y, k }
        const brasas = [];
        const CORES_LAMPADA = [COR.amarelo, COR.coral, COR.turquesa, COR.lilas, COR.perola];

        /** Um coqueiro em silhueta: o tronco curvo e as folhas caídas; lado 1 inclina para a direita, −1 para a esquerda */
        function coqueiro(f, x, y, alto, lado) {
          const tx = x + lado * alto * 0.28;
          const ty = y - alto;
          f.strokeStyle = COR.fundo;
          f.lineCap = 'round';
          f.lineWidth = Math.max(5, alto * 0.05);
          f.beginPath();
          f.moveTo(x, y);
          f.quadraticCurveTo(x + lado * alto * 0.02, y - alto * 0.6, tx, ty);
          f.stroke();
          f.fillStyle = COR.fundo;
          [-2.8, -2.35, -1.9, -1.25, -0.8, -0.35].forEach((a, i) => {
            const comp = alto * (0.34 + (i % 3) * 0.05);
            const fx = tx + Math.cos(a) * comp;
            const fy = ty + Math.sin(a) * comp * 0.5 + comp * 0.45;
            const mx = tx + Math.cos(a) * comp * 0.5;
            const my = ty + Math.sin(a) * comp * 0.5;
            f.beginPath();
            f.moveTo(tx, ty);
            f.quadraticCurveTo(mx, my - comp * 0.22, fx, fy);
            f.quadraticCurveTo(mx, my - comp * 0.04, tx, ty + 4);
            f.fill();
          });
        }

        function pintar(L, A) {
          const r = seme(41);
          fundo = tela(L, A);
          const f = fundo.getContext('2d');
          const hz = A * 0.56; // o horizonte
          const praia = A * 0.7; // onde começa a areia
          const lua = { x: L * 0.78, y: A * 0.24, r: Math.max(16, Math.min(L, A) * 0.045) };
          const s = Math.max(0.7, Math.min(1.3, Math.min(L, A) / 700));
          geo = { hz, praia, lua, fogos: [{ x: L * 0.12, y: A * 0.93, s }, { x: L * 0.88, y: A * 0.95, s: s * 0.85 }] };
          // o céu: o marinho da noite e o resto do pôr do sol lá embaixo
          f.fillStyle = degrade(f, 0, hz, [[0, misturar(COR.fundo, COR.marinho, 0.4)], [0.65, misturar(COR.marinho, COR.lilas, 0.2)], [1, misturar(COR.lilas, COR.coral, 0.42)]]);
          f.fillRect(0, 0, L, hz);
          for (let i = 0; i < 110; i++) {
            const t2 = r() < 0.12 ? 2 : 1.2;
            f.fillStyle = alfa(COR.perola, 0.1 + r() * 0.45);
            f.fillRect(r() * L, r() * hz * 0.75, t2, t2);
          }
          // a lua, com o halo e umas manchas
          const halo = f.createRadialGradient(lua.x, lua.y, lua.r, lua.x, lua.y, lua.r * 5);
          halo.addColorStop(0, alfa(COR.perola, 0.18));
          halo.addColorStop(1, alfa(COR.perola, 0));
          f.fillStyle = halo;
          f.fillRect(lua.x - lua.r * 5, lua.y - lua.r * 5, lua.r * 10, lua.r * 10);
          f.fillStyle = misturar(COR.perola, COR.amarelo, 0.15);
          f.beginPath();
          f.arc(lua.x, lua.y, lua.r, 0, Math.PI * 2);
          f.fill();
          f.fillStyle = alfa(COR.suave, 0.14);
          [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.38, 0.12]].forEach(([dx, dy, rr]) => {
            f.beginPath();
            f.arc(lua.x + dx * lua.r, lua.y + dy * lua.r, rr * lua.r, 0, Math.PI * 2);
            f.fill();
          });
          // o mar e a areia (morna, com grão)
          f.fillStyle = degrade(f, hz, praia, [[0, misturar(COR.marinho, COR.lilas, 0.25)], [1, misturar(COR.fundo, COR.marinho, 0.5)]]);
          f.fillRect(0, hz, L, praia - hz);
          f.fillStyle = degrade(f, praia, A, [[0, misturar(COR.fundo, COR.laranja, 0.2)], [1, misturar(COR.fundo, COR.coral, 0.08)]]);
          f.fillRect(0, praia, L, A - praia);
          for (let i = 0, n = (L * (A - praia)) / 180; i < n; i++) {
            f.fillStyle = alfa(r() < 0.6 ? COR.perola : COR.fundo, 0.03 + r() * 0.05);
            f.fillRect(r() * L, praia + r() * (A - praia), 1.5, 1.5);
          }
          coqueiro(f, L * 0.02, praia + A * 0.03, A * 0.44, 1);
          coqueiro(f, L * 0.985, praia + A * 0.05, A * 0.36, -1);
          // o brilho de cada cor de lâmpada (um degradê só, reaproveitado)
          brilhos = CORES_LAMPADA.map((cor) => {
            const c = tela(32, 32);
            const b = c.getContext('2d');
            const d = b.createRadialGradient(16, 16, 0, 16, 16, 16);
            d.addColorStop(0, alfa(cor, 0.5));
            d.addColorStop(1, alfa(cor, 0));
            b.fillStyle = d;
            b.fillRect(0, 0, 32, 32);
            return c;
          });
        }

        /** A fogueira: a lenha cruzada e as labaredas em três camadas (coral por fora, laranja, amarelo no meio), cada
         *  língua de fogo no seu ritmo; k é o tamanho (0 a ~1,8) */
        function fogueira(g, x, y, s, t, k) {
          g.save();
          g.translate(x, y);
          g.fillStyle = misturar(COR.fundo, COR.laranja, 0.28);
          g.rotate(0.28);
          g.fillRect(-28 * s, -5 * s, 56 * s, 10 * s);
          g.rotate(-0.56);
          g.fillRect(-28 * s, -5 * s, 56 * s, 10 * s);
          g.restore();
          const alto = (36 + 34 * k) * s;
          [[COR.coral, 1, 0.8], [COR.laranja, 0.74, 0.88], [COR.amarelo, 0.48, 0.95]].forEach(([cor, esc, a], i) => {
            g.fillStyle = alfa(cor, a);
            const largura = (22 + 10 * k) * s * esc;
            const linguas = 5 - i;
            for (let j = 0; j < linguas; j++) {
              const u = j / (linguas - 1) - 0.5;
              const cx = x + u * largura * 1.2;
              const meio = 1 - Math.abs(u) * 1.1; // as do meio são mais altas
              const h2 = alto * esc * (0.55 + 0.45 * meio) * (1 + 0.12 * Math.sin(t * (8 + j * 1.7 + i * 2) + j * 2.1 + i));
              const w = largura * (0.42 + 0.1 * meio);
              const torce = Math.sin(t * (5 + j + i) + j * 1.3) * w * 0.35;
              g.beginPath();
              g.moveTo(cx - w, y - 2 * s);
              g.quadraticCurveTo(cx - w * 0.85, y - h2 * 0.55, cx + torce, y - h2);
              g.quadraticCurveTo(cx + w * 0.85, y - h2 * 0.55, cx + w, y - 2 * s);
              g.closePath();
              g.fill();
            }
          });
        }

        function desenhar(g, L, A, t, dt, est) {
          const nova = `${L}x${A}`;
          if (!fundo || nova !== chave) { chave = nova; pintar(L, A); }
          const alvo = Math.max(0, Math.min(1, est.calor || 0));
          calor = est.rm ? alvo : calor + (alvo - calor) * Math.min(1, dt * 4);
          alivio = Math.max(0, alivio - dt * 1.2);
          boom = Math.max(0, boom - dt * 1.4);
          const { hz, praia, lua, fogos } = geo;
          g.drawImage(fundo, 0, 0, L, A);
          // o mar mexendo, o reflexo da lua e a espuma na beira
          g.lineWidth = 1;
          for (let i = 0; i < 6; i++) {
            const y = hz + (praia - hz) * (0.1 + i * 0.15);
            g.strokeStyle = alfa(COR.claro, 0.05 + i * 0.012);
            g.beginPath();
            for (let x = 0; x <= L + 12; x += 12) {
              const yy = y + Math.sin(x / (40 + i * 12) + t * (0.6 + i * 0.15)) * (1 + i * 0.5);
              if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
            }
            g.stroke();
          }
          for (let i = 0; i < 14; i++) {
            const y = hz + 4 + i * ((praia - hz - 8) / 14);
            const w = lua.r * (1.6 - i * 0.05) * (0.6 + 0.4 * Math.sin(t * 1.5 + i * 1.3));
            g.fillStyle = alfa(COR.perola, 0.26 - i * 0.012);
            g.fillRect(lua.x - w / 2 + Math.sin(t + i) * 4, y, w, 1.5);
          }
          g.strokeStyle = alfa(COR.claro, 0.32);
          g.lineWidth = 2;
          g.beginPath();
          for (let x = 0; x <= L + 10; x += 10) {
            const yy = praia + Math.sin(x / 70 + t * 0.9) * 2.5 + Math.sin(t * 0.5) * 3;
            if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
          }
          g.stroke();
          // o varal de lâmpadas: pisca devagar; com o calor, cada vez mais rápido
          for (const [ponta, flecha, desloca] of [[A * 0.135, A * 0.075, 0], [A * 0.1, A * 0.06, 23]]) {
            const yDe = (x) => ponta + flecha * 4 * (x / L) * (1 - x / L);
            g.strokeStyle = alfa(COR.fundo, 0.9);
            g.lineWidth = 1.5;
            g.beginPath();
            for (let x = 0; x <= L + 16; x += 16) { if (x) g.lineTo(x, yDe(x)); else g.moveTo(x, yDe(x)); }
            g.stroke();
            for (let x = 20 + desloca, n = 0; x < L; x += 46, n++) {
              const y = yDe(x) + 4;
              const pisca = 0.55 + 0.45 * Math.sin(t * (1.6 + calor * 9) + n * 1.7 + desloca);
              const forte = Math.min(1, pisca + boom);
              g.globalAlpha = forte;
              g.drawImage(brilhos[n % brilhos.length], x - 16, y - 16);
              g.globalAlpha = 1;
              g.fillStyle = alfa(CORES_LAMPADA[n % CORES_LAMPADA.length], 0.55 + 0.4 * forte);
              g.beginPath();
              g.arc(x, y, 3.2, 0, Math.PI * 2);
              g.fill();
            }
          }
          // as fogueiras: crescem com o calor (e baixam quando a palavra entra), com o clarão em volta
          const k = Math.min(1.8, calor * (1 - 0.35 * alivio) + boom * 0.8);
          g.save();
          g.globalCompositeOperation = 'lighter';
          for (const fo of fogos) {
            const raio = (130 + 160 * k) * fo.s * (1 + (est.rm ? 0 : 0.04 * Math.sin(t * 7 + fo.x)));
            const d = g.createRadialGradient(fo.x, fo.y - 20 * fo.s, 0, fo.x, fo.y - 20 * fo.s, raio);
            d.addColorStop(0, alfa(COR.laranja, 0.24 + 0.22 * k));
            d.addColorStop(1, alfa(COR.laranja, 0));
            g.fillStyle = d;
            g.fillRect(fo.x - raio, fo.y - 20 * fo.s - raio, raio * 2, raio * 2);
          }
          g.restore();
          for (const fo of fogos) fogueira(g, fo.x, fo.y, fo.s, t, k);
          // as brasas subindo das fogueiras: mais e mais rápidas com o calor
          if (!est.rm) {
            for (const fo of fogos) {
              if (Math.random() < dt * (6 + calor * 38) * fo.s) {
                brasas.push({ x: fo.x + (Math.random() - 0.5) * 30 * fo.s, y: fo.y - 30 * fo.s, vx: (Math.random() - 0.5) * 30, vy: -(50 + Math.random() * 60) * (1 + calor * 1.4), v: 1, f: Math.random() * 6, cor: Math.random() < 0.6 ? COR.amarelo : COR.laranja });
              }
            }
            if (brasas.length > 240) brasas.splice(0, brasas.length - 240);
            for (let i = brasas.length - 1; i >= 0; i--) {
              const b = brasas[i];
              b.x += (b.vx + Math.sin(t * 3 + b.f) * 18) * dt;
              b.y += b.vy * dt;
              b.v -= dt * 0.45;
              if (b.v <= 0 || b.y < -10) { brasas.splice(i, 1); continue; }
              g.fillStyle = alfa(b.cor, Math.max(0, b.v) * (0.6 + 0.4 * Math.sin(t * 20 + b.f)));
              g.fillRect(b.x, b.y, 2.2, 2.2);
            }
          }
          // a tela esquentando: um véu morno e, no fim do pavio, a borda coral pulsando como um coração
          if (calor > 0.02) {
            g.fillStyle = alfa(COR.laranja, 0.06 * calor);
            g.fillRect(0, 0, L, A);
          }
          if (calor > 0.6) {
            const q = (calor - 0.6) / 0.4;
            const pulso = est.rm ? 1 : 0.6 + 0.4 * Math.sin(t * (4 + q * 9));
            const v = g.createRadialGradient(L / 2, A / 2, Math.min(L, A) * 0.32, L / 2, A / 2, Math.max(L, A) * 0.78);
            v.addColorStop(0, alfa(COR.coral, 0));
            v.addColorStop(1, alfa(COR.coral, 0.3 * q * pulso));
            g.fillStyle = v;
            g.fillRect(0, 0, L, A);
          }
          // a explosão: o clarão e a onda de choque
          if (onda) {
            onda.k += dt * 1.6;
            if (onda.k >= 1) onda = null;
            else {
              g.strokeStyle = alfa(COR.amarelo, 0.55 * (1 - onda.k));
              g.lineWidth = 2 + 8 * (1 - onda.k);
              g.beginPath();
              g.arc(onda.x, onda.y, onda.k * Math.max(L, A) * 0.6, 0, Math.PI * 2);
              g.stroke();
            }
          }
          if (boom > 0) {
            g.fillStyle = alfa(misturar(COR.amarelo, COR.branco, 0.5), 0.45 * boom * boom);
            g.fillRect(0, 0, L, A);
          }
        }

        function reagir(tipo, info, est) {
          const som = palcoTela.som;
          if (tipo === 'explosao') { // o estrondo que rola, o estalo, as faíscas e a tela inteira tremendo
            som.chiado({ filtro: 'lowpass', de: 900, ate: 60, q: 0.5, vol: 0.45, dur: 1.3, ataque: 0.01 });
            som.tom(70, 0.7, 'triangle', 0.16, 0.5);
            som.chiado({ filtro: 'highpass', de: 3000, vol: 0.08, dur: 0.25 });
            info.espirrar(info.x, info.y, COR.amarelo, 26, 1.8);
            info.espirrar(info.x, info.y, COR.laranja, 18, 1.4);
            info.espirrar(info.x, info.y, COR.coral, 12, 1.1);
            info.tremer(1);
            if (!est.rm) {
              boom = 1;
              onda = { x: info.x, y: info.y, k: 0 };
            }
          } else if (tipo === 'acerto') { // o "fiu" da bomba indo embora; o fogo baixa um pouco
            som.chiado({ filtro: 'bandpass', de: 700, ate: 2600, q: 0.9, vol: 0.06, dur: 0.25 });
            alivio = 1;
          }
        }

        return { desenhar, reagir };
      }
    },
  });
})();

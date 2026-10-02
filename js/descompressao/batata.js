/*
 * Batata Quente (Sala de Descompressão) — uma sílaba aparece; digite uma palavra que tenha essa sílaba
 * antes de a bomba explodir na sua mão.
 * - Só valem palavras do dicionário brasileiro (VERO; js/dicionario.js), com 3 letras ou mais e sem repetir
 *   palavra na mesma partida. Acento não conta: "AÇÃO" se digita ACAO.
 * - Cada pessoa começa com 3 vidas. A bomba explodiu na sua vez? Perde uma vida e a vez passa.
 *   O pavio encurta a cada rodada (menos 0,4 s por rodada, nunca abaixo de 5 s).
 * - Bônus do alfabeto: usou todas as letras de A a Z (sem K, W e Y) nas suas palavras? Ganha uma vida (até 5).
 * - Modos: contra o robô (Fácil, Médio ou Difícil), lado a lado no mesmo computador e online, com outra
 *   pessoa (sala com código de 4 letras; o banco confere vez, tempo, sílaba e repetidas: funções batata_*).
 * - Pontos (só no placar da sala): vitória online 30; contra o robô 10 (Fácil), 15 (Médio) ou 25 (Difícil);
 *   lado a lado não vale ponto. O placar soma até 150 por dia.
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
    abrir(ctx) {
      const cfg = { modo: 'robo', robo: 'medio', tempo: 15, nomes: [primeiroNome() || 'Jogador 1', 'Jogador 2'], ...(ctx.estado() || {}).cfg };
      let partida = null; // motor local (robô e lado a lado)
      let online = null; // { codigo, dados, poll, offset, explodindo, registrado }
      let relogio = 0;
      let roboTimer = 0;
      let encerrado = false;

      function primeiroNome() {
        const p = Nuvem.ativa && Nuvem.perfil && Nuvem.perfil();
        return p && p.nome ? String(p.nome).trim().split(/\s+/)[0] : '';
      }
      const guardarCfg = () => ctx.gravar({ cfg: { modo: cfg.modo, robo: cfg.robo, tempo: cfg.tempo, nomes: cfg.nomes } });

      /* ---------- Menu ---------- */
      function menu(aviso = '') {
        pararTudo();
        const dic = h('p', { class: 'sd-bat__dic texto-suave', 'aria-live': 'polite', text: 'Abrindo o dicionário brasileiro…' });
        Promise.all([Dicionario.carregar(), carregarSilabas(), Dicionario.palavrasComuns()])
          .then(() => (dic.textContent = 'Dicionário pronto: 4,4 milhões de palavras brasileiras.'))
          .catch(() => (dic.textContent = 'Não consegui abrir o dicionário. Confira a internet e volte à sala.'));
        const seg = (rotulo, campo, opcoes, depois) => {
          const g = h('div', { class: 'segmentado', role: 'group', 'aria-label': rotulo });
          opcoes.forEach(([v, t]) => g.append(h('button', { type: 'button', 'aria-pressed': String(cfg[campo] === v), onclick: () => {
            cfg[campo] = v;
            guardarCfg();
            if (depois) depois();
            else g.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(opcoes[i][0] === v)));
          } }, t)));
          return h('div', { class: 'sd-bat__opcao' }, h('span', { class: 'sd-bat__rotulo', text: rotulo }), g);
        };
        const extras = h('div', { class: 'sd-bat__extras' });
        if (cfg.modo === 'robo') extras.append(seg('Robô', 'robo', Object.entries(ROBOS).map(([k, r]) => [k, r.nome])));
        if (cfg.modo === 'local') {
          extras.append(h('div', { class: 'sd-bat__nomes' }, [0, 1].map((i) => h('label', { class: 'sd-campo' }, h('span', { text: i ? 'Quem fica à direita' : 'Quem fica à esquerda' }),
            h('input', { class: 'campo', maxlength: '16', value: cfg.nomes[i], oninput: (e) => {
              cfg.nomes[i] = e.target.value.trim() || `Jogador ${i + 1}`;
              guardarCfg();
            } })))));
        }
        let acoes;
        if (cfg.modo === 'online') {
          const pode = Nuvem.ativa && Nuvem.temSessao();
          const cod = h('input', { class: 'campo sd-bat__codigo-campo', id: 'sd-bat-codigo', maxlength: '4', autocomplete: 'off', placeholder: 'ABCD', 'aria-label': 'Código da sala' });
          acoes = pode ? h('div', { class: 'sd-bat__online' },
            h('button', { type: 'button', class: 'botao botao--primario', onclick: () => criarSala() }, icone('i-mais'), 'Criar sala'),
            h('span', { class: 'texto-suave', text: 'ou' }),
            h('form', { class: 'sd-bat__entrar', onsubmit: (e) => {
              e.preventDefault();
              entrarSala(cod.value);
            } }, cod, h('button', { type: 'submit', class: 'botao botao--secundario' }, 'Entrar')))
            : h('p', { class: 'texto-suave', text: 'Para jogar online, entre com sua conta do Diver.' });
        } else {
          acoes = h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-bat-comecar', onclick: comecarLocal }, icone('i-raio'), 'Começar'));
        }
        ctx.container.replaceChildren(h('div', { class: 'sd-bat' },
          h('section', { class: 'cartao sd-bat__menu', id: 'sd-bat-menu' },
            h('div', { class: 'sd-bat__topo' },
              h('h2', { class: 'cartao__titulo', text: 'Como vai ser?' }),
              h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => guia(true) }, icone('i-livro'), 'Como jogar')),
            seg('Modo', 'modo', [['robo', 'Contra o robô'], ['local', 'Lado a lado'], ['online', 'Online']], () => menu()),
            extras,
            seg(cfg.modo === 'online' ? 'Pavio (de quem cria a sala)' : 'Pavio', 'tempo', PAVIOS.map((t) => [t, `${t} s`])),
            aviso ? h('p', { class: 'texto-erro', role: 'alert', text: aviso }) : null,
            acoes,
            dic)));
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
        ctx.container.replaceChildren(raiz);
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
      }

      function sacudir(t, texto, tipo = 'erro') {
        t.msg.textContent = texto;
        t.msg.className = `sd-bat__msg sd-bat__msg--${tipo}`;
        if (tipo !== 'erro' || UI.movimentoReduzido) return;
        t.form.classList.remove('sd-bat__form--tremer');
        void t.form.offsetWidth;
        t.form.classList.add('sd-bat__form--tremer');
      }

      function explosao(t) {
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
          vidas: [VIDAS, VIDAS], letras: ['', ''], ultima: ['', ''], silaba: sortearSilaba(s, 0), prazo: 0, total: 0, fim: false,
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
        fimDePartida(p.t, p.robo
          ? (vencedor === 0 ? `Você venceu o Robô ${p.robo.nome}! +${pontos} pontos no placar da sala.` : `O Robô ${p.robo.nome} venceu dessa vez. Revanche?`)
          : `${p.nomes[vencedor]} venceu! Boa partida, Divers.`, souEu, comecarLocal);
      }

      function fimDePartida(t, texto, feliz, deNovo) {
        t.vez.textContent = '';
        t.form.hidden = true;
        t.msg.className = `sd-bat__msg ${feliz ? 'sd-bat__msg--ok' : 'sd-bat__msg--boom'}`;
        t.msg.textContent = texto;
        t.msg.after(h('div', { class: 'acoes-linha sd-bat__fim' },
          deNovo ? h('button', { type: 'button', class: 'botao botao--primario', onclick: deNovo }, 'Jogar de novo') : null,
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => menu() }, 'Trocar modo'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala')));
        const b = t.raiz.querySelector('.sd-bat__fim .botao');
        if (b) b.focus();
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
        ctx.container.replaceChildren(h('div', { class: 'sd-bat' }, h('section', { class: 'cartao sd-bat__espera' },
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
        fimDePartida(o.t, venci
          ? `${saiu ? 'A outra pessoa saiu. ' : ''}Você venceu! +${PONTOS_ONLINE} pontos no placar da sala.`
          : `${d.nomes[e.vencedor] || 'A outra pessoa'} venceu dessa vez. Revanche?`, venci, null);
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
        sairOnline();
      }

      function guia(forcar) {
        ctx.guia([
          { desenho: 'relogio', titulo: 'Batata Quente', texto: 'Aparece uma sílaba. Digite uma palavra que tenha essa sílaba antes de a bomba explodir na sua mão. Depois, a bomba passa para o outro lado.' },
          { desenho: 'livro', titulo: 'Só palavras de verdade', texto: 'Vale qualquer palavra do dicionário brasileiro com 3 letras ou mais, sem repetir na mesma partida. Acento não conta.' },
          { desenho: 'estrela', titulo: 'Vidas e bônus', texto: 'Cada um começa com 3 vidas. Usou todas as letras do alfabeto (sem K, W e Y) nas suas palavras? Ganha uma vida extra.' },
          { alvo: '#sd-bat-menu', desenho: 'controle', titulo: 'Três jeitos de jogar', texto: 'Contra o robô (Fácil, Médio ou Difícil), lado a lado no mesmo computador ou online com um colega, por código. O pavio encurta a cada rodada.' },
        ], forcar);
      }

      menu();
      return {
        emAndamento: () => !!((partida && !partida.fim) || (online && online.dados && online.dados.estado.status === 'jogando')),
        parar() {
          encerrado = true;
          pararTudo();
        },
      };
    },
  });
})();

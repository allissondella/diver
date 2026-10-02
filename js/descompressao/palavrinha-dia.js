/*
 * Palavrinha (Sala de Descompressão) — dois jeitos de jogar:
 *   · Palavra do dia: uma palavra nova por dia, de 5 a 10 letras, a mesma para todo mundo.
 *   · Treino livre: palavras sorteadas do mesmo banco, quantas quiser; vale bem menos pontos.
 * - 6 tentativas; o tabuleiro tem o tamanho da palavra do dia (5 a 10 casas). Cada palpite pinta as letras: lugar certo (turquesa), na palavra em outro lugar (amarelo)
 *   ou fora (apagada). Acento e cedilha não contam: "ÁGUIA" se digita AGUIA.
 * - Só vale palpite que existe no dicionário brasileiro (VERO, data/dicionario/palavrinha/<n>.txt: só a lista do
 *   tamanho do dia é baixada); senão aparece
 *   "Essa palavra não faz parte do nosso dicionário brasileiro." e a tentativa não é gasta.
 * - Palavra do dia: nosso banco (data/sala/palavras-do-dia.json, palavras do dia a dia sem palavrões nem ofensas),
 *   embaralhado com semente fixa; o dia escolhe a posição, então nenhuma palavra se repete até o banco acabar.
 * - Pontos (só no placar da sala): palavra do dia (7 − tentativas) × 10 (1ª = 60); treino (7 − tentativas) × 2
 *   (1ª = 12), com até 60 por dia de treino no placar (ranking_sala). Não acertou = 0.
 */
(() => {
  const { h, icone, plural } = UI;
  const MIN = 5;
  const MAX = 10;
  const TENTATIVAS = 6;
  const TECLADO = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const NOME_STATUS = { certa: 'no lugar certo', lugar: 'em outro lugar', fora: 'não está na palavra' };
  const INICIO = new Date(2026, 0, 1);
  const PONTOS = { dia: 10, treino: 2 }; // por tentativa que sobrou
  let lista = null;

  function avaliar(palpite, alvo) {
    const r = Array(alvo.length).fill('fora');
    const sobra = {};
    for (let i = 0; i < alvo.length; i++) {
      if (palpite[i] === alvo[i]) r[i] = 'certa';
      else sobra[alvo[i]] = (sobra[alvo[i]] || 0) + 1;
    }
    for (let i = 0; i < alvo.length; i++) {
      if (r[i] !== 'certa' && sobra[palpite[i]] > 0) {
        r[i] = 'lugar';
        sobra[palpite[i]]--;
      }
    }
    return r;
  }

  async function carregarBanco() {
    if (!lista) {
      const r = await fetch('data/sala/palavras-do-dia.json');
      if (!r.ok) throw new Error('Não consegui abrir a lista de palavras.');
      const dados = await r.json();
      const sorteio = Descompressao.aleatorio('diver-sala-palavrinha');
      const a = dados.palavras.filter((p) => Dicionario.normalizar(p).length >= MIN && Dicionario.normalizar(p).length <= MAX);
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(sorteio() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      lista = a;
    }
    return lista;
  }

  async function palavraDoDia(hoje) {
    await carregarBanco();
    const [y, m, d] = hoje.split('-').map(Number);
    const dias = Math.round((new Date(y, m - 1, d) - INICIO) / 86400000);
    const original = lista[((dias % lista.length) + lista.length) % lista.length];
    return { original, palavra: Dicionario.normalizar(original) };
  }

  /** Estatísticas guardadas no aparelho (e na nuvem, junto com o progresso). */
  function resumo(hist) {
    const dias = Object.keys(hist).sort();
    const dist = Array(TENTATIVAS).fill(0);
    let vitorias = 0;
    dias.forEach((d) => {
      if (hist[d] > 0) {
        vitorias++;
        dist[hist[d] - 1]++;
      }
    });
    // Sequência: dias seguidos com vitória, terminando hoje ou ontem
    let seq = 0;
    const cursor = new Date();
    if (!(hist[UI.dataLocal(cursor)] > 0)) cursor.setDate(cursor.getDate() - 1);
    while (hist[UI.dataLocal(cursor)] > 0) {
      seq++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { jogos: dias.length, vitorias, dist, seq };
  }

  Descompressao.registrar({
    id: 'palavrinha',
    nome: 'Palavrinha',
    curto: 'Palavrinha',
    icone: 'i-letras',
    duracao: '2 a 5 min · palavra do dia + treino',
    diario: true,
    treino: true,
    descricao: 'Uma palavra nova por dia, de 5 a 10 letras, a mesma para todo mundo, e o Treino livre para jogar quanto quiser (vale menos pontos). Só vale palavra do nosso dicionário.',
    abrir(ctx) {
      let ativo = true;
      let aoTeclar = null;
      let aoRedim = null;
      const doDiaFeito = () => { const s = ctx.estado() || {}; return !!(s.partida && s.partida.data === ctx.hoje && s.partida.alvo && s.partida.fim); };
      abrirModo(doDiaFeito() ? 'treino' : 'dia');

      function soltarEventos() {
        if (aoTeclar) document.removeEventListener('keydown', aoTeclar);
        if (aoRedim) window.removeEventListener('resize', aoRedim);
        aoTeclar = null;
        aoRedim = null;
      }

      /** Abre a palavra do dia ou o treino (continua a partida guardada, se houver). */
      function abrirModo(modo, { nova = false } = {}) {
        soltarEventos();
        ctx.container.replaceChildren(h('p', { class: 'texto-suave', text: 'Abrindo o dicionário…' }));
        palavraDoDia(ctx.hoje).then(async (doDia) => {
          const salvo = ctx.estado() || {};
          let alvo;
          if (modo === 'dia') {
            // Partida de hoje já começada? Continua com a palavra guardada nela (mesmo que o banco mude no meio do dia)
            const p = salvo.partida && salvo.partida.data === ctx.hoje && salvo.partida.alvo ? salvo.partida : null;
            alvo = p ? p.alvo : doDia;
          } else {
            const t = salvo.treino;
            if (t && t.alvo && !t.fim && !nova) alvo = t.alvo;
            else {
              const banco = (await carregarBanco()).filter((w) => Dicionario.normalizar(w) !== doDia.palavra && !(salvo.treinoVistas || []).includes(Dicionario.normalizar(w)));
              const original = banco[Math.floor(Math.random() * banco.length)];
              alvo = { original, palavra: Dicionario.normalizar(original) };
              ctx.gravar({ treino: { alvo, palpites: [], fim: false, registrado: false }, treinoVistas: [...(salvo.treinoVistas || []), alvo.palavra].slice(-200) });
            }
          }
          const listaDoTamanho = await Dicionario.tamanho(alvo.palavra.length);
          if (ativo) montar(modo, alvo, listaDoTamanho);
        }).catch((e) => {
          if (ativo) ctx.container.replaceChildren(h('p', { class: 'texto-erro', text: e.message || 'Não consegui abrir o jogo. Confira a internet e tente de novo.' }));
        });
      }

      function montar(modo, alvo, lista) {
        const treino = modo === 'treino';
        const LETRAS = alvo.palavra.length;
        const salvo = ctx.estado() || {};
        const hist = salvo.historico || {};
        const stats = salvo.treinoStats || { jogos: 0, vitorias: 0 };
        // Palavra do dia: partida antiga (de antes de a palavra ficar guardada nela) recomeça: o placar conta só o melhor do dia
        let partida = treino ? salvo.treino
          : salvo.partida && salvo.partida.data === ctx.hoje && salvo.partida.alvo ? salvo.partida : { data: ctx.hoje, palpites: [], fim: false, registrado: false };
        partida.alvo = { original: alvo.original, palavra: alvo.palavra };
        let atual = '';
        const gravar = () => ctx.gravar(treino ? { treino: partida, treinoStats: stats } : { partida, historico: hist });

        const raiz = h('div', { class: 'pal sd-pal', style: `--letras:${LETRAS}` });
        const modos = h('div', { class: 'segmentado sd-pal__modos', role: 'group', 'aria-label': 'Modo' },
          [['dia', 'Palavra do dia'], ['treino', 'Treino livre']].map(([m, t]) => h('button', { type: 'button', 'aria-pressed': String(m === modo), onclick: () => m !== modo && abrirModo(m) }, t)));
        const info = h('div', { class: 'sd-pal__info' },
          treino ? h('span', { class: 'chip chip--ativo', text: 'Treino livre · vale menos' })
            : h('span', { class: 'chip chip--hoje' }, icone('i-calendario'), new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })),
          h('span', { class: 'sd-pal__tentativa texto-suave' }),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', id: 'sd-pal-como', onclick: () => guia(true) }, icone('i-livro'), 'Como jogar'));
        const grade = h('div', { class: 'pal-grade', id: 'sd-pal-grade' });
        const msg = h('p', { class: 'pal-msg', 'aria-live': 'polite' });
        const anuncio = h('p', { class: 'visualmente-oculto', 'aria-live': 'polite' });
        const teclado = h('div', { class: 'pal-teclado', id: 'sd-pal-teclado', role: 'group', 'aria-label': 'Teclado' });
        const fimBox = h('div', { class: 'sd-pal__fim' });
        raiz.append(modos, info, h('div', { class: 'pal-tabuleiros' }, h('section', { class: 'pal-tabuleiro', 'aria-label': 'Tabuleiro' }, grade)), msg, anuncio, teclado, fimBox);
        ctx.container.replaceChildren(raiz);

        TECLADO.forEach((linha, n) => {
          const fila = h('div', { class: 'pal-teclado__linha' });
          if (n === 2) fila.append(h('button', { type: 'button', class: 'pal-tecla pal-tecla--larga', onclick: confirmar, 'aria-label': 'Confirmar palpite' }, 'Enter'));
          linha.split('').forEach((l) => fila.append(h('button', { type: 'button', class: 'pal-tecla', 'data-l': l, onclick: () => digitar(l) }, h('span', { class: 'pal-tecla__letra', text: l }))));
          if (n === 2) fila.append(h('button', { type: 'button', class: 'pal-tecla pal-tecla--larga', onclick: apagar, 'aria-label': 'Apagar letra' }, '⌫'));
          teclado.append(fila);
        });

        function desenhar() {
          const linhas = [];
          for (let t = 0; t < TENTATIVAS; t++) {
            const p = partida.palpites[t];
            let letras;
            let rotulo = null;
            if (p) {
              const cores = avaliar(p, alvo.palavra);
              rotulo = `Tentativa ${t + 1}: ${p.split('').map((l, i) => `${l} ${NOME_STATUS[cores[i]]}`).join(', ')}`;
              letras = p.split('').map((l, i) => h('span', { class: `pal-letra pal-letra--${cores[i]}`, text: l.toUpperCase() }));
            } else if (t === partida.palpites.length && !partida.fim) {
              letras = Array.from({ length: LETRAS }, (_, i) => h('span', { class: `pal-letra pal-letra--digitando ${i === atual.length ? 'pal-letra--cursor' : ''}`.trim(), text: (atual[i] || '').toUpperCase() }));
            } else {
              letras = Array.from({ length: LETRAS }, () => h('span', { class: 'pal-letra' }));
            }
            linhas.push(h('div', { class: 'pal-linha', role: rotulo ? 'img' : null, 'aria-label': rotulo, 'aria-hidden': rotulo ? null : 'true' }, letras));
          }
          grade.replaceChildren(...linhas);
          info.querySelector('.sd-pal__tentativa').textContent = partida.fim ? (treino ? 'Palavra encerrada' : 'Partida de hoje encerrada') : `Tentativa ${partida.palpites.length + 1} de ${TENTATIVAS}`;
          // Teclado: a melhor informação de cada letra
          const ordem = { fora: 1, lugar: 2, certa: 3 };
          teclado.querySelectorAll('.pal-tecla[data-l]').forEach((tecla) => {
            const l = tecla.dataset.l.toLowerCase();
            let melhor = null;
            partida.palpites.forEach((p) => p.split('').forEach((x, i) => {
              if (x !== l) return;
              const c = avaliar(p, alvo.palavra)[i];
              if (!melhor || ordem[c] > ordem[melhor]) melhor = c;
            }));
            tecla.className = `pal-tecla ${melhor ? `pal-tecla--${melhor}` : ''}`.trim();
            tecla.setAttribute('aria-label', `${l.toUpperCase()}${melhor ? `: ${NOME_STATUS[melhor]}` : ''}`);
          });
          ajustar();
          if (partida.fim) mostrarFim();
        }

        function ajustar() {
          const largura = Math.min(ctx.container.clientWidth || 340, document.documentElement.clientWidth - 32);
          const altura = Math.max(260, window.innerHeight - 380);
          const vao = LETRAS > 7 ? 4 : 6;
          const tam = Math.max(24, Math.min(60, Math.floor(largura / LETRAS - vao - 1), Math.floor(altura / TENTATIVAS - vao)));
          raiz.style.setProperty('--tam', `${tam}px`);
          raiz.style.setProperty('--vao', `${vao}px`);
        }

        function tremer(texto) {
          msg.textContent = texto;
          raiz.classList.remove('pal--tremer');
          void raiz.offsetWidth;
          raiz.classList.add('pal--tremer');
        }
        function digitar(l) {
          if (partida.fim || atual.length >= LETRAS) return;
          atual += l.toLowerCase();
          msg.textContent = '';
          desenhar();
        }
        function apagar() {
          if (partida.fim || !atual) return;
          atual = atual.slice(0, -1);
          desenhar();
        }
        function confirmar() {
          if (partida.fim) return;
          if (atual.length < LETRAS) return tremer(`A palavra tem ${LETRAS} letras.`);
          if (!lista.existe(atual)) return tremer('Essa palavra não faz parte do nosso dicionário brasileiro.');
          if (partida.palpites.includes(atual)) return tremer('Você já tentou essa.');
          partida.palpites.push(atual);
          const cores = avaliar(atual, alvo.palavra);
          anuncio.textContent = atual.split('').map((l, i) => `${l} ${NOME_STATUS[cores[i]]}`).join(', ');
          const venceu = atual === alvo.palavra;
          atual = '';
          if (venceu || partida.palpites.length >= TENTATIVAS) {
            partida.fim = true;
            partida.venceu = venceu;
            if (treino) {
              stats.jogos++;
              if (venceu) stats.vitorias++;
            } else hist[ctx.hoje] = venceu ? partida.palpites.length : 0;
          }
          gravar();
          desenhar();
        }

        function mostrarFim() {
          if (fimBox.childElementCount) return;
          const t = partida.palpites.length;
          const pontos = partida.venceu ? (TENTATIVAS + 1 - t) * PONTOS[modo] : 0;
          if (!partida.registrado) {
            partida.registrado = true;
            gravar();
            ctx.pontuar(pontos, { venceu: !!partida.venceu, tentativas: t, modo, letras: LETRAS });
          }
          if (treino) {
            msg.replaceChildren(h('span', { class: partida.venceu ? 'texto-sucesso' : 'texto-erro', text: partida.venceu
              ? `Mandou bem, Diver! Acertou na ${t}ª tentativa: +${plural(pontos, 'ponto', 'pontos')} de treino.`
              : 'Essa escapou. Bora a próxima?' }));
            teclado.hidden = true;
            fimBox.replaceChildren(
              h('p', { class: 'pal-revela', text: `A palavra era: ${alvo.original.toUpperCase()}` }),
              h('p', { class: 'texto-suave sd-pal__nota', text: `Treino: ${stats.vitorias} de ${plural(stats.jogos, 'palavra', 'palavras')} certas. Vale ${PONTOS.treino} pontos por tentativa que sobrou (até 60 por dia no placar); a palavra do dia vale ${PONTOS.dia}.` }),
              h('div', { class: 'acoes-linha' },
                h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-pal-nova', onclick: () => abrirModo('treino', { nova: true }) }, icone('i-revisao'), 'Nova palavra'),
                h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala')));
            fimBox.querySelector('#sd-pal-nova').focus({ preventScroll: true });
            return;
          }
          const r = resumo(hist);
          const max = Math.max(1, ...r.dist);
          msg.replaceChildren(h('span', { class: partida.venceu ? 'texto-sucesso' : 'texto-erro', text: partida.venceu
            ? `Mandou bem, Diver! Acertou na ${t}ª tentativa: +${pontos} pontos no placar da sala.`
            : 'Dessa vez a palavra escapou. Amanhã tem outra!' }));
          teclado.hidden = true;
          fimBox.replaceChildren(
            h('p', { class: 'pal-revela', text: `A palavra de hoje: ${alvo.original.toUpperCase()}` }),
            h('section', { class: 'cartao pal-cartao' },
              h('h2', { class: 'cartao__titulo', text: 'Suas estatísticas' }),
              h('ul', { class: 'pal-numeros' },
                h('li', {}, h('strong', { text: String(r.jogos) }), h('span', { text: 'jogos' })),
                h('li', {}, h('strong', { text: `${r.jogos ? Math.round((r.vitorias / r.jogos) * 100) : 0}%` }), h('span', { text: 'de acertos' })),
                h('li', {}, h('strong', { text: String(r.seq) }), h('span', { text: plural(r.seq, 'dia seguido', 'dias seguidos').replace(/^\d+ /, '') })),
                h('li', {}, h('strong', { text: String(r.vitorias) }), h('span', { text: 'vitórias' }))),
              h('figure', { class: 'pal-dist' },
                h('figcaption', { class: 'pal-dist__titulo', text: 'Acertou em quantas tentativas' }),
                h('ol', { class: 'pal-dist__lista' }, r.dist.map((n, i) => h('li', { class: 'pal-dist__linha', title: `${plural(n, 'vitória', 'vitórias')} na ${i + 1}ª tentativa` },
                  h('span', { class: 'pal-dist__num', text: String(i + 1) }),
                  h('span', { class: 'pal-dist__trilho', 'aria-hidden': 'true' }, h('span', { class: 'pal-dist__barra', style: `width:${n ? Math.max(6, (n / max) * 100) : 0}%` })),
                  h('span', { class: 'pal-dist__valor', text: String(n) })))))),
            h('div', { class: 'acoes-linha' },
              h('button', { type: 'button', class: 'botao botao--primario', onclick: () => abrirModo('treino') }, icone('i-revisao'), 'Treino livre'),
              h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala')));
        }

        aoTeclar = (e) => {
          if (e.ctrlKey || e.metaKey || e.altKey || Tutorial.aberto() || document.querySelector('dialog[open]')) return;
          if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
          if (e.key === 'Enter') {
            if (e.target.closest && e.target.closest('button')) return; // Enter num botão = clicar nele
            e.preventDefault();
            confirmar();
          } else if (e.key === 'Backspace') {
            e.preventDefault();
            apagar();
          } else if (/^[a-zçA-ZÇ]$/.test(e.key)) {
            digitar(Dicionario.normalizar(e.key));
          }
        };
        document.addEventListener('keydown', aoTeclar);
        aoRedim = ajustar;
        window.addEventListener('resize', aoRedim);
        desenhar();
        guia(false);
      }

      function guia(forcar) {
        ctx.guia([
          { alvo: '#sd-pal-grade', desenho: 'livro', titulo: 'Palavrinha', texto: 'Uma palavra nova por dia, de 5 a 10 letras (os quadradinhos mostram quantas), a mesma para todo mundo. Você tem 6 tentativas. Acento não conta: ÁGUIA se digita AGUIA.' },
          { alvo: '.sd-pal__modos', desenho: 'revisao', titulo: 'Treino livre', texto: 'Quer mais? No Treino livre você joga quantas palavras quiser. Vale menos pontos que a palavra do dia.' },
          { alvo: '#sd-pal-grade', desenho: 'estrela', titulo: 'As cores', texto: 'Turquesa: letra no lugar certo. Amarelo: está na palavra, em outro lugar. Apagada: não está. A marquinha em cada letra ajuda quem não distingue cores.' },
          { alvo: '#sd-pal-teclado', desenho: 'carta', titulo: 'Só palavras de verdade', texto: 'Cada palpite precisa existir no nosso dicionário brasileiro. Se não existir, eu aviso e você não perde a tentativa.' },
          { desenho: 'trofeu', titulo: 'Pontos da sala', texto: `Palavra do dia: 60 pontos na 1ª tentativa, 10 na 6ª. Treino: ${PONTOS.treino * 6} na 1ª, até 60 por dia. Tudo vale só o placar da Sala de Descompressão.` },
        ], forcar);
      }

      return {
        emAndamento: () => false, // a partida fica salva: pode sair e voltar
        parar() {
          ativo = false;
          soltarEventos();
        },
      };
    },
  });
})();

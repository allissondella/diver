/*
 * Palavrinha do Dia (Sala de Descompressão) — uma palavra de 5 letras por dia, a mesma para todo mundo.
 * - 6 tentativas. Cada palpite pinta as letras: lugar certo (turquesa), na palavra em outro lugar (amarelo)
 *   ou fora (apagada). Acento e cedilha não contam: "ÁGUIA" se digita AGUIA.
 * - Só vale palpite que existe no dicionário brasileiro (VERO, data/dicionario/pt-br-5.txt); senão aparece
 *   "Essa palavra não faz parte do nosso dicionário brasileiro." e a tentativa não é gasta.
 * - Palavra do dia: data/sala/palavras-do-dia.json, embaralhada com semente fixa; o dia escolhe a posição.
 * - Pontos (só no placar da sala): (7 − tentativas) × 10. Acertou na 1ª = 60; não acertou = 0.
 */
(() => {
  const { h, icone, plural } = UI;
  const LETRAS = 5;
  const TENTATIVAS = 6;
  const TECLADO = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const NOME_STATUS = { certa: 'no lugar certo', lugar: 'em outro lugar', fora: 'não está na palavra' };
  const INICIO = new Date(2026, 0, 1);
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

  async function palavraDoDia(hoje) {
    if (!lista) {
      const r = await fetch('data/sala/palavras-do-dia.json');
      if (!r.ok) throw new Error('Não consegui abrir a lista de palavras.');
      const dados = await r.json();
      const sorteio = Descompressao.aleatorio('diver-sala-palavrinha');
      const a = dados.palavras.filter((p) => Dicionario.normalizar(p).length === LETRAS);
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(sorteio() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      lista = a;
    }
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
    nome: 'Palavrinha do Dia',
    curto: 'Palavrinha',
    icone: 'i-letras',
    duracao: '2 a 5 min · 1 por dia',
    diario: true,
    descricao: 'Uma palavra de 5 letras por dia, a mesma para todo mundo. Seis tentativas e só vale palavra do nosso dicionário.',
    abrir(ctx) {
      let ativo = true;
      let aoTeclar = null;
      let aoRedim = null;
      ctx.container.replaceChildren(h('p', { class: 'texto-suave', text: 'Abrindo o dicionário…' }));
      Promise.all([palavraDoDia(ctx.hoje), Dicionario.cincoLetras()]).then(([alvo, validas]) => {
        if (ativo) montar(alvo, validas);
      }).catch((e) => {
        if (ativo) ctx.container.replaceChildren(h('p', { class: 'texto-erro', text: e.message || 'Não consegui abrir o jogo. Confira a internet e tente de novo.' }));
      });

      function montar(alvo, validas) {
        const salvo = ctx.estado() || {};
        const hist = salvo.historico || {};
        let partida = salvo.partida && salvo.partida.data === ctx.hoje ? salvo.partida : { data: ctx.hoje, palpites: [], fim: false, registrado: false };
        let atual = '';
        const gravar = () => ctx.gravar({ partida, historico: hist });

        const raiz = h('div', { class: 'pal sd-pal', style: `--letras:${LETRAS}` });
        const info = h('div', { class: 'sd-pal__info' },
          h('span', { class: 'chip chip--hoje' }, icone('i-calendario'), new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })),
          h('span', { class: 'sd-pal__tentativa texto-suave' }),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', id: 'sd-pal-como', onclick: () => guia(true) }, icone('i-livro'), 'Como jogar'));
        const grade = h('div', { class: 'pal-grade', id: 'sd-pal-grade' });
        const msg = h('p', { class: 'pal-msg', 'aria-live': 'polite' });
        const anuncio = h('p', { class: 'visualmente-oculto', 'aria-live': 'polite' });
        const teclado = h('div', { class: 'pal-teclado', id: 'sd-pal-teclado', role: 'group', 'aria-label': 'Teclado' });
        const fimBox = h('div', { class: 'sd-pal__fim' });
        raiz.append(info, h('div', { class: 'pal-tabuleiros' }, h('section', { class: 'pal-tabuleiro', 'aria-label': 'Tabuleiro' }, grade)), msg, anuncio, teclado, fimBox);
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
          info.querySelector('.sd-pal__tentativa').textContent = partida.fim ? 'Partida de hoje encerrada' : `Tentativa ${partida.palpites.length + 1} de ${TENTATIVAS}`;
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
          const tam = Math.max(34, Math.min(60, Math.floor(largura / LETRAS - 8), Math.floor(altura / TENTATIVAS - 8)));
          raiz.style.setProperty('--tam', `${tam}px`);
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
          if (!validas.has(atual)) return tremer('Essa palavra não faz parte do nosso dicionário brasileiro.');
          if (partida.palpites.includes(atual)) return tremer('Você já tentou essa.');
          partida.palpites.push(atual);
          const cores = avaliar(atual, alvo.palavra);
          anuncio.textContent = atual.split('').map((l, i) => `${l} ${NOME_STATUS[cores[i]]}`).join(', ');
          const venceu = atual === alvo.palavra;
          atual = '';
          if (venceu || partida.palpites.length >= TENTATIVAS) {
            partida.fim = true;
            partida.venceu = venceu;
            hist[ctx.hoje] = venceu ? partida.palpites.length : 0;
          }
          gravar();
          desenhar();
        }

        function mostrarFim() {
          if (fimBox.childElementCount) return;
          const t = partida.palpites.length;
          const pontos = partida.venceu ? (TENTATIVAS + 1 - t) * 10 : 0;
          if (!partida.registrado) {
            partida.registrado = true;
            gravar();
            ctx.pontuar(pontos, { venceu: !!partida.venceu, tentativas: t });
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
            h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--primario', onclick: ctx.voltar }, 'Voltar para a sala')));
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
          { alvo: '#sd-pal-grade', desenho: 'livro', titulo: 'A palavra do dia', texto: 'Uma palavra de 5 letras, a mesma para todo mundo hoje. Você tem 6 tentativas. Acento não conta: ÁGUIA se digita AGUIA.' },
          { alvo: '#sd-pal-grade', desenho: 'estrela', titulo: 'As cores', texto: 'Turquesa: letra no lugar certo. Amarelo: está na palavra, em outro lugar. Apagada: não está. A marquinha em cada letra ajuda quem não distingue cores.' },
          { alvo: '#sd-pal-teclado', desenho: 'carta', titulo: 'Só palavras de verdade', texto: 'Cada palpite precisa existir no nosso dicionário brasileiro. Se não existir, eu aviso e você não perde a tentativa.' },
          { desenho: 'trofeu', titulo: 'Pontos da sala', texto: 'Acertou na 1ª: 60 pontos; na 6ª: 10. Os pontos valem só o placar da Sala de Descompressão.' },
        ], forcar);
      }

      return {
        emAndamento: () => false, // a partida fica salva: pode sair e voltar
        parar() {
          ativo = false;
          if (aoTeclar) document.removeEventListener('keydown', aoTeclar);
          if (aoRedim) window.removeEventListener('resize', aoRedim);
        },
      };
    },
  });
})();

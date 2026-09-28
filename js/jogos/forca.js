/*
 * Forca do Náufrago (forca) — descubra a palavra-chave letra por letra.
 * Cada erro tira uma peça da jangada (6 erros e ela se desmonta, sem nada violento).
 * Dica extra (revela uma letra) custa 1 pérola. Teclado físico e teclado na tela.
 * Palavras do bloco "palavras" da trilha ou derivadas das respostas curtas.
 */
Jogos.registrar({
  id: 'forca',
  nome: 'Forca do Náufrago',
  grupo: 'aventuras',
  icone: 'i-jangada',
  descricao: 'Descubra a palavra-chave antes que a jangada se desmonte.',
  duracao: '2-5 min',
  requer: { palavras: 1 },

  iniciar(ctx) {
    const { h } = UI;
    const MAX_ERROS = 6;
    const fila = UI.embaralhar(ctx.cartas.palavras).slice(0, ctx.opcoes.quantidade || 3);
    const detalhes = [];
    const inicio = Date.now();
    let i = 0;
    let desligar = null;

    // Jangada em SVG: cada peça some a cada erro (bandeira, vela, mastro, tábuas...)
    const JANGADA = `<svg viewBox="0 0 160 110" aria-hidden="true">
      <path class="peca" data-p="0" d="M84 14 L104 20 L84 26Z" style="fill:var(--coral)"/>
      <path class="peca" data-p="1" d="M82 30 L82 70 L52 70Z" style="fill:var(--texto)"/>
      <path class="peca" data-p="2" d="M84 12 L84 80" style="stroke:var(--amarelo);stroke-width:4;stroke-linecap:round"/>
      <rect class="peca" data-p="3" x="112" y="78" width="22" height="12" rx="3" style="fill:var(--amarelo)"/>
      <rect class="peca" data-p="4" x="26" y="78" width="22" height="12" rx="3" style="fill:var(--amarelo)"/>
      <rect class="peca" data-p="5" x="90" y="78" width="22" height="12" rx="3" style="fill:var(--amarelo)"/>
      <rect x="48" y="78" width="42" height="12" rx="3" style="fill:var(--amarelo)"/>
      <path d="M0 96 Q20 88 40 96 T80 96 T120 96 T160 96 V110 H0Z" style="fill:var(--turquesa);opacity:.55"/>
    </svg>`;

    function desenhar() {
      const c = fila[i];
      const palavra = c.palavra; // já normalizada: só letras maiúsculas sem acento
      const inicioCarta = Date.now();
      const tentadas = new Set();
      let erros = 0;
      let fim = false;

      const jangada = h('div', { class: 'jangada' });
      jangada.innerHTML = JANGADA; // SVG fixo do código, não vem de JSON
      const letras = h('p', { class: 'forca-palavra', 'aria-live': 'polite' });
      const info = h('p', { class: 'forca-info' });
      const msg = h('div', { class: 'forca-msg', 'aria-live': 'polite' });
      const teclado = h('div', { class: 'teclado', role: 'group', 'aria-label': 'Teclado' });
      const btnDica = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: dica }, UI.icone('i-perola'), `Revelar uma letra (${Economia.CONFIG.precoDica} pérola)`);

      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((l) => {
        teclado.append(h('button', { type: 'button', class: 'tecla', 'data-l': l, onclick: () => tentar(l), 'aria-label': `Letra ${l}` }, l));
      });

      ctx.container.replaceChildren(
        h('div', { class: 'jogo-hud' }, h('span', { text: `Palavra ${i + 1} de ${fila.length}` }), h('span', { text: `Tema: ${c.tema}` })),
        h('div', { class: 'forca' }, jangada, h('div', { class: 'forca__lado' }, h('p', { class: 'forca-dica' }, h('strong', { text: 'Dica: ' }), c.dica || c.tema), letras, info, btnDica)),
        teclado, msg);

      function mostrar() {
        const txt = palavra.split('').map((l) => (tentadas.has(l) || fim ? l : '_')).join(' ');
        letras.textContent = txt;
        letras.setAttribute('aria-label', `Palavra: ${palavra.split('').map((l) => (tentadas.has(l) || fim ? l : 'lacuna')).join(', ')}`);
        info.textContent = `Erros: ${erros} de ${MAX_ERROS}`;
        jangada.querySelectorAll('.peca').forEach((p) => p.classList.toggle('peca--caiu', Number(p.dataset.p) < erros));
        btnDica.disabled = fim;
      }

      function tentar(l) {
        if (fim || tentadas.has(l)) return;
        tentadas.add(l);
        const tecla = teclado.querySelector(`[data-l="${l}"]`);
        tecla.disabled = true;
        if (palavra.includes(l)) tecla.classList.add('tecla--certa');
        else {
          tecla.classList.add('tecla--errada');
          erros++;
        }
        mostrar();
        if (palavra.split('').every((x) => tentadas.has(x))) encerrar(true);
        else if (erros >= MAX_ERROS) encerrar(false);
      }

      function dica() {
        if (fim) return;
        const faltam = palavra.split('').filter((l) => !tentadas.has(l));
        if (!faltam.length) return;
        if (!ctx.gastarPerolas(Economia.CONFIG.precoDica)) {
          msg.textContent = 'Sem pérolas para a dica. Acerte questões para juntar mais!';
          return;
        }
        tentar(UI.sortear(faltam));
      }

      function encerrar(acertou) {
        fim = true;
        mostrar();
        teclado.querySelectorAll('.tecla').forEach((t) => (t.disabled = true));
        detalhes.push(JogoComum.detalhe(c, acertou, {
          inicio: inicioCarta, pergunta: `Palavra-chave: ${c.dica || c.tema}`, resposta: c.original || palavra,
          sua: acertou ? '' : 'A jangada se desmontou antes.',
        }));
        const botao = h('button', { type: 'button', class: 'botao botao--primario botao--largo', text: i === fila.length - 1 ? 'Ver resultado' : 'Próxima palavra', onclick: seguir });
        msg.replaceChildren(h('p', { class: acertou ? 'texto-sucesso' : 'texto-erro', text: acertou ? 'Mandou bem, Diver! Jangada firme.' : `A jangada se desmontou. A palavra era ${c.original || palavra}.` }), botao);
        botao.focus();
      }

      if (desligar) desligar();
      desligar = JogoComum.teclas((e) => {
        const l = UI.normalizar(e.key).toUpperCase();
        if (/^[A-Z]$/.test(l)) {
          e.preventDefault();
          tentar(l);
        }
      });
      mostrar();
      teclado.querySelector('.tecla').focus({ preventScroll: true });
    }

    function seguir() {
      i++;
      if (i < fila.length) return desenhar();
      const acertos = detalhes.filter((d) => d.acertou).length;
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'forca', trilha: ctx.trilha, detalhes, inicio, pontuacao: acertos,
        titulo: acertos === fila.length ? 'Nenhum náufrago hoje!' : `${acertos} de ${fila.length} palavras salvas`,
        subtitulo: 'Palavra-chave fixada é conceito lembrado na hora da prova.',
      }));
    }

    desenhar();
    return { destruir: () => desligar && desligar() };
  },
});

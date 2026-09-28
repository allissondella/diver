/*
 * Corrente do Tempo (corrente-do-tempo) — ordene eventos ou passos que boiam na correnteza.
 * Arraste (toque ou mouse), use os botões ↑ ↓, ou o teclado: Enter/Espaço "pega" o item,
 * setas movem, Enter/Espaço solta. Até 3 conferências por sequência.
 * Pontuação = itens no lugar certo. Precisa do bloco "sequencias" na trilha.
 */
Jogos.registrar({
  id: 'corrente-do-tempo',
  nome: 'Corrente do Tempo',
  grupo: 'aventuras',
  icone: 'i-corrente',
  descricao: 'Ordene cronologias, etapas e procedimentos arrastando na correnteza.',
  duracao: '2-5 min',
  requer: { sequencias: 1 },

  iniciar(ctx) {
    const { h } = UI;
    const fila = UI.embaralhar(ctx.cartas.sequencias).slice(0, ctx.opcoes.quantidade || 3);
    const detalhes = [];
    const inicio = Date.now();
    let pontos = 0;
    let i = 0;

    function desenhar() {
      const s = fila[i];
      const inicioSeq = Date.now();
      let ordem = s.itens.map((_, k) => k);
      do ordem = UI.embaralhar(ordem); while (ordem.every((v, k) => v === k)); // nunca começa já certo
      let conferencias = 0;
      let pegoIdx = null;
      let fim = false;

      const lista = h('ol', { class: 'corrente', 'aria-label': `Itens de "${s.titulo}". Enter pega um item, setas movem.` });
      const aviso = h('p', { class: 'corrente-aviso', 'aria-live': 'assertive' });
      const btnConferir = h('button', { type: 'button', class: 'botao botao--primario botao--largo', onclick: conferir }, 'Conferir ordem');
      const msg = h('div', { 'aria-live': 'polite' });

      ctx.container.replaceChildren(
        h('div', { class: 'jogo-hud' }, h('span', { text: `Sequência ${i + 1} de ${fila.length}` }), h('span', { class: 'corrente-conf' })),
        h('article', { class: 'cartao' },
          h('span', { class: 'rotulo', text: s.tema }),
          h('h2', { class: 'corrente-titulo', tabindex: '-1', text: s.titulo }),
          h('p', { class: 'corrente-dica', text: 'Do primeiro (topo) ao último (base).' }),
          lista, aviso, btnConferir, msg));

      function render(foco) {
        lista.replaceChildren(...ordem.map((orig, pos) => {
          const li = h('li', {
            class: `corrente__item ${pegoIdx === pos ? 'corrente__item--pego' : ''}`, tabindex: '0', 'data-pos': pos,
            'aria-label': `${pos + 1}º: ${s.itens[orig]}${pegoIdx === pos ? '. Pego: use as setas e Enter para soltar' : ''}`,
          },
          h('span', { class: 'corrente__alca', 'aria-hidden': 'true' }, '⋮⋮'),
          h('span', { class: 'corrente__num', 'aria-hidden': 'true', text: String(pos + 1) }),
          h('span', { class: 'corrente__texto', text: s.itens[orig] }),
          h('span', { class: 'corrente__botoes' },
            h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Subir "${s.itens[orig]}"`, disabled: fim || pos === 0, onclick: () => mover(pos, pos - 1, true) }, UI.icone('i-seta-cima')),
            h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Descer "${s.itens[orig]}"`, disabled: fim || pos === ordem.length - 1, onclick: () => mover(pos, pos + 1, true) }, UI.icone('i-seta-baixo'))));
          li.addEventListener('keydown', (e) => teclado(e, pos));
          li.addEventListener('pointerdown', (e) => arrastar(e, pos));
          return li;
        }));
        if (foco !== undefined && lista.children[foco]) lista.children[foco].focus({ preventScroll: true });
      }

      function mover(de, para, focarBotao) {
        if (fim || para < 0 || para >= ordem.length || de === para) return;
        const [item] = ordem.splice(de, 1);
        ordem.splice(para, 0, item);
        if (pegoIdx !== null) pegoIdx = para;
        render(para);
        aviso.textContent = `${s.itens[item]} agora está em ${para + 1}º.`;
        if (focarBotao) lista.children[para].focus({ preventScroll: true });
      }

      function teclado(e, pos) {
        if (fim) return;
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.tagName === 'BUTTON') return;
          e.preventDefault();
          pegoIdx = pegoIdx === pos ? null : pos;
          aviso.textContent = pegoIdx === null ? 'Item solto.' : `Pegou "${s.itens[ordem[pos]]}". Use as setas.`;
          render(pos);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const alvo = pos + (e.key === 'ArrowUp' ? -1 : 1);
          if (pegoIdx === pos) mover(pos, alvo);
          else if (lista.children[alvo]) lista.children[alvo].focus();
        }
      }

      // Arrastar com o dedo ou o mouse (eventos de ponteiro, sem biblioteca)
      // Começa pela alça (⋮⋮) para não atrapalhar a rolagem da página no celular.
      function arrastar(e, pos) {
        if (fim || !e.target.closest('.corrente__alca') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        const li = e.currentTarget;
        li.classList.add('corrente__item--arrastando');
        let atualPos = pos;
        const mexer = (ev) => {
          const itens = [...lista.children];
          const alvo = itens.findIndex((el) => {
            const r = el.getBoundingClientRect();
            return ev.clientY >= r.top && ev.clientY <= r.bottom;
          });
          if (alvo >= 0 && alvo !== atualPos) {
            const [item] = ordem.splice(atualPos, 1);
            ordem.splice(alvo, 0, item);
            // reposiciona o item arrastado na lista (antes ou depois do alvo)
            lista.insertBefore(li, alvo > atualPos ? itens[alvo].nextSibling : itens[alvo]);
            atualPos = alvo;
          }
        };
        const soltar = () => {
          window.removeEventListener('pointermove', mexer);
          window.removeEventListener('pointerup', soltar);
          window.removeEventListener('pointercancel', soltar);
          render(atualPos);
        };
        window.addEventListener('pointermove', mexer);
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
      }

      function conferir() {
        if (fim) return;
        conferencias++;
        const certos = ordem.filter((orig, pos) => orig === pos).length;
        [...lista.children].forEach((li, pos) => li.classList.toggle('corrente__item--certo', ordem[pos] === pos));
        ctx.container.querySelector('.corrente-conf').textContent = `Conferências: ${conferencias} de 3`;
        if (certos === ordem.length || conferencias >= 3) return encerrar(certos);
        aviso.textContent = `${certos} de ${ordem.length} no lugar certo (em turquesa). Ajuste e confira de novo.`;
      }

      function encerrar(certos) {
        fim = true;
        pontos += certos;
        const tudo = certos === ordem.length;
        ordem = s.itens.map((_, k) => k); // mostra a ordem correta
        render();
        [...lista.children].forEach((li) => li.classList.add('corrente__item--certo'));
        btnConferir.hidden = true;
        detalhes.push(JogoComum.detalhe(s, tudo, {
          inicio: inicioSeq, pergunta: `Ordene: ${s.titulo}`, resposta: s.itens.join(' → '),
          sua: tudo ? '' : `${certos} de ${s.itens.length} itens no lugar certo.`,
        }));
        const botao = h('button', { type: 'button', class: 'botao botao--primario botao--largo', text: i === fila.length - 1 ? 'Ver resultado' : 'Próxima sequência', onclick: seguir });
        msg.replaceChildren(...[
          h('p', { class: tudo ? 'texto-sucesso' : 'texto-erro', text: tudo ? 'Mandou bem, Diver! Correnteza em ordem.' : 'Esta é a ordem certa. Dá uma olhada com calma.' }),
          s.explicacao ? h('p', { class: 'jogo-feedback__texto', text: s.explicacao }) : null, botao].filter(Boolean));
        botao.focus();
      }

      render();
      ctx.container.querySelector('.corrente-titulo').focus({ preventScroll: true });
    }

    function seguir() {
      i++;
      if (i < fila.length) return desenhar();
      const total = fila.reduce((n, s) => n + s.itens.length, 0);
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'corrente-do-tempo', trilha: ctx.trilha, detalhes, inicio, pontuacao: pontos,
        bonus: { xp: pontos * 2, perolas: 0 },
        titulo: `${pontos} de ${total} itens no lugar certo`,
        subtitulo: 'Ordem é memória: quem entende a sequência lembra do todo.',
      }));
    }

    desenhar();
    return {};
  },
});

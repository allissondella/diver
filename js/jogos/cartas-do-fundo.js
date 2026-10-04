/*
 * Cartas do Fundo (cartas-do-fundo) — flashcards com autoavaliação.
 * Vire a carta, veja a resposta e diga: Sabia · Quase · Não sabia.
 * Alimenta as caixas de Leitner (1 a 5): Sabia sobe, Quase mantém, Não sabia volta à 1.
 * Só "Sabia" conta como acerto; "Não sabia" vai para a Revisão.
 * Teclado: Espaço vira; 1, 2 e 3 avaliam.
 * opcoes.fase: só as cartas daquela fase (vindo do fim do Mergulho). Com menos de 4, usa a trilha toda.
 */
Jogos.registrar({
  id: 'cartas-do-fundo',
  nome: 'Cartas do Fundo',
  grupo: 'rapidos',
  icone: 'i-livro',
  descricao: 'Vire a carta e diga se sabia. As que você não sabe voltam mais cedo.',
  duracao: '2-5 min',
  requer: { flash: 4 },

  iniciar(ctx) {
    const { h } = UI;
    const quantidade = ctx.opcoes.quantidade || 10;
    const leitner = ctx.prog.leitner || (ctx.prog.leitner = {});
    // Caixas menores primeiro: o que você sabe menos aparece antes
    const daFase = ctx.opcoes.fase ? ctx.cartas.flash.filter((c) => c.fase === ctx.opcoes.fase) : [];
    const fila = UI.embaralhar(daFase.length >= 4 ? daFase : ctx.cartas.flash)
      .sort((a, b) => (leitner[a.id] || 1) - (leitner[b.id] || 1))
      .slice(0, quantidade);
    const detalhes = [];
    const inicio = Date.now();
    let i = 0;
    let virada = false;
    let inicioCarta = Date.now();

    const hud = h('p', { class: 'jogo-hud' });
    const palco = h('div', { class: 'flash-palco' });
    ctx.container.replaceChildren(hud, palco);

    function desenhar() {
      const c = fila[i];
      virada = false;
      inicioCarta = Date.now();
      hud.textContent = `Carta ${i + 1} de ${fila.length} · caixa ${leitner[c.id] || 1} de 5`;
      const carta = h('button', { type: 'button', class: 'flash', 'aria-pressed': 'false', 'aria-label': 'Carta: toque ou aperte Espaço para virar', onclick: virar },
        h('span', { class: 'flash__lado flash__frente' },
          h('span', { class: 'rotulo', text: c.tema }),
          h('span', { class: 'flash__texto', text: c.frente }),
          h('span', { class: 'flash__dica', text: 'Toque para virar' })),
        h('span', { class: 'flash__lado flash__verso' },
          h('span', { class: 'rotulo', text: 'Resposta' }),
          h('strong', { class: 'flash__resposta', text: c.verso }),
          h('span', { class: 'flash__explicacao', text: c.explicacao })));
      const avaliacao = h('div', { class: 'flash-avaliacao', hidden: true },
        h('p', { class: 'flash-avaliacao__pergunta', text: 'E aí, você sabia?' }),
        h('div', { class: 'flash-avaliacao__botoes' },
          h('button', { type: 'button', class: 'botao botao--erro', 'aria-keyshortcuts': '3', onclick: () => avaliar('nao') }, 'Não sabia', h('kbd', { text: '3' })),
          h('button', { type: 'button', class: 'botao botao--fantasma', 'aria-keyshortcuts': '2', onclick: () => avaliar('quase') }, 'Quase', h('kbd', { text: '2' })),
          h('button', { type: 'button', class: 'botao botao--primario', 'aria-keyshortcuts': '1', onclick: () => avaliar('sabia') }, 'Sabia', h('kbd', { text: '1' }))));
      palco.replaceChildren(carta, avaliacao);
      carta.focus({ preventScroll: true });
    }

    function virar() {
      if (virada) return;
      virada = true;
      const carta = palco.querySelector('.flash');
      carta.classList.add('flash--virada');
      carta.setAttribute('aria-pressed', 'true');
      carta.setAttribute('aria-label', `Resposta: ${fila[i].verso}`);
      const av = palco.querySelector('.flash-avaliacao');
      av.hidden = false;
      av.querySelector('.botao--primario').focus({ preventScroll: true });
    }

    function avaliar(nota) {
      if (!virada) return;
      const c = fila[i];
      const caixa = leitner[c.id] || 1;
      leitner[c.id] = nota === 'sabia' ? Math.min(5, caixa + 1) : nota === 'nao' ? 1 : caixa;
      detalhes.push(JogoComum.detalhe(c, nota === 'sabia', {
        inicio: inicioCarta, pergunta: c.frente, resposta: c.verso, neutro: nota === 'quase',
        sua: nota === 'nao' ? 'Você marcou "Não sabia".' : '',
      }));
      i++;
      if (i < fila.length) desenhar();
      else terminar();
    }

    function terminar() {
      const sabia = detalhes.filter((d) => d.acertou).length;
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'cartas-do-fundo', trilha: ctx.trilha, detalhes, inicio,
        titulo: sabia === fila.length ? 'Baú completo!' : 'Baú revisado',
        subtitulo: `Você sabia ${sabia} de ${fila.length} cartas. As que ficaram para trás voltam mais cedo.`,
      }));
    }

    const desligar = JogoComum.teclas((e) => {
      if (e.key === ' ' && !virada) {
        e.preventDefault();
        virar();
      } else if (virada && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        avaliar({ 1: 'sabia', 2: 'quase', 3: 'nao' }[e.key]);
      }
    });

    desenhar();
    return { destruir: desligar };
  },
});

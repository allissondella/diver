/*
 * Quiz Relâmpago (quiz-relampago) — múltipla escolha e verdadeiro ou falso, rapidinho.
 * Cronômetro opcional por pergunta (15, 30 ou 60 s), mostrado como uma onda que sobe.
 * Combo: a partir do 3º acerto seguido, +5 XP por acerto (calculado pela economia).
 * Sem oxigênio. 10 perguntas por padrão. Teclado: 1–6 / A–F; V e F no verdadeiro ou falso.
 */
Jogos.registrar({
  id: 'quiz-relampago',
  nome: 'Quiz Relâmpago',
  grupo: 'rapidos',
  icone: 'i-raio',
  descricao: 'Múltipla escolha e verdadeiro ou falso, com combo e onda do tempo.',
  duracao: '2-4 min',
  requer: { multipla: 4 },
  opcoes: [{ id: 'tempo', rotulo: 'Tempo por pergunta', valores: [[0, 'Sem tempo'], [15, '15 s'], [30, '30 s'], [60, '60 s']], padrao: 30 }],

  iniciar(ctx) {
    const { h } = UI;
    const total = Math.min(ctx.opcoes.quantidade || 10, ctx.cartas.multipla.length + ctx.cartas.vf.length);
    const tempo = ctx.opcoes.tempo ?? 30;
    // Mistura: cerca de 1 em cada 3 perguntas é verdadeiro ou falso
    const mc = UI.embaralhar(ctx.cartas.multipla);
    const vf = UI.embaralhar(ctx.cartas.vf);
    const fila = [];
    for (let k = 0; k < total; k++) {
      const querVF = k % 3 === 2 && vf.length;
      fila.push(querVF || !mc.length ? { tipo: 'vf', carta: vf.shift() } : { tipo: 'mc', carta: mc.shift() });
    }

    const detalhes = [];
    const inicio = Date.now();
    let i = 0;
    let combo = 0;
    let comboMaximo = 0;
    let atual = null; // controlador da pergunta atual
    let relogio = null;

    const hud = h('div', { class: 'jogo-hud' });
    const onda = h('div', { class: 'onda', hidden: !tempo, 'aria-hidden': 'true' }, h('div', { class: 'onda__agua' }));
    const palco = h('div');
    ctx.container.replaceChildren(hud, onda, palco);

    function atualizarHud() {
      hud.replaceChildren(
        h('span', { text: `Pergunta ${i + 1} de ${fila.length}` }),
        h('span', { class: `combo ${combo >= 3 ? 'combo--ativo' : ''}` }, UI.icone('i-raio'), combo >= 3 ? `Combo x${combo}` : `Sequência: ${combo}`));
    }

    function iniciarRelogio() {
      clearInterval(relogio);
      if (!tempo) return;
      const fim = Date.now() + tempo * 1000;
      const agua = onda.querySelector('.onda__agua');
      const tick = () => {
        const resta = Math.max(0, fim - Date.now());
        agua.style.width = `${100 - (resta / (tempo * 1000)) * 100}%`;
        onda.classList.toggle('onda--alta', resta < 5000);
        if (resta <= 0) {
          clearInterval(relogio);
          tempoEsgotado();
        }
      };
      tick();
      relogio = setInterval(tick, 200);
    }

    function registrar(acertou, d) {
      clearInterval(relogio);
      combo = acertou ? combo + 1 : 0;
      comboMaximo = Math.max(comboMaximo, combo);
      detalhes.push(d);
      atualizarHud();
    }

    function proxima() {
      if (atual && atual.destruir) atual.destruir();
      i++;
      if (i < fila.length) desenhar();
      else terminar();
    }

    function tempoEsgotado() {
      const item = fila[i];
      if (item.tipo === 'mc') {
        atual.responder(-1); // nenhuma posição: conta como erro
      } else {
        responderVF(null);
      }
    }

    /* ---- Verdadeiro ou falso ---- */
    let respondidaVF = false;
    function desenharVF(c) {
      respondidaVF = false;
      const feedback = h('div', { class: 'jogo-feedback', hidden: true, 'aria-live': 'polite' });
      const cartao = h('article', { class: 'cartao questao jogo-questao' },
        h('div', { class: 'questao__tags' }, h('span', { class: 'tag', text: c.tema }), h('span', { class: 'tag tag--medio', text: 'Verdadeiro ou falso' })),
        c.pergunta
          ? [h('p', { class: 'vf__pergunta', text: c.pergunta }), h('h2', { class: 'questao__enunciado', tabindex: '-1', text: `Resposta proposta: ${c.proposta}` })]
          : h('h2', { class: 'questao__enunciado', tabindex: '-1', text: c.afirmacao }),
        h('div', { class: 'vf__botoes' },
          h('button', { type: 'button', class: 'alternativa vf__botao', 'data-v': 'true', 'aria-keyshortcuts': 'V', onclick: () => responderVF(true) },
            h('span', { class: 'alternativa__letra', 'aria-hidden': 'true', text: 'V' }), 'Verdadeiro'),
          h('button', { type: 'button', class: 'alternativa vf__botao', 'data-v': 'false', 'aria-keyshortcuts': 'F', onclick: () => responderVF(false) },
            h('span', { class: 'alternativa__letra', 'aria-hidden': 'true', text: 'F' }), 'Falso')),
        feedback);
      palco.replaceChildren(cartao);
      cartao.querySelector('h2').focus({ preventScroll: true });
      atual = {
        destruir: JogoComum.teclas((e) => {
          const t = e.key.toUpperCase();
          if (!respondidaVF && (t === 'V' || t === 'F')) {
            e.preventDefault();
            responderVF(t === 'V');
          }
        }),
      };
    }

    function responderVF(escolha) {
      if (respondidaVF) return;
      respondidaVF = true;
      const c = fila[i].carta;
      const acertou = escolha === c.verdadeira;
      palco.querySelectorAll('.vf__botao').forEach((b) => {
        b.disabled = true;
        const v = b.dataset.v === 'true';
        if (v === c.verdadeira) b.classList.add('alternativa--correta');
        else if (v === escolha) b.classList.add('alternativa--errada');
        else b.classList.add('alternativa--apagada');
      });
      registrar(acertou, JogoComum.detalhe(c, acertou, {
        pergunta: c.pergunta ? `${c.pergunta} → ${c.proposta}` : c.afirmacao,
        resposta: c.verdadeira ? 'Verdadeiro' : 'Falso',
        sua: escolha === null ? 'O tempo acabou.' : escolha ? 'Verdadeiro' : 'Falso',
      }));
      const feedback = palco.querySelector('.jogo-feedback');
      feedback.classList.toggle('jogo-feedback--erro', !acertou);
      const botao = h('button', { class: 'botao botao--primario botao--largo', type: 'button', text: i === fila.length - 1 ? 'Ver resultado' : 'Próxima', onclick: proxima });
      feedback.replaceChildren(...[
        h('p', { class: 'jogo-feedback__titulo', text: acertou ? 'Mandou bem, Diver!' : escolha === null ? 'O tempo acabou!' : UI.sortear(JogoComum.MSGS_ERRO) }),
        h('p', { class: 'jogo-feedback__certa', text: `É ${c.verdadeira ? 'verdadeiro' : 'falso'}.` }),
        c.explicacao ? h('p', { class: 'jogo-feedback__texto', text: c.explicacao }) : null,
        botao].filter(Boolean));
      feedback.hidden = false;
      botao.focus({ preventScroll: true });
    }

    function desenhar() {
      atualizarHud();
      const item = fila[i];
      if (item.tipo === 'vf') desenharVF(item.carta);
      else {
        atual = JogoComum.questao(palco, item.carta, {
          aoResponder: (acertou, d) => {
            if (!acertou && !d.sua) d.sua = 'O tempo acabou.';
            registrar(acertou, d);
          },
          aoContinuar: proxima,
          textoContinuar: i === fila.length - 1 ? 'Ver resultado' : 'Próxima',
        });
      }
      iniciarRelogio();
    }

    function terminar() {
      clearInterval(relogio);
      const acertos = detalhes.filter((d) => d.acertou).length;
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'quiz-relampago', trilha: ctx.trilha, detalhes, inicio, comboMaximo, pontuacao: acertos,
        titulo: acertos === fila.length ? 'Relâmpago perfeito!' : `${acertos} de ${fila.length} no relâmpago`,
        subtitulo: comboMaximo >= 3 ? `Maior combo: ${comboMaximo} seguidos. Quem é rápido assim?` : 'Rápido e rasteiro. Bora de novo pra subir o combo?',
      }));
    }

    desenhar();
    return {
      destruir() {
        clearInterval(relogio);
        if (atual && atual.destruir) atual.destruir();
      },
    };
  },
});

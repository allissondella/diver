/*
 * Adivinha Aí (adivinha-ai) — uma resposta secreta e até 10 dicas, que chegam em
 * "garrafas com mensagem". Quanto antes acertar, mais pontos (11 − dicas usadas).
 * A comparação ignora acento, maiúsculas e pontuação e aceita a lista "aceitas".
 * 3 chutes por carta; depois revela a resposta. Precisa do bloco "adivinhas" na trilha.
 */
Jogos.registrar({
  id: 'adivinha-ai',
  nome: 'Adivinha Aí',
  grupo: 'rapidos',
  icone: 'i-garrafa',
  descricao: 'As dicas chegam uma a uma. Quanto antes acertar, mais pontos.',
  duracao: '3-5 min',
  requer: { adivinhas: 1 },

  iniciar(ctx) {
    const { h } = UI;
    const fila = UI.embaralhar(ctx.cartas.adivinhas).slice(0, ctx.opcoes.quantidade || 5);
    const detalhes = [];
    const inicio = Date.now();
    let pontosTotais = 0;
    let i = 0;

    const hud = h('div', { class: 'jogo-hud' });
    const palco = h('div');
    ctx.container.replaceChildren(hud, palco);

    function desenhar() {
      const c = fila[i];
      const inicioCarta = Date.now();
      let dicas = 1;
      let chutes = 0;
      let fim = false;
      const aceitas = [c.resposta, ...c.aceitas].map(UI.normalizar);

      hud.replaceChildren(h('span', { text: `Carta ${i + 1} de ${fila.length}` }), h('span', { text: `Pontos: ${pontosTotais}` }));
      const garrafas = h('ol', { class: 'garrafas', 'aria-live': 'polite' });
      const input = h('input', { type: 'text', class: 'campo', autocomplete: 'off', 'aria-label': 'Seu chute', placeholder: 'Seu chute…' });
      const msg = h('p', { class: 'adivinha-msg', 'aria-live': 'polite' });
      const btnDica = h('button', { type: 'button', class: 'botao botao--fantasma', onclick: proximaDica }, UI.icone('i-garrafa'), 'Próxima dica');
      const form = h('form', { class: 'adivinha-form', onsubmit: (e) => { e.preventDefault(); chutar(); } },
        input, h('button', { type: 'submit', class: 'botao botao--primario', text: 'Chutar' }));
      const rodape = h('div', { class: 'adivinha-rodape' }, btnDica, h('span', { class: 'adivinha-chutes' }));

      palco.replaceChildren(h('article', { class: 'cartao' },
        h('div', { class: 'questao__tags' }, h('span', { class: 'tag', text: c.tema }), h('span', { class: 'tag tag--medio', text: 'O que é, o que é?' })),
        garrafas, form, rodape, msg));

      function desenharDicas() {
        garrafas.replaceChildren(...c.dicas.slice(0, dicas).map((d, n) => h('li', { class: 'garrafa' },
          h('span', { class: 'garrafa__num', 'aria-hidden': 'true' }, UI.icone('i-garrafa')), h('span', {}, h('strong', { text: `Dica ${n + 1}: ` }), d))));
        btnDica.disabled = fim || dicas >= c.dicas.length;
        rodape.querySelector('.adivinha-chutes').textContent = `Vale ${Math.max(1, 11 - dicas)} pontos · ${3 - chutes} ${3 - chutes === 1 ? 'chute' : 'chutes'}`;
      }

      function proximaDica() {
        if (fim || dicas >= c.dicas.length) return;
        dicas++;
        desenharDicas();
        input.focus();
      }

      function chutar() {
        if (fim || !input.value.trim()) return;
        chutes++;
        const certo = aceitas.includes(UI.normalizar(input.value));
        if (certo) return encerrar(true);
        if (chutes >= 3) return encerrar(false);
        msg.textContent = `Não é "${input.value.trim()}". ${dicas < c.dicas.length ? 'Que tal mais uma dica?' : 'Tenta de novo!'}`;
        input.value = '';
        desenharDicas();
        input.focus();
      }

      function encerrar(acertou) {
        fim = true;
        const pontos = acertou ? Math.max(1, 11 - dicas) : 0;
        pontosTotais += pontos;
        detalhes.push(JogoComum.detalhe(c, acertou, {
          inicio: inicioCarta, pergunta: c.dicas.slice(0, 3).join(' · '), resposta: c.resposta,
          sua: acertou ? '' : `Seu último chute: ${input.value.trim()}`,
        }));
        input.disabled = true;
        form.querySelector('button').disabled = true;
        desenharDicas();
        const botao = h('button', { type: 'button', class: 'botao botao--primario botao--largo', text: i === fila.length - 1 ? 'Ver resultado' : 'Próxima carta', onclick: seguir });
        msg.replaceChildren(...[
          h('strong', { class: acertou ? 'texto-sucesso' : 'texto-erro', text: acertou ? `Mandou bem, Diver! +${pontos} pontos.` : 'Os chutes acabaram.' }),
          h('span', { text: ` A resposta é: ${c.resposta}.` }),
          c.explicacao ? h('span', { class: 'adivinha-explicacao', text: ` ${c.explicacao}` }) : null,
          botao].filter(Boolean));
        botao.focus();
      }

      desenharDicas();
      input.focus();
    }

    function seguir() {
      i++;
      if (i < fila.length) desenhar();
      else {
        ctx.aoTerminar(Jogos.resultado({
          jogoId: 'adivinha-ai', trilha: ctx.trilha, detalhes, inicio, pontuacao: pontosTotais,
          bonus: { xp: pontosTotais, perolas: 0 },
          titulo: `${pontosTotais} pontos no Adivinha Aí`,
          subtitulo: 'Cada dica a menos vale ponto a mais. Bora bater esse recorde?',
        }));
      }
    }

    desenhar();
    return {};
  },
});

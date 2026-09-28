/*
 * jogos/comum.js — peças que vários jogos usam: pergunta de múltipla escolha com
 * feedback, atalhos de teclado e o "detalhe" de cada resposta para o Resultado padrão.
 */
const JogoComum = (() => {
  const { h, icone, embaralhar, sortear } = UI;
  const LETRAS = 'ABCDEF';
  const MSGS_ERRO = ['Quase! Essa foi por pouco.', 'Não foi dessa vez.', 'Essa correnteza te pegou.', 'Errar faz parte do mergulho.'];

  /** Liga um atalho de teclado e devolve a função que desliga. */
  function teclas(fn) {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target;
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT')) return;
      fn(e);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }

  /** Detalhe padrão de uma resposta (vai para o Resultado e para o "O que revisar"). */
  function detalhe(carta, acertou, { inicio, sua, resposta, pergunta, neutro = false } = {}) {
    return {
      cartaId: carta.id,
      tema: carta.tema || 'Geral',
      dificuldade: carta.dificuldade || 'medio',
      acertou,
      neutro,
      tempoMs: inicio ? Date.now() - inicio : 0,
      pergunta: pergunta || carta.enunciado || carta.frente || carta.termo || carta.afirmacao || '',
      resposta: resposta !== undefined ? resposta : carta.alternativas ? carta.alternativas[carta.correta] : '',
      sua: sua || '',
      explicacao: carta.explicacao || '',
    };
  }

  /**
   * Mostra uma questão de múltipla escolha em `alvo`.
   * opcoes: { aoResponder(acertou, detalhe), aoContinuar(), feedback: true, textoContinuar }
   * Com feedback = false, chama aoContinuar logo depois de responder.
   * Retorna { destruir, responder(indiceNaTela) }.
   */
  function questao(alvo, q, opcoes) {
    const inicio = Date.now();
    const ordem = embaralhar(q.alternativas.map((_, i) => i));
    let respondida = false;

    const alts = h('div', { class: 'alternativas', role: 'group' });
    const feedback = h('div', { class: 'jogo-feedback', hidden: true, 'aria-live': 'polite' });
    const cartao = h('article', { class: 'cartao questao jogo-questao' },
      h('div', { class: 'questao__tags' },
        h('span', { class: 'tag', text: q.tema }),
        h('span', { class: `tag tag--${q.dificuldade}`, text: { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }[q.dificuldade] || '' })),
      h('h2', { class: 'questao__enunciado', tabindex: '-1', text: q.enunciado }),
      alts, feedback);

    function responder(original) {
      if (respondida) return;
      respondida = true;
      const acertou = original === q.correta;
      const botoes = [...alts.children];
      botoes.forEach((b) => {
        b.disabled = true;
        const i = Number(b.dataset.indice);
        if (i === q.correta) b.classList.add('alternativa--correta');
        else if (i === original) b.classList.add('alternativa--errada');
        else b.classList.add('alternativa--apagada');
      });
      const d = detalhe(q, acertou, { inicio, sua: q.alternativas[original] });
      opcoes.aoResponder(acertou, d);

      if (opcoes.feedback === false) {
        setTimeout(opcoes.aoContinuar, UI.movimentoReduzido ? 0 : 450);
        return;
      }
      feedback.classList.toggle('jogo-feedback--erro', !acertou);
      const botao = h('button', { class: 'botao botao--primario botao--largo', type: 'button', text: opcoes.textoContinuar || 'Continuar', onclick: opcoes.aoContinuar });
      feedback.replaceChildren(...[
        h('p', { class: 'jogo-feedback__titulo', text: acertou ? 'Mandou bem, Diver!' : sortear(MSGS_ERRO) }),
        acertou ? null : h('p', { class: 'jogo-feedback__certa', text: `Resposta certa: ${LETRAS[ordem.indexOf(q.correta)]}) ${q.alternativas[q.correta]}` }),
        q.explicacao ? h('p', { class: 'jogo-feedback__texto', text: q.explicacao }) : null,
        botao].filter(Boolean));
      feedback.hidden = false;
      botao.focus({ preventScroll: true });
      botao.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
    }

    ordem.forEach((original, pos) => {
      alts.append(h('button', {
        type: 'button', class: 'alternativa', 'data-indice': original, 'aria-keyshortcuts': `${pos + 1} ${LETRAS[pos]}`,
        onclick: () => responder(original),
      }, h('span', { class: 'alternativa__letra', 'aria-hidden': 'true', text: LETRAS[pos] }), h('span', { text: q.alternativas[original] })));
    });

    const desligar = teclas((e) => {
      if (respondida || e.key.length !== 1) return;
      const t = e.key.toUpperCase();
      let i = '123456'.indexOf(t);
      if (i < 0) i = LETRAS.indexOf(t);
      if (i >= 0 && i < ordem.length) {
        e.preventDefault();
        responder(ordem[i]);
      }
    });

    alvo.replaceChildren(cartao);
    cartao.querySelector('h2').focus({ preventScroll: true });
    return { destruir: desligar, responder: (pos) => responder(ordem[pos]) };
  }

  /** Oxigênio (vidas) em ícones, igual ao Mergulho. */
  function oxigenio(atual, max) {
    const box = h('div', { class: 'oxigenio', 'aria-label': `Oxigênio: ${atual} de ${max}` });
    for (let i = 0; i < max; i++) box.append(icone('i-oxigenio', i >= atual ? 'vazio' : ''));
    return box;
  }

  /** Barra de informações no topo do jogo (ex.: "3 de 10 · sequência de 4"). */
  function hud(...itens) {
    return h('div', { class: 'jogo-hud' }, ...itens);
  }

  return { LETRAS, MSGS_ERRO, teclas, detalhe, questao, oxigenio, hud };
})();

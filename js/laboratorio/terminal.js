/*
 * laboratorio/terminal.js — o terminal simulado dos laboratórios (Explora Tech, 2026-10-16): Laboratório de Rede
 * agora; Missões no Terminal e Linha do Tempo do Código depois. Nada roda de verdade: cada laboratório entrega a
 * função executar(linha) → { texto, comando } e o terminal só mostra.
 *  - Enter roda; seta para cima e para baixo percorrem o histórico; "limpar" (ou clear) limpa a tela;
 *  - "atalhos" viram botões que preenchem a linha (bom no celular, onde digitar é mais difícil);
 *  - a saída é uma região aria-live, e cada comando fica registrado com o prompt na frente.
 */
const TerminalSimulado = (() => {
  function criar({ prompt = '$', executar, boasVindas = '', atalhos = [], rotulo = 'Terminal', aoRodar = () => {} }) {
    const { h, icone } = UI;
    const historico = [];
    let pos = 0;
    const saida = h('div', { class: 'term__saida', role: 'log', 'aria-live': 'polite', 'aria-label': `Saída do ${rotulo.toLowerCase()}` });
    const entrada = h('input', { type: 'text', class: 'term__entrada', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': `Comando para o ${rotulo.toLowerCase()}` });
    const escrever = (texto, classe = '') => { if (texto) saida.append(h('pre', { class: `term__linha ${classe}`.trim(), text: texto })); };
    function rodar(linha) {
      const l = linha.trim();
      if (!l) return;
      historico.push(l);
      pos = historico.length;
      if (/^(limpar|clear|cls)$/i.test(l)) { saida.replaceChildren(); entrada.value = ''; return; }
      escrever(`${prompt} ${l}`, 'term__linha--cmd');
      const r = executar(l) || {};
      escrever(r.texto, r.erro ? 'term__linha--erro' : '');
      entrada.value = '';
      saida.scrollTop = saida.scrollHeight;
      aoRodar(r, l);
    }
    entrada.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); rodar(entrada.value); }
      else if (e.key === 'ArrowUp' && historico.length) { e.preventDefault(); pos = Math.max(0, pos - 1); entrada.value = historico[pos]; }
      else if (e.key === 'ArrowDown' && historico.length) { e.preventDefault(); pos = Math.min(historico.length, pos + 1); entrada.value = historico[pos] || ''; }
    });
    if (boasVindas) escrever(boasVindas, 'term__linha--info');
    const el = h('div', { class: 'term' },
      h('div', { class: 'term__barra' }, h('span', { class: 'term__titulo' }, icone('i-codigo'), rotulo)),
      saida,
      h('form', { class: 'term__form', onsubmit: (e) => { e.preventDefault(); rodar(entrada.value); entrada.focus(); } },
        h('span', { class: 'term__prompt', 'aria-hidden': 'true', text: prompt }), entrada,
        h('button', { type: 'submit', class: 'botao botao--secundario botao--pequeno term__enviar' }, icone('i-seta-dir'), 'Rodar')),
      atalhos.length ? h('div', { class: 'term__atalhos', role: 'group', 'aria-label': 'Atalhos de comandos' },
        atalhos.map((a) => h('button', { type: 'button', class: 'chip term__atalho', onclick: () => { entrada.value = a; entrada.focus(); } }, h('code', { text: a })))) : null);
    return { el, rodar, focar: () => entrada.focus(), limpar: () => saida.replaceChildren(), historico };
  }
  return { criar };
})();

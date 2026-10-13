/*
 * laboratorio/editor.js — editor de código e console dos laboratórios (Explora Tech, 2026-10-13).
 * Próprios e leves (sem biblioteca): textarea com numeração de linhas, Tab = 4 espaços,
 * recuo automático depois de ":", Shift+Tab tira o recuo, Ctrl+Enter roda, Esc solta o Tab
 * (para quem navega pelo teclado não ficar preso no editor). Tudo entra como texto.
 */
const EditorCodigo = (() => {
  const { h } = UI;
  const RECUO = '    ';

  function criar({ valor = '', rotulo = 'Seu código', aoMudar = () => {}, aoRodar = () => {}, somenteLeitura = false, minLinhas = 6 } = {}) {
    const numeros = h('div', { class: 'editor__numeros', 'aria-hidden': 'true' });
    const marca = h('div', { class: 'editor__marca', 'aria-hidden': 'true', hidden: true });
    const area = h('textarea', {
      class: 'editor__area', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
      wrap: 'off', 'aria-label': `${rotulo}. Tab coloca recuo; Esc solta o Tab; Ctrl+Enter roda.`, readonly: somenteLeitura,
    });
    area.value = valor;
    const caixa = h('div', { class: 'editor__caixa' }, marca, area);
    const el = h('div', { class: 'editor' }, numeros, caixa);
    let tabPreso = true;

    function atualizarNumeros() {
      const n = area.value.split('\n').length;
      area.rows = Math.max(minLinhas, n + 1); // o editor cresce com o código: nenhuma linha fica cortada
      if (numeros.childElementCount !== n) numeros.replaceChildren(...Array.from({ length: n }, (_, i) => h('span', { text: String(i + 1) })));
    }
    function rolar() {
      numeros.scrollTop = area.scrollTop;
      marca.style.transform = `translateY(${-area.scrollTop}px)`;
    }
    function trocar(inicio, fim, texto, cursor) {
      area.setRangeText(texto, inicio, fim, 'end');
      if (cursor !== undefined) area.setSelectionRange(cursor, cursor);
      area.dispatchEvent(new Event('input'));
    }

    area.addEventListener('input', () => { atualizarNumeros(); aoMudar(area.value); });
    area.addEventListener('scroll', rolar);
    area.addEventListener('focus', () => { tabPreso = true; });
    area.addEventListener('keydown', (e) => {
      if (somenteLeitura) return;
      const v = area.value;
      const ini = area.selectionStart;
      const fim = area.selectionEnd;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); aoRodar(); return; }
      if (e.key === 'Escape') { tabPreso = false; return; }
      if (e.key === 'Tab' && tabPreso) {
        e.preventDefault();
        const inicioLinha = v.lastIndexOf('\n', ini - 1) + 1;
        if (ini === fim && !e.shiftKey) { trocar(ini, fim, RECUO); return; }
        // várias linhas (ou Shift+Tab): põe ou tira o recuo de cada uma
        const fimLinha = v.indexOf('\n', fim) === -1 ? v.length : v.indexOf('\n', fim);
        const linhas = v.slice(inicioLinha, fimLinha).split('\n');
        const novas = linhas.map((l) => (e.shiftKey ? l.replace(/^ {1,4}/, '') : RECUO + l));
        area.setRangeText(novas.join('\n'), inicioLinha, fimLinha, 'select');
        area.dispatchEvent(new Event('input'));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const inicioLinha = v.lastIndexOf('\n', ini - 1) + 1;
        const linha = v.slice(inicioLinha, ini);
        const recuo = (linha.match(/^ */) || [''])[0] + (/:\s*$/.test(linha) ? RECUO : '');
        trocar(ini, fim, '\n' + recuo);
      }
      if (e.key === 'Backspace' && ini === fim && ini >= 4 && v.slice(ini - 4, ini) === RECUO) {
        const inicioLinha = v.lastIndexOf('\n', ini - 1) + 1;
        if (/^ *$/.test(v.slice(inicioLinha, ini))) { e.preventDefault(); trocar(ini - 4, ini, ''); }
      }
    });
    atualizarNumeros();

    return {
      el,
      area,
      valor: () => area.value,
      definir(texto) { area.value = texto; atualizarNumeros(); aoMudar(texto); },
      /** Acende a linha em execução (1, 2, ...) ou apaga com null. */
      marcarLinha(n) {
        marca.hidden = !n;
        if (!n) return;
        const altura = parseFloat(getComputedStyle(area).lineHeight) || 22;
        const topo = parseFloat(getComputedStyle(area).paddingTop) || 0;
        marca.style.top = `${topo + (n - 1) * altura}px`;
        marca.style.height = `${altura}px`;
        [...numeros.children].forEach((s, i) => s.classList.toggle('editor__numero--ativo', i === n - 1));
      },
      focar: () => area.focus(),
    };
  }

  return { criar };
})();

const ConsoleLab = (() => {
  const { h } = UI;

  /**
   * vazio: com texto, a área de saída fica sempre à vista e mostra esse aviso enquanto não há nada
   * (dentro da janela do código); sem texto, o console só aparece quando tem algo para mostrar.
   */
  function criar({ rotulo = 'Console', vazio = '' } = {}) {
    const log = h('div', { class: 'console__log', role: 'log', 'aria-live': 'polite', 'aria-label': rotulo, tabindex: '0' });
    const aviso = vazio ? h('span', { class: 'console__vazio', text: vazio }) : null;
    const el = h('div', { class: 'console', hidden: !vazio }, h('div', { class: 'console__titulo', 'aria-hidden': 'true', text: rotulo }), log);
    const zerar = () => { log.replaceChildren(...(aviso ? [aviso] : [])); el.hidden = !vazio; };
    zerar();

    function escrever(texto, tipo = 'saida') {
      if (!texto) return;
      el.hidden = false;
      if (aviso && aviso.parentNode) aviso.remove();
      log.append(h('span', { class: `console__linha console__linha--${tipo}`, text: texto }));
      log.scrollTop = log.scrollHeight;
    }

    /** Linha de entrada no próprio console (o input() do Python): devolve o texto digitado, ou null se cancelar. */
    function pedirEntrada(prompt = '') {
      return new Promise((resolve) => {
        const campo = h('input', { class: 'console__entrada', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': prompt ? `O programa pede: ${prompt}` : 'O programa pede uma entrada' });
        const form = h('form', { class: 'console__form', onsubmit: (e) => { e.preventDefault(); const v = campo.value; form.remove(); resolve(v); } },
          prompt ? h('span', { class: 'console__prompt', text: prompt }) : null, campo,
          h('button', { type: 'submit', class: 'botao botao--secundario botao--pequeno', text: 'Enviar' }),
          h('button', { type: 'button', class: 'botao botao--link botao--pequeno', text: 'Parar', onclick: () => { form.remove(); resolve(null); } }));
        el.hidden = false;
        if (aviso && aviso.parentNode) aviso.remove();
        el.append(form);
        campo.focus();
      });
    }

    return {
      el,
      escrever,
      pedirEntrada,
      limpar: () => { el.querySelectorAll('.console__form').forEach((f) => f.remove()); zerar(); },
      texto: () => (aviso && aviso.parentNode ? '' : log.textContent),
    };
  }

  return { criar };
})();

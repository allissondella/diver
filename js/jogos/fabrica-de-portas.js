/*
 * jogos/fabrica-de-portas.js — laboratório "Mão na massa" Fábrica de Portas Lógicas (Explora Tech, aulas 7, 37 e 40;
 * prioridade B, 2026-10-16). Só JavaScript: as regras ficam em js/laboratorio/motor-portas.js e a tela usa o modelo
 * js/laboratorio/lab-js.js.
 *  - Circuito: o aluno acrescenta portas (AND, OR, NOT, XOR...) e escolhe o que entra em cada uma; a tabela-verdade
 *    acende ao vivo, com o alvo ao lado. 3 estrelas = até metas.portas portas.
 *  - Bits: interruptores com o valor de cada casa (128, 64... 1) para formar um número; 3 estrelas = poucos toques.
 *  - Ler: bits acesos no painel; o aluno escreve o valor em decimal.
 */
LabJS.registrar({
  id: 'fabrica-de-portas',
  nome: 'Fábrica de Portas Lógicas',
  icone: 'i-lampada',
  duracao: '10-15 min',
  descricao: 'Mão na massa: ligue portas AND, OR, NOT e XOR para acender as lâmpadas certas e monte números com interruptores.',
  motor: {
    meta(m) {
      if (m.tipo === 'circuito') return { valor: m.metas.portas, texto: `até ${UI.plural(m.metas.portas, 'porta', 'portas')}` };
      if (m.tipo === 'bits') return { valor: m.metas.toques, texto: `até ${UI.plural(m.metas.toques, 'toque', 'toques')} nos interruptores` };
      return null;
    },
    tutorial: [
      { desenho: 'diver', titulo: 'Fábrica de Portas', texto: 'Aqui não tem Python: são fios, interruptores e portas lógicas, as peças que o processador usa para fazer contas com zeros e uns.' },
      { alvo: '#lab-alvo', desenho: 'alvo', titulo: 'O pedido', texto: 'É isto que a fábrica pede: uma tabela-verdade para cumprir ou um número para montar.' },
      { alvo: '.lab-js__painel', desenho: 'livro', titulo: 'A bancada', texto: 'Acrescente portas e escolha o que entra em cada uma. A tabela embaixo acende na hora: verde é linha certa.' },
    ],
    criar(m, { aoMudar: avisar }) {
      const { h, icone } = UI;
      let resp = MotorPortas.inicial(m);
      let revelado = false;
      const el = h('div', { class: 'fp' });
      const aoMudar = avisar;

      const lampada = (v, rotulo) => h('span', { class: `fp-lampada ${v === 1 ? 'fp-lampada--acesa' : ''} ${v === null ? 'fp-lampada--vazia' : ''}`.trim(), 'aria-label': rotulo }, v === null ? '?' : String(v));

      function desenharCircuito() {
        const nomeSinal = (s) => (s.startsWith('p') ? `porta ${s.slice(1)}` : s);
        const permitidas = m.permitidas || Object.keys(MotorPortas.TIPOS);
        const portas = h('ol', { class: 'fp-portas', 'aria-label': 'Portas do circuito, em ordem' }, resp.portas.map((p, k) => {
          const t = MotorPortas.TIPOS[p[0]];
          const sinais = MotorPortas.sinaisAte(m.entradas, k);
          const escolhe = (i) => h('select', { class: 'fp-select', 'aria-label': `Entrada ${i} da porta ${k + 1}`,
            onchange: (e) => { p[i] = e.target.value; mudou(); } },
          h('option', { value: '', text: '—' }), sinais.map((s) => h('option', { value: s, selected: p[i] === s, text: nomeSinal(s) })));
          return h('li', { class: 'fp-porta' },
            h('span', { class: 'fp-porta__nome', text: `Porta ${k + 1}` }),
            h('select', { class: 'fp-select fp-select--tipo', 'aria-label': `Tipo da porta ${k + 1}`,
              onchange: (e) => { p[0] = e.target.value; if (MotorPortas.TIPOS[p[0]].entradas === 1) p.length = 2; else if (p.length < 3) p.push(''); mudou(); } },
            permitidas.map((tp) => h('option', { value: tp, selected: p[0] === tp, text: MotorPortas.TIPOS[tp].nome }))),
            h('span', { class: 'fp-porta__entradas' }, escolhe(1), t && t.entradas === 2 ? escolhe(2) : null),
            h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno fp-porta__tirar', 'aria-label': `Tirar a porta ${k + 1}`, onclick: () => tirar(k) }, icone('i-x')));
        }));
        const vazio = resp.portas.length ? null : h('p', { class: 'lab-apoio__texto', text: 'Nenhuma porta ainda. Acrescente a primeira.' });
        const mais = h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', id: 'fp-mais',
          onclick: () => { const t = permitidas[0]; resp.portas.push(MotorPortas.TIPOS[t].entradas === 1 ? [t, m.entradas[0]] : [t, m.entradas[0], m.entradas[1] || m.entradas[0]]); mudou(); } },
        icone('i-mais'), 'Acrescentar porta');
        const sinaisTodos = MotorPortas.sinaisAte(m.entradas, resp.portas.length);
        const saidas = h('div', { class: 'fp-saidas' }, m.saidas.map((s) => h('label', { class: 'fp-saida' },
          h('span', { class: 'fp-saida__nome' }, icone('i-lampada'), `Lâmpada ${s.nome} liga em`),
          h('select', { class: 'fp-select', onchange: (e) => { resp.saidas[s.nome] = e.target.value; mudou(); } },
            h('option', { value: '', text: '—' }), sinaisTodos.map((x) => h('option', { value: x, selected: resp.saidas[s.nome] === x, text: nomeSinal(x) }))))));

        const tab = MotorPortas.tabela(m, resp);
        const tabela = h('div', { class: 'fp-tabela-caixa', tabindex: '0', role: 'region', 'aria-label': 'Tabela-verdade ao vivo' }, h('table', { class: 'fp-tabela' },
          h('caption', { class: 'visualmente-oculto', text: 'Tabela-verdade: entradas, o que a fábrica pede e o que o seu circuito dá' }),
          h('thead', {}, h('tr', {}, m.entradas.map((e) => h('th', { scope: 'col', text: e })),
            m.saidas.flatMap((s) => [h('th', { scope: 'col' }, s.nome, h('span', { class: 'fp-tabela__sub', text: 'pedido' })), h('th', { scope: 'col' }, s.nome, h('span', { class: 'fp-tabela__sub', text: 'seu' }))]),
            h('th', { scope: 'col' }, h('span', { class: 'visualmente-oculto', text: 'Linha certa?' })))),
          h('tbody', {}, tab.map((l) => h('tr', { class: l.ok ? 'fp-tabela__ok' : '' },
            m.entradas.map((e) => h('td', {}, lampada(l.linha[e], `${e} = ${l.linha[e]}`))),
            l.saidas.flatMap((s) => [h('td', {}, lampada(s.alvo, `pedido ${s.alvo}`)), h('td', {}, lampada(s.valor, s.valor === null ? 'sem ligação' : `seu ${s.valor}`))]),
            h('td', { class: 'fp-tabela__marca' }, icone(l.ok ? 'i-check' : 'i-x')))))));
        const certas = tab.filter((l) => l.ok).length;
        el.replaceChildren(
          h('section', { class: 'fp-bloco', 'aria-label': 'Montagem' }, h('h3', { class: 'fp-bloco__titulo', text: 'Montagem' }), portas, vazio, mais, saidas),
          h('section', { class: 'fp-bloco', 'aria-label': 'Tabela-verdade' },
            h('h3', { class: 'fp-bloco__titulo', text: `Tabela-verdade · ${certas} de ${tab.length} linhas certas` }), tabela));
      }

      function tirar(k) {
        resp.portas.splice(k, 1);
        const ajusta = (s) => {
          if (!s || !s.startsWith('p')) return s;
          const n = Number(s.slice(1));
          if (n === k + 1) return '';
          return n > k + 1 ? `p${n - 1}` : s;
        };
        resp.portas.forEach((p) => { for (let i = 1; i < p.length; i++) p[i] = ajusta(p[i]); });
        Object.keys(resp.saidas).forEach((s) => { resp.saidas[s] = ajusta(resp.saidas[s]); });
        mudou();
        const prox = el.querySelector('.fp-porta__tirar') || el.querySelector('#fp-mais');
        if (prox) prox.focus();
      }

      function desenharBits() {
        const n = m.metas.bits;
        const valor = MotorPortas.valorBits(resp.bits);
        el.replaceChildren(h('section', { class: 'fp-bloco', 'aria-label': 'Interruptores' },
          h('h3', { class: 'fp-bloco__titulo', text: 'Interruptores' }),
          h('div', { class: 'fp-bits', role: 'group', 'aria-label': `${n} interruptores, do bit mais alto ao mais baixo` }, resp.bits.map((b, i) => {
            const casa = 2 ** (n - 1 - i);
            return h('button', { type: 'button', class: `fp-bit ${b ? 'fp-bit--ligado' : ''}`, 'aria-pressed': b ? 'true' : 'false', 'aria-label': `Casa ${casa}: ${b ? 'ligado (1)' : 'desligado (0)'}`,
              onclick: () => { resp.bits[i] = b ? 0 : 1; resp.toques++; mudou(); el.querySelectorAll('.fp-bit')[i].focus(); } },
            h('span', { class: 'fp-bit__casa', text: String(casa) }), h('span', { class: 'fp-bit__valor', text: String(b) }));
          })),
          h('p', { class: 'fp-leitura' },
            h('span', {}, 'Binário: ', h('code', { class: 'codigo-linha', text: resp.bits.join('') })),
            h('span', {}, 'Decimal: ', h('strong', { text: m.mostrarDecimal === false && !revelado ? '?' : String(valor) })),
            h('span', { class: 'texto-suave', text: UI.plural(resp.toques, 'toque', 'toques') }))));
      }

      function desenharLer() {
        const n = m.bits.length;
        const campo = h('input', { type: 'text', inputmode: 'numeric', class: 'campo fp-campo', id: 'fp-valor', autocomplete: 'off', value: resp.valor,
          oninput: (e) => { resp.valor = e.target.value; aoMudar(); },
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = document.getElementById('lab-conferir'); if (b) b.click(); } } });
        el.replaceChildren(h('section', { class: 'fp-bloco', 'aria-label': 'Painel' },
          h('h3', { class: 'fp-bloco__titulo', text: 'O painel acendeu assim' }),
          h('div', { class: 'fp-bits fp-bits--fixos', role: 'img', 'aria-label': `Bits: ${m.bits.join(' ')}` }, m.bits.map((b, i) => h('span', { class: `fp-bit ${b ? 'fp-bit--ligado' : ''}` },
            h('span', { class: 'fp-bit__casa', text: m.esconderCasas ? '' : String(2 ** (n - 1 - i)) }), h('span', { class: 'fp-bit__valor', text: String(b) })))),
          h('label', { class: 'fp-pergunta', for: 'fp-valor' }, m.pergunta || 'Quanto vale em decimal?'), campo));
      }

      function desenhar() {
        if (m.tipo === 'bits') desenharBits();
        else if (m.tipo === 'ler') desenharLer();
        else desenharCircuito();
      }
      function mudou() { revelado = false; desenhar(); aoMudar(); }

      desenhar();
      return {
        el,
        alvo() {
          if (m.tipo === 'bits') return h('p', { class: 'fp-alvo' }, 'Monte o número ', h('strong', { class: 'fp-alvo__numero', text: String(m.metas.alvo) }), ` com ${m.metas.bits} interruptores.`);
          if (m.tipo === 'ler') return h('p', { class: 'fp-alvo', text: 'Leia os bits do painel e escreva o valor em decimal.' });
          return h('div', { class: 'fp-alvo' },
            h('p', { class: 'lab-apoio__texto', text: m.pedido || 'Faça a tabela do seu circuito ficar igual à pedida, em todas as linhas.' }),
            h('p', { class: 'lab-apoio__texto' }, 'Portas disponíveis: ', h('strong', { text: (m.permitidas || Object.keys(MotorPortas.TIPOS)).join(', ') })));
        },
        conferir() { revelado = true; const r = MotorPortas.conferir(m, resp); if (m.tipo === 'bits') desenharBits(); return r; },
        recomecar() { resp = MotorPortas.inicial(m); revelado = false; desenhar(); },
      };
    },
  },
});

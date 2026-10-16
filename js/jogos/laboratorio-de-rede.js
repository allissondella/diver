/*
 * jogos/laboratorio-de-rede.js — laboratório "Mão na massa" Laboratório de Rede (Explora Tech, aulas 49 e 50;
 * prioridade B, 2026-10-16). Uma rede com defeito e um terminal simulado (js/laboratorio/terminal.js) com ipconfig,
 * ping, traceroute, nslookup e nc, que respondem pela rede simulada de js/laboratorio/motor-rede.js. O aluno
 * investiga com os comandos que a missão exige e responde onde está o problema.
 * 3 estrelas = resolver com até metas.comandos comandos.
 */
LabJS.registrar({
  id: 'laboratorio-de-rede',
  nome: 'Laboratório de Rede',
  icone: 'i-lupa',
  duracao: '10-15 min',
  descricao: 'Mão na massa: uma rede com defeito e um terminal com ping, traceroute e nslookup. Investigue e diga onde está o problema.',
  motor: {
    textoConferir: 'Conferir diagnóstico',
    iconeConferir: 'i-lupa',
    meta: (m) => ({ valor: m.metas.comandos, texto: `até ${UI.plural(m.metas.comandos, 'comando', 'comandos')} no terminal` }),
    tutorial: [
      { desenho: 'diver', titulo: 'Laboratório de Rede', texto: 'Uma rede com defeito e um terminal de verdade de mentirinha: os comandos respondem como num computador, mas nada sai daqui.' },
      { alvo: '.term', desenho: 'livro', titulo: 'O terminal', texto: 'Digite um comando e aperte Enter (ou toque num atalho). Digite ajuda para ver a lista.' },
      { alvo: '.lr-conclusao', desenho: 'lupa', titulo: 'A conclusão', texto: 'Quando tiver a resposta, escolha onde está o problema e confira.' },
    ],
    criar(m, { aoMudar }) {
      const { h } = UI;
      let usados = [];
      let comandos = 0;
      let valores = {};
      const el = h('div', { class: 'lr' });

      function montar() {
        usados = []; comandos = 0; valores = {};
        const term = TerminalSimulado.criar({
          prompt: m.prompt || 'bia@notebook:~$',
          rotulo: 'Terminal',
          boasVindas: `${MotorRede.AJUDA}`,
          atalhos: m.atalhos || [],
          executar: (linha) => MotorRede.terminal(m.cenario, linha),
          aoRodar: (r) => { comandos++; if (r.comando && !usados.includes(r.comando)) usados.push(r.comando); aoMudar(); },
        });
        const campos = (m.campos || []).map((c) => {
          const id = `lr-${c.id}`;
          return h('div', { class: 'jp-campo' }, h('label', { for: id, class: 'jp-campo__rotulo', text: c.rotulo }),
            h('select', { id, class: 'jp-campo__entrada', onchange: (e) => { valores[c.id] = e.target.value; aoMudar(); } },
              h('option', { value: '', text: 'Escolha…' }), c.opcoes.map((o) => h('option', { value: o, text: o }))));
        });
        el.replaceChildren(term.el, h('section', { class: 'jp-bloco lr-conclusao', 'aria-label': 'Sua conclusão' }, h('h3', { class: 'jp-bloco__titulo', text: 'Sua conclusão' }), ...campos));
      }

      montar();
      return {
        el,
        objetivos: () => [
          ...(m.exigir || []).map((c) => ({ texto: `Investigar com ${c}`, ok: usados.includes(c) })),
          { texto: m.objetivo || 'Dizer onde está o problema', ok: (m.campos || []).every((c) => valores[c.id]) },
        ],
        conferir: () => ({ ...MotorRede.conferirTerminal(m, usados, valores), custo: comandos }),
        recomecar: montar,
      };
    },
  },
});

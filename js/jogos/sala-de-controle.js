/*
 * jogos/sala-de-controle.js — laboratório "Mão na massa" Sala de Controle (Explora Tech, aulas 36, 38 e 40;
 * prioridade B, 2026-10-16). Só JavaScript: as regras ficam em js/laboratorio/motor-sala.js e a tela usa o modelo
 * js/laboratorio/lab-js.js.
 * Uma máquina simulada com o painel de um gerenciador de tarefas: processador, memória e disco reagindo ao vivo,
 * a lista de processos (encerrar, ver detalhes) e os maiores arquivos do disco (apagar). Encerrar processo do sistema
 * é recusado; com a RAM acima de 90%, o disco vira memória virtual e o painel avisa.
 * 3 estrelas = resolver com até metas.acoes ações.
 */
LabJS.registrar({
  id: 'sala-de-controle',
  nome: 'Sala de Controle',
  icone: 'i-grafico',
  duracao: '10-15 min',
  descricao: 'Mão na massa: um computador lento para consertar. Olhe processador, memória e disco, encerre o processo certo e libere espaço sem perder nada.',
  motor: {
    meta: (m) => ({ valor: m.metas.acoes, texto: `resolver com até ${UI.plural(m.metas.acoes, 'ação', 'ações')}` }),
    tutorial: [
      { desenho: 'diver', titulo: 'Sala de Controle', texto: 'Um computador simulado, igualzinho ao gerenciador de tarefas: aqui você pode encerrar e apagar à vontade, sem estragar o seu.' },
      { alvo: '#lab-alvo', desenho: 'alvo', titulo: 'Os objetivos', texto: 'Cada objetivo fica verde quando é cumprido. Todos verdes? Aperte Conferir.' },
      { alvo: '.sc-medidores', desenho: 'livro', titulo: 'O painel', texto: 'Processador, memória e disco mudam a cada ação. Olhe os números antes de agir: o maior consumo costuma ser a pista.' },
    ],
    criar(m, { aoMudar }) {
      const { h, icone } = UI;
      let e = MotorSala.estado(m);
      let ordem = 'memoria';
      let registro = [];
      const el = h('div', { class: 'sc' });

      const medidor = (rotulo, pct, detalhe, alerta) => h('div', { class: `sc-medidor ${alerta ? 'sc-medidor--alerta' : ''}`.trim() },
        h('div', { class: 'sc-medidor__topo' }, h('span', { class: 'sc-medidor__rotulo', text: rotulo }), h('strong', { class: 'sc-medidor__valor', text: `${pct}%` })),
        h('div', { class: 'sc-medidor__barra', role: 'progressbar', 'aria-label': rotulo, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) },
          h('span', { class: 'sc-medidor__cheio', style: `width: ${Math.min(100, pct)}%` })),
        detalhe ? h('span', { class: 'sc-medidor__detalhe', text: detalhe }) : null);

      function acao(a) {
        const r = MotorSala.aplicar(m, e, a);
        registro = [{ texto: r.mensagem, ok: r.ok && !r.recusada }, ...registro].slice(0, 5);
        desenhar();
        aoMudar();
      }

      function desenhar() {
        const n = MotorSala.medir(m, e);
        const discoPct = Math.round((n.discoUsado / m.maquina.disco) * 100);
        const medidores = h('section', { class: 'sc-medidores', 'aria-label': 'Desempenho' },
          medidor('Processador', n.cpu, null, n.cpu >= 85),
          medidor('Memória', n.ram, `${MotorSala.gb(n.ramUsada)} de ${MotorSala.gb(m.maquina.ram)}`, n.ram > 90),
          medidor('Disco ocupado', discoPct, `${MotorSala.gb(n.discoLivre)} livres · atividade ${n.atividadeDisco}%`, discoPct >= 95 || n.memoriaVirtual));
        const aviso = n.memoriaVirtual ? h('p', { class: 'sc-aviso', role: 'status' }, icone('i-alerta'),
          'A memória passou de 90%: o sistema está usando o disco como memória virtual, e tudo fica lento.') : null;

        const lista = (m.processos || []).filter((p) => e.ativos.has(p.id)).sort((a, b) => (ordem === 'nome' ? a.nome.localeCompare(b.nome) : b[ordem] - a[ordem]));
        const processos = h('section', { class: 'sc-bloco', 'aria-label': 'Processos' },
          h('div', { class: 'sc-bloco__topo' },
            h('h3', { class: 'sc-bloco__titulo', text: `Processos (${lista.length})` }),
            h('label', { class: 'sc-ordem' }, 'Ordenar por ',
              h('select', { class: 'fp-select', 'aria-label': 'Ordenar processos por', onchange: (ev) => { ordem = ev.target.value; desenhar(); } },
                [['memoria', 'memória'], ['cpu', 'processador'], ['nome', 'nome']].map(([v, t]) => h('option', { value: v, selected: ordem === v, text: t }))))),
          h('ul', { class: 'sc-lista' }, lista.map((p) => h('li', { class: `sc-proc ${p.estado === 'travado' ? 'sc-proc--travado' : ''}`.trim() },
            h('div', { class: 'sc-proc__linha' },
              h('span', { class: 'sc-proc__nome' }, p.nome, p.estado === 'travado' ? h('span', { class: 'tag tag--erro', text: 'Não respondendo' }) : null),
              h('span', { class: 'sc-proc__num', text: `${p.cpu}% · ${p.memoria.toLocaleString('pt-BR')} MB` })),
            h('div', { class: 'sc-proc__acoes' },
              h('details', { class: 'sc-detalhes' }, h('summary', {}, 'Detalhes'),
                h('dl', {}, h('dt', { text: 'Local do arquivo' }), h('dd', {}, h('code', { class: 'codigo-linha', text: p.local || '—' })),
                  h('dt', { text: 'Tipo' }), h('dd', { text: p.sistema ? 'Processo do sistema' : 'Aplicativo' }))),
              h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno sc-encerrar', 'data-id': p.id, 'aria-label': `Encerrar ${p.nome}`, onclick: () => acao({ acao: 'encerrar', id: p.id }) },
                icone('i-x'), 'Encerrar'))))));

        const arquivos = (m.arquivos || []).length ? h('section', { class: 'sc-bloco', 'aria-label': 'Maiores arquivos do disco' },
          h('h3', { class: 'sc-bloco__titulo', text: 'Maiores arquivos do disco' }),
          h('ul', { class: 'sc-lista' }, (m.arquivos || []).filter((a) => e.arquivos.has(a.id)).sort((a, b) => b.tamanho - a.tamanho).map((a) => h('li', { class: 'sc-proc' },
            h('div', { class: 'sc-proc__linha' },
              h('span', { class: 'sc-proc__nome' }, icone('i-arquivo'), a.nome),
              h('span', { class: 'sc-proc__num', text: MotorSala.gb(a.tamanho) })),
            h('div', { class: 'sc-proc__acoes' },
              h('code', { class: 'codigo-linha sc-pasta', text: a.pasta }),
              h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno sc-apagar', 'data-id': a.id, 'aria-label': `Apagar ${a.nome}`, onclick: () => acao({ acao: 'apagar', id: a.id }) },
                icone('i-lixo'), 'Apagar')))))) : null;

        const log = h('section', { class: 'sc-bloco sc-registro', 'aria-label': 'O que aconteceu' },
          h('h3', { class: 'sc-bloco__titulo', text: `Registro · ${UI.plural(e.acoes.length, 'ação', 'ações')}` }),
          registro.length ? h('ul', { class: 'sc-registro__lista', 'aria-live': 'polite' }, registro.map((r) => h('li', { class: r.ok ? '' : 'sc-registro--recusa' }, icone(r.ok ? 'i-check' : 'i-alerta'), r.texto)))
            : h('p', { class: 'lab-apoio__texto', text: 'Nenhuma ação ainda. Olhe o painel e decida.' }));
        el.replaceChildren(...[medidores, aviso, processos, arquivos, log].filter(Boolean));
      }

      desenhar();
      return {
        el,
        objetivos: () => MotorSala.objetivos(m, e),
        conferir: () => MotorSala.conferir(m, e),
        recomecar() { e = MotorSala.estado(m); registro = []; desenhar(); },
      };
    },
  },
});

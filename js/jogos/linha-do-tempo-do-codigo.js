/*
 * jogos/linha-do-tempo-do-codigo.js — laboratório "Mão na massa" Linha do Tempo do Código (Explora Tech, Módulo 12;
 * prioridade A, 2026-10-16). Um Git de mentirinha (js/laboratorio/motor-git.js, plugin do motor-shell.js) no terminal
 * simulado, com as três áreas à vista (pasta de trabalho, área de preparo e repositório), a linha do tempo dos commits
 * desenhada com os branches e o HEAD, o GitHub de faz de conta quando há remoto, e o mini editor (nano) para resolver
 * conflitos. Nada toca o computador de verdade. 3 estrelas = cumprir a missão com até metas.comandos comandos.
 */
LabJS.registrar({
  id: 'linha-do-tempo-do-codigo',
  nome: 'Linha do Tempo do Código',
  icone: 'i-codigo',
  duracao: '10-20 min',
  descricao: 'Mão na massa: um Git de mentirinha com as três áreas à vista e a linha do tempo dos commits crescendo: init, add, commit, branch, merge, conflito e GitHub.',
  motor: {
    textoConferir: 'Conferir missão',
    meta: (m) => ({ valor: m.metas.comandos, texto: `até ${UI.plural(m.metas.comandos, 'comando', 'comandos')}` }),
    tutorial: [
      { desenho: 'diver', titulo: 'Linha do Tempo do Código', texto: 'Um Git de mentirinha: os comandos respondem como no Git de verdade, mas tudo acontece só aqui. O Recomeçar traz a missão de volta.' },
      { alvo: '.term', desenho: 'livro', titulo: 'O terminal', texto: 'Digite o comando e aperte Enter. ajuda mostra a lista; o prompt mostra a pasta e o branch em que você está.' },
      { alvo: '.lt-areas', desenho: 'lupa', titulo: 'As três áreas', texto: 'Pasta de trabalho (onde você edita), área de preparo (o que vai na próxima foto) e repositório (as fotos tiradas). Elas mudam a cada comando.' },
      { alvo: '.lt-tempo', desenho: 'lupa', titulo: 'A linha do tempo', texto: 'Cada bolinha é um commit, do mais novo (em cima) ao mais antigo. Branches ganham outra cor, e o HEAD marca onde você está.' },
    ],
    criar(m, { aoMudar }) {
      const { h, icone } = UI;
      const NS = 'http://www.w3.org/2000/svg';
      const svg = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
      let e = MotorGit.estado(m);
      let valores = {};
      let term = null;
      const el = h('div', { class: 'mt lt' });
      const editorEl = h('section', { class: 'jp-bloco mt-editor', 'aria-label': 'Editor de texto', hidden: true });
      const areasEl = h('section', { class: 'jp-bloco lt-areas', 'aria-label': 'As três áreas do Git', 'aria-live': 'polite' });
      const tempoEl = h('section', { class: 'jp-bloco lt-tempo', 'aria-label': 'Linha do tempo dos commits' });
      const remotoEl = h('section', { class: 'jp-bloco lt-remoto', 'aria-label': 'Repositório no GitHub', hidden: true });

      const repoAgora = () => MotorGit.repoDe(e, e.cwd) || (m.repo && e.repos[m.repo]) || null;
      const ROTULO = { novo: 'novo', modificado: 'modificado', apagado: 'apagado', conflito: 'conflito', ignorado: 'ignorado', igual: 'igual ao commit' };
      const CLASSE = { novo: 'tag--sucesso', modificado: 'tag--medio', apagado: 'tag--erro', conflito: 'tag--erro', ignorado: 'tag--neutra', igual: 'tag--neutra' };
      const itemArquivo = (x) => h('li', { class: 'lt-arquivo' }, icone('i-arquivo'), h('span', { class: 'lt-arquivo__nome', text: x.arquivo }),
        x.estado ? h('span', { class: `tag ${CLASSE[x.estado] || 'tag--neutra'}`, text: ROTULO[x.estado] || x.estado }) : null);
      const coluna = (titulo, sub, itens, vazio) => h('div', { class: 'lt-area' },
        h('h4', { class: 'lt-area__titulo', text: titulo }), h('p', { class: 'lt-area__sub', text: sub }),
        itens.length ? h('ul', { class: 'lt-area__lista' }, itens) : h('p', { class: 'lt-area__vazio', text: vazio }));

      function desenharAreas() {
        const repo = repoAgora();
        if (!repo) {
          const aqui = Object.keys(e.fs).filter((c) => c.startsWith(`${e.cwd === '/' ? '' : e.cwd}/`) && c.slice(e.cwd.length + 1).indexOf('/') < 0).sort()
            .map((c) => ({ arquivo: c.slice(c.lastIndexOf('/') + 1) + (e.fs[c].tipo === 'd' ? '/' : '') }));
          areasEl.replaceChildren(h('h3', { class: 'jp-bloco__titulo' }, icone('i-pasta'), `Pasta ${e.cwd}`),
            h('p', { class: 'lab-apoio__texto', text: 'Esta pasta ainda não é um repositório Git: não há preparo nem histórico aqui.' }),
            aqui.length ? h('ul', { class: 'lt-area__lista' }, aqui.map(itemArquivo)) : h('p', { class: 'lt-area__vazio', text: 'Pasta vazia.' }));
          return;
        }
        const a = MotorGit.areas(e, repo);
        areasEl.replaceChildren(
          h('h3', { class: 'jp-bloco__titulo' }, icone('i-pasta'), `Repositório ${a.raiz}`, h('span', { class: 'tag tag--sucesso', text: `branch ${a.branch}` })),
          a.merge ? h('p', { class: 'sc-aviso' }, icone('i-alerta'), `Merge de ${a.merge.nome} pela metade: ${a.merge.pendentes.length ? `resolva ${a.merge.pendentes.join(', ')} e faça git add` : 'falta o git commit para fechar'}.`) : null,
          h('div', { class: 'lt-areas__grade' },
            coluna('Pasta de trabalho', 'onde você edita', a.trabalho.map(itemArquivo), 'Nenhum arquivo.'),
            coluna('Área de preparo', 'vai na próxima foto (git add)', a.preparo.map(itemArquivo), 'Nada preparado.'),
            coluna('Repositório', a.repositorio.hash ? `${a.repositorio.total} ${a.repositorio.total === 1 ? 'commit' : 'commits'} · último: ${a.repositorio.hash}` : 'ainda sem commits',
              a.repositorio.arquivos.map((f) => itemArquivo({ arquivo: f })), 'Nenhuma foto tirada.')));
      }

      function desenharTempo() {
        const repo = repoAgora();
        const g = repo ? MotorGit.grafo(e, repo) : { linhas: [], faixas: 0 };
        const titulo = h('h3', { class: 'jp-bloco__titulo' }, icone('i-relogio'), 'Linha do tempo');
        if (!g.linhas.length) { tempoEl.replaceChildren(titulo, h('p', { class: 'lt-area__vazio', text: repo ? 'Ainda sem commits: a primeira foto aparece aqui.' : 'Sem repositório, sem linha do tempo.' })); return; }
        const ALT = 44; const PASSO = 22; const L = g.faixas * PASSO + 10;
        const x = (f) => 11 + f * PASSO; const y = (i) => i * ALT + ALT / 2;
        const pos = {}; g.linhas.forEach((c, i) => { pos[c.hash] = { i, f: c.faixa }; });
        const desenho = svg('svg', { class: 'lt-tempo__grafo', width: L, height: g.linhas.length * ALT, viewBox: `0 0 ${L} ${g.linhas.length * ALT}`, 'aria-hidden': 'true' });
        g.linhas.forEach((c, i) => c.pais.forEach((p) => {
          const q = pos[p]; if (!q) return;
          const x1 = x(c.faixa); const y1 = y(i); const x2 = x(q.f); const y2 = y(q.i);
          const d = x1 === x2 ? `M${x1} ${y1} L${x2} ${y2}` : c.faixa > q.f ? `M${x1} ${y1} L${x1} ${y2 - ALT / 2} L${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y1 + ALT / 2} L${x2} ${y2}`;
          desenho.appendChild(svg('path', { d, class: `lt-linha lt-faixa-${Math.max(c.faixa, q.f) % 4}` }));
        }));
        g.linhas.forEach((c, i) => desenho.appendChild(svg('circle', { cx: x(c.faixa), cy: y(i), r: c.head ? 8 : 6, class: `lt-no lt-faixa-${c.faixa % 4}${c.head ? ' lt-no--head' : ''}` })));
        const lista = h('ol', { class: 'lt-tempo__lista' }, g.linhas.map((c) => h('li', { class: `lt-commit${c.head ? ' lt-commit--head' : ''}` },
          h('code', { class: 'lt-commit__hash', text: c.hash }),
          h('span', { class: 'lt-commit__msg', text: c.msg }),
          ...c.rotulos.map((r) => h('span', { class: `tag ${r.startsWith('HEAD') ? 'tag--destaque' : r.includes('/') ? 'tag--primaria' : 'tag--neutra'}`, text: r })))));
        tempoEl.replaceChildren(titulo, h('div', { class: 'lt-tempo__corpo' }, desenho, lista));
      }

      function desenharRemoto() {
        const repo = repoAgora();
        const s = repo ? MotorGit.servidorDe(e, repo) : null;
        if (!s) { remotoEl.hidden = true; return; }
        remotoEl.hidden = false;
        remotoEl.replaceChildren(h('h3', { class: 'jp-bloco__titulo' }, icone('i-upload'), 'GitHub (origin)'),
          h('p', { class: 'lt-area__sub lt-remoto__url', text: s.url }),
          !s.existe ? h('p', { class: 'lt-area__vazio', text: 'Esse endereço não existe no GitHub de mentirinha.' })
            : s.commits.length ? h('ol', { class: 'lt-tempo__lista lt-remoto__lista' }, s.commits.map((c) => h('li', { class: 'lt-commit' },
              h('code', { class: 'lt-commit__hash', text: c.hash }), h('span', { class: 'lt-commit__msg', text: c.msg }),
              c.autor !== e.gitConfig.nome ? h('span', { class: 'tag tag--neutra', text: c.autor }) : null,
              Object.entries(s.branches).filter(([, x]) => x === c.hash).map(([b]) => h('span', { class: 'tag tag--primaria', text: b })))))
              : h('p', { class: 'lt-area__vazio', text: 'Repositório vazio: falta o primeiro git push.' }));
      }

      const atualizar = () => { desenharAreas(); desenharTempo(); desenharRemoto(); };

      function abrirEditor({ caminho, conteudo }) {
        const area = h('textarea', { class: 'mt-editor__area', spellcheck: 'false', 'aria-label': `Editando ${caminho}`, rows: 8 });
        area.value = conteudo;
        let gravado = conteudo;
        const aviso = h('p', { class: 'lab-apoio__texto', 'aria-live': 'polite', text: 'Ctrl+O grava · Ctrl+X sai' });
        const gravarAgora = () => {
          const r = MotorShell.gravar(e, caminho, area.value);
          if (r.erro) { aviso.textContent = r.erro; return; }
          gravado = area.value; aviso.textContent = `Gravado: ${caminho}`; atualizar(); aoMudar();
        };
        const sair = () => {
          editorEl.hidden = true;
          if (term) term.focar();
          aoMudar();
          if (area.value !== gravado && term) term.rodar(`echo "(nano: saiu sem gravar ${caminho})"`);
        };
        area.addEventListener('keydown', (ev) => {
          if (ev.ctrlKey && (ev.key === 'o' || ev.key === 'O')) { ev.preventDefault(); gravarAgora(); }
          if (ev.ctrlKey && (ev.key === 'x' || ev.key === 'X')) { ev.preventDefault(); sair(); }
        });
        editorEl.replaceChildren(
          h('h3', { class: 'jp-bloco__titulo' }, icone('i-nota'), `nano ${caminho}`),
          area, aviso,
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', onclick: gravarAgora }, icone('i-check'), 'Gravar (Ctrl+O)'),
            h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: sair }, icone('i-x'), 'Sair (Ctrl+X)')));
        editorEl.hidden = false;
        area.focus();
      }

      function montar() {
        e = MotorGit.estado(m); valores = {};
        term = TerminalSimulado.criar({
          prompt: () => {
            const pasta = e.cwd === e.casa ? '~' : e.cwd.startsWith(`${e.casa}/`) ? `~${e.cwd.slice(e.casa.length)}` : e.cwd;
            const repo = MotorGit.repoDe(e, e.cwd);
            return `${e.usuario}@diver:${pasta}${repo ? ` (${repo.head})` : ''}$`;
          },
          rotulo: 'Terminal',
          boasVindas: m.boasVindas || 'Digite ajuda para ver os comandos do Git e do terminal.',
          atalhos: m.atalhos || [],
          executar: (linha) => MotorShell.rodar(e, linha),
          aoRodar: (r) => { if (r.editor) abrirEditor(r.editor); atualizar(); aoMudar(); },
        });
        const campos = (m.campos || []).map((c) => {
          const id = `lt-${c.id}`;
          return h('div', { class: 'jp-campo' }, h('label', { for: id, class: 'jp-campo__rotulo', text: c.rotulo }),
            h('select', { id, class: 'jp-campo__entrada', onchange: (ev) => { valores[c.id] = ev.target.value; aoMudar(); } },
              h('option', { value: '', text: 'Escolha…' }), c.opcoes.map((o) => h('option', { value: o, text: o }))));
        });
        editorEl.hidden = true;
        atualizar();
        el.replaceChildren(...[term.el, editorEl, areasEl, tempoEl, remotoEl,
          campos.length ? h('section', { class: 'jp-bloco', 'aria-label': 'Sua resposta' }, h('h3', { class: 'jp-bloco__titulo', text: 'Sua resposta' }), ...campos) : null].filter(Boolean));
      }

      montar();
      return {
        el,
        objetivos: () => MotorGit.objetivos(m, e).concat((m.campos || []).length ? [{ texto: m.textoResposta || 'Responder a pergunta da missão', ok: (m.campos || []).every((c) => valores[c.id]) }] : []),
        conferir: () => MotorGit.conferir(m, e, valores),
        recomecar: montar,
      };
    },
  },
});

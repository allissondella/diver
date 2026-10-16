/*
 * jogos/missoes-no-terminal.js — laboratório "Mão na massa" Missões no Terminal (Explora Tech, Módulo 11;
 * prioridade A, 2026-10-16). Um shell de mentirinha com sistema de arquivos virtual (js/laboratorio/motor-shell.js)
 * no terminal simulado (js/laboratorio/terminal.js): pwd, ls, cd, cat, head, tail, grep, wc, sort, uniq, mkdir, touch,
 * cp, mv, rm, chmod, nano, pipe, > e >>. Ao lado, a árvore de arquivos viva (com as permissões rwx) e, quando o aluno
 * digita nano, um mini editor com Ctrl+O (gravar) e Ctrl+X (sair). Nada toca o computador de verdade.
 * 3 estrelas = cumprir a missão com até metas.comandos comandos.
 */
LabJS.registrar({
  id: 'missoes-no-terminal',
  nome: 'Missões no Terminal',
  icone: 'i-codigo',
  duracao: '10-20 min',
  descricao: 'Mão na massa: um terminal Linux de mentirinha para achar pistas, organizar pastas, procurar em registros, dar permissões e editar arquivos.',
  motor: {
    textoConferir: 'Conferir missão',
    meta: (m) => ({ valor: m.metas.comandos, texto: `até ${UI.plural(m.metas.comandos, 'comando', 'comandos')}` }),
    tutorial: [
      { desenho: 'diver', titulo: 'Missões no Terminal', texto: 'Um Linux de mentirinha: as pastas e os arquivos existem só aqui. Pode apagar sem medo, e o Recomeçar traz tudo de volta.' },
      { alvo: '.term', desenho: 'livro', titulo: 'O terminal', texto: 'Digite o comando e aperte Enter. ajuda mostra a lista; a seta para cima traz o comando anterior.' },
      { alvo: '.mt-arvore', desenho: 'lupa', titulo: 'A árvore', texto: 'A árvore mostra as pastas e os arquivos e muda a cada comando. A pasta onde você está fica marcada.' },
    ],
    criar(m, { aoMudar }) {
      const { h, icone } = UI;
      let e = MotorShell.estado(m);
      let valores = {};
      let term = null;
      const el = h('div', { class: 'mt' });
      const arvoreEl = h('section', { class: 'jp-bloco mt-arvore', 'aria-label': 'Árvore de arquivos' });
      const editorEl = h('section', { class: 'jp-bloco mt-editor', 'aria-label': 'Editor de texto', hidden: true });
      const raiz = m.raizArvore || e.casa;

      function arvore() {
        const ramo = (pasta) => {
          const itens = Object.keys(e.fs).filter((c) => c !== pasta && c.slice(0, c.lastIndexOf('/') || 1) === pasta).sort();
          return h('ul', { class: 'mt-arvore__lista' }, itens.map((c) => {
            const n = e.fs[c];
            const nome = c.slice(c.lastIndexOf('/') + 1) + (n.tipo === 'd' ? '/' : '');
            const aqui = c === e.cwd;
            return h('li', { class: `mt-arvore__item ${aqui ? 'mt-arvore__item--aqui' : ''} ${nome.startsWith('.') ? 'mt-arvore__item--oculto' : ''}`.trim() },
              h('span', { class: 'mt-arvore__nome' }, icone(n.tipo === 'd' ? 'i-pasta' : 'i-arquivo'), nome,
                m.mostrarPermissoes ? h('code', { class: 'mt-arvore__modo', text: MotorShell.letras(n.modo, n.tipo).slice(1) }) : null,
                aqui ? h('span', { class: 'tag tag--sucesso', text: 'você está aqui' }) : null),
              n.tipo === 'd' ? ramo(c) : null);
          }));
        };
        arvoreEl.replaceChildren(h('h3', { class: 'jp-bloco__titulo' }, `Árvore de ${raiz}`, raiz === e.cwd ? h('span', { class: 'tag tag--sucesso', text: 'você está aqui' }) : null), ramo(raiz));
      }

      function abrirEditor({ caminho, conteudo }) {
        const area = h('textarea', { class: 'mt-editor__area', spellcheck: 'false', 'aria-label': `Editando ${caminho}`, rows: 8 });
        area.value = conteudo;
        let gravado = conteudo;
        const aviso = h('p', { class: 'lab-apoio__texto', 'aria-live': 'polite', text: 'Ctrl+O grava · Ctrl+X sai' });
        const gravarAgora = () => {
          const r = MotorShell.gravar(e, caminho, area.value);
          if (r.erro) { aviso.textContent = r.erro; return; }
          gravado = area.value; aviso.textContent = `Gravado: ${caminho}`; arvore(); aoMudar();
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
        e = MotorShell.estado(m); valores = {};
        term = TerminalSimulado.criar({
          prompt: () => `${e.usuario}@diver:${e.cwd === e.casa ? '~' : e.cwd.startsWith(`${e.casa}/`) ? `~${e.cwd.slice(e.casa.length)}` : e.cwd}$`,
          rotulo: 'Terminal',
          boasVindas: m.boasVindas || 'Digite ajuda para ver os comandos.',
          atalhos: m.atalhos || [],
          executar: (linha) => MotorShell.rodar(e, linha),
          aoRodar: (r) => { if (r.editor) abrirEditor(r.editor); arvore(); aoMudar(); },
        });
        const campos = (m.campos || []).map((c) => {
          const id = `mt-${c.id}`;
          return h('div', { class: 'jp-campo' }, h('label', { for: id, class: 'jp-campo__rotulo', text: c.rotulo }),
            h('select', { id, class: 'jp-campo__entrada', onchange: (ev) => { valores[c.id] = ev.target.value; aoMudar(); } },
              h('option', { value: '', text: 'Escolha…' }), c.opcoes.map((o) => h('option', { value: o, text: o }))));
        });
        editorEl.hidden = true;
        arvore();
        el.replaceChildren(...[term.el, editorEl, arvoreEl, campos.length ? h('section', { class: 'jp-bloco', 'aria-label': 'Sua resposta' }, h('h3', { class: 'jp-bloco__titulo', text: 'Sua resposta' }), ...campos) : null].filter(Boolean));
      }

      montar();
      return {
        el,
        objetivos: () => MotorShell.objetivos(m, e).concat((m.campos || []).length ? [{ texto: m.textoResposta || 'Responder a pergunta da missão', ok: (m.campos || []).every((c) => valores[c.id]) }] : []),
        conferir: () => MotorShell.conferir(m, e, valores),
        recomecar: montar,
      };
    },
  },
});

/*
 * laboratorio/lab-python.js — modelo dos laboratórios "Mão na massa" de Python puro (Explora Tech, 2026-10-13).
 *
 * Cada laboratório desse tipo (Primeiros Programas agora; Oficina de Funções e Caça-Bugs na Onda 1) se registra com
 * LabPython.registrar({ id, nome, descricao }). As missões ficam em data/laboratorios/<curso>/<id>.json:
 *   { id, aulas: [faseId], grupo, titulo, enunciado, codigoInicial, solucao, testes: [{ tipo: 'saida', nome, esperada }
 *     | { nome, codigo: 'assert ...', oculto }], entradas, metas: { linhas }, dicas: [3],
 *     toque: { modelo: 'print(___)', lacunas: [{ opcoes: [...], certa, dica }] } }
 * Os mesmos peças servem ao Caça-Bugs ("defeitos": o código inicial vem com 1 a 3 defeitos) e à Oficina de Funções
 * ("exemplos": o uso da função à vista; testes "oculto" conferem os casos de borda), Módulo 2, 2026-10-14.
 * Tela (arrumada em 2026-10-13): à esquerda, a coluna de apoio sempre à vista (o que deve aparecer na tela,
 * os comandos que o aluno já conhece e as dicas); à direita, a janela do código (editor, Rodar e a saída num
 * cartão só; input() vira linha de entrada na saída), os testes e o resultado. No celular, o modo toque completa
 * lacunas escolhendo opções, sem baixar o Python (o conferir-laboratorios garante que as certas passam nos testes).
 * Missão com "arquivos" (Organizador de Pasta, Módulo 7): a pasta aparece em árvore antes de rodar (coluna de apoio) e
 * depois de rodar (embaixo do código), com o que é novo, o que mudou e o que saiu.
 * "exemplos" com "tituloExemplos" mostram o objetivo de missões sem saída na tela (como deve ficar o arquivo ou a pasta).
 * Estrelas e XP como no Robô Entregador (Laboratorios.resultado).
 */
const LabPython = (() => {
  function registrar({ id, nome, descricao, icone = 'i-codigo', duracao = '10-20 min' }) {
    Jogos.registrar({
      id, nome, grupo: 'laboratorios', icone, largo: true, duracao, descricao,
      requer: { laboratorios: 1 },
      temConteudo: (cartas) => (cartas.laboratorios || []).includes(id),
      iniciar: (ctx) => iniciar(ctx, id),
    });
  }

  const preencher = (toque, escolhas) => Laboratorios.preencher(toque, escolhas);

  function iniciar(ctx, labId) {
    const { h, icone, limpar } = UI;
    const trilha = ctx.trilha;
    const inicio = Date.now();
    const tentativas = new Map();
    let lab = null;
    let missoes = [];
    let idx = 0;
    let modo = Laboratorios.modoInicial();
    let destruido = false;
    let telas = {};
    let dicasMissao = null;
    let inicioMissao = Date.now();

    limpar(ctx.container).append(h('div', { class: 'lab-carregando', role: 'status' }, UI.mascote('mascote--pensando'), h('p', { text: 'Preparando o laboratório…' })));
    Laboratorios.carregar(trilha.id, labId).then((dados) => {
      if (destruido) return;
      lab = dados;
      const daAula = ctx.opcoes.fase ? lab.missoes.filter((m) => (m.aulas || []).includes(ctx.opcoes.fase)) : [];
      missoes = daAula.length ? daAula : lab.missoes;
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const pendente = missoes.findIndex((m) => !(prog[m.id] && prog[m.id].estrelas >= 3));
      idx = pendente >= 0 ? pendente : 0;
      montar();
    }).catch((e) => {
      console.error(e);
      if (!destruido) limpar(ctx.container).append(UI.vazio('Não deu para abrir o laboratório', 'Confira a internet e tente de novo.'));
    });

    const esperadaDe = (m) => { const t = (m.testes || []).find((x) => x.tipo === 'saida' && !x.oculto); return t ? t.esperada : ''; };

    /**
     * O objetivo, sempre à vista: a saída esperada (um teste), a lista "com tal entrada, aparece tal coisa"
     * (vários testes de saída, Caça-Bugs) ou os exemplos de uso da função (Oficina de Funções).
     */
    function alvoDe(m) {
      const visiveis = (m.testes || []).filter((x) => x.tipo === 'saida' && !x.oculto);
      const ocultos = (m.testes || []).filter((x) => x.oculto).length;
      const nota = ocultos ? h('p', { class: 'lab-apoio__texto', text: `E ${UI.plural(ocultos, 'teste escondido confere', 'testes escondidos conferem')} os casos de borda: ele${ocultos > 1 ? 's' : ''} aparece${ocultos > 1 ? 'm' : ''} se não passar${ocultos > 1 ? 'em' : ''}.` }) : null;
      if (Array.isArray(m.exemplos) && m.exemplos.length) {
        return Laboratorios.cartao({ id: 'lab-alvo', classe: 'lab-alvo', icone: 'i-alvo', titulo: m.tituloExemplos || 'O que a função precisa fazer',
          conteudo: [h('pre', { class: 'codigo lab-alvo__saida lab-alvo__exemplos', tabindex: '0' }, h('code', { text: m.exemplos.join('\n') })), nota] });
      }
      if (visiveis.length > 1) {
        return Laboratorios.cartao({ id: 'lab-alvo', classe: 'lab-alvo', icone: 'i-alvo', titulo: 'O que deve aparecer na tela',
          conteudo: [h('ul', { class: 'lab-alvo__casos' }, visiveis.map((t) => h('li', {}, h('span', { class: 'lab-alvo__caso', text: t.nome }),
            h('pre', { class: 'codigo lab-alvo__saida', tabindex: '0' }, h('code', { text: t.esperada.replace(/\n$/, '') }))))), nota] });
      }
      return Laboratorios.cartao({ id: 'lab-alvo', classe: 'lab-alvo', icone: 'i-alvo', titulo: 'O que deve aparecer na tela',
        conteudo: [h('pre', { class: 'codigo lab-alvo__saida', tabindex: '0' }, h('code', { text: esperadaDe(m) || '(confira os testes)' })), nota] });
    }


    /**
     * A pasta da missão (Organizador de Pasta, Módulo 7): a foto { "caminho": conteúdo, "pasta/": null } vira uma árvore
     * com pastas primeiro. Com "antes", marca o que é novo ou mudou e lista o que saiu da pasta.
     */
    function arvorePasta(foto, antes = null) {
      const raiz = { pastas: new Map(), arquivos: [] };
      const no = (caminho) => {
        let atual = raiz;
        for (const parte of caminho) {
          if (!atual.pastas.has(parte)) atual.pastas.set(parte, { pastas: new Map(), arquivos: [] });
          atual = atual.pastas.get(parte);
        }
        return atual;
      };
      for (const [caminho, conteudo] of Object.entries(foto || {})) {
        const partes = caminho.replace(/\/$/, '').split('/');
        if (caminho.endsWith('/')) { no(partes); continue; }
        no(partes.slice(0, -1)).arquivos.push({ nome: partes[partes.length - 1], caminho, conteudo: conteudo || '' });
      }
      const pastasAntes = new Set(Object.keys(antes || {}).flatMap((c) => c.split('/').slice(0, -1).map((_, i, partes) => `${partes.slice(0, i + 1).join('/')}/`)));
      const estado = (caminho, conteudo) => {
        if (!antes) return '';
        if (caminho.endsWith('/')) return caminho in antes || pastasAntes.has(caminho) ? '' : 'novo';
        if (!(caminho in antes)) return 'novo';
        return conteudo !== null && antes[caminho] !== conteudo ? 'mudou' : '';
      };
      const lista = (n, prefixo) => h('ul', { class: 'lab-pasta__lista' },
        [...n.pastas.keys()].sort().map((nome) => {
          const e = estado(`${prefixo}${nome}/`, null);
          return h('li', { class: `lab-pasta__item lab-pasta__item--pasta ${e ? `lab-pasta__item--${e}` : ''}`.trim() },
            h('span', { class: 'lab-pasta__nome' }, icone('i-pasta'), `${nome}/`, e === 'novo' ? h('span', { class: 'tag tag--sucesso', text: 'nova' }) : null),
            lista(n.pastas.get(nome), `${prefixo}${nome}/`));
        }),
        n.arquivos.sort((a, b) => a.nome.localeCompare(b.nome)).map((a) => {
          const e = estado(a.caminho, a.conteudo);
          return h('li', { class: `lab-pasta__item ${e ? `lab-pasta__item--${e}` : ''}`.trim() },
            h('details', { class: 'lab-pasta__arquivo' },
              h('summary', { class: 'lab-pasta__nome' }, icone('i-arquivo'), a.nome,
                e ? h('span', { class: `tag ${e === 'novo' ? 'tag--sucesso' : 'tag--destaque'}`, text: e === 'novo' ? 'novo' : 'mudou' }) : null),
              h('pre', { class: 'codigo lab-pasta__conteudo', tabindex: '0' }, h('code', { text: a.conteudo ? a.conteudo.replace(/\n$/, '') : '(arquivo vazio)' }))));
        }));
      const arvore = lista(raiz, '');
      const sairam = antes ? Object.keys(antes).filter((c) => !(c in (foto || {}))) : [];
      const vazia = !Object.keys(foto || {}).length;
      return [
        vazia ? h('p', { class: 'lab-apoio__texto', text: '(pasta vazia)' }) : arvore,
        sairam.length ? h('p', { class: 'lab-pasta__sairam' }, h('strong', { text: `Saíram deste lugar (${sairam.length}): ` }),
          sairam.length > 5 ? `${sairam.slice(0, 5).join(', ')} e mais ${sairam.length - 5}` : sairam.join(', ')) : null,
      ];
    }

    function cartaoPasta(m) {
      return Laboratorios.cartao({ id: 'lab-pasta', classe: 'lab-pasta', icone: 'i-pasta', titulo: 'A pasta antes de rodar',
        conteudo: [h('p', { class: 'lab-apoio__texto', text: 'Toque num arquivo para ver o que tem dentro. Cada vez que você roda, a pasta volta a ficar assim.' }), ...arvorePasta(m.arquivos)] });
    }

    function mostrarPastaDepois(m, foto) {
      if (!telas.pasta) return;
      if (!foto) { telas.pasta.hidden = true; return; }
      telas.pasta.replaceChildren(...[].concat(Laboratorios.cartao({ id: 'lab-pasta-depois', classe: 'lab-pasta', icone: 'i-pasta', titulo: 'A pasta depois de rodar',
        conteudo: arvorePasta(foto, m.arquivos) })));
      telas.pasta.hidden = false;
    }

    function montar() {
      const m = missoes[idx];
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const melhor = prog[m.id] ? prog[m.id].estrelas : 0;
      inicioMissao = Date.now();
      telas.resultado = h('div', { class: 'lab-resultado', 'aria-live': 'polite' });
      telas.testes = h('ul', { class: 'lab-testes', 'aria-label': 'Testes da missão', hidden: true });
      telas.pasta = m.arquivos ? h('div', { class: 'lab-pasta-depois', 'aria-live': 'polite', hidden: true }) : null;

      const missaoNav = h('nav', { class: 'lab-missoes', 'aria-label': 'Missões do laboratório' },
        missoes.map((mm, i) => {
          const e = prog[mm.id] ? prog[mm.id].estrelas : 0;
          return h('button', {
            type: 'button', class: `lab-missao ${i === idx ? 'lab-missao--atual' : ''}`, 'aria-current': i === idx ? 'step' : null,
            'aria-label': `Missão ${i + 1}: ${mm.titulo}. ${e ? `${e} de 3 estrelas` : 'ainda não feita'}`,
            onclick: () => { idx = i; montar(); },
          }, h('span', { class: 'lab-missao__n', text: String(i + 1) }), Laboratorios.estrelas(e, false));
        }));
      const temToque = !!(m.toque && m.toque.lacunas && m.toque.lacunas.length);
      const usarToque = modo === 'toque' && temToque;
      const trocaModo = temToque ? h('button', {
        type: 'button', class: 'lab-janela__modo', id: 'lab-modo',
        onclick: () => { modo = modo === 'toque' ? 'codigo' : 'toque'; Laboratorios.guardarModo(modo); montar(); },
      }, icone(usarToque ? 'i-codigo' : 'i-controle'), usarToque ? 'Escrever o código' : 'Modo toque') : null;

      // Coluna de apoio, sempre à vista: o que o programa deve mostrar, os comandos que o aluno já conhece e as dicas
      dicasMissao = Laboratorios.dicas(m.dicas || []);
      const apoio = h('aside', { class: 'lab__apoio', 'aria-label': 'O objetivo, os comandos e as dicas' },
        alvoDe(m),
        m.arquivos ? cartaoPasta(m) : null,
        Laboratorios.cartao({ id: 'lab-comandos', icone: 'i-livro', titulo: lab.tituloReferencia || 'Comandos que você já conhece',
          conteudo: Laboratorios.listaComandos(lab.referencia) }),
        Laboratorios.cartao({ id: 'lab-ajuda', icone: 'i-bolha', titulo: 'Travou?',
          conteudo: [h('p', { class: 'lab-apoio__texto', text: 'Três dicas, cada uma mais perto da resposta. A última vale só 1 estrela.' }), dicasMissao.el] }));

      const area = usarToque ? montarToque(m, trocaModo) : montarCodigo(m, trocaModo);

      limpar(ctx.container).append(h('div', { class: 'lab lab-py' },
        h('header', { class: 'lab__cabeca' },
          h('div', { class: 'lab__topo' },
            h('p', { class: 'rotulo', text: m.grupo || 'Missão' }),
            h('button', { type: 'button', class: 'botao botao--link botao--pequeno', id: 'lab-como', onclick: () => tutorial(true) }, icone('i-bolha'), 'Como funciona?')),
          h('h2', { class: 'lab__titulo' }, m.titulo, melhor ? Laboratorios.estrelas(melhor) : null,
            m.defeitos ? h('span', { class: 'chip chip--atrasada lab__defeitos' }, icone('i-alerta'), `${UI.plural(m.defeitos, 'defeito', 'defeitos')} para achar`) : null),
          h('p', { class: 'lab__enunciado' }, UI.marcado(m.enunciado)),
          h('div', { class: 'lab__barra' }, h('span', { class: 'lab__barra-rotulo', text: `Missão ${idx + 1} de ${missoes.length}` }), missaoNav)),
        h('div', { class: 'lab__corpo' },
          apoio,
          h('section', { class: 'lab__bancada', 'aria-label': usarToque ? 'Complete as lacunas' : 'Seu código' },
            area, telas.pasta, telas.testes, telas.resultado)),
        h('footer', { class: 'lab__pe' },
          Laboratorios.fazerDeVerdade(lab.fazDeVerdade),
          h('div', { class: 'lab__pe-acoes' },
            h('button', { type: 'button', class: 'botao botao--secundario', id: 'lab-concluir', onclick: concluir }, icone('i-check'), 'Concluir laboratório')))));
      tutorial(false);
    }

    function montarCodigo(m, trocaModo) {
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, m.id);
      let espera = null;
      telas.editor = EditorCodigo.criar({
        valor: typeof salvo === 'string' ? salvo : m.codigoInicial || '',
        rotulo: 'Seu código em Python',
        minLinhas: 8,
        aoMudar: (v) => { clearTimeout(espera); espera = setTimeout(() => Laboratorios.gravarRascunho(trilha.id, lab.id, m.id, v), 400); },
        aoRodar: () => rodar(m),
      });
      telas.console = ConsoleLab.criar({ rotulo: 'Saída', vazio: 'Aperte Rodar para ver aqui o que o programa mostra.' });
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', id: 'lab-rodar', title: 'Rodar o programa (Ctrl+Enter)', 'aria-keyshortcuts': 'Control+Enter', onclick: () => rodar(m) }, icone('i-seta-dir'), 'Rodar');
      const recomecar = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: async () => {
        if (!(await UI.confirmar({ titulo: 'Voltar ao código inicial?', texto: 'O que você escreveu nesta missão vai ser trocado pelo código do começo.', sim: 'Voltar ao início', humor: 'triste' }))) return;
        telas.editor.definir(m.codigoInicial || '');
      } }, icone('i-revisao'), 'Recomeçar');
      return Laboratorios.janela({ arquivo: 'programa.py', ferramenta: trocaModo, corpo: telas.editor.el, acoes: [telas.rodar, recomecar], atalho: 'Ctrl+Enter roda', saida: telas.console.el });
    }

    function montarToque(m, trocaModo) {
      const t = m.toque;
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, `${m.id}:toque`);
      const escolhas = Array.isArray(salvo) && salvo.length === t.lacunas.length ? salvo : t.lacunas.map(() => null);
      telas.editor = null;
      telas.console = ConsoleLab.criar({ rotulo: 'Saída', vazio: 'Escolha as lacunas e aperte Rodar.' });
      const lacunas = Laboratorios.campoLacunas({ toque: t, escolhas, aoMudar: () => Laboratorios.gravarRascunho(trilha.id, lab.id, `${m.id}:toque`, escolhas) });
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', id: 'lab-rodar', onclick: () => rodarToque(m, escolhas) }, icone('i-seta-dir'), 'Rodar');
      return Laboratorios.janela({
        arquivo: 'programa.py · lacunas', ferramenta: trocaModo,
        corpo: lacunas,
        acoes: [telas.rodar], saida: telas.console.el,
      });
    }

    /* ---------- Rodar ---------- */
    async function rodar(m) {
      if (!telas.editor || telas.rodar.disabled) return;
      const codigo = telas.editor.valor();
      Laboratorios.gravarRascunho(trilha.id, lab.id, m.id, codigo);
      telas.rodar.disabled = true;
      telas.console.limpar();
      telas.resultado.replaceChildren();
      telas.testes.hidden = true;
      if (telas.pasta) telas.pasta.hidden = true;
      telas.editor.marcarLinha(null);
      if (!Executor.info().pronto) telas.console.escrever('Preparando o Python (só na primeira vez: uns 6 MB)…', 'info');
      const entradas = [];
      let r;
      try {
        for (let volta = 0; volta < 20; volta++) {
          // prelude: código do laboratório que roda antes (ex.: o número escondido do Caça ao Número);
          // arquivos: a pasta da missão (Organizador de Pasta), devolvida depois em r.arquivos
          r = await Executor.rodar({ codigo, entradas, testes: m.testes, semente: 7, prelude: m.prelude || '', arquivos: m.arquivos, verArquivos: !!m.arquivos }, { tempoMs: 6000 });
          if (destruido) return;
          if (!r.precisaEntrada) break;
          telas.console.limpar();
          if (r.saida) telas.console.escrever(r.saida.replace(/[^\n]*$/, ''));
          const v = await telas.console.pedirEntrada(r.prompt);
          if (v === null) { telas.rodar.disabled = false; return; }
          entradas.push(v);
        }
      } catch (e) {
        console.error(e);
        telas.console.escrever('Não deu para abrir o Python neste navegador. Tente o modo toque ou outro navegador.', 'erro');
        telas.rodar.disabled = false;
        return;
      }
      telas.rodar.disabled = false;
      telas.console.limpar();
      mostrarPastaDepois(m, r.arquivos);
      if (r.saida) telas.console.escrever(r.saida);
      else if (!r.erro) telas.console.escrever('(o programa rodou, mas não mostrou nada na tela)', 'info');
      if (r.erro) {
        telas.resultado.replaceChildren(Laboratorios.blocoErro(r.erro));
        if (r.erro.linha) telas.editor.marcarLinha(r.erro.linha);
        finalizar(m, false, { silencioso: true });
        return;
      }
      mostrarTestes(r.testes);
      finalizar(m, r.testes.length > 0 && r.testes.every((t) => t.passou), { linhas: MundoRobo.linhasDeCodigo(codigo) });
    }

    function rodarToque(m, escolhas) {
      const t = m.toque;
      telas.console.limpar();
      telas.resultado.replaceChildren();
      const vazia = escolhas.findIndex((e) => e === null);
      if (vazia >= 0) {
        telas.resultado.replaceChildren(h('div', { class: 'lab-erro', role: 'alert' }, h('p', { class: 'lab-erro__traducao', text: `Falta escolher a lacuna ${vazia + 1}.` })));
        return;
      }
      const errada = escolhas.findIndex((e, i) => e !== t.lacunas[i].certa);
      if (errada >= 0) {
        const l = t.lacunas[errada];
        finalizar(m, false, { mensagem: `A lacuna ${errada + 1} ainda não está certa. ${l.dica || 'Releia o enunciado e o que deve aparecer na tela.'}` });
        return;
      }
      // tudo certo: o programa completo (conferido pelo script) mostra a saída esperada
      telas.console.escrever(esperadaDe(m) || 'Todos os testes passaram.');
      finalizar(m, true, { linhas: 0 });
    }

    function mostrarTestes(testes) {
      telas.testes.replaceChildren(...testes.filter((t) => !t.oculto || !t.passou).map((t) => h('li', { class: `lab-teste ${t.passou ? 'lab-teste--ok' : 'lab-teste--falhou'}` },
        icone(t.passou ? 'i-check' : 'i-x'),
        h('span', {}, h('strong', { text: t.oculto ? 'Teste extra' : t.nome }),
          t.passou ? null : h('span', { class: 'lab-teste__msg', text: ` — ${t.mensagem || 'não passou'}` }),
          !t.passou && t.esperada !== undefined ? h('span', { class: 'lab-teste__compara' },
            h('span', { text: 'Esperado:' }), h('code', { class: 'codigo-linha', text: t.esperada.replace(/\n$/, '') || '(nada)' }),
            h('span', { text: 'Saiu:' }), h('code', { class: 'codigo-linha', text: (t.obtida || '').replace(/\n$/, '') || '(nada)' })) : null))));
      telas.testes.hidden = !telas.testes.childElementCount;
    }

    function finalizar(m, passou, { linhas = 0, mensagem = '', silencioso = false } = {}) {
      const t = tentativas.get(m.id) || { missao: m, resolvida: false, estrelas: 0, tempoMs: 0 };
      t.tempoMs = Date.now() - inicioMissao;
      if (!passou) {
        tentativas.set(m.id, t);
        UI.humorMascote(ctx.container, 'triste');
        if (!silencioso) {
          telas.resultado.replaceChildren(h('div', { class: 'lab-erro', role: 'alert' },
            h('p', { class: 'lab-erro__titulo' }, icone('i-alerta'), 'Quase!'),
            h('p', { class: 'lab-erro__traducao', text: mensagem || 'Algum teste ainda não passou. Compare o que saiu com o que deve aparecer na tela.' })));
        }
        return;
      }
      const usadas = dicasMissao ? dicasMissao.usadas() : 0;
      const qualidade = linhas <= ((m.metas && m.metas.linhas) || Infinity);
      let estrelas = 1;
      if (usadas < (m.dicas || []).length) { estrelas = 2; if (qualidade) estrelas = 3; }
      const { antes, agora } = Laboratorios.registrar(trilha.id, lab.id, m.id, estrelas);
      t.resolvida = true;
      t.estrelas = Math.max(t.estrelas, estrelas);
      tentativas.set(m.id, t);
      UI.humorMascote(ctx.container, 'feliz');
      const progAgora = Laboratorios.progresso(trilha.id, lab.id);
      const todasDaAula = ctx.opcoes.fase && missoes.every((mm) => progAgora[mm.id] && progAgora[mm.id].estrelas >= 1);
      if (todasDaAula) Laboratorios.marcarAula(trilha.id, lab.id, ctx.opcoes.fase);
      const falta = estrelas < 3
        ? (estrelas === 1 ? 'Sem a última dica, a missão vale até 3 estrelas.' : `Para a 3ª estrela: até ${m.metas.linhas} linhas de código (você usou ${linhas}).`)
        : 'Programa certinho e enxuto.';
      const proxima = idx < missoes.length - 1;
      telas.resultado.replaceChildren(h('div', { class: 'lab-sucesso', role: 'status' },
        h('p', { class: 'lab-sucesso__titulo' }, icone('i-check'), 'Mandou bem, Diver! Todos os testes passaram.'),
        Laboratorios.estrelas(estrelas),
        h('p', { class: 'texto-suave', text: agora > antes ? `${falta} Nova marca: ${agora} de 3.` : falta }),
        h('div', { class: 'acoes-linha' },
          proxima ? h('button', { type: 'button', class: 'botao botao--primario', id: 'lab-proxima', onclick: () => { idx++; montar(); } }, 'Próxima missão', icone('i-seta-dir'))
            : h('button', { type: 'button', class: 'botao botao--primario', id: 'lab-fim', onclick: concluir }, icone('i-check'), todasDaAula ? 'Concluir e seguir para a próxima aula' : 'Concluir laboratório'))));
      const botao = telas.resultado.querySelector('button');
      if (botao) botao.focus({ preventScroll: true });
    }

    function concluir() {
      ctx.aoTerminar(Laboratorios.resultado({ trilha, lab, inicio, tentativas: [...tentativas.values()] }));
    }

    function tutorial(forcar) {
      if (typeof Tutorial === 'undefined' || !Tutorial.guiar) return;
      Tutorial.guiar('lab-python', [
        { desenho: 'diver', titulo: 'Mão na massa!', texto: 'Aqui você escreve programas de verdade em Python. Cada missão pede uma saída na tela, e os testes conferem se o seu programa chegou lá.' },
        { alvo: '#lab-alvo', desenho: 'alvo', titulo: 'O objetivo', texto: 'É isto que o seu programa precisa fazer: a saída na tela, letra por letra, ou os exemplos de uso da função.' },
        { alvo: '#lab-comandos', desenho: 'livro', titulo: 'Sua cola', texto: 'Os comandos que você já aprendeu ficam sempre aqui. Consulte à vontade.' },
        { alvo: '#lab-rodar', desenho: 'onda', titulo: 'Rode e confira', texto: 'Rode quantas vezes quiser. Errou? O Python mostra a linha e nós traduzimos a mensagem.' },
        { alvo: '#lab-ajuda', desenho: 'lupa', titulo: 'Dicas', texto: 'Travou? São três dicas, cada uma mais perto da resposta. A última vale só 1 estrela.' },
      ], { forcar });
    }

    return { destruir() { destruido = true; } };
  }

  return { registrar, preencher };
})();

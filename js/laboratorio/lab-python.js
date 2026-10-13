/*
 * laboratorio/lab-python.js — modelo dos laboratórios "Mão na massa" de Python puro (Explora Tech, 2026-10-13).
 *
 * Cada laboratório desse tipo (Primeiros Programas agora; Oficina de Funções e Caça-Bugs na Onda 1) se registra com
 * LabPython.registrar({ id, nome, descricao }). As missões ficam em data/laboratorios/<curso>/<id>.json:
 *   { id, aulas: [faseId], grupo, titulo, enunciado, codigoInicial, solucao, testes: [{ tipo: 'saida', nome, esperada }
 *     | { nome, codigo: 'assert ...', oculto }], entradas, metas: { linhas }, dicas: [3],
 *     toque: { modelo: 'print(___)', lacunas: [{ opcoes: [...], certa, dica }] } }
 * Tela: o que deve aparecer na tela (a saída esperada) e os comandos que o aluno já conhece, sempre à vista;
 * o editor com Rodar; o console (input() vira linha de entrada); os testes. No celular, o modo toque completa
 * lacunas escolhendo opções, sem baixar o Python (o conferir-laboratorios garante que as certas passam nos testes).
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

  /** O código da lacuna preenchido com as escolhas (índices das opções). */
  function preencher(toque, escolhas) {
    let i = 0;
    return toque.modelo.replace(/___/g, () => {
      const l = toque.lacunas[i];
      const e = escolhas[i++];
      return l && e !== undefined && e !== null ? l.opcoes[e] : '___';
    });
  }

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

    function montar() {
      const m = missoes[idx];
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const melhor = prog[m.id] ? prog[m.id].estrelas : 0;
      inicioMissao = Date.now();
      telas.resultado = h('div', { class: 'lab-resultado', 'aria-live': 'polite' });
      telas.testes = h('ul', { class: 'lab-testes', 'aria-label': 'Testes da missão', hidden: true });

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
      const trocaModo = temToque ? h('button', {
        type: 'button', class: 'botao botao--link botao--pequeno', id: 'lab-modo',
        onclick: () => { modo = modo === 'toque' ? 'codigo' : 'toque'; Laboratorios.guardarModo(modo); montar(); },
      }, icone(modo === 'toque' ? 'i-codigo' : 'i-controle'), modo === 'toque' ? 'Escrever o código' : 'Completar lacunas (modo toque)') : null;

      // Sempre à vista: o que o programa deve mostrar e os comandos que o aluno já conhece
      const alvo = h('section', { class: 'lab-alvo', 'aria-labelledby': 'lab-alvo-titulo' },
        h('h3', { class: 'lab-comandos__titulo', id: 'lab-alvo-titulo', text: 'O que deve aparecer na tela' }),
        h('pre', { class: 'codigo lab-alvo__saida', tabindex: '0' }, h('code', { text: esperadaDe(m) || '(confira os testes abaixo)' })));
      const referencia = h('section', { class: 'lab-comandos', id: 'lab-comandos', 'aria-labelledby': 'lab-comandos-titulo' },
        h('h3', { class: 'lab-comandos__titulo', id: 'lab-comandos-titulo', text: lab.tituloReferencia || 'Comandos que você já conhece' }),
        h('ul', { class: 'lab-comandos__lista' }, (lab.referencia || []).map((c) => h('li', {}, h('code', { class: 'codigo-linha', text: c.nome }), h('span', { text: c.faz })))));

      dicasMissao = Laboratorios.dicas(m.dicas || []);
      const usarToque = modo === 'toque' && temToque;
      const area = usarToque ? montarToque(m) : montarCodigo(m);

      limpar(ctx.container).append(h('div', { class: 'lab lab-py' },
        h('header', { class: 'lab__cabeca' },
          h('p', { class: 'rotulo', text: `${lab.nome} · ${m.grupo || 'Missão'} · missão ${idx + 1} de ${missoes.length}` }),
          h('h2', { class: 'lab__titulo' }, m.titulo, melhor ? Laboratorios.estrelas(melhor) : null),
          h('p', { class: 'lab__enunciado' }, UI.marcado(m.enunciado)),
          h('div', { class: 'lab__barra' }, missaoNav, trocaModo)),
        h('div', { class: 'lab__corpo' },
          h('section', { class: 'lab__palco', 'aria-label': 'O objetivo e os comandos' }, alvo, referencia),
          h('section', { class: 'lab__bancada', 'aria-label': usarToque ? 'Complete as lacunas' : 'Seu código' },
            area, telas.testes, dicasMissao.el, telas.resultado)),
        h('footer', { class: 'lab__pe' },
          Laboratorios.fazerDeVerdade(lab.fazDeVerdade),
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--link', onclick: () => tutorial(true) }, icone('i-bolha'), 'Como funciona?'),
            h('button', { type: 'button', class: 'botao botao--secundario', id: 'lab-concluir', onclick: concluir }, icone('i-check'), 'Concluir laboratório')))));
      tutorial(false);
    }

    function montarCodigo(m) {
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, m.id);
      let espera = null;
      telas.editor = EditorCodigo.criar({
        valor: typeof salvo === 'string' ? salvo : m.codigoInicial || '',
        rotulo: 'Seu código em Python',
        aoMudar: (v) => { clearTimeout(espera); espera = setTimeout(() => Laboratorios.gravarRascunho(trilha.id, lab.id, m.id, v), 400); },
        aoRodar: () => rodar(m),
      });
      telas.console = ConsoleLab.criar({ rotulo: 'Console do Python' });
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario', id: 'lab-rodar', title: 'Rodar o programa (Ctrl+Enter)', 'aria-keyshortcuts': 'Control+Enter', onclick: () => rodar(m) }, icone('i-seta-dir'), 'Rodar');
      return h('div', { class: 'lab-codigo' },
        telas.editor.el,
        h('div', { class: 'lab-acoes' }, telas.rodar,
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: async () => {
            if (!(await UI.confirmar({ titulo: 'Voltar ao código inicial?', texto: 'O que você escreveu nesta missão vai ser trocado pelo código do começo.', sim: 'Voltar ao início', humor: 'triste' }))) return;
            telas.editor.definir(m.codigoInicial || '');
          } }, icone('i-revisao'), 'Recomeçar'),
          h('span', { class: 'lab-acoes__atalho texto-suave', 'aria-hidden': 'true', text: 'Ctrl+Enter roda' })),
        telas.console.el);
    }

    function montarToque(m) {
      const t = m.toque;
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, `${m.id}:toque`);
      const escolhas = Array.isArray(salvo) && salvo.length === t.lacunas.length ? salvo : t.lacunas.map(() => null);
      telas.editor = null;
      telas.console = ConsoleLab.criar({ rotulo: 'O que apareceu na tela' });
      // o modelo vira linhas de código; cada ___ vira um menu de escolha (grande, bom para o dedo)
      let n = 0;
      const linhas = t.modelo.split('\n').map((linha, li) => h('div', { class: 'lab-lacunas__linha' },
        h('span', { class: 'lab-lacunas__n', 'aria-hidden': 'true', text: String(li + 1) }),
        h('code', { class: 'lab-lacunas__codigo' }, linha.split('___').flatMap((parte, k, arr) => {
          if (k === arr.length - 1) return [parte];
          const i = n++;
          const sel = h('select', { class: 'lab-lacuna', 'aria-label': `Lacuna ${i + 1}, linha ${li + 1}`, onchange: (e) => { escolhas[i] = e.target.value === '' ? null : Number(e.target.value); Laboratorios.gravarRascunho(trilha.id, lab.id, `${m.id}:toque`, escolhas); } },
            h('option', { value: '', text: '___' }),
            t.lacunas[i].opcoes.map((o, j) => h('option', { value: String(j), selected: escolhas[i] === j, text: o })));
          return [parte, sel];
        }))));
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario', id: 'lab-rodar', onclick: () => rodarToque(m, escolhas) }, icone('i-seta-dir'), 'Rodar');
      return h('div', { class: 'lab-toque' },
        h('p', { class: 'texto-suave', text: 'Modo toque: escolha o que vai em cada lacuna. No computador, dá para escrever o código inteiro.' }),
        h('div', { class: 'lab-lacunas', role: 'group', 'aria-label': 'Código com lacunas' }, linhas),
        h('div', { class: 'lab-acoes' }, telas.rodar),
        telas.console.el);
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
      telas.editor.marcarLinha(null);
      if (!Executor.info().pronto) telas.console.escrever('Preparando o Python (só na primeira vez: uns 6 MB)…', 'info');
      const entradas = [];
      let r;
      try {
        for (let volta = 0; volta < 20; volta++) {
          r = await Executor.rodar({ codigo, entradas, testes: m.testes, semente: 7 }, { tempoMs: 6000 });
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
      if (r.saida) telas.console.escrever(r.saida);
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
      telas.console.escrever(esperadaDe(m));
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
        { alvo: '.lab-alvo', desenho: 'alvo', titulo: 'O objetivo', texto: 'É isto que o seu programa precisa mostrar, letra por letra.' },
        { alvo: '#lab-comandos', desenho: 'livro', titulo: 'Sua cola', texto: 'Os comandos que você já aprendeu ficam sempre aqui. Consulte à vontade.' },
        { alvo: '#lab-rodar', desenho: 'onda', titulo: 'Rode e confira', texto: 'Rode quantas vezes quiser. Errou? O Python mostra a linha e nós traduzimos a mensagem.' },
        { alvo: '#lab-dica', desenho: 'lupa', titulo: 'Dicas', texto: 'Travou? São três dicas, cada uma mais perto da resposta. A última vale só 1 estrela.' },
      ], { forcar });
    }

    return { destruir() { destruido = true; } };
  }

  return { registrar, preencher };
})();

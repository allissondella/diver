/*
 * jogos/robo-entregador.js — laboratório "Mão na massa" Robô Entregador (Explora Tech, 2026-10-13).
 *
 * O aluno escreve comandos em Python (andar(), virar_esquerda(), virar_direita(), pegar(), soltar())
 * e o robô anda na grade, com a linha em execução acesa. Decisões (Módulo 2, 2026-10-14): sensores
 * (parede_a_frente(), parede_a_direita(), parede_a_esquerda(), caixa_aqui()) e missões com vários mundos
 * ("cenarios"): o mesmo programa precisa entregar em todos; no celular, lacunas rodadas por MundoRobo.executar. Missões em data/laboratorios/<curso>/robo-entregador.json.
 *  - Modo código: o Python de verdade (Pyodide, num sandbox; js/laboratorio/executor.js).
 *  - Modo toque (celular): blocos de comando, sem baixar o Python; o mundo em JavaScript (MundoRobo)
 *    tem as mesmas regras (conferido pelo scripts/conferir-laboratorios.mjs).
 * Estrelas: 1 = entregou; 2 = sem a última dica; 3 = também dentro da meta de linhas e passos.
 * Devolve o Resultado padrão (Laboratorios.resultado): XP só pelas estrelas novas, pela economia.
 */
Jogos.registrar({
  id: 'robo-entregador',
  nome: 'Robô Entregador',
  grupo: 'laboratorios',
  icone: 'i-codigo',
  largo: true,
  duracao: '10-20 min',
  descricao: 'Mão na massa: escreva comandos em Python e leve as caixas até o destino.',
  requer: { laboratorios: 1 },
  temConteudo: (cartas) => (cartas.laboratorios || []).includes('robo-entregador'),

  iniciar(ctx) {
    const { h, icone, limpar } = UI;
    const VELOCIDADES = { lento: 700, normal: 380, rapido: 130 };
    const trilha = ctx.trilha;
    const inicio = Date.now();
    const tentativas = new Map(); // missao.id → { missao, resolvida, estrelas, tempoMs }
    let lab = null;
    let fonteRobo = null;
    let missoes = [];
    let idx = 0;
    let modo = Laboratorios.modoInicial();
    let velocidade = 'normal';
    let passoAPasso = false;
    let animacao = null; // { cancelar() }
    let mundos = [];
    let mundoAtual = 0;
    let destruido = false;
    let telas = {};
    let dicasMissao = null;
    let inicioMissao = Date.now();

    limpar(ctx.container).append(h('div', { class: 'lab-carregando', role: 'status' }, UI.mascote('mascote--pensando'), h('p', { text: 'Preparando o laboratório…' })));

    Promise.all([
      Laboratorios.carregar(trilha.id, 'robo-entregador'),
      fetch('laboratorio/labs/robo.py').then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))),
    ]).then(([dados, fonte]) => {
      if (destruido) return;
      lab = dados;
      fonteRobo = fonte;
      const daAula = ctx.opcoes.fase ? lab.missoes.filter((m) => (m.aulas || []).includes(ctx.opcoes.fase)) : [];
      missoes = daAula.length ? daAula : lab.missoes;
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const pendente = missoes.findIndex((m) => !(prog[m.id] && prog[m.id].estrelas >= 3));
      idx = pendente >= 0 ? pendente : 0;
      montar();
    }).catch((e) => {
      console.error(e);
      if (destruido) return;
      limpar(ctx.container).append(UI.vazio('Não deu para abrir o laboratório', 'Confira a internet e tente de novo.'));
    });

    /* ---------- Tela ---------- */
    function montar() {
      const m = missoes[idx];
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const melhor = prog[m.id] ? prog[m.id].estrelas : 0;
      inicioMissao = Date.now();
      if (animacao) animacao.cancelar();

      telas.status = h('p', { class: 'robo-status', id: 'robo-status', 'aria-live': 'polite' });
      telas.mundo = h('div', { class: 'robo-mundo', id: 'robo-mundo', role: 'img' });
      telas.contador = h('p', { class: 'robo-contador texto-suave' });
      telas.resultado = h('div', { class: 'lab-resultado', 'aria-live': 'polite' });
      // Missão de decisão: mais de um mundo; o mesmo programa precisa entregar em todos (Módulo 2, 2026-10-14)
      mundos = MundoRobo.cenarios(m);
      telas.abas = mundos.length > 1 ? h('div', { class: 'robo-mundos', role: 'tablist', 'aria-label': 'Mundos desta missão' },
        mundos.map((c, i) => h('button', { type: 'button', role: 'tab', class: 'lab-chip', 'aria-selected': String(i === 0), 'aria-controls': 'robo-mundo', text: c.nome, onclick: () => mostrarMundo(i) }))) : null;

      const missaoNav = h('nav', { class: 'lab-missoes', 'aria-label': 'Missões do laboratório' },
        missoes.map((mm, i) => {
          const e = prog[mm.id] ? prog[mm.id].estrelas : 0;
          return h('button', {
            type: 'button', class: `lab-missao ${i === idx ? 'lab-missao--atual' : ''}`, 'aria-current': i === idx ? 'step' : null,
            'aria-label': `Missão ${i + 1}: ${mm.titulo}. ${e ? `${e} de 3 estrelas` : 'ainda não feita'}`,
            onclick: () => { idx = i; montar(); },
          }, h('span', { class: 'lab-missao__n', text: String(i + 1) }), Laboratorios.estrelas(e, false));
        }));

      const velocidadeSel = h('div', { class: 'lab-velocidade', role: 'group', 'aria-label': 'Velocidade da animação' },
        Object.keys(VELOCIDADES).map((v) => h('button', {
          type: 'button', class: `lab-chip ${velocidade === v ? 'lab-chip--ativo' : ''}`, 'aria-pressed': String(velocidade === v),
          text: { lento: 'Devagar', normal: 'Normal', rapido: 'Rápido' }[v],
          onclick: (e) => { velocidade = v; e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => { b.classList.toggle('lab-chip--ativo', b === e.currentTarget); b.setAttribute('aria-pressed', String(b === e.currentTarget)); }); },
        })),
        h('label', { class: 'check check--pequeno' },
          h('input', { type: 'checkbox', checked: passoAPasso, onchange: (e) => { passoAPasso = e.target.checked; } }),
          h('span', { text: 'Passo a passo' })));

      dicasMissao = Laboratorios.dicas(m.dicas || []);

      const trocaModo = h('button', {
        type: 'button', class: 'lab-janela__modo', id: 'robo-modo',
        onclick: () => { modo = modo === 'toque' ? 'codigo' : 'toque'; Laboratorios.guardarModo(modo); montar(); },
      }, icone(modo === 'toque' ? 'i-codigo' : 'i-controle'), modo === 'toque' ? 'Escrever o código' : m.toque && m.toque.modelo ? 'Modo toque (lacunas)' : 'Modo toque (blocos)');

      const area = modo !== 'toque' ? montarCodigo(m, trocaModo) : m.toque && m.toque.modelo ? montarLacunas(m, trocaModo) : montarToque(m, trocaModo);

      // Coluna de apoio: o mundo e os comandos ficam sempre à vista (pedido do usuário, 2026-10-13: a "cola" que o aluno consulta)
      const apoio = h('aside', { class: 'lab__apoio', 'aria-label': 'O mundo do robô e os comandos' },
        Laboratorios.cartao({ id: 'robo-palco', icone: 'i-alvo', titulo: 'O mundo do robô', conteudo: [telas.abas, mundos.length > 1 ? h('p', { class: 'lab-apoio__texto', text: `O mesmo programa precisa funcionar nos ${mundos.length} mundos. Toque num mundo para vê-lo; o Rodar testa todos.` }) : null, telas.mundo, telas.status, telas.contador, velocidadeSel].filter(Boolean) }),
        Laboratorios.cartao({ id: 'robo-comandos', icone: 'i-livro', titulo: 'Comandos do robô', conteudo: Laboratorios.listaComandos(lab.comandos) }));

      limpar(ctx.container).append(h('div', { class: 'lab robo' },
        h('header', { class: 'lab__cabeca' },
          h('div', { class: 'lab__topo' },
            h('p', { class: 'rotulo', text: m.grupo || 'Missão' }),
            h('button', { type: 'button', class: 'botao botao--link botao--pequeno', id: 'lab-como', onclick: () => tutorial(true) }, icone('i-bolha'), 'Como funciona?')),
          h('h2', { class: 'lab__titulo' }, m.titulo, melhor ? Laboratorios.estrelas(melhor) : null),
          h('p', { class: 'lab__enunciado', text: m.enunciado }),
          h('div', { class: 'lab__barra' }, h('span', { class: 'lab__barra-rotulo', text: `Missão ${idx + 1} de ${missoes.length}` }), missaoNav)),
        h('div', { class: 'lab__corpo' },
          apoio,
          h('section', { class: 'lab__bancada', 'aria-label': modo === 'toque' ? 'Blocos de comando' : 'Seu código' },
            area,
            Laboratorios.cartao({ id: 'lab-ajuda', icone: 'i-bolha', titulo: 'Travou?',
              conteudo: [h('p', { class: 'lab-apoio__texto', text: 'Três dicas, cada uma mais perto da resposta. A última vale só 1 estrela.' }), dicasMissao.el] }),
            telas.resultado)),
        h('footer', { class: 'lab__pe' },
          Laboratorios.fazerDeVerdade(lab.fazDeVerdade),
          h('div', { class: 'lab__pe-acoes' },
            h('button', { type: 'button', class: 'botao botao--secundario', id: 'lab-concluir', onclick: concluir }, icone('i-check'), 'Concluir laboratório')))));

      mostrarMundo(0);
      tutorial(false);
    }

    /** Mostra um dos mundos da missão (aba) no estado inicial. */
    function mostrarMundo(i) {
      mundoAtual = i;
      if (telas.abas) telas.abas.querySelectorAll('[role="tab"]').forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.classList.toggle('lab-chip--ativo', k === i); });
      const c = mundos[i];
      desenhar(MundoRobo.ler(c), c);
      telas.status.textContent = `${mundos.length > 1 ? `${c.nome}. ` : ''}${descrever(MundoRobo.ler(c))}`;
    }

    /** Modo toque com lacunas (decisões e laços): o código fica pronto, o aluno escolhe o que vai em cada ___. */
    function montarLacunas(m, trocaModo) {
      const t = m.toque;
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, `${m.id}:toque`);
      const escolhas = Array.isArray(salvo) && salvo.length === t.lacunas.length ? salvo : t.lacunas.map(() => null);
      telas.editor = null;
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', id: 'robo-rodar', onclick: () => rodarLacunas(m, escolhas) }, icone('i-seta-dir'), 'Rodar');
      return Laboratorios.janela({
        arquivo: 'robo.py · lacunas', ferramenta: trocaModo,
        corpo: h('div', { class: 'lab-toque' },
          h('p', { class: 'lab-apoio__texto', text: 'Escolha o que vai em cada lacuna. O Rodar testa o programa em todos os mundos.' }),
          Laboratorios.campoLacunas({ toque: t, escolhas, aoMudar: () => Laboratorios.gravarRascunho(trilha.id, lab.id, `${m.id}:toque`, escolhas) })),
        acoes: [telas.rodar],
      });
    }

    async function rodarLacunas(m, escolhas) {
      if (telas.rodar.disabled) return;
      telas.resultado.replaceChildren();
      const vazia = escolhas.findIndex((e) => e === null);
      if (vazia >= 0) {
        telas.resultado.replaceChildren(h('div', { class: 'lab-erro', role: 'alert' }, h('p', { class: 'lab-erro__traducao', text: `Falta escolher a lacuna ${vazia + 1}.` })));
        return;
      }
      const codigo = Laboratorios.preencher(m.toque, escolhas);
      telas.rodar.disabled = true;
      let maiorPassos = 0;
      for (let i = 0; i < mundos.length; i++) {
        mostrarMundo(i);
        const r = MundoRobo.executar(mundos[i], codigo);
        if (r.naoSuporta) { telas.rodar.disabled = false; finalizar(m, false, { mensagem: 'Esse programa precisa do modo código.' }); return; }
        await animar(mundos[i], r.eventos);
        if (destruido) return;
        const prefixo = mundos.length > 1 ? `No ${mundos[i].nome}: ` : '';
        if (r.erro || !r.entregue) {
          telas.rodar.disabled = false;
          const lacuna = escolhas.findIndex((e, k) => e !== m.toque.lacunas[k].certa);
          const dica = lacuna >= 0 ? ` Confira a lacuna ${lacuna + 1}: ${m.toque.lacunas[lacuna].dica || ''}` : '';
          finalizar(m, false, { mensagem: `${prefixo}${r.erro || 'o robô terminou, mas ainda tem caixa fora do destino.'}${dica}` });
          return;
        }
        maiorPassos = Math.max(maiorPassos, r.eventos.length);
      }
      telas.rodar.disabled = false;
      finalizar(m, true, { linhas: MundoRobo.linhasDeCodigo(codigo), passos: maiorPassos });
    }

    function montarCodigo(m, trocaModo) {
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, m.id);
      let espera = null;
      telas.editor = EditorCodigo.criar({
        valor: typeof salvo === 'string' ? salvo : m.codigoInicial || '',
        rotulo: 'Seu código em Python',
        aoMudar: (v) => { clearTimeout(espera); espera = setTimeout(() => Laboratorios.gravarRascunho(trilha.id, lab.id, m.id, v), 400); },
        aoRodar: () => rodarCodigo(m),
      });
      telas.console = ConsoleLab.criar({ rotulo: 'Saída', vazio: 'Aperte Rodar: o robô anda no mundo e as mensagens aparecem aqui.' });
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', id: 'robo-rodar', onclick: () => rodarCodigo(m) }, icone('i-seta-dir'), 'Rodar');
      telas.rodar.setAttribute('title', 'Rodar o programa (Ctrl+Enter)');
      telas.rodar.setAttribute('aria-keyshortcuts', 'Control+Enter');
      const recomecar = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: async () => {
        if (!(await UI.confirmar({ titulo: 'Voltar ao código inicial?', texto: 'O que você escreveu nesta missão vai ser trocado pelo código do começo.', sim: 'Voltar ao início', humor: 'triste' }))) return;
        telas.editor.definir(m.codigoInicial || '');
      } }, icone('i-revisao'), 'Recomeçar');
      return Laboratorios.janela({ arquivo: 'robo.py', ferramenta: trocaModo, corpo: telas.editor.el, acoes: [telas.rodar, recomecar], atalho: 'Ctrl+Enter roda', saida: telas.console.el });
    }

    function montarToque(m, trocaModo) {
      const cmdsSolucao = MundoRobo.comandosDoCodigo(m.solucao);
      if (!cmdsSolucao) {
        return Laboratorios.janela({ arquivo: 'robo.py · blocos', ferramenta: trocaModo,
          corpo: h('div', { class: 'lab-aviso' }, h('p', { text: 'Esta missão usa laço ou condição e precisa do modo código. No computador fica mais fácil de escrever.' })) });
      }
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, `${m.id}:toque`);
      let programa = Array.isArray(salvo) ? salvo.filter((c) => MundoRobo.COMANDOS.includes(c)) : [];
      const lista = h('ol', { class: 'robo-programa', id: 'robo-programa', 'aria-label': 'Seu programa', 'aria-live': 'polite' });
      const equivalente = h('pre', { class: 'codigo', tabindex: '0', 'aria-label': 'O mesmo programa em Python' }, h('code'));
      const salvar = () => Laboratorios.gravarRascunho(trilha.id, lab.id, `${m.id}:toque`, programa);
      const atualizar = () => {
        lista.replaceChildren(...(programa.length ? programa.map((c, i) => h('li', { class: 'robo-programa__item' },
          h('code', { text: `${c}()` }),
          h('button', { type: 'button', class: 'botao-icone', 'aria-label': `Tirar a linha ${i + 1} (${c})`, onclick: () => { programa.splice(i, 1); salvar(); atualizar(); } }, icone('i-x'))))
          : [h('li', { class: 'robo-programa__vazio texto-suave', text: 'Toque nos comandos abaixo para montar o programa.' })]));
        equivalente.firstChild.textContent = programa.map((c) => `${c}()`).join('\n') || '# (vazio)';
      };
      atualizar();
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', id: 'robo-rodar', onclick: () => rodarToque(m, programa) }, icone('i-seta-dir'), 'Rodar');
      return Laboratorios.janela({
        arquivo: 'robo.py · blocos', ferramenta: trocaModo,
        corpo: h('div', { class: 'lab-toque' },
          lista,
          h('div', { class: 'robo-blocos', role: 'group', 'aria-label': 'Toque num comando para pôr no programa' },
            MundoRobo.COMANDOS.map((c) => h('button', { type: 'button', class: 'robo-bloco', onclick: () => { programa.push(c); salvar(); atualizar(); } }, h('code', { text: `${c}()` })))),
          h('details', { class: 'lab-equivalente' }, h('summary', { text: 'Ver em Python' }), equivalente)),
        acoes: [telas.rodar,
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => { programa.pop(); salvar(); atualizar(); } }, icone('i-voltar'), 'Desfazer'),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => { programa = []; salvar(); atualizar(); } }, icone('i-lixo'), 'Limpar')],
      });
    }

    /* ---------- Mundo ---------- */
    const SETA = { leste: '→', sul: '↓', oeste: '←', norte: '↑' };
    const NOME_DIR = { leste: 'para a direita', sul: 'para baixo', oeste: 'para a esquerda', norte: 'para cima' };
    function desenhar(estado, m) {
      const celulas = [];
      for (let y = 0; y < estado.altura; y++) {
        for (let x = 0; x < estado.largura; x++) {
          const k = MundoRobo.chave(x, y);
          const parede = estado.paredes.has(k) || (m.mapa[y] || '')[x] === undefined;
          const caixas = estado.caixas.get(k) || 0;
          const destino = estado.destinos.has(k);
          const robo = estado.x === x && estado.y === y;
          celulas.push(h('span', { class: `robo-cel ${parede ? 'robo-cel--parede' : ''} ${destino ? 'robo-cel--destino' : ''} ${destino && caixas ? 'robo-cel--entregue' : ''}`.trim() },
            caixas && !robo ? h('span', { class: 'robo-caixa' }) : null,
            robo ? h('span', { class: `robo-robo robo-robo--${estado.dir} ${estado.carga ? 'robo-robo--carga' : ''}`.trim() }, h('span', { class: 'robo-robo__olho' }), h('span', { class: 'robo-robo__seta', text: SETA[estado.dir] })) : null));
        }
      }
      telas.mundo.style.setProperty('--colunas', estado.largura);
      telas.mundo.replaceChildren(...celulas);
      telas.mundo.setAttribute('aria-label', `Grade de ${estado.largura} por ${estado.altura}. ${descrever(estado)}`);
    }
    function descrever(e) {
      const pendentes = [...e.destinos].filter((d) => !(e.caixas.get(d) > 0)).length;
      return `Robô na linha ${e.y + 1}, coluna ${e.x + 1}, virado ${NOME_DIR[e.dir]}${e.carga ? ', carregando uma caixa' : ''}. ${pendentes ? `${UI.plural(pendentes, 'destino espera', 'destinos esperam')} caixa.` : 'Todos os destinos com caixa.'}`;
    }

    /** Anima os eventos; no passo a passo, espera o botão "Próximo passo". */
    function animar(m, eventos) {
      if (animacao) animacao.cancelar();
      let cancelado = false;
      let estado = MundoRobo.ler(m);
      let i = 0;
      let proximoPasso = null;
      const botaoPasso = h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', id: 'robo-passo', onclick: () => proximoPasso && proximoPasso() }, icone('i-seta-dir'), 'Próximo passo');
      if (passoAPasso) telas.contador.after(botaoPasso);
      const promessa = new Promise((resolve) => {
        const passo = () => {
          if (cancelado) return resolve(false);
          if (i >= eventos.length) { botaoPasso.remove(); if (telas.editor) telas.editor.marcarLinha(null); return resolve(true); }
          const ev = eventos[i++];
          estado = MundoRobo.aplicar(estado, ev);
          desenhar(estado, m);
          if (!ev.ok) telas.mundo.querySelector('.robo-robo')?.classList.add('robo-robo--bateu');
          if (telas.editor && ev.linha) telas.editor.marcarLinha(ev.linha);
          telas.contador.textContent = `Passo ${i} de ${eventos.length} · linha ${ev.linha || '?'}: ${ev.acao.replace('bater', 'andar (bateu)')}()`;
          if (i === eventos.length || passoAPasso || i % 4 === 0) telas.status.textContent = descrever(estado);
          if (passoAPasso) proximoPasso = passo;
          else setTimeout(passo, UI.movimentoReduzido ? Math.min(VELOCIDADES[velocidade], 250) : VELOCIDADES[velocidade]);
        };
        passo();
      });
      animacao = { cancelar: () => { cancelado = true; botaoPasso.remove(); } };
      return promessa;
    }

    /* ---------- Rodar ---------- */
    async function rodarCodigo(m) {
      if (!telas.editor || telas.rodar.disabled) return;
      const codigo = telas.editor.valor();
      Laboratorios.gravarRascunho(trilha.id, lab.id, m.id, codigo);
      telas.rodar.disabled = true;
      telas.console.limpar();
      telas.resultado.replaceChildren();
      const info = Executor.info();
      if (!info.pronto) telas.console.escrever('Preparando o Python (só na primeira vez: uns 6 MB)…', 'info');
      // roda o programa em cada mundo da missão, um depois do outro; para no primeiro que não entrega
      let maiorPassos = 0;
      for (let i = 0; i < mundos.length; i++) {
        const c = mundos[i];
        const prefixo = mundos.length > 1 ? `No ${c.nome}: ` : '';
        mostrarMundo(i);
        let r;
        try {
          r = await Executor.rodar(MundoRobo.pedido(c, codigo, fonteRobo), { tempoMs: 6000 });
        } catch (e) {
          console.error(e);
          telas.console.escrever('Não deu para abrir o Python neste navegador. Tente o modo toque ou outro navegador.', 'erro');
          telas.rodar.disabled = false;
          return;
        }
        if (destruido) return;
        telas.console.limpar();
        if (mundos.length > 1) telas.console.escrever(`${c.nome}`, 'info');
        if (r.saida) telas.console.escrever(r.saida);
        await animar(c, r.eventos || []);
        if (destruido) return;
        const passou = r.ok && r.testes.length && r.testes.every((t) => t.passou);
        if (r.erro && r.erro.tipo === 'RoboBateu') {
          telas.rodar.disabled = false;
          telas.console.escrever(r.erro.mensagem, 'erro');
          if (r.erro.linha) telas.editor.marcarLinha(r.erro.linha);
          finalizar(m, false, { mensagem: `${prefixo}${r.erro.mensagem}`, linha: r.erro.linha });
          return;
        }
        if (r.erro) {
          telas.rodar.disabled = false;
          telas.resultado.replaceChildren(Laboratorios.blocoErro(r.erro));
          if (r.erro.linha) telas.editor.marcarLinha(r.erro.linha);
          finalizar(m, false, { silencioso: true });
          return;
        }
        if (!passou) {
          telas.rodar.disabled = false;
          finalizar(m, false, { mensagem: `${prefixo}o robô terminou, mas ainda tem caixa fora do destino (ou ele ainda está carregando uma). Confira o caminho e rode de novo.` });
          return;
        }
        maiorPassos = Math.max(maiorPassos, (r.eventos || []).length);
      }
      telas.rodar.disabled = false;
      finalizar(m, true, { linhas: MundoRobo.linhasDeCodigo(codigo), passos: maiorPassos });
    }

    async function rodarToque(m, programa) {
      if (telas.rodar.disabled) return;
      telas.rodar.disabled = true;
      telas.resultado.replaceChildren();
      mostrarMundo(0);
      const r = MundoRobo.rodar(mundos[0], programa);
      await animar(mundos[0], r.eventos);
      if (destruido) return;
      telas.rodar.disabled = false;
      if (r.erro) finalizar(m, false, { mensagem: r.erro });
      else finalizar(m, r.entregue, { linhas: programa.length, passos: r.eventos.length });
    }

    function finalizar(m, passou, { linhas = 0, passos = 0, mensagem = '', linha = null, silencioso = false } = {}) {
      const t = tentativas.get(m.id) || { missao: m, resolvida: false, estrelas: 0, tempoMs: 0 };
      t.tempoMs = Date.now() - inicioMissao;
      if (!passou) {
        tentativas.set(m.id, t);
        UI.humorMascote(ctx.container, 'triste');
        if (!silencioso) {
          telas.resultado.replaceChildren(h('div', { class: 'lab-erro', role: 'alert' },
            h('p', { class: 'lab-erro__titulo' }, icone('i-alerta'), linha ? `Linha ${linha}` : 'Quase!'),
            h('p', { class: 'lab-erro__traducao', text: mensagem || 'O robô terminou, mas ainda tem caixa fora do destino. Confira o caminho e rode de novo.' })));
        }
        return;
      }
      const usadas = dicasMissao ? dicasMissao.usadas() : 0;
      const qualidade = linhas <= (m.metas.linhas || Infinity) && passos <= (m.metas.passos || Infinity);
      let estrelas = 1;
      if (usadas < (m.dicas || []).length) { estrelas = 2; if (qualidade) estrelas = 3; }
      const { antes, agora } = Laboratorios.registrar(trilha.id, lab.id, m.id, estrelas);
      t.resolvida = true;
      t.estrelas = Math.max(t.estrelas, estrelas);
      tentativas.set(m.id, t);
      UI.humorMascote(ctx.container, 'feliz');
      const falta = estrelas < 3
        ? (estrelas === 1 ? 'Sem a última dica, a missão vale até 3 estrelas.' : `Para a 3ª estrela: até ${m.metas.linhas} linhas e ${m.metas.passos || m.metas.linhas} passos (você usou ${linhas} e ${passos}).`)
        : 'Programa enxuto: dentro da meta de linhas e passos.';
      const proxima = idx < missoes.length - 1;
      const progAgora = Laboratorios.progresso(trilha.id, lab.id);
      const todasDaAula = ctx.opcoes.fase && missoes.every((mm) => progAgora[mm.id] && progAgora[mm.id].estrelas >= 1);
      if (todasDaAula) Laboratorios.marcarAula(trilha.id, lab.id, ctx.opcoes.fase);
      telas.resultado.replaceChildren(h('div', { class: 'lab-sucesso', role: 'status' },
        h('p', { class: 'lab-sucesso__titulo' }, icone('i-check'), 'Mandou bem, Diver! Caixa entregue.'),
        Laboratorios.estrelas(estrelas),
        h('p', { class: 'texto-suave', text: agora > antes ? `${falta} Nova marca: ${agora} de 3.` : falta }),
        h('div', { class: 'acoes-linha' },
          proxima ? h('button', { type: 'button', class: 'botao botao--primario', id: 'robo-proxima', onclick: () => { idx++; montar(); } }, 'Próxima missão', icone('i-seta-dir'))
            : h('button', { type: 'button', class: 'botao botao--primario', id: 'robo-fim', onclick: concluir }, icone('i-check'), todasDaAula ? 'Concluir e seguir para a próxima aula' : 'Concluir laboratório'))));
      const botao = telas.resultado.querySelector('button');
      if (botao) botao.focus({ preventScroll: true });
    }

    function concluir() {
      if (animacao) animacao.cancelar();
      ctx.aoTerminar(Laboratorios.resultado({ trilha, lab, inicio, tentativas: [...tentativas.values()] }));
    }

    function tutorial(forcar) {
      if (typeof Tutorial === 'undefined' || !Tutorial.guiar) return;
      Tutorial.guiar('lab-robo', [
        { desenho: 'diver', titulo: 'Mão na massa!', texto: 'Aqui você programa de verdade. Cada linha é uma ordem para o robô, e ele faz exatamente o que você mandar: nem mais, nem menos.' },
        { alvo: '#robo-mundo', desenho: 'alvo', titulo: 'O mundo do robô', texto: 'O robô é o círculo com a seta (ela mostra para onde ele está virado). Os quadrados amarelos são as caixas, e os pontilhados, os destinos.' },
        { alvo: modo === 'toque' ? '#robo-programa, .lab-lacunas' : '.editor', desenho: 'livro', titulo: modo === 'toque' ? 'Monte o programa' : 'Escreva o programa', texto: modo === 'toque' ? 'Toque nos blocos (ou escolha o que vai em cada lacuna) para montar o programa. No computador, dá para escrever o código em Python.' : 'Uma ordem por linha, como andar() ou pegar(). Os parênteses no fim são obrigatórios.' },
        { alvo: '#robo-comandos', desenho: 'livro', titulo: 'Sua cola', texto: 'Os comandos do robô ficam sempre aqui, à vista. Consulte à vontade enquanto programa.' },
        { alvo: '#robo-rodar', desenho: 'onda', titulo: 'Rode e veja', texto: 'O robô executa linha por linha, e a linha da vez acende. Errou? Sem problema: ajuste e rode de novo.' },
        { alvo: '#lab-dica', desenho: 'lupa', titulo: 'Dicas', texto: 'Travou? Peça uma dica. São três, cada uma mais perto da resposta. A última vale só 1 estrela.' },
      ], { forcar });
    }

    return {
      destruir() {
        destruido = true;
        if (animacao) animacao.cancelar();
      },
    };
  },
});

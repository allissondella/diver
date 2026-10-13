/*
 * jogos/robo-entregador.js — laboratório "Mão na massa" Robô Entregador (Explora Tech, 2026-10-13).
 *
 * O aluno escreve comandos em Python (andar(), virar_esquerda(), virar_direita(), pegar(), soltar())
 * e o robô anda na grade, com a linha em execução acesa. Missões em data/laboratorios/<curso>/robo-entregador.json.
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

      const comandos = h('details', { class: 'lab-comandos' },
        h('summary', { text: 'Comandos do robô' }),
        h('ul', {}, lab.comandos.map((c) => h('li', {}, h('code', { class: 'codigo-linha', text: c.nome }), ` ${c.faz}`))));

      dicasMissao = Laboratorios.dicas(m.dicas || []);

      const trocaModo = h('button', {
        type: 'button', class: 'botao botao--link botao--pequeno', id: 'robo-modo',
        onclick: () => { modo = modo === 'toque' ? 'codigo' : 'toque'; Laboratorios.guardarModo(modo); montar(); },
      }, icone(modo === 'toque' ? 'i-codigo' : 'i-controle'), modo === 'toque' ? 'Escrever o código' : 'Usar blocos (modo toque)');

      const area = modo === 'toque' ? montarToque(m) : montarCodigo(m);

      limpar(ctx.container).append(h('div', { class: 'lab robo' },
        h('header', { class: 'lab__cabeca' },
          h('p', { class: 'rotulo', text: `${lab.nome} · ${m.grupo || 'Missão'} · missão ${idx + 1} de ${missoes.length}` }),
          h('h2', { class: 'lab__titulo' }, m.titulo, melhor ? Laboratorios.estrelas(melhor) : null),
          h('p', { class: 'lab__enunciado', text: m.enunciado }),
          missaoNav),
        h('div', { class: 'lab__corpo' },
          h('section', { class: 'lab__palco', 'aria-label': 'O mundo do robô' }, telas.mundo, telas.status, telas.contador, velocidadeSel),
          h('section', { class: 'lab__bancada', 'aria-label': modo === 'toque' ? 'Blocos de comando' : 'Seu código' },
            area, telas.resultado, dicasMissao.el, comandos, trocaModo)),
        h('footer', { class: 'lab__pe' },
          Laboratorios.fazerDeVerdade(lab.fazDeVerdade),
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--link', id: 'lab-como', onclick: () => tutorial(true) }, icone('i-bolha'), 'Como funciona?'),
            h('button', { type: 'button', class: 'botao botao--secundario', id: 'lab-concluir', onclick: concluir }, icone('i-check'), 'Concluir laboratório')))));

      desenhar(MundoRobo.ler(m), m);
      telas.status.textContent = descrever(MundoRobo.ler(m));
      tutorial(false);
    }

    function montarCodigo(m) {
      const salvo = Laboratorios.lerRascunho(trilha.id, lab.id, m.id);
      let espera = null;
      telas.editor = EditorCodigo.criar({
        valor: typeof salvo === 'string' ? salvo : m.codigoInicial || '',
        rotulo: 'Seu código em Python',
        aoMudar: (v) => { clearTimeout(espera); espera = setTimeout(() => Laboratorios.gravarRascunho(trilha.id, lab.id, m.id, v), 400); },
        aoRodar: () => rodarCodigo(m),
      });
      telas.console = ConsoleLab.criar({ rotulo: 'Console do Python' });
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario', id: 'robo-rodar', onclick: () => rodarCodigo(m) }, icone('i-seta-dir'), 'Rodar');
      return h('div', { class: 'lab-codigo' },
        telas.editor.el,
        h('div', { class: 'acoes-linha' }, telas.rodar,
          h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: async () => {
            if (!(await UI.confirmar({ titulo: 'Voltar ao código inicial?', texto: 'O que você escreveu nesta missão vai ser trocado pelo código do começo.', sim: 'Voltar ao início', humor: 'triste' }))) return;
            telas.editor.definir(m.codigoInicial || '');
          } }, icone('i-revisao'), 'Recomeçar o código')),
        h('p', { class: 'texto-suave lab-atalho', text: 'Atalho: Ctrl+Enter roda o programa.' }),
        telas.console.el);
    }

    function montarToque(m) {
      const cmdsSolucao = MundoRobo.comandosDoCodigo(m.solucao);
      if (!cmdsSolucao) {
        return h('div', { class: 'lab-aviso cartao' }, h('p', { text: 'Esta missão usa laço ou condição e precisa do modo código. No computador fica mais fácil de escrever.' }));
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
      telas.rodar = h('button', { type: 'button', class: 'botao botao--primario', id: 'robo-rodar', onclick: () => rodarToque(m, programa) }, icone('i-seta-dir'), 'Rodar');
      return h('div', { class: 'lab-toque' },
        h('p', { class: 'texto-suave', text: 'Modo toque: monte o programa com os blocos. No computador, dá para escrever o código de verdade.' }),
        lista,
        h('div', { class: 'robo-blocos', role: 'group', 'aria-label': 'Comandos' },
          MundoRobo.COMANDOS.map((c) => h('button', { type: 'button', class: 'robo-bloco', onclick: () => { programa.push(c); salvar(); atualizar(); } }, h('code', { text: `${c}()` })))),
        h('div', { class: 'acoes-linha' }, telas.rodar,
          h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: () => { programa.pop(); salvar(); atualizar(); } }, icone('i-voltar'), 'Desfazer'),
          h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: () => { programa = []; salvar(); atualizar(); } }, icone('i-lixo'), 'Limpar')),
        h('details', { class: 'lab-equivalente' }, h('summary', { text: 'Ver em Python' }), equivalente));
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
      let r;
      try {
        r = await Executor.rodar(MundoRobo.pedido(m, codigo, fonteRobo), { tempoMs: 6000 });
      } catch (e) {
        console.error(e);
        telas.console.escrever('Não deu para abrir o Python neste navegador. Tente o modo toque ou outro navegador.', 'erro');
        telas.rodar.disabled = false;
        return;
      }
      if (destruido) return;
      telas.console.limpar();
      if (r.saida) telas.console.escrever(r.saida);
      await animar(m, r.eventos || []);
      if (destruido) return;
      telas.rodar.disabled = false;
      const passou = r.ok && r.testes.length && r.testes.every((t) => t.passou);
      if (r.erro && r.erro.tipo === 'RoboBateu') {
        telas.console.escrever(r.erro.mensagem, 'erro');
        if (r.erro.linha) telas.editor.marcarLinha(r.erro.linha);
        finalizar(m, false, { mensagem: r.erro.mensagem, linha: r.erro.linha });
      } else if (r.erro) {
        telas.resultado.replaceChildren(Laboratorios.blocoErro(r.erro));
        if (r.erro.linha) telas.editor.marcarLinha(r.erro.linha);
        finalizar(m, false, { silencioso: true });
      } else {
        finalizar(m, passou, { linhas: MundoRobo.linhasDeCodigo(codigo), passos: (r.eventos || []).length });
      }
    }

    async function rodarToque(m, programa) {
      if (telas.rodar.disabled) return;
      telas.rodar.disabled = true;
      telas.resultado.replaceChildren();
      const r = MundoRobo.rodar(m, programa);
      await animar(m, r.eventos);
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
      telas.resultado.replaceChildren(h('div', { class: 'lab-sucesso', role: 'status' },
        h('p', { class: 'lab-sucesso__titulo' }, icone('i-check'), 'Mandou bem, Diver! Caixa entregue.'),
        Laboratorios.estrelas(estrelas),
        h('p', { class: 'texto-suave', text: agora > antes ? `${falta} Nova marca: ${agora} de 3.` : falta }),
        h('div', { class: 'acoes-linha' },
          proxima ? h('button', { type: 'button', class: 'botao botao--primario', id: 'robo-proxima', onclick: () => { idx++; montar(); } }, 'Próxima missão', icone('i-seta-dir'))
            : h('button', { type: 'button', class: 'botao botao--primario', onclick: concluir }, icone('i-check'), 'Concluir laboratório'))));
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
        { alvo: modo === 'toque' ? '#robo-programa' : '.editor', desenho: 'livro', titulo: modo === 'toque' ? 'Monte o programa' : 'Escreva o programa', texto: modo === 'toque' ? 'Toque nos blocos para montar a lista de comandos. No computador, dá para escrever o código em Python.' : 'Uma ordem por linha, como andar() ou pegar(). Os parênteses no fim são obrigatórios.' },
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

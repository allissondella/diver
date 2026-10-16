/*
 * laboratorio/lab-js.js — modelo dos laboratórios "Mão na massa" feitos só em JavaScript, sem Python
 * (Explora Tech, Módulo 8, 2026-10-16): Fábrica de Portas, Sala de Controle e, depois, os de rede e de terminal.
 *
 * Cada laboratório se registra com LabJS.registrar({ id, nome, descricao, icone, duracao, motor }). O motor é a parte
 * que muda (a bancada) e devolve, para cada missão:
 *   motor.criar(m, { lab, aoMudar }) → { el, conferir() → { ok, mensagem, custo }, objetivos?() → [{ texto, ok }],
 *                                       alvo?() → elemento, recomecar() }
 *   motor.meta(m) → { valor, texto } (a 3ª estrela: custo ≤ valor), motor.tutorial → passos do Tutorial.guiar
 * As regras de cada motor ficam num arquivo só de lógica (js/laboratorio/motor-*.js), que o
 * scripts/conferir-laboratorios.mjs também roda no Node.
 * O resto é igual ao dos laboratórios de Python: coluna de apoio sempre à vista (objetivo, cola, dicas),
 * missões da aula, estrelas (1 = resolveu; 2 = sem a última dica; 3 = também dentro da meta) e o Resultado padrão
 * (Laboratorios.resultado: XP só pelas estrelas novas, pela economia).
 */
const LabJS = (() => {
  function registrar({ id, nome, descricao, icone = 'i-controle', duracao = '10-15 min', motor }) {
    Jogos.registrar({
      id, nome, grupo: 'laboratorios', icone, largo: true, duracao, descricao,
      requer: { laboratorios: 1 },
      temConteudo: (cartas) => (cartas.laboratorios || []).includes(id),
      iniciar: (ctx) => iniciar(ctx, id, motor),
    });
  }

  function iniciar(ctx, labId, motor) {
    const { h, icone, limpar } = UI;
    const trilha = ctx.trilha;
    const inicio = Date.now();
    const tentativas = new Map();
    let lab = null;
    let missoes = [];
    let idx = 0;
    let destruido = false;
    let telas = {};
    let bancada = null;
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

    /** O objetivo, sempre à vista: a lista de metas com o que já foi cumprido (ou o alvo que o motor desenha). */
    function atualizarAlvo() {
      if (!telas.alvo || !bancada) return;
      if (bancada.objetivos) {
        telas.alvo.replaceChildren(h('ul', { class: 'lab-objetivos' }, bancada.objetivos().map((o) => h('li', { class: `lab-objetivos__item ${o.ok ? 'lab-objetivos__item--ok' : ''}`.trim() },
          icone(o.ok ? 'i-check' : 'i-alvo'), h('span', { text: o.texto }), h('span', { class: 'visualmente-oculto', text: o.ok ? ' (cumprido)' : ' (ainda não)' })))));
      } else if (bancada.alvo) telas.alvo.replaceChildren(bancada.alvo());
    }

    function montar() {
      const m = missoes[idx];
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const melhor = prog[m.id] ? prog[m.id].estrelas : 0;
      inicioMissao = Date.now();
      telas.resultado = h('div', { class: 'lab-resultado', 'aria-live': 'polite' });
      telas.alvo = h('div', { class: 'lab-alvo__conteudo' });
      bancada = motor.criar(m, { lab, aoMudar: () => { atualizarAlvo(); telas.resultado.replaceChildren(); } });

      const missaoNav = h('nav', { class: 'lab-missoes', 'aria-label': 'Missões do laboratório' },
        missoes.map((mm, i) => {
          const e = prog[mm.id] ? prog[mm.id].estrelas : 0;
          return h('button', {
            type: 'button', class: `lab-missao ${i === idx ? 'lab-missao--atual' : ''}`, 'aria-current': i === idx ? 'step' : null,
            'aria-label': `Missão ${i + 1}: ${mm.titulo}. ${e ? `${e} de 3 estrelas` : 'ainda não feita'}`,
            onclick: () => { idx = i; montar(); },
          }, h('span', { class: 'lab-missao__n', text: String(i + 1) }), Laboratorios.estrelas(e, false));
        }));

      dicasMissao = Laboratorios.dicas(m.dicas || []);
      const meta = motor.meta(m);
      const apoio = h('aside', { class: 'lab__apoio', 'aria-label': 'O objetivo, a cola e as dicas' },
        Laboratorios.cartao({ id: 'lab-alvo', classe: 'lab-alvo', icone: 'i-alvo', titulo: m.tituloObjetivo || 'O objetivo',
          conteudo: [telas.alvo, meta ? h('p', { class: 'lab-apoio__texto', text: `Para 3 estrelas: ${meta.texto}.` }) : null] }),
        Laboratorios.cartao({ id: 'lab-comandos', icone: 'i-livro', titulo: lab.tituloReferencia || 'Cola', conteudo: Laboratorios.listaComandos(lab.referencia) }),
        Laboratorios.cartao({ id: 'lab-ajuda', icone: 'i-bolha', titulo: 'Travou?',
          conteudo: [h('p', { class: 'lab-apoio__texto', text: 'Três dicas, cada uma mais perto da resposta. A última vale só 1 estrela.' }), dicasMissao.el] }));

      const conferirBotao = h('button', { type: 'button', class: 'botao botao--primario', id: 'lab-conferir', onclick: () => conferir(m) }, icone('i-check'), m.textoConferir || 'Conferir');
      const recomecar = h('button', { type: 'button', class: 'botao botao--fantasma', id: 'lab-recomecar', onclick: () => { bancada.recomecar(); atualizarAlvo(); telas.resultado.replaceChildren(); } }, icone('i-revisao'), 'Recomeçar');

      limpar(ctx.container).append(h('div', { class: `lab lab-js lab-js--${labId}` },
        h('header', { class: 'lab__cabeca' },
          h('div', { class: 'lab__topo' },
            h('p', { class: 'rotulo', text: m.grupo || 'Missão' }),
            h('button', { type: 'button', class: 'botao botao--link botao--pequeno', id: 'lab-como', onclick: () => tutorial(true) }, icone('i-bolha'), 'Como funciona?')),
          h('h2', { class: 'lab__titulo' }, m.titulo, melhor ? Laboratorios.estrelas(melhor) : null),
          h('p', { class: 'lab__enunciado' }, UI.marcado(m.enunciado)),
          h('div', { class: 'lab__barra' }, h('span', { class: 'lab__barra-rotulo', text: `Missão ${idx + 1} de ${missoes.length}` }), missaoNav)),
        h('div', { class: 'lab__corpo' },
          apoio,
          h('section', { class: 'lab__bancada', 'aria-label': lab.rotuloBancada || 'Bancada' },
            h('div', { class: 'lab-js__painel' }, bancada.el),
            h('div', { class: 'lab-js__acoes' }, conferirBotao, recomecar),
            telas.resultado)),
        h('footer', { class: 'lab__pe' },
          Laboratorios.fazerDeVerdade(lab.fazDeVerdade),
          h('div', { class: 'lab__pe-acoes' },
            h('button', { type: 'button', class: 'botao botao--secundario', id: 'lab-concluir', onclick: concluir }, icone('i-check'), 'Concluir laboratório')))));
      atualizarAlvo();
      tutorial(false);
    }

    function conferir(m) {
      const r = bancada.conferir();
      atualizarAlvo();
      const t = tentativas.get(m.id) || { missao: m, resolvida: false, estrelas: 0, tempoMs: 0 };
      t.tempoMs = Date.now() - inicioMissao;
      if (!r.ok) {
        tentativas.set(m.id, t);
        UI.humorMascote(ctx.container, 'triste');
        telas.resultado.replaceChildren(h('div', { class: 'lab-erro', role: 'alert' },
          h('p', { class: 'lab-erro__titulo' }, icone('i-alerta'), 'Quase!'),
          h('p', { class: 'lab-erro__traducao', text: r.mensagem })));
        return;
      }
      const usadas = dicasMissao ? dicasMissao.usadas() : 0;
      const meta = motor.meta(m);
      let estrelas = 1;
      if (usadas < (m.dicas || []).length) { estrelas = 2; if (!meta || r.custo <= meta.valor) estrelas = 3; }
      const { antes, agora } = Laboratorios.registrar(trilha.id, lab.id, m.id, estrelas);
      t.resolvida = true;
      t.estrelas = Math.max(t.estrelas, estrelas);
      tentativas.set(m.id, t);
      UI.humorMascote(ctx.container, 'feliz');
      const progAgora = Laboratorios.progresso(trilha.id, lab.id);
      const todasDaAula = ctx.opcoes.fase && missoes.every((mm) => progAgora[mm.id] && progAgora[mm.id].estrelas >= 1);
      if (todasDaAula) Laboratorios.marcarAula(trilha.id, lab.id, ctx.opcoes.fase);
      const falta = estrelas < 3
        ? (estrelas === 1 ? 'Sem a última dica, a missão vale até 3 estrelas.' : `Para a 3ª estrela: ${meta.texto}.`)
        : 'Certinho e enxuto.';
      const proxima = idx < missoes.length - 1;
      telas.resultado.replaceChildren(h('div', { class: 'lab-sucesso', role: 'status' },
        h('p', { class: 'lab-sucesso__titulo' }, icone('i-check'), `Mandou bem, Diver! ${r.mensagem}`),
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
      if (typeof Tutorial === 'undefined' || !Tutorial.guiar || !motor.tutorial) return;
      Tutorial.guiar(`lab-${labId}`, [
        ...motor.tutorial,
        { alvo: '#lab-conferir', desenho: 'onda', titulo: 'Confira', texto: 'Quando achar que está pronto, aperte Conferir. Errou? A tela diz o que ainda não bate.' },
        { alvo: '#lab-ajuda', desenho: 'lupa', titulo: 'Dicas', texto: 'Travou? São três dicas, cada uma mais perto da resposta. A última vale só 1 estrela.' },
      ], { forcar });
    }

    return { destruir() { destruido = true; } };
  }

  return { registrar };
})();

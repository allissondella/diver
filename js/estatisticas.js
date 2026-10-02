/*
 * estatisticas.js — "Minhas Estatísticas" (Você → Minhas Estatísticas) e o mesmo bloco, por pessoa,
 * na tela de acompanhamento do Admin/Professor. Tudo derivado do log de atividade (js/atividade.js):
 * sem tabela nova. Com login, a conta vem da função estatisticas_atividade do banco, que só devolve
 * o que quem pede pode ver (o professor vê só os cursos dele).
 *
 * Visual: números grandes nos totais e barras horizontais de uma cor só, sempre com o valor escrito
 * ao lado (nada depende só da cor). Vazio vira um convite gentil, não uma tela em branco.
 */
const Estatisticas = (() => {
  const { h, icone, limpar, plural } = UI;
  const MODOS = { mergulho: 'Mergulho', simulado: 'Simulado', revisao: 'Revisão', prova: 'Prova final', enviada: 'Prova enviada' };
  const nomeJogo = (id) => (id === 'palavrinha' ? 'Palavrinha' : ((typeof Jogos !== 'undefined' && Jogos.obter(id)) || {}).nome || id);
  const nomeCurso = (id) => (App.trilhas().find((t) => t.id === id) || {}).nome || id;
  const pct = (a, t) => (t ? Math.round((a / t) * 100) : 0);
  const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');
  const nota = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

  /** Cartão com um número grande (o "herói") e o que ele significa. */
  function numero(rotulo, valor, apoio, iconeId) {
    return h('li', { class: 'est-numero' },
      h('span', { class: 'est-numero__rotulo' }, iconeId ? icone(iconeId) : null, rotulo),
      h('strong', { class: 'est-numero__valor', text: valor }),
      apoio ? h('span', { class: 'est-numero__apoio', text: apoio }) : null);
  }

  /** Barras horizontais (uma série, uma cor): nome · barra · valor escrito. */
  function barras(itens, { titulo, descricao }) {
    const max = Math.max(1, ...itens.map((i) => i.valor));
    return h('figure', { class: 'est-barras' },
      h('figcaption', { class: 'visualmente-oculto', text: descricao || titulo }),
      h('ul', { class: 'est-barras__lista' }, itens.map((i) => h('li', { class: 'est-barra', title: i.dica || `${i.nome}: ${i.texto}` },
        h('span', { class: 'est-barra__nome', text: i.nome }),
        h('span', { class: 'est-barra__trilho', 'aria-hidden': 'true' }, h('span', { class: 'est-barra__valor', style: `width:${Math.max(2, (i.valor / max) * 100)}%` })),
        h('span', { class: 'est-barra__texto', text: i.texto })))));
  }

  /** Desenha as estatísticas (objeto do banco ou de Atividade.resumir) dentro de "alvo". */
  function desenhar(alvo, r, { compacto = false } = {}) {
    const q = r.questoes || { total: 0, acertos: 0 };
    const s = r.sessoes || {};
    const jogos = r.jogos || [];
    const partidas = jogos.reduce((t, j) => t + Number(j.partidas || 0), 0);
    const sess = (t) => s[t] || { total: 0, concluidas: 0, media_nota: null, melhor_nota: null, aprovadas: 0 };
    if (!q.total && !partidas && !Object.keys(s).length) {
      alvo.replaceChildren(UI.vazio(compacto
        ? 'Ainda sem atividade registrada. As estatísticas começam a contar a partir de agora.'
        : 'Ainda não tem nada por aqui. Responda umas questões ou jogue uma partida: tudo o que você fizer passa a aparecer nesta página.'));
      return;
    }
    const titulo = (texto) => h(compacto ? 'h4' : 'h2', { class: compacto ? 'est-subtitulo' : 'secao-titulo', text: texto });
    const sim = sess('simulado_concluido');
    const prova = sess('prova_concluida');
    const revisao = sess('revisao_sessao');
    const mergulho = sess('mergulho_sessao');

    const modos = Object.entries(r.questoes_por_modo || {})
      .map(([m, v]) => ({ nome: MODOS[m] || m, valor: Number(v.total), texto: `${fmt(v.total)} · ${pct(v.acertos, v.total)}% de acerto` }))
      .sort((a, b) => b.valor - a.valor);
    const listaJogos = jogos.map((j) => {
      const extra = j.jogo === 'palavrinha'
        ? `${fmt(j.vitorias)} ${Number(j.vitorias) === 1 ? 'vitória' : 'vitórias'}`
        : j.total ? `${pct(j.acertos, j.total)}% de acerto` : '';
      const recorde = j.melhor !== null && j.melhor !== undefined && j.jogo !== 'palavrinha' ? ` · recorde ${fmt(j.melhor)}` : '';
      return { nome: nomeJogo(j.jogo), valor: Number(j.partidas), texto: `${plural(Number(j.partidas), 'partida', 'partidas')}${extra ? ` · ${extra}` : ''}${recorde}` };
    });

    // replaceChildren escreveria "null" na tela: as partes que não existem saem antes
    alvo.replaceChildren(...[
      h('ul', { class: 'est-numeros' },
        numero('Perguntas respondidas', fmt(q.total), q.total ? `${pct(q.acertos, q.total)}% de acerto` : 'nenhuma ainda', 'i-alvo'),
        numero('Jogos jogados', fmt(partidas), partidas ? `${plural(jogos.length, 'jogo diferente', 'jogos diferentes')}` : 'nenhum ainda', 'i-controle'),
        numero('Revisões', fmt(revisao.concluidas), revisao.total > revisao.concluidas ? `+ ${fmt(revisao.total - revisao.concluidas)} interrompidas` : 'sessões completas', 'i-revisao'),
        numero('Simulados', fmt(sim.concluidas), sim.media_nota !== null ? `média ${nota(sim.media_nota)} · melhor ${nota(sim.melhor_nota)}` : 'nenhum com nota ainda', 'i-relogio'),
        numero('Provas finais', fmt(prova.concluidas), prova.concluidas ? `${plural(Number(prova.aprovadas), 'aprovação', 'aprovações')} · melhor ${nota(prova.melhor_nota)}` : 'nenhuma ainda', 'i-trofeu'),
        numero('Dias de estudo', fmt(r.dias_ativos), mergulho.total ? `${plural(Number(mergulho.total), 'mergulho', 'mergulhos')} nas fases` : '', 'i-calendario')),
      modos.length ? titulo('Perguntas por modo') : null,
      modos.length ? barras(modos, { titulo: 'Perguntas por modo', descricao: 'Perguntas respondidas em cada modo, com a porcentagem de acerto.' }) : null,
      listaJogos.length ? titulo('Jogos') : null,
      listaJogos.length ? barras(listaJogos, { titulo: 'Jogos', descricao: 'Partidas por jogo, com acertos ou vitórias.' }) : null,
      r.primeiro ? h('p', { class: 'texto-suave est-rodape', text: `Contando desde ${new Date(r.primeiro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}. O registro de atividade começou em outubro de 2026.` }) : null,
    ].filter(Boolean));
  }

  async function carregar(alvo, opcoes, estilo) {
    alvo.replaceChildren(h('p', { class: 'texto-suave', 'aria-live': 'polite', text: 'Contando suas braçadas…' }));
    try {
      desenhar(alvo, await Atividade.estatisticas(opcoes), estilo);
    } catch (erro) {
      alvo.replaceChildren(h('p', { class: 'texto-erro', text: `Não deu para carregar as estatísticas agora (${erro.message}).` }));
    }
  }

  /** Seletor "Todos os cursos" + cada curso. */
  function seletorCurso(cursos, aoMudar, id) {
    const sel = h('select', { class: 'campo est-filtro', id, 'aria-label': 'Curso' },
      h('option', { value: '', text: 'Todos os cursos' }),
      cursos.map((c) => h('option', { value: c, text: nomeCurso(c) })));
    sel.addEventListener('change', () => aoMudar(sel.value || null));
    return sel;
  }

  /* ---------- Tela "Minhas Estatísticas" ---------- */
  function render(secao) {
    limpar(secao);
    const corpo = h('div', { class: 'est-corpo', 'aria-live': 'polite' });
    const cursos = App.trilhas().map((t) => t.id);
    secao.append(
      UI.cabecalho('Você', 'Minhas Estatísticas', 'Tudo o que você já mergulhou: perguntas, jogos, revisões, simulados e provas.'),
      h('div', { class: 'acoes-linha est-barra-filtro' },
        h('label', { class: 'rotulo-campo', for: 'est-curso', text: 'Mostrar' }),
        seletorCurso(cursos, (c) => carregar(corpo, { cursoId: c }), 'est-curso')),
      corpo);
    carregar(corpo, {});
  }

  /** Bloco para o Admin/Professor, dentro do "Progresso" de uma pessoa. */
  function bloco({ aluno, cursos = [] }) {
    const corpo = h('div', { class: 'est-corpo est-corpo--compacto' });
    const id = `est-curso-${aluno}`;
    const caixa = h('section', { class: 'est-bloco', 'aria-label': 'Estatísticas da pessoa' },
      h('div', { class: 'est-bloco__topo' },
        h('h4', { class: 'est-bloco__titulo' }, icone('i-alvo'), 'Estatísticas'),
        seletorCurso(cursos, (c) => carregar(corpo, { aluno, cursoId: c }, { compacto: true }), id)),
      corpo);
    carregar(corpo, { aluno }, { compacto: true });
    return caixa;
  }

  return { render, bloco, desenhar };
})();

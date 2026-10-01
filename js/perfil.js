/*
 * perfil.js — área "Perfil": nível geral (soma de todas as trilhas), pérolas, sequência,
 * conquistas por trilha e backup dos dados (baixar/restaurar), já que ainda não há login.
 */
const Perfil = (() => {
  const { h, icone, limpar } = UI;

  function totais() {
    const porTrilha = App.trilhas().map((t) => {
      const prog = Progresso.carregar(t.id);
      return {
        trilha: t, prog, nivel: Progresso.nivel(prog.xp),
        conquistas: Object.keys(prog.conquistas).length,
        fases: t.fases.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida).length,
        streak: Progresso.streakVigente(prog),
      };
    });
    const xp = porTrilha.reduce((n, x) => n + x.prog.xp, 0);
    return {
      porTrilha, xp,
      perolas: porTrilha.reduce((n, x) => n + x.prog.perolas, 0),
      respondidas: porTrilha.reduce((n, x) => n + x.prog.stats.respondidas, 0),
      acertos: porTrilha.reduce((n, x) => n + x.prog.stats.acertos, 0),
      melhorStreak: porTrilha.reduce((n, x) => Math.max(n, x.prog.streak.melhor), 0),
      streakAtual: porTrilha.reduce((n, x) => Math.max(n, x.streak), 0),
      conquistas: porTrilha.reduce((n, x) => n + x.conquistas, 0),
      nivel: Progresso.nivel(xp),
    };
  }

  /* ---------- Mascote do topo ---------- */
  /**
   * Easter egg: as setinhas dos lados do mascote passeiam por todas as variações (cada pinguim e
   * cada mergulhador/mergulhadora em cada tom de pele). Nenhum texto explica: quem clica, descobre.
   * A escolha vale na hora, em todas as telas (Mascotes.escolher).
   */
  function mascoteComSetas() {
    const variacoes = Mascotes.variacoes();
    const atual = () => {
      const e = Mascotes.escolhido();
      const i = variacoes.findIndex((v) => v.rosto === e.rosto && (!v.tom || v.tom === e.tom));
      return Math.max(0, i);
    };
    const figura = UI.mascote('perfil-topo__mascote');
    const rotular = () => {
      const e = Mascotes.escolhido();
      figura.setAttribute('role', 'img');
      figura.setAttribute('aria-label', Mascotes.descricao(e.rosto, e.tom));
    };
    const passar = (passo) => {
      const v = variacoes[(atual() + passo + variacoes.length) % variacoes.length];
      Mascotes.escolher(v.rosto, v.tom);
      rotular();
      if (!UI.movimentoReduzido) {
        figura.classList.remove('perfil-troca--pulo');
        void figura.offsetWidth; // reinicia a animação
        figura.classList.add('perfil-troca--pulo');
      }
    };
    const seta = (passo, rotulo, iconeId) => h('button', { type: 'button', class: 'perfil-troca__seta', 'aria-label': rotulo, onclick: () => passar(passo) }, icone(iconeId));
    rotular();
    return h('div', { class: 'perfil-troca' }, seta(-1, 'Mascote anterior', 'i-voltar'), figura, seta(1, 'Próximo mascote', 'i-seta-dir'));
  }

  function render(secao) {
    limpar(secao);
    const t = totais();
    const pct = t.respondidas ? Math.round((t.acertos / t.respondidas) * 100) : 0;
    const inputBackup = h('input', { type: 'file', accept: '.json,application/json', class: 'visualmente-oculto', onchange: restaurar });

    secao.append(
      UI.cabecalho('Você', 'Perfil', 'Seu mergulho somando todas as trilhas.'),
      h('div', { class: 'cartao perfil-topo' },
        mascoteComSetas(),
        h('div', { class: 'perfil-topo__info' },
          h('span', { class: 'status__nivel-num', text: `Nível geral ${t.nivel.numero}` }),
          h('h2', { class: 'perfil-topo__nome', text: t.nivel.nome }),
          h('div', { class: 'barra-xp', role: 'progressbar', 'aria-label': 'XP no nível geral', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(t.nivel.pct) },
            h('div', { class: 'barra-xp__preenchimento', style: `width:${t.nivel.pct}%` })),
          h('p', { class: 'texto-suave', text: t.nivel.max ? `${t.xp} XP. Mestre Diver de verdade.` : `${t.xp} XP no total · faltam ${t.nivel.xpParaProximo - t.nivel.xpNoNivel} para ${t.nivel.proximoNome}` }))),
      h('h2', { class: 'secao-titulo', text: 'Seus números' }),
      h('ul', { class: 'resumo-numeros' },
        h('li', { class: 'destaque-perola' }, h('strong', { text: String(t.perolas) }), h('span', { text: 'pérolas' })),
        h('li', {}, h('strong', { text: String(t.streakAtual) }), h('span', { text: `dias seguidos (recorde ${t.melhorStreak})` })),
        h('li', {}, h('strong', { text: `${pct}%` }), h('span', { text: `de acerto em ${t.respondidas} respostas` })),
        h('li', { class: 'destaque-xp' }, h('strong', { text: String(t.conquistas) }), h('span', { text: 'conquistas' }))),
      h('div', { class: 'cartao' },
        h('h3', { class: 'cartao__titulo', text: 'Por curso' }),
        h('div', { class: 'tabela-rolagem' },
          h('table', { class: 'tabela tabela--perfil' },
            h('thead', {}, h('tr', {}, ['Curso', 'Nível', 'XP', 'Pérolas', 'Fases', 'Conquistas'].map((c) => h('th', { scope: 'col', text: c })))),
            h('tbody', {}, t.porTrilha.map((x) => h('tr', {},
              h('th', { scope: 'row' }, h('button', { type: 'button', class: 'botao--link link-tabela', onclick: () => App.abrirTrilha(x.trilha.id), text: x.trilha.nome })),
              h('td', { 'data-rotulo': 'Nível', text: `${x.nivel.numero} · ${x.nivel.nome}` }),
              h('td', { 'data-rotulo': 'XP', text: String(x.prog.xp) }),
              h('td', { 'data-rotulo': 'Pérolas', text: String(x.prog.perolas) }),
              h('td', { 'data-rotulo': 'Fases', text: `${x.fases}/${x.trilha.fases.length}` }),
              h('td', { 'data-rotulo': 'Conquistas', text: `${x.conquistas}/${Conquistas.LISTA.length}` }))))))),
      h('h2', { class: 'secao-titulo', text: 'Mais opções' }),
      h('div', { class: 'modos' },
        h('div', { class: 'cartao modo' },
          h('div', { class: 'modo__cabeca' },
            h('span', { class: 'modo__icone modo__icone--simulado' }, icone('i-perola')),
            h('div', {}, h('h3', { text: 'Loja de pérolas' }), h('p', { text: 'Oxigênio extra, congelar a sequência, Dias de Descanso e itens para o Diver. Chega na Semana 9 do roadmap.' }))),
          h('span', { class: 'chip', text: 'Em breve' })),
        h('div', { class: 'cartao modo' },
          h('div', { class: 'modo__cabeca' },
            h('span', { class: 'modo__icone modo__icone--revisao' }, icone('i-download')),
            h('div', {}, h('h3', { text: 'Backup dos seus dados' }), h('p', { text: 'Enquanto não tem login, seu progresso mora neste navegador. Baixe um backup para guardar ou levar para outro aparelho. (PDFs não entram no backup.)' }))),
          h('div', { class: 'modo__acoes' },
            h('button', { type: 'button', class: 'botao botao--secundario', onclick: baixar }, icone('i-download'), 'Baixar backup'),
            h('label', { class: 'botao botao--fantasma' }, icone('i-upload'), 'Restaurar', inputBackup))),
        h('div', { class: 'cartao modo' },
          h('div', { class: 'modo__cabeca' },
            h('span', { class: 'modo__icone modo__icone--upload' }, icone('i-bolha')),
            h('div', {}, h('h3', { text: 'Tutoriais' }), h('p', { text: 'Na primeira visita a cada página, o Diver mostra onde fica cada coisa. Quer ver tudo de novo?' }))),
          h('div', { class: 'modo__acoes' },
            h('button', { type: 'button', class: 'botao botao--secundario', onclick: () => {
              Tutorial.zerar();
              UI.toast('Tutoriais zerados', 'Eles aparecem de novo quando você entrar em cada página.', 'i-bolha');
            } }, icone('i-revisao'), 'Rever todos os tutoriais')))));
  }

  function baixar() {
    const dados = {};
    Dados.chavesDiver().forEach((k) => (dados[k] = Dados.ler(k, null)));
    UI.baixarArquivo(`diver-backup-${UI.dataLocal()}.json`, JSON.stringify({ app: 'diver', versao: 1, criadoEm: new Date().toISOString(), dados }, null, 2));
  }

  async function restaurar(e) {
    const arq = e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    try {
      const conteudo = JSON.parse(await arq.text());
      if (conteudo.app !== 'diver' || typeof conteudo.dados !== 'object') throw new Error('não é um backup do Diver');
      if (!window.confirm('Restaurar este backup? Os dados atuais deste navegador serão substituídos pelos do arquivo.')) return;
      Object.entries(conteudo.dados).forEach(([k, v]) => {
        if (k.startsWith('diver:')) Dados.gravar(k, v);
      });
      UI.toast('Backup restaurado', 'Recarregando…', 'i-check');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      UI.toast('Arquivo inválido', 'Esse arquivo não é um backup do Diver.', 'i-x');
    }
  }

  return { render, totais };
})();

/*
 * Palavrinha, Palavrinha x2 e Palavrinha x4 — descubra a palavra-chave do curso em poucas tentativas.
 * Cada palpite pinta as letras: lugar certo (turquesa), está na palavra mas em outro lugar (amarelo)
 * ou não está (apagada). No x2 e no x4, o mesmo palpite vale para 2 ou 4 tabuleiros ao mesmo tempo.
 *
 * - Palavras: as da Forca (bloco "palavras" + respostas curtas), só as simples de 4 a 8 letras
 *   (Cartas.derivar → cartas.palavrinha). O tabuleiro se ajusta ao tamanho da palavra.
 * - Palavra do dia: uma por curso, por dia e por variante, sorteada pela data (como o Desafio do Dia):
 *   todo mundo do curso recebe a mesma. No x1, um ciclo embaralhado não repete palavra até usar todas.
 *   Depois dela, o Treino livre é à vontade. Os dois contam nas estatísticas, no XP e no Ranking Diver
 *   do curso (que zera todo mês); pérolas, só a palavra do dia.
 * - Palpite: qualquer sequência de letras do tamanho certo (sem dicionário). Acento não importa.
 * - Dica: o tema aparece desde o início; a dica completa, depois da 3ª tentativa sem acertar.
 * - Estatísticas e ranking vêm do log de atividade (js/atividade.js), sem tabela nova.
 */
const Palavrinha = (() => {
  const { h, icone, plural } = UI;
  const VARIANTES = {
    x1: { chave: 'x1', id: 'palavrinha', nome: 'Palavrinha', tabuleiros: 1, tentativas: 6, minimo: 30,
      descricao: 'Descubra a palavra-chave do curso em até 6 tentativas. Uma nova por dia.' },
    x2: { chave: 'x2', id: 'palavrinha-x2', nome: 'Palavrinha x2', tabuleiros: 2, tentativas: 7, minimo: 40,
      descricao: 'Duas palavras ao mesmo tempo, 7 tentativas: cada palpite vale para as duas.' },
    x4: { chave: 'x4', id: 'palavrinha-x4', nome: 'Palavrinha x4', tabuleiros: 4, tentativas: 9, minimo: 40,
      descricao: 'Quatro palavras de uma vez, 9 tentativas. Para quem gosta de desafio.' },
  };
  const MIN_MESMO_TAMANHO = 10; // x2 e x4: as palavras do dia têm o mesmo tamanho
  const DICA_DEPOIS = 3; // tentativas sem acertar até a dica completa aparecer
  const CHAVE = 'diver:v1:palavrinha'; // partida do dia em andamento (vai junto com o progresso na nuvem)
  const CHAVE_AVISO = 'diver:v1:palavrinha-aviso-ranking'; // já viu o aviso do Ranking Diver (vale para todos os cursos)
  const TECLADO = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const NOME_STATUS = { certa: 'no lugar certo', lugar: 'em outro lugar', fora: 'não está na palavra' };

  /* ---------- Sorteio determinístico ---------- */
  function hash(texto) {
    let x = 2166136261;
    for (let i = 0; i < texto.length; i++) {
      x ^= texto.charCodeAt(i);
      x = Math.imul(x, 16777619) >>> 0;
    }
    return x >>> 0;
  }
  function aleatorio(semente) { // mulberry32
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function embaralharCom(lista, semente) {
    const r = aleatorio(semente);
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** "2026-10-02" → dias desde 1º de janeiro de 2026 (data local, sem fuso). */
  function diaNumero(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
  }
  const porPalavra = (a, b) => a.palavra.localeCompare(b.palavra);

  /** Grupos por tamanho (só os com pelo menos `minimo` palavras), do menor para o maior. */
  function grupos(lista, minimo) {
    const mapa = new Map();
    lista.forEach((p) => mapa.set(p.palavra.length, [...(mapa.get(p.palavra.length) || []), p]));
    return [...mapa.entries()].filter(([, l]) => l.length >= minimo).sort((a, b) => a[0] - b[0])
      .map(([tamanho, l]) => ({ tamanho, lista: [...l].sort(porPalavra) }));
  }

  function temConteudo(v, cartas) {
    const lista = (cartas && cartas.palavrinha) || [];
    if (lista.length < v.minimo) return false;
    return v.tabuleiros === 1 || grupos(lista, MIN_MESMO_TAMANHO).length > 0;
  }

  /** As palavras do dia (iguais para todo o curso). */
  function palavrasDoDia(v, trilhaId, lista, data) {
    const d = diaNumero(data);
    if (v.tabuleiros === 1) {
      const base = [...lista].sort(porPalavra);
      const n = base.length;
      const ciclo = Math.floor(d / n);
      return [embaralharCom(base, hash(`${trilhaId}|x1|${ciclo}`))[((d % n) + n) % n]];
    }
    const gs = grupos(lista, MIN_MESMO_TAMANHO);
    const g = gs[hash(`${trilhaId}|${v.chave}|${data}`) % gs.length];
    return embaralharCom(g.lista, hash(`${trilhaId}|${v.chave}|${data}|palavras`)).slice(0, v.tabuleiros);
  }

  /** Treino livre: sorteio de verdade (não conta no ranking). */
  function palavrasTreino(v, lista, evitar = []) {
    const fora = new Set(evitar);
    const livres = lista.filter((p) => !fora.has(p.id));
    const base = livres.length >= v.tabuleiros ? livres : lista;
    if (v.tabuleiros === 1) return [UI.sortear(base)];
    const gs = grupos(base, v.tabuleiros);
    const g = UI.sortear(gs.length ? gs : grupos(lista, v.tabuleiros));
    return UI.embaralhar(g.lista).slice(0, v.tabuleiros);
  }

  /** Cores de um palpite (regra clássica: letras repetidas contam só até onde existem na palavra). */
  function avaliar(palpite, alvo) {
    const r = Array(alvo.length).fill('fora');
    const sobra = {};
    for (let i = 0; i < alvo.length; i++) {
      if (palpite[i] === alvo[i]) r[i] = 'certa';
      else sobra[alvo[i]] = (sobra[alvo[i]] || 0) + 1;
    }
    for (let i = 0; i < alvo.length; i++) {
      if (r[i] === 'certa') continue;
      if (sobra[palpite[i]] > 0) {
        r[i] = 'lugar';
        sobra[palpite[i]]--;
      }
    }
    return r;
  }

  /* ---------- Estatísticas pessoais: todas as partidas da variante (palavra do dia e treino) ---------- */
  function estatisticas(eventos, chaveVariante) {
    const v = Object.values(VARIANTES).find((x) => x.chave === chaveVariante);
    const partidas = eventos
      .filter((e) => e.detalhes && e.detalhes.jogo === 'palavrinha' && e.detalhes.variante === chaveVariante)
      .sort((a, b) => String(a.criado_em).localeCompare(String(b.criado_em)));
    const distribuicao = Array(v.tentativas).fill(0);
    let vitorias = 0;
    let atual = 0;
    let melhor = 0;
    partidas.forEach((e) => {
      const d = e.detalhes;
      if (d.venceu === true) {
        vitorias++;
        const t = Number(d.tentativas);
        if (t >= 1 && t <= v.tentativas) distribuicao[t - 1]++;
        atual++; // sequência = vitórias seguidas; uma derrota zera
      } else atual = 0;
      melhor = Math.max(melhor, atual);
    });
    return { partidas: partidas.length, vitorias, pct: partidas.length ? Math.round((vitorias / partidas.length) * 100) : 0, atual, melhor, distribuicao };
  }

  /* ---------- Partida do dia guardada (retoma de onde parou, em qualquer aparelho) ---------- */
  function lerEstado(trilhaId, chaveVariante) {
    const tudo = Dados.ler(CHAVE, {});
    return (tudo[trilhaId] && tudo[trilhaId][chaveVariante]) || null;
  }
  function gravarEstado(trilhaId, chaveVariante, valor) {
    const tudo = Dados.ler(CHAVE, {});
    tudo[trilhaId] = { ...(tudo[trilhaId] || {}), [chaveVariante]: valor };
    Dados.gravar(CHAVE, tudo);
  }

  /* ---------- Peças de tela reaproveitadas ---------- */
  function painelEstatisticas(alvo, ctx, v, extra = null) {
    alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'Contando suas partidas…' }));
    Atividade.listar({ tipo: 'jogo_concluido', cursoId: ctx.trilha.id, jogo: 'palavrinha' })
      .then((eventos) => {
        const s = estatisticas(extra ? eventos.concat(extra) : eventos, v.chave);
        const max = Math.max(1, ...s.distribuicao);
        alvo.replaceChildren(
          h('ul', { class: 'pal-numeros' },
            [['Partidas', s.partidas], ['% de vitórias', `${s.pct}%`], ['Sequência atual', s.atual], ['Melhor sequência', s.melhor]]
              .map(([r, n]) => h('li', {}, h('strong', { text: String(n) }), h('span', { text: r })))),
          h('figure', { class: 'pal-dist' },
            h('figcaption', { class: 'pal-dist__titulo', text: 'Acertou em quantas tentativas' }),
            h('ol', { class: 'pal-dist__lista' }, s.distribuicao.map((n, i) => h('li', { class: 'pal-dist__linha', title: `${plural(n, 'vitória', 'vitórias')} na ${i + 1}ª tentativa` },
              h('span', { class: 'pal-dist__num', text: String(i + 1) }),
              h('span', { class: 'pal-dist__trilho', 'aria-hidden': 'true' }, h('span', { class: 'pal-dist__barra', style: `width:${n ? Math.max(6, (n / max) * 100) : 0}%` })),
              h('span', { class: 'pal-dist__valor', text: String(n) }))))));
      })
      .catch(() => alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'Não deu para carregar suas estatísticas agora.' })));
  }

  /** No ranking global: o curso em que a pessoa mais pontuou e, se jogou em outros, quantos. */
  const cursoDaLinha = (l) => `${App.nomeCurso(l.curso_id)}${Number(l.cursos) > 1 ? ` + ${plural(Number(l.cursos) - 1, 'curso', 'cursos')}` : ''}`;

  /**
   * Ranking Diver: "Este curso" (quem faz o mesmo curso) ou "Todos os cursos" (uma linha por pessoa,
   * com a soma dos pontos de todos os cursos), no mês ou no geral.
   */
  function painelRanking(alvo, ctx, v) {
    if (!Atividade.naNuvem()) {
      alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'O ranking junta os alunos do curso e de todos os cursos: ele aparece quando você entra com a sua conta.' }));
      return;
    }
    const escolha = { escopo: 'curso', periodo: 'mes' };
    const lista = h('div', { class: 'pal-ranking__lista', 'aria-live': 'polite' });
    const segmentado = (rotulo, campo, opcoes) => {
      const grupo = h('div', { class: 'segmentado', role: 'group', 'aria-label': rotulo },
        opcoes.map(([k, nome]) => h('button', {
          type: 'button', 'aria-pressed': String(k === escolha[campo]), 'data-valor': k, text: nome,
          onclick: (e) => {
            escolha[campo] = k;
            grupo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
            carregar();
          },
        })));
      return grupo;
    };
    const filtros = h('div', { class: 'pal-ranking__filtros' },
      segmentado('Quem entra no ranking', 'escopo', [['curso', 'Este curso'], ['global', 'Todos os cursos']]),
      segmentado('Período do ranking', 'periodo', [['mes', 'Este mês'], ['geral', 'Geral']]));

    async function carregar() {
      const { escopo, periodo } = escolha;
      lista.replaceChildren(h('p', { class: 'texto-suave', text: 'Buscando o placar…' }));
      try {
        await Atividade.enviar();
        const linhas = (escopo === 'global'
          ? await Nuvem.rpc('ranking_palavrinha_todos', { p_variante: v.chave, p_periodo: periodo })
          : await Nuvem.rpc('ranking_palavrinha', { p_curso: ctx.trilha.id, p_variante: v.chave, p_periodo: periodo })) || [];
        if (escolha.escopo !== escopo || escolha.periodo !== periodo) return; // trocou de filtro no meio da busca
        if (!linhas.length) {
          lista.replaceChildren(h('p', { class: 'texto-suave', text: 'Ninguém pontuou ainda neste período. Que tal abrir o placar?' }));
          return;
        }
        const top = linhas.slice(0, 10);
        const eu = linhas.find((l) => l.sou_eu);
        if (eu && !top.includes(eu)) top.push(eu);
        lista.replaceChildren(h('ol', { class: `pal-ranking__itens ${escopo === 'global' ? 'pal-ranking__itens--global' : ''}`.trim() }, top.map((l) => h('li', { class: `pal-ranking__item ${l.sou_eu ? 'pal-ranking__item--eu' : ''}`.trim() },
          h('span', { class: 'pal-ranking__pos', text: `${l.posicao}º` }),
          h('span', { class: 'pal-ranking__quem' },
            h('span', { class: 'pal-ranking__nome', text: l.sou_eu ? `${l.nome} (você)` : l.nome }),
            escopo === 'global' ? h('span', { class: 'pal-ranking__curso', text: cursoDaLinha(l) }) : null),
          h('span', { class: 'pal-ranking__pontos', text: `${l.pontos} pts` }),
          h('span', { class: 'pal-ranking__extra', title: 'vitórias / partidas', text: `${l.vitorias}/${l.partidas}` })))),
          h('p', { class: 'texto-suave pal-ranking__nota', text: escopo === 'global'
            ? 'Todos os cursos juntos: cada pessoa aparece uma vez, com a soma dos pontos de todos os cursos (embaixo do nome, o curso em que mais pontuou). Quanto menos tentativas, mais pontos; o placar do mês zera no dia 1º.'
            : 'Pontos por vitória: quanto menos tentativas, mais pontos. Vale a palavra do dia e o Treino livre; o placar do mês zera no dia 1º.' }));
      } catch (e) {
        lista.replaceChildren(h('p', { class: 'texto-suave', text: 'Não deu para carregar o ranking agora.' }));
      }
    }
    alvo.replaceChildren(filtros, lista);
    carregar();
  }

  const dataBonita = (iso) => UI.paraData(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

  /* ---------- O jogo ---------- */
  function iniciar(v, ctx) {
    const lista = ctx.cartas.palavrinha || [];
    const porId = new Map(lista.map((p) => [p.id, p]));
    const hoje = UI.dataLocal();
    let desligar = null;
    let aoRedimensionar = null;

    /* Tela de abertura: palavra do dia, treino, estatísticas e ranking */
    function abertura() {
      if (desligar) desligar();
      desligar = null;
      const salvo = lerEstado(ctx.trilha.id, v.chave);
      const doDia = salvo && salvo.data === hoje ? salvo : null;
      const ids = palavrasDoDia(v, ctx.trilha.id, lista, hoje).map((p) => p.id);
      const acoes = h('div', { class: 'acoes-linha pal-acoes' });
      let status;
      if (doDia && doDia.fim && !doDia.registrado) {
        status = h('p', { class: 'pal-status', text: 'Sua partida de hoje terminou, mas os pontos ainda não entraram.' });
        acoes.append(h('button', { type: 'button', class: 'botao botao--primario', onclick: () => jogar({ diaria: true, retomar: doDia }) }, 'Ver o resultado e pegar os pontos'));
      } else if (doDia && doDia.fim) {
        status = h('p', { class: 'pal-status' }, doDia.venceu
          ? `Palavra do dia resolvida em ${plural(doDia.palpites.length, 'tentativa', 'tentativas')}. Volte amanhã para a próxima!`
          : 'A palavra do dia escapou desta vez. Amanhã tem outra.');
        acoes.append(h('button', { type: 'button', class: 'botao botao--primario', onclick: () => jogar({ diaria: false }) }, icone('i-raio'), 'Treino livre'));
      } else {
        status = h('p', { class: 'pal-status', text: doDia ? 'Você começou a palavra de hoje: continue de onde parou.' : `${plural(v.tabuleiros, 'palavra', 'palavras')} de ${porId.get(ids[0]).palavra.length} letras esperando por você.` });
        acoes.append(
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => jogar({ diaria: true, retomar: doDia }) }, doDia ? 'Continuar a palavra do dia' : 'Jogar a palavra do dia'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => jogar({ diaria: false }) }, icone('i-raio'), 'Treino livre'));
      }
      const estat = h('div', { class: 'pal-estatisticas' });
      const ranking = h('div', { class: 'pal-ranking' });
      const cartaoRanking = h('section', { class: 'cartao pal-cartao', id: 'pal-ranking', 'aria-labelledby': 'pal-ranking-titulo' },
        h('h3', { class: 'cartao__titulo', id: 'pal-ranking-titulo', tabindex: '-1', text: 'Ranking Diver' }), ranking);
      ctx.container.replaceChildren(h('div', { class: 'pal pal-abertura' },
        avisoRanking(cartaoRanking),
        h('section', { class: 'cartao pal-cartao' },
          h('span', { class: 'rotulo', text: `Palavra do dia · ${dataBonita(hoje)}` }),
          h('h2', { class: 'pal-titulo', text: v.nome }),
          status, acoes,
          h('details', { class: 'pal-como' },
            h('summary', {}, 'Como jogar'),
            h('p', {}, `Digite uma palavra de mesmo tamanho e confirme. As letras mudam de cor: `),
            h('ul', { class: 'pal-legenda' },
              ['certa', 'lugar', 'fora'].map((s, i) => h('li', {}, h('span', { class: `pal-letra pal-letra--${s}`, 'aria-hidden': 'true', text: 'ABC'[i] }), h('span', { text: { certa: 'Lugar certo', lugar: 'Está na palavra, em outro lugar', fora: 'Não está na palavra' }[s] })))),
            h('p', {}, `Você tem ${v.tentativas} tentativas${v.tabuleiros > 1 ? `, e cada palpite vale para os ${v.tabuleiros} tabuleiros` : ''}. O tema aparece desde o começo; a dica completa, depois da ${DICA_DEPOIS}ª tentativa. Acento não importa.`),
            h('p', {}, 'A palavra do dia e o Treino livre valem XP, estatísticas e pontos no Ranking Diver (que zera todo mês). Pérolas, só na palavra do dia.'))),
        h('section', { class: 'cartao pal-cartao' }, h('h3', { class: 'cartao__titulo', text: 'Suas estatísticas' }), estat),
        cartaoRanking));
      painelEstatisticas(estat, ctx, v);
      painelRanking(ranking, ctx, v);
      const primeiro = acoes.querySelector('button');
      if (primeiro) primeiro.focus({ preventScroll: true });
    }

    /**
     * Na primeira vez que a pessoa abre a Palavrinha: o que é o Ranking Diver e onde ele fica.
     * Some depois de "Entendi" ou "Ver o ranking" (fica guardado na conta, em qualquer aparelho).
     */
    function avisoRanking(cartaoRanking) {
      if (Dados.ler(CHAVE_AVISO, false)) return null;
      const fechar = () => {
        Dados.gravar(CHAVE_AVISO, true);
        aviso.remove();
      };
      const aviso = h('section', { class: 'cartao pal-aviso', role: 'note', 'aria-labelledby': 'pal-aviso-titulo' },
        UI.mascote('pal-aviso__mascote'),
        h('div', { class: 'pal-aviso__texto' },
          h('span', { class: 'rotulo', text: 'Novidade' }),
          h('h3', { class: 'pal-aviso__titulo', id: 'pal-aviso-titulo' }, icone('i-trofeu'), 'Ranking Diver da Palavrinha'),
          h('p', {}, `Cada palavra que você acerta, na palavra do dia ou no Treino livre, vale pontos: quanto menos tentativas, mais pontos (de primeira, ${v.tentativas} pontos). Tem o ranking do seu curso e o de todos os cursos juntos, e o placar do mês zera todo dia 1º.`),
          h('p', {}, Atividade.naNuvem()
            ? 'Para ver o placar: Sala de Jogos → Palavrinha → role até o "Ranking Diver", aqui embaixo, e escolha "Este curso" ou "Todos os cursos" (e "Este mês" ou "Geral").'
            : 'O placar aparece aqui embaixo, no "Ranking Diver", quando você entra com a sua conta (Sala de Jogos → Palavrinha).'),
          h('div', { class: 'acoes-linha pal-acoes' },
            h('button', { type: 'button', class: 'botao botao--primario', onclick: () => {
              fechar();
              cartaoRanking.scrollIntoView({ behavior: UI.movimentoReduzido ? 'auto' : 'smooth', block: 'start' });
              cartaoRanking.querySelector('#pal-ranking-titulo').focus({ preventScroll: true });
            } }, icone('i-trofeu'), 'Ver o ranking'),
            h('button', { type: 'button', class: 'botao botao--fantasma', onclick: fechar }, 'Entendi'))));
      return aviso;
    }

    /* A partida */
    function jogar({ diaria, retomar = null }) {
      const palavras = retomar
        ? retomar.ids.map((id) => porId.get(id)).filter(Boolean)
        : diaria ? palavrasDoDia(v, ctx.trilha.id, lista, hoje) : palavrasTreino(v, lista, palavrasDoDia(v, ctx.trilha.id, lista, hoje).map((p) => p.id));
      if (palavras.length !== v.tabuleiros) return abertura(); // as palavras do curso mudaram: recomeça
      const tamanho = palavras[0].palavra.length;
      const inicio = Date.now();
      const palpites = retomar ? [...retomar.palpites] : [];
      let atual = '';
      let fim = false;

      const resolvidoEm = () => palavras.map((p) => {
        const i = palpites.indexOf(p.palavra);
        return i >= 0 ? i + 1 : null;
      });
      const venceu = () => resolvidoEm().every((x) => x !== null);
      const salvar = (extra = {}) => {
        if (diaria) gravarEstado(ctx.trilha.id, v.chave, { data: hoje, ids: palavras.map((p) => p.id), palpites, fim, venceu: fim && venceu(), registrado: false, ...extra });
      };

      const raiz = h('div', { class: `pal pal--x${v.tabuleiros}`, style: `--letras:${tamanho}` });
      const hud = h('div', { class: 'jogo-hud' },
        h('span', { text: diaria ? `Palavra do dia · ${dataBonita(hoje)}` : 'Treino livre' }),
        h('span', { class: 'pal-hud__tentativas' }));
      const tabuleiros = h('div', { class: 'pal-tabuleiros' });
      const msg = h('p', { class: 'pal-msg', 'aria-live': 'polite' }); // avisos curtos, visíveis
      const anuncio = h('p', { class: 'visualmente-oculto', 'aria-live': 'polite' }); // a leitura completa de cada palpite, só para leitor de tela
      const teclado = h('div', { class: 'pal-teclado', role: 'group', 'aria-label': 'Teclado' });
      raiz.append(hud, tabuleiros, msg, anuncio, teclado);
      ctx.container.replaceChildren(raiz);

      TECLADO.forEach((linha, n) => {
        const fila = h('div', { class: 'pal-teclado__linha' });
        if (n === 2) fila.append(h('button', { type: 'button', class: 'pal-tecla pal-tecla--larga', onclick: confirmar, 'aria-label': 'Confirmar palpite' }, 'Enter'));
        linha.split('').forEach((l) => fila.append(h('button', { type: 'button', class: 'pal-tecla', 'data-l': l, onclick: () => digitar(l) },
          h('span', { class: 'pal-tecla__letra', text: l }),
          v.tabuleiros > 1 ? h('span', { class: 'pal-tecla__marcas', 'aria-hidden': 'true' }, palavras.map(() => h('span', { class: 'pal-tecla__marca' }))) : null)));
        if (n === 2) fila.append(h('button', { type: 'button', class: 'pal-tecla pal-tecla--larga', onclick: apagar, 'aria-label': 'Apagar letra' }, '⌫'));
        teclado.append(fila);
      });

      function desenhar() {
        const ok = resolvidoEm();
        tabuleiros.replaceChildren(...palavras.map((p, b) => {
          const linhas = [];
          for (let t = 0; t < v.tentativas; t++) {
            const palpite = palpites[t];
            const resolvidoAntes = ok[b] !== null && t >= ok[b];
            let letras;
            let rotulo;
            if (palpite && !resolvidoAntes) {
              const cores = avaliar(palpite, p.palavra);
              letras = palpite.split('').map((l, i) => h('span', { class: `pal-letra pal-letra--${cores[i]}`, text: l }));
              rotulo = `Tentativa ${t + 1}: ${palpite.split('').map((l, i) => `${l} ${NOME_STATUS[cores[i]]}`).join(', ')}`;
            } else if (t === palpites.length && !fim && ok[b] === null) {
              letras = Array.from({ length: tamanho }, (_, i) => h('span', { class: `pal-letra pal-letra--digitando ${i === atual.length ? 'pal-letra--cursor' : ''}`.trim(), text: atual[i] || '' }));
              rotulo = `Tentativa ${t + 1}, digitando: ${atual || 'vazia'}`;
            } else {
              letras = Array.from({ length: tamanho }, () => h('span', { class: 'pal-letra' }));
              rotulo = null;
            }
            linhas.push(h('div', { class: 'pal-linha', role: rotulo ? 'img' : null, 'aria-label': rotulo, 'aria-hidden': rotulo ? null : 'true' }, letras));
          }
          const erros = palpites.length;
          const mostrarDica = ok[b] === null && erros >= DICA_DEPOIS && !fim;
          return h('section', { class: `pal-tabuleiro ${ok[b] !== null ? 'pal-tabuleiro--ok' : ''}`.trim(), 'aria-label': `Tabuleiro ${b + 1}${ok[b] !== null ? ', resolvido' : ''}` },
            h('p', { class: 'pal-tema' }, h('span', { class: 'texto-suave', text: 'Tema: ' }), p.temaVisivel || ctx.trilha.nome), // nunca o tema que entrega a palavra
            h('div', { class: 'pal-grade' }, linhas),
            mostrarDica && p.dicaVisivel ? h('p', { class: 'pal-dica' }, h('strong', { text: 'Dica: ' }), p.dicaVisivel) : null,
            fim ? h('p', { class: `pal-revela ${ok[b] !== null ? 'texto-sucesso' : ''}`.trim(), text: `${ok[b] !== null ? `Acertou na ${ok[b]}ª: ` : 'Era: '}${String(p.original || p.palavra).toUpperCase()}` }) : null);
        }));
        hud.lastChild.textContent = `Tentativa ${Math.min(palpites.length + (fim ? 0 : 1), v.tentativas)} de ${v.tentativas}`;
        pintarTeclado();
        ajustarTamanho();
      }

      /** Cor de cada tecla em cada tabuleiro (a melhor informação que o aluno já tem). */
      function pintarTeclado() {
        const ordem = { fora: 1, lugar: 2, certa: 3 };
        const ok = resolvidoEm();
        teclado.querySelectorAll('.pal-tecla[data-l]').forEach((tecla) => {
          const l = tecla.dataset.l;
          const porTabuleiro = palavras.map((p, b) => {
            let melhor = null;
            palpites.forEach((pp, t) => {
              if (ok[b] !== null && t >= ok[b]) return;
              pp.split('').forEach((x, i) => {
                if (x !== l) return;
                const c = avaliar(pp, p.palavra)[i];
                if (!melhor || ordem[c] > ordem[melhor]) melhor = c;
              });
            });
            return ok[b] !== null ? 'feito' : melhor;
          });
          const pendentes = porTabuleiro.filter((x) => x !== 'feito');
          const geral = pendentes.length && pendentes.every((x) => x === 'fora') ? 'fora'
            : pendentes.includes('certa') ? 'certa' : pendentes.includes('lugar') ? 'lugar' : null;
          tecla.className = `pal-tecla ${geral && v.tabuleiros === 1 ? `pal-tecla--${geral}` : ''} ${geral === 'fora' ? 'pal-tecla--fora' : ''}`.replace(/\s+/g, ' ').trim();
          tecla.setAttribute('aria-label', `${l}${geral ? `: ${NOME_STATUS[geral]}` : ''}`);
          const marcas = tecla.querySelectorAll('.pal-tecla__marca');
          marcas.forEach((m, b) => (m.className = `pal-tecla__marca ${porTabuleiro[b] ? `pal-tecla__marca--${porTabuleiro[b]}` : ''}`.trim()));
        });
      }

      /**
       * Letras do tamanho que cabe na largura e na altura. Mede a área do jogo (não o próprio tabuleiro,
       * que cresce com as letras e nunca deixaria encolher). No x2, sempre lado a lado (como o x4 no
       * celular); no x4, 4 lado a lado se couber melhor (computador).
       */
      function ajustarTamanho() {
        const larguraUtil = Math.min(ctx.container.clientWidth || 340, document.documentElement.clientWidth - 16) || 340;
        const alturaUtil = Math.max(240, window.innerHeight - 400);
        const vao = v.tabuleiros === 1 ? 6 : 4;
        const maximo = v.tabuleiros === 1 ? 58 : 44;
        const medir = (colunas) => {
          const linhasDeTabuleiro = Math.ceil(v.tabuleiros / colunas);
          const porLargura = Math.floor((larguraUtil - (colunas - 1) * 16) / colunas / tamanho - vao);
          const porAltura = Math.floor(alturaUtil / linhasDeTabuleiro / v.tentativas - vao) - (linhasDeTabuleiro > 1 ? 6 : 0);
          // a largura manda (nunca rola de lado); a altura pode pedir rolagem se a tela for muito baixa
          return Math.min(maximo, porLargura, Math.max(porAltura, 24));
        };
        const opcoes = v.tabuleiros === 1 ? [1] : v.tabuleiros === 2 ? [2] : [2, 4];
        const colunas = opcoes.reduce((melhor, c) => (medir(c) > medir(melhor) ? c : melhor), opcoes[0]);
        raiz.style.setProperty('--tam', `${Math.max(14, medir(colunas))}px`);
        raiz.style.setProperty('--vao', `${vao}px`);
        raiz.style.setProperty('--colunas', String(colunas));
      }
      aoRedimensionar = () => ajustarTamanho();
      window.addEventListener('resize', aoRedimensionar);

      function digitar(l) {
        if (fim || atual.length >= tamanho) return;
        atual += l;
        msg.textContent = '';
        desenhar();
      }
      function apagar() {
        if (fim || !atual) return;
        atual = atual.slice(0, -1);
        desenhar();
      }
      function confirmar() {
        if (fim) return;
        if (atual.length < tamanho) {
          msg.textContent = `A palavra tem ${tamanho} letras.`;
          raiz.classList.remove('pal--tremer');
          void raiz.offsetWidth; // reinicia a animação
          raiz.classList.add('pal--tremer');
          return;
        }
        palpites.push(atual);
        const resumo = palavras.map((p, b) => (resolvidoEm()[b] === palpites.length
          ? `Tabuleiro ${b + 1}: acertou!`
          : resolvidoEm()[b] === null ? `${v.tabuleiros > 1 ? `Tabuleiro ${b + 1}: ` : ''}${avaliar(atual, p.palavra).map((c, i) => `${atual[i]} ${NOME_STATUS[c]}`).join(', ')}` : '')).filter(Boolean).join('. ');
        atual = '';
        if (venceu() || palpites.length >= v.tentativas) fim = true;
        salvar();
        desenhar();
        msg.textContent = '';
        anuncio.textContent = fim ? '' : resumo;
        if (fim) encerrar();
      }

      function encerrar() {
        const ok = resolvidoEm();
        const ganhou = venceu();
        const tentativas = ganhou ? Math.max(...ok) : v.tentativas;
        const pontos = ganhou ? v.tentativas + 1 - tentativas : 0;
        const detalhes = palavras.map((p, b) => JogoComum.detalhe(p, ok[b] !== null, {
          inicio, pergunta: `Palavra de ${tamanho} letras · ${p.temaVisivel || 'tema do curso'}`, resposta: String(p.original || p.palavra),
          sua: ok[b] !== null ? '' : 'Não saiu nas tentativas.',
        }));
        const registro = {
          jogo: 'palavrinha', variante: v.chave, diaria, data: hoje, venceu: ganhou, tentativas, letras: tamanho,
          palavras: palavras.map((p) => p.id),
        };
        const evento = { tipo: 'jogo_concluido', criado_em: new Date().toISOString(), detalhes: registro };
        const estat = h('div', { class: 'pal-estatisticas' });
        msg.replaceChildren(
          h('span', { class: ganhou ? 'texto-sucesso' : 'texto-erro', text: ganhou ? `Mandou bem, Diver! ${v.tabuleiros > 1 ? 'Todas resolvidas' : 'Acertou'} em ${plural(tentativas, 'tentativa', 'tentativas')}.` : 'Dessa vez a palavra escapou. Confira acima e mergulhe de novo amanhã.' }));
        const continuar = h('button', { type: 'button', class: 'botao botao--primario botao--largo', onclick: () => {
          if (diaria) salvar({ registrado: true });
          const res = Jogos.resultado({
            jogoId: v.id, trilha: ctx.trilha, detalhes, inicio, pontuacao: pontos,
            titulo: ganhou ? `${v.nome}: resolvida em ${plural(tentativas, 'tentativa', 'tentativas')}` : `${v.nome}: não foi dessa vez`,
            subtitulo: diaria ? 'Palavra do dia: amanhã tem outra. Enquanto isso, o Treino livre está aberto.' : 'Treino livre: vale XP e pontos no Ranking Diver. Pérolas, só na palavra do dia.',
          });
          res.registro = registro; // vai para o log de atividade junto com o resultado (app.js, terminarJogo)
          res.semPerolas = !diaria; // treino dá XP, conta nas estatísticas e no ranking; pérolas só na palavra do dia
          ctx.aoTerminar(res);
        } }, 'Ver meus pontos');
        teclado.replaceChildren(h('div', { class: 'pal-fim' },
          h('section', { class: 'cartao pal-cartao' }, h('h3', { class: 'cartao__titulo', text: 'Suas estatísticas' }), estat),
          continuar));
        painelEstatisticas(estat, ctx, v, [evento]);
        continuar.focus({ preventScroll: true });
      }

      if (desligar) desligar();
      desligar = JogoComum.teclas((e) => {
        if (fim) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmar();
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          apagar();
        } else {
          const l = UI.normalizar(e.key).toUpperCase();
          if (/^[A-Z]$/.test(l)) {
            e.preventDefault();
            digitar(l);
          }
        }
      });
      fim = palpites.length > 0 && (venceu() || palpites.length >= v.tentativas);
      desenhar();
      if (fim) encerrar();
      else {
        salvar();
        teclado.querySelector('.pal-tecla').focus({ preventScroll: true });
      }
    }

    abertura();
    return {
      destruir: () => {
        if (desligar) desligar();
        if (aoRedimensionar) window.removeEventListener('resize', aoRedimensionar);
      },
    };
  }

  Object.values(VARIANTES).forEach((v) => Jogos.registrar({
    id: v.id,
    nome: v.nome,
    grupo: 'rapidos',
    icone: 'i-letras',
    descricao: v.descricao,
    duracao: v.tabuleiros === 1 ? '2-4 min' : v.tabuleiros === 2 ? '3-6 min' : '5-10 min',
    requer: { palavrinha: v.minimo },
    temConteudo: (cartas) => temConteudo(v, cartas),
    iniciar: (ctx) => iniciar(v, ctx),
  }));

  return { VARIANTES, avaliar, palavrasDoDia, palavrasTreino, estatisticas, temConteudo, grupos, diaNumero, hash };
})();

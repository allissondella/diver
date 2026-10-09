/*
 * cronograma.js — aba Organizar → Cronograma: um assistente que monta um plano de estudos.
 *
 *  1. Objetivo (Enem, vestibular ou outra prova + data) · 2. Seu tempo (minutos por dia, descanso)
 *  3. Suas matérias (nota de 1 a 5; fora do Enem, "cai muito/médio/pouco") · 4. Prévia (mover, remover, fixar)
 *  5. Confirmar: adicionar às Tarefas, ao Calendário ou só guardar (nada é criado sem a pessoa marcar).
 *
 * A conta é do CronogramaGerador (sem IA, sem internet). O plano fica em diver:v1:cronograma (sincroniza
 * com a nuvem como o resto). Eventos e tarefas criados levam origem "cronograma:<id>": dá para refazer ou
 * apagar tudo de uma vez. Cada bloco abre o Modo Foco no tempo certo e fica feito quando o foco termina
 * (ou pelo checkbox, ou pela subtarefa nas Tarefas). Tom: nunca culpa; perdeu dias? "Redistribuir".
 */
const Cronograma = (() => {
  const { h, icone, limpar, plural } = UI;
  const G = CronogramaGerador;
  const CHAVE = 'diver:v1:cronograma';
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
  const OPCOES_TEMPO = [[0, 'Descanso'], [30, '30 min'], [60, '1 h'], [90, '1h30'], [120, '2 h'], [150, '2h30'], [180, '3 h'], [240, '4 h'], [300, '5 h'], [360, '6 h']];
  const PASSOS = ['Objetivo', 'Seu tempo', 'Suas matérias', 'Prévia', 'Confirmar'];
  const OBJETIVOS = {
    enem: { nome: 'Enem', dica: '4 áreas de 45 questões + redação. O peso de cada disciplina já vem pronto, pelo que mais caiu de 2019 a 2025.' },
    vestibular: { nome: 'Vestibular', dica: 'Começa com as matérias do Enem; você diz o quanto cada uma cai na sua prova.' },
    outra: { nome: 'Outra prova', dica: 'Concurso, certificação, prova da faculdade: você monta a lista de matérias.' },
  };
  const NOMES_TIPO = { conteudo: 'Conteúdo', revisao: 'Revisão', simulado: 'Simulado', redacao: 'Redação' };

  let tela = null;
  let rascunho = null; // { passo, params, blocos, fim, cobre, integracao, sujo, editando }
  let semanaVista = null; // segunda-feira da semana mostrada
  let oficiais = null; // datas oficiais do Calendário (Enem e vestibulares), para escolher a prova no passo 1

  const ler = () => Dados.ler(CHAVE, null);
  const gravar = (p) => Dados.gravar(CHAVE, p);
  const hoje = () => UI.dataLocal();
  const origemDe = (p) => `cronograma:${p.id}`;
  const segunda = (iso) => G.somarDias(iso, -((UI.paraData(iso).getDay() + 6) % 7));
  const dataCurta = (iso) => UI.formatarData(iso, { day: '2-digit', month: '2-digit' });
  const horas = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`);
  const minutosDoDia = (params, iso) => Number((params.tempo.minutos || {})[UI.paraData(iso).getDay()]) || 0;

  function nomeMateria(params, id) {
    const m = (params.materias || []).find((x) => x.id === id);
    return (m && m.nome) || (G.disciplina(id) || {}).nome || id;
  }
  function tituloBloco(b) {
    return G.titulo(b);
  }
  /**
   * Curso do Diver para estudar o bloco (só se a pessoa tem acesso a ele).
   * Primeiro os cursos por matéria (DISCIPLINAS[].cursos): o bloco abre a PRÓXIMA AULA não feita
   * (fase: null). Com vários (Português, Literatura, Artes), o bloco escolhe um pelo peso, sempre o
   * mesmo para o mesmo bloco. Na língua estrangeira, a língua da Avaliação Diagnóstica (padrão: inglês).
   * Sem nenhum deles, o "Comece por aqui" na fase da disciplina, como antes.
   */
  function cursoDo(b) {
    const d = b.materia ? G.disciplina(b.materia) : G.disciplina('matematica');
    if (!d) return null;
    const tenho = (id) => App.trilhas().find((t) => t.id === id);
    let opcoes = (d.cursos || []).filter((c) => tenho(c.trilha));
    const lingua = (Dados.ler('diver:v1:diagnostica', {}) || {}).lingua || 'ingles';
    if (opcoes.some((c) => c.lingua === lingua)) opcoes = opcoes.filter((c) => !c.lingua || c.lingua === lingua);
    if (opcoes.length) {
      const total = opcoes.reduce((n, c) => n + (c.peso || 1), 0);
      let r = [...String(b.id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % total;
      const c = opcoes.find((x) => (r -= x.peso || 1) < 0) || opcoes[0];
      return { trilha: tenho(c.trilha), fase: null };
    }
    if (!d.curso) return null;
    const trilha = tenho(d.curso.trilha);
    return trilha ? { trilha, fase: (trilha.fases || []).find((f) => f.id === d.curso.fase) || null } : null;
  }

  /* =========================================================
     DADOS DO ASSISTENTE
     ========================================================= */
  function paramsPadrao() {
    return {
      objetivo: { tipo: 'enem', nome: `Enem ${new Date().getFullYear()}`, data: '' },
      tempo: { minutos: { 0: 0, 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 180 }, hora: '19:00' },
      materias: G.DISCIPLINAS.map((d) => ({ id: d.id, nota: 3, peso: 'medio', ativa: true })),
    };
  }
  const paraGerador = (params) => ({ ...params, materias: params.materias.filter((m) => m.ativa) });

  function novoRascunho(plano) {
    rascunho = plano
      ? { passo: 0, params: JSON.parse(JSON.stringify(plano.params)), blocos: null, integracao: { ...plano.integracao }, sujo: true, editando: true, materiasMexidas: true, modoNotas: 'manual',
        diagAplicada: Diagnostica.situacao().atualizadoEm <= (plano.atualizadoEm || 0) ? Diagnostica.situacao().atualizadoEm : null }
      : { passo: 0, params: paramsPadrao(), blocos: null, integracao: { tarefas: false, calendario: false, soGuardar: true }, sujo: true, editando: false, materiasMexidas: false };
    semanaVista = null;
  }

  /** Gera (ou refaz) a prévia. Editando um plano: os blocos feitos e os fixos ficam; o resto é refeito de hoje em diante. */
  function gerarRascunho() {
    const r = rascunho;
    const antigo = r.editando ? ler() : null;
    const inicio = hoje();
    const fixosAntigos = antigo ? antigo.blocos.filter((b) => b.data >= inicio && (b.fixo || b.feito)) : [];
    const fixosNovos = (r.blocos || []).filter((b) => b.fixo && b.data >= inicio);
    const fixos = [...fixosAntigos, ...fixosNovos.filter((b) => !fixosAntigos.some((x) => x.id === b.id))];
    const historico = antigo ? antigo.blocos.filter((b) => b.data < inicio) : [];
    const res = G.gerar(paraGerador(r.params), inicio, { fixos, historico });
    r.blocos = res.blocos;
    r.fim = res.fim;
    r.cobre = res.cobreAteAProva;
    r.sujo = false;
  }

  /* =========================================================
     TELA
     ========================================================= */
  function render(secao) {
    tela = secao;
    const plano = ler();
    if (plano) trazerFeitosDasTarefas(plano);
    limpar(secao);
    secao.append(UI.cabecalho('Organizar', 'Cronograma', 'Seu plano de estudos até a prova, com descanso, revisão e simulados. Sem pressa e sem culpa: dá para ajustar quando quiser.'));
    if (rascunho) secao.append(assistente());
    else if (plano) secao.append(...painel(plano));
    else secao.append(boasVindas());
  }
  const redesenhar = () => { if (tela && tela.isConnected) render(tela); };

  function boasVindas() {
    return h('section', { class: 'cartao cr-boas-vindas' },
      UI.mascote('cr-boas-vindas__mascote mascote--feliz'),
      h('div', { class: 'cr-boas-vindas__texto' },
        h('h2', { class: 'cartao__titulo', text: 'Bora montar o seu plano?' }),
        h('p', { text: 'Diga a data da prova, quanto tempo você tem em cada dia e como está em cada matéria. O Diver monta um plano semana a semana: quem precisa de mais tempo ganha mais tempo, e nenhuma matéria fica de fora.' }),
        h('ul', { class: 'cr-lista-check' },
          h('li', { text: 'Blocos de 25 ou 50 minutos, do jeito do Modo Foco.' }),
          h('li', { text: 'Revisão espaçada, simulados e (no Enem) redação toda semana.' }),
          h('li', { text: 'Descanso incluído. Perdeu um dia? Um toque redistribui.' }),
          h('li', { text: 'Nada vai para as suas Tarefas ou Calendário sem você marcar.' })),
        h('div', { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'botao botao--primario', id: 'cr-comecar', onclick: () => { novoRascunho(null); redesenhar(); } }, icone('i-alvo'), 'Montar meu cronograma'))));
  }

  /* ---------- Assistente de 5 passos ---------- */
  function assistente() {
    const r = rascunho;
    const passo = [passoObjetivo, passoTempo, passoMaterias, passoPrevia, passoConfirmar][r.passo]();
    const erro = h('p', { class: 'texto-erro cr-erro', role: 'alert' });
    const avancar = () => {
      if (passo.aoContinuar && passo.aoContinuar()) return;
      const msg = passo.validar ? passo.validar() : null;
      if (msg) { erro.textContent = msg; return; }
      if (r.passo === 4) { salvarRascunho(); return; }
      r.passo += 1;
      if (r.passo === 3 && (r.sujo || !r.blocos)) gerarRascunho();
      redesenhar();
      focarTitulo();
    };
    const voltar = () => {
      if (r.passo === 0) {
        rascunho = null;
        redesenhar();
        return;
      }
      r.passo -= 1;
      redesenhar();
      focarTitulo();
    };
    return h('div', { class: 'cr-assistente' },
      h('ol', { class: 'cr-passos', 'aria-label': 'Passos' }, PASSOS.map((nome, i) => h('li', {
        class: `cr-passos__item ${i === r.passo ? 'cr-passos__item--atual' : ''} ${i < r.passo ? 'cr-passos__item--feito' : ''}`.trim(),
        'aria-current': i === r.passo ? 'step' : null,
      }, h('span', { class: 'cr-passos__num', text: i < r.passo ? '✓' : String(i + 1) }), h('span', { class: 'cr-passos__nome', text: nome })))),
      h('section', { class: 'cartao cr-passo', 'aria-labelledby': 'cr-passo-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'cr-passo-titulo', tabindex: '-1', text: `${r.passo + 1}. ${PASSOS[r.passo]}` }),
        passo.el,
        erro,
        h('div', { class: 'cr-passo__acoes' },
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: voltar }, r.passo === 0 ? 'Cancelar' : 'Voltar'),
          h('button', { type: 'button', class: 'botao botao--primario', id: 'cr-avancar', onclick: avancar },
            r.passo === 4 ? icone('i-check') : null, r.passo === 4 ? 'Salvar cronograma' : 'Continuar', r.passo < 4 ? icone('i-seta-dir') : null))));
  }
  function focarTitulo() {
    const t = document.getElementById('cr-passo-titulo');
    if (t) t.focus({ preventScroll: true });
    if (tela) tela.scrollIntoView({ block: 'start' });
  }

  /** Provas da lista oficial que dão para escolher: só o 1º dia de cada fase e pelo menos uma semana à frente. */
  function provasDaLista(minimo) {
    if (!oficiais) return [];
    return (oficiais.vestibulares || [])
      .filter((v) => v.tipo === 'prova' && v.data >= minimo && !/\(dia [2-9]\)/.test(v.titulo))
      .map((v) => ({
        valor: `${v.data}|${v.titulo}`,
        rede: v.rede,
        tipo: v.rede === 'enem' ? 'enem' : 'vestibular',
        nome: v.rede === 'enem' ? `Enem ${v.data.slice(0, 4)}` : v.titulo.replace(/ \(dia 1\)$/, ''),
        data: v.data,
      }))
      .filter((v, i, l) => l.findIndex((x) => x.nome === v.nome) === i) // o Enem aparece uma vez (1º dia)
      .sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));
  }

  function passoObjetivo() {
    const p = rascunho.params;
    const minimo = G.somarDias(hoje(), 7);
    if (!oficiais) Organizar.datasOficiais().then((d) => { oficiais = d; if (rascunho && rascunho.passo === 0) { redesenhar(); } });
    const lista = provasDaLista(minimo);
    const escolhida = lista.find((v) => v.nome === p.objetivo.nome && v.data === p.objetivo.data);
    const grupos = [['enem', 'Enem'], ['publica', 'Vestibulares públicos'], ['privada', 'Vestibulares privados']];
    const daLista = h('select', { class: 'campo', id: 'cr-lista', disabled: !oficiais, onchange: (e) => {
      const v = lista.find((x) => x.valor === e.target.value);
      if (!v) return;
      p.objetivo = { ...p.objetivo, tipo: v.tipo, nome: v.nome, data: v.data };
      if (!rascunho.materiasMexidas) p.materias.forEach((m) => (m.ativa = true));
      rascunho.sujo = true;
      redesenhar();
      setTimeout(() => { const s = document.getElementById('cr-lista'); if (s) s.focus(); }, 0);
    } },
    h('option', { value: '', text: oficiais ? 'Vou preencher à mão' : 'Carregando as datas…', selected: !escolhida }),
    ...grupos.map(([rede, rotulo]) => {
      const itens = lista.filter((v) => v.rede === rede);
      return itens.length ? h('optgroup', { label: rotulo }, itens.map((v) => h('option', { value: v.valor, selected: escolhida === v, text: `${v.data.split('-').reverse().join('/')} · ${v.nome}` }))) : null;
    }).filter(Boolean));
    const aMao = () => { if (daLista.value) daLista.value = ''; };
    const nome = h('input', { class: 'campo', id: 'cr-nome', maxlength: '60', value: p.objetivo.nome, oninput: (e) => { p.objetivo.nome = e.target.value; aMao(); } });
    const data = h('input', { class: 'campo', id: 'cr-data', type: 'date', min: minimo, value: p.objetivo.data, oninput: (e) => { p.objetivo.data = e.target.value; rascunho.sujo = true; aMao(); } });
    const dica = h('p', { class: 'texto-suave cr-dica', text: OBJETIVOS[p.objetivo.tipo].dica });
    const tipos = h('div', { class: 'cr-opcoes', role: 'radiogroup', 'aria-label': 'Tipo de prova' }, Object.entries(OBJETIVOS).map(([id, o]) => h('label', { class: 'cr-opcao' },
      h('input', { type: 'radio', name: 'cr-tipo', value: id, checked: p.objetivo.tipo === id, onchange: () => {
        const antes = p.objetivo.tipo;
        p.objetivo.tipo = id;
        rascunho.sujo = true;
        if (!nome.value.trim() || nome.value === `${OBJETIVOS[antes].nome} ${new Date().getFullYear()}`) {
          p.objetivo.nome = id === 'outra' ? '' : `${o.nome} ${new Date().getFullYear()}`;
          nome.value = p.objetivo.nome;
        }
        if (!rascunho.materiasMexidas) p.materias.forEach((m) => (m.ativa = id !== 'outra'));
        dica.textContent = o.dica;
      } }),
      h('span', { class: 'cr-opcao__nome', text: o.nome }))));
    return {
      el: h('div', { class: 'cr-campos' },
        h('p', { text: 'Para qual prova você está se preparando?' }),
        h('label', { class: 'cr-campo cr-campo--grande', for: 'cr-lista' }, h('span', { class: 'rotulo-campo', text: 'Escolher uma prova da lista' }), daLista),
        h('p', { class: 'texto-suave cr-dica', text: lista.length || !oficiais ? 'O Enem e os principais vestibulares, com a data já preenchida. Não achou a sua? Preencha o nome e a data à mão logo abaixo.' : 'Nenhuma prova da lista está a mais de uma semana daqui. Preencha o nome e a data à mão logo abaixo.' }),
        tipos, dica,
        h('div', { class: 'cr-linha' },
          h('label', { class: 'cr-campo cr-campo--grande', for: 'cr-nome' }, h('span', { class: 'rotulo-campo', text: 'Nome da prova' }), nome),
          h('label', { class: 'cr-campo', for: 'cr-data' }, h('span', { class: 'rotulo-campo', text: 'Data da prova' }), data)),
        escolhida ? h('p', { class: 'texto-suave cr-dica', text: `${oficiais.aviso || 'Confira sempre no edital: datas podem mudar.'}${escolhida.tipo === 'enem' ? ' No Enem, o plano vai até o 1º dia de prova.' : ''}` })
          : p.objetivo.tipo === 'enem' ? h('p', { class: 'texto-suave cr-dica', text: 'Confira a data oficial no site do Inep. No Enem, use o primeiro dia de prova.' }) : null),
      validar: () => {
        if (!p.objetivo.nome.trim()) return 'Dê um nome para a prova (ex.: Enem 2026, Fuvest, OAB).';
        if (!p.objetivo.data) return 'Escolha a data da prova.';
        if (p.objetivo.data < minimo) return 'Escolha uma data pelo menos uma semana à frente: assim dá para montar um plano de verdade.';
        if (p.objetivo.data > G.somarDias(hoje(), 3 * 365)) return 'Essa data está longe demais. Escolha uma data nos próximos 3 anos.';
        return null;
      },
    };
  }

  function passoTempo() {
    const t = rascunho.params.tempo;
    const total = h('p', { class: 'cr-total', 'aria-live': 'polite' });
    const atualizar = () => {
      const min = ORDEM_SEMANA.reduce((a, d) => a + (Number(t.minutos[d]) || 0), 0);
      const descanso = ORDEM_SEMANA.filter((d) => !Number(t.minutos[d])).length;
      total.replaceChildren(...[h('strong', { text: `${horas(min)} por semana` }), ` · ${plural(descanso, 'dia', 'dias')} de descanso`,
        descanso ? null : h('span', { class: 'cr-total__dica', text: ' Dica: um dia de descanso por semana ajuda a memória a guardar o que você estudou.' })].filter(Boolean));
    };
    const linhas = ORDEM_SEMANA.map((d) => h('label', { class: 'cr-dia-tempo', for: `cr-tempo-${d}` },
      h('span', { class: 'cr-dia-tempo__nome', text: DIAS_LONGOS[d] }),
      h('select', { class: 'campo', id: `cr-tempo-${d}`, onchange: (e) => { t.minutos[d] = Number(e.target.value); rascunho.sujo = true; atualizar(); } },
        OPCOES_TEMPO.map(([v, txt]) => h('option', { value: String(v), text: txt, selected: Number(t.minutos[d] || 0) === v })))));
    const hora = h('input', { class: 'campo', id: 'cr-hora', type: 'time', value: t.hora, onchange: (e) => { t.hora = e.target.value || '19:00'; rascunho.sujo = true; } });
    atualizar();
    return {
      el: h('div', { class: 'cr-campos' },
        h('p', { text: 'Quanto tempo você consegue estudar em cada dia? Seja realista: um plano que cabe na vida é um plano que anda.' }),
        h('div', { class: 'cr-dias-tempo' }, linhas),
        total,
        h('label', { class: 'cr-campo cr-campo--hora', for: 'cr-hora' }, h('span', { class: 'rotulo-campo', text: 'Horário em que você costuma começar' }), hora)),
      validar: () => (ORDEM_SEMANA.some((d) => Number(t.minutos[d]) > 0) ? null : 'Escolha pelo menos um dia com tempo de estudo.'),
    };
  }

  function passoMaterias() {
    const p = rascunho.params;
    const enem = p.objetivo.tipo === 'enem';
    const mexeu = () => { rascunho.sujo = true; rascunho.materiasMexidas = true; };
    // Avaliação Diagnóstica (Enem e vestibular): as notas dela entram aqui, uma vez por resultado novo
    const podeDiag = p.objetivo.tipo !== 'outra';
    const sit = Diagnostica.situacao();
    if (podeDiag && sit.feita && rascunho.diagAplicada !== sit.atualizadoEm) {
      const nn = Diagnostica.notas();
      p.materias.forEach((m) => { if (nn[m.id]) m.nota = nn[m.id]; });
      rascunho.diagAplicada = sit.atualizadoEm;
      rascunho.modoNotas = 'diagnostica';
      rascunho.sujo = true;
    }
    const mostrarLista = !podeDiag || !!rascunho.modoNotas;
    const escolha = !podeDiag ? null : sit.feita
      ? h('div', { class: 'cr-diag cr-diag--feita', role: 'status' },
        h('p', {}, h('strong', { text: 'Notas da sua Avaliação Diagnóstica aplicadas. ' }), 'A Redação você marca. Ajuste qualquer nota se achar justo.'),
        h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', id: 'cr-diag-ver', onclick: () => Diagnostica.abrir() }, icone('i-grafico'), 'Ver meus pontos fortes e fracos'))
      : h('div', { class: 'cr-diag' },
        h('p', { class: 'cr-diag__titulo' }, h('strong', { text: 'Como você quer informar o seu nível em cada matéria?' })),
        h('div', { class: 'cr-diag__opcoes' },
          h('button', { type: 'button', class: 'cr-diag__opcao cr-diag__opcao--recomendada', id: 'cr-diag-fazer', onclick: () => Diagnostica.abrir() },
            h('span', { class: 'chip chip--ativo', text: 'Recomendado' }),
            h('strong', { class: 'cr-diag__nome', text: sit.respondidas ? `Continuar a Avaliação Diagnóstica (${sit.respondidas} de ${sit.total})` : 'Fazer a Avaliação Diagnóstica' }),
            h('span', { text: 'Muito importante: é o modo mais assertivo para você saber os seus pontos fortes e fracos, e ela personaliza a sua experiência e o seu plano. 40 questões num teste só, cerca de 1h30, e dá para pausar.' })),
          h('button', { type: 'button', class: 'cr-diag__opcao', id: 'cr-diag-manual', 'aria-pressed': String(rascunho.modoNotas === 'manual'), onclick: () => { rascunho.modoNotas = 'manual'; redesenhar(); setTimeout(() => { const x = document.querySelector('.cr-materia input'); if (x) x.focus(); }, 0); } },
            h('strong', { class: 'cr-diag__nome', text: 'Prefiro marcar eu mesmo' }),
            h('span', { text: 'Dê uma nota de 1 a 5 para cada matéria, do jeito que você se vê hoje.' }))));
    const linha = (m) => {
      const nome = nomeMateria(p, m.id);
      const notas = h('div', { class: 'cr-notas', role: 'radiogroup', 'aria-label': `Nota de ${nome}` }, [1, 2, 3, 4, 5].map((n) => h('label', { class: 'cr-nota' },
        h('input', { type: 'radio', name: `cr-nota-${m.id}`, value: String(n), checked: m.nota === n, disabled: !m.ativa, onchange: () => { m.nota = n; mexeu(); } }),
        h('span', { text: String(n) }))));
      const peso = enem || m.id === 'redacao' ? null : h('select', { class: 'campo cr-peso', 'aria-label': `Quanto ${nome} cai na prova`, disabled: !m.ativa, onchange: (e) => { m.peso = e.target.value; mexeu(); } },
        [['muito', 'Cai muito'], ['medio', 'Cai médio'], ['pouco', 'Cai pouco']].map(([v, txt]) => h('option', { value: v, text: txt, selected: m.peso === v })));
      const el = h('li', { class: `cr-materia ${m.ativa ? '' : 'cr-materia--fora'}`.trim() },
        h('label', { class: 'cr-materia__nome' },
          h('input', { type: 'checkbox', checked: m.ativa, onchange: (e) => {
            m.ativa = e.target.checked;
            mexeu();
            el.classList.toggle('cr-materia--fora', !m.ativa);
            el.querySelectorAll('.cr-notas input, .cr-peso').forEach((x) => (x.disabled = !m.ativa));
          } }),
          h('span', { text: nome })),
        notas, peso,
        m.livre ? h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Tirar ${nome}`, onclick: () => { p.materias.splice(p.materias.indexOf(m), 1); mexeu(); redesenhar(); } }, icone('i-x')) : null);
      return el;
    };
    const grupos = enem
      ? ['Linguagens', 'Humanas', 'Natureza', 'Matemática', 'Redação'].map((area) => h('div', { class: 'cr-area' },
        h('h3', { class: 'cr-area__titulo', text: area }),
        h('ul', { class: 'cr-materias' }, p.materias.filter((m) => (G.disciplina(m.id) || {}).area === area).map(linha))))
      : [h('ul', { class: 'cr-materias' }, p.materias.map(linha))];
    const nova = h('input', { class: 'campo', id: 'cr-nova', maxlength: '40', placeholder: 'Ex.: Direito constitucional' });
    const adicionar = h('form', { class: 'cr-nova', onsubmit: (e) => {
      e.preventDefault();
      const nome = nova.value.trim();
      if (!nome) return;
      const id = `livre-${nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
      if (!p.materias.some((m) => m.id === id)) p.materias.push({ id, nome, nota: 3, peso: 'medio', ativa: true, livre: true });
      mexeu();
      redesenhar();
      setTimeout(() => { const c = document.getElementById('cr-nova'); if (c) c.focus(); }, 0);
    } },
    h('label', { class: 'cr-campo cr-campo--grande', for: 'cr-nova' }, h('span', { class: 'rotulo-campo', text: 'Outra matéria' }), nova),
    h('button', { type: 'submit', class: 'botao botao--secundario botao--pequeno' }, icone('i-mais'), 'Adicionar'));
    return {
      el: h('div', { class: 'cr-campos' },
        escolha,
        mostrarLista ? h('p', {}, 'De 1 a 5: ', h('strong', { text: '1 = ainda tenho muita dificuldade' }), ', ', h('strong', { text: '5 = já domino' }), '. Nota baixa ganha mais tempo, e nenhuma matéria marcada fica de fora.') : null,
        mostrarLista && !enem ? h('p', { class: 'texto-suave cr-dica', text: 'Desmarque o que não cai na sua prova e diga o quanto cada matéria cai.' }) : null,
        ...(mostrarLista ? grupos : []),
        mostrarLista && !enem ? adicionar : null),
      // sem escolher, o "Continuar" segue a opção recomendada: abre a Avaliação Diagnóstica
      aoContinuar: () => { if (mostrarLista) return false; Diagnostica.abrir(); return true; },
      validar: () => {
        return p.materias.some((m) => m.ativa && m.id !== 'redacao') ? null : 'Marque pelo menos uma matéria para estudar.';
      },
    };
  }

  function passoPrevia() {
    const r = rascunho;
    if (r.sujo || !r.blocos) gerarRascunho();
    const conteudo = h('div', { class: 'cr-previa' });
    const desenhar = () => conteudo.replaceChildren(resumoPlano(r.params, r.blocos, r.fim, r.cobre), semana(r.blocos, { params: r.params, modo: 'previa', aoMudar: desenhar }));
    desenhar();
    return {
      el: h('div', { class: 'cr-campos' },
        h('p', { text: 'Seu plano está aqui. Arraste um bloco para outro dia (ou use o menu dele), tire o que não fizer sentido e fixe o que não pode mudar. "Gerar de novo" mantém os blocos fixos.' }),
        h('div', { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => { gerarRascunho(); desenhar(); UI.toast('Plano refeito', 'Os blocos fixos ficaram onde estavam.', 'i-revisao'); } }, icone('i-revisao'), 'Gerar de novo')),
        conteudo),
      validar: () => (r.blocos && r.blocos.length ? null : 'O plano ficou vazio. Volte e libere mais tempo ou mais matérias.'),
    };
  }

  function passoConfirmar() {
    const r = rascunho;
    const ig = r.integracao;
    const caixa = (campo, titulo, texto) => h('label', { class: 'cr-escolha' },
      h('input', { type: 'checkbox', id: `cr-int-${campo}`, checked: !!ig[campo], onchange: (e) => {
        ig[campo] = e.target.checked;
        if (campo === 'soGuardar' && ig.soGuardar) { ig.tarefas = false; ig.calendario = false; }
        if (campo !== 'soGuardar' && ig[campo]) ig.soGuardar = false;
        if (!ig.tarefas && !ig.calendario) ig.soGuardar = true;
        ['tarefas', 'calendario', 'soGuardar'].forEach((c) => { const x = document.getElementById(`cr-int-${c}`); if (x) x.checked = !!ig[c]; });
      } }),
      h('span', {}, h('strong', { text: titulo }), h('span', { class: 'texto-suave', text: texto })));
    return {
      el: h('div', { class: 'cr-campos' },
        h('p', { text: 'Onde você quer ver o plano? Escolha à vontade: dá para mudar depois e apagar tudo de uma vez.' }),
        caixa('tarefas', 'Adicionar às minhas Tarefas', 'Um quadro "Cronograma" com um cartão por dia; os blocos viram subtarefas.'),
        caixa('calendario', 'Adicionar ao meu Calendário', 'Cada bloco no horário, os dias de descanso e o dia da prova.'),
        caixa('soGuardar', 'Só guardar o cronograma', 'Ele fica aqui, nesta aba.'),
        h('p', { class: 'cr-foco-dica' }, icone('i-ampulheta'), h('span', {}, h('strong', { text: 'Dica: comece cada bloco pelo Modo Foco. ' }), 'Ele já abre no tempo certo (25 ou 50 min), segura o celular longe e marca o bloco como feito quando o tempo acaba.'))),
    };
  }

  function salvarRascunho() {
    const r = rascunho;
    const antigo = ler();
    const inicio = hoje();
    const integracao = { tarefas: !!r.integracao.tarefas, calendario: !!r.integracao.calendario };
    const plano = {
      versao: 1,
      id: antigo ? antigo.id : UI.id('crono'),
      criadoEm: antigo ? antigo.criadoEm : Date.now(),
      atualizadoEm: Date.now(),
      params: r.params,
      blocos: [...(antigo ? antigo.blocos.filter((b) => b.data < inicio && b.feito) : []), ...r.blocos],
      fim: r.fim,
      cobreAteAProva: r.cobre,
      integracao,
    };
    gravar(plano);
    sincronizar(plano);
    Atividade.registrar('cronograma_criado', null, {
      objetivo: plano.params.objetivo.tipo, semanas: Math.ceil((G.diasEntre(inicio, plano.fim) + 1) / 7), blocos: r.blocos.length,
      materias: plano.params.materias.filter((m) => m.ativa).length, refeito: !!antigo,
      tarefas: integracao.tarefas, calendario: integracao.calendario,
    });
    rascunho = null;
    semanaVista = null;
    UI.toast(antigo ? 'Cronograma atualizado' : 'Cronograma pronto', 'Bora mergulhar! Um bloco de cada vez.', 'i-alvo');
    redesenhar();
  }

  /* ---------- Resumo: semanas, horas e onde vai o tempo ---------- */
  function resumoPlano(params, blocos, fim, cobre) {
    const res = G.resumo(blocos);
    const inicio = blocos.length ? blocos[0].data : hoje();
    const semanas = Math.max(1, Math.ceil((G.diasEntre(inicio, fim || inicio) + 1) / 7));
    const materias = Object.entries(res.porMateria).sort((a, b) => b[1] - a[1]);
    const maximo = materias.length ? materias[0][1] : 1;
    return h('div', { class: 'cr-resumo' },
      h('ul', { class: 'cr-numeros' },
        h('li', {}, h('strong', { text: String(semanas) }), plural(semanas, 'semana', 'semanas').replace(/^\d+ /, '')),
        h('li', {}, h('strong', { text: horas(res.total) }), 'de estudo'),
        h('li', {}, h('strong', { text: String(blocos.filter((b) => b.tipo === 'simulado').length) }), 'simulados'),
        h('li', {}, h('strong', { text: String(blocos.filter((b) => b.tipo === 'redacao').length) }), 'redações')),
      materias.length ? h('div', { class: 'cr-tempo-materias' },
        h('h3', { class: 'cr-area__titulo', text: 'Onde vai o seu tempo (conteúdo + revisão)' }),
        h('ul', { class: 'cr-barras' }, materias.map(([id, min]) => h('li', { class: 'cr-barra' },
          h('span', { class: 'cr-barra__nome', text: nomeMateria(params, id) }),
          h('span', { class: 'cr-barra__trilho', 'aria-hidden': 'true' }, h('span', { class: 'cr-barra__valor', style: `width: ${Math.max(4, Math.round((min / maximo) * 100))}%` })),
          h('span', { class: 'cr-barra__horas', text: horas(min) }))))) : null,
      cobre === false ? h('p', { class: 'texto-suave cr-dica', text: `Seu plano cobre as próximas ${G.SEMANAS_MAX} semanas. Perto do fim, toque em "Continuar o plano" e o Diver monta o trecho seguinte.` }) : null);
  }

  /* ---------- Semana editável (prévia e plano) ---------- */
  function semana(blocos, { params, modo, aoMudar }) {
    const primeiro = blocos.length ? segunda(blocos[0].data) : segunda(hoje());
    const ultimo = blocos.length ? segunda(blocos[blocos.length - 1].data) : primeiro;
    if (!semanaVista || semanaVista < primeiro || semanaVista > ultimo) semanaVista = modo === 'plano' && hoje() >= primeiro && hoje() <= G.somarDias(ultimo, 6) ? segunda(hoje()) : primeiro;
    const ini = semanaVista;
    const total = Math.round(G.diasEntre(primeiro, ultimo) / 7) + 1;
    const indice = Math.round(G.diasEntre(primeiro, ini) / 7) + 1;
    const ir = (passo) => { semanaVista = G.somarDias(ini, 7 * passo); aoMudar(); };
    const ultimoDiaPlano = G.somarDias(params.objetivo.data, -2);
    const dias = Array.from({ length: 7 }, (_, k) => G.somarDias(ini, k));

    const mudou = (b, dataAntiga) => {
      [dataAntiga, b && b.data].filter(Boolean).forEach((d) => refazerHoras(blocos, params, d));
      blocos.sort((a, x) => (a.data < x.data ? -1 : a.data > x.data ? 1 : a.ordem - x.ordem));
      aoMudar(true);
    };
    const mover = (id, data) => {
      const b = blocos.find((x) => x.id === id);
      if (!b || b.data === data) return;
      const antiga = b.data;
      b.data = data;
      b.ordem = 99;
      b.fixo = true; // quem mudou de lugar com a mão fica fixo
      mudou(b, antiga);
      const usados = blocos.filter((x) => x.data === data).reduce((a, x) => a + (x.dur || 25), 0);
      if (usados > minutosDoDia(params, data)) UI.toast('Dia mais cheio', `${dataCurta(data)} passou do seu tempo (${horas(usados)}). Tudo bem, é só um aviso.`, 'i-relogio');
    };

    const coluna = (iso) => {
      const doDia = blocos.filter((b) => b.data === iso).sort((a, b) => a.ordem - b.ordem);
      const min = minutosDoDia(params, iso);
      const usados = doDia.reduce((a, b) => a + (b.dur || 25), 0);
      const d = UI.paraData(iso).getDay();
      const ehProva = iso === params.objetivo.data;
      const vespera = iso === G.somarDias(params.objetivo.data, -1);
      const el = h('li', { class: `cr-dia ${iso === hoje() ? 'cr-dia--hoje' : ''} ${!doDia.length ? 'cr-dia--livre' : ''}`.trim(), 'data-dia': iso },
        h('div', { class: 'cr-dia__cab' },
          h('strong', { text: `${DIAS[d]} ${dataCurta(iso)}` }),
          h('span', { class: 'texto-suave', text: ehProva ? 'Dia da prova' : vespera ? 'Véspera: descanso' : doDia.length ? `${horas(usados)}${min ? ` de ${horas(min)}` : ''}` : min ? 'Livre' : 'Descanso' })),
        doDia.length ? h('ol', { class: 'cr-blocos' }, doDia.map((b) => cartaoBloco(b, { blocos, params, modo, mover, mudou, dias: dias.concat(Array.from({ length: 7 }, (_, k) => G.somarDias(ini, 7 + k))).filter((x) => x >= hoje() && x <= ultimoDiaPlano) })))
          : h('p', { class: 'cr-dia__vazio', text: ehProva ? '🏁 Boa prova, Diver!' : vespera ? 'Dorme cedo e separa os documentos.' : min ? 'Nada marcado.' : 'Descanso também é parte do plano. 🌊' }));
      // arrastar e soltar (computador)
      el.addEventListener('dragover', (e) => { if (iso >= hoje() && iso <= ultimoDiaPlano) { e.preventDefault(); el.classList.add('cr-dia--alvo'); } });
      el.addEventListener('dragleave', () => el.classList.remove('cr-dia--alvo'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('cr-dia--alvo');
        const id = e.dataTransfer.getData('text/plain');
        if (id) mover(id, iso);
      });
      return el;
    };

    return h('div', { class: 'cr-semana' },
      h('div', { class: 'cr-semana__barra' },
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Semana anterior', disabled: ini <= primeiro, onclick: () => ir(-1) }, icone('i-voltar')),
        h('h3', { class: 'cr-semana__titulo', 'aria-live': 'polite', text: `Semana ${indice} de ${total} · ${dataCurta(ini)} a ${dataCurta(G.somarDias(ini, 6))}` }),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Próxima semana', disabled: ini >= ultimo, onclick: () => ir(1) }, icone('i-seta-dir'))),
      h('ol', { class: 'cr-dias' }, dias.map(coluna)));
  }

  function refazerHoras(blocos, params, iso) {
    let minuto = (() => { const [a, b] = String(params.tempo.hora || '19:00').split(':').map(Number); return a * 60 + b; })();
    blocos.filter((b) => b.data === iso).sort((a, b) => a.ordem - b.ordem).forEach((b, i) => {
      b.ordem = i;
      const t = Math.min(23 * 60 + 59, minuto);
      b.hora = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      minuto += (b.dur || 25) + ((b.dur || 25) >= 50 ? 10 : 5);
    });
  }

  function cartaoBloco(b, { blocos, params, modo, mover, mudou, dias }) {
    const titulo = tituloBloco({ ...b, nomeMateria: b.materia ? nomeMateria(params, b.materia) : undefined });
    const menu = h('div', { class: 'cr-bloco__menu', hidden: true });
    const passado = b.data < hoje();
    const abrirMenu = () => {
      if (!menu.hidden) { menu.hidden = true; return; }
      const select = h('select', { class: 'campo', 'aria-label': `Mover "${titulo}" para outro dia` },
        h('option', { value: '', text: 'Mover para…' }),
        dias.filter((d) => d !== b.data).map((d) => h('option', { value: d, text: `${DIAS[UI.paraData(d).getDay()]} ${dataCurta(d)}` })));
      select.addEventListener('change', () => { if (select.value) mover(b.id, select.value); });
      menu.replaceChildren(
        select,
        h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => { b.fixo = !b.fixo; mudou(null); } }, icone('i-marcador'), b.fixo ? 'Soltar' : 'Fixar'),
        h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => {
          blocos.splice(blocos.indexOf(b), 1);
          mudou(null, b.data);
          UI.toast('Bloco removido', titulo, 'i-lixo');
        } }, icone('i-lixo'), 'Remover'));
      menu.hidden = false;
      select.focus();
    };
    const el = h('li', { class: `cr-bloco cr-bloco--${b.tipo} ${b.feito ? 'cr-bloco--feito' : ''}`.trim(), draggable: modo === 'previa' || !passado ? 'true' : 'false', 'data-bloco': b.id },
      h('div', { class: 'cr-bloco__linha' },
        modo === 'plano' ? h('input', { type: 'checkbox', class: 'cr-bloco__check', checked: !!b.feito, 'aria-label': `Feito: ${titulo}`, onchange: (e) => marcar(b.id, e.target.checked, 'manual') }) : null,
        h('div', { class: 'cr-bloco__texto' },
          h('span', { class: 'cr-bloco__titulo', text: titulo }),
          h('span', { class: 'cr-bloco__meta' },
            `${b.hora || ''} · ${b.dur >= 60 ? horas(b.dur) : `${b.dur} min`} · ${NOMES_TIPO[b.tipo]}`,
            b.fixo ? h('span', { class: 'cr-bloco__fixo', title: 'Fixo', 'aria-label': 'Fixo' }, icone('i-marcador-cheio')) : null)),
        h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Opções de "${titulo}"`, 'aria-expanded': 'false', onclick: (e) => { abrirMenu(); e.currentTarget.setAttribute('aria-expanded', String(!menu.hidden)); } }, icone('i-pontos'))),
      menu);
    el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', b.id); e.dataTransfer.effectAllowed = 'move'; el.classList.add('cr-bloco--arrastando'); });
    el.addEventListener('dragend', () => el.classList.remove('cr-bloco--arrastando'));
    return el;
  }

  /* =========================================================
     PAINEL DO PLANO
     ========================================================= */
  function painel(plano) {
    const p = plano.params;
    const dia = hoje();
    const faltam = G.diasEntre(dia, p.objetivo.data);
    const feitos = plano.blocos.filter((b) => b.feito).length;
    const total = plano.blocos.length;
    const atrasados = plano.blocos.filter((b) => !b.feito && !b.fixo && b.data < dia);
    const doDia = plano.blocos.filter((b) => b.data === dia).sort((a, b) => a.ordem - b.ordem);
    const salvarEdicao = () => { plano.atualizadoEm = Date.now(); gravar(plano); sincronizar(plano); };

    const topo = h('section', { class: 'cartao cr-topo', 'aria-labelledby': 'cr-objetivo' },
      h('div', {},
        h('span', { class: 'rotulo', text: OBJETIVOS[p.objetivo.tipo].nome }),
        h('h2', { class: 'cartao__titulo', id: 'cr-objetivo', text: p.objetivo.nome })),
      h('p', { class: 'cr-topo__faltam' }, faltam > 0
        ? [h('strong', { text: plural(faltam, 'dia', 'dias') }), ` até ${UI.formatarData(p.objetivo.data, { day: '2-digit', month: 'long' })}`]
        : faltam === 0 ? h('strong', { text: 'É hoje! Boa prova, Diver! 🏁' }) : 'A prova já passou. Que tal montar o próximo plano?'),
      h('div', { class: 'cr-progresso' },
        h('div', { class: 'barra-progresso', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(feitos), 'aria-label': 'Blocos feitos' },
          h('div', { class: 'barra-progresso__preenchimento', style: `width: ${total ? Math.round((feitos / total) * 100) : 0}%` })),
        h('span', { class: 'texto-suave', text: `${feitos} de ${plural(total, 'bloco', 'blocos')} feitos` })));

    const aviso = atrasados.length ? h('section', { class: 'cartao cr-atrasados', role: 'status' },
      h('p', {}, h('strong', { text: 'A vida aconteceu, tudo bem. ' }), `${plural(atrasados.length, 'bloco ficou', 'blocos ficaram')} para trás. O Diver reorganiza as próximas semanas para você.`),
      h('button', { type: 'button', class: 'botao botao--secundario', id: 'cr-redistribuir', onclick: () => {
        const res = G.redistribuir(paraGerador(p), plano.blocos, dia);
        plano.blocos = res.blocos;
        salvarEdicao();
        UI.toast('Plano reorganizado', res.fora.length ? `${plural(res.movidos, 'bloco foi', 'blocos foram')} para os próximos dias; ${plural(res.fora.length, 'revisão saiu', 'revisões saíram')} para caber.` : `${plural(res.movidos, 'bloco foi', 'blocos foram')} para os próximos dias.`, 'i-revisao');
        redesenhar();
      } }, icone('i-revisao'), 'Redistribuir')) : null;

    const hojeCartao = h('section', { class: 'cartao cr-hoje', id: 'cr-hoje', 'aria-labelledby': 'cr-hoje-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'cr-hoje-titulo', text: 'Hoje' }),
      doDia.length ? h('ol', { class: 'cr-hoje__lista' }, doDia.map((b) => {
        const titulo = tituloBloco({ ...b, nomeMateria: b.materia ? nomeMateria(p, b.materia) : undefined });
        const curso = cursoDo(b);
        return h('li', { class: `cr-hoje__item cr-bloco--${b.tipo} ${b.feito ? 'cr-bloco--feito' : ''}`.trim() },
          h('label', { class: 'cr-hoje__marcar' },
            h('input', { type: 'checkbox', checked: !!b.feito, onchange: (e) => marcar(b.id, e.target.checked, 'manual') }),
            h('span', { class: 'cr-bloco__texto' },
              h('span', { class: 'cr-bloco__titulo', text: titulo }),
              h('span', { class: 'cr-bloco__meta', text: `${b.hora} · ${b.dur >= 60 ? horas(b.dur) : `${b.dur} min`} · ${NOMES_TIPO[b.tipo]}` }))),
          h('div', { class: 'cr-hoje__acoes' },
            b.feito ? null : h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => Organizar.focarBloco({ id: b.id, titulo, minutos: Math.min(50, b.dur) }) }, icone('i-ampulheta'), 'Modo Foco'),
            curso ? h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => abrirCurso(b, curso) }, icone('i-livro'), b.tipo === 'revisao' ? 'Revisar no curso' : b.tipo === 'simulado' ? 'Simulado no curso' : 'Estudar no curso') : null));
      }))
        : h('p', { class: 'texto-suave', text: faltam <= 0 ? 'Sem blocos hoje.' : minutosDoDia(p, dia) ? 'Nada marcado para hoje. Que tal adiantar uma revisão?' : 'Hoje é dia de descanso. O cérebro também guarda o que aprendeu enquanto você descansa. 🌊' }),
      doDia.some((b) => !b.feito) ? h('p', { class: 'cr-foco-dica' }, icone('i-ampulheta'), h('span', { text: 'Use o Modo Foco: ele abre no tempo do bloco e marca como feito quando o tempo acaba.' })) : null);

    const vista = h('section', { class: 'cartao cr-plano', 'aria-labelledby': 'cr-plano-titulo' });
    const desenharVista = (salvo) => {
      if (salvo) salvarEdicao();
      vista.replaceChildren(h('h2', { class: 'cartao__titulo', id: 'cr-plano-titulo', text: 'Seu plano' }),
        semana(plano.blocos, { params: p, modo: 'plano', aoMudar: desenharVista }));
    };
    desenharVista(false);

    const perto = !plano.cobreAteAProva && G.diasEntre(dia, plano.fim) <= 21;
    const continuar = perto ? h('section', { class: 'cartao cr-continuar' },
      h('p', { text: `Seu plano vai até ${UI.formatarData(plano.fim, { day: '2-digit', month: 'long' })}. Quer que o Diver monte as próximas semanas?` }),
      h('button', { type: 'button', class: 'botao botao--secundario', onclick: () => {
        const res = G.gerar(paraGerador(p), G.somarDias(plano.fim, 1), { historico: plano.blocos });
        plano.blocos = [...plano.blocos, ...res.blocos];
        plano.fim = res.fim;
        plano.cobreAteAProva = res.cobreAteAProva;
        salvarEdicao();
        UI.toast('Plano continuado', `Mais ${plural(res.semanas, 'semana', 'semanas')} no seu cronograma.`, 'i-alvo');
        redesenhar();
      } }, icone('i-mais'), 'Continuar o plano')) : null;

    const ig = plano.integracao;
    const ajuste = (campo, texto) => h('label', { class: 'cr-escolha cr-escolha--linha' },
      h('input', { type: 'checkbox', id: `cr-aj-${campo}`, checked: !!ig[campo], onchange: (e) => {
        ig[campo] = e.target.checked;
        salvarEdicao();
        UI.toast(e.target.checked ? 'Adicionado' : 'Retirado', e.target.checked ? `O cronograma está ${campo === 'tarefas' ? 'nas suas Tarefas' : 'no seu Calendário'}.` : `O que o cronograma tinha criado ${campo === 'tarefas' ? 'nas Tarefas' : 'no Calendário'} saiu.`, campo === 'tarefas' ? 'i-colunas' : 'i-calendario');
      } }),
      h('span', { text: texto }));
    const ajustes = h('section', { class: 'cartao cr-ajustes', 'aria-labelledby': 'cr-ajustes-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'cr-ajustes-titulo', text: 'Ajustes' }),
      ajuste('tarefas', 'Mostrar nas minhas Tarefas'),
      ajuste('calendario', 'Mostrar no meu Calendário'),
      h('div', { class: 'acoes-linha' },
        h('button', { type: 'button', class: 'botao botao--secundario', id: 'cr-refazer', onclick: () => { novoRascunho(plano); redesenhar(); focarTitulo(); } }, icone('i-revisao'), 'Refazer com outras respostas'),
        h('button', { type: 'button', class: 'botao botao--fantasma', id: 'cr-apagar', onclick: () => apagar(plano) }, icone('i-lixo'), 'Apagar cronograma')));

    return [topo, aviso, hojeCartao, vista, continuar, ajustes].filter(Boolean);
  }

  function abrirCurso(b, curso) {
    App.definirTrilha(curso.trilha.id);
    if (b.tipo === 'revisao') App.irPara('revisao');
    else if (b.tipo === 'simulado') App.irPara('simulado');
    else App.abrirTrilha(curso.trilha.id, curso.fase ? { fase: curso.fase.id } : { proximaAula: true }); // o mapa abre já na aula
  }

  async function apagar(plano) {
    const ok = await UI.confirmar({
      titulo: 'Apagar o cronograma?',
      texto: 'O plano sai, junto com o que ele criou nas Tarefas e no Calendário. O que você já estudou continua nas suas estatísticas.\n\nQuando quiser, é só montar outro.',
      sim: 'Apagar cronograma', nao: 'Manter', perigo: true, humor: 'triste',
    });
    if (!ok) return;
    const origem = origemDe(plano);
    Organizar.removerEventos(origem);
    Quadros.removerOrigem(origem);
    Dados.remover(CHAVE);
    rascunho = null;
    semanaVista = null;
    UI.toast('Cronograma apagado', 'Quando quiser, a gente monta outro.', 'i-lixo');
    redesenhar();
  }

  /* =========================================================
     BLOCO FEITO, TAREFAS E CALENDÁRIO
     ========================================================= */
  /** Marca um bloco (do checkbox, do Modo Foco ou das Tarefas). Feito registra no log de atividade. */
  function marcar(id, feito, via) {
    const plano = ler();
    if (!plano) return;
    const b = plano.blocos.find((x) => x.id === id);
    if (!b || !!b.feito === feito) return;
    b.feito = feito;
    b.feitoEm = feito ? Date.now() : 0;
    gravar(plano);
    if (plano.integracao.tarefas && via !== 'tarefas') Quadros.marcarSubtarefa(origemDe(plano), id, feito);
    if (feito) {
      const curso = cursoDo(b);
      Atividade.registrar('bloco_concluido', curso ? curso.trilha.id : null, { materia: b.materia || 'simulado', tipo: b.tipo, minutos: b.dur, via, data: b.data });
      if (via !== 'tarefas') UI.toast('Bloco feito', 'Mandou bem, Diver!', 'i-check');
    }
    if (via !== 'tarefas') redesenhar();
  }
  const concluirBloco = (id, via = 'foco') => marcar(id, true, via);

  /** O que a pessoa marcou nas Tarefas (subtarefa feita ou cartão do dia concluído) vira bloco feito aqui. */
  function trazerFeitosDasTarefas(plano) {
    if (!plano.integracao || !plano.integracao.tarefas) return;
    const st = Quadros.estadoOrigem(origemDe(plano));
    plano.blocos.filter((b) => !b.feito && (st.feitas.has(b.id) || st.dias.has(b.data))).forEach((b) => marcar(b.id, true, 'tarefas'));
  }

  function eventosDoPlano(plano, desde) {
    const p = plano.params;
    const evs = plano.blocos.filter((b) => b.data >= desde).map((b) => {
      const curso = cursoDo(b);
      return { titulo: tituloBloco({ ...b, nomeMateria: b.materia ? nomeMateria(p, b.materia) : undefined }), tipo: 'estudo', data: b.data, hora: b.hora || '', trilhaId: curso ? curso.trilha.id : null, blocoId: b.id };
    });
    const ultimo = plano.cobreAteAProva ? G.somarDias(p.objetivo.data, -2) : plano.fim;
    for (let iso = desde; iso <= ultimo; iso = G.somarDias(iso, 1)) {
      if (!minutosDoDia(p, iso) && !plano.blocos.some((b) => b.data === iso)) evs.push({ titulo: 'Descanso', tipo: 'descanso', data: iso });
    }
    if (plano.cobreAteAProva) {
      const vespera = G.somarDias(p.objetivo.data, -1);
      if (vespera >= desde) evs.push({ titulo: 'Véspera: descanso e organização', tipo: 'descanso', data: vespera });
    }
    if (p.objetivo.data >= desde) evs.push({ titulo: p.objetivo.nome || 'Prova', tipo: 'prova', data: p.objetivo.data });
    return evs;
  }

  function tarefasDoPlano(plano, desde) {
    const p = plano.params;
    const porDia = {};
    plano.blocos.filter((b) => b.data >= desde).forEach((b) => (porDia[b.data] = porDia[b.data] || []).push(b));
    return Object.keys(porDia).sort().map((iso) => {
      const lista = porDia[iso].sort((a, b) => a.ordem - b.ordem);
      const nomes = [...new Set(lista.map((b) => (b.tipo === 'simulado' ? 'Simulado' : nomeMateria(p, b.materia))))];
      const min = lista.reduce((a, b) => a + (b.dur || 0), 0);
      return {
        titulo: `Estudo do dia (${horas(min)}): ${nomes.join(', ')}`,
        prazo: iso,
        notas: `Do seu cronograma "${p.objetivo.nome}". Comece cada bloco pelo Modo Foco (aba Cronograma).`,
        subtarefas: lista.map((b) => ({ id: b.id, titulo: `${b.hora} · ${tituloBloco({ ...b, nomeMateria: b.materia ? nomeMateria(p, b.materia) : undefined })} (${b.dur >= 60 ? horas(b.dur) : `${b.dur} min`})`, feita: !!b.feito })),
      };
    });
  }

  /** Refaz o que o cronograma criou nas Tarefas e no Calendário (de hoje em diante), ou tira, conforme os ajustes. */
  function sincronizar(plano) {
    const origem = origemDe(plano);
    const desde = hoje();
    if (plano.integracao.calendario) Organizar.sincronizarEventos(origem, eventosDoPlano(plano, desde), desde);
    else Organizar.removerEventos(origem);
    if (plano.integracao.tarefas) Quadros.sincronizarOrigem(origem, { nomeQuadro: `Cronograma: ${plano.params.objetivo.nome}`, desde, itens: tarefasDoPlano(plano, desde) });
    else Quadros.removerOrigem(origem);
  }

  /** Volta da Avaliação Diagnóstica: abre o passo "Suas matérias" com as notas novas (ou o assistente do começo). */
  function abrirComDiagnostico() {
    const plano = ler();
    if (!rascunho) {
      novoRascunho(plano);
      if (plano) rascunho.diagAplicada = null;
    }
    if (rascunho.params.objetivo.data) rascunho.passo = 2;
    else UI.toast('Notas guardadas', 'Responda a data e o seu tempo: no passo "Suas matérias", as notas da avaliação já entram.', 'i-alvo');
    App.irPara('cronograma');
  }

  return { render, concluirBloco, abrirComDiagnostico };
})();

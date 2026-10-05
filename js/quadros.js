/*
 * quadros.js — área "Tarefas": quadros com listas (colunas) e cartões.
 *
 *  - Quadro = conjunto de listas. Lista = coluna independente. Cartão = tarefa.
 *  - Cartão: subtarefas (com progresso 2/5), etiquetas coloridas (filtram o quadro),
 *    prazo (aparece no Calendário e no Início), notas com links e curso que recebe o XP.
 *  - Bolinha conclui a tarefa e ela desce para "Concluídas", no pé da lista.
 *  - Arrastar cartões entre listas e arrastar listas pelo cabeçalho (mouse ou toque longo).
 *  - Atalhos: Enter (nova tarefa), Shift+Enter (detalhes), Alt+Enter (concluir), Esc (fechar).
 *
 * Tudo fica em uma chave só (diver:v1:quadros), via localStorage com try/catch.
 * A chave antiga (diver:v1:tarefas, do Kanban de 4 colunas) é migrada sozinha.
 * XP de tarefa concluída passa pelo App -> Economia (uma vez por tarefa).
 */
const Quadros = (() => {
  const { h, icone, limpar } = UI;
  const CHAVE = 'diver:v1:quadros';
  const CHAVE_ANTIGA = 'diver:v1:tarefas';

  const CORES = { turquesa: 'Turquesa', azul: 'Azul', lilas: 'Lilás', coral: 'Coral', laranja: 'Laranja', amarelo: 'Amarelo', verde: 'Verde', cinza: 'Cinza' };
  const ORDENACOES = { manual: 'Minha ordem', prazo: 'Data do prazo', titulo: 'Título (A–Z)' };
  const LIMITES = { quadro: 60, lista: 60, titulo: 300, notas: 5000, sub: 200, etiqueta: 30 };

  /* =========================================================
     DADOS
     ========================================================= */
  function criarLista(d, nome, cor = 'turquesa') {
    const l = { id: UI.id('lista'), nome, cor, ordenacao: 'manual', tarefas: [] };
    d.listas[l.id] = l;
    return l;
  }

  function criarQuadro(d, nome, nomesListas) {
    const q = { id: UI.id('quadro'), nome, listas: [], ocultarConcluidas: false };
    nomesListas.forEach((n) => q.listas.push(criarLista(d, n).id));
    d.quadros.push(q);
    d.quadroAtual = q.id;
    return q;
  }

  function novaTarefa(titulo) {
    return { id: UI.id('tarefa'), titulo, notas: '', prazo: '', etiquetas: [], subtarefas: [], concluida: false, concluidaEm: 0, criadaEm: Date.now(), trilhaId: null, xpConcedido: false };
  }

  function padrao() {
    const d = { versao: 1, quadroAtual: null, quadros: [], listas: {}, tarefas: {}, etiquetas: [] };
    [['Urgente', 'coral'], ['Prova', 'lilas'], ['Leitura', 'azul'], ['Exercícios', 'amarelo']]
      .forEach(([nome, cor]) => d.etiquetas.push({ id: UI.id('etiqueta'), nome, cor }));
    criarQuadro(d, 'Quadro principal', ['A fazer', 'Fazendo', 'Revisar']);
    return d;
  }

  /** Confere e completa os dados (vale para o que veio do navegador, da nuvem ou de um arquivo). */
  function normalizar(bruto) {
    if (!bruto || typeof bruto !== 'object' || !Array.isArray(bruto.quadros)) return null;
    const texto = (v, max) => String(v === null || v === undefined ? '' : v).slice(0, max);
    const obj = (v) => (v && typeof v === 'object' ? v : {});
    const out = { versao: 1, quadroAtual: null, quadros: [], listas: {}, tarefas: {}, etiquetas: [] };

    (Array.isArray(bruto.etiquetas) ? bruto.etiquetas : []).forEach((e) => {
      if (!e || !e.id || out.etiquetas.some((x) => x.id === String(e.id))) return;
      out.etiquetas.push({ id: String(e.id), nome: texto(e.nome, LIMITES.etiqueta) || 'Etiqueta', cor: CORES[e.cor] ? e.cor : 'turquesa' });
    });
    const etiquetasOk = new Set(out.etiquetas.map((e) => e.id));
    const listasBrutas = obj(bruto.listas);
    const tarefasBrutas = obj(bruto.tarefas);

    bruto.quadros.forEach((q) => {
      if (!q || !q.id || out.quadros.some((x) => x.id === String(q.id))) return;
      const nq = { id: String(q.id), nome: texto(q.nome, LIMITES.quadro) || 'Quadro', listas: [], ocultarConcluidas: !!q.ocultarConcluidas, ...(q.origem ? { origem: texto(q.origem, 80) } : {}) };
      (Array.isArray(q.listas) ? q.listas : []).forEach((lidBruto) => {
        const lid = String(lidBruto);
        const l = listasBrutas[lid];
        if (!l || out.listas[lid]) return;
        const nl = { id: lid, nome: texto(l.nome, LIMITES.lista) || 'Lista', cor: CORES[l.cor] ? l.cor : 'turquesa', ordenacao: ORDENACOES[l.ordenacao] ? l.ordenacao : 'manual', tarefas: [] };
        (Array.isArray(l.tarefas) ? l.tarefas : []).forEach((tidBruto) => {
          const tid = String(tidBruto);
          const t = tarefasBrutas[tid];
          if (!t || out.tarefas[tid]) return;
          out.tarefas[tid] = {
            id: tid,
            titulo: texto(t.titulo, LIMITES.titulo) || 'Sem título',
            notas: texto(t.notas, LIMITES.notas),
            prazo: /^\d{4}-\d{2}-\d{2}$/.test(t.prazo || '') ? t.prazo : '',
            etiquetas: (Array.isArray(t.etiquetas) ? t.etiquetas : []).map(String).filter((e, i, a) => etiquetasOk.has(e) && a.indexOf(e) === i),
            subtarefas: (Array.isArray(t.subtarefas) ? t.subtarefas : []).filter((s) => s && s.id).map((s) => ({ id: String(s.id), titulo: texto(s.titulo, LIMITES.sub), feita: !!s.feita })),
            concluida: !!t.concluida,
            concluidaEm: Number(t.concluidaEm) || 0,
            criadaEm: Number(t.criadaEm) || Date.now(),
            trilhaId: t.trilhaId ? String(t.trilhaId) : null,
            xpConcedido: !!t.xpConcedido,
            ...(t.origem ? { origem: texto(t.origem, 80) } : {}), // quem criou (ex.: "cronograma:<id>"), para apagar tudo de uma vez
          };
          nl.tarefas.push(tid);
        });
        out.listas[lid] = nl;
        nq.listas.push(lid);
      });
      out.quadros.push(nq);
    });
    if (!out.quadros.length) return null;
    out.quadroAtual = out.quadros.some((q) => q.id === bruto.quadroAtual) ? bruto.quadroAtual : out.quadros[0].id;
    return out;
  }

  /** Traz as tarefas do Kanban antigo (4 colunas) para o quadro principal. */
  function migrar(d, antigas) {
    const q = d.quadros[0];
    const nomes = { afazer: 'A fazer', fazendo: 'Fazendo', revisar: 'Revisar', feito: 'A fazer' };
    antigas
      .filter((t) => t && t.id && t.titulo && !d.tarefas[t.id])
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .forEach((t) => {
        const nome = nomes[t.status] || 'A fazer';
        let lista = q.listas.map((id) => d.listas[id]).find((l) => l.nome === nome);
        if (!lista) {
          lista = criarLista(d, nome);
          q.listas.push(lista.id);
        }
        const etiquetas = [];
        if (t.prioridade === 'alta') {
          let urgente = d.etiquetas.find((e) => e.nome === 'Urgente');
          if (!urgente) d.etiquetas.push((urgente = { id: UI.id('etiqueta'), nome: 'Urgente', cor: 'coral' }));
          etiquetas.push(urgente.id);
        }
        const feita = t.status === 'feito';
        d.tarefas[t.id] = {
          ...novaTarefa(String(t.titulo).slice(0, LIMITES.titulo)),
          id: String(t.id),
          prazo: /^\d{4}-\d{2}-\d{2}$/.test(t.prazo || '') ? t.prazo : '',
          etiquetas,
          concluida: feita,
          concluidaEm: feita ? Date.now() : 0,
          criadaEm: t.criadaEm || Date.now(),
          trilhaId: t.trilhaId || null,
          xpConcedido: !!t.xpConcedido,
        };
        lista.tarefas.push(String(t.id));
      });
  }

  // Guardamos uma cópia em memória: se o navegador não deixar salvar, o quadro segue funcionando nesta aba.
  let cache = null;
  let cacheTexto = null;
  function lerTexto() {
    try {
      return localStorage.getItem(CHAVE);
    } catch (e) {
      return null;
    }
  }

  function ler() {
    const texto = lerTexto();
    const antigas = Dados.ler(CHAVE_ANTIGA, null);
    if (cache && texto === cacheTexto && !Array.isArray(antigas)) return cache;
    let d = null;
    try {
      d = texto ? normalizar(JSON.parse(texto)) : null;
    } catch (e) {
      d = null;
    }
    // sem armazenamento, vale a cópia em memória; se a chave sumiu (saiu da conta), começa do zero
    if (!d) d = texto === null && cacheTexto === null && cache ? cache : padrao();
    if (Array.isArray(antigas)) migrar(d, antigas);
    salvar(d);
    if (Array.isArray(antigas) && lerTexto()) Dados.remover(CHAVE_ANTIGA);
    return d;
  }

  function salvar(d) {
    cache = d;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(d));
    } catch (e) {
      console.warn('Não foi possível salvar as tarefas', e);
    }
    cacheTexto = lerTexto();
  }

  const quadroAtual = (d) => d.quadros.find((q) => q.id === d.quadroAtual) || d.quadros[0];
  const listaDe = (d, tid) => Object.values(d.listas).find((l) => l.tarefas.includes(tid));
  const quadroDaLista = (d, lid) => d.quadros.find((q) => q.listas.includes(lid));

  function situacaoPrazo(prazo) {
    if (!prazo) return null;
    const hoje = UI.dataLocal();
    if (prazo < hoje) return 'atrasada';
    if (prazo === hoje) return 'hoje';
    return 'futura';
  }

  function nomeTrilha(id) {
    const t = App.trilhas().find((x) => x.id === id);
    return t ? t.nome : '';
  }

  function ordenar(lista, tarefas) {
    const copia = [...tarefas];
    if (lista.ordenacao === 'prazo') return copia.sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
    if (lista.ordenacao === 'titulo') return copia.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' }));
    return copia;
  }

  /** Tira a tarefa de onde está e coloca na lista de destino (antes/depois de outra, ou no fim). */
  function moverTarefa(d, tid, destinoId, { antesDe = null, depoisDe = null, noTopo = false } = {}) {
    const origem = listaDe(d, tid);
    if (origem) origem.tarefas.splice(origem.tarefas.indexOf(tid), 1);
    const dest = d.listas[destinoId];
    let pos = dest.tarefas.length;
    if (noTopo) pos = 0;
    else if (antesDe && dest.tarefas.includes(antesDe)) pos = dest.tarefas.indexOf(antesDe);
    else if (depoisDe && dest.tarefas.includes(depoisDe)) pos = dest.tarefas.indexOf(depoisDe) + 1;
    dest.tarefas.splice(pos, 0, tid);
  }

  /** Lista ordenada por prazo/título vira "minha ordem" mantendo o que a pessoa está vendo. */
  function fixarOrdem(d, lista) {
    if (lista.ordenacao === 'manual') return false;
    const todas = lista.tarefas.map((id) => d.tarefas[id]);
    lista.tarefas = [...ordenar(lista, todas.filter((t) => !t.concluida)), ...todas.filter((t) => t.concluida)].map((t) => t.id);
    lista.ordenacao = 'manual';
    return true;
  }

  /* =========================================================
     ESTADO DA TELA
     ========================================================= */
  const estado = {
    busca: '',
    etiquetas: [], // filtro por etiqueta (ids)
    concluidasAbertas: {}, // lista -> seção "Concluídas" aberta
    adicionando: null, // lista com o campo "Adicionar uma tarefa" aberto
    novaLista: false,
    detalhe: null, // tarefa aberta no painel
    editandoEtiquetas: false,
    pendente: null, // tarefa para abrir quando a tela carregar (vinda do Calendário)
    semCliqueAte: 0,
  };
  let raiz = null;
  let cabeca = null;
  let filtros = null;
  let area = null;
  let aviso = null;

  /** Avisa leitores de tela sobre o que mudou (mover, concluir...). */
  function anunciar(texto) {
    if (!aviso) return;
    aviso.textContent = '';
    setTimeout(() => (aviso.textContent = texto), 30);
  }

  /** Aplica uma mudança nos dados, salva e redesenha. */
  function mudar(fn, { foco, detalhe = true } = {}) {
    const d = ler();
    const r = fn(d);
    salvar(d);
    desenharTudo(foco);
    if (detalhe && estado.detalhe) desenharDetalhe();
    return r;
  }

  /* =========================================================
     TELA
     ========================================================= */
  function render(secao) {
    raiz = secao;
    fecharMenu(false);
    limpar(secao);
    cabeca = h('header', { class: 'area-cabeca qd-cabeca' });
    filtros = h('div', { class: 'qd-filtros' });
    area = h('div', { class: 'qd', role: 'region', 'aria-label': 'Listas do quadro', onkeydown: teclasQuadro });
    aviso = h('p', { class: 'visualmente-oculto', 'aria-live': 'polite' });
    secao.append(cabeca, filtros, area, ajudaTeclado(), aviso);
    estado.adicionando = null;
    estado.novaLista = false;

    const pendente = estado.pendente;
    estado.pendente = null;
    if (pendente) {
      const d = ler();
      const lista = listaDe(d, pendente);
      const q = lista && quadroDaLista(d, lista.id);
      if (q && d.quadroAtual !== q.id) {
        d.quadroAtual = q.id;
        salvar(d);
      }
    }
    desenharTudo();
    if (pendente) abrirDetalhe(pendente);
    else if (estado.detalhe) fecharDetalhe(false);
  }

  function desenharTudo(foco) {
    if (!raiz || !document.body.contains(raiz)) return;
    const d = ler();
    desenharCabeca(d);
    desenharFiltros(d);
    desenharListas(foco);
  }

  /* ---------- Cabeçalho: quadros, nome do quadro, ajustes ---------- */
  function desenharCabeca(d) {
    const q = quadroAtual(d);
    limpar(cabeca).append(
      h('span', { class: 'rotulo', text: 'Organizar · Tarefas' }),
      h('div', { class: 'qd-cabeca__linha' },
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Seus quadros: trocar ou criar', title: 'Seus quadros', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'data-foco': 'quadros', onclick: (e) => menuQuadros(e.currentTarget) }, icone('i-colunas')),
        h('h1', { tabindex: '-1', class: 'qd-cabeca__titulo' },
          h('button', { type: 'button', class: 'qd-titulo', title: 'Clique para renomear o quadro', 'data-foco': 'titulo-quadro', onclick: (e) => renomearQuadro(e.currentTarget) }, q.nome)),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Ajustes do quadro', title: 'Ajustes do quadro', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-foco': 'ajustes', onclick: (e) => menuAjustes(e.currentTarget) }, icone('i-engrenagem'))));
  }

  function renomearQuadro(botao) {
    const d = ler();
    const q = quadroAtual(d);
    editarNoLugar(botao, q.nome, LIMITES.quadro, 'Nome do quadro', (nome) => mudar((dd) => (quadroAtual(dd).nome = nome), { foco: '[data-foco="titulo-quadro"]' }));
  }

  /** Troca um botão por um campo de texto; Enter salva, Esc desiste. */
  function editarNoLugar(el, valor, max, rotulo, aoSalvar) {
    const campo = h('input', { class: 'campo qd-editar', value: valor, maxlength: String(max), 'aria-label': rotulo });
    let feito = false;
    const concluir = (ok) => {
      if (feito) return;
      feito = true;
      const novo = campo.value.trim();
      if (ok && novo && novo !== valor) aoSalvar(novo);
      else desenharTudo(`[data-foco="${el.dataset.foco}"]`);
    };
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        concluir(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        concluir(false);
      }
    });
    campo.addEventListener('pointerdown', (e) => e.stopPropagation());
    campo.addEventListener('blur', () => concluir(true));
    el.replaceWith(campo);
    campo.focus();
    campo.select();
  }

  /* ---------- Filtros: busca e etiquetas ---------- */
  function desenharFiltros(d) {
    estado.etiquetas = estado.etiquetas.filter((id) => d.etiquetas.some((e) => e.id === id));
    const q = quadroAtual(d);
    const doQuadro = q.listas.flatMap((lid) => d.listas[lid].tarefas.map((id) => d.tarefas[id]));
    const abertas = doQuadro.filter((t) => !t.concluida);
    const atrasadas = abertas.filter((t) => situacaoPrazo(t.prazo) === 'atrasada').length;
    const limparBtn = h('button', { type: 'button', class: 'botao botao--link botao--pequeno', hidden: !(estado.busca || estado.etiquetas.length), onclick: () => {
      estado.busca = '';
      estado.etiquetas = [];
      desenharTudo();
      anunciar('Filtros limpos.');
    } }, icone('i-x'), 'Limpar filtros');
    const atualizarLimpar = () => (limparBtn.hidden = !(estado.busca || estado.etiquetas.length));

    const busca = h('input', { class: 'campo qd-busca__campo', type: 'search', value: estado.busca, placeholder: 'Buscar neste quadro', 'aria-label': 'Buscar tarefas neste quadro', 'data-foco': 'busca', oninput: (e) => {
      estado.busca = e.target.value;
      atualizarLimpar();
      desenharListas();
    } });

    limpar(filtros).append(...[
      h('label', { class: 'qd-busca' }, icone('i-lupa'), busca),
      d.etiquetas.length
        ? h('div', { class: 'qd-filtro-etiquetas', role: 'group', 'aria-label': 'Filtrar por etiqueta' },
          icone('i-etiqueta', 'qd-filtro-etiquetas__icone'),
          d.etiquetas.map((e) => h('button', {
            type: 'button', class: `qd-etiqueta cor-${e.cor}`, 'aria-pressed': String(estado.etiquetas.includes(e.id)), 'data-foco': `filtro-${e.id}`,
            onclick: (ev) => {
              const i = estado.etiquetas.indexOf(e.id);
              if (i >= 0) estado.etiquetas.splice(i, 1);
              else estado.etiquetas.push(e.id);
              ev.currentTarget.setAttribute('aria-pressed', String(i < 0));
              atualizarLimpar();
              desenharListas();
            },
          }, e.nome)))
        : null,
      limparBtn,
      h('p', { class: 'qd-resumo', text: `${UI.plural(abertas.length, 'aberta', 'abertas')}${atrasadas ? ` · ${UI.plural(atrasadas, 'atrasada', 'atrasadas')}` : ''}` }),
    ].filter(Boolean));
  }

  function passaFiltro(t) {
    if (estado.etiquetas.length && !estado.etiquetas.some((e) => t.etiquetas.includes(e))) return false;
    if (estado.busca.trim()) {
      const alvo = UI.normalizar([t.titulo, t.notas, ...t.subtarefas.map((s) => s.titulo)].join(' '));
      if (!alvo.includes(UI.normalizar(estado.busca))) return false;
    }
    return true;
  }

  /* ---------- Listas (colunas) ---------- */
  function lembrarFoco() {
    const a = document.activeElement;
    if (!a || !area.contains(a)) return null;
    if (a.dataset.foco) return `[data-foco="${a.dataset.foco}"]`;
    const c = a.closest('.qd-tarefa');
    return c ? `.qd-tarefa[data-id="${c.dataset.id}"]` : null;
  }

  function desenharListas(foco) {
    if (!area) return;
    const guardado = foco === undefined ? lembrarFoco() : foco;
    const rolagem = area.scrollLeft;
    area.querySelectorAll('.qd-concluidas').forEach((c) => (estado.concluidasAbertas[c.dataset.lista] = c.open));
    const d = ler();
    const q = quadroAtual(d);
    limpar(area);
    q.listas.forEach((lid, i) => area.append(coluna(d, q, d.listas[lid], i)));
    area.append(colunaNovaLista());
    area.scrollLeft = rolagem;
    if (guardado) {
      const el = document.querySelector(guardado);
      if (el) el.focus({ preventScroll: false });
    }
  }

  function coluna(d, q, lista, indice) {
    const todas = lista.tarefas.map((id) => d.tarefas[id]);
    const abertasTodas = todas.filter((t) => !t.concluida);
    const abertas = ordenar(lista, abertasTodas).filter(passaFiltro);
    const feitas = q.ocultarConcluidas ? [] : todas.filter((t) => t.concluida).sort((a, b) => b.concluidaEm - a.concluidaEm).filter(passaFiltro);
    const filtrando = !!(estado.busca.trim() || estado.etiquetas.length);

    const cab = h('div', { class: 'qd-lista__cabeca', title: 'Arraste para mudar a lista de lugar' },
      h('h2', { class: 'qd-lista__titulo' },
        h('button', { type: 'button', class: 'qd-lista__nome', 'data-foco': `nome-${lista.id}`, 'aria-label': `Lista ${lista.nome}: renomear`, onclick: (e) => {
          if (Date.now() < estado.semCliqueAte) return;
          editarNoLugar(e.currentTarget, lista.nome, LIMITES.lista, 'Nome da lista', (nome) => mudar((dd) => (dd.listas[lista.id].nome = nome), { foco: `[data-foco="nome-${lista.id}"]` }));
        } }, lista.nome)),
      h('span', { class: 'contador', title: 'Tarefas abertas', text: filtrando ? `${abertas.length}/${abertasTodas.length}` : String(abertasTodas.length) }),
      lista.ordenacao !== 'manual' ? h('span', { class: 'qd-lista__ordem', title: `Ordenada por ${ORDENACOES[lista.ordenacao].toLowerCase()}` }, icone('i-filtro')) : null,
      h('button', { type: 'button', class: 'botao-icone botao-icone--mini qd-lista__menu', 'aria-label': `Opções da lista ${lista.nome}`, 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-foco': `menu-${lista.id}`, onclick: (e) => menuLista(e.currentTarget, lista.id, indice) }, icone('i-pontos')));
    cab.addEventListener('pointerdown', (e) => arrastarLista(e, lista.id));

    const ul = h('ul', { class: 'qd-lista__tarefas', 'aria-label': `Tarefas de ${lista.nome}` }, abertas.map((t) => cartao(d, t)));
    let vazio = null;
    if (!abertas.length) {
      vazio = filtrando
        ? h('p', { class: 'qd-vazio', text: 'Nada por aqui com esses filtros.' })
        : h('div', { class: 'qd-vazio' },
          h('strong', { text: abertasTodas.length || feitas.length ? 'Tudo em dia por aqui!' : 'Nenhuma tarefa ainda' }),
          h('span', { text: abertasTodas.length || feitas.length ? 'Maré calma nesta lista.' : 'Use “Adicionar uma tarefa” aqui em cima para começar.' }));
    }

    return h('section', { class: `qd-lista cor-${lista.cor}`, 'data-lista': lista.id, 'aria-label': lista.nome },
      cab,
      adicionarTarefa(lista),
      ul, vazio,
      feitas.length
        ? h('details', { class: 'qd-concluidas', 'data-lista': lista.id, open: !!estado.concluidasAbertas[lista.id] },
          h('summary', { 'data-foco': `concluidas-${lista.id}` }, icone('i-seta-dir', 'qd-concluidas__seta'), `Concluídas (${feitas.length})`),
          h('ul', { class: 'qd-lista__tarefas qd-lista__tarefas--feitas', 'aria-label': `Concluídas de ${lista.nome}` }, feitas.map((t) => cartao(d, t))))
        : null);
  }

  function adicionarTarefa(lista) {
    if (estado.adicionando !== lista.id) {
      return h('button', { type: 'button', class: 'qd-adicionar', 'data-foco': `adicionar-${lista.id}`, onclick: () => {
        estado.adicionando = lista.id;
        desenharListas(`[data-foco="campo-${lista.id}"]`);
      } }, h('span', { class: 'qd-adicionar__mais' }, icone('i-mais')), 'Adicionar uma tarefa');
    }
    const campo = h('input', { class: 'campo qd-adicionar__campo', maxlength: String(LIMITES.titulo), placeholder: 'Título da tarefa e Enter', 'aria-label': `Nova tarefa em ${lista.nome}`, 'data-foco': `campo-${lista.id}`, enterkeyhint: 'done' });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const titulo = campo.value.trim();
        if (!titulo) return;
        const t = novaTarefa(titulo);
        mudar((d) => {
          d.tarefas[t.id] = t;
          d.listas[lista.id].tarefas.unshift(t.id);
        }, { foco: `[data-foco="campo-${lista.id}"]` });
        anunciar(`Tarefa criada em ${lista.nome}.`);
        if (e.shiftKey) abrirDetalhe(t.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        estado.adicionando = null;
        desenharListas(`[data-foco="adicionar-${lista.id}"]`);
      }
    });
    campo.addEventListener('blur', () => setTimeout(() => {
      if (!campo.isConnected || document.activeElement === campo) return;
      if (!campo.value.trim() && estado.adicionando === lista.id) {
        estado.adicionando = null;
        desenharListas(null);
      }
    }, 150));
    return h('div', { class: 'qd-adicionar qd-adicionar--aberto' }, h('span', { class: 'qd-adicionar__mais' }, icone('i-mais')), campo);
  }

  function colunaNovaLista() {
    if (!estado.novaLista) {
      return h('div', { class: 'qd-nova-lista' },
        h('button', { type: 'button', class: 'qd-nova-lista__botao', 'data-foco': 'nova-lista', onclick: () => {
          estado.novaLista = true;
          desenharListas('[data-foco="campo-nova-lista"]');
        } }, icone('i-mais'), 'Adicionar nova lista'));
    }
    const campo = h('input', { class: 'campo', maxlength: String(LIMITES.lista), placeholder: 'Nome da lista', 'aria-label': 'Nome da nova lista', 'data-foco': 'campo-nova-lista' });
    const criar = () => {
      const nome = campo.value.trim();
      if (!nome) return campo.focus();
      let nova = null;
      estado.novaLista = false;
      mudar((d) => {
        nova = criarLista(d, nome, Object.keys(CORES)[quadroAtual(d).listas.length % 7]);
        quadroAtual(d).listas.push(nova.id);
      }, { foco: null });
      estado.adicionando = nova.id;
      desenharListas(`[data-foco="campo-${nova.id}"]`);
      area.scrollLeft = area.scrollWidth;
      anunciar(`Lista ${nome} criada.`);
    };
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        criar();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        estado.novaLista = false;
        desenharListas('[data-foco="nova-lista"]');
      }
    });
    return h('div', { class: 'qd-nova-lista qd-nova-lista--aberta' }, campo,
      h('div', { class: 'qd-nova-lista__acoes' },
        h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: criar }, 'Criar lista'),
        h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => {
          estado.novaLista = false;
          desenharListas('[data-foco="nova-lista"]');
        } }, 'Cancelar')));
  }

  /* ---------- Cartão ---------- */
  function cartao(d, t) {
    const sit = t.concluida ? null : situacaoPrazo(t.prazo);
    const subFeitas = t.subtarefas.filter((s) => s.feita).length;
    const etiquetas = t.etiquetas.map((id) => d.etiquetas.find((e) => e.id === id)).filter(Boolean);
    const partesPrazo = { atrasada: 'Atrasada · ', hoje: 'Hoje · ' };
    const meta = [
      t.prazo ? h('span', { class: `chip chip--mini chip--${sit || 'ok'}` }, icone('i-calendario'), `${partesPrazo[sit] || ''}${UI.formatarData(t.prazo)}`) : null,
      t.subtarefas.length ? h('span', { class: `qd-sub ${subFeitas === t.subtarefas.length ? 'qd-sub--completa' : ''}`, title: 'Subtarefas' },
        icone('i-lista-check'), `${subFeitas}/${t.subtarefas.length}`,
        h('span', { class: 'qd-sub__barra', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.round((subFeitas / t.subtarefas.length) * 100)}%` }))) : null,
      t.notas.trim() ? h('span', { class: 'qd-tarefa__icone', title: 'Tem notas' }, icone('i-nota')) : null,
      t.trilhaId && nomeTrilha(t.trilhaId) ? h('span', { class: 'chip chip--mini', text: nomeTrilha(t.trilhaId) }) : null,
    ].filter(Boolean);

    const li = h('li', {
      class: `qd-tarefa ${t.concluida ? 'qd-tarefa--feita' : ''} ${sit === 'atrasada' ? 'qd-tarefa--atrasada' : ''}`,
      'data-id': t.id, tabindex: '0',
      'aria-label': [t.titulo, t.concluida ? 'concluída' : '', t.prazo ? `prazo ${UI.formatarData(t.prazo, { day: 'numeric', month: 'long' })}${sit === 'atrasada' ? ', atrasada' : ''}` : '',
        t.subtarefas.length ? `${subFeitas} de ${t.subtarefas.length} subtarefas` : '', etiquetas.map((e) => e.nome).join(', ')].filter(Boolean).join('; '),
      onclick: (e) => {
        if (Date.now() < estado.semCliqueAte || e.target.closest('.qd-circulo')) return;
        abrirDetalhe(t.id);
      },
    },
    h('button', { type: 'button', class: 'qd-circulo', 'aria-pressed': String(t.concluida), tabindex: '-1', title: t.concluida ? 'Reabrir' : 'Concluir', 'aria-label': t.concluida ? `Reabrir "${t.titulo}"` : `Concluir "${t.titulo}"`, onclick: () => alternarConcluida(t.id) }, icone('i-check')),
    h('div', { class: 'qd-tarefa__corpo' },
      etiquetas.length ? h('div', { class: 'qd-tarefa__etiquetas' }, etiquetas.map((e) => h('span', { class: `qd-etiqueta qd-etiqueta--mini cor-${e.cor}`, text: e.nome }))) : null,
      h('span', { class: 'qd-tarefa__titulo', text: t.titulo }),
      meta.length ? h('div', { class: 'qd-tarefa__meta' }, meta) : null));
    li.addEventListener('pointerdown', (e) => arrastarTarefa(e, t.id));
    return li;
  }

  /* ---------- Ações ---------- */
  function alternarConcluida(id) {
    const d0 = ler();
    const t0 = d0.tarefas[id];
    if (!t0) return;
    // se o foco estava no cartão, ele passa para o vizinho (o cartão desce para "Concluídas")
    let foco;
    const el = area && area.querySelector(`.qd-tarefa[data-id="${id}"]`);
    if (el && el.contains(document.activeElement)) {
      const vizinho = el.nextElementSibling || el.previousElementSibling;
      foco = vizinho && vizinho.dataset.id ? `.qd-tarefa[data-id="${vizinho.dataset.id}"]` : `[data-foco="adicionar-${listaDe(d0, id).id}"]`;
    }
    let ganhou = null;
    // o XP vai para o curso da tarefa ou, sem ele, para o curso atual; sem nenhum, fica para depois
    const temCurso = (t) => (t.trilhaId && App.trilhas().some((x) => x.id === t.trilhaId)) || !!App.trilhaAtual();
    const concluiu = mudar((d) => {
      const t = d.tarefas[id];
      t.concluida = !t.concluida;
      t.concluidaEm = t.concluida ? Date.now() : 0;
      if (t.concluida && !t.xpConcedido && temCurso(t)) {
        t.xpConcedido = true;
        ganhou = t;
      }
      return t.concluida;
    }, { foco });
    if (ganhou) App.concederXP(App.trilhas().some((x) => x.id === ganhou.trilhaId) ? ganhou.trilhaId : null, Economia.CONFIG.tarefa, 'Mandou bem, Diver!');
    else if (concluiu) UI.toast('Tarefa concluída', 'Ela desceu para "Concluídas".', 'i-check');
    anunciar(concluiu ? `"${t0.titulo}" concluída.` : `"${t0.titulo}" reaberta.`);
  }

  async function excluirTarefa(id) {
    const t = ler().tarefas[id];
    if (!t || !(await UI.confirmar({ titulo: 'Excluir esta tarefa?', texto: `"${t.titulo}" sai de vez. Não dá para desfazer.`, sim: 'Excluir tarefa', perigo: true, humor: 'triste' }))) return false;
    const d = ler();
    if (!d.tarefas[id]) return false;
    fecharDetalhe(false);
    mudar((dd) => {
      const l = listaDe(dd, id);
      if (l) l.tarefas.splice(l.tarefas.indexOf(id), 1);
      delete dd.tarefas[id];
    }, { foco: null });
    UI.toast('Tarefa excluída', t.titulo, 'i-lixo');
    return true;
  }

  function trocarQuadro(id) {
    estado.busca = '';
    estado.etiquetas = [];
    estado.adicionando = null;
    mudar((d) => (d.quadroAtual = id), { foco: '[data-foco="titulo-quadro"]' });
    anunciar(`Quadro ${quadroAtual(ler()).nome} aberto.`);
  }

  /* =========================================================
     MENUS (quadros, ajustes, lista)
     ========================================================= */
  let menu = null;

  function fecharMenu(devolverFoco = true) {
    if (!menu) return;
    const { el, ancora } = menu;
    menu = null;
    el.remove();
    ancora.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', foraDoMenu, true);
    window.removeEventListener('resize', fecharSemFoco);
    window.removeEventListener('scroll', rolouFora, true);
    if (devolverFoco && document.body.contains(ancora)) ancora.focus();
  }
  const fecharSemFoco = () => fecharMenu(false);
  function foraDoMenu(e) {
    if (menu && !menu.el.contains(e.target) && !menu.ancora.contains(e.target)) fecharMenu(false);
  }
  function rolouFora(e) {
    // ignora a rolagem que o próprio navegador faz logo ao abrir (ex.: encaixe das colunas)
    if (menu && !menu.el.contains(e.target) && Date.now() - menu.abertoEm > 400) fecharMenu(false);
  }

  function focaveis(el) {
    return [...el.querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea, a[href], summary, [tabindex="0"]')].filter((x) => x.offsetParent !== null || x === document.activeElement);
  }

  /** Abre um menu flutuante perto do botão. itens: objetos {texto, icone, acao, perigo, marcado, desativado}, '-', {titulo} ou elementos. */
  function abrirMenu(ancora, itens, rotulo, papel = 'menu') {
    const mesmo = menu && menu.ancora === ancora;
    fecharMenu(false);
    if (mesmo) return;
    const el = h('div', { class: 'qd-menu', role: papel, 'aria-label': rotulo });
    itens.filter(Boolean).forEach((it) => {
      if (it === '-') el.append(h('div', { class: 'qd-menu__sep', role: 'separator' }));
      else if (it instanceof Node) el.append(it);
      else if (it.titulo) el.append(h('p', { class: 'qd-menu__titulo', text: it.titulo }));
      else {
        el.append(h('button', {
          type: 'button', class: `qd-menu__item ${it.perigo ? 'qd-menu__item--perigo' : ''}`, disabled: !!it.desativado,
          role: papel === 'menu' ? (it.marcado === undefined ? 'menuitem' : 'menuitemradio') : null,
          'aria-checked': papel === 'menu' && it.marcado !== undefined ? String(!!it.marcado) : null,
          'aria-current': papel !== 'menu' && it.marcado ? 'true' : null,
          onclick: () => {
            fecharMenu(!it.levaFoco);
            it.acao();
          },
        }, it.icone ? icone(it.icone) : h('span', { class: 'qd-menu__espaco' }), h('span', { class: 'qd-menu__texto', text: it.texto }),
        it.detalhe ? h('span', { class: 'qd-menu__detalhe', text: it.detalhe }) : null,
        it.marcado ? icone('i-check', 'qd-menu__marca') : null));
      }
    });
    el.addEventListener('keydown', (e) => {
      const lista = focaveis(el);
      const i = lista.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        fecharMenu();
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        lista[(i + (e.key === 'ArrowDown' ? 1 : -1) + lista.length) % lista.length].focus();
      } else if (e.key === 'Tab') {
        if ((e.shiftKey && i === 0) || (!e.shiftKey && i === lista.length - 1)) {
          e.preventDefault();
          fecharMenu();
        }
      }
    });
    document.body.append(el);
    const r = ancora.getBoundingClientRect();
    const w = el.offsetWidth;
    const alt = el.offsetHeight;
    const esquerda = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    let topo = r.bottom + 6;
    if (topo + alt > window.innerHeight - 8) topo = Math.max(8, r.top - alt - 6);
    el.style.left = `${esquerda}px`;
    el.style.top = `${topo}px`;
    ancora.setAttribute('aria-expanded', 'true');
    menu = { el, ancora, abertoEm: Date.now() };
    document.addEventListener('pointerdown', foraDoMenu, true);
    window.addEventListener('resize', fecharSemFoco);
    window.addEventListener('scroll', rolouFora, true);
    const primeiro = el.querySelector('[aria-current="true"], [aria-checked="true"], button:not([disabled]), input');
    if (primeiro) primeiro.focus();
  }

  function menuQuadros(ancora) {
    const d = ler();
    const campo = h('input', { class: 'campo', maxlength: String(LIMITES.quadro), placeholder: 'Ex.: Concurso, TCC, Inglês…', 'aria-label': 'Nome do novo quadro' });
    const form = h('form', { class: 'qd-menu__form', onsubmit: (e) => {
      e.preventDefault();
      const nome = campo.value.trim();
      if (!nome) return campo.focus();
      fecharMenu(false);
      estado.busca = '';
      estado.etiquetas = [];
      mudar((dd) => criarQuadro(dd, nome, ['Minhas tarefas']), { foco: null });
      const q = quadroAtual(ler());
      estado.adicionando = q.listas[0];
      desenharListas(`[data-foco="campo-${q.listas[0]}"]`);
      UI.toast('Quadro criado', `${nome}: já pode adicionar tarefas.`, 'i-colunas');
    } },
    h('label', { class: 'rotulo-campo', text: 'Novo quadro' }), h('div', { class: 'qd-menu__linha' }, campo, h('button', { type: 'submit', class: 'botao botao--primario botao--pequeno' }, icone('i-mais'), 'Criar')));
    abrirMenu(ancora, [
      { titulo: 'Seus quadros' },
      ...d.quadros.map((q) => ({
        texto: q.nome, icone: 'i-colunas', marcado: q.id === d.quadroAtual,
        detalhe: String(q.listas.reduce((n, lid) => n + d.listas[lid].tarefas.filter((id) => !d.tarefas[id].concluida).length, 0)),
        acao: () => trocarQuadro(q.id), levaFoco: true,
      })),
      '-', form,
    ], 'Seus quadros', 'dialog');
  }

  function menuAjustes(ancora) {
    const d = ler();
    const q = quadroAtual(d);
    abrirMenu(ancora, [
      { texto: 'Renomear quadro', icone: 'i-nota', levaFoco: true, acao: () => renomearQuadro(cabeca.querySelector('.qd-titulo')) },
      { texto: 'Nova lista', icone: 'i-mais', levaFoco: true, acao: () => {
        estado.novaLista = true;
        desenharListas('[data-foco="campo-nova-lista"]');
        area.scrollLeft = area.scrollWidth;
      } },
      { texto: q.ocultarConcluidas ? 'Mostrar concluídas' : 'Esconder concluídas', icone: 'i-check', acao: () => mudar((dd) => (quadroAtual(dd).ocultarConcluidas = !quadroAtual(dd).ocultarConcluidas)) },
      { texto: 'Gerenciar etiquetas', icone: 'i-etiqueta', levaFoco: true, acao: () => abrirEtiquetas(ancora) },
      '-',
      { texto: 'Exportar tarefas (JSON)', icone: 'i-download', acao: exportar },
      { texto: 'Importar tarefas (JSON)', icone: 'i-upload', acao: importar },
      { texto: 'Atalhos do teclado', icone: 'i-raio', levaFoco: true, acao: () => {
        const aj = raiz.querySelector('.qd-atalhos');
        aj.open = true;
        aj.querySelector('summary').focus();
        aj.scrollIntoView({ block: 'nearest' });
      } },
      '-',
      { texto: 'Excluir quadro', icone: 'i-lixo', perigo: true, desativado: d.quadros.length < 2, acao: excluirQuadro },
    ], 'Ajustes do quadro');
  }

  async function excluirQuadro() {
    const d = ler();
    const q = quadroAtual(d);
    if (d.quadros.length < 2) return;
    const n = q.listas.reduce((s, lid) => s + d.listas[lid].tarefas.length, 0);
    if (!(await UI.confirmar({ titulo: 'Excluir este quadro?', texto: `"${q.nome}" sai com ${UI.plural(q.listas.length, 'lista', 'listas')} e ${UI.plural(n, 'tarefa', 'tarefas')}. Não dá para desfazer.`, sim: 'Excluir quadro', perigo: true, humor: 'triste' }))) return;
    mudar((dd) => {
      const alvo = quadroAtual(dd);
      alvo.listas.forEach((lid) => {
        dd.listas[lid].tarefas.forEach((tid) => delete dd.tarefas[tid]);
        delete dd.listas[lid];
      });
      dd.quadros = dd.quadros.filter((x) => x.id !== alvo.id);
      dd.quadroAtual = dd.quadros[0].id;
    }, { foco: '[data-foco="titulo-quadro"]' });
    UI.toast('Quadro excluído', q.nome, 'i-lixo');
  }

  function menuLista(ancora, lid, indice) {
    const d = ler();
    const q = quadroAtual(d);
    const lista = d.listas[lid];
    const feitas = lista.tarefas.filter((id) => d.tarefas[id].concluida).length;
    const cores = h('div', { class: 'qd-cores', role: 'group', 'aria-label': 'Cor da lista' },
      Object.entries(CORES).map(([cor, nome]) => h('button', {
        type: 'button', class: `qd-cor cor-${cor}`, 'aria-label': nome, title: nome, 'aria-pressed': String(lista.cor === cor),
        onclick: () => {
          fecharMenu();
          mudar((dd) => (dd.listas[lid].cor = cor));
        },
      })));
    const ordenacoes = Object.entries(ORDENACOES).map(([o, nome]) => ({
      texto: nome, marcado: lista.ordenacao === o, icone: o === 'manual' ? 'i-colunas' : o === 'prazo' ? 'i-calendario' : 'i-filtro',
      acao: () => mudar((dd) => (dd.listas[lid].ordenacao = o)),
    }));
    abrirMenu(ancora, [
      { texto: 'Renomear lista', icone: 'i-nota', levaFoco: true, acao: () => {
        const nome = area.querySelector(`[data-foco="nome-${lid}"]`);
        if (nome) nome.click();
      } },
      { titulo: 'Cor' }, cores,
      { titulo: 'Ordenar por' }, ...ordenacoes,
      '-',
      { texto: 'Mover para a esquerda', icone: 'i-voltar', desativado: indice === 0, acao: () => moverLista(lid, -1) },
      { texto: 'Mover para a direita', icone: 'i-seta-dir', desativado: indice === q.listas.length - 1, acao: () => moverLista(lid, 1) },
      { texto: `Limpar concluídas${feitas ? ` (${feitas})` : ''}`, icone: 'i-check', desativado: !feitas, acao: async () => {
        if (!(await UI.confirmar({ titulo: 'Limpar as concluídas?', texto: `${UI.plural(feitas, 'tarefa concluída sai', 'tarefas concluídas saem')} de "${lista.nome}" de vez.`, sim: 'Limpar concluídas', perigo: true }))) return;
        mudar((dd) => {
          const l = dd.listas[lid];
          l.tarefas.filter((id) => dd.tarefas[id].concluida).forEach((id) => delete dd.tarefas[id]);
          l.tarefas = l.tarefas.filter((id) => dd.tarefas[id]);
        });
      } },
      '-',
      { texto: 'Excluir lista', icone: 'i-lixo', perigo: true, acao: () => excluirLista(lid) },
    ], `Opções da lista ${lista.nome}`);
  }

  function moverLista(lid, passo) {
    mudar((d) => {
      const q = quadroAtual(d);
      const i = q.listas.indexOf(lid);
      const j = i + passo;
      if (j < 0 || j >= q.listas.length) return;
      q.listas.splice(i, 1);
      q.listas.splice(j, 0, lid);
    }, { foco: `[data-foco="menu-${lid}"]` });
    anunciar('Lista movida.');
  }

  async function excluirLista(lid) {
    const d = ler();
    const l = d.listas[lid];
    const n = l.tarefas.length;
    if (!(await UI.confirmar({ titulo: 'Excluir esta lista?', texto: n ? `"${l.nome}" sai junto com ${UI.plural(n, 'tarefa', 'tarefas')}. Não dá para desfazer.` : `"${l.nome}" está vazia.`, sim: 'Excluir lista', perigo: true, humor: 'triste' }))) return;
    if (estado.detalhe && l.tarefas.includes(estado.detalhe)) fecharDetalhe(false);
    mudar((dd) => {
      dd.listas[lid].tarefas.forEach((id) => delete dd.tarefas[id]);
      delete dd.listas[lid];
      const q = quadroDaLista(dd, lid) || quadroAtual(dd);
      q.listas = q.listas.filter((x) => x !== lid);
    }, { foco: '[data-foco="nova-lista"]' });
    UI.toast('Lista excluída', l.nome, 'i-lixo');
  }

  /* ---------- Etiquetas ---------- */
  function editorEtiquetas(aoMudar) {
    const d = ler();
    const nome = h('input', { class: 'campo', maxlength: String(LIMITES.etiqueta), placeholder: 'Nova etiqueta', 'aria-label': 'Nome da nova etiqueta', 'data-foco': 'nova-etiqueta' });
    let cor = Object.keys(CORES)[d.etiquetas.length % 8];
    const seletor = (atual, aoEscolher, rotulo) => h('div', { class: 'qd-cores', role: 'group', 'aria-label': rotulo },
      Object.entries(CORES).map(([c, n]) => h('button', {
        type: 'button', class: `qd-cor qd-cor--mini cor-${c}`, 'aria-label': n, title: n, 'aria-pressed': String(atual === c),
        onclick: (e) => {
          e.currentTarget.parentNode.querySelectorAll('.qd-cor').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
          aoEscolher(c);
        },
      })));
    const criar = () => {
      const v = nome.value.trim();
      if (!v) return nome.focus();
      const dd = ler();
      if (dd.etiquetas.some((e) => e.nome.toLowerCase() === v.toLowerCase())) {
        UI.toast('Essa já existe', `A etiqueta "${v}" já está na lista.`, 'i-etiqueta');
        return nome.focus();
      }
      const nova = { id: UI.id('etiqueta'), nome: v, cor };
      dd.etiquetas.push(nova);
      salvar(dd);
      aoMudar(nova);
    };
    nome.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        criar();
      }
    });
    return h('div', { class: 'qd-etiquetas-editor' },
      h('ul', { class: 'qd-etiquetas-editor__lista' }, d.etiquetas.map((et) => h('li', {},
        h('span', { class: `qd-etiqueta cor-${et.cor}`, 'aria-hidden': 'true' }, ' '),
        h('input', { class: 'campo campo--compacto', value: et.nome, maxlength: String(LIMITES.etiqueta), 'aria-label': `Nome da etiqueta ${et.nome}`, onchange: (e) => {
          const v = e.target.value.trim();
          if (!v) return (e.target.value = et.nome);
          const dd = ler();
          dd.etiquetas.find((x) => x.id === et.id).nome = v;
          salvar(dd);
          aoMudar(null, true);
        } }),
        seletor(et.cor, (c) => {
          const dd = ler();
          dd.etiquetas.find((x) => x.id === et.id).cor = c;
          salvar(dd);
          aoMudar(null, true);
        }, `Cor da etiqueta ${et.nome}`),
        h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Excluir a etiqueta ${et.nome}`, onclick: async () => {
          const usos = Object.values(ler().tarefas).filter((t) => t.etiquetas.includes(et.id)).length;
          if (!(await UI.confirmar({ titulo: 'Excluir esta etiqueta?', texto: `"${et.nome}"${usos ? ` sai de ${UI.plural(usos, 'tarefa', 'tarefas')}.` : ' não está em nenhuma tarefa.'}`, sim: 'Excluir etiqueta', perigo: true }))) return;
          const dd = ler();
          dd.etiquetas = dd.etiquetas.filter((x) => x.id !== et.id);
          Object.values(dd.tarefas).forEach((t) => (t.etiquetas = t.etiquetas.filter((x) => x !== et.id)));
          salvar(dd);
          aoMudar(null);
        } }, icone('i-lixo'))))),
      h('div', { class: 'qd-etiquetas-editor__nova' }, nome, seletor(cor, (c) => (cor = c), 'Cor da nova etiqueta'),
        h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', onclick: criar }, icone('i-mais'), 'Criar')));
  }

  function abrirEtiquetas(ancora) {
    const desenhar = () => {
      const ancoraAtual = (cabeca && cabeca.querySelector('[data-foco="ajustes"]')) || ancora;
      const caixa = h('div', { class: 'qd-menu__bloco' }, h('p', { class: 'qd-menu__titulo', text: 'Etiquetas' }),
        editorEtiquetas((nova, soAtualizou) => {
          desenharTudo(null);
          if (soAtualizou) return;
          fecharMenu(false);
          desenhar();
          const campo = document.querySelector('.qd-menu [data-foco="nova-etiqueta"]');
          if (campo && nova) campo.focus();
        }));
      abrirMenu(ancoraAtual, [caixa], 'Gerenciar etiquetas', 'dialog');
    };
    desenhar();
  }

  /* ---------- Exportar e importar ---------- */
  function exportar() {
    const d = ler();
    const pacote = { app: 'Diver', tipo: 'tarefas', exportadoEm: new Date().toISOString(), ...d };
    UI.baixarArquivo(`diver-tarefas-${UI.dataLocal()}.json`, JSON.stringify(pacote, null, 2));
    UI.toast('Tarefas exportadas', 'O arquivo .json foi para os seus downloads.', 'i-download');
  }

  function importar() {
    const input = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    input.addEventListener('change', async () => {
      const arq = input.files && input.files[0];
      input.remove();
      if (!arq) return;
      let dados = null;
      try {
        dados = normalizar(JSON.parse(await arq.text()));
      } catch (e) {
        dados = null;
      }
      if (!dados) {
        UI.toast('Arquivo não reconhecido', 'Use um .json exportado pelas Tarefas do Diver.', 'i-x');
        return;
      }
      const n = Object.keys(dados.tarefas).length;
      if (!(await UI.confirmar({ titulo: `Importar ${UI.plural(dados.quadros.length, 'quadro', 'quadros')}?`, texto: `${UI.plural(n, 'tarefa', 'tarefas')} entram junto com as suas (nada é apagado).`, sim: 'Importar', foco: 'sim' }))) return;
      mudar((d) => {
        // ids novos para não misturar com o que já existe; etiquetas com o mesmo nome são reaproveitadas
        const mapaEt = {};
        dados.etiquetas.forEach((e) => {
          const igual = d.etiquetas.find((x) => x.nome.toLowerCase() === e.nome.toLowerCase());
          if (igual) mapaEt[e.id] = igual.id;
          else {
            const nova = { ...e, id: UI.id('etiqueta') };
            d.etiquetas.push(nova);
            mapaEt[e.id] = nova.id;
          }
        });
        let primeiro = null;
        dados.quadros.forEach((q) => {
          const nq = { ...q, id: UI.id('quadro'), listas: [] };
          q.listas.forEach((lid) => {
            const l = dados.listas[lid];
            const nl = { ...l, id: UI.id('lista'), tarefas: [] };
            l.tarefas.forEach((tid) => {
              const t = dados.tarefas[tid];
              const nt = { ...t, id: UI.id('tarefa'), etiquetas: t.etiquetas.map((e) => mapaEt[e]).filter(Boolean), subtarefas: t.subtarefas.map((s) => ({ ...s })) };
              d.tarefas[nt.id] = nt;
              nl.tarefas.push(nt.id);
            });
            d.listas[nl.id] = nl;
            nq.listas.push(nl.id);
          });
          d.quadros.push(nq);
          primeiro = primeiro || nq.id;
        });
        d.quadroAtual = primeiro;
      }, { foco: '[data-foco="titulo-quadro"]' });
      UI.toast('Tarefas importadas', `${UI.plural(dados.quadros.length, 'quadro novo', 'quadros novos')}. Troque pelo menu ☰.`, 'i-upload');
    });
    document.body.append(input);
    input.click();
  }

  /* =========================================================
     PAINEL DE DETALHES
     ========================================================= */
  let gaveta = null;
  let painel = null;
  let voltarPara = null;
  let timerQuadro = null;

  function abrirDetalhe(id) {
    const d = ler();
    if (!d.tarefas[id]) return;
    fecharMenu(false);
    const card = area && area.querySelector(`.qd-tarefa[data-id="${id}"]`);
    voltarPara = card ? `.qd-tarefa[data-id="${id}"]` : null;
    estado.detalhe = id;
    desenharDetalhe();
    const titulo = painel.querySelector('.qd-detalhe__titulo');
    if (titulo) titulo.focus();
  }

  function fecharDetalhe(devolverFoco = true) {
    estado.detalhe = null;
    clearTimeout(timerQuadro);
    document.removeEventListener('keydown', escForaDoPainel);
    if (gaveta) {
      gaveta.remove();
      gaveta = null;
      painel = null;
    }
    document.body.classList.remove('qd-travado');
    if (devolverFoco) {
      desenharTudo(null);
      const el = voltarPara && document.querySelector(voltarPara);
      if (el) el.focus();
    }
  }

  /** Redesenha o quadro atrás do painel sem pressa (enquanto a pessoa digita). */
  function atualizarQuadroDepois() {
    clearTimeout(timerQuadro);
    timerQuadro = setTimeout(() => desenharTudo(null), 250);
  }

  /** Salva uma mudança na tarefa aberta. redesenhar = refaz o painel (para mudanças de estrutura). */
  function mudarTarefa(fn, redesenhar = true) {
    const d = ler();
    const t = d.tarefas[estado.detalhe];
    if (!t) return;
    fn(t, d);
    salvar(d);
    if (redesenhar) {
      desenharTudo(null);
      desenharDetalhe();
    } else atualizarQuadroDepois();
  }

  function secao(titulo, iconeNome, ...filhos) {
    return h('section', { class: 'qd-detalhe__secao' },
      h('h3', { class: 'qd-detalhe__rotulo' }, icone(iconeNome), titulo), ...filhos);
  }

  function desenharDetalhe() {
    const d = ler();
    const t = d.tarefas[estado.detalhe];
    if (!t) return fecharDetalhe(false);
    const listaAtual = listaDe(d, t.id);

    let foco = null;
    if (painel && painel.contains(document.activeElement) && document.activeElement.dataset.foco) foco = document.activeElement.dataset.foco;
    const mais = painel && painel.querySelector('.qd-detalhe__mais');
    if (mais) estado.editandoEtiquetas = mais.open;
    if (!gaveta) {
      document.addEventListener('keydown', escForaDoPainel);
      painel = h('aside', { class: 'qd-detalhe', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'qd-detalhe-rotulo', onkeydown: teclasDetalhe });
      gaveta = h('div', { class: 'qd-gaveta' }, h('div', { class: 'qd-gaveta__fundo', onclick: () => fecharDetalhe() }), painel);
      document.body.append(gaveta);
      document.body.classList.add('qd-travado');
    }
    const rolagem = painel.scrollTop;

    // Título
    const titulo = h('textarea', { class: 'campo qd-detalhe__titulo', rows: '1', maxlength: String(LIMITES.titulo), 'aria-label': 'Título da tarefa', 'data-foco': 'titulo', value: t.titulo });
    const ajustarAltura = () => {
      titulo.style.height = 'auto';
      titulo.style.height = `${titulo.scrollHeight}px`;
    };
    titulo.addEventListener('input', () => {
      titulo.value = titulo.value.replace(/\n/g, ' ');
      ajustarAltura();
      const v = titulo.value.trim();
      if (v) mudarTarefa((x) => (x.titulo = v), false);
    });
    titulo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.altKey) {
        e.preventDefault();
        titulo.blur();
      }
    });
    titulo.addEventListener('blur', () => {
      if (!titulo.value.trim()) titulo.value = ler().tarefas[t.id] ? ler().tarefas[t.id].titulo : t.titulo;
    });

    // Lista (mover)
    const seletorLista = h('select', { 'aria-label': 'Lista da tarefa', 'data-foco': 'lista', onchange: (e) => {
      const destino = e.target.value;
      mudar((dd) => moverTarefa(dd, t.id, destino, { noTopo: true }), { foco: null });
      const dd = ler();
      anunciar(`Movida para ${dd.listas[destino].nome}.`);
    } },
    d.quadros.flatMap((q) => (d.quadros.length > 1
      ? h('optgroup', { label: q.nome }, q.listas.map((lid) => h('option', { value: lid, selected: lid === listaAtual.id, text: d.listas[lid].nome })))
      : q.listas.map((lid) => h('option', { value: lid, selected: lid === listaAtual.id, text: d.listas[lid].nome })))));

    // Prazo
    const sit = t.concluida ? null : situacaoPrazo(t.prazo);
    const amanha = UI.dataLocal(new Date(Date.now() + 864e5));
    const semana = UI.dataLocal(new Date(Date.now() + 7 * 864e5));
    const definirPrazo = (v) => mudarTarefa((x) => (x.prazo = v));
    const prazo = h('input', { class: 'campo', type: 'date', value: t.prazo, 'aria-label': 'Prazo', 'data-foco': 'prazo', onchange: (e) => definirPrazo(e.target.value) });

    // Subtarefas
    const subFeitas = t.subtarefas.filter((s) => s.feita).length;
    const novaSub = h('input', { class: 'campo', maxlength: String(LIMITES.sub), placeholder: 'Adicionar subtarefa e Enter', 'aria-label': 'Nova subtarefa', 'data-foco': 'nova-sub', enterkeyhint: 'done' });
    novaSub.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = novaSub.value.trim();
      if (!v) return;
      mudarTarefa((x) => x.subtarefas.push({ id: UI.id('sub'), titulo: v, feita: false }));
    });

    // Notas
    const notasVisual = t.notas.trim()
      ? h('div', { class: 'qd-notas', tabindex: '0', role: 'button', 'aria-label': 'Notas. Clique para editar', 'data-foco': 'notas-ver', onclick: (e) => {
        if (e.target.closest('a')) return;
        editarNotas();
      }, onkeydown: (e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          editarNotas();
        }
      } }, formatarNotas(t.notas))
      : h('button', { type: 'button', class: 'qd-notas qd-notas--vazia', 'data-foco': 'notas-ver', onclick: () => editarNotas() }, 'Escreva notas, cole links…');
    const blocoNotas = h('div', {}, notasVisual);
    function editarNotas() {
      const area2 = h('textarea', { class: 'campo campo--area qd-notas__campo', maxlength: String(LIMITES.notas), 'aria-label': 'Notas da tarefa', 'data-foco': 'notas', value: ler().tarefas[t.id].notas, placeholder: 'Links viram clicáveis. **negrito** e listas com "- " também funcionam.' });
      area2.addEventListener('input', () => mudarTarefa((x) => (x.notas = area2.value), false));
      // Saiu das notas clicando num espaço vazio: volta para a visualização (com links).
      // Se foi para outro campo ou botão do painel, deixa como está para não engolir o clique.
      area2.addEventListener('blur', (e) => {
        if (e.relatedTarget || !document.hasFocus()) return;
        setTimeout(() => {
          if (area2.isConnected && document.activeElement !== area2) desenharDetalhe();
        }, 0);
      });
      limpar(blocoNotas).append(area2, h('p', { class: 'qd-dica', text: 'Links viram clicáveis. Use **negrito** e listas com "- ".' }));
      area2.focus();
    }

    // Curso que recebe o XP
    const trilhas = App.trilhas();
    const seletorTrilha = h('select', { 'aria-label': 'Curso que recebe o XP', 'data-foco': 'trilha', onchange: (e) => mudarTarefa((x) => (x.trilhaId = e.target.value || null)) },
      h('option', { value: '', text: 'Curso atual (quando concluir)' }),
      trilhas.map((tr) => h('option', { value: tr.id, selected: tr.id === t.trilhaId, text: tr.nome })));

    limpar(painel).append(...[
      h('div', { class: 'qd-detalhe__topo' },
        h('span', { class: 'rotulo', id: 'qd-detalhe-rotulo', text: 'Detalhes da tarefa' }),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar detalhes (Esc)', title: 'Fechar (Esc)', 'data-foco': 'fechar', onclick: () => fecharDetalhe() }, icone('i-x'))),
      h('div', { class: 'qd-detalhe__cabeca' },
        h('button', { type: 'button', class: 'qd-circulo qd-circulo--grande', 'aria-pressed': String(t.concluida), 'data-foco': 'concluir', title: t.concluida ? 'Reabrir (Alt+Enter)' : 'Concluir (Alt+Enter)', 'aria-label': t.concluida ? 'Reabrir tarefa' : 'Concluir tarefa', onclick: () => alternarConcluida(t.id) }, icone('i-check')),
        titulo),
      t.concluida ? h('p', { class: 'texto-sucesso qd-detalhe__feita' }, icone('i-check'), `Concluída em ${new Date(t.concluidaEm || Date.now()).toLocaleDateString('pt-BR')}`) : null,
      h('label', { class: 'qd-detalhe__linha' }, h('span', { class: 'qd-detalhe__rotulo' }, icone('i-colunas'), 'Lista'), seletorLista),
      secao('Prazo', 'i-calendario',
        h('div', { class: 'qd-prazo' }, prazo,
          sit === 'atrasada' || sit === 'hoje' ? h('span', { class: `chip chip--${sit}`, text: sit === 'atrasada' ? 'Atrasada' : 'Hoje' }) : null),
        h('div', { class: 'qd-atalhos-prazo' },
          [['Hoje', UI.dataLocal()], ['Amanhã', amanha], ['Em 1 semana', semana]].map(([n, v]) => h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'data-foco': `prazo-${n}`, 'aria-pressed': String(t.prazo === v), onclick: () => definirPrazo(v) }, n)),
          t.prazo ? h('button', { type: 'button', class: 'botao botao--link botao--pequeno', 'data-foco': 'prazo-limpar', onclick: () => definirPrazo('') }, 'Sem prazo') : null),
        h('p', { class: 'qd-dica', text: 'Tarefas com prazo aparecem no Calendário e no Seu dia.' })),
      secao(`Subtarefas${t.subtarefas.length ? ` · ${subFeitas}/${t.subtarefas.length}` : ''}`, 'i-lista-check',
        t.subtarefas.length ? h('div', { class: 'qd-progresso', role: 'progressbar', 'aria-label': 'Subtarefas concluídas', 'aria-valuemin': '0', 'aria-valuemax': String(t.subtarefas.length), 'aria-valuenow': String(subFeitas) },
          h('span', { style: `width:${Math.round((subFeitas / t.subtarefas.length) * 100)}%` })) : null,
        h('ul', { class: 'qd-subtarefas' }, t.subtarefas.map((s, i) => h('li', { class: s.feita ? 'qd-subtarefas__feita' : '' },
          h('input', { type: 'checkbox', checked: s.feita, 'aria-label': `Concluir subtarefa ${s.titulo}`, 'data-foco': `sub-check-${s.id}`, onchange: (e) => mudarTarefa((x) => (x.subtarefas[i].feita = e.target.checked)) }),
          h('input', { class: 'campo campo--compacto', value: s.titulo, maxlength: String(LIMITES.sub), 'aria-label': `Subtarefa ${i + 1}`, 'data-foco': `sub-${s.id}`, onchange: (e) => {
            const v = e.target.value.trim();
            if (v) mudarTarefa((x) => (x.subtarefas[i].titulo = v), false);
            else e.target.value = s.titulo;
          }, onkeydown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              novaSub.focus();
            }
          } }),
          h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Remover subtarefa ${s.titulo}`, 'data-foco': `sub-x-${s.id}`, onclick: () => {
            mudarTarefa((x) => x.subtarefas.splice(i, 1));
            const prox = painel.querySelector('[data-foco="nova-sub"]');
            if (prox) prox.focus();
          } }, icone('i-x'))))),
        novaSub),
      secao('Etiquetas', 'i-etiqueta',
        d.etiquetas.length
          ? h('div', { class: 'qd-etiquetas-escolha', role: 'group', 'aria-label': 'Etiquetas da tarefa' }, d.etiquetas.map((e) => h('button', {
            type: 'button', class: `qd-etiqueta cor-${e.cor}`, 'aria-pressed': String(t.etiquetas.includes(e.id)), 'data-foco': `et-${e.id}`,
            onclick: () => mudarTarefa((x) => {
              x.etiquetas = x.etiquetas.includes(e.id) ? x.etiquetas.filter((y) => y !== e.id) : [...x.etiquetas, e.id];
            }),
          }, t.etiquetas.includes(e.id) ? icone('i-check') : null, e.nome)))
          : h('p', { class: 'qd-dica', text: 'Nenhuma etiqueta ainda. Crie a primeira aqui embaixo.' }),
        h('details', { class: 'qd-detalhe__mais', open: !!estado.editandoEtiquetas },
          h('summary', { 'data-foco': 'gerenciar-etiquetas' }, 'Criar e editar etiquetas'),
          editorEtiquetas((nova, soAtualizou) => {
            if (soAtualizou) return desenharTudo(null);
            if (nova) {
              const dd = ler();
              dd.tarefas[t.id].etiquetas.push(nova.id);
              salvar(dd);
            }
            desenharTudo(null);
            desenharDetalhe();
          }))),
      secao('Notas', 'i-nota', blocoNotas),
      h('label', { class: 'qd-detalhe__linha' }, h('span', { class: 'qd-detalhe__rotulo' }, icone('i-estrela'), 'XP vai para'), seletorTrilha),
      h('div', { class: 'qd-detalhe__rodape' },
        h('span', { class: 'qd-dica', text: `Criada em ${new Date(t.criadaEm).toLocaleDateString('pt-BR')}${t.xpConcedido ? ' · XP já recebido' : ` · vale +${Economia.CONFIG.tarefa.xp} XP`}` }),
        h('button', { type: 'button', class: 'botao botao--erro botao--pequeno', 'data-foco': 'excluir', onclick: async () => {
          if (!(await excluirTarefa(t.id))) return;
          const add = area && area.querySelector(`[data-foco="adicionar-${listaAtual.id}"]`);
          if (add) add.focus();
        } }, icone('i-lixo'), 'Excluir tarefa')),
    ].filter(Boolean));
    requestAnimationFrame(ajustarAltura);
    painel.scrollTop = rolagem;
    if (foco) {
      const el = painel.querySelector(`[data-foco="${foco}"]`);
      if (el) el.focus({ preventScroll: true });
    }
  }

  /** Esc fecha o painel mesmo se o foco escapou dele (ex.: clique num espaço vazio). */
  function escForaDoPainel(e) {
    if (e.key === 'Escape' && gaveta && !painel.contains(e.target) && !menu) {
      e.preventDefault();
      fecharDetalhe();
    }
  }

  function teclasDetalhe(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      fecharDetalhe();
    } else if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      alternarConcluida(estado.detalhe);
    } else if (e.key === 'Tab') {
      // mantém o foco dentro do painel
      const lista = focaveis(painel);
      if (!lista.length) return;
      const i = lista.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        lista[lista.length - 1].focus();
      } else if (!e.shiftKey && i === lista.length - 1) {
        e.preventDefault();
        lista[0].focus();
      }
    }
  }

  /** Notas: texto puro com links clicáveis, **negrito** e listas "- ". Nada vira HTML. */
  function formatarNotas(texto) {
    const blocos = [];
    let ul = null;
    texto.split('\n').forEach((linha) => {
      const item = linha.match(/^\s*[-*•]\s+(.*)$/);
      if (item) {
        if (!ul) blocos.push((ul = h('ul')));
        ul.append(h('li', {}, trechos(item[1])));
        return;
      }
      ul = null;
      blocos.push(linha.trim() ? h('p', {}, trechos(linha)) : h('p', { class: 'qd-notas__vazio', 'aria-hidden': 'true' }));
    });
    return blocos;
  }

  function trechos(linha) {
    const partes = [];
    const re = /(\*\*[^*]+\*\*)|((?:https?:\/\/|www\.)[^\s<>"]+)/g;
    let i = 0;
    let m;
    while ((m = re.exec(linha))) {
      if (m.index > i) partes.push(linha.slice(i, m.index));
      if (m[1]) partes.push(h('strong', { text: m[1].slice(2, -2) }));
      else {
        let url = m[2];
        const sobra = (url.match(/[.,;:!?)\]]+$/) || [''])[0];
        if (sobra) url = url.slice(0, -sobra.length);
        partes.push(h('a', { href: url.startsWith('www.') ? `https://${url}` : url, target: '_blank', rel: 'noopener noreferrer', text: url }));
        if (sobra) partes.push(sobra);
      }
      i = re.lastIndex;
    }
    if (i < linha.length) partes.push(linha.slice(i));
    return partes;
  }

  /* =========================================================
     TECLADO NO QUADRO
     ========================================================= */
  function cartoesVisiveis(col) {
    return [...col.querySelectorAll('.qd-tarefa')].filter((c) => c.offsetParent !== null);
  }

  function teclasQuadro(e) {
    const card = e.target.classList && e.target.classList.contains('qd-tarefa') ? e.target : null;
    if (!card) return;
    const id = card.dataset.id;
    const col = card.closest('.qd-lista');
    const lid = col.dataset.lista;

    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      alternarConcluida(id);
    } else if ((e.key === 'Enter' && e.shiftKey) || e.key === ' ') {
      e.preventDefault();
      abrirDetalhe(id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      estado.adicionando = lid;
      desenharListas(`[data-foco="campo-${lid}"]`);
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const colunas = [...area.querySelectorAll('.qd-lista')];
      const ci = colunas.indexOf(col);
      const cards = cartoesVisiveis(col);
      const i = cards.indexOf(card);
      if (e.altKey) return moverComTeclado(id, lid, e.key, colunas, ci, cards, i);
      let alvo = null;
      if (e.key === 'ArrowDown') alvo = cards[i + 1];
      else if (e.key === 'ArrowUp') alvo = cards[i - 1];
      else {
        const vizinha = colunas[ci + (e.key === 'ArrowRight' ? 1 : -1)];
        if (vizinha) {
          const vc = cartoesVisiveis(vizinha);
          alvo = vc[Math.min(i, vc.length - 1)] || vizinha.querySelector('.qd-adicionar');
        }
      }
      if (alvo) {
        alvo.focus();
        alvo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }

  function moverComTeclado(id, lid, tecla, colunas, ci, cards, i) {
    const d = ler();
    if (d.tarefas[id].concluida && (tecla === 'ArrowUp' || tecla === 'ArrowDown')) return;
    if (tecla === 'ArrowUp' || tecla === 'ArrowDown') {
      const outro = cards[tecla === 'ArrowUp' ? i - 1 : i + 1];
      if (!outro || outro.classList.contains('qd-tarefa--feita')) return;
      let fixou = false;
      mudar((dd) => {
        fixou = fixarOrdem(dd, dd.listas[lid]);
        moverTarefa(dd, id, lid, tecla === 'ArrowUp' ? { antesDe: outro.dataset.id } : { depoisDe: outro.dataset.id });
      }, { foco: `.qd-tarefa[data-id="${id}"]` });
      anunciar(tecla === 'ArrowUp' ? 'Movida para cima.' : 'Movida para baixo.');
      if (fixou) UI.toast('Ordem manual', 'A lista passou a usar a sua ordem.', 'i-colunas');
      return;
    }
    const vizinha = colunas[ci + (tecla === 'ArrowRight' ? 1 : -1)];
    if (!vizinha || !vizinha.dataset.lista) return;
    mudar((dd) => moverTarefa(dd, id, vizinha.dataset.lista, { noTopo: true }), { foco: `.qd-tarefa[data-id="${id}"]` });
    anunciar(`Movida para ${ler().listas[vizinha.dataset.lista].nome}.`);
  }

  function ajudaTeclado() {
    const atalhos = [
      ['Enter', 'nova tarefa na lista do cartão selecionado'],
      ['Shift + Enter', 'abrir os detalhes do cartão selecionado'],
      ['Alt + Enter', 'concluir ou reabrir a tarefa'],
      ['Esc', 'fechar os detalhes'],
      ['Setas', 'andar entre os cartões'],
      ['Alt + setas', 'mover o cartão (entre listas e na ordem)'],
    ];
    return h('details', { class: 'qd-atalhos' },
      h('summary', {}, icone('i-raio'), 'Atalhos do teclado'),
      h('dl', {}, atalhos.map(([k, v]) => h('div', {}, h('dt', {}, h('kbd', { text: k })), h('dd', { text: v })))),
      h('p', { class: 'qd-dica', text: 'No celular: toque e segure um cartão (ou o topo de uma lista) para arrastar.' }));
  }

  /* =========================================================
     ARRASTAR E SOLTAR (ponteiro: mouse arrasta direto; toque, depois de segurar)
     ========================================================= */
  function gesto(e, { ignorar, aoComecar, aoMover, aoSoltar }) {
    if ((e.pointerType === 'mouse' && e.button !== 0) || e.target.closest(ignorar)) return;
    const toque = e.pointerType !== 'mouse';
    const x0 = e.clientX;
    const y0 = e.clientY;
    let ativo = false;
    let ultimo = e;
    let timer = null;
    const comecar = () => {
      ativo = true;
      fecharMenu(false);
      document.body.classList.add('qd-arrastando');
      aoComecar(ultimo);
      if (toque && navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch (err) {
          /* sem vibração */
        }
      }
    };
    const mexer = (ev) => {
      ultimo = ev;
      if (!ativo) {
        const dist = Math.hypot(ev.clientX - x0, ev.clientY - y0);
        if (toque) {
          if (dist > 10) encerrar(); // a pessoa está rolando a tela
          return;
        }
        if (dist < 6) return;
        comecar();
      }
      ev.preventDefault();
      aoMover(ev);
    };
    const travarToque = (ev) => {
      if (ativo && ev.cancelable) ev.preventDefault();
    };
    const semMenu = (ev) => {
      if (toque) ev.preventDefault();
    };
    const soltar = (ev) => {
      const estava = ativo;
      encerrar();
      if (!estava) return;
      estado.semCliqueAte = Date.now() + 350;
      aoSoltar(ev, ev.type === 'pointercancel');
    };
    function encerrar() {
      clearTimeout(timer);
      document.body.classList.remove('qd-arrastando');
      window.removeEventListener('pointermove', mexer);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      window.removeEventListener('touchmove', travarToque);
      window.removeEventListener('contextmenu', semMenu);
    }
    if (toque) timer = setTimeout(comecar, 320);
    window.addEventListener('pointermove', mexer);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    window.addEventListener('touchmove', travarToque, { passive: false });
    window.addEventListener('contextmenu', semMenu);
  }

  function rolarNaBorda(ev) {
    const r = area.getBoundingClientRect();
    if (ev.clientX < r.left + 48) area.scrollLeft -= 14;
    else if (ev.clientX > r.right - 48) area.scrollLeft += 14;
    if (ev.clientY < 64) window.scrollBy(0, -14);
    else if (ev.clientY > window.innerHeight - 64) window.scrollBy(0, 14);
  }

  function criarFantasma(origem, ev) {
    const r = origem.getBoundingClientRect();
    const f = origem.cloneNode(true);
    f.classList.add('qd-fantasma');
    f.removeAttribute('data-lista');
    f.removeAttribute('data-id');
    f.querySelectorAll('[data-foco], [data-id]').forEach((x) => {
      x.removeAttribute('data-foco');
      x.removeAttribute('data-id');
    });
    f.style.width = `${r.width}px`;
    document.body.append(f);
    return { el: f, dx: ev.clientX - r.left, dy: ev.clientY - r.top };
  }
  const moverFantasma = (f, ev) => (f.el.style.transform = `translate(${ev.clientX - f.dx}px, ${ev.clientY - f.dy}px)`);

  function arrastarTarefa(e, id) {
    const origem = e.currentTarget;
    let fantasma = null;
    let marcador = null;
    let alvo = null;
    const limparAlvo = () => {
      if (marcador) marcador.remove();
      area.querySelectorAll('.qd-lista--alvo').forEach((c) => c.classList.remove('qd-lista--alvo'));
    };
    gesto(e, {
      ignorar: '.qd-circulo, input, textarea, select, a',
      aoComecar(ev) {
        fantasma = criarFantasma(origem, ev);
        moverFantasma(fantasma, ev);
        origem.classList.add('qd-origem');
        marcador = h('li', { class: 'qd-marcador', 'aria-hidden': 'true' });
      },
      aoMover(ev) {
        moverFantasma(fantasma, ev);
        rolarNaBorda(ev);
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const col = el && el.closest('.qd-lista');
        area.querySelectorAll('.qd-lista--alvo').forEach((c) => c !== col && c.classList.remove('qd-lista--alvo'));
        if (!col || !area.contains(col)) {
          alvo = null;
          marcador.remove();
          return;
        }
        col.classList.add('qd-lista--alvo');
        const ul = col.querySelector('.qd-lista__tarefas');
        const cards = [...ul.querySelectorAll(':scope > .qd-tarefa')].filter((c) => c.dataset.id !== id);
        const antes = cards.find((c) => {
          const r = c.getBoundingClientRect();
          return r.top + r.height / 2 > ev.clientY;
        });
        alvo = { lista: col.dataset.lista, antesDe: antes ? antes.dataset.id : null, depoisDe: !antes && cards.length ? cards[cards.length - 1].dataset.id : null };
        if (antes) ul.insertBefore(marcador, antes);
        else ul.append(marcador);
      },
      aoSoltar(ev, cancelado) {
        fantasma.el.remove();
        origem.classList.remove('qd-origem');
        limparAlvo();
        if (cancelado || !alvo) return;
        const { lista, antesDe, depoisDe } = alvo;
        let fixou = false;
        const d = ler();
        const deOnde = listaDe(d, id);
        mudar((dd) => {
          if (deOnde && deOnde.id === lista && !dd.tarefas[id].concluida) fixou = fixarOrdem(dd, dd.listas[lista]);
          moverTarefa(dd, id, lista, antesDe ? { antesDe } : depoisDe ? { depoisDe } : {});
        }, { foco: `.qd-tarefa[data-id="${id}"]` });
        if (fixou) UI.toast('Ordem manual', 'A lista passou a usar a sua ordem.', 'i-colunas');
        if (deOnde && deOnde.id !== lista) anunciar(`Movida para ${ler().listas[lista].nome}.`);
      },
    });
  }

  function arrastarLista(e, lid) {
    const col = e.currentTarget.closest('.qd-lista');
    let fantasma = null;
    let antesDe; // continua indefinido se a lista não saiu do lugar
    const limparMarcas = () => area.querySelectorAll('.qd-antes').forEach((c) => c.classList.remove('qd-antes'));
    gesto(e, {
      ignorar: '.qd-lista__menu, input',
      aoComecar(ev) {
        fantasma = criarFantasma(col, ev);
        fantasma.el.classList.add('qd-fantasma--lista');
        moverFantasma(fantasma, ev);
        col.classList.add('qd-origem');
      },
      aoMover(ev) {
        moverFantasma(fantasma, ev);
        rolarNaBorda(ev);
        const outras = [...area.querySelectorAll('.qd-lista, .qd-nova-lista')].filter((c) => c !== col);
        const alvo = outras.find((c) => {
          const r = c.getBoundingClientRect();
          return r.left + r.width / 2 > ev.clientX;
        }) || outras[outras.length - 1];
        limparMarcas();
        if (alvo) alvo.classList.add('qd-antes');
        antesDe = alvo && alvo.dataset.lista ? alvo.dataset.lista : null;
      },
      aoSoltar(ev, cancelado) {
        fantasma.el.remove();
        col.classList.remove('qd-origem');
        limparMarcas();
        if (cancelado || antesDe === undefined) return;
        mudar((d) => {
          const q = quadroAtual(d);
          const outras = q.listas.filter((x) => x !== lid);
          const pos = antesDe ? outras.indexOf(antesDe) : outras.length;
          outras.splice(pos < 0 ? outras.length : pos, 0, lid);
          q.listas = outras;
        }, { foco: `[data-foco="nome-${lid}"]` });
        anunciar('Lista movida.');
      },
    });
  }

  /* =========================================================
     INTEGRAÇÃO (Calendário, Início)
     ========================================================= */
  /** Tarefas abertas com prazo, de todos os quadros (para o Calendário e o Seu dia). */
  function comPrazo() {
    const d = ler();
    const saida = [];
    d.quadros.forEach((q) => q.listas.forEach((lid) => d.listas[lid].tarefas.forEach((tid) => {
      const t = d.tarefas[tid];
      if (t.prazo && !t.concluida) saida.push({ id: t.id, titulo: t.titulo, prazo: t.prazo, quadro: q.nome, lista: d.listas[lid].nome, origem: t.origem || null });
    })));
    return saida;
  }

  /* =========================================================
     ORIGEM: tarefas criadas por outra área (o Cronograma), que dá para refazer ou apagar de uma vez
     ========================================================= */
  function tirarTarefa(d, tid) {
    const l = listaDe(d, tid);
    if (l) l.tarefas.splice(l.tarefas.indexOf(tid), 1);
    delete d.tarefas[tid];
  }

  /**
   * Refaz as tarefas abertas de uma origem com prazo a partir de `desde` (as concluídas e as antigas ficam).
   * itens: [{ titulo, prazo, notas, subtarefas: [{ id, titulo, feita }] }]. Ficam num quadro próprio, sem trocar o quadro aberto.
   */
  function sincronizarOrigem(origem, { nomeQuadro, desde, itens }) {
    const d = ler();
    const atual = d.quadroAtual;
    let q = d.quadros.find((x) => x.origem === origem);
    if (!q) {
      q = criarQuadro(d, String(nomeQuadro).slice(0, LIMITES.quadro), ['Plano de estudos']);
      q.origem = origem;
      d.listas[q.listas[0]].ordenacao = 'prazo';
      d.quadroAtual = atual || q.id;
    } else q.nome = String(nomeQuadro).slice(0, LIMITES.quadro);
    if (!q.listas.length) {
      const l = criarLista(d, 'Plano de estudos');
      l.ordenacao = 'prazo';
      q.listas.push(l.id);
    }
    const lista = d.listas[q.listas[0]];
    Object.values(d.tarefas).filter((t) => t.origem === origem && !t.concluida && t.prazo >= desde).forEach((t) => tirarTarefa(d, t.id));
    const fechados = new Set(Object.values(d.tarefas).filter((t) => t.origem === origem && t.concluida).map((t) => t.prazo));
    itens.filter((it) => !fechados.has(it.prazo)).forEach((it) => {
      const t = novaTarefa(String(it.titulo).slice(0, LIMITES.titulo));
      Object.assign(t, {
        prazo: it.prazo, notas: String(it.notas || '').slice(0, LIMITES.notas), origem,
        subtarefas: (it.subtarefas || []).map((s) => ({ id: String(s.id), titulo: String(s.titulo).slice(0, LIMITES.sub), feita: !!s.feita })),
      });
      d.tarefas[t.id] = t;
      lista.tarefas.push(t.id);
    });
    salvar(d);
  }

  /** Apaga todas as tarefas de uma origem e o quadro dela (sempre sobra pelo menos um quadro). */
  function removerOrigem(origem) {
    const d = ler();
    const antes = Object.keys(d.tarefas).length + d.quadros.length;
    Object.values(d.tarefas).filter((t) => t.origem === origem).forEach((t) => tirarTarefa(d, t.id));
    d.quadros.filter((q) => q.origem === origem).forEach((q) => {
      q.listas.forEach((lid) => {
        (d.listas[lid].tarefas || []).forEach((tid) => delete d.tarefas[tid]);
        delete d.listas[lid];
      });
    });
    d.quadros = d.quadros.filter((q) => q.origem !== origem);
    if (!d.quadros.length) criarQuadro(d, 'Quadro principal', ['A fazer', 'Fazendo', 'Revisar']);
    if (!d.quadros.some((q) => q.id === d.quadroAtual)) d.quadroAtual = d.quadros[0].id;
    if (Object.keys(d.tarefas).length + d.quadros.length !== antes) salvar(d);
  }

  /** O que a pessoa já fez nas tarefas de uma origem: ids das subtarefas feitas e dias (prazos) das tarefas concluídas. */
  function estadoOrigem(origem) {
    const d = ler();
    const feitas = new Set();
    const dias = new Set();
    Object.values(d.tarefas).filter((t) => t.origem === origem).forEach((t) => {
      if (t.concluida) dias.add(t.prazo);
      t.subtarefas.forEach((s) => { if (s.feita) feitas.add(s.id); });
    });
    return { feitas, dias };
  }

  /** Marca (ou desmarca) a subtarefa de id `subId` nas tarefas de uma origem. */
  function marcarSubtarefa(origem, subId, feita) {
    const d = ler();
    let mudou = false;
    Object.values(d.tarefas).filter((t) => t.origem === origem).forEach((t) => t.subtarefas.forEach((s) => {
      if (s.id === subId && s.feita !== feita) { s.feita = feita; mudou = true; }
    }));
    if (mudou) salvar(d);
  }

  /** Abre a tela de Tarefas já com o painel da tarefa aberto. */
  function abrirTarefa(id) {
    estado.pendente = id;
    App.irPara('tarefas');
  }

  window.addEventListener('hashchange', () => {
    if (location.hash === '#tarefas') return;
    fecharMenu(false);
    if (estado.detalhe) fecharDetalhe(false);
  });

  return { render, comPrazo, abrirTarefa, sincronizarOrigem, removerOrigem, estadoOrigem, marcarSubtarefa };
})();

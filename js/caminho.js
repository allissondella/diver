/*
 * caminho.js — a sala Ensino Médio ("Sempre dá tempo"), cursos "<Matéria> · Retomada" (ids em-*).
 * Plano: docs/cadernos/ensino-medio-mapa-curricular.md e docs/cadernos/ensino-medio-retomada.md (decisões c, d, e, g).
 *
 *  - Estados dos módulos, guardados no progresso do próprio curso (prog.modulos, sincroniza como o resto):
 *      { "<moduloId>": { estado: 'recomendado' | 'liberado' | 'depois' | 'dominado', por: 'mapa' | 'escolha' | 'teste', em } }
 *    Nada fica trancado (fasesLivres): o estado só organiza a vitrine. Sem nada escolhido, o primeiro módulo
 *    em aberto é o recomendado e os de depois ficam "Para depois", com o botão "Liberar quando quiser".
 *  - "Meu caminho" no topo da sala: os próximos 3 módulos e as duas portas (Mapa de partida e Escolher matérias).
 *  - Retorno sem culpa: depois de 7 dias sem estudar na sala, "Que bom te ver de volta!" (nunca fala de sequência perdida).
 *  - Bônus pequenos, uma vez só e pela Economia: "Voltei a estudar" e "De volta à água" (+20 XP e +2 pérolas).
 *  - Prova final da matéria: "Já domino" (prog.atalhoProva, com prova.atalhoDominio), reforço dos módulos mais
 *    errados no sorteio (prova.reforco), "Quase! Vale rever estes módulos" e o "Meu retorno".
 * Conteúdo de JSON entra sempre como texto (h(..., { text })), nunca como HTML.
 */
const Caminho = (() => {
  const { h, icone, plural } = UI;
  const CHAVE = 'diver:v1:retomada'; // { bonus: { voltei, volta }, avisos: { [salaId]: 'AAAA-MM-DD' } }
  const BONUS = { xp: 20, perolas: 2 };
  const DIAS_RETORNO = 7; // "Que bom te ver de volta!"
  const DIAS_PAUSA = 14; // conquista "De volta à água"
  const PRIMEIROS = ['em-portugues', 'em-matematica']; // sem nada escolhido, "Meu caminho" começa por eles (decisão de 2026-10-01)

  const ESTADOS = {
    recomendado: { texto: 'Recomendado', icone: 'i-alvo' },
    liberado: { texto: 'Liberado', icone: 'i-bandeira' },
    depois: { texto: 'Para depois', icone: 'i-relogio' },
    dominado: { texto: 'Dominado', icone: 'i-trofeu' },
    feito: { texto: 'Concluído', icone: 'i-check' },
  };

  const ehRetomada = (t) => !!t && /^em-/.test(t.id);
  const feita = (prog, f) => !!(prog.fases[f.id] && prog.fases[f.id].concluida);
  const ler = () => { const d = Dados.ler(CHAVE, null); return d && typeof d === 'object' ? { bonus: {}, avisos: {}, ...d } : { bonus: {}, avisos: {} }; };
  const gravar = (d) => Dados.gravar(CHAVE, d);
  const sala = () => Grupos.salas(App.trilhas()).find((s) => s.caminho) || null;
  const mapa = () => (typeof MapaPartida !== 'undefined' ? MapaPartida : null);
  const faixaDo = (cursoId) => { const m = mapa(); const r = m && m.resultado(cursoId); return r ? r.faixa : null; };

  /** Os módulos do curso, na ordem do mapa: [{ id, nome, fases, indices }]. */
  function modulos(trilha) {
    const lista = [];
    trilha.fases.forEach((f, i) => {
      const id = f.moduloId || f.modulo || 'outras';
      const ultimo = lista[lista.length - 1];
      if (ultimo && ultimo.id === id) { ultimo.fases.push(f); ultimo.indices.push(i); } else lista.push({ id, nome: f.modulo || 'Outras aulas', fases: [f], indices: [i] });
    });
    return lista;
  }

  /**
   * O estado de cada módulo: Map(moduloId → { estado, por, feitas, total, completo }).
   * Regras: o salvo vale; "Para depois" com aula feita vira "Liberado"; sem recomendado em aberto, o primeiro
   * módulo em aberto ainda sem escolha (ou "Para depois") vira o recomendado; o resto sem escolha fica "Para depois".
   */
  function estados(trilha, prog, mods = modulos(trilha)) {
    const out = new Map();
    mods.forEach((m) => {
      const s = prog.modulos && prog.modulos[m.id];
      const feitas = m.fases.filter((f) => feita(prog, f)).length;
      let estado = s ? s.estado : null;
      if (estado === 'depois' && feitas) estado = 'liberado';
      out.set(m.id, { estado, por: s ? s.por : null, feitas, total: m.fases.length, completo: feitas === m.fases.length });
    });
    const emAberto = (x) => !x.completo && x.estado !== 'dominado';
    const temRecomendado = [...out.values()].some((x) => x.estado === 'recomendado' && emAberto(x));
    if (!temRecomendado) {
      const prox = mods.map((m) => out.get(m.id)).find((x) => emAberto(x) && (x.estado === null || x.estado === 'depois'));
      if (prox) prox.estado = 'recomendado';
    }
    out.forEach((x) => { if (!x.estado) x.estado = x.feitas ? 'liberado' : 'depois'; });
    return out;
  }

  /** Mexe no progresso de um curso (o atual, se for ele; senão, o salvo) e grava. */
  function comProg(trilhaId, fn) {
    const atual = App.trilhaAtual();
    const ehAtual = atual && atual.id === trilhaId;
    const prog = ehAtual ? App.progAtual() : Progresso.carregar(trilhaId);
    const r = fn(prog);
    if (ehAtual) App.salvarAtual(); else Progresso.salvar(trilhaId, prog);
    return r;
  }

  /** Muda o estado de um módulo. por: 'escolha' (a pessoa), 'mapa' ou 'teste'. */
  function definir(trilhaId, moduloId, estado, por = 'escolha') {
    comProg(trilhaId, (prog) => {
      prog.modulos = { ...(prog.modulos || {}), [moduloId]: { estado, por, em: new Date().toISOString() } };
    });
  }

  /** Grava o resultado do Mapa de partida num curso (chamado por js/mapa-partida.js). */
  function aplicarMapa(trilha, { faixa, certos = [], errados = [] }) {
    const mods = modulos(trilha);
    const ids = new Set(mods.map((m) => m.id));
    comProg(trilha.id, (prog) => {
      const antes = prog.modulos || {};
      const novo = { ...antes };
      const em = new Date().toISOString();
      const pode = (id) => !(antes[id] && (antes[id].por === 'teste' || antes[id].por === 'escolha')); // o que a pessoa fez vale mais
      mods.forEach((m, i) => {
        if (!pode(m.id)) return;
        let estado;
        if (faixa === 'comecar') estado = i === 0 ? 'recomendado' : 'depois';
        else if (faixa === 'revisao') estado = errados.includes(m.id) ? 'recomendado' : 'liberado';
        else estado = certos.includes(m.id) && !errados.includes(m.id) ? 'dominado' : 'liberado';
        novo[m.id] = { estado, por: 'mapa', em };
      });
      prog.modulos = novo;
      if (faixa === 'manda-bem' && trilha.prova && trilha.prova.atalhoDominio) prog.atalhoProva = 'mapa';
      else if (prog.atalhoProva === 'mapa') delete prog.atalhoProva;
      return ids;
    });
  }

  /** A próxima aula a fazer, pelo caminho: primeiro os módulos recomendados, depois os liberados. */
  function proximaAula(trilha, prog) {
    const mods = modulos(trilha);
    const est = estados(trilha, prog, mods);
    for (const alvo of ['recomendado', 'liberado']) {
      for (const m of mods) {
        const x = est.get(m.id);
        if (x.estado !== alvo || x.completo) continue;
        const f = m.fases.find((ff) => !feita(prog, ff));
        if (f) return f;
      }
    }
    return null;
  }

  /* =========================================================
     NO MAPA DO CURSO: selo do módulo e ações ("Liberar quando quiser", Teste rápido)
     ========================================================= */
  /** O selo do módulo (texto + ícone, nunca só cor). */
  function selo(x) {
    const chave = x.estado === 'dominado' ? 'dominado' : x.completo ? 'feito' : x.estado;
    const e = ESTADOS[chave];
    return h('span', { class: `modulo__selo modulo__selo--${chave}` }, icone(e.icone), e.texto);
  }

  /** A linha embaixo do módulo: o que dá para fazer com ele. aoMudar redesenha o mapa. */
  function acoesModulo(trilha, m, x, aoMudar) {
    const partes = [];
    if (x.estado === 'dominado') {
      partes.push(h('p', { class: 'modulo__nota' }, h('strong', { text: 'Você já manda bem aqui. ' }),
        x.por === 'teste' ? 'Passou no Teste rápido.' : 'O Mapa de partida mostrou.', ' Pode estudar as aulas mesmo assim, quando quiser.'));
    } else if (x.estado === 'depois' && !x.completo) {
      partes.push(h('p', { class: 'modulo__nota', text: 'Este módulo ficou para depois. Nada está trancado: abra quando quiser.' }),
        h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', 'data-liberar': m.id,
          onclick: () => { definir(trilha.id, m.id, 'liberado'); UI.toast('Módulo liberado', `${m.nome} já está no seu caminho.`, 'i-bandeira'); aoMudar(m.id); } },
        icone('i-bandeira'), 'Liberar quando quiser'));
    }
    const forte = faixaDo(trilha.id) === 'manda-bem' || x.estado === 'liberado';
    if (x.estado !== 'dominado' && !x.completo && x.feitas === 0 && forte && mapa() && Trilhas.totalQuestoes(trilha)) {
      partes.push(h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'data-teste-rapido': m.id,
        onclick: () => mapa().abrirTeste(trilha.id, m.id) }, icone('i-raio'), 'Já sei isso? Faça um teste rápido'));
    }
    return partes.length ? h('div', { class: 'modulo__acoes' }, partes) : null;
  }

  /* =========================================================
     "MEU CAMINHO" (topo da sala) e as duas portas
     ========================================================= */
  const ORDEM_FAIXA = { comecar: 0, revisao: 1, null: 2, 'manda-bem': 3 };

  /** Os próximos módulos da sala: recomendados antes de liberados; o que a pessoa já começou e o Mapa mandam na ordem. */
  function proximos(s, quantos = 3) {
    const itens = [];
    s.trilhas.forEach((t, ordemCurso) => {
      if (!t.fases.some((f) => f.moduloId)) return;
      const prog = Progresso.carregar(t.id);
      const mods = modulos(t);
      const est = estados(t, prog, mods);
      const comecou = t.fases.some((f) => feita(prog, f)) || !!prog.ultimaFase;
      const faixa = faixaDo(t.id);
      mods.forEach((m, ordemModulo) => {
        const x = est.get(m.id);
        if (x.completo || (x.estado !== 'recomendado' && x.estado !== 'liberado')) return;
        const fase = m.fases.find((f) => !feita(prog, f));
        const primeiro = PRIMEIROS.indexOf(t.id);
        itens.push({
          t, m, x, fase,
          chave: [x.feitas ? 0 : 1, comecou ? 0 : 1, ORDEM_FAIXA[faixa] ?? 2, x.estado === 'recomendado' ? 0 : 1,
            primeiro < 0 ? PRIMEIROS.length : primeiro, ordemCurso, ordemModulo],
        });
      });
    });
    const cmp = (a, b) => { for (let i = 0; i < a.chave.length; i++) if (a.chave[i] !== b.chave[i]) return a.chave[i] - b.chave[i]; return 0; };
    // no máximo um módulo por matéria, para o caminho variar; se faltar, completa com outros
    const ordenados = itens.sort(cmp);
    const escolhidos = [];
    const usados = new Set();
    ordenados.forEach((it) => { if (escolhidos.length < quantos && !usados.has(it.t.id)) { escolhidos.push(it); usados.add(it.t.id); } });
    ordenados.forEach((it) => { if (escolhidos.length < quantos && !escolhidos.includes(it)) escolhidos.push(it); });
    return escolhidos;
  }

  function cartaoProximo(s, it) {
    const { t, m, x, fase } = it;
    const nome = Grupos.nomeCurto(s, t);
    const acao = x.feitas ? 'Continuar' : 'Começar';
    return h('li', {},
      h('button', { type: 'button', class: 'caminho-card', 'data-curso': t.id, 'data-modulo': m.id,
        'aria-label': `${nome}: ${m.nome}. ${ESTADOS[x.estado].texto}. ${x.feitas} de ${plural(x.total, 'aula', 'aulas')}. ${acao}: ${fase.nome}`,
        onclick: () => App.abrirTrilha(t.id, { fase: fase.id }) },
      h('span', { class: 'caminho-card__textos', 'aria-hidden': 'true' },
        h('span', { class: 'caminho-card__topo' }, h('span', { class: 'rotulo', text: nome }), selo(x)),
        h('span', { class: 'caminho-card__modulo', text: m.nome.replace(/^Módulo\s+\d+\s*·\s*/i, '') }),
        h('span', { class: 'caminho-card__aula', text: `${acao}: ${fase.nome}` }),
        h('span', { class: 'caminho-card__conta' },
          h('span', { class: 'modulo__barra' }, h('span', { style: `width:${Math.round((x.feitas / x.total) * 100)}%` })),
          `${x.feitas} de ${plural(x.total, 'aula', 'aulas')}`)),
      h('span', { class: 'continuar__play', 'aria-hidden': 'true' }, icone('i-seta-dir'))));
  }

  /** A seção "Meu caminho" da sala (no lugar do "Continuar de onde parou"). */
  function secaoSala(s) {
    const lista = proximos(s);
    const m = mapa();
    const sit = m ? m.situacao() : { feito: false, comecado: false };
    const rotuloMapa = sit.feito ? 'Ver meu mapa' : sit.comecado ? 'Continuar o Mapa de partida' : 'Fazer o Mapa de partida';
    return h('section', { class: 'caminho', id: 'meu-caminho', 'aria-labelledby': 'caminho-titulo' },
      h('div', { class: 'caminho__topo' },
        h('h2', { class: 'caminho__titulo', id: 'caminho-titulo', text: 'Meu caminho' }),
        h('p', { class: 'caminho__sub', text: lista.length
          ? 'Os seus próximos passos, um módulo de cada vez. Aulas de 15 minutos: dá para encaixar em qualquer dia.'
          : 'Escolha as matérias que quer retomar ou descubra por onde começar. Tudo está aberto: você decide o ritmo.' })),
      lista.length ? h('ol', { class: 'caminho__lista' }, lista.map((it) => cartaoProximo(s, it))) : null,
      h('div', { class: 'caminho__portas', role: 'group', 'aria-label': 'Por onde começar' },
        h('button', { type: 'button', class: 'caminho-porta', id: 'btn-mapa-partida', onclick: () => m && m.abrir() },
          h('span', { class: 'caminho-porta__icone', 'aria-hidden': 'true' }, icone('i-alvo')),
          h('span', { class: 'caminho-porta__textos' },
            h('span', { class: 'caminho-porta__nome', text: rotuloMapa }),
            h('span', { class: 'caminho-porta__texto', text: sit.feito ? 'O que você já sabe e por onde seguir, matéria por matéria.' : 'Um teste leve, por blocos, para descobrir por onde começar. Sem nota de prova.' }))),
        h('button', { type: 'button', class: 'caminho-porta', id: 'btn-escolher-materias', onclick: escolherMaterias },
          h('span', { class: 'caminho-porta__icone', 'aria-hidden': 'true' }, icone('i-livro')),
          h('span', { class: 'caminho-porta__textos' },
            h('span', { class: 'caminho-porta__nome', text: 'Escolher matérias' }),
            h('span', { class: 'caminho-porta__texto', text: 'Vá direto à matéria que quer retomar. Todas as aulas estão abertas.' })))));
  }

  function escolherMaterias() {
    const alvo = document.getElementById('sala-conteudo');
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: UI.movimentoReduzido ? 'auto' : 'smooth', block: 'start' });
    const primeiro = alvo.querySelector('button, a');
    if (primeiro) primeiro.focus({ preventScroll: true });
  }

  /* =========================================================
     RETORNO SEM CULPA
     ========================================================= */
  const hoje = () => Progresso.dataLocal();
  const dias = (de, ate) => Math.round((Date.parse(`${ate}T12:00:00`) - Date.parse(`${de}T12:00:00`)) / 86400000);

  /** Último dia de estudo em qualquer curso da sala (AAAA-MM-DD) e o melhor recorde de sequência. */
  function ultimoEstudo(s = sala()) {
    let ultimo = null;
    let recorde = 0;
    (s ? s.trilhas : []).forEach((t) => {
      const p = Progresso.carregar(t.id);
      if (p.streak.ultimoDia && (!ultimo || p.streak.ultimoDia > ultimo)) ultimo = p.streak.ultimoDia;
      recorde = Math.max(recorde, p.streak.melhor || 0);
    });
    return { ultimo, recorde };
  }

  /** Dias sem estudar na sala (null se nunca estudou). */
  function diasParado(s = sala()) {
    const { ultimo } = ultimoEstudo(s);
    return ultimo ? dias(ultimo, hoje()) : null;
  }

  /** Ao entrar na sala: depois de 7 dias ou mais sem estudar, a caixa do Diver dá as boas-vindas (uma vez por dia). */
  function aoEntrarNaSala(s) {
    const { ultimo, recorde } = ultimoEstudo(s);
    if (!ultimo || dias(ultimo, hoje()) < DIAS_RETORNO) return;
    const d = ler();
    if (d.avisos[s.id] === hoje()) return;
    const naSala = () => location.hash === `#sala-${s.id}` && !document.getElementById('tela-sala').hidden;
    const tentar = (espera) => setTimeout(async () => {
      if (!naSala()) return;
      if (Tutorial.aberto() || document.querySelector('dialog[open]')) return tentar(600);
      gravar({ ...ler(), avisos: { ...ler().avisos, [s.id]: hoje() } });
      const prox = proximos(s, 1)[0];
      const ok = await UI.confirmar({
        titulo: 'Que bom te ver de volta!',
        texto: `${prox ? `Que tal uma aula de 15 minutos para retomar? A próxima do seu caminho é "${prox.fase.nome}", em ${Grupos.nomeCurto(s, prox.t)}.` : 'Escolha uma matéria e retome no seu ritmo.'}`
          + (recorde > 1 ? `\n\nSeu recorde de ${recorde} dias seguidos continua guardado.` : ''),
        sim: prox ? 'Uma aula de 15 minutos' : 'Escolher matérias', nao: 'Agora não', humor: 'feliz', foco: 'sim',
      });
      if (!ok) return;
      if (prox) App.abrirTrilha(prox.t.id, { fase: prox.fase.id }); else escolherMaterias();
    }, espera);
    tentar(1500);
  }

  /* =========================================================
     SESSÃO: bônus de retorno e conquistas (chamado pelo app.js)
     ========================================================= */
  /** Antes do Mergulho: guarda há quantos dias a pessoa não estudava na sala. */
  function antesDaSessao(s) {
    if (ehRetomada(s.trilha)) s.diasParado = diasParado();
  }

  /** Depois da sessão (antes das conquistas): marca a volta e dá os bônus de uma vez só. */
  function depoisDaSessao(s, resumo, prog) {
    if (!ehRetomada(s.trilha) || s.modo !== 'mergulho' || !resumo.faseConcluida) return;
    prog.retomada = prog.retomada || {};
    if (!prog.retomada.primeiraAula) prog.retomada.primeiraAula = new Date().toISOString();
    if (s.diasParado !== null && s.diasParado !== undefined && s.diasParado >= DIAS_PAUSA) prog.retomada.voltouDaPausa = new Date().toISOString();
    const d = ler();
    const dar = [];
    if (!d.bonus.voltei) { d.bonus.voltei = new Date().toISOString(); dar.push('Voltei a estudar'); }
    if (prog.retomada.voltouDaPausa && !d.bonus.volta && s.diasParado >= DIAS_PAUSA) { d.bonus.volta = new Date().toISOString(); dar.push('De volta à água'); }
    if (!dar.length) return;
    gravar(d);
    // depois do resumo aparecer: o bônus vem pela Economia, com o aviso dele
    setTimeout(() => dar.forEach((motivo, i) => setTimeout(() => App.concederXP(s.trilha.id, BONUS, motivo), i * 900)), 600);
  }

  /* =========================================================
     PROVA FINAL DA MATÉRIA
     ========================================================= */
  /** A prova está liberada pelo "Já domino" (o Mapa deu a faixa alta e o curso tem prova.atalhoDominio)? */
  const provaPorAtalho = (trilha, prog) => !!(trilha.prova && trilha.prova.atalhoDominio && prog.atalhoProva);

  function embaralhar(lista) { return UI.embaralhar([...lista]); }

  /** Taxa de erro da pessoa num módulo (do prog.questoes), ou null sem respostas. */
  function taxaErro(prog, questoes) {
    let a = 0;
    let e = 0;
    questoes.forEach((q) => { const x = prog.questoes[q.id]; if (x) { a += x.acertos || 0; e += x.erros || 0; } });
    return a + e ? e / (a + e) : null;
  }

  /** Divide n por pesos (maior resto). */
  function repartir(n, pesos) {
    const soma = pesos.reduce((t, p) => t + p, 0) || 1;
    const bruto = pesos.map((p) => (n * p) / soma);
    const cotas = bruto.map(Math.floor);
    let falta = n - cotas.reduce((t, c) => t + c, 0);
    bruto.map((b, i) => [b - Math.floor(b), i]).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (falta > 0) { cotas[i]++; falta--; } });
    return cotas;
  }

  /**
   * Sorteio da prova com reforço (prova.reforco): metade proporcional ao número de aulas de cada módulo,
   * metade para os módulos com mais erros da pessoa. Sem dados de erro, tudo proporcional.
   */
  function questoesDaProva(trilha, prog, n) {
    const mods = modulos(trilha);
    const faseMod = new Map();
    mods.forEach((m) => m.fases.forEach((f) => faseMod.set(f.id, m.id)));
    const pool = mods.map((m) => embaralhar(trilha.questoes.filter((q) => faseMod.get(q.fase) === m.id)));
    const metade = Math.ceil(n / 2);
    const cotaAulas = repartir(metade, mods.map((m) => m.fases.length));
    const taxas = mods.map((m, i) => taxaErro(prog, pool[i]));
    const comErro = taxas.some((t) => t);
    const cotaErro = repartir(n - metade, comErro ? taxas.map((t) => t || 0) : mods.map((m) => m.fases.length));
    const escolhidas = [];
    const usadas = new Set();
    const tirar = (i, k) => { for (const q of pool[i]) { if (k <= 0) break; if (!usadas.has(q.id)) { usadas.add(q.id); escolhidas.push(q); k--; } } };
    // o reforço prefere as questões que a pessoa errou
    pool.forEach((lista, i) => lista.sort((a, b) => ((prog.questoes[b.id] || {}).erros || 0) - ((prog.questoes[a.id] || {}).erros || 0)));
    mods.forEach((m, i) => tirar(i, cotaErro[i]));
    pool.forEach((lista, i) => { pool[i] = embaralhar(lista); });
    mods.forEach((m, i) => tirar(i, cotaAulas[i]));
    if (escolhidas.length < n) embaralhar(trilha.questoes).forEach((q) => { if (escolhidas.length < n && !usadas.has(q.id)) { usadas.add(q.id); escolhidas.push(q); } });
    return escolhidas.slice(0, n);
  }

  /** Erros da prova por módulo: [{ m, erros, total }], do que mais errou para o que menos errou. */
  function errosPorModulo(trilha, respostas) {
    const mods = modulos(trilha);
    const faseMod = new Map();
    mods.forEach((m) => m.fases.forEach((f) => faseMod.set(f.id, m)));
    const conta = new Map();
    respostas.forEach(({ questao, acertou }) => {
      const m = faseMod.get(questao.fase);
      if (!m) return;
      const c = conta.get(m) || { m, erros: 0, total: 0 };
      c.total++;
      if (!acertou) c.erros++;
      conta.set(m, c);
    });
    return [...conta.values()].filter((c) => c.erros).sort((a, b) => b.erros / b.total - a.erros / a.total || b.erros - a.erros);
  }

  /** Bloco do resumo da prova: reprovou → "Quase! Vale rever estes módulos"; aprovou → convite ao "Meu retorno". */
  function blocoResumoProva(trilha, r, respostas) {
    if (!ehRetomada(trilha) || r.modo !== 'prova' || r.motivo === 'saiu') return null;
    if (r.aprovado) {
      return h('div', { class: 'caminho-prova caminho-prova--ok' },
        h('p', { class: 'caminho-prova__titulo' }, icone('i-trofeu'), h('strong', { text: 'Matéria retomada!' })),
        h('p', { text: 'Veja tudo o que você recuperou nesta matéria e o próximo passo.' }),
        h('button', { type: 'button', class: 'botao botao--secundario', id: 'btn-meu-retorno', onclick: () => App.irPara('prova') }, icone('i-grafico'), 'Ver meu retorno'));
    }
    const piores = errosPorModulo(trilha, respostas).slice(0, 3);
    return h('div', { class: 'caminho-prova' },
      h('p', { class: 'caminho-prova__titulo' }, icone('i-revisao'), h('strong', { text: 'Quase! Vale rever estes módulos' })),
      h('p', { text: 'Uma passada rápida por eles e a próxima tentativa fica mais leve. Pode tentar de novo quando quiser, sem espera.' }),
      piores.length ? h('ul', { class: 'caminho-prova__lista' }, piores.map(({ m, erros, total }) => h('li', {},
        h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', onclick: () => App.abrirTrilha(trilha.id, { fase: m.fases[0].id }) },
          icone('i-seta-dir'), `${m.nome} (${erros} de ${total} para rever)`)))) : null);
  }

  /** "Meu retorno": o que a pessoa recuperou na matéria (prova aprovada ou todos os módulos feitos ou dominados). */
  function cartaoRetorno(trilha, prog) {
    if (!ehRetomada(trilha)) return null;
    const mods = modulos(trilha);
    const est = estados(trilha, prog, mods);
    const aprovacao = (prog.provas || []).find((p) => p.aprovado);
    const tudo = mods.every((m) => est.get(m.id).completo || est.get(m.id).estado === 'dominado');
    const aulas = trilha.fases.filter((f) => feita(prog, f)).length;
    const testes = mods.some((m) => est.get(m.id).por === 'teste');
    // sem prova aprovada, só aparece depois de a pessoa ter feito alguma coisa (aula ou Teste rápido), não só pelo Mapa
    if (!aprovacao && !(tudo && (aulas || testes))) return null;
    const s = sala();
    const linhas = mods.map((m) => {
      const x = est.get(m.id);
      const qs = trilha.questoes.filter((q) => m.fases.some((f) => f.id === q.fase));
      let a = 0;
      let t = 0;
      qs.forEach((q) => { const e = prog.questoes[q.id]; if (e) { a += e.acertos || 0; t += (e.acertos || 0) + (e.erros || 0); } });
      return h('li', { class: 'retorno__modulo' },
        h('span', { class: 'retorno__nome', text: m.nome }),
        selo(x),
        h('span', { class: 'texto-suave', text: t ? `${Math.round((a / t) * 100)}% de acertos` : x.estado === 'dominado' ? 'pelo Mapa ou pelo teste' : 'sem respostas ainda' }));
    });
    const r = mapa() && mapa().resultado(trilha.id);
    const antes = r ? { comecar: 'Vale começar por aqui', revisao: 'Vale uma revisão', 'manda-bem': 'Você já manda bem aqui' }[r.faixa] : null;
    const outras = s ? s.trilhas.filter((t) => t.id !== trilha.id && !(Progresso.carregar(t.id).provas || []).some((p) => p.aprovado)) : [];
    return h('section', { class: 'cartao retorno', id: 'meu-retorno', 'aria-labelledby': 'retorno-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'retorno-titulo', text: 'Meu retorno' }),
      h('p', {}, h('strong', { text: aprovacao ? 'Matéria retomada. ' : 'Todos os módulos em dia. ' }),
        aulas ? `${plural(aulas, 'aula concluída', 'aulas concluídas')} de ${trilha.fases.length}` : 'Os módulos ficaram em dia pelo Mapa de partida e pelo Teste rápido',
        aprovacao ? `, prova aprovada com ${aprovacao.pct}%` : '', '. Sempre dá tempo, e você provou isso.'),
      antes ? h('p', { class: 'texto-suave', text: `No Mapa de partida: "${antes}". Agora: ${aprovacao ? 'aprovado na Prova final' : 'módulos em dia'}.` }) : null,
      h('ul', { class: 'retorno__lista' }, linhas),
      h('div', { class: 'acoes-linha' },
        outras.length && s ? h('button', { type: 'button', class: 'botao botao--primario', onclick: () => App.irPara(`sala-${s.id}`) }, icone('i-livro'), 'Escolher outra matéria') : null,
        h('button', { type: 'button', class: 'botao botao--secundario', onclick: () => App.irPara('cronograma') }, icone('i-calendario'), 'Montar um cronograma'),
        App.trilhas().some((t) => t.id === 'enem-vestibular') ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => App.irPara('sala-enem') }, icone('i-seta-cima'), 'Aprofundar no Enem e Vestibular') : null));
  }

  /* =========================================================
     PROGRESSO NOVO E INÍCIO
     ========================================================= */
  /** Curso com metaPadrao (5 nos em-*): progresso que nunca respondeu nada começa com essa meta. */
  function ajustarProgresso(trilha, prog) {
    if (!trilha.metaPadrao || prog.metaDiaria === trilha.metaPadrao || prog.stats.respondidas > 0 || prog.metaAjustada) return false;
    prog.metaDiaria = trilha.metaPadrao;
    prog.metaAjustada = true;
    return true;
  }

  /** Card do Início "Descubra por onde começar": tem a sala, ainda não estudou nela e não fez o Mapa. */
  function cardInicio(area) {
    area.replaceChildren();
    const s = sala();
    const m = mapa();
    const estudou = s && s.trilhas.some((t) => { const p = Progresso.carregar(t.id); return p.stats.respondidas > 0 || p.ultimaFase; });
    area.hidden = !s || estudou || !m || m.situacao().feito;
    if (area.hidden) return;
    area.append(h('section', { class: 'retomada-inicio', 'aria-labelledby': 'retomada-inicio-titulo' },
      h('span', { class: 'retomada-inicio__icone', 'aria-hidden': 'true' }, icone('i-alvo')),
      h('div', { class: 'retomada-inicio__textos' },
        h('span', { class: 'rotulo', text: `${s.nome} · ${s.subtexto}` }),
        h('h2', { class: 'retomada-inicio__titulo', id: 'retomada-inicio-titulo', text: 'Descubra por onde começar' }),
        h('p', { class: 'retomada-inicio__texto', text: 'Voltar a estudar fica mais fácil com um mapa. Um teste leve, por blocos, mostra o que você já sabe e por onde seguir.' })),
      h('div', { class: 'retomada-inicio__acoes' },
        h('button', { type: 'button', class: 'botao botao--primario', id: 'btn-inicio-mapa', onclick: () => m.abrir() }, icone('i-alvo'), 'Fazer o Mapa de partida'),
        h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => App.irPara(`sala-${s.id}`) }, icone(s.icone), 'Entrar na sala'))));
  }

  return {
    BONUS, ehRetomada, modulos, estados, definir, aplicarMapa, proximaAula, selo, acoesModulo,
    secaoSala, aoEntrarNaSala, antesDaSessao, depoisDaSessao, diasParado,
    provaPorAtalho, questoesDaProva, blocoResumoProva, cartaoRetorno, ajustarProgresso, cardInicio,
  };
})();

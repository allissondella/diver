/*
 * mapa-partida.js — sala Ensino Médio: a Avaliação de nivelamento (rota #mapa-partida; antes chamada "Mapa de partida")
 * e a Prova de suficiência do módulo (antes "Teste rápido"). Tom sério, de colégio (pedido do usuário, 2026-10-15).
 * Plano: docs/cadernos/ensino-medio-mapa-curricular.md (seção 5) e docs/cadernos/ensino-medio-retomada.md (decisões b e c).
 *
 *  - Avaliação de nivelamento: questões por blocos (Linguagens, Matemática, Natureza, Humanas), em data/diagnostica/ensino-medio.json.
 *    Cada bloco mostra só as questões das matérias com curso publicado e liberado para a pessoa: o Mapa cresce com os cursos.
 *    Sem cronômetro na tela; "Ainda não sei" no lugar do chute; dá para pausar (diver:v1:mapa-partida, sincroniza como o resto).
 *  - A conta é a mesma da Avaliação Diagnóstica (Diagnostica.avaliar: peso por dificuldade e puxão para o bloco).
 *    Nota 1–2 → "Nível básico"; 3 → "Nível intermediário"; 4–5 → "Nível avançado".
 *    O resultado vai para os módulos de cada curso (Caminho.aplicarMapa). O que aparece é um mapa, não uma nota.
 *  - Prova de suficiência: 5 questões do próprio módulo (uma média ou difícil por aula, sem a Revisão); 4 de 5 → módulo Dominado.
 *    Usa as questões do curso já aberto (nada novo para baixar nem para validar) e não mexe no quiz.js.
 *  - Pontos: 25 XP e 2 pérolas por bloco, na primeira vez, pela Economia (App.concederXP). Log: diagnostica_concluida
 *    com detalhes.teste = "mapa-partida" ou "teste-rapido" (tipo que já existe: o banco não muda).
 * Conteúdo de JSON entra sempre como texto, nunca como HTML.
 */
const MapaPartida = (() => {
  const { h, icone, limpar, plural, embaralhar } = UI;
  const CHAVE = 'diver:v1:mapa-partida';
  const ARQUIVO = 'data/diagnostica/ensino-medio.json';
  const LETRAS = 'ABCDE';
  const PONTOS_BLOCO = { xp: 25, perolas: 2 };
  const FAIXAS = {
    comecar: { nome: 'Nível básico', icone: 'i-bandeira', frase: 'Comece pelo Módulo 1: ele traz os fundamentos de que os módulos seguintes dependem.' },
    revisao: { nome: 'Nível intermediário', icone: 'i-revisao', frase: 'Os módulos em que houve erro estão recomendados; os demais ficam disponíveis.' },
    'manda-bem': { nome: 'Nível avançado', icone: 'i-trofeu', frase: 'Os módulos em que você acertou foram dominados, e a prova final da disciplina já está liberada.' },
  };
  const TESTE = { questoes: 5, passa: 4 };

  let banco = null;
  let tela = null;
  let vista = { tela: 'painel' };
  let teste = null; // Prova de suficiência em andamento (só na memória: são 5 questões)

  const ler = () => { const d = Dados.ler(CHAVE, null); return d && typeof d === 'object' ? { versao: 1, blocos: {}, resultados: {}, ...d } : { versao: 1, blocos: {}, resultados: {} }; };
  const gravar = (d) => Dados.gravar(CHAVE, { ...d, versao: 1, atualizadoEm: Date.now() });
  const naoRespondida = (r) => r === -1 || r === undefined;
  const faixaDaNota = (n) => (n <= 2 ? 'comecar' : n === 3 ? 'revisao' : 'manda-bem');
  const cursosAbertos = () => new Set(App.trilhas().map((t) => t.id));
  const trilha = (id) => App.trilhas().find((t) => t.id === id) || null;
  const sala = () => Grupos.salas(App.trilhas()).find((s) => s.caminho) || null;
  const nomeCurso = (id) => { const t = trilha(id); const s = sala(); return t ? (s ? Grupos.nomeCurto(s, t) : t.nome) : id; };

  function carregar() {
    if (!banco) {
      banco = fetch(ARQUIVO, { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error('Não foi possível abrir a avaliação de nivelamento agora.'); return r.json(); })
        .catch((e) => { banco = null; throw e; });
    }
    return banco;
  }

  /** Os blocos com as questões que esta pessoa vê (só das matérias com curso aberto para ela). */
  function blocosVisiveis(b) {
    const abertos = cursosAbertos();
    return b.blocos
      .map((bl) => ({ ...bl, questoes: b.questoes.filter((q) => q.bloco === bl.id && abertos.has(q.curso)) }))
      .filter((bl) => bl.questoes.length);
  }

  /** Estado de um bloco: 'novo' | 'andamento' | 'feito' | 'novas' (feito, mas o bloco ganhou matéria nova). */
  function estadoBloco(d, bl) {
    const s = d.blocos[bl.id] || {};
    const respondidas = bl.questoes.filter((q) => s.respostas && s.respostas[q.id] !== undefined).length;
    if (s.concluidoEm) return respondidas === bl.questoes.length ? 'feito' : 'novas';
    return respondidas ? 'andamento' : 'novo';
  }

  /** A conta da Avaliação Diagnóstica, com o bloco no lugar da área e a matéria (curso) no lugar da disciplina. */
  function avaliarBloco(bl, respostas) {
    const b = { areas: [{ id: bl.id }], questoes: bl.questoes.map((q) => ({ ...q, area: bl.id, disciplina: q.curso, lingua: undefined })) };
    return Diagnostica.avaliar(b, { respostas });
  }

  /* ---------- Para o resto do app (js/caminho.js, conquistas, Início) ---------- */
  /** O resultado do Mapa num curso: { nota, faixa, em } ou null. */
  const resultado = (cursoId) => ler().resultados[cursoId] || null;

  /** { feito, comecado }: feito = todos os blocos visíveis terminados (usa o banco se já veio; senão, o que está guardado). */
  function situacao() {
    const d = ler();
    const comecado = Object.values(d.blocos).some((s) => s && (s.concluidoEm || (s.respostas && Object.keys(s.respostas).length)));
    if (!banco || !banco.pronto) {
      const marcados = Object.values(d.blocos).filter((s) => s && s.concluidoEm).length;
      return { feito: !!d.completoEm && marcados > 0, comecado };
    }
    const vis = blocosVisiveis(banco.pronto);
    return { feito: vis.length > 0 && vis.every((bl) => estadoBloco(d, bl) === 'feito'), comecado };
  }

  /* =========================================================
     TELA
     ========================================================= */
  function render(secao) {
    tela = secao;
    limpar(secao);
    const s = sala();
    secao.append(UI.cabecalho(s ? `Sala ${s.nome}` : 'Ensino Médio', vista.tela === 'teste' ? 'Prova de suficiência' : 'Avaliação de nivelamento',
      vista.tela === 'teste' ? 'Cinco questões do módulo. Com 4 acertos, o módulo é considerado dominado.' : 'Identifique o seu nível em cada disciplina e receba os módulos indicados.'));
    const corpo = h('div', { class: 'dg mp', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Preparando a avaliação…' }));
    secao.append(corpo);
    if (vista.tela === 'teste') {
      corpo.replaceChildren(...(teste ? telaTeste() : [h('p', { class: 'texto-suave', text: 'Esta prova já foi encerrada.' }), botaoVoltarSala()]));
      focarTitulo(corpo);
      return;
    }
    carregar().then((b) => {
      banco.pronto = b;
      if (tela !== secao || !secao.isConnected) return;
      const d = ler();
      const vis = blocosVisiveis(b);
      const bl = vis.find((x) => x.id === vista.bloco);
      if (!vis.length) corpo.replaceChildren(h('p', { class: 'texto-suave', text: 'A avaliação aparece quando você tiver uma disciplina da sala Ensino Médio.' }), botaoVoltarSala());
      else if (vista.tela === 'questao' && bl) corpo.replaceChildren(...telaQuestao(bl, d));
      else if (vista.tela === 'bloco' && bl) corpo.replaceChildren(...telaFimBloco(bl, d, vis));
      else corpo.replaceChildren(...painel(vis, d));
      focarTitulo(corpo);
    }).catch((e) => corpo.replaceChildren(h('p', { class: 'texto-erro', text: e.message }), botaoVoltarSala()));
  }
  const focarTitulo = (corpo) => { const t = corpo.querySelector('h2[tabindex]'); if (t) t.focus({ preventScroll: true }); };
  const ir = (nova) => { vista = { tela: 'painel', ...nova }; if (tela) { render(tela); window.scrollTo(0, 0); } };
  const botaoVoltarSala = () => {
    const s = sala();
    return h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => App.irPara(s ? `sala-${s.id}` : 'inicio') },
      icone('i-voltar'), s ? `Voltar para a sala ${s.nome}` : 'Voltar para o Início'));
  };

  /** Abre o Mapa (da sala ou do Início). */
  function abrir() {
    vista = { tela: 'painel' };
    App.irPara('mapa-partida');
  }

  /** Antes de começar (e o "Seu mapa", quando já tem resultado). */
  function painel(vis, d) {
    const total = vis.reduce((t, bl) => t + bl.questoes.length, 0);
    const minutos = vis.reduce((t, bl) => t + Math.max(3, Math.round(bl.questoes.length * (bl.minutosPorQuestao || 1.5))), 0);
    const algum = vis.some((bl) => estadoBloco(d, bl) !== 'novo');
    const proximo = vis.find((bl) => estadoBloco(d, bl) !== 'feito');
    return [
      h('section', { class: 'cartao dg-intro', 'aria-labelledby': 'mp-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'mp-titulo', tabindex: '-1', text: algum ? 'Sua avaliação de nivelamento' : 'Avaliação de nivelamento' }),
        h('p', { class: 'dg-intro__destaque', text: 'A avaliação indica o seu nível em cada disciplina (básico, intermediário ou avançado) e organiza o plano de estudos: os módulos recomendados, os disponíveis e os que você já domina.' }),
        h('ul', { class: 'cr-lista-check' },
          h('li', { text: `${plural(total, 'questão', 'questões')} em ${plural(vis.length, 'bloco', 'blocos')}, um por área do conhecimento. Duração estimada: ${minutos} minutos. Os blocos podem ser feitos em dias diferentes.` }),
          h('li', { text: 'Se não souber a resposta, marque "Ainda não sei": o chute distorce o resultado.' }),
          h('li', { text: 'Não há cronômetro. Para interromper, use "Pausar": as respostas ficam salvas.' }),
          h('li', { text: 'O resultado organiza o plano de estudos, mas não bloqueia nada: todas as aulas continuam disponíveis.' }))),
      h('section', { class: 'cartao mp-blocos', 'aria-labelledby': 'mp-blocos-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'mp-blocos-titulo', text: 'Os blocos' }),
        h('ol', { class: 'mp-lista' }, vis.map((bl) => {
          const est = estadoBloco(d, bl);
          const s = d.blocos[bl.id] || {};
          const resp = bl.questoes.filter((q) => s.respostas && s.respostas[q.id] !== undefined).length;
          const materias = [...new Set(bl.questoes.map((q) => nomeCurso(q.curso)))];
          const textoEstado = { novo: 'Ainda não feito', andamento: `${resp} de ${bl.questoes.length} respondidas`, feito: 'Feito', novas: `${plural(bl.questoes.length - resp, 'questão nova', 'questões novas')}` }[est];
          const acao = { novo: 'Começar', andamento: 'Continuar', feito: 'Refazer', novas: 'Responder as novas' }[est];
          return h('li', { class: `mp-bloco mp-bloco--${est}`, 'data-bloco': bl.id },
            h('span', { class: 'mp-bloco__icone', 'aria-hidden': 'true' }, icone(est === 'feito' ? 'i-check' : bl.icone || 'i-alvo')),
            h('span', { class: 'mp-bloco__textos' },
              h('span', { class: 'mp-bloco__nome', text: bl.nome }),
              h('span', { class: 'texto-suave', text: `${materias.join(', ')} · ${plural(bl.questoes.length, 'questão', 'questões')}` }),
              h('span', { class: 'mp-bloco__estado' }, icone(est === 'feito' ? 'i-check' : est === 'novo' ? 'i-relogio' : 'i-seta-dir'), textoEstado)),
            h('button', { type: 'button', class: `botao ${est === 'feito' ? 'botao--fantasma' : bl === proximo ? 'botao--primario' : 'botao--secundario'} botao--pequeno`,
              'aria-label': `${acao}: bloco ${bl.nome}`, onclick: () => (est === 'feito' ? refazer(bl) : ir({ tela: 'questao', bloco: bl.id })) }, acao));
        }))),
      seuMapa(d),
      botaoVoltarSala(),
    ].filter(Boolean);
  }

  async function refazer(bl) {
    if (!(await UI.confirmar({ titulo: `Refazer o bloco ${bl.nome}?`, texto: 'As respostas deste bloco serão apagadas. O plano de estudos só muda quando você terminar o bloco de novo.', sim: 'Refazer', nao: 'Manter', humor: 'pensando' }))) return;
    const d = ler();
    d.blocos[bl.id] = { ...(d.blocos[bl.id] || {}), respostas: {}, idx: 0, concluidoEm: null };
    gravar(d);
    ir({ tela: 'questao', bloco: bl.id });
  }

  /** "Seu mapa": a faixa de cada matéria (um ícone e uma frase); a porcentagem só em "Ver detalhes". */
  function seuMapa(d) {
    const ids = Object.keys(d.resultados).filter((id) => trilha(id));
    if (!ids.length) return null;
    return h('section', { class: 'cartao mp-mapa', 'aria-labelledby': 'mp-mapa-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'mp-mapa-titulo', text: 'Resultado por disciplina' }),
      h('ul', { class: 'mp-materias' }, ids.map((id) => {
        const r = d.resultados[id];
        const f = FAIXAS[r.faixa];
        return h('li', { class: `mp-materia mp-materia--${r.faixa}` },
          h('span', { class: 'mp-materia__icone', 'aria-hidden': 'true' }, icone(f.icone)),
          h('span', { class: 'mp-materia__textos' },
            h('span', { class: 'mp-materia__nome', text: nomeCurso(id) }),
            h('strong', { class: 'mp-materia__faixa', text: f.nome }),
            h('span', { class: 'texto-suave', text: f.frase })),
          h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', 'aria-label': `Ir para ${nomeCurso(id)}`, onclick: () => App.abrirTrilha(id, { proximaAula: true }) }, 'Ir para a disciplina', icone('i-seta-dir')));
      })),
      h('details', { class: 'mp-detalhes' },
        h('summary', { text: 'Ver detalhes' }),
        h('ul', { class: 'mp-detalhes__lista' }, ids.map((id) => {
          const r = d.resultados[id];
          return h('li', { text: `${nomeCurso(id)}: ${r.acertos} de ${r.total} certas${r.naoSei ? `, ${r.naoSei} "Ainda não sei"` : ''} · ${Math.round(r.pct * 100)}% (nível ${r.nota} de 5)` });
        })),
        h('p', { class: 'texto-suave', text: 'Com poucas questões por disciplina, o resultado é uma estimativa. Qualquer módulo pode ser liberado no mapa da disciplina.' })),
      h('div', { class: 'acoes-linha' },
        h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => App.irPara('cronograma') }, icone('i-calendario'), 'Montar um cronograma')));
  }

  /* ---------- Uma questão por vez (o mesmo desenho da Avaliação Diagnóstica, sem cronômetro) ---------- */
  function telaQuestao(bl, d) {
    const s = { respostas: {}, segundos: 0, ...(d.blocos[bl.id] || {}) };
    const qs = bl.questoes;
    const primeiraEmBranco = qs.findIndex((x) => s.respostas[x.id] === undefined);
    const idx = Math.max(0, Math.min(typeof s.idx === 'number' && !(s.concluidoEm && primeiraEmBranco >= 0) ? s.idx : primeiraEmBranco < 0 ? 0 : primeiraEmBranco, qs.length - 1));
    const q = qs[idx];
    const ultima = idx === qs.length - 1;
    const novaMateria = idx > 0 && qs[idx - 1].curso !== q.curso;
    const escolhida = s.respostas[q.id];
    const inicio = Date.now();
    const guardar = (mudancas) => {
      const dd = ler();
      const atual = { respostas: {}, segundos: 0, ...(dd.blocos[bl.id] || {}) };
      dd.blocos[bl.id] = { ...atual, segundos: (atual.segundos || 0) + Math.floor((Date.now() - inicio) / 1000), ...mudancas };
      gravar(dd);
      return dd;
    };
    const proximo = h('button', { type: 'submit', class: 'botao botao--primario', id: 'mp-proxima', disabled: escolhida === undefined },
      ultima ? 'Terminar o bloco' : 'Próxima', icone(ultima ? 'i-check' : 'i-seta-dir'));
    const form = h('form', { class: 'cartao dg-questao', onsubmit: (e) => {
      e.preventDefault();
      const marcada = form.querySelector('input[name="mp-resp"]:checked');
      if (!marcada) return;
      const respostas = { ...s.respostas, [q.id]: Number(marcada.value) };
      const faltando = qs.findIndex((x, k) => k !== idx && respostas[x.id] === undefined);
      if (!ultima || faltando >= 0) {
        guardar({ respostas, idx: ultima ? faltando : idx + 1 });
        render(tela);
        window.scrollTo(0, 0);
      } else {
        concluirBloco(bl, guardar({ respostas, idx: 0 }));
      }
    } },
    h('div', { class: 'dg-questao__topo' },
      h('h2', { class: 'cartao__titulo', tabindex: '-1', id: 'mp-q-titulo' },
        h('span', { class: 'chip chip--ativo dg-questao__area', text: nomeCurso(q.curso) }), ` ${bl.nome} · questão ${idx + 1} de ${qs.length}`)),
    h('div', { class: 'barra-progresso', role: 'progressbar', 'aria-label': `Progresso do bloco ${bl.nome}`, 'aria-valuemin': '0', 'aria-valuemax': String(qs.length), 'aria-valuenow': String(idx) },
      h('div', { class: 'barra-progresso__preenchimento', style: `width: ${Math.round((idx / qs.length) * 100)}%` })),
    novaMateria ? h('p', { class: 'dg-nova-area', role: 'status' }, h('strong', { text: `Agora: ${nomeCurso(q.curso)}.` }), '') : null,
    ...corpoQuestao(q, escolhida, 'mp-resp', () => { proximo.disabled = false; }),
    h('div', { class: 'dg-questao__acoes' },
      h('button', { type: 'button', class: 'botao botao--fantasma', id: 'mp-pausar', onclick: () => { guardar({ idx }); ir({ tela: 'painel' }); UI.toast('Avaliação pausada', 'Suas respostas ficaram salvas.', 'i-relogio'); } }, 'Pausar'),
      idx > 0 ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { guardar({ idx: idx - 1 }); render(tela); } }, icone('i-voltar'), 'Anterior') : null,
      proximo));
    return [form];
  }

  /** Texto, enunciado e alternativas + "Ainda não sei" (radio; teclado e leitor de tela como na Diagnóstica). */
  function corpoQuestao(q, escolhida, nome, aoEscolher) {
    const opcao = (valor, rotulo, texto, extra = '') => h('label', { class: `dg-opcao ${extra}`.trim() },
      h('input', { type: 'radio', name: nome, value: String(valor), checked: escolhida === valor, onchange: aoEscolher }),
      rotulo ? h('span', { class: 'dg-opcao__letra', text: rotulo }) : null,
      h('span', { class: 'dg-opcao__texto', text: texto }));
    return [
      q.texto ? h('div', { class: 'dg-texto' }, String(q.texto).split('\n').map((linha) => h('p', { text: linha }))) : null,
      h('p', { class: 'dg-enunciado', text: q.enunciado }),
      q.codigo ? UI.codigo(q.codigo) : null,
      h('fieldset', { class: 'dg-opcoes' },
        h('legend', { class: 'visualmente-oculto', text: 'Alternativas' }),
        q.alternativas.map((alt, i) => opcao(i, LETRAS[i], alt)),
        opcao(-1, null, 'Ainda não sei', 'dg-opcao--nao-sei')),
    ].filter(Boolean);
  }

  function concluirBloco(bl, d) {
    const s = d.blocos[bl.id];
    const res = avaliarBloco(bl, s.respostas);
    const em = new Date().toISOString();
    const primeiraVez = !s.xp;
    Object.entries(res.disciplinas).forEach(([curso, r]) => {
      const qsCurso = bl.questoes.filter((q) => q.curso === curso);
      const certos = [...new Set(qsCurso.filter((q) => s.respostas[q.id] === q.correta).map((q) => q.moduloId))];
      const errados = [...new Set(qsCurso.filter((q) => s.respostas[q.id] !== q.correta).map((q) => q.moduloId))];
      const naoSei = qsCurso.filter((q) => naoRespondida(s.respostas[q.id])).length;
      const faixa = faixaDaNota(r.nota);
      d.resultados[curso] = { nota: r.nota, pct: r.pct, faixa, acertos: r.acertos, total: r.n, naoSei, em };
      const t = trilha(curso);
      if (t) Caminho.aplicarMapa(t, { faixa, certos, errados });
    });
    s.concluidoEm = Date.now();
    s.xp = true;
    const vis = banco && banco.pronto ? blocosVisiveis(banco.pronto) : [];
    if (vis.length && vis.every((x) => estadoBloco(d, x) === 'feito')) d.completoEm = d.completoEm || Date.now();
    gravar(d);
    Atividade.registrar('diagnostica_concluida', bl.questoes[0].curso, {
      teste: 'mapa-partida', bloco: bl.id, acertos: res.acertos, total: res.total, nao_sei: res.naoSei, nota: res.nota, segundos: s.segundos || 0,
      ...Object.fromEntries(Object.entries(res.disciplinas).map(([curso, r]) => [`nota_${curso}`, r.nota])),
    });
    if (primeiraVez) App.concederXP(bl.questoes[0].curso, PONTOS_BLOCO, `Nivelamento: bloco ${bl.nome}`);
    else UI.toast('Bloco concluído', `Bloco ${bl.nome} concluído. O plano de estudos foi atualizado.`, 'i-check');
    ir({ tela: 'bloco', bloco: bl.id });
  }

  /** Fim de um bloco: a faixa das matérias dele e o próximo passo. */
  function telaFimBloco(bl, d, vis) {
    const cursos = [...new Set(bl.questoes.map((q) => q.curso))];
    const proximo = vis.find((x) => estadoBloco(d, x) !== 'feito');
    const s = sala();
    return [
      h('section', { class: 'cartao dg-resultado', 'aria-labelledby': 'mp-fim-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'mp-fim-titulo', tabindex: '-1', text: `Bloco ${bl.nome}: concluído` }),
        h('ul', { class: 'mp-materias' }, cursos.filter((id) => d.resultados[id]).map((id) => {
          const f = FAIXAS[d.resultados[id].faixa];
          return h('li', { class: `mp-materia mp-materia--${d.resultados[id].faixa}` },
            h('span', { class: 'mp-materia__icone', 'aria-hidden': 'true' }, icone(f.icone)),
            h('span', { class: 'mp-materia__textos' },
              h('span', { class: 'mp-materia__nome', text: nomeCurso(id) }),
              h('strong', { class: 'mp-materia__faixa', text: f.nome }),
              h('span', { class: 'texto-suave', text: f.frase })));
        })),
        h('p', { class: 'texto-suave', text: 'O plano de estudos da sala foi atualizado com estes resultados.' }),
        h('div', { class: 'acoes-linha' },
          proximo ? h('button', { type: 'button', class: 'botao botao--primario', id: 'mp-proximo-bloco', onclick: () => ir({ tela: 'questao', bloco: proximo.id }) }, icone('i-seta-dir'), `Próximo bloco: ${proximo.nome}`) : null,
          s ? h('button', { type: 'button', class: proximo ? 'botao botao--secundario' : 'botao botao--primario', onclick: () => App.irPara(`sala-${s.id}`) }, icone('i-alvo'), 'Ver o plano de estudos') : null,
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => ir({ tela: 'painel' }) }, 'Ver o resultado'))),
      rever(bl, d.blocos[bl.id].respostas),
    ];
  }

  /** As questões com a resposta certa e a explicação (abre uma por vez). */
  function rever(lista, respostas, titulo = 'Correção das questões') {
    const qs = Array.isArray(lista) ? lista : lista.questoes;
    return h('section', { class: 'cartao dg-rever', 'aria-labelledby': 'mp-rever-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'mp-rever-titulo', text: titulo }),
      h('ol', { class: 'dg-revisao' }, qs.map((q, n) => {
        const resp = respostas[q.id];
        const ok = resp === q.correta;
        return h('li', { class: `dg-rev ${ok ? 'dg-rev--certa' : 'dg-rev--errada'}` },
          h('details', {},
            h('summary', {}, h('span', { class: 'dg-rev__marca', text: ok ? '✓' : naoRespondida(resp) ? '?' : '✗', 'aria-hidden': 'true' }),
              h('span', { text: `${n + 1}. ${q.tema}` }), h('span', { class: 'visualmente-oculto', text: ok ? ' (acertou)' : naoRespondida(resp) ? ' (ainda não sabia)' : ' (para revisar)' })),
            q.texto ? h('div', { class: 'dg-texto' }, String(q.texto).split('\n').map((linha) => h('p', { text: linha }))) : null,
            h('p', { class: 'dg-enunciado', text: q.enunciado }),
            h('ul', { class: 'dg-rev__alts' }, q.alternativas.map((alt, j) => h('li', { class: `${j === q.correta ? 'dg-rev__alt--certa' : ''} ${j === resp && !ok ? 'dg-rev__alt--sua' : ''}`.trim() },
              h('strong', { text: `${LETRAS[j]}) ` }), alt,
              j === q.correta ? h('span', { class: 'visualmente-oculto', text: ' (resposta certa)' }) : null,
              j === resp && !ok && q.comentarios && q.comentarios[j] ? h('span', { class: 'dg-rev__coment', text: ` Sua resposta: ${q.comentarios[j]}` }) : null))),
            naoRespondida(resp) ? h('p', { class: 'texto-suave', text: 'Você marcou "Ainda não sei".' }) : null,
            h('p', { class: 'dg-rev__explica', text: q.explicacao })));
      })));
  }

  /* =========================================================
     TESTE RÁPIDO DO MÓDULO
     ========================================================= */
  /** As 5 questões: uma média ou difícil de cada aula (sem a Revisão do módulo); falta aula? Completa com outras do módulo. */
  function sortearTeste(t, moduloId) {
    const fases = t.fases.filter((f) => (f.moduloId || f.modulo) === moduloId);
    const aulas = fases.filter((f) => !/^revis[aã]o\b/i.test(String(f.nome).replace(/^aula\s+\d+\s*·\s*/i, '')));
    const fortes = (fase) => t.questoes.filter((q) => q.fase === fase.id && q.dificuldade !== 'facil');
    const escolhidas = [];
    embaralhar([...aulas]).forEach((f) => { const q = embaralhar(fortes(f))[0]; if (q && escolhidas.length < TESTE.questoes) escolhidas.push(q); });
    const resto = embaralhar(aulas.flatMap(fortes).filter((q) => !escolhidas.includes(q)));
    while (escolhidas.length < TESTE.questoes && resto.length) escolhidas.push(resto.pop());
    const ordem = new Map(fases.map((f, i) => [f.id, i]));
    return escolhidas.sort((a, b) => ordem.get(a.fase) - ordem.get(b.fase));
  }

  /** Abre a Prova de suficiência de um módulo (do mapa do curso). */
  function abrirTeste(trilhaId, moduloId) {
    const t = trilha(trilhaId);
    if (!t) return;
    const comecar = () => {
      const questoes = sortearTeste(t, moduloId);
      if (!questoes.length) { UI.toast('Prova indisponível', 'Este módulo ainda não tem questões para a prova de suficiência.', 'i-alerta'); return; }
      const mod = Caminho.modulos(t).find((m) => m.id === moduloId);
      teste = { trilhaId, moduloId, nomeModulo: mod ? mod.nome : moduloId, questoes, respostas: {}, idx: 0, inicio: Date.now(), fim: null };
      vista = { tela: 'teste' };
      App.irPara('mapa-partida');
    };
    if (t._parcial) App.comCursoCompleto(comecar, 'Preparando a prova…'); else comecar();
  }

  function telaTeste() {
    if (teste.fim) return telaFimTeste();
    const { questoes: qs, idx } = teste;
    const q = qs[idx];
    const ultima = idx === qs.length - 1;
    const escolhida = teste.respostas[q.id];
    const proximo = h('button', { type: 'submit', class: 'botao botao--primario', id: 'tr-proxima', disabled: escolhida === undefined },
      ultima ? 'Ver o resultado' : 'Próxima', icone(ultima ? 'i-check' : 'i-seta-dir'));
    const form = h('form', { class: 'cartao dg-questao', onsubmit: (e) => {
      e.preventDefault();
      const marcada = form.querySelector('input[name="tr-resp"]:checked');
      if (!marcada) return;
      teste.respostas[q.id] = Number(marcada.value);
      if (ultima) concluirTeste(); else teste.idx += 1;
      render(tela);
      window.scrollTo(0, 0);
    } },
    h('div', { class: 'dg-questao__topo' },
      h('h2', { class: 'cartao__titulo', tabindex: '-1', id: 'tr-q-titulo' },
        h('span', { class: 'chip chip--ativo dg-questao__area', text: teste.nomeModulo.replace(/^Módulo\s+\d+\s*·\s*/i, '') }), ` Questão ${idx + 1} de ${qs.length}`)),
    h('div', { class: 'barra-progresso', role: 'progressbar', 'aria-label': 'Progresso da prova de suficiência', 'aria-valuemin': '0', 'aria-valuemax': String(qs.length), 'aria-valuenow': String(idx) },
      h('div', { class: 'barra-progresso__preenchimento', style: `width: ${Math.round((idx / qs.length) * 100)}%` })),
    ...corpoQuestao(q, escolhida, 'tr-resp', () => { proximo.disabled = false; }),
    h('div', { class: 'dg-questao__acoes' },
      h('button', { type: 'button', class: 'botao botao--fantasma', id: 'tr-sair', onclick: () => { const id = teste.trilhaId; teste = null; App.abrirTrilha(id); } }, 'Sair da prova'),
      idx > 0 ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { teste.idx -= 1; render(tela); } }, icone('i-voltar'), 'Anterior') : null,
      proximo));
    return [form];
  }

  function concluirTeste() {
    const { questoes: qs, respostas } = teste;
    const acertos = qs.filter((q) => respostas[q.id] === q.correta).length;
    const precisa = Math.min(TESTE.passa, Math.ceil(qs.length * 0.8));
    teste.fim = Date.now();
    teste.acertos = acertos;
    teste.passou = acertos >= precisa;
    teste.precisa = precisa;
    const t = trilha(teste.trilhaId);
    const atual = Caminho.estados(t, Progresso.carregar(t.id)).get(teste.moduloId);
    if (teste.passou) Caminho.definir(t.id, teste.moduloId, 'dominado', 'teste');
    else if (atual && atual.estado === 'depois') Caminho.definir(t.id, teste.moduloId, 'liberado', 'teste');
    Atividade.registrar('diagnostica_concluida', t.id, {
      teste: 'teste-rapido', modulo: teste.moduloId, acertos, total: qs.length, passou: teste.passou,
      nao_sei: qs.filter((q) => naoRespondida(respostas[q.id])).length, segundos: Math.round((teste.fim - teste.inicio) / 1000),
    });
  }

  function telaFimTeste() {
    const t = trilha(teste.trilhaId);
    const mods = Caminho.modulos(t);
    const i = mods.findIndex((m) => m.id === teste.moduloId);
    const mod = mods[i];
    const seguinte = mods.slice(i + 1).find((m) => Caminho.estados(t, Progresso.carregar(t.id)).get(m.id).estado !== 'dominado');
    const abrirAula = (fase) => { const id = t.id; teste = null; App.abrirTrilha(id, { fase: fase.id }); };
    return [
      h('section', { class: `cartao dg-resultado tr-resultado ${teste.passou ? 'tr-resultado--ok' : ''}`, 'aria-labelledby': 'tr-fim-titulo' },
        UI.mascote(`tr-resultado__mascote ${teste.passou ? 'mascote--feliz' : 'mascote--pensando'}`),
        h('h2', { class: 'cartao__titulo', id: 'tr-fim-titulo', tabindex: '-1', text: teste.passou ? 'Módulo dominado' : 'Resultado da prova de suficiência' }),
        h('p', {}, h('strong', { text: `${teste.acertos} de ${teste.questoes.length} certas. ` }), teste.passou
          ? `${mod.nome} foi considerado dominado: as aulas dele deixam de ser exigidas para a prova final e continuam disponíveis para revisão.`
          : `Eram necessários ${teste.precisa} acertos. O módulo fica disponível no seu plano de estudos, a partir da ${mod.fases[0].nome.replace(/\s*·.*$/, '')}. A prova pode ser refeita a qualquer momento.`),
        h('div', { class: 'acoes-linha' },
          teste.passou && seguinte ? h('button', { type: 'button', class: 'botao botao--primario', id: 'tr-seguinte', onclick: () => abrirAula(seguinte.fases.find((f) => !(Progresso.carregar(t.id).fases[f.id] || {}).concluida) || seguinte.fases[0]) }, icone('i-seta-dir'), `Seguir para: ${seguinte.nome}`) : null,
          !teste.passou ? h('button', { type: 'button', class: 'botao botao--primario', id: 'tr-aula1', onclick: () => abrirAula(mod.fases[0]) }, icone('i-livro'), `Começar: ${mod.fases[0].nome}`) : null,
          h('button', { type: 'button', class: 'botao botao--secundario', onclick: () => { const id = t.id; teste = null; App.abrirTrilha(id); } }, icone('i-voltar'), 'Voltar ao mapa da disciplina'))),
      rever(teste.questoes, teste.respostas, 'Correção da prova'),
    ];
  }

  return { render, abrir, abrirTeste, resultado, situacao, FAIXAS };
})();

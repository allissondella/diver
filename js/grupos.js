/*
 * grupos.js — as "salas" do Diver (2026-10-12).
 *
 * Em todo o app (Início, "Sala atual" da barra lateral e Biblioteca) o aluno vê só as salas:
 *  - Mergulho no Enem e Vestibular: o "Comece por aqui" em destaque e as matérias pelas áreas da prova;
 *  - Radiologia: os cursos de diagnóstico por imagem;
 *  - ISO/IEC 27001:2022 Foundation e Cibersegurança Essencial (salas de um curso só, com o nome do curso).
 * O conteúdo aparece só depois que ele entra na sala (tela "Sala", js/app.js). Sala com um curso só abre o curso direto.
 * Cada matéria continua sendo um curso de verdade (mesmo id, mesmo progresso): a sala só muda a vitrine.
 * Curso novo da sala (por exemplo, as matérias da Onda 9) entra sozinho na área certa quando aparece no catálogo.
 * Curso que não pertence a nenhuma sala (trilha importada, criada colando texto) ganha uma sala própria.
 * Área sem curso publicado não aparece (nada de "em breve").
 */
const Grupos = (() => {
  const LISTA = [
    {
      id: 'enem',
      nome: 'Mergulho no Enem e Vestibular',
      rotulo: 'Enem e vestibulares',
      descricao: 'Comece por aqui e depois mergulhe matéria por matéria, organizadas pelas áreas da prova.',
      icone: 'i-bandeira',
      cor: 'amarelo',
      rotuloAula: 'aulas',
      destaque: 'enem-vestibular',
      destaqueSelo: 'Recomendado para começar',
      cronograma: true, // a sala indica o Cronograma de estudos (atalho no topo e aviso na primeira visita)
      unidade: ['matéria', 'matérias'],
      prefixo: /^(Mergulho no Enem|Enem e Vestibular|Enem)\s*·\s*/i,
      pertence: (t) => /^enem-/.test(t.id),
      areas: [
        { nome: 'Linguagens', cor: 'lilas', icone: 'i-letras', cursos: ['enem-portugues', 'enem-literatura', 'enem-artes-ef', 'enem-ingles', 'enem-espanhol'] },
        { nome: 'Ciências Humanas', cor: 'laranja', icone: 'i-livro', cursos: ['enem-historia', 'enem-geografia', 'enem-filosofia', 'enem-sociologia'] },
        { nome: 'Ciências da Natureza', cor: 'verde', icone: 'i-bolha', cursos: ['enem-biologia', 'enem-quimica', 'enem-fisica'] },
        { nome: 'Matemática', cor: 'azul', icone: 'i-grafico', cursos: ['enem-matematica'] },
        { nome: 'Redação', cor: 'amarelo', icone: 'i-nota', cursos: ['enem-redacao'] },
      ],
    },
    {
      id: 'radiologia',
      nome: 'Radiologia',
      rotulo: 'Medicina',
      descricao: 'Diagnóstico por imagem por aparelho, com casos clínicos, diagnóstico diferencial e as pegadinhas das provas de título.',
      icone: 'i-lupa',
      cor: 'turquesa',
      rotuloAula: 'fases',
      unidade: ['curso', 'cursos'],
      prefixo: /^Radiologia:\s*/i,
      pertence: (t) => /^radiologia-/.test(t.id),
      areas: [
        { nome: null, cor: 'turquesa', icone: null, cursos: ['radiologia-aparelho-digestivo', 'radiologia-musculoesqueletico', 'radiologia-cabeca-pescoco', 'radiologia-geniturinario'] },
      ],
    },
    {
      id: 'iso',
      nome: 'ISO/IEC 27001:2022 Foundation',
      rotulo: 'Certificação',
      descricao: 'A norma de segurança da informação explicada fase a fase, pronta para a prova Foundation.',
      icone: 'i-lista-check',
      cor: 'lilas',
      rotuloAula: 'fases',
      unidade: ['curso', 'cursos'],
      prefixo: null,
      pertence: (t) => /^iso-27001/.test(t.id),
      areas: [],
    },
    {
      id: 'ciber',
      nome: 'Cibersegurança Essencial',
      rotulo: 'Segurança digital',
      descricao: 'Aprender a se cuidar na vida digital: golpes, senhas, redes sociais e o detetive da Operação Recife Sombrio.',
      icone: 'i-cadeado',
      cor: 'azul',
      rotuloAula: 'fases',
      unidade: ['curso', 'cursos'],
      prefixo: null,
      pertence: (t) => /^ciberseguranca/.test(t.id),
      areas: [],
    },
  ];

  /** Sala própria de um curso que não pertence a nenhuma sala da lista (ex.: trilha importada). */
  function salaPropria(t) {
    return {
      id: `curso-${t.id}`, nome: t.nome, rotulo: t.categoria || 'Curso', descricao: t.descricao || '',
      icone: 'i-livro', cor: 'turquesa', rotuloAula: 'fases', unidade: ['curso', 'cursos'], prefixo: null, areas: [], propria: true,
    };
  }

  /** Nome curto do curso dentro da sala ("Mergulho no Enem · Matemática" → "Matemática"). */
  function nomeCurto(sala, t) {
    const curto = (sala && sala.prefixo ? t.nome.replace(sala.prefixo, '').trim() : t.nome) || t.nome;
    // palavra comprida em cartão estreito: hífen opcional (­) só aparece se precisar quebrar a linha
    return curto.replace(/Musculoesquelético/g, 'Musculo­esquelético');
  }

  /** Monta a sala com os cursos que a pessoa tem: { ...definição, destaque, areas: [{ area, trilhas }], trilhas, unica }. */
  function montar(def, membros) {
    const porId = new Map(membros.map((t) => [t.id, t]));
    const destaque = def.destaque ? porId.get(def.destaque) || null : null;
    const listados = new Set(def.areas.flatMap((a) => a.cursos));
    const areas = def.areas
      .map((area) => ({ area, trilhas: area.cursos.map((id) => porId.get(id)).filter(Boolean) }))
      .filter((a) => a.trilhas.length);
    // curso da sala que ainda não tem área definida: entra numa área "Mais cursos", no fim
    const soltos = membros.filter((t) => t !== destaque && !listados.has(t.id));
    if (soltos.length) areas.push({ area: { nome: def.areas.length ? 'Mais cursos' : null, cor: def.cor, icone: 'i-livro', cursos: [] }, trilhas: soltos });
    const trilhas = [destaque, ...areas.flatMap((a) => a.trilhas)].filter(Boolean);
    return { ...def, definicao: def, destaque, areas, trilhas, unica: trilhas.length === 1 ? trilhas[0] : null };
  }

  /** As salas, na ordem da vitrine (as da LISTA primeiro; depois as salas próprias, na ordem do catálogo). Sala vazia não aparece. */
  function salas(trilhas) {
    const usados = new Set();
    const lista = [];
    LISTA.forEach((def) => {
      const membros = trilhas.filter((t) => def.pertence(t));
      if (!membros.length) return;
      membros.forEach((t) => usados.add(t.id));
      lista.push(montar(def, membros));
    });
    trilhas.filter((t) => !usados.has(t.id)).forEach((t) => lista.push(montar(salaPropria(t), [t])));
    return lista;
  }

  /** Todas as trilhas na ordem das salas (destaque e áreas na ordem certa). */
  function ordenar(trilhas) {
    return salas(trilhas).flatMap((s) => s.trilhas);
  }

  /** A sala de um curso (ou null). */
  function salaDoCurso(trilhas, id) {
    return salas(trilhas).find((s) => s.trilhas.some((t) => t.id === id)) || null;
  }

  /** Progresso somado da sala: { cursos, total (fases/aulas), feitas, questoes, pct }. */
  function resumo(sala) {
    let total = 0;
    let feitas = 0;
    let questoes = 0;
    sala.trilhas.forEach((t) => {
      const prog = Progresso.carregar(t.id);
      total += t.fases.length;
      feitas += t.fases.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida).length;
      questoes += Trilhas.totalQuestoes(t);
    });
    return { cursos: sala.trilhas.length, total, feitas, questoes, pct: total ? Math.round((feitas / total) * 100) : 0 };
  }

  /** Linha de números da sala: "10 matérias · 353 aulas · 7.000 questões" (sala de um curso só: sem a contagem de cursos). */
  function numeros(sala, r = resumo(sala)) {
    const fmt = (n) => n.toLocaleString('pt-BR');
    return [
      sala.unica ? null : `${fmt(r.cursos)} ${r.cursos === 1 ? sala.unidade[0] : sala.unidade[1]}`,
      `${fmt(r.total)} ${sala.unica ? 'fases' : sala.rotuloAula}`,
      `${fmt(r.questoes)} questões`,
    ].filter(Boolean);
  }

  /**
   * Cartão de uma sala (Início e Biblioteca): a "porta" da sala, com escotilha, nome, números e progresso.
   * aoEntrar: o que fazer no toque (abrir a sala ou, se ela tem um curso só, o curso).
   */
  function cartao(sala, aoEntrar) {
    const { h, icone } = UI;
    const r = resumo(sala);
    return h('button', {
      type: 'button', class: `sala-porta sala--${sala.cor}`, 'data-sala': sala.id, onclick: () => aoEntrar(sala),
      'aria-label': `${sala.nome}. ${numeros(sala, r).join(', ')}. ${r.pct}% feito. Entrar na sala`,
    },
    h('span', { class: 'sala-porta__escotilha', 'aria-hidden': 'true' }, icone(sala.icone)),
    h('span', { class: 'sala-porta__textos', 'aria-hidden': 'true' },
      h('span', { class: 'rotulo sala-porta__rotulo', text: sala.rotulo }),
      h('span', { class: 'sala-porta__nome', text: sala.nome }),
      sala.descricao ? h('span', { class: 'sala-porta__descricao', text: sala.descricao }) : null,
      h('span', { class: 'sala-porta__numeros' }, numeros(sala, r).map((n) => h('span', { text: n })))),
    h('span', { class: 'sala-porta__pe', 'aria-hidden': 'true' },
      h('span', { class: 'trilha__progresso sala-porta__barra' }, h('span', { style: `width:${r.pct}%` })),
      h('span', { class: 'sala-porta__pct', text: `${r.pct}%` }),
      h('span', { class: 'sala-porta__entrar' }, 'Entrar', icone('i-seta-dir'))));
  }

  /**
   * Seções para listas detalhadas (Admin, menus de escolha de curso):
   * [{ id, titulo, icone, cor, grupo (a sala), partes: [{ area, trilhas: [{ trilha, nome }] }] }].
   */
  function secoes(trilhas) {
    return salas(trilhas).map((sala) => ({
      id: sala.id, titulo: sala.nome, icone: sala.icone, cor: sala.cor, grupo: sala,
      partes: [
        ...(sala.destaque ? [{ area: { nome: sala.destaqueSelo, cor: 'amarelo', icone: 'i-estrela' }, trilhas: [{ trilha: sala.destaque, nome: nomeCurto(sala, sala.destaque) }] }] : []),
        ...sala.areas.map(({ area, trilhas: ts }) => ({ area, trilhas: ts.map((t) => ({ trilha: t, nome: nomeCurto(sala, t) })) })),
      ],
    }));
  }

  /** Opções de um <select> separadas por sala (<optgroup>); `primeira` é a opção do topo (ex.: "Todas as trilhas"). */
  function opcoesSelect(trilhas, selecionada, primeira = null) {
    const { h } = UI;
    const grupos = secoes(trilhas).map((sec) => h('optgroup', { label: sec.titulo },
      sec.partes.flatMap((p) => p.trilhas.map(({ trilha, nome }) => h('option', { value: trilha.id, selected: trilha.id === selecionada, text: nome })))));
    return [primeira, ...grupos].filter(Boolean);
  }

  return { LISTA, salas, ordenar, salaDoCurso, resumo, numeros, cartao, secoes, opcoesSelect, nomeCurto };
})();

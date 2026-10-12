/*
 * grupos.js — organiza a lista de cursos do Início em grupos (2026-10-12).
 *
 * Cada matéria continua sendo um curso de verdade (mesmo id, mesmo progresso); o grupo só muda a vitrine:
 *  - "Mergulho no Enem e Vestibular": o "Comece por aqui" em destaque e as matérias pelas áreas da prova;
 *  - "Radiologia": os cursos de diagnóstico por imagem juntos.
 * Matéria nova (por exemplo, as da Onda 9) entra sozinha na área certa quando o curso aparece no catálogo.
 * Área sem curso publicado não aparece (nada de "em breve").
 */
const Grupos = (() => {
  const LISTA = [
    {
      id: 'enem',
      nome: 'Mergulho no Enem e Vestibular',
      rotulo: 'Preparatório completo',
      descricao: 'Comece por aqui e depois mergulhe matéria por matéria, organizadas pelas áreas da prova.',
      icone: 'i-bandeira',
      rotuloAula: 'aulas',
      destaque: 'enem-vestibular',
      destaqueSelo: 'Recomendado para começar',
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
      rotuloAula: 'fases',
      unidade: ['curso', 'cursos'],
      prefixo: /^Radiologia:\s*/i,
      pertence: (t) => /^radiologia-/.test(t.id),
      areas: [
        { nome: null, cor: 'turquesa', icone: null, cursos: ['radiologia-aparelho-digestivo', 'radiologia-musculoesqueletico', 'radiologia-cabeca-pescoco', 'radiologia-geniturinario'] },
      ],
    },
  ];

  /** Nome curto do curso dentro do grupo ("Enem · Matemática" → "Matemática"). */
  function nomeCurto(grupo, t) {
    const curto = t.nome.replace(grupo.prefixo, '').trim() || t.nome;
    // palavra comprida em cartão estreito: hífen opcional (\u00AD) só aparece se precisar quebrar a linha
    return curto.replace(/Musculoesquelético/g, 'Musculo\u00ADesquelético');
  }

  /**
   * Separa as trilhas em itens para a vitrine:
   *  { tipo: 'grupo', grupo, destaque, areas: [{ area, trilhas }], trilhas } e { tipo: 'curso', trilha }.
   * Grupos vêm primeiro (na ordem de LISTA); os cursos avulsos seguem na ordem do catálogo.
   * Grupo com um curso só vira cartão comum: agrupar um item não organiza nada.
   */
  function organizar(trilhas) {
    const usados = new Set();
    const itens = [];
    LISTA.forEach((grupo) => {
      const membros = trilhas.filter((t) => grupo.pertence(t));
      if (membros.length < 2) return;
      membros.forEach((t) => usados.add(t.id));
      const porId = new Map(membros.map((t) => [t.id, t]));
      const destaque = grupo.destaque ? porId.get(grupo.destaque) || null : null;
      const listados = new Set(grupo.areas.flatMap((a) => a.cursos));
      const areas = grupo.areas
        .map((area) => ({ area, trilhas: area.cursos.map((id) => porId.get(id)).filter(Boolean) }))
        .filter((a) => a.trilhas.length);
      // curso do grupo que ainda não tem área definida: entra numa área "Mais cursos", no fim
      const soltos = membros.filter((t) => t !== destaque && !listados.has(t.id));
      if (soltos.length) areas.push({ area: { nome: 'Mais cursos', cor: 'turquesa', icone: 'i-livro', cursos: [] }, trilhas: soltos });
      itens.push({ tipo: 'grupo', grupo, destaque, areas, trilhas: membros });
    });
    trilhas.filter((t) => !usados.has(t.id)).forEach((t) => itens.push({ tipo: 'curso', trilha: t }));
    return itens;
  }

  /** Em que grupo está o curso (ou null). */
  function doCurso(id) {
    return LISTA.find((g) => g.pertence({ id })) || null;
  }

  return { LISTA, organizar, nomeCurto, doCurso };
})();

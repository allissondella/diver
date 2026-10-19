/*
 * conquistas.js — lista de conquistas e a verificação de quais foram desbloqueadas.
 *
 * Cada conquista tem um teste que recebe:
 *   prog  -> progresso da trilha (ver progresso.js)
 *   ctx   -> contexto do momento (combo atual, fase concluída, nota do simulado...)
 *   trilha -> a trilha atual
 * Para criar uma nova, basta adicionar um item na lista.
 * "so" (opcional): a conquista só existe nos cursos em que so(trilha) é verdadeiro (ex.: os da sala Ensino Médio).
 */
const Conquistas = (() => {
  const retomada = (t) => /^em-/.test(t.id);
  const LISTA = [
    {
      id: 'primeiro-mergulho',
      nome: 'Primeiro mergulho',
      descricao: 'Respondeu a primeira questão. A água está ótima.',
      icone: 'i-bolha',
      testar: (prog) => prog.stats.respondidas >= 1,
    },
    {
      id: 'combo-10',
      nome: '10 acertos seguidos',
      descricao: 'Dez acertos sem errar nenhum. Fôlego de atleta.',
      icone: 'i-raio',
      testar: (prog) => prog.stats.maiorCombo >= 10,
    },
    {
      id: 'fase-completa',
      nome: 'Fase completa',
      descricao: 'Completou uma fase inteira no modo Mergulho.',
      icone: 'i-check',
      testar: (prog) => Object.values(prog.fases).some((f) => f.concluida),
    },
    {
      id: 'folego-de-sobra',
      nome: 'Fôlego de sobra',
      descricao: 'Completou uma fase sem perder oxigênio.',
      icone: 'i-oxigenio',
      testar: (prog) => Object.values(prog.fases).some((f) => f.estrelas === 3),
    },
    {
      id: 'tocou-o-fundo',
      nome: 'Tocou o fundo',
      descricao: 'Completou a última fase da trilha. Lá embaixo é bonito, né?',
      icone: 'i-ancora',
      testar: (prog, ctx, trilha) => {
        const ultima = trilha.fases[trilha.fases.length - 1];
        return !!(prog.fases[ultima.id] && prog.fases[ultima.id].concluida);
      },
    },
    {
      id: 'meta-batida',
      nome: 'Meta batida',
      descricao: 'Cumpriu a meta diária de questões.',
      icone: 'i-alvo',
      testar: (prog) => Progresso.respondidasHoje(prog) >= prog.metaDiaria,
    },
    {
      id: 'streak-3',
      nome: '3 dias seguidos',
      descricao: 'Três dias seguidos de estudo. Virou rotina.',
      icone: 'i-onda',
      testar: (prog) => prog.streak.melhor >= 3,
    },
    {
      id: 'streak-7',
      nome: '7 dias seguidos',
      descricao: 'Uma semana inteira mergulhando. Respeito.',
      icone: 'i-onda',
      testar: (prog) => prog.streak.melhor >= 7,
    },
    {
      id: 'primeiro-simulado',
      nome: 'Prova de fogo (molhada)',
      descricao: 'Terminou o primeiro simulado.',
      icone: 'i-relogio',
      testar: (prog) => prog.simulados.length >= 1,
    },
    {
      id: 'nota-de-respeito',
      nome: 'Nota de respeito',
      descricao: 'Tirou 9 ou mais em um simulado com pelo menos 10 questões.',
      icone: 'i-estrela',
      testar: (prog) => prog.simulados.some((s) => s.nota >= 9 && s.total >= 10),
    },
    {
      id: 'aprovado-prova',
      nome: 'Aprovado!',
      descricao: 'Passou na prova final da trilha. Pode colocar no currículo (o mergulho, pelo menos).',
      icone: 'i-trofeu',
      testar: (prog) => (prog.provas || []).some((p) => p.aprovado),
    },
    {
      id: 'voltou-pra-buscar',
      nome: 'Voltou pra buscar',
      descricao: 'Acertou 5 questões no modo Revisão.',
      icone: 'i-revisao',
      testar: (prog) => prog.stats.acertosRevisao >= 5,
    },
    {
      id: 'colecionador',
      nome: 'Colecionador de pérolas',
      descricao: 'Juntou 100 pérolas nesta trilha.',
      icone: 'i-perola',
      testar: (prog) => prog.perolas >= 100,
    },
    {
      id: 'mestre-diver',
      nome: 'Mestre Diver',
      descricao: 'Chegou ao nível máximo. Pode ensinar os peixes.',
      icone: 'i-trofeu',
      testar: (prog) => Progresso.nivel(prog.xp).max,
    },
    // Sala Ensino Médio (cursos em-*; docs/cadernos/ensino-medio-retomada.md, decisão g). Os ids ficam: já há progresso gravado.
    {
      id: 'voltei-a-estudar',
      nome: 'Primeira aula',
      descricao: 'Concluiu a primeira aula da sala Ensino Médio.',
      icone: 'i-bandeira',
      so: retomada,
      testar: (prog) => !!(prog.retomada && prog.retomada.primeiraAula),
    },
    {
      id: 'mapa-na-mao',
      nome: 'Nivelamento concluído',
      descricao: 'Fez a avaliação de nivelamento de todas as áreas disponíveis.',
      icone: 'i-alvo',
      so: retomada,
      testar: () => typeof MapaPartida !== 'undefined' && MapaPartida.situacao().feito,
    },
    {
      id: 'de-volta-a-agua',
      nome: 'Retorno aos estudos',
      descricao: 'Concluiu uma aula depois de duas semanas ou mais sem estudar.',
      icone: 'i-boia',
      so: retomada,
      testar: (prog) => !!(prog.retomada && prog.retomada.voltouDaPausa),
    },
    {
      id: 'materia-retomada',
      nome: 'Disciplina concluída',
      descricao: 'Foi aprovado na prova final de uma disciplina do Ensino Médio.',
      icone: 'i-trofeu',
      so: retomada,
      testar: (prog) => (prog.provas || []).some((p) => p.aprovado),
    },
  ];

  /*
   * Conquistas gerais: valem para a pessoa, fora de qualquer curso (Mapa das Profissões, 2026-10-16).
   * Ficam em "diver:v1:conquistas-gerais" (vão para a nuvem como o resto) e não entram na contagem por curso.
   * Os números vêm do estado do Mapa (diver:v1:profissoes), lido direto do armazenamento: o módulo pode nem estar carregado.
   */
  const CHAVE_GERAIS = 'diver:v1:conquistas-gerais';
  const mapa = () => { const e = Dados.ler('diver:v1:profissoes', null); return e && typeof e === 'object' ? e : {}; };
  const GERAIS = [
    {
      id: 'explorador-de-carreiras',
      nome: 'Explorador de carreiras',
      descricao: 'Abriu 5 fichas do Mapa das Profissões.',
      icone: 'i-bussola',
      testar: () => Object.keys(mapa().vistas || {}).length >= 5,
    },
    {
      id: 'um-dia-na-pele',
      nome: 'Um dia na pele',
      descricao: 'Viveu 3 dias de trabalho no "Um dia como".',
      icone: 'i-relogio',
      testar: () => (mapa().diaConcluido || []).length >= 3,
    },
    {
      id: 'baralho-completo',
      nome: 'Baralho completo',
      descricao: 'Gerou a sua Carta Diver em todas as fichas publicadas.',
      icone: 'i-cartas',
      testar: (publicadas) => publicadas.length > 0 && publicadas.every((id) => (mapa().cartasGeradas || []).includes(id)),
    },
    {
      // Panorama da Tecnologia (js/profissoes-panorama.js): as dez áreas ficam em mapa().tec.areasVistas
      id: 'dez-em-dez',
      nome: 'Dez em dez',
      descricao: 'Abriu as dez áreas do Panorama da Tecnologia.',
      icone: 'i-codigo',
      testar: () => Object.keys((mapa().tec && mapa().tec.areasVistas) || {}).length >= 10,
    },
    {
      // Panorama da Medicina (mesmo módulo): as doze especialidades ficam em mapa().med.areasVistas
      id: 'doze-em-doze',
      nome: 'Doze em doze',
      descricao: 'Abriu as doze especialidades do Panorama da Medicina.',
      icone: 'i-estrela',
      testar: () => Object.keys((mapa().med && mapa().med.areasVistas) || {}).length >= 12,
    },
    {
      // Panorama do Marketing Digital (2026-10-19): as nove áreas ficam em mapa().pan_marketing.areasVistas
      id: 'nove-em-nove',
      nome: 'Nove em nove',
      descricao: 'Abriu as nove áreas do Panorama do Marketing Digital.',
      icone: 'i-lampada',
      testar: () => Object.keys((mapa().pan_marketing && mapa().pan_marketing.areasVistas) || {}).length >= 9,
    },
    {
      // Panorama de Finanças, Gestão e Negócios (2026-10-19): as dez áreas ficam em mapa().pan_negocios.areasVistas
      id: 'dez-em-dez-negocios',
      nome: 'Dez em dez, de novo',
      descricao: 'Abriu as dez áreas do Panorama de Finanças, Gestão e Negócios.',
      icone: 'i-grafico',
      testar: () => Object.keys((mapa().pan_negocios && mapa().pan_negocios.areasVistas) || {}).length >= 10,
    },
  ];
  const lerGerais = () => { const g = Dados.ler(CHAVE_GERAIS, null); return g && typeof g === 'object' ? g : {}; };

  /** As conquistas gerais, cada uma com "feita" (data em ms) ou null. */
  function gerais() {
    const feitas = lerGerais();
    return GERAIS.map((c) => ({ ...c, feita: feitas[c.id] || null }));
  }

  /** Confere as gerais ainda bloqueadas; publicadas = ids das fichas publicadas (para o Baralho completo). Devolve as novas. */
  function verificarGerais(publicadas = []) {
    const feitas = lerGerais();
    const novas = GERAIS.filter((c) => !feitas[c.id] && c.testar(publicadas));
    if (!novas.length) return [];
    novas.forEach((c) => { feitas[c.id] = Date.now(); });
    Dados.gravar(CHAVE_GERAIS, feitas);
    return novas;
  }

  /** As conquistas que existem num curso (sem as que são de outros cursos). */
  function daTrilha(trilha) {
    return LISTA.filter((c) => !c.so || (trilha && c.so(trilha)));
  }

  /**
   * Verifica todas as conquistas ainda bloqueadas.
   * Marca as novas no progresso e devolve a lista delas (para mostrar o aviso).
   */
  function verificar(prog, trilha, ctx = {}) {
    const novas = [];
    daTrilha(trilha).forEach((c) => {
      if (prog.conquistas[c.id]) return;
      if (c.testar(prog, ctx, trilha)) {
        prog.conquistas[c.id] = Date.now();
        novas.push(c);
      }
    });
    return novas;
  }

  return { LISTA, daTrilha, verificar, gerais, verificarGerais };
})();

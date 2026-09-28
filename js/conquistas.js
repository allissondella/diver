/*
 * conquistas.js — lista de conquistas e a verificação de quais foram desbloqueadas.
 *
 * Cada conquista tem um teste que recebe:
 *   prog  -> progresso da trilha (ver progresso.js)
 *   ctx   -> contexto do momento (combo atual, fase concluída, nota do simulado...)
 *   trilha -> a trilha atual
 * Para criar uma nova, basta adicionar um item na lista.
 */
const Conquistas = (() => {
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
  ];

  /**
   * Verifica todas as conquistas ainda bloqueadas.
   * Marca as novas no progresso e devolve a lista delas (para mostrar o aviso).
   */
  function verificar(prog, trilha, ctx = {}) {
    const novas = [];
    LISTA.forEach((c) => {
      if (prog.conquistas[c.id]) return;
      if (c.testar(prog, ctx, trilha)) {
        prog.conquistas[c.id] = Date.now();
        novas.push(c);
      }
    });
    return novas;
  }

  return { LISTA, verificar };
})();

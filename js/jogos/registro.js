/*
 * jogos/registro.js — o catálogo da Sala de Jogos.
 *
 * Contrato (docs/JOGOS.md): cada jogo é um objeto registrado com Jogos.registrar({...}):
 *   id, nome, grupo, icone, descricao, duracao,
 *   requer: { tipoDeCarta: quantidadeMinima }   (padrão: { multipla: 4 })
 *   iniciar(contexto) -> { destruir() }          (monta a tela em contexto.container)
 *
 * Contexto entregue ao jogo:
 *   { container, trilha, cartas, prog, opcoes, aoTerminar(resultado), gastarPerolas(n) }
 * O jogo termina chamando contexto.aoTerminar(resultadoPadrao). Ele NUNCA concede XP:
 * quem faz isso é o js/economia.js.
 */
const Jogos = (() => {
  const GRUPOS = [
    { id: 'nucleo', nome: 'Núcleo', descricao: 'A base de perguntas e respostas.' },
    { id: 'rapidos', nome: 'Jogos rápidos', descricao: 'Partidas de 2 a 5 minutos para revisar um pouquinho a cada dia.' },
    { id: 'aventuras', nome: 'Aventuras', descricao: 'Mapa, chefão e sobrevivência.' },
    { id: 'estrategia', nome: 'Estratégia e duelos', descricao: 'Jogos maiores, sozinho ou contra alguém no mesmo aparelho.' },
    { id: 'v2', nome: 'Depois do lançamento', descricao: 'Já pensados, ficam para a versão 2.' },
  ];

  const lista = [];

  function registrar(def) {
    if (lista.some((j) => j.id === def.id)) return;
    lista.push({ requer: { multipla: 4 }, duracao: '2-5 min', ...def });
  }

  function obter(id) {
    return lista.find((j) => j.id === id) || null;
  }

  /**
   * Estado do card na Sala de Jogos para uma trilha:
   * 'disponivel' | 'precisa' (falta conteúdo) | 'embreve'
   */
  function estado(def, cartas) {
    if (def.emBreve) return 'embreve';
    if (def.nucleo) return 'disponivel';
    return Cartas.temConteudo(def, cartas) ? 'disponivel' : 'precisa';
  }

  /* ---------- Núcleo: os três modos que já existiam (abertos pelo app.js) ---------- */
  registrar({ id: 'mergulho', nome: 'Mergulho', grupo: 'nucleo', icone: 'i-ancora', nucleo: 'mergulho', duracao: '5 min',
    descricao: 'Quiz por fases com oxigênio. Cada fase é uma profundidade.' });
  registrar({ id: 'simulado', nome: 'Simulado', grupo: 'nucleo', icone: 'i-relogio', nucleo: 'simulado', duracao: '5-20 min',
    descricao: 'Cronometrado, correção no final e nota de 0 a 10.' });
  registrar({ id: 'revisao', nome: 'Revisão', grupo: 'nucleo', icone: 'i-revisao', nucleo: 'revisao', duracao: '3 min',
    descricao: 'Só as questões que você errou ou marcou.' });

  /* ---------- Em breve (planejados no ROADMAP) ---------- */
  registrar({ id: 'torre', nome: 'Torre do Saber', grupo: 'estrategia', icone: 'i-colunas', emBreve: 'Semana 16',
    descricao: 'Tire blocos respondendo. Errou? A torre balança.' });
  registrar({ id: 'duelo', nome: 'Duelo de Mergulhadores', grupo: 'estrategia', icone: 'i-usuario', emBreve: 'Semana 17',
    descricao: 'Dois jogadores no mesmo aparelho disputando as pérolas.' });
  registrar({ id: 'cruzadinha', nome: 'Cruzadinha Submarina', grupo: 'v2', icone: 'i-bolha', emBreve: 'v2',
    descricao: 'Mini palavras cruzadas com as palavras-chave da trilha.' });
  registrar({ id: 'batalha', nome: 'Batalha de Turmas ao vivo', grupo: 'v2', icone: 'i-onda', emBreve: 'v2',
    descricao: 'Turmas competem ao mesmo tempo, em esquadras.' });

  /**
   * Monta um Resultado padrão a partir do que o jogo registrou.
   * Ajuda os jogos a não esquecerem nenhum campo.
   */
  function resultado({ jogoId, trilha, detalhes, inicio, concluido = true, comboMaximo = 0, oxigenioRestante = null, bonus, pontuacao, titulo, subtitulo }) {
    const acertos = detalhes.filter((d) => d.acertou && !d.neutro).length;
    const erros = detalhes.filter((d) => !d.acertou && !d.neutro).length;
    return {
      jogoId, trilhaId: trilha.id, fase: null, concluido,
      acertos, erros, total: detalhes.length,
      tempoSegundos: Math.round((Date.now() - inicio) / 1000),
      comboMaximo, perfeito: erros === 0 && detalhes.length > 0, oxigenioRestante,
      detalhes, bonus: bonus || { xp: 0, perolas: 0 }, pontuacao, titulo, subtitulo,
    };
  }

  return { GRUPOS, registrar, obter, estado, resultado, lista: () => [...lista] };
})();

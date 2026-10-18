/*
 * Tiro de Reflexo (Sala de Descompressão, 2026-10-18, pedido do usuário: "placas verdes onde a pessoa deve atirar ou
 * vermelhas que perde, mas a cada fase vai diminuindo o tempo que a placa aparece, tem que ser um jogo de reação, e não
 * deve aparecer placas ali onde a arma tampa").
 * - Placa verde (o disco com o alvo): atire. Placa vermelha (o octógono com o X): um jato nela acaba a partida.
 * - Cada verde que escapa gasta 1 de 3 tanques de oxigênio; sem tanque, acabou. 1 ponto por verde; vale o recorde.
 * - A cada fase a placa fica menos tempo de pé (de 1,6 s até 0,45 s), nasce mais rápido, aparecem mais juntas e as
 *   vermelhas ficam mais comuns. Nenhuma placa nasce onde a pistola pode tampar.
 * O jogo é o mesmo motor do Tiro ao Alvo (a barraca, a pistola, o jato e o som): TiroAoAlvo.abrir(ctx, { modo: 'reflexo' }),
 * em js/descompressao/tiro.js. O placar é novo (sala-reflexo): o do Tiro ao Alvo antigo da sala não se mistura com este.
 */
Descompressao.registrar({
  id: 'reflexo',
  nome: 'Tiro de Reflexo',
  curto: 'Reflexo',
  icone: 'i-alvo',
  duracao: 'quanto você aguentar',
  diario: false,
  telaCheia: true, // o jogo ocupa a janela inteira; a barra da Sala fica por cima
  descricao: 'Pistola d\'água na mão: placa verde, atire; vermelha, nem pensar. A cada fase a placa fica menos tempo de pé.',
  abrir(ctx) {
    return TiroAoAlvo.abrir({
      ...ctx,
      tela: 'tela-descompressao',
      textoVoltar: 'Voltar para a sala',
      concluir: (fim) => {
        ctx.pontuar(fim.pontos, { acertos: fim.pontos, nivel: fim.nivel, segundos: fim.segundos, motivo: fim.motivo,
          reacao: fim.reacao ? Math.round(fim.reacao * 1000) : null }); // a reação média, em milissegundos
        return null; // na sala, os pontos valem só o placar
      },
    }, { modo: 'reflexo' });
  },
});

/*
 * Tiro ao Alvo (Sala de Jogos, 2026-10-18). Pedido do usuário: "vamos deixar esse jogo da pistola como educacional para
 * quem faz o enem ou ensino médio lá na sala de jogos"; e, sobre o conteúdo: "pode deixar como está o jogo agora, não muda
 * nada". É o jogo que morava na Sala de Descompressão (as 26 regras de escola, os níveis, a festa e o álbum), pelo motor
 * TiroAoAlvo.abrir(ctx, { modo: 'regras' }) de js/descompressao/tiro.js, em tela toda (telaCheia: true).
 * - Só aparece nos cursos das salas Mergulho no Enem e Vestibular e Ensino Médio (Grupos.LISTA).
 * - Vale XP e pérolas pela economia a cada rodada, sem sair do jogo (ctx.concluirRodada): cada nível completo é um acerto
 *   (fácil nos níveis 1 e 2, médio no 3 e no 4, difícil do 5 em diante, com o combo da economia), a placa do fim é o erro,
 *   e cada 4 pontos viram 1 de XP de bônus. O XP da rodada aparece no fim, em "Em números".
 * - O álbum e a escolha do som continuam no estado da Sala de Descompressão (diver:v1:descompressao → jogos.tiro): quem já
 *   tinha selos não perde nenhum. O recorde é o do curso (prog.jogos['tiro-ao-alvo'].melhor), como nos outros jogos.
 */
(() => {
  const CHAVE = 'diver:v1:descompressao';
  const SALAS = ['enem', 'ensino-medio'];
  /** O curso é das salas do Enem ou do Ensino Médio? */
  const daSala = (trilhaId) => !!trilhaId && Grupos.LISTA.some((s) => SALAS.includes(s.id) && s.pertence({ id: trilhaId }));
  /** O estado guardado junto com o da Sala de Descompressão (o álbum de regras e o som) */
  const ler = () => {
    const d = Dados.ler(CHAVE, null);
    return d && typeof d === 'object' ? d : {};
  };
  const dificuldade = (nivel) => (nivel <= 2 ? 'facil' : nivel <= 4 ? 'medio' : 'dificil');

  Jogos.registrar({
    id: 'tiro-ao-alvo',
    nome: 'Tiro ao Alvo',
    grupo: 'rapidos',
    icone: 'i-alvo',
    duracao: '2-5 min',
    telaCheia: true, // o jogo ocupa a janela inteira; a barra de cima (sair, nome, Som e Tela cheia) fica por cima dele
    descricao: 'Pistola d\'água na mão: acerte só as placas da regra, como peixes, primos ou capitais.',
    temConteudo: (cartas) => daSala(cartas.trilhaId),
    iniciar(ctx) {
      const motor = TiroAoAlvo.abrir({
        container: ctx.container,
        barra: ctx.barra,
        tela: 'tela-jogo',
        textoVoltar: 'Voltar para a Sala de Jogos',
        notaPontos: '1 ponto por acerto; cada nível completo vale XP e pérolas no curso.',
        voltar: ctx.sair,
        estado: () => (ler().jogos || {}).tiro || null,
        gravar: (parcial) => {
          const d = ler();
          d.jogos = d.jogos || {};
          d.jogos.tiro = { ...(d.jogos.tiro || {}), ...parcial };
          Dados.gravar(CHAVE, d);
        },
        recorde: () => ((ctx.prog.jogos || {})['tiro-ao-alvo'] || {}).melhor || 0,
        guia: (passos, forcar = false) => Tutorial.guiar('jogo-tiro-ao-alvo', passos, { forcar }),
        // a rodada vira um Resultado padrão: um acerto por nível completo e o erro da placa do fim
        concluir: (fim) => {
          const detalhes = fim.feitos.map((f) => ({ cartaId: null, tema: f.familia, acertou: true, dificuldade: dificuldade(f.nivel),
            pergunta: `Nível ${f.nivel}: ${f.regra}`, resposta: `${f.acertos} placas certas` }));
          detalhes.push({ cartaId: null, tema: fim.regra.familia, acertou: false, dificuldade: dificuldade(fim.nivel),
            pergunta: `Nível ${fim.nivel}: ${fim.regra.texto}`, sua: fim.placa.rotulo, explicacao: fim.porque });
          const res = Jogos.resultado({
            jogoId: 'tiro-ao-alvo', trilha: ctx.trilha, detalhes, inicio: Date.now() - fim.segundos * 1000,
            bonus: { xp: Math.floor(fim.pontos / 4), perolas: 0 }, pontuacao: fim.pontos,
            titulo: `${fim.pontos} ${fim.pontos === 1 ? 'ponto' : 'pontos'} no Tiro ao Alvo`, subtitulo: `Chegou ao nível ${fim.nivel}.`,
          });
          res.registro = { pontos: fim.pontos, nivel: fim.nivel, motivo: fim.motivo, seguidas: fim.seguidas };
          return ctx.concluirRodada(res);
        },
      }, { modo: 'regras' });
      return { destruir: () => motor.parar(), emAndamento: motor.emAndamento };
    },
  });
})();

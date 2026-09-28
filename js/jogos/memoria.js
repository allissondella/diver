/*
 * Memória (memoria) — conchas viradas: encontre os pares termo ↔ definição.
 * Grade 3×4 (6 pares), 4×4 (8) ou 4×5 (10). Par certo fica aberto (e mostra a definição);
 * par errado desvira depois de ~1 s. Menos tentativas e menos tempo = bônus.
 * Teclado: setas movem entre as conchas, Enter ou Espaço vira.
 */
Jogos.registrar({
  id: 'memoria',
  nome: 'Memória',
  grupo: 'rapidos',
  icone: 'i-concha',
  descricao: 'Conchas que abrem e fecham: encontre os pares termo ↔ definição.',
  duracao: '2-5 min',
  requer: { pares: 6 },
  opcoes: [{ id: 'pares', rotulo: 'Tamanho', valores: [[6, '6 pares'], [8, '8 pares'], [10, '10 pares']], padrao: 6 }],

  iniciar(ctx) {
    const { h } = UI;
    const qtdPares = Math.min(ctx.opcoes.pares || 6, ctx.cartas.pares.length);
    const pares = UI.embaralhar(ctx.cartas.pares).slice(0, qtdPares);
    const conchas = UI.embaralhar(pares.flatMap((p, n) => [
      { par: n, lado: 'termo', texto: p.termo },
      { par: n, lado: 'definicao', texto: p.definicao },
    ]));
    const colunas = qtdPares <= 6 ? 3 : 4;
    const inicio = Date.now();
    const errosPorPar = pares.map(() => 0);
    let abertas = []; // índices das conchas viradas agora (no máximo 2)
    let encontrados = 0;
    let tentativas = 0;
    let travado = false;
    let espera = null;

    const hud = h('div', { class: 'jogo-hud' });
    const aviso = h('p', { class: 'memoria-aviso', 'aria-live': 'polite' });
    const grade = h('div', { class: 'memoria', role: 'group', 'aria-label': 'Conchas da memória. Use as setas para andar entre elas.', style: `--colunas:${colunas}` });
    ctx.container.replaceChildren(hud, grade, aviso);

    function atualizarHud() {
      hud.replaceChildren(h('span', { text: `Pares: ${encontrados} de ${qtdPares}` }), h('span', { text: `Tentativas: ${tentativas}` }));
    }

    const botoes = conchas.map((c, idx) => {
      const b = h('button', {
        type: 'button', class: `concha concha--${c.lado}`, 'aria-label': `Concha ${idx + 1}, fechada`, tabindex: idx === 0 ? '0' : '-1',
        onclick: () => virar(idx),
      },
      h('span', { class: 'concha__costas', 'aria-hidden': 'true' }, UI.icone('i-concha')),
      h('span', { class: 'concha__frente' }, h('span', { class: 'concha__tipo', text: c.lado === 'termo' ? 'Termo' : 'Definição' }), h('span', { text: c.texto })));
      grade.append(b);
      return b;
    });

    function rotulo(idx) {
      const c = conchas[idx];
      const b = botoes[idx];
      if (b.classList.contains('concha--achada')) return `${c.lado === 'termo' ? 'Termo' : 'Definição'}: ${c.texto}. Par encontrado`;
      if (b.classList.contains('concha--aberta')) return `${c.lado === 'termo' ? 'Termo' : 'Definição'}: ${c.texto}`;
      return `Concha ${idx + 1}, fechada`;
    }

    function virar(idx) {
      const b = botoes[idx];
      if (travado || b.classList.contains('concha--aberta') || b.classList.contains('concha--achada')) return;
      b.classList.add('concha--aberta');
      b.setAttribute('aria-label', rotulo(idx));
      abertas.push(idx);
      if (abertas.length < 2) return;

      tentativas++;
      const [a, bIdx] = abertas;
      if (conchas[a].par === conchas[bIdx].par) {
        encontrados++;
        [a, bIdx].forEach((k) => {
          botoes[k].classList.remove('concha--aberta');
          botoes[k].classList.add('concha--achada');
          botoes[k].setAttribute('aria-label', rotulo(k));
        });
        const p = pares[conchas[a].par];
        aviso.textContent = `Par! ${p.termo} ↔ ${p.definicao}`;
        abertas = [];
        atualizarHud();
        if (encontrados === qtdPares) setTimeout(terminar, UI.movimentoReduzido ? 200 : 900);
      } else {
        errosPorPar[conchas[a].par]++;
        errosPorPar[conchas[bIdx].par]++;
        aviso.textContent = 'Não formam par. Guarda na memória!';
        travado = true;
        espera = setTimeout(() => {
          abertas.forEach((k) => {
            botoes[k].classList.remove('concha--aberta');
            botoes[k].setAttribute('aria-label', rotulo(k));
          });
          abertas = [];
          travado = false;
        }, 1000);
        atualizarHud();
      }
    }

    // Setas movem o foco pela grade (padrão "roving tabindex")
    grade.addEventListener('keydown', (e) => {
      const atual = botoes.indexOf(document.activeElement);
      if (atual < 0) return;
      const passo = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: colunas, ArrowUp: -colunas }[e.key];
      if (!passo) return;
      e.preventDefault();
      const novo = Math.min(botoes.length - 1, Math.max(0, atual + passo));
      botoes[atual].tabIndex = -1;
      botoes[novo].tabIndex = 0;
      botoes[novo].focus();
    });

    function terminar() {
      const segundos = Math.round((Date.now() - inicio) / 1000);
      const detalhes = pares.map((p, n) => JogoComum.detalhe(p, errosPorPar[n] <= 1, {
        pergunta: p.termo, resposta: p.definicao, sua: errosPorPar[n] > 1 ? `Você errou esse par ${errosPorPar[n]} vezes.` : '',
      }));
      const bonus = { xp: segundos <= qtdPares * 10 ? 10 : 0, perolas: tentativas <= qtdPares + 2 ? 3 : 0 };
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'memoria', trilha: ctx.trilha, detalhes, inicio, bonus, pontuacao: Math.max(0, 100 - (tentativas - qtdPares) * 5),
        titulo: tentativas === qtdPares ? 'Memória de peixe? Jamais.' : 'Todas as conchas abertas!',
        subtitulo: `${qtdPares} pares em ${tentativas} tentativas.${bonus.perolas ? ' Bônus de pérolas por poucas tentativas!' : ''}`,
      }));
    }

    atualizarHud();
    botoes[0].focus({ preventScroll: true });
    return { destruir: () => clearTimeout(espera) };
  },
});

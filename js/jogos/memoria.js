/*
 * Memória (memoria) — conchas viradas: encontre os pares termo ↔ definição.
 * Grade 3×4 (6 pares), 4×4 (8) ou 4×5 (10). Par certo fica aberto (e mostra a definição);
 * par errado desvira depois de ~1 s.
 * Recompensa: terminar sempre rende um prêmio; o tempo dá medalha (ouro, prata, bronze)
 * e poucas tentativas dão pérolas extras. O relógio e a próxima medalha aparecem no topo.
 * Um par só conta como erro quando você já tinha visto as duas conchas dele e mesmo
 * assim errou (errar no escuro, no começo, faz parte do jogo).
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

  // Segundos por par para cada medalha (6 pares: ouro até 1:30, prata até 2:30, bronze até 4:00)
  MEDALHAS: [
    { id: 'ouro', nome: 'ouro', porPar: 15, xp: 30, perolas: 6 },
    { id: 'prata', nome: 'prata', porPar: 25, xp: 20, perolas: 4 },
    { id: 'bronze', nome: 'bronze', porPar: 40, xp: 12, perolas: 2 },
  ],
  CONCLUIR: { xp: 10, perolas: 2 }, // prêmio garantido por abrir todas as conchas
  AFIADA: { perolas: 3 }, // poucas tentativas (até 1,5 × o número de pares)

  iniciar(ctx) {
    const { MEDALHAS, CONCLUIR, AFIADA } = this;
    const { h } = UI;
    const qtdPares = Math.min(ctx.opcoes.pares || 6, ctx.cartas.pares.length);
    const pares = UI.embaralhar(ctx.cartas.pares).slice(0, qtdPares);
    const conchas = UI.embaralhar(pares.flatMap((p, n) => [
      { par: n, lado: 'termo', texto: p.termo },
      { par: n, lado: 'definicao', texto: p.definicao },
    ]));
    const colunas = qtdPares <= 6 ? 3 : 4;
    const inicio = Date.now();
    const errosPorPar = pares.map(() => 0); // erros "de memória": as duas conchas do par já tinham sido vistas
    const vistas = new Set();
    const limites = MEDALHAS.map((m) => ({ ...m, ate: m.porPar * qtdPares }));
    const medalhaDe = (seg) => limites.find((m) => seg <= m.ate) || null;
    const parceira = (idx) => conchas.findIndex((c, k) => k !== idx && c.par === conchas[idx].par);
    let abertas = []; // índices das conchas viradas agora (no máximo 2)
    let encontrados = 0;
    let tentativas = 0;
    let travado = false;
    let espera = null;
    let relogio = null;

    const hud = h('div', { class: 'jogo-hud' });
    const aviso = h('p', { class: 'memoria-aviso', 'aria-live': 'polite' });
    const grade = h('div', { class: 'memoria', role: 'group', 'aria-label': 'Conchas da memória. Use as setas para andar entre elas.', style: `--colunas:${colunas}` });
    ctx.container.replaceChildren(hud, grade, aviso);

    const tempo = h('span', { class: 'memoria-tempo' });
    function atualizarTempo() {
      const seg = Math.floor((Date.now() - inicio) / 1000);
      const alvo = medalhaDe(seg);
      tempo.replaceChildren(
        h('span', { text: `Tempo ${UI.formatarTempo(seg)}` }),
        alvo ? h('span', { class: `medalha medalha--${alvo.id}`, text: `${alvo.nome[0].toUpperCase() + alvo.nome.slice(1)} até ${UI.formatarTempo(alvo.ate)}` })
          : h('span', { class: 'medalha', text: 'Termine para ganhar o prêmio' }));
    }
    function atualizarHud() {
      hud.replaceChildren(h('span', { text: `Pares: ${encontrados} de ${qtdPares}` }), h('span', { text: `Tentativas: ${tentativas}` }), tempo);
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
        // Só é erro de memória se o par de alguma das duas já estava todo à vista antes desta jogada
        [a, bIdx].forEach((k) => {
          if (vistas.has(k) && vistas.has(parceira(k))) errosPorPar[conchas[k].par]++;
        });
        vistas.add(a);
        vistas.add(bIdx);
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
      clearInterval(relogio);
      const segundos = Math.round((Date.now() - inicio) / 1000);
      const detalhes = pares.map((p, n) => JogoComum.detalhe(p, errosPorPar[n] <= 1, {
        pergunta: p.termo, resposta: p.definicao, sua: errosPorPar[n] > 1 ? `Você já tinha visto esse par e errou ${errosPorPar[n]} vezes.` : '',
      }));
      const medalha = medalhaDe(segundos);
      const afiada = tentativas <= Math.ceil(qtdPares * 1.5);
      const bonus = {
        xp: CONCLUIR.xp + (medalha ? medalha.xp : 0),
        perolas: CONCLUIR.perolas + (medalha ? medalha.perolas : 0) + (afiada ? AFIADA.perolas : 0),
      };
      bonus.motivo = [medalha ? `medalha de ${medalha.nome} no tempo` : 'conchas todas abertas', afiada ? 'memória afiada' : ''].filter(Boolean).join(' + ');
      const proxima = medalha ? limites[limites.indexOf(medalha) - 1] : limites[limites.length - 1];
      const dica = proxima ? ` Para a medalha de ${proxima.nome}, termine em até ${UI.formatarTempo(proxima.ate)}.` : '';
      // Pontuação (recorde): tentativas e tempo contam
      const pontuacao = Math.max(0, 100 - (tentativas - qtdPares) * 4 + (medalha ? { ouro: 30, prata: 20, bronze: 10 }[medalha.id] : 0));
      ctx.aoTerminar(Jogos.resultado({
        jogoId: 'memoria', trilha: ctx.trilha, detalhes, inicio, bonus, pontuacao,
        titulo: medalha && medalha.id === 'ouro' ? 'Medalha de ouro! Memória de peixe? Jamais.' : medalha ? `Medalha de ${medalha.nome}!` : 'Todas as conchas abertas!',
        subtitulo: `${qtdPares} pares em ${tentativas} tentativas e ${UI.formatarTempo(segundos)}.${dica}`,
      }));
    }

    atualizarTempo();
    atualizarHud();
    relogio = setInterval(atualizarTempo, 1000);
    botoes[0].focus({ preventScroll: true });
    return { destruir: () => { clearTimeout(espera); clearInterval(relogio); } };
  },
});

/*
 * Memória (memoria) — conchas viradas: encontre os pares termo ↔ definição.
 * Grade 3×4 (6 pares), 4×4 (8) ou 4×5 (10). Par certo fica aberto (e mostra a definição);
 * par errado desvira depois de ~1 s.
 * Recompensa: terminar sempre rende um prêmio; o tempo dá medalha (ouro, prata, bronze)
 * e poucas tentativas dão pérolas extras. O relógio e a próxima medalha aparecem no topo.
 * Um par só conta como erro quando você já tinha visto as duas conchas dele e mesmo
 * assim errou (errar no escuro, no começo, faz parte do jogo).
 * Teclado: setas movem entre as conchas, Enter ou Espaço vira.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): o recife raso ao meio-dia, com a luz do sol dançando na areia,
 * algas, corais e um cardume que passa. Par achado solta bolhas das duas conchas; par errado só desvira (sem bronca:
 * errar no escuro faz parte). Regras, medalhas, pérolas e XP iguais; o fim fica no próprio jogo, com "Jogar de novo".
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
  telaCheia: true,

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
    const colunas = qtdPares <= 6 ? 3 : 4;
    const limites = MEDALHAS.map((m) => ({ ...m, ate: m.porPar * qtdPares }));
    const medalhaDe = (seg) => limites.find((m) => seg <= m.ate) || null;
    const nomeMedalha = (m) => m.nome[0].toUpperCase() + m.nome.slice(1);
    const palco = Palco.montar(ctx, { id: 'memoria', cena: cenaRecife() });
    let espera = null;
    let relogio = null;
    let fimAgendado = null;

    function comecar() {
      clearTimeout(espera);
      clearTimeout(fimAgendado);
      clearInterval(relogio);
      const pares = UI.embaralhar(ctx.cartas.pares).slice(0, qtdPares);
      const conchas = UI.embaralhar(pares.flatMap((p, n) => [
        { par: n, lado: 'termo', texto: p.termo },
        { par: n, lado: 'definicao', texto: p.definicao },
      ]));
      const inicio = Date.now();
      const errosPorPar = pares.map(() => 0); // erros "de memória": as duas conchas do par já tinham sido vistas
      const vistas = new Set();
      const parceira = (idx) => conchas.findIndex((c, k) => k !== idx && c.par === conchas[idx].par);
      let abertas = []; // índices das conchas viradas agora (no máximo 2)
      let encontrados = 0;
      let tentativas = 0;
      let travado = false;

      const aviso = h('p', { class: 'memoria-aviso', 'aria-live': 'polite' });
      const grade = h('div', { class: 'memoria', role: 'group', 'aria-label': 'Conchas da memória. Use as setas para andar entre elas.', style: `--colunas:${colunas}` });
      palco.area.replaceChildren(grade, aviso);

      function atualizarHud() {
        const seg = Math.floor((Date.now() - inicio) / 1000);
        const alvo = medalhaDe(seg);
        palco.hud(
          palco.pilula(`Pares: ${encontrados} de ${qtdPares}`, { icone: 'i-concha', classe: 'palco__pilula--turquesa' }),
          palco.pilula(`Tentativas: ${tentativas}`),
          palco.pilula(UI.formatarTempo(seg), { icone: 'i-relogio', rotulo: `Tempo: ${UI.formatarTempo(seg)}` }),
          alvo ? palco.pilula(`${nomeMedalha(alvo)} até ${UI.formatarTempo(alvo.ate)}`, { icone: 'i-medalha', classe: `memoria-medalha memoria-medalha--${alvo.id}` })
            : palco.pilula('Termine para ganhar o prêmio', { icone: 'i-medalha' }));
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
        palco.tocar('virar');
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
          palco.reagir('acerto', { el: botoes[a] });
          palco.reagir('par', { el: botoes[bIdx] });
          atualizarHud();
          if (encontrados === qtdPares) fimAgendado = setTimeout(terminar, UI.movimentoReduzido ? 200 : 900);
        } else {
          // Só é erro de memória se o par de alguma das duas já estava todo à vista antes desta jogada
          [a, bIdx].forEach((k) => {
            if (vistas.has(k) && vistas.has(parceira(k))) errosPorPar[conchas[k].par]++;
          });
          vistas.add(a);
          vistas.add(bIdx);
          aviso.textContent = 'Não formam par. Guarda na memória!';
          palco.reagir('areia', { el: botoes[bIdx] }); // só uma nuvenzinha de areia: errar no escuro faz parte
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
        palco.area.replaceChildren();
        palco.hud();
        palco.terminar(Jogos.resultado({
          jogoId: 'memoria', trilha: ctx.trilha, detalhes, inicio, bonus, pontuacao,
          titulo: medalha && medalha.id === 'ouro' ? 'Medalha de ouro! Memória de peixe? Jamais.' : medalha ? `Medalha de ${medalha.nome}!` : 'Todas as conchas abertas!',
          subtitulo: `${qtdPares} pares em ${tentativas} tentativas e ${UI.formatarTempo(segundos)}.${dica}`,
        }), {
          tom: 'vitoria',
          numeros: [['Pares', `${qtdPares}/${qtdPares}`, true], ['Tentativas', tentativas], ['Tempo', UI.formatarTempo(segundos)], ['Medalha', medalha ? nomeMedalha(medalha) : 'Sem']],
          aoJogarDeNovo: comecar,
        });
      }

      atualizarHud();
      relogio = setInterval(atualizarHud, 1000);
      botoes[0].focus({ preventScroll: true });
    }

    palco.abertura({
      rotulo: 'No recife raso',
      titulo: 'Memória',
      lead: 'As conchas guardam termos e definições. Ache os pares; cada par aberto mostra a ideia completa.',
      passos: [
        ['01', 'Vire duas conchas. ', 'Se formarem par, ficam abertas; se não, fecham de novo em um segundo.'],
        ['02', 'Errar no escuro não conta. ', 'Só vale como erro quando você já tinha visto as duas conchas do par.'],
        ['03', 'Corra pela medalha. ', `Ouro até ${UI.formatarTempo(limites[0].ate)}, prata até ${UI.formatarTempo(limites[1].ate)} e bronze até ${UI.formatarTempo(limites[2].ate)}. No teclado, setas e Enter.`],
      ],
      numeros: [['Pares', qtdPares, true]],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() {
        clearTimeout(espera);
        clearTimeout(fimAgendado);
        clearInterval(relogio);
        palco.parar();
      },
    };

    /* ---------- A cena: o recife raso ao meio-dia ---------- */
    function cenaRecife() {
      const { COR, misturar, alfa, degrade, raios, poeira, seme, tela } = Palco.pintar;
      let fundo = null;
      let L0 = 0;
      let A0 = 0;
      let peixes = [];
      let algas = [];

      function medir(L, A) {
        L0 = L;
        A0 = A;
        fundo = tela(L, A);
        const f = fundo.getContext('2d');
        // a água rasa: clara em cima (o sol perto) e mais funda embaixo
        f.fillStyle = degrade(f, 0, A, [[0, misturar(COR.turquesa, COR.claro, 0.15)], [0.25, misturar(COR.turquesaEscura, COR.turquesa, 0.35)], [0.7, misturar(COR.turquesaEscura, COR.marinho, 0.45)], [1, misturar(COR.marinho, COR.fundo, 0.3)]]);
        f.fillRect(0, 0, L, A);
        // a areia do fundo, em dunas, e as pedras de coral nos cantos
        const r = seme(41);
        const areia = A * 0.84;
        f.fillStyle = degrade(f, areia - 30, A, [[0, misturar(COR.perola, COR.turquesaEscura, 0.45)], [1, misturar(COR.perola, COR.marinho, 0.7)]]);
        f.beginPath();
        f.moveTo(0, A);
        f.lineTo(0, areia);
        for (let x = 0; x <= L; x += L / 6) f.quadraticCurveTo(x + L / 12, areia - 18 - r() * 26, x + L / 6, areia + (r() - 0.5) * 10);
        f.lineTo(L, A);
        f.closePath();
        f.fill();
        const coral = (x, y, s, cor) => {
          f.fillStyle = cor;
          for (let i = 0; i < 7; i++) {
            const a = -Math.PI / 2 + (i - 3) * 0.32;
            const comp = s * (0.6 + r() * 0.5);
            f.beginPath();
            f.ellipse(x + Math.cos(a) * comp * 0.5, y + Math.sin(a) * comp * 0.5, s * 0.12, comp * 0.5, a + Math.PI / 2, 0, Math.PI * 2);
            f.fill();
          }
        };
        const s = Math.max(40, Math.min(L, A) * 0.12);
        coral(s * 0.6, areia + 6, s, misturar(COR.coral, COR.turquesaEscura, 0.35));
        coral(s * 1.5, areia + 10, s * 0.7, misturar(COR.laranja, COR.turquesaEscura, 0.4));
        coral(L - s * 0.7, areia + 8, s * 1.1, misturar(COR.lilas, COR.turquesaEscura, 0.4));
        coral(L - s * 1.7, areia + 12, s * 0.6, misturar(COR.amarelo, COR.turquesaEscura, 0.45));
        algas = Array.from({ length: Math.max(5, Math.round(L / 160)) }, () => ({ x: r() * L, alt: A * (0.1 + r() * 0.16), fase: r() * 6, larg: 4 + r() * 4 }));
        const rp = seme(43);
        peixes = Array.from({ length: Math.max(5, Math.round(L / 180)) }, (_, i) => ({
          y: A * (0.2 + rp() * 0.5), v: 18 + rp() * 22, fase: rp() * 1000, s: 5 + rp() * 5, cor: [COR.amarelo, COR.laranja, COR.claro][i % 3],
        }));
      }

      /** A luz do sol que dança: linhas claras que se cruzam e ondulam (no fundo e, fraca, na água) */
      function caustica(g, L, A, t, y0, y1, forca) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.lineWidth = 2;
        for (let k = 0; k < 2; k++) {
          for (let i = 0; i < 9; i++) {
            const yb = y0 + ((y1 - y0) * (i + 0.5)) / 9;
            g.strokeStyle = alfa(misturar(COR.claro, COR.perola, 0.5), forca * (0.6 + 0.4 * Math.sin(t * 0.8 + i)));
            g.beginPath();
            for (let x = -20; x <= L + 20; x += 18) {
              const y = yb + Math.sin(x / (38 + k * 21) + t * (0.9 + k * 0.4) + i * 1.3) * 7 + Math.sin(x / 17 - t * 1.3 + k) * 2.5;
              if (x < -10) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.stroke();
          }
        }
        g.restore();
      }

      function desenhar(g, L, A, t) {
        if (!fundo || L0 !== L || A0 !== A) medir(L, A);
        g.drawImage(fundo, 0, 0, L, A);
        raios(g, L, A, t, COR.claro, 0.11);
        caustica(g, L, A, t, A * 0.84, A, 0.16); // na areia
        caustica(g, L, A, t * 0.7, 0, A * 0.3, 0.035); // perto da superfície, bem fraca
        // as algas
        for (const a of algas) {
          const y0 = A * 0.92;
          const b = Math.sin(t * 0.9 + a.fase) * 12;
          g.strokeStyle = misturar(COR.turquesaEscura, COR.verde, 0.25);
          g.lineWidth = a.larg;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(a.x, y0);
          g.quadraticCurveTo(a.x + b, y0 - a.alt * 0.5, a.x + b * 1.5, y0 - a.alt);
          g.stroke();
        }
        // o cardume que passa
        for (const p of peixes) {
          const x = ((p.fase + t * p.v) % (L + 120)) - 60;
          const y = p.y + Math.sin(t * 1.2 + p.fase) * 8;
          g.fillStyle = alfa(p.cor, 0.75);
          g.beginPath();
          g.ellipse(x, y, p.s * 1.6, p.s * 0.7, 0, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.moveTo(x - p.s * 1.3, y);
          g.lineTo(x - p.s * 2.4, y - p.s * 0.8);
          g.lineTo(x - p.s * 2.4, y + p.s * 0.8);
          g.closePath();
          g.fill();
        }
        poeira(g, L, A, t, alfa(COR.branco, 0.5), 30, 16);
      }

      function reagir(tipo, info, est) {
        if (est.rm) return;
        if (tipo === 'par') { // bolhas subindo das conchas
          for (let i = 0; i < 3; i++) info.espirrar(info.x + (Math.random() - 0.5) * 30, info.y, COR.branco, 6, 0.5);
        } else if (tipo === 'areia') {
          info.espirrar(info.x, info.y + 20, misturar(COR.perola, COR.turquesaEscura, 0.4), 8, 0.4);
        }
      }

      return { medir, desenhar, reagir };
    }
  },
});

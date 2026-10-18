/*
 * Forca do Náufrago (forca) — descubra a palavra-chave letra por letra.
 * Cada erro tira uma peça da jangada (6 erros e ela se desmonta, sem nada violento).
 * Dica extra (revela uma letra) custa 1 pérola. Teclado físico e teclado na tela.
 * Palavras do bloco "palavras" da trilha ou derivadas das respostas curtas.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): o mar aberto ao amanhecer, com o sol nascendo, o brilho dele na
 * água, uma ilha com coqueiros ao longe e gaivotas. Letra errada respinga na jangada; palavra salva solta faíscas.
 * Regras, dica, pérolas e XP iguais; o fim fica no próprio jogo, com "Jogar de novo".
 */
Jogos.registrar({
  id: 'forca',
  nome: 'Forca do Náufrago',
  grupo: 'aventuras',
  icone: 'i-jangada',
  descricao: 'Descubra a palavra-chave antes que a jangada se desmonte.',
  duracao: '2-5 min',
  requer: { palavras: 1 },
  telaCheia: true,

  iniciar(ctx) {
    const { h } = UI;
    const MAX_ERROS = 6;
    const palco = Palco.montar(ctx, { id: 'forca', cena: cenaAmanhecer() });
    let desligar = null;
    let rodada = null; // { fila, detalhes, inicio, i, erros, dicas }

    // Jangada em SVG: cada peça some a cada erro (bandeira, vela, mastro, tábuas...)
    const JANGADA = `<svg viewBox="0 0 160 110" aria-hidden="true">
      <path class="peca" data-p="0" d="M84 14 L104 20 L84 26Z" style="fill:var(--coral)"/>
      <path class="peca" data-p="1" d="M82 30 L82 70 L52 70Z" style="fill:var(--texto)"/>
      <path class="peca" data-p="2" d="M84 12 L84 80" style="stroke:var(--amarelo);stroke-width:4;stroke-linecap:round"/>
      <rect class="peca" data-p="3" x="112" y="78" width="22" height="12" rx="3" style="fill:var(--amarelo)"/>
      <rect class="peca" data-p="4" x="26" y="78" width="22" height="12" rx="3" style="fill:var(--amarelo)"/>
      <rect class="peca" data-p="5" x="90" y="78" width="22" height="12" rx="3" style="fill:var(--amarelo)"/>
      <rect x="48" y="78" width="42" height="12" rx="3" style="fill:var(--amarelo)"/>
      <path d="M0 96 Q20 88 40 96 T80 96 T120 96 T160 96 V110 H0Z" style="fill:var(--turquesa);opacity:.55"/>
    </svg>`;

    function comecar() {
      rodada = { fila: UI.embaralhar(ctx.cartas.palavras).slice(0, ctx.opcoes.quantidade || 3), detalhes: [], inicio: Date.now(), i: 0, erros: 0, dicas: 0 };
      desenhar();
    }

    function desenhar() {
      const { fila, i } = rodada;
      const c = fila[i];
      const palavra = c.palavra; // já normalizada: só letras maiúsculas sem acento
      const inicioCarta = Date.now();
      const tentadas = new Set();
      let erros = 0;
      let fim = false;

      const jangada = h('div', { class: 'jangada' });
      jangada.innerHTML = JANGADA; // SVG fixo do código, não vem de JSON
      const letras = h('p', { class: 'forca-palavra', 'aria-live': 'polite' });
      const info = h('p', { class: 'forca-info' });
      const msg = h('div', { class: 'forca-msg', 'aria-live': 'polite' });
      const teclado = h('div', { class: 'teclado', role: 'group', 'aria-label': 'Teclado' });
      const btnDica = h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: dica }, UI.icone('i-perola'), `Revelar uma letra (${Economia.CONFIG.precoDica} pérola)`);

      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((l) => {
        teclado.append(h('button', { type: 'button', class: 'tecla', 'data-l': l, onclick: () => tentar(l), 'aria-label': `Letra ${l}` }, l));
      });

      palco.hud(
        palco.pilula(`Palavra ${i + 1} de ${fila.length}`, { icone: 'i-jangada', classe: 'palco__pilula--turquesa' }),
        palco.pilula(`Tema: ${c.temaVisivel || c.tema}`));
      palco.area.replaceChildren(h('article', { class: 'cartao forca-cartao' },
        h('div', { class: 'forca' }, jangada, h('div', { class: 'forca__lado' }, h('p', { class: 'forca-dica' }, h('strong', { text: 'Dica: ' }), c.dicaVisivel || c.temaVisivel || c.tema), letras, info, btnDica)),
        teclado, msg));

      function mostrar() {
        const txt = palavra.split('').map((l) => (tentadas.has(l) || fim ? l : '_')).join(' ');
        letras.textContent = txt;
        letras.setAttribute('aria-label', `Palavra: ${palavra.split('').map((l) => (tentadas.has(l) || fim ? l : 'lacuna')).join(', ')}`);
        info.textContent = `Erros: ${erros} de ${MAX_ERROS}`;
        jangada.querySelectorAll('.peca').forEach((p) => p.classList.toggle('peca--caiu', Number(p.dataset.p) < erros));
        btnDica.disabled = fim;
        palco.estado.erros = erros;
      }

      function tentar(l) {
        if (fim || tentadas.has(l)) return;
        tentadas.add(l);
        const tecla = teclado.querySelector(`[data-l="${l}"]`);
        tecla.disabled = true;
        if (palavra.includes(l)) {
          tecla.classList.add('tecla--certa');
          palco.reagir('acerto', { el: tecla });
        } else {
          tecla.classList.add('tecla--errada');
          erros++;
          rodada.erros++;
          palco.reagir('erro', { el: tecla });
          palco.reagir('respingo', { el: jangada });
        }
        mostrar();
        if (palavra.split('').every((x) => tentadas.has(x))) encerrar(true);
        else if (erros >= MAX_ERROS) encerrar(false);
      }

      function dica() {
        if (fim) return;
        const faltam = palavra.split('').filter((l) => !tentadas.has(l));
        if (!faltam.length) return;
        if (!ctx.gastarPerolas(Economia.CONFIG.precoDica)) {
          msg.textContent = 'Sem pérolas para a dica. Acerte questões para juntar mais!';
          return;
        }
        rodada.dicas++;
        tentar(UI.sortear(faltam));
      }

      function encerrar(acertou) {
        fim = true;
        mostrar();
        teclado.querySelectorAll('.tecla').forEach((t) => (t.disabled = true));
        rodada.detalhes.push(JogoComum.detalhe(c, acertou, {
          inicio: inicioCarta, pergunta: `Palavra-chave: ${c.dicaVisivel || c.temaVisivel || c.tema}`, resposta: c.original || palavra,
          sua: acertou ? '' : 'A jangada se desmontou antes.',
        }));
        if (acertou) palco.reagir('combo', { el: letras });
        else palco.tocar('derrota');
        const botao = h('button', { type: 'button', class: 'botao botao--primario botao--largo', text: i === fila.length - 1 ? 'Ver resultado' : 'Próxima palavra', onclick: seguir });
        msg.replaceChildren(h('p', { class: acertou ? 'texto-sucesso' : 'texto-erro', text: acertou ? 'Mandou bem, Diver! Jangada firme.' : `A jangada se desmontou. A palavra era ${c.original || palavra}.` }), botao);
        botao.focus({ preventScroll: true });
        botao.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
      }

      if (desligar) desligar();
      desligar = JogoComum.teclas((e) => {
        const l = UI.normalizar(e.key).toUpperCase();
        if (/^[A-Z]$/.test(l)) {
          e.preventDefault();
          tentar(l);
        }
      });
      mostrar();
      teclado.querySelector('.tecla').focus({ preventScroll: true });
    }

    function seguir() {
      rodada.i++;
      if (rodada.i < rodada.fila.length) return desenhar();
      if (desligar) desligar();
      desligar = null;
      const { fila, detalhes, inicio, erros, dicas } = rodada;
      const acertos = detalhes.filter((d) => d.acertou).length;
      palco.area.replaceChildren();
      palco.hud();
      palco.estado.erros = 0;
      palco.terminar(Jogos.resultado({
        jogoId: 'forca', trilha: ctx.trilha, detalhes, inicio, pontuacao: acertos,
        titulo: acertos === fila.length ? 'Nenhum náufrago hoje!' : `${acertos} de ${fila.length} palavras salvas`,
        subtitulo: 'Palavra-chave fixada é conceito lembrado na hora da prova.',
      }), {
        tom: acertos >= fila.length / 2 ? 'vitoria' : 'derrota',
        numeros: [['Palavras', `${acertos}/${fila.length}`, true], ['Erros', erros], ['Dicas', dicas], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
        aoJogarDeNovo: comecar,
      });
    }

    palco.abertura({
      rotulo: 'Em alto-mar',
      titulo: 'Forca do Náufrago',
      lead: 'Descubra a palavra-chave letra por letra, antes que a jangada se desmonte.',
      passos: [
        ['01', 'Chute as letras. ', 'Pelo teclado do computador ou pelo da tela; os acentos não contam.'],
        ['02', 'Cada erro tira uma peça. ', `Com ${MAX_ERROS} erros a jangada se desmonta e a palavra aparece.`],
        ['03', 'Aperto? Peça uma letra. ', `Revelar uma letra custa ${Economia.CONFIG.precoDica} pérola.`],
      ],
      numeros: [['Palavras', Math.min(ctx.opcoes.quantidade || 3, ctx.cartas.palavras.length), true]],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() {
        if (desligar) desligar();
        palco.parar();
      },
    };

    /* ---------- A cena: o mar aberto ao amanhecer ---------- */
    function cenaAmanhecer() {
      const { COR, misturar, alfa, degrade, mar, seme, tela, nuvemBaixa } = Palco.pintar;
      let ceu = null;
      let L0 = 0;
      let A0 = 0;
      let nuvens = [];
      let sol = null;
      const respingos = []; // a água batendo na jangada
      const CORES_NUVEM = { // nuvens da manhã: a barriga dourada
        topo: misturar(COR.lilas, COR.sup3, 0.45), meio: misturar(COR.lilas, COR.coral, 0.3), base: misturar(COR.amarelo, COR.coral, 0.45),
        luz: COR.perola, forro: alfa(misturar(COR.amarelo, COR.branco, 0.4), 0.55),
      };
      const horizonte = (A) => A * 0.55;

      function medir(L, A) {
        L0 = L;
        A0 = A;
        const hz = horizonte(A);
        ceu = tela(L, A);
        const f = ceu.getContext('2d');
        f.fillStyle = degrade(f, 0, hz, [[0, misturar(COR.marinho, COR.lilas, 0.25)], [0.5, misturar(COR.lilas, COR.coral, 0.35)], [0.85, misturar(COR.coral, COR.amarelo, 0.45)], [1, misturar(COR.amarelo, COR.perola, 0.3)]]);
        f.fillRect(0, 0, L, hz + 1);
        sol = { x: L * 0.66, y: hz, r: Math.max(26, Math.min(L, A) * 0.07) };
        const halo = f.createRadialGradient(sol.x, sol.y, sol.r, sol.x, sol.y, sol.r * 6);
        halo.addColorStop(0, alfa(COR.amarelo, 0.45));
        halo.addColorStop(1, alfa(COR.amarelo, 0));
        f.fillStyle = halo;
        f.fillRect(sol.x - sol.r * 6, sol.y - sol.r * 6, sol.r * 12, sol.r * 6);
        f.save();
        f.beginPath();
        f.rect(0, 0, L, hz);
        f.clip();
        f.fillStyle = degrade(f, sol.y - sol.r, sol.y, [[0, misturar(COR.amarelo, COR.perola, 0.5)], [1, COR.amarelo]]);
        f.beginPath();
        f.arc(sol.x, sol.y, sol.r, 0, Math.PI * 2);
        f.fill();
        f.restore();
        // a ilha com dois coqueiros, à esquerda
        const ix = L * 0.18;
        const iw = Math.max(90, L * 0.12);
        f.fillStyle = misturar(COR.marinho, COR.lilas, 0.25);
        f.beginPath();
        f.moveTo(ix - iw / 2, hz + 1);
        f.quadraticCurveTo(ix, hz - iw * 0.22, ix + iw / 2, hz + 1);
        f.closePath();
        f.fill();
        const coqueiro = (x, alt, inclina) => {
          f.strokeStyle = misturar(COR.marinho, COR.lilas, 0.25);
          f.lineWidth = Math.max(2, alt * 0.06);
          f.lineCap = 'round';
          f.beginPath();
          f.moveTo(x, hz - iw * 0.08);
          f.quadraticCurveTo(x + inclina * 0.5, hz - alt * 0.6, x + inclina, hz - alt);
          f.stroke();
          f.fillStyle = f.strokeStyle;
          for (let k = 0; k < 5; k++) {
            const a = -Math.PI + (k / 4) * Math.PI;
            f.beginPath();
            f.ellipse(x + inclina + Math.cos(a) * alt * 0.22, hz - alt + Math.sin(a) * alt * 0.08 + alt * 0.04, alt * 0.22, alt * 0.05, a * 0.5, 0, Math.PI * 2);
            f.fill();
          }
        };
        coqueiro(ix - iw * 0.12, iw * 0.38, -iw * 0.08);
        coqueiro(ix + iw * 0.1, iw * 0.3, iw * 0.07);
        // o mar lá longe, com o caminho de luz do sol
        f.fillStyle = degrade(f, hz, A, [[0, misturar(COR.coral, COR.turquesaEscura, 0.55)], [0.25, misturar(COR.turquesaEscura, COR.marinho, 0.3)], [1, COR.marinho]]);
        f.fillRect(0, hz, L, A - hz);
        const rn = seme(61);
        nuvens = Array.from({ length: Math.max(2, Math.round(L / 480)) }, (_, i) => {
          const w = Math.max(160, Math.min(L, A) * (0.3 + rn() * 0.2));
          return { img: nuvemBaixa(w, rn, CORES_NUVEM), x: rn() * L, y: hz * (0.15 + rn() * 0.3), v: 5 + rn() * 5 + i };
        });
      }

      function desenhar(g, L, A, t, dt, est) {
        if (!ceu || L0 !== L || A0 !== A) medir(L, A);
        g.drawImage(ceu, 0, 0, L, A);
        const hz = horizonte(A);
        for (const n of nuvens) {
          const w = n.img.width;
          g.drawImage(n.img, ((n.x + t * n.v) % (L + w)) - w, n.y);
        }
        // as gaivotas, batendo as asas devagar
        g.strokeStyle = alfa(COR.marinho, 0.75);
        g.lineWidth = 2;
        g.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const x = ((i * 0.27 * L + t * (16 + i * 4)) % (L + 80)) - 40;
          const y = hz * (0.3 + 0.12 * i) + Math.sin(t * 0.6 + i) * 8;
          const asa = 6 + i * 1.5;
          const bate = Math.sin(t * 5 + i * 2) * asa * 0.45;
          g.beginPath();
          g.moveTo(x - asa, y - bate);
          g.quadraticCurveTo(x - asa * 0.4, y - asa * 0.3, x, y);
          g.quadraticCurveTo(x + asa * 0.4, y - asa * 0.3, x + asa, y - bate);
          g.stroke();
        }
        // o brilho do sol na água: tracinhos que acendem e apagam
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 46; i++) {
          const k = (i % 23) / 23;
          const y = hz + 3 + Math.pow(k, 1.4) * (A - hz) * 0.7;
          const abre = 10 + k * 90;
          const x = sol.x + Math.sin(i * 12.9898) * abre;
          const a = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
          g.fillStyle = alfa(COR.amarelo, 0.35 * a * (1 - k * 0.6));
          g.fillRect(x - (8 + k * 20) / 2, y, 8 + k * 20, 1.5 + k * 1.5);
        }
        g.restore();
        // as ondas de perto
        const fase = est.rm ? 0 : t;
        mar(g, L, A, A * 0.86, fase, {
          corTopo: misturar(COR.turquesa, COR.coral, 0.25), corFundo: misturar(COR.turquesaEscura, COR.marinho, 0.5), espuma: COR.perola, espumaA: 0.35,
        });
        // os respingos na jangada
        for (let i = respingos.length - 1; i >= 0; i--) {
          const r = respingos[i];
          r.k += dt * 1.6;
          if (r.k >= 1) { respingos.splice(i, 1); continue; }
          g.strokeStyle = alfa(COR.perola, 0.6 * (1 - r.k));
          g.lineWidth = 2;
          g.beginPath();
          g.ellipse(r.x, r.y, 20 + r.k * 60, (20 + r.k * 60) * 0.3, 0, 0, Math.PI * 2);
          g.stroke();
        }
      }

      function reagir(tipo, info, est) {
        if (est.rm || tipo !== 'respingo') return;
        respingos.push({ x: info.x, y: info.y + 30, k: 0 });
        info.espirrar(info.x, info.y + 20, COR.perola, 14, 0.9);
        info.tocar('onda');
      }

      return { medir, desenhar, reagir };
    }
  },
});

/*
 * Adivinha Aí (adivinha-ai) — uma resposta secreta e até 10 dicas, que chegam em
 * "garrafas com mensagem". Quanto antes acertar, mais pontos (11 − dicas usadas).
 * A comparação ignora acento, maiúsculas e pontuação e aceita a lista "aceitas".
 * 3 chutes por carta; depois revela a resposta. Precisa do bloco "adivinhas" na trilha.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): uma praia à noite, com a lua cheia, o brilho dela no mar e as
 * ondas chegando na areia. Cada dica é uma garrafa que boia até a beira; o acerto acende fogos no céu. Regras, pontos
 * e XP iguais; o fim fica no próprio jogo, com "Jogar de novo".
 */
Jogos.registrar({
  id: 'adivinha-ai',
  nome: 'Adivinha Aí',
  grupo: 'rapidos',
  icone: 'i-garrafa',
  descricao: 'As dicas chegam uma a uma. Quanto antes acertar, mais pontos.',
  duracao: '3-5 min',
  requer: { adivinhas: 1 },
  telaCheia: true,

  iniciar(ctx) {
    const { h } = UI;
    const palco = Palco.montar(ctx, { id: 'adivinha', cena: cenaPraia() });
    let rodada = null; // { fila, detalhes, inicio, pontos, i, dicas }

    function comecar() {
      rodada = { fila: UI.embaralhar(ctx.cartas.adivinhas).slice(0, ctx.opcoes.quantidade || 5), detalhes: [], inicio: Date.now(), pontos: 0, i: 0, dicas: 0 };
      desenhar();
    }

    function desenhar() {
      const { fila, i } = rodada;
      const c = fila[i];
      const inicioCarta = Date.now();
      let dicas = 1;
      let chutes = 0;
      let fim = false;
      const aceitas = [c.resposta, ...c.aceitas].map(UI.normalizar);

      palco.hud(
        palco.pilula(`Carta ${i + 1} de ${fila.length}`, { icone: 'i-garrafa', classe: 'palco__pilula--turquesa' }),
        palco.pilula(`Pontos: ${rodada.pontos}`, { icone: 'i-estrela', classe: rodada.pontos ? 'palco__pilula--destaque' : '' }));
      const garrafas = h('ol', { class: 'garrafas', 'aria-live': 'polite' });
      const input = h('input', { type: 'text', class: 'campo', autocomplete: 'off', 'aria-label': 'Seu chute', placeholder: 'Seu chute…' });
      const msg = h('p', { class: 'adivinha-msg', 'aria-live': 'polite' });
      const btnDica = h('button', { type: 'button', class: 'botao botao--fantasma', onclick: proximaDica }, UI.icone('i-garrafa'), 'Próxima dica');
      const form = h('form', { class: 'adivinha-form', onsubmit: (e) => { e.preventDefault(); chutar(); } },
        input, h('button', { type: 'submit', class: 'botao botao--primario', text: 'Chutar' }));
      const rodape = h('div', { class: 'adivinha-rodape' }, btnDica, h('span', { class: 'adivinha-chutes' }));

      palco.area.replaceChildren(h('article', { class: 'cartao' },
        h('div', { class: 'questao__tags' }, h('span', { class: 'tag', text: c.tema }), h('span', { class: 'tag tag--medio', text: 'O que é, o que é?' })),
        garrafas, form, rodape, msg));

      function desenharDicas() {
        garrafas.replaceChildren(...c.dicas.slice(0, dicas).map((d, n) => h('li', { class: 'garrafa' },
          h('span', { class: 'garrafa__num', 'aria-hidden': 'true' }, UI.icone('i-garrafa')), h('span', {}, h('strong', { text: `Dica ${n + 1}: ` }), d))));
        btnDica.disabled = fim || dicas >= c.dicas.length;
        rodape.querySelector('.adivinha-chutes').textContent = `Vale ${Math.max(1, 11 - dicas)} pontos · ${3 - chutes} ${3 - chutes === 1 ? 'chute' : 'chutes'}`;
        palco.estado.garrafas = dicas; // as garrafas na beira da praia
      }

      function proximaDica() {
        if (fim || dicas >= c.dicas.length) return;
        dicas++;
        palco.tocar('bolhas');
        desenharDicas();
        input.focus();
      }

      function chutar() {
        if (fim || !input.value.trim()) return;
        chutes++;
        const certo = aceitas.includes(UI.normalizar(input.value));
        if (certo) return encerrar(true);
        palco.reagir('erro', { el: input });
        if (chutes >= 3) return encerrar(false);
        msg.textContent = `Não é "${input.value.trim()}". ${dicas < c.dicas.length ? 'Que tal mais uma dica?' : 'Tenta de novo!'}`;
        input.value = '';
        desenharDicas();
        input.focus();
      }

      function encerrar(acertou) {
        fim = true;
        const pontos = acertou ? Math.max(1, 11 - dicas) : 0;
        rodada.pontos += pontos;
        rodada.dicas += dicas;
        rodada.detalhes.push(JogoComum.detalhe(c, acertou, {
          inicio: inicioCarta, pergunta: c.dicas.slice(0, 3).join(' · '), resposta: c.resposta,
          sua: acertou ? '' : `Seu último chute: ${input.value.trim()}`,
        }));
        if (acertou) {
          palco.reagir('acerto', { el: input });
          palco.reagir('fogos');
        }
        input.disabled = true;
        form.querySelector('button').disabled = true;
        desenharDicas();
        const botao = h('button', { type: 'button', class: 'botao botao--primario botao--largo', text: i === fila.length - 1 ? 'Ver resultado' : 'Próxima carta', onclick: seguir });
        msg.replaceChildren(...[
          h('strong', { class: acertou ? 'texto-sucesso' : 'texto-erro', text: acertou ? `Mandou bem, Diver! +${pontos} pontos.` : 'Os chutes acabaram.' }),
          h('span', { text: ` A resposta é: ${c.resposta}.` }),
          c.explicacao ? h('span', { class: 'adivinha-explicacao', text: ` ${c.explicacao}` }) : null,
          botao].filter(Boolean));
        botao.focus({ preventScroll: true });
        botao.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
        palco.hud(
          palco.pilula(`Carta ${i + 1} de ${fila.length}`, { icone: 'i-garrafa', classe: 'palco__pilula--turquesa' }),
          palco.pilula(`Pontos: ${rodada.pontos}`, { icone: 'i-estrela', classe: rodada.pontos ? 'palco__pilula--destaque' : '' }));
      }

      desenharDicas();
      input.focus({ preventScroll: true });
    }

    function seguir() {
      rodada.i++;
      if (rodada.i < rodada.fila.length) return desenhar();
      const { fila, detalhes, inicio, pontos, dicas } = rodada;
      const acertos = detalhes.filter((d) => d.acertou).length;
      palco.area.replaceChildren();
      palco.hud();
      palco.estado.garrafas = 0;
      palco.terminar(Jogos.resultado({
        jogoId: 'adivinha-ai', trilha: ctx.trilha, detalhes, inicio, pontuacao: pontos,
        bonus: { xp: pontos, perolas: 0 },
        titulo: `${pontos} pontos no Adivinha Aí`,
        subtitulo: 'Cada dica a menos vale ponto a mais. Bora bater esse recorde?',
      }), {
        tom: acertos >= fila.length / 2 ? 'vitoria' : 'derrota',
        numeros: [['Pontos', pontos, true], ['Acertos', `${acertos}/${fila.length}`], ['Dicas abertas', dicas], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
        aoJogarDeNovo: comecar,
      });
    }

    palco.abertura({
      rotulo: 'Na beira da praia',
      titulo: 'Adivinha Aí',
      lead: 'Uma resposta secreta e até 10 dicas, que chegam em garrafas. Quanto antes acertar, mais pontos.',
      passos: [
        ['01', 'Leia a dica e chute. ', 'Acento, maiúscula e pontuação não contam.'],
        ['02', 'Quanto menos dicas, mais pontos. ', 'Acertar com 1 dica vale 10 pontos; cada dica a mais tira 1 (no mínimo, 1 ponto).'],
        ['03', 'São 3 chutes por carta. ', 'Depois, a resposta aparece. Cada ponto vira 1 XP de bônus.'],
      ],
      numeros: [['Cartas', Math.min(ctx.opcoes.quantidade || 5, ctx.cartas.adivinhas.length), true]],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir() { palco.parar(); },
    };

    /* ---------- A cena: a praia à noite, com as garrafas ---------- */
    function cenaPraia() {
      const { COR, misturar, alfa, degrade, seme, tela } = Palco.pintar;
      let ceu = null;
      let L0 = 0;
      let A0 = 0;
      let lua = null;
      const garrafas = []; // as garrafas boiando: { alvoX, x, fase }
      const fogos = []; // as faíscas dos fogos
      const horizonte = (A) => A * 0.5;
      const areia = (A) => A * 0.86;

      function medir(L, A) {
        L0 = L;
        A0 = A;
        const hz = horizonte(A);
        ceu = tela(L, A);
        const f = ceu.getContext('2d');
        f.fillStyle = degrade(f, 0, hz, [[0, COR.fundo], [0.7, misturar(COR.marinho, COR.lilas, 0.18)], [1, misturar(COR.marinho, COR.lilas, 0.32)]]);
        f.fillRect(0, 0, L, hz + 1);
        const r = seme(71);
        for (let i = 0; i < 120; i++) {
          f.fillStyle = alfa(COR.texto, 0.25 + r() * 0.6);
          const s = r() < 0.1 ? 2 : 1.2;
          f.fillRect(r() * L, r() * hz * 0.9, s, s);
        }
        lua = { x: L * 0.78, y: hz * 0.34, r: Math.max(20, Math.min(L, A) * 0.05) };
        const halo = f.createRadialGradient(lua.x, lua.y, lua.r, lua.x, lua.y, lua.r * 6);
        halo.addColorStop(0, alfa(COR.perola, 0.25));
        halo.addColorStop(1, alfa(COR.perola, 0));
        f.fillStyle = halo;
        f.fillRect(lua.x - lua.r * 6, lua.y - lua.r * 6, lua.r * 12, lua.r * 12);
        f.fillStyle = COR.perola;
        f.beginPath();
        f.arc(lua.x, lua.y, lua.r, 0, Math.PI * 2);
        f.fill();
        f.fillStyle = alfa(COR.lilas, 0.18); // as manchas da lua
        [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12]].forEach(([dx, dy, rr]) => {
          f.beginPath();
          f.arc(lua.x + dx * lua.r, lua.y + dy * lua.r, rr * lua.r, 0, Math.PI * 2);
          f.fill();
        });
        // o mar até a areia
        f.fillStyle = degrade(f, hz, areia(A), [[0, misturar(COR.marinho, COR.lilas, 0.25)], [1, misturar(COR.turquesaEscura, COR.marinho, 0.5)]]);
        f.fillRect(0, hz, L, areia(A) - hz);
        // a areia molhada e a seca
        f.fillStyle = degrade(f, areia(A), A, [[0, misturar(COR.perola, COR.marinho, 0.62)], [1, misturar(COR.perola, COR.marinho, 0.5)]]);
        f.fillRect(0, areia(A), L, A - areia(A));
      }

      /** Uma garrafa de vidro com a rolha e o bilhete dentro, inclinada */
      function garrafa(g, x, y, ang, s) {
        g.save();
        g.translate(x, y);
        g.rotate(ang);
        g.fillStyle = alfa(misturar(COR.claro, COR.turquesaEscura, 0.35), 0.75);
        g.beginPath();
        g.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2);
        g.fill();
        g.fillRect(s * 0.8, -s * 0.16, s * 0.7, s * 0.32);
        g.fillStyle = misturar(COR.amareloSombra, COR.marinho, 0.3); // a rolha
        g.fillRect(s * 1.45, -s * 0.15, s * 0.22, s * 0.3);
        g.fillStyle = alfa(COR.perola, 0.9); // o bilhete enrolado
        g.fillRect(-s * 0.5, -s * 0.14, s * 0.9, s * 0.28);
        g.fillStyle = alfa(COR.branco, 0.55); // o reflexo no vidro
        g.fillRect(-s * 0.6, -s * 0.32, s * 1.1, s * 0.07);
        g.restore();
      }

      function desenhar(g, L, A, t, dt, est) {
        if (!ceu || L0 !== L || A0 !== A) medir(L, A);
        g.drawImage(ceu, 0, 0, L, A);
        const hz = horizonte(A);
        const ya = areia(A);
        // o caminho de luz da lua no mar
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {
          const k = (i % 20) / 20;
          const y = hz + 3 + Math.pow(k, 1.3) * (ya - hz - 8);
          const abre = 8 + k * 70;
          const x = lua.x + Math.sin(i * 7.31) * abre;
          const a = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 2.1);
          g.fillStyle = alfa(COR.perola, 0.3 * a * (1 - k * 0.5));
          g.fillRect(x - (6 + k * 16) / 2, y, 6 + k * 16, 1.4 + k);
        }
        g.restore();
        // as garrafas: uma por dica aberta, boiando perto da beira (a nova chega da direita)
        const quantas = Math.min(10, est.garrafas || 0);
        while (garrafas.length < quantas) garrafas.push({ x: L + 40, fase: Math.random() * 6 });
        garrafas.length = Math.min(garrafas.length, quantas);
        const s = Math.max(10, Math.min(L, A) * 0.022);
        garrafas.forEach((b, n) => {
          const alvo = L * (0.08 + (0.84 * (n + 0.5)) / 10);
          b.x = est.rm ? alvo : b.x + (alvo - b.x) * Math.min(1, dt * 1.6);
          const y = ya - 14 + Math.sin(t * 1.5 + b.fase) * 3;
          garrafa(g, b.x, y, Math.sin(t * 1.2 + b.fase) * 0.18 - 0.1, s);
        });
        // as ondas chegando na areia: a espuma sobe e desce
        for (let k = 0; k < 3; k++) {
          const sobe = (est.rm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.7 + k * 2.1)) * (A - ya) * 0.5;
          const y = ya + 4 + k * 8 + sobe;
          g.fillStyle = alfa(misturar(COR.turquesaEscura, COR.marinho, 0.3), 0.45 - k * 0.12);
          g.beginPath();
          g.moveTo(0, ya);
          for (let x = 0; x <= L + 10; x += 10) g.lineTo(x, y + Math.sin(x / (50 + k * 20) + t * (0.8 + k * 0.2)) * 4);
          g.lineTo(L, ya);
          g.closePath();
          g.fill();
          g.strokeStyle = alfa(COR.perola, 0.4 - k * 0.1);
          g.lineWidth = 1.5;
          g.beginPath();
          for (let x = 0; x <= L + 10; x += 10) {
            const yy = y + Math.sin(x / (50 + k * 20) + t * (0.8 + k * 0.2)) * 4;
            if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
          }
          g.stroke();
        }
        // os fogos do acerto
        for (let i = fogos.length - 1; i >= 0; i--) {
          const p = fogos[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 60 * dt;
          p.v -= dt;
          if (p.v <= 0) { fogos.splice(i, 1); continue; }
          g.fillStyle = alfa(p.cor, Math.min(1, p.v * 1.5));
          g.beginPath();
          g.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          g.fill();
        }
      }

      function reagir(tipo, info, est) {
        if (est.rm || tipo !== 'fogos') return; // com "reduzir movimento", sem fogos
        const cores = [COR.amarelo, COR.coral, COR.claro, COR.lilas];
        for (let k = 0; k < 3; k++) {
          const cx = L0 * (0.25 + k * 0.25 + (Math.random() - 0.5) * 0.1);
          const cy = horizonte(A0) * (0.3 + Math.random() * 0.3);
          const cor = cores[(k + Math.floor(Math.random() * 4)) % 4];
          for (let i = 0; i < 36; i++) {
            const a = (i / 36) * Math.PI * 2;
            const v = 70 + Math.random() * 60;
            fogos.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, v: 1 + Math.random() * 0.5, cor });
          }
        }
        if (fogos.length > 500) fogos.splice(0, fogos.length - 500);
      }

      return { medir, desenhar, reagir };
    }
  },
});

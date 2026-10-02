/*
 * Tiro ao Alvo (Sala de Descompressão) — pistola d'água em primeira pessoa.
 * - Aparece uma REGRA ("Só os peixes", "Só números pares"...) e as placas vão surgindo. Acerte só as certas.
 * - Acertou uma placa errada: eliminação na hora. Deixou uma placa certa escapar: perde uma gota (são 3).
 * - Cada acerto vale 10 pontos, mais o bônus da sequência (+5 a cada 5 acertos seguidos). A regra muda a cada
 *   15 segundos e tudo fica mais rápido com o tempo. O tanque da pistola tem 10 jatos e recarrega sozinho.
 * - Pontos só no placar da sala: vale o seu recorde.
 * Desenho todo no <canvas> (nada de imagem de fora). Com "reduzir movimento", as placas não deslizam e
 * não há respingos.
 */
(() => {
  const { h, icone, plural } = UI;
  const COR = { turquesa: '#14B8A6', claro: '#5EEAD4', amarelo: '#FACC15', coral: '#FB7185', texto: '#E6F1FF', suave: '#A9BCD6', fundo: '#06172D', marinho: '#0B2545', sup: '#12325A', sup2: '#1A416F', escuro: '#0B2545' };
  const TANQUE = 10;
  const RECARGA = 0.35; // segundos por jato
  const VIDAS = 3;
  const TROCA_REGRA = 15;

  const PEIXES = ['TILÁPIA', 'SARDINHA', 'ATUM', 'ROBALO', 'TAINHA', 'PESCADA', 'DOURADO', 'LINGUADO', 'BAGRE', 'PIRARUCU', 'TUCUNARÉ', 'BADEJO', 'GAROUPA', 'PACU', 'LAMBARI', 'TUBARÃO', 'RAIA', 'MOREIA', 'CAVALO-MARINHO', 'PEIXE-PALHAÇO'];
  const NAO_PEIXES = ['GOLFINHO', 'BALEIA', 'POLVO', 'LULA', 'CARANGUEJO', 'TARTARUGA', 'FOCA', 'PINGUIM', 'CAMARÃO', 'ÁGUA-VIVA', 'ESTRELA-DO-MAR', 'LONTRA', 'SIRI', 'LAGOSTA', 'MEXILHÃO', 'PEIXE-BOI'];
  const FRUTAS = ['BANANA', 'MAÇÃ', 'UVA', 'CAJU', 'MANGA', 'ACEROLA', 'GOIABA', 'CAQUI', 'PERA', 'KIWI', 'MELANCIA', 'ABACAXI', 'JABUTICABA', 'PITANGA', 'AÇAÍ'];
  const NAO_FRUTAS = ['ALFACE', 'CENOURA', 'BATATA', 'CEBOLA', 'BRÓCOLIS', 'COUVE', 'ARROZ', 'FEIJÃO', 'MANDIOCA', 'BETERRABA', 'ESPINAFRE', 'RABANETE', 'PÃO', 'QUEIJO'];
  const sortear = (lista, r) => lista[Math.floor(r() * lista.length)];
  const inteiro = (a, b, r) => a + Math.floor(r() * (b - a + 1));

  const REGRAS = [
    { id: 'peixes', texto: 'Só os PEIXES', gerar: (certa, r) => ({ rotulo: sortear(certa ? PEIXES : NAO_PEIXES, r) }), porque: (p) => `${p.rotulo} não é peixe.` },
    { id: 'pares', texto: 'Só números PARES', gerar: (certa, r) => ({ rotulo: String(inteiro(1, 49, r) * 2 - (certa ? 0 : 1)) }), porque: (p) => `${p.rotulo} é ímpar.` },
    { id: 'vogais', texto: 'Só as VOGAIS', gerar: (certa, r) => ({ rotulo: sortear(certa ? ['A', 'E', 'I', 'O', 'U'] : 'BCDFGHJLMNPRSTVXZ'.split(''), r) }), porque: (p) => `${p.rotulo} é consoante.` },
    { id: 'maior50', texto: 'Só números MAIORES que 50', gerar: (certa, r) => ({ rotulo: String(certa ? inteiro(51, 99, r) : inteiro(1, 50, r)) }), porque: (p) => `${p.rotulo} não é maior que 50.` },
    { id: 'circulos', texto: 'Só os CÍRCULOS', gerar: (certa, r) => ({ forma: certa ? 'circulo' : sortear(['quadrado', 'triangulo', 'estrela'], r) }), porque: (p) => `Era um ${({ quadrado: 'quadrado', triangulo: 'triângulo', estrela: 'estrela' })[p.forma]}, não um círculo.` },
    { id: 'frutas', texto: 'Só as FRUTAS', gerar: (certa, r) => ({ rotulo: sortear(certa ? FRUTAS : NAO_FRUTAS, r) }), porque: (p) => `${p.rotulo} não é fruta.` },
    { id: 'mult3', texto: 'Só MÚLTIPLOS de 3', gerar: (certa, r) => {
      let n = inteiro(1, 33, r) * 3;
      if (!certa) n += r() < 0.5 ? 1 : 2;
      return { rotulo: String(n) };
    }, porque: (p) => `${p.rotulo} não é múltiplo de 3.` },
  ];

  Descompressao.registrar({
    id: 'tiro',
    nome: 'Tiro ao Alvo',
    curto: 'Tiro',
    icone: 'i-alvo',
    duracao: '1 a 3 min por partida',
    diario: false,
    descricao: 'Pistola d\'água na mão: acerte só as placas da regra. Placa errada é eliminação na hora. Agilidade e atenção!',
    abrir(ctx) {
      let jogo = null; // partida em andamento
      let quadro = 0;
      let limpar = [];

      const hud = h('div', { class: 'sd-tiro__hud', 'aria-live': 'off' });
      const regraEl = h('p', { class: 'sd-tiro__regra', id: 'sd-tiro-regra', 'aria-live': 'assertive' });
      const tela = h('canvas', { class: 'sd-tiro__canvas', id: 'sd-tiro-canvas', tabindex: '-1', 'aria-label': 'Área de tiro: mire e clique nas placas da regra' });
      const palco = h('div', { class: 'sd-tiro__palco' }, tela);
      const abertura = h('div', { class: 'sd-tiro__abertura' });
      ctx.container.replaceChildren(h('div', { class: 'sd-tiro' }, regraEl, hud, palco, abertura));
      const g = tela.getContext('2d');
      let L = 0;
      let A = 0;
      let mira = null; // { x, y } do ponteiro (mouse); no toque, só aparece no disparo

      function medir() {
        const largura = Math.max(280, palco.clientWidth || 320);
        const alturaUtil = window.innerHeight - (palco.getBoundingClientRect().top || 160) - 24;
        const altura = Math.round(Math.max(320, Math.min(largura * 0.72, alturaUtil, 620)));
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        tela.width = Math.round(largura * dpr);
        tela.height = Math.round(altura * dpr);
        tela.style.height = `${altura}px`;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        L = largura;
        A = altura;
        if (!jogo) desenharParado();
      }

      /* ---------- Abertura e fim ---------- */
      function mostrarAbertura(fim = null) {
        const recorde = ctx.recorde();
        abertura.hidden = false;
        abertura.replaceChildren(h('div', { class: 'cartao sd-tiro__cartao' },
          fim ? h('h2', { class: fim.motivo === 'errada' ? 'texto-erro' : '', text: fim.motivo === 'errada' ? 'Eliminado!' : 'Acabou a água!' }) : h('h2', { text: 'Pistola carregada' }),
          fim ? h('p', { text: fim.motivo === 'errada' ? `Placa errada: ${fim.porque}` : 'Três placas certas escaparam. Faz parte: a próxima é sua.' }) : null,
          fim ? h('p', { class: 'sd-tiro__total' }, h('strong', { text: `${fim.pontos} pontos` }), ` · ${plural(fim.acertos, 'acerto', 'acertos')}${fim.pontos >= recorde && fim.pontos > 0 ? ' · novo recorde!' : ''}`)
            : h('ul', { class: 'sd-tiro__regras' },
              h('li', {}, 'Leia a regra no alto e acerte só as placas que combinam com ela.'),
              h('li', {}, h('strong', { text: 'Placa errada = eliminação na hora.' })),
              h('li', {}, `Placa certa que escapa custa uma gota (são ${VIDAS}). A regra muda a cada ${TROCA_REGRA} segundos.`),
              h('li', {}, 'Cada acerto vale 10 pontos; sequências dão bônus.')),
          recorde ? h('p', { class: 'texto-suave', text: `Seu recorde: ${recorde} pontos` }) : null,
          h('div', { class: 'acoes-linha' },
            h('button', { type: 'button', class: 'botao botao--primario', id: 'sd-tiro-comecar', onclick: comecar }, icone('i-alvo'), fim ? 'Jogar de novo' : 'Começar'),
            fim ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: ctx.voltar }, 'Voltar para a sala') : null)));
        const b = abertura.querySelector('#sd-tiro-comecar');
        if (b) b.focus({ preventScroll: true });
      }

      function desenharParado() {
        desenharFundo();
        desenharPistola(L / 2, A * 0.35, 0);
      }

      /* ---------- Partida ---------- */
      function comecar() {
        abertura.hidden = true;
        const r = Math.random;
        jogo = {
          r, t: 0, pontos: 0, acertos: 0, seq: 0, vidas: VIDAS, agua: TANQUE, recarga: 0, placas: [], respingos: [], jatos: [],
          regra: null, regraDesde: 0, pausa: 0, proxima: 0.6, coice: 0, fim: false, ultimaRegra: null,
        };
        trocarRegra();
        hudDesenhar();
        cancelAnimationFrame(quadro);
        let antes = performance.now();
        const passo = (agora) => {
          if (!jogo || jogo.fim) return;
          const dt = Math.min(0.05, (agora - antes) / 1000);
          antes = agora;
          atualizar(dt);
          desenhar();
          quadro = requestAnimationFrame(passo);
        };
        quadro = requestAnimationFrame(passo);
        tela.focus({ preventScroll: true });
      }

      function trocarRegra() {
        const opcoes = REGRAS.filter((x) => x.id !== jogo.ultimaRegra);
        jogo.regra = sortear(opcoes, jogo.r);
        jogo.ultimaRegra = jogo.regra.id;
        jogo.regraDesde = jogo.t;
        jogo.pausa = 1.4; // respiro para ler a regra nova
        jogo.placas = [];
        regraEl.textContent = jogo.regra.texto;
        regraEl.classList.remove('sd-tiro__regra--nova');
        void regraEl.offsetWidth;
        regraEl.classList.add('sd-tiro__regra--nova');
      }

      const nivel = () => Math.min(1, jogo.t / 120); // 0 → 1 em dois minutos
      function criarPlaca() {
        const certa = jogo.r() < 0.5;
        const conteudo = jogo.regra.gerar(certa, jogo.r);
        const raio = Math.max(34, Math.min(54, L / 11)) * (1 - nivel() * 0.18);
        const margem = raio + 8;
        const x = margem + jogo.r() * (L - margem * 2);
        const y = margem + 30 + jogo.r() * Math.max(10, A * 0.64 - margem - 30);
        const vida = 2.8 - nivel() * 1.4;
        const desliza = !UI.movimentoReduzido && jogo.t > 25 ? (jogo.r() < 0.5 ? -1 : 1) * (20 + nivel() * 70) : 0;
        jogo.placas.push({ ...conteudo, certa, x, y, raio, nasceu: jogo.t, vida, vx: desliza, regra: jogo.regra });
      }

      function atualizar(dt) {
        jogo.t += dt;
        jogo.coice = Math.max(0, jogo.coice - dt * 6);
        // tanque
        if (jogo.agua < TANQUE) {
          jogo.recarga += dt;
          while (jogo.recarga >= RECARGA && jogo.agua < TANQUE) {
            jogo.recarga -= RECARGA;
            jogo.agua++;
          }
        } else jogo.recarga = 0;
        if (jogo.t - jogo.regraDesde >= TROCA_REGRA) trocarRegra();
        if (jogo.pausa > 0) jogo.pausa -= dt;
        else {
          jogo.proxima -= dt;
          if (jogo.proxima <= 0) {
            criarPlaca();
            jogo.proxima = 1.05 - nivel() * 0.55 + jogo.r() * 0.25;
          }
        }
        // placas: andam e somem
        jogo.placas = jogo.placas.filter((p) => {
          p.x += p.vx * dt;
          if (p.x < p.raio || p.x > L - p.raio) p.vx = -p.vx;
          if (jogo.t - p.nasceu < p.vida) return true;
          if (p.certa) {
            jogo.vidas--;
            jogo.seq = 0;
            hudDesenhar();
            if (jogo.vidas <= 0) terminar('escapou');
          }
          return false;
        });
        jogo.respingos = jogo.respingos.filter((s) => {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += 500 * dt;
          s.v -= dt;
          return s.v > 0;
        });
        jogo.jatos = jogo.jatos.filter((j) => (j.v -= dt) > 0);
        hudDesenhar(true);
      }

      function atirar(x, y) {
        if (!jogo || jogo.fim) return;
        if (jogo.agua <= 0) return; // tanque vazio: a barra de água mostra a recarga
        jogo.agua--;
        jogo.coice = 1;
        jogo.jatos.push({ x, y, v: 0.12 });
        // placa mais "na frente" (a mais nova) que contém o ponto
        const alvo = [...jogo.placas].reverse().find((p) => Math.hypot(p.x - x, p.y - y) <= p.raio + 6);
        if (!alvo) {
          jogo.seq = 0;
          respingar(x, y, COR.claro, 6);
          return;
        }
        if (!alvo.certa) {
          respingar(alvo.x, alvo.y, COR.coral, 18);
          terminar('errada', alvo);
          return;
        }
        jogo.placas = jogo.placas.filter((p) => p !== alvo);
        jogo.seq++;
        jogo.acertos++;
        const bonus = Math.floor(jogo.seq / 5) * 5;
        jogo.pontos += 10 + bonus;
        respingar(alvo.x, alvo.y, COR.turquesa, 14);
        hudDesenhar();
      }

      function respingar(x, y, cor, n) {
        if (UI.movimentoReduzido) return;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 80 + Math.random() * 180;
          jogo.respingos.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, v: 0.5 + Math.random() * 0.3, cor });
        }
      }

      function terminar(motivo, placa = null) {
        if (!jogo || jogo.fim) return;
        jogo.fim = true;
        cancelAnimationFrame(quadro);
        desenhar(placa);
        const fim = { motivo, pontos: jogo.pontos, acertos: jogo.acertos, porque: placa ? placa.regra.porque(placa) : '' };
        ctx.pontuar(jogo.pontos, { acertos: jogo.acertos, segundos: Math.round(jogo.t), motivo });
        regraEl.textContent = motivo === 'errada' ? 'Eliminado!' : 'Fim de partida';
        setTimeout(() => {
          jogo = null;
          mostrarAbertura(fim);
        }, UI.movimentoReduzido ? 200 : 900);
      }

      let hudAntes = '';
      function hudDesenhar(soSeMudou = false) {
        if (!jogo) return;
        const chave = `${jogo.pontos}|${jogo.seq}|${jogo.vidas}|${jogo.agua}|${Math.floor(jogo.t)}`;
        if (soSeMudou && chave === hudAntes) return;
        hudAntes = chave;
        hud.replaceChildren(
          h('span', { class: 'sd-tiro__pontos' }, icone('i-estrela'), `${jogo.pontos}`),
          h('span', { class: 'sd-tiro__vidas', 'aria-label': `${jogo.vidas} gotas` }, Array.from({ length: VIDAS }, (_, i) => h('span', { class: `sd-tiro__gota ${i < jogo.vidas ? '' : 'sd-tiro__gota--vazia'}`.trim() }))),
          h('span', { class: 'sd-tiro__seq', text: jogo.seq >= 5 ? `Sequência ${jogo.seq} · +${Math.floor(jogo.seq / 5) * 5}` : `Sequência ${jogo.seq}` }),
          h('span', { class: 'sd-tiro__agua' }, h('span', { class: 'sd-tiro__agua-barra', style: `width:${(jogo.agua / TANQUE) * 100}%` }), h('span', { class: 'visualmente-oculto', text: `${jogo.agua} jatos` })));
      }

      /* ---------- Desenho ---------- */
      function desenharFundo() {
        const grad = g.createLinearGradient(0, 0, 0, A);
        grad.addColorStop(0, COR.marinho);
        grad.addColorStop(1, COR.fundo);
        g.fillStyle = grad;
        g.fillRect(0, 0, L, A);
        // faixas de luz e o "balcão" da barraca de tiro
        g.globalAlpha = 0.06;
        g.fillStyle = COR.claro;
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.moveTo(L * (0.1 + i * 0.25), 0);
          g.lineTo(L * (0.2 + i * 0.25), 0);
          g.lineTo(L * (0.05 + i * 0.25), A);
          g.lineTo(L * (-0.05 + i * 0.25), A);
          g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = COR.sup;
        g.fillRect(0, A * 0.82, L, A * 0.18);
        g.fillStyle = COR.turquesa;
        g.fillRect(0, A * 0.82, L, 4);
      }

      function desenharPlaca(p, destaque = false) {
        const idade = jogo ? jogo.t - p.nasceu : 1;
        const entra = UI.movimentoReduzido ? 1 : Math.min(1, idade / 0.15);
        const resto = jogo ? Math.max(0, 1 - idade / p.vida) : 1;
        const r = p.raio * entra;
        g.save();
        g.translate(p.x, p.y);
        // haste
        g.fillStyle = COR.sup2;
        g.fillRect(-3, r * 0.6, 6, A);
        // placa
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.fillStyle = destaque ? COR.coral : COR.texto;
        g.fill();
        g.lineWidth = 5;
        g.strokeStyle = destaque ? COR.coral : COR.turquesa;
        g.stroke();
        g.beginPath();
        g.arc(0, 0, r * 0.78, 0, Math.PI * 2);
        g.lineWidth = 2;
        g.strokeStyle = 'rgba(11, 37, 69, 0.25)';
        g.stroke();
        // tempo restante (anel amarelo que vai fechando)
        g.beginPath();
        g.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * resto);
        g.lineWidth = 3;
        g.strokeStyle = COR.amarelo;
        g.stroke();
        g.fillStyle = COR.escuro;
        if (p.forma) desenharForma(p.forma, r * 0.5);
        else {
          const texto = p.rotulo;
          let tam = r * (texto.length <= 2 ? 0.8 : texto.length <= 5 ? 0.46 : 0.34);
          g.font = `800 ${tam}px "Plus Jakarta Sans", system-ui, sans-serif`;
          while (g.measureText(texto).width > r * 1.7 && tam > 9) {
            tam -= 1;
            g.font = `800 ${tam}px "Plus Jakarta Sans", system-ui, sans-serif`;
          }
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(texto, 0, 1);
        }
        g.restore();
      }

      function desenharForma(forma, s) {
        g.beginPath();
        if (forma === 'circulo') g.arc(0, 0, s, 0, Math.PI * 2);
        else if (forma === 'quadrado') g.rect(-s * 0.9, -s * 0.9, s * 1.8, s * 1.8);
        else if (forma === 'triangulo') {
          g.moveTo(0, -s);
          g.lineTo(s * 1.05, s * 0.8);
          g.lineTo(-s * 1.05, s * 0.8);
          g.closePath();
        } else {
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const rr = i % 2 ? s * 0.45 : s * 1.05;
            g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          g.closePath();
        }
        g.fill();
      }

      const escalaPistola = () => Math.max(1, Math.min(1.5, A / 420));
      function desenharPistola(mx, my, coice) {
        const bx = L / 2;
        const by = A + 10;
        const ang = Math.atan2(my - by, mx - bx);
        g.save();
        g.translate(bx, by);
        g.rotate(ang + Math.PI / 2);
        g.scale(escalaPistola(), escalaPistola());
        g.translate(0, coice * 12);
        // cabo
        g.fillStyle = COR.coral;
        g.strokeStyle = COR.fundo;
        g.lineWidth = 4;
        g.beginPath();
        g.roundRect ? g.roundRect(-22, -40, 44, 80, 12) : g.rect(-22, -40, 44, 80);
        g.fill();
        g.stroke();
        // cano
        g.fillStyle = COR.turquesa;
        g.beginPath();
        g.roundRect ? g.roundRect(-12, -110, 24, 80, 8) : g.rect(-12, -110, 24, 80);
        g.fill();
        g.stroke();
        // bico
        g.fillStyle = COR.amarelo;
        g.fillRect(-7, -122, 14, 14);
        g.strokeRect(-7, -122, 14, 14);
        // tanque d'água
        const nivelAgua = jogo ? jogo.agua / TANQUE : 1;
        g.fillStyle = 'rgba(230, 241, 255, 0.25)';
        g.beginPath();
        g.arc(0, -46, 20, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.save();
        g.beginPath();
        g.arc(0, -46, 18, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = COR.claro;
        g.fillRect(-20, -46 + 18 - 36 * nivelAgua, 40, 36 * nivelAgua);
        g.restore();
        g.restore();
      }

      function desenharMira(x, y) {
        g.save();
        g.strokeStyle = COR.amarelo;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(x, y, 14, 0, Math.PI * 2);
        g.moveTo(x - 22, y);
        g.lineTo(x - 8, y);
        g.moveTo(x + 8, y);
        g.lineTo(x + 22, y);
        g.moveTo(x, y - 22);
        g.lineTo(x, y - 8);
        g.moveTo(x, y + 8);
        g.lineTo(x, y + 22);
        g.stroke();
        g.restore();
      }

      function desenhar(errada = null) {
        desenharFundo();
        if (!jogo) return;
        jogo.placas.forEach((p) => desenharPlaca(p, p === errada));
        // jatos d'água (do bico até o ponto)
        jogo.jatos.forEach((j) => {
          g.save();
          g.strokeStyle = 'rgba(94, 234, 212, 0.8)';
          g.lineWidth = 5;
          g.lineCap = 'round';
          g.beginPath();
          const bico = 110 * escalaPistola();
          const ang = Math.atan2(j.y - (A + 10), j.x - L / 2);
          g.moveTo(L / 2 + Math.cos(ang) * bico, A + 10 + Math.sin(ang) * bico);
          g.lineTo(j.x, j.y);
          g.stroke();
          g.restore();
        });
        jogo.respingos.forEach((s) => {
          g.globalAlpha = Math.max(0, Math.min(1, s.v * 2));
          g.fillStyle = s.cor;
          g.beginPath();
          g.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
          g.fill();
        });
        g.globalAlpha = 1;
        if (jogo.pausa > 0) {
          g.fillStyle = 'rgba(6, 23, 45, 0.55)';
          g.fillRect(0, 0, L, A);
          g.fillStyle = COR.amarelo;
          g.font = `800 ${Math.max(20, Math.min(34, L / 18))}px "Plus Jakarta Sans", system-ui, sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(jogo.regra.texto, L / 2, A * 0.4);
        }
        const m = mira || { x: L / 2, y: A * 0.35 };
        desenharPistola(m.x, m.y, jogo.coice);
        if (mira) desenharMira(mira.x, mira.y);
      }

      /* ---------- Controles ---------- */
      const ponto = (e) => {
        const r = tela.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const aoMover = (e) => {
        if (e.pointerType === 'mouse') mira = ponto(e);
      };
      const aoSair = () => (mira = null);
      const aoAtirar = (e) => {
        e.preventDefault();
        const p = ponto(e);
        if (e.pointerType !== 'mouse') mira = p;
        atirar(p.x, p.y);
      };
      tela.addEventListener('pointermove', aoMover);
      tela.addEventListener('pointerleave', aoSair);
      tela.addEventListener('pointerdown', aoAtirar);
      const aoRedim = () => medir();
      window.addEventListener('resize', aoRedim);
      limpar = [() => window.removeEventListener('resize', aoRedim)];

      ctx.guia([
        { alvo: '#sd-tiro-canvas', desenho: 'alvo', titulo: 'Pistola d\'água', texto: 'Mire e clique (ou toque) nas placas. A pistola tem 10 jatos e recarrega sozinha.' },
        { alvo: '#sd-tiro-regra', desenho: 'estrela', titulo: 'Leia a regra', texto: `A regra aparece aqui e muda a cada ${TROCA_REGRA} segundos. Acertar uma placa que NÃO combina com a regra elimina na hora.` },
        { desenho: 'relogio', titulo: 'Não deixe escapar', texto: 'O anel amarelo mostra quanto tempo a placa fica. Placa certa que some custa uma gota; sem gotas, fim de jogo. Vale o seu recorde no placar da sala.' },
      ]);
      medir();
      regraEl.textContent = 'Tiro ao Alvo';
      mostrarAbertura();

      return {
        emAndamento: () => !!(jogo && !jogo.fim),
        parar() {
          cancelAnimationFrame(quadro);
          jogo = null;
          limpar.forEach((f) => f());
        },
      };
    },
  });
})();

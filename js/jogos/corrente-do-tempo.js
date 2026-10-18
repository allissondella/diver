/*
 * Corrente do Tempo (corrente-do-tempo) — ordene eventos ou passos que boiam na correnteza.
 * Arraste (toque ou mouse), use os botões ↑ ↓, ou o teclado: Enter/Espaço "pega" o item,
 * setas movem, Enter/Espaço solta. Até 3 conferências por sequência.
 * Pontuação = itens no lugar certo. Precisa do bloco "sequencias" na trilha.
 * Palco em tela toda (2026-10-18, js/jogos/palco.js): uma correnteza no meio do mar, com fios de água correndo,
 * grãos levados pela corrente, algas deitadas e uma tartaruga que passa de carona. O item arrastado segue o dedo e os
 * outros abrem espaço deslizando; na conferência, os certos soltam faíscas; sequência certa faz a correnteza disparar.
 * Regras, conferências, pontos e XP iguais; o fim fica no próprio jogo, com "Jogar de novo".
 */
Jogos.registrar({
  id: 'corrente-do-tempo',
  nome: 'Corrente do Tempo',
  grupo: 'aventuras',
  icone: 'i-corrente',
  descricao: 'Ordene cronologias, etapas e procedimentos arrastando na correnteza.',
  duracao: '2-5 min',
  requer: { sequencias: 1 },
  telaCheia: true,

  iniciar(ctx) {
    const { h } = UI;
    const CONFERENCIAS = 3;
    const palco = Palco.montar(ctx, { id: 'corrente-do-tempo', cena: cenaCorrenteza() });
    let rodada = null; // { fila, detalhes, inicio, pontos, i, conferencias, perfeitas }

    function comecar() {
      rodada = { fila: UI.embaralhar(ctx.cartas.sequencias).slice(0, ctx.opcoes.quantidade || 3), detalhes: [], inicio: Date.now(), pontos: 0, i: 0, conferencias: 0, perfeitas: 0 };
      desenhar();
    }

    function desenhar() {
      const { fila, i } = rodada;
      const s = fila[i];
      const inicioSeq = Date.now();
      let ordem = s.itens.map((_, k) => k);
      do ordem = UI.embaralhar(ordem); while (ordem.every((v, k) => v === k)); // nunca começa já certo
      let conferencias = 0;
      let pegoIdx = null;
      let fim = false;

      const lista = h('ol', { class: 'corrente', 'aria-label': `Itens de "${s.titulo}". Enter pega um item, setas movem.` });
      const aviso = h('p', { class: 'corrente-aviso', 'aria-live': 'assertive' });
      const btnConferir = h('button', { type: 'button', class: 'botao botao--primario botao--largo', onclick: conferir }, 'Conferir ordem');
      const msg = h('div', { 'aria-live': 'polite' });

      palco.topo();
      palco.area.replaceChildren(h('article', { class: 'cartao corrente-cartao' },
        h('span', { class: 'rotulo', text: s.tema }),
        h('h2', { class: 'corrente-titulo', tabindex: '-1', text: s.titulo }),
        h('p', { class: 'corrente-dica', text: 'Do primeiro (topo) ao último (base).' }),
        lista, aviso, btnConferir, msg));

      function placar() {
        palco.hud(
          palco.pilula(`Sequência ${i + 1}/${fila.length}`, { icone: 'i-corrente', classe: 'palco__pilula--turquesa', rotulo: `Sequência ${i + 1} de ${fila.length}` }),
          palco.pilula(`Conferências ${conferencias}/${CONFERENCIAS}`, { rotulo: `Conferências: ${conferencias} de ${CONFERENCIAS}` }),
          palco.pilula(String(rodada.pontos), { icone: 'i-estrela', classe: 'palco__pilula--destaque', rotulo: UI.plural(rodada.pontos, 'item no lugar certo', 'itens no lugar certo') }));
      }

      /** Onde o item fica na tela pelo lugar dele na lista (sem contar o deslize que está acontecendo) */
      const yDe = (el) => {
        const op = el.offsetParent || document.body;
        return op.getBoundingClientRect().top + op.clientTop + el.offsetTop - op.scrollTop;
      };
      /** Os outros itens deslizam do lugar de antes para o novo (sem animação com "reduzir movimento") */
      function deslizar(itens, antes) {
        if (UI.movimentoReduzido) return;
        itens.forEach((el) => {
          const dy = antes.get(el) - yDe(el);
          if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
        });
      }

      // Cada item é montado uma vez por sequência e só muda de lugar (assim ele desliza, em vez de sumir e voltar)
      const itensEl = s.itens.map((texto, orig) => {
        const num = h('span', { class: 'corrente__num', 'aria-hidden': 'true' });
        const sobe = h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Subir "${texto}"`, onclick: () => mover(ordem.indexOf(orig), ordem.indexOf(orig) - 1, true) }, UI.icone('i-seta-cima'));
        const desce = h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Descer "${texto}"`, onclick: () => mover(ordem.indexOf(orig), ordem.indexOf(orig) + 1, true) }, UI.icone('i-seta-baixo'));
        const li = h('li', { class: 'corrente__item', tabindex: '0', 'data-orig': orig },
          h('span', { class: 'corrente__alca', 'aria-hidden': 'true' }, '⋮⋮'),
          num,
          h('span', { class: 'corrente__texto', text: texto }),
          h('span', { class: 'corrente__botoes' }, sobe, desce));
        li.addEventListener('keydown', (e) => teclado(e, ordem.indexOf(orig)));
        li.addEventListener('pointerdown', (e) => arrastar(e, ordem.indexOf(orig)));
        return { li, num, sobe, desce, texto };
      });

      function render(foco) {
        const antes = new Map(itensEl.filter((x) => x.li.isConnected).map((x) => [x.li, yDe(x.li)]));
        ordem.forEach((orig, pos) => {
          const it = itensEl[orig];
          lista.append(it.li); // (mover o nó: o item segue o mesmo)
          it.num.textContent = String(pos + 1);
          it.li.classList.toggle('corrente__item--pego', pegoIdx === pos);
          if (!fim && pos !== orig) it.li.classList.remove('corrente__item--certo'); // saiu do lugar: perde o turquesa
          it.li.setAttribute('aria-label', `${pos + 1}º: ${it.texto}${pegoIdx === pos ? '. Pego: use as setas e Enter para soltar' : ''}`);
          it.sobe.disabled = fim || pos === 0;
          it.desce.disabled = fim || pos === ordem.length - 1;
        });
        if (antes.size) deslizar([...antes.keys()], antes);
        if (foco !== undefined && lista.children[foco]) lista.children[foco].focus({ preventScroll: true });
      }

      function mover(de, para, focarBotao) {
        if (fim || para < 0 || para >= ordem.length || de === para) return;
        const [item] = ordem.splice(de, 1);
        ordem.splice(para, 0, item);
        if (pegoIdx !== null) pegoIdx = para;
        render(para);
        palco.tocar('tique');
        aviso.textContent = `${s.itens[item]} agora está em ${para + 1}º.`;
        if (focarBotao) lista.children[para].focus({ preventScroll: true });
      }

      function teclado(e, pos) {
        if (fim) return;
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.tagName === 'BUTTON') return;
          e.preventDefault();
          pegoIdx = pegoIdx === pos ? null : pos;
          aviso.textContent = pegoIdx === null ? 'Item solto.' : `Pegou "${s.itens[ordem[pos]]}". Use as setas.`;
          palco.tocar('clique');
          render(pos);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const alvo = pos + (e.key === 'ArrowUp' ? -1 : 1);
          if (pegoIdx === pos) mover(pos, alvo);
          else if (lista.children[alvo]) lista.children[alvo].focus();
        }
      }

      // Arrastar com o dedo ou o mouse (eventos de ponteiro, sem biblioteca): o item segue o dedo e os outros abrem
      // espaço. Começa pela alça (⋮⋮) para não atrapalhar a rolagem no celular.
      function arrastar(e, pos) {
        if (fim || !e.target.closest('.corrente__alca') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        const li = e.currentTarget;
        const agarre = e.clientY - yDe(li); // onde o dedo pegou o item
        li.classList.add('corrente__item--arrastando');
        palco.tocar('clique');
        let atualPos = pos;
        const mexer = (ev) => {
          const outros = [...lista.children].filter((el) => el !== li);
          const novo = outros.filter((el) => yDe(el) + el.offsetHeight / 2 < ev.clientY).length;
          if (novo !== atualPos) {
            const antes = new Map(outros.map((el) => [el, yDe(el)]));
            const [item] = ordem.splice(atualPos, 1);
            ordem.splice(novo, 0, item);
            lista.insertBefore(li, outros[novo] || null);
            atualPos = novo;
            deslizar(outros, antes);
            palco.tocar('tique');
          }
          if (!UI.movimentoReduzido) li.style.transform = `translateY(${ev.clientY - agarre - yDe(li)}px)`;
        };
        const soltar = () => {
          window.removeEventListener('pointermove', mexer);
          window.removeEventListener('pointerup', soltar);
          window.removeEventListener('pointercancel', soltar);
          const resto = li.style.transform;
          li.style.transform = '';
          li.classList.remove('corrente__item--arrastando');
          if (resto && !UI.movimentoReduzido) li.animate([{ transform: resto }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
          render(atualPos);
        };
        window.addEventListener('pointermove', mexer);
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
      }

      function conferir() {
        if (fim) return;
        conferencias++;
        rodada.conferencias++;
        const certos = ordem.filter((orig, pos) => orig === pos).length;
        [...lista.children].forEach((li, pos) => {
          const certo = ordem[pos] === pos;
          if (certo && !li.classList.contains('corrente__item--certo')) { // o que acabou de encaixar solta faíscas
            const p = palco.pontoDe(li);
            palco.espirrar(p.x, p.y, Palco.COR.claro, 6, 0.6);
          }
          li.classList.toggle('corrente__item--certo', certo);
        });
        placar();
        if (certos === ordem.length) {
          palco.reagir('acerto', { el: lista });
          palco.reagir('correnteza');
          return encerrar(certos);
        }
        if (conferencias >= CONFERENCIAS) {
          palco.reagir('erro', { el: lista });
          return encerrar(certos);
        }
        palco.tocar('virar');
        aviso.textContent = `${certos} de ${ordem.length} no lugar certo (em turquesa). Ajuste e confira de novo.`;
      }

      function encerrar(certos) {
        fim = true;
        rodada.pontos += certos;
        const tudo = certos === ordem.length;
        if (tudo) rodada.perfeitas++;
        ordem = s.itens.map((_, k) => k); // mostra a ordem correta (os itens deslizam para o lugar)
        render();
        [...lista.children].forEach((li) => li.classList.add('corrente__item--certo'));
        btnConferir.hidden = true;
        placar();
        rodada.detalhes.push(JogoComum.detalhe(s, tudo, {
          inicio: inicioSeq, pergunta: `Ordene: ${s.titulo}`, resposta: s.itens.join(' → '),
          sua: tudo ? '' : `${certos} de ${s.itens.length} itens no lugar certo.`,
        }));
        const botao = h('button', { type: 'button', class: 'botao botao--primario botao--largo', text: i === fila.length - 1 ? 'Ver resultado' : 'Próxima sequência', onclick: seguir });
        msg.replaceChildren(...[
          h('p', { class: tudo ? 'texto-sucesso' : 'texto-erro', text: tudo ? 'Mandou bem, Diver! Correnteza em ordem.' : 'Esta é a ordem certa. Dá uma olhada com calma.' }),
          s.explicacao ? h('p', { class: 'jogo-feedback__texto', text: s.explicacao }) : null, botao].filter(Boolean));
        botao.focus({ preventScroll: true });
        botao.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
      }

      render();
      setTimeout(() => lista.classList.add('corrente--viva'), 450); // os itens boiam ao chegar; depois, só deslizam
      placar();
      palco.area.querySelector('.corrente-titulo').focus({ preventScroll: true });
    }

    function seguir() {
      rodada.i++;
      if (rodada.i < rodada.fila.length) return desenhar();
      const { fila, detalhes, inicio, pontos, conferencias, perfeitas } = rodada;
      const total = fila.reduce((n, s) => n + s.itens.length, 0);
      palco.area.replaceChildren();
      palco.hud();
      palco.terminar(Jogos.resultado({
        jogoId: 'corrente-do-tempo', trilha: ctx.trilha, detalhes, inicio, pontuacao: pontos,
        bonus: { xp: pontos * 2, perolas: 0 },
        titulo: `${pontos} de ${total} itens no lugar certo`,
        subtitulo: 'Ordem é memória: quem entende a sequência lembra do todo.',
      }), {
        tom: pontos >= total / 2 ? 'vitoria' : 'derrota',
        numeros: [['Itens no lugar', `${pontos}/${total}`, true], ['Sequências certas', `${perfeitas}/${fila.length}`], ['Conferências', conferencias], ['Tempo', UI.formatarTempo(Math.round((Date.now() - inicio) / 1000))]],
        aoJogarDeNovo: comecar,
      });
    }

    palco.abertura({
      rotulo: 'Na correnteza',
      titulo: 'Corrente do Tempo',
      lead: 'A correnteza bagunçou tudo: ponha em ordem cronologias, etapas e procedimentos.',
      passos: [
        ['01', 'Arraste pela alça. ', 'Ou use as setinhas de cada item; no teclado, Enter pega e solta e as setas movem.'],
        ['02', 'Confira a ordem. ', `Os itens no lugar certo ficam em turquesa. São até ${CONFERENCIAS} conferências por sequência.`],
        ['03', 'Cada item no lugar conta. ', 'No fim, cada um vale +2 XP de bônus.'],
      ],
      numeros: [['Sequências', Math.min(ctx.opcoes.quantidade || 3, ctx.cartas.sequencias.length), true], ['Conferências por sequência', CONFERENCIAS]],
      aoComecar: comecar,
    });

    return {
      emAndamento: () => palco.jogando(),
      destruir: () => palco.parar(),
    };

    /* ---------- A cena: a correnteza no meio do mar ---------- */
    function cenaCorrenteza() {
      const { COR, misturar, alfa, degrade, raios, seme, tela } = Palco.pintar;
      let agua = null;
      let chave = '';
      let fios = []; // os fios de água correndo
      let graos = []; // o que a corrente leva
      let algas = [];
      let tartaruga = null;
      let fluxo = 0; // o quanto a água já andou (cresce mais rápido no disparo)
      let disparo = 0; // a correnteza disparando depois de uma sequência certa

      function pintar(L, A) {
        const r = seme(41);
        agua = tela(L, A);
        const f = agua.getContext('2d');
        f.fillStyle = degrade(f, 0, A, [[0, misturar(COR.marinho, COR.azul, 0.2)], [0.45, misturar(COR.marinho, COR.turquesaEscura, 0.24)], [1, COR.fundo]]);
        f.fillRect(0, 0, L, A);
        // o canal da corrente: uma faixa um pouco mais clara atravessando a tela
        const banda = f.createLinearGradient(0, A * 0.2, 0, A * 0.8);
        banda.addColorStop(0, alfa(COR.claro, 0));
        banda.addColorStop(0.5, alfa(COR.claro, 0.07));
        banda.addColorStop(1, alfa(COR.claro, 0));
        f.fillStyle = banda;
        f.fillRect(0, A * 0.2, L, A * 0.6);
        // o fundo: morros escuros
        f.fillStyle = misturar(COR.marinho, COR.fundo, 0.55);
        f.beginPath();
        f.moveTo(0, A);
        f.lineTo(0, A * 0.9);
        let x = 0;
        while (x < L) {
          const w = 80 + r() * 160;
          f.quadraticCurveTo(x + w / 2, A * (0.86 - r() * 0.05), x + w, A * (0.9 + (r() - 0.5) * 0.02));
          x += w;
        }
        f.lineTo(L, A);
        f.closePath();
        f.fill();
        fios = Array.from({ length: Math.round(30 + L / 40) }, () => {
          const y = A * (0.06 + r() * 0.8);
          const meio = 1 - Math.min(1, Math.abs(y / A - 0.5) * 2.2); // no canal do meio, a água corre mais e brilha mais
          return { y, len: 70 + r() * 230, v: 40 + r() * 100 + meio * 70, fase: r() * 4000, amp: 2 + r() * 9, onda: 50 + r() * 110, larg: 1 + r() * 1.6, a: 0.09 + r() * 0.14 + meio * 0.1, cor: r() < 0.75 ? COR.claro : COR.perola };
        });
        graos = Array.from({ length: 70 }, () => ({ x: r() * L, y: r() * A * 0.9, v: 25 + r() * 70, r: 0.6 + r() * 1.5, fase: r() * 6, a: 0.2 + r() * 0.4 }));
        algas = Array.from({ length: Math.max(8, Math.round(L / 80)) }, () => ({ x: r() * L, alt: A * (0.07 + r() * 0.14), fase: r() * 6, larg: 3 + r() * 4 }));
        tartaruga = { x0: r(), y: A * (0.22 + r() * 0.2), v: 26, s: Math.max(22, Math.min(L, A) * 0.045) };
      }

      function desenharTartaruga(g, x, y, s, t) {
        const bate = Math.sin(t * 2.2) * 0.45;
        const corpo = alfa(misturar(COR.turquesaEscura, COR.verde, 0.35), 0.8);
        const casco = alfa(misturar(COR.turquesaSombra, COR.amarelo, 0.18), 0.85);
        g.fillStyle = corpo;
        const nadadeira = (dx, dy, comp, ang) => {
          g.save();
          g.translate(x + dx * s, y + dy * s);
          g.rotate(ang);
          g.beginPath();
          g.ellipse(comp * s * 0.5, 0, comp * s * 0.5, s * 0.16, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
        };
        nadadeira(0.35, -0.35, 1.1, -0.9 + bate); // as da frente, grandes
        nadadeira(0.35, 0.35, 1.1, 0.9 - bate);
        nadadeira(-0.6, -0.3, 0.55, -2.3 - bate * 0.5); // as de trás
        nadadeira(-0.6, 0.3, 0.55, 2.3 + bate * 0.5);
        g.beginPath(); // a cabeça
        g.ellipse(x + s * 1.02, y, s * 0.3, s * 0.22, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = casco;
        g.beginPath();
        g.ellipse(x, y, s * 0.85, s * 0.6, 0, 0, Math.PI * 2);
        g.fill();
        // o desenho do casco: as placas do meio e as da borda
        g.fillStyle = alfa(misturar(COR.turquesaSombra, COR.amarelo, 0.32), 0.9);
        g.beginPath();
        g.ellipse(x - s * 0.02, y, s * 0.52, s * 0.34, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = alfa(COR.fundo, 0.3);
        g.lineWidth = 1;
        g.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.moveTo(x - s * 0.02 + Math.cos(a) * s * 0.52, y + Math.sin(a) * s * 0.34);
          g.lineTo(x + Math.cos(a) * s * 0.84, y + Math.sin(a) * s * 0.59);
        }
        g.moveTo(x - s * 0.3, y - s * 0.3);
        g.lineTo(x - s * 0.3, y + s * 0.3);
        g.moveTo(x + s * 0.18, y - s * 0.32);
        g.lineTo(x + s * 0.18, y + s * 0.32);
        g.stroke();
      }

      function desenhar(g, L, A, t, dt, est) {
        const nova = `${L}x${A}`;
        if (!agua || nova !== chave) { chave = nova; pintar(L, A); }
        disparo = Math.max(0, disparo - dt * 0.55);
        if (!est.rm) fluxo += dt * (1 + disparo * 3.5);
        g.drawImage(agua, 0, 0, L, A);
        raios(g, L, A * 0.7, t, COR.claro, 0.06);
        // os fios de água correndo (no disparo, mais fortes)
        g.lineCap = 'round';
        for (const f of fios) {
          const x = ((f.fase + fluxo * f.v) % (L + f.len)) - f.len;
          const d = g.createLinearGradient(x, 0, x + f.len, 0);
          const a = Math.min(0.6, f.a * (1 + disparo * 1.6));
          d.addColorStop(0, alfa(f.cor, 0));
          d.addColorStop(0.55, alfa(f.cor, a));
          d.addColorStop(1, alfa(f.cor, 0));
          g.strokeStyle = d;
          g.lineWidth = f.larg;
          g.beginPath();
          for (let k = 0; k <= 10; k++) {
            const xx = x + (f.len * k) / 10;
            const yy = f.y + Math.sin((xx + fluxo * 30) / f.onda) * f.amp;
            if (k) g.lineTo(xx, yy); else g.moveTo(xx, yy);
          }
          g.stroke();
        }
        // a tartaruga pegando carona na corrente
        if (tartaruga) {
          const volta = L + tartaruga.s * 8;
          const x = ((tartaruga.x0 * volta + fluxo * tartaruga.v) % volta) - tartaruga.s * 4;
          desenharTartaruga(g, x, tartaruga.y + Math.sin(t * 0.5) * 10, tartaruga.s, t);
        }
        // os grãos levados pela corrente
        for (const p of graos) {
          const x = (p.x + fluxo * p.v) % L;
          const y = p.y + Math.sin(t * 0.8 + p.fase) * 6;
          g.fillStyle = alfa(COR.perola, p.a);
          g.beginPath();
          g.arc(x, y, p.r, 0, Math.PI * 2);
          g.fill();
        }
        // as algas, deitadas para o lado da corrente
        for (const a of algas) {
          const y0 = A * 0.95;
          const deita = 14 + Math.sin(t * 1.3 + a.fase) * 6 + disparo * 26;
          g.strokeStyle = misturar(misturar(COR.turquesaEscura, COR.fundo, 0.4), COR.verde, 0.15);
          g.lineWidth = a.larg;
          g.beginPath();
          g.moveTo(a.x, y0);
          g.quadraticCurveTo(a.x + deita * 0.4, y0 - a.alt * 0.6, a.x + deita, y0 - a.alt * 0.92);
          g.stroke();
        }
      }

      function reagir(tipo, info, est) {
        if (tipo !== 'correnteza') return;
        info.tocar('onda');
        if (!est.rm) disparo = 1;
      }

      return { desenhar, reagir };
    }
  },
});

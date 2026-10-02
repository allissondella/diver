/*
 * tutorial.js — o "primeiro mergulho" em cada página.
 *
 * Na primeira vez que a pessoa entra numa área (Início, Mergulho, Simulado...), o Diver
 * destaca as partes da tela e explica cada uma num balão ("2 de 4 · Pular · Próximo"),
 * com um desenho que ajuda a associar a ideia (tubo de oxigênio, pérola, mapa...).
 *  - Visto uma vez, não aparece de novo: fica em "diver:v1:tutorial" (sincroniza com a nuvem).
 *  - "Como funciona esta página?" (barra lateral) mostra de novo; o Perfil zera todos.
 *  - Teclado: Enter/→ avança, ← volta, Esc pula. O foco fica preso no balão enquanto ele está aberto.
 *  - Passo cujo alvo não está na tela (ex.: barra lateral fechada no celular) é pulado.
 * As ilustrações são SVGs fixos deste arquivo (nada vem de fora).
 */
const Tutorial = (() => {
  const { h } = UI;
  const CHAVE = 'diver:v1:tutorial';

  /* ---------- Desenhos (estilo figurinha: contorno turquesa, cores da paleta) ---------- */
  const C = 'stroke="#5EEAD4" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';
  const ILUSTRACOES = {
    oxigenio: `<rect x="26" y="20" width="28" height="50" rx="14" fill="#14B8A6" ${C}/><rect x="33" y="8" width="14" height="10" rx="3" fill="#FACC15" ${C}/><circle cx="40" cy="44" r="8" fill="#0C354C" ${C}/><path d="M40 44 L44 40" stroke="#FACC15" stroke-width="3" stroke-linecap="round"/><path d="M33 28 L33 36" stroke="#E6F1FF" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
    perola: `<path d="M40 70 L10 38 Q14 12 40 10 Q66 12 70 38 Z" fill="#1A416F" ${C}/><path d="M40 70 L24 20 M40 70 L40 12 M40 70 L56 20 M40 70 L16 32 M40 70 L64 32" stroke="#5EEAD4" stroke-width="3" stroke-linecap="round" opacity=".7"/><path d="M30 70 H50" ${C}/><circle cx="56" cy="58" r="11" fill="#F5F0E6" ${C}/><circle cx="52" cy="54" r="3" fill="#fff"/>`,
    mapa: `<path d="M10 16 H34 V32 H50 V48 H66 V66" fill="none" stroke="#5EEAD4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="16" r="6" fill="#FACC15" ${C}/><circle cx="34" cy="32" r="6" fill="#14B8A6" ${C}/><circle cx="50" cy="48" r="6" fill="#0EA597" ${C}/><circle cx="66" cy="66" r="7" fill="#0C354C" ${C}/><path d="M62 18 L62 6 L72 10 L62 14" fill="#FB7185" ${C}/>`,
    livro: `<path d="M40 22 Q26 14 10 18 V62 Q26 58 40 66 Z" fill="#1A416F" ${C}/><path d="M40 22 Q54 14 70 18 V62 Q54 58 40 66 Z" fill="#12325A" ${C}/><path d="M18 30 H32 M18 40 H32 M48 30 H62 M48 40 H62" stroke="#A9BCD6" stroke-width="3" stroke-linecap="round"/>`,
    ancora: `<circle cx="40" cy="14" r="6" fill="none" ${C}/><path d="M40 20 V68 M26 32 H54 M14 48 Q16 66 40 68 Q64 66 66 48" fill="none" ${C}/><path d="M10 52 L14 46 L20 52 M60 52 L66 46 L70 52" fill="none" ${C}/>`,
    alvo: `<circle cx="40" cy="42" r="28" fill="#12325A" ${C}/><circle cx="40" cy="42" r="17" fill="#0C354C" ${C}/><circle cx="40" cy="42" r="6" fill="#FACC15" ${C}/><path d="M40 42 L66 12 M60 12 H66 V18" fill="none" stroke="#FB7185" stroke-width="4" stroke-linecap="round"/>`,
    estrela: `<path d="M40 8 L49 28 L71 30 L54 45 L59 67 L40 56 L21 67 L26 45 L9 30 L31 28 Z" fill="#FACC15" ${C}/><circle cx="34" cy="32" r="3" fill="#fff" opacity=".7"/>`,
    relogio: `<circle cx="40" cy="44" r="26" fill="#12325A" ${C}/><rect x="33" y="8" width="14" height="8" rx="3" fill="#FACC15" ${C}/><path d="M40 44 V28 M40 44 L52 52" stroke="#FACC15" stroke-width="5" stroke-linecap="round"/>`,
    revisao: `<path d="M18 40 A22 22 0 0 1 58 28" fill="none" ${C} stroke-width="6"/><path d="M62 40 A22 22 0 0 1 22 52" fill="none" ${C} stroke-width="6"/><path d="M52 20 L60 28 L50 32 M28 60 L20 52 L30 48" fill="none" stroke="#FACC15" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    controle: `<path d="M16 30 Q40 22 64 30 Q76 34 74 52 Q72 64 62 60 L54 52 H26 L18 60 Q8 64 6 52 Q4 34 16 30 Z" fill="#1A416F" ${C}/><path d="M22 42 H32 M27 37 V47" stroke="#FACC15" stroke-width="4" stroke-linecap="round"/><circle cx="52" cy="40" r="3.5" fill="#FB7185"/><circle cx="59" cy="46" r="3.5" fill="#14B8A6"/>`,
    quadro: `<rect x="8" y="12" width="64" height="56" rx="8" fill="#0C354C" ${C}/><rect x="14" y="20" width="16" height="12" rx="3" fill="#FACC15"/><rect x="14" y="36" width="16" height="10" rx="3" fill="#A9BCD6"/><rect x="34" y="20" width="16" height="16" rx="3" fill="#14B8A6"/><rect x="54" y="20" width="12" height="10" rx="3" fill="#FB7185"/><rect x="54" y="34" width="12" height="10" rx="3" fill="#A9BCD6"/>`,
    calendario: `<rect x="10" y="16" width="60" height="54" rx="8" fill="#12325A" ${C}/><path d="M10 30 H70" ${C}/><path d="M24 10 V20 M56 10 V20" ${C}/><rect x="20" y="38" width="10" height="9" rx="2" fill="#FACC15"/><rect x="35" y="38" width="10" height="9" rx="2" fill="#A9BCD6" opacity=".6"/><rect x="50" y="38" width="10" height="9" rx="2" fill="#A9BCD6" opacity=".6"/><rect x="20" y="52" width="10" height="9" rx="2" fill="#A9BCD6" opacity=".6"/><rect x="35" y="52" width="10" height="9" rx="2" fill="#14B8A6"/>`,
    ampulheta: `<path d="M20 10 H60 M20 70 H60" ${C} stroke-width="6"/><path d="M24 12 Q24 34 40 40 Q56 34 56 12 Z M24 68 Q24 46 40 40 Q56 46 56 68 Z" fill="#12325A" ${C}/><path d="M30 62 Q40 50 50 62 Z" fill="#FACC15"/><path d="M34 20 H46" stroke="#FACC15" stroke-width="4" stroke-linecap="round"/>`,
    trofeu: `<path d="M24 10 H56 V30 Q56 48 40 50 Q24 48 24 30 Z" fill="#FACC15" ${C}/><path d="M24 16 H12 Q12 34 26 36 M56 16 H68 Q68 34 54 36" fill="none" ${C}/><path d="M40 50 V60 M28 70 H52 V62 H28 Z" fill="#0C354C" ${C}/>`,
    upload: `<path d="M18 8 H48 L62 22 V72 H18 Z" fill="#E6F1FF" ${C}/><path d="M48 8 V22 H62" fill="#A9BCD6" ${C}/><path d="M40 60 V34 M30 44 L40 34 L50 44" fill="none" stroke="#14B8A6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
    carta: `<rect x="8" y="18" width="64" height="44" rx="6" fill="#E6F1FF" ${C}/><path d="M8 22 L40 44 L72 22" fill="none" ${C}/><circle cx="62" cy="58" r="10" fill="#FB7185" ${C}/><path d="M62 53 V59 M62 63 V63.5" stroke="#06172D" stroke-width="3" stroke-linecap="round"/>`,
    lupa: `<circle cx="34" cy="34" r="20" fill="#12325A" ${C}/><circle cx="34" cy="34" r="11" fill="#0C354C" ${C}/><path d="M49 49 L70 70" stroke="#FACC15" stroke-width="8" stroke-linecap="round"/><path d="M28 28 Q32 24 36 26" stroke="#E6F1FF" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    onda: `<path d="M6 34 Q16 24 26 34 T46 34 T66 34 T86 34" fill="none" ${C} stroke-width="6"/><path d="M6 52 Q16 42 26 52 T46 52 T66 52" fill="none" stroke="#FACC15" stroke-width="6" stroke-linecap="round"/>`,
  };

  function desenho(nome) {
    const box = h('div', { class: 'tour__desenho', 'aria-hidden': 'true' });
    if (nome === 'diver') {
      box.classList.add('mascote', 'mascote--pensando');
      box.append(document.getElementById('molde-mascote').content.cloneNode(true));
      return box;
    }
    box.innerHTML = `<svg viewBox="0 0 80 80">${ILUSTRACOES[nome] || ILUSTRACOES.onda}</svg>`; // SVG fixo deste arquivo
    return box;
  }

  /* ---------- Roteiros por área (a chave é o endereço: #inicio, #mergulho...) ---------- */
  const ROTEIROS = {
    inicio: [
      { desenho: 'diver', titulo: 'Bem-vindo ao Diver!', texto: 'Aqui você estuda em mergulhos curtos, ganha XP e pérolas e sobe de nível. Em poucos passos eu te mostro onde fica cada coisa.' },
      { alvo: '#continuar', desenho: 'ancora', titulo: 'Continuar de onde parou', texto: 'Seu último curso e a fase onde você estava. Um toque e você volta a mergulhar. Quer outro curso? "Ver todos os cursos".' },
      { alvo: '#lista-trilhas', desenho: 'livro', titulo: 'Escolha seu curso', texto: 'Cada card é um curso. A barrinha embaixo mostra quanto você já desceu nele.' },
      { alvo: '#inicio-cta', desenho: 'ancora', titulo: 'Bora mergulhar!', texto: 'Escolheu? É só tocar aqui. Essa barra fica sempre à vista, mesmo quando você rola a página.' },
      { alvo: '#hoje', desenho: 'alvo', titulo: 'Seu dia', texto: 'O Desafio do Dia vale XP em dobro. Aqui também aparecem a meta de questões e o que tem na sua agenda.' },
      { alvo: '#seletor-trilha', desenho: 'onda', titulo: 'Trilha atual', texto: 'Quer trocar de curso sem voltar ao Início? É por aqui, na barra lateral.' },
    ],
    mergulho: [
      { alvo: '#mapa-fases', desenho: 'mapa', titulo: 'Mapa do mergulho', texto: 'Cada fase é uma profundidade. Uma rodada tem 8 questões, com a explicação logo depois de cada resposta.' },
      { alvo: '#mapa-fases .fase__estudo', desenho: 'livro', titulo: 'Antes de mergulhar', texto: 'Uma leitura curta com os pontos-chave da fase. Vale ler antes de responder: a água fica mais clara.' },
      { desenho: 'oxigenio', titulo: 'Oxigênio', texto: 'Você desce com 3 tubos. Cada erro gasta um, e a questão errada volta no fim da rodada para você tentar de novo.' },
      { alvo: '#tela-painel .status', desenho: 'perola', titulo: 'XP, pérolas e sequência', texto: 'Acertos dão XP (para subir de nível) e pérolas (para dicas nos jogos). Estudar todo dia mantém sua sequência.' },
    ],
    simulado: [
      { alvo: '#tela-simulado .modo', desenho: 'relogio', titulo: 'Treino de prova', texto: 'Escolha quantas questões e encare o cronômetro: sem oxigênio e com a correção só no final, como numa prova de verdade.' },
      { alvo: '#provas-enviadas', desenho: 'upload', titulo: 'Provas antigas', texto: 'Tem uma prova antiga com gabarito? Suba o PDF aqui e ela vira um simulado com nota.' },
      { alvo: '#historico-simulados', desenho: 'estrela', titulo: 'Suas notas', texto: 'Cada simulado fica guardado aqui, com a média. É o seu termômetro antes da prova.' },
    ],
    revisao: [
      { desenho: 'revisao', titulo: 'Revisão', texto: 'As questões que você errou ou marcou voltam para cá. Acertou de novo? Ela sai da fila. Nada fica pra trás.' },
    ],
    prova: [
      { desenho: 'trofeu', titulo: 'Prova final', texto: 'Ela libera quando você conclui as fases do curso. Tem cronômetro, nota mínima e pode ser refeita: respira fundo e vai.' },
    ],
    jogos: [
      { desenho: 'controle', titulo: 'Sala de Jogos', texto: 'Um conteúdo, muitos jogos: todos usam as questões do seu curso atual. Ótimo para revisar em 2 a 5 minutos.' },
      { alvo: '#jogos-lista .jogo-card', desenho: 'estrela', titulo: 'Cada jogo, um desafio', texto: 'Acertos dão XP e pérolas, e cada jogo tem o seu bônus. Seu recorde aparece no card.' },
    ],
    tarefas: [
      { desenho: 'quadro', titulo: 'Quadros de tarefas', texto: 'Organize os estudos em listas e cartões. Arraste para mudar de lugar, dê um prazo (ele vai para o Calendário) e conclua para ganhar XP.' },
    ],
    calendario: [
      { desenho: 'calendario', titulo: 'Calendário', texto: 'Marque provas, aulas e blocos de estudo. O gerador de cronograma monta um plano até a data da sua prova.' },
    ],
    foco: [
      { desenho: 'ampulheta', titulo: 'Modo Foco', texto: 'Ciclos de foco e pausa (25/5 ou 50/10). Cada bloco completo dá XP e pérolas. Celular longe, cabeça no fundo.' },
    ],
    'upload-prova': [
      { desenho: 'upload', titulo: 'Upload de prova', texto: 'Mande o PDF (ou cole o texto) com o gabarito. Eu separo as questões e você confere tudo antes de salvar.' },
    ],
    fila: [
      { alvo: '#fila-chaves-cartao', desenho: 'diver', titulo: 'Chaves das IAs', texto: 'Aqui você confere se as chaves do Gemini e da OpenAI estão nos Secrets do Supabase. O valor delas nunca aparece: só "cadastrada" ou "não encontrada".' },
      { alvo: '#fila-lista', desenho: 'alvo', titulo: 'Lotes e custo', texto: 'Cada lote mostra o custo estimado antes de qualquer gasto. Nada roda sozinho: você aprova ou rejeita.' },
      { desenho: 'relogio', titulo: 'Aprovar com senha', texto: 'Aprovar pede a sua senha de novo, toda vez. Só então o Mergulho Triplo chama as IAs pagas. Rejeitar não custa nada.' },
    ],
    estatisticas: [
      { alvo: '.est-numeros', desenho: 'trofeu', titulo: 'Seus números', texto: 'Perguntas, jogos, revisões, simulados e provas, somando tudo. Cada coisa que você faz no Diver entra aqui sozinha.' },
      { alvo: '#est-curso', desenho: 'mapa', titulo: 'Um curso ou todos', texto: 'Escolha um curso para ver só ele, ou "Todos os cursos" para o mergulho completo.' },
    ],
    descompressao: [
      { desenho: 'diver', titulo: 'Sala de Descompressão', texto: 'Respira, Diver! Aqui é só para brincar e distrair, sem matéria. Vale para todo mundo, de qualquer curso.' },
      { alvo: '#sd-jogos', desenho: 'controle', titulo: 'Quatro jogos', texto: 'Investigação e Palavrinha do Dia mudam todo dia (e são iguais para todo mundo). Tiro ao Alvo e Batata Quente são à vontade.' },
      { alvo: '#sd-placar', desenho: 'trofeu', titulo: 'Placar da sala', texto: 'Os pontos daqui valem só este placar: nada de XP ou pérolas dos cursos. Ele zera todo mês.' },
      { alvo: '#sd-horarios', desenho: 'relogio', titulo: 'Horários de foco', texto: 'Você pode fechar a sala para os alunos em horários de estudo. Admin e professores continuam entrando.' },
    ],
    perfil: [
      { alvo: '.perfil-topo__info', desenho: 'trofeu', titulo: 'Seu nível geral', texto: 'O XP de todos os cursos somado. Cada mergulho, jogo e revisão empurra a barra.' },
    ],
  };

  /* ---------- Guardar o que já foi visto ---------- */
  function vistos() {
    const d = Dados.ler(CHAVE, null);
    return d && d.vistos ? d.vistos : {};
  }
  function marcarVisto(secao) {
    Dados.gravar(CHAVE, { vistos: { ...vistos(), [secao]: true } });
  }
  function zerar() {
    Dados.gravar(CHAVE, { vistos: {} });
  }

  /* ---------- Interface ---------- */
  let atual = null; // { secao, passos, i, anterior (foco), limpar }

  const visivel = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

  function passosValidos(secao) {
    return (ROTEIROS[secao] || []).filter((p) => !p.alvo || visivel(document.querySelector(p.alvo)));
  }

  function tem(secao) {
    return !!ROTEIROS[secao];
  }

  /** Chamado a cada troca de área: abre o tutorial se for a primeira vez. */
  function aoEntrar(secao) {
    if (atual || !ROTEIROS[secao] || vistos()[secao]) return;
    // Espera a tela assentar (e a cortina de transição sumir)
    setTimeout(() => {
      const tela = document.querySelector('.tela:not([hidden])');
      if (atual || !tela || document.body.classList.contains('modo-foco') || vistos()[secao]) return;
      if ((location.hash.replace('#', '') || 'inicio') !== secao) return; // a pessoa já saiu da página
      iniciar(secao);
    }, UI.movimentoReduzido ? 150 : 900);
  }

  function iniciar(secao) {
    fechar(false);
    const passos = passosValidos(secao);
    if (!passos.length) return;
    const raiz = h('div', { class: 'tour', id: 'tour' });
    const destaque = h('div', { class: 'tour__destaque', 'aria-hidden': 'true' });
    const balao = h('div', { class: 'tour__balao', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-titulo', 'aria-describedby': 'tour-texto' });
    raiz.append(destaque, balao);
    document.body.append(raiz);
    const reposicionar = () => posicionar();
    window.addEventListener('resize', reposicionar);
    window.addEventListener('scroll', reposicionar, true);
    const teclas = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(true); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); ir(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
      else if (e.key === 'Tab') prenderFoco(e);
    };
    document.addEventListener('keydown', teclas, true);
    atual = {
      secao, passos, i: 0, raiz, destaque, balao, anterior: document.activeElement,
      limpar: () => {
        window.removeEventListener('resize', reposicionar);
        window.removeEventListener('scroll', reposicionar, true);
        document.removeEventListener('keydown', teclas, true);
      },
    };
    desenhar();
  }

  function prenderFoco(e) {
    const focaveis = [...atual.balao.querySelectorAll('button')];
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    else if (!atual.balao.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); }
  }

  function ir(passo) {
    if (!atual) return;
    const novo = atual.i + passo;
    if (novo < 0) return;
    if (novo >= atual.passos.length) return fechar(true);
    atual.i = novo;
    desenhar();
  }

  function desenhar() {
    const { passos, i, balao } = atual;
    const p = passos[i];
    const ultimo = i === passos.length - 1;
    const proximo = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => ir(1) },
      ultimo ? 'Bora mergulhar!' : 'Próximo', ultimo ? null : UI.icone('i-seta-dir'));
    balao.replaceChildren(
      desenho(p.desenho),
      h('div', { class: 'tour__corpo' },
        h('p', { class: 'tour__passo', text: passos.length > 1 ? `${i + 1} de ${passos.length}` : 'Primeiro mergulho' }),
        h('h2', { class: 'tour__titulo', id: 'tour-titulo', text: p.titulo }),
        h('p', { class: 'tour__texto', id: 'tour-texto', text: p.texto }),
        h('div', { class: 'tour__botoes' },
          ultimo ? null : h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => fechar(true) }, 'Pular'),
          i > 0 ? h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', 'aria-label': 'Passo anterior', onclick: () => ir(-1) }, 'Voltar') : null,
          proximo)));
    balao.classList.remove('tour__balao--entra');
    void balao.offsetWidth;
    balao.classList.add('tour__balao--entra');
    const alvo = p.alvo ? document.querySelector(p.alvo) : null;
    if (alvo) {
      const comportamento = UI.movimentoReduzido ? 'auto' : 'smooth';
      // Alvo alto (lista de cursos no celular): mostra o começo dele, abaixo da barra do topo
      if (alvo.offsetHeight > innerHeight * 0.6) window.scrollTo({ top: window.scrollY + alvo.getBoundingClientRect().top - 110, behavior: comportamento });
      else alvo.scrollIntoView({ block: 'center', behavior: comportamento });
    }
    posicionar();
    setTimeout(posicionar, UI.movimentoReduzido ? 0 : 380); // depois da rolagem suave
    proximo.focus({ preventScroll: true });
  }

  /** Coloca o recorte de luz sobre o alvo e o balão perto dele (ou no centro, sem alvo). */
  function posicionar() {
    if (!atual) return;
    const p = atual.passos[atual.i];
    const { destaque, balao } = atual;
    const alvo = p.alvo ? document.querySelector(p.alvo) : null;
    const margem = 8;
    balao.style.removeProperty('top');
    balao.style.removeProperty('left');
    if (!alvo || !visivel(alvo)) {
      destaque.classList.add('tour__destaque--sem-alvo');
      balao.classList.add('tour__balao--centro');
      return;
    }
    destaque.classList.remove('tour__destaque--sem-alvo');
    balao.classList.remove('tour__balao--centro');
    const r = alvo.getBoundingClientRect();
    const top = Math.max(4, r.top - margem);
    const bottom = Math.min(innerHeight - 4, r.bottom + margem);
    Object.assign(destaque.style, {
      top: `${top}px`, left: `${Math.max(4, r.left - margem)}px`,
      width: `${Math.min(innerWidth - 8, r.width + margem * 2)}px`, height: `${Math.max(24, bottom - top)}px`,
    });
    if (innerWidth < 600) return; // no celular o balão fica preso no pé da tela (CSS)
    const bw = balao.offsetWidth;
    const bh = balao.offsetHeight;
    let y = bottom + 12;
    if (y + bh > innerHeight - 12) y = top - bh - 12; // não coube embaixo: vai para cima
    if (y < 12) y = Math.min(innerHeight - bh - 12, Math.max(12, r.top + 12)); // alvo gigante: por cima dele
    const x = Math.min(innerWidth - bw - 12, Math.max(12, r.left + r.width / 2 - bw / 2));
    balao.style.top = `${y}px`;
    balao.style.left = `${x}px`;
  }

  function fechar(marcar) {
    if (!atual) return;
    const { secao, raiz, anterior, limpar } = atual;
    atual = null;
    limpar();
    if (marcar) marcarVisto(secao);
    raiz.classList.add('tour--saindo');
    setTimeout(() => raiz.remove(), UI.movimentoReduzido ? 0 : 200);
    if (anterior && anterior.focus && document.contains(anterior)) anterior.focus({ preventScroll: true });
  }

  /**
   * Tutorial de uma tela que não é área do menu (ex.: as telas de um jogo).
   * Guarda o roteiro e abre na primeira vez (ou sempre, com { forcar: true }: botão "Como funciona?").
   */
  function guiar(secao, passos, { forcar = false } = {}) {
    ROTEIROS[secao] = passos;
    if (!forcar && vistos()[secao]) return;
    setTimeout(() => {
      if (atual || (!forcar && vistos()[secao])) return;
      if (!passos.some((p) => !p.alvo || visivel(document.querySelector(p.alvo)))) return; // a tela já mudou
      iniciar(secao);
    }, forcar || UI.movimentoReduzido ? 120 : 650);
  }

  return { aoEntrar, iniciar, guiar, fechar, zerar, tem, aberto: () => !!atual, ROTEIROS };
})();

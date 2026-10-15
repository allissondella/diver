/*
 * ui.js — ferramentas de interface usadas por todas as áreas do Diver
 * (app, jogos, organizar, biblioteca, perfil). Nada de regra de jogo aqui.
 */
const UI = (() => {
  const $ = (id) => document.getElementById(id);

  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Cria um elemento. Textos entram sempre como texto (nunca como HTML). */
  function h(tag, props = {}, ...filhos) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    filhos.flat().forEach((f) => {
      if (f === null || f === undefined || f === false) return;
      el.append(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
    });
    return el;
  }

  /**
   * Botão "carregando": spinner no lugar do ícone (CSS de .botao[aria-busy]), sem aceitar outro clique.
   * texto (opcional) troca o rótulo enquanto carrega; ao desligar, o rótulo original volta.
   */
  function carregando(botao, ligado, texto) {
    if (!botao) return;
    if (ligado) {
      botao.setAttribute('aria-busy', 'true');
      if ('disabled' in botao && botao.tagName === 'BUTTON') botao.disabled = true;
      if (texto) {
        const rotulo = [...botao.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        if (rotulo) { botao.dataset.rotuloOriginal = rotulo.textContent; rotulo.textContent = texto; }
      }
    } else {
      botao.removeAttribute('aria-busy');
      if (botao.tagName === 'BUTTON') botao.disabled = false;
      if (botao.dataset.rotuloOriginal) {
        const rotulo = [...botao.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        if (rotulo) rotulo.textContent = botao.dataset.rotuloOriginal;
        delete botao.dataset.rotuloOriginal;
      }
    }
  }

  /**
   * Barra de progresso (role="progressbar"): põe a largura do preenchimento, o aria-valuenow e,
   * quando o valor sobe, o brilho rápido (.barra--subiu, 600 ms). pct de 0 a 100; valor = o número para o leitor de tela.
   */
  function progresso(barra, pct, valor = pct) {
    if (!barra) return;
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    const antes = Number(barra.dataset.pct || 0);
    const cheio = barra.firstElementChild;
    if (cheio) cheio.style.width = p + '%';
    barra.setAttribute('aria-valuenow', String(Math.round(valor)));
    barra.dataset.pct = String(p);
    if (p > antes && !movimentoReduzido) {
      barra.classList.remove('barra--subiu');
      void barra.offsetWidth; // reinicia a animação
      barra.classList.add('barra--subiu');
      setTimeout(() => barra.classList.remove('barra--subiu'), 650);
    }
  }

  /**
   * Esqueleto de carregamento: blocos no formato do que vai chegar ('sala', 'curso' ou 'fase'), com brilho
   * passando (estático com "reduzir movimento"). O aviso em texto vai para um aria-live oculto.
   */
  function esqueleto(forma, quantos = 3, aviso = 'Carregando…') {
    const caixa = h('div', { class: `esqueletos esqueletos--${forma}`, 'aria-hidden': 'true' },
      Array.from({ length: quantos }, () => h('div', { class: `esqueleto esqueleto--${forma}` },
        h('span', { class: 'esqueleto__circulo' }),
        h('span', { class: 'esqueleto__linhas' }, h('span', { class: 'esqueleto__linha esqueleto__linha--titulo' }), h('span', { class: 'esqueleto__linha' }), h('span', { class: 'esqueleto__linha esqueleto__linha--curta' })))));
    return h('div', { class: 'esqueleto-area' }, caixa, h('p', { class: 'visualmente-oculto', role: 'status', 'aria-live': 'polite', text: aviso }));
  }

  /** Valor de um token de cor do css/tokens.css (ex.: UI.cor('primaria') → '#14B8A6'), para canvas e SVG montado no JS. */
  const coresLidas = {};
  function cor(nome) {
    if (!(nome in coresLidas)) {
      try { coresLidas[nome] = getComputedStyle(document.documentElement).getPropertyValue('--' + nome).trim(); } catch { coresLidas[nome] = ''; }
    }
    return coresLidas[nome];
  }

  /** Ícone do sprite SVG do index.html. */
  function icone(nome, classe = '') {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', `icone ${classe}`.trim());
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + nome);
    svg.append(use);
    return svg;
  }

  function limpar(el) {
    el.replaceChildren();
    return el;
  }

  function embaralhar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sortear(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
  }

  function formatarTempo(seg) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function plural(n, singular, pluralTxt) {
    return `${n} ${n === 1 ? singular : pluralTxt}`;
  }

  /** "fotossíntese!" -> "fotossintese" (sem acento, minúsculas, sem pontuação). */
  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Data local no formato AAAA-MM-DD. */
  function dataLocal(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** "2026-09-29" -> Date à meia-noite local. */
  function paraData(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d);
  }

  function formatarData(iso, opcoes = { day: '2-digit', month: 'short' }) {
    return paraData(iso).toLocaleDateString('pt-BR', opcoes);
  }

  function id(prefixo = 'id') {
    return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /** Oferece um arquivo para o usuário baixar. */
  function baixarArquivo(nome, conteudo, tipo = 'application/json') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = h('a', { href: url, download: nome });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------- Avisos rápidos (toasts) ---------- */
  function toast(titulo, texto, nomeIcone = 'i-trofeu', { conquista = false } = {}) {
    const el = h('div', { class: `toast ${conquista ? 'toast--conquista' : ''}`.trim(), role: 'status' },
      h('span', { class: 'toast__icone' }, icone(nomeIcone)),
      h('div', {}, h('p', { class: 'toast__titulo', text: titulo }), h('p', { class: 'toast__texto', text: texto })),
    );
    const area = $('toasts');
    area.append(el);
    // No máximo 3 avisos por vez, para não cobrir o conteúdo; cada um some em 4 s
    while (area.children.length > 3) area.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('saindo');
      setTimeout(() => el.remove(), 320);
    }, 4000);
  }

  function avisarConquistas(lista) {
    lista.forEach((c, i) => setTimeout(() => toast('Conquista desbloqueada', c.nome, c.icone, { conquista: true }), i * 600));
    if (lista.length) confete(); // comemoração discreta: só em conquista e em fim de fase, nunca num acerto comum
  }

  /* ---------- Movimento (Onda 5); com "reduzir movimento" tudo vira instantâneo ---------- */
  /** Conta o número de um elemento de "de" até "para" em ~400 ms (XP e pérolas no feedback e no resumo). */
  function contar(el, de, para, ms = 400) {
    if (!el) return;
    const fim = Number(para) || 0;
    if (movimentoReduzido || fim === Number(de)) { el.textContent = String(fim); return; }
    const t0 = performance.now();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      el.textContent = String(Math.round(Number(de) + (fim - Number(de)) * (1 - (1 - k) * (1 - k))));
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  /** Confete discreto: 12 partículas, 800 ms, nas cores da marca; nada com "reduzir movimento". */
  function confete() {
    if (movimentoReduzido) return;
    const cores = ['primaria', 'destaque', 'primaria-clara', 'perola', 'erro-clara', 'lilas'];
    const camada = h('div', { class: 'confete', 'aria-hidden': 'true' },
      Array.from({ length: 12 }, (_, i) => h('i', {
        style: `--x:${Math.round((Math.random() - 0.5) * 360)}px;--y:${Math.round(-120 - Math.random() * 160)}px;--giro:${Math.round(Math.random() * 540)}deg;` +
          `--atraso:${Math.round(Math.random() * 120)}ms;background:var(--${cores[i % cores.length]})`,
      })));
    document.body.append(camada);
    setTimeout(() => camada.remove(), 1000);
  }

  /* ---------- Atalhos do teclado: "?" abre a lista (UI.atalhos) ---------- */
  const ATALHOS_GERAIS = [
    ['?', 'Abre esta lista'],
    ['Esc', 'Fecha a janela, a gaveta do menu ou o tutorial'],
    ['Tab / Shift+Tab', 'Anda entre botões e campos'],
  ];
  const ATALHOS_TELA = {
    'tela-quiz': [['1 a 6 ou A a F', 'Escolhe a alternativa'], ['Enter ou Espaço', 'Continua depois de responder']],
    'tela-tarefas': [['Enter', 'Salva a tarefa'], ['Shift+Enter', 'Salva e abre outra'], ['Alt+Enter', 'Salva e abre os detalhes'], ['Esc', 'Desiste da edição']],
  };
  function atalhos() {
    const tela = [...document.querySelectorAll('.tela')].find((t) => !t.hidden);
    const daTela = (tela && ATALHOS_TELA[tela.id]) || [];
    const linhas = (lista) => h('dl', { class: 'atalhos-lista' }, lista.map(([k, v]) => h('div', {}, h('dt', {}, h('kbd', { text: k })), h('dd', { text: v }))));
    const dialogo = h('dialog', { class: 'dialogo dialogo--atalhos', 'aria-labelledby': 'atalhos-titulo' },
      h('div', { class: 'dialogo__caixa' },
        h('header', { class: 'dialogo__topo' },
          h('h2', { class: 'dialogo__titulo', id: 'atalhos-titulo', text: 'Atalhos do teclado' }),
          h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar', onclick: () => dialogo.close() }, icone('i-x'))),
        h('div', { class: 'dialogo__corpo' },
          daTela.length ? h('section', {}, h('h3', { class: 'resumo__titulo', text: 'Nesta tela' }), linhas(daTela)) : null,
          h('section', {}, h('h3', { class: 'resumo__titulo', text: 'Em qualquer tela' }), linhas(ATALHOS_GERAIS)))));
    dialogo.addEventListener('close', () => dialogo.remove());
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
    document.body.append(dialogo);
    dialogo.showModal();
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    const alvo = e.target;
    if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    atalhos();
  });

  /* ---------- Mascote ---------- */
  function montarMascotes(raiz = document) {
    const molde = $('molde-mascote');
    raiz.querySelectorAll('[data-mascote]').forEach((el) => {
      if (!el.firstElementChild) el.append(molde.content.cloneNode(true));
    });
  }

  /** humor: 'feliz' | 'triste' | 'pensando' | null (neutro) */
  function humorMascote(container, humor) {
    container.querySelectorAll('[data-mascote]').forEach((m) => {
      m.classList.remove('mascote--feliz', 'mascote--triste', 'mascote--pensando');
      void m.offsetWidth; // reinicia a animação
      if (humor) m.classList.add('mascote--' + humor);
    });
  }

  /** Um mascote novo, pronto para colocar em qualquer tela. */
  function mascote(classe = '') {
    const el = h('div', { class: `mascote ${classe}`.trim(), 'data-mascote': true });
    el.append($('molde-mascote').content.cloneNode(true));
    return el;
  }

  /** Cabeçalho padrão das áreas: rótulo, título (focável) e subtítulo. */
  function cabecalho(rotulo, titulo, sub) {
    return h('header', { class: 'area-cabeca' },
      rotulo ? h('span', { class: 'rotulo', text: rotulo }) : null,
      h('h1', { tabindex: '-1', text: titulo }),
      sub ? h('p', { class: 'area-cabeca__sub', text: sub }) : null);
  }

  /** Estado vazio com o mascote e uma mensagem gentil. */
  function vazio(texto, acao) {
    return h('div', { class: 'estado-vazio' }, mascote('estado-vazio__mascote'), h('p', { text: texto }), acao || null);
  }

  /* ---------- Caixa de confirmação do Diver (no lugar do confirm/prompt do navegador) ---------- */
  let caixaAberta = null;

  /**
   * Pergunta algo numa caixa no padrão do Diver e devolve uma Promise:
   * true/false (confirmar) ou o texto digitado/null (quando há "campo").
   *   titulo, texto ("\n\n" separa parágrafos), sim, nao: textos
   *   humor: 'triste' (sair de algo), 'pensando' (padrão), 'feliz' ou null
   *   perigo: o botão "sim" fica coral (apagar, zerar, tirar acesso)
   *   foco: 'nao' (padrão, a opção segura) ou 'sim'
   *   campo: { rotulo, valor } para pedir um texto
   * Esc, clicar fora ou "nao" = cancelar. O foco volta para onde estava.
   */
  function confirmar({ titulo, texto = '', sim = 'Confirmar', nao = 'Cancelar', humor = 'pensando', perigo = false, foco = 'nao', campo = null } = {}) {
    if (caixaAberta) caixaAberta.close();
    const antes = document.activeElement;
    const entrada = campo ? h('input', { class: 'campo', id: 'confirmar-campo', type: 'text', value: campo.valor || '', autocomplete: 'off' }) : null;
    // Enter no campo = "sim" (sem isso o formulário usaria o primeiro botão, que é o "não")
    if (entrada) entrada.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); entrada.closest('dialog').close('sim'); } });
    const botaoSim = h('button', { type: 'submit', value: 'sim', class: `botao ${perigo ? 'botao--perigo' : 'botao--primario'}`, text: sim });
    const botaoNao = h('button', { type: 'submit', value: 'nao', class: 'botao botao--fantasma', text: nao });
    const dialogo = h('dialog', { class: 'dialogo dialogo--confirmar', 'aria-labelledby': 'confirmar-titulo', 'aria-describedby': texto ? 'confirmar-texto' : null },
      h('form', { method: 'dialog', class: 'confirmar' },
        mascote(`confirmar__mascote ${humor ? `mascote--${humor}` : ''}`.trim()),
        h('h2', { class: 'confirmar__titulo', id: 'confirmar-titulo', text: titulo }),
        texto ? h('div', { class: 'confirmar__texto', id: 'confirmar-texto' }, String(texto).split(/\n\s*\n/).map((p) => h('p', { text: p.trim() }))) : null,
        entrada ? h('label', { class: 'confirmar__campo' }, h('span', { class: 'rotulo-campo', text: campo.rotulo || '' }), entrada) : null,
        h('div', { class: 'confirmar__botoes' }, botaoNao, botaoSim)));
    dialogo.querySelector('.confirmar__mascote').setAttribute('aria-hidden', 'true');
    // as teclas ficam na caixa: os atalhos da tela de trás (quiz, jogos, quadros) não disparam
    dialogo.addEventListener('keydown', (e) => e.stopPropagation());
    // clicar no fundo escuro (fora da caixa) cancela
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close('nao'); });
    document.body.append(dialogo);
    caixaAberta = dialogo;
    return new Promise((resolver) => {
      dialogo.addEventListener('close', () => {
        const ok = dialogo.returnValue === 'sim';
        if (caixaAberta === dialogo) caixaAberta = null;
        dialogo.remove();
        if (antes && antes.isConnected && typeof antes.focus === 'function') antes.focus({ preventScroll: true });
        resolver(campo ? (ok ? entrada.value : null) : ok);
      }, { once: true });
      dialogo.showModal();
      (entrada || (foco === 'sim' ? botaoSim : botaoNao)).focus({ preventScroll: true });
      if (entrada) entrada.select();
    });
  }

  /**
   * Bloco de código (Explora Tech, 2026-10-13): texto monoespaçado que não quebra o recuo, sempre como texto.
   * Rola na horizontal só dentro do bloco (tabindex para dar para rolar pelo teclado).
   */
  function codigo(texto, { rotulo = 'Código' } = {}) {
    return h('pre', { class: 'codigo', tabindex: '0', 'aria-label': rotulo }, h('code', { text: String(texto).replace(/\n+$/, '') }));
  }

  /** Texto com **negrito** e `código em linha` vira nós (sempre como texto). */
  function marcado(texto) {
    return String(texto).split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((p) => {
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return h('strong', { text: p.slice(2, -2) });
      if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return h('code', { class: 'codigo-linha', text: p.slice(1, -1) });
      return p;
    });
  }

  /** Atalho para pedir um texto (no lugar do prompt do navegador): devolve o texto ou null. */
  const perguntar = (opcoes) => confirmar({ sim: 'Salvar', ...opcoes, campo: opcoes.campo || {} });

  return {
    confirmar, perguntar,
    $, h, icone, cor, carregando, progresso, esqueleto, limpar, embaralhar, sortear, formatarTempo, plural, normalizar,
    dataLocal, paraData, formatarData, id, baixarArquivo, toast, avisarConquistas,
    montarMascotes, humorMascote, mascote, cabecalho, vazio, movimentoReduzido, codigo, marcado,
    contar, confete, atalhos,
  };
})();

/*
 * Dados — leitura e escrita no localStorage, sempre com try/catch
 * (o app continua funcionando se o navegador bloquear o armazenamento).
 */
const Dados = (() => {
  function ler(chave, padrao) {
    try {
      const v = localStorage.getItem(chave);
      return v === null ? padrao : JSON.parse(v);
    } catch (e) {
      return padrao;
    }
  }
  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.warn('Não foi possível salvar', chave, e);
      return false;
    }
  }
  function remover(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (e) {
      /* sem armazenamento */
    }
  }
  /** Todas as chaves do Diver (para backup). */
  function chavesDiver() {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith('diver:') && k !== 'diver:sessao'); // a sessão de login nunca vai para o backup
    } catch (e) {
      return [];
    }
  }
  return { ler, gravar, remover, chavesDiver };
})();

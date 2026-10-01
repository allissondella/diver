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
  function toast(titulo, texto, nomeIcone = 'i-trofeu') {
    const el = h('div', { class: 'toast', role: 'status' },
      h('span', { class: 'toast__icone' }, icone(nomeIcone)),
      h('div', {}, h('p', { class: 'toast__titulo', text: titulo }), h('p', { class: 'toast__texto', text: texto })),
    );
    const area = $('toasts');
    area.append(el);
    // No máximo 2 avisos por vez, para não cobrir o conteúdo
    while (area.children.length > 2) area.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('saindo');
      setTimeout(() => el.remove(), 320);
    }, 3000);
  }

  function avisarConquistas(lista) {
    lista.forEach((c, i) => setTimeout(() => toast('Conquista desbloqueada', c.nome, c.icone), i * 600));
  }

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

  /** Atalho para pedir um texto (no lugar do prompt do navegador): devolve o texto ou null. */
  const perguntar = (opcoes) => confirmar({ sim: 'Salvar', ...opcoes, campo: opcoes.campo || {} });

  return {
    confirmar, perguntar,
    $, h, icone, limpar, embaralhar, sortear, formatarTempo, plural, normalizar,
    dataLocal, paraData, formatarData, id, baixarArquivo, toast, avisarConquistas,
    montarMascotes, humorMascote, mascote, cabecalho, vazio, movimentoReduzido,
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

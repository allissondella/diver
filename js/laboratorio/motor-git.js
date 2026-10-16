/*
 * laboratorio/motor-git.js — um Git de mentirinha em cima do shell de mentirinha (Explora Tech, Módulo 12,
 * 2026-10-16). Só lógica, sem tela: roda no navegador (Linha do Tempo do Código) e no scripts/conferir-laboratorios.mjs.
 * Precisa do MotorShell (js/laboratorio/motor-shell.js) carregado antes: o Git entra no shell como plugin, e os
 * arquivos do projeto são os mesmos do sistema de arquivos virtual (echo > arquivo, cat, nano funcionam juntos).
 *
 * Modelo próprio, sem Git de verdade: commits num objeto (hash curto calculado do conteúdo), índice (a área de
 * preparo, uma cópia completa da árvore), branches como marcadores, HEAD sempre num branch, merge de três vias por
 * linha (com marcas de conflito), revert, e servidores remotos de faz de conta (push, pull, clone).
 * Comandos: git init · status [-s] · add · commit -m [--amend] [-a] · log [--oneline] [-N] [--graph] [--all] · show ·
 * diff [--staged] [HEAD] · restore [--staged] · branch [-d] · switch [-c] · checkout [-b] · merge [--abort] · revert ·
 * remote add/-v · push [-u] · pull · fetch · clone · config.
 * Missão (data/laboratorios/<curso>/linha-do-tempo-do-codigo.json):
 *   inicio: { casa, cwd, arquivos, semConfig, servidores: [url], preparo: ["comando", { arquivo, texto },
 *             { colega: { url, msg, autor, arquivos } }] } (o preparo roda antes da missão e não conta comandos)
 *   objetivos: os do MotorShell e mais repo, commits, mensagem, noCommit, foraDoCommit, naoRastreado, limpo,
 *             semPreparo, preparado, modificado, branch, semBranch, atual, naBranch, foraDaBranch, contemMensagem,
 *             juncao, semConflito, semMarcas, remoto, enviado, config (campos: caminho = repositório, arquivo, valor)
 *   solucao: { comandos: [...], resposta: {} }, metas: { comandos }
 */
const MotorGit = (() => {
  const AJUDA = [
    'Git: git init · git status [-s] · git add arquivo (ou .) · git commit -m "mensagem" · git log [--oneline] [-3] [--graph --all]',
    'git show [HEAD~1] · git diff [--staged] · git restore [--staged] arquivo · git branch [nome] [-d nome] · git switch [-c] nome',
    'git merge nome · git merge --abort · git revert HEAD · git remote add origin endereço · git push [-u origin main] · git pull · git clone endereço',
    'Terminal: pwd · ls -a · cd · cat · echo "texto" > arquivo · echo "texto" >> arquivo · nano arquivo · rm · limpar',
  ].join('\n');

  /* ---------- Utilidades ---------- */
  function hashDe(txt) {
    let h1 = 0x811c9dc5; let h2 = 0x9747b28c ^ txt.length;
    for (let i = 0; i < txt.length; i++) {
      const c = txt.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2 ^ c, 2246822519);
    }
    return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).slice(3, 10);
  }
  const linhasDe = (t) => (t == null || t === '' ? [] : String(t).replace(/\n$/, '').split('\n'));
  const juntar = (ls) => (ls.length ? `${ls.join('\n')}\n` : '');
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const iguais = (a, b) => { const ka = Object.keys(a); return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]); };
  const curinga = (padrao, txt) => new RegExp(`^${padrao.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`).test(txt);
  const MARCAS = /^(<<<<<<<|=======|>>>>>>>)/m;

  /* ---------- Estado ---------- */
  function estado(m) {
    const e = MotorShell.estado(m);
    const ini = m.inicio || {};
    e.ajuda = AJUDA;
    e.repos = {};
    e.objetos = {};
    e.servidor = {};
    e.nCommit = 0;
    e.gitConfig = ini.semConfig ? { nome: '', email: '' } : { nome: ini.nome || 'Bia', email: ini.email || 'bia@exemplo.com' };
    (ini.servidores || []).forEach((url) => { e.servidor[url] = { branches: {} }; });
    for (const passo of ini.preparo || []) {
      if (typeof passo === 'string') {
        const r = MotorShell.rodar(e, passo);
        if (r.erro) e.erroPreparo = `${passo}: ${r.erro}`;
      } else if (passo.colega) colega(e, passo.colega);
      else if (passo.arquivo) { const c = MotorShell.normal(passo.arquivo); const pasta = c.slice(0, c.lastIndexOf('/')) || '/'; garantirPasta(e, pasta); MotorShell.gravar(e, c, passo.texto); }
    }
    e.historico = []; e.saidas = []; e.usados = []; e.lidos = []; e.comandos = 0;
    return e;
  }
  /** Um colega envia um commit direto ao servidor (para o pull e o push recusado). */
  function colega(e, c) {
    const srv = e.servidor[c.url] || (e.servidor[c.url] = { branches: {} });
    const b = c.branch || 'main';
    const pai = srv.branches[b] || null;
    const arvore = { ...(pai ? e.objetos[pai].arvore : {}) };
    Object.entries(c.arquivos || {}).forEach(([k, v]) => { if (v === null) delete arvore[k]; else arvore[k] = v; });
    srv.branches[b] = novoCommit(e, { msg: c.msg, pais: pai ? [pai] : [], arvore, autor: c.autor || 'Caio', email: c.email || 'caio@exemplo.com' });
  }
  function novoCommit(e, { msg, pais, arvore, autor, email }) {
    const n = ++e.nCommit;
    let hash = hashDe(`${n}|${msg}|${pais.join(',')}|${JSON.stringify(arvore)}|${autor}`);
    while (e.objetos[hash]) hash = hashDe(`${hash}+`);
    e.objetos[hash] = { hash, msg, pais, arvore: { ...arvore }, autor, email, n };
    return hash;
  }

  /* ---------- Repositório e árvores ---------- */
  function repoDe(e, caminho) {
    let c = caminho;
    for (;;) {
      const r = e.repos[c];
      if (r && e.fs[`${c === '/' ? '' : c}/.git`]) return r;
      if (c === '/') return null;
      c = c.slice(0, c.lastIndexOf('/')) || '/';
    }
  }
  const tip = (repo) => repo.branches[repo.head] || null;
  const arvoreDe = (e, hash) => (hash ? e.objetos[hash].arvore : {});
  const absDe = (repo, rel) => `${repo.raiz === '/' ? '' : repo.raiz}/${rel}`;
  function trabalho(e, repo) {
    const pre = repo.raiz === '/' ? '/' : `${repo.raiz}/`;
    const w = {};
    Object.keys(e.fs).forEach((c) => {
      if (!c.startsWith(pre) || e.fs[c].tipo !== 'f') return;
      const rel = c.slice(pre.length);
      if (rel === '.git' || rel.startsWith('.git/')) return;
      if (Object.values(e.repos).some((r) => r !== repo && c.startsWith(`${r.raiz}/`) && r.raiz.startsWith(pre))) return;
      w[rel] = e.fs[c].conteudo;
    });
    return w;
  }
  function ignorado(e, repo, rel) {
    const gi = e.fs[absDe(repo, '.gitignore')];
    if (!gi || gi.tipo !== 'f') return false;
    const nome = rel.slice(rel.lastIndexOf('/') + 1);
    return linhasDe(gi.conteudo).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).some((p) => {
      if (p.endsWith('/')) { const d = p.slice(0, -1).replace(/^\//, ''); return rel.startsWith(`${d}/`) || rel.includes(`/${d}/`); }
      return curinga(p.replace(/^\//, ''), rel) || (!p.includes('/') && curinga(p, nome));
    });
  }
  function garantirPasta(e, c) {
    if (c === '/' || e.fs[c]) return;
    garantirPasta(e, c.slice(0, c.lastIndexOf('/')) || '/');
    e.fs[c] = { tipo: 'd', modo: '755' };
  }
  function escrever(e, repo, rel, conteudo) {
    const c = absDe(repo, rel);
    if (conteudo === undefined) { delete e.fs[c]; return; }
    garantirPasta(e, c.slice(0, c.lastIndexOf('/')) || '/');
    e.fs[c] = { tipo: 'f', conteudo, modo: e.fs[c] ? e.fs[c].modo : '644' };
  }
  function ancestrais(e, hash) {
    const vistos = new Set(); const fila = hash ? [hash] : [];
    while (fila.length) { const h = fila.pop(); if (vistos.has(h)) continue; vistos.add(h); fila.push(...e.objetos[h].pais); }
    return vistos;
  }
  function base(e, a, b) {
    const A = ancestrais(e, a); let melhor = null;
    ancestrais(e, b).forEach((h) => { if (A.has(h) && (!melhor || e.objetos[h].n > e.objetos[melhor].n)) melhor = h; });
    return melhor;
  }
  function resolverRef(e, repo, ref) {
    if (!ref || ref === 'HEAD' || ref === '@') return tip(repo);
    const m = /^(.+?)(?:~(\d*)|(\^+))$/.exec(ref);
    if (m) {
      let h = resolverRef(e, repo, m[1]);
      const passos = m[3] ? m[3].length : Number(m[2] || 1);
      for (let i = 0; i < passos && h; i++) h = e.objetos[h].pais[0] || null;
      return h;
    }
    if (repo.branches[ref] !== undefined) return repo.branches[ref];
    if (repo.rastreio[ref] !== undefined) return repo.rastreio[ref];
    if (/^[0-9a-f]{4,}$/.test(ref)) {
      const achados = [...ancestrais(e, null)].concat(Object.keys(e.objetos)).filter((h) => h.startsWith(ref));
      const unicos = [...new Set(achados)];
      if (unicos.length === 1) return unicos[0];
    }
    return undefined;
  }

  /* ---------- Situação (o que o git status mostra) ---------- */
  function situacao(e, repo) {
    const H = arvoreDe(e, tip(repo)); const I = repo.index; const W = trabalho(e, repo);
    const pend = repo.merge ? repo.merge.pendentes : [];
    const preparados = []; const modificados = []; const novos = []; const ignorados = [];
    [...new Set([...Object.keys(H), ...Object.keys(I)])].sort().forEach((f) => {
      if (pend.includes(f) || H[f] === I[f]) return;
      preparados.push({ arquivo: f, tipo: H[f] === undefined ? 'new file' : I[f] === undefined ? 'deleted' : 'modified' });
    });
    Object.keys(I).sort().forEach((f) => {
      if (pend.includes(f)) return;
      if (W[f] === undefined) modificados.push({ arquivo: f, tipo: 'deleted' });
      else if (W[f] !== I[f]) modificados.push({ arquivo: f, tipo: 'modified' });
    });
    Object.keys(W).sort().forEach((f) => {
      if (I[f] !== undefined || pend.includes(f)) return;
      (ignorado(e, repo, f) ? ignorados : novos).push(f);
    });
    return { preparados, modificados, novos, ignorados, conflitos: [...pend], limpo: !preparados.length && !modificados.length && !novos.length && !pend.length };
  }

  /* ---------- Diferença linha a linha ---------- */
  function difLinhas(a, b) {
    const n = a.length; const m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0; let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push([' ', a[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(['-', a[i++]]); else out.push(['+', b[j++]]);
    }
    while (i < n) out.push(['-', a[i++]]);
    while (j < m) out.push(['+', b[j++]]);
    return out;
  }
  function textoDiff(antes, depois) {
    const nomes = [...new Set([...Object.keys(antes), ...Object.keys(depois)])].sort().filter((f) => antes[f] !== depois[f]);
    const out = [];
    nomes.forEach((f) => {
      out.push(`diff --git a/${f} b/${f}`);
      if (antes[f] === undefined) out.push('new file', '--- /dev/null', `+++ b/${f}`);
      else if (depois[f] === undefined) out.push('deleted file', `--- a/${f}`, '+++ /dev/null');
      else out.push(`--- a/${f}`, `+++ b/${f}`);
      const d = difLinhas(linhasDe(antes[f]), linhasDe(depois[f]));
      const perto = d.map((_, k) => d.slice(Math.max(0, k - 2), k + 3).some((x) => x[0] !== ' '));
      d.forEach((x, k) => { if (perto[k]) out.push(`${x[0]}${x[1]}`); });
    });
    return { texto: juntar(out), arquivos: nomes };
  }

  /* ---------- Merge de três vias, linha a linha ---------- */
  function juntarArquivo(b, o, t, nomeOutro) {
    if (o === t) return { texto: o };
    if (b === o) return { texto: t };
    if (b === t) return { texto: o };
    const bl = linhasDe(b); const ol = linhasDe(o); const tl = linhasDe(t);
    const bloco = (x, y) => [`<<<<<<< HEAD`, ...x, '=======', ...y, `>>>>>>> ${nomeOutro}`];
    if (o === undefined || t === undefined || ol.length !== tl.length || (b !== undefined && bl.length !== ol.length)) {
      return { texto: juntar(bloco(ol, tl)), conflito: true };
    }
    const out = []; let conflito = false; let i = 0;
    while (i < ol.length) {
      const bi = b === undefined ? undefined : bl[i];
      if (ol[i] === tl[i]) out.push(ol[i]);
      else if (bi === ol[i]) out.push(tl[i]);
      else if (bi === tl[i]) out.push(ol[i]);
      else {
        let k = i; const x = []; const y = [];
        while (k < ol.length && ol[k] !== tl[k] && (b === undefined || (bl[k] !== ol[k] && bl[k] !== tl[k]))) { x.push(ol[k]); y.push(tl[k]); k++; }
        out.push(...bloco(x, y)); conflito = true; i = k; continue;
      }
      i++;
    }
    return { texto: juntar(out), conflito };
  }

  /* ---------- O comando git ---------- */
  const SAIDA = (texto) => ({ texto });
  const ERRO = (erro) => ({ erro });
  const FORA = 'fatal: not a git repository (or any of the parent directories): .git';

  function git(e, args) {
    const sub = args[0];
    const a = args.slice(1);
    if (!sub || sub === 'help' || sub === '--help') return SAIDA(`${AJUDA}\n`);
    const marca = (x) => { if (!e.usados.includes(x)) e.usados.push(x); };
    marca(`git ${sub}`);
    a.filter((x) => x.startsWith('-')).forEach((x) => marca(`git ${sub} ${x}`));
    if (sub === 'init') return init(e);
    if (sub === 'config') return config(e, a);
    if (sub === 'clone') return clone(e, a);
    if (sub === '--version' || sub === 'version') return SAIDA('git version 2.x (laboratório Diver)\n');
    const repo = repoDe(e, e.cwd);
    if (!repo) return ERRO(FORA);
    const cmds = { status, add, commit, log, show, diff, restore, branch, switch: trocar, checkout, merge, revert, remote, push, pull, fetch, rm: gitRm };
    if (!cmds[sub]) return ERRO(`git: '${sub}' is not a git command. See 'git help'.`);
    return cmds[sub](e, repo, a);
  }

  function init(e) {
    const raiz = e.cwd;
    const ja = repoDe(e, raiz);
    if (ja && ja.raiz === raiz) return SAIDA(`Reinitialized existing Git repository in ${raiz === '/' ? '' : raiz}/.git/\n`);
    e.repos[raiz] = { raiz, branches: { main: null }, head: 'main', index: {}, merge: null, remotos: {}, upstream: {}, rastreio: {} };
    e.fs[`${raiz === '/' ? '' : raiz}/.git`] = { tipo: 'd', modo: '755' };
    return SAIDA(`Initialized empty Git repository in ${raiz === '/' ? '' : raiz}/.git/\n`);
  }

  function config(e, a) {
    const r = a.filter((x) => x !== '--global');
    if (r[0] === '--list' || r[0] === '-l') return SAIDA(`user.name=${e.gitConfig.nome}\nuser.email=${e.gitConfig.email}\n`);
    const campo = { 'user.name': 'nome', 'user.email': 'email' }[r[0]];
    if (!campo) return ERRO('Neste laboratório: git config --global user.name "Seu Nome" ou user.email "voce@exemplo.com"');
    if (r.length < 2) return e.gitConfig[campo] ? SAIDA(`${e.gitConfig[campo]}\n`) : ERRO('');
    e.gitConfig[campo] = r.slice(1).join(' ');
    return SAIDA('');
  }

  function status(e, repo, a) {
    const s = situacao(e, repo);
    if (a.includes('-s') || a.includes('--short')) {
      const linhas = [];
      const cod = (f) => { const p = s.preparados.find((x) => x.arquivo === f); const m = s.modificados.find((x) => x.arquivo === f); const c = (x) => (!x ? ' ' : x.tipo === 'new file' ? 'A' : x.tipo === 'deleted' ? 'D' : 'M'); return `${c(p)}${c(m)}`; };
      s.conflitos.forEach((f) => linhas.push(`UU ${f}`));
      [...new Set([...s.preparados, ...s.modificados].map((x) => x.arquivo))].sort().forEach((f) => linhas.push(`${cod(f)} ${f}`));
      s.novos.forEach((f) => linhas.push(`?? ${f}`));
      return SAIDA(juntar(linhas));
    }
    const out = [`On branch ${repo.head}`];
    const h = tip(repo);
    if (!h) out.push('', 'No commits yet');
    const up = repo.upstream[repo.head];
    if (up && h) {
      const r = repo.rastreio[`${up.remoto}/${up.branch}`];
      const A = ancestrais(e, h); const R = ancestrais(e, r);
      const frente = [...A].filter((x) => !R.has(x)).length; const atras = [...R].filter((x) => !A.has(x)).length;
      const nome = `'${up.remoto}/${up.branch}'`;
      if (!frente && !atras) out.push(`Your branch is up to date with ${nome}.`);
      else if (frente && !atras) out.push(`Your branch is ahead of ${nome} by ${plural(frente, 'commit', 'commits')}.`, '  (use "git push" to publish your local commits)');
      else if (atras && !frente) out.push(`Your branch is behind ${nome} by ${plural(atras, 'commit', 'commits')}.`, '  (use "git pull" to update your local branch)');
      else out.push(`Your branch and ${nome} have diverged.`);
    }
    if (repo.merge) out.push('', 'You have unmerged paths.', '  (fix conflicts and run "git commit")', '  (use "git merge --abort" to abort the merge)');
    if (s.preparados.length) { out.push('', 'Changes to be committed:'); s.preparados.forEach((x) => out.push(`\t${`${x.tipo}:`.padEnd(12)}${x.arquivo}`)); }
    if (s.conflitos.length) { out.push('', 'Unmerged paths:', '  (use "git add <file>..." to mark resolution)'); s.conflitos.forEach((f) => out.push(`\tboth modified:   ${f}`)); }
    if (s.modificados.length) { out.push('', 'Changes not staged for commit:'); s.modificados.forEach((x) => out.push(`\t${`${x.tipo}:`.padEnd(12)}${x.arquivo}`)); }
    if (s.novos.length) { out.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)'); s.novos.forEach((f) => out.push(`\t${f}`)); }
    if (s.limpo && !repo.merge) out.push('', h ? 'nothing to commit, working tree clean' : 'nothing to commit (create/copy files and use "git add" to track)');
    else if (!s.preparados.length && !repo.merge) out.push('', s.modificados.length ? 'no changes added to commit (use "git add")' : 'nothing added to commit but untracked files present (use "git add" to track)');
    return SAIDA(juntar(out));
  }

  /** Arquivos (relativos ao repositório) que um caminho do terminal indica. */
  function alvos(e, repo, arg, universo) {
    const pre = repo.raiz === '/' ? '' : repo.raiz;
    const abs = MotorShell.normal(arg.startsWith('/') ? arg : `${e.cwd}/${arg}`);
    const rel = abs === repo.raiz ? '' : abs.startsWith(`${pre}/`) ? abs.slice(pre.length + 1) : null;
    if (rel === null) return null;
    if (/[*?]/.test(arg)) return universo.filter((f) => curinga(rel, f) || curinga(rel, f.slice(f.lastIndexOf('/') + 1)));
    if (rel === '') return universo;
    return universo.filter((f) => f === rel || f.startsWith(`${rel}/`));
  }

  function add(e, repo, a) {
    const caminhos = a.filter((x) => !x.startsWith('-'));
    if (a.includes('-A') || a.includes('--all')) caminhos.push(repo.raiz);
    if (!caminhos.length) return ERRO('Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?');
    const W = trabalho(e, repo); const I = repo.index;
    const universo = [...new Set([...Object.keys(W), ...Object.keys(I), ...(repo.merge ? repo.merge.pendentes : [])])].sort();
    for (const c of caminhos) {
      const lista = alvos(e, repo, c, universo);
      if (lista === null) return ERRO(`fatal: ${c}: '${c}' is outside repository`);
      const explicito = !/[*?]/.test(c) && lista.length === 1 && lista[0] === MotorShell.normal(`${e.cwd}/${c}`).slice(repo.raiz.length + 1);
      if (!lista.length) return ERRO(`fatal: pathspec '${c}' did not match any files`);
      if (explicito && I[lista[0]] === undefined && ignorado(e, repo, lista[0])) return ERRO(`The following paths are ignored by one of your .gitignore files:\n${lista[0]}\nhint: Use -f if you really want to add them.`);
      lista.forEach((f) => {
        if (I[f] === undefined && ignorado(e, repo, f)) return;
        if (W[f] === undefined) delete I[f]; else I[f] = W[f];
        if (repo.merge) repo.merge.pendentes = repo.merge.pendentes.filter((x) => x !== f);
      });
    }
    return SAIDA('');
  }

  function gitRm(e, repo, a) {
    const cached = a.includes('--cached');
    const caminhos = a.filter((x) => !x.startsWith('-'));
    if (!caminhos.length) return ERRO('usage: git rm [--cached] <file>');
    for (const c of caminhos) {
      const lista = alvos(e, repo, c, Object.keys(repo.index));
      if (!lista || !lista.length) return ERRO(`fatal: pathspec '${c}' did not match any files`);
      lista.forEach((f) => { delete repo.index[f]; if (!cached) escrever(e, repo, f, undefined); });
    }
    return SAIDA(juntar(caminhos.map((c) => `rm '${c}'`)));
  }

  function opcaoM(a) {
    const i = a.findIndex((x) => x === '-m' || x === '-am' || x === '--message');
    return i >= 0 ? a[i + 1] : undefined;
  }

  function commit(e, repo, a) {
    if (!e.gitConfig.nome || !e.gitConfig.email) return ERRO('Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"');
    if (repo.merge && repo.merge.pendentes.length) return ERRO('error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add <file>\'\nhint: as appropriate to mark resolution and make a commit.');
    const msg = opcaoM(a);
    if (msg === undefined) return ERRO('Use git commit -m "mensagem" (neste laboratório, o editor de mensagem não abre).');
    if (!String(msg).trim()) return ERRO('Aborting commit due to empty commit message.');
    if (a.includes('-a') || a.includes('-am')) {
      const W = trabalho(e, repo);
      Object.keys(repo.index).forEach((f) => { if (W[f] === undefined) delete repo.index[f]; else repo.index[f] = W[f]; });
    }
    const h = tip(repo);
    if (a.includes('--amend')) {
      if (!h) return ERRO('fatal: You have nothing to amend.');
      const velho = e.objetos[h];
      const novo = novoCommit(e, { msg, pais: velho.pais, arvore: repo.index, autor: e.gitConfig.nome, email: e.gitConfig.email });
      repo.branches[repo.head] = novo;
      return SAIDA(`[${repo.head} ${novo}] ${msg}\n`);
    }
    const H = arvoreDe(e, h);
    if (!repo.merge && iguais(H, repo.index)) {
      const s = situacao(e, repo);
      return ERRO(s.modificados.length ? 'no changes added to commit (use "git add" and/or "git commit -a")' : s.novos.length ? 'nothing added to commit but untracked files present (use "git add" to track)' : 'nothing to commit, working tree clean');
    }
    const pais = (h ? [h] : []).concat(repo.merge ? [repo.merge.outro] : []);
    const mudados = Object.keys({ ...H, ...repo.index }).filter((f) => H[f] !== repo.index[f]).length;
    const novo = novoCommit(e, { msg, pais, arvore: repo.index, autor: e.gitConfig.nome, email: e.gitConfig.email });
    repo.branches[repo.head] = novo;
    repo.merge = null;
    return SAIDA(`[${repo.head}${h ? '' : ' (root-commit)'} ${novo}] ${msg}\n ${plural(mudados, 'file changed', 'files changed')}\n`);
  }

  function rotulos(e, repo, hash) {
    const r = [];
    Object.entries(repo.branches).forEach(([b, x]) => { if (x === hash) r.push(b === repo.head ? `HEAD -> ${b}` : b); });
    Object.entries(repo.rastreio).forEach(([b, x]) => { if (x === hash) r.push(b); });
    r.sort((x, y) => (x.startsWith('HEAD') ? -1 : y.startsWith('HEAD') ? 1 : 0));
    return r;
  }
  function lista(e, repo, todos) {
    const pontas = todos ? [...Object.values(repo.branches), ...Object.values(repo.rastreio)] : [tip(repo)];
    const set = new Set();
    pontas.filter(Boolean).forEach((p) => ancestrais(e, p).forEach((h) => set.add(h)));
    return [...set].map((h) => e.objetos[h]).sort((x, y) => y.n - x.n);
  }

  function log(e, repo, a) {
    if (!tip(repo) && !a.includes('--all')) return ERRO(`fatal: your current branch '${repo.head}' does not have any commits yet`);
    let max = Infinity;
    a.forEach((x, i) => { if (/^-\d+$/.test(x)) max = Number(x.slice(1)); if (x === '-n') max = Number(a[i + 1]); });
    const curto = a.includes('--oneline');
    const grafo = a.includes('--graph');
    const out = [];
    lista(e, repo, a.includes('--all')).slice(0, max).forEach((c) => {
      const rot = rotulos(e, repo, c.hash);
      const deco = rot.length ? ` (${rot.join(', ')})` : '';
      const g = grafo ? (c.pais.length > 1 ? '*   ' : '* ') : '';
      if (curto) out.push(`${g}${c.hash}${deco} ${c.msg}`);
      else {
        out.push(`${g}commit ${c.hash}${deco}`);
        if (c.pais.length > 1) out.push(`Merge: ${c.pais.join(' ')}`);
        out.push(`Author: ${c.autor} <${c.email}>`, '', `    ${c.msg}`, '');
      }
    });
    return SAIDA(juntar(out));
  }

  function show(e, repo, a) {
    const ref = a.find((x) => !x.startsWith('-')) || 'HEAD';
    const h = resolverRef(e, repo, ref);
    if (!h) return ERRO(`fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`);
    const c = e.objetos[h];
    const deco = rotulos(e, repo, h);
    const cab = [`commit ${h}${deco.length ? ` (${deco.join(', ')})` : ''}`, ...(c.pais.length > 1 ? [`Merge: ${c.pais.join(' ')}`] : []), `Author: ${c.autor} <${c.email}>`, '', `    ${c.msg}`, ''];
    const d = c.pais.length > 1 ? { texto: '' } : textoDiff(arvoreDe(e, c.pais[0]), c.arvore);
    return SAIDA(juntar(cab) + d.texto);
  }

  function diff(e, repo, a) {
    const staged = a.includes('--staged') || a.includes('--cached');
    const comHead = a.includes('HEAD');
    const W = trabalho(e, repo);
    const Wrastreado = {};
    Object.keys(W).forEach((f) => { if (repo.index[f] !== undefined || arvoreDe(e, tip(repo))[f] !== undefined) Wrastreado[f] = W[f]; });
    if (staged) return SAIDA(textoDiff(arvoreDe(e, tip(repo)), repo.index).texto);
    if (comHead) return SAIDA(textoDiff(arvoreDe(e, tip(repo)), Wrastreado).texto);
    const I = {};
    Object.keys(repo.index).forEach((f) => { I[f] = repo.index[f]; });
    const Wi = {};
    Object.keys(I).forEach((f) => { if (W[f] !== undefined) Wi[f] = W[f]; });
    return SAIDA(textoDiff(I, Wi).texto);
  }

  function restore(e, repo, a) {
    const staged = a.includes('--staged') || a.includes('-S');
    const caminhos = a.filter((x) => !x.startsWith('-'));
    if (!caminhos.length) return ERRO('fatal: you must specify path(s) to restore');
    const H = arvoreDe(e, tip(repo));
    const universo = [...new Set([...Object.keys(repo.index), ...Object.keys(H), ...Object.keys(trabalho(e, repo))])].sort();
    for (const c of caminhos) {
      const lista = (alvos(e, repo, c, universo) || []).filter((f) => (staged ? repo.index[f] !== undefined || H[f] !== undefined : repo.index[f] !== undefined));
      if (!lista.length) return ERRO(`error: pathspec '${c}' did not match any file(s) known to git`);
      lista.forEach((f) => {
        if (staged) { if (H[f] === undefined) delete repo.index[f]; else repo.index[f] = H[f]; } else escrever(e, repo, f, repo.index[f]);
      });
    }
    return SAIDA('');
  }

  function branch(e, repo, a) {
    const del = a.find((x) => x === '-d' || x === '-D');
    const nomes = a.filter((x) => !x.startsWith('-'));
    if (del) {
      const n = nomes[0];
      if (!n) return ERRO('fatal: branch name required');
      if (repo.branches[n] === undefined) return ERRO(`error: branch '${n}' not found.`);
      if (n === repo.head) return ERRO(`error: Cannot delete branch '${n}' checked out at '${repo.raiz}'`);
      if (del === '-d' && !ancestrais(e, tip(repo)).has(repo.branches[n])) return ERRO(`error: The branch '${n}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${n}'.`);
      const era = repo.branches[n];
      delete repo.branches[n];
      return SAIDA(`Deleted branch ${n} (was ${era}).\n`);
    }
    if (!nomes.length) return SAIDA(juntar(Object.keys(repo.branches).sort().map((b) => `${b === repo.head ? '*' : ' '} ${b}`)));
    const n = nomes[0];
    if (!/^[A-Za-z0-9._/-]+$/.test(n)) return ERRO(`fatal: '${n}' is not a valid branch name`);
    if (repo.branches[n] !== undefined) return ERRO(`fatal: a branch named '${n}' already exists`);
    if (!tip(repo)) return ERRO(`fatal: not a valid object name: '${repo.head}'`);
    repo.branches[n] = tip(repo);
    return SAIDA('');
  }

  function irPara(e, repo, nome, criar) {
    if (repo.merge) return ERRO('error: you need to resolve your current index first');
    if (criar) {
      if (repo.branches[nome] !== undefined) return ERRO(`fatal: a branch named '${nome}' already exists`);
      if (!/^[A-Za-z0-9._/-]+$/.test(nome)) return ERRO(`fatal: '${nome}' is not a valid branch name`);
      if (!tip(repo)) { repo.branches[nome] = null; delete repo.branches[repo.head]; repo.head = nome; return SAIDA(`Switched to a new branch '${nome}'\n`); }
      repo.branches[nome] = tip(repo); repo.head = nome;
      return SAIDA(`Switched to a new branch '${nome}'\n`);
    }
    if (repo.branches[nome] === undefined) {
      const rt = repo.rastreio[`origin/${nome}`];
      if (rt === undefined) return ERRO(`fatal: invalid reference: ${nome}`);
      repo.branches[nome] = rt; repo.upstream[nome] = { remoto: 'origin', branch: nome };
    }
    if (nome === repo.head) return SAIDA(`Already on '${nome}'\n`);
    const velha = arvoreDe(e, tip(repo)); const nova = arvoreDe(e, repo.branches[nome]);
    const s = situacao(e, repo);
    const sujos = [...new Set([...s.preparados, ...s.modificados].map((x) => x.arquivo))];
    const bate = sujos.filter((f) => velha[f] !== nova[f]);
    if (bate.length) return ERRO(`error: Your local changes to the following files would be overwritten by checkout:\n\t${bate.join('\n\t')}\nPlease commit your changes or stash them before you switch branches.\nAborting`);
    const pisa = s.novos.filter((f) => nova[f] !== undefined);
    if (pisa.length) return ERRO(`error: The following untracked working tree files would be overwritten by checkout:\n\t${pisa.join('\n\t')}\nPlease move or remove them before you switch branches.\nAborting`);
    const W = trabalho(e, repo);
    [...new Set([...Object.keys(velha), ...Object.keys(nova)])].forEach((f) => {
      if (sujos.includes(f)) return;
      if (W[f] !== undefined && velha[f] === undefined) return;
      escrever(e, repo, f, nova[f]);
      if (nova[f] === undefined) delete repo.index[f]; else repo.index[f] = nova[f];
    });
    repo.head = nome;
    return SAIDA(`Switched to branch '${nome}'\n`);
  }
  function trocar(e, repo, a) {
    const criar = a.some((x) => x === '-c' || x === '--create' || x === '-C');
    const nome = a.find((x) => !x.startsWith('-'));
    if (!nome) return ERRO('fatal: missing branch or commit argument');
    return irPara(e, repo, nome, criar);
  }
  function checkout(e, repo, a) {
    const i = a.indexOf('--');
    if (i >= 0) return restore(e, repo, a.slice(i + 1));
    const criar = a.includes('-b');
    const nome = a.find((x) => !x.startsWith('-'));
    if (!nome) return ERRO('fatal: missing branch or commit argument');
    if (!criar && repo.branches[nome] === undefined && repo.index[nome] !== undefined) return restore(e, repo, [nome]);
    return irPara(e, repo, nome, criar);
  }

  /** Junta o commit `outro` (com o nome mostrado nas marcas) no branch atual. */
  function juntarCommit(e, repo, outro, nome, mensagem) {
    const h = tip(repo);
    if (h && ancestrais(e, h).has(outro)) return SAIDA('Already up to date.\n');
    const s = situacao(e, repo);
    if (s.preparados.length || s.modificados.length) return ERRO(`error: Your local changes to the following files would be overwritten by merge:\n\t${[...new Set([...s.preparados, ...s.modificados].map((x) => x.arquivo))].join('\n\t')}\nPlease commit your changes or stash them before you merge.\nAborting`);
    const velha = arvoreDe(e, h); const nova = arvoreDe(e, outro);
    if (!h || ancestrais(e, outro).has(h)) {
      [...new Set([...Object.keys(velha), ...Object.keys(nova)])].forEach((f) => { escrever(e, repo, f, nova[f]); });
      repo.index = { ...nova };
      repo.branches[repo.head] = outro;
      const d = textoDiff(velha, nova);
      return SAIDA(`Updating ${h || '0000000'}..${outro}\nFast-forward\n${juntar(d.arquivos.map((f) => ` ${f}`))} ${plural(d.arquivos.length, 'file changed', 'files changed')}\n`);
    }
    const bh = base(e, h, outro); const B = arvoreDe(e, bh);
    const res = {}; const pendentes = []; const avisos = [];
    [...new Set([...Object.keys(B), ...Object.keys(velha), ...Object.keys(nova)])].sort().forEach((f) => {
      const r = juntarArquivo(B[f], velha[f], nova[f], nome);
      if (r.conflito) { pendentes.push(f); avisos.push(`Auto-merging ${f}`, `CONFLICT (content): Merge conflict in ${f}`); }
      res[f] = r.texto;
    });
    Object.keys(res).forEach((f) => { escrever(e, repo, f, res[f]); });
    if (pendentes.length) {
      const idx = {};
      Object.keys(res).forEach((f) => { if (res[f] !== undefined) idx[f] = pendentes.includes(f) ? velha[f] : res[f]; });
      Object.keys(idx).forEach((f) => { if (idx[f] === undefined) delete idx[f]; });
      repo.index = idx;
      repo.merge = { outro, nome, pendentes, antes: velha };
      return SAIDA(juntar([...avisos, 'Automatic merge failed; fix conflicts and then commit the result.']));
    }
    const arvore = {};
    Object.keys(res).forEach((f) => { if (res[f] !== undefined) arvore[f] = res[f]; });
    repo.index = { ...arvore };
    const novo = novoCommit(e, { msg: mensagem || `Merge branch '${nome}'`, pais: [h, outro], arvore, autor: e.gitConfig.nome || 'Bia', email: e.gitConfig.email || 'bia@exemplo.com' });
    repo.branches[repo.head] = novo;
    return SAIDA("Merge made by the 'ort' strategy.\n");
  }
  function merge(e, repo, a) {
    if (a.includes('--abort')) {
      if (!repo.merge) return ERRO('fatal: There is no merge to abort (MERGE_HEAD missing).');
      const antes = repo.merge.antes; const W = trabalho(e, repo);
      [...new Set([...Object.keys(W), ...Object.keys(antes)])].forEach((f) => { if (antes[f] !== undefined || repo.index[f] !== undefined) escrever(e, repo, f, antes[f]); });
      repo.index = { ...antes };
      repo.merge = null;
      return SAIDA('');
    }
    if (repo.merge) return ERRO('error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add <file>\'\nhint: as appropriate to mark resolution and make a commit.');
    const nome = a.find((x) => !x.startsWith('-'));
    if (!nome) return ERRO('fatal: No remote for the current branch.');
    const outro = resolverRef(e, repo, nome);
    if (!outro) return ERRO(`merge: ${nome} - not something we can merge`);
    return juntarCommit(e, repo, outro, nome);
  }

  function revert(e, repo, a) {
    const ref = a.find((x) => !x.startsWith('-'));
    if (!ref) return ERRO('usage: git revert <commit>');
    const h = resolverRef(e, repo, ref);
    if (!h) return ERRO(`fatal: bad revision '${ref}'`);
    const c = e.objetos[h];
    if (c.pais.length > 1) return ERRO(`error: commit ${h} is a merge but no -m option was given.`);
    const s = situacao(e, repo);
    if (s.preparados.length || s.modificados.length) return ERRO('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.');
    const P = arvoreDe(e, c.pais[0]); const H = arvoreDe(e, tip(repo));
    const mudados = [...new Set([...Object.keys(P), ...Object.keys(c.arvore)])].filter((f) => P[f] !== c.arvore[f]);
    const nova = { ...H };
    for (const f of mudados) {
      if (H[f] !== c.arvore[f]) return ERRO(`error: could not revert ${h}... ${c.msg}\nhint: o arquivo ${f} mudou depois desse commit; neste laboratório, o revert só desfaz o que não foi mexido depois.`);
      if (P[f] === undefined) delete nova[f]; else nova[f] = P[f];
    }
    mudados.forEach((f) => escrever(e, repo, f, nova[f]));
    repo.index = { ...nova };
    const msg = `Revert "${c.msg}"`;
    const novo = novoCommit(e, { msg, pais: [tip(repo)], arvore: nova, autor: e.gitConfig.nome || 'Bia', email: e.gitConfig.email || 'bia@exemplo.com' });
    repo.branches[repo.head] = novo;
    return SAIDA(`[${repo.head} ${novo}] ${msg}\n ${plural(mudados.length, 'file changed', 'files changed')}\n`);
  }

  function remote(e, repo, a) {
    if (a[0] === 'add') {
      const [, nome, url] = a;
      if (!nome || !url) return ERRO('usage: git remote add <name> <url>');
      if (repo.remotos[nome]) return ERRO(`error: remote ${nome} already exists.`);
      repo.remotos[nome] = url;
      return SAIDA('');
    }
    if (a[0] === 'remove' || a[0] === 'rm') { delete repo.remotos[a[1]]; return SAIDA(''); }
    if (a.includes('-v')) return SAIDA(juntar(Object.entries(repo.remotos).flatMap(([n, u]) => [`${n}\t${u} (fetch)`, `${n}\t${u} (push)`])));
    return SAIDA(juntar(Object.keys(repo.remotos)));
  }
  function alvoRemoto(repo, a) {
    const pos = a.filter((x) => !x.startsWith('-'));
    const up = repo.upstream[repo.head];
    return { nome: pos[0] || (up ? up.remoto : null), branch: pos[1] || (up ? up.branch : repo.head), explicito: !!pos[0] };
  }
  function push(e, repo, a) {
    const { nome, branch: b, explicito } = alvoRemoto(repo, a);
    const u = a.includes('-u') || a.includes('--set-upstream');
    if (!nome && !Object.keys(repo.remotos).length) return ERRO("fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>");
    if (!nome || (!explicito && !repo.upstream[repo.head])) return ERRO(`fatal: The current branch ${repo.head} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${repo.head}`);
    const url = repo.remotos[nome];
    if (!url) return ERRO(`fatal: '${nome}' does not appear to be a git repository`);
    const srv = e.servidor[url];
    if (!srv) return ERRO(`remote: Repository not found.\nfatal: repository '${url}' not found`);
    const local = repo.branches[b];
    if (!local) return ERRO(`error: src refspec ${b} does not match any\nerror: failed to push some refs to '${url}'`);
    const remoto = srv.branches[b] || null;
    const extra = u ? `branch '${b}' set up to track '${nome}/${b}'.\n` : '';
    if (u) repo.upstream[b] = { remoto: nome, branch: b };
    if (remoto === local) { repo.rastreio[`${nome}/${b}`] = local; return SAIDA(`Everything up-to-date\n${extra}`); }
    if (remoto && !ancestrais(e, local).has(remoto)) {
      return ERRO(`To ${url}\n ! [rejected]        ${b} -> ${b} (fetch first)\nerror: failed to push some refs to '${url}'\nhint: Updates were rejected because the remote contains work that you do not\nhint: have locally. Integrate the remote changes (e.g. 'git pull ...')\nhint: before pushing again.`);
    }
    srv.branches[b] = local;
    repo.rastreio[`${nome}/${b}`] = local;
    return SAIDA(`To ${url}\n ${remoto ? `  ${remoto}..${local}` : '* [new branch]     '} ${b} -> ${b}\n${extra}`);
  }
  function buscar(e, repo, nome) {
    const url = repo.remotos[nome];
    if (!url) return { erro: `fatal: '${nome}' does not appear to be a git repository` };
    const srv = e.servidor[url];
    if (!srv) return { erro: `fatal: repository '${url}' not found` };
    Object.entries(srv.branches).forEach(([b, h]) => { if (h) repo.rastreio[`${nome}/${b}`] = h; });
    return { url };
  }
  function fetch(e, repo, a) {
    const nome = a.find((x) => !x.startsWith('-')) || 'origin';
    const r = buscar(e, repo, nome);
    return r.erro ? ERRO(r.erro) : SAIDA(`From ${r.url}\n`);
  }
  function pull(e, repo, a) {
    const { nome, branch: b, explicito } = alvoRemoto(repo, a);
    if (!nome || (!explicito && !repo.upstream[repo.head])) return ERRO(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull origin ${repo.head}`);
    const r = buscar(e, repo, nome);
    if (r.erro) return ERRO(r.erro);
    const outro = repo.rastreio[`${nome}/${b}`];
    if (!outro) return ERRO(`fatal: couldn't find remote ref ${b}`);
    const j = juntarCommit(e, repo, outro, `${nome}/${b}`, `Merge branch '${b}' of ${r.url}`);
    return j.erro ? j : SAIDA(`From ${r.url}\n * branch            ${b}       -> FETCH_HEAD\n${j.texto}`);
  }

  function clone(e, a) {
    const pos = a.filter((x) => !x.startsWith('-'));
    const url = pos[0];
    if (!url) return ERRO('usage: git clone <repository> [<directory>]');
    const srv = e.servidor[url];
    if (!srv) return ERRO(`Cloning into '${(pos[1] || url.slice(url.lastIndexOf('/') + 1)).replace(/\.git$/, '')}'...\nremote: Repository not found.\nfatal: repository '${url}' not found`);
    const pasta = (pos[1] || url.slice(url.lastIndexOf('/') + 1)).replace(/\.git$/, '');
    const raiz = MotorShell.normal(`${e.cwd}/${pasta}`);
    if (e.fs[raiz]) return ERRO(`fatal: destination path '${pasta}' already exists and is not an empty directory.`);
    garantirPasta(e, raiz);
    e.fs[`${raiz}/.git`] = { tipo: 'd', modo: '755' };
    const h = srv.branches.main || null;
    const repo = { raiz, branches: { main: h }, head: 'main', index: { ...arvoreDe(e, h) }, merge: null, remotos: { origin: url }, upstream: { main: { remoto: 'origin', branch: 'main' } }, rastreio: {} };
    e.repos[raiz] = repo;
    Object.entries(srv.branches).forEach(([b, x]) => { if (x) repo.rastreio[`origin/${b}`] = x; });
    Object.entries(repo.index).forEach(([f, t]) => escrever(e, repo, f, t));
    return SAIDA(`Cloning into '${pasta}'...\ndone.\n`);
  }

  MotorShell.plugin('git', git);

  /* ---------- Para a tela: as três áreas, o grafo e o servidor ---------- */
  function areas(e, repo) {
    if (!repo) return null;
    const s = situacao(e, repo); const W = trabalho(e, repo); const H = arvoreDe(e, tip(repo));
    const trabalhoLista = Object.keys(W).sort().map((f) => ({
      arquivo: f,
      estado: s.conflitos.includes(f) ? 'conflito' : s.novos.includes(f) ? 'novo' : s.ignorados.includes(f) ? 'ignorado' : s.modificados.some((x) => x.arquivo === f) ? 'modificado' : 'igual',
    }));
    s.modificados.filter((x) => x.tipo === 'deleted').forEach((x) => trabalhoLista.push({ arquivo: x.arquivo, estado: 'apagado' }));
    const h = tip(repo);
    return {
      raiz: repo.raiz,
      branch: repo.head,
      trabalho: trabalhoLista,
      preparo: s.preparados.map((x) => ({ arquivo: x.arquivo, estado: x.tipo === 'new file' ? 'novo' : x.tipo === 'deleted' ? 'apagado' : 'modificado' })),
      repositorio: { hash: h, msg: h ? e.objetos[h].msg : '', arquivos: Object.keys(H).sort(), total: h ? ancestrais(e, h).size : 0 },
      merge: repo.merge ? { nome: repo.merge.nome, pendentes: [...repo.merge.pendentes] } : null,
    };
  }
  function grafo(e, repo) {
    if (!repo) return { linhas: [], faixas: 0 };
    const commits = lista(e, repo, true);
    const ordem = [repo.branches.main !== undefined ? 'main' : repo.head, ...Object.keys(repo.branches).filter((b) => b !== 'main')]
      .filter((b, i, arr) => arr.indexOf(b) === i);
    const faixa = {};
    let n = 0;
    const nomes = [...ordem, ...Object.keys(repo.rastreio)];
    nomes.forEach((b) => {
      let h = repo.branches[b] !== undefined ? repo.branches[b] : repo.rastreio[b];
      let usou = false;
      while (h && faixa[h] === undefined) { faixa[h] = n; usou = true; h = e.objetos[h].pais[0]; }
      if (usou) n++;
    });
    return {
      faixas: Math.max(1, n),
      linhas: commits.map((c) => ({ hash: c.hash, msg: c.msg, autor: c.autor, pais: c.pais, faixa: faixa[c.hash] || 0, rotulos: rotulos(e, repo, c.hash), head: c.hash === tip(repo) })),
    };
  }
  function servidorDe(e, repo) {
    if (!repo) return null;
    const url = repo.remotos.origin;
    if (!url || !e.servidor[url]) return url ? { url, existe: false, commits: [] } : null;
    const srv = e.servidor[url];
    const set = new Set();
    Object.values(srv.branches).filter(Boolean).forEach((p) => ancestrais(e, p).forEach((h) => set.add(h)));
    return { url, existe: true, branches: { ...srv.branches }, commits: [...set].map((h) => e.objetos[h]).sort((x, y) => y.n - x.n).map((c) => ({ hash: c.hash, msg: c.msg, autor: c.autor })) };
  }

  /* ---------- Objetivos ---------- */
  const TIPOS_GIT = ['repo', 'commits', 'mensagem', 'noCommit', 'foraDoCommit', 'naoRastreado', 'limpo', 'semPreparo', 'preparado', 'modificado', 'branch', 'semBranch', 'atual', 'naBranch', 'foraDaBranch', 'contemMensagem', 'juncao', 'semConflito', 'semMarcas', 'remoto', 'enviado', 'config'];
  function repoDaMissao(m, e, o) {
    const c = (o && o.caminho) || m.repo;
    if (c) { const r = e.repos[MotorShell.normal(c)]; return r && e.fs[`${r.raiz}/.git`] ? r : null; }
    return repoDe(e, e.cwd) || Object.values(e.repos).find((r) => e.fs[`${r.raiz}/.git`]) || null;
  }
  const temMsg = (e, ponta, valor) => [...ancestrais(e, ponta)].some((h) => e.objetos[h].msg.toLowerCase().includes(String(valor).toLowerCase()));
  function objetivoGit(m, e, o) {
    const repo = repoDaMissao(m, e, o);
    if (o.tipo === 'config') return !!e.gitConfig.nome && !!e.gitConfig.email && (!o.valor || e.gitConfig.nome === o.valor);
    if (!repo) return false;
    const h = tip(repo); const H = arvoreDe(e, h);
    switch (o.tipo) {
      case 'repo': return true;
      case 'commits': return (h ? ancestrais(e, h).size : 0) === Number(o.valor);
      case 'mensagem': return !!h && e.objetos[h].msg.toLowerCase().includes(String(o.valor).toLowerCase());
      case 'noCommit': return H[o.arquivo] !== undefined && (o.valor === undefined || H[o.arquivo].includes(o.valor));
      case 'foraDoCommit': return H[o.arquivo] === undefined;
      case 'naoRastreado': return H[o.arquivo] === undefined && repo.index[o.arquivo] === undefined;
      case 'limpo': return situacao(e, repo).limpo && !repo.merge;
      case 'semPreparo': return !situacao(e, repo).preparados.length;
      case 'preparado': return situacao(e, repo).preparados.some((x) => x.arquivo === o.arquivo);
      case 'modificado': return situacao(e, repo).modificados.some((x) => x.arquivo === o.arquivo);
      case 'branch': return repo.branches[o.valor] !== undefined;
      case 'semBranch': return repo.branches[o.valor] === undefined;
      case 'atual': return repo.head === o.valor;
      case 'naBranch': return repo.branches[o.branch] !== undefined && temMsg(e, repo.branches[o.branch], o.valor);
      case 'foraDaBranch': return repo.branches[o.branch] !== undefined && !temMsg(e, repo.branches[o.branch], o.valor);
      case 'contemMensagem': return !!h && temMsg(e, h, o.valor);
      case 'juncao': return !!h && e.objetos[h].pais.length > 1;
      case 'semConflito': return !repo.merge;
      case 'semMarcas': { const n = e.fs[absDe(repo, o.arquivo)]; return !!n && !MARCAS.test(n.conteudo); }
      case 'remoto': return !!repo.remotos.origin && (!o.valor || repo.remotos.origin === o.valor);
      case 'enviado': { const url = repo.remotos.origin; const b = o.valor || 'main'; return !!url && !!e.servidor[url] && !!repo.branches[b] && e.servidor[url].branches[b] === repo.branches[b]; }
      default: return false;
    }
  }
  function objetivos(m, e) {
    return (m.objetivos || []).map((o) => (TIPOS_GIT.includes(o.tipo) ? { texto: o.texto, ok: objetivoGit(m, e, o) } : MotorShell.objetivos({ objetivos: [o] }, e)[0]));
  }
  const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();
  function conferir(m, e, valores = {}) {
    const falta = objetivos(m, e).filter((o) => !o.ok);
    if (falta.length) return { ok: false, custo: e.comandos, mensagem: `Ainda falta: ${falta.map((o) => o.texto).join('; ')}.` };
    for (const c of m.campos || []) {
      if (![].concat(c.certo).map(norm).includes(norm(valores[c.id]))) return { ok: false, custo: e.comandos, mensagem: valores[c.id] ? c.erro || 'A resposta ainda não confere.' : `Responda: ${c.rotulo}` };
    }
    return { ok: true, custo: e.comandos, mensagem: m.sucesso || 'Linha do tempo em ordem.' };
  }
  function verificar(m) {
    const erros = [];
    if (!Array.isArray(m.objetivos) || !m.objetivos.length) erros.push('faltam objetivos');
    const e = estado(m);
    if (e.erroPreparo) erros.push(`o preparo da missão dá erro em "${e.erroPreparo}"`);
    (m.objetivos || []).forEach((o) => { if (!TIPOS_GIT.includes(o.tipo) && !['cwd', 'existe', 'naoExiste', 'conteudo', 'contem', 'modo', 'executavel', 'saida', 'usou', 'leu'].includes(o.tipo)) erros.push(`objetivo de tipo desconhecido: ${o.tipo}`); });
    const sol = m.solucao || {};
    (sol.comandos || []).forEach((cmd) => {
      const r = typeof cmd === 'string' ? MotorShell.rodar(e, cmd) : MotorShell.gravar(e, MotorShell.normal(cmd.editar), cmd.texto);
      if (r.erro) erros.push(`a solução dá erro em "${typeof cmd === 'string' ? cmd : `nano ${cmd.editar}`}": ${r.erro.split('\n')[0]}`);
    });
    const c = conferir(m, e, sol.resposta || {});
    if (!c.ok) erros.push(`a solução não resolve: ${c.mensagem}`);
    if (conferir(m, estado(m), {}).ok) erros.push('a missão já começa resolvida');
    (m.campos || []).forEach((campo) => { if (![].concat(campo.certo).every((x) => campo.opcoes.includes(x))) erros.push(`o campo ${campo.id} tem resposta certa fora das opções`); });
    const n = (sol.comandos || []).length;
    if (!m.metas || !m.metas.comandos) erros.push('falta metas.comandos');
    else if (n > m.metas.comandos) erros.push(`a solução usa ${n} comandos e a meta é ${m.metas.comandos}`);
    return erros;
  }

  return { AJUDA, estado, objetivos, conferir, verificar, areas, grafo, servidorDe, repoDe, situacao };
})();

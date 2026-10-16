/*
 * laboratorio/motor-shell.js — um shell de mentirinha com sistema de arquivos virtual (Explora Tech, Módulo 11,
 * 2026-10-16). Só lógica, sem tela: roda no navegador (Missões no Terminal) e no scripts/conferir-laboratorios.mjs.
 * Nada toca o computador de verdade: as pastas e os arquivos existem só num objeto.
 *
 * Comandos: pwd, ls [-l] [-a], cd, cat, head/tail [-n N], wc [-l], grep [-i -c -n -v], sort, uniq [-c], echo,
 * mkdir [-p], touch, cp [-r], mv, rm [-r], rmdir, chmod (número ou u+x), nano (abre o mini editor da tela), ./script,
 * history, ajuda; pipe (|), redirecionamento (> e >>) e curingas (* e ?, sem os ocultos).
 * Missão (data/laboratorios/<curso>/missoes-no-terminal.json):
 *   inicio: { casa, cwd, arquivos: { "/caminho": "conteúdo" | null (pasta) }, modos: { "/caminho": "755" } }
 *   objetivos: [{ texto, tipo: "cwd" | "existe" | "naoExiste" | "conteudo" | "contem" | "modo" | "executavel" |
 *                 "saida" | "usou" | "leu", caminho?, valor? }]
 *   campos: [{ id, rotulo, opcoes, certo, erro }] (pergunta final, opcional)
 *   solucao: { comandos: ["cd escola", { editar: "/caminho", texto: "..." }], resposta: { id: valor } }, metas: { comandos }
 */
const MotorShell = (() => {
  const AJUDA = 'Comandos: pwd · ls [-l] [-a] · cd · cat · head · tail · wc -l · grep [-i -c -n -v] · sort · uniq · echo · mkdir [-p] · touch · cp [-r] · mv · rm [-r] · rmdir · chmod · nano · history · limpar. Também | (pipe), > e >>, e os curingas * e ?.';

  /* ---------- Caminhos ---------- */
  function normal(caminho) {
    const partes = [];
    caminho.split('/').forEach((p) => { if (!p || p === '.') return; if (p === '..') partes.pop(); else partes.push(p); });
    return `/${partes.join('/')}`;
  }
  function resolver(e, alvo) {
    if (!alvo || alvo === '~') return e.casa;
    if (alvo.startsWith('~/')) return normal(`${e.casa}/${alvo.slice(2)}`);
    return normal(alvo.startsWith('/') ? alvo : `${e.cwd}/${alvo}`);
  }
  const mae = (c) => (c === '/' ? '/' : c.slice(0, c.lastIndexOf('/')) || '/');
  const nomeDe = (c) => c.slice(c.lastIndexOf('/') + 1);
  const filhos = (e, pasta) => Object.keys(e.fs).filter((c) => c !== pasta && mae(c) === pasta).sort();

  /* ---------- Estado ---------- */
  function estado(m) {
    const ini = m.inicio || {};
    const fs = { '/': { tipo: 'd', modo: '755' } };
    const garantirPasta = (c) => { if (c === '/' || fs[c]) return; garantirPasta(mae(c)); fs[c] = { tipo: 'd', modo: '755' }; };
    Object.entries(ini.arquivos || {}).forEach(([c, v]) => {
      const caminho = normal(c);
      if (v === null) garantirPasta(caminho);
      else { garantirPasta(mae(caminho)); fs[caminho] = { tipo: 'f', conteudo: v, modo: '644' }; }
    });
    Object.entries(ini.modos || {}).forEach(([c, mo]) => { if (fs[normal(c)]) fs[normal(c)].modo = mo; });
    const casa = ini.casa || '/home/bia';
    garantirPasta(casa);
    return { fs, casa, cwd: ini.cwd ? normal(ini.cwd) : casa, anterior: null, usuario: ini.usuario || 'bia', historico: [], saidas: [], usados: [], lidos: [], comandos: 0 };
  }
  const clonar = (e) => JSON.parse(JSON.stringify(e));

  /* ---------- Linha de comando: aspas, curingas, pipe, redirecionamento ---------- */
  function tokens(linha) {
    const out = []; let atual = ''; let aspa = null; let tem = false;
    for (const ch of linha) {
      if (aspa) { if (ch === aspa) aspa = null; else atual += ch === '*' ? '\u0001' : ch === '?' ? '\u0002' : ch; continue; } // curinga entre aspas não expande
      if (ch === '"' || ch === "'") { aspa = ch; tem = true; continue; }
      if (/\s/.test(ch)) { if (atual || tem) out.push(atual); atual = ''; tem = false; continue; }
      atual += ch;
    }
    if (atual || tem) out.push(atual);
    return out;
  }
  function separar(linha, sep) {
    const partes = []; let atual = ''; let aspa = null;
    for (let i = 0; i < linha.length; i++) {
      const ch = linha[i];
      if (aspa) { if (ch === aspa) aspa = null; atual += ch; continue; }
      if (ch === '"' || ch === "'") { aspa = ch; atual += ch; continue; }
      if (ch === sep) { partes.push(atual); atual = ''; continue; }
      atual += ch;
    }
    partes.push(atual);
    return partes;
  }
  const des = (x) => x.replace(/\u0001/g, '*').replace(/\u0002/g, '?');
  const casaCuringa = (padrao, nome) => new RegExp(`^${padrao.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`).test(nome);
  function expandir(e, args) {
    return args.flatMap((a) => {
      if (!/[*?]/.test(a)) return [a];
      const barra = a.lastIndexOf('/');
      const pasta = barra >= 0 ? resolver(e, a.slice(0, barra) || '/') : e.cwd;
      const padrao = a.slice(barra + 1);
      const achados = filhos(e, pasta).map(nomeDe).filter((n) => !n.startsWith('.') && casaCuringa(padrao, n));
      return achados.length ? achados.map((n) => (barra >= 0 ? `${a.slice(0, barra + 1)}${n}` : n)) : [a];
    });
  }
  const opcoes = (args) => ({ flags: args.filter((a) => /^-[a-zA-Z]+$/.test(a)).join('').replace(/-/g, ''), resto: args.filter((a) => !/^-[a-zA-Z]+$/.test(a)) });

  /* ---------- Comandos ---------- */
  const NAO_EXISTE = (cmd, a) => `${cmd}: ${a}: Arquivo ou diretório inexistente`;
  function lerArquivo(e, cmd, alvo) {
    const c = resolver(e, alvo); const n = e.fs[c];
    if (!n) return { erro: NAO_EXISTE(cmd, alvo) };
    if (n.tipo === 'd') return { erro: `${cmd}: ${alvo}: É um diretório` };
    if (!/[4-7]/.test(n.modo[0])) return { erro: `${cmd}: ${alvo}: Permissão negada` };
    if (!e.lidos.includes(c)) e.lidos.push(c);
    return { texto: n.conteudo };
  }
  const linhasDe = (t) => (t === '' ? [] : t.replace(/\n$/, '').split('\n'));
  const juntar = (ls) => (ls.length ? `${ls.join('\n')}\n` : '');
  const letras = (modo, tipo) => (tipo === 'd' ? 'd' : '-') + [...modo].map((d) => { const n = Number(d); return `${n & 4 ? 'r' : '-'}${n & 2 ? 'w' : '-'}${n & 1 ? 'x' : '-'}`; }).join('');

  /* ---------- Plugins: outro motor ensina um comando novo ao shell (o Git da Linha do Tempo do Código) ---------- */
  const PLUGINS = {};
  function plugin(nome, fn) { PLUGINS[nome] = fn; }

  function rodarUm(e, args, entrada) {
    const cmd = des(args[0]);
    if (PLUGINS[cmd]) return PLUGINS[cmd](e, args.slice(1).map(des), { resolver: (x) => resolver(e, x), normal, mae, nomeDe, filhos: (p) => filhos(e, p), entrada });
    const a = expandir(e, args.slice(1)).map(des);
    const { flags, resto } = opcoes(a);
    const N = () => { const i = a.indexOf('-n'); return i >= 0 ? Number(a[i + 1]) : 10; };
    const semN = () => { const i = a.indexOf('-n'); return i >= 0 ? a.filter((_, k) => k !== i && k !== i + 1) : a; };
    const fonte = (lista) => {
      if (!lista.length) return { texto: entrada || '' };
      const r = lerArquivo(e, cmd, lista[0]);
      return r;
    };
    switch (cmd) {
      case 'ajuda': case 'help': return { texto: `${e.ajuda || AJUDA}\n` };
      case 'pwd': return { texto: `${e.cwd}\n` };
      case 'history': return { texto: juntar(e.historico.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`)) };
      case 'echo': return { texto: `${a.join(' ')}\n` };
      case 'cd': {
        let alvo = resto[0];
        if (alvo === '-') { if (!e.anterior) return { erro: 'cd: não há pasta anterior' }; alvo = e.anterior; }
        const c = resolver(e, alvo);
        if (!e.fs[c]) return { erro: NAO_EXISTE('cd', resto[0]) };
        if (e.fs[c].tipo !== 'd') return { erro: `cd: ${resto[0]}: Não é um diretório` };
        if (!/[1357]/.test(e.fs[c].modo[0])) return { erro: `cd: ${resto[0]}: Permissão negada` };
        e.anterior = e.cwd; e.cwd = c;
        return { texto: '' };
      }
      case 'ls': {
        const alvos = resto.length ? resto : ['.'];
        const blocos = [];
        for (const alvo of alvos) {
          const c = resolver(e, alvo); const n = e.fs[c];
          if (!n) return { erro: `ls: não foi possível acessar '${alvo}': Arquivo ou diretório inexistente` };
          const itens = n.tipo === 'd' ? filhos(e, c).filter((x) => flags.includes('a') || !nomeDe(x).startsWith('.')) : [c];
          const linha = (x) => {
            const f = e.fs[x];
            const nome = n.tipo === 'd' ? nomeDe(x) : alvo;
            return flags.includes('l') ? `${letras(f.modo, f.tipo)} ${e.usuario} ${e.usuario} ${String(f.tipo === 'd' ? 4096 : new TextEncoder().encode(f.conteudo).length).padStart(5)} ${nome}${f.tipo === 'd' ? '/' : ''}` : `${nome}${f.tipo === 'd' ? '/' : ''}`;
          };
          blocos.push((alvos.length > 1 ? `${alvo}:\n` : '') + juntar(itens.map(linha)));
        }
        return { texto: blocos.join('\n') };
      }
      case 'cat': {
        if (!resto.length) return { texto: entrada || '' };
        let t = '';
        for (const x of resto) { const r = lerArquivo(e, 'cat', x); if (r.erro) return r; t += r.texto; }
        return { texto: t };
      }
      case 'head': case 'tail': {
        const r = fonte(opcoes(semN()).resto); if (r.erro) return r;
        const ls = linhasDe(r.texto);
        return { texto: juntar(cmd === 'head' ? ls.slice(0, N()) : ls.slice(-N())) };
      }
      case 'wc': {
        const r = fonte(resto); if (r.erro) return r;
        const l = (r.texto.match(/\n/g) || []).length; const p = r.texto.split(/\s+/).filter(Boolean).length; const b = new TextEncoder().encode(r.texto).length;
        if (flags.includes('l')) return { texto: `${l}${resto[0] ? ` ${resto[0]}` : ''}\n` };
        return { texto: `${l} ${p} ${b}${resto[0] ? ` ${resto[0]}` : ''}\n` };
      }
      case 'grep': {
        const [padrao, ...arqs] = resto;
        if (padrao === undefined) return { erro: 'Uso: grep [-i -c -n -v] texto [arquivo]' };
        const r = fonte(arqs); if (r.erro) return r;
        const p = flags.includes('i') ? padrao.toLowerCase() : padrao;
        let achadas = linhasDe(r.texto).map((l, i) => ({ l, i })).filter(({ l }) => (flags.includes('i') ? l.toLowerCase() : l).includes(p) !== flags.includes('v'));
        if (flags.includes('c')) return { texto: `${achadas.length}\n` };
        if (flags.includes('n')) achadas = achadas.map(({ l, i }) => ({ l: `${i + 1}:${l}` }));
        return { texto: juntar(achadas.map((x) => x.l)) };
      }
      case 'sort': { const r = fonte(resto); if (r.erro) return r; return { texto: juntar(linhasDe(r.texto).sort()) }; }
      case 'uniq': {
        const r = fonte(resto); if (r.erro) return r;
        const out = [];
        linhasDe(r.texto).forEach((l) => { const u = out[out.length - 1]; if (u && u.l === l) u.n++; else out.push({ l, n: 1 }); });
        return { texto: juntar(out.map((x) => (flags.includes('c') ? `${String(x.n).padStart(7)} ${x.l}` : x.l))) };
      }
      case 'mkdir': {
        for (const x of resto) {
          const c = resolver(e, x);
          if (e.fs[c]) { if (flags.includes('p')) continue; return { erro: `mkdir: não foi possível criar o diretório '${x}': Arquivo existe` }; }
          if (!e.fs[mae(c)]) {
            if (!flags.includes('p')) return { erro: `mkdir: não foi possível criar o diretório '${x}': Arquivo ou diretório inexistente` };
            let m = mae(c); const criar = [];
            while (!e.fs[m]) { criar.unshift(m); m = mae(m); }
            criar.forEach((k) => { e.fs[k] = { tipo: 'd', modo: '755' }; });
          }
          e.fs[c] = { tipo: 'd', modo: '755' };
        }
        return { texto: '' };
      }
      case 'touch': {
        for (const x of resto) {
          const c = resolver(e, x);
          if (!e.fs[mae(c)]) return { erro: `touch: não foi possível tocar '${x}': Arquivo ou diretório inexistente` };
          if (!e.fs[c]) e.fs[c] = { tipo: 'f', conteudo: '', modo: '644' };
        }
        return { texto: '' };
      }
      case 'cp': case 'mv': {
        if (resto.length < 2) return { erro: `${cmd}: falta o destino` };
        const destinoArg = resto[resto.length - 1];
        const destino = resolver(e, destinoArg);
        const origens = resto.slice(0, -1);
        const destinoEhPasta = e.fs[destino] && e.fs[destino].tipo === 'd';
        if (origens.length > 1 && !destinoEhPasta) return { erro: `${cmd}: o destino '${destinoArg}' não é um diretório` };
        for (const o of origens) {
          const c = resolver(e, o); const n = e.fs[c];
          if (!n) return { erro: `${cmd}: não foi possível obter estado de '${o}': Arquivo ou diretório inexistente` };
          if (n.tipo === 'd' && cmd === 'cp' && !flags.includes('r')) return { erro: `cp: -r não especificado; omitindo o diretório '${o}'` };
          const para = destinoEhPasta ? normal(`${destino}/${nomeDe(c)}`) : destino;
          if (!e.fs[mae(para)]) return { erro: `${cmd}: não foi possível criar '${destinoArg}': Arquivo ou diretório inexistente` };
          const afetados = Object.keys(e.fs).filter((k) => k === c || k.startsWith(`${c}/`));
          afetados.forEach((k) => { e.fs[para + k.slice(c.length)] = JSON.parse(JSON.stringify(e.fs[k])); });
          if (cmd === 'mv') afetados.forEach((k) => { if (!(k === para || k.startsWith(`${para}/`))) delete e.fs[k]; });
        }
        return { texto: '' };
      }
      case 'rm': case 'rmdir': {
        if (!resto.length) return { erro: `${cmd}: falta o operando` };
        for (const x of resto) {
          const c = resolver(e, x); const n = e.fs[c];
          if (!n) return { erro: `${cmd}: não foi possível remover '${x}': Arquivo ou diretório inexistente` };
          if (c === '/' || c === e.casa) return { erro: `${cmd}: por segurança, este laboratório não apaga '${x}'` };
          const dentro = Object.keys(e.fs).filter((k) => k.startsWith(`${c}/`));
          if (cmd === 'rmdir') { if (n.tipo !== 'd') return { erro: `rmdir: falhou em remover '${x}': Não é um diretório` }; if (dentro.length) return { erro: `rmdir: falhou em remover '${x}': Diretório não vazio` }; }
          if (cmd === 'rm' && n.tipo === 'd' && !flags.includes('r')) return { erro: `rm: não é possível remover '${x}': É um diretório` };
          [c, ...dentro].forEach((k) => delete e.fs[k]);
          if (e.cwd === c || e.cwd.startsWith(`${c}/`)) e.cwd = mae(c);
        }
        return { texto: '' };
      }
      case 'chmod': {
        const [modo, ...alvos] = a;
        if (!modo || !alvos.length) return { erro: 'Uso: chmod 755 arquivo ou chmod u+x arquivo' };
        for (const x of alvos) {
          const c = resolver(e, x); const n = e.fs[c];
          if (!n) return { erro: `chmod: não foi possível acessar '${x}': Arquivo ou diretório inexistente` };
          if (/^[0-7]{3}$/.test(modo)) n.modo = modo;
          else {
            const mm = /^([ugoa]*)([+-])([rwx]+)$/.exec(modo);
            if (!mm) return { erro: `chmod: modo inválido: '${modo}'` };
            const quem = (mm[1] || 'a').replace('a', 'ugo');
            const bit = [...mm[3]].reduce((s, l) => s + { r: 4, w: 2, x: 1 }[l], 0);
            n.modo = [...n.modo].map((d, i) => (quem.includes('ugo'[i]) ? String(mm[2] === '+' ? Number(d) | bit : Number(d) & ~bit) : d)).join('');
          }
        }
        return { texto: '' };
      }
      case 'nano': {
        if (!resto[0]) return { erro: 'Uso: nano arquivo' };
        const c = resolver(e, resto[0]); const n = e.fs[c];
        if (n && n.tipo === 'd') return { erro: `nano: ${resto[0]} é um diretório` };
        if (!n && !e.fs[mae(c)]) return { erro: NAO_EXISTE('nano', resto[0]) };
        return { texto: '', editor: { caminho: c, conteudo: n ? n.conteudo : '' } };
      }
      default: {
        if (cmd && cmd.startsWith('./')) {
          const c = resolver(e, cmd); const n = e.fs[c];
          if (!n) return { erro: `bash: ${cmd}: Arquivo ou diretório inexistente` };
          if (!/[1357]/.test(n.modo[0])) return { erro: `bash: ${cmd}: Permissão negada` };
          const saida = linhasDe(n.conteudo).filter((l) => /^echo /.test(l.trim())).map((l) => tokens(l.trim()).slice(1).join(' '));
          return { texto: juntar(saida) };
        }
        return { erro: `${cmd}: comando não encontrado (digite ajuda)` };
      }
    }
  }

  /** Roda uma linha (com pipe e redirecionamento) e devolve { texto, erro, editor }. Muda o estado. */
  function rodar(e, linha) {
    const l = String(linha || '').trim();
    if (!l) return { texto: '' };
    e.historico.push(l);
    e.comandos++;
    let corpo = l; let redir = null;
    const mr = /^(.*?)(>>?)\s*([^>|]+)$/.exec(l);
    if (mr && !/["']/.test(mr[3])) { corpo = mr[1]; redir = { modo: mr[2], alvo: mr[3].trim() }; }
    let entrada = '';
    let r = { texto: '' };
    for (const parte of separar(corpo, '|')) {
      const args = tokens(parte.trim());
      if (!args.length) return { erro: 'bash: erro de sintaxe perto do |' };
      if (!e.usados.includes(args[0])) e.usados.push(args[0]);
      r = rodarUm(e, args, entrada);
      if (r.erro) break;
      entrada = r.texto;
    }
    if (!r.erro && redir) {
      const c = resolver(e, redir.alvo);
      if (!e.fs[mae(c)]) return { erro: `bash: ${redir.alvo}: Arquivo ou diretório inexistente` };
      if (e.fs[c] && e.fs[c].tipo === 'd') return { erro: `bash: ${redir.alvo}: É um diretório` };
      const antes = redir.modo === '>>' && e.fs[c] ? e.fs[c].conteudo : '';
      e.fs[c] = { tipo: 'f', conteudo: antes + r.texto, modo: e.fs[c] ? e.fs[c].modo : '644' };
      r = { texto: '' };
    }
    if (r.texto) e.saidas.push(r.texto);
    return r;
  }

  /** O mini editor grava o texto no arquivo. */
  function gravar(e, caminho, texto) {
    const n = e.fs[caminho];
    if (n && !/[2367]/.test(n.modo[0])) return { erro: `Permissão negada: ${caminho} não pode ser gravado.` };
    e.fs[caminho] = { tipo: 'f', conteudo: texto, modo: n ? n.modo : '644' };
    if (!e.usados.includes('nano')) e.usados.push('nano');
    return { texto: '' };
  }

  /* ---------- Objetivos ---------- */
  const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();
  function objetivos(m, e) {
    return (m.objetivos || []).map((o) => {
      const c = o.caminho ? normal(o.caminho) : null; const n = c ? e.fs[c] : null;
      let ok = false;
      if (o.tipo === 'cwd') ok = e.cwd === normal(o.valor);
      else if (o.tipo === 'existe') ok = !!n && (o.pasta === undefined || (n.tipo === 'd') === o.pasta);
      else if (o.tipo === 'naoExiste') ok = !n;
      else if (o.tipo === 'conteudo') ok = !!n && n.tipo === 'f' && n.conteudo === o.valor;
      else if (o.tipo === 'contem') ok = !!n && n.tipo === 'f' && n.conteudo.includes(o.valor);
      else if (o.tipo === 'modo') ok = !!n && n.modo === o.valor;
      else if (o.tipo === 'executavel') ok = !!n && /[1357]/.test(n.modo[0]);
      else if (o.tipo === 'saida') ok = e.saidas.some((s) => s.includes(o.valor));
      else if (o.tipo === 'usou') ok = e.usados.includes(o.valor);
      else if (o.tipo === 'leu') ok = e.lidos.includes(c);
      return { texto: o.texto, ok };
    });
  }
  function conferir(m, e, valores = {}) {
    const falta = objetivos(m, e).filter((o) => !o.ok);
    if (falta.length) return { ok: false, custo: e.comandos, mensagem: `Ainda falta: ${falta.map((o) => o.texto).join('; ')}.` };
    for (const c of m.campos || []) {
      if (![].concat(c.certo).map(norm).includes(norm(valores[c.id]))) return { ok: false, custo: e.comandos, mensagem: valores[c.id] ? c.erro || 'A resposta ainda não confere.' : `Responda: ${c.rotulo}` };
    }
    return { ok: true, custo: e.comandos, mensagem: m.sucesso || 'Missão cumprida no terminal.' };
  }

  function verificar(m) {
    const erros = [];
    if (!Array.isArray(m.objetivos) || !m.objetivos.length) erros.push('faltam objetivos');
    const e = estado(m);
    const sol = m.solucao || {};
    (sol.comandos || []).forEach((cmd) => {
      const r = typeof cmd === 'string' ? rodar(e, cmd) : gravar(e, normal(cmd.editar), cmd.texto);
      if (r.erro) erros.push(`a solução dá erro em "${typeof cmd === 'string' ? cmd : `nano ${cmd.editar}`}": ${r.erro}`);
    });
    const c = conferir(m, e, sol.resposta || {});
    if (!c.ok) erros.push(`a solução não resolve: ${c.mensagem}`);
    if (conferir(m, estado(m), {}).ok) erros.push('a missão já começa resolvida');
    const n = (sol.comandos || []).length;
    if (!m.metas || !m.metas.comandos) erros.push('falta metas.comandos');
    else if (n > m.metas.comandos) erros.push(`a solução usa ${n} comandos e a meta é ${m.metas.comandos}`);
    return erros;
  }

  return { AJUDA, estado, clonar, rodar, gravar, objetivos, conferir, verificar, normal, letras, plugin };
})();

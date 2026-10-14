/*
 * laboratorio/mundo-robo.js — o mundo do Robô Entregador em JavaScript (Explora Tech, 2026-10-13).
 * É o espelho de laboratorio/labs/robo.py: as mesmas regras, as mesmas mensagens e os mesmos eventos.
 * Serve para o modo toque (celular, sem baixar o Python) e para desenhar a animação.
 * O scripts/conferir-laboratorios.mjs roda as soluções nos dois e confere que dão o mesmo resultado.
 *
 * Mapa: linhas de texto. "#" parede · "." chão · "R" robô · "C" caixa · "D" destino · "E" caixa já no destino.
 * Missão com "cenarios" (decisões, Módulo 2, 2026-10-14): o mesmo programa precisa entregar em todos os mundos.
 * executar(): um interpretador pequeno do Python do robô (comandos, sensores, if/elif/else, not/and/or, while,
 * for ... in range(n), def), para o modo toque rodar decisões e laços sem baixar o Python.
 */
const MundoRobo = (() => {
  const LIMITE = 400;
  const DIRS = ['leste', 'sul', 'oeste', 'norte'];
  const PASSO = { leste: [1, 0], sul: [0, 1], oeste: [-1, 0], norte: [0, -1] };
  const MSG = {
    bater: 'O robô bateu na parede. Confira para onde ele está virado antes de andar.',
    semCaixa: 'Não tem caixa aqui para pegar.',
    cheio: 'O robô só carrega uma caixa por vez: entregue a primeira antes.',
    vazio: 'O robô não está carregando nenhuma caixa.',
    cansou: `O robô cansou: mais de ${LIMITE} ações. Será que tem um laço que não termina?`,
  };
  const COMANDOS = ['andar', 'virar_esquerda', 'virar_direita', 'pegar', 'soltar'];

  const chave = (x, y) => `${x},${y}`;

  /** Lê o mapa: { largura, altura, paredes:Set, caixas:Map, destinos:Set, x, y, dir }. */
  function ler({ mapa, direcao = 'leste' }) {
    const m = { paredes: new Set(), caixas: new Map(), destinos: new Set(), dir: direcao, carga: 0, passos: 0, x: 0, y: 0 };
    m.altura = mapa.length;
    m.largura = Math.max(...mapa.map((l) => l.length));
    mapa.forEach((linha, y) => [...linha].forEach((c, x) => {
      const k = chave(x, y);
      if (c === '#') m.paredes.add(k);
      else if (c === 'R') { m.x = x; m.y = y; }
      else if (c === 'C') m.caixas.set(k, (m.caixas.get(k) || 0) + 1);
      else if (c === 'D') m.destinos.add(k);
      else if (c === 'E') { m.destinos.add(k); m.caixas.set(k, 1); }
    }));
    return m;
  }

  function copiar(m) {
    return { ...m, paredes: m.paredes, destinos: m.destinos, caixas: new Map(m.caixas) };
  }

  const bloqueado = (m, x, y) => m.paredes.has(chave(x, y)) || x < 0 || y < 0 || x >= m.largura || y >= m.altura;

  /**
   * Roda uma lista de comandos (modo toque) e devolve { eventos, erro, entregue, estado } — os mesmos eventos
   * do Python: { acao, x, y, dir, carga, linha, ok }.
   */
  function rodar(missao, comandos) {
    const m = ler(missao);
    const eventos = [];
    let erro = null;
    const acao = (nome, linha, ok = true) => {
      m.passos++;
      eventos.push({ acao: nome, x: m.x, y: m.y, dir: m.dir, carga: m.carga, linha, ok });
      if (m.passos > LIMITE) throw new Error(MSG.cansou);
    };
    try {
      comandos.forEach((item, i) => {
        const cmd = typeof item === 'string' ? item : item.cmd;
        const linha = typeof item === 'string' ? i + 1 : item.linha;
        const k = chave(m.x, m.y);
        if (cmd === 'andar') {
          const [dx, dy] = PASSO[m.dir];
          if (bloqueado(m, m.x + dx, m.y + dy)) { acao('bater', linha, false); throw new Error(MSG.bater); }
          m.x += dx; m.y += dy;
          acao('andar', linha);
        } else if (cmd === 'virar_esquerda') {
          m.dir = DIRS[(DIRS.indexOf(m.dir) + 3) % 4];
          acao('virar_esquerda', linha);
        } else if (cmd === 'virar_direita') {
          m.dir = DIRS[(DIRS.indexOf(m.dir) + 1) % 4];
          acao('virar_direita', linha);
        } else if (cmd === 'pegar') {
          if (!(m.caixas.get(k) > 0)) { acao('pegar', linha, false); throw new Error(MSG.semCaixa); }
          if (m.carga >= 1) { acao('pegar', linha, false); throw new Error(MSG.cheio); }
          m.caixas.set(k, m.caixas.get(k) - 1);
          m.carga++;
          acao('pegar', linha);
        } else if (cmd === 'soltar') {
          if (m.carga <= 0) { acao('soltar', linha, false); throw new Error(MSG.vazio); }
          m.carga--;
          m.caixas.set(k, (m.caixas.get(k) || 0) + 1);
          acao('soltar', linha);
        } else {
          throw new Error(`Comando desconhecido: ${cmd}`);
        }
      });
    } catch (e) {
      erro = e.message;
    }
    return { eventos, erro, entregue: !erro && entregue(m), estado: m };
  }

  /** Todas as caixas em cima de um destino e nada na mão do robô (igual a _entregue() do Python). */
  function entregue(m) {
    const fora = [...m.caixas].some(([k, n]) => n > 0 && !m.destinos.has(k));
    const vazios = [...m.destinos].some((d) => !(m.caixas.get(d) > 0));
    return !fora && !vazios && m.carga === 0;
  }

  /** "andar()\nvirar_direita()" → [{ cmd: 'andar', linha: 1 }, ...] (só para programas sem laço; null se não der). */
  function comandosDoCodigo(codigo) {
    const lista = [];
    const linhas = String(codigo).split('\n');
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i].replace(/#.*/, '').trim();
      if (!l) continue;
      const m = /^([a-z_]+)\(\)$/.exec(l);
      if (!m || !COMANDOS.includes(m[1])) return null;
      lista.push({ cmd: m[1], linha: i + 1 });
    }
    return lista;
  }

  /** Aplica um evento a um estado (para a animação): devolve um novo estado. */
  function aplicar(m, ev) {
    const n = copiar(m);
    n.x = ev.x; n.y = ev.y; n.dir = ev.dir; n.carga = ev.carga;
    const k = chave(ev.x, ev.y);
    if (ev.ok && ev.acao === 'pegar') n.caixas.set(k, (n.caixas.get(k) || 0) - 1);
    if (ev.ok && ev.acao === 'soltar') n.caixas.set(k, (n.caixas.get(k) || 0) + 1);
    return n;
  }

  /**
   * O pedido para o Python (Executor.rodar e conferir-laboratorios): o mundo da missão + laboratorio/labs/robo.py
   * antes do programa e o teste de entrega depois.
   */
  function pedido(missao, codigo, fonteRobo) {
    const dados = JSON.stringify({ mapa: missao.mapa, direcao: missao.direcao || 'leste' });
    return {
      codigo,
      prelude: `_DIVER_MAPA = ${JSON.stringify(dados)}\n${fonteRobo}`,
      testes: [{ nome: 'Todas as caixas entregues', codigo: 'assert _entregue(), "As caixas ainda não chegaram todas ao destino (ou o robô ainda está carregando uma)."' }],
    };
  }

  /** Os mundos da missão: [{ nome, mapa, direcao }] (missão antiga: um mundo só, o "mapa" dela). */
  function cenarios(missao) {
    if (Array.isArray(missao.cenarios) && missao.cenarios.length) {
      return missao.cenarios.map((c, i) => ({ nome: c.nome || `Mundo ${i + 1}`, mapa: c.mapa, direcao: c.direcao || missao.direcao || 'leste' }));
    }
    return [{ nome: 'Mundo 1', mapa: missao.mapa, direcao: missao.direcao || 'leste' }];
  }

  /* ---------- Interpretador do Python do robô ---------- */
  const SENSORES = ['parede_a_frente', 'parede_a_direita', 'parede_a_esquerda', 'caixa_aqui', 'no_destino'];
  class NaoSuporta extends Error {}

  /** Texto → árvore: [{ tipo, linha, ... , corpo: [] }]. Lança NaoSuporta se aparecer algo fora do pedaço que entendemos. */
  function compilar(codigo) {
    const linhas = String(codigo).replace(/\t/g, '    ').split('\n')
      .map((t, i) => ({ texto: t.replace(/#.*/, '').trimEnd(), n: i + 1 }))
      .filter((l) => l.texto.trim());
    let i = 0;
    const recuo = (l) => l.texto.length - l.texto.trimStart().length;
    function bloco(nivel) {
      const lista = [];
      while (i < linhas.length) {
        const l = linhas[i];
        const r = recuo(l);
        if (r < nivel) break;
        if (r > nivel) throw new NaoSuporta(`recuo inesperado na linha ${l.n}`);
        const t = l.texto.trim();
        i++;
        let m;
        const corpo = () => {
          if (i >= linhas.length || recuo(linhas[i]) <= nivel) throw new NaoSuporta(`bloco vazio depois da linha ${l.n}`);
          return bloco(recuo(linhas[i]));
        };
        if ((m = /^if (.+):$/.exec(t))) {
          const no = { tipo: 'if', linha: l.n, ramos: [{ cond: expr(m[1]), linha: l.n, corpo: corpo() }], senao: null };
          while (i < linhas.length && recuo(linhas[i]) === nivel) {
            const t2 = linhas[i].texto.trim();
            const n2 = linhas[i].n;
            if ((m = /^elif (.+):$/.exec(t2))) { i++; no.ramos.push({ cond: expr(m[1]), linha: n2, corpo: corpo() }); }
            else if (t2 === 'else:') { i++; no.senao = { linha: n2, corpo: corpo() }; break; }
            else break;
          }
          lista.push(no);
        } else if ((m = /^while (.+):$/.exec(t))) {
          lista.push({ tipo: 'while', linha: l.n, cond: expr(m[1]), corpo: corpo() });
        } else if ((m = /^for [a-z_][a-z0-9_]* in range\((\d+)\):$/.exec(t))) {
          lista.push({ tipo: 'for', linha: l.n, vezes: Number(m[1]), corpo: corpo() });
        } else if ((m = /^def ([a-z_][a-z0-9_]*)\(\):$/.exec(t))) {
          lista.push({ tipo: 'def', linha: l.n, nome: m[1], corpo: corpo() });
        } else if ((m = /^([a-z_][a-z0-9_]*)\(\)$/.exec(t))) {
          lista.push({ tipo: 'chamada', linha: l.n, nome: m[1] });
        } else if (t === 'pass' || t === 'break') {
          lista.push({ tipo: t, linha: l.n });
        } else {
          throw new NaoSuporta(`linha ${l.n}: ${t}`);
        }
      }
      return lista;
    }
    const arvore = bloco(0);
    if (i < linhas.length) throw new NaoSuporta(`recuo inesperado na linha ${linhas[i].n}`);
    return arvore;
  }

  /** Condição: or < and < not < (parênteses | sensor() | True | False). */
  function expr(texto) {
    const fichas = String(texto).match(/\(\)|[()]|[A-Za-z_][A-Za-z0-9_]*|\S/g) || [];
    let p = 0;
    const olha = () => fichas[p];
    const pega = (esperado) => { if (esperado && fichas[p] !== esperado) throw new NaoSuporta(`condição: ${texto}`); return fichas[p++]; };
    function ou() { let e = e_(); while (olha() === 'or') { pega(); const d = e_(); const a = e; e = { op: 'or', a, b: d }; } return e; }
    function e_() { let e = nao(); while (olha() === 'and') { pega(); const d = nao(); const a = e; e = { op: 'and', a, b: d }; } return e; }
    function nao() { if (olha() === 'not') { pega(); return { op: 'not', a: nao() }; } return atomo(); }
    function atomo() {
      const f = pega();
      if (f === '(') { const e = ou(); pega(')'); return e; }
      if (f === 'True' || f === 'False') return { op: 'valor', v: f === 'True' };
      if (SENSORES.includes(f) && olha() === '()') { pega(); return { op: 'sensor', nome: f }; }
      throw new NaoSuporta(`condição: ${texto}`);
    }
    const e = ou();
    if (p !== fichas.length) throw new NaoSuporta(`condição: ${texto}`);
    return e;
  }

  /**
   * Roda o código num mundo ({ mapa, direcao }): { eventos, erro, entregue, estado } — os mesmos eventos e as mesmas
   * mensagens do Python. Devolve { naoSuporta: '...' } se o código usa algo que o interpretador não entende.
   */
  function executar(cenario, codigo) {
    let arvore;
    try { arvore = compilar(codigo); } catch (e) { if (e instanceof NaoSuporta) return { naoSuporta: e.message }; throw e; }
    const m = ler(cenario);
    const eventos = [];
    const funcoes = new Map();
    let giros = 0;
    class Parar extends Error {}
    class Quebra {}
    const acao = (nome, linha, ok = true) => {
      m.passos++;
      eventos.push({ acao: nome, x: m.x, y: m.y, dir: m.dir, carga: m.carga, linha, ok });
      if (m.passos > LIMITE) throw new Parar(MSG.cansou);
    };
    const parede = (giro) => { const [dx, dy] = PASSO[DIRS[(DIRS.indexOf(m.dir) + giro) % 4]]; return bloqueado(m, m.x + dx, m.y + dy); };
    const sensor = (nome) => ({
      parede_a_frente: () => parede(0), parede_a_direita: () => parede(1), parede_a_esquerda: () => parede(3),
      caixa_aqui: () => m.caixas.get(chave(m.x, m.y)) > 0, no_destino: () => m.destinos.has(chave(m.x, m.y)),
    })[nome]();
    const valor = (e) => {
      if (e.op === 'valor') return e.v;
      if (e.op === 'sensor') return sensor(e.nome);
      if (e.op === 'not') return !valor(e.a);
      if (e.op === 'and') return valor(e.a) && valor(e.b);
      return valor(e.a) || valor(e.b);
    };
    const gira = () => { if (++giros > 20000) throw new Parar(MSG.cansou); };
    function comando(nome, linha) {
      const k = chave(m.x, m.y);
      if (nome === 'andar') {
        const [dx, dy] = PASSO[m.dir];
        if (bloqueado(m, m.x + dx, m.y + dy)) { acao('bater', linha, false); throw new Parar(MSG.bater); }
        m.x += dx; m.y += dy;
        acao('andar', linha);
      } else if (nome === 'virar_esquerda') { m.dir = DIRS[(DIRS.indexOf(m.dir) + 3) % 4]; acao('virar_esquerda', linha); }
      else if (nome === 'virar_direita') { m.dir = DIRS[(DIRS.indexOf(m.dir) + 1) % 4]; acao('virar_direita', linha); }
      else if (nome === 'pegar') {
        if (!(m.caixas.get(k) > 0)) { acao('pegar', linha, false); throw new Parar(MSG.semCaixa); }
        if (m.carga >= 1) { acao('pegar', linha, false); throw new Parar(MSG.cheio); }
        m.caixas.set(k, m.caixas.get(k) - 1); m.carga++; acao('pegar', linha);
      } else if (nome === 'soltar') {
        if (m.carga <= 0) { acao('soltar', linha, false); throw new Parar(MSG.vazio); }
        m.carga--; m.caixas.set(k, (m.caixas.get(k) || 0) + 1); acao('soltar', linha);
      }
    }
    function rodarBloco(lista) {
      for (const no of lista) {
        gira();
        if (no.tipo === 'chamada') {
          if (COMANDOS.includes(no.nome)) comando(no.nome, no.linha);
          else if (SENSORES.includes(no.nome)) { /* sensor solto: lê e ignora, como no Python */ }
          else if (funcoes.has(no.nome)) rodarBloco(funcoes.get(no.nome));
          else throw new Parar(`NameError: name '${no.nome}' is not defined`);
        } else if (no.tipo === 'def') funcoes.set(no.nome, no.corpo);
        else if (no.tipo === 'if') {
          const ramo = no.ramos.find((r) => valor(r.cond));
          if (ramo) rodarBloco(ramo.corpo); else if (no.senao) rodarBloco(no.senao.corpo);
        } else if (no.tipo === 'while') {
          try { while (valor(no.cond)) { gira(); rodarBloco(no.corpo); } } catch (q) { if (!(q instanceof Quebra)) throw q; }
        } else if (no.tipo === 'for') {
          try { for (let v = 0; v < no.vezes; v++) { gira(); rodarBloco(no.corpo); } } catch (q) { if (!(q instanceof Quebra)) throw q; }
        } else if (no.tipo === 'break') throw new Quebra();
      }
    }
    let erro = null;
    try { rodarBloco(arvore); } catch (e) { if (e instanceof Parar) erro = e.message; else if (e instanceof Quebra) erro = "SyntaxError: 'break' outside loop"; else throw e; }
    return { eventos, erro, entregue: !erro && entregue(m), estado: m };
  }

  /** Linhas que contam para a meta: as que têm código (sem as vazias e os comentários). */
  const linhasDeCodigo = (codigo) => String(codigo).split('\n').filter((l) => l.replace(/#.*/, '').trim()).length;

  return { ler, rodar, executar, cenarios, entregue, comandosDoCodigo, aplicar, copiar, chave, pedido, linhasDeCodigo, COMANDOS, SENSORES, DIRS };
})();

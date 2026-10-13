/*
 * laboratorio/mundo-robo.js — o mundo do Robô Entregador em JavaScript (Explora Tech, 2026-10-13).
 * É o espelho de laboratorio/labs/robo.py: as mesmas regras, as mesmas mensagens e os mesmos eventos.
 * Serve para o modo toque (celular, sem baixar o Python) e para desenhar a animação.
 * O scripts/conferir-laboratorios.mjs roda as soluções nos dois e confere que dão o mesmo resultado.
 *
 * Mapa: linhas de texto. "#" parede · "." chão · "R" robô · "C" caixa · "D" destino · "E" caixa já no destino.
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

  /** Linhas que contam para a meta: as que têm código (sem as vazias e os comentários). */
  const linhasDeCodigo = (codigo) => String(codigo).split('\n').filter((l) => l.replace(/#.*/, '').trim()).length;

  return { ler, rodar, entregue, comandosDoCodigo, aplicar, copiar, chave, pedido, linhasDeCodigo, COMANDOS, DIRS };
})();

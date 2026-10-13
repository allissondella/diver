/*
 * laboratorio/executor.js — roda o Python do aluno (Explora Tech, 2026-10-13).
 *
 * O Pyodide (lib/pyodide/, ~6 MB baixados) só carrega quando alguém abre um laboratório de Python, e
 * roda dentro de laboratorio/sandbox.html, num iframe com sandbox="allow-scripts" (origem opaca): o código
 * do aluno não enxerga o login, o progresso nem o armazenamento do Diver. Se o sandbox não carregar
 * (por exemplo, um servidor sem o cabeçalho de CORS), o Python roda num worker comum, que fica sem
 * rede e sem armazenamento depois de pronto (laboratorio/python-worker.js).
 *
 * Uso:
 *   Executor.preparar(aoProgresso?) → Promise          (opcional: rodar() já prepara)
 *   Executor.rodar(pedido, { tempoMs }) → Promise<resultado>
 *     pedido: { codigo, entradas, prelude, arquivos, testes, semente, rastrear, verArquivos }
 *     resultado: { ok, erro: { tipo, mensagem, linha, traceback }, saida, precisaEntrada, prompt,
 *                  testes: [{ nome, passou, oculto, mensagem }], eventos, passos, arquivos, tempoEsgotado }
 */
const Executor = (() => {
  const base = () => new URL('.', location.href).href;
  let pronto = null;          // Promise da preparação
  let canal = null;           // { enviar(msg) }
  let modo = null;            // 'sandbox' | 'worker'
  let versao = '';
  const pendentes = new Map(); // id → resolve
  let seq = 0;

  function aoMensagem(m) {
    if (m && m.tipo === 'resultado' && pendentes.has(m.id)) {
      pendentes.get(m.id)(m.resultado);
      pendentes.delete(m.id);
    }
  }

  /** Caminho 1: iframe sandbox (o recomendado). */
  function viaSandbox() {
    return new Promise((ok, falha) => {
      const frame = document.createElement('iframe');
      frame.src = 'laboratorio/sandbox.html';
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('title', 'Laboratório (Python)');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.className = 'lab-sandbox';
      const desistir = setTimeout(() => falha(new Error('o sandbox demorou demais')), 90000);
      window.addEventListener('message', (ev) => {
        if (ev.source !== frame.contentWindow) return;
        const m = ev.data || {};
        if (m.tipo === 'carregou') frame.contentWindow.postMessage({ tipo: 'iniciar', base: base() }, '*');
        else if (m.tipo === 'pronto') { clearTimeout(desistir); versao = m.versao; ok({ enviar: (msg) => frame.contentWindow.postMessage(msg, '*') }); }
        else if (m.tipo === 'falhou' && !canal) { clearTimeout(desistir); frame.remove(); falha(new Error(m.mensagem)); }
        else aoMensagem(m);
      });
      document.body.append(frame);
    });
  }

  /** Caminho 2: worker comum (mesma origem), com o tempo limite controlado daqui. */
  function viaWorker() {
    return new Promise((ok, falha) => {
      let worker = null;
      let estaPronto = false;
      const fila = [];
      let atual = null;
      const criar = (primeira) => {
        estaPronto = false;
        worker = new Worker('laboratorio/python-worker.js', { type: 'module' });
        worker.onmessage = (e) => {
          const m = e.data || {};
          if (m.tipo === 'pronto') { estaPronto = true; versao = m.versao; if (primeira) ok(canalWorker); proximo(); }
          else if (m.tipo === 'falhou' && primeira) falha(new Error(m.mensagem));
          else if (m.tipo === 'resultado' && atual && atual.id === m.id) { clearTimeout(atual.timer); atual = null; aoMensagem(m); proximo(); }
        };
        worker.postMessage({ tipo: 'iniciar', base: base() });
      };
      const proximo = () => {
        if (!estaPronto || atual || !fila.length) return;
        const m = fila.shift();
        atual = { id: m.id, timer: setTimeout(() => {
          worker.terminate();
          const id = atual.id;
          atual = null;
          aoMensagem({ tipo: 'resultado', id, resultado: { ok: false, tempoEsgotado: true, erro: { tipo: 'TempoEsgotado', mensagem: 'o programa passou do tempo limite', linha: null, traceback: '' }, saida: '', testes: [] } });
          criar(false);
        }, m.tempoMs || 5000) };
        worker.postMessage({ tipo: 'rodar', id: m.id, pedido: m.pedido });
      };
      const canalWorker = { enviar: (msg) => { fila.push(msg); proximo(); } };
      criar(true);
    });
  }

  function preparar() {
    if (pronto) return pronto;
    pronto = viaSandbox()
      .then((c) => { modo = 'sandbox'; return c; })
      .catch((e) => {
        console.warn('Laboratório: sandbox indisponível, usando o worker comum.', e);
        return viaWorker().then((c) => { modo = 'worker'; return c; });
      })
      .then((c) => { canal = c; return { modo, versao }; })
      .catch((e) => { pronto = null; throw e; });
    return pronto;
  }

  async function rodar(pedido, { tempoMs = 5000 } = {}) {
    await preparar();
    const id = ++seq;
    return new Promise((resolve) => {
      pendentes.set(id, resolve);
      canal.enviar({ tipo: 'rodar', id, pedido, tempoMs });
    });
  }

  return { preparar, rodar, info: () => ({ modo, versao, pronto: !!canal }) };
})();

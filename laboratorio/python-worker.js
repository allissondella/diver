/*
 * python-worker.js — o Python dos laboratórios (Pyodide), rodando num Web Worker (Explora Tech, 2026-10-13).
 *
 * Quem cria: laboratorio/sandbox.html (dentro de um iframe sandbox, origem opaca) ou, se o sandbox não
 * conseguir carregar, o próprio js/laboratorio/executor.js. Mensagens:
 *   → { tipo: 'iniciar', base }            base = endereço do site (ex.: https://allissondella.github.io/diver/)
 *   ← { tipo: 'pronto', versao }  |  { tipo: 'falhou', mensagem }
 *   → { tipo: 'rodar', id, pedido }        pedido: ver laboratorio/diver_lab.py (executar)
 *   ← { tipo: 'resultado', id, resultado }
 * O tempo limite fica com quem criou o worker: passou do tempo, ele é encerrado e um novo é criado.
 * Depois de pronto, o worker fica sem rede nem armazenamento (trancar): o programa do aluno não sai daqui.
 */
let executar = null;

function trancar() {
  ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker', 'WebTransport']
    .forEach((nome) => {
      try { Object.defineProperty(self, nome, { value: undefined, writable: false, configurable: false }); } catch (e) { /* já não existe */ }
    });
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  if (m.tipo === 'iniciar') {
    try {
      const { loadPyodide } = await import(`${m.base}lib/pyodide/pyodide.mjs`);
      const py = await loadPyodide({ indexURL: `${m.base}lib/pyodide/`, stdout: () => {}, stderr: () => {} });
      const fonte = await (await fetch(`${m.base}laboratorio/diver_lab.py`)).text();
      py.FS.mkdirTree('/home/pyodide');
      py.FS.writeFile('/home/pyodide/diver_lab.py', fonte);
      py.runPython('import sys\nsys.path.insert(0, "/home/pyodide")\nimport diver_lab\ndiver_lab.travar()');
      executar = py.globals.get('diver_lab').executar;
      trancar();
      self.postMessage({ tipo: 'pronto', versao: py.version });
    } catch (e) {
      self.postMessage({ tipo: 'falhou', mensagem: String((e && e.message) || e) });
    }
    return;
  }
  if (m.tipo === 'rodar') {
    let resultado;
    try {
      resultado = JSON.parse(executar(JSON.stringify(m.pedido || {})));
    } catch (e) {
      resultado = { ok: false, erro: { tipo: 'ErroInterno', mensagem: String((e && e.message) || e), linha: null, traceback: '' }, saida: '', testes: [] };
    }
    self.postMessage({ tipo: 'resultado', id: m.id, resultado });
  }
};

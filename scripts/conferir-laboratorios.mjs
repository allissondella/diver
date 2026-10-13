#!/usr/bin/env node
/*
 * conferir-laboratorios.mjs — confere os laboratórios "Mão na massa" (Explora Tech, 2026-10-13).
 *
 * Roda no MESMO Python do aluno (o Pyodide de lib/pyodide/, no Node), então a saída conferida é a mesma
 * que aparece no navegador. Para cada missão:
 *   - a solução de referência passa em todos os testes;
 *   - o código inicial NÃO passa (senão a missão já vem resolvida);
 *   - 3 execuções seguidas dão o mesmo resultado (determinístico);
 *   - a solução cabe nas metas (linhas e passos), senão ninguém consegue as 3 estrelas;
 *   - robô: o mundo em JavaScript (modo toque) dá exatamente os mesmos eventos que o Python;
 *   - 3 dicas, ids únicos, aulas que existem no curso.
 *
 * Uso: node scripts/conferir-laboratorios.mjs [data/laboratorios/<curso>/<lab>.json ...]
 *      (sem argumentos: todos os laboratórios de data/laboratorios/)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const MundoRobo = new Function(`${ler('js/laboratorio/mundo-robo.js')}\nreturn MundoRobo;`)();

let arquivos = process.argv.slice(2);
if (!arquivos.length) {
  const base = join(raiz, 'data/laboratorios');
  arquivos = existsSync(base) ? readdirSync(base).flatMap((c) => readdirSync(join(base, c)).filter((f) => f.endsWith('.json')).map((f) => `data/laboratorios/${c}/${f}`)) : [];
}

const { loadPyodide } = await import(join(raiz, 'lib/pyodide/pyodide.mjs'));
const py = await loadPyodide({ indexURL: join(raiz, 'lib/pyodide/') + '/', stdout: () => {}, stderr: () => {} });
py.FS.mkdirTree('/home/pyodide');
py.FS.writeFile('/home/pyodide/diver_lab.py', ler('laboratorio/diver_lab.py'));
py.runPython('import sys\nsys.path.insert(0, "/home/pyodide")\nimport diver_lab\ndiver_lab.travar()');
const executar = py.globals.get('diver_lab').executar;
const rodar = (pedido) => JSON.parse(executar(JSON.stringify(pedido)));
const fonteRobo = ler('laboratorio/labs/robo.py');

let erros = 0;
let avisos = 0;
const erro = (m) => { erros++; console.log(`  ERRO  ${m}`); };
const aviso = (m) => { avisos++; console.log(`  AVISO ${m}`); };

for (const arq of arquivos) {
  const lab = JSON.parse(ler(arq));
  const curso = arq.split('/')[2];
  const trilhaArq = join(raiz, `data/trilhas/${curso}.json`);
  const aulas = existsSync(trilhaArq) ? new Set(JSON.parse(readFileSync(trilhaArq, 'utf8')).fases.map((f) => f.id)) : null;
  console.log(`\n${arq} · ${lab.nome} · ${lab.missoes.length} missões`);
  if (!lab.id || !lab.nome || !Array.isArray(lab.missoes) || !lab.missoes.length) erro('faltam id, nome ou missões');
  const ids = new Set();
  for (const m of lab.missoes) {
    const ref = m.id || '(sem id)';
    if (ids.has(m.id)) erro(`${ref}: id repetido`);
    ids.add(m.id);
    if (!m.titulo || !m.enunciado) erro(`${ref}: falta título ou enunciado`);
    if (!Array.isArray(m.dicas) || m.dicas.length !== 3) erro(`${ref}: precisa de 3 dicas (direção, trecho, quase a resposta)`);
    if (!m.metas || !m.metas.linhas) erro(`${ref}: falta metas.linhas`);
    if (aulas && !(m.aulas || []).every((a) => aulas.has(a))) erro(`${ref}: aula que não existe no curso (${(m.aulas || []).join(', ')})`);
    if (!aulas) aviso(`${ref}: o curso ${curso} ainda não existe; aulas não conferidas`);

    const pedidoDe = (codigo) => (lab.tipo === 'robo' ? MundoRobo.pedido(m, codigo, fonteRobo) : { codigo, prelude: m.prelude || '', arquivos: m.arquivos, testes: m.testes, entradas: m.entradas });
    const passa = (r) => r.ok && r.testes.length > 0 && r.testes.every((t) => t.passou);

    const r1 = rodar(pedidoDe(m.solucao));
    if (!passa(r1)) erro(`${ref}: a solução não passa: ${r1.erro ? `${r1.erro.tipo}: ${r1.erro.mensagem}` : r1.testes.filter((t) => !t.passou).map((t) => t.nome + ' — ' + t.mensagem).join('; ')}`);
    const r2 = rodar(pedidoDe(m.solucao));
    const r3 = rodar(pedidoDe(m.solucao));
    const igual = (a, b) => JSON.stringify([a.saida, a.eventos, a.testes]) === JSON.stringify([b.saida, b.eventos, b.testes]);
    if (!igual(r1, r2) || !igual(r1, r3)) erro(`${ref}: a solução dá resultados diferentes a cada execução`);
    const ri = rodar(pedidoDe(m.codigoInicial || ''));
    if (passa(ri)) erro(`${ref}: o código inicial já resolve a missão`);
    const linhas = MundoRobo.linhasDeCodigo(m.solucao);
    if (linhas > m.metas.linhas) erro(`${ref}: a solução tem ${linhas} linhas e a meta é ${m.metas.linhas}`);

    if (lab.tipo === 'robo') {
      const passos = (r1.eventos || []).length;
      if (m.metas.passos && passos > m.metas.passos) erro(`${ref}: a solução usa ${passos} passos e a meta é ${m.metas.passos}`);
      const cmds = MundoRobo.comandosDoCodigo(m.solucao);
      if (cmds) {
        const js = MundoRobo.rodar(m, cmds);
        if (!js.entregue) erro(`${ref}: no mundo em JavaScript (modo toque) a solução não entrega: ${js.erro || 'caixas fora do destino'}`);
        if (JSON.stringify(js.eventos) !== JSON.stringify(r1.eventos)) erro(`${ref}: os eventos do JavaScript e do Python não batem`);
        // o erro também tem de ser o mesmo nos dois (ex.: bater na parede)
        const errado = [...cmds.slice(0, 1), { cmd: 'soltar', linha: 99 }];
        const pyErr = rodar(pedidoDe(`${m.solucao.split('\n')[0]}\n${'\n'.repeat(97)}soltar()\n`));
        const jsErr = MundoRobo.rodar(m, errado);
        if (!pyErr.erro || pyErr.erro.mensagem !== jsErr.erro) erro(`${ref}: a mensagem de erro do JavaScript e do Python não bate`);
      } else if (m.toque !== false) {
        aviso(`${ref}: a solução usa laço ou condição; o modo toque precisa de blocos próprios`);
      }
    }
    // modo toque com lacunas: o modelo preenchido com as certas tem de passar nos testes
    if (m.toque && m.toque.modelo) {
      let i = 0;
      const preenchido = m.toque.modelo.replace(/___/g, () => { const l = m.toque.lacunas[i++]; return l ? l.opcoes[l.certa] : '___'; });
      if (i !== m.toque.lacunas.length) erro(`${ref}: o modelo do modo toque tem ${i} lacunas e a lista tem ${m.toque.lacunas.length}`);
      m.toque.lacunas.forEach((l, k) => { if (!(l.certa >= 0 && l.certa < l.opcoes.length) || new Set(l.opcoes).size !== l.opcoes.length) erro(`${ref}: lacuna ${k + 1} com opções repetidas ou "certa" fora`); });
      const rt = rodar(pedidoDe(preenchido));
      if (!passa(rt)) erro(`${ref}: no modo toque, as lacunas certas não passam: ${rt.erro ? rt.erro.mensagem : rt.testes.filter((t) => !t.passou).map((t) => t.nome).join('; ')}`);
      const saida = (m.testes || []).find((t) => t.tipo === 'saida' && !t.oculto);
      if (lab.tipo === 'python' && !saida) erro(`${ref}: falta um teste de saída visível (é o que o aluno vê como objetivo)`);
    }
    console.log(`  ok    ${ref} · ${m.titulo} · ${linhas} linhas${lab.tipo === 'robo' ? ` · ${(r1.eventos || []).length} passos` : ''}`);
  }
}

console.log(`\n${arquivos.length} laboratório(s) · ${erros} erro(s) · ${avisos} aviso(s)`);
process.exit(erros ? 1 : 0);

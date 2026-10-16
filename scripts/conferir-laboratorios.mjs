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
 *   - robô: o mundo em JavaScript (modo toque) dá exatamente os mesmos eventos que o Python, em cada
 *     mundo da missão ("cenarios"); com mais de um mundo, uma sequência simples não pode resolver todos;
 *   - modo toque com lacunas: as opções certas passam (no robô, também no interpretador do celular);
 *   - Lupa do Código: o rastreio guardado é igual ao do Python e cada pergunta tem uma só opção certa;
 *   - laboratórios só em JavaScript (Fábrica de Portas, Sala de Controle...): o motor de regras do tipo
 *     (js/laboratorio/motor-*.js) confere a solução, o começo e a meta de cada missão;
 *   - 3 dicas, ids únicos, aulas que existem no curso.
 *
 * Uso: node scripts/conferir-laboratorios.mjs [--gravar] [data/laboratorios/<curso>/<lab>.json ...]
 *      --gravar: grava o rastreio da Lupa do Código (passos e saída) a partir do Python
 *      (sem argumentos: todos os laboratórios de data/laboratorios/)
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const MundoRobo = new Function(`${ler('js/laboratorio/mundo-robo.js')}\nreturn MundoRobo;`)();
// laboratórios só em JavaScript (Módulo 8 em diante): cada tipo tem um motor de regras sem tela, que se confere sozinho
const MOTORES = {
  portas: new Function(`${ler('js/laboratorio/motor-portas.js')}\nreturn MotorPortas;`)(),
  sala: new Function(`${ler('js/laboratorio/motor-sala.js')}\nreturn MotorSala;`)(),
  rede: new Function(`${ler('js/laboratorio/motor-rede.js')}\nreturn MotorRede;`)(),
};

const GRAVAR = process.argv.includes('--gravar');
let mudou = false;
let arquivos = process.argv.slice(2).filter((a) => a !== '--gravar');
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

/** O modelo do modo toque preenchido com as opções certas (e confere o formato das lacunas). */
function conferirLacunas(m, ref) {
  let i = 0;
  const preenchido = m.toque.modelo.replace(/___/g, () => { const l = m.toque.lacunas[i++]; return l ? l.opcoes[l.certa] : '___'; });
  if (i !== m.toque.lacunas.length) erro(`${ref}: o modelo do modo toque tem ${i} lacunas e a lista tem ${m.toque.lacunas.length}`);
  m.toque.lacunas.forEach((l, k) => { if (!(l.certa >= 0 && l.certa < l.opcoes.length) || new Set(l.opcoes).size !== l.opcoes.length) erro(`${ref}: lacuna ${k + 1} com opções repetidas ou "certa" fora`); });
  return preenchido;
}

/**
 * Lupa do Código: o rastreio guardado na missão ("passos" e "saidaFinal") tem de ser igual ao do Python agora
 * (com --gravar, o script grava o rastreio novo). Cada pergunta cai num passo que existe e tem uma só opção certa.
 */
function conferirLupa(m, ref) {
  const r = rodar({ codigo: m.codigo, entradas: m.entradas, rastrear: true });
  if (!r.ok) erro(`${ref}: o código da Lupa para com erro: ${r.erro ? r.erro.mensagem : '?'}`);
  const passos = (r.passos || []).map((p) => ({ linha: p.linha, pilha: p.pilha, variaveis: p.variaveis, saida: p.saida }));
  if (GRAVAR) { m.passos = passos; m.saidaFinal = r.saida; mudou = true; }
  else if (JSON.stringify(m.passos) !== JSON.stringify(passos) || m.saidaFinal !== r.saida) erro(`${ref}: o rastreio guardado não bate com o Python (rode com --gravar)`);
  if (!Array.isArray(m.perguntas) || !m.perguntas.length) erro(`${ref}: a Lupa precisa de perguntas`);
  (m.perguntas || []).forEach((q, k) => {
    const vez = q.vez || 1;
    const idx = passos.map((p, i) => (p.linha === q.linha ? i : -1)).filter((i) => i >= 0)[vez - 1];
    if (idx === undefined) return erro(`${ref}: pergunta ${k + 1}: a linha ${q.linha} não roda ${vez} vez(es)`);
    const depois = passos[idx + 1];
    let certa;
    if (q.tipo === 'linha') certa = depois ? String(depois.linha) : 'fim';
    else {
      const v = depois && depois.variaveis[q.variavel];
      if (!v) return erro(`${ref}: pergunta ${k + 1}: ${q.variavel} não existe depois da linha ${q.linha}`);
      certa = v.valor;
    }
    const n = (q.opcoes || []).filter((o) => String(o) === certa).length;
    if (n !== 1) erro(`${ref}: pergunta ${k + 1}: precisa de exatamente uma opção igual a ${certa} (tem ${n})`);
    if (new Set((q.opcoes || []).map(String)).size !== (q.opcoes || []).length) erro(`${ref}: pergunta ${k + 1}: opções repetidas`);
  });
}

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
    if (aulas && !(m.aulas || []).every((a) => aulas.has(a))) erro(`${ref}: aula que não existe no curso (${(m.aulas || []).join(', ')})`);
    if (!aulas) aviso(`${ref}: o curso ${curso} ainda não existe; aulas não conferidas`);

    const passa = (r) => r.ok && r.testes.length > 0 && r.testes.every((t) => t.passou);
    const linhas = MundoRobo.linhasDeCodigo(m.solucao || m.codigo || '');

    if (lab.tipo === 'lupa') {
      conferirLupa(m, ref);
      console.log(`  ok    ${ref} · ${m.titulo} · ${(m.passos || []).length} passos · ${(m.perguntas || []).length} perguntas`);
      continue;
    }
    if (!Array.isArray(m.dicas) || m.dicas.length !== 3) erro(`${ref}: precisa de 3 dicas (direção, trecho, quase a resposta)`);
    if (MOTORES[lab.tipo]) {
      // a solução cumpre, o começo não cumpre, a meta das 3 estrelas é alcançável (cada motor confere as suas regras)
      MOTORES[lab.tipo].verificar(m).forEach((p) => erro(`${ref}: ${p}`));
      console.log(`  ok    ${ref} · ${m.titulo} · ${m.tipo || lab.tipo}`);
      continue;
    }
    if (!m.metas || !m.metas.linhas) erro(`${ref}: falta metas.linhas`);

    if (lab.tipo === 'robo') {
      // cada mundo da missão: Python e JavaScript têm de dar os mesmos eventos; a solução entrega em todos
      const mundos = MundoRobo.cenarios(m);
      let maiorPassos = 0;
      let inicialPassaEmTodos = true;
      const rodarMundos = (codigo) => mundos.map((c) => rodar(MundoRobo.pedido(c, codigo, fonteRobo)));
      const r1 = rodarMundos(m.solucao);
      r1.forEach((r, i) => {
        if (!passa(r)) erro(`${ref}: no ${mundos[i].nome}, a solução não entrega: ${r.erro ? r.erro.mensagem : 'caixas fora do destino'}`);
        maiorPassos = Math.max(maiorPassos, (r.eventos || []).length);
        const js = MundoRobo.executar(mundos[i], m.solucao);
        if (js.naoSuporta) erro(`${ref}: o interpretador do celular não entende a solução (${js.naoSuporta})`);
        else if (JSON.stringify(js.eventos) !== JSON.stringify(r.eventos) || !js.entregue) erro(`${ref}: no ${mundos[i].nome}, o JavaScript e o Python não fazem o mesmo`);
      });
      if (JSON.stringify(rodarMundos(m.solucao).map((r) => r.eventos)) !== JSON.stringify(r1.map((r) => r.eventos))) erro(`${ref}: a solução dá resultados diferentes a cada execução`);
      rodarMundos(m.codigoInicial || '').forEach((r) => { if (!passa(r)) inicialPassaEmTodos = false; });
      if (inicialPassaEmTodos) erro(`${ref}: o código inicial já resolve a missão`);
      if (linhas > m.metas.linhas) erro(`${ref}: a solução tem ${linhas} linhas e a meta é ${m.metas.linhas}`);
      if (m.metas.passos && maiorPassos > m.metas.passos) erro(`${ref}: a solução usa ${maiorPassos} passos e a meta é ${m.metas.passos}`);
      if (mundos.length > 1) {
        // a decisão tem de ser necessária: a sequência que resolve um mundo não resolve todos
        const algumaSequenciaResolveTodos = r1.some((r) => {
          const seq = (r.eventos || []).filter((e) => e.ok).map((e) => `${e.acao}()`).join('\n');
          return mundos.every((c) => passa(rodar(MundoRobo.pedido(c, seq, fonteRobo))));
        });
        if (algumaSequenciaResolveTodos) erro(`${ref}: uma sequência simples resolve todos os mundos; a decisão não é necessária`);
      }
      // o mesmo erro (bater na parede) nos dois mundos de execução
      const pyErr = rodar(MundoRobo.pedido(mundos[0], `${'\n'.repeat(98)}soltar()\n`, fonteRobo));
      const jsErr = MundoRobo.executar(mundos[0], `${'\n'.repeat(98)}soltar()\n`);
      if (!pyErr.erro || pyErr.erro.mensagem !== jsErr.erro) erro(`${ref}: a mensagem de erro do JavaScript e do Python não bate`);
      const cmds = MundoRobo.comandosDoCodigo(m.solucao);
      if (!cmds && !(m.toque && m.toque.modelo) && m.toque !== false) aviso(`${ref}: a solução usa laço ou condição; falta o modo toque com lacunas`);
      if (m.toque && m.toque.modelo) {
        const preenchido = conferirLacunas(m, ref);
        mundos.forEach((c, i) => {
          const js = MundoRobo.executar(c, preenchido);
          if (js.naoSuporta || !js.entregue) erro(`${ref}: no modo toque, as lacunas certas não entregam no ${mundos[i].nome}`);
          if (!passa(rodar(MundoRobo.pedido(c, preenchido, fonteRobo)))) erro(`${ref}: as lacunas certas não passam no Python (${mundos[i].nome})`);
        });
      }
      console.log(`  ok    ${ref} · ${m.titulo} · ${linhas} linhas · ${maiorPassos} passos · ${mundos.length} mundo(s)`);
      continue;
    }

    // Python puro (Primeiros Programas, Caça-Bugs, Oficina de Funções)
    // programa com input(): roda com as entradas do primeiro teste de saída (no navegador, quem digita é o aluno)
    const entradasBase = m.entradas || ((m.testes || []).find((t) => t.tipo === 'saida' && t.entradas) || {}).entradas;
    const pedidoDe = (codigo) => ({ codigo, prelude: m.prelude || '', arquivos: m.arquivos, testes: m.testes, entradas: entradasBase });
    const r1 = rodar(pedidoDe(m.solucao));
    if (!passa(r1)) erro(`${ref}: a solução não passa: ${r1.erro ? `${r1.erro.tipo}: ${r1.erro.mensagem}` : r1.testes.filter((t) => !t.passou).map((t) => t.nome + ' — ' + t.mensagem).join('; ')}`);
    const r2 = rodar(pedidoDe(m.solucao));
    const r3 = rodar(pedidoDe(m.solucao));
    const igual = (a, b) => JSON.stringify([a.saida, a.eventos, a.testes]) === JSON.stringify([b.saida, b.eventos, b.testes]);
    if (!igual(r1, r2) || !igual(r1, r3)) erro(`${ref}: a solução dá resultados diferentes a cada execução`);
    const ri = rodar(pedidoDe(m.codigoInicial || ''));
    if (passa(ri)) erro(`${ref}: o código inicial já resolve a missão`);
    if (linhas > m.metas.linhas) erro(`${ref}: a solução tem ${linhas} linhas e a meta é ${m.metas.linhas}`);
    const visivel = (m.testes || []).some((t) => t.tipo === 'saida' && !t.oculto) || (Array.isArray(m.exemplos) && m.exemplos.length);
    if (!visivel) erro(`${ref}: falta um objetivo à vista (teste de saída visível ou "exemplos")`);
    if (m.defeitos && !(m.defeitos >= 1 && m.defeitos <= 3)) erro(`${ref}: "defeitos" vai de 1 a 3`);
    if (m.toque && m.toque.modelo) {
      const preenchido = conferirLacunas(m, ref);
      const rt = rodar(pedidoDe(preenchido));
      if (!passa(rt)) erro(`${ref}: no modo toque, as lacunas certas não passam: ${rt.erro ? rt.erro.mensagem : rt.testes.filter((t) => !t.passou).map((t) => t.nome).join('; ')}`);
    }
    console.log(`  ok    ${ref} · ${m.titulo} · ${linhas} linhas`);
  }
  if (GRAVAR && mudou) {
    writeFileSync(join(raiz, arq), `${JSON.stringify(lab, null, 2)}\n`);
    console.log('  gravado: rastreios da Lupa atualizados');
    mudou = false;
  }
}

console.log(`\n${arquivos.length} laboratório(s) · ${erros} erro(s) · ${avisos} aviso(s)`);
process.exit(erros ? 1 : 0);

#!/usr/bin/env node
/*
 * montar-aulas.mjs — transforma o texto do Professor Diver (formato .aula) nas fases, questões,
 * variantes, fichas e blocos de jogo de um curso por matéria (data/trilhas/<curso>.json).
 *
 * Por que existe: um curso do Enem tem dezenas de aulas com ~20 questões cada, comentário em todas
 * as alternativas e uma variante por questão. Escrever isso direto em JSON é lento e fácil de errar.
 * O formato .aula é texto corrido; este script cuida do resto:
 *   - ids estáveis derivados do id da aula (o id da aula nunca leva número);
 *   - a alternativa certa é escrita primeiro e o script a sorteia de posição (sempre a mesma para o mesmo id),
 *     levando junto o comentário de cada alternativa;
 *   - confere as contas marcadas com "! confere:" (expressão que tem de dar verdadeiro);
 *   - numera aulas e módulos (numerar-aulas.mjs), atualiza o catálogo e o indice.json.
 * A aula que já existe no curso é trocada no mesmo lugar (mesmo id); aula nova entra no fim, na ordem do arquivo.
 *
 * Uso: node scripts/montar-aulas.mjs <arquivo.aula> [mais.aula ...] --curso data/trilhas/enem-matematica.json
 *
 * ---------- O formato .aula (uma linha por item; linhas em branco separam parágrafos) ----------
 * @@ aula <id>                 começa uma aula
 * nome: / modulo: / moduloId: em-mat-m1 / habilidades: H1, H3 / bncc: EM13MAT104, EF07MA02 / minutos: 35 / novaEm: AAAA-MM-DD
 *                              (bncc: códigos da BNCC para a equipe, sem ir para a descrição; habilidades: Matriz do Enem, vai para a descrição)
 * intro: <texto>               introdução do "Antes de mergulhar"
 * ## <título>                  seção do artigo; os parágrafos vêm nas linhas seguintes
 * mapa: <centro>               mapa mental; ramos nas linhas "- Ramo: item; item; item"
 * assoc: emoji | conceito | liga | porquê
 * tabela: título | coluna | coluna     linhas: "- célula | célula"
 * linha: quando | fato         linha do tempo
 * pontos:  /  perolas:         itens nas linhas "- ..."
 * reforcar: termo; termo; termo
 * ?? <facil|medio|dificil> | <tema>     questão: enunciado nas linhas seguintes, depois
 *   + alternativa certa [>> comentário]
 *   - alternativa errada >> por que está errada
 *   = explicação (termina com "Dica de mergulhador: ...")
 *   ! confere: <expressão JS que dá true>     ! revisar: <motivo>
 *   ! copia: <id>     a questão veio de outro curso (campo copiaDe; ex.: a Retomada copiando da Travessia, com id novo)
 * ~~                           variante da questão anterior (mesmo formato, sem a linha ??)
 * ficha: <tema>   e depois "texto: ...", "ponto: ...", "pegadinha: ..."
 * par: termo :: definição
 * vf: V|F | afirmação :: explicação
 * seq: título :: item > item > item :: explicação
 * adv: <dificuldade> | resposta | aceita; aceita | dica; dica; dica :: explicação
 * pal: palavra :: dica
 *
 * ---------- Tecnologia (Explora Tech, 2026-10-13) ----------
 * lab: <id>[, <id>]            a aula aponta para um ou mais laboratórios "Mão na massa" (fases[].laboratorio), na ordem
 * ```python … ```              dentro do enunciado: o código da questão (campo "codigo", recuo preservado);
 *                              dentro de uma seção do artigo: um bloco de código
 * ! alternativas-codigo        as alternativas são código ou saída (monoespaçadas; "\n" vira quebra de linha)
 * ! entradas: a; b             o que o input() recebe quando o script roda o código da questão
 * ! saida                      roda o código no Python do curso e compara a saída com a alternativa certa
 * ! saida: <texto>             idem, comparando com o texto dado ("\n" vira quebra de linha)
 * ! confere-py: <expressão>    roda o código e a expressão Python (sobre as variáveis dele) tem de dar True
 * ! erro: <TipoDeErro>         roda o código e ele tem de parar com esse erro (ex.: NameError)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { numerar } from './numerar-aulas.mjs';
import { atualizarCatalogo } from './gerar-catalogo.mjs';

const dois = (n) => String(n).padStart(2, '0');
/** Hash pequeno e estável (FNV-1a) para sortear a posição da certa sempre igual para o mesmo id. */
function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function lerAulas(texto, origem = 'texto') {
  const aulas = [];
  const fichas = {};
  let aula = null;
  let q = null; // questão (ou variante) em montagem
  let lista = null; // onde vão as linhas "- ..." (ramos, tabela, pontos, pérolas)
  let secao = null;
  let ficha = null;
  let enunciadoAberto = false;
  let cerca = null; // bloco ``` aberto: { onde: 'questao' | 'secao', linhas: [], linguagem }
  const erro = (n, msg) => { throw new Error(`${origem}:${n}: ${msg}`); };

  const fecharQuestao = () => {
    if (!q) return;
    if (!q.alternativas.length) erro(q.linha, 'questão sem alternativas');
    q.enunciado = q.enunciado.filter(Boolean).join(' ').trim();
    q = null;
    enunciadoAberto = false;
  };
  const novaQuestao = (n, base) => ({ linha: n, enunciado: [], alternativas: [], comentarios: [], certa: -1, explicacao: '', confere: [], python: [], entradas: null, codigo: '', altCodigo: false, ...base });

  texto.split(/\r?\n/).forEach((bruta, i) => {
    const n = i + 1;
    const linha = bruta.trimEnd();
    const t = linha.trim();
    // bloco de código (``` ... ```): as linhas entram como estão, com o recuo
    if (cerca) {
      if (t === '```') {
        const texto = cerca.linhas.join('\n');
        if (cerca.onde === 'questao') q.codigo = texto;
        else secao.texto.push(`\`\`\`${cerca.linguagem}\n${texto}\n\`\`\``);
        cerca = null;
      } else cerca.linhas.push(linha);
      return;
    }
    if (/^```[a-z]*$/.test(t)) {
      if (q && enunciadoAberto) cerca = { onde: 'questao', linhas: [], linguagem: t.slice(3) };
      else if (secao && !q) cerca = { onde: 'secao', linhas: [], linguagem: t.slice(3) };
      else erro(n, 'bloco de código fora de um enunciado ou de uma seção do artigo');
      return;
    }
    if (t.startsWith('@@ aula ')) {
      fecharQuestao();
      aula = { id: t.slice(8).trim(), resumo: { secoes: [] }, questoes: [], blocos: { pares: [], verdadeiroFalso: [], sequencias: [], adivinhas: [], palavras: [] }, linha: n };
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(aula.id)) erro(n, `id de aula inválido: ${aula.id}`);
      aulas.push(aula); lista = null; secao = null; ficha = null;
      return;
    }
    if (!aula) { if (t) erro(n, 'texto antes de "@@ aula"'); return; }

    // ---------- dentro de uma questão ----------
    if (t === '~~') {
      if (!q && !aula.questoes.length) erro(n, 'variante sem questão antes');
      const original = q && !q.varianteDe ? q : aula.ultimaOriginal;
      fecharQuestao();
      q = novaQuestao(n, { varianteDe: original, dificuldade: original.dificuldade, tema: original.tema });
      original.variantes.push(q);
      enunciadoAberto = true; lista = null; secao = null; ficha = null;
      return;
    }
    if (t.startsWith('?? ')) {
      fecharQuestao();
      const [dif, ...tema] = t.slice(3).split('|').map((x) => x.trim());
      if (!['facil', 'medio', 'dificil'].includes(dif)) erro(n, `dificuldade "${dif}"`);
      q = novaQuestao(n, { dificuldade: dif, tema: tema.join(' | '), variantes: [] });
      aula.questoes.push(q); aula.ultimaOriginal = q;
      enunciadoAberto = true; lista = null; secao = null; ficha = null;
      return;
    }
    if (q) {
      if (/^[+-] /.test(t)) {
        enunciadoAberto = false;
        const [alt, com = ''] = t.slice(2).split(' >> ');
        if (t[0] === '+') { if (q.certa >= 0) erro(n, 'duas alternativas certas'); q.certa = q.alternativas.length; }
        q.alternativas.push(alt.trim()); q.comentarios.push(com.trim());
        return;
      }
      if (t.startsWith('= ')) { q.explicacao = (q.explicacao ? q.explicacao + ' ' : '') + t.slice(2).trim(); enunciadoAberto = false; return; }
      if (t.startsWith('! confere:')) { q.confere.push([t.slice(10).trim(), n]); return; }
      if (t.startsWith('! revisar:')) { q.revisar = t.slice(10).trim(); return; }
      if (t.startsWith('! copia:')) { q.copiaDe = t.slice(8).trim(); return; }
      if (t === '! alternativas-codigo') { q.altCodigo = true; return; }
      if (t.startsWith('! entradas:')) { q.entradas = t.slice(11).split(';').map((x) => x.trim()); return; }
      if (t === '! saida') { q.python.push({ tipo: 'saida', linha: n }); return; }
      if (t.startsWith('! saida:')) { q.python.push({ tipo: 'saida', esperada: t.slice(8).trim().replace(/\\n/g, '\n'), linha: n }); return; }
      if (t.startsWith('! confere-py:')) { q.python.push({ tipo: 'expr', expr: t.slice(13).trim(), linha: n }); return; }
      if (t.startsWith('! erro:')) { q.python.push({ tipo: 'erro', erro: t.slice(7).trim(), linha: n }); return; }
      if (enunciadoAberto) { q.enunciado.push(t); return; }
      if (!t) return;
      fecharQuestao();
    }

    // ---------- blocos e fichas ----------
    if (!t) { return; }
    const campo = /^([a-zA-Z]+):\s?(.*)$/.exec(t);
    const chave = campo ? campo[1] : null;
    const valor = campo ? campo[2].trim() : '';
    if (chave === 'ficha') { ficha = { texto: [], pontos: [], pegadinhas: [] }; fichas[valor] = ficha; lista = null; secao = null; return; }
    if (ficha && ['texto', 'ponto', 'pegadinha'].includes(chave)) {
      ficha[chave === 'texto' ? 'texto' : chave === 'ponto' ? 'pontos' : 'pegadinhas'].push(valor);
      return;
    }
    ficha = null;
    const r = aula.resumo;
    switch (chave) {
      case 'nome': aula.nome = valor; return;
      case 'modulo': aula.modulo = valor; return;
      case 'moduloId': aula.moduloId = valor; return;
      case 'bncc': aula.bncc = valor.split(',').map((x) => x.trim()).filter(Boolean); return;
      case 'habilidades': aula.habilidades = valor.split(',').map((x) => x.trim()).filter(Boolean); return;
      case 'minutos': aula.minutos = Number(valor); return;
      case 'novaEm': aula.novaEm = valor; return;
      case 'lab': { const ids = valor.split(',').map((x) => x.trim()).filter(Boolean); aula.laboratorio = ids.length > 1 ? ids : ids[0]; return; }
      case 'intro': r.introducao = valor; secao = null; lista = null; return;
      case 'mapa': r.mapaMental = { centro: valor, ramos: [] }; lista = 'ramos'; secao = null; return;
      case 'assoc': {
        const [icone, conceito, liga, porque] = valor.split('|').map((x) => x.trim());
        if (!porque) erro(n, 'assoc precisa de 4 partes: emoji | conceito | liga | porquê');
        (r.associacoes ||= []).push({ icone, conceito, liga, porque }); secao = null; lista = null; return;
      }
      case 'tabela': { const [titulo, ...colunas] = valor.split('|').map((x) => x.trim()); r.tabela = { titulo, colunas, linhas: [] }; lista = 'tabela'; secao = null; return; }
      case 'linha': { const [quando, fato] = valor.split('|').map((x) => x.trim()); (r.linhaDoTempo ||= []).push({ quando, fato }); secao = null; lista = null; return; }
      case 'pontos': r.pontos = []; lista = 'pontos'; secao = null; return;
      case 'perolas': r.perolas = []; lista = 'perolas'; secao = null; return;
      case 'reforcar': r.reforcar = valor.split(';').map((x) => x.trim()).filter(Boolean); secao = null; lista = null; return;
      case 'par': { const [termo, definicao] = valor.split('::').map((x) => x.trim()); aula.blocos.pares.push({ termo, definicao }); return; }
      case 'vf': {
        const [vf, resto] = [valor.slice(0, 1), valor.replace(/^[VF]\s*\|\s*/, '')];
        const [afirmacao, explicacao] = resto.split('::').map((x) => x.trim());
        aula.blocos.verdadeiroFalso.push({ afirmacao, verdadeira: vf === 'V', explicacao }); return;
      }
      case 'seq': { const [titulo, itens, explicacao] = valor.split('::').map((x) => x.trim()); aula.blocos.sequencias.push({ titulo, itens: itens.split('>').map((x) => x.trim()), explicacao }); return; }
      case 'adv': {
        const [cabeca, explicacao] = valor.split('::').map((x) => x.trim());
        const [dificuldade, resposta, aceitas, dicas] = cabeca.split('|').map((x) => x.trim());
        aula.blocos.adivinhas.push({ dificuldade, resposta, aceitas: aceitas.split(';').map((x) => x.trim()).filter(Boolean), dicas: dicas.split(';').map((x) => x.trim()).filter(Boolean), explicacao }); return;
      }
      case 'pal': { const [palavra, dica] = valor.split('::').map((x) => x.trim()); aula.blocos.palavras.push({ palavra, dica }); return; }
      default: break;
    }
    if (t.startsWith('## ')) { secao = { titulo: t.slice(3).trim(), texto: [] }; r.secoes.push(secao); lista = null; return; }
    if (t.startsWith('- ') && lista) {
      const item = t.slice(2).trim();
      if (lista === 'ramos') { const [titulo, itens = ''] = item.split(/:\s(.+)/); r.mapaMental.ramos.push({ titulo: titulo.trim(), itens: itens.split(';').map((x) => x.trim()).filter(Boolean) }); }
      else if (lista === 'tabela') r.tabela.linhas.push(item.split('|').map((x) => x.trim()));
      else r[lista].push(item);
      return;
    }
    if (secao) { secao.texto.push(t); return; }
    erro(n, `linha que não sei onde pôr: "${t.slice(0, 60)}"`);
  });
  fecharQuestao();
  return { aulas, fichas };
}

/** Sorteia a posição da certa (estável pelo id), levando junto os comentários. */
function embaralhar(q, id) {
  const ordem = q.alternativas.map((_, i) => i);
  let h = hash(id);
  for (let i = ordem.length - 1; i > 0; i--) { const j = h % (i + 1); h = Math.floor(h / (i + 1)) || hash(id + i); [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; }
  return {
    alternativas: ordem.map((i) => q.alternativas[i]),
    comentarios: ordem.map((i) => (i === q.certa ? q.comentarios[i] || '' : q.comentarios[i])),
    correta: ordem.indexOf(q.certa),
  };
}

function conferirContas(q, origem) {
  for (const [expr, n] of q.confere) {
    let ok;
    try { ok = Function('Math', `"use strict"; return (${expr});`)(Math); } catch (e) { throw new Error(`${origem}:${n}: conta inválida (${e.message}): ${expr}`); }
    if (ok !== true) throw new Error(`${origem}:${n}: a conta não confere: ${expr}`);
  }
}

/** Conferências no Python (questões de código) juntadas durante a montagem; rodadas por conferirPython(). */
const CONFERIR_PYTHON = [];

/**
 * Roda cada código de questão no MESMO Python dos laboratórios (Pyodide de lib/pyodide, no Node):
 * a saída tem de bater com a alternativa certa (ou com o texto dado), a expressão tem de dar True,
 * ou o programa tem de parar com o erro indicado. Devolve a lista de problemas (vazia = tudo certo).
 */
export async function conferirPython(lista = CONFERIR_PYTHON) {
  if (!lista.length) return [];
  const raiz = resolve(dirname(new URL(import.meta.url).pathname), '..');
  const { loadPyodide } = await import(join(raiz, 'lib/pyodide/pyodide.mjs'));
  const py = await loadPyodide({ indexURL: join(raiz, 'lib/pyodide') + '/', stdout: () => {}, stderr: () => {} });
  py.FS.mkdirTree('/home/pyodide');
  py.FS.writeFile('/home/pyodide/diver_lab.py', readFileSync(join(raiz, 'laboratorio/diver_lab.py'), 'utf8'));
  py.runPython('import sys\nsys.path.insert(0, "/home/pyodide")\nimport diver_lab\ndiver_lab.travar()');
  const executar = py.globals.get('diver_lab').executar;
  const problemas = [];
  for (const c of lista) {
    const ref = `${c.origem}:${c.linha} (${c.id})`;
    const pedido = { codigo: c.codigo, entradas: c.entradas || [] };
    if (c.tipo === 'expr') pedido.testes = [{ nome: 'confere', codigo: `assert (${c.expr}), "deu False"` }];
    const r = JSON.parse(executar(JSON.stringify(pedido)));
    if (r.precisaEntrada) { problemas.push(`${ref}: o código pede input() e faltou "! entradas:"`); continue; }
    if (c.tipo === 'erro') {
      if (!r.erro || r.erro.tipo !== c.erro) problemas.push(`${ref}: era para parar com ${c.erro}, mas ${r.erro ? `parou com ${r.erro.tipo}` : 'rodou sem erro'}`);
      continue;
    }
    if (r.erro && !(c.tipo === 'saida' && c.comErro)) { problemas.push(`${ref}: o código parou com ${r.erro.tipo}: ${r.erro.mensagem}`); continue; }
    if (c.tipo === 'saida') {
      const esperada = (c.esperada !== undefined ? c.esperada : c.certa).replace(/\s+$/, '');
      const obtida = r.saida.replace(/\s+$/, '');
      if (obtida !== esperada) problemas.push(`${ref}: a saída não bate.\n    esperada: ${JSON.stringify(esperada)}\n    obtida:   ${JSON.stringify(obtida)}`);
    } else if (c.tipo === 'expr' && !(r.testes[0] && r.testes[0].passou)) {
      problemas.push(`${ref}: "${c.expr}" não deu True (${r.testes[0] ? r.testes[0].mensagem : 'sem teste'})`);
    }
  }
  return problemas;
}

function questaoJSON(q, id, fase, origem, base = {}) {
  if (q.certa < 0) throw new Error(`${origem}:${q.linha}: questão sem alternativa certa (+)`);
  q.alternativas.forEach((a, i) => { if (i !== q.certa && !q.comentarios[i]) throw new Error(`${origem}:${q.linha}: alternativa errada sem comentário: "${a}"`); });
  if (new Set(q.alternativas.map(semAcento)).size !== q.alternativas.length) throw new Error(`${origem}:${q.linha}: alternativas repetidas`);
  if (!/Dica de mergulhador:/.test(q.explicacao)) throw new Error(`${origem}:${q.linha}: explicação sem "Dica de mergulhador:"`);
  conferirContas(q, origem);
  if (q.altCodigo) q.alternativas = q.alternativas.map((a) => a.replace(/\\n/g, '\n'));
  if (q.python.some((c) => c.tipo !== 'expr') && !q.codigo) throw new Error(`${origem}:${q.linha}: "! saida" ou "! erro" sem bloco de código na questão`); // "! confere-py" pode vir sem código
  const comErro = q.python.some((c) => c.tipo === 'erro'); // "! saida" + "! erro": o que aparece antes de o programa parar
  q.python.forEach((c) => CONFERIR_PYTHON.push({ ...c, id, origem, codigo: q.codigo, entradas: q.entradas, certa: q.alternativas[q.certa], comErro }));
  const { alternativas, comentarios, correta } = embaralhar(q, id);
  const out = { id, ...base, tema: q.tema, dificuldade: q.dificuldade, fase, enunciado: q.enunciado };
  if (q.codigo) out.codigo = q.codigo;
  Object.assign(out, { alternativas, correta });
  if (q.altCodigo) out.alternativasCodigo = true;
  Object.assign(out, { explicacao: q.explicacao, comentarios });
  if (q.revisar) out.revisar = q.revisar;
  if (q.copiaDe) out.copiaDe = q.copiaDe;
  return out;
}

/** Junta as aulas lidas no curso (troca as que já existem, acrescenta as novas no fim). */
export function aplicarAulas(trilha, { aulas, fichas }, origem = 'texto') {
  trilha.questoes ||= [];
  trilha.variantes ||= [];
  for (const k of ['pares', 'verdadeiroFalso', 'sequencias', 'adivinhas', 'palavras']) trilha[k] ||= [];
  trilha.fichas ||= {};
  const temaCurso = trilha.nome.replace(/^(Mergulho no Enem|Enem|Ensino Médio)\s*·\s*/, '');
  for (const a of aulas) {
    if (!a.nome || !a.modulo) throw new Error(`${origem}:${a.linha}: aula ${a.id} sem nome ou módulo`);
    const fase = { id: a.id, nome: a.nome, modulo: a.modulo, descricao: '' };
    if (a.moduloId) fase.moduloId = a.moduloId;
    if (a.habilidades) fase.habilidades = a.habilidades;
    if (a.bncc) fase.bncc = a.bncc;
    if (a.minutos) fase.minutos = a.minutos;
    if (a.novaEm) fase.novaEm = a.novaEm;
    if (a.laboratorio) fase.laboratorio = a.laboratorio;
    fase.resumo = a.resumo;
    const i = trilha.fases.findIndex((f) => f.id === a.id);
    if (i >= 0) trilha.fases[i] = fase; else trilha.fases.push(fase);

    // tira o que era desta aula e põe o novo
    const daAula = (x) => x.fase === a.id;
    const velhas = new Set(trilha.questoes.filter(daAula).map((x) => x.id));
    trilha.questoes = trilha.questoes.filter((x) => !daAula(x));
    trilha.variantes = trilha.variantes.filter((x) => !velhas.has(x.varianteDe) && !daAula(x));
    const prefixo = `${a.id}-`;
    for (const k of ['pares', 'verdadeiroFalso', 'sequencias', 'adivinhas', 'palavras']) trilha[k] = trilha[k].filter((x) => !x.id.startsWith(prefixo));

    a.questoes.forEach((q, k) => {
      const id = `${a.id}-q${dois(k + 1)}`;
      trilha.questoes.push(questaoJSON(q, id, a.id, origem));
      q.variantes.forEach((v, j) => trilha.variantes.push(questaoJSON(v, `${id}-v${j + 1}`, a.id, origem, { varianteDe: id })));
    });
    const temaBloco = a.nome;
    a.blocos.pares.forEach((p, k) => trilha.pares.push({ id: `${a.id}-par-${dois(k + 1)}`, tema: temaBloco, termo: p.termo, definicao: p.definicao }));
    a.blocos.verdadeiroFalso.forEach((p, k) => trilha.verdadeiroFalso.push({ id: `${a.id}-vf-${dois(k + 1)}`, tema: temaBloco, ...p }));
    a.blocos.sequencias.forEach((p, k) => trilha.sequencias.push({ id: `${a.id}-seq-${dois(k + 1)}`, tema: temaBloco, ...p }));
    a.blocos.adivinhas.forEach((p, k) => trilha.adivinhas.push({ id: `${a.id}-adv-${dois(k + 1)}`, tema: temaBloco, ...p }));
    a.blocos.palavras.forEach((p, k) => trilha.palavras.push({ id: `${a.id}-pal-${dois(k + 1)}`, tema: temaCurso, ...p }));
  }
  Object.assign(trilha.fichas, fichas);
  return trilha;
}

// ---------- linha de comando ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const ic = args.indexOf('--curso');
  if (ic < 0 || !args[ic + 1]) { console.log('Uso: node scripts/montar-aulas.mjs <arquivo.aula> [...] --curso data/trilhas/<curso>.json'); process.exit(2); }
  const caminho = resolve(args[ic + 1]);
  const arquivos = args.filter((_, i) => i !== ic && i !== ic + 1);
  if (!existsSync(caminho)) { console.error(`Curso não encontrado: ${caminho} (crie o cabeçalho primeiro)`); process.exit(1); }
  const trilha = JSON.parse(readFileSync(caminho, 'utf8'));
  try {
    for (const arq of arquivos) aplicarAulas(trilha, lerAulas(readFileSync(arq, 'utf8'), basename(arq)), basename(arq));
  } catch (e) { console.error('ERRO', e.message); process.exit(1); }
  if (CONFERIR_PYTHON.length) {
    const problemas = await conferirPython();
    if (problemas.length) { problemas.forEach((p) => console.error('ERRO (Python)', p)); process.exit(1); }
    console.log(`Python: ${CONFERIR_PYTHON.length} conferência(s) de código, todas certas.`);
  }
  const { avisos } = numerar(trilha);
  avisos.forEach((a) => console.log('AVISO (numeração):', a));
  writeFileSync(caminho, `${JSON.stringify(trilha, null, 2)}\n`);
  // o curso entra no índice e no catálogo
  const pasta = dirname(caminho);
  const indice = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8'));
  if (!indice.includes(basename(caminho))) { indice.push(basename(caminho)); writeFileSync(join(pasta, 'indice.json'), `${JSON.stringify(indice, null, 2)}\n`); console.log('Curso acrescentado ao indice.json.'); }
  atualizarCatalogo(pasta);
  console.log(`${basename(caminho)}: ${trilha.fases.length} aulas, ${trilha.questoes.length} questões, ${trilha.variantes.length} variantes, ${Object.keys(trilha.fichas).length} fichas.`);
}

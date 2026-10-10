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
 * nome: / modulo: / habilidades: H1, H3 / minutos: 35 / novaEm: AAAA-MM-DD
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
 * ~~                           variante da questão anterior (mesmo formato, sem a linha ??)
 * ficha: <tema>   e depois "texto: ...", "ponto: ...", "pegadinha: ..."
 * par: termo :: definição
 * vf: V|F | afirmação :: explicação
 * seq: título :: item > item > item :: explicação
 * adv: <dificuldade> | resposta | aceita; aceita | dica; dica; dica :: explicação
 * pal: palavra :: dica
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
  const erro = (n, msg) => { throw new Error(`${origem}:${n}: ${msg}`); };

  const fecharQuestao = () => {
    if (!q) return;
    if (!q.alternativas.length) erro(q.linha, 'questão sem alternativas');
    q.enunciado = q.enunciado.filter(Boolean).join(' ').trim();
    q = null;
    enunciadoAberto = false;
  };
  const novaQuestao = (n, base) => ({ linha: n, enunciado: [], alternativas: [], comentarios: [], certa: -1, explicacao: '', confere: [], ...base });

  texto.split(/\r?\n/).forEach((bruta, i) => {
    const n = i + 1;
    const linha = bruta.trimEnd();
    const t = linha.trim();
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
      case 'habilidades': aula.habilidades = valor.split(',').map((x) => x.trim()).filter(Boolean); return;
      case 'minutos': aula.minutos = Number(valor); return;
      case 'novaEm': aula.novaEm = valor; return;
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

function questaoJSON(q, id, fase, origem, base = {}) {
  if (q.certa < 0) throw new Error(`${origem}:${q.linha}: questão sem alternativa certa (+)`);
  q.alternativas.forEach((a, i) => { if (i !== q.certa && !q.comentarios[i]) throw new Error(`${origem}:${q.linha}: alternativa errada sem comentário: "${a}"`); });
  if (new Set(q.alternativas.map(semAcento)).size !== q.alternativas.length) throw new Error(`${origem}:${q.linha}: alternativas repetidas`);
  if (!/Dica de mergulhador:/.test(q.explicacao)) throw new Error(`${origem}:${q.linha}: explicação sem "Dica de mergulhador:"`);
  conferirContas(q, origem);
  const { alternativas, comentarios, correta } = embaralhar(q, id);
  const out = { id, ...base, tema: q.tema, dificuldade: q.dificuldade, fase, enunciado: q.enunciado, alternativas, correta, explicacao: q.explicacao, comentarios };
  if (q.revisar) out.revisar = q.revisar;
  return out;
}

/** Junta as aulas lidas no curso (troca as que já existem, acrescenta as novas no fim). */
export function aplicarAulas(trilha, { aulas, fichas }, origem = 'texto') {
  trilha.questoes ||= [];
  trilha.variantes ||= [];
  for (const k of ['pares', 'verdadeiroFalso', 'sequencias', 'adivinhas', 'palavras']) trilha[k] ||= [];
  trilha.fichas ||= {};
  const temaCurso = trilha.nome.replace(/^Enem · /, '');
  for (const a of aulas) {
    if (!a.nome || !a.modulo) throw new Error(`${origem}:${a.linha}: aula ${a.id} sem nome ou módulo`);
    const fase = { id: a.id, nome: a.nome, modulo: a.modulo, descricao: '' };
    if (a.habilidades) fase.habilidades = a.habilidades;
    if (a.minutos) fase.minutos = a.minutos;
    if (a.novaEm) fase.novaEm = a.novaEm;
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

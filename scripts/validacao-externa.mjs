#!/usr/bin/env node
/*
 * validacao-externa.mjs — validação do conteúdo numa IA de fora (o usuário usa o Gemini, num Gem),
 * sem API e sem custo de API (pedido do usuário, 2026-10-16; guia em docs/VALIDACAO_EXTERNA.md).
 * NÃO chama IA nenhuma: só monta os arquivos que o usuário anexa no Gemini e grava de volta o que ele trouxer.
 *
 * Comandos:
 *   exportar [E1] [--saida <pasta>] [--tipos Q,A,F,C,L,P,K] [--cursos a,b] [--tudo] [--substituir]
 *       Monta o pacote: lotes de questões em 2 partes (A sem gabarito, B com gabarito e o esqueleto JSON),
 *       lotes de conteúdo (A artigos, F fichas, C cartas, L laboratórios, P profissões, K calendário),
 *       o prompt do Gem, o guia e o índice. Grava o manifesto em data/validacao-externa/<E>.json
 *       (lote → itens e a impressão digital de cada um, para saber depois se o texto mudou).
 *       Sem --tudo, questões e variantes já aprovadas (validacao.pronta) e sem mudança ficam de fora.
 *   aplicar <arquivo|pasta>... [--simular]
 *       Lê os blocos JSON que o Gemini devolveu (colados em .txt, .md ou .json), confere com o manifesto
 *       e grava: o bloco "validacao" nas questões e variantes (a Revisão só mostra variante com
 *       validacao.pronta), a 2ª reprovação vai para "emRevisao" (mesma regra do Mergulho Triplo),
 *       e cada problema apontado vira uma pendência em data/validacao-externa/pendencias.json.
 *   progresso [E1]
 *       Mostra e grava docs/validacao-externa/PROGRESSO.md (lotes feitos por curso, vereditos, pendências).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, resolve, relative, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { RAIZ } from './lib/config.mjs';
import { gravarJSON } from './lib/acervo.mjs';
import { atualizarCatalogo } from './gerar-catalogo.mjs';
import { assinatura, explicacaoEmTexto } from '../supabase/functions/_shared/mergulho-nucleo.mjs';

const PASTA_TRILHAS = join(RAIZ, 'data', 'trilhas');
const PASTA_DADOS = join(RAIZ, 'data', 'validacao-externa');
const PASTA_DOCS = join(RAIZ, 'docs', 'validacao-externa');
const LETRAS = 'ABCDEFGH';
const hoje = () => new Date().toISOString().slice(0, 10);

/* ---------- Tamanho dos lotes (Gemini Pro: cabe com folga na resposta) ---------- */
const LIMITE_Q = 80;          // itens (questões + variantes) por lote de questões
const LIMITE_TEXTO = 45000;   // caracteres por lote de conteúdo (≈ 11 mil tokens)

/* ---------- Ordem dos cursos (a numeração dos lotes segue esta ordem; a ordem de fazer é livre) ---------- */
const ORDEM = [
  'radiologia-aparelho-digestivo', 'radiologia-musculoesqueletico', 'radiologia-cabeca-pescoco', 'radiologia-geniturinario',
  'ciberseguranca-essencial', 'iso-27001-foundation',
  'explora-tech-fundamentos',
  'enem-vestibular', 'enem-matematica', 'enem-portugues', 'enem-literatura', 'enem-redacao', 'enem-biologia', 'enem-quimica',
  'enem-fisica', 'enem-historia', 'enem-geografia', 'enem-filosofia', 'enem-sociologia', 'enem-ingles', 'enem-espanhol', 'enem-artes-ef',
  'diag:enem',
  'em-matematica', 'em-portugues', 'em-redacao', 'em-literatura', 'em-ingles', 'em-biologia', 'em-quimica', 'em-fisica',
  'em-historia', 'em-geografia', 'em-filosofia', 'em-sociologia',
  'diag:ensino-medio',
];

/** O que o validador precisa saber de cada curso (vai no topo de cada lote). */
function contexto(id) {
  if (id.startsWith('radiologia-')) return [
    'Curso de Radiologia e Diagnóstico por Imagem para médicos, residentes e radiologistas em atualização, com casos clínicos.',
    'Exige terminologia técnica correta (hiperintenso/hipersinal, hipointenso, hiperdenso, hiperecogênico, realce, restrição à difusão).',
    'Confira critérios, medidas e classificações nas diretrizes e sistemas vigentes (por exemplo, os do ACR e as classificações de uso corrente), e aponte quando uma versão foi substituída.',
    'Especialista humano do curso: uma radiologista, que vai ler tudo o que você apontar.',
  ];
  if (id === 'ciberseguranca-essencial') return [
    'Curso iniciante de cibersegurança para empresas e público geral no Brasil ("aprender a se cuidar").',
    'Contexto brasileiro: LGPD, ANPD, CERT.br, golpes comuns no país (Pix, boleto, WhatsApp).',
    'Confira boas práticas nas referências atuais (CERT.br, NIST) e os endereços oficiais citados.',
  ];
  if (id === 'iso-27001-foundation') return [
    'Preparatório para a certificação ISO/IEC 27001:2022 Foundation.',
    'A versão vigente é a 2022: Anexo A com 93 controles em 4 temas (organizacionais, pessoas, físicos e tecnológicos), detalhados na ISO/IEC 27002:2022.',
    'Conteúdo da versão 2013 (114 controles em 14 domínios) é FATO_DESATUALIZADO.',
  ];
  if (id === 'explora-tech-fundamentos') return [
    'Primeiro contato com tecnologia, para jovens e adultos iniciantes: lógica, Python, como o computador funciona, redes, Linux e Git.',
    'O Python do curso é o 3.14 (Pyodide). Nas questões com código, execute mentalmente, linha a linha, e confira a saída exata.',
    'O robô dos exercícios entende só os comandos mostrados (andar(), virar_esquerda(), virar_direita(), pegar(), soltar() e os sensores citados).',
    'Linguagem simples, mas sem errar o conceito.',
  ];
  if (id.startsWith('enem-') || id === 'diag:enem') return [
    'Preparatório para o Enem e os vestibulares, por matéria, seguindo a Matriz de Referência do Enem (Inep). As habilidades da aula aparecem como H1, H2...',
    'Questões autorais no estilo do Enem (5 alternativas, A a E), para estudantes do ensino médio e quem vai prestar o exame.',
    'Confira se o que é cobrado combina com a habilidade indicada e com o que o Enem realmente cobra.',
  ];
  if (id.startsWith('em-') || id === 'diag:ensino-medio') return [
    'Conteúdo do Ensino Médio por disciplina, como no colégio, ligado ao Enem e ao vestibular (BNCC e Matriz do Enem).',
    'Público: jovens e adultos, inclusive quem está voltando a estudar. Tom sério, nunca infantil.',
    'Questões autorais com 5 alternativas (A a E).',
  ];
  return ['Conteúdo autoral do Diver.'];
}

/* ---------- Leitura ---------- */
const lerJSON = (c) => JSON.parse(readFileSync(c, 'utf8'));
const relRaiz = (c) => relative(RAIZ, c).split('\\').join('/');

function carregarCursos() {
  const arquivos = readdirSync(PASTA_TRILHAS).filter((a) => a.endsWith('.json') && a !== 'catalogo.json' && a !== 'indice.json');
  const cursos = new Map();
  for (const a of arquivos) {
    const t = lerJSON(join(PASTA_TRILHAS, a));
    cursos.set(t.id, { id: t.id, nome: t.nome, arquivo: relRaiz(join(PASTA_TRILHAS, a)), dados: t, diag: false });
  }
  for (const d of ['enem', 'ensino-medio']) {
    const c = join(RAIZ, 'data', 'diagnostica', `${d}.json`);
    if (!existsSync(c)) continue;
    const t = lerJSON(c);
    cursos.set(`diag:${d}`, { id: `diag:${d}`, nome: `Avaliação diagnóstica · ${t.nome || d}`, arquivo: relRaiz(c), dados: t, diag: true });
  }
  const ordem = [...ORDEM.filter((id) => cursos.has(id)), ...[...cursos.keys()].filter((id) => !ORDEM.includes(id)).sort()];
  return ordem.map((id) => cursos.get(id));
}

/** Impressão digital do texto: a mesma do Mergulho Triplo nas trilhas; nas diagnósticas entra também o texto de apoio. */
async function marca(q, diag) {
  if (!diag) return assinatura(q);
  return createHash('sha1').update(JSON.stringify([q.texto || '', q.enunciado, q.alternativas, q.correta, q.explicacao, q.comentarios || []])).digest('hex').slice(0, 12);
}

/* ---------- Texto ---------- */
const limpar = (s) => String(s ?? '').replace(/\r/g, '').trim();
const dificuldade = (d) => ({ facil: 'fácil', medio: 'médio', dificil: 'difícil' }[d] || d || '?');
const blocoCodigo = (codigo, ling = 'python') => '```' + ling + '\n' + limpar(codigo) + '\n```';

function alternativasA(q) {
  return (q.alternativas || []).map((a, i) => q.alternativasCodigo
    ? `${LETRAS[i]})\n${blocoCodigo(a)}`
    : `${LETRAS[i]}) ${limpar(a)}`).join('\n');
}

/* ---------- Lotes de QUESTÕES ---------- */
/** Itens do curso por aula: cada questão seguida das suas variantes (o validador compara as duas). */
function gruposPorAula(curso) {
  const t = curso.dados;
  if (curso.diag) {
    const porTema = new Map();
    (t.questoes || []).forEach((q) => { const k = q.area || q.disciplina || 'geral'; if (!porTema.has(k)) porTema.set(k, []); porTema.get(k).push([{ tipo: 'questao', q }]); });
    return [...porTema].map(([k, grupos]) => ({ fase: { id: `diag-${k}`, nome: `Avaliação diagnóstica · ${k}` }, grupos }));
  }
  const fases = t.fases || [];
  const variantesDe = new Map();
  (t.variantes || []).forEach((v) => { if (!variantesDe.has(v.varianteDe)) variantesDe.set(v.varianteDe, []); variantesDe.get(v.varianteDe).push(v); });
  const usadas = new Set();
  const porFase = new Map(fases.map((f) => [f.id, []]));
  const semFase = [];
  for (const q of t.questoes || []) {
    const grupo = [{ tipo: 'questao', q }, ...(variantesDe.get(q.id) || []).map((v) => (usadas.add(v.id), { tipo: 'variante', q: v, de: q.id }))];
    (porFase.get(q.fase) || semFase).push(grupo);
  }
  (t.variantes || []).filter((v) => !usadas.has(v.id)).forEach((v) => (porFase.get(v.fase) || semFase).push([{ tipo: 'variante', q: v, de: v.varianteDe }]));
  const lista = fases.map((f) => ({ fase: f, grupos: porFase.get(f.id) })).filter((x) => x.grupos.length);
  if (semFase.length) lista.push({ fase: { id: 'sem-aula', nome: 'Itens sem aula definida' }, grupos: semFase });
  return lista;
}

/** Junta aulas inteiras até LIMITE_Q itens; aula maior que o limite é dividida entre grupos (questão + variantes juntas). */
function empacotarQuestoes(aulas) {
  const lotes = [];
  let atual = [];
  const tamanho = (l) => l.reduce((n, a) => n + a.grupos.reduce((m, g) => m + g.length, 0), 0);
  const fechar = () => { if (atual.length) lotes.push(atual); atual = []; };
  for (const aula of aulas) {
    const n = aula.grupos.reduce((m, g) => m + g.length, 0);
    if (n > LIMITE_Q) {
      fechar();
      let pedaco = [];
      let conta = 0;
      for (const g of aula.grupos) {
        if (conta + g.length > LIMITE_Q && pedaco.length) { lotes.push([{ fase: aula.fase, grupos: pedaco }]); pedaco = []; conta = 0; }
        pedaco.push(g); conta += g.length;
      }
      if (pedaco.length) atual = [{ fase: aula.fase, grupos: pedaco }];
      continue;
    }
    if (atual.length && tamanho(atual) + n > LIMITE_Q) fechar();
    atual.push(aula);
  }
  fechar();
  return lotes;
}

function cabecalho(codigo, titulo, curso, exp, linhas) {
  return [`# Lote ${codigo} · ${titulo}`, '', `Exportação ${exp} · Curso: ${curso.nome} (\`${curso.id}\`)`, ...linhas, '', '## Sobre o curso', ...contexto(curso.id).map((l) => `- ${l}`), '', '---', ''].join('\n');
}

function parteA(lote, curso, exp) {
  const nq = lote.itens.filter((i) => i.tipo === 'questao').length;
  const partes = [cabecalho(lote.codigo, 'PARTE A (sem gabarito)', curso, exp, [
    `Itens neste lote: ${lote.itens.length} (${nq} questões, ${lote.itens.length - nq} variantes)`,
    `Aulas: ${lote.aulas.map((a) => a.nome).join(' · ')}`,
    '',
    `Instrução: PASSO 1 do protocolo (seção 4 das suas instruções). Resolva os ${lote.itens.length} itens SEM gabarito e responda só com a tabela (Item | id | Minha resposta | Confiança | Observação). O gabarito vem na Parte B, na próxima mensagem.`,
  ])];
  let faseAtual = null;
  for (const it of lote.itens) {
    if (it.fase.id !== faseAtual) {
      faseAtual = it.fase.id;
      partes.push(`## Aula: ${it.fase.nome} (\`${it.fase.id}\`)`);
      if (it.fase.descricao) partes.push(`Sobre a aula: ${limpar(it.fase.descricao)}`);
      if (it.fase.habilidades && it.fase.habilidades.length) partes.push(`Habilidades ${curso.dados.habilidadesDe || 'da Matriz do Enem'}: ${it.fase.habilidades.join(', ')}`);
      partes.push('');
    }
    const q = it.q;
    const rotulo = it.tipo === 'variante' ? `Variante do item ${String(it.deN || '?').padStart(2, '0')}${it.deN ? '' : ` (original \`${it.de}\` fora deste lote)`}` : 'Questão';
    partes.push(`### Item ${String(it.n).padStart(2, '0')} · ${rotulo} · \`${q.id}\``);
    partes.push(`Tema: ${q.tema || '?'} · Dificuldade: ${dificuldade(q.dificuldade)}`);
    if (q.texto) partes.push('', 'Texto de apoio:', limpar(q.texto).split('\n').map((l) => `> ${l}`).join('\n'));
    partes.push('', `Enunciado: ${limpar(q.enunciado)}`);
    if (q.codigo) partes.push('', 'Código:', blocoCodigo(q.codigo));
    partes.push('', alternativasA(q), '');
  }
  partes.push('---', `Fim da Parte A do lote ${lote.codigo}: ${lote.itens.length} itens.`);
  return partes.join('\n') + '\n';
}

function parteB(lote, curso, exp) {
  const partes = [cabecalho(lote.codigo, 'PARTE B (gabarito, explicações e comentários)', curso, exp, [
    `Itens neste lote: ${lote.itens.length}`,
    '',
    'Instrução: PASSO 2 do protocolo (seção 4 das suas instruções). Use os enunciados e alternativas da Parte A desta conversa, compare com as suas respostas, confira tudo e devolva o ESQUELETO JSON do fim deste arquivo preenchido, num bloco json.',
  ])];
  for (const it of lote.itens) {
    const q = it.q;
    partes.push(`### Item ${String(it.n).padStart(2, '0')} · \`${q.id}\`${it.tipo === 'variante' ? ` · variante do item ${String(it.deN || '?').padStart(2, '0')}` : ''}`);
    partes.push(`Gabarito: ${LETRAS[q.correta]}`);
    partes.push(`Explicação: ${limpar(explicacaoEmTexto(q.explicacao)).replace(/\n+/g, ' ')}`);
    const com = q.comentarios || [];
    partes.push('Comentários das alternativas:');
    (q.alternativas || []).forEach((_, i) => partes.push(`- ${LETRAS[i]}) ${i === q.correta ? `(alternativa correta)${com[i] ? ' ' + limpar(com[i]) : ''}` : (limpar(com[i]) || '(sem comentário)')}`));
    partes.push(`Origem: ${q.origem === 'enem' ? `Enem, cópia literal autorizada (${q.fonte || 'fonte não informada'}): não sugira reescrever enunciado nem alternativas` : 'autoral (Diver)'}`);
    if (q.revisar) partes.push(`Atenção: a equipe marcou este item para conferir com cuidado (${limpar(q.revisar)}).`);
    partes.push('');
  }
  partes.push('---', '## ESQUELETO JSON (preencha e devolva num bloco json; não mude n, id nem gabarito)', '', '```json');
  partes.push(`{"lote":"${lote.codigo}","exportacao":"${exp}","ia":"","itens":[`);
  partes.push(lote.itens.map((it) => JSON.stringify({ n: it.n, id: it.q.id, gabarito: LETRAS[it.q.correta], minha_resposta: '', veredito: '', falhas: [], problema: '', correcao: '', fontes: [] })).join(',\n'));
  partes.push(']}', '```', '', `Fim da Parte B do lote ${lote.codigo}: ${lote.itens.length} itens.`);
  return partes.join('\n') + '\n';
}

/* ---------- Lotes de CONTEÚDO ---------- */
const lista = (itens) => (itens || []).map((x) => `- ${limpar(x)}`).join('\n');

function textoArtigo(f, n, curso) {
  const r = f.resumo || {};
  const p = [`## Item ${n} · Aula: ${f.nome} · \`${f.id}\``];
  const meta = [f.modulo && `Módulo: ${f.modulo}`, f.habilidades && f.habilidades.length && `Habilidades ${curso.dados.habilidadesDe || 'da Matriz do Enem'}: ${f.habilidades.join(', ')}`, f.bncc && f.bncc.length && `BNCC: ${f.bncc.join(', ')}`, f.profundidade && `Profundidade: ${f.profundidade}`].filter(Boolean);
  if (meta.length) p.push(meta.join(' · '));
  if (f.descricao) p.push(`Descrição da aula: ${limpar(f.descricao)}`);
  if (r.introducao) p.push('', '### Introdução', limpar(r.introducao));
  (r.secoes || []).forEach((s) => p.push('', `### ${limpar(s.titulo)}`, ...(Array.isArray(s.texto) ? s.texto : [s.texto]).map(limpar)));
  if (r.tabela) {
    const tb = r.tabela;
    p.push('', `### Tabela: ${limpar(tb.titulo)}`, `| ${(tb.colunas || []).join(' | ')} |`, `|${(tb.colunas || []).map(() => '---').join('|')}|`, ...(tb.linhas || []).map((l) => `| ${l.map(limpar).join(' | ')} |`));
  }
  if (r.linhaDoTempo) p.push('', '### Linha do tempo', ...r.linhaDoTempo.map((x) => `- ${limpar(x.quando)}: ${limpar(x.fato)}`));
  if (r.mapa) p.push('', `### Mapa (${r.mapa.tipo}): ${limpar(r.mapa.titulo)}`, ...(r.mapa.pontos || []).map((x) => `- ${limpar(x.titulo)} (${x.onde || `lat ${x.lat}, lon ${x.lon}`}): ${limpar(x.texto)}`));
  if (r.mapaMental) p.push('', `### Mapa mental (centro: ${limpar(r.mapaMental.centro)})`, ...(r.mapaMental.ramos || []).map((x) => `- ${limpar(x.titulo)}: ${(x.itens || []).map(limpar).join('; ')}`));
  if (r.associacoes) p.push('', '### Associações (imagem para memorizar)', ...r.associacoes.map((x) => `- ${x.icone || ''} ${limpar(x.conceito)} → ${limpar(x.liga)}: ${limpar(x.porque)}`));
  if (r.pontos) p.push('', '### Pontos para revisar', lista(r.pontos));
  if (r.perolas) p.push('', '### Pérolas', lista(r.perolas));
  if (r.reforcar && r.reforcar.length) p.push('', `Reforçar (podem aparecer até 4 vezes): ${r.reforcar.join(', ')}`);
  return p.join('\n') + '\n';
}

function textoFicha(tema, fi, n) {
  return [`## Item ${n} · Ficha "Revisar a fundo" · \`${tema}\``, ...(fi.texto || []).map(limpar), '', 'Pontos:', lista(fi.pontos), '', 'Pegadinhas:', lista(fi.pegadinhas)].join('\n') + '\n';
}

const TIPOS_CARTA = {
  pares: ['Pares (termo → definição)', (c) => `${limpar(c.termo)} → ${limpar(c.definicao)}`],
  verdadeiroFalso: ['Verdadeiro ou falso', (c) => `[${c.verdadeira ? 'V' : 'F'}] ${limpar(c.afirmacao)}${c.explicacao ? ` — Explicação: ${limpar(c.explicacao)}` : ''}`],
  adivinhas: ['Adivinhas', (c) => `Resposta: ${limpar(c.resposta)} · Aceitas: ${(c.aceitas || []).join(' | ') || '(nenhuma)'} · Dicas: ${(c.dicas || []).map((d, i) => `${i + 1}) ${limpar(d)}`).join(' ')}${c.dificuldade ? ` · ${dificuldade(c.dificuldade)}` : ''}`],
  sequencias: ['Sequências (na ordem certa)', (c) => `${limpar(c.titulo)}: ${(c.itens || []).map((x, i) => `${i + 1}. ${limpar(x)}`).join(' → ')}${c.explicacao ? ` — Explicação: ${limpar(c.explicacao)}` : ''}`],
  palavras: ['Palavras (com dica)', (c) => `Palavra: ${limpar(c.palavra)} · Dica: ${limpar(c.dica)}`],
};

/** Divide uma lista de textos em lotes de até LIMITE_TEXTO caracteres. */
function porTamanho(itens) {
  const lotes = [];
  let atual = [], tam = 0;
  for (const it of itens) {
    if (atual.length && tam + it.texto.length > LIMITE_TEXTO) { lotes.push(atual); atual = []; tam = 0; }
    atual.push(it); tam += it.texto.length;
  }
  if (atual.length) lotes.push(atual);
  return lotes;
}

const NOME_TIPO = { A: 'ARTIGOS "Antes de mergulhar"', F: 'FICHAS "Revisar a fundo"', C: 'CARTAS DOS JOGOS', L: 'LABORATÓRIOS "Mão na massa"', P: 'PROFISSÕES E PANORAMAS', K: 'CALENDÁRIO OFICIAL' };

function arquivoConteudo(codigo, tipo, curso, exp, itens, nota) {
  const cab = [`# Lote ${codigo} · ${NOME_TIPO[tipo]}`, '', `Exportação ${exp} · ${curso ? `Curso: ${curso.nome} (\`${curso.id}\`)` : 'Fora dos cursos'} · Itens: ${itens.length}`, '',
    `Instrução: lote de CONTEÚDO tipo ${tipo} (seção 5 das suas instruções). Confira ${itens.length === 1 ? 'o item' : `os ${itens.length} itens`} e devolva o JSON da seção 5 com "lote":"${codigo}", "exportacao":"${exp}" e "total":${itens.length}.`];
  if (nota) cab.push('', nota);
  if (curso) cab.push('', '## Sobre o curso', ...contexto(curso.id).map((l) => `- ${l}`));
  cab.push('', '---', '');
  return cab.join('\n') + itens.map((i) => i.texto).join('\n') + `\n---\nFim do lote ${codigo}: ${itens.length} itens.\n`;
}

/* ---------- exportar ---------- */
async function exportar(args) {
  const exp = args.alvo || 'E1';
  if (!/^E\d+$/.test(exp)) throw new Error('o nome da exportação é E1, E2...');
  const caminhoManifesto = join(PASTA_DADOS, `${exp}.json`);
  if (existsSync(caminhoManifesto) && !args.substituir) throw new Error(`${relRaiz(caminhoManifesto)} já existe: a exportação ${exp} pode estar em uso. Use a próxima (E2...) ou --substituir.`);
  const tipos = new Set((args.tipos || 'Q,A,F,C,L,P,K').split(',').map((s) => s.trim().toUpperCase()));
  const filtroCursos = args.cursos ? new Set(args.cursos.split(',').map((s) => s.trim())) : null;
  const saida = resolve(args.saida || join(RAIZ, '..', `diver-validacao-${exp}`));
  if (existsSync(saida)) rmSync(saida, { recursive: true, force: true });
  mkdirSync(saida, { recursive: true });

  const cursos = carregarCursos().filter((c) => !filtroCursos || filtroCursos.has(c.id));
  const manifesto = { exportacao: exp, criada_em: hoje(), commit: commitAtual(), limites: { questoes: LIMITE_Q, texto: LIMITE_TEXTO }, lotes: {} };
  const indice = [];
  let nQ = 0, nC = { A: 0, F: 0, C: 0, L: 0, P: 0, K: 0 };
  const codigoC = (t) => `${t}${String(++nC[t]).padStart(4, '0')}`;
  const pasta = (...p) => { const c = join(saida, ...p); mkdirSync(c, { recursive: true }); return c; };
  const ordemCurso = (c) => String(cursos.indexOf(c) + 1).padStart(2, '0') + '-' + c.id.replace(/^diag:/, 'diagnostica-');

  // Questões e variantes
  if (tipos.has('Q')) for (const curso of cursos) {
    const aulas = gruposPorAula(curso);
    // tira o que já está aprovado e não mudou (a não ser com --tudo)
    for (const a of aulas) {
      const grupos = [];
      for (const g of a.grupos) {
        const fica = [];
        for (const it of g) {
          const v = it.q.validacao;
          // fica de fora: já aprovada e sem mudança, ou reprovada/"conferir" e ainda não corrigida (mesma regra do Mergulho Triplo)
          if (!args.tudo && v && v.assinatura === await marca(it.q, curso.diag)) continue;
          fica.push(it);
        }
        if (fica.length) grupos.push(fica);
      }
      a.grupos = grupos;
    }
    for (const pacote of empacotarQuestoes(aulas.filter((a) => a.grupos.length))) {
      const codigo = `Q${String(++nQ).padStart(4, '0')}`;
      const itens = [];
      const nDe = new Map();
      for (const aula of pacote) for (const g of aula.grupos) for (const it of g) {
        const n = itens.length + 1;
        nDe.set(it.q.id, n);
        itens.push({ ...it, n, fase: aula.fase, deN: it.de ? nDe.get(it.de) : null });
      }
      const lote = { codigo, itens, aulas: pacote.map((a) => a.fase) };
      const dir = pasta('questoes', ordemCurso(curso));
      writeFileSync(join(dir, `${codigo}-A.txt`), parteA(lote, curso, exp));
      writeFileSync(join(dir, `${codigo}-B.txt`), parteB(lote, curso, exp));
      manifesto.lotes[codigo] = {
        tipo: 'Q', curso: curso.id, arquivo: curso.arquivo, diag: curso.diag || undefined,
        aulas: lote.aulas.map((a) => a.id),
        itens: await Promise.all(itens.map(async (it) => [it.n, it.q.id, it.tipo === 'variante' ? 'v' : 'q', await marca(it.q, curso.diag)])),
      };
      indice.push({ codigo, tipo: 'Q', curso, arquivos: [`questoes/${ordemCurso(curso)}/${codigo}-A.txt`, `questoes/${ordemCurso(curso)}/${codigo}-B.txt`], itens: itens.length, sobre: lote.aulas.map((a) => a.nome).join(' · ') });
    }
  }

  // Conteúdo de cada curso: artigos, fichas e cartas
  const gravarConteudo = (tipo, curso, grupo, nota, sobre) => {
    const codigo = codigoC(tipo);
    const dir = pasta('conteudo', curso ? ordemCurso(curso) : '00-geral');
    const nome = `${codigo}.txt`;
    writeFileSync(join(dir, nome), arquivoConteudo(codigo, tipo, curso, exp, grupo, nota));
    manifesto.lotes[codigo] = { tipo, curso: curso ? curso.id : null, refs: grupo.map((g) => g.ref), arquivo: grupo[0].arquivo };
    indice.push({ codigo, tipo, curso, arquivos: [`conteudo/${curso ? ordemCurso(curso) : '00-geral'}/${nome}`], itens: grupo.length, sobre: sobre || grupo.map((g) => g.rotulo).filter(Boolean).slice(0, 3).join(' · ') + (grupo.length > 3 ? ' …' : '') });
  };

  if (tipos.has('K')) {
    const c = join(RAIZ, 'data', 'calendario', 'datas-oficiais.json');
    if (existsSync(c)) {
      const d = lerJSON(c);
      const brutos = [...(d.feriados || []).map((f, i) => ({ ref: `feriado-${i + 1}`, linha: `${f.data} · ${f.nome}${f.facultativo ? ' (ponto facultativo)' : ' (feriado nacional)'}`, secao: 'Feriados nacionais' })),
        ...(d.vestibulares || []).map((v, i) => ({ ref: `prova-${i + 1}`, linha: `${v.data}${v.hora ? ` ${v.hora}` : ''} · ${v.instituicao} · ${v.titulo} (${v.tipo || '?'}${v.rede ? `; rede ${v.rede}` : ''})${v.obs ? ` · Observação: ${v.obs}` : ''}`, secao: 'Enem e vestibulares' }))];
      let secaoAtual = null;
      const itens = brutos.map((x, i) => {
        const titulo = x.secao !== secaoAtual ? `\n## ${(secaoAtual = x.secao)}\n` : '';
        return { ref: x.ref, rotulo: null, arquivo: relRaiz(c), texto: `${titulo}- Item ${i + 1} · \`${x.ref}\` · ${x.linha}` };
      });
      gravarConteudo('K', null, itens, `O calendário diz: "${d.aviso || ''}" (atualizado em ${d.atualizadoEm}; ciclo: ${d.ciclo}). As datas estão no formato ano-mês-dia. Confira cada uma no site oficial e aponte também data importante que esteja faltando (falha LACUNA, com a fonte).`, 'Feriados nacionais, Enem e vestibulares');
    }
  }

  for (const curso of cursos) {
    if (curso.diag) continue;
    const t = curso.dados;
    if (tipos.has('A')) {
      const itens = (t.fases || []).filter((f) => f.resumo).map((f) => ({ ref: f.id, rotulo: f.nome, arquivo: curso.arquivo, texto: '' , f }));
      for (const grupo of porTamanho(itens.map((x) => ({ ...x, texto: textoArtigo(x.f, 0, curso) })))) {
        grupo.forEach((g, i) => { g.texto = textoArtigo(g.f, i + 1, curso); });
        gravarConteudo('A', curso, grupo);
      }
    }
    if (tipos.has('F') && t.fichas) {
      const itens = Object.entries(t.fichas).map(([tema, fi]) => ({ ref: tema, rotulo: tema, arquivo: curso.arquivo, tema, fi, texto: textoFicha(tema, fi, 0) }));
      for (const grupo of porTamanho(itens)) { grupo.forEach((g, i) => { g.texto = textoFicha(g.tema, g.fi, i + 1); }); gravarConteudo('F', curso, grupo); }
    }
    if (tipos.has('C')) {
      const itens = [];
      for (const [chave, [nome, fmt]] of Object.entries(TIPOS_CARTA)) (t[chave] || []).forEach((c) => itens.push({ ref: c.id, rotulo: nome, arquivo: curso.arquivo, chave, nome, c, texto: `- \`${c.id}\` · ${c.tema ? `${limpar(c.tema)} · ` : ''}${fmt(c)}\n` }));
      for (const grupo of porTamanho(itens)) {
        const linhas = [];
        let atual = null, n = 0;
        for (const g of grupo) { if (g.chave !== atual) { atual = g.chave; linhas.push(`\n## ${g.nome}\n`); } n++; linhas.push(g.texto.replace(/^- /, `- Item ${n} · `)); }
        const tiposNoLote = [...new Set(grupo.map((g) => g.nome))].join(', ');
        gravarConteudo('C', curso, [{ ...grupo[0], texto: linhas.join('') }, ...grupo.slice(1).map((g) => ({ ...g, texto: '' }))], null, tiposNoLote);
      }
      (t.casos || []).forEach((caso) => gravarConteudo('C', curso, [{ ref: caso.id, rotulo: caso.titulo, arquivo: curso.arquivo, texto: `## Item 1 · Caso de detetive "${limpar(caso.titulo)}" · \`${caso.id}\`\n${blocoCodigo(JSON.stringify(caso, null, 2), 'json')}\n` }],
        'Este lote é o caso do jogo de detetive "Caso Resolvido" (Operação Recife Sombrio), em JSON. Confira principalmente os e-mails e endereços oficiais apresentados como verdadeiros, os golpes e as pistas (seção 5, cartas → casos). Use como "ref" o id do e-mail, da pista ou do campo em que está o problema.', `Caso de detetive: ${caso.titulo}`));
    }
  }

  if (tipos.has('L')) {
    const raizLab = join(RAIZ, 'data', 'laboratorios');
    for (const cursoId of existsSync(raizLab) ? readdirSync(raizLab).sort() : []) {
      const curso = cursos.find((c) => c.id === cursoId) || null;
      if (filtroCursos && !curso) continue;
      const itens = readdirSync(join(raizLab, cursoId)).filter((a) => a.endsWith('.json')).sort().map((a) => {
        const l = lerJSON(join(raizLab, cursoId, a));
        return { ref: l.id, rotulo: l.nome, arquivo: relRaiz(join(raizLab, cursoId, a)), l, texto: `## Item 0 · Laboratório "${limpar(l.nome)}" · \`${l.id}\`\n${blocoCodigo(JSON.stringify(l, null, 2), 'json')}\n` };
      });
      for (const grupo of porTamanho(itens)) { grupo.forEach((g, i) => { g.texto = g.texto.replace('## Item 0 ·', `## Item ${i + 1} ·`); }); gravarConteudo('L', curso, grupo, 'Cada laboratório vem em JSON. Use como "ref" o id da missão (campo "id" dentro de "missoes") quando o problema for numa missão, ou o id do laboratório.'); }
    }
  }

  if (tipos.has('P') && !filtroCursos) {
    const raizP = join(RAIZ, 'data', 'profissoes');
    const ix = lerJSON(join(raizP, 'indice.json'));
    const arquivos = [...(ix.profissoes || []).filter((p) => p.arquivo).map((p) => p.arquivo), ...(ix.panoramas || []).map((p) => p.arquivo)];
    gravarConteudo('P', null, [{ ref: 'indice', rotulo: 'Índice e cartas', arquivo: relRaiz(join(raizP, 'indice.json')), texto: `## Item 1 · Índice do Mapa das Profissões (frases, cartas e áreas) · \`indice\`\n${blocoCodigo(JSON.stringify(ix, null, 2), 'json')}\n` }],
      'O índice traz a frase e a carta de cada profissão (o que o aluno vê no mapa e na "Maré de cartas"). Confira se cada frase e carta é verdadeira e não exagera.', 'Índice do mapa: frases e cartas');
    for (const a of arquivos) {
      const f = lerJSON(join(raizP, a));
      gravarConteudo('P', null, [{ ref: f.id, rotulo: f.nome || f.titulo, arquivo: relRaiz(join(raizP, a)), texto: `## Item 1 · ${f.nome || f.titulo} · \`${f.id}\` (${a})\n${blocoCodigo(JSON.stringify(f, null, 2), 'json')}\n` }],
        'Ficha de profissão ou panorama de área em JSON. Cada número tem as suas "fontes" (ids da lista "fontes", com URL e data). Confira os números nas fontes e se ainda valem. Use como "ref" o caminho do campo (exemplo: numeros.salario, secoes.quanto_ganha.medias[0], mitos[2], dia.cenas[3]).', `${f.nome || f.titulo}`);
    }
  }

  // Prompt, guia e índice
  const prompt = readFileSync(join(PASTA_DOCS, 'PROMPT.txt'), 'utf8').replaceAll('{{EXPORTACAO}}', exp).replaceAll('{{HOJE}}', hoje());
  writeFileSync(join(saida, '01-PROMPT-DO-GEM.txt'), prompt);
  const totalItensQ = Object.values(manifesto.lotes).filter((l) => l.tipo === 'Q').reduce((n, l) => n + l.itens.length, 0);
  const contagem = { lotesQ: nQ, lotesConteudo: Object.values(nC).reduce((a, b) => a + b, 0), itensQ: totalItensQ, ...Object.fromEntries(Object.entries(nC).map(([k, v]) => [`lotes${k}`, v])) };
  const guia = readFileSync(join(PASTA_DOCS, 'GUIA.md'), 'utf8').replaceAll('{{EXPORTACAO}}', exp).replaceAll('{{HOJE}}', hoje())
    .replace(/\{\{(\w+)\}\}/g, (m, k) => (contagem[k] !== undefined ? contagem[k].toLocaleString('pt-BR') : m));
  writeFileSync(join(saida, '00-LEIA-PRIMEIRO.md'), guia);
  writeFileSync(join(saida, '02-INDICE.md'), textoIndice(exp, indice));

  mkdirSync(PASTA_DADOS, { recursive: true });
  manifesto.contagem = contagem;
  writeFileSync(caminhoManifesto, JSON.stringify(manifesto) + '\n');
  console.log(`Exportação ${exp}: ${nQ} lotes de questões (${totalItensQ.toLocaleString('pt-BR')} questões e variantes) e ${contagem.lotesConteudo} lotes de conteúdo (${Object.entries(nC).map(([k, v]) => `${k} ${v}`).join(', ')}).`);
  console.log(`Pacote: ${saida}`);
  console.log(`Manifesto: ${relRaiz(caminhoManifesto)} (vai para o commit: é com ele que o "aplicar" confere o que voltou)`);
}

function commitAtual() {
  try { return execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch { return null; }
}

function textoIndice(exp, indice) {
  const linhas = [`# Índice dos lotes · exportação ${exp}`, '',
    'Marque o [ ] quando terminar o lote e guardar o JSON. A ordem abaixo é a sugerida; você pode fazer em qualquer ordem.', '',
    '- Lote **Q** (questões e variantes): 2 mensagens no mesmo chat, primeiro o arquivo **-A**, depois o **-B**.',
    '- Lotes **K, A, F, C, L, P** (conteúdo): 1 mensagem com o arquivo.', ''];
  const secao = (titulo, filtro) => {
    const itens = indice.filter(filtro);
    if (!itens.length) return;
    linhas.push(`## ${titulo}`, '', '| Feito | Lote | Curso | Itens | Do que se trata | Arquivo(s) |', '|---|---|---|---|---|---|');
    itens.forEach((i) => linhas.push(`| [ ] | ${i.codigo} | ${i.curso ? i.curso.nome : '—'} | ${i.itens} | ${i.sobre.replace(/\|/g, '/')} | ${i.arquivos.map((a) => `\`${a}\``).join(' + ')} |`));
    linhas.push('');
  };
  secao('Comece por aqui: calendário oficial (rápido e urgente: o Enem é em novembro)', (i) => i.tipo === 'K');
  secao('Questões e variantes', (i) => i.tipo === 'Q');
  secao('Artigos "Antes de mergulhar"', (i) => i.tipo === 'A');
  secao('Fichas "Revisar a fundo"', (i) => i.tipo === 'F');
  secao('Cartas dos jogos', (i) => i.tipo === 'C');
  secao('Laboratórios "Mão na massa"', (i) => i.tipo === 'L');
  secao('Profissões e panoramas', (i) => i.tipo === 'P');
  return linhas.join('\n') + '\n';
}

/* ---------- aplicar ---------- */
const GRAVES = new Set(['GABARITO_ERRADO', 'DUAS_CORRETAS', 'NENHUMA_CORRETA', 'ENUNCIADO_AMBIGUO', 'FATO_ERRADO', 'FATO_DESATUALIZADO', 'EXPLICACAO_ERRADA', 'COMENTARIO_ERRADO', 'CODIGO_SAIDA_ERRADA', 'VARIANTE_IGUAL', 'POSSIVEL_COPIA', 'CONTEUDO_INADEQUADO']);
const DE_FATO = new Set(['FATO_ERRADO', 'FATO_DESATUALIZADO', 'EXPLICACAO_ERRADA', 'COMENTARIO_ERRADO', 'NAO_CONFIRMADO', 'POSSIVEL_COPIA', 'CONTEUDO_INADEQUADO']);
const DE_LOGICA = new Set(['GABARITO_ERRADO', 'DUAS_CORRETAS', 'NENHUMA_CORRETA', 'ENUNCIADO_AMBIGUO', 'CODIGO_SAIDA_ERRADA', 'VARIANTE_IGUAL']);
const curto = (s, n = 800) => { const t = limpar(s); return t.length > n ? t.slice(0, n) + '…' : t; };

/** Acha todos os objetos JSON com "lote" num texto qualquer (resposta colada do Gemini, com ou sem bloco ```json). */
export function extrairResultados(texto) {
  const achados = [];
  for (let i = texto.indexOf('{'); i !== -1; i = texto.indexOf('{', i + 1)) {
    if (!/^\{\s*"lote"\s*:/.test(texto.slice(i, i + 40))) continue;
    let prof = 0, emTexto = false, escape = false, fim = -1;
    for (let j = i; j < texto.length; j++) {
      const ch = texto[j];
      if (emTexto) { if (escape) escape = false; else if (ch === '\\') escape = true; else if (ch === '"') emTexto = false; continue; }
      if (ch === '"') emTexto = true;
      else if (ch === '{') prof++;
      else if (ch === '}') { prof--; if (prof === 0) { fim = j; break; } }
    }
    if (fim === -1) { achados.push({ erro: `JSON sem fechar perto de: ${texto.slice(i, i + 60)}` }); break; }
    const bruto = texto.slice(i, fim + 1);
    try { achados.push({ dados: JSON.parse(bruto) }); } catch (e) {
      // conserto comum: vírgula sobrando antes de ] ou }
      try { achados.push({ dados: JSON.parse(bruto.replace(/,\s*([\]}])/g, '$1')) }); } catch { achados.push({ erro: `JSON inválido (${e.message}) perto de: ${bruto.slice(0, 60)}` }); }
    }
    i = fim;
  }
  return achados;
}

function lerEntradas(caminhos) {
  const arquivos = [];
  const visitar = (c) => {
    const s = statSync(c);
    if (s.isDirectory()) readdirSync(c).sort().forEach((x) => visitar(join(c, x)));
    else if (/\.(txt|md|json)$/i.test(c)) arquivos.push(c);
  };
  caminhos.forEach((c) => visitar(resolve(c)));
  return arquivos;
}

function normalizarVeredito(r) {
  const falhas = (Array.isArray(r.falhas) ? r.falhas : []).map((f) => String(f).trim().toUpperCase()).filter(Boolean);
  let v = String(r.veredito || '').trim().toLowerCase().replace(/\s+/g, '_');
  const temGrave = falhas.some((f) => GRAVES.has(f));
  if (!['aprovado', 'aprovado_com_ajuste', 'reprovado', 'conferir'].includes(v)) v = temGrave ? 'reprovado' : falhas.includes('NAO_CONFIRMADO') ? 'conferir' : falhas.length ? 'aprovado_com_ajuste' : 'conferir';
  if (temGrave && v !== 'reprovado') v = 'reprovado';            // falha grave nunca passa
  if (v === 'aprovado' && falhas.length) v = 'aprovado_com_ajuste';
  if (v === 'aprovado_com_ajuste' && !falhas.length && !limpar(r.correcao)) v = 'aprovado';
  return { veredito: v, falhas };
}

async function aplicar(args) {
  if (!args.alvos.length) throw new Error('informe o(s) arquivo(s) ou a pasta com as respostas do Gemini');
  const simular = args.simular;
  const blocos = [];
  for (const arq of lerEntradas(args.alvos)) for (const r of extrairResultados(readFileSync(arq, 'utf8'))) blocos.push({ ...r, arq });
  const erros = blocos.filter((b) => b.erro);
  erros.forEach((b) => console.log(`Atenção (${basename(b.arq)}): ${b.erro}`));

  // junta as partes de um mesmo lote (CONTINUA)
  const porLote = new Map();
  for (const { dados, arq } of blocos.filter((b) => b.dados)) {
    const chave = `${dados.exportacao || '?'}/${dados.lote}`;
    const atual = porLote.get(chave) || { exportacao: dados.exportacao, lote: dados.lote, ia: dados.ia, itens: [], achados: [], total: dados.total, conferidos: 0, arquivos: new Set() };
    atual.ia = atual.ia || dados.ia;
    (dados.itens || []).forEach((it) => { const i = atual.itens.findIndex((x) => x.n === it.n); if (i >= 0) atual.itens[i] = it; else atual.itens.push(it); });
    (dados.achados || []).forEach((a) => atual.achados.push(a));
    atual.conferidos += Number(dados.conferidos || 0);
    atual.total = atual.total || dados.total;
    atual.arquivos.add(basename(arq));
    porLote.set(chave, atual);
  }
  if (!porLote.size) throw new Error('nenhum resultado encontrado (procurei blocos JSON que começam com {"lote": ...})');

  const manifestos = new Map();
  const manifesto = (exp) => {
    if (!manifestos.has(exp)) {
      const c = join(PASTA_DADOS, `${exp}.json`);
      manifestos.set(exp, existsSync(c) ? lerJSON(c) : null);
    }
    return manifestos.get(exp);
  };
  const cPend = join(PASTA_DADOS, 'pendencias.json');
  const pendencias = existsSync(cPend) ? lerJSON(cPend) : [];
  const arquivosAbertos = new Map(); // caminho → dados (trilhas que vamos gravar)
  const abrir = (rel) => { if (!arquivosAbertos.has(rel)) arquivosAbertos.set(rel, lerJSON(join(RAIZ, rel))); return arquivosAbertos.get(rel); };
  const resultadosPorExp = new Map();
  const resultados = (exp) => {
    if (!resultadosPorExp.has(exp)) { const c = join(PASTA_DADOS, `${exp}-resultados.json`); resultadosPorExp.set(exp, existsSync(c) ? lerJSON(c) : { exportacao: exp, lotes: {} }); }
    return resultadosPorExp.get(exp);
  };
  const guardarPendencia = (p) => {
    const i = pendencias.findIndex((x) => x.exportacao === p.exportacao && x.lote === p.lote && x.ref === p.ref && x.falha === p.falha);
    if (i >= 0) pendencias[i] = { ...pendencias[i], ...p }; else pendencias.push(p);
  };
  const rel = { lotes: 0, aprovados: 0, ajuste: 0, reprovados: 0, conferir: 0, revisarHumano: [], mudaram: [], faltaram: [], achados: 0, semManifesto: [] };

  for (const r of porLote.values()) {
    const m = manifesto(r.exportacao);
    const def = m && m.lotes[r.lote];
    if (!def) { rel.semManifesto.push(`${r.exportacao}/${r.lote}`); continue; }
    rel.lotes++;
    const ia = curto(r.ia || 'IA externa', 60);
    const registro = { aplicado_em: hoje(), ia, arquivos: [...r.arquivos] };

    if (def.tipo === 'Q') {
      const cont = { aprovado: 0, aprovado_com_ajuste: 0, reprovado: 0, conferir: 0 };
      const faltaram = [], mudaram = [], humanos = [];
      const dados = def.diag ? null : abrir(def.arquivo);
      for (const [n, id, tipoItem, marcaExport] of def.itens) {
        const res = r.itens.find((x) => x.n === n && x.id === id) || r.itens.find((x) => x.id === id);
        if (!res) { faltaram.push(id); continue; }
        const { veredito, falhas } = normalizarVeredito(res);
        cont[veredito]++;
        const pend = { exportacao: r.exportacao, lote: r.lote, curso: def.curso, arquivo: def.arquivo, ref: id, tipo: tipoItem === 'v' ? 'variante' : 'questao', veredito, falhas, gabarito: res.gabarito || '', minha_resposta: res.minha_resposta || '', problema: curto(res.problema), correcao: curto(res.correcao, 1500), fontes: (res.fontes || []).slice(0, 5), ia, registrada_em: hoje(), status: 'aberta' };
        if (veredito !== 'aprovado') guardarPendencia({ ...pend, falha: falhas.join(',') || veredito });
        if (def.diag) continue; // diagnósticas: só o registro (o arquivo tem formatação própria e o app não lê "validacao")

        const lista = (dados.questoes || []).some((y) => y.id === id) ? dados.questoes : (dados.variantes || []);
        const q = lista.find((y) => y.id === id);
        if (!q) { faltaram.push(`${id} (não está mais no curso)`); continue; }
        const atual = await assinatura(q);
        if (atual !== marcaExport) { mudaram.push(id); continue; }
        const antes = q.validacao || null;
        const pronta = veredito === 'aprovado' || veredito === 'aprovado_com_ajuste';
        // O mesmo lote aplicado de novo (arquivo mandado duas vezes) não é uma 2ª tentativa: só regrava.
        const mesmoLote = antes && antes.via === 'externa' && antes.exportacao === r.exportacao && antes.lote === r.lote;
        const tentativas = mesmoLote ? antes.tentativas || 1 : (antes && !antes.pronta ? antes.tentativas || 1 : 0) + (veredito === 'conferir' ? 0 : 1);
        q.validacao = {
          fato: veredito === 'conferir' ? 'duvida' : falhas.some((f) => DE_FATO.has(f) && GRAVES.has(f)) ? 'reprovado' : 'confirmado',
          logica: falhas.some((f) => DE_LOGICA.has(f)) ? 'reprovado' : 'confirmado',
          modelo_fato: `externa:${ia}`, modelo_logica: `externa:${ia}`,
          data: hoje(), pronta, tentativas: Math.max(tentativas, 1), assinatura: atual,
          via: 'externa', exportacao: r.exportacao, lote: r.lote, veredito,
          ...(falhas.length ? { falhas } : {}),
          ...(!pronta || falhas.length ? { detalhe: curto(res.problema) } : {}),
          ...((res.fontes || []).length ? { fontes_fato: res.fontes.slice(0, 5) } : {}),
        };
        if (pronta) delete q.revisar_humano;
        if (veredito === 'reprovado' && tentativas >= 2) {
          q.revisar_humano = true;
          lista.splice(lista.indexOf(q), 1);
          (dados.emRevisao ||= []).push({ ...q, motivo_revisao: curto(res.problema) });
          humanos.push(id);
        }
      }
      Object.assign(registro, { itens: def.itens.length, contagem: cont, ...(faltaram.length ? { faltaram } : {}), ...(mudaram.length ? { mudaram } : {}), ...(humanos.length ? { revisar_humano: humanos } : {}) });
      rel.aprovados += cont.aprovado; rel.ajuste += cont.aprovado_com_ajuste; rel.reprovados += cont.reprovado; rel.conferir += cont.conferir;
      rel.faltaram.push(...faltaram.map((x) => `${r.lote}: ${x}`)); rel.mudaram.push(...mudaram.map((x) => `${r.lote}: ${x}`)); rel.revisarHumano.push(...humanos);
    } else {
      const refs = new Set(def.refs);
      for (const a of r.achados) {
        const gravidade = String(a.gravidade || '').toLowerCase().startsWith('g') ? 'grave' : 'leve';
        guardarPendencia({ exportacao: r.exportacao, lote: r.lote, curso: def.curso, arquivo: def.arquivo, tipo: def.tipo, ref: limpar(a.ref) || '?', ref_conhecida: refs.has(limpar(a.ref)) || undefined, falha: String(a.falha || '').toUpperCase(), gravidade, trecho: curto(a.trecho, 300), problema: curto(a.problema), correcao: curto(a.correcao, 1500), fontes: (a.fontes || []).slice(0, 5), ia, registrada_em: hoje(), status: 'aberta' });
        rel.achados++;
      }
      const total = def.refs.length;
      Object.assign(registro, { itens: total, conferidos: r.conferidos || null, achados: r.achados.length, graves: r.achados.filter((a) => String(a.gravidade || '').toLowerCase().startsWith('g')).length });
      if (r.conferidos && r.conferidos < total) rel.faltaram.push(`${r.lote}: a IA disse que conferiu ${r.conferidos} de ${total}`);
    }
    resultados(r.exportacao).lotes[r.lote] = registro;
  }

  console.log(`\n══════ Validação externa · ${simular ? 'SIMULAÇÃO (nada gravado)' : 'aplicada'} ══════`);
  console.log(`Lotes lidos: ${rel.lotes}${rel.semManifesto.length ? ` · sem manifesto (exportação ou lote desconhecido): ${rel.semManifesto.join(', ')}` : ''}`);
  console.log(`Questões e variantes: ${rel.aprovados} aprovadas · ${rel.ajuste} aprovadas com ajuste · ${rel.reprovados} reprovadas · ${rel.conferir} para conferir`);
  if (rel.achados) console.log(`Conteúdo: ${rel.achados} achados`);
  if (rel.revisarHumano.length) console.log(`2ª reprovação (saíram do curso para "emRevisao"): ${rel.revisarHumano.join(', ')}`);
  if (rel.mudaram.length) console.log(`Não aplicadas porque o texto mudou depois da exportação (mande de novo numa exportação nova): ${rel.mudaram.join(', ')}`);
  if (rel.faltaram.length) console.log(`Faltaram na resposta da IA (refazer o lote ou pedir "continue"): ${rel.faltaram.slice(0, 30).join(', ')}${rel.faltaram.length > 30 ? ' …' : ''}`);
  if (simular) return;

  for (const [c, dados] of arquivosAbertos) gravarJSON(join(RAIZ, c), dados);
  if (arquivosAbertos.size && atualizarCatalogo(PASTA_TRILHAS)) console.log('Catálogo dos cursos atualizado (data/trilhas/catalogo.json).');
  mkdirSync(PASTA_DADOS, { recursive: true });
  writeFileSync(cPend, JSON.stringify(pendencias, null, 2) + '\n');
  for (const [exp, dados] of resultadosPorExp) writeFileSync(join(PASTA_DADOS, `${exp}-resultados.json`), JSON.stringify(dados, null, 2) + '\n');
  console.log(`Pendências abertas: ${pendencias.filter((p) => p.status === 'aberta').length} (${relRaiz(cPend)})`);
  for (const exp of resultadosPorExp.keys()) progresso({ alvo: exp, silencioso: true });
  console.log('Revise com "git diff" e faça o commit.');
}

/* ---------- progresso ---------- */
function progresso(args) {
  const exp = args.alvo || 'E1';
  const c = join(PASTA_DADOS, `${exp}.json`);
  if (!existsSync(c)) throw new Error(`não achei ${relRaiz(c)}: rode "exportar ${exp}" primeiro`);
  const m = lerJSON(c);
  const cRes = join(PASTA_DADOS, `${exp}-resultados.json`);
  const res = existsSync(cRes) ? lerJSON(cRes).lotes : {};
  const cPend = join(PASTA_DADOS, 'pendencias.json');
  const pend = (existsSync(cPend) ? lerJSON(cPend) : []).filter((p) => p.exportacao === exp && p.status === 'aberta');
  const porCurso = new Map();
  for (const [cod, l] of Object.entries(m.lotes)) {
    const k = l.curso || '(geral)';
    const x = porCurso.get(k) || { lotes: 0, feitos: 0, q: 0, aprovado: 0, ajuste: 0, reprovado: 0, conferir: 0, achados: 0 };
    x.lotes++;
    if (l.tipo === 'Q') x.q += l.itens.length;
    const r = res[cod];
    if (r) {
      x.feitos++;
      if (r.contagem) { x.aprovado += r.contagem.aprovado; x.ajuste += r.contagem.aprovado_com_ajuste; x.reprovado += r.contagem.reprovado; x.conferir += r.contagem.conferir; }
      x.achados += r.achados || 0;
    }
    porCurso.set(k, x);
  }
  const total = [...porCurso.values()].reduce((a, x) => ({ lotes: a.lotes + x.lotes, feitos: a.feitos + x.feitos }), { lotes: 0, feitos: 0 });
  const linhas = [`# Validação externa · progresso da exportação ${exp}`, '', `Gerado por \`node scripts/validacao-externa.mjs progresso ${exp}\` em ${hoje()}. Exportação criada em ${m.criada_em} (commit ${m.commit || '?'}).`, '',
    `**${total.feitos} de ${total.lotes} lotes aplicados.** Pendências abertas desta exportação: ${pend.length} (em \`data/validacao-externa/pendencias.json\`).`, '',
    '| Curso | Lotes feitos | Questões e variantes | Aprovadas | Com ajuste | Reprovadas | Conferir | Achados (conteúdo) |', '|---|---|---|---|---|---|---|---|',
    ...[...porCurso].map(([k, x]) => `| ${k} | ${x.feitos} de ${x.lotes} | ${x.q} | ${x.aprovado} | ${x.ajuste} | ${x.reprovado} | ${x.conferir} | ${x.achados} |`), ''];
  mkdirSync(PASTA_DOCS, { recursive: true });
  writeFileSync(join(PASTA_DOCS, 'PROGRESSO.md'), linhas.join('\n'));
  if (!args.silencioso) console.log(linhas.join('\n'));
  else console.log(`Progresso: ${total.feitos} de ${total.lotes} lotes (docs/validacao-externa/PROGRESSO.md)`);
}

/* ---------- linha de comando ---------- */
function argumentos(argv) {
  const a = { comando: argv[0], alvo: null, alvos: [], saida: null, tipos: null, cursos: null, tudo: false, simular: false, substituir: false };
  for (let i = 1; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--saida') a.saida = argv[++i];
    else if (x === '--tipos') a.tipos = argv[++i];
    else if (x === '--cursos') a.cursos = argv[++i];
    else if (x === '--tudo') a.tudo = true;
    else if (x === '--simular') a.simular = true;
    else if (x === '--substituir') a.substituir = true;
    else if (x.startsWith('--')) throw new Error(`opção desconhecida: ${x}`);
    else { a.alvos.push(x); a.alvo = a.alvo || x; }
  }
  return a;
}

const COMANDOS = { exportar, aplicar, progresso };
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = argumentos(process.argv.slice(2));
  if (!COMANDOS[args.comando]) {
    console.log('Uso: node scripts/validacao-externa.mjs exportar [E1] [--saida pasta] | aplicar <arquivo|pasta>... [--simular] | progresso [E1]');
    process.exit(args.comando ? 1 : 0);
  }
  Promise.resolve(COMANDOS[args.comando](args)).catch((e) => { console.error(`Erro: ${e.message}`); process.exit(1); });
}

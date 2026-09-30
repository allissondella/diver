#!/usr/bin/env node
/*
 * validar-questoes.mjs — Mergulho Triplo (skill .claude/skills/validar-questoes, docs/ASSINATURA_E_VALIDACAO.md).
 *
 * Para cada questão da trilha:
 *   1. Camada de FATO   → Gemini com a busca do Google ligada (modelo barato; robusto só se não vier "CONFIRMADO").
 *   2. Camada de LÓGICA → OpenAI, postura adversarial, SEM o gabarito no prompt (barato; robusto só se não vier "RESISTIU").
 *   3. Grava o bloco "validacao" na questão. Aprovada nas duas → cópia em data/acervo/<materia>.json (com o vetor).
 *      Reprovada pela 2ª vez → "revisar_humano": true e a questão sai de "questoes" para "emRevisao" (o app não mostra).
 *
 * Uso:
 *   node scripts/validar-questoes.mjs data/trilhas/enem-vestibular.json --materia matematica
 *   Opções: --fase <id>  --ids id1,id2  --limite N  --refazer  --simular  --checar-modelos
 *   --simular        mostra os prompts e o que seria feito, sem chamar API nem gravar nada.
 *   --checar-modelos só confere se os modelos configurados existem na sua conta.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { MODELOS, ARQUIVO_ENV, RAIZ } from './lib/config.mjs';
import { gemini, openai, embeddings, listarModelosGemini, listarModelosOpenAI, resumoDeCusto, ErroAPI } from './lib/ia.mjs';
import {
  slugMateria, lerAcervo, gravarAcervo, gravarJSON, caminhoAcervo, explicacaoEmTexto, alternativasEmTexto, letra,
  textoParaEmbedding, itemDoAcervo, guardarNoAcervo,
} from './lib/acervo.mjs';

/* ---------- Prompts exatos (skill validar-questoes, seção 1) ---------- */
const PROMPT_FATO = `Verifique cada afirmação factual (datas, números, fórmulas, nomes) neste texto usando busca real.
Aponte qualquer afirmação incorreta ou desatualizada, citando a fonte que a corrige.
Se tudo estiver correto, responda apenas "CONFIRMADO".

`;
const PROMPT_LOGICA = `Seu trabalho é tentar derrubar esta questão. Tente ativamente:
1. Provar que a alternativa marcada como correta está errada ou incompleta.
2. Encontrar outra alternativa que também possa estar certa.
3. Apontar ambiguidade no enunciado.
Se, mesmo tentando, a questão resistir, responda apenas "RESISTIU". Caso contrário, explique exatamente a falha encontrada.

`;

/** Camada 1 recebe a questão + explicação completa (as três camadas, quando houver). */
function textoFato(q) {
  return [
    `Enunciado: ${q.enunciado}`,
    `Alternativas:\n${alternativasEmTexto(q.alternativas)}`,
    `Resposta correta: ${letra(q.correta)}) ${q.alternativas[q.correta]}`,
    `Explicação:\n${explicacaoEmTexto(q.explicacao)}`,
  ].join('\n\n');
}

/** Camada 2 recebe enunciado + alternativas + tema + dificuldade — NUNCA o gabarito. */
function textoLogica(q) {
  return [
    `Tema: ${q.tema}`,
    `Dificuldade: ${q.dificuldade}`,
    `Enunciado: ${q.enunciado}`,
    `Alternativas:\n${alternativasEmTexto(q.alternativas)}`,
  ].join('\n\n');
}

/** "CONFIRMADO"/"RESISTIU" sozinho = confirmado; começa com a palavra mas diz mais = dúvida; o resto = reprovado. */
function classificar(resposta, palavra) {
  const limpa = String(resposta).replace(/[*_`"“”'«»]/g, '').trim().replace(/[.!\s]+$/, '').toUpperCase();
  if (limpa === palavra) return 'confirmado';
  if (limpa.startsWith(palavra)) return 'duvida';
  return 'reprovado';
}

/* ---------- Funil de custo (seção 2) ---------- */
async function camada(tipo, q) {
  const [barato, robusto, palavra, prompt, chamar] = tipo === 'fato'
    ? [MODELOS.fato, MODELOS.fatoForte, 'CONFIRMADO', PROMPT_FATO + textoFato(q), (m, t) => gemini(m, t, { busca: true })]
    : [MODELOS.logica, MODELOS.logicaForte, 'RESISTIU', PROMPT_LOGICA + textoLogica(q), (m, t) => openai(m, t)];

  const r1 = await chamar(barato, prompt);
  const s1 = classificar(r1.resposta, palavra);
  if (s1 === 'confirmado') return { status: 'confirmado', modelo: barato, escalado: false };

  // Achou algo ou ficou em dúvida: o modelo robusto desempata (falha real ou falso positivo?).
  const r2 = await chamar(robusto, prompt);
  const s2 = classificar(r2.resposta, palavra);
  return {
    status: s2 === 'confirmado' ? 'confirmado' : 'reprovado',
    modelo: robusto,
    escalado: true,
    primeira: { modelo: barato, status: s1, detalhe: r1.resposta },
    detalhe: s2 === 'confirmado' ? undefined : r2.resposta,
    fontes: (r2.fontes || r1.fontes || []).slice(0, 5),
  };
}

/* ---------- Ajudantes ---------- */
function argumentos(argv) {
  const a = { arquivo: null, materia: null, fase: null, ids: null, limite: Infinity, refazer: false, simular: false, checarModelos: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--materia') a.materia = argv[++i];
    else if (x === '--fase') a.fase = argv[++i];
    else if (x === '--ids') a.ids = new Set(String(argv[++i]).split(',').map((s) => s.trim()));
    else if (x === '--limite') a.limite = Number(argv[++i]);
    else if (x === '--refazer') a.refazer = true;
    else if (x === '--simular') a.simular = true;
    else if (x === '--checar-modelos') a.checarModelos = true;
    else if (x === '--ajuda' || x === '-h') a.ajuda = true;
    else if (!x.startsWith('--')) a.arquivo = x;
    else throw new Error(`opção desconhecida: ${x}`);
  }
  return a;
}

/** Impressão digital do conteúdo: se não mudou desde a reprovação, não adianta validar de novo. */
const assinatura = (q) => createHash('sha1').update(JSON.stringify([q.enunciado, q.alternativas, q.correta, q.explicacao])).digest('hex').slice(0, 12);
const hoje = () => new Date().toISOString().slice(0, 10);

function materiaDa(q, trilha, padrao) {
  if (padrao) return padrao;
  const fase = (trilha.fases || []).find((f) => f.id === q.fase) || {};
  return q.materia || fase.materia || null;
}

async function checarModelos({ silencioso = false } = {}) {
  const precisa = [
    ['Gemini', 'fato', MODELOS.fato], ['Gemini', 'fato (robusto)', MODELOS.fatoForte],
    ['OpenAI', 'lógica', MODELOS.logica], ['OpenAI', 'lógica (robusto)', MODELOS.logicaForte], ['OpenAI', 'embeddings', MODELOS.embedding],
  ];
  const [g, o] = await Promise.all([listarModelosGemini(), listarModelosOpenAI()]);
  const faltando = precisa.filter(([api, , m]) => !(api === 'Gemini' ? g : o).includes(m));
  if (!silencioso || faltando.length) {
    precisa.forEach(([api, papel, m]) => console.log(`  ${faltando.some((f) => f[2] === m) ? '✗' : '✓'} ${papel}: ${m} (${api})`));
  }
  if (faltando.length) {
    console.log('\nModelos que não existem na sua conta. Parecidos disponíveis:');
    console.log('  Gemini:', g.filter((n) => /flash|pro/.test(n) && !/image|tts|live|audio|embedding/.test(n)).sort().join(', ') || '(nenhum)');
    console.log('  OpenAI:', o.filter((n) => /^gpt-|^o\d|embedding/.test(n)).sort().join(', ') || '(nenhum)');
    console.log('\nAjuste no .env (DIVER_MODELO_FATO, DIVER_MODELO_FATO_FORTE, DIVER_MODELO_LOGICA, DIVER_MODELO_LOGICA_FORTE, DIVER_MODELO_EMBEDDING).');
    return false;
  }
  return true;
}

/* ---------- Programa ---------- */
async function principal() {
  const args = argumentos(process.argv.slice(2));
  if (args.ajuda || (!args.arquivo && !args.checarModelos)) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\n?/, '').replace(/^ \* ?/gm, ''));
    return;
  }
  console.log(ARQUIVO_ENV ? `Chaves lidas de ${ARQUIVO_ENV.startsWith(RAIZ) ? relative(RAIZ, ARQUIVO_ENV) : ARQUIVO_ENV}.` : 'Sem arquivo .env: usando só as variáveis do terminal.');
  if (args.checarModelos) {
    console.log('Conferindo os modelos na sua conta…');
    process.exitCode = (await checarModelos()) ? 0 : 1;
    return;
  }

  const arquivo = resolve(args.arquivo);
  if (!existsSync(arquivo)) throw new Error(`arquivo não encontrado: ${args.arquivo}`);
  const trilha = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (!Array.isArray(trilha.questoes)) throw new Error('o arquivo não parece uma trilha (falta "questoes")');
  const materiaPadrao = args.materia ? slugMateria(args.materia) : null;

  const alvo = trilha.questoes.filter((q) =>
    (!args.fase || q.fase === args.fase) && (!args.ids || args.ids.has(q.id))).slice(0, args.limite);
  const semMateria = alvo.filter((q) => !materiaDa(q, trilha, materiaPadrao));
  if (semMateria.length) throw new Error(`não sei a matéria de ${semMateria.length} questão(ões): use --materia <nome> (ex.: --materia matematica)`);

  if (args.simular) {
    console.log(`\nSIMULAÇÃO — nada é enviado nem gravado. ${alvo.length} questão(ões). Modelos: fato ${MODELOS.fato} → ${MODELOS.fatoForte}; lógica ${MODELOS.logica} → ${MODELOS.logicaForte}.`);
    alvo.slice(0, 2).forEach((q) => {
      console.log(`\n══ ${q.id} (acervo: ${caminhoAcervo(materiaDa(q, trilha, materiaPadrao)).replace(RAIZ + '/', '')}) ══`);
      console.log(`── Camada 1 (fato, ${MODELOS.fato}, com busca do Google) ──\n${PROMPT_FATO}${textoFato(q)}`);
      console.log(`── Camada 2 (lógica, ${MODELOS.logica}) ──\n${PROMPT_LOGICA}${textoLogica(q)}`);
    });
    if (alvo.length > 2) console.log(`\n… e mais ${alvo.length - 2} questão(ões) no mesmo formato.`);
    return;
  }

  console.log('Conferindo os modelos na sua conta…');
  if (!(await checarModelos({ silencioso: true }))) { process.exitCode = 1; return; }

  const rel = { primeira: [], escaladas: [], corrigidas: [], humano: [], reprovadas: [], puladas: [], erros: [] };
  const acervos = new Map();
  const acervo = (m) => { if (!acervos.has(m)) acervos.set(m, lerAcervo(m)); return acervos.get(m); };
  const salvarTrilha = () => gravarJSON(arquivo, trilha);

  for (const q of alvo) {
    const antes = q.validacao || null;
    const materia = materiaDa(q, trilha, materiaPadrao);
    const marca = assinatura(q);
    if (antes && antes.pronta && !args.refazer) { rel.puladas.push(`${q.id} (já aprovada)`); continue; }
    if (antes && !antes.pronta && antes.assinatura === marca && !args.refazer) { rel.puladas.push(`${q.id} (reprovada e ainda não corrigida)`); continue; }

    process.stdout.write(`${q.id} … `);
    try {
      // Fato reprovado e lógica aprovada antes: basta checar o fato de novo (seção 3 da skill).
      const soFato = antes && !args.refazer && antes.logica === 'confirmado' && antes.fato !== 'confirmado';
      const fato = await camada('fato', q);
      const logica = soFato ? { status: 'confirmado', modelo: antes.modelo_logica, escalado: false, reaproveitada: true } : await camada('logica', q);
      const aprovada = fato.status === 'confirmado' && logica.status === 'confirmado';
      const tentativas = (antes && !antes.pronta ? antes.tentativas || 1 : 0) + 1;

      q.validacao = {
        fato: fato.status, logica: logica.status,
        modelo_fato: fato.modelo, modelo_logica: logica.modelo,
        data: hoje(), pronta: aprovada, tentativas, assinatura: marca,
        ...(fato.escalado || logica.escalado ? { escalado: [fato.escalado && 'fato', logica.escalado && 'logica'].filter(Boolean) } : {}),
        ...(fato.detalhe ? { detalhe_fato: fato.detalhe } : {}),
        ...(fato.fontes && fato.fontes.length ? { fontes_fato: fato.fontes } : {}),
        ...(logica.detalhe ? { detalhe_logica: logica.detalhe } : {}),
      };
      if (fato.escalado || logica.escalado) rel.escaladas.push(`${q.id}: ${[fato.escalado && `fato → ${fato.status}`, logica.escalado && `lógica → ${logica.status}`].filter(Boolean).join(', ')}`);

      if (aprovada) {
        delete q.revisar_humano;
        (tentativas > 1 ? rel.corrigidas : rel.primeira).push(q.id);
        const item = itemDoAcervo(q, { trilhaId: trilha.id, materia, validacao: q.validacao });
        try {
          const [vetor] = await embeddings(MODELOS.embedding, [textoParaEmbedding(item)]);
          item.embedding = { modelo: MODELOS.embedding, vetor };
        } catch (e) {
          console.log(`\n  (sem vetor por enquanto: ${e.message}; o buscar-similares calcula depois)`);
        }
        guardarNoAcervo(acervo(materia), item);
        gravarAcervo(materia, acervo(materia));
        console.log('aprovada ✓');
      } else if (tentativas >= 2) {
        // Seção 3: reprovou de novo → para de insistir com IA e tira da trilha até revisão humana.
        const motivo = [fato.status !== 'confirmado' && `fato: ${fato.detalhe}`, logica.status !== 'confirmado' && `lógica: ${logica.detalhe}`].filter(Boolean).join(' | ');
        q.revisar_humano = true;
        trilha.questoes.splice(trilha.questoes.indexOf(q), 1);
        (trilha.emRevisao ||= []).push({ ...q, motivo_revisao: motivo });
        rel.humano.push(`${q.id} — ${motivo.slice(0, 300)}`);
        console.log('reprovada de novo → revisar_humano (saiu da trilha)');
      } else {
        rel.reprovadas.push(`${q.id} — ${fato.status !== 'confirmado' ? 'FATO: corrija o fato apontado e rode de novo só esse trecho' : 'LÓGICA: reescreva a questão do zero'}`);
        console.log(`reprovada (${fato.status !== 'confirmado' ? 'fato' : ''}${fato.status !== 'confirmado' && logica.status !== 'confirmado' ? ' e ' : ''}${logica.status !== 'confirmado' ? 'lógica' : ''})`);
      }
      salvarTrilha(); // grava a cada questão: se cair no meio, nada se perde
    } catch (e) {
      if (!(e instanceof ErroAPI)) throw e;
      rel.erros.push(`${q.id}: ${e.message}`);
      console.log(`erro (${e.message})`);
      if (/não configurada|HTTP 40[13]/.test(e.message)) break; // sem chave ou chave recusada: não adianta seguir
    }
  }

  /* ---------- Relatório final (seção 5) ---------- */
  const custo = resumoDeCusto();
  const lista = (titulo, itens) => console.log(`\n${titulo}: ${itens.length}${itens.length ? '\n' + itens.map((x) => `  - ${x}`).join('\n') : ''}`);
  console.log('\n══════ Mergulho Triplo — relatório ══════');
  lista('Passaram nas duas camadas de primeira', rel.primeira);
  lista('Precisaram de escalonamento (modelo robusto) e resultado', rel.escaladas);
  lista('Corrigidas e revalidadas com sucesso', rel.corrigidas);
  lista('Reprovadas nesta rodada (1ª vez: corrigir e rodar de novo)', rel.reprovadas);
  lista('Marcadas revisar_humano (saíram da trilha para "emRevisao")', rel.humano);
  lista('Puladas', rel.puladas);
  if (rel.erros.length) lista('Erros de API', rel.erros);
  console.log(`\nCusto estimado desta rodada: US$ ${custo.total.toFixed(4)}`);
  custo.linhas.forEach((l) => console.log(l));
}

principal().catch((e) => {
  console.error(`\nErro: ${e.message}`);
  process.exitCode = 1;
});

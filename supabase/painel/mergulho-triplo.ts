// @ts-nocheck
/*
 * ARQUIVO GERADO por scripts/juntar-funcao.mjs — não edite aqui; edite supabase/functions/ e gere de novo.
 * Edge Function "mergulho-triplo" num arquivo só, para colar no painel do Supabase:
 * Edge Functions → Deploy a new function → Via Editor → nome: mergulho-triplo → apague o exemplo,
 * cole TODO este arquivo → Deploy. Deixe "Verify JWT" ligado. Guia: docs/MOTOR_DIVER.md, seção 11.6.
 * Chaves: GEMINI_API_KEY e OPENAI_API_KEY só nos Secrets das Edge Functions (Deno.env.get).
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ═══════════ _shared/mergulho-nucleo.mjs ═══════════
/*
 * mergulho-nucleo.mjs — o "miolo" do Mergulho Triplo, igual para a Edge Function (Deno) e para os
 * scripts locais (Node): prompts exatos, funil de custo, regra das tentativas, fórmula de custo
 * estimado e o formato do item do Acervo Diver.
 *
 * Não lê chave, não lê variável de ambiente e não chama API sozinho: quem chama as IAs recebe as
 * funções prontas (a Edge Function monta essas funções com Deno.env.get dentro do servidor).
 * Fonte das regras: .claude/skills/validar-questoes/SKILL.md e docs/ASSINATURA_E_VALIDACAO.md.
 */

/* ---------- Modelos (trocáveis por variáveis de ambiente da função: DIVER_MODELO_*) ---------- */
const MODELOS_PADRAO = {
  fato: 'gemini-3.8-flash',            // Flash mais novo (GA); a doc do kit chama de "Gemini 3 Flash"
  fatoForte: 'gemini-3.1-pro-preview', // desempate da camada de fato
  logica: 'gpt-5-mini',                // "mini" mais barato da OpenAI
  logicaForte: 'gpt-5.5',              // desempate da camada de lógica
  embedding: 'text-embedding-3-small', // vetor guardado junto do item aprovado
};

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

const LETRAS = 'ABCDEF';
const letra = (i) => LETRAS[i];
const alternativasEmTexto = (alternativas) => (alternativas || []).map((a, i) => `${LETRAS[i]}) ${a}`).join('\n');

/** Explicação em texto corrido: aceita a de 3 camadas ({ superficie, fundo, dica }) e a antiga (texto). */
function explicacaoEmTexto(explicacao) {
  if (!explicacao) return '';
  if (typeof explicacao === 'string') return explicacao;
  return [
    explicacao.superficie && `Na superfície: ${explicacao.superficie}`,
    explicacao.fundo && `Mergulhando fundo: ${explicacao.fundo}`,
    explicacao.dica && `Dica de mergulhador: ${explicacao.dica}`,
  ].filter(Boolean).join('\n');
}

/** Camada 1 recebe a questão + a explicação completa (as três camadas, quando houver). */
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
  return [`Tema: ${q.tema}`, `Dificuldade: ${q.dificuldade}`, `Enunciado: ${q.enunciado}`, `Alternativas:\n${alternativasEmTexto(q.alternativas)}`].join('\n\n');
}

const promptFato = (q) => PROMPT_FATO + textoFato(q);
const promptLogica = (q) => PROMPT_LOGICA + textoLogica(q);

/** "CONFIRMADO"/"RESISTIU" sozinho = confirmado; começa com a palavra mas diz mais = dúvida; o resto = reprovado. */
function classificar(resposta, palavra) {
  const limpa = String(resposta).replace(/[*_`"“”'«»]/g, '').trim().replace(/[.!\s]+$/, '').toUpperCase();
  if (limpa === palavra) return 'confirmado';
  if (limpa.startsWith(palavra)) return 'duvida';
  return 'reprovado';
}

/* ---------- Campos que viajam (nada de texto de referência de terceiros) ---------- */
/**
 * Só estes campos da questão entram na fila e no acervo (docs/MOTOR_DIVER.md, seção 4):
 * conteúdo nosso ou questão literal do Enem com a fonte. Qualquer outro campo (anotação,
 * trecho de apostila, "referencia"...) é descartado aqui, antes de sair do computador.
 */
const CAMPOS_DA_QUESTAO = ['id', 'tema', 'dificuldade', 'fase', 'enunciado', 'alternativas', 'correta', 'explicacao', 'origem', 'fonte', 'varianteDe', 'validacao'];
function questaoLimpa(q) {
  const limpa = {};
  CAMPOS_DA_QUESTAO.forEach((c) => { if (q[c] !== undefined) limpa[c] = q[c]; });
  return limpa;
}

/* ---------- Variantes (docs/MOTOR_DIVER.md, seção 12) ---------- */
/**
 * Questão origem "enem" NUNCA ganha variante: a licença CC BY-ND (Sem Derivações) proíbe
 * (docs/CONTEUDO_CURSINHO.md, seção 1.1). Confere um lote: toda variante precisa dizer de qual
 * questão é (varianteDe) e o lote precisa trazer a origem dessa original em "originais".
 * Origem desconhecida conta como Enem: na dúvida, recusa. Devolve [{ id, motivo }] (vazio = ok).
 */
function variantesProibidas(conteudo) {
  const originais = (conteudo && conteudo.originais) || {};
  return ((conteudo && conteudo.questoes) || [])
    .filter((q) => q && q.varianteDe !== undefined)
    .map((q) => {
      const original = originais[q.varianteDe];
      if (q.origem === 'enem') return { id: q.id, motivo: 'a própria variante está marcada como Enem' };
      if (!original || !original.origem) return { id: q.id, motivo: `origem da questão original "${q.varianteDe}" desconhecida` };
      if (original.origem === 'enem') return { id: q.id, motivo: `"${q.varianteDe}" é questão do Enem (licença Sem Derivações)` };
      return null;
    })
    .filter(Boolean);
}

/** Impressão digital do conteúdo (se não mudou desde a reprovação, não adianta validar de novo). */
async function assinatura(q) {
  const dados = new TextEncoder().encode(JSON.stringify([q.enunciado, q.alternativas, q.correta, q.explicacao]));
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', dados));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

/* ---------- Funil de custo (skill, seção 2) ---------- */
/**
 * chamar(modelo, prompt) → { resposta, fontes? }. Barato primeiro; o robusto só entra quando
 * a resposta não é exatamente a palavra de aprovação, para desempatar (falha real ou falso positivo).
 */
async function rodarCamada(tipo, q, { chamar, modelos }) {
  const [barato, robusto, palavra, prompt] = tipo === 'fato'
    ? [modelos.fato, modelos.fatoForte, 'CONFIRMADO', promptFato(q)]
    : [modelos.logica, modelos.logicaForte, 'RESISTIU', promptLogica(q)];
  const r1 = await chamar(barato, prompt);
  const s1 = classificar(r1.resposta, palavra);
  if (s1 === 'confirmado') return { status: 'confirmado', modelo: barato, escalado: false };
  const r2 = await chamar(robusto, prompt);
  const s2 = classificar(r2.resposta, palavra);
  return {
    status: s2 === 'confirmado' ? 'confirmado' : 'reprovado',
    modelo: robusto,
    escalado: true,
    detalhe: s2 === 'confirmado' ? undefined : resumir(r2.resposta),
    fontes: ((r2.fontes && r2.fontes.length ? r2.fontes : r1.fontes) || []).slice(0, 5),
  };
}

/** Detalhes guardados curtos: servem para corrigir a questão, não para arquivar texto de fora. */
const resumir = (texto) => { const t = String(texto || '').trim(); return t.length > 800 ? t.slice(0, 800) + '…' : t; };

/**
 * Valida UMA questão (seção 3 da skill). Devolve o novo bloco "validacao" e o que fazer com ela:
 *  - aprovada → vai para o acervo;
 *  - reprovada pela 1ª vez → volta para correção (fato: corrigir o trecho; lógica: reescrever do zero);
 *  - reprovada pela 2ª vez → revisar_humano (sai da trilha até revisão manual).
 * Se só o fato tinha reprovado e a lógica já estava confirmada, só a camada de fato roda de novo.
 */
async function validarQuestao(q, { chamarFato, chamarLogica, modelos, hoje, refazer = false }) {
  const antes = q.validacao || null;
  const marca = await assinatura(q);
  if (antes && antes.pronta && !refazer) return { pulada: 'já aprovada' };
  if (antes && !antes.pronta && antes.assinatura === marca && !refazer) return { pulada: 'reprovada e ainda não corrigida' };

  const soFato = antes && !refazer && antes.logica === 'confirmado' && antes.fato !== 'confirmado';
  const fato = await rodarCamada('fato', q, { chamar: chamarFato, modelos });
  const logica = soFato ? { status: 'confirmado', modelo: antes.modelo_logica, escalado: false } : await rodarCamada('logica', q, { chamar: chamarLogica, modelos });
  const aprovada = fato.status === 'confirmado' && logica.status === 'confirmado';
  const tentativas = (antes && !antes.pronta ? antes.tentativas || 1 : 0) + 1;
  const validacao = {
    fato: fato.status, logica: logica.status,
    modelo_fato: fato.modelo, modelo_logica: logica.modelo,
    data: hoje, pronta: aprovada, tentativas, assinatura: marca,
    ...(fato.escalado || logica.escalado ? { escalado: [fato.escalado && 'fato', logica.escalado && 'logica'].filter(Boolean) } : {}),
    ...(fato.detalhe ? { detalhe_fato: fato.detalhe } : {}),
    ...(fato.fontes && fato.fontes.length ? { fontes_fato: fato.fontes } : {}),
    ...(logica.detalhe ? { detalhe_logica: logica.detalhe } : {}),
  };
  const motivo = [fato.status !== 'confirmado' && `fato: ${fato.detalhe}`, logica.status !== 'confirmado' && `lógica: ${logica.detalhe}`].filter(Boolean).join(' | ');
  return {
    validacao,
    aprovada,
    revisarHumano: !aprovada && tentativas >= 2,
    orientacao: aprovada ? null : fato.status !== 'confirmado' && logica.status === 'confirmado'
      ? 'FATO: corrija o fato apontado e envie de novo só esta questão'
      : 'LÓGICA: reescreva a questão do zero',
    motivo: motivo || null,
    escalado: validacao.escalado || [],
  };
}

/* ---------- Acervo Diver ---------- */
/** Cópia da questão aprovada que entra em data/acervo/<materia>.json (só campos nossos). */
function itemDoAcervo(q, { trilhaId, materia, validacao }) {
  return {
    id: q.id,
    trilha: trilhaId,
    materia,
    fase: q.fase,
    tema: q.tema,
    dificuldade: q.dificuldade,
    origem: q.origem || 'diver',
    ...(q.fonte ? { fonte: q.fonte } : {}),
    ...(q.varianteDe ? { varianteDe: q.varianteDe } : {}),
    enunciado: q.enunciado,
    alternativas: q.alternativas,
    correta: q.correta,
    explicacao: q.explicacao,
    validado_em: validacao.data,
    validacao: { modelo_fato: validacao.modelo_fato, modelo_logica: validacao.modelo_logica },
  };
}

/** O texto que vira vetor (igual na hora de guardar e na hora de buscar). */
function textoParaEmbedding(item) {
  return [`Tema: ${item.tema || ''}`, `Dificuldade: ${item.dificuldade || ''}`, item.enunciado || '', alternativasEmTexto(item.alternativas), explicacaoEmTexto(item.explicacao)]
    .filter(Boolean).join('\n');
}

/* ---------- Custo ---------- */
/**
 * Preços de docs/ASSINATURA_E_VALIDACAO.md, seção 3 (US$ por 1 milhão de tokens).
 * O documento não traz número para o GPT-5.2 mini ("bem mais barato que o cheio"), então a
 * estimativa usa o preço do GPT-5.2 cheio como TETO na camada de lógica. Melhor sobrar que faltar.
 */
const PRECOS_DOC = {
  fato: { entrada: 0.75, saida: 3.75 },     // Gemini 3 Flash (promocional até o fim de 2026)
  busca: 14 / 1000,                          // busca do Google: US$ 14 por 1.000 (5.000 grátis/mês não são descontados)
  logica: { entrada: 1.75, saida: 14 },     // GPT-5.2 (teto também para o mini)
};
const ESTIMATIVA = {
  caracteresPorToken: 4,     // regra de bolso para português
  saidaPorCamada: 800,       // tokens de resposta (inclui "raciocínio") por chamada, com folga
  folgaEscalonamento: 1.3,   // +30% para as questões que escalam para o modelo robusto
};

/** custo_estimado_usd = soma por questão de [fato (tokens + 1 busca) + lógica (tokens)] × 1,3. */
function estimarCusto(questoes) {
  const { caracteresPorToken, saidaPorCamada, folgaEscalonamento } = ESTIMATIVA;
  let total = 0;
  for (const q of questoes) {
    const entFato = Math.ceil(promptFato(q).length / caracteresPorToken);
    const entLogica = Math.ceil(promptLogica(q).length / caracteresPorToken);
    total += (entFato * PRECOS_DOC.fato.entrada + saidaPorCamada * PRECOS_DOC.fato.saida) / 1e6 + PRECOS_DOC.busca;
    total += (entLogica * PRECOS_DOC.logica.entrada + saidaPorCamada * PRECOS_DOC.logica.saida) / 1e6;
  }
  return Math.round(total * folgaEscalonamento * 10000) / 10000;
}

/** Preço por modelo para o custo REAL (tokens medidos). Modelo sem preço aqui: usa o teto da camada. */
const PRECOS_MODELO = {
  'gemini-3.8-flash': [0.75, 3.75],
  'gpt-5-mini': [0.25, 2.0],
  'gpt-5.2': [1.75, 14],
  'text-embedding-3-small': [0.02, 0],
};

/** uso = { [modelo]: { entrada, saida, buscas } } → US$ */
function custoReal(uso) {
  let total = 0;
  for (const [modelo, u] of Object.entries(uso)) {
    const p = PRECOS_MODELO[modelo] || (/^gemini/.test(modelo) ? [PRECOS_DOC.fato.entrada * 4, PRECOS_DOC.fato.saida * 4] : [PRECOS_DOC.logica.entrada, PRECOS_DOC.logica.saida]);
    total += (u.entrada * p[0] + u.saida * p[1]) / 1e6 + (u.buscas || 0) * PRECOS_DOC.busca;
  }
  return Math.round(total * 10000) / 10000;
}

/* ---------- Montar os lotes da fila (o mesmo para o fila.mjs e para a tela Admin → Fila) ---------- */
const MAX_POR_LOTE = 20; // cabe com folga no tempo de uma execução da Edge Function

/** "Matemática" → "matematica" (nome do arquivo do acervo: minúsculas, sem acento, com hífen). */
function slugMateria(nome) {
  const s = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) throw new Error('matéria vazia: informe a matéria (ex.: matematica)');
  return s;
}

/**
 * Monta os lotes 'pendente' de uma trilha. opcoes: { materia, arquivo, fase, ids (Set), variantes, refazer }.
 * Com variantes: manda o bloco "variantes" e aplica a trava 1 de 3 (nunca variante de questão do Enem,
 * nunca variante igual à original). Só os campos da questão viajam (questaoLimpa).
 */
/** Nome de onda ("1A", "1B", "mat-m1"...): o mesmo formato que o banco aceita (fila_validacao.onda). */
const ONDA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

async function montarLotes(trilha, { materia, arquivo, fase = null, ids = null, variantes = false, refazer = false, onda = null }) {
  const slug = slugMateria(materia);
  if (onda && !ONDA.test(onda)) throw new Error(`nome de onda inválido: "${onda}" (use letras, números, ponto, hífen ou _, até 40)`);
  const questoes = new Map((trilha.questoes || []).map((q) => [q.id, q]));
  const fonte = variantes ? trilha.variantes || [] : trilha.questoes || [];
  if (variantes && !fonte.length) throw new Error('a trilha não tem bloco "variantes"');
  const escolhidas = [];
  const puladas = [];
  const originais = {};
  for (const q of fonte) {
    if (fase && q.fase !== fase) continue;
    if (ids && !ids.has(q.id) && !(variantes && ids.has(q.varianteDe))) continue;
    if (variantes) {
      const original = questoes.get(q.varianteDe);
      if (!original) throw new Error(`variante ${q.id}: "varianteDe" (${q.varianteDe}) não existe nas questões da trilha`);
      if (original.origem === 'enem' || q.origem === 'enem') throw new Error(`variante ${q.id}: ${q.varianteDe} é questão do Enem e NUNCA pode ter variante (licença Sem Derivações, docs/CONTEUDO_CURSINHO.md 1.1). Apague essa variante.`);
      if (q.enunciado === original.enunciado) throw new Error(`variante ${q.id}: o enunciado é igual ao da original`);
      originais[q.varianteDe] = { origem: original.origem || 'diver', tema: original.tema, dificuldade: original.dificuldade };
    }
    const v = q.validacao;
    if (v && v.pronta && !refazer) { puladas.push(`${q.id} (já aprovada)`); continue; }
    if (v && !v.pronta && v.assinatura === await assinatura(q) && !refazer) { puladas.push(`${q.id} (reprovada e ainda não corrigida)`); continue; }
    escolhidas.push(questaoLimpa(q)); // só os campos da questão: nada de anotação ou texto de referência
  }
  const lotes = [];
  for (let i = 0; i < escolhidas.length; i += MAX_POR_LOTE) {
    const parte = escolhidas.slice(i, i + MAX_POR_LOTE);
    const conteudo = { versao: 1, arquivo, trilha_nome: trilha.nome, fase: fase || null, questoes: parte };
    if (variantes) {
      conteudo.tipo = 'variantes';
      conteudo.originais = Object.fromEntries(parte.map((x) => [x.varianteDe, originais[x.varianteDe]]));
      const proibidas = variantesProibidas(conteudo); // a mesma regra do servidor, conferida antes de enviar
      if (proibidas.length) throw new Error(`lote recusado: ${proibidas.map((p) => `${p.id}: ${p.motivo}`).join('; ')}`);
    }
    const lote = { trilha_id: trilha.id, materia: slug, quantidade_questoes: parte.length, custo_estimado_usd: estimarCusto(parte), conteudo_pendente: conteudo };
    if (onda) lote.onda = onda;
    lotes.push(lote);
  }
  return { lotes, puladas };
}

// ═══════════ _shared/ias.mjs ═══════════
/*
 * ias.mjs — chamadas ao Gemini (com busca do Google) e à OpenAI, só com fetch.
 * As chaves chegam como PARÂMETRO (a Edge Function as lê de Deno.env.get no servidor).
 * Nenhuma mensagem de erro inclui a chave: ela só viaja no cabeçalho da requisição.
 * Conta os tokens de cada chamada (uso) para o custo real do relatório.
 */
class ErroIA extends Error {}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function resumirErro(corpo) {
  try {
    const j = JSON.parse(corpo);
    return String((j.error && (j.error.message || j.error.status)) || corpo).slice(0, 300);
  } catch (e) {
    return String(corpo).slice(0, 300);
  }
}

function criarClientes({ geminiKey, openaiKey, geminiBase = 'https://generativelanguage.googleapis.com/v1beta', openaiBase = 'https://api.openai.com/v1', timeoutMs = 90_000 }) {
  const uso = {}; // { modelo: { entrada, saida, buscas, chamadas } }
  const somar = (modelo, entrada = 0, saida = 0, buscas = 0) => {
    const u = (uso[modelo] ||= { entrada: 0, saida: 0, buscas: 0, chamadas: 0 });
    u.entrada += entrada; u.saida += saida; u.buscas += buscas; u.chamadas += 1;
  };

  async function chamar(url, opcoes, rotulo) {
    const esperas = [2000, 6000];
    for (let tentativa = 0; ; tentativa++) {
      let resp;
      try {
        resp = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(timeoutMs) });
      } catch (e) {
        if (tentativa < esperas.length) { await dormir(esperas[tentativa]); continue; }
        throw new ErroIA(`${rotulo}: sem resposta (${e && e.name === 'TimeoutError' ? 'tempo esgotado' : 'falha de rede'})`);
      }
      if (resp.ok) return resp.json();
      const corpo = await resp.text().catch(() => '');
      if ((resp.status === 429 || resp.status >= 500) && tentativa < esperas.length) { await dormir(esperas[tentativa]); continue; }
      throw new ErroIA(`${rotulo}: HTTP ${resp.status} — ${resumirErro(corpo)}`);
    }
  }

  const exigir = (valor, nome) => { if (!valor) throw new ErroIA(`${nome} não configurada nos Secrets das Edge Functions do Supabase.`); return valor; };

  /** Camada de fato: Gemini com a ferramenta de busca do Google ligada. */
  async function gemini(modelo, texto) {
    const j = await chamar(`${geminiBase}/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': exigir(geminiKey, 'GEMINI_API_KEY') },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: texto }] }], tools: [{ google_search: {} }] }),
    }, `Gemini (${modelo})`);
    const cand = (j.candidates || [])[0];
    const resposta = ((cand && cand.content && cand.content.parts) || []).map((p) => p.text || '').join('').trim();
    const meta = (cand && cand.groundingMetadata) || null;
    const fontes = meta && meta.groundingChunks ? meta.groundingChunks.map((c) => c.web && c.web.uri).filter(Boolean) : [];
    const u = j.usageMetadata || {};
    somar(modelo, u.promptTokenCount || 0, (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), meta && meta.webSearchQueries && meta.webSearchQueries.length ? 1 : 0);
    if (!resposta) throw new ErroIA(`Gemini (${modelo}): resposta vazia${cand && cand.finishReason ? ` (${cand.finishReason})` : ''}`);
    return { resposta, fontes };
  }

  /** Camada de lógica: Chat Completions sem temperatura nem campos de raciocínio (serve para mini e completo). */
  async function openai(modelo, texto) {
    const j = await chamar(`${openaiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${exigir(openaiKey, 'OPENAI_API_KEY')}` },
      body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content: texto }] }),
    }, `OpenAI (${modelo})`);
    const resposta = String((((j.choices || [])[0] || {}).message || {}).content || '').trim();
    const u = j.usage || {};
    somar(modelo, u.prompt_tokens || 0, u.completion_tokens || 0);
    if (!resposta) throw new ErroIA(`OpenAI (${modelo}): resposta vazia`);
    return { resposta };
  }

  async function embeddings(modelo, textos) {
    const j = await chamar(`${openaiBase}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${exigir(openaiKey, 'OPENAI_API_KEY')}` },
      body: JSON.stringify({ model: modelo, input: textos }),
    }, `Embeddings (${modelo})`);
    somar(modelo, (j.usage && j.usage.prompt_tokens) || 0, 0);
    const dados = [...(j.data || [])].sort((a, b) => a.index - b.index);
    if (dados.length !== textos.length) throw new ErroIA(`Embeddings (${modelo}): esperava ${textos.length} vetores`);
    return dados.map((d) => d.embedding);
  }

  /** Listas de modelos da conta (grátis): conferir os nomes antes de gastar. */
  async function listarGemini() {
    const nomes = [];
    let pagina = '';
    do {
      const j = await chamar(`${geminiBase}/models?pageSize=1000${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ''}`, {
        headers: { 'x-goog-api-key': exigir(geminiKey, 'GEMINI_API_KEY') },
      }, 'Gemini (lista de modelos)');
      (j.models || []).forEach((m) => nomes.push(String(m.name || '').replace(/^models\//, '')));
      pagina = j.nextPageToken || '';
    } while (pagina);
    return nomes;
  }
  async function listarOpenAI() {
    const j = await chamar(`${openaiBase}/models`, { headers: { Authorization: `Bearer ${exigir(openaiKey, 'OPENAI_API_KEY')}` } }, 'OpenAI (lista de modelos)');
    return (j.data || []).map((m) => m.id);
  }

  return { gemini, openai, embeddings, listarGemini, listarOpenAI, uso };
}

// ═══════════ _shared/processar-lote.mjs ═══════════
/*
 * processar-lote.mjs — roda o Mergulho Triplo num lote da fila_validacao.
 * Separado da Edge Function (index.ts) para poder ser testado no Node com IAs falsas.
 *
 * - Recusa o lote (sem custo) se ele tiver variante de questão do Enem (licença Sem Derivações).
 * - Confere antes se os modelos existem na conta (lista grátis): nome errado não gasta nada.
 * - Valida até `paralelas` questões ao mesmo tempo e para de começar novas quando o tempo
 *   da função está acabando (o que ficou para trás continua numa próxima execução).
 * - Grava o progresso a cada questão (salvar), então uma queda no meio não perde o que foi pago.
 */

async function processarLote(linha, { clientes, modelos, salvar, hoje, limiteMs = 110_000, paralelas = 3, agora = () => Date.now() }) {
  const inicio = agora();
  const conteudo = linha.conteudo_pendente || {};
  const questoes = (conteudo.questoes || []).map(questaoLimpa);
  const anterior = linha.resultado || {};
  const resultado = {
    versao: 1,
    trilha_id: linha.trilha_id,
    materia: linha.materia,
    arquivo: conteudo.arquivo || null,
    por_questao: { ...(anterior.por_questao || {}) },
    aprovadas: [...(anterior.aprovadas || [])],
    modelos,
    custo_real_usd: anterior.custo_real_usd || 0,
  };

  // 0. Trava: variante de questão do Enem não roda (licença Sem Derivações). Recusa o lote inteiro, sem custo.
  const proibidas = variantesProibidas(conteudo);
  if (proibidas.length) {
    return { status: 'rejeitado', erro: `Lote recusado: variante de questão do Enem não pode existir (${proibidas.map((p) => `${p.id}: ${p.motivo}`).join('; ')}).`, resultado };
  }

  // 1. Os modelos existem? (se não, para aqui sem nenhuma chamada paga)
  const [g, o] = await Promise.all([clientes.listarGemini(), clientes.listarOpenAI()]);
  const faltando = [['gemini', modelos.fato], ['gemini', modelos.fatoForte], ['openai', modelos.logica], ['openai', modelos.logicaForte], ['openai', modelos.embedding]]
    .filter(([api, m]) => !(api === 'gemini' ? g : o).includes(m)).map(([, m]) => m);
  if (faltando.length) {
    return { status: 'aprovado', erro: `Modelo(s) não encontrado(s) na conta: ${faltando.join(', ')}. Ajuste DIVER_MODELO_* nos Secrets da função.`, resultado };
  }

  const feitas = (id) => { const r = resultado.por_questao[id]; return r && !r.erro; };
  const fila = questoes.filter((q) => !feitas(q.id));
  let pararTudo = null;

  async function uma(q) {
    try {
      const r = await validarQuestao(q, { chamarFato: clientes.gemini, chamarLogica: clientes.openai, modelos, hoje });
      if (r.pulada) {
        resultado.por_questao[q.id] = { pulada: r.pulada };
      } else {
        resultado.por_questao[q.id] = { validacao: r.validacao, aprovada: r.aprovada, revisar_humano: r.revisarHumano, orientacao: r.orientacao, motivo: r.motivo, escalado: r.escalado };
        if (r.aprovada) {
          const item = itemDoAcervo(q, { trilhaId: linha.trilha_id, materia: linha.materia, validacao: r.validacao });
          try {
            const [vetor] = await clientes.embeddings(modelos.embedding, [textoParaEmbedding(item)]);
            item.embedding = { modelo: modelos.embedding, vetor };
          } catch (e) {
            item.embedding = null; // sem vetor por enquanto: a busca local usa palavras
          }
          resultado.aprovadas = resultado.aprovadas.filter((x) => x.id !== item.id).concat(item);
        }
      }
    } catch (e) {
      resultado.por_questao[q.id] = { erro: String(e && e.message || e) };
      if (/HTTP 40[13]|não configurada/.test(resultado.por_questao[q.id].erro)) pararTudo = resultado.por_questao[q.id].erro; // chave ausente/recusada
    }
    resultado.custo_real_usd = Math.round(((anterior.custo_real_usd || 0) + custoReal(clientes.uso)) * 10000) / 10000;
    await salvar(resultado);
  }

  // Pool simples: `paralelas` de cada vez, sem começar nada novo perto do fim do tempo.
  let i = 0;
  async function trabalhador() {
    while (i < fila.length && !pararTudo && agora() - inicio < limiteMs) {
      const q = fila[i++];
      await uma(q);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, paralelas) }, trabalhador));

  resultado.relatorio = relatorio(questoes, resultado);
  resultado.uso = clientes.uso;
  const pendentes = questoes.filter((q) => !feitas(q.id));
  if (pararTudo) return { status: 'aprovado', erro: pararTudo, resultado };
  if (pendentes.length) {
    resultado.parcial = true;
    return { status: 'aprovado', erro: `Faltaram ${pendentes.length} questão(ões) (tempo da função ou erro de API). Confirme a senha e execute de novo para continuar de onde parou.`, resultado };
  }
  resultado.parcial = false;
  return { status: 'concluido', erro: null, resultado };
}

/** Relatório da seção 5 da skill. */
function relatorio(questoes, resultado) {
  const r = { total: questoes.length, primeira: [], escaladas: [], corrigidas: [], reprovadas: [], revisar_humano: [], puladas: [], erros: [] };
  for (const q of questoes) {
    const x = resultado.por_questao[q.id];
    if (!x) continue;
    if (x.erro) { r.erros.push({ id: q.id, erro: x.erro }); continue; }
    if (x.pulada) { r.puladas.push({ id: q.id, motivo: x.pulada }); continue; }
    if (x.escalado && x.escalado.length) r.escaladas.push({ id: q.id, camadas: x.escalado, resultado: x.aprovada ? 'aprovada' : 'reprovada' });
    if (x.aprovada) (x.validacao.tentativas > 1 ? r.corrigidas : r.primeira).push(q.id);
    else if (x.revisar_humano) r.revisar_humano.push({ id: q.id, motivo: x.motivo });
    else r.reprovadas.push({ id: q.id, orientacao: x.orientacao, motivo: x.motivo });
  }
  return r;
}

// ═══════════ mergulho-triplo/index.ts ═══════════
/*
 * Edge Function "mergulho-triplo" — roda o Mergulho Triplo num lote da fila_validacao.
 * Guia: docs/MOTOR_DIVER.md (seções 5 e 11) e .claude/skills/validar-questoes/SKILL.md.
 *
 * Só executa quando TUDO isto é verdade:
 *   1. quem chama está logado e é admin ativo (perfis.papel = 'admin');
 *   2. o token de acesso veio de uma confirmação de senha feita há no máximo 5 minutos
 *      (claim "amr" do Supabase Auth: método "password" com horário recente);
 *   3. o lote está com status 'aprovado' (aprovado antes pela função do banco fila_aprovar,
 *      que também exige a senha recente) — e passa para 'executando' numa operação só,
 *      então dois cliques não geram duas execuções pagas;
 *   4. o lote não tem variante de questão do Enem (processarLote recusa sem custo; o banco já
 *      recusa na entrada da fila — licença Sem Derivações, docs/MOTOR_DIVER.md seção 12).
 *
 * Lote de uma ONDA aprovada (fila_aprovar_onda, com a senha e um teto em US$): os itens 2 e 3 viram a
 * função do banco fila_onda_iniciar_lote, que confere numa operação só se a autorização está ativa,
 * se não venceu (12 h) e se o gasto da onda + o custo estimado do lote cabem no teto. Assim a tela
 * executa a onda lote a lote sem pedir a senha a cada 5 minutos, e nunca passa do teto aprovado.
 *
 * Chaves: GEMINI_API_KEY e OPENAI_API_KEY vêm SÓ de Deno.env.get (Secrets das Edge Functions,
 * cadastrados pelo admin no painel do Supabase). Nunca de tabela, arquivo ou resposta; o valor
 * nunca aparece em log nem em mensagem de erro. A ação "status" diz apenas se cada chave EXISTE.
 *
 * Pedidos (POST, JSON):
 *   { "acao": "status" }                → { chaves: { gemini: bool, openai: bool }, modelos }   (sem custo)
 *   { "acao": "executar", "id": uuid }  → 202 e o trabalho segue em segundo plano (custo real)
 */

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SENHA_VALE_SEGUNDOS = 300; // mesma janela da função fila_aprovar (supabase/setup.sql)
const LIMITE_MS = Number(Deno.env.get('DIVER_LIMITE_SEGUNDOS') || 110) * 1000; // plano grátis: 150 s por execução
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** Lê as claims do JWT (a assinatura já foi conferida pelo gateway e pelo auth.getUser). */
function claims(token: string): Record<string, unknown> {
  try {
    const parte = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(parte + '='.repeat((4 - (parte.length % 4)) % 4)));
  } catch (_e) {
    return {};
  }
}

/** A senha foi digitada há pouco? (reautenticação: login por senha dentro da janela) */
function senhaRecente(c: Record<string, unknown>): boolean {
  const agora = Math.floor(Date.now() / 1000);
  const amr = Array.isArray(c.amr) ? c.amr as Array<{ method?: string; timestamp?: number }> : [];
  return amr.some((a) => a && a.method === 'password' && Number(a.timestamp) >= agora - SENHA_VALE_SEGUNDOS);
}

function modelos() {
  return {
    fato: Deno.env.get('DIVER_MODELO_FATO') || MODELOS_PADRAO.fato,
    fatoForte: Deno.env.get('DIVER_MODELO_FATO_FORTE') || MODELOS_PADRAO.fatoForte,
    logica: Deno.env.get('DIVER_MODELO_LOGICA') || MODELOS_PADRAO.logica,
    logicaForte: Deno.env.get('DIVER_MODELO_LOGICA_FORTE') || MODELOS_PADRAO.logicaForte,
    embedding: Deno.env.get('DIVER_MODELO_EMBEDDING') || MODELOS_PADRAO.embedding,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Use POST.' });

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return resposta(401, { erro: 'Entre com sua conta de admin.' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: quem, error: erroQuem } = await db.auth.getUser(token);
  if (erroQuem || !quem || !quem.user) return resposta(401, { erro: 'Sua sessão expirou. Entre de novo.' });
  const { data: perfil } = await db.from('perfis').select('papel, ativo').eq('id', quem.user.id).maybeSingle();
  if (!perfil || perfil.papel !== 'admin' || !perfil.ativo) return resposta(403, { erro: 'Só o admin usa o Mergulho Triplo.' });

  let corpo: { acao?: string; id?: string } = {};
  try {
    corpo = await req.json();
  } catch (_e) {
    return resposta(400, { erro: 'Pedido sem JSON.' });
  }

  // Diagnóstico sem custo: as chaves EXISTEM nos Secrets? (nunca devolve o valor)
  if (corpo.acao === 'status') {
    return resposta(200, {
      chaves: { gemini: !!Deno.env.get('GEMINI_API_KEY'), openai: !!Deno.env.get('OPENAI_API_KEY') },
      modelos: modelos(),
      senha_vale_segundos: SENHA_VALE_SEGUNDOS,
    });
  }
  if (corpo.acao !== 'executar') return resposta(400, { erro: 'Ação desconhecida.' });

  const c = claims(token);
  if (c.sub !== quem.user.id) return resposta(401, { erro: 'Sessão inválida. Entre de novo.' });
  if (!corpo.id || !UUID.test(corpo.id)) return resposta(400, { erro: 'Lote inválido.' });

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!geminiKey || !openaiKey) {
    return resposta(500, { erro: `Falta cadastrar nos Secrets das Edge Functions: ${[!geminiKey && 'GEMINI_API_KEY', !openaiKey && 'OPENAI_API_KEY'].filter(Boolean).join(' e ')}.` });
  }

  const { data: alvo } = await db.from('fila_validacao').select('onda_aprovacao').eq('id', corpo.id).maybeSingle();
  let linha;
  if (alvo && alvo.onda_aprovacao) {
    // Lote de onda aprovada: o banco confere validade e teto e passa para 'executando' numa operação só.
    const { data: inicio, error: erroOnda } = await db.rpc('fila_onda_iniciar_lote', { p_id: corpo.id, p_usuario: quem.user.id });
    if (erroOnda) return resposta(500, { erro: 'Não consegui conferir a onda para execução.' });
    if (!inicio || !inicio.ok) return resposta(409, { erro: (inicio && inicio.motivo) || 'A onda não permite executar este lote.', teto: !!(inicio && inicio.teto) });
    const { data: l } = await db.from('fila_validacao').select('*').eq('id', corpo.id).maybeSingle();
    if (!l) return resposta(500, { erro: 'Não encontrei o lote depois de travar.' });
    linha = l;
  } else {
    if (!senhaRecente(c)) return resposta(403, { erro: 'Confirme sua senha de novo para executar (vale por 5 minutos).' });
    // aprovado → executando numa operação só: se outro clique chegou antes, este não roda.
    const { data: linhas, error: erroTrava } = await db.from('fila_validacao')
      .update({ status: 'executando', iniciado_em: new Date().toISOString(), executado_por: quem.user.id, erro: null })
      .eq('id', corpo.id).eq('status', 'aprovado').select('*');
    if (erroTrava) return resposta(500, { erro: 'Não consegui travar o lote para execução.' });
    if (!linhas || !linhas.length) return resposta(409, { erro: 'Este lote não está aprovado (ou já está executando).' });
    linha = linhas[0];
  }

  const clientes = criarClientes({ geminiKey, openaiKey });
  const hoje = new Date().toISOString().slice(0, 10);
  const trabalho = (async () => {
    try {
      const fim = await processarLote(linha, {
        clientes, modelos: modelos(), hoje, limiteMs: LIMITE_MS,
        salvar: async (resultado: unknown) => { await db.from('fila_validacao').update({ resultado }).eq('id', linha.id); },
      });
      await db.from('fila_validacao').update({
        status: fim.status,
        resultado: fim.resultado,
        erro: fim.erro,
        custo_real_usd: fim.resultado.custo_real_usd,
        concluido_em: fim.status === 'concluido' ? new Date().toISOString() : null,
      }).eq('id', linha.id);
    } catch (e) {
      // Falha inesperada: volta para 'aprovado' (dá para tentar de novo, com nova confirmação de senha).
      await db.from('fila_validacao').update({ status: 'aprovado', erro: `Falha inesperada: ${String((e as Error)?.message || e).slice(0, 300)}` }).eq('id', linha.id);
    }
  })();
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(trabalho);
  else await trabalho;

  return resposta(202, { ok: true, mensagem: 'Mergulho Triplo em andamento. A lista se atualiza sozinha quando terminar.' });
});

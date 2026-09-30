/*
 * ia.mjs — chamadas às APIs do Gemini e da OpenAI, sem biblioteca externa (fetch do Node 18+).
 * Conta tokens de cada chamada para a estimativa de custo do relatório.
 */
import { API, chave, PRECOS, PRECO_BUSCA_POR_MIL } from './config.mjs';

/* ---------- Uso e custo ---------- */
const uso = {}; // { modelo: { entrada, saida, chamadas, buscas } }

function somar(modelo, entrada = 0, saida = 0, buscas = 0) {
  const u = (uso[modelo] ||= { entrada: 0, saida: 0, chamadas: 0, buscas: 0 });
  u.entrada += entrada; u.saida += saida; u.chamadas += 1; u.buscas += buscas;
}

/** Linhas do relatório de custo, com total estimado (só dos modelos com preço cadastrado). */
export function resumoDeCusto() {
  let total = 0;
  const linhas = Object.entries(uso).map(([modelo, u]) => {
    const preco = PRECOS[modelo];
    const custo = preco ? (u.entrada * preco[0] + u.saida * preco[1]) / 1e6 : null;
    if (custo !== null) total += custo;
    return `  ${modelo}: ${u.chamadas} chamada(s), ${u.entrada} tokens de entrada, ${u.saida} de saída` +
      (u.buscas ? `, ${u.buscas} com busca do Google` : '') +
      (custo !== null ? ` ≈ US$ ${custo.toFixed(4)}` : ' (sem preço cadastrado em scripts/lib/config.mjs)');
  });
  const buscas = Object.values(uso).reduce((n, u) => n + u.buscas, 0);
  if (buscas) linhas.push(`  Busca do Google: ${buscas} pedido(s) — grátis até 5.000/mês, depois ≈ US$ ${(buscas * PRECO_BUSCA_POR_MIL / 1000).toFixed(2)}`);
  return { linhas, total };
}

/* ---------- HTTP com novas tentativas ---------- */
export class ErroAPI extends Error {}

async function chamar(url, opcoes, rotulo) {
  const esperas = [2000, 6000, 15000];
  for (let tentativa = 0; ; tentativa++) {
    let resp;
    try {
      resp = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(180_000) });
    } catch (e) {
      if (tentativa < esperas.length) { await dormir(esperas[tentativa]); continue; }
      throw new ErroAPI(`${rotulo}: sem resposta (${e.name === 'TimeoutError' ? 'tempo esgotado' : e.message})`);
    }
    if (resp.ok) return resp.json();
    const corpo = await resp.text().catch(() => '');
    // 429 (limite) e 5xx (instabilidade) valem nova tentativa; o resto é erro de verdade.
    if ((resp.status === 429 || resp.status >= 500) && tentativa < esperas.length) { await dormir(esperas[tentativa]); continue; }
    throw new ErroAPI(`${rotulo}: HTTP ${resp.status} — ${resumirErro(corpo)}`);
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function resumirErro(corpo) {
  try {
    const j = JSON.parse(corpo);
    return (j.error && (j.error.message || j.error.status)) || corpo.slice(0, 300);
  } catch (e) {
    return corpo.slice(0, 300);
  }
}

function exigirChave(nome) {
  const v = chave(nome);
  if (!v) throw new ErroAPI(`${nome} não configurada. Copie .env.example para .env e preencha (veja docs/MOTOR_DIVER.md).`);
  return v;
}

/* ---------- Gemini (camada de fato, com busca do Google) ---------- */
export async function gemini(modelo, texto, { busca = true } = {}) {
  const corpo = { contents: [{ role: 'user', parts: [{ text: texto }] }] };
  if (busca) corpo.tools = [{ google_search: {} }];
  const j = await chamar(`${API.gemini}/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': exigirChave('GEMINI_API_KEY') },
    body: JSON.stringify(corpo),
  }, `Gemini (${modelo})`);
  const cand = (j.candidates || [])[0];
  const resposta = ((cand && cand.content && cand.content.parts) || []).map((p) => p.text || '').join('').trim();
  const meta = (cand && cand.groundingMetadata) || null;
  const fontes = meta && meta.groundingChunks ? meta.groundingChunks.map((c) => c.web && c.web.uri).filter(Boolean) : [];
  const u = j.usageMetadata || {};
  somar(modelo, u.promptTokenCount || 0, (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0),
    meta && meta.webSearchQueries && meta.webSearchQueries.length ? 1 : 0);
  if (!resposta) throw new ErroAPI(`Gemini (${modelo}): resposta vazia${cand && cand.finishReason ? ` (${cand.finishReason})` : ''}`);
  return { resposta, fontes };
}

/* ---------- OpenAI (camada de lógica) ---------- */
export async function openai(modelo, texto) {
  // Chat Completions sem temperatura nem campos de raciocínio: funciona com os modelos mini e completos.
  const j = await chamar(`${API.openai}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${exigirChave('OPENAI_API_KEY')}` },
    body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content: texto }] }),
  }, `OpenAI (${modelo})`);
  const resposta = ((j.choices || [])[0]?.message?.content || '').trim();
  const u = j.usage || {};
  somar(modelo, u.prompt_tokens || 0, u.completion_tokens || 0);
  if (!resposta) throw new ErroAPI(`OpenAI (${modelo}): resposta vazia`);
  return { resposta };
}

/** Vetores de significado (embeddings) da OpenAI, em lotes. */
export async function embeddings(modelo, textos) {
  const vetores = [];
  for (let i = 0; i < textos.length; i += 100) {
    const lote = textos.slice(i, i + 100);
    const j = await chamar(`${API.openai}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${exigirChave('OPENAI_API_KEY')}` },
      body: JSON.stringify({ model: modelo, input: lote }),
    }, `Embeddings (${modelo})`);
    somar(modelo, (j.usage && j.usage.prompt_tokens) || 0, 0);
    const ordenados = [...(j.data || [])].sort((a, b) => a.index - b.index);
    if (ordenados.length !== lote.length) throw new ErroAPI(`Embeddings (${modelo}): esperava ${lote.length} vetores, veio ${ordenados.length}`);
    ordenados.forEach((d) => vetores.push(d.embedding));
  }
  return vetores;
}

/* ---------- Conferir se os modelos existem na conta ---------- */
export async function listarModelosGemini() {
  const nomes = [];
  let pagina = '';
  do {
    const j = await chamar(`${API.gemini}/models?pageSize=1000${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ''}`, {
      headers: { 'x-goog-api-key': exigirChave('GEMINI_API_KEY') },
    }, 'Gemini (lista de modelos)');
    (j.models || []).forEach((m) => nomes.push(String(m.name || '').replace(/^models\//, '')));
    pagina = j.nextPageToken || '';
  } while (pagina);
  return nomes;
}

export async function listarModelosOpenAI() {
  const j = await chamar(`${API.openai}/models`, {
    headers: { Authorization: `Bearer ${exigirChave('OPENAI_API_KEY')}` },
  }, 'OpenAI (lista de modelos)');
  return (j.data || []).map((m) => m.id);
}

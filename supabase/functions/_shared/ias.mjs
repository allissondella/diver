/*
 * ias.mjs — chamadas ao Gemini (com busca do Google) e à OpenAI, só com fetch.
 * As chaves chegam como PARÂMETRO (a Edge Function as lê de Deno.env.get no servidor).
 * Nenhuma mensagem de erro inclui a chave: ela só viaja no cabeçalho da requisição.
 * Conta os tokens de cada chamada (uso) para o custo real do relatório.
 */
export class ErroIA extends Error {}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function resumirErro(corpo) {
  try {
    const j = JSON.parse(corpo);
    return String((j.error && (j.error.message || j.error.status)) || corpo).slice(0, 300);
  } catch (e) {
    return String(corpo).slice(0, 300);
  }
}

export function criarClientes({ geminiKey, openaiKey, geminiBase = 'https://generativelanguage.googleapis.com/v1beta', openaiBase = 'https://api.openai.com/v1', timeoutMs = 90_000 }) {
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

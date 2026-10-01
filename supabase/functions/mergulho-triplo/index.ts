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
 *      então dois cliques não geram duas execuções pagas.
 *
 * Chaves: GEMINI_API_KEY e OPENAI_API_KEY vêm SÓ de Deno.env.get (Secrets das Edge Functions,
 * cadastrados pelo admin no painel do Supabase). Nunca de tabela, arquivo ou resposta; o valor
 * nunca aparece em log nem em mensagem de erro. A ação "status" diz apenas se cada chave EXISTE.
 *
 * Pedidos (POST, JSON):
 *   { "acao": "status" }                → { chaves: { gemini: bool, openai: bool }, modelos }   (sem custo)
 *   { "acao": "executar", "id": uuid }  → 202 e o trabalho segue em segundo plano (custo real)
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { criarClientes } from '../_shared/ias.mjs';
import { processarLote } from '../_shared/processar-lote.mjs';
import { MODELOS_PADRAO } from '../_shared/mergulho-nucleo.mjs';

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
  if (!senhaRecente(c)) return resposta(403, { erro: 'Confirme sua senha de novo para executar (vale por 5 minutos).' });
  if (!corpo.id || !UUID.test(corpo.id)) return resposta(400, { erro: 'Lote inválido.' });

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!geminiKey || !openaiKey) {
    return resposta(500, { erro: `Falta cadastrar nos Secrets das Edge Functions: ${[!geminiKey && 'GEMINI_API_KEY', !openaiKey && 'OPENAI_API_KEY'].filter(Boolean).join(' e ')}.` });
  }

  // aprovado → executando numa operação só: se outro clique chegou antes, este não roda.
  const { data: linhas, error: erroTrava } = await db.from('fila_validacao')
    .update({ status: 'executando', iniciado_em: new Date().toISOString(), executado_por: quem.user.id, erro: null })
    .eq('id', corpo.id).eq('status', 'aprovado').select('*');
  if (erroTrava) return resposta(500, { erro: 'Não consegui travar o lote para execução.' });
  if (!linhas || !linhas.length) return resposta(409, { erro: 'Este lote não está aprovado (ou já está executando).' });
  const linha = linhas[0];

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

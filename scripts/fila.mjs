#!/usr/bin/env node
/*
 * fila.mjs — ponte entre o repositório e a Fila de Validação do Mergulho Triplo (Supabase).
 * NÃO chama IA nenhuma e NÃO lê chave de IA: quem valida é a Edge Function "mergulho-triplo",
 * e só depois que o admin aprova o lote na tela "Fila de Validação" digitando a senha.
 *
 * Comandos:
 *   simular <trilha.json> --materia M [--fase F] [--ids a,b]   custo estimado e prompts (sem internet)
 *   enviar  <trilha.json> --materia M [--fase F] [--ids a,b]   cria lote(s) 'pendente' na fila (máx. 20 questões cada)
 *           acrescente --variantes para mandar o bloco "variantes" da trilha em vez das questões
 *           (variante de questão origem "enem" é recusada aqui, no banco e na Edge Function)
 *   listar                                                      últimos lotes da fila
 *   baixar  <id-do-lote> [--arquivo <trilha.json>]              aplica o resultado na trilha e no data/acervo/<materia>.json
 *   aplicar <resultado.json> [--arquivo <trilha.json>]          o mesmo, a partir do arquivo do botão "Baixar resultado"
 *                                                               da tela (sem internet e sem login)
 *
 * Opções comuns: --ambiente testes|producao (padrão: testes)  --refazer (envia até as já aprovadas)
 * Login: e-mail e senha de ADMIN digitados aqui no terminal (a senha não aparece e nunca é guardada).
 * Por isso rode você mesmo no terminal: o script se recusa a ler a senha de um arquivo ou de outro programa.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import readline from 'node:readline';
import { RAIZ, ambienteSupabase } from './lib/config.mjs';
import { slugMateria, lerAcervo, gravarAcervo, gravarJSON, guardarNoAcervo, caminhoAcervo } from './lib/acervo.mjs';
import { atualizarCatalogo } from './gerar-catalogo.mjs';
import { assinatura, promptFato, promptLogica, montarLotes as montarLotesDaTrilha } from '../supabase/functions/_shared/mergulho-nucleo.mjs';

function argumentos(argv) {
  const a = { comando: argv[0], alvo: null, materia: null, fase: null, ids: null, ambiente: 'testes', arquivo: null, refazer: false, variantes: false };
  for (let i = 1; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--materia') a.materia = argv[++i];
    else if (x === '--fase') a.fase = argv[++i];
    else if (x === '--ids') a.ids = new Set(String(argv[++i]).split(',').map((s) => s.trim()).filter(Boolean));
    else if (x === '--ambiente') a.ambiente = argv[++i];
    else if (x === '--arquivo') a.arquivo = argv[++i];
    else if (x === '--refazer') a.refazer = true;
    else if (x === '--variantes') a.variantes = true;
    else if (x.startsWith('--')) throw new Error(`opção desconhecida: ${x}`);
    else a.alvo = x;
  }
  return a;
}

/* ---------- Terminal ---------- */
function perguntar(texto, { oculto = false } = {}) {
  if (!process.stdin.isTTY) throw new Error('rode este comando você mesmo, num terminal: o login é digitado aqui e nunca passado por arquivo ou por outro programa.');
  return new Promise((ok) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) rl._writeToOutput = (s) => { if (s.includes(texto)) process.stdout.write(texto); };
    rl.question(texto, (r) => { rl.close(); if (oculto) process.stdout.write('\n'); ok(r); });
  });
}

/* ---------- Supabase (REST com o login do admin; RLS: só admin lê e cria na fila) ---------- */
async function entrar(amb) {
  console.log(`Ambiente: ${amb.nome} (${amb.supabaseUrl})`);
  const email = (process.env.DIVER_ADMIN_EMAIL || await perguntar('E-mail de admin: ')).trim().toLowerCase();
  const senha = await perguntar('Senha (não aparece): ', { oculto: true });
  const resp = await fetch(`${amb.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: amb.supabaseChave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }),
  });
  const j = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(/invalid login/i.test(j.error_description || j.msg || '') ? 'e-mail ou senha incorretos' : `login recusado (HTTP ${resp.status})`);
  return j.access_token;
}

async function rest(amb, token, metodo, caminho, corpo, prefer) {
  const resp = await fetch(`${amb.supabaseUrl}/rest/v1/${caminho}`, {
    method: metodo,
    headers: { apikey: amb.supabaseChave, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resp.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!resp.ok) {
    const msg = (dados && (dados.message || dados.hint)) || `HTTP ${resp.status}`;
    throw new Error(/row-level security|permission denied/i.test(msg) ? 'só uma conta de ADMIN pode usar a fila (o banco recusou).' : msg);
  }
  return dados;
}

/* ---------- Montar lotes a partir da trilha ---------- */
async function montarLotes(args) {
  if (!args.alvo) throw new Error('informe o arquivo da trilha (ex.: data/trilhas/enem-vestibular.json)');
  if (!args.materia) throw new Error('informe --materia (ex.: --materia matematica)');
  const arquivo = resolve(args.alvo);
  if (!existsSync(arquivo)) throw new Error(`arquivo não encontrado: ${args.alvo}`);
  const trilha = JSON.parse(readFileSync(arquivo, 'utf8'));
  const { lotes, puladas } = await montarLotesDaTrilha(trilha, {
    materia: args.materia, arquivo: relative(RAIZ, arquivo), fase: args.fase, ids: args.ids, variantes: args.variantes, refazer: args.refazer,
  });
  return { lotes, puladas, trilha };
}

function resumoDosLotes({ lotes, puladas }) {
  const total = lotes.reduce((s, l) => s + l.custo_estimado_usd, 0);
  lotes.forEach((l, i) => console.log(`  Lote ${i + 1}: ${l.quantidade_questoes} ${l.conteudo_pendente.tipo === 'variantes' ? 'variante(s)' : 'questão(ões)'} · custo estimado US$ ${l.custo_estimado_usd.toFixed(4)}`));
  if (puladas.length) console.log(`  Puladas (${puladas.length}): ${puladas.join(', ')}`);
  console.log(`  Total estimado: US$ ${total.toFixed(4)} (teto: preços de docs/ASSINATURA_E_VALIDACAO.md, seção 3, com 30% de folga para o desempate)`);
}

/* ---------- Comandos ---------- */
async function simular(args) {
  const r = await montarLotes(args);
  console.log(`SIMULAÇÃO — nada é enviado. Matéria "${slugMateria(args.materia)}", acervo ${relative(RAIZ, caminhoAcervo(args.materia))}.`);
  resumoDosLotes(r);
  const q = r.lotes[0] && r.lotes[0].conteudo_pendente.questoes[0];
  if (q) {
    console.log(`\n── Exemplo: camada 1 (fato, Gemini com busca), questão ${q.id} ──\n${promptFato(q)}`);
    console.log(`\n── Exemplo: camada 2 (lógica, OpenAI; sem o gabarito), questão ${q.id} ──\n${promptLogica(q)}`);
  }
}

async function enviar(args) {
  const r = await montarLotes(args);
  if (!r.lotes.length) { console.log('Nada a enviar.'); resumoDosLotes(r); return; }
  console.log(`Vou criar ${r.lotes.length} lote(s) PENDENTE(S) na fila. Nada roda até você aprovar na tela "Fila de Validação" com a senha.`);
  resumoDosLotes(r);
  const amb = ambienteSupabase(args.ambiente);
  const token = await entrar(amb);
  const criados = await rest(amb, token, 'POST', 'fila_validacao?select=id,status,quantidade_questoes,custo_estimado_usd', r.lotes, 'return=representation');
  console.log('\nNa fila:');
  const unidade = args.variantes ? 'variante(s)' : 'questão(ões)';
  criados.forEach((c) => console.log(`  ${c.id} · ${c.status} · ${c.quantidade_questoes} ${unidade} · US$ ${Number(c.custo_estimado_usd).toFixed(4)}`));
  console.log('\nPróximo passo: Admin → Fila de Validação → Aprovar (pede sua senha).');
}

async function listar(args) {
  const amb = ambienteSupabase(args.ambiente);
  const token = await entrar(amb);
  const linhas = await rest(amb, token, 'GET', 'fila_validacao?select=id,status,trilha_id,materia,quantidade_questoes,custo_estimado_usd,custo_real_usd,criado_em,erro&order=criado_em.desc&limit=30');
  if (!linhas.length) return console.log('Fila vazia.');
  linhas.forEach((l) => console.log(`${l.id} · ${l.status.padEnd(10)} · ${l.trilha_id}/${l.materia} · ${l.quantidade_questoes} q · estimado US$ ${Number(l.custo_estimado_usd).toFixed(4)}${l.custo_real_usd !== null ? ` · real US$ ${Number(l.custo_real_usd).toFixed(4)}` : ''}${l.erro ? ` · ${l.erro}` : ''}`));
}

async function baixar(args) {
  if (!args.alvo) throw new Error('informe o id do lote (veja com: node scripts/fila.mjs listar)');
  const amb = ambienteSupabase(args.ambiente);
  const token = await entrar(amb);
  const [lote] = await rest(amb, token, 'GET', `fila_validacao?id=eq.${encodeURIComponent(args.alvo)}&select=*`);
  if (!lote) throw new Error('lote não encontrado');
  await aplicarLote(lote, args);
}

/** Sem internet e sem login: aplica o arquivo do botão "Baixar resultado" (Admin → Fila de Validação). */
async function aplicar(args) {
  if (!args.alvo) throw new Error('informe o arquivo baixado (ex.: mergulho-triplo-matematica-1a2b3c4d.json)');
  const dados = JSON.parse(readFileSync(resolve(args.alvo), 'utf8'));
  if (!dados || !dados.id || !dados.resultado || !dados.materia) throw new Error('este arquivo não parece um resultado da Fila de Validação (faltam id, materia ou resultado)');
  await aplicarLote(dados, args);
}

async function aplicarLote(lote, args) {
  if (!lote.resultado) throw new Error(`o lote ainda não tem resultado (status: ${lote.status})`);
  if (lote.status !== 'concluido') console.log(`Atenção: lote "${lote.status}" (${lote.erro || 'parcial'}). Aplico só o que já foi validado.`);

  const caminho = resolve(RAIZ, args.arquivo || (lote.conteudo_pendente && lote.conteudo_pendente.arquivo) || lote.resultado.arquivo || '');
  if (!existsSync(caminho)) throw new Error(`trilha não encontrada: ${caminho} (use --arquivo)`);
  const trilha = JSON.parse(readFileSync(caminho, 'utf8'));
  const acervo = lerAcervo(lote.materia);
  const aprovadas = new Map((lote.resultado.aprovadas || []).map((i) => [i.id, i]));
  const rel = { aplicadas: 0, acervo: 0, revisar: [], mudaram: [] };

  for (const [id, x] of Object.entries(lote.resultado.por_questao || {})) {
    if (!x.validacao) continue;
    const lista = (trilha.questoes || []).some((y) => y.id === id) ? trilha.questoes : trilha.variantes || [];
    const q = lista.find((y) => y.id === id);
    if (!q) continue;
    // A questão mudou depois do envio? Então a validação é de outro texto: não aplica.
    if (await assinatura(q) !== x.validacao.assinatura) { rel.mudaram.push(id); continue; }
    q.validacao = x.validacao;
    rel.aplicadas++;
    if (x.aprovada) {
      delete q.revisar_humano;
      if (aprovadas.has(id)) { guardarNoAcervo(acervo, aprovadas.get(id)); rel.acervo++; }
    } else if (x.revisar_humano) {
      q.revisar_humano = true;
      lista.splice(lista.indexOf(q), 1); // questão ou variante: sai até a revisão manual
      (trilha.emRevisao ||= []).push({ ...q, motivo_revisao: x.motivo });
      rel.revisar.push(`${id}: ${x.motivo}`);
    }
  }
  gravarJSON(caminho, trilha);
  if (rel.acervo) gravarAcervo(lote.materia, acervo);
  if (atualizarCatalogo(resolve(RAIZ, 'data', 'trilhas'))) console.log('Catálogo dos cursos atualizado (data/trilhas/catalogo.json).');

  const r = lote.resultado.relatorio || {};
  console.log(`\n══════ Mergulho Triplo — lote ${lote.id} ══════`);
  console.log(`Aprovadas de primeira: ${(r.primeira || []).length} · corrigidas e revalidadas: ${(r.corrigidas || []).length}`);
  console.log(`Escalonadas (modelo robusto): ${(r.escaladas || []).map((e) => `${e.id} (${e.camadas.join('+')} → ${e.resultado})`).join(', ') || 'nenhuma'}`);
  (r.reprovadas || []).forEach((x) => console.log(`Reprovada: ${x.id} — ${x.orientacao}. ${x.motivo || ''}`));
  console.log(`revisar_humano (saíram da trilha para "emRevisao"): ${rel.revisar.length ? '\n  ' + rel.revisar.join('\n  ') : 'nenhuma'}`);
  if (rel.mudaram.length) console.log(`Não aplicadas (a questão mudou depois do envio; envie de novo): ${rel.mudaram.join(', ')}`);
  console.log(`\nAplicadas na trilha: ${rel.aplicadas} → ${relative(RAIZ, caminho)}`);
  console.log(`Novas/atualizadas no acervo: ${rel.acervo} → ${relative(RAIZ, caminhoAcervo(lote.materia))}`);
  const real = lote.custo_real_usd ?? lote.resultado.custo_real_usd;
  console.log(`${lote.custo_estimado_usd !== undefined ? `Custo estimado US$ ${Number(lote.custo_estimado_usd).toFixed(4)} · ` : ''}real US$ ${Number(real || 0).toFixed(4)}`);
  console.log('Revise com "git diff" e faça o commit.');
}

const COMANDOS = { simular, enviar, listar, baixar, aplicar };
const args = argumentos(process.argv.slice(2));
if (!COMANDOS[args.comando]) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\n?/, '').replace(/^ \* ?/gm, ''));
  process.exitCode = args.comando ? 1 : 0;
} else {
  COMANDOS[args.comando](args).catch((e) => {
    console.error(`\nErro: ${e.message}`);
    process.exitCode = 1;
  });
}

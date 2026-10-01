/*
 * config.mjs — onde fica o projeto e como falar com o Supabase a partir do computador.
 *
 * Os scripts locais NÃO chamam IA nenhuma e NÃO leem chave de IA (kit v4, docs/MOTOR_DIVER.md seção 5):
 * as chaves GEMINI_API_KEY e OPENAI_API_KEY moram só nos Secrets das Edge Functions do Supabase.
 * Aqui só vão a URL do projeto e a chave PÚBLICA (publishable), lidas do próprio js/config.js,
 * e o login do admin é digitado no terminal a cada uso (nunca é guardado).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** { supabaseUrl, supabaseChave } do bloco 'testes' ou 'producao' do js/config.js. */
export function ambienteSupabase(nome = 'testes') {
  if (!['testes', 'producao'].includes(nome)) throw new Error(`ambiente desconhecido: ${nome} (use testes ou producao)`);
  // Só para testes automatizados (servidor falso local): troca o endereço sem mexer no js/config.js.
  if (process.env.DIVER_SUPABASE_URL) return { nome: `${nome} (endereço de teste)`, supabaseUrl: process.env.DIVER_SUPABASE_URL.replace(/\/+$/, ''), supabaseChave: process.env.DIVER_SUPABASE_CHAVE || 'chave-anon-de-teste' };
  const texto = readFileSync(join(RAIZ, 'js', 'config.js'), 'utf8');
  const bloco = texto.match(new RegExp(`${nome}\\s*:\\s*\\{([\\s\\S]*?)\\}`));
  const campo = (c) => bloco && (bloco[1].match(new RegExp(`${c}\\s*:\\s*'([^']*)'`)) || [])[1];
  const supabaseUrl = campo('supabaseUrl');
  const supabaseChave = campo('supabaseChave');
  if (!supabaseUrl || !supabaseChave) throw new Error(`js/config.js sem URL/chave do ambiente "${nome}"`);
  if (/^sb_secret_/.test(supabaseChave)) throw new Error('a chave em js/config.js é SECRETA: troque pela publishable');
  return { nome, supabaseUrl: supabaseUrl.replace(/\/+$/, ''), supabaseChave };
}

/*
 * config.mjs — chaves, modelos e preços do Motor Diver / Mergulho Triplo.
 *
 * Chaves: lidas SÓ de variáveis de ambiente (GEMINI_API_KEY, OPENAI_API_KEY).
 * Para não precisar exportar na mão, o script lê um arquivo ".env" na raiz do projeto
 * (está no .gitignore) ou, se não existir, "~/.diver-chaves.env" (fora do repositório).
 * Variáveis já definidas no terminal têm prioridade sobre os arquivos.
 * Nunca imprima o valor de uma chave (nem em mensagem de erro).
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Lê "NOME=valor" (uma por linha; # comenta; aspas opcionais). Não sobrescreve o que já existe. */
function carregarArquivoEnv(caminho) {
  if (!existsSync(caminho)) return false;
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let valor = m[2];
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    if (valor && process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
  return true;
}

export const ARQUIVO_ENV = [join(RAIZ, '.env'), join(homedir(), '.diver-chaves.env')].find(carregarArquivoEnv) || null;

export function chave(nome) {
  const v = process.env[nome];
  return v && v.trim() ? v.trim() : null;
}

/*
 * Modelos padrão (troque pelo .env sem mexer no código).
 * Conferidos em 2026-09-30 pelos trechos das páginas oficiais devolvidos pela busca
 * (ai.google.dev e developers.openai.com estavam bloqueados para leitura direta nesta sessão).
 * Por isso o script CONFERE na sua conta, antes da primeira chamada, se cada modelo existe
 * (lista de modelos da própria API) e para com uma mensagem clara se algum não existir.
 *
 * - Fato, barato:   gemini-3.8-flash       → Flash mais novo, GA (Google, set/2026); US$ 0,75 / 3,75 por 1M até 31/12/2026.
 * - Fato, robusto:  gemini-3.1-pro-preview → Pro mais novo listado na documentação do Gemini.
 * - Lógica, barato: gpt-5-mini             → o "mini" mais barato da OpenAI: US$ 0,25 / 2,00 por 1M (o gpt-5.4-mini custa 0,75 / 4,50).
 * - Lógica, robusto: gpt-5.5               → modelo completo usado só no desempate.
 * - Embeddings:     text-embedding-3-small → OpenAI, US$ 0,02 por 1M (escolha documentada em docs/MOTOR_DIVER.md).
 */
export const MODELOS = {
  fato: process.env.DIVER_MODELO_FATO || 'gemini-3.8-flash',
  fatoForte: process.env.DIVER_MODELO_FATO_FORTE || 'gemini-3.1-pro-preview',
  logica: process.env.DIVER_MODELO_LOGICA || 'gpt-5-mini',
  logicaForte: process.env.DIVER_MODELO_LOGICA_FORTE || 'gpt-5.5',
  embedding: process.env.DIVER_MODELO_EMBEDDING || 'text-embedding-3-small',
};

/**
 * Preço em US$ por 1 milhão de tokens [entrada, saída], só para a estimativa do relatório.
 * Modelos sem preço aqui aparecem como "sem preço cadastrado" (os tokens são contados mesmo assim).
 */
export const PRECOS = {
  'gemini-3.8-flash': [0.75, 3.75],
  'gpt-5-mini': [0.25, 2.0],
  'text-embedding-3-small': [0.02, 0],
};
/** Busca do Google no Gemini: 5.000 grátis/mês (somando os modelos 3.x), depois US$ 14 por 1.000. */
export const PRECO_BUSCA_POR_MIL = 14;

/** Endereços das APIs (sobrescrevíveis só para testes com um servidor falso). */
export const API = {
  gemini: process.env.DIVER_GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta',
  openai: process.env.DIVER_OPENAI_API_BASE || 'https://api.openai.com/v1',
};

#!/usr/bin/env node
/*
 * validar-no-gemini.mjs — passa os lotes do pacote de validação externa (validacao-externa.mjs exportar)
 * pelo Gemini da assinatura Google AI Pro do usuário, sozinho, sem copia e cola (pedido do usuário, 2026-10-19).
 * Usa o Antigravity CLI (`agy`, o programa de terminal do Google que entra com a conta da assinatura) no modo
 * headless. Nenhuma chave de API: a cota é a da assinatura. Roda no computador do usuário, nunca aqui.
 *
 *   node scripts/validar-no-gemini.mjs <pasta-do-pacote> [--resultados <pasta>] [--modelo <slug>]
 *        [--lotes K0001,Q0001] [--tipos K,P,Q] [--limite N] [--agy <caminho>]
 *
 * Para cada lote, na ordem do 02-INDICE.md:
 *   - monta uma pasta de trabalho só com as regras (01-PROMPT-DO-GEM.txt) e o arquivo daquele lote: o Gemini
 *     não enxerga os outros lotes nem, no passo 1, o gabarito (a Parte B só entra na pasta depois);
 *   - questões: passo 1 (Parte A, sem gabarito) e, na mesma conversa (--conversation), passo 2 (Parte B);
 *   - conteúdo: uma mensagem só;
 *   - responde "continue" quando ele parar em CONTINUA e pede de novo uma vez se o JSON não vier;
 *   - grava a resposta em <resultados>/<lote>.txt (o `aplicar` lê essa pasta direto).
 * Lote com resultado gravado é pulado: dá para parar (Ctrl+C) e rodar de novo depois.
 * Acabou a cota da assinatura (ela volta a cada 5 horas)? O script para e diz para rodar de novo mais tarde.
 *
 * Segurança: o `agy` só pode ler páginas da web (permissão read_url, ver docs/VALIDACAO_EXTERNA.md).
 * Comando de terminal fica no padrão "perguntar", que no modo headless vira "negado". Nunca use
 * --dangerously-skip-permissions.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, rmSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

const MODELO_PADRAO = 'gemini-4-argon-high';
const TEMPO_LIMITE = '30m';
const COTA = /quota|cota|rate.?limit|limit (reached|exceeded)|resource.?exhausted|429|too many requests|weekly limit|five.?hour/i;

function lerArgs(argv) {
  const a = { pasta: null, resultados: null, modelo: MODELO_PADRAO, lotes: null, tipos: null, limite: Infinity, agy: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--resultados') a.resultados = argv[++i];
    else if (x === '--modelo') a.modelo = argv[++i];
    else if (x === '--lotes') a.lotes = new Set(argv[++i].split(',').map((s) => s.trim().toUpperCase()));
    else if (x === '--tipos') a.tipos = new Set(argv[++i].split(',').map((s) => s.trim().toUpperCase()));
    else if (x === '--limite') a.limite = Number(argv[++i]) || Infinity;
    else if (x === '--agy') a.agy = argv[++i];
    else if (!x.startsWith('--')) a.pasta = x;
    else throw new Error(`opção desconhecida: ${x}`);
  }
  return a;
}

/** O pacote pode vir com uma pasta a mais por dentro (zip extraído "dentro de si mesmo"): acha a que tem o índice. */
function acharRaiz(pasta) {
  const fila = [resolve(pasta)];
  while (fila.length) {
    const p = fila.shift();
    if (existsSync(join(p, '02-INDICE.md')) && existsSync(join(p, '01-PROMPT-DO-GEM.txt'))) return p;
    for (const x of readdirSync(p)) if (statSync(join(p, x)).isDirectory()) fila.push(join(p, x));
  }
  throw new Error(`não achei o 02-INDICE.md e o 01-PROMPT-DO-GEM.txt dentro de ${pasta}. Extraia o zip do pacote e aponte para a pasta extraída.`);
}

function mapearArquivos(raiz) {
  const mapa = new Map();
  const visitar = (p) => {
    for (const x of readdirSync(p)) {
      const c = join(p, x);
      if (statSync(c).isDirectory()) visitar(c);
      else if (/^[QAFCLPK]\d{4}(-[AB])?\.txt$/.test(x)) mapa.set(x.replace(/\.txt$/, ''), c);
    }
  };
  visitar(raiz);
  return mapa;
}

function ordemDosLotes(raiz, arquivos) {
  const vistos = new Set();
  const ordem = [];
  for (const m of readFileSync(join(raiz, '02-INDICE.md'), 'utf8').matchAll(/\b([QAFCLPK]\d{4})\b/g)) {
    if (!vistos.has(m[1])) { vistos.add(m[1]); ordem.push(m[1]); }
  }
  for (const k of arquivos.keys()) { const c = k.slice(0, 5); if (!vistos.has(c)) { vistos.add(c); ordem.push(c); } }
  return ordem;
}

function acharAgy(pedido) {
  if (pedido) return pedido;
  if (process.platform === 'win32') {
    const local = join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'agy', 'bin', 'agy.exe');
    if (existsSync(local)) return local;
    return 'agy.exe';
  }
  return 'agy';
}

/** Uma chamada ao agy no modo headless. Devolve { ok, resposta, conversa, erro, cota }. */
function chamar(agy, pasta, prompt, opcoes) {
  const args = ['-p', prompt, '--output-format', 'json', '--model', opcoes.modelo, '--print-timeout', TEMPO_LIMITE];
  if (opcoes.conversa) args.push('--conversation', opcoes.conversa);
  const r = spawnSync(agy, args, { cwd: pasta, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.error) return { ok: false, erro: r.error.code === 'ENOENT' ? `não achei o programa "${agy}". Instale o Antigravity CLI (passo 1 do guia) ou passe --agy <caminho>.` : r.error.message, fatal: true };
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { /* resposta fora do JSON: trata abaixo */ }
  const erro = [env && env.error && (env.error.message || JSON.stringify(env.error)), r.stderr].filter(Boolean).join(' ').trim();
  if (r.status !== 0 || !env || env.status !== 'SUCCESS' || !env.response) {
    return { ok: false, erro: erro || `o agy terminou com código ${r.status} sem resposta`, cota: COTA.test(erro), conversa: env && env.conversation_id };
  }
  return { ok: true, resposta: String(env.response), conversa: env.conversation_id };
}

/** Manda a mensagem e segue com "continue" enquanto ele parar em CONTINUA. */
function conversar(agy, pasta, prompt, opcoes) {
  let r = chamar(agy, pasta, prompt, opcoes);
  if (!r.ok) return r;
  const partes = [r.resposta];
  let conversa = r.conversa;
  for (let i = 0; i < 6 && /^\s*CONTINUA\s*$/m.test(partes[partes.length - 1]); i++) {
    r = chamar(agy, pasta, 'continue', { ...opcoes, conversa });
    if (!r.ok) return r;
    partes.push(r.resposta);
  }
  return { ok: true, resposta: partes.join('\n\n'), conversa };
}

const temJSON = (texto, codigo) => new RegExp(`"lote"\\s*:\\s*"${codigo}"`).test(texto);

const REGRAS = 'Você é o VALIDADOR DIVER. As suas regras estão no arquivo REGRAS.txt desta pasta: leia o arquivo inteiro antes de tudo e siga à risca.';
const WEB = 'Para conferir fatos, datas, leis e números, abra os sites oficiais com a ferramenta de ler páginas da web e cite o link completo (https://...). Não crie, não altere e não apague arquivos; não rode comandos.';

function prompts(codigo, tipo) {
  if (tipo === 'Q') {
    return {
      a: `${REGRAS} Depois leia o arquivo PARTE-A.txt: é a Parte A do lote ${codigo}. Faça o PASSO 1 da seção 4 (sem gabarito) para todos os itens e responda só com a tabela pedida e a linha final. ${WEB}`,
      b: `Agora leia o arquivo PARTE-B.txt: é a Parte B do mesmo lote ${codigo}. Faça o PASSO 2 da seção 4 para todos os itens e devolva o bloco json da seção 4 (com "lote":"${codigo}") e a linha de resumo. ${WEB}`,
    };
  }
  return { c: `${REGRAS} Depois leia o arquivo LOTE.txt: é o lote de conteúdo ${codigo}. Confira todos os itens como manda a seção 5 e devolva o bloco json da seção 5 (com "lote":"${codigo}") e a linha de resumo. ${WEB}` };
}

const REFAZER = (codigo, secao) => `A sua resposta não trouxe o bloco json do lote ${codigo}. Refaça no formato json da seção ${secao} das suas regras, num único bloco json, com todos os itens.`;

function main() {
  const args = lerArgs(process.argv.slice(2));
  if (!args.pasta) {
    console.log('Uso: node scripts/validar-no-gemini.mjs <pasta-do-pacote-extraído> [--lotes K0001] [--tipos K,P] [--limite 10] [--modelo <slug>]');
    process.exit(1);
  }
  const raiz = acharRaiz(args.pasta);
  const saida = resolve(args.resultados || join(raiz, '..', 'resultados-gemini'));
  // Rascunhos e log ficam FORA da pasta de resultados: a Parte B tem o esqueleto json e não pode ir para o `aplicar`.
  const trabalho = `${saida}-trabalho`;
  const log = join(trabalho, 'log.txt');
  mkdirSync(saida, { recursive: true });
  mkdirSync(trabalho, { recursive: true });
  const arquivos = mapearArquivos(raiz);
  const agy = acharAgy(args.agy);
  const regras = join(raiz, '01-PROMPT-DO-GEM.txt');
  const anotar = (linha) => { const l = `${new Date().toISOString()} ${linha}`; console.log(linha); try { appendFileSync(log, l + '\n'); } catch { /* sem log, segue */ } };

  let lotes = ordemDosLotes(raiz, arquivos).filter((c) => (!args.lotes || args.lotes.has(c)) && (!args.tipos || args.tipos.has(c[0])));
  const faltam = lotes.filter((c) => !existsSync(join(saida, `${c}.txt`)));
  console.log(`Pacote: ${raiz}\nResultados: ${saida}\nModelo: ${args.modelo}\nLotes: ${lotes.length} (${lotes.length - faltam.length} já feitos, ${faltam.length} por fazer)\n`);

  let feitos = 0, falhas = 0, seguidas = 0;
  for (const codigo of faltam) {
    if (feitos >= args.limite) break;
    const tipo = codigo[0];
    const pasta = join(trabalho, codigo);
    rmSync(pasta, { recursive: true, force: true });
    mkdirSync(pasta, { recursive: true });
    copyFileSync(regras, join(pasta, 'REGRAS.txt'));
    const p = prompts(codigo, tipo);
    const opcoes = { modelo: args.modelo };
    process.stdout.write(`${codigo}… `);
    let r;
    if (tipo === 'Q') {
      const a = arquivos.get(`${codigo}-A`), b = arquivos.get(`${codigo}-B`);
      if (!a || !b) { anotar(`${codigo}: faltam os arquivos -A/-B no pacote, pulei.`); continue; }
      copyFileSync(a, join(pasta, 'PARTE-A.txt'));
      const ra = conversar(agy, pasta, p.a, opcoes);
      if (ra.ok) {
        writeFileSync(join(pasta, 'resposta-parte-A.txt'), ra.resposta);
        copyFileSync(b, join(pasta, 'PARTE-B.txt'));   // o gabarito só entra agora
        r = conversar(agy, pasta, p.b, { ...opcoes, conversa: ra.conversa });
        if (r.ok && !temJSON(r.resposta, codigo)) r = conversar(agy, pasta, REFAZER(codigo, 4), { ...opcoes, conversa: r.conversa });
      } else r = ra;
    } else {
      const c = arquivos.get(codigo);
      if (!c) { anotar(`${codigo}: arquivo não encontrado no pacote, pulei.`); continue; }
      copyFileSync(c, join(pasta, 'LOTE.txt'));
      r = conversar(agy, pasta, p.c, opcoes);
      if (r.ok && !temJSON(r.resposta, codigo)) r = conversar(agy, pasta, REFAZER(codigo, 5), { ...opcoes, conversa: r.conversa });
    }

    if (r.ok && temJSON(r.resposta, codigo)) {
      writeFileSync(join(saida, `${codigo}.txt`), r.resposta + '\n');
      rmSync(pasta, { recursive: true, force: true });
      feitos++; seguidas = 0;
      console.log('feito.');
      anotar(`${codigo}: feito.`);
      continue;
    }
    falhas++; seguidas++;
    if (r.ok) { writeFileSync(join(pasta, 'resposta-sem-json.txt'), r.resposta); anotar(`${codigo}: ele respondeu sem o bloco json (guardei em ${pasta}). Vou tentar de novo na próxima rodada.`); }
    else anotar(`${codigo}: erro: ${String(r.erro).slice(0, 400)}`);
    if (r.fatal) break;
    if (r.cota) { anotar('A cota da assinatura acabou por agora. Ela volta a cada 5 horas (e tem um teto por semana): rode o mesmo comando de novo mais tarde; o que já foi feito fica guardado.'); break; }
    if (seguidas >= 3) { anotar(`Três lotes seguidos deram erro: parei para não gastar a cota à toa. Veja o ${log} e me mande.`); break; }
  }
  const total = lotes.filter((c) => existsSync(join(saida, `${c}.txt`))).length;
  console.log(`\nNesta rodada: ${feitos} lotes feitos, ${falhas} com problema. No total: ${total} de ${lotes.length}.`);
  console.log(`Para aplicar: mande a pasta ${saida} para o Claude, ou rode: node scripts/validacao-externa.mjs aplicar "${saida}" --simular`);
}

try { main(); } catch (e) { console.error(`Erro: ${e.message}`); process.exit(1); }

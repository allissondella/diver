#!/usr/bin/env node
/*
 * buscar-similares.mjs — Motor Diver (docs/MOTOR_DIVER.md): acha no Acervo Diver os itens aprovados
 * mais parecidos com um pedido, para servirem de exemplo de ESTILO na skill criar-trilha.
 *
 * Como funciona: o texto vira um vetor de significado (embedding da OpenAI, text-embedding-3-small)
 * e é comparado por similaridade de cosseno com os vetores guardados em data/acervo/<materia>.json.
 * Itens do acervo ainda sem vetor (ou com vetor de outro modelo) ganham um agora, e o arquivo é regravado.
 * Sem OPENAI_API_KEY, cai num plano B por palavras em comum (bem mais fraco) e avisa.
 *
 * Uso:
 *   node scripts/buscar-similares.mjs --materia matematica "questão de porcentagem com desconto sucessivo, nível médio"
 *   Opções: --quantos N (padrão 5)  --tema "Porcentagem" (prefere esse tema)  --json (saída para a skill)
 */
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODELOS, chave } from './lib/config.mjs';
import { embeddings, resumoDeCusto } from './lib/ia.mjs';
import { lerAcervo, gravarAcervo, caminhoAcervo, cosseno, parecencaPorPalavras, textoParaEmbedding, slugMateria } from './lib/acervo.mjs';

function argumentos(argv) {
  const a = { materia: null, quantos: 5, tema: null, json: false, texto: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--materia') a.materia = argv[++i];
    else if (x === '--quantos') a.quantos = Math.max(1, Number(argv[++i]) || 5);
    else if (x === '--tema') a.tema = argv[++i];
    else if (x === '--json') a.json = true;
    else if (x === '--ajuda' || x === '-h') a.ajuda = true;
    else if (x.startsWith('--')) throw new Error(`opção desconhecida: ${x}`);
    else a.texto.push(x);
  }
  a.texto = a.texto.join(' ').trim();
  return a;
}

/** Tira o vetor da saída (é enorme e não ajuda a skill). */
const semVetor = ({ embedding, ...resto }) => resto;
const mesmoTema = (a, b) => slugMateria(a || '-') === slugMateria(b || '-');

export async function buscarSimilares({ materia, texto, quantos = 5, tema = null }) {
  const acervo = lerAcervo(materia);
  if (!acervo.itens.length) return { itens: [], metodo: null, aviso: `acervo de "${slugMateria(materia)}" ainda vazio (normal no começo): gere a partir da Assinatura Diver.` };

  // Prefere o mesmo tema quando houver pelo menos 3 itens dele; senão, compara com a matéria toda.
  let candidatos = acervo.itens;
  let aviso = null;
  if (tema) {
    const doTema = acervo.itens.filter((i) => mesmoTema(i.tema, tema));
    if (doTema.length >= 3) candidatos = doTema;
    else aviso = `só ${doTema.length} item(ns) do tema "${tema}": comparando com a matéria toda.`;
  }

  if (!chave('OPENAI_API_KEY')) {
    const ranking = candidatos.map((i) => ({ nota: parecencaPorPalavras(texto, textoParaEmbedding(i)), item: i }));
    ranking.sort((a, b) => b.nota - a.nota);
    return {
      itens: ranking.slice(0, quantos).map((r) => ({ semelhanca: Number(r.nota.toFixed(4)), ...semVetor(r.item) })),
      metodo: 'palavras',
      aviso: [aviso, 'OPENAI_API_KEY ausente: usei o plano B por palavras em comum (fraco). Configure o .env para a busca por significado.'].filter(Boolean).join(' '),
    };
  }

  // Vetores que faltam (item novo, ou calculado com outro modelo) são calculados uma vez e guardados.
  const faltando = acervo.itens.filter((i) => !i.embedding || i.embedding.modelo !== MODELOS.embedding || !Array.isArray(i.embedding.vetor));
  if (faltando.length) {
    const vetores = await embeddings(MODELOS.embedding, faltando.map(textoParaEmbedding));
    faltando.forEach((item, k) => { item.embedding = { modelo: MODELOS.embedding, vetor: vetores[k] }; });
    gravarAcervo(materia, acervo);
  }
  const [consulta] = await embeddings(MODELOS.embedding, [texto]);
  const ranking = candidatos.map((i) => ({ nota: cosseno(consulta, i.embedding.vetor), item: i }));
  ranking.sort((a, b) => b.nota - a.nota);
  return {
    itens: ranking.slice(0, quantos).map((r) => ({ semelhanca: Number(r.nota.toFixed(4)), ...semVetor(r.item) })),
    metodo: 'embedding',
    aviso,
    vetoresCalculados: faltando.length,
  };
}

async function principal() {
  const args = argumentos(process.argv.slice(2));
  if (args.ajuda || !args.materia || !args.texto) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\n?/, '').replace(/^ \* ?/gm, ''));
    if (!args.ajuda) process.exitCode = 1;
    return;
  }
  const r = await buscarSimilares(args);
  if (args.json) {
    console.log(JSON.stringify({ materia: slugMateria(args.materia), arquivo: existsSync(caminhoAcervo(args.materia)) ? caminhoAcervo(args.materia) : null, ...r }, null, 2));
    return;
  }
  if (r.aviso) console.log(`Aviso: ${r.aviso}`);
  if (!r.itens.length) return;
  console.log(`Os ${r.itens.length} mais parecidos (${r.metodo === 'embedding' ? `por significado, ${MODELOS.embedding}` : 'por palavras'}):`);
  r.itens.forEach((i, n) => {
    console.log(`\n${n + 1}. [${i.semelhanca}] ${i.id} · ${i.tema} · ${i.dificuldade}${i.fonte ? ` · ${i.fonte}` : ''}`);
    console.log(`   ${i.enunciado.length > 220 ? i.enunciado.slice(0, 220) + '…' : i.enunciado}`);
  });
  const custo = resumoDeCusto();
  if (custo.linhas.length) console.log(`\nCusto estimado: US$ ${custo.total.toFixed(6)}`);
}

// Só roda o programa quando chamado direto (a função buscarSimilares pode ser importada por outros scripts).
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  principal().catch((e) => {
    console.error(`\nErro: ${e.message}`);
    process.exitCode = 1;
  });
}

/*
 * processar-lote.mjs — roda o Mergulho Triplo num lote da fila_validacao.
 * Separado da Edge Function (index.ts) para poder ser testado no Node com IAs falsas.
 *
 * - Confere antes se os modelos existem na conta (lista grátis): nome errado não gasta nada.
 * - Valida até `paralelas` questões ao mesmo tempo e para de começar novas quando o tempo
 *   da função está acabando (o que ficou para trás continua numa próxima execução).
 * - Grava o progresso a cada questão (salvar), então uma queda no meio não perde o que foi pago.
 */
import { validarQuestao, itemDoAcervo, textoParaEmbedding, custoReal, questaoLimpa } from './mergulho-nucleo.mjs';

export async function processarLote(linha, { clientes, modelos, salvar, hoje, limiteMs = 110_000, paralelas = 3, agora = () => Date.now() }) {
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

  // 0. Os modelos existem? (se não, para aqui sem nenhuma chamada paga)
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
export function relatorio(questoes, resultado) {
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

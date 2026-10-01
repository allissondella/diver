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
export const MODELOS_PADRAO = {
  fato: 'gemini-3.8-flash',            // Flash mais novo (GA); a doc do kit chama de "Gemini 3 Flash"
  fatoForte: 'gemini-3.1-pro-preview', // desempate da camada de fato
  logica: 'gpt-5-mini',                // "mini" mais barato da OpenAI
  logicaForte: 'gpt-5.5',              // desempate da camada de lógica
  embedding: 'text-embedding-3-small', // vetor guardado junto do item aprovado
};

/* ---------- Prompts exatos (skill validar-questoes, seção 1) ---------- */
export const PROMPT_FATO = `Verifique cada afirmação factual (datas, números, fórmulas, nomes) neste texto usando busca real.
Aponte qualquer afirmação incorreta ou desatualizada, citando a fonte que a corrige.
Se tudo estiver correto, responda apenas "CONFIRMADO".

`;
export const PROMPT_LOGICA = `Seu trabalho é tentar derrubar esta questão. Tente ativamente:
1. Provar que a alternativa marcada como correta está errada ou incompleta.
2. Encontrar outra alternativa que também possa estar certa.
3. Apontar ambiguidade no enunciado.
Se, mesmo tentando, a questão resistir, responda apenas "RESISTIU". Caso contrário, explique exatamente a falha encontrada.

`;

const LETRAS = 'ABCDEF';
export const letra = (i) => LETRAS[i];
export const alternativasEmTexto = (alternativas) => (alternativas || []).map((a, i) => `${LETRAS[i]}) ${a}`).join('\n');

/** Explicação em texto corrido: aceita a de 3 camadas ({ superficie, fundo, dica }) e a antiga (texto). */
export function explicacaoEmTexto(explicacao) {
  if (!explicacao) return '';
  if (typeof explicacao === 'string') return explicacao;
  return [
    explicacao.superficie && `Na superfície: ${explicacao.superficie}`,
    explicacao.fundo && `Mergulhando fundo: ${explicacao.fundo}`,
    explicacao.dica && `Dica de mergulhador: ${explicacao.dica}`,
  ].filter(Boolean).join('\n');
}

/** Camada 1 recebe a questão + a explicação completa (as três camadas, quando houver). */
export function textoFato(q) {
  return [
    `Enunciado: ${q.enunciado}`,
    `Alternativas:\n${alternativasEmTexto(q.alternativas)}`,
    `Resposta correta: ${letra(q.correta)}) ${q.alternativas[q.correta]}`,
    `Explicação:\n${explicacaoEmTexto(q.explicacao)}`,
  ].join('\n\n');
}

/** Camada 2 recebe enunciado + alternativas + tema + dificuldade — NUNCA o gabarito. */
export function textoLogica(q) {
  return [`Tema: ${q.tema}`, `Dificuldade: ${q.dificuldade}`, `Enunciado: ${q.enunciado}`, `Alternativas:\n${alternativasEmTexto(q.alternativas)}`].join('\n\n');
}

export const promptFato = (q) => PROMPT_FATO + textoFato(q);
export const promptLogica = (q) => PROMPT_LOGICA + textoLogica(q);

/** "CONFIRMADO"/"RESISTIU" sozinho = confirmado; começa com a palavra mas diz mais = dúvida; o resto = reprovado. */
export function classificar(resposta, palavra) {
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
export const CAMPOS_DA_QUESTAO = ['id', 'tema', 'dificuldade', 'fase', 'enunciado', 'alternativas', 'correta', 'explicacao', 'origem', 'fonte', 'varianteDe', 'validacao'];
export function questaoLimpa(q) {
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
export function variantesProibidas(conteudo) {
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
export async function assinatura(q) {
  const dados = new TextEncoder().encode(JSON.stringify([q.enunciado, q.alternativas, q.correta, q.explicacao]));
  const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', dados));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

/* ---------- Funil de custo (skill, seção 2) ---------- */
/**
 * chamar(modelo, prompt) → { resposta, fontes? }. Barato primeiro; o robusto só entra quando
 * a resposta não é exatamente a palavra de aprovação, para desempatar (falha real ou falso positivo).
 */
export async function rodarCamada(tipo, q, { chamar, modelos }) {
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
export async function validarQuestao(q, { chamarFato, chamarLogica, modelos, hoje, refazer = false }) {
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
export function itemDoAcervo(q, { trilhaId, materia, validacao }) {
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
export function textoParaEmbedding(item) {
  return [`Tema: ${item.tema || ''}`, `Dificuldade: ${item.dificuldade || ''}`, item.enunciado || '', alternativasEmTexto(item.alternativas), explicacaoEmTexto(item.explicacao)]
    .filter(Boolean).join('\n');
}

/* ---------- Custo ---------- */
/**
 * Preços de docs/ASSINATURA_E_VALIDACAO.md, seção 3 (US$ por 1 milhão de tokens).
 * O documento não traz número para o GPT-5.2 mini ("bem mais barato que o cheio"), então a
 * estimativa usa o preço do GPT-5.2 cheio como TETO na camada de lógica. Melhor sobrar que faltar.
 */
export const PRECOS_DOC = {
  fato: { entrada: 0.75, saida: 3.75 },     // Gemini 3 Flash (promocional até o fim de 2026)
  busca: 14 / 1000,                          // busca do Google: US$ 14 por 1.000 (5.000 grátis/mês não são descontados)
  logica: { entrada: 1.75, saida: 14 },     // GPT-5.2 (teto também para o mini)
};
export const ESTIMATIVA = {
  caracteresPorToken: 4,     // regra de bolso para português
  saidaPorCamada: 800,       // tokens de resposta (inclui "raciocínio") por chamada, com folga
  folgaEscalonamento: 1.3,   // +30% para as questões que escalam para o modelo robusto
};

/** custo_estimado_usd = soma por questão de [fato (tokens + 1 busca) + lógica (tokens)] × 1,3. */
export function estimarCusto(questoes) {
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
export const PRECOS_MODELO = {
  'gemini-3.8-flash': [0.75, 3.75],
  'gpt-5-mini': [0.25, 2.0],
  'gpt-5.2': [1.75, 14],
  'text-embedding-3-small': [0.02, 0],
};

/** uso = { [modelo]: { entrada, saida, buscas } } → US$ */
export function custoReal(uso) {
  let total = 0;
  for (const [modelo, u] of Object.entries(uso)) {
    const p = PRECOS_MODELO[modelo] || (/^gemini/.test(modelo) ? [PRECOS_DOC.fato.entrada * 4, PRECOS_DOC.fato.saida * 4] : [PRECOS_DOC.logica.entrada, PRECOS_DOC.logica.saida]);
    total += (u.entrada * p[0] + u.saida * p[1]) / 1e6 + (u.buscas || 0) * PRECOS_DOC.busca;
  }
  return Math.round(total * 10000) / 10000;
}

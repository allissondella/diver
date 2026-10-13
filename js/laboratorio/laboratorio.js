/*
 * laboratorio/laboratorio.js — o que todo laboratório "Mão na massa" compartilha (Explora Tech, 2026-10-13).
 *
 *  - dados: data/laboratorios/<curso>/<id>.json (baixados só quando o laboratório abre);
 *  - progresso: as estrelas de cada missão em "diver:v1:lab:<curso>" (sobe para a nuvem com o resto);
 *    o rascunho do código fica SÓ no aparelho ("diver-local:v1:lab:..."), nunca sobe;
 *  - recompensa: 10 XP e 1 pérola por estrela NOVA (a melhor marca de cada missão paga uma vez só),
 *    entregue pela economia no fim (Resultado padrão com soBonus, teto da economia);
 *  - peças de tela: estrelas, dicas em 3 níveis, "Agora faça de verdade", erro do Python traduzido.
 */
const Laboratorios = (() => {
  const { h, icone } = UI;
  const XP_POR_ESTRELA = 10;
  const PEROLAS_POR_ESTRELA = 1;
  const cache = new Map();

  async function carregar(trilhaId, labId) {
    const chave = `${trilhaId}/${labId}`;
    if (!cache.has(chave)) {
      cache.set(chave, fetch(`data/laboratorios/${trilhaId}/${labId}.json`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).catch((e) => { cache.delete(chave); throw e; }));
    }
    return cache.get(chave);
  }

  /** Os laboratórios de um curso: os das aulas (fases[].laboratorio, texto ou lista) e os do bloco "laboratorios". */
  function daTrilha(trilha) {
    const ids = [];
    const pegar = (v) => (Array.isArray(v) ? v : v ? [v] : []).forEach((id) => { if (typeof id === 'string' && !ids.includes(id)) ids.push(id); });
    (trilha.fases || []).forEach((f) => pegar(f.laboratorio));
    pegar(trilha.laboratorios);
    return ids;
  }

  /* ---------- Progresso (estrelas) ---------- */
  const chaveProg = (trilhaId) => `diver:v1:lab:${trilhaId}`;
  function progresso(trilhaId, labId) {
    const tudo = Dados.ler(chaveProg(trilhaId), {});
    return (tudo && tudo[labId]) || {};
  }
  /** Guarda a melhor marca da missão. Devolve { antes, agora } (estrelas). */
  function registrar(trilhaId, labId, missaoId, estrelas) {
    const tudo = Dados.ler(chaveProg(trilhaId), {}) || {};
    const lab = tudo[labId] || {};
    const m = lab[missaoId] || { estrelas: 0, pagas: 0 };
    const antes = m.estrelas;
    if (estrelas > m.estrelas) { m.estrelas = estrelas; m.em = UI.dataLocal(); }
    lab[missaoId] = m;
    tudo[labId] = lab;
    Dados.gravar(chaveProg(trilhaId), tudo);
    return { antes, agora: m.estrelas };
  }
  /** Estrelas ainda não pagas (quem saiu no meio recebe na próxima vez que concluir). */
  function aPagar(trilhaId, labId) {
    return Object.values(progresso(trilhaId, labId)).reduce((n, m) => n + Math.max(0, (m.estrelas || 0) - (m.pagas || 0)), 0);
  }
  function marcarPagas(trilhaId, labId) {
    const tudo = Dados.ler(chaveProg(trilhaId), {}) || {};
    Object.values(tudo[labId] || {}).forEach((m) => { m.pagas = m.estrelas; });
    Dados.gravar(chaveProg(trilhaId), tudo);
  }

  /* ---------- Rascunho (só neste aparelho) ---------- */
  const chaveRascunho = (t, l, m) => `diver-local:v1:lab:${t}:${l}:${m}`;
  const lerRascunho = (t, l, m) => Dados.ler(chaveRascunho(t, l, m), null);
  const gravarRascunho = (t, l, m, v) => Dados.gravar(chaveRascunho(t, l, m), v);

  /** Modo toque (blocos) ou código: a escolha da pessoa, ou toque em tela pequena com o dedo. */
  const CHAVE_MODO = 'diver-local:v1:lab-modo';
  function modoInicial() {
    const salvo = Dados.ler(CHAVE_MODO, null);
    if (salvo === 'toque' || salvo === 'codigo') return salvo;
    try {
      return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900 ? 'toque' : 'codigo';
    } catch (e) {
      return 'codigo';
    }
  }
  const guardarModo = (m) => Dados.gravar(CHAVE_MODO, m);

  /* ---------- Peças de tela ---------- */
  function estrelas(n, rotulo = true) {
    return h('span', { class: 'lab-estrelas', 'aria-label': rotulo ? `${n} de 3 estrelas` : null, 'aria-hidden': rotulo ? null : 'true' },
      [1, 2, 3].map((k) => icone('i-estrela', n >= k ? 'ativa' : '')));
  }

  /** Dicas em 3 níveis (direção → trecho → quase a resposta). Devolve { el, usadas() }. */
  function dicas(lista, aoUsar = () => {}) {
    let usadas = 0;
    const caixa = h('ol', { class: 'lab-dicas__lista', 'aria-live': 'polite' });
    const botao = h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', id: 'lab-dica' });
    const atualizar = () => {
      botao.disabled = usadas >= lista.length;
      botao.replaceChildren(icone('i-bolha'), usadas >= lista.length ? 'Todas as dicas abertas' : `Pedir dica (${usadas} de ${lista.length})`);
      botao.title = usadas === lista.length - 1 ? 'A última dica quase entrega a resposta: com ela, a missão vale no máximo 1 estrela.' : '';
    };
    botao.addEventListener('click', () => {
      if (usadas >= lista.length) return;
      caixa.append(h('li', { class: `lab-dicas__item ${usadas === lista.length - 1 ? 'lab-dicas__item--ultima' : ''}`, text: lista[usadas] }));
      usadas++;
      atualizar();
      aoUsar(usadas);
    });
    atualizar();
    return { el: h('div', { class: 'lab-dicas' }, botao, caixa), usadas: () => usadas };
  }

  /** "Agora faça de verdade": a ferramenta real, com um mini passo a passo. */
  function fazerDeVerdade(info) {
    if (!info) return null;
    return h('details', { class: 'lab-verdade cartao' },
      h('summary', {}, icone('i-seta-dir'), info.titulo || 'Agora faça de verdade'),
      info.texto ? h('p', { class: 'texto-suave', text: info.texto }) : null,
      h('ol', {}, (info.passos || []).map((p) => h('li', {}, UI.marcado(p)))));
  }

  /* ---------- Erros do Python, em inglês e em português ---------- */
  const TRADUCAO = {
    SyntaxError: 'Erro de sintaxe: o Python não entendeu como esta linha foi escrita. Confira parênteses, dois-pontos e aspas.',
    IndentationError: 'Erro de recuo: os espaços no começo da linha não combinam com o bloco onde ela está.',
    TabError: 'Recuo misturado: a linha tem Tab e espaços juntos. Use só espaços (4 por nível).',
    NameError: 'Nome não definido: o programa usou um nome que o Python não conhece. Erro de digitação? Faltou criar a variável?',
    TypeError: 'Tipo errado: a operação recebeu um valor de um tipo que ela não aceita (por exemplo, somar texto com número).',
    ValueError: 'Valor inválido: o tipo está certo, mas o valor não serve (por exemplo, int("abc")).',
    ZeroDivisionError: 'Divisão por zero: nenhum número pode ser dividido por zero.',
    IndexError: 'Índice fora da lista: a posição pedida não existe (a primeira posição é a 0).',
    KeyError: 'Chave não encontrada: o dicionário não tem essa chave.',
    AttributeError: 'Atributo inexistente: esse valor não tem o método ou a propriedade usada depois do ponto.',
    FileNotFoundError: 'Arquivo não encontrado: o caminho não existe na pasta do laboratório.',
    RecursionError: 'Recursão demais: uma função chamou a si mesma vezes demais, sem parar.',
    TempoEsgotado: 'Tempo esgotado: o programa demorou demais e foi parado. Será um laço que nunca termina?',
    SaidaGrande: 'Saída grande demais: o programa imprimiu (ou andou) demais. Será um laço que nunca termina?',
  };

  /** Bloco de erro: a mensagem original do Python (inglês técnico) e o que ela quer dizer. */
  function blocoErro(erro) {
    if (!erro) return null;
    const original = erro.traceback ? erro.traceback.split('\n').filter(Boolean).slice(-1)[0] : `${erro.tipo}: ${erro.mensagem}`;
    return h('div', { class: 'lab-erro', role: 'alert' },
      h('p', { class: 'lab-erro__titulo' }, icone('i-alerta'), erro.linha ? `Linha ${erro.linha}` : 'O programa parou'),
      h('code', { class: 'lab-erro__original', lang: 'en', text: original }),
      h('p', { class: 'lab-erro__traducao', text: TRADUCAO[erro.tipo] || 'O Python avisou um erro. Leia a mensagem em inglês acima: ela diz o tipo e o motivo.' }));
  }

  /**
   * Resultado padrão de uma sessão de laboratório: cada missão tentada vira um detalhe (resolvida = acerto),
   * e o XP vem só do bônus das estrelas novas (soBonus), com o teto da economia.
   */
  function resultado({ trilha, lab, inicio, tentativas }) {
    const novas = aPagar(trilha.id, lab.id);
    const detalhes = tentativas.map((t) => ({
      cartaId: `${lab.id}:${t.missao.id}`, tema: lab.nome, dificuldade: 'medio', acertou: t.resolvida, neutro: false,
      tempoMs: t.tempoMs || 0, pergunta: t.missao.titulo, resposta: t.resolvida ? `${t.estrelas} de 3 estrelas` : '', sua: '',
      explicacao: t.resolvida ? '' : (t.missao.dicas || [])[0] || '',
    }));
    const res = Jogos.resultado({
      jogoId: lab.id, trilha, detalhes, inicio,
      bonus: { xp: novas * XP_POR_ESTRELA, perolas: novas * PEROLAS_POR_ESTRELA, motivo: novas ? `${UI.plural(novas, 'estrela nova', 'estrelas novas')}` : '' },
      titulo: novas ? 'Mão na massa!' : 'Laboratório concluído',
      subtitulo: `${UI.plural(tentativas.filter((t) => t.resolvida).length, 'missão resolvida', 'missões resolvidas')} nesta sessão.`,
    });
    res.soBonus = true;
    res.textoDeNovo = 'Voltar ao laboratório';
    res.registro = { laboratorio: lab.id, missoes: tentativas.map((t) => ({ missao: t.missao.id, estrelas: t.estrelas, resolvida: t.resolvida })), estrelas_novas: novas };
    marcarPagas(trilha.id, lab.id);
    return res;
  }

  return {
    carregar, daTrilha, progresso, registrar, aPagar, lerRascunho, gravarRascunho, modoInicial, guardarModo,
    estrelas, dicas, fazerDeVerdade, blocoErro, resultado, TRADUCAO,
  };
})();

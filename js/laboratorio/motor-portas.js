/*
 * laboratorio/motor-portas.js — as regras da Fábrica de Portas Lógicas (Explora Tech, Módulo 8, 2026-10-16).
 * Só lógica, sem tela: o mesmo arquivo roda no navegador e no scripts/conferir-laboratorios.mjs (Node).
 *
 * Dois tipos de missão (data/laboratorios/<curso>/fabrica-de-portas.json):
 *  - "circuito": entradas ["A", "B"], saídas [{ nome: "S", alvo: [0, 0, 0, 1] }] (uma linha por combinação,
 *    na ordem 00, 01, 10, 11...). O aluno monta portas em ordem; cada porta usa as entradas ou as portas de cima:
 *    { portas: [["AND", "A", "B"], ["NOT", "p1"]], saidas: { S: "p2" } }. 3 estrelas = até metas.portas portas.
 *  - "bits": acender interruptores até formar metas.alvo (decimal). "mostrarDecimal: false" esconde o valor
 *    até conferir. 3 estrelas = até metas.toques toques (o mínimo é a quantidade de 1 no alvo).
 *  - "ler": bits fixos; o aluno escreve o valor em decimal.
 */
const MotorPortas = (() => {
  const TIPOS = {
    AND: { nome: 'AND (E)', entradas: 2, f: (a, b) => a & b },
    OR: { nome: 'OR (OU)', entradas: 2, f: (a, b) => a | b },
    NOT: { nome: 'NOT (NÃO)', entradas: 1, f: (a) => 1 - a },
    XOR: { nome: 'XOR (OU exclusivo)', entradas: 2, f: (a, b) => a ^ b },
    NAND: { nome: 'NAND (NÃO E)', entradas: 2, f: (a, b) => 1 - (a & b) },
    NOR: { nome: 'NOR (NÃO OU)', entradas: 2, f: (a, b) => 1 - (a | b) },
  };

  /** As combinações das entradas, na ordem binária (00, 01, 10, 11...). */
  function linhas(entradas) {
    const n = entradas.length;
    return Array.from({ length: 2 ** n }, (_, i) => Object.fromEntries(entradas.map((e, k) => [e, (i >> (n - 1 - k)) & 1])));
  }

  /** Os sinais que a porta k (0, 1, ...) pode usar: as entradas e as portas de cima. */
  const sinaisAte = (entradas, k) => [...entradas, ...Array.from({ length: k }, (_, i) => `p${i + 1}`)];

  /** Valor de cada sinal numa linha. Porta com problema (sem tipo ou entrada que não existe) vale null. */
  function avaliar(circuito, entradas, linha) {
    const v = { ...linha };
    (circuito.portas || []).forEach((p, k) => {
      const t = TIPOS[p[0]];
      const usa = p.slice(1, 1 + (t ? t.entradas : 0));
      const ok = t && usa.length === t.entradas && usa.every((s) => sinaisAte(entradas, k).includes(s) && v[s] !== null && v[s] !== undefined);
      v[`p${k + 1}`] = ok ? t.f(...usa.map((s) => v[s])) : null;
    });
    return v;
  }

  /** A tabela-verdade do circuito: por linha, as entradas, o alvo e o que saiu em cada saída. */
  function tabela(m, circuito) {
    return linhas(m.entradas).map((linha, i) => {
      const v = avaliar(circuito, m.entradas, linha);
      const saidas = (m.saidas || []).map((s) => {
        const sinal = (circuito.saidas || {})[s.nome];
        const valor = sinal && v[sinal] !== undefined ? v[sinal] : null;
        return { nome: s.nome, alvo: s.alvo[i], valor, ok: valor === s.alvo[i] };
      });
      return { linha, saidas, ok: saidas.every((s) => s.ok) };
    });
  }

  const valorBits = (bits) => bits.reduce((n, b) => n * 2 + (b ? 1 : 0), 0);
  const uns = (n) => n.toString(2).split('').filter((c) => c === '1').length;

  /**
   * Confere uma resposta. circuito: { portas, saidas }; bits: { bits: [0/1...], toques }; ler: { valor }.
   * Devolve { ok, mensagem, custo } (custo: portas, toques ou 0).
   */
  function conferir(m, resposta) {
    if (m.tipo === 'bits') {
      const valor = valorBits(resposta.bits || []);
      if (valor !== m.metas.alvo) return { ok: false, custo: resposta.toques || 0, mensagem: `Os interruptores formam ${valor}, e o painel pede ${m.metas.alvo}.` };
      return { ok: true, custo: resposta.toques || 0, mensagem: `${(resposta.bits || []).join('')} em binário é ${valor} em decimal.` };
    }
    if (m.tipo === 'ler') {
      const certo = valorBits(m.bits);
      const n = Number(String(resposta.valor || '').trim());
      if (!Number.isInteger(n) || String(resposta.valor).trim() === '') return { ok: false, custo: 0, mensagem: 'Escreva um número inteiro.' };
      return n === certo ? { ok: true, custo: 0, mensagem: `${m.bits.join('')} vale ${certo}.` } : { ok: false, custo: 0, mensagem: `${n} ainda não é o valor de ${m.bits.join('')}. Some as casas que têm 1.` };
    }
    const t = tabela(m, resposta);
    const portas = (resposta.portas || []).length;
    const semSaida = (m.saidas || []).filter((s) => !(resposta.saidas || {})[s.nome]);
    if (semSaida.length) return { ok: false, custo: portas, mensagem: `Ligue a saída ${semSaida.map((s) => s.nome).join(' e ')} a uma entrada ou a uma porta.` };
    const erradas = t.filter((l) => !l.ok);
    if (erradas.length) {
      const l = erradas[0];
      const ent = m.entradas.map((e) => `${e} = ${l.linha[e]}`).join(', ');
      const s = l.saidas.find((x) => !x.ok);
      return { ok: false, custo: portas, mensagem: `${UI_PLURAL(erradas.length, 'linha da tabela ainda não bate', 'linhas da tabela ainda não batem')}. Com ${ent}, ${s.nome} devia dar ${s.alvo} e deu ${s.valor === null ? 'nada (porta sem ligação)' : s.valor}.` };
    }
    return { ok: true, custo: portas, mensagem: `A tabela inteira bate, com ${UI_PLURAL(portas, 'porta', 'portas')}.` };
  }
  const UI_PLURAL = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  /** A resposta inicial de uma missão (o que aparece antes de o aluno mexer). */
  function inicial(m) {
    if (m.tipo === 'bits') return { bits: (m.bitsIniciais || Array(m.metas.bits || 8).fill(0)).slice(), toques: 0 };
    if (m.tipo === 'ler') return { valor: '' };
    return { portas: JSON.parse(JSON.stringify(m.portasIniciais || [])), saidas: { ...(m.saidasIniciais || {}) } };
  }

  /** Conferência para o scripts/conferir-laboratorios.mjs: devolve a lista de problemas da missão. */
  function verificar(m) {
    const erros = [];
    if (!['circuito', 'bits', 'ler'].includes(m.tipo)) return [`tipo "${m.tipo}" desconhecido (circuito, bits ou ler)`];
    if (m.tipo === 'circuito') {
      if (!Array.isArray(m.entradas) || !m.entradas.length) erros.push('faltam as entradas');
      (m.saidas || []).forEach((s) => { if (!Array.isArray(s.alvo) || s.alvo.length !== 2 ** m.entradas.length) erros.push(`a saída ${s.nome} precisa de ${2 ** m.entradas.length} valores no alvo`); });
      (m.permitidas || []).forEach((p) => { if (!TIPOS[p]) erros.push(`porta "${p}" não existe`); });
      const sol = m.solucao || {};
      (sol.portas || []).forEach((p) => { if ((m.permitidas || Object.keys(TIPOS)).indexOf(p[0]) < 0) erros.push(`a solução usa ${p[0]}, que a missão não oferece`); });
      if (!conferir(m, sol).ok) erros.push(`a solução não cumpre a tabela: ${conferir(m, sol).mensagem}`);
      if (conferir(m, inicial(m)).ok) erros.push('a montagem inicial já resolve a missão');
      if (!m.metas || !m.metas.portas) erros.push('falta metas.portas');
      else if ((sol.portas || []).length > m.metas.portas) erros.push(`a solução usa ${sol.portas.length} portas e a meta é ${m.metas.portas}`);
    }
    if (m.tipo === 'bits') {
      if (!m.metas || !Number.isInteger(m.metas.alvo) || !m.metas.bits || !m.metas.toques) return ['faltam metas.alvo, metas.bits ou metas.toques'];
      if (m.metas.alvo >= 2 ** m.metas.bits) erros.push(`${m.metas.alvo} não cabe em ${m.metas.bits} bits`);
      if (m.metas.toques < uns(m.metas.alvo)) erros.push(`a meta de toques (${m.metas.toques}) é menor que o mínimo (${uns(m.metas.alvo)})`);
      if (conferir(m, inicial(m)).ok) erros.push('os interruptores já começam no alvo');
    }
    if (m.tipo === 'ler') {
      if (!Array.isArray(m.bits) || !m.bits.length) erros.push('faltam os bits');
    }
    return erros;
  }

  return { TIPOS, linhas, sinaisAte, avaliar, tabela, conferir, inicial, verificar, valorBits, uns };
})();

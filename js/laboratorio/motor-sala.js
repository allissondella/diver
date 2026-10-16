/*
 * laboratorio/motor-sala.js — as regras da Sala de Controle (Explora Tech, Módulo 8, 2026-10-16).
 * Só lógica, sem tela: o mesmo arquivo roda no navegador e no scripts/conferir-laboratorios.mjs (Node).
 *
 * Uma máquina simulada (data/laboratorios/<curso>/sala-de-controle.json):
 *   maquina: { ram: MB, disco: MB, discoSistema: MB ocupados pelo sistema }
 *   processos: [{ id, nome, cpu: %, memoria: MB, estado: "ok" | "travado", sistema, naoSalvo, local }]
 *   arquivos: [{ id, nome, pasta, tamanho: MB, protegido: "motivo" }]
 *   objetivos: [{ tipo: "ram", max } | { tipo: "cpu", max } | { tipo: "disco", livreMin } |
 *               { tipo: "manter", id, texto } | { tipo: "encerrado", id, texto } | { tipo: "manterArquivo", id, texto }]
 *   solucao: [{ acao: "encerrar" | "apagar", id }], metas: { acoes }
 * Encerrar um processo do sistema é recusado (o computador cairia). Quando a RAM passa de 90%, o sistema usa o disco
 * como memória virtual e o painel mostra o disco ocupado e tudo lento.
 */
const MotorSala = (() => {
  function estado(m) {
    return {
      ativos: new Set((m.processos || []).map((p) => p.id)),
      arquivos: new Set((m.arquivos || []).map((a) => a.id)),
      acoes: [],
    };
  }

  const proc = (m, id) => (m.processos || []).find((p) => p.id === id);
  const arq = (m, id) => (m.arquivos || []).find((a) => a.id === id);

  /** Os números do painel agora. */
  function medir(m, e) {
    const ativos = (m.processos || []).filter((p) => e.ativos.has(p.id));
    const ramUsada = ativos.reduce((s, p) => s + p.memoria, 0);
    const ram = Math.round((ramUsada / m.maquina.ram) * 100);
    const cpu = Math.min(100, ativos.reduce((s, p) => s + p.cpu, 0));
    const discoUsado = (m.maquina.discoSistema || 0) + (m.arquivos || []).filter((a) => e.arquivos.has(a.id)).reduce((s, a) => s + a.tamanho, 0);
    const discoLivre = Math.max(0, m.maquina.disco - discoUsado);
    const memoriaVirtual = ram > 90;
    return { ramUsada, ram, cpu, discoUsado, discoLivre, memoriaVirtual, atividadeDisco: memoriaVirtual ? 100 : Math.min(100, 5 + Math.round(cpu / 10)) };
  }

  /** Faz uma ação. Devolve { ok, mensagem }; ação recusada não muda nada (mas conta como tentativa). */
  function aplicar(m, e, { acao, id }) {
    if (acao === 'encerrar') {
      const p = proc(m, id);
      if (!p || !e.ativos.has(id)) return { ok: false, mensagem: 'Esse processo não está rodando.' };
      e.acoes.push({ acao, id });
      if (p.sistema) return { ok: false, recusada: true, mensagem: `${p.nome} é do sistema operacional: sem ele o computador cai. O sistema recusou.` };
      e.ativos.delete(id);
      return { ok: true, mensagem: p.naoSalvo ? `${p.nome} encerrado. O que não estava salvo se perdeu.` : `${p.nome} encerrado: ${p.memoria} MB de memória livres.` };
    }
    if (acao === 'apagar') {
      const a = arq(m, id);
      if (!a || !e.arquivos.has(id)) return { ok: false, mensagem: 'Esse arquivo não está mais no disco.' };
      e.acoes.push({ acao, id });
      e.arquivos.delete(id);
      return { ok: true, mensagem: `${a.nome} apagado: ${(a.tamanho / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB livres.` };
    }
    return { ok: false, mensagem: 'Ação desconhecida.' };
  }

  const gb = (mb) => `${(mb / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;

  /** Os objetivos com o estado de cada um agora: [{ texto, ok }]. */
  function objetivos(m, e) {
    const n = medir(m, e);
    return (m.objetivos || []).map((o) => {
      if (o.tipo === 'ram') return { texto: `Memória abaixo de ${o.max}% (agora: ${n.ram}%)`, ok: n.ram < o.max };
      if (o.tipo === 'cpu') return { texto: `Processador abaixo de ${o.max}% (agora: ${n.cpu}%)`, ok: n.cpu < o.max };
      if (o.tipo === 'disco') return { texto: `Pelo menos ${gb(o.livreMin)} livres no disco (agora: ${gb(n.discoLivre)})`, ok: n.discoLivre >= o.livreMin };
      if (o.tipo === 'manter') return { texto: o.texto || `Sem fechar ${proc(m, o.id).nome}`, ok: e.ativos.has(o.id) };
      if (o.tipo === 'encerrado') return { texto: o.texto, ok: !e.ativos.has(o.id) };
      if (o.tipo === 'manterArquivo') return { texto: o.texto || `Sem apagar ${arq(m, o.id).nome}`, ok: e.arquivos.has(o.id) };
      return { texto: '?', ok: false };
    });
  }

  /** Confere o estado: { ok, mensagem, custo } (custo = ações feitas). */
  function conferir(m, e) {
    const obj = objetivos(m, e);
    const falta = obj.filter((o) => !o.ok);
    const custo = e.acoes.length;
    if (falta.length) return { ok: false, custo, mensagem: `Ainda falta: ${falta.map((o) => o.texto.replace(/ \(agora.*\)$/, '')).join('; ')}.` };
    return { ok: true, custo, mensagem: `Tudo sob controle, em ${custo} ${custo === 1 ? 'ação' : 'ações'}.` };
  }

  /** Conferência para o scripts/conferir-laboratorios.mjs: a lista de problemas da missão. */
  function verificar(m) {
    const erros = [];
    if (!m.maquina || !m.maquina.ram || !m.maquina.disco) return ['falta a máquina (ram e disco)'];
    if (!Array.isArray(m.objetivos) || !m.objetivos.length) erros.push('faltam objetivos');
    (m.objetivos || []).forEach((o) => {
      if (['manter', 'encerrado'].includes(o.tipo) && !proc(m, o.id)) erros.push(`objetivo com processo que não existe: ${o.id}`);
      if (o.tipo === 'manterArquivo' && !arq(m, o.id)) erros.push(`objetivo com arquivo que não existe: ${o.id}`);
      if (o.tipo === 'encerrado' && !o.texto) erros.push('objetivo "encerrado" precisa de texto (sem entregar o nome)');
    });
    const ids = [...(m.processos || []), ...(m.arquivos || [])].map((x) => x.id);
    if (new Set(ids).size !== ids.length) erros.push('ids repetidos entre processos e arquivos');
    const e0 = estado(m);
    if (conferir(m, e0).ok) erros.push('a máquina já começa resolvida');
    const e = estado(m);
    (m.solucao || []).forEach((a) => {
      const r = aplicar(m, e, a);
      if (!r.ok) erros.push(`a solução tenta ${a.acao} ${a.id}: ${r.mensagem}`);
    });
    const c = conferir(m, e);
    if (!c.ok) erros.push(`a solução não resolve: ${c.mensagem}`);
    if (!m.metas || !m.metas.acoes) erros.push('falta metas.acoes');
    else if ((m.solucao || []).length > m.metas.acoes) erros.push(`a solução usa ${m.solucao.length} ações e a meta é ${m.metas.acoes}`);
    return erros;
  }

  return { estado, medir, aplicar, objetivos, conferir, verificar, gb };
})();

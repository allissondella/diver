/*
 * fila-validacao.js — Admin → "Fila de Validação" do Mergulho Triplo (docs/MOTOR_DIVER.md, seção 11).
 *
 * Lista os lotes de questões que esperam validação pelas IAs pagas, com o custo estimado à vista.
 * "Aprovar e executar" SEMPRE pede a senha de novo (Nuvem.confirmarSenha): com o token novo, o banco
 * aprova (fila_aprovar confere a senha recente) e a Edge Function mergulho-triplo executa (confere de novo).
 * O navegador nunca vê chave de IA: a tela só pergunta à função SE as chaves existem nos Secrets.
 */
const FilaValidacao = (() => {
  const { h, icone, limpar } = UI;
  const STATUS = {
    pendente: { nome: 'Pendente', classe: 'chip--aviso' },
    aprovado: { nome: 'Aprovado', classe: 'chip--ativo' },
    executando: { nome: 'Executando…', classe: 'chip--ativo' },
    concluido: { nome: 'Concluído', classe: 'chip--papel' },
    rejeitado: { nome: 'Rejeitado', classe: '' },
  };
  const FILTROS = [['pendente', 'Pendentes'], ['andamento', 'Em andamento'], ['concluido', 'Concluídos'], ['rejeitado', 'Rejeitados'], ['', 'Todos']];
  const estado = { filtro: 'pendente', lotes: [], abertos: new Set(), timer: null, secao: null };
  const dolar = (v) => `US$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  const quando = (d) => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
  const nomeTrilha = (id) => (App.trilhas().find((t) => t.id === id) || {}).nome || id;

  /* ---------- Tela ---------- */
  function render(secao) {
    estado.secao = secao;
    limpar(secao);
    const chaves = h('div', { class: 'fila-chaves', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Conferindo as chaves nos Secrets do Supabase…' }));
    const lista = h('div', { class: 'fila-lista', id: 'fila-lista', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Carregando a fila…' }));
    const filtros = h('div', { class: 'segmentado fila-filtros', role: 'group', 'aria-label': 'Filtrar lotes por situação' },
      FILTROS.map(([k, nome]) => h('button', {
        type: 'button', 'aria-pressed': String(estado.filtro === k), text: nome,
        onclick: (e) => {
          estado.filtro = k;
          filtros.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
          desenharLista();
        },
      })));
    secao.append(
      UI.cabecalho('Admin', 'Fila de Validação', 'Lotes de questões esperando o Mergulho Triplo (checagem de fato e de lógica com IAs pagas). Nada roda sem você aprovar com a sua senha.'),
      h('section', { class: 'cartao fila-info', id: 'fila-chaves-cartao', 'aria-labelledby': 'fila-chaves-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'fila-chaves-titulo' }, icone('i-cadeado'), 'Chaves das IAs'),
        chaves,
        h('p', { class: 'texto-suave fila-info__nota', text: 'As chaves ficam só nos Secrets das Edge Functions do Supabase (cadastradas por você no painel). Esta tela nunca mostra nem guarda o valor delas.' })),
      h('div', { class: 'acoes-linha' }, h('h2', { class: 'secao-titulo secao-titulo--linha', text: 'Lotes' }),
        h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => carregar() }, icone('i-revisao'), 'Atualizar')),
      filtros,
      lista);
    conferirChaves(chaves);
    carregar();
  }

  async function conferirChaves(alvo) {
    try {
      const r = await Nuvem.funcao('mergulho-triplo', { acao: 'status' });
      const item = (ok, nome) => h('li', { class: ok ? 'fila-chave fila-chave--ok' : 'fila-chave fila-chave--falta' },
        icone(ok ? 'i-check' : 'i-x'), h('span', { text: `${nome}: ${ok ? 'cadastrada' : 'não encontrada'}` }));
      alvo.replaceChildren(h('ul', { class: 'fila-chaves__lista' }, item(r.chaves.gemini, 'GEMINI_API_KEY'), item(r.chaves.openai, 'OPENAI_API_KEY')),
        h('p', { class: 'texto-suave', text: `Modelos: fato ${r.modelos.fato} (desempate ${r.modelos.fatoForte}) · lógica ${r.modelos.logica} (desempate ${r.modelos.logicaForte}).` }));
    } catch (e) {
      alvo.replaceChildren(h('p', { class: 'texto-erro', text: e.message }));
    }
  }

  async function carregar() {
    const lista = document.getElementById('fila-lista');
    if (!lista) return;
    try {
      estado.lotes = (await Nuvem.rest('GET', 'fila_validacao?select=*&order=criado_em.desc')) || [];
      desenharLista();
    } catch (e) {
      lista.replaceChildren(h('p', { class: 'texto-erro', text: e.message }));
    }
    vigiar();
  }

  /** Enquanto algum lote estiver executando, atualiza a lista a cada 5 s (e para ao sair da tela). */
  function vigiar() {
    clearTimeout(estado.timer);
    const naTela = estado.secao && !estado.secao.hidden && document.getElementById('fila-lista');
    if (naTela && estado.lotes.some((l) => l.status === 'executando')) estado.timer = setTimeout(carregar, 5000);
  }

  function desenharLista() {
    const lista = document.getElementById('fila-lista');
    if (!lista) return;
    const f = estado.filtro;
    const visiveis = estado.lotes.filter((l) => !f || (f === 'andamento' ? ['aprovado', 'executando'].includes(l.status) : l.status === f));
    limpar(lista);
    const pendentes = estado.lotes.filter((l) => l.status === 'pendente');
    lista.append(h('p', { class: 'texto-suave', text: `${UI.plural(pendentes.length, 'lote pendente', 'lotes pendentes')} · custo estimado somado: ${dolar(pendentes.reduce((s, l) => s + Number(l.custo_estimado_usd), 0))}` }));
    if (!visiveis.length) {
      lista.append(UI.vazio(estado.lotes.length ? 'Nenhum lote nesta situação.' : 'Fila vazia. Os lotes chegam pela skill criar-trilha (node scripts/fila.mjs enviar …).'));
      return;
    }
    visiveis.forEach((l) => lista.append(cartaoLote(l)));
  }

  function cartaoLote(l) {
    const st = STATUS[l.status] || { nome: l.status, classe: '' };
    const qs = (l.conteudo_pendente && l.conteudo_pendente.questoes) || [];
    const variantes = !!(l.conteudo_pendente && l.conteudo_pendente.tipo === 'variantes'); // versões novas de questões nossas
    const aberto = estado.abertos.has(l.id);
    const rel = l.resultado && l.resultado.relatorio;
    const travado = l.status === 'executando' && l.iniciado_em && Date.now() - new Date(l.iniciado_em).getTime() > 15 * 60 * 1000;
    const acoes = [];
    if (l.status === 'pendente') {
      acoes.push(h('button', { type: 'button', class: 'botao botao--primario', onclick: () => pedirSenha(l) }, icone('i-cadeado'), 'Aprovar e executar'));
    }
    if (l.status === 'aprovado') {
      acoes.push(h('button', { type: 'button', class: 'botao botao--primario', onclick: () => pedirSenha(l) }, icone('i-cadeado'), l.resultado ? 'Continuar execução' : 'Executar'));
    }
    if (['pendente', 'aprovado'].includes(l.status)) {
      acoes.push(h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => rejeitar(l) }, icone('i-x'), 'Rejeitar'));
    }
    if (travado) acoes.push(h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => destravar(l) }, 'Destravar'));
    if (l.resultado) acoes.push(h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => baixarResultado(l) }, icone('i-download'), 'Baixar resultado'));
    acoes.push(h('button', { type: 'button', class: 'botao--link', 'aria-expanded': String(aberto), onclick: () => { aberto ? estado.abertos.delete(l.id) : estado.abertos.add(l.id); desenharLista(); } },
      aberto ? 'Esconder questões' : `Ver as ${qs.length} questões`));

    return h('article', { class: `cartao fila-lote fila-lote--${l.status}`, 'aria-label': `Lote de ${nomeTrilha(l.trilha_id)}, ${st.nome}` },
      h('div', { class: 'fila-lote__topo' },
        h('div', {},
          h('h3', { class: 'fila-lote__titulo', text: `${nomeTrilha(l.trilha_id)} · ${l.materia}` }),
          h('p', { class: 'texto-suave', text: `${variantes ? UI.plural(l.quantidade_questoes, 'variante', 'variantes') + ' para a Revisão' : UI.plural(l.quantidade_questoes, 'questão', 'questões')}${l.conteudo_pendente && l.conteudo_pendente.fase ? ` · fase ${l.conteudo_pendente.fase}` : ''} · enviado em ${quando(l.criado_em)}` })),
        h('span', { class: `chip ${st.classe}`.trim(), text: st.nome })),
      h('dl', { class: 'fila-lote__custos' },
        h('div', { class: 'fila-lote__custo' }, h('dt', { text: 'Custo estimado' }), h('dd', { text: dolar(l.custo_estimado_usd) })),
        l.custo_real_usd !== null && l.custo_real_usd !== undefined ? h('div', {}, h('dt', { text: 'Custo real' }), h('dd', { text: dolar(l.custo_real_usd) })) : null,
        l.aprovado_em ? h('div', {}, h('dt', { text: 'Aprovado em' }), h('dd', { text: quando(l.aprovado_em) })) : null),
      l.erro ? h('p', { class: 'texto-erro', text: l.erro }) : null,
      rel ? h('p', { class: 'fila-lote__relatorio', text: `Aprovadas: ${rel.primeira.length + rel.corrigidas.length} · reprovadas: ${rel.reprovadas.length} · revisar_humano: ${rel.revisar_humano.length}${rel.erros.length ? ` · com erro: ${rel.erros.length}` : ''}` }) : null,
      l.status === 'concluido' ? h('p', { class: 'texto-suave fila-lote__dica' }, 'Para levar ao repositório (trilha + data/acervo): ', h('code', { text: `node scripts/fila.mjs baixar ${l.id}` })) : null,
      aberto ? h('ol', { class: 'fila-lote__questoes' }, qs.map((q) => {
        const r = l.resultado && l.resultado.por_questao && l.resultado.por_questao[q.id];
        const sit = !r ? '' : r.erro ? ' · erro' : r.pulada ? ` · pulada (${r.pulada})` : r.aprovada ? ' · aprovada' : r.revisar_humano ? ' · revisar_humano' : ' · reprovada';
        return h('li', {}, h('strong', { text: `${q.id}${q.varianteDe ? ` (variante de ${q.varianteDe})` : ''} · ${q.tema} · ${q.dificuldade}${sit}` }), h('span', { text: q.enunciado.length > 180 ? q.enunciado.slice(0, 180) + '…' : q.enunciado }));
      })) : null,
      h('div', { class: 'acoes-linha fila-lote__acoes' }, acoes));
  }

  /* ---------- Aprovar com senha ---------- */
  function pedirSenha(l) {
    let dialogo = document.getElementById('dialogo-fila-senha');
    if (!dialogo) {
      dialogo = h('dialog', { id: 'dialogo-fila-senha', class: 'dialogo dialogo--estreito', 'aria-labelledby': 'dialogo-fila-titulo' });
      window.addEventListener('hashchange', () => dialogo.open && dialogo.close());
      document.body.append(dialogo);
    }
    const senha = h('input', { class: 'campo', id: 'fila-senha', type: 'password', autocomplete: 'current-password', required: true });
    const msg = h('p', { class: 'texto-erro', 'aria-live': 'assertive' });
    const confirmar = h('button', { type: 'submit', class: 'botao botao--primario' }, icone('i-cadeado'), l.status === 'pendente' ? 'Aprovar e executar' : 'Executar');
    limpar(dialogo).append(h('form', { class: 'dialogo__caixa', onsubmit: async (e) => {
      e.preventDefault();
      if (!senha.value) return;
      confirmar.disabled = true;
      msg.textContent = '';
      try {
        await Nuvem.confirmarSenha(senha.value);
        senha.value = '';
        if (l.status === 'pendente') {
          await Nuvem.rpc('fila_aprovar', { p_id: l.id });
          l.status = 'aprovado'; // se a execução falhar, tentar de novo só executa (já está aprovado)
        }
        const r = await Nuvem.funcao('mergulho-triplo', { acao: 'executar', id: l.id });
        dialogo.close();
        UI.toast('Mergulho Triplo', (r && r.mensagem) || 'Validação em andamento.', 'i-ancora');
      } catch (erro) {
        senha.value = '';
        msg.textContent = erro.message;
        confirmar.disabled = false;
        senha.focus();
        return;
      } finally {
        carregar();
      }
    } },
    h('header', { class: 'dialogo__topo' },
      h('div', {}, h('span', { class: 'rotulo', text: 'Confirmação por senha' }), h('h2', { id: 'dialogo-fila-titulo', class: 'dialogo__titulo', text: l.status === 'pendente' ? 'Aprovar este lote?' : 'Executar este lote?' })),
      h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar', onclick: () => dialogo.close() }, icone('i-x'))),
    h('div', { class: 'dialogo__corpo' },
      h('p', {}, `${nomeTrilha(l.trilha_id)} · ${UI.plural(l.quantidade_questoes, 'questão', 'questões')}. As IAs pagas (Gemini com busca e OpenAI) vão validar ${l.resultado ? 'o que faltou deste lote' : 'este lote'}.`),
      h('p', { class: 'fila-senha__custo' }, 'Custo estimado: ', h('strong', { text: dolar(l.custo_estimado_usd) })),
      h('label', { for: 'fila-senha', class: 'rotulo-campo', text: `Sua senha (${(Nuvem.usuario() || {}).email || 'admin'})` }),
      senha,
      h('p', { class: 'texto-suave', text: 'A confirmação vale por 5 minutos e não fica guardada.' }),
      msg),
    h('footer', { class: 'dialogo__rodape' },
      h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => dialogo.close() }, 'Cancelar'),
      confirmar)));
    dialogo.showModal();
    senha.focus();
  }

  async function rejeitar(l) {
    if (!window.confirm(`Rejeitar o lote de ${nomeTrilha(l.trilha_id)} (${UI.plural(l.quantidade_questoes, 'questão', 'questões')})? Nada será validado nem cobrado.`)) return;
    try {
      await Nuvem.rpc('fila_rejeitar', { p_id: l.id });
      UI.toast('Lote rejeitado', 'Nenhuma IA foi chamada.', 'i-x');
    } catch (e) {
      UI.toast('Não deu para rejeitar', e.message, 'i-x');
    }
    carregar();
  }

  async function destravar(l) {
    try {
      await Nuvem.rpc('fila_destravar', { p_id: l.id });
      UI.toast('Lote destravado', 'O que já foi validado ficou salvo. Execute de novo para continuar.', 'i-revisao');
    } catch (e) {
      UI.toast('Não deu para destravar', e.message, 'i-x');
    }
    carregar();
  }

  /** Resultado em JSON (o "fila.mjs baixar" faz o mesmo e já aplica na trilha e no acervo). */
  function baixarResultado(l) {
    const blob = new Blob([JSON.stringify({ id: l.id, trilha_id: l.trilha_id, materia: l.materia, status: l.status, resultado: l.resultado }, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `mergulho-triplo-${l.materia}-${l.id.slice(0, 8)}.json` });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  return { render };
})();

/*
 * admin.js — área "Admin" (só aparece para quem tem perfis.admin = true).
 *  - Cadastrar pessoa: nome completo, e-mail e cursos -> gera senha temporária
 *  - Lista de pessoas: cursos atribuídos, nova senha temporária, ativar/desativar, progresso
 * Tudo passa pelas funções seguras do banco (supabase/setup.sql); o navegador nunca
 * tem poder de admin sozinho.
 */
const Admin = (() => {
  const { h, icone, limpar } = UI;
  const estado = { busca: '', pessoas: [], abertos: new Set() };

  function nomeTrilha(id) {
    const t = App.trilhas().find((x) => x.id === id);
    return t ? t.nome : `${id} (não encontrado)`;
  }

  /** Mensagem pronta para mandar à pessoa (WhatsApp, e-mail...). */
  function mensagemAcesso(nome, email, senha) {
    const site = location.href.split('#')[0];
    return `Olá, ${nome.split(' ')[0]}! Seu acesso ao Diver está pronto.\n\nSite: ${site}\nE-mail: ${email}\nSenha temporária: ${senha}\n\nNo primeiro acesso você vai criar a sua própria senha. Bora mergulhar!`;
  }

  async function copiar(texto, botao) {
    try {
      await navigator.clipboard.writeText(texto);
      const antes = botao.textContent;
      botao.textContent = 'Copiado!';
      setTimeout(() => (botao.textContent = antes), 1800);
    } catch (e) {
      UI.toast('Não deu para copiar', 'Selecione o texto e copie manualmente.', 'i-x');
    }
  }

  function cartaoSenha(nome, email, senha, titulo) {
    const texto = mensagemAcesso(nome, email, senha);
    const botao = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: (e) => copiar(texto, e.currentTarget) }, 'Copiar mensagem');
    return h('div', { class: 'senha-temp', role: 'status' },
      h('p', { class: 'senha-temp__titulo' }, icone('i-check'), titulo),
      h('p', {}, 'Senha temporária de ', h('strong', { text: nome }), ':'),
      h('code', { class: 'senha-temp__codigo', text: senha }),
      h('p', { class: 'texto-suave', text: 'Ela só aparece agora. A pessoa cria a própria senha no primeiro acesso.' }),
      h('textarea', { class: 'campo campo--area senha-temp__mensagem', readonly: true, rows: '7', 'aria-label': 'Mensagem para enviar', value: texto }),
      botao);
  }

  function checksCursos(selecionados = [], nomeGrupo) {
    return h('div', { class: 'checks' }, App.trilhas().map((t) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', value: t.id, name: nomeGrupo, checked: selecionados.includes(t.id) }), t.nome)));
  }

  /* ---------- Resumo do progresso de uma pessoa (a partir da tabela "estado") ---------- */
  async function progressoDe(pessoa, alvo) {
    alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'Carregando progresso…' }));
    try {
      const linhas = await Nuvem.rest('GET', `estado?usuario_id=eq.${encodeURIComponent(pessoa.id)}&chave=like.${encodeURIComponent('diver:v1:trilha:*')}&select=chave,valor,atualizado_em`);
      const porTrilha = new Map((linhas || []).map((l) => [l.chave.replace('diver:v1:trilha:', ''), l]));
      const cursos = [...new Set([...pessoa.cursos, ...porTrilha.keys()])];
      if (!cursos.length) return alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'Nenhum curso atribuído ainda.' }));
      alvo.replaceChildren(h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela tabela--compacta' },
        h('thead', {}, h('tr', {}, ['Curso', 'Nível', 'Fases', 'Acertos', 'Melhor simulado', 'Prova final', 'Última atividade'].map((c) => h('th', { scope: 'col', text: c })))),
        h('tbody', {}, cursos.map((tid) => {
          const linha = porTrilha.get(tid);
          const trilha = App.trilhas().find((t) => t.id === tid);
          if (!linha) return h('tr', {}, h('th', { scope: 'row', text: nomeTrilha(tid) }), h('td', { colspan: '6', class: 'texto-suave', text: 'Ainda não começou.' }));
          const p = linha.valor || {};
          const stats = p.stats || {};
          const fases = trilha ? trilha.fases.filter((f) => p.fases && p.fases[f.id] && p.fases[f.id].concluida).length : Object.values(p.fases || {}).filter((f) => f.concluida).length;
          const melhorSim = (p.simulados || []).reduce((m, s) => Math.max(m, s.nota), -1);
          const provas = p.provas || [];
          const aprovado = provas.find((x) => x.aprovado);
          const melhorProva = provas.reduce((m, s) => Math.max(m, s.nota), -1);
          const nivel = Progresso.nivel(p.xp || 0);
          return h('tr', {},
            h('th', { scope: 'row', text: nomeTrilha(tid) }),
            h('td', { text: `${nivel.numero} · ${p.xp || 0} XP` }),
            h('td', { text: trilha ? `${fases}/${trilha.fases.length}` : String(fases) }),
            h('td', { text: stats.respondidas ? `${Math.round((stats.acertos / stats.respondidas) * 100)}% de ${stats.respondidas}` : '—' }),
            h('td', { text: melhorSim >= 0 ? melhorSim.toLocaleString('pt-BR') : '—' }),
            h('td', { class: aprovado ? 'texto-sucesso' : '', text: aprovado ? `Aprovado (${aprovado.nota.toLocaleString('pt-BR')})` : melhorProva >= 0 ? `Não aprovado (${melhorProva.toLocaleString('pt-BR')})` : '—' }),
            h('td', { text: (p.streak && p.streak.ultimoDia) ? UI.formatarData(p.streak.ultimoDia, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(linha.atualizado_em).toLocaleDateString('pt-BR') }));
        })))));
    } catch (erro) {
      alvo.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
    }
  }

  /* ---------- Tela ---------- */
  async function render(secao) {
    limpar(secao);
    const lista = h('div', { class: 'pessoas', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Carregando pessoas…' }));
    const busca = h('input', { class: 'campo', type: 'search', placeholder: 'Buscar por nome ou e-mail…', value: estado.busca, 'aria-label': 'Buscar pessoas',
      oninput: (e) => { estado.busca = e.target.value; desenharLista(); } });

    secao.append(
      UI.cabecalho('Admin', 'Alunos e cursos', 'Cadastre quem vai estudar, escolha os cursos de cada pessoa e acompanhe o progresso.'),
      formCadastro(),
      h('div', { class: 'acoes-linha' }, h('h2', { class: 'secao-titulo secao-titulo--linha', text: 'Pessoas' }), busca),
      lista);

    async function carregar() {
      try {
        const dados = await Nuvem.rest('GET', 'perfis?select=id,email,nome,admin,trocar_senha,ativo,criado_em,matriculas(trilha_id)&order=nome.asc');
        estado.pessoas = (dados || []).map((p) => ({ ...p, cursos: (p.matriculas || []).map((m) => m.trilha_id) }));
        desenharLista();
      } catch (erro) {
        lista.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
      }
    }

    function formCadastro() {
      const nome = h('input', { class: 'campo', id: 'admin-nome', required: true, maxlength: '120', autocomplete: 'off', placeholder: 'Ex.: Maria da Silva Souza' });
      const email = h('input', { class: 'campo', id: 'admin-email', type: 'email', required: true, autocomplete: 'off', placeholder: 'maria@empresa.com' });
      const cursos = checksCursos([], 'novo-cursos');
      const resultado = h('div', { 'aria-live': 'polite' });
      const botao = h('button', { type: 'submit', class: 'botao botao--primario' }, icone('i-mais'), 'Cadastrar e gerar senha');
      return h('form', { class: 'cartao form-admin', onsubmit: async (e) => {
        e.preventDefault();
        const escolhidos = [...cursos.querySelectorAll('input:checked')].map((i) => i.value);
        if (!nome.value.trim() || !email.value.trim()) {
          resultado.replaceChildren(h('p', { class: 'texto-erro', text: 'Preencha nome completo e e-mail.' }));
          return;
        }
        botao.disabled = true;
        resultado.replaceChildren(h('p', { class: 'texto-suave', text: 'Cadastrando…' }));
        try {
          const senha = await Nuvem.rpc('admin_criar_usuario', { p_email: email.value.trim(), p_nome: nome.value.trim(), p_trilhas: escolhidos });
          resultado.replaceChildren(cartaoSenha(nome.value.trim(), email.value.trim().toLowerCase(), senha, 'Pessoa cadastrada!'));
          nome.value = '';
          email.value = '';
          cursos.querySelectorAll('input').forEach((i) => (i.checked = false));
          carregar();
        } catch (erro) {
          resultado.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
        } finally {
          botao.disabled = false;
        }
      } },
      h('h2', { class: 'cartao__titulo', text: 'Cadastrar pessoa' }),
      h('div', { class: 'form-evento__linha' },
        h('div', { class: 'form-linha__grande' }, h('label', { for: 'admin-nome', class: 'rotulo-campo', text: 'Nome completo' }), nome),
        h('div', {}, h('label', { for: 'admin-email', class: 'rotulo-campo', text: 'E-mail' }), email)),
      h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Cursos' }), cursos),
      botao, resultado);
    }

    function desenharLista() {
      const termo = UI.normalizar(estado.busca);
      const filtradas = estado.pessoas.filter((p) => !termo || UI.normalizar(`${p.nome} ${p.email}`).includes(termo));
      limpar(lista);
      if (!estado.pessoas.length) return lista.append(UI.vazio('Ninguém cadastrado ainda. Use o formulário acima.'));
      lista.append(h('p', { class: 'texto-suave', text: `${UI.plural(filtradas.length, 'pessoa', 'pessoas')}${termo ? ' encontradas' : ''} · ${estado.pessoas.filter((p) => p.ativo).length} com acesso ativo` }));
      filtradas.forEach((p) => lista.append(cartaoPessoa(p)));
    }

    function cartaoPessoa(p) {
      const eu = p.id === Nuvem.usuario().id;
      const cursos = checksCursos(p.cursos, `cursos-${p.id}`);
      const areaProgresso = h('div', { class: 'pessoa__progresso', hidden: !estado.abertos.has(p.id) });
      const areaSenha = h('div', { 'aria-live': 'polite' });
      if (estado.abertos.has(p.id)) progressoDe(p, areaProgresso);

      cursos.addEventListener('change', async () => {
        const escolhidos = [...cursos.querySelectorAll('input:checked')].map((i) => i.value);
        try {
          await Nuvem.rpc('admin_definir_matriculas', { p_usuario: p.id, p_trilhas: escolhidos });
          p.cursos = escolhidos;
          UI.toast('Cursos atualizados', `${p.nome}: ${escolhidos.length ? escolhidos.map(nomeTrilha).join(', ') : 'nenhum curso'}`, 'i-livro');
        } catch (erro) {
          UI.toast('Não deu certo', erro.message, 'i-x');
          carregar();
        }
      });

      return h('article', { class: `cartao pessoa ${p.ativo ? '' : 'pessoa--inativa'}` },
        h('div', { class: 'pessoa__cabeca' },
          h('span', { class: 'pessoa__avatar', 'aria-hidden': 'true', text: p.nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() }),
          h('div', { class: 'pessoa__info' },
            h('h3', { class: 'pessoa__nome', text: p.nome }),
            h('span', { class: 'texto-suave pessoa__email', text: p.email })),
          h('div', { class: 'pessoa__chips' },
            p.admin ? h('span', { class: 'chip chip--aviso', text: 'Admin' }) : null,
            !p.ativo ? h('span', { class: 'chip chip--atrasada', text: 'Acesso desativado' }) : p.trocar_senha ? h('span', { class: 'chip', text: 'Aguardando primeiro acesso' }) : h('span', { class: 'chip chip--prioridade-baixa', text: 'Ativo' }))),
        h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Cursos atribuídos (salva ao marcar)' }), cursos),
        h('div', { class: 'pessoa__acoes' },
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-expanded': String(estado.abertos.has(p.id)), onclick: (e) => {
            const abrir = areaProgresso.hidden;
            areaProgresso.hidden = !abrir;
            e.currentTarget.setAttribute('aria-expanded', String(abrir));
            if (abrir) {
              estado.abertos.add(p.id);
              progressoDe(p, areaProgresso);
            } else estado.abertos.delete(p.id);
          } }, icone('i-estrela'), 'Progresso'),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: async () => {
            if (!window.confirm(`Gerar uma nova senha temporária para ${p.nome}? A senha atual deixa de funcionar.`)) return;
            try {
              const senha = await Nuvem.rpc('admin_redefinir_senha', { p_usuario: p.id });
              p.trocar_senha = true;
              areaSenha.replaceChildren(cartaoSenha(p.nome, p.email, senha, 'Nova senha temporária gerada!'));
            } catch (erro) {
              UI.toast('Não deu certo', erro.message, 'i-x');
            }
          } }, icone('i-revisao'), 'Nova senha temporária'),
          h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: async () => {
            const novo = window.prompt('Nome completo:', p.nome);
            if (novo === null || !novo.trim() || novo.trim() === p.nome) return;
            try {
              await Nuvem.rpc('admin_atualizar_usuario', { p_usuario: p.id, p_nome: novo.trim(), p_ativo: p.ativo });
              carregar();
            } catch (erro) {
              UI.toast('Não deu certo', erro.message, 'i-x');
            }
          } }, 'Editar nome'),
          eu ? null : h('button', { type: 'button', class: `botao botao--pequeno ${p.ativo ? 'botao--erro' : 'botao--secundario'}`, onclick: async () => {
            const acao = p.ativo ? 'desativar' : 'reativar';
            if (!window.confirm(`Quer ${acao} o acesso de ${p.nome}? ${p.ativo ? 'O progresso fica guardado.' : ''}`)) return;
            try {
              await Nuvem.rpc('admin_atualizar_usuario', { p_usuario: p.id, p_nome: p.nome, p_ativo: !p.ativo });
              UI.toast(p.ativo ? 'Acesso desativado' : 'Acesso reativado', p.nome, 'i-usuario');
              carregar();
            } catch (erro) {
              UI.toast('Não deu certo', erro.message, 'i-x');
            }
          } }, p.ativo ? 'Desativar acesso' : 'Reativar acesso')),
        areaSenha, areaProgresso);
    }

    carregar();
  }

  return { render };
})();

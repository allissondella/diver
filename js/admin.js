/*
 * admin.js — área da equipe.
 *  - Admin ("Pessoas e cursos"): cadastra aluno, professor ou admin (gera senha temporária),
 *    atribui cursos, muda o tipo de conta, gera nova senha, ativa/desativa e vê o progresso.
 *  - Professor ("Meus alunos"): só acompanha os alunos dos cursos dele e o progresso nesses cursos.
 * Tudo passa pelas funções e regras seguras do banco (supabase/setup.sql); o navegador nunca
 * tem poder de admin sozinho: quem decide o que cada um vê é o banco.
 */
const Admin = (() => {
  const { h, icone, limpar } = UI;
  const estado = { busca: '', filtroPapel: '', pessoas: [], abertos: new Set() };

  const PAPEIS = {
    aluno: { nome: 'Aluno', plural: 'Alunos', dica: 'Estuda os cursos marcados abaixo.' },
    professor: { nome: 'Professor', plural: 'Professores', dica: 'Estuda os cursos marcados e acompanha o progresso dos alunos desses cursos (sem editar nada).' },
    admin: { nome: 'Admin', plural: 'Admins', dica: 'Vê todos os cursos e gerencia pessoas, cursos e senhas. Dê só para quem é de confiança.' },
  };
  const papelDe = (p) => p.papel || (p.admin ? 'admin' : 'aluno');

  function nomeTrilha(id) {
    const t = App.trilhas().find((x) => x.id === id);
    return t ? t.nome : `${id} (não encontrado)`;
  }

  /** Mensagem pronta para mandar à pessoa (WhatsApp, e-mail...). */
  function mensagemAcesso(nome, email, senha, papel = 'aluno') {
    const site = location.href.split('#')[0];
    const como = papel === 'aluno' ? '' : ` (como ${PAPEIS[papel].nome.toLowerCase()})`;
    return `Olá, ${nome.split(' ')[0]}! Seu acesso ao Diver${como} está pronto.\n\nSite: ${site}\nE-mail: ${email}\nSenha temporária: ${senha}\n\nNo primeiro acesso você vai criar a sua própria senha. Bora mergulhar!`;
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

  function cartaoSenha(nome, email, senha, titulo, papel) {
    const texto = mensagemAcesso(nome, email, senha, papel);
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
      let cursos = [...new Set([...pessoa.cursos, ...porTrilha.keys()])];
      if (!Nuvem.ehAdmin()) cursos = cursos.filter((c) => Nuvem.matriculas().includes(c));
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
    const ehAdmin = Nuvem.ehAdmin();
    const lista = h('div', { class: 'pessoas', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Carregando pessoas…' }));
    const busca = h('input', { class: 'campo', type: 'search', placeholder: 'Buscar por nome ou e-mail…', value: estado.busca, 'aria-label': 'Buscar pessoas',
      oninput: (e) => { estado.busca = e.target.value; desenharLista(); } });
    const filtros = h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Filtrar por tipo de conta' },
      [['', 'Todos'], ...Object.entries(PAPEIS).map(([k, v]) => [k, v.plural])].map(([k, nome]) => h('button', {
        type: 'button', 'aria-pressed': String(estado.filtroPapel === k), text: nome,
        onclick: (e) => {
          estado.filtroPapel = k;
          filtros.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
          desenharLista();
        },
      })));

    secao.append(...[
      ehAdmin
        ? UI.cabecalho('Admin', 'Pessoas e cursos', 'Cadastre alunos, professores e admins, escolha os cursos de cada pessoa e acompanhe o progresso.')
        : UI.cabecalho('Professor', 'Meus alunos', 'Os alunos dos seus cursos e o progresso de cada um. Para cadastrar ou mudar cursos, fale com o admin.'),
      ehAdmin ? formCadastro() : null,
      h('div', { class: 'acoes-linha' }, h('h2', { class: 'secao-titulo secao-titulo--linha', text: ehAdmin ? 'Pessoas' : 'Alunos' }), busca),
      ehAdmin ? filtros : null,
      lista].filter(Boolean));

    async function carregar() {
      try {
        const dados = await Nuvem.rest('GET', 'perfis?select=id,email,nome,admin,papel,trocar_senha,ativo,criado_em,matriculas(trilha_id)&order=nome.asc');
        estado.pessoas = (dados || []).map((p) => ({ ...p, papel: papelDe(p), cursos: (p.matriculas || []).map((m) => m.trilha_id) }))
          .filter((p) => ehAdmin || (p.id !== Nuvem.usuario().id && p.papel === 'aluno')); // professor: só os alunos
        desenharLista();
      } catch (erro) {
        lista.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
      }
    }

    function formCadastro() {
      const nome = h('input', { class: 'campo', id: 'admin-nome', required: true, maxlength: '120', autocomplete: 'off', placeholder: 'Ex.: Maria da Silva Souza' });
      const email = h('input', { class: 'campo', id: 'admin-email', type: 'email', required: true, autocomplete: 'off', placeholder: 'maria@empresa.com' });
      const cursos = checksCursos([], 'novo-cursos');
      const grupoCursos = h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Cursos' }), cursos);
      const dicaPapel = h('p', { class: 'texto-suave form-admin__dica', text: PAPEIS.aluno.dica });
      let papel = 'aluno';
      const seletorPapel = h('div', { class: 'segmentado', role: 'radiogroup', 'aria-label': 'Tipo de conta' },
        Object.entries(PAPEIS).map(([k, v]) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(k === papel), 'aria-pressed': String(k === papel), text: v.nome,
          onclick: (e) => {
            papel = k;
            seletorPapel.querySelectorAll('button').forEach((b) => {
              b.setAttribute('aria-checked', String(b === e.currentTarget));
              b.setAttribute('aria-pressed', String(b === e.currentTarget));
            });
            dicaPapel.textContent = v.dica;
            grupoCursos.hidden = k === 'admin'; // admin já vê todos os cursos
          },
        })));
      const resultado = h('div', { 'aria-live': 'polite' });
      const botao = h('button', { type: 'submit', class: 'botao botao--primario' }, icone('i-mais'), 'Cadastrar e gerar senha');
      return h('form', { class: 'cartao form-admin', onsubmit: async (e) => {
        e.preventDefault();
        const escolhidos = papel === 'admin' ? [] : [...cursos.querySelectorAll('input:checked')].map((i) => i.value);
        if (!nome.value.trim() || !email.value.trim()) {
          resultado.replaceChildren(h('p', { class: 'texto-erro', text: 'Preencha nome completo e e-mail.' }));
          return;
        }
        if (papel === 'admin' && !window.confirm(`Criar uma conta de ADMIN para ${nome.value.trim()}? Admin pode cadastrar pessoas, mudar cursos e gerar senhas.`)) return;
        botao.disabled = true;
        resultado.replaceChildren(h('p', { class: 'texto-suave', text: 'Cadastrando…' }));
        try {
          const senha = await Nuvem.rpc('admin_criar_usuario', { p_email: email.value.trim(), p_nome: nome.value.trim(), p_trilhas: escolhidos, p_papel: papel });
          resultado.replaceChildren(cartaoSenha(nome.value.trim(), email.value.trim().toLowerCase(), senha, `${PAPEIS[papel].nome} cadastrado!`, papel));
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
      h('div', { class: 'form-admin__papel' }, h('span', { class: 'rotulo-campo', text: 'Tipo de conta' }), seletorPapel, dicaPapel),
      h('div', { class: 'form-evento__linha' },
        h('div', { class: 'form-linha__grande' }, h('label', { for: 'admin-nome', class: 'rotulo-campo', text: 'Nome completo' }), nome),
        h('div', {}, h('label', { for: 'admin-email', class: 'rotulo-campo', text: 'E-mail' }), email)),
      grupoCursos,
      botao, resultado);
    }

    function desenharLista() {
      const termo = UI.normalizar(estado.busca);
      const filtradas = estado.pessoas.filter((p) => (!termo || UI.normalizar(`${p.nome} ${p.email}`).includes(termo)) && (!ehAdmin || !estado.filtroPapel || p.papel === estado.filtroPapel));
      limpar(lista);
      if (!estado.pessoas.length) {
        return lista.append(UI.vazio(ehAdmin ? 'Ninguém cadastrado ainda. Use o formulário acima.' : 'Nenhum aluno nos seus cursos ainda. Quando o admin matricular alguém, aparece aqui.'));
      }
      const contagem = ehAdmin
        ? Object.entries(PAPEIS).map(([k, v]) => `${estado.pessoas.filter((p) => p.papel === k).length} ${v.plural.toLowerCase()}`).join(' · ')
        : `${estado.pessoas.filter((p) => p.ativo).length} com acesso ativo`;
      lista.append(h('p', { class: 'texto-suave', text: `${UI.plural(filtradas.length, ehAdmin ? 'pessoa' : 'aluno', ehAdmin ? 'pessoas' : 'alunos')}${termo || estado.filtroPapel ? ' neste filtro' : ''} · ${contagem}` }));
      filtradas.forEach((p) => lista.append(cartaoPessoa(p)));
    }

    /** Professor: cartão só de leitura (cursos em comum + progresso). */
    function cartaoAluno(p) {
      const areaProgresso = h('div', { class: 'pessoa__progresso', hidden: !estado.abertos.has(p.id) });
      if (estado.abertos.has(p.id)) progressoDe(p, areaProgresso);
      const meus = p.cursos.filter((c) => Nuvem.matriculas().includes(c));
      return h('article', { class: `cartao pessoa ${p.ativo ? '' : 'pessoa--inativa'}` },
        h('div', { class: 'pessoa__cabeca' },
          h('span', { class: 'pessoa__avatar', 'aria-hidden': 'true', text: p.nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() }),
          h('div', { class: 'pessoa__info' },
            h('h3', { class: 'pessoa__nome', text: p.nome }),
            h('span', { class: 'texto-suave pessoa__email', text: p.email })),
          h('div', { class: 'pessoa__chips' },
            !p.ativo ? h('span', { class: 'chip chip--atrasada', text: 'Acesso desativado' }) : p.trocar_senha ? h('span', { class: 'chip', text: 'Aguardando primeiro acesso' }) : null)),
        h('div', { class: 'pessoa__chips' }, meus.map((c) => h('span', { class: 'chip', text: nomeTrilha(c) }))),
        h('div', { class: 'pessoa__acoes' },
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-expanded': String(estado.abertos.has(p.id)), onclick: (e) => {
            const abrir = areaProgresso.hidden;
            areaProgresso.hidden = !abrir;
            e.currentTarget.setAttribute('aria-expanded', String(abrir));
            if (abrir) {
              estado.abertos.add(p.id);
              progressoDe(p, areaProgresso);
            } else estado.abertos.delete(p.id);
          } }, icone('i-estrela'), 'Progresso')),
        areaProgresso);
    }

    function cartaoPessoa(p) {
      if (!ehAdmin) return cartaoAluno(p);
      const eu = p.id === Nuvem.usuario().id;
      const seletorPapel = h('select', { class: 'pessoa__papel', 'aria-label': `Tipo de conta de ${p.nome}`, disabled: eu, title: eu ? 'Você não pode mudar o seu próprio tipo de conta' : null,
        onchange: async (e) => {
          const novo = e.target.value;
          if (novo === 'admin' && !window.confirm(`Dar acesso de ADMIN para ${p.nome}? Admin pode cadastrar pessoas, mudar cursos e gerar senhas.`)) {
            e.target.value = p.papel;
            return;
          }
          try {
            await Nuvem.rpc('admin_definir_papel', { p_usuario: p.id, p_papel: novo });
            UI.toast('Tipo de conta alterado', `${p.nome} agora é ${PAPEIS[novo].nome.toLowerCase()}.`, 'i-usuario');
            carregar();
          } catch (erro) {
            e.target.value = p.papel;
            UI.toast('Não deu certo', erro.message, 'i-x');
          }
        } },
      Object.entries(PAPEIS).map(([k, v]) => h('option', { value: k, selected: k === p.papel, text: v.nome })));
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
            p.papel === 'admin' ? h('span', { class: 'chip chip--aviso', text: 'Admin' }) : p.papel === 'professor' ? h('span', { class: 'chip chip--papel', text: 'Professor' }) : null,
            !p.ativo ? h('span', { class: 'chip chip--atrasada', text: 'Acesso desativado' }) : p.trocar_senha ? h('span', { class: 'chip', text: 'Aguardando primeiro acesso' }) : h('span', { class: 'chip chip--ativo', text: 'Ativo' }))),
        h('label', { class: 'pessoa__linha-papel' }, h('span', { class: 'rotulo-campo', text: 'Tipo de conta' }), seletorPapel),
        p.papel === 'admin'
          ? h('p', { class: 'texto-suave', text: 'Admin vê todos os cursos.' })
          : h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Cursos atribuídos (salva ao marcar)' }), cursos),
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
              areaSenha.replaceChildren(cartaoSenha(p.nome, p.email, senha, 'Nova senha temporária gerada!', p.papel));
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

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
    if (ehPacote(id)) { const sala = salaDoPacote(id); return sala ? sala.nome : PACOTES_ANTIGOS[id] || id.replace('pacote:', ''); }
    const t = App.trilhas().find((x) => x.id === id);
    return t ? t.nome : `${id} (não encontrado)`;
  }

  /*
   * Salas na matrícula (2026-10-12): o admin marca a sala inteira (Mergulho no Enem e Vestibular, Radiologia, Tecnologia;
   * na Tecnologia também curso a curso, porque são produtos diferentes), igual ao que o aluno vê. A matrícula guarda os cursos da sala e um marcador
   * "pacote:<id da sala>" (o "pacote:enem" de 2026-10-09 continua valendo); "Atualizar pacotes" acrescenta os
   * cursos publicados depois. Não muda o banco: a coluna trilha_id aceita texto, e Nuvem.matriculas() ignora os marcadores.
   */
  // Marcadores das salas de um curso só que viraram a sala Tecnologia (2026-10-13): continuam valendo como "só aquele curso"
  // e o "Atualizar salas" não dá a eles os cursos novos da sala (só quem tem pacote:tecnologia recebe).
  const PACOTES_ANTIGOS = { 'pacote:iso': 'ISO/IEC 27001:2022 Foundation', 'pacote:ciber': 'Cibersegurança Essencial' };
  const ehPacote = (id) => typeof id === 'string' && id.startsWith('pacote:');
  const salasDoCatalogo = () => Grupos.salas(App.trilhas().filter((t) => !Trilhas.ehImportada(t.id)));
  const salaDoPacote = (id) => salasDoCatalogo().find((s) => `pacote:${s.id}` === id) || null;
  const cursosDoPacote = (id) => { const sala = salaDoPacote(id); return sala ? sala.trilhas.map((t) => t.id) : []; };
  /** As salas de uma lista de matrículas (para os chips): pela sala de cada curso e pelos marcadores. */
  function salasDe(cursos) {
    return salasDoCatalogo().filter((s) => cursos.includes(`pacote:${s.id}`) || s.trilhas.some((t) => cursos.includes(t.id)));
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

  /**
   * As salas para marcar na matrícula (redesenhado em 2026-10-14, pedido do usuário): um cartão por sala, em grade,
   * com ícone, nome, quantos cursos e o estado ("Sala inteira", "1 de 3 cursos", "Sem acesso"). Clicar no cartão
   * marca ou tira a sala inteira. Na sala de produtos diferentes (Tecnologia, porCurso) o botão "Escolher cursos"
   * abre uma caixa com a sala inteira no topo e os cursos por área; nas outras, "Ver as matérias" mostra o que entra.
   * Embaixo, o resumo do que a pessoa vai estudar. Sala com parte dos cursos (matrícula antiga) aparece "pela metade"
   * e fica como está até o admin mexer nela.
   * O elemento devolvido tem .escolhidos() (a lista de matrículas a gravar: cursos + marcadores), .limpar() e
   * dispara "change" a cada mudança (o cartão da pessoa salva ao mudar).
   */
  function checksCursos(selecionados = [], nomeGrupo) {
    const salas = salasDoCatalogo();
    const conhecidos = new Set(salas.flatMap((s) => [`pacote:${s.id}`, ...s.trilhas.map((t) => t.id)]));
    const caixa = h('div', { class: 'salas-escolha' });
    const avisar = () => caixa.dispatchEvent(new Event('change', { bubbles: true }));
    const resumo = h('div', { class: 'salas-escolha__resumo', 'aria-live': 'polite' });

    const linhas = salas.map((sala) => {
      const ids = sala.trilhas.map((t) => t.id);
      const tem = ids.filter((id) => selecionados.includes(id));
      const st = {
        inteira: selecionados.includes(`pacote:${sala.id}`) || (!sala.porCurso && tem.length === ids.length && ids.length > 0),
        cursos: new Set(tem), // só na sala porCurso
        legado: false, // matrícula antiga com parte da sala (salas inteiras): fica como está até mexer
      };
      st.legado = !st.inteira && !sala.porCurso && tem.length > 0;
      const porCurso = sala.porCurso && ids.length > 1;
      const unidade = (n) => (n === 1 ? sala.unidade[0] : sala.unidade[1]);
      const nomeCurto = (t) => Grupos.nomeCurto(sala, t);

      const entrada = h('input', { type: 'checkbox', class: 'visualmente-oculto', value: `pacote:${sala.id}`, name: nomeGrupo });
      const estadoTxt = h('span', { class: 'sala-escolha__estado' });
      const escolhidosTxt = h('span', { class: 'sala-escolha__cursos' });
      const cartao = h('div', { class: `sala-escolha sala--${sala.cor}` },
        h('label', { class: 'sala-escolha__alvo' },
          entrada,
          h('span', { class: 'sala-escolha__topo' },
            h('span', { class: 'sala-escolha__icone', 'aria-hidden': 'true' }, icone(sala.icone)),
            h('span', { class: 'sala-escolha__marca', 'aria-hidden': 'true' }, icone('i-check', 'sala-escolha__v'), h('span', { class: 'sala-escolha__traco' }))),
          h('strong', { class: 'sala-escolha__nome', text: sala.nome }),
          h('span', { class: 'sala-escolha__conta', text: sala.unica ? sala.unica.nome : `${ids.length} ${unidade(ids.length)}` }),
          estadoTxt, escolhidosTxt),
        sala.unica ? null : h('button', { type: 'button', class: 'sala-escolha__abrir', onclick: () => abrirCaixa() },
          porCurso ? 'Escolher cursos' : `Ver ${ids.length === 1 ? `a ${sala.unidade[0]}` : `as ${ids.length} ${sala.unidade[1]}`}`, icone('i-seta-dir')));

      function desenhar() {
        const n = porCurso ? st.cursos.size : 0;
        const estado = st.inteira ? 'inteira' : (porCurso ? n > 0 : st.legado) ? 'parte' : 'nada';
        cartao.dataset.estado = estado;
        entrada.checked = st.inteira;
        entrada.indeterminate = estado === 'parte';
        estadoTxt.textContent = st.inteira
          ? (porCurso ? 'Sala inteira, com os cursos novos' : 'Sala inteira')
          : estado === 'parte'
            ? (porCurso ? `${n} de ${ids.length} ${unidade(ids.length)}` : `${tem.length} de ${ids.length} ${unidade(ids.length)} (matrícula antiga)`)
            : 'Sem acesso';
        const nomes = porCurso && !st.inteira ? sala.trilhas.filter((t) => st.cursos.has(t.id)).map((t) => t.nome) : [];
        escolhidosTxt.textContent = nomes.join(' · ');
        escolhidosTxt.hidden = !nomes.length;
        cartao.querySelector('.sala-escolha__alvo').title = st.inteira ? 'Clique para tirar a sala' : 'Clique para dar a sala inteira';
      }

      entrada.addEventListener('change', () => {
        st.inteira = entrada.checked;
        st.legado = false;
        st.cursos = new Set(st.inteira ? ids : []);
        desenhar();
        desenharResumo();
        // o "change" do quadradinho sobe sozinho até a caixa (o cartão da pessoa salva)
      });

      /** A caixinha: escolher os cursos (Tecnologia) ou só ver o que entra na sala. */
      function abrirCaixa() {
        const antes = document.activeElement;
        const marcarTudo = porCurso ? h('input', { type: 'checkbox', checked: st.inteira }) : null;
        const marcas = new Map();
        const areas = [...(sala.destaque ? [{ area: { nome: sala.destaqueSelo || 'Comece por aqui', cor: 'amarelo', icone: 'i-estrela' }, trilhas: [sala.destaque] }] : []), ...sala.areas];
        const grupos = areas.map(({ area, trilhas }) => h('section', { class: `caixa-cursos__area sala--${area.cor || sala.cor}` },
          area.nome ? h('h3', { class: 'caixa-cursos__area-nome' }, area.icone ? icone(area.icone) : null, area.nome) : null,
          h('ul', { class: 'caixa-cursos__lista' }, trilhas.map((t) => {
            if (!porCurso) return h('li', { class: 'caixa-cursos__item caixa-cursos__item--leitura' }, icone('i-livro'), h('span', { text: nomeCurto(t) }));
            const c = h('input', { type: 'checkbox', checked: st.inteira || st.cursos.has(t.id) });
            c.addEventListener('change', () => { if (!c.checked) marcarTudo.checked = false; });
            marcas.set(t.id, c);
            return h('li', {}, h('label', { class: 'caixa-cursos__item' }, c, h('span', { text: nomeCurto(t) })));
          }))));
        if (marcarTudo) marcarTudo.addEventListener('change', () => marcas.forEach((c) => { c.checked = marcarTudo.checked; }));
        const titulo = porCurso ? `Cursos da sala ${sala.nome}` : `O que entra na sala ${sala.nome}`;
        const dialogo = h('dialog', { class: 'dialogo dialogo--cursos', 'aria-labelledby': 'caixa-cursos-titulo' },
          h('form', { method: 'dialog', class: 'caixa-cursos' },
            h('header', { class: `caixa-cursos__cabeca sala--${sala.cor}` },
              h('span', { class: 'sala-escolha__icone', 'aria-hidden': 'true' }, icone(sala.icone)),
              h('div', {},
                h('h2', { class: 'caixa-cursos__titulo', id: 'caixa-cursos-titulo', text: titulo }),
                h('p', { class: 'texto-suave caixa-cursos__sub', text: porCurso
                  ? 'Marque a sala inteira ou só os cursos que a pessoa vai estudar.'
                  : `Esta sala é dada inteira: a pessoa recebe ${ids.length === 1 ? `a ${sala.unidade[0]}` : `as ${ids.length} ${sala.unidade[1]}`} e as que forem publicadas depois.` })),
              h('button', { type: 'submit', value: 'fechar', class: 'botao-icone', 'aria-label': 'Fechar' }, icone('i-x'))),
            h('div', { class: 'caixa-cursos__corpo' },
              marcarTudo ? h('label', { class: 'caixa-cursos__tudo' }, marcarTudo,
                h('span', {}, h('strong', { text: 'Sala inteira' }), h('span', { class: 'texto-suave', text: 'Todos os cursos, inclusive os publicados depois' }))) : null,
              grupos),
            h('div', { class: 'caixa-cursos__pe' },
              porCurso
                ? [h('button', { type: 'submit', value: 'cancelar', class: 'botao botao--fantasma', text: 'Cancelar' }),
                  h('button', { type: 'submit', value: 'pronto', class: 'botao botao--primario' }, icone('i-check'), 'Pronto')]
                : h('button', { type: 'submit', value: 'fechar', class: 'botao botao--primario', text: 'Fechar' }))));
        dialogo.addEventListener('keydown', (e) => e.stopPropagation());
        dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close('cancelar'); });
        dialogo.addEventListener('close', () => {
          if (dialogo.returnValue === 'pronto') {
            st.inteira = marcarTudo.checked;
            st.legado = false;
            st.cursos = new Set(st.inteira ? ids : [...marcas].filter(([, c]) => c.checked).map(([id]) => id));
            desenhar();
            desenharResumo();
            avisar();
          }
          dialogo.remove();
          if (antes && antes.isConnected) antes.focus({ preventScroll: true });
        }, { once: true });
        document.body.append(dialogo);
        dialogo.showModal();
        (marcarTudo || dialogo.querySelector('.botao--primario')).focus({ preventScroll: true });
      }

      desenhar();
      return {
        sala, ids, tem, st, porCurso, cartao, desenhar,
        escolhidos() {
          if (st.inteira) return [`pacote:${sala.id}`, ...ids];
          if (porCurso) return [...st.cursos];
          return st.legado ? tem : [];
        },
        limpar() { st.inteira = false; st.legado = false; st.cursos = new Set(); desenhar(); },
      };
    });

    function desenharResumo() {
      const itens = linhas.flatMap((l) => {
        if (l.st.inteira) return [`${l.sala.nome}${l.sala.unica ? '' : ' (sala inteira)'}`];
        if (l.porCurso) return l.sala.trilhas.filter((t) => l.st.cursos.has(t.id)).map((t) => t.nome);
        return l.st.legado ? [`${l.sala.nome} (${l.tem.length} de ${l.ids.length})`] : [];
      });
      resumo.replaceChildren(itens.length
        ? h('p', {}, h('span', { class: 'salas-escolha__resumo-rotulo', text: 'Vai estudar:' }), ...itens.map((t) => h('span', { class: 'chip chip--ativo', text: t })))
        : h('p', { class: 'texto-suave', text: 'Nenhuma sala marcada ainda.' }));
    }
    desenharResumo();

    caixa.append(h('div', { class: 'salas-escolha__grade', role: 'group', 'aria-label': 'Salas' }, linhas.map((l) => l.cartao)), resumo);
    caixa.escolhidos = () => [...new Set([
      ...selecionados.filter((c) => !conhecidos.has(c)), // matrícula de curso que não está em nenhuma sala (ou marcador antigo, como pacote:iso): fica como está
      ...linhas.flatMap((l) => l.escolhidos()),
    ])];
    caixa.limpar = () => { linhas.forEach((l) => l.limpar()); desenharResumo(); };
    return caixa;
  }

  /* ---------- Resumo do progresso de uma pessoa (a partir da tabela "estado") ---------- */
  async function progressoDe(pessoa, alvo) {
    alvo.replaceChildren(h('p', { class: 'texto-suave', text: 'Carregando progresso…' }));
    try {
      const linhas = await Nuvem.rest('GET', `estado?usuario_id=eq.${encodeURIComponent(pessoa.id)}&chave=like.${encodeURIComponent('diver:v1:trilha:*')}&select=chave,valor,atualizado_em`);
      const porTrilha = new Map((linhas || []).map((l) => [l.chave.replace('diver:v1:trilha:', ''), l]));
      let cursos = [...new Set([...pessoa.cursos, ...porTrilha.keys()])].filter((c) => !ehPacote(c));
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
        })))),
      Estatisticas.bloco({ aluno: pessoa.id, cursos })); // do log de atividade (o professor vê só os cursos dele)
    } catch (erro) {
      alvo.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
    }
  }

  /* ---------- Tela ---------- */
  async function render(secao) {
    limpar(secao);
    const ehAdmin = Nuvem.ehAdmin();
    const lista = h('div', { class: 'pessoas', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Carregando pessoas…' }));
    const cartaoPacotes = h('section', { class: 'cartao admin-pacotes', 'aria-live': 'polite' });
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
      ehAdmin ? cartaoPacotes : null,
      h('div', { class: 'acoes-linha' }, h('h2', { class: 'secao-titulo secao-titulo--linha', text: ehAdmin ? 'Pessoas' : 'Alunos' }), busca),
      ehAdmin ? filtros : null,
      lista].filter(Boolean));

    /** Quem tem o marcador do pacote e ainda não tem algum curso dele (ex.: curso publicado depois). */
    function pendentesDosPacotes() {
      return estado.pessoas.filter((p) => p.papel !== 'admin').flatMap((p) => p.cursos.filter(ehPacote).map((pid) => ({
        pessoa: p, pacote: pid, faltam: cursosDoPacote(pid).filter((c) => !p.cursos.includes(c)),
      }))).filter((x) => x.faltam.length);
    }

    function desenharPacotes() {
      if (!ehAdmin) return;
      const com = estado.pessoas.filter((p) => p.cursos.some(ehPacote)).length;
      const pend = pendentesDosPacotes();
      const novos = pend.reduce((n, x) => n + x.faltam.length, 0);
      const botao = h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', id: 'admin-atualizar-pacotes', disabled: !pend.length, onclick: async () => {
        if (!(await UI.confirmar({ titulo: 'Atualizar os pacotes?', texto: `${UI.plural(pend.length, 'pessoa ganha', 'pessoas ganham')} ${UI.plural(novos, 'curso novo', 'cursos novos')} das salas. O que cada uma já tem continua igual.`, sim: 'Atualizar salas', humor: 'feliz' }))) return;
        botao.disabled = true;
        let falhas = 0;
        for (const x of pend) {
          const novaLista = [...new Set([...x.pessoa.cursos, ...x.faltam])];
          try {
            await Nuvem.rpc('admin_definir_matriculas', { p_usuario: x.pessoa.id, p_trilhas: novaLista });
            x.pessoa.cursos = novaLista;
          } catch (e) {
            falhas++;
          }
        }
        UI.toast(falhas ? 'Salas atualizadas em parte' : 'Salas atualizadas', falhas ? `${falhas} não deram certo; tente de novo.` : `${UI.plural(novos, 'matrícula nova', 'matrículas novas')}.`, 'i-livro');
        carregar();
      } }, icone('i-revisao'), 'Atualizar salas');
      cartaoPacotes.replaceChildren(
        h('h2', { class: 'cartao__titulo', text: 'Salas completas' }),
        h('p', { class: 'texto-suave', text: `${UI.plural(com, 'pessoa tem', 'pessoas têm')} alguma sala inteira. ${pend.length ? `${UI.plural(novos, 'curso publicado depois falta', 'cursos publicados depois faltam')} para ${UI.plural(pend.length, 'pessoa', 'pessoas')}.` : 'Todo mundo já tem todos os cursos das salas dele.'}` }),
        h('div', { class: 'acoes-linha' }, botao));
    }

    async function carregar() {
      try {
        const dados = await Nuvem.rest('GET', 'perfis?select=id,email,nome,admin,papel,trocar_senha,ativo,criado_em,matriculas(trilha_id)&order=nome.asc');
        estado.pessoas = (dados || []).map((p) => ({ ...p, papel: papelDe(p), cursos: (p.matriculas || []).map((m) => m.trilha_id) }))
          .filter((p) => ehAdmin || (p.id !== Nuvem.usuario().id && p.papel === 'aluno')); // professor: só os alunos
        desenharLista();
        desenharPacotes();
      } catch (erro) {
        lista.replaceChildren(h('p', { class: 'texto-erro', text: erro.message }));
      }
    }

    function formCadastro() {
      const nome = h('input', { class: 'campo', id: 'admin-nome', required: true, maxlength: '120', autocomplete: 'off', placeholder: 'Ex.: Maria da Silva Souza' });
      const email = h('input', { class: 'campo', id: 'admin-email', type: 'email', required: true, autocomplete: 'off', placeholder: 'maria@empresa.com' });
      const cursos = checksCursos([], 'novo-cursos');
      const grupoCursos = h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Salas e cursos' }), cursos);
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
        const escolhidos = papel === 'admin' ? [] : cursos.escolhidos();
        if (!nome.value.trim() || !email.value.trim()) {
          resultado.replaceChildren(h('p', { class: 'texto-erro', text: 'Preencha nome completo e e-mail.' }));
          return;
        }
        if (papel === 'admin' && !(await UI.confirmar({ titulo: 'Criar uma conta de admin?', texto: `${nome.value.trim()} vai poder cadastrar pessoas, mudar cursos e gerar senhas.`, sim: 'Criar conta de admin' }))) return;
        botao.disabled = true;
        resultado.replaceChildren(h('p', { class: 'texto-suave', text: 'Cadastrando…' }));
        try {
          const senha = await Nuvem.rpc('admin_criar_usuario', { p_email: email.value.trim(), p_nome: nome.value.trim(), p_trilhas: escolhidos, p_papel: papel });
          resultado.replaceChildren(cartaoSenha(nome.value.trim(), email.value.trim().toLowerCase(), senha, `${PAPEIS[papel].nome} cadastrado!`, papel));
          nome.value = '';
          email.value = '';
          cursos.limpar();
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
      const meus = p.cursos.filter((c) => !ehPacote(c) && Nuvem.matriculas().includes(c));
      return h('article', { class: `cartao pessoa ${p.ativo ? '' : 'pessoa--inativa'}` },
        h('div', { class: 'pessoa__cabeca' },
          h('span', { class: 'pessoa__avatar', 'aria-hidden': 'true', text: p.nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() }),
          h('div', { class: 'pessoa__info' },
            h('h3', { class: 'pessoa__nome', text: p.nome }),
            h('span', { class: 'texto-suave pessoa__email', text: p.email })),
          h('div', { class: 'pessoa__chips' },
            !p.ativo ? h('span', { class: 'chip chip--atrasada', text: 'Acesso desativado' }) : p.trocar_senha ? h('span', { class: 'chip', text: 'Aguardando primeiro acesso' }) : null)),
        h('div', { class: 'pessoa__chips' }, salasDe(meus).map((s) => h('span', { class: 'chip', text: s.nome }))),
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
          if (novo === 'admin' && !(await UI.confirmar({ titulo: 'Dar acesso de admin?', texto: `${p.nome} vai poder cadastrar pessoas, mudar cursos e gerar senhas.`, sim: 'Dar acesso de admin' }))) {
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
        const escolhidos = cursos.escolhidos();
        try {
          await Nuvem.rpc('admin_definir_matriculas', { p_usuario: p.id, p_trilhas: escolhidos });
          p.cursos = escolhidos;
          desenharPacotes();
          const nomes = salasDe(escolhidos).map((s) => s.nome);
          UI.toast('Salas atualizadas', `${p.nome}: ${nomes.length ? nomes.join(', ') : 'nenhuma sala'}`, 'i-livro');
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
            p.papel !== 'admin' ? salasDe(p.cursos).map((s) => h('span', { class: 'chip chip--ativo', text: s.nome })) : null,
            !p.ativo ? h('span', { class: 'chip chip--atrasada', text: 'Acesso desativado' }) : p.trocar_senha ? h('span', { class: 'chip', text: 'Aguardando primeiro acesso' }) : h('span', { class: 'chip chip--ativo', text: 'Ativo' }))),
        h('label', { class: 'pessoa__linha-papel' }, h('span', { class: 'rotulo-campo', text: 'Tipo de conta' }), seletorPapel),
        p.papel === 'admin'
          ? h('p', { class: 'texto-suave', text: 'Admin vê todos os cursos.' })
          : h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Salas e cursos (salva ao marcar)' }), cursos),
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
            if (!(await UI.confirmar({ titulo: 'Gerar uma nova senha?', texto: `A senha atual de ${p.nome} deixa de funcionar e ela recebe uma senha temporária.`, sim: 'Gerar nova senha', perigo: true }))) return;
            try {
              const senha = await Nuvem.rpc('admin_redefinir_senha', { p_usuario: p.id });
              p.trocar_senha = true;
              areaSenha.replaceChildren(cartaoSenha(p.nome, p.email, senha, 'Nova senha temporária gerada!', p.papel));
            } catch (erro) {
              UI.toast('Não deu certo', erro.message, 'i-x');
            }
          } }, icone('i-revisao'), 'Nova senha temporária'),
          h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: async () => {
            const novo = await UI.perguntar({ titulo: 'Editar nome', campo: { rotulo: 'Nome completo', valor: p.nome }, humor: null });
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
            if (!(await UI.confirmar({ titulo: `${p.ativo ? 'Desativar' : 'Reativar'} o acesso de ${p.nome}?`, texto: p.ativo ? 'A pessoa não entra mais, mas o progresso fica guardado.' : 'A pessoa volta a entrar com a senha dela.', sim: p.ativo ? 'Desativar acesso' : 'Reativar acesso', perigo: p.ativo, humor: p.ativo ? 'triste' : 'feliz' }))) return;
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

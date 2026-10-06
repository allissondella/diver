/*
 * organizar.js — área "Organizar": Calendário e Modo Foco (o plano de estudos fica em cronograma.js).
 * As Tarefas (quadros, listas e cartões) ficam em quadros.js; o Calendário lê delas
 * as tarefas abertas com prazo. Tudo salvo no navegador (localStorage, via Dados).
 * XP do foco passa pelo App -> Economia (nunca direto daqui).
 */
const Organizar = (() => {
  const { h, icone, limpar } = UI;
  const CHAVE_EVENTOS = 'diver:v1:eventos';

  const TIPOS = {
    prova: { nome: 'Prova', icone: 'i-alvo' },
    aula: { nome: 'Aula', icone: 'i-livro' },
    estudo: { nome: 'Estudo', icone: 'i-relogio' },
    descanso: { nome: 'Descanso', icone: 'i-onda' },
  };

  const tarefasComPrazo = () => Quadros.comPrazo(); // abertas, de todos os quadros
  const eventos = () => Dados.ler(CHAVE_EVENTOS, []);
  const salvarEventos = (l) => Dados.gravar(CHAVE_EVENTOS, l);

  function nomeTrilha(id) {
    const t = App.trilhas().find((x) => x.id === id);
    return t ? t.nome : '';
  }

  function opcoesTrilha(selecionada, comVazio = true) {
    return [
      comVazio ? h('option', { value: '', text: 'Sem trilha' }) : null,
      ...App.trilhas().map((t) => h('option', { value: t.id, selected: t.id === selecionada, text: t.nome })),
    ];
  }

  /* =========================================================
     CALENDÁRIO + GERADOR DE CRONOGRAMA
     ========================================================= */
  const estadoCal = { mes: null, visao: 'mes', dia: null };
  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function renderCalendario(secao) {
    limpar(secao);
    const hoje = UI.dataLocal();
    if (!estadoCal.mes) estadoCal.mes = hoje.slice(0, 7);
    if (!estadoCal.dia) estadoCal.dia = hoje;

    const cabecaCal = h('div', { class: 'cal-barra' });
    const grade = h('div', { class: 'cal' });
    const painelDia = h('div', { class: 'cartao cal-dia', 'aria-live': 'polite' });

    secao.append(
      UI.cabecalho('Organizar', 'Calendário', 'Provas, aulas, sessões de estudo e dias de descanso. Tarefas com prazo aparecem aqui também.'),
      cabecaCal, h('div', { class: 'cal-layout' }, grade, painelDia),
      h('a', { class: 'cartao cal-atalho', href: '#cronograma' },
        icone('i-alvo'),
        h('span', {}, h('strong', { text: 'Montar meu cronograma' }), h('span', { class: 'texto-suave', text: ' · a data da prova, o seu tempo e as suas matérias viram um plano semana a semana' })),
        icone('i-seta-dir')));

    function doDia(data) {
      const todos = eventos();
      const origens = new Set(todos.map((e) => e.origem).filter(Boolean)); // tarefa do cronograma que já tem evento: aparece uma vez só
      return {
        evs: todos.filter((e) => e.data === data).sort((a, b) => (a.hora || '').localeCompare(b.hora || '')),
        tars: tarefasComPrazo().filter((t) => t.prazo === data && !(t.origem && origens.has(t.origem))),
      };
    }

    function desenhar() {
      const [ano, mes] = estadoCal.mes.split('-').map(Number);
      const nomeMesBruto = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const nomeMes = nomeMesBruto[0].toUpperCase() + nomeMesBruto.slice(1); // "setembro de 2026" -> "Setembro de 2026"
      limpar(cabecaCal).append(
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': estadoCal.visao === 'mes' ? 'Mês anterior' : 'Semana anterior', onclick: () => navegar(-1) }, icone('i-voltar')),
        h('h2', { class: 'cal-barra__titulo', text: estadoCal.visao === 'mes' ? nomeMes : `Semana de ${UI.formatarData(inicioSemana(estadoCal.dia))}` }),
        h('button', { type: 'button', class: 'botao-icone', 'aria-label': estadoCal.visao === 'mes' ? 'Próximo mês' : 'Próxima semana', onclick: () => navegar(1) }, icone('i-seta-dir')),
        h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => { estadoCal.mes = hoje.slice(0, 7); estadoCal.dia = hoje; desenhar(); }, text: 'Hoje' }),
        h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Visão' },
          ['mes', 'semana'].map((v) => h('button', { type: 'button', 'aria-pressed': String(estadoCal.visao === v), onclick: () => { estadoCal.visao = v; desenhar(); }, text: v === 'mes' ? 'Mês' : 'Semana' }))));

      limpar(grade);
      if (estadoCal.visao === 'mes') desenharMes(ano, mes);
      else desenharSemana();
      desenharDia();
    }

    function inicioSemana(iso) {
      const d = UI.paraData(iso);
      d.setDate(d.getDate() - d.getDay());
      return UI.dataLocal(d);
    }

    function navegar(passo) {
      if (estadoCal.visao === 'mes') {
        const [a, m] = estadoCal.mes.split('-').map(Number);
        const d = new Date(a, m - 1 + passo, 1);
        estadoCal.mes = UI.dataLocal(d).slice(0, 7);
      } else {
        const d = UI.paraData(estadoCal.dia);
        d.setDate(d.getDate() + 7 * passo);
        estadoCal.dia = UI.dataLocal(d);
        estadoCal.mes = estadoCal.dia.slice(0, 7);
      }
      desenhar();
    }

    function botaoDia(iso, foraDoMes) {
      const { evs, tars } = doDia(iso);
      const d = UI.paraData(iso);
      const resumo = [...new Set(evs.map((e) => e.tipo))];
      return h('button', {
        type: 'button', class: `cal__dia ${foraDoMes ? 'cal__dia--fora' : ''} ${iso === hoje ? 'cal__dia--hoje' : ''} ${iso === estadoCal.dia ? 'cal__dia--sel' : ''}`,
        'aria-pressed': String(iso === estadoCal.dia),
        'aria-label': `${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}: ${UI.plural(evs.length, 'evento', 'eventos')}${tars.length ? `, ${UI.plural(tars.length, 'tarefa', 'tarefas')}` : ''}`,
        onclick: () => { estadoCal.dia = iso; desenhar(); },
      },
      h('span', { class: 'cal__num', text: String(d.getDate()) }),
      h('span', { class: 'cal__marcas', 'aria-hidden': 'true' },
        resumo.map((t) => h('span', { class: `ponto ponto--${t}`, title: TIPOS[t].nome })),
        tars.length ? h('span', { class: 'ponto ponto--tarefa', title: 'Tarefa' }) : null));
    }

    function desenharMes(ano, mes) {
      const cab = h('div', { class: 'cal__semana cal__semana--cab', 'aria-hidden': 'true' }, DIAS_SEMANA.map((d) => h('span', { text: d })));
      const primeiro = new Date(ano, mes - 1, 1);
      const inicio = new Date(primeiro);
      inicio.setDate(1 - primeiro.getDay());
      const corpo = h('div', { class: 'cal__grade' });
      for (let k = 0; k < 42; k++) {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + k);
        corpo.append(botaoDia(UI.dataLocal(d), d.getMonth() !== mes - 1));
      }
      grade.append(cab, corpo);
    }

    function desenharSemana() {
      const ini = UI.paraData(inicioSemana(estadoCal.dia));
      const lista = h('ol', { class: 'cal-semana-lista' });
      for (let k = 0; k < 7; k++) {
        const d = new Date(ini);
        d.setDate(ini.getDate() + k);
        const iso = UI.dataLocal(d);
        const { evs, tars } = doDia(iso);
        lista.append(h('li', { class: `cal-semana-lista__dia ${iso === hoje ? 'cal__dia--hoje' : ''}` },
          h('button', { type: 'button', class: 'cal-semana-lista__data', onclick: () => { estadoCal.dia = iso; desenhar(); } },
            h('strong', { text: DIAS_SEMANA[k] }), h('span', { text: UI.formatarData(iso) })),
          h('div', { class: 'cal-semana-lista__itens' },
            evs.length || tars.length ? null : h('span', { class: 'texto-suave', text: 'Livre' }),
            evs.map((e) => h('span', { class: `evento-chip evento-chip--${e.tipo}` }, icone(TIPOS[e.tipo].icone), `${e.hora ? e.hora + ' · ' : ''}${e.titulo}`)),
            tars.map((t) => h('span', { class: 'evento-chip evento-chip--tarefa' }, icone('i-colunas'), `Prazo: ${t.titulo}`)))));
      }
      grade.append(lista);
    }

    function desenharDia() {
      const { evs, tars } = doDia(estadoCal.dia);
      const titulo = UI.paraData(estadoCal.dia).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      const tituloEv = h('input', { class: 'campo', required: true, maxlength: '80', placeholder: 'Ex.: Prova de Química', 'aria-label': 'Título do evento' });
      const tipo = h('select', { 'aria-label': 'Tipo de evento' }, Object.entries(TIPOS).map(([v, t]) => h('option', { value: v, text: t.nome })));
      const data = h('input', { class: 'campo', type: 'date', required: true, value: estadoCal.dia, 'aria-label': 'Data' });
      const hora = h('input', { class: 'campo', type: 'time', 'aria-label': 'Hora (opcional)' });
      const trilha = h('select', { 'aria-label': 'Trilha (opcional)' }, opcoesTrilha(''));

      limpar(painelDia).append(...[
        h('h2', { class: 'cartao__titulo', text: titulo[0].toUpperCase() + titulo.slice(1) }),
        evs.length || tars.length ? null : h('p', { class: 'texto-suave', text: 'Dia livre. Que tal marcar uma sessão de estudo (ou um descanso merecido)?' }),
        h('ul', { class: 'lista-eventos' },
          evs.map((e) => h('li', { class: `evento evento--${e.tipo}` },
            h('span', { class: 'evento__icone' }, icone(TIPOS[e.tipo].icone)),
            h('span', { class: 'evento__texto' }, h('strong', { text: e.titulo }), h('span', { text: [TIPOS[e.tipo].nome, e.hora, nomeTrilha(e.trilhaId)].filter(Boolean).join(' · ') })),
            h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Excluir ${e.titulo}`, onclick: () => {
              salvarEventos(eventos().filter((x) => x.id !== e.id));
              desenhar();
            } }, icone('i-lixo')))),
          tars.map((t) => h('li', { class: 'evento evento--tarefa' },
            h('span', { class: 'evento__icone' }, icone('i-colunas')),
            h('span', { class: 'evento__texto' }, h('strong', { text: t.titulo }), h('span', { text: `Prazo de tarefa · ${t.quadro} › ${t.lista}` })),
            h('button', { type: 'button', class: 'botao-icone botao-icone--mini', 'aria-label': `Abrir a tarefa ${t.titulo}`, title: 'Abrir a tarefa', onclick: () => Quadros.abrirTarefa(t.id) }, icone('i-seta-dir'))))),
        h('form', { class: 'form-evento', onsubmit: (e) => {
          e.preventDefault();
          if (!tituloEv.value.trim() || !data.value) return;
          const lista = eventos();
          lista.push({ id: UI.id('evento'), titulo: tituloEv.value.trim(), tipo: tipo.value, data: data.value, hora: hora.value || '', trilhaId: trilha.value || null });
          salvarEventos(lista);
          estadoCal.dia = data.value;
          estadoCal.mes = data.value.slice(0, 7);
          desenhar();
          UI.toast('Evento criado', `${TIPOS[tipo.value].nome} em ${UI.formatarData(data.value)}.`, 'i-calendario');
        } },
        h('h3', { class: 'form-evento__titulo', text: 'Novo evento' }),
        tituloEv, h('div', { class: 'form-evento__linha' }, tipo, data, hora), trilha,
        h('button', { type: 'submit', class: 'botao botao--primario botao--largo' }, icone('i-mais'), 'Adicionar'))].filter(Boolean));
    }

    desenhar();
  }

  /* =========================================================
     MODO FOCO (25/5)
     ========================================================= */
  const foco = { fase: 'parado', presetFoco: 25, presetPausa: 5, fim: 0, restante: 25 * 60, ciclos: 0, timer: null, faseAtiva: 'foco', bloco: null };
  const DICAS_PAUSA = ['Levanta, estica as costas e bebe água.', 'Olha pra longe por 20 segundos: seus olhos agradecem.', 'Respira fundo três vezes. Devagar.', 'Dá uma volta rápida. O cérebro também precisa de ar.'];

  function renderFoco(secao) {
    limpar(secao);
    const relogio = h('div', { class: 'foco-relogio', role: 'timer', 'aria-live': 'off' });
    const estadoTxt = h('p', { class: 'foco-estado', 'aria-live': 'polite' });
    const botoes = h('div', { class: 'foco-botoes' });
    const presets = h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Duração' },
      [[25, 5], [50, 10]].map(([f, p]) => h('button', {
        type: 'button', 'aria-pressed': String(foco.presetFoco === f), disabled: foco.fase === 'rodando',
        onclick: () => { foco.presetFoco = f; foco.presetPausa = p; reiniciar(); renderFoco(secao); }, text: `${f} / ${p} min`,
      })));

    secao.append(
      UI.cabecalho('Organizar', 'Modo Foco', `Blocos de foco com pausas de verdade. Cada bloco completo vale +${Economia.CONFIG.foco.xp} XP na trilha atual.`),
      h('div', { class: 'cartao foco' },
        foco.bloco ? h('p', { class: 'foco-bloco' }, icone('i-alvo'), h('span', {}, 'Bloco do cronograma: ', h('strong', { text: foco.bloco.titulo }))) : null,
        presets, relogio, estadoTxt, botoes, h('p', { class: 'foco-ciclos', text: `Blocos de foco completos hoje: ${foco.ciclos}` })));

    function desenhar() {
      const seg = Math.max(0, Math.round((foco.fase === 'rodando' ? foco.fim - Date.now() : foco.restante * 1000) / 1000));
      relogio.textContent = UI.formatarTempo(seg);
      relogio.classList.toggle('foco-relogio--pausa', foco.faseAtiva === 'pausa');
      relogio.setAttribute('aria-label', `${foco.faseAtiva === 'foco' ? 'Foco' : 'Pausa'}: ${UI.formatarTempo(seg)} restantes`);
      estadoTxt.textContent = foco.faseAtiva === 'pausa'
        ? `Pausa. ${UI.sortear(DICAS_PAUSA)}`
        : foco.fase === 'rodando' ? 'Foco total. Celular longe, uma coisa de cada vez.' : 'Pronto pra mergulhar fundo?';
      limpar(botoes).append(...[
        foco.fase === 'rodando'
          ? h('button', { type: 'button', class: 'botao botao--secundario', onclick: pausar }, 'Pausar')
          : h('button', { type: 'button', class: 'botao botao--primario botao--grande', onclick: iniciar }, foco.restante < (foco.faseAtiva === 'foco' ? foco.presetFoco : foco.presetPausa) * 60 ? 'Continuar' : foco.faseAtiva === 'foco' ? 'Começar foco' : 'Começar pausa'),
        h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { reiniciar(); desenhar(); } }, 'Reiniciar'),
        foco.faseAtiva === 'pausa' ? h('button', { type: 'button', class: 'botao botao--link', onclick: () => { trocarFase('foco'); desenhar(); } }, 'Pular pausa') : null].filter(Boolean));
    }

    function tick() {
      if (foco.fase !== 'rodando') return;
      if (Date.now() >= foco.fim) {
        clearInterval(foco.timer);
        foco.fase = 'parado';
        if (foco.faseAtiva === 'foco') {
          foco.ciclos++;
          App.concederXP(null, Economia.CONFIG.foco, 'Bloco de foco completo');
          if (foco.bloco) {
            Cronograma.concluirBloco(foco.bloco.id, 'foco'); // o bloco do cronograma que abriu este foco fica feito
            foco.bloco = null;
          }
          trocarFase('pausa');
        } else {
          UI.toast('Pausa encerrada', 'Bora mergulhar de novo?', 'i-relogio');
          trocarFase('foco');
        }
        if (document.body.contains(secao)) renderFoco(secao);
        return;
      }
      if (document.body.contains(relogio)) desenhar();
    }

    function iniciar() {
      foco.fase = 'rodando';
      foco.fim = Date.now() + foco.restante * 1000;
      clearInterval(foco.timer);
      foco.timer = setInterval(tick, 500);
      desenhar();
    }
    function pausar() {
      foco.restante = Math.max(0, Math.round((foco.fim - Date.now()) / 1000));
      foco.fase = 'parado';
      clearInterval(foco.timer);
      desenhar();
    }
    function trocarFase(f) {
      foco.faseAtiva = f;
      foco.restante = (f === 'foco' ? foco.presetFoco : foco.presetPausa) * 60;
    }
    function reiniciar() {
      clearInterval(foco.timer);
      foco.fase = 'parado';
      trocarFase('foco');
    }

    if (foco.fase === 'rodando') {
      clearInterval(foco.timer);
      foco.timer = setInterval(tick, 500);
    }
    desenhar();
  }

  /**
   * Abre o Modo Foco já no tempo de um bloco do cronograma (25 ou 50 min). Quando o foco termina, o bloco fica feito.
   * Se já tem um foco rodando, não atrapalha: só leva para a tela.
   */
  function focarBloco({ id, titulo, minutos }) {
    if (foco.fase === 'rodando') {
      UI.toast('Já tem um foco rodando', 'Termine este primeiro: o bloco espera você.', 'i-ampulheta');
    } else {
      clearInterval(foco.timer);
      foco.presetFoco = minutos >= 50 ? 50 : 25;
      foco.presetPausa = minutos >= 50 ? 10 : 5;
      foco.faseAtiva = 'foco';
      foco.restante = foco.presetFoco * 60;
      foco.bloco = { id, titulo };
    }
    App.irPara('foco');
  }

  /** Eventos criados por outra área (ex.: "cronograma:<id>"): refaz os de `desde` em diante, ou apaga todos. */
  function sincronizarEventos(origem, novos, desde) {
    const ficam = eventos().filter((e) => !(e.origem === origem && e.data >= desde));
    salvarEventos([...ficam, ...novos.map((e) => ({ id: UI.id('evento'), hora: '', trilhaId: null, ...e, origem }))]);
  }
  function removerEventos(origem) {
    const lista = eventos();
    const ficam = lista.filter((e) => e.origem !== origem);
    if (ficam.length !== lista.length) salvarEventos(ficam);
  }

  /** Resumo para a tela Início: tarefas para hoje (ou atrasadas) e próximos eventos. */
  function resumoDoDia() {
    const hoje = UI.dataLocal();
    const limite = UI.dataLocal(new Date(Date.now() + 3 * 864e5));
    return {
      tarefas: tarefasComPrazo().filter((t) => t.prazo <= hoje).sort((a, b) => a.prazo.localeCompare(b.prazo)),
      eventos: eventos().filter((e) => e.data >= hoje && e.data <= limite).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || ''))),
    };
  }

  return { renderCalendario, renderFoco, resumoDoDia, focarBloco, sincronizarEventos, removerEventos, TIPOS, focoAtivo: () => foco.fase === 'rodando' };
})();

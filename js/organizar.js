/*
 * organizar.js — área "Organizar": Calendário (com gerador de cronograma) e Modo Foco.
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
      cabecaCal, h('div', { class: 'cal-layout' }, grade, painelDia), cronograma());

    function doDia(data) {
      return {
        evs: eventos().filter((e) => e.data === data).sort((a, b) => (a.hora || '').localeCompare(b.hora || '')),
        tars: tarefasComPrazo().filter((t) => t.prazo === data),
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

    /* ---- Gerador de cronograma: data da prova + trilhas -> sessões distribuídas ---- */
    function cronograma() {
      const dataProva = h('input', { class: 'campo', type: 'date', required: true, min: UI.dataLocal(new Date(Date.now() + 2 * 864e5)), 'aria-label': 'Data da prova' });
      const nomeProva = h('input', { class: 'campo', placeholder: 'Ex.: ENEM, prova de Direito…', maxlength: '60', 'aria-label': 'Nome da prova' });
      const trilhasBox = h('div', { class: 'checks' }, App.trilhas().map((t) => h('label', { class: 'check' }, h('input', { type: 'checkbox', value: t.id, checked: true }), t.nome)));
      const dias = h('div', { class: 'checks checks--dias' }, DIAS_SEMANA.map((d, k) => h('label', { class: 'check' }, h('input', { type: 'checkbox', value: String(k), checked: k >= 1 && k <= 5 }), d)));
      const hora = h('input', { class: 'campo', type: 'time', value: '19:00', 'aria-label': 'Horário das sessões' });
      const previa = h('div', { class: 'previa', 'aria-live': 'polite' });
      let plano = [];

      function gerar(e) {
        e.preventDefault();
        const escolhidas = [...trilhasBox.querySelectorAll('input:checked')].map((i) => i.value);
        const diasOk = [...dias.querySelectorAll('input:checked')].map((i) => Number(i.value));
        if (!dataProva.value || !escolhidas.length || !diasOk.length) {
          previa.replaceChildren(h('p', { class: 'texto-erro', text: 'Escolha a data da prova, pelo menos uma trilha e um dia da semana.' }));
          return;
        }
        const descansos = new Set(eventos().filter((x) => x.tipo === 'descanso').map((x) => x.data));
        const ocupados = new Set(eventos().filter((x) => x.tipo === 'estudo').map((x) => x.data));
        plano = [];
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const fim = UI.paraData(dataProva.value);
        let k = 0;
        while (d < fim && plano.length < 120) {
          const iso = UI.dataLocal(d);
          if (diasOk.includes(d.getDay()) && !descansos.has(iso) && !ocupados.has(iso)) {
            const tid = escolhidas[k % escolhidas.length];
            plano.push({ id: UI.id('evento'), titulo: `Estudo: ${nomeTrilha(tid)}`, tipo: 'estudo', data: iso, hora: hora.value || '', trilhaId: tid, gerado: true });
            k++;
          }
          d.setDate(d.getDate() + 1);
        }
        const prova = { id: UI.id('evento'), titulo: nomeProva.value.trim() || 'Prova', tipo: 'prova', data: dataProva.value, hora: '', trilhaId: escolhidas.length === 1 ? escolhidas[0] : null, gerado: true };
        if (!plano.length) {
          previa.replaceChildren(h('p', { class: 'texto-erro', text: 'Não sobrou nenhum dia livre até a prova com esses filtros. Tente liberar mais dias da semana.' }));
          return;
        }
        previa.replaceChildren(
          h('p', {}, h('strong', { text: `${UI.plural(plano.length, 'sessão', 'sessões')} de estudo` }), ` até ${UI.formatarData(dataProva.value, { day: '2-digit', month: 'long' })}, revezando ${UI.plural(escolhidas.length, 'trilha', 'trilhas')}. Dias de descanso e dias que já têm estudo ficam de fora.`),
          h('ol', { class: 'previa__lista' }, plano.slice(0, 6).map((p) => h('li', { text: `${UI.formatarData(p.data, { weekday: 'short', day: '2-digit', month: 'short' })} · ${p.titulo}` })),
            plano.length > 6 ? h('li', { class: 'texto-suave', text: `…e mais ${plano.length - 6}` }) : null),
          h('button', { type: 'button', class: 'botao botao--primario', onclick: () => {
            salvarEventos([...eventos(), ...plano, prova]);
            estadoCal.dia = plano[0].data;
            estadoCal.mes = plano[0].data.slice(0, 7);
            previa.replaceChildren(h('p', { class: 'texto-sucesso', text: 'Cronograma adicionado ao calendário. Bons mergulhos!' }));
            desenhar();
          } }, icone('i-check'), 'Adicionar ao calendário'));
      }

      return h('details', { class: 'cartao cronograma' },
        h('summary', { class: 'cronograma__resumo' }, icone('i-alvo'), h('span', {}, h('strong', { text: 'Gerador de cronograma' }), h('span', { class: 'texto-suave', text: ' · data da prova + trilhas = plano pronto' }))),
        h('form', { class: 'cronograma__form', onsubmit: gerar },
          h('div', { class: 'form-evento__linha' },
            h('label', {}, h('span', { class: 'rotulo-campo', text: 'Data da prova' }), dataProva),
            h('label', { class: 'form-linha__grande' }, h('span', { class: 'rotulo-campo', text: 'Nome da prova' }), nomeProva),
            h('label', {}, h('span', { class: 'rotulo-campo', text: 'Horário' }), hora)),
          h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Trilhas' }), trilhasBox),
          h('fieldset', { class: 'grupo-campos' }, h('legend', { text: 'Dias da semana' }), dias),
          h('button', { type: 'submit', class: 'botao botao--secundario' }, 'Gerar plano'),
          previa));
    }

    desenhar();
  }

  /* =========================================================
     MODO FOCO (25/5)
     ========================================================= */
  const foco = { fase: 'parado', presetFoco: 25, presetPausa: 5, fim: 0, restante: 25 * 60, ciclos: 0, timer: null, faseAtiva: 'foco' };
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
      h('div', { class: 'cartao foco' }, presets, relogio, estadoTxt, botoes, h('p', { class: 'foco-ciclos', text: `Blocos de foco completos hoje: ${foco.ciclos}` })));

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

  /** Resumo para a tela Início: tarefas para hoje (ou atrasadas) e próximos eventos. */
  function resumoDoDia() {
    const hoje = UI.dataLocal();
    const limite = UI.dataLocal(new Date(Date.now() + 3 * 864e5));
    return {
      tarefas: tarefasComPrazo().filter((t) => t.prazo <= hoje).sort((a, b) => a.prazo.localeCompare(b.prazo)),
      eventos: eventos().filter((e) => e.data >= hoje && e.data <= limite).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || ''))),
    };
  }

  return { renderCalendario, renderFoco, resumoDoDia, TIPOS, focoAtivo: () => foco.fase === 'rodando' };
})();

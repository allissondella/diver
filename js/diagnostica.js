/*
 * diagnostica.js — Avaliação Diagnóstica (rota #diagnostica): o modo mais assertivo de descobrir
 * pontos fortes e fracos antes de montar o Cronograma.
 *
 *  - 10 questões originais por área (Linguagens, Humanas, Natureza, Matemática), sem redação,
 *    em data/diagnostica/enem.json. Em Linguagens a pessoa escolhe a língua estrangeira (inglês ou espanhol).
 *  - Uma área por vez, quando quiser: cada resposta fica salva (diver:v1:diagnostica, sincroniza como o resto).
 *  - "Ainda não sei" no lugar do chute. O tempo é só referência (20 a 25 min por área), sem eliminar.
 *  - Nota de 1 a 5 por disciplina: acerto ponderado pela dificuldade (fácil 1, médio 1,5, difícil 2),
 *    puxado um pouco para o resultado da área quando a disciplina tem poucas questões.
 *    As notas vão para o passo "Suas matérias" do Cronograma (a pessoa pode ajustar).
 *  - Não usa o quiz.js. XP passa pela Economia (uma vez por área). Log: diagnostica_concluida.
 */
const Diagnostica = (() => {
  const { h, icone, limpar, plural } = UI;
  const CHAVE = 'diver:v1:diagnostica';
  const ARQUIVO = 'data/diagnostica/enem.json';
  const PESO = { facil: 1, medio: 1.5, dificil: 2 };
  const NIVEIS = ['', 'Precisa de base', 'Em construção', 'Intermediário', 'Bom', 'Forte'];
  const LETRAS = 'ABCDE';
  const TRILHA_XP = 'enem-vestibular';

  let banco = null;
  let tela = null;
  let relogio = null;
  let vista = { tela: 'painel', area: null, revisar: false };

  const ler = () => {
    const d = Dados.ler(CHAVE, null);
    return d && typeof d === 'object' ? { versao: 1, areas: {}, notas: {}, ...d } : { versao: 1, areas: {}, notas: {} };
  };
  const gravar = (d) => Dados.gravar(CHAVE, { ...d, atualizadoEm: Date.now() });
  const nota = (pct) => (pct < 0.2 ? 1 : pct < 0.4 ? 2 : pct < 0.6 ? 3 : pct < 0.8 ? 4 : 5);
  const nomeDisc = (id) => (CronogramaGerador.disciplina(id) || {}).nome || id;
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function carregar() {
    if (!banco) {
      banco = fetch(ARQUIVO, { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error('Não consegui abrir as questões agora.'); return r.json(); })
        .catch((e) => { banco = null; throw e; });
    }
    return banco;
  }
  const questoesDa = (b, area, lingua) => b.questoes.filter((q) => q.area === area && (!q.lingua || q.lingua === (lingua || 'ingles')));

  /* =========================================================
     CONTA: notas por disciplina, pontos fortes e fracos
     ========================================================= */
  function avaliar(b, d) {
    const out = { areas: {}, disciplinas: {}, temas: [] };
    b.areas.forEach((a) => {
      const reg = d.areas[a.id];
      if (!reg || !reg.concluidaEm) return;
      const qs = questoesDa(b, a.id, reg.lingua);
      let ganho = 0;
      let total = 0;
      let acertos = 0;
      let naoSei = 0;
      const porDisc = {};
      qs.forEach((q) => {
        const r = reg.respostas[q.id];
        const p = PESO[q.dificuldade] || 1;
        const ok = r === q.correta;
        total += p;
        if (ok) { ganho += p; acertos += 1; }
        if (r === -1 || r === undefined) naoSei += 1;
        const pd = (porDisc[q.disciplina] = porDisc[q.disciplina] || { ganho: 0, total: 0, n: 0, acertos: 0 });
        pd.total += p;
        pd.n += 1;
        if (ok) { pd.ganho += p; pd.acertos += 1; }
        out.temas.push({ area: a.id, disciplina: q.disciplina, tema: q.tema, ok, naoSei: r === -1 || r === undefined });
      });
      const pctArea = total ? ganho / total : 0;
      out.areas[a.id] = { acertos, total: qs.length, naoSei, pct: pctArea, nota: nota(pctArea), segundos: reg.segundos || 0, concluidaEm: reg.concluidaEm };
      Object.entries(porDisc).forEach(([disc, pd]) => {
        const k = 2 * (pd.total / pd.n); // duas questões "médias" com o resultado da área: menos sorte, mais sinal
        const pct = (pd.ganho + pctArea * k) / (pd.total + k);
        out.disciplinas[disc] = { pct, nota: nota(pct), acertos: pd.acertos, n: pd.n, area: a.id };
      });
    });
    return out;
  }

  /* ---------- Para o Cronograma ---------- */
  /** Notas de 1 a 5 por disciplina das áreas já concluídas. */
  const notas = () => ler().notas || {};
  /** Quantas áreas estão concluídas (0 a 4) e quando mudou por último. */
  function situacao() {
    const d = ler();
    return { feitas: Object.values(d.areas).filter((a) => a && a.concluidaEm).length, total: 4, atualizadoEm: d.atualizadoEm || 0 };
  }

  /* =========================================================
     TELA
     ========================================================= */
  function render(secao) {
    tela = secao;
    pararRelogio();
    limpar(secao);
    secao.append(UI.cabecalho('Cronograma', 'Avaliação Diagnóstica', 'O modo mais assertivo para você saber os seus pontos fortes e fracos.'));
    const corpo = h('div', { class: 'dg', 'aria-live': 'polite' }, h('p', { class: 'texto-suave', text: 'Preparando a avaliação…' }));
    secao.append(corpo);
    carregar().then((b) => {
      if (tela !== secao || !secao.isConnected) return;
      const d = ler();
      if (vista.tela === 'questao' && vista.area) corpo.replaceChildren(...telaQuestao(b, d, vista.area));
      else if (vista.tela === 'lingua' && vista.area) corpo.replaceChildren(telaLingua(b, vista.area));
      else if (vista.tela === 'resultado' && vista.area) corpo.replaceChildren(...telaResultadoArea(b, d, vista.area));
      else corpo.replaceChildren(...painel(b, d));
      const titulo = corpo.querySelector('h2[tabindex]');
      if (titulo) titulo.focus({ preventScroll: true });
    }).catch((e) => corpo.replaceChildren(h('p', { class: 'texto-erro', text: e.message })));
  }
  const ir = (nova) => { vista = { tela: 'painel', area: null, ...nova }; if (tela) { render(tela); window.scrollTo(0, 0); } };

  /** Abre a avaliação (por exemplo, a partir do passo "Suas matérias" do Cronograma). */
  function abrir() {
    vista = { tela: 'painel', area: null };
    App.irPara('diagnostica');
  }

  function painel(b, d) {
    const res = avaliar(b, d);
    const feitas = Object.keys(res.areas).length;
    const intro = h('section', { class: 'cartao dg-intro', 'aria-labelledby': 'dg-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'dg-titulo', tabindex: '-1', text: 'Descubra por onde começar' }),
      h('p', { class: 'dg-intro__destaque' }, h('strong', { text: 'Muito importante: ' }), 'este é o modo mais assertivo para você saber os seus pontos fortes e fracos. Com ele, o Diver personaliza a sua experiência e monta um cronograma do seu tamanho.'),
      h('ul', { class: 'cr-lista-check' },
        h('li', { text: '10 questões por área, no estilo do Enem: Linguagens, Humanas, Natureza e Matemática.' }),
        h('li', { text: 'Cerca de 1h30 no total (20 a 25 min por área). Faça uma área por vez, quando quiser: as respostas ficam salvas.' }),
        h('li', { text: 'Não sabe? Marque "Ainda não sei". Chutar atrapalha o diagnóstico.' }),
        h('li', { text: 'O tempo é só uma referência. Ninguém é eliminado, e o resultado não vira nota de prova.' })));

    const cartoes = h('ul', { class: 'dg-areas' }, b.areas.map((a) => {
      const reg = d.areas[a.id] || {};
      const r = res.areas[a.id];
      const respondidas = Object.keys(reg.respostas || {}).length;
      const andamento = !reg.concluidaEm && respondidas > 0;
      return h('li', { class: `cartao dg-area ${r ? 'dg-area--feita' : ''}`.trim() },
        h('div', { class: 'dg-area__topo' },
          h('h3', { class: 'dg-area__nome', text: a.nome }),
          h('span', { class: `chip ${r ? 'chip--ativo' : ''}`.trim(), text: r ? `${r.acertos} de ${r.total}` : andamento ? `${respondidas} de 10` : 'A fazer' })),
        h('p', { class: 'texto-suave', text: `10 questões · cerca de ${a.minutos} min · ${a.disciplinas.map(nomeDisc).join(', ')}` }),
        r ? h('p', { class: 'dg-area__nivel' }, h('strong', { text: `${NIVEIS[r.nota]}` }), ` · nível ${r.nota} de 5`) : null,
        h('div', { class: 'acoes-linha' },
          r ? h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', onclick: () => ir({ tela: 'resultado', area: a.id }) }, 'Ver resultado')
            : h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', id: `dg-comecar-${a.id}`, onclick: () => comecar(b, a.id) }, icone(andamento ? 'i-seta-dir' : 'i-alvo'), andamento ? 'Continuar' : 'Começar')));
    }));

    const blocos = [intro, cartoes];
    if (feitas) blocos.push(mapa(b, res));
    if (feitas) {
      blocos.push(h('section', { class: 'cartao dg-usar' },
        h('p', {}, feitas < 4
          ? `Você já fez ${plural(feitas, 'área', 'áreas')} de 4. As notas dessas áreas já podem ir para o seu cronograma; quando fizer as outras, elas entram também.`
          : 'Avaliação completa! Leve as suas notas para o cronograma: quem precisa de mais tempo ganha mais tempo.'),
        h('div', { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'botao botao--primario', id: 'dg-usar', onclick: () => Cronograma.abrirComDiagnostico() }, icone('i-alvo'), 'Usar no meu cronograma'))));
    } else {
      blocos.push(h('div', { class: 'acoes-linha' }, h('a', { class: 'botao botao--fantasma', href: '#cronograma' }, icone('i-voltar'), 'Voltar para o cronograma')));
    }
    return blocos;
  }

  /** Mapa de pontos fortes e fracos: nota por disciplina e os temas. */
  function mapa(b, res) {
    const linhas = Object.entries(res.disciplinas).sort((x, y) => x[1].pct - y[1].pct);
    const porDisc = (lista) => {
      const g = {};
      lista.forEach((t) => (g[t.disciplina] = g[t.disciplina] || []).push(t.tema));
      return Object.entries(g).map(([disc, temas]) => h('li', {}, h('strong', { text: `${nomeDisc(disc)}: ` }), [...new Set(temas)].join(', ')));
    };
    // um tema só é forte se todas as questões dele saíram certas; senão, entra em "a melhorar"
    const porTema = {};
    res.temas.forEach((t) => {
      const k = `${t.disciplina}|${t.tema}`;
      porTema[k] = porTema[k] ? { ...porTema[k], ok: porTema[k].ok && t.ok } : { ...t };
    });
    const fortes = Object.values(porTema).filter((t) => t.ok);
    const fracos = Object.values(porTema).filter((t) => !t.ok);
    return h('section', { class: 'cartao dg-mapa', 'aria-labelledby': 'dg-mapa-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'dg-mapa-titulo', text: 'Seus pontos fortes e fracos' }),
      h('ul', { class: 'cr-barras dg-barras' }, linhas.map(([disc, r]) => h('li', { class: 'cr-barra' },
        h('span', { class: 'cr-barra__nome', text: nomeDisc(disc) }),
        h('span', { class: 'cr-barra__trilho', 'aria-hidden': 'true' }, h('span', { class: `cr-barra__valor dg-nivel-${r.nota}`, style: `width: ${Math.max(6, Math.round(r.pct * 100))}%` })),
        h('span', { class: 'cr-barra__horas dg-barra__nota', text: `${r.nota}/5` })))),
      h('p', { class: 'texto-suave cr-dica', text: '1 = precisa de base · 2 = em construção · 3 = intermediário · 4 = bom · 5 = forte. Disciplinas com poucas questões são uma boa estimativa; ajuste no cronograma se achar justo.' }),
      h('div', { class: 'dg-colunas' },
        h('div', { class: 'dg-coluna dg-coluna--fortes' }, h('h3', { class: 'cr-area__titulo', text: 'Pontos fortes' }),
          fortes.length ? h('ul', { class: 'dg-temas' }, porDisc(fortes)) : h('p', { class: 'texto-suave', text: 'Ainda aparecendo: cada área feita revela mais.' })),
        h('div', { class: 'dg-coluna dg-coluna--fracos' }, h('h3', { class: 'cr-area__titulo', text: 'Pontos a melhorar' }),
          fracos.length ? h('ul', { class: 'dg-temas' }, porDisc(fracos)) : h('p', { class: 'texto-suave', text: 'Nada por aqui. Mandou bem, Diver!' }))));
  }

  /* ---------- Fazer uma área ---------- */
  function comecar(b, area) {
    const d = ler();
    const reg = (d.areas[area] = d.areas[area] || { respostas: {}, idx: 0, segundos: 0 });
    if (area === 'linguagens' && !reg.lingua) { gravar(d); ir({ tela: 'lingua', area }); return; }
    gravar(d);
    ir({ tela: 'questao', area });
  }

  function telaLingua(b, area) {
    const escolher = (lingua) => {
      const d = ler();
      d.areas[area] = { ...(d.areas[area] || { respostas: {}, idx: 0, segundos: 0 }), lingua };
      gravar(d);
      ir({ tela: 'questao', area });
    };
    return h('section', { class: 'cartao dg-lingua', 'aria-labelledby': 'dg-lingua-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'dg-lingua-titulo', tabindex: '-1', text: 'Qual língua estrangeira você vai fazer?' }),
      h('p', { text: 'No Enem, você escolhe entre inglês e espanhol na inscrição. Escolha a mesma aqui: são 2 das 10 questões de Linguagens.' }),
      h('div', { class: 'acoes-linha' },
        h('button', { type: 'button', class: 'botao botao--primario', id: 'dg-ingles', onclick: () => escolher('ingles') }, 'Inglês'),
        h('button', { type: 'button', class: 'botao botao--secundario', id: 'dg-espanhol', onclick: () => escolher('espanhol') }, 'Espanhol')));
  }

  function telaQuestao(b, d, area) {
    const a = b.areas.find((x) => x.id === area);
    const reg = d.areas[area];
    const qs = questoesDa(b, area, reg.lingua);
    const idx = Math.min(reg.idx || 0, qs.length - 1);
    const q = qs[idx];
    const escolhida = reg.respostas[q.id];
    const inicio = Date.now();
    const base = reg.segundos || 0;
    const tempo = h('span', { class: 'dg-relogio', 'aria-hidden': 'true' });
    const atualizarTempo = () => {
      const s = base + Math.floor((Date.now() - inicio) / 1000);
      tempo.textContent = `${mmss(s)} · sugerido ${a.minutos} min`;
      tempo.classList.toggle('dg-relogio--passou', s > a.minutos * 60);
    };
    atualizarTempo();
    pararRelogio();
    relogio = setInterval(() => { if (!tempo.isConnected) { pararRelogio(); return; } atualizarTempo(); }, 1000);
    const guardar = (mudancas) => {
      const dd = ler();
      const rr = dd.areas[area];
      rr.segundos = base + Math.floor((Date.now() - inicio) / 1000);
      Object.assign(rr, mudancas);
      gravar(dd);
      return dd;
    };

    const proximo = h('button', { type: 'submit', class: 'botao botao--primario', id: 'dg-proxima', disabled: escolhida === undefined },
      idx === qs.length - 1 ? 'Finalizar área' : 'Próxima', idx === qs.length - 1 ? icone('i-check') : icone('i-seta-dir'));
    const opcao = (valor, rotulo, texto, extra = '') => h('label', { class: `dg-opcao ${extra}`.trim() },
      h('input', { type: 'radio', name: 'dg-resp', value: String(valor), checked: escolhida === valor, onchange: () => { proximo.disabled = false; } }),
      rotulo ? h('span', { class: 'dg-opcao__letra', text: rotulo }) : null,
      h('span', { class: 'dg-opcao__texto', text: texto }));

    const form = h('form', { class: 'cartao dg-questao', onsubmit: (e) => {
      e.preventDefault();
      const marcada = form.querySelector('input[name="dg-resp"]:checked');
      if (!marcada) return;
      const respostas = { ...reg.respostas, [q.id]: Number(marcada.value) };
      if (idx < qs.length - 1) {
        guardar({ respostas, idx: idx + 1 });
        render(tela);
        window.scrollTo(0, 0);
      } else {
        const dd = guardar({ respostas, idx, concluidaEm: Date.now() });
        concluirArea(b, dd, area);
      }
    } },
    h('div', { class: 'dg-questao__topo' },
      h('h2', { class: 'cartao__titulo', tabindex: '-1', id: 'dg-q-titulo', text: `${a.nome} · Questão ${idx + 1} de ${qs.length}` }),
      tempo),
    h('div', { class: 'barra-progresso', role: 'progressbar', 'aria-label': 'Progresso da área', 'aria-valuemin': '0', 'aria-valuemax': String(qs.length), 'aria-valuenow': String(idx) },
      h('div', { class: 'barra-progresso__preenchimento', style: `width: ${Math.round((idx / qs.length) * 100)}%` })),
    q.texto ? h('div', { class: 'dg-texto' }, q.texto.split('\n').map((linha) => h('p', { text: linha }))) : null,
    h('p', { class: 'dg-enunciado', text: q.enunciado }),
    h('fieldset', { class: 'dg-opcoes' },
      h('legend', { class: 'visualmente-oculto', text: 'Alternativas' }),
      q.alternativas.map((alt, i) => opcao(i, LETRAS[i], alt)),
      opcao(-1, null, 'Ainda não sei', 'dg-opcao--nao-sei')),
    h('div', { class: 'dg-questao__acoes' },
      h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { guardar({ idx }); pararRelogio(); ir({ tela: 'painel' }); UI.toast('Avaliação pausada', 'Suas respostas ficaram salvas. Continue quando quiser.', 'i-relogio'); } }, 'Pausar'),
      idx > 0 ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { guardar({ idx: idx - 1 }); render(tela); } }, icone('i-voltar'), 'Anterior') : null,
      proximo));
    return [form];
  }

  function concluirArea(b, d, area) {
    pararRelogio();
    const res = avaliar(b, d);
    const novas = {};
    Object.entries(res.disciplinas).forEach(([disc, r]) => (novas[disc] = r.nota));
    d.notas = novas;
    const reg = d.areas[area];
    const r = res.areas[area];
    const primeiraVez = !reg.xp;
    reg.xp = true;
    gravar(d);
    Atividade.registrar('diagnostica_concluida', null, { area, acertos: r.acertos, total: r.total, nao_sei: r.naoSei, nota: r.nota, segundos: r.segundos, lingua: reg.lingua || null });
    if (primeiraVez && Economia.CONFIG.diagnostica) App.concederXP(TRILHA_XP, Economia.CONFIG.diagnostica, `${b.areas.find((a) => a.id === area).nome}: área concluída`);
    ir({ tela: 'resultado', area });
  }

  /* ---------- Resultado de uma área e revisão das questões ---------- */
  function telaResultadoArea(b, d, area) {
    const a = b.areas.find((x) => x.id === area);
    const res = avaliar(b, d);
    const r = res.areas[area];
    const reg = d.areas[area];
    const qs = questoesDa(b, area, reg.lingua);
    const discs = Object.entries(res.disciplinas).filter(([, x]) => x.area === area);
    const revisao = h('ol', { class: 'dg-revisao' }, qs.map((q, i) => {
      const resp = reg.respostas[q.id];
      const ok = resp === q.correta;
      return h('li', { class: `dg-rev ${ok ? 'dg-rev--certa' : 'dg-rev--errada'}` },
        h('details', {},
          h('summary', {}, h('span', { class: 'dg-rev__marca', text: ok ? '✓' : resp === -1 || resp === undefined ? '?' : '✗', 'aria-hidden': 'true' }),
            h('span', {}, `${i + 1}. ${q.tema}`), h('span', { class: 'visualmente-oculto', text: ok ? ' (acertou)' : ' (para revisar)' })),
          q.texto ? h('div', { class: 'dg-texto' }, q.texto.split('\n').map((linha) => h('p', { text: linha }))) : null,
          h('p', { class: 'dg-enunciado', text: q.enunciado }),
          h('ul', { class: 'dg-rev__alts' }, q.alternativas.map((alt, j) => h('li', { class: `${j === q.correta ? 'dg-rev__alt--certa' : ''} ${j === resp && !ok ? 'dg-rev__alt--sua' : ''}`.trim() },
            h('strong', { text: `${LETRAS[j]}) ` }), alt,
            j === resp && !ok ? h('span', { class: 'dg-rev__coment', text: ` Sua resposta: ${q.comentarios[j]}` }) : null))),
          resp === -1 || resp === undefined ? h('p', { class: 'texto-suave', text: 'Você marcou "Ainda não sei". Sem problema: é exatamente o que a avaliação precisava saber.' }) : null,
          h('p', { class: 'dg-rev__explica', text: q.explicacao })));
    }));
    return [
      h('section', { class: 'cartao dg-resultado', 'aria-labelledby': 'dg-res-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'dg-res-titulo', tabindex: '-1', text: `${a.nome}: ${r.acertos} de ${r.total}` }),
        h('p', { class: 'dg-area__nivel' }, h('strong', { text: NIVEIS[r.nota] }), ` · nível ${r.nota} de 5${r.naoSei ? ` · ${plural(r.naoSei, 'questão marcada', 'questões marcadas')} como "Ainda não sei"` : ''} · ${mmss(r.segundos)} de ${a.minutos}:00 sugeridos`),
        h('ul', { class: 'cr-barras dg-barras' }, discs.map(([disc, x]) => h('li', { class: 'cr-barra' },
          h('span', { class: 'cr-barra__nome', text: nomeDisc(disc) }),
          h('span', { class: 'cr-barra__trilho', 'aria-hidden': 'true' }, h('span', { class: `cr-barra__valor dg-nivel-${x.nota}`, style: `width: ${Math.max(6, Math.round(x.pct * 100))}%` })),
          h('span', { class: 'cr-barra__horas dg-barra__nota', text: `${x.nota}/5` })))),
        h('div', { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'botao botao--primario', id: 'dg-voltar-painel', onclick: () => ir({ tela: 'painel' }) }, icone('i-voltar'), 'Ver todas as áreas'),
          h('button', { type: 'button', class: 'botao botao--fantasma', onclick: async () => {
            if (!(await UI.confirmar({ titulo: `Refazer ${a.nome}?`, texto: 'As respostas desta área saem e você responde de novo. As outras áreas continuam como estão.', sim: 'Refazer', nao: 'Manter', humor: 'pensando' }))) return;
            const dd = ler();
            dd.areas[area] = { respostas: {}, idx: 0, segundos: 0, lingua: (dd.areas[area] || {}).lingua, xp: (dd.areas[area] || {}).xp };
            const rr = avaliar(b, dd);
            dd.notas = Object.fromEntries(Object.entries(rr.disciplinas).map(([k, x]) => [k, x.nota]));
            gravar(dd);
            comecar(b, area);
          } }, icone('i-revisao'), 'Refazer esta área'))),
      h('section', { class: 'cartao dg-rever', 'aria-labelledby': 'dg-rever-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'dg-rever-titulo', text: 'Rever as questões' }),
        h('p', { class: 'texto-suave', text: 'Toque numa questão para ver a resposta certa, a explicação e o porquê da sua escolha.' }),
        revisao),
    ];
  }

  function pararRelogio() {
    clearInterval(relogio);
    relogio = null;
  }

  return { render, abrir, notas, situacao };
})();

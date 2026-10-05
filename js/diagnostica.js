/*
 * diagnostica.js — Avaliação Diagnóstica (rota #diagnostica): o modo mais assertivo de descobrir
 * pontos fortes e fracos antes de montar o Cronograma.
 *
 *  - Um teste só: 40 questões originais no estilo do Enem, nesta ordem: Linguagens, Humanas, Natureza
 *    e Matemática (10 por área), sem redação, em data/diagnostica/enem.json. Antes da primeira questão,
 *    a pessoa escolhe a língua estrangeira (inglês ou espanhol).
 *  - Dá para pausar: cada resposta fica salva (diver:v1:diagnostica, sincroniza como o resto).
 *  - "Ainda não sei" no lugar do chute. O tempo é só referência (cerca de 1h30), sem eliminar.
 *  - Nota de 1 a 5 por disciplina: acerto ponderado pela dificuldade (fácil 1, médio 1,5, difícil 2),
 *    puxado um pouco para o resultado da área quando a disciplina tem poucas questões.
 *    As notas vão para o passo "Suas matérias" do Cronograma (a pessoa pode ajustar).
 *  - Não usa o quiz.js. XP passa pela Economia (uma vez). Log: diagnostica_concluida.
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
  let vista = { tela: 'painel' };

  /** Lê o que foi guardado. A versão 1 (uma área por vez) vira a 2 (um teste só) sem perder respostas. */
  function ler() {
    const d = Dados.ler(CHAVE, null);
    if (!d || typeof d !== 'object') return { versao: 2, respostas: {}, notas: {} };
    if (d.versao === 2) return { respostas: {}, notas: {}, ...d };
    const areas = Object.values(d.areas || {}).filter(Boolean);
    const todas = areas.length >= 4 && areas.every((a) => a.concluidaEm);
    return {
      versao: 2,
      respostas: Object.assign({}, ...areas.map((a) => a.respostas || {})),
      lingua: (d.areas && d.areas.linguagens && d.areas.linguagens.lingua) || null,
      segundos: areas.reduce((t, a) => t + (a.segundos || 0), 0),
      xp: areas.some((a) => a.xp),
      concluidaEm: todas ? Math.max(...areas.map((a) => a.concluidaEm)) : null,
      notas: todas ? d.notas || {} : {},
    };
  }
  const gravar = (d) => Dados.gravar(CHAVE, { ...d, versao: 2, atualizadoEm: Date.now() });
  const nota = (pct) => (pct < 0.2 ? 1 : pct < 0.4 ? 2 : pct < 0.6 ? 3 : pct < 0.8 ? 4 : 5);
  const nomeDisc = (id) => (CronogramaGerador.disciplina(id) || {}).nome || id;
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const horas = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`).replace('h00', 'h');

  function carregar() {
    if (!banco) {
      banco = fetch(ARQUIVO, { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error('Não consegui abrir as questões agora.'); return r.json(); })
        .catch((e) => { banco = null; throw e; });
    }
    return banco;
  }
  const questoesDa = (b, area, lingua) => b.questoes.filter((q) => q.area === area && (!q.lingua || q.lingua === (lingua || 'ingles')));
  /** As 40 questões do teste, na ordem: Linguagens, Humanas, Natureza e Matemática. */
  const ordem = (b, lingua) => b.areas.flatMap((a) => questoesDa(b, a.id, lingua));
  const minutosTotal = (b) => b.areas.reduce((t, a) => t + a.minutos, 0);
  const nomeArea = (b, id) => (b.areas.find((a) => a.id === id) || {}).nome || id;
  const naoRespondida = (r) => r === -1 || r === undefined;

  /* =========================================================
     CONTA: notas por disciplina, pontos fortes e fracos
     ========================================================= */
  function avaliar(b, d) {
    const out = { areas: {}, disciplinas: {}, temas: [], acertos: 0, total: 0, naoSei: 0, ganho: 0, peso: 0 };
    b.areas.forEach((a) => {
      const qs = questoesDa(b, a.id, d.lingua);
      let ganho = 0;
      let total = 0;
      let acertos = 0;
      let naoSei = 0;
      const porDisc = {};
      qs.forEach((q) => {
        const r = d.respostas[q.id];
        const p = PESO[q.dificuldade] || 1;
        const ok = r === q.correta;
        total += p;
        if (ok) { ganho += p; acertos += 1; }
        if (naoRespondida(r)) naoSei += 1;
        const pd = (porDisc[q.disciplina] = porDisc[q.disciplina] || { ganho: 0, total: 0, n: 0, acertos: 0 });
        pd.total += p;
        pd.n += 1;
        if (ok) { pd.ganho += p; pd.acertos += 1; }
        out.temas.push({ area: a.id, disciplina: q.disciplina, tema: q.tema, ok, naoSei: naoRespondida(r) });
      });
      const pctArea = total ? ganho / total : 0;
      out.areas[a.id] = { acertos, total: qs.length, naoSei, pct: pctArea, nota: nota(pctArea) };
      out.acertos += acertos;
      out.total += qs.length;
      out.naoSei += naoSei;
      out.ganho += ganho;
      out.peso += total;
      Object.entries(porDisc).forEach(([disc, pd]) => {
        const k = 2 * (pd.total / pd.n); // duas questões "médias" com o resultado da área: menos sorte, mais sinal
        const pct = (pd.ganho + pctArea * k) / (pd.total + k);
        out.disciplinas[disc] = { pct, nota: nota(pct), acertos: pd.acertos, n: pd.n, area: a.id };
      });
    });
    out.pct = out.peso ? out.ganho / out.peso : 0;
    out.nota = nota(out.pct);
    return out;
  }

  /* ---------- Para o Cronograma ---------- */
  /** Notas de 1 a 5 por disciplina (só depois de terminar o teste). */
  const notas = () => { const d = ler(); return d.concluidaEm ? d.notas || {} : {}; };
  /** Se o teste foi feito, quantas questões já têm resposta e quando o resultado saiu (marca de versão). */
  function situacao() {
    const d = ler();
    return { feita: !!d.concluidaEm, respondidas: Object.keys(d.respostas).length, total: 40, atualizadoEm: d.concluidaEm || 0 };
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
      if (vista.tela === 'questao' && d.lingua && !d.concluidaEm) corpo.replaceChildren(...telaQuestao(b, d));
      else if (vista.tela === 'lingua' && !d.concluidaEm) corpo.replaceChildren(telaLingua(b));
      else if (d.concluidaEm) corpo.replaceChildren(...telaResultado(b, d));
      else corpo.replaceChildren(...painel(b, d));
      const titulo = corpo.querySelector('h2[tabindex]');
      if (titulo) titulo.focus({ preventScroll: true });
    }).catch((e) => corpo.replaceChildren(h('p', { class: 'texto-erro', text: e.message })));
  }
  const ir = (nova) => { vista = { tela: 'painel', ...nova }; if (tela) { render(tela); window.scrollTo(0, 0); } };

  /** Abre a avaliação (por exemplo, a partir do passo "Suas matérias" do Cronograma). */
  function abrir() {
    vista = { tela: 'painel' };
    App.irPara('diagnostica');
  }

  /** Antes de começar (ou para continuar): o enunciado e um botão só. */
  function painel(b, d) {
    const respondidas = Object.keys(d.respostas).length;
    const total = ordem(b, d.lingua).length;
    const andamento = respondidas > 0;
    return [
      h('section', { class: 'cartao dg-intro', 'aria-labelledby': 'dg-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'dg-titulo', tabindex: '-1', text: 'Descubra por onde começar' }),
        h('p', { class: 'dg-intro__destaque' }, h('strong', { text: 'Muito importante: ' }), 'este é o modo mais assertivo para você saber os seus pontos fortes e fracos. Com ele, o Diver personaliza a sua experiência e monta um cronograma do seu tamanho.'),
        h('ul', { class: 'cr-lista-check' },
          h('li', { text: `${total} questões no estilo do Enem, num teste só: ${b.areas.map((a) => a.nome).join(', ').replace(/, ([^,]*)$/, ' e $1')}, nesta ordem.` }),
          h('li', { text: `Cerca de ${horas(minutosTotal(b))}. Precisa parar? Toque em "Pausar": as respostas ficam salvas e você continua de onde parou.` }),
          h('li', { text: 'Não sabe? Marque "Ainda não sei". Chutar atrapalha o diagnóstico.' }),
          h('li', { text: 'O tempo é só uma referência. Ninguém é eliminado, e o resultado não vira nota de prova.' })),
        andamento ? h('p', { class: 'dg-intro__andamento', role: 'status' }, h('strong', { text: `${respondidas} de ${total} questões respondidas.` }), ' Continue de onde parou.') : null,
        h('div', { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'botao botao--primario', id: 'dg-comecar', onclick: () => ir({ tela: d.lingua ? 'questao' : 'lingua' }) },
            icone(andamento ? 'i-seta-dir' : 'i-alvo'), andamento ? 'Continuar' : 'Começar'))),
      h('div', { class: 'acoes-linha' }, h('a', { class: 'botao botao--fantasma', href: '#cronograma' }, icone('i-voltar'), 'Voltar para o cronograma')),
    ];
  }

  function telaLingua() {
    const escolher = (lingua) => {
      const d = ler();
      d.lingua = lingua;
      gravar(d);
      ir({ tela: 'questao' });
    };
    return h('section', { class: 'cartao dg-lingua', 'aria-labelledby': 'dg-lingua-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'dg-lingua-titulo', tabindex: '-1', text: 'Qual língua estrangeira você vai fazer?' }),
      h('p', { text: 'No Enem, você escolhe entre inglês e espanhol na inscrição. Escolha a mesma aqui: são 2 das 10 questões de Linguagens.' }),
      h('div', { class: 'acoes-linha' },
        h('button', { type: 'button', class: 'botao botao--primario', id: 'dg-ingles', onclick: () => escolher('ingles') }, 'Inglês'),
        h('button', { type: 'button', class: 'botao botao--secundario', id: 'dg-espanhol', onclick: () => escolher('espanhol') }, 'Espanhol')),
      h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => ir({ tela: 'painel' }) }, icone('i-voltar'), 'Voltar')));
  }

  function telaQuestao(b, d) {
    const qs = ordem(b, d.lingua);
    const primeiraEmBranco = qs.findIndex((x) => d.respostas[x.id] === undefined);
    const idx = Math.max(0, Math.min(typeof d.idx === 'number' ? d.idx : primeiraEmBranco < 0 ? qs.length - 1 : primeiraEmBranco, qs.length - 1));
    const q = qs[idx];
    const ultima = idx === qs.length - 1;
    const novaArea = idx > 0 && qs[idx - 1].area !== q.area;
    const escolhida = d.respostas[q.id];
    const sugerido = minutosTotal(b);
    const inicio = Date.now();
    const base = d.segundos || 0;
    const tempo = h('span', { class: 'dg-relogio', 'aria-hidden': 'true' });
    const atualizarTempo = () => {
      const s = base + Math.floor((Date.now() - inicio) / 1000);
      tempo.textContent = `${mmss(s)} · sugerido ${horas(sugerido)}`;
      tempo.classList.toggle('dg-relogio--passou', s > sugerido * 60);
    };
    atualizarTempo();
    pararRelogio();
    relogio = setInterval(() => { if (!tempo.isConnected) { pararRelogio(); return; } atualizarTempo(); }, 1000);
    const guardar = (mudancas) => {
      const dd = ler();
      dd.segundos = base + Math.floor((Date.now() - inicio) / 1000);
      Object.assign(dd, mudancas);
      gravar(dd);
      return dd;
    };

    const proximo = h('button', { type: 'submit', class: 'botao botao--primario', id: 'dg-proxima', disabled: escolhida === undefined },
      ultima ? 'Finalizar avaliação' : 'Próxima', ultima ? icone('i-check') : icone('i-seta-dir'));
    const opcao = (valor, rotulo, texto, extra = '') => h('label', { class: `dg-opcao ${extra}`.trim() },
      h('input', { type: 'radio', name: 'dg-resp', value: String(valor), checked: escolhida === valor, onchange: () => { proximo.disabled = false; } }),
      rotulo ? h('span', { class: 'dg-opcao__letra', text: rotulo }) : null,
      h('span', { class: 'dg-opcao__texto', text: texto }));

    const form = h('form', { class: 'cartao dg-questao', onsubmit: (e) => {
      e.preventDefault();
      const marcada = form.querySelector('input[name="dg-resp"]:checked');
      if (!marcada) return;
      const respostas = { ...d.respostas, [q.id]: Number(marcada.value) };
      if (!ultima) {
        guardar({ respostas, idx: idx + 1 });
        render(tela);
        window.scrollTo(0, 0);
      } else {
        concluir(b, guardar({ respostas, idx }));
      }
    } },
    h('div', { class: 'dg-questao__topo' },
      h('h2', { class: 'cartao__titulo', tabindex: '-1', id: 'dg-q-titulo' }, h('span', { class: 'chip chip--ativo dg-questao__area', text: nomeArea(b, q.area) }), ` Questão ${idx + 1} de ${qs.length}`),
      tempo),
    h('div', { class: 'barra-progresso', role: 'progressbar', 'aria-label': 'Progresso da avaliação', 'aria-valuemin': '0', 'aria-valuemax': String(qs.length), 'aria-valuenow': String(idx) },
      h('div', { class: 'barra-progresso__preenchimento', style: `width: ${Math.round((idx / qs.length) * 100)}%` })),
    novaArea ? h('p', { class: 'dg-nova-area', role: 'status' }, h('strong', { text: `Agora: ${nomeArea(b, q.area)}.` }), ` ${nomeArea(b, qs[idx - 1].area)} ficou para trás. Bora mergulhar!`) : null,
    q.texto ? h('div', { class: 'dg-texto' }, q.texto.split('\n').map((linha) => h('p', { text: linha }))) : null,
    h('p', { class: 'dg-enunciado', text: q.enunciado }),
    h('fieldset', { class: 'dg-opcoes' },
      h('legend', { class: 'visualmente-oculto', text: 'Alternativas' }),
      q.alternativas.map((alt, i) => opcao(i, LETRAS[i], alt)),
      opcao(-1, null, 'Ainda não sei', 'dg-opcao--nao-sei')),
    h('div', { class: 'dg-questao__acoes' },
      h('button', { type: 'button', class: 'botao botao--fantasma', id: 'dg-pausar', onclick: () => { guardar({ idx }); pararRelogio(); ir({ tela: 'painel' }); UI.toast('Avaliação pausada', 'Suas respostas ficaram salvas. Continue quando quiser.', 'i-relogio'); } }, 'Pausar'),
      idx > 0 ? h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => { guardar({ idx: idx - 1 }); render(tela); } }, icone('i-voltar'), 'Anterior') : null,
      proximo));
    return [form];
  }

  function concluir(b, d) {
    pararRelogio();
    const res = avaliar(b, d);
    d.notas = Object.fromEntries(Object.entries(res.disciplinas).map(([disc, r]) => [disc, r.nota]));
    d.concluidaEm = Date.now();
    const primeiraVez = !d.xp;
    d.xp = true;
    gravar(d);
    Atividade.registrar('diagnostica_concluida', null, {
      acertos: res.acertos, total: res.total, nao_sei: res.naoSei, nota: res.nota, segundos: d.segundos || 0, lingua: d.lingua || null,
      ...Object.fromEntries(Object.entries(res.areas).flatMap(([id, r]) => [[`acertos_${id}`, r.acertos], [`nota_${id}`, r.nota]])),
    });
    if (primeiraVez && Economia.CONFIG.diagnostica) App.concederXP(TRILHA_XP, Economia.CONFIG.diagnostica, 'Avaliação Diagnóstica concluída');
    UI.toast('Mandou bem, Diver!', 'Avaliação concluída. Veja os seus pontos fortes e fracos.', 'i-check');
    ir({ tela: 'resultado' });
  }

  /* ---------- Resultado: nota por área, mapa e revisão das questões ---------- */
  function telaResultado(b, d) {
    const res = avaliar(b, d);
    return [
      h('section', { class: 'cartao dg-resultado', 'aria-labelledby': 'dg-res-titulo' },
        h('h2', { class: 'cartao__titulo', id: 'dg-res-titulo', tabindex: '-1', text: `Seu resultado: ${res.acertos} de ${res.total}` }),
        h('p', { class: 'dg-area__nivel' }, h('strong', { text: NIVEIS[res.nota] }), ` · nível ${res.nota} de 5${res.naoSei ? ` · ${plural(res.naoSei, 'questão marcada', 'questões marcadas')} como "Ainda não sei"` : ''} · ${mmss(d.segundos || 0)} de ${horas(minutosTotal(b))} sugeridos`),
        h('ul', { class: 'dg-areas-res' }, b.areas.map((a) => {
          const r = res.areas[a.id];
          return h('li', { class: 'dg-area-res' },
            h('span', { class: 'dg-area-res__nome', text: a.nome }),
            h('span', { class: 'texto-suave', text: `${r.acertos} de ${r.total}` }),
            h('span', { class: `chip dg-chip-nivel dg-chip-nivel--${r.nota}`, text: NIVEIS[r.nota] }));
        })),
        h('div', { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'botao botao--primario', id: 'dg-usar', onclick: () => Cronograma.abrirComDiagnostico() }, icone('i-alvo'), 'Usar no meu cronograma'))),
      mapa(res),
      rever(b, d),
      h('div', { class: 'acoes-linha' },
        h('a', { class: 'botao botao--fantasma', href: '#cronograma' }, icone('i-voltar'), 'Voltar para o cronograma'),
        h('button', { type: 'button', class: 'botao botao--fantasma', id: 'dg-refazer', onclick: async () => {
          if (!(await UI.confirmar({ titulo: 'Refazer a avaliação?', texto: 'As respostas saem e você responde as 40 questões de novo. As notas do seu cronograma continuam como estão até você terminar.', sim: 'Refazer', nao: 'Manter', humor: 'pensando' }))) return;
          gravar({ respostas: {}, notas: {}, xp: ler().xp, concluidaEm: null, idx: 0, segundos: 0, lingua: null });
          ir({ tela: 'lingua' });
        } }, icone('i-revisao'), 'Refazer a avaliação')),
    ];
  }

  /** Mapa de pontos fortes e fracos: nota por disciplina e os temas. */
  function mapa(res) {
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
          fortes.length ? h('ul', { class: 'dg-temas' }, porDisc(fortes)) : h('p', { class: 'texto-suave', text: 'Ainda não apareceu nenhum: o cronograma vai cuidar de cada tema.' })),
        h('div', { class: 'dg-coluna dg-coluna--fracos' }, h('h3', { class: 'cr-area__titulo', text: 'Pontos a melhorar' }),
          fracos.length ? h('ul', { class: 'dg-temas' }, porDisc(fracos)) : h('p', { class: 'texto-suave', text: 'Nada por aqui. Mandou bem, Diver!' }))));
  }

  /** As 40 questões com a resposta certa, a explicação e o porquê da escolha, separadas por área. */
  function rever(b, d) {
    let n = 0;
    const grupos = b.areas.map((a) => h('div', { class: 'dg-rever__area' },
      h('h3', { class: 'cr-area__titulo', text: a.nome }),
      h('ol', { class: 'dg-revisao', start: String(n + 1) }, questoesDa(b, a.id, d.lingua).map((q) => {
        n += 1;
        const resp = d.respostas[q.id];
        const ok = resp === q.correta;
        return h('li', { class: `dg-rev ${ok ? 'dg-rev--certa' : 'dg-rev--errada'}` },
          h('details', {},
            h('summary', {}, h('span', { class: 'dg-rev__marca', text: ok ? '✓' : naoRespondida(resp) ? '?' : '✗', 'aria-hidden': 'true' }),
              h('span', {}, `${n}. ${q.tema}`), h('span', { class: 'visualmente-oculto', text: ok ? ' (acertou)' : ' (para revisar)' })),
            q.texto ? h('div', { class: 'dg-texto' }, q.texto.split('\n').map((linha) => h('p', { text: linha }))) : null,
            h('p', { class: 'dg-enunciado', text: q.enunciado }),
            h('ul', { class: 'dg-rev__alts' }, q.alternativas.map((alt, j) => h('li', { class: `${j === q.correta ? 'dg-rev__alt--certa' : ''} ${j === resp && !ok ? 'dg-rev__alt--sua' : ''}`.trim() },
              h('strong', { text: `${LETRAS[j]}) ` }), alt,
              j === resp && !ok ? h('span', { class: 'dg-rev__coment', text: ` Sua resposta: ${q.comentarios[j]}` }) : null))),
            naoRespondida(resp) ? h('p', { class: 'texto-suave', text: 'Você marcou "Ainda não sei". Sem problema: é exatamente o que a avaliação precisava saber.' }) : null,
            h('p', { class: 'dg-rev__explica', text: q.explicacao })));
      }))));
    return h('section', { class: 'cartao dg-rever', 'aria-labelledby': 'dg-rever-titulo' },
      h('h2', { class: 'cartao__titulo', id: 'dg-rever-titulo', text: 'Rever as questões' }),
      h('p', { class: 'texto-suave', text: 'Toque numa questão para ver a resposta certa, a explicação e o porquê da sua escolha.' }),
      ...grupos);
  }

  function pararRelogio() {
    clearInterval(relogio);
    relogio = null;
  }

  return { render, abrir, notas, situacao };
})();

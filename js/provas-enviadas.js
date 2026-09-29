/*
 * provas-enviadas.js — "Upload de prova" no Simulado.
 *
 * A pessoa sobe uma prova antiga (PDF ou texto, com o gabarito), confere o que o leitor entendeu
 * (js/leitor-prova.js) e a prova vira um simulado com correção no final.
 *  - Prova do aluno: fica na conta dele (localStorage "diver:v1:provas-enviadas", que sincroniza
 *    com a nuvem como o resto do progresso). Vale XP, sem pérolas, se ele jurar que foi honesto.
 *    Na "espiadinha", não pontua. Refazer vale metade.
 *  - Prova do professor/admin: publicada para os alunos de um curso (tabela provas_curso no Supabase).
 *    O gabarito vem do professor, então vale XP e pérolas para o aluno (metade ao refazer).
 *    Quem publica faz em modo conferência, sem pontos.
 * Os pontos são calculados só na entrega, pelo Economia.pontuarProvaEnviada.
 */
const ProvasEnviadas = (() => {
  const { h, icone, plural, formatarTempo, toast } = UI;
  const CHAVE = 'diver:v1:provas-enviadas';
  const MAX_QUESTOES = 300;
  const MAX_MB = 15;
  const TEMPOS = [[1, '1 minuto por questão'], [2, '2 minutos por questão'], [3, '3 minutos por questão'], [0, 'Sem limite de tempo']];
  const FRASE = 'Inclua o gabarito junto, mas não vale trapacear, estamos confiando em você.';
  const HONRA = [
    { valor: true, texto: 'Eu juro que fui honesto e vou pontuar' },
    { valor: false, texto: 'Eu dei uma espiadinha e não vou pontuar' },
  ];

  const cursoCache = new Map(); // trilhaId → { lista, erro, carregando }
  let rascunho = null; // upload em andamento

  /* ---------- Guardar ---------- */

  function ler() {
    const d = Dados.ler(CHAVE, null);
    return {
      versao: 1,
      provas: d && Array.isArray(d.provas) ? d.provas : [],
      feitas: d && d.feitas && typeof d.feitas === 'object' ? d.feitas : {}, // tentativas nas provas do professor
    };
  }
  const gravar = (d) => Dados.gravar(CHAVE, d);

  const nuvemLigada = () => Nuvem.ativa && Nuvem.temSessao();
  const daEquipe = () => nuvemLigada() && (Nuvem.ehAdmin() || Nuvem.ehProfessor());
  const nomeCurso = (id) => (App.trilhas().find((t) => t.id === id) || { nome: id }).nome;
  const fmtNota = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const textoTempo = (minutos, n) => (minutos ? `${formatarTempo(minutos * 60)} de prova` : 'sem limite de tempo') + ` · ${plural(n, 'questão', 'questões')}`;

  /** Questão no formato do quiz (confere tudo: pode ter vindo da nuvem). */
  function questaoValida(q, id, tema) {
    if (!q || typeof q.enunciado !== 'string' || !Array.isArray(q.alternativas)) return null;
    const alternativas = q.alternativas.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim());
    if (!q.enunciado.trim() || alternativas.length < 2 || alternativas.length !== q.alternativas.length) return null;
    if (!Number.isInteger(q.correta) || q.correta < 0 || q.correta >= alternativas.length) return null;
    return { id, tema, dificuldade: 'medio', enunciado: q.enunciado.trim(), alternativas, correta: q.correta, explicacao: typeof q.explicacao === 'string' ? q.explicacao.trim() : '' };
  }

  /* ---------- Pontos ---------- */

  function regras(ref) {
    const d = ler();
    if (ref.origem === 'minha') {
      const p = d.provas.find((x) => x.id === ref.id);
      if (!p || !p.honesto) return { fator: 0, comPerolas: false, motivo: 'Espiadinha declarada: esta prova não pontua. Valeu pela sinceridade!' };
      return (p.tentativas || []).length
        ? { fator: 0.5, comPerolas: false, motivo: 'Prova refeita: XP pela metade, sem pérolas.' }
        : { fator: 1, comPerolas: false, motivo: 'Prova sua: vale XP, sem pérolas.' };
    }
    if (daEquipe()) return { fator: 0, comPerolas: false, motivo: 'Modo conferência: quem publica a prova não pontua.' };
    return (d.feitas[ref.id] || []).length
      ? { fator: 0.5, comPerolas: true, motivo: 'Prova refeita: XP e pérolas pela metade.' }
      : { fator: 1, comPerolas: true, motivo: 'Prova do professor: vale XP e pérolas.' };
  }

  function comecar(ref) {
    const prova = ref.origem === 'minha'
      ? ler().provas.find((x) => x.id === ref.id)
      : ((cursoCache.get(App.trilhaAtual().id) || {}).lista || []).find((x) => x.id === ref.id);
    if (!prova || !prova.questoes.length) {
      toast('Ops', 'Não achei essa prova. Ela pode ter sido apagada.', 'i-x');
      return;
    }
    const r = regras(ref);
    App.iniciarProvaEnviada({ ref, questoes: prova.questoes, titulo: prova.titulo, minutos: prova.minutos || 0, ...r });
  }

  function registrarTentativa(ref, resumo) {
    if (!ref) return;
    const d = ler();
    const t = { data: Date.now(), acertos: resumo.acertos, total: resumo.total, nota: resumo.nota, tempoSeg: resumo.tempoSeg, xp: resumo.xp, perolas: resumo.perolas };
    if (ref.origem === 'minha') {
      const p = d.provas.find((x) => x.id === ref.id);
      if (p) p.tentativas = [t, ...(p.tentativas || [])].slice(0, 20);
    } else {
      d.feitas[ref.id] = [t, ...(d.feitas[ref.id] || [])].slice(0, 20);
    }
    gravar(d);
  }

  /* ---------- Lista no Simulado ---------- */

  function itemProva({ titulo, detalhes, selo, tentativas, aoFazer, aoApagar }) {
    const melhor = tentativas.length ? Math.max(...tentativas.map((t) => t.nota)) : null;
    return h('li', { class: 'prova-item' },
      h('div', { class: 'prova-item__info' },
        h('strong', { class: 'prova-item__titulo', text: titulo }),
        h('span', { class: 'texto-suave', text: detalhes }),
        h('span', { class: 'prova-item__chips' },
          h('span', { class: `chip ${selo.classe || ''}`, text: selo.texto }),
          melhor !== null ? h('span', { class: 'chip', text: `Melhor nota ${fmtNota(melhor)} · ${plural(tentativas.length, 'entrega', 'entregas')}` }) : null)),
      h('div', { class: 'prova-item__acoes' },
        h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: aoFazer }, tentativas.length ? 'Refazer' : 'Fazer prova'),
        aoApagar ? h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-label': `Apagar a prova ${titulo}`, onclick: aoApagar }, icone('i-lixo'), 'Apagar') : null));
  }

  function blocoMinhas(trilha) {
    const d = ler();
    const minhas = d.provas.filter((p) => p.trilhaId === trilha.id);
    return h('div', { class: 'cartao' },
      h('h2', { class: 'cartao__titulo', text: 'Suas provas' }),
      minhas.length
        ? h('ul', { class: 'provas-lista' }, minhas.map((p) => itemProva({
          titulo: p.titulo,
          detalhes: textoTempo(p.minutos, p.questoes.length),
          selo: p.honesto ? { classe: 'chip--aviso', texto: 'Vale XP (sem pérolas)' } : { texto: 'Espiadinha: não pontua' },
          tentativas: p.tentativas || [],
          aoFazer: () => comecar({ origem: 'minha', id: p.id }),
          aoApagar: () => {
            if (!window.confirm(`Apagar a prova "${p.titulo}"? As notas dela também somem.`)) return;
            const atual = ler();
            atual.provas = atual.provas.filter((x) => x.id !== p.id);
            gravar(atual);
            renderLista(document.getElementById('provas-enviadas'));
          },
        })))
        : h('p', { class: 'texto-suave', text: 'Nenhuma prova enviada neste curso ainda. Que tal aquela prova antiga que está parada na pasta?' }));
  }

  async function carregarCurso(trilhaId) {
    const antes = cursoCache.get(trilhaId);
    cursoCache.set(trilhaId, { ...(antes || {}), carregando: true });
    let novo;
    try {
      const linhas = await Nuvem.rest('GET', `provas_curso?trilha_id=eq.${encodeURIComponent(trilhaId)}&select=id,titulo,autor_id,autor_nome,minutos,questoes,criado_em&order=criado_em.desc`);
      const lista = (Array.isArray(linhas) ? linhas : []).map((p) => ({
        ...p,
        questoes: (Array.isArray(p.questoes) ? p.questoes : []).map((q, i) => questaoValida(q, `${p.id}-${i + 1}`, p.titulo)).filter(Boolean),
      }));
      novo = { lista };
    } catch (e) {
      const semTabela = /provas_curso|does not exist|schema cache/i.test(e.message);
      novo = {
        lista: antes && antes.lista ? antes.lista : [],
        erro: semTabela
          ? (daEquipe() ? 'As provas do professor ainda não foram ligadas no banco: peça ao admin para rodar de novo o supabase/setup.sql.' : null)
          : 'Não deu para carregar as provas do professor agora. Confira a internet.',
      };
    }
    cursoCache.set(trilhaId, novo);
    const el = document.getElementById('provas-enviadas');
    const tela = document.getElementById('tela-simulado');
    if (el && tela && !tela.hidden && App.trilhaAtual() && App.trilhaAtual().id === trilhaId) renderLista(el, { recarregar: false });
  }

  function blocoCurso(trilha) {
    const c = cursoCache.get(trilha.id);
    const box = h('div', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Provas do professor' }));
    if (!c || (c.carregando && !c.lista)) {
      box.append(h('p', { class: 'texto-suave', text: 'Carregando…' }));
      return box;
    }
    if (c.erro) box.append(h('p', { class: 'texto-erro', text: c.erro }));
    else if (c.erro === null && !c.lista.length) return null; // banco sem a tabela: o aluno nem vê o bloco
    if (!c.lista.length) {
      if (!c.erro) box.append(h('p', { class: 'texto-suave', text: daEquipe() ? 'Nenhuma prova publicada neste curso. Use "Upload de prova" e escolha "Para os alunos do curso".' : 'Nenhuma prova do professor neste curso por enquanto.' }));
      return box;
    }
    const eu = Nuvem.usuario() && Nuvem.usuario().id;
    const d = ler();
    box.append(h('ul', { class: 'provas-lista' }, c.lista.map((p) => itemProva({
      titulo: p.titulo,
      detalhes: `${p.autor_nome ? `Por ${p.autor_nome} · ` : ''}${textoTempo(p.minutos, p.questoes.length)}`,
      selo: daEquipe() ? { texto: 'Modo conferência: não pontua' } : { classe: 'chip--ativo', texto: 'Vale XP e pérolas' },
      tentativas: d.feitas[p.id] || [],
      aoFazer: () => comecar({ origem: 'curso', id: p.id }),
      aoApagar: Nuvem.ehAdmin() || p.autor_id === eu ? async () => {
        if (!window.confirm(`Apagar "${p.titulo}" para todos os alunos do curso?`)) return;
        try {
          await Nuvem.rest('DELETE', `provas_curso?id=eq.${encodeURIComponent(p.id)}`);
          toast('Prova apagada', 'Os alunos não veem mais essa prova.', 'i-lixo');
        } catch (e) {
          toast('Não deu para apagar', e.message, 'i-x');
        }
        carregarCurso(trilha.id);
      } : null,
    }))));
    return box;
  }

  /** Desenha o bloco do Simulado. recarregar: busca de novo as provas do professor. */
  function renderLista(el, { recarregar = true } = {}) {
    if (!el) return;
    const trilha = App.trilhaAtual();
    if (!trilha) return;
    if (nuvemLigada() && recarregar && !(cursoCache.get(trilha.id) || {}).carregando) carregarCurso(trilha.id);
    const cabeca = h('div', { class: 'cartao modo' },
      h('div', { class: 'modo__cabeca' },
        h('span', { class: 'modo__icone modo__icone--upload' }, icone('i-upload')),
        h('div', {},
          h('h2', { class: 'cartao__titulo', text: 'Provas antigas' }),
          h('p', { text: 'Suba uma prova antiga (PDF ou texto) com o gabarito: o Diver separa as questões e ela vira um simulado com correção no final.' }))),
      h('div', { class: 'modo__acoes' },
        h('button', { type: 'button', class: 'botao botao--primario', onclick: () => App.irPara('upload-prova') }, icone('i-upload'), 'Upload de prova')));
    el.replaceChildren(...[cabeca, nuvemLigada() ? blocoCurso(trilha) : null, blocoMinhas(trilha)].filter(Boolean));
  }

  /* ---------- Upload: etapa 1 (arquivo, tempo e palavra de honra) ---------- */

  function renderUpload(tela) {
    const trilha = App.trilhaAtual();
    rascunho = {
      etapa: 'arquivo', titulo: '', trilhaId: trilha.id, destino: 'minha', honesto: null, porQuestao: 2,
      texto: '', arquivo: null, questoes: [], avisos: [],
    };
    desenhar(tela);
  }

  function desenhar(tela) {
    if (rascunho.etapa === 'arquivo') etapaArquivo(tela);
    else etapaConferir(tela);
    const titulo = tela.querySelector('h1');
    if (titulo) titulo.focus({ preventScroll: true });
  }

  function radios(nome, legenda, opcoes, valorAtual, aoMudar, classe = '') {
    return h('fieldset', { class: `grupo-campos ${classe}` },
      h('legend', { class: 'rotulo-campo', text: legenda }),
      h('div', { class: 'opcoes-radio' }, opcoes.map((o) => h('label', { class: 'check check--radio' },
        h('input', { type: 'radio', name: nome, value: String(o.valor), checked: valorAtual === o.valor, onchange: () => aoMudar(o.valor) }),
        h('span', { text: o.texto })))));
  }

  function etapaArquivo(tela) {
    const r = rascunho;
    const erro = h('p', { class: 'texto-erro', 'aria-live': 'polite' });
    const botao = h('button', { type: 'submit', class: 'botao botao--primario' }, icone('i-upload'), 'Confirmar e subir a prova');
    const titulo = h('input', { class: 'campo', id: 'upload-titulo', maxlength: '120', placeholder: 'Ex.: Residência 2019, Radiologia', value: r.titulo, oninput: (e) => (r.titulo = e.target.value) });
    const curso = h('select', { class: 'campo', id: 'upload-curso', onchange: (e) => (r.trilhaId = e.target.value) },
      App.trilhas().map((t) => h('option', { value: t.id, selected: t.id === r.trilhaId, text: t.nome })));
    const arquivo = h('input', { type: 'file', class: 'campo campo--arquivo', id: 'upload-arquivo', accept: '.pdf,.txt,application/pdf,text/plain',
      onchange: (e) => {
        r.arquivo = e.target.files[0] || null;
        if (r.arquivo && !r.titulo.trim()) {
          r.titulo = r.arquivo.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 120);
          titulo.value = r.titulo;
        }
      } });
    const texto = h('textarea', { class: 'campo campo--area', id: 'upload-texto', rows: '8', placeholder: '1. Enunciado da questão...\na) primeira alternativa\nb) segunda alternativa\n...\nGabarito: 1-B 2-A 3-D', oninput: (e) => (r.texto = e.target.value) });
    texto.value = r.texto;
    const tempo = h('select', { class: 'campo', id: 'upload-tempo', onchange: (e) => (r.porQuestao = Number(e.target.value)) },
      TEMPOS.map(([v, t]) => h('option', { value: v, selected: v === r.porQuestao, text: t })));

    const honra = h('div', { class: 'upload-honra' });
    function desenharHonra() {
      if (r.destino === 'curso') {
        honra.replaceChildren(h('p', { class: 'texto-suave', text: 'O gabarito vem de você: cada aluno do curso ganha XP e pérolas quando entregar a prova. Quem publica faz em modo conferência.' }));
        return;
      }
      honra.replaceChildren(
        h('p', { class: 'upload-honra__frase' }, icone('i-alvo'), h('span', { text: FRASE })),
        radios('upload-honra', 'Palavra de mergulhador', HONRA, r.honesto, (v) => (r.honesto = v), 'upload-honra__opcoes'));
    }
    desenharHonra();

    const destino = daEquipe()
      ? radios('upload-destino', 'Para quem é a prova?', [{ valor: 'minha', texto: 'Só para mim' }, { valor: 'curso', texto: 'Para os alunos do curso' }], r.destino, (v) => {
        r.destino = v;
        desenharHonra();
      })
      : null;

    const form = h('form', { class: 'cartao form-upload', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      erro.textContent = '';
      const temArquivo = !!r.arquivo;
      if (!temArquivo && !r.texto.trim()) return (erro.textContent = 'Escolha o arquivo da prova ou cole o texto dela.');
      if (r.destino === 'minha' && r.honesto === null) return (erro.textContent = 'Falta a palavra de mergulhador: escolha uma das duas opções.');
      if (temArquivo && r.arquivo.size > MAX_MB * 1024 * 1024) return (erro.textContent = `Arquivo grande demais (máximo ${MAX_MB} MB).`);
      botao.disabled = true;
      botao.lastChild.textContent = 'Lendo a prova…';
      try {
        let conteudo = r.texto;
        if (temArquivo) {
          const nome = r.arquivo.name.toLowerCase();
          if (/\.pdf$/.test(nome) || r.arquivo.type === 'application/pdf') conteudo = await LeitorProva.textoDoPdf(r.arquivo);
          else if (/\.(txt|text)$/.test(nome) || r.arquivo.type.startsWith('text/')) conteudo = await r.arquivo.text();
          else if (/\.docx?$/.test(nome)) throw new Error('Arquivo do Word: abra no Word, copie tudo (Ctrl+A, Ctrl+C) e cole no campo "Prefere colar o texto?".');
          else throw new Error('Formato não reconhecido. Use PDF, .txt ou cole o texto.');
          if (r.texto.trim()) conteudo += '\n' + r.texto; // gabarito colado à parte também vale
        }
        const lido = LeitorProva.interpretar(conteudo);
        if (!lido.questoes.length) {
          throw new Error('Não encontrei questões nesse texto. O leitor espera questões numeradas ("1.", "Questão 1") com alternativas "a)", "b)"... Se o PDF for uma foto, cole o texto.');
        }
        if (lido.questoes.length > MAX_QUESTOES) lido.avisos.unshift(`A prova tem ${lido.questoes.length} questões: ficaram as ${MAX_QUESTOES} primeiras.`);
        r.questoes = lido.questoes.slice(0, MAX_QUESTOES);
        r.avisos = lido.avisos;
        if (!r.titulo.trim()) r.titulo = `Prova de ${new Date().toLocaleDateString('pt-BR')}`;
        r.etapa = 'conferir';
        desenhar(tela);
      } catch (falha) {
        erro.textContent = falha.message;
        botao.disabled = false;
        botao.lastChild.textContent = 'Confirmar e subir a prova';
      }
    } },
    h('div', { class: 'form-upload__linha' },
      h('label', { class: 'campo-grupo' }, h('span', { class: 'rotulo-campo', text: 'Título da prova' }), titulo),
      h('label', { class: 'campo-grupo' }, h('span', { class: 'rotulo-campo', text: 'Curso' }), curso)),
    destino,
    h('label', { class: 'campo-grupo' },
      h('span', { class: 'rotulo-campo', text: 'Arquivo da prova (PDF ou .txt)' }), arquivo,
      h('span', { class: 'form-upload__dica texto-suave', text: 'PDF com texto selecionável, até 15 MB. PDF escaneado (foto) não dá para ler: cole o texto abaixo.' })),
    h('details', { class: 'form-upload__colar', open: !!r.texto },
      h('summary', { text: 'Prefere colar o texto? (também serve para um gabarito separado)' }),
      h('label', { class: 'visualmente-oculto', for: 'upload-texto', text: 'Texto da prova' }), texto),
    h('label', { class: 'campo-grupo form-upload__tempo' }, h('span', { class: 'rotulo-campo', text: 'Tempo de prova' }), tempo),
    honra,
    erro,
    h('div', { class: 'acoes-linha form-upload__acoes' },
      h('button', { type: 'button', class: 'botao botao--secundario', onclick: () => App.irPara('simulado') }, 'Cancelar'),
      botao));

    tela.replaceChildren(
      h('header', { class: 'area-cabeca' },
        h('span', { class: 'rotulo', text: `Simulado · ${nomeCurso(r.trilhaId)}` }),
        h('h1', { id: 'upload-prova-titulo', tabindex: '-1', text: 'Upload de prova' }),
        h('p', { class: 'area-cabeca__sub', text: 'Transforme uma prova antiga em simulado. O Diver lê o arquivo, separa as questões, confere com o gabarito e corrige no final.' })),
      form);
  }

  /* ---------- Upload: etapa 2 (conferir e salvar) ---------- */

  function etapaConferir(tela) {
    const r = rascunho;
    const L = LeitorProva.LETRAS;
    const status = h('p', { class: 'conferir__status', 'aria-live': 'polite' });
    const erro = h('p', { class: 'texto-erro', 'aria-live': 'polite' });
    const lista = h('ol', { class: 'conferir-lista' });

    function atualizarStatus() {
      const falta = r.questoes.filter((q) => q.correta === null).length;
      status.replaceChildren(falta
        ? h('span', { class: 'texto-erro' }, `Faltam ${plural(falta, 'questão', 'questões')} sem resposta certa marcada.`)
        : h('span', { class: 'texto-sucesso' }, icone('i-check'), `Tudo certo: ${plural(r.questoes.length, 'questão pronta', 'questões prontas')}.`));
    }

    function cartaoQuestao(q, k) {
      const li = h('li', { class: `cartao conferir-q ${q.correta === null ? 'conferir-q--pendente' : ''}` });
      const nome = `certa-${k}`;
      li.append(...[
        h('div', { class: 'conferir-q__cabeca' },
          h('strong', { text: `Questão ${q.numero}` }),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-label': `Tirar a questão ${q.numero}`,
            onclick: () => {
              r.questoes.splice(r.questoes.indexOf(q), 1);
              const proximo = li.nextElementSibling || li.previousElementSibling;
              li.remove();
              atualizarStatus();
              if (proximo) proximo.querySelector('textarea').focus();
            } }, icone('i-lixo'), 'Tirar')),
        h('label', { class: 'campo-grupo' },
          h('span', { class: 'rotulo-campo', text: 'Enunciado' }),
          h('textarea', { class: 'campo campo--area conferir-q__enunciado', rows: '3', value: q.enunciado, oninput: (e) => (q.enunciado = e.target.value) })),
        h('fieldset', { class: 'grupo-campos conferir-q__alts' },
          h('legend', { class: 'rotulo-campo', text: 'Alternativas (marque a certa)' }),
          q.alternativas.map((a, i) => h('div', { class: 'conferir-alt' },
            h('input', { type: 'radio', name: nome, id: `${nome}-${i}`, checked: q.correta === i, 'aria-label': `A alternativa ${L[i]} é a certa`,
              onchange: () => {
                q.correta = i;
                li.classList.remove('conferir-q--pendente');
                atualizarStatus();
              } }),
            h('label', { class: 'conferir-alt__letra', for: `${nome}-${i}`, text: L[i] }),
            h('input', { class: 'campo', value: a, 'aria-label': `Texto da alternativa ${L[i]} da questão ${q.numero}`, oninput: (e) => (q.alternativas[i] = e.target.value) })))),
        q.explicacao ? h('label', { class: 'campo-grupo' },
          h('span', { class: 'rotulo-campo', text: 'Comentário (aparece na correção)' }),
          h('textarea', { class: 'campo campo--area', rows: '2', value: q.explicacao, oninput: (e) => (q.explicacao = e.target.value) })) : null,
      ].filter(Boolean));
      return li;
    }

    r.questoes.forEach((q, k) => lista.append(cartaoQuestao(q, k)));
    atualizarStatus();

    async function salvar() {
      erro.textContent = '';
      const prontas = [];
      for (const q of r.questoes) {
        const pos = r.questoes.indexOf(q);
        // Alternativa apagada na conferência sai da lista (e a certa acompanha)
        const alternativas = [];
        let correta = null;
        q.alternativas.forEach((a, i) => {
          if (!a.trim()) return;
          if (i === q.correta) correta = alternativas.length;
          alternativas.push(a.trim());
        });
        const valida = questaoValida({ ...q, alternativas, correta }, `q${pos + 1}`, r.titulo.trim());
        if (!valida) {
          erro.textContent = q.correta === null || (alternativas.length >= 2 && correta === null)
            ? `A questão ${q.numero} está sem resposta certa marcada.`
            : `A questão ${q.numero} precisa de enunciado e de pelo menos 2 alternativas preenchidas.`;
          const li = lista.children[pos];
          if (li) {
            li.scrollIntoView({ block: 'center' });
            li.querySelector('textarea').focus({ preventScroll: true });
          }
          return;
        }
        prontas.push(valida);
      }
      if (!prontas.length) return (erro.textContent = 'Não sobrou nenhuma questão. Volte e escolha outro arquivo.');
      const minutos = r.porQuestao ? r.porQuestao * prontas.length : 0;
      const titulo = r.titulo.trim().slice(0, 120);

      if (r.destino === 'curso') {
        botaoSalvar.disabled = true;
        try {
          await Nuvem.rest('POST', 'provas_curso', {
            corpo: { trilha_id: r.trilhaId, titulo, minutos: minutos || null, questoes: prontas.map(({ enunciado, alternativas, correta, explicacao }) => ({ enunciado, alternativas, correta, explicacao })) },
            prefer: 'return=minimal',
          });
        } catch (e) {
          botaoSalvar.disabled = false;
          erro.textContent = /provas_curso|does not exist|schema cache/i.test(e.message)
            ? 'O banco ainda não tem a tabela de provas: rode de novo o supabase/setup.sql no Supabase (docs/SUPABASE.md).'
            : `Não deu para publicar: ${e.message}`;
          return;
        }
        cursoCache.delete(r.trilhaId);
        toast('Prova publicada!', `Os alunos de ${nomeCurso(r.trilhaId)} já podem fazer.`, 'i-check');
      } else {
        const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const d = ler();
        d.provas.unshift({
          id, trilhaId: r.trilhaId, titulo, criadaEm: Date.now(), honesto: r.honesto === true, minutos,
          questoes: prontas.map((q, i) => ({ ...q, id: `${id}-${i + 1}` })), tentativas: [],
        });
        if (!gravar(d)) return (erro.textContent = 'Não consegui salvar a prova neste aparelho (o armazenamento pode estar cheio ou bloqueado).');
        toast('Prova salva!', r.honesto ? 'Bora mergulhar? Ela está no Simulado e vale XP.' : 'Ela está no Simulado. Sem pontos, mas com todo o treino.', 'i-check');
      }
      if (App.trilhaAtual().id !== r.trilhaId) App.definirTrilha(r.trilhaId);
      rascunho = null;
      App.irPara('simulado');
    }

    const botaoSalvar = h('button', { type: 'button', class: 'botao botao--primario', onclick: salvar }, icone('i-check'), r.destino === 'curso' ? 'Publicar para os alunos' : 'Salvar prova');
    tela.replaceChildren(
      h('header', { class: 'area-cabeca' },
        h('span', { class: 'rotulo', text: `Upload de prova · ${nomeCurso(r.trilhaId)}` }),
        h('h1', { id: 'upload-prova-titulo', tabindex: '-1', text: 'Confira a prova' }),
        h('p', { class: 'area-cabeca__sub', text: `Encontrei ${plural(r.questoes.length, 'questão', 'questões')} em "${r.titulo}". Corrija o que o leitor entendeu errado e marque a resposta certa quando faltar.` })),
      r.avisos.length ? h('div', { class: 'aviso', role: 'note' }, h('strong', { text: 'Atenção' }), h('ul', {}, r.avisos.map((a) => h('li', { text: a })))) : null,
      status,
      lista,
      h('div', { class: 'conferir__rodape' },
        erro,
        h('div', { class: 'acoes-linha' },
          h('button', { type: 'button', class: 'botao botao--secundario', onclick: () => {
            rascunho.etapa = 'arquivo';
            desenhar(tela);
          } }, 'Voltar'),
          botaoSalvar)));
  }

  return { renderLista, renderUpload, comecar, registrarTentativa, CHAVE };
})();

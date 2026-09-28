/*
 * biblioteca.js — área "Biblioteca":
 *  - Cursos e trilhas: ver, estudar, exportar, importar, criar colando texto, remover importadas
 *  - PDFs: guardados no navegador (IndexedDB), com busca, filtro por trilha, leitor e anotações
 */
const Biblioteca = (() => {
  const { h, icone, limpar } = UI;
  const LIMITE_MB = 30;

  /* =========================================================
     CURSOS E TRILHAS
     ========================================================= */
  function renderCursos(secao) {
    limpar(secao);
    const lista = h('div', { class: 'cursos' });
    const inputImportar = h('input', { type: 'file', accept: '.json,application/json', multiple: true, class: 'visualmente-oculto', onchange: async (e) => {
      const arquivos = [...e.target.files];
      if (!arquivos.length) return;
      const { ok, erros } = await Trilhas.importarArquivos(arquivos);
      if (ok.length) UI.toast('Trilha carregada', ok.join(', '), 'i-upload');
      if (erros.length) UI.toast('Arquivo com problema', `${erros[0].origem}: ${erros[0].erros[0]}`, 'i-x');
      await App.recarregarTrilhas();
      renderCursos(secao);
    } });

    secao.append(
      UI.cabecalho('Biblioteca', 'Cursos e trilhas', 'Todo o seu conteúdo de estudo. Cada trilha vira jogo na Sala de Jogos.'),
      h('div', { class: 'acoes-linha' },
        h('label', { class: 'botao botao--secundario' }, icone('i-upload'), 'Importar trilha (.json)', inputImportar),
        h('button', { type: 'button', class: 'botao botao--fantasma', onclick: () => {
          const painel = document.getElementById('criar-trilha');
          painel.open = true;
          painel.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
          painel.querySelector('input').focus({ preventScroll: true });
        } }, icone('i-mais'), 'Criar trilha colando texto')),
      lista,
      formCriar(secao));

    App.trilhas().forEach((t) => {
      const prog = Progresso.carregar(t.id);
      const nivel = Progresso.nivel(prog.xp);
      const concluidas = t.fases.filter((f) => prog.fases[f.id] && prog.fases[f.id].concluida).length;
      const importada = Trilhas.ehImportada(t.id);
      const extras = ['pares', 'verdadeiroFalso', 'adivinhas', 'sequencias', 'palavras'].filter((b) => Array.isArray(t[b]) && t[b].length).length;
      lista.append(h('article', { class: 'cartao curso' },
        h('div', { class: 'curso__cabeca' },
          h('span', { class: 'rotulo', text: t.categoria || 'Trilha' }),
          importada ? h('span', { class: 'chip', text: 'Importada' }) : h('span', { class: 'chip', text: 'Do projeto' })),
        h('h2', { class: 'curso__nome', text: t.nome }),
        h('p', { class: 'curso__descricao', text: t.descricao }),
        h('ul', { class: 'curso__numeros' },
          h('li', {}, h('strong', { text: String(t.questoes.length) }), 'questões'),
          h('li', {}, h('strong', { text: `${concluidas}/${t.fases.length}` }), 'fases'),
          h('li', {}, h('strong', { text: `Nv. ${nivel.numero}` }), `${prog.xp} XP`),
          h('li', {}, h('strong', { text: String(extras) }), 'tipos extras de carta')),
        h('div', { class: 'curso__acoes' },
          h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => App.abrirTrilha(t.id) }, 'Estudar'),
          h('a', { class: 'botao botao--fantasma botao--pequeno', href: '#jogos', onclick: () => App.definirTrilha(t.id) }, icone('i-controle'), 'Jogar'),
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => UI.baixarArquivo(`${t.id}.json`, JSON.stringify(t, null, 2)) }, icone('i-download'), 'Exportar'),
          importada ? h('button', { type: 'button', class: 'botao botao--link botao--pequeno', onclick: async () => {
            if (!window.confirm(`Remover a trilha "${t.nome}" deste navegador? O progresso dela continua guardado.`)) return;
            Trilhas.removerImportada(t.id);
            await App.recarregarTrilhas();
            renderCursos(secao);
          } }, icone('i-lixo'), 'Remover') : null)));
    });
    if (!App.trilhas().length) lista.append(UI.vazio('Nenhuma trilha ainda. Importe um arquivo .json ou crie uma colando texto.'));
  }

  /** Criar trilha colando linhas "pergunta | certa | errada | errada..." (D23, versão simples). */
  function formCriar(secao) {
    const nome = h('input', { class: 'campo', required: true, maxlength: '80', placeholder: 'Ex.: Inglês: verbos irregulares', 'aria-label': 'Nome da trilha' });
    const categoria = h('input', { class: 'campo', maxlength: '30', placeholder: 'Ex.: Faculdade', 'aria-label': 'Categoria' });
    const tema = h('input', { class: 'campo', maxlength: '40', placeholder: 'Ex.: Inglês', 'aria-label': 'Tema das questões' });
    const texto = h('textarea', { class: 'campo campo--area', rows: '8', required: true, 'aria-label': 'Questões, uma por linha',
      placeholder: 'Qual é o passado de "go"? | went | goed | gone | going\nQual é o passado de "see"? | saw | seed | seen\n...' });
    const previa = h('div', { class: 'previa', 'aria-live': 'polite' });

    function ler() {
      const linhas = texto.value.split('\n').map((l) => l.trim()).filter(Boolean);
      const questoes = [];
      const erros = [];
      linhas.forEach((l, n) => {
        const partes = l.split('|').map((p) => p.trim()).filter(Boolean);
        if (partes.length < 3) return erros.push(`Linha ${n + 1}: precisa de pergunta, resposta certa e pelo menos uma errada.`);
        if (partes.length > 7) return erros.push(`Linha ${n + 1}: no máximo 5 alternativas erradas.`);
        const [enunciado, certa, ...erradas] = partes;
        questoes.push({ enunciado, certa, erradas });
      });
      return { questoes, erros };
    }

    function montar(questoes) {
      const id = `minha-${UI.normalizar(nome.value).replace(/ /g, '-').slice(0, 40) || 'trilha'}-${Date.now().toString(36)}`;
      const FASES = [
        { id: 'raso', nome: 'Raso', profundidade: '0–10 m' },
        { id: 'recife', nome: 'Recife', profundidade: '10–40 m' },
        { id: 'caverna', nome: 'Caverna', profundidade: '40–200 m' },
        { id: 'abismo', nome: 'Abismo', profundidade: '200 m+' },
      ];
      const nFases = Math.min(4, Math.max(1, Math.ceil(questoes.length / 3)));
      const porFase = Math.ceil(questoes.length / nFases);
      const fases = FASES.slice(0, nFases);
      const DIF = ['facil', 'medio', 'dificil', 'dificil'];
      return {
        id, nome: nome.value.trim(), descricao: `Trilha criada por você com ${questoes.length} questões.`, categoria: categoria.value.trim() || 'Minhas trilhas',
        fases,
        questoes: questoes.map((q, k) => {
          const f = Math.min(nFases - 1, Math.floor(k / porFase));
          return {
            id: `${id}-q${k + 1}`, tema: tema.value.trim() || nome.value.trim(), dificuldade: DIF[f], fase: fases[f].id,
            enunciado: q.enunciado, alternativas: [q.certa, ...q.erradas], correta: 0,
            explicacao: `A resposta certa é: ${q.certa}.`,
          };
        }),
      };
    }

    function verPrevia() {
      const { questoes, erros } = ler();
      previa.replaceChildren(...[
        questoes.length ? h('p', { class: 'texto-sucesso', text: `${UI.plural(questoes.length, 'questão pronta', 'questões prontas')} (as alternativas são embaralhadas no jogo).` }) : null,
        erros.length ? h('ul', { class: 'texto-erro' }, erros.slice(0, 5).map((e) => h('li', { text: e }))) : null].filter(Boolean));
    }

    return h('details', { class: 'cartao criar-trilha', id: 'criar-trilha' },
      h('summary', {}, icone('i-mais'), h('strong', { text: 'Criar trilha colando texto' }), h('span', { class: 'texto-suave', text: ' · uma questão por linha' })),
      h('form', { class: 'criar-trilha__form', onsubmit: async (e) => {
        e.preventDefault();
        const { questoes, erros } = ler();
        if (!nome.value.trim() || !questoes.length) return verPrevia();
        if (erros.length && !window.confirm(`${UI.plural(erros.length, 'linha tem', 'linhas têm')} problema e vão ficar de fora. Criar mesmo assim?`)) return;
        const trilha = montar(questoes);
        const problemas = Trilhas.validar(trilha);
        if (problemas.length) {
          previa.replaceChildren(h('p', { class: 'texto-erro', text: problemas[0] }));
          return;
        }
        Trilhas.salvarImportada(trilha);
        await App.recarregarTrilhas();
        App.definirTrilha(trilha.id);
        UI.toast('Trilha criada!', trilha.nome, 'i-check');
        renderCursos(secao);
      } },
      h('p', { class: 'texto-suave' }, 'Formato: ', h('code', { text: 'pergunta | resposta certa | errada | errada' }), '. As questões são divididas em fases (Raso, Recife, Caverna, Abismo) na ordem em que aparecem.'),
      h('div', { class: 'form-evento__linha' },
        h('label', { class: 'form-linha__grande' }, h('span', { class: 'rotulo-campo', text: 'Nome da trilha' }), nome),
        h('label', {}, h('span', { class: 'rotulo-campo', text: 'Categoria' }), categoria),
        h('label', {}, h('span', { class: 'rotulo-campo', text: 'Tema' }), tema)),
      h('label', {}, h('span', { class: 'rotulo-campo', text: 'Questões' }), texto),
      h('div', { class: 'acoes-linha' },
        h('button', { type: 'button', class: 'botao botao--fantasma', onclick: verPrevia }, 'Conferir'),
        h('button', { type: 'submit', class: 'botao botao--primario' }, icone('i-check'), 'Criar trilha')),
      previa));
  }

  /* =========================================================
     PDFs (IndexedDB)
     ========================================================= */
  let banco = null;
  function abrirBanco() {
    if (banco) return Promise.resolve(banco);
    return new Promise((ok, falha) => {
      if (!('indexedDB' in window)) return falha(new Error('sem IndexedDB'));
      const pedido = indexedDB.open('diver', 1);
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        if (!db.objectStoreNames.contains('pdfs')) db.createObjectStore('pdfs', { keyPath: 'id' });
      };
      pedido.onsuccess = () => ok((banco = pedido.result));
      pedido.onerror = () => falha(pedido.error);
    });
  }
  async function operar(modo, fn) {
    const db = await abrirBanco();
    return new Promise((ok, falha) => {
      const tx = db.transaction('pdfs', modo);
      const req = fn(tx.objectStore('pdfs'));
      tx.oncomplete = () => ok(req && req.result);
      tx.onerror = () => falha(tx.error);
      tx.onabort = () => falha(tx.error);
    });
  }
  const listarPdfs = () => operar('readonly', (s) => s.getAll());
  const obterPdf = (id) => operar('readonly', (s) => s.get(id));
  const gravarPdf = (item) => operar('readwrite', (s) => s.put(item));
  const apagarPdf = (id) => operar('readwrite', (s) => s.delete(id));

  const estadoPdf = { busca: '', trilha: '', aberto: null, url: null };

  function tamanho(bytes) {
    return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  async function renderPdfs(secao) {
    limpar(secao);
    const lista = h('div', { class: 'pdfs', 'aria-live': 'polite' });
    const leitor = h('div', { class: 'leitor', hidden: true });
    const input = h('input', { type: 'file', accept: 'application/pdf,.pdf', multiple: true, class: 'visualmente-oculto', onchange: enviar });
    const busca = h('input', { class: 'campo', type: 'search', placeholder: 'Buscar pelo nome…', value: estadoPdf.busca, 'aria-label': 'Buscar PDFs pelo nome',
      oninput: (e) => { estadoPdf.busca = e.target.value; desenhar(); } });
    const filtro = h('select', { 'aria-label': 'Filtrar por trilha', onchange: (e) => { estadoPdf.trilha = e.target.value; desenhar(); } },
      h('option', { value: '', text: 'Todas as trilhas' }), App.trilhas().map((t) => h('option', { value: t.id, selected: estadoPdf.trilha === t.id, text: t.nome })));

    secao.append(
      UI.cabecalho('Biblioteca', 'PDFs', `Guarde apostilas e resumos (até ${LIMITE_MB} MB cada). Ficam salvos só neste navegador.`),
      h('div', { class: 'acoes-linha' }, h('label', { class: 'botao botao--primario' }, icone('i-upload'), 'Enviar PDF', input), busca, filtro),
      leitor, lista);

    try {
      await abrirBanco();
    } catch (e) {
      lista.replaceChildren(UI.vazio('Este navegador não deixa guardar arquivos (talvez esteja em modo privado). Os PDFs não vão funcionar aqui.'));
      return;
    }

    async function enviar(e) {
      const arquivos = [...e.target.files];
      for (const arq of arquivos) {
        if (arq.type !== 'application/pdf' && !arq.name.toLowerCase().endsWith('.pdf')) {
          UI.toast('Não é PDF', arq.name, 'i-x');
          continue;
        }
        if (arq.size > LIMITE_MB * 1048576) {
          UI.toast('Arquivo grande demais', `${arq.name} passa de ${LIMITE_MB} MB.`, 'i-x');
          continue;
        }
        try {
          await gravarPdf({ id: UI.id('pdf'), nome: arq.name.replace(/\.pdf$/i, ''), tamanho: arq.size, trilhaId: estadoPdf.trilha || (App.trilhaAtual() && App.trilhaAtual().id) || '', criadoEm: Date.now(), arquivo: arq, notas: '' });
          UI.toast('PDF guardado', arq.name, 'i-arquivo');
        } catch (err) {
          UI.toast('Não deu para guardar', 'O navegador recusou (espaço cheio?).', 'i-x');
        }
      }
      e.target.value = '';
      desenhar();
    }

    async function desenhar() {
      const todos = (await listarPdfs()).sort((a, b) => b.criadoEm - a.criadoEm);
      const termo = UI.normalizar(estadoPdf.busca);
      const filtrados = todos.filter((p) => (!termo || UI.normalizar(p.nome).includes(termo)) && (!estadoPdf.trilha || p.trilhaId === estadoPdf.trilha));
      limpar(lista);
      if (!todos.length) return lista.append(UI.vazio('Sua estante está vazia. Envie o primeiro PDF e ele fica guardado aqui.'));
      if (!filtrados.length) return lista.append(h('p', { class: 'texto-suave', text: 'Nenhum PDF com esse filtro.' }));
      filtrados.forEach((p) => {
        lista.append(h('article', { class: 'pdf' },
          h('span', { class: 'pdf__icone', 'aria-hidden': 'true' }, icone('i-arquivo')),
          h('div', { class: 'pdf__info' },
            h('strong', { class: 'pdf__nome', text: p.nome }),
            h('span', { class: 'texto-suave', text: `${tamanho(p.tamanho)} · ${new Date(p.criadoEm).toLocaleDateString('pt-BR')}${p.notas ? ' · com anotações' : ''}` }),
            h('label', { class: 'pdf__trilha' }, h('span', { class: 'visualmente-oculto', text: `Trilha de ${p.nome}` }),
              h('select', { onchange: async (e) => { p.trilhaId = e.target.value; await gravarPdf(p); } },
                h('option', { value: '', text: 'Sem trilha' }), App.trilhas().map((t) => h('option', { value: t.id, selected: p.trilhaId === t.id, text: t.nome }))))),
          h('div', { class: 'pdf__acoes' },
            h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', onclick: () => abrir(p.id) }, 'Abrir'),
            h('button', { type: 'button', class: 'botao-icone', 'aria-label': `Excluir ${p.nome}`, onclick: async () => {
              if (!window.confirm(`Excluir "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
              if (estadoPdf.aberto === p.id) fechar();
              await apagarPdf(p.id);
              desenhar();
            } }, icone('i-lixo')))));
      });
    }

    function fechar() {
      if (estadoPdf.url) URL.revokeObjectURL(estadoPdf.url);
      estadoPdf.url = null;
      estadoPdf.aberto = null;
      leitor.hidden = true;
      limpar(leitor);
    }

    async function abrir(id) {
      const p = await obterPdf(id);
      if (!p) return;
      fechar();
      estadoPdf.aberto = id;
      estadoPdf.url = URL.createObjectURL(p.arquivo);
      let espera = null;
      const notas = h('textarea', { class: 'campo campo--area', rows: '6', placeholder: 'Suas anotações sobre este PDF (salvam sozinhas)…', 'aria-label': `Anotações de ${p.nome}`, value: p.notas || '',
        oninput: (e) => {
          clearTimeout(espera);
          const txt = e.target.value;
          espera = setTimeout(async () => { p.notas = txt; await gravarPdf(p); salvo.textContent = 'Anotações salvas.'; }, 600);
        } });
      const salvo = h('p', { class: 'texto-suave', 'aria-live': 'polite' });
      leitor.append(
        h('div', { class: 'leitor__barra' },
          h('h2', { class: 'leitor__titulo', tabindex: '-1', text: p.nome }),
          h('a', { class: 'botao botao--fantasma botao--pequeno', href: estadoPdf.url, target: '_blank', rel: 'noopener' }, 'Abrir em nova aba'),
          h('button', { type: 'button', class: 'botao-icone', 'aria-label': 'Fechar leitor', onclick: fechar }, icone('i-x'))),
        h('div', { class: 'leitor__corpo' },
          h('iframe', { class: 'leitor__pdf', src: estadoPdf.url, title: `PDF: ${p.nome}` }),
          h('div', { class: 'leitor__notas' }, h('h3', { text: 'Anotações' }), notas, salvo,
            h('p', { class: 'texto-suave', text: 'Dica: no celular, se o PDF não aparecer aqui, use "Abrir em nova aba".' }))));
      leitor.hidden = false;
      leitor.querySelector('h2').focus();
      leitor.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
    }

    desenhar();
  }

  return { renderCursos, renderPdfs };
})();

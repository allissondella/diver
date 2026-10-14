/*
 * jogos/lupa-do-codigo.js — laboratório "Mão na massa" Lupa do Código (Explora Tech, Módulo 2, 2026-10-14).
 *
 * O programa roda linha a linha, como numa câmera lenta: a linha da vez fica acesa e as variáveis aparecem
 * como caixinhas com o tipo (int, float, str, bool). Antes de algumas linhas, o aluno PREVÊ o que vai
 * acontecer: o valor de uma variável depois da linha ("valor") ou qual linha roda em seguida ("linha").
 * O rastreio é do Python de verdade, gravado no JSON pelo scripts/conferir-laboratorios.mjs --gravar
 * (que também confere que ele bate com o Python e que cada pergunta tem uma só opção certa). Por isso a Lupa
 * abre na hora, no computador e no celular, sem baixar o Python.
 * Missões: data/laboratorios/<curso>/lupa-do-codigo.json
 *   { id, aulas, grupo, titulo, enunciado, codigo, perguntas: [{ linha, vez?, tipo?: 'valor'|'linha', variavel?, opcoes, porque }],
 *     passos (gerado), saidaFinal (gerado) }
 * Estrelas: 3 = acertou todas as previsões; 2 = metade ou mais; 1 = chegou ao fim.
 */
Jogos.registrar({
  id: 'lupa-do-codigo',
  nome: 'Lupa do Código',
  grupo: 'laboratorios',
  icone: 'i-lupa',
  largo: true,
  duracao: '5-10 min',
  descricao: 'Mão na massa: veja o programa rodar linha a linha e adivinhe o que vai acontecer antes de cada passo.',
  requer: { laboratorios: 1 },
  temConteudo: (cartas) => (cartas.laboratorios || []).includes('lupa-do-codigo'),

  iniciar(ctx) {
    const { h, icone, limpar } = UI;
    const trilha = ctx.trilha;
    const inicio = Date.now();
    const tentativas = new Map();
    let lab = null;
    let missoes = [];
    let idx = 0;
    let destruido = false;
    let telas = {};
    let estado = null; // { s, respostas: Map(chave → acertou) }
    let inicioMissao = Date.now();

    limpar(ctx.container).append(h('div', { class: 'lab-carregando', role: 'status' }, UI.mascote('mascote--pensando'), h('p', { text: 'Preparando o laboratório…' })));
    Laboratorios.carregar(trilha.id, 'lupa-do-codigo').then((dados) => {
      if (destruido) return;
      lab = dados;
      const daAula = ctx.opcoes.fase ? lab.missoes.filter((m) => (m.aulas || []).includes(ctx.opcoes.fase)) : [];
      missoes = daAula.length ? daAula : lab.missoes;
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const pendente = missoes.findIndex((m) => !(prog[m.id] && prog[m.id].estrelas >= 3));
      idx = pendente >= 0 ? pendente : 0;
      montar();
    }).catch((e) => {
      console.error(e);
      if (!destruido) limpar(ctx.container).append(UI.vazio('Não deu para abrir o laboratório', 'Confira a internet e tente de novo.'));
    });

    /** A pergunta que vem antes do passo s (a linha da vez, na vez certa), se houver. */
    function perguntaDo(m, s) {
      const p = m.passos[s];
      if (!p || p.linha === null) return null;
      const vez = m.passos.slice(0, s + 1).filter((x) => x.linha === p.linha).length;
      return (m.perguntas || []).find((q) => q.linha === p.linha && (q.vez || 1) === vez) || null;
    }
    /** A resposta certa de uma pergunta, olhando o passo seguinte do rastreio. */
    function certaDe(m, s, q) {
      const depois = m.passos[s + 1];
      if (q.tipo === 'linha') return depois && depois.linha !== null ? String(depois.linha) : 'fim';
      return depois && depois.variaveis[q.variavel] ? depois.variaveis[q.variavel].valor : '';
    }

    function montar() {
      const m = missoes[idx];
      const prog = Laboratorios.progresso(trilha.id, lab.id);
      const melhor = prog[m.id] ? prog[m.id].estrelas : 0;
      inicioMissao = Date.now();
      estado = { s: 0, respostas: new Map(), respondida: false };
      telas.resultado = h('div', { class: 'lab-resultado', 'aria-live': 'polite' });
      telas.codigo = h('ol', { class: 'lupa-codigo', 'aria-label': 'O programa, linha a linha' },
        m.codigo.replace(/\n$/, '').split('\n').map((linha, i) => h('li', { class: 'lupa-codigo__linha', 'data-linha': String(i + 1) },
          h('span', { class: 'lupa-codigo__n', 'aria-hidden': 'true', text: String(i + 1) }),
          h('code', { class: 'lupa-codigo__texto', text: linha || ' ' }))));
      telas.variaveis = h('div', { class: 'lupa-vars', 'aria-live': 'polite' });
      telas.saida = h('pre', { class: 'lupa-saida', 'aria-label': 'Saída do programa' });
      telas.pergunta = h('div', { class: 'lupa-pergunta', 'aria-live': 'polite' });
      telas.avancar = h('button', { type: 'button', class: 'botao botao--primario botao--pequeno', id: 'lupa-avancar', onclick: avancar }, icone('i-seta-dir'), 'Rodar a linha');
      telas.situacao = h('span', { class: 'lab-janela__atalho', 'aria-live': 'polite' });

      const missaoNav = h('nav', { class: 'lab-missoes', 'aria-label': 'Missões do laboratório' },
        missoes.map((mm, i) => {
          const e = prog[mm.id] ? prog[mm.id].estrelas : 0;
          return h('button', {
            type: 'button', class: `lab-missao ${i === idx ? 'lab-missao--atual' : ''}`, 'aria-current': i === idx ? 'step' : null,
            'aria-label': `Missão ${i + 1}: ${mm.titulo}. ${e ? `${e} de 3 estrelas` : 'ainda não feita'}`,
            onclick: () => { idx = i; montar(); },
          }, h('span', { class: 'lab-missao__n', text: String(i + 1) }), Laboratorios.estrelas(e, false));
        }));

      const janela = Laboratorios.janela({
        arquivo: 'programa.py · em câmera lenta',
        corpo: h('div', { class: 'lupa-janela' }, telas.codigo),
        acoes: [telas.avancar,
          h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => montar() }, icone('i-revisao'), 'Recomeçar'),
          telas.situacao],
      });

      limpar(ctx.container).append(h('div', { class: 'lab lab-lupa' },
        h('header', { class: 'lab__cabeca' },
          h('div', { class: 'lab__topo' },
            h('p', { class: 'rotulo', text: m.grupo || 'Missão' }),
            h('button', { type: 'button', class: 'botao botao--link botao--pequeno', id: 'lab-como', onclick: () => tutorial(true) }, icone('i-bolha'), 'Como funciona?')),
          h('h2', { class: 'lab__titulo' }, m.titulo, melhor ? Laboratorios.estrelas(melhor) : null),
          h('p', { class: 'lab__enunciado' }, UI.marcado(m.enunciado)),
          h('div', { class: 'lab__barra' }, h('span', { class: 'lab__barra-rotulo', text: `Missão ${idx + 1} de ${missoes.length}` }), missaoNav)),
        h('div', { class: 'lab__corpo lab__corpo--inverso' },
          h('section', { class: 'lab__bancada', 'aria-label': 'O programa e a sua previsão' }, janela, telas.pergunta, telas.resultado),
          h('aside', { class: 'lab__apoio', 'aria-label': 'Variáveis e saída' },
            Laboratorios.cartao({ id: 'lupa-variaveis', icone: 'i-bau', titulo: 'Variáveis', conteudo: [telas.variaveis,
              h('p', { class: 'lab-apoio__texto lupa-legenda' }, ...['int', 'float', 'str', 'bool'].map((t) => h('span', { class: `lupa-tipo lupa-tipo--${t}`, text: t })), ' cada tipo tem a sua cor')] }),
            Laboratorios.cartao({ id: 'lupa-saida-cartao', icone: 'i-codigo', titulo: 'Saída', conteudo: telas.saida }))),
        h('footer', { class: 'lab__pe' },
          h('div', { class: 'lab__pe-acoes' },
            h('button', { type: 'button', class: 'botao botao--secundario', id: 'lab-concluir', onclick: concluir }, icone('i-check'), 'Concluir laboratório')))));
      mostrar();
      tutorial(false);
    }

    /** Desenha o passo atual: linha acesa, variáveis (as que mudaram piscam), saída e a pergunta, se houver. */
    function mostrar(anterior = null) {
      const m = missoes[idx];
      const p = m.passos[estado.s];
      telas.codigo.querySelectorAll('.lupa-codigo__linha').forEach((li) => {
        const atual = p.linha !== null && Number(li.dataset.linha) === p.linha;
        li.classList.toggle('lupa-codigo__linha--atual', atual);
        if (atual) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      const atual = telas.codigo.querySelector('.lupa-codigo__linha--atual');
      if (atual) atual.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
      const nomes = Object.keys(p.variaveis);
      telas.variaveis.replaceChildren(...(nomes.length ? nomes.map((nome) => {
        const v = p.variaveis[nome];
        const mudou = anterior && (!anterior.variaveis[nome] || anterior.variaveis[nome].valor !== v.valor);
        return h('div', { class: `lupa-var lupa-tipo--${['int', 'float', 'str', 'bool'].includes(v.tipo) ? v.tipo : 'outro'} ${mudou ? 'lupa-var--mudou' : ''}`.trim() },
          h('span', { class: 'lupa-var__nome', text: nome }),
          h('code', { class: 'lupa-var__valor', text: v.valor }),
          h('span', { class: 'lupa-var__tipo', text: v.tipo }));
      }) : [h('p', { class: 'lab-apoio__texto', text: 'Ainda nenhuma variável: elas aparecem quando o programa cria.' })]));
      telas.saida.textContent = m.saidaFinal.slice(0, p.saida) || ' ';
      const total = m.passos.length - 1;
      telas.situacao.textContent = p.linha === null ? 'Fim do programa' : `Passo ${estado.s + 1} de ${total}`;

      const q = perguntaDo(m, estado.s);
      const chave = `${estado.s}`;
      telas.pergunta.replaceChildren();
      if (p.linha === null) { terminar(); return; }
      if (q && !estado.respostas.has(chave)) {
        telas.avancar.disabled = true;
        telas.avancar.replaceChildren(icone('i-seta-dir'), `Rodar a linha ${p.linha}`);
        const enunciado = q.tipo === 'linha'
          ? `A linha ${p.linha} vai rodar. Qual linha roda depois dela?`
          : `A linha ${p.linha} vai rodar. Quanto vai valer ${q.variavel} depois dela?`;
        telas.pergunta.append(h('div', { class: 'lupa-pergunta__caixa' },
          h('p', { class: 'lupa-pergunta__titulo' }, icone('i-lupa'), 'Sua previsão'),
          h('p', { class: 'lupa-pergunta__texto' }, enunciado),
          h('div', { class: 'lupa-opcoes', role: 'group', 'aria-label': 'Opções' }, (q.opcoes || []).map((o) => h('button', {
            type: 'button', class: 'lupa-opcao', onclick: (e) => responder(q, String(o), e.currentTarget),
          }, q.tipo === 'linha' ? (String(o) === 'fim' ? 'O programa termina' : `Linha ${o}`) : h('code', { text: String(o) }))))));
        const primeira = telas.pergunta.querySelector('.lupa-opcao');
        if (primeira) primeira.focus({ preventScroll: true });
      } else {
        telas.avancar.disabled = false;
        telas.avancar.replaceChildren(icone('i-seta-dir'), `Rodar a linha ${p.linha}`);
      }
    }

    function responder(q, escolha, botao) {
      const m = missoes[idx];
      const certa = certaDe(m, estado.s, q);
      const acertou = escolha === certa;
      estado.respostas.set(`${estado.s}`, acertou);
      telas.pergunta.querySelectorAll('.lupa-opcao').forEach((b) => { b.disabled = true; });
      botao.classList.add(acertou ? 'lupa-opcao--certa' : 'lupa-opcao--errada');
      if (!acertou) {
        const certaBotao = [...telas.pergunta.querySelectorAll('.lupa-opcao')].find((b) => (q.tipo === 'linha' ? b.textContent === (certa === 'fim' ? 'O programa termina' : `Linha ${certa}`) : b.textContent === certa));
        if (certaBotao) certaBotao.classList.add('lupa-opcao--certa');
      }
      UI.humorMascote(ctx.container, acertou ? 'feliz' : 'triste');
      telas.pergunta.querySelector('.lupa-pergunta__caixa').append(h('p', { class: acertou ? 'lupa-pergunta__certo' : 'lupa-pergunta__errado', role: 'status' },
        h('strong', { text: acertou ? 'Mandou bem, Diver! ' : 'Quase! ' }),
        q.porque || (q.tipo === 'linha' ? `Depois da linha ${missoes[idx].passos[estado.s].linha}, roda ${certa === 'fim' ? 'o fim do programa' : `a linha ${certa}`}.` : `${q.variavel} passa a valer ${certa}.`)));
      telas.avancar.disabled = false;
      telas.avancar.focus({ preventScroll: true });
    }

    function avancar() {
      const m = missoes[idx];
      if (telas.avancar.disabled || estado.s >= m.passos.length - 1) return;
      const anterior = m.passos[estado.s];
      estado.s++;
      mostrar(anterior);
    }

    function terminar() {
      const m = missoes[idx];
      telas.avancar.disabled = true;
      const total = (m.perguntas || []).length;
      const acertos = [...estado.respostas.values()].filter(Boolean).length;
      const estrelas = acertos === total ? 3 : acertos * 2 >= total ? 2 : 1;
      const { antes, agora } = Laboratorios.registrar(trilha.id, lab.id, m.id, estrelas);
      const t = tentativas.get(m.id) || { missao: m, resolvida: false, estrelas: 0, tempoMs: 0 };
      t.resolvida = true;
      t.estrelas = Math.max(t.estrelas, estrelas);
      t.tempoMs = Date.now() - inicioMissao;
      tentativas.set(m.id, t);
      const progAgora = Laboratorios.progresso(trilha.id, lab.id);
      const todasDaAula = ctx.opcoes.fase && missoes.every((mm) => progAgora[mm.id] && progAgora[mm.id].estrelas >= 1);
      if (todasDaAula) Laboratorios.marcarAula(trilha.id, lab.id, ctx.opcoes.fase);
      UI.humorMascote(ctx.container, 'feliz');
      const proxima = idx < missoes.length - 1;
      const falta = estrelas < 3 ? 'Para a 3ª estrela, acerte todas as previsões: dá para recomeçar quantas vezes quiser.' : 'Você leu o programa como o computador lê.';
      telas.resultado.replaceChildren(h('div', { class: 'lab-sucesso', role: 'status' },
        h('p', { class: 'lab-sucesso__titulo' }, icone('i-check'), `Fim do programa! ${acertos} de ${total} previsões certas.`),
        Laboratorios.estrelas(estrelas),
        h('p', { class: 'texto-suave', text: agora > antes ? `${falta} Nova marca: ${agora} de 3.` : falta }),
        h('div', { class: 'acoes-linha' },
          proxima ? h('button', { type: 'button', class: 'botao botao--primario', id: 'lab-proxima', onclick: () => { idx++; montar(); } }, 'Próxima missão', icone('i-seta-dir'))
            : h('button', { type: 'button', class: 'botao botao--primario', id: 'lab-fim', onclick: concluir }, icone('i-check'), todasDaAula ? 'Concluir e seguir para a próxima aula' : 'Concluir laboratório'))));
      const botao = telas.resultado.querySelector('button');
      if (botao) botao.focus({ preventScroll: true });
    }

    function concluir() {
      ctx.aoTerminar(Laboratorios.resultado({ trilha, lab, inicio, tentativas: [...tentativas.values()] }));
    }

    function tutorial(forcar) {
      if (typeof Tutorial === 'undefined' || !Tutorial.guiar) return;
      Tutorial.guiar('lab-lupa', [
        { desenho: 'lupa', titulo: 'O programa em câmera lenta', texto: 'Aqui o programa roda uma linha por vez, e você vê tudo o que acontece dentro do computador.' },
        { alvo: '.lupa-codigo', desenho: 'livro', titulo: 'A linha da vez', texto: 'A linha acesa é a próxima a rodar. Aperte "Rodar a linha" para ela acontecer.' },
        { alvo: '#lupa-variaveis', desenho: 'quadro', titulo: 'As variáveis', texto: 'Cada variável é uma caixinha com o nome, o valor e o tipo. Quando o valor muda, a caixinha pisca.' },
        { alvo: '.lupa-pergunta', desenho: 'alvo', titulo: 'Sua previsão', texto: 'Antes de algumas linhas, adivinhe o que vai acontecer. Acertar tudo vale 3 estrelas.' },
      ], { forcar });
    }

    return { destruir() { destruido = true; } };
  },
});

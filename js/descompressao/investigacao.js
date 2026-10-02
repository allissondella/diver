/*
 * Investigação (Sala de Descompressão) — um mistério por dia a bordo do Navio Aurora, o mesmo para todo mundo.
 * - 8 suspeitos, 8 armas e 8 cômodos. A solução (quem, com o quê, onde) e as pistas saem da data:
 *   cada dia é um caso novo, e todo mundo da plataforma investiga o mesmo.
 * - Revistar um cômodo revela as pistas escondidas nele. Cada pista descarta um suspeito, uma arma ou um
 *   cômodo (21 pistas, espalhadas pelos 8 cômodos). O caderno é seu: marque X no que já caiu.
 * - Duas acusações por dia. Errou? Eu conto quantas das três escolhas estavam certas.
 * - Pontos (só no placar da sala): 1000 − 70 por cômodo revistado − 300 por acusação errada (mínimo 100).
 */
(() => {
  const { h, icone, plural } = UI;

  const SUSPEITOS = [
    { id: 'marina', nome: 'Capitã Marina', papel: 'comandante do Aurora', alibis: [
      'A Capitã Marina passou a noite na sala de rádio falando com a guarda costeira. A gravação tem a voz dela minuto a minuto.',
      'A Capitã Marina jogou xadrez com o imediato da meia-noite às 2h e perdeu três partidas seguidas. Não saiu da mesa.'] },
    { id: 'bento', nome: 'Chef Bento', papel: 'cozinheiro de bordo', alibis: [
      'O Chef Bento passou a madrugada sovando pão na padaria de bordo: o padeiro confirma, e o pão também.',
      'O Chef Bento estava na videochamada com a mãe, ensinando a receita de moqueca. Durou duas horas (e foi gravada).'] },
    { id: 'iara', nome: 'Dra. Iara', papel: 'médica do navio', alibis: [
      'A Dra. Iara atendeu um passageiro enjoado a noite toda. O prontuário tem a assinatura dela de 20 em 20 minutos.',
      'A Dra. Iara estava fazendo uma cirurgia de emergência num papagaio. O papagaio passa bem e não para de falar.'] },
    { id: 'tiao', nome: 'Tião', papel: 'maquinista', alibis: [
      'O Tião ficou preso no elevador de carga das 23h às 3h. O alarme do elevador registrou tudo, inclusive a cantoria.',
      'O Tião trocou o turno com um colega e dormiu cedo: o colega de cabine diz que o ronco não parou um minuto.'] },
    { id: 'lia', nome: 'Lia', papel: 'fotógrafa de natureza', alibis: [
      'A Lia fotografou a chuva de meteoros do observatório da proa. As fotos têm hora marcada, uma a cada minuto.',
      'A Lia passou a noite revelando filmes no laboratório escuro, com a porta lacrada para não entrar luz.'] },
    { id: 'otavio', nome: 'Prof. Otávio', papel: 'oceanógrafo', alibis: [
      'O Prof. Otávio deu uma palestra sobre polvos que começou às 23h e, para tristeza de todos, só acabou às 2h.',
      'O Prof. Otávio mergulhou com o robô submarino a noite toda. O cabo do robô estava ligado ao pulso dele.'] },
    { id: 'duda', nome: 'DJ Duda', papel: 'animação das festas', alibis: [
      'A DJ Duda tocou na festa da piscina até as 2h. Dezenas de pessoas dançaram (mal) a noite toda na frente dela.',
      'A DJ Duda estava ao vivo na rádio do navio, apresentando o programa "Maré de Pedidos". Não teve intervalo.'] },
    { id: 'valdemar', nome: 'Sr. Valdemar', papel: 'passageiro milionário', alibis: [
      'O Sr. Valdemar jantou com a mesa do comandante e depois ficou contando a mesma piada até a 1h. Ninguém esquece.',
      'O Sr. Valdemar passou a noite inteira no spa, enrolado em algas. A atendente confirma: ele dormiu de roncar.'] },
  ];
  const ARMAS = [
    { id: 'arpao', nome: 'Arpão', descartes: [
      'O arpão continua preso na parede do salão, com uma camada de poeira intacta por cima.',
      'O arpão foi levado para conserto em terra na semana passada: o recibo está no mural.'] },
    { id: 'remo', nome: 'Remo', descartes: [
      'O remo está amarrado no bote salva-vidas, com o lacre de inspeção inteiro.',
      'O remo estava pendurado na parede da oficina, e a marca de pó em volta dele mostra que ninguém mexeu.'] },
    { id: 'chave', nome: 'Chave inglesa', descartes: [
      'A chave inglesa está na caixa de ferramentas, trancada com cadeado e etiqueta lacrada.',
      'A chave inglesa foi achada colada no fundo de uma lata de tinta seca desde ontem.'] },
    { id: 'corda', nome: 'Corda', descartes: [
      'A corda segura as bandeirinhas da festa desde a tarde e não saiu do lugar.',
      'A corda está enrolada no convés com o nó especial do contramestre, que ninguém mais sabe fazer.'] },
    { id: 'ancora', nome: 'Âncora de bolso', descartes: [
      'A âncora de bolso está na vitrine da lojinha, e o alarme da vitrine não tocou.',
      'A âncora de bolso é um peso de papel... colado com super cola na mesa da recepção.'] },
    { id: 'garrafa', nome: 'Garrafa', descartes: [
      'A garrafa ficou na geladeira do bar, que tem câmera: ninguém abriu a porta.',
      'A garrafa foi servida na festa, até a última gota, na frente de todo mundo.'] },
    { id: 'extintor', nome: 'Extintor', descartes: [
      'O extintor ainda tem o selo de inspeção intacto e o pino no lugar.',
      'O extintor ficou o tempo todo no suporte: o sensor de peso registra qualquer movimento.'] },
    { id: 'lanterna', nome: 'Lanterna', descartes: [
      'A lanterna está sem pilha desde ontem: não iluminaria nem um peixe-lanterna.',
      'A lanterna está no armário de emergência, que só abre com alarme. E o alarme não tocou.'] },
  ];
  const COMODOS = [
    { id: 'ponte', nome: 'Ponte de comando', descartes: [
      'A ponte de comando tem câmera 24h: a gravação mostra o painel piscando e mais nada.',
      'A porta da ponte abre com senha, e o registro não mostra nenhuma entrada depois das 22h.'] },
    { id: 'cozinha', nome: 'Cozinha', descartes: [
      'A cozinha foi lavada às 23h, e o chão encerado amanheceu sem uma pegada sequer.',
      'Na cozinha, a farinha espalhada para pegar o rato da despensa não tem nenhuma pegada de gente.'] },
    { id: 'maquinas', nome: 'Casa de máquinas', descartes: [
      'A casa de máquinas tem sensor de porta: ninguém entrou de madrugada.',
      'A casa de máquinas estava em manutenção, com a porta soldada até de manhã.'] },
    { id: 'conves', nome: 'Convés', descartes: [
      'O convés ficou cheio de gente olhando o mar de madrugada: ninguém faria nada ali sem ser visto.',
      'Choveu forte no convés, e a pintura nova do chão não tem nenhuma marca.'] },
    { id: 'enfermaria', nome: 'Enfermaria', descartes: [
      'A enfermaria tem a porta com trava eletrônica, e o registro mostra só a entrada da equipe às 7h.',
      'Na enfermaria, os lençóis estão dobrados e lacrados para a inspeção de amanhã: nada fora do lugar.'] },
    { id: 'salao', nome: 'Salão de festas', descartes: [
      'O salão de festas teve festa até as 2h, com dezenas de testemunhas. Ali não aconteceu nada.',
      'O salão de festas foi fechado às 22h para a limpeza, e o robô aspirador não encontrou nada estranho.'] },
    { id: 'biblioteca', nome: 'Biblioteca', descartes: [
      'A biblioteca tem sensor de barulho: não registrou nem um suspiro a noite toda.',
      'A biblioteca está fechada para dedetização desde ontem: ninguém entra ali sem máscara.'] },
    { id: 'porao', nome: 'Porão', descartes: [
      'O porão estava alagado até o joelho: qualquer um sairia de lá encharcado, e ninguém apareceu molhado.',
      'O porão tem um cadeado enferrujado que não abre desde a última viagem. Tentamos: não abre mesmo.'] },
  ];
  const CASOS = [
    'Na noite passada, alguém nocauteou o vigia do Navio Aurora e levou a Pérola Negra do cofre. O vigia está bem (com um galo na cabeça).',
    'O mapa do Recife Dourado sumiu e o cartógrafo do Aurora foi achado desacordado. Ele já acordou, mas não lembra de nada.',
    'Alguém derrubou o timoneiro reserva e roubou a bússola de ouro do Aurora. O timoneiro está bem, só com o orgulho ferido.',
    'O bolo de aniversário da tripulação sumiu e o confeiteiro levou uma pancada. Ele está bem; o bolo, nem tanto.',
    'A coleção de conchas raras do Aurora foi levada, e o guarda do museu de bordo levou uma pancada. Já está de pé.',
  ];
  const BASE = 1000;
  const POR_VISITA = 70;
  const POR_ERRO = 300;
  const MINIMO = 100;
  const ACUSACOES = 2;
  const COLUNAS = [
    { chave: 'quem', titulo: 'Suspeitos', itens: SUSPEITOS },
    { chave: 'arma', titulo: 'Armas', itens: ARMAS },
    { chave: 'onde', titulo: 'Cômodos', itens: COMODOS },
  ];

  /** O caso do dia: a mesma data gera o mesmo caso em qualquer aparelho. */
  function casoDoDia(hoje) {
    const r = Descompressao.aleatorio(`diver-sala-investigacao-${hoje}`);
    const pegar = (lista) => lista[Math.floor(r() * lista.length)];
    const solucao = { quem: pegar(SUSPEITOS).id, arma: pegar(ARMAS).id, onde: pegar(COMODOS).id };
    const pistas = [];
    SUSPEITOS.filter((s) => s.id !== solucao.quem).forEach((s) => pistas.push({ col: 'quem', id: s.id, texto: pegar(s.alibis) }));
    ARMAS.filter((a) => a.id !== solucao.arma).forEach((a) => pistas.push({ col: 'arma', id: a.id, texto: pegar(a.descartes) }));
    COMODOS.filter((c) => c.id !== solucao.onde).forEach((c) => pistas.push({ col: 'onde', id: c.id, texto: pegar(c.descartes) }));
    for (let i = pistas.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pistas[i], pistas[j]] = [pistas[j], pistas[i]];
    }
    const ordemComodos = COMODOS.map((c) => c.id);
    const porComodo = {};
    ordemComodos.forEach((c) => (porComodo[c] = []));
    pistas.forEach((p, i) => porComodo[ordemComodos[i % ordemComodos.length]].push(p));
    return { solucao, porComodo, historia: pegar(CASOS) };
  }

  const nomeDe = (col, id) => (COLUNAS.find((c) => c.chave === col).itens.find((x) => x.id === id) || {}).nome || id;

  Descompressao.registrar({
    id: 'investigacao',
    nome: 'Investigação',
    icone: 'i-lupa',
    duracao: '5 a 10 min · 1 por dia',
    diario: true,
    descricao: 'Um mistério por dia no Navio Aurora: quem foi, com qual arma e em qual cômodo? Revistar custa pontos; errar a acusação também.',
    abrir(ctx) {
      const caso = casoDoDia(ctx.hoje);
      const salvo = ctx.estado();
      const p = salvo && salvo.data === ctx.hoje ? salvo : { data: ctx.hoje, visitas: [], marcas: {}, erros: [], fim: false, venceu: false, registrado: false };
      const gravar = () => ctx.gravar(p);
      const pontos = () => Math.max(MINIMO, BASE - POR_VISITA * p.visitas.length - POR_ERRO * p.erros.length);

      const placa = h('div', { class: 'sd-inv__placa', 'aria-live': 'polite' });
      const mapa = h('div', { class: 'sd-inv__mapa', id: 'sd-inv-mapa', role: 'group', 'aria-label': 'Cômodos do navio' });
      const diario = h('ol', { class: 'sd-inv__diario', id: 'sd-inv-diario' });
      const caderno = h('div', { class: 'sd-inv__caderno', id: 'sd-inv-caderno' });
      const acusar = h('div', { class: 'sd-inv__acusar', id: 'sd-inv-acusar' });
      ctx.container.replaceChildren(h('div', { class: 'sd-inv' },
        h('section', { class: 'cartao sd-inv__caso' },
          h('div', { class: 'sd-inv__topo' },
            h('span', { class: 'chip chip--hoje' }, icone('i-calendario'), `Caso de ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`),
            h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => guia(true) }, icone('i-livro'), 'Como jogar')),
          h('p', { class: 'sd-inv__historia', text: caso.historia }),
          h('p', { class: 'texto-suave', text: 'O culpado é um dos 8 suspeitos, usou uma das 8 armas e agiu num dos 8 cômodos. Revistar os cômodos revela pistas.' }),
          placa),
        h('div', { class: 'sd-inv__grade' },
          h('div', { class: 'sd-inv__col' },
            h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Revistar o navio' }), mapa),
            h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Pistas encontradas' }), diario)),
          h('div', { class: 'sd-inv__col' },
            h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Seu caderno' }),
              h('p', { class: 'texto-suave sd-inv__nota', text: 'Toque para marcar: ✕ descartado, ? suspeito.' }), caderno),
            h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Acusação' }), acusar)))));

      function desenhar() {
        placa.replaceChildren(
          h('span', { class: 'sd-inv__pontos' }, icone('i-estrela'), p.fim ? `${p.venceu ? pontos() : 0} pontos` : `Valendo ${pontos()} pontos`),
          h('span', { class: 'texto-suave', text: `${plural(p.visitas.length, 'cômodo revistado', 'cômodos revistados')} · ${plural(ACUSACOES - p.erros.length, 'acusação restante', 'acusações restantes')}` }));
        mapa.replaceChildren(...COMODOS.map((c) => {
          const visto = p.visitas.includes(c.id);
          return h('button', { type: 'button', class: `sd-inv__comodo ${visto ? 'sd-inv__comodo--visto' : ''}`.trim(), disabled: visto || p.fim, onclick: () => revistar(c.id),
            'aria-label': visto ? `${c.nome}: já revistado` : `Revistar ${c.nome} (menos ${POR_VISITA} pontos)` },
          h('span', { class: 'sd-inv__comodo-nome', text: c.nome }),
          h('span', { class: 'sd-inv__comodo-info', text: visto ? plural(caso.porComodo[c.id].length, 'pista', 'pistas') : `−${POR_VISITA}` }));
        }));
        const pistas = p.visitas.flatMap((c) => caso.porComodo[c].map((x) => ({ ...x, comodo: c })));
        diario.replaceChildren(...(pistas.length ? pistas.map((x) => h('li', { class: 'sd-inv__pista' },
          h('span', { class: 'sd-inv__pista-onde', text: nomeDe('onde', x.comodo) }), h('span', { text: x.texto })))
          : [h('li', { class: 'texto-suave sd-inv__vazio', text: 'Nenhuma pista ainda. Escolha um cômodo para revistar.' })]));
        caderno.replaceChildren(...COLUNAS.map((col) => h('div', { class: 'sd-inv__lista' },
          h('h3', { class: 'sd-inv__lista-titulo', text: col.titulo }),
          h('ul', {}, col.itens.map((it) => {
            const k = `${col.chave}:${it.id}`;
            const m = p.marcas[k] || '';
            return h('li', {}, h('button', { type: 'button', class: `sd-inv__item ${m === 'x' ? 'sd-inv__item--x' : m === '?' ? 'sd-inv__item--talvez' : ''}`.trim(),
              'data-k': k, 'aria-label': `${it.nome}${m === 'x' ? ', descartado' : m === '?' ? ', suspeito' : ''}`, onclick: () => marcar(k) },
            h('span', { class: 'sd-inv__marca', 'aria-hidden': 'true', text: m === 'x' ? '✕' : m === '?' ? '?' : '' }),
            h('span', { class: 'sd-inv__item-nome', text: it.nome }),
            it.papel ? h('span', { class: 'sd-inv__item-papel', text: it.papel }) : null));
          })))));
        desenharAcusacao();
      }

      function desenharAcusacao() {
        if (p.fim) {
          const s = caso.solucao;
          acusar.replaceChildren(
            h('p', { class: p.venceu ? 'texto-sucesso sd-inv__veredito' : 'texto-erro sd-inv__veredito', text: p.venceu ? `Caso resolvido! Mandou bem, Diver: +${pontos()} pontos.` : 'O caso esfriou. Amanhã tem outro mistério a bordo.' }),
            h('p', {}, 'Foi ', h('strong', { text: nomeDe('quem', s.quem) }), ', com ', h('strong', { text: nomeDe('arma', s.arma).toLowerCase() }), ', em ', h('strong', { text: nomeDe('onde', s.onde).toLowerCase() }), '.'),
            h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--primario', onclick: ctx.voltar }, 'Voltar para a sala')));
          return;
        }
        const selects = COLUNAS.map((col) => h('label', { class: 'sd-campo' }, h('span', { text: { quem: 'Quem', arma: 'Com o quê', onde: 'Onde' }[col.chave] }),
          h('select', { class: 'campo', 'data-col': col.chave },
            h('option', { value: '', text: 'Escolha…' }),
            col.itens.map((it) => h('option', { value: it.id, text: it.nome, disabled: p.marcas[`${col.chave}:${it.id}`] === 'x' ? true : null })))));
        acusar.replaceChildren(...[
          ...selects,
          p.erros.length ? h('ul', { class: 'sd-inv__erros' }, p.erros.map((e) => h('li', { class: 'texto-erro', text: `${nomeDe('quem', e.quem)}, ${nomeDe('arma', e.arma).toLowerCase()}, ${nomeDe('onde', e.onde).toLowerCase()}: ${e.certos} de 3 certos.` }))) : null,
          h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--primario', onclick: () => fazerAcusacao(selects) }, icone('i-alvo'), 'Acusar')),
        ].filter(Boolean));
      }

      function marcar(k) {
        const ordem = ['', 'x', '?'];
        p.marcas[k] = ordem[(ordem.indexOf(p.marcas[k] || '') + 1) % ordem.length];
        if (!p.marcas[k]) delete p.marcas[k];
        gravar();
        desenhar();
        const alvo = caderno.querySelector(`[data-k="${k}"]`);
        if (alvo) alvo.focus(); // o caderno é redesenhado: o foco volta para o mesmo item
      }

      function revistar(id) {
        if (p.fim || p.visitas.includes(id)) return;
        p.visitas.push(id);
        gravar();
        desenhar();
        const ultimo = diario.lastElementChild;
        if (ultimo) ultimo.scrollIntoView({ block: 'nearest', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
        UI.toast(`${nomeDe('onde', id)} revistado`, plural(caso.porComodo[id].length, 'pista nova no diário', 'pistas novas no diário'), 'i-lupa');
      }

      async function fazerAcusacao(selects) {
        const escolha = {};
        selects.forEach((l) => {
          const s = l.querySelector('select');
          escolha[s.dataset.col] = s.value;
        });
        if (!escolha.quem || !escolha.arma || !escolha.onde) return UI.toast('Falta escolher', 'Escolha quem, com o quê e onde.', 'i-alerta');
        if (!(await UI.confirmar({
          titulo: 'Fechar a acusação?',
          texto: `${nomeDe('quem', escolha.quem)}, com ${nomeDe('arma', escolha.arma).toLowerCase()}, em ${nomeDe('onde', escolha.onde).toLowerCase()}.\n\n${p.erros.length ? 'É a sua última acusação de hoje.' : `Se errar, perde ${POR_ERRO} pontos e sobra mais uma.`}`,
          sim: 'Acusar', nao: 'Investigar mais',
        }))) return;
        const s = caso.solucao;
        const certos = ['quem', 'arma', 'onde'].filter((k) => escolha[k] === s[k]).length;
        if (certos === 3) {
          p.fim = true;
          p.venceu = true;
        } else {
          p.erros.push({ ...escolha, certos });
          if (p.erros.length >= ACUSACOES) p.fim = true;
          else UI.toast('Não foi bem assim', `${certos} de 3 certos. Você tem mais uma acusação.`, 'i-alerta');
        }
        if (p.fim && !p.registrado) {
          p.registrado = true;
          ctx.pontuar(p.venceu ? pontos() : 0, { venceu: p.venceu, visitas: p.visitas.length, erros: p.erros.length });
        }
        gravar();
        desenhar();
      }

      function guia(forcar) {
        ctx.guia([
          { desenho: 'lupa', titulo: 'Um mistério por dia', texto: 'Todo mundo investiga o mesmo caso hoje. Descubra quem foi, com qual arma e em qual cômodo do Navio Aurora.' },
          { alvo: '#sd-inv-mapa', desenho: 'mapa', titulo: 'Revistar o navio', texto: `Cada cômodo esconde pistas que descartam suspeitos, armas ou lugares. Cada revista custa ${POR_VISITA} pontos: quem deduz mais rápido ganha mais.` },
          { alvo: '#sd-inv-caderno', desenho: 'livro', titulo: 'Seu caderno', texto: 'Anote o que já caiu: um toque marca ✕ (descartado), outro marca ? (suspeito). O caderno fica salvo.' },
          { alvo: '#sd-inv-acusar', desenho: 'alvo', titulo: 'Acusação', texto: `Você tem duas acusações. Errou? Eu conto quantas das três escolhas estavam certas, e a acusação errada custa ${POR_ERRO} pontos.` },
        ], forcar);
      }

      desenhar();
      guia(false);
      return { emAndamento: () => false, parar() {} };
    },
  });
})();

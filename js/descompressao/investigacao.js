/*
 * Investigação (Sala de Descompressão) — um mistério por dia a bordo do Navio Aurora, o mesmo para todo mundo.
 * - 8 suspeitos, 8 armas e 8 cômodos. A solução (quem, com o quê, onde) e as pistas saem da data:
 *   cada dia é um caso novo, e todo mundo da plataforma investiga o mesmo.
 * - Cada cômodo tem um DESAFIO (também igual para todos no dia): cofre com senha (estilo Palavrinha), e-mails
 *   suspeitos (igual à triagem do curso de cibersegurança, com o mesmo banco de e-mails), mensagem cifrada,
 *   câmera de segurança (memória), painel de fios (pares), receita embaralhada (anagramas), caça-palavras e
 *   "quem está mentindo?". Venceu: todas as pistas do cômodo (2 ou 3). Não deu: uma pista só.
 * - Cada pista descarta um suspeito, uma arma ou um cômodo (21 pistas). O caderno é seu: marque X no que caiu.
 * - Duas acusações por dia. Errou? Eu conto quantas das três escolhas estavam certas.
 * - Pontos (só no placar da sala): 60 por desafio vencido (10 se não deu) + 520 pela acusação certa na 1ª
 *   (260 na 2ª). Máximo 1000.
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
  /* =====================================================================
     DESAFIOS DOS CÔMODOS — cada um recebe (area, r, fim): r = sorteio do dia (igual para todos),
     fim(sucesso, frase) encerra. Desistir no meio conta como "não deu".
     ===================================================================== */
  const embaralharCom = (lista, r) => {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const rico = (texto) => String(texto).split('**').map((parte, i) => (i % 2 ? h('strong', { text: parte }) : parte));
  const norm = (t) => Dicionario.normalizar(t);

  /* ---------- Ponte de comando: o cofre do capitão (estilo Palavrinha) ---------- */
  const SENHAS = ['barco', 'porto', 'costa', 'coral', 'praia', 'areia', 'velas', 'remos', 'navio', 'peixe', 'balsa', 'brisa', 'ondas', 'farol', 'lagoa', 'nadar'];
  function cores(palpite, alvo) {
    const res = Array(alvo.length).fill('fora');
    const sobra = {};
    for (let i = 0; i < alvo.length; i++) {
      if (palpite[i] === alvo[i]) res[i] = 'certa';
      else sobra[alvo[i]] = (sobra[alvo[i]] || 0) + 1;
    }
    for (let i = 0; i < alvo.length; i++) {
      if (res[i] !== 'certa' && sobra[palpite[i]] > 0) {
        res[i] = 'lugar';
        sobra[palpite[i]]--;
      }
    }
    return res;
  }
  function atvCofre(area, r, fim) {
    const alvo = SENHAS[Math.floor(r() * SENHAS.length)];
    const palpites = [];
    const grade = h('div', { class: 'pal-grade' });
    const msg = h('p', { class: 'pal-msg', 'aria-live': 'polite' });
    const campo = h('input', { class: 'campo sd-atv__campo', maxlength: '5', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-label': 'Palpite de 5 letras' });
    let lista = null;
    Dicionario.tamanho(5).then((l) => (lista = l)).catch(() => {});
    function desenhar() {
      grade.replaceChildren(...Array.from({ length: 6 }, (_, t) => {
        const p = palpites[t];
        const c = p ? cores(p, alvo) : null;
        return h('div', { class: 'pal-linha', 'aria-label': p ? `${p}: ${c.map((x) => ({ certa: 'certa', lugar: 'outro lugar', fora: 'fora' })[x]).join(', ')}` : null, role: p ? 'img' : null },
          Array.from({ length: 5 }, (_, i) => h('span', { class: `pal-letra ${p ? `pal-letra--${c[i]}` : ''}`.trim(), text: p ? p[i].toUpperCase() : '' })));
      }));
    }
    const form = h('form', { class: 'sd-atv__linha', onsubmit: (e) => {
      e.preventDefault();
      const p = norm(campo.value);
      if (p.length !== 5) return (msg.textContent = 'A senha tem 5 letras.');
      if (lista && !lista.existe(p)) return (msg.textContent = 'Essa palavra não faz parte do nosso dicionário brasileiro.');
      palpites.push(p);
      campo.value = '';
      msg.textContent = '';
      desenhar();
      if (p === alvo) return fim(true, `Cofre aberto com ${alvo.toUpperCase()} na ${palpites.length}ª tentativa.`);
      if (palpites.length >= 6) return fim(false, `O cofre travou. A senha era ${alvo.toUpperCase()}.`);
    } }, campo, h('button', { type: 'submit', class: 'botao botao--primario' }, 'Tentar'));
    area.append(
      h('p', { text: 'O capitão trancou o diário de bordo num cofre. A senha é uma palavra do mar, de 5 letras. Você tem 6 tentativas: turquesa = letra no lugar certo; amarelo = está na senha, em outro lugar.' }),
      h('div', { class: 'pal sd-atv__pal', style: '--letras:5;--tam:44px;--vao:6px' }, grade), msg, form);
    desenhar();
    campo.focus();
  }

  /* ---------- Enfermaria: e-mails do computador (igual à triagem do curso de cibersegurança) ---------- */
  let bancoEmails = null;
  const carregarEmails = () => {
    if (!bancoEmails) {
      bancoEmails = fetch('data/trilhas/ciberseguranca-essencial.json').then((x) => x.json()).then((t) => t.casos[0].emails);
      bancoEmails.catch(() => (bancoEmails = null));
    }
    return bancoEmails;
  };
  function atvEmails(area, r, fim) {
    area.append(h('p', { class: 'texto-suave', text: 'Abrindo a caixa de entrada…' }));
    carregarEmails().then((banco) => montarEmails(area, r, fim, banco)).catch(() => {
      area.replaceChildren(h('p', { class: 'texto-erro', text: 'Não consegui abrir os e-mails. Confira a internet e tente de novo.' }));
    });
  }
  function montarEmails(area, r, fim, banco) {
    const golpes = embaralharCom(banco.golpes, r).slice(0, 2).map((g, k) => ({ ...g, golpe: true,
      cabecalho: { returnPath: ['<null@recifesombrio.io>', '<bounce@caixa-sombria.net>'][k], spf: g.spf, dkim: g.dkim, dmarc: g.dmarc, recebido: `relay.envio-rapido.net (203.0.113.${66 + k})` } }));
    const legitimos = embaralharCom(banco.legitimos, r).slice(0, 3).map((l) => ({ ...l, golpe: false, cabecalho: { ...l.cabecalho, returnPath: String(l.cabecalho.returnPath || '').replace('{email}', l.email) } }));
    const emails = embaralharCom([...golpes, ...legitimos], r);
    const marcado = {};
    let atual = 0;
    let verCab = false;
    const lista = h('ul', { class: 'op-caixa-entrada__lista' });
    const leitor = h('div', { class: 'op-leitor' });
    const aviso = h('p', { class: 'sd-atv__aviso', 'aria-live': 'polite' });
    const entregar = h('button', { type: 'button', class: 'botao botao--primario', disabled: true, onclick: corrigir }, icone('i-check'), 'Entregar a triagem');

    function desenharLista() {
      lista.replaceChildren(...emails.map((e, i) => h('li', {},
        h('button', { type: 'button', class: `op-email ${i === atual ? 'op-email--atual' : ''} ${marcado[e.id] ? '' : 'op-email--novo'}`, 'aria-current': i === atual ? 'true' : null, onclick: () => abrir(i) },
          h('span', { class: `op-avatar op-avatar--${e.cor || 'turquesa'}`, 'aria-hidden': 'true', text: (e.de || '?')[0] }),
          h('span', { class: 'op-email__meio' },
            h('span', { class: 'op-email__de', text: e.de }),
            h('span', { class: 'op-email__assunto', text: e.assunto }),
            marcado[e.id] ? h('span', { class: `op-tag ${marcado[e.id] === 'golpe' ? 'op-tag--reportado' : 'op-tag--legitimo'}`, text: marcado[e.id] === 'golpe' ? 'golpe' : 'legítimo' }) : null),
          h('span', { class: 'op-email__hora', text: e.hora || '' })))));
    }
    function abrir(i) {
      atual = i;
      verCab = false;
      aviso.textContent = '';
      desenharLista();
      desenharLeitor();
    }
    function desenharLeitor() {
      const e = emails[atual];
      const padrao = 'Passe o mouse (ou toque uma vez) num link para ver o endereço real.';
      const barra = h('p', { class: 'op-status-link', 'aria-live': 'polite', text: padrao });
      const mostrar = (url) => { barra.replaceChildren(icone('i-link'), ' ', url); barra.classList.add('op-status-link--ativo'); };
      const corpo = e.corpo.map((b) => {
        if (b.p) return h('p', {}, rico(b.p));
        if (b.nota) return h('p', { class: 'op-carta__nota', text: b.nota });
        if (b.codigo) return h('pre', { class: 'op-carta__codigo', text: b.codigo });
        if (b.anexo) return h('p', { class: 'op-carta__acao' }, h('span', { class: 'op-anexo' }, icone('i-arquivo'), h('span', { text: b.anexo })));
        if (b.link) {
          const a = h('a', { href: '#', class: b.botao ? `op-carta__botao ${b.botao === 'perigo' ? 'op-carta__botao--perigo' : ''}` : 'op-carta__link',
            onmouseenter: () => mostrar(b.url), onfocus: () => mostrar(b.url),
            onclick: (ev) => {
              ev.preventDefault();
              mostrar(b.url);
              aviso.textContent = b.falso ? `Cuidado: esse link ia para um endereço que não é o oficial (${b.url.split('/')[2]}). Aqui no jogo ele não abre.` : `Endereço oficial (${b.url.split('/')[2]}). Aqui no jogo a página não abre.`;
            } }, b.link);
          return h('p', { class: 'op-carta__acao' }, a);
        }
        return null;
      });
      const c = e.cabecalho || {};
      const sinal = (v) => h('span', { class: `op-sinal op-sinal--${/^pass/i.test(String(v)) ? 'ok' : /^(fail|none|softfail)/i.test(String(v)) ? 'ruim' : 'neutro'}`, text: String(v || '—') });
      leitor.replaceChildren(
        h('p', { class: 'op-rotulo', text: `E-mail ${atual + 1} de ${emails.length}` }),
        h('article', { class: 'op-carta', 'aria-label': `E-mail: ${e.assunto}` },
          h('header', { class: 'op-carta__cabeca' },
            h('span', { class: `op-avatar op-avatar--${e.cor || 'turquesa'}`, 'aria-hidden': 'true', text: (e.de || '?')[0] }),
            h('div', {},
              h('h3', { class: 'op-carta__assunto', text: e.assunto }),
              h('p', { class: 'op-carta__de' }, h('strong', { text: e.de }), ' ', h('span', { class: 'op-carta__end', text: `<${e.email}>` })),
              h('p', { class: 'op-carta__para', text: `para enfermaria@diver.app.br · ${e.hora || ''}` }))),
          verCab ? h('dl', { class: 'op-cabecalho', 'aria-label': 'Cabeçalho do e-mail' },
            [['From', `${e.de} <${e.email}>`], ['Return-Path', c.returnPath || `<${e.email}>`], ['Received', c.recebido || '—']].map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }))),
            [['SPF', c.spf], ['DKIM', c.dkim], ['DMARC', c.dmarc]].map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', {}, sinal(v))))) : null,
          h('div', { class: 'op-carta__corpo' }, corpo),
          barra),
        aviso,
        h('section', { class: 'op-decisao', 'aria-label': 'Classificar este e-mail' },
          h('div', { class: 'op-decisao__topo' },
            h('strong', { text: 'Este e-mail é…' }),
            h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', 'aria-pressed': String(verCab), onclick: () => { verCab = !verCab; desenharLeitor(); } }, verCab ? 'Esconder cabeçalho' : 'Ver cabeçalho')),
          h('div', { class: 'op-decisao__botoes' },
            h('button', { type: 'button', class: `op-escolha op-escolha--legitimo ${marcado[e.id] === 'legitimo' ? 'op-escolha--sim' : ''}`, 'aria-pressed': String(marcado[e.id] === 'legitimo'), onclick: () => marcar('legitimo') }, icone('i-check'), 'Legítimo'),
            h('button', { type: 'button', class: `op-escolha op-escolha--phishing ${marcado[e.id] === 'golpe' ? 'op-escolha--sim' : ''}`, 'aria-pressed': String(marcado[e.id] === 'golpe'), onclick: () => marcar('golpe') }, icone('i-alerta'), 'É golpe'))));
    }
    function marcar(tipo) {
      marcado[emails[atual].id] = tipo;
      entregar.disabled = emails.some((e) => !marcado[e.id]);
      const prox = emails.findIndex((e) => !marcado[e.id]);
      if (prox >= 0) abrir(prox);
      else {
        desenharLista();
        desenharLeitor();
        entregar.focus();
      }
    }
    function corrigir() {
      const certos = emails.filter((e) => (marcado[e.id] === 'golpe') === e.golpe).length;
      const ok = certos >= emails.length - 1;
      area.replaceChildren(
        h('p', { class: ok ? 'texto-sucesso' : 'texto-erro', text: `${certos} de ${emails.length} certos. ${ok ? 'Triagem aprovada!' : 'Faltou pouco.'}` }),
        h('ul', { class: 'sd-atv__resumo' }, emails.map((e) => {
          const acertou = (marcado[e.id] === 'golpe') === e.golpe;
          return h('li', { class: acertou ? 'sd-atv__resumo--ok' : 'sd-atv__resumo--erro' },
            h('strong', { text: `${acertou ? '✓' : '✗'} ${e.golpe ? 'Golpe' : 'Legítimo'}: ${e.email}` }),
            h('span', { text: e.explicacao || '' }),
            h('span', { class: 'texto-suave', text: `Pesquise na internet: "${e.pesquisa || 'como identificar phishing'}"` }));
        })),
        h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--primario', onclick: () => fim(ok, `${certos} de ${emails.length} e-mails certos.`) }, 'Pegar as pistas')));
    }
    area.replaceChildren(
      h('p', { text: 'O computador da enfermaria recebeu e-mails na noite do crime. Separe os golpes dos legítimos: confira o endereço letra por letra, passe o mouse nos links e, se precisar, abra o cabeçalho. Pode errar no máximo um.' }),
      h('div', { class: 'op-raiz sd-atv__correio' }, h('div', { class: 'op-correio' },
        h('nav', { class: 'op-caixa-entrada', 'aria-label': 'Caixa de entrada' },
          h('div', { class: 'op-caixa-entrada__cabeca' },
            h('span', { class: 'op-avatar op-avatar--turquesa', 'aria-hidden': 'true', text: 'E' }),
            h('div', {}, h('strong', { text: 'enfermaria@diver.app.br' }), h('span', { text: `Caixa de entrada · ${emails.length}` }))),
          lista),
        leitor)),
      h('div', { class: 'acoes-linha' }, entregar));
    abrir(0);
  }

  /* ---------- Biblioteca: mensagem cifrada (cifra de César) ---------- */
  const FRASES = ['O FAROL APAGOU A MEIA NOITE', 'PROCURE NO FUNDO DO BAU', 'A PISTA ESTA ATRAS DO QUADRO', 'NINGUEM SAIU PELA ESCADA', 'O MAPA FICOU COM O COZINHEIRO', 'A PORTA DO PORAO RANGEU', 'QUEM TEM PRESSA DEIXA RASTRO', 'O RELOGIO DO SALAO PAROU'];
  const cifrar = (t, k) => t.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k) % 26) + 65));
  function atvCifra(area, r, fim) {
    const frase = FRASES[Math.floor(r() * FRASES.length)];
    const k = 3 + Math.floor(r() * 8);
    const secreta = cifrar(frase, k);
    const resposta = frase.split(' ').pop();
    let desloc = 0;
    let tentativas = 3;
    const previa = h('p', { class: 'sd-atv__cifra sd-atv__cifra--previa', 'aria-live': 'polite' });
    const valor = h('strong', { class: 'sd-atv__desloc' });
    const msg = h('p', { class: 'sd-atv__aviso', 'aria-live': 'polite' });
    const campo = h('input', { class: 'campo sd-atv__campo', autocomplete: 'off', 'aria-label': 'Última palavra da mensagem' });
    const mudar = (d) => {
      desloc = (desloc + d + 26) % 26;
      valor.textContent = String(desloc);
      previa.textContent = cifrar(secreta, (26 - desloc) % 26);
    };
    area.append(
      h('p', { text: 'Um bilhete cifrado foi achado num livro. Cada letra foi trocada pela que fica algumas casas à frente no alfabeto. Gire a roda até a mensagem fazer sentido e escreva a última palavra.' }),
      h('p', { class: 'sd-atv__cifra', text: secreta }),
      h('div', { class: 'sd-atv__roda' },
        h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', 'aria-label': 'Voltar uma casa', onclick: () => mudar(-1) }, '◀'),
        h('span', {}, 'Voltar ', valor, ' casas'),
        h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', 'aria-label': 'Avançar uma casa', onclick: () => mudar(1) }, '▶')),
      previa,
      h('form', { class: 'sd-atv__linha', onsubmit: (e) => {
        e.preventDefault();
        if (norm(campo.value) === norm(resposta)) return fim(true, `Decifrado: "${frase}".`);
        tentativas--;
        if (tentativas <= 0) return fim(false, `A mensagem era: "${frase}".`);
        msg.textContent = `Ainda não. Sobram ${plural(tentativas, 'tentativa', 'tentativas')}.`;
        campo.select();
      } }, campo, h('button', { type: 'submit', class: 'botao botao--primario' }, 'Conferir')),
      msg);
    mudar(0);
  }

  /* ---------- Salão de festas: a câmera de segurança (memória de sequência) ---------- */
  function atvCamera(area, r, fim) {
    const ordem = embaralharCom(SUSPEITOS, r).slice(0, 5);
    let tentativa = 0;
    const palco = h('div', { class: 'sd-atv__camera', 'aria-live': 'polite' });
    const botoes = h('div', { class: 'sd-atv__pessoas', role: 'group', 'aria-label': 'Quem passou, na ordem' });
    const msg = h('p', { class: 'sd-atv__aviso', 'aria-live': 'polite' });
    const escolhidos = h('ol', { class: 'sd-atv__ordem' });
    let resposta = [];
    let timer = 0;
    function passar() {
      tentativa++;
      resposta = [];
      escolhidos.replaceChildren();
      botoes.hidden = true;
      msg.textContent = '';
      let i = 0;
      const mostrar = () => {
        if (!palco.isConnected) return;
        if (i >= ordem.length) {
          palco.replaceChildren(h('span', { class: 'texto-suave', text: 'Fim da gravação. Em que ordem as pessoas passaram?' }));
          botoes.hidden = false;
          return;
        }
        const s = ordem[i++];
        palco.replaceChildren(h('span', { class: 'sd-atv__vulto', text: s.nome[0] }), h('strong', { text: s.nome }), h('span', { class: 'texto-suave', text: `${i}º a passar` }));
        timer = setTimeout(mostrar, UI.movimentoReduzido ? 1400 : 1100);
      };
      mostrar();
    }
    botoes.append(...embaralharCom(SUSPEITOS, r).map((s) => h('button', { type: 'button', class: 'botao botao--secundario botao--pequeno', onclick: () => {
      resposta.push(s.id);
      escolhidos.append(h('li', { text: s.nome }));
      if (resposta.length < ordem.length) return;
      const certo = resposta.every((id, i) => id === ordem[i].id);
      if (certo) return fim(true, 'A ordem das câmeras bateu!');
      if (tentativa >= 2) return fim(false, `A ordem era: ${ordem.map((x) => x.nome).join(', ')}.`);
      msg.textContent = 'Não foi essa ordem. A câmera vai passar mais uma vez: preste atenção!';
      timer = setTimeout(passar, 1500);
    } }, s.nome)));
    area.append(h('p', { text: 'A câmera do salão gravou 5 pessoas passando pelo corredor. Assista e depois toque nos nomes na mesma ordem. Você pode ver a gravação duas vezes.' }), palco, botoes, escolhidos, msg);
    passar();
    return () => clearTimeout(timer);
  }

  /* ---------- Casa de máquinas: o painel de fios (pares) ---------- */
  const PARES = [['Bombordo', 'Lado esquerdo'], ['Estibordo', 'Lado direito'], ['Proa', 'Frente do navio'], ['Popa', 'Traseira do navio'], ['Leme', 'Muda a direção'], ['Âncora', 'Segura o navio parado'],
    ['Bússola', 'Aponta o norte'], ['Escotilha', 'Abertura no casco'], ['Mastro', 'Segura as velas'], ['Farol', 'Luz que guia na costa'], ['Convés', 'Piso de cima do navio'], ['Porão', 'Parte de baixo, de carga']];
  function atvFios(area, r, fim) {
    const pares = embaralharCom(PARES, r).slice(0, 5);
    const esquerda = pares.map((p) => p[0]);
    const direita = embaralharCom(pares.map((p) => p[1]), r);
    const ligados = {};
    let escolha = null;
    let erros = 0;
    const msg = h('p', { class: 'sd-atv__aviso', 'aria-live': 'polite' });
    const colA = h('div', { class: 'sd-atv__coluna' });
    const colB = h('div', { class: 'sd-atv__coluna' });
    function desenhar() {
      colA.replaceChildren(...esquerda.map((t, i) => h('button', { type: 'button', class: `sd-atv__fio sd-atv__fio--${i} ${ligados[t] ? 'sd-atv__fio--ok' : ''} ${escolha === t ? 'sd-atv__fio--escolhido' : ''}`, disabled: !!ligados[t], 'aria-pressed': String(escolha === t), onclick: () => { escolha = t; desenhar(); } }, t)));
      colB.replaceChildren(...direita.map((t) => {
        const dono = Object.keys(ligados).find((k) => ligados[k] === t);
        return h('button', { type: 'button', class: `sd-atv__fio ${dono ? `sd-atv__fio--ok sd-atv__fio--${esquerda.indexOf(dono)}` : ''}`, disabled: !!dono, onclick: () => ligar(t) }, t);
      }));
    }
    function ligar(t) {
      if (!escolha) return (msg.textContent = 'Primeiro toque num termo da coluna da esquerda.');
      const certo = pares.find((p) => p[0] === escolha)[1] === t;
      if (certo) {
        ligados[escolha] = t;
        msg.textContent = `Fio ligado: ${escolha} → ${t}.`;
        escolha = null;
      } else {
        erros++;
        msg.textContent = `Faísca! ${escolha} não combina com "${t}". (${plural(erros, 'erro', 'erros')}; o limite é 2.)`;
        if (erros > 2) return fim(false, 'O painel queimou: mais de 2 fios errados.');
      }
      desenhar();
      if (Object.keys(ligados).length === pares.length) fim(true, `Painel religado com ${plural(erros, 'erro', 'erros')}.`);
    }
    area.append(h('p', { text: 'O painel da casa de máquinas foi desligado. Ligue cada termo do navio ao que ele significa: toque na esquerda e depois na direita. Até 2 erros.' }),
      h('div', { class: 'sd-atv__fios' }, colA, colB), msg);
    desenhar();
  }

  /* ---------- Cozinha: a receita embaralhada (anagramas) ---------- */
  const INGREDIENTES = ['farinha', 'manteiga', 'canela', 'tomate', 'cebola', 'pimenta', 'cenoura', 'abacaxi', 'chocolate', 'morango', 'batata', 'queijo', 'banana', 'coentro', 'mandioca', 'goiabada'];
  function atvAnagramas(area, r, fim) {
    const palavras = embaralharCom(INGREDIENTES, r).slice(0, 3);
    const misturadas = palavras.map((p) => {
      let m = p;
      for (let i = 0; i < 10 && m === p; i++) m = embaralharCom(p.split(''), r).join('');
      return m.toUpperCase();
    });
    let i = 0;
    let erros = 0;
    const alvo = h('p', { class: 'sd-atv__anagrama', 'aria-live': 'polite' });
    const msg = h('p', { class: 'sd-atv__aviso', 'aria-live': 'polite' });
    const campo = h('input', { class: 'campo sd-atv__campo', autocomplete: 'off', 'aria-label': 'Ingrediente desembaralhado' });
    const mostrar = () => (alvo.textContent = `${i + 1}/3 · ${misturadas[i]}`);
    area.append(h('p', { text: 'A receita do bolo sumido foi rasgada e as letras dos ingredientes ficaram embaralhadas. Descubra os 3 ingredientes. Até 4 erros no total.' }),
      alvo,
      h('form', { class: 'sd-atv__linha', onsubmit: (e) => {
        e.preventDefault();
        if (norm(campo.value) === palavras[i]) {
          msg.textContent = `Isso: ${palavras[i].toUpperCase()}!`;
          campo.value = '';
          i++;
          if (i >= palavras.length) return fim(true, `Receita refeita: ${palavras.join(', ')}.`);
          mostrar();
        } else {
          erros++;
          if (erros > 4) return fim(false, `Os ingredientes eram: ${palavras.join(', ')}.`);
          msg.textContent = `Não é esse. Dica: começa com ${palavras[i][0].toUpperCase()}. (${plural(erros, 'erro', 'erros')})`;
          campo.select();
        }
      } }, campo, h('button', { type: 'submit', class: 'botao botao--primario' }, 'Conferir')),
      msg);
    mostrar();
    campo.focus();
  }

  /* ---------- Porão: caça-palavras ---------- */
  const PALAVRAS_PORAO = ['CAIXA', 'CORDA', 'BARRIL', 'REDE', 'LONA', 'BAU', 'REMO', 'BOIA', 'SACO', 'LATA'];
  function atvCacaPalavras(area, r, fim) {
    const N = 8;
    const grade = Array.from({ length: N }, () => Array(N).fill(''));
    const escondidas = [];
    for (const p of embaralharCom(PALAVRAS_PORAO, r)) {
      if (escondidas.length >= 4) break;
      for (let t = 0; t < 40; t++) {
        const vertical = r() < 0.5;
        const lin = Math.floor(r() * (vertical ? N - p.length + 1 : N));
        const col = Math.floor(r() * (vertical ? N : N - p.length + 1));
        const cabe = p.split('').every((c, k) => { const v = grade[lin + (vertical ? k : 0)][col + (vertical ? 0 : k)]; return !v || v === c; });
        if (!cabe) continue;
        p.split('').forEach((c, k) => (grade[lin + (vertical ? k : 0)][col + (vertical ? 0 : k)] = c));
        escondidas.push({ p, lin, col, vertical });
        break;
      }
    }
    const letras = 'ABCDEFGHIJLMNOPRSTUVZ';
    grade.forEach((linha) => linha.forEach((v, c) => { if (!v) linha[c] = letras[Math.floor(r() * letras.length)]; }));
    const achadas = new Set();
    let inicio = null;
    const msg = h('p', { class: 'sd-atv__aviso', 'aria-live': 'polite' });
    const listaEl = h('ul', { class: 'sd-atv__procurar' });
    const tab = h('div', { class: 'sd-atv__caca', role: 'grid', 'aria-label': 'Caça-palavras: toque na primeira e na última letra' });
    const celulasDe = (e) => Array.from({ length: e.p.length }, (_, k) => `${e.lin + (e.vertical ? k : 0)}-${e.col + (e.vertical ? 0 : k)}`);
    function desenhar() {
      const marcadas = new Set(escondidas.filter((e) => achadas.has(e.p)).flatMap(celulasDe));
      tab.replaceChildren(...grade.map((linha, l) => h('div', { role: 'row', class: 'sd-atv__caca-linha' }, linha.map((c, col) => h('button', {
        type: 'button', role: 'gridcell', class: `sd-atv__celula ${marcadas.has(`${l}-${col}`) ? 'sd-atv__celula--achada' : ''} ${inicio && inicio[0] === l && inicio[1] === col ? 'sd-atv__celula--inicio' : ''}`,
        'aria-label': `Linha ${l + 1}, coluna ${col + 1}: ${c}`, onclick: () => tocar(l, col) }, c)))));
      listaEl.replaceChildren(...escondidas.map((e) => h('li', { class: achadas.has(e.p) ? 'sd-atv__procurar--ok' : '', text: achadas.has(e.p) ? `✓ ${e.p}` : `${e.p.length} letras` })));
    }
    function tocar(l, c) {
      if (!inicio) {
        inicio = [l, c];
        msg.textContent = 'Agora toque na última letra da palavra.';
        return desenhar();
      }
      const [l0, c0] = inicio;
      inicio = null;
      const e = escondidas.find((x) => !achadas.has(x.p) && ((x.lin === l0 && x.col === c0 && celulasDe(x).pop() === `${l}-${c}`) || (x.lin === l && x.col === c && celulasDe(x).pop() === `${l0}-${c0}`)));
      if (e) {
        achadas.add(e.p);
        msg.textContent = `Achou: ${e.p}!`;
      } else msg.textContent = 'Não tem palavra entre essas duas letras. Tente de novo.';
      desenhar();
      if (achadas.size === escondidas.length) fim(true, `Achou tudo no porão: ${escondidas.map((x) => x.p).join(', ')}.`);
    }
    area.append(h('p', { text: 'Tem 4 coisas escondidas no porão, na horizontal (da esquerda para a direita) ou na vertical (de cima para baixo). Toque na primeira e na última letra de cada uma.' }),
      h('div', { class: 'sd-atv__caca-area' }, tab, listaEl), msg,
      h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => fim(false, `As palavras eram: ${escondidas.map((x) => x.p).join(', ')}.`) }, 'Desistir do porão')));
    desenhar();
  }

  /* ---------- Convés: quem está mentindo? ---------- */
  const DEPOIMENTOS = [
    { fatos: ['Choveu forte no convés das 22h à meia-noite.', 'O bar fechou às 23h.'], falas: [
      ['Marinheiro Zé', 'Fiquei no convés olhando as estrelas a noite toda. Céu limpinho, nenhuma nuvem!', true],
      ['Garçonete Bia', 'Fechei o bar às 23h e fui direto dormir. Estava morta de cansada.', false],
      ['Segurança Rui', 'Fiz a ronda de capa de chuva. Molhei até a meia.', false]] },
    { fatos: ['A luz do corredor queimou às 21h e só foi trocada de manhã.', 'O elevador ficou em manutenção a noite toda.'], falas: [
      ['Camareira Lu', 'Subi para o deck 5 pelo elevador, por volta das 23h.', true],
      ['Músico Téo', 'Tropecei no corredor escuro voltando do show. Que susto!', false],
      ['Cozinheiro Davi', 'Usei a escada de serviço a noite toda, como sempre.', false]] },
    { fatos: ['A festa do salão teve só música instrumental: nada de cantor.', 'O sorvete acabou às 22h.'], falas: [
      ['Turista Nara', 'Pedi o último sorvete de coco às 21h30. Sorte a minha!', false],
      ['Fotógrafo Gil', 'Fotografei o cantor da festa a noite inteira. Que voz!', true],
      ['Recepcionista Ana', 'Fiquei na recepção atendendo ligações até a 1h.', false]] },
    { fatos: ['O navio estava parado, ancorado, das 20h até as 6h.', 'A piscina foi esvaziada para limpeza às 19h.'], falas: [
      ['Salva-vidas Caio', 'Nadei na piscina às 23h para relaxar. Água fresquinha!', true],
      ['Marinheiro Zé', 'Fiquei vigiando a âncora. O navio nem se mexeu.', false],
      ['Turista Nara', 'Li um livro na cabine e dormi cedo.', false]] },
    { fatos: ['A internet do navio caiu às 22h e só voltou de manhã.', 'O cinema passou um filme de terror às 23h.'], falas: [
      ['Músico Téo', 'Vi o filme de terror no cinema e não dormi depois. Medo!', false],
      ['Garçonete Bia', 'Passei a noite numa videochamada com a minha família pela internet do navio.', true],
      ['Segurança Rui', 'Fiz a ronda do cinema durante a sessão das 23h.', false]] },
  ];
  function atvMentira(area, r, fim) {
    const caso = DEPOIMENTOS[Math.floor(r() * DEPOIMENTOS.length)];
    const falas = embaralharCom(caso.falas, r);
    area.append(
      h('p', { text: 'Três pessoas da tripulação estavam no convés e deram depoimento. Compare com os fatos confirmados: uma delas está mentindo. Você tem uma chance.' }),
      h('div', { class: 'sd-atv__fatos' }, h('strong', { text: 'Fatos confirmados' }), h('ul', {}, caso.fatos.map((f) => h('li', { text: f })))),
      h('div', { class: 'sd-atv__depoimentos' }, falas.map(([quem, texto, mente]) => h('button', { type: 'button', class: 'sd-atv__depoimento', onclick: () => fim(mente, mente ? `Isso! ${quem} mentiu: o depoimento não bate com os fatos.` : `Não era ${quem}. Quem mentiu foi ${falas.find((f) => f[2])[0]}: "${falas.find((f) => f[2])[1]}"`) },
        h('strong', { text: quem }), h('span', { text: `“${texto}”` }), h('span', { class: 'sd-atv__acusar-mentira', text: 'Está mentindo' })))));
  }

  const DESAFIOS = {
    ponte: { nome: 'Cofre do capitão', icone: 'i-cadeado', abrir: atvCofre },
    enfermaria: { nome: 'E-mails da enfermaria', icone: 'i-alerta', abrir: atvEmails },
    biblioteca: { nome: 'Mensagem cifrada', icone: 'i-livro', abrir: atvCifra },
    salao: { nome: 'Câmera de segurança', icone: 'i-relogio', abrir: atvCamera },
    maquinas: { nome: 'Painel de fios', icone: 'i-raio', abrir: atvFios },
    cozinha: { nome: 'Receita embaralhada', icone: 'i-letras', abrir: atvAnagramas },
    porao: { nome: 'Caça-palavras', icone: 'i-lupa', abrir: atvCacaPalavras },
    conves: { nome: 'Quem está mentindo?', icone: 'i-usuario', abrir: atvMentira },
  };

  const PONTOS_DESAFIO = 60; // por desafio vencido (8 × 60 = 480)
  const PONTOS_TENTOU = 10; // desafio que não deu (ainda libera uma pista)
  const ACUSACAO = [520, 260]; // acertou na 1ª ou na 2ª acusação
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
    duracao: '10 a 15 min · 1 por dia',
    diario: true,
    descricao: 'Um mistério por dia no Navio Aurora. Cada cômodo tem um desafio (cofre, e-mails suspeitos, mensagem cifrada, câmeras...) que libera pistas. Quem foi, com qual arma e onde?',
    abrir(ctx) {
      const caso = casoDoDia(ctx.hoje);
      const salvo = ctx.estado();
      // Estado antigo (antes dos desafios) recomeça; o placar conta só o melhor do dia
      const p = salvo && salvo.data === ctx.hoje && salvo.versao === 2 ? salvo
        : { versao: 2, data: ctx.hoje, desafios: {}, marcas: {}, erros: [], fim: false, venceu: false, registrado: false };
      const gravar = () => ctx.gravar(p);
      const pontosDesafios = () => Object.values(p.desafios).reduce((t, d) => t + (d.sucesso ? PONTOS_DESAFIO : PONTOS_TENTOU), 0);
      const pontosAcusacao = () => (p.venceu ? ACUSACAO[p.erros.length] || 0 : 0);
      const pontos = () => pontosDesafios() + pontosAcusacao();
      const pistasDe = (c) => {
        const d = p.desafios[c];
        if (!d) return [];
        return d.sucesso ? caso.porComodo[c] : caso.porComodo[c].slice(0, 1);
      };
      let limparDesafio = null;

      const placa = h('div', { class: 'sd-inv__placa', 'aria-live': 'polite' });
      const mapa = h('div', { class: 'sd-inv__mapa', id: 'sd-inv-mapa', role: 'group', 'aria-label': 'Cômodos do navio' });
      const diario = h('ol', { class: 'sd-inv__diario', id: 'sd-inv-diario' });
      const caderno = h('div', { class: 'sd-inv__caderno', id: 'sd-inv-caderno' });
      const acusar = h('div', { class: 'sd-inv__acusar', id: 'sd-inv-acusar' });
      const principal = h('div', { class: 'sd-inv__principal' });
      const desafioEl = h('section', { class: 'cartao sd-atv', id: 'sd-inv-desafio', hidden: true, 'aria-labelledby': 'sd-atv-titulo' });
      ctx.container.replaceChildren(h('div', { class: 'sd-inv' },
        h('section', { class: 'cartao sd-inv__caso' },
          h('div', { class: 'sd-inv__topo' },
            h('span', { class: 'chip chip--hoje' }, icone('i-calendario'), `Caso de ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`),
            h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: () => guia(true) }, icone('i-livro'), 'Como jogar')),
          h('p', { class: 'sd-inv__historia', text: caso.historia }),
          h('p', { class: 'texto-suave', text: 'O culpado é um dos 8 suspeitos, usou uma das 8 armas e agiu num dos 8 cômodos. Cada cômodo tem um desafio: vença e leve todas as pistas dele.' }),
          placa),
        desafioEl,
        principal));
      principal.append(h('div', { class: 'sd-inv__grade' },
        h('div', { class: 'sd-inv__col' },
          h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Desafios do navio' }), mapa),
          h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Pistas encontradas' }), diario)),
        h('div', { class: 'sd-inv__col' },
          h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Seu caderno' }),
            h('p', { class: 'texto-suave sd-inv__nota', text: 'Toque para marcar: ✕ descartado, ? suspeito.' }), caderno),
          h('section', { class: 'cartao' }, h('h2', { class: 'cartao__titulo', text: 'Acusação' }), acusar))));

      function desenhar() {
        const feitos = Object.keys(p.desafios).length;
        placa.replaceChildren(
          h('span', { class: 'sd-inv__pontos' }, icone('i-estrela'), `${pontos()} pontos`),
          h('span', { class: 'texto-suave', text: `${feitos} de 8 desafios · ${p.fim ? 'caso encerrado' : plural(ACUSACOES - p.erros.length, 'acusação restante', 'acusações restantes')}` }));
        mapa.replaceChildren(...COMODOS.map((c) => {
          const d = p.desafios[c.id];
          const info = DESAFIOS[c.id];
          return h('button', { type: 'button', class: `sd-inv__comodo ${d ? (d.sucesso ? 'sd-inv__comodo--visto' : 'sd-inv__comodo--parcial') : ''}`.trim(), disabled: !!d || p.fim, onclick: () => abrirDesafio(c.id),
            'aria-label': d ? `${c.nome}: ${d.sucesso ? 'desafio vencido' : 'desafio tentado'}` : `${c.nome}: desafio ${info.nome}` },
          h('span', { class: 'sd-inv__comodo-nome', text: c.nome }),
          h('span', { class: 'sd-inv__comodo-desafio' }, icone(info.icone), info.nome),
          h('span', { class: 'sd-inv__comodo-info', text: d ? (d.sucesso ? `✓ ${plural(caso.porComodo[c.id].length, 'pista', 'pistas')}` : '½ 1 pista') : `+${PONTOS_DESAFIO}` }));
        }));
        const pistas = Object.keys(p.desafios).flatMap((c) => pistasDe(c).map((x) => ({ ...x, comodo: c })));
        diario.replaceChildren(...(pistas.length ? pistas.map((x) => h('li', { class: 'sd-inv__pista' },
          h('span', { class: 'sd-inv__pista-onde', text: nomeDe('onde', x.comodo) }), h('span', { text: x.texto })))
          : [h('li', { class: 'texto-suave sd-inv__vazio', text: 'Nenhuma pista ainda. Escolha um cômodo e encare o desafio.' })]));
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
            h('p', { class: p.venceu ? 'texto-sucesso sd-inv__veredito' : 'texto-erro sd-inv__veredito', text: p.venceu ? `Caso resolvido! Mandou bem, Diver: ${pontos()} pontos.` : `O caso esfriou, mas os desafios valeram ${pontos()} pontos. Amanhã tem outro mistério a bordo.` }),
            h('p', {}, 'Foi ', h('strong', { text: nomeDe('quem', s.quem) }), ', com ', h('strong', { text: nomeDe('arma', s.arma).toLowerCase() }), ', em ', h('strong', { text: nomeDe('onde', s.onde).toLowerCase() }), '.'),
            h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--primario', onclick: ctx.voltar }, 'Voltar para a sala')));
          return;
        }
        const selects = COLUNAS.map((col) => h('label', { class: 'sd-campo' }, h('span', { text: { quem: 'Quem', arma: 'Com o quê', onde: 'Onde' }[col.chave] }),
          h('select', { class: 'campo', 'data-col': col.chave },
            h('option', { value: '', text: 'Escolha…' }),
            col.itens.map((it) => h('option', { value: it.id, text: it.nome, disabled: p.marcas[`${col.chave}:${it.id}`] === 'x' ? true : null })))));
        acusar.replaceChildren(...[
          h('p', { class: 'texto-suave sd-inv__nota', text: `Acertar na 1ª acusação vale ${ACUSACAO[0]}; na 2ª, ${ACUSACAO[1]}. Depois da acusação, os desafios que faltam fecham.` }),
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

      /* ---------- Desafio de um cômodo ---------- */
      function abrirDesafio(comodo) {
        if (p.fim || p.desafios[comodo]) return;
        const info = DESAFIOS[comodo];
        const nomeComodo = nomeDe('onde', comodo);
        let encerrado = false;
        const area = h('div', { class: 'sd-atv__area' });
        const fim = (sucesso, frase) => {
          if (encerrado) return;
          encerrado = true;
          if (limparDesafio) limparDesafio();
          limparDesafio = null;
          p.desafios[comodo] = { sucesso: !!sucesso };
          gravar();
          const novas = pistasDe(comodo);
          desafioEl.replaceChildren(
            h('h2', { class: 'cartao__titulo', id: 'sd-atv-titulo', tabindex: '-1', text: `${nomeComodo} · ${info.nome}` }),
            h('p', { class: sucesso ? 'texto-sucesso' : 'texto-erro', text: sucesso ? `Desafio vencido! +${PONTOS_DESAFIO} pontos.` : `Não deu dessa vez (+${PONTOS_TENTOU}).` }),
            h('p', { text: frase }),
            h('p', { class: 'sd-atv__ganho', text: sucesso ? `Você leva todas as ${plural(novas.length, 'pista', 'pistas')} deste cômodo:` : 'Mesmo assim, você achou uma pista:' }),
            h('ul', { class: 'sd-inv__diario sd-atv__pistas' }, novas.map((x) => h('li', { class: 'sd-inv__pista', text: x.texto }))),
            h('div', { class: 'acoes-linha' }, h('button', { type: 'button', class: 'botao botao--primario', onclick: fecharDesafio }, 'Voltar ao mapa do navio')));
          desafioEl.querySelector('h2').focus({ preventScroll: true });
        };
        const desistir = async () => {
          if (!(await UI.confirmar({ titulo: 'Desistir deste desafio?', texto: 'Ele conta como "não deu" e libera só uma pista. Não dá para tentar de novo hoje.', sim: 'Desistir', nao: 'Continuar', humor: 'triste' }))) return;
          fim(false, 'Você desistiu deste desafio.');
        };
        desafioEl.hidden = false;
        principal.hidden = true;
        desafioEl.replaceChildren(
          h('div', { class: 'sd-atv__topo' },
            h('h2', { class: 'cartao__titulo', id: 'sd-atv-titulo', tabindex: '-1' }, icone(info.icone), ` ${nomeComodo} · ${info.nome}`),
            h('button', { type: 'button', class: 'botao botao--fantasma botao--pequeno', onclick: desistir }, 'Desistir')),
          area);
        const r = Descompressao.aleatorio(`diver-sala-investigacao-${ctx.hoje}-${comodo}`);
        const limpa = info.abrir(area, r, fim);
        limparDesafio = typeof limpa === 'function' ? limpa : null;
        window.scrollTo(0, 0);
        desafioEl.querySelector('h2').focus({ preventScroll: true });
      }

      function fecharDesafio() {
        desafioEl.hidden = true;
        desafioEl.replaceChildren();
        principal.hidden = false;
        desenhar();
        mapa.scrollIntoView({ block: 'start', behavior: UI.movimentoReduzido ? 'auto' : 'smooth' });
      }

      async function fazerAcusacao(selects) {
        const escolha = {};
        selects.forEach((l) => {
          const s = l.querySelector('select');
          escolha[s.dataset.col] = s.value;
        });
        if (!escolha.quem || !escolha.arma || !escolha.onde) return UI.toast('Falta escolher', 'Escolha quem, com o quê e onde.', 'i-alerta');
        const faltam = 8 - Object.keys(p.desafios).length;
        if (!(await UI.confirmar({
          titulo: 'Fechar a acusação?',
          texto: `${nomeDe('quem', escolha.quem)}, com ${nomeDe('arma', escolha.arma).toLowerCase()}, em ${nomeDe('onde', escolha.onde).toLowerCase()}.\n\n${p.erros.length ? 'É a sua última acusação de hoje.' : 'Se errar, sobra mais uma (que vale metade).'}${faltam && !p.erros.length ? ` Se acertar, os ${faltam} desafios que faltam fecham.` : ''}`,
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
          ctx.pontuar(pontos(), { venceu: p.venceu, desafios: Object.keys(p.desafios).length, vencidos: Object.values(p.desafios).filter((d) => d.sucesso).length, erros: p.erros.length });
        }
        gravar();
        desenhar();
      }

      function guia(forcar) {
        ctx.guia([
          { desenho: 'lupa', titulo: 'Um mistério por dia', texto: 'Todo mundo investiga o mesmo caso hoje. Descubra quem foi, com qual arma e em qual cômodo do Navio Aurora.' },
          { alvo: '#sd-inv-mapa', desenho: 'mapa', titulo: 'Um desafio em cada cômodo', texto: `Cofre com senha, e-mails suspeitos, mensagem cifrada, câmeras, fios, receita embaralhada, caça-palavras e um mentiroso. Venceu? +${PONTOS_DESAFIO} pontos e todas as pistas do cômodo. Não deu? Uma pista só.` },
          { alvo: '#sd-inv-caderno', desenho: 'livro', titulo: 'Seu caderno', texto: 'Cada pista descarta alguém, uma arma ou um cômodo. Anote: um toque marca ✕ (descartado), outro marca ? (suspeito).' },
          { alvo: '#sd-inv-acusar', desenho: 'alvo', titulo: 'Acusação', texto: `Duas chances: acertar na 1ª vale ${ACUSACAO[0]}; na 2ª, ${ACUSACAO[1]}. Errou? Eu conto quantas das três escolhas estavam certas.` },
        ], forcar);
      }

      desenhar();
      guia(false);
      return {
        emAndamento: () => false, // tudo fica salvo; desafio aberto e abandonado pode ser retomado
        parar() {
          if (limparDesafio) limparDesafio();
        },
      };
    },
  });
})();

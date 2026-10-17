/* Mapa das Profissões: a arte de cada profissão (2026-10-17, pedido do usuário: "uma arte que represente universalmente
   cada uma delas, para deixar ainda mais legal e curioso"). Desenho nosso em SVG, sem imagem de terceiros: o símbolo que
   todo mundo reconhece, com contorno escuro e as cores do app. As cores vêm só de classes (pa-*), que o css/profissoes.css
   pinta com os tokens; o halo usa a cor da área (--cor-area). Um detalhe de cada arte (.pa-mexe) se mexe quando a pessoa
   passa o mouse no cartão (classe prof-arte-vivo) ou na própria arte; com "reduzir movimento", fica tudo parado.
   ArtesProfissoes.arte(id) devolve a arte inteira (200 × 140); com { simples: true }, só o objeto, recortado (selos, lista,
   aquário). Faz parte do pacote "profissoes" (PACOTES em js/app.js) e vem antes de js/profissoes.js. */
(function () {
  'use strict';

  const r1 = n => Math.round(n * 10) / 10;
  /** Brilho de quatro pontas (amarelo) */
  const B = (x, y, s) => {
    const k = s * 0.18;
    return `<path class="pa-brilho" d="M${x} ${y - s}Q${r1(x + k)} ${r1(y - k)} ${x + s} ${y}Q${r1(x + k)} ${r1(y + k)} ${x} ${y + s}Q${r1(x - k)} ${r1(y + k)} ${x - s} ${y}Q${r1(x - k)} ${r1(y - k)} ${x} ${y - s}Z"/>`;
  };
  /** Bolhinha do mar (a marca do Diver) */
  const O = (x, y, r) => `<circle class="pa-bolha" cx="${x}" cy="${y}" r="${r}"/>`;
  /** Um tubo com contorno: o mesmo caminho duas vezes (escuro e largo por baixo, a cor por cima) */
  const TUBO = (d, cor, w = 5) => `<path class="pa-borda" stroke-width="${w + 5}" d="${d}"/><path class="pa-s-${cor}" stroke-width="${w}" d="${d}"/>`;
  /** Coração com o centro em (cx, cy); s é meia largura */
  const CORACAO = (cx, cy, s) => {
    const k = s / 20, p = (x, y) => `${r1(cx + x * k)} ${r1(cy + y * k)}`;
    return `M${p(0, 14)}C${p(-20, 2)} ${p(-18, -14)} ${p(-8, -14)}C${p(-3, -14)} ${p(0, -10)} ${p(0, -7)}C${p(0, -10)} ${p(3, -14)} ${p(8, -14)}C${p(18, -14)} ${p(20, 2)} ${p(0, 14)}Z`;
  };
  /** Engrenagem: raio do corpo r, n dentes de altura h */
  const ENGRENAGEM = (cx, cy, r, n, h) => {
    let d = '';
    for (let i = 0; i < n * 4; i++) {
      const a = (i / (n * 4)) * Math.PI * 2, fora = i % 4 === 1 || i % 4 === 2, rr = fora ? r + h : r;
      d += (i ? 'L' : 'M') + r1(cx + Math.cos(a) * rr) + ' ' + r1(cy + Math.sin(a) * rr);
    }
    return d + 'Z';
  };
  /** Moeda de pé numa pilha (o lado e a face de cima) */
  const MOEDA = (cx, y, rx) => `<path class="pa-f-amars pa-t" d="M${cx - rx} ${y}V${y + 6}A${rx} 6 0 0 0 ${cx + rx} ${y + 6}V${y}"/>` +
    `<ellipse class="pa-f-amar pa-t" cx="${cx}" cy="${y}" rx="${rx}" ry="6"/><ellipse class="pa-f-amars" cx="${cx}" cy="${y}" rx="${r1(rx * 0.55)}" ry="3"/>`;
  /** O halo na cor da área e a sombra no chão */
  const fundo = (cx, cy, chao) => `<circle class="pa-halo2" cx="${cx}" cy="${cy}" r="64"/><circle class="pa-halo" cx="${cx}" cy="${cy}" r="48"/>` +
    `<ellipse class="pa-sombra" cx="100" cy="124" rx="${chao}" ry="6"/>`;
  const mexe = (ox, oy, corpo, extra) => `<g class="pa-mexe${extra ? ' ' + extra : ''}" style="transform-origin:${ox}px ${oy}px">${corpo}</g>`;

  /* Cada arte: o que mexe (o nome da animação no CSS), o recorte do objeto para o modo simples (viewBox),
     o halo (centro e largura da sombra), o objeto e os enfeites (brilhos e bolhas, fora do modo simples). */
  const ARTES = {
    medicina: {
      nome: 'Estetoscópio e coração', mexe: 'bate', foco: '38 8 128 120', fundo: [100, 72, 52],
      objeto: mexe(100, 70, `<path class="pa-f-coral pa-t" d="M100 100C58 74 62 40 84 38C93 37 99 43 100 50C101 43 107 37 116 38C138 40 142 74 100 100Z"/>` +
        `<path class="pa-s-branco" stroke-width="3.5" d="M70 66H85L90 56L97 80L103 58L108 66H130"/>`) +
        TUBO('M52 24C50 44 58 52 66 54M70 18C72 40 70 50 66 54M66 54C58 86 72 118 104 118C134 118 152 102 150 84', 'turq') +
        `<circle class="pa-f-turqc pa-t" cx="52" cy="22" r="5"/><circle class="pa-f-turqc pa-t" cx="70" cy="16" r="5"/>` +
        `<circle class="pa-f-perola pa-t" cx="150" cy="76" r="13"/><circle class="pa-f-turq" cx="150" cy="76" r="7.5"/><circle class="pa-f-branco" cx="146" cy="72" r="2.5"/>`,
      enfeite: B(160, 30, 8) + B(36, 92, 6) + O(172, 112, 6) + O(182, 98, 3.5) + O(24, 36, 4.5) +
        `<path class="pa-s-branco" stroke-width="3.5" d="M174 52h10M179 47v10"/>`,
    },
    enfermagem: {
      nome: 'Soro com gota de coração e curativo', mexe: 'pinga', foco: '22 10 140 118', fundo: [104, 70, 56],
      objeto: TUBO('M128 16V112', 'perola', 4) + TUBO('M128 19H106', 'perola', 4) + `<path class="pa-t2" d="M106 19V25"/>` +
        `<path class="pa-f-perola pa-t" d="M112 112H144L141 118H115Z"/><circle class="pa-f-escuro" cx="117" cy="121" r="3"/><circle class="pa-f-escuro" cx="139" cy="121" r="3"/>` +
        `<path class="pa-f-vidro pa-t" d="M86 31Q86 25 92 25H120Q126 25 126 31V66Q126 76 116 78H96Q86 76 86 66Z"/>` +
        `<path class="pa-f-turqc" d="M88.5 46H123.5V66Q123.5 74 115 75.5H97Q88.5 74 88.5 66Z"/>` +
        `<circle class="pa-f-escuro" cx="106" cy="30" r="2.2"/><path class="pa-f-coral pa-t2" d="${CORACAO(106, 60, 9)}"/>` +
        `<path class="pa-s-branco pa-leve" stroke-width="2.5" d="M92 34V60"/>` +
        `<path class="pa-t2" d="M106 78V82"/><rect class="pa-f-vidro pa-t" x="100" y="82" width="12" height="16" rx="3"/>` +
        mexe(106, 88, `<path class="pa-f-coral" d="${CORACAO(106, 87, 4.5)}"/>`) +
        TUBO('M106 98C106 112 94 118 80 116', 'perola', 2.5) +
        `<g transform="rotate(-24 52 98)"><rect class="pa-f-lar pa-t" x="28" y="90" width="48" height="16" rx="8"/><rect class="pa-f-perola" x="45" y="92.5" width="14" height="11" rx="2"/>` +
        `<circle class="pa-f-amars" cx="35" cy="95" r="1.3"/><circle class="pa-f-amars" cx="35" cy="101" r="1.3"/><circle class="pa-f-amars" cx="69" cy="95" r="1.3"/><circle class="pa-f-amars" cx="69" cy="101" r="1.3"/></g>`,
      enfeite: B(54, 40, 7) + B(166, 70, 6) + O(24, 64, 5) + O(34, 54, 3) + O(170, 104, 4),
    },
    psicologia: {
      nome: 'Cabeça com a letra psi e um balão de conversa', mexe: 'pensa', foco: '44 6 138 120', fundo: [94, 72, 50],
      objeto: `<path class="pa-f-turq pa-t" d="M66 120L63 105C52 92 48 66 58 50C68 32 92 24 108 32C118 37 121 47 119 57L128 70L119 74C119 80 117 84 117 87C117 93 112 96 105 96C100 96 99 100 99 106L99 120Z"/>` +
        `<path class="pa-s-branco" stroke-width="5" d="M70 54C70 70 76 76 85 76C94 76 100 70 100 54M85 48V92M78 92H92"/>` +
        `<circle class="pa-f-perola pa-t2" cx="127" cy="44" r="3.5"/><circle class="pa-f-perola pa-t2" cx="135" cy="34" r="5"/>` +
        `<rect class="pa-f-perola pa-t" x="134" y="10" width="44" height="24" rx="12"/>` +
        mexe(156, 22, `<circle class="pa-f-escuro" cx="146" cy="22" r="3"/><circle class="pa-f-escuro" cx="156" cy="22" r="3" style="--pa-i:1"/><circle class="pa-f-escuro" cx="166" cy="22" r="3" style="--pa-i:2"/>`),
      enfeite: B(36, 40, 6) + B(162, 96, 7) + O(30, 96, 5) + O(40, 108, 3.5),
    },
    fisioterapia: {
      nome: 'Bola de exercício com faixa elástica e halter', mexe: 'quica', foco: '26 8 156 120', fundo: [94, 72, 58],
      objeto: `<path class="pa-s-branco pa-leve" stroke-width="3" d="M38 60C32 72 32 88 38 100M28 66C24 76 24 86 28 94"/>` +
        mexe(90, 118, `<circle class="pa-f-turq pa-t" cx="90" cy="80" r="38"/>` +
          `<path class="pa-s-linha" stroke-width="2.5" d="M56 66C76 77 104 77 124 62M60 98C78 90 104 90 122 100"/>` +
          `<path class="pa-s-branco pa-leve" stroke-width="4" d="M66 60C72 52 80 48 88 47"/><circle class="pa-f-turqc" cx="90" cy="44.5" r="2.5"/>` +
          TUBO('M64 50C86 34 120 40 136 60C148 76 146 98 132 110', 'coral', 7)) +
        `<rect class="pa-f-escuro" x="142" y="108" width="30" height="5" rx="2.5"/>` +
        `<rect class="pa-f-amar pa-t" x="138" y="100" width="9" height="21" rx="3"/><rect class="pa-f-amar pa-t" x="167" y="100" width="9" height="21" rx="3"/>`,
      enfeite: B(160, 32, 7) + B(26, 40, 5) + O(176, 74, 4) + O(184, 64, 2.5),
    },
    'educacao-fisica': {
      nome: 'Cronômetro e apito', mexe: 'tique', foco: '22 10 140 114', fundo: [104, 70, 58],
      objeto: `<rect class="pa-f-turq pa-t" x="106" y="22" width="12" height="9" rx="2"/><rect class="pa-f-turqc pa-t" x="103" y="16" width="18" height="7" rx="3"/>` +
        `<g transform="rotate(42 112 70)"><rect class="pa-f-turq pa-t" x="108" y="27" width="8" height="8" rx="2"/></g>` +
        `<circle class="pa-f-turq pa-t" cx="112" cy="70" r="38"/><circle class="pa-f-perola pa-t" cx="112" cy="70" r="30"/>` +
        `<path class="pa-s-escuro" stroke-width="2.5" d="M112 44V49M112 91V96M86 70H91M133 70H138M93.6 51.6L96.4 54.4M127.6 85.6L130.4 88.4M93.6 88.4L96.4 85.6M127.6 54.4L130.4 51.6"/>` +
        `<path class="pa-s-amar" stroke-width="5" d="M112 51A19 19 0 0 1 131 70"/>` +
        mexe(112, 70, `<path class="pa-s-coral" stroke-width="3.5" d="M112 70V52"/>`) + `<circle class="pa-f-escuro" cx="112" cy="70" r="4"/>` +
        TUBO('M40 98C24 86 26 58 44 54C58 51 66 64 62 78', 'coral', 3) +
        `<path class="pa-f-amar pa-t" d="M38 102A14 14 0 0 1 52 88H84Q88 88 88 92V96Q88 100 84 100H65.9A14 14 0 1 1 38 102Z"/>` +
        `<rect class="pa-f-escuro" x="70" y="88" width="7" height="4" rx="1"/><circle class="pa-f-amars" cx="52" cy="102" r="5"/>`,
      enfeite: B(166, 28, 7) + B(26, 36, 5) + O(172, 110, 5) + O(182, 98, 3) + O(176, 58, 3),
    },
    odontologia: {
      nome: 'Dente com brilho e escova', mexe: 'brilha', foco: '24 14 146 112', fundo: [100, 72, 46],
      objeto: `<g transform="rotate(-28 60 104)"><rect class="pa-f-turq pa-t" x="22" y="100" width="58" height="9" rx="4.5"/><rect class="pa-f-branco pa-t" x="64" y="88" width="16" height="12" rx="2"/>` +
        `<path class="pa-t2" d="M68 88V100M72 88V100M76 88V100"/></g>` +
        `<path class="pa-f-branco pa-t" d="M70 46C70 30 86 28 92 34Q100 40 108 34C114 28 130 30 130 46C130 62 124 70 122 84C120 100 116 116 110 116C104 116 104 96 100 92C96 96 96 116 90 116C84 116 80 100 78 84C76 70 70 62 70 46Z"/>` +
        `<path class="pa-s-turqc" stroke-width="3.5" d="M78 46C78 40 82 37 87 38"/>` +
        mexe(146, 46, B(140, 40, 11) + B(155, 58, 5)),
      enfeite: B(36, 40, 6) + O(166, 104, 5) + O(176, 92, 3) + O(30, 64, 4),
    },
    'medicina-veterinaria': {
      nome: 'Pata com sinal de mais', mexe: 'acena', foco: '44 22 114 102', fundo: [100, 72, 46],
      objeto: mexe(100, 116, `<ellipse class="pa-f-perola pa-t" cx="66" cy="66" rx="10" ry="12.5" transform="rotate(-24 66 66)"/>` +
        `<ellipse class="pa-f-perola pa-t" cx="88" cy="46" rx="10" ry="13"/><ellipse class="pa-f-perola pa-t" cx="114" cy="46" rx="10" ry="13"/>` +
        `<ellipse class="pa-f-perola pa-t" cx="136" cy="66" rx="10" ry="12.5" transform="rotate(24 136 66)"/>` +
        `<path class="pa-f-perola pa-t" d="M101 70C116 70 130 84 130 99C130 111 118 116 109 114C105 113 103 110 101 110C99 110 97 113 93 114C84 116 72 111 72 99C72 84 86 70 101 70Z"/>` +
        `<path class="pa-f-turq" d="M97 84H105V91H112V99H105V106H97V99H90V91H97Z"/>`),
      enfeite: B(40, 36, 6) + B(166, 100, 6) + O(168, 36, 5) + O(178, 48, 3) + O(30, 104, 4),
    },
    nutricao: {
      nome: 'Maçã com fita métrica', mexe: 'folha', foco: '36 20 140 104', fundo: [98, 76, 50],
      objeto: `<path class="pa-s-escuro" stroke-width="3.5" d="M98 52C98 44 100 38 104 34"/>` +
        mexe(102, 40, `<path class="pa-f-verde pa-t" d="M102 40C106 28 120 24 130 28C124 40 112 44 102 40Z"/><path class="pa-t2" d="M104 39L122 31"/>`) +
        `<path class="pa-f-coral pa-t" d="M98 52C88 44 66 44 62 66C58 88 72 114 88 116C94 117 96 114 98 114C100 114 102 117 108 116C124 114 138 88 134 66C130 44 108 44 98 52Z"/>` +
        `<path class="pa-s-branco pa-leve" stroke-width="4" d="M72 66C72 58 78 54 84 54"/>` +
        TUBO('M42 100C70 92 112 72 152 56C164 52 172 60 168 70', 'amar', 8) +
        `<path class="pa-s-escuro" stroke-width="4" stroke-dasharray="1.2 5" d="M44 99C70 91 112 71 150 56.5"/>`,
      enfeite: B(40, 40, 6) + B(162, 104, 6) + O(176, 30, 5) + O(186, 40, 3) + O(26, 64, 4),
    },
    farmacia: {
      nome: 'Pilão com pistilo e cápsula', mexe: 'mexe', foco: '30 14 136 112', fundo: [100, 76, 58],
      objeto: `<g transform="rotate(-30 56 40)"><path class="pa-f-coral pa-t" d="M56 32H46A8 8 0 0 0 46 48H56Z"/><path class="pa-f-branco pa-t" d="M56 32H66A8 8 0 0 1 66 48H56Z"/></g>` +
        `<circle class="pa-f-branco pa-t" cx="82" cy="26" r="6"/><path class="pa-t2" d="M78 26H86"/>` +
        mexe(112, 76, `<path class="pa-f-lar pa-t" d="M104 78L138 28Q144 20 150 25Q156 31 149 37L115 84Z"/>`) +
        `<path class="pa-f-perola pa-t" d="M50 72H150C150 99 129 116 100 116C71 116 50 99 50 72Z"/>` +
        `<rect class="pa-f-perola pa-t" x="46" y="66" width="108" height="10" rx="5"/>` +
        `<path class="pa-f-perola pa-t" d="M82 114L76 122H124L118 114Z"/>` +
        `<path class="pa-f-turq" d="M96 84H104V91H111V99H104V106H96V99H89V91H96Z"/>`,
      enfeite: B(166, 62, 6) + B(30, 96, 5) + O(170, 104, 5) + O(180, 92, 3) + O(28, 60, 4),
    },
    biomedicina: {
      nome: 'Microscópio e tubo de ensaio', mexe: 'bolhas', foco: '30 8 136 116', fundo: [96, 70, 62],
      objeto: `<rect class="pa-f-turq pa-t" x="40" y="110" width="72" height="10" rx="4"/>` +
        TUBO('M98 110C120 104 122 72 106 52', 'turq', 9) +
        `<rect class="pa-f-perola pa-t" x="62" y="84" width="50" height="7" rx="2"/><rect class="pa-f-turqc" x="74" y="80.5" width="24" height="3.5" rx="1"/>` +
        `<rect class="pa-f-perola pa-t" x="91" y="64" width="10" height="16" rx="2"/>` +
        `<g transform="rotate(-28 86 44)"><rect class="pa-f-perola pa-t" x="78" y="22" width="17" height="46" rx="4"/><rect class="pa-f-turq pa-t" x="75" y="14" width="23" height="10" rx="3"/></g>` +
        `<circle class="pa-f-amar pa-t" cx="112" cy="78" r="5"/>` +
        `<rect class="pa-f-perola pa-t" x="132" y="30" width="26" height="7" rx="3"/>` +
        `<path class="pa-f-vidro pa-t" d="M136 37H154V100A9 9 0 0 1 136 100Z"/><path class="pa-f-lilas" d="M137.5 68H152.5V100A7.5 7.5 0 0 1 137.5 100Z"/>` +
        mexe(145, 90, `<circle class="pa-f-branco" cx="143" cy="98" r="2.5"/><circle class="pa-f-branco" cx="148" cy="88" r="2" style="--pa-i:1"/><circle class="pa-f-branco" cx="142" cy="80" r="1.6" style="--pa-i:2"/>`) +
        `<path class="pa-s-branco pa-leve" stroke-width="2.5" d="M140 44V60"/>`,
      enfeite: B(176, 60, 6) + B(28, 44, 6) + O(176, 108, 5) + O(186, 96, 3) + O(24, 86, 4),
    },
    administracao: {
      nome: 'Gráfico subindo e maleta', mexe: 'sobe', foco: '22 14 152 112', fundo: [110, 70, 64],
      objeto: `<path class="pa-s-linha" stroke-width="3" d="M60 112H170"/>` +
        `<rect class="pa-f-turqc pa-t" x="70" y="86" width="18" height="26" rx="3"/><rect class="pa-f-turq pa-t" x="96" y="72" width="18" height="40" rx="3"/>` +
        `<rect class="pa-f-turqc pa-t" x="122" y="58" width="18" height="54" rx="3"/><rect class="pa-f-amar pa-t" x="148" y="42" width="18" height="70" rx="3"/>` +
        mexe(146, 30, TUBO('M62 78L88 58L108 66L144 32', 'amar', 4.5) + `<path class="pa-f-amar pa-t" d="M134 26L152 22L150 40Z"/>`) +
        `<path class="pa-t2" d="M40 92V87Q40 82 45 82H57Q62 82 62 87V92"/>` +
        `<rect class="pa-f-amars pa-t" x="28" y="92" width="46" height="30" rx="5"/><path class="pa-s-escuro" stroke-width="2.5" d="M28 104H74"/>` +
        `<rect class="pa-f-amar pa-t2" x="46" y="100" width="10" height="8" rx="2"/>`,
      enfeite: B(34, 44, 6) + B(178, 70, 5) + O(182, 104, 4) + O(188, 92, 2.5),
    },
    'ciencias-contabeis': {
      nome: 'Calculadora e pilha de moedas', mexe: 'moeda', foco: '40 18 138 108', fundo: [104, 72, 60],
      objeto: `<rect class="pa-f-turq pa-t" x="54" y="28" width="58" height="92" rx="9"/>` +
        `<rect class="pa-f-escuro pa-t2" x="61" y="36" width="44" height="20" rx="3"/>` +
        `<path class="pa-s-verde" stroke-width="3" d="M70 46H76M81 46H87M92 46H98"/>` +
        [64, 78, 92, 106].map((y, l) => [61, 76.5, 92].map((x, c) =>
          `<rect class="${l === 3 && c === 2 ? 'pa-f-coral' : 'pa-f-perola'} pa-t2" x="${x}" y="${y}" width="13" height="9" rx="2"/>`).join('')).join('') +
        MOEDA(148, 110, 18) + MOEDA(148, 102, 18) + MOEDA(148, 94, 18) + MOEDA(148, 86, 18) +
        mexe(150, 64, `<g transform="rotate(-14 150 64)">${MOEDA(150, 62, 15)}</g>`),
      enfeite: B(34, 40, 6) + B(176, 36, 6) + O(30, 96, 5) + O(22, 84, 3) + O(180, 120, 3),
    },
    'gestao-de-pessoas': {
      nome: 'Três pessoas ligadas e um coração', mexe: 'acena', foco: '30 10 140 110', fundo: [100, 74, 66],
      objeto: `<path class="pa-s-branco pa-leve" stroke-width="2.5" stroke-dasharray="4 5" d="M66 50Q82 30 94 38M134 50Q118 30 106 38"/>` +
        `<path class="pa-f-coral pa-t2" d="${CORACAO(100, 22, 9)}"/>` +
        `<circle class="pa-f-turq pa-t" cx="60" cy="64" r="11"/><path class="pa-f-turq pa-t" d="M40 114C40 92 49 82 60 82C71 82 80 92 80 114Z"/>` +
        `<circle class="pa-f-coral pa-t" cx="140" cy="64" r="11"/><path class="pa-f-coral pa-t" d="M120 114C120 92 129 82 140 82C151 82 160 92 160 114Z"/>` +
        mexe(100, 116, `<circle class="pa-f-amar pa-t" cx="100" cy="54" r="14"/><path class="pa-f-amar pa-t" d="M74 116C74 90 86 76 100 76C114 76 126 90 126 116Z"/>`),
      enfeite: B(30, 36, 6) + B(170, 36, 6) + O(178, 98, 4) + O(186, 88, 2.5) + O(22, 92, 4),
    },
    direito: {
      nome: 'Balança da justiça e martelo', mexe: 'balanca', foco: '30 14 154 112', fundo: [100, 70, 58],
      objeto: `<path class="pa-f-amars pa-t" d="M80 118L84 108H116L120 118Z"/><rect class="pa-f-amar pa-t" x="96" y="36" width="8" height="74" rx="3"/>` +
        mexe(100, 44, TUBO('M58 44H142', 'amar', 4) +
          `<path class="pa-t2" d="M58 46L44 84M58 46L72 84M142 46L128 84M142 46L156 84"/>` +
          `<path class="pa-f-amar pa-t" d="M40 84H76C74 98 42 98 40 84Z"/><path class="pa-f-amar pa-t" d="M124 84H160C158 98 126 98 124 84Z"/>` +
          `<circle class="pa-f-amars" cx="58" cy="44" r="3"/><circle class="pa-f-amars" cx="142" cy="44" r="3"/>`) +
        `<circle class="pa-f-amar pa-t" cx="100" cy="32" r="7"/>` +
        `<g transform="translate(150 110) rotate(-28)"><rect class="pa-f-lar pa-t" x="6" y="-3" width="32" height="7" rx="3"/><rect class="pa-f-lar pa-t" x="-10" y="-12" width="16" height="24" rx="4"/>` +
        `<rect class="pa-f-amars" x="-10" y="-3" width="16" height="4"/></g><ellipse class="pa-f-lar pa-t" cx="146" cy="122" rx="15" ry="3.5"/>`,
      enfeite: B(34, 30, 7) + B(170, 40, 6) + O(26, 104, 5) + O(34, 114, 3),
    },
    pedagogia: {
      nome: 'Quadro com ABC e lápis', mexe: 'escreve', foco: '28 14 152 112', fundo: [96, 66, 60],
      objeto: TUBO('M62 96L50 122M128 96L140 122', 'amars', 4) +
        `<rect class="pa-f-amars pa-t" x="34" y="24" width="122" height="76" rx="5"/><rect class="pa-f-quadro" x="40" y="30" width="110" height="64" rx="2"/>` +
        `<path class="pa-s-branco" stroke-width="3" d="M52 72L59 48L66 72M54.5 64H63.5M74 48V72M74 48H80Q86 48 86 54Q86 60 80 60H74M80 60Q87 60 87 66Q87 72 80 72H74M106 52Q103 48 99 48Q92 48 92 60Q92 72 99 72Q103 72 106 68"/>` +
        `<path class="pa-s-amar" stroke-width="2.5" d="M112.5 59L116 56V68M122 62H130M126 58V66M134 58Q134 55 137 55Q140 55 140 58Q140 61 134 68H141"/>` +
        `<rect class="pa-f-amars pa-t" x="38" y="94" width="114" height="6" rx="2"/><rect class="pa-f-branco" x="56" y="91" width="10" height="3" rx="1"/>` +
        `<g transform="rotate(28 162 88)">` + mexe(162, 120, `<rect class="pa-f-amar pa-t" x="154" y="48" width="16" height="56" rx="2"/>` +
          `<rect class="pa-f-coral pa-t" x="154" y="38" width="16" height="10" rx="3"/><rect class="pa-f-perola pa-t" x="154" y="47" width="16" height="5"/>` +
          `<path class="pa-f-perola pa-t" d="M154 104L162 120L170 104Z"/><path class="pa-f-escuro" d="M159.5 115L162 120L164.5 115Z"/>`) + `</g>`,
      enfeite: B(168, 18, 5) + O(22, 64, 4) + O(26, 52, 2.5) + O(24, 108, 4),
    },
    'engenharia-civil': {
      nome: 'Prédio em construção, guindaste e capacete', mexe: 'ica', foco: '18 12 160 114', fundo: [104, 70, 70],
      objeto: `<rect class="pa-f-perola pa-t" x="58" y="58" width="56" height="62" rx="2"/>` +
        `<path class="pa-s-escuro" stroke-width="2.4" d="M58 78H114M58 98H114M77 58V120M96 58V120"/>` +
        `<rect class="pa-f-turqc" x="61" y="61" width="13" height="14"/><rect class="pa-f-turqc" x="99" y="81" width="12" height="14"/><rect class="pa-f-turqc" x="80" y="101" width="13" height="16"/>` +
        TUBO('M136 120V30', 'amar', 5) +
        `<path class="pa-s-escuro" stroke-width="1.8" d="M133 50L139 58M133 66L139 74M133 82L139 90M133 98L139 106"/>` +
        TUBO('M66 32H172', 'amar', 4) + `<path class="pa-t2" d="M136 20L68 32M136 20L172 32"/>` +
        `<rect class="pa-f-escuro" x="158" y="33" width="14" height="10" rx="2"/><rect class="pa-f-amar pa-t" x="128" y="34" width="16" height="12" rx="2"/>` +
        mexe(74, 46, `<path class="pa-t2" d="M74 33V44"/><path class="pa-t2" d="M70 44Q74 51 78 44"/><rect class="pa-f-coral pa-t" x="58" y="49" width="32" height="6" rx="1.5"/>`) +
        `<path class="pa-f-amar pa-t" d="M28 116C28 96 42 86 56 86C70 86 84 96 84 116Z"/><rect class="pa-f-amars pa-t" x="20" y="113" width="72" height="8" rx="3"/>` +
        `<path class="pa-s-escuro" stroke-width="2.4" d="M56 86V100"/><path class="pa-s-branco pa-leve" stroke-width="3" d="M38 102C40 96 44 92 50 90"/>`,
      enfeite: B(176, 66, 6) + B(30, 52, 6) + O(178, 106, 4) + O(186, 96, 2.5),
    },
    'engenharia-de-producao': {
      nome: 'Engrenagens e esteira com caixas', mexe: 'gira', foco: '26 8 150 116', fundo: [100, 66, 66],
      objeto: `<rect class="pa-f-escuro pa-t" x="30" y="104" width="140" height="12" rx="6"/>` +
        [40, 62, 84, 106, 128, 150].map(x => `<circle class="pa-f-perola" cx="${x}" cy="110" r="3.5"/>`).join('') +
        `<rect class="pa-f-lar pa-t" x="38" y="84" width="24" height="20" rx="2"/><path class="pa-s-amars" stroke-width="3" d="M50 84V96"/>` +
        `<rect class="pa-f-amars pa-t" x="136" y="88" width="22" height="16" rx="2"/><path class="pa-s-lar" stroke-width="3" d="M147 88V98"/>` +
        mexe(94, 58, `<path class="pa-f-amar pa-t" d="${ENGRENAGEM(94, 58, 24, 10, 7)}"/><circle class="pa-f-escuro pa-t2" cx="94" cy="58" r="8"/>`) +
        mexe(132, 40, `<path class="pa-f-turq pa-t" d="${ENGRENAGEM(132, 40, 14, 8, 6)}"/><circle class="pa-f-escuro pa-t2" cx="132" cy="40" r="5"/>`, 'pa-anti'),
      enfeite: B(30, 40, 6) + B(170, 76, 6) + O(166, 22, 4) + O(176, 30, 2.5),
    },
    arquitetura: {
      nome: 'Compasso sobre a planta de uma casa', mexe: 'compasso', foco: '22 8 152 116', fundo: [98, 72, 66],
      objeto: `<g transform="rotate(-4 96 82)"><rect class="pa-f-azul pa-t" x="34" y="44" width="128" height="74" rx="3"/>` +
        `<path class="pa-s-branco pa-leve" stroke-width="1" d="M34 58H162M34 72H162M34 86H162M34 100H162M50 44V118M66 44V118M82 44V118M98 44V118M114 44V118M130 44V118M146 44V118"/>` +
        `<path class="pa-s-branco" stroke-width="2.5" d="M58 106V84L80 68L102 84V106ZM74 106V94H86V106M90 88H96V94H90Z"/></g>` +
        `<rect class="pa-f-azul pa-t" x="26" y="40" width="12" height="80" rx="6"/>` +
        `<path class="pa-s-amar" stroke-width="2.5" stroke-dasharray="5 4" d="M153 99A35 35 0 0 0 134 72"/>` +
        mexe(118, 104, TUBO('M134 26L118 104', 'perola', 4) + TUBO('M134 26L152 98', 'perola', 4) +
          `<path class="pa-f-escuro" d="M116 100L118 108L121 101Z"/><path class="pa-f-amar pa-t2" d="M149 94L153 104L156 94Z"/>` +
          `<circle class="pa-f-amar pa-t" cx="134" cy="26" r="7"/><rect class="pa-f-amar pa-t" x="131" y="12" width="6" height="10" rx="2"/>`),
      enfeite: B(170, 30, 6) + B(30, 24, 5) + O(176, 108, 4) + O(184, 98, 2.5),
    },
    sistemas: {
      nome: 'Notebook com código', mexe: 'cursor', foco: '26 18 148 104', fundo: [100, 70, 66],
      objeto: `<rect class="pa-f-escuro pa-t" x="48" y="26" width="104" height="70" rx="7"/><rect class="pa-f-tela" x="55" y="33" width="90" height="56" rx="3"/>` +
        `<path class="pa-s-turqc" stroke-width="5" d="M86 46L74 58L86 70M114 46L126 58L114 70M104 42L96 74"/>` +
        `<path class="pa-s-amar" stroke-width="3" d="M62 82H76"/><path class="pa-s-coral" stroke-width="3" d="M82 82H100"/><path class="pa-s-perola" stroke-width="3" d="M106 82H112"/>` +
        mexe(120, 82, `<rect class="pa-f-branco" x="117" y="78" width="4" height="8" rx="1"/>`) +
        `<path class="pa-f-perola pa-t" d="M40 96H160L170 112Q171 117 166 117H34Q29 117 30 112Z"/>` +
        `<rect class="pa-f-linha" x="88" y="105" width="24" height="7" rx="2"/><path class="pa-s-linha" stroke-width="2" stroke-dasharray="4 3" d="M50 101H150"/>`,
      enfeite: B(170, 30, 6) + B(30, 40, 6) + O(178, 74, 4) + O(186, 64, 2.5) + O(22, 96, 4),
    },
    'ciencia-da-computacao': {
      nome: 'Chip com circuitos', mexe: 'pulsa', foco: '28 12 140 112', fundo: [100, 72, 60],
      objeto: `<path class="pa-s-turqc" stroke-width="2.5" d="M88 42V28H64M112 42V22H136M132 64H158V50M132 80H156V98M68 70H44V86M68 56H40M100 100V116H124M88 100V112H64"/>` +
        mexe(100, 72, [[60, 28], [140, 22], [158, 46], [156, 102], [44, 90], [36, 56], [128, 116], [60, 112]].map(([x, y], i) =>
          `<circle class="pa-f-turqc pa-t2" cx="${x}" cy="${y}" r="4" style="--pa-i:${i % 4}"/>`).join('')) +
        [0, 1, 2, 3].map(i => `<rect class="pa-f-perola pa-t2" x="${80 + i * 12}" y="40" width="6" height="10" rx="1.5"/><rect class="pa-f-perola pa-t2" x="${80 + i * 12}" y="98" width="6" height="10" rx="1.5"/>` +
          `<rect class="pa-f-perola pa-t2" x="64" y="${55 + i * 12}" width="10" height="6" rx="1.5"/><rect class="pa-f-perola pa-t2" x="126" y="${55 + i * 12}" width="10" height="6" rx="1.5"/>`).join('') +
        `<rect class="pa-f-escuro pa-t" x="72" y="48" width="56" height="52" rx="6"/><rect class="pa-f-azul pa-t2" x="82" y="58" width="36" height="32" rx="3"/>` +
        `<path class="pa-s-escuro" stroke-width="2" d="M90 66H110M90 74H104M90 82H108"/>`,
      enfeite: B(176, 74, 5) + B(26, 104, 5) + O(26, 30, 3.5) + O(176, 24, 4) +
        `<path class="pa-s-amar" stroke-width="2.5" d="M164 124V112L161 114M172 112A4 6 0 1 0 172.1 112"/>`,
    },
    'inteligencia-artificial': {
      nome: 'Cérebro feito de conexões, ligado a um chip', mexe: 'pulsa', foco: '40 18 120 110', fundo: [100, 66, 52],
      objeto: `<rect class="pa-f-escuro pa-t" x="86" y="104" width="28" height="14" rx="3"/><path class="pa-s-perola" stroke-width="2.5" d="M92 118V124M100 118V124M108 118V124"/><path class="pa-t2" d="M100 98V104"/>` +
        `<path class="pa-f-lilas pa-t" d="M70 92C56 92 48 80 52 70C46 62 50 48 62 46C62 36 74 30 84 34C88 26 102 24 110 30C120 26 132 32 134 42C146 44 152 56 148 66C154 76 148 90 136 92C134 100 124 104 116 100C110 108 96 108 92 100C84 104 74 100 70 92Z"/>` +
        `<path class="pa-s-linha" stroke-width="2" d="M100 32V100"/>` +
        `<path class="pa-s-escuro pa-leve" stroke-width="1.8" d="M70 62L88 50L112 48L130 60L122 82L102 90L84 80L70 62M88 50L102 66L112 48M84 80L102 66L122 82M102 66L130 60"/>` +
        mexe(100, 66, [[70, 62], [88, 50], [112, 48], [130, 60], [122, 82], [102, 90], [84, 80], [102, 66]].map(([x, y], i) =>
          `<circle class="pa-f-branco pa-t2" cx="${x}" cy="${y}" r="4.5" style="--pa-i:${i % 4}"/>`).join('')),
      enfeite: B(36, 36, 6) + B(166, 30, 7) + O(170, 104, 5) + O(180, 92, 3) + O(26, 96, 4),
    },
    comunicacao: {
      nome: 'Megafone com ondas de som e microfone', mexe: 'som', foco: '26 18 156 104', fundo: [104, 70, 64],
      objeto: `<rect class="pa-f-escuro pa-t" x="40" y="98" width="8" height="22" rx="3"/>` +
        `<rect class="pa-f-perola pa-t" x="32" y="70" width="24" height="32" rx="12"/><path class="pa-s-linha" stroke-width="2" d="M36 80H52M36 87H52M36 94H52"/>` +
        `<g transform="rotate(-18 92 92)"><rect class="pa-f-escuro pa-t" x="87" y="80" width="10" height="22" rx="3"/></g>` +
        `<path class="pa-f-perola pa-t" d="M64 62H78V82H64Q60 82 60 78V66Q60 62 64 62Z"/>` +
        `<path class="pa-f-coral pa-t" d="M78 62L124 38V106L78 82Z"/><ellipse class="pa-f-corals pa-t" cx="124" cy="72" rx="9" ry="34"/>` +
        `<path class="pa-s-branco pa-leve" stroke-width="3" d="M86 64L112 51"/>` +
        mexe(150, 72, `<path class="pa-s-amar" stroke-width="4" d="M142 56Q150 72 142 88"/><path class="pa-s-amar" stroke-width="4" d="M152 48Q164 72 152 96" style="--pa-i:1"/>` +
          `<path class="pa-s-amar" stroke-width="4" d="M162 40Q178 72 162 104" style="--pa-i:2"/>`),
      enfeite: B(40, 40, 7) + B(98, 20, 5) + O(180, 116, 4) + O(26, 56, 3.5),
    },
  };

  /** A arte de uma profissão: o <svg> pronto (ou null). o.simples: só o objeto, recortado; o.classe: classes a mais. */
  function arte(id, o) {
    const a = ARTES[id];
    if (!a) return null;
    o = o || {};
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', o.simples ? a.foco : '0 0 200 140');
    svg.setAttribute('class', 'prof-arte' + (o.simples ? ' prof-arte--simples' : '') + (o.classe ? ' ' + o.classe : ''));
    svg.setAttribute('data-mexe', a.mexe);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const [cx, cy, chao] = a.fundo;
    svg.innerHTML = (o.simples ? '' : fundo(cx, cy, chao)) + a.objeto + (o.simples ? '' : a.enfeite);
    return svg;
  }

  window.ArtesProfissoes = {
    arte,
    tem: id => Object.prototype.hasOwnProperty.call(ARTES, id),
    ids: () => Object.keys(ARTES),
    nome: id => (ARTES[id] ? ARTES[id].nome : ''),
  };
})();

/*
 * mascotes.js — os rostos que a pessoa pode escolher para o Diver (Perfil → "Seu mascote").
 *
 * O corpo é sempre o mesmo (capuz, máscara, olhos, snorkel, nadadeiras) e fica no
 * <template id="molde-mascote"> do index.html. Só o rosto muda, por quatro "encaixes":
 *   .d-pele         cor da abertura do capuz
 *   .d-rosto-atras  o que fica atrás da máscara (barba, cabelo, manchas, penacho)
 *   .d-cilios       cílios (só aparecem com os olhos normal e pensando; ver estilo.css)
 *   .d-rosto-frente o que fica na frente da boca (bigode, bico e o bocal do snorkel)
 * Por isso as expressões (normal, feliz, triste, pensando) e as animações valem para todos.
 *
 * Escolha salva em "diver:v1:mascote" = { rosto, tom } (sincroniza com a nuvem como o resto).
 * Os desenhos são texto fixo daqui (nunca vêm de fora), então podem ir por innerHTML.
 */
const Mascotes = (() => {
  const CHAVE = 'diver:v1:mascote';
  const PADRAO = { rosto: 'pinguim-penacho', tom: 'media' };
  const CONTORNO = '#06172D';

  /** Tons de pele dos mergulhadores e mergulhadoras (cabelo, barba e boca acompanham). */
  const TONS = [
    { id: 'clara', nome: 'Clara', pele: '#FAD4B8', sombra: '#E0A884', cabelo: '#9A6236', cabeloEscuro: '#6E4224', boca: '#E07A8A' },
    { id: 'media', nome: 'Média', pele: '#F2B28C', sombra: '#D08F6C', cabelo: '#7A4630', cabeloEscuro: '#5C3322', boca: '#D9667F' },
    { id: 'morena', nome: 'Morena', pele: '#C68A5E', sombra: '#A06B44', cabelo: '#4A2A1A', cabeloEscuro: '#321B10', boca: '#B8566A' },
    { id: 'negra', nome: 'Negra', pele: '#7B4B2E', sombra: '#5E3720', cabelo: '#1F1410', cabeloEscuro: '#0B0705', boca: '#A4485C' },
  ];

  /* ---------- Peças de desenho ---------- */
  const BOCAL = '<rect x="100" y="156" width="42" height="20" rx="10" fill="#FACC15" stroke="#06172D" stroke-width="4"/><path d="M108,166 L134,166" stroke="#C99A0B" stroke-width="4" stroke-linecap="round"/>';
  const BOCAL_BICO = '<rect x="106" y="156" width="30" height="16" rx="8" fill="#FACC15" stroke="#06172D" stroke-width="4"/><path d="M112,164 L130,164" stroke="#C99A0B" stroke-width="4" stroke-linecap="round"/>';
  const barba = (t) => `<path d="M70,138 Q72,196 120,198 Q168,196 170,138 Q164,168 142,170 L98,170 Q76,168 70,138 Z" fill="${t.cabelo}"/>`;
  const queixo = (t) => `<path d="M104,186 Q120,194 136,186" fill="none" stroke="${t.sombra}" stroke-width="4" stroke-linecap="round"/>`;
  const detetive = (t) => `<path d="M78,154 Q84,138 104,140 Q114,141 120,146 Q126,141 136,140 Q156,138 162,154 Q164,162 156,162 Q146,156 136,158 L120,160 L104,158 Q94,156 84,162 Q76,162 78,154 Z" fill="${t.cabelo}" stroke="${CONTORNO}" stroke-width="3" stroke-linejoin="round"/><path d="M92,148 L96,156 M104,146 L106,155 M136,146 L134,155 M148,148 L144,156" stroke="${t.cabeloEscuro}" stroke-width="2.5" stroke-linecap="round"/>`;
  const labios = (t) => `<path d="M109,178 Q121,191 133,178 Q121,183 109,178 Z" fill="${t.boca}"/>`;
  /** Espelha uma peça desenhada do lado esquerdo do rosto para o direito. */
  const espelho = (svg) => `${svg}<g transform="matrix(-1 0 0 1 240 0)">${svg}</g>`;
  const CILIOS = `<g fill="none" stroke="#E6F1FF" stroke-width="3" stroke-linecap="round">${espelho('<path d="M83,106.5 L77.8,103.5 M86.4,102.5 L82.5,97.9 M90.9,99.9 L88.8,94.3"/>')}</g>`;
  const BRANCO_PINGUIM = '#F4F8FF';
  const bico = (curto) => curto
    ? '<path d="M106,170 Q121,168 136,170 Q132,180 121,181 Q110,180 106,170 Z" fill="#EA7A1F" stroke="#06172D" stroke-width="4" stroke-linejoin="round"/><path d="M101,157 Q103,145 121,144 Q139,145 141,157 Q121,162 101,157 Z" fill="#FB923C" stroke="#06172D" stroke-width="4" stroke-linejoin="round"/><path d="M111,150 Q116,147 121,147" fill="none" stroke="#FED7AA" stroke-width="3" stroke-linecap="round"/>' + BOCAL_BICO
    : '<path d="M103,170 Q121,168 139,170 Q134,184 121,185 Q108,184 103,170 Z" fill="#EA7A1F" stroke="#06172D" stroke-width="4" stroke-linejoin="round"/><path d="M97,157 Q98,141 121,139 Q144,141 145,157 Q121,163 97,157 Z" fill="#FB923C" stroke="#06172D" stroke-width="4" stroke-linejoin="round"/><path d="M108,147 Q114,143 121,143" fill="none" stroke="#FED7AA" stroke-width="3" stroke-linecap="round"/>' + BOCAL_BICO;

  /**
   * Catálogo. humano: usa o tom de pele. Cada peça é texto SVG (ou função do tom).
   * descricao vai para o leitor de tela.
   */
  const ROSTOS = [
    { id: 'pinguim-penacho', grupo: 'pinguins', nome: 'Pinguim de penacho', descricao: 'um pinguim de rosto branco, bico laranja e penacho amarelo saindo pelos lados da máscara',
      atras: '<g fill="#FCD34D" stroke="#06172D" stroke-width="3" stroke-linejoin="round"><path d="M62,98 Q44,90 34,74 Q52,82 58,80 Q46,70 44,58 Q60,72 72,90 Z"/><path d="M178,98 Q196,90 206,74 Q188,82 182,80 Q194,70 196,58 Q180,72 168,90 Z"/></g>',
      frente: bico(false) },
    { id: 'pinguim-classico', grupo: 'pinguins', nome: 'Pinguim clássico', descricao: 'um pinguim de rosto branco e bico laranja',
      atras: '', frente: bico(false) },
    { id: 'pinguim-imperador', grupo: 'pinguins', nome: 'Pinguim-imperador', descricao: 'um pinguim de rosto branco com manchas douradas nas laterais e bico laranja',
      atras: '<path d="M72,144 Q70,170 84,186 Q96,176 92,156 Q88,146 72,144 Z" fill="#FCD34D"/><path d="M168,144 Q170,170 156,186 Q144,176 148,156 Q152,146 168,144 Z" fill="#FCD34D"/>',
      frente: bico(false) },
    { id: 'pinguim-magalhaes', grupo: 'pinguins', nome: 'Pinguim-de-magalhães', descricao: 'um pinguim de rosto branco com uma faixa escura em U e bico laranja',
      atras: '<path d="M70,150 Q74,188 120,192 Q166,188 170,150 L170,164 Q164,178 120,180 Q76,178 70,164 Z" fill="#1E293B"/>',
      frente: bico(true) },

    { id: 'mergulhador', grupo: 'mergulhadores', humano: true, nome: 'Barba e bigode', descricao: 'um mergulhador de barba e bigode discreto',
      atras: barba, frente: (t) => `<path d="M95.8,161.5 Q98.6,147.5 111.2,148.9 Q118.2,150.3 121,153.1 Q123.8,150.3 130.8,148.9 Q143.4,147.5 146.2,161.5 Q135,155.9 121,158.7 Q107,155.9 95.8,161.5 Z" fill="${t.cabelo}"/>` },
    { id: 'guidao', grupo: 'mergulhadores', humano: true, nome: 'Bigode guidão', descricao: 'um mergulhador de barba e bigode com as pontas enroladas',
      atras: barba, frente: (t) => `<path d="M120,150 Q108,136 92,142 Q78,146 72,160 Q66,170 58,164 Q60,176 74,174 Q88,172 98,160 Q108,158 120,162 Q132,158 142,160 Q152,172 166,174 Q180,176 182,164 Q174,170 168,160 Q162,146 148,142 Q132,136 120,150 Z" fill="${t.cabelo}" stroke="${CONTORNO}" stroke-width="3" stroke-linejoin="round"/>` },
    { id: 'detetive', grupo: 'mergulhadores', humano: true, nome: 'Bigodão de detetive', descricao: 'um mergulhador de barba e bigodão largo',
      atras: barba, frente: detetive },
    { id: 'morsa', grupo: 'mergulhadores', humano: true, nome: 'Bigode de morsa', descricao: 'um mergulhador de barba e bigode cheio que cobre a boca',
      atras: barba, frente: (t) => `<path d="M76,148 Q80,134 100,136 Q112,136 120,142 Q128,136 140,136 Q160,134 164,148 Q168,162 160,168 Q156,160 148,163 Q146,169 138,167 Q134,161 128,164 Q124,169 120,164 Q116,169 112,164 Q106,161 102,167 Q94,169 92,163 Q84,160 80,168 Q72,162 76,148 Z" fill="${t.cabelo}" stroke="${CONTORNO}" stroke-width="3" stroke-linejoin="round"/>` },
    { id: 'fininho', grupo: 'mergulhadores', humano: true, nome: 'Bigode fininho', descricao: 'um mergulhador de barba e bigode fino',
      atras: barba, frente: (t) => `<path d="M92,150 Q106,142 120,148 Q134,142 148,150 Q134,148 120,153 Q106,148 92,150 Z" fill="${t.cabeloEscuro}" stroke="${CONTORNO}" stroke-width="2" stroke-linejoin="round"/>` },
    { id: 'so-bigode', grupo: 'mergulhadores', humano: true, nome: 'Só bigode', descricao: 'um mergulhador sem barba, com bigodão',
      atras: queixo, frente: detetive },
    { id: 'rosto-limpo', grupo: 'mergulhadores', humano: true, nome: 'Rosto limpo', descricao: 'um mergulhador sem barba e sem bigode',
      atras: queixo, frente: '' },

    { id: 'mergulhadora', grupo: 'mergulhadoras', humano: true, cilios: true, nome: 'Cabelo liso', descricao: 'uma mergulhadora de cabelo liso emoldurando o rosto e cílios',
      atras: (t) => espelho(`<path d="M70,132 Q64,160 72,186 Q80,198 92,194 Q84,178 84,160 Q84,144 90,136 Z" fill="${t.cabelo}"/>`),
      frente: labios },
    { id: 'mergulhadora-cachos', grupo: 'mergulhadoras', humano: true, cilios: true, nome: 'Cabelo cacheado', descricao: 'uma mergulhadora de cabelo cacheado e cílios',
      atras: (t) => espelho(`<g fill="${t.cabelo}" stroke="${t.cabeloEscuro}" stroke-width="2"><circle cx="77" cy="146" r="9"/><circle cx="74" cy="162" r="9"/><circle cx="78" cy="177" r="8.5"/><circle cx="88" cy="189" r="8"/><circle cx="87" cy="151" r="6"/></g>`),
      frente: labios },
  ];

  const GRUPOS = [
    { id: 'pinguins', nome: 'Pinguins' },
    { id: 'mergulhadores', nome: 'Mergulhadores' },
    { id: 'mergulhadoras', nome: 'Mergulhadoras' },
  ];

  const porId = (id) => ROSTOS.find((r) => r.id === id) || ROSTOS.find((r) => r.id === PADRAO.rosto);
  const tomPorId = (id) => TONS.find((t) => t.id === id) || TONS.find((t) => t.id === PADRAO.tom);
  const peca = (p, tom) => (typeof p === 'function' ? p(tom) : p || '');

  function escolhido() {
    const salvo = Dados.ler(CHAVE, null) || {};
    return { rosto: porId(salvo.rosto).id, tom: tomPorId(salvo.tom).id };
  }

  /** Pinta um <svg> (ou qualquer coisa que tenha os encaixes) com o rosto e o tom pedidos. */
  function pintar(raiz, rostoId, tomId) {
    const r = porId(rostoId);
    const t = tomPorId(tomId);
    const pele = raiz.querySelector('.d-pele');
    if (!pele) return;
    pele.setAttribute('fill', r.humano ? t.pele : BRANCO_PINGUIM);
    raiz.querySelector('.d-rosto-atras').innerHTML = peca(r.atras, t);
    raiz.querySelector('.d-rosto-frente').innerHTML = r.frente === '' ? BOCAL : peca(r.frente, t) + (r.grupo === 'pinguins' ? '' : BOCAL);
    raiz.querySelector('.d-cilios').innerHTML = r.cilios ? CILIOS : '';
  }

  /** Nome acessível do mascote escolhido. */
  function descricao(rostoId, tomId) {
    const r = porId(rostoId);
    return `Diver, o mascote: ${r.descricao}${r.humano ? `, pele ${tomPorId(tomId).nome.toLowerCase()}` : ''}, com roupa de mergulho, máscara amarela e snorkel`;
  }

  /** Um mascote avulso com um rosto específico (miniaturas do Perfil). */
  function miniatura(rostoId, tomId, classe = '') {
    const el = UI.h('div', { class: `mascote ${classe}`.trim(), 'data-mascote-fixo': true });
    el.append(document.getElementById('molde-mascote').content.cloneNode(true));
    pintar(el, rostoId, tomId);
    return el;
  }

  /**
   * Leva a escolha salva para o molde e para todos os mascotes já na tela.
   * Os mascotes montados são trocados por uma cópia nova do molde (as piscadas continuam em sincronia).
   */
  function aplicar() {
    const { rosto, tom } = escolhido();
    const molde = document.getElementById('molde-mascote');
    if (!molde) return;
    pintar(molde.content, rosto, tom);
    document.querySelectorAll('[data-mascote]').forEach((el) => {
      if (!el.firstElementChild) return;
      el.replaceChildren(molde.content.cloneNode(true));
    });
    const hero = document.querySelector('.hero__mascote');
    if (hero) hero.setAttribute('aria-label', descricao(rosto, tom));
  }

  function escolher(rostoId, tomId) {
    const atual = escolhido();
    Dados.gravar(CHAVE, { rosto: porId(rostoId || atual.rosto).id, tom: tomPorId(tomId || atual.tom).id });
    aplicar();
  }

  return { ROSTOS, GRUPOS, TONS, PADRAO, escolhido, escolher, aplicar, miniatura, descricao, porId };
})();

/* Mapa das Profissões: o ícone de cada profissão (2026-10-17). Primeiro foram 22 artes coloridas; o usuário pediu
   algo "mais discreto e simples", e cada profissão ganhou um ícone de traço, de uma cor só, no mesmo estilo dos ícones
   do app (24 × 24, traço 2, pontas redondas). Desenho nosso. A cor vem de currentColor: quem usa pinta com a cor da área.
   IconesProfissoes.icone(id) devolve o <svg> pronto (ou null, e a peça segue sem ícone). Faz parte do pacote
   "profissoes" (PACOTES em js/app.js) e vem antes de js/profissoes.js. Profissão nova pede um ícone novo aqui. */
(function () {
  'use strict';

  /* Cada ícone: o que ele mostra e o desenho (só as formas; o traço e a cor vêm do <svg>) */
  const ICONES = {
    medicina: ['Estetoscópio', '<path d="M6 3h2M16 3h2M7 3v4a5 5 0 0 0 10 0V3M12 12v3a3.5 3.5 0 0 0 7 0v-1.5"/><circle cx="19" cy="11.5" r="2"/>'],
    enfermagem: ['Coração com a cruz do cuidado', '<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/><path d="M12 10.5v5M9.5 13h5"/>'],
    psicologia: ['A letra grega psi', '<path d="M12 4v16M6.5 5.5v3.5a5.5 5.5 0 0 0 11 0V5.5M9 20h6"/>'],
    fisioterapia: ['Osso', '<path d="M15.5 3.8a2.2 2.2 0 0 1 3.9 1.1 2.2 2.2 0 0 1 1.1 3.9 2.2 2.2 0 0 1-3.3.6L9.4 17.2a2.2 2.2 0 0 1-.6 3.3 2.2 2.2 0 0 1-3.9-1.1 2.2 2.2 0 0 1-1.1-3.9 2.2 2.2 0 0 1 3.3-.6l7.8-7.8a2.2 2.2 0 0 1 .6-3.3z"/>'],
    'educacao-fisica': ['Haltere', '<path d="M7.5 12h9"/><rect x="4.5" y="7" width="3" height="10" rx="1.2"/><rect x="16.5" y="7" width="3" height="10" rx="1.2"/><path d="M2.5 9.5v5M21.5 9.5v5"/>'],
    odontologia: ['Dente', '<path d="M8 3.5c-2.4 0-4 1.8-4 4.4 0 2 .8 3.4 1.3 5.6.6 3 1 6.5 2.7 6.5 1.5 0 1.7-3.1 2.4-4.8.4-1 1.8-1 2.2 0 .7 1.7.9 4.8 2.4 4.8 1.7 0 2.1-3.5 2.7-6.5.5-2.2 1.3-3.6 1.3-5.6 0-2.6-1.6-4.4-4-4.4-1.6 0-2.6.9-4 .9s-2.4-.9-4-.9z"/>'],
    'medicina-veterinaria': ['Pegada de pata', '<path d="M8.3 17c0-2.8 1.7-5 3.7-5s3.7 2.2 3.7 5c0 1.8-1.5 2.6-3.7 2.6S8.3 18.8 8.3 17z"/><circle cx="6.3" cy="11" r="1.6" fill="currentColor" stroke="none"/><circle cx="9.6" cy="6.9" r="1.6" fill="currentColor" stroke="none"/><circle cx="14.4" cy="6.9" r="1.6" fill="currentColor" stroke="none"/><circle cx="17.7" cy="11" r="1.6" fill="currentColor" stroke="none"/>'],
    nutricao: ['Maçã', '<path d="M12 7.6c-1.4-1-3-1.3-4.4-.9C5.2 7.3 4 9.6 4 12.2c0 4.2 2.9 8.8 5.3 8.8 1.1 0 1.5-.6 2.7-.6s1.6.6 2.7.6c2.4 0 5.3-4.6 5.3-8.8 0-2.6-1.2-4.9-3.6-5.5-1.4-.4-3 0-4.4.9z"/><path d="M12 7.6c0-2 .8-3.6 2.4-4.6"/>'],
    farmacia: ['Cápsula de remédio', '<path d="M10.6 19.9a4.9 4.9 0 0 1-6.9-6.9l8.9-8.9a4.9 4.9 0 0 1 6.9 6.9z"/><path d="M8.2 8.5l7.3 7.3"/>'],
    biologia: ['Dupla hélice do DNA', '<path d="M7.5 3c0 4.5 9 4.5 9 9s-9 4.5-9 9M16.5 3c0 4.5-9 4.5-9 9s9 4.5 9 9"/><path d="M9 4.8h6M8.4 12h7.2M9 19.2h6"/>'],
    biomedicina: ['Tubo de ensaio', '<path d="M8.5 3h7M10 3v13.6a2 2 0 0 0 4 0V3M10 11h4"/><circle cx="12" cy="15" r=".9" fill="currentColor" stroke="none"/>'],
    administracao: ['Maleta', '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7M3 12.5h18"/>'],
    'ciencias-contabeis': ['Calculadora', '<rect x="5" y="3" width="14" height="18" rx="2.5"/><rect x="8" y="6" width="8" height="3.2" rx=".8"/><g fill="currentColor" stroke="none"><circle cx="9" cy="13" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="15" cy="17" r="1"/></g>'],
    'gestao-de-pessoas': ['Duas pessoas', '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9" r="2.4"/><path d="M15.4 14.4a4.8 4.8 0 0 1 5.6 4.6"/>'],
    direito: ['Balança da justiça', '<path d="M12 5.5V20M8 20h8M5 7.5h14"/><circle cx="12" cy="4" r="1.4"/><path d="M5 7.5 2.5 13M5 7.5 7.5 13M2.5 13a2.5 2.5 0 0 0 5 0M19 7.5 16.5 13M19 7.5 21.5 13M16.5 13a2.5 2.5 0 0 0 5 0"/>'],
    pedagogia: ['Livro aberto', '<path d="M12 6.6C10.4 5.1 7.9 4.6 4 4.6v13c3.9 0 6.4.5 8 2 1.6-1.5 4.1-2 8-2v-13c-3.9 0-6.4.5-8 2zM12 6.6v13"/>'],
    'engenharia-civil': ['Capacete de obra', '<path d="M5 16.5a7 7 0 0 1 14 0M10 9.8V7.1a7 7 0 0 1 4 0v2.7"/><rect x="3" y="16.5" width="18" height="3" rx="1.2"/>'],
    'engenharia-de-producao': ['Engrenagem', '<path d="M10.3 3.6h3.4l.5 2.3 1.6.7 2-1.3 2.4 2.4-1.3 2 .7 1.6 2.3.5v3.4l-2.3.5-.7 1.6 1.3 2-2.4 2.4-2-1.3-1.6.7-.5 2.3h-3.4l-.5-2.3-1.6-.7-2 1.3-2.4-2.4 1.3-2-.7-1.6-2.3-.5v-3.4l2.3-.5.7-1.6-1.3-2 2.4-2.4 2 1.3 1.6-.7z"/><circle cx="12" cy="12" r="3"/>'],
    arquitetura: ['Compasso de desenho', '<circle cx="12" cy="5" r="1.8"/><path d="M11.1 6.6 6 20.5M12.9 6.6 18 20.5M7.6 15.6a8.6 8.6 0 0 0 8.8 0"/>'],
    sistemas: ['Sinais de código', '<path d="M8 7.5 3.5 12 8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.6 5l-3.2 14"/>'],
    'ciencia-da-computacao': ['Chip de processador', '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".8"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>'],
    'inteligencia-artificial': ['Brilhos de ideia', '<path d="M10.5 3.5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"/><path d="M18.5 15c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7z"/>'],
    comunicacao: ['Megafone com ondas de som', '<path d="M3.5 10v4a1 1 0 0 0 1 1H7l7 4.5v-15L7 9H4.5a1 1 0 0 0-1 1z"/><path d="M17.5 9.2a4 4 0 0 1 0 5.6M20 6.6a7.6 7.6 0 0 1 0 10.8"/>'],
  };

  /** O ícone de uma profissão: o <svg> pronto (ou null). o.classe: classes a mais. */
  function icone(id, o) {
    const i = ICONES[id];
    if (!i) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const atributos = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round',
      'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'prof-icone' + (o && o.classe ? ' ' + o.classe : '') };
    Object.keys(atributos).forEach(k => svg.setAttribute(k, atributos[k]));
    svg.innerHTML = i[1];
    return svg;
  }

  window.IconesProfissoes = {
    icone,
    tem: id => Object.prototype.hasOwnProperty.call(ICONES, id),
    ids: () => Object.keys(ICONES),
    nome: id => (ICONES[id] ? ICONES[id][0] : ''),
  };
})();

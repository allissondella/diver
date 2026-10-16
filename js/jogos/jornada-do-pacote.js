/*
 * jogos/jornada-do-pacote.js — laboratório "Mão na massa" Jornada do Pacote (Explora Tech, Módulos 9 e 10;
 * prioridade A, 2026-10-16). Só JavaScript: a rede simulada fica em js/laboratorio/motor-rede.js e a tela usa o
 * modelo js/laboratorio/lab-js.js.
 * Em cada missão o aluno mexe na configuração (IP, máscara, gateway, DNS, porta, regras do firewall...) ou responde
 * a pergunta da missão e aperta "Enviar pacote". O mapa acende o caminho (aparelho → roteador → internet → servidor,
 * com o DNS) e o Painel de Pacotes lista cada salto, com a camada; o pacote perdido mostra onde e por quê.
 * 3 estrelas = chegar em até metas.envios envios.
 */
LabJS.registrar({
  id: 'jornada-do-pacote',
  nome: 'Jornada do Pacote',
  icone: 'i-bussola',
  duracao: '10-20 min',
  descricao: 'Mão na massa: configure a rede, mande o pacote e acompanhe cada salto no Painel de Pacotes, do DNS ao servidor e de volta.',
  motor: {
    textoConferir: 'Enviar pacote',
    iconeConferir: 'i-seta-dir',
    meta: (m) => ({ valor: m.metas.envios, texto: `o pacote chegar em até ${UI.plural(m.metas.envios, 'envio', 'envios')}` }),
    tutorial: [
      { desenho: 'diver', titulo: 'Jornada do Pacote', texto: 'Uma rede simulada, do seu aparelho até o servidor. Mexa na configuração e mande o pacote: o caminho acende e o Painel de Pacotes conta cada salto.' },
      { alvo: '.jp-config', desenho: 'livro', titulo: 'A configuração', texto: 'É aqui que você conserta o que estiver errado: IP, máscara, gateway, DNS, porta... ou responde a pergunta da missão.' },
      { alvo: '.jp-painel', desenho: 'lupa', titulo: 'Painel de Pacotes', texto: 'Cada linha é um passo da viagem, com a camada da rede. Se o pacote se perder, a linha vermelha diz onde e por quê.' },
    ],
    criar(m, { aoMudar }) {
      const { h, icone } = UI;
      let valores = MotorRede.iniciais(m);
      let envios = 0;
      let ultimo = null;
      const el = h('div', { class: 'jp' });
      const NOS = [
        { id: 'aparelho', nome: (m.cenario && m.cenario.aparelho && m.cenario.aparelho.nome) || 'Aparelho', icone: 'i-controle' },
        { id: 'roteador', nome: 'Roteador', icone: 'i-bussola' },
        { id: 'dns', nome: 'DNS', icone: 'i-livro' },
        { id: 'internet', nome: 'Internet', icone: 'i-onda' },
        { id: 'servidor', nome: (m.cenario && m.cenario.servidores && m.cenario.servidores[0] && m.cenario.servidores[0].rotulo) || 'Servidor', icone: 'i-casa' },
      ];
      const noDe = (x) => (x === 'provedor' ? 'internet' : x);
      const CAMADAS = { aplicação: 'Aplicação', transporte: 'Transporte', internet: 'Internet', rede: 'Rede local', 'acesso à rede': 'Acesso à rede' };

      function mapa() {
        const passou = new Set();
        let falhou = null;
        (ultimo ? ultimo.passos : []).forEach((p) => { if (p.ok) { passou.add(noDe(p.de)); passou.add(noDe(p.para)); } else falhou = noDe(p.de); });
        return h('ol', { class: 'jp-mapa', 'aria-label': 'O caminho do pacote' }, NOS.map((n) => {
          const estado = falhou === n.id ? 'falhou' : passou.has(n.id) ? 'passou' : '';
          return h('li', { class: `jp-no ${estado ? `jp-no--${estado}` : ''}`.trim() },
            h('span', { class: 'jp-no__icone' }, icone(estado === 'falhou' ? 'i-alerta' : n.icone)),
            h('span', { class: 'jp-no__nome', text: n.nome }),
            h('span', { class: 'visualmente-oculto', text: estado === 'falhou' ? ' (o pacote parou aqui)' : estado === 'passou' ? ' (passou)' : '' }));
        }));
      }

      function campo(c) {
        const id = `jp-campo-${c.id}`;
        const mudar = (e) => { valores[c.id] = e.target.value; aoMudar(); };
        const entrada = c.tipo === 'escolha'
          ? h('select', { class: 'jp-campo__entrada', id, onchange: mudar },
            (valores[c.id] === '' || !c.opcoes.includes(valores[c.id]) ? [h('option', { value: '', text: 'Escolha…' })] : []).concat(c.opcoes.map((o) => h('option', { value: o, selected: valores[c.id] === o, text: o }))))
          : h('input', { type: 'text', class: 'campo jp-campo__entrada', id, value: valores[c.id], autocomplete: 'off', spellcheck: 'false', inputmode: c.numerico ? 'decimal' : null, oninput: mudar,
            onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = document.getElementById('lab-conferir'); if (b) b.click(); } } });
        return h('div', { class: 'jp-campo' }, h('label', { for: id, class: 'jp-campo__rotulo', text: c.rotulo }), entrada, c.ajuda ? h('span', { class: 'jp-campo__ajuda', text: c.ajuda }) : null);
      }

      function fixos() {
        const linhas = (m.mostrar || []).map((x) => h('li', {}, h('span', { class: 'jp-fixo__rotulo', text: x.rotulo }), h('code', { class: 'codigo-linha', text: x.valor })));
        return linhas.length ? h('ul', { class: 'jp-fixos', 'aria-label': 'O que já se sabe da rede' }, linhas) : null;
      }

      function painel() {
        if (!ultimo) return h('p', { class: 'lab-apoio__texto', text: 'Aperte "Enviar pacote" para ver a viagem, salto por salto.' });
        return h('ol', { class: 'jp-passos', 'aria-live': 'polite' }, ultimo.passos.map((p, i) => h('li', { class: `jp-passo ${p.ok ? '' : 'jp-passo--falha'}`.trim(), style: `--atraso: ${Math.min(i, 12) * 60}ms` },
          h('span', { class: 'jp-passo__n', text: String(i + 1) }),
          h('span', { class: 'jp-passo__corpo' },
            h('span', { class: 'tag tag--neutra jp-passo__camada', text: CAMADAS[p.camada] || p.camada }),
            h('span', { class: 'jp-passo__texto', text: p.texto })),
          icone(p.ok ? 'i-check' : 'i-x'))));
      }

      function desenhar() {
        el.replaceChildren(
          h('section', { class: 'jp-bloco', 'aria-label': 'Mapa da viagem' }, h('h3', { class: 'jp-bloco__titulo', text: 'O caminho' }), mapa()),
          h('section', { class: 'jp-bloco jp-config', 'aria-label': 'Configuração' },
            h('h3', { class: 'jp-bloco__titulo', text: m.tituloCampos || 'Configuração' }),
            ...[fixos(), ...(m.campos || []).map(campo)].filter(Boolean)),
          h('section', { class: 'jp-bloco jp-painel', 'aria-label': 'Painel de Pacotes' },
            h('h3', { class: 'jp-bloco__titulo', text: `Painel de Pacotes${envios ? ` · envio ${envios}` : ''}` }), painel()));
      }

      desenhar();
      return {
        el,
        alvo: () => h('div', { class: 'fp-alvo' }, h('p', { class: 'lab-apoio__texto', text: m.objetivo || 'Faça o pacote chegar ao servidor e a resposta voltar.' })),
        conferir() {
          envios++;
          ultimo = MotorRede.simular(m, valores);
          desenhar();
          return MotorRede.conferir(m, valores, envios);
        },
        recomecar() { valores = MotorRede.iniciais(m); envios = 0; ultimo = null; desenhar(); },
      };
    },
  },
});

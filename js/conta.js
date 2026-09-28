/*
 * conta.js — telas de login e de troca de senha obrigatória.
 *
 * Conta.garantir() devolve uma promessa que só termina quando a pessoa está logada,
 * com a senha própria criada (no primeiro acesso) e com o progresso baixado da nuvem.
 * No "modo local" (sem Supabase configurado), termina na hora.
 */
const Conta = (() => {
  const { $, h, icone, limpar } = UI;
  const MIN_SENHA = 8;

  function mostrar(id) {
    document.querySelectorAll('.tela').forEach((t) => (t.hidden = t.id !== id));
    document.body.classList.add('modo-foco', 'modo-conta');
    const titulo = $(id).querySelector('h1');
    if (titulo) titulo.focus({ preventScroll: true });
  }

  function esconder() {
    document.body.classList.remove('modo-foco', 'modo-conta');
    document.documentElement.classList.add('logado'); // libera o app (ver .exige-login no CSS)
  }

  /** Enquanto confere a sessão salva, mostra só o logo (nada do app aparece antes do login). */
  function telaConectando() {
    const secao = limpar($('tela-login'));
    secao.append(h('div', { class: 'conta' },
      UI.mascote('conta__mascote'),
      h('h1', { class: 'hero__logo conta__logo', tabindex: '-1', text: 'Diver' }),
      h('p', { class: 'conta__texto', role: 'status', text: 'Conectando…' })));
    mostrar('tela-login');
  }

  function campoSenha(rotulo, autocomplete, id) {
    const input = h('input', { class: 'campo', type: 'password', id, required: true, autocomplete, minlength: String(MIN_SENHA) });
    const ver = h('button', { type: 'button', class: 'botao botao--link botao--pequeno campo-senha__ver', 'aria-pressed': 'false', 'aria-controls': id,
      onclick: () => {
        const mostrando = input.type === 'text';
        input.type = mostrando ? 'password' : 'text';
        ver.setAttribute('aria-pressed', String(!mostrando));
        ver.textContent = mostrando ? 'Mostrar' : 'Esconder';
      } }, 'Mostrar');
    return { input, bloco: h('div', { class: 'campo-grupo' }, h('label', { for: id, class: 'rotulo-campo', text: rotulo }), h('div', { class: 'campo-senha' }, input, ver)) };
  }

  /* ---------- Tela de login ---------- */
  function telaLogin(mensagem) {
    return new Promise((pronto) => {
      const email = h('input', { class: 'campo', type: 'email', id: 'login-email', required: true, autocomplete: 'username', inputmode: 'email' });
      const senha = campoSenha('Senha', 'current-password', 'login-senha');
      const aviso = h('p', { class: 'conta__aviso', role: 'alert' }, mensagem || '');
      const botao = h('button', { type: 'submit', class: 'botao botao--primario botao--largo botao--grande' }, 'Bora mergulhar!');
      const secao = limpar($('tela-login'));
      secao.append(h('div', { class: 'conta' },
        UI.mascote('conta__mascote'),
        h('h1', { class: 'hero__logo conta__logo', tabindex: '-1', text: 'Diver' }),
        h('p', { class: 'hero__slogan', text: 'Mergulhe. Acerte. Suba de nível.' }),
        h('form', { class: 'cartao conta__form', novalidate: true, onsubmit: async (e) => {
          e.preventDefault();
          if (!email.value.trim() || !senha.input.value) {
            aviso.textContent = 'Preencha o e-mail e a senha.';
            return;
          }
          botao.disabled = true;
          botao.textContent = 'Entrando…';
          aviso.textContent = '';
          try {
            await Nuvem.entrar(email.value, senha.input.value);
            pronto();
          } catch (erro) {
            aviso.textContent = erro.message;
            botao.disabled = false;
            botao.textContent = 'Bora mergulhar!';
            senha.input.select();
          }
        } },
        h('h2', { class: 'conta__titulo', text: 'Entrar' }),
        h('div', { class: 'campo-grupo' }, h('label', { for: 'login-email', class: 'rotulo-campo', text: 'E-mail' }), email),
        senha.bloco, aviso, botao),
        h('p', { class: 'conta__rodape', text: 'Ainda não tem acesso? Fale com quem te convidou para o Diver.' })));
      mostrar('tela-login');
      email.focus();
    });
  }

  /* ---------- Troca de senha obrigatória (primeiro acesso) ---------- */
  function telaNovaSenha() {
    return new Promise((pronto) => {
      const perfil = Nuvem.perfil();
      const nova = campoSenha('Nova senha', 'new-password', 'senha-nova');
      const repetir = campoSenha('Repita a nova senha', 'new-password', 'senha-repetir');
      const aviso = h('p', { class: 'conta__aviso', role: 'alert' });
      const botao = h('button', { type: 'submit', class: 'botao botao--primario botao--largo' }, 'Salvar e entrar');
      const secao = limpar($('tela-senha'));
      secao.append(h('div', { class: 'conta' },
        UI.mascote('conta__mascote'),
        h('h1', { class: 'conta__titulo-grande', tabindex: '-1', text: `Boas-vindas, ${perfil.nome.split(' ')[0]}!` }),
        h('p', { class: 'conta__texto', text: 'Antes do primeiro mergulho, crie a sua senha. A senha temporária só vale para este primeiro acesso.' }),
        h('form', { class: 'cartao conta__form', novalidate: true, onsubmit: async (e) => {
          e.preventDefault();
          const a = nova.input.value;
          if (a.length < MIN_SENHA) return (aviso.textContent = `A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
          if (!/[A-Za-z]/.test(a) || !/[0-9]/.test(a)) return (aviso.textContent = 'Misture letras e números para a senha ficar mais forte.');
          if (a !== repetir.input.value) return (aviso.textContent = 'As duas senhas estão diferentes.');
          botao.disabled = true;
          botao.textContent = 'Salvando…';
          aviso.textContent = '';
          try {
            await Nuvem.trocarSenha(a);
            UI.toast('Senha criada', 'Tudo certo. Bora mergulhar!', 'i-check');
            pronto();
          } catch (erro) {
            aviso.textContent = erro.message;
            botao.disabled = false;
            botao.textContent = 'Salvar e entrar';
          }
        } },
        h('h2', { class: 'conta__titulo', text: 'Crie sua senha' }),
        h('ul', { class: 'conta__regras' }, h('li', { text: `Pelo menos ${MIN_SENHA} caracteres` }), h('li', { text: 'Letras e números' }), h('li', { text: 'Diferente da senha temporária' })),
        nova.bloco, repetir.bloco, aviso, botao)));
      mostrar('tela-senha');
      nova.input.focus();
    });
  }

  /**
   * Garante que existe alguém logado e pronto para usar o app.
   * Retorna o perfil (ou null no modo local).
   */
  async function garantir() {
    if (!Nuvem.ativa) return null;
    // 1) a sessão salva ainda vale? Se não, tela de login (que só termina com login feito)
    let logado = false;
    let mensagem = '';
    if (Nuvem.temSessao()) {
      telaConectando();
      try {
        await Nuvem.carregarPerfil();
        logado = true;
      } catch (erro) {
        mensagem = erro.message;
      }
    }
    if (!logado) await telaLogin(mensagem);
    // 2) primeiro acesso: senha própria
    if (Nuvem.perfil().trocar_senha) await telaNovaSenha();
    // 3) progresso da nuvem para o navegador
    try {
      await Nuvem.Sincronia.baixar();
    } catch (erro) {
      UI.toast('Sem sincronizar', 'Não deu para baixar seu progresso agora. Tente recarregar a página.', 'i-x');
    }
    Nuvem.Sincronia.iniciar();
    esconder();
    return Nuvem.perfil();
  }

  async function sair() {
    if (!window.confirm('Sair da sua conta neste aparelho?')) return;
    UI.toast('Saindo', 'Salvando seu progresso…', 'i-bolha');
    await Nuvem.sair();
    location.hash = '';
    location.reload();
  }

  return { garantir, sair };
})();

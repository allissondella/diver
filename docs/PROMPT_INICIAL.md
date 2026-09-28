# Primeira sessão com o Claude Code

## Antes de abrir o Claude Code (uma vez só)
1. **Faça o merge do Pull Request #1** no GitHub (botão "Merge pull request") para o protótipo entrar na branch `main`.
2. Na pasta do projeto, atualize: `git checkout main` e `git pull`.
3. **Extraia o kit na raiz do projeto** (mesma pasta do `index.html`). Vão aparecer: `CLAUDE.md`, `docs/`, `.claude/` e `assets/mascote/`.
   - A pasta `.claude` é oculta. No Windows: Explorador de Arquivos → Exibir → Itens ocultos.
4. Faça o commit do kit: `git add .` → `git commit -m "docs: kit Diver v2.0"` → `git push`.

## Abrindo o Claude Code
- **App do Claude (aba Código):** escolha a pasta `diver` e a branch `main`. **Ou** abra a pasta no VS Code e use a extensão Claude Code.
- Escolha **um** dos dois para trabalhar a cada tarefa: as conversas não são compartilhadas entre o app e o VS Code, e o app pode trabalhar em uma cópia (worktree) do projeto. Para a rotina diária, o mais simples é ficar sempre no mesmo.
- Dica de uso: modelo **Sonnet** para a maior parte das tarefas; reserve o **Opus** para problemas difíceis. Acompanhe o consumo em Configurações → Uso (o limite é compartilhado com o chat).

## Cole este prompt na primeira sessão

```
Você vai trabalhar comigo no Diver, uma plataforma web de estudos gamificada.

1. Leia CLAUDE.md e, na sequência, docs/PRODUTO.md, docs/JOGOS.md, docs/DESIGN.md e docs/ROADMAP.md.
2. Depois, explore o código que já existe (index.html, css/, js/, data/trilhas/) e me faça um resumo curto do que encontrou: como o app está organizado, quais arquivos fazem o quê, quais são as variáveis CSS existentes e quais são os nomes reais dos campos dos JSON de trilhas.
3. Compare o resumo com o que está em docs/ e me diga o que estiver diferente (ex.: nomes de campos, cores, estrutura de pastas). Se algo em docs/ estiver desatualizado em relação ao código real, proponha o ajuste, mas NÃO altere nada ainda.
4. Regras desta sessão: não mude o comportamento de Mergulho, Simulado e Revisão; não faça merge nem push sem eu pedir; nada de chaves secretas.
5. Ao terminar, execute o comando /hoje para propor a Semana 1, D1, e espere o meu OK.
```

## Rotina de todo dia
1. Abra o Claude Code na pasta `diver` e digite `/hoje`. Aprove ou ajuste o plano.
2. Peça as mudanças em passos pequenos e teste no navegador (Live Server) a cada passo.
3. Ao terminar, digite `/encerrar-dia`: ele marca a tarefa, escreve no diário e sugere o commit.
4. Sexta-feira: retro de 10 minutos. E você também tem direito a Dias de Descanso.

## Se algo der errado
- **Quebrou algo?** `git status` e `git diff` mostram o que mudou; `git checkout -- arquivo` desfaz um arquivo. Commits pequenos e frequentes tornam voltar fácil.
- **O Claude se confundiu?** Digite `/clear` e recomece com `/hoje`.
- **Nunca** cole senhas ou chaves secretas no chat.

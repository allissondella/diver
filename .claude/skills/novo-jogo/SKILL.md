---
name: novo-jogo
description: Cria um jogo novo do Diver seguindo o contrato do motor de jogos (docs/JOGOS.md). Use como /novo-jogo <nome-do-jogo>, por exemplo /novo-jogo forca.
---

# /novo-jogo — criar um jogo pelo padrão

Jogo pedido: $ARGUMENTS

1. Leia `docs/JOGOS.md` (contrato, tipos de carta, derivação, especificação do jogo e checklist) e `docs/DESIGN.md`.
2. Se o nome **não** estiver no catálogo, pergunte antes de criar. Se estiver, use a especificação dele.
3. Mostre um plano curto (arquivos, telas, como o jogo usa as cartas) e espere o meu OK.
4. Crie `js/jogos/<id>.js` (e `css/jogos/<id>.css` se precisar), registre em `js/jogos/registro.js` e carregue no `index.html` seguindo o padrão do código existente.
5. O jogo usa **apenas** as cartas recebidas em `contexto.cartas` e termina chamando `contexto.aoTerminar(resultado)` com o **Resultado padrão**. Ele **nunca** concede XP ou pérolas diretamente.
6. Aplique a "roupa de mar" do jogo, o tom de voz e as mensagens fixas ("Mandou bem, Diver!"). Só use as cores e os tokens de `docs/DESIGN.md`.
7. Rode o **checklist de aceitação** de `docs/JOGOS.md` e me mostre o checklist marcado, dizendo o que ficou pendente.
8. Atualize o status do jogo em `docs/JOGOS.md`. Não marque o ROADMAP (isso é do `/encerrar-dia`).

---
name: encerrar-dia
description: Fecha a sessão de trabalho do Diver. Confere se a tarefa cumpre o "Pronto quando", marca no docs/ROADMAP.md, registra no docs/DIARIO.md e sugere a mensagem de commit. Use no fim de cada sessão.
---

# /encerrar-dia — fechar o dia

1. Revise o que mudou (`git status` e `git diff --stat`) e faça uma checagem rápida: caminhos relativos, nomes de arquivo em minúsculas, nenhum `console.log` esquecido, nenhuma chave ou dado pessoal.
2. Confirme comigo se a tarefa cumpre o **"Pronto quando"**. Só então marque `- [x]` em `docs/ROADMAP.md`. Nunca renumere tarefas.
3. Acrescente uma entrada **no topo** de `docs/DIARIO.md`, neste formato:
   `## AAAA-MM-DD · D# — título` seguido de: o que foi feito, decisões, pendências e próximo passo.
4. Sugira a mensagem de commit em português (`feat:`, `fix:` ou `docs:`). **Não faça commit nem push** sem eu pedir.
5. Se a tarefa tiver "Retro" (sexta), conduza uma retro de 10 minutos: o que deu certo, o que travou, o que muda na semana que vem. Registre no diário.
6. Se a semana terminar em marco (Semanas 2, 5, 10, 12, 19 ou 24), lembre-me de mostrar o Diver para alguém.
7. Feche com uma frase gentil sobre descansar (descansar também é estudar).

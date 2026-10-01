---
name: validar-questoes
description: Roda o "Mergulho Triplo" — validação de questões geradas (do Enem ou originais) usando duas IAs externas de famílias diferentes (Gemini com busca, para fatos; GPT para lógica adversarial). Use depois de gerar conteúdo com a skill criar-trilha, ou para validar retroativamente qualquer trilha já existente.
---

# /validar-questoes — Mergulho Triplo (validação com duas IAs)

Leia primeiro `docs/ASSINATURA_E_VALIDACAO.md` inteiro antes de rodar qualquer checagem.

## 0. Configuração das chaves (nunca por chat)

As chaves `GEMINI_API_KEY` e `OPENAI_API_KEY` já estão cadastradas diretamente nos **Secrets das Edge Functions do Supabase**, feito pelo administrador direto no painel — nunca em arquivo do repositório, nunca em `.env` local, nunca coladas em qualquer chat (nem aqui, nem no Claude Code). O código lê essas variáveis só em tempo de execução dentro da Edge Function (`Deno.env.get('GEMINI_API_KEY')`), sem nunca expor o valor em nenhuma tela, log ou resposta.

**Se o usuário colar uma chave de API nesta conversa em algum momento, pare imediatamente e instrua: revogar aquela chave agora no painel do provedor (OpenAI ou Google) e gerar uma nova diretamente no Supabase. Nunca prossiga usando uma chave que apareceu em texto de chat.**

Toda execução real do Mergulho Triplo passa pela Fila de Validação (`fila_validacao` no Supabase) com aprovação manual por senha — nunca roda automaticamente, mesmo com as chaves configuradas.

**Onde está implementado (2026-10-01):** Edge Function `supabase/functions/mergulho-triplo/` (lê as chaves só com `Deno.env.get`), núcleo com os prompts e o funil em `supabase/functions/_shared/mergulho-nucleo.mjs`, tabela e funções do banco no fim de `supabase/setup.sql`, tela `js/fila-validacao.js` e o script `scripts/fila.mjs` (`simular`, `enviar`, `listar`, `baixar`), que não chama IA. Fluxo completo em `docs/MOTOR_DIVER.md`, seção 11. Para "rodar" esta skill: envie o lote para a fila (seção 2.3 da skill `criar-trilha`) e peça ao admin para aprovar na tela; o relatório da seção 5 aparece na tela e no `fila.mjs baixar`.

## 1. Prompts exatos

**Camada 1 — Fato (Gemini + grounding):**
```
Verifique cada afirmação factual (datas, números, fórmulas, nomes) neste texto usando busca real.
Aponte qualquer afirmação incorreta ou desatualizada, citando a fonte que a corrige.
Se tudo estiver correto, responda apenas "CONFIRMADO".

[questão + explicação completa, incluindo as três camadas: superfície, fundo, dica]
```

**Camada 2 — Lógica adversarial (GPT):**
```
Seu trabalho é tentar derrubar esta questão. Tente ativamente:
1. Provar que a alternativa marcada como correta está errada ou incompleta.
2. Encontrar outra alternativa que também possa estar certa.
3. Apontar ambiguidade no enunciado.
Se, mesmo tentando, a questão resistir, responda apenas "RESISTIU". Caso contrário, explique exatamente a falha encontrada.

[enunciado + alternativas + tema + dificuldade — NÃO inclua qual é o gabarito no prompt]
```

## 2. Funil de custo

1. Rode as duas camadas primeiro nos modelos baratos (Gemini Flash, GPT mini).
2. Se qualquer uma responder algo diferente de "CONFIRMADO"/"RESISTIU" (ou seja, achou algo ou ficou em dúvida), rode de novo naquela camada usando o modelo mais robusto (Gemini 3 Pro / GPT-5.2 completo) para confirmar se é falha real ou falso positivo.
3. Só escale o modelo caro quando necessário — não rode tudo no modelo caro por padrão.

## 3. O que fazer com o resultado

- **As duas camadas confirmaram:** grave no JSON o bloco `validacao` (modelo usado, resultado, data) e marque a questão como pronta. **Adicione também uma cópia do item (enunciado, explicação em 3 camadas, tema, dificuldade) em `data/acervo/<materia>.json`** — isso alimenta o Motor Diver (`docs/MOTOR_DIVER.md`), para a skill `criar-trilha` usar como exemplo nas próximas gerações. Se o arquivo de acervo ainda não existir, crie-o.
- **Camada 1 (fato) reprovou:** corrija o fato específico apontado, gere de novo só o trecho afetado (não a questão inteira), rode a camada 1 de novo nesse trecho.
- **Camada 2 (lógica) reprovou:** reescreva a questão do zero — um problema de lógica geralmente indica que a base da questão está mal construída, um remendo tende a não resolver.
- **Reprovou de novo na segunda tentativa:** pare de tentar corrigir com IA. Marque `"revisar_humano": true` no JSON e remova a questão do conjunto que vai para a trilha até haver revisão manual. Relate isso no resumo final — não é falha do processo, é o processo funcionando.

## 4. Rodando sobre uma trilha já existente (validação retroativa)

Quando pedido para validar retroativamente (por exemplo, o lote gerado antes desta skill existir), rode as duas camadas em todas as questões do arquivo indicado, sem precisar gerar nada novo. Produza o mesmo relatório final da seção 5.

## 5. Relatório final (sempre mostrar ao usuário)

- Quantas questões passaram nas duas camadas de primeira.
- Quantas precisaram de escalonamento (modelo mais caro) e qual foi o resultado.
- Quantas foram corrigidas e revalidadas com sucesso.
- Quantas ficaram marcadas `revisar_humano` (com o motivo de cada uma).
- Custo estimado desta rodada (baseado em tokens usados, se o script conseguir medir).

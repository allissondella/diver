---
name: garimpo
description: Classifica e cataloga um material de referência novo (PDF, vídeo, artigo, link, apostila) antes de decidir o que fazer com ele. Use sempre que o usuário trouxer uma fonte nova — algo achado na internet, um arquivo, um link — e ainda não estiver claro o que fazer com ela. Esta skill NUNCA gera conteúdo nem chama IA paga; só classifica, aplica a regra de direitos autorais certa, e recomenda o próximo passo.
---

# /garimpo — triagem de material novo

Leia `docs/CONTEUDO_CURSINHO.md` (seção de direitos autorais) antes de classificar qualquer coisa. Esta skill é só a porta de entrada — ela decide e cataloga, nunca produz.

## 1. Receber o material

O usuário aponta um arquivo, uma pasta, um link do Google Drive ou outro link. Se for arquivo, leia o conteúdo. Se for link, abra e leia a página. Antes, confira em `docs/FONTES_CATALOGADAS.md` se a fonte já foi analisada (não analise duas vezes).

**Vídeo (YouTube e outros):** a leitura é pela **transcrição**. Se o link não abrir (a rede do ambiente pode bloquear `www.youtube.com`) ou a página só trouxer título e descrição, peça ao usuário a transcrição: no YouTube, "...mais" na descrição → "Mostrar transcrição" → copiar e colar no chat (ou num `.txt` no Google Drive), junto com o link e o nome do canal. Passo a passo e regras: seção 5 de `docs/cadernos/LEIA-ME.md`. A transcrição nunca vai para o repositório.

## 2. Classificar

Escolha uma categoria:
- **Oficial/governo** (ex.: BNCC, Inep, secretaria de educação, lei, norma).
- **Apostila ou material de terceiro comercial** (cursinho, editora, canal pago).
- **Matriz curricular** (lista de temas/habilidades, não conteúdo pronto para uso direto).
- **Referência de abordagem** (vídeo, artigo, plataforma como Khan Academy) — útil para entender estrutura e didática, não para copiar. Vídeo de canal oficial também cai aqui, a não ser que a licença do próprio vídeo libere o uso (confira a licença, não o nome do canal).
- **Não identificado** — não dá para classificar com segurança.

## 3. Aplicar a regra de uso certa (decida, não pergunte, salvo exceção abaixo)

- Oficial/governo → pode citar ou usar diretamente como matriz ou, se for prova liberada com licença confirmada (caso do Enem), até na íntegra. Verifique se é realmente equivalente ao caso do Enem antes de tratar como liberado.
- Terceiro comercial → só inspiração de abordagem, nunca copiar texto.
- Matriz curricular → vira insumo direto para mapeamento de temas (peso, ordem, dificuldade).
- Referência de abordagem → mesma regra do terceiro comercial: inspiração, nunca cópia.
- **Não identificado → pare e pergunte ao usuário antes de prosseguir.** Nunca presuma que pode usar algo sem saber a origem.

## 4. Catalogar

Adicione uma linha em `docs/FONTES_CATALOGADAS.md`. Se o arquivo não existir, crie-o com este cabeçalho:

```markdown
# Diver — Fontes Catalogadas

Registro de todo material de referência avaliado pela skill garimpo, para nunca reanalisar a mesma fonte duas vezes.

| Data | Fonte | Classificação | Regra de uso | Para que serve | Status |
|---|---|---|---|---|---|
```

Status possíveis: `Novo — aguardando decisão`, `Em uso`, `Descartado`.

Na coluna "Fonte" vão título, autor/canal e link (ou caminho). Nunca cole trecho do material no catálogo.

Se o usuário já disse para qual curso é a fonte, acrescente em "Próximos passos e pendências" do caderno do curso (`docs/cadernos/<id-da-trilha>.md`) uma linha "Fonte nova catalogada: <título> (<classificação>)". As conclusões de conteúdo **não** são anotadas aqui: elas nascem quando a `criar-trilha` estuda a fonte (seção 2.0 dela).

## 5. Resumir e recomendar (sempre mostrar ao usuário)

Em poucas linhas:
- O que é o material.
- Em qual classificação caiu, e por quê.
- Para qual matéria, trilha ou tema ele parece útil.
- Sugestão concreta de próximo passo (ex.: "isso pode virar a matriz da trilha X", "boa referência de abordagem para Y, mas não pode ser copiado literalmente").

## 6. O que esta skill nunca faz

Nunca gera questão, nunca escreve conteúdo novo, nunca chama a skill `criar-trilha` ou `validar-questoes` sozinha, nunca aciona qualquer IA paga. Essa skill só decide "o que é isso" e "o que daria para fazer com isso" — quem decide avançar é sempre o usuário, explicitamente, numa mensagem separada.

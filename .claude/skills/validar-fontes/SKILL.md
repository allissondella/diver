---
name: validar-fontes
description: Limpa e valida o material que o usuário colocou no Google Drive (ou mandou por link, arquivo ou transcrição) ANTES de o Professor Diver estudar. O foco é tirar a sujeira (duplicado, ilegível, fora do tema, propaganda, rascunho, versão velha) e as coisas erradas — atualidade (norma, lei, diretriz ou classificação substituída), fatos críticos conferidos em fontes oficiais, contradições entre arquivos e com o curso que já existe, lacunas de cobertura e confiabilidade da fonte. Gera o parecer em docs/validacoes/ (Aprovada, Aprovada com ressalvas ou Reprovada). Use sempre que houver material novo para criar um curso ou atualizar um curso existente, antes da skill criar-trilha. Nunca escreve questão, nunca chama IA paga e nunca grava texto de terceiro no repositório.
---

# /validar-fontes — conferir o material antes de ensinar

O caminho de um conteúdo novo no Diver:

```
Material no Drive → validar-fontes (esta skill) → criar-trilha (Professor Diver) → validar-questoes (Fila de Validação)
```

O `garimpo` diz **o que é** a fonte e **se podemos usar** (direitos). Esta skill **limpa o material**: separa o que presta do que é sujeira e acha o que está errado, para o Professor estudar só o que é bom.

**O foco (pedido do usuário, 2026-10-07): tirar a sujeira e as coisas erradas.** Cobertura e confiabilidade entram, mas o principal resultado é a lista do que **sai** e do que **fica**. A `validar-questoes` confere depois as questões **que nós escrevemos**. Se o material tem um erro ou uma regra velha e ninguém percebe aqui, o erro passa para o curso.

Leia antes: `docs/CONTEUDO_CURSINHO.md` (seção 1, direitos), `docs/cadernos/LEIA-ME.md` (seção 3, o que pode ir para o repositório) e o caderno do curso, `docs/cadernos/<id-da-trilha>.md`, se existir.

## 0. Combinar o escopo

Pergunte, se não estiver claro:
- **Qual curso** (id da trilha) e se é **curso novo** ou **atualização** de um que já existe.
- **Onde está o material:** pasta ou arquivos do Google Drive (link ou nome), link, arquivo ou transcrição colada. Vídeo é sempre pela transcrição (seção 5 do `docs/cadernos/LEIA-ME.md`).
- **Qual tema ou fase desta vez.** Pasta grande: um tema por vez, nunca tudo junto.

## 1. Ler o material

- **Google Drive:** use o conector do Google Drive (`search_files` para achar a pasta ou os arquivos, `get_file_metadata` para data e dono, `read_file_content` ou `download_file_content` para ler). PDF baixado vai para o scratchpad, nunca para o repositório.
  - **Arquivo em imagem** (PDF sem texto): diga isso no parecer e peça uma versão com texto. Não invente o que não conseguiu ler.
- **Link:** abra e leia a página.
- Anote, para cada arquivo: título, autor ou órgão, data ou edição, número de páginas. **Não guarde trechos.**

## 2. Garimpo primeiro

Confira em `docs/FONTES_CATALOGADAS.md` se cada fonte já foi catalogada. Se não, faça a triagem da skill `garimpo` (classificação e regra de uso) e catalogue antes de seguir.
- **Não identificado** ou **sem sinal verde de direitos:** pare e pergunte ao usuário. Não valide o que não pode ser usado.

## 3. Limpar e validar

Trabalhe por tema.

### 3.0 A sujeira (o que sai antes de tudo)
Marque para **descarte**, arquivo por arquivo (e, dentro do arquivo, por páginas ou seções):
- **Duplicado:** o mesmo conteúdo em outro arquivo ou outra versão (fica a mais completa e mais nova).
- **Ilegível:** PDF só em imagem, digitalização ruim, texto embaralhado. Peça outra versão se for importante.
- **Fora do tema:** matéria de outro curso, assunto que não cai, conteúdo raso demais para o nível do curso.
- **Enchimento:** propaganda, capa, sumário, currículo do autor, avisos, páginas em branco, listas de exercícios sem conteúdo.
- **Rascunho:** anotação solta, incompleta ou sem contexto, que não dá para conferir.
- **Versão velha:** material inteiro baseado em norma, lei ou edital substituído (detalhes na 3.1).
- **Errado:** trecho com fato que diverge da fonte oficial (detalhes na 3.2).

O que sobra é o **material limpo**: só ele vai para a `criar-trilha`. Para cada ponto, escreva o achado **com as nossas palavras** e aponte o lugar do material só pelo número (arquivo, página, seção, slide ou minuto do vídeo).

### 3.1 Atualidade
- **Versão da norma, lei, diretriz, classificação ou edital** que o material usa, comparada com a vigente. Exemplos: ISO/IEC 27001:2013 → 2022; LGPD e resoluções da ANPD; classificação da OMS de tumores; consenso ou diretriz de sociedade médica; matriz e edital do Enem.
- **Data do material** (metadados do Drive, capa, rodapé) e sinais de que ficou velho: tecnologia, dado estatístico, nome de órgão ou procedimento já substituído.

### 3.2 Fatos críticos
Os que mais caem em prova e mais doem se estiverem errados: números e valores de corte, critérios e classificações, fórmulas, datas, nomes de leis e normas, controles e cláusulas.
- Confira **cada um** na busca da web, em **fonte oficial ou primária**: órgão do governo, a própria norma ou lei, sociedade científica, artigo revisado por pares, documentação do fabricante. Blog, fórum e apostila não confirmam fato.
- Registre: o fato (com as nossas palavras), **Confere**, **Diverge** (com a fonte oficial que corrige: título e link) ou **Não deu para confirmar**.
- Se não houver fonte oficial aberta, marque **Não deu para confirmar** e mande para o especialista (seção 3.6). Nunca "confirme" por dedução.

### 3.3 Contradições
- **Entre arquivos do mesmo lote:** dois materiais dizendo coisas diferentes sobre o mesmo ponto. Resolva pela fonte oficial; se não der, vai para o especialista.
- **Com o curso que já existe** (atualização): compare com `data/trilhas/<id>.json` (artigo da fase em `fases[].resumo`, questões, explicações, `comentarios` e `fichas`). Liste os **ids** de questão e as fases que o material novo desmente ou deixa desatualizados, para a `criar-trilha` corrigir.

### 3.4 Lacunas de cobertura
Compare com a matriz, a ementa, o edital ou o syllabus oficial do curso (para o Enem, a Matriz de Referência; para certificação, o syllabus da prova). Liste os temas que o material **não cobre** e os que cobre só por cima.

### 3.5 Confiabilidade da fonte
Autor ou órgão, edição, se é oficial, se cita as próprias referências, se há erros de digitação em números ou tabelas. Fonte fraca não é reprovada só por isso, mas os fatos dela precisam de confirmação oficial.

### 3.6 O que vai para o especialista
O que a busca não resolve (conduta clínica, prática de mercado, interpretação de norma) e todo **Não deu para confirmar**. O especialista de cada curso está em `docs/cadernos/professor-diver.md`, seção 5. Hoje: Radiologia → professora Georgia; Cibersegurança e ISO 27001 → Allisson; Travessia ainda sem especialista (fica com o usuário).

## 4. Decidir

| Resultado | Quando | O que acontece |
|---|---|---|
| **Aprovada** | Atual, fatos críticos conferem, sem contradição relevante | A `criar-trilha` pode usar |
| **Aprovada com ressalvas** | Houve sujeira para tirar, ou erros e trechos velhos **pontuais**, cada um com a correção oficial | A `criar-trilha` usa **só o material limpo**, não usa os trechos descartados e ensina a versão corrigida |
| **Reprovada** | A versão central está substituída (ex.: a norma inteira), erros graves em temas centrais, fonte não identificada ou sem direitos | **A `criar-trilha` fica bloqueada** para este material até o usuário liberar por escrito no parecer |

Cada achado tem gravidade: **bloqueia** (leva à Reprovada), **ressalva** ou **nota** (só informativo).

## 5. Escrever o parecer

Grave em `docs/validacoes/<id-da-trilha>-<AAAA-MM-DD>.md` (mais de um no mesmo dia: acrescente `-2`, `-3`). Use o modelo de `docs/validacoes/LEIA-ME.md`.

- **O repositório é público:** nada de trecho, frase, tabela, figura ou exercício do material, nem reescrito de perto. Só o nosso resumo do problema e o lugar (arquivo e página).
- **Não ponha o link do Drive** (as pastas são privadas): basta o título e o nome do arquivo. O link de fonte oficial pode ir.
- Nada de dado de aluno nem de e-mail.

Depois:
1. Na linha da fonte em `docs/FONTES_CATALOGADAS.md`, preencha a coluna **Validação** com o resultado, a data e o caminho do parecer.
2. No caderno do curso, em "Próximos passos e pendências": `Parecer de validação <data>: <resultado> (docs/validacoes/<arquivo>)`, e cada item que foi para o especialista.

## 6. Mostrar ao usuário e passar a bola

Em poucas linhas:
- o resultado de cada fonte;
- **o que sai** (sujeira e erros) e **o que fica** (o material limpo), arquivo por arquivo;
- os achados que **bloqueiam** e as **ressalvas**, com a correção;
- as lacunas de cobertura;
- os ids de questões do curso atual que precisam de ajuste (atualização);
- o que foi para o especialista.

Termine perguntando: **"Posso seguir para a `criar-trilha` com este material?"** (na Reprovada: "O material foi reprovado. Quer trocar a fonte ou liberar mesmo assim?"). Nunca chame a `criar-trilha` sozinha.

**Liberar uma Reprovada:** só o usuário, numa mensagem explícita. Anote no fim do parecer: `Liberado pelo usuário em <data>: <motivo que ele deu>`.

## 7. O que esta skill nunca faz

- Nunca escreve questão, artigo ou qualquer conteúdo do curso.
- Nunca chama IA paga (Gemini, OpenAI ou a Edge Function `mergulho-triplo`). A busca na web desta sessão é a ferramenta de conferência.
- Nunca grava no repositório texto, transcrição ou imagem de terceiro, nem o arquivo do Drive.
- Nunca dá um fato como confirmado sem fonte oficial nem sem o especialista, quando for o caso.
- Nunca corrige o curso existente: só aponta os ids; quem corrige é a `criar-trilha`, com o OK do usuário.

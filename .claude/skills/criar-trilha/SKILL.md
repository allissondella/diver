---
name: criar-trilha
description: Cria ou expande uma trilha/curso do Diver a partir de material-fonte (matriz curricular, provas antigas, apostilas de referência, vídeos). Lê e atualiza o caderno do professor (`docs/cadernos/`), que é a memória entre uma sessão e outra. Use sempre que o pedido envolver transformar PDFs de referência em conteúdo original para uma trilha — matérias de vestibular/Enem, cursos profissionais (como Radiologia ou Cibersegurança) ou qualquer expansão de curso existente. Garante que nada é copiado das fontes e que a cobertura curricular é auditável.
---

# /criar-trilha — produzir conteúdo original e validado a partir de fontes

Leia primeiro `docs/CONTEUDO_CURSINHO.md` inteiro (regras de direitos autorais e cronograma de validações). As regras abaixo assumem que você já leu aquele arquivo.

Você é o **Professor Diver**: estuda as referências, entende, e conta do nosso jeito (divertido, fácil de aprender e de memorizar). Você não guarda lembrança de uma sessão para a outra; a sua memória são os **cadernos** em `docs/cadernos/`.

## Antes de tudo: abrir o caderno do professor

1. Leia `docs/cadernos/LEIA-ME.md` (o que pode e o que não pode entrar num caderno), `docs/cadernos/professor-diver.md` (o jeito Diver de ensinar) e o caderno do curso, `docs/cadernos/<id-da-trilha>.md`. Se o curso ainda não tiver caderno, crie-o com o modelo da seção 4 do `LEIA-ME.md`.
2. Siga o que estiver lá: gosto do usuário, decisões e, principalmente, as **lições da validação** (são erros que não podem se repetir).
3. Se algo no caderno contradisser esta skill ou `docs/CONTEUDO_CURSINHO.md`, valem a skill e o documento: avise o usuário e proponha corrigir o caderno.

## 0. Antes de tocar em qualquer PDF

Pergunte, se não estiver claro:
- Qual matéria/tema desta vez? (processar uma de cada vez, nunca tudo junto)
- Onde estão as fontes (caminho absoluto fora do repositório, link do Google Drive, link de vídeo ou transcrição colada no chat)? Vídeos: siga a seção 5 de `docs/cadernos/LEIA-ME.md`.
- A fonte já passou pela skill `garimpo` (está em `docs/FONTES_CATALOGADAS.md`)? Se não, rode o garimpo antes.
- Alguma fonte ainda não passou pela checagem de direitos da seção 1 de `docs/CONTEUDO_CURSINHO.md`? Se sim, pare e avise — não prossiga sem o sinal verde.

## 1. Mapeamento curricular

1. Leia a matriz da matéria. Extraia a lista oficial de temas/habilidades.
2. Leia as provas antigas (2019–2025, ou o intervalo disponível), ano a ano. Para cada questão, anote apenas: **tema**, **subtema**, **nível de dificuldade aparente** — nunca copie o enunciado para as suas anotações, escreva um resumo curto do que a questão cobra.
3. Cruze os dois: monte uma tabela tema × peso (quantas vezes apareceu) × dificuldade típica.
4. Mostre essa tabela para aprovação antes de escrever qualquer questão.

## 2. Referência das apostilas (só para abordagem, nunca para conteúdo)

Ao ler apostilas de cursinhos de referência, extraia apenas:
- Em que ordem elas costumam ensinar o tema.
- Que tipo de erro comum/pegadinha elas alertam.
- Que nível de profundidade é esperado nesse estágio (fácil/médio/difícil).

**Nunca** copie frases, exemplos ou exercícios delas, mesmo reescrevendo com outras palavras. Se notar que uma explicação sua ficou muito parecida em estrutura com a da apostila, reescreva do zero a partir do conceito, não a partir do texto dela.

## 2.0 Estudar como professor (o caderno aprende)

Ao terminar a leitura das fontes (etapas 1 e 2), escreva para você mesmo, em rascunho fora do repositório, o **plano de aula** da fase:
- O que mais cai e com que peso (da etapa 1).
- Em que ordem ensinar e onde o aluno tropeça (da etapa 2).
- Que situações do dia a dia brasileiro explicam cada ideia, e que "frase que gruda" cabe em cada tema (seções 2 e 3 de `docs/cadernos/professor-diver.md`).

Desse plano, separe as **conclusões que valem para o futuro** (curtas, escritas por nós, com título e autor/canal da referência) para a seção "O que as referências ensinaram" do caderno do curso. Nada de trecho, frase ou exemplo da fonte, nem reescrito (`docs/cadernos/LEIA-ME.md`, seção 3). Elas só são gravadas na seção 6, com o OK do usuário.

## 2.1 Questões literais do Enem (regra especial)

Se a fonte for uma prova do Enem, ela pode entrar **na íntegra** — mas só seguindo `docs/CONTEUDO_CURSINHO.md`, seção 1.1 e 1.2, sem exceção:

1. Copie o enunciado e as alternativas exatamente como estão no PDF do Inep. Não reescreva, não resuma.
2. Antes de incluir, rode a triagem de conteúdo de terceiro (seção 1.2): tirinha, charge, foto, poema ou letra de música completos na questão → exclua essa questão (ou substitua por uma versão 100% original inspirada no mesmo conceito, sem usar o material de terceiro).
3. Marque a fonte no JSON: `"fonte": "Enem <ano>, questão <número> — Inep/MEC"`.
4. Essas questões literais **só podem alimentar** os jogos Mergulho, Simulado, Revisão e Prova final. Nunca as derive para Memória, Forca, Adivinha Aí, Caça ao Tesouro, Chefão, Maré Alta, Corrente do Tempo, Torre ou Duelo — isso as transformaria em obra derivada. Para esses jogos, escreva uma questão original inspirada no mesmo tema/dificuldade.
5. No relatório final (seção 5), reporte separadamente: quantas questões são literais do Enem (com fonte) e quantas são originais.
6. **Onde elas entram (regra permanente, `docs/CONTEUDO_CURSINHO.md` 1.3):** a **Fase 1 de cada matéria é 100% origem `"diver"`**. Literais do Enem só a partir da **Fase 2**, sempre com `"dificuldade": "dificil"` e no máximo **30% das questões da fase**. Confira isso antes de salvar o JSON e reporte no relatório final.
7. Marque cada literal com `"origem": "enem"` (sem esse campo, a questão conta como nossa). **Nunca gere variante** de questão `"origem": "enem"` (seção 2.4).

Provas de vestibulares institucionais (Fuvest, Unicamp etc.) **não** entram nesta regra especial até que os termos de cada uma sejam confirmados — trate-as como as apostilas, só para inspiração.

## 2.2 Consultar o Acervo Diver antes de gerar (Motor Diver)

Leia `docs/MOTOR_DIVER.md` antes desta etapa, se ainda não tiver lido.

Antes de escrever qualquer questão nova:
1. Verifique se existe `data/acervo/<materia>.json` (nome da matéria em minúsculas, sem acento: `matematica`, `linguagens`, `ciencias-humanas`...). Se não existir, tudo bem — é normal no início, quando o acervo ainda está vazio (o arquivo nasce quando o primeiro lote aprovado é baixado da fila).
2. Busque nesse arquivo os itens mais parecidos (mesmo tema, dificuldade próxima) com o que está sendo gerado agora, rodando o script do Motor Diver (sem IA e sem custo; compara por palavras):
   ```
   node scripts/buscar-similares.mjs --materia <materia> --tema "<tema>" --quantos 5 --json "<descrição do que vai ser gerado: tema, subtema, dificuldade, tipo de situação>"
   ```
   A saída traz os itens em ordem de semelhança (campo `semelhanca`, de 0 a 1). Ignore os de semelhança perto de zero. Se aparecer "acervo ... ainda vazio", vá para o passo 4.
3. Inclua os 3 a 5 exemplos mais parecidos encontrados como referência de estilo ao gerar o conteúdo novo — não para copiar o conteúdo deles, só o estilo/formato/nível.
4. Se o acervo ainda não tiver exemplos suficientes para essa matéria/tema, gere normalmente a partir da assinatura Diver (`docs/ASSINATURA_E_VALIDACAO.md`) — o acervo cresce com o tempo, não precisa estar cheio desde o início.

**Regra obrigatória:** qualquer trecho de apostila ou prova ainda não confirmada (seção 1 de `docs/CONTEUDO_CURSINHO.md`) usado só para entender estilo/abordagem é descartado da memória de trabalho assim que a questão nova é gerada. Nunca escreva esse texto de referência em `data/acervo/`, em nenhum outro arquivo do repositório, nem em log. Questões literais do Enem são a única exceção — essas entram no Acervo normalmente.

## 2.3 Validação: o lote vai para a Fila de Validação (nunca validar direto)

Depois de gerar e salvar as questões no JSON da trilha (e passar no autocheck da seção 4), **não chame IA nenhuma para validar**. O lote entra na **Fila de Validação** (`fila_validacao` no Supabase) com status `pendente`, e o Mergulho Triplo só roda quando o admin aprova na tela **Admin → Fila de Validação**, digitando a senha (custo estimado visível antes).

1. Mostre a estimativa (sem internet, sem custo):
   ```
   node scripts/fila.mjs simular data/trilhas/<trilha>.json --materia <materia> --fase <fase>
   ```
2. **Peça ao usuário para rodar ele mesmo, no terminal dele**, o envio (o script pede e-mail e senha de admin e se recusa a ler senha de arquivo ou de outro programa; nunca peça a senha no chat):
   ```
   node scripts/fila.mjs enviar data/trilhas/<trilha>.json --materia <materia> --fase <fase>
   ```
   (`--ambiente producao` só quando for para a produção; o padrão é o ambiente de testes. Lotes de até 20 questões; mais que isso vira vários lotes.)
3. Depois que o admin aprovar e o lote ficar **Concluído**, o usuário roda `node scripts/fila.mjs baixar <id-do-lote>`: isso grava o bloco `validacao` nas questões da trilha, move as `revisar_humano` para `emRevisao` e adiciona as aprovadas em `data/acervo/<materia>.json`. Revise o `git diff` e faça o commit.
4. Questões reprovadas pela 1ª vez: corrija (fato: só o trecho apontado; lógica: reescreva do zero) e envie de novo só elas (`--ids`).

## 2.4 Variantes para a Revisão (pré-geradas em lote, nunca na hora)

Variante = a mesma habilidade de uma questão **nossa**, com outra situação e outros números (de preferência com outra resposta), para o aluno que errou não decorar a alternativa. A Revisão só mostra variantes **já aprovadas** pelo Mergulho Triplo; nenhuma IA roda enquanto o aluno estuda. Formato e regras: `docs/MOTOR_DIVER.md`, seção 12.

1. **Trava (1 de 3): antes de escrever qualquer variante, confira a origem da questão original.** Se for `"origem": "enem"`, **pare: não gere** (licença Sem Derivações, `docs/CONTEUDO_CURSINHO.md` 1.1 e 1.4). Para a Revisão dessas, o app já usa outra questão nossa do mesmo tema; se o tema não tiver nenhuma, escreva uma questão **nova** (bloco `questoes`, não `variantes`) inspirada só no conceito.
2. Escreva as variantes no bloco opcional `"variantes"` da trilha, separado de `"questoes"` (não mexa nas questões existentes):
   ```json
   { "id": "<id da original>-v1", "varianteDe": "<id da original>", "tema": "<igual>", "dificuldade": "<igual>", "fase": "<igual>",
     "enunciado": "...", "alternativas": ["..."], "correta": 0, "explicacao": "..." }
   ```
   Mesmo tema, mesma dificuldade e mesma fase da original; enunciado diferente; distratores com os erros típicos daquela habilidade. Comece com 1 variante por questão (`-v1`); as próximas são `-v2`, `-v3`...
3. Confira cada conta e rode o autocheck da seção 4 também contra a questão original (a variante não pode ser a original com sinônimos).
4. Mande para a Fila de Validação com `--variantes` (o script recusa variante de questão do Enem e variante igual à original):
   ```
   node scripts/fila.mjs simular data/trilhas/<trilha>.json --materia <materia> --fase <fase> --variantes
   node scripts/fila.mjs enviar  data/trilhas/<trilha>.json --materia <materia> --fase <fase> --variantes   # o usuário roda
   ```
   Depois da aprovação, `fila.mjs baixar <id>` grava o bloco `validacao` em cada variante: só a partir daí ela aparece na Revisão.

## 3. Produção do conteúdo

- Siga exatamente o schema de `data/trilhas/*.json` já existente no projeto — confira os nomes reais dos campos antes de escrever (não invente campos novos sem necessidade).
- Toda questão precisa de explicação da resposta correta.
- Distribua as questões pelas fases seguindo a dificuldade real mapeada na etapa 1, não uma progressão arbitrária.
- Dentro de cada fase, garanta questões fáceis e médias suficientes para a primeira rodada (pelo menos 8 entre as duas): o Mergulho monta a rodada em rampa (fácil → médio → difícil) e só libera as difíceis a partir da segunda rodada da fase.
- Gere, quando fizer sentido para o tema, blocos para os outros tipos de carta já suportados pelo motor (pares, verdadeiro/falso, sequências, adivinhas, palavras, casos) — consulte `docs/JOGOS.md` para o formato de cada um.
- Marque explicitamente qualquer questão que dependa de um fato muito específico (data exata, fórmula, valor numérico, nome próprio) com um comentário `"revisar": "fato específico — conferir com especialista"` no JSON, para facilitar a etapa de revisão humana. Remova essa marca só depois da revisão confirmada.

## 3.1 O caminho da fase e o artigo "Antes de mergulhar" (obrigatório em toda fase)

Toda fase segue o caminho **📚 Aprender → 🧠 Associar → 🃏 Praticar → ⚔️ Desafio → 🔄 Revisar**, que aparece no topo do "Antes de mergulhar" (`js/artigo.js`). **Leitura obrigatória (2026-10-03):** o Mergulho de uma fase com `resumo` só libera depois que o aluno abre o "Antes de mergulhar" dela uma vez; por isso o artigo é a porta de entrada e precisa ser bom de ler. Cada passo precisa ter conteúdo:

| Passo | O que a skill escreve | Onde fica |
|---|---|---|
| 📚 Aprender | `introducao` + **artigo** em `secoes` (2 a 4 seções curtas, linguagem simples, um conceito por seção, exemplo antes da regra) + `linhaDoTempo` e `mapa` quando fizerem sentido | `fases[].resumo` |
| 🧠 Associar | `mapaMental` (3 a 5 ramos, 2 a 4 itens cada) + `associacoes` (4 a 6 "imagens de associação": emoji + conceito → ligação + o porquê) + `tabela` | `fases[].resumo` e blocos `pares`/`sequencias` |
| 🃏 Praticar | questões da fase (pelo menos 8 fáceis e médias) | `questoes` |
| ⚔️ Desafio | questões difíceis, adivinhas e prova do curso | `questoes`, `adivinhas`, `prova` |
| 🔄 Revisar | `pontos` e `perolas` (resumo para revisar) e variantes das questões nossas | `fases[].resumo`, `variantes` |

Formato dos campos novos (todos opcionais para o app, mas obrigatórios para esta skill quando se aplicam):

```json
"secoes": [{ "titulo": "Por que começar por aqui", "texto": ["parágrafo com **negrito**", "outro parágrafo"] }],
"linhaDoTempo": [{ "quando": "1850", "fato": "Fim do tráfico e Lei de Terras." }],
"mapaMental": { "centro": "Tema da fase", "ramos": [{ "titulo": "Ramo", "itens": ["item", "item"] }] },
"associacoes": [{ "icone": "🧅", "conceito": "Casca de cebola", "liga": "sarcoma de Ewing", "porque": "Camadas de periósteo." }],
"mapa": { "tipo": "brasil", "titulo": "Onde aconteceu", "pontos": [{ "titulo": "Salvador", "lat": -12.97, "lon": -38.5, "texto": "..." }] }
```

- **Linha do tempo**: quando há ordem no tempo (história, evolução de uma doença, faixas de idade, fases de um processo).
- **Mapa**: `tipo: "brasil"` (pontos com `lat`/`lon`) quando a geografia explica o conteúdo; `tipo: "corpo"` (pontos com `onde`: cranio, cervical, ombro, cotovelo, punho, mao, toracica, lombar, pelve, quadril, femur, joelho, tibia, tornozelo, pe, halux) quando o lugar no corpo importa; `tipo: "abdome"` (pontos com `onde`: figado, vesicula, estomago, baco, pancreas, duodeno, flexura-hepatica, transverso, flexura-esplenica, ascendente, descendente, jejuno, ileo, ileo-terminal, ceco, apendice, sigmoide, reto, mesenterio) para órgãos do abdome. Não force mapa onde ele não ajuda.
- **Curso que já existe**: o artigo entra só como campos novos em `fases[].resumo`; nunca troque ids de fases, questões ou blocos (o progresso dos alunos está ligado a eles). Para mudar a ordem das fases, mude só a ordem do array `fases`.
- **Associações**: o emoji é a "imagem" que gruda (`docs/cadernos/professor-diver.md`, "Frase que gruda"); o `porque` é curto e explica a ligação.
- Tudo autoral: nada de frase, esquema ou imagem copiados das fontes.

## 4. Autocheck de originalidade

Antes de entregar, compare o texto gerado com os textos-fonte (provas e apostilas) procurando:
- Qualquer sequência de 8 palavras ou mais idêntica a uma fonte.
- Estrutura de frase muito próxima (mesma ordem de ideias, só trocando sinônimos).

Se encontrar, reescreva a questão do zero a partir do conceito, não a partir do texto. Relate ao final quantos itens precisaram de reescrita.

## 5. Relatório final (mostre antes de salvar)

Ao terminar uma matéria, apresente:
- Tabela de cobertura: quantos temas da matriz foram cobertos, e com que peso.
- Quantas questões/cartas foram criadas, por tipo e por fase.
- Lista de itens marcados `"revisar"` (fatos específicos pendentes de checagem humana).
- Resultado do autocheck de originalidade (etapa 4).
- Resultado do checklist "cara de Diver" (seção 4 de `docs/cadernos/professor-diver.md`).
- Lembrete explícito: **este conteúdo ainda não está aprovado para cobrança** até passar pela revisão humana da seção 3 (etapa 6) de `docs/CONTEUDO_CURSINHO.md`.

## 6. Fechar o caderno (sempre, no fim da sessão)

1. Mostre ao usuário **"O que vou anotar no caderno"**: uma lista curta com as conclusões das referências (seção 2.0), as decisões e preferências que ele deu nesta sessão, o que ficou feito e o que falta.
2. Só grave em `docs/cadernos/<id-da-trilha>.md` (e, se for algo que vale para todos os cursos, em `docs/cadernos/professor-diver.md`) depois do OK. Sempre com a data.
3. Antes de gravar, confira a seção 3 do `LEIA-ME.md`: nenhuma frase de terceiro, nenhuma transcrição, nenhum dado de aluno.
4. O caderno vai no mesmo commit do conteúdo.

## Ao usar esta skill para expandir um curso já existente

Radiologia, Cibersegurança e ISO 27001 foram criados antes deste processo existir. Ao expandi-los, rode também um autocheck de originalidade retroativo (etapa 4) sobre o conteúdo já publicado, e reporte qualquer achado — não é esperado encontrar problemas, mas vale confirmar.

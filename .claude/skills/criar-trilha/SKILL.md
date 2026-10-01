---
name: criar-trilha
description: Cria ou expande uma trilha/curso do Diver a partir de material-fonte (matriz curricular, provas antigas, apostilas de referência). Use sempre que o pedido envolver transformar PDFs de referência em conteúdo original para uma trilha — matérias de vestibular/Enem, cursos profissionais (como Radiologia ou Cibersegurança) ou qualquer expansão de curso existente. Garante que nada é copiado das fontes e que a cobertura curricular é auditável.
---

# /criar-trilha — produzir conteúdo original e validado a partir de fontes

Leia primeiro `docs/CONTEUDO_CURSINHO.md` inteiro (regras de direitos autorais e cronograma de validações). As regras abaixo assumem que você já leu aquele arquivo.

## 0. Antes de tocar em qualquer PDF

Pergunte, se não estiver claro:
- Qual matéria/tema desta vez? (processar uma de cada vez, nunca tudo junto)
- Onde estão as fontes (caminho absoluto, fora do repositório)?
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

## 2.1 Questões literais do Enem (regra especial)

Se a fonte for uma prova do Enem, ela pode entrar **na íntegra** — mas só seguindo `docs/CONTEUDO_CURSINHO.md`, seção 1.1 e 1.2, sem exceção:

1. Copie o enunciado e as alternativas exatamente como estão no PDF do Inep. Não reescreva, não resuma.
2. Antes de incluir, rode a triagem de conteúdo de terceiro (seção 1.2): tirinha, charge, foto, poema ou letra de música completos na questão → exclua essa questão (ou substitua por uma versão 100% original inspirada no mesmo conceito, sem usar o material de terceiro).
3. Marque a fonte no JSON: `"fonte": "Enem <ano>, questão <número> — Inep/MEC"`.
4. Essas questões literais **só podem alimentar** os jogos Mergulho, Simulado, Revisão e Prova final. Nunca as derive para Memória, Forca, Adivinha Aí, Caça ao Tesouro, Chefão, Maré Alta, Corrente do Tempo, Torre ou Duelo — isso as transformaria em obra derivada. Para esses jogos, escreva uma questão original inspirada no mesmo tema/dificuldade.
5. No relatório final (seção 5), reporte separadamente: quantas questões são literais do Enem (com fonte) e quantas são originais.

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

## 3. Produção do conteúdo

- Siga exatamente o schema de `data/trilhas/*.json` já existente no projeto — confira os nomes reais dos campos antes de escrever (não invente campos novos sem necessidade).
- Toda questão precisa de explicação da resposta correta.
- Distribua as questões pelas fases seguindo a dificuldade real mapeada na etapa 1, não uma progressão arbitrária.
- Gere, quando fizer sentido para o tema, blocos para os outros tipos de carta já suportados pelo motor (pares, verdadeiro/falso, sequências, adivinhas, palavras, casos) — consulte `docs/JOGOS.md` para o formato de cada um.
- Marque explicitamente qualquer questão que dependa de um fato muito específico (data exata, fórmula, valor numérico, nome próprio) com um comentário `"revisar": "fato específico — conferir com especialista"` no JSON, para facilitar a etapa de revisão humana. Remova essa marca só depois da revisão confirmada.

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
- Lembrete explícito: **este conteúdo ainda não está aprovado para cobrança** até passar pela revisão humana da seção 3 (etapa 6) de `docs/CONTEUDO_CURSINHO.md`.

## Ao usar esta skill para expandir um curso já existente

Radiologia, Cibersegurança e ISO 27001 foram criados antes deste processo existir. Ao expandi-los, rode também um autocheck de originalidade retroativo (etapa 4) sobre o conteúdo já publicado, e reporte qualquer achado — não é esperado encontrar problemas, mas vale confirmar.

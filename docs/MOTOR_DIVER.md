# Motor Diver — arquitetura de um sistema que aprende com o nosso material

> Antes de ler o resto: o Motor Diver **não é** um modelo de IA treinado do zero pelo Diver. É um sistema de orquestração que usa modelos já existentes (Claude, GPT, Gemini) como "motor genérico" e os alimenta com um acervo próprio, que cresce a cada conteúdo aprovado. É esse acervo — não o modelo — que é 100% nosso e que nenhum concorrente pode copiar.

## 1. Por que não treinamos um modelo do zero

Treinar um modelo do nível de um Claude, GPT ou Gemini exige: milhares de processadores especializados rodando por meses, times grandes de pesquisa em IA, e trilhões de palavras de texto geral (o modelo precisa aprender a própria língua e raciocínio antes de chegar perto de "matéria de vestibular"). Isso é uma categoria de projeto de poucas empresas no mundo conseguem bancar, não uma questão de "com mais orçamento a gente faz". Não está no plano do Diver, em nenhuma fase.

## 2. O que realmente é "100% nosso"

| Camada | O que é | Quem mais tem isso? |
|---|---|---|
| Modelo de IA (Claude/GPT/Gemini) | O "motor genérico" de linguagem | Qualquer empresa com uma chave de API |
| **Acervo Diver** | Todo conteúdo aprovado pelo Mergulho Triplo: questões, explicações em 3 camadas, pegadinhas catalogadas, mapeamento tema × peso | **Só nós** — cresce com o tempo, ninguém copia anos de conteúdo validado |
| **Pipeline próprio** | As skills (`criar-trilha`, `validar-questoes`), a política de uso do Enem, a assinatura Diver | **Só nós** — é código e processo, não modelo |

A vantagem competitiva mora nas duas últimas linhas, não na primeira.

## 3. Como o Motor Diver funciona (RAG — Retrieval-Augmented Generation)

Nome técnico: **RAG**. Em português: "buscar exemplos relevantes antes de responder".

```
Pedido: "gerar uma questão nova de Matemática, tema Funções, fase 2"
        ↓
1. BUSCAR no Acervo Diver as questões mais parecidas já aprovadas
   (mesmo tema, dificuldade parecida) — usando busca por similaridade,
   não busca por palavra exata
        ↓
2. MONTAR o pedido para a IA (Claude/GPT/Gemini) incluindo:
   - o pedido original
   - os 3 a 5 exemplos mais parecidos do nosso próprio acervo
   - a assinatura Diver (docs/ASSINATURA_E_VALIDACAO.md)
        ↓
3. GERAR a questão nova — sai no nosso estilo porque literalmente
   viu exemplos nossos, não porque "decorou"
        ↓
4. VALIDAR (Mergulho Triplo) → se aprovada, ENTRA no Acervo Diver
   → melhora o próximo ciclo
```

Isso é o "aprender com o material" de um jeito real e mensurável: quanto mais conteúdo aprovado, melhores e mais consistentes ficam as próximas gerações — sem treinar nada, sem reinventar o modelo de linguagem.

## 4. Como "buscar os mais parecidos" funciona, sem jargão

A técnica se chama **embeddings**: um serviço (da OpenAI, Google ou outro) transforma qualquer texto em uma lista de números que representa o "significado" dele. Dois textos parecidos em significado geram listas de números parecidas. Para achar os exemplos mais relevantes do Acervo, o sistema só precisa comparar essas listas de números — isso é chamado de busca por similaridade, e é uma operação simples e barata.

## 5. Arquitetura v1 — simples, sem infraestrutura nova

No volume de conteúdo que temos hoje (dezenas a poucos milhares de itens), **não precisamos de um banco de dados especializado**. A versão certa para agora:

- `data/acervo/` — um arquivo JSON por matéria, com cada item aprovado: enunciado, explicação em 3 camadas, tema, dificuldade, e o "vetor" (lista de números) calculado uma vez quando o item é aprovado.
- Um script simples (`scripts/buscar-similares.mjs`) que calcula o vetor do pedido novo e compara com os vetores salvos (similaridade de cosseno — uma conta matemática simples, não precisa de biblioteca pesada).
- Isso roda local, não precisa de servidor novo, não precisa de assinatura de banco de dados vetorial.

**Quando migrar para algo mais robusto:** só quando o Acervo passar de dezenas de milhares de itens e a busca simples começar a ficar lenta. Não antes disso — começar com a versão pesada seria resolver um problema que ainda não temos.

## 6. Como isso se conecta ao que já existe

- A skill `criar-trilha` passa a ter um passo novo, antes de gerar: consultar o Acervo Diver pelos exemplos mais parecidos.
- A skill `validar-questoes` (Mergulho Triplo) passa a ter um passo novo, no final: se a questão for aprovada, adicioná-la ao Acervo Diver.
- `docs/ASSINATURA_E_VALIDACAO.md` continua sendo a fonte da verdade sobre o estilo — o Acervo é o histórico vivo *de exemplos reais* desse estilo.

## 7. Roadmap honesto do Motor Diver

| Versão | O que é | Quando faz sentido |
|---|---|---|
| **v1 (agora)** | RAG simples: JSON + busca por similaridade local | Já, junto com o restante do pipeline de conteúdo |
| **v2 (futuro, com escala real)** | Ajuste fino (fine-tuning) de um modelo existente no nosso estilo, para gerar rascunhos mais rápido e mais barato | Só depois de dezenas de milhares de itens aprovados no Acervo — não é prioridade agora |
| **v-nunca** | Treinar um modelo de linguagem do zero | Fora de cogitação — nem empresas de porte médio fazem isso |

## 8. O que fica com você

Nada de ação externa aqui (sem conta nova, sem chave nova) — isso usa as mesmas chaves de API do Gemini/GPT que já estão nos planos do Mergulho Triplo. Só peço uma leitura e um aceite deste documento antes de eu pedir ao Claude Code para implementar a busca no Acervo dentro da skill `criar-trilha`.

## 9. Implementação v1 (2026-09-30)

O que existe no repositório (roda no seu computador com Node 18 ou mais novo; o site não usa nada disto):

| Arquivo | Para que serve |
|---|---|
| `scripts/validar-questoes.mjs` | Mergulho Triplo: valida as questões de uma trilha (fato no Gemini com busca do Google, lógica adversarial na OpenAI), grava o bloco `validacao` e manda as aprovadas para o acervo. |
| `scripts/buscar-similares.mjs` | Motor Diver: devolve os 3 a 5 itens do acervo mais parecidos com um pedido (usado pela skill `criar-trilha`). |
| `scripts/lib/config.mjs` | Chaves (só de variáveis de ambiente), modelos padrão e preços para a estimativa de custo. |
| `scripts/lib/ia.mjs` | Chamadas às APIs (sem biblioteca externa), novas tentativas em caso de limite/instabilidade e contagem de tokens. |
| `scripts/lib/acervo.mjs` | Leitura e gravação de `data/acervo/<materia>.json`, similaridade de cosseno e plano B por palavras. |
| `data/acervo/` | Um JSON por matéria (`matematica.json`, ...), criado quando a primeira questão daquela matéria é aprovada. |
| `.env.example` | Modelo do arquivo de chaves (sem valores). |

### 9.1 Configurar as chaves (uma vez)
1. Crie as chaves no Google AI Studio (Gemini) e na OpenAI, com limite de gasto mensal em cada painel.
2. Na raiz do projeto, copie `.env.example` para `.env` e cole as chaves depois do `=`. O `.env` está no `.gitignore`: ele nunca vai para o GitHub (confira com `git status`, ele não pode aparecer). Também não vai para o site do Cloudflare (`.assetsignore`).
3. Confira se os modelos existem na sua conta: `node scripts/validar-questoes.mjs --checar-modelos`. Se algum não existir, o script lista os parecidos disponíveis; troque no `.env` (`DIVER_MODELO_FATO`, `DIVER_MODELO_FATO_FORTE`, `DIVER_MODELO_LOGICA`, `DIVER_MODELO_LOGICA_FORTE`, `DIVER_MODELO_EMBEDDING`).

Nunca cole as chaves no chat nem em arquivo que vá para o repositório. Se uma chave vazar, revogue e gere outra.

### 9.2 Modelos escolhidos
| Papel | Padrão | Por quê |
|---|---|---|
| Fato, primeira passada | `gemini-3.8-flash` | Flash mais novo e estável (GA), com busca do Google; US$ 0,75 / 3,75 por 1M tokens até 31/12/2026. |
| Fato, desempate | `gemini-3.1-pro-preview` | Pro mais novo listado na documentação do Gemini. |
| Lógica, primeira passada | `gpt-5-mini` | O "mini" mais barato da OpenAI (US$ 0,25 / 2,00 por 1M); o `gpt-5.4-mini` é mais novo, mas custa 3× mais. |
| Lógica, desempate | `gpt-5.5` | Modelo completo, só nos casos escalados. |
| Embeddings | `text-embedding-3-small` | Ver 9.3. |

Os nomes foram conferidos em 2026-09-30 pelos trechos das páginas oficiais (ai.google.dev, developers.openai.com) devolvidos pela busca: a leitura direta dessas páginas estava bloqueada na sessão em que o código foi escrito. Por isso o script **sempre confere a lista de modelos da sua conta antes de gastar qualquer centavo** e para com uma mensagem clara se algum nome não existir. Os documentos do kit citam "Gemini 3 Flash" e "GPT-5.2 mini"; o código segue os nomes acima, e o `.env` troca qualquer um deles.

### 9.3 Embeddings: por que OpenAI `text-embedding-3-small`
- A mesma chave da camada de lógica (nenhuma conta nova).
- Barato: US$ 0,02 por 1M tokens. Vetorizar mil questões custa menos de 1 centavo de dólar.
- Modelo estável e amplamente usado, com vetores de 1.536 números: o acervo de Matemática com mil itens fica com poucos MB.
- **Importante:** vetores de modelos diferentes não se comparam. Se um dia trocar `DIVER_MODELO_EMBEDDING`, o `buscar-similares` recalcula sozinho os vetores do acervo que foram feitos com o modelo antigo (e regrava o arquivo).

### 9.4 Comandos
```
# Ver os prompts que seriam enviados, sem chamar nada nem gravar nada
node scripts/validar-questoes.mjs data/trilhas/enem-vestibular.json --materia matematica --simular

# Validar de verdade (uma fase, ou algumas questões)
node scripts/validar-questoes.mjs data/trilhas/enem-vestibular.json --materia matematica --fase matematica-1
node scripts/validar-questoes.mjs data/trilhas/enem-vestibular.json --materia matematica --ids enem-mat1-01,enem-mat1-02

# Buscar exemplos parecidos no acervo
node scripts/buscar-similares.mjs --materia matematica --tema Porcentagem "desconto sucessivo, nível médio"
```
Outras opções do validador: `--limite N`, `--refazer` (valida de novo até as já aprovadas).

### 9.5 Como o validador decide
- **Funil de custo:** cada camada roda primeiro no modelo barato. Resposta exatamente "CONFIRMADO" (fato) ou "RESISTIU" (lógica) aprova a camada. Qualquer outra coisa (inclusive "CONFIRMADO, mas...") vai para o modelo robusto, que dá a palavra final.
- **A camada de lógica nunca recebe o gabarito** (só enunciado, alternativas, tema e dificuldade).
- **Registro na questão:** bloco `validacao` com `fato`, `logica`, `modelo_fato`, `modelo_logica`, `data`, `pronta`, `tentativas` e a `assinatura` do conteúdo; quando reprova, também `detalhe_fato`/`fontes_fato` ou `detalhe_logica`.
- **Reprovou pela 1ª vez:** fica na trilha, marcada; o relatório diz o que fazer (fato: corrigir o trecho; lógica: reescrever do zero). Rodar de novo sem mudar nada **não** gasta: o script percebe pela assinatura e pula.
- **Depois de corrigir:** se só o fato tinha reprovado, só a camada de fato roda de novo.
- **Reprovou pela 2ª vez:** `"revisar_humano": true` e a questão sai de `questoes` para um bloco `emRevisao` na mesma trilha (o app não mostra esse bloco) até alguém revisar.
- **Aprovada:** entra em `data/acervo/<materia>.json` com o vetor (se a chave da OpenAI estiver configurada; se não, o `buscar-similares` calcula depois).
- **Relatório final:** aprovadas de primeira, escaladas e resultado, corrigidas, `revisar_humano` com motivo, puladas e custo estimado (tokens contados de cada chamada; modelos sem preço cadastrado aparecem sem valor).
- **Observação:** o item 1 do prompt de lógica fala da "alternativa marcada como correta", mas, pela regra da skill, o gabarito não vai no prompt. O modelo então resolve a questão sozinho e aponta ambiguidades e alternativas defensáveis. Se quiser, dá para acrescentar depois um passo que compara a resposta dele com o gabarito.

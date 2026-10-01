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

## 4. O que o Acervo Diver nunca guarda

O Acervo só armazena **conteúdo nosso, autoral e já aprovado**. Material de referência (apostilas de cursinhos concorrentes, provas de vestibulares ainda não confirmados) usado só para entender abordagem/estilo durante a geração é **descartado da memória de trabalho assim que a questão nova é criada** — nunca é salvo em `data/acervo/`, em nenhum outro arquivo do repositório, nem em log, nem em tabela do banco. Se for necessário guardar um trecho de referência temporariamente para consulta durante a sessão de geração, ele fica fora do repositório (na pasta `~/diver-fontes/` já usada) e é apagado ao final daquela sessão — nunca commitado.

**Exceção:** questões literais do Enem entram no Acervo normalmente, porque não são "inspiração" — são conteúdo que já temos direito de usar na íntegra (`docs/CONTEUDO_CURSINHO.md`, seção 1.1).

## 5. Como as chaves de API chegam até o sistema (nunca por chat)

As chaves (`GEMINI_API_KEY`, `OPENAI_API_KEY`) são cadastradas **diretamente no painel do Supabase** (Edge Functions → Manage secrets), digitadas ali pelo próprio administrador. Elas nunca são coladas em nenhuma conversa — nem aqui, nem no Claude Code — e nenhum código do projeto lê ou grava o valor delas em lugar nenhum além dessa referência de ambiente no momento da execução da função de servidor. Se uma chave for exposta acidentalmente em qualquer lugar (chat, commit, log), ela deve ser revogada e substituída imediatamente, sem exceção.

## 6. Como "buscar os mais parecidos" funciona, sem jargão

A técnica se chama **embeddings**: um serviço (da OpenAI, Google ou outro) transforma qualquer texto em uma lista de números que representa o "significado" dele. Dois textos parecidos em significado geram listas de números parecidas. Para achar os exemplos mais relevantes do Acervo, o sistema só precisa comparar essas listas de números — isso é chamado de busca por similaridade, e é uma operação simples e barata.

## 7. Arquitetura v1 — simples, sem infraestrutura nova

No volume de conteúdo que temos hoje (dezenas a poucos milhares de itens), **não precisamos de um banco de dados especializado**. A versão certa para agora:

- `data/acervo/` — um arquivo JSON por matéria, com cada item aprovado: enunciado, explicação em 3 camadas, tema, dificuldade, e o "vetor" (lista de números) calculado uma vez quando o item é aprovado.
- Um script simples (`scripts/buscar-similares.mjs`) que calcula o vetor do pedido novo e compara com os vetores salvos (similaridade de cosseno — uma conta matemática simples, não precisa de biblioteca pesada).
- Isso roda local, não precisa de servidor novo, não precisa de assinatura de banco de dados vetorial.

**Quando migrar para algo mais robusto:** só quando o Acervo passar de dezenas de milhares de itens e a busca simples começar a ficar lenta. Não antes disso — começar com a versão pesada seria resolver um problema que ainda não temos.

## 8. Como isso se conecta ao que já existe

- A skill `criar-trilha` passa a ter um passo novo, antes de gerar: consultar o Acervo Diver pelos exemplos mais parecidos.
- A skill `validar-questoes` (Mergulho Triplo) passa a ter um passo novo, no final: se a questão for aprovada, adicioná-la ao Acervo Diver.
- `docs/ASSINATURA_E_VALIDACAO.md` continua sendo a fonte da verdade sobre o estilo — o Acervo é o histórico vivo *de exemplos reais* desse estilo.

## 9. Roadmap honesto do Motor Diver

| Versão | O que é | Quando faz sentido |
|---|---|---|
| **v1 (agora)** | RAG simples: JSON + busca por similaridade local | Já, junto com o restante do pipeline de conteúdo |
| **v2 (futuro, com escala real)** | Ajuste fino (fine-tuning) de um modelo existente no nosso estilo, para gerar rascunhos mais rápido e mais barato | Só depois de dezenas de milhares de itens aprovados no Acervo — não é prioridade agora |
| **v-nunca** | Treinar um modelo de linguagem do zero | Fora de cogitação — nem empresas de porte médio fazem isso |

## 10. O que fica com você

Cadastrar as chaves diretamente nos Secrets do Supabase (seção 5) — nunca em chat, nunca em arquivo do repositório. A partir daí, nada roda automaticamente: toda chamada às IAs pagas passa pela Fila de Validação, com custo estimado visível e aprovação por senha, antes de qualquer execução.

## 11. Implementação: Fila de Validação e Mergulho Triplo (2026-10-01)

### 11.1 O fluxo, de ponta a ponta
```
criar-trilha gera as questões no JSON da trilha (seções 2.2 e 2.3 da skill)
        ↓
node scripts/fila.mjs simular …   → custo estimado, sem internet e sem IA
node scripts/fila.mjs enviar …    → você digita e-mail e senha de admin no terminal;
                                     lote(s) de até 20 questões entram em fila_validacao como 'pendente'
        ↓
Admin → Fila de Validação (no site): custo estimado à vista → "Aprovar e executar"
        ↓  pede a SENHA de novo (reautenticação: token novo com o horário da senha)
banco: fila_aprovar(id)           → só admin, só com senha digitada há ≤ 5 min, só se 'pendente' → 'aprovado'
        ↓
Edge Function mergulho-triplo     → confere de novo: admin + senha ≤ 5 min + lote 'aprovado';
                                     'aprovado' → 'executando' numa operação só (dois cliques não pagam duas vezes);
                                     confere se os modelos existem (grátis); roda Fato (Gemini + busca) e
                                     Lógica (OpenAI, sem gabarito) com o funil barato → robusto;
                                     grava o progresso a cada questão; vetor (embedding) das aprovadas
        ↓
fila_validacao: 'concluido' + resultado (validações, itens aprovados, relatório, custo real)
        ↓
node scripts/fila.mjs baixar <id> → aplica o bloco "validacao" na trilha, move revisar_humano para
                                     "emRevisao" e grava as aprovadas em data/acervo/<materia>.json
        ↓
você revisa o git diff e faz o commit
```
Nada roda sozinho: sem aprovação com senha na tela, nenhuma IA paga é chamada. Rejeitar um lote não custa nada.

### 11.2 Onde está cada peça
| Arquivo | O que faz |
|---|---|
| `supabase/setup.sql` (fim do arquivo) | Tabela `fila_validacao` (as colunas pedidas + `criado_por`, `executado_por`, `iniciado_em`, `concluido_em`, `resultado`, `custo_real_usd`, `erro`), RLS **só admin** (ler e criar; ninguém altera direto), gatilho que força todo lote novo a nascer `pendente`, e as funções `senha_recente`, `fila_aprovar`, `fila_rejeitar`, `fila_destravar`. |
| `supabase/functions/mergulho-triplo/index.ts` | A Edge Function. Ações: `status` (diz só **se** as chaves existem, sem custo) e `executar`. |
| `supabase/functions/_shared/mergulho-nucleo.mjs` | Prompts exatos, funil, regra das tentativas, fórmula do custo e formato do item do acervo. É o mesmo arquivo para a função (Deno) e para os scripts (Node): não tem como os dois divergirem. |
| `supabase/functions/_shared/ias.mjs` | Chamadas ao Gemini (com `google_search`) e à OpenAI. Recebe as chaves por parâmetro; nunca as escreve em log ou erro. |
| `supabase/functions/_shared/processar-lote.mjs` | Roda o lote: confere modelos, 3 questões em paralelo, para antes do tempo da função acabar e continua numa próxima execução. |
| `js/fila-validacao.js` | A tela "Fila de Validação" (só admin; link na barra lateral, grupo Admin). |
| `js/nuvem.js` | `confirmarSenha` (reautenticação) e `funcao` (chama a Edge Function). |
| `scripts/fila.mjs` | `simular`, `enviar`, `listar`, `baixar`. Não chama IA; login de admin digitado no terminal. |
| `scripts/buscar-similares.mjs` | Busca no acervo por palavras (TF-IDF), sem IA. Ver 11.5. |

### 11.3 Chaves (confere com a seção 5)
- `GEMINI_API_KEY` e `OPENAI_API_KEY` só existem nos **Secrets das Edge Functions** de cada projeto Supabase (testes e produção). O único código que lê o valor é `index.ts`, com `Deno.env.get`, no momento da execução; o valor só viaja no cabeçalho da chamada à IA.
- A ação `status` devolve só `true/false` para cada chave; a tela mostra "cadastrada" ou "não encontrada".
- Nenhum script local, arquivo `.env` ou tabela guarda chave de IA (o `.env.example` antigo foi removido; o `.gitignore` continua bloqueando `.env` por segurança).
- Opcional nos mesmos Secrets: `DIVER_MODELO_FATO`, `DIVER_MODELO_FATO_FORTE`, `DIVER_MODELO_LOGICA`, `DIVER_MODELO_LOGICA_FORTE`, `DIVER_MODELO_EMBEDDING` (trocar modelo sem mexer no código) e `DIVER_LIMITE_SEGUNDOS` (padrão 110).

### 11.4 Custo estimado (fórmula, com os preços da seção 3 de `docs/ASSINATURA_E_VALIDACAO.md`)
Por questão: tokens de entrada ≈ tamanho do prompt ÷ 4; saída prevista = 800 tokens por camada.
- **Fato:** entrada × US$ 0,75/1M + saída × US$ 3,75/1M + 1 busca do Google (US$ 14 por 1.000; os 5.000 grátis/mês não são descontados).
- **Lógica:** entrada × US$ 1,75/1M + saída × US$ 14/1M (o documento não traz preço do "mini", então a estimativa usa o do GPT-5.2 cheio como teto).
- **Total do lote** = soma das questões × 1,3 (folga para as que escalam para o modelo robusto).

É um teto: 1.000 questões dão ≈ US$ 37 (o documento fala em US$ 20 a 60). O custo **real** (tokens medidos) aparece no lote depois da execução.

### 11.5 Diferenças em relação ao texto original (e por quê)
- **Acervo no repositório:** a Edge Function não consegue escrever arquivos do GitHub. Ela grava o resultado na própria linha da fila, e o `fila.mjs baixar` leva para `data/acervo/<materia>.json`. Antes de aplicar, ele confere se a questão não mudou desde o envio.
- **Busca por similares sem IA:** como toda chamada paga passa pela Fila (seção 10), a busca local compara por palavras (TF-IDF + cosseno), sem chave e sem custo. Os vetores de significado continuam sendo calculados pela função na aprovação e guardados em cada item, prontos para uma busca semântica no futuro.
- **Nada de texto de terceiro (seção 4):** só os campos da própria questão (`id`, `tema`, `dificuldade`, `fase`, `enunciado`, `alternativas`, `correta`, `explicacao`, `origem`, `fonte`, `validacao`) saem do computador para a fila e voltam para o acervo. Qualquer outro campo (anotação, trecho de apostila) é descartado antes do envio. O detalhe que a IA devolve numa reprovação é guardado curto (até 800 caracteres), só para orientar a correção, e nunca vai para o acervo.

### 11.6 Para ligar (uma vez em cada projeto: primeiro testes, depois produção)
1. **Banco:** Supabase → SQL Editor → cole o `supabase/setup.sql` inteiro → Run (reexecutável, não apaga dados).
2. **Secrets:** Edge Functions → Secrets: confira que `GEMINI_API_KEY` e `OPENAI_API_KEY` aparecem na lista (o painel mostra só o nome; o valor nunca precisa sair de lá).
3. **Publicar a função** (no computador, na pasta do projeto):
   ```
   npx supabase login
   npx supabase functions deploy mergulho-triplo --project-ref xtuzdecteeeldnaegkxl   # testes
   npx supabase functions deploy mergulho-triplo --project-ref bdrwqmxjhvxqwfywpikg   # produção, depois
   ```
   Se o comando pedir, rode `npx supabase init` uma vez antes (ele cria o `supabase/config.toml`). Deixe a verificação de JWT ligada (é o padrão).
4. **Conferir:** no site, Admin → Fila de Validação: o cartão "Chaves das IAs" deve mostrar as duas como "cadastrada". Isso chama só a ação `status` (sem custo).
5. **Primeiro uso:** `node scripts/fila.mjs enviar data/trilhas/enem-vestibular.json --materia matematica --fase matematica-1`, aprovar na tela com a senha, esperar "Concluído" e rodar `node scripts/fila.mjs baixar <id>`.

### 11.7 Limites
- **Tempo da função:** no plano grátis, cada execução tem cerca de 150 s. Por isso os lotes têm no máximo 20 questões, 3 rodam ao mesmo tempo e a função para de começar questões novas aos 110 s. O que faltar fica com status `aprovado`, com aviso, e o botão "Continuar execução" (pede a senha de novo) segue de onde parou, sem pagar de novo o que já foi validado.
- **Travou:** se um lote ficar em "Executando…" por mais de 15 minutos, aparece o botão "Destravar" (`fila_destravar`).
- **Modelo com nome errado:** a função para antes de qualquer chamada paga e mostra o nome que faltou.

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
| `js/fila-validacao.js` | A tela "Fila de Validação" (só admin; link na barra lateral, grupo Admin), com o cartão "Mandar para a fila" (importa o núcleo com `import()` dinâmico; o app continua em scripts comuns). |
| `js/nuvem.js` | `confirmarSenha` (reautenticação) e `funcao` (chama a Edge Function). |
| `scripts/fila.mjs` | `simular`, `enviar`, `listar`, `baixar` e `aplicar` (arquivo baixado da tela, sem login). Não chama IA; login de admin digitado no terminal. A montagem dos lotes (`montarLotes`) mora no núcleo e é a mesma da tela. |
| `scripts/juntar-funcao.mjs` → `supabase/painel/mergulho-triplo.ts` | A função num arquivo só, para colar no painel do Supabase (sem terminal). |
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
- **Nada de texto de terceiro (seção 4):** só os campos da própria questão (`id`, `tema`, `dificuldade`, `fase`, `enunciado`, `alternativas`, `correta`, `explicacao`, `origem`, `fonte`, `varianteDe`, `validacao`) saem do computador para a fila e voltam para o acervo. Qualquer outro campo (anotação, trecho de apostila) é descartado antes do envio. O detalhe que a IA devolve numa reprovação é guardado curto (até 800 caracteres), só para orientar a correção, e nunca vai para o acervo.

### 11.6 Para ligar (uma vez em cada projeto: primeiro testes, depois produção) — sem terminal
1. **Banco:** Supabase → SQL Editor → cole o `supabase/setup.sql` inteiro → Run (reexecutável, não apaga dados).
2. **Secrets:** Edge Functions → Secrets: confira que `GEMINI_API_KEY` e `OPENAI_API_KEY` aparecem na lista (o painel mostra só o nome; o valor nunca precisa sair de lá).
3. **Publicar a função pelo painel:** Edge Functions → **Deploy a new function** → **Via Editor** → nome `mergulho-triplo` → apague o código de exemplo e cole **todo** o arquivo `supabase/painel/mergulho-triplo.ts` (no GitHub: abra o arquivo → botão de copiar) → **Deploy**. Deixe "Verify JWT" ligado. Para atualizar depois, abra a função no painel, cole a versão nova e faça Deploy de novo.
   - Esse arquivo é a mesma função de `supabase/functions/`, juntada num arquivo só por `node scripts/juntar-funcao.mjs` (quem mexe na função roda de novo; `--conferir` avisa se ficou desatualizado).
   - Quem preferir o terminal: `npx supabase functions deploy mergulho-triplo --project-ref xtuzdecteeeldnaegkxl` (testes) ou `bdrwqmxjhvxqwfywpikg` (produção).
4. **Conferir:** no site, Admin → Fila de Validação: o cartão "Chaves das IAs" deve mostrar as duas como "cadastrada" (só a ação `status`, sem custo).
5. **Mandar um lote:** na mesma tela, cartão **"Mandar para a fila"**: escolha o curso, a fase e "Questões" ou "Variantes" → o site mostra quantos itens e o custo estimado → confirme. O lote nasce **Pendente** (nada cobrado). (Pelo terminal, o equivalente é `node scripts/fila.mjs enviar …`.)
6. **Aprovar:** "Aprovar e executar" no lote → senha → as IAs rodam.
7. **Levar o resultado para o site:** quando ficar **Concluído**, "Baixar resultado" e mande o arquivo no chat do Claude, que roda `node scripts/fila.mjs aplicar <arquivo>` (sem internet e sem login), confere o `git diff` e faz o commit. (Com terminal e login: `node scripts/fila.mjs baixar <id>`.)

### 11.7 Limites
- **Tempo da função:** no plano grátis, cada execução tem cerca de 150 s. Por isso os lotes têm no máximo 20 questões, 3 rodam ao mesmo tempo e a função para de começar questões novas aos 110 s. O que faltar fica com status `aprovado`, com aviso, e o botão "Continuar execução" (pede a senha de novo) segue de onde parou, sem pagar de novo o que já foi validado.
- **Travou:** se um lote ficar em "Executando…" por mais de 15 minutos, aparece o botão "Destravar" (`fila_destravar`).
- **Modelo com nome errado:** a função para antes de qualquer chamada paga e mostra o nome que faltou.

## 12. Variantes na Revisão (2026-10-01)

**A ideia:** quem errou uma questão não deve rever exatamente a mesma, senão decora a letra. A Revisão mostra uma **variante**: mesma habilidade, outra situação e outros números. Tudo é **pré-gerado em lote** pelo mesmo caminho validado (skill `criar-trilha` → Fila de Validação com senha → Mergulho Triplo). **Nenhuma IA roda enquanto o aluno usa o app**: a Revisão só escolhe entre variantes que já têm `validacao.pronta = true`.

### 12.1 Onde ficam
Bloco opcional `"variantes"` no JSON da trilha, **separado de `"questoes"`** (nada do que existe muda; Simulado, Prova final e jogos continuam usando só `questoes`):
```json
"variantes": [
  {
    "id": "enem-mat1-07-v1",
    "varianteDe": "enem-mat1-07",
    "tema": "Regra de três", "dificuldade": "medio", "fase": "matematica-1",
    "enunciado": "...", "alternativas": ["..."], "correta": 3, "explicacao": "...",
    "validacao": { "pronta": true, "...": "gravado pelo fila.mjs baixar" }
  }
]
```
Regras de formato (conferidas por `Trilhas.limparVariantes` ao carregar): `varianteDe` aponta para uma questão da trilha que **não** é `origem: "enem"`; mesma `fase` da original; enunciado diferente; `id` único (nem de questão, nem de outra variante). Variante com problema é descartada sozinha, com aviso no console, sem derrubar o curso.

### 12.2 Como a Revisão escolhe (`js/quiz.js`, `versaoParaRevisar`)
| A questão pendente é… | A Revisão mostra |
|---|---|
| nossa, **com variante aprovada** | uma variante, em **rodízio**: primeiro a que o aluno nunca viu; depois a vista há mais tempo |
| nossa, **ainda sem variante** | a própria questão (como sempre foi) |
| **`origem: "enem"`** | **nunca variante**: outra questão nossa do **mesmo tema**, de nível igual ou menor (da mesma fase, se houver), também em rodízio; se não houver nenhuma, a literal de novo, sem alteração |

- O resultado conta para a **questão original**: acertar a variante (ou a substituta) tira a original da lista de revisão; errar a mantém. "Marcar para revisar" também marca a original.
- O rodízio fica no progresso do aluno: `prog.questoes[<original>].vistas` (lista de ids, a mais antiga primeiro).
- Na tela aparece uma etiqueta lilás: **"Versão nova"** (variante) ou **"Mesmo tema"** (substituta).
- A rodada da Revisão também vem em rampa (fácil → médio → difícil).

### 12.3 As três travas contra variante de questão do Enem
1. **Skill e computador:** a `criar-trilha` (seção 2.4) não gera; o `fila.mjs --variantes` se recusa a montar o lote (e recusa variante igual à original).
2. **Servidor da fila:** o gatilho `fila_validacao_nova` (banco) recusa o lote na entrada, e a Edge Function (`processarLote`, via `variantesProibidas`) recusa de novo antes de qualquer chamada paga. O lote leva a origem de cada original em `conteudo_pendente.originais`; origem desconhecida conta como Enem.
3. **App:** `Trilhas.limparVariantes` descarta a variante ao carregar a trilha.

### 12.4 Fluxo
```
criar-trilha escreve as variantes no bloco "variantes" (seção 2.4 da skill)
node scripts/fila.mjs simular data/trilhas/<trilha>.json --materia <m> --fase <f> --variantes
node scripts/fila.mjs enviar  data/trilhas/<trilha>.json --materia <m> --fase <f> --variantes   (você, no terminal)
Admin → Fila de Validação → "Aprovar e executar" (senha)
node scripts/fila.mjs baixar <id>   → grava "validacao" nas variantes; só então elas aparecem na Revisão
```
Custo: o mesmo de uma questão (≈ US$ 0,04 cada; 19 variantes ≈ US$ 0,70).


## 13. Cadernos do Professor: a memória das skills (2026-10-03)

O acervo guarda **o que** já criamos; os cadernos guardam **como** a gente ensina e **o que aprendemos** no caminho. A IA não lembra de uma sessão para a outra, então essa memória mora em arquivos, em `docs/cadernos/`:

- `LEIA-ME.md`: o ciclo, o que pode e o que não pode entrar, o modelo de caderno e como estudar vídeos (pela transcrição).
- `professor-diver.md`: o jeito Diver de ensinar, igual para todos os cursos (técnicas, receita de questão, checklist "cara de Diver", gosto do usuário, lições gerais).
- `<id-da-trilha>.md`: um caderno por curso (gosto, decisões, o que as referências ensinaram, lições da validação, feito e pendente).

```
garimpo cataloga a fonte (docs/FONTES_CATALOGADAS.md)
        ↓
criar-trilha ABRE o caderno → estuda a fonte → cria o conteúdo autoral
        ↓  propõe "O que vou anotar no caderno" → grava com o OK do usuário
Fila de Validação → Mergulho Triplo (aprovação por senha)
        ↓
validar-questoes transforma as reprovações em "Lições da validação" (com o OK)
        ↓
o próximo lote já nasce sem aqueles erros
```

A regra da seção 4 continua valendo: o caderno guarda **conclusões escritas por nós**, nunca trecho, transcrição ou exercício de terceiro.

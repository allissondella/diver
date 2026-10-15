# Mapa curricular: sala Ensino Médio

> **Aprovado em 2026-10-14 ("manda bala"); revisto em 2026-10-15 a pedido do usuário.** A primeira versão tratava o aluno como quem "volta a estudar" (subtexto "Sempre dá tempo", cursos "<Matéria> · Retomada", aulas como "Contas sem medo"). O usuário achou o tom infantil e pediu disciplinas sérias, com o peso devido e nomes iguais aos do colégio, para o aluno ver que dali ele vai para o Enem e para o vestibular. Esta é a grade nova; a decisão está registrada no caderno da sala (`docs/cadernos/ensino-medio-retomada.md`, "Revisão de tom").
> Só conclusões nossas: nomes de cursos, módulos e aulas escritos por nós, organizados pela BNCC do Ensino Médio (MEC, 2018) e pela Matriz de Referência do Enem. Nenhum trecho de terceiro.
> **Ids que não mudam:** as 11 aulas da Onda 0 (`em-mat-contas-sem-medo`, `em-mat-fracoes-decimais`, `em-mat-porcentagem`, `em-mat-razao-regra-de-tres`, `em-mat-juros-parcelas`, `em-mat-revisao-numeros`; `em-por-tema-ideia-principal`, `em-por-inferencia`, `em-por-generos-dia-a-dia`, `em-por-texto-imagem-grafico`, `em-por-revisao-leitura`), as chaves internas (`prog.modulos`, `prog.retomada`, `diver:v1:retomada`, `diver:v1:mapa-partida`, rota `#mapa-partida`) e os ids das conquistas. Mudaram só os nomes que o aluno vê.

## 1. Base

- **Espinha do currículo: a BNCC do Ensino Médio** (Resolução CNE/CP nº 4/2018).
  - O arquivo `basenacionalcomum.pdf` da pasta é a versão integral de dezembro de 2018, com 600 páginas, **e traz a parte do Ensino Médio**.
  - Conferido em 2026-10-14 pelos códigos das habilidades:
    - Matemática: EM13MAT101 a 511, 43 habilidades;
    - Ciências da Natureza: EM13CNT, 26 habilidades;
    - Ciências Humanas: EM13CHS, 32 habilidades;
    - Linguagens: EM13LGG, 28 habilidades;
    - Língua Portuguesa: EM13LP01 a 54.
  - Nenhuma versão nova da BNCC do Ensino Médio apareceu na busca. A Lei nº 14.945/2024 mudou a carga da formação geral (2.400 h) e os itinerários, mas manda cumprir a BNCC como ela está.
- **A base também passa pelo Ensino Fundamental.** Boa parte do que o aluno precisa rever (frações, regra de três, equação do 1º grau, Pitágoras) é habilidade dos anos finais (EF06 a EF09).
  - Por isso a Matemática cita os dois níveis: o EF onde o conteúdo nasce e o EM onde ele é usado.
  - Português e as outras matérias citam só o EM. Lá a BNCC organiza por área, e o código dá o "para quê" da aula.
- **Matriz de Referência do Enem (Inep):** é a régua da Travessia, conferida em 2026-10-09 (`docs/cadernos/enem-mapa-curricular.md`). Desde a revisão de tom (2026-10-15), cada aula indica na descrição as habilidades do Enem que treina (campo `habilidades`, com o mesmo código H1 a H30, ou C1 a C5 na Redação).
- **Matriz do Encceja:** a página oficial do Inep que eu procurei não abriu (404), e a busca não achou a matriz atual.
  - **Não deu para confirmar.** Fica como pendência, e o plano não depende dela.

## 2. Regras de estrutura e nomes

- **Sala:** "Ensino Médio", rótulo **"Base para o Enem"**, id `ensino-medio`, matrícula `pacote:ensino-medio`. Sem subtexto.
- **Um curso por disciplina, como no colégio:** id `em-<disciplina>`, nome **"Ensino Médio · <Disciplina>"**; dentro da sala aparece só o nome da disciplina ("Matemática", "Física"). `categoria: "Ensino Médio"`, `fasesLivres: true`, `rotuloAula: "Aula"`, `habilidadesDe: "do Enem"`. Filosofia e Sociologia são disciplinas separadas.
- **Módulo:** "Módulo 2 · Álgebra e funções", com id estável em `moduloId`. De 5 a 7 aulas; a última é sempre a **Revisão** do módulo.
- **Aula:** nome de conteúdo, como no plano de ensino da escola: "Aula 7 · Equações do 1º grau", "Aula 3 · Leis de Newton e aplicações". Sem apelido, sem "dia a dia" no título. A numeração é contínua no curso e feita **só** por `node scripts/numerar-aulas.mjs`. O id da fase não leva número.
- **Descrição:** "Módulo 2 · aula 1 de 6 · 30 min · treina as habilidades H19 e H21 do Enem" (montada pelo script a partir de `minutos`, `habilidades` e `habilidadesDe`; na Redação, "competências C1 a C5"). Os códigos da BNCC ficam no campo `bncc`, para a equipe.
- **Cada aula:**
  - o "Antes de mergulhar" abre com a introdução do conteúdo e a seção **"Como o conteúdo é cobrado"** (como aquilo aparece no Enem e nos vestibulares), e tem 350 palavras ou mais, com o vocabulário técnico da disciplina;
  - cerca de **20 questões**: em torno de 8 fáceis, 8 médias e 4 difíceis;
  - comentário em todas as alternativas, Dica de mergulhador, fichas, 1 variante por questão e blocos para os jogos;
  - **só questões `origem: "diver"`**: nada de literal do Enem nesta sala.
- **Prova final por disciplina:** 30 questões, 45 min, 60% para aprovação.
- **Nada de nomes do mar** em curso, módulo, aula ou descrição. Mergulho, Simulado, Revisão, "Antes de mergulhar" e "Dica de mergulhador" continuam como são no app inteiro.

### Nomes que o aluno vê

| Onde | Antes (2026-10-14) | Agora (2026-10-15) |
|---|---|---|
| Sala | Ensino Médio · "Sempre dá tempo" | **Ensino Médio** · rótulo "Base para o Enem" |
| Curso | "Matemática · Retomada" | **"Ensino Médio · Matemática"** (na sala, só "Matemática") |
| Módulo | "Módulo 1 · Números e contas do dia a dia" | "Módulo 1 · Números e operações" |
| Aula | "Aula 1 · Contas sem medo: operações, negativos e estimativa" | "Aula 1 · Números inteiros: operações, propriedades e estimativa" |
| Descrição | "Módulo 1 · aula 1 de 6 · 15 min" | "Módulo 1 · aula 1 de 6 · 30 min · treina as habilidades H1, H3, H4 e H5 do Enem" |
| Topo da sala | "Meu caminho" | **"Plano de estudos"** |
| Teste geral | "Mapa de partida" (faixas "Vale começar por aqui", "Vale uma revisão", "Você já manda bem aqui") | **"Avaliação de nivelamento"** (Nível básico, intermediário e avançado) |
| Teste do módulo | "Teste rápido" | **"Prova de suficiência"** (4 de 5 dispensa o módulo) |
| Estados do módulo | Recomendado, Liberado, Para depois ("Liberar quando quiser"), Dominado | Recomendado, Disponível, Mais adiante ("Liberar módulo"), Dominado |
| Fim da disciplina | "Meu retorno" | **"Boletim da disciplina"** |
| Volta depois de 7 dias | "Que bom te ver de volta!" | "Bem-vindo de volta" |
| Conquistas | Voltei a estudar, Mapa na mão, De volta à água, Matéria retomada | Primeira aula, Nivelamento concluído, Retorno aos estudos, Disciplina concluída |

## 3. Resumo

Contado em 2026-10-15 sobre as trilhas da Travessia (script de conferência fora do repositório). Todas as fases citadas existem; nenhuma questão é copiada duas vezes.

| Curso (id) | Módulos | Aulas | Questões copiadas da Travessia (id novo, `copiaDe`) | Questões novas | Total |
|---|---|---|---|---|---|
| Ensino Médio · Matemática (`em-matematica`) | 4 | 24 | 282 | 198 | 480 |
| Ensino Médio · Português (`em-portugues`) | 3 | 17 | 198 | 142 | 340 |
| Ensino Médio · Redação (`em-redacao`) | 2 | 11 | 132 | 88 | 220 |
| Ensino Médio · Literatura (`em-literatura`) | 2 | 10 | 120 | 80 | 200 |
| Ensino Médio · Inglês (`em-ingles`) | 2 | 12 | 72 | 168 | 240 |
| Ensino Médio · Biologia (`em-biologia`) | 3 | 16 | 192 | 128 | 320 |
| Ensino Médio · Química (`em-quimica`) | 3 | 17 | 195 | 145 | 340 |
| Ensino Médio · Física (`em-fisica`) | 3 | 15 | 180 | 120 | 300 |
| Ensino Médio · História (`em-historia`) | 4 | 21 | 252 | 168 | 420 |
| Ensino Médio · Geografia (`em-geografia`) | 3 | 15 | 180 | 120 | 300 |
| Ensino Médio · Filosofia (`em-filosofia`) | 2 | 10 | 120 | 80 | 200 |
| Ensino Médio · Sociologia (`em-sociologia`) | 2 | 10 | 120 | 80 | 200 |
| **Total** | **33** | **178** | **2.043** | **1.517** | **3.560** |

- **Como contei:** aula R ou revisão (V) copia até 12 fáceis e médias das aulas-fonte e escreve o resto; aula A copia até 6; aula N escreve as 20. Copiadas e novas levam 1 variante cada (3.560 variantes).
- **Mudanças em relação à grade de 2026-10-14** (154 aulas): Filosofia e Sociologia viraram duas disciplinas (10 aulas cada); História ganhou a Idade Moderna e o século XIX (21 aulas); Biologia ganhou divisão celular e herança (16); Química ganhou polaridade e química orgânica (17); Redação passou a ensinar só o texto dissertativo-argumentativo e as cinco competências (11); Literatura ganhou versificação, narrativa, Parnasianismo, Simbolismo e Pré-Modernismo (10); Português trocou "Texto no trabalho" e "Classes de palavras" por funções da linguagem, figuras, coesão e ortografia (17); as aulas que só "adaptavam" a Travessia passaram a aproveitá-la por inteiro, porque o nível de prova agora é o objetivo. Saíram os temas "do dia a dia" sem ligação com a prova (currículo, carta de apresentação, e-mail de trabalho).

## 4. Mapa por curso, módulo e aula

**Origem:** R = aproveita as aulas da Travessia citadas (questões copiadas com id novo e artigo próprio); A = aproveita em parte e escreve o resto; N = nova; V = Revisão do módulo. Habilidades do Enem: a união das habilidades das fases-fonte da Travessia (na Redação, competências).

### Ensino Médio · Matemática (`em-matematica`)

**Módulo 1 · Números e operações** (`em-mat-m1`, Onda 0, já publicado)

| # | Aula | Habilidades do Enem | BNCC |
|---|---|---|---|
| 1 | Números inteiros: operações, propriedades e estimativa | H1, H3, H4, H5 | EF07MA04, EF06MA03 |
| 2 | Frações e números decimais | H1, H3 | EF06MA07, EF06MA08, EF06MA09 |
| 3 | Porcentagem e variação percentual | H1, H3, H4 | EF07MA02, EF09MA05, EM13MAT104 |
| 4 | Razão, proporção e regra de três | H15, H16, H17 | EF08MA12, EF08MA13, EF07MA17 |
| 5 | Matemática financeira: juros simples e compostos | H3, H5, H18 | EM13MAT303, EM13MAT104 |
| 6 | Revisão: números e operações | H1, H3, H4, H16, H18 | EF07MA04, EF06MA07, EF07MA02, EF08MA12, EM13MAT303 |

**Módulo 2 · Álgebra e funções** (`em-mat-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 7 | Equações do 1º grau (`em-mat-equacoes-1grau`) | R · `mat-equacoes-1grau` | hab | EF07MA18, EM13MAT301 |
| 8 | Sistemas de equações do 1º grau (`em-mat-sistemas`) | R · `mat-sistemas` | hab | EF08MA08, EM13MAT301 |
| 9 | Funções: conceito e função afim (`em-mat-funcao-afim`) | R · `mat-ideia-funcao`, `mat-funcao-afim` | hab | EM13MAT302, EM13MAT401 |
| 10 | Função quadrática e equações do 2º grau (`em-mat-funcao-quadratica`) | R · `mat-funcao-quadratica`, `mat-equacoes-2grau` | hab | EM13MAT402, EM13MAT503 |
| 11 | Progressões aritméticas e geométricas (`em-mat-progressoes`) | R · `mat-pa-pg` | hab | EM13MAT507, EM13MAT508 |
| 12 | Revisão: álgebra e funções (`em-mat-revisao-algebra`) | V · `mat-revisao-algebra`, `mat-revisao-funcoes` | hab | EM13MAT301, EM13MAT302 |

**Módulo 3 · Geometria e medidas** (`em-mat-m3`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 13 | Unidades de medida e conversões (`em-mat-unidades-medida`) | R · `mat-unidades-conversao` | hab | EF06MA24, EM13MAT103 |
| 14 | Geometria plana: perímetros e áreas (`em-mat-areas-planas`) | R · `mat-perimetros`, `mat-areas-planas`, `mat-circulo` | hab | EF07MA31, EM13MAT307 |
| 15 | Teorema de Pitágoras (`em-mat-pitagoras`) | R · `mat-pitagoras` | hab | EF09MA13, EM13MAT308 |
| 16 | Geometria espacial: volume e capacidade (`em-mat-volumes`) | R · `mat-prismas`, `mat-cilindros`, `mat-capacidade-embalagens` | hab | EF09MA19, EM13MAT309 |
| 17 | Trigonometria no triângulo retângulo (`em-mat-trigonometria`) | R · `mat-trigonometria-triangulo` | hab | EM13MAT308 |
| 18 | Revisão: geometria e medidas (`em-mat-revisao-geometria`) | V · `mat-revisao-areas`, `mat-revisao-espacial`, `mat-revisao-medidas` | hab | EM13MAT307, EM13MAT309 |

**Módulo 4 · Estatística e probabilidade** (`em-mat-m4`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 19 | Leitura de tabelas e gráficos (`em-mat-graficos`) | R · `mat-tabelas-graficos`, `mat-graficos-enganosos` | hab | EF09MA21, EF09MA22, EM13MAT102 |
| 20 | Média, mediana e moda (`em-mat-medidas-centrais`) | R · `mat-media`, `mat-moda-mediana` | hab | EF08MA25, EM13MAT406 |
| 21 | Análise combinatória: princípio fundamental da contagem (`em-mat-contagem`) | R · `mat-principio-contagem`, `mat-permutacoes-arranjos` | hab | EF08MA03, EM13MAT310 |
| 22 | Probabilidade (`em-mat-probabilidade`) | R · `mat-probabilidade` | hab | EF08MA22, EM13MAT311, EM13MAT312 |
| 23 | Probabilidade condicional e análise de dados (`em-mat-probabilidade-condicional`) | R · `mat-probabilidade-condicional`, `mat-estatistica-decisao` | hab | EM13MAT106, EM13MAT312 |
| 24 | Revisão: estatística e probabilidade (`em-mat-revisao-estatistica`) | V · `mat-revisao-estatistica`, `mat-revisao-probabilidade` | hab | EM13MAT102, EM13MAT311 |

### Ensino Médio · Português (`em-portugues`)

**Módulo 1 · Leitura e interpretação de textos** (`em-por-m1`, Onda 0, já publicado)

| # | Aula | Habilidades do Enem | BNCC |
|---|---|---|---|
| 1 | Tema, ideia principal, fato e opinião | H18, H22 | EM13LP01, EF69LP29 |
| 2 | Inferência: pressupostos e subentendidos | H18, H21 | EM13LP02, EM13LP06, EF69LP05 |
| 3 | Gêneros e tipos textuais | H18, H20 | EM13LP01, EM13LP26, EF69LP01 |
| 4 | Linguagem verbal e não verbal | H18, H21 | EM13LGG103, EM13LP14, EF69LP17 |
| 5 | Revisão: leitura e interpretação de textos | H18, H19, H21, H22 | EM13LP01, EM13LP02, EM13LP06, EM13LGG103 |

**Módulo 2 · Gramática e norma-padrão** (`em-por-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Ortografia e acentuação gráfica (`em-por-ortografia`) | R · `enem-redacao:red-ortografia-acentuacao` | hab | EM13LP08, EM13LP09 |
| 7 | Concordância verbal e nominal (`em-por-concordancia`) | R · `por-concordancia`, `enem-redacao:red-concordancia` | hab | EM13LP08 |
| 8 | Regência e crase (`em-por-regencia-crase`) | R · `por-regencia-crase`, `enem-redacao:red-regencia-crase` | hab | EM13LP08 |
| 9 | Pontuação (`em-por-pontuacao`) | R · `por-pontuacao`, `enem-redacao:red-pontuacao` | hab | EM13LP08, EM13LP06 |
| 10 | Coesão textual: referenciação e conectivos (`em-por-coesao`) | R · `por-coesao-referencial`, `por-conectivos` | hab | EM13LP02, EM13LP06 |
| 11 | Revisão: gramática e norma-padrão (`em-por-revisao-gramatica`) | V · `por-revisao-gramatica`, `enem-redacao:red-revisao-c1` | hab | EM13LP08 |

**Módulo 3 · Linguagem, variação e argumentação** (`em-por-m3`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 12 | Elementos da comunicação e funções da linguagem (`em-por-funcoes-linguagem`) | R · `por-elementos-comunicacao`, `por-funcoes-referencial-emotiva`, `por-funcoes-conativa-fatica`, `por-funcoes-metalinguistica-poetica` | hab | EM13LP01, EM13LP06 |
| 13 | Figuras de linguagem e sentido das palavras (`em-por-figuras-linguagem`) | R · `por-figuras-linguagem`, `por-sentido-palavras` | hab | EM13LP06 |
| 14 | Variação linguística e preconceito linguístico (`em-por-variacao`) | R · `por-variacao-tipos`, `por-norma-preconceito`, `por-oralidade-escrita` | hab | EM13LP10, EM13LGG401, EM13LGG402 |
| 15 | Argumentação: tese e tipos de argumento (`em-por-argumentacao`) | R · `por-tese-argumentos`, `por-tipos-argumento`, `por-texto-opiniao` | hab | EM13LP05, EM13LP07 |
| 16 | Intertextualidade, publicidade e desinformação (`em-por-leitura-critica`) | R · `por-intertextualidade`, `por-publicidade`, `por-fake-news` | hab | EM13LP03, EM13LP39, EM13LP44 |
| 17 | Revisão: linguagem, variação e argumentação (`em-por-revisao-linguagem`) | V · `por-revisao-funcoes`, `por-revisao-variacao`, `por-revisao-argumentacao` | hab | EM13LP05, EM13LP10 |

### Ensino Médio · Redação (`em-redacao`)

**Módulo 1 · O texto dissertativo-argumentativo** (`em-red-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | A redação do Enem: regras e competências (`em-red-prova-enem`) | R · `red-prova-regras`, `red-cinco-competencias`, `red-nota-zero`, `red-correcao` | hab | EM13LP15 |
| 2 | Estrutura do texto dissertativo-argumentativo (`em-red-estrutura`) | R · `red-tipo-dissertativo`, `red-estrutura-geral` | hab | EM13LP05, EM13LP15 |
| 3 | Tema, recorte e textos motivadores (`em-red-tema-recorte`) | R · `red-tema-recorte`, `red-textos-motivadores` | hab | EM13LP01, EM13LP15 |
| 4 | Introdução e tese (`em-red-introducao`) | R · `red-introducao`, `red-tese-argumentos` | hab | EM13LP05, EM13LP15 |
| 5 | Revisão: o texto dissertativo-argumentativo (`em-red-revisao-estrutura`) | V · `red-revisao-prova`, `red-revisao-c2` | hab | EM13LP15 |

**Módulo 2 · Argumentação, coesão e proposta de intervenção** (`em-red-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Repertório sociocultural e argumentação (`em-red-repertorio`) | R · `red-repertorio`, `red-repertorio-areas`, `red-argumentacao-consistente`, `red-tipos-argumento` | hab | EM13LP04, EM13LP05 |
| 7 | Parágrafo de desenvolvimento e projeto de texto (`em-red-desenvolvimento`) | R · `red-paragrafo-desenvolvimento`, `red-planejamento`, `red-coerencia`, `red-c3-criterios` | hab | EM13LP02, EM13LP15 |
| 8 | Coesão: conectivos e referenciação (`em-red-coesao`) | R · `red-conectivos`, `red-referenciacao`, `red-coesao-paragrafos`, `red-repeticao-ambiguidade`, `red-c4-criterios` | hab | EM13LP02 |
| 9 | Norma-padrão e registro formal na redação (`em-red-norma-padrao`) | R · `red-c1-criterios`, `red-registro-formal` | hab | EM13LP08, EM13LP15 |
| 10 | Proposta de intervenção e conclusão (`em-red-proposta`) | R · `red-c5-elementos`, `red-c5-detalhamento`, `red-propostas-eixos`, `red-direitos-humanos`, `red-conclusao` | hab | EM13LP05, EM13LP15 |
| 11 | Revisão: argumentação, coesão e proposta de intervenção (`em-red-revisao-competencias`) | V · `red-revisao-c3`, `red-revisao-c4`, `red-revisao-c5` | hab | EM13LP15 |

### Ensino Médio · Literatura (`em-literatura`)

**Módulo 1 · Teoria literária e as primeiras escolas** (`em-lit-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Texto literário e gêneros literários (`em-lit-texto-literario`) | R · `lit-texto-literario`, `lit-generos-literarios` | hab | EM13LP49 |
| 2 | Versificação e elementos da narrativa (`em-lit-versificacao-narrativa`) | R · `lit-versificacao`, `lit-narrativa` | hab | EM13LP49 |
| 3 | Quinhentismo, Barroco e Arcadismo (`em-lit-colonial`) | R · `lit-quinhentismo-barroco`, `lit-arcadismo` | hab | EM13LP48, EM13LP52 |
| 4 | Romantismo: poesia e prosa (`em-lit-romantismo`) | R · `lit-romantismo-poesia`, `lit-romantismo-prosa` | hab | EM13LP48, EM13LP52 |
| 5 | Revisão: teoria literária e as primeiras escolas (`em-lit-revisao-origens`) | V · `lit-revisao-texto-literario`, `lit-revisao-origens` | hab | EM13LP48, EM13LP49 |

**Módulo 2 · Do Realismo à literatura contemporânea** (`em-lit-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Realismo e Naturalismo (`em-lit-realismo`) | R · `lit-realismo-machado`, `lit-naturalismo` | hab | EM13LP48, EM13LP52 |
| 7 | Parnasianismo, Simbolismo e Pré-Modernismo (`em-lit-parnasianismo-simbolismo`) | R · `lit-parnasianismo`, `lit-simbolismo`, `lit-pre-modernismo` | hab | EM13LP48, EM13LP52 |
| 8 | Modernismo: a Semana de 1922 e a geração de 1930 (`em-lit-modernismo`) | R · `lit-modernismo-1922`, `lit-modernismo-30` | hab | EM13LP48, EM13LP52 |
| 9 | Literatura contemporânea (`em-lit-contemporanea`) | R · `lit-contemporanea` | hab | EM13LP51, EM13LP52 |
| 10 | Revisão: do Realismo à literatura contemporânea (`em-lit-revisao-modernismo`) | V · `lit-revisao-realismo`, `lit-revisao-modernismo` | hab | EM13LP48, EM13LP52 |

### Ensino Médio · Inglês (`em-ingles`)

**Módulo 1 · Leitura e compreensão de textos em inglês** (`em-ing-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Estratégias de leitura: skimming e scanning (`em-ing-estrategias`) | R · `ing-estrategias-leitura` | hab | EM13LGG403 |
| 2 | Cognatos, falsos cognatos e afixos (`em-ing-cognatos`) | R · `ing-cognatos-afixos` | hab | EM13LGG403 |
| 3 | Referência pronominal e conectivos (`em-ing-referencia`) | R · `ing-referencia-conectivos` | hab | EM13LGG403 |
| 4 | Gêneros textuais em língua inglesa (`em-ing-generos`) | R · `ing-generos-textuais` | hab | EM13LGG403 |
| 5 | Intenção, cultura e mídia em textos em inglês (`em-ing-cultura-midia`) | R · `ing-intencao-efeitos`, `ing-ingles-no-mundo`, `ing-cultura-diversidade`, `ing-tecnologia-midia` | hab | EM13LGG403, EM13LGG701 |
| 6 | Revisão: leitura e compreensão de textos em inglês (`em-ing-revisao-leitura`) | V · `ing-revisao-leitura`, `ing-revisao-uso` | hab | EM13LGG403 |

**Módulo 2 · Gramática da língua inglesa** (`em-ing-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 7 | Verbo to be, pronomes e artigos (`em-ing-to-be`) | N | hab | EM13LGG403 |
| 8 | Simple present e advérbios de frequência (`em-ing-simple-present`) | N | hab | EM13LGG403 |
| 9 | Simple past (`em-ing-simple-past`) | N | hab | EM13LGG403 |
| 10 | Futuro: will e going to (`em-ing-futuro`) | N | hab | EM13LGG403 |
| 11 | Question words e frases interrogativas (`em-ing-perguntas`) | N | hab | EM13LGG403 |
| 12 | Revisão: gramática da língua inglesa (`em-ing-revisao-gramatica`) | N | hab | EM13LGG403 |

### Ensino Médio · Biologia (`em-biologia`)

**Módulo 1 · Citologia e bioquímica** (`em-bio-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Citologia: membrana, citoplasma e organelas (`em-bio-citologia`) | R · `bio-celula`, `bio-membrana` | hab | EM13CNT202 |
| 2 | Bioquímica: as moléculas da vida (`em-bio-bioquimica`) | R · `bio-moleculas` | hab | EM13CNT202, EM13CNT104 |
| 3 | Metabolismo energético: fotossíntese e respiração celular (`em-bio-metabolismo`) | R · `bio-energia` | hab | EM13CNT202, EM13CNT105 |
| 4 | Divisão celular: mitose e meiose (`em-bio-divisao-celular`) | R · `bio-divisao` | hab | EM13CNT202 |
| 5 | Revisão: citologia e bioquímica (`em-bio-revisao-citologia`) | V · `bio-revisao-celula` | hab | EM13CNT202 |

**Módulo 2 · Fisiologia humana e saúde** (`em-bio-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Sistemas digestório e respiratório (`em-bio-digestorio-respiratorio`) | R · `bio-digestao-respiracao` | hab | EM13CNT207 |
| 7 | Sistemas circulatório e excretor (`em-bio-circulatorio-excretor`) | R · `bio-circulacao-excrecao` | hab | EM13CNT207 |
| 8 | Imunologia, vacinas e doenças infecciosas (`em-bio-imunologia`) | R · `bio-imunidade-saude`, `bio-microrganismos` | hab | EM13CNT207, EM13CNT306 |
| 9 | Sistemas nervoso, endócrino e reprodutor (`em-bio-endocrino-reprodutor`) | R · `bio-controle-reproducao` | hab | EM13CNT207 |
| 10 | Revisão: fisiologia humana e saúde (`em-bio-revisao-fisiologia`) | V · `bio-revisao-corpo` | hab | EM13CNT207 |

**Módulo 3 · Genética, evolução e ecologia** (`em-bio-m3`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 11 | Genética: DNA, genes e biotecnologia (`em-bio-genetica`) | R · `bio-dna`, `bio-biotecnologia` | hab | EM13CNT202, EM13CNT304 |
| 12 | Leis de Mendel e herança (`em-bio-heranca`) | R · `bio-mendel`, `bio-heranca`, `bio-heranca-sexo` | hab | EM13CNT202, EM13CNT304 |
| 13 | Evolução biológica (`em-bio-evolucao`) | R · `bio-evolucao` | hab | EM13CNT208 |
| 14 | Ecologia: cadeias alimentares, ciclos e populações (`em-bio-ecologia`) | R · `bio-ecossistemas`, `bio-ciclos`, `bio-relacoes-populacoes` | hab | EM13CNT105, EM13CNT203 |
| 15 | Biomas brasileiros e impactos ambientais (`em-bio-biomas`) | R · `bio-biomas-impactos` | hab | EM13CNT206 |
| 16 | Revisão: genética, evolução e ecologia (`em-bio-revisao-genetica-ecologia`) | V · `bio-revisao-genetica`, `bio-revisao-evolucao`, `bio-revisao-ecologia` | hab | EM13CNT202, EM13CNT208 |

### Ensino Médio · Química (`em-quimica`)

**Módulo 1 · Matéria e transformações** (`em-qui-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Matéria: propriedades e estados físicos (`em-qui-materia`) | R · `qui-materia` | hab | EM13CNT101 |
| 2 | Misturas e métodos de separação (`em-qui-separacao`) | R · `qui-separacao` | hab | EM13CNT104, EM13CNT310 |
| 3 | Reações químicas (`em-qui-reacoes`) | R · `qui-reacoes` | hab | EM13CNT101 |
| 4 | Leis ponderais, mol e estequiometria (`em-qui-estequiometria`) | R · `qui-mol`, `qui-estequiometria` | hab | EM13CNT101 |
| 5 | Revisão: matéria e transformações (`em-qui-revisao-materia`) | V · `qui-revisao-materia` | hab | EM13CNT101 |

**Módulo 2 · Estrutura atômica e ligações químicas** (`em-qui-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Modelos atômicos (`em-qui-modelos-atomicos`) | R · `qui-atomo` | hab | EM13CNT201 |
| 7 | Tabela periódica (`em-qui-tabela`) | R · `qui-tabela` | hab | EM13CNT209 |
| 8 | Ligações químicas (`em-qui-ligacoes`) | R · `qui-ligacoes` | hab | EM13CNT307 |
| 9 | Polaridade e forças intermoleculares (`em-qui-polaridade`) | R · `qui-polaridade` | hab | EM13CNT307 |
| 10 | Radioatividade (`em-qui-radioatividade`) | A · `qui-atomo` | hab | EM13CNT103 |
| 11 | Revisão: estrutura atômica e ligações químicas (`em-qui-revisao-atomistica`) | V · `qui-revisao-ligacoes` | hab | EM13CNT201, EM13CNT307 |

**Módulo 3 · Físico-química e química orgânica** (`em-qui-m3`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 12 | Soluções e concentração (`em-qui-solucoes`) | R · `qui-solucoes` | hab | EM13CNT104 |
| 13 | Funções inorgânicas e pH (`em-qui-acidos-bases`) | R · `qui-acidos-bases`, `qui-sais-oxidos`, `qui-ph` | hab | EM13CNT104 |
| 14 | Termoquímica e cinética química (`em-qui-termoquimica`) | R · `qui-termoquimica`, `qui-cinetica` | hab | EM13CNT102, EM13CNT106 |
| 15 | Química orgânica: cadeias e funções orgânicas (`em-qui-organica`) | R · `qui-organica-basica`, `qui-funcoes-organicas` | hab | EM13CNT307 |
| 16 | Polímeros e química ambiental (`em-qui-polimeros-ambiente`) | R · `qui-polimeros`, `qui-quimica-ambiente` | hab | EM13CNT104, EM13CNT309 |
| 17 | Revisão: físico-química e química orgânica (`em-qui-revisao-fisico-organica`) | V · `qui-revisao-quantidades`, `qui-revisao-fisico`, `qui-revisao-organica` | hab | EM13CNT104 |

### Ensino Médio · Física (`em-fisica`)

**Módulo 1 · Mecânica** (`em-fis-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Grandezas físicas e unidades de medida (`em-fis-grandezas`) | R · `fis-grandezas` | hab | EM13CNT301 |
| 2 | Cinemática: movimento uniforme (`em-fis-movimento-uniforme`) | R · `fis-cinematica-mu` | hab | EM13CNT204 |
| 3 | Movimento uniformemente variado e queda livre (`em-fis-muv`) | R · `fis-muv-queda` | hab | EM13CNT204 |
| 4 | Leis de Newton e aplicações (`em-fis-newton`) | R · `fis-leis-newton`, `fis-forcas-aplicacoes` | hab | EM13CNT204, EM13CNT306 |
| 5 | Revisão: mecânica (`em-fis-revisao-mecanica`) | V · `fis-revisao-movimento` | hab | EM13CNT204 |

**Módulo 2 · Energia, termologia, ondulatória e óptica** (`em-fis-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Trabalho, energia e conservação (`em-fis-energia`) | R · `fis-trabalho-energia`, `fis-conservacao-energia` | hab | EM13CNT101, EM13CNT106 |
| 7 | Termologia: temperatura e calor (`em-fis-termologia`) | R · `fis-termometria-calor` | hab | EM13CNT102 |
| 8 | Ondulatória e acústica (`em-fis-ondulatoria`) | R · `fis-ondas`, `fis-acustica` | hab | EM13CNT103, EM13CNT306 |
| 9 | Óptica geométrica (`em-fis-optica`) | R · `fis-optica` | hab | EM13CNT301 |
| 10 | Revisão: energia, termologia, ondulatória e óptica (`em-fis-revisao-energia`) | V · `fis-revisao-energia`, `fis-revisao-calor-ondas` | hab | EM13CNT101 |

**Módulo 3 · Eletricidade e magnetismo** (`em-fis-m3`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 11 | Eletrostática (`em-fis-eletrostatica`) | R · `fis-eletrostatica` | hab | EM13CNT107 |
| 12 | Corrente elétrica, potência e consumo de energia (`em-fis-corrente-potencia`) | R · `fis-eletrodinamica` | hab | EM13CNT107, EM13CNT308 |
| 13 | Circuitos elétricos (`em-fis-circuitos`) | R · `fis-circuitos` | hab | EM13CNT107, EM13CNT308 |
| 14 | Magnetismo e indução eletromagnética (`em-fis-magnetismo`) | R · `fis-magnetismo` | hab | EM13CNT107 |
| 15 | Revisão: eletricidade e magnetismo (`em-fis-revisao-eletricidade`) | V · `fis-revisao-optica-eletricidade` | hab | EM13CNT107 |

### Ensino Médio · História (`em-historia`)

**Módulo 1 · Antiguidade e Idade Média** (`em-his-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Fontes históricas e tempo histórico (`em-his-fontes-tempo`) | R · `his-fontes-tempo` | hab | EM13CHS101 |
| 2 | Antiguidade: Oriente, Grécia e Roma (`em-his-antiguidade`) | R · `his-antiguidade` | hab | EM13CHS101, EM13CHS104 |
| 3 | Idade Média: feudalismo, Bizâncio e mundo islâmico (`em-his-medieval`) | R · `his-medieval` | hab | EM13CHS102 |
| 4 | África e América antes da colonização europeia (`em-his-africa-america`) | R · `his-africa-america` | hab | EM13CHS601 |
| 5 | Revisão: Antiguidade e Idade Média (`em-his-revisao-antiga-medieval`) | V · `his-revisao-antigo-medieval` | hab | EM13CHS101 |

**Módulo 2 · Idade Moderna e Brasil Colônia** (`em-his-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Renascimento e Reformas religiosas (`em-his-renascimento-reformas`) | R · `his-renascimento-reformas` | hab | EM13CHS101, EM13CHS102 |
| 7 | Expansão marítima e povos indígenas (`em-his-expansao-indigenas`) | R · `his-expansao-maritima`, `his-indigenas-colonizacao` | hab | EM13CHS204, EM13CHS601 |
| 8 | Economia colonial: açúcar, mineração e escravidão (`em-his-economia-colonial`) | R · `his-acucar-escravidao`, `his-mineracao-revoltas` | hab | EM13CHS404, EM13CHS601 |
| 9 | Iluminismo, Revolução Francesa e Revolução Industrial (`em-his-iluminismo-revolucoes`) | R · `his-iluminismo-revolucoes`, `his-revolucao-industrial` | hab | EM13CHS401, EM13CHS603 |
| 10 | Revisão: Idade Moderna e Brasil Colônia (`em-his-revisao-moderna-colonia`) | V · `his-revisao-colonia`, `his-revisao-moderno` | hab | EM13CHS101 |

**Módulo 3 · Século XIX e Brasil Império** (`em-his-m3`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 11 | Independências na América e imperialismo (`em-his-independencias-imperialismo`) | R · `his-independencias-imperialismo` | hab | EM13CHS204, EM13CHS603 |
| 12 | Independência do Brasil e Período Regencial (`em-his-independencia-regencias`) | R · `his-independencia-regencias` | hab | EM13CHS603 |
| 13 | Segundo Reinado (`em-his-segundo-reinado`) | R · `his-segundo-reinado` | hab | EM13CHS603 |
| 14 | Abolição e pós-abolição (`em-his-abolicao`) | R · `his-abolicao` | hab | EM13CHS601, EM13CHS605 |
| 15 | Primeira República (`em-his-primeira-republica`) | R · `his-primeira-republica` | hab | EM13CHS602, EM13CHS603 |
| 16 | Revisão: século XIX e Brasil Império (`em-his-revisao-imperio-republica`) | V · `his-revisao-imperio-republica` | hab | EM13CHS603 |

**Módulo 4 · Século XX: Brasil e mundo** (`em-his-m4`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 17 | Guerras mundiais e totalitarismos (`em-his-guerras-totalitarismos`) | R · `his-guerras-totalitarismos` | hab | EM13CHS603, EM13CHS604 |
| 18 | Era Vargas e período democrático (`em-his-era-vargas`) | R · `his-vargas-populismo` | hab | EM13CHS602, EM13CHS404 |
| 19 | Guerra Fria (`em-his-guerra-fria`) | R · `his-guerra-fria` | hab | EM13CHS603, EM13CHS604 |
| 20 | Ditadura militar e redemocratização (`em-his-ditadura`) | R · `his-ditadura-redemocratizacao` | hab | EM13CHS602, EM13CHS605 |
| 21 | Revisão: século XX no Brasil e no mundo (`em-his-revisao-seculo-xx`) | V · `his-revisao-seculo-xx` | hab | EM13CHS603 |

### Ensino Médio · Geografia (`em-geografia`)

**Módulo 1 · Cartografia e geografia física** (`em-geo-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Orientação, coordenadas geográficas e fusos horários (`em-geo-orientacao`) | R · `geo-orientacao` | hab | EM13CHS106 |
| 2 | Escala e cartografia temática (`em-geo-escala`) | R · `geo-escala`, `geo-cartografia-tematica` | hab | EM13CHS106, EM13MAT509 |
| 3 | Estrutura geológica, relevo e solos (`em-geo-relevo-solos`) | R · `geo-estrutura-geologica`, `geo-relevo`, `geo-solos` | hab | EM13CHS106, EM13CNT105 |
| 4 | Climatologia (`em-geo-clima`) | R · `geo-clima` | hab | EM13CHS106, EM13CHS304 |
| 5 | Revisão: cartografia e geografia física (`em-geo-revisao-fisica`) | V · `geo-revisao-cartografia`, `geo-revisao-natureza-fisica` | hab | EM13CHS106 |

**Módulo 2 · Geografia do Brasil: território, população e economia** (`em-geo-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Território e regionalização do Brasil (`em-geo-territorio`) | R · `geo-territorio-brasil` | hab | EM13CHS204 |
| 7 | População e migrações (`em-geo-populacao`) | R · `geo-populacao`, `geo-migracoes` | hab | EM13CHS201 |
| 8 | Urbanização e espaço urbano (`em-geo-urbanizacao`) | R · `geo-urbanizacao`, `geo-espaco-urbano` | hab | EM13CHS206 |
| 9 | Espaço agrário, indústria e energia (`em-geo-economia`) | R · `geo-espaco-agrario`, `geo-industria`, `geo-energia` | hab | EM13CHS302, EM13CNT309 |
| 10 | Revisão: geografia do Brasil (`em-geo-revisao-brasil`) | V · `geo-revisao-populacao`, `geo-revisao-economia` | hab | EM13CHS201 |

**Módulo 3 · Questões ambientais e globalização** (`em-geo-m3`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 11 | Biomas e hidrografia do Brasil (`em-geo-biomas-hidrografia`) | R · `geo-biomas-brasil`, `geo-hidrografia` | hab | EM13CHS306 |
| 12 | Mudanças climáticas, desmatamento e sustentabilidade (`em-geo-mudancas-climaticas`) | R · `geo-mudancas-climaticas`, `geo-desmatamento-queimadas`, `geo-desenvolvimento-sustentavel` | hab | EM13CHS304, EM13CHS306 |
| 13 | Problemas ambientais urbanos (`em-geo-ambiente-urbano`) | R · `geo-problemas-urbanos-ambientais` | hab | EM13CHS301 |
| 14 | Globalização e blocos econômicos (`em-geo-globalizacao`) | R · `geo-globalizacao` | hab | EM13CHS201, EM13CHS604 |
| 15 | Revisão: questões ambientais e globalização (`em-geo-revisao-ambiente`) | V · `geo-revisao-ambiente`, `geo-revisao-biomas` | hab | EM13CHS304 |

### Ensino Médio · Filosofia (`em-filosofia`)

**Módulo 1 · Filosofia antiga e medieval** (`em-fil-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Do mito ao logos: o nascimento da filosofia (`em-fil-mito-logos`) | R · `fil-mito-logos` | hab | EM13CHS101 |
| 2 | Sócrates e Platão (`em-fil-socrates-platao`) | R · `fil-socrates-platao` | hab | EM13CHS101, EM13CHS501 |
| 3 | Aristóteles e o pensamento helenístico (`em-fil-aristoteles`) | R · `fil-aristoteles-helenismo` | hab | EM13CHS101, EM13CHS501 |
| 4 | Filosofia medieval: fé e razão (`em-fil-medieval`) | R · `fil-medieval` | hab | EM13CHS101 |
| 5 | Revisão: filosofia antiga e medieval (`em-fil-revisao-antiga-medieval`) | V · `fil-revisao-antiga-medieval` | hab | EM13CHS101 |

**Módulo 2 · Filosofia moderna e contemporânea** (`em-fil-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Teoria do conhecimento: racionalismo e empirismo (`em-fil-conhecimento`) | R · `fil-razao-experiencia` | hab | EM13CHS103 |
| 7 | Filosofia política: Estado e contrato social (`em-fil-politica`) | R · `fil-politica-moderna` | hab | EM13CHS603 |
| 8 | Ética (`em-fil-etica`) | R · `fil-etica-moderna` | hab | EM13CHS501 |
| 9 | Filosofia contemporânea (`em-fil-contemporanea`) | R · `fil-contemporanea` | hab | EM13CHS103, EM13CHS501 |
| 10 | Revisão: filosofia moderna e contemporânea (`em-fil-revisao-moderna`) | V · `fil-revisao-moderna-contemporanea` | hab | EM13CHS103 |

### Ensino Médio · Sociologia (`em-sociologia`)

**Módulo 1 · Os clássicos e a vida social** (`em-soc-m1`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 1 | Durkheim e o fato social (`em-soc-durkheim`) | R · `soc-durkheim` | hab | EM13CHS103 |
| 2 | Weber e Marx (`em-soc-weber-marx`) | R · `soc-weber-marx` | hab | EM13CHS103, EM13CHS401 |
| 3 | Cultura, identidade e diversidade (`em-soc-cultura`) | R · `soc-cultura-identidade` | hab | EM13CHS104, EM13CHS502 |
| 4 | Trabalho e sociedade (`em-soc-trabalho`) | R · `soc-trabalho` | hab | EM13CHS401, EM13CHS404 |
| 5 | Revisão: os clássicos e a vida social (`em-soc-revisao-classicos`) | V · `soc-revisao-classicos` | hab | EM13CHS103 |

**Módulo 2 · Sociedade brasileira contemporânea** (`em-soc-m2`)

| # | Aula (id) | Origem | Habilidades do Enem | BNCC |
|---|---|---|---|---|
| 6 | Desigualdade social (`em-soc-desigualdade`) | R · `soc-desigualdade` | hab | EM13CHS606 |
| 7 | Cidadania e democracia (`em-soc-cidadania`) | R · `soc-cidadania` | hab | EM13CHS605 |
| 8 | Movimentos sociais (`em-soc-movimentos-sociais`) | R · `soc-movimentos-sociais` | hab | EM13CHS605 |
| 9 | Violência, cidade e meios de comunicação (`em-soc-violencia-midia`) | R · `soc-cidade-violencia-midia` | hab | EM13CHS503, EM13CHS504 |
| 10 | Revisão: sociedade brasileira contemporânea (`em-soc-revisao-brasil`) | V · `soc-revisao-brasil-hoje` | hab | EM13CHS605 |


## 5. Avaliação de nivelamento e prova de suficiência

### 5.1 Avaliação de nivelamento (`data/diagnostica/ensino-medio.json`)

- **Blocos por área:** Linguagens (Português, Redação, Literatura, Inglês), Matemática, Ciências da Natureza (Biologia, Química, Física) e Ciências Humanas (História, Geografia, Filosofia, Sociologia). Cada questão aponta para um curso e um módulo (`moduloId`).
- **Tamanho:** 4 questões por disciplina, 5 em Matemática e 5 em História: 50 questões no total (16 fáceis, 23 médias, 11 difíceis; 29 copiadas da Avaliação Diagnóstica do Enem com `copiaDe`, 21 novas). Só aparecem as disciplinas com curso publicado.
- **Letra da certa:** as alternativas aparecem na ordem do arquivo, então as questões novas têm a certa espalhada (A 11, B 10, C 10, D 10, E 9). As 9 questões que já estavam em produção (`mp-por-*`, `mp-mat-*`) ficaram na ordem original, porque as respostas guardadas são pelo número da alternativa.
- **"Ainda não sei"** conta como "começar por este módulo", nunca como erro.
- **Faixas** (mesma conta da Avaliação Diagnóstica do Enem; a nota de 1 a 5 vai para o Cronograma):

| Nota | Faixa | O que acontece com os módulos da disciplina |
|---|---|---|
| 1 ou 2 (menos de 40%) | **Nível básico** | Módulo 1 recomendado; os outros ficam "Mais adiante" |
| 3 (de 40% a 60%) | **Nível intermediário** | Os módulos das questões erradas ou "Ainda não sei" ficam recomendados; os outros, disponíveis |
| 4 ou 5 (60% ou mais) | **Nível avançado** | Os módulos das questões certas ficam dominados (pelo nivelamento); a prova final da disciplina já fica liberada |

### 5.2 Prova de suficiência do módulo

5 questões sorteadas do próprio módulo (uma média ou difícil de cada aula, sem as da Revisão). Com 4 de 5 ou mais, o módulo fica dominado e as aulas dele deixam de ser exigidas para a prova final. Sem banco novo e sem custo na Fila.

## 6. Validação em escala (só estimativa; nada foi enviado)

US$ 0,037 por item (`node scripts/fila.mjs simular`, fórmula da seção 11.4 do `docs/MOTOR_DIVER.md`).

| Lote | Itens | Custo estimado |
|---|---|---|
| 12 cursos (178 aulas), questões | 3.560 | US$ 132,38 |
| 12 cursos, variantes | 3.560 | US$ 132,34 |
| Nivelamento | 50 | ~US$ 1,85 |
| **Total** | **7.170** | **~US$ 267** |

Valores do `simular` de 2026-10-15, curso a curso (lotes de 20; o teto já tem 30% de folga).

Nenhuma IA paga roda sem a aprovação do admin na tela, com senha e teto. A Fila recebe só o `simular` desta entrega.

## 7. Ondas

| Onda | O que entra | Situação |
|---|---|---|
| 0 | Infraestrutura da sala + Matemática Módulo 1 + Português Módulo 1 | Publicada (2026-10-14) |
| Tom | Revisão de tom e nomes (2026-10-15) | Feita (2026-10-15) |
| 1 | Matemática Módulos 2 a 4 e Português Módulos 2 e 3 | Feita (2026-10-15), um módulo por commit |
| 2 | Biologia, Química e Física + bloco Ciências da Natureza do nivelamento | Feita (2026-10-15) |
| 3 | História, Geografia, Filosofia e Sociologia + bloco Ciências Humanas | Feita (2026-10-15) |
| 4 | Redação, Literatura e Inglês + o resto do bloco Linguagens | Feita (2026-10-15) |

**Situação em 2026-10-15:** os 12 cursos estão escritos, com 178 aulas, 3.560 questões, 3.560 variantes e 552 fichas; `conferir-trilha.mjs` dá 0 erro e 0 aviso em todos. Falta a validação (Fila, só com aprovação do admin) e a revisão humana por professores de cada disciplina.

Antes do merge: `conferir-trilha.mjs` sem erro e sem aviso em cada curso, testes no PC e no celular, `simular` da Fila e o PR com prévia no ambiente de testes. O merge para a produção é do usuário.

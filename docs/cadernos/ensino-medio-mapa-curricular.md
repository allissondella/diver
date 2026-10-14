# Mapa curricular: sala Ensino Médio · "Sempre dá tempo"

> **Aprovado em 2026-10-14 ("manda bala").** Onda 0 em andamento.
> Só conclusões nossas: nomes de cursos, módulos e aulas escritos por nós, organizados pela BNCC do Ensino Médio (MEC, 2018) e medidos contra o que a Travessia já tem. Nenhum trecho de terceiro.
> O inventário, a curadoria da pasta do Drive e as decisões técnicas estão no caderno da sala: `docs/cadernos/ensino-medio-retomada.md`.

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
- **A retomada também volta ao Ensino Fundamental.** Boa parte do que o adulto esqueceu (frações, regra de três, equação do 1º grau, Pitágoras) é habilidade dos anos finais (EF06 a EF09).
  - Por isso a Matemática cita os dois níveis: o EF onde o conteúdo nasce e o EM onde ele é usado.
  - Português e as outras matérias citam só o EM. Lá a BNCC organiza por área, e o código dá o "para quê" da aula.
- **Matriz de Referência do Enem (Inep):** é a régua da Travessia, conferida em 2026-10-09 (`docs/cadernos/enem-mapa-curricular.md`). Aqui entra só para o "próximo passo" de cada matéria.
- **Matriz do Encceja:** a página oficial do Inep que eu procurei não abriu (404), e a busca não achou a matriz atual.
  - **Não deu para confirmar.** Fica como pendência, e o plano não depende dela.

## 2. Regras de estrutura e nomes

- **Sala:** "Ensino Médio", subtexto **"Sempre dá tempo"**, id `ensino-medio`, matrícula `pacote:ensino-medio`.
- **Um curso por matéria.**
  - id `em-<matéria>`, nome **"<Matéria> · Retomada"**;
  - `categoria: "Ensino Médio"`, `fasesLivres: true`, `rotuloAula: "Aula"`.
- **Módulo** (campo `modulo`): "Módulo 2 · Álgebra e funções".
  - Tem de 4 a 6 aulas; a última é sempre a **Revisão do módulo**, com cerca de 10 questões misturadas.
  - Ganha um id estável no campo opcional novo `moduloId`. Ver o caderno, decisão (c).
- **Aula:** "Aula 9 · A ideia de função e a função afim".
  - A numeração é contínua no curso e feita **só** por `node scripts/numerar-aulas.mjs`.
  - O id da fase não leva número: `em-mat-funcao-afim`.
- **Descrição:** "Módulo 2 · aula 3 de 6 · 15 min".
  - O script já monta a descrição; aqui `minutos` é 15, e 20 nas aulas mais densas.
  - Sem o trecho "treina as habilidades": a BNCC fica no campo `habilidades`, para a equipe, e não na tela.
- **Nada de nomes do mar** em curso, módulo, aula ou descrição. Mergulho, Simulado, Revisão, "Antes de mergulhar" e "Dica de mergulhador" continuam como são.
- **Cada aula:**
  - o "Antes de mergulhar" abre com **"Onde isso aparece na sua vida"** e tem 350 palavras ou mais;
  - cerca de **20 questões**: 8 fáceis, 8 médias e 4 difíceis, porque é retomada e não prova;
  - a 1ª rodada da 1ª aula de cada módulo só tem fáceis (ver o caderno, decisão (e));
  - comentário em todas as alternativas, Dica de mergulhador, fichas, 1 variante por questão e blocos para os jogos;
  - **só questões `origem: "diver"`**: nada de literal do Enem nesta sala.
- **Prova final por matéria:** 30 questões, 45 min, 60% para passar. Ver o caderno, decisão (d).

### Nomes: antes e depois

| Onde | Hoje | Proposta |
|---|---|---|
| Sala | não existe | **Ensino Médio** · "Sempre dá tempo" |
| Curso de Matemática que o aluno vê | "Mergulho no Enem · Matemática" (sala do Enem, 75 aulas) | **"Matemática · Retomada"** (sala Ensino Médio, 24 aulas). Dentro da sala aparece só "Matemática", com o selo "Retomada" |
| Módulo | "Módulo 4 · Porcentagem e matemática financeira" (Enem) | "Módulo 1 · Números e contas do dia a dia" |
| Aula | "Aula 19 · Porcentagem: conceito e cálculo" (Enem) | "Aula 3 · Porcentagem: aumento e desconto" |
| Descrição | "Módulo 4 · aula 1 de 7 · 35 min · treina as habilidades H1 e H3" | "Módulo 1 · aula 3 de 6 · 15 min" |

**Sobre "Retomada":** é curta, adulta e diz o que a pessoa está fazendo, sem lembrar que ela parou.
- As alternativas que pesei:
  - "Recomeço": soa como se tivesse dado errado;
  - "Do básico": pode soar infantil;
  - "Base": é fria.
- **Recomendo "Retomada".**
- Os ids `em-…` não colidem com nada: nenhum curso, fase ou questão de hoje começa com `em-`, e a sala do Enem reconhece os cursos por `/^enem-/`.

## 3. Resumo

Medido em 2026-10-14 com um script de conferência (não vai para o repositório), sobre as trilhas da Travessia. Todas as fases citadas abaixo existem.

| Curso (id) | Módulos | Aulas | Aulas que aproveitam a Travessia (R) | Adaptam (A) | Novas (N) | Revisões | Fáceis e médias disponíveis nas aulas-fonte | Questões copiadas (id novo) | Questões novas |
|---|---|---|---|---|---|---|---|---|---|
| Matemática · Retomada (`em-matematica`) | 4 | 24 | 16 | 4 | 0 | 4 | 675 | 264 | 216 |
| Português · Retomada (`em-portugues`) | 3 | 15 | 9 | 1 | 2 | 3 | 300 | 150 | 150 |
| Redação · Retomada (`em-redacao`) | 2 | 8 | 2 | 1 | 4 | 1 | 120 | 42 | 118 |
| Literatura · Retomada (`em-literatura`) | 2 | 8 | 4 | 2 | 0 | 2 | 195 | 84 | 76 |
| Biologia · Retomada (`em-biologia`) | 3 | 15 | 11 | 1 | 0 | 3 | 300 | 174 | 126 |
| Química · Retomada (`em-quimica`) | 3 | 15 | 10 | 2 | 0 | 3 | 270 | 168 | 132 |
| Física · Retomada (`em-fisica`) | 3 | 15 | 12 | 0 | 0 | 3 | 300 | 180 | 120 |
| História · Retomada (`em-historia`) | 3 | 15 | 11 | 1 | 0 | 3 | 315 | 174 | 126 |
| Geografia · Retomada (`em-geografia`) | 3 | 15 | 12 | 0 | 0 | 3 | 405 | 180 | 120 |
| Filosofia e Sociologia · Retomada (`em-filosofia-sociologia`) | 2 | 12 | 10 | 0 | 0 | 2 | 255 | 144 | 96 |
| Inglês · Retomada (`em-ingles`) | 2 | 12 | 3 | 2 | 6 | 1 | 90 | 60 | 180 |
| **Total** | **30** | **154** | **100** | **14** | **12** | **28** | **3.225** | **1.620** | **1.460** |

- **Como contei:**
  - aula R ou revisão: copia até 12 fáceis e médias das aulas-fonte e escreve o resto;
  - aula A: copia até 6;
  - aula N: escreve as 20.
  - As 20 questões de cada aula somam **3.080**: 1.620 copiadas (53%) e 1.460 novas.
  - As variantes acompanham: 1 por questão, 3.080 no total. A cópia leva junto a variante da Travessia, que é revista com a questão.
  - **Fichas:** cerca de 400, uma por tema com 3 ou mais questões.
- **O que a Travessia tem hoje (medido):** 7.170 questões, todas `origem: "diver"` (nenhuma literal do Enem), sendo 2.505 fáceis, 2.871 médias e 1.794 difíceis; e 7.090 variantes e 958 fichas.
  - **Nenhuma passou pelo Mergulho Triplo:** 0 questões e 0 variantes com `validacao.pronta`.
  - `data/acervo/` está vazio. Então a busca por similares (`buscar-similares.mjs`) ainda não acha nada, e a cópia vem direto das trilhas.
- **Sobre os tamanhos que você propôs:** a medição confirma.
  - **Não proponho juntar cursos.** O tamanho de cada um ficou dentro do teto.
  - Inglês e Redação são os que mais pedem conteúdo novo: a Travessia não tem gramática de inglês nem textos do dia a dia.
  - Literatura (8 aulas) poderia virar um módulo de Português. Mantive separada por dois motivos: o Mapa de partida mede as duas em separado, e o "Aprofundar na Travessia" leva a cursos diferentes.
  - Ficaram de fora do panorama: Parnasianismo, Simbolismo e Pré-Modernismo. Eles continuam na Travessia.

## 4. Mapa por curso, módulo e aula

**Legenda da origem:**
- **R** = aproveita a aula da Travessia citada (questões copiadas com id novo e o artigo reescrito mais curto e simples);
- **A** = adapta: a Travessia cobre só uma parte ou no nível de prova;
- **N** = nova;
- **V** = Revisão do módulo (questões das aulas do módulo e das revisões da Travessia citadas).

Na coluna BNCC, "EF" é a habilidade do Fundamental onde o conteúdo nasce e "EM" é a do Ensino Médio.

### 4.1 Matemática · Retomada (24 aulas)

**Módulo 1 · Números e contas do dia a dia**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Contas sem medo: operações, negativos e estimativa | Fazer as quatro operações com inteiros e conferir se o resultado faz sentido | Saldo da conta, extrato no vermelho, troco | EF07MA04 | R · `mat-operacoes-inteiros`, `mat-estimativa` |
| 2 | Frações e decimais na prática | Ler, comparar e calcular frações e decimais | Receita pela metade, "1/3 de desconto", litro e meio | EF06MA07, EF06MA09 | R · `mat-fracoes-decimais` |
| 3 | Porcentagem: aumento e desconto | Calcular porcentagens e variações sucessivas | Promoção, reajuste do aluguel, imposto na nota | EF07MA02, EF09MA05, EM13MAT104 | R · `mat-porcentagem`, `mat-aumentos-descontos` |
| 4 | Razão, proporção e regra de três | Resolver problemas proporcionais | Receita para mais gente, consumo do carro, mapa | EF08MA12, EF08MA13 | R · `mat-razao-proporcao`, `mat-regra-de-tres` |
| 5 | Juros, parcelas e o preço à vista | Comparar à vista com parcelado, juros simples e compostos | Crediário, cartão de crédito, financiamento | EM13MAT303 | A · `mat-juros-simples`, `mat-juros-compostos`, `mat-financiamentos` |
| 6 | Revisão do módulo: contas do dia a dia | Misturar o módulo | — | — | V · `mat-revisao-numeros`, `mat-revisao-proporcao`, `mat-revisao-financeira` |

**Módulo 2 · Álgebra e funções**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 7 | Equações do 1º grau no dia a dia | Montar e resolver a equação a partir de um problema | Dividir a conta, plano de celular | EF07MA18, EM13MAT301 | R · `mat-equacoes-1grau` |
| 8 | Sistemas: duas contas ao mesmo tempo | Resolver sistemas de duas equações | Comparar dois planos, mistura de preços | EF08MA08 | R · `mat-sistemas` |
| 9 | A ideia de função e a função afim | Ler e montar a relação entre duas grandezas | Corrida de aplicativo (fixo + km), conta de água | EM13MAT302, EM13MAT401 | R · `mat-ideia-funcao`, `mat-funcao-afim` |
| 10 | Função quadrática e equações do 2º grau | Achar raízes e o ponto de máximo ou mínimo | Lucro máximo de uma venda, arremesso | EM13MAT402, EM13MAT503 | A · `mat-funcao-quadratica`, `mat-equacoes-2grau` |
| 11 | Sequências: PA e PG | Reconhecer e calcular termos de PA e PG | Poupança com depósito fixo, juros que crescem | EM13MAT507, EM13MAT508 | R · `mat-pa-pg` |
| 12 | Revisão do módulo: álgebra e funções | Misturar o módulo | — | — | V · `mat-revisao-algebra`, `mat-revisao-funcoes` |

**Módulo 3 · Geometria e medidas**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 13 | Unidades de medida e conversões | Converter comprimento, massa, volume e tempo | Receita em gramas, metro de tecido, litros | EF06MA24, EM13MAT103 | R · `mat-unidades-conversao` |
| 14 | Perímetro e área de figuras planas | Calcular perímetro e área, incluindo o círculo | Piso, pintura, cerca do quintal | EF07MA31, EM13MAT307 | R · `mat-perimetros`, `mat-areas-planas`, `mat-circulo` |
| 15 | Teorema de Pitágoras | Usar a relação no triângulo retângulo | Escada na parede, tela da TV em polegadas | EF09MA13, EM13MAT308 | R · `mat-pitagoras` |
| 16 | Volume e capacidade | Calcular volume de caixas e cilindros | Caixa-d'água, embalagem, mudança | EF09MA19, EM13MAT309 | R · `mat-prismas`, `mat-cilindros`, `mat-capacidade-embalagens` |
| 17 | Trigonometria no triângulo retângulo | Usar seno, cosseno e tangente | Rampa de acessibilidade, altura de um prédio | EM13MAT308 | A · `mat-trigonometria-triangulo` |
| 18 | Revisão do módulo: geometria e medidas | Misturar o módulo | — | — | V · `mat-revisao-areas`, `mat-revisao-espacial`, `mat-revisao-medidas` |

**Módulo 4 · Dados e chance**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 19 | Tabelas e gráficos (e os que enganam) | Ler gráficos e notar escala e recorte | Notícia, pesquisa eleitoral, conta de luz | EF09MA21, EF09MA22, EM13MAT102 | R · `mat-tabelas-graficos`, `mat-graficos-enganosos` |
| 20 | Média, mediana e moda | Calcular e escolher a medida certa | Salário médio, nota, preço do mercado | EF08MA25, EM13MAT406 | R · `mat-media`, `mat-moda-mediana` |
| 21 | Contagem: quantas possibilidades? | Usar o princípio multiplicativo | Senha do celular, placa, combinação de roupa | EF08MA03, EM13MAT310 | R · `mat-principio-contagem`, `mat-permutacoes-arranjos` |
| 22 | Probabilidade | Calcular a chance de um evento | Sorteio, loteria, previsão do tempo | EF08MA22, EM13MAT311, EM13MAT312 | R · `mat-probabilidade` |
| 23 | Dados para decidir: risco, aposta e notícia | Usar dados e chance para decidir com calma | Aposta online, seguro, exame médico | EM13MAT106, EM13MAT102 | A · `mat-estatistica-decisao`, `mat-probabilidade-condicional` |
| 24 | Revisão do módulo: dados e chance | Misturar o módulo | — | — | V · `mat-revisao-estatistica`, `mat-revisao-probabilidade` |

### 4.2 Português · Retomada (15 aulas)

**Módulo 1 · Ler e entender**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Assunto, tema e ideia principal | Dizer do que o texto fala e o que ele defende | Mensagem do grupo da família, aviso do condomínio | EM13LP01 | R · `por-tema-assunto` |
| 2 | Ler nas entrelinhas: inferência | Entender o que o texto sugere sem dizer | Ironia num post, letra miúda de uma oferta | EM13LP02, EM13LP06 | R · `por-inferencia` |
| 3 | Gêneros do dia a dia: aviso, bula, contrato e notícia | Reconhecer a finalidade de cada gênero | Bula de remédio, contrato de aluguel, boleto | EM13LP01, EM13LP26 | A · `por-generos-textuais`, `por-tipos-textuais` |
| 4 | Texto, imagem e gráfico juntos | Ler textos que misturam linguagens | Meme, anúncio, infográfico | EM13LGG103 | R · `por-texto-multimodal` |
| 5 | Revisão do módulo: ler e entender | Misturar o módulo | — | — | V · `por-revisao-leitura` |

**Módulo 2 · Gramática no uso**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 6 | Classes de palavras e verbos: quem faz o quê, e quando | Reconhecer substantivo, adjetivo e verbo e o tempo verbal | Escrever um recado claro, entender um edital | EM13LP08 | N |
| 7 | Concordância verbal e nominal | Fazer sujeito e verbo combinarem | Currículo, e-mail para o chefe | EM13LP08 | R · `por-concordancia`, `red-concordancia` (Redação) |
| 8 | Pontuação que muda o sentido | Usar vírgula, ponto e dois-pontos | "Vamos comer, gente" e "Vamos comer gente" | EM13LP08 | R · `por-pontuacao`, `red-pontuacao` (Redação) |
| 9 | Crase, ortografia e acentuação | Escrever sem os erros mais comuns | Formulário, mensagem formal, placa de loja | EM13LP08, EM13LP09 | R · `por-regencia-crase`, `red-ortografia-acentuacao` (Redação) |
| 10 | Revisão do módulo: gramática no uso | Misturar o módulo | — | — | V · `por-revisao-gramatica` |

**Módulo 3 · Língua viva**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 11 | Variação linguística e adequação | Escolher o jeito de falar para cada situação | Entrevista de emprego e conversa com amigos | EM13LP10, EM13LGG402 | R · `por-variacao-tipos`, `por-norma-preconceito` |
| 12 | Argumentação: tese e argumentos | Achar a opinião e os argumentos de um texto | Debate na reunião, propaganda política | EM13LP05 | R · `por-tese-argumentos`, `por-tipos-argumento` |
| 13 | Desinformação: checar antes de compartilhar | Conferir fonte, data e autor | Corrente no WhatsApp, notícia falsa de saúde | EM13LP39, EM13LP40 | R · `por-fake-news` |
| 14 | Texto no trabalho: mensagem, e-mail e relatório | Escrever com objetivo, clareza e o tom certo | Pedir férias, relatar um problema, responder cliente | EM13LP15 | N |
| 15 | Revisão do módulo: língua viva | Misturar o módulo | — | — | V · `por-revisao-variacao`, `por-revisao-argumentacao` |

### 4.3 Redação · Retomada (8 aulas)

**Módulo 1 · Escrever no dia a dia**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Mensagem e e-mail que resolvem | Escrever com assunto, pedido claro e fecho | Falar com a escola do filho, cobrar um serviço | EM13LP15 | N |
| 2 | Currículo e carta de apresentação | Apresentar experiência sem exagero nem modéstia | Vaga de emprego, estágio | EM13LP15, EM13LP19 | N |
| 3 | Reclamação, requerimento e carta formal | Fazer pedidos formais com dados e argumento | Plataforma do consumidor, pedido à prefeitura | EM13LP26, EM13LP27 | N |
| 4 | Revisão do módulo: escrever no dia a dia | Misturar o módulo | — | — | N |

**Módulo 2 · Texto dissertativo-argumentativo**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 5 | O que é um texto dissertativo-argumentativo | Conhecer a estrutura: introdução, desenvolvimento e conclusão | Redação do Enem e de concurso, artigo de opinião | EM13LP05, EM13LP15 | R · `red-tipo-dissertativo`, `red-estrutura-geral` |
| 6 | Tese, argumentos e parágrafo | Montar um parágrafo que sustenta uma ideia | Defender um ponto numa reunião | EM13LP05 | R · `red-tese-argumentos`, `red-paragrafo-desenvolvimento` |
| 7 | Conectivos e proposta de solução | Ligar as ideias e fechar com uma proposta | Fechar um relatório com encaminhamentos | EM13LP02, EM13LGG304 | A · `red-conectivos`, `red-c5-elementos` |
| 8 | Revisão do módulo: o texto dissertativo | Misturar o módulo | — | — | V · `red-revisao-c3`, `red-revisao-c5` |

A correção de texto continua fora (ponto em aberto em `docs/CONTEUDO_CURSINHO.md`, seção 5). As aulas ensinam por questões e blocos, como na Travessia.

### 4.4 Literatura · Retomada (8 aulas)

**Módulo 1 · Das origens ao Romantismo**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | O que faz um texto ser literário | Diferenciar o texto literário e os gêneros lírico, narrativo e dramático | Letra de música, novela, poema na parede do metrô | EM13LP49 | R · `lit-texto-literario`, `lit-generos-literarios` |
| 2 | Das cartas da colônia ao Barroco e ao Arcadismo | Situar os primeiros textos e estilos | Nomes de rua e de escola, cidades históricas de Minas | EM13LP48, EM13LP52 | A · `lit-quinhentismo-barroco`, `lit-arcadismo` |
| 3 | Romantismo: poesia e romance | Reconhecer o ideal romântico e o romance brasileiro | Adaptações para TV, Dia do Índio, "amor de novela" | EM13LP48, EM13LP52 | R · `lit-romantismo-poesia`, `lit-romantismo-prosa` |
| 4 | Revisão do módulo: das origens ao Romantismo | Misturar o módulo | — | — | V · `lit-revisao-origens` |

**Módulo 2 · Do Realismo à literatura contemporânea**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 5 | Realismo, Naturalismo e Machado de Assis | Perceber a crítica social e a ironia | Livros pedidos em concurso, frases de Machado em memes | EM13LP52 | R · `lit-realismo-machado`, `lit-naturalismo` |
| 6 | Modernismo: a Semana de 22 e o romance de 30 | Reconhecer a ruptura e o Brasil regional | Exposições, filmes sobre o sertão | EM13LP48 | R · `lit-modernismo-1922`, `lit-modernismo-30` |
| 7 | A literatura de hoje | Ler o Brasil contemporâneo nos livros | Feira literária, clube do livro, slam | EM13LP51, EM13LP52 | A · `lit-contemporanea` |
| 8 | Revisão do módulo: do Realismo aos dias de hoje | Misturar o módulo | — | — | V · `lit-revisao-modernismo` |

Citação literal só de autor em domínio público, como na Travessia.

### 4.5 Biologia · Retomada (15 aulas)

**Módulo 1 · Vida e célula**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | O que é estar vivo | Reconhecer as características e os níveis de organização da vida | Fermento do pão, mofo na geladeira | EM13CNT202 | A · `bio-celula` |
| 2 | Célula e organelas | Nomear as partes da célula e o papel de cada uma | Exame de sangue, propaganda de "células-tronco" | EM13CNT202 | R · `bio-celula`, `bio-membrana` |
| 3 | Moléculas da vida e alimentação | Ligar carboidratos, proteínas e gorduras ao corpo | Rótulo nutricional, dieta da moda | EM13CNT202, EM13CNT104 | R · `bio-moleculas` |
| 4 | Energia: fotossíntese e respiração | Seguir a energia da planta até o músculo | Horta, cansaço no exercício, fermentação | EM13CNT202, EM13CNT105 | R · `bio-energia` |
| 5 | Revisão do módulo: vida e célula | Misturar o módulo | — | — | V · `bio-revisao-celula` |

**Módulo 2 · Corpo, saúde e doenças**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 6 | Digestão, nutrição e respiração | Entender os caminhos do alimento e do ar | Azia, asma, alimentação equilibrada | EM13CNT207 | R · `bio-digestao-respiracao` |
| 7 | Circulação e excreção | Entender coração, sangue e rins | Pressão alta, exame de urina, doação de sangue | EM13CNT207 | R · `bio-circulacao-excrecao` |
| 8 | Imunidade, vacinas e doenças | Saber como o corpo se defende e como as doenças passam | Calendário de vacinas, dengue, antibiótico | EM13CNT207, EM13CNT306 | R · `bio-imunidade-saude`, `bio-microrganismos` |
| 9 | Hormônios, reprodução e saúde sexual | Entender hormônios, ciclo e prevenção | Métodos contraceptivos, ISTs, diabetes | EM13CNT207 | R · `bio-controle-reproducao` |
| 10 | Revisão do módulo: corpo e saúde | Misturar o módulo | — | — | V · `bio-revisao-corpo` |

**Módulo 3 · Hereditariedade, evolução e ambiente**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 11 | DNA e herança | Ler cruzamentos simples e tipos sanguíneos | Teste de paternidade, tipo sanguíneo na doação | EM13CNT202, EM13CNT304 | R · `bio-dna`, `bio-mendel` |
| 12 | Evolução | Entender seleção natural e as evidências | Bactéria resistente a antibiótico | EM13CNT208 | R · `bio-evolucao` |
| 13 | Ecologia: cadeias e ciclos | Seguir energia e matéria no ambiente | Agrotóxico na cadeia alimentar, compostagem | EM13CNT105, EM13CNT203 | R · `bio-ecossistemas`, `bio-ciclos` |
| 14 | Biomas, impactos e conservação | Conhecer os biomas e o que os ameaça | Queimadas, seca, notícia sobre a Amazônia | EM13CNT206 | R · `bio-biomas-impactos` |
| 15 | Revisão do módulo: hereditariedade, evolução e ambiente | Misturar o módulo | — | — | V · `bio-revisao-genetica`, `bio-revisao-ecologia` |

### 4.6 Química · Retomada (15 aulas)

**Módulo 1 · Matéria e suas transformações**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Matéria e mudanças de estado | Reconhecer estados físicos e propriedades | Gelo derretendo, roupa secando no varal | EM13CNT101 | R · `qui-materia` |
| 2 | Misturas e separação | Separar misturas pelo método certo | Coar café, filtro de água, tratamento de esgoto | EM13CNT104, EM13CNT310 | R · `qui-separacao` |
| 3 | Reações químicas no cotidiano | Reconhecer quando há reação | Ferrugem, bolo crescendo, comprimido efervescente | EM13CNT101 | R · `qui-reacoes` |
| 4 | Conservação da massa e proporções | Usar a ideia de que nada se perde | Receita em escala, combustível e gás carbônico | EM13CNT101 | A · `qui-mol` |
| 5 | Revisão do módulo: matéria e transformações | Misturar o módulo | — | — | V · `qui-revisao-materia` |

**Módulo 2 · Átomo, tabela e ligações**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 6 | Átomo e modelos atômicos | Entender como os modelos mudaram | Fogos de artifício coloridos | EM13CNT201 | R · `qui-atomo` |
| 7 | Tabela periódica | Ler a tabela e as famílias | Sódio no rótulo, ferro no remédio | EM13CNT209 | R · `qui-tabela` |
| 8 | Ligações químicas | Diferenciar ligação iônica, covalente e metálica | Sal de cozinha, fio de cobre, açúcar | EM13CNT307 | R · `qui-ligacoes` |
| 9 | Radioatividade: usos e riscos | Conhecer os usos na medicina e na energia | Raio X, radioterapia, Césio-137 em Goiânia | EM13CNT103 | A · `qui-atomo` |
| 10 | Revisão do módulo: átomo, tabela e ligações | Misturar o módulo | — | — | V · `qui-revisao-ligacoes` |

**Módulo 3 · Química do cotidiano**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 11 | Soluções e concentração | Ler concentração em g/L e em % | Soro caseiro, remédio, água sanitária diluída | EM13CNT104 | R · `qui-solucoes` |
| 12 | Ácidos, bases e pH | Reconhecer ácidos, bases e a escala de pH | Azia e antiácido, limpeza, piscina | EM13CNT104 | R · `qui-acidos-bases`, `qui-ph` |
| 13 | Energia das reações: combustíveis e calorias | Comparar a energia liberada por combustíveis e alimentos | Etanol ou gasolina, caloria do lanche | EM13CNT102, EM13CNT106 | R · `qui-termoquimica` |
| 14 | Plásticos, ambiente e reciclagem | Entender polímeros e o descarte | Separação do lixo, microplástico | EM13CNT104, EM13CNT309, EM13CHS301 | R · `qui-polimeros`, `qui-quimica-ambiente` |
| 15 | Revisão do módulo: química do cotidiano | Misturar o módulo | — | — | V · `qui-revisao-quantidades`, `qui-revisao-organica` |

### 4.7 Física · Retomada (15 aulas)

**Módulo 1 · Movimento e forças**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Grandezas e unidades | Medir e converter grandezas físicas | Velocímetro, receita de remédio em mL | EM13CNT301 | R · `fis-grandezas` |
| 2 | Velocidade e tempo de viagem | Calcular velocidade média e tempo | Tempo no aplicativo de mapas, radar | EM13CNT204 | R · `fis-cinematica-mu` |
| 3 | Aceleração e queda | Entender aceleração, freada e queda livre | Distância de frenagem, objeto caindo da janela | EM13CNT204 | R · `fis-muv-queda` |
| 4 | Leis de Newton: cinto, freio e atrito | Usar as três leis em situações reais | Cinto de segurança, pneu careca | EM13CNT204, EM13CNT306 | R · `fis-leis-newton`, `fis-forcas-aplicacoes` |
| 5 | Revisão do módulo: movimento e forças | Misturar o módulo | — | — | V · `fis-revisao-movimento` |

**Módulo 2 · Energia, calor, luz e som**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 6 | Energia e conservação | Seguir a energia de uma forma para outra | Usina, elevador, bicicleta | EM13CNT101, EM13CNT106 | R · `fis-trabalho-energia`, `fis-conservacao-energia` |
| 7 | Temperatura e calor | Diferenciar temperatura e calor | Garrafa térmica, febre, roupa de frio | EM13CNT102 | R · `fis-termometria-calor` |
| 8 | Ondas e som | Entender frequência, volume e eco | Fone de ouvido, barulho no trabalho | EM13CNT103, EM13CNT306 | R · `fis-ondas`, `fis-acustica` |
| 9 | Luz e visão | Entender espelhos, lentes e a visão | Óculos, retrovisor, câmera do celular | EM13CNT301 | R · `fis-optica` |
| 10 | Revisão do módulo: energia, calor, luz e som | Misturar o módulo | — | — | V · `fis-revisao-energia`, `fis-revisao-calor-ondas` |

**Módulo 3 · Eletricidade e magnetismo no dia a dia**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 11 | Carga, corrente e tensão | Entender o que é tensão e corrente | Choque na maçaneta, tomada 127 V e 220 V | EM13CNT107 | R · `fis-eletrostatica`, `fis-eletrodinamica` |
| 12 | Potência e conta de luz | Calcular consumo em kWh | Chuveiro elétrico, bandeira tarifária, ar-condicionado | EM13CNT107, EM13CNT308, EM13MAT404 | R · `fis-eletrodinamica` |
| 13 | Circuitos da casa e segurança | Entender série, paralelo, disjuntor e aterramento | Benjamim sobrecarregado, disjuntor desarmando | EM13CNT107, EM13CNT308 | R · `fis-circuitos` |
| 14 | Ímãs, motores e geradores | Ligar magnetismo a motor e gerador | Liquidificador, usina, cartão por aproximação | EM13CNT107 | R · `fis-magnetismo` |
| 15 | Revisão do módulo: eletricidade e magnetismo | Misturar o módulo | — | — | V · `fis-revisao-optica-eletricidade` |

### 4.8 História · Retomada (15 aulas)

**Módulo 1 · Das origens à Idade Média**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Fontes e tempo: como a história é contada | Ler fontes e medir o tempo histórico | Foto antiga da família, "século XXI" | EM13CHS101 | R · `his-fontes-tempo` |
| 2 | Antiguidade: primeiras civilizações, Grécia e Roma | Conhecer as heranças antigas | Democracia, alfabeto, direito, Olimpíada | EM13CHS101, EM13CHS104 | R · `his-antiguidade` |
| 3 | Idade Média, Bizâncio e mundo islâmico | Entender feudalismo, Igreja e trocas culturais | Algarismos arábicos, castelos em filmes | EM13CHS102 | R · `his-medieval` |
| 4 | África e América antes dos europeus | Conhecer reinos africanos e povos americanos | Raízes da cultura brasileira, alimentos nativos | EM13CHS601 | R · `his-africa-america` |
| 5 | Revisão do módulo: das origens à Idade Média | Misturar o módulo | — | — | V · `his-revisao-antigo-medieval` |

**Módulo 2 · Brasil: colônia e império**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 6 | Chegada dos europeus e povos indígenas | Entender a conquista e a resistência | Demarcação de terras indígenas, nomes tupis | EM13CHS204, EM13CHS601 | R · `his-expansao-maritima`, `his-indigenas-colonizacao` |
| 7 | Açúcar, ouro e escravidão | Entender a economia colonial e o tráfico | Cidades históricas, desigualdade de hoje | EM13CHS404, EM13CHS601 | R · `his-acucar-escravidao`, `his-mineracao-revoltas` |
| 8 | Independência e Império | Seguir do 7 de setembro ao Segundo Reinado | Feriados, nomes de praças e avenidas | EM13CHS603 | R · `his-independencia-regencias`, `his-segundo-reinado` |
| 9 | Abolição e pós-abolição | Entender a abolição e o que faltou depois | 13 de maio, 20 de novembro, cotas | EM13CHS601, EM13CHS605 | R · `his-abolicao` |
| 10 | Revisão do módulo: Brasil colônia e império | Misturar o módulo | — | — | V · `his-revisao-colonia`, `his-revisao-imperio-republica` |

**Módulo 3 · Brasil república e mundo contemporâneo**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 11 | Primeira República e Era Vargas | Entender o voto e a CLT | Carteira de trabalho, voto obrigatório | EM13CHS602, EM13CHS404 | R · `his-primeira-republica`, `his-vargas-populismo` |
| 12 | Guerras mundiais e Guerra Fria | Situar os conflitos do século XX | Filmes de guerra, Muro de Berlim, ONU | EM13CHS603, EM13CHS604 | R · `his-guerras-totalitarismos`, `his-guerra-fria` |
| 13 | Ditadura e redemocratização | Entender 1964–1985 e as Diretas Já | Memória de parentes, Comissão da Verdade | EM13CHS602, EM13CHS605 | R · `his-ditadura-redemocratizacao` |
| 14 | Constituição de 1988 e cidadania | Conhecer direitos e deveres que vieram com ela | SUS, voto aos 16, direitos do consumidor | EM13CHS605, EM13CHS606 | A · `soc-cidadania` (Sociologia) |
| 15 | Revisão do módulo: república e mundo contemporâneo | Misturar o módulo | — | — | V · `his-revisao-seculo-xx` |

### 4.9 Geografia · Retomada (15 aulas)

**Módulo 1 · Mapas e planeta**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Orientação, coordenadas e fusos horários | Localizar-se e calcular fuso | GPS do celular, voo para outro estado | EM13CHS106 | R · `geo-orientacao` |
| 2 | Escala e leitura de mapas | Ler escala e mapas temáticos | Mapa do bairro, aplicativo de trânsito | EM13CHS106, EM13MAT509 | R · `geo-escala`, `geo-cartografia-tematica` |
| 3 | Relevo, placas e solos | Entender a forma do terreno e o solo | Deslizamento em morro, erosão, terremoto na notícia | EM13CHS106, EM13CNT105 | R · `geo-estrutura-geologica`, `geo-relevo`, `geo-solos` |
| 4 | Clima e tempo | Diferenciar tempo e clima e ler previsões | Frente fria, El Niño, seca | EM13CHS106, EM13CHS304 | R · `geo-clima` |
| 5 | Revisão do módulo: mapas e planeta | Misturar o módulo | — | — | V · `geo-revisao-cartografia`, `geo-revisao-natureza-fisica` |

**Módulo 2 · Brasil: território, população e economia**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 6 | Território e regiões do Brasil | Conhecer regiões e fronteiras | Sotaques, preço do frete, eleição por estado | EM13CHS204 | R · `geo-territorio-brasil` |
| 7 | População e migrações | Ler dados de população e migração | Família que veio de outro estado, Censo | EM13CHS201 | R · `geo-populacao`, `geo-migracoes` |
| 8 | Cidades: moradia, mobilidade e desigualdade | Entender o espaço urbano | Ônibus lotado, aluguel caro, enchente | EM13CHS206 | R · `geo-urbanizacao`, `geo-espaco-urbano` |
| 9 | Campo, indústria e energia | Entender agronegócio, indústria e matriz energética | Preço do alimento, conta de luz, combustível | EM13CHS302, EM13CNT309 | R · `geo-espaco-agrario`, `geo-industria`, `geo-energia` |
| 10 | Revisão do módulo: Brasil | Misturar o módulo | — | — | V · `geo-revisao-populacao`, `geo-revisao-economia` |

**Módulo 3 · Mundo, natureza e ambiente**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 11 | Biomas e água do Brasil | Conhecer biomas, bacias e aquíferos | Falta d'água, rio poluído | EM13CHS306 | R · `geo-biomas-brasil`, `geo-hidrografia` |
| 12 | Mudanças climáticas e desmatamento | Entender o aquecimento e as queimadas | Ondas de calor, fumaça das queimadas | EM13CHS304, EM13CHS306 | R · `geo-mudancas-climaticas`, `geo-desmatamento-queimadas` |
| 13 | Problemas ambientais nas cidades | Entender lixo, enchente e ilha de calor | Coleta seletiva, alagamento | EM13CHS301 | R · `geo-problemas-urbanos-ambientais` |
| 14 | Globalização e blocos econômicos | Entender o comércio mundial | Produto importado, dólar alto, Mercosul | EM13CHS201, EM13CHS604 | R · `geo-globalizacao` |
| 15 | Revisão do módulo: mundo e ambiente | Misturar o módulo | — | — | V · `geo-revisao-ambiente`, `geo-revisao-biomas` |

### 4.10 Filosofia e Sociologia · Retomada (12 aulas)

**Módulo 1 · Pensar**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Do mito à filosofia | Entender por que fazer perguntas | Superstição, "sempre foi assim" | EM13CHS101 | R · `fil-mito-logos` |
| 2 | Sócrates, Platão e Aristóteles | Conhecer o diálogo, o mundo das ideias e a virtude | "Só sei que nada sei", o meio-termo | EM13CHS101, EM13CHS501 | R · `fil-socrates-platao`, `fil-aristoteles-helenismo` |
| 3 | Conhecimento: razão e experiência | Diferenciar o que se sabe pela razão e pela experiência | Opinião contra evidência, ciência na pandemia | EM13CHS103 | R · `fil-razao-experiencia` |
| 4 | Ética: como decidir o que é certo | Comparar dever, consequência e liberdade | Dilema no trabalho, troco errado | EM13CHS501 | R · `fil-etica-moderna` |
| 5 | Política: poder, Estado e contrato | Entender o Estado e o contrato social | Imposto, lei, eleição | EM13CHS603 | R · `fil-politica-moderna` |
| 6 | Revisão do módulo: pensar | Misturar o módulo | — | — | V · `fil-revisao-antiga-medieval`, `fil-revisao-moderna-contemporanea` |

**Módulo 2 · Sociedade**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 7 | O que é sociedade: os clássicos | Conhecer Durkheim, Weber e Marx pelo dia a dia | Regras do trabalho, "fato social" | EM13CHS103 | R · `soc-durkheim`, `soc-weber-marx` (Sociologia) |
| 8 | Cultura e identidade | Entender cultura, identidade e preconceito | Festa junina, racismo, sotaque | EM13CHS104, EM13CHS502 | R · `soc-cultura-identidade` (Sociologia) |
| 9 | Trabalho e direitos | Entender formas de trabalho e direitos | Aplicativo de entrega, carteira assinada | EM13CHS401, EM13CHS404 | R · `soc-trabalho` (Sociologia) |
| 10 | Desigualdade social | Ler indicadores de desigualdade | Salário mínimo, renda por bairro | EM13CHS606 | R · `soc-desigualdade` (Sociologia) |
| 11 | Cidadania, democracia e movimentos sociais | Conhecer direitos e formas de participação | Conselho de saúde, abaixo-assinado | EM13CHS605 | R · `soc-cidadania`, `soc-movimentos-sociais` (Sociologia) |
| 12 | Revisão do módulo: sociedade | Misturar o módulo | — | — | V · `soc-revisao-classicos`, `soc-revisao-brasil-hoje` (Sociologia) |

### 4.11 Inglês · Retomada (12 aulas)

**Módulo 1 · Ler textos**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 1 | Você já sabe mais inglês do que pensa: cognatos | Usar palavras parecidas com o português (e cuidar das falsas) | Cardápio, rótulo, menu do celular | EM13LGG403 | R · `ing-cognatos-afixos` |
| 2 | Ler sem traduzir tudo | Achar a ideia geral e a informação específica | Manual de aparelho, notícia em inglês | EM13LGG403 | R · `ing-estrategias-leitura` |
| 3 | Avisos, rótulos e instruções | Ler textos curtos do dia a dia | Aeroporto, embalagem importada, aplicativo | EM13LGG403 | A · `ing-generos-textuais` |
| 4 | Pistas da frase: referência e conectivos | Entender a quem o pronome se refere e o que liga as ideias | E-mail de trabalho em inglês | EM13LGG403 | R · `ing-referencia-conectivos` |
| 5 | Inglês na internet e no trabalho | Ler termos de tecnologia e do trabalho | Vaga de emprego, rede social, jogo | EM13LGG403, EM13LGG701 | A · `ing-tecnologia-midia` |
| 6 | Revisão do módulo: ler textos | Misturar o módulo | — | — | V · `ing-revisao-leitura` |

**Módulo 2 · Gramática básica**
| # | Aula | Objetivo | Onde isso aparece na sua vida | BNCC | Origem |
|---|---|---|---|---|---|
| 7 | To be e pronomes | Apresentar-se e descrever | Cadastro em site, apresentação | EM13LGG403 | N |
| 8 | Presente simples: a rotina | Falar de hábitos | Perfil profissional, rotina de trabalho | EM13LGG403 | N |
| 9 | Passado simples: o que aconteceu | Contar fatos passados | Experiência no currículo, avaliação de compra | EM13LGG403 | N |
| 10 | Futuro e planos | Falar de planos e previsões | Viagem, meta, agenda | EM13LGG403 | N |
| 11 | Perguntas: who, what, where, when | Fazer e entender perguntas | Atendimento, formulário, entrevista | EM13LGG403 | N |
| 12 | Revisão do módulo: gramática básica | Misturar o módulo | — | — | N |

Os textos em inglês são todos nossos, como na Travessia. Espanhol, Artes e Educação Física não entram na primeira rodada: a sala aponta para os cursos da Travessia (decisão (e) no caderno).

## 5. Banco do Mapa de partida e do Teste rápido

### 5.1 Mapa de partida (o teste geral): 45 questões em 4 blocos

| Bloco | Matérias (questões) | Total | Tempo de referência | Origem |
|---|---|---|---|---|
| Linguagens | Português 4 · Redação 4 · Literatura 4 · Inglês 4 | 16 | 15 a 20 min | 3 de `data/diagnostica/enem.json` (`dg-lin-01`, `dg-lin-02`, `dg-lin-09`), revistas, + 13 novas |
| Matemática | 5 (uma por módulo, e a 5ª de contas básicas) | 5 | 8 a 10 min | 3 de `enem.json` (`dg-mat-01`, `dg-mat-02`, `dg-mat-03`) + 2 novas |
| Ciências da Natureza | Biologia 4 · Química 4 · Física 4 | 12 | 12 a 15 min | 3 de `enem.json` (`dg-nat-01`, `dg-nat-04`, `dg-nat-07`) + 9 novas |
| Ciências Humanas | História 4 · Geografia 4 · Filosofia e Sociologia 4 | 12 | 12 a 15 min | 3 de `enem.json` (`dg-hum-01`, `dg-hum-04`, `dg-hum-06`) + 9 novas |
| **Total** | 11 matérias | **45** | ~50 min, ou um bloco por dia | **12 revistas + 33 novas** |

- **As 12 de `enem.json` são as fáceis** da Avaliação Diagnóstica do Enem (a 13ª fácil é de espanhol e fica de fora).
  - Entram copiadas, com id novo e revistas para o tom de retomada.
  - Quem fizer as duas avaliações reencontra essas 12. Se você preferir, as 12 também viram novas: mais US$ 0,45 e um pouco de escrita.
- **Cada questão aponta para um módulo** (campo `moduloId`). É assim que o Mapa recomenda módulo, e não só matéria.
- **Rampa dentro de cada bloco:** as 2 primeiras de cada matéria são fáceis, e as outras, médias. Nenhuma difícil.
  - O bloco abre pelas matérias mais "do dia a dia" (Português e Matemática).
- **"Ainda não sei"** conta como "vale começar por aqui", nunca como erro.
  - Sem cronômetro na tela. O tempo de referência só aparece antes de começar ("leva uns 15 minutos").
- **As faixas por matéria** usam a mesma conta da Avaliação Diagnóstica: peso por dificuldade e puxão para a área. A nota de 1 a 5 vai para o Cronograma sem conta nova.

| Nota (a mesma do Cronograma) | Faixa que a pessoa vê | O que acontece com os módulos daquela matéria |
|---|---|---|
| 1 ou 2 (menos de 40%) | **"Vale começar por aqui"** | Módulo 1 **recomendado**; os outros ficam "Para depois" |
| 3 (de 40% a 60%) | **"Vale uma revisão"** | Os módulos das questões que ela errou ou marcou "Ainda não sei" ficam **recomendados**; os outros, **liberados** |
| 4 ou 5 (60% ou mais) | **"Você já manda bem aqui"** | Os módulos das questões que ela acertou viram **Dominado (pelo Mapa)**; os outros ficam liberados, com o convite ao Teste rápido; aparece o atalho "Já domino: fazer a prova agora" |

- **O resultado é um mapa, não uma nota.** Para cada matéria aparecem a faixa, um ícone e uma frase. Não aparece porcentagem, a não ser que a pessoa abra "Ver detalhes".
- **O Mapa cresce com os cursos:** cada bloco só mostra as matérias com curso publicado. Na Onda 0, por exemplo, só existem Português e Matemática.

### 5.2 Teste rápido do módulo: sem banco novo

- **5 questões sorteadas do próprio módulo**: uma média ou difícil de cada aula, sem as da Revisão.
  - Cada módulo tem de 80 a 100 questões, então dá para sortear outras na próxima tentativa.
- **Passou** com 4 de 5 ou mais:
  - o módulo vira **Dominado (pelo teste)**;
  - a caixa do Diver comemora e sugere o próximo módulo.
- **Não passou:**
  - "Sem problema: o módulo fica liberado, e a Aula 1 é um ótimo começo";
  - nada fica trancado e não há espera para tentar de novo.
- **Quanto custa:** **nenhuma questão nova** e nada a mais na Fila, porque as questões já são validadas com as aulas.

## 6. Validação em escala (só estimativa; nada foi enviado)

`node scripts/fila.mjs simular` em três aulas da Travessia, de Matemática, Português e História: **US$ 0,742 a 0,744 por lote de 20**, tanto em questões quanto em variantes. É cerca de **US$ 0,037 por item** (fórmula da seção 11.4 do `docs/MOTOR_DIVER.md`, com 30% de folga).

| Onda | Itens (questões + variantes + Mapa) | Custo estimado |
|---|---|---|
| 0 · infraestrutura + pilotos (Matemática Módulo 1 e Português Módulo 1: 11 aulas) | 220 + 220 + 9 do Mapa | ~US$ 17 |
| 1 · Matemática e Português completos (mais 28 aulas) | 560 + 560 | ~US$ 42 |
| 2 · Biologia, Química e Física (45 aulas) | 900 + 900 + 12 | ~US$ 67 |
| 3 · História, Geografia e Filosofia e Sociologia (42 aulas) | 840 + 840 + 12 | ~US$ 63 |
| 4 · Inglês, Redação e Literatura (28 aulas) | 560 + 560 + 12 | ~US$ 42 |
| **Total** | **3.080 + 3.080 + 45 = 6.205** | **~US$ 231** |

- **As questões copiadas da Travessia também entram na conta:** nenhuma foi validada ainda, e a cópia é revista (id novo, tom e nível), então precisa da própria validação.
  - Se a Travessia for validada antes, dá para economizar. A cópia guarda `copiaDe`, e uma questão copiada sem mudar nenhuma letra pode herdar o resultado.
  - Isso pede uma mudança pequena no `fila.mjs`, e fica para quando houver o que herdar.
- **As questões do Mapa não estão no formato de trilha.** Elas ficam em `data/diagnostica/ensino-medio.json` e pedem um adaptador pequeno no `fila.mjs`, que a Avaliação Diagnóstica do Enem também espera.
- **Continua valendo:**
  - nenhuma IA paga roda sem a sua aprovação na tela, com senha e teto;
  - cada onda vai com `--onda EM0`, `EM1`… para você aprovar de uma vez;
  - eu só monto com `simular` e mostro o custo.

## 7. Ondas

Cada onda termina publicável e útil sozinha. O Mapa ganha o bloco da matéria quando ela sai.

| Onda | O que entra | Aulas | Questões novas / copiadas | Custo da Fila |
|---|---|---|---|---|
| **0 · Infraestrutura + pilotos** | Sala, subtexto, "Meu caminho", as duas portas, estados dos módulos e "Liberar quando quiser", Teste rápido, Mapa de partida (blocos de Português e Matemática), Prova final por matéria com atalho e reforço, tutorial da sala, card do Início, conquistas. **Matemática Módulo 1 + Português Módulo 1** de ponta a ponta. Banco: SQL só se você escolher um tipo de evento novo (ver o caderno, decisão (b)) | 11 | 100 / 120 | ~US$ 17 |
| **1 · Matemática e Português completos** | Matemática módulos 2 a 4 e Português módulos 2 e 3, um módulo por commit | 28 | 266 / 294 | ~US$ 42 |
| **2 · Biologia, Química e Física** | 3 cursos + bloco Natureza no Mapa | 45 | 378 / 522 | ~US$ 67 |
| **3 · História, Geografia e Filosofia e Sociologia** | 3 cursos + bloco Humanas no Mapa | 42 | 342 / 498 | ~US$ 63 |
| **4 · Inglês, Redação e Literatura** | 3 cursos + o resto do bloco Linguagens | 28 | 374 / 186 | ~US$ 42 |
| **Total** | | **154** | **1.460 / 1.620** | **~US$ 231** |

- **Peso no app:**
  - o catálogo leve ganha ~42 KB (154 aulas × ~270 bytes, medido nos cursos do Enem), de 198 para ~240 KB, ou ~6 KB a mais com compressão;
  - cada curso só baixa quando o aluno entra nele (Matemática ~0,8 a 1 MB);
  - o Mapa (~60 KB) só baixa na tela dele.
- **Antes de cada onda:** `validar-fontes` do que for novo → `criar-trilha`, um módulo por vez → `conferir-trilha.mjs` sem erro → `simular` → o seu OK para a Fila → PR com prévia no ambiente de testes → o merge é seu.

# Mapa curricular: Enem e vestibulares (mais de um ano de conteúdo)

> **Rascunho da Etapa 1 (2026-10-09), aguardando o OK do Allisson.** Nada aqui virou curso ainda.
> Só conclusões nossas: nomes de módulos e aulas escritos por nós, organizados pela Matriz de Referência do Enem (Inep) e pelo mapa tema × peso das provas de 2019 a 2025 (`docs/cadernos/enem-vestibular.md`). Nenhum trecho de terceiro.

## 1. Base

- **Matriz de Referência do Enem (Inep).** A versão publicada em abril de 2026 (página atualizada em 17/07/2026) tem **as mesmas 120 habilidades e as mesmas 5 competências da redação** da matriz de 2009. A diferença é a diagramação e um termo do anexo ("pessoas com deficiência"). Conferido em 2026-10-09, comparando os dois PDFs do Inep habilidade por habilidade.
  - A numeração `H1`–`H30` usada aqui é a de cada área: Linguagens, Matemática, Natureza e Humanas.
  - A ordem e o recorte dos módulos seguem o anexo "Objetos de conhecimento" da própria matriz.
- **Risco a acompanhar:** o Inep anuncia uma matriz nova, alinhada à BNCC e ao Novo Ensino Médio, para 2028 (talvez 2027, se um projeto de lei passar). Como cada aula declara as habilidades que treina (`habilidades`), a troca de matriz vira um mapeamento, não um curso novo.
- **Peso:** a frequência de cada tema nas provas regulares de 2019 a 2025 (classificação por palavras-chave, 315 questões por área). É uma bússola, não uma estatística exata.
  - **Alto:** 10% ou mais da área.
  - **Médio:** de 5% a 10%.
  - **Baixo:** menos de 5%.

## 2. Regras de estrutura

- **Um curso por matéria:** `Enem · Matemática` (`enem-matematica`), na categoria "Enem e vestibular", com `fasesLivres: true`.
- **Módulo** (campo opcional `modulo` na fase): "Módulo 3 · Geometria plana".
  - De 5 a 7 aulas.
  - A última é sempre a **Revisão do módulo**.
- **Aula** (`fases[].nome`): "Aula 14 · Áreas de figuras planas". A numeração é contínua no curso e gerada por script.
  - O **id não leva número** (`mat-areas-planas`): dá para reordenar sem perder o histórico.
  - A `descricao` diz onde a aula está: "Módulo 3 · aula 2 de 6 · 35 min · treina as habilidades H8 e H9".
  - Sem `profundidade`.
- **Redação:** "Oficina 7 · Proposta de intervenção" (curso `enem-redacao`).
- **Cada aula:**
  - o "Antes de mergulhar" completo e cerca de 20 questões, do fácil ao difícil;
  - a aula 1 de cada curso é 100% nossa;
  - literais do Enem só da aula 2 em diante, difíceis, até 30% da aula, sem variante e uma vez só em todo o Diver;
  - a **Revisão do módulo** mistura questões de todas as aulas do módulo e é a melhor vaga para as literais do Enem.
- **Prova final:** 45 questões por curso, como uma área do Enem.

## 3. Resumo

| Curso (id) | Aulas | Módulos | Habilidades da matriz | Peso no Enem |
|---|---|---|---|---|
| Enem · Matemática (`enem-matematica`) | 75 | 12 | Matemática H1–H30 | 45 questões (toda a área) |
| Enem · Português (`enem-portugues`) | 35 | 6 | Linguagens H1–H4, H18–H30 | alto |
| Enem · Literatura (`enem-literatura`) | 20 | 4 | Linguagens H15–H17 | alto (~20% de Linguagens) |
| Enem · Artes e Educação Física (`enem-artes-ef`) | 12 | 2 | Linguagens H9–H14 | alto (artes ~20%, práticas corporais ~13%) |
| Enem · Inglês (`enem-ingles`) | 8 | 1 (*) | Linguagens H5–H8 | 5 questões |
| Enem · Espanhol (`enem-espanhol`) | 8 | 1 (*) | Linguagens H5–H8 | 5 questões |
| Enem · História (`enem-historia`) | 25 | 5 | Humanas H1–H5, H11–H25 | alto (Brasil ~24%, geral ~4% de Humanas) |
| Enem · Geografia (`enem-geografia`) | 30 | 6 | Humanas H6–H10, H16–H20, H26–H30 | alto (~34% de Humanas) |
| Enem · Filosofia (`enem-filosofia`) | 10 | 2 | Humanas H1–H5, H11–H15, H21–H25 | médio-alto (~12% de Humanas) |
| Enem · Sociologia (`enem-sociologia`) | 10 | 2 | Humanas H1–H5, H11–H15, H21–H25 | médio-alto (~10% de Humanas) |
| Enem · Física (`enem-fisica`) | 22 | 4 | Natureza H1–H23 (C6 = H20–H23) | ~29% de Natureza |
| Enem · Química (`enem-quimica`) | 27 | 5 | Natureza H1–H19, H24–H27 | ~35% de Natureza |
| Enem · Biologia (`enem-biologia`) | 27 | 5 | Natureza H1–H19, H28–H30 | ~35% de Natureza |
| **Conteúdo (o aluno faz uma língua)** | **301** | | | |
| Enem · Redação (`enem-redacao`) | 40 oficinas | 6 | 5 competências da redação | ~metade da nota de muitos cursos |
| **A produzir (as duas línguas)** | **349** | | | |

(*) A língua estrangeira fura a regra de 5 a 7 aulas por módulo (um módulo de 8). Decisão pendente: manter 8 numa exceção, ou fazer 2 módulos de 5 (10 aulas por língua).

O curso atual `enem-vestibular` continua como **"Enem e Vestibular · Comece por aqui"**: as 5 fases, as questões e os ids ficam, como porta de entrada de todas as áreas.

## 4. Matemática completa (75 aulas, 12 módulos)

Competências da área: C1 números (H1–H5), C2 geometria (H6–H9), C3 grandezas e medidas (H10–H14), C4 variação de grandezas (H15–H18), C5 álgebra (H19–H23), C6 gráficos e tabelas (H24–H26) e C7 estatística e probabilidade (H27–H30).

### Módulo 1 · Números e operações (6 aulas) · peso médio (base de todo o resto)
| # | id | Aula | Habilidades |
|---|---|---|---|
| 1 | `mat-operacoes-inteiros` | Operações com números naturais e inteiros | H1, H3 |
| 2 | `mat-fracoes-decimais` | Frações e decimais no dia a dia | H1, H3 |
| 3 | `mat-potencias-notacao` | Potências, raízes e notação científica | H1, H3 |
| 4 | `mat-divisibilidade` | Divisibilidade, MMC e MDC | H2, H3 |
| 5 | `mat-estimativa` | Estimativa e razoabilidade de um resultado | H4, H5 |
| 6 | `mat-revisao-numeros` | Revisão do módulo: números e operações | H1–H5 |

### Módulo 2 · Razão, proporção e regra de três (6 aulas) · peso alto (~11% com escala e unidades)
| # | id | Aula | Habilidades |
|---|---|---|---|
| 7 | `mat-razao-proporcao` | Razão e proporção | H15, H16 |
| 8 | `mat-grandezas-proporcionais` | Grandezas direta e inversamente proporcionais | H15, H16 |
| 9 | `mat-regra-de-tres` | Regra de três simples e composta | H16, H17 |
| 10 | `mat-divisao-proporcional` | Divisão proporcional | H16, H18 |
| 11 | `mat-taxas-razoes` | Velocidade, densidade e outras taxas | H16, H17 |
| 12 | `mat-revisao-proporcao` | Revisão do módulo: razão e proporção | H15–H18 |

### Módulo 3 · Grandezas, medidas e escala (6 aulas) · peso alto
| # | id | Aula | Habilidades |
|---|---|---|---|
| 13 | `mat-unidades-conversao` | Unidades de medida e conversões | H10, H12 |
| 14 | `mat-escala` | Escala em mapas, plantas e maquetes | H11 |
| 15 | `mat-tempo-fuso` | Medidas de tempo e fuso horário | H10, H12 |
| 16 | `mat-precisao-medicao` | Precisão, arredondamento e erro de medição | H13 |
| 17 | `mat-consumo-vazao` | Consumo, vazão e grandezas compostas | H12, H14 |
| 18 | `mat-revisao-medidas` | Revisão do módulo: grandezas e medidas | H10–H14 |

### Módulo 4 · Porcentagem e matemática financeira (7 aulas) · peso alto (~12%)
| # | id | Aula | Habilidades |
|---|---|---|---|
| 19 | `mat-porcentagem` | Porcentagem: conceito e cálculo | H1, H3 |
| 20 | `mat-aumentos-descontos` | Aumentos, descontos e variações sucessivas | H3, H4 |
| 21 | `mat-juros-simples` | Juros simples | H3, H5 |
| 22 | `mat-juros-compostos` | Juros compostos | H3, H5 |
| 23 | `mat-inflacao-indices` | Inflação, índices e poder de compra | H4, H5 |
| 24 | `mat-financiamentos` | Parcelas, financiamentos e comparação de propostas | H5, H18 |
| 25 | `mat-revisao-financeira` | Revisão do módulo: porcentagem e finanças | H1–H5 |

### Módulo 5 · Estatística e leitura de dados (7 aulas) · peso alto (~17%, o tema que mais cai)
| # | id | Aula | Habilidades |
|---|---|---|---|
| 26 | `mat-tabelas-graficos` | Tabelas e gráficos | H24, H25 |
| 27 | `mat-graficos-enganosos` | Gráficos que enganam: escala e recorte | H26 |
| 28 | `mat-media` | Média aritmética e média ponderada | H27 |
| 29 | `mat-moda-mediana` | Moda e mediana | H27 |
| 30 | `mat-desvio-variancia` | Desvio, variância e dispersão | H27, H28 |
| 31 | `mat-estatistica-decisao` | Estatística para decidir | H29, H30 |
| 32 | `mat-revisao-estatistica` | Revisão do módulo: estatística | H24–H30 |

### Módulo 6 · Contagem e probabilidade (6 aulas) · peso médio (~7%)
| # | id | Aula | Habilidades |
|---|---|---|---|
| 33 | `mat-principio-contagem` | Princípio fundamental da contagem | H2 |
| 34 | `mat-permutacoes-arranjos` | Permutações e arranjos | H2 |
| 35 | `mat-combinacoes` | Combinações | H2 |
| 36 | `mat-probabilidade` | Probabilidade: casos favoráveis e possíveis | H28 |
| 37 | `mat-probabilidade-condicional` | Eventos sucessivos e probabilidade condicional | H28, H29 |
| 38 | `mat-revisao-probabilidade` | Revisão do módulo: contagem e probabilidade | H2, H28–H30 |

### Módulo 7 · Geometria plana: figuras e ângulos (6 aulas) · peso alto (geometria plana ~14%)
| # | id | Aula | Habilidades |
|---|---|---|---|
| 39 | `mat-angulos-retas` | Ângulos, retas paralelas e perpendiculares | H6, H7 |
| 40 | `mat-triangulos-quadrilateros` | Triângulos e quadriláteros | H7 |
| 41 | `mat-semelhanca-tales` | Semelhança de triângulos e Teorema de Tales | H8 |
| 42 | `mat-pitagoras` | Teorema de Pitágoras e relações métricas | H8, H9 |
| 43 | `mat-simetria` | Simetria, rotação e ladrilhamento | H6, H7 |
| 44 | `mat-revisao-figuras` | Revisão do módulo: figuras planas | H6–H9 |

### Módulo 8 · Geometria plana: perímetros, áreas e trigonometria (6 aulas) · peso alto
| # | id | Aula | Habilidades |
|---|---|---|---|
| 45 | `mat-perimetros` | Perímetros | H8, H12 |
| 46 | `mat-areas-planas` | Áreas de figuras planas | H8, H12 |
| 47 | `mat-circulo` | Círculo e circunferência | H8 |
| 48 | `mat-areas-compostas` | Áreas compostas e efeito da escala nas áreas | H8, H11 |
| 49 | `mat-trigonometria-triangulo` | Trigonometria no triângulo retângulo | H8, H9 |
| 50 | `mat-revisao-areas` | Revisão do módulo: medidas no plano | H8–H12 |

### Módulo 9 · Geometria espacial (7 aulas) · peso alto (~11%)
| # | id | Aula | Habilidades |
|---|---|---|---|
| 51 | `mat-solidos-vistas` | Sólidos, vistas e planificações | H6, H7 |
| 52 | `mat-prismas` | Prismas e cubos: área e volume | H8, H12 |
| 53 | `mat-cilindros` | Cilindros | H8, H12 |
| 54 | `mat-piramides-cones` | Pirâmides e cones | H8 |
| 55 | `mat-esfera` | Esfera | H8 |
| 56 | `mat-capacidade-embalagens` | Capacidade, volume e embalagens | H9, H14 |
| 57 | `mat-revisao-espacial` | Revisão do módulo: geometria espacial | H6–H9, H12 |

### Módulo 10 · Funções (7 aulas) · peso médio
| # | id | Aula | Habilidades |
|---|---|---|---|
| 58 | `mat-plano-cartesiano` | Plano cartesiano e leitura de gráficos | H6, H20 |
| 59 | `mat-ideia-funcao` | A ideia de função | H19, H20 |
| 60 | `mat-funcao-afim` | Função afim | H19, H21 |
| 61 | `mat-funcao-quadratica` | Função quadrática | H21, H22 |
| 62 | `mat-funcao-exponencial` | Função exponencial | H21 |
| 63 | `mat-logaritmos` | Logaritmos | H21, H23 |
| 64 | `mat-revisao-funcoes` | Revisão do módulo: funções | H19–H23 |

### Módulo 11 · Álgebra e sequências (6 aulas) · peso médio
| # | id | Aula | Habilidades |
|---|---|---|---|
| 65 | `mat-equacoes-1grau` | Expressões e equações do 1º grau | H19, H21 |
| 66 | `mat-sistemas` | Sistemas de equações | H21, H22 |
| 67 | `mat-equacoes-2grau` | Equações do 2º grau | H21 |
| 68 | `mat-inequacoes` | Inequações e comparação de planos | H21, H23 |
| 69 | `mat-pa-pg` | Sequências, PA e PG | H2, H15 |
| 70 | `mat-revisao-algebra` | Revisão do módulo: álgebra | H15, H19–H23 |

### Módulo 12 · Trigonometria e geometria analítica (5 aulas) · peso baixo
| # | id | Aula | Habilidades |
|---|---|---|---|
| 71 | `mat-ciclo-trigonometrico` | Ciclo trigonométrico e fenômenos periódicos | H20, H21 |
| 72 | `mat-retas-plano` | Retas no plano cartesiano | H22 |
| 73 | `mat-circunferencia-plano` | Circunferência no plano cartesiano | H22 |
| 74 | `mat-estrategia-prova` | Estratégia de prova: tempo, ordem e TRI na Matemática | H4, H13 |
| 75 | `mat-revisao-final` | Revisão do módulo e do curso | H1–H30 |

**Peso por bloco (aulas sem as revisões):**
- **Estatística, contagem e probabilidade:** 11 aulas (M5 e M6).
- **Geometria:** 21 aulas.
  - plana: 10 (M7 e M8);
  - espacial: 6 (M9);
  - outras 5 (M3).
- **Proporção e porcentagem:** 11 aulas (M2 e M4).
- **Álgebra e funções:** 11 aulas (M10 e M11).
- **Base numérica:** 5 aulas (M1).
- **Trigonometria e analítica:** 3 aulas.
- As 12 revisões completam as 75.

## 5. As outras matérias (nível de módulo)

### Enem · Português (35 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Leitura e gêneros textuais | 6 | H18–H20 | alto (interpretação ~16%) |
| 2 · Funções da linguagem e intenção do texto | 6 | H1–H4, H18 | médio |
| 3 · Variação linguística e norma | 6 | H25–H27 | médio (~10% com gramática) |
| 4 · Gramática a serviço do texto: coesão, coerência, concordância, regência | 6 | H18, H26, H27 | médio |
| 5 · Argumentação e textos persuasivos | 6 | H21–H24 | alto |
| 6 · Mídia, tecnologias e gêneros digitais | 5 | H1–H4, H28–H30 | médio (~9%) |

### Enem · Literatura (20 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · O texto literário: gêneros, recursos e leitura | 5 | H15–H17 | alto |
| 2 · Das origens ao Romantismo | 5 | H15–H17 | médio |
| 3 · Realismo, Naturalismo, Parnasianismo e Simbolismo | 5 | H15–H17 | médio |
| 4 · Modernismo e literatura contemporânea | 5 | H15–H17 | alto (Modernismo é o que mais aparece) |

### Enem · Artes e Educação Física (12 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Artes: linguagens, obras e patrimônio | 6 | H12–H14 | alto (~20% de Linguagens) |
| 2 · Práticas corporais, saúde e sociedade | 6 | H9–H11 | médio-alto (~13%) |

### Enem · Inglês e Enem · Espanhol (8 aulas cada; o aluno escolhe uma)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Estratégias de leitura: cognatos, contexto, gêneros e intenção | 8 (7 + revisão) | H5–H8 | 5 questões por prova |

### Enem · História (25 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Fontes, tempo e o mundo antigo e medieval | 5 | H1–H5, H11 | baixo |
| 2 · Brasil Colônia: terra, trabalho e resistência | 5 | H1, H3, H13, H16, H22 | alto |
| 3 · Mundo moderno: revoluções, independências e capitalismo | 5 | H11–H15, H16–H18 | médio |
| 4 · Brasil Império e Primeira República | 5 | H11–H15, H21–H25 | alto |
| 5 · Século XX: guerras, Vargas, ditadura e democracia | 5 | H11–H15, H21–H25 | alto |

### Enem · Geografia (30 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Cartografia, escala e leitura de mapas | 5 | H6–H8 | médio |
| 2 · Relevo, solos e clima | 5 | H26–H30 | médio-alto |
| 3 · Biomas, água e recursos naturais | 5 | H26–H30 | médio-alto |
| 4 · Questões ambientais e sustentabilidade | 5 | H26–H30 | alto (natureza e ambiente ~16%) |
| 5 · População, cidades e urbanização | 5 | H6–H10, H16–H20 | alto (espaço urbano, agrário e economia ~18%) |
| 6 · Campo, indústria, energia e globalização | 5 | H16–H20 | alto |

### Enem · Filosofia (10 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Da filosofia antiga à medieval: conhecimento, verdade e virtude | 5 | H1, H11–H15 | médio |
| 2 · Moderna e contemporânea: razão, ética, política e ciência | 5 | H11–H15, H21–H25 | médio-alto |

### Enem · Sociologia (10 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Os clássicos e os conceitos: cultura, identidade, trabalho, poder | 5 | H1–H5, H16–H18 | médio |
| 2 · Brasil hoje: desigualdade, movimentos sociais e cidadania | 5 | H21–H25 | médio-alto |

### Enem · Física (22 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Movimento e forças | 6 | H17, H20 | alto (mecânica ~10%) |
| 2 · Energia, fluidos e gravitação | 5 | H17, H20–H23 | médio |
| 3 · Calor e ondas | 5 | H21–H23 | médio (calor ~5%, ondas ~8%) |
| 4 · Óptica, eletricidade e magnetismo | 6 | H5–H7, H21 | médio (eletricidade ~6%) |

### Enem · Química (27 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Matéria, átomos e tabela periódica | 5 | H17, H24 | médio |
| 2 · Ligações, substâncias e funções inorgânicas | 5 | H24, H25 | alto (ácidos e bases) |
| 3 · Quantidades, estequiometria e soluções | 5 | H24–H26 | alto (reações) |
| 4 · Energia, velocidade e equilíbrio (termoquímica, eletroquímica, pH) | 6 | H24–H26 | médio |
| 5 · Química orgânica, polímeros, ambiente e energia | 6 | H8–H12, H24–H27 | alto (orgânica e ambiente) |

### Enem · Biologia (27 aulas)
| Módulo | Aulas | Habilidades | Peso |
|---|---|---|---|
| 1 · Célula, metabolismo e energia | 6 | H13–H16, H28 | médio |
| 2 · Genética e biotecnologia | 6 | H13, H15, H28, H30 | alto |
| 3 · Evolução e diversidade dos seres vivos | 5 | H13–H16, H29 | médio |
| 4 · Corpo humano e saúde | 5 | H14, H29, H30 | alto (saúde e fisiologia) |
| 5 · Ecologia e ambiente | 5 | H8–H12, H28–H30 | alto |

### Enem · Redação (40 oficinas)
| Módulo | Oficinas | Competências | Observação |
|---|---|---|---|
| 1 · A prova e as cinco competências | 7 | I a V | começa sem pressupor nada |
| 2 · Competência I: norma-padrão na prática | 7 | I | |
| 3 · Competência II: tema, tipo de texto e repertório | 7 | II | |
| 4 · Competência III: projeto de texto e argumentação | 7 | III | |
| 5 · Competência IV: coesão e conectivos | 6 | IV | |
| 6 · Competência V: proposta de intervenção e temas | 6 | V | |

As oficinas ensinam por questões e blocos. A correção de texto (seção 5 do `docs/CONTEUDO_CURSINHO.md`) continua em aberto.

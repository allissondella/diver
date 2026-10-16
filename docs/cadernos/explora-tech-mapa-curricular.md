# Mapa curricular: Explora Tech · Fundamentos (Fase 1 de 4)

> **Aprovado em 2026-10-13. Fase 1 completa em 2026-10-16:** as 60 aulas dos 12 módulos, a prova final de 40 questões e os 18 laboratórios (seção 6), inclusive os de prioridade B (Caça ao Número, Banco ao Vivo, Caso do Servidor Sumido, Fábrica de Portas, Sala de Controle, Mini-servidor, Laboratório de Rede, Mini-Masmorra e Arena de Robôs). Falta a revisão humana e a Fila de Validação (só com o OK do admin).
> Só conclusões nossas: nomes de módulos, aulas e laboratórios escritos por nós, organizados pela grade de seis matérias que o usuário passou. Nenhum trecho de terceiro.
> O inventário do que já existe, a curadoria da pasta do Drive e a bibliografia estão no caderno do curso: `docs/cadernos/explora-tech-fundamentos.md`.

## 1. Base e metas

- **Para quem:** quem começa do zero em tecnologia e ainda não sabe que área seguir. A aula 1 não pressupõe nada.
- **Duração:** cerca de 3 meses (12 semanas), de 10 a 15 horas por semana, contando o que o aluno faz fora do Diver (seção 5).
- **Matérias da grade:** Lógica (3 semanas), Python (4), Como o computador funciona (1), Redes e internet (2), Linux e terminal (1), Git e GitHub (1).
  - **Inglês técnico e matemática básica não viram módulo à parte:** entram em todas as aulas (seção 4).
- **Entrega da fase** (o aluno faz fora do Diver): um repositório no GitHub com 3 a 5 scripts em Python. O curso leva até ela: a **calculadora** (aula 29), o **organizador de arquivos** (aula 32, laboratório Organizador de Pasta), o **jogo no terminal** (Mini-Masmorra, Onda 4) e a publicação (aula 59).
- **Meta:** **60 aulas em 12 módulos** (Lógica 15 · Python 20 · Computador 5 · Redes 10 · Linux 5 · Git 5), na proporção das semanas.
  - Cerca de **1.200 questões**, 20 por aula.
  - **1.200 variantes**, uma por questão.
  - Cerca de **160 fichas** da "Revisar a fundo".
  - Blocos para todos os jogos e **11 laboratórios** de prioridade A e B, com cerca de 70 missões.
  - **Prova final de 40 questões.**

## 2. Regras de estrutura (as mesmas do Enem)

- **Curso:** "Explora Tech · Fundamentos", id `explora-tech-fundamentos`.
  - `categoria: "Tecnologia"`, `fasesLivres: true`, `rotuloAula: "Aula"`.
  - Sem `profundidade` nas fases e sem nomes do mar em curso, módulo, aula ou descrição.
- **Módulo** (campo `modulo`): "Módulo 5 · Python: listas e dicionários".
  - Tem 5 aulas; a última é sempre **"Revisão do módulo"**, que mistura questões de todas as aulas do módulo.
- **Aula** (`fases[].nome`): "Aula 22 · Percorrendo listas com for".
  - A numeração é contínua no curso e feita **só** por `node scripts/numerar-aulas.mjs`.
  - O **id não leva número** (`py-percorrer-listas`): dá para reordenar sem perder histórico.
- **Descrição** (gerada pelo script, como no Enem): "Módulo 5 · aula 2 de 5 · 35 min · laboratório: Oficina de Funções".
  - O trecho do laboratório só aparece quando a aula tem um.
- **Modos do app sem mudança de nome:** Mergulho, Simulado, Revisão, "Antes de mergulhar" e "Dica de mergulhador".
- **Prova final:** `{ "questoes": 40, "minutos": 80, "aprovacao": 70, "exigeFases": true }`.
  - **80 min:** questão de ler código pede uns 2 minutos, mais que as de texto curto.
  - **70%:** é o corte dos cursos profissionais (Ciber, Radiologia).
  - **`exigeFases: true`:** a prova vira o "certificado" da Fase 1 e só abre com as 60 aulas feitas.
  - Com `fasesLivres: true`, o aluno faz as aulas na ordem que quiser.
  - Alternativa: `false`, como no Enem, onde a prova é treino. **Recomendo `true`**, porque aqui ela fecha a fase.
- **Laboratório:** cada aula pode apontar para **um** laboratório (campo opcional novo `fases[].laboratorio`, seção 7c). Ele complementa as questões e nunca as substitui.

## 3. A sala "Tecnologia" (pedido do usuário, 2026-10-13)

O pedido da conversa mudou um ponto do `PROMPT_EXPLORA_TECH.md`:

| | Antes (hoje e no prompt) | Depois (proposta) |
|---|---|---|
| Salas do aluno | 4: Enem e Vestibular · Radiologia · **ISO/IEC 27001:2022 Foundation** · **Cibersegurança Essencial** | 3: Enem e Vestibular · Radiologia · **Tecnologia** |
| Sala do curso novo | "Explora Tech" (no prompt) | **Tecnologia**, área "Explora Tech" |
| Dentro da sala Tecnologia | — | Área **"Explora Tech"**: Fundamentos (e, depois, Exploração, Especialização e Portfólio). Área **"Segurança da informação"**: Cibersegurança Essencial e ISO/IEC 27001:2022 Foundation |
| Nome dos cursos dentro da sala | — | Iguais aos de hoje ("Cibersegurança Essencial", "ISO/IEC 27001:2022 Foundation"); o novo aparece como "Explora Tech · Fundamentos" |

Como fica sem ninguém perder nada:

- **Ids e progresso não mudam.** A sala só muda a vitrine (`js/grupos.js`, como as salas de 2026-10-12).
- **Quem só tem o ISO (ou só o Ciber)** vê a sala Tecnologia com o curso dele. Sala com um curso só abre o curso direto, como hoje.
- **Admin, matrícula:** os três cursos são produtos diferentes, então a sala Tecnologia mostra **um quadradinho por curso** dentro dela, além de "sala inteira".
  - Hoje, cada sala é um quadradinho só.
  - A sala inteira grava `pacote:tecnologia`.
- **Marcadores antigos** (`pacote:iso`, `pacote:ciber`) continuam valendo como "só aquele curso".
  - O "Atualizar salas" **não** dá o Explora Tech a quem só tinha o ISO ou o Ciber.
  - Só `pacote:tecnologia` recebe cursos novos da sala.
- **Tutorial:** sobe a versão do roteiro do Início, para todos verem a sala nova uma vez.

## 4. Como cada aula é feita (padrão Georgia adaptado a tecnologia)

- **"Antes de mergulhar" completo:**
  - artigo de 350+ palavras em 3 a 6 seções;
  - mapa mental, associações com emoji e tabela quando ajudam;
  - linha do tempo só quando há história (por exemplo, a da internet na aula 41).
- **Cerca de 20 questões do fácil ao difícil.**
  - Comentário em todas as alternativas e "Dica de mergulhador".
  - Nenhum conceito mais de 3 vezes no material da aula.
  - A 1ª rodada do Mergulho precisa de 10 fáceis e médias.
- **Tipos de questão:**
  - "o que este código imprime?", "qual linha tem o erro?", "qual comando faz isto?";
  - "o que acontece com este pacote?", "qual mensagem de erro aparece?";
  - ordenar passos (`sequencias`), associar comando e efeito (`pares`);
  - verdadeiro ou falso e lacuna em código.
- **Saída de código conferida por execução:** o trecho roda no mesmo Python do curso (seção 7a) e a saída é comparada com o gabarito.
  - É o mesmo papel do "! confere:" das contas do Enem.
  - Leva `revisar`, para o Allisson conferir:
    - comando de terminal e de Git;
    - porta, versão e valor de configuração.
- **Inglês técnico:**
  - Cada aula traz de **3 a 5 termos** em inglês com tradução (tabela no mapa abaixo).
  - Do Módulo 4 em diante, uma **mensagem de erro real** traduzida e explicada.
  - No Módulo 7 em diante, um trecho curto de documentação escrito por nós, no estilo da oficial.
  - Progressão: glossário → mensagem de erro → ler documentação.
- **Matemática básica dentro do código:**
  - porcentagem (aulas 4 e 29);
  - lógica booleana e tabela-verdade (7 e 8);
  - média, mediana e moda (22);
  - binário e potências de 2 (37 e 42);
  - "dividir ao meio" da busca binária (14).
  - Tudo como problema de programa, nunca como aula de matemática.
- **Variantes** (uma por questão nossa), **fichas** (tema com 3+ questões) e blocos `pares`, `verdadeiroFalso`, `sequencias`, `adivinhas`, `palavras`, como nos cursos do Enem.
- **Palavrinha:** conferi 68 palavras de tecnologia de 4 a 8 letras no dicionário brasileiro.
  - Exemplos: lista, função, tabela, pacote, servidor, terminal, código, memória, roteador, byte, binário, máscara, domínio, backup, versão, pilha, vetor, índice.
  - Termos em inglês (script, commit, linux, python, switch) **não** estão no dicionário e não entram na Palavrinha.
  - Eles ficam na Forca e no Adivinha Aí.

## 5. Mapa das 60 aulas

Legenda:
- **Lab** é o laboratório da aula (seção 6): RE Robô Entregador · LC Lupa do Código · CB Caça-Bugs · OF Oficina de Funções · OP Organizador de Pasta · JP Jornada do Pacote · MT Missões no Terminal · LT Linha do Tempo do Código · B = laboratório de prioridade B.
- **Mat** é onde entra a matemática básica.
- Cada aula tem cerca de 35 min no Diver, mais 15 a 25 min de laboratório.

### Lógica de programação (semanas 1 a 3, 15 aulas)

**Módulo 1 · Lógica: pensar como o computador**
| # | id | Aula | Lab | Termos em inglês | Mat |
|---|---|---|---|---|---|
| 1 | `log-o-que-e-algoritmo` | O que é um algoritmo | RE (sequência) | algorithm, step, input, output | |
| 2 | `log-primeiro-programa` | Sequência de comandos e o primeiro programa | RE | run, print, statement, program | |
| 3 | `log-variaveis-tipos` | Variáveis e tipos de dados | LC | variable, string, integer, float | ordem das operações |
| 4 | `log-operadores` | Operadores, porcentagem e arredondamento | OF | operator, round, remainder | porcentagem, resto da divisão |
| 5 | `log-revisao-pensar` | Revisão do módulo | | | |

**Módulo 2 · Lógica: decisões**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 6 | `log-if-else` | Decisões com if, elif e else | RE (condições) | condition, if, else, block | |
| 7 | `log-booleanos` | Verdadeiro ou falso: lógica booleana | LC · B: Fábrica de Portas Lógicas | true, false, and, or, not | tabela-verdade |
| 8 | `log-comparacoes` | Comparações e condições compostas | CB | equal, greater, less, operator precedence | tabela-verdade |
| 9 | `log-entrada-validacao` | Entrada do usuário e validação | OF | input, prompt, ValueError | |
| 10 | `log-revisao-decisoes` | Revisão do módulo | | | |

**Módulo 3 · Lógica: repetição e funções**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 11 | `log-while` | Repetir com while | RE (laços) | loop, while, break, infinite loop | |
| 12 | `log-for-range` | Contar com for e range | LC | for, range, iterate, counter | soma acumulada |
| 13 | `log-funcoes` | Funções: dar nome a um pedaço de código | RE (funções) · OF | function, parameter, return, call | |
| 14 | `log-resolver-problemas` | Resolver problemas: dividir, testar e depurar | CB · B: Caça ao Número | bug, debug, test, edge case | busca binária (metade a cada passo) |
| 15 | `log-revisao-repeticao` | Revisão do módulo | | | |

### Primeira linguagem: Python (semanas 4 a 7, 20 aulas)

**Módulo 4 · Python: primeiros passos**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 16 | `py-instalar-rodar` | Instalar o Python e rodar o primeiro script | "Agora faça de verdade" (Thonny ou VS Code) | interpreter, script, shell, version | |
| 17 | `py-strings` | Textos: fatiar, juntar e formatar | LC | string, slice, method, f-string | |
| 18 | `py-mensagens-erro` | Lendo mensagens de erro | CB | Traceback, SyntaxError, NameError, TypeError | |
| 19 | `py-math-random` | Bibliotecas prontas: math e random | OF | import, module, library, seed | arredondamento, sorteio |
| 20 | `py-revisao-primeiros-passos` | Revisão do módulo | | | |

**Módulo 5 · Python: listas e dicionários**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 21 | `py-listas` | Listas: guardar vários valores | LC (prateleiras) | list, index, append, length | |
| 22 | `py-percorrer-listas` | Percorrendo listas com for | OF | element, iterate over, sum, sort | média, mediana e moda |
| 23 | `py-dicionarios` | Dicionários: chave e valor | LC (armários) | dictionary, key, value, KeyError | contagem de frequência |
| 24 | `py-tuplas-conjuntos` | Tuplas, conjuntos e qual coleção usar | CB | tuple, set, immutable, duplicate | |
| 25 | `py-revisao-colecoes` | Revisão do módulo | | | |

**Módulo 6 · Python: funções de verdade**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 26 | `py-parametros-retorno` | Parâmetros, valores padrão e retorno | OF | argument, default, return value | |
| 27 | `py-escopo` | Escopo: onde cada variável vive | LC (pilha de chamadas) | scope, local, global, call stack | |
| 28 | `py-assert-testes` | Testando funções com assert | OF (testes ocultos) | assert, test case, AssertionError | |
| 29 | `py-projeto-calculadora` | Projeto: a calculadora do terminal (entrega 1) | OF | menu, option, exit, loop | porcentagem, divisão por zero |
| 30 | `py-revisao-funcoes` | Revisão do módulo | | | |

**Módulo 7 · Python: arquivos e dados**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 31 | `py-arquivos-texto` | Ler e escrever arquivos de texto | OP (missão 1) | open, read, write, encoding | |
| 32 | `py-pastas-pathlib` | Pastas e caminhos: pathlib, os e shutil (entrega 2) | OP | path, directory, move, copy | |
| 33 | `py-csv-json` | Dados em CSV e JSON | B: Banco ao Vivo · Caso do Servidor Sumido | CSV, JSON, parse, field | média de uma coluna |
| 34 | `py-try-except` | Tratando erros com try e except | CB | exception, try, except, FileNotFoundError | |
| 35 | `py-revisao-arquivos` | Revisão do módulo | | | |

### Como o computador funciona (semana 8, 5 aulas)

**Módulo 8 · Como o computador funciona**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 36 | `comp-hardware` | Hardware: processador, memória, disco e periféricos | B: Sala de Controle | CPU, RAM, storage, device | unidades (KB, MB, GB) |
| 37 | `comp-bits-binario` | Bits, bytes e binário | B: Fábrica de Portas Lógicas | bit, byte, binary, decimal | base 2, potências de 2 |
| 38 | `comp-sistema-operacional` | Sistema operacional, processos e memória | B: Sala de Controle | operating system, process, kernel, task manager | |
| 39 | `comp-sistema-arquivos` | Sistema de arquivos: como os dados ficam guardados | OP (árvore de arquivos) | file system, folder, extension, path | |
| 40 | `comp-revisao` | Revisão do módulo | | | |

### Redes e internet (semanas 9 e 10, 10 aulas)

**Módulo 9 · Redes: como a internet funciona**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 41 | `rede-cliente-servidor` | Cliente, servidor e a história da internet | JP (missão 1) | client, server, request, response | |
| 42 | `rede-ip-mascara` | Endereço IP, máscara e gateway | JP | IP address, subnet mask, gateway, host | octetos em binário |
| 43 | `rede-dns` | DNS: o catálogo de nomes da internet | JP | domain, DNS, lookup, resolver | |
| 44 | `rede-pacotes-camadas` | Pacotes e camadas (modelo TCP/IP) | JP (Painel de Pacotes) | packet, layer, protocol, header | |
| 45 | `rede-revisao-internet` | Revisão do módulo | | | |

**Módulo 10 · Redes: portas, HTTP e HTTPS**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 46 | `rede-portas-tcp-udp` | Portas, TCP e UDP | JP (aperto de mão) | port, TCP, UDP, handshake | |
| 47 | `rede-http` | HTTP: pedido e resposta | B: Mini-servidor | GET, POST, status code, header | |
| 48 | `rede-https` | HTTPS, certificado e o cadeado | JP (firewall e cadeado) | HTTPS, TLS, certificate, encryption | |
| 49 | `rede-diagnostico` | Diagnóstico: ping, traceroute e nslookup | B: Laboratório de Rede | ping, timeout, hop, latency | tempo médio de resposta |
| 50 | `rede-revisao-portas` | Revisão do módulo | | | |

### Linux e terminal (semana 11, 5 aulas)

**Módulo 11 · Linux e terminal**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 51 | `linux-navegar` | O terminal: pwd, ls e cd | MT | shell, directory, path, home | |
| 52 | `linux-arquivos` | Criar, copiar, mover e apagar | MT | copy, move, remove, recursive | |
| 53 | `linux-ler-procurar` | Ler e procurar: cat, head, tail, grep, wc e o pipe | MT | pipe, output, match, redirect | contagem de linhas |
| 54 | `linux-permissoes-editor` | Permissões e editor de texto | MT (chmod e mini editor) | permission, read, write, execute | números de permissão (4, 2, 1) |
| 55 | `linux-revisao` | Revisão do módulo | | | |

### Git e GitHub (semana 12, 5 aulas)

**Módulo 12 · Git e GitHub**
| # | id | Aula | Lab | Termos | Mat |
|---|---|---|---|---|---|
| 56 | `git-init-add-commit` | Por que versionar: init, add e commit | LT | repository, commit, stage, working tree | |
| 57 | `git-historico-desfazer` | Histórico, status e desfazer | LT | log, status, restore, HEAD | |
| 58 | `git-branch-merge` | Branches, merge e um conflito simples | LT | branch, merge, conflict, switch | |
| 59 | `git-projeto-da-fase` | Projeto da fase: publicar no GitHub (entrega 3) | "Agora faça de verdade" (conta no GitHub, push, README) | remote, push, README, pull request | |
| 60 | `git-revisao-fase` | Revisão do módulo e da fase | | | |

**Soma:** 15 + 20 + 5 + 10 + 5 + 5 = **60 aulas · 12 módulos**, como a meta. Todo módulo tem 5 aulas e fecha com a revisão.

**O que mudou em relação ao prompt:**
- Os módulos da grade foram quebrados em módulos do Diver de exatamente 5 aulas: Lógica em 3, Python em 4, Redes em 2 e os outros em 1.
- A aula "Projeto da fase" é a 59, no último módulo, porque fecha com o `push` no GitHub.
- O Mini-Masmorra (Onda 4) entra como laboratório extra das aulas 29 e 59.

**Ordem e liberdade:** `fasesLivres: true`. Quem já usa Linux pode começar pelo Módulo 11.
- O artigo da aula 16 já ensina a abrir um terminal no próprio sistema, para ninguém depender do Módulo 11 para rodar Python.

## 6. Semana a semana: o que é no Diver e o que é fora

| Semana | No Diver (~4 a 5 h) | Fora do Diver (~6 a 10 h) |
|---|---|---|
| 1 | Aulas 1–5 · Robô Entregador (sequência), Lupa do Código | Instalar o Python e o Thonny (aula 16 explica, mas pode ser já). Bhargava, cap. 1 (leitura indicada). 3 exercícios iniciantes no Beecrowd ou no Exercism |
| 2 | Aulas 6–10 · Robô (condições), Caça-Bugs | Pense em Python (grátis), capítulos de condicionais. Curso em Vídeo, aulas de condições |
| 3 | Aulas 11–15 · Robô (laços e funções), Caça ao Número (B) | Bhargava, capítulo de busca binária. 5 exercícios de laço no Beecrowd |
| 4 | Aulas 16–20 · Lupa, Caça-Bugs | Menezes, capítulos iniciais. Ler uma página do tutorial oficial do Python (docs.python.org) com o glossário da aula |
| 5 | Aulas 21–25 · Lupa, Oficina | Menezes, listas e dicionários. 5 exercícios do Exercism (trilha Python) |
| 6 | Aulas 26–30 · Oficina, **calculadora** | Escrever a calculadora no próprio computador e guardar numa pasta (vira o 1º script da entrega) |
| 7 | Aulas 31–35 · **Organizador de Pasta** | Automate the Boring Stuff (grátis, em inglês), capítulos de arquivos. Rodar o organizador numa pasta de teste de verdade |
| 8 | Aulas 36–40 · Fábrica de Portas, Sala de Controle (B) | Petzold, capítulos sobre binário (leitura indicada). Abrir o gerenciador de tarefas e achar os processos |
| 9 | Aulas 41–45 · **Jornada do Pacote** | Kurose e Ross, capítulo 1. Instalar o Wireshark e só olhar uma captura do próprio computador |
| 10 | Aulas 46–50 · Jornada, Mini-servidor e Laboratório de Rede (B) | Cisco Networking Academy (curso introdutório grátis) ou o livro aberto Computer Networks: A Systems Approach |
| 11 | Aulas 51–55 · **Missões no Terminal** | Ubuntu no VirtualBox ou WSL no Windows. The Linux Command Line (grátis). OverTheWire Bandit, primeiros níveis |
| 12 | Aulas 56–60 · **Linha do Tempo do Código** · prova final | Pro Git (grátis, em português). Criar a conta no GitHub, publicar os scripts (entrega da fase). Learn Git Branching |

- **No Diver:** cerca de 5 aulas × (35 + 20 min) ≈ 4,5 h por semana. Somando o que é feito fora, a semana fica entre 10 e 15 h.
- **Ordem dentro da semana:** a grade não exige uma ordem certa; o Cronograma de estudos pode ganhar esta trilha depois (fora do escopo agora).

## 7. Laboratórios ("Mão na massa")

**Pontuação (todos):**
- **1 estrela** = passou nos testes; **2** = passou sem usar a dica de nível 3; **3** = passou também no critério de qualidade do laboratório (poucas linhas, poucos passos, poucas portas).
- **XP e pérolas** por missão, pagos **só pela diferença para o melhor resultado anterior**, para ninguém "farmar" repetindo:
  - 1★ = 10 XP e 1 pérola;
  - 2★ = 20 XP e 2 pérolas;
  - 3★ = 30 XP e 3 pérolas.
- **Teto:** o de hoje, 60 XP e 15 pérolas por partida (`Economia.CONFIG.bonusMaximo`).
- **Contrato:** cada laboratório devolve o **Resultado padrão**:
  - `acertos` = missões concluídas, `total` = missões tentadas;
  - `bonus` = o valor acima;
  - `registro: { laboratorio, missao, estrelas, testes }` para o log.
- **Esforço:** P (até 2 dias), M (3 a 5 dias), G (1 a 2 semanas).

| Laboratório | Aula(s) | Prio. | Esforço | Especificação curta | O que o aluno vê | Reaproveita |
|---|---|---|---|---|---|---|
| **Robô Entregador** | 1, 2, 6, 11, 13 | A | G (1º, monta o executor) | 15 missões em 5 grupos: sequência, laços, condições, variáveis, funções. API `andar()`, `virar_esquerda()`, `virar_direita()`, `pegar()`, `soltar()`, `parede_a_frente()`, `caixa_aqui()`. Grade de até 8×8, gerada do JSON da missão | Robô andando na grade, linha em execução acesa, energia gasta. 3★ = linhas ≤ meta e passos ≤ meta | Executor de Python, editor, console |
| **Lupa do Código** | 3, 7, 12, 17, 21, 23, 27 | A | M | Roda um trecho linha a linha (rastreio pelo `sys.settrace` do Python). Modo jogo: antes de cada linha, o aluno **prevê** o valor de uma variável (escolha ou digita) | Variáveis como caixas com tipo e cor, listas como prateleiras, dicionários como armários, pilha de chamadas, saída. Acertos de previsão viram estrelas | Executor, visualizador de variáveis |
| **Caça-Bugs** | 8, 14, 18, 24, 34 | A | M | 20 scripts com 1 a 3 defeitos: sintaxe, lógica, erro por um, comparação trocada, `return` esquecido | Barra de testes vermelha → verde; mensagem de erro original em inglês ao lado da tradução e da explicação | Executor, editor, testes |
| **Oficina de Funções** | 4, 9, 13, 19, 22, 26, 28, 29 | A | M | 20 funções que passam em testes: porcentagem, média, mediana, moda, contar palavras, validar CPF de mentira, calculadora | Testes visíveis; os ocultos (casos de borda) aparecem depois de passar | Executor, editor, testes |
| **Organizador de Pasta** | 31, 32, 39 | A | M | Pasta virtual com 40 arquivos bagunçados; o script (`os`, `pathlib`, `shutil`) arruma por tipo e data. Testes: nada se perde, tudo vai para a pasta certa | Árvore antes e depois, lado a lado; botão "refazer a bagunça" | Executor, sistema de arquivos virtual, árvore de arquivos |
| **Jornada do Pacote** | 41–44, 46, 48 | A | G | 10 missões: perguntar o IP ao DNS, conferir IP, máscara e gateway, escolher a porta, montar a rota, aperto de mão do TCP, regras de firewall, HTTPS | Mapa animado notebook → roteador → provedor → servidor. O Painel de Pacotes lista cada salto. Erro: pacote perdido, bloqueado ou descartado, com o porquê | Painel de Pacotes, motor de rede simulado |
| **Missões no Terminal** | 51–54 | A | G | 15 missões numa história ("achar o arquivo com a pista"): `ls`, `cd`, `pwd`, `cat`, `mkdir`, `touch`, `cp`, `mv`, `rm`, `grep`, `head`, `tail`, `wc`, `>`, `>>`, `|`, `chmod`; mini editor de texto simulado | Árvore de arquivos viva; permissões como caixinhas r, w e x que mudam com `chmod` | Terminal simulado, sistema de arquivos virtual, árvore |
| **Linha do Tempo do Código** | 56–58 | A | G | 12 missões: `init`, `add`, `commit`, `status`, `log`, `branch`, `switch`, `merge`, `restore`; um conflito simples para resolver no mini editor | Três colunas (pasta de trabalho, preparo, repositório) e o grafo de commits crescendo, com branches coloridos e o HEAD | Terminal simulado (plugin Git), sistema de arquivos virtual, grafo de commits |
| Mini-servidor | 47 | B | M | O aluno escreve `responder(metodo, caminho, corpo)` → `(status, corpo)`; um navegador simulado faz 4 missões: página inicial, 404, lista JSON, POST | Pedido e resposta no Painel de Pacotes e a página renderizada (como texto, sem HTML do aluno) | Executor, Painel de Pacotes |
| Banco ao Vivo | 33 | B | M | Grava, lê e altera registros com listas, dicionários, CSV e JSON e um auxiliar de banco (`sqlite3` do próprio Python) | Tabela viva: linha nova pisca; um log mostra a operação e o SQL gerado, só para olhar | Executor (`sqlite3`), tabela viva |
| Laboratório de Rede | 49 | B | G | Monta computador, switch, roteador e servidor; configura IPs; `ping`, `traceroute`, `nslookup` simulados. Missão: "A não alcança o servidor: conserte" | Cabos, pacotes animados e o Painel de Pacotes | Motor de rede, terminal (plugin rede) |
| Fábrica de Portas Lógicas | 7, 37 | B | M | Liga AND, OR, NOT e XOR para cumprir uma tabela-verdade: lâmpada de dois interruptores, meio somador, somador de 4 bits | Fios acesos; binário e decimal lado a lado; 3★ = poucas portas | Só JavaScript (sem Python) |
| Sala de Controle | 36, 38 | B | M | Máquina simulada: abrir programas, encerrar processo travado, liberar memória, achar o arquivo que enche o disco | RAM, CPU, processos e árvore reagindo | Sistema de arquivos virtual, árvore, terminal (`ps`, `kill`, `du`) |
| Caça ao Número | 14 | B | P | Achar um número de 1 a 1000 com poucos palpites; depois escrever a busca binária | Contador de passos e gráfico passos × tamanho da lista (linear contra binária) | Executor |
| O Caso do Servidor Sumido (Python) | 33 | B | M | Cruza CSV e JSON (funcionários, crachás, câmeras, chamados) com laços e dicionários; cada pista libera a próxima; digita o culpado | Os dados filtrados e as pistas se encadeando | Executor, sistema de arquivos virtual |
| Mini-Masmorra | 29, 59 (projeto) | B | G | Jogo de aventura em texto, guiado: salas num dicionário, inventário numa lista, funções, salvar e carregar em JSON | O jogo roda no console; no fim, "copiar o código" para o repositório do aluno (entrega 3) | Executor, `input()`, sistema de arquivos virtual |
| Arena de Robôs | fechamento | B | G | `decidir(situacao)` → `"andar"`, `"atacar"` ou `"defender"`, contra 5 robôs nossos (do mais bobo ao chefe), semente fixa | Replay da luta quadro a quadro; recorde pessoal | Executor; ranking só com OK (7g) |

**Dependências:**
- A infraestrutura de Python (executor, editor, console e testes) vem antes de tudo o que roda Python.
- O sistema de arquivos virtual serve ao Organizador, ao terminal, ao Git e à Sala de Controle.
- O terminal simulado vem antes de Missões no Terminal, Linha do Tempo e Laboratório de Rede.
- O Painel de Pacotes vem antes de Jornada, Mini-servidor e Laboratório de Rede.

**Cada laboratório tem:**
- tutorial de primeiro acesso (`Tutorial.guiar`);
- dica em 3 níveis (direção → trecho → quase a resposta);
- botão "Agora faça de verdade", com mini passo a passo na ferramenta real;
- mascote que reage, sem culpa.

## 8. Decisões técnicas (opções, custo e recomendação). Nada disso foi feito.

### 8a. Motor de Python
Versão atual do Python, conferida em 2026-10-13:
- **3.14.7** (python.org, 05/08/2026).
- O **Pyodide 314** (lançado em 09/06/2026; versão estável 314.0.7 no npm) traz **Python 3.14** e devolveu o `sqlite3` à biblioteca padrão.
- **Vamos ensinar Python 3.14**, sem usar nada que só exista nela.
- O curso funciona igual do 3.10 em diante, então o aluno pode ter um Python um pouco mais velho no computador.

| Opção | Peso | Fidelidade | `sqlite3` e arquivos | Manutenção |
|---|---|---|---|---|
| **Pyodide 314.0.7** (MPL-2.0) | 13,4 MB no repositório; **~6,3 MB baixados** com compressão (o wasm tem 9,6 MB e 3,6 MB comprimido; a biblioteca padrão tem 2,5 MB) | Python real (CPython 3.14): mensagens de erro iguais às do computador | `sqlite3`, `pathlib`, `shutil`, `csv`, `json` e sistema de arquivos virtual (MEMFS) | Atualizar = trocar uma pasta; bem mantido |
| Brython (BSD) | ~1 MB | Boa, mas é outro motor: mensagens de erro e detalhes diferentes | Sem `sqlite3`; arquivos limitados | Ativo |
| MicroPython no navegador (MIT) | ~0,3 a 1 MB | Subconjunto: sem `pathlib` completo, `csv` nem `sqlite3` | Fraco | Ativo |
| Skulpt (MIT/PSF) | ~1 MB | Subconjunto antigo do Python 3 | Não | Pouco ativo |

**Recomendação: Pyodide**, dentro do repositório em `lib/pyodide/` (como o pdf.js), só com os arquivos do núcleo (sem mapas nem exemplos):
- **Só sob demanda:** carrega quando o aluno abre um laboratório de Python, com barra de "preparando o laboratório" e mascote.
  - Depois, o navegador guarda em cache.
  - Quem nunca abre um laboratório não baixa nada.
- **No celular:** o "modo toque" (completar lacunas e escolher) **não baixa o Pyodide**.
  - As respostas são calculadas antes, pelo script de conferência, e guardadas no JSON do laboratório.
  - Assim o celular não gasta 6 MB de dados.
  - Fica o aviso: "o modo completo é melhor no computador".
- **Hospedagem:**
  - o maior arquivo (9,6 MB) cabe no limite de 25 MiB por arquivo do Cloudflare e no de 100 MB do GitHub;
  - os dois servem `.wasm` com o tipo certo.
- **`input()`:** vira uma linha de entrada dentro do console do laboratório.
  - O jeito "de verdade" (o programa para e espera) precisa de `SharedArrayBuffer`.
  - Isso exige cabeçalhos especiais (COOP e COEP) que o **GitHub Pages não deixa configurar**.
  - **Recomendo o "replay"**, que funciona em qualquer navegador e hospedeiro:
    - quando o programa pede uma entrada que ainda não existe, ele para;
    - o console mostra a linha de entrada;
    - o programa roda de novo do começo com as respostas já dadas e mostra só o que é novo;
    - sorteios usam semente fixa, então o resultado é o mesmo.
  - Se um dia a produção for para o Cloudflare (roadmap D106), dá para ligar o modo "de verdade" com os cabeçalhos.
- **Tempo limite:** o código roda num Web Worker.
  - Passou de 5 s (ajustável por missão), o Worker é encerrado e o laboratório mostra "laço infinito?", com explicação.
  - O Worker seguinte reabre rápido, porque o Pyodide já está em cache.
- **Conferência local** (`conferir-trilha` e `conferir-laboratorios`): roda **o mesmo Pyodide no Node**.
  - O pacote npm `pyodide` funciona no Node, então a saída conferida é a mesma que o aluno vê.
  - O `python3` desta máquina é 3.11, e o `uv` pode instalar o 3.14 como segunda opção.

### 8b. Isolamento do código do aluno

| Opção | Protege a sessão, o progresso e o Supabase? | Custo |
|---|---|---|
| (a) Web Worker simples | Em parte: o Worker não acessa o `localStorage` nem a página, mas tem a mesma origem (pode chamar `fetch` para o Supabase com cookies ou, se achar, a chave) | Baixo |
| **(b) iframe `sandbox="allow-scripts"` (sem `allow-same-origin`) + Worker dentro, falando por `postMessage`** | **Sim**: origem opaca, sem acesso ao `localStorage`, aos cookies nem ao token de login; só troca mensagens combinadas | Médio (~1 dia a mais); funciona igual no GitHub Pages e no Cloudflare |
| (c) Cabeçalhos de isolamento (COOP/COEP, CSP) | Melhor ainda, mas o GitHub Pages não deixa configurar | Só depois de mudar de hospedagem |

**Recomendação: (b).**
- A página `laboratorio/sandbox.html` (dentro do repositório) roda o Worker com o Pyodide.
- O app manda código e entradas e recebe saída, erros, rastreio e resultado dos testes.
- Além disso, o Pyodide do laboratório **não carrega pacotes da internet** (`micropip` desligado), e o `js` do Python fica bloqueado no sandbox.
- Nenhum laboratório faz requisição de rede real.

### 8c. Como representar um laboratório
- **Dados:** `data/laboratorios/explora-tech-fundamentos/<id>.json`. Cada missão tem:
  - `enunciado`, `codigoInicial`, `solucao` (referência), `testes` (visíveis e `ocultos`);
  - `dicas` (3 níveis), `metas` (linhas, passos), `modoToque` (lacunas com opções e respostas já calculadas);
  - `arquivos` (pasta virtual inicial).
- **Ligação com a aula:** campo opcional novo `fases[].laboratorio: "<id>"` (ou lista).
  - No mapa da aula aparece "Mão na massa" ao lado de "Antes de mergulhar".
  - Na Sala de Jogos do curso, um grupo novo "Laboratórios" aparece só em curso com laboratórios.
- **Catálogo leve:** `catalogo.json` ganha só a lista de laboratórios do curso (id, nome, aulas). O JSON do laboratório baixa ao abrir.
- **Código:**
  - `js/laboratorio/` com executor, editor, console, terminal e visualizadores;
  - cada laboratório é um arquivo em `js/jogos/` registrado com `requer: 'laboratorios'`, como manda o `/novo-jogo`.
- **Formato compacto:** o `montar-aulas.mjs` ganha:
  - o bloco de código (cercas ```` ``` ```` dentro do enunciado e do artigo);
  - a linha `lab: <id>` na aula;
  - `! saida:` (o script roda o trecho e compara com a alternativa certa).
  - O `numerar-aulas.mjs` passa a escrever "laboratório: <nome>" na descrição quando a aula tiver um.
- **Conferência:** `scripts/conferir-laboratorios.mjs`:
  - a solução passa em todos os testes;
  - o código inicial falha em pelo menos um;
  - 3 execuções seguidas dão o mesmo resultado (determinístico);
  - as respostas do modo toque batem com a solução;
  - nenhuma missão passa do tempo limite.

### 8d. Bloco de código nas questões e nos artigos
- **Hoje o app não tem bloco de código.** O artigo só entende `**negrito**`, e a questão é só texto. O único `<code>` é a senha temporária do Admin.
- **Proposta (opcional e seguro, sempre por `textContent`):**
  - questão com campo novo `codigo` (texto), mostrado em `<pre><code>` monoespaçado abaixo do enunciado, sem quebrar o recuo, com rolagem horizontal só no bloco;
  - `alternativasCodigo: true` deixa as alternativas monoespaçadas;
  - no artigo, um parágrafo que começa com ```` ``` ```` vira bloco de código.
  - Cor só por tokens (fundo `--fundo-fundo`, texto `--texto`, fonte `--fonte-mono`).
  - Sem biblioteca de destaque de sintaxe; um destaque mínimo próprio (palavra-chave, texto, comentário) é opcional.
- **O que muda no `quiz.js`:** só o desenho, quando a questão tiver `codigo`.
  - Sem o campo, nada muda: ordem, rampa, oxigênio, pontos e revisão ficam iguais.
  - Os jogos derivados que mostram enunciado (Quiz Relâmpago, Chefão, Maré Alta, Caça ao Tesouro, Cartas do Fundo) usam o mesmo componente.
  - Memória, Forca, Adivinha Aí e Palavrinha usam só os blocos próprios.
  - **Preciso do seu OK, porque toca no motor das perguntas.**
- **Editor do laboratório:** próprio, leve (~300 linhas).
  - `textarea` com numeração de linhas, Tab = 4 espaços, recuo automático depois de `:`, Shift+Tab para tirar o recuo.
  - Destaque mínimo numa camada `<pre>` por baixo.
  - Atalhos: Ctrl+Enter roda, Esc sai do editor (para o foco não ficar preso).
  - **No celular:** "modo toque", com lacunas em botões grandes (44 px) e escolhas.

### 8e. Terminal simulado e Painel de Pacotes
**Recomendação: um motor de terminal com plugins, e o Painel de Pacotes como componente separado.**
- O terminal (`js/laboratorio/terminal.js`) tem:
  - linha de comando, histórico, setas, Tab e Ctrl+L;
  - saída anunciada com `aria-live`;
  - sistema de arquivos virtual compartilhado (o mesmo da árvore de arquivos e do Python).
- **Plugins:**
  - `linux` (comandos de arquivo, `grep`, `wc`, redirecionamento, `chmod`, `ps`, `kill`, `du`);
  - `git` (modelo próprio em JavaScript: objetos, índice, branches, HEAD; sem Git de verdade);
  - `rede` (`ping`, `traceroute`, `nslookup` sobre uma rede simulada).
- **Painel de Pacotes:** uma lista de pacotes simulados (protocolo, origem, destino, camadas que abrem).
  - Servem ao mesmo painel a Jornada, o Mini-servidor e o Laboratório de Rede.
  - Também deixa o gancho para a Captura da Bandeira local (Fase 2).
- **Vários motores sairia mais caro.** Os três usos precisam das mesmas peças: entrada, histórico, arquivos e acessibilidade.

### 8f. Persistência e privacidade
- **Sobe para a nuvem** (no progresso da trilha, que já é sincronizado): por laboratório e missão, só `estrelas`, `testes` passados e `concluidoEm`.
- **Fica só no navegador:** o último rascunho de código de cada missão.
  - Chave fora do prefixo sincronizado: `diver-local:v1:lab:<id>:<missao>`, e não `diver:v1:`, para não subir.
  - Sempre em try/catch; sem armazenamento, o laboratório funciona e só não lembra o rascunho.
- **Log:** evento `laboratorio` no `eventos_atividade` (missão, estrelas, tempo), **sem o código do aluno**.
- Nenhum dado de aluno no repositório.

### 8g. Ranking da Arena
- **Recomendação:** começar só com o **recorde pessoal**, que não precisa de banco.
- Se você quiser ranking, ele é derivado do log com uma função nova `ranking_arena` (no molde da `ranking_caso`).
  - Roda primeiro no Supabase de testes, só com o seu OK.
  - Decidimos na Onda 4.

## 9. Validação em escala (Mergulho Triplo)

- **Conta:** rodei `node scripts/fila.mjs simular` num curso de 200 questões (Enem · Filosofia).
  - Deu **US$ 0,744 por lote de 20 questões** (US$ 0,037 por questão), com 30% de folga para o desempate.
  - Questões com código têm texto um pouco maior: estimo **até 20% a mais**.
- **Explora Tech · Fundamentos (estimativa):**
  - **questões:** 60 lotes ≈ **US$ 45 a 54**;
  - **variantes:** 60 lotes ≈ **US$ 45 a 54**;
  - **total:** ≈ **US$ 90 a 108**.
- **Economia possível:** questão de "o que imprime" já é conferida por execução no nosso script.
  - Dá para pular a camada de fato (Gemini) nelas e manter só a de lógica.
  - Isso economiza cerca de 30% nesses lotes. Proposta para decidir na Onda 1.
- **Aprovação:** uma onda por vez, com o "Aprovar onda" (`--onda ET1`, uma senha e um teto em US$ para todos os lotes da onda). Nenhuma IA paga roda sem a sua aprovação na tela.

| Onda | Lotes (questões + variantes) | Teto sugerido |
|---|---|---|
| ET0 (Módulo 1, piloto) | 5 + 5 | US$ 9 |
| ET1 (Módulos 2 a 7) | 30 + 30 | US$ 54 |
| ET2 (Módulos 8 a 10) | 15 + 15 | US$ 27 |
| ET3 (Módulos 11 e 12) | 10 + 10 | US$ 18 |

## 10. Ondas (cada uma termina publicável e útil sozinha)

| Onda | O que entra | Tamanho |
|---|---|---|
| **0 · Infraestrutura + piloto** | Sala **Tecnologia** (seção 3, com o Admin por curso); bloco de código (8d); Pyodide em `lib/pyodide/` + sandbox + executor + editor + console + testes (8a, 8b); `conferir-laboratorios.mjs`; formato `.aula` com código; **Módulo 1 (aulas 1–5)** completo; **Robô Entregador** com as missões de sequência, de ponta a ponta (PC e celular) | 5 aulas · 100 questões · 1 laboratório · +13,4 MB no repositório (0 para quem não abre laboratório) |
| **1 · Lógica e Python** | Módulos 2 a 7 (aulas 6–35); Robô (laços, condições, funções); **Lupa do Código**, **Caça-Bugs**, **Oficina de Funções**, **Organizador de Pasta** (sistema de arquivos virtual e árvore) | 30 aulas · 600 questões · 4 laboratórios |
| **2 · Computador e Redes** | Módulos 8 a 10 (aulas 36–50); **Jornada do Pacote** + Painel de Pacotes; depois os B: Fábrica de Portas, Sala de Controle, Mini-servidor, Laboratório de Rede | 15 aulas · 300 questões · 1 A + 4 B |
| **3 · Linux e Git** | Módulos 11 e 12 (aulas 51–60); terminal simulado; **Missões no Terminal**; **Linha do Tempo do Código** | 10 aulas · 200 questões · 2 laboratórios |
| **4 · Projeto da fase** | **Mini-Masmorra**, **Caso do Servidor Sumido (Python)**, **Arena de Robôs**; Banco ao Vivo e Caça ao Número; prova final de 40; caderno e fechamento da fase | 5 laboratórios · prova |

**Ordem dentro de cada onda:**
1. `validar-fontes` do que for novo;
2. `criar-trilha`, um módulo por vez;
3. `conferir-trilha` e `conferir-laboratorios` sem erro;
4. `fila.mjs simular`;
5. PR com prévia no ambiente de testes;
6. "pronto para produção" com o resumo; o merge é seu.

## 11. Gancho para as Fases 2, 3 e 4 (não fazer agora)
- **Cursos:** `explora-tech-exploracao`, `explora-tech-especializacao` e `explora-tech-portfolio`.
  - Entram sozinhos na área "Explora Tech" da sala Tecnologia (`pertence: /^explora-tech-/`).
  - Quem tem `pacote:tecnologia` recebe pelo "Atualizar salas".
- **Reaproveitam a infraestrutura:**
  - **Detetive SQL** (o mesmo Caso do Servidor Sumido, com `sqlite3` do Pyodide);
  - **Captura da Bandeira local** (Painel de Pacotes e página de login falsa, tudo simulado);
  - **Loja Tycoon por API** (navegador simulado do Mini-servidor);
  - **Masmorra em Rede** (sockets de mentira sobre o motor de rede).
  - Nenhum tem multiplayer.

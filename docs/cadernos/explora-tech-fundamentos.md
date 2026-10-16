# Caderno do curso: Explora Tech · Fundamentos

> Trilha: `data/trilhas/explora-tech-fundamentos.json` · Plano: `docs/cadernos/explora-tech-mapa-curricular.md` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md`
> **Plano aprovado em 2026-10-13 ("ok manda bala"). Fase 1 completa em 2026-10-16:** 60 aulas em 12 módulos, 1.201 questões, 1.201 variantes, 243 fichas, prova final de 40 e 18 laboratórios "Mão na massa" com 181 missões. Falta a revisão humana (Allisson) e a Fila de Validação (só com o OK do admin).

## Público e objetivo
- **Quem estuda:** quem começa do zero em tecnologia e ainda não sabe que área seguir. Jovens e adultos, sem nada infantil.
- **Objetivo:** a Fase 1 (Fundamentos) do Explora Tech. São seis matérias que aparecem em todas as áreas de tecnologia: lógica, Python, como o computador funciona, redes, Linux e Git.
- **Duração:** 12 semanas, de 10 a 15 h por semana, contando o estudo fora do Diver.
- **Entrega do aluno:** um repositório no GitHub com 3 a 5 scripts em Python.
- **Diferencial:** os **laboratórios "Mão na massa"**. O aluno escreve código e vê algo acontecer, simulado no navegador e sem rede real.

## Seu gosto (preferências do usuário)
- 2026-10-13 · O mapa fica com o desenho de sempre (nada de passos numerados). Depois das questões, a tarefa prática; depois dela, a próxima aula. Comandos sempre à vista no laboratório. No Módulo 1, toda aula tem a sua tarefa, para o aluno pegar o jeito.
- 2026-10-13 · Curso "Explora Tech", só a Fase 1 agora; trabalhar em ondas, com plano antes do código.
- 2026-10-13 · **Sala "Tecnologia"** com o Explora Tech, o ISO/IEC 27001 e a Cibersegurança (pedido da conversa; o prompt falava em sala "Explora Tech").
- 2026-10-13 · Nada de nomes do mar em curso, módulo, aula ou descrição; módulo e aula sempre numerados.
- 2026-10-13 · Sem multiplayer nos laboratórios; adversário é robô nosso.
- 2026-10-13 · Livros e cursos são **leitura recomendada** ("Para ir além"); o Diver é todo autoral.

## Decisões
- 2026-10-13 · Aprovado: 60 aulas em 12 módulos de 5 aulas, prova de 40 questões (80 min, 70%, `exigeFases: true`), Pyodide no sandbox, replay no `input()`, "modo toque" sem Pyodide no celular. Detalhes no mapa.
- 2026-10-13 · Questões com 4 alternativas (A a D), como é comum em tecnologia; os cursos do Enem seguem com 5.
- 2026-10-13 · Toda questão de código traz "! saida", "! erro" ou "! confere-py" no `.aula`: o `montar-aulas.mjs` roda no Pyodide e só grava se bater.
- 2026-10-13 · O worker do sandbox nasce de um endereço `data:` (de blob ele não abre numa origem opaca); sem CORS, cai para o worker comum trancado.

## 1. Inventário: o que já existe no Diver e serve

| Peça | Onde está | Serve para o Explora Tech? |
|---|---|---|
| Salas | `js/grupos.js` (`LISTA`, `pertence`, áreas, "Comece por aqui") | **Sim**: criar a sala Tecnologia com duas áreas e tirar as salas ISO e Ciber |
| Matrícula por sala | `js/admin.js` (`checksCursos`, `pacote:<sala>`, "Atualizar salas") | **Em parte**: hoje é um quadradinho por sala; precisa de um por curso dentro da sala Tecnologia (mapa, seção 3) |
| Campos de aula | `modulo`, `habilidades`, `minutos`, `rotuloAula`, `novaEm`, `fasesLivres` | **Sim**, iguais aos do Enem (`habilidades` fica vazio ou recebe códigos nossos por matéria) |
| Numeração e montagem | `scripts/numerar-aulas.mjs`, `scripts/montar-aulas.mjs` (formato `.aula`, `! confere:`) | **Sim**, com 3 acréscimos: bloco de código, `lab:` e `! saida:` |
| Catálogo leve | `data/trilhas/catalogo.json` (`gerar-catalogo.mjs`); o curso baixa ao entrar | **Sim**, com a lista de laboratórios do curso |
| Conferência | `scripts/conferir-trilha.mjs` (comentários, repetição, 10 fáceis e médias) | **Sim** |
| Artigo da fase | `js/artigo.js` (seções, mapa mental, associações, linha do tempo, mapa) | **Sim**; falta o bloco de código |
| Questões no app | `js/quiz.js`, `js/jogos/comum.js` | **Sim**; **não mostram código** (só texto); proposta 8d do mapa |
| Blocos de jogo | `pares`, `verdadeiroFalso`, `sequencias`, `adivinhas`, `palavras` (`docs/JOGOS.md`) | **Sim** |
| Palavrinha | dicionário brasileiro `data/dicionario/` | **Sim**: 68 palavras de tecnologia de 4 a 8 letras conferidas no dicionário |
| Contrato de jogo | `js/jogos/registro.js` (`Jogos.registrar`, `requer`, Resultado padrão) | **Sim**: cada laboratório é um jogo com `requer: 'laboratorios'` |
| Economia | `js/economia.js` (`bonusMaximo` 60 XP e 15 pérolas, recompensa por dificuldade) | **Sim**, sem mudar valores |
| Tutorial | `js/tutorial.js` (`Tutorial.guiar`, `ROTEIROS`, `VERSOES`) | **Sim** (um roteiro por laboratório) |
| Mascote e caixas | `UI.confirmar`, `UI.perguntar`, `UI.humorMascote` | **Sim** (erro sem culpa, mascote reage) |
| Log de atividade | `js/atividade.js`, `eventos_atividade` | **Sim** (evento `laboratorio`, sem o código do aluno) |
| Jogo com tutorial e mural | `js/jogos/caso-resolvido.js` | Modelo de jogo grande, de ponta a ponta |
| Biblioteca local | `lib/pdfjs/` (carregada só quando precisa) | Modelo para `lib/pyodide/` |
| Fonte monoespaçada | token `--fonte-mono` em `css/estilo.css` | **Sim** (bloco de código e terminal) |

**O que falta (tudo proposto no mapa, seção 8):**
- bloco de código nas questões e nos artigos;
- executor de Python (Pyodide) com sandbox;
- editor e console;
- terminal simulado;
- sistema de arquivos virtual;
- visualizadores: caixas de variáveis, árvore de arquivos, grafo de commits, Painel de Pacotes, tabela viva;
- formato e conferência dos laboratórios;
- quadradinho por curso na matrícula da sala Tecnologia.

## 2. Curadoria da pasta de referências do Drive (2026-10-13)

Garimpo e limpeza (`garimpo` e `validar-fontes`). Li **só os nomes e os dados dos arquivos**: nada foi baixado, aberto ou copiado, e nada no Drive foi mexido.

| Arquivo (como está no Drive) | Tamanho | Classificação | Resultado |
|---|---|---|---|
| "Introdução à programação com Python- algoritmos e lógica de -- Nilo Ney Coutinho Menezes -- ( WeLib.org ).pdf" | 2,1 MB | Não identificado (origem duvidosa: marca WeLib) | **Reprovada · não usar** |
| "Guia Foca Linux - Iniciante + Intermediário -- Gleydson Mazioli da Silva -- ( WeLib.org ).pdf" | 3,7 MB | Não identificado (cópia WeLib de obra de licença livre) | **Reprovada · não usar esta cópia** |
| "Code -- Petzold Charles -- ( WeLib.org ).pdf" | 10,2 MB | Não identificado (origem duvidosa) | **Reprovada · não usar** |
| "Entendendo Algoritmos- Um guia ilustrado para programadores -- Aditya Y. Bhargava -- ( WeLib.org ).pdf" | 12,5 MB | Não identificado (origem duvidosa) | **Reprovada · não usar** |
| "Pro Git -- Chacon Scott & Ben Straub -- ( WeLib.org ).pdf" | 8,1 MB | Não identificado (cópia WeLib de obra de licença livre) | **Reprovada · não usar esta cópia** |
| "Diver: Documentação completa (visão gerencial e técnica)" (Google Docs, do usuário) | 35 KB | Material nosso, fora do tema do curso | Não é fonte do curso; fica onde está |

**O que isso quer dizer:**
- Os cinco PDFs carregam a marca "( WeLib.org )". É o mesmo caso dos PDFs WeLib de 2026-10-09, que já estão em `docs/FONTES_CATALOGADAS.md` como **"Não usar"**.
- Livros comerciais com "todos os direitos reservados", baixados de um site de terceiros sem autorização da editora, não entram.
- Até você liberar por escrito (num parecer), os cinco servem **só como bibliografia**: título, autor, editora e edição.
- **Foca Linux e Pro Git têm licença livre na fonte oficial** (Foca: GNU FDL 1.2; Pro Git: CC BY-NC-SA 3.0).
  - A versão boa é a baixada do site oficial (guiafoca.org e git-scm.com), não a cópia WeLib.
  - Mesmo assim: Pro Git é "NC-SA" (sem uso comercial e com a obrigação de usar a mesma licença).
  - **Só indicamos; não adaptamos.**
- **Registro:** depois do seu OK, eu registro esta curadoria em `docs/FONTES_CATALOGADAS.md` e num parecer em `docs/validacoes/explora-tech-fundamentos-2026-10-13.md`.
  - Nesta etapa você pediu só os dois cadernos, por isso ainda não mexi nesses arquivos.
- **Para usar um livro como base de estudo:** coloque no Drive uma cópia legítima (comprada ou publicada pelo próprio autor ou editora) e ela passa pelo fluxo normal.

**De onde vem a matéria:**
- da grade que você passou;
- da documentação oficial de cada ferramenta (docs.python.org, git-scm.com/docs, manuais do GNU coreutils e as man pages, RFCs do IETF para IP, DNS, TCP e HTTP);
- do que o Professor Diver já sabe.

Tudo reescrito por nós.

## 3. Leituras recomendadas ("Para ir além" de cada módulo)

**Proposta de campo opcional novo:** `paraIrAlem` na primeira aula de cada módulo, com `{ livro, gratis, ferramenta }`. O app mostra no fim do artigo.

Licenças conferidas na web em **2026-10-13**:
- O que é gratuito pode mudar. A grade avisa isso, e a data da conferência fica registrada.
- Links só oficiais; os que ainda não abri estão marcados "conferir antes de publicar".

| Matéria | Livro principal (só indicação) | Grátis para ler · licença | Ferramenta |
|---|---|---|---|
| Lógica | *Entendendo Algoritmos*, Aditya Bhargava (Novatec, PT) · comercial | *Pense em Python*, Allen Downey (PT, tradução comunitária da 2ª ed.) · o original *Think Python* é Creative Commons não comercial (greenteapress.com); **licença da tradução: conferir antes de publicar** | Python e VS Code; Beecrowd e Exercism |
| Python | *Introdução à Programação com Python*, Nilo Ney Coutinho Menezes (Novatec, PT) · comercial | *Automate the Boring Stuff with Python*, Al Sweigart (inglês) · **CC BY-NC-SA 4.0** na 3ª edição (página de copyright da No Starch Press); depois *Python Fluente*, Luciano Ramalho (Novatec, PT) · comercial | Python, Thonny, VS Code, Jupyter |
| Computador | *Code*, Charles Petzold · comercial | *Operating Systems: Three Easy Pieces* (Arpaci-Dusseau) · **grátis em PDF** no site oficial (research.cs.wisc.edu/wind/OSTEP); a licença não está explícita: só indicamos | VirtualBox; nand2tetris |
| Redes | *Redes de Computadores e a Internet*, Kurose e Ross (Pearson, PT) · comercial | *Computer Networks: A Systems Approach*, Peterson e Davie · **CC BY 4.0** (book.systemsapproach.org) | Wireshark, GNS3, Cisco Packet Tracer |
| Linux | *Descobrindo o Linux*, João Eriberto Mota Filho (Novatec, PT) · comercial | *The Linux Command Line*, William Shotts · **Creative Commons BY-NC-ND** (linuxcommand.org/tlcl.php; a versão muda por edição) e o *Guia Foca Linux* · **GNU FDL 1.2** (guiafoca.org) | VirtualBox com Ubuntu ou WSL; OverTheWire Bandit |
| Git | *Pro Git*, Scott Chacon e Ben Straub (Apress) | O próprio *Pro Git*, também em português · **CC BY-NC-SA 3.0** (git-scm.com/book) | Git, conta grátis no GitHub, Learn Git Branching |

**Recursos gerais (só indicar):** Curso em Vídeo, CS50 de Harvard, freeCodeCamp, roadmap.sh, Cisco Networking Academy. O inglês técnico se pratica lendo a documentação oficial.

**Regra de citação:**
- Só quando necessária: uma ou duas frases, entre aspas, com autor, obra e capítulo ou página (Lei 9.610/1998, art. 46, III).
- O normal é indicar a leitura ("Leitura: Menezes, capítulo sobre listas") em vez de citar.

- 2026-10-16 · **Sem sqlite3** no Banco ao Vivo: o banco é CSV e JSON, para não baixar nada além do Python do curso. SQL de verdade fica para a Fase 2.
- 2026-10-16 · Laboratórios sem Python ficam **só em JavaScript**, com a regra num "motor" sem tela (`js/laboratorio/motor-*.js`) que o `conferir-laboratorios.mjs` também roda: Fábrica de Portas, Sala de Controle, Jornada do Pacote, Laboratório de Rede, Missões no Terminal e Linha do Tempo do Código. Modelo de tela: `js/laboratorio/lab-js.js`.
- 2026-10-16 · Terminal e Git são **de mentirinha**: um shell com sistema de arquivos virtual (`motor-shell.js`) e um Git próprio como plugin dele (`motor-git.js`: índice, commits com hash calculado, branches, merge de três vias com marcas de conflito, revert, push, pull e clone num GitHub de faz de conta). Nada toca o computador do aluno. As mensagens do Git ficam em inglês, como no Git de verdade e como as aulas ensinam.
- 2026-10-16 · Mini-Masmorra (aulas 29 e 59) e Arena de Robôs (aula 60) são laboratórios de Python com as peças prontas no "prelude"; a Arena não tem sorteio na hora (o Titã usa semente fixa) e mostra a luta turno a turno na saída. Ranking da Arena só com o OK do usuário (mapa, 8g).

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| | | (vazio: nenhuma referência foi estudada ainda; nasce na `criar-trilha`) |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

## Já feito
- 2026-10-16 · **Módulos 3 a 12** (aulas 11 a 60), a pedido do usuário ("manda bala em tudo, laboratórios e as 4 etapas sem parar"), cada módulo com 100 questões, 100 variantes e fichas, todos com 0 aviso no `conferir-trilha`:
  - Módulo 3 · Lógica: repetição e funções (while, for e range, funções, depurar, busca binária) + **Caça ao Número**.
  - Módulos 4 a 7 · Python (primeiros passos; listas e dicionários; funções de verdade com o projeto da calculadora; arquivos, CSV, JSON e try/except) + **Organizador de Pasta**, **Banco ao Vivo** e **O Caso do Servidor Sumido**, e missões novas na Lupa, no Caça-Bugs e na Oficina.
  - Módulo 8 · Como o computador funciona (bits e binário, hardware, sistema operacional, arquivos) + **Fábrica de Portas Lógicas** e **Sala de Controle**.
  - Módulos 9 e 10 · Redes (IP e máscara, DNS, pacotes e camadas, portas TCP e UDP, HTTP, HTTPS, diagnóstico) + **Jornada do Pacote**, **Mini-servidor** e **Laboratório de Rede**.
  - Módulo 11 · Linux e terminal + **Missões no Terminal** (13 missões).
  - Módulo 12 · Git e GitHub (o projeto da fase é publicar no GitHub) + **Linha do Tempo do Código** (16 missões), **Mini-Masmorra** (6) e **Arena de Robôs** (5).
  - Decisões de ensino: comandos de terminal e de Git, portas e versões levam `! revisar` para o especialista; as revisões de módulo reaproveitam os temas das aulas (as fichas já existem) e só criam o tema novo da revisão; a revisão da aula 60 mistura o ciclo do Git com perguntas da fase inteira.
- 2026-10-14 · **Módulo 2 · Lógica: decisões** (aulas 6 a 10: if/elif/else; booleanos; comparações e condições compostas; entrada do usuário e validação; revisão com o programa do cinema). 101 questões, 101 variantes, 20 fichas, 24 pares, 19 V/F, 10 adivinhas, 5 sequências, 32 palavras (todas no dicionário). Cada "o que este código mostra?" conferida rodando no Python. Laboratórios: Robô Entregador com 4 missões de decisão (sensores, vários mundos, lacunas no celular), **Lupa do Código** (4 missões), **Caça-Bugs** (5) e **Oficina de Funções** (3). Plano aprovado pelo usuário ("manda bala e já pode ir subindo para produção").
  - Decisões de ensino: no Módulo 2 o `input()` entra só na aula 9, depois de o aluno dominar a decisão com valores fixos; validar antes de converter (`isdigit()` antes do `int()`), porque laços ainda não existem; "a partir de" e "até" levam o igual, e o erro por um se pega com três valores (limite, um abaixo, um acima); a revisão junta tudo num programa só (meia-entrada do cinema) e apresenta o teste de mesa, que a Lupa do Código faz na tela.
- 2026-10-13 · Caminho da aula (Ler → Questões → Mão na massa → próxima aula), comandos sempre à vista e laboratório Primeiros Programas (aulas 2 a 5), a pedido do usuário. Robô: missões 1 a 3 na aula 1 e 4 a 6 na revisão.
- 2026-10-13 · **Onda 0:** Módulo 1 · Lógica: pensar como o computador (aulas 1 a 5: algoritmo; primeiro programa; variáveis e tipos; operadores, porcentagem e arredondamento; revisão). 100 questões, 100 variantes, 16 fichas, 22 pares, 19 V/F, 10 adivinhas, 6 sequências, 42 palavras (todas no dicionário). Laboratório Robô Entregador com 6 missões de sequência (aulas 1, 2 e 5). Curadoria registrada em `docs/FONTES_CATALOGADAS.md` e no parecer `docs/validacoes/explora-tech-fundamentos-2026-10-13.md`.
- 2026-10-13 · Etapa 1: este caderno e o mapa curricular.
  - Curadoria da pasta do Drive: 5 PDFs WeLib reprovados, só bibliografia.
  - Licenças das leituras grátis conferidas.
  - Medido o Pyodide 314.0.7: 13,4 MB no disco, ~6,3 MB baixados.
  - Conferidas 68 palavras da Palavrinha.
  - Custo estimado da Fila: ~US$ 90 a 108 com variantes.

## Próximos passos e pendências
- Revisão humana do curso inteiro (Allisson): começar pelos itens `revisar` (74 no curso), que são comandos, portas, versões e datas.
- Fila de Validação do curso inteiro (2026-10-16, só `fila.mjs simular`, nada enviado): ~US$ 44,69 para as 1.201 questões (61 lotes) e ~US$ 44,67 para as variantes, cerca de US$ 89 no total. O envio e a aprovação são do admin.
- Merge para produção: o usuário.
- Fases 2 a 4 do Explora Tech: planejar com o usuário, depois do retorno dos alunos na Fase 1.
- Antes de validar o curso na Fila: colar `supabase/painel/mergulho-triplo.ts` (agora manda o código da questão às IAs) na Edge Function.
- Especialista de revisão humana: **Allisson (a confirmar)**. Itens `revisar`: comandos de terminal e Git, portas, versões, valores de configuração.
- Conferir antes de publicar: licença da tradução *Pense em Python*; links oficiais de todos os "Para ir além".

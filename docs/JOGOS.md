# Diver — catálogo de jogos e contrato do motor

> **Regra de ouro:** todo jogo é só uma "roupa" diferente sobre o mesmo conteúdo. O jogo recebe cartas, monta a sua mecânica e devolve um **Resultado padrão**. XP, pérolas, oxigênio, revisão espaçada, conquistas e relatórios acontecem fora do jogo, em `js/economia.js`.

```
Cartas (da trilha) → Jogo (mecânica própria) → Resultado padrão → economia: XP · pérolas · revisão · conquistas
```

## 1. Catálogo (17 jogos)
### Núcleo (já prontos)
_A base de perguntas e respostas: testada e aprovada. Não refazer._

| Jogo | Como funciona | Conteúdo usado | Roupa de mar | Semana |
| --- | --- | --- | --- | --- |
| **Mergulho** (`mergulho`) | Quiz por fases com oxigênio. Cada fase é uma profundidade; errou, perde oxigênio; mostra na hora se acertou e a explicação. A rodada tem 10 questões (desde 2026-10-13) e vem em rampa (fácil → médio → difícil); na 1ª rodada de cada fase, só fáceis e médias. | Múltipla escolha | Fases = profundidades do mar | Pronto |
| **Simulado** (`simulado`) | Sem oxigênio e com cronômetro (1 minuto por questão). 5, 10 ou 20 questões da trilha (ou todas), correção só no final, nota de 0 a 10 e histórico de notas. | Múltipla escolha | A prova do mergulho | Pronto |
| **Revisão** (`revisao`) | Só as questões que o aluno errou ou marcou com "Marcar para revisar". Acertou na revisão, a questão sai da lista. Em vez da mesma questão, pode vir uma **variante aprovada** ("Versão nova") ou, para questão do Enem, outra questão nossa do mesmo tema ("Mesmo tema"); ver `docs/MOTOR_DIVER.md`, seção 12. | Questões erradas ou marcadas | Resgate do que ficou no fundo | Pronto |
| **Prova final** (`prova`) | Cronometrada, sem feedback no meio, questões sorteadas da trilha inteira e nota mínima para aprovação (bloco opcional `prova` na trilha). Liberada ao completar todas as fases. | Múltipla escolha | O último mergulho | Pronto |

### Jogos rápidos (2 a 5 minutos)
_Partidas curtas para revisar um pouquinho a cada dia._

| Jogo | Como funciona | Conteúdo usado | Roupa de mar | Semana |
| --- | --- | --- | --- | --- |
| **Cartas do Fundo** (`cartas-do-fundo`) | Flashcards: vire a carta, veja a resposta e diga se sabia, quase sabia ou não sabia. Alimenta as caixas de revisão espaçada (Leitner). | Qualquer trilha (derivado das questões) | Cartas guardadas em um baú | Pronto (v0) |
| **Quiz Relâmpago** (`quiz-relampago`) | Múltipla escolha e verdadeiro ou falso, com cronômetro opcional e combo de acertos (a partir do 3º seguido, +5 XP). | Qualquer trilha (derivado) | Tempestade no mar, à noite, em tela toda: o mar sobe enquanto o relógio corre e cai um raio a cada acerto | Pronto (palco, 2026-10-18) |
| **Memória** (`memoria`) | Jogo das cartas viradas: encontre os pares termo ↔ definição. Menos tentativas e menos tempo, mais pontos. | Pares (ou derivado das questões) | Conchas que abrem e fecham | Pronto (v0) |
| **Adivinha Aí** (`adivinha-ai`) | As dicas aparecem uma a uma. Quanto antes você acertar, mais pontos. Aceita a resposta sem acento e sem maiúsculas. | Adivinhas (até 10 dicas por carta) | Dicas que chegam em garrafas com mensagem | Pronto (v0) |
| **Palavrinha**, **Palavrinha x2** e **Palavrinha x4** (`palavrinha`, `palavrinha-x2`, `palavrinha-x4`) | Descubra a palavra-chave do curso: cada palpite pinta as letras (lugar certo, em outro lugar, não está). 6 tentativas; no x2 e no x4, 2 ou 4 palavras de uma vez (7 e 9 tentativas). **Palavra do dia** igual para todo o curso (sorteio pela data, sem repetir até usar todas) e **Treino livre**. Os dois valem XP, estatísticas e pontos no **Ranking Diver** do curso (zera todo mês); pérolas, só a palavra do dia. Tema desde o início (nunca um que entregue a palavra); dica completa depois da 3ª tentativa. Aviso do ranking na primeira vez. Tudo vindo do log de atividade (`docs/ATIVIDADE.md`). | Palavras simples de 4 a 8 letras (bloco `palavras` + respostas curtas). Aparece com 30 (x1) ou 40 palavras (x2/x4, com 10 de um mesmo tamanho) | Peças de letra no fundo do mar, que acendem quando acertam | Pronto (v1) |
| **Tiro ao Alvo** (`tiro-ao-alvo`) | Pistola d'água em primeira pessoa, por níveis: cada nível tem uma regra de escola ("Só os PEIXES", "Números PRIMOS", "Capitais do Brasil"...) e só valem as placas que combinam com ela; placa errada ou certa que escapa acaba a rodada. Em **tela toda**, com o álbum de 26 selos. Cada nível completo vale XP e pérolas (detalhes na seção 5). | Não usa as cartas: as 26 regras são do próprio jogo. **Só nos cursos das salas do Enem e do Ensino Médio** | Barraca de tiro na beira do mar, ao pôr do sol | Pronto (2026-10-18) |

### Aventuras
_Jogos com mapa, chefe, sobrevivência e desafios de raciocínio._

| Jogo | Como funciona | Conteúdo usado | Roupa de mar | Semana |
| --- | --- | --- | --- | --- |
| **Caça ao Tesouro** (`caca-ao-tesouro`) | Um mapa com paradas; cada pergunta respondida libera o próximo trecho até o baú de pérolas. Cada caça é gerada diferente. | Qualquer trilha (derivado) | Mapa do fundo do mar, ilhas e ruínas | Pronto (v0) |
| **Chefão do Abismo** (`chefao`) | Um monstro marinho com barra de vida. Cada acerto causa dano (combo = golpe crítico); cada erro custa oxigênio. Um chefão por profundidade. | Qualquer trilha (derivado) | Kraken, peixe-lanterna e companhia | Pronto (v0) |
| **Maré Alta** (`mare-alta`) | Modo sobrevivência sem fim: a maré sobe a cada erro. Quanto tempo você aguenta? O recorde fica salvo por trilha. | Qualquer trilha (derivado) | A água sobe na tela | Pronto (v0) |
| **Forca do Náufrago** (`forca`) | Descubra a palavra-chave letra por letra. Cada erro tira uma peça da jangada; uma dica opcional custa 1 pérola. | Palavras-chave (ou dos temas) | Uma jangada que vai se desmontando | Pronto (v0) |
| **Corrente do Tempo** (`corrente-do-tempo`) | Ordene eventos ou passos arrastando cada item na correnteza: cronologias, etapas de um processo, procedimentos. | Sequências | Itens boiando na correnteza | Pronto (v0) |

### Estratégia e duelos
_Jogos maiores, para jogar sozinho ou contra alguém no mesmo aparelho._

| Jogo | Como funciona | Conteúdo usado | Roupa de mar | Semana |
| --- | --- | --- | --- | --- |
| **Torre do Saber** (`torre`) | Para tirar um bloco da torre, responda. Errou? A torre balança. Blocos de cores diferentes valem pontos diferentes. Modo 2 jogadores. | Qualquer trilha (derivado) | Caixotes de um naufrágio | 16 |
| **Caso Resolvido** (`caso`) | "Operação Recife Sombrio": a Diver foi invadida. Quatro mergulhos com tanque de oxigênio (triagem de e-mails, cardume de senhas + rede social, sonar + registros, interrogatório) e o mural de acusação. Cada caso sorteia outra Sombra. | Bloco `casos` (`tipo: "operacao"`, `versao: 2`) | Mergulhos do Raso ao Abismo | Pronto |
| **Duelo de Mergulhadores** (`duelo`) | Dois jogadores no mesmo aparelho, em turnos, disputam as pérolas. Empate, placar e revanche. | Qualquer trilha (derivado) | Dois mergulhadores, um tesouro | 17 |

### Depois do lançamento (v2)
_Já pensados, mas ficam para depois da versão 1.0._

| Jogo | Como funciona | Conteúdo usado | Roupa de mar | Semana |
| --- | --- | --- | --- | --- |
| **Cruzadinha Submarina** (`cruzadinha`) | Mini palavras cruzadas montadas com as palavras-chave e dicas da trilha. | Palavras-chave com dica | Bolhas com letras | v2 |
| **Batalha de Turmas ao vivo** (`batalha`) | Turmas competem ao mesmo tempo, coordenadas pelo professor, em esquadras. | Trilha da turma | Esquadras em alto-mar | v2 |

### Mão na massa (laboratórios do Explora Tech, 2026-10-13)
_O aluno escreve código de verdade e vê acontecer. Plano completo: `docs/cadernos/explora-tech-mapa-curricular.md`, seção 7._

| Jogo | Como funciona | Conteúdo usado | Semana |
| --- | --- | --- | --- |
| **Robô Entregador** (`robo-entregador`) | Comandos em Python (`andar()`, `virar_esquerda()`, `virar_direita()`, `pegar()`, `soltar()`) levam as caixas ao destino numa grade; a linha da vez acende, com velocidade e passo a passo. Estrelas: 1 entregou, 2 sem a última dica, 3 dentro da meta de linhas e passos. Modo toque (blocos) no celular, sem baixar o Python. **Decisões (Módulo 2, 2026-10-14):** sensores `parede_a_frente()`, `parede_a_direita()`, `parede_a_esquerda()` e `caixa_aqui()`; a missão pode ter vários **mundos** (`cenarios`, abas "Mundo 1, 2, 3") e o mesmo programa precisa entregar em todos; no celular, o código vem pronto com **lacunas** (`toque.modelo` com `___`), rodadas em JS por `MundoRobo.executar` (um mini-interpretador de comandos, sensores, if/elif/else, not/and/or, while, for range, def, break). 6 missões de sequência (aulas 1 e 5) + 4 de decisão (aulas 6 e 10); laços e funções nos próximos módulos. | `data/laboratorios/<curso>/robo-entregador.json` (missões ligadas às aulas por `aulas`) | Pronto (v2) |

| **Primeiros Programas** (`primeiros-programas`) | Python puro: a missão mostra o que deve aparecer na tela e os comandos já ensinados (sempre à vista); o aluno escreve, roda e os testes comparam "Esperado" e "Saiu". No celular, completa lacunas escolhendo opções (sem baixar o Python). 11 missões: print (aula 2), variáveis (aula 3), contas (aula 4), cantina (aula 5). Modelo `js/laboratorio/lab-python.js` (Oficina de Funções e Caça-Bugs também usam). | `data/laboratorios/<curso>/primeiros-programas.json` | Pronto (v1) |
| **Lupa do Código** (`lupa-do-codigo`) | O programa roda em câmera lenta: "Rodar a linha N" acende uma linha por vez, as variáveis aparecem como caixinhas com nome, valor e tipo (cada tipo com a sua cor; a que mudou pisca) e a saída cresce embaixo. Antes de algumas linhas, o aluno **prevê** o valor de uma variável ou qual linha roda depois. Estrelas: 3 acertou todas, 2 acertou metade ou mais, 1 terminou. O rastreio é gravado no JSON a partir do Python de verdade (`conferir-laboratorios.mjs --gravar`): funciona no celular sem baixar o Python. 4 missões (aulas 6 e 7: elif, bool, and, or, not). | `data/laboratorios/<curso>/lupa-do-codigo.json` (`codigo`, `perguntas`, `passos`, `saidaFinal`) | Pronto (v1, 2026-10-14) |
| **Caça-Bugs** (`caca-bugs`) | Um programa que quase funciona: o selo "N defeitos para achar" diz quantos; o aluno conserta e roda, e os testes mostram, caso a caso, o esperado e o que saiu (mais um teste escondido para o caso de borda). No celular, escolhe a correção em cada lacuna. 5 missões: comparação trocada, `=` no lugar de `==`, dois-pontos e recuo, `or` no lugar de `and`, ordem do `elif` (aulas 8 e 10). | `data/laboratorios/<curso>/caca-bugs.json` (`defeitos`, `testes` com `oculto`) | Pronto (v1, 2026-10-14) |
| **Oficina de Funções** (`oficina-de-funcoes`) | O aluno completa uma função até ela passar nos testes: o cartão "O que a função precisa fazer" mostra exemplos (`exemplos`), e os testes escondidos (casos de borda) só aparecem se falharem. No celular, lacunas. 3 missões de validação de entrada (aula 9: nota de 0 a 10, só algarismos com `isdigit()` antes do `int()`, cupom de desconto com `round`). | `data/laboratorios/<curso>/oficina-de-funcoes.json` | Pronto (v1, 2026-10-14) |
| **Caça ao Número** (`caca-ao-numero`) | Python: um número escondido e a pista "maior" ou "menor" (`tentar(n)` no prelude); primeiro o laço um por um, depois a busca binária, com limite de palpites. 3 missões. | Aula 14 | 2026-10-15 |
| **Organizador de Pasta** (`organizador-de-pasta`) | Python com pasta virtual (campo `arquivos`): ler e escrever arquivos, criar pastas e mover cada arquivo para o lugar; a árvore aparece antes e depois de rodar, com o que é novo, o que mudou e o que saiu. 6 missões, uma delas a quarentena da aula 40. | Aulas 31, 32, 35 e 40 | 2026-10-15 |
| **Banco ao Vivo** (`banco-ao-vivo`) | Python: um banco pequeno em CSV e JSON (consultar, inserir, alterar e resumir), com o arquivo antes e depois. Sem sqlite3, para não baixar nada além do Python. 4 missões. | Aulas 33 e 35 | 2026-10-15 |
| **O Caso do Servidor Sumido** (`servidor-sumido`) | Python: crachás em CSV, câmeras e chamados em JSON; cada pista libera a próxima até um nome. 4 missões, dados fictícios. | Aula 33 | 2026-10-15 |
| **Fábrica de Portas Lógicas** (`fabrica-de-portas`) | Só JavaScript (`motor-portas.js` + `lab-js.js`): montar circuitos com AND, OR, NOT e XOR contra a tabela-verdade ao vivo, ligar bits para formar um número e ler bits em decimal. 10 missões. | Aulas 7, 37 e 40 | 2026-10-16 |
| **Sala de Controle** (`sala-de-controle`) | Só JavaScript (`motor-sala.js`): o painel de uma máquina simulada (processador, memória, disco, processos e arquivos grandes); encerrar o processo certo, liberar disco, nunca o processo do sistema. 5 missões. | Aulas 36, 38 e 40 | 2026-10-16 |
| **Jornada do Pacote** (`jornada-do-pacote`) | Só JavaScript (`motor-rede.js`): configurar IP, máscara, gateway, DNS, porta ou firewall e "Enviar pacote"; o mapa acende o caminho e o Painel de Pacotes mostra cada salto com a camada, e onde o pacote se perdeu. 16 missões. | Aulas 41 a 46, 48 e 50 | 2026-10-16 |
| **Mini-servidor** (`mini-servidor`) | Python: `responder(metodo, caminho, corpo)` devolve código de status e corpo (200, 404, JSON, 201 e 405). 4 missões. | Aula 47 | 2026-10-16 |
| **Laboratório de Rede** (`laboratorio-de-rede`) | Só JavaScript: terminal simulado (`terminal.js`) com ipconfig, ping, traceroute, nslookup e nc sobre a rede de `motor-rede.js`; investigar e dizer onde está o defeito. 5 missões. | Aulas 49 e 50 | 2026-10-16 |
| **Missões no Terminal** (`missoes-no-terminal`) | Só JavaScript: shell de mentirinha com sistema de arquivos virtual (`motor-shell.js`: pwd, ls, cd, cat, grep, wc, sort, uniq, cp, mv, rm, chmod, pipe, > e >>), árvore viva com permissões e mini editor nano (Ctrl+O, Ctrl+X). 13 missões. | Aulas 51 a 55 | 2026-10-16 |
| **Linha do Tempo do Código** (`linha-do-tempo-do-codigo`) | Só JavaScript: um Git de mentirinha como plugin do shell (`motor-git.js`), com as três áreas à vista (pasta de trabalho, preparo e repositório), a linha do tempo dos commits com branches e HEAD, o GitHub de faz de conta (push, pull, clone) e o nano para resolver conflitos. 16 missões. | Aulas 56 a 60 | 2026-10-16 |
| **Mini-Masmorra** (`mini-masmorra`) | Python, peça por peça: salas num dicionário, descrever e mover, inventário numa lista, comandos, salvar e carregar em JSON e o laço do jogo com `input()`; as peças prontas vêm no prelude. 6 missões. | Aulas 29 e 59 | 2026-10-16 |
| **Arena de Robôs** (`arena-de-robos`) | Python: `decidir(situacao)` devolve andar, atacar ou defender contra 5 robôs (Parafuso, Ferrugem, Pistão, Faísca e o chefe Titã); regras fixas e semente fixa, luta turno a turno na saída. Ranking só com o OK do usuário. 5 missões. | Aula 60 | 2026-10-16 |

**Caminho da aula (2026-10-13):** no mapa, cada aula é um cartão só: em cima o botão da aula e, no pé do cartão, uma linha para cada ação ("Antes de mergulhar" e "Mão na massa: <laboratório>"), com o estado à direita ("Leia para liberar" ou "✓ Feito"); terminar as questões leva ao laboratório da aula (só as missões dela); terminar as missões marca o passo 3 (`diver:v1:lab:<curso>` → `_aulas`) e o resumo oferece a próxima aula.

**Tela dos laboratórios (arrumada em 2026-10-13, pedido do usuário):** cabeçalho (grupo, título, enunciado, missões e "Como funciona?"); no computador, duas colunas: à esquerda a **coluna de apoio**, que fica parada na tela ao rolar (objetivo ou mundo do robô, a cola de comandos e as dicas, em cartões iguais: `Laboratorios.cartao`), e à direita a **janela do código** (`Laboratorios.janela`: barra com o arquivo e a troca de modo, editor, Rodar/Recomeçar e a Saída, que aparece sempre, com aviso enquanto vazia), os testes e o resultado. No celular, uma coluna na ordem de uso: objetivo, janela, cola. No pé: "Agora faça de verdade" e "Concluir laboratório". Laboratório novo usa as mesmas peças.

**Contrato de laboratório:** um arquivo em `js/jogos/`, grupo `laboratorios`, `requer: { laboratorios: 1 }` e `temConteudo` olhando `cartas.laboratorios` (os ids de `fases[].laboratorio`). Abre pela aula ("Mão na massa", com `opcoes.fase`: só as missões daquela aula) ou pela Sala de Jogos (todas). Devolve o Resultado padrão com `soBonus: true`: cada missão tentada é um detalhe (resolvida = acerto) e o XP vem só do bônus, de 10 XP e 1 pérola por **estrela nova** (a melhor marca paga uma vez só, mesmo saindo no meio), dentro do teto da economia. Estrelas em `diver:v1:lab:<curso>` (nuvem); rascunho só no aparelho. Tutorial (`Tutorial.guiar`), 3 dicas, "Agora faça de verdade", teclado e `prefers-reduced-motion`. Conferência: `node scripts/conferir-laboratorios.mjs` (solução passa, código inicial falha, determinístico, metas possíveis, mundo JS = Python em cada mundo, lacunas certas passam e uma sequência simples não resolve as missões de decisão; na Lupa, o rastreio gravado bate com o Python e cada pergunta tem uma opção certa só; `--gravar` regrava os rastreios).

## 2. Tipos de carta

O formato atual das **questões** (múltipla escolha) **não muda**. Os blocos abaixo são **opcionais** e ficam no mesmo arquivo da trilha. Confirme os nomes reais dos campos olhando os JSON que já existem em `data/trilhas/` e siga exatamente aqueles nomes.

```json
{
  "questoes": [ "...formato atual, sem mudanças..." ],
  "pares":      [ { "termo": "Mitocôndria", "definicao": "Organela que produz energia (ATP)", "tema": "Biologia" } ],
  "verdadeiroFalso": [ { "afirmacao": "A fotossíntese ocorre nas mitocôndrias.", "verdadeira": false, "explicacao": "Ocorre nos cloroplastos.", "tema": "Biologia" } ],
  "lacunas":    [ { "texto": "A capital do Brasil é {{Brasília}}.", "distratores": ["Rio de Janeiro", "São Paulo"], "tema": "Geografia" } ],
  "sequencias": [ { "titulo": "Etapas da fotossíntese", "itens": ["Absorção de luz", "Separação da água", "Produção de glicose"], "tema": "Biologia" } ],
  "adivinhas":  [ { "resposta": "Fotossíntese", "aceitas": ["fotossintese"], "dicas": ["Acontece nas plantas", "Precisa de luz", "Produz oxigênio"], "tema": "Biologia" } ],
  "palavras":   [ { "palavra": "MITOCONDRIA", "dica": "Usina de energia da célula", "tema": "Biologia" } ],
  "casos":      [ { "id": "recife-sombrio", "tipo": "operacao", "versao": 2, "titulo": "Operação Recife Sombrio", "caixa": "agente@soc.diver.app.br", "historia": "...",
                    "mergulhos": [ { "id": "isca|cardume|sonar|interrogatorio", "profundidade": "Raso", "metros": "10 m", "titulo": "A Isca", "resumo": "...", "pista": "A", "chave": "cardume|sonar (opcional)" } ],
                    "pistas": { "A": "O que a isca revelou", "B": "...", "C": "...", "D": "..." },
                    "emails": { "legitimos": [ { "id", "de", "email": "endereço oficial real", "cor", "hora", "assunto", "previa", "corpo": [ { "p" }, { "link", "url", "botao" }, { "codigo" }, { "nota" } ], "cabecalho": { "returnPath", "spf", "dkim", "dmarc", "recebido" }, "explicacao", "pesquisa": "o que pesquisar na internet" } ],
                                "golpes":    [ { ...os mesmos campos, "spf", "dkim", "dmarc", links com "falso": true, anexos com "perigoso": true (o cabeçalho com o rastro em comum é montado na rodada) } ] },
                    "tabuleiro": { "quem": [ { "id", "nome", "papel", "usuario", "visual": { "pele": "#hex", ... }, "ficha", "alibis": ["..."], "fala": "depoimento", "confirma": "registro que confirma" } ],
                                   "comQue": [ { "id", "nome", "icone", "ficha", "descartes": ["..."], "licao" } ], "como": [ { ...igual a comQue } ] },
                    "contradicoes": [ "A VPN registrou {usuario}@ entrando às 03:16…" ],
                    "osint": [ { "quem": "dobrao", "usuario": "@dr.dobrao", "seguidores", "posts": [ { "icone", "texto" } ], "senha": "tonico2019", "partes": [ { "trecho", "certo", "falta" } ], "mornos": ["..."] } ] } ]
}
```

### Derivação automática (o que faz toda trilha funcionar em vários jogos)
| Jogo | Sem bloco extra, o Diver deriva assim |
| --- | --- |
| Cartas do Fundo | frente = enunciado; verso = alternativa correta + explicação. |
| Quiz Relâmpago (V/F) | afirmação = enunciado + uma alternativa; se for a correta, é verdadeira; se for outra, é falsa. |
| Memória | pares "enunciado curto ↔ resposta correta curta" (enunciado até ~80 caracteres, resposta até ~40). |
| Caça ao Tesouro, Chefão, Maré Alta, Torre, Duelo | usam as questões como estão (ordenadas ou sorteadas por dificuldade). |
| Forca | palavras curtas vindas de "tema" e das respostas curtas das questões. |
| Adivinha Aí, Corrente do Tempo, Caso Resolvido | **precisam** do bloco próprio; sem ele, o jogo **não aparece** na Sala de Jogos daquele curso (ver "Sala de Jogos por curso"). |

### Sala de Jogos por curso (desde 2026-10-01)
A Sala de Jogos é sempre a de **um curso** (a trilha atual) e mostra **só os jogos que esse curso suporta**:
- **Núcleo** (Mergulho, Simulado, Revisão): sempre aparece.
- **Demais jogos:** aparecem só se `Jogos.estado(jogo, Cartas.derivar(trilha))` for `disponivel`, ou seja, se o curso tem o mínimo de cartas de cada tipo pedido em `requer` (ex.: Memória `{ pares: 6 }`, Adivinha Aí `{ adivinhas: 1 }`, Caso Resolvido `{ casos: 1 }`). Um jogo também pode ter a regra própria `temConteudo(cartas)`: o Tiro ao Alvo usa `cartas.trilhaId` (o id do curso, que o `Cartas.derivar` devolve junto desde 2026-10-18) para aparecer só nos cursos das salas do Enem e do Ensino Médio (`Grupos.LISTA`).
- **Sem conteúdo suficiente** (`precisa`) ou **ainda não lançado** (`embreve`: Torre do Saber, Duelo, Cruzadinha, Batalha de Turmas): o jogo **não aparece**, nem desabilitado. Nada de card fantasma.
- **Grupo vazio** (ex.: "Estratégia e duelos" num curso sem `casos`): o título do grupo também some.
- O **Desafio do Dia** já sorteava só jogos disponíveis; continua igual.
- Para um jogo aparecer num curso, basta acrescentar o bloco de cartas que ele pede no JSON da trilha (os blocos são opcionais; ver seção 2).

## 3. Contrato do jogo (js/jogos/registro.js)

> **Implementado.** A forma real (com `requer` como `{ tipo: mínimo }`, `iniciar()` devolvendo `{ destruir }`, `ctx.gastarPerolas()` e os campos extras do detalhe) está em `docs/ARQUITETURA.md`, seção "Sala de Jogos: contrato".

```js
// Definição (um objeto por jogo, registrado em registro.js)
{
  id: 'memoria',              // minúsculas, sem acento; igual ao nome do arquivo
  nome: 'Memória',
  grupo: 'rapidos',           // nucleo | rapidos | aventuras | estrategia
  icone: 'shell',
  descricao: 'Encontre os pares termo ↔ definição.',
  requer: ['par'],            // tipos de carta aceitos; vazio = usa questões
  deriva: true,               // true = funciona com qualquer trilha (cartas derivadas)
  duracao: '2-5 min',
  iniciar(contexto) { /* monta a tela em contexto.container */ }
}

// Contexto entregue ao jogo
{ container, trilha, cartas, fase /* opcional */, opcoes /* dificuldade, cronômetro... */, aoTerminar(resultado) }

// Resultado padrão (o jogo chama contexto.aoTerminar(resultado) no fim)
{
  jogoId, trilhaId, fase, concluido,           // concluido: boolean
  acertos, erros, total, tempoSegundos,
  comboMaximo, perfeito,                       // perfeito: nenhum erro
  oxigenioRestante,                            // se o jogo usa oxigênio
  detalhes: [ { cartaId, tema, dificuldade, acertou, tempoMs } ],
  bonus: { xp: 0, perolas: 0 },                // bônus próprio do jogo, dentro dos limites da economia
  semPerolas: false,                           // opcional: true = a partida dá XP mas não dá pérolas (treino da Palavrinha)
  registro: {}                                 // opcional: dados extras do jogo para o log de atividade (docs/ATIVIDADE.md)
}
```

### Jogo em tela toda e com rodadas (2026-10-18; o Tiro ao Alvo)
- **`telaCheia: true`** na definição: a tela do jogo vira uma camada do tamanho da janela (`#tela-jogo.tela--cheia`, `body.jogo-trava`, contêiner `sd-cheia`, o mesmo da Sala de Descompressão) e a barra de cima (sair, o nome do jogo e o curso) fica por cima, num degradê. **`ctx.barra(...nós)`** põe os botões do jogo nessa barra (`#jogo-botoes`; o Tiro ao Alvo põe "Som" e "Tela cheia"). Até 767 px os botões ficam só no ícone; até 479 px o nome do curso some e fica só o do jogo.
- **Rodadas sem sair do jogo:** **`ctx.concluirRodada(resultado)`** aplica um Resultado padrão na hora (economia, log, conquistas, nível) e devolve `{ xp, perolas, dobro }`; o jogo mostra o fim dele e oferece "Jogar de novo". O Desafio do Dia dobra só a primeira rodada. **`ctx.sair()`** volta para a Sala de Jogos sem perguntar.
- **`emAndamento()`** no controlador (o que `iniciar` devolve, junto com `destruir`): entre as rodadas, o X e o Voltar do navegador saem sem perguntar (as rodadas feitas já valeram); durante a rodada, perguntam, como nos outros jogos.

### O palco em tela toda (`js/jogos/palco.js`, 2026-10-18)
Pedido do usuário: "vamos atualizar nossos jogos para esse estilo de design que ficou o jogo da pistola, tela cheia, bonito, da uma sensação de entrar realmente no jogo [...] pode aplicar para todos". O palco é a roupa comum; **regras, pontos, XP e conteúdo de cada jogo ficam iguais**.
- **`Palco.montar(ctx, { id, cena })`** (no pacote `jogos`, antes dos jogos) monta, dentro de `ctx.container`:
  - a **cena**: um `<canvas>` atrás de tudo, que o jogo desenha (`cena.desenhar(g, L, A, t, dt, estado)`, `cena.medir(L, A)` quando a tela muda e `cena.reagir(tipo, info, estado)`);
  - a **coluna** do jogo por cima (`palco.area`), num vidro escuro, com o placar em **pílulas** (`palco.hud(...)`, `palco.pilula(texto, { icone, classe })`); a rolagem começa embaixo da barra de cima;
  - **"Som"** (sintetizado na hora, sem arquivo; a escolha fica só no aparelho, `diver-local:v1:jogos-som`) e **"Tela cheia"** na barra (`ctx.barra`).
- **Reações comuns:** `palco.reagir('acerto' | 'erro' | 'combo' | 'vitoria' | 'derrota' | <som>, { el } ou { x, y })` toca o som, solta partículas do elemento, dá o clarão e a tremidinha e chama a cena. `JogoComum.questao(..., { palco })` já reage sozinho no acerto e no erro.
- **Abertura e fim no cartão do Tiro ao Alvo:**
  - `palco.abertura({ rotulo, titulo, lead, passos, numeros, botao, aoComecar })`;
  - `palco.terminar(resultado, { tom, numeros, aoJogarDeNovo, textoDeNovo })` aplica o resultado na hora (`ctx.concluirRodada`) e mostra "Em números", o XP e as pérolas da rodada, **"O que revisar"** e **"Jogar de novo"** sem sair do jogo. Título amarelo quando a rodada foi boa (`tom: 'vitoria'`), na cor do texto quando não foi.
- **O botão de sair do fim vem do app** (`ctx.fim`): "Voltar para a Sala de Jogos"; nos flashcards da fase, **"Voltar para a trilha"** é o principal e "Mais cartas desta fase" joga de novo; no detetive antes da prova, "Ir para a Prova final".
- **Controlador:** `{ emAndamento: () => palco.jogando(), destruir() { ...; palco.parar(); } }`.
- **"Reduzir movimento":** a cena fica parada (sem partículas, clarão, raio nem tremidinha) e só muda quando o jogo muda (o mar que sobe, a vida do chefão).
- **Ajudas de desenho:** `Palco.pintar` (`COR` dos tokens, `misturar`, `alfa`, `degrade`, `agua`, `raios`, `poeira`).
- **Nos testes:** com `window.__diverTeste`, o palco fica em `__diverTeste.palco`.
- **Já no palco:** Quiz Relâmpago. Os outros entram em ondas: A (Chefão do Abismo, Maré Alta), B (Memória, Cartas do Fundo, Forca, Adivinha Aí), C (Caça ao Tesouro, Corrente do Tempo, Palavrinha, Caso Resolvido) e D (a Sala de Descompressão).

## 4. Checklist de aceitação (todo jogo novo)
- [ ] Registrado em `js/jogos/registro.js` com o `requer` certo: o card aparece na Sala de Jogos **só** nos cursos que têm o conteúdo pedido (sem conteúdo ou "em breve" = não aparece).
- [ ] Funciona com uma trilha de 20 questões (derivada) ou declara no `requer` o bloco de que precisa.
- [ ] Devolve o Resultado padrão; a economia concede XP e pérolas; conquistas e revisão espaçada atualizadas.
- [ ] Jogável **só com o teclado**; foco visível; alvos de toque de pelo menos 44 px; contraste bom.
- [ ] Respeita `prefers-reduced-motion`.
- [ ] Testado em tela de celular (360 px) e de computador.
- [ ] Roupa de mar e textos no tom de voz do Diver; mensagens fixas mantidas.
- [ ] Mergulho, Simulado e Revisão continuam funcionando igual.
- [ ] `docs/JOGOS.md` atualizado; `docs/DIARIO.md` com a entrada do dia.

## 5. Especificações por jogo
#### Cartas do Fundo (`cartas-do-fundo`) — semana 3
- Rodada de 10 cartas (opções: 5, 10 ou 20). Frente = enunciado; Espaço ou toque vira a carta.
- Autoavaliação: **Sabia** (sobe uma caixa de Leitner), **Quase** (mantém), **Não sabia** (volta à caixa 1).
- Só "Sabia" conta como acerto para XP; "Não sabia" vai para a lista de revisão.
- Teclado: Espaço vira; 1, 2 e 3 avaliam.
- **Depois do Mergulho (2026-10-04):** quando a rodada do Mergulho termina (fase completa ou sem oxigênio), a caixa do Diver sugere "Bora fixar com flashcards?" e o resultado ganha o botão **🃏 Fixar com flashcards**. Eles abrem o jogo com `opcoes.fase` = a fase do Mergulho: só cartas daquela fase (cada carta derivada guarda `fase`; com menos de 4, usa a trilha toda). No fim, o botão principal é **"Voltar para a trilha"** (mapa do Mergulho) e o secundário "Mais cartas desta fase"; sair no meio também volta para a trilha.

#### Quiz Relâmpago (`quiz-relampago`) — semana 3
- Múltipla escolha e V/F; cronômetro opcional por pergunta (15, 30 ou 60 s), mostrado como uma onda que vai subindo.
- Combo: a partir do 3º acerto seguido, +5 XP por acerto; o combo quebra no erro.
- Sem oxigênio. Termina ao acabar as perguntas (10 por padrão).
- Feedback imediato com explicação curta. Teclado: 1–6 / A–F; V e F no verdadeiro ou falso.
- **No palco (2026-10-18):** uma tempestade no mar, à noite. A onda do tempo é o próprio mar, que sobe na tela enquanto o relógio corre (perto do fim, a crista fica coral) e baixa quando você responde. No acerto, cai um raio (amarelo no combo) e as nuvens acendem por dentro; no erro, o trovão; no fim do tempo, a onda quebra. As nuvens são gomos macios com o contorno aceso pela lua, num teto que anda devagar. O fim fica no próprio jogo, com "Jogar de novo".

#### Memória (`memoria`) — semana 4
- Grade de conchas: 3×4 (6 pares), 4×4 (8) ou 4×5 (10). Vira duas por vez; par certo fica aberto, par errado desvira após ~1 s.
- Pontuação: pares encontrados + prêmio garantido por terminar + medalha de tempo (ouro ≤ 15 s/par, prata ≤ 25 s, bronze ≤ 40 s) + pérolas por poucas tentativas (≤ 1,5 × pares). Relógio e próxima medalha no topo.
- Erro de par só conta quando as duas conchas dele já tinham sido vistas (errar no escuro não pune).
- Ao achar um par, mostrar a definição por um instante (é aprendizado, não só memória).
- Acessível: setas + Enter; opção sem animação de virar. Deriva pares apenas de questões com enunciado e resposta curtos.

#### Adivinha Aí (`adivinha-ai`) — semana 4
- Uma resposta secreta e até 10 dicas. A dica 1 aparece sozinha; as outras, ao tocar em "Próxima dica" (em "garrafas com mensagem").
- Pontos = 11 − dicas usadas (mínimo 1), aplicados sobre o XP base da dificuldade.
- Comparação normalizada: sem acento, sem maiúsculas, sem pontuação; aceita as variações da lista "aceitas".
- 3 chutes por carta; depois revela a resposta e a explicação.

#### Caça ao Tesouro (`caca-ao-tesouro`) — semana 6
- Mapa SVG do fundo do mar com 5 a 8 paradas; cada parada é 1 pergunta e acertar revela o trecho seguinte.
- Erro custa 1 oxigênio (3 no total); sem oxigênio, a caça termina com prêmio parcial.
- Baú final: +25 XP e +5 pérolas (valores iniciais, ajustar na Semana 9).
- Geração automática: sorteia perguntas da trilha e ordena por dificuldade crescente; cada caça é diferente.

#### Chefão do Abismo (`chefao`) — semana 7
- Um chefão por profundidade (Raso, Recife, Caverna, Abismo); vida = nº de questões × 10.
- Acerto causa dano (fácil 10, médio 15, difícil 20); combo multiplica por 1,5. Erro = −1 oxigênio e o chefão "ataca".
- Vitória: +30 XP e +5 pérolas; sem perder oxigênio: +5 pérolas extras.
- Arte inicial em SVG simples (peixe-balão, moreia, peixe-lanterna e kraken); ilustrações finais na Semana 23.

#### Maré Alta (`mare-alta`) — semana 7
- Sobrevivência: as perguntas continuam até a água chegar ao topo da tela.
- Cada erro sobe a maré; a cada 5 acertos seguidos ela baixa um pouco. A dificuldade sobe aos poucos.
- Recorde (maior sequência) salvo por trilha; XP e pérolas pela tabela normal de acertos.

#### Forca do Náufrago (`forca`) — semana 8
- Palavra-chave com dica de tema; letras pelo teclado físico e por um teclado na tela. Normalização sem acento.
- 6 erros e a jangada se desmonta (sem imagens violentas). Dica extra custa 1 pérola.
- Palavras vêm do campo "palavras"; se não houver, do campo "tema" e das respostas curtas das questões.

#### Corrente do Tempo (`corrente-do-tempo`) — semana 8
- Itens embaralhados boiando na correnteza; o aluno arrasta para a ordem certa e confere (até 3 conferências).
- Pontuação por itens no lugar certo. Serve para cronologias, etapas e procedimentos.
- **Obrigatório:** alternativa por teclado (mover item com setas + Enter) e funcionamento por toque.

#### Tiro ao Alvo (`tiro-ao-alvo`) — 2026-10-18
- **Pedido do usuário:** "vamos deixar esse jogo da pistola como educacional para quem faz o enem ou ensino médio lá na sala de jogos". Sobre o conteúdo, a resposta foi "pode deixar como está o jogo agora, não muda nada".
- **O jogo:** arquivo `js/jogos/tiro-ao-alvo.js`, só o registro. É o mesmo jogo que morava na Sala de Descompressão: as 26 regras, os níveis, a barraca, a pistola, a festa e o álbum. Roda pelo motor `TiroAoAlvo.abrir(ctx, { modo: 'regras' })` de `js/descompressao/tiro.js`, que entrou no pacote `jogos` com `pistola-3d.js`. As regras e o desenho estão na seção 6 ("Tiro ao Alvo — o motor e o jogo das regras").
- **Onde aparece:** só nos cursos das salas Mergulho no Enem e Vestibular (`enem-*`) e Ensino Médio (`em-*`), pela regra `temConteudo`. Fica no grupo "Jogos rápidos".
- **XP e pérolas, pela economia, a cada rodada (`ctx.concluirRodada`):**
  - cada nível completo é um acerto: fácil nos níveis 1 e 2, médio no 3 e no 4, difícil do 5 em diante, com o combo da economia;
  - a placa do fim é o erro;
  - cada 4 pontos viram 1 de XP de bônus.
  - Exemplo: com 2 níveis e 21 pontos, a rodada dá +25 XP e +2 pérolas.
  - O cartão do fim mostra o que a rodada rendeu ("+25 XP e +2 pérolas no curso"). Sem nível completo, mostra "Complete um nível para ganhar XP no curso.".
  - O recorde é o do curso (`prog.jogos['tiro-ao-alvo'].melhor`), como nos outros jogos.
  - O log leva `pontos`, `nivel`, `motivo` e `seguidas`.
- **O álbum e o som** continuam no estado da Sala de Descompressão (`diver:v1:descompressao` → `jogos.tiro`): quem já tinha selos não perde nenhum.
- **Voltar e sair:** o fim mostra "Voltar para a Sala de Jogos". Tutorial próprio: `jogo-tiro-ao-alvo`.

#### Torre do Saber (`torre`) — semana 16
- Torre de 12 a 18 blocos, coloridos por dificuldade (verde fácil, azul médio, roxo difícil; roxo vale mais).
- Para tirar um bloco, responda uma pergunta daquela cor; errar aumenta a instabilidade; a torre cai em 100%.
- Modo 2 jogadores alternando no mesmo aparelho.

#### Caso Resolvido (`caso`) — "Operação Recife Sombrio" v2 (2026-10-02)
- **Antes da prova (2026-10-04):** em curso com este jogo, quando todas as fases estão feitas e a Prova final ainda não foi aprovada, o app convida a relaxar no detetive: caixa do Diver ao concluir a última fase (no lugar da sugestão de flashcards), botão no resultado, no cartão "Parabéns" do Início e um cartão "Antes da prova, relaxe" na tela da Prova final. Aberto por esse convite (`opcoes.antesDaProva`), o resultado do jogo oferece "Ir para a Prova final". A prova continua liberada normalmente.
- Arquivo `js/jogos/caso-resolvido.js`; precisa do bloco `casos` com `tipo: "operacao"` e `versao: 2` (`CasoResolvido.valido`). **Só o curso Cibersegurança Essencial tem esse bloco.** Não usa as questões da trilha. Sem datas na história: só "a Diver foi invadida".
- **Casos em rodízio:** `CasoResolvido.novoCaso` sorteia a solução (quem, com o quê, como, entre 10 de cada) e reparte os 9 que NÃO são a solução de cada coluna entre as 4 pérolas (A: 3/2/2, B: 2/3/2, C: 2/2/3, D: 2/2/2), cada um com uma frase de álibi ou descarte sorteada. Os 2 suspeitos da pérola D + o culpado vão para o interrogatório. Fechou o caso (acusação), aparece **"Abrir caso novo"** com outra Sombra.
- **Conteúdo que muda a cada tentativa** (inclusive no treino): os 8 e-mails (3 golpes + 5 legítimos de um banco de 11 + 12), o rastro em comum dos golpes (servidor, programa de envio ou endereço de retorno), a pessoa da rede social (5 perfis) e o código do cofre, as senhas do cardume, as 12 conexões do sonar e as anomalias dos registros.
- **E-mails:** os legítimos usam **endereços oficiais reais** (no-reply@accounts.google.com, notifications@github.com, account-security-noreply@accountprotection.microsoft.com, messages-noreply@linkedin.com, no-reply@zoom.us, feedback@slack.com, no-reply@dropbox.com, no-reply-aws@amazon.com) e os internos @diver.app.br; os golpes imitam esses endereços (accounts-google.com.verificacao-login.com, githubb-security.com, micros0ft-365.com, docusign-review.net, d1ver.app.br…). Cada e-mail tem `explicacao` e `pesquisa`: o resumo da triagem e o "O que revisar" dizem **"Pesquise na internet: …"**.
- **Oxigênio no lugar de créditos:** cada mergulho começa com 100%; erro e armadilha gastam ar (e-mail errado 10, link falso/anexo 20, rastro errado 10, senha fraca no cardume 5, tempo do cardume 10, conexão errada 5, senha/código errado 5, script 20, análise errada 10, zip 20, mentira errada 20). Pontos do mergulho = ar que sobrou + rapidez (+10/+5). A chave do mergulho (cardume/sonar) usa o mesmo tanque.
- **Mergulho 1 · Raso · A Isca:** triagem (Legítimo / É golpe, teclas L/G/C/↑↓), cabeçalho com SPF/DKIM/DMARC, endereço real dos links (1º toque mostra no celular), entrega com "revisar" → resumo com pesquisa + **Rastrear a isca** (o que os 3 golpes têm em comum) → pérola A.
- **Mergulho 2 · Recife · O Cardume:** chave **cardume de senhas** (senhas nadam; pegar 6 fortes em 60 s; sem animação, viram uma grade) → rede social de um colega sorteado, senha fraca com barra quente/frio, commits (segredo no histórico, script armadilha) e o cofre → pérola B.
- **Mergulho 3 · Caverna · O Sonar:** chave **sonar** (12 conexões, 10 s cada: Liberar/Bloquear, teclas L/B, explicação a cada decisão) → linha do tempo em 6 painéis com fuso BRT/AMT, marcar 3 anomalias (porta sem crachá, acesso de conta que não faz login, mudança sem revisão ou fora da janela), dicas, zip armadilha → pérola C.
- **Mergulho 4 · Abismo · O Interrogatório:** três suspeitos com retrato e depoimento + "Registros da noite"; um registro desmente o culpado → pérola D.
- **Mural do caso:** pérolas, colunas QUEM / COM O QUÊ / COMO com X para riscar, **uma acusação por caso** (depois do interrogatório): 50 por item certo e +100 pelas três (1 a 3 estrelas). A revelação mostra quem foi, com o quê e como, com as duas lições.
- **Tutorial em cada tela** (`Tutorial.guiar`): painel, Isca, rastro, cardume (chave e missão), sonar (chave), registros, interrogatório, caderno e mural. Abre na primeira visita e no botão "Como funciona esta tela?".
- **Lateral:** **Diário de bordo** (frases simples com ícone, hora e o ar gasto ou os pontos) e **Placar do cardume** (`ranking_caso`: soma de todos os casos; ver `docs/ATIVIDADE.md` 5b).
- **Pontos no app:** cada mergulho e a acusação viram um resultado na economia (bônus = pontos/2 de XP e pontos/10 de pérolas; acusação: pontos/4 de XP e 3 pérolas por estrela, com o teto da economia) e "detalhes de estudo" com explicação. Evento com `registro: { operacao, rodada, missao, treino, pontos_missao }`. Fechou o jogo antes de receber? O painel oferece "Receber agora" (`pendente`).
- **Estado:** `localStorage` `diver:v1:operacao` → `{ "recife-sombrio": { versao: 2, rodada, caso: { n, solucao, eliminacoes, frases, interrogados, contradicao, mergulhos, chaves, pistas, riscados, acusacao }, historico, log, pendente } }`. Estado antigo (sem `versao: 2`) recomeça do caso 1.

#### Duelo de Mergulhadores (`duelo`) — semana 17
- Dois jogadores no mesmo aparelho, em turnos; cada um responde uma pergunta por rodada (10 rodadas) disputando pérolas.
- Empate vai para morte súbita; depois do resultado, botão de revanche.
- Sem coleta de dados pessoais: apelidos apenas locais.

_Cruzadinha Submarina e Batalha de Turmas ao vivo ficam para depois do lançamento e ainda não têm especificação._

## 6. Sala de Descompressão (2026-10-02)
Área separada da Sala de Jogos dos cursos (barra lateral → **Respirar → Descompressão**, endereço `#descompressao`). **É para todo mundo:** não depende de curso, trilha ou matrícula, e os jogos **não usam as cartas** das trilhas. Os pontos valem **só o placar da sala** (nada de XP ou pérolas dos cursos; nada passa pela economia).

- **Arquivos:** `js/descompressao.js` (área, placar, horários de foco, abrir/fechar jogo) e um arquivo por jogo em `js/descompressao/`. Estilos em `css/descompressao.css` (prefixo `sd-`, porque `.sala` já é da Sala de Jogos).
- **Contrato do jogo:** `Descompressao.registrar({ id, nome, curto, icone, descricao, duracao, diario, abrir(ctx) })`; `abrir` devolve `{ emAndamento(), parar() }`. O `ctx` traz `container`, `voltar()`, `pontuar(pontos, extras)`, `hoje`, `estado()`/`gravar(parcial)` (guardados em `diver:v1:descompressao`), `recorde()`, `guia(passos, forcar)` (tutorial da tela) e o sorteio com semente (`aleatorio`, `hash`). O jogo abre em tela cheia (sem barra lateral), com o botão "← Sala"; sair no meio de uma partida pergunta antes (`UI.confirmar`).
- **Pontos:** `ctx.pontuar` grava um evento `jogo_concluido` **sem curso** com `detalhes.jogo = "sala-<id>"`, `pontos`, `data` e os extras do jogo. O placar vem da função `ranking_sala` (ver `docs/ATIVIDADE.md` 5c).
- **Ranking de cada jogo (2026-10-04):** todo jogo da sala tem o seu ranking global (todo mundo junto), com **Este mês** e **Total**. Para não poluir a tela, a lista só aparece numa janela: na sala, **um botão "Ver ranking"** no topo (abre no geral, com a escolha do jogo); dentro de cada jogo, o botão de troféu no topo da partida abre o ranking daquele jogo (`Descompressao.abrirRanking(id)`, janela `#sd-ranking`). Na janela: pódio com medalhas, top 10, a sua linha mesmo fora do top 10, "Você está em Xº de N" e a regra de pontos do jogo. Sem conta, mostra só os seus recordes e convida a entrar. Tudo sai da mesma `ranking_sala(p_jogo, p_periodo)`: `p_periodo = 'mes'` ou `'geral'` (total).
- **Horários de foco:** admin e professores podem fechar a sala para os alunos (tabela `sala_bloqueios`); admin e professor nunca ficam presos. Ver `docs/ARQUITETURA.md`.
- **Dicionário brasileiro** (`js/dicionario.js`): VERO, o corretor do LibreOffice (LGPLv3/MPL; `data/dicionario/leia-me-vero.txt`), expandido em todas as formas, 4,4 milhões de palavras sem acento (Batata Quente). Os prefixos re, des, in, co, pro, pre e a vêm expandidos; os outros do VERO (aero, inter, proto, auto, sub, super, anti...) são conferidos na hora: vale prefixo + palavra da lista, com a regra do prefixo ("aero" + "porto"; "anti" + "rugas" = "antirrugas"). **Palavrões, termos sexuais, preconceituosos (racistas, homofóbicos, capacitistas, machistas) e temas pesados foram tirados de todas as listas** ao gerar os arquivos (a lista de bloqueio não fica no repositório, que é público). **Insultos leves são aceitos** como palpite (idiota, besta, babaca, otário, trouxa...), mas nunca entram no banco de palavras do dia. `Dicionario.existe(p)` / `existeJa(p)` (depois de `carregar()`), `tamanho(n)` (lista da Palavrinha) e `palavrasComuns()` (palavras do dia a dia tiradas dos nossos textos: as jogadas do robô). Acento e cedilha não contam.

#### Investigação (`sala-investigacao`) — 1 por dia, igual para todo mundo
- Navio Aurora: 8 suspeitos, 8 armas, 8 cômodos; a data sorteia a solução, a história do dia e as 21 pistas (álibis e descartes), espalhadas pelos 8 cômodos.
- **Cada cômodo tem um desafio** (sorteado pela data: igual para todo mundo). Venceu: todas as pistas do cômodo (2 ou 3) e +60. Não deu (ou desistiu): uma pista só e +10. Não dá para refazer no mesmo dia.
  - **Ponte · Cofre do capitão:** senha de 5 letras (palavra do mar), 6 tentativas, cores da Palavrinha, palpite conferido no dicionário.
  - **Enfermaria · E-mails:** triagem igual à Isca do curso de cibersegurança, **com o mesmo banco de e-mails** (`data/trilhas/ciberseguranca-essencial.json`, `casos[0].emails`): 2 golpes + 3 legítimos, endereço, links com o endereço real, cabeçalho (SPF/DKIM/DMARC); pode errar 1. O resumo explica cada um e diz "Pesquise na internet: …".
  - **Biblioteca · Mensagem cifrada:** cifra de César; gire a roda até ler e escreva a última palavra (3 tentativas).
  - **Salão · Câmera de segurança:** 5 pessoas passam no corredor; toque nos nomes na mesma ordem (a gravação passa 2 vezes).
  - **Casa de máquinas · Painel de fios:** ligue 5 termos do navio ao significado (bombordo, proa, leme...); até 2 erros.
  - **Cozinha · Receita embaralhada:** 3 ingredientes com as letras misturadas; até 4 erros (dica da 1ª letra).
  - **Porão · Caça-palavras:** 8×8, 4 palavras na horizontal ou vertical; toque na primeira e na última letra.
  - **Convés · Quem está mentindo?:** fatos confirmados + 3 depoimentos; uma chance.
- Caderno com ✕ (descartado) e ? (suspeito); duas acusações: errou, eu conto quantas das três escolhas estavam certas. Depois da acusação, os desafios que faltam fecham.
- Pontos: 60 por desafio vencido (10 se não deu) + 520 pela acusação certa na 1ª (260 na 2ª). Máximo 1000. Estado do dia salvo (`versao: 2`; estado antigo do dia recomeça).

#### Palavrinha (`sala-palavrinha`) — palavra do dia (igual para todo mundo) + Treino livre
- **Palavra nova todo dia, de 5 a 10 letras**, 6 tentativas; o tabuleiro tem o tamanho da palavra do dia.
- **Nosso banco** (`data/sala/palavras-do-dia.json`, 1.181 palavras do dia a dia, sem palavrões nem ofensas, escolhidas à mão e conferidas no dicionário) é embaralhado com semente fixa e a data escolhe a posição: **nenhuma palavra se repete por mais de 3 anos**. A partida guarda a palavra dela (`partida.alvo`): se o banco mudar no meio do dia, quem já começou continua com a mesma.
- Só vale palpite que existe no dicionário: `data/dicionario/palavrinha/<n>.txt`, uma lista por tamanho (5 a 10 letras, com todos os prefixos do VERO, sem palavrões); **o jogo baixa só a lista do tamanho do dia** (19 KB com 5 letras, 750 KB com 10). Senão: **"Essa palavra não faz parte do nosso dicionário brasileiro."** e a tentativa não é gasta. Teclado na tela e no teclado físico.
- **Treino livre** (botão no topo e no fim da palavra do dia): palavras sorteadas do mesmo banco (nunca a do dia; evita as 200 últimas do treino), quantas quiser, "Nova palavra" ao terminar.
- Pontos: palavra do dia (7 − tentativas) × 10; treino (7 − tentativas) × 2, até 60 por dia no placar (`detalhes.modo = "treino"`). Estatísticas da palavra do dia no aparelho: jogos, % de acertos, dias seguidos, distribuição.

#### Tiro de Reflexo (`sala-reflexo`) — à vontade, vale o recorde (2026-10-18)
- **Pedido do usuário:** "placas verdes onde a pessoa deve atirar ou vermelhas que perde, mas a cada fase vai diminuindo o tempo que a placa aparece, tem que ser um jogo de reação, e não deve aparecer placas ali onde a arma tampa". O jogo das regras (logo abaixo) saiu da sala.
- **Arquivo:** `js/descompressao/reflexo.js`, só o registro. O jogo é o **motor do Tiro ao Alvo**, `TiroAoAlvo.abrir(ctx, { modo: 'reflexo' })` em `js/descompressao/tiro.js`. A barraca, a pistola, o jato, os sons, o teclado, a tela toda, "reduzir movimento" e o "Em números" são os mesmos.
- **As placas:**
  - **Verde:** um disco claro com o alvo no meio e o anel do tempo na borda. O arco amarelo encolhe e fica coral no fim.
  - **Vermelha:** um octógono escuro com a borda branca e o X, como a placa de "pare".
  - Claro contra escuro, disco contra octógono e alvo contra X: dá para separar as duas sem depender da cor.
  - As placas nascem paradas (não deslizam nem pulam) e têm pelo menos 44 px.
- **As regras:**
  - Um jato numa vermelha acaba a partida na hora ("Placa vermelha!").
  - Cada verde que escapa gasta 1 de **3 tanques de oxigênio**. Os tanques ficam no placar, e o que esvazia pisca em coral, como no Mergulho. Na verde que escapou sobe um "Escapou!".
  - Sem tanque, a partida acaba ("Acabou o oxigênio!").
  - A vermelha que some só volta para trás do trilho.
  - Vale 1 ponto por verde.
- **As fases (a fase n):**
  - Pede 10 + 2(n − 1) verdes acertadas.
  - Cada placa fica de pé 1,6 s × 0,86^(n − 1), com no mínimo 0,45 s.
  - Uma placa nasce a cada 0,85 s × 0,9^(n − 1), com no mínimo 0,26 s.
  - Cabem até 2 + n/2 placas ao mesmo tempo, com no máximo 6.
  - As vermelhas vão de 22% a 45% das placas.
  - As verdes continuam nascendo até a fase fechar, porque uma verde pode escapar sem acabar a partida.
  - A faixa da fase diz quantas verdes ela pede e quanto tempo cada placa fica de pé ("Mais rápido!").
- **Longe da pistola:** a pistola acompanha a mira, então a zona dela é a soma dos contornos da pistola com a mira em 15 pontos do campo, parada e no coice. A conta é feita na primeira placa e de novo quando a tela muda de tamanho. A placa só nasce onde não cruza nenhum desses contornos (com 10 px de folga): nunca fica atrás da pistola.
- **Acerto justo:** a vermelha só conta dentro do octógono, sem folga. A verde conta na caixa toda, com a folga do dedo (10 px no toque e 6 no mouse). Se o ponto cai nas duas, vale a que está bem embaixo do jato.
- **Em números:** os pontos, a fase, a reação média e a mais rápida (do nascer da verde até o tiro). Não tem álbum.
- **Placar:** é novo (`sala-reflexo`) e começou do zero, a pedido do usuário. O recorde do Tiro ao Alvo que morou na sala (`sala-tiro`) continua contando no ranking geral. O log leva `acertos`, `nivel`, `segundos`, `motivo` (`vermelha` ou `escapou`) e `reacao` (a média, em ms).
- **Testes:** o gancho dos testes (abaixo) também tem `modo`, `zona()` (os contornos da pistola) e `naZona(x, y, w, h)`.

#### Tiro ao Alvo — o motor e o jogo das regras (morou na sala como `sala-tiro` até 2026-10-18)
- **Desde 2026-10-18 o jogo das regras fica na Sala de Jogos** dos cursos do Enem e do Ensino Médio, valendo XP (seção 5, "Tiro ao Alvo"). O que vem abaixo vale para os dois jeitos de jogar do motor: o das regras e o Tiro de Reflexo, logo acima.
- **Tela toda (2026-10-17, pedido do usuário: "mais bonito, divertido e use a tela toda"):** o jogo ocupa a janela inteira (`telaCheia: true` no contrato; a barra da Sala fica por cima, num degradê, com **Som**, **Tela cheia** de verdade onde o navegador deixa e **Ranking**; no celular, só os ícones, de 44 px). A regra e o placar ficam em pílulas no alto (no celular deitado, na mesma linha). Abertura e fim num cartão só, no desenho das Profissões; no celular deitado ele vira duas colunas e, nas telas bem baixas, encolhe para caber sem rolar.
- **A barraca na beira do mar** (tudo desenhado no `<canvas>`, com as cores dos tokens via `UI.cor`): céu e mar ao pôr do sol (sol, ilhota com coqueiro, reflexo), toldo listrado, luzinhas, bandeirinhas, colunas e balcão de madeira com peixinhos de pelúcia. O fundo e a moldura ficam guardados em imagens e só são refeitos quando a tela muda de tamanho.
- **A pistola e a água (2026-10-17, pedido do usuário: "mais realista", "som de água" e "satisfatório os tiros"; só desenho e som, o acerto continua decidido no clique):** desde o fim do dia (pedido do usuário: a mesma visão dos jogos de tiro, "mas de água"), a pistola é **em primeira pessoa**: no canto de baixo, à direita, vista por trás e segura por uma **mão de luva de mergulho**, com o braço na roupa de neoprene. É um modelo 3D pequeno, desenho nosso (`js/descompressao/pistola-3d.js`, no pacote `descompressao`, antes de `tiro.js`): prismas e cilindros em perspectiva no `<canvas>`, com luz de cima, vincos e contorno de figurinha. Tanque transparente com tampinha amarela e presilhas (a água fica sempre na horizontal do mundo, balança quando a pistola gira e solta bolhas), **manômetro** do lado (o ponteiro mostra a água que sobra), cano com anéis e mira, **bomba** que vai e volta enquanto a água recarrega, gatilho que puxa no tiro e cabo. Ela aponta para o meio da tela e **acompanha a mira só em parte**, como nos jogos em primeira pessoa (no celular em pé, fica de três quartos, virada para a esquerda); o **bico sobe quando a mira sobe** e desce quando ela desce (2026-10-18, pedido do usuário: estava invertido). Para subir e descer, ela gira em volta da frente do corpo: a mão desce um pouco e o alto dela não passa do trilho do meio; a mira em cima do placar conta como o alto do campo; quando uma placa passa atrás dela, **fica transparente** (40%) para a placa não sumir. No tiro: coice (o bico sobe e a pistola recua; tranco rápido, volta macia), névoa no bico e um **jato de verdade**, uma fita d'água que sai do furo do bico numa curva leve até o alvo (quase reta, num arquinho para cima), engorda e afina de leve, e leva um instante para chegar (de 0,08 a 0,18 s; a placa só tomba quando a água chega). Na placa: clarão, anel, uma **coroa de gotas** que se desfaz e cai, gotas voltando num leque, a **marca d'água** que escorre (por baixo do texto, que continua nítido) e uma tremidinha da barraca. No mar: ondinhas e a colunazinha do "ploc"; no ar, a água se espalha. Tanque vazio: o gatilho estala seco e o bico só pinga.
- **A luva (2026-10-18, pedido do usuário: "deixa mais real"; só o desenho):** a mão deixou de ser de prismas facetados e virou **peças macias**: o contorno de algumas esferas, liso, com a sombra em degradê (em faixas nos dedos, redonda na palma) e o brilho espalhado de tecido. O **polegar** é uma peça só, em falanges, com as **dobras** na junta, a **costura** por cima e a costura em volta da base; o indicador abraça o gatilho (a ponta aparece do lado esquerdo dele) e os outros três dedos dão a volta na frente do cabo; o **punho** tem a tira turquesa e a manga, a faixa. As peças da luva que se encostam formam um grupo: a **borda forte** fica só em volta dele e, dentro, só uma dobra fraca, para a mão não parecer feita de bolinhas. Onde a tela tem altura, a mão sobe um pouco (até 4% da tela) para a luva aparecer; no celular deitado, não (ali a pistola já chega perto do trilho do meio). O cabo passou a inclinar para trás, como numa pistola de verdade.
- **Três trilhos (fundo, meio e frente):** as placas são retangulares e sobem de trás do trilho; as de um trilho andam juntas e viram na beira (nunca uma passa por cima da outra); as do fundo são um pouco menores. A letra nunca fica menor que 12 px e a placa nunca menor que um alvo de dedo; a **barrinha embaixo** mostra o tempo que falta (amarela, coral no fim). Sem vão livre num trilho, a placa espera a próxima vez. No toque, a folga do acerto é de 10 px (no mouse, 6).
- **Por níveis.** Cada nível tem uma **regra** (26 simples: peixes, mamíferos, aves, bichos que voam, insetos, répteis, frutas, instrumentos, cores, capitais do Brasil, países da América do Sul, palavras com acento, pares, ímpares, maiores que 50, menores que 20, múltiplos de 3 e de 5, primos, contas que dão 10 ou 12, vogais, consoantes, círculos, triângulos, estrelas). Do nível 4 em diante pode vir **em dupla** ("Só PEIXES ou FRUTAS"); do 5, **"Tudo MENOS ..."**.
- **Sobe de nível quando acerta todas as placas certas da leva:** 8 no nível 1, +5 a cada nível. O 1 é aquecimento; do 2 em diante a placa dura bem menos (2,05 s → mínimo 0,9 s), nasce mais rápido, fica menor, desliza com o trilho (e pula na haste a partir do 3) e aparecem até 4 + nível ao mesmo tempo. Placas não nascem uma em cima da outra.
- **Placa errada = eliminação. Placa certa que escapa = eliminação.** A tela diz por quê ("GOLFINHO não vale em “Só os PEIXES” (é mamífero)"). Tanque de 12 jatos que recarrega sozinho.
- **A festa (2026-10-17; só desenho e som, os pontos não mudam):** a placa acertada **tomba** para trás do trilho, com respingo e **"+1"**; de 5 em 5 acertos seguidos (sem jato na água), o selo **"5 seguidas!"** no balcão; a **régua de risquinhos** no placar conta as placas certas do nível (de 5 em 5, um mais alto); a regra nova entra **em fatia** e a virada de nível é uma faixa no próprio jogo ("Nível 1 completo! Mandou bem, Diver!", "1 selo novo no álbum"); no erro, um **véu de pixels coral** cobre a barraca e a placa culpada fica acesa ("Não vale!" ou "Escapou!"); no fim, **"Em números"** (os pontos contam de zero, nível, seguidas e tempo), o recorde (confete só no recorde novo) e a linha do álbum.
- **Álbum de regras:** 26 selos, um por regra simples, em 6 famílias (Bichos, Coisas, Lugares, Números e contas, Letras, Formas); completou um nível, ganhou o selo da regra (numa dupla, os dois; em "Tudo MENOS A", o de A). Fica no estado da Sala (`diver:v1:descompressao` → `jogos.tiro.selos`, via `ctx.gravar`, gravado na hora), sem tabela nova; a escolha do som também (`jogos.tiro.som`). "Ver álbum" na abertura e no fim.
- **Som e teclado:** sons sintetizados na hora, sem arquivo. Os de água saem de ruído filtrado: o chiado do jato enquanto o gatilho está apertado, o "splash" na placa com as gotinhas pingando depois, o "ploc" no mar, as gotas no ar, o estalo seco do tanque vazio e o "toc" da placa que termina de tombar; cada tiro sai com um tiquinho de tom diferente, e um compressor segura o volume quando tem muito jato (os volumes foram medidos numa gravação sem tocar, para nenhum som abafar os outros). Acerto, seguidas, nível e erro continuam como antes. No teclado, as **setas** mexem a mira (com Shift, mais rápido) e o **espaço** ou o **Enter** atiram; o "?" mostra esses atalhos (`UI.atalhosDaTela`). O contorno amarelo do foco no palco só aparece para quem usa o teclado.
- **Reduzir movimento:** as placas não sobem, não deslizam nem pulam; a pistola aponta na hora, sem balanço, e a água do tanque fica parada; o jato aparece inteiro e some; sem respingo, coroa, ondinhas, tremidinha, queda, fatia, véu animado, anel pulsando nem confete (o jogo continua acelerando pelo tempo de cada placa).
- A régua do nível com mais de 100 placas encosta os risquinhos (vira uma barra, com o de 5 em 5 mais alto) para não vazar do placar.
- Pontos: **1 por acerto**; vale o recorde. Para os testes automáticos há um gancho só quando `window.__diverTeste` existe (`jogo()`, `atirar(x, y)`, `mira()`, `medidas()`, que também dá a mão da pistola e quanto da altura ela ocupa, `silhueta()`, o contorno dela na tela, e `cobre(x, y)`, se um ponto fica atrás dela).

#### Batata Quente (`sala-batata`) — à vontade
- Uma sílaba (lista `data/sala/silabas.json`: 2 letras no começo, depois metade de 3 letras); digite uma palavra do dicionário com ela (3+ letras, sem repetir na partida) antes de a bomba explodir. Pavio de 10, 15 ou 20 s, menos 0,4 s por rodada (mínimo 5 s). 3 vidas; usou todas as letras de A a Z (sem K, W e Y)? +1 vida (até 5).
- **Sozinho:** a bomba volta sempre para você; o pavio começa no tempo escolhido e encurta 0,12 s por palavra e 1,2 s por nível (mínimo 3,5 s); **o nível sobe a cada 30 s** (do 3 em diante metade das sílabas tem 3 letras; do 5, três em cada quatro). 3 vidas. Pontos: 1 por palavra + 5 por nível alcançado; vale o recorde (`detalhes.modo = "sozinho"`).
- **Treino:** igual ao Sozinho (o nível também sobe), mas a bomba não tira vida e não vale ponto; "Encerrar treino" quando quiser.
- **Outros modos:** contra o robô (Fácil, Médio, Difícil: tempo de resposta, chance de travar e tamanho das palavras; o Difícil caça as letras que faltam no alfabeto dele), **lado a lado** no mesmo computador (dois nomes, uma caixa de texto que passa de um para o outro) e **online** (sala com código de 4 letras; o banco confere vez, prazo, sílaba e repetidas nas funções `batata_*`; o app confere o dicionário; quem sai perde).
- Pontos: vitória online 30; robô 10/15/25; lado a lado e treino 0. As vitórias somam até 150 por dia; o recorde do Sozinho soma à parte.

#### Pit Stop Mental (`sala-pitstop`) — à vontade, vale o recorde
- Arquivo `js/descompressao/pitstop.js`. Box de uma equipe de corrida **visto de cima** (SVG nosso, sem marcas de categorias de corrida): carro nas marcas, 8 mecânicos (pistola + pneu em cada roda), semáforo, cronômetro grande e o tempo do rival.
- **4 contas por pit stop, uma por roda**, com o valor de x ("x + 4x·1 = ?", x = 3 → 15). Acertou: a dupla troca o pneu e levanta o braço; as 4 prontas: luz verde e o carro arranca.
- **Tempo:** começa no tempo base (6 s na fase 1, −0,1 s por fase, mínimo 5 s). Acerto perfeito (dentro da barra, 2 s + folga nas contas longas) −1 s; bom (até 2,5 s depois) −0,6 s; lento −0,25 s. Erro +0,8 s: a porca cai ou a pistola trava e a próxima conta demora um instante. Abaixo de 2,5 s "Pit stop recorde!", até 4 s "Pit stop rápido", acima "Pit stop lento". Bater o rival (4 s na fase 1, −0,18 s por fase, mínimo 2,2 s) libera a próxima fase.
- **Combo:** 3 acertos seguidos ligam o **box sincronizado**: a próxima resposta certa troca duas rodas.
- **Fases (contas):** 1–2 simples (2x + x); 3–4 ordem das operações (3x − 2·x + 6 ÷ 2); 5–6 produtos de dois termos (4x·3 + 2x, x·3x); 7–8 parênteses (2(x + 3) − x); 9+ tudo misturado com x negativo. O gerador foi conferido em 36 mil contas (resultado e passo a passo).
- **Modos:** Alternativas (4 opções, teclas 1 a 4, com pegadinhas de sinal e de ordem) ou Digitar (aceita "-" e "−"; vale ×1,5).
- **Resumo:** tempo de cada roda, as contas erradas resolvidas passo a passo e o melhor pit stop.
- **Pontos:** recorde 100, rápido 60, lento 20; +30 se vencer o rival; ×1,5 no Digitar. O placar guarda o recorde. Estado (modo, fase, melhor tempo) em `diver:v1:descompressao` → `jogos.pitstop`.

#### Cardume (`sala-cardume`) — à vontade, vale o recorde (2026-10-04)
- Arquivo `js/descompressao/cardume.js`. Corrida com cardume em **3D falso no `<canvas>`** (sem biblioteca): câmera atrás e acima, pista de areia flutuando no mar, névoa ao longe. Inspirado no gênero "crowd runner", com arte e nomes 100% nossos.
- **Controle:** o Diver nada sozinho; arraste para os lados (dedo ou mouse) ou use as setas/A–D.
- **Cardume:** Divers perdidos esperam no caminho (de frente, acenando); encostou, entram no cardume e voam para o lugar na formação (espiral). Desenhamos até 140; o número em cima do líder pode passar disso.
- **Portais de bolha** em pares: turquesa soma (+N), amarelo multiplica (x2, x3); coral tira (−N, ÷2, ÷3). Às vezes os dois são bons (dilema: +10 ou x2?). **Cor que engana (2026-10-04):** a partir da fase 2, às vezes a placa verde traz o número ruim (−20, ÷2) e a vermelha o bom (x2): vale o número, não a cor (25% dos portais na fase 2, 45% da 3 em diante; nunca num dilema).
- **Armas d'água (2026-10-04):** ficam no chão, girando sobre um anel de luz, com gotinhas que mostram quantos jatos soltam (azul 1, amarelo 2, coral 3). Quem passa por cima ganha dois cilindros nas costas (a cor da arma) e o cardume **atira sozinho**: o líder e mais alguns Divers (cresce com a raiz do tamanho do cardume, até 10), 1 a 3 jatos cada, a cada 0,3 s. A primeira arma vem logo no começo da fase; as seguintes sobem de nível. A arma vale até o fim da fase. Da fase 3 em diante ela fica perto da beira, às vezes com uma água-viva do lado.
- **Inimigos o tempo todo (2026-10-04), todos com cara de mau** (olhos acesos, sobrancelha em V, dentes): bando de **Divers do mal** (gelatina vermelha, moicano, máscara de bandido; 1 de vida cada), **moreia** (rápida, em zigue-zague), **baiacu**, **caranguejo capanga** (tanque) e **tubarão brutamontes** (fase 3+). A vida aparece em cima da cabeça: cada inimigo derruba tantos Divers quanto a vida dele, e cada jato tira 1. Derrubou com água: pontos (`INIMIGOS[].pts`). Ritmo por fase em `ritmoInimigos(n)`: fase 1 a cada ~2,5 s, fase 2 ~1,7 s, fase 3+ menos de 1 s e eles **perseguem o cardume**.
- **Perigos:** água-viva (parada), ouriço (rola de um lado para o outro), coral giratório (varre a pista) e **pedra −N** (absorve até N Divers e quebra). Cada Diver que encosta vira bolhas.
- **Fases 1 e 2 ensinam; da 3 em diante é MUITO difícil** (`DIFICIL = 3`): nas fases 1 e 2 o líder sozinho só leva um esbarrão e portal nunca baixa de 1; da 3 em diante **portal pode zerar o cardume**, **o líder sozinho cai** no primeiro toque, os valores ruins pesam mais (−8 a −24, ÷3), as pedras são maiores e o chefão fica bem mais forte. Calibrado com um robô que lê os números, pega as armas, mira e desvia: passa sempre das fases 1 e 2 e para na fase 3 em 12 de 14 partidas.
- **Fases de ~30 s:** 25 s de corrida (velocidade 9 → 13,5) + o chefão. Águas em rodízio: Raso, Recife, Caverna, Abismo. Chefões: Baiacu Bravo, Polvo Rei, Caranguejo de Ferro e Tubarão Martelão.
- **Chefão (cara de mau, aura vermelha):** o cardume ataca em ondas; cada Diver que chega tira vida (vale pelo grupo que representa) e cada jato tira 0,3. Durante a briga dá para mover o cardume. O chefão revida de tempos em tempos e derruba alguns, e **chama reforços** (bando de Divers do mal). Da fase 3 em diante ele também **atira bolas de espinho**: o alvo pisca em vermelho no chão por 1 s, e quem estiver nele cai. A vida é calibrada pelo **melhor caminho possível** da fase (30% na fase 1, 40% na 2, 70% na 3 e +8% por fase, até 100%) mais um bônus (6 por fase nas fases 1 e 2; 40 + 30 por fase da 3 em diante). Venceu: câmera lenta, confete, baú da sorte (9 baús, 10 a 100) e próxima fase. Perdeu: fim de jogo.
- **Pontos (só o placar da sala):** por fase vencida, 50 × fase + Divers que sobraram + pérolas pegas + inimigos derrubados com água + baú. Fim de jogo grava o total (`ctx.pontuar`, `detalhes.fase`); sair no meio grava o que já tinha (`saiu: true`). O placar guarda o recorde.
- **Personagens "gelatina":** desenhados uma vez em sprites (costas, frente, líder, as versões com os cilindros de cada arma e o Diver do mal; 8 quadros de nado), com contorno turquesa, brilho de plástico, máscara amarela e snorkel coral; na hora de desenhar entram squash & stretch, pulinho, inclinação na curva e "pop" elástico ao entrar no cardume.
- **Satisfação:** som sintetizado na hora (Web Audio, botão 🔊/🔇 guardado em `jogos.cardume.som`), pitch subindo no combo, vibração curta no celular, bolhas, estrelinhas, textos que pulam, tremida de tela. Com "reduzir movimento": sem tremida, sem câmera lenta, sem confete e menos partículas.
- Gancho de teste só quando `window.__diverTeste` existe (`cardume.partida()`, `mover(x)`, `avancar(seg)`, `proxima()`).

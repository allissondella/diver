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
| **Mergulho** (`mergulho`) | Quiz por fases com oxigênio. Cada fase é uma profundidade; errou, perde oxigênio; mostra na hora se acertou e a explicação. | Múltipla escolha | Fases = profundidades do mar | Pronto |
| **Simulado** (`simulado`) | Sem oxigênio e com cronômetro (1 minuto por questão). 5, 10 ou 20 questões da trilha (ou todas), correção só no final, nota de 0 a 10 e histórico de notas. | Múltipla escolha | A prova do mergulho | Pronto |
| **Revisão** (`revisao`) | Só as questões que o aluno errou ou marcou com "Marcar para revisar". Acertou na revisão, a questão sai da lista. | Questões erradas ou marcadas | Resgate do que ficou no fundo | Pronto |
| **Prova final** (`prova`) | Cronometrada, sem feedback no meio, questões sorteadas da trilha inteira e nota mínima para aprovação (bloco opcional `prova` na trilha). Liberada ao completar todas as fases. | Múltipla escolha | O último mergulho | Pronto |

### Jogos rápidos (2 a 5 minutos)
_Partidas curtas para revisar um pouquinho a cada dia._

| Jogo | Como funciona | Conteúdo usado | Roupa de mar | Semana |
| --- | --- | --- | --- | --- |
| **Cartas do Fundo** (`cartas-do-fundo`) | Flashcards: vire a carta, veja a resposta e diga se sabia, quase sabia ou não sabia. Alimenta as caixas de revisão espaçada (Leitner). | Qualquer trilha (derivado das questões) | Cartas guardadas em um baú | Pronto (v0) |
| **Quiz Relâmpago** (`quiz-relampago`) | Múltipla escolha e verdadeiro ou falso, com cronômetro opcional e combo de acertos (a partir do 3º seguido, +5 XP). | Qualquer trilha (derivado) | O tempo é uma onda que vai chegando | Pronto (v0) |
| **Memória** (`memoria`) | Jogo das cartas viradas: encontre os pares termo ↔ definição. Menos tentativas e menos tempo, mais pontos. | Pares (ou derivado das questões) | Conchas que abrem e fecham | Pronto (v0) |
| **Adivinha Aí** (`adivinha-ai`) | As dicas aparecem uma a uma. Quanto antes você acertar, mais pontos. Aceita a resposta sem acento e sem maiúsculas. | Adivinhas (até 10 dicas por carta) | Dicas que chegam em garrafas com mensagem | Pronto (v0) |

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
| **Caso Resolvido** (`caso`) | Colete pistas respondendo perguntas e deduza quem, onde e como. Cada suspeito, local e objeto está ligado a um conceito. | Casos (ou gerados a partir dos temas) | Mistério num navio naufragado | 17 |
| **Duelo de Mergulhadores** (`duelo`) | Dois jogadores no mesmo aparelho, em turnos, disputam as pérolas. Empate, placar e revanche. | Qualquer trilha (derivado) | Dois mergulhadores, um tesouro | 17 |

### Depois do lançamento (v2)
_Já pensados, mas ficam para depois da versão 1.0._

| Jogo | Como funciona | Conteúdo usado | Roupa de mar | Semana |
| --- | --- | --- | --- | --- |
| **Cruzadinha Submarina** (`cruzadinha`) | Mini palavras cruzadas montadas com as palavras-chave e dicas da trilha. | Palavras-chave com dica | Bolhas com letras | v2 |
| **Batalha de Turmas ao vivo** (`batalha`) | Turmas competem ao mesmo tempo, coordenadas pelo professor, em esquadras. | Trilha da turma | Esquadras em alto-mar | v2 |

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
  "casos":      [ { "titulo": "O sumiço da pérola", "suspeitos": [], "locais": [], "objetos": [], "pistas": [], "solucao": {} } ]
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
| Adivinha Aí, Corrente do Tempo, Caso Resolvido | **precisam** do bloco próprio; sem ele, o card na Sala de Jogos aparece como "Precisa de conteúdo". |

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
  bonus: { xp: 0, perolas: 0 }                 // bônus próprio do jogo, dentro dos limites da economia
}
```

## 4. Checklist de aceitação (todo jogo novo)
- [ ] Registrado em `js/jogos/registro.js`; card na Sala de Jogos com o estado certo (disponível / precisa de conteúdo / em breve).
- [ ] Funciona com uma trilha de 20 questões (derivada) ou mostra "Precisa de conteúdo".
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

#### Quiz Relâmpago (`quiz-relampago`) — semana 3
- Múltipla escolha e V/F; cronômetro opcional por pergunta (15, 30 ou 60 s), mostrado como uma onda que vai subindo.
- Combo: a partir do 3º acerto seguido, +5 XP por acerto; o combo quebra no erro.
- Sem oxigênio. Termina ao acabar as perguntas (10 por padrão).
- Feedback imediato com explicação curta. Teclado: 1–6 / A–F; V e F no verdadeiro ou falso.

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

#### Torre do Saber (`torre`) — semana 16
- Torre de 12 a 18 blocos, coloridos por dificuldade (verde fácil, azul médio, roxo difícil; roxo vale mais).
- Para tirar um bloco, responda uma pergunta daquela cor; errar aumenta a instabilidade; a torre cai em 100%.
- Modo 2 jogadores alternando no mesmo aparelho.

#### Caso Resolvido (`caso`) — semana 17
- Um caso tem suspeitos, locais e objetos ligados a conceitos; cada pergunta respondida revela uma pista.
- No fim, o aluno deduz quem, onde e como. Ambientação: navio naufragado.
- Gerador de casos a partir dos temas de uma trilha (Semana 17).

#### Duelo de Mergulhadores (`duelo`) — semana 17
- Dois jogadores no mesmo aparelho, em turnos; cada um responde uma pergunta por rodada (10 rodadas) disputando pérolas.
- Empate vai para morte súbita; depois do resultado, botão de revanche.
- Sem coleta de dados pessoais: apelidos apenas locais.

_Cruzadinha Submarina e Batalha de Turmas ao vivo ficam para depois do lançamento e ainda não têm especificação._

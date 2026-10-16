# Mapa das Profissões: camada de interações (adendo v1.1)

> Complementa `docs/MAPA_PROFISSOES.md`. Proposta de 14/10/2026, a partir de referências de fora (abaixo) e dos dados do Google Trends do projeto. Tudo aqui é opcional por ficha: uma ficha sem `dna` ou sem `agora` continua válida.
> **Situação:** as seis entradas já estão na implementação de referência (`docs/prototipos/profissoes/profissoes.html`; no app desde 2026-10-16), com os infográficos em `js/profissoes-infograficos.js`. O que falta é o que depende do app: votos reais, coleção de cartas no Perfil, ranking do log e as fases 2 e 3.

## O que o mundo faz de bom

| Referência | O que ela acerta | O que o Diver leva |
|---|---|---|
| 13歳のハローワーク (Japão): site do livro de Ryu Murakami, 1.034 profissões, perguntas respondidas por profissionais e ranking mensal das mais vistas | Virou instituição cultural para adolescentes porque mistura enciclopédia com gente de verdade e com um ranking vivo | Ranking "Profissões mais exploradas este mês" na capa do Mapa, e a seção "Pergunte a quem vive isso" |
| Google Career Dreamer (2025) | Conversa curta → padrões → uma frase de identidade que a pessoa leva consigo | O "rastro" da Maré de cartas e a Carta Diver, algo para guardar e compartilhar |
| Roadtrip Nation (EUA) | Vídeos curtos de profissionais reais contando como chegaram lá; "becoming is a journey" | "Como eu cheguei aqui": 60 segundos de áudio ou vídeo de um profissional por ficha, gravado pelo celular |
| NYT "You Draw It" e The Pudding | Fazer a pessoa chutar antes de mostrar o dado. O erro do chute é o que ensina | "Chute o salário" e, depois, "Chute a nota de corte" |
| Apps de emprego estilo deslizar (LinkedIn Students, 2016, e sucessores) | Decisão rápida, baixo custo, muitas repetições; o perfil surge do uso | "Maré de cartas" |
| Dilemas com voto (formato clássico de jornalismo interativo) | Ver como os outros responderam prende; a resposta de um especialista fecha | "O que você faria?", com votos reais dos Divers e a resposta de um profissional |

## As seis entradas

### 1. Maré de cartas (`#profissoes-cartas`)

- Uma carta por profissão: área, nome e um "Você sabia?" com fato verificado e fonte (campo `carta.fato` e `carta.fontes`).
- Botões "Não é pra mim" e "Me interessa", setas do teclado e gesto de arrastar no celular.
- Ao fim de uma rodada (7 a 10 cartas): o "rastro", com as profissões que interessaram, as `tags` em comum e **uma sugestão fora da lista** (profissão não vista que compartilha as tags dominantes). A sugestão abre a ficha.
- "Me interessa" marca "na mira" automaticamente. "Não é pra mim" guarda a decisão para não repetir a carta na próxima rodada.
- Log: `profissao_carta` com a decisão.

### 2. Chute o salário (dentro da ficha, seção "Quanto ganha")

- Antes de mostrar o número, um controle deslizante pede o chute. Ao confirmar, aparece a faixa comum de contratação (percentis 25 e 75), a média, o piso por lei quando houver e a marca do chute, com "você chutou X% acima/abaixo".
- Segunda rodada quando a ficha tiver caminho técnico (técnico de enfermagem, por exemplo).
- Variante futura: "Chute a nota de corte", com os dados do Sisu que a Sala Enem já usa.
- Guardar o chute no log (`profissao_chute_salario`, com o valor) permite, no futuro, mostrar "a maioria dos Divers chuta acima". Nunca inventar esse número antes de ter os dados.

### 3. Agora mesmo (topo da ficha, quando a ficha tiver `agora`)

- Lê o relógio do aparelho e mostra o que um profissional provavelmente está fazendo naquela hora, com uma régua de 24 h e o trecho atual destacado.
- Campo `agora[]`: `{ "de": 7, "ate": 10, "texto": "..." }`, cobrindo as 24 horas, mais `agora_nota` (ex.: "Na escala 12 por 36, metade dos dias são de folga").
- Cenas típicas, sempre com a nota "a revisar com profissionais; cada serviço é diferente".
- Efeito colateral bom: a ficha muda ao longo do dia, o que dá motivo para voltar.

### 4. Carta Diver e DNA (dentro da ficha, seção própria)

- Campo `dna`: seis eixos de 0 a 100, iguais para todas as profissões: Pessoas, Pressão, Corpo, Rotina, Números, Criatividade. Radar em SVG com a profissão em turquesa.
- O aluno ajusta o próprio DNA uma vez (seis controles), que fica salvo no estado e é reaproveitado em todas as fichas. O radar sobrepõe os dois e calcula a afinidade (100 menos a média das diferenças).
- "Gerar minha carta": carta colecionável com os seis números, a frase e a afinidade. No app, vira imagem (canvas) para compartilhar e entra na coleção do perfil. Colecionar as 22 cartas da Onda 1 e 2 é a conquista "Baralho completo".
- Os valores do `dna` nascem como estimativa e são calibrados por 3 a 5 profissionais da área. Marcar `dna_calibrado: false` até então. É a mesma estrutura que o Teste Vocacional (Fase 3) vai usar.
- Afinidade é informação, não veredito: nunca mostrar "você não serve para isso". Abaixo de 50%, o texto é "menos parecido com você hoje; vale olhar o que pesa".

### 5. O que você faria? (dentro da ficha, seção própria)

- Um dilema real da profissão, 3 opções, votação. Depois do voto: distribuição dos votos reais dos Divers (derivada do log, não de tabela nova) e um bloco "O que a lei diz" ou "O que a ética da profissão diz", com fonte.
- Enquanto não houver 50 votos, mostrar só a resposta, sem percentuais, para não exibir número fraco.
- Fase 2: "Um profissional responde", com áudio de 30 a 60 segundos gravado por um profissional revisor.
- Campos: `dilemas[]` com `situacao`, `opcoes[]` (texto e `recomendada`), `resposta`, `fontes[]`.

### 6. Onde se busca (capa do Mapa e dentro da ficha)

- Barras por estado com a parcela das buscas do estado sobre o curso (Google Trends, 2021–2026, dados já baixados em `data/profissoes/trends/`).
- Toggle para comparar duas profissões lado a lado, com uma frase de leitura ("Enfermagem pesa mais no Norte e Nordeste; Contabilidade, no Sul e Centro-Oeste").
- Fase 2: trocar por mapa do Brasil em SVG (há um mapa do Brasil no "Antes de mergulhar" que pode ser reaproveitado) e cruzar com salário médio por UF do Novo Caged.
- Guardar os CSV do Trends com data de extração; a leitura envelhece em um ano.

## Duas ideias para a capa do Mapa

- **Ranking vivo:** "Mais exploradas este mês", derivado de `profissao_vista`. Como o 13hw japonês, mas com um aviso: "o ranking mostra curiosidade, não qualidade".
- **Pergunte a quem vive isso:** o aluno deixa uma pergunta na ficha; o admin encaminha a profissionais revisores; a resposta publicada ganha nome, profissão e data. Começa manual, por e-mail.

## Ordem sugerida de implementação

1. Fase 1 (junto com o que já está na especificação): Maré de cartas, Chute o salário e Agora mesmo. São as três de maior efeito por hora de código e só usam dados que a ficha já tem.
2. Fase 2: Carta Diver com DNA calibrado, O que você faria? com votos reais, Onde se busca com mapa.
3. Fase 3: Pergunte a quem vive isso, áudios "Como eu cheguei aqui", Chute a nota de corte.

## Campos novos no JSON da ficha (todos opcionais)

```json
"carta": { "fato": "...", "fontes": ["id"] },
"agora": [ { "de": 0, "ate": 6, "texto": "..." } ],
"agora_nota": "...",
"dna": { "pessoas": 90, "pressao": 80, "corpo": 70, "rotina": 45, "numeros": 30, "criatividade": 35 },
"dna_calibrado": false,
"dilemas": [ { "situacao": "...", "opcoes": [ { "texto": "...", "recomendada": true } ], "resposta": "...", "fontes": ["id"] } ]
```

A ficha `enfermagem.json` já traz `carta`, `agora`, `dna` e um `dilema` preenchidos como exemplo.

## A ficha que se conta ao rolar (2026-10-16)

Pedido do usuário: a ficha mais moderna e interativa, "como a página da Apple, que vai carregando ao descer", **sem mudar uma vírgula do conteúdo**. O código fica em `js/profissoes.js` (`telaFicha`, `blocoSalario`, `citar`, `abrirFonte`) e `css/profissoes.css` (bloco "Ficha que se conta enquanto rola").

- **Abertura em tela cheia:** área, nome e frase entram palavra por palavra; "Role para mergulhar" leva à primeira parte.
- **Cenas:** cada parte (`.prof-cena`) acende uma vez ao entrar na tela (IntersectionObserver); algumas se montam:
  - o relógio do "Agora mesmo" gira até a hora atual;
  - os números contam do zero até o valor exato do JSON;
  - a linha "Quanto tempo até trabalhar" cresce etapa por etapa;
  - o gráfico do DNA se monta.
- **Guia fixo:** barra de progresso da leitura, um chip por seção (o da seção atual fica aceso) e o botão "Próximo" no pé de cada parte.
- **Doca no rodapé:** "Pôr na mira", "Viver um dia" e "Mito ou verdade" aparecem depois da abertura.
- **Salário escondido:**
  - O cartão "Média de contratação" mostra "R$ ?" e "Chutar primeiro".
  - A tabela de pisos e médias fica coberta (`inert`), sem ninguém ler ou focar os valores.
  - O 1º chute revela a média do topo; o fim do chute revela tudo. "Prefiro só ver os números" pula o jogo.
  - Fica guardado em `estado.salarioRevelado`.
- **Fontes guardadas:**
  - Cada citação vira uma bolinha numerada, com alvo de 44 px.
  - O toque abre a fonte num cartão: perto da bolinha no computador; subindo do rodapé no celular. Fecha no X, no Esc, tocando fora ou rolando.
  - A lista completa só abre no botão "Ver as N fontes desta ficha".
- **Mais toque:**
  - "O que faz / O que não faz" vira uma chave;
  - "O que ninguém te conta" vira cartas para revelar uma a uma (ou "Revelar todos");
  - no celular, a tabela de valores vira cartões e o gráfico do chute rola dentro da caixa.
- **Reduzir movimento:** nada se mexe e tudo aparece pronto. O tutorial da área subiu para a versão 2.

# Diver — identidade visual

Cores medidas diretamente da tela do protótipo. **Não invente cores novas**: se precisar de uma variação, derive das existentes e registre aqui.

## Sistema de tokens (`css/tokens.css`, Onda 1 da revisão de design, 2026-10-15)
Todo valor visual mora em **um arquivo só**, `css/tokens.css`, carregado antes de todos os outros CSS. Os outros arquivos **só consomem** `var(--token)`: nada de hex, `font-size` em rem solto, `z-index` numérico nem largura de `@media` fora dos 4 cortes. O que garante isso é o auditor: `node scripts/auditar-design.mjs` (seção "Como auditar"). Os nomes abaixo são **exatamente os do código**.

### Cor
| Token | Hex | Uso |
| --- | --- | --- |
| `--fundo-0` | `#06172D` | O mais fundo: base do degradê, cortina |
| `--fundo-1` | `#0B2545` | Base do app (nome antigo `--marinho`) |
| `--fundo-2` | `#0E2B4F` | Barra lateral e painéis fixos (feedback do quiz) |
| `--superficie-1` | `#12325A` | Cartão padrão (nome antigo `--superficie`) |
| `--superficie-2` | `#1A416F` | Cartão sobre cartão, hover |
| `--superficie-3` | `#1F4B7E` | Campo de formulário, menu aberto |
| `--superficie-turquesa` | `#0C354C` | Cartão selecionado (com borda turquesa) |
| `--borda-sutil` / `--borda-forte` | gelo a 12 % / 24 % | Bordas (nome antigo `--borda` = sutil) |
| `--borda-foco` | `#FACC15` | Anel de foco |
| `--primaria` | `#14B8A6` | Turquesa Recife: botões, seleção, progresso, marca (nome antigo `--turquesa`) |
| `--primaria-clara` | `#5EEAD4` | Texto turquesa sobre fundo escuro (`--turquesa-claro`) |
| `--primaria-hover` / `--primaria-pressionada` / `--primaria-sombra` | `#2CCBB9` / `#0EA597` / `#0C8276` | Estados do botão primário; a sombra é a borda inferior 3D |
| `--primaria-escura` | `#0C7A6E` | Texto turquesa sobre fundo claro |
| `--destaque` | `#FACC15` | Amarelo Sol: XP, conquistas, selo "Recomendado" (`--amarelo`) |
| `--sucesso` | `#86EFAC` | Acertou, barra completa (`--verde`) |
| `--erro` | `#FB7185` | Coral: erro gentil e alertas (`--coral`); `--erro-clara`, `--erro-hover`, `--erro-sombra` |
| `--aviso` / `--info` / `--lilas` | `#FDBA74` / `#60A5FA` / `#C4B5FD` | Etiquetas e áreas (`--laranja`, `--azul`) |
| `--perola` / `--claro` | `#F5F0E6` / `#F8FAFC` | A pérola; fundo de peça clara |
| `--texto-1` / `--texto-2` / `--texto-3` | `#E6F1FF` / `#A9BCD6` / névoa a 70 % | Gelo, névoa, metadados (`--texto`, `--texto-suave`) |
| `--texto-inverso` | `#0B2545` | Texto sobre turquesa, amarelo ou fundo claro (`--texto-escuro`) |
| `--sala-enem` · `--sala-radiologia` · `--sala-tecnologia` · `--sala-ensino-medio` | amarelo · turquesa · azul · verde | **Só** o ícone e o filete do cartão da sala, nunca o botão |

Os nomes antigos continuam valendo como apelidos (`--turquesa: var(--primaria)` etc.), para nada quebrar. **Sem cores soltas:** turquesa sobre branco tem contraste baixo; use turquesa como texto só sobre fundo escuro (sobre claro, `--primaria-escura`).

- **Canvas e SVG montado no JS** (`js/tutorial.js`, `js/jogos/caso-resolvido.js`, `js/descompressao/tiro.js`) leem os tokens com `UI.cor('primaria')`. Exceções registradas: `js/descompressao/cardume.js` e `js/mascotes.js` são pinturas com paleta própria (gelatinas, tons de pele) e ficam como estão; os jogos que já usam `var(--token)` em estilos inline também.

### Tipografia
- **Escala de 8 tamanhos**, e só ela: `--t-xs` 0,75rem (12 px, **mínimo absoluto**, inclusive rótulos em caixa alta) · `--t-sm` 0,875 · `--t-md` 1 · `--t-lg` 1,125 · `--t-xl` 1,375 · `--t-2xl` 1,75 · `--t-3xl` clamp(2–2,5rem) · `--t-display` clamp(2,5–3,5rem) (só o logo do Início e o cronômetro do Foco).
- Entrelinhas: `--lh-apertada` 1,15 (títulos), `--lh-normal` 1,5, `--lh-leitura` 1,6 (artigos e explicações, em `max-width: var(--medida-leitura)` = 65ch).
- Pesos: 500 corpo, 600 ênfase, 700 títulos de cartão, 800 só títulos de página e números grandes. O Google Fonts carrega Plus Jakarta Sans 500–800 e JetBrains Mono 500/600/700 (o 400 saiu).
- `.rotulo` e `.lateral__grupo` (mono, caixa alta): `--t-xs`, espaçamento 0,08em, cor `--texto-2`.

### Raio, sombra, movimento e camadas
- Raios: `--raio-sm` 8 · `--raio-md` 12 (campos) · `--raio-lg` 16 (cartões) · `--raio-xl` 24 (herói) · `--raio-pilula` 999 (botões e tags). Apelidos: `--raio` = lg, `--raio-pequeno` = md.
- Sombras: `--sombra-1` (repouso dos cartões) · `--sombra-2` (hover, elevado) · `--sombra-3` (menus, toast) · `--sombra-4` (dialog). **O brilho turquesa saiu** dos botões primários: só a borda inferior 3D (`--sombra-botao`). Selecionado/aberto usa `--anel-primaria`; foco, `--anel-foco`.
- Movimento: `--dur-rapida` 120ms · `--dur-normal` 200ms · `--dur-lenta` 320ms; `--ease-saida` e `--ease-elastica` (pulinho do mascote). A entrada de tela (`surgir`) é só opacidade + 8 px, **sem blur**.
- Camadas (`z-index`): `--z-abaixo` −1 · `--z-base` 0 · `--z-acima` 1 · `--z-acima-2` 2 · `--z-sticky` 10 (topo do celular) · `--z-lateral` 20 · `--z-flutuante` 30 (feedback, menus) · `--z-dialogo` 40 (caixas, tutorial, gavetas) · `--z-toast` 50 (toasts e faixa de testes) · `--z-transicao` 60 (cortina e "pular para o conteúdo").

### Breakpoints: só 4
`sm` 480 · `md` 768 · `lg` 1024 · `xl` 1280. Em `@media` só entram `479/480`, `767/768`, `1023/1024` e `1279/1280` px (o CSS não interpola variáveis em media query, então os números são escritos à mão, sempre estes). A barra lateral fixa aparece em **1024** (`lg`). `color-scheme: dark` está no `:root` e na meta do `<head>`: controles nativos nascem escuros.

## Espaçamento (régua de 4/8 px, `css/ritmo.css`)
Inspirada nos sistemas de design dos apps mais caprichados: poucos tamanhos de espaço, sempre os mesmos, para a página "respirar" com ritmo.
- **Tokens:** `--esp-1` 4 · `--esp-2` 8 · `--esp-3` 12 · `--esp-4` 16 · `--esp-5` 24 · `--esp-6` 32 · `--esp-7` 40 · `--esp-8` 48 · `--esp-9` 64 px. Nada de espaço "solto" (13 px, 22 px…).
- **Papéis** (mudam no computador, ≥ 1024 px, `lg`): `--ritmo-secao` 40 → 48 (antes de cada título de seção), `--ritmo-cartoes` 16 → 20 (entre cartões), `--ritmo-cartao-pad` 20 → 24 (dentro do cartão), `--ritmo-pagina-x` 16 → 40 (margem da página).
- **Regra de proximidade:** o título fica perto do que ele apresenta (8 px até a descrição, 12–16 px até o conteúdo) e longe do bloco anterior (40–48 px). Rótulo de campo a 6 px do campo; campos a 12–16 px entre si; botões lado a lado a 12 px.
- **Fluxo padrão:** dois blocos seguidos numa tela nunca encostam (16/20 px), por uma regra de peso zero (`:where`) que qualquer peça específica pode sobrepor.
- **Leitura:** parágrafos com no máximo ~62 caracteres por linha e entrelinha 1,55–1,6; títulos com quebra equilibrada (`text-wrap: balance`).
- **Celular primeiro:** no mapa de fases, o "Mergulhar" vira uma seta e o texto usa a largura toda; na Sala de Jogos, o botão fica na linha do nome; tabelas viram cartõezinhos com rótulos.
- **Barra lateral no computador:** topo e rodapé fixos, só a lista do meio rola se faltar altura; itens de 36 px (no celular, 44 px).
- **Conferir:** depois de mexer no visual, rode o auditor de espaçamento (caixas a menos de 10 px uma da outra ou saindo da tela) e compare fotos de antes e depois no computador e no celular.

## Profundidades (cor por fase)
Raso (0–10 m) claro e luminoso → Recife (10–40 m) turquesa → Caverna (40–200 m) azul profundo → Abismo (200 m+) quase preto. Quanto mais fundo, mais escuro o cenário do jogo.

## Tipografia e formas
- **Plus Jakarta Sans** (Google Fonts), pesos 500 a 800 (corpo em 500), sempre com fallback de sistema. Tamanhos só pela escala `--t-*` (acima).
- **JetBrains Mono** (token `--fonte-mono`) só para "dados": rótulos pequenos em caixa alta (`.rotulo`), cronômetros, contadores, números do resumo e da barra lateral. Texto corrido continua em Plus Jakarta Sans.
- **Movimento:** as telas entram com fade e deslize curto de 8 px (`surgir`, sem desfoque: é caro no celular); ao começar uma sessão ou um jogo, a **cortina** (`#transicao`: fundo do mar, bolhas subindo e o Diver) cobre a tela por ~1 s. Com "reduzir movimento", nada disso aparece.
- **Barras de rolagem** finas, no tom `--superficie-2` (turquesa ao passar o mouse); na barra lateral, a alça só aparece com o mouse em cima.
- Cards com canto de 16 px; botões em formato de pílula.
- **Botão 3D**: borda inferior de 4 px em `--primaria-sombra` (`--sombra-botao`), sem brilho; ao pressionar, o botão "afunda" (translateY de 3–4 px e sombra menor).
- Card selecionado: fundo `--superficie-turquesa` + borda turquesa (`--anel-primaria`) + marcador de rádio turquesa.
- Ícones de traço fino (estilo Lucide), sempre com texto nas ações principais.
- Fundo: degradê marinho + **bolhas suaves** animadas (desligam com `prefers-reduced-motion`).

## Mascote: Diver
O Diver é **vetorial (SVG)**, no estilo "figurinha": formas simples, **contorno turquesa grosso** e cores chapadas, de frente. O **corpo é o mesmo para todos**:
- **roupa de mergulho com capuz** (`#15406B`, contorno `#5EEAD4`) e faixa turquesa no peito;
- **máscara amarela** (`#FACC15`) com vidro `#0C354C` e os **olhinhos iguais aos do ícone da aba** (brancos `#E6F1FF`, pupilas `#0B2545`);
- **snorkel na boca**: bocal amarelo e tubo coral (`#FB7185`) subindo pelo lado, soltando bolhas; nadadeiras amarelas.

**O rosto é escolhido pela pessoa** (desde 2026-09-30; desde 2026-10-01 é um **easter egg**: setinhas discretas dos lados do mascote no topo do Perfil passeiam por todas as variações, rosto e tom de pele, sem nenhum texto explicando). O padrão é o **pinguim de penacho**.
- **Pinguins** (rosto `#F4F8FF`, bico laranja `#FB923C`/`#EA7A1F` segurando um bocal menor): de penacho (penas `#FCD34D` saindo pelos lados da máscara), clássico, imperador (manchas douradas) e de Magalhães (faixa `#1E293B` em U).
- **Mergulhadores**: barba e bigode discreto, bigode guidão, bigodão de detetive, bigode de morsa, bigode fininho, só bigode e rosto limpo.
- **Mergulhadoras**: cabelo liso ou cacheado emoldurando o rosto, cílios (só com os olhos abertos) e lábios logo abaixo do bocal.
- **Tom de pele** para mergulhadores e mergulhadoras: clara, média, morena e negra; cabelo, barba e boca acompanham (valores em `js/mascotes.js`, `TONS`).

**Decisão de 2026-09-29 (2):** a pixel art 16-bit foi aposentada (os arquivos antigos saíram do repositório; estão no histórico do git). O ícone da aba continua sendo a máscara em SVG.

- Arquivo de referência: `assets/mascote/diver.svg` (o padrão). No app, o desenho fica inline em `<template id="molde-mascote">` no `index.html`, com quatro encaixes para o rosto (`.d-pele`, `.d-rosto-atras`, `.d-cilios`, `.d-rosto-frente`) que o `js/mascotes.js` preenche com a escolha; o `ui.js` copia o molde para todo elemento com `data-mascote` (sem pedir arquivo nenhum à rede). Rosto novo = uma entrada em `Mascotes.ROSTOS`.
- **Expressões** pela classe do container (`UI.humorMascote(container, humor)`): sem classe = **normal** (pisca de vez em quando); `.mascote--feliz` (olhos ^ ^, bochechas e pulinho: acerto); `.mascote--triste` (pálpebras caídas e balançada: erro, sem culpar); `.mascote--pensando` (olhando para cima: dicas e tutorial).
- Bolhas sobem do snorkel; no Início ele flutua. Com `prefers-reduced-motion`, fica tudo parado.
- Proporção 240 × 270 (mais alto que largo): nas telas, defina só a largura. Deixar respiro ao redor; funciona melhor sobre fundo escuro.

## Caixa de confirmação (`UI.confirmar`)
Nada de aviso do navegador ("site tal diz…"): toda pergunta de sim/não é a caixa do Diver. Mascote no topo, título curto em forma de pergunta ("Subir agora?"), uma frase de apoio e dois botões com o verbo da ação ("Subir agora" / "Continuar mergulhando"), nunca "OK/Cancelar" soltos.
- **Sair de algo** (quiz, jogo, prova, conta): mascote **triste** (`humor: 'triste'`). Tom gentil, sem culpa.
- **Apagar, zerar, tirar acesso:** botão coral (`perigo: true`).
- O foco começa na opção segura (ficar/cancelar); Esc, clicar fora ou "não" cancelam; o foco volta para onde estava. No celular é uma caixa no meio da tela, com os botões um embaixo do outro.
- Pedir um texto (ex.: editar nome no Admin): `UI.perguntar` (mesma caixa com um campo; Enter salva).

## Tom de voz
| Faça | Evite |
| --- | --- |
| "Mandou bem, Diver!" | "Parabéns por concluir a atividade com 80% de aproveitamento." |
| "Essa foi por pouco. Bora mergulhar de novo?" | "Resposta incorreta." |
| "Sentimos sua falta! Um mergulho de 2 minutos?" | "Você perdeu sua sequência de 30 dias." |
| "Hoje é dia de descanso. Aproveita a maré calma!" | "Você não estudou hoje." |

Frases curtas, humor discreto, sem jargão e sem sermão. Um trocadilho de mar de vez em quando (e só de vez em quando).

## Acessibilidade
Contraste mínimo AA; foco visível em tudo que é clicável; botões grandes para toque (mín. 44 px); atalhos de teclado (1–6 ou A–F para responder); `prefers-reduced-motion` respeitado; nunca comunicar algo só por cor.

## Componentes base (Onda 2 da revisão de design, 2026-10-15)
- **Botões** (`css/estilo.css`, "Botões"): `.botao--primario` (turquesa, texto inverso, borda 3D, **uma ação principal por tela**), `--secundario` (superfície-2 + borda forte), `--fantasma` (sem fundo), `--perigo` (coral: zerar, apagar, sair), `--link`. Tamanhos: `--pequeno` 36 px (no toque vira 44), padrão 44 px, `--grande` 52 px. Estados: hover, ativo (afunda 3 px), foco (anel amarelo, `outline-offset: 3px`), desabilitado (0,5) e **carregando** (`UI.carregando(botao, true, 'Entrando…')`: `aria-busy`, spinner de 16 px no lugar do ícone; usado no login, "Começar simulado", "Enviar PDF" e "Montar meu cronograma"). Ícone de 20 px, 8 px de distância. Botão só-ícone: `.botao-icone` 44 × 44 com `aria-label`. O "Entrar" das salas é **turquesa em todas**; a cor da sala fica só no ícone e no filete.
- **Campos**: `select` e `.campo` com aparência própria (`appearance: none`, fundo `--superficie-3`, borda sutil, raio 12, 44 px, foco turquesa com anel), seta do select em `--seta-select` (data-URI em `tokens.css`). Rótulo `.rotulo-campo` acima (`--t-sm`, 600, 6 px); `.campo-ajuda` e `.campo-erro` abaixo (`--t-xs`, ligados por `aria-describedby`); obrigatório marcado no texto (`.rotulo-campo__obrigatorio`). Checkbox e rádio em turquesa (`accent-color`).
- **Cartões**: `.cartao` = superfície-1 + borda sutil + `--sombra-1`, **sem desfoque**. `--interativo` (sobe 2 px, sombra-2), `--destaque` (filete de 4 px, `--cartao-filete`), `--heroi` (raio 24, degradê da sala). **Cartão dentro de cartão: superfície-2, sem borda e sem sombra** (`.cartao .cartao`, `.cartao--aninhado`; no mapa, as linhas "Antes de mergulhar" e "Mão na massa" dentro da aula).
- **Tags**: `.tag` pílula de 24 px, `--t-xs`, 700; `--neutra` (contagens), `--primaria`, `--destaque` (só "Recomendado"/"Novo hoje"), `--sucesso`, `--erro`, `--mono` (números). Os números das salas são tags neutras em mono.
- **Ícones**: sprite no `index.html`, todos com **traço 2** e pontas redondas. **Sem emojis na interface**: o caminho do artigo (`i-livro`, `i-cerebro`, `i-cartas`, `i-espadas`, `i-revisao`), medalhas do ranking (`i-medalha` em ouro/prata/bronze), som do Cardume (`i-som`/`i-mudo`), certo/errado (`i-check`/`i-x`), estrelas (`i-estrela`/`i-estrela-vazia`), lâmpada (`i-lampada`). Emojis que vêm do **conteúdo** do curso (associações do artigo) continuam: são dados.
- **Barra de progresso**: `.barra` (e as antigas `.barra-xp`, `.barra-meta`, `.barra-progresso`, `.trilha__progresso`) com 8 px (`--fina` 6, `--grossa` 12), trilho superfície-2, turquesa → turquesa-clara (XP em amarelo), `role="progressbar"`; `UI.progresso(barra, pct)` põe a largura, o `aria-valuenow` e o brilho rápido ao subir (`.barra--subiu`).
- **Toasts**: celular = topo centralizado abaixo da barra do topo; no quiz e nos jogos descem abaixo do oxigênio; computador = canto superior direito. Somem em 4 s, no máximo 3 de uma vez.
- **Esqueleto**: `UI.esqueleto('sala' | 'curso' | 'fase', n, aviso)`: blocos com brilho (estáticos com "reduzir movimento"), aviso para leitor de tela num `aria-live` oculto. No Início (salas) e na tela do curso enquanto as aulas baixam.

## Layout por tela (Onda 3 da revisão de design, 2026-10-15)
- **Largura**: `.tela` até 1120 px; **720 px** só onde a leitura manda (`.tela--estreita`: resumo, prova, upload de prova, foco; quiz e login também).
- **Quiz**: topo numa linha que nunca quebra (sair · barra · oxigênio/cronômetro · `1/10` em mono; no celular o rótulo "Mergulho · …" fica só no `title`). O **feedback entra abaixo das alternativas, no fluxo** (só opacidade na animação), a página rola até ele (`block: 'nearest'`) e o **"Continuar" fica fixo no rodapé** (`.feedback__rodape`, com `safe-area`). Certa com `--mascara-check`, Dica com `--mascara-lampada`. **Atenção:** animação com `fill-mode: both/forwards` em `transform` prende o `position: fixed` dos filhos; `.tela` usa `backwards`.
- **Início e Sala**: herói e "Continuar" lado a lado no computador; salas em 4 colunas no xl; convite ao Cronograma como faixa fina; matérias com altura igual.
- **Mapa do curso**: `.painel-grade` (computador: mapa à esquerda, status e conquistas à direita; celular: status em fichas que rolam de lado → mapa → conquistas). A **aula atual** (`estado.aulaAtual`, a próxima do plano) tem borda turquesa e o selo "Você está aqui"; o cabo entre as aulas é um trecho por aula (`li::after`), contínuo depois de cada aula concluída (`.mapa__feito`). "Ler primeiro" é secundário com livro. Conquistas bloqueadas a 50 % com o próprio ícone; o cadeado só no hover. "Zerar progresso" num `details.zona-perigo` fechado.
- **Antes de mergulhar**: barra de passos `.caminho--artigo` (passo atual com `aria-current="step"`; no celular rola de lado com snap). Cuidado: `.caminho` e `.caminho__lista` também existem no Plano de estudos (`caminho.css`); o artigo usa o modificador. Leitura em `--t-md`, 65ch, títulos `--t-xl`; parágrafo que começa com "Dica de mergulhador" vira `.artigo__dica` e "> " vira citação (filete amarelo).
- **Simulado**: "Montar simulado" como herói; no computador, "Suas provas" e o histórico numa coluna à direita (o convite "Provas antigas" mora em `#provas-antigas`, via `data-cabeca`). **Revisão**: "Revisar agora" no cabeçalho (`.cabeca-acao`).
- **Cartões de jogo** (Sala de Jogos e Descompressão): ícone 40 px, nome `--t-lg`, duração mono `--t-xs` (`.jogo-card__duracao`), descrição em até 3 linhas, rodapé no pé; "Novo hoje" sobreposto no canto (`.jogo-card__selo`).
- **Tarefas**: as bordas do quadro esmaecem (`mask-image`) e, no celular, pontinhos de página (`.qd-pontos`). O encaixe continua `proximity`: com `mandatory`, a rolagem automática ao arrastar um cartão voltaria ao lugar. **Calendário**: `.cal-topo` (uma linha no computador; duas no celular: setas + mês + Hoje / filtros que rolam + Mês/Semana). **Cronograma**: "Voltar"/"Continuar" grudados no pé do cartão. **Foco**: anel de progresso (`--resta`, 240/200 px) e tempo em mono.
- **Perfil**: mascote 120 px; números `--t-2xl` mono; "Por curso" como tabela de verdade no computador (cabeçalho grudado, linhas de 44 px, zebra, números à direita) e cartões de 2 colunas no celular.
- **Barra lateral**: 264 px; item atual com superfície-2, filete turquesa de 3 px e texto gelo; grupos em mono `--t-xs` texto-3. No xl os itens seguem com 34 px para caber numa tela de 900 px. **Gaveta** (abaixo de 1024): até 86 vw, fundo `--fundo-2` opaco, `--sombra-4`, fecha com Esc e trava a rolagem do fundo (`body.gaveta-aberta`).
- **Login**: no meio da tela (`100dvh` menos a faixa de testes), cartão de 400 px, mascote 120 px.

## Como auditar (rode antes de todo commit que mexe no visual)
- `node scripts/auditar-design.mjs`: falha se achar hex fora de `css/tokens.css` (nos CSS e nos 3 JS que desenham), `font-size` fora da escala, `z-index` numérico ou `@media` fora dos 4 cortes.
- `node scripts/fotos-design.mjs --onda <nome> --fase antes|depois --porta 8765`: fotografa 18 telas no celular (390×844) e no computador (1440×900) em `docs/fotos/design/<onda>/<fase>/`, com um servidor local rodando (`python3 -m http.server 8765`) e o Playwright instalado (`NODE_PATH=$(npm root -g)`). Compare o antes e o depois antes de dar a onda por pronta.
- As fotos novas saem em JPEG 1× (leves); `--png` para alta resolução.
- A revisão completa, onda por onda, está em `docs/REVISAO_DESIGN.md`. **Onda 1 (fundação) e Onda 2 (componentes) feitas em 2026-10-15**; as próximas (layout, responsividade, movimento, carregamento, documentação) esperam o OK do usuário.

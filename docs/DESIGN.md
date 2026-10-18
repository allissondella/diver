# Diver — identidade visual e sistema de design

O sistema que está no código, com os nomes reais. Três fontes da verdade, sempre em acordo:
- **`css/tokens.css`**: todo valor visual (cor, texto, espaço, raio, sombra, movimento, camadas, altura da tela). Os outros CSS só consomem `var(--token)`.
- **`docs/componentes.html`**: o catálogo vivo (tokens com contraste calculado, escala de texto, espaços, raios, sombras, botões em todos os estados, campos, cartões, tags, barras, aviso, esqueleto, os 61 ícones e o mascote nas 4 expressões), gerado por `node scripts/gerar-componentes.mjs` a partir do `tokens.css` e do `index.html`. **Peça nova entra lá primeiro**; abra direto no navegador.
- **`node scripts/auditar-design.mjs`** (e `--navegador`): a conferência automática; tem que passar antes de todo commit visual (seção "Como auditar").

**Não invente cores novas**: se precisar de uma variação, derive das existentes, ponha em `tokens.css` e registre aqui. A história das mudanças está em `docs/REVISAO_DESIGN.md` (as 7 ondas da revisão de 2026-10-15) e em `docs/DIARIO.md`.

## Tokens (`css/tokens.css`)
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
- Pesos: 500 corpo, 600 ênfase, 700 títulos de cartão, 800 só títulos de página e números grandes. O Google Fonts carrega Plus Jakarta Sans 500–800 e JetBrains Mono 500/700 (com `preload` e `display=swap`).
- `.rotulo` e `.lateral__grupo` (mono, caixa alta): `--t-xs`, espaçamento 0,08em, cor `--texto-2`.

### Raio, sombra, movimento e camadas
- Raios: `--raio-sm` 8 · `--raio-md` 12 (campos) · `--raio-lg` 16 (cartões) · `--raio-xl` 24 (herói) · `--raio-pilula` 999 (botões e tags). Apelidos: `--raio` = lg, `--raio-pequeno` = md.
- Sombras: `--sombra-1` (repouso dos cartões) · `--sombra-2` (hover, elevado) · `--sombra-3` (menus, toast) · `--sombra-4` (dialog). **O brilho turquesa saiu** dos botões primários: só a borda inferior 3D (`--sombra-botao`). Selecionado/aberto usa `--anel-primaria`; foco, `--anel-foco`.
- Movimento: `--dur-rapida` 120ms · `--dur-normal` 200ms · `--dur-lenta` 320ms; `--ease-saida` e `--ease-elastica` (pulinho do mascote). A entrada de tela (`surgir`) é só opacidade + 8 px, **sem blur**.
- Altura da tela: `--vh-tela` (100dvh onde o navegador entende, senão 100vh). Máscaras para `::before/::after`: `--mascara-check`, `--mascara-lampada`; seta do select: `--seta-select`.
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
- **Barra lateral no computador:** topo e rodapé fixos, só a lista do meio rola se faltar altura; itens de 40 px no `lg` e 34 px no `xl` (para caber numa tela de 900 px); no toque, 44 px.
- **Conferir:** depois de mexer no visual, rode `node scripts/auditar-design.mjs --navegador` e compare fotos de antes e depois no computador e no celular (`scripts/fotos-design.mjs`).

## Tipografia e formas
- **Plus Jakarta Sans** (Google Fonts), pesos 500 a 800 (corpo em 500), sempre com fallback de sistema. Tamanhos só pela escala `--t-*` (acima).
- **JetBrains Mono** (token `--fonte-mono`) só para "dados": rótulos pequenos em caixa alta (`.rotulo`), cronômetros, contadores, números do resumo e da barra lateral. Texto corrido continua em Plus Jakarta Sans.
- **Movimento:** as telas entram com fade e deslize curto de 8 px (`surgir`, sem desfoque: é caro no celular); ao começar uma sessão ou um jogo, a **cortina** (`#transicao`: fundo do mar, bolhas subindo e o Diver) cobre a tela por no máximo 700 ms. Com "reduzir movimento", nada disso aparece (detalhes na seção "Movimento").
- **Barras de rolagem** finas, no tom `--superficie-2` (turquesa ao passar o mouse); na barra lateral, a alça só aparece com o mouse em cima.
- Cards com canto de 16 px; botões em formato de pílula.
- **Botão 3D**: borda inferior de 4 px em `--primaria-sombra` (`--sombra-botao`), sem brilho; ao pressionar, o botão "afunda" (translateY de 3–4 px e sombra menor).
- Card selecionado: fundo `--superficie-turquesa` + borda turquesa (`--anel-primaria`) + marcador de rádio turquesa.
- Ícones do sprite do `index.html`, todos com traço 2 e pontas redondas, sempre com texto nas ações principais (lista em `docs/componentes.html`).
- Fundo: degradê marinho + **12 bolhas suaves** animadas (paradas no quiz, nos jogos e com a aba escondida; desligam com `prefers-reduced-motion`).

## Componentes base
- **Botões** (`css/estilo.css`, "Botões"): `.botao--primario` (turquesa, texto inverso, borda 3D, **uma ação principal por tela**), `--secundario` (superfície-2 + borda forte), `--fantasma` (sem fundo), `--perigo` (coral: zerar, apagar, sair), `--link`. Tamanhos: `--pequeno` 36 px (no toque vira 44), padrão 44 px, `--grande` 52 px. Estados: hover, ativo (afunda 3 px), foco (anel amarelo, `outline-offset: 3px`), desabilitado (0,5) e **carregando** (`UI.carregando(botao, true, 'Entrando…')`: `aria-busy`, spinner de 16 px no lugar do ícone; usado no login, "Começar simulado", "Enviar PDF" e "Montar meu cronograma"). Ícone de 20 px, 8 px de distância. Botão só-ícone: `.botao-icone` 44 × 44 com `aria-label`. O "Entrar" das salas é **turquesa em todas**; a cor da sala fica só no ícone e no filete.
- **Campos**: `select` e `.campo` com aparência própria (`appearance: none`, fundo `--superficie-3`, borda sutil, raio 12, 44 px, foco turquesa com anel), seta do select em `--seta-select` (data-URI em `tokens.css`). Rótulo `.rotulo-campo` acima (`--t-sm`, 600, 6 px); `.campo-ajuda` e `.campo-erro` abaixo (`--t-xs`, ligados por `aria-describedby`); obrigatório marcado no texto (`.rotulo-campo__obrigatorio`). Checkbox e rádio em turquesa (`accent-color`).
- **Cartões**: `.cartao` = superfície-1 + borda sutil + `--sombra-1`, **sem desfoque**. `--interativo` (sobe 2 px, sombra-2), `--destaque` (filete de 4 px, `--cartao-filete`), `--heroi` (raio 24, degradê da sala). **Cartão dentro de cartão: superfície-2, sem borda e sem sombra** (`.cartao .cartao`, `.cartao--aninhado`; no mapa, as linhas "Antes de mergulhar" e "Mão na massa" dentro da aula).
- **Tags**: `.tag` pílula de 24 px, `--t-xs`, 700; `--neutra` (contagens), `--primaria`, `--destaque` (só "Recomendado"/"Novo hoje"), `--sucesso`, `--erro`, `--mono` (números). Os números das salas são tags neutras em mono.
- **Ícones**: sprite no `index.html`, todos com **traço 2** e pontas redondas. **Sem emojis na interface**: o caminho do artigo (`i-livro`, `i-cerebro`, `i-cartas`, `i-espadas`, `i-revisao`), medalhas do ranking (`i-medalha` em ouro/prata/bronze), som do Cardume (`i-som`/`i-mudo`), certo/errado (`i-check`/`i-x`), estrelas (`i-estrela`/`i-estrela-vazia`), lâmpada (`i-lampada`). Emojis que vêm do **conteúdo** do curso (associações do artigo) continuam: são dados.
- **Barra de progresso**: `.barra` (e as antigas `.barra-xp`, `.barra-meta`, `.barra-progresso`, `.trilha__progresso`) com 8 px (`--fina` 6, `--grossa` 12), trilho superfície-2, turquesa → turquesa-clara (XP em amarelo), `role="progressbar"`; `UI.progresso(barra, pct)` põe a largura, o `aria-valuenow` e o brilho rápido ao subir (`.barra--subiu`).
- **Toasts**: celular = topo centralizado abaixo da barra do topo; no quiz e nos jogos descem abaixo do oxigênio; computador = canto superior direito. Somem em 4 s, no máximo 3 de uma vez.
- **Esqueleto**: `UI.esqueleto('sala' | 'curso' | 'fase', n, aviso)`: blocos com brilho (estáticos com "reduzir movimento"), aviso para leitor de tela num `aria-live` oculto. No Início (salas) e na tela do curso enquanto as aulas baixam.

## Layout por tela
- **Centralizado, nada lado a lado** (pedido do usuário, 2026-10-16): Início, mapa do curso, Simulado, Revisão, Perfil e Estatísticas numa **coluna centralizada de 720 px** (`.tela`); 1120 px só nas telas marcadas `.tela--larga` (sala, jogos, organizar, biblioteca, admin, Descompressão). Não ponha herói e cartões, mapa e status ou listas lado a lado.
- **Exceção: a aba Profissões** (pedido do usuário, 2026-10-16: "usar toda a parte que não pega o menu lateral"). `#tela-profissoes` vai até 1240 px, com grade de cartões e capítulos em duas colunas; de 1280 px para cima, o botão "Esconder menu" tira a barra lateral só nesta aba (`body.prof-sem-menu`, preferência só do aparelho). As telas de leitura da aba (Um dia como, Mito ou verdade, Maré, Método, jogos) seguem em 760 px. Detalhes em `docs/MAPA_PROFISSOES_INTERACOES.md`, "A aba repaginada".
- **Exceção: jogo da Sala em tela toda** (`telaCheia: true` no contrato; hoje só o Tiro ao Alvo, 2026-10-17). A tela da Sala vira uma camada do tamanho da janela (`.sd--tela-cheia`, contêiner de tamanho `sd-cheia`), a página não rola por baixo (`body.sd-trava`) e a barra de cima fica por cima do jogo, num degradê; no celular ela mostra só ícones de 44 px. O que fica baixo demais (celular deitado) se ajusta por consulta de contêiner (`@container sd-cheia (max-height: 479px)`), não por `@media`. Detalhes em `docs/JOGOS.md`, Tiro ao Alvo.
- **Quiz**: topo numa linha que nunca quebra (sair · barra · oxigênio/cronômetro · `1/10` em mono; no celular o rótulo "Mergulho · …" fica só no `title`). O **feedback entra abaixo das alternativas, no fluxo** (só opacidade na animação), a página rola até ele (`block: 'nearest'`) e o **"Continuar" fica fixo no rodapé** (`.feedback__rodape`, com `safe-area`). Certa com `--mascara-check`, Dica com `--mascara-lampada`. **Atenção:** animação com `fill-mode: both/forwards` em `transform` prende o `position: fixed` dos filhos; `.tela` usa `backwards`.
- **Início e Sala**: herói em cima, "Continuar" e o nivelamento embaixo, salas em 2 colunas (1 no celular); convite ao Cronograma como faixa fina; matérias com altura igual.
- **Mapa do curso**: uma coluna (`.painel-grade`): status → mapa → outros jeitos → conquistas; no celular o status vira fichas que rolam de lado. A **aula atual** (`estado.aulaAtual`, a próxima do plano) tem borda turquesa e o selo "Você está aqui"; o cabo entre as aulas é um trecho por aula (`li::after`), contínuo depois de cada aula concluída (`.mapa__feito`). "Ler primeiro" é secundário com livro. Conquistas bloqueadas a 50 % com o próprio ícone; o cadeado só no hover. "Zerar progresso" num `details.zona-perigo` fechado.
- **Antes de mergulhar**: barra de passos `.caminho--artigo` (passo atual com `aria-current="step"`; no celular rola de lado com snap). Cuidado: `.caminho` e `.caminho__lista` também existem no Plano de estudos (`caminho.css`); o artigo usa o modificador. Leitura em `--t-md`, 65ch, títulos `--t-xl`; parágrafo que começa com "Dica de mergulhador" vira `.artigo__dica` e "> " vira citação (filete amarelo).
- **Simulado**: "Montar simulado" como herói e, embaixo, na mesma coluna: Provas antigas (`#provas-antigas`, via `data-cabeca`), as provas e o histórico. **Revisão**: "Revisar agora" logo abaixo do cabeçalho.
- **Cartões de jogo** (Sala de Jogos e Descompressão): ícone 40 px, nome `--t-lg`, duração mono `--t-xs` (`.jogo-card__duracao`), descrição em até 3 linhas, rodapé no pé; "Novo hoje" sobreposto no canto (`.jogo-card__selo`).
- **Tarefas**: as bordas do quadro esmaecem (`mask-image`) e, no celular, pontinhos de página (`.qd-pontos`). O encaixe continua `proximity`: com `mandatory`, a rolagem automática ao arrastar um cartão voltaria ao lugar. **Calendário**: `.cal-topo` (uma linha no computador; duas no celular: setas + mês + Hoje / filtros que rolam + Mês/Semana). **Cronograma**: "Voltar"/"Continuar" grudados no pé do cartão. **Foco**: anel de progresso (`--resta`, 240/200 px) e tempo em mono.
- **Perfil**: mascote 120 px; números `--t-2xl` mono; "Por curso" como tabela de verdade no computador (cabeçalho grudado, linhas de 44 px, zebra, números à direita) e cartões de 2 colunas no celular.
- **Barra lateral**: 264 px; item atual com superfície-2, filete turquesa de 3 px e texto gelo; grupos em mono `--t-xs` texto-3. No xl os itens seguem com 34 px para caber numa tela de 900 px. **Gaveta** (abaixo de 1024): até 86 vw, fundo `--fundo-2` opaco, `--sombra-4`, fecha com Esc e trava a rolagem do fundo (`body.gaveta-aberta`).
- **Login**: no meio da tela (`100dvh` menos a faixa de testes), cartão de 400 px, mascote 120 px.

## Celular e responsividade
- **Toque**: com `pointer: coarse`, todo alvo tem pelo menos 44 × 44 px (`select` dos jogos, etiquetas e nomes de lista do Tarefas, Mês/Semana, filtros do Calendário, 25/5 do Foco, setinhas do mascote, links da tabela do Perfil, todo `summary`). Em 360 px os dias do mês têm 44 px (vão de 2 px). Exceção: o **teclado na tela da Palavrinha** (do curso e da Sala), porque dez teclas numa linha não cabem com 44 px de largura no celular; a tecla tem pelo menos 44 px de altura e 24 px de largura (o mínimo da WCAG 2.5.8).
- **Altura da tela**: use `var(--vh-tela)` (100dvh onde existe, 100vh nos outros), nunca `100vh` direto.
- **Áreas seguras**: o `viewport` tem `viewport-fit=cover`; o topo, a página (`.app`), a gaveta, o rodapé fixo do quiz, o Cronograma e os toasts somam `env(safe-area-inset-*)`.
- **Celular deitado** (`orientation: landscape` e altura até 500 px): topo do quiz grudado com 48 px, enunciado em `--t-md`, "Continuar" no rodapé mais baixo.

## Movimento
Tudo some com "reduzir movimento" (regra global em `estilo.css`).
- **Telas**: entram com opacidade + 8 px de subida (`surgir`, `--dur-normal`, sem blur). **Cortina** (`#transicao`): no máximo 700 ms.
- **Barra lateral**: um filete só (`.lateral__filete`) que desliza até o item atual (`moverFilete` em `app.js`).
- **Quiz**: a certa pulsa uma vez (1 → 1,02 → 1); a marcada errada balança 3 × 4 px; XP e pérolas do feedback e do resumo **contam** de 0 até o valor (`UI.contar(el, de, para, ms)`).
- **Conquista**: o ícone do aviso gira uma vez (`toast(..., { conquista: true })`) e sai um **confete discreto** (`UI.confete()`: 12 partículas, 800 ms) só em conquista e em fim de fase novo, nunca num acerto comum.
- **Botões**: sobem 1 px no hover (só com mouse) e afundam no clique; cartões interativos sobem 2 px com sombra-2.
- **Bolhas do fundo**: 12, só `transform`/`opacity`, paradas no quiz e nos jogos (`.modo-foco`) e com a aba escondida (`.aba-oculta`).
- **Teclado**: "?" abre a lista de atalhos da tela e gerais (`UI.atalhos()`; atalhos de cada tela em `ATALHOS_TELA`, `js/ui.js`). Esc fecha janela, gaveta e tutorial. No quiz, o Esc não foi mudado (comportamento das perguntas).

## Carregamento, app instalável e metadados
- **Scripts**: o Início abre com **20** (eram 61); jogos, laboratórios, Descompressão, Cronograma, Diagnóstica, Biblioteca, Perfil, Estatísticas, Admin, Fila e provas chegam em pacotes (`PACOTES` em `js/app.js`, detalhes em `docs/ARQUITETURA.md`).
- **CSS**: `jogos.css`, `descompressao.css`, `artigo.css` e `laboratorio.css` baixam sem travar a página (`media="print"` → `all`), **na mesma posição** de antes (a posição do link decide a cascata; `ritmo.css` continua por último). `tokens`, `estilo`, `areas`, `caminho` e `ritmo` continuam bloqueantes.
- **Abertura antecipada**: com o endereço do Início, o `index.html` mostra o herói (estático) antes dos scripts; o resto do Início aparece de uma vez quando o app desenha (`.tela-inicio--cedo`), para nada pular de lugar.
- **Fontes**: Plus Jakarta Sans 500/600/700/800 e JetBrains Mono 500/700, com `preload` e `display=swap`.
- **Catálogo**: o `catalogo.json` (300 KB no disco) viaja comprimido com ~31 KB; uma versão "mínima" pouparia ~1,5 KB e foi descartada (decisão registrada).
- **App instalável, sem service worker** (evita cache velho em produção): `manifest.webmanifest`, ícones 192/512 e *maskable* em `assets/icones/` e `apple-touch-icon`, todos da máscara do Diver (`node scripts/gerar-icones.mjs`).
- **Compartilhamento**: `og:*`, `twitter:card`, `canonical` e `assets/og.png` (1200 × 630, mascote e slogan).
- **Lighthouse** (Início, modo local, servidor com compressão como o GitHub Pages; 2026-10-15). Antes → depois:

  | | Desempenho | Acessibilidade | Boas práticas | SEO |
  | --- | --- | --- | --- | --- |
  | Celular (desaceleração real, `--throttling-method=devtools`) | 82 → **95** | 100 → **100** | 96 → **96**\* | 100 |
  | Computador | 97 → **99** | 100 → **100** | 96 → **96**\* | 100 |
  | Celular (estimativa simulada, padrão do Lighthouse) | 71 → 76 | 100 | 96\* | 100 |

  \* O único item de "boas práticas" que falha é a fonte do Google bloqueada no ambiente de medição (certificado do proxy); na produção ele passa. A estimativa simulada conta os scripts como se viessem antes da primeira pintura; na medição real, o herói aparece em 1,5 s (LCP 1,8 s, CLS 0,04).

## Profundidades (cor por fase)
Raso (0–10 m) claro e luminoso → Recife (10–40 m) turquesa → Caverna (40–200 m) azul profundo → Abismo (200 m+) quase preto. Quanto mais fundo, mais escuro o cenário do jogo.

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

## O que é proibido
- Cor solta (hex, `rgb`) fora de `css/tokens.css`; no JS de canvas/SVG, use `UI.cor('token')`.
- `font-size` fora dos 8 tokens `--t-*`; texto menor que 12 px.
- `z-index` numérico (use `--z-*`); largura de `@media` fora de 479/480, 767/768, 1023/1024, 1279/1280.
- `100vh` direto (use `var(--vh-tela)`).
- Mais de um botão primário turquesa por tela; cor de sala em botão.
- Emoji na interface (ícone do sprite); só o conteúdo do curso pode ter emoji (as associações do artigo).
- Brilho turquesa (`box-shadow` colorido) em botão ou cartão; `backdrop-filter` em cartão (só o topo do celular pode).
- `confirm`, `alert` e `prompt` do navegador (use `UI.confirmar` / `UI.perguntar`).
- Alvo de toque menor que 44 × 44 px; comunicar algo só por cor.
- Animação sem saída para "reduzir movimento"; `animation-fill-mode: both/forwards` com `transform` num pai de elemento `position: fixed` (ele deixa de ficar preso na tela).
- Script novo de área no `index.html` (vai no pacote dela, `PACOTES` em `js/app.js`); mudar a ordem dos `<link>` de CSS (a posição decide a cascata).

## Checklist de revisão visual (antes de dar uma tela por pronta)
1. `node scripts/auditar-design.mjs` e `--navegador` passam (0 transbordo, 0 alvo < 44 px, 0 texto < 12 px).
2. Uma ação primária, visível sem rolar no celular.
3. Fotos de antes e depois no celular (390) e no computador (1440); olhe também 360 e 768.
4. Teclado: Tab chega em tudo, o foco amarelo aparece, Esc fecha janela e gaveta, "?" mostra os atalhos.
5. "Reduzir movimento" ligado: nada se mexe e nada some.
6. Contraste: texto comum ≥ 4,5:1 sobre o fundo (veja os números em `docs/componentes.html`).
7. Estados: vazio, carregando (esqueleto), erro gentil e o conteúdo longo (nome de curso grande quebra linha sem empurrar nada).
8. Nenhum comportamento mudou: os testes de regressão (quiz, prova, nivelamento, jogos, laboratórios) passam sem erro de página.
9. Peça nova? Entrou em `docs/componentes.html` (rode `node scripts/gerar-componentes.mjs`) e nesta página.

## Como auditar (rode antes de todo commit que mexe no visual)
- `node scripts/auditar-design.mjs`: falha se achar hex fora de `css/tokens.css` (nos CSS e nos 3 JS que desenham), `font-size` fora da escala, `z-index` numérico, `@media` fora dos 4 cortes ou `docs/componentes.html` desatualizado.
- `node scripts/fotos-design.mjs --onda <nome> --fase antes|depois --porta 8765`: fotografa 18 telas no celular (390×844) e no computador (1440×900) em `docs/fotos/design/<onda>/<fase>/`, com um servidor local rodando (`python3 -m http.server 8765`) e o Playwright instalado (`NODE_PATH=$(npm root -g)`). Compare o antes e o depois antes de dar a onda por pronta.
- `node scripts/auditar-design.mjs --navegador [--porta 8124] [--larguras 390,1440] [--telas inicio,perfil]` (Onda 4): abre o app no Chromium em 26 telas (rotas `#...`, o artigo, o quiz antes e depois de responder e o login) nas larguras 360, 390, 430, 768, 1024, 1280 e 1440, e falha com **transbordo horizontal**, **alvo de toque < 44 × 44 px** (até 768 px, com toque; links no meio do texto e caixas dentro de rótulo ficam de fora; as teclas do teclado da Palavrinha precisam de 44 px de altura e 24 de largura) ou **texto < 12 px**. Leva uns 5 minutos.
- As fotos novas saem em JPEG 1× (leves); `--png` para alta resolução.
- `node scripts/gerar-componentes.mjs` regrava `docs/componentes.html`; `--conferir` falha se ele estiver desatualizado (rode depois de mexer em `tokens.css`, no sprite ou no mascote).
- `node scripts/gerar-icones.mjs` refaz os ícones do app e a imagem de compartilhamento (só se o desenho mudar).
- A revisão completa, onda por onda, está em `docs/REVISAO_DESIGN.md`. **As 7 ondas foram feitas em 2026-10-15** (fundação, componentes, layout por tela, responsividade, movimento, carregamento, documentação viva).

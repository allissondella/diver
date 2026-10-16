# Diver — Revisão de design de ponta a ponta (prompt para o Claude Code)

> **Como usar:** salve este arquivo no repositório como `docs/REVISAO_DESIGN.md` (ou cole o conteúdo inteiro no chat do Claude Code). Depois abra o Claude Code na pasta do projeto e mande:
>
> ```
> /model fable
> /effort high
> Leia CLAUDE.md, docs/DESIGN.md e docs/REVISAO_DESIGN.md. Execute a revisão de design descrita em docs/REVISAO_DESIGN.md, onda por onda. Antes de cada onda, me mostre um plano curto e espere o meu OK.
> ```
>
> Se preferir gastar menos, use `/model opus` (Opus 5.5) para as ondas 2 a 6 e `/model fable` só para a Onda 1 (que define o sistema todo). Dentro do Claude Code, `/effort high` ou escrever `ultrathink` no começo de um pedido faz ele pensar mais numa tarefa específica.

---

## 0. Contexto e regras (leia antes de tudo)

Você é um designer de produto sênior + engenheiro front-end trabalhando no **Diver**, uma plataforma de estudos gamificada em HTML, CSS e JavaScript puros (sem framework, sem build). O objetivo desta tarefa é **elevar o design ao nível dos melhores produtos de educação e produtividade do mundo** (padrão Duolingo, Brilliant, Linear, Notion, Khan Academy), sem perder a identidade marinha do Diver e **sem mudar nenhum comportamento** do app.

Antes de escrever qualquer código:

1. Leia `CLAUDE.md`, `docs/DESIGN.md`, `docs/ARQUITETURA.md` e `css/ritmo.css`.
2. Respeite todas as regras técnicas do `CLAUDE.md`: HTML/CSS/JS puros, caminhos relativos, nomes em minúsculas, nada de dependência de rede além do Google Fonts, `localStorage` em try/catch, nunca `alert/confirm/prompt`, nenhuma cor solta fora dos tokens.
3. **Não mude o comportamento de perguntas e respostas, da economia (XP/pérolas/oxigênio), do login, da sincronização nem dos jogos.** Esta tarefa é de **forma**, não de função. Se uma melhoria visual exigir mudar lógica, pare e pergunte.
4. Não renomeie ids, classes usadas pelo JS (`data-secao`, `#quiz-alternativas`, `.mascote`, etc.) nem campos dos JSON. Para trocar um estilo, mude o CSS; para trocar a estrutura, mude o HTML que o JS gera (nos arquivos `js/*.js`) mantendo os mesmos ids e `data-*`.
5. Trabalhe em **ondas** (abaixo). Cada onda = um plano curto, meu OK, implementação, auditoria visual (computador e celular), um commit em português (`feat(design): ...` ou `fix(design): ...`).
6. Em cada onda, tire **fotos de antes e depois** (Playwright, `npx playwright screenshot` ou o script que você criar em `scripts/fotos-design.mjs`) em **390×844 (celular)** e **1440×900 (computador)**, para as telas: Início, Sala, Mapa do curso, "Antes de mergulhar", Quiz (antes e depois de responder), Resumo, Simulado, Revisão, Sala de Jogos, Tarefas, Calendário, Cronograma, Modo Foco, Perfil, Estatísticas, Descompressão e Login. Guarde em `docs/fotos/design/<onda>/`. Para fotografar sem login, rode com `js/config.js` vazio (modo local) num servidor local.
7. Explique o que fez como se eu fosse iniciante. Ao final de cada onda, atualize `docs/DESIGN.md` (e `CLAUDE.md` se mudar uma decisão).

### Diagnóstico que motivou esta revisão (medido no código em 2026-10-15)

O Diver já está bem acima da média: paleta coerente, tokens de espaço (`ritmo.css`), mascote vetorial, estados vazios com personalidade, `<dialog>` nativo com foco preso, `prefers-reduced-motion` respeitado em 19 pontos e contraste AA+ em todos os pares principais (texto suave sobre superfície 6,7:1; botão turquesa 6,2:1). O que separa o Diver dos melhores é **consistência de sistema** e **polimento de detalhe**:

| Problema medido | Evidência |
| --- | --- |
| Escala tipográfica inexistente | **40 tamanhos de fonte diferentes** em `css/` (0,6rem a 1,5rem, mais 6 `clamp`). Rótulos de 0,62–0,72rem (10–11,5 px) em `.rotulo`, `.tag`, `.lateral__grupo`. |
| Breakpoints caóticos | **20 larguras de corte distintas** (420, 479, 480, 520, 559, 599, 600, 639, 640, 699, 720, 760, 859, 900, 959, 960, 1100). |
| Cores soltas | **41 hex fora do `:root`** em `estilo.css` (ex.: `#0E2B4F` no feedback, `#0C8276` na sombra do botão, `#2CCBB9` no hover); **59 hex** em `js/tutorial.js`, 37 em `caso-resolvido.js`. Dois sistemas de nomes: `docs/DESIGN.md` fala em `--diver-*`, o CSS usa `--turquesa`, `--superficie` etc. Valor de "Superfície" diverge (`#102D52` no doc, `#12325A` no código). |
| Botões sem hierarquia única | O mesmo botão "Entrar" aparece em amarelo, turquesa, azul e verde (uma cor por sala). Sombra/glow turquesa de 24 px nos primários. |
| Controles nativos sem estilo | `select`, `input[type=date]`, `input[type=time]` com aparência do navegador (Calendário, meta diária, Sala de Jogos "30 s"/"6 pares"). Falta `color-scheme: dark`. |
| Feedback do quiz cobre a questão | `.feedback` é `position: fixed; bottom: 0` e tapa as alternativas: no celular o aluno não vê a alternativa que marcou nem a certa enquanto lê a explicação; no computador cobre metade do cartão. |
| Cartão dentro de cartão | No mapa do curso há 3 bordas aninhadas (fase → linha "Antes de mergulhar" → selo). |
| Desktop subaproveitado | Conteúdo em coluna de 720 px centrada numa área de ~1170 px: o Início tem ~450 px de herói (mascote + logo + slogan + texto) antes da primeira ação. |
| Ícones com pesos diferentes | O sprite usa `stroke-width` 2, 2,2, 2,4, 2,6, 2,8 e 3,2. **44 emojis** no JS/HTML (🃏 🔎 📚 🧠 🔄 ⚔️ 🏁 🥇) que mudam de cara por sistema operacional. |
| Celular: defeitos pontuais | "1 de 10" quebra em duas linhas no topo do quiz; o toast de conquista cobre o oxigênio; no Calendário o par "Mês/Semana" cai desalinhado abaixo de "Hoje"; na Descompressão o cabeçalho "Investigação · 10 a 15 min · 1 por dia + Novo hoje + Jogar" fica espremido; no Tarefas a 2ª coluna do quadro some sem indicação de rolagem. |
| Carregamento | **61 `<script>`** no `<head>`, 1,3 MB de JS e 306 KB de CSS baixados antes da primeira tela; `catalogo.json` com 300 KB. Sem skeleton (só o texto "Procurando as salas…"). Transição `surgir` usa `filter: blur()`, caro no celular. Sem `manifest.json`, `apple-touch-icon` nem Open Graph. |

---

## Onda 1 — Fundação: um único sistema de tokens (`css/tokens.css`)

**Objetivo:** todo valor visual (cor, tipo, espaço, raio, sombra, movimento, camada, breakpoint) vem de **um arquivo só**, e os outros CSS só consomem tokens.

1. Crie `css/tokens.css`, carregado **antes** de todos os outros CSS no `index.html`. Mova para lá tudo que hoje está no `:root` de `estilo.css` e `ritmo.css`. Mantenha os nomes atuais (`--turquesa`, `--superficie`, `--esp-4`…) como estão para não quebrar nada, e **adicione** os que faltam abaixo. Atualize `docs/DESIGN.md` para que os nomes do documento sejam exatamente os do código (apague a lista `--diver-*`).

2. **Cor.** Defina a paleta em camadas, nesta ordem, e depois substitua **todos os 41 hex soltos** de `estilo.css` (e os de `areas.css`, `jogos.css`, `descompressao.css` se houver) por tokens:
   - *Fundos:* `--fundo-0` (`#06172D`, o mais fundo), `--fundo-1` (`#0B2545`, base do app), `--fundo-2` (`#0E2B4F`, barra lateral/painéis fixos).
   - *Superfícies:* `--superficie-1` (cartão padrão, `#12325A`), `--superficie-2` (cartão sobre cartão / hover, `#1A416F`), `--superficie-3` (campo de formulário, menu aberto). Regra: **um nível de superfície por nível de aninhamento**; nunca duas bordas encostadas.
   - *Bordas:* `--borda-sutil` (rgba 12 %), `--borda-forte` (rgba 24 %), `--borda-foco` (amarelo).
   - *Marca e semântica:* `--primaria` (= turquesa), `--primaria-hover` (`#2CCBB9`, hoje solto), `--primaria-pressionada` (`#0EA597`), `--primaria-sombra` (`#0C8276`, hoje solto), `--destaque` (amarelo, só XP/conquistas/selo "recomendado"), `--sucesso` (verde `#86EFAC` para "acertou" e barras completas), `--erro` (coral), `--aviso` (laranja `#FDBA74`), `--info` (azul `#60A5FA`).
   - *Texto:* `--texto-1` (gelo), `--texto-2` (névoa), `--texto-3` (névoa a 70 %, só para metadados), `--texto-inverso` (`#0B2545`).
   - *Cores de sala* (`--sala-enem`, `--sala-radiologia`, `--sala-tecnologia`, `--sala-ensino-medio`) **somente** para o ícone/filete lateral do cartão da sala, nunca para o botão.
   - Em `js/tutorial.js`, `js/jogos/caso-resolvido.js` e `js/descompressao/tiro.js`, troque os hex por `getComputedStyle(document.documentElement).getPropertyValue('--token')` através de um helper `UI.cor('token')` em `js/ui.js`. (Pode deixar `js/descompressao/cardume.js` e `js/mascotes.js`: são pinturas de canvas/SVG com paleta própria; só registre isso no `docs/DESIGN.md`.)

3. **Tipografia.** Crie uma escala de **8 tamanhos** e troque **todos** os `font-size` do projeto por ela (sem exceção; onde o valor atual não bate, arredonde para o degrau mais perto):
   - `--t-xs` 0,75rem (12 px, **mínimo absoluto**; nenhum texto abaixo disso, nem rótulos em caixa alta), `--t-sm` 0,875rem, `--t-md` 1rem, `--t-lg` 1,125rem, `--t-xl` 1,375rem, `--t-2xl` 1,75rem, `--t-3xl` `clamp(2rem, 1.5rem + 2vw, 2.5rem)`, `--t-display` `clamp(2.5rem, 2rem + 3vw, 3.5rem)` (só o logo do Início e o cronômetro do Foco).
   - Entrelinhas: `--lh-apertada` 1,15 (títulos), `--lh-normal` 1,5, `--lh-leitura` 1,6 (artigos e explicações).
   - Pesos: 500 corpo, 600 ênfase, 700 títulos de cartão, 800 só títulos de página e números grandes. Remova o peso 400 da URL do Google Fonts se ninguém usar.
   - `.rotulo` (mono, caixa alta): `--t-xs`, espaçamento 0,08em, cor `--texto-2`. `.lateral__grupo`: idem.
   - `text-wrap: balance` em todo `h1, h2, h3`; `text-wrap: pretty` em `p` (já existe em ritmo.css: mantenha).
   - Largura de leitura: artigos e explicações em `max-width: 65ch`.

4. **Raios, sombras, movimento e camadas.**
   - Raios: `--raio-sm` 8, `--raio-md` 12, `--raio-lg` 16, `--raio-xl` 24, `--raio-pilula` 999. Botões em pílula; cartões 16; cartão grande (herói da sala) 24; campos 12; tags pílula.
   - Sombras (4 níveis): `--sombra-1` (repouso dos cartões, discreta), `--sombra-2` (hover/elevado), `--sombra-3` (menus, toast), `--sombra-4` (dialog). **Remova o glow turquesa** dos botões primários; mantenha só a borda inferior 3D (`0 4px 0 var(--primaria-sombra)`).
   - Movimento: `--dur-rapida` 120ms, `--dur-normal` 200ms, `--dur-lenta` 320ms; `--ease-saida` `cubic-bezier(.2,.8,.2,1)`, `--ease-elastica` para o pulinho do mascote. **Tire o `filter: blur()`** de `@keyframes surgir`: só opacidade + `translateY(8px)`.
   - Camadas (`z-index`): `--z-base` 0, `--z-sticky` 10, `--z-lateral` 20, `--z-flutuante` 30 (feedback, menus), `--z-dialogo` 40, `--z-toast` 50, `--z-transicao` 60. Troque os 15 valores soltos.

5. **Breakpoints:** só **4**, como custom media via comentário padrão no topo de cada arquivo (CSS não interpola variáveis em `@media`, então padronize os números na mão): `sm` 480, `md` 768, `lg` 1024, `xl` 1280. Reescreva as 20 larguras atuais para esses 4. A barra lateral fixa passa a aparecer em `lg` (1024) em vez de 960.

6. Adicione no `<head>`: `<meta name="color-scheme" content="dark">` e `:root { color-scheme: dark; }` em `tokens.css` (os controles nativos passam a nascer escuros).

7. **Auditoria da onda:** um script `scripts/auditar-design.mjs` que lê `css/*.css` e falha se encontrar hex fora de `tokens.css`, `font-size` que não seja um token, `z-index` numérico ou `@media` com largura fora das 4. Rode e cole o resultado.

---

## Onda 2 — Componentes base (botões, campos, cartões, tags, ícones)

1. **Botões.** Uma família só, em `css/estilo.css`:
   - `--primario` (turquesa, texto inverso): **uma ação principal por tela**, sempre a mesma cor. Os botões "Entrar" das salas e "Começar/Mergulhar/Jogar" viram primários turquesa; a cor da sala fica no ícone e no filete do cartão.
   - `--secundario` (superfície-2 com borda forte, texto 1), `--fantasma` (sem fundo, texto 2; hover superfície-2), `--perigo` (coral, só para zerar/apagar/sair), `--link` (texto turquesa-claro sublinhado no hover).
   - Tamanhos: `--pequeno` 36 px (só computador, dentro de linhas), padrão 44 px, `--grande` 52 px (ação principal do Início, do quiz e do resumo). No toque (`pointer: coarse`), nada abaixo de 44 px.
   - Estados obrigatórios em todos: hover (cor +6 % de luz), ativo (afunda 3 px, sombra some), foco (anel amarelo `outline-offset: 3px`), desabilitado (opacidade 0,5, cursor `not-allowed`), **carregando** (`aria-busy="true"` + spinner de 16 px no lugar do ícone; use em "Começar simulado", "Entrar" do login, "Enviar PDF", "Montar meu cronograma").
   - Ícone + texto: ícone 20 px à esquerda, gap 8 px. Botão só-ícone: 44×44, `aria-label` obrigatório, tooltip nativa via `title`.

2. **Campos de formulário** (`input`, `select`, `textarea`, `input[type=date|time|number]`): aparência própria com `appearance: none`, fundo `--superficie-3`, borda `--borda-sutil`, foco turquesa 2 px + anel, altura 44 px, raio `--raio-md`, placeholder `--texto-3`. `select` com seta em SVG inline (data-URI, cor via `currentColor` não funciona em background: use a cor névoa fixa a partir do token em `tokens.css`). Rótulo acima do campo (`--t-sm`, peso 600, 6 px de distância), texto de ajuda e de erro abaixo (`--t-xs`; erro em coral com ícone `#i-alerta` e `aria-describedby`). Campos obrigatórios marcados no rótulo, não só por cor. Aplique no Login, Calendário (Novo evento), Cronograma (assistente), Tarefas, Admin e Perfil.

3. **Cartões.** `.cartao` padrão = superfície-1 + borda sutil + sombra-1, **sem** `backdrop-filter` (caro e desnecessário sobre fundo opaco). Variantes: `--interativo` (hover: sombra-2 + borda forte + `translateY(-2px)`; foco igual ao hover; `cursor: pointer` só se o cartão inteiro for clicável e então o cartão é um `<a>`/`<button>` de verdade), `--destaque` (borda esquerda de 4 px na cor semântica ou da sala), `--heroi` (raio-xl, degradê sutil da cor da sala a 12 % para transparente). **Regra de aninhamento:** cartão dentro de cartão usa `--superficie-2` **sem borda e sem sombra** (ex.: a linha "Antes de mergulhar" dentro da fase; "Suas provas" dentro do Simulado).

4. **Tags/chips/selos.** Um só componente `.tag` (pílula, `--t-xs`, peso 700, 24 px de altura): `--neutra` (superfície-2/texto-2, para contagens como "15 matérias"), `--primaria` (turquesa 16 %), `--destaque` (amarelo sólido, texto inverso, só "Recomendado" e "Novo hoje"), `--sucesso`, `--erro`. Os números ("7.170 questões") em mono `--t-xs`.

5. **Ícones.** Normalize o sprite do `index.html` para `stroke-width="2"` (ou 1,75 em ícones de 20 px) e `stroke-linecap="round"`, todos em 24 × 24 com caixa de 2 px de respiro. Crie os ícones que faltam para **substituir os 44 emojis** de interface em `js/` e `index.html` por `<svg class="icone"><use href="#i-..."/></svg>` (`#i-cartas` para 🃏, `#i-lupa` para 🔎, `#i-livro` para 📚, `#i-cerebro` para 🧠, `#i-revisao` para 🔄, `#i-espadas` para ⚔️, `#i-bandeira` para 🏁, `#i-medalha-1/2/3` para 🥇🥈🥉, `#i-lampada` para 💡, `#i-som`/`#i-mudo` para 🔊/🔇). Emojis **dentro de conteúdo de curso** (associações do artigo, `fases[].resumo`) podem ficar: são dados, não interface. Os glifos ✓ ✗ ★ ☆ viram `#i-check`, `#i-x`, `#i-estrela` e `#i-estrela-vazia`.

6. **Progresso.** Um só componente `.barra` (altura 8 px; `--fina` 6 px; `--grossa` 12 px) com trilho `--superficie-2`, preenchimento com degradê turquesa → turquesa-claro, canto pílula, `role="progressbar"` + `aria-valuenow/min/max`, e um brilho animado **só** quando o valor muda (classe `.barra--subiu` por 600 ms). Use no XP, na meta, nas salas, nos cursos, nas fases e no quiz.

7. **Toasts** (`#toasts`): canto superior direito no computador, **topo centralizado abaixo da barra do topo no celular, nunca sobre o oxigênio/cronômetro** (adicione `padding-top` quando a tela estiver em `.modo-foco`); ícone à esquerda, título e linha de apoio; some em 4 s; empilha no máximo 3; `aria-live="polite"` (já existe).

8. **Skeleton de carregamento**: componente `.esqueleto` (blocos cinza-azulados com shimmer; estático com `prefers-reduced-motion`) com as formas de cartão de sala, de curso e de fase. Use em `#lista-salas` (no lugar de "Procurando as salas no fundo do mar…": o texto vai para um `aria-live` oculto), na lista de cursos da sala e no mapa enquanto o JSON do curso baixa.

---

## Onda 3 — Layout, navegação e hierarquia por tela

**Regras gerais de página**
- Todo `tela` tem o mesmo cabeçalho: rótulo mono (`.rotulo`) → `h1` (`--t-2xl`) → subtítulo (`--t-md`, texto-2, máx. 65ch) → **uma** ação principal à direita (computador) ou abaixo (celular). Hoje algumas telas têm cabeçalho em `.area-cabeca`, outras em `.barra-topo`, outras montadas no JS: padronize numa função `UI.cabecalhoPagina({ rotulo, titulo, sub, acoes })`.
- Grade de conteúdo no computador: `max-width: 1120px` para todas as telas (a coluna de 720 fica só para quiz, artigo, resumo e login, onde a leitura manda), com `--ritmo-pagina-x` de 40 px e seções em 2 colunas (8/4) quando houver "conteúdo + lateral" (ex.: mapa do curso à esquerda, status + conquistas à direita; Simulado à esquerda, histórico à direita).
- Espaço entre seções sempre `--ritmo-secao`; títulos de seção `h2` em `--t-lg` com a contagem em `.tag--neutra`.

**Início**
- Herói mais baixo: mascote 160 px (computador) / 112 px (celular), logo `--t-3xl`, slogan e texto em **uma** linha de apoio. Herói e "Continuar de onde parou" lado a lado no computador.
- **Uma ação principal clara**: se há progresso, o cartão "Continuar de onde parou" é o primeiro e o maior (botão primário grande "Continuar"); se não há, o cartão de nivelamento vira o primeiro e os cartões de sala ficam em grade 4 colunas (computador) / 1 coluna (celular) com **botão primário turquesa igual em todos**.
- "Seu dia": 4 cartões iguais em altura (grade 2×2 no computador, 1 coluna no celular), ícone + rótulo mono + número grande; quando vazios, uma frase e um link, sem botão primário (reserve o primário para o desafio do dia).
- Rodapé com versão/ambiente discreto.

**Sala**
- Herói da sala com raio-xl e degradê da cor da sala; número grandes (matérias, aulas, questões) em mono; barra de progresso grossa.
- O convite ao Cronograma vira um **banner fino** (ícone + frase + link), não um cartão com botão primário competindo com "Começar".
- "Comece por aqui" é o único cartão com selo amarelo e botão primário. As matérias por área em grade de cartões `--interativo` de altura igual (`grid-auto-rows: 1fr`), com o filete da cor da área e a barra de progresso fina; o cartão inteiro é clicável (vira `<button>`), sem a setinha redonda separada.

**Mapa do curso (painel)**
- Cabeçalho com voltar + rótulo + `h1` + status compacto à direita (nível, XP, pérolas, ofensiva) numa barra fina; no celular, o status vira uma linha rolável de chips.
- Cada fase = um cartão com: número em círculo (cheio quando feita, contorno quando aberta, cadeado quando trancada), título `--t-lg`, descrição `--t-sm` texto-2, metadados mono, e no pé as **ações em lista sem bordas** (superfície-2): "Antes de mergulhar" e "Mão na massa" com o estado à direita como `.tag`. O botão "Mergulhar" é primário; "Ler primeiro" é secundário com ícone de livro. Fase atual recebe borda turquesa de 2 px e um pequeno rótulo "Você está aqui".
- Linha vertical ligando as fases (hoje tracejada e quase invisível): 2 px, turquesa a 40 %, e preenchida em turquesa sólido até a fase atual.
- Conquistas em grade de 4/6 com os bloqueados a 50 % de opacidade e ícone de cadeado só no hover/foco (menos ruído).
- "Zerar progresso desta trilha" fica num `details` "Zona de perigo" fechado por padrão.

**"Antes de mergulhar" (artigo)**
- O caminho 📚→🧠→🃏→⚔️→🔄 vira uma **barra de passos horizontal** (stepper) com ícones do sprite e o passo atual destacado; no celular rola horizontalmente com snap.
- Tipografia de leitura: corpo `--t-md`/`--lh-leitura`, `max-width: 65ch`, `h2` do artigo `--t-xl`, citações e "Dica de mergulhador" como bloco com filete amarelo. A janela tem barra de rolagem única (regra já existente). Rodapé fixo com "Fechar" (fantasma) e "Bora mergulhar!" (primário).

**Quiz (Mergulho, Simulado, Revisão, Prova)**
- Topo em uma linha que **nunca quebra**: sair · barra de progresso (flex 1) · oxigênio/cronômetro · "1 de 10" em mono com `white-space: nowrap`. No celular, esconda o rótulo "Mergulho · Linguagens 1…" atrás de um `title` e mostre só "1/10".
- **Feedback sem cobrir a questão:** o painel `#quiz-feedback` deixa de ser `position: fixed` e passa a entrar **abaixo das alternativas, dentro do fluxo** (animação de altura/opacidade), com a página rolando suavemente até ele (`scrollIntoView({ block: 'nearest' })`). A alternativa marcada fica coral (errou) ou verde (acertou), a correta sempre verde com ícone `#i-check`; as outras a 50 %. O botão "Continuar" fica **fixo no rodapé** (barra de 72 px com `env(safe-area-inset-bottom)`) para o polegar alcançar, e o painel tem `padding-bottom` para não ficar escondido. Atalho de teclado: Enter/Espaço continua (já existe; mantenha).
- Explicação: "Por que não as outras" em lista com a letra em mono; "Dica de mergulhador" em bloco amarelo com ícone de lâmpada. Comentários longos ganham `max-height` com "Ler mais" só no celular.
- Alternativas: letra num quadrado de 32 px (superfície-2), texto `--t-md`, altura mínima 56 px, hover borda turquesa, foco anel amarelo, estado pressionado afunda 1 px.

**Resumo da sessão**
- Mascote + título + estrelas no topo; os 4 números em cartões iguais (acertos, tempo, XP em amarelo, pérolas); "Desempenho por tema" como barras horizontais (não só texto); ações: uma primária, as outras secundárias/fantasma, em coluna no celular.

**Simulado, Revisão, Prova final, Sala de Jogos, Descompressão**
- Simulado: cartão "Montar simulado" como herói (campo + botão primário na mesma linha); "Provas antigas" como cartão secundário com botão secundário; "Suas provas" e "Histórico" numa coluna lateral no computador.
- Revisão: estado vazio com mascote (já bom); quando há itens, lista com chip do tema, ícone de "voltou", e botão primário "Revisar agora" no cabeçalho.
- Sala de Jogos e Descompressão: cartões de jogo com **cabeçalho em 2 linhas fixas** (ícone 40 px + nome `--t-lg` + duração `--t-xs` mono abaixo do nome), descrição `--t-sm` com `line-clamp: 3`, e rodapé com os controles (select pequeno) à esquerda e "Jogar" **primário pequeno** à direita; selo "Novo hoje" no canto superior direito **sobreposto**, fora do fluxo do título (resolve o aperto no celular). Altura igual em todas as linhas.

**Tarefas (quadro), Calendário, Cronograma, Modo Foco**
- Tarefas: colunas com `scroll-snap-type: x mandatory`, sombra de "tem mais" nas bordas (`mask-image` linear), indicador de página (pontinhos) no celular, e botão "+ Adicionar lista" sempre visível. Cartões de tarefa com etiqueta colorida à esquerda, prazo em chip e subtarefas como progresso.
- Calendário: cabeçalho em **uma linha** no computador (mês · setas · Hoje … Mês/Semana) e **duas linhas alinhadas** no celular (linha 1: setas + mês + Hoje; linha 2: filtros e Mês/Semana). Dias com eventos mostram no máximo 3 pontos coloridos + "+n"; dia de hoje com círculo amarelo cheio; dia selecionado com anel turquesa. Painel do dia como cartão à direita (computador) ou folha inferior (celular).
- Cronograma: assistente de 5 passos com stepper no topo (passo atual, feitos com check) e botões "Voltar"/"Continuar" fixos no rodapé do cartão; prévia da semana como grade 7 colunas com blocos coloridos por disciplina (cores de `--sala-*` a 24 % de fundo e texto na cor).
- Modo Foco: anel de progresso de 240 px (computador) / 200 px (celular) com o tempo em `--t-display` mono; opções 25/5 e 50/10 como segmented control; botão primário grande; o estado "rodando" escurece o fundo e esconde a barra lateral (já é `.modo-foco`).

**Perfil e Estatísticas**
- Perfil: cartão do herói com mascote 120 px, setinhas de easter egg mantidas; "Seus números" em 4 cartões iguais com número `--t-2xl` mono; "Por curso" como **tabela de verdade no computador** (cabeçalho pegajoso, linhas de 44 px, zebra sutil, alinhamento numérico à direita) e cartões no celular (já é, mas com rótulos mono menores e 2 colunas).
- Estatísticas: seletor de curso como `select` estilizado; gráficos (se houver) com as cores de `--sala-*`.

**Barra lateral e topo**
- Barra lateral: largura 264 px, item de 40 px (44 no toque), ícone 20 px, texto `--t-sm` peso 600, item atual com fundo `--superficie-2` + filete turquesa de 3 px + texto gelo (não turquesa-claro, para o contraste dos ícones ficar igual). Grupos (`ESTUDAR`, `ORGANIZAR`…) em `--t-xs` mono texto-3 com 24 px acima. "Sala atual" como cartão superfície-2 com chevron; rodapé do nível com barra fina.
- No celular, a gaveta ocupa 86 vw com fundo `--fundo-2` opaco, sombra-4, e o botão de fechar no topo (já tem); bloqueie a rolagem do fundo quando aberta (`overflow: hidden` no `body`) e feche com Esc.
- Topo do celular: 56 px, marca à esquerda, pérolas à direita com ícone; `backdrop-filter` pode ficar aqui (é uma barra só).

**Login**
- Centralizado vertical e horizontalmente, mascote 120 px (não cortado em telas baixas: `min-height: 100dvh` + `padding` + rolagem), cartão de 400 px, campos estilizados (Onda 2), botão primário grande com estado carregando, erro inline abaixo do campo (não em toast), link "Esqueci a senha" se existir fluxo, e o aviso "Ainda não tem acesso?" em `--t-sm`.

---

## Onda 4 — Responsividade e celular (auditoria tela a tela)

Para cada tela, em 360, 390, 430, 768, 1024, 1280 e 1440 px:
1. Nada transborda horizontalmente (`document.documentElement.scrollWidth === clientWidth`): escreva isso no `scripts/auditar-design.mjs` com Playwright e rode em todas as rotas `#...`.
2. Nenhum alvo de toque abaixo de 44 × 44 px no celular (`pointer: coarse`): o script lista os `button, a, [role=button], input, select` menores que isso.
3. Nenhum texto abaixo de 12 px: o script lista elementos com `font-size` computado < 12 px.
4. Conserte os defeitos já conhecidos: "1 de 10" quebrando; toast sobre o oxigênio; "Mês/Semana" desalinhado no Calendário; cabeçalho espremido dos jogos da Descompressão; colunas do Tarefas sem indicação de rolagem; cartão de sala do Início com botão fora do eixo da barra.
5. Áreas seguras: `env(safe-area-inset-*)` no topo, no rodapé fixo do quiz e nos toasts. `100dvh` onde hoje é `100vh` (há `@supports` para isso em 3 lugares; generalize).
6. Orientação paisagem no celular (844 × 390): o quiz continua usável (topo fixo de 48 px, alternativas roláveis, "Continuar" no rodapé).

---

## Onda 5 — Movimento, microinterações e feedback

Tudo abaixo respeita `prefers-reduced-motion: reduce` (vira instantâneo ou estático):
1. Transição de tela: opacidade + 8 px de subida em `--dur-normal`, **sem blur**. Troca de seção na barra lateral: o filete turquesa desliza entre itens (`view-transition` se suportado, senão `transition` no `transform`).
2. Acerto: a alternativa correta pulsa uma vez (escala 1 → 1,02 → 1), o mascote pula (já existe), e os números de XP/pérolas no feedback **contam** de 0 ao valor em 400 ms (`UI.contar(el, de, para)`). Erro: a alternativa marcada balança 2 × 4 px (sem exagero) e o mascote fica triste (já existe).
3. Barra de progresso cresce com `transition: width --dur-lenta --ease-saida` e brilho rápido ao subir.
4. Conquista desbloqueada: toast com ícone girando 360° uma vez e confete **discreto** (12 partículas, 800 ms) só nas conquistas e no fim de fase; nunca em acertos comuns.
5. Botões: hover eleva 1 px (computador), ativo afunda 3 px (já existe); cartões interativos elevam 2 px com sombra-2.
6. Bolhas do fundo: no máximo 12, só `transform/opacity`, `will-change: transform`, e **pausadas** (`animation-play-state: paused`) quando a aba está oculta (`visibilitychange`) e quando um quiz/jogo está aberto, para o celular não esquentar.
7. Cortina de transição (`#transicao`): mantém, mas com duração total ≤ 700 ms.
8. Teclado: anel de foco amarelo em tudo (já), ordem de foco lógica, `Esc` fecha gaveta/dialog/feedback, atalhos A–E/1–5 nas alternativas (já), e um `?` abre uma folha com os atalhos (existe o `details` "Atalhos do teclado" no Tarefas; generalize em `UI.atalhos`).

---

## Onda 6 — Desempenho de carregamento, PWA e metadados

(Sem build e sem framework. Tudo com script Node já existente em `scripts/` ou carregamento dinâmico no navegador.)
1. **Carregamento sob demanda:** mantenha no `<head>` só o núcleo (`config, trilhas, progresso, conquistas, economia, quiz, ui, mascotes, nuvem, atividade, conta, cartas, grupos, app, tutorial, artigo, caminho`). Os jogos (`js/jogos/*`), laboratórios (`js/laboratorio/*`, `js/jogos/robo-entregador.js`…), Descompressão (`js/descompressao*`), Admin/Fila (`admin.js`, `fila-validacao.js`), PDFs (`leitor-prova.js`, `provas-enviadas.js`), Quadros/Cronograma/Diagnóstica/Estatísticas carregam **na primeira vez que a seção abre**, via `UI.carregarScript(url)` (cria `<script defer>` e devolve uma Promise; cache em memória; mostra skeleton enquanto baixa). O registro de jogos passa a ter `arquivo:` em vez de depender do script já estar na página. Teste: o Início deve abrir com ≤ 20 scripts.
2. CSS: `jogos.css`, `descompressao.css`, `laboratorio.css`, `artigo.css`, `caminho.css` viram `<link rel="stylesheet" media="print" onload="this.media='all'">` ou são injetados junto com o script da seção. `tokens.css`, `ritmo.css`, `estilo.css`, `areas.css` continuam bloqueantes.
3. `catalogo.json` (300 KB): gere em `scripts/gerar-catalogo.mjs` uma versão **mínima** (`catalogo-min.json`: id, nome, sala, área, contagens, cor) para o Início/Sala e deixe o completo só para a Biblioteca; adicione `Cache-Control` no `_headers` (Cloudflare) e `?v=<hash>` nos fetch.
4. Fontes: Plus Jakarta Sans só nos pesos 500/600/700/800 e JetBrains Mono 500/700; `<link rel="preload" as="style">` + `display=swap` (já). Meça com `fonts.ready` que não há FOUT visível no herói.
5. **PWA leve:** `manifest.webmanifest` (nome, cores `#0B2545`/`#14B8A6`, ícones 192/512 e `maskable` gerados a partir da máscara do Diver em `assets/icones/`), `apple-touch-icon`, `theme-color` por `media` (já tem um). **Sem service worker por enquanto** (evita cache velho em produção); registre a decisão.
6. Metadados: `og:title`, `og:description`, `og:image` (1200 × 630 com o mascote e o slogan, em `assets/og.png`), `twitter:card`, `<link rel="canonical">`, e `lang="pt-BR"` (já).
7. Meça antes e depois com Lighthouse (`npx lighthouse http://localhost:8765 --preset=desktop` e mobile) e cole as 4 notas no `docs/DESIGN.md`. Meta: Performance ≥ 90 no celular, Acessibilidade 100, Boas práticas ≥ 95.

---

## Onda 7 — Documentação viva e página de componentes

1. Crie `docs/componentes.html` (fora do app, aberta direto no navegador): uma página que mostra **todos** os tokens (amostras de cor com nome e contraste calculado contra o fundo), a escala tipográfica, espaços, raios, sombras, botões em todos os estados, campos, cartões, tags, barras, toasts, skeleton, ícones do sprite (com nome) e o mascote nas 4 expressões. É o "Storybook" do Diver em um arquivo só; toda peça nova entra ali primeiro.
2. Reescreva `docs/DESIGN.md` para refletir exatamente o sistema implementado (tokens com os nomes reais, regras de uso, o que é proibido, checklist de revisão visual) e adicione a seção "Como auditar" com os comandos de `scripts/auditar-design.mjs` e `scripts/fotos-design.mjs`.
3. Atualize `CLAUDE.md` (seção Visual) em 10 linhas: tokens em `css/tokens.css`, escala de 8 tamanhos, 4 breakpoints, um primário por tela, sem emojis na interface, auditor obrigatório antes de commit.

---

## Critérios de aceite (o que eu vou conferir no final)

- [ ] `node scripts/auditar-design.mjs` passa sem erro (0 hex fora dos tokens, 0 `font-size` fora da escala, 0 `z-index` solto, 0 `@media` fora dos 4 breakpoints, 0 transbordo horizontal, 0 alvo < 44 px no toque, 0 texto < 12 px).
- [ ] Fotos de antes/depois de todas as telas, celular e computador, em `docs/fotos/design/`.
- [ ] Cada tela tem **uma** ação primária turquesa, visível sem rolar no celular.
- [ ] O feedback do quiz não cobre a questão nem as alternativas.
- [ ] Nenhum controle nativo "cru" (select/date/time) em tela nenhuma.
- [ ] Nenhum emoji de interface; todos os ícones do sprite com o mesmo peso de traço.
- [ ] Lighthouse celular: Performance ≥ 90, Acessibilidade 100.
- [ ] Nenhum comportamento mudou: os testes manuais do `docs/ROADMAP.md`/`docs/JOGOS.md` continuam passando (Mergulho, Simulado, Revisão, Prova, 3 jogos, login nos testes, sincronização).
- [ ] `docs/DESIGN.md`, `docs/componentes.html` e `CLAUDE.md` atualizados; um commit por onda.

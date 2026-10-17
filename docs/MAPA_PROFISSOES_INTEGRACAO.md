# Mapa das Profissões: guia de integração no Diver

> Para o Claude Code. Versão 1.1, 14/10/2026. Leia junto com `docs/MAPA_PROFISSOES.md` (o quê e por quê) e `docs/MAPA_PROFISSOES_INTERACOES.md` (as seis entradas).
> A implementação de referência roda sozinha: `python3 -m http.server` na raiz do projeto e abra `/docs/prototipos/profissoes/profissoes.html`.

> **Integrado em 2026-10-16 (Fase 1).** No app, o que mudou em relação a este guia (registrado no `docs/DIARIO.md`):
> - `profissoes.html` e `profissoes-preview-tokens.css` ficaram em `docs/prototipos/profissoes/` (fora de `css/`, para o auditor de design não ler cores soltas). Os tokens do app estão em `css/tokens.css`.
> - Os dois scripts **não** entram no `index.html` com `defer`: o Início abre com 20 scripts, e o resto vem em pacotes. Eles são o pacote `profissoes` em `PACOTES` (`js/app.js`), baixado na primeira vez que a área abre. O CSS entra no `index.html` sem travar (`media="print"` → `all`).
> - Tela `#tela-profissoes`, numa coluna centralizada de 720 px como as outras (nada lado a lado). O roteador manda `#profissoes`, `#profissoes-cartas`, `#profissoes-metodo` e `#profissao-<id>[-dia|-mitos]` para ela.
> - Ganchos novos no módulo: `nomeCurso` (nome do curso no catálogo), `verRascunho` (o aluno não vê ficha em rascunho ou validada: ela aparece como "Em breve"; admin, professor e o modo local veem) e `Profissoes.desmontar()` (solta os atalhos de teclado ao sair da área).
> - Conquistas: são "gerais" (`Conquistas.gerais()`, chave `diver:v1:conquistas-gerais`), fora da contagem de cada curso; aparecem no Perfil.
> - Os 15 tipos de evento foram acrescentados à regra da tabela `eventos_atividade` (`supabase/setup.sql`), já aplicada nos bancos de testes e de produção em 2026-10-16.
>
> **Kit v1.2 (Panorama da Tecnologia), integrado em 2026-10-16.** Detalhes em `docs/MAPA_PROFISSOES_TECNOLOGIA.md`, seção "Como ficou no app":
> - Do kit entraram só `js/profissoes-tecnologia.js` (reescrito no desenho da ficha nova), `data/profissoes/tecnologia.json`, `scripts/conferir-panorama.mjs` e o panorama no `indice.json`. Os `js/profissoes.js` e `css/profissoes.css` do kit **não** foram copiados (apagariam a ficha que se conta ao rolar): os três ganchos novos (`registrarExtensao`, `_util` e o cartão do panorama no mapa) foram levados para o nosso módulo.
> - O panorama em `rascunho` (`indice.json`, `panoramas[].status`) segue a regra das fichas: a equipe e o modo local veem; o aluno vê "Em breve".
> - Os 4 tipos `tecnologia_*` entraram na regra da tabela, aplicada nos bancos de testes e de produção em 2026-10-16.

## 1. O que vem no kit

| Arquivo | O que é | Destino no Diver |
|---|---|---|
| `profissoes.html` | Página de preview, standalone, com roteamento por hash | **Não entra no app.** Ficou em `docs/prototipos/profissoes/` |
| `css/profissoes-preview-tokens.css` | Tokens do Diver copiados só para o preview rodar sozinho | **Não entra no app.** Ficou em `docs/prototipos/profissoes/` |
| `css/profissoes.css` | Estilos da área, prefixo `prof-`, só tokens | `css/profissoes.css` (carregar no `index.html`) |
| `js/profissoes-infograficos.js` | Infográficos em SVG (radar, relógio 24 h, faixa salarial, barras, sazonalidade, linha da formação, anel) | `js/profissoes-infograficos.js` (script clássico, `defer`) |
| `js/profissoes.js` | Telas, estado, ganchos e roteador da área | `js/profissoes.js` (script clássico, `defer`, depois dos infográficos) |
| `data/profissoes/indice.json` | Catálogo leve: áreas, 22 profissões, cartas da Maré | `data/profissoes/indice.json` |
| `data/profissoes/enfermagem.json` | Ficha modelo completa (v2) | `data/profissoes/enfermagem.json` |
| `data/profissoes/trends/trends.json` | Buscas por estado e sazonalidade (Google Trends, 7 cursos) | `data/profissoes/trends/trends.json` |
| `data/profissoes/trends/*.csv` | Dados brutos do Trends, com LEIA-ME | `data/profissoes/trends/` (ou `docs/`), para reprocessar no futuro |
| `scripts/conferir-ficha.mjs` | Confere estrutura, fontes, cenas, mitos, prazo das fontes de salário | `scripts/conferir-ficha.mjs` |
| `js/profissoes-panorama.js` | Panoramas de área (Tecnologia e Medicina): panorama, páginas das áreas e o jogo de afinidade (extensão; até 16/10/2026 se chamava `profissoes-tecnologia.js`) | `js/profissoes-panorama.js` (depois de `profissoes.js`, no mesmo pacote) |
| `data/profissoes/panorama-medicina.json` | Panorama da Medicina: números, doze especialidades, formação, jogo e 15 fontes (no kit v4 chamava `medicina.json`, nome que já era da ficha) | `data/profissoes/panorama-medicina.json` |
| `data/profissoes/tecnologia.json` | Panorama: números, dez áreas, formação, jogo e 18 fontes | `data/profissoes/tecnologia.json` |
| `scripts/conferir-panorama.mjs` | Confere um panorama (áreas, jogo, fontes, prazo de salário) | `scripts/conferir-panorama.mjs` |
| `js/profissoes-mergulho.js` | "Quão fundo é cada carreira" (`#profissoes-fundo`, 2026-10-17): os anos de estudo como profundidade, com profundímetro (extensão) | `js/profissoes-mergulho.js` (depois de `profissoes.js`, no mesmo pacote) |
| `data/profissoes/numeros.json` | Números que comparam as profissões (ranking das matrículas, duração, formato, cenas do dia, etapas da formação), gerado das fichas | `node scripts/gerar-numeros-profissoes.mjs` (nunca à mão) |
| `.claude/skills/criar-ficha-profissao/SKILL.md` | Skill para escrever as próximas fichas | `.claude/skills/criar-ficha-profissao/` |
| `docs/MAPA_PROFISSOES*.md` | Especificação, interações e este guia | `docs/` |

## 2. Como o módulo funciona

`js/profissoes.js` expõe `window.Profissoes` com:

```js
Profissoes.montar(raiz, rota)   // desenha a tela da rota dentro de `raiz` (um elemento vazio)
Profissoes.iniciar(raiz)        // só no preview: liga o hashchange ao montar
Profissoes.ganchos              // objeto com as funções que o app substitui (abaixo)
Profissoes.estado()             // estado do aluno (leitura)
Profissoes.indice(), Profissoes.ficha(id)  // acesso aos JSON, com cache
Profissoes.BASE                 // 'data/profissoes/'
```

Rotas que `montar` entende (sem o `#`):

| Rota | Tela |
|---|---|
| `profissoes` | Mapa: hero com contadores, busca, filtros por área, "na mira", "mais exploradas", regiões e ilhas |
| `profissoes-cartas` | Maré de cartas (deslizar, setas, botões) e o rastro |
| `profissoes-metodo` | "Como fazemos as fichas" |
| `profissao-<id>` | Ficha completa, com os infográficos |
| `profissao-<id>-dia` | "Um dia como…" |
| `profissao-<id>-mitos` | "Mito ou verdade" |
| `profissoes-tecnologia` | Panorama da Tecnologia (números, salários por área, dez áreas, cursos) |
| `tecnologia-<id>` | Uma área da tecnologia: dia típico, salário, DNA, carreira, fontes |
| `profissoes-tecnologia-jogo` | "Que área da tecnologia é a sua praia?" |

Tudo é construído com `createElement` e `textContent`. Nenhum conteúdo de JSON passa por `innerHTML`. O estado fica em `localStorage` na chave `diver:v1:profissoes` (dentro de `try/catch`), então o espelho na nuvem já o sincroniza pelo mecanismo existente (`estado`, chaves `diver:v1:*`).

## 3. Passo a passo da integração

### 3.1 Arquivos e scripts

1. Copie `css/profissoes.css`, `js/profissoes.js`, `js/profissoes-infograficos.js`, `data/profissoes/` e `scripts/conferir-ficha.mjs` para a raiz do projeto, mantendo os caminhos.
2. No `index.html`, adicione o CSS depois de `css/estilo.css` e os dois scripts com `defer`, `profissoes-infograficos.js` antes de `profissoes.js`.
3. Rode `node scripts/conferir-ficha.mjs data/profissoes/enfermagem.json`. Precisa passar.

### 3.2 Rotas e barra lateral

4. No roteador de `js/app.js`, trate os padrões `#profissoes`, `#profissoes-cartas`, `#profissoes-metodo`, `#profissao-<id>`, `#profissao-<id>-dia` e `#profissao-<id>-mitos`: limpe o contêiner da área e chame `Profissoes.montar(container, rotaSemHash)`.
5. Barra lateral: item **Profissões**, ícone de bússola, entre Estudar e Organizar (ou onde o padrão da barra indicar; registre a decisão no DIARIO). Acesso para qualquer conta logada, sem matrícula; no modo local (sem Supabase), igual.
6. `Profissoes.ganchos.navegar = rota => { location.hash = rota }` já é o padrão; se o app navegar de outro jeito, substitua.

### 3.3 Ganchos

Substitua as funções em `Profissoes.ganchos` logo depois de carregar os scripts (em `app.js`):

```js
Profissoes.ganchos.recompensar = ev => Economia.conceder(ev);
// ev = { tipo: 'profissao_dia' | 'profissao_mitos', xp, perolas, profissao }
// Regras: dentro do teto de bônus de jogo; uma vez por profissão (o módulo já garante).
Profissoes.ganchos.registrar = (evento, dados) => Atividade.registrar(evento, dados);
Profissoes.ganchos.confirmar = texto => UI.confirmar(texto);        // Promise<boolean>
Profissoes.ganchos.abrirCurso = idCurso => location.hash = 'mergulho-' + idCurso; // ajuste ao padrão real
Profissoes.ganchos.mascote = () => Mascotes.elemento('feliz');        // opcional
```

Os nomes `Economia.conceder`, `Atividade.registrar` e `Mascotes.elemento` são ilustrativos: use as funções reais de `js/economia.js`, `js/atividade.js` e `js/mascotes.js`.

### 3.4 Eventos de log (sem tabela nova)

Todos vão para `eventos_atividade` pelo gancho `registrar`:

| Evento | Dados |
|---|---|
| `profissoes_mapa` | — |
| `profissao_vista` | `{ profissao }` |
| `profissao_mira` | `{ profissao, ativa }` |
| `profissao_pedido` | `{ profissao }` (ficha "em breve" pedida) |
| `profissao_carta` | `{ profissao, interesse }` |
| `profissoes_cartas_inicio`, `profissoes_cartas_fim` | `{ interesse[], area }` |
| `profissao_chute_salario` | `{ profissao, cargo, chute, media, diferenca, acertou }` (desde 2026-10-17, com a régua; antes, `faixa` no lugar de `diferenca`) |
| `profissao_carta_gerada` | `{ profissao, afinidade }` |
| `profissao_dilema_voto` | `{ profissao, dilema, opcao }` |
| `profissao_materias_chave` | `{ profissao, curso }` |
| `profissao_dia_inicio`, `profissao_dia_concluido` | `{ profissao, indicadores }` |
| `profissao_mitos_inicio`, `profissao_mitos_concluido` | `{ profissao, acertos, total }` |
| `tecnologia_panorama`, `tecnologia_area_vista` | `{ area }` |
| `tecnologia_jogo_inicio`, `tecnologia_jogo_concluido` | `{ top[], pct[] }` |

Derivados para o Admin (bloco "Profissões"): fichas mais vistas, cartas com mais "me interessa", pedidos de fichas, taxa de conclusão do "Um dia como", distribuição de votos por dilema (só mostrar na ficha com 50 ou mais votos).

### 3.5 Conquistas

Em `js/conquistas.js`: **Explorador de carreiras** (5 fichas vistas), **Um dia na pele** (3 "Um dia como" concluídos) e **Baralho completo** (uma Carta Diver gerada para cada ficha publicada). Os contadores vêm de `Profissoes.estado()` (`vistas`, `diaConcluido`, `cartasGeradas`).

### 3.6 Tutorial de primeiro acesso

Em `js/tutorial.js`, área `profissoes`, três passos: o mapa (busca, áreas, "na mira"), a ficha (os quatro números com fonte e as seções) e a Maré de cartas.

### 3.7 Matérias-chave

`secoes.como_entrar.materias_chave` usa ids de cursos da Sala Enem (`biologia`, `quimica`, …). Confira em `data/trilhas/catalogo.json` e corrija na ficha se os ids reais forem outros.

### 3.8 Carta Diver (imagem)

`Baixar imagem` usa `canvas.toDataURL` e um link `download`. Funciona no site. No PWA, trocar por `navigator.share` com o arquivo quando houver suporte, com o link como reserva. A carta entra na coleção do Perfil quando `cartasGeradas` tiver o id.

### 3.9 Status das fichas

- `rascunho` e `validada`: aparecem para aluno como "Ficha em revisão" (abrem normalmente, com o selo). Se preferir escondê-las do aluno até a publicação, filtre por `status === 'publicada'` em `ilha()` para contas de aluno; admin e professor continuam vendo.
- `publicada`: só com `revisao.profissional = ok`, revisor e data. O `conferir-ficha.mjs` bloqueia o contrário.
- `planejada`: "Em breve"; o toque registra um pedido.

## 4. Critério de pronto da Fase 1

- [ ] As seis rotas abrem no app, no computador e no celular, sem erro no console.
- [ ] `node scripts/conferir-ficha.mjs data/profissoes/enfermagem.json` passa.
- [ ] Cada número da ficha abre a fonte (botão "Fonte") e os colchetes levam à lista.
- [ ] "Um dia como" concede 30 XP e 3 pérolas uma vez, via `economia.js`.
- [ ] "Mito ou verdade" concede 20 XP e 2 pérolas uma vez, via `economia.js`.
- [ ] Os eventos chegam em `eventos_atividade` (conferir no Supabase de testes).
- [ ] "Na mira" sincroniza entre dois navegadores com a mesma conta.
- [ ] Tutorial aparece no primeiro acesso.
- [ ] Prévia no Cloudflare aprovada pelo Allisson.
- [ ] Enfermagem continua `rascunho` até a revisão por enfermeiro(a).

## 5. Depois da Fase 1

Fase 2: "Um dia como" para Medicina, Direito, Psicologia, Administração e Engenharia Civil; comparador; filtros por tag; Onda 2 de fichas; votos reais no dilema; mapa do Brasil em SVG no lugar das barras por estado.

Fase 3: Teste Vocacional ligado ao DNA; objetivo de curso no Cronograma; "Pergunte a quem vive isso"; áudios "Como eu cheguei aqui"; páginas públicas por profissão para quem chega pelo Google (`scripts/gerar-paginas-profissoes.mjs`).

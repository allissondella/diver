# Diver — como o código funciona hoje

> Retrato técnico do app **como ele está** (Fase 0 + mascote novo). Serve para qualquer sessão do Claude Code entender o código antes de mexer.
> Quando algo mudar de lugar (ex.: `js/economia.js` na Semana 2, `js/jogos/` na Semana 2), atualize este arquivo no mesmo commit.

## Visão geral
- HTML, CSS e JavaScript puros, sem build. Abre em qualquer servidor estático (Live Server, `python3 -m http.server`, GitHub Pages).
- Uma página só (`index.html`) com 4 telas (`<section class="tela">`); só uma fica visível por vez.
- Scripts **clássicos** com `defer` (sem módulos ES), carregados nesta ordem, cada um expondo um objeto global:

| Ordem | Arquivo | Objeto global | Responsabilidade |
| --- | --- | --- | --- |
| 1 | `js/trilhas.js` | `Trilhas` | Encontrar, carregar, validar e importar trilhas JSON. |
| 2 | `js/progresso.js` | `Progresso` | localStorage por trilha, XP e níveis, streak, meta diária, repetição espaçada, fases. Hoje também guarda os valores de recompensa (vão para `js/economia.js` na Semana 2). |
| 3 | `js/conquistas.js` | `Conquistas` | Lista das 13 conquistas e a verificação de quais foram desbloqueadas. |
| 4 | `js/quiz.js` | `Quiz` | Motor das sessões (Mergulho, Simulado, Revisão): seleção de questões, oxigênio, combo, resumo. Não mexe na tela. |
| 5 | `js/app.js` | (nenhum, é uma função que se executa) | Telas, eventos, renderização, mascote, bolhas e avisos (toasts). |

Outros arquivos: `css/estilo.css` (todo o visual), `data/trilhas/*.json` (conteúdo), `assets/mascote/` (pixel art de referência), `.nojekyll` (faz o GitHub Pages servir os arquivos como estão).

## Telas (`index.html`)
| id | Tela | Principais funções em `app.js` |
| --- | --- | --- |
| `tela-inicio` | Início: mascote, slogan, lista de trilhas, "Bora mergulhar!", "Carregar trilha (.json)" | `carregarTrilhas`, `renderizarTrilhas`, `renderizarAvisos`, `importarTrilhas` |
| `tela-painel` | Painel da trilha: status, mapa de profundidades, Simulado, Revisão, conquistas | `abrirTrilha`, `renderizarPainel` (status, mapa, modos, conquistas) |
| `tela-quiz` | Questão: progresso, oxigênio ou cronômetro, alternativas, painel de explicação | `iniciarSessao`, `renderizarQuestao`, `responder`, `continuar`, `encerrarSessao` |
| `tela-resumo` | Resumo da sessão | `renderizarResumo`, `textosResumo` |

- Ícones: sprite SVG no topo do `index.html` (`<symbol id="i-...">`), usados com `icone('i-nome')`.
- Mascote: `<template id="molde-mascote">` no fim do `index.html`; `montarMascotes()` copia para cada `[data-mascote]`; `humorMascote(container, 'feliz' | 'triste' | null)` troca a reação.
- Todo conteúdo vindo de JSON entra com `textContent` (função `h()`), nunca com `innerHTML`.

## Formato do JSON de trilha (nomes reais dos campos)
```json
{
  "id": "cursinho-conhecimentos-gerais",
  "nome": "Cursinho: conhecimentos gerais",
  "descricao": "Texto curto do card da trilha.",
  "categoria": "Cursinho",
  "fases": [
    { "id": "raso", "nome": "Raso", "profundidade": "0–10 m", "descricao": "Aquecimento" }
  ],
  "questoes": [
    {
      "id": "cg-raso-01",
      "tema": "Matemática",
      "dificuldade": "facil",
      "fase": "raso",
      "enunciado": "Pergunta?",
      "alternativas": ["A", "B", "C", "D"],
      "correta": 0,
      "explicacao": "Por que a certa é a certa."
    }
  ]
}
```
- Obrigatórios na trilha: `id`, `nome`, `descricao`, `fases` (lista com `id` em cada fase), `questoes`. `categoria` é opcional.
- Questão: `id` único na trilha; `dificuldade` = `facil` | `medio` | `dificil`; `fase` = id de uma fase da trilha; `alternativas` com 2 a 6 textos; `correta` = **índice a partir de 0**.
- As fases são desbloqueadas na ordem do array. As alternativas são **embaralhadas na exibição**: evite "todas as anteriores".
- `Trilhas.validar()` confere tudo isso; problemas aparecem num aviso na tela inicial e a trilha fica de fora.
- Blocos novos (`pares`, `lacunas` etc., ver `docs/JOGOS.md`) serão opcionais e **não** mudam os campos acima.

## Como as trilhas são encontradas (`Trilhas.carregarTodas`)
1. `data/trilhas/indice.json`: lista de nomes de arquivo. **No GitHub Pages este é o único caminho**, então toda trilha nova precisa entrar aqui.
2. Listagem do diretório `data/trilhas/`, quando o servidor oferece (Live Server, `python3 -m http.server`).
3. Trilhas importadas pelo botão "Carregar trilha (.json)", guardadas no localStorage. É o caminho quando o app é aberto via `file://` (o navegador bloqueia `fetch`); nesse caso a tela inicial explica o que fazer.

## localStorage (sempre com try/catch)
| Chave | Conteúdo |
| --- | --- |
| `diver:v1:trilha:<id>` | Progresso da trilha: `xp`, `perolas`, `fases` (concluída, estrelas, tentativas), `questoes` (peso, acertos, erros, marcada), `streak` (atual, melhor, último dia), `metaDiaria`, `hoje` (data, respondidas), `conquistas` (id → data), `simulados` (até 20), `stats`. |
| `diver:v1:ultimaTrilha` | id da última trilha aberta. |
| `diver:v1:trilhasImportadas` | Trilhas carregadas pelo botão de importar. |

Progressos antigos são mesclados com o modelo em `Progresso.carregar()`, então campos novos podem ser acrescentados sem quebrar quem já joga.

## Regras de jogo implementadas
- **Níveis:** tabela `NIVEIS` em `js/progresso.js` (10 níveis, Mestre Diver = 2.100 XP).
- **Recompensas:** `RECOMPENSA` e `BONUS_COMBO` em `js/progresso.js`; bônus de fase em `Progresso.concluirFase()`. Valores iguais à tabela de `docs/PRODUTO.md`.
- **Repetição espaçada:** errou → `peso` +2 (máx. 6); acertou → −1 (−2 na Revisão, que também desmarca). `Quiz.selecionar()` prioriza peso alto e questões nunca vistas. No Mergulho, a errada volta uma vez ao fim da rodada.
- **Mergulho:** até 8 questões da fase, 3 de oxigênio; estrelas = 3 − erros (mínimo 1).
- **Simulado:** 60 s por questão; sem resposta ao fim do tempo conta como em branco; nota = acertos ÷ total × 10.
- **Revisão:** até 10 questões com peso > 0 ou marcadas.
- **Streak:** conta dias com pelo menos 1 questão respondida; `Progresso.streakVigente()` zera a exibição se o último estudo foi antes de ontem.

## Acessibilidade implementada
Foco visível (amarelo), alvos ≥ 44 px, `aria-live` no feedback e nos avisos, atalhos 1–6 / A–F nas alternativas, setas na escolha de trilha, `prefers-reduced-motion` (bolhas somem; mascote e animações ficam estáticos).

## Como testar
- Abrir com Live Server (ou `python3 -m http.server`) e jogar uma fase de ponta a ponta no celular (360–390 px) e no computador.
- Casos que sempre vale repetir: fase completa, fase sem oxigênio, Revisão, Simulado com nota e com tempo esgotado, "Carregar trilha" via `file://`.

# CLAUDE.md — Diver

Guia de contexto do projeto. Leia antes de qualquer mudança para manter a consistência
de produto, tom de voz, visual e código. Converse com o usuário em **português do Brasil**.

## O que é

**Diver** é uma plataforma web de estudos gamificada.

- O nome vem de **DIVER**são e de **dive** (mergulhar, em inglês). Explore esse duplo sentido
  nos textos: estudar é mergulhar, e mergulhar é divertido.
- Os usuários são chamados de **Divers**.
- Slogans oficiais:
  - "Mergulhe. Acerte. Suba de nível."
  - "Diver: aprender é a parte divertida."

## Público

Jovens e adultos: estudantes de ensino médio, cursinho pré-vestibular, ensino superior,
especializações e treinamentos profissionais/corporativos.

## Tom de voz

- Leve, bem-humorado e brasileiro, mas **maduro**. Nada infantil.
- Motivador sem ser forçado; humor discreto (um trocadilho de mar aqui e ali, não em toda frase).
- Frases curtas e diretas. Trate o usuário por "você" ou "Diver".
- Mensagens fixas:
  - Acerto: **"Mandou bem, Diver!"**
  - Botão de início: **"Bora mergulhar!"**
- Evite: excesso de emoji, exclamações em série, diminutivos, linguagem de criança, jargão corporativo.

## Conteúdo em trilhas

- O conteúdo é organizado em **trilhas** (ex.: "Cursinho: Matemática", "Direito Constitucional",
  "Treinamento: Atendimento ao Cliente"). Cada trilha tem suas próprias fases e questões.
- O aluno escolhe a trilha na tela inicial. **Todo o progresso é salvo por trilha.**
- Criar uma trilha nova = adicionar um arquivo JSON em `data/trilhas/`, **sem mexer no código**.

### Formato do JSON de trilha

```json
{
  "id": "cursinho-conhecimentos-gerais",
  "nome": "Cursinho: conhecimentos gerais",
  "descricao": "Texto curto que aparece no card da trilha.",
  "categoria": "Cursinho",
  "fases": [
    { "id": "raso", "nome": "Raso", "descricao": "Aquecimento", "profundidade": "0–10 m" },
    { "id": "recife", "nome": "Recife", "descricao": "...", "profundidade": "10–40 m" },
    { "id": "caverna", "nome": "Caverna", "descricao": "...", "profundidade": "40–200 m" },
    { "id": "abismo", "nome": "Abismo", "descricao": "...", "profundidade": "200 m+" }
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
      "explicacao": "Por que a resposta certa é a certa."
    }
  ]
}
```

Regras:
- Trilha: `id`, `nome`, `descricao`, `fases` (obrigatórios); `categoria` (opcional); `questoes`.
- Questão: `id` (único na trilha), `tema` (tag usada no desempenho por tema), `dificuldade`
  (`facil` | `medio` | `dificil`), `fase` (id de uma fase da trilha), `enunciado`,
  `alternativas` (2 a 6 textos), `correta` (**índice a partir de 0**), `explicacao`.
- As fases são desbloqueadas na ordem do array.
- As alternativas são **embaralhadas na exibição** (a certa não fica sempre na mesma letra).
  Por isso, evite alternativas do tipo "todas as anteriores" ou "letras A e B".
- `js/trilhas.js` valida cada arquivo e mostra os problemas na tela inicial.

### Como as trilhas são encontradas

1. `data/trilhas/indice.json` — lista de nomes de arquivo (ex.: `["minha-trilha.json"]`).
2. Listagem do diretório `data/trilhas/`, quando o servidor oferece (Live Server,
   `python -m http.server`). Nesse caso basta soltar o arquivo na pasta.
3. Trilhas importadas pelo botão "Carregar trilha (.json)" (ficam no localStorage).
   É o caminho quando o app é aberto via `file://`, onde o navegador bloqueia `fetch`.

Para hospedagens sem listagem (ex.: GitHub Pages), acrescente o arquivo no `indice.json`.

## Tema e mecânicas (tema oceano)

- **Fases = profundidades**: Raso → Recife → Caverna → Abismo. Completar uma desbloqueia a próxima.
- **XP e níveis**: nível máximo = **"Mestre Diver"**. Tabela em `js/progresso.js`.
- **Pérolas**: moeda ganha por acertos (mais pérolas em questões mais difíceis).
- **Oxigênio**: vidas do modo Mergulho. Errou, perdeu 1. Sem oxigênio, a fase termina.
- **Streak**: dias seguidos estudando (pelo menos 1 questão respondida no dia).
- **Meta diária** configurável (5, 10, 20 ou 30 questões por dia).
- **Conquistas**: "Primeiro mergulho", "10 acertos seguidos", "Fase completa", "7 dias seguidos" etc.
  Definidas em `js/conquistas.js`.
- **Repetição espaçada simples**: cada questão tem um `peso`. Errou → peso sobe; acertou → peso
  desce. Questões com peso maior têm prioridade na seleção das próximas rodadas. No Mergulho,
  a questão errada também volta ao fim da fila da rodada atual (uma vez).

### Modos

1. **Mergulho** (padrão): por fase, com oxigênio e feedback imediato.
2. **Simulado**: sem oxigênio, cronometrado, N questões da trilha inteira, correção só no final,
   nota de 0 a 10. Histórico salvo.
3. **Revisão**: só questões erradas (peso > 0) ou marcadas para revisar.

Ao fim de **qualquer** sessão: resumo com acertos, tempo, desempenho por tema/tag e o que revisar.

### Recompensas (valores atuais)

| Evento | XP | Pérolas |
|---|---|---|
| Acerto fácil / médio / difícil | 10 / 15 / 20 | 1 / 2 / 3 |
| Combo (a partir do 3º acerto seguido) | +5 | — |
| Primeira vez completando uma fase | +30 | +5 |
| Fase sem perder oxigênio | — | +5 |

## Regras técnicas

- **HTML, CSS e JavaScript puros.** Sem frameworks, sem backend, sem etapa de build, sem npm.
- Scripts clássicos (`<script defer>`), sem ES modules, para funcionar também via `file://`.
- Estrutura:
  ```
  index.html
  css/estilo.css
  js/trilhas.js      carregamento e validação das trilhas
  js/progresso.js    localStorage, XP/níveis, streak, meta, repetição espaçada
  js/conquistas.js   definições e verificação das conquistas
  js/quiz.js         motor das sessões (Mergulho, Simulado, Revisão)
  js/app.js          telas, eventos e renderização
  data/trilhas/*.json
  ```
  Ordem de carregamento: trilhas → progresso → conquistas → quiz → app. Cada arquivo expõe um
  objeto global (`Trilhas`, `Progresso`, `Conquistas`, `Quiz`).
- **localStorage**, separado por trilha: chave `diver:v1:trilha:<id>` com XP, pérolas, fases,
  streak, meta diária, conquistas, pesos das questões (erradas/marcadas) e histórico de simulados.
  Chaves globais: `diver:v1:ultimaTrilha`, `diver:v1:trilhasImportadas`.
- Conteúdo vindo de JSON é sempre inserido com `textContent` (nunca `innerHTML`).
- Mobile first, responsivo e bonito no desktop.
- Acessibilidade: contraste AA, foco visível, alvos de toque ≥ 44px, `aria-live` para feedback,
  atalhos de teclado nas alternativas (1–6 / A–F), `prefers-reduced-motion` respeitado.
- Código simples, comentado em português, sem engenharia excessiva.

## Visual

- Paleta (variáveis CSS em `:root`):
  - Turquesa `#14B8A6` — cor principal, botões primários
  - Amarelo `#FACC15` — XP, destaques, foco
  - Coral `#FB7185` — erros e alertas
  - Azul-marinho `#0B2545` — fundo
- Moderno, limpo, cara de app profissional (inspiração: apps de estudo e de idiomas, sem copiar).
- Tipografia legível (Plus Jakarta Sans com fallback para fontes do sistema).
- Ícones em SVG (sprite no `index.html`), não emoji.
- **Mascote**: peixinho estiloso em SVG com máscara de mergulho, discreto; reage a acertos
  (pulinho) e erros (balançada). Classes `.mascote--feliz` / `.mascote--triste`.
- Bolhas animadas suaves no fundo; desligadas com `prefers-reduced-motion`.

## Como rodar

- Recomendado: VS Code + extensão **Live Server** → "Open with Live Server" no `index.html`.
- Alternativa: `python3 -m http.server` na raiz e abrir `http://localhost:8000`.
- Abrindo o `index.html` direto (`file://`): use "Carregar trilha (.json)" na tela inicial.

# Diver — guia do projeto (leia antes de qualquer tarefa)

## O que é
**Diver** é uma plataforma web de estudos gamificada. O nome junta **DIVER**são com *dive* ("mergulhar", em inglês): estudar é mergulhar, e mergulhar é divertido. Os usuários são chamados de **Divers**.
Slogans: "Mergulhe. Acerte. Suba de nível." · "Diver: aprender é a parte divertida."
Público: ensino médio, cursinho, faculdade, especializações e treinamentos corporativos (jovens e adultos). Nada infantil.

## Onde estamos
A **Fase 0 está feita**: protótipo em HTML/CSS/JS puros com os modos Mergulho, Simulado e Revisão, trilhas em JSON, XP, níveis, pérolas, oxigênio, streak, meta diária e conquistas (tudo em localStorage).
**A parte de perguntas e respostas está aprovada e testada: não refaça e não mude o comportamento dela sem eu pedir.**
**2026-09-29:** app com **barra lateral** (Estudar · Organizar · Biblioteca · Você), Sala de Jogos com 9 jogos novos, economia central, Kanban, calendário com cronograma, Modo Foco, PDFs, Perfil e Desafio do Dia. Como o código está organizado: `docs/ARQUITETURA.md`.
O plano completo está em `docs/ROADMAP.md` (24 semanas, 120 tarefas). Use `/hoje` para começar.

## Ideia central: um motor, muitos jogos
Todo jogo é uma "roupa" diferente sobre o mesmo conteúdo (as cartas de uma trilha). Cada jogo recebe cartas, aplica a sua mecânica e devolve um **Resultado padrão**; XP, pérolas, oxigênio, revisão espaçada e conquistas vêm de um módulo central de economia. São **17 jogos** planejados (3 prontos). Catálogo, contrato e specs: `docs/JOGOS.md`.

## Regras técnicas (inegociáveis)
- HTML, CSS e JavaScript **puros**. Sem framework e sem etapa de build (a decisão sobre isso só será revista na Semana 14).
- Siga o padrão do código que já existe em `js/` (se o app usa scripts comuns, não troque por módulos ES sem combinar comigo).
- Caminhos **relativos** (sem barra no início) e nomes de arquivos em **minúsculas**: o site roda no GitHub Pages em `/diver/`.
- Nada de dependências de rede, exceto a fonte do Google Fonts (sempre com fallback). Bibliotecas, se necessárias, ficam dentro do repositório.
- `localStorage` e `IndexedDB` sempre dentro de try/catch; o app precisa funcionar mesmo se o armazenamento falhar.
- **Nunca** coloque chaves secretas, senhas ou dados de alunos no repositório (ele é público).
- **Não renomeie** os campos dos JSON que já existem em `data/trilhas/`. Os blocos novos (pares, lacunas, sequências etc.) são opcionais.
- Jogo novo = arquivo em `js/jogos/`, registrado em `js/jogos/registro.js`, seguindo o contrato de `docs/JOGOS.md`. Use `/novo-jogo`.
- A partir da Semana 2, **toda** concessão de XP/pérolas passa por `js/economia.js`. Jogos nunca dão XP direto.

## Visual (resumo; detalhes em docs/DESIGN.md)
- Fundo marinho em degradê (`#0B2545` → `#06172D`), turquesa `#14B8A6` como cor principal, amarelo `#FACC15` (XP e destaques), coral `#FB7185` (erro gentil e alertas), textos `#E6F1FF` e `#A9BCD6`.
- Fonte **Plus Jakarta Sans**. Botão 3D com borda inferior turquesa mais escura. Bolhas suaves no fundo.
- Mascote: **Diver**, mergulhador em **pixel art 16-bit** (`assets/mascote/`, molde no `index.html`; detalhes em `docs/DESIGN.md`). Ícone da aba = máscara de mergulho em SVG. O peixinho foi aposentado.
- Use **variáveis CSS** (tokens). Não escreva cores soltas.

## Tom de voz
Leve, bem-humorado, brasileiro, maduro e motivador sem forçar; um trocadilho de mar de vez em quando. **Nunca** culpa nem ameaça (perder a sequência mostra o recorde guardado e um convite gentil).
Mensagens fixas: acerto → "Mandou bem, Diver!"; início → "Bora mergulhar!".

## Acessibilidade (sempre)
Bom contraste, foco visível, alvos de toque grandes, atalhos de teclado e `prefers-reduced-motion` respeitado (bolhas, animações e mascote animado viram estáticos).

## Como trabalhar comigo
- Nas tarefas grandes, mostre um **plano curto antes do código** e espere o meu OK.
- Passos pequenos; teste no navegador (celular e computador) a cada passo.
- Um commit por tarefa, em português: `feat: ...`, `fix: ...`, `docs: ...`.
- Explique o que fez como se eu fosse iniciante.
- Comandos do projeto: `/hoje` (próxima tarefa), `/encerrar-dia` (fechar e registrar), `/novo-jogo <nome>` (criar jogo pelo padrão).
- Atualize este arquivo quando uma decisão importante mudar.

## Direitos autorais e nomes
Não copie questões de provas, apostilas ou livros. Os nomes dos jogos são próprios (Adivinha Aí, Caso Resolvido, Torre do Saber...); não use nomes, logos ou artes de jogos comerciais.

## Mapa dos documentos
`docs/PRODUTO.md` (visão) · `docs/JOGOS.md` (catálogo e contrato) · `docs/DESIGN.md` (identidade) · `docs/ARQUITETURA.md` (como o código funciona hoje) · `docs/ROADMAP.md` (120 tarefas) · `docs/DIARIO.md` (histórico) · `docs/PROMPT_INICIAL.md` (primeira sessão)

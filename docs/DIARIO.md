# Diver — diário de bordo

> O `/encerrar-dia` acrescenta uma entrada no topo a cada sessão. Formato:
> **Data · Tarefa (D#)** — o que foi feito · decisões · pendências · próximo passo.

---

## 2026-09-29 · Barra lateral e implementação do que estava documentado
- **Feito:** mascote volta a ser o Diver em pixel art 16-bit (o SVG vetorial foi descartado; o favicon da máscara fica). App ganhou barra lateral (fixa no computador, gaveta no celular) com Início, Mergulho, Simulado, Revisão, Sala de Jogos, Tarefas, Calendário, Modo Foco, Cursos e trilhas, PDFs e Perfil. Motor de jogos (`js/jogos/registro.js`), economia central (`js/economia.js`), derivador de cartas (`js/cartas.js`) e 9 jogos: Cartas do Fundo, Quiz Relâmpago, Memória, Adivinha Aí, Caça ao Tesouro, Chefão do Abismo, Maré Alta, Forca do Náufrago e Corrente do Tempo. Kanban com arrastar e soltar, calendário mês/semana com gerador de cronograma, Modo Foco 25/5, PDFs no IndexedDB com leitor e anotações, criar trilha colando texto, Perfil com nível geral e backup, "Seu dia" e Desafio do Dia no Início. As duas trilhas ganharam os blocos opcionais (pares, V/F, adivinhas, sequências, palavras).
- **Testes:** partida completa de cada jogo, Kanban (botões e arrasto), cronograma, foco, PDFs, criar trilha, backup, Desafio do Dia, e regressão do Mergulho/Simulado/Revisão (iguais a antes), no celular e no computador, sem erros no console.
- **Decisões:** endereço `#secao` para cada área (Voltar do navegador funciona); quiz e jogos em tela cheia sem barra lateral; tarefas e foco dão XP mas não contam para streak/meta; o Chefão do Raso é sempre liberado (os outros exigem completar a fase).
- **Pendências:** D4 (tokens + design.html) é a próxima tarefa aberta; D7/D8 (migrar os três modos para o contrato e a economia); loja de pérolas e Dia de Descanso (Semanas 9–10); lacunas; pdf.js; tudo que depende de conta, IA e turmas (Semana 14 em diante).
- **Próximo passo:** `/hoje` (D4).

## 2026-09-28 · D1, D3 e D5 — merge, kit e mascote novo
- **Feito:** PR #1 mergeado na main e histórico conferido (sem chaves nem senhas; só o e-mail de autor dos commits, que é normal no git). Kit v2.0 instalado (CLAUDE.md, docs/, .claude/, assets/). Mascote Diver no lugar do peixinho em todas as telas. localStorage protegido com try/catch nas 3 funções que faltavam. Criado `docs/ARQUITETURA.md`. Site preparado para o GitHub Pages (`.nojekyll`) e testado num servidor que imita o Pages.
- **Decisões:** o mascote do app é **SVG vetorial** no estilo da interface, com as cores da paleta (máscara amarela, snorkel coral, roupa turquesa, nadadeiras amarelas); a pixel art fica como referência. Cores do personagem registradas no DESIGN.md: pele `#F2B28C`, cabelo e barba `#7A4630`. D5 feita antes da D2, a pedido.
- **Retro (D5):** deu certo: o mascote reage a acerto e erro e respeita "reduzir movimento". Travou: nada relevante. Muda na semana que vem: começar a D4 (tokens) depois de publicar.
- **Pendências:** D2 (ligar o GitHub Pages em Settings → Pages e testar a URL pública); D4 (tokens de cor e design.html). Atualizar o documento Word: ele ainda descreve o mascote em pixel art.
- **Próximo passo:** merge do PR do kit + mascote, ligar o Pages e fechar a D2.

## 2026-09-28 · Kit Diver v2.0 criado
- Documento do projeto reescrito: nome **Diver**, visual marinho (navy + turquesa), mascote Diver e a ideia original com 17 jogos.
- Protótipo de perguntas e respostas (Fase 0) aprovado; aguardando o merge do Pull Request #1.
- **Decisões:** mascote = Diver (mergulhador); peixinho do protótipo sai da abertura; JS puro até a Semana 14; GitHub Pages enquanto for não comercial (migrar antes de cobrar).
- **Pendências:** fazer o merge do PR #1; publicar no GitHub Pages; instalar este kit na raiz do projeto.
- **Próximo passo:** `/hoje` (Semana 1, D1).

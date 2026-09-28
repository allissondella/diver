# Diver — diário de bordo

> O `/encerrar-dia` acrescenta uma entrada no topo a cada sessão. Formato:
> **Data · Tarefa (D#)** — o que foi feito · decisões · pendências · próximo passo.

---

## 2026-09-28 · Tipos de conta (aluno, professor, admin) e login como primeira página
- **Feito:** `perfis.papel` (aluno/professor/admin) no `setup.sql` (reexecutável; quem era admin continua admin); cadastro com tipo de conta e mudança de tipo na área **Admin → Pessoas e cursos**, com filtro por tipo; **Professor → Meus alunos** só de leitura (alunos dos cursos dele e o progresso nesses cursos); com o Supabase configurado, o login é a primeira coisa na tela (nada do app aparece antes); conserto do selo "Ativo" que tinha perdido o estilo.
- **Testes:** regras de segurança por papel direto no Postgres (admin cria os três tipos e não se rebaixa; professor vê só os alunos e o progresso dos cursos dele, e o banco recusa qualquer ação de admin; aluno só vê a si); fluxo completo no navegador com o servidor que imita o Supabase (login primeiro, admin cria professor/aluno/admin, primeiro acesso de cada um, Meus alunos no celular); regressão do modo local sem erros.
- **Decisões:** o professor recebe cursos como o aluno e enxerga só o progresso desses cursos (nada de tarefas ou agenda); admin não tem cursos marcados porque vê todos; ninguém tira o próprio acesso de admin.
- **Pendências:** criar o projeto no Supabase e preencher `js/config.js` (docs/SUPABASE.md) para o login aparecer no site publicado.
- **Próximo passo:** ligar o Supabase com a URL e a chave anon.

## 2026-09-28 · Tarefas em quadros
- **Feito:** a área **Tarefas** foi refeita como quadros (`js/quadros.js`): vários quadros (☰ troca e cria; clique no nome renomeia), listas com cor, ordenação (minha ordem, prazo, título), mover, limpar concluídas e excluir; "Adicionar uma tarefa" no topo de cada lista (digita e Enter); bolinha conclui e manda para "Concluídas"; painel de detalhes com título, lista, prazo (atalhos Hoje/Amanhã/1 semana), subtarefas com progresso (2/5 no cartão), etiquetas coloridas (também filtram o quadro), notas com links clicáveis, **negrito** e listas, curso que recebe o XP e excluir; busca; arrastar cartões e listas (mouse direto, toque segurando); atalhos Enter, Shift+Enter, Alt+Enter, Esc, setas e Alt+setas; exportar e importar JSON. Prazos aparecem no Calendário (com botão para abrir a tarefa) e no Seu dia.
- **Testes:** migração do Kanban antigo, criação, detalhes, atalhos, XP uma vez só, arrastar com mouse e com toque de verdade no celular, deslizar sem arrastar, menus, filtros, exportar/importar, Calendário e Início; regressão de todas as áreas no celular e no computador, sem erros no console.
- **Decisões:** uma chave só (`diver:v1:quadros`), sincronizada na nuvem como as outras; etiquetas valem para todos os quadros; importar soma quadros (nunca apaga); a lista ordenada por prazo/título vira "minha ordem" quando a pessoa reordena na mão; caixas de texto passam a usar a fonte do app.
- **Pendências:** as mesmas de antes (Supabase no ar, recuperação de senha por e-mail, D4).
- **Próximo passo:** testar os quadros no celular de verdade e seguir com `/hoje`.

## 2026-09-29 · Login, admin, prova final e curso ISO/IEC 27001
- **Feito:** login com Supabase (e-mail e senha) com troca de senha obrigatória no primeiro acesso; área **Admin → Alunos e cursos** (cadastrar pessoa com senha temporária e mensagem pronta, atribuir cursos, nova senha, ativar/desativar, ver progresso); progresso, tarefas e calendário sincronizados na nuvem; aluno vê só os cursos atribuídos; **Prova final** (cronometrada, nota mínima, liberada ao completar as fases); curso **ISO/IEC 27001:2022 Foundation** com 6 fases, 65 questões originais em português, blocos para todos os jogos e prova de 40 questões/60 min/65%.
- **Testes:** `supabase/setup.sql` rodado num Postgres local com o esquema de autenticação simulado (regras de segurança testadas por papel: admin, aluno, visitante); servidor de teste imitando o Supabase para o fluxo completo no navegador (primeiro acesso do admin, cadastro, aluna no celular, progresso em outro aparelho, desativação); regressão do modo local sem erros.
- **Decisões:** cliente próprio com `fetch` (sem biblioteca externa); senha temporária gerada no banco; o primeiro admin é criado por comando no SQL Editor, fora do repositório; o material enviado (questões de provas oficiais) serviu só de mapa de temas, e as questões do curso são originais (regra de direitos autorais do projeto).
- **Pendências:** criar o projeto no Supabase e preencher `js/config.js` (docs/SUPABASE.md); recuperação de senha por e-mail; D4 (tokens + design.html).
- **Próximo passo:** ligar o Supabase e testar com as primeiras pessoas.

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

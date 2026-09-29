# Diver — diário de bordo

> O `/encerrar-dia` acrescenta uma entrada no topo a cada sessão. Formato:
> **Data · Tarefa (D#)** — o que foi feito · decisões · pendências · próximo passo.

---

## 2026-09-29 · Radiologia com todas as fases abertas
- **Feito:** campo opcional `fasesLivres: true` na trilha. Com ele, todas as fases começam liberadas e o aluno escolhe o tema que quer estudar (mapa, leitura "Antes de mergulhar" e Chefão). Ligado no curso Radiologia: Aparelho Digestivo; os outros cursos continuam em sequência.
- **Decisões:** a prova final continua pedindo todas as fases concluídas (`exigeFases`), porque ela cobre o curso inteiro. O texto do mapa e o resumo da fase explicam que a ordem é só uma sugestão.
- **Testes:** 9 fases abertas no computador e no celular, mergulho direto na fase 7, prova ainda travada, curso ISO/IEC 27001 segue em sequência.

## 2026-09-29 · Memória premia por tempo
- **Feito:** terminar a Memória sempre rende prêmio (+10 XP e +2 pérolas). O tempo vale medalha: ouro até 15 s por par (+30 XP, +6 pérolas), prata até 25 s (+20, +4), bronze até 40 s (+12, +2); com 6 pares, ouro até 1:30, prata até 2:30 e bronze até 4:00. "Memória afiada" (até 1,5 × o número de pares em tentativas) dá +3 pérolas. O topo do jogo mostra o relógio e a próxima medalha; o resumo diz qual medalha saiu e quanto falta para a próxima.
- **Correção:** antes, errar "no escuro" (virar conchas que você nunca viu) contava como erro do par, e uma partida normal terminava com 0/6 acertos e 0 XP. Agora só conta como erro quando as duas conchas do par já tinham aparecido; o par vai para "O que revisar" só com 2 ou mais desses erros.
- **Testes:** partida rápida (ouro + memória afiada), lenta de 5 min (prêmio de conclusão e 6/6) e prata com erros de memória (4/6), no computador e no celular.

## 2026-09-29 · Curso Radiologia: Aparelho Digestivo (V1)
- **Feito:** curso novo a partir das anotações da pessoa (aulas COR-SPR GI 04–19 e Deu Laudo GI 02–05): 9 fases (fundamentos; fígado benigno; fígado difuso e maligno; vesícula e vias biliares; pâncreas; baço; abdome agudo; intestino — DII e tumores; pediatria), 230 questões originais (a maioria em caso clínico, com explicação de por que as outras erram), 68 pares, 42 V/F, 16 adivinhas, 16 sequências, 26 palavras e prova de 60 questões/90 min/70%. Novo bloco **"Antes de mergulhar"** em cada fase: introdução, pontos-chave, tabela de diagnóstico diferencial e pérolas.
- **Boas práticas:** prática de recuperação (pergunta antes da leitura longa), feedback explicativo, casos clínicos com dificuldade crescente, intercalação no Simulado e revisão espaçada do app; alternativas revisadas para a certa não se destacar pelo tamanho (de 117 para 0 casos) e posição da certa embaralhada.
- **Testes:** curso carrega sem avisos; mapa com 9 fases e leitura em cada uma (computador e celular, tabela rola dentro da janela); rodada completa do Mergulho; os 9 jogos com conteúdo suficiente; prova configurada; regressão de todas as áreas e dos quadros de tarefas sem erros.
- **Decisões:** nome "Radiologia: Aparelho Digestivo" (o material é de imagem); o intestino virou duas fases pelo volume; sem imagens radiológicas nesta V1 (achados descritos em texto); o material-fonte não vai para o repositório.
- **Pendências:** revisão por radiologista antes de abrir para todo mundo; atribuir o curso às pessoas na área Admin; imagens nas questões (versão futura).
- **Próximo passo:** testar com os primeiros usuários e recolher as dúvidas das explicações.

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

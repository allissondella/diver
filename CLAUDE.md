# Diver — guia do projeto (leia antes de qualquer tarefa)

## O que é
**Diver** é uma plataforma web de estudos gamificada. O nome junta **DIVER**são com *dive* ("mergulhar", em inglês): estudar é mergulhar, e mergulhar é divertido. Os usuários são chamados de **Divers**.
Slogans: "Mergulhe. Acerte. Suba de nível." · "Diver: aprender é a parte divertida."
Público: ensino médio, cursinho, faculdade, especializações e treinamentos corporativos (jovens e adultos). Nada infantil.

## Onde estamos
A **Fase 0 está feita**: protótipo em HTML/CSS/JS puros com os modos Mergulho, Simulado e Revisão, trilhas em JSON, XP, níveis, pérolas, oxigênio, streak, meta diária e conquistas (tudo em localStorage).
**A parte de perguntas e respostas está aprovada e testada: não refaça e não mude o comportamento dela sem eu pedir.**
**2026-09-29:** app com **barra lateral** (Estudar · Organizar · Biblioteca · Você), Sala de Jogos com 9 jogos novos, economia central, Kanban, calendário com cronograma, Modo Foco, PDFs, Perfil e Desafio do Dia. Como o código está organizado: `docs/ARQUITETURA.md`.
**2026-09-28:** **Tarefas viraram quadros** (`js/quadros.js`): vários quadros, listas com cor e ordenação, cartões com subtarefas, etiquetas (filtro), prazo (vai para o Calendário), notas com links, "Concluídas" no pé de cada lista, arrastar cartões e listas, atalhos (Enter, Shift+Enter, Alt+Enter, Esc) e exportar/importar JSON. Visual e nomes são nossos: não cite produtos de terceiros.
**Curso Radiologia: Aparelho Digestivo** (`data/trilhas/radiologia-aparelho-digestivo.json`): 9 fases, 230 questões originais em caso clínico, blocos para todos os jogos e prova de 60 questões; cada fase tem a leitura **"Antes de mergulhar"** (`fases[].resumo`) e todas começam abertas (`fasesLivres: true`): o aluno escolhe o tema. V1 para teste com usuários: pede revisão de um radiologista.
**Curso Cibersegurança Essencial** (`data/trilhas/ciberseguranca-essencial.json`): iniciante, para empresas e alunos ("aprender a se cuidar"): 6 fases, 120 questões originais, "Antes de mergulhar" em cada fase, blocos para todos os jogos e a **"Operação Recife Sombrio"**, o jogo de detetive **Caso Resolvido** (`js/jogos/caso-resolvido.js`, bloco `casos` com `tipo: "operacao"`, `versao: 2`; só existe neste curso). Sem datas: "a Diver foi invadida". **Cada caso sorteia outra Sombra** e as pérolas (pistas) mudam; e-mails, rede social, conexões e registros mudam a cada tentativa. Quatro mergulhos com **tanque de oxigênio** (Raso: triagem de e-mails com endereços oficiais reais e "pesquise na internet"; Recife: cardume de senhas + rede social; Caverna: sonar + registros com fuso; Abismo: interrogatório) e o **mural** (uma acusação por caso, 1 a 3 estrelas). Tutorial em cada tela (`Tutorial.guiar`). Placar da turma soma todos os casos (`ranking_caso`). Detalhes: `docs/JOGOS.md`.
**2026-09-30:** saíram os cursos de exemplo "Cursinho: conhecimentos gerais" e "Treinamento: boas práticas no trabalho". Entrou o **Travessia: Enem e Vestibular** (`data/trilhas/enem-vestibular.json`, `fasesLivres: true`): por enquanto só a fase **Matemática 1: proporções** (19 questões originais, "Antes de mergulhar" e blocos para 9 jogos). Questões literais do Enem (com fonte) seguem `docs/CONTEUDO_CURSINHO.md` (licença CC BY-ND, triagem de conteúdo de terceiro) e a skill `criar-trilha`.
**Motor Diver e Mergulho Triplo** (`docs/MOTOR_DIVER.md` seção 11, `docs/ASSINATURA_E_VALIDACAO.md`; skills `criar-trilha` e `validar-questoes`): **nenhuma IA paga roda sem aprovação**. A skill gera as questões e o lote vai para a **Fila de Validação** (`fila_validacao`, só admin) via `node scripts/fila.mjs enviar` (login de admin no terminal); o admin aprova em **Admin → Fila de Validação** digitando a senha (custo estimado visível) e a Edge Function `mergulho-triplo` roda fato (Gemini + busca) e lógica (OpenAI, sem gabarito); `fila.mjs baixar` leva o resultado para a trilha e para `data/acervo/<materia>.json`. Chaves `GEMINI_API_KEY`/`OPENAI_API_KEY` **só nos Secrets das Edge Functions do Supabase** (lidas com `Deno.env.get`): nunca em `.env`, arquivo, tabela ou chat. Se alguém colar uma chave no chat: parar e pedir para revogar.
**2026-10-02:** **Sala de Descompressão** (barra lateral → Respirar; `js/descompressao.js` + `js/descompressao/`; detalhes em `docs/JOGOS.md` seção 6): para **todo mundo**, sem curso, só para brincar. **Investigação** (mistério do dia no Navio Aurora: suspeitos, armas, cômodos; cada cômodo é um desafio — cofre, e-mails iguais aos do curso de ciber, cifra, câmeras, fios, anagramas, caça-palavras, mentiroso), **Palavrinha** (palavra nova por dia, de 5 a 10 letras, igual para todos, + Treino livre que vale menos; banco próprio em `data/sala/palavras-do-dia.json`, sem palavrões nem ofensas; o jogo baixa só a lista do tamanho do dia), **Tiro ao Alvo** (pistola d'água por níveis; 1 ponto por acerto; placa errada ou certa que escapa elimina) e **Batata Quente** (Sozinho com nível a cada 30 s, Treino, robô, lado a lado ou online por código). Palavras só do **dicionário brasileiro** (VERO/LibreOffice em `data/dicionario/`, `js/dicionario.js`): fora dele, "Essa palavra não faz parte do nosso dicionário brasileiro." Pontos **só no placar da sala** (`ranking_sala`; nada de XP/pérolas). Só **admin e professores** fecham a sala, em **horários de foco** (`sala_bloqueios`; professor só para os cursos dele).
**2026-10-01 (4):** **Log de atividade** (`eventos_atividade`, `js/atividade.js`; guia `docs/ATIVIDADE.md`): toda questão, sessão e jogo vira evento; é a base das estatísticas, do ranking e da futura retrospectiva do ano. Não grave estatística em tabela nova: derive do log. **Minhas Estatísticas** (Você) e bloco no Admin/Professor. Jogo **Palavrinha / x2 / x4** (`js/jogos/palavrinha.js`): palavra do dia por curso e treino livre (os dois valem XP, estatísticas e o **Ranking Diver** mensal, do curso e de todos os cursos (nome + curso); pérolas só na palavra do dia); tema e dica nunca entregam a palavra (`Cartas.revela`); só aparece com 30 palavras de 4–8 letras (40 no x2/x4).
**2026-10-01 (3):** **Design organizado:** régua de espaços em `css/ritmo.css` (tokens `--esp-*` e `--ritmo-*`; regras em `docs/DESIGN.md`, "Espaçamento"); use esses tokens em vez de px soltos. **Fila sem terminal:** "Mandar para a fila" na tela Admin → Fila, função num arquivo só em `supabase/painel/mergulho-triplo.ts` (gerada por `node scripts/juntar-funcao.mjs`; rode de novo ao mexer na função) e `node scripts/fila.mjs aplicar <arquivo>` para o "Baixar resultado" que o admin mandar no chat.
**2026-10-01 (2):** **Dificuldade progressiva** no Mergulho (rodada fácil → médio → difícil; 1ª rodada da fase sem difíceis; Simulado e Prova seguem embaralhados) e **variantes na Revisão** (bloco `variantes` na trilha, só as validadas aparecem; questão do Enem **nunca** tem variante: vem outra nossa do mesmo tema). Regra: Fase 1 de cada matéria 100% nossa; literais do Enem só da Fase 2 em diante, difíceis, até 30% da fase. Detalhes: `docs/MOTOR_DIVER.md` seção 12 e `docs/CONTEUDO_CURSINHO.md` 1.3–1.4.
**2026-10-01:** Início com **"Continuar de onde parou"** (card grande com o último curso e fase; "Parabéns" quando o curso acaba; lista de cursos vira "Ver todos os cursos") e **Sala de Jogos por curso**: só aparecem os jogos que o curso suporta (sem "precisa de conteúdo" nem "em breve"); regra em `docs/JOGOS.md`.
**Upload de prova** (Simulado → Provas antigas; `js/leitor-prova.js` + `js/provas-enviadas.js`, pdf.js em `lib/pdfjs/`): prova antiga com gabarito vira simulado. Aluno: palavra de honra ("honesto" = XP sem pérolas; "espiadinha" = sem pontos). Professor/admin publicam para os alunos do curso (tabela `provas_curso`): vale XP e pérolas. Sem IA por enquanto.
**Ambientes** (`docs/AMBIENTES.md`): **produção** = GitHub Pages (`allissondella.github.io/diver`) + Supabase de produção; **testes** = Worker no Cloudflare (`diver.allisson-rzr.workers.dev` + prévia de cada PR em `<branch>-diver.allisson-rzr.workers.dev`) + Supabase de testes (só dados fictícios), com a faixa "AMBIENTE DE TESTES". O `js/config.js` escolhe pelo endereço; `localhost` usa testes. Mudança de banco roda primeiro nos testes.
**Tutorial de primeiro acesso** (`js/tutorial.js`): na primeira visita a cada área, o Diver destaca as partes da tela com balões e desenhos; "Como funciona esta página?" repete e o Perfil zera. Página nova? Acrescente o roteiro em `Tutorial.ROTEIROS`.
**Tipos de conta:** aluno, professor e admin (coluna `papel` em `perfis`). O admin cadastra os três; o professor só acompanha os alunos dos cursos dele ("Meus alunos"). Com Supabase ligado, a primeira página é o login.
**2026-09-29 (2):** login com **Supabase** (e-mail e senha, troca obrigatória no primeiro acesso), **área de Admin** (cadastrar pessoas e atribuir cursos), progresso sincronizado na nuvem, **Prova final** e o curso **ISO/IEC 27001:2022 Foundation** (65 questões originais). Ligar o Supabase: `docs/SUPABASE.md`. Sem `js/config.js` preenchido, o app roda no modo local.
O plano completo está em `docs/ROADMAP.md` (24 semanas, 120 tarefas). Use `/hoje` para começar.

## Ideia central: um motor, muitos jogos
Todo jogo é uma "roupa" diferente sobre o mesmo conteúdo (as cartas de uma trilha). Cada jogo recebe cartas, aplica a sua mecânica e devolve um **Resultado padrão**; XP, pérolas, oxigênio, revisão espaçada e conquistas vêm de um módulo central de economia. São **17 jogos** planejados (3 prontos). Catálogo, contrato e specs: `docs/JOGOS.md`.

## Regras técnicas (inegociáveis)
- HTML, CSS e JavaScript **puros**. Sem framework e sem etapa de build (a decisão sobre isso só será revista na Semana 14).
- Siga o padrão do código que já existe em `js/` (se o app usa scripts comuns, não troque por módulos ES sem combinar comigo).
- Caminhos **relativos** (sem barra no início) e nomes de arquivos em **minúsculas**: o site roda no GitHub Pages em `/diver/`.
- Nada de dependências de rede, exceto a fonte do Google Fonts (sempre com fallback). Bibliotecas, se necessárias, ficam dentro do repositório.
- `localStorage` e `IndexedDB` sempre dentro de try/catch; o app precisa funcionar mesmo se o armazenamento falhar.
- **Nunca** coloque chaves secretas, senhas ou dados de alunos no repositório (ele é público). No `js/config.js` só vão a URL do projeto e a chave **anon/publishable** do Supabase; nunca a `service_role`/`secret`. E-mails e senhas (inclusive do admin) só no chat ou no SQL Editor.
- Mudou o banco? Atualize `supabase/setup.sql` (sempre reexecutável, sem apagar dados) e teste as regras de segurança (RLS) antes de publicar.
- **Não renomeie** os campos dos JSON que já existem em `data/trilhas/`. Os blocos novos (pares, lacunas, sequências etc.) são opcionais.
- Jogo novo = arquivo em `js/jogos/`, registrado em `js/jogos/registro.js`, seguindo o contrato de `docs/JOGOS.md`. Use `/novo-jogo`.
- A partir da Semana 2, **toda** concessão de XP/pérolas passa por `js/economia.js`. Jogos nunca dão XP direto.

## Visual (resumo; detalhes em docs/DESIGN.md)
- Fundo marinho em degradê (`#0B2545` → `#06172D`), turquesa `#14B8A6` como cor principal, amarelo `#FACC15` (XP e destaques), coral `#FB7185` (erro gentil e alertas), textos `#E6F1FF` e `#A9BCD6`.
- Fonte **Plus Jakarta Sans**. Botão 3D com borda inferior turquesa mais escura. Bolhas suaves no fundo.
- Mascote: **Diver**, **vetorial (SVG)** no estilo figurinha: contorno turquesa, máscara amarela com os olhinhos do ícone da aba e **snorkel na boca** (`assets/mascote/diver.svg`, molde inline no `index.html`; expressões normal/feliz/triste/pensando; detalhes em `docs/DESIGN.md`). **O rosto é escolhido no Perfil por setinhas dos lados do mascote, como easter egg, sem texto** (`js/mascotes.js`): pinguins, mergulhadores e mergulhadoras, com tom de pele; o padrão é o **pinguim de penacho**. A pixel art e o peixinho foram aposentados.
- Use **variáveis CSS** (tokens). Não escreva cores soltas.
- **Nunca** use `confirm`, `alert` ou `prompt` do navegador: use `UI.confirmar` / `UI.perguntar` (caixa do Diver; sair de algo = mascote triste; regras em `docs/DESIGN.md`).

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
`docs/PRODUTO.md` (visão) · `docs/JOGOS.md` (catálogo e contrato) · `docs/DESIGN.md` (identidade) · `docs/ARQUITETURA.md` (como o código funciona hoje) · `docs/AMBIENTES.md` (produção e testes) · `docs/ROADMAP.md` (120 tarefas) · `docs/DIARIO.md` (histórico) · `docs/PROMPT_INICIAL.md` (primeira sessão)

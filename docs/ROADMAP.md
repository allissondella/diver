# Diver — roadmap (24 semanas · 120 tarefas)

> **Como usar:** `/hoje` encontra a primeira tarefa com a caixa vazia (`[ ]`). `/encerrar-dia` marca a caixa como feita (`[x]`).
> Nunca renumere as tarefas (D1…D120) e não pule a ordem sem combinar comigo.
> A numeração é relativa (Semana 1, Dia 1…): atrasos e feriados não quebram o plano, é só continuar de onde parou.
> Sexta é mais leve de propósito: termina com uma retro de 10 minutos.
> **2026-09-29:** a pedido, várias tarefas das Semanas 2 a 13 foram adiantadas de uma vez (barra lateral + implementação do que estava documentado). As marcadas `[x]` cumprem o "Pronto quando"; as parciais têm uma nota em itálico. Tarefas que dependem de pessoas (playtests, testadores) ou de serviços externos (Supabase, IA, domínio) continuam abertas.

## Visão geral das fases
| # | Fase | Semanas | Foco |
| --- | --- | --- | --- |
| 0 | Núcleo do Mergulho | 0 (feito) | Protótipo com Mergulho, Simulado, Revisão, trilhas, economia e conquistas |
| 1 | Diver no ar | 1–2 | Publicação, kit, identidade nova, mascote e motor de jogos |
| 2 | Jogos rápidos | 3–5 | Cartas do Fundo, Quiz Relâmpago, Memória, Adivinha Aí e criador de cartas |
| 3 | Aventuras | 6–8 | Caça ao Tesouro, Chefão do Abismo, Maré Alta, Forca e Corrente do Tempo |
| 4 | Economia e bem-estar | 9–10 | Perfil geral, loja, Dia de Descanso, Modo Foco e Desafio do Dia |
| 5 | Organização | 11–12 | Kanban, calendário, gerador de cronograma e tela Hoje |
| 6 | Biblioteca, conta e IA | 13–15 | PDFs, login com sincronização e conexão com a IA do usuário |
| 7 | Estratégia e duelos | 16–17 | Torre do Saber, Caso Resolvido e Duelo de Mergulhadores |
| 8 | Turmas e professor | 18–19 | Escolas, turmas, painel do professor e prêmios |
| 9 | Qualidade e confiança | 20–21 | PWA, acessibilidade, testes, LGPD e segurança |
| 10 | Beta e lançamento | 22–24 | Domínio, testadores, ilustrações finais, conteúdo e v1.0 |

**Marcos:** Semana 2 = Diver no ar com identidade nova · Semana 5 = 7 modos de jogo online (mostre para alguém!) · Semana 10 = Diver completo para estudar sozinho · Semana 12 = MVP pessoal (organiza a vida de estudos) · Semana 19 = versão para turmas e professores · Semana 24 = lançamento da v1.0.

## Semana 0 · Fase 0: Núcleo do Mergulho (FEITO)
- [x] Protótipo em HTML/CSS/JS puros com telas Início, Painel da trilha, Questão e Resumo.
- [x] Modos Mergulho, Simulado (nota 0–10, cronômetro, histórico) e Revisão.
- [x] Trilhas em JSON (2 de exemplo, 20 questões cada) + botão "Carregar trilha (.json)".
- [x] XP, 10 níveis, pérolas, oxigênio (3 por fase), streak, meta diária, repetição espaçada simples e 13 conquistas.
- [x] Acessibilidade básica: atalhos de teclado, foco visível, contraste, reduzir movimento.
- [x] Testado em celular e computador; enviado ao GitHub (Pull Request #1).

## Semana 1 · Fase 1: Diver no ar — Publicação e mascote
**Objetivo:** O protótipo na versão principal, publicado, com o kit e a nova identidade instalados.

- [x] **D1 · Seg** — Revisar o Pull Request #1 no GitHub e fazer o merge na main. Conferir que o repositório não tem chaves nem dados pessoais.
  - _Pronto quando:_ A main contém o protótipo completo; nada sensível no histórico.
- [x] **D2 · Ter** — Publicar no GitHub Pages (Settings → Pages → main / root); corrigir caminhos relativos e maiúsculas/minúsculas.
  - _Pronto quando:_ O Diver abre e carrega as trilhas na URL pública, no celular e no computador.
- [x] **D3 · Qua** — Copiar o kit (CLAUDE.md, docs/, .claude/, assets/) para a raiz do projeto e fazer o commit do kit.
  - _Pronto quando:_ /hoje funciona e lê o ROADMAP.
- [ ] **D4 · Qui** — Tokens de design: centralizar a paleta oficial em variáveis CSS e criar a página design.html (paleta, botões 3D, cards, tipografia).
  - _Pronto quando:_ design.html mostra tudo; nenhuma cor solta no CSS.
- [x] **D5 · Sex** — Integrar o mascote Diver na tela inicial (WebP animado; PNG com "reduzir movimento") e aposentar o peixinho da abertura. Retro. _(Feito em 2026-09-28, antes da D2 a pedido; mascote em SVG vetorial em vez da pixel art, ver docs/DESIGN.md.)_
  - _Pronto quando:_ O Diver nada na tela inicial; retro registrada em docs/DIARIO.md.

## Semana 2 · Fase 1: Diver no ar — Motor de jogos
**Objetivo:** Um contrato único para todos os jogos e uma Sala de Jogos para escolher entre eles.

- [x] **D6 · Seg** — Definir o contrato de jogo (definição, sessão e Resultado padrão) e o registro de jogos em js/jogos/registro.js.
  - _Pronto quando:_ docs/JOGOS.md revisado e o registro criado; nenhum comportamento mudou.
- [ ] **D7 · Ter** — Migrar Mergulho, Simulado e Revisão para o contrato, sem mudar o que o aluno vê. _(parcial: os três modos estão registrados na Sala de Jogos, mas ainda não devolvem o Resultado padrão.)_
  - _Pronto quando:_ Os três modos funcionam igual, agora registrados como jogos.
- [ ] **D8 · Qua** — Centralizar a economia em js/economia.js: todo Resultado passa por ali (XP, pérolas, oxigênio, streak, conquistas). _(parcial: js/economia.js já concede XP de jogos, tarefas e foco; Mergulho, Simulado e Revisão ainda usam o quiz.js.)_
  - _Pronto quando:_ Um único lugar concede XP; valores em um arquivo de configuração.
- [x] **D9 · Qui** — Criar a Sala de Jogos: cards por grupo, com estado (disponível, precisa de conteúdo, em breve).
  - _Pronto quando:_ Escolher jogo e trilha e começar em até 2 toques.
- [ ] **D10 · Sex** — Modelo de cartas: tipos (múltipla, V/F, par, lacuna, sequência, adivinha) e derivadores a partir das questões atuais. Retro. _(parcial: múltipla, V/F, par, sequência, adivinha e palavra prontos; falta lacuna.)_
  - _Pronto quando:_ Toda trilha existente já tem cartas derivadas para os jogos rápidos.

## Semana 3 · Fase 2: Jogos rápidos — Cartas do Fundo e Quiz Relâmpago
**Objetivo:** Dois jogos rápidos e a revisão espaçada de verdade.

- [x] **D11 · Seg** — Cartas do Fundo: virar a carta e autoavaliar (Sabia · Quase · Não sabia).
  - _Pronto quando:_ Uma rodada de 10 cartas com resultado padrão.
- [ ] **D12 · Ter** — Caixas de Leitner (1 a 5) por carta e por trilha, alimentando Revisão e Desafio do Dia. _(parcial: caixas de Leitner existem nas Cartas do Fundo; falta alimentar a Revisão e o Desafio do Dia.)_
  - _Pronto quando:_ Carta errada volta cedo; carta acertada espaça.
- [x] **D13 · Qua** — Quiz Relâmpago: múltipla escolha e verdadeiro ou falso, com cronômetro opcional.
  - _Pronto quando:_ Partida de 10 perguntas com resultado.
- [x] **D14 · Qui** — Combo de acertos (+5 XP a partir do 3º seguido), efeito de onda e tela de resultado.
  - _Pronto quando:_ Combo visível; XP confere com a tabela da economia.
- [x] **D15 · Sex** — Teclado, foco visível e "reduzir movimento" nos dois jogos. Retro.
  - _Pronto quando:_ Dá para jogar os dois só com o teclado.

## Semana 4 · Fase 2: Jogos rápidos — Memória e Adivinha Aí
**Objetivo:** Um jogo de pares e um jogo de dicas.

- [x] **D16 · Seg** — Memória: grade de conchas com animação de virar (CSS 3D) e versão sem movimento.
  - _Pronto quando:_ As conchas viram e desviram com suavidade.
- [x] **D17 · Ter** — Memória: pares termo ↔ definição, tentativas e tempo; derivar pares das questões.
  - _Pronto quando:_ Partida completa do início ao fim em qualquer trilha.
- [x] **D18 · Qua** — Adivinha Aí: cartas com até 10 dicas, chegando em "garrafas com mensagem".
  - _Pronto quando:_ As cartas aceitam dicas; as garrafas aparecem uma a uma.
- [x] **D19 · Qui** — Adivinha Aí: chutar a resposta, comparação sem acento e maiúsculas, menos dicas = mais pontos.
  - _Pronto quando:_ "fotossintese" é aceito como "Fotossíntese".
- [x] **D20 · Sex** — Resultado padrão, XP e pérolas dos dois jogos + revisão das cartas erradas. Retro.
  - _Pronto quando:_ Os dois jogos alimentam nível, streak e conquistas.

## Semana 5 · Fase 2: Jogos rápidos — Crie suas cartas
**Objetivo:** Qualquer pessoa cria conteúdo sem mexer em arquivos.

- [ ] **D21 · Seg** — Editor de cartas no navegador: criar, editar e excluir cartas dos vários tipos.
  - _Pronto quando:_ Criar 10 cartas de tipos diferentes sem erro.
- [x] **D22 · Ter** — Exportar e importar trilha em JSON (ligado ao botão "Carregar trilha").
  - _Pronto quando:_ Uma trilha criada no editor abre em outro aparelho.
- [ ] **D23 · Qua** — Importar colando texto (termo ; definição) ou CSV, com pré-visualização. _(parcial: cria trilha colando "pergunta | certa | erradas"; falta "termo ; definição" e CSV.)_
  - _Pronto quando:_ Colar 20 linhas gera 20 cartas.
- [ ] **D24 · Qui** — Trilha de exemplo nova (ex.: Inglês) com todos os tipos de carta.
  - _Pronto quando:_ A trilha nova joga em todos os jogos disponíveis.
- [ ] **D25 · Sex** — Testes das regras de pontuação e do derivador de cartas (página testes.html). Retro.
  - _Pronto quando:_ testes.html toda verde. Marco: os 7 primeiros modos de jogo estão online, mostre para alguém!

## Semana 6 · Fase 3: Aventuras — Caça ao Tesouro
**Objetivo:** Uma aventura com mapa e recompensa.

- [x] **D26 · Seg** — Mapa em SVG do fundo do mar (5 a 8 paradas) e estrutura de fases.
  - _Pronto quando:_ O mapa exibe as paradas em ordem.
- [x] **D27 · Ter** — Cada parada é uma pergunta; acertar revela o próximo trecho da trilha.
  - _Pronto quando:_ Avançar pelo mapa respondendo.
- [ ] **D28 · Qua** — Baú final com pérolas e animação, com o Diver comemorando. _(parcial: baú com bônus e salvo; falta a animação do Diver comemorando.)_
  - _Pronto quando:_ Recompensa entregue e salva.
- [x] **D29 · Qui** — Gerar a caça automaticamente de qualquer trilha (sorteio + ordem por dificuldade).
  - _Pronto quando:_ Toda caça é diferente da anterior.
- [ ] **D30 · Sex** — Playtest com 2 ou 3 pessoas e registro do feedback. Retro.
  - _Pronto quando:_ Lista de melhorias no DIARIO.md.

## Semana 7 · Fase 3: Aventuras — Chefão do Abismo e Maré Alta
**Objetivo:** Um jogo de chefe e um de sobrevivência.

- [x] **D31 · Seg** — Chefão do Abismo: monstro marinho em SVG com barra de vida; cada acerto causa dano.
  - _Pronto quando:_ A barra de vida reage aos acertos.
- [x] **D32 · Ter** — Ataques do chefão: cada erro custa oxigênio; vitória e derrota com resultado padrão.
  - _Pronto quando:_ Partida completa nos dois desfechos.
- [x] **D33 · Qua** — Um chefão por profundidade (Raso, Recife, Caverna, Abismo), liberado ao completar a fase.
  - _Pronto quando:_ Quatro chefões com dificuldade crescente.
- [x] **D34 · Qui** — Maré Alta: sobrevivência sem fim; a maré sobe a cada erro; recorde por trilha.
  - _Pronto quando:_ Recorde salvo e exibido.
- [ ] **D35 · Sex** — Balancear XP e pérolas dos dois jogos. Retro.
  - _Pronto quando:_ Ganhos coerentes com a tabela da economia.

## Semana 8 · Fase 3: Aventuras — Forca do Náufrago e Corrente do Tempo
**Objetivo:** Um jogo de palavras e um de ordenar.

- [x] **D36 · Seg** — Forca do Náufrago: palavras-chave (campo palavras ou derivadas dos temas) e teclado na tela.
  - _Pronto quando:_ Partida jogável com teclado físico e virtual.
- [x] **D37 · Ter** — Cada erro tira uma peça da jangada; a dica opcional custa 1 pérola.
  - _Pronto quando:_ A jangada reage; a dica debita a pérola.
- [x] **D38 · Qua** — Corrente do Tempo: ordenar itens (cronologia, passo a passo) arrastando.
  - _Pronto quando:_ Ordenar 6 itens no celular e no computador.
- [ ] **D39 · Qui** — Sequências: campo sequencias e derivação de questões que tenham ordem.
  - _Pronto quando:_ A trilha de História gera 3 sequências.
- [x] **D40 · Sex** — Alternativa por teclado para o arrastar e revisão de acessibilidade. Retro.
  - _Pronto quando:_ Ordenar funciona só com o teclado.

## Semana 9 · Fase 4: Economia e bem-estar — Perfil e loja de pérolas
**Objetivo:** As pérolas passam a ter onde ser gastas.

- [x] **D41 · Seg** — Perfil geral: XP total, nível global e pérolas somando todas as trilhas.
  - _Pronto quando:_ O perfil mostra o total e o detalhe por trilha.
- [ ] **D42 · Ter** — Loja de pérolas: oxigênio extra, congelar a sequência, molduras e cenários.
  - _Pronto quando:_ Comprar e usar um item.
- [ ] **D43 · Qua** — Estrutura de itens do mascote (chapéus, máscaras, cores), pronta para receber as ilustrações.
  - _Pronto quando:_ Um item equipado aparece no Diver (com arte provisória).
- [ ] **D44 · Qui** — Baú de Pérolas: recompensa surpresa ao completar fases e desafios.
  - _Pronto quando:_ O baú abre com animação e credita o prêmio.
- [ ] **D45 · Sex** — Balanceamento da economia numa planilha (custo de cada item, ganho por dia). Retro.
  - _Pronto quando:_ Valores ajustados no arquivo de configuração.

## Semana 10 · Fase 4: Economia e bem-estar — Descanso, Foco e Desafio do Dia
**Objetivo:** Bem-estar de verdade e um motivo para voltar todo dia.

- [ ] **D46 · Seg** — Dia de Descanso: compra, agendamento, proteção da sequência e limite mensal.
  - _Pronto quando:_ Um dia de descanso agendado não quebra a sequência.
- [ ] **D47 · Ter** — Check-in de humor opcional e mensagens gentis da Nina.
  - _Pronto quando:_ Check-in em 1 toque, sempre pulável.
- [x] **D48 · Qua** — Modo Foco (25/5) com pausas sugeridas e XP por tempo focado.
  - _Pronto quando:_ Um ciclo completo concede XP.
- [x] **D49 · Qui** — Desafio do Dia: jogo e conteúdo sorteados por semente da data (funciona offline), com XP em dobro.
  - _Pronto quando:_ Mesmo desafio o dia todo, outro amanhã.
- [ ] **D50 · Sex** — Lembrete gentil do desafio (notificação do navegador, só se o aluno ativar). Retro.
  - _Pronto quando:_ Lembrete no horário escolhido e desligável em um toque. Marco: Diver completo para estudar sozinho.

## Semana 11 · Fase 5: Organização — Kanban de estudos
**Objetivo:** O aluno organiza as tarefas sem sair do app.

- [x] **D51 · Seg** — Estrutura de tarefas (título, trilha, status, prazo, prioridade, ordem) salvas no navegador.
  - _Pronto quando:_ Criar uma tarefa pela interface.
- [x] **D52 · Ter** — Quadro com colunas A fazer, Fazendo, Revisar e Feito.
  - _Pronto quando:_ Tarefas nas colunas certas.
- [x] **D53 · Qua** — Arrastar e soltar com ordem salva (eventos de ponteiro, sem biblioteca).
  - _Pronto quando:_ Recarregar a página mantém a ordem.
- [x] **D54 · Qui** — Concluir tarefa dá XP uma única vez; filtros por trilha e prazo.
  - _Pronto quando:_ Mover para Feito gera XP uma vez só.
- [x] **D55 · Sex** — Kanban no celular (colunas em abas). Retro.
  - _Pronto quando:_ Usável com uma mão.

## Semana 12 · Fase 5: Organização — Calendário e tela Hoje
**Objetivo:** Tudo o que importa no dia, em um só lugar.

- [x] **D56 · Seg** — Eventos (prova, aula, sessão de estudo, dia de descanso) com cores por tipo.
  - _Pronto quando:_ Eventos coloridos por tipo.
- [x] **D57 · Ter** — Visões mensal e semanal do calendário.
  - _Pronto quando:_ Navegar entre meses e semanas.
- [x] **D58 · Qua** — Tarefas com prazo aparecem no calendário; criação rápida de evento.
  - _Pronto quando:_ Criar um evento em menos de 10 segundos.
- [x] **D59 · Qui** — Gerador de cronograma: data da prova + trilhas → sessões distribuídas.
  - _Pronto quando:_ O plano gerado cabe na agenda sem conflitos.
- [x] **D60 · Sex** — Tela Hoje (início): Desafio do Dia, tarefas, eventos e meta. Retro.
  - _Pronto quando:_ Abrir o app responde "o que eu faço hoje?". Marco: MVP pessoal.

## Semana 13 · Fase 6: Biblioteca, conta e IA — Biblioteca de PDFs
**Objetivo:** Material de estudo guardado e fácil de achar.

- [x] **D61 · Seg** — Enviar PDFs e guardar no navegador (IndexedDB) com limite de tamanho.
  - _Pronto quando:_ Um PDF de 10 MB salvo e listado.
- [x] **D62 · Ter** — Organizar por trilha ou pasta e buscar pelo nome.
  - _Pronto quando:_ Achar um arquivo digitando parte do nome.
- [ ] **D63 · Qua** — Leitor de PDF (pdf.js, servido junto com o projeto) com zoom e navegação. _(parcial: o leitor usa o visualizador de PDF do próprio navegador; falta o pdf.js.)_
  - _Pronto quando:_ Ler um PDF inteiro dentro do app.
- [ ] **D64 · Qui** — Anotações por página e marcadores. _(parcial: anotações por PDF; falta por página e marcadores.)_
  - _Pronto quando:_ A anotação reaparece ao reabrir o PDF.
- [ ] **D65 · Sex** — Extrair o texto do PDF para busca. Retro.
  - _Pronto quando:_ A busca encontra uma palavra dentro do PDF.

## Semana 14 · Fase 6: Biblioteca, conta e IA — Conta e sincronização
**Objetivo:** Login e progresso que acompanham o aluno em qualquer aparelho.

- [ ] **D66 · Seg** — Criar o projeto no Supabase, configurar o cliente e as chaves públicas (nada secreto no repositório). _(parcial: supabase/setup.sql e o cliente js/nuvem.js prontos e testados num Postgres local; falta criar o projeto no Supabase (docs/SUPABASE.md).)_
  - _Pronto quando:_ Uma página de teste lê um dado do banco.
- [ ] **D67 · Ter** — Login (link mágico por e-mail e Google) e rotas privadas. _(parcial: login por e-mail e senha, com senha temporária e troca obrigatória; link mágico e Google ficam para depois.)_
  - _Pronto quando:_ Entrar e sair funcionam.
- [ ] **D68 · Qua** — Tabelas profiles, trilhas, cartas e partidas com RLS ativada desde a primeira migração. _(parcial: tabelas perfis, matriculas e estado com RLS desde a primeira versão; tabelas trilhas/cartas/partidas ficam para depois.)_
  - _Pronto quando:_ Cada usuário só enxerga o que é dele.
- [ ] **D69 · Qui** — Sincronizar progresso e trilhas: levar o que está no navegador para a conta, sem perder nada. _(parcial: sincronia de progresso, tarefas e eventos pronta e testada; falta ligar o projeto de verdade.)_
  - _Pronto quando:_ Trocar de aparelho mantém XP, streak e conquistas.
- [ ] **D70 · Sex** — Modo sem conta continua funcionando (visitante/offline). Retro. _(parcial: sem js/config.js preenchido o app roda sem conta; com o Supabase ligado, o login passa a ser obrigatório.)_
  - _Pronto quando:_ Sem login, tudo funciona como hoje.

## Semana 15 · Fase 6: Biblioteca, conta e IA — Traga sua IA
**Objetivo:** O aluno conecta a IA que preferir, se quiser.

- [ ] **D71 · Seg** — Configurações de IA: escolher o provedor e colar a própria chave, guardada criptografada no servidor (função do Supabase).
  - _Pronto quando:_ A chave nunca volta ao navegador depois de salva.
- [ ] **D72 · Ter** — Camada única de IA (a mesma função responde com vários provedores).
  - _Pronto quando:_ A mesma chamada responde com 2 provedores.
- [ ] **D73 · Qua** — Gerar cartas de qualquer tipo a partir de PDF ou texto, com revisão humana antes de salvar.
  - _Pronto quando:_ 20 cartas geradas, editadas e salvas.
- [ ] **D74 · Qui** — Pergunte ao Material: respostas com base no PDF escolhido, citando a página.
  - _Pronto quando:_ A resposta mostra "p. 12" e abre a página.
- [ ] **D75 · Sex** — Erros, limites e aviso de custo; IA sempre opcional. Retro.
  - _Pronto quando:_ O app funciona 100% sem IA.

## Semana 16 · Fase 7: Estratégia e duelos — Torre do Saber
**Objetivo:** O jogo da torre de blocos, com a nossa cara.

- [ ] **D76 · Seg** — Torre de blocos em CSS/SVG (caixotes de naufrágio) com animação.
  - _Pronto quando:_ Torre montada e animada.
- [ ] **D77 · Ter** — Retirar um bloco = responder; errar aumenta a instabilidade.
  - _Pronto quando:_ A barra de equilíbrio reage aos erros.
- [ ] **D78 · Qua** — Queda da torre, pontuação e modo 2 jogadores no mesmo aparelho.
  - _Pronto quando:_ Duas pessoas alternam a vez.
- [ ] **D79 · Qui** — Cores dos blocos indicam a dificuldade (e valem mais pontos).
  - _Pronto quando:_ Bloco roxo vale mais que bloco verde.
- [ ] **D80 · Sex** — Playtest e ajustes. Retro.
  - _Pronto quando:_ Top 3 ajustes feitos.

## Semana 17 · Fase 7: Estratégia e duelos — Caso Resolvido e Duelo
**Objetivo:** Um jogo de investigação e um de disputa.

- [ ] **D81 · Seg** — Caso Resolvido: estrutura do caso (suspeitos, locais, objetos ligados a conceitos), num navio naufragado.
  - _Pronto quando:_ Um caso de exemplo modelado.
- [ ] **D82 · Ter** — Jogabilidade: coletar pistas respondendo e deduzir a solução final.
  - _Pronto quando:_ Caso resolvido do início ao fim.
- [ ] **D83 · Qua** — Gerador de casos a partir de uma trilha (temas viram pistas).
  - _Pronto quando:_ Uma trilha nova gera um caso jogável.
- [ ] **D84 · Qui** — Duelo de Mergulhadores: dois jogadores no mesmo aparelho, em turnos, disputando pérolas.
  - _Pronto quando:_ Duelo completo com vencedor.
- [ ] **D85 · Sex** — Empate, placar e revanche. Retro.
  - _Pronto quando:_ Empate e revanche funcionam.

## Semana 18 · Fase 8: Turmas e professor — Turmas
**Objetivo:** Estudar junto, com segurança.

- [ ] **D86 · Seg** — Modelo multiescola: organizations, classes e memberships com papéis (aluno, professor, gestor); revisar RLS.
  - _Pronto quando:_ Testes provam o isolamento entre escolas.
- [ ] **D87 · Ter** — O professor cria a turma e gera um código ou link de convite.
  - _Pronto quando:_ Código de 6 caracteres gerado.
- [ ] **D88 · Qua** — O aluno entra pelo código e vê a turma no perfil.
  - _Pronto quando:_ O aluno aparece na lista do professor.
- [ ] **D89 · Qui** — Ranking da turma (desligável pelo professor) e meta coletiva.
  - _Pronto quando:_ Meta da turma com barra de progresso.
- [ ] **D90 · Sex** — Revisão de segurança: o aluno nunca vê dados privados de outro aluno. Retro.
  - _Pronto quando:_ Checklist de segurança preenchido.

## Semana 19 · Fase 8: Turmas e professor — Área do professor
**Objetivo:** Facilidades reais para quem ensina.

- [ ] **D91 · Seg** — Painel do professor: turmas, alunos e atividade recente.
  - _Pronto quando:_ Visão geral em uma tela.
- [ ] **D92 · Ter** — Compartilhar trilhas e PDFs com a turma.
  - _Pronto quando:_ O aluno recebe o material na biblioteca.
- [ ] **D93 · Qua** — Atribuir atividade (jogo + trilha + prazo) que cai no Kanban e no calendário do aluno.
  - _Pronto quando:_ A atividade aparece para toda a turma.
- [ ] **D94 · Qui** — Relatório: acertos por tema, tempo de estudo e alunos que precisam de ajuda.
  - _Pronto quando:_ O professor identifica o tema mais difícil.
- [ ] **D95 · Sex** — Prêmios de turma: prêmio e meta de pontos definidos pelo professor. Retro.
  - _Pronto quando:_ A turma vê o prêmio e quanto falta.

## Semana 20 · Fase 9: Qualidade e confiança — Polimento
**Objetivo:** Rápido, acessível e instalável.

- [ ] **D96 · Seg** — PWA instalável (manifest, ícones, modo offline).
  - _Pronto quando:_ Instalar no celular pelo navegador.
- [ ] **D97 · Ter** — Auditoria de acessibilidade (contraste, leitor de tela, foco visível).
  - _Pronto quando:_ Lighthouse Acessibilidade ≥ 90.
- [ ] **D98 · Qua** — Desempenho: carregar jogos sob demanda e otimizar imagens e animações do mascote.
  - _Pronto quando:_ Lighthouse Desempenho ≥ 85 no celular.
- [ ] **D99 · Qui** — Erros e estados vazios ilustrados com o Diver e a turma.
  - _Pronto quando:_ Nenhuma tela em branco ou erro técnico cru.
- [ ] **D100 · Sex** — Testes de ponta a ponta dos fluxos principais. Retro.
  - _Pronto quando:_ Login → jogar → ganhar XP testado.

## Semana 21 · Fase 9: Qualidade e confiança — Confiança e LGPD
**Objetivo:** Pronto para receber alunos de verdade.

- [ ] **D101 · Seg** — Rascunho de termos, política de privacidade e consentimento dos responsáveis (menores).
  - _Pronto quando:_ Textos prontos para revisão jurídica.
- [ ] **D102 · Ter** — Exportar os dados e excluir a conta (direitos do titular na LGPD).
  - _Pronto quando:_ A exclusão remove dados e arquivos.
- [ ] **D103 · Qua** — Moderação: denunciar conteúdo compartilhado e limites de upload.
  - _Pronto quando:_ A denúncia chega ao gestor ou professor.
- [ ] **D104 · Qui** — Backups, registro de erros e página de status simples.
  - _Pronto quando:_ Um erro em produção gera alerta.
- [ ] **D105 · Sex** — Revisão geral de segurança (chaves, RLS, uploads, limites de requisição). Retro.
  - _Pronto quando:_ Checklist de segurança 100%.

## Semana 22 · Fase 10: Beta e lançamento — Beta fechado
**Objetivo:** Gente de verdade usando e opinando, já no endereço definitivo.

- [ ] **D106 · Seg** — Mudar a hospedagem para um serviço que permita uso comercial (ex.: Cloudflare Pages) e registrar o domínio.
  - _Pronto quando:_ O Diver responde no domínio próprio, com HTTPS.
- [ ] **D107 · Ter** — Landing page com lista de espera.
  - _Pronto quando:_ Página publicada e coletando e-mails.
- [ ] **D108 · Qua** — Convidar de 10 a 20 testadores, incluindo pelo menos 1 professor.
  - _Pronto quando:_ Testadores com acesso.
- [ ] **D109 · Qui** — Formulário de feedback no app e métricas básicas de uso.
  - _Pronto quando:_ Os primeiros dados chegando.
- [ ] **D110 · Sex** — Corrigir os 5 problemas mais citados. Retro parcial.
  - _Pronto quando:_ Top 5 resolvido e comunicado.

## Semana 23 · Fase 10: Beta e lançamento — Conteúdo e ilustrações
**Objetivo:** O Diver com a cara final e conteúdo de sobra para jogar.

- [ ] **D111 · Seg** — Ilustrações finais: o Diver em várias poses e a turma (ilustrador ou geração revisada por você).
  - _Pronto quando:_ Cada personagem com 3 expressões.
- [ ] **D112 · Ter** — Aplicar as ilustrações e animações novas em todo o app.
  - _Pronto quando:_ Nenhum quebra-galho (placeholder) visível.
- [ ] **D113 · Qua** — Conteúdo inicial: pelo menos 5 trilhas por área (cursinho, faculdade, treinamento).
  - _Pronto quando:_ Trilhas revisadas jogando em todos os jogos.
- [ ] **D114 · Qui** — Onboarding guiado pelo Diver (tour de 1 minuto).
  - _Pronto quando:_ Um usuário novo entende o app em 1 minuto.
- [ ] **D115 · Sex** — Retro do beta: o que manter, mudar e cortar.
  - _Pronto quando:_ Lista de prioridades da v1.0.

## Semana 24 · Fase 10: Beta e lançamento — Lançamento v1.0
**Objetivo:** No ar, com festa (e descanso merecido).

- [ ] **D116 · Seg** — Correções finais e congelamento de funcionalidades.
  - _Pronto quando:_ Nenhum bug crítico aberto.
- [ ] **D117 · Ter** — Revisão jurídica final e busca do nome no INPI.
  - _Pronto quando:_ Documentos e marca conferidos.
- [ ] **D118 · Qua** — Ensaio de lançamento: teste completo em 3 aparelhos.
  - _Pronto quando:_ Fluxos principais sem erro.
- [ ] **D119 · Qui** — Lançamento da v1.0 e anúncio.
  - _Pronto quando:_ App público no domínio oficial.
- [ ] **D120 · Sex** — Comemoração + planejamento da v2 (Cruzadinha Submarina, Batalha de Turmas ao vivo, planos para escolas). Tire um dia de descanso!
  - _Pronto quando:_ Roadmap da v2 esboçado.

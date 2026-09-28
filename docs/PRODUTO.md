# Diver — visão do produto (versão curta)

> Versão completa: documento Word "Diver — Documento do Projeto v2.0". Este arquivo resume o que o Claude Code precisa saber.

## Em uma frase
O Diver é o lugar onde o estudante mergulha no que precisa aprender, joga com o próprio conteúdo, se organiza sem esforço e é recompensado inclusive com descanso.

## Pilares
| Pilar | O que significa na prática |
| --- | --- |
| Jogar | 17 jogos curtos (2 a 5 minutos) que usam as cartas do próprio estudante. |
| Organizar | Kanban de tarefas, calendário de provas e gerador de cronograma. A tela Hoje responde "o que eu faço agora?". |
| Consultar | Biblioteca de PDFs com leitor, anotações e busca. Quem quiser conecta a própria IA. |
| Descansar | Pérolas compram Dias de Descanso. Pausas, check-in de humor e mensagens gentis fazem parte do produto. |
| Estudar junto | Turmas com metas coletivas e prêmios definidos pelo professor, que acompanha tudo em um painel próprio. |

## Para quem
| Perfil | Do que precisa | Como o Diver ajuda |
| --- | --- | --- |
| Estudante solo | Motivação, rotina e um lugar só para tudo. | Desafio do Dia, jogos, Kanban, calendário e biblioteca. |
| Aluno em turma | Saber o que o professor pediu e estudar com os colegas. | Atividades atribuídas caem no Kanban; metas e prêmios da turma. |
| Professor | Compartilhar material e ver quem precisa de ajuda. | Painel com turmas, relatórios por tema e atribuição de atividades. |
| Treinamento (RH) | Capacitar equipes com evidência de aprendizado. | Trilhas de treinamento e relatórios por tema no mesmo painel. |
| Escola | Ferramenta simples, segura e de baixo custo. | Gratuito para escolas públicas; plano pago para particulares. |

## Princípios de produto
1. **Uma ação principal por tela.**
2. **Dois toques até jogar.** Da tela inicial à primeira pergunta, no máximo dois toques.
3. **Um conteúdo, muitos jogos.** O aluno cria as cartas uma vez; todos os jogos usam.
4. **Recompensa sem chantagem.** Celebramos o que foi feito; nunca punimos o que não foi.
5. **IA opcional.** Tudo funciona sem IA. Com IA, tudo fica mais rápido.
6. **Pronto para a escola desde o dia 1.** O banco de dados nasce preparado para turmas e escolas.

## Áreas do app
| Área | O que tem | Guia | Status |
| --- | --- | --- | --- |
| Início (Hoje) | Desafio do Dia, meta diária, tarefas e eventos de hoje, sequência e humor. | Diver | Parcial |
| Jogar (Sala de Jogos) | Catálogo de jogos, escolha da trilha, Desafio do Dia, histórico. | Tito | Parcial (3 modos) |
| Organizar | Kanban, calendário, gerador de cronograma, Modo Foco. | Nina | Planejado |
| Biblioteca | Trilhas, cartas, PDFs, anotações, Pergunte ao Material. | Juca | Parcial (trilhas) |
| Perfil | Avatar, nível geral, medalhas, loja, turmas, IA e privacidade. | Diver | Parcial |
| Professor | Turmas, materiais, atividades, relatórios e prêmios. | Lia | Planejado |

## Elenco (proposta, ainda não fechada)
| Personagem | Quem é | Onde aparece |
| --- | --- | --- |
| **Diver** (mergulhador) | Mascote principal. Sorridente, sempre lendo. Motiva sem pressa. | Início, onboarding, acertos, níveis e conquistas. |
| **Tito** (caranguejo) | Explorador curioso que cava pistas. | Caça ao Tesouro e Caso Resolvido. |
| **Lia** (gaivota) | Professora animada e falante; reúne a turma. | Turmas e área do professor. |
| **Juca** (polvo) | Bibliotecário que alcança qualquer livro com os tentáculos. | Biblioteca, busca e Pergunte ao Material. |
| **Nina** (tartaruga-marinha) | Guardiã do descanso, sábia e sem pressa. | Dia de Descanso, Modo Foco e check-in de humor. |

## Economia (resumo; valores em js/economia.js)
- **XP** nunca diminui e define o nível (10 níveis; Mestre Diver = 2.100 XP).
- **Pérolas** são a moeda: ganham-se nos acertos e gastam-se na loja e em Dias de Descanso.
- **Oxigênio** funciona como vidas nos jogos que têm vidas (3 por fase; cada erro custa 1).
- **Streak**: dias seguidos com pelo menos 1 questão. **Meta diária**: 5, 10, 20 ou 30 questões.
| Evento | XP | Pérolas |
| --- | --- | --- |
| Acerto fácil / médio / difícil | 10 / 15 / 20 | 1 / 2 / 3 |
| Sequência de acertos (a partir do 3º) | +5 | — |
| Completar uma fase pela primeira vez | +30 | +5 |
| Completar a fase sem perder oxigênio | — | +5 |

## Regras de bem-estar
1. Nenhuma mensagem de culpa ou ameaça. 2. O XP diário para de crescer depois de um teto razoável. 3. Lembretes com horário escolhido e desligáveis em um toque. 4. Check-in de humor opcional e privado. 5. O Modo Foco sugere pausas de verdade. 6. Sem anúncios na experiência de estudo.

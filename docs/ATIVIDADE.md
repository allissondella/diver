# Log de atividade, estatísticas e ranking

> Tudo o que o aluno faz no Diver vira uma linha na tabela `eventos_atividade`. Desse log saem as
> estatísticas (aluno, admin e professor), as estatísticas e o ranking da Palavrinha e, mais pra
> frente, a **retrospectiva do ano**. Não existe tabela de estatística: tudo é calculado do log.

## 1. A tabela (`supabase/setup.sql`)
| Coluna | O que é |
|---|---|
| `id` | uuid gerado **pelo app** (reenviar o mesmo evento não duplica) |
| `aluno_id` | quem fez (sempre quem está logado: o banco recusa outro) |
| `curso_id` | id da trilha (pode ser nulo) |
| `tipo` | um destes: `questao_respondida`, `jogo_concluido`, `mergulho_sessao`, `revisao_sessao`, `simulado_concluido`, `prova_concluida`, `certificado_emitido` |
| `detalhes` | jsonb pequeno (até 4 KB), muda por tipo (abaixo) |
| `criado_em` | hora do servidor; aceita a hora do aparelho se for dos últimos 7 dias (eventos guardados sem internet) |

**Quem vê o quê (RLS):** o aluno vê só os próprios eventos; o admin vê todos; o professor vê os eventos
dos alunos dele **só nos cursos em comum** (a mesma regra do progresso na tabela `estado`, com
`professor_do_curso` e `aluno_do_professor`). Ninguém altera nem apaga eventos pelo app; `anon` não lê nada.

## 2. O que cada tipo guarda em `detalhes`
| Tipo | Onde nasce | Campos |
|---|---|---|
| `questao_respondida` | `app.js` → `responder` (Mergulho, Simulado, Revisão, Prova final, prova enviada) | `modo`, `questao`, `revisa_de` (variante/substituta), `acertou`, `dificuldade`, `tema`, `fase` |
| `mergulho_sessao`, `revisao_sessao`, `simulado_concluido`, `prova_concluida` | `app.js` → `registrarSessao` (fim normal ou "saiu" no meio) | `modo`, `motivo` (`fim`, `sem-oxigenio`, `tempo`, `saiu`), `total`, `acertos`, `pct`, `tempo_seg`, `fase`, `estrelas`, `fase_concluida`, `nota`, `aprovado`, `em_branco`, `origem` (`prova_enviada`), `xp`, `perolas` |
| `jogo_concluido` | `app.js` → `terminarJogo` (todos os jogos, pelo Resultado padrão) | `jogo`, `acertos`, `erros`, `total`, `pontuacao`, `tempo_seg`, `perfeito`, `desafio`, `xp`, `perolas` + o que o jogo mandar em `resultado.registro` |
| `certificado_emitido` | **reservado**: o app ainda não emite certificado | — |

A Palavrinha manda em `registro`: `jogo: 'palavrinha'`, `variante` (`x1`, `x2`, `x4`), `diaria` (palavra do dia ou treino), `data` (dia local), `venceu`, `tentativas`, `letras`, `palavras` (ids).

**Privacidade:** nada de texto digitado pelo aluno vai para o log (só ids, números e sim/não); textos são cortados em 120 caracteres.

## 3. Como os eventos chegam (`js/atividade.js`)
- **Com login:** fila no navegador (`diver:atividade:fila`) → `POST eventos_atividade` em lotes de até 100, a cada 20 eventos, a cada 30 s, quando a aba some ou fecha, ao sair da conta e antes de abrir estatísticas. Sem internet, espera e envia depois.
- **Sem login (modo local):** log no navegador (`diver:atividade:local`, os 5.000 mais recentes).
- As chaves **não** começam com `diver:v1:` de propósito: o log não entra no espelho da tabela `estado`.
- `Atividade.registrar(tipo, cursoId, detalhes)` nunca quebra o app: qualquer erro é engolido.

## 4. Estatísticas
- Banco: `estatisticas_atividade(p_aluno, p_curso)` (security invoker: respeita a RLS). App sem login: `Atividade.resumir(eventos)`, **a mesma conta** (testada lado a lado).
- Telas: **Você → Minhas Estatísticas** (`js/estatisticas.js`) e o bloco **Estatísticas** dentro do "Progresso" de cada pessoa em Admin/Professor.

## 5. Palavrinha: estatísticas e ranking
- **Estatísticas pessoais** (`Palavrinha.estatisticas`): todas as partidas da variante, palavra do dia **e** Treino livre; partidas, % de vitórias, sequência atual (vitórias seguidas; uma derrota zera), melhor sequência e distribuição de tentativas.
- **XP e pérolas:** as duas valem XP; **pérolas só na palavra do dia** (o treino manda `semPerolas: true` no Resultado padrão e a economia zera as pérolas).
- **Ranking Diver por curso** (`ranking_palavrinha(p_curso, p_variante, p_periodo)`, security definer): conta a palavra do dia e o treino; só quem é do curso (ou professor dele, ou admin) consulta; entram as pessoas ativas do curso (alunos e professores matriculados) e o admin, que joga em qualquer curso; nome curto ("Maria S."); pontos por vitória = tentativas máximas + 1 − tentativas usadas (6/7/9 no x1/x2/x4); placar do mês (zera no dia 1º, pela data da partida) ou geral.
- **Ranking Diver de todos os cursos** (`ranking_palavrinha_todos(p_variante, p_periodo)`, security definer; substituiu a `ranking_palavrinha_global`): botão "Todos os cursos" no mesmo cartão. **Uma linha por pessoa**, com a soma dos pontos de todos os cursos; embaixo do nome, o curso em que ela mais pontuou e "+ N cursos" se jogou em outros (`App.nomeCurso` conhece todos os cursos, até os que a pessoa não faz). Qualquer pessoa ativa e logada consulta; contam as partidas de cursos em que a pessoa está matriculada (e todas as do admin); mesmos pontos e períodos do ranking do curso.
- **Aviso de primeira vez:** ao abrir a Palavrinha pela primeira vez, um cartão explica o Ranking Diver e onde ele fica (botão "Ver o ranking"); some depois de lido e fica guardado na conta (`diver:v1:palavrinha-aviso-ranking`).
- Limite conhecido: como o evento sai do aparelho do aluno, quem souber mexer no navegador poderia forjar uma vitória. Para um ranking de turma isso basta; se um dia valer prêmio, a conferência passa para o servidor.

## 5b. Caso Resolvido: placar da turma
- Cada mergulho concluído (e a acusação) gera um `jogo_concluido` com `jogo: "caso"` e o `registro` do jogo: `operacao` (id do caso), `rodada` (número do caso da pessoa), `missao` (`isca`, `cardume`, `sonar`, `interrogatorio` ou `acusacao`), `treino` e `pontos_missao` (ar que sobrou + rapidez; na acusação, 50 por item e +100 pelas três).
- **`ranking_caso(p_curso, p_caso)`** (security definer): soma `pontos_missao` de **todos os casos** da pessoa, contando cada mergulho **uma vez por caso** (o maior, se o evento vier repetido) e **sem o treino**. Eventos antigos sem `rodada` contam como caso "0". Entram alunos e professores matriculados no curso e o admin; só consulta quem é do curso (ou admin). Devolve `posicao, nome (curto), pontos, missoes, sou_eu`.
- O painel lateral do jogo mostra o top 10 + você; sem login, mostra só os seus pontos.

## 5c. Sala de Descompressão: placar da sala
- Cada partida gera um `jogo_concluido` **sem curso** (`curso_id` nulo) com `detalhes.jogo` = `sala-investigacao`, `sala-palavrinha`, `sala-tiro`, `sala-batata`, `sala-pitstop` ou `sala-cardume`, `pontos`, `data` (AAAA-MM-DD do aparelho) e extras (`venceu`, `tentativas`, `visitas`, `erros`, `acertos`, `modo`...).
- **`ranking_sala(p_jogo, p_periodo)`** (security definer; `p_jogo` = `geral` ou o id sem "sala-"; `p_periodo` = `mes` ou `geral`): Investigação e palavra do dia da Palavrinha somam **o melhor de cada dia**; o treino da Palavrinha (`modo: "treino"`) soma **até 60 por dia**; Tiro ao Alvo, Pit Stop Mental (`sala-pitstop`) e Cardume (`sala-cardume`) valem **o recorde**; Batata Quente soma as vitórias **até 150 por dia** + **o recorde do Sozinho** (`modo: "sozinho"`); "geral" = soma de todos. Todo mundo junto (sem curso), qualquer pessoa ativa e logada consulta; nome curto. Devolve `posicao, nome, pontos, sou_eu`.
- Minhas Estatísticas mostra os jogos da sala com o nome "… (Sala de Descompressão)".

## 6. Retrospectiva do ano (futuro)
O log já guarda tudo o que ela precisa: dias de estudo, questões por tema e dificuldade, jogos favoritos, notas e sequências. Quando for a hora, é uma função de leitura sobre `eventos_atividade`, sem mudar o que já é gravado.

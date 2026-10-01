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
- **Estatísticas pessoais** (`Palavrinha.estatisticas`): só a palavra do dia, a 1ª partida de cada dia; partidas, % de vitórias, sequência atual (zera se pular um dia), melhor sequência e distribuição de tentativas.
- **Ranking por curso** (`ranking_palavrinha(p_curso, p_variante, p_periodo)`, security definer): só quem é do curso (ou professor dele, ou admin) consulta; entram só alunos matriculados e ativos; nome curto ("Maria S."); pontos por vitória = tentativas máximas + 1 − tentativas usadas (6/7/9 no x1/x2/x4); placar do mês ou geral.
- Limite conhecido: como o evento sai do aparelho do aluno, quem souber mexer no navegador poderia forjar uma vitória. Para um ranking de turma isso basta; se um dia valer prêmio, a conferência passa para o servidor.

## 6. Retrospectiva do ano (futuro)
O log já guarda tudo o que ela precisa: dias de estudo, questões por tema e dificuldade, jogos favoritos, notas e sequências. Quando for a hora, é uma função de leitura sobre `eventos_atividade`, sem mudar o que já é gravado.

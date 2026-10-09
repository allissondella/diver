# Cronograma de estudos (Organizar → Cronograma)

Um assistente que monta um plano de estudos até a prova. **V1, 2026-10-05.** Sem IA paga e sem internet: a conta é determinística (pesos e horas), instantânea e funciona offline.

## 1. Arquivos

| Arquivo | O que faz |
|---|---|
| `js/cronograma-gerador.js` | `CronogramaGerador`: só a conta (funções puras, testáveis no Node). Disciplinas e pesos, `gerar`, `redistribuir`, `resumo`, `titulo`. |
| `js/cronograma.js` | `Cronograma`: a aba (`#cronograma`). Assistente de 5 passos, prévia editável, painel do plano, ligação com Tarefas, Calendário, Modo Foco e o log. |
| `js/organizar.js` | Calendário e Modo Foco. Ganhou `focarBloco`, `sincronizarEventos(origem, eventos, desde)` e `removerEventos(origem)`. O gerador antigo do Calendário (D59) saiu; no lugar, um atalho para a aba. |
| `js/quadros.js` | Tarefas. Ganhou o campo `origem` (quadros e cartões) e `sincronizarOrigem`, `removerOrigem`, `estadoOrigem`, `marcarSubtarefa`. |
| `css/areas.css` | Estilos com prefixo `cr-` (seção "CRONOGRAMA"). |

## 2. O assistente (5 passos)

1. **Objetivo:** Enem, vestibular ou outra prova, o nome e a data (pelo menos 7 dias à frente).
   - **Escolher uma prova da lista (2026-10-07):** o Enem e os vestibulares das datas oficiais do Calendário (`data/calendario/datas-oficiais.json`, via `Organizar.datasOficiais()`), agrupados em Enem, públicos e privados. Só o 1º dia de cada fase, só provas (sem inscrição nem resultado) e só as que estão a pelo menos 7 dias. Escolher preenche o tipo, o nome e a data; no Enem, o 1º dia.
   - **"Vou preencher à mão"** é a primeira opção; mexer no nome ou na data volta a lista para ela.
2. **Seu tempo:** minutos em cada dia da semana (0 = descanso) e o horário em que costuma começar. Padrão: 2 h de segunda a sexta, 3 h no sábado, domingo de descanso. Sem nenhum dia de descanso, aparece uma dica gentil (não bloqueia).
3. **Suas matérias:** no Enem e no vestibular, a pessoa escolhe entre **fazer a Avaliação Diagnóstica** (recomendada, um teste só de 40 questões; `docs/AVALIACAO_DIAGNOSTICA.md`; "Continuar" sem escolher abre a avaliação) ou **marcar ela mesma** a nota de 1 a 5 em cada **disciplina** (1 = muita dificuldade, 5 = domino). As notas da avaliação entram preenchidas e continuam editáveis. Fora do Enem, a pessoa desmarca o que não cai, diz se cada matéria "cai muito / médio / pouco" e pode acrescentar matérias próprias (ex.: Direito constitucional).
4. **Prévia:** resumo (semanas, horas, simulados, redações), "Onde vai o seu tempo" e a semana a semana, editável:
   - arrastar um bloco para outro dia (computador) ou "Mover para…" (celular);
   - remover e fixar/soltar;
   - bloco movido com a mão fica fixo;
   - "Gerar de novo" mantém os fixos.
5. **Confirmar:** três opções independentes. **Nada é criado sem a pessoa marcar.**
   - adicionar às Tarefas;
   - adicionar ao Calendário;
   - só guardar (padrão).

## 3. A conta (`CronogramaGerador.gerar`)

- **Unidade de tempo:** a "vaga" de 30 min (25 de foco + 5 de pausa).
  - Blocos de **25 ou 50 min**, que casam com os presets do Modo Foco.
  - Simulado de 2 h (4 vagas) ou mini simulado de 50 min.
- **Peso da prova:**
  - **Enem:** questões por disciplina. As 4 áreas têm 45 questões cada, divididas pelo mapa tema × peso de 2019–2025 (`docs/cadernos/enem-vestibular.md`): Matemática 45, Português e Literatura 40, Língua estrangeira 5, História 15, Geografia 18, Filosofia 6, Sociologia 6, Física 13, Química 16, Biologia 16.
  - **Outras provas:** "cai muito" 30, "médio" 18, "pouco" 8.
- **Dificuldade:** a nota multiplica o peso (1 → ×1,6; 2 → ×1,35; 3 → ×1; 4 → ×0,75; 5 → ×0,55).
- **Nunca zera:** toda disciplina marcada fica com pelo menos 5% do conteúdo.
- **Distribuição:**
  - dia a dia, a disciplina mais "atrasada" (em minutos) em relação à parte dela pega o próximo bloco;
  - no máximo 2 blocos da mesma disciplina por dia, nunca duas seguidas;
  - dia com 1 h ou mais recebe blocos de 50 min.
- **Revisão espaçada:**
  - cerca de 20% do tempo vai para revisão, e 40% na reta final;
  - a revisão volta ao que foi estudado uns 7 dias antes.
- **Simulado:**
  - a cada 2 semanas, e toda semana na reta final, no dia com mais tempo;
  - no Enem, as áreas se revezam.
- **Redação:**
  - toda semana no Enem, ou se a pessoa marcou Redação;
  - duas por semana com nota 1 ou 2 e tempo de sobra.
- **Reta final:** últimos 21 dias, com mais revisão e menos conteúdo novo. A **véspera da prova é descanso**.
- **Ordem do dia:** simulado, conteúdo, redação e revisão. O horário é sugerido a partir do horário de início.
- **Temas:** cada bloco ganha um tema em rodízio, na ordem do que mais cai (ex.: "Matemática: Estatística e leitura de dados").
- **Horizonte:** no máximo **16 semanas** por vez. Faltando 3 semanas para o fim, o painel oferece "Continuar o plano", que gera o trecho seguinte continuando a revisão e o rodízio de temas.
- **Determinística:** a mesma entrada gera sempre o mesmo plano.

## 4. O plano (painel)

- **Topo:** dias até a prova e "X de Y blocos feitos".
- **Hoje:** os blocos do dia, cada um com:
  - checkbox de feito;
  - botão **Modo Foco**, que abre no tempo do bloco e, quando o foco termina, marca o bloco como feito;
  - botão "Estudar no curso", quando existe conteúdo do Diver. Ele abre o curso (conteúdo e redação), a Revisão (revisão) ou o Simulado (simulado), e só aparece se a pessoa tem acesso ao curso. Sem curso, o bloco fica genérico.
  - **Qual curso (2026-10-09):** primeiro os **cursos por matéria** que a pessoa tem (`DISCIPLINAS[].cursos` no gerador: `enem-matematica`, `enem-historia`, `enem-redacao`...). Em Português, o bloco escolhe entre Português, Literatura e Artes e Ed. Física pelo peso (35, 20, 12), sempre o mesmo para o mesmo bloco; na Língua estrangeira, a língua da Avaliação Diagnóstica (sem ela, inglês). O mapa abre **já na próxima aula não feita** (módulo aberto e foco no botão). Sem nenhum curso por matéria, vale o de antes: a fase da disciplina no "Enem e Vestibular · Comece por aqui", com o foco nela. A conta do plano não muda.
  - O texto sugere usar o Modo Foco.
- **Ficou para trás:** "A vida aconteceu, tudo bem." O botão **Redistribuir**:
  - leva os blocos não feitos do passado para as próximas vagas livres;
  - abre espaço tirando revisões espalhadas mais adiante;
  - transforma um bloco de 50 em 25 min quando só cabe meia hora;
  - não mexe nos blocos fixos nem nos feitos.
  - Nunca diz "você está atrasado".
- **Seu plano:** a semana a semana, editável como na prévia.
- **Ajustes:**
  - mostrar ou não nas Tarefas e no Calendário (liga e desliga na hora);
  - "Refazer com outras respostas": abre o assistente preenchido; os blocos feitos e os fixos ficam, e o resto é refeito de hoje em diante;
  - "Apagar cronograma": caixa do Diver, mascote triste.

## 5. Tarefas e Calendário (origem)

Tudo o que o cronograma cria leva `origem: "cronograma:<id do plano>"`.

- **Calendário:**
  - um evento `estudo` por bloco, no horário;
  - `descanso` nos dias sem estudo e na véspera;
  - `prova` no dia da prova.
- **Tarefas:**
  - um quadro próprio, "Cronograma: <nome da prova>", com a lista "Plano de estudos" ordenada por prazo;
  - **um cartão por dia** ("Estudo do dia (1h40): Matemática, Física"), com os blocos como **subtarefas**;
  - o quadro aberto da pessoa não muda.
- **Sem repetir no Calendário:** cartões de uma origem que já tem eventos não aparecem como "Prazo" ao lado dos eventos.
- **Feito nos dois sentidos:**
  - marcar o bloco na aba marca a subtarefa;
  - marcar a subtarefa, ou concluir o cartão do dia, nas Tarefas vira bloco feito ao abrir a aba.
- **Edições:** a cada edição, o que é de hoje em diante é refeito. O passado fica no Calendário como histórico, e cartões já concluídos não são recriados.
- **Apagar o cronograma** tira o plano, todos os eventos e cartões daquela origem e o quadro. Sempre sobra pelo menos um quadro nas Tarefas.

## 6. Onde fica guardado

- Chave `diver:v1:cronograma` no navegador (com try/catch, via `Dados`).
- Sincroniza com a tabela `estado` como as outras chaves `diver:v1:*`. Não precisou de tabela nova.
- Formato:
  - `{ versao, id, criadoEm, atualizadoEm, params: { objetivo, tempo, materias }, blocos: [...], fim, cobreAteAProva, integracao: { tarefas, calendario } }`;
  - cada bloco: `{ id, data, ordem, hora, tipo: conteudo|revisao|simulado|redacao, materia, tema?, area?, dur, fixo, feito, feitoEm, de? }`.
- O rascunho do assistente fica só na memória da aba até salvar.

## 7. Log de atividade

- `cronograma_criado`:
  - quando: ao salvar (também ao refazer, com `refeito: true`);
  - curso: nenhum (`null`);
  - detalhes: `objetivo`, `semanas`, `blocos`, `materias`, `tarefas`, `calendario`.
- `bloco_concluido`:
  - quando: bloco feito;
  - curso: a trilha do bloco, se houver;
  - detalhes: `materia`, `tipo`, `minutos`, `via` (`manual`, `foco` ou `tarefas`), `data`.
- Alimenta a retrospectiva do ano. Nas Minhas Estatísticas, os dois tipos contam só como "dia ativo".
- **Banco:** os dois tipos entraram na regra `eventos_atividade_tipo_check` (`supabase/setup.sql`).
- ⚠️ **Rode o SQL na produção antes de publicar o código.** Sem isso, o banco recusa o lote de eventos e a fila de envio do aluno fica parada.

## 8. Testes

- **Gerador (Node):**
  - nada na véspera nem no dia da prova;
  - descanso respeitado e nenhuma disciplina zerada;
  - nota baixa ganha mais tempo;
  - redação toda semana, simulados, reta final com mais revisão;
  - nenhum dia passa do tempo disponível;
  - no máximo 2 por dia, sem repetir em seguida;
  - determinística, com horizonte de 16 semanas e continuar;
  - outra prova com matérias livres, pouco tempo, fixos preservados, redistribuir.
- **Navegador (celular e PC):**
  - assistente completo, com validações;
  - mover, fixar e gerar de novo;
  - Tarefas e Calendário sem duplicar, sem trocar o quadro aberto;
  - checkbox ↔ subtarefa, Modo Foco marcando o bloco;
  - Redistribuir, Refazer e Apagar tudo;
  - log, sem erros na página.

## 9. Próximas versões

- **Feito (2026-10-05):** a Avaliação Diagnóstica (40 questões das 4 áreas num teste só, `docs/AVALIACAO_DIAGNOSTICA.md`).
- **V2:** forma B da avaliação e diagnóstico adaptativo (o mesmo motor da Recapitulação do Ensino Médio).
- **V3:**
  - reajuste automático pela taxa de acerto real por tema (do log);
  - widget "Hoje no seu cronograma" no Início;
  - mensagens da Nina (descanso).

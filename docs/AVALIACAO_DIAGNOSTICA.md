# Avaliação Diagnóstica (V1, 2026-10-05)

"O modo mais assertivo para você saber os seus pontos fortes e fracos." Uma prova curta, no estilo do Enem, que mede o ponto de partida por disciplina e preenche as notas do Cronograma.

## 1. Onde aparece

- **Cronograma → passo 3 "Suas matérias"**, para Enem e vestibular. Duas opções:
  - **Fazer a Avaliação Diagnóstica**, recomendada, com o aviso *"Muito importante: é o modo mais assertivo para você saber os seus pontos fortes e fracos, e ela personaliza a sua experiência e o seu plano"*;
  - **Prefiro marcar eu mesmo**, com as notas de 1 a 5 como antes.
  - A opção recomendada já vem em destaque: **"Continuar" sem escolher abre a avaliação** (gancho `aoContinuar` do passo). A lista de notas só aparece com "Prefiro marcar eu mesmo".
- Para "outra prova", o passo continua só com as notas marcadas à mão.
- Rota própria `#diagnostica` (`js/diagnostica.js`), fora da barra lateral.
- Quem já fez a avaliação vê no passo 3: *"Notas da sua Avaliação Diagnóstica aplicadas"*. As notas continuam editáveis, e a Redação é sempre marcada pela pessoa. Quem parou no meio vê "Continuar a Avaliação Diagnóstica (X de 40)".
- O "(45 questões)" saiu do lado das áreas.

## 2. A prova

| Área | Questões | Tempo sugerido | Por disciplina |
|---|---|---|---|
| Linguagens | 10 | 20 min | Português e Literatura 8 + Língua estrangeira 2 (inglês **ou** espanhol, a pessoa escolhe) |
| Humanas | 10 | 20 min | História 3, Geografia 3, Filosofia 2, Sociologia 2 |
| Natureza | 10 | 25 min | Física 3, Química 3, Biologia 4 |
| Matemática | 10 | 25 min | porcentagem, proporção, média e mediana, escala, geometria plana e espacial, probabilidade, juros |
| **Total** | **40** | **~1h30** | Sem redação, **num teste só** |

- **Conteúdo:**
  - questões **originais**, em `data/diagnostica/enem.json` (42 no arquivo: 40 + 2 de espanhol);
  - temas pelo mapa tema × peso de 2019–2025 (`docs/cadernos/enem-vestibular.md`);
  - **diferentes das da Travessia**, para o aluno não reencontrar a mesma questão no Mergulho;
  - padrão Georgia: comentário em cada alternativa e Dica de mergulhador;
  - em cada área, 3 fáceis, 4 médias e 3 difíceis;
  - gabarito espalhado de A a E; as alternativas numéricas ficam em ordem crescente, como no Enem.
- **Como se responde (2026-10-05: um teste só, a pedido do Allisson):**
  - na tela da avaliação, o enunciado e **um botão "Começar"** logo abaixo (sem cartões por área);
  - antes da 1ª questão, a pergunta da **língua estrangeira** (inglês ou espanhol);
  - as 40 questões seguidas, na ordem Linguagens, Humanas, Natureza e Matemática; a área aparece num selo ao lado de "Questão N de 40" e, ao trocar de área, um aviso curto ("Agora: Humanas");
  - "Pausar" guarda tudo; o botão vira "Continuar" e mostra quantas já foram respondidas;
  - **"Ainda não sei"** no lugar do chute;
  - o relógio é só referência (fica amarelo depois do tempo sugerido), sem eliminar;
  - nada de correção durante a prova; no fim vem **um resultado só**: acertos no total, nível por área, o mapa de pontos fortes e a melhorar, "Usar no meu cronograma", "Rever as questões" (as 40, separadas por área, com resposta certa, explicação e o comentário da alternativa marcada) e "Refazer a avaliação" (pergunta a língua de novo).
- **Por que esse tamanho:**
  - o ritmo do Enem é de cerca de 3 min por questão;
  - testes diagnósticos de referência usam de 20 a 30 questões em 45 a 90 min;
  - prova longa cansa: por isso dá para pausar a qualquer momento e continuar depois.

## 3. A conta (sem IA)

- **Peso por dificuldade:** fácil 1, médio 1,5, difícil 2. O percentual ponderado da área vira a nota da área.
- **Nota geral:** o mesmo percentual ponderado nas 40 questões.
- **Nota por disciplina:**
  - é o percentual ponderado da disciplina, **puxado para o resultado da área** como se ela tivesse 2 questões médias a mais com o percentual da área;
  - com 2 a 4 questões por disciplina, isso reduz o efeito da sorte e de um único erro.
- **Faixas:** abaixo de 20% = 1 (precisa de base); de 20% a 40% = 2 (em construção); de 40% a 60% = 3 (intermediário); de 60% a 80% = 4 (bom); 80% ou mais = 5 (forte).
- **Pontos fortes e a melhorar:** contados por tema. O tema só é forte se todas as questões dele saíram certas; os demais vão para "a melhorar".
- **No Cronograma:** as notas entram no passo "Suas matérias" sempre que há resultado novo (`Diagnostica.situacao()` devolve `{ feita, respondidas, total, atualizadoEm }`; `atualizadoEm` é a hora em que o teste terminou).
  - Ao refazer um plano existente, a avaliação só sobrescreve as notas se for mais nova que o plano.
  - "Usar no meu cronograma" (`Cronograma.abrirComDiagnostico`) volta para o passo 3, ou para o começo do assistente se ainda não houver data da prova.

## 4. Dados, pontos e log

- **Chave:** `diver:v1:diagnostica`, que sincroniza com a nuvem pela tabela `estado`.
- **Formato (versão 2):** `{ versao: 2, lingua, respostas: { <id>: índice ou -1 }, idx, segundos, concluidaEm, xp, notas: { <disciplina>: 1..5 }, atualizadoEm }`.
  - A versão 1 (uma área por vez, só existiu nos testes) é convertida ao ler: as respostas e a língua ficam.
- **Pontos:** **+100 XP e +8 pérolas** na primeira conclusão do teste (`Economia.CONFIG.diagnostica`), na Travessia se a pessoa tiver acesso, senão na trilha atual. Refazer não dá pontos de novo.
- **Log:** um `diagnostica_concluida` por teste, com `acertos`, `total`, `nao_sei`, `nota`, `segundos`, `lingua` e, por área, `acertos_<area>` e `nota_<area>` (o log só guarda valores simples).
- **Banco:** o tipo entrou na regra `eventos_atividade_tipo_check` (`supabase/setup.sql`).
  - Já aplicado no Supabase de **testes**.
  - ⚠️ Na produção, rodar **antes** do merge, junto com os tipos do Cronograma.
- **Refazer a avaliação:** apaga as respostas e a língua; as notas já levadas para o cronograma ficam lá até o teste novo terminar.

## 5. Pendências

- Validação das 42 questões: pelo especialista ou pela Fila de Validação, que hoje espera o formato de trilha; vai precisar de um adaptador.
- Segunda versão da prova (forma B), para quem refizer não ver as mesmas questões.
- Diagnóstico adaptativo, quando houver respostas de muitos alunos (`docs/RECAPITULACAO_ENSINO_MEDIO.md`).

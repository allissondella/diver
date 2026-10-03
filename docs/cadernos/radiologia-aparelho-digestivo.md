# Caderno do curso: Radiologia: Aparelho Digestivo

> Trilha: `data/trilhas/radiologia-aparelho-digestivo.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md`

## Público e objetivo
Residentes e radiologistas em formação: diagnóstico por imagem do fígado, vias biliares, pâncreas, baço, intestino, abdome agudo e pediatria, com casos clínicos e as pegadinhas das provas de título. Todas as fases começam abertas.

## Seu gosto (preferências do usuário)
- 2026-09 · Curso criado a partir das anotações do admin (aulas COR-SPR GI e Deu Laudo GI); questões originais em caso clínico.
- 2026-10-03 · **Revitalizar com a metodologia nova sem os alunos perderem o que já fizeram**: só acrescentar o artigo da fase; nunca trocar ids.
- 2026-10-03 · **Padrão Georgia** (revisão de uma radiologista, vale para todos os cursos; `professor-diver.md` seção 7): termos técnicos (hipersinal, hiperdenso, hiperecogênico, realce), Aprender completo, resto enxuto, comentário em cada alternativa, Dica de mergulhador, ~20 questões por fase e fichas por tema.

## Decisões
- 2026-10-03 · Artigo nas 9 fases (caminho Aprender → Associar → Praticar → Desafio → Revisar): seções, mapa mental e associações em todas; linha do tempo em fundamentos (fases do contraste), fígado difuso (carcinogênese), pâncreas (tempo das coleções), abdome agudo e pediatria; mapa do abdome (`tipo: "abdome"`) em abdome agudo e intestino.
- 2026-10-03 · Questões, blocos dos jogos, prova e ids ficaram idênticos: o progresso (`diver:v1:trilha:radiologia-aparelho-digestivo`) e a revisão espaçada continuam valendo.
- 2026-10-03 · **v2 (padrão Georgia):** Aprender de 550 a 890 palavras por fase; pontos (6) e pérolas (3) enxutos; nenhum conceito em mais de 3 blocos (Crohn e retocolite podem ir a 4: `reforcar`). As 230 questões foram reescritas com os mesmos ids (comentários, Dica, termos técnicos, temas agrupados em 3 a 7 por fase) e o Baço ganhou 2 (torção de baço acessório, infarto esplênico). 42 fichas da "Revisar a fundo".
- 2026-10-03 · Questões que repetiam outra fase ganharam outro assunto no mesmo id (fb-19 tumor miofibroblástico inflamatório, fb-25 pseudowashout do hemangioma, fm-14 PDFF, vb-19 Mirizzi).
- 2026-10-03 · Fases com mais de 20 questões (até 30 na pediatria) ficaram como estão: cada questão cobre um ponto diferente da aula.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-09 | Anotações COR-SPR GI 04–19 e Deu Laudo GI 02–05 | Quatro leituras resolvem quase tudo: sem contraste, fases do contraste, sinal na RM e contexto clínico. |
| 2026-10-03 | Mesmas anotações (pâncreas, baço, abdome agudo, intestino, pediatria) | O que mais cai: Atlanta e o corte das 4 semanas, ressecabilidade em graus, as três lesões císticas pela idade, Fukuoka; baço igual ao baço em tudo; as quatro perguntas da obstrução; reto na RM (T3, fáscia a 1 mm, EMVI); na pediatria, idade e tipo de vômito guiam tudo. |
| 2026-10-03 | Revisão da Georgia (radiologista) | O aluno grava melhor com o termo técnico certo e um comentário curto por alternativa do que com metáfora leiga. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|
| (vazio: o curso ainda não passou pela fila) | | | |

## Já feito
- 9 fases, 230 questões, 68 pares, 42 V/F, 16 adivinhas, 16 sequências, 74 palavras e prova de 60 questões.
- 2026-10-03 · Artigo da fase em todas as fases.
- 2026-10-03 · v2 pelo padrão Georgia: 232 questões, todas com comentários e Dica; 42 fichas; cartas dos jogos sem termos leigos; `conferir-trilha.mjs` sem erro e sem aviso.

## Próximos passos e pendências
- Revisão por radiologista.
- Mandar para a Fila de Validação (12 lotes de até 20 questões), com prioridade para os ids reescritos com outro assunto.
- Variantes para a Revisão.

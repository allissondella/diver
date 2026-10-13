# Caderno do curso: Enem · Inglês

> Trilha: `data/trilhas/enem-ingles.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md` · Parecer das fontes: `docs/validacoes/enem-linguagens-onda9-2026-10-13.md`

## Público e objetivo
Quem escolhe Inglês como língua estrangeira no Enem (5 questões no 1º dia) e nos vestibulares. O curso cobre H5–H8 da Matriz do Inep em 10 aulas e 2 módulos de 5: estratégias de leitura (skimming e scanning, cognatos e falsos cognatos, referência e conectivos, gêneros) e intenção, cultura e uso da língua (ironia e expressões idiomáticas, o inglês no mundo, identidade e direitos, vida digital). Cada módulo termina com uma aula de revisão. `fasesLivres: true`. Na sala "Mergulho no Enem e Vestibular", fica na área Linguagens.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-13 · "Manda bala em tudo, só para quando terminar".

## Decisões
- 2026-10-13 · Como no Enem, enunciados e alternativas em português e textos curtos em inglês; todos os textos em inglês foram escritos por nós (cartazes, manchetes, posts, trechos de campanha), nenhum de terceiro, nem letra de música.
- 2026-10-13 · O Aprender ensina estratégia antes de gramática: pergunta primeiro, skimming e scanning, palavras de cautela (may, could, suggest), conectivos e referência; gramática só a que aparece na leitura (modais, tempos, comparativos).
- 2026-10-13 · Pegadinhas ensinadas: falsos cognatos (actually, pretend, library, college, parents, push, prejudice), extrapolação, "could" lido como fato, correlação lida como causa, ironia lida como elogio, expressões idiomáticas traduzidas ao pé da letra, usos só brasileiros (outdoor, shopping, home office, smoking).
- 2026-10-13 · Palavrinha com palavras em inglês de 4 a 8 letras (o jogo do curso não confere no dicionário brasileiro).
- 2026-10-13 · Itens com `revisar`: proporção de falantes não nativos, Home Office britânico, Brasil como maior produtor de café, estimativas da OMS e de uso de água, definição de refugiado, Rosa Parks (1955), "I Have a Dream" (1963), Civil Rights Act (1964).

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-13 | Matriz de Referência do Enem · Inep | Em língua estrangeira, o Enem cobra leitura (H5–H8): reconhecer o tema, a finalidade, a relação entre recursos e sentido e a importância da língua no mundo, não gramática isolada. |
| 2026-10-13 | Caderno Marista de Linguagens (observações sobre língua estrangeira) | Gêneros variados (notícia, propaganda, charge, poema, canção), perguntas em português e foco na interpretação, não na tradução palavra por palavra. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Atribuir a uma instituição real (ONU, OMS) um número que não foi conferido é arriscado: nos textos inventados, usar "a recent report says" sem número, ou marcar `revisar`.
- Expressão idiomática do teatro brasileiro com palavrão não entra na Dica; dizer só o sentido.
- Palavrinha: conferir palavras repetidas entre aulas (o verificador não avisa).

## Já feito
- 2026-10-13 · Curso completo: 10 aulas em 2 módulos, 200 questões, 200 variantes, 26 fichas, blocos para todos os jogos (40 pares, 30 V/F, 10 adivinhas, 10 sequências, 40 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos. Autocheck de originalidade: nenhuma sequência de 8 palavras igual às provas de 2019–2025 (dia 1) ou ao Caderno Marista de Linguagens.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 7,44 cada bloco, US$ 14,88 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Inglês, começando pelos itens marcados `revisar`.
- Parecer de validação 2026-10-13: Aprovada com ressalvas (`docs/validacoes/enem-linguagens-onda9-2026-10-13.md`).

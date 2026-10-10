# Caderno do curso: Enem · Matemática

> Trilha: `data/trilhas/enem-matematica.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md`, seção 4 · Parecer das fontes: `docs/validacoes/enem-matematica-2026-10-09.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares, do ensino médio ao cursinho, partindo das operações básicas até o nível de prova. O curso cobre as 30 habilidades da Matriz do Inep em 75 aulas e 12 módulos, com `fasesLivres: true`: o aluno escolhe por onde começar.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-09 · Seguir sem parar até publicar em produção; nenhuma IA paga sem aprovação na tela.

## Decisões
- 2026-10-09 · Curso 100% autoral nesta versão, sem questões literais do Enem: a fonte de itens disponível era uma compilação de terceiro (parecer, achado 4); literal só entra a partir do PDF oficial do Inep, da Fase 2 de cada matéria em diante.
- 2026-10-09 · 20 questões por aula: 7 fáceis, 8 médias e 5 difíceis, para a 1ª rodada do Mergulho ter rampa completa.
- 2026-10-09 · Uma variante por questão (1.506), com outra situação e outros números; elas só aparecem na Revisão depois do Mergulho Triplo.
- 2026-10-09 · Contas de cada questão conferidas por expressão (`! confere:` no formato compacto), rodadas pelo `scripts/montar-aulas.mjs` antes de gravar o JSON.
- 2026-10-09 · π ≈ 3 na maioria das contas de geometria (como a prova costuma fazer) e π ≈ 3,14 quando o enunciado pede.
- 2026-10-09 · A aula de estratégia de prova traz o formato do 2º dia (90 questões, cerca de 5 horas) e a ideia da TRI sem números de pontuação, que mudam a cada edição.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-09 | Matriz de Referência do Enem · Inep | As 30 habilidades se agrupam em 7 competências; gráficos, estatística e proporção são o miolo da prova, e cada aula do curso declara as habilidades que treina. |
| 2026-10-09 | Caderno Marista para o Enem: Matemática · União Marista do Brasil | Organizar o treino por habilidade ajuda o aluno a reconhecer o tipo de situação; o material é antigo no formato da prova (ver parecer), então só a abordagem foi aproveitada. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Distrator igual a outro ou que também está certo: conferir com `! confere:` também as alternativas próximas (ex.: ponto que pertence à reta).
- Alternativa correta muito mais longa que as outras entrega a resposta: equilibrar o tamanho dos distratores.
- Variante igual à original só com sinônimos é recusada: trocar situação e números.
- Termo de `reforcar` em mais de 3 blocos do resumo: usar outra palavra nas associações e pérolas.

## Já feito
- 2026-10-09 · Curso completo: 75 aulas em 12 módulos (números, proporção, medidas, porcentagem e finanças, estatística, contagem e probabilidade, geometria plana, áreas e trigonometria, geometria espacial, funções, álgebra e sequências, trigonometria e geometria analítica), 1.506 questões, 1.506 variantes, 190 fichas, blocos para todos os jogos (300 pares, 223 V/F, 75 adivinhas, 75 sequências, 297 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 56 cada bloco, US$ 112 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Matemática (o curso ainda não tem especialista).
- Fase 2 (opcional): questões literais do Enem a partir dos PDFs oficiais do Inep, difíceis e até 30% por aula.

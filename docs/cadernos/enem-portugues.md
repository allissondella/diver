# Caderno do curso: Enem · Português

> Trilha: `data/trilhas/enem-portugues.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md`, seção 5 · Parecer das fontes: `docs/validacoes/enem-linguagens-2026-10-10.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares, do ensino médio ao cursinho. O curso cobre a parte de Língua Portuguesa da Matriz do Inep (leitura, gêneros, funções da linguagem, variação, gramática a serviço do sentido, argumentação e mídia) em 35 aulas e 6 módulos, com `fasesLivres: true`.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-10 · Publicar Português e Literatura juntos, só com os dois cursos completos.

## Decisões
- 2026-10-10 · Curso 100% autoral nesta versão: textos de apoio (notícias, anúncios, crônicas, posts, tirinhas descritas) escritos por nós; nenhum item literal do Enem (só do PDF do Inep, numa fase 2).
- 2026-10-10 · Gramática sempre a serviço do texto: a pergunta é o efeito de sentido (coesão, pontuação, regência, concordância), nunca a regra decorada sem contexto.
- 2026-10-10 · Variação linguística sem preconceito: a norma-padrão é uma variedade de prestígio adequada a certas situações, não "o português certo".
- 2026-10-10 · 20 questões por aula (7 fáceis, 8 médias e 5 difíceis) e uma variante por questão, com outro texto de apoio.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-10 | Matriz de Referência do Enem · Inep | Em Português, as habilidades H18–H27 pedem leitura de efeito de sentido; as de tecnologia (H28–H30) e de comunicação (H1–H4) entram pelos gêneros digitais. |
| 2026-10-10 | Caderno Marista para o Enem: Linguagens · União Marista do Brasil | A prova privilegia a interpretação, com a gramática servindo ao sentido; variação, funções e figuras de linguagem, gêneros e conectivos são os conteúdos que mais se repetem. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Alternativas que só diferem por acento (à/a, têm/tem) contam como repetidas: trocar o distrator por outro erro típico.
- Em questão de norma, conferir se o distrator "errado" não está, na verdade, certo também (ex.: concordância com "exige-se").
- Variante com o mesmo enunciado da original é recusada: trocar o texto de apoio e a situação.

## Já feito
- 2026-10-10 · Curso completo: 35 aulas em 6 módulos (leitura e gêneros; funções da linguagem; variação e norma; gramática a serviço do texto; argumentação; mídia e gêneros digitais), 700 questões, 700 variantes, 93 fichas, blocos para todos os jogos (140 pares, 105 V/F, 35 adivinhas, 35 sequências, 140 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 26 cada bloco, US$ 52 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Português (o curso ainda não tem especialista).
- Fase 2 (opcional): itens literais do Enem a partir dos PDFs oficiais do Inep, com a triagem de conteúdo de terceiro.

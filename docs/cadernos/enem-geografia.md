# Caderno do curso: Enem · Geografia

> Trilha: `data/trilhas/enem-geografia.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md` · Parecer das fontes: `docs/validacoes/enem-humanas-2026-10-10.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares. O curso cobre a parte de Geografia da Matriz do Inep em Ciências Humanas (H6–H10, H16–H20 e H26–H30) em 30 aulas e 6 módulos de 5 aulas: cartografia, escala e leitura de mapas; relevo, solos e clima; biomas, água e recursos naturais; questões ambientais e sustentabilidade; população, cidades e urbanização; campo, indústria, energia e globalização. Cada módulo termina com uma aula de revisão. `fasesLivres: true`.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-10 · Cada onda vai para a produção quando termina.

## Decisões
- 2026-10-10 · Curso 100% autoral nesta versão, sem itens literais do Enem.
- 2026-10-10 · Contas de Geografia sempre com `! confere:` (escala, fusos, densidade, taxas de urbanização, saldo migratório, razão de dependência, produtividade, Reserva Legal, potência e energia).
- 2026-10-10 · Geografia sempre com casos brasileiros: arco do desmatamento, Matopiba, Mariana e Brumadinho, Yanomami, região serrana do Rio (2011), Operação Acolhida, Zona Franca de Manaus, pré-sal, Arco Norte.
- 2026-10-10 · Questão de espaço urbano e de ambiente sempre com a pergunta "quem causa, quem sofre e quem decide": desigualdade, segregação e injustiça climática aparecem junto do fenômeno físico.
- 2026-10-10 · 129 questões (e as variantes ligadas a elas) com `revisar`: datas, leis, números de censos e de desmatamento, classificações do IBGE e dados de energia, para o especialista conferir.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-10 | Matriz de Referência do Enem · Inep | Geografia aparece em situação-problema: leitura de mapas e gráficos, relação sociedade–natureza, ocupação do espaço, desigualdades e impactos ambientais. |
| 2026-10-10 | Caderno Marista para o Enem: Ciências Humanas · União Marista do Brasil | As questões juntam o fenômeno natural e a ação humana; cartografia e escala são a porta de entrada; o Enem cobra mais leitura e interpretação do que nomes decorados. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Contar as questões de cada aula antes de montar: 7 fáceis, 8 médias e 5 difíceis; várias aulas saíram com 17 a 19 na primeira escrita.
- Termo de `reforcar` só no Aprender, num bloco do Associar (mapa ou associações, não os dois) e nos pontos; o nome do ramo do mapa conta como mapa.
- Item do mapa mental precisa repetir palavras do Aprender ("crise hídrica" e "pirâmide etária" foram recusados até o Aprender usar as mesmas palavras).
- Palavrinha só com palavras de 4 a 8 letras, sem repetir no curso, e a dica não pode conter a palavra nem um pedaço dela ("europeia" entrega "Euro").
- Frase genérica de 8 palavras igual a uma prova antiga também conta no autocheck de originalidade: reescrever.

## Já feito
- 2026-10-10 · Curso completo: 30 aulas em 6 módulos, 600 questões, 600 variantes, 79 fichas, blocos para todos os jogos (120 pares, 90 V/F, 30 adivinhas, 30 sequências, 120 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos. Autocheck de originalidade: 0 trechos de 8 palavras iguais às provas de 2019–2025 e ao Caderno Marista de Humanas.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 22 cada bloco, US$ 45 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Geografia, começando pelos 129 itens marcados `revisar`.
- Parecer de validação 2026-10-10: Aprovada com ressalvas (`docs/validacoes/enem-humanas-2026-10-10.md`).

# Caderno do curso: Enem · Física

> Trilha: `data/trilhas/enem-fisica.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md` · Parecer das fontes: `docs/validacoes/enem-natureza-2026-10-10.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares. O curso cobre a parte de Física da Matriz do Inep em Ciências da Natureza (H1, H5–H7, H17 e H20–H23) em 22 aulas e 4 módulos: movimento e forças; energia, fluidos e gravitação; calor e ondas; óptica, eletricidade e magnetismo. Cada módulo termina com uma aula de revisão. `fasesLivres: true`.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-10 · Cada onda vai para a produção quando termina.

## Decisões
- 2026-10-11 · Curso 100% autoral nesta versão, sem itens literais do Enem.
- 2026-10-11 · Física do cotidiano brasileiro: conta de luz, chuveiro elétrico, tomada de 127 V e 220 V, usinas hidrelétricas e eólicas, freio de ônibus, piscina e mergulho, micro-ondas e celular.
- 2026-10-11 · Toda conta com `! confere:` (unidades no SI, g = 10 m/s², números que dão resultado exato); questões de leitura de gráfico e de situação-problema mais do que fórmula solta.
- 2026-10-11 · Energia como fio condutor: as aulas de usinas, calor, circuitos e indução sempre perguntam "de onde vem, para onde vai e quanto se perde".
- 2026-10-11 · 8 questões (e as variantes ligadas a elas) com `revisar`: matriz elétrica brasileira, órbita de Marte, órbita geoestacionária, gravidade e período da Estação Espacial, faixa audível, limite de ruído ocupacional e orientação magnética de aves.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-11 | Matriz de Referência do Enem · Inep | Física aparece em situação-problema de tecnologia e energia: avaliar riscos, comparar eficiências e ler gráficos e tabelas, mais do que aplicar fórmula decorada. |
| 2026-10-11 | Caderno Marista para o Enem: Ciências da Natureza · União Marista do Brasil | Eletricidade (consumo, potência e circuitos domésticos), energia e ondas estão entre os temas mais cobrados; mecânica entra com contexto de trânsito e esporte. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Comentário de alternativa errada nunca pode ser só "Não." ou "Errou.": diga a conta certa ou o conceito trocado. O verificador agora acusa isso (2026-10-11).
- Termo de `reforcar` não pode aparecer nas pérolas: "trabalho" e "atrito" estouraram os três blocos.
- Palavrinha: 4 a 8 letras e única no curso ("Estilingue" passou do limite, "Ímã" e "Eco" ficaram curtas, "Joule" repetiu).
- Conta com resultado decimal precisa de `Math.abs(...)<1e-15` ou `Math.round` no `! confere:`.

## Já feito
- 2026-10-11 · Curso completo: 22 aulas em 4 módulos, 440 questões, 440 variantes, 58 fichas, blocos para todos os jogos (88 pares, 66 V/F, 22 adivinhas, 22 sequências, 88 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos. Autocheck de originalidade: nenhum trecho igual às provas de 2019–2025 nem ao Caderno Marista de Natureza.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 16 cada bloco, US$ 33 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Física, começando pelos 8 itens marcados `revisar`.
- Parecer de validação 2026-10-10: Aprovada com ressalvas (`docs/validacoes/enem-natureza-2026-10-10.md`).

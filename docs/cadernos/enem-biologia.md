# Caderno do curso: Enem · Biologia

> Trilha: `data/trilhas/enem-biologia.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md`, seção 5 · Parecer das fontes: `docs/validacoes/enem-natureza-2026-10-10.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares. O curso cobre a parte de Biologia da Matriz do Inep (H8–H16 e H28–H30) em 27 aulas e 5 módulos: célula, metabolismo e energia; genética e biotecnologia; evolução e diversidade; corpo humano e saúde; ecologia e ambiente. `fasesLivres: true`.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-10 · Cada onda vai para a produção quando termina.

## Decisões
- 2026-10-10 · Curso 100% autoral nesta versão, sem itens literais do Enem.
- 2026-10-10 · Saúde pública com o olhar do SUS e do saneamento: cada doença ensinada com agente, caminho de transmissão e medida que quebra o ciclo.
- 2026-10-10 · Biotecnologia sempre com vantagens e riscos lado a lado (transgênicos, CRISPR, clonagem) e com a resposta científica a boatos (vacina de RNA não altera o DNA).
- 2026-10-10 · Ecologia com casos brasileiros: mercúrio do garimpo na Amazônia, rios voadores, Mariana e Brumadinho, biomas e Unidades de Conservação.
- 2026-10-10 · Contas conferidas pelo construtor (`! confere:`) em genética, energia nas cadeias, IMC e crescimento de bactérias.
- 2026-10-10 · 79 itens com `revisar` (datas, dados de saúde pública, classificações e exemplos específicos) para o especialista conferir.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-10 | Matriz de Referência do Enem · Inep | As habilidades de Biologia pedem situação-problema: interpretar experimentos, avaliar propostas de saúde e ambiente e relacionar adaptação ao ambiente brasileiro. |
| 2026-10-10 | Caderno Marista para o Enem: Ciências da Natureza · União Marista do Brasil | Ecologia e impactos ambientais lideram, seguidos de genética e biotecnologia e de fisiologia e saúde; o peso dos módulos segue também o mapa 2019–2025. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Alternativas que só mudam maiúscula e minúscula (AA e aa, Ll e ll) contam como repetidas: escrever o genótipo por extenso ("heterozigota", "homozigota recessiva").
- Contas com 0,1 elevado a potência falham por arredondamento: escrever a divisão inteira (20000/1000).
- No `! confere:`, usar `Math.abs` (JavaScript), não `abs`.
- Contar as questões por dificuldade antes de montar (script de conferência no rascunho): a meta é 7 fáceis, 8 médias e 5 difíceis.

## Já feito
- 2026-10-10 · Curso completo: 27 aulas em 5 módulos, 540 questões, 540 variantes, 71 fichas, blocos para todos os jogos (108 pares, 81 V/F, 27 adivinhas, 27 sequências, 108 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 20 cada bloco, US$ 40 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Biologia, começando pelos 79 itens marcados `revisar`.
- Parecer de validação 2026-10-10: Aprovada com ressalvas (`docs/validacoes/enem-natureza-2026-10-10.md`).

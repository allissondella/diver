# Caderno do curso: Enem · História

> Trilha: `data/trilhas/enem-historia.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md` · Parecer das fontes: `docs/validacoes/enem-humanas-2026-10-10.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares. O curso cobre a parte de História da Matriz do Inep em Ciências Humanas (H1–H5, H11–H15, H16–H18 e H21–H25) em 25 aulas e 5 módulos de 5 aulas: fontes, tempo e o mundo antigo e medieval; Brasil Colônia; mundo moderno (revoluções, independências e capitalismo); Brasil Império e Primeira República; século XX (guerras, Vargas, ditadura e democracia). Cada módulo termina com uma aula de revisão. `fasesLivres: true`.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-10 · Cada onda vai para a produção quando termina.

## Decisões
- 2026-10-10 · Curso 100% autoral nesta versão, sem itens literais do Enem.
- 2026-10-10 · História do Brasil com protagonismo de quem costuma ficar de fora: indígenas (alianças e resistência), africanos e afro-brasileiros (quilombos, Malês, fugas em massa, Luiz Gama, jangadeiros do Ceará), mulheres (Olympe de Gouges, voto de 1932) e trabalhadores (ludismo, greves de 1917 e do ABC).
- 2026-10-10 · Toda questão de contexto pergunta "quem mandava, quem trabalhava e quem ficava de fora"; independência, República e abolição tratadas como mudanças conduzidas pelas elites, sem apagar a pressão de baixo.
- 2026-10-10 · Memória como tema: monumentos, bandeirantes, Tiradentes, 13 de maio e 20 de novembro, Comissão Nacional da Verdade.
- 2026-10-10 · Contas de datas e porcentagens com `! confere:` (séculos, antes e depois de Cristo, durações, proporções de população e de votantes).
- 2026-10-10 · 89 questões (e as variantes ligadas a elas) com `revisar`: datas, números de populações e vítimas, leis e atribuições de frases, para o especialista conferir.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-10 | Matriz de Referência do Enem · Inep | História aparece em situação-problema: leitura crítica de fontes (texto, imagem, canção), relação entre passado e presente, cidadania, trabalho e diversidade cultural. |
| 2026-10-10 | Caderno Marista para o Enem: Ciências Humanas · União Marista do Brasil | O Enem prefere processos a datas soltas e cobra Brasil e mundo conectados; escravidão, cidadania e ditaduras estão entre os temas mais recorrentes. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- O centro do mapa mental conta como mapa: um termo de `reforcar` no centro e nas associações estoura o limite de três blocos.
- Ponto-chave precisa repetir palavras do Aprender ("queda do Muro" só passou quando o Aprender usou "queda").
- Nome próprio de documento histórico com oito palavras ou mais (como a Declaração dos Direitos do Homem e do Cidadão) aparece no autocheck de originalidade; é título, não trecho copiado.
- Data de idade exige cuidado: "nasceu em 1825 e o pai abdicou em 1831" não dá 6 anos exatos; preferir contas de duração entre datas.

## Já feito
- 2026-10-10 · Curso completo: 25 aulas em 5 módulos, 500 questões, 500 variantes, 65 fichas, blocos para todos os jogos (100 pares, 75 V/F, 25 adivinhas, 25 sequências, 100 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos. Autocheck de originalidade: nenhum trecho igual às provas de 2019–2025 nem ao Caderno Marista de Humanas, fora o título de um documento histórico.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 19 cada bloco, US$ 37 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de História, começando pelos 89 itens marcados `revisar`.
- Parecer de validação 2026-10-10: Aprovada com ressalvas (`docs/validacoes/enem-humanas-2026-10-10.md`).

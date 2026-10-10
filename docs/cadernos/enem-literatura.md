# Caderno do curso: Enem · Literatura

> Trilha: `data/trilhas/enem-literatura.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md`, seção 5 · Parecer das fontes: `docs/validacoes/enem-linguagens-2026-10-10.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares. O curso cobre as habilidades H15–H17 da Matriz do Inep (texto literário, contexto histórico e patrimônio) em 20 aulas e 4 módulos: o texto literário; das origens ao Romantismo; Realismo, Naturalismo, Parnasianismo e Simbolismo; Modernismo e literatura contemporânea. `fasesLivres: true`.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-10 · Publicar Português e Literatura juntos, só com os dois cursos completos.

## Decisões
- 2026-10-10 · Citação literal só de autores em domínio público, curta e conferida (Gregório de Matos, Gonzaga, Gonçalves Dias, Álvares de Azevedo, Castro Alves, Machado, Bilac, Cruz e Sousa, Alphonsus de Guimaraens, Augusto dos Anjos, Euclides da Cunha, Mário de Andrade, Oswald de Andrade e Graciliano Ramos). Autores protegidos (Bandeira, Drummond, Cecília, Vinicius, Clarice, Rosa, João Cabral, Carolina, Conceição Evaristo e outros) só aparecem por título, tema e paráfrase nossa.
- 2026-10-10 · Trechos "ao modo de" uma estética são sempre autorais e marcados como tais no enunciado ("Trecho autoral", "Versos autorais").
- 2026-10-10 · Leitura crítica sem anacronismo: determinismo racial (Naturalismo, Euclides) e idealização do indígena (Romantismo) aparecem como ideias da época, hoje rejeitadas.
- 2026-10-10 · O módulo 4 termina com vozes contemporâneas (Carolina Maria de Jesus, Conceição Evaristo, autores indígenas e periféricos), que o Enem vem cobrando.
- 2026-10-10 · 72 itens com `revisar` (datas de publicação, autoria, citações e detalhes de enredo) para o especialista conferir.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-10 | Matriz de Referência do Enem · Inep | Em Literatura a prova pede o texto em relação ao contexto e ao patrimônio, não lista de características decorada: cada questão do curso parte de um trecho ou de uma situação de leitura. |
| 2026-10-10 | Caderno Marista para o Enem: Linguagens · União Marista do Brasil | O Modernismo e a literatura do século XX são o bloco que mais aparece; as escolas anteriores entram sobretudo por comparação. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Resposta certa muito mais longa que as outras entrega o gabarito: em Literatura isso acontece com explicações dentro da alternativa; encurtar e deixar a explicação no comentário.
- Termo de `reforcar` (ex.: transcendência) precisa aparecer também no mapa mental ou nas associações, além do Aprender e dos pontos.
- Palavra da Palavrinha não pode estar na própria dica (ex.: "Os sapos" não serve de dica para "Sapos").

## Já feito
- 2026-10-10 · Curso completo: 20 aulas em 4 módulos, 400 questões, 400 variantes, 52 fichas, blocos para todos os jogos (80 pares, 60 V/F, 20 adivinhas, 20 sequências, 80 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 15 cada bloco, US$ 30 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Literatura, começando pelos 72 itens marcados `revisar`.
- Fase 2 (opcional): itens literais do Enem a partir dos PDFs oficiais do Inep, com a triagem de conteúdo de terceiro (poemas e canções protegidos ficam de fora).

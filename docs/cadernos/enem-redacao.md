# Caderno do curso: Enem · Redação

> Trilha: `data/trilhas/enem-redacao.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md` · Parecer das fontes: `docs/validacoes/enem-redacao-2026-10-11.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares. O curso ensina a redação pelas cinco competências do Inep em 40 oficinas e 6 módulos: a prova e as competências; Competência I (norma-padrão); Competência II (tema, tipo de texto e repertório); Competência III (projeto de texto e argumentação); Competência IV (coesão e conectivos); Competência V (proposta de intervenção e temas). Cada módulo termina com uma oficina de revisão. As oficinas ensinam por questões e blocos; a correção de texto escrito pelo aluno continua em aberto (`docs/CONTEUDO_CURSINHO.md`, seção 5).

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-09 · Não usar como base os arquivos de origem duvidosa do Drive (livros WeLib).
- 2026-10-12 · Uma entrega de cada vez: a Redação termina e vai para a produção antes da Onda 9.

## Decisões
- 2026-10-11 · Rótulo "Oficina" no lugar de "Aula"; 40 oficinas (7, 7, 7, 7, 6, 6).
- 2026-10-11 · Curso 100% autoral: trechos de redação analisados nas questões foram escritos por nós; nada de redação nota mil copiada, nem trecho da cartilha.
- 2026-10-11 · Regras da prova pela cartilha do Inep de 2026 e pelas páginas oficiais (parecer de 2026-10-11).
- 2026-10-12 · O módulo da Competência V ganhou "Propostas por eixo temático" (agentes de cada eixo, proposta presa ao recorte, viabilidade e autoria) e a revisão do módulo; "A conclusão completa" chegou a 20 questões.
- 2026-10-12 · Temas de anos anteriores (2021 a 2024), nomes de ministérios, leis citadas e a correspondência entre número de elementos e nível da C5 levam `revisar` (149 questões e variantes ligadas a elas).

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-11 | A Redação do Enem 2026: cartilha do participante · Inep | A nota sai das cinco competências, com níveis de 0 a 200; a proposta de intervenção pede agente, ação, meio, finalidade e detalhamento, e o desrespeito aos direitos humanos zera só a C5. |
| 2026-10-11 | Matriz de Referência da Redação · Inep | As competências são independentes: um texto pode ir muito bem na norma e mal na proposta; por isso cada módulo treina uma competência e a revisão mistura. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Alternativa certa que é uma proposta completa fica longa: escreva as erradas também como propostas inteiras (com o defeito delas), não como frases curtas.
- Item do mapa mental precisa usar palavras do Aprender ("proposta ausente" não estava no texto; "conclusão sem proposta", sim).
- O tema da tabela também conta como bloco na regra de repetição.

## Já feito
- 2026-10-12 · Curso completo: 40 oficinas em 6 módulos, 800 questões, 800 variantes, 120 fichas, blocos para todos os jogos (162 pares, 122 V/F, 40 adivinhas, 40 sequências, 120 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 30 cada bloco, US$ 60 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Redação, começando pelos itens marcados `revisar` (temas e datas).
- Correção de redação escrita pelo aluno (seção 5 do `docs/CONTEUDO_CURSINHO.md`): continua em aberto.
- Parecer de validação 2026-10-11: Aprovada com ressalvas (`docs/validacoes/enem-redacao-2026-10-11.md`).

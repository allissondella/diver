# Caderno do curso: Radiologia: Cabeça e Pescoço

> Trilha: `data/trilhas/radiologia-cabeca-pescoco.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Fontes: `docs/FONTES_CATALOGADAS.md` · Parecer: `docs/validacoes/radiologia-cabeca-pescoco-2026-10-12.md`

## Público e objetivo
Residentes e radiologistas em formação (provas de título e laudo do dia a dia), no mesmo padrão dos cursos Digestivo e Musculoesquelético: casos clínicos, diagnóstico diferencial e pegadinhas. Todas as fases começam abertas (`fasesLivres: true`).

## Seu gosto (preferências do usuário)
- 2026-10-12 · Curso pedido "com o nosso nível impecável, igual aos outros de Radiologia", direto para a produção, usando as skills de professor (`validar-fontes` e `criar-trilha`).
- 2026-10-12 · **Especialista do curso: a professora Georgia (radiologista)**, que também é a autora das anotações usadas como referência.

## Decisões
- 2026-10-12 · 12 fases, uma por aula, na ordem do material: base do crânio, órbitas, ossos temporais, seios da face, espaços cervicais, rinofaringe e cavidade oral, laringe, glândulas salivares, linfonodos, lesões congênitas, ATM e tireoide. Profundidade de "0–10 m" a "110–120 m".
- 2026-10-12 · Padrão Georgia desde a v1: 20 questões por fase (6 fáceis, 8 médias, 6 difíceis), comentário em todas as alternativas e Dica de mergulhador; prova de 50 questões, 75 minutos, 70% para passar.
- 2026-10-12 · Sem variantes por enquanto (como os outros cursos de Radiologia).
- 2026-10-12 · Escrito no formato compacto `.aula` (fora do repositório) e montado por `node scripts/montar-radiologia.mjs <arquivos.aula> --curso <trilha.json>`, que reaproveita o construtor do Enem sem módulos nem numeração de aulas.
- 2026-10-12 · Onde as anotações erravam ou se contradiziam, o curso ensina a versão correta e evita números duvidosos (achados do parecer).

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-12 | Anotações COR-SPR CEP 01–04 | Cabeça e pescoço se aprende por forames e por espaços: o laudo diz por onde a doença passa (nervo, forame, fissura) e o cirurgião decide a via. |
| 2026-10-12 | Anotações COR-SPR CEP 05–09 | O raciocínio por espaço cervical (o que desloca a gordura parafaríngea e para onde) resolve a maior parte dos diferenciais; no linfonodo, necrose e extensão extranodal pesam mais que o tamanho. |
| 2026-10-12 | Anotações COR-SPR CEP 10–12 | Lesão congênita se reconhece pelo trajeto embriológico; na tireoide, o ultrassom e o TI-RADS decidem a punção. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|
| 2026-10-12 | Autocheck do verificador | Alternativa certa muito mais longa que as erradas | Escrever as erradas no mesmo tamanho desde o começo. |

## Cuidados com as anotações (achados do professor)
- Keros 2 é de 4 a 7 mm; a asa menor forma o teto da órbita, não a parede lateral; T4a da laringe é atravessar a cortical externa da tireoide ou sair da laringe; classificação de Sennaroglu (grafia). Limiares de ADC e percentuais que se contradizem não foram usados.

## Já feito
- 2026-10-12 · v1 completa: 240 questões (72 fáceis, 96 médias, 72 difíceis), todas com `comentarios` e Dica; 34 fichas da "Revisar a fundo"; Aprender de 376 a 608 palavras por fase; mapa mental, associações, tabela, pontos e pérolas em todas; 60 pares, 48 V/F, 12 adivinhas, 12 sequências e 48 palavras (46 para a Palavrinha). `conferir-trilha.mjs` sem erro nem aviso.
- Originalidade: as coincidências de 8+ palavras com as anotações foram reescritas; restaram 8, todas listas anatômicas (forames, limites) ou sinais-padrão.

## Próximos passos e pendências
- Parecer de validação 2026-10-12: Aprovada com ressalvas (`docs/validacoes/radiologia-cabeca-pescoco-2026-10-12.md`).
- 2026-10-12 · **Revisão humana da Georgia feita e aprovada**: as 15 marcas `revisar` foram retiradas.
- Fila de Validação (12 lotes de 20 questões), quando o admin aprovar.
- Fases futuras: trauma de face, pescoço pós-tratamento (NI-RADS), paratireoides.

# Caderno do curso: Enem · Química

> Trilha: `data/trilhas/enem-quimica.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Plano: `docs/cadernos/enem-mapa-curricular.md`, seção 5 · Parecer das fontes: `docs/validacoes/enem-natureza-2026-10-10.md`

## Público e objetivo
Quem vai fazer o Enem e os vestibulares. O curso cobre a parte de Química da Matriz do Inep (H17 e H24–H27, com H8–H12 e H30 nos temas de ambiente e saúde) em 27 aulas e 5 módulos: matéria, átomos e tabela periódica; ligações, substâncias e funções inorgânicas; quantidades, estequiometria e soluções; energia, velocidade e equilíbrio; química orgânica, polímeros, ambiente e energia. `fasesLivres: true`.

## Seu gosto (preferências do usuário)
- 2026-10-09 · Mais de um ano de conteúdo por matéria, em módulos de 5 a 7 aulas, com revisão no fim de cada módulo.
- 2026-10-09 · Padrão da Georgia em todas as aulas: Aprender completo, ~20 questões do fácil ao difícil, comentário em cada alternativa e Dica de mergulhador, fichas por tema.
- 2026-10-10 · Cada onda vai para a produção quando termina.

## Decisões
- 2026-10-10 · Curso 100% autoral nesta versão, sem itens literais do Enem.
- 2026-10-10 · Toda conta com `! confere:` (estequiometria, concentração, pH, Nox, ddp, lei de Hess, Kc); massas atômicas arredondadas (H 1, C 12, N 14, O 16, Na 23, S 32, Cl 35,5, Ca 40, Fe 56) e volume molar de 22,4 L nas condições normais.
- 2026-10-10 · pH só com potências de 10 exatas (sem logaritmo decimal "quebrado"), como a prova costuma fazer.
- 2026-10-10 · Química sempre ligada ao cotidiano brasileiro: estação de tratamento de água, etanol de cana e biodiesel, mercúrio do garimpo, pré-sal, chuva ácida e acidente do césio-137 em Goiânia.
- 2026-10-10 · Ambiente com causa química explícita: CO₂ e metano no clima, cloro dos CFCs no ozônio, fosfato na eutrofização, mercúrio na biomagnificação; "renovável" separado de "biodegradável" (plástico verde).
- 2026-10-10 · 69 questões com `revisar` (valores de tabela, datas, dados de saúde e de ambiente, estruturas de fármacos) para o especialista conferir.

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-10 | Matriz de Referência do Enem · Inep | Química aparece em situação-problema: transformações e energia no cotidiano, avaliação de processos industriais e impactos ambientais, leitura de gráficos e tabelas. |
| 2026-10-10 | Caderno Marista para o Enem: Ciências da Natureza · União Marista do Brasil | Os blocos que mais pesam são energia, química e ambiente, química geral, físico-química e orgânica; a ordem dos módulos segue também o mapa 2019–2025. |

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

(Ainda sem lotes: a Fila de Validação depende da aprovação do admin.)

## Lições da escrita (autocheck do construtor)
- Variante com o mesmo enunciado da original é recusada ("igual à original"): mudar a pergunta, não só a resposta.
- Termo de `reforcar` só no Aprender, num bloco do Associar (mapa ou associações, não os dois) e nos pontos; nunca nas pérolas.
- Item do mapa mental precisa repetir palavras do Aprender (raízes de 5 letras): "frações", "caminho mais fácil" e "autoionização" foram recusados até o Aprender usar as mesmas palavras.
- Palavrinha só com palavras de 4 a 8 letras e sem repetir palavras de outras aulas do curso.
- Resposta certa longa (mais de 60 caracteres e quase o dobro das outras) entrega o gabarito: encurtar.

## Já feito
- 2026-10-10 · Curso completo: 27 aulas em 5 módulos, 540 questões, 540 variantes, 71 fichas, blocos para todos os jogos (108 pares, 81 V/F, 27 adivinhas, 27 sequências, 108 palavras) e prova de 45 questões. `conferir-trilha.mjs`: 0 erros e 0 avisos.

## Próximos passos e pendências
- Mergulho Triplo das questões e das variantes (estimativa: cerca de US$ 20 cada bloco, US$ 40 no total; `fila.mjs simular`). Só com a aprovação do admin na tela.
- Revisão humana por um professor de Química, começando pelos 69 itens marcados `revisar`.
- Parecer de validação 2026-10-10: Aprovada com ressalvas (`docs/validacoes/enem-natureza-2026-10-10.md`).

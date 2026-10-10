# Parecer: Enem · Matemática (enem-matematica), 2026-10-09

- **Tipo:** curso novo
- **Tema ou fase:** o curso inteiro (75 aulas, 12 módulos; `docs/cadernos/enem-mapa-curricular.md`, seção 4)
- **Resultado geral:** Aprovada com ressalvas

## 1. Fontes

| Fonte (título, autor ou órgão) | Arquivo | Edição ou data | Classificação (garimpo) | Resultado |
|---|---|---|---|---|
| Matriz de Referência do Enem (Inep), Matemática e suas Tecnologias | `matriz_referencia.pdf` (já catalogada) | Publicação de 2026, mesmas 30 habilidades de 2009 | Matriz curricular | Aprovada (base do mapa) |
| *Caderno Marista para o Enem: Matemática e suas Tecnologias* (União Marista do Brasil) | `Caderno Marista Matematica e suas tecnologias 1.pdf` | 2013, 116 p. | Terceiro (material didático) | Aprovada com ressalvas: só ordem e abordagem |
| *Cadernos dos Cursinhos*, volume 7: exercícios (Unesp) | `caderno-7---exercicios-1.pdf` | 2016 | Terceiro (lista de exercícios) | Não usado nesta onda: lista de exercícios não serve de base (seção 2 da `criar-trilha`) |

## 2. O que sai e o que fica

| Arquivo | Sai | Fica (material limpo) |
|---|---|---|
| Caderno Marista Matemática | Páginas 4 a 7 (apresentação e institucional: enchimento). Páginas 8 e 9 e o trecho da pág. 15 sobre a data da prova (versão velha: formato e calendário de 2013, ver achados 1 a 3). Páginas 17 a 109 como texto: são itens do Enem 2009 a 2012 reunidos por terceiro; questão literal do Enem só entra a partir do PDF oficial do Inep (`docs/CONTEUDO_CURSINHO.md` 1.1), nunca de compilação | A leitura das competências 1 a 7 (págs. 10 a 13) e a organização do caderno de exercícios **por habilidade** (H1 a H24), como referência de que tipo de situação cada habilidade costuma cobrar. O anexo da TRI (págs. 110 e 111), só como conferência do que ensinamos na aula de estratégia de prova |
| Matriz do Inep | nada | Inteira |

## 3. Achados

| # | Onde (arquivo, pág.) | Tipo | O problema, com as nossas palavras | Correção e fonte oficial | Gravidade | Situação |
|---|---|---|---|---|---|---|
| 1 | Caderno Marista, pág. 8 | desatualizado | Diz que Natureza e Humanas caem no primeiro dia e Linguagens, Matemática e Redação no segundo | Desde 2017: 1º dia Linguagens, Humanas e Redação (5h30); 2º dia Natureza e Matemática (5h). [MEC, Enem 2026](https://www.gov.br/mec/pt-br/assuntos/noticias/2026/outubro/enem-2026-falta-um-mes-para-o-primeiro-dia-de-provas) | ressalva | resolvido (não usamos o trecho) |
| 2 | Caderno Marista, pág. 9 | desatualizado | Cita o Enem como certificação do ensino médio e um programa federal de intercâmbio encerrado | A certificação passou para o Encceja em 2017; o programa citado acabou. Não entram no curso | ressalva | resolvido |
| 3 | Caderno Marista, pág. 15 | desatualizado | Data e dia de prova do Enem 2013 | Datas do ano corrente vêm do Calendário do Diver (`data/calendario/datas-oficiais.json`) | nota | resolvido |
| 4 | Caderno Marista, págs. 17 a 109 | sujeira | Questões do Enem copiadas por terceiro, com figuras que não vieram no texto | Literal só do PDF do Inep, com triagem; nesta onda o curso é 100% autoral | ressalva | resolvido |
| 5 | Caderno Marista, sumário do caderno de exercícios | lacuna | Não traz itens para H4 nem para H25 a H30 (gráficos e estatística, o bloco que mais cai) | O mapa curricular cobre essas habilidades pela Matriz e pelo mapa de pesos 2019–2025 | nota | resolvido |

## 4. Fatos críticos conferidos

3 conferidos: 1 confere (o Enem tem 45 itens por área e nota pela TRI, sem média global), 2 divergem (achados 1 e 2), 0 sem confirmação.

## 5. Contradições com o curso atual (atualização)

Não se aplica (curso novo). O "Comece por aqui" (`enem-vestibular`) não diz nada sobre a ordem dos dias de prova: nada a corrigir.

## 6. Lacunas de cobertura

As fontes de terceiros não cobrem estatística e leitura de gráficos (H24 a H30), nem a estimativa (H4). O curso cobre pela Matriz (módulos 5, 6 e as aulas de estimativa) e pelo mapa de pesos das provas de 2019 a 2025 (`docs/cadernos/enem-vestibular.md`).

## 7. Para o especialista

Travessia ainda sem especialista: os itens marcados `revisar` no curso ficam com o usuário.

## 8. Decisão

A `criar-trilha` usa a Matriz do Inep (inteira) e, do Caderno Marista, só a ordem e a leitura das competências. Não usa: o institucional, o formato de prova de 2013, os itens copiados do Enem nem a lista de exercícios da Unesp. Tudo o que for escrito é autoral.

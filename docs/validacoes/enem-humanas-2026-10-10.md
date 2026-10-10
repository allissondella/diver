# Parecer: Enem · Geografia, Enem · História, Enem · Filosofia e Enem · Sociologia (enem-geografia, enem-historia, enem-filosofia, enem-sociologia), 2026-10-10

- **Tipo:** cursos novos (Ondas 5, 6 e 9)
- **Tema ou fase:** os quatro cursos de Ciências Humanas (30, 25, 10 e 10 aulas; `docs/cadernos/enem-mapa-curricular.md`, seção 5)
- **Resultado geral:** Aprovada com ressalvas

## 1. Fontes

| Fonte (título, autor ou órgão) | Arquivo | Edição ou data | Classificação (garimpo) | Resultado |
|---|---|---|---|---|
| Matriz de Referência do Enem (Inep), Ciências Humanas e suas Tecnologias | `matriz_referencia.pdf` (já catalogada) | 30 habilidades em 6 competências | Matriz curricular | Aprovada (base do mapa) |
| *Caderno Marista para o Enem: Ciências Humanas e suas Tecnologias* (União Marista do Brasil) | `Caderno Marista ciências humanas e suas tecnologias 1.pdf` | 2013, 116 p. | Terceiro (material didático) | Aprovada com ressalvas: só ordem, abordagem e conferência de cobertura |
| *Filosofia no Enem 2012–2018* (Inep/MEC) | já catalogado | estudo oficial | Oficial (estudo) | Aprovada: só para Filosofia (Onda 9), conclusões nossas |

O vol. 6 (Humanas) dos *Cadernos dos Cursinhos* (Unesp, 2016) não entra nesta onda: a licença não está declarada e a Matriz e o mapa de pesos 2019–2025 bastam para a cobertura. Os outros arquivos da pasta "Atualizar" do Drive não entram: livros de origem duvidosa (WeLib), zips de terceiros (@WAGNERNAMED), Memorex e Roteiro USP (regra do CLAUDE.md), e as compilações de questões comentadas (questão literal só do PDF do Inep).

## 2. O que sai e o que fica

| Arquivo | Sai | Fica (material limpo) |
|---|---|---|
| Caderno Marista Humanas | Págs. 4 a 7 (institucional: enchimento). Págs. 8 e 9 (formato de prova e usos da nota de 2013: versão velha). Os gráficos de distribuição por bloco (imagem sem texto). Págs. 20 a 104 (caderno de exercícios com itens de terceiros). Anexo 1, págs. 105 a 108 (lista de universidades que usariam o Enem 2013: versão velha) | A leitura das seis competências da área (págs. 10 a 13) e as observações de cada componente: em História, o peso de identidades e memória, de problemas sociais do tempo presente, de cidadania e democracia e da leitura de fontes (documentos, imagens, mapas); em Geografia, o espaço geográfico como relação sociedade-natureza, com peso das transformações do espaço pelas relações de poder e da interação sociedade-natureza. Servem de conferência da cobertura, sempre cruzadas com o mapa de pesos 2019–2025 |
| Matriz do Inep | nada | Inteira |

## 3. Achados

| # | Onde (arquivo, pág.) | Tipo | O problema, com as nossas palavras | Correção e fonte oficial | Gravidade | Situação |
|---|---|---|---|---|---|---|
| 1 | Caderno Marista Humanas, pág. 8 | desatualizado | Diz que Humanas cai no primeiro dia junto com Ciências da Natureza | Desde 2017: 1º dia Linguagens, Humanas e Redação; 2º dia Natureza e Matemática (editais do Inep; mesma fonte do parecer de Matemática) | ressalva | resolvido (não usamos o trecho) |
| 2 | Caderno Marista Humanas, pág. 9 | desatualizado | Cita a certificação do ensino médio pelo Enem | A certificação passou para o Encceja em 2017. Não entra no curso | ressalva | resolvido |
| 3 | Caderno Marista Humanas, Anexo 1 | versão velha | Lista de instituições que usariam o Enem em 2013 | Informação de seleção muda todo ano; o app usa `data/calendario/datas-oficiais.json` | nota | resolvido |
| 4 | Caderno Marista Humanas, gráficos das págs. 15 e 16 | versão velha | Frequências de conteúdo das provas de 2009 a 2012 | Usadas só como sinal; o peso de cada módulo segue o mapa 2019–2025 (`docs/cadernos/enem-mapa-curricular.md`) | nota | resolvido |
| 5 | Caderno Marista Humanas, págs. 20 a 104 | sujeira e direitos | Itens do Enem e de outras origens reunidos por terceiro, com textos e imagens de terceiros | Cursos 100% autorais nesta versão; nenhum texto, charge ou mapa de terceiro | ressalva | resolvido |

## 4. Fatos críticos conferidos

Datas e marcos de História seguem a historiografia consolidada dos livros didáticos e as fontes oficiais (Constituições no portal do Planalto, IBGE para dados de população e território). Dados de Geografia que mudam com o tempo (população, urbanização, matriz energética, desmatamento, número de unidades da federação e de municípios) vêm do IBGE, da EPE e do INPE, com o ano citado; questões que dependem de número, data exata, lei ou classificação estão marcadas com `revisar` para o especialista. A divisão regional usada é a do IBGE (cinco grandes regiões) e a classificação de relevo é a de Jurandyr Ross, citadas como tais.

## 5. Contradições com o curso atual (atualização)

Não se aplica (cursos novos). O "Comece por aqui" (`enem-vestibular`, fase de Humanas) trata de leitura de fontes, cidadania e temas introdutórios: os cursos aprofundam sem contradizer.

## 6. Lacunas de cobertura

A fonte de terceiro é de 2013 e não trata de temas recentes que o Enem tem cobrado (mudanças climáticas com dados atuais, transição energética, agronegócio e fronteira agrícola recente, plataformas digitais e trabalho, pandemia de covid-19, migrações recentes, memória da ditadura e Comissão Nacional da Verdade). Os cursos cobrem pela Matriz (H1–H30) e pelo mapa de pesos 2019–2025.

## 7. Para o especialista

Os cursos de Humanas ainda não têm especialista: os itens marcados `revisar` ficam com o usuário.

## 8. Decisão

A `criar-trilha` usa a Matriz do Inep (inteira) e, do Caderno Marista, só a leitura das competências e a confirmação dos eixos que mais se repetem em cada componente. Não usa: o institucional, o formato de prova de 2013, o anexo de universidades, os gráficos, os itens copiados nem os textos e imagens de terceiros que eles trazem. Tudo o que for escrito é autoral; documentos históricos só aparecem resumidos com as nossas palavras ou, quando literais, curtos e de domínio público (leis e documentos oficiais), com a fonte.

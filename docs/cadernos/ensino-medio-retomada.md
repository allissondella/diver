# Caderno da sala: Ensino Médio · "Sempre dá tempo"

> Cursos: `data/trilhas/em-<matéria>.json` (ainda não existem) · Plano: `docs/cadernos/ensino-medio-mapa-curricular.md` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md` · Direitos autorais: `docs/CONTEUDO_CURSINHO.md`
> **Plano aprovado em 2026-10-14 ("manda bala"), com as recomendações deste caderno.** Onda 0 em andamento.

## Público e objetivo

- **Quem estuda:** jovem adulto, de uns 20 a 40 anos, que terminou o Ensino Médio há anos.
  - Trabalha e tem pouco tempo.
  - Às vezes tem vergonha de ter esquecido.
  - Volta por motivos diferentes: Enem, concurso, curso técnico, faculdade, ajudar os filhos ou curiosidade.
- **Objetivo:** incentivar a volta aos estudos, não filtrar ninguém.
  - Uma primeira vitória em poucos minutos.
  - Uma rotina pequena.
  - A pessoa no controle: ela **escolhe as matérias** ou **faz o Mapa de partida**, que mostra por onde começar.
- **Tom:** adulto, acolhedor e brasileiro. **Nunca infantil, nunca culpa.**
  - Voltar depois de uma pausa nunca é problema.
  - Cada matéria termina apontando o próximo passo: Travessia (Enem), Cronograma ou Explora Tech.

## Princípios do desenho (do pedido, 2026-10-14)

1. **Primeira vitória em poucos minutos:** a primeira aula que a pessoa abre é fácil de verdade.
2. **A pessoa manda:** duas portas com o mesmo destaque, "Quero escolher" e "Fazer o Mapa de partida", e dá para trocar de ideia a qualquer momento.
3. **Pouco por vez:** aulas de 15 a 20 minutos, e a sala mostra os próximos 3 módulos, não 154 aulas.
4. **Ligado à vida:** cada aula abre com "Onde isso aparece na sua vida".
5. **Voltar depois de uma pausa nunca é problema.**
6. **Termina apontando o próximo passo.**

## Seu gosto (preferências do usuário)

- 2026-10-14 · Sala "Ensino Médio", subtexto exatamente "Sempre dá tempo".
- 2026-10-14 · Aproveitar o máximo da Travessia, sem duplicar à toa e sem quebrar nada. Os ids da Travessia nunca são reaproveitados nem renomeados.
- 2026-10-14 · Nada de nomes do mar em curso, módulo, aula ou descrição. Módulo e aula sempre com número, gerado por script.
- 2026-10-14 · Questões literais do Enem não entram nesta sala.
- 2026-10-14 · A curadoria da pasta do Drive é a `validar-fontes`, junto com o `garimpo` (resposta à pergunta da sessão).

## Decisões

- 2026-10-14 · **Plano aprovado** ("manda bala"), com as recomendações das decisões técnicas (a) a (i):
  - opção **C** (cursos curtos + "Aprofundar na Travessia");
  - nome **"Retomada"** e os 11 cursos do mapa;
  - Mapa de partida no motor da `diagnostica.js`, log sem SQL;
  - `moduloId` e `prog.modulos`;
  - prova com atalho e reforço;
  - bônus de retorno de +20 XP e +2 pérolas;
  - o Mapa e o Teste rápido substituem o diagnóstico de 2 perguntas por tema.
  - O Cronograma "sem prova marcada" fica para depois, como proposto.

## Inventário: o que já existe no Diver e serve

| Peça | Onde | Serve para | O que falta |
|---|---|---|---|
| Salas e pacotes | `js/grupos.js`, `js/admin.js` | Sala nova = um item em `Grupos.LISTA` (`pertence: /^em-/`, áreas, cor, ícone). O "Atualizar salas" do Admin e o marcador `pacote:<sala>` já funcionam para qualquer sala da lista | Campo **`subtexto`** (hoje a sala tem `rotulo` e `descricao`); nome curto "Matemática" a partir de "Matemática · Retomada" (hoje `nomeCurto` só tira prefixo) |
| Cursos por matéria com módulos | campos `modulo`, `habilidades`, `minutos`, `rotuloAula`; `numerar-aulas.mjs`; mapa com módulos recolhíveis (`app.js`) | Estrutura igual à do Enem e do Explora Tech | Id estável do módulo (`moduloId`): o `modulo` é o nome com número, reescrito pelo script |
| Catálogo leve | `data/trilhas/catalogo.json`, `gerar-catalogo.mjs`, `Trilhas.completar` | O curso só baixa ao entrar | Nada (ver decisão (i)) |
| `fasesLivres: true` | `Progresso.faseDesbloqueada` | Todas as aulas abertas: nada fica trancado | Nada |
| Leitura obrigatória | "Antes de mergulhar" antes do Mergulho | Igual em todos os cursos | Nada |
| Rodada de 10 questões, em rampa | `quiz.js` | **A aula conclui com uma rodada**: o Mergulho que termina chama `Progresso.concluirFase`, e a 1ª rodada da fase não tem difíceis | Nada (a 2ª rodada já é opcional) |
| Avaliação Diagnóstica | `js/diagnostica.js`, `data/diagnostica/enem.json` | "Pausar", "Ainda não sei", notas de 1 a 5 por disciplina, saída para o Cronograma, +100 XP e 8 pérolas pela `Economia`, log `diagnostica_concluida` | Hoje é **um teste só**, com arquivo, chave, trilha do XP e total (40) fixos no código. Falta configurar por arquivo, blocos por área e o `moduloId` por questão (decisão (b)) |
| Cronograma | `js/cronograma-gerador.js`, `js/cronograma.js` | Notas de 1 a 5 por disciplina, Modo Foco, Redistribuir "sem culpa" | Objetivo **sem prova marcada** (decisão (f)) |
| Prova final | `app.js` (`configProva`, `renderizarProva`), conquista "Aprovado!" | Bloco `prova` por curso; admin e professor veem antes | Atalho "Já domino" e reforço dos módulos mais errados (decisão (d)) |
| Tutorial | `js/tutorial.js` (`ROTEIROS`, `VERSOES`) | Roteiro por tela | Roteiros da sala e do Mapa |
| Economia e conquistas | `js/economia.js` (`CONFIG`, `bonusMaximo` 60 XP e 15 pérolas), `js/conquistas.js` | XP e pérolas sempre pela Economia | Conquistas novas. Hoje elas são só selos, sem XP (decisão (g)) |
| Meta diária | `Progresso.METAS_DIARIAS` (5, 10, 20, 30), padrão 10 | — | Padrão 5 para quem está voltando (decisão (f)) |
| Log de atividade | `eventos_atividade` com tipos fixos no banco | Estatísticas, retrospectiva | Tipo novo só com SQL; reaproveitar `diagnostica_concluida` evita SQL (decisão (b)) |
| Busca no acervo | `scripts/buscar-similares.mjs` | Exemplos de estilo | **O acervo está vazio**: nenhuma questão passou pela Fila. A cópia vem direto das trilhas |
| Plano antigo da "Recapitulação" | `docs/RECAPITULACAO_ENSINO_MEDIO.md` (2026-09-30 e 2026-10-01) | Mesmo público. Decisões já tomadas: Português → Matemática → Lógica; diagnóstico fixo de 2 perguntas por tema; calibrar a dificuldade pelos acertos somados | Ver "Conflitos com o plano de 2026-10-01", mais abaixo |

## Curadoria da pasta do Drive (validar-fontes + garimpo), 2026-10-14

**Pasta:** a do Drive indicada no pedido (só leitura; o link não vai para o repositório; nada foi movido, renomeado, editado nem copiado para o repositório). São **51 arquivos PDF**.
- **40 baixados** para o scratchpad e lidos por script: autoria, créditos, data, número de páginas, se tem texto, sumário e quantos exercícios de vestibular e do Enem cada um traz.
- **6 grandes demais para o conector** (acima de 10 MB ou com falha na transferência): `portugues (1)`, `portugues (2)`, `historia`, `geografia (1)`, `biologia (1)` e `quimica (1)`. Esses foram classificados pelos metadados e pela primeira página.
- **5 WeLib** não foram abertos (fonte proibida).
- Nenhum trecho vai para o repositório. Aqui ficam só as nossas conclusões e o lugar.

| Série | Arquivos | O que é (conferido) | Classificação (garimpo) | Sujeira e problemas | Resultado |
|---|---|---|---|---|---|
| **BNCC** | `basenacionalcomum.pdf` (600 p., dez/2018) | Versão integral, **com o Ensino Médio** (códigos EM13 das quatro áreas e EM13LP) | Oficial/governo · matriz curricular | Nenhuma. Obs.: o link do `docs/RECAPITULACAO_ENSINO_MEDIO.md` aponta para o PDF "EI_EF", que **não tem** o Ensino Médio | **Aprovada:** espinha do currículo; citar códigos, nunca o texto |
| Temas Contemporâneos Transversais (MEC) | `caderno_saude…`, `caderno_meio_ambiente…`, `caderno_economia…` (2022) | Cadernos oficiais para professores | Oficial/governo | Sem conteúdo para o aluno | **Aprovada** só como referência de temas: saúde, ambiente e educação financeira nos "Onde isso aparece na sua vida" |
| Gestão da BNCC | `orientacoes_projeto_pedagogico.pdf`, `Guia_para_Gestores…pdf` | Orientações para escola | Oficial/governo | **Fora do tema** (para gestor, não para aluno) | **Descartado** |
| CESU Português | `UNIDADE-1` a `UNIDADE-6.pdf` (2018) | Apostilas do curso semipresencial de um centro de estudos supletivos (CESU Custódio Furtado de Souza) | Terceiro (material didático) | Trazem **poemas inteiros, letras de música, tirinhas e notícias** de terceiros | **Aprovada com ressalvas:** só cobertura e sequência; nada de texto, exercício ou figura |
| CESU Matemática | `UN-1`, `unidade2`, `UN-3` a `UN-6` (2020) | Do Fundamental às funções, geometria, trigonometria, gráficos, combinatória e probabilidade | Terceiro | **Questões do Enem e de vestibulares** nos exercícios (UN-3, UN-5, UN-6); UN-5 cita material de outra instituição | Igual: **só cobertura e sequência** |
| CESU Física | `capitulo1` a `capitulo6.pdf` (2019) | Mecânica, termologia, ondas e óptica, eletrostática e eletrodinâmica, magnetismo | Terceiro | Questões de vestibular nos capítulos 4 e 6 | Igual |
| CESU Literatura | `UNIDADE-1-E-2…`, `UNIDADE-3-e-4…`, `UNIDADE-5-Ee-6-Literatura…` (2022) | Teoria literária e escolas, do Quinhentismo ao Modernismo | Terceiro | Poemas e trechos de terceiros | Igual |
| CESU "MEC/INEP/ENCCEJA" | `Filosofia`, `Sociologia`, `Geografia`, `Quimica`, `Biologia.pdf` (montados em 2016; `Biologia` tem metadados de 2006) | **Capítulos do antigo Livro do Estudante do Encceja, remontados pelo CESU** com a capa "Fonte: MEC/INEP/ENCCEJA" | Oficial na origem, mas **remontado por terceiro** e de antes da BNCC | **Duplicado:** Sociologia repete o capítulo 1 de Filosofia, e Biologia e Química abrem com o mesmo capítulo. A capa não corresponde ao conteúdo. **Versão velha** (2006, antes da BNCC) | **Aprovada com ressalvas** só como sinal de cobertura. A versão oficial, se fizer falta, vem do portal do Inep, nunca da remontagem |
| Apostilas de sistema comercial | `portugues.pdf` (= `portugues (4).pdf`), `portugues (1)`, `(2)`, `(3).pdf`; `matematica`, `fisica`, `ingles`, `historia`, `geografia (1)`, `biologia (1)`, `quimica (1).pdf` (1ª série, Caderno 1, 2012–2013) | Cadernos de um sistema de ensino comercial, com teoria, exercícios e **resolução comentada** | Terceiro comercial | **`portugues.pdf` e `portugues (4).pdf` têm texto idêntico** (duplicata). Os códigos "PROF" no título interno (`portugues (1)`, `historia`) indicam **edição do professor**. Muitas questões do Enem e de vestibulares (até 70 num caderno) e literatura de terceiros. Só o 1º bloco de cada matéria | **Aprovada com ressalvas:** só cobertura e sequência. **Duplicata descartada** |
| Origem incerta | `portugues (5).pdf` (sem créditos; metadados do mesmo estilo editorial dos cadernos comerciais), `Apostila-Inglês-EM.pdf` (2020, sem editora nem licença) | Raízes da literatura portuguesa; inglês básico (to be, presente, passado, futuro, perguntas) | **Não identificado** | Sem autoria nem licença | **Fora**, até você dizer de onde vêm. O sumário do inglês só confirma a sequência que eu já proponho |
| WeLib | 4 livros (Química Vol. 1, Nova gramática, Geografia Geral e do Brasil, Física 1) + apostila de concurso para professor | Cópias de livros comerciais. A Física 1 não tem texto indexado no Drive (escaneada) | Fonte proibida/duvidosa | — | **Reprovada:** só bibliografia, até você liberar por escrito |

**Fatos críticos conferidos na web (fonte oficial, sem IA paga):**

| Fato | Resultado | Fonte |
|---|---|---|
| BNCC do Ensino Médio aprovada em dez/2018 (Resolução CNE/CP nº 4/2018) | **Confere** | Documento da própria pasta (texto e códigos) e o Senado ([documento](https://legis.senado.leg.br/sdleg-getter/documento/download/5d88e62d-652f-410e-91cb-08aa83ad130c)) |
| A Lei nº 14.945/2024 mudou o Ensino Médio (2.400 h de formação geral) e manda cumprir a BNCC integralmente | **Confere**; nenhuma versão nova da BNCC encontrada | [Lei 14.945/2024 (Câmara)](https://www2.camara.leg.br/legin/fed/lei/2024/lei-14945-31-julho-2024-796017-publicacaooriginal-172512-pl.html) e [MEC](https://www.gov.br/mec/pt-br/assuntos/noticias/2024/agosto/o-que-muda-no-ensino-medio-a-partir-de-2025) |
| Matriz atual do Encceja Ensino Médio | **Não deu para confirmar**: a página que tentei no Inep deu 404, e a busca só trouxe fontes secundárias | Pendência |

**Lacunas** (o material não cobre e o Professor Diver escreve com o que já sabe, conferindo os fatos críticos na web):
- História: os cadernos param na Antiguidade e no início do Brasil.
- Geografia: falta o Brasil.
- Química e Biologia: só o começo.
- Filosofia e Sociologia: três temas.
- Inglês: só a 1ª série.
- Redação: não há material próprio sobre dissertação nem sobre textos do dia a dia.

**Cobertura e sequência:** a parte útil do material confirma o que o adulto mais precisa rever e em que ordem.
- Matemática começa no Fundamental (operações, frações) e vai até funções e probabilidade.
- Português é ensinado por gênero, com a gramática no meio.
- Física segue mecânica → calor → ondas → eletricidade.

O mapa curricular segue essa ordem, com nomes e exemplos nossos.

**Resultado da curadoria:** **Aprovada com ressalvas** para usar como mapa de cobertura (BNCC e cadernos do MEC aprovados; cadernos do CESU e comerciais só para cobertura e sequência). **Reprovados:** os 5 WeLib. **Fora até você dizer a origem:** 2 arquivos. **Descartados:** a duplicata e os 2 documentos de gestão.

**Registro:** as linhas em `docs/FONTES_CATALOGADAS.md` e o parecer `docs/validacoes/ensino-medio-2026-10-14.md` foram gravados depois do OK (2026-10-14).

## O que as referências ensinaram (conclusões nossas, nunca trechos)

| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|
| 2026-10-14 | BNCC (MEC, 2018), parte do Ensino Médio | No EM, só Matemática e Língua Portuguesa têm habilidades próprias; as outras matérias são organizadas por área. Então a aula cita a habilidade da área, e a retomada de Matemática precisa citar também o Fundamental (EF06–EF09), onde nasce o que o adulto esqueceu |
| 2026-10-14 | Apostilas do curso semipresencial do CESU (Português, Matemática, Física, Literatura) | Quem volta a estudar começa revisando o Fundamental (operações, frações, potências) antes de funções. Português funciona melhor por gênero do dia a dia (notícia, anúncio, carta), com a gramática dentro do texto |
| 2026-10-14 | Cadernos de Temas Contemporâneos Transversais (MEC, 2022) | Saúde, meio ambiente e educação financeira são as pontes naturais para o "Onde isso aparece na sua vida" |

## Decisões técnicas (para o seu OK; nada foi mexido)

O comportamento de Mergulho, Simulado, Revisão e Prova **não muda** em nenhum curso que já existe. Tudo abaixo é campo novo opcional, ou vale só para os cursos `em-*`.

### a. Reaproveitamento da Travessia: A, B ou C

| | A) Só referência (os cursos da Travessia na sala) | B) Curso novo por matéria, com cópia do conteúdo | C) Híbrido: B + "Aprofundar na Travessia" no fim |
|---|---|---|---|
| Experiência | Pesada: Matemática com 75 aulas em nível Enem, e aulas de 35 min | Curta, no nível de retomada, aulas de 15 a 20 min | A de B, com uma ponte para quem quiser ir além |
| Conteúdo a escrever | 0 | 1.460 questões novas + 1.620 copiadas e revistas; artigos mais curtos | Igual a B |
| Validação (Fila) | 0 a mais | ~US$ 231 | Igual a B |
| Risco | A pessoa desiste no "Módulo 1 de 12" | Duplicar sem critério | Nenhum a mais: a ponte é só um botão |

**Recomendo C.** Os números medidos:
- as 154 aulas aproveitam **1.620 questões fáceis e médias** de **3.225 disponíveis** nas aulas-fonte;
- 100 aulas têm uma aula da Travessia que cobre o tema, 14 adaptam e 12 são novas.

**Como a cópia funciona:**
- **id novo** (`em-mat-porcentagem-q03`) e campo opcional **`copiaDe`** com o id de origem, para rastrear;
- enunciado revisto para o tom e o nível;
- variante e ficha vêm junto;
- a questão original **nunca muda**.

**"Aprofundar na Travessia":**
- O botão aparece no fim de cada matéria (tela "Meu retorno") e no fim do último módulo.
- Ele abre o curso `enem-<matéria>` **se a pessoa tiver acesso**. Se não tiver, mostra "Este curso fica na sala do Enem. Peça acesso à equipe", sem botão quebrado.

**Um curso em duas salas:** o código já permite, porque `Grupos.salas` não impede que um curso pertença a duas.
- **Não recomendo.** O "Voltar" do curso volta sempre para a primeira sala, e o Admin contaria o curso nas duas.
- Com C não precisa: a ponte é um link, não um curso compartilhado.

### b. Mapa de partida: reaproveitar o `js/diagnostica.js`

**Recomendo reaproveitar o motor, sem escrever outro.** O `Diagnostica` vira configurável e a avaliação do Enem continua idêntica. Mudanças:
- `Diagnostica.configurar({ id, arquivo, chave, trilhaXP, rota })`. O Enem continua com `data/diagnostica/enem.json`, a chave `diver:v1:diagnostica` e a rota `#diagnostica`.
- **Mapa de partida:** `data/diagnostica/ensino-medio.json` (45 questões; mapa curricular, seção 5), chave `diver:v1:mapa-partida` (sincroniza como o resto) e rota `#mapa-partida`.
- **Blocos por área:**
  - a tela inicial mostra os 4 blocos (Linguagens, Matemática, Natureza, Humanas), cada um com "Começar" ou "Continuar (X de Y)";
  - dá para fazer um por dia;
  - "Pausar" e "Ainda não sei" ficam como são.
- **Cresce com os cursos:** o bloco só mostra as questões cuja `curso` está publicado e acessível à pessoa (`Trilhas`).
- **Saída para o Cronograma:** as notas de 1 a 5 por matéria, pelo mesmo caminho de hoje (`Diagnostica.notas()`); o convite ao Cronograma aparece no fim.
- **Pontos:** os mesmos 100 XP e 8 pérolas da Avaliação, divididos em **25 XP e 2 pérolas por bloco**, na primeira vez e pela `Economia`.
  - É uma vitória a cada bloco, e o total não muda.
  - O XP vai para o curso da 1ª matéria do bloco.
- **Log:**
  - **Recomendo** reaproveitar `diagnostica_concluida` com `detalhes.teste = "mapa-partida"` e `detalhes.bloco`. Assim **não muda o banco**.
  - Alternativa: um tipo novo `mapa_partida_concluido`, que pede SQL nos testes e na produção antes do merge.

### c. Liberação de módulos

- **Id estável do módulo:** campo opcional novo `fases[].moduloId` (ex.: `em-mat-m2`). O `numerar-aulas.mjs` passa a preservá-lo; o nome com número continua no `modulo`.
- **Estados**, gravados no progresso do próprio curso (`diver:v1:trilha:<id>`, que já sincroniza; **sem tabela nova**):
  - `prog.modulos = { "<moduloId>": { estado, por, em } }`;
  - `estado`: `recomendado` | `liberado` | `depois` | `dominado`;
  - `por`: `mapa` | `escolha` | `teste`.
- **Quem não escolheu nada:**
  - o Módulo 1 de cada curso aberto fica **recomendado**, e os outros, **"Para depois"**;
  - "Para depois" é um módulo recolhido com o botão **"Liberar quando quiser"** (um toque, sem pergunta).
  - **Nada fica trancado:** com `fasesLivres: true`, qualquer aula abre a qualquer hora. O estado só organiza a vitrine. O `Progresso.faseDesbloqueada` não muda.
- **Dominado:**
  - vem do Mapa (faixa alta e questão daquele módulo certa) ou do Teste rápido (4 de 5);
  - aparece com selo e texto ("Você já manda bem aqui"), nunca só com cor;
  - a pessoa pode estudar o módulo mesmo assim;
  - para a Prova final, as aulas de um módulo dominado contam como feitas (decisão (d)).
- **Teste rápido:**
  - oferecido ao abrir um módulo que o Mapa marcou como forte: "Quer pular? Faça um teste rápido";
  - 5 questões sorteadas do próprio módulo, uma média ou difícil por aula;
  - roda no mesmo motor do Mapa (`Diagnostica`), sem oxigênio e sem mexer no `quiz.js`.
- **Quem já tem progresso:**
  - ninguém tem progresso em `em-*`, porque os cursos são novos;
  - o progresso da Travessia **não muda nem é lido para liberar nada**;
  - se a pessoa já fez a aula equivalente na Travessia, o máximo é uma dica ("Você já viu isso na Travessia: que tal o Teste rápido?").

### d. Prova final por matéria

- **Parâmetros:** `{ "questoes": 30, "minutos": 45, "aprovacao": 60, "exigeFases": true }`. A conquista "Aprovado!" é a que já existe.
  - Os 60% são os da Travessia, para dar confiança.
  - Os 45 min (1,5 min por questão) são o padrão do app.
- **Liberação** (regra de hoje: todas as fases exigidas feitas; admin e professor veem antes). Dois ajustes mínimos, só para cursos com módulos:
  1. As fases de módulos **dominados** saem de `Progresso.fasesExigidas`. É uma linha, que só age quando a trilha tem `moduloId` e a pessoa tem `prog.modulos`.
  2. **"Já domino: fazer a prova agora":** quando o Mapa dá a faixa alta na matéria, grava `prog.atalhoProva = "mapa"`, e a prova fica liberada.
     - Para isso a trilha precisa ter o campo opcional `prova.atalhoDominio: true`.
     - Cursos sem o campo ficam como hoje.
- **Reforço dos módulos mais errados:** hoje a prova é um sorteio simples. Com o campo opcional `prova.reforco: true`:
  - metade das questões vem proporcional ao número de aulas de cada módulo;
  - a outra metade vai para os módulos com a maior taxa de erro da pessoa (do `prog.questoes`).
  - É uma mudança pequena no sorteio, só para quem tem o campo.
- **Reprovou:**
  - aparece "Quase! Vale rever estes módulos", com os 2 ou 3 módulos que mais erraram e um botão para cada;
  - "Tentar de novo" fica liberado, sem espera.
- **"Meu retorno"**, ao fim de cada matéria (prova aprovada ou todos os módulos feitos ou dominados):
  - o que a pessoa recuperou: módulos e aulas, acertos por módulo, e o antes e depois do Mapa, tudo derivado do log;
  - o convite ao próximo passo: outra matéria da sala, "Aprofundar na Travessia", Cronograma.

### e. A sala

- **Criação:** um item em `Grupos.LISTA`:
  - `id: 'ensino-medio'`, `nome: 'Ensino Médio'`, `subtexto: 'Sempre dá tempo'`;
  - `rotulo: 'Retomada'`, `cor: 'verde'`, `icone: 'i-livro'`, `pertence: (t) => /^em-/.test(t.id)`.
- **Onde o subtexto aparece:**
  - na porta da sala no Início e na Biblioteca, logo abaixo do nome (`Grupos.cartao`);
  - no cabeçalho da sala (`sala-hero`, abaixo do título);
  - no Admin, na janela "Salas e cursos" (ao lado do nome, em texto suave).
  - Nas etiquetas da lista de pessoas fica só o nome, para não alongar.
- **Ordem dos cursos** (áreas da sala):
  - Linguagens: Português, Redação, Literatura, Inglês;
  - Matemática;
  - Ciências da Natureza: Biologia, Química, Física;
  - Ciências Humanas: História, Geografia, Filosofia e Sociologia.
  - Português e Matemática vêm primeiro, como decidido em 2026-10-01.
  - **"Também na Travessia"** (só para quem tem acesso): Espanhol, Artes e Educação Física.
- **"Meu caminho"** (topo da sala):
  - os **próximos 3 módulos** recomendados ou liberados, em cartões com matéria, módulo, "x de y aulas" e "Continuar" (abre a próxima aula, como o Cronograma já faz);
  - os dois botões, "Fazer o Mapa de partida" e "Escolher matérias", com o mesmo destaque;
  - quem já fez o Mapa vê "Ver meu mapa".
  - Ordem: primeiro "Vale começar por aqui", depois "Vale uma revisão", depois o que a pessoa escolheu.
- **Admin:**
  - matrícula pela sala (`pacote:ensino-medio`) ou curso a curso, como em todas as salas;
  - o "Atualizar salas" dá a quem tem o marcador os cursos de cada onda nova;
  - professor: o mesmo `professor_do_curso` de hoje, por matrícula no curso.
- **Início:**
  - o "Continuar de onde parou" já funciona com qualquer curso;
  - card novo **"Descubra por onde começar"** (abre o Mapa), só para quem tem a sala, ainda não estudou nela e não fez o Mapa.
- **Tutorial:**
  - roteiros novos `sala-ensino-medio` ("Meu caminho", as duas portas, "Liberar quando quiser") e `mapa-partida`, em `Tutorial.ROTEIROS`;
  - nenhum `VERSOES` existente sobe, então ninguém revê tutorial antigo.

### f. Cronograma sem prova marcada e meta diária (só proposta)

- **Objetivo novo no passo 1: "Retomar os estudos, no meu ritmo (sem prova marcada)":**
  - horizonte rolante de 8 semanas, com "Continuar o plano";
  - sem simulado, sem reta final e sem véspera;
  - as matérias são as da sala, e as notas vêm do Mapa;
  - tempo padrão menor: 30 min em 5 dias da semana.
  - A conta do plano para quem tem prova não muda.
- **Meta diária para quem está voltando:** padrão de **5 questões** (hoje é 10) nos cursos `em-*`, pelo campo opcional `metaPadrao: 5` na trilha. A pessoa muda quando quiser.

### g. Retorno sem culpa e conquistas novas

- **Volta depois de 7 dias ou mais sem estudar na sala:**
  - a caixa do Diver diz "Que bom te ver de volta!" e oferece "Uma aula de 15 minutos?", que abre a próxima aula de "Meu caminho";
  - nunca fala de sequência perdida;
  - o recorde aparece guardado, como na regra de hoje.
- **Conquistas novas**, para os cursos `em-*` (selos, como as de hoje):
  - "Voltei a estudar": primeira aula concluída na sala;
  - "Mapa na mão": Mapa de partida completo;
  - "De volta à água": concluiu uma aula depois de 14 dias ou mais sem estudar;
  - "Matéria retomada": passou na Prova final de uma matéria.
- **Bônus em XP:** só "Voltei a estudar" e "De volta à água" dão um bônus pequeno, **+20 XP e +2 pérolas, uma vez**, pela `Economia`, dentro do teto.
  - As conquistas de hoje não dão XP. Se você preferir, ficam só os selos.

### h. Celular

- **Leitura:** o "Antes de mergulhar" já tem uma barra de rolagem só. Aula de 15 min = artigo de 350 a 500 palavras, sem tabela larga.
- **"Meu caminho":** os 3 cartões ficam um embaixo do outro, com botões de 44 px ou mais.
- **Mapa de partida:** a tela da Avaliação Diagnóstica já funciona no toque. Os blocos viram uma lista.
- **Estados dos módulos:** selo com texto e ícone, nunca só cor.
- Teste em 360 a 390 px, sem rolagem lateral, como de costume.

### i. Peso do app

- **Catálogo leve:** +~42 KB (de 198 para ~240 KB; ~6 KB a mais com compressão), medido pelo tamanho por aula dos cursos do Enem. O app continua abrindo pelo catálogo.
- **Cada curso:** o arquivo inteiro só baixa ao entrar nele.
- **Mapa e Teste rápido:** o Mapa (~60 KB) baixa só na tela dele, e o Teste rápido usa o curso já aberto.
- **Se um dia passar de ~400 KB:** dividir o catálogo por sala (o app já baixa sob demanda). Hoje não precisa.

## Conflitos com o plano de 2026-10-01 (`docs/RECAPITULACAO_ENSINO_MEDIO.md`)

| Decisão de 2026-10-01 | Proposta de agora | O que precisa da sua palavra |
|---|---|---|
| Ordem: Português, depois Matemática, depois Lógica | Português e Matemática juntos na Onda 0. **Lógica já está no Explora Tech**, que vira o "próximo passo" de quem gostar | Confirmar |
| Diagnóstico fixo, 2 perguntas por tema; errou as 2 → o tema entra; acertou → pula | **Mapa de partida** (4 a 5 por matéria) + **Teste rápido** por módulo (5). O "errou entra, acertou pula" vira os estados recomendado e dominado, por módulo | Confirmar que substitui |
| Calibrar a dificuldade pelos acertos somados, sem IA | Mantido para o futuro, pelo log (`questao_respondida` já guarda tudo) | Nada |
| Pergunta "Há quanto tempo terminou o Ensino Médio?" para sugerir o modo | Vira opcional no começo do Mapa, só para ajustar o tom das mensagens; não tranca nem decide nada | Quer manter? |
| Link da BNCC para o PDF "EI_EF" | Esse PDF não tem o Ensino Médio; trocar pelo integral | Corrijo esse documento com o seu OK |

## Lições da validação

| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

## Já feito

- 2026-10-14 · Etapa 1:
  - leitura dos documentos e do código pedidos;
  - medição da Travessia;
  - curadoria da pasta do Drive;
  - mapa curricular (154 aulas);
  - estimativa da Fila (`simular`, nada enviado);
  - este caderno.

## Próximos passos e pendências

- **O seu OK** no plano. Em especial:
  - (a) opção C;
  - (b) reaproveitar o `diagnostica.js` e o log sem SQL;
  - (c) `moduloId` e `prog.modulos`;
  - (d) atalho e reforço da prova;
  - (f) Cronograma sem prova (só depois);
  - (g) bônus de retorno;
  - o nome "Retomada";
  - os conflitos acima.
- Depois do OK:
  - gravar as 10 linhas em `docs/FONTES_CATALOGADAS.md` e o parecer `docs/validacoes/ensino-medio-2026-10-14.md`;
  - corrigir o link da BNCC no `docs/RECAPITULACAO_ENSINO_MEDIO.md`.
- Dizer a origem de `portugues (5).pdf` e `Apostila-Inglês-EM.pdf`, ou deixá-los de fora.
- Matriz atual do Encceja: conferir no edital do Encceja quando sair (hoje não foi encontrada).
- **Especialista de revisão humana: a definir** (a Travessia também não tem). Fato específico (data, lei, valor, fórmula, nome) leva `revisar`.
- Adaptador do `fila.mjs` para as questões de `data/diagnostica/` (serve ao Mapa e à Avaliação do Enem).

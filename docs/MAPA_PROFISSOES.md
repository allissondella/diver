# Mapa das Profissões: especificação v1.1

> Proposta de 14/10/2026. Dono: Allisson. Status: implementação de referência pronta; aguardando integração (Fase 1).
> Ficha modelo: `data/profissoes/enfermagem.json` (v2). Catálogo: `data/profissoes/indice.json`.
> Implementação de referência: `docs/prototipos/profissoes/profissoes.html` + `css/profissoes.css` + `js/profissoes.js` + `js/profissoes-infograficos.js`. Guia de integração: `docs/MAPA_PROFISSOES_INTEGRACAO.md`. As seis entradas interativas: `docs/MAPA_PROFISSOES_INTERACOES.md`.

## 1. Por que existe

Quem vai escolher um curso quase nunca sabe como é a profissão por dentro. O Google Trends dos últimos 5 anos (Brasil, 8 cursos) mostra que as pessoas fazem sempre as mesmas perguntas:

| Pergunta | Exemplos de busca em alta |
|---|---|
| O que faz? | "pedagogia o que faz" (+70%), "o que é psicologia" (+60%), "engenharia civil o que faz" (+40%) |
| Quanto tempo leva? | "pedagogia quantos anos" (+110%), "engenharia civil quantos anos" (+90%) |
| Quanto ganha? | "engenharia civil salário" (+250%), "piso da enfermagem" (+3.900%) |
| Como entrar e quanto custa? | nota de corte, Sisu, mensalidade, Fies e Prouni (fortes em Medicina e Engenharia Civil) |
| Dá para fazer EAD? | aparece em 6 das 7 profissões com dados |
| Existe caminho mais curto? | "técnico de enfermagem" é a busca nº 1 de Enfermagem; "assistente administrativo" +850% |

O Mapa responde a essas perguntas, sempre na mesma ordem, com fonte em cada número.

**Papel no produto.** O Mapa é o elo entre o Teste Vocacional (backlog) e a Sala Enem e Vestibular: o teste sugere profissões, o Mapa explica cada uma, e a Sala leva até a nota de corte.

**Quando.** As buscas por Medicina e Engenharia Civil disparam em janeiro e fevereiro (Sisu e resultados de vestibular), e as demais em março e agosto. Dezembro é o vale. A Fase 1 precisa estar no ar na primeira semana de janeiro de 2027.

## 2. Princípios

1. **Sério com leveza.** O público é jovem e adulto. Nada de tom infantil, exclamação em excesso ou piada que diminua a profissão.
2. **Todo número tem fonte e data.** Sem fonte, o número não é publicado. A fonte aparece ao tocar no número.
3. **Honestidade obrigatória.** Toda ficha tem a seção "O que ninguém te conta", com os pontos difíceis da profissão.
4. **O Diver informa, o aluno decide.** Nunca "você deveria", "você nasceu para" ou ranking de "melhores profissões".
5. **Neutro com instituições.** Não citar faculdades privadas por nome nem rankings comerciais. Universidades públicas só aparecem em dados oficiais.
6. **Público com menores de idade.** O Mapa não coleta dado pessoal novo. "Na mira" fica no estado do aluno e sincroniza pelo mecanismo existente.

### Tom de voz

| Faça | Evite |
|---|---|
| "A média de contratação fica abaixo do piso. Veja por quê." | "Enfermagem paga mal!" |
| "O plantão inclui noites, fins de semana e feriados." | "Diga adeus à vida social, kkk" |
| "Se isso te deu energia em vez de te assustar, vale explorar mais." | "Você nasceu para ser enfermeiro!" |
| "Essa pega muita gente." | "Errou feio, hein?" |
| "Dá para fazer melhor." | "Resposta incorreta." |

## 3. Onde fica no app

- **Barra lateral:** novo item "Profissões" (ícone de bússola). Se o padrão atual da barra pedir outro lugar, siga o padrão e registre a decisão no DIARIO.
- **Rotas:** `#profissoes` (mapa), `#profissoes-cartas` (Maré de cartas), `#profissoes-metodo` (Como fazemos as fichas), `#profissao-<id>` (ficha), `#profissao-<id>-dia` (Um dia como...), `#profissao-<id>-mitos` (Mito ou verdade) `#profissoes-comparar` (Fase 2) e `#profissoes-fundo` ("Quão fundo é cada carreira", 2026-10-17).
- **Acesso:** qualquer conta logada, sem matrícula. No modo local (sem Supabase), funciona igual.
- **Tutorial de primeiro acesso:** entrada nova em `js/tutorial.js`, com 3 passos (o mapa, a ficha e o "Um dia como"). Hoje, na versão 5 (2026-10-17), são 7 passos: o mapa, o álbum e a faixa "Agora", a ficha, o mergulho, a Maré, o comparador e os panoramas.

## 4. Telas

### 4.1 Mapa (`#profissoes`)

- Cabeçalho: título, uma linha de explicação e o contador "Explorado: X de N".
- Busca sem acento e sem diferenciar maiúsculas, usando o campo `busca` do índice (sinônimos como "enfermeiro" e "técnico de enfermagem").
- Filtros (Fase 1): área e "ficha pronta". Fase 2 (feito em 16/10/2026): o botão "Características" abre uma segunda fileira com as tags de `indice.json` → `filtros[]` (nome de cada uma). Vale a profissão que tem **todas** as marcadas, e o panorama de área some enquanto há característica marcada. As tags de cada profissão ficam também no índice, iguais às da ficha (o `conferir-ficha` confere).
- Regiões por área, cada uma com suas profissões. Estados de cada profissão: **em breve** (status `planejada` ou `rascunho`), **pronta** (`publicada`), **explorada** (o aluno já abriu) e **na mira** (o aluno marcou).
- Quando houver profissões na mira, elas aparecem numa faixa no topo.
- Admin e professor veem também as fichas em `rascunho`, com uma etiqueta, para revisar.
- **As profissões lado a lado** (2026-10-17), no pé do mapa, quando há 3 ou mais fichas abertas para quem está vendo: "Quanto dura a graduação" (as profissões agrupadas pelos anos, com a nota de quem tem caminho mais curto, de técnico ou tecnólogo) e "Onde dá para estudar a distância" (só presencial, presencial ou semipresencial, também a distância, depende do curso), cada quadro com a fonte embaixo. **O salário fica de fora de propósito:** ele estragaria o palpite de cada ficha. Os números vêm de `data/profissoes/numeros.json` (seção 5.3).
- **A releitura de 2026-10-17** (vídeos de referência do usuário; detalhes em `docs/MAPA_PROFISSOES_INTERACOES.md`, "A releitura com os vídeos de referência"): a frase do topo troca a parte final; **"Ver como"** (cartões, lista ou aquário, guardado só no aparelho); o **álbum de selos** das fichas abertas; a faixa **"Agora, às Xh"**, com o que cada profissão costuma fazer nesta hora; e o atalho para **"Quão fundo é cada carreira"** (4.6). Os cartões seguem o desenho dos panoramas.

### 4.2 Ficha (`#profissao-<id>`)

**Formato de relatório (2026-10-17;** pedido do usuário, a partir de um relatório de dados da Globo; detalhes em `docs/MAPA_PROFISSOES_INTERACOES.md`, "O formato de relatório"). Só o desenho mudou: o conteúdo, as rotas, o XP e o log são os mesmos. A ordem abaixo substitui a da repaginação de 2026-10-16:

1. **Capa:** área, nome, frase, "Ficha conferida em ... · N fontes", as ações (Viver um dia, Pôr na mira, Mito ou verdade, Comparar) e **"Ver resumo"** (as frases-tese, sem o salário; desde 2026-10-17, um baralho de cartas, e o "Você sabia?" que fala de salário ou repete o número de outra carta fica de fora). À direita, **"Em números"**: duração, formato, registro e "Quanto ganha?" (leva ao palpite; depois dele, mostra a média) e o atalho para o panorama da área.
2. **Faixa de capítulos** presa no topo; o capítulo da vez fica aceso.
3. Capítulos em **faixas numeradas**, cada um aberto pela **frase-tese** (`manchetes`) quando a ficha tem:
   - **01 O trabalho:** O que faz × O que não faz; Um dia de trabalho ao lado das **24 horas de um dia típico** (o trecho de agora aceso);
   - **02 A formação:** O que estuda e Como entrar (matérias-chave); **Quanto tempo até trabalhar** (linha do tempo das etapas na mesma régua de anos);
   - **03 O dinheiro:** o palpite em 4 faixas e, depois dele, todos os cargos, os pisos e a regra;
   - **04 O mercado:** o número gigante das matrículas, o **ranking dos 10 cursos com mais matrículas** (a profissão acesa, as outras em cinza; só quando a ficha tem a posição no Censo), **Onde e quando se busca** (mapa do Brasil em quadradinhos, comparação com outra profissão, tabela com os 27 estados e a sazonalidade) e a faixa **"Você sabia?"**;
   - **05 A carreira:** outros caminhos, profissões vizinhas e "Comparar";
   - **06 O que ninguém te conta:** os pontos numerados, todos à vista;
   - **07 Combina com você?:** DNA da profissão e O que você faria?;
   - **08 Fontes.**
4. Embaixo de cada gráfico, a linha **"Fonte:"** com o nome curto das fontes e as bolinhas que abrem cada uma.
5. **Citações como em artigo:** cada número ou afirmação com fonte recebe uma bolinha numerada, que abre a fonte num cartão; a lista inteira, numerada, abre no botão do capítulo Fontes, com título, órgão, data da consulta, tipo (primária ou secundária), link e pendência quando houver.
6. No capítulo Fontes: situação das três revisões (fontes, IA, profissional) e o caminho para reportar erro.

### 4.3 Um dia como... (`#profissao-<id>-dia`)

Jogo de decisões sobre a rotina real da profissão.

- 2 a 4 indicadores próprios de cada profissão (em Enfermagem: Segurança do paciente, Equipe e famílias, Energia). Barras simples, com `--turquesa` e `--amarelo`.
- 5 a 6 cenas ao longo de um dia, cada uma com horário, situação e 3 opções.
- Ao escolher: a opção fica marcada, os indicadores mudam e aparece o retorno ("Boa decisão." ou "Dá para fazer melhor."), sem culpa.
- Exatamente uma opção marcada como `melhor` por cena.
- Sem game over: o dia sempre termina. O fechamento traz uma reflexão sobre a profissão, não uma nota.
- Atalhos de teclado 1, 2 e 3 para as opções. Respeitar `prefers-reduced-motion`.
- **Regra de conteúdo:** as cenas tratam de prioridades, ética, comunicação e rotina. Nunca ensinam procedimento técnico (sem doses, sem técnica). Toda cena é revisada por um profissional da área antes de publicar.

### 4.4 Mito ou verdade (`#profissao-<id>-mitos`)

- 5 afirmações por ficha, uma por vez, botões "Mito" e "Verdade".
- Retorno com a resposta certa, uma explicação curta e a fonte.
- Se já existir um jogo de verdadeiro ou falso no motor, reaproveite a mecânica e converta `mitos` para o formato dele. Adapte o conversor, não o conteúdo.

### 4.5 Comparador (Fase 2, feito em 16/10/2026)

Duas profissões lado a lado com os 4 números, a seção "Como entrar" resumida e os caminhos.

- **Rotas:** `#profissoes-comparar` (escolhe duas: as da mira primeiro) e `#profissoes-comparar-<a>--<b>` (dois hífens separam os ids).
- **Trocar uma das duas** (2026-10-17): tocar no nome abre uma roleta com todas as fichas abertas, na ordem das áreas (setas, Page Up/Down, a letra inicial e Enter no teclado).
- **Entradas:** "Comparar profissões" no topo do mapa (só com 2 ou mais fichas abertas para a conta) e "Comparar com <vizinha>" no pé de "Profissões vizinhas" da ficha.
- **Blocos:**
  - duração, formato, média de contratação e registro, cada um com as fontes da própria ficha;
  - matérias que mais pesam para entrar;
  - caminhos depois de formado;
  - DNA das duas no mesmo radar, com uma frase sobre a maior diferença;
  - links para as fichas e para os "Um dia como".
- **Salário:** segue a regra da ficha. Se ainda estiver escondido (sem palpite), "Mostrar os dois salários" revela os dois de uma vez, como o "Prefiro ver direto".
- **Aluno:** enquanto não houver duas fichas publicadas, a tela explica que elas estão em revisão.
- **Log:** sem evento novo (não exigiu mudança no banco).

### 4.6 Quão fundo é cada carreira (`#profissoes-fundo`, 2026-10-17)

Os anos de estudo como profundidade, num mergulho que se rola (inspirado no *Size of Life*, de neal.fun). Código em `js/profissoes-mergulho.js` (extensão do pacote `profissoes`); dados de `data/profissoes/numeros.json` (`formacao` e `fontes_formacao`), sem baixar as fichas.

- **Paradas:** a superfície; o raso (técnicos e tecnólogos de até 3 anos, quando o caminho existe); uma parada para cada duração de graduação, de 4 anos para cima; o abismo (Medicina com a residência, depois de uma fossa tracejada); e o fim.
- **Profundímetro** preso na lateral, com a marca dos anos, que desce com a rolagem; "Mergulhar mais fundo" leva à próxima parada.
- Tocar numa profissão abre o detalhe: a etapa e quanto dura, o botão "Fonte", um "Você sabia?" (do índice, sem salário) e "Abrir a ficha".
- Só entram as fichas que a pessoa pode ver; enquanto todas estão em revisão, o aluno vê o aviso. Sem XP e sem evento novo no log.

## 5. Modelo de dados

### 5.1 `data/profissoes/indice.json` (leve)

- `areas[]`: `id`, `nome`, `cor` (token CSS existente) e `icone`.
- `profissoes[]`: `id`, `nome`, `area`, `onda`, `status`, `busca` e, quando houver ficha, `arquivo` e `frase`.

### 5.2 `data/profissoes/<id>.json` (ficha)

| Campo | Obrigatório | Conteúdo |
|---|---|---|
| `id`, `versao`, `nome`, `area`, `frase` | sim | Identificação. O `id` nunca é renomeado. |
| `status` | sim | `planejada`, `rascunho`, `validada` ou `publicada` |
| `conferido_em` | sim | Data da última conferência das fontes (AAAA-MM-DD) |
| `revisao` | sim | `fontes`, `ia`, `profissional` (`pendente` ou `ok`), `revisor` e `data` |
| `tags[]` | sim | Para filtros e, no futuro, para o Teste Vocacional |
| `numeros` | sim | `duracao`, `formato`, `salario` e `registro`, cada um com `valor`, `detalhe` e `fontes[]` |
| `contexto` | não | Curiosidade com número e fonte (ex.: posição no Censo) |
| `secoes` | sim | `o_que_faz`, `dia_a_dia`, `o_que_estuda`, `como_entrar`, `quanto_ganha`, `caminhos`, `ninguem_conta` e `vizinhas` |
| `dia` | não | `titulo`, `subtitulo`, `aviso`, `indicadores[]`, `cenas[]`, `fechamento` e `recompensa` |
| `mitos[]` | sim | Mínimo 5: `id`, `afirmacao`, `verdade`, `explicacao` e `fontes[]` |
| `fontes[]` | sim | `id`, `titulo`, `orgao`, `url`, `consultado_em`, `tipo` (`primaria` ou `secundaria`), `dados_atualizados_em` e `nota` opcionais. A ordem da lista define a numeração das citações |
| `carta` | não | `fato` e `fontes[]` para a Maré de cartas (também pode ficar no índice, para profissões sem ficha) |
| `agora[]`, `agora_nota` | não | Faixas `{de, ate, texto}` cobrindo as 24 horas |
| `formacao` | não | `nota` e `etapas[]` (`nome`, `anos_de`, `anos_ate`, `texto`, `tipo`: `alternativa`, `principal` ou `depois`, `fontes[]`) para o infográfico da formação |
| `dna`, `dna_calibrado` | não | Seis eixos de 0 a 100: `pessoas`, `pressao`, `corpo`, `rotina`, `numeros`, `criatividade` |
| `dilemas[]` | não | `id`, `situacao`, `opcoes[]` (`texto`, `recomendada`), `resposta`, `fontes[]` |
| `trends_id` | não | Chave em `trends/trends.json` para "Onde e quando se busca" |
| `manchetes` | não | Frases-tese do relatório (2026-10-17), por capítulo: `trabalho`, `formacao`, `dinheiro`, `mercado`, `ninguem`, `combina`. Cada uma com `titulo` (até 70 caracteres), `linha` (apoio, até 200) e `fontes`. Só fatos que já estão na ficha; número sempre com fonte; nunca "você deveria". Sem elas, o capítulo abre só com a faixa |
| `contexto.curso_censo` | não | Nome do curso no Censo, quando é diferente do nome da ficha (Sistemas: "Sistemas de Informação"); vai para o ranking das matrículas |
| `secoes.quanto_ganha.chute` | não | `pergunta` (a pergunta do palpite). Desde a repaginação (2026-10-16), `min`, `max`, `passo`, `inicial` e `segunda` ficam no JSON, mas o app não os usa: as 4 faixas saem da média |
| `secoes.quanto_ganha.medias[].faixa` | não | `de`, `ate`, `rotulo` (percentis 25 e 75 ou faixa comum de contratação) |

### 5.3 `data/profissoes/numeros.json` (gerado, 2026-10-17)

Os números que comparam uma profissão com as outras, para o relatório da ficha e o mapa lerem sem baixar as 22 fichas. **Não se edita à mão:** sai das fichas por `node scripts/gerar-numeros-profissoes.mjs` (e `--conferir` só confere; sai com 1 se estiver desatualizado). Rode depois de mexer em qualquer ficha.

- `matriculas_2024`: o ranking dos cursos com mais matrículas, só com as fichas que têm `contexto.matriculas_2024` **e** `contexto.posicao_ranking_matriculas` (o total do curso, o mesmo critério para todas; número só do presencial ou só da EAD não entra). O script avisa fonte diferente, posição faltando ou fora de ordem.
- `profissoes.<id>`: média do cargo principal, anos da graduação, caminho mais curto (técnico ou tecnólogo que termina antes da graduação), formato de oferta (`presencial`, `semi`, `ead` ou `depende`, lido de `numeros.formato.valor`) e matrículas.
- `fontes_mapa`: o nome das normas citadas embaixo dos quadros do mapa.
- Desde 2026-10-17, também, por profissão: `duracao` e `registro` (como a ficha escreve, para as etiquetas dos cartões), `agora` (as cenas do dia: `de`, `ate`, `texto`, para a faixa "Agora" do mapa) e `formacao` (as etapas: `tipo`, `nome`, `anos_de`, `anos_ate`, `texto`, `fontes`); e, no topo, `fontes_formacao` (cada fonte citada nas etapas, com título, órgão, link e data da consulta), para o mergulho "Quão fundo é cada carreira". O script avisa quando uma etapa cita fonte que não está na ficha ou quando o mesmo id tem títulos diferentes em duas fichas.

Regras:

- Todo id citado em qualquer `fontes[]` precisa existir em `fontes` da própria ficha.
- `revisar_com_profissional: true` marca trechos que só podem ser publicados depois da revisão humana.
- `materias_chave` usa ids dos cursos da Sala Enem. Confira os ids reais em `data/trilhas/catalogo.json` e corrija na ficha se forem diferentes.
- Campos novos entram sempre como opcionais.

## 6. Economia, conquistas e log

- Toda recompensa passa por `js/economia.js`, dentro do teto de bônus de jogo.
- **Um dia como...:** 30 XP e 3 pérolas, uma vez por profissão.
- **Mito ou verdade:** recompensa igual à do jogo de verdadeiro ou falso existente, uma vez por profissão.
- **Abrir uma ficha:** sem XP, para não virar fazenda de pontos.
- **Conquistas novas:** "Explorador de carreiras" (abrir 5 fichas) e "Um dia na pele" (concluir 3 "Um dia como").
- **Log de atividade** (`eventos_atividade`, sem tabela nova): `profissao_vista`, `profissao_mira`, `profissao_dia_concluido`, `profissao_mitos_concluido` e `profissao_materias_chave`. O Admin ganha o bloco "Profissões mais vistas", derivado do log.

## 7. Conteúdo, fontes e validação

### 7.1 Hierarquia de fontes

1. Leis, decretos e resoluções (Planalto, MEC e CNE).
2. Dados oficiais: Inep (Censo da Educação Superior), e-MEC, Sisu.
3. Conselhos profissionais (Cofen, CFM, OAB, CFP, CFC, Confea e outros).
4. Salários: Novo Caged (MTE), direto ou por portal que cite o Caged, com período e data.
5. Imprensa só para contexto ou para achar a fonte primária, nunca como única fonte de um número.

Fonte `secundaria` com `nota` é pendência: antes de publicar, troque pela primária sempre que ela existir.

### 7.2 Salário

- Sempre como "média de contratação com carteira (salário-base)", com período, e com a ressalva de que adicionais não entram.
- Quando houver piso em lei, mostrar o piso e a regra de aplicação.
- Fontes de salário vencem em 180 dias: o Admin mostra "Fichas com fonte vencida".

### 7.3 Fluxo de produção

1. A skill `criar-ficha-profissao` pesquisa e escreve a ficha (`status: rascunho`).
2. `node scripts/conferir-ficha.mjs data/profissoes/<id>.json` confere estrutura e fontes.
3. A skill `validar-fontes` emite o parecer em `docs/validacoes/`.
4. Opcional: a ficha entra na Fila de Validação para a camada de fato do Mergulho Triplo, só com aprovação do admin, senha e custo visível.
5. Revisão por um profissional da área (`revisao.profissional: ok`, com nome e data).
6. `status: publicada`.

## 8. Lista de profissões

**Onda 1 (12 fichas, Fase 1).** Os 10 cursos com mais matrículas no Censo da Educação Superior 2024 (Pedagogia, Administração, Direito, Enfermagem, Sistemas, Psicologia, Ciências Contábeis, Educação Física, Medicina e Fisioterapia), mais Engenharia Civil (busca focada em carreira no Trends) e Gestão de Pessoas (entre os cursos com mais ingressantes).

**Onda 2 (10 fichas, Fase 2).** Cursos disputados no Sisu e profissões vizinhas que aparecem nas buscas: Odontologia, Medicina Veterinária, Nutrição, Farmácia, Biomedicina, Arquitetura e Urbanismo, Engenharia de Produção, Ciência da Computação, Inteligência Artificial e Jornalismo e Publicidade.

**Onda 3.** Carreiras técnicas como fichas próprias, carreiras públicas e profissões novas.

**Situação em 16/10/2026.** As 22 fichas das Ondas 1 e 2 estão escritas, a pedido do usuário ("sobe todas as outras profissões"):

- todas passam no `conferir-ficha` sem erro e sem aviso;
- todas estão como `rascunho`: a equipe vê, e o aluno vê "Em breve";
- nenhuma das 21 novas tem "Um dia como" (fica para a Fase 2);
- a pesquisa de normas, leis e salários foi feita uma vez para todas, e cada ficha foi escrita e conferida em separado;
- parecer das fontes: `docs/validacoes/profissoes-fichas-2026-10-16.md`.

Para publicar, cada ficha precisa da revisão de um profissional da área e do OK do usuário.

## 9. Fases e critério de pronto

### Fase 1, até a primeira semana de janeiro de 2027

- Integrar a implementação de referência (`js/profissoes.js`, `js/profissoes-infograficos.js`, `css/profissoes.css`, rotas e ganchos), conforme `docs/MAPA_PROFISSOES_INTEGRACAO.md`.
- `scripts/conferir-ficha.mjs` no fluxo de produção.
- Enfermagem publicada depois da revisão profissional, com o "Um dia como".
- As outras 11 fichas da Onda 1, escritas uma por vez com a skill `criar-ficha-profissao`, com tudo menos o "Um dia como".
- Log, conquistas, tutorial e bloco do Admin.

**Pronto quando:** as 12 fichas passam no `conferir-ficha`, cada número abre fonte e data, o fluxo foi testado no celular e no computador, e o ambiente de testes foi aprovado pelo Allisson.

### Fase 2, até o fim de fevereiro de 2027

"Um dia como" para Medicina, Direito, Psicologia, Administração e Engenharia Civil, o comparador, os filtros por tag e a Onda 2.

**Situação em 16/10/2026:** tudo escrito e testado. São 6 fichas com "Um dia como" (Enfermagem e as cinco acima), todas `rascunho`, com as cenas marcadas `revisar_com_profissional`; o comparador e os filtros ficam em `#profissoes`. Falta a revisão de profissionais das cenas antes de publicar.

### Fase 3

Teste Vocacional ligado às `tags`, objetivo de curso no Cronograma ("quero Enfermagem" ajusta os pesos) e páginas públicas geradas por script (`scripts/gerar-paginas-profissoes.mjs`) para quem chega pelo Google.

## 10. Indicadores

- Fichas abertas por semana e por profissão.
- Percentual de quem abre o "Um dia como" e chega ao fim.
- Profissões na mira por aluno.
- Cliques em "Matérias-chave", ou seja, quanto o Mapa leva o aluno a estudar.

## 11. Regras técnicas (as de sempre)

- HTML, CSS e JavaScript puros, sem build, com caminhos relativos e arquivos em minúsculas.
- Conteúdo dos JSON no HTML só por `textContent`, nunca por `innerHTML`.
- `localStorage` e IndexedDB sempre em `try/catch`.
- Cores só por tokens de `css/estilo.css`. Confirmações só com `UI.confirmar`.
- Alvos de toque de pelo menos 44 px, foco visível e nada comunicado só por cor.

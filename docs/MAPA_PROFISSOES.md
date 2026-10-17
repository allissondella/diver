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
- **Rotas:** `#profissoes` (mapa), `#profissoes-cartas` (Maré de cartas), `#profissoes-metodo` (Como fazemos as fichas), `#profissao-<id>` (ficha), `#profissao-<id>-dia` (Um dia como...), `#profissao-<id>-mitos` (Mito ou verdade) e `#profissoes-comparar` (Fase 2).
- **Acesso:** qualquer conta logada, sem matrícula. No modo local (sem Supabase), funciona igual.
- **Tutorial de primeiro acesso:** entrada nova em `js/tutorial.js`, com 3 passos (o mapa, a ficha e o "Um dia como").

## 4. Telas

### 4.1 Mapa (`#profissoes`)

- Cabeçalho: título, uma linha de explicação e o contador "Explorado: X de N".
- Busca sem acento e sem diferenciar maiúsculas, usando o campo `busca` do índice (sinônimos como "enfermeiro" e "técnico de enfermagem").
- Filtros (Fase 1): área e "ficha pronta". Fase 2 (feito em 16/10/2026): o botão "Características" abre uma segunda fileira com as tags de `indice.json` → `filtros[]` (nome de cada uma). Vale a profissão que tem **todas** as marcadas, e o panorama de área some enquanto há característica marcada. As tags de cada profissão ficam também no índice, iguais às da ficha (o `conferir-ficha` confere).
- Regiões por área, cada uma com suas profissões. Estados de cada profissão: **em breve** (status `planejada` ou `rascunho`), **pronta** (`publicada`), **explorada** (o aluno já abriu) e **na mira** (o aluno marcou).
- Quando houver profissões na mira, elas aparecem numa faixa no topo.
- Admin e professor veem também as fichas em `rascunho`, com uma etiqueta, para revisar.

### 4.2 Ficha (`#profissao-<id>`)

Ordem fixa (como na implementação de referência):

1. Área, nome, frase de uma linha e selo de situação (em revisão, validada). Ao lado, o atalho para o panorama da área, quando houver.
2. Ações numa linha: **Viver um dia** (se a ficha tiver `dia`), **Pôr na mira**, **Mito ou verdade** e **Comparar** (com a primeira vizinha que tem ficha).
3. Quatro números: duração, formato, registro profissional e "Quanto ganha?" (leva ao palpite; depois dele, mostra a média), cada um com o botão "Fonte".
4. **Faixa de capítulos** presa no topo; o capítulo da vez fica aceso.
5. Capítulos abertos (sem acordeão), nesta ordem (repaginação de 2026-10-16, `docs/MAPA_PROFISSOES_INTERACOES.md`):
   - **Visão geral:** O que faz e O que não faz lado a lado; Um dia de trabalho e o **Agora mesmo** (relógio de 24 h com o que o profissional provavelmente está fazendo, campo `agora`);
   - **O que ninguém te conta:** cartas para revelar (borda em `--coral`);
   - **Formação e entrada:** O que estuda e Como entrar (com as matérias-chave) lado a lado, e o infográfico **Quanto tempo até trabalhar**;
   - **Quanto ganha:** o **palpite** em 4 faixas (ou "Prefiro ver direto"), a resposta com a régua da faixa comum e da média, e depois todos os cargos, os pisos e a regra;
   - **Carreira:** outros caminhos, profissões vizinhas, "Comparar" e **Onde e quando se busca** (barras por estado com comparação e sazonalidade);
   - **Combina com você?:** **DNA da profissão** (radar e Carta Diver) e **O que você faria?** (dilema);
   - **Fontes.**
6. **Citações como em artigo:** cada número ou afirmação com fonte recebe `[n]`, que leva à lista numerada de fontes no fim, com título, órgão, data da consulta, tipo (primária ou secundária), link e pendência quando houver.
7. Rodapé: situação das três revisões (fontes, IA, profissional) e o caminho para reportar erro.

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
| `secoes.quanto_ganha.chute` | não | `pergunta` (a pergunta do palpite). Desde a repaginação (2026-10-16), `min`, `max`, `passo`, `inicial` e `segunda` ficam no JSON, mas o app não os usa: as 4 faixas saem da média |
| `secoes.quanto_ganha.medias[].faixa` | não | `de`, `ate`, `rotulo` (percentis 25 e 75 ou faixa comum de contratação) |

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

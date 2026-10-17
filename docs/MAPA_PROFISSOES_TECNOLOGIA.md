# Panorama da Tecnologia (adendo v1.2)

> Complementa `docs/MAPA_PROFISSOES.md`. Primeiro "panorama de área" do Mapa: uma área grande demais para uma ficha só, apresentada como dez áreas com rotinas distintas e um jogo de afinidade. Implementado em `js/profissoes-panorama.js` (até 16/10/2026, `profissoes-tecnologia.js`; extensão de `js/profissoes.js`) com dados em `data/profissoes/tecnologia.json`.

## Por que um panorama, e não uma ficha

"Tecnologia" não é uma profissão. A ficha de Sistemas de Informação diria o curso, mas não ajudaria a pessoa a saber se ela quer passar o dia escrevendo código, em reunião com usuários, cuidando de servidores de madrugada ou investigando ataques. O panorama existe para essa decisão anterior: **em qual rotina eu me enxergo?**

O mesmo formato serve depois para Saúde (medicina tem dezenas de especialidades), Engenharias e Direito.

## O que o panorama tem

| Bloco | Conteúdo | Fonte principal |
|---|---|---|
| Quatro números | profissionais com carteira, formandos por ano, habilidades mais pedidas, quem vai ao escritório | Brasscom 2026, Stack Overflow 2026 |
| Contexto | o gargalo é a passagem para o 1º emprego; linguagens mais usadas; EAD permitido em computação | Brasscom, Stack Overflow, Censo 2024, Decreto 12.456 |
| Quanto paga cada área | barras com a média de contratação (Caged) da ocupação mais próxima de cada área | Portal Salário / Novo Caged, por CBO |
| As dez áreas | cartões com apelido ("Quem constrói", "Quem protege"), resumo, média e um gosto típico | — |
| Que curso fazer | tabela com técnico, ADS, CC, SI, Eng. de Software e Eng. de Computação, durações e horas mínimas | CNE/CES 2/2007 e 5/2016, catálogos do MEC |
| Jogo | "Que área da tecnologia é a sua praia?", 12 situações | — |
| Fontes | 18 fontes numeradas, citadas ao longo da página | — |

## Cada área (`#tecnologia-<id>`)

Desenvolvimento, Dados e análise, IA e aprendizado de máquina, Segurança, Infraestrutura/nuvem/DevOps, Suporte, Qualidade e testes, Produto/UX/design, Jogos, Sistemas embarcados/IoT.

Cada uma traz: quatro números (média, faixa P25–P75, "lida com pessoas", afinidade pelo jogo), **Um dia típico** (linha do tempo com seis momentos), O que faz com "Combina com quem" e "Pense duas vezes se", ferramentas, Quanto ganha (faixa salarial em SVG por CBO, com nota quando a área não tem CBO próprio), DNA da área (radar contra o DNA do aluno), formação, como a carreira costuma andar (júnior → liderança), O que ninguém te conta, áreas vizinhas e as fontes citadas.

As rotinas são ilustrativas e estão marcadas "a revisar com profissionais". Elas não podem ser publicadas sem um profissional de cada área ler.

## O jogo: como funciona e por que assim

- 12 situações concretas (app que travou, trabalho em grupo, notícia de vazamento, telefone às 3 da manhã, crítica a um colega…), cada uma com 4 opções. **Nenhuma opção fala de tecnologia diretamente**: o jogo mede reações, não conhecimento prévio.
- Cada opção soma pontos em uma ou mais áreas (`pontos`). A afinidade de uma área é `pontos obtidos ÷ máximo possível daquela área`, em %. Quem responde de forma coerente chega perto de 100% na área dele; respostas aleatórias ficam em torno de 30–40%.
- O resultado mostra as três mais parecidas, com um texto por faixa (60% ou mais, 35 a 59%, abaixo), o salário médio e o botão "Ver o dia a dia", e as outras sete em barras. Nunca diz "você deve"; o aviso "afinidade é informação, não veredito" fica no topo.
- Recompensa: 30 XP e 3 pérolas, uma vez. O resultado fica no estado (`tec.jogo`) e aparece no panorama e nas áreas ("Sua afinidade").
- Dá para voltar uma situação e refazer.
- `scripts/conferir-panorama.mjs` garante que toda área aparece em pelo menos 5 opções, que não há área desconhecida e que cada situação tem 3 ou mais opções.

## Limites conhecidos (honestidade com o aluno e com o Code)

1. **Quatro áreas não têm CBO próprio** (IA, jogos, embarcados, produto). O salário mostrado é o da ocupação em que costumam ser registradas, com nota visível. Gerente de produto, em especial, ganha bem mais que o designer de UX mostrado.
2. A pesquisa do Stack Overflow é global; serve para ferramentas e hábitos, não para salário nem para o mercado brasileiro.
3. As rotinas de "Um dia típico" são composições a partir de descrições de cargo. Precisam de 1 a 2 profissionais por área para revisar.
4. O DNA de cada área é estimativa inicial (`dna_calibrado` ausente = não calibrado).

## Para o Code

- Carregar `js/profissoes-panorama.js` depois de `js/profissoes.js` (até 16/10/2026 o arquivo se chamava `profissoes-tecnologia.js`; virou genérico com o Panorama da Medicina). Ele se registra sozinho via `Profissoes.registrarExtensao`.
- Rotas novas: `#profissoes-tecnologia`, `#profissoes-tecnologia-jogo`, `#tecnologia-<id>`. O roteador do app só precisa repassar para `Profissoes.montar`, como já faz com as outras.
- Eventos novos no log: `tecnologia_panorama`, `tecnologia_area_vista`, `tecnologia_jogo_inicio`, `tecnologia_jogo_concluido` (com `top` e `pct`).
- Recompensa nova via gancho: `{ tipo: 'tecnologia_jogo', xp: 30, perolas: 3 }`.
- Conquista sugerida: **Dez em dez** (abrir as dez áreas).
- O índice (`indice.json`) ganhou `areas[].panorama` e `panoramas[]`; o mapa mostra o cartão "Panorama da Tecnologia" no topo da região Tecnologia.
- Rodar `node scripts/conferir-panorama.mjs data/profissoes/tecnologia.json` no fluxo de produção.

## Próximos panoramas

Saúde (especialidades médicas e profissões da saúde), Engenharias e Direito seguem o mesmo JSON: `numeros`, `contexto`, `formacao_geral`, `areas[]`, `jogo`, `fontes`. O módulo JS é genérico o bastante para ler outro arquivo; basta registrar no índice e trocar o caminho na extensão (ou generalizar a extensão para ler `panoramas[]`).

## Como ficou no app (2026-10-16)

O kit v1.2 trazia a sua própria versão de `js/profissoes.js` e `css/profissoes.css`. Elas não foram copiadas: o panorama usa as mesmas peças da ficha, e só os dados e o verificador vieram como estão. **Repaginado em 2026-10-16** junto com a aba inteira (`docs/MAPA_PROFISSOES_INTERACOES.md`, "A aba repaginada"): saíram a abertura em tela cheia, o guia com "Próximo", a doca, a aposta "qual área paga mais?" e o chute em cada área. O palpite de salário ficou só nas fichas; no panorama, o salário aparece aberto, para comparar as áreas. **Em 2026-10-17 virou relatório**, como as fichas (`docs/MAPA_PROFISSOES_INTERACOES.md`, "O formato de relatório"): capa com "Em números", capítulos em faixas numeradas e "Fonte:" embaixo de cada gráfico. Só o desenho mudou: textos, números, rotas, XP e log são os mesmos.

**O que o aluno vê (a equipe vê agora; o aluno, quando o panorama for publicado):**

- **Mapa:** o cartão "Panorama da Tecnologia" em "Explore por dentro", com os apelidos das primeiras áreas ("Quem constrói", "Quem protege"...). A busca também o acha ("devops", "dados", "segurança"…).
- **Panorama (`#profissoes-tecnologia`):**
  - **capa:** "Descobrir a minha área", "Estudar tecnologia", "Ver resumo" (os fatos do contexto) e "Em números" (os números do setor; o que está em porcentagem, "18% vão ao escritório todo dia", vira os cem quadradinhos de "Antes de escolher");
  - capítulos numerados, com a faixa presa no topo: **01 As dez áreas**, **02 O dinheiro**, **03 Antes de escolher**, **04 Que curso fazer**, **05** o jogo, **06 Comece a estudar** e **Fontes**;
  - **"As dez áreas" é um explorador**: "O que importa para você?" ordena os cartões (Mais contato com pessoas, Mais pressão e adrenalina, Mais rotina, Mais esforço físico, Mais números, Mais criatividade, Maior salário e, depois do jogo, "Mais parecidas comigo"). Cada cartão traz o apelido, o nome, o resumo, três barras do perfil (a do critério escolhido fica amarela), o salário (média ou "referência") e o selo "Explorada";
  - **O dinheiro:** as áreas com ocupação própria no Caged na mesma régua (faixa comum e média), da maior para a menor média; cada linha abre a área. As que usam o salário de uma ocupação próxima ("referência": IA, Jogos e Embarcados) ficam fora, com o nome na nota;
  - **Antes de escolher:** a introdução ao lado dos cem quadradinhos e os fatos do setor, numerados;
  - **Que curso fazer:** cada curso numa linha, a duração na mesma régua de anos (a parte listrada é o que varia, como "1 a 2 anos"), a carga mínima e a fonte embaixo.
- **Área (`#tecnologia-<id>`):**
  - **faixa com as dez áreas** no topo (rola de lado; a da vez fica acesa): trocar de área é um toque;
  - capa com o apelido, o nome e o resumo; "Em números": média, faixa comum e a sua afinidade (depois do jogo);
  - capítulos numerados: **01 O trabalho** (o que faz; o dia típico ao lado de "Combina com quem gosta de" e "Pense duas vezes se"; as ferramentas, com a fonte), **02 O dinheiro** (cada cargo com a régua da faixa comum e da média e, embaixo, a área acesa entre as outras), **03 Formação e carreira** (a escada), **04 Combina com você?** (DNA), **05 O que ninguém te conta** (numerado, à vista), **06 Áreas vizinhas** e **Fontes**;
  - em "Formação", os cursos do Diver que servem à área: Explora Tech em todas, e Cibersegurança Essencial e ISO/IEC 27001 Foundation na de Segurança;
  - no pé, "área anterior / próxima" (as dez em sequência).
- **Jogo (`#profissoes-tecnologia-jogo`):**
  - 12 situações, teclas 1 a 4 e "Voltar";
  - um só atalho de teclado por vez (o do kit deixava dois depois de "Voltar");
  - o resultado mostra as porcentagens, o apelido e o salário de cada área;
  - 30 XP e 3 pérolas na primeira vez, pela economia.
- **Reduzir movimento:** tudo aparece pronto, sem animação.

**Peças e regras:**

- `js/profissoes.js` tem `registrarExtensao` e `_util` com as peças comuns que a ficha e o panorama usam: `topoPagina`, `capaRelatorio` e `linhaEmNumeros` (capa e "Em números"), `caixaResumo` ("Ver resumo"), `capituloRelatorio` (faixa numerada e frase-tese), `indiceCapitulos`, `calloutsNumerados`, `fonteLinha` ("Fonte:"), `linhasCargos`, `regua`, `dominioDe`, `fontesGuardadas` e, desde 2026-10-17, `palpite` (a régua do palpite), `semReais` e `revelarReais` (o "R$ ?" no meio do texto).
- O roteador do app manda `#profissoes-tecnologia[-jogo]` e `#tecnologia-<id>` para a tela Profissões. O módulo entra no pacote `profissoes`.
- **Quem vê:** `indice.json` → `panoramas[].status`. Em `rascunho`, a equipe e o modo local veem; o aluno vê "Em breve" com "Quero ver este panorama" (vira `profissao_pedido` com `profissao: "tecnologia"`).
- **Estado:** `diver:v1:profissoes` → `tec`. Os campos são `areasVistas`, `jogo`, `jogoConcluido` e, desde 2026-10-17, `salario` de novo: o palpite de cada área e o "Quem ganha mais?" (formato em `docs/MAPA_PROFISSOES_INTERACOES.md`, "As artes e o salário depois do palpite nos panoramas"). O que ficou da aposta e do chute por área de antes da repaginação conta como "já viu"; `chutes["tecnologia:<área>"]` continua guardado, sem uso.
- **Log:** os 4 tipos `tecnologia_*` e `profissao_materias_chave` com `profissao: "tecnologia"`. Da repaginação até 2026-10-17, o panorama não gravava `profissao_chute_salario`; agora grava de novo, com `panorama` e `area` (ou `jogo: "quem-ganha-mais"`).
- **Conquista geral "Dez em dez"** (abrir as dez áreas), no Perfil.
- **Admin:** no bloco do Mapa, as áreas mais vistas, quem começa e quem termina o jogo, e a área que mais fica em 1º lugar.
- **Tutorial:** o passo "Explore por dentro" (versão 3 do roteiro, na repaginação; versão 4 no formato de relatório). Ao publicar o panorama, suba `profissoes` em `VERSOES` (`js/tutorial.js`) só se o texto do roteiro mudar.

**Para publicar:** depois da revisão das rotinas por profissionais de cada área, troque `status` para `"publicada"` em `data/profissoes/tecnologia.json` e em `indice.json` (`panoramas[]`). Rode `node scripts/conferir-panorama.mjs data/profissoes/tecnologia.json`. Os salários vencem 180 dias depois da data dos dados: o verificador avisa.


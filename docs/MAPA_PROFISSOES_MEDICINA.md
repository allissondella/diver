# Panorama da Medicina (adendo v1.3)

> Segundo panorama de área do Mapa, no mesmo formato do de Tecnologia (`docs/MAPA_PROFISSOES_TECNOLOGIA.md`). Dados em `data/profissoes/panorama-medicina.json` (no kit, `medicina.json`: o nome mudou porque `medicina.json` já é a ficha da profissão); telas em `js/profissoes-panorama.js` (módulo genérico, que agora serve os dois). Rotas: `#profissoes-medicina`, `#medicina-<id>`, `#profissoes-medicina-jogo`.

## Por que Medicina precisa de um panorama

Medicina é o curso mais disputado do país, e quem entra costuma imaginar uma profissão só. São 55 especialidades reconhecidas, com rotinas opostas: a dermatologista sem plantão e o intensivista que vive de plantão; o radiologista que quase não vê paciente e a médica de família que conhece três gerações da mesma casa. O panorama existe para o aluno sentir essas diferenças antes de entrar, porque a decisão da especialidade vem só seis anos depois, e com residência disputada.

## O que o panorama mostra

| Bloco | Conteúdo | Fonte principal |
|---|---|---|
| Quatro números | 597 mil médicos (59,1% especialistas), 55 especialidades, 48% esperam mais de um ano pela residência, bolsa de R$ 4.106 | Demografia Médica 2025, CFM, Portaria da bolsa |
| Contexto | sete especialidades com metade dos títulos; médicos sem especialização cresceram 59%; mulheres 50,9%; Enamed; EAD proibido | DMB 2025, Enamed, Decreto 12.456 |
| Quanto paga cada especialidade | barras com a média de contratação CLT por CBO, com o aviso de que a jornada CLT é de 19 a 25 h e a renda total vem de outros vínculos | Novo Caged por CBO |
| Doze especialidades | Clínica Médica, Cirurgia Geral, Pediatria, GO, Anestesiologia, Cardiologia, Ortopedia, Psiquiatria, Radiologia, Medicina de Família, Dermatologia, Emergência e Intensiva | — |
| Formação | graduação (6 anos, 7.200 h), Enamed, residência (2 a 5 anos, 60 h/semana) e título por prova | DCN, Enamed, CFM |
| Jogo | "Que especialidade médica é a sua?", 12 situações | — |

**Critério de escolha das doze:** as sete maiores em número de especialistas (DMB 2025) mais cinco escolhidas por contraste de rotina e por procura (Psiquiatria, Radiologia, Medicina de Família, Dermatologia, Emergência/Intensiva). A Onda 2 do panorama pode trazer Neurologia, Oftalmologia, Oncologia, Infectologia, Patologia, Medicina do Trabalho e Cirurgia Plástica.

## Cada especialidade

Mesma estrutura das áreas de tecnologia: dia típico (seis momentos), o que faz, "combina com quem" e "pense duas vezes se", ferramentas, salário com faixa P25–P75, DNA em radar, formação (duração da residência e pré-requisitos, pela Resolução CFM), caminhos, o que ninguém te conta, vizinhas e fontes.

## O jogo

Doze situações de dentro do hospital e da vida: o primeiro dia de internato, o paciente que conta a vida, o telefone às 3 da manhã, a criança chorando com os pais filmando, sangue e cheiros, a má notícia, a rotina dos próximos 30 anos, o tempo de residência que a pessoa aceita. Cada opção pontua especialidades; a afinidade é a razão entre pontos obtidos e máximo possível. Um jogador coerente chega a 100% na especialidade dele (testado). Recompensa de 30 XP e 3 pérolas, uma vez.

## Limites conhecidos

1. **Salário médico pelo Caged é parcial.** Os contratos CLT têm 19 a 25 horas semanais; a maior parte da renda vem de PJ, cooperativas, consultório e procedimentos. O panorama diz isso em destaque e usa os valores só para comparar especialidades. Cardiologia, Dermatologia e Emergência/Intensiva usam o CBO de clínico como referência, com nota.
2. Medicina de Família: a função "médico da estratégia de saúde da família" tem média de R$ 18.219 dentro do CBO de clínico, citada na nota.
3. As rotinas são composições a partir de descrições de especialidade e precisam de revisão por um médico de cada uma. A professora Georgia (radiologista, revisora dos cursos de Radiologia do Diver) é a primeira revisora natural.
4. A Resolução CFM 2.330/2023 foi revogada pela 2.380/2024, que mantém a lista; conferir as durações na vigente.

## Para o Code

Nada novo além do que o adendo de Tecnologia já pede: o módulo é o mesmo. O índice registra o panorama em `panoramas[]` e o cartão "Panorama da Medicina" aparece no topo da região Saúde. Conquista sugerida: **Doze em doze**. `node scripts/conferir-panorama.mjs data/profissoes/panorama-medicina.json` passa.

## Como ficou no app (16/10/2026)

- **Mesmo módulo e mesmo desenho da Tecnologia.** O módulo é `js/profissoes-panorama.js`, a extensão genérica (antes `profissoes-tecnologia.js`). Ela lê os rótulos do JSON (`rotulo`, `cor`, `rotulo_area`, `rotulo_areas`, `titulo_areas`, `rotulo_vizinhas`, `nota_salarios`, `jogo.chamada`, `jogo.chamada_curta`, `jogo.titulo_resultado`). O `tecnologia.json` ganhou os mesmos campos, só de rótulo.
- **Rotas:** `#profissoes-medicina`, `#medicina-<especialidade>` e `#profissoes-medicina-jogo`. O cartão "Panorama da Medicina" fica em "Explore por dentro", no topo do mapa.
- **Repaginado em 2026-10-16** (pedido do usuário: "as informações por área da medicina estão bagunçadas de entender para separar por especialidade"):
  - as doze especialidades viram um **explorador**: "O que importa para você?" ordena os cartões (mais contato com pessoas, mais pressão, mais rotina, maior salário...), e cada cartão mostra o apelido ("Quem escuta", "Quem enxerga por dentro"), o resumo, três barras do perfil e o salário;
  - a página de cada especialidade abre com uma **faixa com as doze** (a da vez acesa; trocar é um toque), o cabeçalho, quatro números e os capítulos (Como é o trabalho, Quanto ganha, Formação e carreira, Combina com você?, O que ninguém te conta, Especialidades vizinhas, Fontes);
  - saíram a aposta "qual especialidade paga mais?" e o chute em cada especialidade: no panorama o salário aparece aberto, e o palpite ficou só nas fichas.
- **Formato de relatório (2026-10-17)**, igual ao das fichas e ao da Tecnologia (`docs/MAPA_PROFISSOES_TECNOLOGIA.md`, "Como ficou no app"). Só o desenho mudou; textos, números, rotas, XP e log são os mesmos:
  - **panorama:** capa com "Ver resumo" (os cinco fatos do contexto) e "Em números" (médicos registrados, especialidades reconhecidas e a bolsa de residência); capítulos **01 Doze especialidades para começar** (o explorador), **02 O dinheiro** (as 8 especialidades com CBO próprio na mesma régua; as 4 de referência ficam fora, com o nome na nota, junto do aviso da jornada), **03 Antes de escolher** (a introdução e os cem quadradinhos: 48% esperam mais de um ano pela residência), **04 Que curso fazer** (graduação, Enamed, residência e título na mesma régua de anos; o que não se mede em anos fica sem barra), **05** o jogo, **06 Comece a estudar** e **Fontes**;
  - **cada especialidade:** capa com "Em números" (média, faixa comum e a sua afinidade); **01 O trabalho**, **02 O dinheiro** (os cargos e a especialidade acesa entre as outras; nas 4 de referência, só a nota), **03 Formação e carreira**, **04 Combina com você?**, **05 O que ninguém te conta** (numerado, à vista), **06 Especialidades vizinhas** e **Fontes**.
- **Salário:**
  - em "Maior salário", as 8 especialidades com CBO próprio vêm primeiro; as 4 que usam o clínico "(referência)" vêm depois, com a palavra "referência" no cartão: Cardiologia, Medicina de Família, Dermatologia e Emergência e Intensiva;
  - na página de cada especialidade, a nota do salário explica a referência.
- **Ponte com os cursos:** "Estudar para entrar" abre o Enem · Biologia. Em Radiologia aparecem também os 4 cursos da sala Radiologia. A ficha de Medicina leva ao panorama em "Outros caminhos".
- **Estado do aluno:** fica em `diver:v1:profissoes`, na chave `med` (a Tecnologia continua em `tec`).
- **Log:** tipos `medicina_panorama`, `medicina_area_vista`, `medicina_jogo_inicio` e `medicina_jogo_concluido`, no `setup.sql`. Aplicados nos dois bancos (testes e produção, 2026-10-16).
- **Recompensa:** `medicina_jogo`, 30 XP e 3 pérolas, uma vez.
- **Admin:** linhas da Medicina no bloco do Mapa: especialidades mais vistas, quem começa e quem termina o jogo, e a especialidade em 1º lugar.
- **Conquista:** "Doze em doze".
- **Quem vê:** o panorama segue `rascunho`. A equipe vê; o aluno vê "Em breve" e pode pedir.

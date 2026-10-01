# Diver — como o código funciona hoje

> Retrato técnico do app **como ele está**. Serve para qualquer sessão do Claude Code entender o código antes de mexer.
> Quando algo mudar de lugar, atualize este arquivo no mesmo commit.

## Visão geral
- HTML, CSS e JavaScript puros, sem build. Abre em qualquer servidor estático (Live Server, `python3 -m http.server`, GitHub Pages).
- Uma página só (`index.html`) com várias telas (`<section class="tela">`); só uma fica visível por vez.
- **Barra lateral** com as áreas (fixa no computador a partir de 960 px; gaveta aberta pelo botão ☰ no celular). O endereço muda para `#secao` (ex.: `#jogos`), então o botão Voltar do navegador funciona.
- Durante um quiz ou um jogo a barra lateral some (classe `modo-foco` no `<body>`): uma ação principal por tela.
- Scripts **clássicos** com `defer` (sem módulos ES), cada um expondo um objeto global. Ordem de carregamento:

| Ordem | Arquivo | Global | Responsabilidade |
| --- | --- | --- | --- |
| 0 | `js/config.js` | `DIVER_CONFIG` | URL e chave pública do Supabase de **produção** e de **testes**; escolhe pelo endereço (`allissondella.github.io` = produção, o resto = testes) e expõe `ambiente`. Vazio = **modo local** (sem login). Fora da produção, o `index.html` põe a classe `ambiente-testes` e mostra a `.faixa-testes`. Guia: `docs/AMBIENTES.md`. |
| 1 | `js/trilhas.js` | `Trilhas` | Encontrar, carregar, validar, importar e criar trilhas JSON. |
| 2 | `js/progresso.js` | `Progresso` | localStorage por trilha: XP, níveis, pérolas, streak, meta, repetição espaçada, fases, jogos, caixas de Leitner. |
| 3 | `js/conquistas.js` | `Conquistas` | As 13 conquistas e a verificação. |
| 4 | `js/economia.js` | `Economia` | **Único** lugar que concede XP/pérolas fora do Mergulho/Simulado/Revisão: Resultado padrão dos jogos, tarefas, foco, gasto de pérolas. Valores em `Economia.CONFIG`. |
| 5 | `js/quiz.js` | `Quiz` | Motor do Mergulho, Simulado e Revisão (aprovado; não mexer no comportamento). |
| 6 | `js/ui.js` | `UI`, `Dados` | Ferramentas de interface (`h()`, ícones, toasts, mascote, datas) e `Dados` (localStorage com try/catch). |
| 6a | `js/mascotes.js` | `Mascotes` | Rostos do Diver para escolher no Perfil ("Seu mascote"): 4 pinguins, 7 mergulhadores, 2 mergulhadoras e 4 tons de pele. Preenche os encaixes do `<template id="molde-mascote">` (`.d-pele`, `.d-rosto-atras`, `.d-cilios`, `.d-rosto-frente`), então as expressões e animações valem para todos. `aplicar()` roda no início e depois do login (a escolha pode vir da nuvem); `miniatura(rosto, tom)` desenha as opções do Perfil. Padrão: pinguim de penacho. |
| 6b | `js/nuvem.js` | `Nuvem` | Cliente do Supabase só com `fetch`: login, renovação de sessão, troca de senha, reautenticação por senha (`confirmarSenha`), Edge Functions (`funcao`), REST/RPC e **Sincronia** (espelha `diver:v1:*` na tabela `estado`). |
| 6c | `js/conta.js` | `Conta` | Telas de login e de troca de senha obrigatória; `Conta.garantir()` segura o app até a pessoa estar pronta. |
| 7 | `js/cartas.js` | `Cartas` | Transforma a trilha em cartas para os jogos (blocos opcionais + derivação das questões). |
| 8 | `js/jogos/registro.js` | `Jogos` | Catálogo da Sala de Jogos, contrato e `Jogos.resultado()`. |
| 9 | `js/jogos/comum.js` | `JogoComum` | Pergunta de múltipla escolha com feedback, atalhos e "detalhe" padrão. |
| 10 | `js/jogos/<id>.js` | — | Um arquivo por jogo, que se registra com `Jogos.registrar({...})`. |
| 10b | `js/quadros.js` | `Quadros` | Tarefas em quadros: quadros → listas (colunas) → cartões, com subtarefas, etiquetas, prazo, notas com links, seção "Concluídas", arrastar e soltar (mouse e toque longo), atalhos, exportar/importar JSON. Expõe `render`, `comPrazo()` (para o Calendário e o Início) e `abrirTarefa(id)`. |
| 11 | `js/organizar.js` | `Organizar` | Calendário + gerador de cronograma, Modo Foco e o resumo "Seu dia" (lê as tarefas de `Quadros.comPrazo()`). |
| 12 | `js/biblioteca.js` | `Biblioteca` | Cursos e trilhas (estudar, exportar, criar colando texto) e PDFs (IndexedDB). |
| 13 | `js/perfil.js` | `Perfil` | Nível geral somando as trilhas, tabela por trilha, backup. |
| 13b | `js/admin.js` | `Admin` | Área da equipe. Admin ("Pessoas e cursos"): cadastrar aluno, professor ou admin (senha temporária), mudar o tipo de conta, atribuir cursos, nova senha, ativar/desativar, ver progresso. Professor ("Meus alunos"): só acompanha os alunos dos cursos dele. |
| 13c | `js/leitor-prova.js` | `LeitorProva` | Lê uma prova antiga (texto ou PDF) e separa questões, alternativas, gabarito e comentários, sem IA. O PDF passa pelo **pdf.js** (`lib/pdfjs/`, Apache-2.0, v3.11 legacy), carregado só quando alguém envia um PDF, com `isEvalSupported: false`. |
| 13d | `js/provas-enviadas.js` | `ProvasEnviadas` | "Upload de prova" no Simulado: formulário, palavra de honra, conferência, lista "Provas antigas" (as do aluno e as do professor) e as regras de pontos. |
| 13d2 | `js/fila-validacao.js` | `FilaValidacao` | Admin → "Fila de Validação" do Mergulho Triplo: lotes com custo estimado, aprovar/executar com reautenticação por senha, rejeitar, destravar, baixar resultado; mostra se as chaves das IAs existem (nunca o valor). |
| 13e | `js/tutorial.js` | `Tutorial` | "Primeiro mergulho" de cada área: recorte de luz sobre o alvo + balão com desenho, "2 de 4", Pular/Voltar/Próximo, teclado (Enter/→, ←, Esc) e foco preso no balão. Roteiros em `ROTEIROS` (chave = endereço); passo cujo alvo não está visível é pulado. `App.navegar` chama `Tutorial.aoEntrar(secao)`; "Como funciona esta página?" (barra lateral) e "Rever todos os tutoriais" (Perfil). |
| 14 | `js/app.js` | `App` | Navegação, barra lateral, Início (Seu dia + Desafio do Dia), painel da trilha, Sala de Jogos, quiz, resumo. Começa no `DOMContentLoaded`. |

CSS: `css/estilo.css` (base, tokens, barra lateral, quiz, resumo), `css/areas.css` (áreas novas), `css/jogos.css` (jogos). Só variáveis de cor (tokens), nada de cor solta.

## Áreas (barra lateral) e telas
| Endereço | Tela | Quem desenha |
| --- | --- | --- |
| `#inicio` | `tela-inicio`: mascote, escolha de trilha, "Bora mergulhar!", **Seu dia** (Desafio do Dia, meta, tarefas de hoje, próximos eventos) | `app.js` |
| `#mergulho` | `tela-painel`: status, mapa de profundidades, atalhos, conquistas | `app.js` |
| `#simulado` | `tela-simulado`: montar simulado, **Provas antigas** (`#provas-enviadas`) e histórico de notas | `app.js` + `provas-enviadas.js` |
| `#upload-prova` | `tela-upload-prova`: enviar a prova (arquivo ou texto, tempo, palavra de honra) e conferir as questões | `provas-enviadas.js` |
| `#revisao` | `tela-revisao`: fila de revisão, "Revisar agora", "Tirar da fila" | `app.js` |
| `#jogos` | `tela-jogos`: Sala de Jogos por grupo, com estado de cada jogo | `app.js` |
| (sem endereço) | `tela-jogo` (partida), `tela-quiz`, `tela-resumo` | `app.js` + jogos |
| `#tarefas` | Quadros de tarefas (listas e cartões) | `quadros.js` |
| `#calendario` | Calendário (mês/semana) + gerador de cronograma | `organizar.js` |
| `#foco` | Modo Foco 25/5 ou 50/10 | `organizar.js` |
| `#cursos` | Cursos e trilhas | `biblioteca.js` |
| `#pdfs` | PDFs | `biblioteca.js` |
| `#perfil` | Perfil e backup | `perfil.js` |
| `#prova` | `tela-prova`: regras, pré-requisito (todas as fases), tentativas | `app.js` |
| `#admin` | `tela-admin` (admin e professor; conteúdo muda conforme o tipo de conta) | `admin.js` |
| `#fila` | `tela-fila`: Fila de Validação do Mergulho Triplo (só admin) | `fila-validacao.js` |
| (sem endereço) | `tela-login`, `tela-senha` (antes do app, com login ativo) | `conta.js` |

- A **trilha atual** é escolhida no Início (cards + barra fixa `#inicio-cta` com o curso escolhido e o "Bora mergulhar!") ou no seletor da barra lateral (`#seletor-trilha`: botão + lista no padrão listbox, setas/Home/End/Enter/Esc, fecha ao clicar fora; `desenharSeletorTrilha` no `app.js`). A cortina de transição é `cortina(texto)` no `app.js`. Áreas que dependem dela: Mergulho, Simulado, Revisão e Sala de Jogos.
- Mascote: `<template id="molde-mascote">` (pixel art: WebP animado; PNG parado com "reduzir movimento"). `UI.montarMascotes()` copia para cada `[data-mascote]`; `UI.humorMascote(container, 'feliz' | 'triste' | null)`.
- Todo conteúdo vindo de JSON entra com `textContent` (função `UI.h()`), nunca com `innerHTML`. Os únicos `innerHTML` são SVGs fixos do código (chefões, jangada, mapa do tesouro).
- `append`/`replaceChildren` nativos escrevem "null" se receberem `null`: use `UI.h()` ou `.filter(Boolean)`.

## Login, admin e nuvem (Supabase)
- **Liga/desliga:** `js/config.js` (carregado antes de tudo, sem `defer`). Com URL e chave preenchidas, o `<html>` ganha a classe `exige-login` e **a primeira tela é o login**: nada do app aparece até o `conta.js` colocar a classe `logado`. Vazio, roda no modo local. Passo a passo para criar o projeto: `docs/SUPABASE.md`.
- **Banco:** `supabase/setup.sql` (pode rodar de novo). Tabelas: `perfis` (email, nome, **papel** `aluno`/`professor`/`admin`, admin (= papel admin, compatibilidade), trocar_senha, ativo), `matriculas` (aluno_id, trilha_id), `estado` (usuario_id, chave, valor jsonb). RLS: cada pessoa só lê/grava o que é dela; o admin lê tudo; o professor lê o perfil e as matrículas dos alunos que estão nos cursos dele e, do `estado`, só as chaves `diver:v1:trilha:<curso>` desses cursos (nada de tarefas ou agenda); perfis e matrículas só mudam por funções. Funções de apoio: `eh_admin()`, `eh_professor()`, `professor_do_curso(trilha)`, `aluno_do_professor(pessoa)`.
- **Funções (RPC):** `admin_criar_usuario(p_email, p_nome, p_trilhas, p_papel)` → senha temporária; `admin_definir_papel(p_usuario, p_papel)` (ninguém tira o próprio acesso de admin); `admin_definir_matriculas(p_usuario, p_trilhas)`; `admin_redefinir_senha(p_usuario)` → senha temporária; `admin_atualizar_usuario(p_usuario, p_nome, p_ativo)` (desativar = bloqueio no Auth); `senha_trocada()`. Internas, sem acesso pelo app: `diver_criar_conta(...)` (cria login + perfil; usada para o primeiro admin no SQL Editor) e `diver_senha_temporaria()`.
- **Senha temporária:** toda conta nasce com `trocar_senha = true`; no primeiro login o app obriga a criar uma senha própria (mín. 8, letras e números).
- **Quem vê o quê:** aluno e professor veem só as trilhas das suas matrículas; o admin vê todas. Importar/criar trilhas só aparece para o admin (ou no modo local). Admin e professor podem abrir a prova final sem completar as fases (para conferir).
- **Sincronia:** a cada 4 s e ao sair da página, o que mudou em `diver:v1:*` sobe para `estado`; no login, tudo desce e substitui o local. Sair limpa os dados do navegador. PDFs (IndexedDB) não sincronizam. A sessão fica em `diver:sessao` (fora do backup e da sincronia).
- **Segurança:** nenhuma chave secreta no repositório; o app se recusa a usar uma chave `service_role`/`secret`. Dados de pessoas (e o e-mail do admin) nunca vão para o repositório.

## Motor Diver e Mergulho Triplo (Fila de Validação)
Validação de questões por duas IAs pagas, **sempre** com aprovação do admin por senha (detalhes e passo a passo: `docs/MOTOR_DIVER.md`, seção 11).
- **Fila:** tabela `fila_validacao` (fim do `supabase/setup.sql`): RLS só admin, lote nasce `pendente` (gatilho), status muda só pelas funções `fila_aprovar` (exige senha digitada há ≤ 5 min: claim `amr` do token, via `senha_recente`), `fila_rejeitar` e `fila_destravar`, ou pela Edge Function.
- **Edge Function** `supabase/functions/mergulho-triplo/index.ts` (Deno): ações `status` (só diz se as chaves existem) e `executar` (admin + senha ≤ 5 min + lote `aprovado` → `executando` → `concluido`). Chaves só via `Deno.env.get` (Secrets do Supabase). O miolo fica em `supabase/functions/_shared/` (`mergulho-nucleo.mjs` com prompts/funil/custo, `ias.mjs`, `processar-lote.mjs`), compartilhado com os scripts.
- **Tela** `#fila` (`js/fila-validacao.js`, só admin): custo estimado, "Aprovar e executar" com `Nuvem.confirmarSenha` (reautenticação) → `rpc fila_aprovar` → `Nuvem.funcao('mergulho-triplo')`.
- **Scripts locais (sem IA):** `scripts/fila.mjs` (`simular`, `enviar`, `listar`, `baixar`, com login de admin digitado no terminal) e `scripts/buscar-similares.mjs` (busca no `data/acervo/<materia>.json` por palavras, TF-IDF). O `baixar` aplica o bloco `validacao` nas questões, move as reprovadas duas vezes para o bloco `emRevisao` (ignorado pelo app) e grava as aprovadas no acervo.

## Formato do JSON de trilha (nomes reais dos campos)
```json
{
  "id": "enem-vestibular",
  "nome": "Travessia: Enem e Vestibular",
  "descricao": "Texto curto do card da trilha.",
  "categoria": "Enem e vestibular",
  "fases": [ { "id": "raso", "nome": "Raso", "profundidade": "0–10 m", "descricao": "Aquecimento" } ],
  "questoes": [
    { "id": "enem-raso-01", "tema": "Matemática", "dificuldade": "facil", "fase": "raso",
      "enunciado": "Pergunta?", "alternativas": ["A", "B", "C", "D"], "correta": 0, "explicacao": "..." }
  ],
  "pares":           [ { "id": "enem-par-01", "termo": "Mitocôndria", "definicao": "Produz ATP", "tema": "Biologia" } ],
  "verdadeiroFalso": [ { "id": "enem-vf-01", "afirmacao": "...", "verdadeira": false, "explicacao": "...", "tema": "Biologia" } ],
  "adivinhas":       [ { "id": "enem-adv-01", "resposta": "Fotossíntese", "aceitas": ["fotossintese"], "dicas": ["...", "..."], "explicacao": "...", "tema": "Biologia", "dificuldade": "facil" } ],
  "sequencias":      [ { "id": "enem-seq-01", "titulo": "Fases da mitose", "itens": ["Prófase", "Metáfase", "Anáfase", "Telófase"], "explicacao": "...", "tema": "Biologia" } ],
  "palavras":        [ { "id": "enem-pal-01", "palavra": "Mitocôndria", "dica": "Usina de energia da célula", "tema": "Biologia" } ]
}
```
- Obrigatórios: `id`, `nome`, `descricao`, `fases`, `questoes`. `categoria`, `prova` e **todos os blocos depois de `questoes` são opcionais**.
- `fasesLivres` (opcional, `true`): todas as fases começam abertas e o aluno escolhe a ordem (`Progresso.faseDesbloqueada`; vale também para o Chefão). Sem o campo, cada fase libera a próxima.
- `prova` (opcional): `{ "questoes": 40, "minutos": 60, "aprovacao": 65, "exigeFases": true }`. Sem o bloco: até 40 questões, 1,5 min por questão, 70% e exige as fases.
- `fases[].resumo` (opcional) — leitura **"Antes de mergulhar"**, aberta por um botão embaixo da fase no mapa (janela `<dialog>` em `app.js`, função `abrirResumo`; funciona até com a fase bloqueada): `{ "introducao": "texto", "pontos": ["**Termo**: explicação"], "tabela": { "titulo": "...", "colunas": ["..."], "linhas": [["..."]] }, "perolas": ["..."] }`. Todos os campos são opcionais; `**negrito**` vira `<strong>` (nunca HTML). A primeira coluna da tabela é o cabeçalho da linha.
- Questão: `dificuldade` = `facil` | `medio` | `dificil`; `correta` = índice a partir de 0; alternativas embaralhadas na exibição.
- `Trilhas.validar()` só confere as questões; blocos opcionais malformados são ignorados pelo `cartas.js`.

## Como as trilhas são encontradas (`Trilhas.carregarTodas`)
1. `data/trilhas/indice.json` (lista de arquivos). **No GitHub Pages este é o único caminho.**
2. Listagem do diretório (Live Server, `python3 -m http.server`).
3. Trilhas importadas pelo botão "Carregar trilha (.json)" ou criadas em Cursos ("Criar trilha colando texto"), guardadas em `diver:v1:trilhasImportadas`.

## Sala de Jogos: contrato (implementado)
```js
Jogos.registrar({
  id: 'memoria', nome: 'Memória', grupo: 'rapidos', icone: 'i-concha', descricao: '...', duracao: '2-5 min',
  requer: { pares: 6 },                        // tipo de carta: mínimo (padrão { multipla: 4 })
  opcoes: [{ id: 'pares', rotulo: 'Tamanho', valores: [[6, '6 pares'], [8, '8 pares']], padrao: 6 }], // opcional
  iniciar(ctx) { /* monta a tela em ctx.container */ return { destruir() {} }; },
});
// ctx = { container, trilha, cartas, prog, opcoes, aoTerminar(resultado), gastarPerolas(n) }
// resultado = Jogos.resultado({ jogoId, trilha, detalhes, inicio, comboMaximo, bonus, pontuacao, titulo, subtitulo, ... })
// detalhe  = JogoComum.detalhe(carta, acertou, { inicio, pergunta, resposta, sua, neutro })
```
- `cartas` vem de `Cartas.derivar(trilha)`: `{ multipla, vf, flash, pares, adivinhas, sequencias, palavras }`.
- Estado do card: `disponivel` | `precisa` (falta conteúdo) | `embreve`. Núcleo (Mergulho, Simulado, Revisão) aparece na Sala e abre a própria área.
- `Economia.aplicarResultado()`: detalhe cujo `cartaId` é uma questão da trilha passa pela repetição espaçada (`Progresso.registrarResposta`); o resto por `Progresso.registrarAvulsa`. `neutro: true` ("Quase" nas Cartas do Fundo) conta como estudo, sem acerto nem erro. XP por acerto = tabela do Mergulho + combo (3+ seguidos, +5); bônus do jogo com teto (`CONFIG.bonusMaximo`); Desafio do Dia dobra o XP.

## localStorage (sempre com try/catch, via `Dados` ou funções do Progresso)
| Chave | Conteúdo |
| --- | --- |
| `diver:v1:trilha:<id>` | Progresso da trilha: `xp`, `perolas`, `fases`, `questoes` (peso, acertos, erros, marcada), `streak`, `metaDiaria`, `hoje`, `conquistas`, `simulados`, `stats`, `jogos` (partidas, melhor), `leitner` (caixa 1–5 por carta). |
| `diver:v1:ultimaTrilha` | Trilha atual. |
| `diver:v1:trilhasImportadas` | Trilhas importadas ou criadas no app. |
| `diver:v1:quadros` | Tarefas: `{ versao, quadroAtual, quadros: [{ id, nome, listas: [ids], ocultarConcluidas }], listas: { id: { nome, cor, ordenacao (manual/prazo/titulo), tarefas: [ids] } }, tarefas: { id: { titulo, notas, prazo, etiquetas: [ids], subtarefas: [{ id, titulo, feita }], concluida, concluidaEm, criadaEm, trilhaId, xpConcedido } }, etiquetas: [{ id, nome, cor }] }`. A ordem dos cartões é a ordem do array da lista. A chave antiga `diver:v1:tarefas` (Kanban de 4 colunas) é migrada sozinha para o "Quadro principal" e apagada. |
| `diver:v1:eventos` | Eventos do calendário: `id, titulo, tipo (prova/aula/estudo/descanso), data, hora, trilhaId, gerado`. |
| `diver:v1:desafios` | Dias em que o Desafio do Dia foi cumprido (`{ "AAAA-MM-DD": true }`). |
| `diver:v1:provas-enviadas` | Provas antigas: `{ versao, provas: [{ id, trilhaId, titulo, criadaEm, honesto, minutos, questoes: [{ id, tema, dificuldade, enunciado, alternativas, correta, explicacao }], tentativas: [{ data, acertos, total, nota, tempoSeg, xp, perolas }] }], feitas: { idDaProvaDoProfessor: [tentativas] } }`. Sincroniza com a nuvem como o resto. |
| `diver:v1:mascote` | Mascote escolhido: `{ rosto, tom }` (ids de `Mascotes.ROSTOS` e `Mascotes.TONS`). Sincroniza com a nuvem. |
| `diver:v1:tutorial` | Tutoriais já vistos: `{ vistos: { inicio: true, mergulho: true, ... } }`. Sincroniza com a nuvem. |
| `diver:sessao` | Sessão de login (tokens). Não sincroniza e não entra no backup. |

O progresso da trilha também guarda `provas` (prova final: data, total, acertos, nota, pct, aprovado, tempoSeg).

**Supabase** → tabela `provas_curso` (`id, trilha_id, titulo, autor_id, autor_nome, minutos, questoes jsonb, criado_em`): provas que o professor ou o admin publicam para os alunos de um curso. Veem: matriculados no curso e admin. Publicam: professor do curso e admin (autor e nome vêm do login, por gatilho). Apagam: o autor (se ainda der aula no curso) e o admin. Ninguém edita.

**IndexedDB** `diver` → store `pdfs`: `{ id, nome, tamanho, trilhaId, criadoEm, arquivo (Blob), notas }`. PDFs não entram no backup do Perfil.

## Regras de jogo implementadas
- **Prova final** (`modo: 'prova'` no `quiz.js`): sorteio simples da trilha, sem feedback no meio, cronômetro, em branco = erro, aprovação pela % mínima; liberada ao completar todas as fases (admin e professor podem fazer antes, para conferir). Conquista "Aprovado!".
- **Prova enviada** (`modo: 'enviada'` no `quiz.js`): as questões vêm da prova, na ordem original; sem feedback no meio, cronômetro opcional (1, 2 ou 3 min por questão), em branco = erro. Não entram na revisão espaçada nem no "Marcar para revisar". Pontos só na entrega, por `Economia.pontuarProvaEnviada` (cada acerto vale uma questão média + combo):
  - prova do **aluno**: XP **sem pérolas** se ele escolheu "Eu juro que fui honesto e vou pontuar"; **0** em "Eu dei uma espiadinha e não vou pontuar";
  - prova do **professor** (tabela `provas_curso`): XP **e** pérolas para o aluno; quem é da equipe faz em modo conferência (0);
  - refazer vale **metade**; sair no meio não vale nota nem pontos.
- **Leitor de prova** (`LeitorProva.interpretar`): questão = "1." / "1)" / "01 -" / "Questão 1" (número solto só abre questão se for o próximo da sequência); alternativa = "a)" / "(A)" / "A." / "A -", uma por linha ou todas na mesma linha; gabarito = bloco final "Gabarito"/"Respostas" ("1-C 2-A", "01. B", tabela de números e letras, "Anulada") ou "Resposta: C" logo depois da questão, "*A)" e "(correta)". Remove cabeçalho repetido e número de página, desfaz hifenização. PDF escaneado (sem texto) é recusado com aviso. Nada é salvo sem passar pela conferência.
- **Mergulho/Simulado/Revisão**: como na Fase 0 (ver `docs/JOGOS.md`). Continuam dando XP pelo `quiz.js`; a migração para o contrato/economia é a tarefa D7/D8.
- **Níveis:** `NIVEIS` em `js/progresso.js` (10 níveis, Mestre Diver = 2.100 XP). O Perfil soma o XP de todas as trilhas no "nível geral".
- **Tarefas:** concluir (bolinha ou Alt+Enter) dá +10 XP e +1 pérola uma única vez por tarefa (no curso escolhido no cartão ou no atual). Reabrir e concluir de novo não dá XP outra vez; subtarefas não dão XP.
- **Modo Foco:** bloco de foco completo dá +15 XP e +2 pérolas na trilha atual.
- **Desafio do Dia:** jogo + trilha sorteados pela data (funciona offline), XP em dobro.
- **Streak/meta:** contam questões respondidas (quiz e jogos); tarefas e foco não contam.

## Acessibilidade implementada
Foco visível (amarelo); alvos ≥ 44 px; `aria-live` em feedbacks e avisos; atalhos 1–6 / A–F nas alternativas (quiz e jogos), V/F no Quiz Relâmpago, Espaço + 1/2/3 nas Cartas do Fundo, setas na Memória, Enter + setas na Corrente do Tempo, teclado físico na Forca; Esc fecha a barra lateral; `prefers-reduced-motion` (bolhas somem, mascote vira PNG parado, animações desligam).

## Como testar
- Abrir com Live Server (ou `python3 -m http.server`) e passar por cada área da barra lateral, no celular (360–390 px) e no computador.
- Casos que sempre vale repetir: fase completa, fase sem oxigênio, Revisão, Simulado com nota e com tempo esgotado, uma partida de cada jogo, tarefa arrastada até "Feito", cronograma gerado, PDF enviado e aberto, "Carregar trilha" via `file://`.

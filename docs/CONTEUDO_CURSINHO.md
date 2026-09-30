# Diver — Cursinho Pré-Vestibular: pipeline de conteúdo e cronograma de validações

> Este é o **primeiro produto pago** do Diver. O padrão de exigência aqui é mais alto do que nas trilhas de teste: zero cópia de fonte protegida, zero erro factual não revisado, zero questão sem validação humana antes de ir ao ar. Leia isto antes de começar a gerar qualquer conteúdo.

## 0. Onde ficam as fontes

As fontes (matriz, provas, apostilas de referência) **nunca ficam dentro da pasta do repositório**. Elas moram em uma pasta separada no computador de quem está construindo, por exemplo:

```
~/diver-fontes/
  00-matriz/
  01-provas/<vestibular>/<ano>/
  02-apostilas-referencia/<cursinho>/
  LEIA-ME.md   (origem e data de cada arquivo)
```

Se por algum motivo uma cópia precisar ficar temporariamente dentro da pasta do projeto, adicione o caminho ao `.gitignore` **antes** de colocar qualquer arquivo lá, e confirme com `git status` que nada foi rastreado. Processe **uma matéria por vez** (não jogue todas as provas de todos os anos numa sessão só).

## 1. Regras de direitos autorais (gate zero)

Nenhuma tarefa deste pipeline começa sem passar por aqui primeiro.

| Fonte | Situação | Regra de uso |
|---|---|---|
| Provas do Enem (Inep) | **Confirmado em 29/09/2026.** O portal do Inep publica o site sob licença **Creative Commons Atribuição-SemDerivações 3.0 (CC BY-ND)**, que permite uso comercial. Não existe página de termos de uso separada para os PDFs de "Provas e Gabaritos" — vale o rodapé geral do site. Reforçado pelo art. 8º, IV da Lei 9.610/98 (atos oficiais) e por jurisprudência favorável (não vinculante). | **Aprovado para uso na íntegra**, seguindo a política detalhada abaixo (uso literal, atribuição obrigatória, restrição de onde pode aparecer, triagem de conteúdo de terceiro). Decisão fechada — não é mais item pendente. |
| Vestibulares institucionais (Fuvest, Unicamp/Comvest, UERJ etc.) | Cada instituição define suas próprias regras; nenhuma confirmada até agora. | Checar o edital/termos de cada uma individualmente antes de usar. Até confirmar, tratar como as apostilas (só inspiração). |
| Apostilas de cursinhos (Anglo, Objetivo, Positivo, Bernoulli...) | Conteúdo proprietário de concorrentes diretos. | Usar **só** como referência de abordagem pedagógica (progressão de dificuldade, tipos de pegadinha). **Nunca** copiar ou parafrasear de perto enunciados, exercícios ou explicações. |

**Regra geral:** toda questão que não for do Enem é escrita do zero. Provas e apostilas de outras fontes servem para entender *o que* cai e *como* costuma ser cobrado — não como texto-fonte a reescrever.

### 1.1 Política de uso das questões do Enem (íntegra)

A licença CC BY-ND permite reprodução comercial **sem alterar a obra**. Isso define três regras técnicas obrigatórias, não opcionais:

1. **Uso literal, sem adaptação.** A questão do Enem entra exatamente como o Inep escreveu — mesmo enunciado, mesmas alternativas, mesma imagem/texto de apoio. Nenhuma reescrita, resumo ou tradução.
2. **Restrita a jogos que exibem a questão inteira e sem modificação:** Mergulho, Simulado, Revisão e Prova final. **Proibido** usar questão do Enem como fonte para Memória, Forca, Adivinha Aí, Caça ao Tesouro, Chefão, Maré Alta, Corrente do Tempo, Torre ou Duelo — esses jogos decompõem/reformatam a questão, o que caracteriza obra derivada e quebra a proteção do "ND". Esses jogos continuam usando só questões originais, inspiradas no estilo do Enem.
3. **Atribuição obrigatória em cada questão**, visível para o aluno: `"fonte": "Enem <ano>, questão <número> — Inep/MEC"` no JSON, exibida na tela.

### 1.2 Triagem obrigatória de conteúdo de terceiro (o maior risco real)

Nem o art. 8º nem a licença do Inep cobrem poemas, letras de música, tirinhas, charges, fotos ou trechos de livro/reportagem usados **dentro** da questão — esses continuam do autor original. Antes de qualquer questão do Enem entrar no curso, ela passa por esta checagem, questão por questão:

- [ ] A questão contém uma tirinha, charge ou foto **completa**? → Excluir a questão, ou substituir por uma versão original inspirada no mesmo conceito.
- [ ] A questão contém um poema ou letra de música **inteiros**? → Excluir a questão (citação de trecho pequeno pode ficar; a obra inteira, não).
- [ ] A questão contém um trecho de livro/reportagem? → Se for um trecho curto (citação), pode manter com crédito ao autor original além do crédito ao Inep. Se for o texto todo, excluir.

Essa triagem é obrigatória mesmo que pareça repetitiva — não presumir "essa deve estar ok" sem checar.

## 2. O pipeline, etapa por etapa

| # | Etapa | Responsável | Entrada | Saída |
|---|---|---|---|---|
| 1 | Mapeamento curricular | Você + Claude Code | Matriz + provas 2019–2025 | Lista de temas por matéria, com peso (frequência real nas provas) |
| 2 | Checagem de direitos por fonte | Você (e advogado, se necessário) | Lista de fontes usadas | Sinal verde/vermelho por fonte, registrado neste arquivo |
| 3 | Produção do conteúdo | Claude Code (seguindo a Skill `criar-trilha`) | Mapeamento aprovado | Questões originais no formato JSON do Diver, por fase |
| 4 | Checagem automática de originalidade | Claude Code | Conteúdo gerado + textos-fonte | Relatório de trechos suspeitos (se houver, reescrever) |
| 5 | Revisão técnica | Claude Code | Conteúdo gerado | JSON validado, compatível com todos os jogos aplicáveis |
| 6 | Revisão de especialista por matéria | Professor(a)/especialista humano | Conteúdo técnico validado | Conteúdo aprovado ou lista de correções |
| 7 | Calibração de dificuldade | Você + especialista | Conteúdo aprovado | Fases reordenadas por dificuldade real (fácil→difícil coerente com os dados da etapa 1) |
| 8 | Piloto com usuários reais | Estudantes de teste (beta) | Curso completo de uma matéria | Lista de erros e confusões reportados |
| 9 | QA final pré-cobrança | Você | Curso após o piloto | Checklist de lançamento assinado (seção 4) |
| 10 | Manutenção contínua | Você + Claude Code | Erros reportados por alunos pagantes | Correção em até 48h, log no `docs/DIARIO.md` |

## 3. Cronograma de validações (o que checar, e quando)

### Antes de escrever qualquer questão
- [ ] Termos de uso do Inep para provas do Enem verificados nesta data.
- [ ] Termos de cada vestibular institucional que será usado, verificados individualmente.
- [ ] Confirmado por escrito (mesmo que uma nota sua aqui) que nenhuma apostila de cursinho será usada como texto-fonte, só como referência de abordagem.

### Por matéria, antes de considerar "pronta"
- [ ] Cobertura da matriz: todo tema com peso relevante nas provas 2019–2025 tem pelo menos uma questão.
- [ ] Checagem de originalidade: nenhum trecho de 8+ palavras idêntico a uma fonte.
- [ ] Toda questão tem explicação da resposta correta, revisada por humano.
- [ ] Fatos específicos (datas, fórmulas, nomes, valores numéricos) conferidos por um especialista — é o tipo de erro que a IA mais comete e o mais visível para quem paga.
- [ ] Dificuldade calibrada contra dados reais (uma questão marcada "fácil" precisa ter taxa de acerto histórica compatível, quando esse dado existir).
- [ ] Testada em pelo menos 3 jogos diferentes da Sala de Jogos (não só no Mergulho).

### Antes de qualquer aluno pagar
- [ ] Piloto concluído com pelo menos 10 estudantes reais na fase de vestibular/Enem.
- [ ] Todos os erros críticos do piloto corrigidos.
- [ ] Termos de uso e política de privacidade do Diver publicados (ver `docs/PRODUTO.md`, seção de LGPD).
- [ ] Decisão tomada sobre Redação (seção 5) — mesmo que a decisão seja "fica para depois", isso precisa estar explícito, não esquecido.
- [ ] Teste de ponta a ponta: escolher o curso, jogar em pelo menos 3 modos, ver XP/pérolas corretos, ver o resumo da sessão.

### Depois do lançamento (contínuo)
- [ ] Canal para aluno reportar erro de conteúdo (mesmo que simples, um botão "reportar erro" na questão).
- [ ] SLA interno de correção: erro reportado por aluno pagante é corrigido em até 48h.
- [ ] Revisão trimestral: a matriz de temas muda a cada edital novo do Enem/vestibulares — atualizar.

## 4. Checklist de lançamento (resumo para você assinar)

Antes de abrir a cobrança para o público:

- [ ] Gate zero (seção 1) resolvido para todas as fontes usadas.
- [ ] Pipeline completo (seção 2) rodado para cada matéria incluída no lançamento.
- [ ] Todos os itens de "por matéria" e "antes de qualquer aluno pagar" (seção 3) marcados.
- [ ] Pelo menos um especialista humano por área (Matemática, Português, Redação, Humanas, Natureza) revisou o conteúdo daquela área.

## 5. Ponto em aberto: Redação

Redação vale uma fração grande da nota em praticamente todo vestibular, e nenhum jogo atual do Diver cobre produção de texto. Opções, para decidir antes do lançamento:

1. **Ficar de fora da v1** — lançar só com as matérias objetivas, e registrar Redação como próxima etapa clara.
2. **Versão simples** — tema + rubrica de correção + autoavaliação guiada pelo aluno (sem correção automática).
3. **Versão com IA** — aproveitar o trabalho já previsto em IA (D71–D75 do roadmap geral) para uma correção assistida, com revisão humana por amostragem.

Registre aqui a decisão quando ela for tomada, com a data.

## 6. Skill recomendada

O processo desta etapa 3 (produção do conteúdo) e etapa 4 (checagem de originalidade) está formalizado em `.claude/skills/criar-trilha/SKILL.md`. Use-a também para revisar/expandir as trilhas que já existem (Radiologia, Cibersegurança, ISO 27001), já que elas foram criadas antes deste processo estar documentado.

## 7. Como isso se conecta ao roadmap geral

Isso é principalmente uma **trilha de conteúdo**, não de motor: os jogos e a economia já existem. Ela roda em paralelo ao `docs/ROADMAP.md`, sem competir com ele — mas como é o primeiro produto a ser vendido, vale a conversa explícita sobre prioridade: isso passa a ser mais urgente que várias tarefas do roadmap de plataforma (ex.: Turmas, D86 em diante) ou os dois andam juntos? Registre a decisão no `docs/DIARIO.md`.

# Diver — Recapitulação do Ensino Médio

> Público: quem vai prestar vestibular/Enem mas terminou o ensino médio há algum tempo (o gatilho original: **2 anos ou mais**). Diferente do restante do cursinho, aqui o objetivo não é treinar para a prova — é **relembrar a base** antes de avançar para o nível de vestibular. Este documento segue a mesma disciplina de fontes de `docs/CONTEUDO_CURSINHO.md`; leia aquele primeiro se ainda não leu.

## 1. Fontes de referência

| Fonte | Link | Status de uso |
|---|---|---|
| **BNCC — Ensino Médio** (matriz oficial) | [basenacionalcomum.mec.gov.br](http://basenacionalcomum.mec.gov.br/) ([PDF](http://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf)) | Documento oficial do MEC — pode usar e citar diretamente (art. 8º da Lei de Direitos Autorais), é a nossa matriz de temas. |
| **Khan Academy Brasil** | [khanacademy.org.br](https://www.khanacademy.org.br) | Gratuito, alinhado à BNCC. Referência de estrutura e sequência de dificuldade — não copiar exercícios. |
| **Telecurso** | [telecurso.org.br](https://www.telecurso.org.br) + YouTube | Feito especificamente para quem está voltando a estudar depois de anos — nosso público exato. Conteúdo protegido (Fundação Roberto Marinho) — só referência de abordagem/didática. |
| **Centro de Mídias SP** | [repositório oficial](https://repositorio.educacao.sp.gov.br) · YouTube: [1ª série](https://www.youtube.com/c/1as%C3%A9rieEMCMSP/playlists) · [2ª série](https://www.youtube.com/c/2as%C3%A9rieEMCMSP/playlists) · [3ª série](https://www.youtube.com/c/3as%C3%A9rieEMCMSP/playlists) | Produzido por governo estadual, mas termos de uso específicos não confirmados — tratar como referência de estrutura, não copiar, até confirmar. |

Pasta local de trabalho: `C:\Users\Allisson\Documents\Allisson\Diver\Recapitulação do Ensino Médio` (fora do repositório, mesmo padrão da pasta de provas do Enem).

## 2. Mapeamento do Khan Academy (filtrado para o nosso público)

Extraído da tela de personalização do Khan Academy, removendo o que não serve (Ensino Fundamental completo, integrações estaduais específicas de matrícula escolar, área de educadores).

### Matemática
| Nível | Tópicos |
|---|---|
| Núcleo do Ensino Médio (BNCC) | Álgebra 1, Álgebra 2, Geometria, Medidas e Trigonometria, Estatística, Probabilidade |
| Biblioteca de fundamentos (voltar na base) | Aritmética, Pré-álgebra, Álgebra básica, Álgebra intermediária (partes 1 e 2), Geometria básica e medidas, Geometria intermediária, Trigonometria, Estatística intermediária, Estatística e probabilidade |
| Avançado (provavelmente fora do escopo) | Matemática 1/2/3, Pré-cálculo, Cálculo (diferencial/integral/multivariável), Equações diferenciais, Álgebra linear |

### Ciências da Natureza
| Nível | Tópicos |
|---|---|
| Núcleo do Ensino Médio | Biologia, Física, Química (cursos próprios) |
| Temas transversais | História da vida, Sustentabilidade, Ciências e saúde, Ondas e radiação, Energia biológica |
| Aprofundamento (opcional) | Química orgânica, Saúde e medicina, Engenharia elétrica |

### Português e Ciências Humanas (fracos no Khan)
- Português: só "Prepare-se para o Ensino Médio - Português" como ponte.
- Humanas: só "História da Arte" aparece estruturado. Nada de História, Geografia, Filosofia ou Sociologia organizado.

### Fora do currículo tradicional (relevante para outras frentes do Diver)
| Área | Tópicos | Nota |
|---|---|---|
| Habilidades para a vida | **Segurança na Internet**, Introdução à IA | Confirma demanda de mercado para o curso **Cibersegurança Jr.** já no backlog. |
| Economia e Finanças | Microeconomia, Macroeconomia, Mercado financeiro | Não é foco agora, mas é ideia para trilha futura. |

## 3. O gap que isso revela

O Khan Academy é forte de verdade só em **Exatas** (Matemática e Ciências). Para **Português, História, Geografia, Filosofia e Sociologia**, ele não serve como referência estrutural — vamos depender mais do **Telecurso** e do **Centro de Mídias SP** para entender como esses temas costumam ser sequenciados e explicados a esse público.

## 4. Por que não copiar o modelo de onboarding do Khan

O Khan pergunta "em que ano você está" porque atende todo mundo: criança, adulto, ensino fundamental ao superior. **O nosso público já passou do ensino médio** — essa pergunta não se aplica. O que varia para nós é **há quanto tempo a pessoa saiu** e **o que especificamente ela esqueceu**, não em que série ela está.

## 5. Onboarding adaptado para o Diver

**Pergunta 1 — calibra se sugerimos o modo (gatilho já definido antes):**
> "Há quanto tempo você terminou (ou está terminando) o ensino médio?"
> Opções: Ainda cursando / Menos de 1 ano / 1 a 2 anos / Mais de 2 anos
> → **2 anos ou mais** sugere automaticamente o Modo Recapitulação.

**Pergunta 2 — diagnóstico gamificado, não autoavaliação:**
Em vez de pedir para o aluno se avaliar de 1 a 5 (impreciso — a maioria erra a própria percepção), aplicar um diagnóstico rápido por matéria: **5 perguntas curtas**, no estilo Diver (um minigame curto, não um formulário). O resultado mede de verdade, não pergunta o que a pessoa *acha* que sabe.

**Resultado:** uma trilha de recapitulação **personalizada por matéria**, cobrindo só os temas onde o diagnóstico mostrou fraqueza — o aluno não perde tempo revisando o que já domina.

## 6. Como isso se conecta ao que já existe

- Usa a mesma skill **`criar-trilha`** e a mesma disciplina de fontes de `docs/CONTEUDO_CURSINHO.md` — a diferença é que aqui a "matriz" é a BNCC (conteúdo de base), não o mapeamento de peso das provas do Enem.
- Vira uma trilha própria (`data/trilhas/recapitulacao-ensino-medio.json` ou uma por matéria), separada do curso "Travessia: Enem e Vestibular", mas oferecida como caminho opcional antes dele.
- O diagnóstico gamificado é, na prática, um jogo novo pequeno — vale desenhar como parte do catálogo quando chegar a hora, não misturar com os 17 jogos já existentes sem necessidade.

## 7. Decisões ainda em aberto

- [x] Quais matérias entram primeiro: **decidido em 2026-10-01: Português, depois Matemática, depois Lógica.** (Em Português a referência estrutural vem mais do Telecurso e do Centro de Mídias SP, só como referência de sequência e abordagem, sem copiar; a matriz de temas é a BNCC.)
- [x] Formato do diagnóstico: **decidido em 2026-10-01: fixo, 2 perguntas por tema da matéria** (ex.: 5 temas = 10 perguntas, uns 5 minutos), sem cronômetro e sem gastar oxigênio. Errou as 2 de um tema → o tema entra na trilha da pessoa; acertou as 2 → pula. O adaptativo fica para quando houver respostas de muitos alunos.
- [x] O diagnóstico também calibra a dificuldade no Acervo Diver: **decidido em 2026-10-01: sim**, só com números somados (taxa de acerto por questão), sem identificar ninguém e sem IA. Ex.: questão marcada "fácil" com 20% de acerto passa a ser tratada como difícil.

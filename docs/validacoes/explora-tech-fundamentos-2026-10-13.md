# Parecer: Explora Tech · Fundamentos (explora-tech-fundamentos), 2026-10-13

- **Tipo:** curso novo (Fase 1 de 4)
- **Tema ou fase:** pasta de referências do Drive para os Fundamentos (lógica, Python, computador, redes, Linux, Git)
- **Resultado geral:** **Reprovada** para os cinco PDFs da pasta (origem duvidosa). O curso segue sem eles, só com a grade, a documentação oficial das ferramentas e o conhecimento do Professor Diver, tudo reescrito por nós.

Conferido só pelos nomes e dados dos arquivos (Drive só leitura): nada foi baixado, aberto ou copiado, e nada no Drive foi mexido.

## 1. Fontes

| Fonte (título, autor ou órgão) | Arquivo | Edição ou data | Classificação (garimpo) | Resultado |
|---|---|---|---|---|
| *Introdução à Programação com Python*, Nilo Ney Coutinho Menezes (Novatec) | PDF com a marca "( WeLib.org )", 2,1 MB | sem data no arquivo | Não identificado (origem duvidosa) | Reprovada |
| *Guia Foca Linux, Iniciante + Intermediário*, Gleydson Mazioli da Silva | PDF com a marca "( WeLib.org )", 3,7 MB | sem data no arquivo | Não identificado (cópia de terceiro de obra de licença livre) | Reprovada (esta cópia) |
| *Code*, Charles Petzold | PDF com a marca "( WeLib.org )", 10,2 MB | sem data no arquivo | Não identificado (origem duvidosa) | Reprovada |
| *Entendendo Algoritmos*, Aditya Y. Bhargava (Novatec) | PDF com a marca "( WeLib.org )", 12,5 MB | sem data no arquivo | Não identificado (origem duvidosa) | Reprovada |
| *Pro Git*, Scott Chacon e Ben Straub | PDF com a marca "( WeLib.org )", 8,1 MB | sem data no arquivo | Não identificado (cópia de terceiro de obra de licença livre) | Reprovada (esta cópia) |

## 2. O que sai e o que fica

| Arquivo | Sai | Fica |
|---|---|---|
| Os cinco PDFs "WeLib" | Tudo: origem de terceiros sem autorização da editora, igual aos PDFs "WeLib" descartados em 2026-10-09 | Só como **bibliografia** (título, autor, editora), na seção "Para ir além" do caderno |
| "Diver: Documentação completa" (Google Docs do usuário, na mesma pasta) | Fora do tema do curso | Fica onde está; não é fonte |

## 3. Achados

| # | Onde | Tipo | O problema, com as nossas palavras | Correção e fonte oficial | Gravidade | Situação |
|---|---|---|---|---|---|---|
| 1 | Os cinco PDFs | fonte fraca | Cópias baixadas de site de terceiros, sem sinal de autorização | Usar cópias legítimas ou as versões oficiais grátis | bloqueia | aberto (decisão do usuário) |
| 2 | Foca Linux e Pro Git | nota | As duas obras têm versão oficial gratuita, com licença livre: Foca (GNU FDL 1.2, guiafoca.org) e Pro Git (CC BY-NC-SA 3.0, git-scm.com/book). Mesmo assim, só indicamos: o Pro Git proíbe uso comercial e exige a mesma licença | Indicar a versão oficial em "Para ir além" | nota | resolvido |

## 4. Fatos críticos conferidos

Nesta etapa (Módulo 1: algoritmo, primeiro programa, variáveis e tipos, operadores), a matéria vem da documentação oficial do Python e é conferida **por execução**. São 119 trechos de código das questões, rodados no mesmo Python do curso (Pyodide 314.0.7 = Python 3.14) pelo `scripts/montar-aulas.mjs`: todos conferem. Versão atual do Python conferida em python.org: 3.14.7 (05/08/2026).

## 5. Contradições com o curso atual

Não se aplica (curso novo).

## 6. Lacunas de cobertura

Nenhuma para o Módulo 1. Os módulos seguintes usam a mesma base (documentação oficial do Python, do Git, do GNU coreutils e RFCs do IETF para redes).

## 7. Para o especialista

Allisson (a confirmar): o arredondamento do empate para o par no `round()` (questão `log-operadores-q16`) e a observação sobre programas que rodam sem parar (`log-o-que-e-algoritmo-q18`), marcadas `revisar`.

**Para liberar os PDFs:** só o usuário, por escrito, aqui no fim. O caminho certo é trocar por cópias legítimas (compradas ou publicadas pelo próprio autor ou editora) e passar de novo pela `validar-fontes`.

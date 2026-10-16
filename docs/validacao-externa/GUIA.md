# Validação do Diver no Gemini: leia primeiro

Exportação **{{EXPORTACAO}}**, montada em {{HOJE}}. Este pacote tem **tudo o que precisa ser validado no Diver**:
- **{{itensQ}} questões e variantes**, em {{lotesQ}} lotes;
- **{{lotesConteudo}} lotes de conteúdo**:
  - artigos "Antes de mergulhar": {{lotesA}};
  - fichas "Revisar a fundo": {{lotesF}};
  - cartas dos jogos: {{lotesC}};
  - laboratórios: {{lotesL}};
  - profissões e panoramas: {{lotesP}};
  - calendário oficial: {{lotesK}}.

Nenhuma API é usada. Você conversa com o Gemini, e o Diver só lê o que ele responder.

## O que tem aqui

| Arquivo ou pasta | Para que serve |
|---|---|
| `00-LEIA-PRIMEIRO.md` | Este guia. |
| `01-PROMPT-DO-GEM.txt` | As instruções do validador: você cola uma vez só, no Gem. |
| `02-INDICE.md` | A lista de todos os lotes, na ordem sugerida, com um [ ] para marcar. |
| `questoes/` | Um par de arquivos por lote: **-A** (sem gabarito) e **-B** (gabarito e esqueleto da resposta). |
| `conteudo/` | Um arquivo por lote de conteúdo: K (calendário), A, F, C, L e P. |

## Passo 1: criar o Gem "Validador Diver" (uma vez só)

1. Abra o **gemini.google.com** com a sua conta Google.
2. No menu da esquerda, abra **Gems** e clique em **Novo Gem**.
3. Nome: `Validador Diver`.
4. Em **Instruções**:
   - abra o arquivo `01-PROMPT-DO-GEM.txt`, copie TUDO e cole;
   - se o Gemini reclamar do tamanho, anexe o arquivo em **Conhecimento** e escreva nas Instruções: `Siga à risca o arquivo 01-PROMPT-DO-GEM.txt anexado.`
5. Salve.
6. Ao usar o Gem, escolha o modelo mais forte disponível (o **Pro**, de raciocínio), não o Flash. Ele confere fatos melhor e erra menos nas contas.

## Passo 2: lote de QUESTÕES (Q0001, Q0002...): 2 mensagens no mesmo chat

1. Abra um **chat novo** no Gem `Validador Diver`. Um chat por lote, sempre: assim um lote não contamina o outro.
2. Anexe o arquivo `Q0001-A.txt` e escreva: `Parte A do lote Q0001.`
3. Espere a tabela com as respostas dele. Ela termina com "Parte A concluída: N de N itens".
   - Se ele parar no meio, escreva `continue`.
4. No **mesmo chat**, anexe o `Q0001-B.txt` e escreva: `Parte B do lote Q0001.`
5. Ele devolve um bloco **JSON**. Clique no botão de copiar do bloco.
   - Se no fim aparecer **CONTINUA**, escreva `continue` e copie também o bloco seguinte.
6. Cole o que copiou num arquivo de texto seu, por exemplo `resultados-1.txt`. Pode juntar vários lotes no mesmo arquivo, um embaixo do outro.
7. Marque o lote no `02-INDICE.md`.

**Por que em 2 passos?** Na Parte A o Gemini resolve sem ver a resposta, como um aluno forte. Se ele chegar a outra resposta, é sinal de gabarito errado ou de questão ambígua. Esse é o teste que mais pega erro.

## Passo 3: lote de CONTEÚDO (K0001, A0001, F0001, C0001, L0001, P0001): 1 mensagem

1. Chat novo no Gem.
2. Anexe o arquivo (exemplo: `A0001.txt`) e escreva: `Lote A0001.`
3. Copie o bloco JSON que ele devolver para o seu arquivo de resultados.

**Comece pelo `K0001` (calendário):** são poucos minutos e é urgente, porque o Enem é em novembro.

## Passo 4: me mandar os resultados

- Quando quiser (a cada 10 lotes, por exemplo), anexe o(s) seu(s) arquivo(s) de resultados no chat do Claude e diga: **"aplica os resultados da validação"**.
- Eu rodo `node scripts/validacao-externa.mjs aplicar <arquivos>`. O script:
  - **Questões e variantes aprovadas:** ficam marcadas como validadas. Só a partir daí as variantes aparecem na Revisão para os alunos.
  - **Reprovadas:** viram uma lista de correção. Eu corrijo seguindo as regras do Diver, te mostro e, com o seu OK, mando de volta numa exportação nova (E2) para validar de novo.
  - **Reprovada pela 2ª vez:** sai do curso e vai para revisão humana (a mesma regra de hoje).
  - **"Conferir" (o Gemini não conseguiu confirmar um fato):** eu confiro na fonte oficial ou mando para o especialista do curso.
- Se uma questão mudou depois desta exportação, o script não aplica o resultado nela e avisa, para nada ser aprovado com o texto errado.

## Dicas para não se perder

- **Respondeu fora do formato?** Escreva: `Refaça a resposta no formato JSON da seção 4 das suas instruções.` (no conteúdo: seção 5).
- **Pulou itens ou escreveu "os demais estão corretos"?** Escreva: `Faltaram itens. Revise todos, um por um, e mande o JSON completo.`
- **Não conseguiu abrir o arquivo?** Abra o .txt, copie o texto e cole na mensagem.
- **Ficou lento ou confuso?** Comece um chat novo e refaça só aquele lote.
- **Não precisa seguir a ordem.** Se quiser começar pelo Enem, que está mais perto, pode.
- **Quanto tempo leva:** em média, de 3 a 6 minutos por lote. Dá para fazer um pouco por dia, e eu aplico o que você mandar, quando mandar.

## O que NÃO fazer

- Não mude nada dentro dos arquivos dos lotes: o código e os ids são como o Diver encontra cada questão.
- Não misture dois lotes no mesmo chat.
- Não cole senha, chave ou dado de aluno no Gemini. Os lotes só têm conteúdo de estudo, que já é público no site.

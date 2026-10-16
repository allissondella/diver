# Validação externa (Gemini, sem API)

> Pedido do usuário, 2026-10-16: "ao invés de fazer com API, eu vou colocar em outra IA e passar pela validação dela". É o mesmo papel do Mergulho Triplo (`docs/MOTOR_DIVER.md`, seção 11), feito à mão num **Gem do Gemini** ("Validador Diver"). Nenhuma IA é chamada pelo Diver: o script só monta os arquivos e grava de volta o que o usuário trouxer.

## 1. O caminho

```
node scripts/validacao-externa.mjs exportar E1 --saida <pasta>
        ↓  pacote: 00-LEIA-PRIMEIRO.md (guia), 01-PROMPT-DO-GEM.txt, 02-INDICE.md, questoes/, conteudo/
        ↓  manifesto data/validacao-externa/E1.json (vai para o commit)
o usuário cria o Gem com o prompt e faz os lotes:
   Q (questões e variantes): chat novo → Parte A (sem gabarito) → tabela → Parte B → JSON
   K, A, F, C, L, P (conteúdo): chat novo → arquivo → JSON
        ↓  ele junta os blocos JSON em arquivos .txt e manda no chat do Claude
node scripts/validacao-externa.mjs aplicar <arquivos ou pasta> [--simular]
        ↓  validacao nas questões e variantes · 2ª reprovação → emRevisao · pendencias.json · PROGRESSO.md
o Claude corrige as pendências (regras da criar-trilha, com o OK do usuário) → exportar E2 (só o que falta) → …
```

## 2. Por que em 2 passos
A camada de lógica do Mergulho Triplo nunca vê o gabarito. No chat isso só é possível em duas mensagens: na Parte A o Gemini resolve sozinho, como um aluno forte; na Parte B recebe o gabarito, as explicações e os comentários, e compara. Quando ele chega a outra resposta, é sinal forte de gabarito errado ou de questão ambígua.

## 3. O pacote

| Tipo | Código | O que leva | Tamanho |
|---|---|---|---|
| Questões | Q0001… | questões + as variantes de cada uma logo abaixo, aula inteira; diagnósticas no fim do Enem e do Ensino Médio | até 80 itens (`LIMITE_Q`) |
| Calendário | K0001 | feriados, Enem e vestibulares de `data/calendario/datas-oficiais.json` | 1 lote |
| Artigos | A… | `fases[].resumo` renderizado (introdução, seções, tabela, linha do tempo, mapa, mapa mental, associações, pontos, pérolas) | ~45 mil caracteres (`LIMITE_TEXTO`) |
| Fichas | F… | bloco `fichas` (texto, pontos, pegadinhas) | idem |
| Cartas | C… | pares, V ou F, adivinhas, sequências, palavras; cada caso de detetive num lote próprio (JSON) | idem |
| Laboratórios | L… | `data/laboratorios/<curso>/*.json` | idem |
| Profissões | P… | `indice.json` (frases e cartas), cada ficha e cada panorama, em JSON | 1 por arquivo |

A numeração segue a ordem do `ORDEM` no script (Radiologia, Segurança, Explora Tech, Enem, Ensino Médio); o usuário pode fazer em qualquer ordem. Os lotes são `.txt` porque o Gemini aceita esse formato com certeza (o conteúdo é Markdown).

**O que fica de fora:** palavras do dia e dicionário da Sala de Descompressão (vêm do dicionário), os mistérios da Investigação (gerados por código), tutoriais e textos da interface.

## 4. O que volta e como é aplicado

- **Questão e variante** (o Gemini preenche o esqueleto JSON da Parte B): `veredito` + `falhas` (códigos do `PROMPT.txt`) + `problema` + `correcao` + `fontes`. O script:
  - recalcula o veredito pelos códigos (falha grave nunca passa como aprovada);
  - confere a impressão digital (`assinatura` do Mergulho Triplo) contra o manifesto: se o texto mudou depois da exportação, não aplica e avisa;
  - grava `validacao` com `via: "externa"`, `exportacao`, `lote`, `veredito`, `modelo_fato`/`modelo_logica` = `externa:<nome da IA>`;
  - `pronta: true` em "aprovado" e "aprovado_com_ajuste" (a Revisão passa a mostrar a variante, `js/trilhas.js`);
  - "reprovado" conta tentativa e, na 2ª tentativa (outra exportação, depois da correção), a questão vai para `emRevisao`, como no Mergulho Triplo;
  - "conferir" não conta tentativa (`fato: "duvida"`): o Claude confere na fonte oficial ou manda para o especialista.
  - Aplicar o mesmo lote de novo só regrava, sem contar tentativa.
- **Diagnósticas** (`data/diagnostica/*.json`): só entram em `pendencias.json` e nos resultados. O arquivo tem formatação própria e o app não lê `validacao` nelas.
- **Conteúdo:** cada achado vira uma pendência com `ref`, `trecho`, `gravidade` e a correção sugerida. Nada é mudado sozinho.
- **Arquivos do registro (todos no commit):**
  - `data/validacao-externa/<E>.json`: o manifesto (lote → itens, com tipo e impressão digital);
  - `<E>-resultados.json`: o que foi aplicado em cada lote;
  - `pendencias.json`: tudo o que falta corrigir, com `status: "aberta"`;
  - `docs/validacao-externa/PROGRESSO.md`: o resumo, regenerado a cada `aplicar` ou `progresso`.

## 5. Corrigir e revalidar
1. Ler `pendencias.json` (abertas), curso por curso.
2. Corrigir seguindo a skill `criar-trilha`:
   - fato: só o trecho apontado;
   - lógica: reescrever do zero;
   - regras da Georgia;
   - mostrar ao usuário antes de gravar.
3. Marcar a pendência como `status: "corrigida"`, com a data.
4. `exportar E2`: sem `--tudo`, entra só o que ainda não tem validação para o texto atual. Isso inclui o que foi corrigido, porque a impressão digital mudou. Fica de fora o que já está aprovado e o que está reprovado mas ainda não foi corrigido.
5. Mandar o pacote E2 ao usuário.

## 6. Regras que continuam valendo
- Nenhuma IA paga roda pelo Diver. Quem conversa com o Gemini é o usuário, na conta dele.
- Os lotes só têm conteúdo de estudo, que já é público no site. Nada de dado de aluno, chave ou senha.
- Questão `origem: "enem"` não é reescrita; só gabarito, explicação e comentários. Ela nunca ganha variante.
- A revisão humana do especialista continua recomendada (`docs/cadernos/professor-diver.md`, seção 5). A validação externa só reduz o risco.
- Fichas de profissões e panoramas continuam em `rascunho` até a revisão de um profissional, mesmo com o Gemini aprovando (skill `criar-ficha-profissao`).

---
name: criar-ficha-profissao
description: Pesquisa e escreve uma ficha do Mapa das Profissões (data/profissoes/<id>.json) no padrão de docs/MAPA_PROFISSOES.md, com fonte e data em cada número, e confere com scripts/conferir-ficha.mjs. Use quando o usuário pedir uma ficha nova ou a atualização de uma ficha existente.
---

# Criar ficha de profissão

Antes de começar, leia `docs/MAPA_PROFISSOES.md` (seções 2, 5 e 7) e use `data/profissoes/enfermagem.json` como modelo de estrutura, de tom e de citação.

## Passos

1. **Confirme o id** em `data/profissoes/indice.json`. Ficha nova usa o id que já está no índice; nunca renomeie um id existente.
2. **Pesquise na web**, nesta ordem de preferência de fonte:
   - leis, decretos e resoluções (Planalto, MEC, CNE): duração mínima, carga horária, formato permitido (presencial, semipresencial ou EAD) e atribuições legais;
   - conselho profissional: registro obrigatório, o que a profissão pode e não pode fazer;
   - Inep (Censo da Educação Superior): matrículas e posição no ranking;
   - Novo Caged (direto ou por portal que cite o Caged): média de contratação com carteira por CBO, com faixa (percentis 25 e 75), período e data de atualização;
   - piso salarial, quando houver lei.
3. **Registre cada fonte** em `fontes[]` com `id`, `titulo`, `orgao`, `url`, `consultado_em`, `tipo` e, para salário, `dados_atualizados_em`. Fonte secundária leva `nota` dizendo o que falta confirmar. A ordem de `fontes[]` é a numeração das citações: ponha as mais citadas primeiro.
4. **Cite tudo.** Todo número e toda afirmação verificável leva `fontes: ["id"]` no próprio campo. Sem fonte, o campo fica fora da ficha e a pendência vai para o DIARIO.
5. **Escreva a ficha completa:** `numeros` (4), `secoes` (8), `mitos` (5 ou mais), `carta` (um fato que surpreende), `agora` (24 horas), `formacao` (etapas), `dna` (estimativa, `dna_calibrado: false`), um `dilema` com resposta baseada em lei ou código de ética, `vizinhas` (ids do índice) e `trends_id` se houver dados em `trends/trends.json`.
6. **"O que ninguém te conta"** com pelo menos 3 pontos difíceis e reais.
7. **"Um dia como"** só quando o usuário pedir: 5 ou 6 cenas sobre prioridades, ética, comunicação e rotina; nunca procedimento técnico; exatamente uma opção `melhor: true` por cena; `revisar_com_profissional: true`.
8. **Confira:** `node scripts/conferir-ficha.mjs data/profissoes/<id>.json`. Corrija até passar sem erros; trate cada aviso.
9. **Atualize o índice:** `status: rascunho`, `arquivo`, `frase`, `carta` e `tags` (cópia exata das da ficha: os filtros do mapa leem o índice, e o `conferir-ficha` acusa diferença).
10. **Peça o parecer** com a skill `validar-fontes` e registre no DIARIO o que ficou pendente.

## Tom

Sério com leveza. Frases curtas. Nada de exclamação em série, gíria forçada ou piada que diminua a profissão. Nunca "você deveria" nem "você nasceu para". Veja a tabela de tom em `docs/MAPA_PROFISSOES.md`.

## Nunca

- Inventar número, porcentagem, data ou nome de instituição.
- Citar faculdade privada por nome, ranking comercial ou curso de uma instituição específica.
- Copiar texto das fontes. Escreva com as próprias palavras.
- Dizer ao aluno o que ele deve escolher.
- Publicar (`status: publicada`) sem `revisao.profissional: ok`, revisor e data.

# Pareceres de validação das fontes

Aqui ficam os pareceres da skill `validar-fontes` (`.claude/skills/validar-fontes/SKILL.md`): a conferência do material do Drive **antes** de o Professor Diver (`criar-trilha`) estudar.

```
Material no Drive → validar-fontes → criar-trilha → validar-questoes (Fila de Validação)
```

- **Nome do arquivo:** `<id-da-trilha>-<AAAA-MM-DD>.md`. Mais de um no mesmo dia: `-2`, `-3`.
- **Resultados:**
  - **Aprovada:** pode usar;
  - **Aprovada com ressalvas:** usa, menos os trechos apontados, e ensina a versão corrigida;
  - **Reprovada:** a `criar-trilha` fica bloqueada para aquele material até o usuário liberar por escrito no parecer.
- **O repositório é público:**
  - nada de trecho, tabela, figura ou exercício do material, nem reescrito de perto: só o nosso resumo do problema e o lugar (arquivo e página);
  - sem link do Drive (as pastas são privadas);
  - sem dado de aluno.

## Modelo

```markdown
# Parecer: <nome do curso> (<id-da-trilha>), <AAAA-MM-DD>

- **Tipo:** curso novo | atualização
- **Tema ou fase:** ...
- **Resultado geral:** Aprovada | Aprovada com ressalvas | Reprovada

## 1. Fontes

| Fonte (título, autor ou órgão) | Arquivo | Edição ou data | Classificação (garimpo) | Resultado |
|---|---|---|---|---|

## 2. Achados

| # | Onde (arquivo, pág.) | Tipo | O problema, com as nossas palavras | Correção e fonte oficial | Gravidade | Situação |
|---|---|---|---|---|---|---|

- **Tipo:** desatualizado, fato errado, contradição, lacuna, fonte fraca.
- **Gravidade:** bloqueia, ressalva, nota.
- **Situação:** aberto, resolvido, com o especialista.

## 3. Fatos críticos conferidos

X conferidos: Y conferem, Z divergem (estão nos achados), W sem confirmação (foram para o especialista).

## 4. Contradições com o curso atual (atualização)

Ids de questões e fases que o material novo desmente ou deixa velhos, e o porquê, em uma linha cada.

## 5. Lacunas de cobertura

Temas da matriz ou ementa que o material não cobre, ou cobre só por cima.

## 6. Para o especialista

Itens com o nome do especialista do curso (`docs/cadernos/professor-diver.md`, seção 5).

## 7. Decisão

O que a `criar-trilha` pode usar, o que não pode e o que precisa esperar.
```

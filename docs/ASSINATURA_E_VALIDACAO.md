# Diver — Assinatura de conteúdo e validação com duas IAs

> Este documento existe porque, por enquanto, não há orçamento para um revisor humano por matéria. A solução: duas IAs de famílias diferentes, cada uma pegando um tipo de erro que a outra (e quem gerou o conteúdo) pode não ver. Isso reduz risco, não zera — um revisor humano continua recomendado assim que o orçamento permitir (ver `docs/CONTEUDO_CURSINHO.md`).

## 1. A Assinatura Diver

Regra de ouro: **a diversão mora na embalagem, o rigor mora no conteúdo.** O enunciado de toda questão é sério e fiel ao estilo real de prova. A personalidade do Diver aparece ao redor da questão, nunca dentro do enunciado ou das alternativas — isso preserva o valor de treino real do produto.

### 1.1 Explicação em três camadas (toda questão original nossa)

Reaproveita a lógica de profundidade que o app já tem (Raso → Recife → Caverna → Abismo).

- **🌊 Na superfície** — a resposta direta, rápida, para quem só quer confirmar.
- **🤿 Mergulhando fundo** — por que cada alternativa errada é uma pegadinha, nomeando o tipo de armadilha (ex.: "confundir velocidade média com velocidade instantânea").
- **💡 Dica de mergulhador** — uma frase curta, memorável, tipo mnemônico, para levar para o dia da prova.

Campo no JSON: `"explicacao": { "superficie": "...", "fundo": "...", "dica": "..." }`. Questões literais do Enem também recebem essa explicação (é conteúdo nosso adicionado ao redor da questão — não altera a questão em si, então não fere a licença "Sem Derivações").

### 1.2 Rótulo de origem (transparência = confiança)

Toda questão mostra, visível ao aluno:
- **"Genuína do Enem"** + ano + número, quando literal.
- **"Estilo Diver"**, quando original, inspirada no estilo do Enem/vestibular.

Campo no JSON: `"origem": "enem" | "diver"`.

### 1.3 Nome do sistema de qualidade: "Mergulho Triplo"

Toda questão passa por três mergulhos antes de chegar ao aluno: **gerar → checar fato → checar lógica**. Serve como frase de confiança para o produto (landing page, marketing): *"Cada questão do Diver passa pelo Mergulho Triplo antes de chegar até você."*

### 1.4 Simulados com nome próprio: "Simulado Travessia"

Em vez de simulados montados na hora com questões aleatórias, lançar **edições numeradas** ("Simulado Travessia nº 1", nº 2...), com a mesma proporção de matérias e curva de dificuldade do Enem real (usando o mapeamento tema × peso já previsto em `docs/CONTEUDO_CURSINHO.md`). Cada edição é um evento — algo para divulgar, não só uma funcionalidade.

## 2. O Mergulho Triplo: validação com duas IAs

### 2.1 Por que duas IAs diferentes

O valor de uma segunda opinião vem de ela **não compartilhar os mesmos pontos cegos** de quem gerou o conteúdo. Por isso: modelos de empresas diferentes, cada um testando uma coisa específica — não "jogar a mesma pergunta genérica para outra IA".

### 2.2 Camada 1 — Fato (Gemini com Grounding)

**Modelo:** Gemini 3 Flash, com a ferramenta de busca do Google ativada (`grounding`).
**O que checa:** toda afirmação factual verificável — datas, fórmulas, valores numéricos, nomes próprios, fatos históricos/geográficos/biológicos.
**Por que esse modelo:** é o único dos dois com busca real na web embutida — não confia só na memória do modelo, confirma contra fontes atuais. Essencial para Humanas e Natureza.
**Prompt-tipo:**
```
Verifique cada afirmação factual (datas, números, fórmulas, nomes) neste texto usando busca real.
Aponte qualquer afirmação incorreta ou desatualizada, citando a fonte que a corrige.
Se tudo estiver correto, responda apenas "CONFIRMADO".

[questão + explicação]
```

### 2.3 Camada 2 — Lógica adversarial (GPT-5.2)

**Modelo:** GPT-5.2 (a versão "mini" para o primeiro filtro; o modelo cheio só nos casos escalados).
**O que checa:** se a resposta marcada como certa é realmente a única defensável; se algum distrator é ambíguo ou também aceitável; se a dificuldade está calibrada.
**Por que postura adversarial:** pedir "revise, por favor" gera revisões superficiais. Pedir para *tentar provar que está errado* força o modelo a procurar falhas de verdade — é uma técnica de prompting comprovadamente mais eficaz para achar erro.
**Prompt-tipo:**
```
Seu trabalho é tentar derrubar esta questão. Tente ativamente:
1. Provar que a alternativa marcada como correta está errada ou incompleta.
2. Encontrar outra alternativa que também possa estar certa.
3. Apontar ambiguidade no enunciado.
Se, mesmo tentando, a questão resistir, responda apenas "RESISTIU". Caso contrário, explique exatamente a falha encontrada.

[questão completa, com gabarito oculto do prompt até a checagem final]
```

### 2.4 Funil de custo (barato primeiro, caro só quando precisa)

1. Toda questão passa pelas versões **baratas** das duas camadas (Gemini Flash, GPT-5.2 mini).
2. Só quando uma camada não confirma com segurança (aponta risco ou fica em dúvida), a questão escala para a versão mais robusta do mesmo modelo, para desempate.
3. Isso evita pagar preço de modelo caro em 100% do conteúdo.

### 2.5 O que fazer quando uma camada reprova

- **Camada 1 (fato) reprova:** corrigir o fato apontado, gerar de novo o trecho afetado, rodar a checagem de novo nesse trecho.
- **Camada 2 (lógica) reprova:** reescrever a questão do zero (não só editar), porque um problema lógico geralmente indica que a base da questão está mal construída.
- **Reprovação repetida (2ª vez na mesma questão):** marcar `"revisar_humano": true` e seguir sem essa questão até ter revisão manual — não insistir indefinidamente com a IA.

### 2.6 Registro de auditoria

Cada questão salva um pequeno histórico de validação, para você poder auditar depois:
```json
"validacao": {
  "fato": "confirmado",
  "logica": "confirmado",
  "modelo_fato": "gemini-3-flash",
  "modelo_logica": "gpt-5.2-mini",
  "data": "2026-09-30"
}
```

## 3. Estimativa de custo (preços de hoje, podem mudar)

| Item | Preço aproximado | Observação |
|---|---|---|
| Gemini 3 Flash (tokens) | ~US$ 0,75 / US$ 3,75 por milhão (entrada/saída) | Preço promocional até o fim de 2026 |
| Busca do Google (grounding) | 5.000 buscas grátis/mês, depois US$ 14 por 1.000 | Provavelmente fica nas grátis no início |
| GPT-5.2 mini | Bem mais barato que o GPT-5.2 cheio | Usar como filtro de primeira passada |
| GPT-5.2 (desempate) | ~US$ 1,75 / US$ 14 por milhão | Só nos casos escalados |

**Validar um curso inteiro (~1.000 questões, as duas camadas, com escalonamento):** estimativa de **US$ 20 a 60 no total**, não recorrente por mês — é por leva de conteúdo gerada. Ordens de grandeza para decidir com tranquilidade, não fatura chocante.

## 4. O que precisa de você (não dá para eu fazer sozinho)

- [ ] Criar uma conta e gerar uma chave de API no **Google AI Studio** (Gemini).
- [ ] Criar uma conta e gerar uma chave de API na **OpenAI**.
- [ ] Definir um limite de gasto mensal em cada painel (trava de segurança contra custo inesperado).
- [ ] Aprovar (ou ajustar) os nomes propostos: "Mergulho Triplo", "Simulado Travessia", os rótulos "Genuína do Enem"/"Estilo Diver".
- [ ] Nunca colar essas chaves no chat comigo nem em código do repositório — elas vão em variável de ambiente local, e o Claude Code te orienta onde colocar quando você pedir para configurar.

## 5. Próximos passos

1. Você cria as duas chaves de API (item 4).
2. Peça ao Claude Code, usando a skill `validar-questoes`, para configurar as chaves localmente (nunca no repositório) e escrever o script de validação.
3. Rode a validação retroativa no lote de Matemática gerado esta noite, antes de decidir o merge do Pull Request.
4. A partir daí, toda leva nova de conteúdo já nasce validada pelo Mergulho Triplo.

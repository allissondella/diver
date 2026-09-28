# Diver — identidade visual

Cores medidas diretamente da tela do protótipo. **Não invente cores novas**: se precisar de uma variação, derive das existentes e registre aqui.

## Paleta
| Nome | Hex | Uso |
| --- | --- | --- |
| Azul-marinho | `#0B2545` | Fundo do app (topo do degradê) |
| Marinho profundo | `#06172D` | Fundo do app (base do degradê) |
| Superfície | `#102D52` | Cards e painéis |
| Superfície turquesa | `#0C354C` | Card selecionado (com borda turquesa) |
| Turquesa Recife | `#14B8A6` | Cor principal: botões, seleção, progresso, marca |
| Turquesa brilho | `#29C6B3` | Títulos e destaques sobre fundo escuro |
| Turquesa sombra | `#0EA597` | Borda inferior do botão 3D |
| Amarelo Sol | `#FACC15` | XP e destaques |
| Coral | `#FB7185` | Erro gentil e alertas |
| Gelo | `#E6F1FF` | Texto principal |
| Névoa | `#A9BCD6` | Texto secundário |
| Pele (mascote) | `#F2B28C` | Só no desenho do Diver |
| Cabelo e barba (mascote) | `#7A4630` | Só no desenho do Diver |

> Turquesa sobre branco tem contraste baixo. Use turquesa como **texto** apenas sobre fundos escuros; sobre fundos claros, use o azul-marinho.

## Tokens CSS
O protótipo já tem variáveis; **reaproveite os nomes existentes** e apenas confira os valores. Se faltar algum token, crie com estes nomes:

```css
:root {
  --diver-marinho: #0B2545;
  --diver-marinho-fundo: #06172D;
  --diver-superficie: #102D52;
  --diver-superficie-turquesa: #0C354C;
  --diver-turquesa: #14B8A6;
  --diver-turquesa-brilho: #29C6B3;
  --diver-turquesa-sombra: #0EA597;
  --diver-amarelo: #FACC15;
  --diver-coral: #FB7185;
  --diver-texto: #E6F1FF;
  --diver-texto-suave: #A9BCD6;
  --diver-raio-card: 16px;
  --diver-raio-botao: 999px;
}
body { background: linear-gradient(180deg, var(--diver-marinho), var(--diver-marinho-fundo)); color: var(--diver-texto); }
```

## Profundidades (cor por fase)
Raso (0–10 m) claro e luminoso → Recife (10–40 m) turquesa → Caverna (40–200 m) azul profundo → Abismo (200 m+) quase preto. Quanto mais fundo, mais escuro o cenário do jogo.

## Tipografia e formas
- **Plus Jakarta Sans** (Google Fonts), pesos 400 a 800, sempre com fallback de sistema.
- Cards com canto de 16 px; botões em formato de pílula.
- **Botão 3D**: borda inferior de 4 px em `--diver-turquesa-sombra`; ao pressionar, o botão "afunda" (translateY de 3–4 px e sombra menor).
- Card selecionado: fundo `--diver-superficie-turquesa` + borda turquesa + marcador de rádio turquesa.
- Ícones de traço fino (estilo Lucide), sempre com texto nas ações principais.
- Fundo: degradê marinho + **bolhas suaves** animadas (desligam com `prefers-reduced-motion`).

## Mascote: Diver
Mergulhador barbudo e sorridente, nadando de bruços com as pernas esticadas e lendo um livro.
**Decisão de 2026-09-28:** o Diver do app é desenhado em **SVG vetorial**, no mesmo estilo liso e com contorno escuro do resto da interface, usando só as cores da paleta. Ele substitui o peixinho em todas as telas (início, painel de explicação e resumo). A arte em pixel art de `assets/mascote/` fica como **referência de personagem** (e pode servir para redes sociais), mas não é usada no app.

- **Onde está:** `<template id="molde-mascote">` no `index.html`. O `app.js` copia o molde para todo elemento com `data-mascote`.
- **Cores:** roupa turquesa `#14B8A6` com sombra `#0EA597`; máscara amarela `#FACC15` com vidro `#0C354C`; snorkel coral `#FB7185`; livro coral com páginas `#E6F1FF`; nadadeiras e lápis amarelos; cilindro `#A9BCD6`; contorno `#06172D`. Cores próprias do personagem (derivadas, só para ele): **Pele** `#F2B28C` e **Cabelo e barba** `#7A4630`.
- **Partes animáveis (classes):** `.diver__corpo` (flutua), `.diver__nadadeiras` (pernada), `.diver__bolhas` (bolhinhas do snorkel), `.diver__boca--feliz` / `.diver__boca--triste`, `.diver__pupila`.
- **Reações:** o container recebe `.mascote--feliz` (pulinho e sorriso aberto, no acerto) ou `.mascote--triste` (balançada e cara de "ops", no erro; nunca culpa). Com `prefers-reduced-motion`, tudo fica estático.
- **Uso:** nunca distorcer (a proporção é 206 × 116); sobre fundo escuro funciona melhor; deixe respiro ao redor.
- **Próximas poses (Semana 23):** pensando e comemorando, no mesmo SVG.
- O peixinho do protótipo foi aposentado. Pode voltar como ajudante nas animações de acerto (decisão em aberto).

## Tom de voz
| Faça | Evite |
| --- | --- |
| "Mandou bem, Diver!" | "Parabéns por concluir a atividade com 80% de aproveitamento." |
| "Essa foi por pouco. Bora mergulhar de novo?" | "Resposta incorreta." |
| "Sentimos sua falta! Um mergulho de 2 minutos?" | "Você perdeu sua sequência de 30 dias." |
| "Hoje é dia de descanso. Aproveita a maré calma!" | "Você não estudou hoje." |

Frases curtas, humor discreto, sem jargão e sem sermão. Um trocadilho de mar de vez em quando (e só de vez em quando).

## Acessibilidade
Contraste mínimo AA; foco visível em tudo que é clicável; botões grandes para toque (mín. 44 px); atalhos de teclado (1–6 ou A–F para responder); `prefers-reduced-motion` respeitado; nunca comunicar algo só por cor.

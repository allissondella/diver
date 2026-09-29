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
- **JetBrains Mono** (token `--fonte-mono`) só para "dados": rótulos pequenos em caixa alta (`.rotulo`), cronômetros, contadores, números do resumo e da barra lateral. Texto corrido continua em Plus Jakarta Sans.
- **Movimento:** as telas entram com fade, deslize curto e um leve desfoque (`surgir`); ao começar uma sessão ou um jogo, a **cortina** (`#transicao`: fundo do mar, bolhas subindo e o Diver) cobre a tela por ~1 s. Com "reduzir movimento", nada disso aparece.
- **Barras de rolagem** finas, no tom `--superficie-2` (turquesa ao passar o mouse); na barra lateral, a alça só aparece com o mouse em cima.
- Cards com canto de 16 px; botões em formato de pílula.
- **Botão 3D**: borda inferior de 4 px em `--diver-turquesa-sombra`; ao pressionar, o botão "afunda" (translateY de 3–4 px e sombra menor).
- Card selecionado: fundo `--diver-superficie-turquesa` + borda turquesa + marcador de rádio turquesa.
- Ícones de traço fino (estilo Lucide), sempre com texto nas ações principais.
- Fundo: degradê marinho + **bolhas suaves** animadas (desligam com `prefers-reduced-motion`).

## Mascote: Diver
Mergulhador barbudo e sorridente, **vetorial (SVG)**, no estilo "figurinha": formas simples, **contorno turquesa grosso** e cores chapadas, de frente, com:
- **roupa de mergulho com capuz** (`#15406B`, contorno `#5EEAD4`) e faixa turquesa no peito;
- **máscara amarela** (`#FACC15`) com vidro `#0C354C` e os **olhinhos iguais aos do ícone da aba** (brancos `#E6F1FF`, pupilas `#0B2545`);
- **snorkel na boca**: bocal amarelo e tubo coral (`#FB7185`) subindo pelo lado, soltando bolhas;
- barba e **bigode pequeno** `#7A4630` (bigode sem contorno, logo acima do bocal; aprovado em 2026-09-29), pele `#F2B28C`, nadadeiras amarelas.

**Decisão de 2026-09-29 (2):** a pixel art 16-bit foi aposentada (os arquivos antigos saíram do repositório; estão no histórico do git). O ícone da aba continua sendo a máscara em SVG.

- Arquivo de referência: `assets/mascote/diver.svg`. No app, o desenho fica inline em `<template id="molde-mascote">` no `index.html`; o `ui.js` copia para todo elemento com `data-mascote` (sem pedir arquivo nenhum à rede).
- **Expressões** pela classe do container (`UI.humorMascote(container, humor)`): sem classe = **normal** (pisca de vez em quando); `.mascote--feliz` (olhos ^ ^, bochechas e pulinho: acerto); `.mascote--triste` (pálpebras caídas e balançada: erro, sem culpar); `.mascote--pensando` (olhando para cima: dicas e tutorial).
- Bolhas sobem do snorkel; no Início ele flutua. Com `prefers-reduced-motion`, fica tudo parado.
- Proporção 240 × 270 (mais alto que largo): nas telas, defina só a largura. Deixar respiro ao redor; funciona melhor sobre fundo escuro.

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

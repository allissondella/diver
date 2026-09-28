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
- Cards com canto de 16 px; botões em formato de pílula.
- **Botão 3D**: borda inferior de 4 px em `--diver-turquesa-sombra`; ao pressionar, o botão "afunda" (translateY de 3–4 px e sombra menor).
- Card selecionado: fundo `--diver-superficie-turquesa` + borda turquesa + marcador de rádio turquesa.
- Ícones de traço fino (estilo Lucide), sempre com texto nas ações principais.
- Fundo: degradê marinho + **bolhas suaves** animadas (desligam com `prefers-reduced-motion`).

## Mascote: Diver
Mergulhador barbudo e sorridente, em pixel art com contorno escuro, nadando de bruços com as pernas esticadas e lendo um livro.
- Arquivos em `assets/mascote/`: `diver-personagem.png` (fundo transparente, estático), `diver-nadando.webp` (animado, recomendado) e `diver-nadando.gif` (reserva).
- Uso recomendado:

```html
<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="assets/mascote/diver-personagem.png">
  <source srcset="assets/mascote/diver-nadando.webp" type="image/webp">
  <img src="assets/mascote/diver-nadando.gif" alt="Diver, o mascote, nadando e lendo" width="600" height="398">
</picture>
```
- Nunca distorcer (manter a proporção). Deixar respiro de pelo menos metade da altura do pé-direito da nadadeira ao redor. Sobre fundo escuro funciona melhor.
- Reações a produzir (Semana 23): feliz, pensando, comemorando (pulinho ao acertar) e balançando (ao errar, sem culpar). Enquanto isso, use o PNG estático com uma animação CSS simples.
- O peixinho do protótipo sai da tela inicial. Pode voltar como ajudante nas animações de acerto (decisão em aberto).

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

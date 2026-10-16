# Mensagem para o Claude Code: integrar o Mapa das Profissões (Fase 1)

Antes de colar: extraia o zip do kit na raiz do projeto `diver` (ele cria `profissoes.html`, `css/`, `js/`, `data/profissoes/`, `scripts/`, `docs/` e `.claude/skills/`, sem sobrescrever nada do app). Depois cole a mensagem abaixo.

```
Vamos integrar o Mapa das Profissões ao Diver. O kit já está na raiz do projeto.

Leia nesta ordem, inteiros: docs/MAPA_PROFISSOES_INTEGRACAO.md, docs/MAPA_PROFISSOES.md e docs/MAPA_PROFISSOES_INTERACOES.md. Abra profissoes.html com python3 -m http.server e navegue pelas seis rotas para ver o comportamento esperado. Depois me mostre um plano curto e espere meu OK.

Escopo desta sessão (Fase 1):
1. Integrar css/profissoes.css, js/profissoes-infograficos.js e js/profissoes.js ao index.html (SPA), sem build, como scripts clássicos com defer.
2. Rotas #profissoes, #profissoes-cartas, #profissoes-metodo, #profissao-<id>, #profissao-<id>-dia e #profissao-<id>-mitos no roteador de app.js, chamando Profissoes.montar(container, rota).
3. Item "Profissões" na barra lateral, ícone de bússola.
4. Ligar os ganchos: Profissoes.ganchos.recompensar → economia.js (30 XP e 3 pérolas no "Um dia como", 20 XP e 2 pérolas no "Mito ou verdade", uma vez por profissão, dentro do teto de bônus); registrar → atividade.js; confirmar → UI.confirmar; abrirCurso → rota real do curso na Sala Enem.
5. Conquistas "Explorador de carreiras", "Um dia na pele" e "Baralho completo" em conquistas.js.
6. Tutorial de primeiro acesso da área em tutorial.js (3 passos).
7. Bloco "Profissões" no Admin, derivado do log (fichas mais vistas, pedidos, conclusão do "Um dia como").
8. Conferir os ids de materias_chave em data/profissoes/enfermagem.json contra data/trilhas/catalogo.json e corrigir na ficha se forem diferentes.
9. Rodar node scripts/conferir-ficha.mjs data/profissoes/enfermagem.json e manter passando.

Regras:
- profissoes.html e css/profissoes-preview-tokens.css são só do preview: não entram no app. Os tokens já estão em css/estilo.css.
- Não alterar o conteúdo da ficha de Enfermagem nem publicá-la (status continua "rascunho") até eu confirmar a revisão de um(a) enfermeiro(a).
- Não escrever outras fichas nesta sessão. Elas vêm uma por vez, com a skill criar-ficha-profissao.
- Valem as regras do CLAUDE.md: textContent, try/catch no armazenamento, tokens de cor, UI.confirmar, ids imutáveis, nada de innerHTML com conteúdo de JSON.
- Se o padrão da barra lateral ou do roteador pedir uma adaptação no módulo, adapte js/profissoes.js com o mínimo de mudança e registre no DIARIO.

Ao terminar: abra o pull request, me passe o link da prévia no Cloudflare, liste o que ficou pendente no DIARIO e atualize o CLAUDE.md com a nova área.
```

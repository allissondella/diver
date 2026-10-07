# Cadernos do Professor Diver: a memória das skills

> A IA não guarda lembrança de uma conversa para a outra (o ambiente é apagado no fim de cada sessão). Então a memória mora **aqui, em arquivos**: as skills leem o caderno antes de trabalhar e propõem o que acrescentar no fim. Quanto mais a gente usa, mais o "Professor Diver" fica com a nossa cara.

## 1. Os cadernos

| Arquivo | O que é | Quem lê |
|---|---|---|
| `professor-diver.md` | O **jeito Diver de ensinar**, igual para todos os cursos: tom, técnicas para ficar divertido, fácil de entender e de memorizar, e as lições gerais. | `criar-trilha` (sempre), `validar-questoes` (para anotar lições gerais) |
| `<id-da-trilha>.md` | O caderno **de um curso** (mesmo nome do JSON em `data/trilhas/`, ex.: `enem-vestibular.md`): gosto, decisões, o que as referências ensinaram, lições da validação, o que já foi feito e o que falta. | `criar-trilha`, `garimpo`, `validar-questoes` |

Curso sem caderno? A skill cria a partir do **modelo** da seção 4 na primeira vez que trabalhar nele.

## 2. O ciclo (toda sessão de conteúdo)

0. **Conferir a fonte:** antes de estudar um material novo, a skill `validar-fontes` confere se ele está certo e atual e deixa um parecer em `docs/validacoes/`. Material reprovado não é estudado sem a liberação do usuário.
1. **Abrir:** a skill lê `professor-diver.md` e o caderno do curso **antes** de qualquer outra coisa.
2. **Estudar:** ao consumir uma referência (PDF, apostila, vídeo, artigo), o professor anota **conclusões nossas**: o que cai, em que ordem ensinar, onde o aluno tropeça, que exemplo do dia a dia funciona.
3. **Criar:** gera o conteúdo autoral seguindo o caderno.
4. **Fechar:** no fim, mostra ao usuário **"O que vou anotar no caderno"** (lista curta) e só grava depois do OK.
5. **Validar:** quando o resultado da Fila de Validação volta, o que foi reprovado vira **lição** no caderno, para o erro não se repetir.

## 3. O que pode e o que não pode entrar (o repositório é público)

Pode:
- Conclusões escritas por nós, curtas: "o Enem cobra porcentagem quase sempre em compra e venda".
- Decisões e preferências do usuário, com data.
- Lições da validação (o tipo de erro, nunca a questão reprovada inteira).
- Título, autor/canal e link de uma referência, para saber de onde veio a conclusão.

Nunca:
- Trecho, frase, exercício ou explicação de apostila, livro, site ou vídeo de terceiro, nem "reescrito com outras palavras".
- Transcrição de vídeo (nem parte dela).
- Dados de alunos, e-mails, senhas ou chaves.
- Questão do Enem copiada (ela mora na trilha e no acervo, com a fonte, não aqui).

Regra de bolso: se a frase só faz sentido porque alguém a escreveu antes, ela não entra. Se é uma conclusão que um professor tiraria depois de ler, entra.

## 4. Modelo de caderno de curso

```markdown
# Caderno do curso: <nome do curso>

> Trilha: `data/trilhas/<id>.json` · Regras gerais: `docs/cadernos/LEIA-ME.md` · Jeito de ensinar: `docs/cadernos/professor-diver.md`

## Público e objetivo
Quem estuda, para quê, nível de partida.

## Seu gosto (preferências do usuário)
- AAAA-MM-DD · preferência

## Decisões
- AAAA-MM-DD · decisão · por quê

## O que as referências ensinaram (conclusões nossas, nunca trechos)
| Data | Referência (título · autor/canal) | Conclusão |
|---|---|---|

## Lições da validação
| Data | Lote | Tipo de erro | Como evitar |
|---|---|---|---|

## Já feito
Fases, temas e quantidades.

## Próximos passos e pendências
```

## 5. Vídeos (YouTube e outros)

O professor também aprende com vídeo, mas **lendo a transcrição**, não assistindo:

1. **Caminho garantido:** no YouTube, abra o vídeo, clique em **"...mais"** na descrição e depois em **"Mostrar transcrição"**. Copie o texto e cole no chat (ou salve num `.txt` no Google Drive e mande o link). Junto, mande o **link do vídeo** e o **nome do canal**.
2. **Direto pelo link:** só funciona se a rede do ambiente liberar `www.youtube.com`. Mesmo liberado, a página costuma trazer só título e descrição, então a transcrição colada continua sendo o caminho mais confiável.
3. A transcrição é material de terceiro: serve para estudar e **some no fim da sessão** (fica no máximo no rascunho da sessão, fora do repositório). No caderno entram só as conclusões, com o título, o canal e o link.
4. A skill `garimpo` cataloga o vídeo antes (normalmente como **Referência de abordagem**). Canal oficial não quer dizer licença livre: só vale uso direto se a licença do vídeo permitir, como no caso do Enem.

# Diver — produção e testes

O Diver tem **dois ambientes**. O código é um só (este repositório); o que muda é o **endereço do site** e o **banco de dados**.

| | Produção | Testes |
| --- | --- | --- |
| Para quem | Alunos de verdade | Você, a equipe e quem estiver testando |
| Endereço | `allissondella.github.io/diver` (GitHub Pages) | endereço fixo `diver.allisson-rzr.workers.dev` + um link de prévia para cada PR (`<branch>-diver.allisson-rzr.workers.dev`), no Cloudflare |
| Código | branch `main` | endereço fixo: branch `main` · prévia: a branch do PR |
| Banco | Supabase de produção | **outro** projeto Supabase, só com dados fictícios |
| Faixa no topo | não tem | amarela e listrada: **AMBIENTE DE TESTES** (e "[Testes]" no nome da aba) |

Os dois nunca se misturam: bancos diferentes, e endereços diferentes (o navegador guarda login e progresso separados para cada endereço).

## Como o site sabe em qual ambiente está
O `js/config.js` olha o endereço:
- `allissondella.github.io` → produção;
- qualquer outro (o site de testes, as prévias dos PRs, `localhost` no computador) → testes.

Enquanto o bloco `testes` do `config.js` estiver vazio, o ambiente de testes roda no **modo local** (sem login, tudo só no navegador), e a faixa avisa isso. Se um dia o Diver ganhar um domínio próprio, ele entra na lista `ENDERECOS_DE_PRODUCAO`.

## O dia a dia (fluxo de uma mudança)
1. Eu faço a mudança numa branch e abro um **PR**.
2. O Cloudflare publica sozinho uma **prévia** daquele PR (leva 1 ou 2 minutos). O link segue o nome da branch: `<nome-da-branch>-diver.allisson-rzr.workers.dev`; ele também aparece em Cloudflare → Workers & Pages → diver → **Deployments**.
3. Você abre o link, entra com uma conta de teste e confere no computador e no celular.
4. Gostou? **Merge** no PR. A produção (GitHub Pages) e o endereço fixo de testes atualizam sozinhos.
5. Não gostou? Comenta no PR ou me fala aqui. Nada chega aos alunos até o merge.

## Montar o ambiente (uma vez só)

> **Ordem importa:** primeiro faça o merge do PR que criou este guia. Antes dele, o site de testes usaria o banco de produção.

### 1. Supabase de testes
1. Entre em https://supabase.com/dashboard → **New project**.
   - Organização: a mesma de sempre. Nome: `diver-testes`. Região: **South America (São Paulo)**.
   - **Database password:** gere uma e guarde no seu gerenciador de senhas (não precisa me mandar).
   - O plano gratuito permite 2 projetos: produção + testes.
2. Quando o projeto terminar de criar: **SQL Editor → New query** → cole o arquivo `supabase/setup.sql` inteiro → **Run**.
3. Crie o seu admin de testes no mesmo SQL Editor (o mesmo comando da primeira vez, `select public.diver_criar_conta(...)`, que te passei no chat). Use uma **senha diferente** da produção. Esse comando nunca vai para o repositório.
4. **Authentication → Sign In / Providers → Email:** desligue **"Allow new users to sign up"** (igual ao passo 4 do `docs/SUPABASE.md`).
5. **Project Settings → API Keys** (ou **Data API**): copie a **Project URL** e a chave **publishable** e me mande no chat.
   **Nunca** mande a `secret` / `service_role`.
6. Eu coloco os dois valores no bloco `testes` do `js/config.js` e abro um PR. A partir daí o site de testes tem login, com o banco de testes.

### 2. Site de testes (Cloudflare, gratuito) — feito em 2026-09-29
1. Conta em https://dash.cloudflare.com.
2. **Workers & Pages → Create** → importar o repositório **`allissondella/diver`** do GitHub. O Cloudflare cria um **Worker** chamado `diver` (o formato novo; serve os arquivos do repositório como site, sem etapa de build) e publica de novo a cada push na `main`.
3. Ligar os endereços: **diver → aba Domains → Worker URL** e ligar as duas chaves:
   - **Production** → `diver.allisson-rzr.workers.dev` (endereço fixo, segue a `main`);
   - **Preview** → `*-diver.allisson-rzr.workers.dev` (um link por branch/PR).
4. **Não precisa** da aba **Access** / "Zero Trust": o login é o do próprio Diver.
5. Primeiro acesso: abrir o endereço fixo, conferir a faixa amarela, entrar com o admin de testes e trocar a senha temporária (use uma diferente da produção).

## Contas de teste
- Crie alunos e professores de teste pela área **Admin → Pessoas e cursos** do site de testes, com e-mails fictícios (ex.: `aluno1@teste.com`). Ninguém recebe e-mail: a senha temporária aparece na tela.
- **Nunca** cadastre alunos reais nem copie dados da produção para os testes.

## Bom saber
- **Mudou o banco?** O `setup.sql` roda **primeiro no Supabase de testes**, testamos lá, e só depois na produção.
- **Projeto pausado:** no plano gratuito, um projeto Supabase parado por 7 dias pausa. É só clicar em **Restore** no painel; nada se perde. O de testes vai pausar mais (é menos usado): normal.
- **No computador (localhost)** o Diver também usa o ambiente de testes: desenvolver nunca mexe na produção.
- As chaves no `config.js` são as **públicas** (URL e publishable) dos dois projetos. Quem protege os dados são as regras do banco, iguais nos dois.

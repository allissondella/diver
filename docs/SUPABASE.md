# Diver — ligando o login (Supabase), passo a passo

> **Com o `js/config.js` preenchido, a primeira página do site é o login.** Ninguém vê nada do app antes de entrar.

O login precisa de um lugar na internet para guardar contas, cursos e progresso. Usamos o **Supabase** (plano gratuito), que já estava previsto no roadmap.
Você faz isso **uma vez só**, em uns 15 minutos. Nada aqui exige programar: é clicar, copiar e colar.

> Enquanto o `js/config.js` estiver vazio, o Diver funciona no **modo local** (sem login, tudo no navegador), como sempre funcionou.

## 1. Criar o projeto
1. Acesse **supabase.com** e clique em **Start your project**. Entre com a sua conta do GitHub (é o mais simples).
2. Clique em **New project**:
   - **Name:** `diver`
   - **Database Password:** clique em **Generate a password** e guarde num lugar seguro (gerenciador de senhas). Ela é do banco, não é a senha do app.
   - **Region:** `South America (São Paulo)`
   - Plano **Free**.
3. Clique em **Create new project** e espere 1 ou 2 minutos até o painel ficar pronto.

## 2. Criar as tabelas e as regras de segurança
1. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
2. No GitHub, abra o arquivo `supabase/setup.sql` do repositório, clique no botão **Copy raw file** (ícone de copiar) e cole tudo no editor do Supabase.
3. Clique em **Run**. Deve aparecer **Success. No rows returned**.
   - Pode rodar de novo quando o arquivo mudar: ele não apaga dados.

## 3. Criar o seu usuário de admin
1. Ainda no **SQL Editor**, clique em **New query**.
2. Cole o comando que eu te mandei no chat (ele tem o seu e-mail e a senha temporária; por isso **não fica no repositório**, que é público). Ele tem este formato:
   ```sql
   select public.diver_criar_conta('seu@email.com', 'Seu Nome Completo', 'SENHA-TEMPORARIA', true);
   ```
3. Clique em **Run**. Vai aparecer um código (o id da sua conta). Pronto.

## 4. Fechar o cadastro livre
Só você cria contas (pela área de Admin). Para ninguém se cadastrar sozinho:
1. Menu **Authentication** → **Sign In / Providers** (em algumas versões: **Providers** → **Email**).
2. Desligue **Allow new users to sign up** (permitir novos cadastros) e salve.
   - Deixe o provedor **Email** ligado: é ele que faz o login funcionar.

## 5. Pegar os dois valores do site
1. Menu **Project Settings** (engrenagem) → **Data API** / **API Keys**.
2. Copie:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - a chave **anon public** (ou **publishable**, que começa com `sb_publishable_`)
3. ⚠️ **Nunca** copie a chave **service_role** / **secret**. Ela dá poder total sobre o banco e não pode ir para o site. (O app até se recusa a usar essa chave, por segurança.)

## 6. Colocar os valores no site
Mande os dois valores no chat que eu faço o commit. Se preferir fazer você mesmo:
1. No GitHub, abra `js/config.js` e clique no lápis (**Edit this file**).
2. Preencha:
   ```js
   window.DIVER_CONFIG = {
     supabaseUrl: 'https://abcdefgh.supabase.co',
     supabaseChave: 'sb_publishable_...',
   };
   ```
3. Clique em **Commit changes**. Em 1 ou 2 minutos o site do GitHub Pages atualiza.

> Esses dois valores são públicos por natureza: foram feitos para ficar no site. Quem protege os dados são as regras do passo 2 (cada pessoa só enxerga o que é dela, e só o admin cadastra).

## 7. Primeiro acesso
1. Abra o site: aparece a tela **Entrar**.
2. Use o seu e-mail e a senha temporária. O Diver pede para você **criar a sua senha** (mínimo 8 caracteres, com letras e números).
3. Na barra lateral aparece o grupo **Admin → Pessoas e cursos**. Lá você:
   - cadastra uma pessoa escolhendo o **tipo de conta** (Aluno, Professor ou Admin), com nome completo, e-mail e cursos, e recebe a **senha temporária** com uma mensagem pronta para mandar;
   - muda o tipo de conta de alguém quando precisar (você não consegue tirar o seu próprio acesso de admin, para não ficar trancado do lado de fora);
   - marca e desmarca cursos de cada pessoa (salva na hora);
   - gera uma nova senha temporária, se alguém esquecer;
   - desativa ou reativa o acesso;
   - vê o progresso de cada um (nível, fases, simulados e prova final).

### Os três tipos de conta
| Tipo | O que vê e faz |
| --- | --- |
| **Aluno** | Estuda só os cursos marcados para ele. |
| **Professor** | Estuda os cursos marcados para ele e, em **Professor → Meus alunos**, acompanha os alunos desses cursos e o progresso de cada um nesses cursos. Não cadastra ninguém, não muda cursos e não vê tarefas nem agenda dos alunos. |
| **Admin** | Vê todos os cursos e faz tudo da área **Pessoas e cursos**. |

Quem decide o que cada um enxerga é o banco (as regras do passo 2), não o navegador.

> **Já tinha rodado o `setup.sql` antes?** Rode de novo a versão nova (passo 2). Ele acrescenta os tipos de conta e a tabela de **provas do professor** sem apagar nada, e quem já era admin continua admin.

### Provas antigas (Simulado → Upload de prova)
- **Aluno:** a prova fica só na conta dele (sincroniza como o resto do progresso). Vale XP, sem pérolas, se ele jurar que foi honesto; na "espiadinha", não pontua.
- **Professor e admin:** podem escolher **"Para os alunos do curso"**. A prova vai para a tabela `provas_curso` e aparece no Simulado de todos os alunos daquele curso, valendo XP e pérolas. Só o professor do curso (ou o admin) publica; só quem publicou (ou o admin) apaga.

## Bom saber
- **Progresso na nuvem:** XP, fases, simulados, provas (inclusive as provas antigas que o aluno sobe), tarefas e calendário são salvos automaticamente a cada poucos segundos. Trocou de aparelho? É só entrar. Os **PDFs** continuam só no aparelho em que foram enviados.
- **Projeto pausado:** no plano gratuito, se o Supabase ficar **7 dias sem nenhum uso**, ele pausa o projeto. É só entrar no painel e clicar em **Restore**; nada se perde.
- **Esqueci a minha senha de admin:** no **SQL Editor**, rode (trocando o e-mail e inventando uma senha temporária de pelo menos 8 caracteres):
  ```sql
  update auth.users set encrypted_password = extensions.crypt('NovaSenhaTemp123', extensions.gen_salt('bf')) where email = 'seu@email.com';
  update public.perfis set trocar_senha = true where email = 'seu@email.com';
  ```
  Depois entre com essa senha temporária: o Diver vai pedir para você criar uma nova. Para alunos, use o botão **Nova senha temporária** na área de Admin.
- **Os conteúdos dos cursos** (arquivos em `data/trilhas/`) ficam no repositório público. O login controla **quem vê o quê no app**, mas o conteúdo em si não é secreto.

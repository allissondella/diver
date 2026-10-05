-- =====================================================================
-- Diver — estrutura do banco no Supabase (login, alunos, cursos e progresso)
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo → Run.
-- Pode rodar de novo sem medo: ele não apaga dados.
-- Este arquivo NÃO contém senhas nem dados de pessoas (o repositório é público).
-- O primeiro admin é criado com um comando separado, que não fica no repositório.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabelas ----------

-- Um perfil para cada conta de login (auth.users). O tipo de conta (papel) é acrescentado mais abaixo.
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nome text not null,
  admin boolean not null default false,
  trocar_senha boolean not null default true, -- obriga a trocar a senha no próximo login
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Quais cursos (trilhas) cada aluno pode ver
create table if not exists public.matriculas (
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  trilha_id text not null,
  atribuido_em timestamptz not null default now(),
  primary key (aluno_id, trilha_id)
);

-- Progresso e dados do app de cada pessoa (espelho do localStorage "diver:v1:*")
create table if not exists public.estado (
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  chave text not null,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, chave)
);

-- ---------- Tipo de conta: aluno, professor ou admin ----------
-- "papel" é quem manda; a coluna antiga "admin" fica igual a (papel = 'admin') por compatibilidade.
alter table public.perfis add column if not exists papel text not null default 'aluno';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_papel_valido') then
    alter table public.perfis add constraint perfis_papel_valido check (papel in ('aluno', 'professor', 'admin'));
  end if;
end;
$$;
-- quem já era admin (antes de existir "papel") continua admin
update public.perfis set papel = 'admin' where admin and papel = 'aluno';

-- ---------- Quem é quem? ----------
create or replace function public.eh_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.papel = 'admin' and p.ativo from public.perfis p where p.id = auth.uid()), false);
$$;

create or replace function public.eh_professor()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select p.papel = 'professor' and p.ativo from public.perfis p where p.id = auth.uid()), false);
$$;

-- O professor logado dá aula neste curso? (professor enxerga só os alunos dos cursos dele)
create or replace function public.professor_do_curso(p_trilha text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.eh_professor()
     and exists (select 1 from public.matriculas m where m.aluno_id = auth.uid() and m.trilha_id = p_trilha);
$$;

-- A pessoa é aluna de algum curso do professor logado?
create or replace function public.aluno_do_professor(p_aluno uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.eh_professor()
     and exists (select 1 from public.perfis p where p.id = p_aluno and p.papel = 'aluno')
     and exists (
       select 1 from public.matriculas a
       join public.matriculas eu on eu.trilha_id = a.trilha_id and eu.aluno_id = auth.uid()
       where a.aluno_id = p_aluno
     );
$$;

-- ---------- Segurança por linha (RLS) ----------
alter table public.perfis enable row level security;
alter table public.matriculas enable row level security;
alter table public.estado enable row level security;

-- Ver: a própria pessoa; o admin vê tudo; o professor vê os alunos dos cursos dele
drop policy if exists "perfil: ver o próprio ou admin" on public.perfis;
drop policy if exists "perfil: ver o próprio, admin ou professor" on public.perfis;
create policy "perfil: ver o próprio, admin ou professor" on public.perfis
  for select to authenticated using (id = auth.uid() or public.eh_admin() or public.aluno_do_professor(id));

drop policy if exists "matrícula: ver as próprias ou admin" on public.matriculas;
drop policy if exists "matrícula: ver as próprias, admin ou professor" on public.matriculas;
create policy "matrícula: ver as próprias, admin ou professor" on public.matriculas
  for select to authenticated using (aluno_id = auth.uid() or public.eh_admin() or public.professor_do_curso(trilha_id));

-- O professor só vê o PROGRESSO dos cursos dele (chave diver:v1:trilha:<curso>), nada de tarefas ou agenda
drop policy if exists "estado: ver o próprio ou admin" on public.estado;
drop policy if exists "estado: ver o próprio, admin ou professor" on public.estado;
create policy "estado: ver o próprio, admin ou professor" on public.estado
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.eh_admin()
    or (
      chave like 'diver:v1:trilha:%'
      and public.professor_do_curso(substr(chave, 17))
      and public.aluno_do_professor(usuario_id)
      and exists (select 1 from public.matriculas m where m.aluno_id = usuario_id and m.trilha_id = substr(chave, 17))
    )
  );

drop policy if exists "estado: gravar o próprio" on public.estado;
create policy "estado: gravar o próprio" on public.estado
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "estado: atualizar o próprio" on public.estado;
create policy "estado: atualizar o próprio" on public.estado
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "estado: apagar o próprio" on public.estado;
create policy "estado: apagar o próprio" on public.estado
  for delete to authenticated using (usuario_id = auth.uid());

-- Visitantes (sem login) não enxergam nada; perfis e matrículas só mudam pelas funções abaixo
revoke all on public.perfis, public.matriculas, public.estado from anon;
revoke insert, update, delete on public.perfis, public.matriculas from authenticated;
grant select on public.perfis, public.matriculas to authenticated;
grant select, insert, update, delete on public.estado to authenticated;

-- ---------- Funções internas (não podem ser chamadas pelo app) ----------

-- Senha temporária legível: 12 caracteres, sem 0/O, 1/l/I
create or replace function public.diver_senha_temporaria()
returns text
language plpgsql volatile
set search_path = public, extensions
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  bytes bytea := extensions.gen_random_bytes(12);
  senha text := '';
begin
  for i in 0..11 loop
    senha := senha || substr(alfabeto, 1 + (get_byte(bytes, i) % length(alfabeto)), 1);
  end loop;
  return senha;
end;
$$;

-- Cria a conta de login (auth), o perfil e retorna o id
create or replace function public.diver_criar_conta(p_email text, p_nome text, p_senha text, p_admin boolean default false)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido: %', p_email;
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome completo.';
  end if;
  if length(p_senha) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Já existe uma conta com o e-mail %.', v_email;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nome', trim(p_nome)), now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  insert into public.perfis (id, email, nome, admin, papel, trocar_senha)
  values (v_id, v_email, trim(p_nome), p_admin, case when p_admin then 'admin' else 'aluno' end, true);

  return v_id;
end;
$$;

revoke execute on function public.diver_criar_conta(text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.diver_senha_temporaria() from public, anon, authenticated;

-- ---------- Funções do app (RPC) ----------

-- Admin cadastra uma pessoa (aluno, professor ou admin) com cursos.
-- Retorna a senha temporária (mostrada só ao admin).
drop function if exists public.admin_criar_usuario(text, text, text[]);
create or replace function public.admin_criar_usuario(p_email text, p_nome text, p_trilhas text[] default '{}', p_papel text default 'aluno')
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_senha text := public.diver_senha_temporaria();
  v_id uuid;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin pode cadastrar pessoas.';
  end if;
  if coalesce(p_papel, '') not in ('aluno', 'professor', 'admin') then
    raise exception 'Tipo de conta inválido: %', p_papel;
  end if;
  v_id := public.diver_criar_conta(p_email, p_nome, v_senha, p_papel = 'admin');
  update public.perfis set papel = p_papel where id = v_id;
  insert into public.matriculas (aluno_id, trilha_id)
  select v_id, t from unnest(coalesce(p_trilhas, '{}')) as t
  on conflict do nothing;
  return v_senha;
end;
$$;

-- Admin troca a lista de cursos de um aluno
create or replace function public.admin_definir_matriculas(p_usuario uuid, p_trilhas text[])
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin pode atribuir cursos.';
  end if;
  delete from public.matriculas where aluno_id = p_usuario and trilha_id <> all (coalesce(p_trilhas, '{}'));
  insert into public.matriculas (aluno_id, trilha_id)
  select p_usuario, t from unnest(coalesce(p_trilhas, '{}')) as t
  on conflict do nothing;
end;
$$;

-- Admin gera uma nova senha temporária (a pessoa troca no próximo login)
create or replace function public.admin_redefinir_senha(p_usuario uuid)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_senha text := public.diver_senha_temporaria();
begin
  if not public.eh_admin() then
    raise exception 'Só o admin pode redefinir senhas.';
  end if;
  update auth.users set encrypted_password = extensions.crypt(v_senha, extensions.gen_salt('bf')), updated_at = now()
  where id = p_usuario;
  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;
  update public.perfis set trocar_senha = true where id = p_usuario;
  delete from auth.refresh_tokens where user_id::text = p_usuario::text; -- derruba sessões abertas
  return v_senha;
end;
$$;

-- Admin muda nome e ativa/desativa o acesso
create or replace function public.admin_atualizar_usuario(p_usuario uuid, p_nome text, p_ativo boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin pode alterar pessoas.';
  end if;
  if p_usuario = auth.uid() and not p_ativo then
    raise exception 'Você não pode desativar a sua própria conta.';
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome completo.';
  end if;
  update public.perfis set nome = trim(p_nome), ativo = p_ativo where id = p_usuario;
  update auth.users set banned_until = case when p_ativo then null else 'infinity'::timestamptz end, updated_at = now()
  where id = p_usuario;
  if not p_ativo then
    delete from auth.refresh_tokens where user_id::text = p_usuario::text;
  end if;
end;
$$;

-- Admin muda o tipo de conta (aluno, professor, admin)
create or replace function public.admin_definir_papel(p_usuario uuid, p_papel text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin pode mudar o tipo de conta.';
  end if;
  if coalesce(p_papel, '') not in ('aluno', 'professor', 'admin') then
    raise exception 'Tipo de conta inválido: %', p_papel;
  end if;
  if p_usuario = auth.uid() and p_papel <> 'admin' then
    raise exception 'Você não pode tirar o seu próprio acesso de admin.';
  end if;
  update public.perfis set papel = p_papel, admin = (p_papel = 'admin') where id = p_usuario;
  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;
end;
$$;

-- A própria pessoa avisa que já trocou a senha temporária
create or replace function public.senha_trocada()
returns void
language sql security definer
set search_path = public
as $$
  update public.perfis set trocar_senha = false where id = auth.uid();
$$;

revoke execute on function public.admin_criar_usuario(text, text, text[], text) from public, anon;
revoke execute on function public.admin_definir_papel(uuid, text) from public, anon;
revoke execute on function public.admin_definir_matriculas(uuid, text[]) from public, anon;
revoke execute on function public.admin_redefinir_senha(uuid) from public, anon;
revoke execute on function public.admin_atualizar_usuario(uuid, text, boolean) from public, anon;
revoke execute on function public.senha_trocada() from public, anon;
grant execute on function public.admin_criar_usuario(text, text, text[], text) to authenticated;
grant execute on function public.admin_definir_papel(uuid, text) to authenticated;
grant execute on function public.admin_definir_matriculas(uuid, text[]) to authenticated;
grant execute on function public.admin_redefinir_senha(uuid) to authenticated;
grant execute on function public.admin_atualizar_usuario(uuid, text, boolean) to authenticated;
grant execute on function public.senha_trocada() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_professor() to authenticated;
grant execute on function public.professor_do_curso(text) to authenticated;
grant execute on function public.aluno_do_professor(uuid) to authenticated;

-- ---------- Provas que o professor (ou o admin) sobe para os alunos de um curso ----------
-- As provas que o ALUNO sobe para si ficam no estado dele (chave diver:v1:provas-enviadas), não aqui.
create table if not exists public.provas_curso (
  id uuid primary key default gen_random_uuid(),
  trilha_id text not null,
  titulo text not null check (char_length(titulo) between 1 and 120),
  autor_id uuid not null references public.perfis (id) on delete cascade,
  autor_nome text not null default '',
  minutos integer check (minutos is null or minutos between 1 and 600),
  questoes jsonb not null check (jsonb_typeof(questoes) = 'array' and jsonb_array_length(questoes) between 1 and 300 and octet_length(questoes::text) < 1500000),
  criado_em timestamptz not null default now()
);
create index if not exists provas_curso_trilha on public.provas_curso (trilha_id);

-- Autor e nome sempre vêm do login (ninguém publica em nome de outra pessoa)
create or replace function public.provas_curso_autor()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.autor_id := auth.uid();
  new.autor_nome := coalesce((select nome from public.perfis where id = auth.uid()), '');
  new.criado_em := now();
  return new;
end;
$$;
drop trigger if exists provas_curso_autor on public.provas_curso;
create trigger provas_curso_autor before insert on public.provas_curso
  for each row execute function public.provas_curso_autor();

alter table public.provas_curso enable row level security;

-- Ver: quem está matriculado no curso (alunos e professores) e o admin
drop policy if exists "prova do curso: ver" on public.provas_curso;
create policy "prova do curso: ver" on public.provas_curso
  for select to authenticated using (
    public.eh_admin()
    or exists (select 1 from public.matriculas m where m.aluno_id = auth.uid() and m.trilha_id = provas_curso.trilha_id)
  );

-- Publicar: só o professor do curso ou o admin
drop policy if exists "prova do curso: publicar" on public.provas_curso;
create policy "prova do curso: publicar" on public.provas_curso
  for insert to authenticated with check (public.eh_admin() or public.professor_do_curso(trilha_id));

-- Apagar: quem publicou (se ainda der aula no curso) ou o admin
drop policy if exists "prova do curso: apagar" on public.provas_curso;
create policy "prova do curso: apagar" on public.provas_curso
  for delete to authenticated using (public.eh_admin() or (autor_id = auth.uid() and public.professor_do_curso(trilha_id)));

revoke all on public.provas_curso from anon;
revoke update on public.provas_curso from authenticated;
grant select, insert, delete on public.provas_curso to authenticated;

-- ---------- Fila de Validação do Mergulho Triplo (docs/MOTOR_DIVER.md, seções 5 e 11) ----------
-- Lotes de questões esperando a validação pelas IAs PAGAS. Nada roda sozinho: o admin vê o custo
-- estimado, aprova digitando a senha de novo (fila_aprovar) e só então a Edge Function
-- "mergulho-triplo" executa. As chaves das IAs ficam nos Secrets das Edge Functions, nunca aqui.
create table if not exists public.fila_validacao (
  id uuid primary key default gen_random_uuid(),
  trilha_id text not null check (char_length(trilha_id) between 1 and 120),
  materia text not null check (char_length(materia) <= 60 and materia ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  quantidade_questoes integer not null check (quantidade_questoes between 1 and 60),
  conteudo_pendente jsonb not null check (
    jsonb_typeof(conteudo_pendente) = 'object'
    and jsonb_typeof(conteudo_pendente->'questoes') = 'array'
    and octet_length(conteudo_pendente::text) < 1500000),
  custo_estimado_usd numeric(10,4) not null check (custo_estimado_usd >= 0 and custo_estimado_usd < 1000),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'executando', 'concluido', 'rejeitado')),
  criado_em timestamptz not null default now(),
  aprovado_por uuid references public.perfis (id) on delete set null,
  aprovado_em timestamptz
);
-- Colunas de apoio (acrescentadas assim para o arquivo continuar reexecutável)
alter table public.fila_validacao add column if not exists criado_por uuid references public.perfis (id) on delete set null;
alter table public.fila_validacao add column if not exists executado_por uuid references public.perfis (id) on delete set null;
alter table public.fila_validacao add column if not exists iniciado_em timestamptz;
alter table public.fila_validacao add column if not exists concluido_em timestamptz;
alter table public.fila_validacao add column if not exists resultado jsonb;       -- validações, itens aprovados para o acervo, relatório
alter table public.fila_validacao add column if not exists custo_real_usd numeric(10,4);
alter table public.fila_validacao add column if not exists erro text;
create index if not exists fila_validacao_status on public.fila_validacao (status, criado_em desc);

-- Todo lote nasce 'pendente', sem aprovação nem resultado; a quantidade vem do próprio conteúdo.
create or replace function public.fila_validacao_nova()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.status := 'pendente';
  new.criado_por := auth.uid();
  new.criado_em := now();
  new.aprovado_por := null;
  new.aprovado_em := null;
  new.executado_por := null;
  new.iniciado_em := null;
  new.concluido_em := null;
  new.resultado := null;
  new.custo_real_usd := null;
  new.erro := null;
  new.quantidade_questoes := jsonb_array_length(new.conteudo_pendente->'questoes');
  -- Trava: questão do Enem NUNCA ganha variante (licença CC BY-ND, "Sem Derivações";
  -- docs/CONTEUDO_CURSINHO.md 1.1). Variante precisa trazer a origem da original em "originais";
  -- origem desconhecida conta como Enem.
  if exists (
    select 1 from jsonb_array_elements(new.conteudo_pendente->'questoes') q
     where jsonb_typeof(q) = 'object' and q ? 'varianteDe'
       and (coalesce(q->>'origem', '') = 'enem'
            or coalesce(new.conteudo_pendente->'originais'->(q->>'varianteDe')->>'origem', 'enem') = 'enem')
  ) then
    raise exception 'Variante de questão do Enem não pode entrar na fila (licença Sem Derivações).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists fila_validacao_nova on public.fila_validacao;
create trigger fila_validacao_nova before insert on public.fila_validacao
  for each row execute function public.fila_validacao_nova();

alter table public.fila_validacao enable row level security;

-- Só o admin lê e cria lotes. Mudança de status só pelas funções abaixo (ou pela Edge Function).
drop policy if exists "fila: admin le" on public.fila_validacao;
create policy "fila: admin le" on public.fila_validacao
  for select to authenticated using (public.eh_admin());
drop policy if exists "fila: admin cria" on public.fila_validacao;
create policy "fila: admin cria" on public.fila_validacao
  for insert to authenticated with check (public.eh_admin());

-- (o Supabase dá todas as permissões às tabelas novas por padrão: tira tudo e devolve só ler e criar)
revoke all on public.fila_validacao from anon, authenticated;
grant select, insert on public.fila_validacao to authenticated;

-- A senha foi digitada há pouco? O token do Supabase Auth traz o claim "amr" com o método de
-- login e o horário; reautenticar com a senha gera um token novo com o horário de agora.
create or replace function public.senha_recente(p_segundos integer default 300)
returns boolean
language sql stable
set search_path = public
as $$
  select exists (
    select 1
    from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr') = 'array' then auth.jwt()->'amr' else '[]'::jsonb end) a
    where a->>'method' = 'password'
      and (a->>'timestamp') ~ '^[0-9]+$'
      and (a->>'timestamp')::bigint >= extract(epoch from now())::bigint - p_segundos
  );
$$;

-- Aprovar: admin + senha confirmada nos últimos 5 minutos + lote ainda pendente.
create or replace function public.fila_aprovar(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin aprova lotes da fila.' using errcode = '42501';
  end if;
  if not public.senha_recente(300) then
    raise exception 'Confirme sua senha para aprovar (vale por 5 minutos).' using errcode = '42501';
  end if;
  update public.fila_validacao
     set status = 'aprovado', aprovado_por = auth.uid(), aprovado_em = now(), erro = null
   where id = p_id and status = 'pendente';
  if not found then
    raise exception 'Este lote não está mais pendente.';
  end if;
end;
$$;

-- Rejeitar: não custa nada, então não pede senha (vale para pendente ou aprovado ainda não executado).
create or replace function public.fila_rejeitar(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin mexe na fila.' using errcode = '42501';
  end if;
  update public.fila_validacao set status = 'rejeitado'
   where id = p_id and status in ('pendente', 'aprovado');
  if not found then
    raise exception 'Só dá para rejeitar lote pendente ou aprovado (não em execução nem concluído).';
  end if;
end;
$$;

-- Destravar: se a função caiu no meio (lote "executando" há mais de 15 minutos), volta para aprovado.
create or replace function public.fila_destravar(p_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin mexe na fila.' using errcode = '42501';
  end if;
  update public.fila_validacao
     set status = 'aprovado', erro = 'Execução interrompida. O que já foi validado ficou salvo; execute de novo para continuar.'
   where id = p_id and status = 'executando' and iniciado_em < now() - interval '15 minutes';
  if not found then
    raise exception 'Só dá para destravar um lote em execução há mais de 15 minutos.';
  end if;
end;
$$;

revoke all on function public.senha_recente(integer) from public, anon;
revoke all on function public.fila_aprovar(uuid) from public, anon;
revoke all on function public.fila_rejeitar(uuid) from public, anon;
revoke all on function public.fila_destravar(uuid) from public, anon;
grant execute on function public.senha_recente(integer) to authenticated;
grant execute on function public.fila_aprovar(uuid) to authenticated;
grant execute on function public.fila_rejeitar(uuid) to authenticated;
grant execute on function public.fila_destravar(uuid) to authenticated;

-- ---------- Log de atividade (docs/ATIVIDADE.md) ----------
-- Cada coisa que o aluno faz vira uma linha: responder questão, terminar jogo, sessão de Mergulho,
-- Revisão, Simulado, Prova e (no futuro) certificado. Nada é editado depois: só se acrescenta.
-- É a base das estatísticas, do ranking da Palavrinha e, mais pra frente, da retrospectiva do ano.
create table if not exists public.eventos_atividade (
  id uuid primary key default gen_random_uuid(),   -- o app manda o próprio id: reenviar não duplica
  aluno_id uuid not null references public.perfis (id) on delete cascade,
  curso_id text check (curso_id is null or char_length(curso_id) between 1 and 120),
  tipo text not null check (tipo in ('questao_respondida', 'jogo_concluido', 'mergulho_sessao', 'revisao_sessao',
                                     'simulado_concluido', 'prova_concluida', 'certificado_emitido',
                                     'cronograma_criado', 'bloco_concluido')),
  detalhes jsonb not null default '{}'::jsonb check (jsonb_typeof(detalhes) = 'object' and octet_length(detalhes::text) <= 4096),
  criado_em timestamptz not null default now()
);
-- 2026-10-05: tipos do Cronograma (plano criado e bloco de estudo feito). O "create table" acima só vale para
-- banco novo; aqui a regra é refeita para quem já tinha a tabela (reexecutável, não apaga nada).
alter table public.eventos_atividade drop constraint if exists eventos_atividade_tipo_check;
alter table public.eventos_atividade add constraint eventos_atividade_tipo_check
  check (tipo in ('questao_respondida', 'jogo_concluido', 'mergulho_sessao', 'revisao_sessao', 'simulado_concluido',
                  'prova_concluida', 'certificado_emitido', 'cronograma_criado', 'bloco_concluido'));
create index if not exists eventos_atividade_aluno on public.eventos_atividade (aluno_id, criado_em desc);
create index if not exists eventos_atividade_curso on public.eventos_atividade (curso_id, tipo, criado_em desc);

-- O dono é sempre quem está logado; a hora é a do servidor, salvo eventos guardados sem internet
-- (aceita a hora do aparelho se estiver entre 7 dias atrás e agora).
create or replace function public.eventos_atividade_novo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.criado_em is null or new.criado_em > now() + interval '5 minutes' or new.criado_em < now() - interval '7 days' then
    new.criado_em := now();
  end if;
  return new;
end;
$$;
drop trigger if exists eventos_atividade_novo on public.eventos_atividade;
create trigger eventos_atividade_novo before insert on public.eventos_atividade
  for each row execute function public.eventos_atividade_novo();

alter table public.eventos_atividade enable row level security;

-- Ver: o próprio aluno; o admin; o professor, só dos alunos dele e só nos cursos em comum
-- (a mesma regra do progresso na tabela "estado").
drop policy if exists "atividade: ver" on public.eventos_atividade;
create policy "atividade: ver" on public.eventos_atividade
  for select to authenticated using (
    aluno_id = auth.uid()
    or public.eh_admin()
    or (
      curso_id is not null
      and public.professor_do_curso(curso_id)
      and public.aluno_do_professor(aluno_id)
      and exists (select 1 from public.matriculas m where m.aluno_id = eventos_atividade.aluno_id and m.trilha_id = eventos_atividade.curso_id)
    )
  );
-- Gravar: só eventos da própria pessoa. Ninguém altera nem apaga pelo app.
drop policy if exists "atividade: gravar o próprio" on public.eventos_atividade;
create policy "atividade: gravar o próprio" on public.eventos_atividade
  for insert to authenticated with check (aluno_id = auth.uid());

revoke all on public.eventos_atividade from anon, authenticated;
grant select, insert on public.eventos_atividade to authenticated;

-- Leitura segura de números e sim/não do "detalhes" (valor de tipo errado vira nulo, não erro)
create or replace function public.atv_num(d jsonb, k text)
returns numeric language sql immutable as $$
  select case when jsonb_typeof(d -> k) = 'number' then (d ->> k)::numeric end;
$$;
create or replace function public.atv_sim(d jsonb, k text)
returns boolean language sql immutable as $$
  select case when jsonb_typeof(d -> k) = 'boolean' then (d ->> k)::boolean end;
$$;

-- Estatísticas de uma pessoa (padrão: quem está logado), de um curso ou de todos.
-- "security invoker": roda com as permissões de quem pede, então a regra "atividade: ver" vale aqui também.
-- O app tem a mesma conta em js/atividade.js (resumir), para o modo sem login.
create or replace function public.estatisticas_atividade(p_aluno uuid default null, p_curso text default null)
returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with ev as (
    select tipo, detalhes, criado_em from public.eventos_atividade
     where aluno_id = coalesce(p_aluno, auth.uid()) and (p_curso is null or curso_id = p_curso)
  ),
  q as (
    select coalesce(detalhes ->> 'modo', 'outro') as modo, count(*) as total,
           count(*) filter (where public.atv_sim(detalhes, 'acertou')) as acertos
      from ev where tipo = 'questao_respondida' group by 1
  ),
  j as (
    select detalhes ->> 'jogo' as jogo, count(*) as partidas,
           coalesce(sum(public.atv_num(detalhes, 'acertos')), 0) as acertos,
           coalesce(sum(public.atv_num(detalhes, 'total')), 0) as total,
           max(public.atv_num(detalhes, 'pontuacao')) as melhor,
           count(*) filter (where public.atv_sim(detalhes, 'venceu')) as vitorias
      from ev where tipo = 'jogo_concluido' and detalhes ? 'jogo' group by 1
  ),
  s as (
    select tipo, count(*) as total,
           count(*) filter (where coalesce(detalhes ->> 'motivo', 'fim') <> 'saiu') as concluidas,
           round(avg(public.atv_num(detalhes, 'nota')), 1) as media_nota,
           max(public.atv_num(detalhes, 'nota')) as melhor_nota,
           count(*) filter (where public.atv_sim(detalhes, 'aprovado')) as aprovadas
      from ev where tipo not in ('questao_respondida', 'jogo_concluido') group by 1
  )
  select jsonb_build_object(
    'questoes', jsonb_build_object('total', coalesce((select sum(total) from q), 0), 'acertos', coalesce((select sum(acertos) from q), 0)),
    'questoes_por_modo', coalesce((select jsonb_object_agg(modo, jsonb_build_object('total', total, 'acertos', acertos)) from q), '{}'::jsonb),
    'jogos', coalesce((select jsonb_agg(jsonb_build_object('jogo', jogo, 'partidas', partidas, 'acertos', acertos, 'total', total, 'melhor', melhor, 'vitorias', vitorias) order by partidas desc, jogo) from j), '[]'::jsonb),
    'sessoes', coalesce((select jsonb_object_agg(tipo, jsonb_build_object('total', total, 'concluidas', concluidas, 'media_nota', media_nota, 'melhor_nota', melhor_nota, 'aprovadas', aprovadas)) from s), '{}'::jsonb),
    'dias_ativos', (select count(distinct (criado_em at time zone 'America/Sao_Paulo')::date) from ev),
    'primeiro', (select min(criado_em) from ev),
    'ultimo', (select max(criado_em) from ev)
  );
$$;

-- Ranking Diver da Palavrinha num curso: TODAS as partidas da variante (palavra do dia e Treino livre),
-- só de alunos matriculados e ativos. Pontos por vitória = tentativas máximas + 1 − tentativas usadas
-- (Palavrinha 6, x2 7, x4 9: acertar de primeira na Palavrinha vale 6). Placar do mês (zera no dia 1º,
-- pela data da partida) ou geral. Nome curto ("Maria S.").
-- "security definer" porque o aluno não lê os eventos dos colegas: a função devolve só o placar,
-- e só para quem é do curso (ou professor dele, ou admin).
create or replace function public.ranking_palavrinha(p_curso text, p_variante text default 'x1', p_periodo text default 'mes')
returns table (posicao integer, nome text, pontos integer, vitorias integer, partidas integer, sou_eu boolean)
language sql stable security definer
set search_path = public
as $$
  with pode as (
    select public.eh_admin() or public.professor_do_curso(p_curso)
        or exists (select 1 from public.matriculas m where m.aluno_id = auth.uid() and m.trilha_id = p_curso) as ok
  ),
  maximo as (
    select case p_variante when 'x1' then 6 when 'x2' then 7 when 'x4' then 9 end as tentativas
  ),
  partidas as (
    select e.aluno_id, e.detalhes
      from public.eventos_atividade e
      join public.perfis p on p.id = e.aluno_id and p.ativo
     where (select ok from pode)
       -- entra quem é do curso (aluno ou professor matriculado) e o admin, que joga em qualquer curso
       and (p.papel = 'admin' or exists (select 1 from public.matriculas m where m.aluno_id = e.aluno_id and m.trilha_id = p_curso))
       and (select tentativas from maximo) is not null
       and e.tipo = 'jogo_concluido' and e.curso_id = p_curso
       and e.detalhes ->> 'jogo' = 'palavrinha' and e.detalhes ->> 'variante' = p_variante
       and (e.detalhes ->> 'data') ~ '^\d{4}-\d{2}-\d{2}$'
       and (p_periodo = 'geral' or left(e.detalhes ->> 'data', 7) = to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM'))
  ),
  placar as (
    select d.aluno_id,
           sum(case when public.atv_sim(d.detalhes, 'venceu')
                    then greatest(0, (select tentativas from maximo) + 1 - coalesce(public.atv_num(d.detalhes, 'tentativas'), 99))
                    else 0 end)::integer as pontos,
           (count(*) filter (where public.atv_sim(d.detalhes, 'venceu')))::integer as vitorias,
           count(*)::integer as partidas
      from partidas d group by d.aluno_id
  )
  select (rank() over (order by pl.pontos desc, pl.vitorias desc))::integer,
         (select partes[1] || case when array_length(partes, 1) > 1 then ' ' || upper(left(partes[array_length(partes, 1)], 1)) || '.' else '' end
            from (select regexp_split_to_array(trim(p.nome), '\s+') as partes) x),
         pl.pontos, pl.vitorias, pl.partidas, pl.aluno_id = auth.uid()
    from placar pl join public.perfis p on p.id = pl.aluno_id
   order by 1, 2
   limit 200;
$$;

-- Ranking Diver GLOBAL da Palavrinha: todos os cursos juntos, UMA linha por pessoa, com a soma dos
-- pontos de todos os cursos. curso_id = o curso em que ela mais pontuou; cursos = em quantos jogou.
-- Mesma pontuação e mesmos períodos do ranking do curso. Entram pessoas ativas nas partidas de cursos
-- em que estão matriculadas (alunos e professores) e o admin, que joga em qualquer curso.
-- Qualquer pessoa logada e ativa consulta (o placar mostra só nome curto, curso e pontos).
-- Substitui a ranking_palavrinha_global (que dava uma linha por pessoa E curso); a antiga sai daqui.
drop function if exists public.ranking_palavrinha_global(text, text);
create or replace function public.ranking_palavrinha_todos(p_variante text default 'x1', p_periodo text default 'mes')
returns table (posicao integer, nome text, curso_id text, cursos integer, pontos integer, vitorias integer, partidas integer, sou_eu boolean)
language sql stable security definer
set search_path = public
as $$
  with pode as (
    select exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo) as ok
  ),
  maximo as (
    select case p_variante when 'x1' then 6 when 'x2' then 7 when 'x4' then 9 end as tentativas
  ),
  partidas as (
    select e.aluno_id, e.curso_id, e.detalhes
      from public.eventos_atividade e
      join public.perfis p on p.id = e.aluno_id and p.ativo
     where (select ok from pode)
       and (p.papel = 'admin' or exists (select 1 from public.matriculas m where m.aluno_id = e.aluno_id and m.trilha_id = e.curso_id))
       and (select tentativas from maximo) is not null
       and e.tipo = 'jogo_concluido' and e.curso_id is not null
       and e.detalhes ->> 'jogo' = 'palavrinha' and e.detalhes ->> 'variante' = p_variante
       and (e.detalhes ->> 'data') ~ '^\d{4}-\d{2}-\d{2}$'
       and (p_periodo = 'geral' or left(e.detalhes ->> 'data', 7) = to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM'))
  ),
  por_curso as (
    select d.aluno_id, d.curso_id,
           sum(case when public.atv_sim(d.detalhes, 'venceu')
                    then greatest(0, (select tentativas from maximo) + 1 - coalesce(public.atv_num(d.detalhes, 'tentativas'), 99))
                    else 0 end)::integer as pontos,
           (count(*) filter (where public.atv_sim(d.detalhes, 'venceu')))::integer as vitorias,
           count(*)::integer as partidas
      from partidas d group by d.aluno_id, d.curso_id
  ),
  placar as (
    select c.aluno_id,
           (array_agg(c.curso_id order by c.pontos desc, c.partidas desc, c.curso_id))[1] as curso_id,
           count(*)::integer as cursos,
           sum(c.pontos)::integer as pontos, sum(c.vitorias)::integer as vitorias, sum(c.partidas)::integer as partidas
      from por_curso c group by c.aluno_id
  )
  select (rank() over (order by pl.pontos desc, pl.vitorias desc))::integer,
         (select partes[1] || case when array_length(partes, 1) > 1 then ' ' || upper(left(partes[array_length(partes, 1)], 1)) || '.' else '' end
            from (select regexp_split_to_array(trim(p.nome), '\s+') as partes) x),
         pl.curso_id, pl.cursos, pl.pontos, pl.vitorias, pl.partidas, pl.aluno_id = auth.uid()
    from placar pl join public.perfis p on p.id = pl.aluno_id
   order by 1, 2
   limit 200;
$$;

revoke all on function public.estatisticas_atividade(uuid, text) from public, anon;
revoke all on function public.ranking_palavrinha(text, text, text) from public, anon;
grant execute on function public.estatisticas_atividade(uuid, text) to authenticated;
grant execute on function public.ranking_palavrinha(text, text, text) to authenticated;
revoke all on function public.ranking_palavrinha_todos(text, text) from public, anon;
grant execute on function public.ranking_palavrinha_todos(text, text) to authenticated;

-- Ranking ao vivo do Caso Resolvido ("Operação Recife Sombrio"): turma de UM curso.
-- Soma os pontos de cada mergulho e da acusação (detalhes.pontos_missao dos eventos jogo_concluido do jogo
-- "caso") de TODOS os casos da pessoa (detalhes.rodada = número do caso); treino não conta.
-- Cada mergulho vale uma vez por caso (o maior, se o evento vier repetido). missoes = mergulhos somados.
-- Entram alunos e professores matriculados no curso e o admin; consulta quem é do curso (ou admin).
create or replace function public.ranking_caso(p_curso text, p_caso text default 'recife-sombrio')
returns table (posicao integer, nome text, pontos integer, missoes integer, sou_eu boolean)
language sql stable security definer
set search_path = public
as $$
  with pode as (
    select public.eh_admin() or public.professor_do_curso(p_curso)
        or exists (select 1 from public.matriculas m where m.aluno_id = auth.uid() and m.trilha_id = p_curso) as ok
  ),
  partidas as (
    select e.aluno_id, e.detalhes
      from public.eventos_atividade e
      join public.perfis p on p.id = e.aluno_id and p.ativo
     where (select ok from pode)
       and (p.papel = 'admin' or exists (select 1 from public.matriculas m where m.aluno_id = e.aluno_id and m.trilha_id = p_curso))
       and e.tipo = 'jogo_concluido' and e.curso_id = p_curso
       and e.detalhes ->> 'jogo' = 'caso' and e.detalhes ->> 'operacao' = p_caso
       and coalesce(public.atv_sim(e.detalhes, 'treino'), false) = false
       and coalesce(e.detalhes ->> 'missao', '') <> ''
  ),
  por_missao as (
    select d.aluno_id, coalesce(d.detalhes ->> 'rodada', '0') as rodada, d.detalhes ->> 'missao' as missao,
           max(greatest(0, least(2000, coalesce(public.atv_num(d.detalhes, 'pontos_missao'), 0)))) as pts
      from partidas d group by d.aluno_id, coalesce(d.detalhes ->> 'rodada', '0'), d.detalhes ->> 'missao'
  ),
  placar as (
    select m.aluno_id, sum(m.pts)::integer as pontos, count(*)::integer as missoes
      from por_missao m group by m.aluno_id
  )
  select (rank() over (order by pl.pontos desc))::integer,
         (select partes[1] || case when array_length(partes, 1) > 1 then ' ' || upper(left(partes[array_length(partes, 1)], 1)) || '.' else '' end
            from (select regexp_split_to_array(trim(p.nome), '\s+') as partes) x),
         pl.pontos, pl.missoes, pl.aluno_id = auth.uid()
    from placar pl join public.perfis p on p.id = pl.aluno_id
   order by 1, 2
   limit 200;
$$;
revoke all on function public.ranking_caso(text, text) from public, anon;
grant execute on function public.ranking_caso(text, text) to authenticated;

-- =====================================================================================
-- SALA DE DESCOMPRESSÃO (para todos; só o horário pode ser fechado por admin ou professor)
-- =====================================================================================

-- Horários em que a sala fica FECHADA para alunos. trilha_id nulo = todos os alunos (só o admin cria);
-- com trilha_id = os alunos daquele curso (o professor do curso ou o admin cria). dias: 0 = domingo … 6 = sábado.
create table if not exists public.sala_bloqueios (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid not null default auth.uid() references public.perfis (id) on delete cascade,
  trilha_id text check (trilha_id is null or char_length(trilha_id) between 1 and 120),
  dias smallint[] not null check (cardinality(dias) between 1 and 7 and dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  inicio time not null,
  fim time not null,
  criado_em timestamptz not null default now(),
  check (fim > inicio)
);
alter table public.sala_bloqueios enable row level security;
drop policy if exists "sala: ver horários" on public.sala_bloqueios;
create policy "sala: ver horários" on public.sala_bloqueios for select to authenticated using (true);
drop policy if exists "sala: criar horário" on public.sala_bloqueios;
create policy "sala: criar horário" on public.sala_bloqueios for insert to authenticated with check (
  criado_por = auth.uid() and (public.eh_admin() or (trilha_id is not null and public.professor_do_curso(trilha_id)))
);
drop policy if exists "sala: apagar horário" on public.sala_bloqueios;
create policy "sala: apagar horário" on public.sala_bloqueios for delete to authenticated using (public.eh_admin() or criado_por = auth.uid());
revoke all on public.sala_bloqueios from anon, authenticated;
grant select, insert, delete on public.sala_bloqueios to authenticated;

-- A sala está aberta para mim agora? (horário de Brasília). Admin e professor nunca ficam bloqueados.
create or replace function public.sala_status()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  with agora as (select (now() at time zone 'America/Sao_Paulo') as t),
  eu as (select p.papel from public.perfis p where p.id = auth.uid() and p.ativo),
  regras as (
    select b.fim
      from public.sala_bloqueios b, agora a
     where (select papel from eu) = 'aluno'
       and extract(dow from a.t)::smallint = any (b.dias)
       and a.t::time >= b.inicio and a.t::time < b.fim
       and (b.trilha_id is null or exists (select 1 from public.matriculas m where m.aluno_id = auth.uid() and m.trilha_id = b.trilha_id))
  )
  select case when exists (select 1 from regras)
              then jsonb_build_object('aberta', false, 'ate', to_char((select max(fim) from regras), 'HH24:MI'))
              else jsonb_build_object('aberta', true) end;
$$;
revoke all on function public.sala_status() from public, anon;
grant execute on function public.sala_status() to authenticated;

-- Placar da sala (todo mundo junto, sem separar por curso). Pontos vêm do log (jogo_concluido sem curso,
-- detalhes.jogo = sala-…). Investigação e palavra do dia da Palavrinha: o melhor de cada dia, somado; treino da
-- Palavrinha (detalhes.modo = treino): soma do dia até 60. Tiro ao Alvo e Pit Stop Mental: o recorde.
-- Batata Quente: soma das vitórias do dia (até 150 por dia) + o recorde do modo Sozinho. "geral" = soma de todos.
create or replace function public.ranking_sala(p_jogo text default 'geral', p_periodo text default 'mes')
returns table (posicao integer, nome text, pontos integer, sou_eu boolean)
language sql stable security definer
set search_path = public
as $$
  with pode as (
    select exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo) as ok
  ),
  ev as (
    select e.aluno_id,
           case when e.detalhes ->> 'jogo' = 'sala-batata' and e.detalhes ->> 'modo' = 'sozinho' then 'sala-batata-solo'
                when e.detalhes ->> 'jogo' = 'sala-palavrinha' and e.detalhes ->> 'modo' = 'treino' then 'sala-palavrinha-treino'
                else e.detalhes ->> 'jogo' end as jogo,
           coalesce(nullif(e.detalhes ->> 'data', ''), to_char(e.criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')) as dia,
           greatest(0, least(5000, coalesce(public.atv_num(e.detalhes, 'pontos'), 0))) as pts
      from public.eventos_atividade e
      join public.perfis p on p.id = e.aluno_id and p.ativo
     where (select ok from pode)
       and e.tipo = 'jogo_concluido' and e.curso_id is null
       and e.detalhes ->> 'jogo' in ('sala-investigacao', 'sala-palavrinha', 'sala-tiro', 'sala-batata', 'sala-pitstop', 'sala-cardume')
       and (p_periodo = 'geral' or to_char(e.criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM') = to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM'))
  ),
  por_dia as (
    select aluno_id, jogo, dia, case when jogo = 'sala-batata' then least(150, sum(pts))
                                     when jogo = 'sala-palavrinha-treino' then least(60, sum(pts)) else max(pts) end as s
      from ev group by aluno_id, jogo, dia
  ),
  por_jogo as (
    select aluno_id, jogo, case when jogo in ('sala-tiro', 'sala-batata-solo', 'sala-pitstop', 'sala-cardume') then max(s) else sum(s) end as s
      from por_dia group by aluno_id, jogo
  ),
  placar as (
    select aluno_id, sum(s)::integer as pontos
      from por_jogo where p_jogo = 'geral' or jogo = 'sala-' || p_jogo or (p_jogo = 'batata' and jogo = 'sala-batata-solo')
                       or (p_jogo = 'palavrinha' and jogo = 'sala-palavrinha-treino')
     group by aluno_id
  )
  select (rank() over (order by pl.pontos desc))::integer,
         (select partes[1] || case when array_length(partes, 1) > 1 then ' ' || upper(left(partes[array_length(partes, 1)], 1)) || '.' else '' end
            from (select regexp_split_to_array(trim(p.nome), '\s+') as partes) x),
         pl.pontos, pl.aluno_id = auth.uid()
    from placar pl join public.perfis p on p.id = pl.aluno_id
   where pl.pontos > 0
   order by 1, 2
   limit 200;
$$;
revoke all on function public.ranking_sala(text, text) from public, anon;
grant execute on function public.ranking_sala(text, text) to authenticated;

-- ---------- Batata Quente online (2 pessoas, cada uma no seu aparelho) ----------
-- A sala só muda pelas funções abaixo (security definer); quem joga só lê a própria sala.
-- O dicionário fica no app (a palavra chega já conferida); aqui o banco confere a vez, o tempo,
-- a sílaba e as palavras repetidas.
create table if not exists public.batata_salas (
  codigo text primary key check (codigo ~ '^[A-Z]{4}$'),
  jogadores uuid[] not null,
  nomes text[] not null,
  estado jsonb not null,
  versao integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.batata_salas enable row level security;
drop policy if exists "batata: ver a própria sala" on public.batata_salas;
create policy "batata: ver a própria sala" on public.batata_salas for select to authenticated using (auth.uid() = any (jogadores));
revoke all on public.batata_salas from anon, authenticated;
grant select on public.batata_salas to authenticated;

create or replace function public.batata_agora()
returns bigint language sql volatile as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint; $$;

-- Sílaba da rodada: no começo só as de 2 letras; depois, metade de 3 letras (mesma lista do app: data/sala/silabas.json)
create or replace function public.batata_silaba(p_rodada integer)
returns text language sql volatile as $$
  select case when p_rodada < 6 or random() < 0.5
              then (array['ar','ra','ca','an','co','ri','in','ia','ro','en','ic','al','ta','to','na','te','er','ti','la','ac','li','it','on','ma','or','ni','no','el','re','io','ir','ol','lo','de','at','is','es','se','di','os','id','mo','mi','il','tr','ad','am','st','do','le'])[1 + floor(random() * 50)::int]
              else (array['ico','ina','aca','eir','car','ens','ari','ita','iro','nse','ano','ara','qui','ide','oni','ent','cao','tic','ira','ria','eri','ito','ite','ana','ino','ant','ado','tar','oli','tri','que','rio','ato','ati','ani','ela','vel','ica','rin','ter','ali','tro','ida','ona','est','ero','ist','nte','ric','ran'])[1 + floor(random() * 50)::int] end;
$$;

create or replace function public.batata_ver(p_codigo text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object('codigo', s.codigo, 'nomes', to_jsonb(s.nomes), 'estado', s.estado, 'versao', s.versao,
                            'agora', public.batata_agora(), 'eu', array_position(s.jogadores, auth.uid()) - 1)
    from public.batata_salas s
   where s.codigo = upper(trim(p_codigo)) and auth.uid() = any (s.jogadores);
$$;

create or replace function public.batata_criar(p_tempo integer default 15)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_cod text;
  v_nome text;
begin
  select split_part(trim(p.nome), ' ', 1) into v_nome from public.perfis p where p.id = auth.uid() and p.ativo;
  if v_nome is null then raise exception 'Entre com sua conta para jogar online.'; end if;
  -- Código livre ou de uma sala parada há mais de um dia (ela é reaproveitada: a tabela não cresce sem fim).
  loop
    v_cod := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::int, 1), '') from generate_series(1, 4));
    exit when not exists (select 1 from public.batata_salas where codigo = v_cod and atualizado_em >= now() - interval '1 day');
  end loop;
  insert into public.batata_salas (codigo, jogadores, nomes, estado)
  values (v_cod, array[auth.uid()], array[v_nome], jsonb_build_object(
    'status', 'aguardando', 'tempo', greatest(8, least(30, coalesce(p_tempo, 15))), 'vidas', jsonb_build_array(3, 3),
    'letras', jsonb_build_array('', ''), 'vez', 0, 'silaba', null, 'usadas', '[]'::jsonb, 'rodada', 0,
    'prazo', null, 'vencedor', null, 'ultima', null))
  on conflict (codigo) do update
     set jogadores = excluded.jogadores, nomes = excluded.nomes, estado = excluded.estado,
         versao = public.batata_salas.versao + 1, criado_em = now(), atualizado_em = now();
  return public.batata_ver(v_cod);
end;
$$;

create or replace function public.batata_entrar(p_codigo text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  s public.batata_salas;
  v_nome text;
begin
  select * into s from public.batata_salas where codigo = upper(trim(p_codigo)) for update;
  if not found then raise exception 'Não achei essa sala. Confira o código.'; end if;
  if auth.uid() = any (s.jogadores) then return public.batata_ver(s.codigo); end if;
  if s.estado ->> 'status' <> 'aguardando' or cardinality(s.jogadores) >= 2 then raise exception 'Essa sala já está cheia.'; end if;
  select split_part(trim(p.nome), ' ', 1) into v_nome from public.perfis p where p.id = auth.uid() and p.ativo;
  if v_nome is null then raise exception 'Entre com sua conta para jogar online.'; end if;
  update public.batata_salas
     set jogadores = jogadores || auth.uid(), nomes = nomes || v_nome,
         estado = estado || jsonb_build_object('status', 'jogando', 'vez', floor(random() * 2)::int, 'silaba', public.batata_silaba(0),
                                               'prazo', public.batata_agora() + (estado ->> 'tempo')::int * 1000),
         versao = versao + 1, atualizado_em = now()
   where codigo = s.codigo;
  return public.batata_ver(s.codigo);
end;
$$;

create or replace function public.batata_jogar(p_codigo text, p_palavra text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  s public.batata_salas;
  e jsonb;
  v_eu integer;
  v_p text := lower(coalesce(p_palavra, ''));
  v_letras text;
  v_vidas jsonb;
  v_rod integer;
  v_bonus boolean := false;
  c text;
  alfabeto constant text := 'abcdefghijlmnopqrstuvxz';
begin
  select * into s from public.batata_salas where codigo = upper(trim(p_codigo)) for update;
  if not found or not (auth.uid() = any (s.jogadores)) then raise exception 'Sala não encontrada.'; end if;
  e := s.estado;
  v_eu := array_position(s.jogadores, auth.uid()) - 1;
  if e ->> 'status' <> 'jogando' then raise exception 'A partida não está em andamento.'; end if;
  if (e ->> 'vez')::int <> v_eu then raise exception 'Calma: não é a sua vez.'; end if;
  if public.batata_agora() > (e ->> 'prazo')::bigint + 800 then raise exception 'A bomba já explodiu.'; end if;
  if v_p !~ '^[a-z]{3,25}$' then raise exception 'Palavra inválida.'; end if;
  if position(e ->> 'silaba' in v_p) = 0 then raise exception 'A palavra precisa ter "%".', upper(e ->> 'silaba'); end if;
  if (e -> 'usadas') ? v_p then raise exception 'Essa palavra já foi usada.'; end if;
  v_letras := e -> 'letras' ->> v_eu;
  foreach c in array regexp_split_to_array(v_p, '') loop
    if position(c in alfabeto) > 0 and position(c in v_letras) = 0 then v_letras := v_letras || c; end if;
  end loop;
  v_vidas := e -> 'vidas';
  if length(v_letras) >= length(alfabeto) then
    v_letras := '';
    v_bonus := true;
    v_vidas := jsonb_set(v_vidas, array[v_eu::text], to_jsonb(least(5, (v_vidas ->> v_eu)::int + 1)));
  end if;
  v_rod := (e ->> 'rodada')::int + 1;
  e := e || jsonb_build_object(
    'usadas', (e -> 'usadas') || to_jsonb(v_p), 'letras', jsonb_set(e -> 'letras', array[v_eu::text], to_jsonb(v_letras)),
    'vidas', v_vidas, 'vez', 1 - v_eu, 'rodada', v_rod, 'silaba', public.batata_silaba(v_rod),
    'prazo', public.batata_agora() + greatest(5000, (e ->> 'tempo')::int * 1000 - v_rod * 400),
    'ultima', jsonb_build_object('quem', v_eu, 'palavra', v_p, 'tipo', case when v_bonus then 'bonus' else 'ok' end));
  update public.batata_salas set estado = e, versao = versao + 1, atualizado_em = now() where codigo = s.codigo;
  return public.batata_ver(s.codigo);
end;
$$;

-- Passou do prazo? Qualquer um dos dois pode chamar: quem estava com a bomba perde uma vida.
create or replace function public.batata_explodir(p_codigo text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  s public.batata_salas;
  e jsonb;
  v_vez integer;
  v_vida integer;
  v_rod integer;
begin
  select * into s from public.batata_salas where codigo = upper(trim(p_codigo)) for update;
  if not found or not (auth.uid() = any (s.jogadores)) then raise exception 'Sala não encontrada.'; end if;
  e := s.estado;
  if e ->> 'status' <> 'jogando' or public.batata_agora() <= (e ->> 'prazo')::bigint then return public.batata_ver(s.codigo); end if;
  v_vez := (e ->> 'vez')::int;
  v_vida := (e -> 'vidas' ->> v_vez)::int - 1;
  v_rod := (e ->> 'rodada')::int + 1;
  e := e || jsonb_build_object('vidas', jsonb_set(e -> 'vidas', array[v_vez::text], to_jsonb(v_vida)),
                               'ultima', jsonb_build_object('quem', v_vez, 'tipo', 'boom', 'silaba', e ->> 'silaba'));
  if v_vida <= 0 then
    e := e || jsonb_build_object('status', 'fim', 'vencedor', 1 - v_vez);
  else
    e := e || jsonb_build_object('vez', 1 - v_vez, 'rodada', v_rod, 'silaba', public.batata_silaba(v_rod),
                                 'prazo', public.batata_agora() + greatest(5000, (e ->> 'tempo')::int * 1000 - v_rod * 400));
  end if;
  update public.batata_salas set estado = e, versao = versao + 1, atualizado_em = now() where codigo = s.codigo;
  return public.batata_ver(s.codigo);
end;
$$;

create or replace function public.batata_sair(p_codigo text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  s public.batata_salas;
  v_eu integer;
begin
  select * into s from public.batata_salas where codigo = upper(trim(p_codigo)) for update;
  if not found or not (auth.uid() = any (s.jogadores)) then return; end if;
  v_eu := array_position(s.jogadores, auth.uid()) - 1;
  if s.estado ->> 'status' = 'aguardando' then
    update public.batata_salas
       set estado = estado || jsonb_build_object('status', 'fim', 'vencedor', null, 'ultima', jsonb_build_object('quem', v_eu, 'tipo', 'saiu')),
           versao = versao + 1, atualizado_em = now()
     where codigo = s.codigo;
  elsif s.estado ->> 'status' = 'jogando' then
    update public.batata_salas
       set estado = estado || jsonb_build_object('status', 'fim', 'vencedor', 1 - v_eu, 'ultima', jsonb_build_object('quem', v_eu, 'tipo', 'saiu')),
           versao = versao + 1, atualizado_em = now()
     where codigo = s.codigo;
  end if;
end;
$$;

revoke all on function public.batata_agora() from public, anon;
revoke all on function public.batata_silaba(integer) from public, anon;
revoke all on function public.batata_ver(text) from public, anon;
revoke all on function public.batata_criar(integer) from public, anon;
revoke all on function public.batata_entrar(text) from public, anon;
revoke all on function public.batata_jogar(text, text) from public, anon;
revoke all on function public.batata_explodir(text) from public, anon;
revoke all on function public.batata_sair(text) from public, anon;
grant execute on function public.batata_ver(text) to authenticated;
grant execute on function public.batata_criar(integer) to authenticated;
grant execute on function public.batata_entrar(text) to authenticated;
grant execute on function public.batata_jogar(text, text) to authenticated;
grant execute on function public.batata_explodir(text) to authenticated;
grant execute on function public.batata_sair(text) to authenticated;

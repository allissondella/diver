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

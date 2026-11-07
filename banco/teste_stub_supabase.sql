-- Simula o que o Supabase já tem pronto, para testar o schema num PostgreSQL comum (PGlite).
-- NÃO rodar no Supabase.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
-- No Supabase, auth.uid() lê o "sub" do token de login (JWT) da requisição e auth.jwt() devolve o token inteiro
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
-- Segundo fator (MFA) cadastrado no Supabase Auth: só as colunas que o schema usa
create table if not exists auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null,
  factor_type text not null default 'totp', status text not null default 'unverified', created_at timestamptz not null default now());
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema auth to anon, authenticated;
-- Supabase Storage: só as colunas que as políticas usam (bucket e caminho do arquivo)
create schema if not exists storage;
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null,
  created_at timestamptz not null default now());
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert on storage.objects to authenticated;
set timezone to 'America/Sao_Paulo';

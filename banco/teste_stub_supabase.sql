-- Simula o que o Supabase já tem pronto, para testar o schema num PostgreSQL comum (PGlite).
-- NÃO rodar no Supabase.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
-- No Supabase, auth.uid() lê o "sub" do token de login (JWT) da requisição
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema auth to anon, authenticated;
set timezone to 'America/Sao_Paulo';

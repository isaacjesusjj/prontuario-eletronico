-- =====================================================================
-- Vínculo — schema do banco (PostgreSQL 15+ / Supabase, região São Paulo)
-- Cada tabela corresponde a uma coleção de dados/dados-iniciais.json
-- (nomes em snake_case: casoId → caso_id). Rodar no SQL Editor do
-- Supabase, como "postgres". Testado em PostgreSQL 18 (banco/testar_banco.mjs).
--
-- O que o banco garante, mesmo que alguém pule as telas e chame a API:
--   1. Validação: CPF com dígitos verificadores, telefone, e-mail, listas fechadas.
--   2. Quem vê o quê: políticas RLS iguais às regras de js/permissoes.js.
--   3. Imutabilidade: evolução validada, assinaturas, adendos, consentimentos,
--      anamneses e auditoria não aceitam UPDATE nem DELETE.
--   4. Auditoria com cadeia de hash SHA-256 calculada pelo próprio banco,
--      com a mesma fórmula do navegador (js/estado.js).
-- =====================================================================

create schema if not exists app;

-- ---------------------------------------------------------------------
-- Validadores (os mesmos de js/validadores.js)
-- ---------------------------------------------------------------------
create or replace function app.cpf_valido(c text) returns boolean
language plpgsql immutable as $$
declare s int; d int; t int; i int;
begin
  if c is null or c !~ '^\d{11}$' or c ~ '^(\d)\1{10}$' then return false; end if;
  for t in 9..10 loop
    s := 0;
    for i in 1..t loop s := s + substr(c, i, 1)::int * (t + 2 - i); end loop;
    d := (s * 10) % 11;
    if d = 10 then d := 0; end if;
    if d <> substr(c, t + 1, 1)::int then return false; end if;
  end loop;
  return true;
end $$;

create domain app.telefone as text check (value ~ '^\d{10,11}$');
create domain app.email as text check (value ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and length(value) <= 254);

-- ---------------------------------------------------------------------
-- Pessoas e equipe
-- ---------------------------------------------------------------------
create table pacientes (
  id                    text primary key default gen_random_uuid()::text,
  nome                  text not null check (length(nome) between 2 and 80),
  nome_social           text not null default '',
  data_nascimento       date not null check (data_nascimento <= current_date and data_nascimento > current_date - interval '120 years'),
  cpf                   text check (cpf = '' or app.cpf_valido(cpf)),
  telefone              app.telefone not null,
  email                 text not null default '' check (email = '' or email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  responsavel_nome      text not null default '',
  responsavel_telefone  text not null default '' check (responsavel_telefone = '' or responsavel_telefone ~ '^\d{10,11}$'),
  canal_lembrete        text not null default 'nenhum' check (canal_lembrete in ('whatsapp', 'email', 'nenhum')),
  criado_em             date not null default current_date
);
-- CPF não se repete (vazio = pessoa sem CPF)
create unique index pacientes_cpf_unico on pacientes (cpf) where cpf is not null and cpf <> '';

create table usuarios (
  id               text primary key default gen_random_uuid()::text,
  auth_id          uuid unique,              -- liga a conta ao Supabase Auth (auth.users.id); a senha fica lá, com hash
  nome             text check (nome is null or length(nome) between 2 and 80),
  login            text not null unique check (login ~ '^[a-z0-9._-]{3,60}$'),
  email            app.email not null unique,
  perfil           text not null check (perfil in ('tecnico', 'supervisor', 'estagiario', 'paciente', 'direcao')),
  cargo            text,
  crp              text,
  matricula        text unique check (matricula is null or matricula ~ '^[A-Za-z0-9]{6,12}$'),
  paciente_id      text references pacientes (id),
  senha_provisoria boolean not null default false,
  ativo            boolean not null default true,
  criado_em        date not null default current_date,
  check ((perfil = 'paciente') = (paciente_id is not null)),
  check (perfil not in ('tecnico', 'supervisor') or crp is not null)
);

create table grupos (
  id            text primary key default gen_random_uuid()::text,
  nome          text not null,
  foco          text not null,
  supervisor_id text not null references usuarios (id)
);

create table subgrupos (
  id       text primary key default gen_random_uuid()::text,
  grupo_id text not null references grupos (id),
  nome     text not null
);

-- Vínculo de estágio: o acesso nasce e morre com ele (fim = dia em que deixa de valer)
create table alocacoes (
  id            text primary key default gen_random_uuid()::text,
  estagiario_id text not null references usuarios (id),
  grupo_id      text not null references grupos (id),
  subgrupo_id   text references subgrupos (id),
  inicio        date not null default current_date,
  fim           date check (fim is null or fim >= inicio)
);
create unique index alocacao_ativa_unica on alocacoes (estagiario_id) where fim is null;

-- ---------------------------------------------------------------------
-- Atendimento
-- ---------------------------------------------------------------------
create table casos (
  id          text primary key default gen_random_uuid()::text,
  paciente_id text not null references pacientes (id),
  grupo_id    text references grupos (id),
  subgrupo_id text references subgrupos (id),
  status      text not null check (status in ('aguardando-alocacao', 'ativo', 'encerrado')),
  inicio      date not null default current_date,
  check (status = 'aguardando-alocacao' or grupo_id is not null)
);

create table inscricoes (
  id               text primary key default gen_random_uuid()::text,
  nome             text not null check (length(nome) between 2 and 80),
  nome_social      text not null default '',
  data_nascimento  date not null,
  cpf              text not null default '' check (cpf = '' or app.cpf_valido(cpf)),
  sem_cpf          boolean not null default false,
  telefone         app.telefone not null,
  email            text not null default '',
  responsavel_nome text not null default '',
  resumo           text not null check (length(resumo) between 3 and 140),
  periodo          text not null check (periodo in ('Manhã', 'Tarde', 'Noite')),
  data             date not null default current_date,
  status           text not null default 'aguardando' check (status in ('aguardando', 'triada', 'encaminhado-externo', 'duplicada', 'cancelada')),
  aviso_versao     text not null,
  duplicidade      jsonb,                    -- calculada pelo banco (trigger), nunca pelo formulário
  caso_id          text references casos (id),
  check (sem_cpf or cpf <> '')
);

-- Anamnese, demanda e objetivos: cada edição é uma nova versão
create table anamneses (
  id                 text primary key default gen_random_uuid()::text,
  caso_id            text not null references casos (id),
  versao             int not null check (versao >= 1),
  autor_id           text not null references usuarios (id),
  em                 timestamptz not null default now(),
  demanda            text not null,
  objetivos          text not null,
  queixa             text not null default '',
  sintomas           text not null default '',
  historico_familiar text not null default '',
  medicacoes         text not null default '',
  historico_clinico  text not null default '',
  unique (caso_id, versao)
);

-- Consentimento por finalidade; revogar = novo registro (vale o mais recente)
create table consentimentos (
  id             text primary key default gen_random_uuid()::text,
  caso_id        text not null references casos (id),
  finalidade     text not null check (finalidade in ('contrato', 'supervisaoGrupo', 'gravacao', 'ensinoAnonimo', 'lembretes')),
  concedido      boolean not null,
  termo_versao   text not null,
  registrado_por text not null references usuarios (id),
  em             timestamptz not null default now()
);

create table encerramentos (
  id             text primary key default gen_random_uuid()::text,
  caso_id        text not null unique references casos (id),
  data           date not null default current_date,
  tipo           text not null check (tipo in ('alta', 'encaminhamento', 'abandono')),
  motivo         text not null,
  registro       text not null,
  registrado_por text not null references usuarios (id)
);

create table sessoes (
  id                      text primary key default gen_random_uuid()::text,
  caso_id                 text not null references casos (id),
  data                    date not null,
  hora                    time not null check (hora between '07:00' and '21:00'),
  presenca                text not null default 'agendada' check (presenca in ('agendada', 'presente', 'falta', 'falta-justificada', 'cancelada')),
  confirmada              boolean not null default false,
  presenca_registrada_por text references usuarios (id)
);

create table evolucoes (
  id                    text primary key default gen_random_uuid()::text,
  caso_id               text not null references casos (id),
  sessao_id             text references sessoes (id),
  autor_id              text not null references usuarios (id),
  data                  date not null default current_date,
  status                text not null check (status in ('rascunho', 'enviada', 'devolvida', 'validada')),
  texto                 text not null check (length(texto) >= 10),
  comentario_supervisor text not null default '',
  check (status <> 'devolvida' or length(comentario_supervisor) >= 5)
);

-- Assinatura eletrônica simples (login). hash = SHA-256 do conteúdo assinado.
create table assinaturas (
  id         text primary key default gen_random_uuid()::text,
  alvo_tipo  text not null check (alvo_tipo in ('evolucao', 'documento', 'anamnese')),
  alvo_id    text not null,
  usuario_id text not null references usuarios (id),
  papel      text not null check (papel in ('estagiario', 'supervisor')),
  em         timestamptz not null default now(),
  hash       text check (hash is null or hash ~ '^[0-9a-f]{64}$')
);

create table adendos (
  id          text primary key default gen_random_uuid()::text,
  evolucao_id text not null references evolucoes (id),
  autor_id    text not null references usuarios (id),
  em          timestamptz not null default now(),
  motivo      text not null,
  texto       text not null check (length(texto) >= 5)
);

-- Registro de supervisão: fora do prontuário (Res. CFP 05/2025, art. 17)
create table orientacoes (
  id            text primary key default gen_random_uuid()::text,
  caso_id       text not null references casos (id),
  supervisor_id text not null references usuarios (id),
  em            timestamptz not null default now(),
  texto         text not null
);

create table documentos (
  id           text primary key default gen_random_uuid()::text,
  caso_id      text not null references casos (id),
  tipo         text not null,
  titulo       text not null,
  finalidade   text not null check (length(finalidade) >= 3),
  destinatario text not null check (length(destinatario) >= 3),
  emitido_em   date not null default current_date,
  autor_id     text not null references usuarios (id)
);

-- O conteúdo do arquivo vai para o Supabase Storage (bucket privado "anexos")
create table anexos (
  id          text primary key default gen_random_uuid()::text,
  caso_id     text not null references casos (id),
  nome        text not null,
  tipo        text not null check (tipo in ('application/pdf', 'image/jpeg', 'image/png')),
  tamanho     int not null check (tamanho between 0 and 2097152),
  descricao   text not null default '—',
  enviado_por text not null references usuarios (id),
  em          date not null default current_date,
  hash        text,
  arquivo_id  text
);

-- Avaliação psicológica: fora do prontuário (Res. CFP 05/2025, art. 14)
create table avaliacoes (
  id           text primary key default gen_random_uuid()::text,
  caso_id      text not null references casos (id),
  instrumento  text not null,
  aplicado_por text not null references usuarios (id),
  em           date not null default current_date,
  observacao   text not null default '—'
);

create table contatos (
  id             text primary key default gen_random_uuid()::text,
  caso_id        text not null references casos (id),
  em             date not null default current_date,
  canal          text not null,
  resultado      text not null,
  motivo         text not null default '',
  registrado_por text not null references usuarios (id)
);

create table lembretes (
  id          text primary key default gen_random_uuid()::text,
  sessao_id   text not null references sessoes (id),
  canal       text not null check (canal in ('whatsapp', 'email')),
  em          timestamptz not null default now(),
  enviado_por text not null references usuarios (id)
);

create table solicitacoes (
  id           text primary key default gen_random_uuid()::text,
  paciente_id  text not null references pacientes (id),
  caso_id      text not null references casos (id),
  em           timestamptz not null default now(),
  status       text not null check (status in ('recebida', 'identidade-conferida', 'entregue')),
  forma        text not null default '',
  entregue_em  text not null default '',
  conferido_por text references usuarios (id),
  entregue_por  text references usuarios (id)
);

-- Link temporário: o banco guarda só o hash do token
create table links_acesso (
  id               text primary key default gen_random_uuid()::text,
  solicitacao_id   text not null references solicitacoes (id),
  caso_id          text not null references casos (id),
  token_hash       text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  criado_por       text not null references usuarios (id),
  criado_em        timestamptz not null default now(),
  expira_em        timestamptz not null,
  revogado_em      timestamptz,
  acessos          int not null default 0,
  falhas           int not null default 0,
  ultimo_acesso_em timestamptz
);

-- Pedidos do titular (LGPD, art. 18)
create table pedidos_titular (
  id             text primary key default gen_random_uuid()::text,
  titular_tipo   text not null check (titular_tipo in ('paciente', 'usuario')),
  titular_id     text not null,
  tipo           text not null check (tipo in ('confirmacao', 'acesso', 'correcao', 'compartilhamento', 'eliminacao', 'outro')),
  descricao      text not null,
  em             timestamptz not null default now(),
  status         text not null default 'aberto' check (status in ('aberto', 'respondido')),
  resposta       text not null default '',
  respondido_por text references usuarios (id),
  respondido_em  timestamptz
);

create table aceites (
  id         text primary key default gen_random_uuid()::text,
  usuario_id text not null references usuarios (id),
  termo      text not null check (termo in ('sigilo', 'uso')),
  versao     text not null,
  em         timestamptz not null default now(),
  unique (usuario_id, termo, versao)
);

-- Auditoria: a maior tabela (cerca de 90% das linhas na projeção), particionada por ano
create sequence auditoria_seq;
create table auditoria (
  seq           bigint not null,
  id            text not null default gen_random_uuid()::text,
  em            timestamptz not null default now(),
  usuario_id    text not null,               -- id do usuário ou 'visitante'
  acao          text not null check (length(acao) <= 200),
  alvo          text not null default '—',
  hash_anterior text not null default '',
  hash          text not null default '',
  primary key (id, em)
) partition by range (em);
create table auditoria_2025 partition of auditoria for values from ('2025-01-01') to ('2026-01-01');
create table auditoria_2026 partition of auditoria for values from ('2026-01-01') to ('2027-01-01');
create table auditoria_2027 partition of auditoria for values from ('2027-01-01') to ('2028-01-01');
create table auditoria_futuro partition of auditoria default;

-- Índices das buscas mais comuns
create index on alocacoes (subgrupo_id) where fim is null;
create index on casos (paciente_id);
create index on casos (grupo_id, subgrupo_id);
create index on inscricoes (status, data);
create index on inscricoes (cpf) where cpf <> '';
create index on anamneses (caso_id, versao desc);
create index on consentimentos (caso_id, finalidade, em desc);
create index on sessoes (caso_id, data);
create index on sessoes (data) where presenca = 'agendada';
create index on evolucoes (caso_id, status);
create index on assinaturas (alvo_tipo, alvo_id);
create index on adendos (evolucao_id);
create index on orientacoes (caso_id);
create index on auditoria (seq);
create index on auditoria (alvo);

-- ---------------------------------------------------------------------
-- Quem é o usuário da requisição (Supabase: auth.uid() vem do token)
-- ---------------------------------------------------------------------
create or replace function app.usuario_atual() returns text
language sql stable security definer set search_path = public as $$
  select id from usuarios where auth_id = auth.uid() and ativo
$$;

create or replace function app.perfil_atual() returns text
language sql stable security definer set search_path = public as $$
  select perfil from usuarios where auth_id = auth.uid() and ativo
$$;

create or replace function app.paciente_atual() returns text
language sql stable security definer set search_path = public as $$
  select paciente_id from usuarios where auth_id = auth.uid() and ativo
$$;

-- As mesmas regras de js/permissoes.js
create or replace function app.eh_estagiario_do_caso(p_caso text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from casos c join alocacoes a on a.subgrupo_id = c.subgrupo_id
    where c.id = p_caso and a.estagiario_id = app.usuario_atual() and (a.fim is null or a.fim > current_date))
$$;

create or replace function app.eh_supervisor_do_caso(p_caso text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from casos c join grupos g on g.id = c.grupo_id where c.id = p_caso and g.supervisor_id = app.usuario_atual())
$$;

create or replace function app.eh_paciente_do_caso(p_caso text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from casos c where c.id = p_caso and c.paciente_id = app.paciente_atual())
$$;

create or replace function app.pode_ver_caso(p_caso text) returns boolean
language sql stable security definer set search_path = public as $$
  select app.perfil_atual() = 'tecnico' or app.eh_estagiario_do_caso(p_caso) or app.eh_supervisor_do_caso(p_caso)
$$;

create or replace function app.caso_do_alvo(p_tipo text, p_id text) returns text
language sql stable security definer set search_path = public as $$
  select case p_tipo
    when 'evolucao' then (select caso_id from evolucoes where id = p_id)
    when 'documento' then (select caso_id from documentos where id = p_id)
    when 'anamnese' then (select caso_id from anamneses where id = p_id) end
$$;

-- ---------------------------------------------------------------------
-- Imutabilidade e regras de transição
-- ---------------------------------------------------------------------
create or replace function app.bloquear_alteracao() returns trigger
language plpgsql as $$
begin
  raise exception 'A tabela % é só de inserção: % não é permitido (registro permanente).', tg_table_name, tg_op;
end $$;

create trigger so_insercao before update or delete on assinaturas for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on adendos for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on anamneses for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on consentimentos for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on encerramentos for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on orientacoes for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on documentos for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on anexos for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on aceites for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on lembretes for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on auditoria for each row execute function app.bloquear_alteracao();
create trigger sem_exclusao before delete on casos for each row execute function app.bloquear_alteracao();
create trigger sem_exclusao before delete on pacientes for each row execute function app.bloquear_alteracao();
create trigger sem_exclusao before delete on sessoes for each row execute function app.bloquear_alteracao();

-- Evolução: rascunho/devolvida → enviada → validada (bloqueada) ou devolvida
create or replace function app.evolucao_regras() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Evolução não pode ser apagada.'; end if;
  if old.status = 'validada' then raise exception 'Evolução validada é imutável: registre um adendo.'; end if;
  if new.caso_id <> old.caso_id or new.autor_id <> old.autor_id then raise exception 'Caso e autor da evolução não mudam.'; end if;
  if not ((old.status in ('rascunho', 'devolvida') and new.status in (old.status, 'enviada'))
       or (old.status = 'enviada' and new.status in ('validada', 'devolvida'))) then
    raise exception 'Mudança de status inválida: % → %.', old.status, new.status;
  end if;
  if old.status = 'enviada' and new.texto <> old.texto then raise exception 'Texto enviado à supervisão não pode mudar.'; end if;
  return new;
end $$;
create trigger regras before update or delete on evolucoes for each row execute function app.evolucao_regras();

-- Sessão: presença registrada não muda; paciente só confirma presença
create or replace function app.sessao_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if app.perfil_atual() = 'paciente' and (new.presenca, new.data, new.hora, new.caso_id) is distinct from (old.presenca, old.data, old.hora, old.caso_id) then
    raise exception 'Paciente só pode confirmar presença.';
  end if;
  if old.presenca <> 'agendada' and new.presenca <> old.presenca then raise exception 'Presença já registrada não muda.'; end if;
  if new.presenca in ('presente', 'falta') and new.data > current_date then raise exception 'Presença e falta só a partir do dia da sessão.'; end if;
  return new;
end $$;
create trigger regras before update on sessoes for each row execute function app.sessao_regras();

-- ---------------------------------------------------------------------
-- Auditoria encadeada (mesma fórmula de js/estado.js)
-- conteúdo = JSON de [id, em (AAAA-MM-DDTHH:MM), usuarioId, acao, alvo, hashAnterior]
-- ---------------------------------------------------------------------
create or replace function app.conteudo_auditoria(p_id text, p_em timestamptz, p_usuario text, p_acao text, p_alvo text, p_anterior text) returns text
language sql stable as $$
  select '[' || to_json(p_id)::text || ',' || to_json(to_char(p_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI'))::text || ',' ||
         to_json(p_usuario)::text || ',' || to_json(p_acao)::text || ',' || to_json(p_alvo)::text || ',' || to_json(p_anterior)::text || ']'
$$;

create or replace function app.auditoria_encadear() returns trigger
language plpgsql security definer set search_path = public as $$
declare anterior text;
begin
  perform pg_advisory_xact_lock(4242);                      -- um evento por vez: a ordem da cadeia é garantida
  new.seq := nextval('auditoria_seq');
  new.em := date_trunc('minute', new.em);
  select a.hash into anterior from auditoria a order by a.seq desc limit 1;
  new.hash_anterior := coalesce(anterior, '0');
  new.hash := encode(sha256(convert_to(app.conteudo_auditoria(new.id, new.em, new.usuario_id, new.acao, new.alvo, new.hash_anterior), 'UTF8')), 'hex');
  return new;
end $$;
create trigger encadear before insert on auditoria for each row execute function app.auditoria_encadear();

-- Confere a cadeia inteira: devolve null se estiver íntegra, ou o seq do primeiro evento quebrado
create or replace function app.verificar_auditoria() returns bigint
language plpgsql stable security definer set search_path = public as $$
declare r record; anterior text := '0';
begin
  for r in select * from auditoria order by seq loop
    if r.hash_anterior <> anterior or r.hash <> encode(sha256(convert_to(app.conteudo_auditoria(r.id, r.em, r.usuario_id, r.acao, r.alvo, r.hash_anterior), 'UTF8')), 'hex') then
      return r.seq;
    end if;
    anterior := r.hash;
  end loop;
  return null;
end $$;

-- Inscrição pública: o banco calcula a duplicidade do CPF (quem preenche não fica sabendo)
create or replace function app.inscricao_ao_inserir() returns trigger
language plpgsql security definer set search_path = public as $$
declare p text; i text;
begin
  new.duplicidade := null;
  if new.cpf <> '' then
    select id into p from pacientes where cpf = new.cpf;
    if p is not null then new.duplicidade := jsonb_build_object('tipo', 'paciente', 'id', p);
    else
      select id into i from inscricoes where cpf = new.cpf and status = 'aguardando' and id <> new.id limit 1;
      if i is not null then new.duplicidade := jsonb_build_object('tipo', 'inscricao', 'id', i); end if;
    end if;
  end if;
  if coalesce(current_setting('app.migracao', true), '') <> 'on' then
    insert into auditoria (usuario_id, acao, alvo) values (coalesce(app.usuario_atual(), 'visitante'), 'Nova inscrição na fila de espera', new.id);
  end if;
  return new;
end $$;
create trigger ao_inserir before insert on inscricoes for each row execute function app.inscricao_ao_inserir();

-- ---------------------------------------------------------------------
-- Indicadores agregados (sem nomes) — a direção chama esta função e não lê tabelas clínicas
-- ---------------------------------------------------------------------
create or replace view app.faltas_seguidas as
with s as (
  select caso_id, presenca, row_number() over (partition by caso_id order by data desc, hora desc) as rn
  from sessoes where presenca in ('presente', 'falta', 'falta-justificada')
), corte as (
  select caso_id, min(rn) filter (where presenca = 'presente') as primeiro_presente from s group by caso_id
)
select s.caso_id, count(*) filter (where s.presenca = 'falta' and (c.primeiro_presente is null or s.rn < c.primeiro_presente)) as faltas
from s join corte c using (caso_id) group by s.caso_id;

create or replace function app.indicadores(p_limite_faltas int default 2) returns jsonb
language plpgsql stable security definer set search_path = public, app as $$
declare perfil text := app.perfil_atual(); escopo text[]; resultado jsonb;
begin
  if perfil in ('direcao', 'tecnico') or perfil is null then select array_agg(id) into escopo from casos;   -- null = administrador (SQL Editor)
  elsif perfil = 'supervisor' then
    select array_agg(c.id) into escopo from casos c join grupos g on g.id = c.grupo_id where g.supervisor_id = app.usuario_atual();
  else raise exception 'Perfil sem acesso aos indicadores.';
  end if;
  with pres as (
    select caso_id, count(*) as n from sessoes where presenca = 'presente' and caso_id = any (escopo) group by caso_id
  )
  select jsonb_build_object(
    'atendidos', (select count(*) from pres),
    'taxaRetorno', coalesce((select round(100.0 * count(*) filter (where n >= 2) / nullif(count(*), 0)) from pres), 0),
    'mediaSessoes', coalesce((select round(avg(n), 1) from pres), 0),
    'emRisco', (select count(*) from casos c join app.faltas_seguidas f on f.caso_id = c.id where c.status = 'ativo' and f.faltas >= p_limite_faltas and c.id = any (escopo)),
    'motivosAbandono', coalesce((select jsonb_object_agg(motivo, n) from (select motivo, count(*) n from encerramentos where tipo = 'abandono' and caso_id = any (escopo) group by motivo) m), '{}'::jsonb),
    'encerramentos', coalesce((select jsonb_object_agg(tipo, n) from (select tipo, count(*) n from encerramentos where caso_id = any (escopo) group by tipo) t), '{}'::jsonb),
    'presencas', jsonb_build_object(
      'presente', (select count(*) from sessoes where presenca = 'presente' and caso_id = any (escopo)),
      'falta', (select count(*) from sessoes where presenca = 'falta' and caso_id = any (escopo)),
      'faltaJustificada', (select count(*) from sessoes where presenca = 'falta-justificada' and caso_id = any (escopo)))
  ) into resultado;
  return resultado;
end $$;

-- Retenção: inscrição que não virou atendimento é eliminada 12 meses depois (agendar com pg_cron)
create or replace function app.eliminar_inscricoes_antigas() returns int
language sql security definer set search_path = public as $$
  with apagadas as (
    delete from inscricoes where status in ('encaminhado-externo', 'duplicada', 'cancelada') and data < current_date - interval '12 months' returning 1)
  select count(*)::int from apagadas
$$;

-- ---------------------------------------------------------------------
-- Políticas de acesso (RLS). Sem política = sem acesso.
-- ---------------------------------------------------------------------
alter table pacientes enable row level security;
alter table usuarios enable row level security;
alter table grupos enable row level security;
alter table subgrupos enable row level security;
alter table alocacoes enable row level security;
alter table casos enable row level security;
alter table inscricoes enable row level security;
alter table anamneses enable row level security;
alter table consentimentos enable row level security;
alter table encerramentos enable row level security;
alter table sessoes enable row level security;
alter table evolucoes enable row level security;
alter table assinaturas enable row level security;
alter table adendos enable row level security;
alter table orientacoes enable row level security;
alter table documentos enable row level security;
alter table anexos enable row level security;
alter table avaliacoes enable row level security;
alter table contatos enable row level security;
alter table lembretes enable row level security;
alter table solicitacoes enable row level security;
alter table links_acesso enable row level security;
alter table pedidos_titular enable row level security;
alter table aceites enable row level security;
alter table auditoria enable row level security;

-- Equipe vê a equipe; paciente vê só a própria conta
create policy ver on usuarios for select to authenticated using (app.perfil_atual() <> 'paciente' or id = app.usuario_atual());
create policy direcao_cria_estudante on usuarios for insert to authenticated with check (app.perfil_atual() = 'direcao' and perfil = 'estagiario');
create policy atualizar_propria on usuarios for update to authenticated using (id = app.usuario_atual()) with check (id = app.usuario_atual());

create policy ver on grupos for select to authenticated using (app.perfil_atual() <> 'paciente');
create policy ver on subgrupos for select to authenticated using (app.perfil_atual() <> 'paciente');
create policy supervisor_cria on subgrupos for insert to authenticated
  with check (exists (select 1 from grupos g where g.id = grupo_id and g.supervisor_id = app.usuario_atual()));
create policy ver on alocacoes for select to authenticated using (app.perfil_atual() <> 'paciente');
create policy direcao_aloca on alocacoes for insert to authenticated with check (app.perfil_atual() = 'direcao');
create policy direcao_ou_supervisor on alocacoes for update to authenticated
  using (app.perfil_atual() = 'direcao' or exists (select 1 from grupos g where g.id = grupo_id and g.supervisor_id = app.usuario_atual()));

create policy ver on pacientes for select to authenticated using (
  app.perfil_atual() = 'tecnico' or id = app.paciente_atual()
  or exists (select 1 from casos c where c.paciente_id = pacientes.id and (app.eh_estagiario_do_caso(c.id) or app.eh_supervisor_do_caso(c.id))));
create policy tecnico_grava on pacientes for insert to authenticated with check (app.perfil_atual() = 'tecnico');
create policy tecnico_edita on pacientes for update to authenticated using (app.perfil_atual() = 'tecnico');

create policy ver on casos for select to authenticated using (app.pode_ver_caso(id) or app.eh_paciente_do_caso(id));
create policy tecnico_cria on casos for insert to authenticated with check (app.perfil_atual() = 'tecnico');
create policy equipe_atualiza on casos for update to authenticated using (app.pode_ver_caso(id));

-- Fila: qualquer pessoa (anon) se inscreve; só o técnico lê
create policy inscrever on inscricoes for insert to anon, authenticated with check (status = 'aguardando' and caso_id is null);
create policy tecnico_le on inscricoes for select to authenticated using (app.perfil_atual() = 'tecnico');
create policy tecnico_atualiza on inscricoes for update to authenticated using (app.perfil_atual() = 'tecnico');

create policy ver on anamneses for select to authenticated using (app.pode_ver_caso(caso_id));
create policy registrar on anamneses for insert to authenticated with check (autor_id = app.usuario_atual() and app.pode_ver_caso(caso_id));

create policy ver on consentimentos for select to authenticated using (app.pode_ver_caso(caso_id) or app.eh_paciente_do_caso(caso_id));
create policy registrar on consentimentos for insert to authenticated with check (registrado_por = app.usuario_atual()
  and (app.perfil_atual() = 'tecnico' or (app.eh_paciente_do_caso(caso_id) and finalidade <> 'contrato')));

create policy ver on encerramentos for select to authenticated using (app.pode_ver_caso(caso_id) or app.eh_paciente_do_caso(caso_id));
create policy registrar on encerramentos for insert to authenticated with check (registrado_por = app.usuario_atual()
  and (app.eh_estagiario_do_caso(caso_id) or app.eh_supervisor_do_caso(caso_id)));

create policy ver on sessoes for select to authenticated using (app.pode_ver_caso(caso_id) or app.eh_paciente_do_caso(caso_id));
create policy agendar on sessoes for insert to authenticated with check (app.pode_ver_caso(caso_id));
create policy atualizar on sessoes for update to authenticated using (app.pode_ver_caso(caso_id) or app.eh_paciente_do_caso(caso_id));

-- Rascunho só o autor vê; paciente não lê a tabela (recebe a cópia pelo fluxo de acesso)
create policy ver on evolucoes for select to authenticated using (app.pode_ver_caso(caso_id) and (status <> 'rascunho' or autor_id = app.usuario_atual()));
create policy escrever on evolucoes for insert to authenticated with check (autor_id = app.usuario_atual() and app.eh_estagiario_do_caso(caso_id));
create policy atualizar on evolucoes for update to authenticated using (
  (autor_id = app.usuario_atual() and status in ('rascunho', 'devolvida')) or (app.eh_supervisor_do_caso(caso_id) and status = 'enviada'))
  with check (app.pode_ver_caso(caso_id));   -- a transição permitida é conferida pelo trigger app.evolucao_regras

create policy ver on assinaturas for select to authenticated using (app.pode_ver_caso(app.caso_do_alvo(alvo_tipo, alvo_id)));
create policy assinar on assinaturas for insert to authenticated with check (usuario_id = app.usuario_atual() and (
  (papel = 'supervisor' and app.eh_supervisor_do_caso(app.caso_do_alvo(alvo_tipo, alvo_id)))
  or (papel = 'estagiario' and app.eh_estagiario_do_caso(app.caso_do_alvo(alvo_tipo, alvo_id)))));

create policy ver on adendos for select to authenticated using (app.pode_ver_caso((select caso_id from evolucoes e where e.id = evolucao_id)));
create policy registrar on adendos for insert to authenticated with check (autor_id = app.usuario_atual()
  and exists (select 1 from evolucoes e where e.id = evolucao_id and e.status = 'validada'
              and (app.eh_estagiario_do_caso(e.caso_id) or app.eh_supervisor_do_caso(e.caso_id))));

-- Supervisão: só supervisor e estagiários do caso (o técnico NÃO vê)
create policy ver on orientacoes for select to authenticated using (app.eh_supervisor_do_caso(caso_id) or app.eh_estagiario_do_caso(caso_id));
create policy registrar on orientacoes for insert to authenticated with check (supervisor_id = app.usuario_atual() and app.eh_supervisor_do_caso(caso_id));

create policy ver on documentos for select to authenticated using (app.pode_ver_caso(caso_id));
create policy emitir on documentos for insert to authenticated with check (autor_id = app.usuario_atual() and app.eh_estagiario_do_caso(caso_id));
create policy ver on anexos for select to authenticated using (app.pode_ver_caso(caso_id));
create policy anexar on anexos for insert to authenticated with check (enviado_por = app.usuario_atual() and app.pode_ver_caso(caso_id));

create policy ver on avaliacoes for select to authenticated using (app.pode_ver_caso(caso_id));
create policy registrar on avaliacoes for insert to authenticated with check (aplicado_por = app.usuario_atual()
  and (app.eh_estagiario_do_caso(caso_id) or app.eh_supervisor_do_caso(caso_id)));

create policy ver on contatos for select to authenticated using (app.pode_ver_caso(caso_id));
create policy registrar on contatos for insert to authenticated with check (registrado_por = app.usuario_atual() and app.pode_ver_caso(caso_id));
create policy ver on lembretes for select to authenticated using (app.pode_ver_caso((select caso_id from sessoes s where s.id = sessao_id)));
create policy registrar on lembretes for insert to authenticated with check (enviado_por = app.usuario_atual()
  and app.pode_ver_caso((select caso_id from sessoes s where s.id = sessao_id)));

create policy ver on solicitacoes for select to authenticated using (app.perfil_atual() = 'tecnico' or paciente_id = app.paciente_atual());
create policy pedir on solicitacoes for insert to authenticated with check (paciente_id = app.paciente_atual() and status = 'recebida');
create policy tecnico_atende on solicitacoes for update to authenticated using (app.perfil_atual() = 'tecnico');

-- Links: só o técnico. A leitura pelo paciente passa por uma Edge Function, que confere token e nascimento no servidor.
create policy tecnico on links_acesso for all to authenticated using (app.perfil_atual() = 'tecnico') with check (app.perfil_atual() = 'tecnico');

create policy ver on pedidos_titular for select to authenticated using (app.perfil_atual() = 'tecnico'
  or (titular_tipo = 'paciente' and titular_id = app.paciente_atual()) or (titular_tipo = 'usuario' and titular_id = app.usuario_atual()));
create policy pedir on pedidos_titular for insert to authenticated with check (status = 'aberto'
  and ((titular_tipo = 'paciente' and titular_id = app.paciente_atual()) or (titular_tipo = 'usuario' and titular_id = app.usuario_atual())));
create policy tecnico_responde on pedidos_titular for update to authenticated using (app.perfil_atual() = 'tecnico');

create policy ver on aceites for select to authenticated using (usuario_id = app.usuario_atual() or app.perfil_atual() = 'tecnico');
create policy aceitar on aceites for insert to authenticated with check (usuario_id = app.usuario_atual());

create policy registrar on auditoria for insert to authenticated with check (usuario_id = app.usuario_atual() or usuario_id = 'visitante');
create policy tecnico_le on auditoria for select to authenticated using (app.perfil_atual() = 'tecnico');

-- ---------------------------------------------------------------------
-- Permissões dos papéis da API (anon = visitante; authenticated = logado)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant insert on inscricoes to anon;
grant select, insert, update on all tables in schema public to authenticated;
revoke update on assinaturas, adendos, anamneses, consentimentos, encerramentos, orientacoes, documentos, anexos, aceites, lembretes, auditoria from authenticated;
grant usage on schema app to anon, authenticated;
grant execute on all functions in schema app to anon, authenticated;
grant select on app.faltas_seguidas to authenticated;
grant usage on sequence auditoria_seq to anon, authenticated;

-- ---------------------------------------------------------------------
-- Supabase Auth: quando a conta é criada (convite por e-mail), liga ao usuário de mesmo e-mail
-- ---------------------------------------------------------------------
create or replace function app.ligar_conta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update usuarios set auth_id = new.id where lower(email) = lower(new.email) and auth_id is null;
  return new;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    execute 'drop trigger if exists vinculo_ligar_conta on auth.users';
    execute 'create trigger vinculo_ligar_conta after insert on auth.users for each row execute function app.ligar_conta()';
  end if;
end $$;

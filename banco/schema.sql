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
--   5. Regras de transição: ninguém muda o próprio perfil, não há evolução
--      que nasça validada, caso encerrado não reabre, vínculo encerrado não
--      volta e a data e a hora dos registros vêm do relógio do servidor.
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
  sinal_urgencia   boolean not null default false,   -- o relato tem sinal de urgência: a técnica contata primeiro
  periodo          text not null check (periodo in ('Manhã', 'Tarde', 'Noite')),
  data             date not null default current_date,
  status           text not null default 'aguardando' check (status in ('aguardando', 'triada', 'encaminhado-externo', 'duplicada', 'cancelada')),
  aviso_versao     text not null,
  duplicidade      jsonb,                    -- calculada pelo banco (trigger), nunca pelo formulário
  caso_id          text references casos (id),
  encaminhado_para text not null default '', -- serviço da rede, quando a triagem encaminha para fora
  risco_triagem    text not null default '' check (risco_triagem in ('', 'baixo', 'moderado', 'alto')),
  check (sem_cpf or cpf <> ''),
  check (status <> 'encaminhado-externo' or length(encaminhado_para) >= 3)
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
  unique (caso_id, versao),
  -- até 2.000 caracteres por campo (regras.anamneseCampoMaxCaracteres): registro conciso, o paciente pode ler
  check (greatest(length(demanda), length(objetivos), length(queixa), length(sintomas), length(historico_familiar),
                  length(medicacoes), length(historico_clinico)) <= 2000)
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
  destino        text not null default '',  -- serviço da rede que recebe o encaminhamento (CAPS, UBS, CRAS...)
  registro       text not null,
  registrado_por text not null references usuarios (id),
  check (tipo <> 'encaminhamento' or length(destino) >= 3)
);

create table sessoes (
  id                      text primary key default gen_random_uuid()::text,
  caso_id                 text not null references casos (id),
  data                    date not null,
  hora                    time not null check (hora between '07:00' and '21:00'),
  presenca                text not null default 'agendada' check (presenca in ('agendada', 'presente', 'falta', 'falta-justificada', 'cancelada')),
  confirmada              boolean not null default false,
  -- "Não vou poder ir": o paciente avisa pelo portal, com motivo de uma lista fechada (sem texto livre:
  -- o sistema não é canal de crise). Vira falta justificada, que não conta para o abandono.
  aviso_paciente          boolean not null default false,
  motivo_falta            text not null default '' check (motivo_falta in ('', 'saude', 'trabalho-estudo', 'transporte', 'familia', 'financeiro', 'nao-dizer')),
  avisado_em              timestamptz,
  presenca_registrada_por text references usuarios (id),
  check (not aviso_paciente or (presenca = 'falta-justificada' and motivo_falta <> ''))
);

create table evolucoes (
  id                    text primary key default gen_random_uuid()::text,
  caso_id               text not null references casos (id),
  sessao_id             text references sessoes (id),
  autor_id              text not null references usuarios (id),
  data                  date not null default current_date,
  status                text not null check (status in ('rascunho', 'enviada', 'devolvida', 'validada')),
  texto                 text not null check (length(texto) between 10 and 5000),  -- prontuário conciso (o paciente pode ler)
  comentario_supervisor text not null default '',
  check (status <> 'devolvida' or length(comentario_supervisor) >= 5)
);

-- Assinatura eletrônica simples (login). hash = SHA-256 do conteúdo assinado.
create table assinaturas (
  id         text primary key default gen_random_uuid()::text,
  alvo_tipo  text not null check (alvo_tipo in ('evolucao', 'documento', 'anamnese', 'plano')),
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

-- Avaliação de risco (evento de risco): faz parte do prontuário. Tipo, nível, descrição e condutas não
-- mudam depois de registrados; a supervisão dá ciência uma vez e o acompanhamento é encerrado uma vez.
create table riscos (
  id                text primary key default gen_random_uuid()::text,
  caso_id           text not null references casos (id),
  registrado_por    text not null references usuarios (id),
  em                timestamptz not null default now(),
  tipo              text not null check (tipo in ('ideacao-suicida', 'tentativa-suicidio', 'autolesao', 'violencia-sofrida', 'risco-terceiros',
                                                  'uso-substancias', 'crise-aguda', 'vulnerabilidade-social')),
  nivel             text not null check (nivel in ('baixo', 'moderado', 'alto')),
  descricao         text not null check (length(descricao) between 10 and 1000),
  condutas          jsonb not null default '[]'::jsonb check (jsonb_typeof(condutas) = 'array'),
  ciencia_em        timestamptz,
  ciencia_por       text references usuarios (id),
  encerrado_em      timestamptz,
  encerrado_por     text references usuarios (id),
  encerramento_nota text not null default ''
);

-- Notificação compulsória: feita e registrada pelo supervisor (Res. CFP 05/2025, art. 7º, III). Só inserção.
create table notificacoes (
  id             text primary key default gen_random_uuid()::text,
  risco_id       text not null references riscos (id),
  caso_id        text not null references casos (id),
  orgao          text not null check (orgao in ('vigilancia', 'conselho-tutelar', 'policia-mulher', 'pessoa-idosa', 'pessoa-deficiencia')),
  em             timestamptz not null default now(),
  registrado_por text not null references usuarios (id),
  protocolo      text not null default '',
  observacao     text not null default ''
);

-- Plano de segurança (Safety Planning Intervention, Stanley e Brown): feito com o paciente, que pode
-- consultá-lo no portal. Cada mudança é uma nova versão; as anteriores ficam guardadas.
create table planos_seguranca (
  id                    text primary key default gen_random_uuid()::text,
  caso_id               text not null references casos (id),
  versao                int not null check (versao >= 1),
  autor_id              text not null references usuarios (id),
  em                    timestamptz not null default now(),
  sinais_alerta         text not null default '',
  estrategias_proprias  text not null default '',
  pessoas_lugares       text not null default '',
  pessoas_ajuda         text not null default '',
  servicos              text not null default '',
  ambiente_seguro       text not null default '',
  razoes_viver          text not null default '',
  revisado_com_paciente boolean not null check (revisado_com_paciente),   -- o plano é construído junto com o paciente
  unique (caso_id, versao),
  check (greatest(length(sinais_alerta), length(estrategias_proprias), length(pessoas_lugares), length(pessoas_ajuda),
                  length(servicos), length(ambiente_seguro), length(razoes_viver)) <= 1000)
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

-- Motivo de acesso da psicóloga técnica: o conteúdo clínico de um caso que não é da equipe dela só
-- abre depois de registrar por quê (vale 12 horas). O paciente vê esse registro em "Meus dados".
create table acessos_justificados (
  id         text primary key default gen_random_uuid()::text,
  usuario_id text not null references usuarios (id),
  caso_id    text not null references casos (id),
  motivo     text not null check (motivo in ('pedido-paciente', 'triagem-alocacao', 'risco-urgencia', 'responsabilidade-tecnica',
                                             'substituicao-supervisao', 'auditoria', 'outro')),
  detalhe    text not null default '' check (length(detalhe) <= 200),
  em         timestamptz not null default now(),
  check (motivo <> 'outro' or length(detalhe) >= 5)
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
create index on riscos (caso_id) where encerrado_em is null;
create index on notificacoes (risco_id);
create index on planos_seguranca (caso_id, versao desc);
create index on auditoria (seq);
create index on auditoria (alvo);

-- ---------------------------------------------------------------------
-- Verificação em duas etapas (MFA do Supabase Auth, código TOTP do aplicativo autenticador)
-- O token diz como a pessoa entrou: aal1 = só a senha; aal2 = senha + código do aplicativo.
-- ---------------------------------------------------------------------
create or replace function app.aal() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1')
$$;

-- Obrigatória para a equipe? No protótipo, não (regras.mfaObrigatoria = false no JSON). Em produção,
-- troque para "select true" e ligue regras.mfaObrigatoria: quem é da equipe e não configurou o
-- segundo fator não vê nada até configurar. O paciente nunca é obrigado (o portal precisa ser simples).
create or replace function app.mfa_obrigatoria() returns boolean
language sql stable as $$ select false $$;

-- A conta está liberada se entrou com o código (aal2), ou se não ligou o segundo fator e ele não é
-- obrigatório para o perfil. Quem ligou e entrou só com a senha fica sem acesso: senha vazada sozinha
-- não abre o prontuário. Fator "unverified" (configuração começada e não confirmada) não conta.
create or replace function app.mfa_ok(p_auth uuid, p_perfil text) returns boolean
language sql stable security definer set search_path = public as $$
  select app.aal() = 'aal2'
      or (not exists (select 1 from auth.mfa_factors f where f.user_id = p_auth and f.status = 'verified')
          and (p_perfil = 'paciente' or not app.mfa_obrigatoria()))
$$;

-- ---------------------------------------------------------------------
-- Quem é o usuário da requisição (Supabase: auth.uid() vem do token)
-- Conta desativada, ou sem o código quando ele é exigido, não é ninguém: todas as políticas negam.
-- ---------------------------------------------------------------------
create or replace function app.usuario_atual() returns text
language sql stable security definer set search_path = public as $$
  select id from usuarios where auth_id = auth.uid() and ativo and app.mfa_ok(auth_id, perfil)
$$;

create or replace function app.perfil_atual() returns text
language sql stable security definer set search_path = public as $$
  select perfil from usuarios where auth_id = auth.uid() and ativo and app.mfa_ok(auth_id, perfil)
$$;

create or replace function app.paciente_atual() returns text
language sql stable security definer set search_path = public as $$
  select paciente_id from usuarios where auth_id = auth.uid() and ativo and app.mfa_ok(auth_id, perfil)
$$;

-- Quem chama pela API (site) entra com o papel anon ou authenticated. Fora disso é o administrador
-- (SQL Editor do Supabase, service_role ou a migração). Vale também dentro de funções security definer.
create or replace function app.eh_admin() returns boolean
language sql stable as $$
  select coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated')
$$;

-- Durante a carga de banco/dados-demo.sql (set app.migracao = 'on') os registros antigos entram como estão
create or replace function app.em_migracao() returns boolean
language sql stable as $$
  select app.eh_admin() and coalesce(current_setting('app.migracao', true), '') = 'on'
$$;

-- Consentimento vigente = o registro mais recente daquela finalidade (revogar é um novo registro)
create or replace function app.consentiu(p_caso text, p_finalidade text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select concedido from consentimentos where caso_id = p_caso and finalidade = p_finalidade
                   order by em desc limit 1), false)
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

-- Conteúdo clínico (anamnese, evoluções, risco, documentos, anexos...): a equipe do caso; a técnica,
-- só com motivo registrado nas últimas 12 horas (ou no caso recém-triado, que ainda espera alocação).
-- Cadastro, agenda e fila (camada operacional) continuam com app.pode_ver_caso.
create or replace function app.pode_ver_clinico(p_caso text) returns boolean
language sql stable security definer set search_path = public as $$
  select app.eh_estagiario_do_caso(p_caso) or app.eh_supervisor_do_caso(p_caso)
    or (app.perfil_atual() = 'tecnico' and (
          exists (select 1 from casos c where c.id = p_caso and c.status = 'aguardando-alocacao')
          or exists (select 1 from acessos_justificados j where j.caso_id = p_caso and j.usuario_id = app.usuario_atual()
                     and j.em > now() - interval '12 hours')))
$$;

create or replace function app.caso_do_alvo(p_tipo text, p_id text) returns text
language sql stable security definer set search_path = public as $$
  select case p_tipo
    when 'evolucao' then (select caso_id from evolucoes where id = p_id)
    when 'documento' then (select caso_id from documentos where id = p_id)
    when 'anamnese' then (select caso_id from anamneses where id = p_id)
    when 'plano' then (select caso_id from planos_seguranca where id = p_id) end
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
create trigger so_insercao before update or delete on notificacoes for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on acessos_justificados for each row execute function app.bloquear_alteracao();
create trigger so_insercao before update or delete on planos_seguranca for each row execute function app.bloquear_alteracao();
create trigger sem_exclusao before delete on riscos for each row execute function app.bloquear_alteracao();
create trigger sem_exclusao before delete on casos for each row execute function app.bloquear_alteracao();
create trigger sem_exclusao before delete on pacientes for each row execute function app.bloquear_alteracao();
create trigger sem_exclusao before delete on sessoes for each row execute function app.bloquear_alteracao();

-- Evolução: nasce rascunho ou enviada; rascunho/devolvida → enviada → validada (bloqueada) ou devolvida.
-- Validar é papel do supervisor: nenhuma evolução nasce validada.
create or replace function app.evolucao_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Evolução não pode ser apagada.'; end if;
  if tg_op = 'INSERT' then
    if app.em_migracao() then return new; end if;
    if new.status not in ('rascunho', 'enviada') then raise exception 'Evolução nova entra como rascunho ou enviada: quem valida é o supervisor.'; end if;
    if not exists (select 1 from casos c where c.id = new.caso_id and c.status = 'ativo') then raise exception 'Só caso ativo recebe evolução.'; end if;
    if new.sessao_id is not null and not exists (select 1 from sessoes s where s.id = new.sessao_id and s.caso_id = new.caso_id and s.presenca = 'presente') then
      raise exception 'A sessão da evolução precisa ser do mesmo caso e ter presença registrada.';
    end if;
    return new;
  end if;
  if old.status = 'validada' then raise exception 'Evolução validada é imutável: registre um adendo.'; end if;
  if (new.caso_id, new.autor_id, new.data) is distinct from (old.caso_id, old.autor_id, old.data)
     or new.sessao_id is distinct from old.sessao_id then
    raise exception 'Caso, autor, data e sessão da evolução não mudam.';
  end if;
  if not ((old.status in ('rascunho', 'devolvida') and new.status in (old.status, 'enviada'))
       or (old.status = 'enviada' and new.status in ('validada', 'devolvida'))) then
    raise exception 'Mudança de status inválida: % → %.', old.status, new.status;
  end if;
  if new.status = 'enviada' and old.status <> 'enviada' and not exists (select 1 from casos c where c.id = new.caso_id and c.status = 'ativo') then
    raise exception 'Caso encerrado não recebe evolução nova.';
  end if;
  if old.status = 'enviada' and new.texto <> old.texto then raise exception 'Texto enviado à supervisão não pode mudar.'; end if;
  return new;
end $$;
create trigger regras before insert or update or delete on evolucoes for each row execute function app.evolucao_regras();

-- Sessão: nasce agendada, de hoje em diante, num caso ativo. Presença registrada não muda;
-- o paciente só confirma presença. Quem registrou a presença é gravado pelo banco.
create or replace function app.sessao_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if app.em_migracao() then return new; end if;
    if new.presenca <> 'agendada' or new.confirmada then raise exception 'Sessão nova entra como agendada: a presença é registrada a partir do dia da sessão.'; end if;
    if new.data < current_date then raise exception 'Agendamento só de hoje em diante.'; end if;
    if not exists (select 1 from casos c where c.id = new.caso_id and c.status = 'ativo') then raise exception 'Só caso ativo recebe agendamento.'; end if;
    new.presenca_registrada_por := null;
    return new;
  end if;
  if new.caso_id <> old.caso_id then raise exception 'A sessão não muda de caso.'; end if;
  if app.perfil_atual() = 'paciente' and (new.presenca, new.data, new.hora, new.aviso_paciente, new.motivo_falta)
     is distinct from (old.presenca, old.data, old.hora, old.aviso_paciente, old.motivo_falta) then
    -- o paciente só confirma presença ou avisa, antes da sessão, que não vai (com motivo da lista)
    if not (old.presenca = 'agendada' and new.presenca = 'falta-justificada' and new.aviso_paciente and new.motivo_falta <> ''
            and old.data >= current_date and (new.data, new.hora) = (old.data, old.hora)) then
      raise exception 'Paciente só pode confirmar presença ou avisar, antes da sessão, que não vai.';
    end if;
    new.avisado_em := now();
  end if;
  if new.aviso_paciente and not old.aviso_paciente and app.perfil_atual() <> 'paciente' then
    raise exception 'O aviso de falta é do próprio paciente.';
  end if;
  if old.presenca <> 'agendada' and (new.presenca, new.data, new.hora) is distinct from (old.presenca, old.data, old.hora) then
    raise exception 'Presença já registrada não muda.';
  end if;
  if new.presenca in ('presente', 'falta') and new.data > current_date then raise exception 'Presença e falta só a partir do dia da sessão.'; end if;
  if new.presenca is distinct from old.presenca then new.presenca_registrada_por := app.usuario_atual(); end if;
  return new;
end $$;
create trigger regras before insert or update on sessoes for each row execute function app.sessao_regras();

-- Caso: paciente e início não mudam; encerrado não reabre (quem volta ganha um caso novo na triagem).
-- Técnico aloca ao grupo (com contrato terapêutico); supervisor define a dupla/trio do próprio grupo;
-- encerrar exige o registro de encerramento.
create or replace function app.caso_regras() returns trigger
language plpgsql security definer set search_path = public as $$
declare perfil text := coalesce(app.perfil_atual(), '');   -- '' = sem perfil (nunca NULL, que confundiria os IFs)
begin
  if (new.paciente_id, new.inicio) is distinct from (old.paciente_id, old.inicio) then raise exception 'Paciente e início do caso não mudam.'; end if;
  if old.status = 'encerrado' then raise exception 'Caso encerrado não é reaberto: o paciente que volta ganha um caso novo na triagem.'; end if;
  if new.status = 'aguardando-alocacao' and old.status <> 'aguardando-alocacao' then raise exception 'Caso em andamento não volta para a alocação.'; end if;
  if new.status = 'encerrado' and not exists (select 1 from encerramentos e where e.caso_id = new.id) then
    raise exception 'Para encerrar, registre antes o encerramento (tipo, motivo e registro).';
  end if;
  if new.grupo_id is distinct from old.grupo_id and not (perfil = 'tecnico' or (perfil = '' and app.eh_admin())) then
    raise exception 'Só o técnico aloca o caso a um grupo.';
  end if;
  if old.status = 'aguardando-alocacao' and new.status = 'ativo' and not app.consentiu(new.id, 'contrato') then
    raise exception 'Para alocar, o contrato terapêutico precisa estar registrado.';
  end if;
  if new.subgrupo_id is distinct from old.subgrupo_id and new.subgrupo_id is not null then
    if perfil = 'estagiario' then raise exception 'A dupla ou trio do caso é definida pelo supervisor.'; end if;
    if not exists (select 1 from subgrupos s where s.id = new.subgrupo_id and s.grupo_id = new.grupo_id) then
      raise exception 'A dupla ou trio precisa ser do grupo do caso.';
    end if;
  end if;
  return new;
end $$;
create trigger regras before update on casos for each row execute function app.caso_regras();

-- Vínculo de estágio: estagiário, grupo e início não mudam; o fim é gravado uma vez (encerrar) e não volta.
-- A direção encerra; o supervisor só muda a dupla/trio, dentro do grupo, enquanto o vínculo vale.
create or replace function app.alocacao_regras() returns trigger
language plpgsql security definer set search_path = public as $$
declare perfil text := coalesce(app.perfil_atual(), '');
begin
  if (new.estagiario_id, new.grupo_id, new.inicio) is distinct from (old.estagiario_id, old.grupo_id, old.inicio) then
    raise exception 'Estagiário, grupo e início do vínculo não mudam: crie um vínculo novo.';
  end if;
  if old.fim is not null and new.fim is distinct from old.fim then
    raise exception 'Vínculo encerrado não é reaberto nem alterado: crie um vínculo novo.';
  end if;
  if new.fim is distinct from old.fim and perfil = 'supervisor' then raise exception 'Só a direção encerra o vínculo de estágio.'; end if;
  if new.subgrupo_id is distinct from old.subgrupo_id then
    if perfil = 'direcao' then raise exception 'A dupla ou trio é definida pelo supervisor.'; end if;
    if old.fim is not null and old.fim <= current_date then raise exception 'Vínculo encerrado não muda de dupla.'; end if;
    if new.subgrupo_id is not null and not exists (select 1 from subgrupos s where s.id = new.subgrupo_id and s.grupo_id = new.grupo_id) then
      raise exception 'A dupla ou trio precisa ser do mesmo grupo.';
    end if;
  end if;
  return new;
end $$;
create trigger regras before update on alocacoes for each row execute function app.alocacao_regras();

-- Encerramento: só de caso ativo e sem evolução esperando a supervisão; abandono só depois de
-- tentativa de contato (é o que mostra por que o paciente saiu); alta e encaminhamento com registro.
create or replace function app.encerramento_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if app.em_migracao() then return new; end if;
  if not exists (select 1 from casos c where c.id = new.caso_id and c.status = 'ativo') then raise exception 'Só caso ativo é encerrado.'; end if;
  if exists (select 1 from evolucoes e where e.caso_id = new.caso_id and e.status in ('enviada', 'devolvida')) then
    raise exception 'Há evolução aguardando a supervisão ou devolvida: conclua antes de encerrar.';
  end if;
  if new.tipo = 'abandono' and not exists (select 1 from contatos ct where ct.caso_id = new.caso_id) then
    raise exception 'Abandono só depois de registrar a tentativa de contato.';
  end if;
  if new.tipo <> 'abandono' and length(new.registro) < 10 then raise exception 'Escreva o registro do encerramento.'; end if;
  return new;
end $$;
create trigger regras before insert on encerramentos for each row execute function app.encerramento_regras();

-- Assinatura de evolução: o hash precisa ser o do texto que está no banco; o estagiário assina a
-- própria evolução ao enviar e o supervisor assina ao validar (a assinatura não vale para outro texto).
create or replace function app.assinatura_regras() returns trigger
language plpgsql security definer set search_path = public as $$
declare ev record;
begin
  if app.em_migracao() or new.alvo_tipo <> 'evolucao' then return new; end if;
  select status, texto, autor_id into ev from evolucoes where id = new.alvo_id;
  if not found then raise exception 'Evolução não encontrada.'; end if;
  if new.hash is distinct from encode(sha256(convert_to(ev.texto, 'UTF8')), 'hex') then
    raise exception 'O hash da assinatura não confere com o texto da evolução.';
  end if;
  if new.papel = 'estagiario' and (ev.status <> 'enviada' or ev.autor_id <> new.usuario_id) then
    raise exception 'O estagiário assina a própria evolução ao enviá-la à supervisão.';
  end if;
  if new.papel = 'supervisor' and ev.status <> 'validada' then raise exception 'O supervisor assina ao validar a evolução.'; end if;
  return new;
end $$;
create trigger regras before insert on assinaturas for each row execute function app.assinatura_regras();

-- Avaliação de risco: nasce num caso ativo, com condutas da lista; o que foi avaliado não muda.
-- Depois, só duas coisas acontecem, uma vez cada: o supervisor do caso dá ciência e alguém da equipe
-- encerra o acompanhamento (com o motivo). Quem e quando, quem grava é o banco.
create or replace function app.risco_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if app.em_migracao() then return new; end if;
    -- caso ativo, ou recém-triado esperando alocação (o risco visto na triagem não espera o grupo)
    if not exists (select 1 from casos c where c.id = new.caso_id and (c.status = 'ativo' or (c.status = 'aguardando-alocacao' and app.perfil_atual() = 'tecnico'))) then
      raise exception 'Só caso ativo recebe avaliação de risco.';
    end if;
    if exists (select 1 from jsonb_array_elements_text(new.condutas) x where x not in ('plano-seguranca', 'supervisao-imediata', 'rede-apoio',
               'responsavel', 'encaminhamento-urgencia', 'encaminhamento-rede', 'restricao-meios', 'notificacao')) then
      raise exception 'Conduta fora da lista.';
    end if;
    new.ciencia_em := null; new.ciencia_por := null; new.encerrado_em := null; new.encerrado_por := null; new.encerramento_nota := '';
    return new;
  end if;
  if (new.caso_id, new.registrado_por, new.em, new.tipo, new.nivel, new.descricao, new.condutas)
     is distinct from (old.caso_id, old.registrado_por, old.em, old.tipo, old.nivel, old.descricao, old.condutas) then
    raise exception 'A avaliação de risco registrada não muda: registre uma nova avaliação.';
  end if;
  if (new.ciencia_em, new.ciencia_por) is distinct from (old.ciencia_em, old.ciencia_por) then
    if old.ciencia_em is not null then raise exception 'A ciência da supervisão já foi registrada.'; end if;
    if not app.eh_supervisor_do_caso(new.caso_id) then raise exception 'Quem dá ciência é o supervisor do caso.'; end if;
    new.ciencia_em := now(); new.ciencia_por := app.usuario_atual();
  end if;
  if (new.encerrado_em, new.encerrado_por, new.encerramento_nota) is distinct from (old.encerrado_em, old.encerrado_por, old.encerramento_nota) then
    if old.encerrado_em is not null then raise exception 'Acompanhamento já encerrado: se o risco voltar, registre uma nova avaliação.'; end if;
    if new.ciencia_em is null then raise exception 'A supervisão precisa dar ciência antes de encerrar o acompanhamento.'; end if;
    if length(new.encerramento_nota) < 5 then raise exception 'Escreva por que o acompanhamento do risco foi encerrado.'; end if;
    new.encerrado_em := now(); new.encerrado_por := app.usuario_atual();
  end if;
  return new;
end $$;
create trigger regras before insert or update on riscos for each row execute function app.risco_regras();

-- Notificação: o risco precisa ser do mesmo caso
create or replace function app.notificacao_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from riscos r where r.id = new.risco_id and r.caso_id = new.caso_id) then
    raise exception 'A notificação precisa estar ligada a uma avaliação de risco do mesmo caso.';
  end if;
  return new;
end $$;
create trigger regras before insert on notificacoes for each row execute function app.notificacao_regras();

-- Plano de segurança: nova versão só em caso ativo, sempre a seguinte da última
create or replace function app.plano_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if app.em_migracao() then return new; end if;
  if not exists (select 1 from casos c where c.id = new.caso_id and c.status = 'ativo') then raise exception 'Só caso ativo recebe plano de segurança.'; end if;
  if new.versao <> coalesce((select max(versao) from planos_seguranca p where p.caso_id = new.caso_id), 0) + 1 then
    raise exception 'A versão do plano precisa ser a seguinte da última.';
  end if;
  return new;
end $$;
create trigger regras before insert on planos_seguranca for each row execute function app.plano_regras();

-- Contas: ninguém desativa ou reativa a própria conta; senha provisória é gerada por outra pessoa
-- (coordenação ou técnica) e só a própria pessoa a troca.
create or replace function app.usuario_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if app.eh_admin() then return new; end if;
  if new.id = app.usuario_atual() then
    if new.ativo is distinct from old.ativo then raise exception 'Ninguém desativa ou reativa a própria conta.'; end if;
    if new.senha_provisoria and not old.senha_provisoria then raise exception 'Senha provisória é gerada pela coordenação ou pela técnica.'; end if;
  elsif old.senha_provisoria and not new.senha_provisoria then
    raise exception 'Só a própria pessoa troca a senha provisória.';
  end if;
  return new;
end $$;
create trigger regras before update on usuarios for each row execute function app.usuario_regras();

-- Link de leitura do paciente: vale no máximo 72 horas a partir de agora (regras.linkPacienteHoras)
create or replace function app.link_regras() returns trigger
language plpgsql as $$
begin
  if not app.em_migracao() and new.expira_em > now() + interval '72 hours' then new.expira_em := now() + interval '72 hours'; end if;
  return new;
end $$;
create trigger regras before insert on links_acesso for each row execute function app.link_regras();

-- Carimbo de tempo: a data e a hora de cada registro vêm do relógio do servidor, não do computador
-- de quem registra (ninguém "volta no tempo" para assinar ou registrar). Argumentos: coluna e tipo.
create or replace function app.carimbo() returns trigger
language plpgsql as $$
begin
  if app.em_migracao() then return new; end if;
  return jsonb_populate_record(new, jsonb_build_object(tg_argv[0], case when tg_argv[1] = 'data' then current_date::text else now()::text end));
end $$;
create trigger carimbo before insert on pacientes for each row execute function app.carimbo('criado_em', 'data');
create trigger carimbo before insert on usuarios for each row execute function app.carimbo('criado_em', 'data');
create trigger carimbo before insert on inscricoes for each row execute function app.carimbo('data', 'data');
create trigger carimbo before insert on anamneses for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on consentimentos for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on encerramentos for each row execute function app.carimbo('data', 'data');
create trigger carimbo before insert on evolucoes for each row execute function app.carimbo('data', 'data');
create trigger carimbo before insert on assinaturas for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on adendos for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on orientacoes for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on documentos for each row execute function app.carimbo('emitido_em', 'data');
create trigger carimbo before insert on anexos for each row execute function app.carimbo('em', 'data');
create trigger carimbo before insert on avaliacoes for each row execute function app.carimbo('em', 'data');
create trigger carimbo before insert on riscos for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on notificacoes for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on planos_seguranca for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on contatos for each row execute function app.carimbo('em', 'data');
create trigger carimbo before insert on lembretes for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on solicitacoes for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on links_acesso for each row execute function app.carimbo('criado_em', 'hora');
create trigger carimbo before insert on pedidos_titular for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on aceites for each row execute function app.carimbo('em', 'hora');
create trigger carimbo before insert on acessos_justificados for each row execute function app.carimbo('em', 'hora');

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
  -- A hora do evento é a do servidor (só a migração preserva a hora original dos eventos de demonstração).
  -- A tabela é particionada por ano: uma data de outro ano mandaria o evento para outra partição, então é recusada.
  if not app.em_migracao() then
    if date_trunc('year', new.em) <> date_trunc('year', now()) then raise exception 'A hora do evento de auditoria é definida pelo servidor.'; end if;
    new.em := now();
  end if;
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
  -- coalesce: sem perfil (visitante), "perfil = 'tecnico'" daria NULL e o IF não dispararia
  if not (coalesce(app.perfil_atual(), '') = 'tecnico' or app.eh_admin()) then raise exception 'Só a psicóloga técnica verifica a auditoria.'; end if;
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
  if not app.em_migracao() then
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
  -- visitante (anon) ou conta sem perfil não é administrador: só o SQL Editor/service_role entra sem perfil
  if perfil in ('direcao', 'tecnico') or (perfil is null and app.eh_admin()) then select array_agg(id) into escopo from casos;
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
      'faltaJustificada', (select count(*) from sessoes where presenca = 'falta-justificada' and caso_id = any (escopo))),
    'motivosFaltaAvisada', coalesce((select jsonb_object_agg(motivo_falta, n) from (select motivo_falta, count(*) n from sessoes
      where aviso_paciente and caso_id = any (escopo) group by motivo_falta) m), '{}'::jsonb),
    'casosAtivos', (select count(*) from casos where status = 'ativo' and id = any (escopo)),
    'naFila', (select count(*) from inscricoes where status = 'aguardando'),
    'esperaMediaDias', coalesce((select round(avg(current_date - data)) from inscricoes where status = 'aguardando'), 0)
  ) into resultado;
  return resultado;
end $$;

-- "Quem acessou meu prontuário" (LGPD, arts. 9º e 18): eventos dos casos do próprio paciente e os
-- motivos registrados pela técnica. Os motivos vêm direto da tabela: aparecem mesmo que alguém
-- pule o evento de auditoria (e sem o motivo a técnica não lê o conteúdo clínico).
-- A ação vem por categoria ("Abriu o prontuário", "Registrou informações no prontuário"...), não pelo
-- texto da auditoria: se quem usa o portal for o responsável de criança ou adolescente, ele não fica
-- sabendo, por aqui, de avaliação de risco ou notificação (Código de Ética, art. 13). Pelo mesmo motivo,
-- para menor de idade o motivo da técnica não aparece. A mesma regra está em js/permissoes.js.
create or replace function app.categoria_acesso(p_acao text) returns text
language sql immutable as $$
  select case
    when p_acao like 'Abriu o prontuário%' then 'Abriu o prontuário'
    when p_acao like 'Gerou cópia%' or p_acao like 'Entregou cópia%' or p_acao like 'Paciente leu o prontuário%' then 'Cópia ou leitura do prontuário'
    when p_acao like 'Gerou lembrete%' then 'Enviou lembrete de sessão'
    else 'Registrou informações no prontuário' end
$$;

create or replace function app.acessos_ao_meu_prontuario()
returns table (quando timestamptz, quem text, papel text, acao text, motivo text, detalhe text)
language sql stable security definer set search_path = public as $$
  with meus as (select c.id from casos c where c.paciente_id = app.paciente_atual()),
       menor as (select coalesce((select p.data_nascimento > current_date - interval '18 years' from pacientes p where p.id = app.paciente_atual()), true) as sim)
  select x.* from (
    select a.em, case when a.usuario_id = app.usuario_atual() then 'Você' else coalesce(u.nome, 'Visitante') end,
           coalesce(u.perfil, ''), case when a.usuario_id = app.usuario_atual() then a.acao else app.categoria_acesso(a.acao) end,
           null::text, null::text
    from auditoria a left join usuarios u on u.id = a.usuario_id
    where a.alvo in (select id from meus) or a.alvo = app.paciente_atual()
    union all
    select j.em, u.nome, u.perfil, 'Registrou o motivo do acesso ao prontuário',
           case when (select sim from menor) then null else j.motivo end, case when (select sim from menor) then null else j.detalhe end
    from acessos_justificados j join usuarios u on u.id = j.usuario_id
    where j.caso_id in (select id from meus)
  ) x order by 1 desc limit 100
$$;

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
alter table riscos enable row level security;
alter table notificacoes enable row level security;
alter table planos_seguranca enable row level security;
alter table contatos enable row level security;
alter table lembretes enable row level security;
alter table solicitacoes enable row level security;
alter table links_acesso enable row level security;
alter table pedidos_titular enable row level security;
alter table aceites enable row level security;
alter table acessos_justificados enable row level security;
alter table auditoria enable row level security;

-- Equipe vê a equipe. Conta de paciente: só o próprio paciente, o técnico e a equipe do caso dele
-- (a lista de quem tem conta no portal também é dado pessoal: princípio da necessidade).
-- A própria linha aparece mesmo antes do código do MFA: o site precisa do nome e do perfil para pedir o código.
create policy ver on usuarios for select to authenticated using (
  id = app.usuario_atual() or (auth_id = auth.uid() and ativo) or app.perfil_atual() = 'tecnico'
  or (perfil <> 'paciente' and app.perfil_atual() in ('estagiario', 'supervisor', 'direcao'))
  or (perfil = 'paciente' and exists (select 1 from casos c where c.paciente_id = usuarios.paciente_id
                                      and (app.eh_estagiario_do_caso(c.id) or app.eh_supervisor_do_caso(c.id)))));
create policy direcao_cria_estudante on usuarios for insert to authenticated with check (app.perfil_atual() = 'direcao' and perfil = 'estagiario');
-- Cada um só atualiza a própria conta, e só a coluna senha_provisoria (ver "Permissões" no fim):
-- perfil, CRP, matrícula e paciente_id não mudam pela API (senão um estagiário se promoveria a técnico).
create policy atualizar_propria on usuarios for update to authenticated using (id = app.usuario_atual()) with check (id = app.usuario_atual());
-- Contas: a direção desativa/reativa e marca senha provisória nas contas da equipe (nunca na própria);
-- a técnica faz o mesmo no acesso dos pacientes ao portal e cria esse acesso. A senha fica no Supabase Auth.
create policy gerir_equipe on usuarios for update to authenticated
  using (app.perfil_atual() = 'direcao' and perfil <> 'paciente' and id <> app.usuario_atual()) with check (perfil <> 'paciente');
create policy gerir_portal on usuarios for update to authenticated
  using (app.perfil_atual() = 'tecnico' and perfil = 'paciente') with check (perfil = 'paciente');
create policy tecnico_cria_acesso on usuarios for insert to authenticated with check (app.perfil_atual() = 'tecnico' and perfil = 'paciente');

create policy ver on grupos for select to authenticated using (app.perfil_atual() <> 'paciente');
create policy ver on subgrupos for select to authenticated using (app.perfil_atual() <> 'paciente');
create policy supervisor_cria on subgrupos for insert to authenticated
  with check (exists (select 1 from grupos g where g.id = grupo_id and g.supervisor_id = app.usuario_atual()));
create policy ver on alocacoes for select to authenticated using (app.perfil_atual() <> 'paciente');
create policy direcao_aloca on alocacoes for insert to authenticated with check (app.perfil_atual() = 'direcao');
create policy direcao_ou_supervisor on alocacoes for update to authenticated
  using (app.perfil_atual() = 'direcao' or exists (select 1 from grupos g where g.id = grupo_id and g.supervisor_id = app.usuario_atual()))
  with check (app.perfil_atual() = 'direcao' or exists (select 1 from grupos g where g.id = grupo_id and g.supervisor_id = app.usuario_atual()));

create policy ver on pacientes for select to authenticated using (
  app.perfil_atual() = 'tecnico' or id = app.paciente_atual()
  or exists (select 1 from casos c where c.paciente_id = pacientes.id and (app.eh_estagiario_do_caso(c.id) or app.eh_supervisor_do_caso(c.id))));
create policy tecnico_grava on pacientes for insert to authenticated with check (app.perfil_atual() = 'tecnico');
create policy tecnico_edita on pacientes for update to authenticated using (app.perfil_atual() = 'tecnico');

create policy ver on casos for select to authenticated using (app.pode_ver_caso(id) or app.eh_paciente_do_caso(id));
create policy tecnico_cria on casos for insert to authenticated with check (app.perfil_atual() = 'tecnico');
create policy equipe_atualiza on casos for update to authenticated using (app.pode_ver_caso(id));

-- Fila: qualquer pessoa (anon) se inscreve; só o técnico lê
create policy inscrever on inscricoes for insert to anon, authenticated with check (status = 'aguardando' and caso_id is null
  and encaminhado_para = '' and risco_triagem = '');   -- o que a triagem decide não vem do formulário público
create policy tecnico_le on inscricoes for select to authenticated using (app.perfil_atual() = 'tecnico');
create policy tecnico_atualiza on inscricoes for update to authenticated using (app.perfil_atual() = 'tecnico');

create policy ver on anamneses for select to authenticated using (app.pode_ver_clinico(caso_id));
create policy registrar on anamneses for insert to authenticated with check (autor_id = app.usuario_atual() and app.pode_ver_caso(caso_id));

create policy ver on consentimentos for select to authenticated using (app.pode_ver_caso(caso_id) or app.eh_paciente_do_caso(caso_id));
create policy registrar on consentimentos for insert to authenticated with check (registrado_por = app.usuario_atual()
  and (app.perfil_atual() = 'tecnico' or (app.eh_paciente_do_caso(caso_id) and finalidade <> 'contrato')));

create policy ver on encerramentos for select to authenticated using (app.pode_ver_clinico(caso_id) or app.eh_paciente_do_caso(caso_id));
create policy registrar on encerramentos for insert to authenticated with check (registrado_por = app.usuario_atual()
  and (app.eh_estagiario_do_caso(caso_id) or app.eh_supervisor_do_caso(caso_id)));

create policy ver on sessoes for select to authenticated using (app.pode_ver_caso(caso_id) or app.eh_paciente_do_caso(caso_id));
create policy agendar on sessoes for insert to authenticated with check (app.pode_ver_caso(caso_id));
create policy atualizar on sessoes for update to authenticated using (app.pode_ver_caso(caso_id) or app.eh_paciente_do_caso(caso_id));

-- Rascunho só o autor vê; paciente não lê a tabela (recebe a cópia pelo fluxo de acesso)
create policy ver on evolucoes for select to authenticated using (app.pode_ver_clinico(caso_id) and (status <> 'rascunho' or autor_id = app.usuario_atual()));
create policy escrever on evolucoes for insert to authenticated with check (autor_id = app.usuario_atual() and app.eh_estagiario_do_caso(caso_id));
create policy atualizar on evolucoes for update to authenticated using (
  (autor_id = app.usuario_atual() and status in ('rascunho', 'devolvida')) or (app.eh_supervisor_do_caso(caso_id) and status = 'enviada'))
  with check (app.pode_ver_caso(caso_id));   -- a transição permitida é conferida pelo trigger app.evolucao_regras

create policy ver on assinaturas for select to authenticated using (app.pode_ver_clinico(app.caso_do_alvo(alvo_tipo, alvo_id)));
create policy assinar on assinaturas for insert to authenticated with check (usuario_id = app.usuario_atual() and (
  (papel = 'supervisor' and app.eh_supervisor_do_caso(app.caso_do_alvo(alvo_tipo, alvo_id)))
  or (papel = 'estagiario' and app.eh_estagiario_do_caso(app.caso_do_alvo(alvo_tipo, alvo_id)))));

create policy ver on adendos for select to authenticated using (app.pode_ver_clinico((select caso_id from evolucoes e where e.id = evolucao_id)));
create policy registrar on adendos for insert to authenticated with check (autor_id = app.usuario_atual()
  and exists (select 1 from evolucoes e where e.id = evolucao_id and e.status = 'validada'
              and (app.eh_estagiario_do_caso(e.caso_id) or app.eh_supervisor_do_caso(e.caso_id))));

-- Supervisão: só supervisor e estagiários do caso (o técnico NÃO vê)
create policy ver on orientacoes for select to authenticated using (app.eh_supervisor_do_caso(caso_id) or app.eh_estagiario_do_caso(caso_id));
create policy registrar on orientacoes for insert to authenticated with check (supervisor_id = app.usuario_atual() and app.eh_supervisor_do_caso(caso_id));

create policy ver on documentos for select to authenticated using (app.pode_ver_clinico(caso_id));
create policy emitir on documentos for insert to authenticated with check (autor_id = app.usuario_atual() and app.eh_estagiario_do_caso(caso_id));
create policy ver on anexos for select to authenticated using (app.pode_ver_clinico(caso_id));
create policy anexar on anexos for insert to authenticated with check (enviado_por = app.usuario_atual() and app.pode_ver_caso(caso_id));

create policy ver on avaliacoes for select to authenticated using (app.pode_ver_clinico(caso_id));
create policy registrar on avaliacoes for insert to authenticated with check (aplicado_por = app.usuario_atual()
  and (app.eh_estagiario_do_caso(caso_id) or app.eh_supervisor_do_caso(caso_id)));

-- Risco e segurança: a equipe do caso registra; ciência e notificação são do supervisor (o trigger confere);
-- o paciente lê o próprio plano de segurança no portal (os riscos chegam a ele pela cópia do prontuário)
create policy ver on riscos for select to authenticated using (app.pode_ver_clinico(caso_id));
create policy registrar on riscos for insert to authenticated with check (registrado_por = app.usuario_atual()
  and (app.eh_estagiario_do_caso(caso_id) or app.eh_supervisor_do_caso(caso_id) or app.perfil_atual() = 'tecnico'));   -- técnico: risco visto na triagem
create policy acompanhar on riscos for update to authenticated using (app.eh_estagiario_do_caso(caso_id) or app.eh_supervisor_do_caso(caso_id));
create policy ver on notificacoes for select to authenticated using (app.pode_ver_clinico(caso_id));
create policy registrar on notificacoes for insert to authenticated with check (registrado_por = app.usuario_atual() and app.eh_supervisor_do_caso(caso_id));
create policy ver on planos_seguranca for select to authenticated using (app.pode_ver_clinico(caso_id) or app.eh_paciente_do_caso(caso_id));
create policy registrar on planos_seguranca for insert to authenticated with check (autor_id = app.usuario_atual()
  and (app.eh_estagiario_do_caso(caso_id) or app.eh_supervisor_do_caso(caso_id)));

create policy ver on contatos for select to authenticated using (app.pode_ver_caso(caso_id));
create policy registrar on contatos for insert to authenticated with check (registrado_por = app.usuario_atual() and app.pode_ver_caso(caso_id));
create policy ver on lembretes for select to authenticated using (app.pode_ver_caso((select caso_id from sessoes s where s.id = sessao_id)));
create policy registrar on lembretes for insert to authenticated with check (enviado_por = app.usuario_atual()
  and app.pode_ver_caso((select caso_id from sessoes s where s.id = sessao_id)));

create policy ver on solicitacoes for select to authenticated using (app.perfil_atual() = 'tecnico' or paciente_id = app.paciente_atual());
-- O paciente só pede a cópia de um caso que é dele (senão receberia o prontuário de outra pessoa)
create policy pedir on solicitacoes for insert to authenticated with check (paciente_id = app.paciente_atual() and status = 'recebida'
  and app.eh_paciente_do_caso(caso_id));
create policy tecnico_atende on solicitacoes for update to authenticated using (app.perfil_atual() = 'tecnico');

-- Links: só o técnico. A leitura pelo paciente passa por uma Edge Function, que confere token e nascimento no servidor.
create policy tecnico on links_acesso for all to authenticated using (app.perfil_atual() = 'tecnico') with check (app.perfil_atual() = 'tecnico');

create policy ver on pedidos_titular for select to authenticated using (app.perfil_atual() = 'tecnico'
  or (titular_tipo = 'paciente' and titular_id = app.paciente_atual()) or (titular_tipo = 'usuario' and titular_id = app.usuario_atual()));
create policy pedir on pedidos_titular for insert to authenticated with check (status = 'aberto'
  and ((titular_tipo = 'paciente' and titular_id = app.paciente_atual()) or (titular_tipo = 'usuario' and titular_id = app.usuario_atual())));
create policy tecnico_responde on pedidos_titular for update to authenticated using (app.perfil_atual() = 'tecnico');

create policy ver on aceites for select to authenticated using (usuario_id = app.usuario_atual() or app.perfil_atual() = 'tecnico');

-- Motivo de acesso: só a técnica registra; ela e o supervisor do caso leem (o paciente vê pela função abaixo)
create policy ver on acessos_justificados for select to authenticated using (usuario_id = app.usuario_atual() or app.eh_supervisor_do_caso(caso_id));
create policy justificar on acessos_justificados for insert to authenticated with check (usuario_id = app.usuario_atual() and app.perfil_atual() = 'tecnico');
create policy aceitar on aceites for insert to authenticated with check (usuario_id = app.usuario_atual());

-- Cada um registra só os próprios eventos. Eventos de visitante vêm do próprio banco (trigger da
-- inscrição) e as tentativas de login ficam no registro do Supabase Auth: ninguém grava "em nome" de outro.
create policy registrar on auditoria for insert to authenticated with check (usuario_id = app.usuario_atual());
create policy tecnico_le on auditoria for select to authenticated using (app.perfil_atual() = 'tecnico');

-- ---------------------------------------------------------------------
-- Permissões dos papéis da API (anon = visitante; authenticated = logado)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant insert on inscricoes to anon;
grant select, insert, update on all tables in schema public to authenticated;
revoke update on assinaturas, adendos, anamneses, consentimentos, encerramentos, orientacoes, documentos, anexos, aceites, lembretes, auditoria,
  notificacoes, planos_seguranca, acessos_justificados from authenticated;
-- Em usuarios, pela API só mudam "senha provisória" e "ativa" (perfil, CRP e vínculo com paciente ficam com a administração)
revoke update on usuarios from authenticated;
grant update (senha_provisoria, ativo) on usuarios to authenticated;
grant usage on schema app to anon, authenticated;
grant execute on all functions in schema app to anon, authenticated;
-- Eliminação de inscrições antigas: só o agendador (pg_cron) ou o administrador, nunca pela API
revoke execute on function app.eliminar_inscricoes_antigas() from public, anon, authenticated;
grant select on app.faltas_seguidas to authenticated;
grant usage on sequence auditoria_seq to anon, authenticated;

-- ---------------------------------------------------------------------
-- Arquivos (Supabase Storage, bucket privado "anexos"). O caminho é "<caso>/<arquivo>":
-- só quem pode ver o caso baixa ou envia; ninguém apaga nem substitui.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    execute 'drop policy if exists vinculo_ver_anexo on storage.objects';
    execute 'drop policy if exists vinculo_enviar_anexo on storage.objects';
    execute $p$create policy vinculo_ver_anexo on storage.objects for select to authenticated
      using (bucket_id = 'anexos' and app.pode_ver_clinico(split_part(name, '/', 1)))$p$;
    execute $p$create policy vinculo_enviar_anexo on storage.objects for insert to authenticated
      with check (bucket_id = 'anexos' and app.pode_ver_caso(split_part(name, '/', 1))
                  and exists (select 1 from casos c where c.id = split_part(name, '/', 1) and c.status = 'ativo'))$p$;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Supabase Auth: quando a conta tem o e-mail CONFIRMADO (convite aceito), liga ao usuário de mesmo e-mail.
-- Ligar antes da confirmação deixaria alguém "tomar" a conta só por saber o e-mail de outra pessoa.
-- No painel do Supabase, deixe o cadastro público desligado (Authentication → Sign In / Providers).
-- ---------------------------------------------------------------------
create or replace function app.ligar_conta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null then
    update usuarios set auth_id = new.id where lower(email) = lower(new.email) and auth_id is null;
  end if;
  return new;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    execute 'drop trigger if exists vinculo_ligar_conta on auth.users';
    execute 'create trigger vinculo_ligar_conta after insert or update of email_confirmed_at on auth.users for each row execute function app.ligar_conta()';
  end if;
end $$;

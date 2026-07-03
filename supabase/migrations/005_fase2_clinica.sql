-- =============================================
-- FASE 2: Módulos Clínicos
-- =============================================

-- Agenda
create table if not exists agenda (
  id               uuid primary key default gen_random_uuid(),
  paciente_id      uuid references pacientes on delete restrict not null,
  medica_id        uuid references profiles on delete restrict not null,
  data_hora        timestamptz not null,
  duracao_minutos  integer not null default 60,
  tipo             text not null default 'consulta'
                   check (tipo in ('consulta','retorno','procedimento','avaliacao')),
  status           text not null default 'agendado'
                   check (status in ('agendado','confirmado','realizado','cancelado','faltou')),
  obs              text,
  created_at       timestamptz default now()
);

-- Anamnese digital (token público para o paciente preencher)
create table if not exists anamneses (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid references pacientes on delete cascade not null,
  token_publico   text not null unique default encode(gen_random_bytes(24), 'hex'),
  respondida_em   timestamptz,
  dados           jsonb,
  created_at      timestamptz default now()
);

-- Termos de consentimento (1 por avaliação)
create table if not exists termos_consentimento (
  id                      uuid primary key default gen_random_uuid(),
  paciente_id             uuid references pacientes on delete restrict not null,
  avaliacao_id            uuid references avaliacoes on delete set null,
  assinado_em             timestamptz,
  consentimento_clinico   boolean not null default false,
  autorizacao_marketing   boolean not null default false,
  ip_assinatura           text,
  dados                   jsonb,
  created_at              timestamptz default now()
);

-- Prontuário: uma entrada por consulta
create table if not exists prontuario_consultas (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid references pacientes on delete restrict not null,
  medica_id      uuid references profiles on delete restrict not null,
  agenda_id      uuid references agenda on delete set null,
  avaliacao_id   uuid references avaliacoes on delete set null,
  data_consulta  date not null default current_date,
  notas_clinicas text,
  alergias       text,
  contraindicacoes text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Mapa de face (por consulta)
create table if not exists mapa_face (
  id          uuid primary key default gen_random_uuid(),
  consulta_id uuid references prontuario_consultas on delete cascade not null unique,
  dados       jsonb not null default '{}',
  updated_at  timestamptz default now()
);

-- Fotos clínicas
create table if not exists fotos_clinicas (
  id                  uuid primary key default gen_random_uuid(),
  paciente_id         uuid references pacientes on delete restrict not null,
  consulta_id         uuid references prontuario_consultas on delete set null,
  angulo              text not null default 'frontal'
                      check (angulo in ('frontal','perfil_direito','perfil_esquerdo','diagonal_direito','diagonal_esquerdo','sorriso')),
  storage_path        text not null,
  autoriza_marketing  boolean not null default false,
  tipo                text not null default 'antes'
                      check (tipo in ('antes','depois')),
  created_at          timestamptz default now()
);

-- Triggers updated_at
create trigger prontuario_updated_at before update on prontuario_consultas
  for each row execute function update_updated_at();

create trigger mapa_face_updated_at before update on mapa_face
  for each row execute function update_updated_at();

-- RLS
alter table agenda enable row level security;
alter table anamneses enable row level security;
alter table termos_consentimento enable row level security;
alter table prontuario_consultas enable row level security;
alter table mapa_face enable row level security;
alter table fotos_clinicas enable row level security;

-- Policies
create policy "all agenda" on agenda for all to authenticated using (true);
create policy "all anamneses" on anamneses for all to authenticated using (true);
-- Anamnese pública (para o paciente preencher sem login)
create policy "public anamnese read" on anamneses for select to anon
  using (token_publico is not null);
create policy "public anamnese update" on anamneses for update to anon
  using (token_publico is not null and respondida_em is null);

create policy "all termos" on termos_consentimento for all to authenticated using (true);
create policy "all prontuario" on prontuario_consultas for all to authenticated using (true);
create policy "all mapa_face" on mapa_face for all to authenticated using (true);
create policy "all fotos" on fotos_clinicas for all to authenticated using (true);

-- Módulo de Agentes IA (Ravi + equipe Évor Intelligence)

create table if not exists agente_sessoes (
  id          uuid primary key default gen_random_uuid(),
  agente_slug text not null,
  titulo      text not null default 'Nova conversa',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists agente_mensagens (
  id         uuid primary key default gen_random_uuid(),
  sessao_id  uuid not null references agente_sessoes(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists agente_mensagens_sessao_idx on agente_mensagens(sessao_id);
create index if not exists agente_sessoes_slug_idx on agente_sessoes(agente_slug);

-- RLS
alter table agente_sessoes   enable row level security;
alter table agente_mensagens enable row level security;

create policy "Usuários autenticados acessam sessões" on agente_sessoes
  for all using (auth.role() = 'authenticated');

create policy "Usuários autenticados acessam mensagens" on agente_mensagens
  for all using (auth.role() = 'authenticated');

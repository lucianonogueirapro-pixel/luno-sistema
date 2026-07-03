-- Registro de uso de tokens da API Anthropic
create table if not exists agente_uso (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  agente_slug text        not null,
  sessao_id   uuid        references agente_sessoes(id) on delete set null,
  input_tokens  int       not null default 0,
  output_tokens int       not null default 0,
  -- custo estimado em USD (claude-sonnet-4-6: $3/1M in, $15/1M out)
  custo_usd   numeric(10,6) generated always as (
    (input_tokens::numeric  / 1000000 * 3) +
    (output_tokens::numeric / 1000000 * 15)
  ) stored
);

alter table agente_uso enable row level security;
create policy "auth users" on agente_uso for all using (auth.role() = 'authenticated');

-- índice para consultas por período e agente
create index agente_uso_created_at_idx on agente_uso (created_at desc);
create index agente_uso_slug_idx       on agente_uso (agente_slug);

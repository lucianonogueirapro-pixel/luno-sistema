create table if not exists opcao_brindes (
  id          uuid primary key default gen_random_uuid(),
  opcao_id    uuid references avaliacao_opcoes on delete cascade not null,
  insumo_id   uuid references insumos on delete restrict not null,
  quantidade  numeric(10,3) not null default 1,
  created_at  timestamptz default now()
);

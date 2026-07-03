-- Conexão OAuth com Google
create table if not exists google_oauth (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  access_token text        not null,
  refresh_token text,
  expires_at   timestamptz,
  account_id   text,   -- ex: accounts/123456789
  location_id  text,   -- ex: locations/987654321
  location_name text
);

alter table google_oauth enable row level security;
create policy "auth users" on google_oauth for all using (auth.role() = 'authenticated');

-- Avaliações do Google Meu Negócio
create table if not exists google_avaliacoes (
  id               uuid primary key default gen_random_uuid(),
  review_id        text unique not null,
  synced_at        timestamptz not null default now(),
  google_created_at timestamptz,
  author_name      text,
  rating           int check (rating between 1 and 5),
  comment          text,
  reply            text,
  replied_at       timestamptz,
  status           text not null default 'pending'
    check (status in ('pending', 'draft', 'replied', 'escalated'))
);

alter table google_avaliacoes enable row level security;
create policy "auth users" on google_avaliacoes for all using (auth.role() = 'authenticated');

create index google_avaliacoes_status_idx on google_avaliacoes (status);
create index google_avaliacoes_created_idx on google_avaliacoes (google_created_at desc);

-- Insights periódicos do Google Meu Negócio
create table if not exists google_insights (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  date            date not null unique,
  views_maps      int  default 0,
  views_search    int  default 0,
  actions_website int  default 0,
  actions_phone   int  default 0,
  actions_driving int  default 0
);

alter table google_insights enable row level security;
create policy "auth users" on google_insights for all using (auth.role() = 'authenticated');

-- Profiles (roles por usuário)
create table if not exists profiles (
  id   uuid references auth.users on delete cascade primary key,
  nome text not null,
  role text not null check (role in ('admin','medica','comercial')),
  created_at timestamptz default now()
);

-- Insumos
create table if not exists insumos (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  categoria          text not null,
  marca              text,
  fornecedor         text,
  contato            text,
  tiers              jsonb not null default '[]',
  custo_atual        numeric(10,2) not null default 0,
  estoque_atual      numeric(10,3) not null default 0,
  estoque_minimo     numeric(10,3) not null default 0,
  unidade            text not null default 'un',
  dysport_conversao  boolean not null default false,
  fator_conversao    numeric(5,4) not null default 1,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Procedimentos
create table if not exists procedimentos (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  tempo_minutos  integer not null default 60,
  preco_tabela   numeric(10,2) not null default 0,
  created_at     timestamptz default now()
);

-- Receita: insumos por procedimento
create table if not exists procedimento_insumos (
  id               uuid primary key default gen_random_uuid(),
  procedimento_id  uuid references procedimentos on delete cascade not null,
  insumo_id        uuid references insumos on delete restrict not null,
  quantidade       numeric(10,3) not null default 1,
  unique(procedimento_id, insumo_id)
);

-- Pacientes
create table if not exists pacientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text not null,
  email       text,
  obs         text,
  created_at  timestamptz default now()
);

-- Avaliações
create table if not exists avaliacoes (
  id          uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes on delete restrict not null,
  medica_id   uuid references profiles on delete restrict not null,
  status      text not null default 'rascunho'
              check (status in ('rascunho','pendente','em_negociacao','fechado','perdido')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Opções (até 3 por avaliação)
create table if not exists avaliacao_opcoes (
  id               uuid primary key default gen_random_uuid(),
  avaliacao_id     uuid references avaliacoes on delete cascade not null,
  numero_opcao     integer not null check (numero_opcao in (1,2,3)),
  preco_negociado  numeric(10,2),
  obs_comercial    text,
  unique(avaliacao_id, numero_opcao)
);

-- Procedimentos por opção
create table if not exists opcao_procedimentos (
  id               uuid primary key default gen_random_uuid(),
  opcao_id         uuid references avaliacao_opcoes on delete cascade not null,
  procedimento_id  uuid references procedimentos on delete restrict not null,
  unique(opcao_id, procedimento_id)
);

-- Brindes por opção (custo real, grátis para o paciente)
create table if not exists opcao_brindes (
  id         uuid primary key default gen_random_uuid(),
  opcao_id   uuid references avaliacao_opcoes on delete cascade not null,
  insumo_id  uuid references insumos on delete restrict not null,
  quantidade numeric(10,3) not null default 1,
  obs        text
);

-- Movimentações de estoque
create table if not exists movimentacoes_estoque (
  id               uuid primary key default gen_random_uuid(),
  insumo_id        uuid references insumos on delete restrict not null,
  tipo             text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade       numeric(10,3) not null,
  referencia_id    uuid,
  referencia_tipo  text,
  obs              text,
  created_at       timestamptz default now()
);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger insumos_updated_at before update on insumos
  for each row execute function update_updated_at();

create trigger avaliacoes_updated_at before update on avaliacoes
  for each row execute function update_updated_at();

-- RLS
alter table profiles enable row level security;
alter table insumos enable row level security;
alter table procedimentos enable row level security;
alter table procedimento_insumos enable row level security;
alter table pacientes enable row level security;
alter table avaliacoes enable row level security;
alter table avaliacao_opcoes enable row level security;
alter table opcao_procedimentos enable row level security;
alter table opcao_brindes enable row level security;
alter table movimentacoes_estoque enable row level security;

-- Policies: autenticados leem tudo
create policy "read insumos" on insumos for select to authenticated using (true);
create policy "write insumos" on insumos for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','medica')));

create policy "read procedimentos" on procedimentos for select to authenticated using (true);
create policy "write procedimentos" on procedimentos for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','medica')));

create policy "read proc_insumos" on procedimento_insumos for select to authenticated using (true);
create policy "write proc_insumos" on procedimento_insumos for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','medica')));

create policy "read pacientes" on pacientes for select to authenticated using (true);
create policy "write pacientes" on pacientes for all to authenticated using (true);

create policy "read avaliacoes" on avaliacoes for select to authenticated using (true);
create policy "insert avaliacoes" on avaliacoes for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin','medica')));
create policy "update avaliacoes" on avaliacoes for update to authenticated using (true);

create policy "all avaliacao_opcoes" on avaliacao_opcoes for all to authenticated using (true);
create policy "all opcao_procedimentos" on opcao_procedimentos for all to authenticated using (true);
create policy "all opcao_brindes" on opcao_brindes for all to authenticated using (true);
create policy "all estoque" on movimentacoes_estoque for all to authenticated using (true);
create policy "read profiles" on profiles for select to authenticated using (true);

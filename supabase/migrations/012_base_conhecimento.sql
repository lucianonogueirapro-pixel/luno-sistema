-- Base de conhecimento da Évor
-- Armazena documentos de referência acessíveis por todos os agentes

create table if not exists base_conhecimento (
  id          uuid    default gen_random_uuid() primary key,
  titulo      text    not null,
  slug        text    not null unique,          -- identificador curto para query
  categoria   text    not null,                 -- 'marca' | 'mkt' | 'comercial' | 'clinico' | 'geral'
  conteudo    text    not null,
  updated_at  timestamptz default now()
);

-- Só usuários autenticados podem ler
alter table base_conhecimento enable row level security;

create policy "Autenticados leem base_conhecimento"
  on base_conhecimento for select
  using (auth.role() = 'authenticated');

create policy "Autenticados inserem/atualizam base_conhecimento"
  on base_conhecimento for all
  using (auth.role() = 'authenticated');

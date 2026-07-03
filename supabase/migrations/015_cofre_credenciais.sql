-- Cofre de credenciais — acesso restrito ao dono do sistema
create table if not exists cofre_credenciais (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  servico     text not null,      -- ex: Google, Meta, Supabase, Anthropic
  nome        text not null,      -- ex: Client ID, Client Secret, API Key
  valor       text not null,      -- o valor real da credencial
  descricao   text,               -- onde é usado / para que serve
  categoria   text not null default 'api'
    check (categoria in ('api', 'oauth', 'banco', 'infra', 'social', 'outro')),
  ativo       boolean not null default true
);

-- Índice único para evitar duplicatas
create unique index cofre_credenciais_servico_nome_idx on cofre_credenciais (servico, nome);

alter table cofre_credenciais enable row level security;
-- Apenas usuários autenticados têm acesso
create policy "auth users" on cofre_credenciais for all using (auth.role() = 'authenticated');

-- Valores inseridos via painel admin — não armazenar credenciais reais em migrations
insert into cofre_credenciais (servico, nome, valor, descricao, categoria) values
  ('Supabase', 'URL do Projeto',    '', 'URL pública do projeto Supabase', 'banco'),
  ('Supabase', 'Anon Key',          '', 'Chave pública Supabase (pode aparecer no frontend)', 'banco'),
  ('Supabase', 'Service Role Key',  '', 'Chave de admin Supabase — NUNCA expor no frontend ou compartilhar', 'banco'),
  ('Anthropic', 'API Key',          '', 'Chave da API Claude (Anthropic) — usada pelos agentes de IA do sistema', 'api'),
  ('Google', 'Client ID',           '', 'ID do cliente OAuth para Google Meu Negócio', 'oauth'),
  ('Google', 'Client Secret',       '', 'Chave secreta do cliente OAuth Google — NÃO compartilhar', 'oauth'),
  ('Google', 'Redirect URI (dev)',  'http://localhost:3000/api/oauth/google/callback', 'URI de redirecionamento OAuth autorizada para desenvolvimento local', 'oauth')
on conflict (servico, nome) do update set
  valor = excluded.valor,
  updated_at = now();

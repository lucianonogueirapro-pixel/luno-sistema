-- 007_orcamentos.sql
-- Módulo: Orçamentos (propostas comerciais)

CREATE TABLE IF NOT EXISTS orcamentos (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid references pacientes on delete restrict not null,
  medica_id     uuid references profiles on delete restrict not null,
  avaliacao_id  uuid references avaliacoes on delete set null,
  status        text not null default 'rascunho'
                check (status in ('rascunho','enviado','aprovado','recusado')),
  titulo        text,
  obs           text,
  validade_dias integer not null default 15,
  token         text unique not null default encode(gen_random_bytes(12), 'hex'),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id            uuid primary key default gen_random_uuid(),
  orcamento_id  uuid references orcamentos on delete cascade not null,
  descricao     text not null,
  valor         numeric(10,2) not null default 0,
  posicao       integer not null default 0
);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

-- Autenticados: acesso total
CREATE POLICY "auth_all_orcamentos" ON orcamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_orcamento_itens" ON orcamento_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Público: leitura (acesso via token secreto compartilhado)
CREATE POLICY "anon_read_orcamentos" ON orcamentos
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_orcamento_itens" ON orcamento_itens
  FOR SELECT TO anon USING (true);

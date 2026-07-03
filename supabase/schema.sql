-- ============================================================
-- LUNO SaaS — Schema Multi-Tenant
-- Rodar no SQL Editor do Supabase (projeto: Luno Sas)
-- ============================================================

-- ── EXTENSÕES ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── EMPRESAS (cada cliente do Luno é uma empresa) ───────────
CREATE TABLE empresas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  plano         TEXT NOT NULL DEFAULT 'gestao', -- gestao | gestao_luna | gestao_luna_agenda
  modulos       TEXT[] NOT NULL DEFAULT '{gestao}',
  regime_fiscal TEXT DEFAULT 'mei', -- mei | simples | lucro_presumido
  telefone      TEXT,
  email         TEXT,
  site          TEXT,
  instagram     TEXT,
  endereco      TEXT,
  cidade        TEXT,
  estado        TEXT,
  ativo         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── USUÁRIOS (vinculados a uma empresa) ─────────────────────
CREATE TABLE usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT,
  email       TEXT,
  papel       TEXT DEFAULT 'admin', -- admin | profissional | recepcao
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── CLIENTES ────────────────────────────────────────────────
CREATE TABLE clientes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  telefone         TEXT,
  email            TEXT,
  data_nascimento  DATE,
  canal_aquisicao  TEXT DEFAULT 'outros', -- instagram | indicacao | google | anuncios | outros
  obs              TEXT,
  ativo            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROFISSIONAIS ────────────────────────────────────────────
CREATE TABLE profissionais (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  especialidade       TEXT,
  telefone            TEXT,
  email               TEXT,
  cor                 TEXT DEFAULT '#4f46e5',
  comissao_percentual NUMERIC(5,2) DEFAULT 0,
  ativo               BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profissional_disponibilidades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  profissional_id   UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  dia_semana        INT NOT NULL, -- 0=Dom ... 6=Sáb
  hora_inicio       TEXT NOT NULL DEFAULT '09:00',
  hora_fim          TEXT NOT NULL DEFAULT '18:00'
);

-- ── SERVIÇOS (procedimentos) ──────────────────────────────────
CREATE TABLE servicos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  preco       NUMERIC(10,2) DEFAULT 0,
  duracao_min INT DEFAULT 60,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── PRODUTOS (insumos/estoque) ────────────────────────────────
CREATE TABLE produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  categoria       TEXT,
  unidade         TEXT DEFAULT 'un',
  quantidade      NUMERIC(10,3) DEFAULT 0,
  quantidade_min  NUMERIC(10,3) DEFAULT 0,
  preco_custo     NUMERIC(10,2) DEFAULT 0,
  fornecedor      TEXT,
  ativo           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGENDA ───────────────────────────────────────────────────
CREATE TABLE agenda (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id       UUID REFERENCES clientes(id) ON DELETE SET NULL,
  profissional_id  UUID REFERENCES profissionais(id) ON DELETE SET NULL,
  servico_id       UUID REFERENCES servicos(id) ON DELETE SET NULL,
  data_hora        TIMESTAMPTZ NOT NULL,
  duracao_min      INT DEFAULT 60,
  tipo             TEXT DEFAULT 'servico', -- servico | avaliacao | retorno | outro
  status           TEXT DEFAULT 'agendado', -- agendado | confirmado | realizado | cancelado | faltou
  valor            NUMERIC(10,2),
  obs              TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── AVALIAÇÕES / NEGOCIAÇÃO ───────────────────────────────────
CREATE TABLE avaliacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id  UUID REFERENCES clientes(id) ON DELETE SET NULL,
  status      TEXT DEFAULT 'pendente', -- rascunho | pendente | em_negociacao | fechado | perdido
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE avaliacao_opcoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  avaliacao_id      UUID NOT NULL REFERENCES avaliacoes(id) ON DELETE CASCADE,
  titulo            TEXT,
  descricao         TEXT,
  preco_negociado   NUMERIC(10,2),
  aceita            BOOLEAN DEFAULT FALSE
);

-- ── ORÇAMENTOS ───────────────────────────────────────────────
CREATE TABLE orcamentos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id  UUID REFERENCES clientes(id) ON DELETE SET NULL,
  titulo      TEXT,
  status      TEXT DEFAULT 'rascunho', -- rascunho | enviado | aprovado | recusado
  validade    DATE,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orcamento_itens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  descricao    TEXT NOT NULL,
  quantidade   NUMERIC(10,3) DEFAULT 1,
  preco_unit   NUMERIC(10,2) DEFAULT 0
);

-- ── FINANCEIRO ────────────────────────────────────────────────
CREATE TABLE lancamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL, -- entrada | saida
  categoria        TEXT,          -- fixo | variavel | emergencia | servico | produto | outro
  descricao        TEXT NOT NULL,
  valor_previsto   NUMERIC(10,2) DEFAULT 0,
  valor_pago       NUMERIC(10,2),
  forma_pagamento  TEXT,          -- dinheiro | pix | credito | debito | transferencia
  pct_maquineta    NUMERIC(5,2) DEFAULT 0,
  pct_imposto      NUMERIC(5,2) DEFAULT 0,
  dia_vencimento   INT,
  mes              TEXT,          -- YYYY-MM
  status           TEXT DEFAULT 'pend', -- pend | pago | cancelado
  ref_id           UUID,          -- referência ao custos_config
  cliente_id       UUID REFERENCES clientes(id) ON DELETE SET NULL,
  obs              TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE custos_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL DEFAULT 'fixo', -- fixo | variavel | emergencia
  descricao        TEXT NOT NULL,
  valor            NUMERIC(10,2) DEFAULT 0,
  dia_vencimento   INT,
  estimado         BOOLEAN DEFAULT TRUE,
  ativo            BOOLEAN DEFAULT TRUE,
  posicao          INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── CRM / WHATSAPP ────────────────────────────────────────────
CREATE TABLE wa_conversas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id     UUID REFERENCES clientes(id) ON DELETE SET NULL,
  telefone       TEXT NOT NULL,
  nome_contato   TEXT,
  status         TEXT DEFAULT 'novo', -- novo | em_atendimento | qualificado | perdido | concluido
  canal          TEXT DEFAULT 'whatsapp',
  ultima_msg     TEXT,
  ultima_msg_at  TIMESTAMPTZ,
  assigned_to    UUID REFERENCES profissionais(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wa_mensagens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  conversa_id   UUID NOT NULL REFERENCES wa_conversas(id) ON DELETE CASCADE,
  role          TEXT NOT NULL, -- user | assistant | system
  content       TEXT NOT NULL,
  msg_id_wa     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wa_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID UNIQUE NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  instance_name   TEXT,
  webhook_url     TEXT,
  prompt_sistema  TEXT,
  nome_agente     TEXT DEFAULT 'Luna',
  modelo_ia       TEXT DEFAULT 'claude-haiku-4-5-20251001',
  follow_up_horas INT DEFAULT 24,
  ativo           BOOLEAN DEFAULT FALSE,
  creditos_usd    NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICAÇÕES ─────────────────────────────────────────────
CREATE TABLE notificacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  corpo       TEXT,
  tipo        TEXT DEFAULT 'info', -- info | alerta | erro
  lida        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONFIGURAÇÕES DA EMPRESA ──────────────────────────────────
CREATE TABLE empresa_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID UNIQUE NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome_display        TEXT,
  logo_url            TEXT,
  cor_primaria        TEXT DEFAULT '#4f46e5',
  responsavel         TEXT,
  cnpj_cpf            TEXT,
  pct_maquineta       NUMERIC(5,2) DEFAULT 2.99,
  pct_imposto_mei     NUMERIC(5,2) DEFAULT 0,
  pct_imposto_simples NUMERIC(5,2) DEFAULT 6,
  contexto_historia   TEXT,
  contexto_hoje       TEXT,
  contexto_futuro     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── USO DE IA ────────────────────────────────────────────────
CREATE TABLE agente_uso (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  agente_slug  TEXT NOT NULL,
  input_tokens  INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS — Row Level Security
-- Cada empresa só vê seus próprios dados
-- ============================================================

ALTER TABLE empresas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissional_disponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_opcoes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_config               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_mensagens                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_config                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_config              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agente_uso                  ENABLE ROW LEVEL SECURITY;

-- Política base: anon e authenticated têm acesso total por empresa
-- (o controle de empresa_id virá via sessão quando implementar auth)
-- Por ora: acesso aberto para desenvolvimento

CREATE POLICY "allow_all" ON empresas                     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON usuarios                     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON clientes                     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON profissionais                FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON profissional_disponibilidades FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON servicos                     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON produtos                     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON agenda                       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON avaliacoes                   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON avaliacao_opcoes             FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON orcamentos                   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON orcamento_itens              FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON lancamentos                  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON custos_config                FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON wa_conversas                 FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON wa_mensagens                 FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON wa_config                    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON notificacoes                 FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON empresa_config               FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON agente_uso                   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME
-- ============================================================

ALTER TABLE clientes                    REPLICA IDENTITY FULL;
ALTER TABLE agenda                      REPLICA IDENTITY FULL;
ALTER TABLE wa_conversas                REPLICA IDENTITY FULL;
ALTER TABLE wa_mensagens                REPLICA IDENTITY FULL;
ALTER TABLE lancamentos                 REPLICA IDENTITY FULL;
ALTER TABLE notificacoes                REPLICA IDENTITY FULL;
ALTER TABLE custos_config               REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  clientes, agenda, wa_conversas, wa_mensagens,
  lancamentos, notificacoes, custos_config;

-- ============================================================
-- EMPRESA INICIAL (para desenvolvimento/testes)
-- ============================================================

INSERT INTO empresas (id, nome, slug, plano, modulos, regime_fiscal)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Minha Empresa',
  'minha-empresa',
  'gestao_luna',
  '{gestao,luna_atendimento}',
  'mei'
);

INSERT INTO empresa_config (empresa_id, nome_display, cor_primaria)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Minha Empresa',
  '#4f46e5'
);

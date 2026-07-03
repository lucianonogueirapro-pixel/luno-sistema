-- ============================================================
-- 023 — wa_config: adiciona colunas da integração Evolution API
-- A tabela existia com schema de LLM/chatbot genérico.
-- Adicionamos as colunas específicas do WhatsApp/Evolution API.
-- ============================================================

ALTER TABLE wa_config
  ADD COLUMN IF NOT EXISTS api_url              text,
  ADD COLUMN IF NOT EXISTS api_key              text,
  ADD COLUMN IF NOT EXISTS webhook_token        text,
  ADD COLUMN IF NOT EXISTS auto_responder       boolean   DEFAULT true,
  ADD COLUMN IF NOT EXISTS followup_delay_horas integer   DEFAULT 24,
  ADD COLUMN IF NOT EXISTS followup2_horas      integer,
  ADD COLUMN IF NOT EXISTS followup3_horas      integer,
  ADD COLUMN IF NOT EXISTS prompt_laura         text,
  ADD COLUMN IF NOT EXISTS modelo_laura         text,
  ADD COLUMN IF NOT EXISTS horario_inicio       text,
  ADD COLUMN IF NOT EXISTS horario_fim          text,
  ADD COLUMN IF NOT EXISTS sabado_ativo         boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS sabado_inicio        text,
  ADD COLUMN IF NOT EXISTS sabado_fim           text,
  ADD COLUMN IF NOT EXISTS duracao_avaliacao_min integer,
  ADD COLUMN IF NOT EXISTS slots_antecipacao_dias integer,
  ADD COLUMN IF NOT EXISTS nome                 text,
  ADD COLUMN IF NOT EXISTS tag_padrao           text,
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz DEFAULT now();

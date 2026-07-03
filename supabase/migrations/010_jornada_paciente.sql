-- 010_jornada_paciente.sql
-- Suporte à jornada completa: agenda paga, protocolos nomeados, roles, notificações internas

-- ── 1. Agenda: consulta paga/gratuita ────────────────────────────────────────
ALTER TABLE agenda
  ADD COLUMN IF NOT EXISTS consulta_paga boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_consulta numeric(10,2);

-- ── 2. Avaliação: nível e marcador recomendado por opção ─────────────────────
ALTER TABLE avaliacao_opcoes
  ADD COLUMN IF NOT EXISTS nivel text CHECK (nivel IN ('completo','intermediario','basico')),
  ADD COLUMN IF NOT EXISTS recomendado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS desconto_sugerido numeric(5,2);

-- ── 3. Roles em profiles ──────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text
    CHECK (role IN ('admin','dra','comercial','recepcao'))
    NOT NULL DEFAULT 'admin';

-- ── 4. Tabela de notificações internas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  para_role     text NOT NULL CHECK (para_role IN ('admin','dra','comercial','recepcao')),
  tipo          text NOT NULL,
  titulo        text NOT NULL,
  corpo         text,
  referencia_id uuid,
  referencia_tipo text,
  lida          boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'auth notificacoes'
  ) THEN
    CREATE POLICY "auth notificacoes" ON notificacoes FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- MIGRATION 021 — Pendentes
-- Executar no Supabase SQL Editor
-- Todas usam IF NOT EXISTS — seguro rodar mesmo se parcialmente aplicado
-- ============================================================

-- ── 1. paciente_id em lancamentos ───────────────────────────
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lancamentos_paciente_id ON lancamentos(paciente_id);

-- ── 2. Etiquetas no WhatsApp (kanban) ───────────────────────
ALTER TABLE wa_conversas
  ADD COLUMN IF NOT EXISTS etiquetas text[] DEFAULT '{}';

-- ── 3. Tarefas CRM ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_tarefas (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id     uuid REFERENCES prontuario_consultas(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  data_vencimento date,
  responsavel     text,
  concluida       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_tarefas_consulta ON crm_tarefas(consulta_id);

ALTER TABLE crm_tarefas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_tarefas' AND policyname = 'auth crm_tarefas'
  ) THEN
    CREATE POLICY "auth crm_tarefas" ON crm_tarefas
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ── 4. Campo registro_profissional na clinica_config ────────
-- (se a coluna dados for jsonb, não precisa de ALTER TABLE)
-- Usado no receituário para exibir CRO/CRF da profissional

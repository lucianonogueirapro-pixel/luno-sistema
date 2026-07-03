-- ============================================================
-- 022 — WhatsApp multi-tenant: adiciona empresa_id
-- ============================================================

-- wa_config: cada empresa tem sua própria config de WhatsApp
ALTER TABLE wa_config
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;

UPDATE wa_config
  SET empresa_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  WHERE empresa_id IS NULL;

-- wa_conversas: conversas pertencem a uma empresa
ALTER TABLE wa_conversas
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;

UPDATE wa_conversas
  SET empresa_id = 'aaaaaaaa-0000-0000-0000-000000000001'
  WHERE empresa_id IS NULL;

-- Remove unicidade global do telefone (mesmo número pode contatar empresas distintas)
ALTER TABLE wa_conversas DROP CONSTRAINT IF EXISTS wa_conversas_telefone_key;

-- Unicidade composta: empresa + telefone
CREATE UNIQUE INDEX IF NOT EXISTS wa_conversas_empresa_telefone_idx
  ON wa_conversas (empresa_id, telefone);

-- Índice para o webhook roteiar por instance_name
CREATE INDEX IF NOT EXISTS wa_config_instance_name_idx
  ON wa_config (instance_name)
  WHERE instance_name IS NOT NULL;

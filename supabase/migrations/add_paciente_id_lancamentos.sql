-- Adicionar paciente_id à tabela lancamentos para vincular entradas a pacientes
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lancamentos_paciente_id ON lancamentos(paciente_id);

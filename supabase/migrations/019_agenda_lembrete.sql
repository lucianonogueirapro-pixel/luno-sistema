-- Rastreamento de envio de lembrete por agendamento
ALTER TABLE agenda
  ADD COLUMN IF NOT EXISTS lembrete_enviado_at timestamptz;

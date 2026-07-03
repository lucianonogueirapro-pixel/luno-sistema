-- Habilitar Realtime nas tabelas do feed
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wa_conversas;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger: novo lead chegou no WhatsApp
CREATE OR REPLACE FUNCTION fn_notify_novo_lead() RETURNS trigger AS $$
BEGIN
  INSERT INTO notificacoes (para_role, tipo, titulo, corpo, referencia_id, referencia_tipo)
  VALUES ('admin', 'crm_lead', 'CRM: novo lead', COALESCE(NEW.nome, NEW.telefone), NEW.id, 'wa_conversa');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_novo_lead ON wa_conversas;
CREATE TRIGGER trg_notify_novo_lead
  AFTER INSERT ON wa_conversas
  FOR EACH ROW EXECUTE FUNCTION fn_notify_novo_lead();

-- Trigger: Laura mudou status (respondeu / qualificou)
CREATE OR REPLACE FUNCTION fn_notify_laura_status() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'em_atendimento' AND OLD.status != 'em_atendimento' THEN
    INSERT INTO notificacoes (para_role, tipo, titulo, corpo, referencia_id, referencia_tipo)
    VALUES ('admin', 'laura_resposta', 'Laura respondeu ' || COALESCE(NEW.nome, NEW.telefone), NULL, NEW.id, 'wa_conversa');
  ELSIF NEW.status = 'qualificado' AND OLD.status != 'qualificado' THEN
    INSERT INTO notificacoes (para_role, tipo, titulo, corpo, referencia_id, referencia_tipo)
    VALUES ('admin', 'crm_qualificado', 'Lead qualificado: ' || COALESCE(NEW.nome, NEW.telefone), NULL, NEW.id, 'wa_conversa');
  ELSIF NEW.status = 'agendado' AND OLD.status != 'agendado' THEN
    INSERT INTO notificacoes (para_role, tipo, titulo, corpo, referencia_id, referencia_tipo)
    VALUES ('admin', 'agenda_nova', 'Consulta agendada: ' || COALESCE(NEW.nome, NEW.telefone), NULL, NEW.id, 'wa_conversa');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_laura_status ON wa_conversas;
CREATE TRIGGER trg_notify_laura_status
  AFTER UPDATE ON wa_conversas
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION fn_notify_laura_status();

-- Trigger: nova consulta criada direto na agenda
CREATE OR REPLACE FUNCTION fn_notify_agenda_criada() RETURNS trigger AS $$
DECLARE v_nome text;
BEGIN
  SELECT p.nome INTO v_nome FROM pacientes p WHERE p.id = NEW.paciente_id;
  INSERT INTO notificacoes (para_role, tipo, titulo, corpo, referencia_id, referencia_tipo)
  VALUES ('admin', 'agenda_nova', 'Agenda: ' || NEW.tipo || ' agendada', COALESCE(v_nome, ''), NEW.id, 'agenda');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_agenda_criada ON agenda;
CREATE TRIGGER trg_notify_agenda_criada
  AFTER INSERT ON agenda
  FOR EACH ROW EXECUTE FUNCTION fn_notify_agenda_criada();

-- Trigger: consulta confirmada
CREATE OR REPLACE FUNCTION fn_notify_agenda_confirmada() RETURNS trigger AS $$
DECLARE v_nome text;
BEGIN
  IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
    SELECT p.nome INTO v_nome FROM pacientes p WHERE p.id = NEW.paciente_id;
    INSERT INTO notificacoes (para_role, tipo, titulo, corpo, referencia_id, referencia_tipo)
    VALUES ('admin', 'agenda_confirmada', 'Agenda: consulta confirmada', COALESCE(v_nome, ''), NEW.id, 'agenda');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_agenda_confirmada ON agenda;
CREATE TRIGGER trg_notify_agenda_confirmada
  AFTER UPDATE ON agenda
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION fn_notify_agenda_confirmada();

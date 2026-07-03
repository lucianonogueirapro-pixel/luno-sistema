-- ============================================================
-- 016 — WhatsApp Atendimento
-- ============================================================

-- Conversas: uma linha por lead/contato
CREATE TABLE IF NOT EXISTS wa_conversas (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone            text        NOT NULL UNIQUE,
  nome                text,
  status              text        NOT NULL DEFAULT 'novo'
                      CHECK (status IN ('novo','em_atendimento','qualificado','agendado','nao_respondeu','perdido','convertido')),
  perfil              text        CHECK (perfil IN ('preventivo','corretivo','experiente')),
  canal               text        NOT NULL DEFAULT 'whatsapp',
  agente_slug         text        NOT NULL DEFAULT 'comercial-laura',
  origem              text,         -- 'anuncio_instagram', 'indicacao', 'organico'
  notas               text,
  followup_em         timestamptz,
  followup_enviado    boolean     DEFAULT false,
  ultima_mensagem_at  timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Mensagens de cada conversa
CREATE TABLE IF NOT EXISTS wa_mensagens (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id uuid    NOT NULL REFERENCES wa_conversas(id) ON DELETE CASCADE,
  direcao     text    NOT NULL CHECK (direcao IN ('entrada','saida')),
  tipo        text    NOT NULL DEFAULT 'texto'
              CHECK (tipo IN ('texto','imagem','audio','video','documento','sticker')),
  conteudo    text,
  media_url   text,
  message_id  text    UNIQUE,   -- ID da Evolution API (dedup)
  enviado     boolean DEFAULT false,
  lido        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Configuração da integração Evolution API (uma linha)
CREATE TABLE IF NOT EXISTS wa_config (
  id                    uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  api_url               text,
  api_key               text,
  instance_name         text,
  webhook_token         text,   -- token para validar requisições do webhook
  ativo                 boolean DEFAULT false,
  prompt_laura          text,   -- prompt customizável da Laura
  followup_delay_horas  integer DEFAULT 24,
  auto_responder        boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS wa_mensagens_conversa_id_idx ON wa_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS wa_mensagens_created_at_idx  ON wa_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS wa_conversas_telefone_idx    ON wa_conversas(telefone);
CREATE INDEX IF NOT EXISTS wa_conversas_status_idx      ON wa_conversas(status);
CREATE INDEX IF NOT EXISTS wa_conversas_followup_idx    ON wa_conversas(followup_em)
  WHERE followup_em IS NOT NULL AND followup_enviado = false;
CREATE INDEX IF NOT EXISTS wa_conversas_ultima_msg_idx  ON wa_conversas(ultima_mensagem_at DESC);

-- RLS
ALTER TABLE wa_conversas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_mensagens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_config     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_users_conversas"  ON wa_conversas;
DROP POLICY IF EXISTS "auth_users_mensagens"  ON wa_mensagens;
DROP POLICY IF EXISTS "auth_users_wa_config"  ON wa_config;

CREATE POLICY "auth_users_conversas"  ON wa_conversas  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_users_mensagens"  ON wa_mensagens  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_users_wa_config"  ON wa_config     FOR ALL USING (auth.role() = 'authenticated');

-- Webhook pode inserir sem auth (service role via API route)
-- (a rota usa supabase service role, não precisa de policy especial)

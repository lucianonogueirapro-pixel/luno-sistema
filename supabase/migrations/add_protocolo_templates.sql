-- Protocolos como templates de gestão (combos de procedimentos)
-- Rodar no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS protocolo_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  descricao     TEXT,
  nivel         TEXT CHECK (nivel IN ('completo', 'intermediario', 'basico')),
  preco_tabela  NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_protocolo NUMERIC(12,2) NOT NULL DEFAULT 0,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS protocolo_template_procs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      UUID REFERENCES protocolo_templates(id) ON DELETE CASCADE,
  procedimento_id  UUID REFERENCES procedimentos(id) ON DELETE CASCADE,
  posicao          INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE protocolo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocolo_template_procs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem tudo" ON protocolo_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "autenticados podem tudo" ON protocolo_template_procs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

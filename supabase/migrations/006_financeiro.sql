-- ── 006_financeiro.sql
-- Módulo Financeiro: Lançamentos, Custos, Obra, Empréstimo, Config

-- Lançamentos mensais (entradas e saídas)
CREATE TABLE lancamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mes text NOT NULL,                      -- '2026-06'
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  -- Entradas (procedimentos)
  data_lancamento date,
  descricao text,
  valor_bruto numeric(10,2) DEFAULT 0,
  forma_pagamento text DEFAULT 'pix',     -- dinheiro, pix, debito, credito
  pct_maquineta numeric(5,2),             -- null = usar default do config
  pct_imposto numeric(5,2) DEFAULT 0,
  -- Saídas (custos)
  categoria text,                         -- fixo, variavel, emergencia
  valor_previsto numeric(10,2) DEFAULT 0,
  valor_real numeric(10,2),
  dia_vencimento int,
  status text DEFAULT 'pend',             -- pend, pago
  ref_id text,                            -- ref a custos_config.id
  obs text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth lancamentos" ON lancamentos
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Configuração de custos fixos, variáveis e emergência
CREATE TABLE custos_config (
  id text PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('fixo', 'variavel', 'emergencia')),
  descricao text NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  dia_vencimento int,
  estimado boolean DEFAULT false,
  ativo boolean DEFAULT true,
  posicao int DEFAULT 0
);

ALTER TABLE custos_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth custos_config" ON custos_config
  FOR ALL USING (auth.uid() IS NOT NULL);

INSERT INTO custos_config (id, tipo, descricao, valor, dia_vencimento, estimado, posicao) VALUES
  ('f1', 'fixo', 'Aluguel', 2000, 30, false, 1),
  ('f2', 'fixo', 'Internet + Celular', 140, 10, true, 2),
  ('f3', 'fixo', 'Chatbot', 120, 10, false, 3),
  ('f4', 'fixo', 'IA Marketing', 90, 10, false, 4),
  ('f5', 'fixo', 'Parcela Empréstimo', 1682.58, 15, false, 5),
  ('f6', 'fixo', 'Dedetização', 180, 5, true, 6),
  ('f7', 'fixo', 'Sistema Facial A&D', 90, 10, false, 7),
  ('f8', 'fixo', 'Gestão de Resíduos', 225, 10, true, 8),
  ('v1', 'variavel', 'Tráfego Pago', 1500, 1, false, 1),
  ('v2', 'variavel', 'Energia Elétrica', 350, 15, false, 2),
  ('v3', 'variavel', 'Água e Esgoto', 80, 20, false, 3),
  ('v4', 'variavel', 'Cápsula de Café', 60, null, false, 4),
  ('v5', 'variavel', 'Material de Limpeza', 100, null, false, 5),
  ('v6', 'variavel', 'Material de Escritório', 100, null, false, 6),
  ('e1', 'emergencia', 'Manutenção Ar Cond.', 70, null, false, 1),
  ('e2', 'emergencia', 'Manutenção Geral', 80, null, false, 2);

-- Obra / Investimento
CREATE TABLE obra_categorias (
  id text PRIMARY KEY,
  nome text NOT NULL,
  posicao int DEFAULT 0
);

ALTER TABLE obra_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth obra_categorias" ON obra_categorias
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE obra_itens (
  id text PRIMARY KEY,
  categoria_id text REFERENCES obra_categorias(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor_projetado numeric(10,2) DEFAULT 0,
  valor_real numeric(10,2) DEFAULT 0,
  pago boolean DEFAULT false,
  retorno boolean DEFAULT false,
  posicao int DEFAULT 0
);

ALTER TABLE obra_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth obra_itens" ON obra_itens
  FOR ALL USING (auth.uid() IS NOT NULL);

INSERT INTO obra_categorias (id, nome, posicao) VALUES
  ('oc0', 'Locação — Entrada (30/03)', 0),
  ('oc1', 'ADM & Legal', 1),
  ('oc2', 'Reforma', 2),
  ('oc3', 'Equipamentos & Mobiliário', 3),
  ('oc4', 'Inauguração — 11/05/2026', 4),
  ('oc5', 'Marketing de Lançamento', 5);

INSERT INTO obra_itens (id, categoria_id, descricao, valor_projetado, valor_real, pago, retorno, posicao) VALUES
  ('il01', 'oc0', 'Caução — retorna no último mês', 2000, 2000, true, true, 0),
  ('il02', 'oc0', 'Aluguel Junho pré-pago', 2000, 2000, true, false, 1),
  ('il03', 'oc0', 'Locação Abril — carência R$200', 200, 0, false, false, 2),
  ('il04', 'oc0', 'Locação Maio — carência R$200', 200, 0, false, false, 3),
  ('i101', 'oc1', 'Identidade Visual', 400, 0, false, false, 0),
  ('i102', 'oc1', 'Hospedagem Site — Anual', 190, 0, false, false, 1),
  ('i103', 'oc1', 'Abertura CNPJ, Alvará, Inscrição Estadual', 1100, 0, false, false, 2),
  ('i201', 'oc2', 'Projeto Arquitetônico', 850, 0, false, false, 0),
  ('i202', 'oc2', 'Fachada Loja', 7500, 0, false, false, 1),
  ('i203', 'oc2', 'Gesso / Dry Wall / Divisórias', 3000, 0, false, false, 2),
  ('i204', 'oc2', 'Portas de Vidro', 2900, 0, false, false, 3),
  ('i205', 'oc2', 'Insumos para Pintura', 1500, 0, false, false, 4),
  ('i206', 'oc2', 'Mão de Obra — Pintura', 1100, 0, false, false, 5),
  ('i207', 'oc2', 'Instalação Elétrica — Insumos', 800, 0, false, false, 6),
  ('i208', 'oc2', 'Eletricista — Mão de Obra', 900, 0, false, false, 7),
  ('i209', 'oc2', 'Itens Instagramáveis', 3800, 0, false, false, 8),
  ('i210', 'oc2', 'Reserva Imprevistos', 1300, 0, false, false, 9),
  ('i211', 'oc2', 'Decoração Banheiro', 1300, 0, false, false, 10),
  ('i301', 'oc3', 'Maca Elétrica / Cadeira Procedimento', 3500, 0, false, false, 0),
  ('i302', 'oc3', 'Carrinho Técnico Inox', 800, 0, false, false, 1),
  ('i303', 'oc3', 'Refletor LED', 600, 0, false, false, 2),
  ('i304', 'oc3', 'Autoclave', 2500, 0, false, false, 3),
  ('i305', 'oc3', 'Ar Condicionado', 3500, 0, false, false, 4),
  ('i306', 'oc3', 'Notebook / Computador', 2500, 0, false, false, 5),
  ('i307', 'oc3', 'Impressora Multifuncional', 800, 0, false, false, 6),
  ('i308', 'oc3', 'Mesas e Cadeiras Recepção', 1200, 0, false, false, 7),
  ('i309', 'oc3', 'Sofá Recepção', 1800, 0, false, false, 8),
  ('i310', 'oc3', 'Balcão Recepção', 1500, 0, false, false, 9),
  ('i311', 'oc3', 'Cadeira Dra. Sarah', 750, 0, false, false, 10),
  ('i312', 'oc3', 'Lixeira com Pedal', 300, 0, false, false, 11),
  ('i313', 'oc3', 'Foco de Luz', 150, 0, false, false, 12),
  ('i314', 'oc3', 'Tapete Antes e Depois', 300, 0, false, false, 13),
  ('i315', 'oc3', 'Fundo Antes e Depois', 150, 0, false, false, 14),
  ('i316', 'oc3', 'Espelho Total', 350, 0, false, false, 15),
  ('i317', 'oc3', 'Espelhos de Mesa', 350, 0, false, false, 16),
  ('i318', 'oc3', 'Itens de Decoração', 1800, 0, false, false, 17),
  ('i319', 'oc3', 'Faixa Personalizada', 50, 0, false, false, 18),
  ('i401', 'oc4', 'Evento de Inauguração', 2000, 0, false, false, 0),
  ('i402', 'oc4', 'Material de Divulgação', 500, 0, false, false, 1),
  ('i403', 'oc4', 'Brindes e Kit Boas-Vindas', 300, 0, false, false, 2),
  ('i501', 'oc5', 'Tráfego Pago — Lançamento', 2000, 0, false, false, 0),
  ('i502', 'oc5', 'Produção de Conteúdo Inicial', 1000, 0, false, false, 1);

-- Parcelas do empréstimo (96x de 15/05/2026, valor R$1.682,58)
CREATE TABLE emprestimo_parcelas (
  numero int PRIMARY KEY CHECK (numero BETWEEN 1 AND 96),
  data_vencimento date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 1682.58,
  pago boolean DEFAULT false
);

ALTER TABLE emprestimo_parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth emprestimo_parcelas" ON emprestimo_parcelas
  FOR ALL USING (auth.uid() IS NOT NULL);

INSERT INTO emprestimo_parcelas (numero, data_vencimento, valor)
SELECT
  i,
  ('2026-05-15'::date + ((i - 1) * INTERVAL '1 month'))::date,
  1682.58
FROM generate_series(1, 96) AS i;

-- Config financeiro (singleton row id=1)
CREATE TABLE config_financeiro (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fc_inicial numeric(10,2) DEFAULT 14000,
  aliq_simples numeric(5,2) DEFAULT 6.0,
  pct_dinheiro numeric(5,2) DEFAULT 0,
  pct_pix numeric(5,2) DEFAULT 0,
  pct_debito numeric(5,2) DEFAULT 1.5,
  pct_credito numeric(5,2) DEFAULT 2.99,
  reserva_acumulada numeric(10,2) DEFAULT 0
);

ALTER TABLE config_financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth config_financeiro" ON config_financeiro
  FOR ALL USING (auth.uid() IS NOT NULL);

INSERT INTO config_financeiro (id) VALUES (1);

-- Metas mensais de receita
CREATE TABLE metas_mensais (
  mes text PRIMARY KEY,
  meta numeric(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE metas_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth metas_mensais" ON metas_mensais
  FOR ALL USING (auth.uid() IS NOT NULL);

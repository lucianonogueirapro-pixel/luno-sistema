-- 008_sync_obra_custos.sql
-- Sincroniza dados reais do sistema HTML (localStorage backup de 28/05/2026)

-- ——— Atualizar config_financeiro ———
UPDATE config_financeiro SET fc_inicial = 16000 WHERE id = 1;

-- ——— Sincronizar custos_config com estado real ———
-- Remover itens desativados/removidos pelo usuário
DELETE FROM custos_config WHERE id IN ('f4', 'v1'); -- IA Marketing e Tráfego Pago removidos

-- Atualizar valores reais
UPDATE custos_config SET valor = 90,   dia_vencimento = 10 WHERE id = 'f3'; -- Chatbot
UPDATE custos_config SET valor = 1682.58, dia_vencimento = 13 WHERE id = 'f5'; -- Parcela dia 13
UPDATE custos_config SET valor = 240.87, estimado = false WHERE id = 'f8'; -- Gestão Resíduos
UPDATE custos_config SET estimado = false WHERE id = 'f2'; -- Internet + Celular confirmado

-- Inserir novos custos adicionados pelo usuário
INSERT INTO custos_config (id, tipo, descricao, valor, dia_vencimento, estimado, posicao)
VALUES
  ('mn6deuqsrha', 'fixo', 'Seguro Incêndio', 0, 12, true, 9),
  ('mn6ghqgq6rd', 'fixo', 'Combustível e Ajuda de Custo', 780, 2, false, 10)
ON CONFLICT (id) DO NOTHING;

-- ——— Sincronizar obra com estado real ———
-- Limpar tudo e re-inserir com dados reais atualizados
DELETE FROM obra_itens;
DELETE FROM obra_categorias;

-- Categorias (na ordem do HTML)
INSERT INTO obra_categorias (id, nome, posicao) VALUES
  ('oc0', 'Locação — Entrada (30/03)', 0),
  ('oc1', 'ADM & Legal', 1),
  ('oc2', 'Reforma', 2),
  ('oc3', 'Equipamentos & Mobiliário', 3),
  ('oc4', 'Inauguração — 11/05/2026', 4),
  ('oc5', 'Marketing de Lançamento', 5),
  ('mn6gv5474ln', 'Equipamentos MKT', 6),
  ('mnc9nde1xqj', 'Recepção | Mobiliário | Lustre | Decoração', 7),
  ('mnc9ygdfqxy', 'Banheiro | Pré e Interno', 8);

-- Itens com valores reais (conforme backup do sistema HTML)
INSERT INTO obra_itens (id, categoria_id, descricao, valor_projetado, valor_real, pago, retorno, posicao) VALUES
  -- Locação
  ('il01', 'oc0', 'Caução — retorna no último mês', 2000, 2000, true,  true,  0),

  -- ADM & Legal
  ('i101', 'oc1', 'Identidade Visual',                          0,      0,      false, false, 0),
  ('i102', 'oc1', 'Hospedagem Site — Anual',                    153.68, 153.68, true,  false, 1),
  ('i103', 'oc1', 'Abertura CNPJ, Alvará, Inscrição Estadual',  500,    500,    false, false, 2),

  -- Reforma
  ('i201', 'oc2', 'Projeto Arquitetônico 1/2',          850,   1000, true,  false, 0),
  ('i202', 'oc2', 'Fachada Loja',                       5000,  0,    false, false, 1),
  ('i203', 'oc2', 'Insumos Gesso / Dry Wall / Divisórias', 3000, 0,  false, false, 2),
  ('i204', 'oc2', 'Mão de Obra 01',                     3.5,   3500, false, false, 3),
  ('i205', 'oc2', 'Insumos para Pintura',                1500,  0,    false, false, 4),
  ('i206', 'oc2', 'Mão de Obra Gesso',                  1100,  0,    false, false, 5),
  ('i207', 'oc2', 'Insumos Instalação Elétrica',        800,   0,    false, false, 6),
  ('i208', 'oc2', 'Eletricista — Mão de Obra',          0,     0,    false, false, 7),
  ('i209', 'oc2', 'Itens Instagramáveis',               3800,  0,    false, false, 8),
  ('i210', 'oc2', 'Reserva Imprevistos',                1300,  0,    false, false, 9),
  ('i211', 'oc2', 'Decoração Banheiro',                 1300,  0,    false, false, 10),
  ('mn5dumz8wyr', 'oc2', 'Projeto Arquitetônico 2/2',  1000,  1000, false, false, 11),

  -- Equipamentos & Mobiliário
  ('i301', 'oc3', 'Maca Elétrica / Cadeira Procedimento', 3500, 5200, true,  false, 0),
  ('i302', 'oc3', 'Carrinho Técnico Inox',              800,   800,  false, false, 1),
  ('i303', 'oc3', 'Refletor LED',                       600,   0,    false, false, 2),
  ('i304', 'oc3', 'Autoclave',                          2500,  0,    false, false, 3),
  ('i306', 'oc3', 'Ar Condicionado Consultório',        1900,  1900, false, false, 4),
  ('i311', 'oc3', 'Cadeira Dra. Sarah',                 752,   0,    false, false, 5),
  ('i312', 'oc3', 'Lixeira com Pedal',                  300,   0,    false, false, 6),
  ('i313', 'oc3', 'Foco de Luz',                        150,   0,    false, false, 7),
  ('i314', 'oc3', 'Tapete Antes e Depois',              300,   0,    false, false, 8),
  ('i315', 'oc3', 'Fundo Antes e Depois',               150,   0,    false, false, 9),
  ('i316', 'oc3', 'Espelho Total',                      350,   0,    false, false, 10),
  ('i318', 'oc3', 'Itens de Decoração',                 0,     0,    false, false, 11),
  ('i319', 'oc3', 'Faixa Personalizada',                50,    0,    false, false, 12),

  -- Inauguração
  ('i401', 'oc4', 'Evento de Inauguração',              2000,  0,    false, false, 0),
  ('i402', 'oc4', 'Material de Divulgação',             500,   0,    false, false, 1),
  ('i403', 'oc4', 'Brindes e Kit Boas-Vindas',          300,   0,    false, false, 2),

  -- Marketing de Lançamento
  ('i501', 'oc5', 'Tráfego Pago — Lançamento',          2000,  0,    false, false, 0),
  ('i502', 'oc5', 'Produção de Conteúdo Inicial',       1000,  0,    false, false, 1),

  -- Equipamentos MKT
  ('mn6h5ygf32w', 'mn6gv5474ln', 'Microfone Sem Fio',       300,   0, false, false, 0),
  ('mn6hb0rag46', 'mn6gv5474ln', 'Iluminação LED — Vídeos', 273.9, 0, false, false, 1),

  -- Recepção | Mobiliário
  ('mnc9og86bj0', 'mnc9nde1xqj', 'Ar Condicionado Recepção',        2800, 0, false, false, 0),
  ('mnc9ovabs8v', 'mnc9nde1xqj', 'Impressora Multifuncional',        450,  0, false, false, 1),
  ('mnc9pa54uti', 'mnc9nde1xqj', 'Poltrona Recepção',                650,  0, false, false, 2),
  ('mnc9pkb8ekt', 'mnc9nde1xqj', 'Sofá Recepção',                    850,  0, false, false, 3),
  ('mnc9q5qj1mo', 'mnc9nde1xqj', 'Balcão Marcenaria Recepção',       1600, 0, false, false, 4),
  ('mnc9qi8jei7', 'mnc9nde1xqj', 'Cadeira Luciano — Recepção',       650,  0, false, false, 5),
  ('mnc9s4p5auv', 'mnc9nde1xqj', 'Lustre',                           450,  0, false, false, 6),
  ('mnc9sab0p5c', 'mnc9nde1xqj', 'Tapete Orgânico',                  450,  0, false, false, 7),
  ('mnc9t20rkkb', 'mnc9nde1xqj', 'Bancada de Apoio Sofá e Cadeiras', 150,  0, false, false, 8),
  ('mnc9tirxdwu', 'mnc9nde1xqj', 'Cafeteira',                        690,  0, false, false, 9),

  -- Banheiro | Pré e Interno
  ('mnc9zasujt0', 'mnc9ygdfqxy', 'Pedras Parede',         500,  0, false, false, 0),
  ('mnc9zikj1vv', 'mnc9ygdfqxy', 'Espelho Parede',        600,  0, false, false, 1),
  ('mnca0ebmrkj', 'mnc9ygdfqxy', 'Balcão de Mármore',     1500, 0, false, false, 2),
  ('mnca0kooll0', 'mnc9ygdfqxy', 'Cuba',                  250,  0, false, false, 3),
  ('mnca0sxga2h', 'mnc9ygdfqxy', 'Torneira',              150,  0, false, false, 4),
  ('mnca19yeqr2', 'mnc9ygdfqxy', 'Lustre Externo',        150,  0, false, false, 5),
  ('mnca29xvum8', 'mnc9ygdfqxy', 'Lustre Banheiro',       190,  0, false, false, 6),
  ('mnca4ij58dq', 'mnc9ygdfqxy', 'Bacia Sanitária',       500,  0, false, false, 7);

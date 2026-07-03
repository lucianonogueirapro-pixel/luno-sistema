-- Importação de insumos da planilha Évor
-- Rodar no SQL Editor do Supabase

INSERT INTO insumos (nome, categoria, marca, fornecedor, contato, custo_atual, tiers, estoque_atual, estoque_minimo, unidade, dysport_conversao, fator_conversao, lote, data_validade)
VALUES

-- ══════════════════════════════════
-- BIOESTIMULADORES
-- ══════════════════════════════════
('Bioestimulador Elleva Rosto',
 'bioestimulador', 'Elleva', 'Rennova', '85982083117 / Armando Paraíso - Renew Saúde',
 599.00, '[{"quantidade":1,"preco_unit":599},{"quantidade":3,"preco_unit":579}]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Bioestimulador Elleva Rosto e Pescoço',
 'bioestimulador', 'Elleva', null, null,
 829.00, '[{"quantidade":1,"preco_unit":829},{"quantidade":3,"preco_unit":809}]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Bioestimulador Diomond Intense',
 'bioestimulador', null, 'Rennova', null,
 489.00, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Bioestimulador Sculptra',
 'bioestimulador', null, 'Galderma', null,
 919.00, '[{"quantidade":1,"preco_unit":919},{"quantidade":2,"preco_unit":899}]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Bioestimulador Radiesse Duo',
 'bioestimulador', null, 'Merz', null,
 779.00, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

-- ══════════════════════════════════
-- FIOS PDO
-- ══════════════════════════════════
('Fios PDO Liso I-Thread (20 fios)',
 'fios', 'I-Thread', 'Epik Estética', '86999895076',
 399.00, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Fios PDO Liso Alur (10 fios)',
 'fios', 'Alur', 'Epik Estética', '86999895076',
 239.00, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Fios PDO Filler I-Thread (20 fios)',
 'fios', 'I-Thread', 'Epik Estética', '86999895076',
 1895.32, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Fios PDO Parafuso I-Thread (20 fios)',
 'fios', 'I-Thread', 'Epik Estética', '86999895076',
 1091.50, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Fios PDO Espiculado I-Thread (20 fios)',
 'fios', 'I-Thread', 'Epik Estética', '86999895076',
 1849.07, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Fios PDO Eyebag I-Thread (20 fios)',
 'fios', 'I-Thread', 'Epik Estética', '86999895076',
 989.28, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

-- ══════════════════════════════════
-- PREENCHIMENTOS
-- ══════════════════════════════════
('Preench. Bigode Chinês/Marionete Renova 1ml',
 'preenchedor', 'Renova', 'Epik Estética', '86999895076',
 299.00, '[{"quantidade":1,"preco_unit":299},{"quantidade":10,"preco_unit":289},{"quantidade":20,"preco_unit":279}]'::jsonb,
 0, 2, 'ml', false, 1, null, null),

('Preench. Mandíbula/Malar/Mento/Prejowls Biogelis 2ml',
 'preenchedor', 'Biogelis', 'Epik Estética', '86999895076',
 519.00, '[{"quantidade":1,"preco_unit":519},{"quantidade":2,"preco_unit":499}]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Preench. Mandíbula/Malar/Mento/Prejowls Yvoire Contur 1ml',
 'preenchedor', 'Yvoire Contur', 'Epik Estética', '86999895076',
 279.00, '[{"quantidade":1,"preco_unit":279},{"quantidade":5,"preco_unit":269}]'::jsonb,
 0, 2, 'ml', false, 1, null, null),

('Preench. Mandíbula/Malar/Mento/Prejowls Yvoire Volume 1ml',
 'preenchedor', 'Yvoire Volume', null, null,
 269.00, '[{"quantidade":1,"preco_unit":269},{"quantidade":5,"preco_unit":259}]'::jsonb,
 0, 2, 'ml', false, 1, null, null),

('Preench. Mandíbula/Malar/Mento Renova 1ml',
 'preenchedor', 'Renova', null, null,
 289.00, '[{"quantidade":1,"preco_unit":289},{"quantidade":10,"preco_unit":279}]'::jsonb,
 0, 2, 'ml', false, 1, null, null),

('Preench. Olheiras Merz-Beloterro 1ml',
 'preenchedor', 'Merz-Beloterro', 'Epik Estética', '86999895076',
 249.00, '[]'::jsonb,
 0, 1, 'ml', false, 1, null, null),

('Preench. Labial Merz-Beloterro Intense 1ml',
 'preenchedor', 'Merz-Beloterro Intense', 'Epik Estética', '86999895076',
 279.00, '[]'::jsonb,
 0, 1, 'ml', false, 1, null, null),

('Preench. Lift Rinomodelação Renova 1ml',
 'preenchedor', 'Renova', 'Epik Estética', '86999895076',
 219.00, '[{"quantidade":1,"preco_unit":219},{"quantidade":5,"preco_unit":209},{"quantidade":10,"preco_unit":199}]'::jsonb,
 0, 2, 'ml', false, 1, null, null),

-- ══════════════════════════════════
-- SKINBOOSTER
-- ══════════════════════════════════
('Skinbooster Skinvive',
 'skinbooster', 'Skinvive', 'Epik Estética', null,
 549.00, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

-- ══════════════════════════════════
-- TOXINAS BOTULÍNICAS
-- ══════════════════════════════════
('Toxina Dysport 500UI (200UI efetivos)',
 'toxina', 'Dysport', 'Epik Estética', '86999895076',
 1299.00, '[]'::jsonb,
 0, 1, 'UI', true, 0.4, null, null),

('Toxina Dysport 300UI (100UI efetivos)',
 'toxina', 'Dysport', 'Epik Estética', '86999895076',
 879.00, '[]'::jsonb,
 0, 1, 'UI', true, 0.333, null, null),

('Toxina Xeomin 100UI',
 'toxina', 'Xeomin', 'Epik Estética', '86999895076',
 629.00, '[]'::jsonb,
 0, 1, 'UI', false, 1, null, null),

('Toxina Botox 50UI',
 'toxina', 'Botox', 'Epik Estética', '86999895076',
 399.00, '[]'::jsonb,
 0, 1, 'UI', false, 1, null, null),

('Toxina Botox 100UI',
 'toxina', 'Botox', 'Epik Estética', '86999895076',
 699.00, '[]'::jsonb,
 0, 1, 'UI', false, 1, null, null),

('Toxina Botox 200UI',
 'toxina', 'Botox', 'Epik Estética', '86999895076',
 1289.00, '[]'::jsonb,
 0, 1, 'UI', false, 1, null, null),

('Toxina Nabota 100UI',
 'toxina', 'Nabota', 'Epik Estética', '86999895076',
 609.00, '[]'::jsonb,
 0, 1, 'UI', false, 1, null, null),

-- ══════════════════════════════════
-- ANESTÉSICOS
-- ══════════════════════════════════
('Anestésico Lidocaína sem Vaso',
 'anestesico', null, 'Epik Estética', null,
 18.00, '[]'::jsonb,
 0, 5, 'ml', false, 1, null, null),

('Anestésico Tópico para Boca',
 'anestesico', null, null, null,
 80.00, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

-- ══════════════════════════════════
-- SERINGAS
-- ══════════════════════════════════
('Seringa Insulina Botox 0,5ml',
 'seringa', null, null, null,
 1.89, '[]'::jsonb,
 0, 20, 'un', false, 1, null, null),

('Seringa 1ml',
 'seringa', null, null, null,
 1.00, '[]'::jsonb,
 0, 10, 'un', false, 1, null, null),

('Seringa Luer Lock Resíduo Zero 1ml',
 'seringa', null, null, null,
 2.90, '[]'::jsonb,
 0, 10, 'un', false, 1, null, null),

('Seringa 3ml',
 'seringa', null, null, null,
 1.00, '[]'::jsonb,
 0, 10, 'un', false, 1, null, null),

('Seringa 5ml',
 'seringa', null, null, null,
 1.00, '[]'::jsonb,
 0, 10, 'un', false, 1, null, null),

('Seringa 10ml',
 'seringa', null, null, null,
 1.00, '[]'::jsonb,
 0, 10, 'un', false, 1, null, null),

-- ══════════════════════════════════
-- AGULHAS (preço por unidade — caixa 100 = R$19)
-- ══════════════════════════════════
('Agulha 18G',
 'agulha', null, null, null,
 0.19, '[]'::jsonb,
 0, 50, 'un', false, 1, null, null),

('Agulha 21G',
 'agulha', null, null, null,
 0.19, '[]'::jsonb,
 0, 50, 'un', false, 1, null, null),

('Agulha 22G',
 'agulha', null, null, null,
 0.19, '[]'::jsonb,
 0, 50, 'un', false, 1, null, null),

('Agulha 30G',
 'agulha', null, null, null,
 0.19, '[]'::jsonb,
 0, 50, 'un', false, 1, null, null),

-- ══════════════════════════════════
-- CÂNULAS (tiers por quantidade)
-- ══════════════════════════════════
('Cânula 22G',
 'canula', null, null, null,
 18.00, '[{"quantidade":1,"preco_unit":18},{"quantidade":10,"preco_unit":17},{"quantidade":30,"preco_unit":15},{"quantidade":60,"preco_unit":14}]'::jsonb,
 0, 10, 'un', false, 1, null, null),

('Cânula 25G',
 'canula', null, null, null,
 18.00, '[{"quantidade":1,"preco_unit":18},{"quantidade":10,"preco_unit":17},{"quantidade":30,"preco_unit":15},{"quantidade":60,"preco_unit":14}]'::jsonb,
 0, 10, 'un', false, 1, null, null),

-- ══════════════════════════════════
-- MATERIAIS
-- ══════════════════════════════════
('Torneira de Diluição 3 Vias',
 'material', null, null, null,
 6.00, '[]'::jsonb,
 0, 5, 'un', false, 1, null, null),

('Soro 0,9% 10ml',
 'material', null, null, null,
 1.49, '[{"quantidade":1,"preco_unit":1.49},{"quantidade":10,"preco_unit":1.20}]'::jsonb,
 0, 10, 'un', false, 1, null, null),

('Água para Injeção 10ml',
 'material', null, null, null,
 1.49, '[{"quantidade":1,"preco_unit":1.49},{"quantidade":10,"preco_unit":1.20}]'::jsonb,
 0, 10, 'un', false, 1, null, null),

('Álcool 70%',
 'material', null, null, null,
 12.99, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Clorexidina 2% Degermante 1L',
 'material', null, null, null,
 39.99, '[]'::jsonb,
 0, 1, 'un', false, 1, null, null),

('Gaze',          'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un',  false, 1, null, null),
('Algodão',       'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un',  false, 1, null, null),
('Luva',          'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'par', false, 1, null, null),
('Máscara',       'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un',  false, 1, null, null),
('Gorro Profissional',   'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Gorro Paciente',       'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Caneta Dermográfica',  'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Babador Descartável',  'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Pack de Gelo',         'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Removedor de Maquiagem','material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Propé',                'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Carpule Descartável',  'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Agulha para Carpule',  'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null),
('Cotonete',             'material', null, null, null, 0.00, '[]'::jsonb, 0, 0, 'un', false, 1, null, null);

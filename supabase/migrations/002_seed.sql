-- BIOESTIMULADORES
insert into insumos (nome,categoria,marca,fornecedor,contato,tiers,custo_atual,unidade) values
('Bioestimulador Rosto','bioestimulador','ELLEVA','RENNOVA','85982083117 / Armando Paraiso',
 '[{"quantidade":1,"preco_unit":599},{"quantidade":3,"preco_unit":579}]',599,'un'),
('Bioestimulador Rosto + Pescoço','bioestimulador','ELLEVA',null,null,
 '[{"quantidade":1,"preco_unit":829},{"quantidade":3,"preco_unit":809}]',829,'un'),
('Bioestimulador Diamond Intense','bioestimulador',null,'RENNOVA',null,'[]',489,'un'),
('Bioestimulador Sculptra','bioestimulador',null,'GALDERMA',null,
 '[{"quantidade":1,"preco_unit":919},{"quantidade":2,"preco_unit":899}]',919,'un'),
('Bioestimulador Radiesse Duo','bioestimulador',null,'MERZ',null,'[]',779,'un');

-- FIOS PDO
insert into insumos (nome,categoria,marca,fornecedor,contato,tiers,custo_atual,unidade) values
('Fios PDO Liso 20un','fios','I-THREAD','EPIK ESTÉTICA','86999895076','[]',399,'pacote'),
('Fios PDO Liso 10un','fios','ALUR','EPIK ESTÉTICA','86999895076','[]',239,'pacote'),
('Fios PDO Filler 20un','fios','I-THREAD','EPIK ESTÉTICA','86999895076','[]',1895.32,'pacote'),
('Fios PDO Parafuso 20un','fios','I-THREAD','EPIK ESTÉTICA','86999895076','[]',1091.50,'pacote'),
('Fios PDO Espiculado 20un','fios','I-THREAD','EPIK ESTÉTICA','86999895076','[]',1849.07,'pacote'),
('Fios PDO Eyebag 20un','fios','I-THREAD','EPIK ESTÉTICA','86999895076','[]',989.28,'pacote');

-- PREENCHEDORES
insert into insumos (nome,categoria,marca,fornecedor,contato,tiers,custo_atual,unidade) values
('Preenchedor Bigode Chinês / Marionete 1ml','preenchedor','RENOVA','EPIK ESTÉTICA','86999895076',
 '[{"quantidade":1,"preco_unit":299},{"quantidade":10,"preco_unit":289},{"quantidade":20,"preco_unit":279}]',299,'seringa'),
('Preenchedor Mandíbula 2ml Biogelis','preenchedor','BIOGELIS','EPIK ESTÉTICA','86999895076',
 '[{"quantidade":1,"preco_unit":519},{"quantidade":2,"preco_unit":499}]',519,'seringa'),
('Preenchedor Mandíbula 1ml Yvoire Contur','preenchedor','YVOIRE CONTUR','EPIK ESTÉTICA','86999895076',
 '[{"quantidade":1,"preco_unit":279},{"quantidade":5,"preco_unit":269}]',279,'seringa'),
('Preenchedor Mandíbula 1ml Yvoire Volume','preenchedor','YVOIRE VOLUME',null,null,
 '[{"quantidade":1,"preco_unit":269},{"quantidade":5,"preco_unit":259}]',269,'seringa'),
('Preenchedor Mandíbula 1ml Renova','preenchedor','RENOVA',null,null,
 '[{"quantidade":1,"preco_unit":289},{"quantidade":10,"preco_unit":279}]',289,'seringa'),
('Preenchedor Olheiras 1ml','preenchedor','MERZ-BELOTERO','EPIK ESTÉTICA','86999895076','[]',249,'seringa'),
('Preenchedor Labial 1ml','preenchedor','MERZ-BELOTERO INTENSE','EPIK ESTÉTICA','86999895076','[]',279,'seringa'),
('Preenchedor Lift Rinomodelação 1ml','preenchedor','RENOVA','EPIK ESTÉTICA','86999895076',
 '[{"quantidade":1,"preco_unit":219},{"quantidade":5,"preco_unit":209},{"quantidade":10,"preco_unit":199}]',219,'seringa');

-- SKINBOOSTER
insert into insumos (nome,categoria,marca,fornecedor,contato,tiers,custo_atual,unidade) values
('Skinbooster Skinvive','skinbooster','SKINVIVE','EPIK ESTÉTICA',null,'[]',549,'un'),
('Skinbooster Biometil','skinbooster','BIOMETIL',null,'86999895076','[]',0,'un'),
('Skinbooster Galderma','skinbooster','GALDERMA',null,'86999895076','[]',0,'un');

-- TOXINAS BOTULÍNICAS
insert into insumos (nome,categoria,marca,fornecedor,contato,tiers,custo_atual,unidade,
                     dysport_conversao,fator_conversao,estoque_minimo) values
('Toxina Botulínica Dysport 500UI','toxina','DYSPORT','EPIK ESTÉTICA','86999895076',
 '[]',1299,'frasco',true,0.4,0),
('Toxina Botulínica Dysport 300UI','toxina','DYSPORT','EPIK ESTÉTICA','86999895076',
 '[]',879,'frasco',true,0.3333,0),
('Toxina Botulínica Xeomin 100UI','toxina','XEOMIN','EPIK ESTÉTICA','86999895076',
 '[]',629,'frasco',false,1,0),
('Toxina Botulínica Botox 100UI','toxina','BOTOX','EPIK ESTÉTICA','86999895076',
 '[]',699,'frasco',false,1,0),
('Toxina Botulínica Botox 200UI','toxina','BOTOX','EPIK ESTÉTICA','86999895076',
 '[]',1289,'frasco',false,1,0),
('Toxina Botulínica Botox 50UI','toxina','BOTOX','EPIK ESTÉTICA','86999895076',
 '[]',399,'frasco',false,1,0),
('Toxina Botulínica Nabota 100UI','toxina','NABOTA','EPIK ESTÉTICA','86999895076',
 '[]',609,'frasco',false,1,0);

-- ANESTÉSICO
insert into insumos (nome,categoria,marca,fornecedor,contato,tiers,custo_atual,unidade) values
('Anestésico Lidocaína sem vaso','anestesico',null,'EPIK ESTÉTICA',null,'[]',18,'ampola'),
('Anestésico Lidocaína com vaso','anestesico',null,null,null,'[]',0,'ampola');

-- SERINGAS
insert into insumos (nome,categoria,tiers,custo_atual,unidade) values
('Seringa Insulina Botox 0,5ml (pacote 10un)','seringa','[]',18.90,'pacote'),
('Seringa Luer Lock Resíduo Zero 1ml','seringa','[]',2.90,'un'),
('Seringa 3ml','seringa','[]',0,'un'),
('Seringa 5ml','seringa','[]',0,'un'),
('Seringa 10ml','seringa','[]',0,'un');

-- AGULHAS
insert into insumos (nome,categoria,tiers,custo_atual,unidade) values
('Agulha 18G (cx 100un)','agulha','[]',19,'cx'),
('Agulha 21G (cx 100un)','agulha','[]',19,'cx'),
('Agulha 22G (cx 100un)','agulha','[]',19,'cx'),
('Agulha 30G (cx 100un)','agulha','[]',19,'cx');

-- DILUIÇÃO E SUPORTE
insert into insumos (nome,categoria,tiers,custo_atual,unidade) values
('Torneira de Diluição 3 vias','material','[]',6,'un'),
('Soro 0,9% 10ml','material',
 '[{"quantidade":1,"preco_unit":1.49},{"quantidade":10,"preco_unit":1.199}]',1.49,'ampola'),
('Água para Injeção 10ml','material',
 '[{"quantidade":1,"preco_unit":1.49},{"quantidade":10,"preco_unit":1.199}]',1.49,'ampola');

-- CÂNULAS
insert into insumos (nome,categoria,tiers,custo_atual,unidade) values
('Cânula 22G','canula',
 '[{"quantidade":1,"preco_unit":18},{"quantidade":10,"preco_unit":17},{"quantidade":30,"preco_unit":15},{"quantidade":60,"preco_unit":14}]',18,'un'),
('Cânula 25G','canula',
 '[{"quantidade":1,"preco_unit":18},{"quantidade":10,"preco_unit":17},{"quantidade":30,"preco_unit":15},{"quantidade":60,"preco_unit":14}]',18,'un');

-- MATERIAL DE APOIO (sem preço definido ainda — custo_atual = 0, editável pelo Admin)
insert into insumos (nome,categoria,tiers,custo_atual,unidade) values
('Gaze','material','[]',0,'un'),
('Algodão','material','[]',0,'un'),
('Álcool 70%','material','[]',0,'un'),
('Clorexidina','material','[]',0,'un'),
('Luva de Procedimento','material','[]',0,'par'),
('Máscara','material','[]',0,'un'),
('Gorro Profissional','material','[]',0,'un'),
('Gorro Paciente','material','[]',0,'un'),
('Caneta Dermográfica','material','[]',0,'un'),
('Babador Descartável','material','[]',0,'un'),
('Pack de Gelo','material','[]',0,'un'),
('Vibrata / Caneta de Gelo','material','[]',0,'un'),
('Hialuronidase (remoção ácido)','material','[]',0,'un');

-- PROCEDIMENTOS
insert into procedimentos (nome,tempo_minutos,preco_tabela) values
('Limpeza de Pele',60,0),
('Hidra Lips',45,0),
('Microagulhamento',60,0),
('Toxina Botulínica — Sorriso Invertido',30,0),
('Toxina Botulínica — Sorriso Gengival',30,0),
('Toxina Botulínica — 1 Região',30,0),
('Toxina Botulínica — 2 Regiões',45,0),
('Toxina Botulínica — 3 Regiões',60,0),
('Toxina Botulínica — 4 Regiões',60,0),
('Toxina Botulínica Full Face (7-9 regiões)',90,0),
('Toxina Botulínica Pescoço / Nefertiti',45,0),
('Preenchimento Bigode Chinês 1ml',60,0),
('Preenchimento Mandíbula 1ml',60,0),
('Preenchimento Olheiras 1ml',60,0),
('Preenchimento Marionete 1ml',60,0),
('Preenchimento Labial 1ml',60,0),
('Preenchimento Malar 1ml',60,0),
('Preenchimento Mento 1ml',60,0),
('Preenchimento Rinomodelação 1ml',60,0),
('Preenchimento Pré-Jowls',60,0);

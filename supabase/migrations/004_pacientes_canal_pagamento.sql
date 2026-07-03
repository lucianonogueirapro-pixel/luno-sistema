-- Adiciona campos ao módulo pacientes
alter table pacientes
  add column if not exists data_nascimento date,
  add column if not exists canal_aquisicao text check (canal_aquisicao in ('instagram','indicacao','google','outros')) default 'outros';

-- Adiciona forma de pagamento em avaliacao_opcoes
alter table avaliacao_opcoes
  add column if not exists forma_pagamento text
    check (forma_pagamento in ('pix','cartao_credito','cartao_debito','dinheiro','parcelado'));

-- Lote e data de validade para insumos
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS lote text,
  ADD COLUMN IF NOT EXISTS data_validade date;

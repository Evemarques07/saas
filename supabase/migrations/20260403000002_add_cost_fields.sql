-- ============================================================
-- MIGRATION: Adicionar campos de custo em sale_items e sales
-- Nota: Campos são NULLABLE para não quebrar registros existentes
-- ============================================================

-- Campos de custo nos itens da venda
ALTER TABLE sale_items
  ADD COLUMN cost_total DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN profit DECIMAL(10,2) DEFAULT NULL;

-- Campos de custo no cabeçalho da venda
ALTER TABLE sales
  ADD COLUMN cost_total DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN gross_profit DECIMAL(10,2) DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN sale_items.cost_total IS 'CMV do item calculado via FIFO';
COMMENT ON COLUMN sale_items.profit IS 'Lucro bruto = total - cost_total';
COMMENT ON COLUMN sales.cost_total IS 'CMV total da venda (soma dos itens)';
COMMENT ON COLUMN sales.gross_profit IS 'Lucro bruto = total - cost_total';

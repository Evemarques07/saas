-- ============================================================
-- MIGRATION: Migração de dados - Lotes iniciais para estoque existente
-- Para cada produto com stock > 0, cria um stock_entry inicial
-- usando o cost_price atual (ou 0 se não definido)
-- ============================================================

-- Cria lote inicial para produtos com estoque
INSERT INTO stock_entries (
  company_id, product_id, unit_cost,
  quantity_received, quantity_remaining,
  notes, received_at
)
SELECT
  p.company_id,
  p.id,
  COALESCE(p.cost_price, 0),
  p.stock,
  p.stock,
  'Lote inicial - migração para sistema FIFO',
  COALESCE(p.created_at, now())
FROM products p
WHERE p.stock > 0;

-- Registra movimentação para cada entrada inicial
INSERT INTO stock_movements (
  company_id, product_id, entry_id, type,
  quantity, unit_cost, balance_after, notes
)
SELECT
  se.company_id,
  se.product_id,
  se.id,
  'entry',
  se.quantity_received,
  se.unit_cost,
  se.quantity_remaining,
  'Entrada inicial - migração FIFO'
FROM stock_entries se
WHERE se.notes = 'Lote inicial - migração para sistema FIFO';

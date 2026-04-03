-- ============================================================
-- MIGRATION: Sistema FIFO - Criação de Tabelas
-- Descrição: Cria stock_entries, sale_item_costs, stock_movements
-- ============================================================

-- 1. Tabela de Lotes de Entrada
CREATE TABLE stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  supplier TEXT,
  invoice_number TEXT,
  notes TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_remaining_le_received
    CHECK (quantity_remaining <= quantity_received)
);

-- 2. Tabela de Alocação FIFO (vínculo sale_item <-> stock_entry)
CREATE TABLE sale_item_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES stock_entries(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Movimentações (auditoria)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entry', 'sale', 'cancellation', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  balance_after INTEGER NOT NULL,
  notes TEXT,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- stock_entries: busca FIFO (mais antigo com estoque disponível)
CREATE INDEX idx_stock_entries_fifo
  ON stock_entries (product_id, received_at ASC)
  WHERE quantity_remaining > 0;

CREATE INDEX idx_stock_entries_company
  ON stock_entries (company_id);

CREATE INDEX idx_stock_entries_product
  ON stock_entries (product_id);

-- sale_item_costs: busca por item da venda e por lote
CREATE INDEX idx_sale_item_costs_sale_item
  ON sale_item_costs (sale_item_id);

CREATE INDEX idx_sale_item_costs_entry
  ON sale_item_costs (entry_id);

-- stock_movements: busca por produto e histórico
CREATE INDEX idx_stock_movements_product
  ON stock_movements (product_id, created_at DESC);

CREATE INDEX idx_stock_movements_company
  ON stock_movements (company_id, created_at DESC);

CREATE INDEX idx_stock_movements_type
  ON stock_movements (type);

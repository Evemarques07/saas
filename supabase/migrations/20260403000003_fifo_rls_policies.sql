-- ============================================================
-- MIGRATION: RLS para tabelas FIFO
-- Segue o padrão existente com get_user_company_ids() e is_super_admin()
-- ============================================================

-- ############################################
-- 1. STOCK_ENTRIES
-- ############################################

ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;

-- Membros da empresa podem ver entradas de estoque
CREATE POLICY "stock_entries_select_members" ON stock_entries FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Membros da empresa podem criar entradas de estoque
CREATE POLICY "stock_entries_insert_members" ON stock_entries FOR INSERT
  WITH CHECK (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Membros da empresa podem atualizar entradas (quantity_remaining via FIFO)
CREATE POLICY "stock_entries_update_members" ON stock_entries FOR UPDATE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Membros da empresa podem deletar entradas
CREATE POLICY "stock_entries_delete_members" ON stock_entries FOR DELETE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- ############################################
-- 2. SALE_ITEM_COSTS
-- ############################################

ALTER TABLE sale_item_costs ENABLE ROW LEVEL SECURITY;

-- Membros podem ver alocações FIFO da sua empresa (via sale_items -> sales)
CREATE POLICY "sale_item_costs_select_members" ON sale_item_costs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.id = sale_item_costs.sale_item_id
      AND (s.company_id = ANY(get_user_company_ids()) OR is_super_admin())
    )
  );

-- Membros podem criar alocações
CREATE POLICY "sale_item_costs_insert_members" ON sale_item_costs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.id = sale_item_costs.sale_item_id
      AND (s.company_id = ANY(get_user_company_ids()) OR is_super_admin())
    )
  );

-- Membros podem deletar alocações (cancelamento)
CREATE POLICY "sale_item_costs_delete_members" ON sale_item_costs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.id = sale_item_costs.sale_item_id
      AND (s.company_id = ANY(get_user_company_ids()) OR is_super_admin())
    )
  );

-- ############################################
-- 3. STOCK_MOVEMENTS
-- ############################################

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Membros da empresa podem ver movimentações
CREATE POLICY "stock_movements_select_members" ON stock_movements FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Membros da empresa podem criar movimentações
CREATE POLICY "stock_movements_insert_members" ON stock_movements FOR INSERT
  WITH CHECK (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

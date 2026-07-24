-- ============================================
-- Migration: Fix RLS Security (Fase 2)
-- Data: 2026-07-22
-- Descricao: Corrige politicas permissivas (USING true + GRANT ALL TO anon) que
--            vazavam customers/sales/sale_items/products/categories entre empresas.
--            A "Fase 1" (20260221000001) corrigiu cupons/fidelidade/promocoes/pedidos,
--            mas deixou estas tabelas core abertas para anon (leak de PII e financeiro).
-- Helpers usados: get_user_company_ids(), is_super_admin() (ja existentes)
-- ============================================

-- Funcao utilitaria: dropar TODAS as policies de uma tabela (limpa estado permissivo)
CREATE OR REPLACE FUNCTION _drop_all_policies(p_table text) RETURNS void AS $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = p_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ############################################
-- 1. SALES (interno - somente membros da empresa)
-- ############################################
SELECT _drop_all_policies('sales');

CREATE POLICY "sales_select_members" ON sales FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "sales_insert_members" ON sales FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "sales_update_members" ON sales FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "sales_delete_members" ON sales FOR DELETE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

REVOKE ALL ON sales FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO authenticated;

-- ############################################
-- 2. SALE_ITEMS (via join com sales)
-- ############################################
SELECT _drop_all_policies('sale_items');

CREATE POLICY "sale_items_select_members" ON sale_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id
                 AND (s.company_id = ANY(get_user_company_ids()) OR is_super_admin())));
CREATE POLICY "sale_items_insert_members" ON sale_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id
                      AND (s.company_id = ANY(get_user_company_ids()) OR is_super_admin())));
CREATE POLICY "sale_items_update_members" ON sale_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id
                 AND (s.company_id = ANY(get_user_company_ids()) OR is_super_admin())));
CREATE POLICY "sale_items_delete_members" ON sale_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id
                 AND (s.company_id = ANY(get_user_company_ids()) OR is_super_admin())));

REVOKE ALL ON sale_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON sale_items TO authenticated;

-- ############################################
-- 3. CUSTOMERS (PII - somente membros; catalogo publico usa RPC SECURITY DEFINER)
-- ############################################
SELECT _drop_all_policies('customers');

CREATE POLICY "customers_select_members" ON customers FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "customers_insert_members" ON customers FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "customers_update_members" ON customers FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "customers_delete_members" ON customers FOR DELETE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

REVOKE ALL ON customers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO authenticated;

-- ############################################
-- 4. PRODUCTS (leitura publica p/ storefront; escrita so membros)
-- ############################################
SELECT _drop_all_policies('products');

-- Catalogo publico: qualquer um pode LER produtos (loja publica)
CREATE POLICY "products_select_public" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_members" ON products FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "products_update_members" ON products FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "products_delete_members" ON products FOR DELETE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

REVOKE ALL ON products FROM anon;
GRANT SELECT ON products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;

-- ############################################
-- 5. CATEGORIES (leitura publica p/ storefront; escrita so membros)
-- ############################################
SELECT _drop_all_policies('categories');

CREATE POLICY "categories_select_public" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_members" ON categories FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "categories_update_members" ON categories FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());
CREATE POLICY "categories_delete_members" ON categories FOR DELETE
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

REVOKE ALL ON categories FROM anon;
GRANT SELECT ON categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;

-- ############################################
-- 6. RPC para o checkout publico criar/vincular cliente SEM expor a tabela
--    SECURITY DEFINER: roda como owner (bypassa RLS), mas so faz upsert escopado
--    por (company_id, phone). Nao permite enumerar clientes.
-- ############################################
CREATE OR REPLACE FUNCTION catalog_upsert_customer(
  p_company_id uuid,
  p_phone text,
  p_name text,
  p_email text DEFAULT NULL,
  p_document text DEFAULT NULL,
  p_has_whatsapp boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_id uuid;
BEGIN
  IF p_company_id IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'company_id e phone sao obrigatorios';
  END IF;

  SELECT id INTO v_id FROM customers
  WHERE company_id = p_company_id AND regexp_replace(phone, '\D', '', 'g') = v_phone
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO customers (company_id, name, phone, email, document, phone_has_whatsapp, source, is_active)
    VALUES (p_company_id, p_name, v_phone, p_email, p_document, p_has_whatsapp, 'catalog', true)
    RETURNING id INTO v_id;
  ELSE
    UPDATE customers SET
      name = coalesce(p_name, name),
      email = coalesce(p_email, email),
      document = coalesce(p_document, document),
      phone_has_whatsapp = p_has_whatsapp
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION catalog_upsert_customer(uuid, text, text, text, text, boolean) TO anon, authenticated;

-- ############################################
-- 7. Trigger: atualizar estatisticas do cliente ao criar pedido do catalogo
--    (substitui o UPDATE direto que o checkout anon fazia em customers)
-- ############################################
CREATE OR REPLACE FUNCTION update_customer_order_stats() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_orders = coalesce(total_orders, 0) + 1,
      total_spent = coalesce(total_spent, 0) + coalesce(NEW.total, 0),
      last_order_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_customer_order_stats ON catalog_orders;
CREATE TRIGGER trg_update_customer_order_stats
  AFTER INSERT ON catalog_orders
  FOR EACH ROW EXECUTE FUNCTION update_customer_order_stats();

-- Limpeza
DROP FUNCTION IF EXISTS _drop_all_policies(text);

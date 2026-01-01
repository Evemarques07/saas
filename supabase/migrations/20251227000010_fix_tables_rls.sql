-- ============================================
-- Fix RLS policies para tabelas de negócio
-- ============================================

-- Desabilitar RLS temporariamente
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "customers_all" ON customers;
DROP POLICY IF EXISTS "categories_all" ON categories;
DROP POLICY IF EXISTS "products_all" ON products;
DROP POLICY IF EXISTS "sales_all" ON sales;
DROP POLICY IF EXISTS "sale_items_all" ON sale_items;

-- Remover outras policies que possam existir
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('customers', 'categories', 'products', 'sales', 'sale_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Reabilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Criar policies permissivas
CREATE POLICY "customers_all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "categories_all" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "products_all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "sales_all" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "sale_items_all" ON sale_items FOR ALL USING (true) WITH CHECK (true);

-- Garantir permissões
GRANT ALL ON customers TO anon, authenticated, service_role;
GRANT ALL ON categories TO anon, authenticated, service_role;
GRANT ALL ON products TO anon, authenticated, service_role;
GRANT ALL ON sales TO anon, authenticated, service_role;
GRANT ALL ON sale_items TO anon, authenticated, service_role;

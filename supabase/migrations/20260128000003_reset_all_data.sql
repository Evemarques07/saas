-- ============================================
-- RESET: Apagar todos os dados para começar do zero
-- ============================================

-- Desabilitar triggers temporariamente
SET session_replication_role = 'replica';

-- Apagar todas as tabelas (ignora se não existir)
DO $$
BEGIN
  -- Billing
  EXECUTE 'TRUNCATE TABLE payments CASCADE' ;
  EXECUTE 'TRUNCATE TABLE subscriptions CASCADE';

  -- Orders
  EXECUTE 'TRUNCATE TABLE catalog_order_items CASCADE';
  EXECUTE 'TRUNCATE TABLE catalog_orders CASCADE';
  EXECUTE 'TRUNCATE TABLE sale_items CASCADE';
  EXECUTE 'TRUNCATE TABLE sales CASCADE';

  -- Products
  EXECUTE 'TRUNCATE TABLE products CASCADE';
  EXECUTE 'TRUNCATE TABLE categories CASCADE';

  -- Customers
  EXECUTE 'TRUNCATE TABLE customers CASCADE';

  -- Coupons
  EXECUTE 'TRUNCATE TABLE coupon_usage CASCADE';
  EXECUTE 'TRUNCATE TABLE coupons CASCADE';

  -- Loyalty
  EXECUTE 'TRUNCATE TABLE loyalty_transactions CASCADE';
  EXECUTE 'TRUNCATE TABLE loyalty_programs CASCADE';

  -- Promotions
  EXECUTE 'TRUNCATE TABLE promotion_products CASCADE';
  EXECUTE 'TRUNCATE TABLE promotions CASCADE';

  -- Users/Companies
  EXECUTE 'TRUNCATE TABLE invites CASCADE';
  EXECUTE 'TRUNCATE TABLE company_members CASCADE';
  EXECUTE 'TRUNCATE TABLE companies CASCADE';
  EXECUTE 'TRUNCATE TABLE profiles CASCADE';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some tables may not exist: %', SQLERRM;
END $$;

-- Reabilitar triggers
SET session_replication_role = 'origin';

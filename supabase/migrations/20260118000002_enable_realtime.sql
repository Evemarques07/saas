-- Enable Supabase Realtime for important tables
-- This allows real-time subscriptions for products, sales, and orders

-- First, check if the publication exists and create it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add tables to the realtime publication (with IF NOT EXISTS check)
DO $$
BEGIN
  -- Products
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;

  -- Sales
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sales') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sales;
  END IF;

  -- Sale Items
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sale_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
  END IF;

  -- Catalog Orders
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'catalog_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE catalog_orders;
  END IF;

  -- Catalog Order Items
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'catalog_order_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE catalog_order_items;
  END IF;

  -- Categories
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'categories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE categories;
  END IF;

  -- Customers
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
  END IF;
END
$$;

-- Comment explaining the realtime setup
COMMENT ON PUBLICATION supabase_realtime IS 'Publication for Supabase Realtime. Includes: products, sales, sale_items, catalog_orders, catalog_order_items, categories, customers';

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

-- Add tables to the realtime publication
-- Products - for inventory updates and catalog sync
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Sales - for real-time sales tracking
ALTER PUBLICATION supabase_realtime ADD TABLE sales;

-- Sale Items - for sales details
ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;

-- Catalog Orders - for real-time order notifications
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_orders;

-- Catalog Order Items - for order details
ALTER PUBLICATION supabase_realtime ADD TABLE catalog_order_items;

-- Categories - for catalog updates
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- Customers - for customer data sync
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Comment explaining the realtime setup
COMMENT ON PUBLICATION supabase_realtime IS 'Publication for Supabase Realtime. Includes: products, sales, sale_items, catalog_orders, catalog_order_items, categories, customers';

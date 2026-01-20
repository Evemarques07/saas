-- Migration: Customer Authentication Fields
-- Adds fields needed for customer login (phone + CPF)

-- 1. Add additional fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Create index for login by phone + CPF
DROP INDEX IF EXISTS idx_customers_login;
CREATE INDEX idx_customers_login
  ON customers(company_id, phone, document)
  WHERE is_active = true;

-- 3. Comments for documentation
COMMENT ON COLUMN customers.birthday IS 'Customer birthday for loyalty promotions';
COMMENT ON COLUMN customers.last_login_at IS 'Last login timestamp for catalog customer area';

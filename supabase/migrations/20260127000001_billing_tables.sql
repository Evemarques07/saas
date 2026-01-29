-- ============================================
-- Billing Tables for Asaas Integration
-- ============================================

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- 'free', 'starter', 'pro', 'enterprise'
  display_name TEXT NOT NULL,          -- 'Gratis', 'Starter', 'Pro'
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2),          -- NULL if no yearly option
  product_limit INT,                   -- NULL = unlimited
  user_limit INT,                      -- NULL = unlimited
  storage_limit_mb INT,                -- NULL = unlimited
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  asaas_subscription_id TEXT,          -- 'sub_xxx' from Asaas
  asaas_customer_id TEXT,              -- 'cus_xxx' from Asaas
  billing_type TEXT DEFAULT 'UNDEFINED', -- BOLETO, CREDIT_CARD, PIX, UNDEFINED
  billing_cycle TEXT DEFAULT 'MONTHLY',  -- MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY
  status TEXT DEFAULT 'active',        -- active, overdue, canceled, expired
  price DECIMAL(10,2) NOT NULL,
  next_due_date DATE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)                   -- One subscription per company
);

-- Payments table (history)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  asaas_payment_id TEXT,               -- 'pay_xxx' from Asaas
  amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2),            -- Amount after fees
  status TEXT DEFAULT 'PENDING',       -- PENDING, CONFIRMED, RECEIVED, OVERDUE, REFUNDED, etc.
  billing_type TEXT,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_id ON subscriptions(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Plans: Anyone can read active plans
CREATE POLICY "Anyone can read active plans"
  ON plans FOR SELECT
  USING (is_active = true);

-- Subscriptions: Company members can read their subscription
CREATE POLICY "Company members can read subscription"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = subscriptions.company_id
      AND cm.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND cm.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND p.is_super_admin = true
    )
  );

-- Payments: Company members can read their payments
CREATE POLICY "Company members can read payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN company_members cm ON cm.company_id = s.company_id
      WHERE s.id = payments.subscription_id
      AND cm.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND cm.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND p.is_super_admin = true
    )
  );

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access plans"
  ON plans FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role full access subscriptions"
  ON subscriptions FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role full access payments"
  ON payments FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================
-- Seed Default Plans
-- ============================================

INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, product_limit, user_limit, storage_limit_mb, features, sort_order)
VALUES
  (
    'free',
    'Gratis',
    'Perfeito para comecar',
    0,
    NULL,
    30,
    1,
    100,
    '{
      "whatsapp_notifications": false,
      "custom_domain": false,
      "api_access": false,
      "white_label": false,
      "priority_support": false,
      "advanced_reports": false,
      "multiple_users": false,
      "promotions": false,
      "loyalty_program": false
    }'::jsonb,
    1
  ),
  (
    'starter',
    'Starter',
    'Para pequenos negocios',
    39.90,
    399.00,
    150,
    2,
    500,
    '{
      "whatsapp_notifications": true,
      "custom_domain": false,
      "api_access": false,
      "white_label": false,
      "priority_support": false,
      "advanced_reports": false,
      "multiple_users": true,
      "promotions": true,
      "loyalty_program": false
    }'::jsonb,
    2
  ),
  (
    'pro',
    'Profissional',
    'Para negocios em crescimento',
    79.90,
    799.00,
    500,
    5,
    2000,
    '{
      "whatsapp_notifications": true,
      "custom_domain": false,
      "api_access": false,
      "white_label": false,
      "priority_support": true,
      "advanced_reports": true,
      "multiple_users": true,
      "promotions": true,
      "loyalty_program": true
    }'::jsonb,
    3
  ),
  (
    'business',
    'Business',
    'Para operacoes maiores',
    149.90,
    1499.00,
    NULL, -- Unlimited
    10,
    10000,
    '{
      "whatsapp_notifications": true,
      "custom_domain": true,
      "api_access": true,
      "white_label": false,
      "priority_support": true,
      "advanced_reports": true,
      "multiple_users": true,
      "promotions": true,
      "loyalty_program": true
    }'::jsonb,
    4
  ),
  (
    'enterprise',
    'Enterprise',
    'Solucao completa white-label',
    299.90,
    2999.00,
    NULL, -- Unlimited
    NULL, -- Unlimited
    NULL, -- Unlimited
    '{
      "whatsapp_notifications": true,
      "custom_domain": true,
      "api_access": true,
      "white_label": true,
      "priority_support": true,
      "advanced_reports": true,
      "multiple_users": true,
      "promotions": true,
      "loyalty_program": true
    }'::jsonb,
    5
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  product_limit = EXCLUDED.product_limit,
  user_limit = EXCLUDED.user_limit,
  storage_limit_mb = EXCLUDED.storage_limit_mb,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================
-- Function to check plan limits
-- ============================================

CREATE OR REPLACE FUNCTION check_product_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INT;
  plan_limit INT;
BEGIN
  -- Get current product count
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE company_id = NEW.company_id;

  -- Get plan limit
  SELECT p.product_limit INTO plan_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.company_id = NEW.company_id
  AND s.status = 'active';

  -- If no subscription, use free plan limit
  IF plan_limit IS NULL THEN
    SELECT product_limit INTO plan_limit
    FROM plans
    WHERE name = 'free';
  END IF;

  -- Check limit (NULL = unlimited)
  IF plan_limit IS NOT NULL AND product_count >= plan_limit THEN
    RAISE EXCEPTION 'Limite de produtos atingido. Faca upgrade do seu plano.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check product limit on insert
DROP TRIGGER IF EXISTS check_product_limit_trigger ON products;
CREATE TRIGGER check_product_limit_trigger
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_limit();

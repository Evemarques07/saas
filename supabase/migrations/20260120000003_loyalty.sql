-- Migration: Loyalty Program
-- Creates tables for points-based loyalty system

-- 1. Loyalty configuration per company
CREATE TABLE IF NOT EXISTS loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT false,
  points_per_real DECIMAL(10,2) DEFAULT 1, -- Points earned per R$1 spent
  points_value DECIMAL(10,4) DEFAULT 0.01, -- Value of each point in R$
  min_points_redeem INTEGER DEFAULT 100, -- Minimum points to redeem
  max_discount_percent INTEGER DEFAULT 50, -- Maximum discount percentage from points
  points_expiry_days INTEGER, -- Days until points expire (null = never)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Loyalty levels (tiers)
CREATE TABLE IF NOT EXISTS loyalty_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0, -- Minimum lifetime points to reach this level
  points_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Multiplier for earning points
  benefits TEXT[], -- List of benefits (display only)
  color TEXT DEFAULT '#6366f1', -- Badge color
  icon TEXT, -- Icon name
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Points transaction history
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catalog_orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')) NOT NULL,
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add loyalty fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_level_id UUID REFERENCES loyalty_levels(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_points INTEGER DEFAULT 0;

-- 5. Add loyalty fields to catalog_orders
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0;
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS points_discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_config_company ON loyalty_config(company_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_levels_company ON loyalty_levels(company_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_levels_sort ON loyalty_levels(company_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_company ON loyalty_points(company_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_type ON loyalty_points(company_id, type);

-- 7. RLS Policies
ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

-- Loyalty config: Company members can view, admins can manage
CREATE POLICY "Company members can view loyalty config"
  ON loyalty_config FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can manage loyalty config"
  ON loyalty_config FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

-- Public can view loyalty config (for catalog display)
CREATE POLICY "Public can view active loyalty config"
  ON loyalty_config FOR SELECT
  USING (enabled = true);

-- Loyalty levels: Company members can view, admins can manage
CREATE POLICY "Company members can view loyalty levels"
  ON loyalty_levels FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can manage loyalty levels"
  ON loyalty_levels FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

-- Public can view loyalty levels
CREATE POLICY "Public can view loyalty levels"
  ON loyalty_levels FOR SELECT
  USING (true);

-- Loyalty points: Company can view, system can manage
CREATE POLICY "Company can view loyalty points"
  ON loyalty_points FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "System can insert loyalty points"
  ON loyalty_points FOR INSERT
  WITH CHECK (true);

-- 8. Comments
COMMENT ON TABLE loyalty_config IS 'Loyalty program configuration per company';
COMMENT ON TABLE loyalty_levels IS 'Loyalty tiers/levels with benefits';
COMMENT ON TABLE loyalty_points IS 'Points transaction history';
COMMENT ON COLUMN loyalty_config.points_per_real IS 'Points earned per R$1 spent';
COMMENT ON COLUMN loyalty_config.points_value IS 'Value of each point in R$';
COMMENT ON COLUMN loyalty_levels.points_multiplier IS 'Bonus multiplier for points earning at this level';
COMMENT ON COLUMN customers.loyalty_points IS 'Current available points balance';
COMMENT ON COLUMN customers.lifetime_points IS 'Total points earned (determines level)';

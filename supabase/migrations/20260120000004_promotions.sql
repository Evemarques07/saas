-- Migration: Promotions System
-- Creates tables for exclusive promotions and offers

-- 1. Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT CHECK (promotion_type IN (
    'birthday',           -- Discount on customer's birthday month
    'loyalty_level',      -- Exclusive discount for specific loyalty levels
    'reactivation',       -- Discount for inactive customers
    'first_purchase',     -- Discount for new customers
    'category_discount',  -- Discount on specific categories
    'product_discount',   -- Discount on specific products
    'seasonal',           -- Time-based promotions
    'flash_sale'          -- Limited time flash sales
  )) NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount DECIMAL(10,2), -- Maximum discount cap
  min_order_value DECIMAL(10,2) DEFAULT 0,

  -- Targeting conditions (JSONB for flexibility)
  conditions JSONB DEFAULT '{}',
  -- Examples:
  -- birthday: {} (automatically applies in birthday month)
  -- loyalty_level: { "level_ids": ["uuid1", "uuid2"] }
  -- reactivation: { "inactive_days": 30 }
  -- first_purchase: {} (no orders)
  -- category_discount: { "category_ids": ["uuid1", "uuid2"] }
  -- product_discount: { "product_ids": ["uuid1", "uuid2"] }

  -- Target audience (optional restrictions)
  target_audience JSONB DEFAULT '{}',
  -- Examples:
  -- { "customer_ids": ["uuid1"] } - specific customers
  -- { "min_lifetime_spent": 1000 } - VIP customers
  -- { "registered_after": "2024-01-01" } - new customers

  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher = applies first
  stackable BOOLEAN DEFAULT false, -- Can combine with other promotions
  usage_limit INTEGER, -- Total uses allowed
  usage_count INTEGER DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Promotion usages tracking
CREATE TABLE IF NOT EXISTS promotion_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catalog_orders(id) ON DELETE SET NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add promotion fields to catalog_orders
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id);
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS promotion_discount DECIMAL(10,2) DEFAULT 0;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_company ON promotions(company_id);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(company_id, promotion_type);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(company_id, is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotion_usages_promotion ON promotion_usages(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usages_customer ON promotion_usages(customer_id);

-- 5. RLS Policies
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usages ENABLE ROW LEVEL SECURITY;

-- Promotions: Company members can view, admins can manage
CREATE POLICY "Company members can view promotions"
  ON promotions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can manage promotions"
  ON promotions FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

-- Public can view active promotions (for catalog)
CREATE POLICY "Public can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Promotion usages: Company can view, system can insert
CREATE POLICY "Company can view promotion usages"
  ON promotion_usages FOR SELECT
  USING (
    promotion_id IN (
      SELECT id FROM promotions WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid()::text AND is_active = true
      )
    )
  );

CREATE POLICY "System can insert promotion usages"
  ON promotion_usages FOR INSERT
  WITH CHECK (true);

-- 6. Comments
COMMENT ON TABLE promotions IS 'Exclusive promotions and offers for customers';
COMMENT ON TABLE promotion_usages IS 'Track promotion usage by customers';
COMMENT ON COLUMN promotions.conditions IS 'JSONB conditions specific to promotion type';
COMMENT ON COLUMN promotions.target_audience IS 'JSONB rules for target customers';
COMMENT ON COLUMN promotions.stackable IS 'Whether this promotion can combine with others';
COMMENT ON COLUMN promotions.priority IS 'Order of application (higher = first)';

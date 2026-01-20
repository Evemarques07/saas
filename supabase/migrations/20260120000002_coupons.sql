-- Migration: Coupon System
-- Creates tables for discount coupons and usage tracking

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  first_purchase_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

-- 2. Create coupon usages table
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catalog_orders(id) ON DELETE SET NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add coupon fields to catalog_orders
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_company ON coupons(company_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(company_id, code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer ON coupon_usages(customer_id);

-- 5. RLS Policies for coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Coupons: Company members can manage
CREATE POLICY "Company members can view coupons"
  ON coupons FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can manage coupons"
  ON coupons FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

-- Public can validate coupons (for catalog checkout)
CREATE POLICY "Public can validate coupons"
  ON coupons FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Coupon usages: Company can view, system can insert
CREATE POLICY "Company can view coupon usages"
  ON coupon_usages FOR SELECT
  USING (
    coupon_id IN (
      SELECT id FROM coupons WHERE company_id IN (
        SELECT company_id FROM company_members
        WHERE user_id = auth.uid()::text AND is_active = true
      )
    )
  );

CREATE POLICY "System can insert coupon usages"
  ON coupon_usages FOR INSERT
  WITH CHECK (true);

-- 6. Comments
COMMENT ON TABLE coupons IS 'Discount coupons for catalog orders';
COMMENT ON TABLE coupon_usages IS 'Track coupon usage by customers';
COMMENT ON COLUMN coupons.discount_type IS 'percentage or fixed amount';
COMMENT ON COLUMN coupons.per_customer_limit IS 'How many times a customer can use this coupon';
COMMENT ON COLUMN coupons.first_purchase_only IS 'If true, only valid for customer first purchase';

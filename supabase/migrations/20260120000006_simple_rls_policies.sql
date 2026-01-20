-- Migration: Simplified RLS Policies
-- Follow the same pattern as products table (permissive policies)
-- Security is enforced by company_id filtering in queries

-- ============================================
-- COUPONS - Drop all and create simple policy
-- ============================================

DROP POLICY IF EXISTS "Company members can view coupons" ON coupons;
DROP POLICY IF EXISTS "Company admins can insert coupons" ON coupons;
DROP POLICY IF EXISTS "Company admins can update coupons" ON coupons;
DROP POLICY IF EXISTS "Company admins can delete coupons" ON coupons;
DROP POLICY IF EXISTS "Public can validate coupons" ON coupons;

CREATE POLICY "coupons_all" ON coupons FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON coupons TO anon, authenticated, service_role;

-- ============================================
-- COUPON_USAGES - Drop all and create simple policy
-- ============================================

DROP POLICY IF EXISTS "Company can view coupon usages" ON coupon_usages;
DROP POLICY IF EXISTS "System can insert coupon usages" ON coupon_usages;

CREATE POLICY "coupon_usages_all" ON coupon_usages FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON coupon_usages TO anon, authenticated, service_role;

-- ============================================
-- LOYALTY_CONFIG - Drop all and create simple policy
-- ============================================

DROP POLICY IF EXISTS "Company members can view loyalty config" ON loyalty_config;
DROP POLICY IF EXISTS "Company admins can insert loyalty config" ON loyalty_config;
DROP POLICY IF EXISTS "Company admins can update loyalty config" ON loyalty_config;
DROP POLICY IF EXISTS "Company admins can delete loyalty config" ON loyalty_config;
DROP POLICY IF EXISTS "Public can view active loyalty config" ON loyalty_config;

CREATE POLICY "loyalty_config_all" ON loyalty_config FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON loyalty_config TO anon, authenticated, service_role;

-- ============================================
-- LOYALTY_LEVELS - Drop all and create simple policy
-- ============================================

DROP POLICY IF EXISTS "Company members can view loyalty levels" ON loyalty_levels;
DROP POLICY IF EXISTS "Company admins can insert loyalty levels" ON loyalty_levels;
DROP POLICY IF EXISTS "Company admins can update loyalty levels" ON loyalty_levels;
DROP POLICY IF EXISTS "Company admins can delete loyalty levels" ON loyalty_levels;
DROP POLICY IF EXISTS "Public can view loyalty levels" ON loyalty_levels;

CREATE POLICY "loyalty_levels_all" ON loyalty_levels FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON loyalty_levels TO anon, authenticated, service_role;

-- ============================================
-- LOYALTY_POINTS - Drop all and create simple policy
-- ============================================

DROP POLICY IF EXISTS "Company can view loyalty points" ON loyalty_points;
DROP POLICY IF EXISTS "System can insert loyalty points" ON loyalty_points;

CREATE POLICY "loyalty_points_all" ON loyalty_points FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON loyalty_points TO anon, authenticated, service_role;

-- ============================================
-- PROMOTIONS - Drop all and create simple policy
-- ============================================

DROP POLICY IF EXISTS "Company members can view promotions" ON promotions;
DROP POLICY IF EXISTS "Company admins can insert promotions" ON promotions;
DROP POLICY IF EXISTS "Company admins can update promotions" ON promotions;
DROP POLICY IF EXISTS "Company admins can delete promotions" ON promotions;
DROP POLICY IF EXISTS "Public can view active promotions" ON promotions;

CREATE POLICY "promotions_all" ON promotions FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON promotions TO anon, authenticated, service_role;

-- ============================================
-- PROMOTION_USAGES - Drop all and create simple policy
-- ============================================

DROP POLICY IF EXISTS "Company can view promotion usages" ON promotion_usages;
DROP POLICY IF EXISTS "System can insert promotion usages" ON promotion_usages;

CREATE POLICY "promotion_usages_all" ON promotion_usages FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON promotion_usages TO anon, authenticated, service_role;

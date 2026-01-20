-- Migration: Fix RLS Policies for INSERT operations
-- The FOR ALL policies need WITH CHECK clause for INSERT to work

-- ============================================
-- FIX COUPONS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Company members can view coupons" ON coupons;
DROP POLICY IF EXISTS "Company admins can manage coupons" ON coupons;
DROP POLICY IF EXISTS "Public can validate coupons" ON coupons;

-- Recreate with proper clauses
CREATE POLICY "Company members can view coupons"
  ON coupons FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can insert coupons"
  ON coupons FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can update coupons"
  ON coupons FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can delete coupons"
  ON coupons FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Public can validate coupons"
  ON coupons FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- ============================================
-- FIX LOYALTY_CONFIG POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company members can view loyalty config" ON loyalty_config;
DROP POLICY IF EXISTS "Company admins can manage loyalty config" ON loyalty_config;
DROP POLICY IF EXISTS "Public can view active loyalty config" ON loyalty_config;

CREATE POLICY "Company members can view loyalty config"
  ON loyalty_config FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can insert loyalty config"
  ON loyalty_config FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can update loyalty config"
  ON loyalty_config FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can delete loyalty config"
  ON loyalty_config FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Public can view active loyalty config"
  ON loyalty_config FOR SELECT
  USING (enabled = true);

-- ============================================
-- FIX LOYALTY_LEVELS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company members can view loyalty levels" ON loyalty_levels;
DROP POLICY IF EXISTS "Company admins can manage loyalty levels" ON loyalty_levels;
DROP POLICY IF EXISTS "Public can view loyalty levels" ON loyalty_levels;

CREATE POLICY "Company members can view loyalty levels"
  ON loyalty_levels FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can insert loyalty levels"
  ON loyalty_levels FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can update loyalty levels"
  ON loyalty_levels FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can delete loyalty levels"
  ON loyalty_levels FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Public can view loyalty levels"
  ON loyalty_levels FOR SELECT
  USING (true);

-- ============================================
-- FIX PROMOTIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company members can view promotions" ON promotions;
DROP POLICY IF EXISTS "Company admins can manage promotions" ON promotions;
DROP POLICY IF EXISTS "Public can view active promotions" ON promotions;

CREATE POLICY "Company members can view promotions"
  ON promotions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "Company admins can insert promotions"
  ON promotions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can update promotions"
  ON promotions FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Company admins can delete promotions"
  ON promotions FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()::text AND role IN ('admin', 'manager') AND is_active = true
    )
  );

CREATE POLICY "Public can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

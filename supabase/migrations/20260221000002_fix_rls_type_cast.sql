-- ============================================
-- Migration: Fix type cast in RLS helper functions
-- Data: 2026-02-21
-- Descricao: auth.uid() retorna UUID mas user_id/profiles.id sao TEXT.
--            Adiciona cast ::text para evitar "operator does not exist: text = uuid"
-- ============================================

-- Fix get_user_company_ids: company_members.user_id is TEXT, auth.uid() is UUID
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(company_id),
    '{}'::UUID[]
  )
  FROM company_members
  WHERE user_id = auth.uid()::text AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix is_super_admin: profiles.id is TEXT, auth.uid() is UUID
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()::text AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fix is_company_admin: same issue
CREATE OR REPLACE FUNCTION is_company_admin(company_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = company_uuid
    AND user_id = auth.uid()::text
    AND role = 'admin'
    AND is_active = true
  ) OR is_super_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

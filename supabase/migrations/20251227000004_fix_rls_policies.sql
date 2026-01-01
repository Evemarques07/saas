-- ============================================
-- Fix: Corrigir RLS policies (erro 500 em SELECT)
-- ============================================

-- ==========================================
-- PROFILES
-- ==========================================

-- Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover todas as policies existentes
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Criar policies SIMPLES (sem subqueries que causam recursão)
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_all" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ==========================================
-- COMPANY_MEMBERS
-- ==========================================

-- Desabilitar RLS temporariamente
ALTER TABLE company_members DISABLE ROW LEVEL SECURITY;

-- Remover todas as policies existentes
DROP POLICY IF EXISTS "Users can view members of their companies" ON company_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON company_members;
DROP POLICY IF EXISTS "Super admin can view all memberships" ON company_members;
DROP POLICY IF EXISTS "Company admins can view company members" ON company_members;

-- Reabilitar RLS
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Criar policies SIMPLES
CREATE POLICY "company_members_select_all" ON company_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "company_members_insert_all" ON company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "company_members_update_all" ON company_members
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "company_members_delete_all" ON company_members
  FOR DELETE
  TO authenticated
  USING (true);

-- ==========================================
-- COMPANIES
-- ==========================================

-- Verificar e simplificar policies de companies
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage all companies" ON companies;
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "companies_select" ON companies;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_all" ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "companies_insert_admin" ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "companies_update_admin" ON companies
  FOR UPDATE
  TO authenticated
  USING (true);

-- ==========================================
-- INVITES
-- ==========================================

ALTER TABLE invites DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage invites" ON invites;
DROP POLICY IF EXISTS "Users can view their invites" ON invites;
DROP POLICY IF EXISTS "Anyone can view invite by token" ON invites;

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_all" ON invites
  FOR SELECT
  USING (true);  -- Permite anon também (para aceitar convite)

CREATE POLICY "invites_insert_auth" ON invites
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "invites_update_auth" ON invites
  FOR UPDATE
  TO authenticated
  USING (true);

-- ==========================================
-- Garantir permissões
-- ==========================================

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON company_members TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON invites TO authenticated;
GRANT SELECT ON invites TO anon;

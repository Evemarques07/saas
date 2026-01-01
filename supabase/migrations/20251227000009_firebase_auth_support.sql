-- ============================================
-- Migração para suportar Firebase Auth
-- Firebase UIDs são strings, não UUIDs
-- ============================================

-- 1. Remover TODAS as policies de profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- 2. Remover TODAS as policies de company_members
ALTER TABLE company_members DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'company_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON company_members', pol.policyname);
  END LOOP;
END $$;

-- 3. Remover TODAS as foreign keys que referenciam profiles.id
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_user_id_fkey;
ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_invited_by_fkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_seller_id_fkey;

-- 4. Remover constraint única temporariamente
ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_company_id_user_id_key;

-- 5. Alterar tipo de profiles.id de UUID para TEXT
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 6. Alterar tipo de todas as colunas que referenciam profiles.id
ALTER TABLE company_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE invites ALTER COLUMN invited_by TYPE TEXT USING invited_by::TEXT;
-- sales.user_id e sales.seller_id podem não existir, ignorar erros
DO $$ BEGIN
  ALTER TABLE sales ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE sales ALTER COLUMN seller_id TYPE TEXT USING seller_id::TEXT;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- 7. Recriar constraint única de company_members
ALTER TABLE company_members ADD CONSTRAINT company_members_company_id_user_id_key UNIQUE (company_id, user_id);

-- 8. Recriar índices
DROP INDEX IF EXISTS idx_company_members_user_id;
CREATE INDEX idx_company_members_user_id ON company_members(user_id);

-- 9. Reabilitar RLS e criar policies simples
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_members_all" ON company_members FOR ALL USING (true) WITH CHECK (true);

-- 10. Garantir permissões
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

GRANT ALL ON company_members TO anon;
GRANT ALL ON company_members TO authenticated;
GRANT ALL ON company_members TO service_role;

-- 11. Adicionar comentário para documentação
COMMENT ON TABLE profiles IS 'Perfis de usuários - id pode ser Firebase UID ou Supabase UUID';
COMMENT ON COLUMN profiles.id IS 'ID do usuário (Firebase UID ou Supabase UUID)';

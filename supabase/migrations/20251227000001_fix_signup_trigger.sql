-- ============================================
-- Fix: Corrigir trigger de signup (erro 500)
-- ============================================
-- Problema: O trigger handle_new_user falha ao inserir profile
-- devido a problemas de permissão/RLS

-- 1. Dropar o trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Recriar a função com as permissões corretas
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.email = 'evertonmarques.jm@gmail.com' THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha o signup
    RAISE WARNING 'Erro ao criar profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4. Garantir que profiles tem as policies corretas
DROP POLICY IF EXISTS "Allow insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON profiles;

-- Policy para SELECT
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true
  ));

-- Policy para INSERT (para o trigger SECURITY DEFINER)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Policy para UPDATE
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- 5. Verificar que RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Dar permissão para authenticated users
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT INSERT ON profiles TO service_role;

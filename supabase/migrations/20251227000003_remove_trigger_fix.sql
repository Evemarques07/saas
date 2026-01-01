-- ============================================
-- Fix V3: Remover trigger e usar abordagem diferente
-- ============================================
-- O trigger pode estar causando problemas.
-- Vamos remover e criar o profile de outra forma.

-- 1. Remover trigger completamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Manter a função mas não usar trigger
-- O profile será criado pelo código da aplicação

-- 3. Criar função RPC para criar profile (chamada pela app)
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT ''
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, is_super_admin)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_name, user_email),
    CASE WHEN user_email = 'evertonmarques.jm@gmail.com' THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Dar permissão para chamar
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;

-- 5. Políticas simples para profiles
DROP POLICY IF EXISTS "Enable read for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Permitir tudo para simplificar (ajustar depois se necessário)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (true);

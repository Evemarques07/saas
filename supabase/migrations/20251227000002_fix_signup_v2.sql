-- ============================================
-- Fix V2: Corrigir signup de forma agressiva
-- ============================================

-- 1. Remover TODOS os triggers relacionados a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_super_admin_signup ON auth.users;

-- 2. Remover funcoes antigas
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS set_super_admin_on_signup() CASCADE;

-- 3. Desabilitar RLS temporariamente na profiles para debug
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 4. Recriar função de forma SIMPLES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _is_super BOOLEAN := false;
BEGIN
  -- Verificar se é super admin
  IF NEW.email = 'evertonmarques.jm@gmail.com' THEN
    _is_super := true;
  END IF;

  -- Inserir profile
  INSERT INTO public.profiles (id, email, full_name, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _is_super
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Garantir policies basicas
DROP POLICY IF EXISTS "Enable read for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for service" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;

CREATE POLICY "Enable read for users" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for service" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- 8. Garantir permissões
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON profiles TO anon;

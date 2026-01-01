-- ============================================
-- Fix: Allow profile creation during signup
-- ============================================

-- Policy para permitir que usuários criem seu próprio perfil
-- O trigger handle_new_user usa SECURITY DEFINER, mas precisa de policy
CREATE POLICY "Allow insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Também permitir que o service role (usado pelo trigger) insira
-- Isso é necessário porque o trigger roda antes do usuário estar "logado"
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recriar o trigger com permissões corretas
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.email = 'evertonmarques.jm@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Dropar trigger antigo do super admin (já integrado acima)
DROP TRIGGER IF EXISTS on_super_admin_signup ON auth.users;
DROP FUNCTION IF EXISTS set_super_admin_on_signup();

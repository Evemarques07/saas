-- ============================================
-- Fix: Remover qualquer trigger ou hook que cause erro no signup
-- ============================================

-- 1. Remover TODOS os triggers de auth.users (novamente, para garantir)
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth'
      AND event_object_table = 'users'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_rec.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
  END LOOP;
END $$;

-- 2. Remover funções que possam estar causando problemas
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_super_admin_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS auth.on_auth_user_created() CASCADE;

-- 3. Garantir que profiles nao tem foreign key para auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;

-- Recriar primary key
ALTER TABLE profiles ADD PRIMARY KEY (id);

-- 4. Garantir RLS permissiva em profiles para signup funcionar
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- 5. Garantir permissoes
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 6. Verificar se existe alguma extensao ou hook customizado
-- (Isso precisa ser verificado no Dashboard do Supabase)

COMMENT ON TABLE profiles IS 'Perfis de usuarios - sem trigger de auth.users';

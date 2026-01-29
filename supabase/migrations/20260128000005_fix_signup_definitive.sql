-- ============================================
-- FIX DEFINITIVO: Erro "Database error finding user" no signup
-- ============================================
-- Este erro acontece quando:
-- 1. Há foreign key de profiles para auth.users
-- 2. Há triggers em auth.users que falham
-- 3. Há Auth Hooks configurados no Dashboard

-- ============================================
-- PASSO 1: Remover TODAS foreign keys de profiles para auth.users
-- ============================================

-- Primeiro, descobrir o nome exato da constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Buscar constraint de FK para auth.users
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'profiles'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
    RAISE NOTICE 'Dropped FK constraint: %', constraint_name;
  END IF;
END $$;

-- Também tentar remover pelo nome comum
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey1 CASCADE;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_auth_users CASCADE;

-- ============================================
-- PASSO 2: Recriar a tabela profiles SEM foreign key
-- ============================================

-- Verificar se a primary key existe, se não, criar
DO $$
BEGIN
  -- Remover e recriar primary key (sem FK)
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
  ALTER TABLE profiles ADD PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Primary key handling: %', SQLERRM;
END $$;

-- ============================================
-- PASSO 3: Remover TODOS os triggers de auth.users
-- ============================================

DO $$
DECLARE
  trigger_rec RECORD;
  drop_count INT := 0;
BEGIN
  FOR trigger_rec IN
    SELECT tgname as trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', trigger_rec.trigger_name);
    drop_count := drop_count + 1;
    RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
  END LOOP;
  RAISE NOTICE 'Total triggers dropped from auth.users: %', drop_count;
END $$;

-- Remover triggers por nome conhecido
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS set_super_admin_trigger ON auth.users;

-- ============================================
-- PASSO 4: Remover funções que podem ser chamadas por triggers
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_super_admin_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;
DROP FUNCTION IF EXISTS auth.on_auth_user_created() CASCADE;

-- ============================================
-- PASSO 5: Configurar RLS permissiva para profiles
-- ============================================

-- Habilitar RLS se não estiver habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remover todas policies existentes
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON profiles;

-- Criar policies permissivas
-- SELECT: usuários autenticados podem ver seu próprio perfil, super admins veem todos
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  auth.uid()::text = id::text
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id::text = auth.uid()::text AND p.is_super_admin = true)
  OR auth.role() = 'service_role'
);

-- INSERT: qualquer um pode criar (necessário para signup)
-- O anon precisa poder inserir para o signup funcionar
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);

-- UPDATE: usuário pode atualizar seu próprio perfil
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  auth.uid()::text = id::text
  OR auth.role() = 'service_role'
) WITH CHECK (
  auth.uid()::text = id::text
  OR auth.role() = 'service_role'
);

-- DELETE: apenas service_role
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  auth.role() = 'service_role'
);

-- ============================================
-- PASSO 6: Garantir permissões corretas
-- ============================================

GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ============================================
-- PASSO 7: Adicionar coluna onboarding_completed se não existir
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- PASSO 8: Criar índice único em email se não existir
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'profiles' AND indexname = 'profiles_email_key'
  ) THEN
    CREATE UNIQUE INDEX profiles_email_key ON profiles(email);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Index creation: %', SQLERRM;
END $$;

-- ============================================
-- COMENTÁRIO FINAL
-- ============================================

COMMENT ON TABLE profiles IS 'Perfis de usuários - SEM foreign key para auth.users, SEM triggers. Profiles são criados pelo frontend após signup.';

-- ============================================
-- IMPORTANTE: VERIFICAR NO DASHBOARD DO SUPABASE
-- ============================================
-- Vá em Authentication > Hooks e verifique se há algum hook configurado
-- Se houver hooks como "Custom access token", "MFA verification", etc., desabilite-os
--
-- Também verifique em Database > Functions se há alguma função com "SECURITY DEFINER"
-- que possa estar sendo chamada durante o signup

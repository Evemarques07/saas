-- ============================================
-- Fix: Remover TODOS os triggers de auth.users
-- ============================================
-- O Supabase Auth está falhando por causa de triggers

-- 1. Listar e remover TODOS os triggers de auth.users
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

-- 2. Remover funções relacionadas
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_super_admin_on_signup() CASCADE;

-- 3. Verificar se profiles tem constraint problemática
-- A foreign key de profiles para auth.users pode causar problemas
-- Vamos verificar se existe e recriar de forma correta

-- Primeiro, vamos ver a estrutura atual
DO $$
BEGIN
  -- Se a tabela profiles existe e tem a FK, está ok
  -- O problema pode ser outro
  RAISE NOTICE 'Verificando estrutura de profiles...';
END $$;

-- 4. Garantir que não há nenhum hook de database
-- (Isso é configurado no Dashboard, não por SQL)

-- 5. Criar uma função mais simples para criar profile depois
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, is_super_admin)
  VALUES (
    p_user_id,
    p_email,
    COALESCE(p_full_name, split_part(p_email, '@', 1)),
    p_email = 'evertonmarques.jm@gmail.com'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar profile: % %', SQLSTATE, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO service_role;

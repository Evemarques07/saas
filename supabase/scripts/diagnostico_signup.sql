-- ============================================
-- DIAGNOSTICO: Por que signup esta falhando?
-- ============================================
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se o trigger existe
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- 2. Verificar a função handle_new_user
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- 3. Verificar estrutura da tabela profiles
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Verificar constraints
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles';

-- 5. Verificar RLS policies
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 6. Testar inserção manual (simula o trigger)
-- DESCOMENTE PARA TESTAR:
/*
INSERT INTO profiles (id, email, full_name, is_super_admin)
VALUES (
  gen_random_uuid(),
  'teste@teste.com',
  'Teste',
  false
);
*/

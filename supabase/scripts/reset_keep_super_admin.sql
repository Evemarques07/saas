-- ============================================
-- RESET: Limpar tudo exceto Super Admin
-- ============================================
-- CUIDADO: Este script apaga TODOS os dados!
-- Apenas o super admin sera mantido.
-- ============================================

-- Desabilitar triggers temporariamente para evitar problemas
SET session_replication_role = 'replica';

-- 1. Limpar itens de vendas
DELETE FROM sale_items;

-- 2. Limpar vendas
DELETE FROM sales;

-- 3. Limpar produtos
DELETE FROM products;

-- 4. Limpar categorias
DELETE FROM categories;

-- 5. Limpar clientes
DELETE FROM customers;

-- 6. Limpar convites
DELETE FROM invites;

-- 7. Limpar membros de empresas
DELETE FROM company_members;

-- 8. Limpar empresas
DELETE FROM companies;

-- 9. Deletar profiles que NAO sao super admin
DELETE FROM profiles
WHERE is_super_admin = false OR is_super_admin IS NULL;

-- 10. Deletar usuarios do auth.users que nao tem profile (nao sao super admin)
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles WHERE is_super_admin = true);

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- Verificar resultado
SELECT 'Profiles restantes:' as info, count(*) as total FROM profiles;
SELECT 'Empresas restantes:' as info, count(*) as total FROM companies;
SELECT 'Super Admin:' as info, email FROM profiles WHERE is_super_admin = true;

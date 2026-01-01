-- ============================================
-- Fix: Corrigir RLS de company_members (erro 500)
-- ============================================
-- Problema: A policy anterior causava recursão infinita
-- ao fazer subquery na própria tabela company_members

-- Dropar todas as policies existentes para recriar de forma limpa
DROP POLICY IF EXISTS "Users can view members of their companies" ON company_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON company_members;
DROP POLICY IF EXISTS "Super admin can view all memberships" ON company_members;
DROP POLICY IF EXISTS "Company admins can view company members" ON company_members;

-- Criar policy simples: usuário pode ver suas próprias associações
CREATE POLICY "Users can view own memberships"
  ON company_members FOR SELECT
  USING (user_id = auth.uid());

-- Super admin pode ver todos os membros
CREATE POLICY "Super admin can view all memberships"
  ON company_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Também garantir que admins possam ver membros de suas empresas
-- (usando a função get_user_company_ids que é SECURITY DEFINER)
CREATE POLICY "Company admins can view company members"
  ON company_members FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
  );

-- ============================================
-- Migration: Supabase Auth RLS Policies
-- Atualiza policies para usar auth.uid() do Supabase Auth
-- ============================================

-- ============================================
-- 1. Atualizar policies de subscriptions
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Company members can read subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access subscriptions" ON subscriptions;

-- Nova policy: Membros da empresa podem ler
CREATE POLICY "Company members can read subscription"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = subscriptions.company_id
      AND cm.user_id = auth.uid()::text
      AND cm.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
      AND p.is_super_admin = true
    )
  );

-- Service role tem acesso total
CREATE POLICY "Service role full access subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 2. Atualizar policies de payments
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Company members can read payments" ON payments;
DROP POLICY IF EXISTS "Service role full access payments" ON payments;

-- Nova policy: Membros da empresa podem ler
CREATE POLICY "Company members can read payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN company_members cm ON cm.company_id = s.company_id
      WHERE s.id = payments.subscription_id
      AND cm.user_id = auth.uid()::text
      AND cm.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text
      AND p.is_super_admin = true
    )
  );

-- Service role tem acesso total
CREATE POLICY "Service role full access payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 3. Atualizar policies de plans
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Service role full access plans" ON plans;

-- Service role tem acesso total
CREATE POLICY "Service role full access plans"
  ON plans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 4. Garantir que Realtime funcione
-- ============================================

-- Habilitar realtime nas tabelas de billing (ignora se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;
END $$;

-- ============================================
-- 5. Comentários de documentação
-- ============================================

COMMENT ON TABLE subscriptions IS 'Assinaturas de planos - RLS usa auth.uid() do Supabase Auth';
COMMENT ON TABLE payments IS 'Pagamentos de assinaturas - RLS usa auth.uid() do Supabase Auth';

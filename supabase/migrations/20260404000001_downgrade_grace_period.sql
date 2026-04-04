-- ============================================
-- Downgrade Grace Period & Plan Limit Enforcement
-- ============================================
-- Adiciona suporte a grace period (2 dias) quando pagamento fica overdue,
-- e controle de downgrade automatico apos expirar o grace period.

-- 1. Adicionar colunas na tabela subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS downgraded_at TIMESTAMPTZ;

-- Index para buscar subscriptions com grace period expirado
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period
  ON subscriptions(grace_period_ends_at)
  WHERE grace_period_ends_at IS NOT NULL AND downgraded_at IS NULL;

-- 2. Atualizar check_product_limit para considerar grace period e downgrade
CREATE OR REPLACE FUNCTION check_product_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INT;
  plan_limit INT;
  has_subscription BOOLEAN;
  sub_status TEXT;
  sub_grace_ends TIMESTAMPTZ;
  sub_downgraded TIMESTAMPTZ;
BEGIN
  -- No UPDATE: so verificar se is_active mudou de false para true
  IF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.is_active = false AND NEW.is_active = true) THEN
      RETURN NEW;  -- nao eh reativacao, deixa passar
    END IF;
  END IF;

  -- Get current active product count
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE company_id = NEW.company_id
  AND is_active = true;

  -- Get plan limit and subscription state
  SELECT p.product_limit, s.status, s.grace_period_ends_at, s.downgraded_at
  INTO plan_limit, sub_status, sub_grace_ends, sub_downgraded
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.company_id = NEW.company_id
  AND s.status IN ('active', 'overdue');

  has_subscription := FOUND;

  -- Determinar limite efetivo:
  -- 1. Sem subscription → free
  -- 2. Subscription downgradada → free
  -- 3. Subscription overdue com grace period expirado → free
  -- 4. Subscription active ou overdue dentro do grace period → limite do plano
  IF NOT has_subscription THEN
    -- Sem subscription, usar free
    SELECT product_limit INTO plan_limit FROM plans WHERE name = 'free';
  ELSIF sub_downgraded IS NOT NULL THEN
    -- Ja foi downgradado
    SELECT product_limit INTO plan_limit FROM plans WHERE name = 'free';
  ELSIF sub_status = 'overdue' AND sub_grace_ends IS NOT NULL AND sub_grace_ends < NOW() THEN
    -- Grace period expirou
    SELECT product_limit INTO plan_limit FROM plans WHERE name = 'free';
  END IF;
  -- Caso contrario: usa plan_limit do plano pago (ja esta na variavel)

  -- NULL = ilimitado
  IF plan_limit IS NOT NULL AND product_count >= plan_limit THEN
    RAISE EXCEPTION 'Limite de produtos atingido. Faca upgrade do seu plano.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS check_product_limit_trigger ON products;
CREATE TRIGGER check_product_limit_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_limit();

-- 3. Funcao para enforcement de limites (chamada pela Edge Function enforce-plan-limits)
CREATE OR REPLACE FUNCTION enforce_free_plan_limits(target_company_id UUID)
RETURNS JSONB AS $$
DECLARE
  free_product_limit INT;
  free_user_limit INT;
  active_product_count INT;
  active_user_count INT;
  products_disabled INT := 0;
  users_disabled INT := 0;
BEGIN
  -- Buscar limites do plano free
  SELECT product_limit, user_limit INTO free_product_limit, free_user_limit
  FROM plans WHERE name = 'free';

  -- Contar produtos ativos
  SELECT COUNT(*) INTO active_product_count
  FROM products WHERE company_id = target_company_id AND is_active = true;

  -- Desativar produtos excedentes (manter os mais antigos)
  IF free_product_limit IS NOT NULL AND active_product_count > free_product_limit THEN
    WITH products_to_disable AS (
      SELECT id FROM products
      WHERE company_id = target_company_id AND is_active = true
      ORDER BY created_at ASC
      OFFSET free_product_limit
    )
    UPDATE products SET is_active = false
    WHERE id IN (SELECT id FROM products_to_disable);

    products_disabled := active_product_count - free_product_limit;
  END IF;

  -- Contar usuarios ativos (excluindo owner)
  SELECT COUNT(*) INTO active_user_count
  FROM company_members
  WHERE company_id = target_company_id AND is_active = true AND role != 'owner';

  -- Desativar usuarios excedentes (manter apenas owner)
  -- Free plan = 1 usuario (apenas owner)
  IF free_user_limit IS NOT NULL AND (active_user_count + 1) > free_user_limit THEN
    UPDATE company_members SET is_active = false
    WHERE company_id = target_company_id AND role != 'owner' AND is_active = true;

    users_disabled := active_user_count;
  END IF;

  -- Marcar subscription como downgradada
  UPDATE subscriptions
  SET downgraded_at = NOW(), updated_at = NOW()
  WHERE company_id = target_company_id AND status = 'overdue';

  RETURN jsonb_build_object(
    'company_id', target_company_id,
    'products_disabled', products_disabled,
    'users_disabled', users_disabled
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

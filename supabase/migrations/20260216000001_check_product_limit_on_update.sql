-- Extend check_product_limit to also fire on UPDATE when is_active changes to TRUE
-- This prevents bypassing the limit by deactivating and reactivating products.

CREATE OR REPLACE FUNCTION check_product_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INT;
  plan_limit INT;
  has_subscription BOOLEAN;
BEGIN
  -- No UPDATE: so verificar se is_active mudou de false para true
  IF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.is_active = false AND NEW.is_active = true) THEN
      RETURN NEW;  -- nao eh reativacao, deixa passar
    END IF;
  END IF;

  -- Get current product count (todos os produtos, ativos e inativos)
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE company_id = NEW.company_id;

  -- Get plan limit
  SELECT p.product_limit INTO plan_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.company_id = NEW.company_id
  AND s.status = 'active';

  has_subscription := FOUND;

  IF NOT has_subscription THEN
    SELECT product_limit INTO plan_limit
    FROM plans
    WHERE name = 'free';
  END IF;

  -- NULL = ilimitado
  IF plan_limit IS NOT NULL AND product_count >= plan_limit THEN
    RAISE EXCEPTION 'Limite de produtos atingido. Faca upgrade do seu plano.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger incluindo UPDATE
DROP TRIGGER IF EXISTS check_product_limit_trigger ON products;

CREATE TRIGGER check_product_limit_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_limit();

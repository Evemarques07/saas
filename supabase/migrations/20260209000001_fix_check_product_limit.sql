-- Fix: check_product_limit() was treating NULL (unlimited) as "no subscription"
-- and falling back to free plan limit (20 products).
-- Now uses FOUND to distinguish "no subscription" from "unlimited plan".

CREATE OR REPLACE FUNCTION check_product_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INT;
  plan_limit INT;
  has_subscription BOOLEAN;
BEGIN
  -- Get current product count
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE company_id = NEW.company_id;

  -- Get plan limit
  SELECT p.product_limit INTO plan_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.company_id = NEW.company_id
  AND s.status = 'active';

  -- FOUND is true if the SELECT returned a row (subscription exists)
  has_subscription := FOUND;

  -- If no subscription, use free plan limit
  IF NOT has_subscription THEN
    SELECT product_limit INTO plan_limit
    FROM plans
    WHERE name = 'free';
  END IF;

  -- Check limit (NULL = unlimited)
  IF plan_limit IS NOT NULL AND product_count >= plan_limit THEN
    RAISE EXCEPTION 'Limite de produtos atingido. Faca upgrade do seu plano.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Update Plans - Simplified Features
-- ============================================
-- Removed: custom_domain, api_access, white_label, priority_support
-- Added: coupons
-- Updated limits: products and users per plan

-- Update existing plans
UPDATE plans SET
  product_limit = 20,
  user_limit = 1,
  features = '{
    "whatsapp_notifications": false,
    "advanced_reports": false,
    "multiple_users": false,
    "promotions": false,
    "loyalty_program": false,
    "coupons": false
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'free';

UPDATE plans SET
  product_limit = 100,
  user_limit = 2,
  features = '{
    "whatsapp_notifications": true,
    "advanced_reports": false,
    "multiple_users": true,
    "promotions": true,
    "loyalty_program": false,
    "coupons": true
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'starter';

UPDATE plans SET
  product_limit = 400,
  user_limit = 5,
  features = '{
    "whatsapp_notifications": true,
    "advanced_reports": true,
    "multiple_users": true,
    "promotions": true,
    "loyalty_program": true,
    "coupons": true
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'pro';

UPDATE plans SET
  product_limit = 3000,
  user_limit = 10,
  features = '{
    "whatsapp_notifications": true,
    "advanced_reports": true,
    "multiple_users": true,
    "promotions": true,
    "loyalty_program": true,
    "coupons": true
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'business';

UPDATE plans SET
  product_limit = NULL,  -- Unlimited
  user_limit = NULL,     -- Unlimited
  features = '{
    "whatsapp_notifications": true,
    "advanced_reports": true,
    "multiple_users": true,
    "promotions": true,
    "loyalty_program": true,
    "coupons": true
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'enterprise';

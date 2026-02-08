-- Migration: Add is_public field to coupons
-- Allows creating "secret" coupons that work when typed but don't appear in the catalog coupon list

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Existing coupons default to public (visible in catalog)

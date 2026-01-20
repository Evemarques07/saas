-- ============================================
-- Add EAN (barcode) field to products table
-- ============================================

-- Add EAN column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS ean TEXT;

-- Create index for EAN lookups (useful for barcode scanning)
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);

-- Add comment for documentation
COMMENT ON COLUMN products.ean IS 'EAN barcode (EAN-13, EAN-8, or other barcode formats)';

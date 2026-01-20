-- Add images JSONB column to products table
-- Supports up to 4 images per product with ordering and primary image designation

-- Add the images column with default empty array
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance on images
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING gin(images);

-- Migrate existing image_url to the new images array
-- Only for products that have an image_url and empty images array
UPDATE products
SET images = jsonb_build_array(
  jsonb_build_object(
    'url', image_url,
    'order', 0,
    'isPrimary', true
  )
)
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND (images IS NULL OR images = '[]'::jsonb);

-- Add comment explaining the structure
COMMENT ON COLUMN products.images IS 'Array of product images. Each image object contains: url (string), order (0-3), isPrimary (boolean)';

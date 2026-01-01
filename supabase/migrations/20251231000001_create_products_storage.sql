-- Migration: Criar bucket de storage para imagens de produtos
-- Data: 2024-12-31

-- Criar bucket publico para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: qualquer um pode ver (bucket publico)
CREATE POLICY "Public read access for products"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Policy: usuarios autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload to products"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products');

-- Policy: usuarios podem atualizar suas imagens
CREATE POLICY "Users can update products images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products');

-- Policy: usuarios podem deletar imagens
CREATE POLICY "Users can delete products images"
ON storage.objects FOR DELETE
USING (bucket_id = 'products');

-- Criar bucket publico para logos de empresas
INSERT INTO storage.buckets (id, name, public)
VALUES ('companies', 'companies', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: qualquer um pode ver (bucket publico)
CREATE POLICY "Public read access for companies"
ON storage.objects FOR SELECT
USING (bucket_id = 'companies');

-- Policy: usuarios autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload to companies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'companies');

-- Policy: usuarios podem atualizar suas proprias imagens
CREATE POLICY "Users can update company logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'companies');

-- Policy: usuarios podem deletar suas proprias imagens
CREATE POLICY "Users can delete company logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'companies');

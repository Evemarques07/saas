-- Migration: Add customer_name and customer_phone to sales table
-- Para exibir nome do cliente em vendas originadas do catalogo

-- Adiciona campo customer_name para armazenar nome do cliente quando nao ha customer_id
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Adiciona campo customer_phone para armazenar telefone do cliente do catalogo
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Comentarios
COMMENT ON COLUMN sales.customer_name IS 'Nome do cliente (usado quando venda vem do catalogo sem customer_id)';
COMMENT ON COLUMN sales.customer_phone IS 'Telefone do cliente (usado quando venda vem do catalogo sem customer_id)';

-- Atualiza vendas existentes que vieram do catalogo (extraindo do notes)
-- As vendas do catalogo tem notes no formato: "Pedido do catalogo - Cliente: NOME - Tel: TELEFONE..."
UPDATE sales
SET
  customer_name = CASE
    WHEN notes LIKE 'Pedido do catálogo - Cliente: %'
    THEN split_part(split_part(notes, 'Cliente: ', 2), ' - Tel:', 1)
    ELSE NULL
  END,
  customer_phone = CASE
    WHEN notes LIKE '%Tel: %'
    THEN split_part(split_part(notes, 'Tel: ', 2), ' -', 1)
    ELSE NULL
  END
WHERE customer_id IS NULL
  AND notes LIKE 'Pedido do catálogo%';

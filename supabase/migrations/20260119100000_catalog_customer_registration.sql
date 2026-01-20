-- Migration: Cadastro de cliente pelo catálogo
-- Permite que clientes se cadastrem opcionalmente durante o checkout

-- 1. Adicionar novos campos na tabela customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_has_whatsapp BOOLEAN DEFAULT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'catalog'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ;

-- 2. Criar índice único por telefone + empresa (para evitar duplicatas)
-- Remove índice se existir e recria
DROP INDEX IF EXISTS idx_customers_phone_company;
CREATE UNIQUE INDEX idx_customers_phone_company
  ON customers(phone, company_id)
  WHERE phone IS NOT NULL;

-- 3. Criar índice único por CPF/documento + empresa
DROP INDEX IF EXISTS idx_customers_document_company;
CREATE UNIQUE INDEX idx_customers_document_company
  ON customers(document, company_id)
  WHERE document IS NOT NULL;

-- 4. Adicionar customer_id nos pedidos do catálogo
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- 5. Índice para buscar pedidos por cliente
CREATE INDEX IF NOT EXISTS idx_catalog_orders_customer_id ON catalog_orders(customer_id);

-- 6. Comentários para documentação
COMMENT ON COLUMN customers.phone_has_whatsapp IS 'Se o telefone foi verificado como tendo WhatsApp';
COMMENT ON COLUMN customers.source IS 'Origem do cadastro: manual (admin) ou catalog (checkout)';
COMMENT ON COLUMN customers.total_orders IS 'Total de pedidos do cliente';
COMMENT ON COLUMN customers.total_spent IS 'Valor total gasto pelo cliente';
COMMENT ON COLUMN customers.last_order_at IS 'Data do último pedido';
COMMENT ON COLUMN catalog_orders.customer_id IS 'Cliente cadastrado (opcional)';

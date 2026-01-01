-- ============================================
-- Catalog Orders - Pedidos do Catalogo Publico
-- ============================================

-- Adicionar campo phone na tabela companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;

-- Status dos pedidos do catalogo
-- pending: aguardando confirmacao da empresa
-- confirmed: empresa confirmou o pedido
-- cancelled: pedido cancelado
-- completed: pedido entregue/finalizado

-- Pedidos do Catalogo (diferentes de sales que sao internos)
CREATE TABLE catalog_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- Dados do cliente (nao precisa estar cadastrado)
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_notes TEXT,

  -- Totais
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  -- Status do pedido
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Itens do Pedido do Catalogo
CREATE TABLE catalog_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES catalog_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_catalog_orders_company ON catalog_orders(company_id);
CREATE INDEX idx_catalog_orders_status ON catalog_orders(status);
CREATE INDEX idx_catalog_orders_created ON catalog_orders(created_at DESC);
CREATE INDEX idx_catalog_order_items_order ON catalog_order_items(order_id);

-- Trigger para updated_at
CREATE TRIGGER update_catalog_orders_updated_at
  BEFORE UPDATE ON catalog_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Policies para catalog_orders
-- ============================================

ALTER TABLE catalog_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_order_items ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode criar pedido (catalogo publico)
CREATE POLICY "Anyone can create catalog orders"
  ON catalog_orders FOR INSERT
  WITH CHECK (true);

-- Qualquer um pode criar itens de pedido
CREATE POLICY "Anyone can create catalog order items"
  ON catalog_order_items FOR INSERT
  WITH CHECK (true);

-- Membros da empresa podem ver pedidos
CREATE POLICY "Company members can view catalog orders"
  ON catalog_orders FOR SELECT
  USING (true);

-- Membros da empresa podem ver itens
CREATE POLICY "Company members can view catalog order items"
  ON catalog_order_items FOR SELECT
  USING (true);

-- Membros da empresa podem atualizar status
CREATE POLICY "Company members can update catalog orders"
  ON catalog_orders FOR UPDATE
  USING (true);

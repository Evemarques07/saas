-- ============================================================
-- MIGRATION: Funções FIFO
-- Funções: allocate_fifo, register_stock_entry,
--          cancel_sale_fifo, update_sale_cost_totals
-- Nota: Todas usam SECURITY DEFINER para bypassar RLS
-- ============================================================

-- ============================================================
-- FUNÇÃO: register_stock_entry
-- Registra entrada de estoque com lote FIFO
-- Retorna o UUID do stock_entry criado
-- ============================================================

CREATE OR REPLACE FUNCTION register_stock_entry(
  p_company_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_unit_cost DECIMAL(10,2),
  p_supplier TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_received_at TIMESTAMPTZ DEFAULT now(),
  p_user_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_new_stock INTEGER;
BEGIN
  -- Validações
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero';
  END IF;
  IF p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Custo unitário não pode ser negativo';
  END IF;

  -- Cria o lote de entrada
  INSERT INTO stock_entries (
    company_id, product_id, unit_cost,
    quantity_received, quantity_remaining,
    supplier, invoice_number, notes, received_at
  ) VALUES (
    p_company_id, p_product_id, p_unit_cost,
    p_quantity, p_quantity,
    p_supplier, p_invoice_number, p_notes, p_received_at
  )
  RETURNING id INTO v_entry_id;

  -- Atualiza estoque do produto (mantém compatibilidade)
  UPDATE products
  SET stock = stock + p_quantity,
      cost_price = p_unit_cost
  WHERE id = p_product_id;

  SELECT stock INTO v_new_stock
  FROM products WHERE id = p_product_id;

  -- Registra movimentação
  INSERT INTO stock_movements (
    company_id, product_id, entry_id, type,
    quantity, unit_cost, balance_after, notes, created_by
  ) VALUES (
    p_company_id, p_product_id, v_entry_id, 'entry',
    p_quantity, p_unit_cost, v_new_stock,
    COALESCE(p_notes, 'Entrada de estoque'),
    p_user_id
  );

  RETURN v_entry_id;
END;
$$;

-- ============================================================
-- FUNÇÃO: allocate_fifo
-- Aloca estoque pelo método FIFO para um item de venda.
-- Retorna o custo total (CMV) alocado.
-- ============================================================

CREATE OR REPLACE FUNCTION allocate_fifo(
  p_sale_item_id UUID,
  p_product_id UUID,
  p_company_id UUID,
  p_quantity INTEGER,
  p_seller_id TEXT DEFAULT NULL
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_cost_total DECIMAL(10,2) := 0;
  v_entry RECORD;
  v_take INTEGER;
  v_current_stock INTEGER;
BEGIN
  -- Validação
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero';
  END IF;

  -- Percorre lotes do mais antigo para o mais recente (FIFO)
  FOR v_entry IN
    SELECT id, unit_cost, quantity_remaining
    FROM stock_entries
    WHERE product_id = p_product_id
      AND company_id = p_company_id
      AND quantity_remaining > 0
    ORDER BY received_at ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- Quanto tirar deste lote
    v_take := LEAST(v_remaining, v_entry.quantity_remaining);

    -- Registra alocação FIFO
    INSERT INTO sale_item_costs (sale_item_id, entry_id, quantity, unit_cost)
    VALUES (p_sale_item_id, v_entry.id, v_take, v_entry.unit_cost);

    -- Atualiza estoque restante do lote
    UPDATE stock_entries
    SET quantity_remaining = quantity_remaining - v_take
    WHERE id = v_entry.id;

    -- Acumula custo
    v_cost_total := v_cost_total + (v_take * v_entry.unit_cost);
    v_remaining := v_remaining - v_take;
  END LOOP;

  -- Se não havia estoque suficiente nos lotes FIFO
  IF v_remaining > 0 THEN
    -- Permite venda sem lote — registra aviso
    INSERT INTO stock_movements (
      company_id, product_id, type, quantity,
      unit_cost, balance_after, notes, created_by
    ) VALUES (
      p_company_id, p_product_id, 'adjustment', 0,
      0, 0,
      'FIFO: ' || v_remaining || ' unid. vendidas sem lote de entrada associado',
      p_seller_id
    );
  END IF;

  -- Atualiza products.stock (mantém compatibilidade)
  UPDATE products
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_product_id;

  -- Busca estoque atualizado para o log
  SELECT stock INTO v_current_stock
  FROM products WHERE id = p_product_id;

  -- Registra movimentação de saída
  INSERT INTO stock_movements (
    company_id, product_id, sale_item_id, type,
    quantity, unit_cost, balance_after, created_by
  ) VALUES (
    p_company_id, p_product_id, p_sale_item_id, 'sale',
    -p_quantity,
    CASE WHEN p_quantity > 0 THEN v_cost_total / p_quantity ELSE 0 END,
    v_current_stock, p_seller_id
  );

  -- Atualiza custo e lucro no sale_item
  UPDATE sale_items
  SET cost_total = v_cost_total,
      profit = total - v_cost_total
  WHERE id = p_sale_item_id;

  RETURN v_cost_total;
END;
$$;

-- ============================================================
-- FUNÇÃO: update_sale_cost_totals
-- Recalcula cost_total e gross_profit na tabela sales
-- ============================================================

CREATE OR REPLACE FUNCTION update_sale_cost_totals(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(cost_total), 0)
  INTO v_cost
  FROM sale_items
  WHERE sale_id = p_sale_id;

  UPDATE sales
  SET cost_total = v_cost,
      gross_profit = total - v_cost
  WHERE id = p_sale_id;
END;
$$;

-- ============================================================
-- FUNÇÃO: cancel_sale_fifo
-- Reverte alocação FIFO ao cancelar uma venda.
-- Restaura estoque nos lotes originais.
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_sale_fifo(
  p_sale_id UUID,
  p_user_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_cost RECORD;
  v_company_id UUID;
  v_new_stock INTEGER;
BEGIN
  -- Busca company_id da venda
  SELECT company_id INTO v_company_id
  FROM sales WHERE id = p_sale_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Venda não encontrada: %', p_sale_id;
  END IF;

  -- Para cada item da venda
  FOR v_item IN
    SELECT id, product_id, quantity
    FROM sale_items
    WHERE sale_id = p_sale_id
  LOOP
    -- Restaura estoque em cada lote FIFO alocado
    FOR v_cost IN
      SELECT entry_id, quantity, unit_cost
      FROM sale_item_costs
      WHERE sale_item_id = v_item.id
    LOOP
      UPDATE stock_entries
      SET quantity_remaining = quantity_remaining + v_cost.quantity
      WHERE id = v_cost.entry_id;
    END LOOP;

    -- Remove alocações FIFO
    DELETE FROM sale_item_costs
    WHERE sale_item_id = v_item.id;

    -- Restaura estoque do produto
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;

    SELECT stock INTO v_new_stock
    FROM products WHERE id = v_item.product_id;

    -- Registra movimentação de cancelamento
    INSERT INTO stock_movements (
      company_id, product_id, sale_item_id, type,
      quantity, balance_after, notes, created_by
    ) VALUES (
      v_company_id, v_item.product_id, v_item.id, 'cancellation',
      v_item.quantity, v_new_stock,
      'Cancelamento da venda ' || p_sale_id,
      p_user_id
    );

    -- Limpa custo do sale_item
    UPDATE sale_items
    SET cost_total = NULL, profit = NULL
    WHERE id = v_item.id;
  END LOOP;

  -- Atualiza venda
  UPDATE sales
  SET status = 'cancelled',
      cost_total = NULL,
      gross_profit = NULL
  WHERE id = p_sale_id;
END;
$$;

# Sistema FIFO - Documentação de Implementação

> **Objetivo:** Implementar o método de custeio FIFO (First In, First Out / PEPS - Primeiro que Entra, Primeiro que Sai) para controle de custo de estoque, cálculo de CMV (Custo da Mercadoria Vendida) e lucro bruto — sem quebrar nenhuma lógica existente.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Situação Atual do Sistema](#2-situação-atual-do-sistema)
3. [Arquitetura FIFO Proposta](#3-arquitetura-fifo-proposta)
4. [Migrations (Banco de Dados)](#4-migrations-banco-de-dados)
5. [Lógica de Negócio](#5-lógica-de-negócio)
6. [Alterações no Frontend](#6-alterações-no-frontend)
7. [Compatibilidade com Fluxos Existentes](#7-compatibilidade-com-fluxos-existentes)
8. [Relatórios e Dashboard](#8-relatórios-e-dashboard)
9. [Plano de Migração de Dados](#9-plano-de-migração-de-dados)
10. [Ordem de Implementação](#10-ordem-de-implementação)
11. [Testes e Validação](#11-testes-e-validação)
12. [Glossário](#12-glossário)

---

## 1. Visão Geral

### O que é FIFO?

FIFO (First In, First Out) assume que os **primeiros itens comprados são os primeiros a serem vendidos**. Cada entrada de estoque (lote) mantém seu custo unitário original. Ao vender, o sistema consome unidades dos lotes mais antigos primeiro.

### Exemplo Prático

```
Entrada 1: 10 anéis a R$ 50,00 cada (01/jan)
Entrada 2:  5 anéis a R$ 60,00 cada (15/jan)
Entrada 3:  8 anéis a R$ 55,00 cada (01/fev)

Venda de 12 anéis a R$ 120,00 cada:
  FIFO consome:
    10 unid. do Lote 1 → custo = 10 × R$ 50 = R$ 500
     2 unid. do Lote 2 → custo =  2 × R$ 60 = R$ 120
  
  CMV total  = R$ 620,00
  Receita    = 12 × R$ 120 = R$ 1.440,00
  Lucro Bruto = R$ 1.440 - R$ 620 = R$ 820,00
  Margem     = 56,9%
```

### Benefícios

- Custo real por venda (mesmo com preços de compra diferentes)
- Lucro bruto preciso por venda, produto e período
- Valoração de estoque fidedigna
- Rastreabilidade completa de movimentações
- Conformidade com práticas contábeis (PEPS é aceito pela Receita Federal)

---

## 2. Situação Atual do Sistema

### 2.1 Tabelas Envolvidas

#### `products` (campos relevantes)
| Campo | Tipo | Uso Atual |
|-------|------|-----------|
| `price` | DECIMAL(10,2) | Preço de venda |
| `cost_price` | DECIMAL(10,2) | Custo manual — **não usado em cálculos** |
| `stock` | INTEGER | Contador simples de estoque |
| `min_stock` | INTEGER | Estoque mínimo para alerta |

#### `sales`
| Campo | Tipo | Uso Atual |
|-------|------|-----------|
| `subtotal` | DECIMAL(10,2) | Soma dos itens (receita) |
| `discount` | DECIMAL(10,2) | Desconto aplicado |
| `total` | DECIMAL(10,2) | Subtotal - desconto |
| `status` | TEXT | 'pending' / 'completed' / 'cancelled' |

#### `sale_items`
| Campo | Tipo | Uso Atual |
|-------|------|-----------|
| `product_id` | UUID | Referência ao produto |
| `product_name` | TEXT | Nome snapshot |
| `quantity` | INTEGER | Quantidade vendida |
| `unit_price` | DECIMAL(10,2) | Preço de venda unitário |
| `total` | DECIMAL(10,2) | quantity × unit_price |

### 2.2 Fluxos Atuais

#### Venda Direta (`SalesPage.tsx`, linhas 178-230)
```
1. Cria registro em `sales` (status='completed')
2. Cria registros em `sale_items` (só preço de venda)
3. Atualiza `products.stock` = stock - quantity (race condition)
4. Imprime recibo se auto_print habilitado
```

#### Pedido do Catálogo (`CatalogOrdersPage.tsx`, linhas 95-156)
```
1. Admin muda status para 'completed'
2. convertOrderToSale() cria sale + sale_items
3. Atualiza products.stock (lê do banco, Math.max(0, ...))
```

#### Cancelamento de Venda (`SalesPage.tsx`, linhas 331-364)
```
1. Atualiza sale.status = 'cancelled'
2. Adiciona nota ao campo notes
3. ⚠️ NÃO restaura estoque
```

### 2.3 Problemas Identificados

| Problema | Impacto |
|----------|---------|
| `cost_price` é campo decorativo | Impossível calcular lucro |
| Sem histórico de movimentação | Sem rastreabilidade |
| Race condition no estoque | Estoque pode ficar negativo |
| Cancelamento não restaura estoque | Perda de estoque fantasma |
| Sem custo na `sale_items` | Impossível calcular CMV retroativamente |
| Estoque é contador único | Impossível diferenciar lotes/custos |

---

## 3. Arquitetura FIFO Proposta

### 3.1 Novas Tabelas

```
┌──────────────────┐     ┌──────────────────────┐
│  stock_entries    │     │  stock_movements     │
│  (lotes/entradas) │     │  (auditoria)         │
├──────────────────┤     ├──────────────────────┤
│ id               │     │ id                   │
│ company_id       │     │ company_id           │
│ product_id  ────────┐  │ product_id           │
│ unit_cost        │  │  │ entry_id (nullable)  │
│ quantity_received│  │  │ sale_item_id (null.) │
│ quantity_remaining│ │  │ type (in/out/cancel) │
│ supplier         │  │  │ quantity             │
│ invoice_number   │  │  │ unit_cost            │
│ notes            │  │  │ notes                │
│ received_at      │  │  │ created_at           │
│ created_at       │  │  └──────────────────────┘
└──────────────────┘  │
                      │  ┌──────────────────────┐
                      │  │  sale_item_costs      │
                      │  │  (alocação FIFO)      │
                      │  ├──────────────────────┤
                      └──│ entry_id             │
                         │ sale_item_id         │
                         │ quantity             │
                         │ unit_cost            │
                         │ created_at           │
                         └──────────────────────┘
```

### 3.2 Modelo de Dados Detalhado

#### `stock_entries` — Lotes de Entrada

Cada registro representa uma compra/entrada de mercadoria com custo específico.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador |
| `company_id` | UUID FK | Empresa (multi-tenant) |
| `product_id` | UUID FK | Produto |
| `unit_cost` | DECIMAL(10,2) NOT NULL | Custo unitário do lote |
| `quantity_received` | INTEGER NOT NULL | Quantidade recebida |
| `quantity_remaining` | INTEGER NOT NULL | Quantidade ainda em estoque (FIFO) |
| `supplier` | TEXT | Fornecedor (opcional) |
| `invoice_number` | TEXT | Nota fiscal (opcional) |
| `notes` | TEXT | Observações |
| `received_at` | TIMESTAMPTZ NOT NULL | Data de recebimento (ordena o FIFO) |
| `created_at` | TIMESTAMPTZ | Criação do registro |

**Regra:** `quantity_remaining` inicia igual a `quantity_received` e diminui conforme vendas são feitas.

#### `sale_item_costs` — Alocação FIFO por Venda

Vincula cada item vendido aos lotes de onde o custo foi consumido. Um `sale_item` pode consumir de **múltiplos lotes**.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador |
| `sale_item_id` | UUID FK | Item da venda |
| `entry_id` | UUID FK | Lote de origem |
| `quantity` | INTEGER NOT NULL | Quantidade consumida deste lote |
| `unit_cost` | DECIMAL(10,2) NOT NULL | Custo unitário (snapshot do lote) |
| `created_at` | TIMESTAMPTZ | Criação do registro |

**Regra:** A soma de `sale_item_costs.quantity` para um `sale_item_id` deve ser igual a `sale_items.quantity`.

#### `stock_movements` — Log de Auditoria

Registra toda movimentação para rastreabilidade completa.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Identificador |
| `company_id` | UUID FK | Empresa |
| `product_id` | UUID FK | Produto |
| `entry_id` | UUID FK (nullable) | Lote associado (se entrada) |
| `sale_item_id` | UUID FK (nullable) | Item da venda (se saída) |
| `type` | TEXT | 'entry', 'sale', 'cancellation', 'adjustment' |
| `quantity` | INTEGER NOT NULL | Qtd movimentada (positivo=entrada, negativo=saída) |
| `unit_cost` | DECIMAL(10,2) | Custo unitário |
| `balance_after` | INTEGER | Estoque total após movimento |
| `notes` | TEXT | Observações |
| `created_by` | UUID FK (nullable) | Usuário que realizou |
| `created_at` | TIMESTAMPTZ | Data/hora |

### 3.3 Alterações em Tabelas Existentes

#### `sale_items` — Adicionar campos de custo

| Campo Novo | Tipo | Descrição |
|------------|------|-----------|
| `cost_total` | DECIMAL(10,2) | CMV total do item (calculado pelo FIFO) |
| `profit` | DECIMAL(10,2) | Lucro bruto do item (total - cost_total) |

> **Nota:** `cost_total` e `profit` são campos desnormalizados para performance em queries de relatório.

#### `sales` — Adicionar campos de custo

| Campo Novo | Tipo | Descrição |
|------------|------|-----------|
| `cost_total` | DECIMAL(10,2) | CMV total da venda |
| `gross_profit` | DECIMAL(10,2) | Lucro bruto (total - cost_total) |

---

## 4. Migrations (Banco de Dados)

### Migration 1: Criar tabelas FIFO

**Arquivo:** `supabase/migrations/YYYYMMDD000001_create_fifo_tables.sql`

```sql
-- ============================================================
-- MIGRATION: Sistema FIFO - Criação de Tabelas
-- Descrição: Cria stock_entries, sale_item_costs, stock_movements
-- ============================================================

-- 1. Tabela de Lotes de Entrada
CREATE TABLE stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  supplier TEXT,
  invoice_number TEXT,
  notes TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- quantity_remaining nunca pode exceder quantity_received
  CONSTRAINT chk_remaining_le_received 
    CHECK (quantity_remaining <= quantity_received)
);

-- 2. Tabela de Alocação FIFO (vínculo sale_item ↔ stock_entry)
CREATE TABLE sale_item_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES stock_entries(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Movimentações (auditoria)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('entry', 'sale', 'cancellation', 'adjustment')),
  quantity INTEGER NOT NULL, -- positivo = entrada, negativo = saída
  unit_cost DECIMAL(10,2),
  balance_after INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- stock_entries: busca FIFO (mais antigo com estoque disponível)
CREATE INDEX idx_stock_entries_fifo 
  ON stock_entries (product_id, received_at ASC) 
  WHERE quantity_remaining > 0;

CREATE INDEX idx_stock_entries_company 
  ON stock_entries (company_id);

CREATE INDEX idx_stock_entries_product 
  ON stock_entries (product_id);

-- sale_item_costs: busca por item da venda e por lote
CREATE INDEX idx_sale_item_costs_sale_item 
  ON sale_item_costs (sale_item_id);

CREATE INDEX idx_sale_item_costs_entry 
  ON sale_item_costs (entry_id);

-- stock_movements: busca por produto e histórico
CREATE INDEX idx_stock_movements_product 
  ON stock_movements (product_id, created_at DESC);

CREATE INDEX idx_stock_movements_company 
  ON stock_movements (company_id, created_at DESC);

CREATE INDEX idx_stock_movements_type 
  ON stock_movements (type);
```

### Migration 2: Adicionar campos de custo nas tabelas existentes

**Arquivo:** `supabase/migrations/YYYYMMDD000002_add_cost_fields.sql`

```sql
-- ============================================================
-- MIGRATION: Adicionar campos de custo em sale_items e sales
-- Nota: Campos são NULLABLE para não quebrar registros existentes
-- ============================================================

-- Campos de custo nos itens da venda
ALTER TABLE sale_items 
  ADD COLUMN cost_total DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN profit DECIMAL(10,2) DEFAULT NULL;

-- Campos de custo no cabeçalho da venda
ALTER TABLE sales 
  ADD COLUMN cost_total DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN gross_profit DECIMAL(10,2) DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN sale_items.cost_total IS 'CMV do item calculado via FIFO';
COMMENT ON COLUMN sale_items.profit IS 'Lucro bruto = total - cost_total';
COMMENT ON COLUMN sales.cost_total IS 'CMV total da venda (soma dos itens)';
COMMENT ON COLUMN sales.gross_profit IS 'Lucro bruto = total - cost_total';
```

### Migration 3: RLS Policies

**Arquivo:** `supabase/migrations/YYYYMMDD000003_fifo_rls_policies.sql`

```sql
-- ============================================================
-- MIGRATION: RLS para tabelas FIFO
-- Segue o mesmo padrão de segurança multi-tenant existente
-- ============================================================

ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- stock_entries: membros da empresa podem ler, owners/admins podem inserir/editar
CREATE POLICY "stock_entries_select" ON stock_entries
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "stock_entries_insert" ON stock_entries
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() 
        AND status = 'active' 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "stock_entries_update" ON stock_entries
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() 
        AND status = 'active' 
        AND role IN ('owner', 'admin')
    )
  );

-- sale_item_costs: leitura via empresa do sale_item
CREATE POLICY "sale_item_costs_select" ON sale_item_costs
  FOR SELECT USING (
    sale_item_id IN (
      SELECT si.id FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "sale_item_costs_insert" ON sale_item_costs
  FOR INSERT WITH CHECK (
    sale_item_id IN (
      SELECT si.id FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.company_id IN (
        SELECT company_id FROM company_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- stock_movements: mesma lógica de company_members
CREATE POLICY "stock_movements_select" ON stock_movements
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "stock_movements_insert" ON stock_movements
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policies para service_role (edge functions)
-- O service_role bypassa RLS automaticamente no Supabase
```

### Migration 4: Função FIFO no Banco

**Arquivo:** `supabase/migrations/YYYYMMDD000004_fifo_allocate_function.sql`

```sql
-- ============================================================
-- FUNÇÃO: allocate_fifo
-- Aloca estoque pelo método FIFO para um item de venda.
-- Chamada após criar o sale_item.
-- Retorna o custo total (CMV) alocado.
-- ============================================================

CREATE OR REPLACE FUNCTION allocate_fifo(
  p_sale_item_id UUID,
  p_product_id UUID,
  p_company_id UUID,
  p_quantity INTEGER,
  p_seller_id UUID DEFAULT NULL
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
    FOR UPDATE  -- Lock para evitar race condition
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
    -- Aloca o restante com custo zero (sem lote de origem)
    -- Isso permite a venda mesmo sem entrada formal
    -- O custo ficará subestimado, mas não bloqueia a operação
    -- Registra como movimento de ajuste
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
    -p_quantity, v_cost_total / p_quantity, v_current_stock, p_seller_id
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
-- FUNÇÃO: register_stock_entry
-- Registra entrada de estoque e atualiza products.stock
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
  p_user_id UUID DEFAULT NULL
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
      cost_price = p_unit_cost  -- Atualiza custo mais recente como referência
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
-- FUNÇÃO: cancel_sale_fifo
-- Reverte alocação FIFO ao cancelar uma venda.
-- Restaura estoque nos lotes originais.
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_sale_fifo(
  p_sale_id UUID,
  p_user_id UUID DEFAULT NULL
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

  -- Atualiza venda: limpa custo e lucro
  UPDATE sales
  SET status = 'cancelled',
      cost_total = NULL,
      gross_profit = NULL
  WHERE id = p_sale_id;
END;
$$;

-- ============================================================
-- FUNÇÃO: update_sale_cost_totals
-- Recalcula cost_total e gross_profit na tabela sales
-- Chamada após inserir todos os sale_items de uma venda
-- ============================================================

CREATE OR REPLACE FUNCTION update_sale_cost_totals(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(cost_total), 0), COALESCE(SUM(total), 0)
  INTO v_cost, v_total
  FROM sale_items
  WHERE sale_id = p_sale_id;

  UPDATE sales
  SET cost_total = v_cost,
      gross_profit = total - v_cost
  WHERE id = p_sale_id;
END;
$$;
```

---

## 5. Lógica de Negócio

### 5.1 Fluxo de Entrada de Estoque (Novo)

```
Usuário preenche formulário de entrada
          │
          ▼
┌──────────────────────────┐
│  Dados da entrada:       │
│  - Produto               │
│  - Quantidade            │
│  - Custo unitário (R$)   │
│  - Fornecedor (opcional) │
│  - NF (opcional)         │
│  - Data recebimento      │
└──────────┬───────────────┘
           │
           ▼
   RPC: register_stock_entry()
           │
           ├── Cria stock_entries (lote)
           ├── Atualiza products.stock += quantidade
           ├── Atualiza products.cost_price = custo mais recente
           └── Cria stock_movements (type='entry')
```

**Código TypeScript (service):**

```typescript
// src/services/stockService.ts

import { supabase } from './supabase';

interface StockEntryData {
  companyId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  supplier?: string;
  invoiceNumber?: string;
  notes?: string;
  receivedAt?: string;
}

export async function registerStockEntry(data: StockEntryData, userId?: string) {
  const { data: result, error } = await supabase.rpc('register_stock_entry', {
    p_company_id: data.companyId,
    p_product_id: data.productId,
    p_quantity: data.quantity,
    p_unit_cost: data.unitCost,
    p_supplier: data.supplier || null,
    p_invoice_number: data.invoiceNumber || null,
    p_notes: data.notes || null,
    p_received_at: data.receivedAt || new Date().toISOString(),
    p_user_id: userId || null,
  });

  if (error) throw error;
  return result; // retorna entry_id
}
```

### 5.2 Fluxo de Venda com FIFO (Alteração)

```
Fluxo atual de venda (SalesPage.tsx)
          │
          ▼
1. Cria sale (sem mudança)
2. Cria sale_items (sem mudança)
3. ██ NOVO: Para cada sale_item ██
   │
   ▼
   RPC: allocate_fifo(sale_item_id, product_id, company_id, quantity)
   │
   ├── Percorre stock_entries (mais antigo primeiro)
   │   ├── Consome quantity_remaining do lote
   │   ├── Cria sale_item_costs (vínculo item ↔ lote)
   │   └── Repete até alocar toda a quantidade
   │
   ├── Atualiza products.stock (mantém compatível)
   ├── Atualiza sale_items.cost_total e .profit
   └── Cria stock_movements (type='sale')
   
4. ██ NOVO: Após todos os itens ██
   │
   ▼
   RPC: update_sale_cost_totals(sale_id)
   │
   └── Calcula sales.cost_total e .gross_profit

5. Imprime recibo (sem mudança)
```

**Alteração em `SalesPage.tsx`:**

```typescript
// ANTES (linhas 224-230):
for (const item of cart) {
  await supabase
    .from('products')
    .update({ stock: item.product.stock - item.quantity })
    .eq('id', item.product.id);
}

// DEPOIS:
for (const saleItem of insertedSaleItems) {
  await supabase.rpc('allocate_fifo', {
    p_sale_item_id: saleItem.id,
    p_product_id: saleItem.product_id,
    p_company_id: currentCompany.id,
    p_quantity: saleItem.quantity,
    p_seller_id: user.id,
  });
}

// Atualiza totais de custo na venda
await supabase.rpc('update_sale_cost_totals', {
  p_sale_id: saleId,
});
```

> **Importante:** O `allocate_fifo` já atualiza `products.stock`, então a atualização manual anterior é **removida** (não duplicada).

### 5.3 Fluxo de Cancelamento com Reversão (Alteração)

```
ANTES:
  1. sale.status = 'cancelled'
  2. Adiciona nota
  3. Estoque perdido ❌

DEPOIS:
  1. RPC: cancel_sale_fifo(sale_id, user_id)
     ├── Restaura quantity_remaining nos lotes
     ├── Remove sale_item_costs
     ├── Restaura products.stock
     ├── Cria stock_movements (type='cancellation')
     └── Atualiza sale.status = 'cancelled'
```

**Alteração em `SalesPage.tsx`:**

```typescript
// ANTES (linhas 331-364):
await supabase
  .from('sales')
  .update({ status: 'cancelled', notes: ... })
  .eq('id', saleId);

// DEPOIS:
await supabase.rpc('cancel_sale_fifo', {
  p_sale_id: saleId,
  p_user_id: user.id,
});
// Nota adicional se necessário:
await supabase
  .from('sales')
  .update({ notes: ... })
  .eq('id', saleId);
```

### 5.4 Fluxo de Pedido do Catálogo (Alteração)

A função `convertOrderToSale()` em `CatalogOrdersPage.tsx` segue a mesma lógica:

```typescript
// ANTES (linhas 136-153): atualização manual de stock

// DEPOIS: usar allocate_fifo para cada item, igual à venda direta
for (const saleItem of insertedSaleItems) {
  await supabase.rpc('allocate_fifo', {
    p_sale_item_id: saleItem.id,
    p_product_id: saleItem.product_id,
    p_company_id: currentCompany.id,
    p_quantity: saleItem.quantity,
  });
}
await supabase.rpc('update_sale_cost_totals', { p_sale_id: saleId });
```

---

## 6. Alterações no Frontend

### 6.1 Novos Types (`src/types/index.ts`)

```typescript
// Adicionar ao arquivo de tipos existente:

export interface StockEntry {
  id: string;
  company_id: string;
  product_id: string;
  unit_cost: number;
  quantity_received: number;
  quantity_remaining: number;
  supplier: string | null;
  invoice_number: string | null;
  notes: string | null;
  received_at: string;
  created_at: string;
  product?: Product;
}

export interface SaleItemCost {
  id: string;
  sale_item_id: string;
  entry_id: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  entry_id: string | null;
  sale_item_id: string | null;
  type: 'entry' | 'sale' | 'cancellation' | 'adjustment';
  quantity: number;
  unit_cost: number | null;
  balance_after: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
}

// Atualizar SaleItem existente:
export interface SaleItem {
  // ... campos existentes ...
  cost_total: number | null;    // NOVO
  profit: number | null;        // NOVO
}

// Atualizar Sale existente:
export interface Sale {
  // ... campos existentes ...
  cost_total: number | null;     // NOVO
  gross_profit: number | null;   // NOVO
}
```

### 6.2 Nova Página: Entrada de Estoque

**Arquivo:** `src/modules/products/StockEntryPage.tsx`

Funcionalidades:
- Formulário para registrar entrada de estoque
- Campos: produto (select), quantidade, custo unitário, fornecedor, NF, data, observações
- Tabela com histórico de entradas do produto selecionado
- Totalizador: custo total da entrada (quantidade × custo unitário)
- Botão de entrada rápida (só produto, quantidade e custo)

**Layout sugerido:**

```
┌─────────────────────────────────────────────────────┐
│ Entrada de Estoque                          [+ Nova] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Produto: [Select com busca ▼]                      │
│                                                      │
│  Quantidade: [___]    Custo Unitário: R$ [___]      │
│                                                      │
│  Fornecedor: [___________]   NF: [___________]      │
│                                                      │
│  Data Recebimento: [___/___/___]                    │
│                                                      │
│  Observações: [________________________]            │
│                                                      │
│  Custo Total: R$ 0,00        [Registrar Entrada]    │
│                                                      │
├─────────────────────────────────────────────────────┤
│ Últimas Entradas                                     │
├──────┬────────┬──────┬──────────┬───────┬───────────┤
│ Data │Produto │ Qtd  │ Custo Un.│ Total │Fornecedor │
├──────┼────────┼──────┼──────────┼───────┼───────────┤
│ 01/02│ Anel X │  10  │ R$ 50,00 │R$ 500 │ Forn. A   │
│ 15/01│ Anel X │   5  │ R$ 60,00 │R$ 300 │ Forn. B   │
└──────┴────────┴──────┴──────────┴───────┴───────────┘
```

### 6.3 Nova Página: Movimentações de Estoque

**Arquivo:** `src/modules/products/StockMovementsPage.tsx`

Funcionalidades:
- Filtro por produto, tipo de movimentação, período
- Tabela com histórico completo
- Cores por tipo: verde (entrada), vermelho (saída/venda), amarelo (cancelamento), cinza (ajuste)

### 6.4 Alterações em Páginas Existentes

#### `ProductsPage.tsx`
- **Botão "Entrada de Estoque"** ao lado do botão existente de adicionar produto
- **Coluna "Custo Médio FIFO"** na tabela (calculado: soma custo restante / soma qtd restante)
- **No form de produto:** campo `stock` passa a ser **somente leitura** (controlado pelas entradas)
  - Para produtos novos: permitir estoque inicial que cria um `stock_entry` automaticamente
- **Campo `cost_price`:** manter como referência, mas indicar que o custo real vem do FIFO

#### `SalesPage.tsx`
- **Na criação da venda:** chamar `allocate_fifo` em vez de atualizar stock manualmente
- **No cancelamento:** chamar `cancel_sale_fifo` em vez de só mudar status
- **No modal de detalhes da venda:** mostrar CMV e lucro bruto
- **Na lista de vendas:** coluna opcional de lucro bruto

#### `DashboardPage.tsx`
- **Novo card:** "Lucro Bruto" (soma de `sales.gross_profit` do período)
- **Novo card:** "Margem Média" (lucro bruto / receita × 100)
- **Gráfico:** receita vs custo vs lucro ao longo do tempo

#### `CatalogOrdersPage.tsx`
- **Em `convertOrderToSale`:** usar `allocate_fifo` em vez de atualizar stock manualmente

### 6.5 Sidebar / Rotas

Adicionar ao menu (em `Sidebar.tsx`):
```
Produtos
  ├── Lista de Produtos    (existente)
  ├── Entrada de Estoque   (NOVO)
  └── Movimentações        (NOVO)
```

Adicionar rotas (em `routes/`):
```typescript
{ path: 'stock-entry', element: <StockEntryPage /> }
{ path: 'stock-movements', element: <StockMovementsPage /> }
```

---

## 7. Compatibilidade com Fluxos Existentes

### 7.1 Princípio: Nada Quebra

Toda a implementação segue o princípio de **adição sem remoção**:

| Aspecto | Garantia de Compatibilidade |
|---------|---------------------------|
| `products.stock` | Continua sendo atualizado — agora via funções SQL em vez de update direto |
| `products.cost_price` | Continua existindo — atualizado com o custo mais recente a cada entrada |
| `sale_items` existentes | Campos `cost_total` e `profit` são NULLABLE — vendas antigas ficam com NULL |
| `sales` existentes | Campos `cost_total` e `gross_profit` são NULLABLE — vendas antigas ficam com NULL |
| Catálogo público | Sem alteração — não mostra custo |
| Impressão de recibos | Sem alteração — não mostra custo |
| Importação Excel | Continua funcionando — `cost_price` importado pode virar entrada inicial |

### 7.2 Vendas Sem Lote FIFO

Se um produto for vendido sem ter entradas FIFO cadastradas:

1. A função `allocate_fifo` **não bloqueia** a venda
2. Registra um `stock_movement` do tipo `adjustment` com nota explicativa
3. O custo fica como R$ 0,00 para as unidades sem lote
4. O campo `products.stock` é atualizado normalmente
5. O usuário pode cadastrar entradas retroativas e recalcular

### 7.3 Estoque Inicial (Migração)

Produtos que já têm estoque antes do FIFO precisam de um lote inicial. Ver [Seção 9](#9-plano-de-migração-de-dados).

### 7.4 Campo `stock` como Fonte de Verdade

O campo `products.stock` continua sendo a fonte de verdade para:
- Exibição na lista de produtos
- Validação de estoque no carrinho (`CartContext.tsx`)
- Alerta de estoque mínimo
- Catálogo público (disponibilidade)

A diferença é que agora ele é atualizado **pelas funções SQL** (`register_stock_entry`, `allocate_fifo`, `cancel_sale_fifo`) em vez de updates diretos do frontend.

> **Consistência:** `products.stock` deve sempre ser igual a `SUM(quantity_remaining)` de todos os `stock_entries` do produto. Pode-se criar uma verificação periódica para isso.

---

## 8. Relatórios e Dashboard

### 8.1 Queries de Relatório

#### Lucro Bruto por Período

```sql
SELECT 
  DATE_TRUNC('month', s.created_at) AS mes,
  SUM(s.total) AS receita,
  SUM(s.cost_total) AS cmv,
  SUM(s.gross_profit) AS lucro_bruto,
  CASE 
    WHEN SUM(s.total) > 0 
    THEN ROUND(SUM(s.gross_profit) / SUM(s.total) * 100, 2)
    ELSE 0 
  END AS margem_pct
FROM sales s
WHERE s.company_id = $1
  AND s.status = 'completed'
  AND s.created_at BETWEEN $2 AND $3
GROUP BY DATE_TRUNC('month', s.created_at)
ORDER BY mes;
```

#### Lucro por Produto

```sql
SELECT 
  si.product_name,
  SUM(si.quantity) AS qtd_vendida,
  SUM(si.total) AS receita,
  SUM(si.cost_total) AS cmv,
  SUM(si.profit) AS lucro,
  CASE 
    WHEN SUM(si.total) > 0 
    THEN ROUND(SUM(si.profit) / SUM(si.total) * 100, 2)
    ELSE 0 
  END AS margem_pct
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.company_id = $1
  AND s.status = 'completed'
  AND s.created_at BETWEEN $2 AND $3
GROUP BY si.product_name
ORDER BY lucro DESC;
```

#### Valoração do Estoque (Custo do Estoque Atual)

```sql
SELECT 
  p.name AS produto,
  p.stock AS qtd_estoque,
  SUM(se.quantity_remaining * se.unit_cost) AS valor_estoque,
  CASE 
    WHEN SUM(se.quantity_remaining) > 0
    THEN ROUND(SUM(se.quantity_remaining * se.unit_cost) / SUM(se.quantity_remaining), 2)
    ELSE 0
  END AS custo_medio_ponderado
FROM products p
LEFT JOIN stock_entries se ON se.product_id = p.id AND se.quantity_remaining > 0
WHERE p.company_id = $1
  AND p.is_active = true
GROUP BY p.id, p.name, p.stock
ORDER BY valor_estoque DESC;
```

#### Lotes com Estoque (Detalhe FIFO)

```sql
SELECT 
  se.received_at,
  p.name AS produto,
  se.unit_cost,
  se.quantity_received,
  se.quantity_remaining,
  se.supplier,
  se.invoice_number
FROM stock_entries se
JOIN products p ON p.id = se.product_id
WHERE se.company_id = $1
  AND se.quantity_remaining > 0
ORDER BY se.received_at ASC;
```

### 8.2 Novos Cards no Dashboard

| Card | Cálculo | Cor |
|------|---------|-----|
| Lucro Bruto | `SUM(sales.gross_profit)` do período | Verde |
| Margem Média | `lucro_bruto / receita × 100` | Azul |
| CMV Total | `SUM(sales.cost_total)` do período | Laranja |
| Valor do Estoque | `SUM(quantity_remaining × unit_cost)` | Roxo |

### 8.3 Gráficos Sugeridos

1. **Receita vs CMV vs Lucro** (barras empilhadas por mês)
2. **Top 10 Produtos por Margem** (barras horizontais)
3. **Evolução da Margem** (linha ao longo do tempo)

---

## 9. Plano de Migração de Dados

### 9.1 Produtos com Estoque Existente

Para cada produto que já possui `stock > 0`, criar um `stock_entry` inicial:

```sql
-- Migration de dados: cria lote inicial para produtos com estoque
INSERT INTO stock_entries (
  company_id, product_id, unit_cost, 
  quantity_received, quantity_remaining,
  notes, received_at
)
SELECT 
  p.company_id,
  p.id,
  COALESCE(p.cost_price, 0),  -- Usa cost_price existente ou 0
  p.stock,
  p.stock,
  'Lote inicial - migração para sistema FIFO',
  COALESCE(p.created_at, now())
FROM products p
WHERE p.stock > 0;

-- Registra movimentação para cada entrada inicial
INSERT INTO stock_movements (
  company_id, product_id, entry_id, type,
  quantity, unit_cost, balance_after, notes
)
SELECT 
  se.company_id,
  se.product_id,
  se.id,
  'entry',
  se.quantity_received,
  se.unit_cost,
  se.quantity_remaining,
  'Entrada inicial - migração FIFO'
FROM stock_entries se
WHERE se.notes = 'Lote inicial - migração para sistema FIFO';
```

### 9.2 Vendas Existentes (Opcional)

Vendas anteriores ao FIFO **não terão** `cost_total` / `gross_profit` preenchidos (ficam NULL). Isso é intencional:

- Relatórios de lucro só mostram dados a partir da ativação do FIFO
- Pode-se filtrar por `WHERE cost_total IS NOT NULL` nos relatórios
- Se desejado, pode-se rodar um script para estimar custo retroativo usando `products.cost_price`

**Script opcional de estimativa retroativa:**

```sql
-- OPCIONAL: Estima custo para vendas anteriores usando cost_price do produto
UPDATE sale_items si
SET cost_total = si.quantity * COALESCE(p.cost_price, 0),
    profit = si.total - (si.quantity * COALESCE(p.cost_price, 0))
FROM products p
WHERE si.product_id = p.id
  AND si.cost_total IS NULL;

UPDATE sales s
SET cost_total = sub.cost_total,
    gross_profit = s.total - sub.cost_total
FROM (
  SELECT sale_id, SUM(COALESCE(cost_total, 0)) AS cost_total
  FROM sale_items
  GROUP BY sale_id
) sub
WHERE s.id = sub.sale_id
  AND s.cost_total IS NULL
  AND s.status = 'completed';
```

> **Atenção:** Essa estimativa usa custo fixo (último cost_price) e não é FIFO real. Usar apenas como aproximação.

---

## 10. Ordem de Implementação

### Fase 1: Base de Dados (sem impacto no frontend)

| # | Tarefa | Risco |
|---|--------|-------|
| 1.1 | Criar migration: tabelas `stock_entries`, `sale_item_costs`, `stock_movements` | Nenhum — tabelas novas |
| 1.2 | Criar migration: campos `cost_total`, `profit` em `sale_items` | Nenhum — campos nullable |
| 1.3 | Criar migration: campos `cost_total`, `gross_profit` em `sales` | Nenhum — campos nullable |
| 1.4 | Criar migration: RLS policies | Nenhum — tabelas novas |
| 1.5 | Criar migration: funções SQL (`allocate_fifo`, `register_stock_entry`, `cancel_sale_fifo`, `update_sale_cost_totals`) | Nenhum — funções novas |
| 1.6 | Criar migration: dados iniciais (lotes para estoque existente) | Baixo — só insere dados |

### Fase 2: Types e Service

| # | Tarefa | Risco |
|---|--------|-------|
| 2.1 | Atualizar `src/types/index.ts` com novos tipos e campos | Nenhum — campos opcionais |
| 2.2 | Criar `src/services/stockService.ts` | Nenhum — arquivo novo |

### Fase 3: Entrada de Estoque (feature nova)

| # | Tarefa | Risco |
|---|--------|-------|
| 3.1 | Criar `StockEntryPage.tsx` | Nenhum — página nova |
| 3.2 | Criar `StockMovementsPage.tsx` | Nenhum — página nova |
| 3.3 | Adicionar rotas e itens no Sidebar | Baixo — só adiciona |

### Fase 4: Integração com Vendas (alteração crítica)

| # | Tarefa | Risco |
|---|--------|-------|
| 4.1 | Alterar `SalesPage.tsx`: substituir update manual de stock por `allocate_fifo` | **Médio** — alterar fluxo de venda |
| 4.2 | Alterar `SalesPage.tsx`: cancelamento usa `cancel_sale_fifo` | **Médio** — alterar fluxo |
| 4.3 | Alterar `CatalogOrdersPage.tsx`: `convertOrderToSale` usa `allocate_fifo` | **Médio** — alterar fluxo |

### Fase 5: Dashboard e Relatórios

| # | Tarefa | Risco |
|---|--------|-------|
| 5.1 | Adicionar cards de lucro e CMV no Dashboard | Nenhum — só adiciona |
| 5.2 | Criar página/seção de Relatório de Lucratividade | Nenhum — página nova |
| 5.3 | Adicionar coluna de lucro na lista de vendas | Baixo — coluna adicional |

### Fase 6: Refinamentos

| # | Tarefa | Risco |
|---|--------|-------|
| 6.1 | `ProductsPage.tsx`: campo stock como somente leitura + link para entrada | Baixo |
| 6.2 | Exportação Excel com dados de custo/lucro | Nenhum |
| 6.3 | Entrada de estoque em lote (importação Excel) | Nenhum |

---

## 11. Testes e Validação

### 11.1 Cenários de Teste

#### Entrada de Estoque
- [ ] Registrar entrada com todos os campos preenchidos
- [ ] Registrar entrada com campos opcionais vazios
- [ ] Verificar que `products.stock` aumentou corretamente
- [ ] Verificar que `products.cost_price` foi atualizado
- [ ] Verificar registro em `stock_movements`
- [ ] Verificar `stock_entries.quantity_remaining = quantity_received`

#### Venda FIFO — Cenário Básico
- [ ] Produto com 1 lote: vender quantidade menor que disponível
- [ ] Verificar `sale_item_costs` criado com lote correto
- [ ] Verificar `sale_items.cost_total` = quantity × unit_cost do lote
- [ ] Verificar `sale_items.profit` = total - cost_total
- [ ] Verificar `sales.gross_profit` = total - cost_total
- [ ] Verificar `stock_entries.quantity_remaining` diminuiu
- [ ] Verificar `products.stock` diminuiu

#### Venda FIFO — Múltiplos Lotes
- [ ] Produto com 3 lotes de custos diferentes
- [ ] Vender quantidade que consome lote 1 inteiro + parte do lote 2
- [ ] Verificar 2 registros em `sale_item_costs`
- [ ] Verificar custo total = (qtd1 × custo1) + (qtd2 × custo2)
- [ ] Verificar lote 1 com `quantity_remaining = 0`
- [ ] Verificar lote 2 com `quantity_remaining` reduzido

#### Venda Sem Lote FIFO
- [ ] Vender produto que não tem `stock_entries`
- [ ] Verificar que a venda **não é bloqueada**
- [ ] Verificar `stock_movement` com type='adjustment' e nota explicativa
- [ ] Verificar `cost_total = 0` (custo desconhecido)

#### Cancelamento
- [ ] Cancelar venda com alocação FIFO
- [ ] Verificar `stock_entries.quantity_remaining` restaurado
- [ ] Verificar `products.stock` restaurado
- [ ] Verificar `sale_item_costs` removidos
- [ ] Verificar `stock_movement` type='cancellation'
- [ ] Verificar `sale_items.cost_total` e `.profit` são NULL
- [ ] Verificar `sales.status = 'cancelled'`

#### Pedido do Catálogo
- [ ] Completar pedido do catálogo
- [ ] Verificar que `allocate_fifo` foi chamado
- [ ] Verificar custo e lucro calculados na venda resultante

#### Consistência
- [ ] Após N entradas e M vendas: `products.stock == SUM(stock_entries.quantity_remaining)`
- [ ] `sales.cost_total == SUM(sale_items.cost_total)` para cada venda
- [ ] `sale_items.cost_total == SUM(sale_item_costs.quantity × unit_cost)` para cada item

### 11.2 Script de Verificação de Consistência

```sql
-- Verifica se products.stock está consistente com stock_entries
SELECT 
  p.id,
  p.name,
  p.stock AS stock_produto,
  COALESCE(SUM(se.quantity_remaining), 0) AS stock_fifo,
  p.stock - COALESCE(SUM(se.quantity_remaining), 0) AS diferenca
FROM products p
LEFT JOIN stock_entries se ON se.product_id = p.id
WHERE p.company_id = $1
GROUP BY p.id, p.name, p.stock
HAVING p.stock != COALESCE(SUM(se.quantity_remaining), 0);
-- Se retornar linhas, há inconsistência
```

---

## 12. Glossário

| Termo | Definição |
|-------|-----------|
| **FIFO** | First In, First Out — método de custeio onde os primeiros itens comprados são os primeiros vendidos |
| **PEPS** | Primeiro que Entra, Primeiro que Sai — equivalente em português do FIFO |
| **CMV / COGS** | Custo da Mercadoria Vendida / Cost of Goods Sold |
| **Lote (stock_entry)** | Uma entrada de mercadoria com custo e quantidade específicos |
| **Alocação FIFO** | Processo de vincular unidades vendidas aos lotes mais antigos |
| **Lucro Bruto** | Receita da venda - CMV |
| **Margem Bruta** | (Lucro Bruto / Receita) × 100 |
| **Valoração de Estoque** | Valor total do estoque baseado no custo dos lotes restantes |
| **Race Condition** | Quando dois processos alteram o mesmo dado simultaneamente, causando inconsistência |
| **RLS** | Row Level Security — políticas de segurança por linha no Supabase/PostgreSQL |

---

## Referências

- **Fluxo de vendas atual:** `src/modules/sales/SalesPage.tsx` (linhas 178-230, 331-364)
- **Fluxo de pedidos do catálogo:** `src/modules/catalog-orders/CatalogOrdersPage.tsx` (linhas 95-156)
- **Tipos existentes:** `src/types/index.ts` (linhas 143-196)
- **Schema do banco:** `supabase/migrations/20251226000001_create_tables.sql`
- **Dashboard:** `src/modules/dashboard/DashboardPage.tsx`
- **Carrinho:** `src/contexts/CartContext.tsx`

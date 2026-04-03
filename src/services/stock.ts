import { supabase } from './supabase';
import { StockEntry, StockMovement } from '../types';

// ============================================
// Entrada de Estoque
// ============================================

interface RegisterStockEntryParams {
  companyId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  supplier?: string;
  invoiceNumber?: string;
  notes?: string;
  receivedAt?: string;
  userId?: string;
}

export async function registerStockEntry(params: RegisterStockEntryParams): Promise<string> {
  const { data, error } = await supabase.rpc('register_stock_entry', {
    p_company_id: params.companyId,
    p_product_id: params.productId,
    p_quantity: params.quantity,
    p_unit_cost: params.unitCost,
    p_supplier: params.supplier || null,
    p_invoice_number: params.invoiceNumber || null,
    p_notes: params.notes || null,
    p_received_at: params.receivedAt || new Date().toISOString(),
    p_user_id: params.userId || null,
  });

  if (error) throw error;
  return data as string;
}

// ============================================
// Alocação FIFO (usado nas vendas)
// ============================================

interface AllocateFifoParams {
  saleItemId: string;
  productId: string;
  companyId: string;
  quantity: number;
  sellerId?: string;
}

export async function allocateFifo(params: AllocateFifoParams): Promise<number> {
  const { data, error } = await supabase.rpc('allocate_fifo', {
    p_sale_item_id: params.saleItemId,
    p_product_id: params.productId,
    p_company_id: params.companyId,
    p_quantity: params.quantity,
    p_seller_id: params.sellerId || null,
  });

  if (error) throw error;
  return data as number;
}

// ============================================
// Atualizar totais de custo na venda
// ============================================

export async function updateSaleCostTotals(saleId: string): Promise<void> {
  const { error } = await supabase.rpc('update_sale_cost_totals', {
    p_sale_id: saleId,
  });

  if (error) throw error;
}

// ============================================
// Cancelamento com reversão FIFO
// ============================================

export async function cancelSaleFifo(saleId: string, userId?: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_sale_fifo', {
    p_sale_id: saleId,
    p_user_id: userId || null,
  });

  if (error) throw error;
}

// ============================================
// Consultas
// ============================================

export async function getStockEntries(
  companyId: string,
  productId?: string
): Promise<StockEntry[]> {
  let query = supabase
    .from('stock_entries')
    .select('*, product:products(id, name, sku, ean)')
    .eq('company_id', companyId)
    .order('received_at', { ascending: false });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as StockEntry[];
}

export async function getStockMovements(
  companyId: string,
  filters?: {
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<StockMovement[]> {
  let query = supabase
    .from('stock_movements')
    .select('*, product:products(id, name, sku)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (filters?.productId) {
    query = query.eq('product_id', filters.productId);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as StockMovement[];
}

export async function getStockValuation(companyId: string) {
  const { data, error } = await supabase
    .from('stock_entries')
    .select('product_id, unit_cost, quantity_remaining, product:products(id, name, stock, price)')
    .eq('company_id', companyId)
    .gt('quantity_remaining', 0);

  if (error) throw error;
  return data;
}

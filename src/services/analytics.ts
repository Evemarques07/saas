import { supabase } from './supabase';

const SESSION_KEY = 'mv_catalog_session';

export type CatalogEventType = 'catalog_view' | 'product_view' | 'add_to_cart';

/**
 * Id anonimo persistente por navegador (para contar "visitantes unicos").
 * Nao contem PII - e apenas um identificador aleatorio.
 */
export function getCatalogSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/**
 * Registra um evento do catalogo publico via RPC SECURITY DEFINER.
 * Nunca lanca erro - analytics jamais deve quebrar o catalogo.
 */
export async function trackCatalogEvent(
  companyId: string,
  eventType: CatalogEventType,
  productId?: string
): Promise<void> {
  if (!companyId) return;
  try {
    await supabase.rpc('track_catalog_event', {
      p_company_id: companyId,
      p_event_type: eventType,
      p_session_id: getCatalogSessionId(),
      p_product_id: productId ?? null,
    });
  } catch (err) {
    console.warn('[analytics] track falhou (ignorado):', err);
  }
}

export interface CatalogAnalytics {
  catalog_views: number;
  unique_visitors: number;
  product_views: number;
  add_to_cart: number;
  orders: number;
  top_products: { product_id: string; name: string; views: number }[];
}

/**
 * Busca os agregados de analytics do catalogo (somente membros da empresa).
 * Datas nulas = ultimos 30 dias (default do RPC).
 */
export async function getCatalogAnalytics(
  companyId: string,
  start: Date | null,
  end: Date | null
): Promise<CatalogAnalytics | null> {
  try {
    const { data, error } = await supabase.rpc('get_catalog_analytics', {
      p_company_id: companyId,
      p_start: start ? start.toISOString() : null,
      p_end: end ? end.toISOString() : null,
    });
    if (error) throw error;
    return data as CatalogAnalytics;
  } catch (err) {
    console.warn('[analytics] getCatalogAnalytics falhou:', err);
    return null;
  }
}

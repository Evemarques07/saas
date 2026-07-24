-- ============================================
-- Migration: Analytics do Catalogo Publico
-- Data: 2026-07-23
-- Descricao: Eventos anonimos do catalogo (visitas, views de produto, add ao
--            carrinho) + RPCs. Anon grava via RPC SECURITY DEFINER (nao acessa a
--            tabela direto, respeitando o RLS). Membros leem agregados.
-- ============================================

CREATE TABLE IF NOT EXISTS catalog_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('catalog_view', 'product_view', 'add_to_cart')),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_events_company_created ON catalog_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_events_type ON catalog_events (company_id, event_type);
CREATE INDEX IF NOT EXISTS idx_catalog_events_product ON catalog_events (product_id) WHERE product_id IS NOT NULL;

ALTER TABLE catalog_events ENABLE ROW LEVEL SECURITY;

-- Membros da empresa leem os eventos da sua empresa; anon NAO acessa direto
DROP POLICY IF EXISTS "catalog_events_select_members" ON catalog_events;
CREATE POLICY "catalog_events_select_members" ON catalog_events FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

REVOKE ALL ON catalog_events FROM anon;
GRANT SELECT ON catalog_events TO authenticated;

-- ############################################
-- RPC: registrar evento (catalogo publico / anon)
-- ############################################
CREATE OR REPLACE FUNCTION track_catalog_event(
  p_company_id uuid,
  p_event_type text,
  p_session_id text DEFAULT NULL,
  p_product_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_company_id IS NULL OR p_event_type NOT IN ('catalog_view', 'product_view', 'add_to_cart') THEN
    RETURN; -- ignora silenciosamente (analytics nunca deve quebrar o catalogo)
  END IF;

  INSERT INTO catalog_events (company_id, event_type, product_id, session_id)
  VALUES (p_company_id, p_event_type, p_product_id, left(coalesce(p_session_id, ''), 64));
END;
$$;

GRANT EXECUTE ON FUNCTION track_catalog_event(uuid, text, text, uuid) TO anon, authenticated;

-- ############################################
-- RPC: agregados para o dashboard (so membros da empresa)
-- ############################################
CREATE OR REPLACE FUNCTION get_catalog_analytics(
  p_company_id uuid,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := coalesce(p_start, now() - interval '30 days');
  v_end   timestamptz := coalesce(p_end, now());
  v_result jsonb;
BEGIN
  IF NOT (p_company_id = ANY(get_user_company_ids()) OR is_super_admin()) THEN
    RAISE EXCEPTION 'acesso negado ao analytics desta empresa';
  END IF;

  SELECT jsonb_build_object(
    'catalog_views', (SELECT count(*) FROM catalog_events e
      WHERE e.company_id = p_company_id AND e.event_type = 'catalog_view'
      AND e.created_at BETWEEN v_start AND v_end),
    'unique_visitors', (SELECT count(DISTINCT e.session_id) FROM catalog_events e
      WHERE e.company_id = p_company_id AND e.event_type = 'catalog_view'
      AND e.session_id IS NOT NULL AND e.created_at BETWEEN v_start AND v_end),
    'product_views', (SELECT count(*) FROM catalog_events e
      WHERE e.company_id = p_company_id AND e.event_type = 'product_view'
      AND e.created_at BETWEEN v_start AND v_end),
    'add_to_cart', (SELECT count(*) FROM catalog_events e
      WHERE e.company_id = p_company_id AND e.event_type = 'add_to_cart'
      AND e.created_at BETWEEN v_start AND v_end),
    'orders', (SELECT count(*) FROM catalog_orders o
      WHERE o.company_id = p_company_id AND o.created_at BETWEEN v_start AND v_end),
    'top_products', coalesce((
      SELECT jsonb_agg(t) FROM (
        SELECT p.id AS product_id, p.name, count(*) AS views
        FROM catalog_events e
        JOIN products p ON p.id = e.product_id
        WHERE e.company_id = p_company_id AND e.event_type = 'product_view'
          AND e.created_at BETWEEN v_start AND v_end
        GROUP BY p.id, p.name
        ORDER BY count(*) DESC
        LIMIT 5
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_catalog_analytics(uuid, timestamptz, timestamptz) TO authenticated;

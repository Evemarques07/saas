-- ============================================
-- Migration: Fix RLS Security (Fase 1 - Auditoria de Seguranca)
-- Data: 2026-02-21
-- Descricao: Corrige politicas RLS permissivas que permitem acesso cruzado entre empresas
-- Tabelas afetadas: coupons, coupon_usages, loyalty_config, loyalty_levels,
--                   loyalty_points, promotions, promotion_usages,
--                   catalog_orders, catalog_order_items
-- ============================================

-- ############################################
-- 1. COUPONS
-- ############################################

DROP POLICY IF EXISTS "coupons_all" ON coupons;

-- Membros da empresa podem ver cupons da sua empresa
CREATE POLICY "coupons_select_members" ON coupons FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Catalogo publico: anonimos podem ver cupons ativos e publicos para validacao
CREATE POLICY "coupons_select_public" ON coupons FOR SELECT
  USING (is_active = true AND is_public = true);

-- Membros da empresa podem criar cupons na sua empresa
CREATE POLICY "coupons_insert_members" ON coupons FOR INSERT
  WITH CHECK (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Membros da empresa podem atualizar cupons da sua empresa
CREATE POLICY "coupons_update_members" ON coupons FOR UPDATE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Membros da empresa podem deletar cupons da sua empresa
CREATE POLICY "coupons_delete_members" ON coupons FOR DELETE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- ############################################
-- 2. COUPON_USAGES
-- ############################################

DROP POLICY IF EXISTS "coupon_usages_all" ON coupon_usages;

-- Membros podem ver usos de cupons da sua empresa (via join com coupons)
CREATE POLICY "coupon_usages_select_members" ON coupon_usages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coupons c
      WHERE c.id = coupon_usages.coupon_id
      AND (c.company_id = ANY(get_user_company_ids()) OR is_super_admin())
    )
  );

-- Membros ou anon podem inserir uso (catalogo publico aplica cupom ao fazer pedido)
CREATE POLICY "coupon_usages_insert" ON coupon_usages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coupons c
      WHERE c.id = coupon_usages.coupon_id
      AND (
        c.company_id = ANY(get_user_company_ids())
        OR is_super_admin()
        OR c.is_active = true
      )
    )
  );

-- ############################################
-- 3. LOYALTY_CONFIG
-- ############################################

DROP POLICY IF EXISTS "loyalty_config_all" ON loyalty_config;

-- Membros podem ver config de fidelidade da sua empresa
CREATE POLICY "loyalty_config_select_members" ON loyalty_config FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Catalogo publico pode ver config ativa (para mostrar programa de fidelidade)
CREATE POLICY "loyalty_config_select_public" ON loyalty_config FOR SELECT
  USING (enabled = true);

-- Membros podem inserir/atualizar/deletar config da sua empresa
CREATE POLICY "loyalty_config_insert_members" ON loyalty_config FOR INSERT
  WITH CHECK (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "loyalty_config_update_members" ON loyalty_config FOR UPDATE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "loyalty_config_delete_members" ON loyalty_config FOR DELETE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- ############################################
-- 4. LOYALTY_LEVELS
-- ############################################

DROP POLICY IF EXISTS "loyalty_levels_all" ON loyalty_levels;

-- Membros podem ver niveis da sua empresa
CREATE POLICY "loyalty_levels_select_members" ON loyalty_levels FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Catalogo publico pode ver niveis (para mostrar no programa de fidelidade)
CREATE POLICY "loyalty_levels_select_public" ON loyalty_levels FOR SELECT
  USING (true);

-- Membros podem inserir/atualizar/deletar niveis da sua empresa
CREATE POLICY "loyalty_levels_insert_members" ON loyalty_levels FOR INSERT
  WITH CHECK (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "loyalty_levels_update_members" ON loyalty_levels FOR UPDATE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "loyalty_levels_delete_members" ON loyalty_levels FOR DELETE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- ############################################
-- 5. LOYALTY_POINTS
-- ############################################

DROP POLICY IF EXISTS "loyalty_points_all" ON loyalty_points;

-- Membros podem ver pontos da sua empresa
CREATE POLICY "loyalty_points_select_members" ON loyalty_points FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Membros podem inserir/atualizar pontos da sua empresa
CREATE POLICY "loyalty_points_insert_members" ON loyalty_points FOR INSERT
  WITH CHECK (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "loyalty_points_update_members" ON loyalty_points FOR UPDATE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- ############################################
-- 6. PROMOTIONS
-- ############################################

DROP POLICY IF EXISTS "promotions_all" ON promotions;

-- Membros podem ver promocoes da sua empresa
CREATE POLICY "promotions_select_members" ON promotions FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Catalogo publico pode ver promocoes ativas (para aplicar no checkout)
CREATE POLICY "promotions_select_public" ON promotions FOR SELECT
  USING (
    is_active = true
    AND (valid_until IS NULL OR valid_until >= now())
  );

-- Membros podem inserir/atualizar/deletar promocoes da sua empresa
CREATE POLICY "promotions_insert_members" ON promotions FOR INSERT
  WITH CHECK (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "promotions_update_members" ON promotions FOR UPDATE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

CREATE POLICY "promotions_delete_members" ON promotions FOR DELETE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- ############################################
-- 7. PROMOTION_USAGES
-- ############################################

DROP POLICY IF EXISTS "promotion_usages_all" ON promotion_usages;

-- Membros podem ver usos de promocoes da sua empresa
CREATE POLICY "promotion_usages_select_members" ON promotion_usages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.id = promotion_usages.promotion_id
      AND (p.company_id = ANY(get_user_company_ids()) OR is_super_admin())
    )
  );

-- Membros ou anon podem inserir uso (catalogo publico aplica promocao no checkout)
CREATE POLICY "promotion_usages_insert" ON promotion_usages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.id = promotion_usages.promotion_id
      AND (
        p.company_id = ANY(get_user_company_ids())
        OR is_super_admin()
        OR p.is_active = true
      )
    )
  );

-- ############################################
-- 8. CATALOG_ORDERS - Restringir acesso
-- ############################################

DROP POLICY IF EXISTS "Company members can view catalog orders" ON catalog_orders;
DROP POLICY IF EXISTS "Company members can update catalog orders" ON catalog_orders;
DROP POLICY IF EXISTS "Anyone can create catalog orders" ON catalog_orders;
DROP POLICY IF EXISTS "catalog_orders_all" ON catalog_orders;

DROP POLICY IF EXISTS "Company members can view catalog order items" ON catalog_order_items;
DROP POLICY IF EXISTS "Anyone can create catalog order items" ON catalog_order_items;
DROP POLICY IF EXISTS "catalog_order_items_all" ON catalog_order_items;

-- Qualquer um pode criar pedido (catalogo publico)
CREATE POLICY "catalog_orders_insert_public" ON catalog_orders FOR INSERT
  WITH CHECK (true);

-- Membros da empresa podem ver pedidos da sua empresa
CREATE POLICY "catalog_orders_select_members" ON catalog_orders FOR SELECT
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- Anon pode ver pedido recente (tela de confirmacao do catalogo, ultimas 24h)
CREATE POLICY "catalog_orders_select_recent" ON catalog_orders FOR SELECT
  USING (created_at > (now() - interval '24 hours'));

-- Membros da empresa podem atualizar pedidos da sua empresa
CREATE POLICY "catalog_orders_update_members" ON catalog_orders FOR UPDATE
  USING (
    company_id = ANY(get_user_company_ids())
    OR is_super_admin()
  );

-- CATALOG ORDER ITEMS
CREATE POLICY "catalog_order_items_insert_public" ON catalog_order_items FOR INSERT
  WITH CHECK (true);

-- Membros da empresa podem ver itens dos pedidos da sua empresa
CREATE POLICY "catalog_order_items_select_members" ON catalog_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM catalog_orders co
      WHERE co.id = catalog_order_items.order_id
      AND (co.company_id = ANY(get_user_company_ids()) OR is_super_admin())
    )
  );

-- Anon pode ver itens de pedidos recentes (tela de confirmacao)
CREATE POLICY "catalog_order_items_select_recent" ON catalog_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM catalog_orders co
      WHERE co.id = catalog_order_items.order_id
      AND co.created_at > (now() - interval '24 hours')
    )
  );

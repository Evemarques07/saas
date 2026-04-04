# Plano de Implementacao - Downgrade e Limites de Plano

## Problema

Quando um usuario assina um plano pago, usa os recursos (produtos, usuarios, storage) e depois deixa de pagar, voltando ao plano gratuito, nao ha nenhum tratamento:
- Todos os produtos continuam ativos e visiveis no catalogo
- Todos os usuarios convidados continuam com acesso
- Storage excedente continua servindo normalmente
- Nao ha avisos de reducao iminente
- O corte e imediato (sem grace period)

## Solucao

Estrategia em 3 fases: Grace Period → Downgrade Suave → Comunicacao continua.

---

## Fase 1 - Grace Period (2 dias)

### 1.1 Migration: adicionar `grace_period_ends_at` na tabela subscriptions

```sql
ALTER TABLE subscriptions ADD COLUMN grace_period_ends_at TIMESTAMPTZ;
```

### 1.2 Webhook: gravar grace period ao receber PAYMENT_OVERDUE

No `asaas-webhook/index.ts`, ao processar `PAYMENT_OVERDUE`:
- Setar `grace_period_ends_at = NOW() + INTERVAL '2 days'`
- Manter status como `overdue` (sem mudanca)

### 1.3 Webhook: limpar grace period ao receber PAYMENT_CONFIRMED/RECEIVED

Se pagamento confirmado:
- Setar `grace_period_ends_at = NULL`
- Status volta para `active`

### 1.4 Frontend: `usePlanFeatures` retorna info de grace period

Adicionar ao retorno:
- `isInGracePeriod: boolean`
- `gracePeriodEndsAt: Date | null`
- `daysUntilDowngrade: number | null`

Logica: subscription valida se `active` OU (`overdue` E `grace_period_ends_at > NOW()`)

### 1.5 Frontend: Banner de aviso no Dashboard

Componente `GracePeriodBanner`:
- Mostra quando `isInGracePeriod = true`
- Texto: "Seu pagamento esta pendente. Voce tem X dias para regularizar antes de perder acesso aos recursos do plano [nome]. Regularize agora."
- Cor amarela, com botao para ir ao billing
- Fixo no topo do layout

---

## Fase 2 - Downgrade Suave (apos grace period)

### 2.1 Edge Function: `enforce-plan-limits` (nova, cron diario)

Nova Edge Function que roda via pg_cron ou chamada manual:
- Busca subscriptions com `status = 'overdue'` E `grace_period_ends_at < NOW()`
- Para cada uma, aplica os limites do plano free

#### Acoes de enforcement:

**Produtos:**
- Conta produtos ativos da empresa
- Se > 20 (limite free), desativa os excedentes (os mais recentes ficam inativos)
- `UPDATE products SET is_active = false WHERE company_id = X AND id NOT IN (SELECT id FROM products WHERE company_id = X AND is_active = true ORDER BY created_at ASC LIMIT 20)`
- Produtos desativados NAO sao deletados, apenas ficam inativos

**Usuarios:**
- Desativa todos os company_members exceto o owner
- `UPDATE company_members SET is_active = false WHERE company_id = X AND role != 'owner'`
- Usuarios desativados perdem acesso ao login

**Storage:**
- NAO deleta imagens existentes
- Apenas impede novos uploads quando storage > 100MB
- Validacao no frontend antes de upload

### 2.2 Atualizar status da subscription

Apos aplicar enforcement:
- Mudar status para `canceled` (ou manter `overdue` com flag `downgraded_at`)
- Opcao escolhida: adicionar coluna `downgraded_at TIMESTAMPTZ`
- Quando `downgraded_at IS NOT NULL`, usar limites do plano free mesmo com subscription existente

### 2.3 Frontend: `getCompanyUsage` considerar downgrade

Na funcao `getCompanyUsage` em `asaas.ts`:
- Se subscription tem `downgraded_at` preenchido → usar FREE_PLAN_LIMITS
- Se subscription esta `overdue` mas dentro do grace period → usar limites do plano pago

### 2.4 Trigger SQL: `check_product_limit` considerar downgrade

Atualizar a funcao para verificar:
- Se subscription esta com `downgraded_at IS NOT NULL` → usar limite free
- Se subscription esta `overdue` E `grace_period_ends_at > NOW()` → usar limite do plano

### 2.5 Catalogo: filtrar produtos por limite

No `CatalogPage.tsx`, a query ja filtra `is_active = true`, entao produtos desativados pelo enforcement automaticamente somem do catalogo. Nenhuma mudanca necessaria.

---

## Fase 3 - Comunicacao Continua

### 3.1 Banner de downgrade no Dashboard

Componente `DowngradeBanner`:
- Mostra quando `downgraded_at IS NOT NULL`
- Texto: "Seu plano foi reduzido para Gratis. Voce tem X produtos e Y usuarios desabilitados. Faca upgrade para reativa-los."
- Cor vermelha, com botao para ir ao billing

### 3.2 Indicador visual nos produtos desabilitados

Na listagem de produtos (`ProductsPage.tsx`):
- Produtos com `is_active = false` que foram desativados por downgrade mostram icone de cadeado
- Tooltip: "Produto desabilitado por limite do plano. Faca upgrade para reativar."
- Botao de reativar mostra modal de upgrade ao inves de reativar direto

### 3.3 UsageCard mostra excedentes

No `UsageCard.tsx`:
- Quando downgradado, mostrar "20 / 20 produtos (+ X desabilitados)"
- Barra vermelha cheia com indicador de excedente

---

## Ordem de Implementacao

1. **Migration SQL** - `grace_period_ends_at` e `downgraded_at` na subscriptions
2. **Webhook** - Gravar grace period no PAYMENT_OVERDUE, limpar no PAYMENT_CONFIRMED
3. **Types** - Atualizar `Subscription` no frontend
4. **usePlanFeatures** - Grace period info e logica de downgrade
5. **getCompanyUsage** - Considerar downgrade nos limites
6. **GracePeriodBanner** - Componente de aviso
7. **DowngradeBanner** - Componente pos-downgrade
8. **Edge Function enforce-plan-limits** - Enforcement automatico
9. **check_product_limit SQL** - Considerar grace period e downgrade
10. **ProductsPage** - Indicador visual de produtos desabilitados
11. **UsageCard** - Mostrar excedentes

---

## Arquivos Modificados

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `supabase/migrations/XXXXXXXX_downgrade_grace_period.sql` | Novo | Migration com colunas + trigger atualizado |
| `supabase/functions/asaas-webhook/index.ts` | Modificado | Grace period no PAYMENT_OVERDUE |
| `supabase/functions/enforce-plan-limits/index.ts` | Novo | Edge Function de enforcement |
| `src/types/index.ts` | Modificado | Campos na Subscription |
| `src/hooks/usePlanFeatures.ts` | Modificado | Grace period + downgrade |
| `src/services/asaas.ts` | Modificado | getCompanyUsage com downgrade |
| `src/modules/billing/components/GracePeriodBanner.tsx` | Novo | Banner grace period |
| `src/modules/billing/components/DowngradeBanner.tsx` | Novo | Banner downgrade |
| `src/modules/products/ProductsPage.tsx` | Modificado | Indicador produtos desabilitados |
| `src/modules/billing/components/UsageCard.tsx` | Modificado | Excedentes |
| `src/layouts/AppLayout.tsx` | Modificado | Renderizar banners |

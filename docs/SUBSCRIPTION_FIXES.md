# Correcoes do Sistema de Assinaturas

> Auditoria realizada em 2026-02-16. Todos os bugs estao documentados com arquivo, linha exata e codigo de correcao.

## Indice

| # | Severidade | Bug | Arquivo Principal |
|---|:----------:|-----|-------------------|
| 1 | CRITICO | getCompanyUsage busca subscription duplicada | `src/services/asaas.ts` |
| 2 | CRITICO | getCompanySubscription nao filtra por status ativo | `supabase/functions/asaas-billing/index.ts` + `src/services/asaas.ts` |
| 3 | ALTO | Features de plano cancelado continuam ativas | `src/hooks/usePlanFeatures.ts` |
| 4 | ALTO | Falsy check `\|\|` nos limites (0 vira infinito) | `src/modules/billing/components/CurrentPlanCard.tsx` + `PlanCard.tsx` |
| 5 | ALTO | Tela de sucesso do upgrade com mesmo problema | `src/modules/billing/components/UpgradeModal.tsx` |
| 6 | MEDIO | Import de produtos usa limites em cache (stale) | `src/modules/products/ProductsPage.tsx` |
| 7 | MEDIO | Trigger check_product_limit nao cobre UPDATE (reativacao) | `supabase/migrations/` |
| 8 | MEDIO | BillingPage nunca recarrega dados ao voltar | `src/modules/billing/BillingPage.tsx` |
| 9 | MEDIO | Botao Ativar no mobile nao fica disabled | `src/modules/users/UsersPage.tsx` |
| 10 | BAIXO | Polling silencia erro de auth | `src/services/asaas.ts` |
| 11 | BAIXO | FREE_PLAN_LIMITS duplicado em 2 arquivos | `src/services/asaas.ts` + `src/hooks/usePlanFeatures.ts` |

---

## Bug 1 (CRITICO) — getCompanyUsage busca subscription duplicada

### Problema

`getCompanyUsage()` chama `getCompanySubscription()` internamente (linha 226). Porem, quem consome (`usePlanFeatures.ts:66-68` e `BillingPage.tsx:55-58`) ja chama ambas em `Promise.all`:

```ts
// usePlanFeatures.ts:66-68
const [subscriptionData, usageData] = await Promise.all([
  getCompanySubscription(currentCompany.id),  // chamada 1
  getCompanyUsage(currentCompany.id),          // internamente chama getCompanySubscription DENOVO
]);
```

**Resultado**: 2 chamadas duplicadas a edge function + possivel inconsistencia se o status mudar entre elas.

### Correcao

Refatorar `getCompanyUsage` para receber a subscription como parametro ao inves de buscar:

**Arquivo**: `src/services/asaas.ts` — linhas 224-265

```ts
// ANTES (linha 224):
export async function getCompanyUsage(companyId: string): Promise<UsageLimits> {
  const subscription = await getCompanySubscription(companyId);
  const plan = subscription?.plan;
  // ...

// DEPOIS:
export async function getCompanyUsage(
  companyId: string,
  subscription?: Subscription | null
): Promise<UsageLimits> {
  // Se nao recebeu subscription, buscar (backward-compatible)
  const sub = subscription !== undefined
    ? subscription
    : await getCompanySubscription(companyId);
  const plan = sub?.plan;
  // ... resto igual
```

**Arquivo**: `src/hooks/usePlanFeatures.ts` — linhas 66-69

```ts
// ANTES:
const [subscriptionData, usageData] = await Promise.all([
  getCompanySubscription(currentCompany.id),
  getCompanyUsage(currentCompany.id),
]);

// DEPOIS:
const subscriptionData = await getCompanySubscription(currentCompany.id);
const usageData = await getCompanyUsage(currentCompany.id, subscriptionData);
```

**Arquivo**: `src/modules/billing/BillingPage.tsx` — linhas 55-59

```ts
// ANTES:
const [plansData, subscriptionData, usageData] = await Promise.all([
  getPlans(),
  getCompanySubscription(currentCompany.id),
  getCompanyUsage(currentCompany.id),
]);

// DEPOIS:
const [plansData, subscriptionData] = await Promise.all([
  getPlans(),
  getCompanySubscription(currentCompany.id),
]);
const usageData = await getCompanyUsage(currentCompany.id, subscriptionData);
```

---

## Bug 2 (CRITICO) — getCompanySubscription nao filtra por status ativo

### Problema

Tanto a Edge Function quanto o fallback local buscam a subscription mais recente **sem filtrar por status**:

```sql
-- Edge Function (asaas-billing/index.ts:764-770):
.eq('company_id', companyId)
.order('created_at', { ascending: false })  -- sem filtro de status!
.limit(1)

-- Fallback (asaas.ts:92-98):
.eq('company_id', companyId)
.order('created_at', { ascending: false })  -- sem filtro de status!
.limit(1)
```

Se a assinatura for cancelada/expirada, o app retorna ela como valida e aplica os limites do plano pago. O trigger do banco (`check_product_limit`) filtra corretamente `AND s.status = 'active'`, mas o frontend nao.

### Correcao

**Arquivo**: `supabase/functions/asaas-billing/index.ts` — linhas 764-770

```ts
// ANTES:
const { data: subscription, error: subError } = await supabase
  .from('subscriptions')
  .select('*, plan:plans(*)')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// DEPOIS:
const { data: subscription, error: subError } = await supabase
  .from('subscriptions')
  .select('*, plan:plans(*)')
  .eq('company_id', companyId)
  .in('status', ['active', 'overdue'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

> Nota: incluimos `overdue` para que o usuario veja o alerta de pagamento em atraso no frontend. Se preferir bloquear imediatamente, usar apenas `['active']`.

**Arquivo**: `src/services/asaas.ts` — linhas 92-98 (fallback)

```ts
// ANTES:
const { data, error } = await supabase
  .from('subscriptions')
  .select('*, plan:plans(*)')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// DEPOIS:
const { data, error } = await supabase
  .from('subscriptions')
  .select('*, plan:plans(*)')
  .eq('company_id', companyId)
  .in('status', ['active', 'overdue'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

### Deploy

Apos alterar a Edge Function, fazer deploy:

```bash
supabase functions deploy asaas-billing
```

---

## Bug 3 (ALTO) — Features de plano cancelado continuam ativas

### Problema

`usePlanFeatures.ts:86` apenas verifica se o objeto `subscription` existe, nao o status:

```ts
const features: PlanFeatures = subscription?.plan?.features || FREE_PLAN_FEATURES;
```

Se o Bug 2 for corrigido (filtrar por status ativo), este bug eh automaticamente mitigado pois `subscription` voltara `null` para planos cancelados.

### Correcao (defesa em profundidade)

Mesmo apos corrigir o Bug 2, adicionar verificacao explicita:

**Arquivo**: `src/hooks/usePlanFeatures.ts` — linha 86

```ts
// ANTES:
const features: PlanFeatures = subscription?.plan?.features || FREE_PLAN_FEATURES;
const plan = subscription?.plan || null;

// DEPOIS:
const isSubscriptionValid = subscription?.status === 'active' || subscription?.status === 'overdue';
const features: PlanFeatures = isSubscriptionValid
  ? (subscription?.plan?.features || FREE_PLAN_FEATURES)
  : FREE_PLAN_FEATURES;
const plan = isSubscriptionValid ? (subscription?.plan || null) : null;
```

---

## Bug 4 (ALTO) — Falsy check || nos limites exibe infinito para 0

### Problema

Varios componentes usam `||` para fallback, que trata `0` como falsy:

```tsx
// CurrentPlanCard.tsx:77
{plan?.product_limit || '∞'}     // Se limit=0, mostra ∞

// PlanCard.tsx:111
{plan.product_limit || 'Ilimitado'}  // Se limit=0, mostra Ilimitado
```

### Correcao

**Arquivo**: `src/modules/billing/components/CurrentPlanCard.tsx` — linhas 76-96

```tsx
// ANTES (linha 77):
{plan?.product_limit || '∞'}

// DEPOIS:
{plan?.product_limit != null ? plan.product_limit : '∞'}

// ANTES (linha 83):
{plan?.user_limit || '∞'}

// DEPOIS:
{plan?.user_limit != null ? plan.user_limit : '∞'}

// ANTES (linhas 89-93):
{plan?.storage_limit_mb
  ? plan.storage_limit_mb >= 1000
    ? `${(plan.storage_limit_mb / 1000).toFixed(0)}GB`
    : `${plan.storage_limit_mb}MB`
  : '∞'}

// DEPOIS:
{plan?.storage_limit_mb != null
  ? plan.storage_limit_mb >= 1000
    ? `${(plan.storage_limit_mb / 1000).toFixed(0)}GB`
    : `${plan.storage_limit_mb}MB`
  : '∞'}
```

**Arquivo**: `src/modules/billing/components/PlanCard.tsx` — linhas 111, 117, 123-128

```tsx
// ANTES (linha 111):
{plan.product_limit || 'Ilimitado'}

// DEPOIS:
{plan.product_limit != null ? plan.product_limit : 'Ilimitado'}

// ANTES (linha 117):
{plan.user_limit || 'Ilimitado'}

// DEPOIS:
{plan.user_limit != null ? plan.user_limit : 'Ilimitado'}

// ANTES (linhas 123-128):
{plan.storage_limit_mb
  ? plan.storage_limit_mb >= 1000 ...
  : 'Ilimitado'}

// DEPOIS:
{plan.storage_limit_mb != null
  ? plan.storage_limit_mb >= 1000 ...
  : 'Ilimitado'}
```

---

## Bug 5 (ALTO) — Tela de sucesso do upgrade com mesmo falsy check

### Problema

`UpgradeModal.tsx:626-628` usa o mesmo padrao `||`:

```tsx
<li>• Ate {plan.product_limit || 'ilimitados'} produtos</li>
<li>• Ate {plan.user_limit || 'ilimitados'} usuarios</li>
```

Alem do bug do `0`, o texto "Ate ilimitados produtos" fica gramaticalmente incorreto.

### Correcao

**Arquivo**: `src/modules/billing/components/UpgradeModal.tsx` — linhas 626-628

```tsx
// ANTES:
<li>• Ate {plan.product_limit || 'ilimitados'} produtos</li>
<li>• Ate {plan.user_limit || 'ilimitados'} usuarios</li>
<li>• {plan.storage_limit_mb ? `${plan.storage_limit_mb} MB` : 'Ilimitado'} de armazenamento</li>

// DEPOIS:
<li>• {plan.product_limit != null ? `Ate ${plan.product_limit} produtos` : 'Produtos ilimitados'}</li>
<li>• {plan.user_limit != null ? `Ate ${plan.user_limit} usuarios` : 'Usuarios ilimitados'}</li>
<li>• {plan.storage_limit_mb != null ? `${plan.storage_limit_mb} MB de armazenamento` : 'Armazenamento ilimitado'}</li>
```

---

## Bug 6 (MEDIO) — Import usa limites stale (cache desatualizado)

### Problema

`ProductsPage.tsx:207-216` verifica limites usando `usageLimits` em state React, que eh carregado uma vez no mount. Se o usuario abrir o modal de importacao apos algum tempo, os limites podem estar desatualizados.

Pior: se o trigger do banco rejeitar no meio do import (loop `for` na linha 228), alguns produtos sao inseridos e outros nao, sem rollback.

### Correcao

**Arquivo**: `src/modules/products/ProductsPage.tsx` — linhas 203-217

```ts
// ANTES:
const handleImportProducts = async () => {
  if (!currentCompany || importPreview.length === 0) return;

  if (usageLimits && usageLimits.products.limit !== null) {
    const availableSlots = usageLimits.products.limit - usageLimits.products.used;
    // ...
  }

// DEPOIS:
const handleImportProducts = async () => {
  if (!currentCompany || importPreview.length === 0) return;

  // Recarregar limites antes de importar para evitar dados stale
  const freshUsage = await getCompanyUsage(currentCompany.id);
  if (freshUsage.products.limit !== null) {
    const availableSlots = freshUsage.products.limit - freshUsage.products.used;
    if (availableSlots <= 0) {
      toast.error('Limite de produtos atingido. Faca upgrade do seu plano para importar produtos.');
      return;
    }
    if (importPreview.length > availableSlots) {
      toast.error(`Voce pode importar apenas ${availableSlots} produto(s). Seu plano permite ${freshUsage.products.limit} produtos.`);
      return;
    }
  }
```

---

## Bug 7 (MEDIO) — Trigger check_product_limit nao cobre UPDATE (reativacao)

### Problema

O trigger atual dispara apenas em `INSERT`:

```sql
CREATE TRIGGER check_product_limit_trigger
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_limit();
```

Editar um produto desativado e mudar `is_active` para `true` usa `UPDATE` e **nao** passa pelo trigger. O frontend tambem nao verifica no edit (`ProductsPage.tsx:344` so checa `!editingProduct`).

> Nota da MEMORY.md: "Ao ter recursos que podem ser ativados/desativados, SEMPRE verificar o limite na REATIVACAO tambem".

### Correcao

**Nova migration**: `supabase/migrations/YYYYMMDDHHMMSS_check_product_limit_on_update.sql`

```sql
-- Extend check_product_limit to also fire on UPDATE when is_active changes to TRUE
-- This prevents bypassing the limit by deactivating and reactivating products.

CREATE OR REPLACE FUNCTION check_product_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INT;
  plan_limit INT;
  has_subscription BOOLEAN;
BEGIN
  -- No UPDATE: so verificar se is_active mudou de false para true
  IF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.is_active = false AND NEW.is_active = true) THEN
      RETURN NEW;  -- nao eh reativacao, deixa passar
    END IF;
  END IF;

  -- Get current product count (todos os produtos, ativos e inativos)
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE company_id = NEW.company_id;

  -- Get plan limit
  SELECT p.product_limit INTO plan_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.company_id = NEW.company_id
  AND s.status = 'active';

  has_subscription := FOUND;

  IF NOT has_subscription THEN
    SELECT product_limit INTO plan_limit
    FROM plans
    WHERE name = 'free';
  END IF;

  -- NULL = ilimitado
  IF plan_limit IS NOT NULL AND product_count >= plan_limit THEN
    RAISE EXCEPTION 'Limite de produtos atingido. Faca upgrade do seu plano.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger incluindo UPDATE
DROP TRIGGER IF EXISTS check_product_limit_trigger ON products;

CREATE TRIGGER check_product_limit_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_limit();
```

**Tambem corrigir o frontend** — `src/modules/products/ProductsPage.tsx` — linha 344

```ts
// ANTES:
if (!editingProduct && usageLimits && !canAddProduct(usageLimits)) {

// DEPOIS:
const isReactivating = editingProduct && !editingProduct.is_active && formData.is_active;
if ((!editingProduct || isReactivating) && usageLimits && !canAddProduct(usageLimits)) {
```

---

## Bug 8 (MEDIO) — BillingPage nunca recarrega dados ao voltar

### Problema

`BillingPage.tsx:39-47` usa `loadedCompanyRef` para evitar recarregar, mas impede refresh quando o usuario volta a pagina:

```ts
const loadedCompanyRef = useRef<string | null>(null);

useEffect(() => {
  const companyId = currentCompany?.id;
  if (companyId && loadedCompanyRef.current !== companyId) {
    loadedCompanyRef.current = companyId;  // so carrega 1 vez por company
    loadBillingData();
  }
}, [currentCompany?.id]);
```

Se o webhook ativa a subscription enquanto o usuario esta em outra pagina, ao voltar para billing a pagina mostra dados antigos.

### Correcao

**Arquivo**: `src/modules/billing/BillingPage.tsx` — linhas 38-48

```ts
// ANTES:
const loadedCompanyRef = useRef<string | null>(null);

useEffect(() => {
  const companyId = currentCompany?.id;
  if (companyId && loadedCompanyRef.current !== companyId) {
    loadedCompanyRef.current = companyId;
    loadBillingData();
  }
}, [currentCompany?.id]);

// DEPOIS:
// Carregar dados sempre que a pagina montar ou company mudar
useEffect(() => {
  if (currentCompany?.id) {
    loadBillingData();
  }
}, [currentCompany?.id]);
```

> A chamada a edge function eh leve (1 query). O custo de recarregar eh minimo comparado ao risco de dados stale.

---

## Bug 9 (MEDIO) — Botao Ativar no mobile nao fica disabled

### Problema

O card mobile do `UsersPage.tsx:482-492` nao aplica `disabled` no botao de ativar:

```tsx
// Mobile (linha 482-492) — SEM disabled:
<button
  onClick={() => handleOpenToggleModal(m)}
  className={`p-2 ...`}
  title={m.is_active ? 'Desativar' : 'Ativar'}
>
  <BlockIcon className="w-5 h-5" />
</button>
```

Na tabela desktop o `disabled` eh aplicado corretamente. O `handleConfirmToggle` (linha 228) verifica `canAddUser()`, entao o backend esta protegido — mas o botao nao fica visualmente desabilitado e abre o modal a toa.

### Correcao

**Arquivo**: `src/modules/users/UsersPage.tsx` — linhas 482-492

```tsx
// ANTES:
<button
  onClick={() => handleOpenToggleModal(m)}
  className={`p-2 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${
    m.is_active
      ? 'text-gray-500 hover:text-red-600'
      : 'text-gray-500 hover:text-green-600'
  }`}
  title={m.is_active ? 'Desativar' : 'Ativar'}
>

// DEPOIS:
<button
  onClick={() => handleOpenToggleModal(m)}
  disabled={!m.is_active && userLimitReached}
  className={`p-2 transition-colors rounded-lg ${
    !m.is_active && userLimitReached
      ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
      : m.is_active
        ? 'text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800'
        : 'text-gray-500 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`}
  title={!m.is_active && userLimitReached ? 'Limite de usuarios atingido' : m.is_active ? 'Desativar' : 'Ativar'}
>
```

---

## Bug 10 (BAIXO) — Polling silencia erro de auth

### Problema

`asaas.ts:334-336` retorna `{ status: 'pending', isActive: false }` quando nao tem token:

```ts
const token = await getAuthToken();
if (!token) {
  return { status: 'pending', isActive: false };
}
```

Se a sessao expira durante a tela de pagamento, o polling continua por 5 minutos retornando "pending" sem nunca detectar o pagamento.

### Correcao

**Arquivo**: `src/services/asaas.ts` — linhas 334-337

```ts
// ANTES:
const token = await getAuthToken();
if (!token) {
  return { status: 'pending', isActive: false };
}

// DEPOIS:
const token = await getAuthToken();
if (!token) {
  throw new Error('Sessao expirada. Faca login novamente.');
}
```

O `pollSubscriptionStatus` (linha 389-394) ja tem catch que continua tentando, entao o polling nao vai quebrar. Mas o usuario vera o erro no console e pode ser informado.

---

## Bug 11 (BAIXO) — FREE_PLAN_LIMITS duplicado em 2 arquivos

### Problema

A mesma constante existe em dois arquivos:

```ts
// src/services/asaas.ts:218-222
const FREE_PLAN_LIMITS = {
  product_limit: 20,
  user_limit: 1,
  storage_limit_mb: 100,
};

// src/hooks/usePlanFeatures.ts:23-27
const FREE_PLAN_LIMITS = {
  product_limit: 20,
  user_limit: 1,
  storage_limit_mb: 100,
};
```

Se alguem alterar um e esquecer o outro, os limites ficam inconsistentes.

### Correcao

Manter em um unico lugar e importar:

**Arquivo**: `src/hooks/usePlanFeatures.ts` — remover linhas 22-27 e importar:

```ts
// ANTES:
import {
  getCompanySubscription,
  getCompanyUsage,
  canAddProduct,
  canAddUser,
  type UsageLimits,
} from '../services/asaas';

// Limites padrao do plano gratuito
const FREE_PLAN_LIMITS = {
  product_limit: 20,
  user_limit: 1,
  storage_limit_mb: 100,
};

// DEPOIS:
import {
  getCompanySubscription,
  getCompanyUsage,
  canAddProduct,
  canAddUser,
  FREE_PLAN_LIMITS,
  type UsageLimits,
} from '../services/asaas';

// Remover a constante FREE_PLAN_LIMITS daqui
```

**Arquivo**: `src/services/asaas.ts` — exportar a constante (linha 218):

```ts
// ANTES:
const FREE_PLAN_LIMITS = {

// DEPOIS:
export const FREE_PLAN_LIMITS = {
```

---

## Ordem de Execucao Recomendada

1. **Bug 2** — Filtrar subscription por status (CRITICO, impacto maior, fix simples)
2. **Bug 3** — Defesa no usePlanFeatures (complementa Bug 2)
3. **Bug 1** — Eliminar fetch duplicado (CRITICO, melhora performance)
4. **Bug 7** — Trigger para UPDATE + check no frontend (MEDIO, previne bypass)
5. **Bug 4 + 5** — Corrigir falsy checks (ALTO, fix rapido)
6. **Bug 8** — Remover cache da BillingPage (MEDIO, fix rapido)
7. **Bug 9** — Disabled no mobile (MEDIO, fix rapido)
8. **Bug 11** — Unificar constantes (BAIXO, housekeeping)
9. **Bug 6** — Refresh limites no import (MEDIO)
10. **Bug 10** — Throw ao inves de silenciar (BAIXO)

## Checklist de Deploy

- [ ] Corrigir Edge Function (`asaas-billing/index.ts`) e fazer `supabase functions deploy asaas-billing`
- [ ] Criar e aplicar nova migration para trigger de UPDATE
- [ ] Corrigir arquivos frontend listados acima
- [ ] `npm run build` na VPS
- [ ] Testar: criar assinatura, cancelar, verificar que limites voltam ao free
- [ ] Testar: desativar produto, atingir limite, tentar reativar — deve bloquear
- [ ] Testar: importar produtos com limite proximo
- [ ] Testar: botao Ativar usuario no mobile com limite atingido

# Plano de Implementacao - Restricoes de Features por Plano

## Objetivo

Implementar verificacoes para garantir que usuarios so acessem funcionalidades incluidas em seus planos.

---

## Status Atual

### Funcionando
- [x] Limite de produtos (ProductsPage.tsx)
- [x] Limite de usuarios (UsersPage.tsx)
- [x] Feature: Cupons (CouponsPage.tsx)
- [x] Feature: Promocoes (PromotionsPage.tsx)
- [x] Feature: Fidelidade (LoyaltyPage.tsx)
- [x] Feature: WhatsApp notifications (SettingsPage.tsx)

### Pendente (Futuro)
- [ ] Feature: Relatorios avancados (quando criar pagina)

---

## Arquitetura da Solucao

### 1. Hook Central: `usePlanFeatures`

Criar um hook que fornece:
- Features disponiveis do plano atual
- Limites de uso (produtos, usuarios, storage)
- Funcoes helper para verificar acesso

```typescript
// src/hooks/usePlanFeatures.ts
export function usePlanFeatures() {
  return {
    features: PlanFeatures,
    limits: UsageLimits,
    hasFeature: (feature: keyof PlanFeatures) => boolean,
    canAddProduct: () => boolean,
    canAddUser: () => boolean,
    isLoading: boolean,
  }
}
```

### 2. Componente: `FeatureGate`

Componente wrapper que bloqueia acesso a features nao disponiveis:

```typescript
// src/components/gates/FeatureGate.tsx
<FeatureGate feature="coupons" fallback={<UpgradePrompt />}>
  <CouponsPage />
</FeatureGate>
```

### 3. Componente: `UpgradePrompt`

Tela amigavel mostrando que a feature requer upgrade:

```typescript
// src/components/gates/UpgradePrompt.tsx
- Icone da feature bloqueada
- Mensagem explicativa
- Botao "Ver Planos" -> /faturamento (via subdominio)
```

---

## Tarefas de Implementacao

### Fase 1: Infraestrutura (Base)

#### 1.1 Criar hook usePlanFeatures
- Arquivo: `src/hooks/usePlanFeatures.ts`
- Busca subscription da empresa atual
- Retorna features e limites
- Cache para evitar requisicoes repetidas

#### 1.2 Criar componente UpgradePrompt
- Arquivo: `src/components/gates/UpgradePrompt.tsx`
- Props: featureName, featureDescription
- Estilo consistente com o app
- Link para pagina de faturamento

#### 1.3 Criar componente FeatureGate
- Arquivo: `src/components/gates/FeatureGate.tsx`
- Props: feature, children, fallback
- Usa usePlanFeatures internamente

---

### Fase 2: Aplicar nas Paginas

#### 2.1 CouponsPage
- Arquivo: `src/modules/coupons/CouponsPage.tsx`
- Verificar: `features.coupons`
- Se false: mostrar UpgradePrompt

#### 2.2 PromotionsPage
- Arquivo: `src/modules/promotions/PromotionsPage.tsx`
- Verificar: `features.promotions`
- Se false: mostrar UpgradePrompt

#### 2.3 LoyaltyPage
- Arquivo: `src/modules/loyalty/LoyaltyPage.tsx`
- Verificar: `features.loyalty_program`
- Se false: mostrar UpgradePrompt

#### 2.4 UsersPage (limite de usuarios)
- Arquivo: `src/modules/users/UsersPage.tsx`
- Verificar limite antes de convidar usuario
- Desabilitar botao se atingiu limite
- Mostrar alerta similar ao de produtos
- **Verificar limite ao reativar usuario** (fix v0.21.0): `handleConfirmToggle` verifica `canAddUser()` antes de reativar membro inativo. Botao de reativar desabilitado visualmente quando limite atingido.

---

### Fase 3: Funcionalidades Especificas

#### 3.1 WhatsApp Notifications [IMPLEMENTADO]
- Arquivo: `src/modules/settings/SettingsPage.tsx`
- Verificar: `hasFeature('whatsapp_notifications')`
- Se false: mostrar UpgradePrompt no lugar do card de WhatsApp

#### 3.2 Relatorios Avancados (futuro)
- Verificar: `features.advanced_reports`
- Aplicar quando criar pagina de relatorios

---

## Ordem de Execucao

1. [x] Criar `src/hooks/usePlanFeatures.ts`
2. [x] Criar `src/components/gates/UpgradePrompt.tsx`
3. [x] Criar `src/components/gates/FeatureGate.tsx`
4. [x] Aplicar em CouponsPage
5. [x] Aplicar em PromotionsPage
6. [x] Aplicar em LoyaltyPage
7. [x] Aplicar limite de usuarios em UsersPage
8. [x] Aplicar WhatsApp notifications em SettingsPage
9. [ ] Testar fluxo completo

---

## Testes

### Cenario 1: Usuario Gratis
- Acessa /cupons -> Ve UpgradePrompt
- Acessa /promocoes -> Ve UpgradePrompt
- Acessa /fidelidade -> Ve UpgradePrompt
- Acessa /usuarios -> Pode ver, mas nao pode convidar
- Acessa /configuracoes -> Card WhatsApp mostra UpgradePrompt

### Cenario 2: Usuario Starter
- Acessa /cupons -> Funciona
- Acessa /promocoes -> Funciona
- Acessa /fidelidade -> Ve UpgradePrompt
- Acessa /usuarios -> Pode convidar ate 2
- Acessa /configuracoes -> Card WhatsApp funciona

### Cenario 3: Usuario Pro+
- Tudo funciona

---

## Notas

- Plano gratuito sem subscription: considerar como plano free
- Cache de features: usar React Query ou estado local
- Fallback para plano free se erro ao buscar subscription

---

## Guia de Atualizacao de Planos

### Arquivos Envolvidos

| Arquivo | O que faz |
|---------|-----------|
| `supabase/migrations/20260127000001_billing_tables.sql` | Definicao inicial dos planos |
| `supabase/migrations/20260128000006_update_plans.sql` | Atualizacoes de planos |
| `src/types/index.ts` | Interface `PlanFeatures` (TypeScript) |
| `src/components/gates/UpgradePrompt.tsx` | Descricoes das features |
| `src/modules/billing/components/PlanCard.tsx` | Labels das features no card |
| `src/hooks/usePlanFeatures.ts` | Defaults do plano gratuito |

---

### 1. Alterar Limites (Produtos, Usuarios, Storage)

#### Via SQL (Supabase Dashboard)

```sql
-- Exemplo: Aumentar limite de produtos do plano Starter para 200
UPDATE plans SET
  product_limit = 200,
  updated_at = NOW()
WHERE name = 'starter';

-- Exemplo: Aumentar limite de usuarios do plano Pro para 10
UPDATE plans SET
  user_limit = 10,
  updated_at = NOW()
WHERE name = 'pro';

-- Exemplo: Tornar produtos ilimitados no plano Business
UPDATE plans SET
  product_limit = NULL,  -- NULL = ilimitado
  updated_at = NOW()
WHERE name = 'business';
```

#### Via Migration (Recomendado para producao)

Criar novo arquivo: `supabase/migrations/YYYYMMDD000001_update_plan_limits.sql`

```sql
-- Atualizar limites do plano Starter
UPDATE plans SET
  product_limit = 200,
  user_limit = 3,
  storage_limit_mb = 1000,
  updated_at = NOW()
WHERE name = 'starter';
```

Aplicar:
```bash
npx supabase db push --project-ref jyjkeqnmofzjnzpvkugl
```

---

### 2. Alterar Features de um Plano

#### Habilitar feature em um plano

```sql
-- Habilitar fidelidade no plano Starter
UPDATE plans SET
  features = jsonb_set(features, '{loyalty_program}', 'true'),
  updated_at = NOW()
WHERE name = 'starter';
```

#### Desabilitar feature em um plano

```sql
-- Desabilitar cupons no plano Starter
UPDATE plans SET
  features = jsonb_set(features, '{coupons}', 'false'),
  updated_at = NOW()
WHERE name = 'starter';
```

#### Atualizar multiplas features de uma vez

```sql
UPDATE plans SET
  features = '{
    "whatsapp_notifications": true,
    "advanced_reports": true,
    "multiple_users": true,
    "promotions": true,
    "loyalty_program": true,
    "coupons": true
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'pro';
```

---

### 3. Adicionar Nova Feature

#### Passo 1: Atualizar TypeScript

Editar `src/types/index.ts`:

```typescript
export interface PlanFeatures {
  whatsapp_notifications: boolean;
  advanced_reports: boolean;
  multiple_users: boolean;
  promotions: boolean;
  loyalty_program: boolean;
  coupons: boolean;
  nova_feature: boolean;  // <-- Adicionar aqui
}
```

#### Passo 2: Atualizar defaults do plano gratuito

Editar `src/hooks/usePlanFeatures.ts`:

```typescript
const FREE_PLAN_FEATURES: PlanFeatures = {
  whatsapp_notifications: false,
  advanced_reports: false,
  multiple_users: false,
  promotions: false,
  loyalty_program: false,
  coupons: false,
  nova_feature: false,  // <-- Adicionar aqui
};
```

#### Passo 3: Adicionar descricao no UpgradePrompt

Editar `src/components/gates/UpgradePrompt.tsx`:

```typescript
const FEATURE_INFO: Record<keyof PlanFeatures, FeatureInfo> = {
  // ... features existentes ...
  nova_feature: {
    icon: NovoIcone,
    title: 'Nova Feature',
    description: 'Descricao da nova feature.',
    minPlan: 'Starter',
  },
};
```

#### Passo 4: Adicionar label no PlanCard

Editar `src/modules/billing/components/PlanCard.tsx`:

```typescript
const featureLabels: Record<keyof Plan['features'], string> = {
  // ... labels existentes ...
  nova_feature: 'Nova Feature',
};
```

#### Passo 5: Atualizar banco de dados

Criar migration `supabase/migrations/YYYYMMDD000001_add_nova_feature.sql`:

```sql
-- Adicionar nova feature a todos os planos
UPDATE plans SET
  features = features || '{"nova_feature": false}'::jsonb,
  updated_at = NOW()
WHERE name = 'free';

UPDATE plans SET
  features = features || '{"nova_feature": true}'::jsonb,
  updated_at = NOW()
WHERE name IN ('starter', 'pro', 'business', 'enterprise');
```

#### Passo 6: Aplicar FeatureGate na pagina

```typescript
import { FeatureGate } from '../../components/gates';

export function NovaFeaturePage() {
  return (
    <FeatureGate feature="nova_feature">
      {/* Conteudo da pagina */}
    </FeatureGate>
  );
}
```

---

### 4. Alterar Precos

```sql
-- Alterar preco mensal do plano Starter
UPDATE plans SET
  price_monthly = 49.90,
  updated_at = NOW()
WHERE name = 'starter';

-- Alterar preco anual do plano Pro (com desconto)
UPDATE plans SET
  price_yearly = 699.00,  -- ~17% desconto
  updated_at = NOW()
WHERE name = 'pro';
```

**Importante:** Alteracoes de preco so afetam NOVAS assinaturas. Assinaturas existentes mantem o preco antigo ate renovacao.

---

### 5. Criar Novo Plano

```sql
INSERT INTO plans (
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  product_limit,
  user_limit,
  storage_limit_mb,
  features,
  sort_order
) VALUES (
  'premium',
  'Premium',
  'Para negocios exigentes',
  199.90,
  1999.00,
  5000,
  15,
  20000,
  '{
    "whatsapp_notifications": true,
    "advanced_reports": true,
    "multiple_users": true,
    "promotions": true,
    "loyalty_program": true,
    "coupons": true
  }'::jsonb,
  4  -- Entre Business (4) e Enterprise (5)
);

-- Reordenar planos existentes se necessario
UPDATE plans SET sort_order = 5 WHERE name = 'business';
UPDATE plans SET sort_order = 6 WHERE name = 'enterprise';
```

---

### 6. Desativar um Plano

```sql
-- Desativar plano (nao aparece mais para novos usuarios)
UPDATE plans SET
  is_active = false,
  updated_at = NOW()
WHERE name = 'starter';
```

**Nota:** Usuarios existentes com esse plano continuam usando normalmente.

---

### 7. Consultar Planos Atuais

```sql
-- Ver todos os planos
SELECT
  name,
  display_name,
  price_monthly,
  price_yearly,
  product_limit,
  user_limit,
  features,
  is_active
FROM plans
ORDER BY sort_order;

-- Ver features de um plano especifico
SELECT
  name,
  features
FROM plans
WHERE name = 'pro';
```

---

### Checklist de Atualizacao

Ao atualizar planos, verifique:

- [ ] Atualizou o banco de dados (SQL/migration)
- [ ] Atualizou `PlanFeatures` em `src/types/index.ts` (se nova feature)
- [ ] Atualizou `FREE_PLAN_FEATURES` em `usePlanFeatures.ts` (se nova feature)
- [ ] Atualizou `FEATURE_INFO` em `UpgradePrompt.tsx` (se nova feature)
- [ ] Atualizou `featureLabels` em `PlanCard.tsx` (se nova feature)
- [ ] Aplicou `FeatureGate` na pagina (se nova feature)
- [ ] Testou com usuario de cada plano
- [ ] Build passou sem erros (`npm run build`)

---

### Comandos Uteis

```bash
# Aplicar migrations pendentes
npx supabase db push --project-ref jyjkeqnmofzjnzpvkugl

# Ver logs do banco
npx supabase db logs --project-ref jyjkeqnmofzjnzpvkugl

# Conectar ao banco diretamente
npx supabase db connect --project-ref jyjkeqnmofzjnzpvkugl

# Verificar build
npm run build
```

# Auditoria de Seguranca e Plano de Melhorias

> Auditoria realizada em 21/02/2026 — MercadoVirtual v0.21.0
> Fase 1 implementada em 21/02/2026

---

## Indice

- [Resumo Executivo](#resumo-executivo)
- [Historico de Implementacao](#historico-de-implementacao)
- [Vulnerabilidades Criticas](#1-vulnerabilidades-criticas)
- [Vulnerabilidades Altas](#2-vulnerabilidades-altas)
- [Vulnerabilidades Medias](#3-vulnerabilidades-medias)
- [Vulnerabilidades Baixas](#4-vulnerabilidades-baixas)
- [Problemas de Arquitetura e Qualidade](#5-problemas-de-arquitetura-e-qualidade)
- [Problemas de Performance](#6-problemas-de-performance)
- [Plano de Acao](#7-plano-de-acao)
- [Checklist de Verificacao](#8-checklist-de-verificacao)

---

## Resumo Executivo

| Severidade | Quantidade | Corrigidos | Pendentes |
|-----------|-----------|-----------|-----------|
| Critica | 4 | 4 | 0 |
| Alta | 5 | 2 | 3 |
| Media | 4 | 0 | 4 |
| Baixa | 4 | 0 | 4 |
| Arquitetura | 7 | 0 | 7 |
| **Total** | **24** | **6** | **18** |

**Risco geral:** ~~ALTO~~ MEDIO — Falhas criticas de isolamento multi-tenant corrigidas. Restam melhorias de arquitetura e seguranca secundaria.

---

## Historico de Implementacao

### Fase 1 — 21/02/2026 (Concluida)

**Migration aplicada:** `supabase/migrations/20260221000001_fix_rls_security.sql`
**Edge Functions deployadas:** Todas as 7 functions redeployadas

| Item | Descricao | Arquivos Modificados |
|------|-----------|---------------------|
| 1.1 + 1.2 | RLS corrigido em 9 tabelas (coupons, coupon_usages, loyalty_config, loyalty_levels, loyalty_points, promotions, promotion_usages, catalog_orders, catalog_order_items) | `20260221000001_fix_rls_security.sql` |
| 1.3 | Webhook token agora obrigatorio (rejeita se nao configurado ou invalido) | `asaas-webhook/index.ts` |
| 1.4 | Validacao de saques com limites (min R$10, max R$50k, conta bancaria obrigatoria) | `asaas-withdrawal-validation/index.ts` |
| 2.1 | CORS restrito para `mercadovirtual.app` + subdominos + localhost dev | `_shared/cors.ts` + todas as 7 Edge Functions |
| 2.2 | Handler `reactivate-subscription` implementado no billing | `asaas-billing/index.ts` |

**Configuracao adicional:**
- `ASAAS_WEBHOOK_TOKEN` configurado nos secrets do Supabase e no painel Asaas
- Functions `asaas-webhook` e `asaas-withdrawal-validation` deployadas com `--no-verify-jwt`

**Testes realizados:**
- Webhook com token correto: 200 OK
- Webhook sem token: 401 Unauthorized
- Webhook com token errado: 401 Unauthorized

---

## 1. Vulnerabilidades Criticas

### 1.1 Politicas RLS Abertas em 7 Tabelas — CORRIGIDO

> Corrigido em 21/02/2026 via `20260221000001_fix_rls_security.sql`

**Problema original:** Sete tabelas possuiam politicas `FOR ALL USING (true) WITH CHECK (true)`, permitindo acesso cruzado entre empresas.

**Correcao aplicada:** Cada tabela agora tem politicas separadas por operacao (SELECT/INSERT/UPDATE/DELETE) com filtro `company_id = ANY(get_user_company_ids()) OR is_super_admin()`. Acesso publico mantido onde necessario (catalogo: cupons publicos ativos, promocoes ativas, programa de fidelidade).

---

### 1.2 Politicas RLS Abertas em Catalog Orders — CORRIGIDO

> Corrigido em 21/02/2026 via `20260221000001_fix_rls_security.sql`

**Problema original:** `catalog_orders` e `catalog_order_items` usavam `USING (true)`.

**Correcao aplicada:**
- Membros da empresa veem pedidos da sua empresa (`company_id = ANY(get_user_company_ids())`)
- Anon pode criar pedidos (catalogo publico) e ver pedidos das ultimas 24h (tela de confirmacao)
- Membros podem atualizar pedidos da sua empresa
- Items seguem as mesmas regras via join com `catalog_orders`

---

### 1.3 Webhook Asaas sem Autenticacao Obrigatoria — CORRIGIDO

> Corrigido em 21/02/2026 — `asaas-webhook/index.ts` + `ASAAS_WEBHOOK_TOKEN` configurado

**Problema original:** Validacao do token era condicional — se `ASAAS_WEBHOOK_TOKEN` nao estivesse configurado, aceitava qualquer request.

**Correcao aplicada:**
- Token agora e obrigatorio: retorna HTTP 500 se nao configurado, HTTP 401 se invalido
- `ASAAS_WEBHOOK_TOKEN` configurado nos secrets do Supabase
- Token configurado no painel Asaas (Webhooks > Access Token)
- Testado com sucesso: token correto aceito, sem token/token errado rejeitados

---

### 1.4 Auto-aprovacao de Saques — CORRIGIDO

> Corrigido em 21/02/2026 — `asaas-withdrawal-validation/index.ts`

**Problema original:** `const authorized = true` — aprovava todos os saques sem validacao.

**Correcao aplicada:**
- Token de webhook agora obrigatorio (mesmo padrao do webhook principal)
- Validacao de valor minimo: R$ 10
- Validacao de valor maximo: R$ 50.000 por saque
- Validacao de conta bancaria obrigatoria
- Logs sem dados sensiveis (apenas id, valor e data)

---

## 2. Vulnerabilidades Altas

### 2.1 CORS Aberto em Todas as Edge Functions — CORRIGIDO

> Corrigido em 21/02/2026 — `_shared/cors.ts` + todas as 7 Edge Functions

**Problema original:** Todas retornavam `Access-Control-Allow-Origin: '*'`.

**Correcao aplicada:**
- Criado `supabase/functions/_shared/cors.ts` com helper `getCorsHeaders(req)`
- Origens permitidas: `https://mercadovirtual.app`, subdominios validos (`/^https:\/\/[a-z0-9]+\.mercadovirtual\.app$/`), localhost dev (5173, 4173, 3000)
- Aplicado em todas as 7 Edge Functions: `asaas-billing`, `asaas-webhook`, `asaas-withdrawal-validation`, `accept-invite`, `send-invite-email`, `print-proxy`, `wuzapi-admin`

---

### 2.2 Acao `reactivate-subscription` Nao Implementada — CORRIGIDO

> Corrigido em 21/02/2026 — `asaas-billing/index.ts`

**Problema original:** Frontend chamava `reactivate-subscription` mas o backend retornava erro 400.

**Correcao aplicada:** Novo handler no switch do `asaas-billing/index.ts` que:
1. Valida `subscriptionId` obrigatorio
2. Busca assinatura existente com plano
3. Verifica permissao (membro da empresa ou super admin)
4. Rejeita se ja ativa
5. Cria nova subscription no Asaas usando `asaas_customer_id` existente
6. Atualiza banco com novo `asaas_subscription_id`, status `pending`
7. Busca dados do primeiro pagamento (PIX/boleto)
8. Retorna subscription atualizada com dados de pagamento

---

### 2.3 Falta Validacao de Input nas Edge Functions

**Arquivos:** Todas as Edge Functions

**Descricao:** Nenhuma funcao valida schema de entrada. Campos como `companyId`, `planId`, `billingType` sao usados diretamente do body sem verificacao.

**Correcao recomendada:** Usar Zod para validacao:

```typescript
import { z } from 'npm:zod';

const CreateSubscriptionSchema = z.object({
  action: z.literal('create-subscription'),
  companyId: z.string().uuid(),
  planId: z.string().uuid(),
  billingType: z.enum(['BOLETO', 'CREDIT_CARD', 'PIX']),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  customerData: z.object({
    name: z.string().min(2),
    cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
    email: z.string().email(),
  }),
});
```

---

### 2.4 Sem Rate Limiting em Nenhum Endpoint

**Impacto:**
- Brute force em tokens de convite (`accept-invite`)
- Spam de operacoes de billing (`asaas-billing`)
- Criacao ilimitada de usuarios WhatsApp (`wuzapi-admin`)
- DoS em impressoras de rede (`print-proxy`)

**Correcao:** Implementar rate limiting por IP e/ou por usuario. Opcoes:
- Upstash Ratelimit (servico externo)
- Rate limit simples com KV store do Deno
- Rate limit baseado em headers do Supabase

---

### 2.5 Autorizacao Insuficiente no WuzAPI

**Arquivo:** `supabase/functions/wuzapi-admin/index.ts` (linhas 209-218)

**Descricao:** A acao `create-user` verifica apenas se o usuario e membro da empresa, mas nao verifica se e admin. Qualquer membro pode configurar WhatsApp.

**Correcao:** Verificar role do membro:

```typescript
const { data: member } = await supabase
  .from('company_members')
  .select('role')
  .eq('user_id', auth.userId)
  .eq('company_id', companyId)
  .single();

if (member?.role !== 'admin' && member?.role !== 'owner') {
  return new Response(JSON.stringify({ error: 'Apenas admins podem configurar WhatsApp' }), { status: 403 });
}
```

---

## 3. Vulnerabilidades Medias

### 3.1 Logout Nao Funciona Entre Subdominios

**Arquivo:** `src/services/supabase.ts` (linhas 69-105)

**Descricao:** A flag `mv-just-logged-out` usa `sessionStorage`, que e isolado por origin. Logout em `loja.mercadovirtual.app` nao e detectado em `mercadovirtual.app`.

**Correcao:** Usar `localStorage` (compartilhado entre subdominios do mesmo dominio) ou cookies com `domain=.mercadovirtual.app`.

---

### 3.2 Sem Idempotencia no Webhook

**Arquivo:** `supabase/functions/asaas-webhook/index.ts`

**Descricao:** Nao verifica se o evento ja foi processado. Retries da Asaas podem duplicar processamento.

**Correcao:** Armazenar `event.id` em tabela de eventos processados:

```sql
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

```typescript
// No inicio do processamento:
const { data: existing } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('id', eventId)
  .single();

if (existing) {
  return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
}
```

---

### 3.3 Subscriptions Pendentes Nao Retornadas

**Arquivo:** `src/services/asaas.ts` (linha 96)

**Descricao:** `getCompanySubscription()` filtra apenas `status = 'active'` e `status = 'overdue'`. Assinaturas recem-criadas com status `pending` ficam invisiveis.

**Correcao:** Incluir `pending` no filtro:

```typescript
.in('status', ['active', 'overdue', 'pending'])
```

---

### 3.4 Mensagens de Erro Vazam Detalhes Internos

**Arquivo:** `supabase/functions/asaas-billing/index.ts` (linhas 200-201)

**Descricao:** Erros da API Asaas sao repassados ao frontend, revelando estrutura interna.

**Correcao:** Retornar mensagens genericas ao usuario:

```typescript
if (!response.ok) {
  console.error('[asaas-billing] Asaas API error:', data); // Log interno
  throw new Error('Erro ao processar pagamento. Tente novamente ou entre em contato.');
}
```

---

## 4. Vulnerabilidades Baixas

### 4.1 Token WhatsApp Deterministico

**Arquivo:** `src/services/whatsapp.ts` (linhas 128-139)

**Descricao:** Token gerado como hash do slug da empresa. Se o slug e conhecido, o token pode ser adivinhado.

**Correcao:** Adicionar salt secreto ou usar UUID aleatorio.

---

### 4.2 Headers de Seguranca Ausentes nas Edge Functions

**Descricao:** Nenhuma Edge Function retorna headers como `X-Content-Type-Options`, `X-Frame-Options`, etc.

**Correcao:** Adicionar ao helper de CORS:

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
```

---

### 4.3 Redirect Nao Validado

**Arquivo:** `src/services/supabase.ts` (linhas 14-20)

**Descricao:** URL de redirect construida a partir do subdominio sem validar formato.

**Correcao:** Validar que o slug so contem caracteres alfanumericos.

---

### 4.4 Chave SUPABASE_ACCESS_TOKEN no .env.local

**Arquivo:** `.env.local` (linha 5)

**Descricao:** Token de deploy do Supabase no .env.local. Nao e enviado ao frontend, mas se o repositorio vazar, permite deploy de Edge Functions maliciosas.

**Acao:** Verificar que `.env.local` esta no `.gitignore`. Rotacionar token se houve exposicao.

---

## 5. Problemas de Arquitetura e Qualidade

### 5.1 Componentes Gigantes

| Arquivo | Linhas | Recomendacao |
|---------|--------|-------------|
| `SalesPage.tsx` | 1098 | Extrair `SalesChart`, `SalesTable`, `SalesFilters` |
| `DashboardPage.tsx` | 998 | Extrair `StatsOverview`, `SalesChart`, `TopProducts` |
| `supabase.ts` | 581 | Separar em `auth.ts`, `session.ts`, `cookies.ts` |
| `AuthContext.tsx` | 420 | Extrair logica de logout para hook dedicado |
| `asaas-billing/index.ts` | 830+ | Separar handlers por acao em arquivos individuais |

---

### 5.2 Zero Error Boundaries

**Impacto:** Qualquer erro em qualquer componente crasha o app inteiro.

**Correcao:** Adicionar Error Boundary global + por modulo:

```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}
```

---

### 5.3 Sem Lazy Loading nas Rotas

**Arquivo:** `src/routes/index.tsx`

**Descricao:** Todos os modulos importados de forma sincrona. O bundle inicial carrega todas as paginas.

**Correcao:**

```typescript
const DashboardPage = lazy(() => import('../modules/dashboard/DashboardPage'));
const BillingPage = lazy(() => import('../modules/billing/BillingPage'));
const SalesPage = lazy(() => import('../modules/sales/SalesPage'));
// ...
```

---

### 5.4 Constantes Duplicadas (KNOWN_DOMAINS)

**Arquivos:**
- `src/contexts/AuthContext.tsx` (linhas 112-118)
- `src/contexts/TenantContext.tsx` (linhas 28-33)
- `src/routes/guards.tsx`

**Descricao:** Lista de dominios conhecidos definida em 3 lugares diferentes, com valores **inconsistentes**.

**Correcao:** Centralizar em `src/config/domains.ts`:

```typescript
export const KNOWN_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'mercadovirtual.app',
  // ...
];

export function isSubdomainMode(): boolean { /* ... */ }
export function getSubdomainSlug(): string | null { /* ... */ }
```

---

### 5.5 Queries N+1

**Arquivo:** `src/modules/users/UsersPage.tsx` (linhas 74-108)

**Descricao:** Busca membros e depois busca perfis em query separada.

**Correcao:** Usar join do Supabase:

```typescript
const { data } = await supabase
  .from('company_members')
  .select('*, profile:profiles(*)')
  .eq('company_id', currentCompany.id);
```

---

### 5.6 Zero Testes Automatizados

**Descricao:** Nenhum arquivo de teste encontrado em `src/`. Sem testes unitarios, de integracao ou E2E.

**Recomendacao priorizada:**
1. Testes para `usePlanFeatures` (logica de limites e features)
2. Testes para `asaas.ts` (fluxo de billing)
3. Testes para validacao de input nas Edge Functions
4. Testes E2E para fluxo de assinatura

---

### 5.7 Memoizacao Insuficiente

**Descricao:** Apenas 70 instancias de `useCallback`/`useMemo`/`React.memo` em 142 arquivos.

**Prioridade:** Adicionar memo em componentes de lista (`ProductsPage`, `SalesPage`) e callbacks passados como props.

---

## 6. Problemas de Performance

### 6.1 Indices Faltando no Banco

```sql
-- Catalogo: queries de produtos ativos por empresa
CREATE INDEX idx_products_company_active ON products(company_id, is_active);

-- Webhook: lookup de pagamentos por ID Asaas
CREATE INDEX idx_payments_asaas_payment_id ON payments(asaas_payment_id);

-- Relatorios: vendas por vendedor
CREATE INDEX idx_sales_seller_company ON sales(seller_id, company_id);

-- Clientes: busca por telefone
CREATE INDEX idx_customers_phone_company ON customers(phone, company_id);

-- Cupons: lookup por pedido
CREATE INDEX idx_coupon_usages_order_id ON coupon_usages(order_id);
```

---

### 6.2 Delay Artificial na Criacao de Assinatura

**Arquivo:** `supabase/functions/asaas-billing/index.ts` (linha 410)

**Descricao:** `setTimeout` de 1 segundo antes de buscar dados de pagamento. Adiciona latencia desnecessaria.

**Correcao:** Implementar polling com retry ou usar webhook para notificar quando pagamento estiver disponivel.

---

### 6.3 Funcao RLS `get_user_company_ids()` Sem Cache

**Arquivo:** `supabase/migrations/20251226000002_create_rls_policies.sql` (linhas 21-29)

**Descricao:** Funcao executa query em `company_members` para CADA verificacao de RLS. Em paginas com multiplas queries, isso gera dezenas de lookups repetidos.

**Correcao:** Marcar como `STABLE` (ja esta) e considerar usar `SET` statement-level caching ou subqueries inline nas policies.

---

## 7. Plano de Acao

### Fase 1 — Critica (Imediato) — CONCLUIDA 21/02/2026

- [x] **1.1** Criar migration corrigindo RLS das 7 tabelas (coupons, loyalty, promotions)
- [x] **1.2** Criar migration corrigindo RLS de catalog_orders
- [x] **1.3** Tornar webhook token obrigatorio no `asaas-webhook`
- [x] **1.4** Implementar validacao real no `asaas-withdrawal-validation`
- [x] **2.1** Restringir CORS para dominios conhecidos
- [x] **2.2** Implementar `reactivate-subscription` no `asaas-billing`

### Fase 2 — Alta (1 semana)

- [ ] **2.3** Adicionar validacao de input com Zod nas Edge Functions
- [ ] **2.4** Implementar rate limiting basico
- [ ] **2.5** Corrigir autorizacao no `wuzapi-admin` (verificar role)
- [ ] **3.1** Corrigir logout cross-subdomain
- [ ] **3.2** Adicionar idempotencia no webhook
- [ ] **3.3** Incluir status `pending` no filtro de subscriptions
- [ ] **3.4** Sanitizar mensagens de erro no frontend

### Fase 3 — Melhorias (2-3 semanas)

- [ ] **5.1** Quebrar componentes gigantes em sub-componentes
- [ ] **5.2** Adicionar Error Boundaries
- [ ] **5.3** Implementar lazy loading nas rotas
- [ ] **5.4** Centralizar KNOWN_DOMAINS
- [ ] **5.5** Corrigir queries N+1
- [ ] **6.1** Criar indices faltantes no banco

### Fase 4 — Longo Prazo

- [ ] **5.6** Adicionar testes automatizados
- [ ] **5.7** Melhorar memoizacao
- [ ] **6.2** Remover delay artificial
- [ ] **6.3** Otimizar funcao RLS

---

## 8. Checklist de Verificacao

Apos implementar as correcoes, verificar:

- [ ] RLS: Testar que usuario da empresa A NAO consegue ler dados da empresa B
- [ ] RLS: Testar que super_admin consegue acessar todas as empresas
- [x] Webhook: Testar que requests sem token sao rejeitados (HTTP 401) — Testado 21/02/2026
- [ ] Webhook: Testar que eventos duplicados nao sao reprocessados
- [ ] CORS: Testar que requests de dominios nao autorizados sao bloqueados
- [ ] Billing: Testar fluxo completo: criar > pagar > ativar > cancelar > reativar
- [ ] Limites: Testar que reativacao de produto/usuario respeita limites do plano
- [ ] Logout: Testar que logout em subdominio A desloga de subdominio B
- [ ] Auth: Testar que convites expirados/usados sao rejeitados
- [ ] WhatsApp: Testar que apenas admins podem configurar integracao

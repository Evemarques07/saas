# Integracao de Billing com Asaas

Este documento descreve a integracao completa do sistema de cobrancas e assinaturas usando a API do Asaas.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura](#arquitetura)
3. [Configuracao](#configuracao)
4. [Estrutura de Dados](#estrutura-de-dados)
5. [Planos Disponiveis](#planos-disponiveis)
6. [Fluxos de Pagamento](#fluxos-de-pagamento)
7. [Edge Function](#edge-function)
8. [Frontend](#frontend)
9. [Webhooks](#webhooks)
10. [Limites e Restricoes](#limites-e-restricoes)
11. [Migracao para Producao](#migracao-para-producao)
12. [Troubleshooting](#troubleshooting)

---

## Visao Geral

O sistema utiliza a API do Asaas para gerenciar assinaturas recorrentes das empresas cadastradas no Ejym SaaS. A integracao suporta:

- Assinaturas mensais e anuais
- Pagamento via PIX, Boleto ou Cartao de Credito
- Controle de limites por plano (produtos, usuarios, storage)
- Historico de pagamentos
- Upgrade/downgrade de planos

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE BILLING                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐     ┌──────────────┐     ┌──────────────┐            │
│   │ Frontend │────▶│ Edge Function│────▶│  Asaas API   │            │
│   │ (React)  │     │  (Supabase)  │     │              │            │
│   └──────────┘     └──────────────┘     └──────────────┘            │
│        │                  │                    │                     │
│        │ polling          │                    │                     │
│        ▼                  ▼                    ▼                     │
│   ┌──────────┐     ┌──────────────┐     ┌──────────────┐            │
│   │  Exibe   │     │   Supabase   │◀────│   Webhook    │            │
│   │ PIX/Link │     │   Database   │     │ asaas-webhook│            │
│   └──────────┘     └──────────────┘     └──────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura

### Componentes

| Componente | Descricao | Localizacao |
|------------|-----------|-------------|
| **Frontend Service** | Servico para chamadas de billing | `src/services/asaas.ts` |
| **Edge Function** | API segura para Asaas | `supabase/functions/asaas-billing/` |
| **Tipos TypeScript** | Interfaces e tipos | `src/types/index.ts` |
| **Pagina Billing** | UI de faturamento | `src/modules/billing/` |
| **Migration SQL** | Tabelas do banco | `supabase/migrations/20260127000001_billing_tables.sql` |

### Por que Edge Function?

A API Key do Asaas e sensivel e **nao deve ser exposta no frontend**. Por isso:

1. Chave armazenada como **secret** no Supabase
2. Todas chamadas passam pela Edge Function
3. Edge Function valida autenticacao Firebase
4. Edge Function verifica permissoes (membro da empresa)

---

## Configuracao

### Variaveis de Ambiente

```env
# .env.local (desenvolvimento)
ASAAS_API_KEY=$aact_hmlg_000...  # Chave sandbox
ASAAS_ENVIRONMENT=sandbox
ASAAS_API_URL=https://sandbox.asaas.com/api/v3
```

### Secrets do Supabase

```bash
# Configurar secrets para Edge Functions
npx supabase secrets set \
  ASAAS_API_KEY="$aact_hmlg_000..." \
  ASAAS_API_URL="https://sandbox.asaas.com/api/v3" \
  --project-ref jyjkeqnmofzjnzpvkugl
```

### Deploy da Edge Function

```bash
npx supabase functions deploy asaas-billing --no-verify-jwt --project-ref jyjkeqnmofzjnzpvkugl
```

---

## Estrutura de Dados

### Tabela: plans

Armazena os planos disponiveis no sistema.

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- 'free', 'starter', 'pro', etc.
  display_name TEXT NOT NULL,          -- 'Gratis', 'Starter', etc.
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2),          -- NULL se nao tiver opcao anual
  product_limit INT,                   -- NULL = ilimitado
  user_limit INT,                      -- NULL = ilimitado
  storage_limit_mb INT,                -- NULL = ilimitado
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela: subscriptions

Armazena as assinaturas ativas das empresas.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  asaas_subscription_id TEXT,          -- 'sub_xxx' do Asaas
  asaas_customer_id TEXT,              -- 'cus_xxx' do Asaas
  billing_type TEXT DEFAULT 'UNDEFINED', -- BOLETO, CREDIT_CARD, PIX
  billing_cycle TEXT DEFAULT 'MONTHLY',  -- MONTHLY, QUARTERLY, YEARLY
  status TEXT DEFAULT 'active',        -- active, overdue, canceled, expired
  price DECIMAL(10,2) NOT NULL,
  next_due_date DATE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)                   -- Uma assinatura por empresa
);
```

### Tabela: payments

Historico de pagamentos.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  asaas_payment_id TEXT,               -- 'pay_xxx' do Asaas
  amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2),            -- Valor liquido apos taxas
  status TEXT DEFAULT 'PENDING',       -- PENDING, CONFIRMED, RECEIVED, OVERDUE
  billing_type TEXT,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Diagrama ER

```
┌─────────────┐       ┌───────────────┐       ┌───────────┐
│   plans     │       │ subscriptions │       │  payments │
├─────────────┤       ├───────────────┤       ├───────────┤
│ id (PK)     │◀──────│ plan_id (FK)  │       │ id (PK)   │
│ name        │       │ id (PK)       │◀──────│ sub_id(FK)│
│ display_name│       │ company_id(FK)│       │ amount    │
│ price_*     │       │ asaas_sub_id  │       │ status    │
│ *_limit     │       │ status        │       │ due_date  │
│ features    │       │ price         │       │ paid_at   │
└─────────────┘       └───────────────┘       └───────────┘
                             │
                             │
                      ┌──────▼──────┐
                      │  companies  │
                      ├─────────────┤
                      │ id (PK)     │
                      │ name        │
                      │ slug        │
                      └─────────────┘
```

---

## Planos Disponiveis

| Plano | Mensal | Anual | Produtos | Usuarios | Storage |
|-------|--------|-------|----------|----------|---------|
| **Gratis** | R$ 0 | - | 20 | 1 | 100 MB |
| **Starter** | R$ 39,90 | R$ 399 | 100 | 2 | 500 MB |
| **Profissional** | R$ 79,90 | R$ 799 | 400 | 5 | 2 GB |
| **Business** | R$ 149,90 | R$ 1.499 | 3.000 | 10 | 10 GB |
| **Enterprise** | R$ 299,90 | R$ 2.999 | Ilimitado | Ilimitado | Ilimitado |

### Features por Plano

| Feature | Gratis | Starter | Pro | Business | Enterprise |
|---------|--------|---------|-----|----------|------------|
| Catalogo online | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gestao de clientes | ✓ | ✓ | ✓ | ✓ | ✓ |
| Registro de vendas | ✓ | ✓ | ✓ | ✓ | ✓ |
| PWA instalavel | ✓ | ✓ | ✓ | ✓ | ✓ |
| WhatsApp notifications | ✗ | ✓ | ✓ | ✓ | ✓ |
| Sistema de promocoes | ✗ | ✓ | ✓ | ✓ | ✓ |
| Cupons de desconto | ✗ | ✓ | ✓ | ✓ | ✓ |
| Multiplos usuarios | ✗ | ✓ | ✓ | ✓ | ✓ |
| Relatorios avancados | ✗ | ✗ | ✓ | ✓ | ✓ |
| Programa fidelidade | ✗ | ✗ | ✓ | ✓ | ✓ |

```typescript
interface PlanFeatures {
  whatsapp_notifications: boolean;  // Notificacoes WhatsApp
  advanced_reports: boolean;        // Relatorios avancados
  multiple_users: boolean;          // Multiplos usuarios
  promotions: boolean;              // Sistema de promocoes
  loyalty_program: boolean;         // Programa de fidelidade
  coupons: boolean;                 // Cupons de desconto
}
```

---

## Fluxos de Pagamento

### 1. Criar Assinatura (Nova Empresa)

```
Usuario → Seleciona Plano → Preenche Dados → Edge Function → Asaas
                                                    │
                                                    ├── Cria/Busca Customer
                                                    ├── Cria Subscription
                                                    └── Salva no Supabase
```

**Codigo Frontend:**

```typescript
import { createSubscription } from '@/services/asaas';

const result = await createSubscription({
  companyId: 'uuid-da-empresa',
  planId: 'uuid-do-plano',
  billingType: 'PIX', // ou 'CREDIT_CARD', 'BOLETO'
  billingCycle: 'MONTHLY', // ou 'YEARLY'
  customerData: {
    name: 'Nome Completo',
    email: 'email@exemplo.com',
    cpfCnpj: '12345678901',
    phone: '11999999999',
  },
});
```

### 2. Upgrade de Plano

```
Usuario → Seleciona Novo Plano → Edge Function → Asaas
                                       │
                                       ├── Atualiza Subscription
                                       └── Atualiza Supabase
```

**Codigo Frontend:**

```typescript
import { updateSubscriptionPlan } from '@/services/asaas';

const result = await updateSubscriptionPlan(
  subscriptionId,
  newPlanId,
  'MONTHLY'
);
```

### 3. Cancelar Assinatura

```typescript
import { cancelSubscription } from '@/services/asaas';

const result = await cancelSubscription(subscriptionId);
```

### 4. Checkout via Link (Asaas Hosted)

Para simplificar, e possivel usar o checkout hospedado do Asaas:

```typescript
import { createCheckoutSession } from '@/services/asaas';

const { checkoutUrl } = await createCheckoutSession(
  companyId,
  planId,
  'MONTHLY'
);

// Redireciona para pagina de pagamento do Asaas
window.location.href = checkoutUrl;
```

---

## Edge Function

### Endpoint

```
POST https://jyjkeqnmofzjnzpvkugl.supabase.co/functions/v1/asaas-billing
```

### Autenticacao

Todas requisicoes devem incluir o token Firebase no header:

```
Authorization: Bearer <firebase-id-token>
```

### Acoes Disponiveis

| Acao | Descricao | Permissao |
|------|-----------|-----------|
| `create-subscription` | Criar nova assinatura | Membro da empresa |
| `update-subscription` | Alterar plano | Membro da empresa |
| `cancel-subscription` | Cancelar assinatura | Membro da empresa |
| `create-checkout` | Gerar link de checkout | Membro da empresa |
| `get-payment-link` | Obter link de pagamento | Membro da empresa |

### Exemplo de Request

```bash
curl -X POST \
  'https://jyjkeqnmofzjnzpvkugl.supabase.co/functions/v1/asaas-billing' \
  -H 'Authorization: Bearer <firebase-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create-subscription",
    "companyId": "uuid",
    "planId": "uuid",
    "billingType": "PIX",
    "billingCycle": "MONTHLY",
    "customerData": {
      "name": "Empresa LTDA",
      "email": "contato@empresa.com",
      "cpfCnpj": "12345678000190"
    }
  }'
```

### Resposta

```json
{
  "success": true,
  "data": {
    "id": "uuid-subscription",
    "company_id": "uuid",
    "plan_id": "uuid",
    "asaas_subscription_id": "sub_xxx",
    "status": "active",
    "price": 79.90,
    "next_due_date": "2026-02-01"
  }
}
```

---

## Frontend

### Estrutura de Arquivos

```
src/modules/billing/
├── BillingPage.tsx           # Pagina principal
├── index.ts                  # Exports
└── components/
    ├── PlanCard.tsx          # Card de plano
    ├── CurrentPlanCard.tsx   # Plano atual
    ├── UsageCard.tsx         # Uso do plano
    ├── PaymentHistory.tsx    # Historico de pagamentos
    ├── UpgradeModal.tsx      # Modal de upgrade
    └── index.ts
```

### Rota

```
slug.mercadovirtual.app/faturamento
```

Acessivel apenas para **admins** da empresa.

### Componentes Principais

#### BillingPage

Pagina principal com 3 abas:
- **Visao Geral**: Plano atual, uso, pagamentos recentes
- **Planos**: Grid com todos os planos disponiveis
- **Pagamentos**: Historico e metodo de pagamento

#### PlanCard

Exibe informacoes do plano com:
- Nome e descricao
- Preco mensal/anual
- Limites (produtos, usuarios, storage)
- Features incluidas/nao incluidas
- Botao de selecao

#### UsageCard

Mostra barras de progresso com:
- Produtos usados vs limite
- Usuarios ativos vs limite
- Storage usado vs limite
- Alertas quando proximo do limite

---

## Webhooks

Os webhooks sao essenciais para saber quando um pagamento foi confirmado. Sem eles, o sistema nao tem como saber se o cliente pagou.

### Fluxo Completo com Webhooks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE PAGAMENTO                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. CLIENTE ESCOLHE PLANO                                                   │
│   ┌──────────┐                                                               │
│   │ Ejym App │ ──▶ Seleciona plano ──▶ Preenche dados (CPF, email)          │
│   └──────────┘                                                               │
│        │                                                                     │
│        ▼                                                                     │
│   2. CRIA ASSINATURA NO ASAAS                                                │
│   ┌──────────┐     ┌──────────┐                                              │
│   │ Edge Fn  │ ──▶ │  Asaas   │ ──▶ Gera cobranca (PIX/Boleto/Cartao)       │
│   └──────────┘     └──────────┘                                              │
│        │                │                                                    │
│        ▼                ▼                                                    │
│   3. RETORNA LINKS DE PAGAMENTO                                              │
│   ┌──────────────────────────────────────────┐                               │
│   │ - PIX: QR Code + Copia e Cola           │                               │
│   │ - Boleto: Link do boleto PDF            │                               │
│   │ - Cartao: Processado na hora            │                               │
│   └──────────────────────────────────────────┘                               │
│        │                                                                     │
│        ▼                                                                     │
│   4. CLIENTE PAGA                                                            │
│   ┌──────────┐                                                               │
│   │ Cliente  │ ──▶ Paga via app do banco / cartao                           │
│   └──────────┘                                                               │
│        │                                                                     │
│        ▼                                                                     │
│   5. ASAAS NOTIFICA VIA WEBHOOK                                              │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐                             │
│   │  Asaas   │ ──▶ │ Webhook  │ ──▶ │ Supabase │ ──▶ Atualiza status        │
│   └──────────┘     └──────────┘     └──────────┘                             │
│        │                                                                     │
│        ▼                                                                     │
│   6. CLIENTE VE CONFIRMACAO                                                  │
│   ┌──────────┐                                                               │
│   │ Ejym App │ ──▶ "Pagamento confirmado!" ──▶ Libera recursos              │
│   └──────────┘                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuracao no Asaas Dashboard

**Sandbox:** https://sandbox.asaas.com
**Producao:** https://www.asaas.com

1. Acesse **Configuracoes** > **Integracoes** > **Webhooks**
2. Clique em **Adicionar**
3. Configure:

| Campo | Valor |
|-------|-------|
| **URL** | `https://jyjkeqnmofzjnzpvkugl.supabase.co/functions/v1/asaas-webhook` |
| **Eventos** | PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED |
| **Versao API** | v3 |

### Edge Function Implementada

Arquivo: `supabase/functions/asaas-webhook/index.ts`

**Deploy:**
```bash
npx supabase functions deploy asaas-webhook --no-verify-jwt --project-ref jyjkeqnmofzjnzpvkugl
```

**Eventos Tratados:**

| Evento | Acao |
|--------|------|
| `PAYMENT_CREATED` | Cria registro na tabela `payments` |
| `PAYMENT_CONFIRMED` | Atualiza status para confirmado, subscription para `active` |
| `PAYMENT_RECEIVED` | Mesmo que CONFIRMED |
| `PAYMENT_OVERDUE` | Atualiza subscription para `overdue` |
| `PAYMENT_REFUNDED` | Atualiza status para reembolsado |
| `PAYMENT_DELETED` | Remove registro de pagamento |

### Fluxo por Forma de Pagamento

#### PIX (Mais Rapido)

```
1. Sistema gera QR Code PIX
2. Cliente escaneia no app do banco
3. Pagamento confirmado em segundos
4. Webhook recebido imediatamente
5. Acesso liberado na hora
```

#### Boleto (1-3 dias uteis)

```
1. Sistema gera link do boleto
2. Cliente paga no banco/app
3. Compensacao em 1-3 dias uteis
4. Webhook recebido apos compensacao
5. Acesso liberado automaticamente
```

#### Cartao de Credito (Instantaneo)

```
1. Cliente informa dados do cartao
2. Asaas processa na hora
3. Aprovado ou rejeitado imediatamente
4. Webhook enviado como backup
5. Acesso liberado na hora (se aprovado)
```

### Seguranca do Webhook

Para maior seguranca, configure um token de autenticacao:

```bash
# Configurar token secreto
npx supabase secrets set ASAAS_WEBHOOK_TOKEN="seu-token-secreto"
```

No Asaas, adicione o header `asaas-access-token` com o mesmo valor.

### Testar Webhooks (Sandbox)

No painel do Asaas sandbox:

1. Crie uma cobranca manualmente
2. Use o botao "Simular pagamento"
3. Verifique os logs da Edge Function:

```bash
npx supabase functions logs asaas-webhook --project-ref jyjkeqnmofzjnzpvkugl
```

---

## Limites e Restricoes

### Trigger de Verificacao de Limite

O banco possui um trigger que verifica limites ao adicionar produtos:

```sql
CREATE OR REPLACE FUNCTION check_product_limit()
RETURNS TRIGGER AS $$
DECLARE
  product_count INT;
  plan_limit INT;
BEGIN
  -- Conta produtos da empresa
  SELECT COUNT(*) INTO product_count
  FROM products WHERE company_id = NEW.company_id;

  -- Busca limite do plano
  SELECT p.product_limit INTO plan_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.company_id = NEW.company_id
  AND s.status = 'active';

  -- Se nao tem subscription, usa limite do free
  IF plan_limit IS NULL THEN
    SELECT product_limit INTO plan_limit
    FROM plans WHERE name = 'free';
  END IF;

  -- Verifica limite (NULL = ilimitado)
  IF plan_limit IS NOT NULL AND product_count >= plan_limit THEN
    RAISE EXCEPTION 'Limite de produtos atingido. Faca upgrade do seu plano.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Verificacao no Frontend

```typescript
import { getCompanyUsage, canAddProduct } from '@/services/asaas';

const usage = await getCompanyUsage(companyId);

if (!canAddProduct(usage)) {
  toast.error('Limite de produtos atingido. Faca upgrade do seu plano.');
  return;
}
```

---

## Migracao para Producao

### 1. Criar Conta de Producao no Asaas

1. Acesse https://www.asaas.com
2. Complete o cadastro com dados reais
3. Envie documentos para verificacao
4. Aguarde aprovacao (1-2 dias uteis)

### 2. Obter Chave de Producao

1. Acesse Configuracoes > Integracoes > API
2. Copie a chave de producao (`$aact_YT...`)

### 3. Atualizar Secrets

```bash
npx supabase secrets set \
  ASAAS_API_KEY="$aact_YT..." \
  ASAAS_API_URL="https://api.asaas.com/v3" \
  --project-ref jyjkeqnmofzjnzpvkugl
```

### 4. Atualizar .env (opcional)

```env
ASAAS_API_KEY=$aact_YT...
ASAAS_ENVIRONMENT=production
ASAAS_API_URL=https://api.asaas.com/v3
```

### 5. Redeployar Edge Function

```bash
npx supabase functions deploy asaas-billing --no-verify-jwt
```

### Checklist de Producao

- [ ] Conta Asaas verificada
- [ ] Chave de producao configurada
- [ ] Webhook de producao configurado
- [ ] Testes de pagamento realizados
- [ ] Emails de cobranca configurados
- [ ] Politica de cancelamento definida

---

## Troubleshooting

### Erro 406 (Not Acceptable)

**Causa**: Tabelas nao existem no banco.

**Solucao**: Execute a migration SQL no SQL Editor do Supabase.

### Erro 401 (Unauthorized)

**Causa**: Token Firebase invalido ou expirado.

**Solucao**:
- Verificar se usuario esta autenticado
- Verificar se token nao expirou
- Fazer logout e login novamente

### Erro 403 (Forbidden)

**Causa**: Usuario nao tem permissao.

**Solucao**:
- Verificar se usuario e membro da empresa
- Verificar se usuario e admin (para billing)

### Erro na API Asaas

**Causa**: Dados invalidos ou conta nao verificada.

**Solucao**:
- Verificar CPF/CNPJ valido
- Verificar se conta Asaas esta ativa
- Consultar logs da Edge Function

### Ver Logs da Edge Function

```bash
npx supabase functions logs asaas-billing --project-ref jyjkeqnmofzjnzpvkugl
```

---

## Referencias

- [Documentacao Asaas - Assinaturas](https://docs.asaas.com/docs/assinaturas)
- [Documentacao Asaas - Criar Assinatura](https://docs.asaas.com/docs/criando-uma-assinatura)
- [Documentacao Asaas - Webhooks](https://docs.asaas.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## Testes no Sandbox

### CPFs Validos para Teste

Use estes CPFs validos para testes no sandbox:
- `191.023.088-38`
- `464.533.918-00`
- `714.835.770-03`

**Importante:** O Asaas valida matematicamente o CPF/CNPJ, entao CPFs invalidos como `111.222.333-44` serao rejeitados.

### Testar Fluxo Completo (Boleto)

1. Acesse `slug.mercadovirtual.app/faturamento`
2. Clique em "Fazer Upgrade" ou va para aba "Planos"
3. Selecione um plano pago
4. No modal:
   - Selecione **Boleto** como forma de pagamento
   - Selecione ciclo (Mensal/Anual)
   - Clique "Continuar"
5. Preencha dados do cliente:
   - Nome completo
   - Email
   - CPF valido (ex: `191.023.088-38`)
6. Clique "Criar Assinatura"
7. O modal mostrara o link do boleto
8. Para simular pagamento:
   - Acesse https://sandbox.asaas.com
   - Va em Cobrancas
   - Encontre a cobranca gerada
   - Clique em "Receber em dinheiro" ou "Simular pagamento"
9. O modal detectara automaticamente a confirmacao via polling
10. Tela de sucesso sera exibida

### Testar Fluxo Completo (PIX)

1. Siga os passos 1-5 acima, mas selecione **PIX**
2. O modal mostrara:
   - QR Code para escanear
   - Codigo Copia e Cola
   - Data de vencimento
3. Para simular pagamento no sandbox:
   - Acesse https://sandbox.asaas.com
   - Va em Cobrancas
   - Encontre a cobranca PIX
   - Clique em "Receber em dinheiro"
4. O polling detectara a confirmacao automaticamente

### Confirmar Pagamento via API (Sandbox)

Para testes automatizados, use o endpoint de confirmacao:

```bash
# Confirmar pagamento manualmente
curl -X POST \
  'https://sandbox.asaas.com/api/v3/payments/{paymentId}/receiveInCash' \
  -H 'access_token: $aact_hmlg_000...' \
  -H 'Content-Type: application/json' \
  -d '{
    "paymentDate": "2026-01-28",
    "value": 79.90
  }'
```

### Verificar Status no Banco

```sql
-- Ver subscriptions
SELECT
  s.id,
  s.company_id,
  s.status,
  s.billing_type,
  p.name as plan_name,
  p.display_name,
  s.price,
  s.created_at
FROM subscriptions s
LEFT JOIN plans p ON s.plan_id = p.id
ORDER BY s.created_at DESC;

-- Ver payments
SELECT * FROM payments ORDER BY created_at DESC;

-- Limpar para novo teste
DELETE FROM payments;
DELETE FROM subscriptions;
```

---

## Edge Functions - Acoes Disponiveis

### Tabela Completa de Acoes

| Acao | Descricao | Parametros |
|------|-----------|------------|
| `create-subscription` | Criar nova assinatura | companyId, planId, billingType, billingCycle, customerData |
| `update-subscription` | Alterar plano | subscriptionId, newPlanId, billingCycle? |
| `cancel-subscription` | Cancelar assinatura | subscriptionId |
| `create-checkout` | Gerar link checkout Asaas | companyId, planId, billingCycle |
| `get-payment-link` | Obter links de pagamento | paymentId |
| `get-subscription-status` | Verificar status (polling) | subscriptionId |
| `get-company-subscription` | Buscar subscription da empresa | companyId |

### get-company-subscription

Necessario porque o RLS do Supabase usa JWT Supabase, mas o app usa Firebase Auth. Esta action contorna o RLS.

```typescript
// Frontend
const subscription = await callEdgeFunction('get-company-subscription', {
  companyId: 'uuid'
});
```

### get-subscription-status

Usado pelo polling para verificar quando o pagamento foi confirmado.

```typescript
// Frontend
const { status, isActive } = await getSubscriptionStatus(subscriptionId);
// status: 'pending' | 'active' | 'overdue' | 'canceled'
```

---

## Validacao de CPF/CNPJ

O frontend implementa validacao completa de CPF e CNPJ com verificacao de digitos.

### Localizacao

`src/modules/billing/components/UpgradeModal.tsx`

### Funcoes

```typescript
// Valida CPF (11 digitos)
const validateCpf = (cpf: string): boolean => { ... }

// Valida CNPJ (14 digitos)
const validateCnpj = (cnpj: string): boolean => { ... }

// Valida CPF ou CNPJ automaticamente
const validateCpfCnpj = (value: string): { valid: boolean; message?: string } => { ... }

// Mascara automatica (CPF: 000.000.000-00, CNPJ: 00.000.000/0000-00)
const maskCpfCnpj = (value: string): string => { ... }
```

### Comportamento

- Valida apenas quando o campo esta completo (11 ou 14 digitos)
- Mostra erro inline abaixo do campo
- Bloqueia envio se CPF/CNPJ invalido
- Mascara automatica conforme digita

---

## Deteccao de Pagamento (Realtime + Polling)

O sistema usa **Supabase Realtime** para detectar instantaneamente quando o pagamento foi confirmado pelo webhook, com polling como fallback.

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DETECCAO DE PAGAMENTO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. CLIENTE PAGA (PIX/Boleto/Cartao)                                        │
│   ┌──────────┐                                                               │
│   │ Cliente  │ ──▶ Paga via app do banco                                    │
│   └──────────┘                                                               │
│        │                                                                     │
│        ▼                                                                     │
│   2. WEBHOOK ATUALIZA BANCO                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐                             │
│   │  Asaas   │ ──▶ │ Webhook  │ ──▶ │ Supabase │ status='active'            │
│   └──────────┘     └──────────┘     └──────────┘                             │
│                                           │                                  │
│                                           ▼                                  │
│   3. REALTIME NOTIFICA FRONTEND (instantaneo!)                               │
│   ┌──────────────────────────────────────────┐                               │
│   │ Supabase Realtime (postgres_changes)     │                               │
│   │ → Detecta UPDATE em subscriptions        │                               │
│   │ → Envia evento para o frontend           │                               │
│   └──────────────────────────────────────────┘                               │
│        │                                                                     │
│        ▼                                                                     │
│   4. MODAL ATUALIZA                                                          │
│   ┌──────────┐                                                               │
│   │ Ejym App │ ──▶ "Pagamento confirmado!" ──▶ Tela de sucesso              │
│   └──────────┘                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementacao Realtime

```typescript
// src/services/asaas.ts

// Realtime subscription para detectar mudancas instantaneas
export function subscribeToSubscriptionStatus(
  subscriptionId: string,
  onStatusChange: (status: string, isActive: boolean) => void
): () => void {
  const channel = supabase
    .channel(`subscription-status-${subscriptionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'subscriptions',
        filter: `id=eq.${subscriptionId}`,
      },
      (payload) => {
        const newStatus = payload.new?.status as string;
        if (newStatus) {
          onStatusChange(newStatus, newStatus === 'active');
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

### Uso no Modal (Realtime + Polling Fallback)

```typescript
// src/modules/billing/components/UpgradeModal.tsx

useEffect(() => {
  if (step !== 'payment' || !subscription?.id) return;

  const handleStatusChange = (_status: string, isActive: boolean) => {
    if (isActive) {
      setStep('success');
      toast.success('Pagamento confirmado!');
    }
  };

  // 1. Realtime para deteccao instantanea
  const cancelRealtime = subscribeToSubscriptionStatus(
    subscription.id,
    handleStatusChange
  );

  // 2. Polling como fallback (caso Realtime falhe)
  const cancelPolling = pollSubscriptionStatus(
    subscription.id,
    handleStatusChange,
    { interval: 10000, maxAttempts: 30 } // Menos frequente com Realtime
  );

  return () => {
    cancelRealtime();
    cancelPolling();
  };
}, [step, subscription?.id]);
```

### Habilitar Realtime no Supabase

Execute no SQL Editor do Supabase:

```sql
-- Habilitar Realtime para tabela subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
```

Ou via migration: `supabase/migrations/20260128000001_enable_realtime_subscriptions.sql`

### Fluxo Completo

1. Usuario cria subscription (status: `pending`)
2. Modal mostra QR Code/Boleto
3. Cliente paga
4. Webhook atualiza status para `active` no banco
5. **Realtime detecta mudanca instantaneamente** (< 1 segundo)
6. Modal vai para tela de sucesso

### Vantagens do Realtime

| Aspecto | Polling | Realtime |
|---------|---------|----------|
| Latencia | 3-10 segundos | < 1 segundo |
| Requisicoes | Muitas | Apenas uma conexao |
| Custo | Maior | Menor |
| UX | Usuario espera | Instantaneo |

---

## Historico de Alteracoes

| Data | Versao | Descricao |
|------|--------|-----------|
| 2026-01-27 | 1.0.0 | Implementacao inicial |
| 2026-01-28 | 1.1.0 | Fluxo de pagamento inline (PIX/Boleto no modal) |
| 2026-01-28 | 1.1.1 | Validacao completa de CPF/CNPJ |
| 2026-01-28 | 1.1.2 | Polling para detectar confirmacao de pagamento |
| 2026-01-28 | 1.1.3 | Actions get-subscription-status e get-company-subscription |
| 2026-01-28 | 1.1.4 | Fix RLS - usar Edge Function para buscar subscription |
| 2026-01-28 | 1.2.0 | Supabase Realtime para deteccao instantanea de pagamento |
| 2026-01-28 | 1.2.1 | Layout responsivo dos cards de planos (scroll horizontal mobile) |
| 2026-01-28 | 1.2.2 | Tabs responsivas com labels curtos no mobile |
| 2026-01-28 | 1.2.3 | Fix refresh ao ganhar foco (useRef para evitar reload) |
| 2026-01-28 | 1.2.4 | Fix pagamentos duplicados no webhook (verificacao antes de insert) |

---

## Melhorias de UI/UX (v1.2.1 - v1.2.3)

### Layout Responsivo dos Planos

**Mobile (< 640px):**
- Scroll horizontal com snap para navegar entre cards
- Cards com largura fixa de 280px
- Scrollbar oculta para visual limpo

**Tablet (640px - 1024px):**
- Grid de 2-3 colunas

**Desktop (> 1024px):**
- Grid de 5 colunas (todos os planos visiveis)

### Tabs Responsivas

```tsx
// Mobile: labels curtos
'Geral' | 'Planos' | 'Pagam.'

// Desktop: labels completos
'Visao Geral' | 'Planos' | 'Pagamentos'
```

### Fix de Refresh

Problema: A pagina recarregava toda vez que ganhava foco.

Solucao: Usar `useRef` para controlar se os dados ja foram carregados:

```typescript
const loadedCompanyRef = useRef<string | null>(null);

useEffect(() => {
  const companyId = currentCompany?.id;
  if (companyId && loadedCompanyRef.current !== companyId) {
    loadedCompanyRef.current = companyId;
    loadBillingData();
  }
}, [currentCompany?.id]);
```

---

## Fix de Pagamentos Duplicados (v1.2.4)

### Problema

O webhook do Asaas pode reenviar eventos, causando insercao de pagamentos duplicados.

### Solucao

Verificar se o pagamento ja existe antes de inserir:

```typescript
case 'PAYMENT_CREATED': {
  // Verificar se o pagamento já existe
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('asaas_payment_id', payment.id)
    .maybeSingle();

  if (existingPayment) {
    console.log('Payment already exists, skipping:', payment.id);
    break;
  }

  // Criar registro de pagamento
  await supabase.from('payments').insert({ ... });
}
```

### Limpeza de Duplicatas Existentes

Execute no SQL Editor do Supabase:

```sql
-- Remover pagamentos duplicados mantendo apenas o mais antigo
DELETE FROM payments
WHERE id NOT IN (
  SELECT DISTINCT ON (asaas_payment_id) id
  FROM payments
  ORDER BY asaas_payment_id, created_at ASC
);

-- (Opcional) Adicionar constraint para prevenir futuras duplicatas
ALTER TABLE payments
ADD CONSTRAINT payments_asaas_payment_id_unique
UNIQUE (asaas_payment_id);
```

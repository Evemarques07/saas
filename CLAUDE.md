# CLAUDE.md - Mercado Virtual SaaS

## Visao Geral

SaaS de gestao para lojas (Mercado Virtual). Frontend React + Vite, backend Supabase (Edge Functions, Postgres, Auth, Storage). Billing via Asaas (producao).

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (Edge Functions em Deno/TypeScript)
- **Billing:** Asaas API v3 (producao)
- **Auth:** Supabase Auth
- **Database:** Supabase Postgres com RLS

## Estrutura do Projeto

```
src/                    # Frontend React
  services/asaas.ts     # Cliente billing (chama Edge Functions)
  services/supabase.ts  # Cliente Supabase
  modules/billing/      # UI de billing/assinaturas
  hooks/usePlanFeatures.ts
supabase/
  functions/
    asaas-billing/      # Edge Function principal de billing
    asaas-webhook/      # Recebe webhooks do Asaas (--no-verify-jwt)
    asaas-withdrawal-validation/  # Validacao de saques (--no-verify-jwt)
    _shared/cors.ts     # CORS compartilhado
  migrations/           # Migrations SQL
docs/                   # Documentacao detalhada
```

## Variaveis de Ambiente

### Frontend (.env.local)
- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave publica anon do Supabase

### Supabase Secrets (Edge Functions)
Configurados via `npx supabase secrets set KEY=VALUE --project-ref <REF>`

- `ASAAS_API_KEY` - Chave de producao do Asaas ($aact_prod_...)
- `ASAAS_API_URL` - https://api.asaas.com/v3
- `ASAAS_WEBHOOK_TOKEN` - Token de autenticacao do webhook
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Auto-configurados
- `MAILERSEND_API_TOKEN`, `MAILERSEND_FROM_EMAIL`, `MAILERSEND_FROM_NAME` - Email
- `WUZAPI_URL`, `WUZAPI_ADMIN_TOKEN` - WhatsApp

## Supabase - Comandos Uteis

### Project Ref
```
jyjkeqnmofzjnzpvkugl
```

### Listar secrets (via Management API)
```bash
curl -s "https://api.supabase.com/v1/projects/<PROJECT_REF>/secrets" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"
```
Retorna nomes e hashes (nao os valores reais).

### Listar Edge Functions
```bash
curl -s "https://api.supabase.com/v1/projects/<PROJECT_REF>/functions" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"
```

### Listar API Keys
```bash
curl -s "https://api.supabase.com/v1/projects/<PROJECT_REF>/api-keys" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"
```

### Consultar tabelas via REST API (service_role)
```bash
# Listar subscriptions com plano
curl -s "https://<SUPABASE_URL>/rest/v1/subscriptions?select=*,plan:plans(*)&limit=10" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

# Listar pagamentos recentes
curl -s "https://<SUPABASE_URL>/rest/v1/payments?select=*&order=created_at.desc&limit=10" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

# Listar planos
curl -s "https://<SUPABASE_URL>/rest/v1/plans?select=*&order=sort_order" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

# Deletar registro (exemplo)
curl -s -X DELETE "https://<SUPABASE_URL>/rest/v1/payments?id=eq.<UUID>" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Prefer: return=representation"
```

### Configurar secrets
```bash
npx supabase secrets set \
  ASAAS_API_KEY="<CHAVE>" \
  ASAAS_API_URL="https://api.asaas.com/v3" \
  --project-ref <PROJECT_REF>
```

### Deploy de Edge Functions
```bash
npx supabase functions deploy asaas-billing --no-verify-jwt --project-ref <PROJECT_REF>
npx supabase functions deploy asaas-webhook --no-verify-jwt --project-ref <PROJECT_REF>
npx supabase functions deploy asaas-withdrawal-validation --no-verify-jwt --project-ref <PROJECT_REF>
```

## Asaas API - Comandos Uteis

### Base URL
- **Producao:** `https://api.asaas.com/v3`
- **Sandbox:** `https://sandbox.asaas.com/api/v3`
- Header de autenticacao: `access_token: <ASAAS_API_KEY>`

### Verificar saldo
```bash
curl -s "https://api.asaas.com/v3/finance/balance" \
  -H "access_token: <ASAAS_API_KEY>"
```

### Status da conta
```bash
curl -s "https://api.asaas.com/v3/myAccount/status" \
  -H "access_token: <ASAAS_API_KEY>"
# Resposta: commercialInfo, bankAccountInfo, documentation, general (todos devem ser APPROVED)
```

### Info comercial da conta
```bash
curl -s "https://api.asaas.com/v3/myAccount/commercialInfo" \
  -H "access_token: <ASAAS_API_KEY>"
```

### Listar clientes
```bash
curl -s "https://api.asaas.com/v3/customers?limit=10" \
  -H "access_token: <ASAAS_API_KEY>"
```

### Buscar cliente por CPF/CNPJ
```bash
curl -s "https://api.asaas.com/v3/customers?cpfCnpj=<CPF>" \
  -H "access_token: <ASAAS_API_KEY>"
```

### Listar webhooks configurados
```bash
curl -s "https://api.asaas.com/v3/webhooks" \
  -H "access_token: <ASAAS_API_KEY>"
```

### Listar subscriptions (Asaas)
```bash
curl -s "https://api.asaas.com/v3/subscriptions?limit=10" \
  -H "access_token: <ASAAS_API_KEY>"
```

### Listar pagamentos de uma subscription
```bash
curl -s "https://api.asaas.com/v3/payments?subscription=<ASAAS_SUBSCRIPTION_ID>" \
  -H "access_token: <ASAAS_API_KEY>"
```

### Buscar QR Code PIX de um pagamento
```bash
curl -s "https://api.asaas.com/v3/payments/<PAYMENT_ID>/pixQrCode" \
  -H "access_token: <ASAAS_API_KEY>"
```

## Billing - Arquitetura

### Fluxo de assinatura
1. Usuario escolhe plano no frontend (BillingPage/UpgradeModal)
2. Frontend chama `src/services/asaas.ts` -> POST para Edge Function `asaas-billing`
3. Edge Function autentica via Supabase JWT, verifica permissoes
4. Edge Function cria customer/subscription na API Asaas
5. Salva subscription/payment no Supabase Postgres
6. Asaas envia webhooks para `asaas-webhook` ao mudar status do pagamento
7. Webhook atualiza status da subscription no banco (active/overdue/canceled)

### Edge Function asaas-billing - Actions
- `create-subscription` - Cria assinatura (customer + subscription no Asaas + DB)
- `update-subscription` - Troca de plano
- `cancel-subscription` - Cancela assinatura
- `reactivate-subscription` - Reativa assinatura cancelada
- `create-checkout` - Gera link de pagamento recorrente
- `get-payment-link` - Obtem URLs de pagamento (invoice, boleto, PIX)
- `get-company-subscription` - Busca subscription da empresa (bypass RLS)
- `get-subscription-status` - Status para polling

### Webhook - Eventos processados
- `PAYMENT_CREATED` - Registra pagamento no DB
- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` - Ativa subscription
- `PAYMENT_OVERDUE` - Marca subscription como overdue
- `PAYMENT_REFUNDED` - Marca pagamento como reembolsado
- `PAYMENT_DELETED` - Remove pagamento do DB

### Webhook configurado no Asaas
- **Nome:** MercadoVirtualWebHook
- **URL:** `https://jyjkeqnmofzjnzpvkugl.supabase.co/functions/v1/asaas-webhook`
- **Auth:** Header `asaas-access-token` com token configurado
- **Eventos:** PAYMENT_* e SUBSCRIPTION_*

## Planos

| Nome | Display | Mensal | Anual | Produtos | Users | Storage |
|------|---------|--------|-------|----------|-------|---------|
| free | Gratis | R$ 0 | - | 20 | 1 | 100 MB |
| starter | Starter | R$ 39,90 | R$ 399 | 100 | 2 | 500 MB |
| pro | Profissional | R$ 79,90 | - | null (ilimitado) | null | null |
| business | Business | R$ 149,90 | - | null | null | null |
| enterprise | Enterprise | R$ 299,90 | R$ 2.999 | null | null | null |

**Nota:** `null` em limites = ilimitado. Plano gratuito (sem subscription) usa fallback: 20 produtos, 1 user, 100 MB.

## Subscriptions Ativas (Producao)

- **Exclusive Store** - Enterprise gratuito (parceira real, sem vinculo Asaas, privilegios manuais)
- Novos usuarios que assinarem serao cobrados via Asaas producao

## VPS e Deploy

### Acesso SSH
```bash
ssh evertonapi
# Alias configurado em ~/.ssh/config -> root@177.153.64.167
# VPS KingHost: evertonapi.vps-kinghost.net
```

### Infraestrutura na VPS
- **SO:** Linux (KingHost VPS)
- **Node:** v20.20.0 / npm 10.8.2
- **Nginx:** reverse proxy com SSL (Let's Encrypt)
- **Dominio:** mercadovirtual.app (com wildcard *.mercadovirtual.app)
- **Projeto:** `/var/www/mercadovirtual`
- **Build servido:** `/var/www/mercadovirtual/dist`
- **Nginx config:** `/etc/nginx/sites-enabled/mercadovirtual.app`
- **Outros servicos na VPS:** WuzAPI (`/root/wuzapi`), Evolution API (`/root/evolution-api`)

### Git remoto na VPS
```
origin  git@github-saas:Evemarques07/saas.git
branch: main
```

### Fluxo de Deploy (Frontend)

O deploy e manual: commit + push local, depois pull + build na VPS.

**1. Local - commit e push:**
```bash
git add <arquivos>
git commit -m "descricao da mudanca"
git push origin main
```

**2. VPS - pull e build:**
```bash
ssh evertonapi
cd /var/www/mercadovirtual
git pull origin main
npm install        # se houver mudancas no package.json
npm run build      # gera dist/ com Vite
```
Nao precisa reiniciar nginx (serve arquivos estaticos de dist/).

**3. Deploy de Edge Functions (Supabase):**
```bash
# Local - deploy direto para o Supabase (nao passa pela VPS)
npx supabase functions deploy <nome-funcao> --project-ref jyjkeqnmofzjnzpvkugl

# Funcoes que exigem --no-verify-jwt:
npx supabase functions deploy asaas-webhook --no-verify-jwt --project-ref jyjkeqnmofzjnzpvkugl
npx supabase functions deploy asaas-withdrawal-validation --no-verify-jwt --project-ref jyjkeqnmofzjnzpvkugl
```

### Nginx - Configuracao
- HTTP redireciona para HTTPS (301)
- SSL via Let's Encrypt (auto-renew)
- `index.html`, `sw.js`, `manifest.webmanifest` - sem cache (sempre fresh)
- `/assets/` - cache 1 ano imutavel (arquivos com hash no nome)
- Todas as rotas fazem fallback para `/index.html` (SPA)
- Gzip habilitado

### Comandos uteis na VPS
```bash
# Ver status do nginx
ssh evertonapi "systemctl status nginx"

# Recarregar nginx (apos mudar config)
ssh evertonapi "nginx -t && systemctl reload nginx"

# Ver logs de acesso
ssh evertonapi "tail -50 /var/log/nginx/access.log"

# Ver logs de erro
ssh evertonapi "tail -50 /var/log/nginx/error.log"

# Ver ultimo commit deployed
ssh evertonapi "cd /var/www/mercadovirtual && git log --oneline -1"

# Comparar com local
ssh evertonapi "cd /var/www/mercadovirtual && git log --oneline -1" && git log --oneline -1
```

## Notas Importantes

- A Edge Function `asaas-billing` tem fallback para sandbox se `ASAAS_API_URL` nao estiver definida (linha 177). Sempre manter o secret configurado.
- Webhooks do Asaas exigem header `asaas-access-token` (verificado na Edge Function). Sem token = 401.
- Todas as Edge Functions usam `--no-verify-jwt` no deploy. `asaas-billing` tem verificacao propria via `verifyAuth()`. `asaas-webhook` e `asaas-withdrawal-validation` recebem requests do Asaas, nao do frontend.
- O `SUPABASE_ACCESS_TOKEN` em `.env.local` e para CLI/deploy, nao tem permissao de listar secrets (403). Usar Management API com token adequado se necessario.
- IDs Asaas de producao seguem padrao `cus_000...`, `sub_...`, `pay_...` (o prefixo `000` NAO indica sandbox).

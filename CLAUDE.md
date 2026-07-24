# CLAUDE.md - Mercado Virtual SaaS

## Visao Geral

SaaS de gestao para lojas (Mercado Virtual). Frontend React + Vite, backend Supabase (Edge Functions, Postgres, Auth, Storage). Billing via Asaas.

---

## ⚠️ ESTADO ATUAL (atualizado em 2026-07-22)

### Billing Asaas está em SANDBOX (modo teste), NAO producao
Nesta sessao o projeto foi reativado apos um periodo pausado e a cobranca foi colocada em **sandbox** para validar o fluxo:
- `ASAAS_API_URL` = `https://sandbox.asaas.com/api/v3`
- `ASAAS_API_KEY` = chave de **sandbox** (`$aact_hmlg_...`), ja configurada no Supabase secrets
- A chave de **producao antiga foi ROTACIONADA/invalidada** (retornava "chave de API invalida"). Para voltar a producao e preciso gerar uma NOVA chave de producao valida no painel Asaas.
- O webhook foi reconfigurado no painel **sandbox** com um `ASAAS_WEBHOOK_TOKEN` novo (gerado nesta sessao).

**Para voltar a PRODUCAO** (sandbox e producao sao ambientes 100% separados: chaves, webhooks e logins diferentes):
```bash
# 1. Gerar nova chave de PRODUCAO no painel Asaas (www.asaas.com) -> Integracoes -> Chave de API
# 2. Apontar os secrets para producao:
npx supabase secrets set ASAAS_API_URL="https://api.asaas.com/v3" --project-ref jyjkeqnmofzjnzpvkugl
npx supabase secrets set ASAAS_API_KEY="<NOVA_CHAVE_PRODUCAO>" --project-ref jyjkeqnmofzjnzpvkugl
# 3. Reconfigurar o webhook no painel de PRODUCAO (mesma URL da funcao) com o mesmo ASAAS_WEBHOOK_TOKEN
```

### Segredos sao write-only no Supabase
`npx supabase secrets list --project-ref jyjkeqnmofzjnzpvkugl` mostra apenas **nome + hash SHA-256**, nunca o valor. Para descobrir a qual URL o `ASAAS_API_URL` aponta sem le-lo: comparar o SHA-256 de `https://api.asaas.com/v3` vs `https://sandbox.asaas.com/api/v3` com o hash exibido. O CLI local ja esta autenticado (credenciais no Windows Credential Manager), entao `secrets list/set` e `functions list/deploy` funcionam sem passar token.

---

## Reativacao do Projeto (checklist do zero)

Se o projeto estiver "fora do ar", verificar nesta ordem:

1. **SSH na VPS:** `ssh evertonapi` (root@177.153.64.167). Se aparecer `REMOTE HOST IDENTIFICATION HAS CHANGED` (VPS reinstalada), rodar `ssh-keygen -R 177.153.64.167` e reconectar aceitando a nova chave.
2. **Nginx / site no ar:** o servico costuma estar ativo, mas o site precisa do symlink em `sites-enabled`. Se o dominio servir "Welcome to nginx!", o site esta desabilitado:
   ```bash
   ssh evertonapi "ln -sf /etc/nginx/sites-available/mercadovirtual.app /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
   ```
3. **Supabase pausado:** projeto free pausa por inatividade. Despausar no dashboard (nao da por CLI). Testar: `curl <VITE_SUPABASE_URL>/auth/v1/health -H "apikey: <ANON_KEY>"` deve dar 200.
4. **Asaas:** conferir estado dos secrets (ver secao ESTADO ATUAL). Validar a chave: `curl https://sandbox.asaas.com/api/v3/myAccount -H "access_token: <KEY>"` (ou a URL de producao).
5. **SSL wildcard:** ver secao "SSL / Certificados" abaixo — subdominios `*.mercadovirtual.app` usam cert separado que ja auto-renova.
6. **Git defasado:** o codigo as vezes e commitado direto na VPS. SEMPRE rodar `git fetch origin` e comparar `HEAD..origin/main` antes de editar no local. Normalmente o local e ancestral -> `git pull --ff-only origin main`.

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

- `ASAAS_API_KEY` - Chave do Asaas. **ATUALMENTE sandbox** (`$aact_hmlg_...`) - ver secao ESTADO ATUAL. Producao usa `$aact_prod_...`
- `ASAAS_API_URL` - **ATUALMENTE** `https://sandbox.asaas.com/api/v3` (producao: `https://api.asaas.com/v3`)
- `ASAAS_WEBHOOK_TOKEN` - Token de autenticacao do webhook (regenerado em 2026-07-22; precisa bater com o campo "Token de autenticacao" do webhook no painel Asaas)
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
- **Nome:** MercadoVirtualWebHook (configurado no painel **sandbox** nesta sessao)
- **URL:** `https://jyjkeqnmofzjnzpvkugl.supabase.co/functions/v1/asaas-webhook` (mesma URL para sandbox e producao)
- **Auth:** Header `asaas-access-token` = valor do secret `ASAAS_WEBHOOK_TOKEN` (senao a funcao retorna 401)
- **Eventos:** apenas `PAYMENT_*` (a funcao ignora `SUBSCRIPTION_*` - so processa o objeto `payment`). Marcar: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, PAYMENT_DELETED, PAYMENT_UPDATED
- **Confirmar PIX no sandbox** (nao ha pagamento real): via API `POST /payments/{id}/receiveInCash`, ou pela pagina da fatura `sandbox.asaas.com/i/{id}`, ou no painel. A confirmacao dispara `PAYMENT_RECEIVED` -> webhook -> assinatura vira `active`.

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

### SSL / Certificados (Let's Encrypt)

Sao DOIS certificados separados (o config Nginx referencia ambos):
- `mercadovirtual.app` -> cobre apex + `www`. Renova sozinho via **HTTP-01** (padrao certbot).
- `mercadovirtual.app-0001` -> cobre o **wildcard `*.mercadovirtual.app`** (todos os subdominios de loja). Exige **DNS-01**.

**DNS do dominio fica na Hostinger** (nameservers `ns1/ns2.dns-parking.com`), NAO na KingHost. O wildcard antes nao renovava sozinho (validacao DNS manual) e expirou. Em 2026-07-22 foi configurada **auto-renovacao via API DNS da Hostinger**:
- Hooks: `/etc/letsencrypt/hostinger-auth-hook.sh` (cria o TXT `_acme-challenge`) e `/etc/letsencrypt/hostinger-cleanup-hook.sh` (remove). Ja gravados no `renewal/mercadovirtual.app-0001.conf`.
- Token da API Hostinger: `/root/.secrets/hostinger_token` (perm 600). **Tem validade** - se a auto-renovacao falhar, provavelmente o token expirou: gerar novo em hPanel (https://hpanel.hostinger.com/api) e substituir o conteudo do arquivo.
- API usada: `PUT/DELETE https://developers.hostinger.com/api/dns/v1/zones/mercadovirtual.app`. PUT: `{"overwrite":true,"zone":[{name,type,ttl,records:[{content}]}]}` (overwrite e scoped por name+type - seguro, nao apaga outros registros). DELETE: `{"filters":[{name,type}]}`.
- ⚠️ A NS autoritativa nao responde direto da VPS e o resolver padrao cacheia velho - o hook checa propagacao via `@1.1.1.1`.
- Renova automatico pelo `certbot.timer`. Testar/forcar:
```bash
ssh evertonapi "certbot renew --cert-name mercadovirtual.app-0001 --dry-run"   # simula
ssh evertonapi "certbot certificates"                                          # ver validades
ssh evertonapi "systemctl list-timers certbot.timer"                           # timer ativo?
```

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

## Roadmap / Features Futuras (planejado em 2026-07)

Backlog de features planejadas. Ao implementar, mover o item para o ROADMAP.md com detalhes e marcar aqui como feito.

1. **Markup e margem de lucro por produto**
   - Registrar markup e margem de lucro por produto, aproveitando o custo ja rastreado pelo sistema FIFO de estoque (ver migrations `*_add_cost_fields`, `*_fifo_*` e `src/services/stock.ts`).
   - Exibir na UI de produtos (custo -> preco -> markup% / margem%) e possivelmente em relatorios/dashboard.

2. **Novo layout repaginado (melhorar efeitos)**
   - Redesign visual do sistema, comecado nesta sessao (header enxuto, sidebar em secoes, espacamento reduzido em `src/components/layout/`).
   - Continuar: transicoes/animacoes, item ativo com barra indicadora, densidade, mobile. Usar a skill de design Tailwind (projeto e Tailwind v3, `tailwind.config.js`).

3. **Integracao com a API OFICIAL do WhatsApp (WhatsApp Cloud API / Meta)**
   - Substituir/complementar a WuzAPI (nao-oficial) pela API oficial da Meta para clientes que optarem.
   - Envolve: cadastro Meta Business, numero verificado, templates aprovados, tokens. Camada de abstracao para o app nao depender do provider.

4. **Integracao com a API da Focus NFe (emissao de NFC-e)**
   - Emissao de nota fiscal (NFC-e) via Focus NFe (https://focusnfe.com.br). Requer certificado digital, token Focus, dados fiscais da empresa (CNPJ, regime tributario, CSC/CSC-ID).
   - Ver docs fiscais existentes em `/docs`. Provavelmente via Edge Function para guardar o token Focus server-side.

5. **WuzAPI como fallback de WhatsApp**
   - Manter o servidor WuzAPI (`/root/wuzapi` na VPS) como **fallback** do WhatsApp: usar quando o cliente NAO optou pela API oficial (item 3), ou quando a oficial falhar.
   - Selecao de provider por empresa (feature/config); a camada de abstracao do item 3 escolhe entre oficial e WuzAPI.

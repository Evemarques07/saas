# Automacao de WhatsApp para Pedidos - Implementacao

Este documento detalha a implementacao real da automacao de mensagens de WhatsApp no Ejym.

> **Nota:** O planejamento e analise de solucoes esta em [WHATSAPP_PLANNING.md](./WHATSAPP_PLANNING.md)

## Sumario

1. [Instalacao Realizada (VPS)](#instalacao-realizada-janeiro-2026)
2. [Implementacao Frontend](#implementacao-frontend-janeiro-2026)
3. [Notificacoes Automaticas de Pedidos](#notificacoes-automaticas-de-pedidos-janeiro-2026)
   - [Verificacao de Conexao em Tempo Real](#verificacao-de-conexao-em-tempo-real-janeiro-2026)
   - [Merge de Configuracoes com Defaults](#merge-de-configuracoes-com-defaults-janeiro-2026)
4. [Painel de Administracao WhatsApp](#painel-de-administracao-whatsapp-super-admin)
5. [Melhorias de Seguranca e Resiliencia](#melhorias-de-seguranca-e-resiliencia-janeiro-2026)
6. [Interface Unificada de WhatsApp](#interface-unificada-de-whatsapp-janeiro-2026)
7. [LGPD e Validacao de Telefone](#lgpd-e-validacao-de-telefone-janeiro-2026)
8. [Proximos Passos](#proximos-passos)

---

## Instalacao Realizada (Janeiro 2026)

> **Nota:** A Evolution API foi substituida pelo **WuzAPI** devido a problemas de geracao de QR Code. O WuzAPI e uma API em Go que usa a biblioteca whatsmeow.

Esta secao documenta a instalacao do **WuzAPI** na VPS da KingHost.

### Informacoes do Servidor

| Item | Valor |
|------|-------|
| **Hostname** | evertonapi.vps-kinghost.net |
| **IP Publico** | 177.153.64.167 |
| **Sistema** | Ubuntu 20.04.6 LTS |
| **Docker** | 28.1.1 |
| **Docker Compose** | 2.35.1 |
| **Acesso SSH** | `ssh evertonapi` |

### Estrutura de Arquivos na VPS

```
/root/
└── wuzapi/
    └── docker-compose.yml
```

### Docker Compose Configurado (WuzAPI)

```yaml
# /root/wuzapi/docker-compose.yml

version: "3.8"

services:
  wuzapi:
    image: asternic/wuzapi:latest
    container_name: wuzapi
    restart: always
    ports:
      - "8080:8080"
    environment:
      - WUZAPI_ADMIN_TOKEN=ejym_wuzapi_2026_s3cr3t
    volumes:
      - wuzapi_data:/app/dbdata
      - wuzapi_files:/app/files

volumes:
  wuzapi_data:
  wuzapi_files:
```

### Containers em Execucao

| Container | Imagem | Porta | Status |
|-----------|--------|-------|--------|
| wuzapi | asternic/wuzapi:latest | 8080:8080 | Running |

### Credenciais de Acesso

| Item | Valor |
|------|-------|
| **API URL** | `https://evertonapi.vps-kinghost.net` |
| **Admin Token** | `ejym_wuzapi_2026_s3cr3t` |
| **Biblioteca** | whatsmeow (Go) |

### Modelo Multi-Tenant

Cada empresa tem seu proprio usuario no WuzAPI com um token unico:

| Campo | Descricao |
|-------|-----------|
| Nome do usuario | `ejym-{company_slug}` |
| Token | `{company_slug}_token_{timestamp}` |
| Sessao | Uma por empresa |

### Comandos Uteis

#### Gerenciamento dos Containers

```bash
# Conectar na VPS
ssh evertonapi

# Ver status dos containers
docker ps

# Ver logs do WuzAPI
docker logs wuzapi -f

# Reiniciar containers
cd ~/wuzapi && docker compose restart

# Parar containers
cd ~/wuzapi && docker compose down

# Iniciar containers
cd ~/wuzapi && docker compose up -d

# Atualizar para nova versao
cd ~/wuzapi && docker compose pull && docker compose up -d
```

#### API - Endpoints Principais (WuzAPI)

```bash
# Verificar se API esta funcionando
curl https://evertonapi.vps-kinghost.net/

# Criar usuario para empresa (admin)
curl -X POST https://evertonapi.vps-kinghost.net/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: ejym_wuzapi_2026_s3cr3t" \
  -d '{"name": "ejym-loja-maria", "token": "loja-maria_token_xxx"}'

# Ver status da sessao
curl -H "Token: loja-maria_token_xxx" \
  https://evertonapi.vps-kinghost.net/session/status

# Conectar sessao (necessario antes de obter QR)
curl -X POST https://evertonapi.vps-kinghost.net/session/connect \
  -H "Content-Type: application/json" \
  -H "Token: loja-maria_token_xxx" \
  -d '{}'

# Obter QR Code
curl -H "Token: loja-maria_token_xxx" \
  https://evertonapi.vps-kinghost.net/session/qr

# Verificar se telefone existe no WhatsApp
curl -X POST https://evertonapi.vps-kinghost.net/user/check \
  -H "Content-Type: application/json" \
  -H "Token: loja-maria_token_xxx" \
  -d '{"Phone": ["5511999998888"]}'

# Enviar mensagem de texto
curl -X POST https://evertonapi.vps-kinghost.net/chat/send/text \
  -H "Content-Type: application/json" \
  -H "Token: loja-maria_token_xxx" \
  -d '{"Phone": "5511999998888", "Body": "Teste do WuzAPI!"}'

# Desconectar sessao (logout)
curl -X POST https://evertonapi.vps-kinghost.net/session/logout \
  -H "Token: loja-maria_token_xxx"

# Deletar usuario (admin)
curl -X DELETE https://evertonapi.vps-kinghost.net/admin/users/ejym-loja-maria \
  -H "Authorization: ejym_wuzapi_2026_s3cr3t"
```

### Como Conectar o WhatsApp (Via Frontend)

1. **Acesse Configuracoes** da empresa no Ejym
   - Menu lateral > Configuracoes

2. **Na secao WhatsApp**, clique em **"Conectar WhatsApp"**

3. **Escaneie o QR Code** exibido no modal:
   - No celular, abra o WhatsApp
   - Menu (3 pontos) > Dispositivos conectados > Conectar dispositivo
   - Escaneie o QR Code

4. **Aguarde a conexao** - o status mudara para "Conectado"

5. **Teste o envio** clicando em "Enviar Mensagem de Teste"

### Arquitetura Instalada

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS KingHost                              │
│            (evertonapi.vps-kinghost.net / 177.153.64.167)        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Docker Container                       │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                    WuzAPI                            │  │  │
│  │  │                   (8080)                             │  │  │
│  │  │                                                      │  │  │
│  │  │  - API REST (Go)                                     │  │  │
│  │  │  - whatsmeow (biblioteca WhatsApp)                  │  │  │
│  │  │  - SQLite (sessoes/dados)                           │  │  │
│  │  │  - Multi-tenant (usuarios por empresa)              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │           │                                                │  │
│  │           │ Porta 8080 exposta                            │  │
│  └───────────┼────────────────────────────────────────────────┘  │
│              │                                                    │
└──────────────┼────────────────────────────────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │   Internet   │
        │              │
        │  HTTPS via   │
        │  porta 8080  │
        └──────────────┘
```

### Volumes Docker (Dados Persistentes)

| Volume | Container | Caminho | Conteudo |
|--------|-----------|---------|----------|
| `wuzapi_data` | wuzapi | /app/dbdata | Banco SQLite com sessoes |
| `wuzapi_files` | wuzapi | /app/files | Arquivos temporarios |

### Consideracoes de Seguranca

**Recomendacoes para producao:**

1. **Trocar Admin Token** para um mais seguro:
   ```bash
   # Editar docker-compose.yml
   # Mudar WUZAPI_ADMIN_TOKEN para algo mais seguro
   # Reiniciar: docker compose down && docker compose up -d
   ```

2. **HTTPS ja configurado** via KingHost

3. **Backup automatico**:
   ```bash
   # Criar script de backup dos volumes
   docker run --rm -v wuzapi_data:/data -v /backup:/backup \
     alpine tar cvf /backup/wuzapi-$(date +%Y%m%d).tar /data
   ```

### Configuracao Multi-Tenant (Multiplas Empresas)

O WuzAPI suporta **multiplos usuarios**, permitindo que cada empresa do Ejym tenha seu proprio WhatsApp conectado com token unico.

#### Arquitetura Multi-Tenant

```
┌─────────────────────────────────────────────────────────────────┐
│                         WuzAPI                                     │
│             (evertonapi.vps-kinghost.net:8080)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      USUARIOS                              │  │
│  │                                                            │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │ ejym-loja-maria  │  │ ejym-moda-bella  │  ...          │  │
│  │  │ Token: xxx_token │  │ Token: yyy_token │               │  │
│  │  │ +55 11 99999-1111│  │ +55 21 88888-2222│               │  │
│  │  │ Status: connected│  │ Status: connected│               │  │
│  │  └──────────────────┘  └──────────────────┘               │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │                        │
            ▼                        ▼
      ┌──────────────┐        ┌──────────────┐
      │  Loja Maria  │        │  Moda Bella  │
      │  (Empresa 1) │        │  (Empresa 2) │
      │              │        │              │
      │  Clientes    │        │  Clientes    │
      │  recebem msg │        │  recebem msg │
      │  deste numero│        │  deste numero│
      └──────────────┘        └──────────────┘
```

#### Nomenclatura dos Usuarios

Cada empresa tem um usuario no WuzAPI com nome e token unicos:

| Empresa | Slug | Usuario WuzAPI | Token |
|---------|------|----------------|-------|
| Loja da Maria | `loja-maria` | `ejym-loja-maria` | `loja-maria_token_xxx` |
| Moda Bella | `moda-bella` | `ejym-moda-bella` | `moda-bella_token_yyy` |

#### Tratamento do 9o Digito Brasileiro

Numeros de celular brasileiros podem estar cadastrados no WhatsApp com ou sem o 9o digito. O sistema usa a API `/user/check` para obter o JID correto antes de enviar mensagens:

```typescript
// 1. Cliente digita: 85996863450
// 2. Sistema formata: 5585996863450
// 3. API /user/check retorna o JID correto (pode ser sem o 9)
// 4. Sistema usa o JID retornado para enviar
```

#### Limites e Consideracoes

| Aspecto | Valor | Observacao |
|---------|-------|------------|
| Usuarios simultaneos | Ilimitado | Limitado apenas por recursos do servidor |
| RAM por sessao | ~20-30 MB | Quando conectada e ativa |
| Reconexao automatica | Sim | WuzAPI reconecta automaticamente |
| Sessao persistente | Sim | Salva no volume Docker (SQLite) |
| Biblioteca base | whatsmeow | Go, mais leve que Baileys |

### Custos da Infraestrutura

| Item | Custo Mensal |
|------|--------------|
| VPS KingHost (existente) | Ja incluso |
| WuzAPI | Gratuito |
| Mensagens WhatsApp | Ilimitadas |
| **Total** | **R$ 0 adicional** |

---

## Implementacao Frontend (Janeiro 2026)

Esta secao documenta a implementacao completa do frontend para integracao com WhatsApp.

### Arquivos Criados/Modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/services/whatsapp.ts` | **Novo** | Servico completo para WuzAPI |
| `src/components/ui/WhatsAppConnectModal.tsx` | **Novo** | Modal para conexao via QR Code |
| `src/components/ui/index.ts` | **Modificado** | Export do novo componente |
| `src/modules/settings/SettingsPage.tsx` | **Modificado** | Secao de automacao de mensagens |
| `src/types/index.ts` | **Modificado** | Interface WhatsAppSettings |
| `supabase/migrations/20260118000003_add_whatsapp_settings.sql` | **Novo** | Migration para banco |
| `.env.local` | **Modificado** | Variaveis de ambiente |

### 1. Servico WhatsApp (`src/services/whatsapp.ts`)

Servico completo para comunicacao com a WuzAPI.

#### Funcoes Exportadas

| Funcao | Descricao | Retorno |
|--------|-----------|---------|
| `getInstanceName(slug)` | Gera nome da instancia | `ejym-{slug}` |
| `formatPhoneForWhatsApp(phone)` | Formata telefone (55+DDD+numero) | `string` |
| `createInstance(slug)` | Cria instancia para empresa | `{ success, error? }` |
| `getConnectionState(slug)` | Verifica status da conexao | `{ state: 'open'|'close'|'connecting' }` |
| `getQRCode(slug)` | Obtem QR Code para conexao | `QRCodeResponse | null` |
| `disconnectInstance(slug)` | Desconecta WhatsApp (logout) | `boolean` |
| `deleteInstance(slug)` | Remove instancia completamente | `boolean` |
| `getInstanceInfo(slug)` | Busca info da instancia | `InstanceInfo | null` |
| `sendTextMessage(slug, phone, message)` | Envia mensagem de texto | `SendMessageResult` |
| `checkApiHealth()` | Verifica se API esta online | `boolean` |
| `formatOrderMessageForCustomer(...)` | Formata mensagem para cliente | `string` |
| `formatOrderMessageForCompany(...)` | Formata mensagem para empresa | `string` |

#### Tipos Exportados

```typescript
export interface ConnectionState {
  state: 'open' | 'close' | 'connecting';
}

export interface QRCodeResponse {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

export interface InstanceInfo {
  name: string;
  connectionStatus: 'open' | 'close' | 'connecting';
  number: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  provider: 'evolution' | 'z-api' | 'twilio' | 'wuzapi';
  instance_name: string;
  user_token: string;
  connected: boolean;
  connected_at: string | null;
  phone: string | null;
  phone_name: string | null;
  notify_on_new_order: boolean;
  notify_on_confirm: boolean;
  notify_on_complete: boolean;
  notify_on_cancel: boolean;
}

export const defaultWhatsAppSettings: WhatsAppSettings;
```

### 2. Componente Modal (`src/components/ui/WhatsAppConnectModal.tsx`)

Modal para conexao do WhatsApp via QR Code.

#### Props

```typescript
interface WhatsAppConnectModalProps {
  isOpen: boolean;           // Controla visibilidade
  onClose: () => void;       // Callback ao fechar
  companySlug: string;       // Slug da empresa
  companyName: string;       // Nome da empresa (exibicao)
  onConnected?: (info: { phone: string; name: string }) => void;  // Callback ao conectar
}
```

#### Estados do Modal

| Status | Descricao | UI |
|--------|-----------|-----|
| `checking` | Verificando API e conexao | Loader + "Verificando conexao..." |
| `loading` | Preparando instancia | Loader + "Preparando conexao..." |
| `qrcode` | QR Code disponivel | Imagem do QR + instrucoes |
| `connected` | WhatsApp conectado | Icone verde + numero conectado |
| `error` | Erro na conexao | Icone vermelho + mensagem |
| `api-offline` | API indisponivel | Icone laranja + mensagem |

### 3. Migration do Banco de Dados

#### Arquivo: `supabase/migrations/20260118000003_add_whatsapp_settings.sql`

```sql
-- Adiciona coluna whatsapp_settings na tabela companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS whatsapp_settings JSONB DEFAULT '{}'::jsonb;

-- Comentario com estrutura esperada
COMMENT ON COLUMN companies.whatsapp_settings IS 'WhatsApp automation settings';

-- Index para consultas
CREATE INDEX IF NOT EXISTS idx_companies_whatsapp_enabled
ON companies ((whatsapp_settings->>'enabled'))
WHERE whatsapp_settings->>'enabled' = 'true';

-- Tabela de log de mensagens
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catalog_orders(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'company')),
  message_type TEXT NOT NULL CHECK (message_type IN ('order_created', 'order_confirmed', 'order_completed', 'order_cancelled', 'test')),
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  external_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON whatsapp_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order ON whatsapp_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);

-- RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
```

### 4. Variaveis de Ambiente

#### `.env.local`

```bash
# WuzAPI (WhatsApp) - APENAS URL no frontend
VITE_WUZAPI_URL=https://evertonapi.vps-kinghost.net
# IMPORTANTE: Token admin NAO e exposto no frontend
# Configurado como secret na Edge Function
```

---

## Notificacoes Automaticas de Pedidos (Janeiro 2026)

Esta secao documenta a implementacao das notificacoes automaticas de WhatsApp para pedidos do catalogo.

### Principios de Design

1. **Nao-bloqueante (Fire and Forget):** O envio de WhatsApp NUNCA bloqueia o sistema. Se falhar, o pedido continua normalmente.
2. **Mensagens neutras:** A UI nao promete entrega de WhatsApp, apenas informa que a empresa recebeu o pedido.
3. **Graceful degradation:** Se WhatsApp nao estiver configurado, sistema continua funcionando normalmente.
4. **Futuro Premium:** A automacao de WhatsApp sera funcionalidade exclusiva para planos pagos.

### Fluxo Completo Implementado

```
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO AUTOMATICO DE NOTIFICACOES WHATSAPP                       │
└─────────────────────────────────────────────────────────────────┘

1. PEDIDO CRIADO (CheckoutModal.tsx)
   ├─► Cliente recebe: "Seu pedido foi recebido! Aguarde confirmacao..."
   └─► Empresa recebe: "NOVO PEDIDO! Cliente X, R$ Y..."

2. PEDIDO CONFIRMADO (CatalogOrdersPage.tsx)
   └─► Cliente recebe: "Pedido CONFIRMADO! Estamos preparando..."

3. PEDIDO ENTREGUE (CatalogOrdersPage.tsx)
   └─► Cliente recebe: "Pedido ENTREGUE! Obrigado pela preferencia!"

4. PEDIDO CANCELADO (CatalogOrdersPage.tsx)
   └─► Cliente recebe: "Pedido cancelado. Motivo: ..."
```

### Condicoes para Envio Automatico

O sistema envia notificacoes automaticas quando TODAS as condicoes sao atendidas:

| Condicao | Campo | Descricao |
|----------|-------|-----------|
| WhatsApp habilitado | `whatsapp_settings.enabled` | Automacao ativada |
| WhatsApp conectado | **Verificacao em tempo real** | Chama `getConnectionState()` da API |
| Token configurado | `whatsapp_settings.user_token` | Token da empresa no WuzAPI |
| Notificacao ativa | `whatsapp_settings.notify_on_*` | Opcao marcada nas configuracoes |
| Consentimento LGPD | `order.whatsapp_consent` | Cliente consentiu receber mensagens |

Se alguma condicao nao for atendida, o sistema usa o **fallback**: abre `wa.me` no navegador (comportamento antigo).

### Verificacao de Conexao em Tempo Real (Janeiro 2026)

**Problema identificado:**
O campo `connected` salvo no banco de dados podia ficar desatualizado, causando falhas no envio de notificacoes mesmo quando o WhatsApp estava conectado.

**Solucao implementada:**
O sistema agora verifica a conexao **em tempo real** usando a API do WuzAPI antes de enviar cada notificacao:

```typescript
// CatalogOrdersPage.tsx - sendWhatsAppNotification()

// 1. Verifica conexao em tempo real (nao confia no cache do banco)
const connectionState = await getConnectionState(whatsAppSettings.user_token);
const isConnected = connectionState.state === 'open';

// 2. Sincroniza banco automaticamente se status divergir
if (isConnected !== whatsAppSettings.connected && currentCompany) {
  await supabase
    .from('companies')
    .update({
      whatsapp_settings: {
        ...rawSettings,
        connected: isConnected,
        connected_at: isConnected ? new Date().toISOString() : null,
      },
    })
    .eq('id', currentCompany.id);
}

// 3. Continua com envio apenas se conectado
if (!isConnected) return;
```

**Beneficios:**
- Notificacoes funcionam mesmo se `connected` estiver desatualizado no banco
- Banco e sincronizado automaticamente quando status diverge
- Logs detalhados para debug: `[WhatsApp] Real-time connection state: open`

### Merge de Configuracoes com Defaults (Janeiro 2026)

**Problema identificado:**
Configuracoes salvas no banco sem os campos `notify_on_confirm`, `notify_on_complete`, etc. causavam falhas porque esses valores ficavam `undefined`.

**Solucao implementada:**
```typescript
// CatalogOrdersPage.tsx

const whatsAppSettings: WhatsAppSettings = {
  ...defaultWhatsAppSettings,
  ...rawSettings,
  // Garante defaults para campos de notificacao
  notify_on_new_order: rawSettings?.notify_on_new_order ?? true,
  notify_on_confirm: rawSettings?.notify_on_confirm ?? true,
  notify_on_complete: rawSettings?.notify_on_complete ?? true,
  notify_on_cancel: rawSettings?.notify_on_cancel ?? true,
};
```

**Beneficios:**
- Campos faltantes assumem `true` por padrao
- Compatibilidade com configuracoes antigas
- Evita erros de `undefined`

### Mensagens Enviadas

As mensagens incluem detalhamento de descontos quando aplicaveis (cupons, pontos de fidelidade, promocoes).

#### 1. Para o CLIENTE (Pedido Criado)

**Sem descontos:**
```
Ola {nome}!

Recebemos seu pedido na *{empresa}*!

*Pedido #{numero}*
  - 2x Camiseta Azul: R$ 79.80
  - 1x Calca Jeans: R$ 129.90

*Total: R$ 209.70*

Aguarde a confirmacao da loja.
Voce sera notificado quando o pedido for confirmado!
```

**Com descontos (cupom, pontos e/ou promocao):**
```
Ola Joao!

Recebemos seu pedido na *Loja Exemplo*!

*Pedido #ABC12345*
  - 2x Camiseta Azul: R$ 79.80
  - 1x Calca Jeans: R$ 129.90

*Subtotal:* R$ 209.70
*Descontos:*
  Cupom (PROMO10): -R$ 20.97
  Pontos (100 pts): -R$ 10.00
  Desconto de aniversario: -R$ 15.00

*Total: R$ 163.73*

Aguarde a confirmacao da loja.
Voce sera notificado quando o pedido for confirmado!
```

#### 2. Para a EMPRESA (Novo Pedido)

**Sem descontos:**
```
*NOVO PEDIDO!*

*Cliente:* Joao Silva
*Telefone:* (11) 99999-8888

*Itens:*
  - 2x Camiseta Azul: R$ 79.80
  - 1x Calca Jeans: R$ 129.90

*Total: R$ 209.70*

*Obs:* Entregar no periodo da tarde

Acesse o painel para confirmar o pedido.
```

**Com descontos:**
```
*NOVO PEDIDO!*

*Cliente:* Joao Silva
*Telefone:* (11) 99999-8888

*Itens:*
  - 2x Camiseta Azul: R$ 79.80
  - 1x Calca Jeans: R$ 129.90

*Subtotal:* R$ 209.70
*Descontos:*
  Cupom (PROMO10): -R$ 20.97
  Pontos (100 pts): -R$ 10.00
  Desconto de aniversario: -R$ 15.00

*Total: R$ 163.73*

*Obs:* Entregar no periodo da tarde

Acesse o painel para confirmar o pedido.
```

#### Interface OrderDiscountInfo

```typescript
// src/services/whatsapp.ts

export interface OrderDiscountInfo {
  subtotal: number;
  couponCode?: string;
  couponDiscount?: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  promotionDiscount?: number;
  promotionNames?: string[];
}
```

#### 3. Para o CLIENTE (Pedido Confirmado)

```
Ola {nome}!

Seu pedido na *{empresa}* foi *CONFIRMADO*!

*Pedido #{numero}*
*Total: R$ 209.70*

Estamos preparando seu pedido.
Voce sera notificado quando estiver pronto!
```

#### 4. Para o CLIENTE (Pedido Entregue)

```
Ola {nome}!

Seu pedido na *{empresa}* foi *ENTREGUE/FINALIZADO*!

*Pedido #{numero}*
*Total: R$ 209.70*

Obrigado pela preferencia!
Esperamos ve-lo novamente em breve.
```

#### 5. Para o CLIENTE (Pedido Cancelado)

```
Ola {nome},

Infelizmente seu pedido na *{empresa}* foi *CANCELADO*.

*Pedido #{numero}*

Motivo: {motivo_cancelamento}

Entre em contato conosco se tiver duvidas.
```

### Comparativo: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Cliente finaliza pedido** | Abre wa.me no navegador | Mensagem enviada automaticamente (se configurado) |
| **Cliente precisa agir** | Sim, enviar mensagem manualmente | Nao, so aguardar |
| **Empresa e notificada** | Nao automaticamente | Sim, recebe alerta no WhatsApp (se configurado) |
| **Botao no checkout** | "Enviar via WhatsApp" | "Enviar Pedido" |
| **Experiencia do cliente** | Precisa ter WhatsApp aberto | Recebe notificacao passivamente |
| **Mensagem de sucesso** | "Voce recebera confirmacao no WhatsApp" | "A empresa recebeu seu pedido" (neutra) |
| **Se WhatsApp falhar** | Sistema travava | Sistema continua normalmente (fire and forget) |

---

## Painel de Administracao WhatsApp (Super Admin)

Esta secao documenta o painel de gerenciamento de instancias WhatsApp disponivel para Super Admins.

### Acesso

- **URL:** `/admin/whatsapp`
- **Menu:** Admin Sidebar > WhatsApp
- **Permissao:** Super Admin apenas

### Visao Geral

O painel permite gerenciar todas as instancias do WuzAPI diretamente pelo navegador, sem necessidade de SSH.

```
┌─────────────────────────────────────────────────────────────────┐
│  WhatsApp - Instancias                                          │
│  2 de 3 empresas conectadas                         [Atualizar] │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WuzAPI Online                                             │  │
│  │     https://evertonapi.vps-kinghost.net     [Operacional] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│  │  2   │ │  3   │ │  3   │ │  0   │                           │
│  │Conect│ │Config│ │ API  │ │Orfaos│                           │
│  └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                  │
│  Empresas com WhatsApp                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [Logo] Loja Maria        ● Conectado    +55 85 9856-5551  │  │
│  │        ejym-loja-maria                 [Desconectar] [X]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [Logo] Moda Bella        ○ Desconectado        -          │  │
│  │        ejym-moda-bella                  [QR Code] [X]     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Funcionalidades

| Funcionalidade | Descricao |
|----------------|-----------|
| **Status da API** | Verifica se WuzAPI esta online |
| **Lista de Empresas** | Mostra todas as empresas com WhatsApp configurado |
| **Status de Conexao** | Conectado, Desconectado, Aguardando QR, Sem instancia |
| **Telefone Conectado** | Numero e nome do perfil WhatsApp |
| **Desconectar** | Faz logout da sessao (com confirmacao) |
| **Gerar QR Code** | Reconectar empresa desconectada |
| **Excluir Instancia** | Remove usuario do WuzAPI (com confirmacao) |
| **Usuarios Orfaos** | Lista usuarios no WuzAPI sem empresa correspondente |

### Cards de Estatisticas

| Card | Descricao |
|------|-----------|
| **Conectados** | Quantidade de empresas com WhatsApp conectado |
| **Configurados** | Quantidade de empresas com whatsapp_settings |
| **Usuarios API** | Total de usuarios cadastrados no WuzAPI |
| **Orfaos** | Usuarios no WuzAPI sem empresa no sistema |

### Arquivos Criados

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/admin/WhatsAppAdminPage.tsx` | Pagina principal do painel |
| `src/services/whatsapp.ts` | Funcoes admin adicionadas |

### Rotas e Menu

| Item | Valor |
|------|-------|
| **Rota** | `/admin/whatsapp` |
| **Componente** | `WhatsAppAdminPage` |
| **Guard** | `SuperAdminRoute` |
| **Menu** | AdminSidebar > WhatsApp (icone WhatsApp) |
| **Acao Rapida** | AdminDashboardPage > Botao "WhatsApp" |

---

## Melhorias de Seguranca e Resiliencia (Janeiro 2026)

### 1. Token Deterministico por Empresa

**Problema anterior:**
```typescript
// Token gerado com timestamp - diferente a cada conexao
return `${companySlug}_token_${Date.now().toString(36)}`;
```
Isso causava criacao de multiplos usuarios "orfaos" no WuzAPI quando uma empresa tentava reconectar.

**Solucao implementada:**
```typescript
// Token deterministico baseado em hash do slug
export function generateUserToken(companySlug: string): string {
  let hash = 0;
  const str = `ejym_${companySlug}_wuzapi_token`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hashStr = Math.abs(hash).toString(36);
  return `${companySlug}_token_${hashStr}`;
}
```

**Beneficios:**
- Mesmo token sempre para a mesma empresa
- Evita usuarios duplicados no WuzAPI
- Reutiliza instancia existente automaticamente

### 2. Timeout em Requisicoes

```typescript
const API_TIMEOUT = 30000; // 30 segundos

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 3. Retry Automatico para Erros Transitorios

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // Retry em erros 500 (servidor)
      if (response.status >= 500 && attempt < maxRetries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, RETRY_DELAY * (attempt + 1))
        );
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if ((error as Error).name === 'AbortError') {
        throw new Error('Timeout: API nao respondeu a tempo');
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, RETRY_DELAY * (attempt + 1))
        );
        continue;
      }
    }
  }

  throw lastError || new Error('Erro desconhecido');
}
```

### 4. Edge Function para Operacoes WuzAPI

A Edge Function no Supabase esta **totalmente funcional** com autenticacao Firebase e permissoes diferenciadas por acao:

**Arquivo:** `supabase/functions/wuzapi-admin/index.ts`

**Acoes suportadas e permissoes:**

| Acao | Descricao | Permissao |
|------|-----------|-----------|
| `create-user` | Criar usuario WuzAPI | **Membro da empresa** OU Super Admin |
| `list-users` | Listar usuarios | Apenas **Super Admin** |
| `delete-user` | Deletar usuario | Apenas **Super Admin** |
| `get-user-status` | Status da sessao | Qualquer usuario autenticado |

**Seguranca implementada:**
- Token admin WuzAPI guardado como **secret no servidor** (nao exposto no frontend)
- Validacao de Firebase ID Token (verifica issuer, audience, expiracao)
- Permissoes diferenciadas por acao
- Deploy com `--no-verify-jwt` para aceitar Firebase JWT

**Deploy da Edge Function:**
```bash
npx supabase functions deploy wuzapi-admin --project-ref <project-ref> --no-verify-jwt
```

**Secrets configurados no Supabase:**
```bash
npx supabase secrets set \
  WUZAPI_URL=https://evertonapi.vps-kinghost.net \
  WUZAPI_ADMIN_TOKEN=<token-seguro>
```

### Comandos Uteis

**Reiniciar WuzAPI (resolve erros SQLite):**
```bash
ssh evertonapi "docker restart wuzapi"
```

**Verificar logs:**
```bash
ssh evertonapi "docker logs wuzapi --tail 100"
```

**Listar usuarios WuzAPI (via SSH na VPS):**
```bash
ssh evertonapi "curl -s -H 'Authorization: <admin-token>' \
  'http://localhost:8080/admin/users'"
```

---

## Interface Unificada de WhatsApp (Janeiro 2026)

### Contexto

Anteriormente, a pagina de Configuracoes tinha **dois cards separados** para WhatsApp:

1. **"WhatsApp da Empresa"** - Campo para digitar numero de telefone manual (cliente abre `wa.me`)
2. **"Automacao de Mensagens"** - Conexao via QR Code para envio automatico

Isso causava confusao para os usuarios.

### Nova Interface (Card Unificado)

A nova interface unifica tudo em um **unico card** com dois modos claros:

| Estado | Modo Automatico | Modo Manual |
|--------|-----------------|-------------|
| Conectado | Verde, badge "ATIVO" | Cinza, "Desativado (usando automatico)" |
| Desconectado + telefone | Cinza, "Conecte seu WhatsApp" | Amarelo, badge "ATIVO" |
| Desconectado sem telefone | Cinza, "Conecte seu WhatsApp" | Cinza, "Configure um numero" |

### Sincronizacao Automatica de Numero

Quando o WhatsApp e conectado via QR Code, o sistema:

1. Obtem o numero do telefone conectado
2. Formata para exibicao `(XX) XXXXX-XXXX`
3. Atualiza o campo `company.phone` automaticamente
4. Salva tanto `whatsapp_settings` quanto `phone` no banco

### Fallback Inteligente

| Cenario | Comportamento |
|---------|---------------|
| Automacao conectada | Mensagens enviadas automaticamente via WuzAPI |
| Automacao desconectada + telefone manual | Botao "Abrir WhatsApp" (wa.me) aparece para o cliente |
| Sem automacao nem telefone | Pedido salvo, mas sem comunicacao via WhatsApp |

---

## LGPD e Validacao de Telefone (Janeiro 2026)

### 1. Consentimento para Mensagens (LGPD)

**Implementacao:**
```typescript
// Estado de consentimento (opt-in por padrao)
const [whatsappConsent, setWhatsappConsent] = useState(true);

// Salva no banco junto com o pedido
const order = await supabase.from('catalog_orders').insert({
  // ... outros campos
  whatsapp_consent: whatsappConsent,
  consent_at: whatsappConsent ? new Date().toISOString() : null,
});

// Verifica consentimento antes de enviar mensagem
const canSendAutomatic =
  whatsappConsent && // LGPD: Verifica consentimento
  whatsappSettings.enabled &&
  whatsappSettings.connected &&
  whatsappSettings.user_token &&
  whatsappSettings.notify_on_new_order;
```

**Migration SQL:**
```sql
-- supabase/migrations/20260119000002_add_whatsapp_consent.sql

-- Campo de consentimento
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT false;

-- Data/hora do consentimento (auditoria)
ALTER TABLE catalog_orders ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- Comentarios LGPD
COMMENT ON COLUMN catalog_orders.whatsapp_consent IS 'LGPD: Cliente consentiu receber mensagens WhatsApp';
COMMENT ON COLUMN catalog_orders.consent_at IS 'LGPD: Data/hora do consentimento';
```

### 2. Validacao de Formato de Telefone

**Formatos aceitos:**
- **10 digitos:** DDD + 8 digitos (fixo ou WhatsApp Business)
  - Exemplo: `8534981684` → `(85) 3498-1684`
- **11 digitos:** DDD + 9 digitos (celular)
  - Exemplo: `85999991234` → `(85) 99999-1234`

**Implementacao:**
```typescript
// Validacao de formato brasileiro
const isValidBrazilianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
};

// Formatacao automatica enquanto digita
const formatPhoneInput = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};
```

### 3. Verificacao de WhatsApp em Tempo Real

**Funcionalidade:** Verifica se o numero informado possui WhatsApp usando o endpoint `/user/check` do WuzAPI.

**Fluxo:**
1. Cliente digita telefone
2. Formatacao automatica e validacao de formato
3. Apos 1.5s sem digitar (debounce), verifica no WuzAPI
4. Mostra feedback visual:
   - Verde: "WhatsApp verificado (Nome do contato)"
   - Amarelo: "Numero nao encontrado no WhatsApp"
   - Loading: "Verificando WhatsApp..."

### 4. Proximos Passos LGPD

- [ ] Adicionar link de opt-out em cada mensagem WhatsApp
- [ ] Tela de gerenciamento de consentimentos
- [ ] Historico de alteracoes de consentimento (auditoria)
- [ ] Politica de privacidade no catalogo
- [ ] Exportacao de dados do cliente (direito LGPD)

---

## Proximos Passos

### Concluidos

1. [x] ~~Decidir provedor inicial~~ - WuzAPI (substituiu Evolution API)
2. [x] ~~Instalar WuzAPI na VPS~~
3. [x] ~~Criar servico `src/services/whatsapp.ts`~~ - API completa para WuzAPI
4. [x] ~~Criar componente `WhatsAppConnectModal`~~ - Modal com QR Code
5. [x] ~~Adicionar secao de WhatsApp em SettingsPage~~
6. [x] ~~Criar migration `20260118000003_add_whatsapp_settings.sql`~~
7. [x] ~~Atualizar tipos em `src/types/index.ts`~~ - WhatsAppSettings com `user_token`
8. [x] ~~Configurar variaveis de ambiente~~
9. [x] ~~Aplicar migration no Supabase~~
10. [x] ~~Conectar WhatsApp via QR Code~~
11. [x] ~~Implementar verificacao de telefone com /user/check~~ - Resolve problema do 9o digito
12. [x] ~~Testar envio de mensagem~~ - Funcionando
13. [x] ~~Implementar notificacoes automaticas de pedidos~~ - Funcionando (Janeiro 2026)
14. [x] ~~Painel de Administracao WhatsApp (Super Admin)~~ - Janeiro 2026
15. [x] ~~Autenticacao Hibrida na Edge Function~~ - Janeiro 2026
16. [x] ~~Checkbox de consentimento no checkout (LGPD)~~ - Janeiro 2026
17. [x] ~~Validacao de telefone com verificacao de WhatsApp no checkout~~ - Janeiro 2026
18. [x] ~~Verificacao de conexao em tempo real~~ - Janeiro 2026 (resolve problema de `connected` desatualizado)
19. [x] ~~Sincronizacao automatica de status no banco~~ - Janeiro 2026
20. [x] ~~Merge de configuracoes com defaults~~ - Janeiro 2026 (resolve `notify_on_*` undefined)

### Pendentes

21. [ ] Implementar Edge Function `send-whatsapp` (para envio via trigger do banco - opcional)
22. [ ] Historico de mensagens enviadas (tabela `whatsapp_messages`)
23. [ ] **[FUTURO]** Tornar automacao WhatsApp exclusiva para planos pagos (premium feature)
24. [ ] **[FUTURO]** Permitir opt-out de notificacoes (LGPD - link em cada mensagem)
25. [ ] **[FUTURO]** Historico de consentimentos (auditoria LGPD)
26. [ ] Cache de verificacao de numero
27. [ ] Webhook para status de conexao
28. [ ] Health check periodico

### Como Testar

1. **Testar conexao:**
   - Acesse `/app/{slug}/configuracoes` como admin
   - Clique em "Conectar WhatsApp"
   - Escaneie o QR Code com o celular
   - Verifique se status muda para "Conectado"

2. **Testar envio de mensagem:**
   - Com WhatsApp conectado, insira um numero de teste
   - Clique em "Enviar Mensagem de Teste"
   - Verifique se mensagem chegou no WhatsApp

3. **Testar notificacao automatica de novo pedido:**
   - Certifique-se que WhatsApp esta conectado
   - Certifique-se que "Novo pedido recebido" esta habilitado nas configuracoes
   - Acesse o catalogo publico da empresa (`/catalogo/{slug}`)
   - Adicione produtos ao carrinho
   - Finalize o pedido com nome e telefone valido
   - Cliente deve receber mensagem de confirmacao no WhatsApp
   - Empresa deve receber alerta de novo pedido no WhatsApp

4. **Testar notificacao de mudanca de status:**
   - Acesse `/app/{slug}/pedidos` como admin
   - Confirme um pedido pendente
   - Cliente deve receber mensagem "Pedido CONFIRMADO"
   - Marque como entregue
   - Cliente deve receber mensagem "Pedido ENTREGUE"

5. **Testar validacao de telefone:**
   - Acesse o catalogo publico (`/catalogo/{slug}`)
   - Adicione um produto ao carrinho e va para checkout
   - Digite um telefone incompleto (ex: 8599) - deve mostrar hint "Informe DDD + numero"
   - Digite telefone completo 10 digitos (ex: 8534981684) - deve formatar como (85) 3498-1684
   - Digite telefone completo 11 digitos (ex: 85999991234) - deve formatar como (85) 99999-1234
   - Se empresa tem WhatsApp conectado, apos 1.5s deve verificar se numero tem WhatsApp

6. **Testar consentimento LGPD:**
   - No checkout, verifique que checkbox "Receber atualizacoes via WhatsApp" esta marcado por padrao
   - Desmarque o checkbox e finalize o pedido
   - Verifique no banco que `whatsapp_consent = false` e `consent_at = null`
   - Pedido NAO deve enviar notificacoes WhatsApp automaticas
   - Marque o checkbox e finalize outro pedido
   - Verifique no banco que `whatsapp_consent = true` e `consent_at` tem data
   - Pedido DEVE enviar notificacoes WhatsApp automaticas

---

## Referencias

- [WuzAPI GitHub](https://github.com/asternic/wuzapi)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

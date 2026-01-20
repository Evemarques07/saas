# Automacao de WhatsApp para Pedidos - Planejamento

Este documento detalha o planejamento para automatizar mensagens de WhatsApp no fluxo de pedidos do catalogo.

> **Nota:** A implementacao real esta documentada em [WHATSAPP_IMPLEMENTATION.md](./WHATSAPP_IMPLEMENTATION.md)

## Sumario

1. [Visao Geral](#visao-geral)
2. [Fluxo Atual vs Desejado](#fluxo-atual-vs-desejado)
3. [Solucoes Disponiveis](#solucoes-disponiveis)
4. [Comparativo de Precos](#comparativo-de-precos)
5. [Arquitetura Proposta](#arquitetura-proposta)
6. [Implementacao](#implementacao)
7. [Templates de Mensagens](#templates-de-mensagens)
8. [Consideracoes de Seguranca](#consideracoes-de-seguranca)
9. [Recomendacao Final](#recomendacao-final)

---

## Visao Geral

### Situacao Atual

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Cliente      │     │    Sistema      │     │    Empresa      │
│  (Catalogo)     │     │    (Ejym)       │     │  (WhatsApp)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  1. Faz pedido        │                       │
        │──────────────────────>│                       │
        │                       │                       │
        │                       │  2. Salva no banco    │
        │                       │  (catalog_orders)     │
        │                       │                       │
        │  3. Abre WhatsApp     │                       │
        │  (MANUAL - opcional)  │                       │
        │───────────────────────────────────────────────>
        │                       │                       │
        │                       │  4. Empresa ve pedido │
        │                       │  no dashboard         │
        │                       │                       │
        │  5. SEM notificacao   │                       │
        │  automatica ao        │                       │
        │  cliente              │                       │
        │<- - - - - - - - - - - - - - - - - - - - - - - │
```

**Problemas:**
- Cliente precisa enviar WhatsApp manualmente
- Empresa nao recebe notificacao push no WhatsApp
- Cliente nao recebe atualizacoes de status automaticamente
- Dependencia de acesso ao dashboard para ver pedidos

### Situacao Desejada

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Cliente      │     │    Sistema      │     │    Empresa      │
│  (Catalogo)     │     │    (Ejym)       │     │  (WhatsApp)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  1. Faz pedido        │                       │
        │──────────────────────>│                       │
        │                       │                       │
        │                       │  2. Salva no banco    │
        │                       │                       │
        │  3. Confirmacao       │  4. Notifica empresa  │
        │  automatica           │  (novo pedido!)       │
        │<──────────────────────│──────────────────────>│
        │                       │                       │
        │                       │  5. Empresa confirma  │
        │                       │<──────────────────────│
        │                       │                       │
        │  6. "Pedido           │                       │
        │  confirmado!"         │                       │
        │<──────────────────────│                       │
        │                       │                       │
        │                       │  7. Empresa marca     │
        │                       │  como entregue        │
        │                       │<──────────────────────│
        │                       │                       │
        │  8. "Pedido           │                       │
        │  entregue!"           │                       │
        │<──────────────────────│                       │
```

**Mensagens automatizadas:**

| Evento | Destinatario | Mensagem |
|--------|--------------|----------|
| Pedido criado | Cliente | Confirmacao do pedido recebido |
| Pedido criado | Empresa | Notificacao de novo pedido |
| Status: confirmed | Cliente | Pedido confirmado, em preparacao |
| Status: completed | Cliente | Pedido entregue/finalizado |
| Status: cancelled | Cliente | Pedido cancelado (com motivo) |

---

## Fluxo Atual vs Desejado

### Fluxo Atual (Manual)

1. Cliente acessa catalogo (`/catalogo/:slug`)
2. Adiciona produtos ao carrinho
3. Preenche dados (nome, telefone, observacoes)
4. Finaliza pedido
5. Sistema salva em `catalog_orders`
6. **Opcional**: Cliente clica em "Enviar WhatsApp" (abre wa.me)
7. Empresa ve pedido no dashboard (precisa estar logado)
8. Empresa muda status manualmente
9. Cliente nao recebe notificacao

### Fluxo Desejado (Automatizado)

1. Cliente acessa catalogo
2. Adiciona produtos ao carrinho
3. Preenche dados (nome, telefone)
4. Finaliza pedido
5. Sistema salva em `catalog_orders`
6. **AUTOMATICO**: Sistema envia WhatsApp para cliente (confirmacao)
7. **AUTOMATICO**: Sistema envia WhatsApp para empresa (novo pedido)
8. Empresa muda status no dashboard
9. **AUTOMATICO**: Sistema envia WhatsApp para cliente (status atualizado)

---

## Solucoes Disponiveis

### Solucoes Oficiais (Pagas)

#### 1. WhatsApp Business API (Meta/Facebook)

A API oficial do WhatsApp, oferecida diretamente pelo Meta.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | API oficial |
| **Custo** | Por mensagem (varia por pais) |
| **Aprovacao** | Requer verificacao de negocio no Meta |
| **Confiabilidade** | Maxima (oficial) |
| **Limitacoes** | Templates precisam de aprovacao |
| **Tempo setup** | 1-4 semanas |

**Precos Brasil (2024/2025):**
- Mensagem de marketing: ~R$ 0,40-0,50
- Mensagem de utilidade: ~R$ 0,15-0,20
- Mensagem de servico: ~R$ 0,15-0,20
- Sessao (24h apos resposta): Gratuito

**Pros:**
- 100% oficial e confiavel
- Nao corre risco de banimento
- Suporte do Meta
- Escalavel para milhoes de mensagens

**Contras:**
- Processo de aprovacao demorado
- Templates precisam de aprovacao previa
- Custo por mensagem
- Complexidade de integracao

---

#### 2. Twilio

Plataforma de comunicacao que oferece WhatsApp Business API como servico.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | BSP (Business Solution Provider) |
| **Custo** | Por mensagem + taxa Twilio |
| **Aprovacao** | Via Twilio (mais rapido) |
| **Confiabilidade** | Alta |
| **SDK** | Excelente (Node.js, Python, etc) |
| **Tempo setup** | 1-2 semanas |

**Precos:**
- Setup: Gratuito
- Mensagem template: ~$0.005-0.05 USD + custo WhatsApp
- Numero WhatsApp: ~$1/mes

**Pros:**
- Integracao simplificada
- Documentacao excelente
- SDK para varias linguagens
- Painel de gerenciamento

**Contras:**
- Custo adicional sobre a API do WhatsApp
- Ainda requer aprovacao do Meta

```javascript
// Exemplo Twilio
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+5511999998888',
  body: 'Seu pedido #123 foi confirmado!'
});
```

---

#### 3. 360dialog

Parceiro oficial do WhatsApp, focado em WhatsApp Business API.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | BSP oficial |
| **Custo** | EUR 49/mes + custo por mensagem |
| **Aprovacao** | Via 360dialog |
| **Confiabilidade** | Alta |
| **Diferenciais** | Foco total em WhatsApp |

**Precos:**
- Plano basico: EUR 49/mes
- Mensagens: Custo do WhatsApp apenas
- Sem markup nas mensagens

**Pros:**
- Especializado em WhatsApp
- Precos competitivos
- API REST simples
- Webhooks para eventos

**Contras:**
- Mensalidade fixa
- Interface em ingles

---

#### 4. Z-API (Brasileira)

Solucao brasileira nao-oficial que conecta ao WhatsApp Web.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Nao-oficial (WhatsApp Web) |
| **Custo** | R$ 69-199/mes |
| **Aprovacao** | Nenhuma necessaria |
| **Confiabilidade** | Media |
| **Tempo setup** | Minutos |

**Precos:**
- Plano Start: R$ 69/mes (1 instancia)
- Plano Pro: R$ 119/mes (2 instancias)
- Plano Business: R$ 199/mes (5 instancias)
- Mensagens: Ilimitadas

**Pros:**
- Setup instantaneo
- Mensagens ilimitadas
- Suporte em portugues
- API simples
- Nao precisa aprovacao de templates

**Contras:**
- Nao-oficial (risco de bloqueio)
- Depende do WhatsApp Web
- Menos escalavel

```javascript
// Exemplo Z-API
await fetch('https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '5511999998888',
    message: 'Seu pedido #123 foi confirmado!'
  })
});
```

---

### Solucoes Gratuitas/Open Source

#### 5. Evolution API (Recomendada para teste)

API open source brasileira para WhatsApp, muito popular.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Open source (WhatsApp Web) |
| **Custo** | Gratuito (self-hosted) |
| **Aprovacao** | Nenhuma |
| **Confiabilidade** | Media |
| **Hospedagem** | VPS propria |

**Custos:**
- Software: Gratuito
- VPS: R$ 20-50/mes (DigitalOcean, Hostinger)
- Mensagens: Ilimitadas

**Pros:**
- 100% gratuito
- Codigo aberto
- Comunidade ativa (Brasil)
- API REST completa
- Webhooks para eventos
- Multi-instancia

**Contras:**
- Requer servidor proprio
- Manutencao por conta propria
- Nao-oficial (risco de bloqueio)
- Precisa manter conexao ativa

**Instalacao:**
```bash
# Docker
docker run -d --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-chave-secreta \
  atendai/evolution-api
```

**Exemplo de uso:**
```javascript
// Enviar mensagem
await fetch('http://localhost:8080/message/sendText/instancia', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'sua-chave-secreta'
  },
  body: JSON.stringify({
    number: '5511999998888',
    text: 'Seu pedido #123 foi confirmado!'
  })
});
```

---

#### 6. Baileys (Biblioteca Node.js)

Biblioteca JavaScript para conectar ao WhatsApp Web.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Biblioteca open source |
| **Custo** | Gratuito |
| **Linguagem** | Node.js/TypeScript |
| **Manutencao** | Comunidade |

**Pros:**
- Gratuito
- Controle total
- Flexivel

**Contras:**
- Baixo nivel (precisa implementar muito)
- Manutencao constante necessaria
- Pode quebrar com updates do WhatsApp
- Nao recomendado para producao

---

#### 7. Venom Bot

Outra biblioteca Node.js para WhatsApp.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Biblioteca open source |
| **Custo** | Gratuito |
| **Linguagem** | Node.js |

Similar ao Baileys, com as mesmas vantagens e desvantagens.

---

## Comparativo de Precos

### Cenario: 500 pedidos/mes, 3 mensagens por pedido = 1.500 mensagens

| Solucao | Custo Mensal | Custo/Msg | Oficial | Risco Bloqueio |
|---------|--------------|-----------|---------|----------------|
| **WhatsApp API (direto)** | ~R$ 250-300 | ~R$ 0,17 | Sim | Nenhum |
| **Twilio** | ~R$ 300-400 | ~R$ 0,22 | Sim | Nenhum |
| **360dialog** | ~R$ 500+ | ~R$ 0,33 | Sim | Nenhum |
| **Z-API** | R$ 69-199 | R$ 0 (ilim.) | Nao | Medio |
| **Evolution API** | R$ 30-50 (VPS) | R$ 0 (ilim.) | Nao | Medio |
| **Baileys/Venom** | R$ 0 | R$ 0 | Nao | Alto |

### Cenario: 2.000 pedidos/mes = 6.000 mensagens

| Solucao | Custo Mensal | Observacao |
|---------|--------------|------------|
| **WhatsApp API** | ~R$ 1.000-1.200 | Escala linear |
| **Twilio** | ~R$ 1.300-1.500 | Com markup |
| **Z-API** | R$ 199 | Plano Business |
| **Evolution API** | R$ 50-100 (VPS maior) | Melhor custo-beneficio |

---

## Arquitetura Proposta

### Opcao A: Evolution API (Self-hosted) - Recomendada para comecar

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                   │
│                    (Catalogo Publico)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /catalog_orders
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   catalog_orders                           │  │
│  │  INSERT/UPDATE trigger                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              │ Database Webhook                   │
│                              ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Edge Function: send-whatsapp                  │  │
│  │  1. Recebe evento (INSERT ou UPDATE)                      │  │
│  │  2. Determina tipo de mensagem                            │  │
│  │  3. Busca dados da empresa (whatsapp_number)              │  │
│  │  4. Formata mensagem                                      │  │
│  │  5. Envia para Evolution API                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVOLUTION API                                  │
│                   (VPS - DigitalOcean)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - WhatsApp conectado via QR Code                         │  │
│  │  - API REST para envio                                    │  │
│  │  - Webhooks para respostas (futuro)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WhatsApp Protocol
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DESTINATARIOS                                  │
│  ┌────────────────────┐    ┌────────────────────┐               │
│  │  Cliente           │    │  Empresa           │               │
│  │  (confirmacoes)    │    │  (novos pedidos)   │               │
│  └────────────────────┘    └────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Opcao B: Z-API (Mais simples, pago)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Supabase     │────▶│  Edge Function  │────▶│     Z-API       │
│  (DB Webhook)   │     │ send-whatsapp   │     │   (Cloud)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   WhatsApp      │
                                                │   Destinatarios │
                                                └─────────────────┘
```

### Opcao C: WhatsApp Business API (Oficial, escala)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Supabase     │────▶│  Edge Function  │────▶│    Twilio       │
│  (DB Webhook)   │     │ send-whatsapp   │     │  WhatsApp API   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Meta WhatsApp  │
                                                │  Business API   │
                                                └─────────────────┘
```

---

## Implementacao

### Fase 1: Preparacao do Banco de Dados

#### 1.1 Adicionar campo whatsapp_api na tabela companies

```sql
-- Migration: add_whatsapp_settings_to_companies.sql

ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_settings JSONB DEFAULT '{}'::jsonb;

-- Estrutura do JSONB:
-- {
--   "enabled": true,
--   "provider": "evolution", -- "evolution" | "z-api" | "twilio"
--   "api_url": "https://api.evolution.exemplo.com",
--   "api_key": "xxx", -- Criptografado
--   "instance_name": "loja-maria",
--   "notify_on_new_order": true,
--   "notify_on_confirm": true,
--   "notify_on_complete": true,
--   "notify_on_cancel": true
-- }

COMMENT ON COLUMN companies.whatsapp_settings IS 'Configuracoes de integracao WhatsApp';
```

#### 1.2 Criar tabela de log de mensagens

```sql
-- Migration: create_whatsapp_messages_log.sql

CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  order_id UUID REFERENCES catalog_orders(id),

  -- Destinatario
  phone TEXT NOT NULL,
  recipient_type TEXT NOT NULL, -- 'customer' | 'company'

  -- Mensagem
  message_type TEXT NOT NULL, -- 'order_created' | 'order_confirmed' | 'order_completed' | 'order_cancelled'
  message_content TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  error_message TEXT,

  -- Rastreamento
  external_id TEXT, -- ID retornado pela API
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_company ON whatsapp_messages(company_id);
CREATE INDEX idx_whatsapp_messages_order ON whatsapp_messages(order_id);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
```

### Fase 2: Edge Function para Envio

#### 2.1 Criar Edge Function

```typescript
// supabase/functions/send-whatsapp/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppPayload {
  company_id: string;
  order_id: string;
  event_type: 'order_created' | 'order_confirmed' | 'order_completed' | 'order_cancelled';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: WhatsAppPayload = await req.json();
    const { company_id, order_id, event_type } = payload;

    // 1. Buscar configuracoes da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('*, whatsapp_settings')
      .eq('id', company_id)
      .single();

    if (!company?.whatsapp_settings?.enabled) {
      return new Response(
        JSON.stringify({ success: false, reason: 'WhatsApp not enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar dados do pedido
    const { data: order } = await supabase
      .from('catalog_orders')
      .select('*, items:catalog_order_items(*)')
      .eq('id', order_id)
      .single();

    if (!order) {
      throw new Error('Order not found');
    }

    // 3. Formatar mensagens
    const messages = formatMessages(company, order, event_type);

    // 4. Enviar mensagens
    const results = await sendMessages(company.whatsapp_settings, messages);

    // 5. Salvar log
    for (const result of results) {
      await supabase.from('whatsapp_messages').insert({
        company_id,
        order_id,
        phone: result.phone,
        recipient_type: result.recipient_type,
        message_type: event_type,
        message_content: result.message,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error,
        external_id: result.external_id,
        sent_at: result.success ? new Date().toISOString() : null,
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatMessages(company: any, order: any, eventType: string) {
  const messages = [];
  const settings = company.whatsapp_settings;

  // Formatar lista de itens
  const itemsList = order.items
    .map((item: any) => `  - ${item.quantity}x ${item.product_name}: R$ ${item.subtotal.toFixed(2)}`)
    .join('\n');

  // Mensagem para o CLIENTE
  if (order.customer_phone) {
    let customerMessage = '';

    switch (eventType) {
      case 'order_created':
        customerMessage = `Ola ${order.customer_name}!

Recebemos seu pedido na *${company.name}*!

*Pedido #${order.id.slice(0, 8)}*
${itemsList}

*Total: R$ ${order.total.toFixed(2)}*

Aguarde a confirmacao da loja.
Voce sera notificado quando o pedido for confirmado!`;
        break;

      case 'order_confirmed':
        customerMessage = `Ola ${order.customer_name}!

Seu pedido na *${company.name}* foi *CONFIRMADO*!

*Pedido #${order.id.slice(0, 8)}*
*Total: R$ ${order.total.toFixed(2)}*

Estamos preparando seu pedido.
Voce sera notificado quando estiver pronto!`;
        break;

      case 'order_completed':
        customerMessage = `Ola ${order.customer_name}!

Seu pedido na *${company.name}* foi *ENTREGUE/FINALIZADO*!

*Pedido #${order.id.slice(0, 8)}*
*Total: R$ ${order.total.toFixed(2)}*

Obrigado pela preferencia!
Esperamos ve-lo novamente em breve.`;
        break;

      case 'order_cancelled':
        customerMessage = `Ola ${order.customer_name},

Infelizmente seu pedido na *${company.name}* foi *CANCELADO*.

*Pedido #${order.id.slice(0, 8)}*

${order.cancellation_reason ? `Motivo: ${order.cancellation_reason}` : ''}

Entre em contato conosco se tiver duvidas.`;
        break;
    }

    if (customerMessage) {
      messages.push({
        phone: order.customer_phone,
        message: customerMessage,
        recipient_type: 'customer',
      });
    }
  }

  // Mensagem para a EMPRESA (apenas em novo pedido)
  if (eventType === 'order_created' && company.whatsapp_number && settings.notify_on_new_order) {
    const companyMessage = `*NOVO PEDIDO!*

*Cliente:* ${order.customer_name}
*Telefone:* ${order.customer_phone}

*Itens:*
${itemsList}

*Total: R$ ${order.total.toFixed(2)}*

${order.notes ? `*Obs:* ${order.notes}` : ''}

Acesse o painel para confirmar o pedido.`;

    messages.push({
      phone: company.whatsapp_number,
      message: companyMessage,
      recipient_type: 'company',
    });
  }

  return messages;
}

async function sendMessages(settings: any, messages: any[]) {
  const results = [];

  for (const msg of messages) {
    try {
      let result;

      switch (settings.provider) {
        case 'evolution':
          result = await sendViaEvolution(settings, msg);
          break;
        case 'z-api':
          result = await sendViaZAPI(settings, msg);
          break;
        case 'twilio':
          result = await sendViaTwilio(settings, msg);
          break;
        default:
          throw new Error(`Provider ${settings.provider} not supported`);
      }

      results.push({
        ...msg,
        success: true,
        external_id: result.id,
      });
    } catch (error) {
      results.push({
        ...msg,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

// Implementacao para Evolution API
async function sendViaEvolution(settings: any, msg: any) {
  const response = await fetch(
    `${settings.api_url}/message/sendText/${settings.instance_name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': settings.api_key,
      },
      body: JSON.stringify({
        number: formatPhoneForWhatsApp(msg.phone),
        text: msg.message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API error: ${error}`);
  }

  return await response.json();
}

// Implementacao para Z-API
async function sendViaZAPI(settings: any, msg: any) {
  const response = await fetch(
    `${settings.api_url}/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': settings.api_key,
      },
      body: JSON.stringify({
        phone: formatPhoneForWhatsApp(msg.phone),
        message: msg.message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Z-API error: ${error}`);
  }

  return await response.json();
}

// Implementacao para Twilio
async function sendViaTwilio(settings: any, msg: any) {
  const accountSid = settings.account_sid;
  const authToken = settings.auth_token;
  const fromNumber = settings.from_number;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({
        From: `whatsapp:${fromNumber}`,
        To: `whatsapp:+${formatPhoneForWhatsApp(msg.phone)}`,
        Body: msg.message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
  }

  return await response.json();
}

function formatPhoneForWhatsApp(phone: string): string {
  // Remove tudo que nao for numero
  let cleaned = phone.replace(/\D/g, '');

  // Adiciona 55 se nao tiver codigo do pais
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}
```

### Fase 3: Database Webhooks

#### 3.1 Criar trigger para chamar a Edge Function

```sql
-- Migration: create_whatsapp_trigger.sql

-- Funcao que sera chamada pelo trigger
CREATE OR REPLACE FUNCTION notify_whatsapp_on_order_change()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
  payload JSONB;
BEGIN
  -- Determinar tipo de evento
  IF TG_OP = 'INSERT' THEN
    event_type := 'order_created';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar se status mudou
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      CASE NEW.status
        WHEN 'confirmed' THEN event_type := 'order_confirmed';
        WHEN 'completed' THEN event_type := 'order_completed';
        WHEN 'cancelled' THEN event_type := 'order_cancelled';
        ELSE event_type := NULL;
      END CASE;
    ELSE
      event_type := NULL;
    END IF;
  END IF;

  -- Se houver evento, notificar
  IF event_type IS NOT NULL THEN
    payload := jsonb_build_object(
      'company_id', NEW.company_id,
      'order_id', NEW.id,
      'event_type', event_type
    );

    -- Chamar Edge Function via pg_net (extensao do Supabase)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS whatsapp_notification_trigger ON catalog_orders;
CREATE TRIGGER whatsapp_notification_trigger
  AFTER INSERT OR UPDATE ON catalog_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_on_order_change();
```

### Fase 4: Interface de Configuracao

#### 4.1 Adicionar configuracao de WhatsApp em SettingsPage

```typescript
// Adicionar em src/modules/settings/SettingsPage.tsx

interface WhatsAppSettings {
  enabled: boolean;
  provider: 'evolution' | 'z-api' | 'twilio';
  api_url: string;
  api_key: string;
  instance_name: string;
  notify_on_new_order: boolean;
  notify_on_confirm: boolean;
  notify_on_complete: boolean;
  notify_on_cancel: boolean;
}

// Componente de configuracao
function WhatsAppSettingsForm({ company, onSave }) {
  const [settings, setSettings] = useState<WhatsAppSettings>(
    company.whatsapp_settings || {
      enabled: false,
      provider: 'evolution',
      api_url: '',
      api_key: '',
      instance_name: '',
      notify_on_new_order: true,
      notify_on_confirm: true,
      notify_on_complete: true,
      notify_on_cancel: true,
    }
  );

  // ... formulario de configuracao
}
```

---

## Templates de Mensagens

### Novo Pedido (para Cliente)

```
Ola {nome}!

Recebemos seu pedido na *{empresa}*!

*Pedido #{numero}*
{lista_itens}

*Total: R$ {total}*

Aguarde a confirmacao da loja.
Voce sera notificado quando o pedido for confirmado!
```

### Novo Pedido (para Empresa)

```
*NOVO PEDIDO!*

*Cliente:* {nome}
*Telefone:* {telefone}

*Itens:*
{lista_itens}

*Total: R$ {total}*

{observacoes}

Acesse o painel para confirmar o pedido.
```

### Pedido Confirmado

```
Ola {nome}!

Seu pedido na *{empresa}* foi *CONFIRMADO*!

*Pedido #{numero}*
*Total: R$ {total}*

Estamos preparando seu pedido.
Voce sera notificado quando estiver pronto!
```

### Pedido Entregue

```
Ola {nome}!

Seu pedido na *{empresa}* foi *ENTREGUE/FINALIZADO*!

*Pedido #{numero}*
*Total: R$ {total}*

Obrigado pela preferencia!
Esperamos ve-lo novamente em breve.
```

### Pedido Cancelado

```
Ola {nome},

Infelizmente seu pedido na *{empresa}* foi *CANCELADO*.

*Pedido #{numero}*

{motivo_cancelamento}

Entre em contato conosco se tiver duvidas.
```

---

## Consideracoes de Seguranca

### 1. Armazenamento de Credenciais

**NAO armazenar em texto plano!**

```sql
-- Usar pgcrypto para criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Funcao para criptografar
CREATE OR REPLACE FUNCTION encrypt_api_key(key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(key, current_setting('app.encryption_key')),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao para descriptografar
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Rate Limiting

Implementar limite de mensagens por empresa:

```typescript
// Verificar limite antes de enviar
const { count } = await supabase
  .from('whatsapp_messages')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', company_id)
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

if (count > 100) { // Limite de 100 msg/dia
  throw new Error('Daily message limit exceeded');
}
```

### 3. Validacao de Telefone

Sempre validar formato antes de enviar:

```typescript
function isValidBrazilianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // 10-11 digitos (com DDD), ou 12-13 com codigo do pais
  return /^(55)?[1-9]{2}9?[0-9]{8}$/.test(cleaned);
}
```

### 4. LGPD / Consentimento

- Adicionar checkbox de consentimento no checkout
- Permitir opt-out de notificacoes
- Armazenar historico de consentimento

```sql
-- Adicionar campo de consentimento
ALTER TABLE catalog_orders ADD COLUMN whatsapp_consent BOOLEAN DEFAULT false;
```

---

## Recomendacao Final

### Para comecar (MVP):

**Evolution API (Self-hosted)**

| Aspecto | Justificativa |
|---------|---------------|
| Custo | R$ 30-50/mes (apenas VPS) |
| Setup | 1-2 horas |
| Risco | Aceitavel para volume baixo |
| Escalabilidade | Ate ~1000 msg/dia |

**Passos:**
1. Contratar VPS (DigitalOcean, R$ 30/mes)
2. Instalar Evolution API via Docker
3. Conectar WhatsApp da empresa via QR Code
4. Implementar Edge Function
5. Configurar Database Webhook

### Para escala (1000+ pedidos/mes):

**Z-API ou WhatsApp Business API via Twilio**

| Aspecto | Z-API | Twilio |
|---------|-------|--------|
| Custo | R$ 199/mes fixo | Variavel por msg |
| Oficial | Nao | Sim |
| Risco | Medio | Nenhum |
| Setup | 1 hora | 1-2 semanas |

### Roadmap sugerido:

```
Fase 1 (MVP)          Fase 2 (Validacao)     Fase 3 (Escala)
─────────────────────────────────────────────────────────────
Evolution API    ──>  Monitorar uso     ──>  Migrar para
(gratuito)            e feedbacks           API oficial se
                                            volume justificar
```

---

## Referencias

- [Evolution API Docs](https://doc.evolution-api.com/)
- [Z-API Docs](https://developer.z-api.io/)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)

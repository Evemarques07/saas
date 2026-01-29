# WhatsApp API Oficial + WuzAPI Fallback - Planejamento

Este documento detalha o planejamento para migrar o sistema de notificacoes WhatsApp para a **API Oficial da Meta** como metodo primario, mantendo o **WuzAPI como fallback** em segundo plano.

> **Estrategia Principal:** "Jogada de Mestre" - Cliente inicia a conversa para abrir janela de 24h gratuita.

## Sumario

1. [Visao Geral da Estrategia](#visao-geral-da-estrategia)
2. [Arquitetura Hibrida](#arquitetura-hibrida)
3. [Fluxo do Cliente (Checkout)](#fluxo-do-cliente-checkout)
4. [Fluxo do Lojista (Painel)](#fluxo-do-lojista-painel)
5. [Hook de Verificacao de 24h](#hook-de-verificacao-de-24h)
6. [Sistema de Fallback (WuzAPI)](#sistema-de-fallback-wuzapi)
7. [Modelos de Negocio](#modelos-de-negocio)
8. [Implementacao Tecnica](#implementacao-tecnica)
9. [Banco de Dados](#banco-de-dados)
10. [Templates da Meta](#templates-da-meta)
11. [Custos e Economia](#custos-e-economia)
12. [Roadmap de Implementacao](#roadmap-de-implementacao)

---

## Visao Geral da Estrategia

### O Problema Atual

```
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO ATUAL (WuzAPI)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cliente faz pedido                                             │
│       ↓                                                         │
│  Sistema dispara mensagem automatica (WuzAPI)                   │
│       ↓                                                         │
│  ⚠️ RISCOS:                                                     │
│     - Banimento do numero (API nao oficial)                     │
│     - Cliente nao pediu para receber (LGPD)                     │
│     - Custo fixo de VPS mesmo sem uso                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### A Solucao: Fluxo Hibrido Inteligente

```
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO HIBRIDO (API Oficial + WuzAPI Fallback)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Cliente faz pedido                                          │
│       ↓                                                         │
│  2. Tela de sucesso: "Receba atualizacoes no WhatsApp"          │
│       ↓                                                         │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  CLIENTE CLICOU      │    │  CLIENTE NAO CLICOU          │  │
│  │  (Abre wa.me)        │    │                              │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
│             ↓                               ↓                   │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  JANELA 24H ABERTA   │    │  FALLBACK                    │  │
│  │                      │    │                              │  │
│  │  API Oficial (Gratis)│    │  Opcao A: Manual (wa.me)     │  │
│  │  ✅ Confirmado       │    │  Opcao B: WuzAPI (Auto)      │  │
│  │  ✅ Entregue         │    │  Opcao C: Template Pago      │  │
│  │  ✅ Cancelado        │    │                              │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Beneficios

| Aspecto | Antes (WuzAPI) | Depois (Hibrido) |
|---------|----------------|------------------|
| **Custo** | R$ 0 (risco oculto) | R$ 0 na maioria dos casos |
| **Risco de Banimento** | Medio/Alto | Zero (cliente iniciou) |
| **Conformidade LGPD** | Parcial | Total (opt-in explicito) |
| **Estabilidade** | Media | Alta (API Oficial) |
| **Fallback** | Nenhum | WuzAPI em segundo plano |

---

## Arquitetura Hibrida

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  CheckoutModal  │  │  OrderSuccess   │  │  CatalogOrdersPage      │  │
│  │                 │  │  Page           │  │  (Painel Lojista)       │  │
│  │  - Pedido       │  │                 │  │                         │  │
│  │  - Consentimento│  │  - Botao WA     │  │  - Status pedidos       │  │
│  └────────┬────────┘  │  - Link wa.me   │  │  - Botoes de acao       │  │
│           │           └────────┬────────┘  │  - Alertas 24h          │  │
│           │                    │           └────────────┬────────────┘  │
└───────────┼────────────────────┼────────────────────────┼───────────────┘
            │                    │                        │
            ▼                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Backend)                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Edge Functions                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │ whatsapp-send   │  │ whatsapp-webhook│  │ wuzapi-fallback │  │   │
│  │  │                 │  │                 │  │                 │  │   │
│  │  │ - Envia msg     │  │ - Recebe msgs   │  │ - Fallback auto │  │   │
│  │  │ - Verifica 24h  │  │ - Atualiza DB   │  │ - Usa WuzAPI    │  │   │
│  │  │ - Escolhe API   │  │ - Abre janela   │  │                 │  │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │   │
│  └───────────┼────────────────────┼────────────────────┼────────────┘   │
│              │                    │                    │                │
│  ┌───────────┼────────────────────┼────────────────────┼────────────┐   │
│  │           ▼                    ▼                    ▼            │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │                    DATABASE (PostgreSQL)                 │    │   │
│  │  │                                                          │    │   │
│  │  │  - catalog_orders (pedidos)                              │    │   │
│  │  │  - whatsapp_conversations (janelas 24h)                  │    │   │
│  │  │  - whatsapp_messages (log de mensagens)                  │    │   │
│  │  │  - companies.whatsapp_settings (config por loja)         │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
            │                                           │
            ▼                                           ▼
┌───────────────────────────┐           ┌───────────────────────────────┐
│   META CLOUD API          │           │   WUZAPI (VPS KingHost)       │
│   (API Oficial)           │           │   (Fallback)                  │
│                           │           │                               │
│   - Primario              │           │   - Secundario                │
│   - Janela 24h gratis     │           │   - Quando 24h expirou        │
│   - Templates aprovados   │           │   - Lojista sem BYOK          │
│   - 1.000 msg/mes gratis  │           │   - Emergencias               │
└───────────────────────────┘           └───────────────────────────────┘
```

### Prioridade de Envio

```
┌─────────────────────────────────────────────────────────────────┐
│  ORDEM DE PRIORIDADE PARA ENVIO DE MENSAGEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ API OFICIAL - JANELA 24H (Gratuito)                         │
│     └─ Se cliente iniciou conversa < 24h                        │
│                                                                 │
│  2️⃣ API OFICIAL - TEMPLATE (Pago ~R$ 0,045)                     │
│     └─ Se lojista tem BYOK configurado                          │
│     └─ E janela 24h expirou                                     │
│                                                                 │
│  3️⃣ WUZAPI - FALLBACK (Gratuito)                                │
│     └─ Se lojista NAO tem BYOK                                  │
│     └─ E configuracao permite fallback                          │
│                                                                 │
│  4️⃣ MANUAL - LINK WA.ME                                         │
│     └─ Se todas opcoes automaticas falharem                     │
│     └─ Lojista envia manualmente                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo do Cliente (Checkout)

### Tela de Sucesso do Pedido

Apos o cliente finalizar o pedido, exibir tela com CTA (Call to Action) para iniciar conversa:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ✅ Pedido Realizado!                         │
│                                                                 │
│         Seu pedido #ABC12345 foi recebido com sucesso.          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │   📱 Receba atualizacoes no seu WhatsApp                  │  │
│  │                                                           │  │
│  │   Clique no botao abaixo para:                            │  │
│  │   ✓ Confirmar seu pedido                                  │  │
│  │   ✓ Receber aviso quando estiver pronto                   │  │
│  │   ✓ Acompanhar a entrega em tempo real                    │  │
│  │                                                           │  │
│  │   ┌─────────────────────────────────────────────────┐     │  │
│  │   │  💬 Ativar Notificacoes no WhatsApp             │     │  │
│  │   └─────────────────────────────────────────────────┘     │  │
│  │                                                           │  │
│  │   ⚡ Voce tambem pode acompanhar pelo e-mail              │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│                      [Voltar ao Catalogo]                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Geracao do Link wa.me

```typescript
// src/utils/whatsapp.ts

export function generateWhatsAppLink(params: {
  companyPhone: string;
  customerName: string;
  orderId: string;
  orderTotal: number;
}): string {
  const { companyPhone, customerName, orderId, orderTotal } = params;

  // Mensagem padrao que o cliente enviara
  const message = `Ola! Sou ${customerName} e acabei de fazer o pedido #${orderId} no valor de R$ ${orderTotal.toFixed(2)}. Gostaria de receber atualizacoes por aqui! 📦`;

  // Formata telefone (remove caracteres especiais, adiciona 55)
  const phone = companyPhone.replace(/\D/g, '');
  const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;

  // Gera link com mensagem encoded
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
```

### Comportamento do Botao

```typescript
// src/components/checkout/OrderSuccessPage.tsx

interface OrderSuccessProps {
  order: CatalogOrder;
  company: Company;
}

export function OrderSuccessPage({ order, company }: OrderSuccessProps) {
  const [whatsappClicked, setWhatsappClicked] = useState(false);

  const whatsappLink = generateWhatsAppLink({
    companyPhone: company.phone,
    customerName: order.customer_name,
    orderId: order.id.slice(0, 8).toUpperCase(),
    orderTotal: order.total,
  });

  const handleWhatsAppClick = async () => {
    // 1. Marca que cliente clicou (otimista)
    setWhatsappClicked(true);

    // 2. Registra no banco que cliente iniciou fluxo
    await supabase.from('catalog_orders').update({
      whatsapp_initiated: true,
      whatsapp_initiated_at: new Date().toISOString(),
    }).eq('id', order.id);

    // 3. Abre WhatsApp em nova aba
    window.open(whatsappLink, '_blank');
  };

  return (
    <div className="order-success">
      {/* ... conteudo ... */}

      <button
        onClick={handleWhatsAppClick}
        className={whatsappClicked ? 'btn-success' : 'btn-primary'}
      >
        {whatsappClicked ? (
          <>✅ WhatsApp Aberto - Envie a mensagem!</>
        ) : (
          <>💬 Ativar Notificacoes no WhatsApp</>
        )}
      </button>

      {whatsappClicked && (
        <p className="text-sm text-gray-500">
          Envie a mensagem no WhatsApp para confirmar seu pedido
          e receber atualizacoes automaticas.
        </p>
      )}
    </div>
  );
}
```

---

## Fluxo do Lojista (Painel)

### Estados Visuais dos Pedidos

No painel de pedidos, cada pedido mostra o status da comunicacao WhatsApp:

```
┌─────────────────────────────────────────────────────────────────┐
│  Pedidos do Catalogo                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ #ABC123 - Joao Silva            R$ 89,90    🟢 Confirmado │  │
│  │ 📱 WhatsApp: ✅ Ativo (18h restantes)                     │  │
│  │                                                           │  │
│  │ [Marcar Entregue]  [Cancelar]                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ #DEF456 - Maria Santos          R$ 45,00    🟡 Pendente   │  │
│  │ 📱 WhatsApp: ⚠️ Janela expirada (cliente nao iniciou)     │  │
│  │                                                           │  │
│  │ [Confirmar] [Enviar WhatsApp Manual 📤] [Cancelar]        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ #GHI789 - Pedro Souza           R$ 120,00   🟡 Pendente   │  │
│  │ 📱 WhatsApp: 🔄 Fallback WuzAPI (automatico)              │  │
│  │                                                           │  │
│  │ [Confirmar]  [Cancelar]                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Alertas de Janela 24h

```typescript
// src/components/orders/WhatsAppStatusBadge.tsx

interface WhatsAppStatusBadgeProps {
  order: CatalogOrder;
  conversation: WhatsAppConversation | null;
}

export function WhatsAppStatusBadge({ order, conversation }: WhatsAppStatusBadgeProps) {
  // Calcula tempo restante da janela
  const getWindowStatus = () => {
    if (!conversation?.last_customer_message_at) {
      return { status: 'not_initiated', label: 'Cliente nao iniciou', color: 'yellow' };
    }

    const lastMessage = new Date(conversation.last_customer_message_at);
    const now = new Date();
    const hoursElapsed = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = 24 - hoursElapsed;

    if (hoursRemaining > 0) {
      return {
        status: 'active',
        label: `Ativo (${Math.floor(hoursRemaining)}h restantes)`,
        color: 'green'
      };
    } else {
      return {
        status: 'expired',
        label: 'Janela expirada',
        color: 'red'
      };
    }
  };

  const windowStatus = getWindowStatus();

  return (
    <div className={`badge badge-${windowStatus.color}`}>
      📱 WhatsApp: {windowStatus.label}
    </div>
  );
}
```

### Modal de Alerta (Janela Expirada)

Quando o lojista tenta confirmar/entregar um pedido com janela expirada:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠️ Janela de 24h Expirada                                      │
│                                                                 │
│  O cliente nao iniciou a conversa ou ja se passaram mais de     │
│  24 horas desde a ultima interacao.                             │
│                                                                 │
│  Escolha como deseja notificar o cliente:                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📤 Enviar Manualmente (Gratuito)                          │  │
│  │    Abre o WhatsApp para voce enviar a mensagem            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🤖 Enviar via WuzAPI (Automatico)                         │  │
│  │    Usa o sistema alternativo - pode haver risco           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 💳 Enviar via API Oficial (R$ 0,05)                       │  │
│  │    Usa template aprovado - 100% seguro                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ❌ Nao Notificar                                          │  │
│  │    Apenas atualiza o status no sistema                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                          [Cancelar]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hook de Verificacao de 24h

### Logica de Verificacao

```typescript
// src/services/whatsapp-window.ts

export interface WindowCheckResult {
  isOpen: boolean;
  hoursRemaining: number;
  lastCustomerMessage: Date | null;
  recommendedMethod: 'official_free' | 'official_paid' | 'wuzapi' | 'manual';
}

export async function checkWhatsAppWindow(
  orderId: string,
  companySettings: WhatsAppSettings
): Promise<WindowCheckResult> {
  // 1. Busca ultima mensagem do cliente
  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('last_customer_message_at')
    .eq('order_id', orderId)
    .single();

  // 2. Se nao ha conversa, janela nao foi aberta
  if (!conversation?.last_customer_message_at) {
    return {
      isOpen: false,
      hoursRemaining: 0,
      lastCustomerMessage: null,
      recommendedMethod: determineMethod(companySettings, false),
    };
  }

  // 3. Calcula tempo desde ultima mensagem
  const lastMessage = new Date(conversation.last_customer_message_at);
  const now = new Date();
  const hoursElapsed = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, 24 - hoursElapsed);
  const isOpen = hoursRemaining > 0;

  return {
    isOpen,
    hoursRemaining,
    lastCustomerMessage: lastMessage,
    recommendedMethod: determineMethod(companySettings, isOpen),
  };
}

function determineMethod(
  settings: WhatsAppSettings,
  windowOpen: boolean
): 'official_free' | 'official_paid' | 'wuzapi' | 'manual' {
  // Prioridade 1: Janela aberta = API Oficial gratis
  if (windowOpen && settings.official_api_enabled) {
    return 'official_free';
  }

  // Prioridade 2: BYOK configurado = API Oficial paga
  if (settings.byok_token && settings.official_api_enabled) {
    return 'official_paid';
  }

  // Prioridade 3: WuzAPI habilitado como fallback
  if (settings.wuzapi_fallback_enabled && settings.wuzapi_token) {
    return 'wuzapi';
  }

  // Prioridade 4: Manual
  return 'manual';
}
```

### Hook no Fluxo de Mudanca de Status

```typescript
// src/hooks/useOrderStatusChange.ts

export function useOrderStatusChange() {
  const [showWindowAlert, setShowWindowAlert] = useState(false);
  const [windowCheckResult, setWindowCheckResult] = useState<WindowCheckResult | null>(null);

  const changeOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    companySettings: WhatsAppSettings
  ) => {
    // 1. Verifica janela de 24h ANTES de mudar status
    const windowCheck = await checkWhatsAppWindow(orderId, companySettings);

    // 2. Se janela fechada e nao tem metodo automatico, alerta
    if (!windowCheck.isOpen && windowCheck.recommendedMethod === 'manual') {
      setWindowCheckResult(windowCheck);
      setShowWindowAlert(true);
      return; // Nao muda status ainda
    }

    // 3. Muda status
    await updateOrderStatus(orderId, newStatus);

    // 4. Envia notificacao pelo metodo recomendado
    await sendNotification(orderId, newStatus, windowCheck.recommendedMethod);
  };

  return {
    changeOrderStatus,
    showWindowAlert,
    setShowWindowAlert,
    windowCheckResult,
  };
}
```

---

## Sistema de Fallback (WuzAPI)

### Configuracao por Empresa

```typescript
// src/types/whatsapp.ts

export interface WhatsAppSettings {
  // === API Oficial ===
  official_api_enabled: boolean;
  byok_token: string | null;           // Token do lojista (BYOK)
  byok_phone_id: string | null;        // Phone Number ID do lojista
  byok_waba_id: string | null;         // WhatsApp Business Account ID

  // === WuzAPI (Fallback) ===
  wuzapi_fallback_enabled: boolean;    // Usar WuzAPI como fallback?
  wuzapi_token: string | null;         // Token da instancia no WuzAPI
  wuzapi_priority: 'always' | 'fallback' | 'never';

  // === Comportamento ===
  auto_fallback: boolean;              // Fallback automatico ou perguntar?
  notify_on_fallback: boolean;         // Avisar lojista quando usar fallback?

  // === Notificacoes (mantido) ===
  notify_on_new_order: boolean;
  notify_on_confirm: boolean;
  notify_on_complete: boolean;
  notify_on_cancel: boolean;
}
```

### Logica de Fallback

```typescript
// src/services/whatsapp-sender.ts

export async function sendWhatsAppNotification(
  order: CatalogOrder,
  messageType: MessageType,
  settings: WhatsAppSettings
): Promise<SendResult> {

  // 1. Verifica janela de 24h
  const windowCheck = await checkWhatsAppWindow(order.id, settings);

  // 2. Tenta API Oficial (se janela aberta)
  if (windowCheck.isOpen && settings.official_api_enabled) {
    try {
      const result = await sendViaOfficialAPI(order, messageType, 'session');
      return { success: true, method: 'official_free', ...result };
    } catch (error) {
      console.error('[WhatsApp] Official API (session) failed:', error);
      // Continua para fallback
    }
  }

  // 3. Tenta API Oficial com Template (se BYOK configurado)
  if (settings.byok_token && settings.official_api_enabled) {
    try {
      const result = await sendViaOfficialAPI(order, messageType, 'template');
      return { success: true, method: 'official_paid', ...result };
    } catch (error) {
      console.error('[WhatsApp] Official API (template) failed:', error);
      // Continua para fallback
    }
  }

  // 4. Tenta WuzAPI (Fallback)
  if (settings.wuzapi_fallback_enabled && settings.wuzapi_token) {
    try {
      const result = await sendViaWuzAPI(order, messageType, settings.wuzapi_token);

      // Notifica lojista se configurado
      if (settings.notify_on_fallback) {
        await notifyFallbackUsed(order.company_id, order.id);
      }

      return { success: true, method: 'wuzapi_fallback', ...result };
    } catch (error) {
      console.error('[WhatsApp] WuzAPI fallback failed:', error);
    }
  }

  // 5. Fallback final: retorna para envio manual
  return {
    success: false,
    method: 'manual_required',
    error: 'Nenhum metodo automatico disponivel',
    manualLink: generateWhatsAppLink({
      companyPhone: order.company_phone,
      customerName: order.customer_name,
      orderId: order.id,
      orderTotal: order.total,
    }),
  };
}
```

### Quando usar cada metodo

```
┌─────────────────────────────────────────────────────────────────┐
│  MATRIZ DE DECISAO DE ENVIO                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Janela 24h    BYOK      WuzAPI     Resultado                   │
│  ─────────────────────────────────────────────────────────────  │
│  ✅ Aberta     -         -          API Oficial (Gratis)        │
│  ❌ Fechada    ✅ Sim    -          API Oficial (Template)      │
│  ❌ Fechada    ❌ Nao    ✅ Sim     WuzAPI (Fallback)           │
│  ❌ Fechada    ❌ Nao    ❌ Nao     Manual (Link wa.me)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modelos de Negocio

### Opcao 1: BYOK (Bring Your Own Key) - Recomendado

O lojista configura sua propria conta na Meta e paga diretamente.

```
┌─────────────────────────────────────────────────────────────────┐
│  MODELO BYOK                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Vantagens para voce (SaaS):                                    │
│  ✅ Risco financeiro zero                                       │
│  ✅ Pode cobrar taxa de setup (R$ 49-149)                       │
│  ✅ Nao precisa gerenciar cobranca de mensagens                 │
│                                                                 │
│  Vantagens para o lojista:                                      │
│  ✅ Controle total da conta                                     │
│  ✅ 1.000 conversas gratuitas/mes                               │
│  ✅ Numero nunca sera banido (oficial)                          │
│                                                                 │
│  Desvantagens:                                                  │
│  ❌ Lojista precisa criar conta no Facebook Developers          │
│  ❌ Processo de setup mais complexo                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Opcao 2: Creditos Prepagos

Voce centraliza a conta na Meta e revende mensagens.

```
┌─────────────────────────────────────────────────────────────────┐
│  MODELO CREDITOS                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Custo Meta: ~R$ 0,045/mensagem                                 │
│  Seu preco: R$ 0,10/mensagem                                    │
│  Margem: R$ 0,055/mensagem                                      │
│                                                                 │
│  Pacotes sugeridos:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Pacote    │ Creditos │ Preco    │ Custo/msg │ Economia │   │
│  │───────────│──────────│──────────│───────────│──────────│   │
│  │ Basico    │ 100      │ R$ 10    │ R$ 0,10   │ 0%       │   │
│  │ Medio     │ 500      │ R$ 45    │ R$ 0,09   │ 10%      │   │
│  │ Avancado  │ 1.000    │ R$ 80    │ R$ 0,08   │ 20%      │   │
│  │ Premium   │ 5.000    │ R$ 350   │ R$ 0,07   │ 30%      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Opcao 3: Hibrido (Recomendado para MVP)

Combina WuzAPI gratuito + BYOK para quem quiser.

```
┌─────────────────────────────────────────────────────────────────┐
│  MODELO HIBRIDO (MVP)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Plano Gratuito:                                                │
│  - Cliente inicia conversa (wa.me)                              │
│  - Notificacoes via WuzAPI (fallback)                           │
│  - Risco de banimento informado nos termos                      │
│                                                                 │
│  Plano Pro (R$ X/mes):                                          │
│  - BYOK: lojista conecta conta oficial                          │
│  - Zero risco de banimento                                      │
│  - 1.000 conversas gratuitas/mes                                │
│  - Suporte para configuracao                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementacao Tecnica

### Webhook para Receber Mensagens (API Oficial)

```typescript
// supabase/functions/whatsapp-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Verificacao do webhook (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === Deno.env.get('WEBHOOK_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // Recebimento de mensagens (POST)
  if (req.method === 'POST') {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Processa cada entrada
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value;

          // Mensagem recebida do cliente
          if (value.messages) {
            for (const message of value.messages) {
              await processIncomingMessage(supabase, {
                from: message.from,
                text: message.text?.body || '',
                timestamp: message.timestamp,
                wabaId: value.metadata.phone_number_id,
              });
            }
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});

async function processIncomingMessage(supabase: any, message: any) {
  const { from, text, timestamp } = message;

  // 1. Busca pedido relacionado (pelo texto da mensagem ou telefone)
  const orderMatch = text.match(/pedido #?([A-Z0-9]+)/i);

  if (orderMatch) {
    const orderId = orderMatch[1];

    // 2. Atualiza/cria conversa
    await supabase.from('whatsapp_conversations').upsert({
      customer_phone: from,
      order_id: orderId,
      last_customer_message_at: new Date(parseInt(timestamp) * 1000).toISOString(),
      window_expires_at: new Date(parseInt(timestamp) * 1000 + 24 * 60 * 60 * 1000).toISOString(),
    }, {
      onConflict: 'customer_phone,order_id',
    });

    // 3. Marca pedido como conversa iniciada
    await supabase.from('catalog_orders').update({
      whatsapp_conversation_started: true,
      whatsapp_conversation_started_at: new Date().toISOString(),
    }).eq('id', orderId);

    // 4. Log da mensagem
    await supabase.from('whatsapp_messages').insert({
      order_id: orderId,
      phone: from,
      direction: 'incoming',
      message_content: text,
      received_at: new Date().toISOString(),
    });
  }
}
```

### Envio via API Oficial

```typescript
// src/services/whatsapp-official.ts

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function sendViaOfficialAPI(
  order: CatalogOrder,
  messageType: MessageType,
  method: 'session' | 'template',
  settings: { token: string; phoneId: string }
): Promise<{ messageId: string }> {
  const { token, phoneId } = settings;
  const phone = formatPhoneForWhatsApp(order.customer_phone);

  let payload: any;

  if (method === 'session') {
    // Mensagem de sessao (dentro da janela 24h) - texto livre
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        body: formatMessage(order, messageType),
      },
    };
  } else {
    // Mensagem de template (fora da janela 24h)
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: getTemplateName(messageType),
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters: getTemplateParameters(order, messageType),
          },
        ],
      },
    };
  }

  const response = await fetch(`${GRAPH_API_URL}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return { messageId: result.messages[0].id };
}

function getTemplateName(messageType: MessageType): string {
  const templates: Record<MessageType, string> = {
    order_created: 'pedido_realizado',
    order_confirmed: 'pedido_confirmado',
    order_completed: 'pedido_entregue',
    order_cancelled: 'pedido_cancelado',
  };
  return templates[messageType];
}

function getTemplateParameters(order: CatalogOrder, messageType: MessageType) {
  // Parametros variam por template
  return [
    { type: 'text', text: order.customer_name },
    { type: 'text', text: order.id.slice(0, 8).toUpperCase() },
    { type: 'text', text: `R$ ${order.total.toFixed(2)}` },
  ];
}
```

---

## Banco de Dados

### Migrations Necessarias

```sql
-- Migration: 20260125000001_whatsapp_official_api.sql

-- =====================================================
-- 1. ATUALIZAR whatsapp_settings em companies
-- =====================================================

-- Adiciona novos campos para API Oficial
COMMENT ON COLUMN companies.whatsapp_settings IS 'Configuracoes de WhatsApp (API Oficial + WuzAPI)';

-- Estrutura atualizada do JSONB:
-- {
--   // API Oficial
--   "official_api_enabled": true,
--   "byok_token": "EAAxxxx...",
--   "byok_phone_id": "123456789",
--   "byok_waba_id": "987654321",
--
--   // WuzAPI (Fallback)
--   "wuzapi_fallback_enabled": true,
--   "wuzapi_token": "loja-xxx_token_xxx",
--   "wuzapi_priority": "fallback", -- "always" | "fallback" | "never"
--
--   // Comportamento
--   "auto_fallback": true,
--   "notify_on_fallback": true,
--
--   // Notificacoes (mantido)
--   "enabled": true,
--   "notify_on_new_order": true,
--   "notify_on_confirm": true,
--   "notify_on_complete": true,
--   "notify_on_cancel": true
-- }

-- =====================================================
-- 2. TABELA DE CONVERSAS (Janela 24h)
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES catalog_orders(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,

  -- Janela de 24h
  last_customer_message_at TIMESTAMPTZ,
  window_expires_at TIMESTAMPTZ,

  -- Status
  is_window_open BOOLEAN GENERATED ALWAYS AS (
    window_expires_at > NOW()
  ) STORED,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint unica
  UNIQUE(company_id, customer_phone, order_id)
);

-- Indexes
CREATE INDEX idx_whatsapp_conv_company ON whatsapp_conversations(company_id);
CREATE INDEX idx_whatsapp_conv_order ON whatsapp_conversations(order_id);
CREATE INDEX idx_whatsapp_conv_phone ON whatsapp_conversations(customer_phone);
CREATE INDEX idx_whatsapp_conv_window ON whatsapp_conversations(window_expires_at)
  WHERE window_expires_at > NOW();

-- RLS
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view own conversations"
  ON whatsapp_conversations FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 3. ATUALIZAR TABELA DE MENSAGENS
-- =====================================================

-- Adiciona novos campos
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outgoing'
    CHECK (direction IN ('incoming', 'outgoing')),
  ADD COLUMN IF NOT EXISTS send_method TEXT
    CHECK (send_method IN ('official_free', 'official_paid', 'wuzapi', 'manual')),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 4) DEFAULT 0;

-- Index para mensagens recebidas
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction
  ON whatsapp_messages(direction);

-- =====================================================
-- 4. ATUALIZAR TABELA DE PEDIDOS
-- =====================================================

ALTER TABLE catalog_orders
  ADD COLUMN IF NOT EXISTS whatsapp_initiated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_conversation_started BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_conversation_started_at TIMESTAMPTZ;

-- Index para pedidos com conversa
CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_conv
  ON catalog_orders(whatsapp_conversation_started)
  WHERE whatsapp_conversation_started = TRUE;

-- =====================================================
-- 5. TABELA DE CREDITOS (Para modelo de creditos)
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Saldo
  balance DECIMAL(10, 2) DEFAULT 0,

  -- Limites
  low_balance_alert DECIMAL(10, 2) DEFAULT 5.00,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id)
);

-- Historico de transacoes
CREATE TABLE IF NOT EXISTS whatsapp_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Transacao
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,

  -- Referencia
  message_id UUID REFERENCES whatsapp_messages(id),
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_credit_trans_company ON whatsapp_credit_transactions(company_id);
CREATE INDEX idx_credit_trans_created ON whatsapp_credit_transactions(created_at DESC);

-- RLS
ALTER TABLE whatsapp_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_credit_transactions ENABLE ROW LEVEL SECURITY;
```

---

## Templates da Meta

### Templates para Aprovacao

Os templates abaixo devem ser cadastrados no Facebook Business Manager:

#### 1. pedido_realizado

```
Nome: pedido_realizado
Categoria: UTILITY
Idioma: pt_BR

Cabecalho: Nenhum
Corpo:
Ola {{1}}! 👋

Recebemos seu pedido #{{2}} no valor de {{3}}.

Estamos processando e logo te avisamos aqui!

Rodape: Nenhum
Botoes: Nenhum
```

#### 2. pedido_confirmado

```
Nome: pedido_confirmado
Categoria: UTILITY
Idioma: pt_BR

Cabecalho: Nenhum
Corpo:
Boas noticias, {{1}}! 🎉

Seu pedido #{{2}} foi CONFIRMADO e ja esta em preparacao.

Valor: {{3}}

Voce sera avisado quando estiver pronto!

Rodape: Nenhum
Botoes: Nenhum
```

#### 3. pedido_entregue

```
Nome: pedido_entregue
Categoria: UTILITY
Idioma: pt_BR

Cabecalho: Nenhum
Corpo:
{{1}}, seu pedido chegou! 📦✅

Pedido #{{2}} foi ENTREGUE/FINALIZADO.

Valor: {{3}}

Obrigado pela preferencia! Esperamos ve-lo novamente.

Rodape: Nenhum
Botoes: Nenhum
```

#### 4. pedido_cancelado

```
Nome: pedido_cancelado
Categoria: UTILITY
Idioma: pt_BR

Cabecalho: Nenhum
Corpo:
Ola {{1}},

Infelizmente seu pedido #{{2}} foi CANCELADO.

{{3}}

Entre em contato se tiver duvidas.

Rodape: Nenhum
Botoes: Nenhum
```

---

## Custos e Economia

### Comparativo de Cenarios

```
┌─────────────────────────────────────────────────────────────────┐
│  CENARIO: 500 pedidos/mes, 3 mensagens por pedido               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MODELO ATUAL (WuzAPI apenas):                                  │
│  - Custo: R$ 0 (VPS ja paga)                                    │
│  - Risco: Banimento do numero                                   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  MODELO HIBRIDO (Cliente inicia + WuzAPI fallback):             │
│                                                                 │
│  Supondo 70% dos clientes clicam no botao:                      │
│  - 350 pedidos: Cliente iniciou → Janela 24h → R$ 0             │
│  - 150 pedidos: Cliente nao iniciou → WuzAPI fallback → R$ 0    │
│                                                                 │
│  Custo total: R$ 0                                              │
│  Risco: Reduzido (70% via fluxo oficial)                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  MODELO HIBRIDO COM BYOK (Sem WuzAPI):                          │
│                                                                 │
│  Supondo 70% dos clientes clicam no botao:                      │
│  - 350 pedidos x 3 msgs: Janela 24h → R$ 0 (1.000 gratis)       │
│  - 150 pedidos x 3 msgs = 450 msgs: Template → R$ 20,25         │
│                                                                 │
│  Custo total: ~R$ 20/mes                                        │
│  Risco: Zero (100% oficial)                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Economia por Volume

| Pedidos/mes | Clientes que clicam (70%) | Via Janela 24h | Via Template | Custo Mensal |
|-------------|---------------------------|----------------|--------------|--------------|
| 100 | 70 | 210 msgs (gratis) | 90 msgs | ~R$ 4 |
| 500 | 350 | 1.050 msgs (gratis) | 450 msgs | ~R$ 20 |
| 1.000 | 700 | 2.100 msgs (gratis) | 900 msgs | ~R$ 40 |
| 2.000 | 1.400 | 4.200 msgs (gratis) | 1.800 msgs | ~R$ 80 |

> **Nota:** A Meta oferece 1.000 conversas de servico gratuitas/mes. Se o cliente inicia, a conversa inteira (multiplas mensagens) conta como 1 conversa.

---

## Roadmap de Implementacao

### Fase 1: Preparacao (1-2 dias)

- [ ] Criar migration para novos campos no banco
- [ ] Atualizar interface `WhatsAppSettings`
- [ ] Criar tabela `whatsapp_conversations`
- [ ] Atualizar tabela `catalog_orders` com campos de conversa

### Fase 2: Fluxo do Cliente (2-3 dias)

- [ ] Criar componente `OrderSuccessPage` com botao WhatsApp
- [ ] Implementar geracao de link wa.me com mensagem padrao
- [ ] Registrar quando cliente clica no botao
- [ ] Criar/atualizar pagina de sucesso do checkout

### Fase 3: Webhook e Janela 24h (2-3 dias)

- [ ] Criar Edge Function `whatsapp-webhook`
- [ ] Implementar processamento de mensagens recebidas
- [ ] Atualizar tabela de conversas com timestamp
- [ ] Implementar calculo de janela de 24h

### Fase 4: Hook de Verificacao (1-2 dias)

- [ ] Criar servico `whatsapp-window.ts`
- [ ] Implementar `checkWhatsAppWindow()`
- [ ] Criar hook `useOrderStatusChange`
- [ ] Implementar modal de alerta para janela expirada

### Fase 5: Sistema de Fallback (2-3 dias)

- [ ] Criar servico `whatsapp-sender.ts` unificado
- [ ] Implementar logica de prioridade de envio
- [ ] Integrar WuzAPI como fallback
- [ ] Adicionar logs e notificacoes de fallback

### Fase 6: Interface do Lojista (2-3 dias)

- [ ] Criar `WhatsAppStatusBadge` para pedidos
- [ ] Atualizar `CatalogOrdersPage` com status de conversa
- [ ] Implementar botoes de acao manual
- [ ] Criar configuracoes de WhatsApp atualizadas

### Fase 7: API Oficial (3-5 dias)

- [ ] Criar Edge Function `whatsapp-send`
- [ ] Implementar envio via Graph API
- [ ] Criar fluxo BYOK (configuracao do lojista)
- [ ] Cadastrar templates na Meta
- [ ] Testar aprovacao de templates

### Fase 8: Testes e Ajustes (2-3 dias)

- [ ] Testar fluxo completo (cliente → lojista)
- [ ] Testar fallback WuzAPI
- [ ] Testar expiracao de janela 24h
- [ ] Ajustar UX baseado em feedback
- [ ] Documentar fluxos para lojistas

---

## Proximos Passos Imediatos

1. **Aprovar este planejamento** - Revisar e ajustar conforme necessario
2. **Decidir modelo de negocio** - BYOK, Creditos ou Hibrido?
3. **Criar conta de teste na Meta** - Para testar API Oficial
4. **Iniciar Fase 1** - Migrations e preparacao do banco

---

## Referencias

- [WhatsApp Business Platform - Documentacao](https://developers.facebook.com/docs/whatsapp)
- [Cloud API - Envio de Mensagens](https://developers.facebook.com/docs/whatsapp/cloud-api/messages)
- [Webhooks - Recebimento de Mensagens](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Templates - Criacao e Aprovacao](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Precos - Modelo de Cobranca](https://developers.facebook.com/docs/whatsapp/pricing)
- [WuzAPI - Documentacao](https://github.com/asternic/wuzapi)

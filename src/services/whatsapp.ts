// WuzAPI Configuration
const WUZAPI_URL = import.meta.env.VITE_WUZAPI_URL || 'https://evertonapi.vps-kinghost.net';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Constants
const API_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds (quick check)
const QR_CODE_TIMEOUT = 15000; // 15 seconds for QR code
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper: Fetch with timeout
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

// Helper: Fetch with retry for transient errors
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES,
  timeout: number = API_TIMEOUT
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      // Retry on 500 errors (server errors like SQLite issues)
      if (response.status >= 500 && attempt < maxRetries - 1) {
        console.warn(`[WhatsApp] Server error ${response.status}, retrying... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort (timeout)
      if ((error as Error).name === 'AbortError') {
        throw new Error('Timeout: API nao respondeu a tempo');
      }

      // Retry on network errors
      if (attempt < maxRetries - 1) {
        console.warn(`[WhatsApp] Network error, retrying... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Erro desconhecido na requisicao');
}

// Types
export interface ConnectionState {
  state: 'open' | 'close' | 'connecting';
}

export interface QRCodeResponse {
  base64: string;
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
  provider: 'wuzapi';
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

// Default settings
export const defaultWhatsAppSettings: WhatsAppSettings = {
  enabled: false,
  provider: 'wuzapi',
  user_token: '',
  connected: false,
  connected_at: null,
  phone: null,
  phone_name: null,
  notify_on_new_order: true,
  notify_on_confirm: true,
  notify_on_complete: true,
  notify_on_cancel: true,
};

// Helper to generate DETERMINISTIC user token from company slug
// This prevents creating multiple users for the same company
export function generateUserToken(companySlug: string): string {
  // Create a simple hash from the slug to make it unique but deterministic
  let hash = 0;
  const str = `ejym_${companySlug}_wuzapi_token`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hashStr = Math.abs(hash).toString(36);
  return `${companySlug}_token_${hashStr}`;
}

// Helper to format phone number for WhatsApp
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove tudo que nao for numero
  let cleaned = phone.replace(/\D/g, '');

  // Adiciona 55 se nao tiver codigo do pais
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

// ==================== EDGE FUNCTION CALLS (SECURE) ====================

// Helper to get Firebase ID Token for edge function auth
async function getFirebaseIdToken(): Promise<string | null> {
  try {
    // Import Firebase auth dynamically to avoid circular dependencies
    const { auth } = await import('./firebase');
    const user = auth.currentUser;
    if (!user) {
      console.error('[WhatsApp] No Firebase user logged in');
      return null;
    }
    return await user.getIdToken();
  } catch (error) {
    console.error('[WhatsApp] Error getting Firebase ID token:', error);
    return null;
  }
}

// Call edge function with Firebase auth
async function callEdgeFunction(action: string, data: Record<string, unknown> = {}): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  try {
    const idToken = await getFirebaseIdToken();
    if (!idToken) {
      console.error('[WhatsApp] No Firebase ID token available');
      return { success: false, error: 'Usuario nao autenticado' };
    }

    const url = `${SUPABASE_URL}/functions/v1/wuzapi-admin`;
    console.log('[WhatsApp] Calling edge function:', url, 'action:', action);

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action, ...data }),
      },
      API_TIMEOUT
    );

    const result = await response.json();
    console.log('[WhatsApp] Edge function response:', response.status, result);

    if (!response.ok) {
      return { success: false, error: result?.error || 'Erro na requisicao' };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[WhatsApp] Edge function error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro de conexao',
    };
  }
}

// Create user for a company in WuzAPI via edge function (SECURE)
export async function createUser(companySlug: string, userToken: string): Promise<{ success: boolean; error?: string }> {
  const result = await callEdgeFunction('create-user', { companySlug, userToken });
  return { success: result.success, error: result.error };
}

// List all users via edge function (SECURE - requires admin)
export async function listAllUsers(): Promise<{ success: boolean; users: WuzAPIUser[]; error?: string }> {
  const result = await callEdgeFunction('list-users');

  if (!result.success) {
    return { success: false, users: [], error: result.error };
  }

  const data = result.data as { users?: WuzAPIUser[] };
  return { success: true, users: data?.users || [] };
}

// Delete user by ID via edge function (SECURE - requires admin)
export async function deleteUserById(userId: string): Promise<boolean> {
  const result = await callEdgeFunction('delete-user', { userId });
  return result.success;
}

// Delete user by slug (finds the user first, then deletes by ID)
export async function deleteUser(companySlug: string): Promise<boolean> {
  try {
    // First, find the user to get the ID
    const { success, users } = await listAllUsers();
    if (!success) return false;

    const user = users.find(u => u.name === `ejym-${companySlug}`);
    if (!user) return false;

    return await deleteUserById(user.id);
  } catch (error) {
    console.error('[WhatsApp] Error deleting user:', error);
    return false;
  }
}

// ==================== DIRECT WUZAPI CALLS (USER TOKEN) ====================

// Connect session (required before getting QR code)
export async function connectSession(userToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetchWithRetry(`${WUZAPI_URL}/session/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': userToken,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error || 'Erro ao conectar sessao' };
    }

    return { success: true };
  } catch (error) {
    console.error('[WhatsApp] Error connecting session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro de conexao com a API';
    return { success: false, error: errorMessage };
  }
}

// Get connection state
export async function getConnectionState(userToken: string): Promise<ConnectionState> {
  try {
    const response = await fetchWithTimeout(`${WUZAPI_URL}/session/status`, {
      headers: { 'Token': userToken },
    }, 10000); // 10 second timeout for status check

    if (!response.ok) {
      return { state: 'close' };
    }

    const data = await response.json();
    if (data?.data?.loggedIn) {
      return { state: 'open' };
    } else if (data?.data?.connected) {
      return { state: 'connecting' };
    }
    return { state: 'close' };
  } catch (error) {
    console.error('[WhatsApp] Error getting connection state:', error);
    return { state: 'close' };
  }
}

// Get QR Code for connection (with retry)
export async function getQRCode(userToken: string): Promise<QRCodeResponse | null> {
  try {
    const response = await fetchWithRetry(
      `${WUZAPI_URL}/session/qr`,
      { headers: { 'Token': userToken } },
      MAX_RETRIES,
      QR_CODE_TIMEOUT
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data?.data?.QRCode) {
      return { base64: data.data.QRCode };
    }
    return null;
  } catch (error) {
    console.error('[WhatsApp] Error getting QR code:', error);
    return null;
  }
}

// Get session status with QR code
export async function getSessionStatus(userToken: string): Promise<{
  connected: boolean;
  loggedIn: boolean;
  qrcode: string | null;
  jid: string | null;
  name: string | null;
}> {
  try {
    const response = await fetchWithRetry(
      `${WUZAPI_URL}/session/status`,
      { headers: { 'Token': userToken } },
      2, // fewer retries for status
      10000
    );

    if (!response.ok) {
      return { connected: false, loggedIn: false, qrcode: null, jid: null, name: null };
    }

    const data = await response.json();
    return {
      connected: data?.data?.connected || false,
      loggedIn: data?.data?.loggedIn || false,
      qrcode: data?.data?.qrcode || null,
      jid: data?.data?.jid || null,
      name: data?.data?.name || null,
    };
  } catch (error) {
    console.error('[WhatsApp] Error getting session status:', error);
    return { connected: false, loggedIn: false, qrcode: null, jid: null, name: null };
  }
}

// Disconnect WhatsApp (logout)
export async function disconnectSession(userToken: string): Promise<boolean> {
  try {
    const response = await fetchWithRetry(`${WUZAPI_URL}/session/logout`, {
      method: 'POST',
      headers: { 'Token': userToken },
    });

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp] Error disconnecting session:', error);
    return false;
  }
}

// Check if phone number exists on WhatsApp and get the correct JID
export async function checkPhoneOnWhatsApp(
  userToken: string,
  phone: string
): Promise<{ exists: boolean; jid: string | null; verifiedName: string | null }> {
  const formattedPhone = formatPhoneForWhatsApp(phone);

  try {
    const response = await fetchWithRetry(`${WUZAPI_URL}/user/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': userToken,
      },
      body: JSON.stringify({
        Phone: [formattedPhone],
      }),
    });

    if (!response.ok) {
      return { exists: false, jid: null, verifiedName: null };
    }

    const data = await response.json();
    const user = data?.data?.Users?.[0];

    if (user?.IsInWhatsapp) {
      // Extract just the phone number from JID (remove @s.whatsapp.net)
      const jidPhone = user.JID?.split('@')[0] || null;
      return {
        exists: true,
        jid: jidPhone,
        verifiedName: user.VerifiedName || null,
      };
    }

    return { exists: false, jid: null, verifiedName: null };
  } catch (error) {
    console.error('[WhatsApp] Error checking phone:', error);
    return { exists: false, jid: null, verifiedName: null };
  }
}

// Send text message
export async function sendTextMessage(
  userToken: string,
  phone: string,
  message: string
): Promise<SendMessageResult> {
  try {
    // IMPORTANT: First verify the session is connected
    const connectionState = await getConnectionState(userToken);
    if (connectionState.state !== 'open') {
      return {
        success: false,
        error: 'WhatsApp nao esta conectado. Reconecte na pagina de Configuracoes.',
      };
    }

    // Check if the phone exists on WhatsApp and get the correct JID
    const checkResult = await checkPhoneOnWhatsApp(userToken, phone);

    if (!checkResult.exists || !checkResult.jid) {
      return {
        success: false,
        error: 'Numero nao encontrado no WhatsApp',
      };
    }

    // Use the correct JID returned by WhatsApp - with retry for transient errors
    const response = await fetchWithRetry(`${WUZAPI_URL}/chat/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': userToken,
      },
      body: JSON.stringify({
        Phone: checkResult.jid,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData?.error || 'Erro ao enviar mensagem',
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data?.data?.Id || data?.data?.id,
    };
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro de conexao com a API';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Check if WuzAPI is reachable (quick health check)
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${WUZAPI_URL}/health`,
      { method: 'GET' },
      HEALTH_CHECK_TIMEOUT
    );
    return response.ok;
  } catch (error) {
    // Try root endpoint as fallback
    try {
      const response = await fetchWithTimeout(
        `${WUZAPI_URL}/`,
        { method: 'GET' },
        HEALTH_CHECK_TIMEOUT
      );
      return response.ok;
    } catch {
      console.error('[WhatsApp] API health check failed:', error);
      return false;
    }
  }
}

// ==================== ADMIN TYPES ====================

export interface WuzAPIUser {
  id: string;
  name: string;
  token: string;
}

export interface WuzAPIUserStatus {
  name: string;
  token: string;
  connected: boolean;
  loggedIn: boolean;
  jid: string | null;
  phone: string | null;
  phoneName: string | null;
}

// Get status for a specific user (uses user token directly)
export async function getUserStatus(userToken: string): Promise<WuzAPIUserStatus | null> {
  try {
    const response = await fetchWithRetry(
      `${WUZAPI_URL}/session/status`,
      { headers: { 'Token': userToken } },
      2,
      10000
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const jid = data?.data?.jid || null;

    return {
      name: '',
      token: userToken,
      connected: data?.data?.connected || false,
      loggedIn: data?.data?.loggedIn || false,
      jid: jid,
      phone: jid ? jid.split('@')[0] : null,
      phoneName: data?.data?.name || null,
    };
  } catch (error) {
    console.error('[WhatsApp] Error getting user status:', error);
    return null;
  }
}

// Force reconnect a session
export async function forceReconnect(userToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First disconnect
    await fetchWithTimeout(`${WUZAPI_URL}/session/logout`, {
      method: 'POST',
      headers: { 'Token': userToken },
    }, 10000);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Then reconnect
    const response = await fetchWithRetry(`${WUZAPI_URL}/session/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': userToken,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return { success: false, error: 'Erro ao reconectar' };
    }

    return { success: true };
  } catch (error) {
    console.error('[WhatsApp] Error forcing reconnect:', error);
    return { success: false, error: 'Erro de conexao' };
  }
}

// Get API URL for display
export function getApiUrl(): string {
  return WUZAPI_URL;
}

// ==================== MESSAGE FORMATTING ====================

// Discount info for messages
export interface OrderDiscountInfo {
  subtotal: number;
  couponCode?: string;
  couponDiscount?: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  promotionDiscount?: number;
  promotionNames?: string[];
}

// Format order message for customer
export function formatOrderMessageForCustomer(
  customerName: string,
  companyName: string,
  orderId: string,
  items: Array<{ quantity: number; product_name: string; subtotal: number }>,
  total: number,
  messageType: 'created' | 'confirmed' | 'completed' | 'cancelled',
  cancellationReason?: string,
  discountInfo?: OrderDiscountInfo
): string {
  const itemsList = items
    .map((item) => `  - ${item.quantity}x ${item.product_name}: R$ ${item.subtotal.toFixed(2)}`)
    .join('\n');

  const orderNumber = orderId.slice(0, 8).toUpperCase();

  // Build discount section
  const discountLines: string[] = [];
  if (discountInfo) {
    if (discountInfo.couponCode && discountInfo.couponDiscount && discountInfo.couponDiscount > 0) {
      discountLines.push(`  Cupom (${discountInfo.couponCode}): -R$ ${discountInfo.couponDiscount.toFixed(2)}`);
    }
    if (discountInfo.pointsUsed && discountInfo.pointsDiscount && discountInfo.pointsDiscount > 0) {
      discountLines.push(`  Pontos (${discountInfo.pointsUsed} pts): -R$ ${discountInfo.pointsDiscount.toFixed(2)}`);
    }
    if (discountInfo.promotionDiscount && discountInfo.promotionDiscount > 0) {
      const promoName = discountInfo.promotionNames?.join(', ') || 'Promocao';
      discountLines.push(`  ${promoName}: -R$ ${discountInfo.promotionDiscount.toFixed(2)}`);
    }
  }

  const hasDiscounts = discountLines.length > 0;
  const discountSection = hasDiscounts
    ? `\n*Subtotal:* R$ ${discountInfo!.subtotal.toFixed(2)}\n*Descontos:*\n${discountLines.join('\n')}\n`
    : '';

  switch (messageType) {
    case 'created':
      return `Ola ${customerName}!

Recebemos seu pedido na *${companyName}*!

*Pedido #${orderNumber}*
${itemsList}
${discountSection}
*Total: R$ ${total.toFixed(2)}*

Aguarde a confirmacao da loja.
Voce sera notificado quando o pedido for confirmado!`;

    case 'confirmed':
      return `Ola ${customerName}!

Seu pedido na *${companyName}* foi *CONFIRMADO*!

*Pedido #${orderNumber}*
*Total: R$ ${total.toFixed(2)}*

Estamos preparando seu pedido.
Voce sera notificado quando estiver pronto!`;

    case 'completed':
      return `Ola ${customerName}!

Seu pedido na *${companyName}* foi *ENTREGUE/FINALIZADO*!

*Pedido #${orderNumber}*
*Total: R$ ${total.toFixed(2)}*

Obrigado pela preferencia!
Esperamos ve-lo novamente em breve.`;

    case 'cancelled':
      return `Ola ${customerName},

Infelizmente seu pedido na *${companyName}* foi *CANCELADO*.

*Pedido #${orderNumber}*

${cancellationReason ? `Motivo: ${cancellationReason}` : ''}

Entre em contato conosco se tiver duvidas.`;

    default:
      return '';
  }
}

// Format order message for company
export function formatOrderMessageForCompany(
  customerName: string,
  customerPhone: string,
  items: Array<{ quantity: number; product_name: string; subtotal: number }>,
  total: number,
  notes?: string,
  discountInfo?: OrderDiscountInfo
): string {
  const itemsList = items
    .map((item) => `  - ${item.quantity}x ${item.product_name}: R$ ${item.subtotal.toFixed(2)}`)
    .join('\n');

  // Build discount section
  const discountLines: string[] = [];
  if (discountInfo) {
    if (discountInfo.couponCode && discountInfo.couponDiscount && discountInfo.couponDiscount > 0) {
      discountLines.push(`  Cupom (${discountInfo.couponCode}): -R$ ${discountInfo.couponDiscount.toFixed(2)}`);
    }
    if (discountInfo.pointsUsed && discountInfo.pointsDiscount && discountInfo.pointsDiscount > 0) {
      discountLines.push(`  Pontos (${discountInfo.pointsUsed} pts): -R$ ${discountInfo.pointsDiscount.toFixed(2)}`);
    }
    if (discountInfo.promotionDiscount && discountInfo.promotionDiscount > 0) {
      const promoName = discountInfo.promotionNames?.join(', ') || 'Promocao';
      discountLines.push(`  ${promoName}: -R$ ${discountInfo.promotionDiscount.toFixed(2)}`);
    }
  }

  const hasDiscounts = discountLines.length > 0;
  const discountSection = hasDiscounts
    ? `\n*Subtotal:* R$ ${discountInfo!.subtotal.toFixed(2)}\n*Descontos:*\n${discountLines.join('\n')}\n`
    : '';

  return `*NOVO PEDIDO!*

*Cliente:* ${customerName}
*Telefone:* ${customerPhone}

*Itens:*
${itemsList}
${discountSection}
*Total: R$ ${total.toFixed(2)}*

${notes ? `*Obs:* ${notes}` : ''}

Acesse o painel para confirmar o pedido.`;
}

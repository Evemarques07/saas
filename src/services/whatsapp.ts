// WuzAPI Service - todas as chamadas passam pela Edge Function wuzapi-admin (seguro)
// Nenhuma chamada direta ao WuzAPI a partir do browser

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Constants
const API_TIMEOUT = 30000;
const QR_CODE_TIMEOUT = 15000;

// Helper: Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
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

// Helper to format phone number for WhatsApp
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

// ==================== EDGE FUNCTION PROXY ====================

// Helper to get Supabase access token
async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const { supabaseGetAccessToken } = await import('./supabase');
    const token = await supabaseGetAccessToken();
    return token || null;
  } catch {
    return null;
  }
}

// Call edge function with Supabase auth
async function callEdgeFunction(action: string, data: Record<string, unknown> = {}, timeout: number = API_TIMEOUT): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const accessToken = await getSupabaseAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Usuario nao autenticado' };
    }

    const url = `${SUPABASE_URL}/functions/v1/wuzapi-admin`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, ...data }),
      },
      timeout
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result?.error || 'Erro na requisicao' };
    }

    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? (error.name === 'AbortError' ? 'Timeout: API nao respondeu a tempo' : error.message)
      : 'Erro de conexao';
    return { success: false, error: errorMessage };
  }
}

// ==================== ADMIN ACTIONS ====================

// Create user for a company
export async function createUser(companySlug: string, userToken: string): Promise<{ success: boolean; error?: string }> {
  const result = await callEdgeFunction('create-user', { companySlug, userToken });
  return { success: result.success, error: result.error };
}

// List all users (admin only)
export async function listAllUsers(): Promise<{ success: boolean; users: WuzAPIUser[]; error?: string }> {
  const result = await callEdgeFunction('list-users');
  if (!result.success) return { success: false, users: [], error: result.error };
  return { success: true, users: (result.data as { users?: WuzAPIUser[] })?.users || [] };
}

// Delete user by ID (admin only)
export async function deleteUserById(userId: string): Promise<boolean> {
  const result = await callEdgeFunction('delete-user', { userId });
  return result.success;
}

// Delete user by slug
export async function deleteUser(companySlug: string): Promise<boolean> {
  try {
    const { success, users } = await listAllUsers();
    if (!success) return false;
    const user = users.find(u => u.name === `ejym-${companySlug}`);
    if (!user) return false;
    return await deleteUserById(user.id);
  } catch {
    return false;
  }
}

// ==================== SESSION ACTIONS ====================

// Check API health
export async function checkApiHealth(): Promise<boolean> {
  const result = await callEdgeFunction('health-check', {}, 10000);
  return result.success && !!(result.data as { online?: boolean })?.online;
}

// Connect session
export async function connectSession(userToken: string): Promise<{ success: boolean; error?: string }> {
  const result = await callEdgeFunction('connect-session', { userToken });
  return { success: result.success, error: result.error };
}

// Disconnect session
export async function disconnectSession(userToken: string): Promise<boolean> {
  const result = await callEdgeFunction('disconnect-session', { userToken });
  return result.success;
}

// Get QR Code
export async function getQRCode(userToken: string): Promise<QRCodeResponse | null> {
  const result = await callEdgeFunction('get-qr', { userToken }, QR_CODE_TIMEOUT);
  if (!result.success) return null;
  const qrCode = (result.data as { qrCode?: string })?.qrCode;
  return qrCode ? { base64: qrCode } : null;
}

// Get session status
export async function getSessionStatus(userToken: string): Promise<{
  connected: boolean;
  loggedIn: boolean;
  qrcode: string | null;
  jid: string | null;
  name: string | null;
}> {
  const result = await callEdgeFunction('get-session-status', { userToken }, 15000);
  if (!result.success) {
    return { connected: false, loggedIn: false, qrcode: null, jid: null, name: null };
  }
  const status = (result.data as { status?: Record<string, unknown> })?.status;
  return {
    connected: (status?.connected as boolean) || false,
    loggedIn: (status?.loggedIn as boolean) || false,
    qrcode: (status?.qrcode as string) || null,
    jid: (status?.jid as string) || null,
    name: (status?.name as string) || null,
  };
}

// Get connection state
export async function getConnectionState(userToken: string): Promise<ConnectionState> {
  const status = await getSessionStatus(userToken);
  if (status.loggedIn) return { state: 'open' };
  if (status.connected) return { state: 'connecting' };
  return { state: 'close' };
}

// Get user status (for admin page)
export async function getUserStatus(userToken: string): Promise<WuzAPIUserStatus | null> {
  const result = await callEdgeFunction('get-user-status', { userToken }, 15000);
  if (!result.success) return null;

  const status = (result.data as { status?: Record<string, unknown> })?.status;
  return {
    name: '',
    token: userToken,
    connected: (status?.connected as boolean) || false,
    loggedIn: (status?.loggedIn as boolean) || false,
    jid: (status?.jid as string) || null,
    phone: (status?.phone as string) || null,
    phoneName: (status?.name as string) || null,
  };
}

// Check if phone exists on WhatsApp
export async function checkPhoneOnWhatsApp(
  userToken: string,
  phone: string
): Promise<{ exists: boolean; jid: string | null; verifiedName: string | null }> {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const result = await callEdgeFunction('check-phone', { userToken, phone: formattedPhone });

  if (!result.success) return { exists: false, jid: null, verifiedName: null };

  const data = result.data as { exists?: boolean; jid?: string; verifiedName?: string };
  return {
    exists: data?.exists || false,
    jid: data?.jid || null,
    verifiedName: data?.verifiedName || null,
  };
}

// Send text message
export async function sendTextMessage(
  userToken: string,
  phone: string,
  message: string
): Promise<SendMessageResult> {
  // Verify connection first
  const connectionState = await getConnectionState(userToken);
  if (connectionState.state !== 'open') {
    return { success: false, error: 'WhatsApp nao esta conectado. Reconecte na pagina de Configuracoes.' };
  }

  // Check phone on WhatsApp
  const checkResult = await checkPhoneOnWhatsApp(userToken, phone);
  if (!checkResult.exists || !checkResult.jid) {
    return { success: false, error: 'Numero nao encontrado no WhatsApp' };
  }

  const result = await callEdgeFunction('send-text', {
    userToken, phone: checkResult.jid, message,
  });

  if (!result.success) return { success: false, error: result.error };
  return { success: true, messageId: (result.data as { messageId?: string })?.messageId };
}

// Send image message
export async function sendImageMessage(
  userToken: string,
  phone: string,
  imageBase64: string,
  caption?: string
): Promise<SendMessageResult> {
  // Verify connection first
  const connectionState = await getConnectionState(userToken);
  if (connectionState.state !== 'open') {
    return { success: false, error: 'WhatsApp nao esta conectado. Reconecte na pagina de Configuracoes.' };
  }

  // Check phone on WhatsApp
  const checkResult = await checkPhoneOnWhatsApp(userToken, phone);
  if (!checkResult.exists || !checkResult.jid) {
    return { success: false, error: 'Numero nao encontrado no WhatsApp' };
  }

  // Ensure image has proper data URI prefix
  let imageData = imageBase64;
  if (!imageData.startsWith('data:image')) {
    imageData = `data:image/png;base64,${imageData}`;
  }

  const result = await callEdgeFunction('send-image', {
    userToken, phone: checkResult.jid, image: imageData, caption,
  });

  if (!result.success) return { success: false, error: result.error };
  return { success: true, messageId: (result.data as { messageId?: string })?.messageId };
}

// Force reconnect a session
export async function forceReconnect(userToken: string): Promise<{ success: boolean; error?: string }> {
  await disconnectSession(userToken);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return await connectSession(userToken);
}

// Get API URL for display (now returns edge function URL)
export function getApiUrl(): string {
  return import.meta.env.VITE_WUZAPI_DISPLAY_URL || `${SUPABASE_URL}/functions/v1/wuzapi-admin`;
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

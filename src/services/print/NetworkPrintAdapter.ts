/**
 * Network Print Adapter
 * Handles printing to thermal printers via network (IP:Port)
 * Uses Edge Function as proxy for raw TCP connections (browsers can't do raw TCP)
 */

import { supabaseGetAccessToken } from '../supabase';

// ============================================
// Types
// ============================================

export interface NetworkPrinterConfig {
  ip: string;
  port: number;
  timeout_ms?: number;
}

export interface NetworkPrintResult {
  success: boolean;
  error?: string;
  bytes_sent?: number;
  connection_time_ms?: number;
}

// ============================================
// Constants
// ============================================

// Edge Function URL - uses environment variable for Supabase URL
const getProxyUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }
  return `${supabaseUrl}/functions/v1/print-proxy`;
};

// Default timeout for network operations
const DEFAULT_TIMEOUT_MS = 5000;

// ============================================
// Helper Functions
// ============================================

/**
 * Convert Uint8Array to base64 string
 * Required for sending binary data via JSON
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Validate IPv4 address format
 */
function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  const parts = ip.split('.').map(Number);
  return parts.every(part => part >= 0 && part <= 255);
}

// ============================================
// Public API
// ============================================

/**
 * Check if network printing is available
 * Network printing requires server-side proxy, so it's available if browser is online
 */
export function isNetworkPrintingAvailable(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Validate printer configuration
 */
export function validateConfig(config: Partial<NetworkPrinterConfig>): {
  valid: boolean;
  error?: string;
} {
  if (!config.ip) {
    return { valid: false, error: 'Endereco IP e obrigatorio' };
  }

  if (!isValidIPv4(config.ip)) {
    return { valid: false, error: 'Formato de IP invalido (ex: 192.168.1.100)' };
  }

  // Check if it's a private IP range
  const isPrivate =
    config.ip.startsWith('192.168.') ||
    config.ip.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(config.ip) ||
    config.ip.startsWith('127.');

  if (!isPrivate) {
    return { valid: false, error: 'Apenas IPs de rede local sao permitidos' };
  }

  if (config.port !== undefined) {
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      return { valid: false, error: 'Porta invalida (1-65535)' };
    }
  }

  return { valid: true };
}

/**
 * Test connection to a network printer
 */
export async function testConnection(
  config: NetworkPrinterConfig
): Promise<NetworkPrintResult> {
  const { ip, port, timeout_ms = DEFAULT_TIMEOUT_MS } = config;

  // Validate config first
  const validation = validateConfig(config);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Get auth token
    const accessToken = await supabaseGetAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Usuario nao autenticado' };
    }

    console.log('[NetworkPrintAdapter] Testing connection to', ip, ':', port);

    // Call Edge Function
    const response = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'test-connection',
        ip,
        port,
        timeout_ms,
      }),
    });

    const result: NetworkPrintResult = await response.json();

    if (result.success) {
      console.log('[NetworkPrintAdapter] Connection successful in', result.connection_time_ms, 'ms');
    } else {
      console.error('[NetworkPrintAdapter] Connection failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[NetworkPrintAdapter] Test connection error:', error);

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Erro de rede. Verifique sua conexao com a internet.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao testar conexao',
    };
  }
}

/**
 * Send data to network printer
 */
export async function printData(
  data: Uint8Array,
  config: NetworkPrinterConfig
): Promise<NetworkPrintResult> {
  const { ip, port, timeout_ms = DEFAULT_TIMEOUT_MS } = config;

  // Validate input
  if (!data || data.length === 0) {
    return { success: false, error: 'Nenhum dado para imprimir' };
  }

  // Validate config
  const validation = validateConfig(config);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Get auth token
    const accessToken = await supabaseGetAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Usuario nao autenticado' };
    }

    // Convert binary data to base64 for JSON transport
    const base64Data = uint8ArrayToBase64(data);

    console.log('[NetworkPrintAdapter] Sending', data.length, 'bytes to', ip, ':', port);

    // Call Edge Function
    const response = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'print',
        ip,
        port,
        data: base64Data,
        timeout_ms,
      }),
    });

    const result: NetworkPrintResult = await response.json();

    if (result.success) {
      console.log('[NetworkPrintAdapter] Print successful, sent', result.bytes_sent, 'bytes');
    } else {
      console.error('[NetworkPrintAdapter] Print failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[NetworkPrintAdapter] Print error:', error);

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Erro de rede. Verifique sua conexao com a internet.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao imprimir',
    };
  }
}

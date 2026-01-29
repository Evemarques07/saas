/**
 * Print Proxy Edge Function
 * Handles raw TCP communication with network thermal printers
 *
 * Actions:
 * - test-connection: Test if printer is reachable
 * - print: Send ESC/POS data to printer
 *
 * Security:
 * - Requires Bearer token authentication
 * - Only allows private network IP ranges
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrintProxyRequest {
  action: 'print' | 'test-connection';
  ip: string;
  port: number;
  data?: string; // Base64 encoded binary data for 'print'
  timeout_ms?: number;
}

interface PrintProxyResponse {
  success: boolean;
  error?: string;
  bytes_sent?: number;
  connection_time_ms?: number;
}

/**
 * Verify JWT token authentication
 */
async function verifyAuth(req: Request): Promise<{ authorized: boolean; error?: string; userId?: string }> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'Token de autorizacao ausente' };
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return { authorized: false, error: 'Configuracao do servidor ausente' };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return { authorized: false, error: 'Token invalido ou expirado' };
    }

    return { authorized: true, userId: user.id };
  } catch (err) {
    console.error('[print-proxy] Auth error:', err);
    return { authorized: false, error: 'Erro de autorizacao' };
  }
}

/**
 * Validate IPv4 address format
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  const parts = ip.split('.').map(Number);
  return parts.every(part => part >= 0 && part <= 255);
}

/**
 * Validate port number
 */
function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

/**
 * Check if IP is in private network range (security measure)
 * Allows: 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.x.x.x (localhost)
 */
function isPrivateIP(ip: string): boolean {
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
    ip.startsWith('127.')
  );
}

/**
 * Decode base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Create TCP connection with timeout
 */
async function connectWithTimeout(
  hostname: string,
  port: number,
  timeoutMs: number
): Promise<Deno.Conn> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
  });

  const connectPromise = Deno.connect({ hostname, port });

  return Promise.race([connectPromise, timeoutPromise]);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[print-proxy] Request received');

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      console.error('[print-proxy] Auth failed:', auth.error);
      return new Response(
        JSON.stringify({ success: false, error: auth.error } as PrintProxyResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: PrintProxyRequest = await req.json();
    const { action, ip, port, data, timeout_ms = 5000 } = body;

    console.log('[print-proxy] Action:', action, 'IP:', ip, 'Port:', port, 'User:', auth.userId);

    // Validate IP address
    if (!ip || !isValidIP(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Endereco IP invalido' } as PrintProxyResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate port
    if (!port || !isValidPort(port)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Porta invalida (1-65535)' } as PrintProxyResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Only allow private network IPs
    if (!isPrivateIP(ip)) {
      console.error('[print-proxy] Blocked non-private IP:', ip);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Apenas impressoras em rede local sao permitidas'
        } as PrintProxyResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate action
    if (action !== 'print' && action !== 'test-connection') {
      return new Response(
        JSON.stringify({ success: false, error: 'Acao invalida' } as PrintProxyResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    let conn: Deno.Conn | null = null;

    try {
      // Create TCP connection with timeout
      conn = await connectWithTimeout(ip, port, timeout_ms);
      const connectionTime = Date.now() - startTime;

      console.log('[print-proxy] Connected to', ip, ':', port, 'in', connectionTime, 'ms');

      if (action === 'test-connection') {
        // Just test connection, close and return success
        conn.close();
        console.log('[print-proxy] Test connection successful');

        return new Response(
          JSON.stringify({
            success: true,
            connection_time_ms: connectionTime,
          } as PrintProxyResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // action === 'print'
      if (!data) {
        conn.close();
        return new Response(
          JSON.stringify({ success: false, error: 'Dados de impressao ausentes' } as PrintProxyResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decode base64 data to binary
      let binaryData: Uint8Array;
      try {
        binaryData = base64ToUint8Array(data);
      } catch (decodeError) {
        conn.close();
        console.error('[print-proxy] Base64 decode error:', decodeError);
        return new Response(
          JSON.stringify({ success: false, error: 'Dados de impressao invalidos' } as PrintProxyResponse),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[print-proxy] Sending', binaryData.length, 'bytes to printer');

      // Write data to printer
      await conn.write(binaryData);

      // Close connection
      conn.close();

      console.log('[print-proxy] Print successful, sent', binaryData.length, 'bytes');

      return new Response(
        JSON.stringify({
          success: true,
          bytes_sent: binaryData.length,
          connection_time_ms: connectionTime,
        } as PrintProxyResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (connError) {
      // Make sure to close connection if it was opened
      if (conn) {
        try {
          conn.close();
        } catch {
          // Ignore close errors
        }
      }

      const errorMessage = connError instanceof Error ? connError.message : 'Erro de conexao';
      console.error('[print-proxy] Connection error:', errorMessage);

      // Map errors to user-friendly messages
      let userFriendlyError = 'Erro ao conectar com a impressora';

      if (errorMessage === 'TIMEOUT') {
        userFriendlyError = `Tempo limite excedido (${timeout_ms}ms). Verifique se a impressora esta ligada e acessivel.`;
      } else if (errorMessage.includes('Connection refused') || errorMessage.includes('connection refused')) {
        userFriendlyError = 'Conexao recusada. Verifique o IP e porta da impressora.';
      } else if (errorMessage.includes('No route to host') || errorMessage.includes('Network is unreachable')) {
        userFriendlyError = 'Impressora nao encontrada na rede. Verifique a conexao de rede.';
      } else if (errorMessage.includes('Host unreachable')) {
        userFriendlyError = 'Impressora inalcancavel. Verifique se o IP esta correto.';
      }

      return new Response(
        JSON.stringify({ success: false, error: userFriendlyError } as PrintProxyResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[print-proxy] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      } as PrintProxyResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

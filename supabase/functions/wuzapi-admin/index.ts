// Supabase Edge Function para operações WuzAPI (proxy seguro)
// TODAS as chamadas ao WuzAPI passam por aqui, autenticadas via Supabase JWT
// Deploy: npx supabase functions deploy wuzapi-admin --no-verify-jwt --project-ref jyjkeqnmofzjnzpvkugl

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Types
type ActionType =
  | 'create-user'
  | 'delete-user'
  | 'list-users'
  | 'get-user-status'
  | 'health-check'
  | 'connect-session'
  | 'disconnect-session'
  | 'get-qr'
  | 'get-session-status'
  | 'check-phone'
  | 'send-text'
  | 'send-image';

interface RequestBody {
  action: ActionType;
  [key: string]: unknown;
}

// Verify Supabase JWT Token and get user info
async function verifyAuth(req: Request): Promise<{
  authorized: boolean;
  error?: string;
  userId?: string;
  email?: string;
  isSuperAdmin?: boolean;
}> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authorized: false, error: 'Token de autorizacao ausente' };
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return { authorized: false, error: 'Configuracao do Supabase ausente' };
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(accessToken);
    if (userError || !user) {
      return { authorized: false, error: 'Token invalido ou expirado' };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    return {
      authorized: true,
      userId: user.id,
      email: user.email,
      isSuperAdmin: profile?.is_super_admin || false,
    };
  } catch (err) {
    return { authorized: false, error: 'Erro ao verificar autorizacao' };
  }
}

// Verify user is member of a company (by slug)
async function verifyCompanyMembership(userId: string, companySlug: string): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) return false;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('company_members')
      .select('id, companies!inner(slug)')
      .eq('user_id', userId)
      .eq('companies.slug', companySlug)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

// Verify user has access to a specific user token (owns company with that token)
async function verifyTokenAccess(userId: string, userToken: string, isSuperAdmin: boolean): Promise<boolean> {
  if (isSuperAdmin) return true;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) return false;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find companies where user is a member and whatsapp_settings has the token
    const { data: memberships } = await supabase
      .from('company_members')
      .select('company_id, companies!inner(whatsapp_settings)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!memberships) return false;

    return memberships.some((m: { companies: { whatsapp_settings: { user_token?: string } | null } }) =>
      m.companies?.whatsapp_settings?.user_token === userToken
    );
  } catch {
    return false;
  }
}

// Proxy call to WuzAPI
async function wuzapiCall(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<Response> {
  const WUZAPI_URL = Deno.env.get('WUZAPI_URL');
  if (!WUZAPI_URL) throw new Error('WUZAPI_URL not configured');

  const url = `${WUZAPI_URL}${path}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
  });
  return response;
}

function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const WUZAPI_URL = Deno.env.get('WUZAPI_URL');
    const WUZAPI_ADMIN_TOKEN = Deno.env.get('WUZAPI_ADMIN_TOKEN');

    if (!WUZAPI_URL || !WUZAPI_ADMIN_TOKEN) {
      return jsonResponse({ success: false, error: 'WuzAPI nao configurado' }, 500, corsHeaders);
    }

    // Verify auth
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return jsonResponse({ success: false, error: auth.error }, 401, corsHeaders);
    }

    const body: RequestBody = await req.json();
    const { action } = body;

    switch (action) {
      // ==================== ADMIN ACTIONS (require super admin) ====================

      case 'create-user': {
        const { companySlug, userToken } = body as { action: string; companySlug: string; userToken: string };

        if (!companySlug || !userToken) {
          return jsonResponse({ success: false, error: 'companySlug e userToken sao obrigatorios' }, 400, corsHeaders);
        }

        // Allow super admin or company member
        if (!auth.isSuperAdmin) {
          const isMember = await verifyCompanyMembership(auth.userId!, companySlug);
          if (!isMember) {
            return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
          }
        }

        // Check if user already exists
        const listResp = await wuzapiCall('/admin/users', {
          headers: { Authorization: WUZAPI_ADMIN_TOKEN },
        });
        if (listResp.ok) {
          const listData = await listResp.json();
          const existing = listData?.data?.find((u: { token: string }) => u.token === userToken);
          if (existing) {
            return jsonResponse({ success: true, message: 'Usuario ja existe' }, 200, corsHeaders);
          }
        }

        const createResp = await wuzapiCall('/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: WUZAPI_ADMIN_TOKEN },
          body: JSON.stringify({ name: `ejym-${companySlug}`, token: userToken }),
        });

        if (!createResp.ok) {
          const err = await createResp.json().catch(() => ({}));
          if (createResp.status === 409) {
            return jsonResponse({ success: true, message: 'Usuario ja existe' }, 200, corsHeaders);
          }
          return jsonResponse({ success: false, error: err?.error || 'Erro ao criar usuario' }, createResp.status, corsHeaders);
        }

        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      case 'list-users': {
        if (!auth.isSuperAdmin) {
          return jsonResponse({ success: false, error: 'Apenas super admin' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/admin/users', {
          headers: { Authorization: WUZAPI_ADMIN_TOKEN },
        });

        if (!resp.ok) {
          return jsonResponse({ success: false, error: 'Erro ao listar usuarios' }, resp.status, corsHeaders);
        }

        const data = await resp.json();
        const users = (data?.data || []).map((u: { id: string; name: string; token: string }) => ({
          id: u.id, name: u.name, token: u.token,
        }));

        return jsonResponse({ success: true, users }, 200, corsHeaders);
      }

      case 'delete-user': {
        if (!auth.isSuperAdmin) {
          return jsonResponse({ success: false, error: 'Apenas super admin' }, 403, corsHeaders);
        }

        const { userId } = body as { action: string; userId: string };
        if (!userId) {
          return jsonResponse({ success: false, error: 'userId obrigatorio' }, 400, corsHeaders);
        }

        const resp = await wuzapiCall(`/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: WUZAPI_ADMIN_TOKEN },
        });

        if (!resp.ok) {
          return jsonResponse({ success: false, error: 'Erro ao deletar' }, resp.status, corsHeaders);
        }

        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      // ==================== SESSION ACTIONS (require token access) ====================

      case 'health-check': {
        // Any authenticated user can check health
        try {
          const resp = await wuzapiCall('/admin/users', {
            headers: { Authorization: WUZAPI_ADMIN_TOKEN },
          });
          return jsonResponse({ success: true, online: resp.ok }, 200, corsHeaders);
        } catch {
          return jsonResponse({ success: true, online: false }, 200, corsHeaders);
        }
      }

      case 'connect-session': {
        const { userToken } = body as { action: string; userToken: string };
        if (!userToken) {
          return jsonResponse({ success: false, error: 'userToken obrigatorio' }, 400, corsHeaders);
        }

        if (!await verifyTokenAccess(auth.userId!, userToken, auth.isSuperAdmin!)) {
          return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/session/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Token: userToken },
          body: JSON.stringify({}),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          return jsonResponse({ success: false, error: err?.error || 'Erro ao conectar' }, resp.status, corsHeaders);
        }

        return jsonResponse({ success: true }, 200, corsHeaders);
      }

      case 'disconnect-session': {
        const { userToken } = body as { action: string; userToken: string };
        if (!userToken) {
          return jsonResponse({ success: false, error: 'userToken obrigatorio' }, 400, corsHeaders);
        }

        if (!await verifyTokenAccess(auth.userId!, userToken, auth.isSuperAdmin!)) {
          return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/session/logout', {
          method: 'POST',
          headers: { Token: userToken },
        });

        return jsonResponse({ success: resp.ok }, 200, corsHeaders);
      }

      case 'get-qr': {
        const { userToken } = body as { action: string; userToken: string };
        if (!userToken) {
          return jsonResponse({ success: false, error: 'userToken obrigatorio' }, 400, corsHeaders);
        }

        if (!await verifyTokenAccess(auth.userId!, userToken, auth.isSuperAdmin!)) {
          return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/session/qr', {
          headers: { Token: userToken },
        });

        if (!resp.ok) {
          return jsonResponse({ success: false, qrCode: null }, 200, corsHeaders);
        }

        const data = await resp.json();
        return jsonResponse({ success: true, qrCode: data?.data?.QRCode || null }, 200, corsHeaders);
      }

      case 'get-session-status':
      case 'get-user-status': {
        const { userToken } = body as { action: string; userToken: string };
        if (!userToken) {
          return jsonResponse({ success: false, error: 'userToken obrigatorio' }, 400, corsHeaders);
        }

        if (!await verifyTokenAccess(auth.userId!, userToken, auth.isSuperAdmin!)) {
          return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/session/status', {
          headers: { Token: userToken },
        });

        if (!resp.ok) {
          return jsonResponse({
            success: true,
            status: { connected: false, loggedIn: false, jid: null, phone: null, name: null, qrcode: null },
          }, 200, corsHeaders);
        }

        const data = await resp.json();
        const jid = data?.data?.jid || null;
        const phone = jid ? jid.split('@')[0].split(':')[0] : null;

        return jsonResponse({
          success: true,
          status: {
            connected: data?.data?.connected || false,
            loggedIn: data?.data?.loggedIn || false,
            jid,
            phone,
            name: data?.data?.name || null,
            qrcode: data?.data?.qrcode || null,
          },
        }, 200, corsHeaders);
      }

      case 'check-phone': {
        const { userToken, phone } = body as { action: string; userToken: string; phone: string };
        if (!userToken || !phone) {
          return jsonResponse({ success: false, error: 'userToken e phone obrigatorios' }, 400, corsHeaders);
        }

        if (!await verifyTokenAccess(auth.userId!, userToken, auth.isSuperAdmin!)) {
          return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/user/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Token: userToken },
          body: JSON.stringify({ Phone: [phone] }),
        });

        if (!resp.ok) {
          return jsonResponse({ success: true, exists: false, jid: null, verifiedName: null }, 200, corsHeaders);
        }

        const data = await resp.json();
        const user = data?.data?.Users?.[0];

        if (user?.IsInWhatsapp) {
          const jidPhone = user.JID?.split('@')[0]?.split(':')[0] || null;
          return jsonResponse({
            success: true, exists: true, jid: jidPhone, verifiedName: user.VerifiedName || null,
          }, 200, corsHeaders);
        }

        return jsonResponse({ success: true, exists: false, jid: null, verifiedName: null }, 200, corsHeaders);
      }

      case 'send-text': {
        const { userToken, phone, message } = body as { action: string; userToken: string; phone: string; message: string };
        if (!userToken || !phone || !message) {
          return jsonResponse({ success: false, error: 'userToken, phone e message obrigatorios' }, 400, corsHeaders);
        }

        if (!await verifyTokenAccess(auth.userId!, userToken, auth.isSuperAdmin!)) {
          return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/chat/send/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Token: userToken },
          body: JSON.stringify({ Phone: phone, Body: message }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          return jsonResponse({ success: false, error: err?.error || 'Erro ao enviar' }, resp.status, corsHeaders);
        }

        const data = await resp.json();
        return jsonResponse({ success: true, messageId: data?.data?.Id || data?.data?.id }, 200, corsHeaders);
      }

      case 'send-image': {
        const { userToken, phone, image, caption } = body as {
          action: string; userToken: string; phone: string; image: string; caption?: string;
        };
        if (!userToken || !phone || !image) {
          return jsonResponse({ success: false, error: 'userToken, phone e image obrigatorios' }, 400, corsHeaders);
        }

        if (!await verifyTokenAccess(auth.userId!, userToken, auth.isSuperAdmin!)) {
          return jsonResponse({ success: false, error: 'Sem permissao' }, 403, corsHeaders);
        }

        const resp = await wuzapiCall('/chat/send/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Token: userToken },
          body: JSON.stringify({ Phone: phone, Image: image, Caption: caption || '' }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          return jsonResponse({ success: false, error: err?.error || 'Erro ao enviar imagem' }, resp.status, corsHeaders);
        }

        const data = await resp.json();
        return jsonResponse({ success: true, messageId: data?.data?.Id || data?.data?.id }, 200, corsHeaders);
      }

      default:
        return jsonResponse({ success: false, error: 'Acao invalida' }, 400, corsHeaders);
    }
  } catch (error) {
    console.error('[wuzapi-admin] Exception:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500, corsHeaders);
  }
});

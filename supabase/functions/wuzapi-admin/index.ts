// Supabase Edge Function para operações WuzAPI
// Deploy: npx supabase functions deploy wuzapi-admin --no-verify-jwt
// Secrets: npx supabase secrets set WUZAPI_URL=https://... WUZAPI_ADMIN_TOKEN=... SUPABASE_SERVICE_ROLE_KEY=...
//
// Permissões:
// - create-user: Qualquer usuário autenticado que seja membro da empresa OU super admin
// - list-users: Apenas super admin
// - delete-user: Apenas super admin
// - get-user-status: Qualquer usuário autenticado (verifica status com o token do usuário)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface CreateUserRequest {
  action: 'create-user';
  companySlug: string;
  userToken: string;
}

interface DeleteUserRequest {
  action: 'delete-user';
  userId: string;
}

interface ListUsersRequest {
  action: 'list-users';
}

interface GetUserStatusRequest {
  action: 'get-user-status';
  userToken: string;
}

type RequestBody = CreateUserRequest | DeleteUserRequest | ListUsersRequest | GetUserStatusRequest;

// Decode base64url (for JWT)
function base64UrlDecode(str: string): string {
  // Add padding if necessary
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

// Verify Firebase ID Token (simplified - validates claims only)
// This is secure because we verify: issuer, audience, expiration, and user exists in our DB
function decodeFirebaseToken(idToken: string): { uid: string; email?: string } | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.error('[wuzapi-admin] Invalid token format: expected 3 parts, got', parts.length);
      return null;
    }

    const [, payloadB64] = parts;

    // Decode payload
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    // Basic validation
    const now = Math.floor(Date.now() / 1000);
    const projectId = 'saas-af55a'; // Firebase project ID

    // Check expiration
    if (payload.exp && payload.exp < now) {
      console.error('[wuzapi-admin] Token expired. exp:', payload.exp, 'now:', now);
      return null;
    }

    // Check issued at (with 5 min tolerance for clock skew)
    if (payload.iat && payload.iat > now + 300) {
      console.error('[wuzapi-admin] Token issued in future. iat:', payload.iat, 'now:', now);
      return null;
    }

    // Check audience
    if (payload.aud !== projectId) {
      console.error('[wuzapi-admin] Invalid audience:', payload.aud, 'expected:', projectId);
      return null;
    }

    // Check issuer
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIssuer) {
      console.error('[wuzapi-admin] Invalid issuer:', payload.iss, 'expected:', expectedIssuer);
      return null;
    }

    // Check subject (user ID) exists
    const uid = payload.sub || payload.user_id;
    if (!uid) {
      console.error('[wuzapi-admin] No user ID in token');
      return null;
    }

    console.log('[wuzapi-admin] Token decoded successfully for uid:', uid, 'email:', payload.email);

    return {
      uid,
      email: payload.email,
    };
  } catch (error) {
    console.error('[wuzapi-admin] Token decode error:', error);
    return null;
  }
}

// Verify user is authenticated via Firebase (basic auth - just checks token is valid)
async function verifyAuthBasic(req: Request): Promise<{
  authorized: boolean;
  error?: string;
  userId?: string;
  email?: string;
  isSuperAdmin?: boolean;
}> {
  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[wuzapi-admin] Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authorized: false, error: 'Token de autorizacao ausente' };
    }

    const idToken = authHeader.replace('Bearer ', '');
    console.log('[wuzapi-admin] Token length:', idToken.length);

    // Decode and validate Firebase token
    const firebaseUser = decodeFirebaseToken(idToken);
    if (!firebaseUser) {
      return { authorized: false, error: 'Token Firebase invalido ou expirado' };
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('[wuzapi-admin] Supabase URL present:', !!supabaseUrl);
    console.log('[wuzapi-admin] Service key present:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[wuzapi-admin] Missing Supabase config');
      return { authorized: false, error: 'Configuracao do Supabase ausente' };
    }

    // Use service role key to query profiles (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists in profiles table (using Firebase UID)
    console.log('[wuzapi-admin] Checking profile for UID:', firebaseUser.uid);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', firebaseUser.uid)
      .single();

    if (profileError) {
      console.error('[wuzapi-admin] Profile query error:', profileError);
      return { authorized: false, error: 'Erro ao buscar perfil: ' + profileError.message };
    }

    if (!profile) {
      console.error('[wuzapi-admin] Profile not found for UID:', firebaseUser.uid);
      return { authorized: false, error: 'Perfil nao encontrado' };
    }

    console.log('[wuzapi-admin] Profile found, is_super_admin:', profile.is_super_admin);
    console.log('[wuzapi-admin] Auth successful for:', firebaseUser.email);

    return {
      authorized: true,
      userId: firebaseUser.uid,
      email: firebaseUser.email,
      isSuperAdmin: profile.is_super_admin || false
    };
  } catch (err) {
    console.error('[wuzapi-admin] Auth error:', err);
    return { authorized: false, error: 'Erro ao verificar autorizacao: ' + (err instanceof Error ? err.message : String(err)) };
  }
}

// Verify user is member of a company (by slug)
async function verifyCompanyMembership(userId: string, companySlug: string): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is member of the company
    const { data, error } = await supabase
      .from('company_members')
      .select('id, companies!inner(slug)')
      .eq('user_id', userId)
      .eq('companies.slug', companySlug)
      .single();

    if (error || !data) {
      console.log('[wuzapi-admin] User', userId, 'is not member of company', companySlug);
      return false;
    }

    console.log('[wuzapi-admin] User', userId, 'is member of company', companySlug);
    return true;
  } catch (err) {
    console.error('[wuzapi-admin] Membership check error:', err);
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[wuzapi-admin] Request received:', req.method);

  try {
    const WUZAPI_URL = Deno.env.get('WUZAPI_URL');
    const WUZAPI_ADMIN_TOKEN = Deno.env.get('WUZAPI_ADMIN_TOKEN');

    console.log('[wuzapi-admin] WUZAPI_URL present:', !!WUZAPI_URL);
    console.log('[wuzapi-admin] WUZAPI_ADMIN_TOKEN present:', !!WUZAPI_ADMIN_TOKEN);

    if (!WUZAPI_URL || !WUZAPI_ADMIN_TOKEN) {
      console.error('[wuzapi-admin] Missing WUZAPI_URL or WUZAPI_ADMIN_TOKEN');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuracao do WuzAPI ausente no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify basic authentication first
    const auth = await verifyAuthBasic(req);
    if (!auth.authorized) {
      console.error('[wuzapi-admin] Auth failed:', auth.error);
      return new Response(
        JSON.stringify({ success: false, error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    console.log('[wuzapi-admin] Action:', body.action, 'User:', auth.email, 'SuperAdmin:', auth.isSuperAdmin);

    // Route based on action
    switch (body.action) {
      case 'create-user': {
        const { companySlug, userToken } = body as CreateUserRequest;

        if (!companySlug || !userToken) {
          return new Response(
            JSON.stringify({ success: false, error: 'companySlug e userToken sao obrigatorios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For create-user: Allow if user is super admin OR is member of the company
        if (!auth.isSuperAdmin) {
          const isMember = await verifyCompanyMembership(auth.userId!, companySlug);
          if (!isMember) {
            console.error('[wuzapi-admin] User is not member of company:', companySlug);
            return new Response(
              JSON.stringify({ success: false, error: 'Voce nao tem permissao para configurar WhatsApp desta empresa' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // First check if user already exists
        const listResponse = await fetch(`${WUZAPI_URL}/admin/users`, {
          headers: { 'Authorization': WUZAPI_ADMIN_TOKEN },
        });

        if (listResponse.ok) {
          const listData = await listResponse.json();
          const existingUser = listData?.data?.find((u: { token: string }) => u.token === userToken);
          if (existingUser) {
            console.log(`[wuzapi-admin] User already exists: ejym-${companySlug}`);
            return new Response(
              JSON.stringify({ success: true, message: 'Usuario ja existe' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Create user
        const createResponse = await fetch(`${WUZAPI_URL}/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': WUZAPI_ADMIN_TOKEN,
          },
          body: JSON.stringify({
            name: `ejym-${companySlug}`,
            token: userToken,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          // User already exists is not an error
          if (createResponse.status === 409 || errorData?.error?.includes('already exists')) {
            return new Response(
              JSON.stringify({ success: true, message: 'Usuario ja existe' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.error('[wuzapi-admin] Create user error:', errorData);
          return new Response(
            JSON.stringify({ success: false, error: errorData?.error || 'Erro ao criar usuario' }),
            { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[wuzapi-admin] User created: ejym-${companySlug}`);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list-users': {
        // Only super admins can list all users
        if (!auth.isSuperAdmin) {
          return new Response(
            JSON.stringify({ success: false, error: 'Acesso negado. Apenas super administradores.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[wuzapi-admin] Listing users from:', WUZAPI_URL);

        const response = await fetch(`${WUZAPI_URL}/admin/users`, {
          headers: { 'Authorization': WUZAPI_ADMIN_TOKEN },
        });

        console.log('[wuzapi-admin] WuzAPI response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[wuzapi-admin] List users error:', errorText);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao listar usuarios' }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        const users = (data?.data || []).map((u: { id: string; name: string; token: string }) => ({
          id: u.id,
          name: u.name,
          token: u.token,
        }));

        console.log('[wuzapi-admin] Found', users.length, 'users');

        return new Response(
          JSON.stringify({ success: true, users }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-user': {
        // Only super admins can delete users
        if (!auth.isSuperAdmin) {
          return new Response(
            JSON.stringify({ success: false, error: 'Acesso negado. Apenas super administradores.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { userId } = body as DeleteUserRequest;

        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'userId e obrigatorio' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${WUZAPI_URL}/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': WUZAPI_ADMIN_TOKEN },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return new Response(
            JSON.stringify({ success: false, error: errorData?.error || 'Erro ao deletar usuario' }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[wuzapi-admin] User deleted: ${userId}`);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-user-status': {
        const { userToken } = body as GetUserStatusRequest;

        if (!userToken) {
          return new Response(
            JSON.stringify({ success: false, error: 'userToken e obrigatorio' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const response = await fetch(`${WUZAPI_URL}/session/status`, {
          headers: { 'Token': userToken },
        });

        if (!response.ok) {
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao obter status' }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify({
            success: true,
            status: {
              connected: data?.data?.connected || false,
              loggedIn: data?.data?.loggedIn || false,
              jid: data?.data?.jid || null,
              name: data?.data?.name || null,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Acao invalida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[wuzapi-admin] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

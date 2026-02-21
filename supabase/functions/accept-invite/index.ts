import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, email, password, fullName } = await req.json()
    console.log('[accept-invite] Starting with token:', token?.substring(0, 8) + '...')

    if (!token || !email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando', details: { token: !!token, email: !!email, password: !!password, fullName: !!fullName } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('[accept-invite] Supabase URL:', supabaseUrl)
    console.log('[accept-invite] Service key exists:', !!serviceRoleKey)

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Validate invite token
    console.log('[accept-invite] Validating invite token...')
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invites')
      .select('*, company:companies(*)')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError) {
      console.error('[accept-invite] Invite query error:', inviteError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar convite', details: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!invite) {
      return new Response(
        JSON.stringify({ error: 'Convite inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[accept-invite] Invite found:', invite.id, 'for company:', invite.company_id)

    // 2. Verify email matches invite
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Email não corresponde ao convite' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Check if user already exists
    console.log('[accept-invite] Checking if user exists...')
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let userId: string

    if (existingUser) {
      console.log('[accept-invite] User already exists:', existingUser.id)
      userId = existingUser.id

      // Update password if needed
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true
      })

      if (updateError) {
        console.error('[accept-invite] Error updating user:', updateError)
      }
    } else {
      // 4. Create new user with auto-confirmed email using Admin API
      console.log('[accept-invite] Creating new user...')
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      })

      if (authError) {
        console.error('[accept-invite] Auth error:', authError)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário', details: authError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = authData.user.id
      console.log('[accept-invite] User created:', userId)
    }

    // 5. Create or update profile
    console.log('[accept-invite] Creating/updating profile...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        is_super_admin: false
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('[accept-invite] Profile error:', profileError)
      // Continue anyway
    }

    // 6. Add user to company
    console.log('[accept-invite] Adding user to company...')
    const role = invite.role === 'company_admin' ? 'admin' : invite.role
    const { error: memberError } = await supabaseAdmin
      .from('company_members')
      .upsert({
        company_id: invite.company_id,
        user_id: userId,
        role: role,
        is_active: true
      }, { onConflict: 'company_id,user_id' })

    if (memberError) {
      console.error('[accept-invite] Member error:', memberError)
    }

    // 7. Mark invite as accepted
    console.log('[accept-invite] Marking invite as accepted...')
    await supabaseAdmin
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // 8. Sign in the user and return session
    console.log('[accept-invite] Signing in user...')
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('[accept-invite] Sign in error:', signInError)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conta criada! Faça login para continuar.',
          needsLogin: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[accept-invite] Success!')
    return new Response(
      JSON.stringify({
        success: true,
        session: signInData.session,
        user: signInData.user,
        company: invite.company
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[accept-invite] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

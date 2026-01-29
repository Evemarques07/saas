import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar token de autenticação (opcional mas recomendado)
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const receivedToken = req.headers.get('asaas-access-token')

    if (webhookToken && receivedToken !== webhookToken) {
      console.error('Invalid webhook token')
      return new Response(
        JSON.stringify({ authorized: false, reason: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    console.log('Withdrawal validation request:', JSON.stringify(body, null, 2))

    // Dados do saque
    const {
      id,           // ID da solicitação de saque
      value,        // Valor do saque
      bankAccount,  // Conta bancária destino
      scheduleDate, // Data agendada
    } = body

    // Por padrão, autoriza todos os saques
    // Você pode adicionar regras de validação aqui:
    // - Verificar se o valor está dentro de limites
    // - Verificar horário permitido
    // - Verificar conta bancária autorizada
    // - Notificar administradores

    const authorized = true
    const reason = authorized ? 'Saque autorizado automaticamente' : 'Saque não autorizado'

    console.log(`Withdrawal ${id}: ${authorized ? 'AUTHORIZED' : 'DENIED'} - Value: R$ ${value}`)

    return new Response(
      JSON.stringify({
        authorized,
        reason
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing withdrawal validation:', error)

    // Em caso de erro, nega o saque por segurança
    return new Response(
      JSON.stringify({
        authorized: false,
        reason: 'Erro interno na validação'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

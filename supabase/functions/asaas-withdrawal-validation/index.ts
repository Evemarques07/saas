import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar token de autenticação (OBRIGATORIO)
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const receivedToken = req.headers.get('asaas-access-token')

    if (!webhookToken) {
      console.error('ASAAS_WEBHOOK_TOKEN not configured - rejecting all requests')
      return new Response(
        JSON.stringify({ authorized: false, reason: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!receivedToken || receivedToken !== webhookToken) {
      console.error('Invalid webhook token')
      return new Response(
        JSON.stringify({ authorized: false, reason: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    console.log('Withdrawal validation request:', JSON.stringify({ id: body.id, value: body.value, scheduleDate: body.scheduleDate }, null, 2))

    // Dados do saque
    const {
      id,           // ID da solicitação de saque
      value,        // Valor do saque
      bankAccount,  // Conta bancária destino
      scheduleDate, // Data agendada
    } = body

    // Regras de validacao de saque
    const MAX_WITHDRAWAL_VALUE = 50000 // R$ 50.000 limite por saque
    const MIN_WITHDRAWAL_VALUE = 10    // R$ 10 minimo

    let authorized = true
    let reason = 'Saque autorizado'

    // Validar valor minimo
    if (!value || value < MIN_WITHDRAWAL_VALUE) {
      authorized = false
      reason = `Valor minimo para saque: R$ ${MIN_WITHDRAWAL_VALUE}`
    }

    // Validar valor maximo
    if (value > MAX_WITHDRAWAL_VALUE) {
      authorized = false
      reason = `Valor maximo por saque: R$ ${MAX_WITHDRAWAL_VALUE}. Para valores maiores, entre em contato.`
    }

    // Validar se tem dados bancarios
    if (!bankAccount) {
      authorized = false
      reason = 'Conta bancaria nao informada'
    }

    console.log(`Withdrawal ${id}: ${authorized ? 'AUTHORIZED' : 'DENIED'} - Value: R$ ${value} - Reason: ${reason}`)

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

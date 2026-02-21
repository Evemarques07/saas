// Supabase Edge Function para receber Webhooks do Asaas
// Deploy: npx supabase functions deploy asaas-webhook --no-verify-jwt
//
// Configurar no Asaas:
// 1. Acesse: Configurações > Integrações > Webhooks
// 2. URL: https://jyjkeqnmofzjnzpvkugl.supabase.co/functions/v1/asaas-webhook
// 3. Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Eventos do Asaas que nos interessam
type AsaasEvent =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_UPDATED';

interface AsaasWebhookPayload {
  event: AsaasEvent;
  payment: {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    netValue: number;
    status: string;
    billingType: string;
    dueDate: string;
    paymentDate?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    pixQrCodeUrl?: string;
    pixCopiaECola?: string;
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[asaas-webhook] Webhook received');

  try {
    // Verificar token de autenticação do webhook (OBRIGATORIO)
    const webhookToken = req.headers.get('asaas-access-token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    if (!expectedToken) {
      console.error('[asaas-webhook] ASAAS_WEBHOOK_TOKEN not configured - rejecting all requests');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webhookToken || webhookToken !== expectedToken) {
      console.error('[asaas-webhook] Invalid webhook token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body with error handling
    let body: AsaasWebhookPayload;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[asaas-webhook] Failed to parse JSON:', parseError);
      return new Response(
        JSON.stringify({ success: true, message: 'Invalid JSON payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payload
    if (!body || !body.event) {
      console.log('[asaas-webhook] Invalid payload - missing event');
      return new Response(
        JSON.stringify({ success: true, message: 'Invalid payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[asaas-webhook] Event:', body.event, 'Payment:', body.payment?.id);

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event, payment } = body;

    // Validate payment data
    if (!payment || !payment.id) {
      console.log('[asaas-webhook] Invalid payload - missing payment data');
      return new Response(
        JSON.stringify({ success: true, message: 'Missing payment data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar subscription pelo asaas_subscription_id
    let subscriptionId: string | null = null;
    if (payment.subscription) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('id, company_id')
        .eq('asaas_subscription_id', payment.subscription)
        .maybeSingle();

      if (subError) {
        console.error('[asaas-webhook] Error fetching subscription by asaas_subscription_id:', subError);
      }

      if (subscription) {
        subscriptionId = subscription.id;
      }
    }

    // Se não encontrou por subscription, buscar por customer
    if (!subscriptionId && payment.customer) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('id, company_id')
        .eq('asaas_customer_id', payment.customer)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.error('[asaas-webhook] Error fetching subscription by customer:', subError);
      }

      if (subscription) {
        subscriptionId = subscription.id;
      }
    }

    if (!subscriptionId) {
      console.log('[asaas-webhook] Subscription not found for payment:', payment.id);
      // Retorna 200 mesmo assim para o Asaas não ficar reenviando
      return new Response(
        JSON.stringify({ success: true, message: 'Subscription not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar evento com tratamento de erros
    try {
      switch (event) {
        case 'PAYMENT_CREATED': {
          // Verificar se o pagamento já existe para evitar duplicatas
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('asaas_payment_id', payment.id)
            .maybeSingle();

          if (existingPayment) {
            console.log('[asaas-webhook] Payment already exists, skipping:', payment.id);
            break;
          }

          // Criar registro de pagamento
          const { error: insertError } = await supabase.from('payments').insert({
            subscription_id: subscriptionId,
            asaas_payment_id: payment.id,
            amount: payment.value || 0,
            net_amount: payment.netValue || 0,
            status: payment.status || 'PENDING',
            billing_type: payment.billingType || 'UNDEFINED',
            due_date: payment.dueDate || new Date().toISOString().split('T')[0],
            invoice_url: payment.invoiceUrl || null,
            bank_slip_url: payment.bankSlipUrl || null,
            pix_qr_code: payment.pixQrCodeUrl || null,
            pix_copy_paste: payment.pixCopiaECola || null,
          });
          if (insertError) {
            console.error('[asaas-webhook] Error inserting payment:', insertError);
          } else {
            console.log('[asaas-webhook] Payment created:', payment.id);
          }
          break;
        }

        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED': {
          // Atualizar pagamento como confirmado
          const { error: paymentError } = await supabase
            .from('payments')
            .update({
              status: payment.status || 'CONFIRMED',
              paid_at: payment.paymentDate || new Date().toISOString(),
              net_amount: payment.netValue || 0,
            })
            .eq('asaas_payment_id', payment.id);

          if (paymentError) {
            console.error('[asaas-webhook] Error updating payment:', paymentError);
          }

          // Atualizar subscription como ativa
          const { error: subError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          if (subError) {
            console.error('[asaas-webhook] Error updating subscription:', subError);
          }

          console.log('[asaas-webhook] Payment confirmed:', payment.id);
          break;
        }

        case 'PAYMENT_OVERDUE': {
          // Atualizar pagamento como vencido
          await supabase
            .from('payments')
            .update({ status: 'OVERDUE' })
            .eq('asaas_payment_id', payment.id);

          // Atualizar subscription como overdue
          await supabase
            .from('subscriptions')
            .update({
              status: 'overdue',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          console.log('[asaas-webhook] Payment overdue:', payment.id);
          break;
        }

        case 'PAYMENT_REFUNDED': {
          // Atualizar pagamento como reembolsado
          await supabase
            .from('payments')
            .update({ status: 'REFUNDED' })
            .eq('asaas_payment_id', payment.id);

          console.log('[asaas-webhook] Payment refunded:', payment.id);
          break;
        }

        case 'PAYMENT_DELETED': {
          // Deletar pagamento
          await supabase
            .from('payments')
            .delete()
            .eq('asaas_payment_id', payment.id);

          console.log('[asaas-webhook] Payment deleted:', payment.id);
          break;
        }

        default:
          console.log('[asaas-webhook] Unhandled event:', event);
      }
    } catch (dbError) {
      // Log database errors but still return 200 to prevent retries
      console.error('[asaas-webhook] Database error:', dbError);
    }

    // Always return 200 to prevent Asaas from retrying
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[asaas-webhook] Error:', error);
    // Return 200 even on error to prevent retries and penalties
    return new Response(
      JSON.stringify({ success: true, message: 'Error processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

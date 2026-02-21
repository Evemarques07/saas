// Supabase Edge Function para operações Asaas (Billing)
// Deploy: npx supabase functions deploy asaas-billing --no-verify-jwt
// Secrets: npx supabase secrets set ASAAS_API_KEY=... ASAAS_API_URL=https://sandbox.asaas.com/api/v3

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Types
type BillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';

interface CreateSubscriptionRequest {
  action: 'create-subscription';
  companyId: string;
  planId: string;
  billingType: BillingType;
  billingCycle: BillingCycle;
  customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  };
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

interface UpdateSubscriptionRequest {
  action: 'update-subscription';
  subscriptionId: string;
  newPlanId: string;
  billingCycle?: BillingCycle;
}

interface CancelSubscriptionRequest {
  action: 'cancel-subscription';
  subscriptionId: string;
}

interface CreateCheckoutRequest {
  action: 'create-checkout';
  companyId: string;
  planId: string;
  billingCycle: BillingCycle;
}

interface GetPaymentLinkRequest {
  action: 'get-payment-link';
  paymentId: string;
}

interface GetSubscriptionStatusRequest {
  action: 'get-subscription-status';
  subscriptionId: string;
}

interface GetCompanySubscriptionRequest {
  action: 'get-company-subscription';
  companyId: string;
}

type RequestBody =
  | CreateSubscriptionRequest
  | UpdateSubscriptionRequest
  | CancelSubscriptionRequest
  | CreateCheckoutRequest
  | GetPaymentLinkRequest
  | GetSubscriptionStatusRequest
  | GetCompanySubscriptionRequest
  | { action: string };

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

    // Create Supabase client with the user's access token to verify it
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });

    // Verify the token by getting the user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user) {
      console.error('[asaas-billing] Token verification failed:', userError);
      return { authorized: false, error: 'Token invalido ou expirado' };
    }

    // Use service role client for querying profile
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { authorized: false, error: 'Perfil nao encontrado' };
    }

    return {
      authorized: true,
      userId: user.id,
      email: user.email,
      isSuperAdmin: profile.is_super_admin || false,
    };
  } catch (err) {
    return {
      authorized: false,
      error: 'Erro ao verificar autorizacao: ' + (err instanceof Error ? err.message : String(err)),
    };
  }
}

// Check if user is member of company
async function isCompanyMember(userId: string, companyId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) return false;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}

// Asaas API helper
async function asaasRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';
  const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');

  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não configurada');
  }

  const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[asaas-billing] Asaas API error:', data);
    throw new Error(data.errors?.[0]?.description || data.message || 'Erro na API Asaas');
  }

  return data;
}

// Get or create Asaas customer
async function getOrCreateAsaasCustomer(customerData: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}): Promise<string> {
  // Search existing customer by CPF/CNPJ
  const searchResult = await asaasRequest<{ data: { id: string }[] }>(
    `/customers?cpfCnpj=${customerData.cpfCnpj}`
  );

  if (searchResult.data?.length > 0) {
    return searchResult.data[0].id;
  }

  // Create new customer
  const newCustomer = await asaasRequest<{ id: string }>('/customers', 'POST', {
    name: customerData.name,
    email: customerData.email,
    cpfCnpj: customerData.cpfCnpj,
    mobilePhone: customerData.phone,
  });

  return newCustomer.id;
}

// Calculate next due date (5 days from now)
function getNextDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toISOString().split('T')[0];
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[asaas-billing] Request received');

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuracao do Asaas ausente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    console.log('[asaas-billing] Action:', body.action, 'User:', auth.email);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (body.action) {
      // ============================================
      // CREATE SUBSCRIPTION
      // ============================================
      case 'create-subscription': {
        const { companyId, planId, billingType, billingCycle, customerData, creditCard, creditCardHolderInfo } =
          body as CreateSubscriptionRequest;

        // Verify user is member of company
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, companyId))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao para esta empresa' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get plan details
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          return new Response(
            JSON.stringify({ success: false, error: 'Plano nao encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for existing subscription
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id, status, asaas_subscription_id')
          .eq('company_id', companyId)
          .single();

        if (existingSub) {
          // If active subscription exists, don't allow creating new one
          if (existingSub.status === 'active') {
            return new Response(
              JSON.stringify({ success: false, error: 'Ja existe uma assinatura ativa para esta empresa' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Delete pending/canceled subscription and its payments
          console.log('[asaas-billing] Deleting existing subscription:', existingSub.id);

          // Delete payments first (due to FK constraint)
          await supabase
            .from('payments')
            .delete()
            .eq('subscription_id', existingSub.id);

          // Delete subscription
          await supabase
            .from('subscriptions')
            .delete()
            .eq('id', existingSub.id);

          // Cancel in Asaas if exists
          if (existingSub.asaas_subscription_id) {
            try {
              await asaasRequest(`/subscriptions/${existingSub.asaas_subscription_id}`, 'DELETE');
            } catch (e) {
              console.log('[asaas-billing] Could not cancel Asaas subscription (may already be canceled):', e);
            }
          }
        }

        // Get or create Asaas customer
        const asaasCustomerId = await getOrCreateAsaasCustomer(customerData);

        // Calculate price based on cycle
        const price = billingCycle === 'YEARLY' && plan.price_yearly
          ? plan.price_yearly
          : plan.price_monthly * (billingCycle === 'QUARTERLY' ? 3 : billingCycle === 'SEMIANNUALLY' ? 6 : 1);

        // Create subscription in Asaas
        const subscriptionData: Record<string, unknown> = {
          customer: asaasCustomerId,
          billingType,
          value: price,
          nextDueDate: getNextDueDate(),
          cycle: billingCycle,
          description: `Assinatura ${plan.display_name} - Mercado Virtual`,
        };

        // Add credit card data if provided
        if (billingType === 'CREDIT_CARD' && creditCard && creditCardHolderInfo) {
          subscriptionData.creditCard = creditCard;
          subscriptionData.creditCardHolderInfo = creditCardHolderInfo;
        }

        const asaasSubscription = await asaasRequest<{ id: string; status: string }>(
          '/subscriptions',
          'POST',
          subscriptionData
        );

        // Save subscription in database with pending status
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            company_id: companyId,
            plan_id: planId,
            asaas_subscription_id: asaasSubscription.id,
            asaas_customer_id: asaasCustomerId,
            billing_type: billingType,
            billing_cycle: billingCycle,
            status: 'pending', // Aguardando pagamento
            price,
            next_due_date: getNextDueDate(),
          })
          .select('*, plan:plans(*)')
          .single();

        if (subError) {
          console.error('[asaas-billing] Error saving subscription:', subError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao salvar assinatura' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar a primeira cobrança da subscription para obter dados de pagamento
        let paymentData: {
          paymentId?: string;
          invoiceUrl?: string;
          bankSlipUrl?: string;
          pixQrCode?: string;
          pixCopyPaste?: string;
          dueDate?: string;
        } = {};

        try {
          // Aguardar um pouco para o Asaas criar a cobrança
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Buscar cobranças da subscription
          const payments = await asaasRequest<{
            data: Array<{
              id: string;
              invoiceUrl?: string;
              bankSlipUrl?: string;
              status: string;
              dueDate: string;
            }>;
          }>(`/payments?subscription=${asaasSubscription.id}`);

          if (payments.data?.length > 0) {
            const firstPayment = payments.data[0];
            paymentData.paymentId = firstPayment.id;
            paymentData.invoiceUrl = firstPayment.invoiceUrl;
            paymentData.bankSlipUrl = firstPayment.bankSlipUrl;
            paymentData.dueDate = firstPayment.dueDate;

            // Se for PIX, buscar QR Code
            if (billingType === 'PIX') {
              try {
                const pixData = await asaasRequest<{
                  encodedImage: string;
                  payload: string;
                  expirationDate: string;
                }>(`/payments/${firstPayment.id}/pixQrCode`);

                paymentData.pixQrCode = `data:image/png;base64,${pixData.encodedImage}`;
                paymentData.pixCopyPaste = pixData.payload;
              } catch (pixError) {
                console.log('[asaas-billing] PIX QR Code not ready yet');
              }
            }

            // Salvar dados de pagamento na tabela payments
            await supabase.from('payments').insert({
              subscription_id: subscription.id,
              asaas_payment_id: firstPayment.id,
              amount: price,
              status: 'PENDING',
              billing_type: billingType,
              due_date: firstPayment.dueDate,
              invoice_url: firstPayment.invoiceUrl,
              bank_slip_url: firstPayment.bankSlipUrl,
              pix_qr_code: paymentData.pixQrCode,
              pix_copy_paste: paymentData.pixCopyPaste,
            });
          }
        } catch (paymentError) {
          console.error('[asaas-billing] Error fetching payment data:', paymentError);
          // Não falha a operação, apenas não terá os dados de pagamento imediatamente
        }

        console.log('[asaas-billing] Subscription created:', subscription.id);

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...subscription,
              payment: paymentData,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // UPDATE SUBSCRIPTION (Change Plan)
      // ============================================
      case 'update-subscription': {
        const { subscriptionId, newPlanId, billingCycle } = body as UpdateSubscriptionRequest;

        // Get current subscription
        const { data: currentSub, error: subError } = await supabase
          .from('subscriptions')
          .select('*, company:companies(*)')
          .eq('id', subscriptionId)
          .single();

        if (subError || !currentSub) {
          return new Response(
            JSON.stringify({ success: false, error: 'Assinatura nao encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify permission
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, currentSub.company_id))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get new plan
        const { data: newPlan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', newPlanId)
          .single();

        if (planError || !newPlan) {
          return new Response(
            JSON.stringify({ success: false, error: 'Plano nao encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const cycle = billingCycle || currentSub.billing_cycle;
        const newPrice = cycle === 'YEARLY' && newPlan.price_yearly
          ? newPlan.price_yearly
          : newPlan.price_monthly * (cycle === 'QUARTERLY' ? 3 : cycle === 'SEMIANNUALLY' ? 6 : 1);

        // Update in Asaas
        if (currentSub.asaas_subscription_id) {
          await asaasRequest(
            `/subscriptions/${currentSub.asaas_subscription_id}`,
            'PUT',
            {
              value: newPrice,
              cycle,
              description: `Assinatura ${newPlan.display_name} - Mercado Virtual`,
            }
          );
        }

        // Update in database
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: newPlanId,
            billing_cycle: cycle,
            price: newPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId)
          .select('*, plan:plans(*)')
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao atualizar assinatura' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: updatedSub }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // CANCEL SUBSCRIPTION
      // ============================================
      case 'cancel-subscription': {
        const { subscriptionId } = body as CancelSubscriptionRequest;

        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .single();

        if (subError || !subscription) {
          return new Response(
            JSON.stringify({ success: false, error: 'Assinatura nao encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify permission
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, subscription.company_id))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cancel in Asaas
        if (subscription.asaas_subscription_id) {
          await asaasRequest(`/subscriptions/${subscription.asaas_subscription_id}`, 'DELETE');
        }

        // Update in database
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId);

        console.log('[asaas-billing] Subscription canceled:', subscriptionId);

        return new Response(
          JSON.stringify({ success: true, data: { success: true } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // CREATE CHECKOUT (Redirect to Asaas)
      // ============================================
      case 'create-checkout': {
        const { companyId, planId, billingCycle } = body as CreateCheckoutRequest;

        // Verify permission
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, companyId))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get plan
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          return new Response(
            JSON.stringify({ success: false, error: 'Plano nao encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const price = billingCycle === 'YEARLY' && plan.price_yearly
          ? plan.price_yearly
          : plan.price_monthly;

        // Create payment link with recurrence
        const paymentLink = await asaasRequest<{ url: string }>('/paymentLinks', 'POST', {
          name: `Assinatura ${plan.display_name}`,
          description: `Plano ${plan.display_name} - Mercado Virtual`,
          value: price,
          billingType: 'UNDEFINED', // User chooses at checkout
          chargeType: 'RECURRENT',
          dueDateLimitDays: 10,
          subscriptionCycle: billingCycle,
          maxInstallmentCount: 1,
          notificationEnabled: true,
        });

        return new Response(
          JSON.stringify({ success: true, data: { checkoutUrl: paymentLink.url } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // GET PAYMENT LINK
      // ============================================
      case 'get-payment-link': {
        const { paymentId } = body as GetPaymentLinkRequest;

        const { data: payment, error: payError } = await supabase
          .from('payments')
          .select('*, subscription:subscriptions(*)')
          .eq('id', paymentId)
          .single();

        if (payError || !payment) {
          return new Response(
            JSON.stringify({ success: false, error: 'Pagamento nao encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify permission
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, payment.subscription.company_id))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If we already have the URLs, return them
        if (payment.invoice_url || payment.pix_qr_code) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                invoiceUrl: payment.invoice_url,
                bankSlipUrl: payment.bank_slip_url,
                pixQrCode: payment.pix_qr_code,
                pixCopyPaste: payment.pix_copy_paste,
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch from Asaas
        if (payment.asaas_payment_id) {
          const asaasPayment = await asaasRequest<{
            invoiceUrl?: string;
            bankSlipUrl?: string;
            pixQrCodeUrl?: string;
            pixCopiaECola?: string;
          }>(`/payments/${payment.asaas_payment_id}`);

          // Update local record
          await supabase
            .from('payments')
            .update({
              invoice_url: asaasPayment.invoiceUrl,
              bank_slip_url: asaasPayment.bankSlipUrl,
              pix_qr_code: asaasPayment.pixQrCodeUrl,
              pix_copy_paste: asaasPayment.pixCopiaECola,
            })
            .eq('id', paymentId);

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                invoiceUrl: asaasPayment.invoiceUrl,
                bankSlipUrl: asaasPayment.bankSlipUrl,
                pixQrCode: asaasPayment.pixQrCodeUrl,
                pixCopyPaste: asaasPayment.pixCopiaECola,
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: 'Dados de pagamento nao disponiveis' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // GET COMPANY SUBSCRIPTION (bypasses RLS)
      // ============================================
      case 'get-company-subscription': {
        const { companyId } = body as GetCompanySubscriptionRequest;

        // Verify permission - user must be member of the company
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, companyId))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get subscription with plan
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*, plan:plans(*)')
          .eq('company_id', companyId)
          .in('status', ['active', 'overdue'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) {
          console.error('[asaas-billing] Error fetching subscription:', subError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao buscar assinatura' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: subscription }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // GET SUBSCRIPTION STATUS (for polling)
      // ============================================
      case 'get-subscription-status': {
        const { subscriptionId } = body as GetSubscriptionStatusRequest;

        // Get subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('id, company_id, status')
          .eq('id', subscriptionId)
          .single();

        if (subError || !subscription) {
          return new Response(
            JSON.stringify({ success: false, error: 'Assinatura nao encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify permission - user must be member of the company
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, subscription.company_id))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: { status: subscription.status } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ============================================
      // REACTIVATE SUBSCRIPTION
      // ============================================
      case 'reactivate-subscription': {
        const { subscriptionId } = body as { action: string; subscriptionId: string };

        if (!subscriptionId) {
          return new Response(
            JSON.stringify({ success: false, error: 'subscriptionId obrigatorio' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*, plan:plans(*)')
          .eq('id', subscriptionId)
          .single();

        if (subError || !subscription) {
          return new Response(
            JSON.stringify({ success: false, error: 'Assinatura nao encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify permission
        if (!auth.isSuperAdmin && !(await isCompanyMember(auth.userId!, subscription.company_id))) {
          return new Response(
            JSON.stringify({ success: false, error: 'Voce nao tem permissao' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Only canceled subscriptions can be reactivated
        if (subscription.status === 'active') {
          return new Response(
            JSON.stringify({ success: false, error: 'Assinatura ja esta ativa' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get customer ID from existing subscription
        const asaasCustomerId = subscription.asaas_customer_id;
        if (!asaasCustomerId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Cliente Asaas nao encontrado. Crie uma nova assinatura.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate price
        const plan = subscription.plan;
        const billingCycle = subscription.billing_cycle || 'MONTHLY';
        const price = billingCycle === 'YEARLY' && plan.price_yearly
          ? plan.price_yearly
          : plan.price_monthly * (billingCycle === 'QUARTERLY' ? 3 : billingCycle === 'SEMIANNUALLY' ? 6 : 1);

        // Create new subscription in Asaas
        const newAsaasSubscription = await asaasRequest<{ id: string; status: string }>(
          '/subscriptions',
          'POST',
          {
            customer: asaasCustomerId,
            billingType: subscription.billing_type || 'PIX',
            value: price,
            nextDueDate: getNextDueDate(),
            cycle: billingCycle,
            description: `Assinatura ${plan.display_name} - Mercado Virtual`,
          }
        );

        // Update subscription in database
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            asaas_subscription_id: newAsaasSubscription.id,
            status: 'pending',
            canceled_at: null,
            price,
            next_due_date: getNextDueDate(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId)
          .select('*, plan:plans(*)')
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao reativar assinatura' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Try to fetch first payment data
        let paymentData: Record<string, unknown> = {};
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const payments = await asaasRequest<{
            data: Array<{ id: string; invoiceUrl?: string; bankSlipUrl?: string; status: string; dueDate: string }>;
          }>(`/payments?subscription=${newAsaasSubscription.id}`);

          if (payments.data?.length > 0) {
            const firstPayment = payments.data[0];
            paymentData = {
              paymentId: firstPayment.id,
              invoiceUrl: firstPayment.invoiceUrl,
              bankSlipUrl: firstPayment.bankSlipUrl,
              dueDate: firstPayment.dueDate,
            };

            await supabase.from('payments').insert({
              subscription_id: updatedSub.id,
              asaas_payment_id: firstPayment.id,
              amount: price,
              status: 'PENDING',
              billing_type: subscription.billing_type || 'PIX',
              due_date: firstPayment.dueDate,
              invoice_url: firstPayment.invoiceUrl,
              bank_slip_url: firstPayment.bankSlipUrl,
            });
          }
        } catch (paymentError) {
          console.error('[asaas-billing] Error fetching reactivation payment data:', paymentError);
        }

        console.log('[asaas-billing] Subscription reactivated:', subscriptionId);

        return new Response(
          JSON.stringify({
            success: true,
            data: { ...updatedSub, payment: paymentData },
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
    console.error('[asaas-billing] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Asaas Billing Service
// Este serviço faz chamadas via Edge Function para proteger a API Key

import { supabase, supabaseGetAccessToken } from './supabase';
import { getCompanyStorageUsage } from './storage';
import type {
  Plan,
  Subscription,
  Payment,
  CreateSubscriptionData,
  BillingType,
  BillingCycle,
} from '../types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-billing`;

// Helper para obter token de autenticação (Supabase)
async function getAuthToken(): Promise<string | null> {
  return supabaseGetAccessToken();
}

// Helper para fazer requisições à Edge Function
async function callEdgeFunction<T>(action: string, data?: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...data }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Erro na operação');
  }

  return result.data;
}

// ============================================
// Plans
// ============================================

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

export async function getPlanById(planId: string): Promise<Plan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) return null;
  return data;
}

// ============================================
// Subscriptions
// ============================================

export async function getCompanySubscription(companyId: string): Promise<Subscription | null> {
  // Usar Edge Function para contornar RLS (Firebase Auth não é reconhecido pelo RLS)
  try {
    const token = await getAuthToken();
    if (token) {
      const result = await callEdgeFunction<Subscription | null>('get-company-subscription', {
        companyId,
      });
      return result;
    }
  } catch (error) {
    console.error('Error fetching subscription via Edge Function:', error);
  }

  // Fallback: tentar buscar direto (pode falhar por RLS)
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('company_id', companyId)
    .in('status', ['active', 'overdue'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
  return data;
}

export async function createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
  return callEdgeFunction<Subscription>('create-subscription', data as unknown as Record<string, unknown>);
}

export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPlanId: string,
  billingCycle?: BillingCycle
): Promise<Subscription> {
  return callEdgeFunction<Subscription>('update-subscription', {
    subscriptionId,
    newPlanId,
    billingCycle,
  });
}

export async function updatePaymentMethod(
  subscriptionId: string,
  billingType: BillingType,
  creditCard?: CreateSubscriptionData['creditCard'],
  creditCardHolderInfo?: CreateSubscriptionData['creditCardHolderInfo']
): Promise<{ success: boolean }> {
  return callEdgeFunction<{ success: boolean }>('update-payment-method', {
    subscriptionId,
    billingType,
    creditCard,
    creditCardHolderInfo,
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
  return callEdgeFunction<{ success: boolean }>('cancel-subscription', {
    subscriptionId,
  });
}

export async function reactivateSubscription(subscriptionId: string): Promise<Subscription> {
  return callEdgeFunction<Subscription>('reactivate-subscription', {
    subscriptionId,
  });
}

// ============================================
// Payments
// ============================================

export async function getSubscriptionPayments(subscriptionId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('due_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPaymentDetails(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, subscription:subscriptions(*, plan:plans(*))')
    .eq('id', paymentId)
    .single();

  if (error) return null;
  return data;
}

// Gerar link de pagamento (PIX ou Boleto)
export async function generatePaymentLink(paymentId: string): Promise<{
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
}> {
  return callEdgeFunction<{
    invoiceUrl?: string;
    bankSlipUrl?: string;
    pixQrCode?: string;
    pixCopyPaste?: string;
  }>('get-payment-link', { paymentId });
}

// ============================================
// Checkout
// ============================================

// Criar checkout de assinatura (redireciona para página de pagamento Asaas)
export async function createCheckoutSession(
  companyId: string,
  planId: string,
  billingCycle: BillingCycle = 'MONTHLY'
): Promise<{ checkoutUrl: string }> {
  return callEdgeFunction<{ checkoutUrl: string }>('create-checkout', {
    companyId,
    planId,
    billingCycle,
  });
}

// ============================================
// Usage & Limits
// ============================================

export interface UsageLimits {
  products: { used: number; limit: number | null };
  users: { used: number; limit: number | null };
  storage: { used: number; limit: number | null }; // em MB
}

// Limites padrão do plano gratuito (quando não há subscription)
export const FREE_PLAN_LIMITS = {
  product_limit: 20,
  user_limit: 1,
  storage_limit_mb: 100,
};

export async function getCompanyUsage(
  companyId: string,
  subscription?: Subscription | null
): Promise<UsageLimits> {
  // Se nao recebeu subscription, buscar (backward-compatible)
  const sub = subscription !== undefined
    ? subscription
    : await getCompanySubscription(companyId);
  const plan = sub?.plan;

  // Se não tem plano ativo, usar limites do plano gratuito
  // IMPORTANTE: null = ilimitado, só usar fallback quando não existe plano
  const productLimit = plan ? plan.product_limit : FREE_PLAN_LIMITS.product_limit;
  const userLimit = plan ? plan.user_limit : FREE_PLAN_LIMITS.user_limit;
  const storageLimit = plan ? plan.storage_limit_mb : FREE_PLAN_LIMITS.storage_limit_mb;

  // Buscar contagem de produtos
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  // Buscar contagem de usuários
  const { count: userCount } = await supabase
    .from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true);

  // Calcular storage usado (soma dos arquivos nos buckets da empresa)
  const storageUsed = await getCompanyStorageUsage(companyId);

  return {
    products: {
      used: productCount || 0,
      limit: productLimit,
    },
    users: {
      used: userCount || 0,
      limit: userLimit,
    },
    storage: {
      used: storageUsed,
      limit: storageLimit,
    },
  };
}

export function isWithinLimits(usage: UsageLimits): boolean {
  const { products, users, storage } = usage;

  if (products.limit !== null && products.used >= products.limit) return false;
  if (users.limit !== null && users.used >= users.limit) return false;
  if (storage.limit !== null && storage.used >= storage.limit) return false;

  return true;
}

export function canAddProduct(usage: UsageLimits): boolean {
  const { products } = usage;
  if (products.limit === null) return true;
  return products.used < products.limit;
}

export function canAddUser(usage: UsageLimits): boolean {
  const { users } = usage;
  if (users.limit === null) return true;
  return users.used < users.limit;
}

// ============================================
// Subscription Status Realtime & Polling
// ============================================

// Realtime subscription para detectar mudanças instantâneas
export function subscribeToSubscriptionStatus(
  subscriptionId: string,
  onStatusChange: (status: string, isActive: boolean) => void
): () => void {
  console.log('[asaas] Subscribing to realtime for subscription:', subscriptionId);

  const channel = supabase
    .channel(`subscription-status-${subscriptionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'subscriptions',
        filter: `id=eq.${subscriptionId}`,
      },
      (payload) => {
        console.log('[asaas] Realtime update received:', payload);
        const newStatus = payload.new?.status as string;
        if (newStatus) {
          onStatusChange(newStatus, newStatus === 'active');
        }
      }
    )
    .subscribe((status) => {
      console.log('[asaas] Realtime subscription status:', status);
    });

  // Retorna função para cancelar a subscription
  return () => {
    console.log('[asaas] Unsubscribing from realtime');
    supabase.removeChannel(channel);
  };
}

export async function getSubscriptionStatus(subscriptionId: string): Promise<{
  status: string;
  isActive: boolean;
}> {
  // Usar a Edge Function para buscar status (contorna RLS)
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  try {
    const result = await callEdgeFunction<{ status: string }>('get-subscription-status', {
      subscriptionId,
    });
    return {
      status: result.status || 'pending',
      isActive: result.status === 'active',
    };
  } catch {
    // Fallback: tentar buscar direto (pode falhar por RLS)
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('id', subscriptionId)
      .maybeSingle();

    return {
      status: data?.status || 'pending',
      isActive: data?.status === 'active',
    };
  }
}

// Polling para verificar status do pagamento
export function pollSubscriptionStatus(
  subscriptionId: string,
  onStatusChange: (status: string, isActive: boolean) => void,
  options: {
    interval?: number;
    maxAttempts?: number;
  } = {}
): () => void {
  const { interval = 5000, maxAttempts = 60 } = options; // 5s interval, max 5 min
  let attempts = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const checkStatus = async () => {
    try {
      attempts++;
      const { status, isActive } = await getSubscriptionStatus(subscriptionId);

      onStatusChange(status, isActive);

      // Se ativo ou atingiu máximo, para o polling
      if (isActive || attempts >= maxAttempts) {
        return;
      }

      // Continua polling
      timeoutId = setTimeout(checkStatus, interval);
    } catch (error) {
      console.error('Error polling subscription status:', error);
      // Continua tentando mesmo com erro
      if (attempts < maxAttempts) {
        timeoutId = setTimeout(checkStatus, interval);
      }
    }
  };

  // Inicia o polling
  checkStatus();

  // Retorna função para cancelar o polling
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

// Interface para dados de pagamento retornados pela Edge Function
export interface PaymentInfo {
  paymentId?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  dueDate?: string;
}

export interface SubscriptionWithPayment extends Subscription {
  payment?: PaymentInfo;
}

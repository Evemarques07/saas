import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  getCompanySubscription,
  getCompanyUsage,
  canAddProduct,
  canAddUser,
  FREE_PLAN_LIMITS,
  type UsageLimits,
} from '../services/asaas';
import type { PlanFeatures, Subscription, Plan } from '../types';

// Features padrao do plano gratuito
const FREE_PLAN_FEATURES: PlanFeatures = {
  whatsapp_notifications: false,
  advanced_reports: false,
  multiple_users: false,
  promotions: false,
  loyalty_program: false,
  coupons: false,
};

interface UsePlanFeaturesResult {
  // Features do plano
  features: PlanFeatures;
  // Limites de uso
  limits: UsageLimits | null;
  // Subscription atual
  subscription: Subscription | null;
  // Plano atual
  plan: Plan | null;
  // Helpers
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  canAddProduct: () => boolean;
  canAddUser: () => boolean;
  // Estado
  isLoading: boolean;
  error: string | null;
  // Refresh
  refresh: () => Promise<void>;
}

export function usePlanFeatures(): UsePlanFeaturesResult {
  const { currentCompany } = useTenant();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentCompany?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscriptionData = await getCompanySubscription(currentCompany.id);
      const usageData = await getCompanyUsage(currentCompany.id, subscriptionData);

      setSubscription(subscriptionData);
      setLimits(usageData);
    } catch (err) {
      console.error('Error loading plan features:', err);
      setError('Erro ao carregar dados do plano');
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Obter features do plano atual (ou usar free como fallback)
  // Verificar status: so considerar plano valido se active ou overdue
  const isSubscriptionValid = subscription?.status === 'active' || subscription?.status === 'overdue';
  const features: PlanFeatures = isSubscriptionValid
    ? (subscription?.plan?.features || FREE_PLAN_FEATURES)
    : FREE_PLAN_FEATURES;
  const plan = isSubscriptionValid ? (subscription?.plan || null) : null;

  // Helper para verificar se tem uma feature
  const hasFeature = useCallback(
    (feature: keyof PlanFeatures): boolean => {
      return features[feature] === true;
    },
    [features]
  );

  // Helper para verificar se pode adicionar produto
  const checkCanAddProduct = useCallback((): boolean => {
    if (!limits) {
      // Se nao tem limits, usar limite do free
      return true; // Vai ser verificado pelo backend
    }
    return canAddProduct(limits);
  }, [limits]);

  // Helper para verificar se pode adicionar usuario
  const checkCanAddUser = useCallback((): boolean => {
    if (!limits) {
      return true; // Vai ser verificado pelo backend
    }
    return canAddUser(limits);
  }, [limits]);

  return {
    features,
    limits,
    subscription,
    plan,
    hasFeature,
    canAddProduct: checkCanAddProduct,
    canAddUser: checkCanAddUser,
    isLoading,
    error,
    refresh: loadData,
  };
}

// Export dos defaults para uso em outros lugares
export { FREE_PLAN_FEATURES };

import { ReactNode } from 'react';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { UpgradePrompt } from './UpgradePrompt';
import type { PlanFeatures } from '../../types';

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showLoading = true,
}: FeatureGateProps) {
  const { hasFeature, isLoading } = usePlanFeatures();

  // Mostrar loading enquanto carrega
  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Se tem a feature, renderiza o children
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Se nao tem a feature, mostra o fallback ou UpgradePrompt
  return <>{fallback || <UpgradePrompt feature={feature} />}</>;
}

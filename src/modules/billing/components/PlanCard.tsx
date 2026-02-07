import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import { Card, Button, Badge } from '../../../components/ui';
import type { Plan } from '../../../types';

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  onSelect: () => void;
  billingCycle?: 'MONTHLY' | 'YEARLY';
}

const featureLabels: Record<keyof Plan['features'], string> = {
  whatsapp_notifications: 'WhatsApp',
  advanced_reports: 'Relatorios',
  multiple_users: 'Multi-usuarios',
  promotions: 'Promocoes',
  loyalty_program: 'Fidelidade',
  coupons: 'Cupons',
};

export function PlanCard({
  plan,
  isCurrentPlan,
  onSelect,
  billingCycle = 'MONTHLY',
}: PlanCardProps) {
  const price = billingCycle === 'YEARLY' && plan.price_yearly
    ? plan.price_yearly / 12
    : plan.price_monthly;

  const isPopular = plan.name === 'pro';
  const isFree = plan.name === 'free';

  // Determinar o estilo do card baseado no estado
  const getCardStyle = () => {
    if (isCurrentPlan && isPopular) {
      return 'ring-2 ring-primary-500 shadow-lg';
    }
    if (isPopular) {
      return 'ring-2 ring-primary-500 shadow-lg';
    }
    if (isCurrentPlan) {
      return 'ring-2 ring-green-500';
    }
    return 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600';
  };

  return (
    <Card
      className={`relative flex flex-col h-full transition-all ${getCardStyle()}`}
      padding="none"
    >
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Badge */}
        {(isPopular || isCurrentPlan) && (
          <div className="flex justify-center mb-2">
            {isCurrentPlan && (
              <Badge variant="success" className="whitespace-nowrap text-xs px-3 py-1">
                Plano Atual
              </Badge>
            )}
            {isPopular && !isCurrentPlan && (
              <Badge variant="info" className="flex items-center gap-1 whitespace-nowrap text-xs px-3 py-1">
                <StarIcon className="w-3 h-3" />
                Popular
              </Badge>
            )}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {plan.display_name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {plan.description}
          </p>
        </div>

        {/* Price */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">R$</span>
            <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {Math.floor(price)}
            </span>
            {!isFree && (
              <span className="text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400">
                ,{String(Math.round((price % 1) * 100)).padStart(2, '0')}
              </span>
            )}
            {!isFree && (
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">/mes</span>
            )}
          </div>
          {billingCycle === 'YEARLY' && plan.price_yearly && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              R$ {plan.price_yearly.toFixed(2)}/ano
            </p>
          )}
        </div>

        {/* Limits */}
        <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5 text-xs sm:text-sm border-t border-b border-gray-100 dark:border-gray-800 py-3 sm:py-4">
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Produtos</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {plan.product_limit || 'Ilimitado'}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Usuarios</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {plan.user_limit || 'Ilimitado'}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Storage</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {plan.storage_limit_mb
                ? plan.storage_limit_mb >= 1000
                  ? `${(plan.storage_limit_mb / 1000).toFixed(0)} GB`
                  : `${plan.storage_limit_mb} MB`
                : 'Ilimitado'}
            </span>
          </div>
        </div>

        {/* Features - mostrar apenas algumas principais */}
        <div className="space-y-1.5 flex-1 text-xs sm:text-sm">
          {Object.entries(plan.features)
            .filter(([key]) => ['whatsapp_notifications', 'promotions', 'coupons', 'loyalty_program'].includes(key))
            .map(([key, enabled]) => (
            <div
              key={key}
              className={`flex items-center gap-1.5 ${
                enabled
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {enabled ? (
                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <CloseIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
              )}
              <span className={!enabled ? 'line-through' : ''}>
                {featureLabels[key as keyof Plan['features']]}
              </span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-4 sm:mt-5">
          {isCurrentPlan ? (
            <Button variant="outline" fullWidth disabled size="sm">
              Plano Atual
            </Button>
          ) : isFree ? (
            <Button variant="outline" fullWidth disabled size="sm">
              Gratuito
            </Button>
          ) : (
            <Button
              variant={isPopular ? 'primary' : 'outline'}
              fullWidth
              onClick={onSelect}
              size="sm"
            >
              Selecionar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

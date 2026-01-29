import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Card, Button, Badge } from '../../../components/ui';
import type { Plan, Subscription } from '../../../types';

interface CurrentPlanCardProps {
  plan: Plan | null;
  subscription: Subscription | null;
  onUpgrade: () => void;
}

const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  overdue: 'danger',
  canceled: 'default',
  expired: 'default',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  overdue: 'Em Atraso',
  canceled: 'Cancelado',
  expired: 'Expirado',
};

const cycleLabels: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY: 'Anual',
};

export function CurrentPlanCard({ plan, subscription, onUpgrade }: CurrentPlanCardProps) {
  const isFree = !subscription || plan?.name === 'free';

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <RocketLaunchIcon className="w-5 h-5 text-primary-500" />
          Plano Atual
        </h3>
        {subscription && (
          <Badge variant={statusColors[subscription.status] || 'default'}>
            {statusLabels[subscription.status] || subscription.status}
          </Badge>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan?.display_name || 'Gratuito'}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {plan?.description || 'Plano basico gratuito'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              R$ {subscription?.price?.toFixed(2) || '0,00'}
            </p>
            {subscription && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                /{cycleLabels[subscription.billing_cycle]?.toLowerCase() || 'mes'}
              </p>
            )}
          </div>
        </div>

        {/* Plan Limits */}
        <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan?.product_limit || '∞'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Produtos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan?.user_limit || '∞'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Usuarios</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan?.storage_limit_mb
                ? plan.storage_limit_mb >= 1000
                  ? `${(plan.storage_limit_mb / 1000).toFixed(0)}GB`
                  : `${plan.storage_limit_mb}MB`
                : '∞'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Storage</p>
          </div>
        </div>

        {/* Subscription Details */}
        {subscription && (
          <div className="mt-4 space-y-2">
            {subscription.next_due_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CalendarTodayIcon className="w-4 h-4" />
                <span>
                  Proxima cobranca:{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(subscription.next_due_date).toLocaleDateString('pt-BR')}
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <AutorenewIcon className="w-4 h-4" />
              <span>
                Ciclo:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {cycleLabels[subscription.billing_cycle] || subscription.billing_cycle}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Upgrade Button */}
        <div className="mt-6">
          <Button
            variant={isFree ? 'primary' : 'outline'}
            fullWidth
            onClick={onUpgrade}
          >
            {isFree ? 'Fazer Upgrade' : 'Alterar Plano'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

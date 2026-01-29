import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import CloudIcon from '@mui/icons-material/Cloud';
import WarningIcon from '@mui/icons-material/Warning';
import { Card } from '../../../components/ui';
import type { Plan } from '../../../types';
import type { UsageLimits } from '../../../services/asaas';

interface UsageCardProps {
  usage: UsageLimits;
  plan: Plan | null;
}

interface UsageBarProps {
  label: string;
  used: number;
  limit: number | null;
  icon: React.ReactNode;
  unit?: string;
}

function UsageBar({ label, used, limit, icon, unit = '' }: UsageBarProps) {
  const percentage = limit ? Math.min((used / limit) * 100, 100) : 0;
  const isUnlimited = limit === null;
  const isNearLimit = limit && percentage >= 80;
  const isAtLimit = limit && percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isNearLimit && !isAtLimit && (
            <WarningIcon className="w-4 h-4 text-yellow-500" />
          )}
          {isAtLimit && (
            <WarningIcon className="w-4 h-4 text-red-500" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {used}{unit}
            {!isUnlimited && (
              <span className="text-gray-500 dark:text-gray-400">
                {' '}/ {limit}{unit}
              </span>
            )}
            {isUnlimited && (
              <span className="text-gray-500 dark:text-gray-400"> / Ilimitado</span>
            )}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-yellow-500'
              : 'bg-primary-500'
          }`}
          style={{ width: isUnlimited ? '10%' : `${percentage}%` }}
        />
      </div>

      {/* Warning Message */}
      {isAtLimit && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Limite atingido! Faca upgrade para continuar.
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Proximo do limite. Considere fazer upgrade.
        </p>
      )}
    </div>
  );
}

export function UsageCard({ usage, plan }: UsageCardProps) {
  return (
    <Card>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Uso do Plano
        </h3>
      </div>

      <div className="p-4 space-y-6">
        <UsageBar
          label="Produtos"
          used={usage.products.used}
          limit={usage.products.limit}
          icon={<InventoryIcon className="w-4 h-4" />}
        />

        <UsageBar
          label="Usuarios"
          used={usage.users.used}
          limit={usage.users.limit}
          icon={<PeopleIcon className="w-4 h-4" />}
        />

        <UsageBar
          label="Armazenamento"
          used={usage.storage.used}
          limit={usage.storage.limit}
          icon={<CloudIcon className="w-4 h-4" />}
          unit=" MB"
        />
      </div>
    </Card>
  );
}

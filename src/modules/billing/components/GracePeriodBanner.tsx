import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';
import type { GracePeriodInfo } from '../../../hooks/usePlanFeatures';

interface GracePeriodBannerProps {
  gracePeriod: GracePeriodInfo;
  planName?: string;
}

export function GracePeriodBanner({ gracePeriod, planName }: GracePeriodBannerProps) {
  const navigate = useNavigate();
  const { currentCompany } = useTenant();

  if (!gracePeriod.isInGracePeriod) return null;

  const days = gracePeriod.daysUntilDowngrade ?? 0;
  const hoursLeft = gracePeriod.gracePeriodEndsAt
    ? Math.max(0, Math.ceil((gracePeriod.gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  const timeText = days >= 1
    ? `${days} dia${days > 1 ? 's' : ''}`
    : `${hoursLeft} hora${hoursLeft > 1 ? 's' : ''}`;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <WarningAmberIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Pagamento pendente.</strong> Voce tem {timeText} para regularizar antes de perder os recursos do plano {planName || 'atual'}.
          </p>
        </div>
        <button
          onClick={() => navigate(`/app/${currentCompany?.slug}/faturamento`)}
          className="flex-shrink-0 text-sm font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700 px-3 py-1 rounded-lg transition-colors"
        >
          Regularizar
        </button>
      </div>
    </div>
  );
}

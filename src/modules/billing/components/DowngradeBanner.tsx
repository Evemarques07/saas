import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';
import type { UsageLimits } from '../../../services/asaas';

interface DowngradeBannerProps {
  limits: UsageLimits | null;
  previousPlanName?: string;
}

export function DowngradeBanner({ limits, previousPlanName }: DowngradeBannerProps) {
  const navigate = useNavigate();
  const { currentCompany } = useTenant();

  // Calcular excedentes
  const productsOver = limits?.products.limit !== null && limits
    ? Math.max(0, limits.products.used - (limits.products.limit ?? Infinity))
    : 0;

  const details: string[] = [];
  if (productsOver > 0) details.push(`${productsOver} produto${productsOver > 1 ? 's' : ''} desabilitado${productsOver > 1 ? 's' : ''}`);

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ErrorOutlineIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Plano reduzido para Gratis.</strong>
            {details.length > 0 && ` Voce tem ${details.join(' e ')}.`}
            {' '}Faca upgrade para recuperar seus recursos.
          </p>
        </div>
        <button
          onClick={() => navigate(`/app/${currentCompany?.slug}/faturamento`)}
          className="flex-shrink-0 text-sm font-medium text-red-800 dark:text-red-200 bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 px-3 py-1 rounded-lg transition-colors"
        >
          Fazer Upgrade
        </button>
      </div>
    </div>
  );
}

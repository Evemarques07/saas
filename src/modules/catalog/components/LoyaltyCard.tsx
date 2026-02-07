import StarsIcon from '@mui/icons-material/Stars';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useCatalogCustomer } from '../../../contexts/CatalogCustomerContext';

export function LoyaltyCard() {
  const { customerLoyalty, loyaltyConfig, loyaltyLevels } = useCatalogCustomer();

  if (!loyaltyConfig?.enabled || !customerLoyalty) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <StarsIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Programa de fidelidade não disponível</p>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  // Calculate progress to next level
  const progressToNextLevel = customerLoyalty.next_level
    ? ((customerLoyalty.lifetime_points - (customerLoyalty.level?.min_points || 0)) /
        (customerLoyalty.next_level.min_points - (customerLoyalty.level?.min_points || 0))) *
      100
    : 100;

  return (
    <div className="p-4 space-y-6">
      {/* Points Balance Card */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{
          background: customerLoyalty.level?.color
            ? `linear-gradient(135deg, ${customerLoyalty.level.color}, ${customerLoyalty.level.color}dd)`
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        }}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

        <div className="relative">
          {/* Level badge */}
          {customerLoyalty.level && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
              <StarsIcon className="w-4 h-4" />
              {customerLoyalty.level.name}
            </div>
          )}

          {/* Points */}
          <div className="mb-4">
            <p className="text-white/80 text-sm">Seus Pontos</p>
            <p className="text-4xl font-bold">{customerLoyalty.points.toLocaleString('pt-BR')}</p>
          </div>

          {/* Points value */}
          <div className="flex items-center gap-2 text-white/90">
            <CardGiftcardIcon className="w-5 h-5" />
            <span>Vale {formatCurrency(customerLoyalty.points_value)} em descontos</span>
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {customerLoyalty.next_level && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Próximo nível: <span className="font-medium">{customerLoyalty.next_level.name}</span>
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {customerLoyalty.points_to_next_level.toLocaleString('pt-BR')} pts restantes
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progressToNextLevel, 100)}%`,
                backgroundColor: customerLoyalty.next_level.color || '#6366f1',
              }}
            />
          </div>

          {/* Lifetime points */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {customerLoyalty.lifetime_points.toLocaleString('pt-BR')} pontos acumulados no total
          </p>
        </div>
      )}

      {/* Level benefits */}
      {customerLoyalty.level?.benefits && customerLoyalty.level.benefits.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4" />
            Benefícios do seu nível
          </h4>
          <ul className="space-y-2">
            {customerLoyalty.level.benefits.map((benefit, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: customerLoyalty.level?.color || '#6366f1' }}
                />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All levels */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Níveis de Fidelidade
        </h4>
        <div className="space-y-2">
          {loyaltyLevels.map((level) => {
            const isCurrentLevel = level.id === customerLoyalty.level?.id;
            const isUnlocked = customerLoyalty.lifetime_points >= level.min_points;

            return (
              <div
                key={level.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isCurrentLevel
                    ? 'border-2'
                    : isUnlocked
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 opacity-60'
                }`}
                style={
                  isCurrentLevel
                    ? { borderColor: level.color, backgroundColor: `${level.color}10` }
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: level.color }}
                  />
                  <span
                    className={`font-medium ${
                      isCurrentLevel ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {level.name}
                  </span>
                  {isCurrentLevel && (
                    <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
                      Atual
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {level.min_points.toLocaleString('pt-BR')} pts
                  </span>
                  {level.points_multiplier > 1 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {level.points_multiplier}x pontos
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
        <h4 className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
          Como funciona?
        </h4>
        <ul className="text-sm text-primary-600 dark:text-primary-400 space-y-1">
          <li>
            Ganhe {loyaltyConfig.points_per_real} ponto(s) a cada R$ 1 em compras
          </li>
          <li>
            Cada ponto vale {formatCurrency(loyaltyConfig.points_value)} em desconto
          </li>
          <li>
            Mínimo de {loyaltyConfig.min_points_redeem} pontos para resgatar
          </li>
          <li>
            Desconto máximo de {loyaltyConfig.max_discount_percent}% por pedido
          </li>
        </ul>
      </div>
    </div>
  );
}

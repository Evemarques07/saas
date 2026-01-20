import { useState, useEffect } from 'react';
import StarsIcon from '@mui/icons-material/Stars';
import { CustomerLoyalty, LoyaltyConfig } from '../../../types';

interface PointsRedeemSliderProps {
  customerLoyalty: CustomerLoyalty;
  loyaltyConfig: LoyaltyConfig;
  orderValue: number;
  onPointsChange: (points: number, discount: number) => void;
  initialPoints?: number;
}

export function PointsRedeemSlider({
  customerLoyalty,
  loyaltyConfig,
  orderValue,
  onPointsChange,
  initialPoints = 0,
}: PointsRedeemSliderProps) {
  const [pointsToUse, setPointsToUse] = useState(initialPoints);

  // Calculate max points usable
  const maxDiscountFromPercent = orderValue * (loyaltyConfig.max_discount_percent / 100);
  const maxDiscountFromPoints = customerLoyalty.points * loyaltyConfig.points_value;
  const maxDiscount = Math.min(maxDiscountFromPercent, maxDiscountFromPoints, orderValue);
  const maxPointsUsable = Math.floor(maxDiscount / loyaltyConfig.points_value);

  // Can only use points if above minimum
  const canUsePoints = customerLoyalty.points >= loyaltyConfig.min_points_redeem;

  useEffect(() => {
    const discount = pointsToUse * loyaltyConfig.points_value;
    onPointsChange(pointsToUse, discount);
  }, [pointsToUse, loyaltyConfig.points_value, onPointsChange]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  if (!canUsePoints) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <StarsIcon className="w-5 h-5" />
          <div>
            <p className="text-sm">
              Você tem <span className="font-medium">{customerLoyalty.points}</span> pontos
            </p>
            <p className="text-xs">
              Mínimo de {loyaltyConfig.min_points_redeem} pontos para usar
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentDiscount = pointsToUse * loyaltyConfig.points_value;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarsIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Usar Pontos de Fidelidade
          </span>
        </div>
        <span className="text-sm text-amber-600 dark:text-amber-400">
          Disponível: {customerLoyalty.points.toLocaleString('pt-BR')} pts
        </span>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={maxPointsUsable}
          step={1}
          value={pointsToUse}
          onChange={(e) => setPointsToUse(parseInt(e.target.value))}
          className="w-full h-2 bg-amber-200 dark:bg-amber-800 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-amber-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-amber-600
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
        />

        <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
          <span>0 pts</span>
          <span>{maxPointsUsable.toLocaleString('pt-BR')} pts</span>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-700">
        <div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Usando <span className="font-bold">{pointsToUse.toLocaleString('pt-BR')}</span> pontos
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Restam {(customerLoyalty.points - pointsToUse).toLocaleString('pt-BR')} pontos
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
            -{formatCurrency(currentDiscount)}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPointsToUse(0)}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
        >
          Não usar
        </button>
        <button
          type="button"
          onClick={() => setPointsToUse(Math.floor(maxPointsUsable / 2))}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
        >
          Usar metade
        </button>
        <button
          type="button"
          onClick={() => setPointsToUse(maxPointsUsable)}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
        >
          Usar máximo
        </button>
      </div>
    </div>
  );
}

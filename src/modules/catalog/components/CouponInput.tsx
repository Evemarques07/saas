import { useState } from 'react';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { Button, Input } from '../../../components/ui';
import { Coupon, CouponValidation } from '../../../types';

interface CouponInputProps {
  onValidate: (code: string, orderValue: number) => Promise<CouponValidation>;
  orderValue: number;
  onApply: (coupon: Coupon, discount: number) => void;
  onRemove: () => void;
  appliedCoupon: Coupon | null;
  appliedDiscount: number;
}

export function CouponInput({
  onValidate,
  orderValue,
  onApply,
  onRemove,
  appliedCoupon,
  appliedDiscount,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Digite o código do cupom');
      return;
    }

    setValidating(true);
    setError(null);

    const result = await onValidate(code.trim(), orderValue);

    setValidating(false);

    if (result.valid && result.coupon) {
      onApply(result.coupon, result.discount);
      setCode('');
    } else {
      setError(result.error || 'Cupom inválido');
    }
  };

  const handleRemove = () => {
    onRemove();
    setCode('');
    setError(null);
  };

  // If coupon is applied, show applied state
  if (appliedCoupon) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Cupom aplicado: {appliedCoupon.code}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {appliedCoupon.discount_type === 'percentage'
                  ? `${appliedCoupon.discount_value}% de desconto`
                  : `${formatCurrency(appliedCoupon.discount_value)} de desconto`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-700 dark:text-green-300">
              -{formatCurrency(appliedDiscount)}
            </span>
            <button
              onClick={handleRemove}
              className="p-1 hover:bg-green-100 dark:hover:bg-green-800/30 rounded transition-colors"
            >
              <CloseIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Código do cupom"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            leftIcon={<LocalOfferIcon className="w-5 h-5" />}
            error={error || undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
          />
        </div>
        <Button
          onClick={handleApply}
          loading={validating}
          disabled={!code.trim()}
          variant="secondary"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}

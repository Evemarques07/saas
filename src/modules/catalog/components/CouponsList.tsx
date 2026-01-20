import { useEffect, useState } from 'react';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useCatalogCustomer } from '../../../contexts/CatalogCustomerContext';
import { Coupon } from '../../../types';
import toast from 'react-hot-toast';

export function CouponsList() {
  const { getAvailableCoupons, customer } = useCatalogCustomer();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    const data = await getAvailableCoupons();
    setCoupons(data);
    setLoading(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Código copiado!');

    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const getDiscountText = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `${formatCurrency(coupon.discount_value)} OFF`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <LocalOfferIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Nenhum cupom disponível
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Fique atento às novidades! Cupons de desconto aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Copie o código e aplique no checkout
      </p>

      {coupons.map((coupon) => {
        const isExpiringSoon =
          coupon.valid_until &&
          new Date(coupon.valid_until).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

        const cannotUse = !!(
          coupon.first_purchase_only && customer && customer.total_orders > 0
        );

        return (
          <div
            key={coupon.id}
            className={`border rounded-xl overflow-hidden ${
              cannotUse
                ? 'border-gray-200 dark:border-gray-700 opacity-60'
                : 'border-primary-200 dark:border-primary-800'
            }`}
          >
            {/* Coupon header */}
            <div
              className={`px-4 py-3 flex items-center justify-between ${
                cannotUse
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : 'bg-primary-50 dark:bg-primary-900/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <LocalOfferIcon
                  className={`w-5 h-5 ${
                    cannotUse
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-primary-600 dark:text-primary-400'
                  }`}
                />
                <span
                  className={`font-bold text-lg ${
                    cannotUse
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-primary-600 dark:text-primary-400'
                  }`}
                >
                  {getDiscountText(coupon)}
                </span>
              </div>

              {isExpiringSoon && !cannotUse && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <AccessTimeIcon className="w-3 h-3" />
                  Expira em breve
                </span>
              )}
            </div>

            {/* Coupon body */}
            <div className="px-4 py-3 bg-white dark:bg-gray-800">
              {coupon.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {coupon.description}
                </p>
              )}

              {/* Coupon code */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    {coupon.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(coupon.code)}
                    disabled={cannotUse}
                    className={`p-1.5 rounded-md transition-colors ${
                      cannotUse
                        ? 'text-gray-400 cursor-not-allowed'
                        : copiedCode === coupon.code
                          ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                          : 'text-gray-500 hover:text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                    }`}
                  >
                    {copiedCode === coupon.code ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <ContentCopyIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Conditions */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {coupon.min_order_value > 0 && (
                  <p>Pedido mínimo: {formatCurrency(coupon.min_order_value)}</p>
                )}
                {coupon.max_discount && coupon.discount_type === 'percentage' && (
                  <p>Desconto máximo: {formatCurrency(coupon.max_discount)}</p>
                )}
                {coupon.first_purchase_only && (
                  <p className={cannotUse ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                    {cannotUse ? 'Apenas para primeira compra (você já fez pedidos)' : 'Apenas para primeira compra'}
                  </p>
                )}
                {coupon.valid_until && (
                  <p>Válido até: {formatDate(coupon.valid_until)}</p>
                )}
                {coupon.usage_limit && (
                  <p>
                    Restam {coupon.usage_limit - coupon.usage_count} usos
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

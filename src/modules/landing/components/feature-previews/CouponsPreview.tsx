import { useState } from 'react';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  uses: number;
  maxUses: number;
  active: boolean;
  expired?: boolean;
}

const initialCoupons: Coupon[] = [
  { id: 1, code: 'BEMVINDO10', type: 'percent', value: 10, uses: 23, maxUses: 100, active: true },
  { id: 2, code: 'FRETE50', type: 'fixed', value: 50, uses: 5, maxUses: 10, active: true },
  { id: 3, code: 'NATAL2024', type: 'percent', value: 15, uses: 45, maxUses: 50, active: false, expired: true },
  { id: 4, code: 'VIP20', type: 'percent', value: 20, uses: 8, maxUses: 20, active: true },
];

export function CouponsPreview() {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    maxUses: '',
  });

  const handleCopy = (coupon: Coupon) => {
    navigator.clipboard.writeText(coupon.code);
    setCopiedId(coupon.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggle = (id: number) => {
    setCoupons(coupons.map(c =>
      c.id === id ? { ...c, active: !c.active } : c
    ));
  };

  const handleCreate = () => {
    if (!newCoupon.code || !newCoupon.value || !newCoupon.maxUses) return;

    const coupon: Coupon = {
      id: Date.now(),
      code: newCoupon.code.toUpperCase(),
      type: newCoupon.type,
      value: parseInt(newCoupon.value),
      uses: 0,
      maxUses: parseInt(newCoupon.maxUses),
      active: true,
    };

    setCoupons([coupon, ...coupons]);
    setShowCreate(false);
    setNewCoupon({ code: '', type: 'percent', value: '', maxUses: '' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Seus Cupons</h3>
          <p className="text-xs text-gray-500">{coupons.filter(c => c.active).length} ativos</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <AddIcon className="h-4 w-4" />
          Novo
        </button>
      </div>

      {/* Coupon List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all ${
              coupon.expired
                ? 'border-gray-200 dark:border-gray-700 opacity-60'
                : coupon.active
                ? 'border-indigo-200 dark:border-indigo-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* Coupon Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${
              coupon.expired
                ? 'bg-gray-100 dark:bg-gray-800'
                : coupon.active
                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
                : 'bg-gray-50 dark:bg-gray-800/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  coupon.type === 'percent'
                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                    : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                }`}>
                  {coupon.type === 'percent' ? (
                    <PercentIcon className="h-5 w-5" />
                  ) : (
                    <AttachMoneyIcon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => handleCopy(coupon)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {copiedId === coupon.id ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <ContentCopyIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    {coupon.type === 'percent' ? `${coupon.value}% off` : `R$ ${coupon.value} off`}
                  </p>
                </div>
              </div>

              {!coupon.expired && (
                <button
                  onClick={() => handleToggle(coupon.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    coupon.active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      coupon.active ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Coupon Stats */}
            <div className="px-4 py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{coupon.uses}</span>
                  /{coupon.maxUses} usos
                </span>
              </div>
              {coupon.expired && (
                <span className="text-xs font-medium text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                  Expirado
                </span>
              )}
              {!coupon.expired && coupon.uses >= coupon.maxUses && (
                <span className="text-xs font-medium text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                  Limite atingido
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-gray-700">
              <div
                className={`h-full transition-all ${
                  coupon.uses >= coupon.maxUses ? 'bg-orange-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${(coupon.uses / coupon.maxUses) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 w-[90%] max-w-sm animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LocalOfferIcon className="h-5 w-5 text-indigo-500" />
                Novo Cupom
              </h4>
              <button
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Code */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                  Codigo do cupom
                </label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: DESCONTO20"
                  className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                  Tipo de desconto
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewCoupon({ ...newCoupon, type: 'percent' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                      newCoupon.type === 'percent'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <PercentIcon className="h-4 w-4" />
                    Porcentagem
                  </button>
                  <button
                    onClick={() => setNewCoupon({ ...newCoupon, type: 'fixed' })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                      newCoupon.type === 'fixed'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <AttachMoneyIcon className="h-4 w-4" />
                    Valor Fixo
                  </button>
                </div>
              </div>

              {/* Value and Max Uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                    {newCoupon.type === 'percent' ? 'Porcentagem' : 'Valor (R$)'}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                    placeholder={newCoupon.type === 'percent' ? '10' : '50'}
                    className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                    Limite de usos
                  </label>
                  <input
                    type="number"
                    value={newCoupon.maxUses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                    placeholder="100"
                    className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!newCoupon.code || !newCoupon.value || !newCoupon.maxUses}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
              >
                Criar Cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

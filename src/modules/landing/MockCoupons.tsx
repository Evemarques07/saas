import { useState, useEffect } from 'react';

// Dados mockados de cupons
const mockCoupons = [
  {
    id: 1,
    code: 'DESCONTO20',
    description: 'Desconto de boas-vindas',
    discountType: 'percentage',
    discountValue: 20,
    usageCount: 156,
    usageLimit: 500,
    validUntil: '2026-02-28',
    isActive: true,
  },
  {
    id: 2,
    code: 'FRETE10',
    description: 'Frete com desconto',
    discountType: 'fixed',
    discountValue: 10,
    usageCount: 89,
    usageLimit: 200,
    validUntil: '2026-03-15',
    isActive: true,
  },
  {
    id: 3,
    code: 'PROMO50',
    description: 'Super promoção de verão',
    discountType: 'percentage',
    discountValue: 50,
    usageCount: 234,
    usageLimit: 300,
    validUntil: '2026-01-31',
    isActive: true,
  },
  {
    id: 4,
    code: 'VIP15',
    description: 'Exclusivo clientes VIP',
    discountType: 'percentage',
    discountValue: 15,
    usageCount: 45,
    usageLimit: 100,
    validUntil: '2026-04-30',
    isActive: true,
  },
];

// Notificação de cupom usado
function FloatingCouponUsed({ show, coupon }: { show: boolean; coupon: string }) {
  if (!show) return null;

  return (
    <div
      className={`absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-2xl p-3 flex items-center gap-3 z-30 max-w-[200px] transform transition-all duration-700 ease-out ${
        show ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{
        animation: show ? 'slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/90 font-semibold">Cupom Usado!</p>
        <p className="text-[9px] text-white/70 font-mono">{coupon}</p>
      </div>
    </div>
  );
}

// Notificação de novo cupom criado
function FloatingNewCoupon({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      className={`absolute bottom-4 left-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-2xl p-3 flex items-center gap-3 z-30 max-w-[200px] transform transition-all duration-700 ease-out ${
        show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}
      style={{
        animation: show ? 'slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/90 font-semibold">Novo Cupom!</p>
        <p className="text-[9px] text-white/70">MEGA30 criado</p>
      </div>
    </div>
  );
}

// Componente de Card do Cupom
function CouponCard({ coupon, index, onCopy }: { coupon: typeof mockCoupons[0]; index: number; onCopy: (code: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const usagePercent = (coupon.usageCount / coupon.usageLimit) * 100;

  const handleCopy = () => {
    onCopy(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div
      className={`relative bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transform transition-all duration-500 ease-out ${
        isHovered ? 'shadow-xl scale-[1.02] -translate-y-1' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`,
        opacity: 0,
      }}
    >
      {/* Ticket edge decoration */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-gray-100 rounded-r-full" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-gray-100 rounded-l-full" />

      <div className="p-3 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm text-indigo-600">{coupon.code}</span>
              <button
                onClick={handleCopy}
                className={`p-1 rounded transition-all duration-300 ${
                  copied ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400'
                }`}
              >
                {copied ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[9px] text-gray-500 mt-0.5">{coupon.description}</p>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[8px] font-semibold ${
            coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {coupon.isActive ? 'Ativo' : 'Inativo'}
          </div>
        </div>

        {/* Discount Value */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)}
          </span>
          <span className="text-[10px] text-gray-500">de desconto</span>
        </div>

        {/* Usage Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[8px] text-gray-500 mb-1">
            <span>Uso: {coupon.usageCount}/{coupon.usageLimit}</span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[8px] text-gray-400">
          <span>Válido até {new Date(coupon.validUntil).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
}

export function MockCoupons() {
  const [showUsedNotification, setShowUsedNotification] = useState(false);
  const [showNewNotification, setShowNewNotification] = useState(false);
  const [lastUsedCoupon, setLastUsedCoupon] = useState('');

  // Mostrar notificações periodicamente
  useEffect(() => {
    const showUsed = () => {
      const randomCoupon = mockCoupons[Math.floor(Math.random() * mockCoupons.length)];
      setLastUsedCoupon(randomCoupon.code);
      setShowUsedNotification(true);
      setTimeout(() => setShowUsedNotification(false), 3500);
    };

    const showNew = () => {
      setShowNewNotification(true);
      setTimeout(() => setShowNewNotification(false), 3500);
    };

    // Primeira notificação após 2 segundos
    const initialTimeout = setTimeout(showUsed, 2000);

    // Alternar notificações
    const usedInterval = setInterval(showUsed, 7000);
    const newInterval = setInterval(showNew, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(usedInterval);
      clearInterval(newInterval);
    };
  }, []);

  const handleCopy = (code: string) => {
    setLastUsedCoupon(code);
    setShowUsedNotification(true);
    setTimeout(() => setShowUsedNotification(false), 3000);
  };

  return (
    <div className="relative w-full h-full">
      {/* Browser Frame */}
      <div className="bg-gray-200 rounded-t-xl px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-gray-500 flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            mercadovirtual.app/cupons
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 rounded-b-xl overflow-hidden relative" style={{ height: 'calc(100% - 36px)' }}>
        {/* Notificações flutuantes */}
        <FloatingCouponUsed show={showUsedNotification} coupon={lastUsedCoupon} />
        <FloatingNewCoupon show={showNewNotification} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800">Cupons de Desconto</h1>
                <p className="text-[9px] text-gray-500">Gerencie seus cupons promocionais</p>
              </div>
            </div>
            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-[10px] font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Novo Cupom
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-3 py-2 grid grid-cols-3 gap-2">
          {[
            { label: 'Cupons Ativos', value: '4', color: 'text-green-600' },
            { label: 'Total Usado', value: '524', color: 'text-indigo-600' },
            { label: 'Economia Gerada', value: 'R$ 12.450', color: 'text-purple-600' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-2 border border-gray-100">
              <p className="text-[8px] text-gray-500">{stat.label}</p>
              <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Coupons Grid */}
        <div className="px-3 pb-3 overflow-auto" style={{ height: 'calc(100% - 130px)' }}>
          <div className="grid grid-cols-2 gap-2">
            {mockCoupons.map((coupon, index) => (
              <CouponCard key={coupon.id} coupon={coupon} index={index} onCopy={handleCopy} />
            ))}
          </div>
        </div>
      </div>

      {/* Estilos das animações */}
      <style>{`
        @keyframes slideInRight {
          0% {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          0% {
            transform: translateY(100%) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

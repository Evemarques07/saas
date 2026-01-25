import { useState, useEffect } from 'react';

// Dados mockados de promoções
const mockPromotions = [
  {
    id: 1,
    name: 'Aniversariante do Mês',
    type: 'birthday',
    icon: '🎂',
    discountType: 'percentage',
    discountValue: 15,
    usageCount: 89,
    isActive: true,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
  },
  {
    id: 2,
    name: 'Cliente VIP Gold',
    type: 'loyalty_level',
    icon: '⭐',
    discountType: 'percentage',
    discountValue: 20,
    usageCount: 156,
    isActive: true,
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-50',
  },
  {
    id: 3,
    name: 'Primeira Compra',
    type: 'first_purchase',
    icon: '🎉',
    discountType: 'percentage',
    discountValue: 10,
    usageCount: 234,
    isActive: true,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
  },
  {
    id: 4,
    name: 'Flash Sale 24h',
    type: 'flash_sale',
    icon: '⚡',
    discountType: 'percentage',
    discountValue: 30,
    usageCount: 67,
    isActive: true,
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
  },
  {
    id: 5,
    name: 'Reativação',
    type: 'reactivation',
    icon: '🔄',
    discountType: 'fixed',
    discountValue: 25,
    usageCount: 45,
    isActive: true,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 6,
    name: 'Categoria Skincare',
    type: 'category_discount',
    icon: '🧴',
    discountType: 'percentage',
    discountValue: 25,
    usageCount: 312,
    isActive: true,
    color: 'from-teal-500 to-emerald-500',
    bgColor: 'bg-teal-50',
  },
];

// Notificação de promoção aplicada
function FloatingPromoApplied({ show, promo }: { show: boolean; promo: typeof mockPromotions[0] | null }) {
  if (!show || !promo) return null;

  return (
    <div
      className={`absolute top-4 right-4 bg-white rounded-xl shadow-2xl p-3 flex items-center gap-3 z-30 max-w-[220px] border-l-4 transform transition-all duration-700 ease-out ${
        show ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{
        borderLeftColor: promo.type === 'birthday' ? '#ec4899' : promo.type === 'flash_sale' ? '#8b5cf6' : '#10b981',
        animation: show ? 'slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
      }}
    >
      <div className="text-2xl animate-bounce">{promo.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-green-600 font-semibold">Promoção Aplicada!</p>
        <p className="text-[9px] text-gray-600 truncate">{promo.name}</p>
        <p className="text-[10px] font-bold text-indigo-600">
          -{promo.discountType === 'percentage' ? `${promo.discountValue}%` : `R$ ${promo.discountValue}`}
        </p>
      </div>
    </div>
  );
}

// Contador regressivo para Flash Sale
function FlashSaleCounter() {
  const [time, setTime] = useState({ hours: 5, minutes: 47, seconds: 23 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1 text-[10px] font-mono">
      <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded">{String(time.hours).padStart(2, '0')}</span>
      <span className="text-gray-400">:</span>
      <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded">{String(time.minutes).padStart(2, '0')}</span>
      <span className="text-gray-400">:</span>
      <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded animate-pulse">{String(time.seconds).padStart(2, '0')}</span>
    </div>
  );
}

// Card de Promoção
function PromotionCard({ promo, index }: { promo: typeof mockPromotions[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transform transition-all duration-500 ease-out ${
        isHovered ? 'shadow-xl scale-[1.03] -translate-y-1' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.08}s forwards`,
        opacity: 0,
      }}
    >
      {/* Gradient Header */}
      <div className={`h-1.5 bg-gradient-to-r ${promo.color}`} />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${promo.bgColor} flex items-center justify-center text-lg transition-transform duration-300 ${isHovered ? 'scale-110 rotate-12' : ''}`}>
              {promo.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-800 leading-tight">{promo.name}</p>
              <p className="text-[8px] text-gray-500 capitalize">{promo.type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${promo.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xl font-extrabold bg-gradient-to-r ${promo.color} bg-clip-text text-transparent`}>
            {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `R$ ${promo.discountValue}`}
          </span>
          {promo.type === 'flash_sale' && <FlashSaleCounter />}
        </div>

        {/* Usage */}
        <div className="flex items-center justify-between text-[8px] text-gray-500">
          <span>{promo.usageCount} usos</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-medium ${
            promo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {promo.isActive ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MockPromotions() {
  const [showPromoNotification, setShowPromoNotification] = useState(false);
  const [currentPromo, setCurrentPromo] = useState<typeof mockPromotions[0] | null>(null);

  // Mostrar notificações periodicamente
  useEffect(() => {
    const showNotification = () => {
      const randomPromo = mockPromotions[Math.floor(Math.random() * mockPromotions.length)];
      setCurrentPromo(randomPromo);
      setShowPromoNotification(true);
      setTimeout(() => setShowPromoNotification(false), 4000);
    };

    // Primeira notificação após 2.5 segundos
    const initialTimeout = setTimeout(showNotification, 2500);

    // Repetir a cada 6 segundos
    const interval = setInterval(showNotification, 6000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

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
            mercadovirtual.app/promocoes
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 rounded-b-xl overflow-hidden relative" style={{ height: 'calc(100% - 36px)' }}>
        {/* Notificação flutuante */}
        <FloatingPromoApplied show={showPromoNotification} promo={currentPromo} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800">Promoções</h1>
                <p className="text-[9px] text-gray-500">Promoções automáticas para engajar</p>
              </div>
            </div>
            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-lg text-[10px] font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Nova
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-3 py-2 grid grid-cols-4 gap-2">
          {[
            { label: 'Ativas', value: '6', icon: '🚀' },
            { label: 'Usos Hoje', value: '47', icon: '📊' },
            { label: 'Economia', value: 'R$ 8.2k', icon: '💰' },
            { label: 'Conversão', value: '34%', icon: '📈' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-2 border border-gray-100 text-center">
              <span className="text-sm">{stat.icon}</span>
              <p className="text-xs font-bold text-gray-800">{stat.value}</p>
              <p className="text-[7px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Promotions Grid */}
        <div className="px-3 pb-3 overflow-auto" style={{ height: 'calc(100% - 130px)' }}>
          <div className="grid grid-cols-2 gap-2">
            {mockPromotions.map((promo, index) => (
              <PromotionCard key={promo.id} promo={promo} index={index} />
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

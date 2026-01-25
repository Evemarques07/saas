import { useState, useEffect } from 'react';

// Dados mockados de níveis de fidelidade
const mockLevels = [
  {
    id: 1,
    name: 'Bronze',
    minPoints: 0,
    multiplier: 1.0,
    color: '#CD7F32',
    benefits: ['Acumule 1 ponto por R$1', 'Ofertas exclusivas'],
    customersCount: 234,
  },
  {
    id: 2,
    name: 'Prata',
    minPoints: 500,
    multiplier: 1.5,
    color: '#C0C0C0',
    benefits: ['1.5x pontos', 'Frete grátis +R$100', 'Acesso antecipado'],
    customersCount: 156,
  },
  {
    id: 3,
    name: 'Ouro',
    minPoints: 2000,
    multiplier: 2.0,
    color: '#FFD700',
    benefits: ['2x pontos', 'Frete grátis sempre', 'Atendimento VIP', 'Brindes exclusivos'],
    customersCount: 89,
  },
  {
    id: 4,
    name: 'Diamante',
    minPoints: 5000,
    multiplier: 3.0,
    color: '#B9F2FF',
    benefits: ['3x pontos', 'Tudo do Ouro', 'Produtos exclusivos', 'Convites eventos'],
    customersCount: 23,
  },
];

// Dados mockados de clientes top
const mockTopCustomers = [
  { name: 'Maria Silva', points: 8450, level: 'Diamante', avatar: '👩' },
  { name: 'João Santos', points: 6230, level: 'Diamante', avatar: '👨' },
  { name: 'Ana Oliveira', points: 4890, level: 'Ouro', avatar: '👩‍🦰' },
  { name: 'Carlos Lima', points: 3210, level: 'Ouro', avatar: '👨‍🦱' },
];

// Notificação de pontos ganhos
function FloatingPointsEarned({ show, points, customer }: { show: boolean; points: number; customer: string }) {
  if (!show) return null;

  return (
    <div
      className={`absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-xl shadow-2xl p-3 flex items-center gap-3 z-30 max-w-[200px] transform transition-all duration-700 ease-out ${
        show ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{
        animation: show ? 'slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xl animate-bounce">⭐</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white font-semibold">+{points} Pontos!</p>
        <p className="text-[9px] text-white/80">{customer}</p>
      </div>
    </div>
  );
}

// Notificação de level up
function FloatingLevelUp({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      className={`absolute bottom-4 left-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-2xl p-3 flex items-center gap-3 z-30 max-w-[200px] transform transition-all duration-700 ease-out ${
        show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}
      style={{
        animation: show ? 'slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xl animate-pulse">🎉</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white font-semibold">Level Up!</p>
        <p className="text-[9px] text-white/80">Paula → Ouro</p>
      </div>
    </div>
  );
}

// Animação de contador de pontos
function AnimatedPoints({ points }: { points: number }) {
  const [displayPoints, setDisplayPoints] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = points / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= points) {
        setDisplayPoints(points);
        clearInterval(timer);
      } else {
        setDisplayPoints(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [points]);

  return <span>{displayPoints.toLocaleString('pt-BR')}</span>;
}

// Card de Nível
function LevelCard({ level, index }: { level: typeof mockLevels[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative bg-white rounded-xl overflow-hidden shadow-sm border-2 transform transition-all duration-500 ease-out ${
        isHovered ? 'shadow-xl scale-[1.03] -translate-y-1' : ''
      }`}
      style={{
        borderColor: level.color,
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`,
        opacity: 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with color */}
      <div
        className="h-2"
        style={{ background: `linear-gradient(to right, ${level.color}, ${level.color}88)` }}
      />

      <div className="p-3">
        {/* Level Info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-transform duration-300"
              style={{
                background: `linear-gradient(135deg, ${level.color}, ${level.color}99)`,
                transform: isHovered ? 'scale(1.1) rotate(10deg)' : 'scale(1)'
              }}
            >
              {level.name[0]}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">{level.name}</p>
              <p className="text-[8px] text-gray-500">{level.minPoints.toLocaleString('pt-BR')}+ pts</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold" style={{ color: level.color }}>{level.multiplier}x</p>
            <p className="text-[7px] text-gray-400">pontos</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-1 mb-2">
          {level.benefits.slice(0, 2).map((benefit, i) => (
            <div key={i} className="flex items-center gap-1 text-[8px] text-gray-600">
              <svg className="w-2.5 h-2.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        {/* Customers Count */}
        <div className="flex items-center justify-between text-[8px] text-gray-400 pt-2 border-t border-gray-100">
          <span>{level.customersCount} clientes</span>
          <div className="flex -space-x-1">
            {[...Array(Math.min(3, level.customersCount))].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-white text-[8px] flex items-center justify-center"
                style={{ backgroundColor: `${level.color}30` }}
              >
                {['👤', '👤', '👤'][i]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MockLoyalty() {
  const [showPointsNotification, setShowPointsNotification] = useState(false);
  const [showLevelUpNotification, setShowLevelUpNotification] = useState(false);
  const [notificationPoints, setNotificationPoints] = useState(0);
  const [notificationCustomer, setNotificationCustomer] = useState('');

  // Mostrar notificações periodicamente
  useEffect(() => {
    const showPoints = () => {
      const points = Math.floor(Math.random() * 200) + 50;
      const customers = ['Maria S.', 'João P.', 'Ana L.', 'Carlos M.', 'Paula R.'];
      setNotificationPoints(points);
      setNotificationCustomer(customers[Math.floor(Math.random() * customers.length)]);
      setShowPointsNotification(true);
      setTimeout(() => setShowPointsNotification(false), 3500);
    };

    const showLevelUp = () => {
      setShowLevelUpNotification(true);
      setTimeout(() => setShowLevelUpNotification(false), 4000);
    };

    // Primeira notificação após 2 segundos
    const initialTimeout = setTimeout(showPoints, 2000);

    // Alternar notificações
    const pointsInterval = setInterval(showPoints, 5000);
    const levelUpInterval = setInterval(showLevelUp, 12000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pointsInterval);
      clearInterval(levelUpInterval);
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
            mercadovirtual.app/fidelidade
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 rounded-b-xl overflow-hidden relative" style={{ height: 'calc(100% - 36px)' }}>
        {/* Notificações flutuantes */}
        <FloatingPointsEarned show={showPointsNotification} points={notificationPoints} customer={notificationCustomer} />
        <FloatingLevelUp show={showLevelUpNotification} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800">Programa de Fidelidade</h1>
                <p className="text-[9px] text-gray-500">Configure pontos e níveis</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-medium text-green-700">Ativo</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-3 py-2 grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl p-2.5 text-white">
            <p className="text-[8px] opacity-80">Total Pontos</p>
            <p className="text-lg font-bold"><AnimatedPoints points={847250} /></p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-2.5 text-white">
            <p className="text-[8px] opacity-80">Clientes</p>
            <p className="text-lg font-bold"><AnimatedPoints points={502} /></p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2.5 text-white">
            <p className="text-[8px] opacity-80">Resgatados</p>
            <p className="text-lg font-bold">R$ <AnimatedPoints points={15840} /></p>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="px-3 pb-2">
          <p className="text-[10px] font-semibold text-gray-700 mb-2">Níveis de Fidelidade</p>
          <div className="grid grid-cols-2 gap-2">
            {mockLevels.map((level, index) => (
              <LevelCard key={level.id} level={level} index={index} />
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="px-3 pb-3">
          <p className="text-[10px] font-semibold text-gray-700 mb-2">Top Clientes</p>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {mockTopCustomers.map((customer, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{customer.avatar}</span>
                  <div>
                    <p className="text-[10px] font-medium text-gray-800">{customer.name}</p>
                    <p className="text-[8px] text-gray-500">{customer.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">⭐</span>
                  <span className="text-[10px] font-bold text-amber-600">{customer.points.toLocaleString('pt-BR')}</span>
                </div>
              </div>
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

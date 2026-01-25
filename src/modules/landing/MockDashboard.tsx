import { useState, useEffect } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';

// Dados mockados - VALORES CHAMATIVOS
const mockStats = {
  totalSales: 1847,
  totalRevenue: 127450.90,
  totalCustomers: 892,
  totalProducts: 1256,
};

const mockOrderStats = {
  pending: 23,
  confirmed: 45,
  completed: 1634,
  cancelled: 12,
};

const mockSalesData = [
  { date: '15/01', total: 4200 },
  { date: '16/01', total: 5800 },
  { date: '17/01', total: 7200 },
  { date: '18/01', total: 6500 },
  { date: '19/01', total: 9800 },
  { date: '20/01', total: 12400 },
  { date: '21/01', total: 15600 },
  { date: '22/01', total: 18900 },
];

const mockTopProducts = [
  { name: 'Kit Premium Skincare Completo', quantity: 342, color: '#8b5cf6' },
  { name: 'Serum Vitamina C Importado', quantity: 289, color: '#a78bfa' },
  { name: 'Creme Anti-idade Gold Edition', quantity: 234, color: '#c4b5fd' },
  { name: 'Mascara Facial Coreana', quantity: 198, color: '#ddd6fe' },
  { name: 'Oleo Essencial Organico', quantity: 156, color: '#ede9fe' },
];

// Notificacoes flutuantes mockadas - valores altos
const mockNotifications = [
  { id: 1, type: 'order', message: 'Novo pedido #4872', value: 'R$ 847,90', customer: 'Maria S.' },
  { id: 2, type: 'sale', message: 'Venda confirmada', value: 'R$ 1.256,00', customer: 'Joao P.' },
  { id: 3, type: 'order', message: 'Novo pedido #4873', value: 'R$ 2.340,50', customer: 'Ana L.' },
  { id: 4, type: 'customer', message: 'Novo cliente VIP', value: '', customer: 'Carlos M.' },
  { id: 5, type: 'sale', message: 'Mega venda!', value: 'R$ 3.890,00', customer: 'Paula R.' },
];

// Componente de notificacao flutuante
function FloatingNotification({ notification, position, delay }: {
  notification: typeof mockNotifications[0];
  position: 'left' | 'right';
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setVisible(true);
      setShow(true);
    }, delay);

    const hideTimer = setTimeout(() => {
      setShow(false);
    }, delay + 3000);

    const resetTimer = setTimeout(() => {
      setVisible(false);
    }, delay + 3500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(resetTimer);
    };
  }, [delay]);

  // Re-trigger animation
  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        setVisible(true);
        setShow(true);
        setTimeout(() => setShow(false), 3000);
        setTimeout(() => setVisible(false), 3500);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const icons = {
    order: <ShoppingBagIcon className="h-4 w-4 text-indigo-500" />,
    sale: <TrendingUpIcon className="h-4 w-4 text-green-500" />,
    customer: <PersonIcon className="h-4 w-4 text-blue-500" />,
  };

  const bgColors = {
    order: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700',
    sale: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    customer: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
  };

  return (
    <div
      className={`absolute ${position === 'left' ? '-left-4 sm:-left-8' : '-right-4 sm:-right-8'} z-20 transition-all duration-500 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ top: `${20 + (notification.id * 15)}%` }}
    >
      <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg border backdrop-blur-sm ${bgColors[notification.type as keyof typeof bgColors]} animate-float`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
          {icons[notification.type as keyof typeof icons]}
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-medium text-gray-900 dark:text-white">{notification.message}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{notification.customer}</span>
            {notification.value && (
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">{notification.value}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Grafico de area simplificado (SVG)
function SimpleSalesChart() {
  const maxValue = Math.max(...mockSalesData.map(d => d.total));
  const height = 120;
  const width = 280;
  const padding = 20;

  const points = mockSalesData.map((d, i) => ({
    x: padding + (i / (mockSalesData.length - 1)) * (width - padding * 2),
    y: height - padding - (d.total / maxValue) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 1, 2, 3].map(i => (
        <line
          key={i}
          x1={padding}
          y1={padding + (i / 3) * (height - padding * 2)}
          x2={width - padding}
          y2={padding + (i / 3) * (height - padding * 2)}
          stroke="#e5e7eb"
          strokeDasharray="3 3"
          className="dark:stroke-gray-700"
        />
      ))}
      {/* Area */}
      <path d={areaPath} fill="url(#areaGradient)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
      ))}
      {/* X axis labels */}
      {mockSalesData.map((d, i) => (
        <text
          key={i}
          x={points[i].x}
          y={height - 4}
          textAnchor="middle"
          className="fill-gray-400 dark:fill-gray-500"
          fontSize="8"
        >
          {d.date}
        </text>
      ))}
    </svg>
  );
}

// Grafico de barras horizontal simplificado
function SimpleBarChart() {
  const maxQuantity = Math.max(...mockTopProducts.map(p => p.quantity));

  return (
    <div className="space-y-2">
      {mockTopProducts.map((product, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 w-20 sm:w-24 truncate text-right">
            {product.name.split(' ').slice(0, 3).join(' ')}
          </span>
          <div className="flex-1 h-4 sm:h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-1000 ease-out"
              style={{
                width: `${(product.quantity / maxQuantity) * 100}%`,
                backgroundColor: product.color,
                animationDelay: `${index * 150}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MockDashboard() {
  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [animatedSales, setAnimatedSales] = useState(0);

  // Animar numeros
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const revenueStep = mockStats.totalRevenue / steps;
    const salesStep = mockStats.totalSales / steps;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      setAnimatedRevenue(Math.min(revenueStep * current, mockStats.totalRevenue));
      setAnimatedSales(Math.min(Math.round(salesStep * current), mockStats.totalSales));
      if (current >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="relative w-full">
      {/* Floating notifications */}
      <FloatingNotification notification={mockNotifications[0]} position="left" delay={1000} />
      <FloatingNotification notification={mockNotifications[1]} position="right" delay={2500} />
      <FloatingNotification notification={mockNotifications[2]} position="left" delay={5000} />

      {/* Browser Frame */}
      <div className="bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl sm:rounded-[2rem] p-2 sm:p-3 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
        {/* Browser Bar */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-800 rounded-t-xl border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1 sm:gap-1.5">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-2 sm:mx-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 sm:gap-2">
              <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">mercadovirtual.app/dashboard</span>
              <span className="sm:hidden">mercadovirtual.app</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-[10px] sm:text-xs font-medium">EV</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="bg-gray-900 rounded-b-xl p-3 sm:p-4 md:p-6">
          {/* Sidebar + Main layout */}
          <div className="flex gap-3 sm:gap-4 md:gap-6">
            {/* Sidebar (hidden on very small screens) */}
            <div className="hidden md:flex flex-col w-44 lg:w-48 bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <ShoppingBagIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">NewEmpire</span>
              </div>

              <nav className="space-y-1">
                {[
                  { icon: <TrendingUpIcon className="w-4 h-4" />, label: 'Dashboard', active: true },
                  { icon: <ShoppingBagIcon className="w-4 h-4" />, label: 'Vendas', active: false },
                  { icon: <LocalShippingIcon className="w-4 h-4" />, label: 'Pedidos', active: false },
                  { icon: <PeopleIcon className="w-4 h-4" />, label: 'Clientes', active: false },
                  { icon: <InventoryIcon className="w-4 h-4" />, label: 'Produtos', active: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      item.active
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="mb-3 sm:mb-4 md:mb-6">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-[10px] sm:text-xs text-gray-400">Visao geral de NewEmpire</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
                {[
                  {
                    icon: <TrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />,
                    label: 'Total de Vendas',
                    value: animatedSales,
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/20'
                  },
                  {
                    icon: <AttachMoneyIcon className="w-4 h-4 sm:w-5 sm:h-5" />,
                    label: 'Faturamento',
                    value: formatCurrency(animatedRevenue),
                    color: 'text-green-400',
                    bg: 'bg-green-500/20'
                  },
                  {
                    icon: <PeopleIcon className="w-4 h-4 sm:w-5 sm:h-5" />,
                    label: 'Clientes',
                    value: mockStats.totalCustomers,
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/20'
                  },
                  {
                    icon: <InventoryIcon className="w-4 h-4 sm:w-5 sm:h-5" />,
                    label: 'Produtos',
                    value: mockStats.totalProducts,
                    color: 'text-orange-400',
                    bg: 'bg-orange-500/20'
                  },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bg}`}>
                        <span className={stat.color}>{stat.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] sm:text-[10px] text-gray-400 truncate">{stat.label}</p>
                        <p className="text-sm sm:text-base md:text-xl font-bold text-white truncate">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Stats */}
              <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 mb-3 sm:mb-4 md:mb-6">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <LocalShippingIcon className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs sm:text-sm font-semibold text-white">Pedidos do Catalogo</h3>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
                  {[
                    { icon: <PendingIcon className="w-3 h-3 sm:w-4 sm:h-4" />, label: 'Pendentes', value: mockOrderStats.pending, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                    { icon: <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />, label: 'Confirmados', value: mockOrderStats.confirmed, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { icon: <LocalShippingIcon className="w-3 h-3 sm:w-4 sm:h-4" />, label: 'Entregues', value: mockOrderStats.completed, color: 'text-green-500', bg: 'bg-green-500/10' },
                    { icon: <CancelIcon className="w-3 h-3 sm:w-4 sm:h-4" />, label: 'Cancelados', value: mockOrderStats.cancelled, color: 'text-red-500', bg: 'bg-red-500/10' },
                  ].map((item, i) => (
                    <div key={i} className={`${item.bg} rounded-lg p-1.5 sm:p-2 md:p-3`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className={item.color}>{item.icon}</span>
                        <div>
                          <p className="text-[7px] sm:text-[9px] text-gray-400 leading-tight">{item.label}</p>
                          <p className={`text-sm sm:text-base md:text-lg font-bold ${item.color}`}>{item.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                {/* Sales Chart */}
                <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3">Vendas nos ultimos 30 dias</h3>
                  <div className="h-24 sm:h-28 md:h-32">
                    <SimpleSalesChart />
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-gray-800/50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3">Top 5 Produtos</h3>
                  <SimpleBarChart />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

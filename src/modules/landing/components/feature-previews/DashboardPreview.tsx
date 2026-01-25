import { useState } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';

type Period = 'hoje' | 'semana' | 'mes';

const metricsData: Record<Period, { vendas: number; pedidos: number; ticket: number; clientes: number }> = {
  hoje: { vendas: 1234.50, pedidos: 23, ticket: 53.65, clientes: 5 },
  semana: { vendas: 8450.00, pedidos: 156, ticket: 54.17, clientes: 32 },
  mes: { vendas: 34560.00, pedidos: 645, ticket: 53.58, clientes: 128 },
};

const chartData: Record<Period, number[]> = {
  hoje: [30, 45, 60, 35, 80, 65, 90],
  semana: [120, 180, 150, 200, 170, 220, 190],
  mes: [800, 950, 1100, 900, 1200, 1050, 1300, 1150, 1400, 1250, 1500, 1350],
};

const recentOrders = [
  { id: '#1234', customer: 'Maria S.', total: 89.90, time: '10:32' },
  { id: '#1233', customer: 'Joao P.', total: 45.50, time: '10:15' },
  { id: '#1232', customer: 'Ana C.', total: 128.00, time: '09:58' },
  { id: '#1231', customer: 'Carlos R.', total: 67.80, time: '09:42' },
];

export function DashboardPreview() {
  const [period, setPeriod] = useState<Period>('hoje');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const metrics = metricsData[period];
  const chart = chartData[period];
  const maxValue = Math.max(...chart);

  const metricCards = [
    {
      icon: AttachMoneyIcon,
      label: 'Vendas',
      value: `R$ ${metrics.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: '+12%',
      positive: true,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: ShoppingBagIcon,
      label: 'Pedidos',
      value: metrics.pedidos.toString(),
      change: '+8%',
      positive: true,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: ReceiptIcon,
      label: 'Ticket Medio',
      value: `R$ ${metrics.ticket.toFixed(2)}`,
      change: '-2%',
      positive: false,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: PeopleIcon,
      label: 'Clientes Novos',
      value: metrics.clientes.toString(),
      change: '+15%',
      positive: true,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Period Selector */}
      <div className="flex gap-2 mb-4">
        {(['hoje', 'semana', 'mes'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {metricCards.map((metric, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${metric.bgColor} flex items-center justify-center`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{metric.value}</span>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${
                metric.positive ? 'text-green-600' : 'text-red-500'
              }`}>
                {metric.positive ? (
                  <TrendingUpIcon className="h-3 w-3" />
                ) : (
                  <TrendingDownIcon className="h-3 w-3" />
                )}
                {metric.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Vendas por {period === 'hoje' ? 'Hora' : period === 'semana' ? 'Dia' : 'Semana'}
        </h4>
        <div className="flex items-end gap-1 h-24">
          {chart.map((value, index) => (
            <div
              key={index}
              className="relative flex-1 group"
              onMouseEnter={() => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  hoveredBar === index
                    ? 'bg-indigo-500'
                    : 'bg-indigo-400/60 dark:bg-indigo-500/40'
                }`}
                style={{ height: `${(value / maxValue) * 100}%` }}
              />
              {hoveredBar === index && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  R$ {value.toFixed(0)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="flex-1 overflow-hidden">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Ultimos Pedidos
        </h4>
        <div className="space-y-2">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500">{order.id}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{order.customer}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  R$ {order.total.toFixed(2)}
                </span>
                <p className="text-[10px] text-gray-400">{order.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

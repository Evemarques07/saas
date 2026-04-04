import { useState } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InventoryIcon from '@mui/icons-material/Inventory';

type Period = 'hoje' | 'semana' | 'mes';

const metricsData: Record<Period, {
  vendas: number;
  pedidos: number;
  ticket: number;
  clientes: number;
  faturamento: number;
  lucro: number;
  cmv: number;
  produtos: number;
}> = {
  hoje: { vendas: 23, pedidos: 23, ticket: 53.65, clientes: 5, faturamento: 1234.50, lucro: 617.25, cmv: 617.25, produtos: 48 },
  semana: { vendas: 156, pedidos: 156, ticket: 54.17, clientes: 32, faturamento: 8450.00, lucro: 4225.00, cmv: 4225.00, produtos: 48 },
  mes: { vendas: 645, pedidos: 645, ticket: 53.58, clientes: 128, faturamento: 34560.00, lucro: 17280.00, cmv: 17280.00, produtos: 48 },
};

const chartData: Record<Period, { label: string; receita: number; custo: number }[]> = {
  hoje: [
    { label: '8h', receita: 120, custo: 60 },
    { label: '9h', receita: 280, custo: 140 },
    { label: '10h', receita: 195, custo: 95 },
    { label: '11h', receita: 340, custo: 170 },
    { label: '12h', receita: 150, custo: 80 },
    { label: '13h', receita: 90, custo: 45 },
    { label: '14h', receita: 60, custo: 27 },
  ],
  semana: [
    { label: 'Seg', receita: 1200, custo: 600 },
    { label: 'Ter', receita: 1450, custo: 720 },
    { label: 'Qua', receita: 980, custo: 490 },
    { label: 'Qui', receita: 1680, custo: 840 },
    { label: 'Sex', receita: 1540, custo: 770 },
    { label: 'Sab', receita: 1100, custo: 550 },
    { label: 'Dom', receita: 500, custo: 255 },
  ],
  mes: [
    { label: 'S1', receita: 7800, custo: 3900 },
    { label: 'S2', receita: 9200, custo: 4600 },
    { label: 'S3', receita: 8600, custo: 4300 },
    { label: 'S4', receita: 8960, custo: 4480 },
  ],
};

const recentOrders = [
  { id: '#1234', customer: 'Maria S.', total: 89.90, cost: 42.50, time: '10:32' },
  { id: '#1233', customer: 'Joao P.', total: 45.50, cost: 22.00, time: '10:15' },
  { id: '#1232', customer: 'Ana C.', total: 128.00, cost: 61.30, time: '09:58' },
  { id: '#1231', customer: 'Carlos R.', total: 67.80, cost: 33.90, time: '09:42' },
];

export function DashboardPreview() {
  const [period, setPeriod] = useState<Period>('hoje');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const metrics = metricsData[period];
  const chart = chartData[period];
  const maxValue = Math.max(...chart.map(d => d.receita));
  const marginPercent = metrics.faturamento > 0
    ? ((metrics.lucro / metrics.faturamento) * 100).toFixed(1)
    : '0.0';

  const statCards = [
    {
      icon: TrendingUpIcon,
      label: 'Total de Vendas',
      value: metrics.vendas.toString(),
      change: '+12%',
      positive: true,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: AttachMoneyIcon,
      label: 'Faturamento',
      value: `R$ ${metrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: '+8%',
      positive: true,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: TrendingUpIcon,
      label: 'Lucro Bruto',
      value: `R$ ${metrics.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `Margem: ${marginPercent}%`,
      change: '+15%',
      positive: true,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      icon: AttachMoneyIcon,
      label: 'CMV',
      value: `R$ ${metrics.cmv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: '+5%',
      positive: false,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      icon: PeopleIcon,
      label: 'Clientes',
      value: metrics.clientes.toString(),
      change: '+18%',
      positive: true,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: InventoryIcon,
      label: 'Produtos',
      value: metrics.produtos.toString(),
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

      {/* Stats Cards Grid - 2x3 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-lg font-bold text-gray-900 dark:text-white block truncate">
                  {stat.value}
                </span>
                {'subtitle' in stat && stat.subtitle && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {stat.subtitle}
                  </span>
                )}
              </div>
              {stat.change && (
                <div className={`flex items-center gap-0.5 text-xs font-medium flex-shrink-0 ml-1 ${
                  stat.positive ? 'text-green-600' : 'text-red-500'
                }`}>
                  {stat.positive ? (
                    <TrendingUpIcon className="h-3 w-3" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue vs Cost Chart */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Receita vs Custo
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] text-gray-500">Receita</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-[10px] text-gray-500">Custo</span>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {chart.map((bar, index) => (
            <div
              key={index}
              className="relative flex-1 group flex flex-col items-center"
              onMouseEnter={() => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {hoveredBar === index && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 leading-tight">
                  <div className="text-indigo-300">R$ {bar.receita.toFixed(0)}</div>
                  <div className="text-amber-300">R$ {bar.custo.toFixed(0)}</div>
                </div>
              )}
              <div className="w-full flex gap-[2px] items-end h-full">
                <div
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    hoveredBar === index ? 'bg-indigo-500' : 'bg-indigo-400/60 dark:bg-indigo-500/40'
                  }`}
                  style={{ height: `${(bar.receita / maxValue) * 100}%` }}
                />
                <div
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    hoveredBar === index ? 'bg-amber-400' : 'bg-amber-300/60 dark:bg-amber-400/40'
                  }`}
                  style={{ height: `${(bar.custo / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 mt-1">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders with Profit */}
      <div className="flex-1 overflow-hidden">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Últimos Pedidos
        </h4>
        <div className="space-y-2">
          {recentOrders.map((order) => {
            const profit = order.total - order.cost;
            const margin = ((profit / order.total) * 100).toFixed(0);
            return (
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
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Lucro: R$ {profit.toFixed(2)} ({margin}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { toast } from 'react-hot-toast';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Select } from '../../components/ui';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../contexts/ThemeContext';

type PeriodFilter = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'all';

const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: 'Últimos 7 dias' },
  { value: 'last30days', label: 'Últimos 30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês passado' },
  { value: 'all', label: 'Todo período' },
];

interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
}

interface OrderStats {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface SalesData {
  date: string;
  total: number;
}

interface TopProduct {
  name: string;
  quantity: number;
}

export function DashboardPage() {
  const { currentCompany } = useTenant();
  const { theme } = useTheme();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });
  const [orderStats, setOrderStats] = useState<OrderStats>({
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('last30days');
  const salesChartRef = useRef<HTMLDivElement>(null);
  const productsChartRef = useRef<HTMLDivElement>(null);

  // Calcular datas baseado no período selecionado
  const getDateRange = (periodFilter: PeriodFilter): { startDate: Date | null; endDate: Date | null } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper: retorna o final do dia (23:59:59.999)
    const endOfDay = (date: Date): Date => {
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return end;
    };

    switch (periodFilter) {
      case 'today':
        return { startDate: today, endDate: endOfDay(today) };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday, endDate: endOfDay(yesterday) };
      }
      case 'last7days': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6); // -6 para incluir hoje (7 dias no total)
        return { startDate: last7, endDate: endOfDay(today) };
      }
      case 'last30days': {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29); // -29 para incluir hoje (30 dias no total)
        return { startDate: last30, endDate: endOfDay(today) };
      }
      case 'thisMonth': {
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: firstDayThisMonth, endDate: endOfDay(today) };
      }
      case 'lastMonth': {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0); // Dia 0 do mes atual = ultimo dia do mes anterior
        return { startDate: firstDayLastMonth, endDate: endOfDay(lastDayLastMonth) };
      }
      case 'all':
      default:
        return { startDate: null, endDate: null };
    }
  };

  // Delay chart rendering until container is mounted and has dimensions
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentCompany) {
      fetchDashboardData();
    }
  }, [currentCompany, period]);

  const fetchDashboardData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    const { startDate, endDate } = getDateRange(period);

    try {
      // Build sales query with date filter
      let salesQuery = supabase
        .from('sales')
        .select('total, created_at')
        .eq('company_id', currentCompany.id)
        .eq('status', 'completed');

      if (startDate) {
        salesQuery = salesQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        salesQuery = salesQuery.lte('created_at', endDate.toISOString());
      }

      // Build catalog orders query with date filter
      let ordersQuery = supabase
        .from('catalog_orders')
        .select('status, created_at')
        .eq('company_id', currentCompany.id);

      if (startDate) {
        ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte('created_at', endDate.toISOString());
      }

      // Fetch stats
      const [salesResult, customersResult, productsResult, catalogOrdersResult] = await Promise.all([
        salesQuery,
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', currentCompany.id)
          .eq('is_active', true),
        supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('company_id', currentCompany.id)
          .eq('is_active', true),
        ordersQuery,
      ]);

      const totalRevenue = salesResult.data?.reduce((acc, sale) => acc + Number(sale.total), 0) || 0;

      setStats({
        totalSales: salesResult.data?.length || 0,
        totalRevenue,
        totalCustomers: customersResult.count || 0,
        totalProducts: productsResult.count || 0,
      });

      // Count catalog orders by status
      const orders = catalogOrdersResult.data || [];
      setOrderStats({
        pending: orders.filter((o) => o.status === 'pending').length,
        confirmed: orders.filter((o) => o.status === 'confirmed').length,
        completed: orders.filter((o) => o.status === 'completed').length,
        cancelled: orders.filter((o) => o.status === 'cancelled').length,
      });

      // Fetch sales data for chart (use same period filter)
      let chartQuery = supabase
        .from('sales')
        .select('created_at, total')
        .eq('company_id', currentCompany.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (startDate) {
        chartQuery = chartQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        chartQuery = chartQuery.lte('created_at', endDate.toISOString());
      }

      const { data: recentSales } = await chartQuery;

      // Group by date
      const salesByDate: Record<string, number> = {};
      recentSales?.forEach((sale) => {
        const date = new Date(sale.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        salesByDate[date] = (salesByDate[date] || 0) + Number(sale.total);
      });

      const chartData = Object.entries(salesByDate).map(([date, total]) => ({
        date,
        total,
      }));

      setSalesData(chartData);

      // Fetch top products (with date filter)
      let topProductsQuery = supabase
        .from('sale_items')
        .select(`
          quantity,
          product_name,
          sale:sales!inner(company_id, status, created_at)
        `)
        .eq('sale.company_id', currentCompany.id)
        .eq('sale.status', 'completed');

      if (startDate) {
        topProductsQuery = topProductsQuery.gte('sale.created_at', startDate.toISOString());
      }
      if (endDate) {
        topProductsQuery = topProductsQuery.lte('sale.created_at', endDate.toISOString());
      }

      const { data: saleItems } = await topProductsQuery;

      const productQuantities: Record<string, number> = {};
      saleItems?.forEach((item) => {
        productQuantities[item.product_name] =
          (productQuantities[item.product_name] || 0) + item.quantity;
      });

      const topProductsData = Object.entries(productQuantities)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopProducts(topProductsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statCards = [
    {
      title: 'Total de Vendas',
      value: stats.totalSales,
      icon: <TrendingUpIcon />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Faturamento',
      value: formatCurrency(stats.totalRevenue),
      icon: <AttachMoneyIcon />,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Clientes',
      value: stats.totalCustomers,
      icon: <PeopleIcon />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Produtos',
      value: stats.totalProducts,
      icon: <InventoryIcon />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  const chartColors = {
    stroke: theme === 'dark' ? '#60a5fa' : '#3b82f6',
    fill: theme === 'dark' ? '#1e3a8a' : '#dbeafe',
    bar: theme === 'dark' ? '#8b5cf6' : '#7c3aed',
    grid: theme === 'dark' ? '#374151' : '#e5e7eb',
    text: theme === 'dark' ? '#9ca3af' : '#6b7280',
  };

  if (!currentCompany) {
    return (
      <PageContainer title="Dashboard">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Selecione uma empresa para ver o dashboard
          </p>
        </div>
      </PageContainer>
    );
  }

  const catalogUrl = `${window.location.origin}/catalogo/${currentCompany.slug}`;

  const handleCopyCatalogLink = async () => {
    await navigator.clipboard.writeText(catalogUrl);
    toast.success('Link do catálogo copiado!');
  };

  const handleOpenCatalog = () => {
    window.open(catalogUrl, '_blank');
  };

  return (
    <PageContainer
      title="Dashboard"
      subtitle={`Visão geral de ${currentCompany.name}`}
    >
      {/* Catalog Link Card */}
      <Card className="p-3 md:p-4 mb-4 md:mb-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 md:p-3 rounded-lg bg-primary-600 text-white flex-shrink-0">
              <StorefrontIcon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                Catálogo Público
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[180px] sm:max-w-none">
                {catalogUrl}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              onClick={handleCopyCatalogLink}
              className="flex items-center gap-2"
              size="sm"
            >
              <ContentCopyIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Copiar</span>
            </Button>
            <Button
              onClick={handleOpenCatalog}
              className="flex items-center gap-2"
              size="sm"
            >
              <OpenInNewIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Abrir</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Period Filter */}
      <Card className="p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Período</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Filtre os dados por período
            </p>
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              options={periodOptions}
            />
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-3 md:p-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {stat.title}
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {loading ? '...' : stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Catalog Orders Stats */}
      <Card className="p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <LocalShippingIcon className="text-primary-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
            Pedidos do Catálogo
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <PendingIcon className="text-yellow-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pendentes</p>
              <p className="text-lg md:text-xl font-bold text-yellow-600">
                {loading ? '...' : orderStats.pending}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <CheckCircleIcon className="text-blue-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Confirmados</p>
              <p className="text-lg md:text-xl font-bold text-blue-600">
                {loading ? '...' : orderStats.confirmed}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <LocalShippingIcon className="text-green-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Entregues</p>
              <p className="text-lg md:text-xl font-bold text-green-600">
                {loading ? '...' : orderStats.completed}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <CancelIcon className="text-red-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Cancelados</p>
              <p className="text-lg md:text-xl font-bold text-red-600">
                {loading ? '...' : orderStats.cancelled}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Sales Chart */}
        <Card className="p-3 md:p-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
            Vendas nos últimos 30 dias
          </h3>
          <div ref={salesChartRef} className="h-48 md:h-64" style={{ minHeight: 192 }}>
            {!chartsReady ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="animate-pulse">Carregando gráfico...</div>
              </div>
            ) : salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="date" tick={{ fill: chartColors.text, fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: chartColors.text, fontSize: 12 }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={chartColors.stroke}
                    fill={chartColors.fill}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Nenhuma venda registrada
              </div>
            )}
          </div>
        </Card>

        {/* Top Products Chart */}
        <Card className="p-3 md:p-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
            Produtos mais vendidos
          </h3>
          <div ref={productsChartRef} className="h-48 md:h-64" style={{ minHeight: 192 }}>
            {!chartsReady ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="animate-pulse">Carregando gráfico...</div>
              </div>
            ) : topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis type="number" tick={{ fill: chartColors.text, fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: chartColors.text, fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="quantity" fill={chartColors.bar} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Nenhum produto vendido
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

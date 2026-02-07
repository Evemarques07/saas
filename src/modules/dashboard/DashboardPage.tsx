import { buildFullCatalogoUrl } from '../../routes/paths';
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
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
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
import { ActivationChecklist } from '../../components/dashboard/ActivationChecklist';
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

interface CustomerScatterData {
  name: string;
  purchases: number;
  avgTicket: number;
  totalSpent: number;
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
  const [customerScatterData, setCustomerScatterData] = useState<CustomerScatterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('last30days');
  const salesChartRef = useRef<HTMLDivElement>(null);
  const productsChartRef = useRef<HTMLDivElement>(null);
  const funnelChartRef = useRef<HTMLDivElement>(null);
  const scatterChartRef = useRef<HTMLDivElement>(null);

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
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 20;

    const checkDimensions = () => {
      if (!mounted || attempts >= maxAttempts) {
        // Fallback: enable charts after max attempts
        if (mounted) setChartsReady(true);
        return;
      }

      attempts++;
      const salesChart = salesChartRef.current;
      const productsChart = productsChartRef.current;

      // Check if containers have valid dimensions
      if (salesChart && productsChart) {
        const salesRect = salesChart.getBoundingClientRect();
        const productsRect = productsChart.getBoundingClientRect();

        if (salesRect.width > 0 && salesRect.height > 0 &&
            productsRect.width > 0 && productsRect.height > 0) {
          if (mounted) setChartsReady(true);
          return;
        }
      }

      // Retry with exponential backoff
      setTimeout(checkDimensions, Math.min(50 * attempts, 200));
    };

    // Start checking after a small delay to allow initial render
    const timer = setTimeout(checkDimensions, 50);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
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

      // Fetch customer scatter data (Frequency vs Avg Ticket)
      // This query doesn't use date filter to show all-time customer behavior
      const { data: customerSalesData, error: scatterError } = await supabase
        .from('sales')
        .select('customer_id, customer_name, total')
        .eq('company_id', currentCompany.id)
        .eq('status', 'completed');

      console.log('=== SCATTER CHART DEBUG ===');
      console.log('Company ID:', currentCompany.id);
      console.log('Scatter Error:', scatterError);
      console.log('Customer Sales Data (all):', customerSalesData);
      console.log('Customer Sales Data Length:', customerSalesData?.length);

      if (customerSalesData && customerSalesData.length > 0) {
        // Group by customer - use customer_id if available, otherwise customer_name
        const customerStats: Record<string, { name: string; purchases: number; totalSpent: number }> = {};

        customerSalesData.forEach((sale) => {
          // Use customer_id as key if available, otherwise use customer_name
          const key = sale.customer_id || sale.customer_name;
          if (!key) return; // Skip if no customer identifier

          if (!customerStats[key]) {
            customerStats[key] = {
              name: sale.customer_name || 'Cliente',
              purchases: 0,
              totalSpent: 0,
            };
          }

          customerStats[key].purchases += 1;
          customerStats[key].totalSpent += Number(sale.total) || 0;
        });

        console.log('Customer Stats (grouped):', customerStats);

        const scatterData: CustomerScatterData[] = Object.values(customerStats)
          .map((customer) => ({
            name: customer.name,
            purchases: customer.purchases,
            avgTicket: customer.totalSpent / customer.purchases,
            totalSpent: customer.totalSpent,
          }))
          .filter((c) => c.purchases > 0 && c.avgTicket > 0)
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 50); // Limitar a 50 clientes para não sobrecarregar o gráfico

        console.log('Scatter Data (final):', scatterData);
        setCustomerScatterData(scatterData);
      } else {
        console.log('No customer sales data found');
        setCustomerScatterData([]);
      }
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

  const catalogUrl = buildFullCatalogoUrl(currentCompany.slug);

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
      {/* Activation Checklist - mostra apenas para novas lojas */}
      <ActivationChecklist />

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
          <Card key={stat.title} className="p-2.5 sm:p-3 md:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4">
              <div className={`p-2 md:p-3 rounded-lg ${stat.bgColor} flex-shrink-0 self-start sm:self-auto`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-tight">
                  {stat.title}
                </p>
                <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <PendingIcon className="text-yellow-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">Pendentes</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-yellow-600">
                {loading ? '...' : orderStats.pending}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <CheckCircleIcon className="text-blue-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">Confirmados</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-blue-600">
                {loading ? '...' : orderStats.confirmed}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <LocalShippingIcon className="text-green-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">Entregues</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-green-600">
                {loading ? '...' : orderStats.completed}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <CancelIcon className="text-red-600 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">Cancelados</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-red-600">
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
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
            Top 5 Produtos
          </h3>
          <div ref={productsChartRef} className="h-64 md:h-80" style={{ minHeight: 256 }}>
            {!chartsReady ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="animate-pulse">Carregando gráfico...</div>
              </div>
            ) : topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

      {/* Orders Funnel */}
      <Card className="p-3 md:p-4 mt-4 md:mt-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <FilterAltIcon className="text-primary-600" />
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Funil de Pedidos
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Conversão dos pedidos do catálogo
            </p>
          </div>
        </div>

        {(() => {
          const totalOrders = orderStats.pending + orderStats.confirmed + orderStats.completed + orderStats.cancelled;
          const funnelData = [
            {
              name: 'Total de Pedidos',
              value: totalOrders,
              fill: '#6366f1',
              label: `Total: ${totalOrders}`,
            },
            {
              name: 'Confirmados',
              value: orderStats.confirmed + orderStats.completed,
              fill: '#3b82f6',
              label: `Confirmados: ${orderStats.confirmed + orderStats.completed}`,
            },
            {
              name: 'Entregues',
              value: orderStats.completed,
              fill: '#22c55e',
              label: `Entregues: ${orderStats.completed}`,
            },
          ];

          const conversionRate = totalOrders > 0
            ? ((orderStats.completed / totalOrders) * 100).toFixed(1)
            : '0';

          const confirmationRate = totalOrders > 0
            ? (((orderStats.confirmed + orderStats.completed) / totalOrders) * 100).toFixed(1)
            : '0';

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Funnel Chart */}
              <div ref={funnelChartRef} className="h-64 md:h-72" style={{ minHeight: 256 }}>
                {!chartsReady ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="animate-pulse">Carregando gráfico...</div>
                  </div>
                ) : totalOrders > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <FunnelChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        formatter={(value, name) => [value ?? 0, name ?? '']}
                      />
                      <Funnel
                        dataKey="value"
                        data={funnelData}
                        isAnimationActive
                      >
                        <LabelList
                          position="center"
                          fill="#fff"
                          stroke="none"
                          dataKey="label"
                          fontSize={11}
                          fontWeight="bold"
                        />
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Nenhum pedido registrado
                  </div>
                )}
              </div>

              {/* Funnel Stats */}
              <div className="flex flex-col justify-center gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total de Pedidos</p>
                    <p className="text-xl font-bold text-indigo-600">{totalOrders}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pendentes</p>
                    <p className="text-xl font-bold text-yellow-600">{orderStats.pending}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Confirmação</p>
                    <p className="text-xl font-bold text-blue-600">{confirmationRate}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Entrega</p>
                    <p className="text-xl font-bold text-green-600">{conversionRate}%</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos Cancelados</p>
                    <p className="text-xl font-bold text-red-600">{orderStats.cancelled}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Cancelamento</p>
                    <p className="text-xl font-bold text-red-600">
                      {totalOrders > 0 ? ((orderStats.cancelled / totalOrders) * 100).toFixed(1) : '0'}%
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  O funil mostra a conversão dos pedidos desde a criação até a entrega
                </p>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Customer Scatter Chart - Frequency vs Avg Ticket */}
      <Card className="p-3 md:p-4 mt-4 md:mt-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <BubbleChartIcon className="text-purple-600" />
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Perfil de Clientes
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Frequência de compras vs Ticket médio
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Scatter Chart */}
          <div ref={scatterChartRef} className="lg:col-span-2 h-64 md:h-80" style={{ minHeight: 256 }}>
            {!chartsReady ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="animate-pulse">Carregando gráfico...</div>
              </div>
            ) : customerScatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    type="number"
                    dataKey="purchases"
                    name="Compras"
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    label={{
                      value: 'Nº de Compras',
                      position: 'bottom',
                      fill: chartColors.text,
                      fontSize: 11,
                      offset: 0,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="avgTicket"
                    name="Ticket Médio"
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    tickFormatter={(value) => `R$${value.toFixed(0)}`}
                    label={{
                      value: 'Ticket Médio (R$)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: chartColors.text,
                      fontSize: 11,
                    }}
                  />
                  <ZAxis
                    type="number"
                    dataKey="totalSpent"
                    range={[50, 400]}
                    name="Total Gasto"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value, name) => {
                      const safeValue = value ?? 0;
                      const safeName = name ?? '';
                      if (safeName === 'Ticket Médio' || safeName === 'Total Gasto') {
                        return [formatCurrency(safeValue as number), safeName];
                      }
                      return [safeValue, safeName];
                    }}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.name;
                      }
                      return '';
                    }}
                  />
                  <Scatter
                    name="Clientes"
                    data={customerScatterData}
                    fill="#8b5cf6"
                  >
                    {customerScatterData.map((entry, index) => {
                      // Colorir baseado no quadrante (VIP = alta frequência + alto ticket)
                      const avgPurchases = customerScatterData.reduce((a, b) => a + b.purchases, 0) / customerScatterData.length;
                      const avgTicket = customerScatterData.reduce((a, b) => a + b.avgTicket, 0) / customerScatterData.length;

                      let color = '#94a3b8'; // Cinza - baixa frequência, baixo ticket
                      if (entry.purchases >= avgPurchases && entry.avgTicket >= avgTicket) {
                        color = '#22c55e'; // Verde - VIP (alta frequência + alto ticket)
                      } else if (entry.purchases >= avgPurchases) {
                        color = '#3b82f6'; // Azul - frequente, ticket baixo
                      } else if (entry.avgTicket >= avgTicket) {
                        color = '#f59e0b'; // Amarelo - ticket alto, baixa frequência
                      }

                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Nenhum dado de cliente disponível
              </div>
            )}
          </div>

          {/* Legend and Stats */}
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Legenda dos Quadrantes
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">VIP - Alta frequência + Alto ticket</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Frequente - Compra muito, ticket baixo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Potencial - Ticket alto, baixa frequência</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-gray-600 dark:text-gray-400">Casual - Baixa frequência + Baixo ticket</span>
                </div>
              </div>
            </div>

            {customerScatterData.length > 0 && (
              <>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total de Clientes</p>
                  <p className="text-xl font-bold text-purple-600">{customerScatterData.length}</p>
                </div>

                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clientes VIP</p>
                  <p className="text-xl font-bold text-green-600">
                    {(() => {
                      const avgPurchases = customerScatterData.reduce((a, b) => a + b.purchases, 0) / customerScatterData.length;
                      const avgTicket = customerScatterData.reduce((a, b) => a + b.avgTicket, 0) / customerScatterData.length;
                      return customerScatterData.filter(c => c.purchases >= avgPurchases && c.avgTicket >= avgTicket).length;
                    })()}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Potencial (aumentar frequência)</p>
                  <p className="text-xl font-bold text-amber-600">
                    {(() => {
                      const avgPurchases = customerScatterData.reduce((a, b) => a + b.purchases, 0) / customerScatterData.length;
                      const avgTicket = customerScatterData.reduce((a, b) => a + b.avgTicket, 0) / customerScatterData.length;
                      return customerScatterData.filter(c => c.purchases < avgPurchases && c.avgTicket >= avgTicket).length;
                    })()}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

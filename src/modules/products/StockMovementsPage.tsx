import { useEffect, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UndoIcon from '@mui/icons-material/Undo';
import TuneIcon from '@mui/icons-material/Tune';
import { PageContainer } from '../../components/layout/PageContainer';
import { Input, Select, Card, Table, Badge } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { getStockMovements } from '../../services/stock';
import { Product, StockMovement, StockMovementType, TableColumn } from '../../types';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'default' | 'info';

const TYPE_CONFIG: Record<StockMovementType, { label: string; variant: BadgeVariant; icon: typeof ArrowUpwardIcon }> = {
  entry: { label: 'Entrada', variant: 'success', icon: ArrowUpwardIcon },
  sale: { label: 'Venda', variant: 'danger', icon: ArrowDownwardIcon },
  cancellation: { label: 'Cancelamento', variant: 'warning', icon: UndoIcon },
  adjustment: { label: 'Ajuste', variant: 'default', icon: TuneIcon },
};

export function StockMovementsPage() {
  const { currentCompany } = useTenant();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (currentCompany) {
      fetchMovements();
    }
  }, [currentCompany, filterProduct, filterType, startDate, endDate]);

  const fetchData = async () => {
    if (!currentCompany) return;

    const { data } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('company_id', currentCompany.id)
      .order('name');

    if (data) setProducts(data as Product[]);
    await fetchMovements();
  };

  const fetchMovements = async () => {
    if (!currentCompany) return;
    setLoading(true);

    try {
      const data = await getStockMovements(currentCompany.id, {
        productId: filterProduct || undefined,
        type: filterType || undefined,
        startDate: startDate ? `${startDate}T00:00:00` : undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
      });
      setMovements(data);
    } catch {
      setMovements([]);
    }

    setLoading(false);
  };

  const filteredMovements = movements.filter((m) => {
    if (!search) return true;
    const productName = (m.product as unknown as { name: string })?.name || '';
    return (
      productName.toLowerCase().includes(search.toLowerCase()) ||
      (m.notes || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
  }));

  const formatCurrency = (value: number | null) =>
    value != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
      : '—';

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const movementColumns: TableColumn<StockMovement>[] = [
    {
      key: 'created_at',
      label: 'Data/Hora',
      render: (m) => <span className="text-gray-500 whitespace-nowrap">{formatDateTime(m.created_at)}</span>,
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (m) => {
        const config = TYPE_CONFIG[m.type];
        const Icon = config.icon;
        return (
          <Badge variant={config.variant}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'product_id',
      label: 'Produto',
      render: (m) => (
        <span className="font-medium">
          {(m.product as unknown as { name: string })?.name || '—'}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantidade',
      render: (m) => (
        <span className={`text-right block font-medium ${
          m.quantity > 0
            ? 'text-green-600 dark:text-green-400'
            : m.quantity < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-400'
        }`}>
          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
        </span>
      ),
    },
    {
      key: 'unit_cost',
      label: 'Custo Unit.',
      render: (m) => <span className="text-right block">{formatCurrency(m.unit_cost)}</span>,
    },
    {
      key: 'balance_after',
      label: 'Saldo Após',
      render: (m) => <span className="text-right block font-medium">{m.balance_after}</span>,
    },
    {
      key: 'notes',
      label: 'Observação',
      render: (m) => (
        <span className="text-gray-500 text-xs max-w-xs truncate block">
          {m.notes || '—'}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      title="Movimentações de Estoque"
      subtitle="Histórico completo de entradas, saídas e ajustes"
    >
      {/* Filtros */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por produto ou observação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<SearchIcon className="w-5 h-5 text-gray-400" />}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                options={[{ value: '', label: 'Todos os produtos' }, ...productOptions]}
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: '', label: 'Todos os tipos' },
                  { value: 'entry', label: 'Entrada' },
                  { value: 'sale', label: 'Venda' },
                  { value: 'cancellation', label: 'Cancelamento' },
                  { value: 'adjustment', label: 'Ajuste' },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              label="De"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Até"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Movimentações */}
      {filteredMovements.length === 0 && !loading ? (
        <EmptyState
          icon={<TimelineIcon className="w-16 h-16" />}
          title="Nenhuma movimentação encontrada"
          description="As movimentações aparecerão aqui quando você registrar entradas ou realizar vendas."
        />
      ) : (
        <Table<StockMovement>
          columns={movementColumns}
          data={filteredMovements}
          keyExtractor={(m) => m.id}
          loading={loading}
          pageSize={20}
          emptyMessage="Nenhuma movimentação encontrada"
          mobileCardRender={(mov) => {
            const product = mov.product as unknown as { name: string } | undefined;
            const config = TYPE_CONFIG[mov.type];
            const Icon = config.icon;

            return (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {product?.name || '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDateTime(mov.created_at)}
                    </p>
                  </div>
                  <Badge variant={config.variant} className="flex-shrink-0">
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Quantidade</span>
                      <p className={`font-medium ${
                        mov.quantity > 0
                          ? 'text-green-600 dark:text-green-400'
                          : mov.quantity < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-400'
                      }`}>
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Custo Unit.</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(mov.unit_cost)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Saldo Após</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {mov.balance_after}
                    </p>
                  </div>
                </div>

                {mov.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">
                    {mov.notes}
                  </p>
                )}
              </div>
            );
          }}
        />
      )}
    </PageContainer>
  );
}

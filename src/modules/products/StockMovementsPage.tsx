import { useEffect, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UndoIcon from '@mui/icons-material/Undo';
import TuneIcon from '@mui/icons-material/Tune';
import { PageContainer } from '../../components/layout/PageContainer';
import { Input, Select, Card, Badge } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { getStockMovements } from '../../services/stock';
import { Product, StockMovement, StockMovementType } from '../../types';

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

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredMovements.length === 0 ? (
        <EmptyState
          icon={<TimelineIcon className="w-16 h-16" />}
          title="Nenhuma movimentação encontrada"
          description="As movimentações aparecerão aqui quando você registrar entradas ou realizar vendas."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Data/Hora</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Produto</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Quantidade</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Custo Unit.</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Saldo Após</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Observação</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((mov) => {
                  const product = mov.product as unknown as { name: string } | undefined;
                  const config = TYPE_CONFIG[mov.type];
                  const Icon = config.icon;
                  return (
                    <tr
                      key={mov.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {formatDateTime(mov.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={config.variant}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">{product?.name || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={
                            mov.quantity > 0
                              ? 'text-green-600 font-medium'
                              : mov.quantity < 0
                                ? 'text-red-600 font-medium'
                                : 'text-gray-400'
                          }
                        >
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(mov.unit_cost)}</td>
                      <td className="py-3 px-4 text-right font-medium">{mov.balance_after}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs max-w-xs truncate">
                        {mov.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}

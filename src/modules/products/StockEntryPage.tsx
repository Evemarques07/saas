import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import SearchIcon from '@mui/icons-material/Search';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Select, Card, Table, Modal, ModalFooter, Badge } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { registerStockEntry, getStockEntries } from '../../services/stock';
import { Product, StockEntry, TableColumn } from '../../types';

export function StockEntryPage() {
  const { currentCompany } = useTenant();
  const { user } = useAuth();
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    invoice_number: '',
    notes: '',
    received_at: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const [entriesResult, productsResult] = await Promise.all([
      getStockEntries(currentCompany.id),
      supabase
        .from('products')
        .select('id, name, sku, ean, price, cost_price, stock')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name'),
    ]);

    setEntries(entriesResult);
    if (productsResult.data) {
      setProducts(productsResult.data as Product[]);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      quantity: '',
      unit_cost: '',
      supplier: '',
      invoice_number: '',
      notes: '',
      received_at: new Date().toISOString().split('T')[0],
    });
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!currentCompany || !formData.product_id) {
      toast.error('Selecione um produto');
      return;
    }

    const quantity = parseInt(formData.quantity);
    const unitCost = parseFloat(formData.unit_cost);

    if (!quantity || quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    if (isNaN(unitCost) || unitCost < 0) {
      toast.error('Custo unitário inválido');
      return;
    }

    setSubmitting(true);
    try {
      await registerStockEntry({
        companyId: currentCompany.id,
        productId: formData.product_id,
        quantity,
        unitCost,
        supplier: formData.supplier || undefined,
        invoiceNumber: formData.invoice_number || undefined,
        notes: formData.notes || undefined,
        receivedAt: formData.received_at
          ? new Date(formData.received_at + 'T12:00:00').toISOString()
          : undefined,
        userId: user?.id,
      });

      toast.success(`Entrada registrada: ${quantity} unid. a R$ ${unitCost.toFixed(2)}`);
      setShowModal(false);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao registrar entrada';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const costTotal = formData.quantity && formData.unit_cost
    ? (parseInt(formData.quantity) || 0) * (parseFloat(formData.unit_cost) || 0)
    : 0;

  const filteredEntries = entries.filter((e) => {
    const productName = (e.product as unknown as { name: string })?.name || '';
    const matchesSearch = !search ||
      productName.toLowerCase().includes(search.toLowerCase()) ||
      (e.supplier || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.invoice_number || '').toLowerCase().includes(search.toLowerCase());
    const matchesProduct = !filterProduct || e.product_id === filterProduct;
    return matchesSearch && matchesProduct;
  });

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
  }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR');

  const entryColumns: TableColumn<StockEntry>[] = [
    {
      key: 'received_at',
      label: 'Data',
      render: (e) => formatDate(e.received_at),
    },
    {
      key: 'product_id',
      label: 'Produto',
      render: (e) => (
        <span className="font-medium">
          {(e.product as unknown as { name: string })?.name || '—'}
        </span>
      ),
    },
    {
      key: 'quantity_received',
      label: 'Qtd Recebida',
      render: (e) => <span className="text-right block">{e.quantity_received}</span>,
    },
    {
      key: 'quantity_remaining',
      label: 'Qtd Restante',
      render: (e) => (
        <span className={`text-right block font-medium ${
          e.quantity_remaining === 0
            ? 'text-gray-400'
            : e.quantity_remaining < e.quantity_received
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400'
        }`}>
          {e.quantity_remaining}
        </span>
      ),
    },
    {
      key: 'unit_cost',
      label: 'Custo Unit.',
      render: (e) => <span className="text-right block">{formatCurrency(e.unit_cost)}</span>,
    },
    {
      key: 'total' as keyof StockEntry,
      label: 'Total',
      render: (e) => (
        <span className="text-right block font-medium">
          {formatCurrency(e.quantity_received * e.unit_cost)}
        </span>
      ),
    },
    {
      key: 'supplier',
      label: 'Fornecedor',
      render: (e) => <span className="text-gray-500">{e.supplier || '—'}</span>,
    },
    {
      key: 'invoice_number',
      label: 'NF',
      render: (e) => <span className="text-gray-500">{e.invoice_number || '—'}</span>,
    },
  ];

  return (
    <PageContainer
      title="Entrada de Estoque"
      subtitle="Registre entradas de mercadoria com custo unitário (FIFO)"
      action={
        <Button onClick={handleOpenModal} icon={<AddIcon />}>
          Nova Entrada
        </Button>
      }
    >
      {/* Filtros */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por produto, fornecedor ou NF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon className="w-5 h-5 text-gray-400" />}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              options={[{ value: '', label: 'Todos os produtos' }, ...productOptions]}
            />
          </div>
        </div>
      </Card>

      {/* Entradas */}
      {filteredEntries.length === 0 && !loading ? (
        <EmptyState
          icon={<InventoryIcon className="w-16 h-16" />}
          title="Nenhuma entrada registrada"
          description="Registre entradas de estoque para ativar o controle FIFO de custo."
          action={
            <Button onClick={handleOpenModal} icon={<AddIcon />}>
              Registrar Primeira Entrada
            </Button>
          }
        />
      ) : (
        <>
          <Table<StockEntry>
            columns={entryColumns}
            data={filteredEntries}
            keyExtractor={(e) => e.id}
            loading={loading}
            pageSize={20}
            emptyMessage="Nenhuma entrada encontrada"
            mobileCardRender={(entry) => {
              const product = entry.product as unknown as { name: string } | undefined;
              const fifoStatus = entry.quantity_remaining === 0
                ? 'depleted'
                : entry.quantity_remaining < entry.quantity_received
                  ? 'partial'
                  : 'full';
              const fifoConfig = {
                full: { label: 'Integral', variant: 'success' as const },
                partial: { label: 'Parcial', variant: 'warning' as const },
                depleted: { label: 'Esgotado', variant: 'default' as const },
              };
              const config = fifoConfig[fifoStatus];
              const percentage = entry.quantity_received > 0
                ? (entry.quantity_remaining / entry.quantity_received) * 100
                : 0;

              return (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {product?.name || '—'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDate(entry.received_at)}
                        {entry.supplier && ` · ${entry.supplier}`}
                        {entry.invoice_number && ` · ${entry.invoice_number}`}
                      </p>
                    </div>
                    <Badge variant={config.variant} className="flex-shrink-0">
                      {config.label}
                    </Badge>
                  </div>

                  {/* FIFO Progress Bar */}
                  <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fifoStatus === 'depleted'
                          ? 'bg-gray-400'
                          : fifoStatus === 'partial'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Recebido</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{entry.quantity_received}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Restante</span>
                        <p className={`font-medium ${
                          entry.quantity_remaining === 0
                            ? 'text-gray-400'
                            : entry.quantity_remaining < entry.quantity_received
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                        }`}>{entry.quantity_remaining}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Custo Unit.</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(entry.unit_cost)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Total</span>
                      <p className="font-semibold text-primary-600 dark:text-primary-400">
                        {formatCurrency(entry.quantity_received * entry.unit_cost)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }}
          />

          {/* Totais */}
          {filteredEntries.length > 0 && (
            <Card className="mt-4 p-3 md:p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Recebido</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {filteredEntries.reduce((sum, e) => sum + e.quantity_received, 0)} un
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Restante</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {filteredEntries.reduce((sum, e) => sum + e.quantity_remaining, 0)} un
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Custo Total</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(filteredEntries.reduce((sum, e) => sum + e.quantity_received * e.unit_cost, 0))}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal Nova Entrada */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Entrada de Estoque"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Produto *"
            value={formData.product_id}
            onChange={(e) => {
              const productId = e.target.value;
              setFormData((prev) => {
                const product = products.find((p) => p.id === productId);
                return {
                  ...prev,
                  product_id: productId,
                  unit_cost: product?.cost_price ? String(product.cost_price) : prev.unit_cost,
                };
              });
            }}
            options={[{ value: '', label: 'Selecione um produto' }, ...productOptions]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantidade *"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Custo Unitário (R$) *"
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => setFormData((prev) => ({ ...prev, unit_cost: e.target.value }))}
              placeholder="0,00"
            />
          </div>

          {costTotal > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
              <span className="text-sm text-gray-500">Custo Total da Entrada:</span>
              <span className="ml-2 text-lg font-bold text-blue-600">
                {formatCurrency(costTotal)}
              </span>
            </div>
          )}

          <Input
            label="Fornecedor"
            value={formData.supplier}
            onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
            placeholder="Nome do fornecedor"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nota Fiscal"
              value={formData.invoice_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, invoice_number: e.target.value }))}
              placeholder="Número da NF"
            />
            <Input
              label="Data de Recebimento"
              type="date"
              value={formData.received_at}
              onChange={(e) => setFormData((prev) => ({ ...prev, received_at: e.target.value }))}
            />
          </div>

          <Input
            label="Observações"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Observações sobre esta entrada"
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Registrar Entrada
          </Button>
        </ModalFooter>
      </Modal>
    </PageContainer>
  );
}

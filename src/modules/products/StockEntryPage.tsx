import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import SearchIcon from '@mui/icons-material/Search';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Select, Card, Modal, ModalFooter } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { registerStockEntry, getStockEntries } from '../../services/stock';
import { Product, StockEntry } from '../../types';

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

      {/* Tabela de Entradas */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredEntries.length === 0 ? (
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
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Produto</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Qtd Recebida</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Qtd Restante</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Custo Unit.</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Fornecedor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">NF</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const product = entry.product as unknown as { name: string } | undefined;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">{formatDate(entry.received_at)}</td>
                      <td className="py-3 px-4 font-medium">{product?.name || '—'}</td>
                      <td className="py-3 px-4 text-right">{entry.quantity_received}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={
                            entry.quantity_remaining === 0
                              ? 'text-gray-400'
                              : entry.quantity_remaining < entry.quantity_received
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }
                        >
                          {entry.quantity_remaining}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(entry.unit_cost)}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(entry.quantity_received * entry.unit_cost)}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{entry.supplier || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{entry.invoice_number || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                  <td colSpan={2} className="py-3 px-4 font-semibold">Total</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {filteredEntries.reduce((sum, e) => sum + e.quantity_received, 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {filteredEntries.reduce((sum, e) => sum + e.quantity_remaining, 0)}
                  </td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {formatCurrency(
                      filteredEntries.reduce((sum, e) => sum + e.quantity_received * e.unit_cost, 0)
                    )}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
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

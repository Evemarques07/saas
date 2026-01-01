import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Select, Card } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Sale, Customer, Product, SaleItem, TableColumn, SaleStatus } from '../../types';
import { exportToExcel, exportToPDF } from '../../services/export';

interface CartItem {
  product: Product;
  quantity: number;
}

export function SalesPage() {
  const { currentCompany, isAdmin } = useTenant();
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | ''>('');

  // New Sale Modal
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View Sale Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const [salesResult, customersResult, productsResult] = await Promise.all([
      supabase
        .from('sales')
        .select(`
          *,
          customer:customers(*),
          items:sale_items(*, product:products(*))
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('products')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name'),
    ]);

    if (salesResult.data) setSales(salesResult.data);
    if (customersResult.data) setCustomers(customersResult.data);
    if (productsResult.data) setProducts(productsResult.data);

    setLoading(false);
  };

  const handleOpenNewSale = () => {
    setSelectedCustomer('');
    setCart([]);
    setDiscount('0');
    setPaymentMethod('');
    setNotes('');
    setShowNewSaleModal(true);
  };

  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = cart.find((item) => item.product.id === productId);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const discountValue = parseFloat(discount) || 0;
  const total = subtotal - discountValue;

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    setSubmitting(true);

    try {
      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: currentCompany!.id,
          customer_id: selectedCustomer || null,
          seller_id: user!.uid,
          status: 'completed',
          subtotal,
          discount: discountValue,
          total,
          payment_method: paymentMethod || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id);
      }

      toast.success('Venda registrada com sucesso!');
      setShowNewSaleModal(false);
      fetchData();
    } catch {
      toast.error('Erro ao registrar venda');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSale = (sale: Sale) => {
    setViewingSale(sale);
    setShowViewModal(true);
  };

  const handleUpdateStatus = async (saleId: string, status: SaleStatus) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status })
        .eq('id', saleId);

      if (error) throw error;
      toast.success('Status atualizado!');
      fetchData();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const data = filteredSales.map((s) => ({
      Data: new Date(s.created_at).toLocaleDateString('pt-BR'),
      Cliente: s.customer?.name || 'Sem cliente',
      Total: `R$ ${s.total.toFixed(2)}`,
      Status: getStatusLabel(s.status),
    }));

    if (format === 'excel') {
      exportToExcel(data, 'vendas');
    } else {
      exportToPDF(data, 'vendas', 'Vendas');
    }
  };

  const getStatusLabel = (status: SaleStatus) => {
    const labels: Record<SaleStatus, string> = {
      pending: 'Pendente',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };
    return labels[status];
  };

  const getStatusVariant = (status: SaleStatus) => {
    const variants: Record<SaleStatus, 'warning' | 'success' | 'danger'> = {
      pending: 'warning',
      completed: 'success',
      cancelled: 'danger',
    };
    return variants[status];
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: TableColumn<Sale>[] = [
    {
      key: 'created_at',
      label: 'Data',
      sortable: true,
      render: (s) => new Date(s.created_at).toLocaleDateString('pt-BR'),
    },
    {
      key: 'customer.name',
      label: 'Cliente',
      render: (s) => s.customer?.name || 'Sem cliente',
    },
    {
      key: 'seller_id',
      label: 'Vendedor',
      render: () => '-',
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      render: (s) => `R$ ${s.total.toFixed(2)}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => (
        <Badge variant={getStatusVariant(s.status)}>
          {getStatusLabel(s.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (s) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewSale(s)}
            className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
          >
            <VisibilityIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  if (!currentCompany) {
    return (
      <PageContainer title="Vendas">
        <EmptyState
          title="Selecione uma empresa"
          description="Selecione uma empresa para gerenciar as vendas"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Vendas"
      subtitle={`${filteredSales.length} vendas registradas`}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => handleExport('excel')}>
            <FileDownloadIcon className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')}>
            <FileDownloadIcon className="w-4 h-4" />
            PDF
          </Button>
          <Button onClick={handleOpenNewSale}>
            <AddIcon className="w-4 h-4" />
            Nova Venda
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon className="w-5 h-5" />}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SaleStatus | '')}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'pending', label: 'Pendente' },
                { value: 'completed', label: 'Concluída' },
                { value: 'cancelled', label: 'Cancelada' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredSales}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyMessage="Nenhuma venda encontrada"
      />

      {/* New Sale Modal */}
      <Modal
        isOpen={showNewSaleModal}
        onClose={() => setShowNewSaleModal(false)}
        title="Nova Venda"
        size="xl"
      >
        <form onSubmit={handleSubmitSale} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Cliente"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Selecione um cliente (opcional)"
            />
            <Select
              label="Forma de Pagamento"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'dinheiro', label: 'Dinheiro' },
                { value: 'pix', label: 'PIX' },
                { value: 'cartao_credito', label: 'Cartão de Crédito' },
                { value: 'cartao_debito', label: 'Cartão de Débito' },
              ]}
              placeholder="Selecione..."
            />
          </div>

          {/* Product Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Adicionar Produto
            </label>
            <Select
              value=""
              onChange={(e) => handleAddToCart(e.target.value)}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} - ${formatCurrency(p.price)} (Estoque: ${p.stock})`,
              }))}
              placeholder="Selecione um produto..."
            />
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Produto
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                      Qtd
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Preço
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Total
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cart.map((item) => (
                    <tr key={item.product.id}>
                      <td className="px-4 py-2 text-sm">{item.product.name}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              item.product.id,
                              parseInt(e.target.value)
                            )
                          }
                          className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {formatCurrency(item.product.price)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {formatCurrency(item.product.price * item.quantity)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Desconto:</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-32 text-right"
              />
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowNewSaleModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Finalizar Venda
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* View Sale Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Detalhes da Venda"
        size="lg"
      >
        {viewingSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data:</span>
                <p className="font-medium">
                  {new Date(viewingSale.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Cliente:</span>
                <p className="font-medium">
                  {viewingSale.customer?.name || 'Sem cliente'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Vendedor:</span>
                <p className="font-medium">-</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Forma de Pagamento:
                </span>
                <p className="font-medium">
                  {viewingSale.payment_method || '-'}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Produto
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                      Qtd
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Preço
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {viewingSale.items?.map((item: SaleItem) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{item.product_name}</td>
                      <td className="px-4 py-2 text-sm text-center">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span>{formatCurrency(viewingSale.subtotal)}</span>
              </div>
              {viewingSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Desconto:</span>
                  <span className="text-red-500">
                    -{formatCurrency(viewingSale.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary-600">
                  {formatCurrency(viewingSale.total)}
                </span>
              </div>
            </div>

            {/* Status Actions */}
            {isAdmin && viewingSale.status !== 'cancelled' && (
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {viewingSale.status === 'pending' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleUpdateStatus(viewingSale.id, 'completed');
                      setShowViewModal(false);
                    }}
                  >
                    Marcar como Concluída
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => {
                    handleUpdateStatus(viewingSale.id, 'cancelled');
                    setShowViewModal(false);
                  }}
                >
                  Cancelar Venda
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

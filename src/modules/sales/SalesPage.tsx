import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Select, Card, BarcodeScanner } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PrintButton, WhatsAppShareModal } from '../../components/print';
import { printReceipt } from '../../services/print';
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
  const [productSearch, setProductSearch] = useState('');

  // View Sale Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  // Cancel Sale Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingSale, setCancelingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // WhatsApp Share Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppSale, setWhatsAppSale] = useState<Sale | null>(null);

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
    setProductSearch('');
    setShowNewSaleModal(true);
  };

  // Filtrar produtos pela pesquisa (inclui EAN)
  const filteredProducts = products.filter((p) => {
    const searchLower = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      (p.description?.toLowerCase().includes(searchLower) ?? false) ||
      (p.sku?.toLowerCase().includes(searchLower) ?? false) ||
      (p.ean?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Buscar produto por EAN (para scanner)
  const findProductByEan = (ean: string): Product | undefined => {
    return products.find((p) => p.ean === ean);
  };

  const handleBarcodeScan = (code: string) => {
    const product = findProductByEan(code);
    if (product) {
      handleAddToCart(product.id);
      toast.success(`${product.name} adicionado ao carrinho`);
    } else {
      toast.error(`Produto com EAN ${code} não encontrado`);
    }
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
          seller_id: user!.id,
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

      // Auto print if enabled
      if (currentCompany?.print_settings?.auto_print && currentCompany?.print_settings?.enabled) {
        // Build complete sale object for printing
        const selectedCustomerData = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : undefined;
        const completeSale: Sale = {
          id: saleData.id,
          company_id: currentCompany.id,
          customer_id: selectedCustomer || null,
          seller_id: user!.id,
          status: 'completed',
          subtotal,
          discount: discountValue,
          total,
          payment_method: paymentMethod || null,
          notes: notes || null,
          customer_name: selectedCustomerData?.name || null,
          customer_phone: selectedCustomerData?.phone || null,
          created_at: saleData.created_at,
          updated_at: saleData.updated_at,
          customer: selectedCustomerData,
          items: saleItems.map((item, index) => ({
            id: `temp-${index}`,
            sale_id: saleData.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            created_at: saleData.created_at,
          })),
        };

        try {
          const printResult = await printReceipt(completeSale, currentCompany, {
            method: 'network',
            paperWidth: currentCompany.print_settings.paper_width || '80mm',
            autoCut: currentCompany.print_settings.auto_cut ?? true,
            showLogo: currentCompany.print_settings.print_logo ?? true,
            networkConfig: {
              ip: currentCompany.print_settings.ip,
              port: currentCompany.print_settings.port || 9100,
              timeout_ms: currentCompany.print_settings.timeout_ms || 5000,
            },
          });

          if (printResult.success) {
            toast.success('Comprovante impresso automaticamente!', { icon: '🖨️' });
          } else {
            toast.error(`Erro na impressao: ${printResult.error}`);
          }
        } catch (printError) {
          console.error('Auto print error:', printError);
          toast.error('Erro ao imprimir automaticamente');
        }
      }

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

  const handleOpenCancelModal = (sale: Sale) => {
    setCancelingSale(sale);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelingSale(null);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelingSale) return;

    setCancelling(true);
    try {
      // Atualizar status e adicionar justificativa nas notas
      const currentNotes = cancelingSale.notes || '';
      const cancelNote = cancelReason
        ? `[CANCELADO em ${new Date().toLocaleDateString('pt-BR')}] Motivo: ${cancelReason}`
        : `[CANCELADO em ${new Date().toLocaleDateString('pt-BR')}]`;
      const newNotes = currentNotes
        ? `${cancelNote}\n\n${currentNotes}`
        : cancelNote;

      const { error } = await supabase
        .from('sales')
        .update({
          status: 'cancelled',
          notes: newNotes
        })
        .eq('id', cancelingSale.id);

      if (error) throw error;

      toast.success('Venda cancelada com sucesso!');
      handleCloseCancelModal();
      setShowViewModal(false);
      fetchData();
    } catch {
      toast.error('Erro ao cancelar venda');
    } finally {
      setCancelling(false);
    }
  };

  // Abrir modal de envio via WhatsApp
  const handleOpenWhatsAppModal = (sale: Sale) => {
    setWhatsAppSale(sale);
    setShowWhatsAppModal(true);
  };

  // Helper para obter nome do cliente (cadastrado ou do catálogo)
  const getCustomerName = (sale: Sale): string => {
    if (sale.customer?.name) return sale.customer.name;
    if (sale.customer_name) return sale.customer_name;
    return 'Sem cliente';
  };

  // Helper para verificar se venda é do catálogo
  const isCatalogSale = (sale: Sale): boolean => {
    return !sale.customer_id && !!sale.customer_name;
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const data = filteredSales.map((s) => ({
      Data: new Date(s.created_at).toLocaleDateString('pt-BR'),
      Cliente: getCustomerName(s),
      Origem: isCatalogSale(s) ? 'Catálogo' : 'Balcão',
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
    const searchLower = search.toLowerCase();
    const matchesSearch =
      s.customer?.name?.toLowerCase().includes(searchLower) ||
      s.customer_name?.toLowerCase().includes(searchLower) ||
      s.customer_phone?.toLowerCase().includes(searchLower) ||
      s.id.toLowerCase().includes(searchLower);
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
      render: (s) => (
        <div className="flex items-center gap-2">
          <span>{getCustomerName(s)}</span>
          {isCatalogSale(s) && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              Catálogo
            </span>
          )}
        </div>
      ),
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
          <Button variant="secondary" onClick={() => handleExport('excel')} className="hidden sm:flex">
            <FileDownloadIcon className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')} className="hidden sm:flex">
            <FileDownloadIcon className="w-4 h-4" />
            PDF
          </Button>
          <Button onClick={handleOpenNewSale}>
            <AddIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Venda</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      }
      toolbar={
        <Card className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
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
      }
    >
      {/* Table */}
      <Table
        columns={columns}
        data={filteredSales}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyMessage="Nenhuma venda encontrada"
        mobileCardRender={(s) => (
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50"
            onClick={() => handleViewSale(s)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getCustomerName(s)}
                  </p>
                  {isCatalogSale(s) && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 whitespace-nowrap">
                      Catálogo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(s.created_at).toLocaleDateString('pt-BR')} - {new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <Badge variant={getStatusVariant(s.status)}>
                {getStatusLabel(s.status)}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {s.items?.length || 0} item(s)
              </span>
              <span className="text-lg font-bold text-primary-600">
                {formatCurrency(s.total)}
              </span>
            </div>
          </div>
        )}
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
            <div className="flex gap-2">
              <Input
                placeholder="Pesquisar por nome, SKU ou EAN..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                leftIcon={<SearchIcon className="w-5 h-5" />}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-1"
                title="Escanear código de barras"
              >
                <QrCodeScannerIcon className="w-5 h-5" />
              </button>
            </div>
            {productSearch && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 20).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleAddToCart(p.id);
                        setProductSearch('');
                      }}
                      disabled={p.stock <= 0}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-sm text-left
                        hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                        border-b border-gray-100 dark:border-gray-700 last:border-0
                        ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                        {p.sku && <span className="text-gray-400 ml-2">({p.sku})</span>}
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-primary-600">{formatCurrency(p.price)}</span>
                        <span className={`ml-2 text-xs ${p.stock <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          Est: {p.stock}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    Nenhum produto encontrado
                  </div>
                )}
                {filteredProducts.length > 20 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center bg-gray-50 dark:bg-gray-700/50">
                    Mostrando 20 de {filteredProducts.length} produtos. Refine sua busca.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Mobile: Cards */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-3 bg-white dark:bg-gray-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatCurrency(item.product.price)} cada
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(item.product.id, parseInt(e.target.value))
                        }
                        className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="font-medium text-primary-600">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data:</span>
                <p className="font-medium">
                  {new Date(viewingSale.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Cliente:</span>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {getCustomerName(viewingSale)}
                  </p>
                  {isCatalogSale(viewingSale) && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      Catálogo
                    </span>
                  )}
                </div>
                {viewingSale.customer_phone && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Tel: {viewingSale.customer_phone}
                  </p>
                )}
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Vendedor:</span>
                <p className="font-medium">-</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Pagamento:</span>
                <p className="font-medium">
                  {viewingSale.payment_method || '-'}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Mobile: Cards */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {viewingSale.items?.map((item: SaleItem) => (
                  <div key={item.id} className="p-3 bg-white dark:bg-gray-800">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm flex-1">
                        {item.product_name}
                      </p>
                      <span className="font-medium text-primary-600 text-sm">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{item.quantity}x</span>
                      <span>{formatCurrency(item.unit_price)} cada</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
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

            {/* Print and Share Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <PrintButton
                sale={viewingSale}
                company={currentCompany!}
                onPrintSuccess={() => toast.success('Comprovante impresso!')}
                onPrintError={(error) => toast.error(error)}
                onWhatsAppShare={() => handleOpenWhatsAppModal(viewingSale)}
              />

              {(viewingSale.customer_phone || viewingSale.customer?.phone) && (
                <Button
                  variant="secondary"
                  onClick={() => handleOpenWhatsAppModal(viewingSale)}
                  className="flex items-center gap-2"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Enviar WhatsApp
                </Button>
              )}
            </div>

            {/* Status Actions */}
            {isAdmin && viewingSale.status !== 'cancelled' && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                  onClick={() => handleOpenCancelModal(viewingSale)}
                >
                  Cancelar Venda
                </Button>
              </div>
            )}

            {/* Exibir motivo do cancelamento se houver */}
            {viewingSale.status === 'cancelled' && viewingSale.notes && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                  {viewingSale.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        title="Cancelar Venda"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              Tem certeza que deseja cancelar esta venda?
            </p>
            {cancelingSale && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-2">
                Venda de {formatCurrency(cancelingSale.total)} - {getCustomerName(cancelingSale)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivo do cancelamento (opcional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Informe o motivo do cancelamento..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={handleCloseCancelModal}
              disabled={cancelling}
            >
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              loading={cancelling}
            >
              Confirmar Cancelamento
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        title="Escanear Produto"
      />

      {/* WhatsApp Share Modal */}
      {whatsAppSale && (
        <WhatsAppShareModal
          isOpen={showWhatsAppModal}
          onClose={() => {
            setShowWhatsAppModal(false);
            setWhatsAppSale(null);
          }}
          sale={whatsAppSale}
          company={currentCompany!}
          onSuccess={() => toast.success('Comprovante enviado via WhatsApp!')}
          onError={(error) => toast.error(error)}
        />
      )}
    </PageContainer>
  );
}

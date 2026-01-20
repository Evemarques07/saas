import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Badge, Modal, ModalFooter, Input } from '../../components/ui';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../services/supabase';
import { sendTextMessage, formatOrderMessageForCustomer, WhatsAppSettings, defaultWhatsAppSettings } from '../../services/whatsapp';
import { CatalogOrder, CatalogOrderItem, CatalogOrderStatus } from '../../types';
import { PageLoader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';

interface OrderWithItems extends CatalogOrder {
  items: CatalogOrderItem[];
}

const statusConfig: Record<CatalogOrderStatus, { label: string; variant: 'warning' | 'info' | 'danger' | 'success' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'info' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  completed: { label: 'Entregue', variant: 'success' },
};

type StatusFilter = 'all' | CatalogOrderStatus;

export function CatalogOrdersPage() {
  const { currentCompany } = useTenant();
  const { user } = useAuth();
  const { refreshPendingCount, markOrdersAsSeen } = useNotifications();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentCompany) {
      fetchOrders();
      // Marcar como visto ao entrar na pagina
      markOrdersAsSeen();
    }
  }, [currentCompany, markOrdersAsSeen]);

  // Realtime subscription para atualizar lista automaticamente
  useRealtimeSubscription<CatalogOrder>({
    table: 'catalog_orders',
    filter: currentCompany ? `company_id=eq.${currentCompany.id}` : undefined,
    enabled: !!currentCompany,
    onInsert: () => {
      // Novo pedido - recarregar lista
      fetchOrders();
    },
    onUpdate: () => {
      // Status atualizado - recarregar lista
      fetchOrders();
    },
  });

  const fetchOrders = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_orders')
        .select(`
          *,
          items:catalog_order_items(*)
        `)
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const convertOrderToSale = async (order: OrderWithItems) => {
    if (!currentCompany || !user) return;

    // 1. Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        company_id: currentCompany.id,
        customer_id: null, // Cliente não cadastrado
        seller_id: user.uid,
        status: 'completed',
        subtotal: order.subtotal,
        discount: 0,
        total: order.total,
        payment_method: 'Catálogo Online',
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        notes: order.customer_notes || null,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Create sale items
    const saleItems = order.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.product_price,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // 3. Update stock for each product
    for (const item of order.items) {
      if (item.product_id) {
        // Get current stock
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.product_id);
        }
      }
    }

    return sale;
  };

  const updateOrderStatus = async (orderId: string, newStatus: CatalogOrderStatus) => {
    setUpdatingStatus(true);
    try {
      // Find the order
      const order = orders.find((o) => o.id === orderId);

      // If completing, convert to sale first
      if (newStatus === 'completed' && order) {
        await convertOrderToSale(order);
        toast.success('Pedido convertido em venda!');
      }

      // Update order status
      const { error } = await supabase
        .from('catalog_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      if (newStatus !== 'completed') {
        toast.success(`Pedido ${statusConfig[newStatus].label.toLowerCase()}`);
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      // Atualizar contagem de pedidos pendentes
      refreshPendingCount();

      // Send WhatsApp notification if enabled
      if (order && currentCompany) {
        await sendWhatsAppNotification(order, newStatus);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar pedido');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const sendWhatsAppNotification = async (order: OrderWithItems, newStatus: CatalogOrderStatus) => {
    try {
      // LGPD: Verificar consentimento do cliente
      if (!order.whatsapp_consent) {
        console.log('[WhatsApp] Skipping - customer did not consent to WhatsApp messages');
        return;
      }

      console.log('[WhatsApp] sendWhatsAppNotification called', { orderId: order.id, newStatus, customerPhone: order.customer_phone });

      // Get company WhatsApp settings
      const rawSettings = currentCompany?.whatsapp_settings;
      console.log('[WhatsApp] Raw settings:', rawSettings);

      const whatsAppSettings: WhatsAppSettings = rawSettings
        ? (rawSettings as WhatsAppSettings)
        : defaultWhatsAppSettings;

      console.log('[WhatsApp] Settings:', {
        enabled: whatsAppSettings.enabled,
        connected: whatsAppSettings.connected,
        hasToken: !!whatsAppSettings.user_token,
        notify_on_confirm: whatsAppSettings.notify_on_confirm,
        notify_on_complete: whatsAppSettings.notify_on_complete,
        notify_on_cancel: whatsAppSettings.notify_on_cancel
      });

      // Check if WhatsApp is enabled and connected
      if (!whatsAppSettings.enabled || !whatsAppSettings.connected || !whatsAppSettings.user_token) {
        console.log('[WhatsApp] Skipping - not enabled/connected');
        return;
      }

      // Check if notification is enabled for this status
      const shouldNotify =
        (newStatus === 'confirmed' && whatsAppSettings.notify_on_confirm) ||
        (newStatus === 'completed' && whatsAppSettings.notify_on_complete) ||
        (newStatus === 'cancelled' && whatsAppSettings.notify_on_cancel);

      console.log('[WhatsApp] Should notify:', shouldNotify);

      if (!shouldNotify) {
        console.log('[WhatsApp] Notification disabled for this status');
        return;
      }

      // Map status to message type
      const messageType = newStatus === 'cancelled' ? 'cancelled' :
        newStatus === 'confirmed' ? 'confirmed' : 'completed';

      // Format the message
      const message = formatOrderMessageForCustomer(
        order.customer_name,
        currentCompany?.name || '',
        order.id,
        order.items.map((item) => ({
          quantity: item.quantity,
          product_name: item.product_name,
          subtotal: item.total,
        })),
        order.total,
        messageType
      );

      // Send the message
      const result = await sendTextMessage(
        whatsAppSettings.user_token,
        order.customer_phone,
        message
      );

      if (result.success) {
        console.log(`[WhatsApp] Notification sent for order ${order.id} - status: ${newStatus}`);
      } else {
        console.error(`[WhatsApp] Failed to send notification:`, result.error);
      }
    } catch (error) {
      console.error('[WhatsApp] Error sending notification:', error);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));

  const formatPhoneForWhatsApp = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) return `55${numbers}`;
    if (numbers.length === 13 && numbers.startsWith('55')) return numbers;
    return `55${numbers}`;
  };

  const openWhatsApp = (order: OrderWithItems) => {
    const phone = formatPhoneForWhatsApp(order.customer_phone);
    let message = `Olá ${order.customer_name}! `;
    message += `Recebemos seu pedido de ${formatCurrency(order.total)}. `;

    if (order.status === 'confirmed') {
      message += 'Seu pedido foi confirmado e está sendo preparado!';
    } else if (order.status === 'completed') {
      message += 'Seu pedido foi entregue. Obrigado pela preferência!';
    } else {
      message += 'Em breve entraremos em contato.';
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Contadores por status
  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  // Filtrar pedidos por status e nome
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch = searchTerm === '' ||
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer
      title="Pedidos do Catálogo"
      subtitle={statusCounts.pending > 0 ? `${statusCounts.pending} pedido(s) pendente(s)` : 'Pedidos recebidos pelo catálogo público'}
      action={
        <Button variant="secondary" onClick={fetchOrders} icon={<RefreshIcon />}>
          Atualizar
        </Button>
      }
      toolbar={
        <Card className="p-3">
          <div className="flex flex-col gap-3">
            {/* Campo de busca */}
            <div className="relative">
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<SearchIcon className="w-5 h-5" />}
                rightIcon={
                  searchTerm ? (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                    >
                      <ClearIcon className="w-4 h-4 text-gray-400" />
                    </button>
                  ) : undefined
                }
              />
            </div>
            {/* Filtros de status */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Todos ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
                }`}
              >
                Pendentes
                {statusCounts.pending > 0 && (
                  <span className={`min-w-[20px] h-5 flex items-center justify-center text-xs font-bold rounded-full px-1 ${
                    statusFilter === 'pending' ? 'bg-white/20' : 'bg-yellow-500 text-white'
                  }`}>
                    {statusCounts.pending}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStatusFilter('confirmed')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === 'confirmed'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                }`}
              >
                Confirmados ({statusCounts.confirmed})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === 'completed'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                }`}
              >
                Entregues ({statusCounts.completed})
              </button>
            </div>
          </div>
        </Card>
      }
    >
      {filteredOrders.length === 0 ? (
        <EmptyState
          title={
            searchTerm
              ? "Nenhum pedido encontrado"
              : statusFilter === 'all'
                ? "Nenhum pedido"
                : `Nenhum pedido ${statusConfig[statusFilter].label.toLowerCase()}`
          }
          description={
            searchTerm
              ? `Não encontramos pedidos para "${searchTerm}"`
              : statusFilter === 'all'
                ? "Quando clientes fizerem pedidos pelo catálogo, eles aparecerão aqui"
                : "Não há pedidos com este status no momento"
          }
          icon={<LocalShippingIcon className="w-12 h-12" />}
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col gap-4">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* Order Info */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {order.customer_name}
                      </h3>
                      <Badge variant={statusConfig[order.status].variant}>
                        {statusConfig[order.status].label}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
                      <p>Tel: {order.customer_phone}</p>
                      <p>{formatDate(order.created_at)}</p>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(order.total)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items.length} item(s)
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    icon={<VisibilityIcon />}
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openWhatsApp(order)}
                    icon={<WhatsAppIcon />}
                    className="!text-green-600 hover:!bg-green-50 dark:hover:!bg-green-900/20"
                  >
                    WhatsApp
                  </Button>

                  <div className="flex-1" />

                  {order.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        icon={<CheckCircleIcon />}
                        loading={updatingStatus}
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        icon={<CancelIcon />}
                        loading={updatingStatus}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      icon={<LocalShippingIcon />}
                      loading={updatingStatus}
                      className="!bg-green-600 hover:!bg-green-700"
                    >
                      Marcar Entregue
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Detalhes do Pedido"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Dados do Cliente
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedOrder.customer_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Tel: {selectedOrder.customer_phone}
                </p>
                {selectedOrder.customer_notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Obs: {selectedOrder.customer_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Itens do Pedido
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary-600">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Meta */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Pedido em: {formatDate(selectedOrder.created_at)}</span>
              <Badge variant={statusConfig[selectedOrder.status].variant}>
                {statusConfig[selectedOrder.status].label}
              </Badge>
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
            Fechar
          </Button>
          {selectedOrder && (
            <Button
              onClick={() => openWhatsApp(selectedOrder)}
              icon={<WhatsAppIcon />}
              className="!bg-green-600 hover:!bg-green-700"
            >
              Contatar via WhatsApp
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </PageContainer>
  );
}

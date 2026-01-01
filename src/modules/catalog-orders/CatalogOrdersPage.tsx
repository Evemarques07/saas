import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Badge, Modal, ModalFooter } from '../../components/ui';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { CatalogOrder, CatalogOrderItem, CatalogOrderStatus } from '../../types';
import { PageLoader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/feedback/EmptyState';

interface OrderWithItems extends CatalogOrder {
  items: CatalogOrderItem[];
}

const statusConfig: Record<CatalogOrderStatus, { label: string; variant: 'warning' | 'info' | 'danger' | 'success' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'info' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  completed: { label: 'Entregue', variant: 'success' },
};

export function CatalogOrdersPage() {
  const { currentCompany } = useTenant();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchOrders();
    }
  }, [currentCompany]);

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
        notes: `Pedido do catálogo - Cliente: ${order.customer_name} - Tel: ${order.customer_phone}${order.customer_notes ? ` - Obs: ${order.customer_notes}` : ''}`,
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
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar pedido');
    } finally {
      setUpdatingStatus(false);
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

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer
      title="Pedidos do Catálogo"
      subtitle={pendingCount > 0 ? `${pendingCount} pedido(s) pendente(s)` : 'Pedidos recebidos pelo catálogo público'}
      action={
        <Button variant="secondary" onClick={fetchOrders} icon={<RefreshIcon />}>
          Atualizar
        </Button>
      }
    >
      {orders.length === 0 ? (
        <EmptyState
          title="Nenhum pedido"
          description="Quando clientes fizerem pedidos pelo catálogo, eles aparecerão aqui"
          icon={<LocalShippingIcon className="w-12 h-12" />}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
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

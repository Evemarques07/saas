import { useState } from 'react';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Button } from '../../../components/ui';
import { useCatalogCustomer } from '../../../contexts/CatalogCustomerContext';
import { CatalogOrder, CatalogOrderStatus } from '../../../types';
import { OrderDetailModal } from './OrderDetailModal';

interface OrderHistoryListProps {
  onRepeatOrder?: (items: { productId: string; quantity: number }[]) => void;
}

const statusConfig: Record<
  CatalogOrderStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pendente',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <AccessTimeIcon className="w-4 h-4" />,
  },
  confirmed: {
    label: 'Confirmado',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <LocalShippingIcon className="w-4 h-4" />,
  },
  completed: {
    label: 'Concluído',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircleIcon className="w-4 h-4" />,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <CancelIcon className="w-4 h-4" />,
  },
};

export function OrderHistoryList({ onRepeatOrder }: OrderHistoryListProps) {
  const { orders, ordersLoading, loadOrders } = useCatalogCustomer();
  const [selectedOrder, setSelectedOrder] = useState<CatalogOrder | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ReceiptLongIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Nenhum pedido encontrado
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Seus pedidos aparecerão aqui depois que você fizer uma compra
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Refresh button */}
      <div className="flex justify-end mb-4">
        <Button variant="secondary" size="sm" icon={<RefreshIcon />} onClick={loadOrders}>
          Atualizar
        </Button>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {orders.map((order) => {
          const status = statusConfig[order.status];

          return (
            <div
              key={order.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              {/* Order header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pedido #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}
                >
                  {status.icon}
                  {status.label}
                </span>
              </div>

              {/* Items preview */}
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {order.items && order.items.length > 0 ? (
                  <>
                    {order.items.slice(0, 2).map((item, idx) => (
                      <p key={idx} className="truncate">
                        {item.quantity}x {item.product_name}
                      </p>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-gray-400 dark:text-gray-500">
                        +{order.items.length - 2} outros itens
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400">Carregando itens...</p>
                )}
              </div>

              {/* Order footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(order.total)}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<VisibilityIcon />}
                  onClick={() => setSelectedOrder(order)}
                >
                  Ver Detalhes
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order detail modal */}
      <OrderDetailModal
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onRepeatOrder={onRepeatOrder}
      />
    </div>
  );
}

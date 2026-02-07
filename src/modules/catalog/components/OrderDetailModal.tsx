import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReplayIcon from '@mui/icons-material/Replay';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Modal, ModalFooter, Button } from '../../../components/ui';
import { CatalogOrder, CatalogOrderStatus } from '../../../types';
import toast from 'react-hot-toast';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CatalogOrder | null;
  onRepeatOrder?: (items: { productId: string; quantity: number }[]) => void;
}

const statusConfig: Record<
  CatalogOrderStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode; description: string }
> = {
  pending: {
    label: 'Pendente',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <AccessTimeIcon className="w-5 h-5" />,
    description: 'Aguardando confirmação da empresa',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <LocalShippingIcon className="w-5 h-5" />,
    description: 'Pedido confirmado e em preparação',
  },
  completed: {
    label: 'Concluído',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircleIcon className="w-5 h-5" />,
    description: 'Pedido entregue com sucesso',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <CancelIcon className="w-5 h-5" />,
    description: 'Pedido foi cancelado',
  },
};

export function OrderDetailModal({ isOpen, onClose, order, onRepeatOrder }: OrderDetailModalProps) {
  if (!order) return null;

  const status = statusConfig[order.status];

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

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success('ID do pedido copiado!');
  };

  const handleRepeatOrder = () => {
    if (!order.items || order.items.length === 0) {
      toast.error('Não foi possível carregar os itens do pedido');
      return;
    }

    const items = order.items
      .filter((item) => item.product_id)
      .map((item) => ({
        productId: item.product_id!,
        quantity: item.quantity,
      }));

    if (items.length === 0) {
      toast.error('Os produtos deste pedido não estão mais disponíveis');
      return;
    }

    onRepeatOrder?.(items);
    toast.success('Itens adicionados ao carrinho!');
    onClose();
  };

  // Calculate totals
  const couponDiscount = order.coupon_discount || 0;
  const pointsDiscount = order.points_discount || 0;
  const promotionDiscount = order.promotion_discount || 0;
  const detailedDiscount = couponDiscount + pointsDiscount + promotionDiscount;
  // Fallback: se não tem desconto detalhado, usa o campo discount genérico ou calcula pela diferença
  const totalDiscount = detailedDiscount > 0
    ? detailedDiscount
    : (order.discount || (order.subtotal - order.total));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Pedido" size="lg">
      <div className="space-y-4">
        {/* Order ID and Date */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pedido</p>
            <button
              onClick={handleCopyOrderId}
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <span className="font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
              <ContentCopyIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Data</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-3 p-3 rounded-lg ${status.bgColor}`}>
          <div className={status.color}>{status.icon}</div>
          <div>
            <p className={`font-medium ${status.color}`}>{status.label}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{status.description}</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Itens do Pedido
          </h4>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg divide-y divide-gray-200 dark:divide-gray-600">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.quantity}x {formatCurrency(item.product_price)}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.total)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order notes */}
        {order.customer_notes && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Observações
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              {order.customer_notes}
            </p>
          </div>
        )}

        {/* Totals */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-gray-100">{formatCurrency(order.subtotal)}</span>
          </div>

          {/* Cupom com código */}
          {order.coupon_code && couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">
                Cupom: {order.coupon_code}
              </span>
              <span className="text-green-600 dark:text-green-400">
                -{formatCurrency(couponDiscount)}
              </span>
            </div>
          )}

          {/* Pontos usados */}
          {order.points_used && order.points_used > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600 dark:text-amber-400">
                Pontos: {order.points_used} pts
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                -{formatCurrency(pointsDiscount)}
              </span>
            </div>
          )}

          {/* Promoção */}
          {promotionDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-purple-600 dark:text-purple-400">
                Promoção
              </span>
              <span className="text-purple-600 dark:text-purple-400">
                -{formatCurrency(promotionDiscount)}
              </span>
            </div>
          )}

          {/* Desconto genérico (quando não tem detalhamento) */}
          {totalDiscount > 0 && detailedDiscount === 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">
                Desconto
              </span>
              <span className="text-green-600 dark:text-green-400">
                -{formatCurrency(totalDiscount)}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
            <span className="font-bold text-lg text-primary-600">{formatCurrency(order.total)}</span>
          </div>

          {/* Pontos ganhos */}
          {order.points_earned && order.points_earned > 0 && (
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-amber-600 dark:text-amber-400">Pontos ganhos</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                +{order.points_earned} pts
              </span>
            </div>
          )}
        </div>
      </div>

      <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
        {order.status !== 'cancelled' && onRepeatOrder && (
          <Button icon={<ReplayIcon />} onClick={handleRepeatOrder}>
            Repetir Pedido
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

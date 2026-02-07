import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorIcon from '@mui/icons-material/Error';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DownloadIcon from '@mui/icons-material/Download';
import { Badge, Button } from '../../../components/ui';
import type { Payment, PaymentStatus } from '../../../types';

interface PaymentHistoryProps {
  payments: Payment[];
  compact?: boolean;
}

const statusConfig: Record<
  PaymentStatus | string,
  { label: string; color: 'success' | 'warning' | 'danger' | 'default'; icon: typeof CheckCircleIcon }
> = {
  CONFIRMED: { label: 'Pago', color: 'success', icon: CheckCircleIcon },
  RECEIVED: { label: 'Recebido', color: 'success', icon: CheckCircleIcon },
  PENDING: { label: 'Pendente', color: 'warning', icon: PendingIcon },
  OVERDUE: { label: 'Vencido', color: 'danger', icon: ErrorIcon },
  REFUNDED: { label: 'Reembolsado', color: 'default', icon: ReceiptIcon },
  REFUND_REQUESTED: { label: 'Reembolso Solicitado', color: 'warning', icon: PendingIcon },
  CHARGEBACK_REQUESTED: { label: 'Chargeback', color: 'danger', icon: ErrorIcon },
  CHARGEBACK_DISPUTE: { label: 'Disputa', color: 'danger', icon: ErrorIcon },
  AWAITING_CHARGEBACK_REVERSAL: { label: 'Aguardando Reversao', color: 'warning', icon: PendingIcon },
  DUNNING_REQUESTED: { label: 'Cobranca Solicitada', color: 'warning', icon: PendingIcon },
  DUNNING_RECEIVED: { label: 'Cobranca Recebida', color: 'success', icon: CheckCircleIcon },
  AWAITING_RISK_ANALYSIS: { label: 'Analise de Risco', color: 'warning', icon: PendingIcon },
};

const billingTypeLabels: Record<string, string> = {
  CREDIT_CARD: 'Cartao',
  BOLETO: 'Boleto',
  PIX: 'PIX',
  UNDEFINED: '-',
};

export function PaymentHistory({ payments, compact = false }: PaymentHistoryProps) {
  const handleDownloadInvoice = (payment: Payment) => {
    if (payment.invoice_url) {
      window.open(payment.invoice_url, '_blank');
    }
  };

  const handlePayNow = (payment: Payment) => {
    // Open payment link based on billing type
    if (payment.bank_slip_url) {
      window.open(payment.bank_slip_url, '_blank');
    } else if (payment.invoice_url) {
      window.open(payment.invoice_url, '_blank');
    }
  };

  if (payments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Nenhum pagamento encontrado
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {payments.map((payment) => {
        const status = statusConfig[payment.status] || {
          label: payment.status,
          color: 'default' as const,
          icon: ReceiptIcon,
        };
        const StatusIcon = status.icon;

        return (
          <div
            key={payment.id}
            className={`flex items-center justify-between ${compact ? 'p-3' : 'p-4'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status.color === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : status.color === 'warning'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : status.color === 'danger'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <StatusIcon
                  className={`w-5 h-5 ${
                    status.color === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : status.color === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : status.color === 'danger'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500'
                  }`}
                />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  R$ {payment.amount.toFixed(2)}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                  </span>
                  <span>•</span>
                  <span>{billingTypeLabels[payment.billing_type] || payment.billing_type}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={status.color}>{status.label}</Badge>

              {!compact && (
                <>
                  {(payment.status === 'PENDING' || payment.status === 'OVERDUE') &&
                    (payment.bank_slip_url || payment.invoice_url) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePayNow(payment)}
                      >
                        Pagar
                      </Button>
                    )}

                  {payment.invoice_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadInvoice(payment)}
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

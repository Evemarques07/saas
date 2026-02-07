import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import QrCodeIcon from '@mui/icons-material/QrCode';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Modal, ModalFooter, Button, Input } from '../../../components/ui';
import {
  createSubscription,
  subscribeToSubscriptionStatus,
  pollSubscriptionStatus,
  type PaymentInfo,
  type SubscriptionWithPayment,
} from '../../../services/asaas';
import type { Plan, Subscription, BillingType, BillingCycle } from '../../../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  currentSubscription: Subscription | null; // Mantido para uso futuro (validações de upgrade)
  companyId: string;
  onSuccess: () => void;
}

const billingTypes: { value: BillingType; label: string; icon: typeof CreditCardIcon; description: string }[] = [
  {
    value: 'PIX',
    label: 'PIX',
    icon: QrCodeIcon,
    description: 'Pagamento instantaneo',
  },
  {
    value: 'BOLETO',
    label: 'Boleto',
    icon: ReceiptIcon,
    description: 'Vence em 3 dias uteis',
  },
  {
    value: 'CREDIT_CARD',
    label: 'Cartao de Credito',
    icon: CreditCardIcon,
    description: 'Pagamento automatico',
  },
];

const billingCycles: { value: BillingCycle; label: string; discount?: string }[] = [
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual', discount: '2 meses gratis' },
];

// Mask CPF/CNPJ
const maskCpfCnpj = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    // CPF: 000.000.000-00
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return numbers
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

// Validar CPF
const validateCpf = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;

  return true;
};

// Validar CNPJ
const validateCnpj = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;

  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(numbers[12])) return false;

  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(numbers[13])) return false;

  return true;
};

// Validar CPF ou CNPJ
const validateCpfCnpj = (value: string): { valid: boolean; message?: string } => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length === 0) {
    return { valid: false, message: 'CPF ou CNPJ e obrigatorio' };
  }

  if (numbers.length < 11) {
    return { valid: false, message: 'CPF incompleto' };
  }

  if (numbers.length === 11) {
    if (!validateCpf(numbers)) {
      return { valid: false, message: 'CPF invalido' };
    }
    return { valid: true };
  }

  if (numbers.length < 14) {
    return { valid: false, message: 'CNPJ incompleto' };
  }

  if (numbers.length === 14) {
    if (!validateCnpj(numbers)) {
      return { valid: false, message: 'CNPJ invalido' };
    }
    return { valid: true };
  }

  return { valid: false, message: 'CPF ou CNPJ invalido' };
};

type ModalStep = 'billing' | 'customer' | 'payment' | 'success';

export function UpgradeModal({
  isOpen,
  onClose,
  plan,
  currentSubscription: _currentSubscription, // Prefixo _ para indicar uso futuro
  companyId,
  onSuccess,
}: UpgradeModalProps) {
  const [step, setStep] = useState<ModalStep>('billing');
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionWithPayment | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [cpfCnpjError, setCpfCnpjError] = useState<string | null>(null);

  // Customer data
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
  });

  const price = billingCycle === 'YEARLY' && plan.price_yearly
    ? plan.price_yearly
    : plan.price_monthly;

  // Realtime + Polling fallback para verificar status do pagamento
  useEffect(() => {
    if (step !== 'payment' || !subscription?.id) return;

    const handleStatusChange = (_status: string, isActive: boolean) => {
      if (isActive) {
        setStep('success');
        toast.success('Pagamento confirmado!');
      }
    };

    // 1. Usar Realtime para detecção instantânea
    const cancelRealtime = subscribeToSubscriptionStatus(
      subscription.id,
      handleStatusChange
    );

    // 2. Polling como fallback (caso Realtime falhe)
    const cancelPolling = pollSubscriptionStatus(
      subscription.id,
      handleStatusChange,
      { interval: 10000, maxAttempts: 30 } // Check every 10s for up to 5 min (less frequent since we have realtime)
    );

    return () => {
      cancelRealtime();
      cancelPolling();
    };
  }, [step, subscription?.id]);

  const handleBillingTypeSelect = (type: BillingType) => {
    setBillingType(type);
  };

  const handleContinue = () => {
    if (step === 'billing') {
      setStep('customer');
    }
  };

  const handleBack = () => {
    if (step === 'customer') {
      setStep('billing');
    } else if (step === 'payment') {
      // Não permite voltar do pagamento para não criar duplicatas
      toast.error('Aguarde a confirmacao do pagamento ou feche o modal');
    }
  };

  const handleCreateSubscription = async () => {
    // Validate customer data
    if (!customerData.name || !customerData.email || !customerData.cpfCnpj) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }

    // Validate CPF/CNPJ with full validation
    const cpfCnpjValidation = validateCpfCnpj(customerData.cpfCnpj);
    if (!cpfCnpjValidation.valid) {
      toast.error(cpfCnpjValidation.message || 'CPF ou CNPJ invalido');
      return;
    }

    const cpfCnpjNumbers = customerData.cpfCnpj.replace(/\D/g, '');

    setLoading(true);
    try {
      const result = await createSubscription({
        companyId,
        planId: plan.id,
        billingType,
        billingCycle,
        customerData: {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: cpfCnpjNumbers,
          phone: customerData.phone.replace(/\D/g, '') || undefined,
        },
      }) as SubscriptionWithPayment;

      setSubscription(result);
      setPaymentInfo(result.payment || null);
      setStep('payment');
      toast.success('Assinatura criada! Aguardando pagamento...');
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a area de transferencia!');
  }, []);

  const handleClose = () => {
    // Se já completou o pagamento, chama onSuccess
    if (step === 'success') {
      onSuccess();
    }
    // Reset state
    setStep('billing');
    setBillingType('PIX');
    setBillingCycle('MONTHLY');
    setCustomerData({ name: '', email: '', cpfCnpj: '', phone: '' });
    setSubscription(null);
    setPaymentInfo(null);
    setCpfCnpjError(null);
    onClose();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'success'
          ? 'Pagamento Confirmado!'
          : step === 'payment'
          ? 'Realizar Pagamento'
          : `Assinar ${plan.display_name}`
      }
      size="md"
    >
      <div className="p-4 space-y-6">
        {/* Plan Summary - Always visible except success */}
        {step !== 'success' && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {plan.display_name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {price.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  /{billingCycle === 'YEARLY' ? 'ano' : 'mes'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Billing Options */}
        {step === 'billing' && (
          <>
            {/* Billing Cycle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ciclo de Cobranca
              </label>
              <div className="grid grid-cols-2 gap-3">
                {billingCycles.map((cycle) => (
                  <button
                    key={cycle.value}
                    type="button"
                    onClick={() => setBillingCycle(cycle.value)}
                    className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                      billingCycle === cycle.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {cycle.label}
                    </p>
                    {cycle.discount && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {cycle.discount}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Forma de Pagamento
              </label>
              <div className="space-y-2">
                {billingTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleBillingTypeSelect(type.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        billingType === type.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          billingType === type.value
                            ? 'bg-primary-100 dark:bg-primary-800'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            billingType === type.value
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-gray-500'
                          }`}
                        />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Step: Customer Data */}
        {step === 'customer' && (
          <div className="space-y-4">
            <Input
              label="Nome Completo / Razao Social *"
              value={customerData.name}
              onChange={(e) =>
                setCustomerData({ ...customerData, name: e.target.value })
              }
              placeholder="Nome completo ou razao social"
            />

            <Input
              label="Email *"
              type="email"
              value={customerData.email}
              onChange={(e) =>
                setCustomerData({ ...customerData, email: e.target.value })
              }
              placeholder="seu@email.com"
            />

            <Input
              label="CPF ou CNPJ *"
              value={customerData.cpfCnpj}
              onChange={(e) => {
                const masked = maskCpfCnpj(e.target.value);
                setCustomerData({ ...customerData, cpfCnpj: masked });
                // Validar apenas quando tiver tamanho completo
                const numbers = masked.replace(/\D/g, '');
                if (numbers.length === 11 || numbers.length === 14) {
                  const validation = validateCpfCnpj(masked);
                  setCpfCnpjError(validation.valid ? null : validation.message || null);
                } else if (numbers.length > 0) {
                  setCpfCnpjError(null); // Limpa erro enquanto digita
                }
              }}
              placeholder="000.000.000-00"
              maxLength={18}
              error={cpfCnpjError || undefined}
            />

            <Input
              label="Telefone (opcional)"
              value={customerData.phone}
              onChange={(e) =>
                setCustomerData({ ...customerData, phone: e.target.value })
              }
              placeholder="(00) 00000-0000"
            />
          </div>
        )}

        {/* Step: Payment - Show QR Code or Boleto */}
        {step === 'payment' && paymentInfo && (
          <div className="space-y-6">
            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AccessTimeIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
              <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                Aguardando pagamento...
              </span>
            </div>

            {/* PIX Payment */}
            {billingType === 'PIX' && (
              <div className="space-y-4">
                {paymentInfo.pixQrCode && (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Escaneie o QR Code com seu app de banco
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-inner">
                      <img
                        src={paymentInfo.pixQrCode}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                )}

                {paymentInfo.pixCopyPaste && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ou copie o codigo PIX:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentInfo.pixCopyPaste}
                        readOnly
                        className="flex-1 p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 truncate"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(paymentInfo.pixCopyPaste!)}
                      >
                        <ContentCopyIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Boleto Payment */}
            {billingType === 'BOLETO' && (
              <div className="space-y-4">
                <div className="text-center">
                  <ReceiptIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Boleto gerado com sucesso!
                  </p>
                  {paymentInfo.dueDate && (
                    <p className="text-sm text-gray-500">
                      Vencimento: {formatDate(paymentInfo.dueDate)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {paymentInfo.bankSlipUrl && (
                    <Button
                      onClick={() => window.open(paymentInfo.bankSlipUrl, '_blank')}
                      className="w-full"
                    >
                      <OpenInNewIcon className="w-4 h-4 mr-2" />
                      Abrir Boleto
                    </Button>
                  )}
                  {paymentInfo.invoiceUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(paymentInfo.invoiceUrl, '_blank')}
                      className="w-full"
                    >
                      <OpenInNewIcon className="w-4 h-4 mr-2" />
                      Ver Fatura
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Credit Card - Redirect to Asaas */}
            {billingType === 'CREDIT_CARD' && paymentInfo.invoiceUrl && (
              <div className="space-y-4">
                <div className="text-center">
                  <CreditCardIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Complete o pagamento com cartao de credito
                  </p>
                </div>

                <Button
                  onClick={() => window.open(paymentInfo.invoiceUrl, '_blank')}
                  className="w-full"
                >
                  <OpenInNewIcon className="w-4 h-4 mr-2" />
                  Pagar com Cartao
                </Button>
              </div>
            )}

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              A pagina sera atualizada automaticamente quando o pagamento for confirmado
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Assinatura Ativada!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Seu plano {plan.display_name} ja esta ativo. Aproveite todos os recursos!
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-left">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Recursos liberados:
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Ate {plan.product_limit || 'ilimitados'} produtos</li>
                <li>• Ate {plan.user_limit || 'ilimitados'} usuarios</li>
                <li>• {plan.storage_limit_mb ? `${plan.storage_limit_mb} MB` : 'Ilimitado'} de armazenamento</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        {step === 'billing' && (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleContinue}>Continuar</Button>
          </>
        )}

        {step === 'customer' && (
          <>
            <Button variant="outline" onClick={handleBack}>
              Voltar
            </Button>
            <Button onClick={handleCreateSubscription} loading={loading}>
              Confirmar e Pagar
            </Button>
          </>
        )}

        {step === 'payment' && (
          <Button variant="outline" onClick={handleClose} className="w-full">
            Fechar (continuar pagamento depois)
          </Button>
        )}

        {step === 'success' && (
          <Button onClick={handleClose} className="w-full">
            Concluir
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

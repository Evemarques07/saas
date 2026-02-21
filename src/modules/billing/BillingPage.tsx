import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button } from '../../components/ui';
import { useTenant } from '../../contexts/TenantContext';
import { PlanCard } from './components/PlanCard';
import { CurrentPlanCard } from './components/CurrentPlanCard';
import { PaymentHistory } from './components/PaymentHistory';
import { UsageCard } from './components/UsageCard';
import { UpgradeModal } from './components/UpgradeModal';
import {
  getPlans,
  getCompanySubscription,
  getSubscriptionPayments,
  getCompanyUsage,
  type UsageLimits,
} from '../../services/asaas';
import type { Plan, Subscription, Payment } from '../../types';

type TabType = 'overview' | 'plans' | 'payments';

export function BillingPage() {
  const { currentCompany, isAdmin } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (currentCompany?.id) {
      loadBillingData();
    }
  }, [currentCompany?.id]);

  const loadBillingData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [plansData, subscriptionData] = await Promise.all([
        getPlans(),
        getCompanySubscription(currentCompany.id),
      ]);
      const usageData = await getCompanyUsage(currentCompany.id, subscriptionData);

      setPlans(plansData);
      setSubscription(subscriptionData);
      setUsage(usageData);

      if (subscriptionData) {
        const paymentsData = await getSubscriptionPayments(subscriptionData.id);
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Erro ao carregar dados de faturamento');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setUpgradeModalOpen(true);
  };

  const handleUpgradeComplete = () => {
    setUpgradeModalOpen(false);
    setSelectedPlan(null);
    loadBillingData();
    toast.success('Plano atualizado com sucesso!');
  };

  const currentPlan = subscription?.plan || plans.find((p) => p.name === 'free');

  const tabs = [
    { id: 'overview' as const, label: 'Visao Geral', icon: TrendingUpIcon },
    { id: 'plans' as const, label: 'Planos', icon: CreditCardIcon },
    { id: 'payments' as const, label: 'Pagamentos', icon: ReceiptLongIcon },
  ];

  if (!isAdmin) {
    return (
      <PageContainer
        title="Faturamento"
        subtitle="Gerencie seu plano e pagamentos"
      >
        <Card>
          <div className="p-8 text-center">
            <WarningAmberIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Acesso Restrito
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Apenas administradores podem acessar as configuracoes de faturamento.
            </p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Faturamento"
      subtitle="Gerencie seu plano e pagamentos"
    >
      {/* Tabs - responsivas */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="-mb-px flex justify-between sm:justify-start sm:space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">
                  {tab.id === 'overview' ? 'Geral' : tab.id === 'plans' ? 'Planos' : 'Pagam.'}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Status Alert */}
              {subscription?.status === 'overdue' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                  <WarningAmberIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200">
                      Pagamento em Atraso
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      Sua assinatura esta com pagamento pendente. Regularize para evitar a suspensao dos servicos.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => setActiveTab('payments')}
                    >
                      Ver Pagamentos
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Plan */}
                <CurrentPlanCard
                  plan={currentPlan || null}
                  subscription={subscription}
                  onUpgrade={() => setActiveTab('plans')}
                />

                {/* Usage */}
                {usage && <UsageCard usage={usage} plan={currentPlan || null} />}
              </div>

              {/* Recent Payments */}
              {payments.length > 0 && (
                <Card>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Pagamentos Recentes
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('payments')}
                    >
                      Ver todos
                    </Button>
                  </div>
                  <PaymentHistory payments={payments.slice(0, 3)} compact />
                </Card>
              )}
            </div>
          )}

          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              {/* Billing Cycle Toggle */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mensal</span>
                <span className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                  Economize ate 17% no plano anual
                </span>
              </div>

              {/* Plans - Scroll horizontal em mobile, grid em desktop */}
              <div className="relative -mx-4 sm:mx-0 overflow-visible">
                {/* Mobile: scroll horizontal */}
                <div className="flex sm:hidden overflow-x-auto gap-3 px-4 pt-5 pb-4 snap-x snap-mandatory scrollbar-hide">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex-shrink-0 w-[280px] snap-center"
                    >
                      <PlanCard
                        plan={plan}
                        isCurrentPlan={currentPlan?.id === plan.id}
                        onSelect={() => handleUpgrade(plan)}
                      />
                    </div>
                  ))}
                </div>

                {/* Tablet/Desktop: grid responsivo */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-6">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrentPlan={currentPlan?.id === plan.id}
                      onSelect={() => handleUpgrade(plan)}
                    />
                  ))}
                </div>
              </div>

              {/* Features Comparison Note */}
              <Card className="bg-gray-50 dark:bg-gray-900/50">
                <div className="p-3 sm:p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm sm:text-base">
                    Todos os planos incluem:
                  </h4>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span>Catalogo online</span>
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span>Gestao de clientes</span>
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span>Registro de vendas</span>
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span>PWA instalavel</span>
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span>Suporte por email</span>
                    </li>
                    <li className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span>SSL gratuito</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {subscription ? (
                <>
                  {/* Payment Method */}
                  <Card>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Metodo de Pagamento
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <CreditCardIcon className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {subscription.billing_type === 'CREDIT_CARD'
                                ? 'Cartao de Credito'
                                : subscription.billing_type === 'BOLETO'
                                ? 'Boleto Bancario'
                                : subscription.billing_type === 'PIX'
                                ? 'PIX'
                                : 'Nao definido'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Proxima cobranca:{' '}
                              {subscription.next_due_date
                                ? new Date(subscription.next_due_date).toLocaleDateString('pt-BR')
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Alterar
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Payment History */}
                  <Card>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Historico de Pagamentos
                      </h3>
                    </div>
                    {payments.length > 0 ? (
                      <PaymentHistory payments={payments} />
                    ) : (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum pagamento registrado
                      </div>
                    )}
                  </Card>
                </>
              ) : (
                <Card>
                  <div className="p-8 text-center">
                    <ReceiptLongIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhuma assinatura ativa
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Voce esta no plano gratuito. Faca upgrade para desbloquear mais recursos.
                    </p>
                    <Button onClick={() => setActiveTab('plans')}>
                      Ver Planos
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Upgrade Modal */}
      {selectedPlan && (
        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => {
            setUpgradeModalOpen(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
          currentSubscription={subscription}
          companyId={currentCompany?.id || ''}
          onSuccess={handleUpgradeComplete}
        />
      )}
    </PageContainer>
  );
}

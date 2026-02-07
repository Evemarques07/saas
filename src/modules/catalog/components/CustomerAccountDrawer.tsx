import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StarsIcon from '@mui/icons-material/Stars';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { Button, Input } from '../../../components/ui';
import { useCatalogCustomer } from '../../../contexts/CatalogCustomerContext';
import { OrderHistoryList } from './OrderHistoryList';
import { LoyaltyCard } from './LoyaltyCard';
import { CouponsList } from './CouponsList';
import toast from 'react-hot-toast';

interface CustomerAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRepeatOrder?: (items: { productId: string; quantity: number }[]) => void;
}

type TabType = 'profile' | 'orders' | 'loyalty' | 'coupons';

export function CustomerAccountDrawer({ isOpen, onClose, onRepeatOrder }: CustomerAccountDrawerProps) {
  const { customer, logout, updateProfile, loadOrders, loyaltyConfig } = useCatalogCustomer();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthday, setEditBirthday] = useState('');

  // Load orders when drawer opens
  useEffect(() => {
    if (isOpen && customer) {
      loadOrders();
    }
  }, [isOpen, customer, loadOrders]);

  // Reset edit form when customer changes
  useEffect(() => {
    if (customer) {
      setEditName(customer.name || '');
      setEditEmail(customer.email || '');
      setEditBirthday(customer.birthday || '');
    }
  }, [customer]);

  const handleLogout = () => {
    logout();
    onClose();
    toast.success('Você saiu da sua conta');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile({
      name: editName,
      email: editEmail || null,
      birthday: editBirthday || null,
    });
    setSaving(false);

    if (result.success) {
      toast.success('Perfil atualizado!');
      setIsEditing(false);
    } else {
      toast.error(result.error || 'Erro ao atualizar perfil');
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'orders', label: 'Pedidos', icon: <ReceiptIcon className="w-5 h-5" /> },
    { id: 'profile', label: 'Dados', icon: <PersonIcon className="w-5 h-5" /> },
    ...(loyaltyConfig?.enabled
      ? [{ id: 'loyalty' as TabType, label: 'Fidelidade', icon: <StarsIcon className="w-5 h-5" /> }]
      : []),
    { id: 'coupons', label: 'Cupons', icon: <LocalOfferIcon className="w-5 h-5" /> },
  ];

  if (!customer) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[420px] bg-white dark:bg-gray-900 shadow-xl z-50
          transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <PersonIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{customer.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {customer.phone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <CloseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-200px)]">
          {activeTab === 'profile' && (
            <div className="p-4 space-y-4">
              {isEditing ? (
                <>
                  <Input
                    label="Nome"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="seu@email.com (opcional)"
                  />
                  <Input
                    label="Data de Nascimento"
                    type="date"
                    value={editBirthday}
                    onChange={(e) => setEditBirthday(e.target.value)}
                  />
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      loading={saving}
                      icon={<SaveIcon />}
                      className="flex-1"
                    >
                      Salvar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Nome</label>
                      <p className="text-gray-900 dark:text-gray-100">{customer.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Telefone</label>
                      <p className="text-gray-900 dark:text-gray-100">
                        {customer.phone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">CPF</label>
                      <p className="text-gray-900 dark:text-gray-100">
                        {customer.document?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </p>
                    </div>
                    {customer.email && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Email</label>
                        <p className="text-gray-900 dark:text-gray-100">{customer.email}</p>
                      </div>
                    )}
                    {customer.birthday && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Data de Nascimento</label>
                        <p className="text-gray-900 dark:text-gray-100">
                          {new Date(customer.birthday).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    icon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                    className="w-full mt-4"
                  >
                    Editar Dados
                  </Button>

                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">{customer.total_orders || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos</p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(customer.total_spent || 0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Gasto</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <OrderHistoryList onRepeatOrder={onRepeatOrder} />
          )}

          {activeTab === 'loyalty' && loyaltyConfig?.enabled && (
            <LoyaltyCard />
          )}

          {activeTab === 'coupons' && (
            <CouponsList />
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Button
            variant="secondary"
            icon={<LogoutIcon />}
            onClick={handleLogout}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </>
  );
}

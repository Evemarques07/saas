import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Card, Input, Select, Modal, ModalFooter } from '../../components/ui';
import { Table } from '../../components/ui/Table';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PageLoader } from '../../components/ui/Loader';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { Coupon, CouponDiscountType } from '../../types';
import toast from 'react-hot-toast';

export function CouponsPage() {
  const { currentCompany } = useTenant();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('1');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchCoupons();
    }
  }, [currentCompany]);

  const fetchCoupons = async () => {
    if (!currentCompany) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Erro ao carregar cupons');
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinOrderValue('');
    setMaxDiscount('');
    setUsageLimit('');
    setPerCustomerLimit('1');
    setValidUntil('');
    setIsActive(true);
    setFirstPurchaseOnly(false);
    setEditingCoupon(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDescription(coupon.description || '');
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value.toString());
    setMinOrderValue(coupon.min_order_value?.toString() || '');
    setMaxDiscount(coupon.max_discount?.toString() || '');
    setUsageLimit(coupon.usage_limit?.toString() || '');
    setPerCustomerLimit(coupon.per_customer_limit?.toString() || '1');
    setValidUntil(coupon.valid_until ? coupon.valid_until.split('T')[0] : '');
    setIsActive(coupon.is_active);
    setFirstPurchaseOnly(coupon.first_purchase_only);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCompany) return;

    if (!code.trim()) {
      toast.error('Informe o código do cupom');
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast.error('Informe um valor de desconto válido');
      return;
    }

    if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
      toast.error('Desconto percentual não pode ser maior que 100%');
      return;
    }

    setSaving(true);

    const couponData = {
      company_id: currentCompany.id,
      code: code.toUpperCase().trim(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_order_value: minOrderValue ? parseFloat(minOrderValue) : 0,
      max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
      per_customer_limit: perCustomerLimit ? parseInt(perCustomerLimit) : 1,
      valid_until: validUntil ? new Date(validUntil + 'T23:59:59').toISOString() : null,
      is_active: isActive,
      first_purchase_only: firstPurchaseOnly,
    };

    if (editingCoupon) {
      const { error } = await supabase
        .from('coupons')
        .update(couponData)
        .eq('id', editingCoupon.id);

      if (error) {
        console.error('Error updating coupon:', error);
        toast.error('Erro ao atualizar cupom');
      } else {
        toast.success('Cupom atualizado com sucesso!');
        setModalOpen(false);
        fetchCoupons();
      }
    } else {
      const { error } = await supabase.from('coupons').insert(couponData);

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um cupom com este código');
        } else {
          console.error('Error creating coupon:', error);
          toast.error('Erro ao criar cupom');
        }
      } else {
        toast.success('Cupom criado com sucesso!');
        setModalOpen(false);
        fetchCoupons();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;

    const { error } = await supabase.from('coupons').delete().eq('id', couponToDelete.id);

    if (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Erro ao excluir cupom');
    } else {
      toast.success('Cupom excluído com sucesso!');
      fetchCoupons();
    }

    setDeleteModalOpen(false);
    setCouponToDelete(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const columns = [
    {
      key: 'code',
      label: 'Código',
      render: (coupon: Coupon) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
            {coupon.code}
          </span>
          <button
            onClick={() => handleCopyCode(coupon.code)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ContentCopyIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      key: 'discount',
      label: 'Desconto',
      render: (coupon: Coupon) => (
        <span className="font-medium">
          {coupon.discount_type === 'percentage'
            ? `${coupon.discount_value}%`
            : formatCurrency(coupon.discount_value)}
        </span>
      ),
    },
    {
      key: 'usage',
      label: 'Uso',
      render: (coupon: Coupon) => (
        <span>
          {coupon.usage_count}
          {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
        </span>
      ),
    },
    {
      key: 'valid_until',
      label: 'Válido até',
      render: (coupon: Coupon) => {
        const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
        return (
          <span className={isExpired ? 'text-red-500' : ''}>
            {formatDate(coupon.valid_until)}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (coupon: Coupon) => {
        const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
        const status = !coupon.is_active
          ? { label: 'Inativo', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
          : isExpired
            ? { label: 'Expirado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
            : { label: 'Ativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (coupon: Coupon) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(coupon)}
            className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCouponToDelete(coupon);
              setDeleteModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <DeleteIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer
      title="Cupons de Desconto"
      subtitle="Gerencie cupons promocionais para seus clientes"
      action={
        <Button icon={<AddIcon />} onClick={openCreateModal}>
          Novo Cupom
        </Button>
      }
    >
      {coupons.length === 0 ? (
        <EmptyState
          title="Nenhum cupom cadastrado"
          description="Crie cupons de desconto para atrair mais clientes"
          action={
            <Button icon={<AddIcon />} onClick={openCreateModal}>
              Criar Cupom
            </Button>
          }
        />
      ) : (
        <Card>
          <Table data={coupons} columns={columns} keyExtractor={(coupon) => coupon.id} />
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Código do Cupom *"
                placeholder="DESCONTO10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
              <Select
                label="Tipo de Desconto *"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
                options={[
                  { value: 'percentage', label: 'Percentual (%)' },
                  { value: 'fixed', label: 'Valor Fixo (R$)' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`Valor do Desconto * ${discountType === 'percentage' ? '(%)' : '(R$)'}`}
                type="number"
                step="0.01"
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                placeholder={discountType === 'percentage' ? '10' : '50.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
              <Input
                label="Pedido Mínimo (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="100.00"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
              />
            </div>

            {discountType === 'percentage' && (
              <Input
                label="Desconto Máximo (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="50.00"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
              />
            )}

            <Input
              label="Descrição"
              placeholder="Desconto de boas-vindas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Limite de Usos"
                type="number"
                min="1"
                placeholder="100"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              />
              <Input
                label="Limite por Cliente"
                type="number"
                min="1"
                placeholder="1"
                value={perCustomerLimit}
                onChange={(e) => setPerCustomerLimit(e.target.value)}
              />
              <Input
                label="Válido até"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Cupom ativo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={firstPurchaseOnly}
                  onChange={(e) => setFirstPurchaseOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Apenas para primeira compra
                </span>
              </label>
            </div>
          </div>

          <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving} icon={<LocalOfferIcon />}>
              {editingCoupon ? 'Salvar' : 'Criar Cupom'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Excluir Cupom"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o cupom{' '}
          <span className="font-bold">{couponToDelete?.code}</span>? Esta ação não pode ser
          desfeita.
        </p>
        <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </PageContainer>
  );
}

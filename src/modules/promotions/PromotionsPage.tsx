import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CampaignIcon from '@mui/icons-material/Campaign';
import CakeIcon from '@mui/icons-material/Cake';
import StarsIcon from '@mui/icons-material/Stars';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RestoreIcon from '@mui/icons-material/Restore';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory';
import EventIcon from '@mui/icons-material/Event';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Card, Input, Select, Modal, ModalFooter } from '../../components/ui';
import { Table } from '../../components/ui/Table';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PageLoader } from '../../components/ui/Loader';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { Promotion, PromotionType, CouponDiscountType, Category, Product, LoyaltyLevel } from '../../types';
import toast from 'react-hot-toast';

const PROMOTION_TYPES: { value: PromotionType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'birthday', label: 'Aniversario', icon: <CakeIcon />, description: 'Desconto no mes de aniversario do cliente' },
  { value: 'loyalty_level', label: 'Nivel de Fidelidade', icon: <StarsIcon />, description: 'Desconto exclusivo por nivel' },
  { value: 'first_purchase', label: 'Primeira Compra', icon: <PersonAddIcon />, description: 'Desconto para novos clientes' },
  { value: 'reactivation', label: 'Reativacao', icon: <RestoreIcon />, description: 'Desconto para clientes inativos' },
  { value: 'category_discount', label: 'Categoria', icon: <CategoryIcon />, description: 'Desconto em categorias especificas' },
  { value: 'product_discount', label: 'Produto', icon: <InventoryIcon />, description: 'Desconto em produtos especificos' },
  { value: 'seasonal', label: 'Sazonal', icon: <EventIcon />, description: 'Promocao por periodo (ex: Natal, Black Friday)' },
  { value: 'flash_sale', label: 'Flash Sale', icon: <FlashOnIcon />, description: 'Promocao relampago por tempo limitado' },
];

export function PromotionsPage() {
  const { currentCompany } = useTenant();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loyaltyLevels, setLoyaltyLevels] = useState<LoyaltyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [promotionType, setPromotionType] = useState<PromotionType>('birthday');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState('0');
  const [stackable, setStackable] = useState(false);
  const [usageLimit, setUsageLimit] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('1');

  // Conditions
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);
  const [inactiveDays, setInactiveDays] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const [promotionsResult, categoriesResult, productsResult, levelsResult] = await Promise.all([
      supabase
        .from('promotions')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('priority', { ascending: false }),
      supabase
        .from('categories')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name'),
      supabase
        .from('products')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('loyalty_levels')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('min_points'),
    ]);

    if (promotionsResult.error) {
      console.error('Error fetching promotions:', promotionsResult.error);
      toast.error('Erro ao carregar promocoes');
    } else {
      setPromotions(promotionsResult.data || []);
    }

    setCategories(categoriesResult.data || []);
    setProducts(productsResult.data || []);
    setLoyaltyLevels(levelsResult.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPromotionType('birthday');
    setDiscountType('percentage');
    setDiscountValue('');
    setMaxDiscount('');
    setMinOrderValue('');
    setValidFrom(new Date().toISOString().split('T')[0]);
    setValidUntil('');
    setIsActive(true);
    setPriority('0');
    setStackable(false);
    setUsageLimit('');
    setPerCustomerLimit('1');
    setSelectedLevelIds([]);
    setInactiveDays('');
    setSelectedCategoryIds([]);
    setSelectedProductIds([]);
    setEditingPromotion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setName(promotion.name);
    setDescription(promotion.description || '');
    setPromotionType(promotion.promotion_type);
    setDiscountType(promotion.discount_type);
    setDiscountValue(promotion.discount_value.toString());
    setMaxDiscount(promotion.max_discount?.toString() || '');
    setMinOrderValue(promotion.min_order_value?.toString() || '');
    setValidFrom(promotion.valid_from ? promotion.valid_from.split('T')[0] : '');
    setValidUntil(promotion.valid_until ? promotion.valid_until.split('T')[0] : '');
    setIsActive(promotion.is_active);
    setPriority(promotion.priority.toString());
    setStackable(promotion.stackable);
    setUsageLimit(promotion.usage_limit?.toString() || '');
    setPerCustomerLimit(promotion.per_customer_limit?.toString() || '1');
    setSelectedLevelIds(promotion.conditions?.level_ids || []);
    setInactiveDays(promotion.conditions?.inactive_days?.toString() || '');
    setSelectedCategoryIds(promotion.conditions?.category_ids || []);
    setSelectedProductIds(promotion.conditions?.product_ids || []);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCompany) return;

    if (!name.trim()) {
      toast.error('Informe o nome da promocao');
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast.error('Informe um valor de desconto valido');
      return;
    }

    if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
      toast.error('Desconto percentual nao pode ser maior que 100%');
      return;
    }

    // Build conditions based on promotion type
    const conditions: Record<string, unknown> = {};
    if (promotionType === 'loyalty_level' && selectedLevelIds.length > 0) {
      conditions.level_ids = selectedLevelIds;
    }
    if (promotionType === 'reactivation' && inactiveDays) {
      conditions.inactive_days = parseInt(inactiveDays);
    }
    if (promotionType === 'category_discount' && selectedCategoryIds.length > 0) {
      conditions.category_ids = selectedCategoryIds;
    }
    if (promotionType === 'product_discount' && selectedProductIds.length > 0) {
      conditions.product_ids = selectedProductIds;
    }

    setSaving(true);

    const promotionData = {
      company_id: currentCompany.id,
      name: name.trim(),
      description: description.trim() || null,
      promotion_type: promotionType,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
      min_order_value: minOrderValue ? parseFloat(minOrderValue) : 0,
      conditions,
      target_audience: {},
      valid_from: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
      valid_until: validUntil ? new Date(validUntil + 'T23:59:59').toISOString() : null,
      is_active: isActive,
      priority: parseInt(priority) || 0,
      stackable,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
      per_customer_limit: perCustomerLimit ? parseInt(perCustomerLimit) : 1,
    };

    if (editingPromotion) {
      const { error } = await supabase
        .from('promotions')
        .update(promotionData)
        .eq('id', editingPromotion.id);

      if (error) {
        console.error('Error updating promotion:', error);
        toast.error('Erro ao atualizar promocao');
      } else {
        toast.success('Promocao atualizada com sucesso!');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('promotions').insert(promotionData);

      if (error) {
        console.error('Error creating promotion:', error);
        toast.error('Erro ao criar promocao');
      } else {
        toast.success('Promocao criada com sucesso!');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!promotionToDelete) return;

    const { error } = await supabase.from('promotions').delete().eq('id', promotionToDelete.id);

    if (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Erro ao excluir promocao');
    } else {
      toast.success('Promocao excluida com sucesso!');
      fetchData();
    }

    setDeleteModalOpen(false);
    setPromotionToDelete(null);
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

  const getPromotionTypeInfo = (type: PromotionType) => {
    return PROMOTION_TYPES.find((t) => t.value === type) || PROMOTION_TYPES[0];
  };

  const columns = [
    {
      key: 'name',
      label: 'Promocao',
      render: (promotion: Promotion) => {
        const typeInfo = getPromotionTypeInfo(promotion.promotion_type);
        return (
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              {typeInfo.icon}
            </span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{promotion.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{typeInfo.label}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'discount',
      label: 'Desconto',
      render: (promotion: Promotion) => (
        <span className="font-medium text-green-600 dark:text-green-400">
          {promotion.discount_type === 'percentage'
            ? `${promotion.discount_value}%`
            : formatCurrency(promotion.discount_value)}
        </span>
      ),
    },
    {
      key: 'usage',
      label: 'Uso',
      render: (promotion: Promotion) => (
        <span>
          {promotion.usage_count}
          {promotion.usage_limit ? ` / ${promotion.usage_limit}` : ''}
        </span>
      ),
    },
    {
      key: 'period',
      label: 'Periodo',
      render: (promotion: Promotion) => (
        <div className="text-sm">
          <p>{formatDate(promotion.valid_from)}</p>
          <p className="text-gray-500">ate {formatDate(promotion.valid_until)}</p>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (promotion: Promotion) => {
        const isExpired = promotion.valid_until && new Date(promotion.valid_until) < new Date();
        const status = !promotion.is_active
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
      render: (promotion: Promotion) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(promotion)}
            className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setPromotionToDelete(promotion);
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

  // Render conditions fields based on promotion type
  const renderConditionsFields = () => {
    switch (promotionType) {
      case 'loyalty_level':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Niveis de Fidelidade
            </label>
            {loyaltyLevels.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum nivel de fidelidade cadastrado</p>
            ) : (
              <div className="space-y-2">
                {loyaltyLevels.map((level) => (
                  <label key={level.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLevelIds.includes(level.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLevelIds([...selectedLevelIds, level.id]);
                        } else {
                          setSelectedLevelIds(selectedLevelIds.filter((id) => id !== level.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{level.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      case 'reactivation':
        return (
          <Input
            label="Dias de Inatividade *"
            type="number"
            min="1"
            placeholder="30"
            value={inactiveDays}
            onChange={(e) => setInactiveDays(e.target.value)}
            helperText="Cliente sera elegivel se nao comprar ha X dias"
          />
        );

      case 'category_discount':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categorias *
            </label>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria cadastrada</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategoryIds([...selectedCategoryIds, category.id]);
                        } else {
                          setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== category.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      case 'product_discount':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Produtos *
            </label>
            {products.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum produto cadastrado</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds([...selectedProductIds, product.id]);
                        } else {
                          setSelectedProductIds(selectedProductIds.filter((id) => id !== product.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {product.name} - {formatCurrency(product.price)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer
      title="Promocoes"
      subtitle="Crie promocoes automaticas para seus clientes"
      action={
        <Button icon={<AddIcon />} onClick={openCreateModal}>
          Nova Promocao
        </Button>
      }
    >
      {/* Promotion Types Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {PROMOTION_TYPES.slice(0, 4).map((type) => {
          const count = promotions.filter((p) => p.promotion_type === type.value && p.is_active).length;
          return (
            <Card key={type.value} className="p-2.5 sm:p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 self-start sm:self-auto">
                  {type.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-tight">{type.label}</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{count} ativas</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {promotions.length === 0 ? (
        <EmptyState
          title="Nenhuma promocao cadastrada"
          description="Crie promocoes automaticas para engajar seus clientes"
          action={
            <Button icon={<AddIcon />} onClick={openCreateModal}>
              Criar Promocao
            </Button>
          }
        />
      ) : (
        <Card>
          <Table
            data={promotions}
            columns={columns}
            keyExtractor={(promotion) => promotion.id}
            mobileCardRender={(promotion) => {
              const typeInfo = getPromotionTypeInfo(promotion.promotion_type);
              const isExpired = promotion.valid_until && new Date(promotion.valid_until) < new Date();
              const status = !promotion.is_active
                ? { label: 'Inativo', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
                : isExpired
                  ? { label: 'Expirado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
                  : { label: 'Ativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };

              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400">{typeInfo.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{promotion.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{typeInfo.label}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Desconto</p>
                      <p className="font-medium text-green-600 dark:text-green-400">
                        {promotion.discount_type === 'percentage'
                          ? `${promotion.discount_value}%`
                          : formatCurrency(promotion.discount_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Uso</p>
                      <p className="font-medium">
                        {promotion.usage_count}{promotion.usage_limit ? ` / ${promotion.usage_limit}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Período</p>
                      <p className="font-medium text-xs">
                        {formatDate(promotion.valid_from)}
                        {promotion.valid_until && <span className="text-gray-400"> - {formatDate(promotion.valid_until)}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(promotion)}
                      className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setPromotionToDelete(promotion);
                        setDeleteModalOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <DeleteIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingPromotion ? 'Editar Promocao' : 'Nova Promocao'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Promotion Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Promocao *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROMOTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPromotionType(type.value)}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg border text-left transition-colors
                      ${promotionType === type.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <span className={promotionType === type.value ? 'text-primary-600' : 'text-gray-500'}>
                      {type.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${promotionType === type.value ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Nome da Promocao *"
              placeholder="Desconto de Aniversario"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Descricao"
              placeholder="Desconto especial no mes do seu aniversario"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tipo de Desconto *"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
                options={[
                  { value: 'percentage', label: 'Percentual (%)' },
                  { value: 'fixed', label: 'Valor Fixo (R$)' },
                ]}
              />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pedido Minimo (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="100.00"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
              />
              {discountType === 'percentage' && (
                <Input
                  label="Desconto Maximo (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="50.00"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                />
              )}
            </div>

            {/* Conditions based on type */}
            {renderConditionsFields()}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Inicio"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
              <Input
                label="Fim"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Limite de Usos"
                type="number"
                min="1"
                placeholder="Ilimitado"
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
                label="Prioridade"
                type="number"
                min="0"
                placeholder="0"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                helperText="Maior = aplicada primeiro"
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
                <span className="text-sm text-gray-700 dark:text-gray-300">Promocao ativa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stackable}
                  onChange={(e) => setStackable(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Acumulavel com outras promocoes
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
            <Button type="submit" loading={saving} icon={<CampaignIcon />}>
              {editingPromotion ? 'Salvar' : 'Criar Promocao'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Excluir Promocao"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir a promocao{' '}
          <span className="font-bold">{promotionToDelete?.name}</span>? Esta acao nao pode ser
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

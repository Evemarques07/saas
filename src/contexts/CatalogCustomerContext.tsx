import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import {
  CustomerWithLoyalty,
  CatalogOrder,
  CatalogOrderItem,
  LoyaltyConfig,
  LoyaltyLevel,
  CustomerLoyalty,
  Coupon,
  CouponValidation,
  Promotion,
  ApplicablePromotion,
} from '../types';

// Cart item interface for promotion calculations
interface CartItemForPromotion {
  product_id: string;
  category_id?: string;
  quantity: number;
  price: number;
}

// Session storage key pattern
const getSessionStorageKey = (slug: string) => `ejym_customer_session_${slug}`;

interface CustomerSession {
  customerId: string;
  phone: string;
  expiresAt: string;
}

interface CatalogCustomerContextType {
  // Customer state
  customer: CustomerWithLoyalty | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  companyId: string | null;

  // Auth methods
  login: (phone: string, cpf: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<CustomerWithLoyalty>) => Promise<{ success: boolean; error?: string }>;

  // Orders
  orders: CatalogOrder[];
  ordersLoading: boolean;
  loadOrders: () => Promise<void>;
  getOrderDetails: (orderId: string) => Promise<CatalogOrder | null>;

  // Loyalty
  loyaltyConfig: LoyaltyConfig | null;
  loyaltyLevels: LoyaltyLevel[];
  customerLoyalty: CustomerLoyalty | null;
  loadLoyaltyData: () => Promise<void>;

  // Coupons
  validateCoupon: (code: string, orderValue: number) => Promise<CouponValidation>;
  getAvailableCoupons: () => Promise<Coupon[]>;

  // Promotions
  getApplicablePromotions: (
    cartItems: CartItemForPromotion[],
    orderValue: number
  ) => Promise<ApplicablePromotion[]>;
}

const CatalogCustomerContext = createContext<CatalogCustomerContextType | undefined>(undefined);

interface CatalogCustomerProviderProps {
  children: ReactNode;
  companyId: string;
  companySlug: string;
}

export function CatalogCustomerProvider({
  children,
  companyId,
  companySlug,
}: CatalogCustomerProviderProps) {
  const [customer, setCustomer] = useState<CustomerWithLoyalty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Loyalty state
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [loyaltyLevels, setLoyaltyLevels] = useState<LoyaltyLevel[]>([]);

  const isAuthenticated = !!customer;

  // Calculate customer loyalty info
  const customerLoyalty: CustomerLoyalty | null = customer && loyaltyConfig?.enabled
    ? calculateCustomerLoyalty(customer, loyaltyConfig, loyaltyLevels)
    : null;

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const storageKey = getSessionStorageKey(companySlug);
        const sessionData = localStorage.getItem(storageKey);

        if (sessionData) {
          const session: CustomerSession = JSON.parse(sessionData);

          // Check if session expired
          if (new Date(session.expiresAt) < new Date()) {
            localStorage.removeItem(storageKey);
            setCustomer(null);
          } else {
            // Load customer data
            await loadCustomerById(session.customerId);
          }
        }
      } catch (error) {
        console.error('[CatalogCustomer] Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
    loadLoyaltyData();
  }, [companySlug, companyId]);

  // Load customer by ID
  const loadCustomerById = async (customerId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          loyalty_level:loyalty_levels(*)
        `)
        .eq('id', customerId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('[CatalogCustomer] Customer not found:', error);
        return false;
      }

      setCustomer(data as CustomerWithLoyalty);
      return true;
    } catch (error) {
      console.error('[CatalogCustomer] Error loading customer:', error);
      return false;
    }
  };

  // Login with phone + CPF
  const login = async (phone: string, cpf: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanedPhone = phone.replace(/\D/g, '');
      const cleanedCpf = cpf.replace(/\D/g, '');

      // Find customer by phone + CPF
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          loyalty_level:loyalty_levels(*)
        `)
        .eq('company_id', companyId)
        .eq('phone', cleanedPhone)
        .eq('document', cleanedCpf)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'Telefone ou CPF não encontrado. Verifique os dados ou faça um pedido primeiro para se cadastrar.',
        };
      }

      // Update last login
      await supabase
        .from('customers')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.id);

      // Save session to localStorage (30 days expiry)
      const session: CustomerSession = {
        customerId: data.id,
        phone: cleanedPhone,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(getSessionStorageKey(companySlug), JSON.stringify(session));

      setCustomer(data as CustomerWithLoyalty);

      return { success: true };
    } catch (error) {
      console.error('[CatalogCustomer] Login error:', error);
      return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem(getSessionStorageKey(companySlug));
    setCustomer(null);
    setOrders([]);
  };

  // Update profile
  const updateProfile = async (
    data: Partial<CustomerWithLoyalty>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!customer) {
      return { success: false, error: 'Não autenticado' };
    }

    try {
      // Sanitize data - remove readonly fields
      const updateData: Record<string, unknown> = {};
      if (data.name) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.birthday !== undefined) updateData.birthday = data.birthday;

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id);

      if (error) throw error;

      // Reload customer data
      await loadCustomerById(customer.id);

      return { success: true };
    } catch (error) {
      console.error('[CatalogCustomer] Update profile error:', error);
      return { success: false, error: 'Erro ao atualizar perfil' };
    }
  };

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!customer) return;

    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_orders')
        .select(`
          *,
          items:catalog_order_items(*)
        `)
        .eq('customer_id', customer.id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('[CatalogCustomer] Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, [customer, companyId]);

  // Get single order details
  const getOrderDetails = async (orderId: string): Promise<CatalogOrder | null> => {
    try {
      const { data, error } = await supabase
        .from('catalog_orders')
        .select(`
          *,
          items:catalog_order_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('[CatalogCustomer] Error loading order details:', error);
      return null;
    }
  };

  // Load loyalty configuration
  const loadLoyaltyData = useCallback(async () => {
    try {
      // Load config
      const { data: configData } = await supabase
        .from('loyalty_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      setLoyaltyConfig(configData);

      // Load levels
      const { data: levelsData } = await supabase
        .from('loyalty_levels')
        .select('*')
        .eq('company_id', companyId)
        .order('min_points', { ascending: true });

      setLoyaltyLevels(levelsData || []);
    } catch (error) {
      console.error('[CatalogCustomer] Error loading loyalty data:', error);
    }
  }, [companyId]);

  // Validate coupon
  const validateCoupon = async (code: string, orderValue: number): Promise<CouponValidation> => {
    try {
      // Find coupon
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('company_id', companyId)
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        return { valid: false, coupon: null, discount: 0, error: 'Cupom não encontrado' };
      }

      // Check validity period
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        return { valid: false, coupon: null, discount: 0, error: 'Cupom ainda não está válido' };
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return { valid: false, coupon: null, discount: 0, error: 'Cupom expirado' };
      }

      // Check minimum order value
      if (coupon.min_order_value && orderValue < coupon.min_order_value) {
        return {
          valid: false,
          coupon: null,
          discount: 0,
          error: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)} para este cupom`,
        };
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return { valid: false, coupon: null, discount: 0, error: 'Cupom esgotado' };
      }

      // Check customer-specific limits
      if (customer && coupon.per_customer_limit) {
        const { count } = await supabase
          .from('coupon_usages')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_id', customer.id);

        if (count && count >= coupon.per_customer_limit) {
          return { valid: false, coupon: null, discount: 0, error: 'Você já usou este cupom' };
        }
      }

      // Check first purchase only
      if (coupon.first_purchase_only && customer) {
        if (customer.total_orders > 0) {
          return {
            valid: false,
            coupon: null,
            discount: 0,
            error: 'Cupom válido apenas para primeira compra',
          };
        }
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = orderValue * (coupon.discount_value / 100);
      } else {
        discount = coupon.discount_value;
      }

      // Apply max discount cap
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }

      // Discount cannot exceed order value
      if (discount > orderValue) {
        discount = orderValue;
      }

      return { valid: true, coupon, discount };
    } catch (error) {
      console.error('[CatalogCustomer] Error validating coupon:', error);
      return { valid: false, coupon: null, discount: 0, error: 'Erro ao validar cupom' };
    }
  };

  // Get available coupons for logged in customer
  const getAvailableCoupons = async (): Promise<Coupon[]> => {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .neq('is_public', false)
        .or(`valid_until.is.null,valid_until.gt.${now}`)
        .lte('valid_from', now);

      if (error) throw error;

      // Filter out coupons the customer can't use
      const availableCoupons = (data || []).filter((coupon) => {
        // Check usage limits
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
          return false;
        }

        // First purchase only - only show to new customers
        if (coupon.first_purchase_only && customer && customer.total_orders > 0) {
          return false;
        }

        return true;
      });

      return availableCoupons;
    } catch (error) {
      console.error('[CatalogCustomer] Error loading coupons:', error);
      return [];
    }
  };

  // Get applicable promotions for the current customer and cart
  const getApplicablePromotions = async (
    cartItems: CartItemForPromotion[],
    orderValue: number
  ): Promise<ApplicablePromotion[]> => {
    try {
      const now = new Date();

      // Fetch active promotions for this company
      const { data: promotions, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .lte('valid_from', now.toISOString())
        .or(`valid_until.is.null,valid_until.gt.${now.toISOString()}`)
        .order('priority', { ascending: false });

      if (error || !promotions) {
        console.error('[CatalogCustomer] Error fetching promotions:', error);
        return [];
      }

      const applicablePromotions: ApplicablePromotion[] = [];

      for (const promotion of promotions) {
        // Check minimum order value
        if (promotion.min_order_value && orderValue < promotion.min_order_value) {
          continue;
        }

        // Check usage limits
        if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
          continue;
        }

        // Check per-customer limit if logged in
        if (customer && promotion.per_customer_limit) {
          const { count } = await supabase
            .from('promotion_usages')
            .select('*', { count: 'exact', head: true })
            .eq('promotion_id', promotion.id)
            .eq('customer_id', customer.id);

          if (count && count >= promotion.per_customer_limit) {
            continue;
          }
        }

        // Check eligibility based on promotion type
        const eligibility = checkPromotionEligibility(
          promotion,
          customer,
          cartItems,
          loyaltyLevels
        );

        if (!eligibility.eligible) {
          continue;
        }

        // Calculate discount
        let discount = 0;
        const baseValue = eligibility.applicableValue || orderValue;

        if (promotion.discount_type === 'percentage') {
          discount = baseValue * (promotion.discount_value / 100);
        } else {
          discount = promotion.discount_value;
        }

        // Apply max discount cap
        if (promotion.max_discount && discount > promotion.max_discount) {
          discount = promotion.max_discount;
        }

        // Discount cannot exceed order value
        if (discount > orderValue) {
          discount = orderValue;
        }

        if (discount > 0) {
          applicablePromotions.push({
            promotion,
            discount,
            reason: eligibility.reason,
          });
        }
      }

      // If promotions are not stackable, return only the best one
      const nonStackable = applicablePromotions.filter((p) => !p.promotion.stackable);
      const stackable = applicablePromotions.filter((p) => p.promotion.stackable);

      if (nonStackable.length > 0) {
        // Get the best non-stackable promotion (highest discount)
        const bestNonStackable = nonStackable.sort((a, b) => b.discount - a.discount)[0];
        // Return best non-stackable + all stackable
        return [bestNonStackable, ...stackable];
      }

      return stackable;
    } catch (error) {
      console.error('[CatalogCustomer] Error getting promotions:', error);
      return [];
    }
  };

  return (
    <CatalogCustomerContext.Provider
      value={{
        customer,
        isAuthenticated,
        isLoading,
        companyId,
        login,
        logout,
        updateProfile,
        orders,
        ordersLoading,
        loadOrders,
        getOrderDetails,
        loyaltyConfig,
        loyaltyLevels,
        customerLoyalty,
        loadLoyaltyData,
        validateCoupon,
        getAvailableCoupons,
        getApplicablePromotions,
      }}
    >
      {children}
    </CatalogCustomerContext.Provider>
  );
}

export function useCatalogCustomer() {
  const context = useContext(CatalogCustomerContext);
  if (context === undefined) {
    throw new Error('useCatalogCustomer must be used within a CatalogCustomerProvider');
  }
  return context;
}

// Helper function to calculate customer loyalty info
function calculateCustomerLoyalty(
  customer: CustomerWithLoyalty,
  config: LoyaltyConfig,
  levels: LoyaltyLevel[]
): CustomerLoyalty {
  const points = customer.loyalty_points || 0;
  const lifetimePoints = customer.lifetime_points || 0;

  // Find current level
  const currentLevel = levels
    .filter((l) => lifetimePoints >= l.min_points)
    .sort((a, b) => b.min_points - a.min_points)[0] || null;

  // Find next level
  const nextLevel = levels
    .filter((l) => lifetimePoints < l.min_points)
    .sort((a, b) => a.min_points - b.min_points)[0] || null;

  const pointsToNextLevel = nextLevel ? nextLevel.min_points - lifetimePoints : 0;

  // Calculate max redeemable value
  const pointsValue = points * config.points_value;

  return {
    points,
    lifetime_points: lifetimePoints,
    level: currentLevel,
    next_level: nextLevel,
    points_to_next_level: pointsToNextLevel,
    points_value: pointsValue,
    max_redeemable: pointsValue, // Will be capped by order percentage in checkout
  };
}

// Helper function to check promotion eligibility based on type
interface EligibilityResult {
  eligible: boolean;
  reason: string;
  applicableValue?: number; // For product/category specific promotions
}

function checkPromotionEligibility(
  promotion: Promotion,
  customer: CustomerWithLoyalty | null,
  cartItems: CartItemForPromotion[],
  loyaltyLevels: LoyaltyLevel[]
): EligibilityResult {
  const conditions = promotion.conditions || {};

  switch (promotion.promotion_type) {
    case 'birthday': {
      // Check if customer is logged in and has birthday this month
      if (!customer || !customer.birthday) {
        return { eligible: false, reason: 'Cliente precisa estar logado com aniversario cadastrado' };
      }
      const birthday = new Date(customer.birthday);
      const now = new Date();
      if (birthday.getMonth() !== now.getMonth()) {
        return { eligible: false, reason: 'Promocao valida apenas no mes do aniversario' };
      }
      return { eligible: true, reason: 'Desconto de aniversario' };
    }

    case 'loyalty_level': {
      // Check if customer has required loyalty level
      if (!customer) {
        return { eligible: false, reason: 'Cliente precisa estar logado' };
      }
      const levelIds = conditions.level_ids || [];
      if (levelIds.length === 0) {
        return { eligible: true, reason: 'Desconto exclusivo para clientes fidelidade' };
      }
      if (!customer.loyalty_level_id || !levelIds.includes(customer.loyalty_level_id)) {
        const requiredLevels = loyaltyLevels
          .filter((l) => levelIds.includes(l.id))
          .map((l) => l.name)
          .join(', ');
        return { eligible: false, reason: `Promocao exclusiva para niveis: ${requiredLevels}` };
      }
      const levelName = loyaltyLevels.find((l) => l.id === customer.loyalty_level_id)?.name || 'Fidelidade';
      return { eligible: true, reason: `Desconto exclusivo nivel ${levelName}` };
    }

    case 'first_purchase': {
      // Check if customer has no previous orders
      if (customer && customer.total_orders > 0) {
        return { eligible: false, reason: 'Promocao valida apenas para primeira compra' };
      }
      return { eligible: true, reason: 'Desconto de primeira compra' };
    }

    case 'reactivation': {
      // Check if customer is inactive for X days
      if (!customer) {
        return { eligible: false, reason: 'Cliente precisa estar logado' };
      }
      const inactiveDays = conditions.inactive_days || 30;
      if (!customer.last_order_at) {
        // Customer has no orders, not eligible for reactivation
        return { eligible: false, reason: 'Promocao para clientes que nao compram ha muito tempo' };
      }
      const lastOrder = new Date(customer.last_order_at);
      const daysSinceLastOrder = Math.floor((Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastOrder < inactiveDays) {
        return { eligible: false, reason: `Promocao para clientes inativos ha ${inactiveDays}+ dias` };
      }
      return { eligible: true, reason: 'Desconto de reativacao - sentimos sua falta!' };
    }

    case 'category_discount': {
      // Check if cart has products from specified categories
      const categoryIds = conditions.category_ids || [];
      if (categoryIds.length === 0) {
        return { eligible: true, reason: 'Desconto em categorias selecionadas' };
      }
      const matchingItems = cartItems.filter((item) => item.category_id && categoryIds.includes(item.category_id));
      if (matchingItems.length === 0) {
        return { eligible: false, reason: 'Nenhum produto elegivel no carrinho' };
      }
      const applicableValue = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { eligible: true, reason: 'Desconto em categorias selecionadas', applicableValue };
    }

    case 'product_discount': {
      // Check if cart has specified products
      const productIds = conditions.product_ids || [];
      if (productIds.length === 0) {
        return { eligible: true, reason: 'Desconto em produtos selecionados' };
      }
      const matchingItems = cartItems.filter((item) => productIds.includes(item.product_id));
      if (matchingItems.length === 0) {
        return { eligible: false, reason: 'Nenhum produto elegivel no carrinho' };
      }
      const applicableValue = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { eligible: true, reason: 'Desconto em produtos selecionados', applicableValue };
    }

    case 'seasonal':
    case 'flash_sale': {
      // These promotions are time-based only (already checked valid_from/valid_until)
      return { eligible: true, reason: promotion.name || 'Promocao especial' };
    }

    default:
      return { eligible: false, reason: 'Tipo de promocao desconhecido' };
  }
}

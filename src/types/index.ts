// ============================================
// Database Types
// ============================================

export interface WhatsAppSettings {
  enabled: boolean;
  provider: 'wuzapi';
  user_token: string;
  connected: boolean;
  connected_at: string | null;
  phone: string | null;
  phone_name: string | null;
  notify_on_new_order: boolean;
  notify_on_confirm: boolean;
  notify_on_complete: boolean;
  notify_on_cancel: boolean;
}

export interface PrintSettings {
  enabled: boolean;
  printer_name: string;
  ip: string;
  port: number;
  paper_width: '58mm' | '80mm';
  auto_cut: boolean;
  timeout_ms: number;
  last_connected_at: string | null;
  // Phase 5 settings
  auto_print: boolean;
  print_logo: boolean;
}

export const defaultPrintSettings: PrintSettings = {
  enabled: false,
  printer_name: '',
  ip: '',
  port: 9100,
  paper_width: '80mm',
  auto_cut: true,
  timeout_ms: 5000,
  last_connected_at: null,
  // Phase 5 defaults
  auto_print: false,
  print_logo: true,
};

export interface Company {
  id: string;
  name: string;
  slug: string;
  segments: string[];
  logo_url: string | null;
  phone: string | null;
  whatsapp_settings: WhatsAppSettings | null;
  print_settings: PrintSettings | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type MemberRole = 'admin' | 'manager' | 'seller';

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: MemberRole;
  is_active: boolean;
  created_at: string;
  company?: Company;
  profile?: Profile;
}

export interface Invite {
  id: string;
  email: string;
  company_id: string | null;
  role: MemberRole | 'company_admin';
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  company?: Company;
}

export type CustomerSource = 'manual' | 'catalog';

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: CustomerAddress | null;
  notes: string | null;
  phone_has_whatsapp: boolean | null;
  source: CustomerSource;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ProductImage {
  url: string;
  order: number;      // 0-3 for ordering
  isPrimary: boolean; // Primary image (thumbnail)
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  ean: string | null;
  price: number;
  cost_price: number | null;
  stock: number;
  min_stock: number;
  image_url: string | null;
  images: ProductImage[]; // Multiple images support (up to 4)
  is_active: boolean;
  show_in_catalog: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export type SaleStatus = 'pending' | 'completed' | 'cancelled';

export interface Sale {
  id: string;
  company_id: string;
  customer_id: string | null;
  seller_id: string;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string | null;
  notes: string | null;
  customer_name: string | null; // Nome do cliente (vendas do catalogo)
  customer_phone: string | null; // Telefone do cliente (vendas do catalogo)
  created_at: string;
  updated_at: string;
  customer?: Customer;
  seller?: Profile;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  product?: Product;
}

// ============================================
// Auth Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  companies: CompanyMember[];
}

// ============================================
// UI Types
// ============================================

export type Theme = 'light' | 'dark';

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

// ============================================
// Catalog Cart Types
// ============================================

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  stock: number;
  categoryId?: string; // For category-based promotions
}

export interface Cart {
  items: CartItem[];
  companySlug: string;
  updatedAt: string;
}

export type CatalogOrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface CatalogOrder {
  id: string;
  company_id: string;
  customer_id: string | null; // Cliente cadastrado (opcional)
  customer_name: string;
  customer_phone: string;
  customer_notes: string | null;
  subtotal: number;
  discount?: number; // Total de descontos
  total: number;
  status: CatalogOrderStatus;
  whatsapp_consent: boolean; // LGPD: consentimento para receber mensagens
  consent_at: string | null; // LGPD: data do consentimento
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: CatalogOrderItem[];
  // Campos de desconto
  coupon_id?: string | null;
  coupon_code?: string | null;
  coupon_discount?: number;
  points_used?: number;
  points_discount?: number;
  points_earned?: number;
  promotion_id?: string | null;
  promotion_discount?: number;
}

export interface CatalogOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  created_at: string;
}

// ============================================
// Coupon Types
// ============================================

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  company_id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  is_public: boolean;
  first_purchase_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  customer_id: string;
  order_id: string | null;
  discount_applied: number;
  used_at: string;
  coupon?: Coupon;
  customer?: Customer;
}

export interface CouponValidation {
  valid: boolean;
  coupon: Coupon | null;
  discount: number;
  error?: string;
}

// ============================================
// Loyalty Types
// ============================================

export interface LoyaltyConfig {
  id: string;
  company_id: string;
  enabled: boolean;
  points_per_real: number;
  points_value: number;
  min_points_redeem: number;
  max_discount_percent: number;
  points_expiry_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyLevel {
  id: string;
  company_id: string;
  name: string;
  min_points: number;
  points_multiplier: number;
  benefits: string[];
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export type LoyaltyPointType = 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment';

export interface LoyaltyPoint {
  id: string;
  company_id: string;
  customer_id: string;
  order_id: string | null;
  points: number;
  type: LoyaltyPointType;
  description: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CustomerLoyalty {
  points: number;
  lifetime_points: number;
  level: LoyaltyLevel | null;
  next_level: LoyaltyLevel | null;
  points_to_next_level: number;
  points_value: number;
  max_redeemable: number;
}

// ============================================
// Promotion Types
// ============================================

export type PromotionType =
  | 'birthday'
  | 'loyalty_level'
  | 'reactivation'
  | 'first_purchase'
  | 'category_discount'
  | 'product_discount'
  | 'seasonal'
  | 'flash_sale';

export interface PromotionConditions {
  level_ids?: string[];
  inactive_days?: number;
  category_ids?: string[];
  product_ids?: string[];
}

export interface PromotionTargetAudience {
  customer_ids?: string[];
  min_lifetime_spent?: number;
  registered_after?: string;
}

export interface Promotion {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  promotion_type: PromotionType;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount: number | null;
  min_order_value: number;
  conditions: PromotionConditions;
  target_audience: PromotionTargetAudience;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  priority: number;
  stackable: boolean;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number;
  created_at: string;
  updated_at: string;
}

export interface PromotionUsage {
  id: string;
  promotion_id: string;
  customer_id: string;
  order_id: string | null;
  discount_applied: number;
  used_at: string;
}

export interface ApplicablePromotion {
  promotion: Promotion;
  discount: number;
  reason: string;
}

// ============================================
// Customer Extended Types
// ============================================

export interface CustomerWithLoyalty extends Customer {
  birthday: string | null;
  last_login_at: string | null;
  loyalty_points: number;
  loyalty_level_id: string | null;
  lifetime_points: number;
  loyalty_level?: LoyaltyLevel;
}

// ============================================
// Catalog Order Extended Types
// ============================================

export interface CatalogOrderWithDiscounts extends CatalogOrder {
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_discount: number;
  discount: number;
  points_used: number;
  points_discount: number;
  points_earned: number;
  promotion_id: string | null;
  promotion_discount: number;
}

// ============================================
// Billing / Subscription Types (Asaas)
// ============================================

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
export type BillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
export type SubscriptionStatus = 'active' | 'overdue' | 'canceled' | 'expired';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'REFUND_REQUESTED' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';

export interface Plan {
  id: string;
  name: string;                    // 'free', 'starter', 'pro', 'enterprise'
  display_name: string;            // 'Grátis', 'Starter', 'Pro'
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  product_limit: number | null;    // NULL = ilimitado
  user_limit: number | null;
  storage_limit_mb: number | null;
  features: PlanFeatures;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanFeatures {
  whatsapp_notifications: boolean;
  advanced_reports: boolean;
  multiple_users: boolean;
  promotions: boolean;
  loyalty_program: boolean;
  coupons: boolean;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  asaas_subscription_id: string | null;  // 'sub_xxx' do Asaas
  asaas_customer_id: string | null;       // 'cus_xxx' do Asaas
  billing_type: BillingType;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  price: number;
  next_due_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: Plan;
  company?: Company;
}

export interface Payment {
  id: string;
  subscription_id: string;
  asaas_payment_id: string | null;  // 'pay_xxx' do Asaas
  amount: number;
  net_amount: number | null;        // Valor líquido após taxas
  status: PaymentStatus;
  billing_type: BillingType;
  due_date: string;
  paid_at: string | null;
  invoice_url: string | null;
  bank_slip_url: string | null;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  created_at: string;
  subscription?: Subscription;
}

// Asaas API Types
export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: BillingType;
  value: number;
  nextDueDate: string;
  cycle: BillingCycle;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
}

export interface AsaasPayment {
  id: string;
  subscription?: string;
  customer: string;
  billingType: BillingType;
  value: number;
  netValue: number;
  status: PaymentStatus;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
  pixCopiaECola?: string;
}

export interface CreateSubscriptionData {
  companyId: string;
  planId: string;
  billingType: BillingType;
  billingCycle: BillingCycle;
  customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  };
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

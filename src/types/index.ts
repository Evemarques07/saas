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

export interface Company {
  id: string;
  name: string;
  slug: string;
  segments: string[];
  logo_url: string | null;
  phone: string | null;
  whatsapp_settings: WhatsAppSettings | null;
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

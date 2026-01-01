// ============================================
// Database Types
// ============================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  segments: string[];
  logo_url: string | null;
  phone: string | null;
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

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: CustomerAddress | null;
  notes: string | null;
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

export interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  cost_price: number | null;
  stock: number;
  min_stock: number;
  image_url: string | null;
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
  customer_name: string;
  customer_phone: string;
  customer_notes: string | null;
  subtotal: number;
  total: number;
  status: CatalogOrderStatus;
  created_at: string;
  updated_at: string;
  items?: CatalogOrderItem[];
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

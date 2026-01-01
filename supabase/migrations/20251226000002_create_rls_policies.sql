-- ============================================
-- Ejym SaaS - Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Functions
-- ============================================

-- Get all company IDs the user belongs to
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(company_id),
    '{}'::UUID[]
  )
  FROM company_members
  WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin of a company
CREATE OR REPLACE FUNCTION is_company_admin(company_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = company_uuid
      AND user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  ) OR is_super_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Profiles Policies
-- ============================================

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- Companies Policies
-- ============================================

CREATE POLICY "Super admin can do anything with companies"
  ON companies FOR ALL
  USING (is_super_admin());

CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  USING (id = ANY(get_user_company_ids()));

CREATE POLICY "Public can view active companies for catalog"
  ON companies FOR SELECT
  USING (is_active = true);

-- ============================================
-- Company Members Policies
-- ============================================

CREATE POLICY "Super admin can manage all members"
  ON company_members FOR ALL
  USING (is_super_admin());

CREATE POLICY "Users can view members of their companies"
  ON company_members FOR SELECT
  USING (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Admins can manage members of their companies"
  ON company_members FOR ALL
  USING (is_company_admin(company_id));

-- ============================================
-- Invites Policies
-- ============================================

CREATE POLICY "Super admin can manage all invites"
  ON invites FOR ALL
  USING (is_super_admin());

CREATE POLICY "Company admins can manage invites for their companies"
  ON invites FOR ALL
  USING (is_company_admin(company_id));

CREATE POLICY "Anyone can view invite by token"
  ON invites FOR SELECT
  USING (true);

-- ============================================
-- Customers Policies
-- ============================================

CREATE POLICY "Users can view customers of their companies"
  ON customers FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

CREATE POLICY "Users can insert customers in their companies"
  ON customers FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Users can update customers of their companies"
  ON customers FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Admins can delete customers of their companies"
  ON customers FOR DELETE
  USING (is_company_admin(company_id));

-- ============================================
-- Categories Policies
-- ============================================

CREATE POLICY "Users can view categories of their companies"
  ON categories FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

CREATE POLICY "Managers can insert categories"
  ON categories FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Managers can update categories"
  ON categories FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (is_company_admin(company_id));

-- ============================================
-- Products Policies
-- ============================================

CREATE POLICY "Users can view products of their companies"
  ON products FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

CREATE POLICY "Public can view active catalog products"
  ON products FOR SELECT
  USING (is_active = true AND show_in_catalog = true);

CREATE POLICY "Users can insert products"
  ON products FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Users can update products"
  ON products FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_company_admin(company_id));

-- ============================================
-- Sales Policies
-- ============================================

CREATE POLICY "Users can view sales of their companies"
  ON sales FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR is_super_admin());

CREATE POLICY "Users can insert sales"
  ON sales FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Users can update sales of their companies"
  ON sales FOR UPDATE
  USING (company_id = ANY(get_user_company_ids()));

CREATE POLICY "Admins can delete sales"
  ON sales FOR DELETE
  USING (is_company_admin(company_id));

-- ============================================
-- Sale Items Policies
-- ============================================

CREATE POLICY "Users can view sale items via sales"
  ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND (sales.company_id = ANY(get_user_company_ids()) OR is_super_admin())
    )
  );

CREATE POLICY "Users can insert sale items"
  ON sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.company_id = ANY(get_user_company_ids())
    )
  );

CREATE POLICY "Users can update sale items"
  ON sale_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.company_id = ANY(get_user_company_ids())
    )
  );

CREATE POLICY "Users can delete sale items"
  ON sale_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = sale_items.sale_id
        AND is_company_admin(s.company_id)
    )
  );

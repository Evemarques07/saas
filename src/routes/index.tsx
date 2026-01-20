import { Routes, Route, Navigate } from 'react-router-dom';

// Auth Pages
import { LoginPage } from '../modules/auth/LoginPage';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { AcceptInvitePage } from '../modules/auth/AcceptInvitePage';

// App Pages (Tenant)
import { DashboardPage } from '../modules/dashboard/DashboardPage';
import { ProductsPage } from '../modules/products/ProductsPage';
import { CategoriesPage } from '../modules/categories/CategoriesPage';
import { CustomersPage } from '../modules/customers/CustomersPage';
import { SalesPage } from '../modules/sales/SalesPage';
import { CatalogOrdersPage } from '../modules/catalog-orders/CatalogOrdersPage';
import { CatalogPage } from '../modules/catalog/CatalogPage';
import { ProductPage } from '../modules/catalog/ProductPage';
import { CompaniesPage } from '../modules/companies/CompaniesPage';
import { UsersPage } from '../modules/users/UsersPage';
import { SettingsPage } from '../modules/settings/SettingsPage';
import { CouponsPage } from '../modules/coupons/CouponsPage';
import { LoyaltyPage } from '../modules/loyalty/LoyaltyPage';
import { PromotionsPage } from '../modules/promotions/PromotionsPage';

// Admin Pages
import { AdminDashboardPage } from '../modules/admin/AdminDashboardPage';
import { AdminUsersPage } from '../modules/admin/AdminUsersPage';
import { WhatsAppAdminPage } from '../modules/admin/WhatsAppAdminPage';

// Layouts
import { TenantLayout } from '../components/layout/TenantLayout';
import { AdminLayout } from '../components/layout/AdminLayout';

// Route components
import { ProtectedRoute, PublicRoute, SuperAdminRoute } from './guards';
import { RootRedirect } from './RootRedirect';
import { LegacyRouteRedirect } from './LegacyRouteRedirect';

export function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Publicas */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/registro"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/aceitar-convite"
        element={
          <PublicRoute>
            <AcceptInvitePage />
          </PublicRoute>
        }
      />

      {/* Catalogo Publico */}
      <Route path="/catalogo/:slug" element={<CatalogPage />} />
      <Route path="/catalogo/:slug/produto/:productId" element={<ProductPage />} />

      {/* Root - redireciona para /app/:slug ou /admin */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RootRedirect />
          </ProtectedRoute>
        }
      />

      {/* Rotas Administrativas - /admin/* */}
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="usuarios" element={<AdminUsersPage />} />
        <Route path="whatsapp" element={<WhatsAppAdminPage />} />
      </Route>

      {/* Rotas do Tenant - /app/:slug/* */}
      <Route
        path="/app/:slug/*"
        element={
          <ProtectedRoute>
            <TenantLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="vendas" element={<SalesPage />} />
        <Route path="pedidos" element={<CatalogOrdersPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="cupons" element={<CouponsPage />} />
        <Route path="fidelidade" element={<LoyaltyPage />} />
        <Route path="promocoes" element={<PromotionsPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>

      {/* Rotas legadas - redirecionam para novo formato */}
      <Route
        path="/vendas"
        element={
          <ProtectedRoute>
            <LegacyRouteRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <LegacyRouteRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <LegacyRouteRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <LegacyRouteRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresas"
        element={
          <SuperAdminRoute>
            <Navigate to="/admin/empresas" replace />
          </SuperAdminRoute>
        }
      />

      {/* Catch all - redireciona para root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

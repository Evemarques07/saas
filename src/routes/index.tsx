import { Routes, Route, Navigate } from 'react-router-dom';

// Auth Pages
import { LoginPage } from '../modules/auth/LoginPage';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { AcceptInvitePage } from '../modules/auth/AcceptInvitePage';

// App Pages (Tenant)
import { DashboardPage } from '../modules/dashboard/DashboardPage';
import { ProductsPage } from '../modules/products/ProductsPage';
import { CustomersPage } from '../modules/customers/CustomersPage';
import { SalesPage } from '../modules/sales/SalesPage';
import { CatalogPage } from '../modules/catalog/CatalogPage';
import { CompaniesPage } from '../modules/companies/CompaniesPage';
import { UsersPage } from '../modules/users/UsersPage';

// Admin Pages
import { AdminDashboardPage } from '../modules/admin/AdminDashboardPage';

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
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="usuarios" element={<UsersPage />} />
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

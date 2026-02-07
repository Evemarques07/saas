import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

// Auth Pages (apenas callback precisa funcionar no subdomínio)
import { AuthCallbackPage } from "../modules/auth/AuthCallbackPage";
import { ResetPasswordPage } from "../modules/auth/ResetPasswordPage";
import { AcceptInvitePage } from "../modules/auth/AcceptInvitePage";

// Catalog Pages (Public)
import { CatalogPage } from "../modules/catalog/CatalogPage";
import { ProductPage } from "../modules/catalog/ProductPage";

// App Pages (Tenant)
import { DashboardPage } from "../modules/dashboard/DashboardPage";
import { ProductsPage } from "../modules/products/ProductsPage";
import { CategoriesPage } from "../modules/categories/CategoriesPage";
import { CustomersPage } from "../modules/customers/CustomersPage";
import { SalesPage } from "../modules/sales/SalesPage";
import { CatalogOrdersPage } from "../modules/catalog-orders/CatalogOrdersPage";
import { UsersPage } from "../modules/users/UsersPage";
import { SettingsPage } from "../modules/settings/SettingsPage";
import { CouponsPage } from "../modules/coupons/CouponsPage";
import { LoyaltyPage } from "../modules/loyalty/LoyaltyPage";
import { PromotionsPage } from "../modules/promotions/PromotionsPage";
import { BillingPage } from "../modules/billing/BillingPage";

// Layout
import { TenantLayout } from "../components/layout/TenantLayout";

// Route guards
import { ProtectedRoute } from "./guards";
import { getSubdomainSlug } from "./paths";

// Componente que redireciona para login no domínio principal
function RedirectToMainLogin() {
  useEffect(() => {
    const currentSlug = getSubdomainSlug();
    const returnUrl = currentSlug ? `https://${currentSlug}.mercadovirtual.app` : undefined;
    const loginUrl = returnUrl
      ? `https://mercadovirtual.app/login?returnTo=${encodeURIComponent(returnUrl)}`
      : `https://mercadovirtual.app/login`;

    console.log('[SubdomainRoutes] Redirecting to main login:', loginUrl);
    window.location.href = loginUrl;
  }, []);

  return null;
}

// Componente que redireciona para registro no domínio principal
function RedirectToMainRegister() {
  useEffect(() => {
    console.log('[SubdomainRoutes] Redirecting to main register');
    window.location.href = "https://mercadovirtual.app/registro";
  }, []);

  return null;
}

// Rotas para modo subdominio (empresa.dominio.com)
export function SubdomainRoutes() {
  return (
    <Routes>
      {/* Rotas de autenticação - redireciona para domínio principal */}
      <Route path="/login" element={<RedirectToMainLogin />} />
      <Route path="/registro" element={<RedirectToMainRegister />} />
      <Route path="/esqueci-senha" element={<Navigate to="https://mercadovirtual.app/esqueci-senha" replace />} />

      {/* Callbacks de auth - precisam funcionar no subdomínio */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Todas as rotas do tenant sem o prefixo /app/:slug */}
      <Route
        path="/"
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
        <Route path="faturamento" element={<BillingPage />} />
      </Route>

      {/* Aceitar convite - rota publica para novos usuarios */}
      <Route path="/aceitar-convite" element={<AcceptInvitePage />} />

      {/* Catalogo Publico - acessivel sem autenticacao */}
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route path="/catalogo/:slug" element={<CatalogPage />} />
      <Route path="/catalogo/:slug/produto/:productId" element={<ProductPage />} />

      {/* Catch all - vai para dashboard (que vai redirecionar para login se necessário) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

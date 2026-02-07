import { Navigate } from "react-router-dom";
import { TenantProvider, useTenant } from "../../contexts/TenantContext";
import { AppLayout } from "./AppLayout";
import { FullPageLoader } from "../ui/Loader";
import { useAuth } from "../../contexts/AuthContext";
import { redirectToSubdomain, isMainDomain } from "../../routes/paths";

function TenantLayoutInner() {
  const { isValidatingSlug, slugError, currentCompany, isSubdomainMode } = useTenant();
  const { companies } = useAuth();

  if (isValidatingSlug) {
    return <FullPageLoader />;
  }

  if (slugError === "no_access") {
    // Usuario tem empresas mas nao tem acesso a esta
    const firstCompany = companies[0]?.company;
    if (firstCompany) {
      // Sempre redireciona para subdominio correto
      redirectToSubdomain(firstCompany.slug);
      return <FullPageLoader />;
    }
    return <Navigate to="/" replace />;
  }

  if (slugError === "invalid" || !currentCompany) {
    if (isSubdomainMode) {
      // Em modo subdominio com slug invalido, redireciona para dominio principal
      window.location.href = "https://mercadovirtual.app/";
      return <FullPageLoader />;
    }
    return <Navigate to="/" replace />;
  }

  return <AppLayout />;
}

export function TenantLayout() {
  return (
    <TenantProvider>
      <TenantLayoutInner />
    </TenantProvider>
  );
}

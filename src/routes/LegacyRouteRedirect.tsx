import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FullPageLoader } from '../components/ui/Loader';
import { redirectToSubdomain, isMainDomain } from './paths';

const STORAGE_KEY = 'ejym_current_company';

export function LegacyRouteRedirect() {
  const { companies, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (companies.length === 0) {
    return <Navigate to="/" replace />;
  }

  // Determinar empresa alvo
  const savedCompanyId = localStorage.getItem(STORAGE_KEY);
  let targetCompany = companies[0]?.company;

  if (savedCompanyId) {
    const found = companies.find(c => c.company?.id === savedCompanyId);
    if (found?.company) {
      targetCompany = found.company;
    }
  }

  if (targetCompany) {
    // Redirecionar para subdominio mantendo o path
    // Ex: /produtos -> minha-loja.mercadovirtual.app/produtos
    if (isMainDomain()) {
      redirectToSubdomain(targetCompany.slug, location.pathname);
      return <FullPageLoader />;
    }
    // Ja estamos no subdominio, vai para o path relativo
    return <Navigate to={location.pathname} replace />;
  }

  return <Navigate to="/login" replace />;
}

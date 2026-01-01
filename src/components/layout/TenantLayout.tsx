import { Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from '../../contexts/TenantContext';
import { AppLayout } from './AppLayout';
import { FullPageLoader } from '../ui/Loader';
import { useAuth } from '../../contexts/AuthContext';
import { buildAppPath } from '../../routes/paths';

function TenantLayoutInner() {
  const { isValidatingSlug, slugError, currentCompany } = useTenant();
  const { companies } = useAuth();

  if (isValidatingSlug) {
    return <FullPageLoader />;
  }

  if (slugError === 'no_access') {
    // Usuario tem empresas mas nao esta
    const firstCompany = companies[0]?.company;
    if (firstCompany) {
      return <Navigate to={buildAppPath(firstCompany.slug)} replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (slugError === 'invalid' || !currentCompany) {
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

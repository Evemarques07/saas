import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FullPageLoader } from '../components/ui/Loader';
import { buildAppPath } from './paths';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: RouteGuardProps) {
  const { user, loading, companies, isSuperAdmin } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (user) {
    // Super admin sem empresas vai para /admin
    if (isSuperAdmin && companies.length === 0) {
      return <Navigate to="/admin" replace />;
    }

    // Usuario com empresas vai para primeira empresa
    const firstCompany = companies[0]?.company;
    if (firstCompany) {
      return <Navigate to={buildAppPath(firstCompany.slug)} replace />;
    }

    // Super admin com empresas tambem pode ir para /admin
    if (isSuperAdmin) {
      return <Navigate to="/admin" replace />;
    }

    // Sem empresas - vai para root que mostra mensagem
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function SuperAdminRoute({ children }: RouteGuardProps) {
  const { user, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

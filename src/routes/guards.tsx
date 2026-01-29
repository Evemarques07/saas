import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FullPageLoader } from '../components/ui/Loader';
import { buildAppPath } from './paths';

interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: RouteGuardProps) {
  const { user, loading, profile, companies, isSuperAdmin } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    // Se tem fallback, mostra ele em vez de redirecionar para login
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/login" replace />;
  }

  // Aguarda profile carregar antes de decidir rota
  // Isso evita flash de erro quando usuario loga e profile ainda esta sendo buscado
  if (!profile) {
    return <FullPageLoader />;
  }

  // Se usuario nao tem empresas e nao e super admin, precisa fazer onboarding
  if (companies.length === 0 && !isSuperAdmin && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: RouteGuardProps) {
  const { user, loading, companies, isSuperAdmin, profile } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (user) {
    // Aguarda profile carregar antes de decidir rota
    if (!profile) {
      return <FullPageLoader />;
    }

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

    // Usuario sem empresas - vai para onboarding
    if (!profile.onboarding_completed) {
      return <Navigate to="/onboarding" replace />;
    }

    // Sem empresas mas onboarding completo (caso raro) - vai para onboarding criar outra
    return <Navigate to="/onboarding" replace />;
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

// Guard para a pagina de onboarding - usuario deve estar logado mas sem empresa
export function OnboardingRoute({ children }: RouteGuardProps) {
  const { user, loading, companies, isSuperAdmin } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se ja tem empresa, vai para o dashboard dela
  if (companies.length > 0) {
    const firstCompany = companies[0]?.company;
    if (firstCompany) {
      return <Navigate to={buildAppPath(firstCompany.slug)} replace />;
    }
  }

  // Super admin pode pular onboarding
  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

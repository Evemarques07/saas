import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LandingPage } from '../modules/landing/LandingPage';
import { FullPageLoader } from '../components/ui/Loader';
import { buildAppPath } from './paths';

export function RootOrLanding() {
  const { user, loading, companies, isSuperAdmin, profile } = useAuth();

  // Enquanto carrega, mostra a landing page (melhor UX que loader)
  if (loading) {
    return <LandingPage />;
  }

  // Usuario nao logado - mostra landing page
  if (!user) {
    return <LandingPage />;
  }

  // Aguarda profile carregar antes de decidir rota
  if (!profile) {
    return <FullPageLoader />;
  }

  // Usuario logado - redireciona para o app apropriado

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

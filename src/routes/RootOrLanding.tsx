import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LandingPage } from '../modules/landing/LandingPage';
import { FullPageLoader } from '../components/ui/Loader';
import { getRawSessionData } from '../services/supabase';
import { isMainDomain, redirectToSubdomain, isLocalhost, buildAppPath } from './paths';

// Helper para redirecionar com sessão
function redirectToSubdomainWithSession(slug: string, path: string = "/"): void {
  const sessionData = getRawSessionData();
  console.log('[RootOrLanding] Redirecting to subdomain with session:', slug, sessionData ? 'has session' : 'no session');
  redirectToSubdomain(slug, path, sessionData || undefined);
}

export function RootOrLanding() {
  const { user, loading, companies, isSuperAdmin, profile } = useAuth();

  console.log('[RootOrLanding] Render:', {
    user: !!user,
    loading,
    companiesCount: companies.length,
    isSuperAdmin,
    hasProfile: !!profile,
    isLocalhost: isLocalhost()
  });

  // Enquanto carrega, mostra a landing page (melhor UX que loader)
  if (loading) {
    console.log('[RootOrLanding] Loading...');
    return <LandingPage />;
  }

  // Usuario nao logado - mostra landing page
  if (!user) {
    console.log('[RootOrLanding] No user, showing landing');
    return <LandingPage />;
  }

  // Aguarda profile carregar antes de decidir rota
  if (!profile) {
    console.log('[RootOrLanding] No profile yet, loading...');
    return <FullPageLoader />;
  }

  // Usuario logado - redireciona para o app apropriado

  // Super admin sem empresas vai para /admin
  if (isSuperAdmin && companies.length === 0) {
    console.log('[RootOrLanding] Super admin without companies -> /admin');
    return <Navigate to="/admin" replace />;
  }

  // Usuario com empresas vai para primeira empresa
  const firstCompany = companies[0]?.company;
  if (firstCompany) {
    console.log('[RootOrLanding] User has company:', firstCompany.slug);
    const mainDomain = isMainDomain();
    console.log('[RootOrLanding] isMainDomain:', mainDomain, 'isLocalhost:', isLocalhost());

    // Em localhost, usa rotas /app/:slug em vez de subdominio
    if (isLocalhost()) {
      const appPath = buildAppPath(firstCompany.slug);
      console.log('[RootOrLanding] Localhost - navigating to:', appPath);
      return <Navigate to={appPath} replace />;
    }

    // Em producao no dominio principal, redireciona para subdominio COM SESSAO
    if (mainDomain) {
      console.log('[RootOrLanding] Redirecting to subdomain:', firstCompany.slug);
      redirectToSubdomainWithSession(firstCompany.slug);
      return <FullPageLoader />;
    }

    // Ja estamos no subdominio, vai para raiz
    console.log('[RootOrLanding] Already in subdomain, navigate to /');
    return <Navigate to="/" replace />;
  }

  // Super admin com empresas tambem pode ir para /admin
  if (isSuperAdmin) {
    console.log('[RootOrLanding] Super admin -> /admin');
    return <Navigate to="/admin" replace />;
  }

  // Usuario sem empresas - vai para onboarding
  if (!profile.onboarding_completed) {
    console.log('[RootOrLanding] No onboarding -> /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  // Sem empresas mas onboarding completo (caso raro) - vai para onboarding criar outra
  console.log('[RootOrLanding] Fallback -> /onboarding');
  return <Navigate to="/onboarding" replace />;
}

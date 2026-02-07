import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FullPageLoader } from "../components/ui/Loader";
import { getRawSessionData } from "../services/supabase";
import { isSubdomainMode, isMainDomain, redirectToSubdomain, isLocalhost, buildAppPath, getSubdomainSlug } from "./paths";

interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function redirectToMainLogin(): void {
  const currentSlug = getSubdomainSlug();
  const returnUrl = currentSlug ? `https://${currentSlug}.mercadovirtual.app` : undefined;
  const loginUrl = returnUrl
    ? `https://mercadovirtual.app/login?returnTo=${encodeURIComponent(returnUrl)}`
    : `https://mercadovirtual.app/login`;

  console.log('[Guards] Redirecting to main login:', loginUrl);
  window.location.href = loginUrl;
}

// Redireciona para subdomínio COM a sessão atual
function redirectToSubdomainWithSession(slug: string, path: string = "/"): void {
  const sessionData = getRawSessionData();
  console.log('[Guards] Redirecting to subdomain with session:', slug, sessionData ? 'has session' : 'no session');
  redirectToSubdomain(slug, path, sessionData || undefined);
}

export function ProtectedRoute({ children, fallback }: RouteGuardProps) {
  const { user, loading, profile, companies, isSuperAdmin, profileLoadComplete } = useAuth();
  const subdomain = isSubdomainMode();

  console.log('[ProtectedRoute] Render:', {
    user: user?.email || null,
    loading,
    profile: profile?.id || null,
    profileLoadComplete,
    companiesCount: companies.length,
    isSuperAdmin,
    subdomain
  });

  if (loading) {
    console.log('[ProtectedRoute] Still loading auth...');
    return <FullPageLoader />;
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login');
    if (fallback) {
      return <>{fallback}</>;
    }

    if (subdomain) {
      redirectToMainLogin();
      return <FullPageLoader />;
    }

    return <Navigate to="/login" replace />;
  }

  if (!profileLoadComplete) {
    console.log('[ProtectedRoute] Profile still loading...');
    return <FullPageLoader />;
  }

  if (!profile) {
    console.log('[ProtectedRoute] Profile load complete but no profile found');
    if (subdomain) {
      console.log('[ProtectedRoute] Redirecting to main onboarding (no profile in subdomain)');
      window.location.href = "https://mercadovirtual.app/onboarding";
      return <FullPageLoader />;
    }
    console.log('[ProtectedRoute] Redirecting to /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  if (companies.length === 0 && !isSuperAdmin && !profile.onboarding_completed) {
    console.log('[ProtectedRoute] No companies and onboarding not completed');
    if (subdomain) {
      console.log('[ProtectedRoute] Redirecting to main onboarding');
      window.location.href = "https://mercadovirtual.app/onboarding";
      return <FullPageLoader />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  console.log('[ProtectedRoute] All checks passed, rendering children');
  return <>{children}</>;
}

// Verifica se acabou de fazer logout (parâmetro na URL OU flag no sessionStorage)
const LOGOUT_FLAG_KEY = "mv-just-logged-out";

function justLoggedOut(): boolean {
  if (typeof window === "undefined") return false;
  
  // Verifica parâmetro na URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") {
    console.log("[Guards] Logout detected via URL param");
    return true;
  }
  
  // Verifica flag no sessionStorage (setada pelo supabase.ts)
  const flag = sessionStorage.getItem(LOGOUT_FLAG_KEY);
  if (flag) {
    console.log("[Guards] Logout detected via sessionStorage flag");
    // Remove a flag apos detectar (one-time check)
    sessionStorage.removeItem(LOGOUT_FLAG_KEY);
    return true;
  }
  
  return false;
}

export function PublicRoute({ children }: RouteGuardProps) {
  const { user, loading, companies, isSuperAdmin, profile, profileLoadComplete } = useAuth();
  const subdomain = isSubdomainMode();
  const mainDomain = isMainDomain();
  const localhost = isLocalhost();
  const isLogout = justLoggedOut();

  console.log('[PublicRoute] Render:', {
    user: user?.email || null,
    loading,
    profileLoadComplete,
    hasProfile: !!profile,
    companiesCount: companies.length,
    subdomain,
    mainDomain,
    localhost,
    isLogout
  });

  // Se acabou de fazer logout, NÃO redireciona para subdomínio
  // Mostra a tela de login mesmo se ainda tiver sessão em memória
  if (isLogout) {
    console.log('[PublicRoute] Logout detected - showing login page, NOT redirecting');
    return <>{children}</>;
  }

  // IMPORTANTE: Verifica returnTo ANTES de tudo - mesmo durante loading
  // Agora passa a sessão via hash para o subdomínio
  if (user && mainDomain) {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    if (returnTo) {
      console.log('[PublicRoute] User logged in, redirecting to returnTo with session:', returnTo);

      // Extrai o slug do returnTo para usar redirectToSubdomainWithSession
      try {
        const returnUrl = new URL(returnTo);
        const hostname = returnUrl.hostname;
        const parts = hostname.split('.');
        if (parts.length >= 3 && hostname.includes('mercadovirtual.app')) {
          const slug = parts[0];
          console.log('[PublicRoute] Extracted slug from returnTo:', slug);
          redirectToSubdomainWithSession(slug, returnUrl.pathname || '/');
          return <FullPageLoader />;
        }
      } catch (err) {
        console.warn('[PublicRoute] Error parsing returnTo URL:', err);
      }

      // Fallback: redireciona sem sessão
      window.location.href = returnTo;
      return <FullPageLoader />;
    }
  }

  if (loading) {
    console.log('[PublicRoute] Loading...');
    return <FullPageLoader />;
  }

  if (user) {
    console.log('[PublicRoute] User logged in');

    if (subdomain) {
      console.log('[PublicRoute] Already in subdomain mode -> /');
      return <Navigate to="/" replace />;
    }

    if (!profileLoadComplete) {
      console.log('[PublicRoute] Profile still loading...');
      return <FullPageLoader />;
    }

    if (!profile) {
      console.log('[PublicRoute] Profile load complete but no profile -> /onboarding');
      return <Navigate to="/onboarding" replace />;
    }

    if (isSuperAdmin && companies.length === 0) {
      console.log('[PublicRoute] Super admin without companies -> /admin');
      return <Navigate to="/admin" replace />;
    }

    const firstCompany = companies[0]?.company;
    if (firstCompany) {
      if (localhost) {
        const appPath = buildAppPath(firstCompany.slug);
        console.log('[PublicRoute] Localhost - navigating to:', appPath);
        return <Navigate to={appPath} replace />;
      }

      if (mainDomain) {
        console.log('[PublicRoute] Redirecting to subdomain with session:', firstCompany.slug);
        redirectToSubdomainWithSession(firstCompany.slug);
        return <FullPageLoader />;
      }
    }

    if (isSuperAdmin) {
      console.log('[PublicRoute] Super admin -> /admin');
      return <Navigate to="/admin" replace />;
    }

    if (!profile.onboarding_completed) {
      console.log('[PublicRoute] No onboarding -> /onboarding');
      return <Navigate to="/onboarding" replace />;
    }

    console.log('[PublicRoute] Fallback -> /onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  console.log('[PublicRoute] No user, showing children');
  return <>{children}</>;
}

export function SuperAdminRoute({ children }: RouteGuardProps) {
  const { user, loading, isSuperAdmin, profileLoadComplete } = useAuth();
  const subdomain = isSubdomainMode();

  console.log('[SuperAdminRoute] Render:', { user: user?.email || null, loading, isSuperAdmin, profileLoadComplete });

  if (loading || !profileLoadComplete) {
    return <FullPageLoader />;
  }

  if (!user) {
    if (subdomain) {
      redirectToMainLogin();
      return <FullPageLoader />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function OnboardingRoute({ children }: RouteGuardProps) {
  const { user, loading, companies, isSuperAdmin, profileLoadComplete } = useAuth();
  const mainDomain = isMainDomain();
  const localhost = isLocalhost();
  const subdomain = isSubdomainMode();

  console.log('[OnboardingRoute] Render:', { user: user?.email || null, loading, profileLoadComplete, companiesCount: companies.length });

  if (loading || !profileLoadComplete) {
    return <FullPageLoader />;
  }

  if (!user) {
    if (subdomain) {
      redirectToMainLogin();
      return <FullPageLoader />;
    }
    return <Navigate to="/login" replace />;
  }

  if (companies.length > 0) {
    const firstCompany = companies[0]?.company;
    if (firstCompany) {
      if (localhost) {
        const appPath = buildAppPath(firstCompany.slug);
        console.log('[OnboardingRoute] Localhost - navigating to:', appPath);
        return <Navigate to={appPath} replace />;
      }

      if (mainDomain) {
        console.log('[OnboardingRoute] Redirecting to subdomain with session:', firstCompany.slug);
        redirectToSubdomainWithSession(firstCompany.slug);
        return <FullPageLoader />;
      }
    }
  }

  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

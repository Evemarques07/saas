import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Company, CompanyMember, MemberRole } from '../types';
import { useAuth } from './AuthContext';
import { buildAppPath, extractRouteFromPath } from '../routes/paths';

interface TenantContextType {
  currentCompany: Company | null;
  currentMembership: CompanyMember | null;
  userRole: MemberRole | null;
  switchCompany: (company: Company) => void;
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  canManageSales: boolean;
  isValidatingSlug: boolean;
  slugError: 'invalid' | 'no_access' | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const STORAGE_KEY = 'ejym_current_company';

export function TenantProvider({ children }: { children: ReactNode }) {
  const { companies, isSuperAdmin } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [currentMembership, setCurrentMembership] = useState<CompanyMember | null>(null);
  const [isValidatingSlug, setIsValidatingSlug] = useState(true);
  const [slugError, setSlugError] = useState<'invalid' | 'no_access' | null>(null);

  // Validar slug da URL
  useEffect(() => {
    if (!slug) {
      setIsValidatingSlug(false);
      setSlugError('invalid');
      return;
    }

    setIsValidatingSlug(true);
    setSlugError(null);

    // Buscar empresa pelo slug
    const membership = companies.find(c => c.company?.slug === slug);

    if (membership?.company) {
      // Slug valido - usuario tem acesso
      setCurrentCompanyState(membership.company);
      setCurrentMembership(membership);
      localStorage.setItem(STORAGE_KEY, membership.company.id);
      setSlugError(null);
    } else if (companies.length > 0) {
      // Slug invalido mas usuario tem outras empresas
      setSlugError('no_access');
      setCurrentCompanyState(null);
      setCurrentMembership(null);
    } else {
      // Nenhuma empresa
      setSlugError('invalid');
      setCurrentCompanyState(null);
      setCurrentMembership(null);
    }

    setIsValidatingSlug(false);
  }, [slug, companies]);

  // Detectar se usuario foi removido da empresa atual
  useEffect(() => {
    if (currentCompany && companies.length > 0) {
      const stillHasAccess = companies.some(c => c.company?.id === currentCompany.id);
      if (!stillHasAccess) {
        // Usuario foi removido - redirecionar para primeira empresa
        const firstCompany = companies[0]?.company;
        if (firstCompany) {
          const currentRoute = extractRouteFromPath(location.pathname);
          navigate(buildAppPath(firstCompany.slug, currentRoute), { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [companies, currentCompany, navigate, location.pathname]);

  // Trocar empresa - navega para nova URL
  const switchCompany = (company: Company) => {
    // Pegar rota atual apos /app/:slug/
    const currentRoute = extractRouteFromPath(location.pathname);
    const newPath = buildAppPath(company.slug, currentRoute);

    // Salvar no localStorage para redirecionamentos futuros
    localStorage.setItem(STORAGE_KEY, company.id);

    // Navegar para nova URL
    navigate(newPath, { replace: true });
  };

  const userRole = currentMembership?.role || null;

  const isAdmin = isSuperAdmin || userRole === 'admin';
  const isManager = isAdmin || userRole === 'manager';
  const isSeller = userRole === 'seller';

  const canManageUsers = isAdmin;
  const canManageProducts = isManager;
  const canManageSales = true;

  const value = {
    currentCompany,
    currentMembership,
    userRole,
    switchCompany,
    isAdmin,
    isManager,
    isSeller,
    canManageUsers,
    canManageProducts,
    canManageSales,
    isValidatingSlug,
    slugError,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Company, CompanyMember, MemberRole } from "../types";
import { useAuth } from "./AuthContext";
import { buildAppPath, extractRouteFromPath, isSubdomainMode as checkSubdomainMode, redirectToSubdomain, isMainDomain } from "../routes/paths";

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
  slugError: "invalid" | "no_access" | null;
  isSubdomainMode: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const STORAGE_KEY = "ejym_current_company";

// Dominios conhecidos (sem subdominio de empresa)
const KNOWN_DOMAINS = [
  "localhost",
  "mercadovirtual.app",
  "www.mercadovirtual.app",
  "evertonapi.vps-kinghost.net",
];

// Extrai slug do subdominio (ex: empresa.mercadovirtual.app -> empresa)
function getSlugFromHostname(): string | null {
  const hostname = window.location.hostname;
  
  // Se for dominio conhecido sem subdominio, retorna null
  if (KNOWN_DOMAINS.includes(hostname)) {
    return null;
  }
  
  // Extrai o primeiro segmento do hostname
  const parts = hostname.split(".");
  
  // Precisa ter pelo menos 3 partes (subdominio.dominio.tld)
  if (parts.length >= 3) {
    const potentialSlug = parts[0];
    // Ignora www e outros prefixos comuns
    if (potentialSlug !== "www" && potentialSlug !== "app" && potentialSlug !== "api") {
      return potentialSlug;
    }
  }
  
  return null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { companies, isSuperAdmin } = useAuth();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Tenta pegar slug do subdominio primeiro, depois da URL
  const subdomainSlug = getSlugFromHostname();
  const slug = subdomainSlug || urlSlug;
  const isSubdomainMode = !!subdomainSlug;

  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [currentMembership, setCurrentMembership] = useState<CompanyMember | null>(null);
  const [isValidatingSlug, setIsValidatingSlug] = useState(true);
  const [slugError, setSlugError] = useState<"invalid" | "no_access" | null>(null);

  // Validar slug (do subdominio ou URL)
  useEffect(() => {
    if (!slug) {
      setIsValidatingSlug(false);
      setSlugError("invalid");
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
      setSlugError("no_access");
      setCurrentCompanyState(null);
      setCurrentMembership(null);
    } else {
      // Nenhuma empresa
      setSlugError("invalid");
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
          // Sempre redireciona para o subdominio da empresa
          redirectToSubdomain(firstCompany.slug);
        } else {
          navigate("/", { replace: true });
        }
      }
    }
  }, [companies, currentCompany, navigate, location.pathname, isSubdomainMode, slug]);

  // Trocar empresa - sempre redireciona para subdominio
  const switchCompany = (company: Company) => {
    // Salvar no localStorage para redirecionamentos futuros
    localStorage.setItem(STORAGE_KEY, company.id);

    // Sempre redireciona para o subdominio da empresa
    redirectToSubdomain(company.slug);
  };

  const userRole = currentMembership?.role || null;

  const isAdmin = isSuperAdmin || userRole === "admin";
  const isManager = isAdmin || userRole === "manager";
  const isSeller = userRole === "seller";

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
    isSubdomainMode,
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
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

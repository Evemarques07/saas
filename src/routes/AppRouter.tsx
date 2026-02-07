import { AppRoutes } from "./index";
import { SubdomainRoutes } from "./SubdomainRoutes";

// Dominios conhecidos (sem subdominio de empresa)
const KNOWN_DOMAINS = [
  "localhost",
  "mercadovirtual.app",
  "www.mercadovirtual.app",
  "evertonapi.vps-kinghost.net",
];

function isSubdomainMode(): boolean {
  const hostname = window.location.hostname;
  
  // Se for dominio conhecido, nao e modo subdominio
  if (KNOWN_DOMAINS.includes(hostname)) {
    return false;
  }
  
  // Verifica se tem subdominio
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const potentialSlug = parts[0];
    if (potentialSlug !== "www" && potentialSlug !== "app" && potentialSlug !== "api") {
      return true;
    }
  }
  
  return false;
}

export function AppRouter() {
  if (isSubdomainMode()) {
    return <SubdomainRoutes />;
  }
  
  return <AppRoutes />;
}

// Constantes de rotas e helpers para construir URLs

// Dominios conhecidos (sem subdominio de empresa)
const KNOWN_DOMAINS = [
  "localhost",
  "mercadovirtual.app",
  "www.mercadovirtual.app",
  "evertonapi.vps-kinghost.net",
];

// Rotas públicas
export const PATHS = {
  LOGIN: '/login',
  REGISTRO: '/registro',
  ACEITAR_CONVITE: '/aceitar-convite',
  CATALOGO: '/catalogo',

  // Base para rotas do tenant (usado apenas em modo legacy/localhost)
  APP_BASE: '/app',

  // Rotas dentro do tenant (relativas)
  DASHBOARD: '',
  VENDAS: '/vendas',
  PEDIDOS_CATALOGO: '/pedidos',
  CLIENTES: '/clientes',
  PRODUTOS: '/produtos',
  CATEGORIAS: '/categorias',
  CUPONS: '/cupons',
  FIDELIDADE: '/fidelidade',
  PROMOCOES: '/promocoes',
  USUARIOS: '/usuarios',
  EMPRESAS: '/empresas',
  CONFIGURACOES: '/configuracoes',
  FATURAMENTO: '/faturamento',
} as const;

// Verifica se esta em localhost
export function isLocalhost(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

// Verifica se deve usar rotas de subdominio (producao) ou /app/:slug (localhost)
export function shouldUseSubdomainRouting(): boolean {
  return !isLocalhost();
}

// Verifica se esta no dominio principal (nao em subdominio)
export function isMainDomain(): boolean {
  const hostname = window.location.hostname;
  const result = KNOWN_DOMAINS.includes(hostname);
  console.log('[paths] isMainDomain:', hostname, '->', result);
  return result;
}

// Verifica se esta em modo subdominio
export function isSubdomainMode(): boolean {
  const hostname = window.location.hostname;

  if (KNOWN_DOMAINS.includes(hostname)) {
    console.log('[paths] isSubdomainMode: false (known domain)');
    return false;
  }

  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const potentialSlug = parts[0];
    if (potentialSlug !== "www" && potentialSlug !== "app" && potentialSlug !== "api") {
      console.log('[paths] isSubdomainMode: true, slug:', potentialSlug);
      return true;
    }
  }

  console.log('[paths] isSubdomainMode: false');
  return false;
}

// Extrai o slug do subdominio atual
export function getSubdomainSlug(): string | null {
  if (!isSubdomainMode()) {
    return null;
  }
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  return parts[0];
}

// Redireciona para o subdominio da empresa COM TOKEN de sessão
// O token é passado via hash fragment para não aparecer nos logs do servidor
export function redirectToSubdomain(slug: string, path: string = "/", sessionToken?: string): void {
  const protocol = window.location.protocol;
  let targetUrl = `${protocol}//${slug}.mercadovirtual.app${path}`;

  // Se tem token de sessão, passa via hash (mais seguro que query string)
  if (sessionToken) {
    targetUrl += `#session=${encodeURIComponent(sessionToken)}`;
    console.log('[paths] redirectToSubdomain with session token');
  }

  console.log('[paths] redirectToSubdomain:', slug, path, '->', targetUrl.replace(/#.*/, '#[token]'));
  window.location.href = targetUrl;
}

// Helper para construir path com slug (usado em modo localhost/legacy)
// AVISO: Em producao, prefira usar redirectToSubdomain para navegar entre empresas
export function buildAppPath(slug: string, route: string = ''): string {
  // Em modo subdominio, retorna path relativo
  if (isSubdomainMode()) {
    console.log('[paths] buildAppPath (subdomainMode):', slug, route, '->', route || '/');
    return route || '/';
  }
  // Em localhost ou dominio principal, usa o formato antigo
  const result = `${PATHS.APP_BASE}/${slug}${route}`;
  console.log('[paths] buildAppPath:', slug, route, '->', result);
  return result;
}

// Helpers específicos para cada rota
export function buildDashboardPath(slug: string): string {
  return buildAppPath(slug, PATHS.DASHBOARD);
}

export function buildVendasPath(slug: string): string {
  return buildAppPath(slug, PATHS.VENDAS);
}

export function buildClientesPath(slug: string): string {
  return buildAppPath(slug, PATHS.CLIENTES);
}

export function buildProdutosPath(slug: string): string {
  return buildAppPath(slug, PATHS.PRODUTOS);
}

export function buildUsuariosPath(slug: string): string {
  return buildAppPath(slug, PATHS.USUARIOS);
}

export function buildEmpresasPath(slug: string): string {
  return buildAppPath(slug, PATHS.EMPRESAS);
}

export function buildCatalogoPath(slug: string): string {
  // Em modo subdominio, o slug ja esta no hostname
  if (isSubdomainMode()) {
    return PATHS.CATALOGO;
  }
  return `${PATHS.CATALOGO}/${slug}`;
}

export function buildCatalogoProductPath(slug: string, productId: string): string {
  if (isSubdomainMode()) {
    return `${PATHS.CATALOGO}/produto/${productId}`;
  }
  return `${PATHS.CATALOGO}/${slug}/produto/${productId}`;
}

export function buildFullCatalogoUrl(slug: string): string {
  if (isSubdomainMode() || (!isLocalhost() && !isMainDomain())) {
    return `https://${slug}.mercadovirtual.app/catalogo`;
  }
  return `${window.location.origin}/catalogo/${slug}`;
}

export function buildFullCatalogoProductUrl(slug: string, productId: string): string {
  if (isSubdomainMode() || (!isLocalhost() && !isMainDomain())) {
    return `https://${slug}.mercadovirtual.app/catalogo/produto/${productId}`;
  }
  return `${window.location.origin}/catalogo/${slug}/produto/${productId}`;
}

// Extrair slug do pathname (para modo legacy)
export function extractSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

// Extrair rota relativa (após o slug)
export function extractRouteFromPath(pathname: string): string {
  const match = pathname.match(/^\/app\/[^/]+(.*)/);
  return match ? match[1] || '' : '';
}

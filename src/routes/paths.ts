// Constantes de rotas e helpers para construir URLs

// Rotas públicas
export const PATHS = {
  LOGIN: '/login',
  REGISTRO: '/registro',
  ACEITAR_CONVITE: '/aceitar-convite',
  CATALOGO: '/catalogo',

  // Base para rotas do tenant
  APP_BASE: '/app',

  // Rotas dentro do tenant (relativas)
  DASHBOARD: '',
  VENDAS: '/vendas',
  PEDIDOS_CATALOGO: '/pedidos',
  CLIENTES: '/clientes',
  PRODUTOS: '/produtos',
  CATEGORIAS: '/categorias',
  USUARIOS: '/usuarios',
  EMPRESAS: '/empresas',
  CONFIGURACOES: '/configuracoes',
} as const;

// Helper para construir path com slug
export function buildAppPath(slug: string, route: string = ''): string {
  return `${PATHS.APP_BASE}/${slug}${route}`;
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
  return `${PATHS.CATALOGO}/${slug}`;
}

// Extrair slug do pathname
export function extractSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

// Extrair rota relativa (após o slug)
export function extractRouteFromPath(pathname: string): string {
  const match = pathname.match(/^\/app\/[^/]+(.*)/);
  return match ? match[1] || '' : '';
}

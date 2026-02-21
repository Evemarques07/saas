// CORS Helper compartilhado para todas as Edge Functions
// Restringe origens permitidas para evitar ataques CSRF

const ALLOWED_ORIGINS = [
  'https://mercadovirtual.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';

  // Verificar se e um subdominio valido de mercadovirtual.app
  const isAllowedSubdomain = /^https:\/\/[a-z0-9]+\.mercadovirtual\.app$/.test(origin);
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || isAllowedSubdomain;

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

import { createClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const STORAGE_KEY = 'mv-auth';

// Flag para indicar que precisa fazer signOut no servidor apos client inicializar
let pendingServerSignOut = false;

console.log('[Supabase] Initializing...', {
  url: supabaseUrl,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR'
});

// ============================================
// Session from URL Hash (cross-domain transfer)
// ============================================

// Verifica se ha logout em progresso (NAO remove a flag - deixa para o guards.tsx)
function isLogoutInProgress(): boolean {
  if (typeof window === "undefined") return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") return true;
  // Verifica LOGOUT_FLAG_KEY - definido mais abaixo, mas funciona por hoisting
  const logoutFlag = sessionStorage.getItem("mv-just-logged-out");
  if (logoutFlag) return true;
  return false;
}

function getSessionFromHash(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash) return null;

  const match = hash.match(/session=([^&]+)/);
  if (!match) return null;

  // Se ha session hash na URL, significa que o usuario ACABOU de logar.
  // Isso tem prioridade sobre qualquer flag de logout velha no sessionStorage
  // (que pode ter ficado de um logout anterior neste mesmo subdominio).
  const logoutFlag = sessionStorage.getItem('mv-just-logged-out');
  if (logoutFlag) {
    console.log('[Supabase] Clearing stale logout flag - new session arriving via hash');
    sessionStorage.removeItem('mv-just-logged-out');
  }

  try {
    const sessionData = decodeURIComponent(match[1]);
    console.log('[Supabase] Found session in URL hash');

    // Remove hash from URL (security)
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    return sessionData;
  } catch (err) {
    console.error('[Supabase] Error parsing session from hash:', err);
  }
  return null;
}

// Flag para indicar que acabou de fazer logout - impede recuperação de sessão
const LOGOUT_FLAG_KEY = 'mv-just-logged-out';

// Check for logout parameter - if present, clear all session data first
function checkLogoutParam(): boolean {
  // Também seta flag no sessionStorage para o PublicRoute verificar
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('logout') === 'true') {
    console.log('[Supabase] Logout parameter detected - clearing all session data');
    // IMPORTANTE: Seta flag no sessionStorage ANTES de remover da URL
    // Isso permite que PublicRoute saiba que acabou de fazer logout
    sessionStorage.setItem(LOGOUT_FLAG_KEY, "true");
    // Remove the logout param from URL
    urlParams.delete('logout');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState(null, '', newUrl);
    return true;
  }
  return false;
}

// Verifica se acabou de fazer logout (flag setada no signOut)
function justLoggedOut(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = sessionStorage.getItem(LOGOUT_FLAG_KEY);
  if (flag) {
    console.log('[Supabase] Just logged out flag detected');
    sessionStorage.removeItem(LOGOUT_FLAG_KEY);
    return true;
  }
  return false;
}

// Seta flag de logout (chamada antes de redirecionar)
export function setLogoutFlag(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LOGOUT_FLAG_KEY, 'true');
  console.log('[Supabase] Logout flag set');
}

// NAO usar justLoggedOut() aqui pois remove a flag antes do guards.tsx verificar
const shouldClearSession = checkLogoutParam();
if (shouldClearSession) {
  console.log('[Supabase] Forcing session clear due to logout');
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    // Clear all mv- and sb- keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('mv-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Também tenta limpar cookies agressivamente
    document.cookie.split(";").forEach(c => {
      const name = c.trim().split("=")[0];
      if (name.startsWith('mv-') || name.startsWith('sb-')) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.mercadovirtual.app";
      }
    });

    console.log('[Supabase] Session cleared from localStorage and cookies');
    // Marca para fazer signOut no servidor depois que o client inicializar
    pendingServerSignOut = true;
  } catch (err) {
    console.error('[Supabase] Error clearing session:', err);
  }
}

// Check for session in hash on load (but NOT if we just logged out)
const hashSession = !shouldClearSession ? getSessionFromHash() : null;
if (hashSession) {
  console.log('[Supabase] Restoring session from URL hash');
  try {
    localStorage.setItem(STORAGE_KEY, hashSession);
    console.log('[Supabase] Session restored to localStorage');
  } catch (err) {
    console.error('[Supabase] Error restoring session:', err);
  }
} else if (shouldClearSession) {
  // Se acabou de fazer logout, também remove o hash da URL (caso tenha)
  if (window.location.hash.includes('session=')) {
    console.log('[Supabase] Removing session hash due to logout');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// ============================================
// Cookie helpers
// ============================================

function getCookieDomain(): string | undefined {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }

  if (hostname.includes('mercadovirtual.app')) {
    return '.mercadovirtual.app';
  }

  return undefined;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;

    const decoded = JSON.parse(atob(payload));
    if (!decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp < now + 60;

    console.log('[Supabase] Token check:', {
      exp: new Date(decoded.exp * 1000).toISOString(),
      now: new Date(now * 1000).toISOString(),
      isExpired
    });

    return isExpired;
  } catch (err) {
    console.error('[Supabase] Token parse error:', err);
    return true;
  }
}

function isValidSession(value: string | null): boolean {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value);

    if (!parsed || !parsed.access_token) {
      console.warn('[Supabase] Session missing access_token');
      return false;
    }

    if (isTokenExpired(parsed.access_token)) {
      console.warn('[Supabase] Access token expired - forcing new login');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Session parse error:', err);
    return false;
  }
}

function saveToCookie(key: string, value: string): void {
  try {
    const domain = getCookieDomain();
    const cookieValue = encodeURIComponent(value);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();

    let cookie = `${key}=${cookieValue}; path=/; expires=${expires}; SameSite=Lax; Secure`;
    if (domain) {
      cookie += `; domain=${domain}`;
    }
    document.cookie = cookie;
    console.log('[Supabase] Saved to cookie, domain:', domain);
  } catch (err) {
    console.error('[Supabase] Error saving to cookie:', err);
  }
}

function getFromCookie(key: string): string | null {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === key) {
        const value = valueParts.join('=');
        if (value) {
          console.log('[Supabase] Found cookie:', key);
          return decodeURIComponent(value);
        }
      }
    }
  } catch (err) {
    console.error('[Supabase] Error reading from cookie:', err);
  }
  return null;
}

function removeFromCookie(key: string): void {
  try {
    const hostname = window.location.hostname;

    // Lista de todos os domínios possíveis para tentar remover
    const domains: (string | undefined)[] = [
      undefined,                    // domínio atual sem especificar
      '.mercadovirtual.app',       // domínio compartilhado
      'mercadovirtual.app',        // domínio principal sem ponto
    ];

    // Se estiver em subdomínio, adiciona também
    if (hostname.includes('.mercadovirtual.app') && hostname !== 'mercadovirtual.app') {
      domains.push(hostname);
      domains.push('.' + hostname);
    }

    console.log('[Supabase] Removing cookie from domains:', domains);

    // Tenta todas as combinações possíveis de atributos
    for (const domain of domains) {
      const paths = ['/', ''];
      const secureOptions = [true, false];
      const sameSiteOptions = ['Lax', 'Strict', 'None'];

      for (const path of paths) {
        for (const secure of secureOptions) {
          for (const sameSite of sameSiteOptions) {
            let cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            if (path) cookie += `; path=${path}`;
            if (domain) cookie += `; domain=${domain}`;
            cookie += `; SameSite=${sameSite}`;
            if (secure) cookie += '; Secure';
            document.cookie = cookie;
          }
        }
      }
    }

    // Verificar se o cookie ainda existe
    const stillExists = document.cookie.includes(key + '=');
    console.log('[Supabase] Cookie after removal attempt:', stillExists ? 'STILL EXISTS' : 'REMOVED');
  } catch (err) {
    console.error('[Supabase] Error removing cookie:', err);
  }
}

export function clearAllSessionData(): void {
  console.log('[Supabase] Clearing all session data...');
  try {
    // Limpa localStorage
    localStorage.removeItem(STORAGE_KEY);

    // Limpa também sessionStorage (por precaução)
    sessionStorage.removeItem(STORAGE_KEY);

    // Remove cookies
    removeFromCookie(STORAGE_KEY);

    // Limpa chaves do Supabase específicas do projeto
    const urlParts = supabaseUrl.split('//');
    if (urlParts[1]) {
      const projectRef = urlParts[1].split('.')[0];
      const supabaseKey = 'sb-' + projectRef + '-auth-token';
      localStorage.removeItem(supabaseKey);
      sessionStorage.removeItem(supabaseKey);
      removeFromCookie(supabaseKey);
    }

    // Limpa qualquer outra chave relacionada ao auth
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('mv-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      removeFromCookie(key);
    });

    console.log('[Supabase] All session data cleared');
  } catch (err) {
    console.error('[Supabase] Error clearing session data:', err);
  }
}

// Exporta função para obter sessão raw (para transferir entre domínios)
export function getRawSessionData(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

// Flag global para bloquear recuperação de sessão após logout
// blockSessionRecovery removido - verificacao agora e dinamica no storage.getItem

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: STORAGE_KEY,
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null;

        console.log('[Supabase] storage.getItem called for:', key);

        // Verifica DINAMICAMENTE se acabou de fazer logout
        // Usa a flag do sessionStorage que e removida pelo guards.tsx
        const justLoggedOutFlag = sessionStorage.getItem('mv-just-logged-out');
        const urlHasLogout = new URLSearchParams(window.location.search).get('logout') === 'true';
        if (justLoggedOutFlag || urlHasLogout) {
          console.log('[Supabase] Session recovery blocked due to recent logout');
          return null;
        }

        try {
          let value = localStorage.getItem(key);
          console.log('[Supabase] localStorage value:', value ? 'found' : 'not found');

          if (value) {
            if (!isValidSession(value)) {
              console.warn('[Supabase] Invalid/expired session in localStorage, clearing...');
              localStorage.removeItem(key);
              removeFromCookie(key);
              value = null;
            }
          }

          if (!value) {
            const cookieValue = getFromCookie(key);
            if (cookieValue && isValidSession(cookieValue)) {
              console.log('[Supabase] Session recovered from shared cookie');
              localStorage.setItem(key, cookieValue);
              value = cookieValue;
            } else if (cookieValue) {
              console.warn('[Supabase] Invalid/expired session in cookie, clearing...');
              removeFromCookie(key);
            }
          }

          console.log('[Supabase] storage.getItem result:', value ? 'has session' : 'no session');
          return value;
        } catch (err) {
          console.error('[Supabase] Error in storage.getItem:', err);
          return null;
        }
      },
      setItem: (key, value) => {
        if (typeof window === 'undefined') return;
        console.log('[Supabase] storage.setItem called for:', key);
        try {
          localStorage.setItem(key, value);
          saveToCookie(key, value);
        } catch (err) {
          console.error('[Supabase] Error in storage.setItem:', err);
        }
      },
      removeItem: (key) => {
        if (typeof window === 'undefined') return;
        console.log('[Supabase] storage.removeItem called for:', key);
        try {
          localStorage.removeItem(key);
          removeFromCookie(key);
        } catch (err) {
          console.error('[Supabase] Error in storage.removeItem:', err);
        }
      },
    },
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
});

// Executa signOut pendente se necessario (logout veio de outro dominio)
if (pendingServerSignOut) {
  console.log('[Supabase] Executing pending server signOut...');
  supabase.auth.signOut({ scope: 'global' }).then(() => {
    console.log('[Supabase] Pending server signOut completed');
  }).catch((err) => {
    console.warn('[Supabase] Pending server signOut error:', err);
  });
}

export type { User, Session, AuthChangeEvent };

export async function supabaseSignIn(email: string, password: string) {
  console.log('[Supabase] signIn called:', email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  console.log('[Supabase] signIn success');
  return data;
}

export async function supabaseSignUp(
  email: string,
  password: string,
  metadata?: { full_name?: string }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignOut() {
  console.log('[Supabase] ====== SIGNOUT INICIADO ======');
  console.log('[Supabase] Cookies ANTES clearAll:', document.cookie);
  
  clearAllSessionData();
  
  console.log('[Supabase] Cookies DEPOIS clearAll:', document.cookie);

  try {
    console.log('[Supabase] Chamando supabase.auth.signOut()...');
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      console.warn('[Supabase] SignOut API error:', error);
    } else {
      console.log('[Supabase] SignOut API OK');
    }
  } catch (err) {
    console.error('[Supabase] SignOut exception:', err);
  }
  
  console.log('[Supabase] ====== SIGNOUT FINALIZADO ======');
}

export async function supabaseResetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
  return data;
}

export async function supabaseUpdatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

export async function supabaseUpdateUser(updates: {
  email?: string;
  password?: string;
  data?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.auth.updateUser(updates);
  if (error) throw error;
  return data;
}

export async function supabaseGetSession(): Promise<Session | null> {
  const timeoutMs = 5000;
  console.log('[Supabase] getSession called');

  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session fetch timeout')), timeoutMs)
    );

    const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);

    if (error) {
      console.error('[Supabase] GetSession error:', error);
      clearAllSessionData();
      return null;
    }

    console.log('[Supabase] getSession result:', data.session ? 'has session' : 'no session');
    return data.session;
  } catch (err) {
    console.error('[Supabase] GetSession exception:', err);
    clearAllSessionData();
    return null;
  }
}

export async function supabaseGetUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function supabaseOnAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  console.log('[Supabase] onAuthStateChange registered');
  return supabase.auth.onAuthStateChange(callback);
}

export async function supabaseGetAccessToken(): Promise<string | null> {
  try {
    const session = await supabaseGetSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

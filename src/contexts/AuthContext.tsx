import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  supabase,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseSignInWithGoogle,
  supabaseResetPassword,
  supabaseOnAuthStateChange,
  clearAllSessionData,
  User,
  Session,
} from '../services/supabase';
import { Profile, CompanyMember } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  companies: CompanyMember[];
  loading: boolean;
  profileLoadComplete: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; user?: User }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usar fetch direto para evitar problemas com o SDK
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchProfileDirect(userId: string): Promise<Profile | null> {
  console.log('[AuthContext] Fetching profile via REST API...');
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[AuthContext] Profile REST response status:', response.status, 'took:', Date.now() - startTime, 'ms');

    if (!response.ok) {
      console.error('[AuthContext] Profile REST error:', response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('[AuthContext] Profile REST result:', data.length > 0 ? 'found' : 'not found');

    return data[0] || null;
  } catch (err: any) {
    console.error('[AuthContext] Profile REST exception:', err?.message || err);
    return null;
  }
}

async function fetchCompaniesDirect(profileId: string): Promise<CompanyMember[]> {
  console.log('[AuthContext] Fetching companies via REST API...');
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/company_members?user_id=eq.${profileId}&is_active=eq.true&select=*,company:companies(*)`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[AuthContext] Companies REST response status:', response.status, 'took:', Date.now() - startTime, 'ms');

    if (!response.ok) {
      console.error('[AuthContext] Companies REST error:', response.statusText);
      return [];
    }

    const data = await response.json();
    console.log('[AuthContext] Companies REST result:', data.length, 'companies');

    return data || [];
  } catch (err: any) {
    console.error('[AuthContext] Companies REST exception:', err?.message || err);
    return [];
  }
}

// Verifica se está em localhost
function isLocalhost(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

// Dominios conhecidos (sem subdominio de empresa)
const KNOWN_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "mercadovirtual.app",
  "www.mercadovirtual.app",
  "evertonapi.vps-kinghost.net",
];

// Verifica se esta em modo subdominio (empresa.mercadovirtual.app)
function isSubdomainMode(): boolean {
  const hostname = window.location.hostname;
  if (KNOWN_DOMAINS.includes(hostname)) {
    return false;
  }
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const potentialSlug = parts[0];
    if (potentialSlug !== "www" && potentialSlug !== "app" && potentialSlug !== "api") {
      return true;
    }
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoadComplete, setProfileLoadComplete] = useState(false);

  const fetchProfileAndCompanies = async (userId: string, userEmail: string | undefined): Promise<boolean> => {
    console.log('[AuthContext] Fetching profile for user:', userId);

    try {
      // Usar REST API direto em vez do SDK
      const profileData = await fetchProfileDirect(userId);

      if (!profileData && userEmail) {
        // Fallback: try by email via REST
        console.log('[AuthContext] Trying fallback by email...');
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(userEmail)}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data[0]) {
            console.log('[AuthContext] Found profile by email');
            setProfile(data[0]);
            const companiesData = await fetchCompaniesDirect(data[0].id);
            setCompanies(companiesData);
            setProfileLoadComplete(true);
            return true;
          }
        }
      }

      if (profileData) {
        console.log('[AuthContext] Profile found:', profileData.id);
        setProfile(profileData);

        const companiesData = await fetchCompaniesDirect(profileData.id);
        setCompanies(companiesData);
        setProfileLoadComplete(true);
        console.log('[AuthContext] Profile and companies loaded successfully');
        return true;
      } else {
        console.log('[AuthContext] No profile found');
        setProfile(null);
        setCompanies([]);
        setProfileLoadComplete(true);
        return false;
      }
    } catch (err: any) {
      console.error('[AuthContext] Error fetching profile:', err?.message || err);
      setProfile(null);
      setCompanies([]);
      setProfileLoadComplete(true);
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      setProfileLoadComplete(false);
      await fetchProfileAndCompanies(user.id, user.email);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Setting up Supabase auth listener');
    let mounted = true;

    const { data: { subscription } } = supabaseOnAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('[AuthContext] Auth state changed:', event, newSession?.user?.email);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'USER_UPDATED') {
        console.log('[AuthContext] Skipping profile fetch for USER_UPDATED');
        return;
      }

      if (newSession?.user) {
        console.log('[AuthContext] User found, fetching profile...');
        setLoading(true);
        setProfileLoadComplete(false);

        // Pequeno delay para signup flow
        if (event === 'SIGNED_IN') {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (mounted) {
          await fetchProfileAndCompanies(newSession.user.id, newSession.user.email);
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        console.log('[AuthContext] No user, clearing state');
        if (mounted) {
          setProfile(null);
          setCompanies([]);
          setProfileLoadComplete(true);
          setLoading(false);
        }
      }
    });

    // Timeout de segurança - 10 segundos
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[AuthContext] Safety timeout - forcing loading=false');
        setLoading(false);
        setProfileLoadComplete(true);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in:', email);
      setProfileLoadComplete(false);
      await supabaseSignIn(email, password);
      return { error: null };
    } catch (err) {
      console.error('[AuthContext] Sign in error:', err);
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Signing in with Google...');
      setProfileLoadComplete(false);
      await supabaseSignInWithGoogle();
      return { error: null };
    } catch (err) {
      console.error('[AuthContext] Google sign in error:', err);
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('[AuthContext] Signing up:', email);
      const { user: newUser } = await supabaseSignUp(email, password, { full_name: fullName });

      if (newUser) {
        console.log('[AuthContext] Creating profile for:', email);
        const { error: profileError } = await supabase.from('profiles').insert({
          id: newUser.id,
          email: email,
          full_name: fullName,
          onboarding_completed: false,
        });

        if (profileError) {
          console.error('[AuthContext] Error creating profile:', profileError);
        }

        return { error: null, user: newUser };
      }

      return { error: null };
    } catch (err) {
      console.error('[AuthContext] Sign up error:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    console.log("[AuthContext] ====== LOGOUT INICIADO ======");
    console.log("[AuthContext] Hostname:", window.location.hostname);

    // IMPORTANTE: Se em subdominio, redireciona PRIMEIRO, antes de qualquer operacao
    // Isso evita race condition com ProtectedRoute que pode redirecionar com ?returnTo=
    if (isSubdomainMode()) {
      console.log("[AuthContext] Em subdominio - redirecionando IMEDIATAMENTE");
      // Seta flag ANTES de qualquer operacao async
      sessionStorage.setItem("mv-just-logged-out", "true");
      // Limpa localStorage sync (sem await)
      try {
        localStorage.removeItem("mv-auth");
        // Limpa todas as chaves mv- e sb-
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.startsWith("mv-"))) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.error("[AuthContext] Erro limpando localStorage:", e);
      }
      // Redireciona ANTES de chamar supabaseSignOut (que pode causar re-render)
      console.log("[AuthContext] Redirecionando para login...");
      window.location.href = "https://mercadovirtual.app/login?logout=true";
      // Nota: supabaseSignOut com scope:global sera chamado na proxima pagina
      return;
    }

    // Dominio principal ou localhost - fluxo normal
    console.log("[AuthContext] Cookies ANTES:", document.cookie);
    console.log("[AuthContext] LocalStorage ANTES:", localStorage.getItem("mv-auth") ? "EXISTE" : "NAO EXISTE");

    try {
      console.log("[AuthContext] Chamando supabaseSignOut...");
      await supabaseSignOut();
      console.log("[AuthContext] supabaseSignOut concluido");
    } catch (err) {
      console.error("[AuthContext] ERRO no supabaseSignOut:", err);
    }

    console.log("[AuthContext] Cookies DEPOIS:", document.cookie);
    console.log("[AuthContext] LocalStorage DEPOIS:", localStorage.getItem("mv-auth") ? "EXISTE" : "NAO EXISTE");

    // Limpa estados locais (apenas no dominio principal)
    console.log("[AuthContext] Limpando estados locais...");
    setProfile(null);
    setCompanies([]);
    setUser(null);
    setSession(null);
    setProfileLoadComplete(false);

    // Recarrega a pagina
    console.log("[AuthContext] Recarregando pagina...");
    console.log("[AuthContext] ====== LOGOUT FINALIZADO ======");
    window.location.reload();
  };
  const sendPasswordReset = async (email: string) => {
    try {
      await supabaseResetPassword(email);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const getToken = async () => {
    return session?.access_token ?? null;
  };

  const value = {
    user,
    session,
    profile,
    companies,
    loading,
    profileLoadComplete,
    isSuperAdmin: profile?.is_super_admin ?? false,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    refreshProfile,
    sendPasswordReset,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  supabase,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseSignInWithGoogle,
  supabaseResetPassword,
  supabaseGetSession,
  supabaseOnAuthStateChange,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch profile and companies from Supabase
  const fetchProfileAndCompanies = async (userId: string, userEmail: string | undefined, retryCount = 0) => {
    console.log('[AuthContext] Fetching profile for user:', userId, 'retry:', retryCount);

    try {
      // Try to find profile by user ID
      let profileData = null;

      const { data: profileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileById) {
        profileData = profileById;
      } else if (userEmail) {
        // Fallback: try by email (for backwards compatibility)
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail)
          .single();

        if (profileByEmail) {
          profileData = profileByEmail;
          // Update profile ID to match Supabase user ID
          console.log('[AuthContext] Updating profile ID to match Supabase user ID');
          await supabase
            .from('profiles')
            .update({ id: userId })
            .eq('email', userEmail);
          profileData.id = userId;
        }
      }

      if (profileData) {
        console.log('[AuthContext] Profile found:', profileData.id);
        setProfile(profileData);

        // Fetch companies
        const { data: companiesData } = await supabase
          .from('company_members')
          .select(`*, company:companies(*)`)
          .eq('user_id', profileData.id)
          .eq('is_active', true);

        if (companiesData) {
          setCompanies(companiesData);
        }
      } else {
        console.log('[AuthContext] No profile found for:', userId);
        // Profile might be created during signup flow - retry a few times
        if (retryCount < 3) {
          console.log('[AuthContext] Will retry in 1s...');
          setTimeout(() => fetchProfileAndCompanies(userId, userEmail, retryCount + 1), 1000);
        } else {
          setProfile(null);
          setCompanies([]);
        }
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndCompanies(user.id, user.email);
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('[AuthContext] Setting up Supabase auth listener');

    // Get initial session
    supabaseGetSession().then((initialSession) => {
      console.log('[AuthContext] Initial session:', initialSession?.user?.email);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        fetchProfileAndCompanies(initialSession.user.id, initialSession.user.email);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseOnAuthStateChange(async (event, newSession) => {
      console.log('[AuthContext] Auth state changed:', event, newSession?.user?.email);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Skip profile fetch for USER_UPDATED (password change, etc) - profile doesn't change
      if (event === 'USER_UPDATED') {
        console.log('[AuthContext] Skipping profile fetch for USER_UPDATED event');
        return;
      }

      if (newSession?.user) {
        // Small delay to ensure profile is created (for signup)
        if (event === 'SIGNED_IN') {
          setTimeout(() => {
            fetchProfileAndCompanies(newSession.user.id, newSession.user.email);
          }, 500);
        } else if (event === 'TOKEN_REFRESHED') {
          // Don't refetch for token refresh if we already have profile
          if (!profile) {
            await fetchProfileAndCompanies(newSession.user.id, newSession.user.email);
          }
        } else {
          await fetchProfileAndCompanies(newSession.user.id, newSession.user.email);
        }
      } else {
        setProfile(null);
        setCompanies([]);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in:', email);
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
      await supabaseSignInWithGoogle();
      // Note: This will redirect to Google, then back to /auth/callback
      // Profile creation will be handled after redirect
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
        // Create profile in Supabase
        // Nota: is_super_admin é definido automaticamente pelo trigger no banco de dados
        // baseado na tabela app_settings.super_admin_emails
        console.log('[AuthContext] Creating profile for:', email);
        const { error: profileError } = await supabase.from('profiles').insert({
          id: newUser.id,
          email: email,
          full_name: fullName,
          onboarding_completed: false,
        });

        if (profileError) {
          console.error('[AuthContext] Error creating profile:', profileError);
          // Don't fail signup if profile creation fails - can retry later
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
    console.log('[AuthContext] Signing out');
    await supabaseSignOut();
    setProfile(null);
    setCompanies([]);
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
    const currentSession = await supabaseGetSession();
    return currentSession?.access_token ?? null;
  };

  const value = {
    user,
    session,
    profile,
    companies,
    loading,
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

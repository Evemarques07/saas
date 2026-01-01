import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  auth,
  onAuthStateChanged,
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignOut,
  firebaseSignInWithGoogle,
  firebaseSendPasswordReset,
  getFirebaseToken,
  User as FirebaseUser,
} from '../services/firebase';
import { supabase } from '../services/supabase';
import { Profile, CompanyMember } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  companies: CompanyMember[];
  loading: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; user?: FirebaseUser }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync Firebase user with Supabase profile
  const syncUserWithSupabase = async (firebaseUser: FirebaseUser, retryCount = 0) => {
    console.log('[AuthContext] Syncing Firebase user with Supabase:', firebaseUser.email, 'retry:', retryCount);

    try {
      // Try to find profile by Firebase UID first (more reliable)
      let existingProfile = null;

      const { data: profileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firebaseUser.uid)
        .single();

      if (profileById) {
        existingProfile = profileById;
      } else {
        // Fallback: try by email
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', firebaseUser.email)
          .single();

        if (profileByEmail) {
          existingProfile = profileByEmail;
        }
      }

      if (existingProfile) {
        console.log('[AuthContext] Profile found:', existingProfile.id);
        setProfile(existingProfile);

        // Fetch companies
        const { data: companiesData } = await supabase
          .from('company_members')
          .select(`*, company:companies(*)`)
          .eq('user_id', existingProfile.id)
          .eq('is_active', true);

        if (companiesData) {
          setCompanies(companiesData);
        }
      } else {
        console.log('[AuthContext] No profile found for:', firebaseUser.email);
        // Profile might be created during signup flow - don't retry infinitely
        if (retryCount < 3) {
          // Wait and retry (profile might be being created)
          console.log('[AuthContext] Will retry in 1s...');
          setTimeout(() => syncUserWithSupabase(firebaseUser, retryCount + 1), 1000);
        } else {
          setProfile(null);
          setCompanies([]);
        }
      }
    } catch (err) {
      console.error('[AuthContext] Error syncing with Supabase:', err);
    }
  };

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    console.log('[AuthContext] fetchProfile for:', firebaseUser.email);

    try {
      // Try by UID first
      let profileData = null;

      const { data: profileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firebaseUser.uid)
        .single();

      if (profileById) {
        profileData = profileById;
      } else {
        // Fallback to email
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', firebaseUser.email)
          .single();

        if (profileByEmail) {
          profileData = profileByEmail;
        }
      }

      if (profileData) {
        console.log('[AuthContext] Profile refreshed:', profileData.id);
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
      }
    } catch (err) {
      console.error('[AuthContext] Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Setting up Firebase auth listener');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser?.email);

      setUser(firebaseUser);

      if (firebaseUser) {
        await syncUserWithSupabase(firebaseUser);
      } else {
        setProfile(null);
        setCompanies([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in with Firebase:', email);
      await firebaseSignIn(email, password);
      return { error: null };
    } catch (err) {
      console.error('[AuthContext] Sign in error:', err);
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Signing in with Google...');
      const userCredential = await firebaseSignInWithGoogle();
      const firebaseUser = userCredential.user;

      // Check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firebaseUser.uid)
        .single();

      if (!existingProfile) {
        console.log('[AuthContext] Creating profile for Google user...');
        await supabase.from('profiles').insert({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          is_super_admin: firebaseUser.email === 'evertonmarques.jm@gmail.com',
        });
      }

      return { error: null };
    } catch (err) {
      console.error('[AuthContext] Google sign in error:', err);
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('[AuthContext] Signing up with Firebase:', email);
      const userCredential = await firebaseSignUp(email, password, fullName);
      const firebaseUser = userCredential.user;

      // Create profile in Supabase
      console.log('[AuthContext] Creating Supabase profile for:', email);
      const { error: profileError } = await supabase.from('profiles').insert({
        id: firebaseUser.uid, // Use Firebase UID as profile ID
        email: email,
        full_name: fullName,
        is_super_admin: email === 'evertonmarques.jm@gmail.com',
      });

      if (profileError) {
        console.error('[AuthContext] Error creating profile:', profileError);
        // Don't fail signup if profile creation fails - can retry later
      }

      return { error: null, user: firebaseUser };
    } catch (err) {
      console.error('[AuthContext] Sign up error:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out');
    await firebaseSignOut();
    setProfile(null);
    setCompanies([]);
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await firebaseSendPasswordReset(email);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const getToken = async () => {
    return getFirebaseToken();
  };

  const value = {
    user,
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

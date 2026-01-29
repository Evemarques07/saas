import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../../components/ui/Loader';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the session from URL hash (Supabase puts tokens there)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[AuthCallback] Session error:', sessionError);
        setError('Erro ao processar login');
        return;
      }

      if (!session?.user) {
        console.error('[AuthCallback] No session found');
        setError('Sessao nao encontrada');
        return;
      }

      console.log('[AuthCallback] Session found for:', session.user.email);

      // Small delay to ensure auth state is fully propagated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if profile exists, if not create it (with retry for timing issues)
      let existingProfile = null;
      for (let i = 0; i < 3; i++) {
        const { data, error: selectError } = await supabase
          .from('profiles')
          .select('id, onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (data) {
          existingProfile = data;
          break;
        }

        if (selectError && selectError.code !== 'PGRST116') {
          console.log('[AuthCallback] Profile check attempt', i + 1, 'error:', selectError);
        }

        // Wait a bit before retry
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!existingProfile) {
        // Nota: is_super_admin é definido automaticamente pelo trigger no banco de dados
        // baseado na tabela app_settings.super_admin_emails
        console.log('[AuthCallback] Creating profile for OAuth user...');
        const { error: profileError } = await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
          onboarding_completed: false,
        });

        if (profileError && profileError.code !== '23505') {
          console.error('[AuthCallback] Profile creation error:', profileError);
        }
      }

      // Refresh profile to load companies (with small delay for DB propagation)
      await new Promise(resolve => setTimeout(resolve, 300));
      await refreshProfile();

      toast.success('Login realizado com sucesso!');

      // Redirect to root - RootOrLanding will handle the proper destination
      // based on whether user has companies or needs onboarding
      navigate('/');
    } catch (err) {
      console.error('[AuthCallback] Error:', err);
      setError('Erro ao processar login');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="text-primary-600 hover:underline"
          >
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  return <PageLoader />;
}

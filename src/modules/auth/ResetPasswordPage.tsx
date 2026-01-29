import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Visibility, VisibilityOff, Lock, CheckCircle } from '@mui/icons-material';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Loader';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Supabase automatically handles the tokens from the URL hash
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[ResetPassword] Session error:', sessionError);
        setError('Link invalido ou expirado');
        setChecking(false);
        return;
      }

      if (!session) {
        // Try to exchange the hash parameters for a session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'recovery') {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (setSessionError) {
            console.error('[ResetPassword] Set session error:', setSessionError);
            setError('Link invalido ou expirado');
            setChecking(false);
            return;
          }
        } else {
          setError('Link invalido ou expirado');
          setChecking(false);
          return;
        }
      }

      setChecking(false);
    } catch (err) {
      console.error('[ResetPassword] Error:', err);
      setError('Erro ao verificar link');
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;

    if (password !== confirmPassword) {
      toast.error('As senhas nao conferem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('[ResetPassword] Update error:', error);
        if (error.message?.includes('different from the old password')) {
          toast.error('A nova senha deve ser diferente da senha atual');
        } else {
          toast.error('Erro ao redefinir senha');
        }
        setLoading(false);
        isSubmittingRef.current = false;
        return;
      }

      // Sign out immediately to prevent auth state loops
      supabase.auth.signOut();

      // Show success and redirect immediately
      toast.success('Senha redefinida com sucesso!');
      setSuccess(true);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('[ResetPassword] Error:', err);
      toast.error('Erro ao redefinir senha');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (checking) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Link invalido</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/esqueci-senha')}>
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Senha redefinida!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Redirecionando para o login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Redefinir senha
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Digite sua nova senha
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Minimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Redefinir senha
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

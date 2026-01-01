import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card } from '../../components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes('invalid-credential')) {
          toast.error('Email ou senha inválidos');
        } else {
          toast.error('Erro ao fazer login');
        }
        return;
      }

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch {
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        toast.error('Erro ao fazer login com Google');
        return;
      }

      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch {
      toast.error('Erro ao fazer login com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Ejym</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sistema de Gestao de Vendas
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Entrar na sua conta
          </h2>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="secondary"
            className="w-full mb-4 flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            loading={googleLoading}
          >
            <GoogleIcon className="w-5 h-5" />
            Entrar com Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">ou</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<EmailIcon className="w-5 h-5" />}
              autoComplete="email"
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<LockIcon className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <VisibilityOffIcon className="w-5 h-5" />
                  ) : (
                    <VisibilityIcon className="w-5 h-5" />
                  )}
                </button>
              }
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                Nao tem uma conta?{' '}
              </span>
              <Link
                to="/registro"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Criar conta
              </Link>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                Recebeu um convite?{' '}
              </span>
              <Link
                to="/aceitar-convite"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Aceitar convite
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import EmailIcon from '@mui/icons-material/Email';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Input, Card } from '../../components/ui';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Digite seu email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await sendPasswordReset(email);

      if (error) {
        toast.error('Erro ao enviar email de recuperacao');
        return;
      }

      setEmailSent(true);
    } catch {
      toast.error('Erro ao enviar email de recuperacao');
    } finally {
      setLoading(false);
    }
  };

  // Tela de email enviado
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img
              src={theme === 'dark' ? '/mercadoVirtualBranco.png' : '/mercadoVirtualPreto.png'}
              alt="Mercado Virtual"
              className="h-20 w-auto object-contain"
            />
          </div>

          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <MarkEmailReadIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Email enviado
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enviamos as instrucoes de recuperacao para:
            </p>

            <p className="font-medium text-gray-900 dark:text-gray-100 mb-6 break-all">
              {email}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Clique no link enviado para redefinir sua senha. Verifique tambem a pasta de spam.
            </p>

            <Link to="/login">
              <Button variant="primary" className="w-full">
                Voltar para o login
              </Button>
            </Link>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Nao recebeu o email?{' '}
              <button
                type="button"
                onClick={() => setEmailSent(false)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Tentar novamente
              </button>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={theme === 'dark' ? '/mercadoVirtualBranco.png' : '/mercadoVirtualPreto.png'}
            alt="Mercado Virtual"
            className="h-20 w-auto object-contain"
          />
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sistema de Gestao de Vendas
          </p>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowBackIcon className="w-4 h-4 mr-1" />
              Voltar para o login
            </Link>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Esqueceu sua senha?
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<EmailIcon className="w-5 h-5" />}
              autoComplete="email"
              autoFocus
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              Enviar link de recuperacao
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

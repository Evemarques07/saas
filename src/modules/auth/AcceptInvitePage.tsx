import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { supabase } from '../../services/supabase';
import { firebaseSignUp } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card } from '../../components/ui';
import { Invite } from '../../types';
import { PageLoader } from '../../components/ui/Loader';

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Token de convite inválido');
      navigate('/login');
      return;
    }

    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    const { data, error } = await supabase
      .from('invites')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      toast.error('Convite inválido ou expirado');
      navigate('/login');
      return;
    }

    setInvite(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create user in Firebase (no email confirmation needed!)
      console.log('[AcceptInvite] Creating Firebase user...');
      const userCredential = await firebaseSignUp(invite!.email, password, fullName);
      const firebaseUser = userCredential.user;
      console.log('[AcceptInvite] Firebase user created:', firebaseUser.uid);

      // 2. Create profile in Supabase using Firebase UID
      console.log('[AcceptInvite] Creating Supabase profile...');
      const { error: profileError } = await supabase.from('profiles').insert({
        id: firebaseUser.uid,
        email: invite!.email,
        full_name: fullName,
        is_super_admin: false,
      });

      if (profileError) {
        console.error('[AcceptInvite] Profile error:', profileError);
        // Continue anyway - might be a conflict
      }

      // 3. Add user to company
      console.log('[AcceptInvite] Adding user to company...');
      const role = invite!.role === 'company_admin' ? 'admin' : invite!.role;
      const { error: memberError } = await supabase.from('company_members').insert({
        company_id: invite!.company_id,
        user_id: firebaseUser.uid,
        role: role,
        is_active: true,
      });

      if (memberError) {
        console.error('[AcceptInvite] Member error:', memberError);
      }

      // 4. Mark invite as accepted
      console.log('[AcceptInvite] Marking invite as accepted...');
      await supabase
        .from('invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite!.id);

      // 5. Refresh profile to load companies
      console.log('[AcceptInvite] Refreshing profile...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure data is committed
      await refreshProfile();

      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (err: unknown) {
      console.error('[AcceptInvite] Error:', err);

      // Handle Firebase errors
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email já está cadastrado. Faça login.');
        navigate('/login');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Senha muito fraca. Use pelo menos 6 caracteres.');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Ejym</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sistema de Gestão de Vendas
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Aceitar convite
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {invite?.company
              ? `Você foi convidado para ${invite.company.name}`
              : 'Você foi convidado para criar uma empresa'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={invite?.email || ''}
              disabled
              leftIcon={<EmailIcon className="w-5 h-5" />}
            />

            <Input
              label="Nome completo"
              type="text"
              placeholder="Seu nome"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<PersonIcon className="w-5 h-5" />}
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<LockIcon className="w-5 h-5" />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <VisibilityOffIcon className="w-5 h-5" />
                ) : (
                  <VisibilityIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirmar senha"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="********"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<LockIcon className="w-5 h-5" />}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <VisibilityOffIcon className="w-5 h-5" />
                ) : (
                  <VisibilityIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
            >
              Criar conta
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

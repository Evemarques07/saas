import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddIcon from '@mui/icons-material/Add';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Input } from '../../components/ui';
import { supabase, supabaseUpdatePassword } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);

    try {
      // Total de empresas
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Empresas ativas
      const { count: activeCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Total de usuarios
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalCompanies: totalCompanies || 0,
        activeCompanies: activeCompanies || 0,
        totalUsers: totalUsers || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatisticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao coincidem');
      return;
    }

    setChangingPassword(true);

    try {
      await supabaseUpdatePassword(newPassword);
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : value}
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <PageContainer
      title="Dashboard Administrativo"
      subtitle="Visao geral do sistema"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total de Empresas"
          value={stats.totalCompanies}
          icon={<BusinessIcon className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Empresas Ativas"
          value={stats.activeCompanies}
          icon={<TrendingUpIcon className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          title="Total de Usuarios"
          value={stats.totalUsers}
          icon={<PeopleIcon className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Acoes Rapidas
        </h3>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => navigate('/admin/empresas')}>
            <BusinessIcon className="w-4 h-4" />
            Gerenciar Empresas
          </Button>
          <Button onClick={() => navigate('/admin/usuarios')}>
            <PeopleIcon className="w-4 h-4" />
            Gerenciar Usuarios
          </Button>
          <Button onClick={() => navigate('/admin/whatsapp')}>
            <WhatsAppIcon className="w-4 h-4" />
            WhatsApp
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/empresas')}
          >
            <AddIcon className="w-4 h-4" />
            Nova Empresa
          </Button>
        </div>
      </Card>

      {/* Password Change Card */}
      <Card className="p-6 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <LockIcon className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alterar Senha
            </h3>
            <p className="text-sm text-gray-500">
              {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <Input
            type={showNewPassword ? 'text' : 'password'}
            label="Nova Senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Digite a nova senha"
            leftIcon={<LockIcon className="w-5 h-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? (
                  <VisibilityOffIcon className="w-5 h-5" />
                ) : (
                  <VisibilityIcon className="w-5 h-5" />
                )}
              </button>
            }
            helperText="Minimo de 6 caracteres"
            required
          />

          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirmar Nova Senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme a nova senha"
            leftIcon={<LockIcon className="w-5 h-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <VisibilityOffIcon className="w-5 h-5" />
                ) : (
                  <VisibilityIcon className="w-5 h-5" />
                )}
              </button>
            }
            required
          />

          <Button
            type="submit"
            loading={changingPassword}
            disabled={!newPassword || !confirmPassword}
          >
            Alterar Senha
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}

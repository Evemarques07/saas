import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddIcon from '@mui/icons-material/Add';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button } from '../../components/ui';
import { supabase } from '../../services/supabase';

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

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
    </PageContainer>
  );
}

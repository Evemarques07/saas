import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Table, Badge, Input } from '../../components/ui';
import { supabase } from '../../services/supabase';
import { TableColumn, MemberRole } from '../../types';

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
}

interface UserWithCompanies {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  companies: Array<{
    company_id: string;
    company_name: string;
    role: MemberRole;
  }>;
}

const ROLES: Record<MemberRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
  });
  const [users, setUsers] = useState<UserWithCompanies[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStats();
    fetchUsers();
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

  const fetchUsers = async () => {
    setLoadingUsers(true);

    try {
      // Buscar todos os profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar todos os membros com suas empresas
      const { data: membersData } = await supabase
        .from('company_members')
        .select('user_id, company_id, role');

      // Buscar todas as empresas
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name');

      // Criar mapa de empresas
      const companiesMap = new Map(companiesData?.map(c => [c.id, c.name]) || []);

      // Combinar dados
      const usersWithCompanies: UserWithCompanies[] = (profilesData || []).map(profile => {
        const userMembers = membersData?.filter(m => m.user_id === profile.id) || [];
        const companies = userMembers.map(m => ({
          company_id: m.company_id,
          company_name: companiesMap.get(m.company_id) || 'Desconhecida',
          role: m.role as MemberRole,
        }));

        return {
          ...profile,
          companies,
        };
      });

      setUsers(usersWithCompanies);
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.companies.some(c => c.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  const columns: TableColumn<UserWithCompanies>[] = [
    {
      key: 'full_name',
      label: 'Nome',
      render: (u) => u.full_name || '-',
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'companies',
      label: 'Empresas',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.companies.length === 0 ? (
            <span className="text-gray-400 text-sm">Sem empresa</span>
          ) : (
            u.companies.map((c) => (
              <Badge key={c.company_id} variant="info" className="text-xs">
                {c.company_name}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'Funções',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.companies.length === 0 ? (
            <span className="text-gray-400 text-sm">-</span>
          ) : (
            u.companies.map((c) => (
              <Badge
                key={c.company_id}
                variant={c.role === 'admin' ? 'success' : c.role === 'manager' ? 'warning' : 'default'}
                className="text-xs"
              >
                {ROLES[c.role]}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Cadastro',
      render: (u) => new Date(u.created_at).toLocaleDateString('pt-BR'),
    },
  ];

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
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Acoes Rapidas
        </h3>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => navigate('/admin/empresas')}>
            <BusinessIcon className="w-4 h-4" />
            Gerenciar Empresas
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

      {/* Users List */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Usuarios do Sistema ({filteredUsers.length})
          </h3>
          <div className="w-full md:w-64">
            <Input
              placeholder="Buscar usuario ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon className="w-5 h-5" />}
            />
          </div>
        </div>
        <Table
          columns={columns}
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          loading={loadingUsers}
          emptyMessage="Nenhum usuario encontrado"
        />
      </Card>
    </PageContainer>
  );
}

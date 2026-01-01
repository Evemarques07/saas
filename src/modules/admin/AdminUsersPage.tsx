import { useEffect, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BusinessIcon from '@mui/icons-material/Business';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Badge, Input } from '../../components/ui';
import { supabase } from '../../services/supabase';
import { MemberRole } from '../../types';

interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: MemberRole;
}

interface CompanyWithUsers {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  users: UserInfo[];
}

interface OrphanUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const ROLES: Record<MemberRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
};

export function AdminUsersPage() {
  const [companiesWithUsers, setCompaniesWithUsers] = useState<CompanyWithUsers[]>([]);
  const [orphanUsers, setOrphanUsers] = useState<OrphanUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [showOrphans, setShowOrphans] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Buscar todas as empresas
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, logo_url, is_active')
        .order('name');

      // Buscar todos os profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      // Buscar todos os membros
      const { data: membersData } = await supabase
        .from('company_members')
        .select('user_id, company_id, role');

      // Criar mapa de profiles
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Criar mapa de user_ids que pertencem a alguma empresa
      const usersInCompanies = new Set(membersData?.map(m => m.user_id) || []);

      // Agrupar usuarios por empresa
      const companiesWithUsersList: CompanyWithUsers[] = (companiesData || []).map(company => {
        const companyMembers = membersData?.filter(m => m.company_id === company.id) || [];
        const users: UserInfo[] = companyMembers.map(m => {
          const profile = profilesMap.get(m.user_id);
          return {
            id: m.user_id,
            email: profile?.email || 'Email não encontrado',
            full_name: profile?.full_name || null,
            created_at: profile?.created_at || '',
            role: m.role as MemberRole,
          };
        });

        return {
          ...company,
          users,
        };
      });

      // Usuarios sem empresa (orfaos)
      const orphans: OrphanUser[] = (profilesData || [])
        .filter(p => !usersInCompanies.has(p.id))
        .map(p => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          created_at: p.created_at,
        }));

      setCompaniesWithUsers(companiesWithUsersList);
      setOrphanUsers(orphans);

      // Expandir todas as empresas por padrao
      setExpandedCompanies(new Set(companiesWithUsersList.map(c => c.id)));
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const filteredCompanies = companiesWithUsers.filter(company => {
    const searchLower = search.toLowerCase();
    const companyMatches = company.name.toLowerCase().includes(searchLower);
    const userMatches = company.users.some(
      u => u.full_name?.toLowerCase().includes(searchLower) ||
           u.email.toLowerCase().includes(searchLower)
    );
    return companyMatches || userMatches;
  });

  const filteredOrphans = orphanUsers.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = companiesWithUsers.reduce((acc, c) => acc + c.users.length, 0) + orphanUsers.length;

  if (loading) {
    return (
      <PageContainer title="Usuarios" subtitle="Carregando...">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-32">
              <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Usuarios"
      subtitle={`${totalUsers} usuarios no sistema`}
    >
      {/* Search */}
      <Card className="p-4 mb-6">
        <Input
          placeholder="Buscar por nome, email ou empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<SearchIcon className="w-5 h-5" />}
        />
      </Card>

      {/* Companies with Users */}
      <div className="space-y-4">
        {filteredCompanies.map(company => (
          <Card key={company.id} className="overflow-hidden">
            {/* Company Header */}
            <button
              onClick={() => toggleCompany(company.id)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <BusinessIcon className="text-gray-500" />
                )}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {company.name}
                    </span>
                    <Badge variant={company.is_active ? 'success' : 'default'} className="text-xs">
                      {company.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    {company.users.length} {company.users.length === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </div>
              </div>
              {expandedCompanies.has(company.id) ? (
                <ExpandLessIcon className="text-gray-400" />
              ) : (
                <ExpandMoreIcon className="text-gray-400" />
              )}
            </button>

            {/* Users List */}
            {expandedCompanies.has(company.id) && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {company.users.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                    Nenhum usuario nesta empresa
                  </div>
                ) : (
                  company.users.map(user => (
                    <div
                      key={user.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {user.full_name || 'Sem nome'}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {user.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            user.role === 'admin' ? 'success' :
                            user.role === 'manager' ? 'warning' : 'default'
                          }
                        >
                          {ROLES[user.role]}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        ))}

        {/* Orphan Users (without company) */}
        {filteredOrphans.length > 0 && (
          <Card className="overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setShowOrphans(!showOrphans)}
              className="w-full px-4 py-3 flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <PersonOffIcon className="text-orange-500" />
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Usuarios sem Empresa
                    </span>
                    <Badge variant="warning" className="text-xs">
                      Atenção
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    {filteredOrphans.length} {filteredOrphans.length === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </div>
              </div>
              {showOrphans ? (
                <ExpandLessIcon className="text-gray-400" />
              ) : (
                <ExpandMoreIcon className="text-gray-400" />
              )}
            </button>

            {/* Users List */}
            {showOrphans && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrphans.map(user => (
                  <div
                    key={user.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {user.full_name || 'Sem nome'}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Empty State */}
        {filteredCompanies.length === 0 && filteredOrphans.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Nenhum usuario encontrado</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

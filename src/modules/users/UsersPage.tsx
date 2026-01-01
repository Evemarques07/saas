import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Select, Card } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { CompanyMember, MemberRole, TableColumn } from '../../types';

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'seller', label: 'Vendedor' },
];

export function UsersPage() {
  const { currentCompany, isAdmin } = useTenant();
  const { user } = useAuth();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('seller');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>('seller');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchMembers();
    }
  }, [currentCompany]);

  const fetchMembers = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('company_members')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('company_id', currentCompany.id)
      .order('created_at');

    if (!error && data) {
      setMembers(data);
    }

    setLoading(false);
  };

  const handleOpenInviteModal = () => {
    setInviteEmail('');
    setInviteRole('seller');
    setShowInviteModal(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail) {
      toast.error('Email é obrigatório');
      return;
    }

    setSendingInvite(true);

    try {
      const { error } = await supabase.from('invites').insert({
        email: inviteEmail,
        company_id: currentCompany!.id,
        role: inviteRole,
        invited_by: user!.uid,
      });

      if (error) throw error;

      toast.success(`Convite enviado para ${inviteEmail}`);
      setShowInviteModal(false);
    } catch {
      toast.error('Erro ao enviar convite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleOpenEditModal = (member: CompanyMember) => {
    setEditingMember(member);
    setEditRole(member.role);
    setShowEditModal(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingMember) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('company_members')
        .update({ role: editRole })
        .eq('id', editingMember.id);

      if (error) throw error;

      toast.success('Função atualizada com sucesso!');
      setShowEditModal(false);
      fetchMembers();
    } catch {
      toast.error('Erro ao atualizar função');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: CompanyMember) => {
    const action = member.is_active ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${action} este usuário?`)) return;

    try {
      const { error } = await supabase
        .from('company_members')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);

      if (error) throw error;

      toast.success(`Usuário ${member.is_active ? 'desativado' : 'ativado'}!`);
      fetchMembers();
    } catch {
      toast.error('Erro ao atualizar usuário');
    }
  };

  const getRoleLabel = (role: MemberRole) => {
    return ROLES.find((r) => r.value === role)?.label || role;
  };

  const filteredMembers = members.filter((m) =>
    m.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.profile?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: TableColumn<CompanyMember>[] = [
    {
      key: 'profile.full_name',
      label: 'Nome',
      render: (m) => m.profile?.full_name || '-',
    },
    {
      key: 'profile.email',
      label: 'Email',
      render: (m) => m.profile?.email || '-',
    },
    {
      key: 'role',
      label: 'Função',
      render: (m) => (
        <Badge
          variant={
            m.role === 'admin' ? 'info' : m.role === 'manager' ? 'warning' : 'default'
          }
        >
          {getRoleLabel(m.role)}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (m) => (
        <Badge variant={m.is_active ? 'success' : 'danger'}>
          {m.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Desde',
      render: (m) => new Date(m.created_at).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (m) => (
        <div className="flex items-center gap-2">
          {isAdmin && m.user_id !== user?.uid && (
            <>
              <button
                onClick={() => handleOpenEditModal(m)}
                className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                title="Editar função"
              >
                <EditIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggleActive(m)}
                className={`p-1 transition-colors ${
                  m.is_active
                    ? 'text-gray-500 hover:text-red-600'
                    : 'text-gray-500 hover:text-green-600'
                }`}
                title={m.is_active ? 'Desativar' : 'Ativar'}
              >
                <BlockIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (!currentCompany) {
    return (
      <PageContainer title="Usuários">
        <EmptyState
          title="Selecione uma empresa"
          description="Selecione uma empresa para gerenciar os usuários"
        />
      </PageContainer>
    );
  }

  if (!isAdmin) {
    return (
      <PageContainer title="Usuários">
        <EmptyState
          title="Acesso negado"
          description="Apenas administradores podem gerenciar usuários"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Usuários"
      subtitle={`${filteredMembers.length} usuários na empresa`}
      action={
        <Button onClick={handleOpenInviteModal}>
          <PersonAddIcon className="w-4 h-4" />
          Convidar Usuário
        </Button>
      }
    >
      {/* Search */}
      <Card className="p-4 mb-4">
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<SearchIcon className="w-5 h-5" />}
        />
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredMembers}
        keyExtractor={(m) => m.id}
        loading={loading}
        emptyMessage="Nenhum usuário encontrado"
      />

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Convidar Usuário"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            O usuário receberá um convite por email para se juntar à empresa.
          </p>

          <Input
            label="Email *"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="usuario@email.com"
          />

          <Select
            label="Função *"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MemberRole)}
            options={ROLES}
          />

          <ModalFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowInviteModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={sendingInvite}>
              <PersonAddIcon className="w-4 h-4" />
              Enviar Convite
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Função"
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Alterar função de <strong>{editingMember?.profile?.full_name}</strong>
          </p>

          <Select
            label="Nova Função"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as MemberRole)}
            options={ROLES}
          />

          <ModalFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowEditModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Salvar
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </PageContainer>
  );
}

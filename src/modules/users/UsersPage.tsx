import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Select, Card, ConfirmModal, InviteLinkModal } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { sendInviteEmail } from '../../services/email';
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

  // Invite Link Modal
  const [inviteLinkModal, setInviteLinkModal] = useState<{ open: boolean; link: string; email: string }>({
    open: false,
    link: '',
    email: '',
  });

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>('seller');
  const [submitting, setSubmitting] = useState(false);

  // Toggle Active Modal
  const [toggleModal, setToggleModal] = useState<{ open: boolean; member: CompanyMember | null }>({
    open: false,
    member: null,
  });
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (currentCompany) {
      fetchMembers();
    }
  }, [currentCompany]);

  const fetchMembers = async () => {
    if (!currentCompany) return;

    setLoading(true);

    // Buscar members primeiro
    const { data: membersData, error: membersError } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('created_at');

    if (membersError || !membersData) {
      setLoading(false);
      return;
    }

    // Buscar profiles dos members
    const userIds = membersData.map(m => m.user_id).filter(Boolean);

    if (userIds.length === 0) {
      setMembers(membersData.map(m => ({ ...m, profile: null })));
      setLoading(false);
      return;
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    // Combinar dados
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const membersWithProfiles = membersData.map(m => ({
      ...m,
      profile: profilesMap.get(m.user_id) || null,
    }));

    setMembers(membersWithProfiles);
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
      toast.error('Email e obrigatorio');
      return;
    }

    setSendingInvite(true);

    try {
      // Criar convite no banco
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .insert({
          email: inviteEmail,
          company_id: currentCompany!.id,
          role: inviteRole,
          invited_by: user!.uid,
        })
        .select('token')
        .single();

      if (inviteError) throw inviteError;

      // Gerar link de convite
      const inviteLink = `${window.location.origin}/aceitar-convite?token=${inviteData.token}`;

      // Tentar enviar email
      let emailSent = false;
      try {
        const emailResult = await sendInviteEmail({
          email: inviteEmail,
          companyName: currentCompany!.name,
          inviteLink: inviteLink,
        });
        emailSent = emailResult.success;
      } catch {
        // Ignora erro de email, vai usar fallback
      }

      setShowInviteModal(false);

      if (emailSent) {
        toast.success(`Convite enviado por email para ${inviteEmail}`);
      } else {
        // Mostrar modal com link para copiar
        setInviteLinkModal({
          open: true,
          link: inviteLink,
          email: inviteEmail,
        });
      }
    } catch {
      toast.error('Erro ao criar convite');
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

  const handleOpenToggleModal = (member: CompanyMember) => {
    setToggleModal({ open: true, member });
  };

  const handleCloseToggleModal = () => {
    setToggleModal({ open: false, member: null });
  };

  const handleConfirmToggle = async () => {
    if (!toggleModal.member) return;

    setToggling(true);
    try {
      const { error } = await supabase
        .from('company_members')
        .update({ is_active: !toggleModal.member.is_active })
        .eq('id', toggleModal.member.id);

      if (error) throw error;

      toast.success(`Usuario ${toggleModal.member.is_active ? 'desativado' : 'ativado'}!`);
      handleCloseToggleModal();
      fetchMembers();
    } catch {
      toast.error('Erro ao atualizar usuario');
    } finally {
      setToggling(false);
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
                onClick={() => handleOpenToggleModal(m)}
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
          <span className="hidden sm:inline">Convidar Usuário</span>
          <span className="sm:hidden">Convidar</span>
        </Button>
      }
      toolbar={
        <Card className="p-3 md:p-4">
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<SearchIcon className="w-5 h-5" />}
          />
        </Card>
      }
    >
      {/* Table */}
      <Table
        columns={columns}
        data={filteredMembers}
        keyExtractor={(m) => m.id}
        loading={loading}
        emptyMessage="Nenhum usuário encontrado"
        mobileCardRender={(m) => (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <PersonIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {m.profile?.full_name || 'Sem nome'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <EmailIcon className="w-3 h-3" />
                    <span className="truncate">{m.profile?.email || '-'}</span>
                  </div>
                </div>
              </div>
              <Badge variant={m.is_active ? 'success' : 'danger'} className="flex-shrink-0">
                {m.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Badge
                  variant={m.role === 'admin' ? 'info' : m.role === 'manager' ? 'warning' : 'default'}
                >
                  {getRoleLabel(m.role)}
                </Badge>
                <span className="text-xs text-gray-500">
                  Desde {new Date(m.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>

              {isAdmin && m.user_id !== user?.uid && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(m)}
                    className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Editar função"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleOpenToggleModal(m)}
                    className={`p-2 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      m.is_active
                        ? 'text-gray-500 hover:text-red-600'
                        : 'text-gray-500 hover:text-green-600'
                    }`}
                    title={m.is_active ? 'Desativar' : 'Ativar'}
                  >
                    <BlockIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Toggle Active Confirm Modal */}
      <ConfirmModal
        isOpen={toggleModal.open}
        onClose={handleCloseToggleModal}
        onConfirm={handleConfirmToggle}
        title={toggleModal.member?.is_active ? 'Desativar Usuario' : 'Ativar Usuario'}
        message={`Deseja ${toggleModal.member?.is_active ? 'desativar' : 'ativar'} o usuario "${toggleModal.member?.profile?.full_name}"?`}
        confirmText={toggleModal.member?.is_active ? 'Desativar' : 'Ativar'}
        variant={toggleModal.member?.is_active ? 'danger' : 'info'}
        loading={toggling}
      />

      {/* Invite Link Modal */}
      <InviteLinkModal
        isOpen={inviteLinkModal.open}
        onClose={() => setInviteLinkModal({ open: false, link: '', email: '' })}
        inviteLink={inviteLinkModal.link}
        email={inviteLinkModal.email}
      />
    </PageContainer>
  );
}

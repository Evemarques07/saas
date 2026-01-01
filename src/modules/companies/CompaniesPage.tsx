import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Card, InviteLinkModal } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { sendInviteEmail } from '../../services/email';
import { Company, TableColumn, MemberRole } from '../../types';

interface CompanyWithMembers extends Company {
  members?: Array<{
    role: MemberRole;
    profile: { email: string; full_name: string | null } | null;
  }>;
}

const SEGMENTS = [
  { value: 'roupas', label: 'Roupas' },
  { value: 'calcados', label: 'Calçados' },
  { value: 'perfumaria', label: 'Perfumaria' },
  { value: 'cosmeticos', label: 'Cosméticos' },
  { value: 'acessorios', label: 'Acessórios' },
  { value: 'outros', label: 'Outros' },
];

export function CompaniesPage() {
  const { isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<CompanyWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Company Modal
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCompany, setInviteCompany] = useState<Company | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Invite Link Modal
  const [inviteLinkModal, setInviteLinkModal] = useState<{ open: boolean; link: string; email: string }>({
    open: false,
    link: '',
    email: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    segments: [] as string[],
    is_active: true,
    adminEmail: '', // Email do admin para enviar convite ao criar
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    console.log('[CompaniesPage] fetchCompanies iniciado');
    setLoading(true);

    // Buscar empresas
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('name');

    if (companiesError) {
      console.error('[CompaniesPage] Erro ao buscar empresas:', companiesError);
      setLoading(false);
      return;
    }

    // Buscar membros admin de todas as empresas
    const { data: membersData } = await supabase
      .from('company_members')
      .select('company_id, user_id, role')
      .eq('role', 'admin');

    // Buscar profiles dos admins
    const adminUserIds = [...new Set(membersData?.map(m => m.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminUserIds.length > 0 ? adminUserIds : ['']);

    // Montar mapa de profiles
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Combinar dados
    const companiesWithMembers = companiesData?.map(company => {
      const adminMember = membersData?.find(m => m.company_id === company.id && m.role === 'admin');
      const adminProfile = adminMember ? profilesMap.get(adminMember.user_id) : null;
      return {
        ...company,
        members: adminProfile ? [{ role: 'admin' as const, profile: adminProfile }] : []
      };
    }) || [];

    setCompanies(companiesWithMembers);
    setLoading(false);
    console.log('[CompaniesPage] fetchCompanies concluído');
  };

  const handleOpenCompanyModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        slug: company.slug,
        segments: company.segments,
        is_active: company.is_active,
        adminEmail: '', // Não edita email ao editar empresa
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: '',
        slug: '',
        segments: [],
        is_active: true,
        adminEmail: '',
      });
    }
    setShowCompanyModal(true);
  };

  const handleSubmitCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    setSubmitting(true);

    const companyData = {
      name: formData.name,
      slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
      segments: formData.segments,
      is_active: formData.is_active,
    };

    try {
      console.log('[CompaniesPage] Salvando empresa:', companyData);

      if (editingCompany) {
        const { data, error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', editingCompany.id)
          .select();

        console.log('[CompaniesPage] Update result:', { data, error });
        if (error) throw error;
        toast.success('Empresa atualizada com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('companies')
          .insert(companyData)
          .select()
          .single();

        console.log('[CompaniesPage] Insert result:', { data, error });
        if (error) throw error;

        // Se email do admin foi informado, criar convite e enviar email
        if (formData.adminEmail && data) {
          await createAndSendInvite(data, formData.adminEmail);
        } else {
          toast.success('Empresa criada com sucesso!');
        }
      }

      setShowCompanyModal(false);
      fetchCompanies();
    } catch (err) {
      console.error('[CompaniesPage] Erro ao salvar:', err);
      toast.error('Erro ao salvar empresa');
    } finally {
      setSubmitting(false);
    }
  };

  // Função auxiliar para criar convite e enviar email
  const createAndSendInvite = async (company: Company, email: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Criar convite no banco
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .insert({
          email: email,
          company_id: company.id,
          role: 'admin',
          invited_by: userData.user?.id,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Gerar link do convite
      const inviteLink = `${window.location.origin}/aceitar-convite?token=${inviteData.token}`;

      // Enviar email
      const emailResult = await sendInviteEmail({
        email: email,
        companyName: company.name,
        inviteLink: inviteLink,
      });

      if (emailResult.success) {
        toast.success(
          `Empresa criada e convite enviado para ${email}!`,
          { duration: 5000 }
        );
      } else {
        // Email falhou - mostrar modal com link para copiar
        setInviteLinkModal({
          open: true,
          link: inviteLink,
          email: email,
        });
        toast.success('Empresa criada com sucesso!');
        console.error('[CompaniesPage] Erro ao enviar email:', emailResult.error);
      }

      console.log('[CompaniesPage] Link do convite:', inviteLink);
    } catch (err) {
      console.error('[CompaniesPage] Erro ao criar convite:', err);
      toast.success('Empresa criada, mas houve erro ao criar convite');
    }
  };

  const handleOpenInviteModal = (company: Company) => {
    setInviteCompany(company);
    setInviteEmail('');
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
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase.from('invites').insert({
        email: inviteEmail,
        company_id: inviteCompany!.id,
        role: 'admin',
        invited_by: userData.user?.id,
      }).select().single();

      if (error) throw error;

      // Gerar link do convite
      const inviteLink = `${window.location.origin}/aceitar-convite?token=${data.token}`;

      // Enviar email
      const emailResult = await sendInviteEmail({
        email: inviteEmail,
        companyName: inviteCompany!.name,
        inviteLink: inviteLink,
      });

      setShowInviteModal(false);

      if (emailResult.success) {
        toast.success(`Convite enviado para ${inviteEmail}!`);
      } else {
        // Email falhou - mostrar modal com link para copiar
        setInviteLinkModal({
          open: true,
          link: inviteLink,
          email: inviteEmail,
        });
        console.error('[CompaniesPage] Erro ao enviar email:', emailResult.error);
      }

      console.log('Link do convite:', inviteLink);
    } catch (err) {
      console.error('Erro ao criar convite:', err);
      toast.error('Erro ao criar convite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleToggleSegment = (segment: string) => {
    const newSegments = formData.segments.includes(segment)
      ? formData.segments.filter((s) => s !== segment)
      : [...formData.segments, segment];
    setFormData({ ...formData, segments: newSegments });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Funcao auxiliar para pegar email do admin
  const getAdminEmail = (company: CompanyWithMembers): string => {
    const admin = company.members?.find(m => m.role === 'admin');
    return admin?.profile?.email || '-';
  };

  const columns: TableColumn<CompanyWithMembers>[] = [
    {
      key: 'logo',
      label: '',
      render: (c) => (
        c.logo_url ? (
          <img
            src={c.logo_url}
            alt={c.name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <BusinessIcon className="text-gray-400" />
          </div>
        )
      ),
    },
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'slug', label: 'Slug' },
    {
      key: 'admin_email',
      label: 'Admin',
      render: (c) => (
        <span className="text-gray-600 dark:text-gray-400">
          {getAdminEmail(c)}
        </span>
      ),
    },
    {
      key: 'segments',
      label: 'Segmentos',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.segments.map((s) => (
            <Badge key={s} variant="info">
              {SEGMENTS.find((seg) => seg.value === s)?.label || s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (c) => (
        <Badge variant={c.is_active ? 'success' : 'default'}>
          {c.is_active ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Criada em',
      render: (c) => new Date(c.created_at).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (c) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCompanyModal(c)}
            className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
            title="Editar"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenInviteModal(c)}
            className="p-1 text-gray-500 hover:text-green-600 transition-colors"
            title="Enviar convite"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (!isSuperAdmin) {
    return (
      <PageContainer title="Acesso Negado">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Você não tem permissão para acessar esta página
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Empresas"
      subtitle={`${filteredCompanies.length} empresas cadastradas`}
      action={
        <Button onClick={() => handleOpenCompanyModal()}>
          <AddIcon className="w-4 h-4" />
          Nova Empresa
        </Button>
      }
    >
      {/* Search */}
      <Card className="p-4 mb-4">
        <Input
          placeholder="Buscar empresas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<SearchIcon className="w-5 h-5" />}
        />
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredCompanies}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyMessage="Nenhuma empresa encontrada"
      />

      {/* Company Modal */}
      <Modal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        title={editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
      >
        <form onSubmit={handleSubmitCompany} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: editingCompany ? formData.slug : generateSlug(e.target.value),
              });
            }}
            placeholder="Nome da empresa"
          />

          <Input
            label="Slug *"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="slug-da-empresa"
            helperText="URL do catálogo: /catalogo/{slug}"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Segmentos
            </label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((segment) => (
                <button
                  key={segment.value}
                  type="button"
                  onClick={() => handleToggleSegment(segment.value)}
                  className={`
                    px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${formData.segments.includes(segment.value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {segment.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Empresa ativa
            </span>
          </label>

          {/* Campo de email do admin - só aparece ao criar nova empresa */}
          {!editingCompany && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Input
                label="Email do Administrador"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@empresa.com"
                helperText="Opcional: enviar convite automaticamente ao criar a empresa"
                leftIcon={<EmailIcon className="w-5 h-5" />}
              />
            </div>
          )}

          <ModalFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCompanyModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingCompany ? 'Salvar' : 'Criar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={`Convidar Admin - ${inviteCompany?.name}`}
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            O usuário receberá um convite por email para se tornar administrador
            desta empresa.
          </p>

          <Input
            label="Email do Admin *"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="admin@empresa.com"
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
              <SendIcon className="w-4 h-4" />
              Enviar Convite
            </Button>
          </ModalFooter>
        </form>
      </Modal>

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

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import BusinessIcon from '@mui/icons-material/Business';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Badge, Modal, ModalFooter, ConfirmModal } from '../../components/ui';
import { supabase } from '../../services/supabase';
import {
  checkApiHealth,
  getApiUrl,
  listAllUsers,
  getUserStatus,
  disconnectSession,
  deleteUser,
  deleteUserById,
  connectSession,
  getQRCode,
  WuzAPIUser,
  WuzAPIUserStatus,
} from '../../services/whatsapp';
import { Company, WhatsAppSettings } from '../../types';

interface CompanyWithWhatsApp extends Company {
  whatsapp_settings: WhatsAppSettings | null;
  wuzapiStatus?: WuzAPIUserStatus | null;
  wuzapiUser?: WuzAPIUser | null;
}

export function WhatsAppAdminPage() {
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [companies, setCompanies] = useState<CompanyWithWhatsApp[]>([]);
  const [wuzapiUsers, setWuzapiUsers] = useState<WuzAPIUser[]>([]);
  const [orphanUsers, setOrphanUsers] = useState<WuzAPIUser[]>([]);

  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCompany, setQrCompany] = useState<CompanyWithWhatsApp | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; company: CompanyWithWhatsApp | null; isOrphan: boolean; userName?: string; userId?: string }>({
    open: false,
    company: null,
    isOrphan: false,
    userId: undefined,
  });
  const [deleting, setDeleting] = useState(false);

  const [confirmDisconnect, setConfirmDisconnect] = useState<{ open: boolean; company: CompanyWithWhatsApp | null }>({
    open: false,
    company: null,
  });
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      // Check API health
      const isOnline = await checkApiHealth();
      setApiOnline(isOnline);

      // Fetch companies with whatsapp_settings
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      const companiesWithWA = (companiesData || []).filter(
        (c) => c.whatsapp_settings && Object.keys(c.whatsapp_settings).length > 0
      ) as CompanyWithWhatsApp[];

      // If API is online, get WuzAPI users and status
      if (isOnline) {
        const { success, users } = await listAllUsers();

        if (success) {
          setWuzapiUsers(users);

          // Get status for each company that has whatsapp configured
          const updatedCompanies = await Promise.all(
            companiesWithWA.map(async (company) => {
              const expectedUserName = `ejym-${company.slug}`;
              const savedToken = company.whatsapp_settings?.user_token;

              // Find user by token first (more reliable), then by name
              let wuzapiUser = savedToken
                ? users.find((u) => u.token === savedToken)
                : null;

              // Fallback: find by name if token not found
              if (!wuzapiUser) {
                wuzapiUser = users.find((u) => u.name === expectedUserName);
              }

              if (wuzapiUser) {
                const status = await getUserStatus(wuzapiUser.token);
                return {
                  ...company,
                  wuzapiUser,
                  wuzapiStatus: status,
                };
              }

              return {
                ...company,
                wuzapiUser: null,
                wuzapiStatus: null,
              };
            })
          );

          setCompanies(updatedCompanies);

          // Find orphan users (exist in WuzAPI but not linked to any company)
          const companyUserNames = companiesWithWA.map((c) => `ejym-${c.slug}`);
          const companyUserTokens = companiesWithWA
            .map((c) => c.whatsapp_settings?.user_token)
            .filter(Boolean);

          const orphans = users.filter(
            (u) =>
              u.name.startsWith('ejym-') &&
              !companyUserNames.includes(u.name) &&
              !companyUserTokens.includes(u.token)
          );
          setOrphanUsers(orphans);
        } else {
          setCompanies(companiesWithWA);
        }
      } else {
        setCompanies(companiesWithWA);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDisconnect = (company: CompanyWithWhatsApp) => {
    setConfirmDisconnect({ open: true, company });
  };

  const handleConfirmDisconnect = async () => {
    const company = confirmDisconnect.company;
    if (!company?.wuzapiUser) return;

    setDisconnecting(true);

    try {
      const success = await disconnectSession(company.wuzapiUser.token);
      if (success) {
        toast.success('Desconectado com sucesso!');

        // Update company in Supabase
        await supabase
          .from('companies')
          .update({
            whatsapp_settings: {
              ...company.whatsapp_settings,
              connected: false,
              phone: null,
              phone_name: null,
            },
          })
          .eq('id', company.id);

        fetchData();
      } else {
        toast.error('Erro ao desconectar');
      }
    } catch (error) {
      toast.error('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect({ open: false, company: null });
    }
  };

  const handleShowQR = async (company: CompanyWithWhatsApp) => {
    setQrCompany(company);
    setShowQRModal(true);
    setQrLoading(true);
    setQrCode(null);

    try {
      if (company.wuzapiUser) {
        // Connect session first
        await connectSession(company.wuzapiUser.token);

        // Wait a bit then get QR
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const qr = await getQRCode(company.wuzapiUser.token);
        if (qr?.base64) {
          setQrCode(qr.base64);
        } else {
          toast.error('Nao foi possivel obter o QR Code');
        }
      }
    } catch (error) {
      toast.error('Erro ao gerar QR Code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);

    try {
      if (confirmDelete.isOrphan && confirmDelete.userId) {
        // Delete orphan user by ID
        const success = await deleteUserById(confirmDelete.userId);
        if (success) {
          toast.success('Usuario orfao deletado!');
          fetchData();
        } else {
          toast.error('Erro ao deletar usuario');
        }
      } else if (confirmDelete.company) {
        // Delete company user by ID if available, otherwise by slug
        let success = false;
        if (confirmDelete.company.wuzapiUser?.id) {
          success = await deleteUserById(confirmDelete.company.wuzapiUser.id);
        } else {
          success = await deleteUser(confirmDelete.company.slug);
        }

        if (success) {
          // Also clear whatsapp_settings in Supabase
          await supabase
            .from('companies')
            .update({ whatsapp_settings: {} })
            .eq('id', confirmDelete.company.id);

          toast.success('Instancia deletada!');
          fetchData();
        } else {
          toast.error('Erro ao deletar instancia');
        }
      }
    } catch (error) {
      toast.error('Erro ao deletar');
    } finally {
      setDeleting(false);
      setConfirmDelete({ open: false, company: null, isOrphan: false, userId: undefined });
    }
  };

  const formatPhone = (phone: string | null): string => {
    if (!phone) return '-';
    // Format: +55 11 99999-9999
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  const getStatusBadge = (company: CompanyWithWhatsApp) => {
    if (!company.wuzapiUser) {
      return <Badge variant="default">Sem instancia</Badge>;
    }
    if (company.wuzapiStatus?.loggedIn) {
      return <Badge variant="success">Conectado</Badge>;
    }
    if (company.wuzapiStatus?.connected) {
      return <Badge variant="warning">Aguardando QR</Badge>;
    }
    return <Badge variant="danger">Desconectado</Badge>;
  };

  const connectedCount = companies.filter((c) => c.wuzapiStatus?.loggedIn).length;
  const totalWithWA = companies.length;

  return (
    <PageContainer
      title="WhatsApp - Instancias"
      subtitle={`${connectedCount} de ${totalWithWA} empresas conectadas`}
      action={
        <Button onClick={fetchData} variant="secondary" loading={loading}>
          <RefreshIcon className="w-4 h-4" />
          Atualizar
        </Button>
      }
    >
      {/* API Status Card */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {apiOnline ? (
              <CloudDoneIcon className="w-6 h-6 text-green-500" />
            ) : (
              <CloudOffIcon className="w-6 h-6 text-red-500" />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                WuzAPI {apiOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getApiUrl()}</p>
            </div>
          </div>
          <Badge variant={apiOnline ? 'success' : 'danger'}>
            {apiOnline ? 'Operacional' : 'Indisponivel'}
          </Badge>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{connectedCount}</p>
              <p className="text-xs text-gray-500">Conectados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <WhatsAppIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalWithWA}</p>
              <p className="text-xs text-gray-500">Configurados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BusinessIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{wuzapiUsers.length}</p>
              <p className="text-xs text-gray-500">Usuarios API</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <ErrorIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orphanUsers.length}</p>
              <p className="text-xs text-gray-500">Orfaos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Companies List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Empresas com WhatsApp
        </h3>

        {loading ? (
          <Card className="p-8">
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
          </Card>
        ) : companies.length === 0 ? (
          <Card className="p-8 text-center">
            <WhatsAppIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma empresa com WhatsApp configurado</p>
          </Card>
        ) : (
          companies.map((company) => (
            <Card key={company.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Company Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <BusinessIcon className="text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {company.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ejym-{company.slug}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusBadge(company)}
                </div>

                {/* Phone */}
                <div className="text-sm text-gray-600 dark:text-gray-300 min-w-[150px]">
                  {company.wuzapiStatus?.loggedIn ? (
                    <div className="flex items-center gap-1">
                      <WhatsAppIcon className="w-4 h-4 text-green-500" />
                      {formatPhone(company.wuzapiStatus.phone)}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {company.wuzapiStatus?.loggedIn ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDisconnect(company)}
                      title="Desconectar"
                    >
                      <LinkOffIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Desconectar</span>
                    </Button>
                  ) : company.wuzapiUser ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleShowQR(company)}
                      title="Gerar QR Code"
                    >
                      <QrCodeIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">QR Code</span>
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" disabled title="Sem instancia">
                      <ErrorIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Sem instancia</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setConfirmDelete({ open: true, company, isOrphan: false })
                    }
                    title="Deletar instancia"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Extra info */}
              {company.wuzapiStatus?.phoneName && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500">
                    Perfil: {company.wuzapiStatus.phoneName}
                  </p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Orphan Users */}
      {orphanUsers.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ErrorIcon className="w-5 h-5 text-orange-500" />
            Usuarios Orfaos
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Usuarios no WuzAPI sem empresa correspondente no sistema
          </p>

          {orphanUsers.map((user) => (
            <Card key={user.name} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{user.token.slice(0, 20)}...</p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setConfirmDelete({
                      open: true,
                      company: null,
                      isOrphan: true,
                      userName: user.name,
                      userId: user.id,
                    })
                  }
                >
                  <DeleteIcon className="w-4 h-4" />
                  Deletar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title={`QR Code - ${qrCompany?.name}`}
      >
        <div className="text-center">
          {qrLoading ? (
            <div className="py-12">
              <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Gerando QR Code...</p>
            </div>
          ) : qrCode ? (
            <>
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="QR Code"
                className="w-64 h-64 mx-auto"
              />
              <div className="mt-4 text-sm text-gray-500 space-y-1">
                <p>1. Abra o WhatsApp no celular</p>
                <p>2. Menu → Dispositivos conectados</p>
                <p>3. Conectar dispositivo</p>
                <p>4. Escaneie este QR Code</p>
              </div>
            </>
          ) : (
            <div className="py-12">
              <ErrorIcon className="w-12 h-12 text-red-400 mx-auto" />
              <p className="mt-4 text-gray-500">Nao foi possivel gerar o QR Code</p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            Fechar
          </Button>
          {qrCode && (
            <Button onClick={() => handleShowQR(qrCompany!)}>
              <RefreshIcon className="w-4 h-4" />
              Novo QR
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Confirm Disconnect Modal */}
      <ConfirmModal
        isOpen={confirmDisconnect.open}
        onClose={() => setConfirmDisconnect({ open: false, company: null })}
        onConfirm={handleConfirmDisconnect}
        title="Desconectar WhatsApp"
        message={`Tem certeza que deseja desconectar o WhatsApp de "${confirmDisconnect.company?.name}"? O numero ${confirmDisconnect.company?.wuzapiStatus?.phone ? '+' + confirmDisconnect.company.wuzapiStatus.phone : ''} sera desvinculado e precisara escanear o QR Code novamente para reconectar.`}
        confirmText="Desconectar"
        variant="danger"
        loading={disconnecting}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, company: null, isOrphan: false })}
        onConfirm={handleConfirmDelete}
        title="Excluir Instancia"
        message={
          confirmDelete.isOrphan
            ? `Tem certeza que deseja excluir o usuario orfao "${confirmDelete.userName}"? Esta acao nao pode ser desfeita.`
            : `Tem certeza que deseja excluir a instancia WhatsApp de "${confirmDelete.company?.name}"? Isso ira desconectar, remover todas as configuracoes e a instancia sera deletada permanentemente.`
        }
        confirmText="Excluir"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}

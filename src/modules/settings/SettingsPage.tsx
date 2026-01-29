import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PrintIcon from '@mui/icons-material/Print';
import RouterIcon from '@mui/icons-material/Router';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SendIcon from '@mui/icons-material/Send';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import GoogleIcon from '@mui/icons-material/Google';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Input, ImageUpload, WhatsAppConnectModal } from '../../components/ui';
import { UpgradePrompt } from '../../components/gates';
import { useTenant } from '../../contexts/TenantContext';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, supabaseUpdatePassword } from '../../services/supabase';
import { uploadCompanyLogo, deleteCompanyLogo, uploadUserAvatar, deleteUserAvatar } from '../../services/storage';
import {
  getConnectionState,
  getSessionStatus,
  disconnectSession,
  sendTextMessage,
  defaultWhatsAppSettings,
  type WhatsAppSettings,
} from '../../services/whatsapp';
import {
  testNetworkConnection,
  validateNetworkConfig,
} from '../../services/print';
import { PrinterHelpButton } from '../../components/print';
import { PrintSettings, defaultPrintSettings } from '../../types';

// Formatar telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
const formatPhoneNumber = (value: string): string => {
  // Remove tudo que nao for numero
  const numbers = value.replace(/\D/g, '');

  // Limita a 11 digitos
  const limited = numbers.slice(0, 11);

  // Formata
  if (limited.length === 0) return '';
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  if (limited.length <= 10) return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
};

// Validar telefone brasileiro
const validatePhoneNumber = (value: string): { valid: boolean; message: string } => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length === 0) {
    return { valid: true, message: '' }; // Vazio e valido (opcional)
  }

  if (numbers.length < 10) {
    return { valid: false, message: 'Numero incompleto' };
  }

  if (numbers.length > 11) {
    return { valid: false, message: 'Numero muito longo' };
  }

  // DDD valido (11-99)
  const ddd = parseInt(numbers.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { valid: false, message: 'DDD invalido' };
  }

  // Celular deve comecar com 9 (11 digitos)
  if (numbers.length === 11 && numbers[2] !== '9') {
    return { valid: false, message: 'Celular deve comecar com 9' };
  }

  // Telefone fixo (10 digitos) ou celular (11 digitos)
  if (numbers.length === 10 || numbers.length === 11) {
    return { valid: true, message: 'Numero valido' };
  }

  return { valid: false, message: 'Formato invalido' };
};

export function SettingsPage() {
  const { currentCompany, isAdmin } = useTenant();
  const { user, profile, session, refreshProfile } = useAuth();
  const { hasFeature, isLoading: loadingFeatures } = usePlanFeatures();

  // Company Logo State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentCompany?.logo_url || null);
  const [savingLogo, setSavingLogo] = useState(false);

  // User Avatar State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || user?.user_metadata?.avatar_url || null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Company Phone/WhatsApp State
  const [companyPhone, setCompanyPhone] = useState(currentCompany?.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  // WhatsApp Automation State (declared early for useEffect)
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings>(defaultWhatsAppSettings);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingWhatsAppSettings, setSavingWhatsAppSettings] = useState(false);
  const [testingMessage, setTestingMessage] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  // Network Printer State
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [savingPrintSettings, setSavingPrintSettings] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [printerTestResult, setPrinterTestResult] = useState<'success' | 'error' | null>(null);

  // Sync avatar preview when profile changes
  useEffect(() => {
    setAvatarPreview(profile?.avatar_url || user?.user_metadata?.avatar_url || null);
  }, [profile?.avatar_url, user?.user_metadata?.avatar_url]);

  // Sync company phone when currentCompany changes
  useEffect(() => {
    setCompanyPhone(currentCompany?.phone || '');
    setLogoPreview(currentCompany?.logo_url || null);

    // Load WhatsApp settings (with migration from old format)
    if (currentCompany?.whatsapp_settings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldSettings = currentCompany.whatsapp_settings as any;
      setWhatsAppSettings({
        ...defaultWhatsAppSettings,
        enabled: Boolean(oldSettings.enabled),
        user_token: String(oldSettings.user_token || ''),
        connected: Boolean(oldSettings.connected),
        connected_at: oldSettings.connected_at || null,
        phone: oldSettings.phone || null,
        phone_name: oldSettings.phone_name || null,
        notify_on_new_order: oldSettings.notify_on_new_order ?? true,
        notify_on_confirm: oldSettings.notify_on_confirm ?? true,
        notify_on_complete: oldSettings.notify_on_complete ?? true,
        notify_on_cancel: oldSettings.notify_on_cancel ?? true,
      });
    } else {
      setWhatsAppSettings(defaultWhatsAppSettings);
    }

    // Load Print settings
    if (currentCompany?.print_settings) {
      setPrintSettings({
        ...defaultPrintSettings,
        ...currentCompany.print_settings,
      });
    } else {
      setPrintSettings(defaultPrintSettings);
    }
  }, [currentCompany]);

  // Check WhatsApp connection status on mount
  useEffect(() => {
    if (!whatsAppSettings.user_token || !whatsAppSettings.enabled) return;

    const checkConnection = async () => {
      setCheckingConnection(true);
      try {
        const state = await getConnectionState(whatsAppSettings.user_token);
        const isConnected = state.state === 'open';

        if (isConnected !== whatsAppSettings.connected) {
          // Update local state
          setWhatsAppSettings((prev) => ({ ...prev, connected: isConnected }));

          // If connected, get phone info
          if (isConnected) {
            const sessionStatus = await getSessionStatus(whatsAppSettings.user_token);
            const phone = sessionStatus.jid?.split('@')[0] || null;
            setWhatsAppSettings((prev) => ({
              ...prev,
              connected: true,
              phone: phone,
              phone_name: sessionStatus.name,
            }));
          }
        }
      } catch (error) {
        console.error('Error checking WhatsApp connection:', error);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkConnection();
  }, [whatsAppSettings.user_token, whatsAppSettings.enabled]);

  // Validacao do telefone
  const phoneValidation = useMemo(() => validatePhoneNumber(companyPhone), [companyPhone]);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check authentication providers (Supabase)
  const authProviders = useMemo(() => {
    if (!user) return { hasPassword: false, hasGoogle: false, providers: [] };

    // Supabase stores the provider in app_metadata.provider or identities
    const identities = user.identities || [];
    const providers = identities.map(i => i.provider);

    return {
      hasPassword: providers.includes('email'),
      hasGoogle: providers.includes('google'),
      providers,
    };
  }, [user]);

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(currentCompany?.logo_url || null);
    }
  };

  const handleSaveLogo = async () => {
    if (!currentCompany) return;

    setSavingLogo(true);

    try {
      let newLogoUrl: string | null = currentCompany.logo_url;

      // Se tem novo arquivo, faz upload
      if (logoFile) {
        // Deleta logo antiga se existir
        if (currentCompany.logo_url) {
          try {
            await deleteCompanyLogo(currentCompany.logo_url);
          } catch (e) {
            console.warn('Erro ao deletar logo antiga:', e);
          }
        }

        const result = await uploadCompanyLogo(logoFile, currentCompany.id);
        newLogoUrl = result.url;
      }

      // Atualiza no banco
      const { error } = await supabase
        .from('companies')
        .update({ logo_url: newLogoUrl })
        .eq('id', currentCompany.id);

      if (error) throw error;

      toast.success('Logo atualizada com sucesso!');
      setLogoFile(null);

      // Recarrega a página para atualizar o contexto
      window.location.reload();
    } catch (error) {
      console.error('Erro ao salvar logo:', error);
      toast.error('Erro ao salvar logo');
    } finally {
      setSavingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentCompany || !currentCompany.logo_url) return;

    setSavingLogo(true);

    try {
      // Deleta do storage
      await deleteCompanyLogo(currentCompany.logo_url);

      // Atualiza no banco
      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', currentCompany.id);

      if (error) throw error;

      toast.success('Logo removida com sucesso!');
      setLogoPreview(null);
      setLogoFile(null);

      // Recarrega a página para atualizar o contexto
      window.location.reload();
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      toast.error('Erro ao remover logo');
    } finally {
      setSavingLogo(false);
    }
  };

  // Avatar handlers
  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview(profile?.avatar_url || user?.user_metadata?.avatar_url || null);
    }
  };

  const handleSaveAvatar = async () => {
    if (!profile || !avatarFile) return;

    setSavingAvatar(true);

    try {
      // Deleta avatar antigo se existir (apenas se for do Supabase)
      if (profile.avatar_url && profile.avatar_url.includes('supabase.co')) {
        try {
          await deleteUserAvatar(profile.avatar_url);
        } catch (e) {
          console.warn('Erro ao deletar avatar antigo:', e);
        }
      }

      const result = await uploadUserAvatar(avatarFile, profile.id);

      // Atualiza no banco
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Foto de perfil atualizada!');
      setAvatarFile(null);
      await refreshProfile();
    } catch (error) {
      console.error('Erro ao salvar avatar:', error);
      toast.error('Erro ao salvar foto de perfil');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile || !profile.avatar_url) return;

    // Nao permite remover se for foto do Google (usuario pode nao ter como voltar)
    if (!profile.avatar_url.includes('supabase.co')) {
      toast.error('Nao e possivel remover a foto do Google');
      return;
    }

    setSavingAvatar(true);

    try {
      await deleteUserAvatar(profile.avatar_url);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Foto de perfil removida!');
      setAvatarPreview(user?.user_metadata?.avatar_url || null);
      setAvatarFile(null);
      await refreshProfile();
    } catch (error) {
      console.error('Erro ao remover avatar:', error);
      toast.error('Erro ao remover foto de perfil');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSavePhone = async () => {
    if (!currentCompany) return;

    setSavingPhone(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({ phone: companyPhone.trim() || null })
        .eq('id', currentCompany.id);

      if (error) throw error;

      toast.success('Telefone atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar telefone:', error);
      toast.error('Erro ao salvar telefone');
    } finally {
      setSavingPhone(false);
    }
  };

  // WhatsApp Automation Functions
  const handleWhatsAppConnected = async (info: { phone: string; name: string; token: string }) => {
    if (!currentCompany) return;

    const newSettings: WhatsAppSettings = {
      ...whatsAppSettings,
      enabled: true,
      provider: 'wuzapi',
      user_token: info.token,
      connected: true,
      connected_at: new Date().toISOString(),
      phone: info.phone,
      phone_name: info.name,
    };

    setWhatsAppSettings(newSettings);

    // Format phone for display (remove country code if present)
    const formattedPhone = info.phone.startsWith('55')
      ? formatPhoneNumber(info.phone.slice(2))
      : formatPhoneNumber(info.phone);

    // Update local phone state to show the connected number
    setCompanyPhone(formattedPhone);

    // Save to database (both whatsapp_settings and phone)
    try {
      await supabase
        .from('companies')
        .update({
          whatsapp_settings: newSettings,
          phone: formattedPhone, // Sync phone with connected WhatsApp
        })
        .eq('id', currentCompany.id);

      toast.success('WhatsApp conectado! O numero foi sincronizado automaticamente.');
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!currentCompany || !whatsAppSettings.user_token) return;

    setDisconnecting(true);

    try {
      const success = await disconnectSession(whatsAppSettings.user_token);

      if (success) {
        const newSettings: WhatsAppSettings = {
          ...whatsAppSettings,
          connected: false,
          connected_at: null,
          phone: null,
          phone_name: null,
        };

        setWhatsAppSettings(newSettings);

        // Save to database
        await supabase
          .from('companies')
          .update({ whatsapp_settings: newSettings })
          .eq('id', currentCompany.id);

        toast.success('WhatsApp desconectado com sucesso!');
      } else {
        toast.error('Erro ao desconectar WhatsApp');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error('Erro ao desconectar WhatsApp');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveWhatsAppSettings = async () => {
    if (!currentCompany) return;

    setSavingWhatsAppSettings(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({ whatsapp_settings: whatsAppSettings })
        .eq('id', currentCompany.id);

      if (error) throw error;

      toast.success('Configuracoes de WhatsApp salvas!');
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setSavingWhatsAppSettings(false);
    }
  };

  const handleTestMessage = async () => {
    if (!currentCompany || !testPhone || !whatsAppSettings.user_token) return;

    const phoneNumbers = testPhone.replace(/\D/g, '');
    if (phoneNumbers.length < 10) {
      toast.error('Digite um numero de telefone valido');
      return;
    }

    setTestingMessage(true);

    try {
      const result = await sendTextMessage(
        whatsAppSettings.user_token,
        phoneNumbers,
        `Teste de mensagem automatica do *${currentCompany.name}*!\n\nSe voce recebeu esta mensagem, a integracao com WhatsApp esta funcionando corretamente.`
      );

      if (result.success) {
        toast.success('Mensagem de teste enviada!');
        setTestPhone('');
      } else {
        toast.error(result.error || 'Erro ao enviar mensagem de teste');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setTestingMessage(false);
    }
  };

  // Network Printer Handlers
  const handleTestPrinter = async () => {
    const validation = validateNetworkConfig(printSettings);
    if (!validation.valid) {
      toast.error(validation.error || 'Configuracao invalida');
      return;
    }

    setTestingPrinter(true);
    setPrinterTestResult(null);

    try {
      const result = await testNetworkConnection({
        ip: printSettings.ip,
        port: printSettings.port,
        timeout_ms: printSettings.timeout_ms,
      });

      if (result.success) {
        setPrinterTestResult('success');
        toast.success(`Conectado! (${result.connection_time_ms}ms)`);
      } else {
        setPrinterTestResult('error');
        toast.error(result.error || 'Erro ao conectar');
      }
    } catch (error) {
      setPrinterTestResult('error');
      toast.error('Erro ao testar conexao');
    } finally {
      setTestingPrinter(false);
    }
  };

  const handleSavePrintSettings = async () => {
    if (!currentCompany) return;

    setSavingPrintSettings(true);

    try {
      const settingsToSave = printSettings.enabled ? {
        ...printSettings,
        last_connected_at: printerTestResult === 'success' ? new Date().toISOString() : printSettings.last_connected_at,
      } : null;

      const { error } = await supabase
        .from('companies')
        .update({ print_settings: settingsToSave })
        .eq('id', currentCompany.id);

      if (error) throw error;

      toast.success('Configuracoes de impressora salvas!');
    } catch (error) {
      console.error('Erro ao salvar configuracoes:', error);
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setSavingPrintSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !session) {
      toast.error('Usuario nao autenticado');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao coincidem');
      return;
    }

    setChangingPassword(true);

    try {
      // Super admin pode alterar senha sem confirmar a atual
      const isSuperAdmin = profile?.is_super_admin === true;

      if (!isSuperAdmin) {
        // Usuarios normais: verifica senha atual fazendo sign in
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword,
        });

        if (verifyError) {
          toast.error('Senha atual incorreta');
          setChangingPassword(false);
          return;
        }
      }

      // Atualizar a senha
      await supabaseUpdatePassword(newPassword);

      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      console.error('Erro ao alterar senha:', error);

      const supabaseError = error as { message?: string };
      if (supabaseError.message?.includes('Invalid login credentials')) {
        toast.error('Senha atual incorreta');
      } else {
        toast.error('Erro ao alterar senha');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (!currentCompany) {
    return (
      <PageContainer title="Configuracoes">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Selecione uma empresa para ver as configuracoes
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Configuracoes"
      subtitle="Gerencie as configuracoes da empresa e sua conta"
    >
      <div className="space-y-6">
        {/* Company Settings - Admin Only */}
        {isAdmin && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <BusinessIcon className="text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Configuracoes da Empresa
                </h2>
                <p className="text-sm text-gray-500">
                  Personalize a aparencia da sua empresa
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Logo Upload - Lateral */}
              <div className="flex-shrink-0">
                <ImageUpload
                  label="Logo da Empresa"
                  value={logoPreview}
                  onChange={handleLogoChange}
                  showRemoveButton={false}
                  compact
                />
              </div>

              {/* Informações e Ações */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    A logo sera exibida no catalogo publico e nos relatorios.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Recomendado: imagem quadrada (200x200px ou maior). Formatos: PNG, JPG ou WebP.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <Button
                    onClick={handleSaveLogo}
                    loading={savingLogo}
                    disabled={!logoFile}
                  >
                    Salvar Logo
                  </Button>
                  {currentCompany.logo_url && (
                    <Button
                      variant="secondary"
                      onClick={handleRemoveLogo}
                      loading={savingLogo}
                    >
                      Remover Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* User Avatar - All Users */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <PersonIcon className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Foto de Perfil
              </h2>
              <p className="text-sm text-gray-500">
                Personalize sua foto de perfil
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar Preview */}
            <div className="flex-shrink-0">
              <ImageUpload
                label="Sua Foto"
                value={avatarPreview}
                onChange={handleAvatarChange}
                showRemoveButton={false}
                compact
                rounded
              />
            </div>

            {/* Info and Actions */}
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {user?.user_metadata?.avatar_url && !profile?.avatar_url?.includes('supabase.co') && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <GoogleIcon className="w-4 h-4 text-red-500" />
                    <span>Usando foto do Google</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  A foto sera exibida no cabecalho e em suas atividades.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Recomendado: imagem quadrada (200x200px ou maior). Formatos: PNG, JPG ou WebP.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  onClick={handleSaveAvatar}
                  loading={savingAvatar}
                  disabled={!avatarFile}
                >
                  Salvar Foto
                </Button>
                {profile?.avatar_url?.includes('supabase.co') && (
                  <Button
                    variant="secondary"
                    onClick={handleRemoveAvatar}
                    loading={savingAvatar}
                  >
                    Remover Foto
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* WhatsApp Unificado - Admin Only + Plano Pago */}
        {isAdmin && (
          hasFeature('whatsapp_notifications') ? (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <WhatsAppIcon className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  WhatsApp da Empresa
                </h2>
                <p className="text-sm text-gray-500">
                  Configure como os clientes recebem atualizacoes dos pedidos
                </p>
              </div>
            </div>

            {/* Mode Selector - Visual indicator of current mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Automatic Mode Card */}
              <div className={`relative p-4 rounded-xl border-2 transition-all ${
                whatsAppSettings.connected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    whatsAppSettings.connected
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    <AutoModeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm ${
                        whatsAppSettings.connected
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        Modo Automatico
                      </p>
                      {whatsAppSettings.connected && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-500 text-white rounded-full">
                          ATIVO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {whatsAppSettings.connected
                        ? 'Mensagens enviadas automaticamente'
                        : 'Conecte seu WhatsApp para ativar'
                      }
                    </p>
                  </div>
                </div>
                {whatsAppSettings.connected && (
                  <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-green-500" />
                )}
              </div>

              {/* Manual Mode Card */}
              <div className={`relative p-4 rounded-xl border-2 transition-all ${
                !whatsAppSettings.connected && companyPhone
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    !whatsAppSettings.connected && companyPhone
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    <TouchAppIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold text-sm ${
                        !whatsAppSettings.connected && companyPhone
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        Modo Manual
                      </p>
                      {!whatsAppSettings.connected && companyPhone && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full">
                          ATIVO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {whatsAppSettings.connected
                        ? 'Desativado (usando automatico)'
                        : companyPhone
                          ? 'Cliente envia mensagem manualmente'
                          : 'Configure um numero de fallback'
                      }
                    </p>
                  </div>
                </div>
                {!whatsAppSettings.connected && companyPhone && (
                  <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-amber-500" />
                )}
              </div>
            </div>

            {/* Connected Status - When automation is active */}
            {whatsAppSettings.connected ? (
              <div className="space-y-6">
                {/* Connection Info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        WhatsApp Conectado
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <PhoneIphoneIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-300">
                          {whatsAppSettings.phone_name && (
                            <span className="font-medium">{whatsAppSettings.phone_name} - </span>
                          )}
                          {whatsAppSettings.phone ? formatPhoneNumber(whatsAppSettings.phone.replace('55', '')) : 'Numero conectado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDisconnectWhatsApp}
                    loading={disconnecting}
                    icon={<LinkOffIcon />}
                  >
                    Desconectar
                  </Button>
                </div>

                {/* Info about automatic mode */}
                <div className="flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <InfoOutlinedIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Como funciona o Modo Automatico:</p>
                    <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-300">
                      <li>• Cliente faz pedido no catalogo e recebe confirmacao automatica</li>
                      <li>• Voce recebe notificacao de novo pedido no WhatsApp</li>
                      <li>• Cliente e notificado a cada mudanca de status do pedido</li>
                    </ul>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Notificacoes Automaticas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Novo Pedido */}
                    <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      whatsAppSettings.notify_on_new_order
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        checked={whatsAppSettings.notify_on_new_order}
                        onChange={(e) => setWhatsAppSettings((prev) => ({
                          ...prev,
                          notify_on_new_order: e.target.checked,
                        }))}
                        className="sr-only"
                      />
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        whatsAppSettings.notify_on_new_order
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <NotificationsActiveIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          whatsAppSettings.notify_on_new_order
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          Novo Pedido Recebido
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Cliente recebe confirmacao, empresa e notificada
                        </p>
                      </div>
                      {whatsAppSettings.notify_on_new_order && (
                        <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-green-500" />
                      )}
                    </label>

                    {/* Pedido Confirmado */}
                    <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      whatsAppSettings.notify_on_confirm
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        checked={whatsAppSettings.notify_on_confirm}
                        onChange={(e) => setWhatsAppSettings((prev) => ({
                          ...prev,
                          notify_on_confirm: e.target.checked,
                        }))}
                        className="sr-only"
                      />
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        whatsAppSettings.notify_on_confirm
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <InventoryIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          whatsAppSettings.notify_on_confirm
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          Pedido Confirmado
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Cliente informado que o pedido foi aceito
                        </p>
                      </div>
                      {whatsAppSettings.notify_on_confirm && (
                        <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-blue-500" />
                      )}
                    </label>

                    {/* Pedido Entregue */}
                    <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      whatsAppSettings.notify_on_complete
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        checked={whatsAppSettings.notify_on_complete}
                        onChange={(e) => setWhatsAppSettings((prev) => ({
                          ...prev,
                          notify_on_complete: e.target.checked,
                        }))}
                        className="sr-only"
                      />
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        whatsAppSettings.notify_on_complete
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <LocalShippingIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          whatsAppSettings.notify_on_complete
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          Pedido Entregue
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Cliente notificado da entrega/finalizacao
                        </p>
                      </div>
                      {whatsAppSettings.notify_on_complete && (
                        <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-emerald-500" />
                      )}
                    </label>

                    {/* Pedido Cancelado */}
                    <label className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      whatsAppSettings.notify_on_cancel
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        checked={whatsAppSettings.notify_on_cancel}
                        onChange={(e) => setWhatsAppSettings((prev) => ({
                          ...prev,
                          notify_on_cancel: e.target.checked,
                        }))}
                        className="sr-only"
                      />
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        whatsAppSettings.notify_on_cancel
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <CancelIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          whatsAppSettings.notify_on_cancel
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          Pedido Cancelado
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Cliente informado sobre o cancelamento
                        </p>
                      </div>
                      {whatsAppSettings.notify_on_cancel && (
                        <CheckCircleIcon className="absolute top-2 right-2 w-5 h-5 text-red-500" />
                      )}
                    </label>
                  </div>

                  <Button
                    className="mt-4"
                    onClick={handleSaveWhatsAppSettings}
                    loading={savingWhatsAppSettings}
                  >
                    Salvar Configuracoes
                  </Button>
                </div>

                {/* Test Message */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Testar Envio de Mensagem
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                    <Input
                      placeholder="(11) 99999-9999"
                      value={testPhone}
                      onChange={(e) => setTestPhone(formatPhoneNumber(e.target.value))}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTestMessage}
                      loading={testingMessage}
                      disabled={!testPhone || testPhone.replace(/\D/g, '').length < 10}
                      icon={<SendIcon />}
                    >
                      Enviar Teste
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Envie uma mensagem de teste para verificar se a integracao esta funcionando.
                  </p>
                </div>
              </div>
            ) : (
              /* Not Connected - Show manual mode and connect option */
              <div className="space-y-6">
                {/* Connect Button and Benefits */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                        <AutoModeIcon className="w-5 h-5" />
                        Ative o Modo Automatico
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Conecte seu WhatsApp e envie notificacoes automaticas para seus clientes.
                        Sem precisar enviar mensagens manualmente!
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowConnectModal(true)}
                      loading={checkingConnection}
                      icon={<WhatsAppIcon />}
                      className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                    >
                      Conectar WhatsApp
                    </Button>
                  </div>
                </div>

                {/* Manual Mode Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TouchAppIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Numero de Contato (Modo Manual)
                    </h3>
                  </div>

                  <div className="flex gap-3 p-4 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <InfoOutlinedIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium">Como funciona o Modo Manual:</p>
                      <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                        <li>• Cliente finaliza pedido no catalogo</li>
                        <li>• Aparece um botao para o cliente abrir o WhatsApp</li>
                        <li>• Cliente envia mensagem manualmente para voce</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <Input
                      label="Telefone/WhatsApp da Empresa"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(formatPhoneNumber(e.target.value))}
                      placeholder="(11) 99999-9999"
                      error={phoneValidation.message && !phoneValidation.valid ? phoneValidation.message : undefined}
                      helperText="Este numero aparece para o cliente entrar em contato"
                      rightIcon={
                        companyPhone ? (
                          phoneValidation.valid ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          ) : (
                            <ErrorIcon className="w-5 h-5 text-red-500" />
                          )
                        ) : undefined
                      }
                    />

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleSavePhone}
                        loading={savingPhone}
                        disabled={
                          !phoneValidation.valid ||
                          companyPhone === (currentCompany?.phone || '') ||
                          (companyPhone !== '' && companyPhone.replace(/\D/g, '').length < 10)
                        }
                      >
                        Salvar Numero
                      </Button>

                      {companyPhone && phoneValidation.valid && companyPhone.replace(/\D/g, '').length >= 10 && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const numbers = companyPhone.replace(/\D/g, '');
                            const whatsappUrl = `https://wa.me/55${numbers}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                          Testar Link
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
          ) : (
            <UpgradePrompt feature="whatsapp_notifications" />
          )
        )}

        {/* Network Printer Settings - Admin Only */}
        {isAdmin && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <PrintIcon className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Impressora de Rede
                </h2>
                <p className="text-sm text-gray-500">
                  Configure uma impressora termica via IP/Rede
                </p>
              </div>
              <PrinterHelpButton />
            </div>

            {/* Enable Toggle */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printSettings.enabled}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  Ativar impressora de rede
                </span>
              </label>
            </div>

            {printSettings.enabled && (
              <div className="space-y-4">
                {/* Printer Name */}
                <Input
                  label="Nome da Impressora"
                  value={printSettings.printer_name}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, printer_name: e.target.value }))}
                  placeholder="Ex: Impressora Cozinha"
                  helperText="Nome para identificar esta impressora"
                />

                {/* IP and Port */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Endereco IP"
                    value={printSettings.ip}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, ip: e.target.value }))}
                    placeholder="192.168.1.100"
                    leftIcon={<RouterIcon className="w-5 h-5" />}
                  />
                  <Input
                    label="Porta"
                    type="number"
                    value={printSettings.port.toString()}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, port: parseInt(e.target.value) || 9100 }))}
                    placeholder="9100"
                    helperText="Padrao: 9100"
                  />
                </div>

                {/* Paper Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Largura do Papel
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paper_width"
                        value="58mm"
                        checked={printSettings.paper_width === '58mm'}
                        onChange={(e) => setPrintSettings(prev => ({ ...prev, paper_width: e.target.value as '58mm' | '80mm' }))}
                        className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">58mm (Bobina pequena)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paper_width"
                        value="80mm"
                        checked={printSettings.paper_width === '80mm'}
                        onChange={(e) => setPrintSettings(prev => ({ ...prev, paper_width: e.target.value as '58mm' | '80mm' }))}
                        className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">80mm (Bobina padrao)</span>
                    </label>
                  </div>
                </div>

                {/* Auto Cut */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSettings.auto_cut}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, auto_cut: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Cortar papel automaticamente apos impressao
                  </span>
                </label>

                {/* Print Logo */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSettings.print_logo ?? true}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, print_logo: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Imprimir logo da empresa no comprovante
                  </span>
                </label>

                {/* Auto Print */}
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printSettings.auto_print ?? false}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, auto_print: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Impressao automatica
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Imprimir comprovante automaticamente ao finalizar venda
                      </p>
                    </div>
                  </label>
                </div>

                {/* Connection Status */}
                {printerTestResult && (
                  <div className={`p-3 rounded-lg ${
                    printerTestResult === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {printerTestResult === 'success' ? (
                        <>
                          <CheckCircleIcon className="w-5 h-5" />
                          <span>Impressora conectada com sucesso!</span>
                        </>
                      ) : (
                        <>
                          <ErrorIcon className="w-5 h-5" />
                          <span>Falha ao conectar. Verifique IP e porta.</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Test Connection and Save */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="secondary"
                    onClick={handleTestPrinter}
                    loading={testingPrinter}
                    disabled={!printSettings.ip}
                    icon={printerTestResult === 'success' ? <CheckCircleIcon className="text-green-500" /> : <RouterIcon />}
                  >
                    {testingPrinter ? 'Testando...' : 'Testar Conexao'}
                  </Button>
                  <Button
                    onClick={handleSavePrintSettings}
                    loading={savingPrintSettings}
                  >
                    Salvar Configuracoes
                  </Button>
                </div>

                {/* Last connected info */}
                {printSettings.last_connected_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ultima conexao: {new Date(printSettings.last_connected_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Password Change - All Users */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <LockIcon className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {authProviders.hasPassword ? 'Alterar Senha' : 'Configurar Senha'}
              </h2>
              <p className="text-sm text-gray-500">
                {authProviders.hasPassword
                  ? 'Atualize sua senha de acesso'
                  : 'Crie uma senha para acessar com email'
                }
              </p>
            </div>
          </div>

          {/* Status dos providers */}
          <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Metodos de login vinculados:
            </p>
            <div className="flex flex-wrap gap-2">
              {authProviders.hasGoogle && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                  <GoogleIcon className="w-4 h-4 text-red-500" />
                  Google
                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                </span>
              )}
              {authProviders.hasPassword ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                  <LockIcon className="w-4 h-4 text-purple-500" />
                  Email/Senha
                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                  <LockIcon className="w-4 h-4" />
                  Email/Senha
                  <span className="text-amber-600 dark:text-amber-400">(nao configurado)</span>
                </span>
              )}
            </div>
          </div>

          {authProviders.hasPassword ? (
            /* Form para alterar senha existente */
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              {/* Super admin nao precisa informar senha atual */}
              {!profile?.is_super_admin && (
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Senha Atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  leftIcon={<LockIcon className="w-5 h-5" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showCurrentPassword ? (
                        <VisibilityOffIcon className="w-5 h-5" />
                      ) : (
                        <VisibilityIcon className="w-5 h-5" />
                      )}
                    </button>
                  }
                  required
                />
              )}

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
                disabled={(!profile?.is_super_admin && !currentPassword) || !newPassword || !confirmPassword}
              >
                Alterar Senha
              </Button>
            </form>
          ) : (
            /* Mensagem para usuarios sem senha (apenas Google) */
            <div className="max-w-md">
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <div className="flex gap-3">
                  <GoogleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Voce usa apenas login com Google
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Para adicionar uma senha ao seu email ({user?.email}),
                      use a opcao "Esqueci minha senha" na tela de login.
                      Um link sera enviado para criar sua senha.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Com uma senha configurada, voce podera fazer login tanto com Google quanto com email/senha.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* WhatsApp Connect Modal */}
      {currentCompany && (
        <WhatsAppConnectModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          companySlug={currentCompany.slug}
          companyName={currentCompany.name}
          userToken={whatsAppSettings.user_token}
          onConnected={handleWhatsAppConnected}
        />
      )}
    </PageContainer>
  );
}

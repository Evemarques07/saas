import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import BusinessIcon from '@mui/icons-material/Business';
import LockIcon from '@mui/icons-material/Lock';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, Button, Input, ImageUpload } from '../../components/ui';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { uploadCompanyLogo, deleteCompanyLogo } from '../../services/storage';
import { auth } from '../../services/firebase';

export function SettingsPage() {
  const { currentCompany, isAdmin } = useTenant();
  const { user } = useAuth();

  // Company Logo State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentCompany?.logo_url || null);
  const [savingLogo, setSavingLogo] = useState(false);

  // Company Phone/WhatsApp State
  const [companyPhone, setCompanyPhone] = useState(currentCompany?.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  // Sync company phone when currentCompany changes
  useEffect(() => {
    setCompanyPhone(currentCompany?.phone || '');
    setLogoPreview(currentCompany?.logo_url || null);
  }, [currentCompany]);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !auth.currentUser) {
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
      // Reautenticar o usuario (necessario para mudar senha)
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );

      await reauthenticateWithCredential(auth.currentUser, credential);

      // Atualizar a senha
      await updatePassword(auth.currentUser, newPassword);

      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      console.error('Erro ao alterar senha:', error);

      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/wrong-password') {
        toast.error('Senha atual incorreta');
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        toast.error('Por favor, faca login novamente antes de alterar a senha');
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

            <div className="space-y-4">
              <ImageUpload
                label="Logo da Empresa"
                value={logoPreview}
                onChange={handleLogoChange}
                helperText="Recomendado: imagem quadrada (200x200px ou maior)"
              />

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveLogo}
                  loading={savingLogo}
                  disabled={!logoFile}
                >
                  Salvar Logo
                </Button>
                {currentCompany.logo_url && (
                  <Button
                    variant="danger"
                    onClick={handleRemoveLogo}
                    loading={savingLogo}
                  >
                    Remover Logo
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* WhatsApp / Phone Settings - Admin Only */}
        {isAdmin && (
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
                  Telefone para receber pedidos do catalogo
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-md">
              <Input
                label="Telefone/WhatsApp"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                helperText="Este numero recebera os pedidos do catalogo via WhatsApp"
              />

              <Button
                onClick={handleSavePhone}
                loading={savingPhone}
                disabled={companyPhone === (currentCompany?.phone || '')}
              >
                Salvar Telefone
              </Button>
            </div>
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
                Alterar Senha
              </h2>
              <p className="text-sm text-gray-500">
                Atualize sua senha de acesso
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
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
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Alterar Senha
            </Button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}

import { useState } from 'react';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import LoginIcon from '@mui/icons-material/Login';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Modal, ModalFooter, Button, Input } from '../../../components/ui';
import { useCatalogCustomer } from '../../../contexts/CatalogCustomerContext';
import toast from 'react-hot-toast';

interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CustomerLoginModal({ isOpen, onClose, onSuccess }: CustomerLoginModalProps) {
  const { login } = useCatalogCustomer();
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format phone as user types
  const formatPhoneInput = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  // Format CPF as user types
  const formatCpfInput = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneInput(e.target.value));
    setError(null);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpfInput(e.target.value));
    setError(null);
  };

  const isValidPhone = phone.replace(/\D/g, '').length >= 10;
  const isValidCpf = cpf.replace(/\D/g, '').length === 11;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidPhone) {
      setError('Informe um telefone válido');
      return;
    }

    if (!isValidCpf) {
      setError('Informe um CPF válido');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await login(phone, cpf);

    setLoading(false);

    if (result.success) {
      toast.success('Login realizado com sucesso!');
      handleClose();
      onSuccess?.();
    } else {
      setError(result.error || 'Erro ao fazer login');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPhone('');
      setCpf('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Entrar na sua conta">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Para acessar sua conta, informe o telefone e CPF cadastrados durante um pedido anterior.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <ErrorOutlineIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Telefone"
            placeholder="(85) 99999-9999"
            value={phone}
            onChange={handlePhoneChange}
            leftIcon={<PhoneIcon className="w-5 h-5" />}
            maxLength={16}
            required
          />

          <Input
            label="CPF"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={handleCpfChange}
            leftIcon={<BadgeIcon className="w-5 h-5" />}
            maxLength={14}
            required
          />

          <div className="pt-2 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Ainda não tem cadastro? Faça um pedido marcando a opção "Quero me cadastrar para próximas compras"
              e informe seu CPF.
            </p>
          </div>
        </div>

        <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={<LoginIcon />}
            disabled={!isValidPhone || !isValidCpf}
          >
            Entrar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

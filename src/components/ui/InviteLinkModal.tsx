import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

interface InviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink: string;
  email: string;
}

export function InviteLinkModal({ isOpen, onClose, inviteLink, email }: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Convite Criado" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          O convite para <strong>{email}</strong> foi criado com sucesso.
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Link de Convite
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200"
            />
            <Button
              variant={copied ? 'primary' : 'secondary'}
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <ContentCopyIcon className="w-4 h-4" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Envie este link para o usuario por WhatsApp, email ou outro meio.
          O convite expira em 7 dias.
        </p>
      </div>

      <ModalFooter>
        <Button onClick={handleClose}>
          Fechar
        </Button>
      </ModalFooter>
    </Modal>
  );
}

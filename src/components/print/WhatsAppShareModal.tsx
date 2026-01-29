/**
 * WhatsAppShareModal Component
 * Modal for sharing receipt via WhatsApp (text or image)
 */

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Modal, ModalFooter, Button } from '../ui';
import { InlineReceiptPreview } from './PrintPreview';
import { Sale, Company } from '../../types';
import { getReceiptText } from '../../services/print';
import { sendTextMessage, sendImageMessage } from '../../services/whatsapp';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { UpgradePrompt } from '../gates/UpgradePrompt';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  company: Company;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type ShareMode = 'text' | 'image';

export function WhatsAppShareModal({
  isOpen,
  onClose,
  sale,
  company,
  onSuccess,
  onError,
}: WhatsAppShareModalProps) {
  const [mode, setMode] = useState<ShareMode>('text');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const { hasFeature, isLoading: loadingFeatures } = usePlanFeatures();
  const hasWhatsAppFeature = hasFeature('whatsapp_notifications');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSent(false);
      setMode('text');
    }
  }, [isOpen]);

  const phone = sale.customer_phone || sale.customer?.phone;
  const customerName = sale.customer?.name || sale.customer_name || 'Cliente';

  const whatsappSettings = company.whatsapp_settings;
  const isWhatsAppConnected = whatsappSettings?.enabled && whatsappSettings?.connected;
  const userToken = whatsappSettings?.user_token;

  const handleSend = async () => {
    if (!phone || !userToken) return;

    setSending(true);

    try {
      let result;

      if (mode === 'text') {
        // Send as formatted text
        const text = getReceiptText(sale, company);
        result = await sendTextMessage(userToken, phone, text);
      } else {
        // Generate image from receipt preview
        if (!receiptRef.current) {
          throw new Error('Erro ao gerar imagem do comprovante');
        }

        const canvas = await html2canvas(receiptRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const imageBase64 = canvas.toDataURL('image/png');
        const caption = `Comprovante de Venda #${sale.id.slice(0, 8).toUpperCase()}`;

        result = await sendImageMessage(userToken, phone, imageBase64, caption);
      }

      if (result.success) {
        setSent(true);
        onSuccess?.();
        // Close after showing success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        onError?.(result.error || 'Erro ao enviar');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  // Show upgrade prompt if feature not available
  if (!loadingFeatures && !hasWhatsAppFeature) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Enviar via WhatsApp"
        size="md"
      >
        <UpgradePrompt feature="whatsapp_notifications" />
      </Modal>
    );
  }

  // Show warning if WhatsApp not connected
  if (!isWhatsAppConnected) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Enviar via WhatsApp"
        size="md"
      >
        <div className="text-center py-6">
          <WhatsAppIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            WhatsApp nao conectado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Conecte seu WhatsApp nas configuracoes para enviar comprovantes.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              // Navigate to settings
              window.location.href = `/app/${company.slug}/configuracoes`;
            }}
          >
            Ir para Configuracoes
          </Button>
        </div>
      </Modal>
    );
  }

  // Show success state
  if (sent) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Enviado!"
        size="sm"
      >
        <div className="text-center py-8">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Comprovante enviado!
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Enviado para {customerName}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar via WhatsApp"
      size="lg"
    >
      <div className="space-y-4">
        {/* Recipient info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <WhatsAppIcon className="w-8 h-8 text-green-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {customerName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {phone}
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Formato do envio
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                ${mode === 'text'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }
              `}
            >
              <TextFieldsIcon className={`w-6 h-6 ${mode === 'text' ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className={`font-medium ${mode === 'text' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  Texto
                </p>
                <p className="text-xs text-gray-500">
                  Mais rapido
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('image')}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                ${mode === 'image'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }
              `}
            >
              <ImageIcon className={`w-6 h-6 ${mode === 'image' ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="text-left">
                <p className={`font-medium ${mode === 'image' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  Imagem
                </p>
                <p className="text-xs text-gray-500">
                  Visual bonito
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preview
          </label>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {mode === 'text' ? (
              <pre className="p-4 text-xs whitespace-pre-wrap font-mono bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                {getReceiptText(sale, company)}
              </pre>
            ) : (
              <div className="p-4 bg-white" ref={receiptRef}>
                <InlineReceiptPreview
                  sale={sale}
                  company={company}
                  paperWidth="80mm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={sending}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSend}
          loading={sending}
          className="bg-green-600 hover:bg-green-700"
        >
          <WhatsAppIcon className="w-4 h-4 mr-2" />
          {sending ? 'Enviando...' : 'Enviar'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

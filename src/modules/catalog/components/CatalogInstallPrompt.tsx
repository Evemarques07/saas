import { useState, useEffect } from 'react';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxIcon from '@mui/icons-material/AddBox';
import { Company } from '../../../types';
import { Modal, Button } from '../../../components/ui';

interface CatalogInstallPromptProps {
  company: Company;
  isInstallable: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
  showIOSInstructions: boolean;
  onCloseIOSInstructions: () => void;
}

// Storage key for dismissal
const getDismissKey = (slug: string) => `ejym_pwa_dismissed_${slug}`;

export function CatalogInstallPrompt({
  company,
  isInstallable,
  isIOS,
  onInstall,
  showIOSInstructions,
  onCloseIOSInstructions,
}: CatalogInstallPromptProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);

  // Check if user has dismissed the prompt before
  useEffect(() => {
    const dismissKey = getDismissKey(company.slug);
    const dismissed = localStorage.getItem(dismissKey);

    // Show prompt if not dismissed or dismissed more than 7 days ago
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      setIsDismissed(daysSinceDismissed < 7);
    } else {
      setIsDismissed(false);
    }
  }, [company.slug]);

  const handleDismiss = () => {
    const dismissKey = getDismissKey(company.slug);
    localStorage.setItem(dismissKey, new Date().toISOString());
    setIsDismissed(true);
  };

  const handleInstall = async () => {
    setInstalling(true);
    await onInstall();
    setInstalling(false);
  };

  // Don't show if not installable or dismissed
  if (!isInstallable || isDismissed) {
    // Still show iOS instructions modal if open
    if (showIOSInstructions) {
      return (
        <IOSInstructionsModal
          company={company}
          isOpen={showIOSInstructions}
          onClose={onCloseIOSInstructions}
        />
      );
    }
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header with close button */}
          <div className="flex items-start gap-3 p-4">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {company.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Instalar {company.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Adicione à tela inicial para acesso rápido
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Fechar"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Action button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-xl transition-colors"
            >
              {installing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Instalando...</span>
                </>
              ) : (
                <>
                  <GetAppIcon className="w-5 h-5" />
                  <span>Instalar App</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      <IOSInstructionsModal
        company={company}
        isOpen={showIOSInstructions}
        onClose={onCloseIOSInstructions}
      />

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// iOS Instructions Modal Component
interface IOSInstructionsModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

function IOSInstructionsModal({ company, isOpen, onClose }: IOSInstructionsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Instalar no iPhone/iPad">
      <div className="space-y-4">
        {/* Company info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-xl font-bold text-primary-600">{company.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{company.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Adicionar à Tela de Início</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Siga os passos abaixo para instalar o app:
          </p>

          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">1</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Toque no botão compartilhar
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <IosShareIcon className="w-4 h-4" /> na barra inferior do Safari
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">2</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Role para baixo e toque em
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <AddBoxIcon className="w-4 h-4" /> "Adicionar à Tela de Início"
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">3</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Toque em "Adicionar"
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                no canto superior direito
              </p>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Importante:</strong> Use o Safari para instalar o app. Outros navegadores no iOS
            não suportam esta funcionalidade.
          </p>
        </div>
      </div>

      <div className="mt-6 -mx-6 -mb-4 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <Button variant="secondary" onClick={onClose} className="w-full">
          Entendi
        </Button>
      </div>
    </Modal>
  );
}

// Mini install button for header (optional)
interface CatalogInstallButtonProps {
  isInstallable: boolean;
  onInstall: () => Promise<boolean>;
}

export function CatalogInstallButton({ isInstallable, onInstall }: CatalogInstallButtonProps) {
  const [installing, setInstalling] = useState(false);

  if (!isInstallable) return null;

  const handleClick = async () => {
    setInstalling(true);
    await onInstall();
    setInstalling(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={installing}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50"
      title="Instalar App"
    >
      {installing ? (
        <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
      ) : (
        <GetAppIcon className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Instalar</span>
    </button>
  );
}

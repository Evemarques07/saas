import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloseIcon from '@mui/icons-material/Close';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useTheme } from '../../contexts/ThemeContext';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, showPrompt, installApp, dismissPrompt } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const location = useLocation();
  const { theme } = useTheme();

  // Don't show on catalog pages - they have their own PWA install
  const isCatalogPage = location.pathname.startsWith('/catalogo/');

  // Handle visibility with animation
  useEffect(() => {
    if (showPrompt && isInstallable && !isInstalled && !isCatalogPage) {
      // Small delay before showing for better UX
      const showTimer = setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 10);
      }, 1000);

      return () => clearTimeout(showTimer);
    } else {
      setIsAnimating(false);
      const hideTimer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(hideTimer);
    }
  }, [showPrompt, isInstallable, isInstalled, isCatalogPage]);

  const handleInstall = async () => {
    setIsAnimating(false);
    setTimeout(async () => {
      await installApp();
      setIsVisible(false);
    }, 300);
  };

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      dismissPrompt();
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-50 transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleDismiss}
      />

      {/* Prompt Card */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-gray-800
          rounded-t-3xl shadow-2xl
          p-6 pb-8
          transform transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Fechar"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <img
            src={theme === 'dark' ? '/mercadoVirtualBranco.png' : '/mercadoVirtualPreto.png'}
            alt="Mercado Virtual"
            className="h-16 w-auto object-contain mb-4"
          />

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Instalar Mercado Virtual
          </h3>

          {/* Description */}
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Instale o aplicativo para acesso rapido, notificacoes e melhor experiencia mesmo offline.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
              Acesso rapido
            </span>
            <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
              Funciona offline
            </span>
            <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
              Sem ocupar espaco
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
            >
              <GetAppIcon className="w-5 h-5" />
              Instalar agora
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors"
            >
              Agora nao
            </button>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            Voce pode instalar mais tarde no menu do navegador
          </p>
        </div>
      </div>
    </>
  );
}

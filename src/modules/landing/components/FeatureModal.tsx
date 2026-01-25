import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '@mui/icons-material/Close';

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}

export function FeatureModal({ isOpen, onClose, title, icon, color, children }: FeatureModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Detectar scroll para fechar (apenas desktop)
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);

    // Fecha se rolar mais de 50px
    if (scrollDelta > 50 && window.innerWidth >= 1024) {
      onClose();
    }
  }, [onClose]);

  // Fechar com Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Trap focus dentro do modal
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      lastScrollY.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keydown', handleTabKey);

      // Focus no modal ao abrir
      setTimeout(() => {
        const closeButton = modalRef.current?.querySelector('button');
        closeButton?.focus();
      }, 100);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, handleScroll, handleKeyDown, handleTabKey]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - Desktop (lateral esquerda) */}
      <div
        ref={modalRef}
        className={`
          hidden lg:flex flex-col
          fixed left-0 top-0 h-full w-[480px]
          bg-white dark:bg-gray-900
          shadow-2xl shadow-black/20
          animate-slide-in-left
          border-r border-gray-200 dark:border-gray-800
        `}
      >
        {/* Header */}
        <div className={`flex items-center gap-4 p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r ${color}`}>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
            {icon}
          </div>
          <div className="flex-1">
            <h2 id="modal-title" className="text-xl font-bold text-white">
              {title}
            </h2>
            <p className="text-sm text-white/70">Preview interativo</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Fechar modal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer hint */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Role a pagina para fechar este preview
          </p>
        </div>
      </div>

      {/* Modal - Mobile (centralizado) */}
      <div
        ref={modalRef}
        className={`
          lg:hidden
          fixed inset-4 sm:inset-8
          max-h-[90vh]
          bg-white dark:bg-gray-900
          rounded-3xl
          shadow-2xl shadow-black/20
          animate-scale-in
          flex flex-col
          overflow-hidden
        `}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r ${color}`}>
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="modal-title-mobile" className="text-lg font-bold text-white truncate">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Fechar modal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

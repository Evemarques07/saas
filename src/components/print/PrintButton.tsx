/**
 * PrintButton Component
 * Button with dropdown menu for print options
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import BluetoothConnectedIcon from '@mui/icons-material/BluetoothConnected';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import RouterIcon from '@mui/icons-material/Router';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Sale, Company } from '../../types';
import {
  printReceipt,
  PrintMethod,
  isBluetoothSupported,
  isBluetoothConnected,
  getReceiptESCPOS,
} from '../../services/print';
import { BluetoothPrinterModal } from './BluetoothPrinterModal';
import { useTenant } from '../../contexts/TenantContext';

interface PrintButtonProps {
  sale: Sale;
  company: Company;
  onPrintStart?: () => void;
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
  onWhatsAppShare?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
}

interface PrintOption {
  id: PrintMethod | 'whatsapp';
  label: string;
  icon: React.ReactNode;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function PrintButton({
  sale,
  company,
  onPrintStart,
  onPrintSuccess,
  onPrintError,
  onWhatsAppShare,
  disabled = false,
  className = '',
  variant = 'secondary',
}: PrintButtonProps) {
  const { currentCompany } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('up');
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Check if network printer is configured
  const networkPrinterConfigured = !!(currentCompany?.print_settings?.enabled && currentCompany?.print_settings?.ip);

  // Check Bluetooth connection status
  useEffect(() => {
    setBluetoothConnected(isBluetoothConnected());
  }, [isOpen, showBluetoothModal]);

  // Calculate best direction for menu
  const calculateDirection = useCallback(() => {
    if (!buttonRef.current) return 'up';

    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 280;

    if (spaceBelow < menuHeight) {
      return 'up';
    }
    return 'down';
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update direction when opening
  useEffect(() => {
    if (isOpen) {
      setOpenDirection(calculateDirection());
    }
  }, [isOpen, calculateDirection]);

  const hasCustomerPhone = !!(sale.customer_phone || sale.customer?.phone);
  const bluetoothSupported = isBluetoothSupported();

  const options: PrintOption[] = [
    {
      id: 'browser',
      label: 'Impressora do Sistema',
      icon: <PrintIcon className="w-5 h-5" />,
      description: 'USB, Rede compartilhada',
    },
    {
      id: 'pdf',
      label: 'Salvar como PDF',
      icon: <PictureAsPdfIcon className="w-5 h-5" />,
      description: 'Para impressao posterior',
    },
    {
      id: 'network',
      label: networkPrinterConfigured ? 'Impressora de Rede' : 'Configurar Rede',
      icon: <RouterIcon className="w-5 h-5" />,
      description: networkPrinterConfigured
        ? (currentCompany?.print_settings?.printer_name || currentCompany?.print_settings?.ip || 'Impressora configurada')
        : 'Configure em Configuracoes',
      disabled: !networkPrinterConfigured,
      disabledReason: 'Configure a impressora de rede em Configuracoes > Impressora de Rede',
    },
    {
      id: 'bluetooth',
      label: bluetoothConnected ? 'Impressora Bluetooth' : 'Conectar Bluetooth',
      icon: bluetoothConnected
        ? <BluetoothConnectedIcon className="w-5 h-5" />
        : <BluetoothIcon className="w-5 h-5" />,
      description: bluetoothConnected ? 'Termica conectada' : 'Pareie uma impressora',
      disabled: !bluetoothSupported,
      disabledReason: 'Bluetooth nao suportado neste navegador',
    },
    {
      id: 'whatsapp',
      label: 'Enviar via WhatsApp',
      icon: <WhatsAppIcon className="w-5 h-5" />,
      description: hasCustomerPhone ? 'Texto formatado' : 'Cliente sem telefone',
      disabled: !hasCustomerPhone,
      disabledReason: 'Cliente nao possui telefone cadastrado',
    },
  ];

  const handleOptionClick = async (option: PrintOption) => {
    if (option.disabled) return;

    setIsOpen(false);

    if (option.id === 'whatsapp') {
      onWhatsAppShare?.();
      return;
    }

    if (option.id === 'bluetooth') {
      // Always open Bluetooth modal - it handles connection and printing
      setShowBluetoothModal(true);
      return;
    }

    setIsPrinting(true);
    onPrintStart?.();

    try {
      // Build print options
      const printOptions: Parameters<typeof printReceipt>[2] = {
        method: option.id as PrintMethod,
        paperWidth: option.id === 'network'
          ? (currentCompany?.print_settings?.paper_width || '80mm')
          : '80mm',
        autoCut: option.id === 'network'
          ? (currentCompany?.print_settings?.auto_cut ?? true)
          : true,
      };

      // Add network config if printing via network
      if (option.id === 'network' && currentCompany?.print_settings) {
        printOptions.networkConfig = {
          ip: currentCompany.print_settings.ip,
          port: currentCompany.print_settings.port || 9100,
          timeout_ms: currentCompany.print_settings.timeout_ms || 5000,
        };
      }

      const result = await printReceipt(sale, company, printOptions);

      if (result.success) {
        onPrintSuccess?.();
      } else {
        onPrintError?.(result.error || 'Erro ao imprimir');
      }
    } catch (error) {
      onPrintError?.(error instanceof Error ? error.message : 'Erro ao imprimir');
    } finally {
      setIsPrinting(false);
    }
  };

  // Quick print (browser)
  const handleQuickPrint = async () => {
    setIsPrinting(true);
    onPrintStart?.();

    try {
      const result = await printReceipt(sale, company, {
        method: 'browser',
        paperWidth: '80mm',
      });

      if (result.success) {
        onPrintSuccess?.();
      } else {
        onPrintError?.(result.error || 'Erro ao imprimir');
      }
    } catch (error) {
      onPrintError?.(error instanceof Error ? error.message : 'Erro ao imprimir');
    } finally {
      setIsPrinting(false);
    }
  };

  // Get receipt data for Bluetooth modal
  const receiptData = getReceiptESCPOS(sale, company, '80mm');

  const baseClasses = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300',
    secondary:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50',
    icon: 'p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50',
  };

  if (variant === 'icon') {
    return (
      <>
        <div className="relative" ref={menuRef}>
          <div ref={buttonRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled || isPrinting}
              className={`${baseClasses.icon} ${className}`}
              title="Imprimir comprovante"
            >
              <PrintIcon className="w-5 h-5" />
            </button>
          </div>

          {isOpen && (
            <PrintMenu
              options={options}
              onSelect={handleOptionClick}
              direction={openDirection}
            />
          )}
        </div>

        <BluetoothPrinterModal
          isOpen={showBluetoothModal}
          onClose={() => setShowBluetoothModal(false)}
          receiptData={receiptData}
          onSuccess={onPrintSuccess}
          onError={onPrintError}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <div className="flex" ref={buttonRef}>
          {/* Main button - quick print */}
          <button
            type="button"
            onClick={handleQuickPrint}
            disabled={disabled || isPrinting}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-l-lg font-medium text-sm
              transition-colors ${baseClasses[variant]} ${className}
            `}
          >
            <PrintIcon className="w-4 h-4" />
            {isPrinting ? 'Imprimindo...' : 'Imprimir'}
          </button>

          {/* Dropdown toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled || isPrinting}
            className={`
              px-2 py-2 rounded-r-lg border-l border-gray-300 dark:border-gray-600
              transition-colors ${baseClasses[variant]}
            `}
          >
            <ExpandMoreIcon
              className={`w-4 h-4 transition-transform ${
                isOpen ? (openDirection === 'up' ? '' : 'rotate-180') : ''
              }`}
            />
          </button>
        </div>

        {isOpen && (
          <PrintMenu
            options={options}
            onSelect={handleOptionClick}
            direction={openDirection}
          />
        )}
      </div>

      <BluetoothPrinterModal
        isOpen={showBluetoothModal}
        onClose={() => setShowBluetoothModal(false)}
        receiptData={receiptData}
        onSuccess={onPrintSuccess}
        onError={onPrintError}
      />
    </>
  );
}

/**
 * Dropdown menu for print options
 */
interface PrintMenuProps {
  options: PrintOption[];
  onSelect: (option: PrintOption) => void;
  direction?: 'up' | 'down';
}

function PrintMenu({ options, onSelect, direction = 'up' }: PrintMenuProps) {
  const positionClasses = direction === 'up'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div
      className={`
        absolute left-0 ${positionClasses} w-64 bg-white dark:bg-gray-800
        rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
        py-2 z-[100]
      `}
    >
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
        Opcoes de impressao
      </div>

      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option)}
          disabled={option.disabled}
          className={`
            w-full flex items-start gap-3 px-3 py-2.5 text-left
            transition-colors
            ${
              option.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }
          `}
          title={option.disabled ? option.disabledReason : undefined}
        >
          <span
            className={`
              mt-0.5 flex-shrink-0
              ${option.disabled ? 'text-gray-400' : 'text-primary-600 dark:text-primary-400'}
            `}
          >
            {option.icon}
          </span>
          <div className="min-w-0">
            <p
              className={`
                text-sm font-medium
                ${option.disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}
              `}
            >
              {option.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {option.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * Simple icon button for printing (no dropdown)
 */
interface SimplePrintButtonProps {
  sale: Sale;
  company: Company;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function SimplePrintButton({
  sale,
  company,
  onSuccess,
  onError,
  className = '',
}: SimplePrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      const result = await printReceipt(sale, company, {
        method: 'browser',
        paperWidth: '80mm',
      });

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Erro ao imprimir');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Erro ao imprimir');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={isPrinting}
      className={`
        p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100
        dark:hover:bg-gray-700 rounded-lg transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title="Imprimir comprovante"
    >
      <PrintIcon className={`w-5 h-5 ${isPrinting ? 'animate-pulse' : ''}`} />
    </button>
  );
}

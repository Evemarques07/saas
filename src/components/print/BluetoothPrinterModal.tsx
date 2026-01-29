/**
 * BluetoothPrinterModal Component
 * Modal for connecting to Bluetooth thermal printers
 */

import { useState, useEffect } from 'react';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import BluetoothConnectedIcon from '@mui/icons-material/BluetoothConnected';
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Modal, ModalFooter, Button } from '../ui';
import {
  isBluetoothSupported,
  isConnected,
  getConnectedPrinter,
  connectPrinter,
  disconnectPrinter,
  printData,
  BluetoothPrinterDevice,
} from '../../services/print/BluetoothPrintAdapter';
import { ESCPOSEncoder } from '../../services/print/ESCPOSCommands';

interface BluetoothPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintRequested?: (printFn: () => Promise<boolean>) => void;
  receiptData?: Uint8Array;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type ModalState = 'idle' | 'connecting' | 'connected' | 'printing' | 'success' | 'error';

export function BluetoothPrinterModal({
  isOpen,
  onClose,
  receiptData,
  onSuccess,
  onError,
}: BluetoothPrinterModalProps) {
  const [state, setState] = useState<ModalState>('idle');
  const [connectedPrinter, setConnectedPrinter] = useState<BluetoothPrinterDevice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const bluetoothSupported = isBluetoothSupported();

  // Check connection status on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      const printer = getConnectedPrinter();
      setConnectedPrinter(printer);
      setState(printer?.connected ? 'connected' : 'idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setState('connecting');
    setErrorMessage('');

    const result = await connectPrinter();

    if (result.success) {
      const printer = getConnectedPrinter();
      setConnectedPrinter(printer);
      setState('connected');
    } else {
      setErrorMessage(result.error || 'Erro ao conectar');
      setState('error');
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    setConnectedPrinter(null);
    setState('idle');
  };

  const handlePrint = async () => {
    if (!receiptData) {
      onError?.('Nenhum dado para imprimir');
      return;
    }

    setState('printing');

    const result = await printData(receiptData);

    if (result.success) {
      setState('success');
      onSuccess?.();
      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setErrorMessage(result.error || 'Erro ao imprimir');
      setState('error');
      onError?.(result.error || 'Erro ao imprimir');
    }
  };

  const handleTestPrint = async () => {
    setState('printing');

    // Generate test receipt
    const encoder = new ESCPOSEncoder('80mm');
    encoder
      .align('center')
      .bold(true)
      .size('double')
      .line('TESTE DE IMPRESSAO')
      .size('normal')
      .bold(false)
      .newline()
      .doubleDivider()
      .line('Impressora conectada!')
      .line(`Nome: ${connectedPrinter?.name || 'Desconhecido'}`)
      .doubleDivider()
      .newline()
      .line(new Date().toLocaleString('pt-BR'))
      .newline(3)
      .cut();

    const result = await printData(encoder.build());

    if (result.success) {
      setState('connected');
    } else {
      setErrorMessage(result.error || 'Erro no teste');
      setState('error');
    }
  };

  // Not supported message
  if (!bluetoothSupported) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Impressora Bluetooth"
        size="md"
      >
        <div className="text-center py-8">
          <BluetoothDisabledIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Bluetooth nao suportado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Seu navegador nao suporta Web Bluetooth.
            <br />
            Use <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.
          </p>
          <p className="text-sm text-gray-400">
            Safari e Firefox nao suportam esta funcionalidade.
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Impresso!"
        size="sm"
      >
        <div className="text-center py-8">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Impressao concluida!
          </h3>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Impressora Bluetooth"
      size="md"
    >
      <div className="space-y-6">
        {/* Status Icon */}
        <div className="text-center">
          {state === 'connecting' || state === 'printing' ? (
            <div className="relative">
              <BluetoothIcon className="w-16 h-16 text-blue-500 mx-auto animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            </div>
          ) : connectedPrinter?.connected ? (
            <BluetoothConnectedIcon className="w-16 h-16 text-green-500 mx-auto" />
          ) : (
            <BluetoothIcon className="w-16 h-16 text-gray-300 mx-auto" />
          )}
        </div>

        {/* Status Text */}
        <div className="text-center">
          {state === 'connecting' && (
            <p className="text-gray-600 dark:text-gray-400">
              Procurando impressoras...
            </p>
          )}

          {state === 'printing' && (
            <p className="text-gray-600 dark:text-gray-400">
              Enviando para impressora...
            </p>
          )}

          {state === 'connected' && connectedPrinter && (
            <>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {connectedPrinter.name}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Conectado
              </p>
            </>
          )}

          {state === 'idle' && !connectedPrinter && (
            <p className="text-gray-500 dark:text-gray-400">
              Nenhuma impressora conectada
            </p>
          )}

          {state === 'error' && (
            <p className="text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Instructions */}
        {state === 'idle' && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Como conectar:
            </h4>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Ligue sua impressora Bluetooth</li>
              <li>Ative o Bluetooth no seu dispositivo</li>
              <li>Clique em "Conectar Impressora"</li>
              <li>Selecione sua impressora na lista</li>
            </ol>
          </div>
        )}

        {/* Connected printer actions */}
        {state === 'connected' && connectedPrinter && (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={handleTestPrint}
              className="w-full flex items-center justify-center gap-2"
            >
              <PrintIcon className="w-4 h-4" />
              Imprimir Teste
            </Button>
          </div>
        )}
      </div>

      <ModalFooter>
        {!connectedPrinter?.connected ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConnect}
              loading={state === 'connecting'}
              className="flex items-center gap-2"
            >
              <BluetoothIcon className="w-4 h-4" />
              Conectar Impressora
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={handleDisconnect}
              className="flex items-center gap-2"
            >
              <RefreshIcon className="w-4 h-4" />
              Desconectar
            </Button>
            {receiptData && (
              <Button
                variant="primary"
                onClick={handlePrint}
                loading={state === 'printing'}
                className="flex items-center gap-2"
              >
                <PrintIcon className="w-4 h-4" />
                Imprimir
              </Button>
            )}
            {!receiptData && (
              <Button variant="primary" onClick={onClose}>
                Pronto
              </Button>
            )}
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';
import { Loader } from './Loader';
import {
  createUser,
  connectSession,
  getConnectionState,
  getQRCode,
  getSessionStatus,
  checkApiHealth,
  generateUserToken,
} from '../../services/whatsapp';

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySlug: string;
  companyName: string;
  userToken?: string;
  onConnected?: (info: { phone: string; name: string; token: string }) => void;
}

type Status = 'checking' | 'loading' | 'qrcode' | 'connected' | 'error' | 'api-offline';

const MAX_POLLING_ERRORS = 5; // Max consecutive errors before giving up
const POLLING_INTERVAL = 3000; // 3 seconds

export function WhatsAppConnectModal({
  isOpen,
  onClose,
  companySlug,
  companyName,
  userToken: initialToken,
  onConnected,
}: WhatsAppConnectModalProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [userToken, setUserToken] = useState<string>(initialToken || '');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrExpirationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingErrorCountRef = useRef<number>(0);
  const isInitializingRef = useRef<boolean>(false); // Debounce flag

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (qrExpirationRef.current) {
      clearTimeout(qrExpirationRef.current);
      qrExpirationRef.current = null;
    }
    pollingErrorCountRef.current = 0;
  }, []);

  // Start polling for connection status
  const startPolling = useCallback((token: string) => {
    cleanup();
    pollingErrorCountRef.current = 0; // Reset error count

    pollingRef.current = setInterval(async () => {
      try {
        const sessionStatus = await getSessionStatus(token);

        // Reset error count on successful response
        pollingErrorCountRef.current = 0;

        if (sessionStatus.loggedIn) {
          cleanup();

          // Extract phone from jid (format: 5511999998888@s.whatsapp.net)
          const phone = sessionStatus.jid?.split('@')[0] || null;

          setConnectedPhone(phone);
          setConnectedName(sessionStatus.name);
          onConnected?.({
            phone: phone || '',
            name: sessionStatus.name || '',
            token: token,
          });

          setStatus('connected');
          toast.success('WhatsApp conectado com sucesso!');
        }
      } catch (err) {
        pollingErrorCountRef.current++;
        console.warn(`[WhatsAppModal] Polling error ${pollingErrorCountRef.current}/${MAX_POLLING_ERRORS}:`, err);

        // Stop polling after too many consecutive errors
        if (pollingErrorCountRef.current >= MAX_POLLING_ERRORS) {
          cleanup();
          setStatus('error');
          setError('Erro ao verificar conexao. Por favor, tente novamente.');
          toast.error('Falha na verificacao de conexao');
        }
      }
    }, POLLING_INTERVAL);

    // QR Code expires in 2 minutes
    qrExpirationRef.current = setTimeout(() => {
      setQrCodeExpired(true);
    }, 120000);
  }, [onConnected, cleanup]);

  // Initialize connection (with debounce)
  const initConnection = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isInitializingRef.current) {
      console.log('[WhatsAppModal] Already initializing, skipping...');
      return;
    }
    isInitializingRef.current = true;

    setStatus('checking');
    setError(null);
    setQrCode(null);
    setQrCodeExpired(false);

    try {
      // Check if API is reachable
      const isHealthy = await checkApiHealth();
      if (!isHealthy) {
        setStatus('api-offline');
        setError('Servidor de WhatsApp esta offline ou inacessivel');
        isInitializingRef.current = false;
        return;
      }

      setStatus('loading');

      // Generate or use existing token
      let token = userToken || initialToken;
      if (!token) {
        token = generateUserToken(companySlug);
        setUserToken(token);
      }

      // Create user if not exists
      const createResult = await createUser(companySlug, token);
      if (!createResult.success) {
        setStatus('error');
        setError(createResult.error || 'Erro ao criar usuario');
        return;
      }

      // Check current connection state
      const state = await getConnectionState(token);

      if (state.state === 'open') {
        // Already connected, get info
        const sessionStatus = await getSessionStatus(token);
        const phone = sessionStatus.jid?.split('@')[0] || null;
        setConnectedPhone(phone);
        setConnectedName(sessionStatus.name);
        setStatus('connected');
        return;
      }

      // Connect session (required before getting QR code)
      // Note: This may return error if session is already connecting, but we should still try to get QR
      await connectSession(token);

      // Wait a moment for session to be ready
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try to get QR Code with multiple attempts
      let qrCodeData: string | null = null;

      for (let attempt = 0; attempt < 3 && !qrCodeData; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Try /session/qr endpoint
        const qr = await getQRCode(token);
        if (qr?.base64) {
          qrCodeData = qr.base64;
          break;
        }

        // Try getting from session status
        const sessionStatus = await getSessionStatus(token);
        if (sessionStatus.qrcode) {
          qrCodeData = sessionStatus.qrcode;
          break;
        }

        // Check if already connected
        if (sessionStatus.loggedIn) {
          const phone = sessionStatus.jid?.split('@')[0] || null;
          setConnectedPhone(phone);
          setConnectedName(sessionStatus.name);
          setStatus('connected');
          onConnected?.({
            phone: phone || '',
            name: sessionStatus.name || '',
            token: token,
          });
          return;
        }
      }

      if (qrCodeData) {
        setQrCode(qrCodeData);
        setStatus('qrcode');
        startPolling(token);
      } else {
        setStatus('error');
        setError('Nao foi possivel gerar o QR Code. Tente novamente.');
      }
    } catch (err) {
      console.error('[WhatsAppModal] Error:', err);
      setStatus('error');
      setError('Erro ao iniciar conexao');
    } finally {
      isInitializingRef.current = false;
    }
  }, [companySlug, userToken, initialToken, startPolling, onConnected]);

  // Refresh QR Code (with debounce)
  const refreshQRCode = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isInitializingRef.current) {
      console.log('[WhatsAppModal] Already refreshing, skipping...');
      return;
    }
    isInitializingRef.current = true;

    setQrCodeExpired(false);
    setStatus('loading');
    cleanup();

    try {
      const token = userToken || initialToken;
      if (!token) {
        setStatus('error');
        setError('Token nao encontrado');
        isInitializingRef.current = false;
        return;
      }

      // Reconnect session
      await connectSession(token);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try multiple times to get QR code
      let qrCodeData: string | null = null;

      for (let attempt = 0; attempt < 3 && !qrCodeData; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const qr = await getQRCode(token);
        if (qr?.base64) {
          qrCodeData = qr.base64;
          break;
        }

        const sessionStatus = await getSessionStatus(token);
        if (sessionStatus.qrcode) {
          qrCodeData = sessionStatus.qrcode;
          break;
        }
      }

      if (qrCodeData) {
        setQrCode(qrCodeData);
        setStatus('qrcode');
        startPolling(token);
      } else {
        setStatus('error');
        setError('Nao foi possivel gerar o QR Code');
      }
    } catch (err) {
      setStatus('error');
      setError('Erro ao atualizar QR Code');
    } finally {
      isInitializingRef.current = false;
    }
  }, [userToken, initialToken, startPolling, cleanup]);

  // Effect to init connection when modal opens
  useEffect(() => {
    if (isOpen) {
      initConnection();
    } else {
      cleanup();
      isInitializingRef.current = false; // Reset debounce flag on close
      setStatus('checking');
      setQrCode(null);
      setError(null);
      setConnectedPhone(null);
      setConnectedName(null);
      setQrCodeExpired(false);
    }

    return () => {
      cleanup();
      isInitializingRef.current = false;
    };
  }, [isOpen, initConnection, cleanup]);

  // Update token when prop changes
  useEffect(() => {
    if (initialToken) {
      setUserToken(initialToken);
    }
  }, [initialToken]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conectar WhatsApp"
      size="md"
    >
      <div className="text-center py-4">
        {/* Checking/Loading */}
        {(status === 'checking' || status === 'loading') && (
          <div className="py-8">
            <Loader size="lg" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {status === 'checking' ? 'Verificando conexao...' : 'Preparando conexao...'}
            </p>
          </div>
        )}

        {/* API Offline */}
        {status === 'api-offline' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
              <ErrorIcon className="w-8 h-8 text-orange-500" />
            </div>
            <p className="mt-4 text-lg font-medium text-orange-600 dark:text-orange-400">
              Servidor Indisponivel
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {error}
            </p>
            <Button
              className="mt-4"
              onClick={initConnection}
              icon={<RefreshIcon />}
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* QR Code */}
        {status === 'qrcode' && qrCode && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Conectando WhatsApp para <strong>{companyName}</strong>
              </p>
            </div>

            {qrCodeExpired ? (
              <div className="py-8">
                <div className="w-64 h-64 mx-auto bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
                  <RefreshIcon className="w-12 h-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">QR Code expirado</p>
                </div>
                <Button
                  className="mt-4"
                  onClick={refreshQRCode}
                  icon={<RefreshIcon />}
                >
                  Gerar Novo QR Code
                </Button>
              </div>
            ) : (
              <>
                <div className="relative inline-block">
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 mx-auto rounded-lg border-2 border-gray-200 dark:border-gray-600"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                    <WhatsAppIcon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="mt-6 space-y-2 text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <PhoneAndroidIcon className="w-5 h-5 text-green-500" />
                    Como escanear:
                  </p>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-7 list-decimal">
                    <li>Abra o WhatsApp no celular</li>
                    <li>Toque em <strong>Menu</strong> (3 pontos) ou <strong>Configuracoes</strong></li>
                    <li>Selecione <strong>Dispositivos conectados</strong></li>
                    <li>Toque em <strong>Conectar dispositivo</strong></li>
                    <li>Escaneie este QR Code</li>
                  </ol>
                </div>

                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                  O QR Code expira em 2 minutos
                </p>
              </>
            )}
          </div>
        )}

        {/* Connected */}
        {status === 'connected' && (
          <div className="py-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
            </div>
            <p className="mt-4 text-xl font-semibold text-green-600 dark:text-green-400">
              WhatsApp Conectado!
            </p>
            {connectedPhone && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Numero: <strong>{connectedPhone}</strong>
              </p>
            )}
            {connectedName && (
              <p className="text-gray-500 dark:text-gray-500">
                {connectedName}
              </p>
            )}
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              As notificacoes automaticas estao ativas para <strong>{companyName}</strong>
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="py-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <ErrorIcon className="w-8 h-8 text-red-500" />
            </div>
            <p className="mt-4 text-lg font-medium text-red-600 dark:text-red-400">
              Erro na Conexao
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {error}
            </p>
            <Button
              className="mt-4"
              onClick={initConnection}
              icon={<RefreshIcon />}
            >
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
        >
          {status === 'connected' ? 'Fechar' : 'Cancelar'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

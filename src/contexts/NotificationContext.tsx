import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { toast } from 'react-hot-toast';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useTenant } from './TenantContext';
import { supabase } from '../services/supabase';
import { CatalogOrder } from '../types';

interface NotificationContextType {
  pendingOrdersCount: number;
  refreshPendingCount: () => Promise<void>;
  markOrdersAsSeen: () => void;
  hasNewOrders: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Som de notificacao usando Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Criar um som de notificacao simples
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configurar som
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // La5
    oscillator.type = 'sine';

    // Fade in/out para som mais suave
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    // Tocar
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Segundo beep
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();

      osc2.connect(gain2);
      gain2.connect(audioContext.destination);

      osc2.frequency.setValueAtTime(1108.73, audioContext.currentTime); // Do#6
      osc2.type = 'sine';

      gain2.gain.setValueAtTime(0, audioContext.currentTime);
      gain2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.4);
    }, 200);
  } catch (error) {
    console.log('Audio not supported:', error);
  }
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentCompany } = useTenant();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const lastCountRef = useRef(0);
  const initialLoadRef = useRef(true);

  // Buscar contagem de pedidos pendentes
  const refreshPendingCount = useCallback(async () => {
    if (!currentCompany) {
      setPendingOrdersCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('catalog_orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .eq('status', 'pending');

      if (error) throw error;

      const newCount = count || 0;
      setPendingOrdersCount(newCount);

      // Verificar se tem novos pedidos (apenas apos o carregamento inicial)
      if (!initialLoadRef.current && newCount > lastCountRef.current) {
        setHasNewOrders(true);
      }

      lastCountRef.current = newCount;
      initialLoadRef.current = false;
    } catch (error) {
      console.error('Error fetching pending orders count:', error);
    }
  }, [currentCompany]);

  // Marcar pedidos como vistos (remove indicador de "novo")
  const markOrdersAsSeen = useCallback(() => {
    setHasNewOrders(false);
  }, []);

  // Carregar contagem inicial
  useEffect(() => {
    if (currentCompany) {
      initialLoadRef.current = true;
      refreshPendingCount();
    }
  }, [currentCompany, refreshPendingCount]);

  // Subscrever a novos pedidos via Realtime
  useEffect(() => {
    if (!currentCompany) return;

    const channelName = `orders-notifications-${currentCompany.id}-${Date.now()}`;

    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'catalog_orders',
          filter: `company_id=eq.${currentCompany.id}`,
        } as unknown as { event: 'system' },
        (payload: unknown) => {
          const newOrder = (payload as { new: CatalogOrder }).new;

          // Tocar som
          playNotificationSound();

          // Mostrar toast
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white dark:bg-gray-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <LocalShippingIcon className="h-6 w-6 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Novo Pedido!
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {newOrder.customer_name} fez um pedido de{' '}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(newOrder.total)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ),
            {
              duration: 8000,
              position: 'top-right',
            }
          );

          // Atualizar contagem
          refreshPendingCount();
        }
      )
      .on(
        'postgres_changes' as unknown as 'system',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'catalog_orders',
          filter: `company_id=eq.${currentCompany.id}`,
        } as unknown as { event: 'system' },
        () => {
          // Atualizar contagem quando status mudar
          refreshPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany, refreshPendingCount]);

  const value = {
    pendingOrdersCount,
    refreshPendingCount,
    markOrdersAsSeen,
    hasNewOrders,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

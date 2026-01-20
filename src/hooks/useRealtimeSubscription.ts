import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}

interface UseRealtimeSubscriptionOptions<T> {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string; // e.g., 'company_id=eq.123'
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: RealtimePayload<T>) => void;
  enabled?: boolean;
}

/**
 * Hook para subscrever a mudancas em tempo real de uma tabela do Supabase
 *
 * @example
 * // Escutar todas as mudancas em produtos de uma empresa
 * useRealtimeSubscription({
 *   table: 'products',
 *   filter: `company_id=eq.${companyId}`,
 *   onInsert: (product) => setProducts(prev => [...prev, product]),
 *   onUpdate: ({ new: product }) => setProducts(prev =>
 *     prev.map(p => p.id === product.id ? product : p)
 *   ),
 *   onDelete: (product) => setProducts(prev =>
 *     prev.filter(p => p.id !== product.id)
 *   ),
 * });
 *
 * @example
 * // Escutar novos pedidos do catalogo
 * useRealtimeSubscription({
 *   table: 'catalog_orders',
 *   filter: `company_id=eq.${companyId}`,
 *   event: 'INSERT',
 *   onInsert: (order) => {
 *     toast.success('Novo pedido recebido!');
 *     refetchOrders();
 *   },
 * });
 */
export function useRealtimeSubscription<T>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Build channel name
    const channelName = `realtime:${schema}:${table}:${Date.now()}`;

    // Subscribe to changes
    const channel = supabase.channel(channelName);

    // Build the subscription config
    const subscriptionConfig: {
      event: RealtimeEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    channel
      .on(
        'postgres_changes' as unknown as 'system',
        subscriptionConfig as unknown as { event: 'system' },
        (payload: unknown) => {
          const typedPayload = payload as RealtimePayload<T>;

          // Call general onChange handler
          if (onChange) {
            onChange(typedPayload);
          }

          // Call specific handlers based on event type
          switch (typedPayload.eventType) {
            case 'INSERT':
              if (onInsert && typedPayload.new) {
                onInsert(typedPayload.new);
              }
              break;
            case 'UPDATE':
              if (onUpdate && typedPayload.old && typedPayload.new) {
                onUpdate({
                  old: typedPayload.old,
                  new: typedPayload.new,
                });
              }
              break;
            case 'DELETE':
              if (onDelete && typedPayload.old) {
                onDelete(typedPayload.old);
              }
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, schema, event, filter, enabled, onInsert, onUpdate, onDelete, onChange]);

  return channelRef.current;
}

/**
 * Hook simplificado para recarregar dados quando houver mudancas
 *
 * @example
 * const { data, refetch } = useProducts();
 * useRealtimeRefresh({
 *   table: 'products',
 *   filter: `company_id=eq.${companyId}`,
 *   onRefresh: refetch,
 * });
 */
export function useRealtimeRefresh({
  table,
  schema = 'public',
  filter,
  onRefresh,
  enabled = true,
}: {
  table: string;
  schema?: string;
  filter?: string;
  onRefresh: () => void;
  enabled?: boolean;
}) {
  useRealtimeSubscription({
    table,
    schema,
    filter,
    enabled,
    onChange: () => {
      onRefresh();
    },
  });
}

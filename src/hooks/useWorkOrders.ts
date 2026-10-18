import { useCallback, useEffect, useState } from 'react';
import { dataEvents } from '../data/events';
import { listWorkOrders } from '../data/workOrderService';
import { WorkOrder, WorkOrderFilters } from '../domain/types';

export interface UseWorkOrdersResult {
  orders: WorkOrder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to retrieve work orders matching optional filters, sorted by urgency.
 * Automatically updates whenever work orders are created, updated, or synced.
 */
export function useWorkOrders(filters?: WorkOrderFilters): UseWorkOrdersResult {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const status = filters?.status;
  const priority = filters?.priority;

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listWorkOrders({ status, priority });
      setOrders(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }, [status, priority]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await listWorkOrders({ status, priority });
        if (isMounted) {
          setOrders(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to load work orders');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    const unsubscribe = dataEvents.subscribe((type) => {
      if (type === 'work_orders' || type === 'all' || type === 'sync') {
        load();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [status, priority]);

  return {
    orders,
    loading,
    error,
    refresh: fetchOrders,
  };
}

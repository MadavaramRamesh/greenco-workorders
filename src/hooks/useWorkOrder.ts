import { useCallback, useEffect, useState } from 'react';
import { dataEvents } from '../data/events';
import { getOrder, getStatusHistory, saveWorkOrder } from '../data/workOrderService';
import { SaveWorkOrderResult, StatusHistory, WorkOrder } from '../domain/types';

export interface UseWorkOrderResult {
  order: WorkOrder | null;
  history: StatusHistory[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markCompleted: () => Promise<SaveWorkOrderResult>;
}

/**
 * Hook to retrieve a single work order and its status history by ID.
 * Automatically refreshes whenever work orders, outbox mutations, or sync operations occur.
 */
export function useWorkOrder(id?: string | null): UseWorkOrderResult {
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderAndHistory = useCallback(async () => {
    if (!id) {
      setOrder(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [orderData, historyData] = await Promise.all([
        getOrder(id),
        getStatusHistory(id),
      ]);
      setOrder(orderData);
      setHistory(historyData);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load work order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!id) {
        if (isMounted) {
          setOrder(null);
          setHistory([]);
          setLoading(false);
        }
        return;
      }

      try {
        const [orderData, historyData] = await Promise.all([
          getOrder(id),
          getStatusHistory(id),
        ]);
        if (isMounted) {
          setOrder(orderData);
          setHistory(historyData);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? 'Failed to load work order details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    const unsubscribe = dataEvents.subscribe((type) => {
      if (
        type === 'work_orders' ||
        type === 'all' ||
        type === 'sync' ||
        type === 'outbox'
      ) {
        load();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id]);

  const markCompleted = useCallback(async (): Promise<SaveWorkOrderResult> => {
    if (!order) {
      return {
        success: false,
        errors: { title: 'No work order found to complete' },
      };
    }

    const result = await saveWorkOrder({
      wo_id: order.wo_id,
      asset_id: order.asset_id,
      title: order.title,
      priority: order.priority,
      status: 'Completed',
      assigned_to: order.assigned_to,
      due_date: order.due_date,
    });

    return result;
  }, [order]);

  return {
    order,
    history,
    loading,
    error,
    refresh: fetchOrderAndHistory,
    markCompleted,
  };
}


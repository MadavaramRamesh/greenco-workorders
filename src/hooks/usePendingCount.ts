import { useCallback, useEffect, useState } from 'react';
import { dataEvents } from '../data/events';
import { getPendingCount } from '../data/workOrderService';

export interface UsePendingCountResult {
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to retrieve the count of pending outbox mutations.
 * Automatically refreshes when mutations are queued or synced.
 */
export function usePendingCount(): UsePendingCountResult {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const c = await getPendingCount();
      setCount(c);
    } catch (err) {
      console.error('[usePendingCount] Failed to get pending count:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const c = await getPendingCount();
        if (isMounted) {
          setCount(c);
        }
      } catch (err) {
        console.error('[usePendingCount] Failed to load pending count:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    const unsubscribe = dataEvents.subscribe((type) => {
      if (type === 'outbox' || type === 'all' || type === 'sync') {
        load();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    count,
    loading,
    refresh: fetchCount,
  };
}

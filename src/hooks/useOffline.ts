import { useCallback, useEffect, useState } from 'react';
import { dataEvents } from '../data/events';
import { getOfflineSetting, setOfflineSetting } from '../data/workOrderService';

export interface UseOfflineResult {
  isOffline: boolean;
  loading: boolean;
  setOffline: (value: boolean) => Promise<void>;
  toggleOffline: () => Promise<void>;
}

/**
 * Hook to read and toggle the stored offline setting.
 * Synchronizes with SQLite settings table and emits dataEvents.
 */
export function useOffline(): UseOfflineResult {
  const [isOffline, setIsOfflineState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const stored = await getOfflineSetting();
        if (isMounted) {
          setIsOfflineState(stored);
        }
      } catch (err) {
        console.error('[useOffline] Failed to load offline setting:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    const unsubscribe = dataEvents.subscribe((type) => {
      if (type === 'settings' || type === 'all') {
        load();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const setOffline = useCallback(async (value: boolean) => {
    setIsOfflineState(value);
    await setOfflineSetting(value);
  }, []);

  const toggleOffline = useCallback(async () => {
    const next = !isOffline;
    setIsOfflineState(next);
    await setOfflineSetting(next);
  }, [isOffline]);

  return {
    isOffline,
    loading,
    setOffline,
    toggleOffline,
  };
}


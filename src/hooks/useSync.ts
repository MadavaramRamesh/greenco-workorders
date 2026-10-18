import { useCallback, useEffect, useState } from 'react';
import { SyncResult } from '../domain/types';
import { getSyncService } from '../sync/serviceInstance';
import { SyncService } from '../sync/syncService';

export interface UseSyncResult {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncNow: () => Promise<SyncResult | null>;
}

/**
 * Hook wrapping SyncService to expose sync state and trigger sync passes.
 * Exposes isSyncing, lastSyncedAt, and syncNow.
 */
export function useSync(): UseSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncService, setSyncService] = useState<SyncService | null>(null);

  useEffect(() => {
    let isMounted = true;
    getSyncService().then((service) => {
      if (isMounted) {
        setSyncService(service);
        setIsSyncing(service.isSyncing);
        setLastSyncedAt(service.lastSyncedAt);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    const service = syncService ?? (await getSyncService());
    if (service.isSyncing) {
      return null;
    }

    setIsSyncing(true);
    try {
      const result = await service.syncNow();
      setLastSyncedAt(service.lastSyncedAt);
      return result;
    } finally {
      setIsSyncing(service.isSyncing);
    }
  }, [syncService]);

  return {
    isSyncing,
    lastSyncedAt,
    syncNow,
  };
}

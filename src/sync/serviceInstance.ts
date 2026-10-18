import { getDatabaseAsync } from '../data/db';
import { SqliteOutboxRepo } from '../data/SqliteOutboxRepo';
import { SqliteSettingsRepo } from '../data/SqliteSettingsRepo';
import { SqliteWorkOrderRepo } from '../data/SqliteWorkOrderRepo';
import { MockSyncTransport } from './mockTransport';
import { SyncService } from './syncService';

let syncServiceInstance: SyncService | null = null;

/**
 * Returns the application-wide singleton SyncService instance
 * backed by the local SQLite database and mock server transport.
 */
export async function getSyncService(): Promise<SyncService> {
  if (!syncServiceInstance) {
    const db = await getDatabaseAsync();
    const outboxRepo = new SqliteOutboxRepo(db);
    const workOrderRepo = new SqliteWorkOrderRepo(db);
    const settingsRepo = new SqliteSettingsRepo(db);
    const transport = new MockSyncTransport({ db, delayMs: 600 });

    syncServiceInstance = new SyncService(
      outboxRepo,
      workOrderRepo,
      transport,
      settingsRepo
    );
  }
  return syncServiceInstance;
}

/**
 * Sets or overrides the singleton SyncService instance (useful for testing or custom mocks).
 */
export function setSyncService(service: SyncService | null): void {
  syncServiceInstance = service;
}

import {
  OutboxRepo,
  SettingsRepo,
  SyncResult,
  SyncStatus,
  WorkOrderRepo,
} from '../domain/types';
import { SyncTransport } from './transport';
import { dataEvents } from '../data/events';

export interface SyncOptions {
  isOffline?: boolean;
}

/**
 * Service orchestrating client synchronization with the backend:
 * - Thread-safe lock (isSyncing) prevents overlapping sync attempts.
 * - Checks offline state and aborts immediately without touching transport.
 * - Processes outbox sequentially in strict FIFO order (seq ASC).
 * - Deletes outbox rows on 'accepted' or 'duplicate' responses.
 * - Automatically clears pending_sync = 0 and marks status history synced
 *   as soon as an order has no remaining outbox items.
 * - Retains failed rows and halts outbox loop on 'rejected' or network error.
 * - Always resets isSyncing flag in a finally block.
 *
 * Notice: This class deliberately depends on the SyncTransport interface
 * and NEVER imports the mock transport directly.
 */
export class SyncService {
  private _isSyncing = false;
  private _lastSyncedAt: string | null = null;
  private _manualOffline: boolean | null = null;

  constructor(
    private outboxRepo: OutboxRepo,
    private workOrderRepo: WorkOrderRepo,
    private transport: SyncTransport,
    private settingsRepo?: SettingsRepo
  ) {}

  /**
   * Whether a sync operation is currently in progress.
   */
  get isSyncing(): boolean {
    return this._isSyncing;
  }

  /**
   * Timestamp of the last successful or attempted sync.
   */
  get lastSyncedAt(): string | null {
    return this._lastSyncedAt;
  }

  /**
   * Explicitly set or override offline state (useful for tests or runtime hooks).
   */
  setOffline(offline: boolean | null): void {
    this._manualOffline = offline;
  }

  /**
   * Resolves whether the client is currently considered offline.
   */
  async isOffline(): Promise<boolean> {
    if (this._manualOffline !== null) {
      return this._manualOffline;
    }
    if (this.settingsRepo) {
      return this.settingsRepo.isOffline();
    }
    return false;
  }

  /**
   * Executes a sync pass:
   * 1. Returns immediately if offline or if another sync is currently running.
   * 2. Sets isSyncing lock.
   * 3. Reads outbox mutations ordered by seq ASC.
   * 4. Pushes each mutation to the transport.
   * 5. On 'accepted' or 'duplicate': removes outbox row and updates order status.
   * 6. On 'rejected' or transport error: preserves outbox row and stops loop.
   * 7. In finally block: clears isSyncing lock.
   */
  async syncNow(options?: SyncOptions): Promise<SyncResult> {
    const offline =
      options?.isOffline !== undefined
        ? options.isOffline
        : await this.isOffline();

    // 1. Double-tap and offline prevention guard
    if (offline || this._isSyncing) {
      const remaining = await this.outboxRepo.count();
      return { accepted: 0, duplicates: 0, remaining };
    }

    // 2. Set lock
    this._isSyncing = true;
    let accepted = 0;
    let duplicates = 0;

    try {
      // 3. Read outbox in FIFO sequence
      const outboxRows = await this.outboxRepo.getAll();

      for (const mutation of outboxRows) {
        let status: SyncStatus;

        try {
          status = await this.transport.push(mutation);
        } catch {
          // On transport network/runtime error: keep row and stop
          break;
        }

        if (status === 'accepted' || status === 'duplicate') {
          if (status === 'accepted') {
            accepted++;
          } else {
            duplicates++;
          }

          // Delete processed outbox row
          if (mutation.seq !== undefined) {
            await this.outboxRepo.delete(mutation.seq);
          }

          // When order has no more outbox rows, clear pending_sync and mark status history synced
          const hasMore = await this.outboxRepo.hasPendingForOrder(mutation.wo_id);
          if (!hasMore) {
            await this.workOrderRepo.setPendingSync(mutation.wo_id, 0);
            await this.workOrderRepo.markStatusHistorySynced(mutation.wo_id);
          }
        } else if (status === 'rejected') {
          // On rejection: keep row and stop the loop for retry later
          break;
        }
      }

      this._lastSyncedAt = new Date().toISOString();
      const remaining = await this.outboxRepo.count();
      dataEvents.emit('all');
      return { accepted, duplicates, remaining };
    } finally {
      // 7. Always release lock
      this._isSyncing = false;
    }
  }
}

import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabaseAsync } from '../data/db';
import { Mutation, SyncStatus } from '../domain/types';
import { SyncTransport } from './transport';

export interface MockSyncTransportOptions {
  db?: SQLiteDatabase;
  delayMs?: number;
}

/**
 * Mock server sync transport backed by SQLite server_orders and processed_mutations tables.
 * Emulates a real backend endpoint with server-side idempotency:
 * - Duplicate checks rely strictly on mutation_id, never wo_id.
 * - Idempotent retries return 'duplicate' and leave server data unchanged.
 * - All server writes happen in a single transaction.
 * - Configurable artificial delay (default 600ms) exposes in-flight sync states.
 */
export class MockSyncTransport implements SyncTransport {
  private db?: SQLiteDatabase;
  private delayMs: number;

  constructor(
    dbOrOptions?: SQLiteDatabase | MockSyncTransportOptions,
    delayMs: number = 600
  ) {
    if (dbOrOptions && 'runAsync' in dbOrOptions) {
      this.db = dbOrOptions;
      this.delayMs = delayMs;
    } else if (dbOrOptions && typeof dbOrOptions === 'object') {
      this.db = dbOrOptions.db;
      this.delayMs = dbOrOptions.delayMs ?? 600;
    } else {
      this.db = undefined;
      this.delayMs = delayMs;
    }
  }

  private async getDb(): Promise<SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }
    return getDatabaseAsync();
  }

  /**
   * Update the artificial network delay.
   */
  setDelay(ms: number): void {
    this.delayMs = ms;
  }

  /**
   * Push a mutation to the mock server.
   */
  async push(mutation: Mutation): Promise<SyncStatus> {
    // 1. Configurable artificial network latency
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    const db = await this.getDb();

    // 2. Server-side idempotency check:
    // If the mutation_id is already in processed_mutations, return 'duplicate' and change nothing.
    const existing = await db.getFirstAsync<{ mutation_id: string }>(
      'SELECT mutation_id FROM processed_mutations WHERE mutation_id = ?;',
      mutation.mutation_id
    );

    if (existing) {
      return 'duplicate';
    }

    // 3. In one transaction, upsert server_orders and insert processed_mutations
    const now = new Date().toISOString();
    const dataStr =
      typeof mutation.payload === 'string'
        ? mutation.payload
        : JSON.stringify(mutation.payload);

    let updatedAt = now;
    if (
      typeof mutation.payload === 'object' &&
      mutation.payload !== null &&
      'updated_at' in mutation.payload
    ) {
      updatedAt = String((mutation.payload as any).updated_at) || now;
    } else if (typeof mutation.payload === 'string') {
      try {
        const parsed = JSON.parse(mutation.payload);
        if (parsed?.updated_at) {
          updatedAt = String(parsed.updated_at);
        }
      } catch {
        // Fallback to now
      }
    }

    await db.withTransactionAsync(async () => {
      // Upsert server_orders
      await db.runAsync(
        `INSERT INTO server_orders (wo_id, data, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(wo_id) DO UPDATE SET
           data = excluded.data,
           updated_at = excluded.updated_at;`,
        mutation.wo_id,
        dataStr,
        updatedAt
      );

      // Insert processed_mutations
      await db.runAsync(
        `INSERT INTO processed_mutations (mutation_id, processed_at)
         VALUES (?, ?);`,
        mutation.mutation_id,
        now
      );
    });

    return 'accepted';
  }

  /**
   * Helper for tests/diagnostics: retrieve a server order row.
   */
  async getServerOrder(
    woId: string
  ): Promise<{ wo_id: string; data: string; updated_at: string } | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{
      wo_id: string;
      data: string;
      updated_at: string;
    }>('SELECT * FROM server_orders WHERE wo_id = ?;', woId);
    return row ?? null;
  }

  /**
   * Helper for tests/diagnostics: check if a mutation was processed.
   */
  async isMutationProcessed(mutationId: string): Promise<boolean> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ mutation_id: string }>(
      'SELECT mutation_id FROM processed_mutations WHERE mutation_id = ?;',
      mutationId
    );
    return Boolean(row);
  }

  /**
   * Helper for tests/diagnostics: retrieve total processed mutations count.
   */
  async getProcessedCount(): Promise<number> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM processed_mutations;'
    );
    return row?.count ?? 0;
  }

  /**
   * Helper for tests/diagnostics: clear mock server tables.
   */
  async resetServerState(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM server_orders;');
    await db.runAsync('DELETE FROM processed_mutations;');
  }
}


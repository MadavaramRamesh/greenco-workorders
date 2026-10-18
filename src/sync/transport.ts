import { Mutation, SyncStatus } from '../domain/types';

/**
 * Transport interface isolating the client sync engine from the backend implementation.
 * In development, MockSyncTransport implements this using local SQLite tables.
 * In production, an HttpSyncTransport or WebSocket transport implements this over the network.
 */
export interface SyncTransport {
  /**
   * Pushes a single mutation to the backend.
   * Returns:
   *  - 'accepted': The mutation was newly applied.
   *  - 'duplicate': The mutation_id was previously processed (idempotency match).
   *  - 'rejected': The mutation was rejected by the server or an error occurred.
   */
  push(mutation: Mutation): Promise<SyncStatus>;
}


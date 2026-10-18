import {
  Mutation,
  OutboxRepo,
  SettingsRepo,
  StatusHistory,
  SyncStatus,
  WorkOrder,
  WorkOrderFilters,
  WorkOrderRepo,
} from '../src/domain/types';
import { SyncService } from '../src/sync/syncService';
import { SyncTransport } from '../src/sync/transport';
import { validateWorkOrder } from '../src/domain/validation';

/**
 * In-memory fake implementation of OutboxRepo for tests.
 * Completely eliminates any dependency on SQLite or native device modules.
 */
export class InMemoryOutboxRepo implements OutboxRepo {
  private mutations: Mutation[] = [];
  private nextSeq = 1;

  async insert(mutation: Omit<Mutation, 'seq'>): Promise<Mutation> {
    const row: Mutation = {
      ...mutation,
      seq: this.nextSeq++,
    };
    this.mutations.push(row);
    return { ...row };
  }

  async getAll(): Promise<Mutation[]> {
    // Mimics SQLite ORDER BY seq ASC
    return [...this.mutations].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  }

  async delete(seq: number): Promise<void> {
    return this.deleteBySeq(seq);
  }

  async deleteBySeq(seq: number): Promise<void> {
    this.mutations = this.mutations.filter((m) => m.seq !== seq);
  }

  async count(): Promise<number> {
    return this.mutations.length;
  }

  async hasPendingForOrder(woId: string): Promise<boolean> {
    return this.mutations.some((m) => m.wo_id === woId);
  }

  // Diagnostic helper for assertions
  getMutations(): Mutation[] {
    return [...this.mutations];
  }

  clear(): void {
    this.mutations = [];
    this.nextSeq = 1;
  }
}

/**
 * In-memory fake implementation of WorkOrderRepo for tests.
 */
export class InMemoryWorkOrderRepo implements WorkOrderRepo {
  private orders = new Map<string, WorkOrder>();
  private history: StatusHistory[] = [];

  async findById(id: string): Promise<WorkOrder | null> {
    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  async list(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
    return Array.from(this.orders.values());
  }

  async upsert(order: WorkOrder): Promise<void> {
    this.orders.set(order.wo_id, { ...order });
  }

  async getNextWoId(): Promise<string> {
    let maxNum = 1000;
    for (const key of this.orders.keys()) {
      const match = key.match(/^WO-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `WO-${maxNum + 1}`;
  }

  async setPendingSync(woId: string, pendingSync: number): Promise<void> {
    const order = this.orders.get(woId);
    if (order) {
      order.pending_sync = pendingSync;
      this.orders.set(woId, order);
    }
  }

  async getStatusHistory(woId: string): Promise<StatusHistory[]> {
    return this.history.filter((h) => h.wo_id === woId);
  }

  async insertStatusHistory(
    history: Omit<StatusHistory, 'id'>
  ): Promise<void> {
    this.history.push({ ...history, id: this.history.length + 1 });
  }

  async markStatusHistorySynced(woId: string): Promise<void> {
    for (const h of this.history) {
      if (h.wo_id === woId) {
        h.synced = 1;
      }
    }
  }

  // Diagnostic helper
  getHistory(): StatusHistory[] {
    return [...this.history];
  }
}

/**
 * In-memory fake implementation of SettingsRepo for tests.
 */
export class InMemorySettingsRepo implements SettingsRepo {
  private settings = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.settings.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.settings.set(key, value);
  }

  async isOffline(): Promise<boolean> {
    return this.settings.get('offline') === '1';
  }

  async setOffline(offline: boolean): Promise<void> {
    this.settings.set('offline', offline ? '1' : '0');
  }
}

/**
 * Fake SyncTransport conforming strictly to SyncTransport interface.
 * Implements server-side idempotency tracking by mutation_id.
 */
export class FakeSyncTransport implements SyncTransport {
  public pushedMutations: Mutation[] = [];
  public processedIds = new Set<string>();
  public serverOrders = new Map<string, unknown>();
  public delayMs: number;
  public rejectNext = false;
  public throwNextError: Error | null = null;

  constructor(delayMs: number = 0) {
    this.delayMs = delayMs;
  }

  async push(mutation: Mutation): Promise<SyncStatus> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.throwNextError) {
      const err = this.throwNextError;
      this.throwNextError = null;
      throw err;
    }

    if (this.rejectNext) {
      this.rejectNext = false;
      return 'rejected';
    }

    this.pushedMutations.push({ ...mutation });

    // Server-side idempotency check:
    if (this.processedIds.has(mutation.mutation_id)) {
      return 'duplicate';
    }

    this.processedIds.add(mutation.mutation_id);
    this.serverOrders.set(mutation.wo_id, mutation.payload);
    return 'accepted';
  }
}

describe('SyncService & Transport Tests', () => {
  let outboxRepo: InMemoryOutboxRepo;
  let workOrderRepo: InMemoryWorkOrderRepo;
  let settingsRepo: InMemorySettingsRepo;
  let fakeTransport: FakeSyncTransport;
  let syncService: SyncService;

  beforeEach(() => {
    outboxRepo = new InMemoryOutboxRepo();
    workOrderRepo = new InMemoryWorkOrderRepo();
    settingsRepo = new InMemorySettingsRepo();
    fakeTransport = new FakeSyncTransport();
    syncService = new SyncService(
      outboxRepo,
      workOrderRepo,
      fakeTransport,
      settingsRepo
    );
  });

  /**
   * Requirement (a):
   * Two syncNow() calls fired together, then one more, produce exactly one server effect and an empty outbox.
   */
  test('(a) two syncNow() calls fired together, then one more, produce exactly one server effect and an empty outbox', async () => {
    // 1. Prepare initial order and outbox row
    await workOrderRepo.upsert({
      wo_id: 'WO-1001',
      asset_id: 'WTG-101',
      title: 'Inspect turbine gearbox',
      priority: 'High',
      status: 'In Progress',
      assigned_to: 'Technician A',
      due_date: '2026-10-25',
      updated_at: '2026-10-18T10:00:00.000Z',
      revision: 2,
      pending_sync: 1,
    });
    await workOrderRepo.insertStatusHistory({
      wo_id: 'WO-1001',
      from_status: 'Open',
      to_status: 'In Progress',
      changed_at: '2026-10-18T10:00:00.000Z',
      synced: 0,
    });
    await outboxRepo.insert({
      mutation_id: 'mutation-uuid-1',
      wo_id: 'WO-1001',
      type: 'update',
      payload: JSON.stringify({ title: 'Inspect turbine gearbox' }),
      created_at: '2026-10-18T10:00:00.000Z',
    });

    expect(await outboxRepo.count()).toBe(1);

    // Give fake transport a short delay so the two simultaneous calls overlap
    fakeTransport.delayMs = 25;

    // 2. Fire two syncNow() calls simultaneously (e.g. rapid double tap)
    const [result1, result2] = await Promise.all([
      syncService.syncNow(),
      syncService.syncNow(),
    ]);

    // One call must have executed and accepted the mutation,
    // while the second call was blocked by isSyncing lock and returned immediately.
    const totalAccepted = result1.accepted + result2.accepted;
    expect(totalAccepted).toBe(1);
    expect(fakeTransport.pushedMutations.length).toBe(1);
    expect(fakeTransport.serverOrders.size).toBe(1);
    expect(fakeTransport.processedIds.size).toBe(1);

    // 3. Fire "then one more" call
    const result3 = await syncService.syncNow();

    // The outbox was already emptied by the first sync, so 0 additional server pushes occur
    expect(result3.accepted).toBe(0);
    expect(result3.duplicates).toBe(0);
    expect(result3.remaining).toBe(0);

    // Exactly one total server effect across all three calls
    expect(fakeTransport.pushedMutations.length).toBe(1);
    expect(fakeTransport.processedIds.size).toBe(1);
    expect(fakeTransport.serverOrders.size).toBe(1);

    // Outbox is completely empty
    expect(await outboxRepo.count()).toBe(0);

    // Pending sync is cleared and status history marked as synced
    const updatedOrder = await workOrderRepo.findById('WO-1001');
    expect(updatedOrder?.pending_sync).toBe(0);

    const history = await workOrderRepo.getStatusHistory('WO-1001');
    expect(history[0].synced).toBe(1);
  });

  /**
   * Requirement (b):
   * Pushing the same mutation id twice returns 'duplicate' the second time.
   */
  test('(b) pushing the same mutation id twice returns "duplicate" the second time', async () => {
    const mutation: Mutation = {
      mutation_id: 'unique-mutation-12345',
      wo_id: 'WO-1002',
      type: 'update',
      payload: JSON.stringify({ status: 'Completed' }),
      created_at: new Date().toISOString(),
    };

    // First push -> accepted
    const firstStatus = await fakeTransport.push(mutation);
    expect(firstStatus).toBe('accepted');
    expect(fakeTransport.processedIds.has(mutation.mutation_id)).toBe(true);

    // Second push with same mutation_id -> duplicate
    const secondStatus = await fakeTransport.push(mutation);
    expect(secondStatus).toBe('duplicate');

    // Verify duplicate push does not create a duplicate server entry
    expect(fakeTransport.pushedMutations.length).toBe(2);
    expect(fakeTransport.processedIds.size).toBe(1);
  });

  /**
   * Test handling of duplicate in syncService:
   * When transport returns 'duplicate', outbox row is still removed and order marked synced.
   */
  test('syncService removes outbox row and increments duplicates on duplicate response', async () => {
    await workOrderRepo.upsert({
      wo_id: 'WO-1003',
      asset_id: 'PMP-301',
      title: 'Inspect pump seal',
      priority: 'Low',
      status: 'Open',
      assigned_to: 'Technician B',
      due_date: '2026-10-30',
      updated_at: new Date().toISOString(),
      revision: 1,
      pending_sync: 1,
    });

    const mutationId = 'already-processed-mutation-999';
    // Pre-mark mutation as already processed on server
    fakeTransport.processedIds.add(mutationId);

    await outboxRepo.insert({
      mutation_id: mutationId,
      wo_id: 'WO-1003',
      type: 'create',
      payload: JSON.stringify({ title: 'Inspect pump seal' }),
      created_at: new Date().toISOString(),
    });

    expect(await outboxRepo.count()).toBe(1);

    const result = await syncService.syncNow();
    expect(result.duplicates).toBe(1);
    expect(result.accepted).toBe(0);
    expect(result.remaining).toBe(0);

    // Outbox row is deleted
    expect(await outboxRepo.count()).toBe(0);

    // Order pending_sync cleared
    const order = await workOrderRepo.findById('WO-1003');
    expect(order?.pending_sync).toBe(0);
  });

  /**
   * Requirement (c):
   * While offline nothing is sent.
   */
  test('(c) while offline nothing is sent', async () => {
    // 1. Add pending mutation
    await workOrderRepo.upsert({
      wo_id: 'WO-1004',
      asset_id: 'INV-201',
      title: 'Offline inverter diagnosis',
      priority: 'Critical',
      status: 'In Progress',
      assigned_to: 'Technician C',
      due_date: '2026-10-22',
      updated_at: new Date().toISOString(),
      revision: 1,
      pending_sync: 1,
    });
    await outboxRepo.insert({
      mutation_id: 'mutation-offline-1',
      wo_id: 'WO-1004',
      type: 'create',
      payload: JSON.stringify({ title: 'Offline inverter diagnosis' }),
      created_at: new Date().toISOString(),
    });

    // 2. Set offline via settings repo
    await settingsRepo.setOffline(true);
    expect(await syncService.isOffline()).toBe(true);

    // 3. Attempt sync
    const result = await syncService.syncNow();

    // 4. Verify nothing was sent to transport and outbox was untouched
    expect(result.accepted).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(result.remaining).toBe(1);

    expect(fakeTransport.pushedMutations.length).toBe(0);
    expect(fakeTransport.serverOrders.size).toBe(0);
    expect(await outboxRepo.count()).toBe(1);

    const order = await workOrderRepo.findById('WO-1004');
    expect(order?.pending_sync).toBe(1);
  });

  /**
   * Transport rejection or network failure test:
   * Keeps outbox row and stops the loop so it can retry later.
   */
  test('retains outbox row and halts queue on rejected status or network error', async () => {
    await outboxRepo.insert({
      mutation_id: 'mutation-fail-1',
      wo_id: 'WO-1005',
      type: 'update',
      payload: JSON.stringify({ title: 'Order that fails' }),
      created_at: new Date().toISOString(),
    });

    fakeTransport.rejectNext = true;

    const result = await syncService.syncNow();
    expect(result.accepted).toBe(0);
    expect(result.remaining).toBe(1);
    expect(await outboxRepo.count()).toBe(1);
    expect(syncService.isSyncing).toBe(false); // Lock released in finally
  });

  /**
   * Multi-mutation order completion test:
   * pending_sync stays 1 until ALL outbox rows for an order are processed.
   */
  test('order pending_sync remains 1 until all mutations for that order are synced', async () => {
    await workOrderRepo.upsert({
      wo_id: 'WO-1006',
      asset_id: 'WTG-101',
      title: 'Multi-mutation test',
      priority: 'Low',
      status: 'Open',
      assigned_to: null,
      due_date: null,
      updated_at: new Date().toISOString(),
      revision: 1,
      pending_sync: 1,
    });

    // Insert two sequential mutations for the same order
    await outboxRepo.insert({
      mutation_id: 'mut-1006-a',
      wo_id: 'WO-1006',
      type: 'create',
      payload: JSON.stringify({ revision: 1 }),
      created_at: '2026-10-18T10:00:00.000Z',
    });
    await outboxRepo.insert({
      mutation_id: 'mut-1006-b',
      wo_id: 'WO-1006',
      type: 'update',
      payload: JSON.stringify({ revision: 2 }),
      created_at: '2026-10-18T10:05:00.000Z',
    });

    expect(await outboxRepo.count()).toBe(2);

    const result = await syncService.syncNow();
    expect(result.accepted).toBe(2);
    expect(result.remaining).toBe(0);
    expect(await outboxRepo.count()).toBe(0);

    const order = await workOrderRepo.findById('WO-1006');
    expect(order?.pending_sync).toBe(0);
  });

  /**
   * Validation test (docs/SPEC.md Section 11):
   * Validation rejects empty title and returns an error message.
   */
  test('validation: an empty title returns an error message', () => {
    const emptyTitleErrors = validateWorkOrder({
      title: '',
      asset_id: 'WTG-101',
      priority: 'High',
      status: 'Open',
      due_date: '2026-10-25',
    });

    expect(emptyTitleErrors.title).toBe('Title is required');

    const shortTitleErrors = validateWorkOrder({
      title: 'ab',
      asset_id: 'WTG-101',
      priority: 'High',
      status: 'Open',
      due_date: '2026-10-25',
    });

    expect(shortTitleErrors.title).toMatch(/at least 3 characters/i);
  });
});

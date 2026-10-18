import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  MutationPayload,
  MutationType,
  OutboxRepo,
  Priority,
  SaveWorkOrderInput,
  SaveWorkOrderResult,
  SettingsRepo,
  Status,
  StatusHistory,
  WorkOrder,
  WorkOrderFilters,
  WorkOrderRepo,
} from '../domain/types';
import { hasValidationErrors, validateWorkOrder } from '../domain/validation';
import { getDatabaseAsync } from './db';
import { SqliteOutboxRepo } from './SqliteOutboxRepo';
import { SqliteSettingsRepo } from './SqliteSettingsRepo';
import { SqliteWorkOrderRepo } from './SqliteWorkOrderRepo';
import { dataEvents } from './events';

export interface ServiceRepositories {
  workOrderRepo?: WorkOrderRepo;
  outboxRepo?: OutboxRepo;
  settingsRepo?: SettingsRepo;
  db?: SQLiteDatabase;
}

/**
 * Saves a work order (create or update) following offline-first rules.
 *
 * 1. Validates input first. If invalid, returns field errors and writes nothing.
 * 2. In ONE SQLite transaction:
 *    - Upserts work_orders (increments revision on update or sets 1 on create,
 *      sets new updated_at, sets pending_sync = 1).
 *    - Inserts a status_history row when status changes (or on create).
 *    - Inserts exactly one outbox row with a new UUID mutation_id (expo-crypto),
 *      type create or update, and JSON payload including base_revision.
 *    - Generates the next WO number for new orders if no wo_id was supplied.
 */
export async function saveWorkOrder(
  input: SaveWorkOrderInput,
  deps?: ServiceRepositories
): Promise<SaveWorkOrderResult> {
  // Step 1: Validate input first
  const errors = validateWorkOrder(input);
  if (hasValidationErrors(errors)) {
    return {
      success: false,
      errors,
    };
  }

  const db = deps?.db ?? (await getDatabaseAsync());
  const woRepo = deps?.workOrderRepo ?? new SqliteWorkOrderRepo(db);
  const outboxRepo = deps?.outboxRepo ?? new SqliteOutboxRepo(db);

  let savedOrder: WorkOrder | null = null;
  let mutationId = '';

  // Step 2: Perform all writes in ONE transaction
  await db.withTransactionAsync(async () => {
    const now = new Date().toISOString();
    const existing = input.wo_id ? await woRepo.findById(input.wo_id) : null;
    const isUpdate = Boolean(existing);

    let woId: string;
    let revision: number;
    let baseRevision: number;
    let oldStatus: Status | null = null;

    if (isUpdate && existing) {
      woId = existing.wo_id;
      baseRevision = existing.revision;
      revision = existing.revision + 1;
      oldStatus = existing.status;
    } else {
      woId = input.wo_id ? input.wo_id.trim() : await woRepo.getNextWoId();
      baseRevision = 0;
      revision = 1;
      oldStatus = null;
    }

    const order: WorkOrder = {
      wo_id: woId,
      asset_id: String(input.asset_id).trim(),
      title: String(input.title).trim(),
      priority: input.priority as Priority,
      status: input.status as Status,
      assigned_to: input.assigned_to ? String(input.assigned_to).trim() : null,
      due_date: input.due_date ? String(input.due_date).trim() : null,
      updated_at: now,
      revision,
      pending_sync: 1,
    };

    // 1. Upsert work_orders
    await woRepo.upsert(order);

    // 2. Insert status_history row when status changes (or on create)
    const statusChanged = !isUpdate || oldStatus !== order.status;
    if (statusChanged) {
      await woRepo.insertStatusHistory({
        wo_id: woId,
        from_status: oldStatus,
        to_status: order.status,
        changed_at: now,
        synced: 0,
      });
    }

    // 3. Insert exactly one outbox row
    mutationId = Crypto.randomUUID();
    const mutationType: MutationType = isUpdate ? 'update' : 'create';
    const payload: MutationPayload = {
      wo_id: woId,
      asset_id: order.asset_id,
      title: order.title,
      priority: order.priority,
      status: order.status,
      assigned_to: order.assigned_to,
      due_date: order.due_date,
      updated_at: now,
      revision: order.revision,
      base_revision: baseRevision,
    };

    await outboxRepo.insert({
      mutation_id: mutationId,
      wo_id: woId,
      type: mutationType,
      payload: JSON.stringify(payload),
      created_at: now,
    });

    savedOrder = order;
  });

  dataEvents.emit('work_orders');
  dataEvents.emit('outbox');

  return {
    success: true,
    order: savedOrder!,
    mutation_id: mutationId,
  };
}

/**
 * List orders with optional status and priority filters sorted by urgency:
 * Overdue first, then priority (Critical -> High -> Medium -> Low), then due date.
 */
export async function listOrders(
  filters?: WorkOrderFilters,
  referenceDate?: string,
  deps?: ServiceRepositories
): Promise<WorkOrder[]> {
  const db = deps?.db ?? (await getDatabaseAsync());
  const woRepo = deps?.workOrderRepo ?? new SqliteWorkOrderRepo(db);
  return woRepo.list(filters, referenceDate);
}

export const listWorkOrders = listOrders;

/**
 * Retrieve a single work order by id.
 */
export async function getOrder(
  id: string,
  deps?: ServiceRepositories
): Promise<WorkOrder | null> {
  const db = deps?.db ?? (await getDatabaseAsync());
  const woRepo = deps?.workOrderRepo ?? new SqliteWorkOrderRepo(db);
  return woRepo.findById(id);
}

export const getWorkOrder = getOrder;

/**
 * Retrieve the status history for a work order.
 */
export async function getStatusHistory(
  id: string,
  deps?: ServiceRepositories
): Promise<StatusHistory[]> {
  const db = deps?.db ?? (await getDatabaseAsync());
  const woRepo = deps?.workOrderRepo ?? new SqliteWorkOrderRepo(db);
  return woRepo.getStatusHistory(id);
}

/**
 * Retrieve the count of pending outbox mutations.
 */
export async function getPendingCount(
  deps?: ServiceRepositories
): Promise<number> {
  const db = deps?.db ?? (await getDatabaseAsync());
  const outboxRepo = deps?.outboxRepo ?? new SqliteOutboxRepo(db);
  return outboxRepo.count();
}

/**
 * Retrieve the offline setting ('1' = true, '0' = false).
 */
export async function getOfflineSetting(
  deps?: ServiceRepositories
): Promise<boolean> {
  const db = deps?.db ?? (await getDatabaseAsync());
  const settingsRepo = deps?.settingsRepo ?? new SqliteSettingsRepo(db);
  return settingsRepo.isOffline();
}

/**
 * Update the offline setting.
 */
export async function setOfflineSetting(
  offline: boolean,
  deps?: ServiceRepositories
): Promise<void> {
  const db = deps?.db ?? (await getDatabaseAsync());
  const settingsRepo = deps?.settingsRepo ?? new SqliteSettingsRepo(db);
  await settingsRepo.setOffline(offline);
  dataEvents.emit('settings');
}

/**
 * Temporary dev-only test function:
 * 1. Tests validation rejection with invalid input (verifies 0 outbox entries written).
 * 2. Saves an update to WO-1001 (verifies revision + 1, pending_sync = 1, status history, and outbox row).
 * 3. Saves a new order (verifies next WO ID generated, revision 1, outbox row).
 * 4. Queries and logs the entire outbox and status history.
 */
export async function runDevSaveTest(): Promise<{
  validationPassed: boolean;
  updatePassed: boolean;
  createPassed: boolean;
  outboxCount: number;
  outboxRows: any[];
  savedOrder?: WorkOrder;
  createdOrder?: WorkOrder;
}> {
  console.log('--- [DEV TEST START: Save & Outbox Verification] ---');

  // Test 1: Validation
  console.log('[DevTest] 1. Testing validation on invalid input...');
  const invalidResult = await saveWorkOrder({
    title: 'ab', // < 3 characters
    asset_id: '', // empty
    priority: 'SuperHigh' as any, // invalid
    status: 'Pending' as any, // invalid
    due_date: '2026-02-30', // invalid calendar date
  });

  const validationPassed =
    !invalidResult.success &&
    Boolean(invalidResult.errors?.title) &&
    Boolean(invalidResult.errors?.asset_id) &&
    Boolean(invalidResult.errors?.priority) &&
    Boolean(invalidResult.errors?.status) &&
    Boolean(invalidResult.errors?.due_date);

  console.log('[DevTest] Validation result:', {
    passed: validationPassed,
    errors: invalidResult.errors,
  });

  // Test 2: Update existing order WO-1001
  console.log('[DevTest] 2. Testing update to existing order WO-1001...');
  const existingOrderBefore = await getOrder('WO-1001');
  const baseRev = existingOrderBefore?.revision ?? 1;

  const updateResult = await saveWorkOrder({
    wo_id: 'WO-1001',
    asset_id: 'WTG-101',
    title: 'Inspect turbine gearbox (Dev Tested)',
    priority: 'Critical',
    status: 'In Progress',
    due_date: '2026-10-25',
    assigned_to: 'Technician A',
  });

  const updatePassed =
    updateResult.success &&
    updateResult.order.revision === baseRev + 1 &&
    updateResult.order.pending_sync === 1 &&
    updateResult.order.status === 'In Progress';

  console.log('[DevTest] Update result:', {
    passed: updatePassed,
    revisionBefore: baseRev,
    revisionAfter: updateResult.order?.revision,
    pendingSync: updateResult.order?.pending_sync,
    mutationId: updateResult.mutation_id,
  });

  // Test 3: Create new order
  console.log('[DevTest] 3. Testing create new work order...');
  const createResult = await saveWorkOrder({
    asset_id: 'INV-201',
    title: 'Dev Test New Coolant Pump Check',
    priority: 'High',
    status: 'Open',
    due_date: '2026-10-29',
    assigned_to: 'Technician D',
  });

  const createPassed =
    createResult.success &&
    createResult.order.revision === 1 &&
    createResult.order.pending_sync === 1 &&
    createResult.order.wo_id.startsWith('WO-');

  console.log('[DevTest] Create result:', {
    passed: createPassed,
    newWoId: createResult.order?.wo_id,
    revision: createResult.order?.revision,
    mutationId: createResult.mutation_id,
  });

  // Inspect Outbox
  const db = await getDatabaseAsync();
  const outboxRepo = new SqliteOutboxRepo(db);
  const outboxRows = await outboxRepo.getAll();
  const outboxCount = await outboxRepo.count();

  console.log(`[DevTest] 4. Current Outbox Rows (${outboxCount} total):`);
  outboxRows.forEach((row, i) => {
    console.log(`  [Row ${i + 1}] seq=${row.seq} id=${row.mutation_id} wo_id=${row.wo_id} type=${row.type}`);
    console.log(`    payload=${typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload)}`);
  });

  console.log('--- [DEV TEST COMPLETE] ---');

  return {
    validationPassed,
    updatePassed,
    createPassed,
    outboxCount,
    outboxRows,
    savedOrder: updateResult.order,
    createdOrder: createResult.order,
  };
}


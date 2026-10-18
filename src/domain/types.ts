/**
 * Domain types for GreenCo Work Orders.
 * Matched to CSV columns, SQLite schema, and offline sync requirements.
 */

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type Status = 'Open' | 'In Progress' | 'Completed';

export interface WorkOrder {
  wo_id: string;
  asset_id: string;
  title: string;
  priority: Priority;
  status: Status;
  assigned_to: string | null;
  due_date: string | null;
  updated_at: string;
  revision: number;
  pending_sync?: number; // 0 = synced, 1 = pending local mutation
}

export type MutationType = 'create' | 'update';

export interface MutationPayload {
  wo_id: string;
  asset_id: string;
  title: string;
  priority: Priority;
  status: Status;
  assigned_to: string | null;
  due_date: string | null;
  updated_at: string;
  revision?: number;
  base_revision?: number;
  [key: string]: unknown;
}

export interface Mutation {
  seq?: number;
  mutation_id: string;
  wo_id: string;
  type: MutationType;
  payload: string | MutationPayload;
  created_at: string;
}

export type SyncStatus = 'accepted' | 'duplicate' | 'rejected';

export interface SyncResult {
  accepted: number;
  duplicates: number;
  remaining: number;
  status?: SyncStatus;
}

export interface StatusHistory {
  id?: number;
  wo_id: string;
  from_status: Status | null;
  to_status: Status;
  changed_at: string;
  synced?: number;
}

export interface WorkOrderSource {
  fetchAll(): Promise<WorkOrder[]>;
}

export type FieldErrors = Partial<
  Record<'title' | 'asset_id' | 'priority' | 'status' | 'due_date', string>
>;

export interface SaveWorkOrderInput {
  wo_id?: string | null;
  asset_id?: string | null;
  title?: string | null;
  priority?: Priority | string | null;
  status?: Status | string | null;
  assigned_to?: string | null;
  due_date?: string | null;
}

export type SaveWorkOrderResult =
  | { success: true; order: WorkOrder; mutation_id: string; errors?: never }
  | { success: false; errors: FieldErrors; order?: never; mutation_id?: never };

export interface WorkOrderFilters {
  status?: Status | 'All';
  priority?: Priority | 'All' | 'Any';
}

export interface WorkOrderRepo {
  findById(id: string): Promise<WorkOrder | null>;
  list(filters?: WorkOrderFilters, referenceDate?: string): Promise<WorkOrder[]>;
  upsert(order: WorkOrder): Promise<void>;
  getNextWoId(): Promise<string>;
  setPendingSync(woId: string, pendingSync: number): Promise<void>;
  getStatusHistory(woId: string): Promise<StatusHistory[]>;
  insertStatusHistory(history: Omit<StatusHistory, 'id'>): Promise<void>;
  markStatusHistorySynced(woId: string): Promise<void>;
}

export interface OutboxRepo {
  insert(mutation: Omit<Mutation, 'seq'>): Promise<Mutation>;
  getAll(): Promise<Mutation[]>;
  delete(seq: number): Promise<void>;
  deleteBySeq(seq: number): Promise<void>;
  count(): Promise<number>;
  hasPendingForOrder(woId: string): Promise<boolean>;
}

export interface SettingsRepo {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  isOffline(): Promise<boolean>;
  setOffline(offline: boolean): Promise<void>;
}

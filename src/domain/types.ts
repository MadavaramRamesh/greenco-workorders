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


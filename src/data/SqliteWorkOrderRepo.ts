import type { SQLiteDatabase } from 'expo-sqlite';
import {
  StatusHistory,
  WorkOrder,
  WorkOrderFilters,
  WorkOrderRepo,
} from '../domain/types';
import { getDatabaseAsync } from './db';

export class SqliteWorkOrderRepo implements WorkOrderRepo {
  constructor(private db?: SQLiteDatabase) {}

  private async getDb(): Promise<SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }
    return getDatabaseAsync();
  }

  async findById(id: string): Promise<WorkOrder | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<WorkOrder>(
      'SELECT * FROM work_orders WHERE wo_id = ?;',
      id
    );
    return row ?? null;
  }

  async list(
    filters?: WorkOrderFilters,
    referenceDate: string = new Date().toISOString().slice(0, 10)
  ): Promise<WorkOrder[]> {
    const db = await this.getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.status && filters.status !== 'All') {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (
      filters?.priority &&
      filters.priority !== 'All' &&
      (filters.priority as any) !== 'Any'
    ) {
      conditions.push('priority = ?');
      params.push(filters.priority);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT * FROM work_orders
      ${whereClause}
      ORDER BY
        CASE
          WHEN status != 'Completed' AND due_date IS NOT NULL AND due_date < ? THEN 0
          ELSE 1
        END ASC,
        CASE priority
          WHEN 'Critical' THEN 0
          WHEN 'High' THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Low' THEN 3
          ELSE 4
        END ASC,
        CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
        due_date ASC,
        wo_id ASC;
    `;

    return db.getAllAsync<WorkOrder>(sql, [...params, referenceDate]);
  }

  async upsert(order: WorkOrder): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO work_orders (
        wo_id, asset_id, title, priority, status, assigned_to, due_date, updated_at, revision, pending_sync
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(wo_id) DO UPDATE SET
        asset_id = excluded.asset_id,
        title = excluded.title,
        priority = excluded.priority,
        status = excluded.status,
        assigned_to = excluded.assigned_to,
        due_date = excluded.due_date,
        updated_at = excluded.updated_at,
        revision = excluded.revision,
        pending_sync = excluded.pending_sync;`,
      order.wo_id,
      order.asset_id,
      order.title,
      order.priority,
      order.status,
      order.assigned_to ?? null,
      order.due_date ?? null,
      order.updated_at,
      order.revision ?? 1,
      order.pending_sync ?? 0
    );
  }

  async getNextWoId(): Promise<string> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ wo_id: string }>(
      "SELECT wo_id FROM work_orders WHERE wo_id LIKE 'WO-%';"
    );

    let maxNum = 1000;
    for (const row of rows) {
      const match = row.wo_id.match(/^WO-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    return `WO-${maxNum + 1}`;
  }

  async setPendingSync(woId: string, pendingSync: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE work_orders SET pending_sync = ? WHERE wo_id = ?;',
      pendingSync,
      woId
    );
  }

  async getStatusHistory(woId: string): Promise<StatusHistory[]> {
    const db = await this.getDb();
    return db.getAllAsync<StatusHistory>(
      'SELECT * FROM status_history WHERE wo_id = ? ORDER BY changed_at ASC, id ASC;',
      woId
    );
  }

  async insertStatusHistory(history: Omit<StatusHistory, 'id'>): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO status_history (
        wo_id, from_status, to_status, changed_at, synced
      ) VALUES (?, ?, ?, ?, ?);`,
      history.wo_id,
      history.from_status ?? null,
      history.to_status,
      history.changed_at,
      history.synced ?? 0
    );
  }

  async markStatusHistorySynced(woId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE status_history SET synced = 1 WHERE wo_id = ?;',
      woId
    );
  }
}


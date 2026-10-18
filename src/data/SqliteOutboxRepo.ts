import type { SQLiteDatabase } from 'expo-sqlite';
import { Mutation, OutboxRepo } from '../domain/types';
import { getDatabaseAsync } from './db';

export class SqliteOutboxRepo implements OutboxRepo {
  constructor(private db?: SQLiteDatabase) {}

  private async getDb(): Promise<SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }
    return getDatabaseAsync();
  }

  async insert(mutation: Omit<Mutation, 'seq'>): Promise<Mutation> {
    const db = await this.getDb();
    const payloadStr =
      typeof mutation.payload === 'string'
        ? mutation.payload
        : JSON.stringify(mutation.payload);

    const result = await db.runAsync(
      `INSERT INTO outbox (mutation_id, wo_id, type, payload, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      mutation.mutation_id,
      mutation.wo_id,
      mutation.type,
      payloadStr,
      mutation.created_at
    );

    return {
      ...mutation,
      seq: result.lastInsertRowId,
    };
  }

  async getAll(): Promise<Mutation[]> {
    const db = await this.getDb();
    return db.getAllAsync<Mutation>('SELECT * FROM outbox ORDER BY seq ASC;');
  }

  async delete(seq: number): Promise<void> {
    return this.deleteBySeq(seq);
  }

  async deleteBySeq(seq: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM outbox WHERE seq = ?;', seq);
  }

  async count(): Promise<number> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM outbox;'
    );
    return row?.count ?? 0;
  }

  async hasPendingForOrder(woId: string): Promise<boolean> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM outbox WHERE wo_id = ?;',
      woId
    );
    return (row?.count ?? 0) > 0;
  }
}


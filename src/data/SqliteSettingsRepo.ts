import type { SQLiteDatabase } from 'expo-sqlite';
import { SettingsRepo } from '../domain/types';
import { getDatabaseAsync } from './db';

export class SqliteSettingsRepo implements SettingsRepo {
  constructor(private db?: SQLiteDatabase) {}

  private async getDb(): Promise<SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }
    return getDatabaseAsync();
  }

  async get(key: string): Promise<string | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?;',
      key
    );
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
      key,
      value
    );
  }

  async isOffline(): Promise<boolean> {
    const value = await this.get('offline');
    return value === '1';
  }

  async setOffline(offline: boolean): Promise<void> {
    await this.set('offline', offline ? '1' : '0');
  }
}


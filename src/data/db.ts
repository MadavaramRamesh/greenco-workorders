import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'greenco.db';
export const TARGET_SCHEMA_VERSION = 1;

/**
 * Migration V1 DDL: client tables (work_orders, status_history, outbox, settings)
 * and mock server tables (server_orders, processed_mutations).
 */
const MIGRATION_V1_SQL = `
  CREATE TABLE IF NOT EXISTS work_orders (
    wo_id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    assigned_to TEXT,
    due_date TEXT,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    pending_sync INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (wo_id) REFERENCES work_orders(wo_id)
  );

  CREATE TABLE IF NOT EXISTS outbox (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    mutation_id TEXT NOT NULL UNIQUE,
    wo_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS server_orders (
    wo_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS processed_mutations (
    mutation_id TEXT PRIMARY KEY,
    processed_at TEXT NOT NULL
  );
`;

/**
 * Run database migrations using SQLite PRAGMA user_version.
 */
export async function migrateDb(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(MIGRATION_V1_SQL);
    await db.execAsync('PRAGMA user_version = 1;');
  }
}

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Open the database, configure pragma, and run migrations.
 * Caches the connection instance for app-wide use.
 */
export async function openAppDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await migrateDb(db);
      dbInstance = db;
      return db;
    })();
  }
  return dbPromise;
}

/**
 * Synchronously retrieve the active database instance.
 * Throws if openAppDatabase() has not been called and resolved yet.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database is not initialized. Call openAppDatabase() before getDatabase().');
  }
  return dbInstance;
}

/**
 * Asynchronously retrieve or initialize the database instance.
 */
export async function getDatabaseAsync(): Promise<SQLite.SQLiteDatabase> {
  return openAppDatabase();
}

/**
 * Reset database helper (useful for testing or full app state reset).
 */
export async function resetDatabase(db?: SQLite.SQLiteDatabase): Promise<void> {
  const targetDb = db ?? (await getDatabaseAsync());
  await targetDb.execAsync(`
    DROP TABLE IF EXISTS processed_mutations;
    DROP TABLE IF EXISTS server_orders;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS outbox;
    DROP TABLE IF EXISTS status_history;
    DROP TABLE IF EXISTS work_orders;
    PRAGMA user_version = 0;
  `);
  await migrateDb(targetDb);
}


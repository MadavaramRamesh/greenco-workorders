import type { SQLiteDatabase } from 'expo-sqlite';
import { WorkOrderSource } from '../domain/types';
import { JsonSeedSource } from './JsonSeedSource';

/**
 * Checks whether the database has already been seeded.
 */
export async function isDatabaseSeeded(db: SQLiteDatabase): Promise<boolean> {
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'seeded';"
  );
  if (setting?.value === '1') {
    return true;
  }

  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM work_orders;'
  );
  return (countRow?.count ?? 0) > 0;
}

/**
 * Seeds the database on first launch only.
 * Inserts all work orders, an initial status_history row per order,
 * and a copy into server_orders, all within a single transaction.
 */
export async function seedDatabaseIfEmpty(
  db: SQLiteDatabase,
  source: WorkOrderSource = new JsonSeedSource()
): Promise<boolean> {
  const alreadySeeded = await isDatabaseSeeded(db);
  if (alreadySeeded) {
    const countRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM work_orders;'
    );
    console.log(
      `[Seed] Database already seeded. Total work orders in DB: ${countRow?.count ?? 0}. Skipping seed.`
    );
    return false;
  }

  const orders = await source.fetchAll();

  await db.withTransactionAsync(async () => {
    for (const order of orders) {
      // 1. Insert into work_orders
      await db.runAsync(
        `INSERT INTO work_orders (
          wo_id, asset_id, title, priority, status, assigned_to, due_date, updated_at, revision, pending_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        order.wo_id,
        order.asset_id,
        order.title,
        order.priority,
        order.status,
        order.assigned_to ?? null,
        order.due_date ?? null,
        order.updated_at,
        order.revision ?? 1,
        0
      );

      // 2. Insert initial status_history row (synced = 1 because it reflects the initial server state)
      await db.runAsync(
        `INSERT INTO status_history (
          wo_id, from_status, to_status, changed_at, synced
        ) VALUES (?, ?, ?, ?, ?);`,
        order.wo_id,
        null,
        order.status,
        order.updated_at,
        1
      );

      // 3. Insert into server_orders (mock backend state)
      await db.runAsync(
        `INSERT INTO server_orders (
          wo_id, data, updated_at
        ) VALUES (?, ?, ?);`,
        order.wo_id,
        JSON.stringify(order),
        order.updated_at
      );
    }

    // Mark as seeded in settings and initialize default offline setting
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1');"
    );
    await db.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('offline', '0');"
    );
  });

  console.log(`[Seed] Seeded ${orders.length} work orders successfully.`);
  const checkCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM work_orders;'
  );
  console.log(`[Database] Total work orders in DB: ${checkCount?.count ?? 0}`);

  return true;
}


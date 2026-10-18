jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import {
  InMemoryOutboxRepo,
  InMemoryWorkOrderRepo,
} from './sync.test';
import { saveWorkOrder } from '../src/data/workOrderService';
import { getAssetGlyph, getAssetLabel } from '../src/domain/asset';
import { getOverdueDays, isOrderOverdue } from '../src/domain/urgency';
import { WorkOrder } from '../src/domain/types';

describe('Detail Screen & Step 6 Tests', () => {
  let workOrderRepo: InMemoryWorkOrderRepo;
  let outboxRepo: InMemoryOutboxRepo;
  let fakeDb: any;

  beforeEach(() => {
    workOrderRepo = new InMemoryWorkOrderRepo();
    outboxRepo = new InMemoryOutboxRepo();
    fakeDb = {
      withTransactionAsync: async (cb: () => Promise<void>) => {
        await cb();
      },
    };
  });

  describe('Mark Completed behavior', () => {
    it('updates status to Completed, increments revision, adds 1 outbox mutation, and adds 1 pending status_history entry', async () => {
      // 1. Initial work order (e.g. WO-1002 from seed)
      const initialOrder: WorkOrder = {
        wo_id: 'WO-1002',
        asset_id: 'INV-201',
        title: 'Review inverter fault',
        priority: 'Critical',
        status: 'In Progress',
        assigned_to: 'Technician B',
        due_date: '2026-10-16',
        updated_at: '2026-10-14T09:30:00Z',
        revision: 1,
        pending_sync: 0,
      };

      await workOrderRepo.upsert(initialOrder);

      // Initial status history row (as seeded from server)
      await workOrderRepo.insertStatusHistory({
        wo_id: 'WO-1002',
        from_status: 'Open',
        to_status: 'In Progress',
        changed_at: '2026-10-14T09:30:00Z',
        synced: 1,
      });

      expect(await outboxRepo.count()).toBe(0);
      const initialHistory = await workOrderRepo.getStatusHistory('WO-1002');
      expect(initialHistory.length).toBe(1);
      expect(initialHistory[0].synced).toBe(1);

      // 2. Mark Completed (calling saveWorkOrder with status 'Completed')
      const result = await saveWorkOrder(
        {
          wo_id: initialOrder.wo_id,
          asset_id: initialOrder.asset_id,
          title: initialOrder.title,
          priority: initialOrder.priority,
          status: 'Completed',
          assigned_to: initialOrder.assigned_to,
          due_date: initialOrder.due_date,
        },
        {
          workOrderRepo,
          outboxRepo,
          db: fakeDb,
        }
      );

      // Verify save result
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.order.status).toBe('Completed');
      expect(result.order.revision).toBe(2);
      expect(result.order.pending_sync).toBe(1);

      // Verify Exactly ONE outbox mutation was queued
      expect(await outboxRepo.count()).toBe(1);
      const mutations = await outboxRepo.getAll();
      expect(mutations[0].wo_id).toBe('WO-1002');
      expect(mutations[0].type).toBe('update');

      // Verify Exactly ONE new status_history row was added, with synced = 0 (Pending)
      const updatedHistory = await workOrderRepo.getStatusHistory('WO-1002');
      expect(updatedHistory.length).toBe(2);

      const latestHistory = updatedHistory[1];
      expect(latestHistory.from_status).toBe('In Progress');
      expect(latestHistory.to_status).toBe('Completed');
      expect(latestHistory.synced).toBe(0); // Pending sync badge
    });
  });

  describe('Urgency & Overdue calculation on Detail Screen', () => {
    const referenceDate = '2026-10-18';

    it('calculates overdue days correctly', () => {
      // Due 2026-10-16 relative to 2026-10-18 is 2 days overdue
      expect(getOverdueDays('2026-10-16', referenceDate)).toBe(2);
      // Due 2026-10-17 is 1 day overdue
      expect(getOverdueDays('2026-10-17', referenceDate)).toBe(1);
      // Due today (2026-10-18) is not overdue
      expect(getOverdueDays('2026-10-18', referenceDate)).toBe(0);
      // Due in future (2026-10-25) is not overdue
      expect(getOverdueDays('2026-10-25', referenceDate)).toBe(0);
      // Null due date is not overdue
      expect(getOverdueDays(null, referenceDate)).toBe(0);
    });

    it('does not treat completed orders as overdue even if due date is in the past', () => {
      const completedOrder: WorkOrder = {
        wo_id: 'WO-1004',
        asset_id: 'WTG-102',
        title: 'Lubrication schedule',
        priority: 'Low',
        status: 'Completed',
        assigned_to: 'Technician A',
        due_date: '2026-10-11',
        updated_at: '2026-10-14T10:30:00Z',
        revision: 4,
      };

      expect(isOrderOverdue(completedOrder, referenceDate)).toBe(false);
    });
  });

  describe('Asset presentation helpers', () => {
    it('formats human readable asset labels', () => {
      expect(getAssetLabel('INV-201')).toBe('Inverter INV-201');
      expect(getAssetLabel('WTG-101')).toBe('Wind Turbine WTG-101');
      expect(getAssetLabel('PMP-301')).toBe('Pump PMP-301');
      expect(getAssetLabel('GEN-500')).toBe('Equipment GEN-500');
    });

    it('returns appropriate iOS settings glyphs for asset categories', () => {
      expect(getAssetGlyph('WTG-101')).toBe('✇'); // Turbine
      expect(getAssetGlyph('INV-201')).toBe('⚡'); // Inverter
      expect(getAssetGlyph('PMP-301')).toBe('💧'); // Pump
      expect(getAssetGlyph('GEN-500')).toBe('⚙'); // Gear/fallback
    });
  });

  describe('History timestamp and stepper progression', () => {
    function formatHistoryTimestamp(isoStr: string): string {
      const d = new Date(isoStr);
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const isUtc = isoStr.endsWith('Z');
      const month = monthNames[isUtc ? d.getUTCMonth() : d.getMonth()];
      const day = isUtc ? d.getUTCDate() : d.getDate();
      const hours = String(isUtc ? d.getUTCHours() : d.getHours()).padStart(2, '0');
      const minutes = String(isUtc ? d.getUTCMinutes() : d.getMinutes()).padStart(2, '0');
      return `${month} ${day}, ${hours}:${minutes}`;
    }

    it('formats ISO timestamps to "MMM D, HH:mm" accurately', () => {
      expect(formatHistoryTimestamp('2026-10-14T09:30:00Z')).toBe('Oct 14, 09:30');
      expect(formatHistoryTimestamp('2026-10-13T14:10:00Z')).toBe('Oct 13, 14:10');
    });

    it('verifies progress stepper status progression logic', () => {
      const steps = ['Open', 'In Progress', 'Completed'];

      const getStepIndex = (s: string) => steps.indexOf(s);
      expect(getStepIndex('Open')).toBe(0);
      expect(getStepIndex('In Progress')).toBe(1);
      expect(getStepIndex('Completed')).toBe(2);

      // When In Progress (index 1): Open is completed, In Progress is current, Completed is future
      const currentIdx = getStepIndex('In Progress');
      expect(0 < currentIdx).toBe(true); // Open is past (completed)
      expect(1 === currentIdx).toBe(true); // In Progress is active
      expect(2 > currentIdx).toBe(true); // Completed is future
    });
  });
});

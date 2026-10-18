jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import {
  InMemoryOutboxRepo,
  InMemoryWorkOrderRepo,
} from './sync.test';
import { saveWorkOrder } from '../src/data/workOrderService';
import { validateWorkOrder, hasValidationErrors } from '../src/domain/validation';
import { WorkOrder } from '../src/domain/types';
import { dataEvents } from '../src/data/events';
import { PLANT_ASSETS, TECHNICIANS, formatDisplayDate } from '../src/domain/asset';

describe('Action Screen & Step 7 Tests', () => {
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

  describe('Validation (validateWorkOrder)', () => {
    it('returns an error when title is empty', () => {
      const errors = validateWorkOrder({
        title: '',
        asset_id: 'WTG-101',
        priority: 'Medium',
        status: 'Open',
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.title).toBe('Title is required');
    });

    it('returns an error when title is shorter than 3 characters', () => {
      const errors = validateWorkOrder({
        title: 'AB',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Open',
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.title).toBe('Title must be at least 3 characters');
    });

    it('returns an error when asset_id is missing', () => {
      const errors = validateWorkOrder({
        title: 'Valid Title Here',
        asset_id: '',
        priority: 'High',
        status: 'Open',
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.asset_id).toBe('Asset is required');
    });

    it('returns an error when priority is invalid', () => {
      const errors = validateWorkOrder({
        title: 'Valid Title Here',
        asset_id: 'WTG-101',
        priority: 'SuperUrgent' as any,
        status: 'Open',
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.priority).toBe('Priority must be Low, Medium, High, or Critical');
    });

    it('returns an error when status is invalid', () => {
      const errors = validateWorkOrder({
        title: 'Valid Title Here',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Archived' as any,
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.status).toBe('Status must be Open, In Progress, or Completed');
    });

    it('returns an error when due_date is invalid or not YYYY-MM-DD', () => {
      const errorsInvalidFormat = validateWorkOrder({
        title: 'Valid Title Here',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Open',
        due_date: '25-10-2026',
      });
      expect(errorsInvalidFormat.due_date).toBe('Due date must be in YYYY-MM-DD format');

      const errorsNonExistentCalendarDate = validateWorkOrder({
        title: 'Valid Title Here',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Open',
        due_date: '2026-02-30',
      });
      expect(errorsNonExistentCalendarDate.due_date).toBe('Due date must be a valid calendar date');
    });

    it('passes validation when all fields are valid', () => {
      const errors = validateWorkOrder({
        title: 'Valid Work Order Title',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'In Progress',
        due_date: '2026-10-28',
      });

      expect(hasValidationErrors(errors)).toBe(false);
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('Save Work Order Rejection on Validation Failure', () => {
    it('does NOT write anything to outbox or database when title is empty', async () => {
      const result = await saveWorkOrder(
        {
          title: '',
          asset_id: 'WTG-101',
          priority: 'High',
          status: 'Open',
          due_date: '2026-10-25',
        },
        {
          workOrderRepo,
          outboxRepo,
          db: fakeDb,
        }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.title).toBe('Title is required');

      // Verify nothing written
      expect(await outboxRepo.count()).toBe(0);
      const orders = await workOrderRepo.list();
      expect(orders.length).toBe(0);
    });
  });

  describe('Create Work Order (no id)', () => {
    it('creates a new order with revision 1, pending_sync = 1, and 1 outbox mutation', async () => {
      let workOrdersEventFired = false;
      let outboxEventFired = false;

      const unsub = dataEvents.subscribe((type) => {
        if (type === 'work_orders') workOrdersEventFired = true;
        if (type === 'outbox') outboxEventFired = true;
      });

      const result = await saveWorkOrder(
        {
          title: 'Install vibration sensor',
          asset_id: 'INV-201',
          priority: 'High',
          status: 'Open',
          assigned_to: 'Technician B',
          due_date: '2026-10-28',
        },
        {
          workOrderRepo,
          outboxRepo,
          db: fakeDb,
        }
      );

      unsub();

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Expected save to succeed');
      expect(result.order).toBeDefined();
      expect(result.order.wo_id).toMatch(/^WO-\d+$/);
      expect(result.order.title).toBe('Install vibration sensor');
      expect(result.order.asset_id).toBe('INV-201');
      expect(result.order.priority).toBe('High');
      expect(result.order.status).toBe('Open');
      expect(result.order.assigned_to).toBe('Technician B');
      expect(result.order.due_date).toBe('2026-10-28');
      expect(result.order.revision).toBe(1);
      expect(result.order.pending_sync).toBe(1);

      // Verify outbox has exactly 1 entry of type 'create'
      expect(await outboxRepo.count()).toBe(1);
      const outboxEntries = await outboxRepo.getAll();
      expect(outboxEntries[0].type).toBe('create');
      expect(outboxEntries[0].wo_id).toBe(result.order.wo_id);

      const payload = JSON.parse(outboxEntries[0].payload as string);
      expect(payload.base_revision).toBe(0);
      expect(payload.revision).toBe(1);

      // Verify status_history
      const history = await workOrderRepo.getStatusHistory(result.order.wo_id);
      expect(history.length).toBe(1);
      expect(history[0].to_status).toBe('Open');
      expect(history[0].synced).toBe(0);

      // Verify events were emitted
      expect(workOrdersEventFired).toBe(true);
      expect(outboxEventFired).toBe(true);
    });
  });

  describe('Edit Work Order (existing id)', () => {
    it('updates existing order, increments revision, sets pending_sync = 1, and adds 1 outbox mutation', async () => {
      const initialOrder: WorkOrder = {
        wo_id: 'WO-1001',
        asset_id: 'WTG-101',
        title: 'Inspect turbine gearbox',
        priority: 'High',
        status: 'Open',
        assigned_to: 'Technician A',
        due_date: '2026-10-19',
        updated_at: '2026-10-14T08:00:00Z',
        revision: 2,
        pending_sync: 0,
      };

      await workOrderRepo.upsert(initialOrder);
      expect(await outboxRepo.count()).toBe(0);

      const result = await saveWorkOrder(
        {
          wo_id: 'WO-1001',
          title: 'Inspect turbine gearbox - updated',
          asset_id: 'WTG-101',
          priority: 'Critical',
          status: 'In Progress',
          assigned_to: 'Technician B',
          due_date: '2026-10-22',
        },
        {
          workOrderRepo,
          outboxRepo,
          db: fakeDb,
        }
      );

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Expected save to succeed');
      expect(result.order.wo_id).toBe('WO-1001');
      expect(result.order.title).toBe('Inspect turbine gearbox - updated');
      expect(result.order.priority).toBe('Critical');
      expect(result.order.status).toBe('In Progress');
      expect(result.order.assigned_to).toBe('Technician B');
      expect(result.order.due_date).toBe('2026-10-22');
      expect(result.order.revision).toBe(3); // 2 -> 3
      expect(result.order.pending_sync).toBe(1);

      // Outbox check
      expect(await outboxRepo.count()).toBe(1);
      const outboxEntries = await outboxRepo.getAll();
      expect(outboxEntries[0].type).toBe('update');
      expect(outboxEntries[0].wo_id).toBe('WO-1001');

      const payload = JSON.parse(outboxEntries[0].payload as string);
      expect(payload.base_revision).toBe(2);
      expect(payload.revision).toBe(3);

      // Status history check
      const history = await workOrderRepo.getStatusHistory('WO-1001');
      expect(history.length).toBe(1);
      expect(history[0].from_status).toBe('Open');
      expect(history[0].to_status).toBe('In Progress');
      expect(history[0].synced).toBe(0);
    });
  });

  describe('Domain Helpers', () => {
    it('has PLANT_ASSETS and TECHNICIANS available', () => {
      expect(PLANT_ASSETS.length).toBeGreaterThan(0);
      expect(TECHNICIANS.length).toBeGreaterThan(0);
      expect(PLANT_ASSETS.find((a) => a.id === 'WTG-101')?.name).toBe('Wind Turbine WTG-101');
    });

    it('formats display dates correctly', () => {
      expect(formatDisplayDate('2026-10-22')).toContain('Oct');
      expect(formatDisplayDate('2026-10-22')).toContain('2026');
      expect(formatDisplayDate(null)).toBe('');
    });
  });
});

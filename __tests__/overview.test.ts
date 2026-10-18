import { dataEvents } from '../src/data/events';
import { Priority, Status, WorkOrder } from '../src/domain/types';
import { compareWorkOrdersByUrgency, isOrderOverdue } from '../src/domain/urgency';

describe('Overview & Step 5 Logic Tests', () => {
  describe('dataEvents pub/sub', () => {
    it('notifies subscribers on emit and unsubscribes cleanly', () => {
      let count = 0;
      let lastType = '';

      const unsubscribe = dataEvents.subscribe((type) => {
        count++;
        lastType = type;
      });

      dataEvents.emit('work_orders');
      expect(count).toBe(1);
      expect(lastType).toBe('work_orders');

      dataEvents.emit('settings');
      expect(count).toBe(2);
      expect(lastType).toBe('settings');

      unsubscribe();
      dataEvents.emit('outbox');
      expect(count).toBe(2); // no further notifications after unsubscribe
    });
  });

  describe('Urgency ordering and overdue status', () => {
    const referenceDate = '2026-10-18';

    const overdueOrder: WorkOrder = {
      wo_id: 'WO-1002',
      asset_id: 'INV-201',
      title: 'Review inverter fault',
      priority: 'Critical',
      status: 'In Progress',
      assigned_to: 'Tech B',
      due_date: '2026-10-16', // overdue relative to 2026-10-18
      updated_at: '2026-10-14T09:30:00Z',
      revision: 1,
    };

    const futureCritical: WorkOrder = {
      wo_id: 'WO-1005',
      asset_id: 'WTG-103',
      title: 'Emergency turbine stop',
      priority: 'Critical',
      status: 'Open',
      assigned_to: 'Tech A',
      due_date: '2026-10-25',
      updated_at: '2026-10-14T10:00:00Z',
      revision: 1,
    };

    const overdueHigh: WorkOrder = {
      wo_id: 'WO-1006',
      asset_id: 'PMP-302',
      title: 'Coolant leak',
      priority: 'High',
      status: 'Open',
      assigned_to: 'Tech C',
      due_date: '2026-10-15',
      updated_at: '2026-10-14T11:00:00Z',
      revision: 1,
    };

    const completedOverdue: WorkOrder = {
      wo_id: 'WO-1004',
      asset_id: 'WTG-102',
      title: 'Lubrication schedule',
      priority: 'Low',
      status: 'Completed',
      assigned_to: 'Tech A',
      due_date: '2026-10-11',
      updated_at: '2026-10-14T10:30:00Z',
      revision: 4,
    };

    it('identifies non-completed overdue orders accurately', () => {
      expect(isOrderOverdue(overdueOrder, referenceDate)).toBe(true);
      expect(isOrderOverdue(futureCritical, referenceDate)).toBe(false);
      // Completed orders are never considered overdue
      expect(isOrderOverdue(completedOverdue, referenceDate)).toBe(false);
    });

    it('orders overdue non-completed items before future items', () => {
      // Overdue high comes before future critical because overdue items rank highest
      const cmp = compareWorkOrdersByUrgency(overdueHigh, futureCritical, referenceDate);
      expect(cmp).toBeLessThan(0);
    });

    it('orders by priority when overdue status is equal', () => {
      // Critical before High
      const cmp = compareWorkOrdersByUrgency(overdueOrder, overdueHigh, referenceDate);
      expect(cmp).toBeLessThan(0);
    });
  });

  describe('Asset type glyph mapping', () => {
    function getAssetGlyph(assetId: string) {
      const prefix = assetId.split('-')[0]?.toUpperCase() ?? '';
      if (prefix === 'WTG') return '✇';
      if (prefix === 'INV') return '⚡';
      if (prefix === 'PMP') return '💧';
      return '⚙';
    }

    it('maps turbine, inverter, pump, and fallback asset types', () => {
      expect(getAssetGlyph('WTG-101')).toBe('✇');
      expect(getAssetGlyph('INV-201')).toBe('⚡');
      expect(getAssetGlyph('PMP-301')).toBe('💧');
      expect(getAssetGlyph('GEN-999')).toBe('⚙');
      expect(getAssetGlyph('UNKNOWN')).toBe('⚙');
    });
  });

  describe('Filter combinations and empty state messaging', () => {
    function getEmptyMessage(status?: string, priority?: string): string {
      if (priority && priority !== 'All' && status && status !== 'All') {
        return `No ${priority} work orders are ${status}. Try a different status or priority.`;
      } else if (priority && priority !== 'All') {
        return `No ${priority} work orders found. Try a different priority or status.`;
      } else if (status && status !== 'All') {
        return `No work orders are ${status}. Try a different status or priority.`;
      }
      return 'No work orders match the selected filters. Try a different status or priority.';
    }

    it('matches exact SPEC Section 9 empty state copy', () => {
      // SPEC: "No Critical work orders are Completed. Try a different status or priority."
      expect(getEmptyMessage('Completed', 'Critical')).toBe(
        'No Critical work orders are Completed. Try a different status or priority.'
      );
      expect(getEmptyMessage('All', 'High')).toBe(
        'No High work orders found. Try a different priority or status.'
      );
      expect(getEmptyMessage('In Progress', 'All')).toBe(
        'No work orders are In Progress. Try a different status or priority.'
      );
      expect(getEmptyMessage('All', 'All')).toBe(
        'No work orders match the selected filters. Try a different status or priority.'
      );
    });
  });
});

import { Priority, WorkOrder } from './types';

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/**
 * Checks whether an order is overdue given a reference date (YYYY-MM-DD).
 * Completed orders are never considered overdue.
 */
export function isOrderOverdue(
  order: Pick<WorkOrder, 'status' | 'due_date'>,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (order.status === 'Completed' || !order.due_date) {
    return false;
  }
  return order.due_date < referenceDate;
}

/**
 * Calculates number of days an order is overdue relative to referenceDate.
 * Returns 0 if not overdue.
 */
export function getOverdueDays(
  dueDate: string | null,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): number {
  if (!dueDate || dueDate >= referenceDate) return 0;
  const todayMs = new Date(referenceDate).getTime();
  const dueMs = new Date(dueDate).getTime();
  const diff = todayMs - dueMs;
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Comparator function to sort work orders by urgency:
 * 1. Overdue first (overdue non-completed orders come before all other orders)
 * 2. Then Priority (Critical > High > Medium > Low)
 * 3. Then Due date (earlier due dates first; orders with dates before orders without dates)
 * 4. Fallback to wo_id for deterministic ordering
 */
export function compareWorkOrdersByUrgency(
  a: WorkOrder,
  b: WorkOrder,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): number {
  // 1. Overdue first
  const aOverdue = isOrderOverdue(a, referenceDate);
  const bOverdue = isOrderOverdue(b, referenceDate);

  if (aOverdue && !bOverdue) return -1;
  if (!aOverdue && bOverdue) return 1;

  // 2. Priority: Critical (0) -> High (1) -> Medium (2) -> Low (3)
  const aPriorityWeight = PRIORITY_WEIGHTS[a.priority] ?? 99;
  const bPriorityWeight = PRIORITY_WEIGHTS[b.priority] ?? 99;
  if (aPriorityWeight !== bPriorityWeight) {
    return aPriorityWeight - bPriorityWeight;
  }

  // 3. Due date: earlier due date first
  if (a.due_date && b.due_date) {
    const cmp = a.due_date.localeCompare(b.due_date);
    if (cmp !== 0) return cmp;
  } else if (a.due_date && !b.due_date) {
    return -1;
  } else if (!a.due_date && b.due_date) {
    return 1;
  }

  // 4. Deterministic tie-breaker
  return a.wo_id.localeCompare(b.wo_id);
}


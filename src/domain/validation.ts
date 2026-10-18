import { FieldErrors, Priority, SaveWorkOrderInput, Status } from './types';

export const VALID_PRIORITIES: readonly Priority[] = ['Low', 'Medium', 'High', 'Critical'] as const;
export const VALID_STATUSES: readonly Status[] = ['Open', 'In Progress', 'Completed'] as const;

/**
 * Validates a work order input.
 *
 * Rules:
 * - title: required and at least 3 characters
 * - asset_id: required
 * - priority: must be one of 'Low', 'Medium', 'High', 'Critical'
 * - status: must be one of 'Open', 'In Progress', 'Completed'
 * - due_date: must be a valid calendar date in YYYY-MM-DD format
 *
 * Returns a dictionary of field errors (empty if completely valid).
 */
export function validateWorkOrder(input: SaveWorkOrderInput | Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {};

  // 1. Title validation: required and at least 3 characters
  const rawTitle = input.title;
  if (typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (rawTitle.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }

  // 2. Asset ID validation: required
  const rawAssetId = input.asset_id;
  if (typeof rawAssetId !== 'string' || rawAssetId.trim().length === 0) {
    errors.asset_id = 'Asset is required';
  }

  // 3. Priority validation: must be a valid value
  const rawPriority = input.priority;
  if (!rawPriority || !VALID_PRIORITIES.includes(rawPriority as Priority)) {
    errors.priority = 'Priority must be Low, Medium, High, or Critical';
  }

  // 4. Status validation: must be a valid value
  const rawStatus = input.status;
  if (!rawStatus || !VALID_STATUSES.includes(rawStatus as Status)) {
    errors.status = 'Status must be Open, In Progress, or Completed';
  }

  // 5. Due date validation: must be a valid YYYY-MM-DD date
  const rawDueDate = input.due_date;
  if (typeof rawDueDate !== 'string' || rawDueDate.trim().length === 0) {
    errors.due_date = 'Due date is required (YYYY-MM-DD)';
  } else {
    const trimmedDate = rawDueDate.trim();
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(trimmedDate)) {
      errors.due_date = 'Due date must be in YYYY-MM-DD format';
    } else {
      const [year, month, day] = trimmedDate.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      ) {
        errors.due_date = 'Due date must be a valid calendar date';
      }
    }
  }

  return errors;
}

/**
 * Checks whether a given field errors object contains any errors.
 */
export function hasValidationErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Convenience helper to check if an input is completely valid.
 */
export function isValidWorkOrder(input: SaveWorkOrderInput | Record<string, unknown>): boolean {
  return !hasValidationErrors(validateWorkOrder(input));
}


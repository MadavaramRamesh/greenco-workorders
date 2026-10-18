import { validateWorkOrder, hasValidationErrors, isValidWorkOrder } from '../src/domain/validation';

describe('Validation Tests (__tests__/validation.test.ts)', () => {
  describe('validateWorkOrder', () => {
    it('returns an error when title is empty', () => {
      const errors = validateWorkOrder({
        title: '',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Open',
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.title).toBe('Title is required');
    });

    it('returns an error when title is only whitespace', () => {
      const errors = validateWorkOrder({
        title: '   ',
        asset_id: 'WTG-101',
        priority: 'High',
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
        title: 'Inspect gearbox',
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
        title: 'Inspect gearbox',
        asset_id: 'WTG-101',
        priority: 'Urgent' as any,
        status: 'Open',
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.priority).toBe('Priority must be Low, Medium, High, or Critical');
    });

    it('returns an error when status is invalid', () => {
      const errors = validateWorkOrder({
        title: 'Inspect gearbox',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Closed' as any,
        due_date: '2026-10-25',
      });

      expect(hasValidationErrors(errors)).toBe(true);
      expect(errors.status).toBe('Status must be Open, In Progress, or Completed');
    });

    it('returns an error when due_date is invalid or malformed', () => {
      const errorsFormat = validateWorkOrder({
        title: 'Inspect gearbox',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Open',
        due_date: '2026/10/25',
      });
      expect(errorsFormat.due_date).toBe('Due date must be in YYYY-MM-DD format');

      const errorsCalendar = validateWorkOrder({
        title: 'Inspect gearbox',
        asset_id: 'WTG-101',
        priority: 'High',
        status: 'Open',
        due_date: '2026-02-31',
      });
      expect(errorsCalendar.due_date).toBe('Due date must be a valid calendar date');
    });

    it('passes validation when all fields are valid', () => {
      const validPayload = {
        title: 'Inspect wind turbine rotor',
        asset_id: 'WTG-101',
        priority: 'Critical' as const,
        status: 'In Progress' as const,
        due_date: '2026-10-25',
      };

      const errors = validateWorkOrder(validPayload);
      expect(hasValidationErrors(errors)).toBe(false);
      expect(isValidWorkOrder(validPayload)).toBe(true);
    });
  });
});


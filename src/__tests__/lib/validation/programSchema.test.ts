import { describe, it, expect } from 'vitest';
import { programSchema, programWithCrossValidation } from '$lib/validation/programSchema';

describe('programSchema', () => {
  describe('programId validation', () => {
    it('should accept valid program ID format', () => {
      const result = programSchema.safeParse({ programId: '25123' });
      expect(result.success).toBe(true);
    });

    it('should accept empty program ID (nullable/optional)', () => {
      const result = programSchema.safeParse({ programId: '' });
      expect(result.success).toBe(true);
    });

    it('should accept any program ID format (nullable/optional)', () => {
      const result = programSchema.safeParse({ programId: 'ABC123' });
      expect(result.success).toBe(true);
    });

    it('should accept program ID with any length (nullable/optional)', () => {
      const result = programSchema.safeParse({ programId: '123' });
      expect(result.success).toBe(true);
    });

    it('should accept null program ID', () => {
      const result = programSchema.safeParse({ programId: null });
      expect(result.success).toBe(true);
    });

    it('should accept undefined program ID', () => {
      const result = programSchema.safeParse({ programId: undefined });
      expect(result.success).toBe(true);
    });
  });

  describe('count validation', () => {
    it('should accept valid positive count', () => {
      const result = programSchema.safeParse({ programId: '25123', count: 100 });
      expect(result.success).toBe(true);
    });

    it('should accept zero count', () => {
      const result = programSchema.safeParse({ programId: '25123', count: 0 });
      expect(result.success).toBe(true);
    });

    it('should reject negative count', () => {
      const result = programSchema.safeParse({ programId: '25123', count: -5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('záporný');
      }
    });

    it('should reject decimal count', () => {
      const result = programSchema.safeParse({ programId: '25123', count: 5.5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('celé číslo');
      }
    });

    it('should reject count exceeding maximum', () => {
      const result = programSchema.safeParse({ programId: '25123', count: 1000000 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('příliš velký');
      }
    });
  });

  describe('name validation', () => {
    it('should accept valid name', () => {
      const result = programSchema.safeParse({ programId: '25123', name: 'Test Program' });
      expect(result.success).toBe(true);
    });

    it('should reject name exceeding maximum length', () => {
      const longName = 'a'.repeat(256);
      const result = programSchema.safeParse({ programId: '25123', name: longName });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Název je příliš dlouhý');
      }
    });

    it('should accept undefined name', () => {
      const result = programSchema.safeParse({ programId: '25123', name: undefined });
      expect(result.success).toBe(true);
    });
  });

  describe('date validation', () => {
    it('should accept valid dates', () => {
      const result = programSchema.safeParse({
        programId: '25123',
        deadlineAt: new Date('2025-12-31'),
        arrivedAt: new Date('2025-01-01'),
        doneAt: new Date('2025-06-01'),
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid date objects', () => {
      const result = programSchema.safeParse({
        programId: '25123',
        deadlineAt: new Date('invalid'),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('time field validation', () => {
    it('should accept valid time values', () => {
      const result = programSchema.safeParse({
        programId: '25123',
        preparing: 120,
        programing: 180,
        machineWorking: 300,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative time values', () => {
      const result = programSchema.safeParse({
        programId: '25123',
        preparing: -10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('záporný');
      }
    });

    it('should accept zero time values', () => {
      const result = programSchema.safeParse({
        programId: '25123',
        preparing: 0,
        programing: 0,
        machineWorking: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('note validation', () => {
    it('should accept valid notes', () => {
      const result = programSchema.safeParse({
        programId: '25123',
        note: 'This is a test note',
      });
      expect(result.success).toBe(true);
    });

    it('should reject notes exceeding maximum length', () => {
      const longNote = 'a'.repeat(2001);
      const result = programSchema.safeParse({
        programId: '25123',
        note: longNote,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Poznámka je příliš dlouhá');
      }
    });
  });
});

describe('programWithCrossValidation', () => {
  it('should accept program with doneAt and all required dates', () => {
    const result = programWithCrossValidation.safeParse({
      programId: '25123',
      arrivedAt: new Date('2025-01-01'),
      doneAt: new Date('2025-01-10'),
    });
    expect(result.success).toBe(true);
  });

  it('should accept program with doneAt but missing arrivedAt (optional cross-validation)', () => {
    // Cross-validation only checks if both are present
    const result = programWithCrossValidation.safeParse({
      programId: '25123',
      doneAt: new Date('2025-01-10'),
    });
    expect(result.success).toBe(true);
  });

  it('should reject program with doneAt before arrivedAt', () => {
    const result = programWithCrossValidation.safeParse({
      programId: '25123',
      arrivedAt: new Date('2025-01-10'),
      doneAt: new Date('2025-01-05'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Datum dokončení musí být po');
    }
  });

  it('should accept program without doneAt', () => {
    const result = programWithCrossValidation.safeParse({
      programId: '25123',
      arrivedAt: new Date('2025-01-01'),
    });
    expect(result.success).toBe(true);
  });
});

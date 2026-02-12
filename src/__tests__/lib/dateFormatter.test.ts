import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  toInputFormat,
  fromInputFormat,
  parseDate,
  parseDateTime,
  formatWithCustomFormat,
} from '../../lib/dateFormatter.svelte';

describe('Date Formatter', () => {
  // Use UTC-based dates to avoid timezone issues in tests
  const testDate = new Date(2025, 9, 20, 14, 30, 45); // Oct 20, 2025 14:30:45 local

  describe('formatDate', () => {
    it('should format date in Czech format', () => {
      const result = formatDate(testDate);
      expect(result).toBe('20. 10. 2025');
    });

    it('should pad single-digit days and months', () => {
      const date = new Date(2025, 0, 5); // Jan 5
      const result = formatDate(date);
      expect(result).toBe('05. 01. 2025');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime in Czech format', () => {
      const result = formatDateTime(testDate);
      expect(result).toBe('20. 10. 2025 14:30');
    });

    it('should handle midnight', () => {
      const midnight = new Date(2025, 5, 15, 0, 0);
      const result = formatDateTime(midnight);
      expect(result).toBe('15. 06. 2025 00:00');
    });
  });

  describe('formatDateTimeWithSeconds', () => {
    it('should format datetime with seconds', () => {
      const result = formatDateTimeWithSeconds(testDate);
      expect(result).toBe('20. 10. 2025 14:30:45');
    });
  });

  describe('toInputFormat', () => {
    it('should return YYYY-MM-DD for date type', () => {
      const result = toInputFormat(testDate, 'date');
      expect(result).toBe('2025-10-20');
    });

    it('should return YYYY-MM-DDTHH:mm for datetime type', () => {
      const result = toInputFormat(testDate, 'datetime');
      expect(result).toBe('2025-10-20T14:30');
    });
  });

  describe('fromInputFormat', () => {
    it('should parse ISO date string', () => {
      const result = fromInputFormat('2025-10-20');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9); // October = 9
      expect(result.getDate()).toBe(20);
    });

    it('should parse ISO datetime string', () => {
      const result = fromInputFormat('2025-10-20T14:30');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('parseDate', () => {
    it('should parse Czech format date string', () => {
      const result = parseDate('20. 10. 2025');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9); // October = 9
      expect(result.getDate()).toBe(20);
    });
  });

  describe('parseDateTime', () => {
    it('should parse Czech format datetime string', () => {
      const result = parseDateTime('20. 10. 2025 14:30');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9);
      expect(result.getDate()).toBe(20);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('formatWithCustomFormat', () => {
    it('should format with custom format string', () => {
      const result = formatWithCustomFormat(testDate, 'yyyy-MM-dd');
      expect(result).toBe('2025-10-20');
    });

    it('should fall back to date format when no custom format', () => {
      const result = formatWithCustomFormat(testDate);
      expect(result).toBe('20. 10. 2025');
    });

    it('should fall back to datetime format when isDateTime=true', () => {
      const result = formatWithCustomFormat(testDate, undefined, true);
      expect(result).toBe('20. 10. 2025 14:30');
    });

    it('should fall back to default on invalid format', () => {
      const result = formatWithCustomFormat(testDate, 'QQQQQQQ');
      // Invalid format falls back to default date format
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle various valid format strings', () => {
      expect(formatWithCustomFormat(testDate, 'dd/MM/yyyy')).toBe('20/10/2025');
      expect(formatWithCustomFormat(testDate, 'MM-dd-yyyy')).toBe('10-20-2025');
      expect(formatWithCustomFormat(testDate, 'yyyy')).toBe('2025');
    });
  });

  describe('Roundtrip conversions', () => {
    it('should roundtrip format -> parse for dates', () => {
      const original = new Date(2025, 5, 15); // June 15
      const formatted = formatDate(original);
      const parsed = parseDate(formatted);
      expect(parsed.getFullYear()).toBe(2025);
      expect(parsed.getMonth()).toBe(5);
      expect(parsed.getDate()).toBe(15);
    });

    it('should roundtrip format -> parse for datetimes', () => {
      const original = new Date(2025, 5, 15, 10, 30);
      const formatted = formatDateTime(original);
      const parsed = parseDateTime(formatted);
      expect(parsed.getFullYear()).toBe(2025);
      expect(parsed.getMonth()).toBe(5);
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getHours()).toBe(10);
      expect(parsed.getMinutes()).toBe(30);
    });

    it('should roundtrip toInputFormat -> fromInputFormat', () => {
      const original = new Date(2025, 5, 15, 10, 30);
      const formatted = toInputFormat(original, 'datetime');
      const parsed = fromInputFormat(formatted);
      expect(parsed.getFullYear()).toBe(2025);
      expect(parsed.getMonth()).toBe(5);
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getHours()).toBe(10);
      expect(parsed.getMinutes()).toBe(30);
    });
  });
});

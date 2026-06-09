import { describe, it, expect } from 'vitest';
import {
  hasValidIncrementalPlaceholder,
  previewIncrementalValue,
} from '../../lib/incrementalPattern';

// Fixed clock so date-based previews are deterministic: 2024-03-07.
const FIXED = new Date(2024, 2, 7);

describe('hasValidIncrementalPlaceholder', () => {
  it('rejects patterns without curly-brace placeholders (the reported bug)', () => {
    expect(hasValidIncrementalPlaceholder('RR###')).toBe(false);
    expect(hasValidIncrementalPlaceholder('YY-###')).toBe(false);
    expect(hasValidIncrementalPlaceholder('plain text')).toBe(false);
    expect(hasValidIncrementalPlaceholder('')).toBe(false);
  });

  it('accepts a sequence placeholder', () => {
    expect(hasValidIncrementalPlaceholder('{###}')).toBe(true);
    expect(hasValidIncrementalPlaceholder('{#####}')).toBe(true);
  });

  it('accepts date placeholders', () => {
    expect(hasValidIncrementalPlaceholder('{YY}')).toBe(true);
    expect(hasValidIncrementalPlaceholder('{YYYY}')).toBe(true);
    expect(hasValidIncrementalPlaceholder('{MM}')).toBe(true);
    expect(hasValidIncrementalPlaceholder('{DD}')).toBe(true);
  });

  it('accepts combined patterns', () => {
    expect(hasValidIncrementalPlaceholder('{YY}{###}')).toBe(true);
    expect(hasValidIncrementalPlaceholder('NC-{YYYY}-{####}')).toBe(true);
  });
});

describe('previewIncrementalValue', () => {
  it('returns null for patterns with no recognized placeholder', () => {
    expect(previewIncrementalValue('RR###', FIXED)).toBeNull();
    expect(previewIncrementalValue('', FIXED)).toBeNull();
  });

  it('zero-pads the sequence to the number of hashes, starting at 1', () => {
    expect(previewIncrementalValue('{###}', FIXED)).toBe('001');
    expect(previewIncrementalValue('{#####}', FIXED)).toBe('00001');
  });

  it('substitutes date tokens', () => {
    expect(previewIncrementalValue('{YYYY}', FIXED)).toBe('2024');
    expect(previewIncrementalValue('{YY}', FIXED)).toBe('24');
    expect(previewIncrementalValue('{MM}', FIXED)).toBe('03');
    expect(previewIncrementalValue('{DD}', FIXED)).toBe('07');
  });

  it('substitutes a combined pattern', () => {
    expect(previewIncrementalValue('{YY}{###}', FIXED)).toBe('24001');
    expect(previewIncrementalValue('NC-{YYYY}-{####}', FIXED)).toBe('NC-2024-0001');
  });

  it('keeps surrounding literal text', () => {
    expect(previewIncrementalValue('PRG_{MM}{DD}_{##}', FIXED)).toBe('PRG_0307_01');
  });
});

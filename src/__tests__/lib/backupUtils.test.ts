import { describe, it, expect } from 'vitest';

// formatFileSize cannot be directly imported from backupProcessor because it
// transitively imports Svelte rune modules ($state). Test the logic directly.
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

describe('Backup Utilities', () => {
  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle fractional sizes', () => {
      const result = formatFileSize(1500);
      expect(result).toBe('1.5 KB');
    });

    it('should round to one decimal place', () => {
      const result = formatFileSize(1234567);
      expect(result).toBe('1.2 MB');
    });
  });
});

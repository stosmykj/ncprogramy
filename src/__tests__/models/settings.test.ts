import { describe, it, expect } from 'vitest';
import { Settings } from '../../models/settings';
import type { DbSettings } from '../../models/dbSettings';

describe('Settings Model', () => {
  const mockDbSettings: DbSettings = {
    id: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    key: 'theme',
    type: 'string',
    value: 'dark',
  };

  describe('Constructor', () => {
    it('should create settings with all fields', () => {
      const settings = new Settings(mockDbSettings);
      expect(settings.Id).toBe(1);
      expect(settings.Key).toBe('theme');
      expect(settings.Type).toBe('string');
      expect(settings.Value).toBe('dark');
    });

    it('should create settings with minimal fields', () => {
      const settings = new Settings({ key: 'test', type: 'boolean' });
      expect(settings.Id).toBeUndefined();
      expect(settings.Key).toBe('test');
      expect(settings.Type).toBe('boolean');
      expect(settings.Value).toBeUndefined();
    });

    it('should handle undefined value', () => {
      const settings = new Settings({ key: 'test', type: 'number', value: undefined });
      expect(settings.Value).toBeUndefined();
    });
  });

  describe('Getters and Setters', () => {
    it('should set and get Id', () => {
      const settings = new Settings(mockDbSettings);
      settings.Id = 42;
      expect(settings.Id).toBe(42);
    });

    it('should set and get Key', () => {
      const settings = new Settings(mockDbSettings);
      settings.Key = 'new_key';
      expect(settings.Key).toBe('new_key');
    });

    it('should set and get Type', () => {
      const settings = new Settings(mockDbSettings);
      settings.Type = 'number';
      expect(settings.Type).toBe('number');
    });

    it('should set and get Value', () => {
      const settings = new Settings(mockDbSettings);
      settings.Value = 'new_value';
      expect(settings.Value).toBe('new_value');
    });

    it('should set and get CreatedAt', () => {
      const settings = new Settings(mockDbSettings);
      const date = new Date('2025-06-01');
      settings.CreatedAt = date;
      expect(settings.CreatedAt).toEqual(date);
    });

    it('should set and get UpdatedAt', () => {
      const settings = new Settings(mockDbSettings);
      const date = new Date('2025-06-01');
      settings.UpdatedAt = date;
      expect(settings.UpdatedAt).toEqual(date);
    });
  });

  describe('toSqlInsert', () => {
    it('should return valid INSERT SQL with positional parameters', () => {
      const settings = new Settings(mockDbSettings);
      const sql = settings.toSqlInsert();
      expect(sql).toContain('INSERT INTO settings');
      expect(sql).toContain('key, type, value');
      expect(sql).toContain('$1, $2, $3');
    });
  });

  describe('toSqlUpdate', () => {
    it('should return valid UPDATE SQL with positional parameters', () => {
      const settings = new Settings(mockDbSettings);
      const sql = settings.toSqlUpdate();
      expect(sql).toContain('UPDATE settings SET');
      expect(sql).toContain('updatedAt = CURRENT_TIMESTAMP');
      expect(sql).toContain('value = $3');
      expect(sql).toContain('WHERE id=$4');
    });
  });

  describe('toArray', () => {
    it('should return array with correct order [key, type, value, id]', () => {
      const settings = new Settings(mockDbSettings);
      const arr = settings.toArray();
      expect(arr).toEqual(['theme', 'string', 'dark', 1]);
    });

    it('should handle undefined value by converting to undefined', () => {
      const settings = new Settings({ key: 'test', type: 'boolean' });
      const arr = settings.toArray();
      expect(arr).toEqual(['test', 'boolean', undefined, undefined]);
    });

    it('should convert numeric value to string', () => {
      const settings = new Settings({ key: 'zoom', type: 'number', value: '150' });
      const arr = settings.toArray();
      expect(arr[2]).toBe('150');
    });

    it('should have correct length for SQL parameter binding', () => {
      const settings = new Settings(mockDbSettings);
      const arr = settings.toArray();
      // toArray returns 4 elements: key, type, value, id
      // toSqlUpdate uses $3 (value) and $4 (id) from these positions
      expect(arr.length).toBe(4);
    });
  });
});

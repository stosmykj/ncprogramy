import { describe, it, expect } from 'vitest';
import { Program } from '../../models/program';
import type { DbProgram } from '../../models/dbProgram';

describe('Program Model', () => {
  const mockDbProgram: DbProgram = {
    id: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    programId: '25123',
    name: 'Test Program',
    order_number: 'ORD-001',
    deadlineAt: '2025-12-31T00:00:00Z',
    arrivedAt: '2025-01-15T00:00:00Z',
    doneAt: '2025-02-01T00:00:00Z',
    count: 100,
    design: JSON.stringify({ name: 'design.pdf', path: '/files/design.pdf', extension: 'pdf' }),
    drawing: JSON.stringify({ name: 'drawing.pdf', path: '/files/drawing.pdf', extension: 'pdf' }),
    clamping: JSON.stringify({ name: 'clamping.pdf', path: '/files/clamping.pdf', extension: 'pdf' }),
    preparing: 120,
    programing: 180,
    machineWorking: 300,
    extraTime: '2 hours',
    note: 'Test note',
  };

  describe('Constructor', () => {
    it('should create program with all fields', () => {
      const program = new Program(mockDbProgram);

      expect(program.Id).toBe(1);
      expect(program.get('programId')).toBe('25123');
      expect(program.get('name')).toBe('Test Program');
      expect(program.get('order_number')).toBe('ORD-001');
      expect(program.get('count')).toBe(100);
      expect(program.get('preparing')).toBe(120);
      expect(program.get('programing')).toBe(180);
      expect(program.get('machineWorking')).toBe(300);
      expect(program.get('extraTime')).toBe('2 hours');
      expect(program.get('note')).toBe('Test note');
    });

    it('should create program with minimal fields', () => {
      const minimalDb: DbProgram = {
        programId: '25456',
      };
      const program = new Program(minimalDb);

      expect(program.get('programId')).toBe('25456');
      expect(program.Id).toBeUndefined();
      expect(program.get('name')).toBeUndefined();
      expect(program.get('count')).toBeUndefined();
    });

    it('should convert createdAt and updatedAt strings to Date objects', () => {
      const program = new Program(mockDbProgram);

      expect(program.CreatedAt).toBeInstanceOf(Date);
      expect(program.UpdatedAt).toBeInstanceOf(Date);
      expect(program.CreatedAt!.toISOString()).toBe('2025-01-01T00:00:00.000Z');
      expect(program.UpdatedAt!.toISOString()).toBe('2025-01-02T00:00:00.000Z');
    });

    it('should default createdAt and updatedAt to now when dbRow is provided but dates are missing', () => {
      const before = new Date();
      const program = new Program({ programId: '25789' });
      const after = new Date();

      expect(program.CreatedAt).toBeInstanceOf(Date);
      expect(program.UpdatedAt).toBeInstanceOf(Date);
      expect(program.CreatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(program.CreatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store date-like string fields as raw strings in dynamic data', () => {
      const program = new Program(mockDbProgram);

      // deadlineAt, arrivedAt, doneAt are stored as-is (strings) in dynamic data
      // because parseValue does not convert date strings to Date objects
      expect(program.get('deadlineAt')).toBe('2025-12-31T00:00:00Z');
      expect(program.get('arrivedAt')).toBe('2025-01-15T00:00:00Z');
      expect(program.get('doneAt')).toBe('2025-02-01T00:00:00Z');
    });

    it('should handle undefined values gracefully', () => {
      const dbProgram: DbProgram = {
        programId: '25789',
        deadlineAt: undefined,
        arrivedAt: undefined,
        doneAt: undefined,
      };
      const program = new Program(dbProgram);

      expect(program.get('deadlineAt')).toBeUndefined();
      expect(program.get('arrivedAt')).toBeUndefined();
      expect(program.get('doneAt')).toBeUndefined();
    });

    it('should parse File JSON strings with path and extension into File objects', () => {
      const program = new Program(mockDbProgram);

      const design = program.get('design');
      const drawing = program.get('drawing');
      const clamping = program.get('clamping');

      expect(design).toBeDefined();
      expect(drawing).toBeDefined();
      expect(clamping).toBeDefined();

      // They should be File instances since the JSON has path + extension
      expect(design!.constructor.name).toBe('File');
      expect(drawing!.constructor.name).toBe('File');
      expect(clamping!.constructor.name).toBe('File');
    });

    it('should not parse JSON strings without extension as File objects', () => {
      const dbRow: DbProgram = {
        programId: '25123',
        someFile: JSON.stringify({ name: 'file.pdf', path: '/files/file.pdf' }),
      };
      const program = new Program(dbRow);

      // Without 'extension' property, it stays as a raw string
      expect(typeof program.get('someFile')).toBe('string');
    });

    it('should not include id, createdAt, updatedAt in dynamic data', () => {
      const program = new Program(mockDbProgram);
      const data = program.getData();

      expect('id' in data).toBe(false);
      expect('createdAt' in data).toBe(false);
      expect('updatedAt' in data).toBe(false);
    });

    it('should leave id undefined when not provided', () => {
      const program = new Program({ programId: '25123' });
      expect(program.Id).toBeUndefined();
    });

    it('should create empty program when no argument is given', () => {
      const program = new Program();

      expect(program.Id).toBeUndefined();
      expect(program.CreatedAt).toBeUndefined();
      expect(program.UpdatedAt).toBeUndefined();
      expect(Object.keys(program.getData())).toHaveLength(0);
    });
  });

  describe('get() and set()', () => {
    it('should get and set dynamic properties', () => {
      const program = new Program({ programId: '25123' });
      expect(program.get('programId')).toBe('25123');

      program.set('programId', '25456');
      expect(program.get('programId')).toBe('25456');
    });

    it('should set a new dynamic property', () => {
      const program = new Program({ programId: '25123' });
      program.set('name', 'New Name');
      expect(program.get('name')).toBe('New Name');
    });

    it('should set numeric dynamic properties', () => {
      const program = new Program({ programId: '25123' });
      program.set('count', 200);
      expect(program.get('count')).toBe(200);
    });

    it('should set date values via set()', () => {
      const program = new Program({ programId: '25123' });
      const newDate = new Date('2025-06-15');

      program.set('deadlineAt', newDate);
      expect(program.get('deadlineAt')).toBe(newDate);

      program.set('arrivedAt', newDate);
      expect(program.get('arrivedAt')).toBe(newDate);

      program.set('doneAt', newDate);
      expect(program.get('doneAt')).toBe(newDate);
    });

    it('should access fixed properties via get()', () => {
      const program = new Program(mockDbProgram);

      expect(program.get('id')).toBe(1);
      expect(program.get('createdAt')).toBeInstanceOf(Date);
      expect(program.get('updatedAt')).toBeInstanceOf(Date);
    });

    it('should set fixed properties via set()', () => {
      const program = new Program({ programId: '25123' });

      program.set('id', 42);
      expect(program.Id).toBe(42);
      expect(program.get('id')).toBe(42);

      const date = new Date('2025-03-01');
      program.set('createdAt', date);
      expect(program.CreatedAt).toBe(date);

      program.set('updatedAt', date);
      expect(program.UpdatedAt).toBe(date);
    });

    it('should return undefined for unset dynamic property', () => {
      const program = new Program({ programId: '25123' });
      expect(program.get('nonExistent')).toBeUndefined();
    });
  });

  describe('Id, CreatedAt, UpdatedAt getters/setters', () => {
    it('should get and set Id', () => {
      const program = new Program(mockDbProgram);
      expect(program.Id).toBe(1);

      program.Id = 99;
      expect(program.Id).toBe(99);
    });

    it('should get and set CreatedAt', () => {
      const program = new Program(mockDbProgram);
      const newDate = new Date('2025-05-01');

      program.CreatedAt = newDate;
      expect(program.CreatedAt).toBe(newDate);
    });

    it('should get and set UpdatedAt', () => {
      const program = new Program(mockDbProgram);
      const newDate = new Date('2025-05-01');

      program.UpdatedAt = newDate;
      expect(program.UpdatedAt).toBe(newDate);
    });

    it('should allow setting Id to undefined', () => {
      const program = new Program(mockDbProgram);
      program.Id = undefined;
      expect(program.Id).toBeUndefined();
    });
  });

  describe('getData()', () => {
    it('should return all dynamic data', () => {
      const program = new Program(mockDbProgram);
      const data = program.getData();

      expect(data.programId).toBe('25123');
      expect(data.name).toBe('Test Program');
      expect(data.order_number).toBe('ORD-001');
      expect(data.count).toBe(100);
      expect(data.preparing).toBe(120);
      expect(data.programing).toBe(180);
      expect(data.machineWorking).toBe(300);
      expect(data.extraTime).toBe('2 hours');
      expect(data.note).toBe('Test note');
    });

    it('should not include id, createdAt, updatedAt', () => {
      const program = new Program(mockDbProgram);
      const data = program.getData();

      expect(data.id).toBeUndefined();
      expect(data.createdAt).toBeUndefined();
      expect(data.updatedAt).toBeUndefined();
    });

    it('should return a copy, not a reference', () => {
      const program = new Program(mockDbProgram);
      const data = program.getData();

      data.programId = 'MODIFIED';
      expect(program.get('programId')).toBe('25123');
    });

    it('should return empty object for empty program', () => {
      const program = new Program();
      const data = program.getData();
      expect(Object.keys(data)).toHaveLength(0);
    });
  });

  describe('toRecord()', () => {
    it('should return all properties including fixed ones', () => {
      const program = new Program(mockDbProgram);
      const record = program.toRecord();

      expect(record.id).toBe(1);
      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.updatedAt).toBeInstanceOf(Date);
      expect(record.programId).toBe('25123');
      expect(record.name).toBe('Test Program');
      expect(record.count).toBe(100);
    });

    it('should include undefined id when not set', () => {
      const program = new Program({ programId: '25123' });
      const record = program.toRecord();

      expect('id' in record).toBe(true);
      expect(record.id).toBeUndefined();
    });
  });

  describe('toValues()', () => {
    it('should return serialized values for given column keys', () => {
      const program = new Program(mockDbProgram);
      const values = program.toValues(['programId', 'name', 'count']);

      expect(values).toEqual(['25123', 'Test Program', 100]);
    });

    it('should serialize Date values to ISO strings', () => {
      const program = new Program(mockDbProgram);
      const values = program.toValues(['createdAt', 'updatedAt']);

      expect(values[0]).toBe('2025-01-01T00:00:00.000Z');
      expect(values[1]).toBe('2025-01-02T00:00:00.000Z');
    });

    it('should return null for undefined values', () => {
      const program = new Program({ programId: '25123' });
      const values = program.toValues(['name', 'count', 'nonExistent']);

      expect(values).toEqual([null, null, null]);
    });

    it('should serialize File objects to JSON strings', () => {
      const program = new Program(mockDbProgram);
      const values = program.toValues(['design']);

      expect(typeof values[0]).toBe('string');
      const parsed = JSON.parse(values[0] as string);
      expect(parsed.path).toBe('/files/design.pdf');
    });

    it('should serialize id as a number', () => {
      const program = new Program(mockDbProgram);
      const values = program.toValues(['id']);

      expect(values[0]).toBe(1);
    });

    it('should handle mixed column keys', () => {
      const program = new Program(mockDbProgram);
      const values = program.toValues(['id', 'programId', 'createdAt', 'count', 'name']);

      expect(values[0]).toBe(1);
      expect(values[1]).toBe('25123');
      expect(values[2]).toBe('2025-01-01T00:00:00.000Z');
      expect(values[3]).toBe(100);
      expect(values[4]).toBe('Test Program');
    });

    it('should return empty array for empty column keys', () => {
      const program = new Program(mockDbProgram);
      const values = program.toValues([]);

      expect(values).toEqual([]);
    });
  });

  describe('toSqlDelete()', () => {
    it('should generate SQL DELETE statement', () => {
      const program = new Program({ programId: '25123' });
      const sql = program.toSqlDelete();

      expect(sql).toBe('DELETE FROM programs WHERE id=$1');
    });
  });

  describe('serializeValue()', () => {
    it('should return null for undefined', () => {
      const program = new Program();
      expect(program.serializeValue(undefined)).toBeNull();
    });

    it('should return null for null', () => {
      const program = new Program();
      expect(program.serializeValue(null)).toBeNull();
    });

    it('should return ISO string for Date', () => {
      const program = new Program();
      const date = new Date('2025-06-15T00:00:00Z');
      expect(program.serializeValue(date)).toBe('2025-06-15T00:00:00.000Z');
    });

    it('should return number for number', () => {
      const program = new Program();
      expect(program.serializeValue(42)).toBe(42);
    });

    it('should return string for string', () => {
      const program = new Program();
      expect(program.serializeValue('hello')).toBe('hello');
    });

    it('should return JSON string for plain objects', () => {
      const program = new Program();
      const result = program.serializeValue({ foo: 'bar' });
      expect(result).toBe('{"foo":"bar"}');
    });
  });

  describe('getKeys()', () => {
    it('should return all keys including fixed ones', () => {
      const program = new Program(mockDbProgram);
      const keys = program.getKeys();

      expect(keys).toContain('id');
      expect(keys).toContain('createdAt');
      expect(keys).toContain('updatedAt');
      expect(keys).toContain('programId');
      expect(keys).toContain('name');
      expect(keys).toContain('count');
    });

    it('should always start with fixed keys', () => {
      const program = new Program(mockDbProgram);
      const keys = program.getKeys();

      expect(keys[0]).toBe('id');
      expect(keys[1]).toBe('createdAt');
      expect(keys[2]).toBe('updatedAt');
    });

    it('should return only fixed keys for empty program', () => {
      const program = new Program();
      const keys = program.getKeys();

      expect(keys).toEqual(['id', 'createdAt', 'updatedAt']);
    });
  });

  describe('setData()', () => {
    it('should set multiple values at once', () => {
      const program = new Program();
      program.setData({
        programId: '25999',
        name: 'Bulk Set',
        count: 50,
      });

      expect(program.get('programId')).toBe('25999');
      expect(program.get('name')).toBe('Bulk Set');
      expect(program.get('count')).toBe(50);
    });

    it('should set fixed properties when included in data', () => {
      const program = new Program();
      program.setData({ id: 7 });

      expect(program.Id).toBe(7);
    });
  });
});

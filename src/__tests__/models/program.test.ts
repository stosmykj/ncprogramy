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
    design: JSON.stringify({ name: 'design.pdf', path: '/files/design.pdf' }),
    drawing: JSON.stringify({ name: 'drawing.pdf', path: '/files/drawing.pdf' }),
    clamping: JSON.stringify({ name: 'clamping.pdf', path: '/files/clamping.pdf' }),
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
      expect(program.ProgramId).toBe('25123');
      expect(program.Name).toBe('Test Program');
      expect(program.OrderNumber).toBe('ORD-001');
      expect(program.Count).toBe(100);
      expect(program.Preparing).toBe(120);
      expect(program.Programing).toBe(180);
      expect(program.MachineWorking).toBe(300);
      expect(program.ExtraTime).toBe('2 hours');
      expect(program.Note).toBe('Test note');
    });

    it('should create program with minimal fields', () => {
      const minimalDb: DbProgram = {
        programId: '25456',
      };
      const program = new Program(minimalDb);

      expect(program.ProgramId).toBe('25456');
      expect(program.Id).toBeUndefined();
      expect(program.Name).toBeUndefined();
      expect(program.Count).toBeUndefined();
    });

    it('should convert date strings to Date objects', () => {
      const program = new Program(mockDbProgram);

      expect(program.CreatedAt).toBeInstanceOf(Date);
      expect(program.UpdatedAt).toBeInstanceOf(Date);
      expect(program.DeadlineAt).toBeInstanceOf(Date);
      expect(program.ArrivedAt).toBeInstanceOf(Date);
      expect(program.DoneAt).toBeInstanceOf(Date);
    });

    it('should handle missing dates gracefully', () => {
      const dbProgram: DbProgram = {
        programId: '25789',
        deadlineAt: undefined,
        arrivedAt: undefined,
        doneAt: undefined,
      };
      const program = new Program(dbProgram);

      expect(program.DeadlineAt).toBeUndefined();
      expect(program.ArrivedAt).toBeUndefined();
      expect(program.DoneAt).toBeUndefined();
    });

    it('should parse File JSON strings', () => {
      const program = new Program(mockDbProgram);

      expect(program.Design).toBeDefined();
      expect(program.Drawing).toBeDefined();
      expect(program.Clamping).toBeDefined();
    });
  });

  describe('Getters and Setters', () => {
    it('should get and set ProgramId', () => {
      const program = new Program({ programId: '25123' });
      expect(program.ProgramId).toBe('25123');

      program.ProgramId = '25456';
      expect(program.ProgramId).toBe('25456');
    });

    it('should get and set Name', () => {
      const program = new Program({ programId: '25123' });
      program.Name = 'New Name';
      expect(program.Name).toBe('New Name');
    });

    it('should get and set Count', () => {
      const program = new Program({ programId: '25123' });
      program.Count = 200;
      expect(program.Count).toBe(200);
    });

    it('should get and set dates', () => {
      const program = new Program({ programId: '25123' });
      const newDate = new Date('2025-06-15');

      program.DeadlineAt = newDate;
      expect(program.DeadlineAt).toBe(newDate);

      program.ArrivedAt = newDate;
      expect(program.ArrivedAt).toBe(newDate);

      program.DoneAt = newDate;
      expect(program.DoneAt).toBe(newDate);
    });
  });

  describe('SQL Methods', () => {
    it('should generate SQL INSERT statement', () => {
      const program = new Program({ programId: '25123' });
      const sql = program.toSqlInsert();

      expect(sql).toContain('INSERT INTO programs');
      expect(sql).toContain('programId');
      expect(sql).toContain('name');
      expect(sql).toContain('count');
    });

    it('should generate SQL UPDATE statement', () => {
      const program = new Program({ programId: '25123' });
      const sql = program.toSqlUpdate();

      expect(sql).toContain('UPDATE programs SET');
      expect(sql).toContain('programId = $1');
      expect(sql).toContain('WHERE id=$16');
    });

    it('should generate SQL DELETE statement', () => {
      const program = new Program({ programId: '25123' });
      const sql = program.toSqlDelete();

      expect(sql).toBe('DELETE FROM programs WHERE id=$1');
    });

    it('should convert to array for SQL parameters', () => {
      const program = new Program(mockDbProgram);
      const arr = program.toArray();

      expect(arr).toBeInstanceOf(Array);
      expect(arr[0]).toBe('25123'); // programId
      expect(arr[1]).toBe('Test Program'); // name
      expect(arr[6]).toBe(100); // count
    });

    it('should convert to array for import', () => {
      const program = new Program(mockDbProgram);
      const arr = program.toArrayImport();

      expect(arr).toBeInstanceOf(Array);
      expect(typeof arr[0]).toBe('string'); // createdAt as ISO string
      expect(arr[0]).toBe('2025-01-01T00:00:00.000Z'); // createdAt
      expect(arr[2]).toBe('25123'); // programId
    });
  });

  describe('Static Methods', () => {
    it('should create Program from import data', () => {
      const importData = {
        program: '25999',
        nazev: 'Imported Program',
        ks: 50,
        TimeCreated: new Date('2025-01-01'),
        TimeEdited: new Date('2025-01-02'),
        termin: new Date('2025-12-31'),
        dorazilo: new Date('2025-01-15'),
        hotovo: new Date('2025-02-01'),
        pripr: 60,
        prog: 90,
        obrab: 150,
        dalsiCas: '1 hour',
        poznamka: 'Import note',
        zakazkac: 'IMP-001',
      };

      const program = Program.fromImport(importData);

      expect(program.ProgramId).toBe('25999');
      expect(program.Name).toBe('Imported Program');
      expect(program.Count).toBe(50);
      expect(program.OrderNumber).toBe('IMP-001');
      expect(program.Preparing).toBe(60);
      expect(program.Programing).toBe(90);
      expect(program.MachineWorking).toBe(150);
      expect(program.ExtraTime).toBe('1 hour');
      expect(program.Note).toBe('Import note');
      expect(program.DeadlineAt).toEqual(importData.termin);
      expect(program.ArrivedAt).toEqual(importData.dorazilo);
      expect(program.DoneAt).toEqual(importData.hotovo);
    });

    it('should handle optional fields in import', () => {
      const minimalImport = {
        program: '25888',
      };

      const program = Program.fromImport(minimalImport);

      expect(program.ProgramId).toBe('25888');
      expect(program.Name).toBeUndefined();
      expect(program.Count).toBeUndefined();
    });
  });
});

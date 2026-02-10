import { describe, it, expect } from 'vitest';
import { TableColumn } from '../../models/tableColumn';
import type { DbTableColumn } from '../../models/dbTableColumn';

describe('TableColumn Model', () => {
  const mockDbColumn: DbTableColumn = {
    key: 'programId',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    type: 'string',
    position: 0,
    sort: 0,
    sortPosition: 0,
    visible: true,
    width: 'auto',
    align: 'left',
  };

  describe('Constructor', () => {
    it('should create column with all fields', () => {
      const col = new TableColumn(mockDbColumn);
      expect(col.Key).toBe('programId');
      expect(col.Type).toBe('string');
      expect(col.Position).toBe(0);
      expect(col.Sort).toBe(0);
      expect(col.SortPosition).toBe(0);
      expect(col.Visible).toBe(true);
      expect(col.Width).toBe('auto');
      expect(col.Align).toBe('left');
    });

    it('should apply default values for optional fields', () => {
      const col = new TableColumn({
        key: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        type: 'number',
        position: 1,
        sort: 0,
        sortPosition: 0,
        visible: true,
        width: 'auto',
        align: 'left',
      });
      expect(col.Filter).toBeUndefined();
      expect(col.ComputeExpression).toBeUndefined();
      expect(col.Archived).toBe(false);
      expect(col.Label).toBeUndefined();
      expect(col.Sortable).toBe(true);
      expect(col.DateFormat).toBeUndefined();
      expect(col.Copyable).toBe(true);
      expect(col.InlineEditable).toBe(true);
      expect(col.IncrementalPattern).toBeUndefined();
      expect(col.IncrementalRewritable).toBe(false);
    });

    it('should handle computed column with expression', () => {
      const col = new TableColumn({
        ...mockDbColumn,
        type: 'computed',
        computeExpression: 'COALESCE(preparing, 0) + COALESCE(programing, 0)',
      });
      expect(col.Type).toBe('computed');
      expect(col.ComputeExpression).toBe('COALESCE(preparing, 0) + COALESCE(programing, 0)');
    });

    it('should handle incremental column with pattern', () => {
      const col = new TableColumn({
        ...mockDbColumn,
        type: 'incremental',
        incrementalPattern: '{YY}{MM}{###}',
        incrementalRewritable: true,
      });
      expect(col.Type).toBe('incremental');
      expect(col.IncrementalPattern).toBe('{YY}{MM}{###}');
      expect(col.IncrementalRewritable).toBe(true);
    });

    it('should convert date strings to Date objects', () => {
      const col = new TableColumn({
        ...mockDbColumn,
        createdAt: '2025-01-01' as unknown as Date,
        updatedAt: '2025-01-02' as unknown as Date,
      });
      expect(col.CreatedAt).toBeInstanceOf(Date);
      expect(col.UpdatedAt).toBeInstanceOf(Date);
    });

    it('should use current date when createdAt/updatedAt not provided', () => {
      const col = new TableColumn({
        ...mockDbColumn,
        createdAt: undefined as unknown as Date,
        updatedAt: undefined as unknown as Date,
      });
      expect(col.CreatedAt).toBeInstanceOf(Date);
      expect(col.UpdatedAt).toBeInstanceOf(Date);
    });

    it('should handle numeric width', () => {
      const col = new TableColumn({ ...mockDbColumn, width: 200 });
      expect(col.Width).toBe(200);
    });
  });

  describe('Getters and Setters', () => {
    it('should set and get Sort', () => {
      const col = new TableColumn(mockDbColumn);
      col.Sort = 1;
      expect(col.Sort).toBe(1);
      col.Sort = -1;
      expect(col.Sort).toBe(-1);
      col.Sort = 0;
      expect(col.Sort).toBe(0);
    });

    it('should set and get SortPosition', () => {
      const col = new TableColumn(mockDbColumn);
      col.SortPosition = 3;
      expect(col.SortPosition).toBe(3);
    });

    it('should set and get Visible', () => {
      const col = new TableColumn(mockDbColumn);
      col.Visible = false;
      expect(col.Visible).toBe(false);
    });

    it('should set and get Filter', () => {
      const col = new TableColumn(mockDbColumn);
      col.Filter = '>=:100';
      expect(col.Filter).toBe('>=:100');
      col.Filter = undefined;
      expect(col.Filter).toBeUndefined();
    });
  });

  describe('toSqlUpdate', () => {
    it('should return valid UPDATE SQL', () => {
      const col = new TableColumn(mockDbColumn);
      const sql = col.toSqlUpdate();
      expect(sql).toContain('UPDATE table_columns SET');
      expect(sql).toContain('updatedAt = CURRENT_TIMESTAMP');
      expect(sql).toContain('WHERE key=$1');
    });

    it('should use positional parameters $1-$18', () => {
      const col = new TableColumn(mockDbColumn);
      const sql = col.toSqlUpdate();
      // $1 = key (in WHERE), $2-$18 = fields
      expect(sql).toContain('type = $2');
      expect(sql).toContain('position = $3');
      expect(sql).toContain('sort = $4');
      expect(sql).toContain('sortPosition = $5');
      expect(sql).toContain('visible = $6');
      expect(sql).toContain('width = $7');
      expect(sql).toContain('align = $8');
      expect(sql).toContain('filter = $9');
      expect(sql).toContain('computeExpression = $10');
      expect(sql).toContain('archived = $11');
      expect(sql).toContain('label = $12');
      expect(sql).toContain('sortable = $13');
      expect(sql).toContain('dateFormat = $14');
      expect(sql).toContain('copyable = $15');
      expect(sql).toContain('inlineEditable = $16');
      expect(sql).toContain('incrementalPattern = $17');
      expect(sql).toContain('incrementalRewritable = $18');
    });
  });

  describe('toArray', () => {
    it('should return 18 elements matching SQL parameters', () => {
      const col = new TableColumn(mockDbColumn);
      const arr = col.toArray();
      expect(arr.length).toBe(18);
    });

    it('should have key as first element ($1)', () => {
      const col = new TableColumn(mockDbColumn);
      const arr = col.toArray();
      expect(arr[0]).toBe('programId');
    });

    it('should have type as second element ($2)', () => {
      const col = new TableColumn(mockDbColumn);
      const arr = col.toArray();
      expect(arr[1]).toBe('string');
    });

    it('should include all fields in correct order', () => {
      const col = new TableColumn({
        ...mockDbColumn,
        filter: '>=:100',
        computeExpression: 'a + b',
        label: 'Program ID',
        sortable: false,
        dateFormat: 'yyyy-MM-dd',
        copyable: false,
        inlineEditable: false,
        incrementalPattern: '{###}',
        incrementalRewritable: true,
      });
      const arr = col.toArray();
      // [key, type, position, sort, sortPosition, visible, width, align,
      //  filter, computeExpression, archived, label, sortable, dateFormat,
      //  copyable, inlineEditable, incrementalPattern, incrementalRewritable]
      expect(arr[0]).toBe('programId');  // key
      expect(arr[1]).toBe('string');     // type
      expect(arr[2]).toBe(0);           // position
      expect(arr[3]).toBe(0);           // sort
      expect(arr[4]).toBe(0);           // sortPosition
      expect(arr[5]).toBe(true);        // visible
      expect(arr[6]).toBe('auto');      // width
      expect(arr[7]).toBe('left');      // align
      expect(arr[8]).toBe('>=:100');    // filter
      expect(arr[9]).toBe('a + b');     // computeExpression
      expect(arr[10]).toBe(false);      // archived
      expect(arr[11]).toBe('Program ID'); // label
      expect(arr[12]).toBe(false);      // sortable
      expect(arr[13]).toBe('yyyy-MM-dd'); // dateFormat
      expect(arr[14]).toBe(false);      // copyable
      expect(arr[15]).toBe(false);      // inlineEditable
      expect(arr[16]).toBe('{###}');    // incrementalPattern
      expect(arr[17]).toBe(true);       // incrementalRewritable
    });
  });
});

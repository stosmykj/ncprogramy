import { describe, it, expect } from 'vitest';
import { FormattingRule } from '../../models/formattingRule';
import type { DbFormattingRule } from '../../models/dbFormattingRule';

function createRule(overrides: Partial<DbFormattingRule> = {}): FormattingRule {
  return new FormattingRule({
    id: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    name: 'Test Rule',
    target: 'row',
    conditionTree: JSON.stringify({
      logic: 'AND',
      conditions: [{ column: 'count', operator: 'gt', value: '100' }],
    }),
    enabled: true,
    priority: 0,
    ...overrides,
  });
}

describe('FormattingRule Model', () => {
  describe('Constructor', () => {
    it('should create rule with all fields', () => {
      const rule = createRule({
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        fontWeight: 'bold',
        columnKey: 'count',
      });
      expect(rule.Id).toBe(1);
      expect(rule.Name).toBe('Test Rule');
      expect(rule.Target).toBe('row');
      expect(rule.BackgroundColor).toBe('#ff0000');
      expect(rule.TextColor).toBe('#ffffff');
      expect(rule.FontWeight).toBe('bold');
      expect(rule.Enabled).toBe(true);
      expect(rule.Priority).toBe(0);
      expect(rule.ColumnKey).toBe('count');
    });

    it('should parse conditionTree from JSON string', () => {
      const rule = createRule();
      expect(rule.ConditionTree.logic).toBe('AND');
      expect(rule.ConditionTree.conditions).toHaveLength(1);
      expect(rule.ConditionTree.conditions[0].column).toBe('count');
      expect(rule.ConditionTree.conditions[0].operator).toBe('gt');
    });

    it('should fallback to empty condition tree for invalid JSON', () => {
      const rule = createRule({ conditionTree: 'invalid json' });
      expect(rule.ConditionTree.logic).toBe('AND');
      expect(rule.ConditionTree.conditions).toEqual([]);
    });

    it('should handle cell target', () => {
      const rule = createRule({ target: 'cell', columnKey: 'count' });
      expect(rule.Target).toBe('cell');
      expect(rule.ColumnKey).toBe('count');
    });
  });

  describe('toDbFormattingRule', () => {
    it('should convert back to DB format', () => {
      const rule = createRule({ backgroundColor: '#ff0000' });
      const db = rule.toDbFormattingRule();
      expect(db.id).toBe(1);
      expect(db.name).toBe('Test Rule');
      expect(db.target).toBe('row');
      expect(db.backgroundColor).toBe('#ff0000');
      expect(typeof db.conditionTree).toBe('string');
      const parsed = JSON.parse(db.conditionTree);
      expect(parsed.logic).toBe('AND');
    });
  });

  describe('toArray', () => {
    it('should return correct array for SQL parameter binding', () => {
      const rule = createRule({
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        fontWeight: 'bold',
      });
      const arr = rule.toArray();
      // [name, target, columnKey, conditionTree, bg, text, font, enabled, priority, updatedAt, id]
      expect(arr[0]).toBe('Test Rule');     // name
      expect(arr[1]).toBe('row');           // target
      expect(arr[2]).toBeUndefined();       // columnKey
      expect(typeof arr[3]).toBe('string'); // conditionTree (JSON)
      expect(arr[4]).toBe('#ff0000');       // backgroundColor
      expect(arr[5]).toBe('#ffffff');       // textColor
      expect(arr[6]).toBe('bold');          // fontWeight
      expect(arr[7]).toBe(1);              // enabled (converted to 1/0)
      expect(arr[8]).toBe(0);              // priority
      expect(typeof arr[9]).toBe('string'); // updatedAt (ISO string)
      expect(arr[10]).toBe(1);             // id
    });

    it('should convert enabled=false to 0', () => {
      const rule = createRule({ enabled: false });
      const arr = rule.toArray();
      expect(arr[7]).toBe(0);
    });

    it('should have 11 elements matching toSqlUpdate parameters', () => {
      const rule = createRule();
      const arr = rule.toArray();
      expect(arr.length).toBe(11);
    });
  });

  describe('toSqlUpdate', () => {
    it('should return valid UPDATE SQL', () => {
      const rule = createRule();
      const sql = rule.toSqlUpdate();
      expect(sql).toContain('UPDATE formatting_rules');
      expect(sql).toContain('SET name = $1');
      expect(sql).toContain('WHERE id = $11');
    });
  });

  describe('matches - equals operator', () => {
    it('should match equal string values', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'name', operator: 'equals', value: 'Test' }],
        }),
      });
      expect(rule.matches({ name: 'Test' })).toBe(true);
      expect(rule.matches({ name: 'Other' })).toBe(false);
    });

    it('should match equal numeric values as strings', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'equals', value: '100' }],
        }),
      });
      expect(rule.matches({ count: 100 })).toBe(true);
      expect(rule.matches({ count: 200 })).toBe(false);
    });
  });

  describe('matches - notEquals operator', () => {
    it('should match when values are not equal', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'name', operator: 'notEquals', value: 'Test' }],
        }),
      });
      expect(rule.matches({ name: 'Other' })).toBe(true);
      expect(rule.matches({ name: 'Test' })).toBe(false);
    });
  });

  describe('matches - gt/gte/lt/lte operators', () => {
    it('should match greater than', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'gt', value: '100' }],
        }),
      });
      expect(rule.matches({ count: 150 })).toBe(true);
      expect(rule.matches({ count: 100 })).toBe(false);
      expect(rule.matches({ count: 50 })).toBe(false);
    });

    it('should match greater than or equal', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'gte', value: '100' }],
        }),
      });
      expect(rule.matches({ count: 150 })).toBe(true);
      expect(rule.matches({ count: 100 })).toBe(true);
      expect(rule.matches({ count: 50 })).toBe(false);
    });

    it('should match less than', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'lt', value: '100' }],
        }),
      });
      expect(rule.matches({ count: 50 })).toBe(true);
      expect(rule.matches({ count: 100 })).toBe(false);
    });

    it('should match less than or equal', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'lte', value: '100' }],
        }),
      });
      expect(rule.matches({ count: 50 })).toBe(true);
      expect(rule.matches({ count: 100 })).toBe(true);
      expect(rule.matches({ count: 150 })).toBe(false);
    });

    it('should compare dates as strings', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'deadline', operator: 'gt', value: '2025-06-01' }],
        }),
      });
      expect(rule.matches({ deadline: '2025-07-01' })).toBe(true);
      expect(rule.matches({ deadline: '2025-05-01' })).toBe(false);
    });
  });

  describe('matches - contains operator', () => {
    it('should match substring', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'name', operator: 'contains', value: 'est' }],
        }),
      });
      expect(rule.matches({ name: 'Test Program' })).toBe(true);
      expect(rule.matches({ name: 'Other' })).toBe(false);
    });

    it('should handle empty contains value', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'name', operator: 'contains', value: '' }],
        }),
      });
      // Empty string is contained in any string
      expect(rule.matches({ name: 'anything' })).toBe(true);
    });
  });

  describe('matches - empty/notEmpty operators', () => {
    it('should match null values as empty', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'note', operator: 'empty', value: null }],
        }),
      });
      expect(rule.matches({ note: null })).toBe(true);
      expect(rule.matches({ note: undefined })).toBe(true);
      expect(rule.matches({ note: '' })).toBe(true);
      expect(rule.matches({ note: 'has value' })).toBe(false);
    });

    it('should match non-empty values', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'note', operator: 'notEmpty', value: null }],
        }),
      });
      expect(rule.matches({ note: 'has value' })).toBe(true);
      expect(rule.matches({ note: null })).toBe(false);
      expect(rule.matches({ note: undefined })).toBe(false);
      expect(rule.matches({ note: '' })).toBe(false);
    });
  });

  describe('matches - AND logic', () => {
    it('should require all conditions to be true', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [
            { column: 'count', operator: 'gt', value: '50' },
            { column: 'name', operator: 'contains', value: 'Test' },
          ],
        }),
      });
      expect(rule.matches({ count: 100, name: 'Test Program' })).toBe(true);
      expect(rule.matches({ count: 100, name: 'Other' })).toBe(false);
      expect(rule.matches({ count: 10, name: 'Test Program' })).toBe(false);
    });
  });

  describe('matches - OR logic', () => {
    it('should require at least one condition to be true', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'OR',
          conditions: [
            { column: 'count', operator: 'gt', value: '50' },
            { column: 'name', operator: 'contains', value: 'Test' },
          ],
        }),
      });
      expect(rule.matches({ count: 100, name: 'Other' })).toBe(true);
      expect(rule.matches({ count: 10, name: 'Test Program' })).toBe(true);
      expect(rule.matches({ count: 10, name: 'Other' })).toBe(false);
    });
  });

  describe('matches - nested groups', () => {
    it('should evaluate nested condition groups', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'gt', value: '0' }],
          groups: [
            {
              logic: 'OR',
              conditions: [
                { column: 'name', operator: 'equals', value: 'A' },
                { column: 'name', operator: 'equals', value: 'B' },
              ],
            },
          ],
        }),
      });
      // count > 0 AND (name = 'A' OR name = 'B')
      expect(rule.matches({ count: 10, name: 'A' })).toBe(true);
      expect(rule.matches({ count: 10, name: 'B' })).toBe(true);
      expect(rule.matches({ count: 10, name: 'C' })).toBe(false);
      expect(rule.matches({ count: 0, name: 'A' })).toBe(false);
    });
  });

  describe('matches - disabled rule', () => {
    it('should return false when rule is disabled', () => {
      const rule = createRule({
        enabled: false,
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'gt', value: '0' }],
        }),
      });
      expect(rule.matches({ count: 100 })).toBe(false);
    });
  });

  describe('matches - empty conditions', () => {
    it('should return false for empty condition tree', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({ logic: 'AND', conditions: [] }),
      });
      expect(rule.matches({ count: 100 })).toBe(false);
    });
  });

  describe('matches - unknown operator', () => {
    it('should return false for unknown operator', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'count', operator: 'unknown', value: '100' }],
        }),
      });
      expect(rule.matches({ count: 100 })).toBe(false);
    });
  });

  describe('matches - Date object handling', () => {
    it('should convert Date values to ISO date string for comparison', () => {
      const rule = createRule({
        conditionTree: JSON.stringify({
          logic: 'AND',
          conditions: [{ column: 'deadline', operator: 'equals', value: '2025-06-15' }],
        }),
      });
      expect(rule.matches({ deadline: new Date('2025-06-15') })).toBe(true);
      expect(rule.matches({ deadline: new Date('2025-06-16') })).toBe(false);
    });
  });

  describe('getStyles', () => {
    it('should return styles object with all style properties', () => {
      const rule = createRule({
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        fontWeight: 'bold',
      });
      const styles = rule.getStyles();
      expect(styles.backgroundColor).toBe('#ff0000');
      expect(styles.color).toBe('#ffffff');
      expect(styles.fontWeight).toBe('bold');
    });

    it('should omit undefined style properties', () => {
      const rule = createRule({
        backgroundColor: '#ff0000',
      });
      const styles = rule.getStyles();
      expect(styles.backgroundColor).toBe('#ff0000');
      expect(styles.color).toBeUndefined();
      expect(styles.fontWeight).toBeUndefined();
    });

    it('should return empty object when no styles set', () => {
      const rule = createRule();
      const styles = rule.getStyles();
      expect(Object.keys(styles)).toHaveLength(0);
    });
  });
});

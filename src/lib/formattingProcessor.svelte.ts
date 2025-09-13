import { FormattingRule } from '../models/formattingRule';
import type { DbFormattingRule } from '../models/dbFormattingRule';
import { getDatabase } from './database';
import type { Program } from '../models/program';

export const FORMATTING_RULES = $state<Array<FormattingRule>>([]);

export async function initFormattingRules(): Promise<void> {
  try {
    const db = await getDatabase();
    const rules = await db.select<Array<DbFormattingRule>>(
      'SELECT * FROM formatting_rules WHERE enabled = 1 ORDER BY priority ASC'
    );
    FORMATTING_RULES.splice(0, FORMATTING_RULES.length, ...rules.map((r) => new FormattingRule(r)));
  } catch (error) {
    console.error('Failed to load formatting rules:', error);
  }
}

/**
 * Get styles for a row based on formatting rules
 */
export function getRowStyles(program: Program): Partial<CSSStyleDeclaration> {
  const styles: Record<string, string> = {};

  // Apply row-level rules
  const rowRules = FORMATTING_RULES.filter((rule) => rule.Target === 'row' && rule.Enabled);

  for (const rule of rowRules) {
    if (rule.matches(program as unknown as Record<string, unknown>)) {
      const ruleStyles = rule.getStyles();
      Object.assign(styles, ruleStyles);
      break; // Apply only the first matching rule (highest priority)
    }
  }

  return styles;
}

/**
 * Get styles for a cell based on formatting rules
 */
export function getCellStyles(program: Program, columnKey: string): Partial<CSSStyleDeclaration> {
  const styles: Record<string, string> = {};

  // Apply cell-level rules for this column
  const cellRules = FORMATTING_RULES.filter(
    (rule) => rule.Target === 'cell' && rule.ColumnKey === columnKey && rule.Enabled
  );

  for (const rule of cellRules) {
    if (rule.matches(program as unknown as Record<string, unknown>)) {
      const ruleStyles = rule.getStyles();
      Object.assign(styles, ruleStyles);
      break; // Apply only the first matching rule (highest priority)
    }
  }

  return styles;
}

/**
 * Reload formatting rules from database
 */
export async function reloadFormattingRules(): Promise<void> {
  await initFormattingRules();
}

export function buildStyleString(styles: Partial<CSSStyleDeclaration>): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${cssKey}: ${value}`;
    })
    .join('; ');
}

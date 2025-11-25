import { FormattingRule } from '../models/formattingRule';
import type { DbFormattingRule } from '../models/dbFormattingRule';
import { getDatabase } from './database';
import type { Program } from '../models/program';
import { DATA_VARS } from './dataProcessor.svelte';

export const FORMATTING_RULES = $state<Array<FormattingRule>>([]);

export async function initFormattingRules(): Promise<void> {
  try {
    const db = await getDatabase();
    const rules = await db.select<Array<DbFormattingRule>>(
      'SELECT * FROM formatting_rules WHERE enabled = 1 ORDER BY priority ASC'
    );
    FORMATTING_RULES.splice(0, FORMATTING_RULES.length, ...rules.map((r) => new FormattingRule(r)));
    DATA_VARS.refresh = {};
  } catch (error) {
    console.error('Failed to load formatting rules:', error);
  }
}

export function getRowStyles(program: Program): Partial<CSSStyleDeclaration> {
  const styles: Record<string, string> = {};
  const programRecord = program.toRecord();

  const rowRules = FORMATTING_RULES.filter((rule) => rule.Target === 'row' && rule.Enabled);

  for (const rule of rowRules) {
    if (rule.matches(programRecord)) {
      const ruleStyles = rule.getStyles();
      Object.assign(styles, ruleStyles);
      break;
    }
  }

  return styles;
}

export function getCellStyles(program: Program, columnKey: string): Partial<CSSStyleDeclaration> {
  const styles: Record<string, string> = {};
  const programRecord = program.toRecord();

  const cellRules = FORMATTING_RULES.filter(
    (rule) => rule.Target === 'cell' && rule.ColumnKey === columnKey && rule.Enabled
  );

  for (const rule of cellRules) {
    if (rule.matches(programRecord)) {
      const ruleStyles = rule.getStyles();
      Object.assign(styles, ruleStyles);
      break;
    }
  }

  return styles;
}

export async function reloadFormattingRules(): Promise<void> {
  await initFormattingRules();
}

export function buildStyleString(styles: Partial<CSSStyleDeclaration>): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${cssKey}: ${value}`;
    })
    .join('; ');
}

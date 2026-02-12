import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { getDatabase } from './database';
import { showSuccess, showError } from './toast.svelte';
import { initTableColumns } from './tableColumnProcessor.svelte';
import { initFormattingRules } from './formattingProcessor.svelte';
import { DATA_VARS } from './dataProcessor.svelte';
import { markAppAsInitialized } from './settingsProcessor.svelte';
import { logger } from './logger';

// Legacy file type definitions
interface LegacyFile {
  name?: string;
  path?: string;
  ext?: string;
}

type LegacyProgram = Record<string, unknown> & {
  Id: number;
  TimeCreated: number;
  TimeEdited: number;
};

interface LegacyHeaderItem {
  name: string;
  value: string;
  type: string | { type: string; ext?: string; pattern?: string[]; vType?: string };
  position: number;
  vis: boolean;
  width: number;
}

interface LegacyCondition {
  field: string;
  operator: string;
  type: string;
  v1: string;
  v2: string | null;
  rule?: string;
}

export interface LegacyFormat {
  id: number;
  conds: LegacyCondition[];
  trueColor: string;
  falseColor: string;
}

export interface LegacySettings {
  headerDef: {
    items: LegacyHeaderItem[];
  };
  formats: LegacyFormat[];
}

export interface LegacyData {
  items: LegacyProgram[];
}

export interface ColumnDef {
  key: string;
  label: string;
  type: string;
  position: number;
  visible: boolean;
  width: string;
  computeExpression?: string;
}

// System columns that should not be imported as user columns
const SYSTEM_COLUMNS = ['Id', 'TimeCreated', 'TimeEdited'];

// Map legacy operator to new operator
function mapOperator(op: string): string {
  const mapping: Record<string, string> = {
    '!empty': 'notEmpty',
    empty: 'empty',
    '=': 'eq',
    '!=': 'neq',
    '>': 'gt',
    '>=': 'gte',
    '<': 'lt',
    '<=': 'lte',
    contains: 'contains',
    between: 'gte',
  };
  return mapping[op] || 'eq';
}

// Get the column type from legacy type definition
function getLegacyColumnType(legacyType: string | { type: string; vType?: string }): string {
  if (typeof legacyType === 'string') {
    switch (legacyType) {
      case 'text':
        return 'string';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime';
      case 'auto_number':
        return 'string';
      default:
        return 'string';
    }
  }

  // Object type
  switch (legacyType.type) {
    case 'file':
      return 'file';
    case 'computed':
      return 'computed';
    case 'auto_number':
      return 'string';
    default:
      return 'string';
  }
}

// Convert legacy computed pattern to SQL expression
function convertComputePattern(pattern: string[]): string {
  // Pattern is like: ["ks", "multiplication", "obrab", "addition", "prog", "addition", "pripr"]
  // Convert to SQL: (ks * obrab + prog + pripr)
  const opMap: Record<string, string> = {
    multiplication: '*',
    addition: '+',
    subtraction: '-',
    division: '/',
  };

  let result = '';
  for (let i = 0; i < pattern.length; i++) {
    const item = pattern[i];
    if (opMap[item]) {
      result += ` ${opMap[item]} `;
    } else {
      // It's a column name, wrap with COALESCE for null handling
      result += `COALESCE(${item}, 0)`;
    }
  }

  return result;
}

// Convert timestamp to ISO string
function timestampToIso(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString();
}

// Convert legacy file to JSON string
function convertFile(file: unknown): string | null {
  if (!file || typeof file !== 'object') return null;
  const f = file as LegacyFile;
  if (!f.path || !f.name) return null;
  return JSON.stringify({
    path: f.path,
    name: f.name,
    extension: f.ext || '',
  });
}

// Parse number from string or number
function parseNumber(value: unknown): number | null {
  if (value === undefined || value === '' || value === null) return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
}

// Serialize value based on column type
function serializeValue(value: unknown, colType: string): string | number | null {
  if (value === undefined || value === null || value === '') return null;

  switch (colType) {
    case 'file':
      return convertFile(value);
    case 'number':
      return parseNumber(value);
    case 'date':
    case 'datetime':
      if (typeof value === 'number') {
        return timestampToIso(value);
      }
      return null;
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

export async function importLegacyData(): Promise<boolean> {
  try {
    // Step 1: Select the .pncs settings file for column definitions
    const settingsFile = await open({
      title: '1/2 - Vyberte soubor settings.pncs (definice sloupců)',
      filters: [{ name: 'PNCS Files', extensions: ['pncs'] }],
      multiple: false,
    });

    if (!settingsFile) return false;

    const settingsContent = await readTextFile(settingsFile as string);
    const legacySettings: LegacySettings = JSON.parse(settingsContent);

    if (!legacySettings.headerDef?.items) {
      showError('Neplatný formát souboru settings.pncs');
      return false;
    }

    // Step 2: Select the .pnc programs file for data
    const programsFile = await open({
      title: '2/2 - Vyberte soubor programs.pnc (data)',
      filters: [{ name: 'PNC Files', extensions: ['pnc'] }],
      multiple: false,
    });

    if (!programsFile) return false;

    const programsContent = await readTextFile(programsFile as string);
    const legacyData: LegacyData = JSON.parse(programsContent);

    DATA_VARS.isImporting = true;

    const db = await getDatabase();

    // Create columns from settings file
    const columns = await createColumnsFromLegacy(db, legacySettings);

    // Create formatting rules from legacy settings
    if (legacySettings.formats) {
      await createFormattingRulesFromLegacy(db, legacySettings.formats);
    }

    // Import programs using the column definitions
    await importProgramsFromLegacy(db, legacyData.items, columns);

    // Reload UI state
    await initTableColumns();
    await initFormattingRules();

    DATA_VARS.isImporting = false;
    DATA_VARS.reloadData = true;

    await markAppAsInitialized();
    showSuccess(`Importováno ${legacyData.items.length} záznamů ze staré aplikace`);
    return true;
  } catch (error) {
    logger.error('Failed to import legacy data', error);
    DATA_VARS.isImporting = false;
    showError('Nepodařilo se importovat data ze staré aplikace');
    return false;
  }
}

export async function createColumnsFromLegacy(
  db: Awaited<ReturnType<typeof getDatabase>>,
  settings: LegacySettings
): Promise<ColumnDef[]> {
  // Clear existing columns
  await db.execute('DELETE FROM table_columns');

  const columns: ColumnDef[] = [];
  let position = 0;

  for (const item of settings.headerDef.items) {
    // Skip system columns
    if (SYSTEM_COLUMNS.includes(item.name)) continue;

    const colType = getLegacyColumnType(item.type);

    // Handle computed columns
    let computeExpression: string | undefined;
    if (typeof item.type === 'object' && item.type.type === 'computed' && item.type.pattern) {
      computeExpression = convertComputePattern(item.type.pattern);
    }

    if (item.width < 60) {
      item.width = 60;
    }

    columns.push({
      key: item.name,
      label: item.value || item.name,
      type: colType,
      position: position++,
      visible: item.vis !== false,
      width: item.width ? `${item.width}` : 'auto',
      computeExpression,
    });
  }

  // Insert columns into database and alter table
  for (const col of columns) {
    await db.execute(
      `INSERT INTO table_columns (key, type, position, visible, width, label, sort, sortPosition, align, archived, computeExpression)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'left', 0, ?)`,
      [
        col.key,
        col.type,
        col.position,
        col.visible ? 1 : 0,
        col.width,
        col.label,
        col.computeExpression || null,
      ]
    );

    // Add column to programs table if it's not computed or actions
    if (col.type !== 'computed' && col.key !== 'actions' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.key)) {
      let sqlType = 'TEXT';
      if (col.type === 'number') sqlType = 'REAL';

      try {
        await db.execute(`ALTER TABLE programs ADD COLUMN ${col.key} ${sqlType}`);
      } catch {
        // Column might already exist
      }
    }
  }

  return columns;
}

export async function createFormattingRulesFromLegacy(
  db: Awaited<ReturnType<typeof getDatabase>>,
  formats: LegacyFormat[]
): Promise<void> {
  for (const format of formats) {
    if (format.trueColor === 'clear') continue;

    // Build condition tree from legacy conditions
    const conditions = format.conds.map((cond) => ({
      id: crypto.randomUUID(),
      type: 'condition' as const,
      field: cond.field, // Use original field name
      operator: mapOperator(cond.operator),
      value: cond.v1 || '',
    }));

    const conditionTree = {
      id: crypto.randomUUID(),
      type: 'group' as const,
      operator: 'and' as const,
      conditions,
    };

    await db.execute(
      `INSERT INTO formatting_rules (name, target, conditionTree, enabled, priority, backgroundColor)
       VALUES (?, 'row', ?, 1, ?, ?)`,
      [`Pravidlo ${format.id + 1}`, JSON.stringify(conditionTree), format.id, format.trueColor]
    );
  }
}

export async function importProgramsFromLegacy(
  db: Awaited<ReturnType<typeof getDatabase>>,
  programs: LegacyProgram[],
  columns: ColumnDef[]
): Promise<void> {
  const totalCount = programs.length;
  let processedCount = 0;

  // Filter to only saveable columns (not computed, not actions)
  const saveableColumns = columns.filter((c) => c.type !== 'computed' && c.key !== 'actions');
  const columnKeys = saveableColumns.map((c) => c.key);

  // Process in batches
  const batchSize = 50;
  for (let i = 0; i < programs.length; i += batchSize) {
    const batch = programs.slice(i, i + batchSize);
    const valuePlaceholders: string[] = [];
    const values: (string | number | null)[] = [];

    for (const p of batch) {
      const programValues: (string | number | null)[] = [];

      // Add system columns (createdAt, updatedAt)
      programValues.push(timestampToIso(p.TimeCreated) || new Date().toISOString());
      programValues.push(timestampToIso(p.TimeEdited) || new Date().toISOString());

      // Add values for each saveable column
      for (const col of saveableColumns) {
        const value = p[col.key];
        programValues.push(serializeValue(value, col.type));
      }

      const startIndex = values.length;
      const placeholders = programValues.map((_, idx) => `$${startIndex + idx + 1}`);
      valuePlaceholders.push(`(${placeholders.join(', ')})`);
      values.push(...programValues);
    }

    const allColumns = ['createdAt', 'updatedAt', ...columnKeys];
    const sql = `INSERT INTO programs (${allColumns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    await db.execute(sql, values);

    processedCount += batch.length;
    logger.info(`Imported ${processedCount}/${totalCount} programs from legacy`);
  }
}

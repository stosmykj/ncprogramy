import { Program } from '../models/program';
import type { DbProgram } from '../models/dbProgram';
import type { TableColumn } from '../models/tableColumn';
import { File } from '../models/file';
import { DatabaseError, handleError } from './errorHandler';
import { showError, showSuccess } from './toast.svelte';
import { getDatabase } from './database';
import { formatDate, formatDateTime, formatWithCustomFormat } from './dateFormatter.svelte';
import { copyFileToStorageIfNeeded } from './fileStorageProcessor';
import { logger } from './logger';

// Extract column references from a computed expression
function extractColumnReferences(expression: string): string[] {
  const sqlKeywords = [
    'COALESCE',
    'AS',
    'AND',
    'OR',
    'NOT',
    'NULL',
    'TRUE',
    'FALSE',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'CAST',
    'TEXT',
    'INTEGER',
    'REAL',
  ];

  const refs: string[] = [];
  const identifiers = expression.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || [];

  for (const id of identifiers) {
    if (sqlKeywords.includes(id.toUpperCase())) continue;
    if (!refs.includes(id)) {
      refs.push(id);
    }
  }

  return refs;
}

// Build a set of valid column references (physical columns + valid computed columns)
// Also returns a map of computed column keys to their fully expanded expressions
function buildValidColumnSet(
  physicalColumns: string[],
  computedColumns: Array<{ key: string; computeExpression: string | null }>
): { validColumns: Set<string>; expandedExpressions: Map<string, string> } {
  const validColumns = new Set<string>(physicalColumns);
  const expandedExpressions = new Map<string, string>();

  let changed = true;
  while (changed) {
    changed = false;
    for (const col of computedColumns) {
      if (validColumns.has(col.key)) continue; // Already validated
      if (!col.computeExpression) continue;

      const refs = extractColumnReferences(col.computeExpression);
      const allRefsValid = refs.every((ref) => validColumns.has(ref));

      if (allRefsValid) {
        // Expand any computed column references in this expression
        let expandedExpr = col.computeExpression;
        for (const ref of refs) {
          if (expandedExpressions.has(ref)) {
            // Replace references to other computed columns with their expressions
            const refExpr = expandedExpressions.get(ref)!;
            // Use word boundary replacement to avoid partial matches
            expandedExpr = expandedExpr.replace(new RegExp(`\\b${ref}\\b`, 'g'), `(${refExpr})`);
          }
        }
        expandedExpressions.set(col.key, expandedExpr);
        validColumns.add(col.key);
        changed = true;
      }
    }
  }
  return { validColumns, expandedExpressions };
}

// Validate that all column references in a computed expression exist
function isComputeExpressionValid(
  expression: string | null | undefined,
  validColumns: Set<string> | string[]
): boolean {
  if (!expression) return false;

  const validSet = validColumns instanceof Set ? validColumns : new Set(validColumns);
  const refs = extractColumnReferences(expression);

  return refs.every((ref) => validSet.has(ref));
}

export const PROGRAMS = $state<Array<Program>>([]);
export const DATA_VARS = $state({
  refresh: {},
  reloadData: false,
  count: 0,
  columnPosition: 0,
  rowPosition: 0,
  isEditing: false,
  isImporting: false,
  quickSearch: '',
});

// Get saveable columns from table_columns (excludes computed, actions, and system columns)
async function getSaveableColumns(): Promise<Array<{ key: string; type: string }>> {
  const db = await getDatabase();
  const columns = await db.select<Array<{ key: string; type: string }>>(
    `SELECT key, type FROM table_columns
     WHERE type != 'computed'
     AND key NOT IN ('id', 'createdAt', 'updatedAt', 'actions')
     ORDER BY position`
  );
  return columns;
}

// Copy file values to storage if needed
async function processFileColumns(
  program: Program,
  columns: Array<{ key: string; type: string }>
): Promise<void> {
  for (const col of columns) {
    if (col.type === 'file' || col.type === 'gcode') {
      const value = program.get(col.key);
      if (value instanceof File) {
        const processed = await copyFileToStorageIfNeeded(value);
        if (processed) {
          program.set(col.key, processed);
        }
      }
    }
  }
}

export async function getProgramsWithDateRange(
  dateRangeStart?: Date | null,
  dateRangeEnd?: Date | null
): Promise<Array<Program>> {
  try {
    const db = await getDatabase();
    const whereParts: Array<string> = [];
    const params: Array<string> = [];

    if (dateRangeStart || dateRangeEnd) {
      if (dateRangeStart && dateRangeEnd) {
        params.push(dateRangeStart.toISOString(), dateRangeEnd.toISOString());
        whereParts.push(`createdAt BETWEEN $${params.length - 1} AND $${params.length}`);
      } else if (dateRangeStart) {
        params.push(dateRangeStart.toISOString());
        whereParts.push(`createdAt >= $${params.length}`);
      } else if (dateRangeEnd) {
        params.push(dateRangeEnd.toISOString());
        whereParts.push(`createdAt <= $${params.length}`);
      }
    }

    const whereClause = whereParts.length > 0 ? ` WHERE ${whereParts.join(' AND ')}` : '';
    const query = `SELECT * FROM programs${whereClause} ORDER BY createdAt DESC`;
    return (await db.select<Array<DbProgram>>(query, params)).map(
      (row: DbProgram) => new Program(row)
    );
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to fetch programs with date range', message);
  }
}

export async function getPrograms(
  page: number = 1,
  pageSize: number = 50
): Promise<Array<Program>> {
  try {
    const db = await getDatabase();
    let whereClause = '';
    let orderByClause = '';
    const params: Array<string | number> = [];

    // Get actual columns from programs table
    const programsTableInfoEarly = await db.select<Array<{ name: string }>>(
      'PRAGMA table_info(programs)'
    );
    const physicalColumns = programsTableInfoEarly.map((col) => col.name);

    // Get all computed columns to build valid column set
    const computedColumnsForValidation = await db.select<
      Array<{ key: string; computeExpression: string | null }>
    >('SELECT key, computeExpression FROM table_columns WHERE type = "computed"');

    // Build set of valid columns (physical + valid computed) and expanded expressions
    const { validColumns: validColumnSet, expandedExpressions } = buildValidColumnSet(
      physicalColumns,
      computedColumnsForValidation
    );

    if (!DATA_VARS.isImporting) {
      const whereParts: Array<string> = [];

      if (DATA_VARS.quickSearch) {
        const allColumns = await db.select<
          Array<{ key: string; type: string; visible: number; computeExpression: string | null }>
        >(
          'SELECT key, type, visible, computeExpression FROM table_columns WHERE visible = 1 AND key NOT IN ("id", "createdAt", "updatedAt", "actions")'
        );

        const quickSearchParts = allColumns
          .filter((col) => {
            // Skip computed columns without valid expression
            if (col.type === 'computed') {
              return isComputeExpressionValid(col.computeExpression, validColumnSet);
            }
            return physicalColumns.includes(col.key);
          })
          .map((col) => {
            params.push(`%${DATA_VARS.quickSearch}%`);

            // For computed columns, use the expanded expression
            const columnRef =
              col.type === 'computed' && col.computeExpression
                ? `(${expandedExpressions.get(col.key) || col.computeExpression})`
                : col.key;

            if (col.type === 'file' || col.type === 'gcode') {
              return `json_extract(${col.key}, '$.name') LIKE $${params.length}`;
            } else if (col.type === 'number' || col.type === 'computed') {
              return `CAST(${columnRef} AS TEXT) LIKE $${params.length}`;
            } else if (col.type === 'date' || col.type === 'datetime') {
              return `date(${columnRef}) LIKE $${params.length}`;
            }

            return `${columnRef} LIKE $${params.length}`;
          });

        if (quickSearchParts.length > 0) {
          whereParts.push(`(${quickSearchParts.join(' OR ')})`);
        }
      }

      const filterColumns = await db.select<
        Array<{ key: string; filter: string; type: string; computeExpression: string | null }>
      >(
        'SELECT key, filter, type, computeExpression FROM table_columns WHERE filter IS NOT NULL AND filter != ""'
      );

      if (filterColumns.length > 0) {
        const filterParts = filterColumns
          .filter((col) => {
            if (col.type === 'computed') {
              return isComputeExpressionValid(col.computeExpression, validColumnSet);
            }
            return true;
          })
          .map((col) => {
            const filter = col.filter;
            let columnName: string;
            if (col.type === 'computed' && col.computeExpression) {
              columnName = `(${expandedExpressions.get(col.key) || col.computeExpression})`;
            } else if (col.type === 'file' || col.type === 'gcode') {
              columnName = `json_extract(${col.key}, '$.name')`;
            } else {
              columnName = col.key;
            }

            if (filter === 'empty:') {
              return `(${columnName} IS NULL OR ${columnName} = '')`;
            } else if (filter === 'notEmpty:') {
              return `(${columnName} IS NOT NULL AND ${columnName} != '')`;
            } else if (filter.startsWith('between:')) {
              const values = filter.slice(8).split(':');
              if (values.length === 2) {
                params.push(values[0], values[1]);
                return `${columnName} BETWEEN $${params.length - 1} AND $${params.length}`;
              }
            } else if (filter.startsWith('>=:')) {
              params.push(filter.slice(3));
              return `${columnName} >= $${params.length}`;
            } else if (filter.startsWith('<=:')) {
              params.push(filter.slice(3));
              return `${columnName} <= $${params.length}`;
            } else if (filter.startsWith('>:')) {
              params.push(filter.slice(2));
              return `${columnName} > $${params.length}`;
            } else if (filter.startsWith('<:')) {
              params.push(filter.slice(2));
              return `${columnName} < $${params.length}`;
            } else if (filter.startsWith('!=:')) {
              params.push(filter.slice(3));
              return `${columnName} != $${params.length}`;
            } else if (filter.startsWith('=:')) {
              params.push(filter.slice(2));
              return `${columnName} = $${params.length}`;
            } else {
              params.push(`%${filter}%`);

              if (col.type === 'number') {
                return `CAST(${columnName} AS TEXT) LIKE $${params.length}`;
              } else if (col.type === 'date' || col.type === 'datetime') {
                return `date(${columnName}) LIKE $${params.length}`;
              }

              return `${columnName} LIKE $${params.length}`;
            }

            return '';
          })
          .filter(Boolean);

        whereParts.push(...filterParts);
      }

      if (whereParts.length > 0) {
        whereClause = ` WHERE ${whereParts.join(' AND ')}`;
      }

      const sortColumns = await db.select<
        Array<{ key: string; sort: number; type: string; computeExpression: string | null }>
      >(
        'SELECT key, sort, type, computeExpression FROM table_columns WHERE sort != 0 ORDER BY sortPosition ASC'
      );

      if (sortColumns.length > 0) {
        const sortParts = sortColumns
          .filter((col) => {
            // Skip computed columns without valid expression - they can't be sorted
            if (col.type === 'computed') {
              return isComputeExpressionValid(col.computeExpression, validColumnSet);
            }
            return true;
          })
          .map((col) => {
            const direction = col.sort === 1 ? 'ASC' : 'DESC';

            if (col.type === 'file' || col.type === 'gcode') {
              return `json_extract(${col.key}, '$.name') ${direction}`;
            }

            // For computed columns, use the expanded expression
            if (col.type === 'computed' && col.computeExpression) {
              return `(${expandedExpressions.get(col.key) || col.computeExpression}) ${direction}`;
            }

            return `${col.key} ${direction}`;
          });

        if (sortParts.length > 0) {
          orderByClause = ` ORDER BY ${sortParts.join(', ')}`;
        }
      }
    }

    DATA_VARS.count = await getProgramsCount(whereClause, params);

    const allTableColumns = await db.select<
      Array<{ key: string; type: string; computeExpression: string | null }>
    >('SELECT key, type, computeExpression FROM table_columns');

    const uiOnlyColumns = ['actions'];

    const selectParts = ['id', 'createdAt', 'updatedAt'];

    for (const col of allTableColumns) {
      if (uiOnlyColumns.includes(col.key)) continue;
      if (selectParts.includes(col.key)) continue;

      if (col.type === 'computed' && col.computeExpression) {
        // Only include computed columns if their expression references valid columns
        if (isComputeExpressionValid(col.computeExpression, validColumnSet)) {
          // Use expanded expression (with computed column references replaced)
          const expandedExpr = expandedExpressions.get(col.key) || col.computeExpression;
          selectParts.push(`(${expandedExpr}) AS ${col.key}`);
        }
      } else if (physicalColumns.includes(col.key)) {
        selectParts.push(col.key);
      }
    }

    const selectClause = selectParts.join(', ');

    params.push(pageSize, (page - 1) * pageSize);

    const query = `SELECT ${selectClause} FROM programs${whereClause}${orderByClause} LIMIT $${params.length - 1} OFFSET $${params.length}`;
    return (await db.select<Array<DbProgram>>(query, params)).map(
      (row: DbProgram) => new Program(row)
    );
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to fetch programs', message);
  }
}

export async function getProgramsCount(
  whereClause: string = '',
  params: Array<string | number> = []
): Promise<number> {
  try {
    const db = await getDatabase();
    const query = `SELECT COUNT(*) as count FROM programs${whereClause}`;
    const result = await db.select<Array<{ count: number }>>(query, params);
    return result[0].count;
  } catch (error) {
    logger.error('Failed to get programs count', error);
    return 0;
  }
}

export async function getProgramById(id: number): Promise<Program | null> {
  try {
    const db = await getDatabase();
    const result = await db.select<Array<DbProgram>>('SELECT * FROM programs WHERE id = ?', [id]);
    return result.length > 0 ? new Program(result[0]) : null;
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError(`Failed to fetch program with id ${id}`, message);
  }
}

export async function addProgram(program: Program): Promise<void> {
  try {
    const db = await getDatabase();
    const columns = await getSaveableColumns();

    // Process file columns
    await processFileColumns(program, columns);

    // Build dynamic INSERT
    const columnNames = columns.map((c) => c.key);
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    const values = program.toValues(columnNames);

    const sql = `INSERT INTO programs (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = await db.execute(sql, values);

    if (result.rowsAffected > 0) {
      PROGRAMS.splice(0, 0, program);
      DATA_VARS.reloadData = true;
      DATA_VARS.refresh = {};
      showSuccess('Program byl úspěšně přidán');
    }
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to add program', message);
  }
}

export async function addPrograms(programs: Array<Program>): Promise<void> {
  try {
    const db = await getDatabase();
    const columns = await getSaveableColumns();
    const columnNames = columns.map((c) => c.key);

    const totalCount = programs.length;
    let processedCount = 0;

    while (programs.length !== 0) {
      const sliced = programs.splice(0, 50);

      // Build placeholders for batch insert
      const valuePlaceholders: string[] = [];
      const values: Array<string | number | null> = [];

      for (const program of sliced) {
        const programValues = program.toValues(columnNames);
        const startIndex = values.length;
        const placeholders = programValues.map((_, i) => `$${startIndex + i + 1}`);
        valuePlaceholders.push(`(${placeholders.join(', ')})`);
        values.push(...programValues);
      }

      const sql = `INSERT INTO programs (${columnNames.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
      await db.execute(sql, values);

      processedCount += sliced.length;
      logger.info(`Imported ${processedCount}/${totalCount} programs`);
    }

    DATA_VARS.reloadData = true;
    showSuccess(`Úspěšně importováno ${totalCount} programů`);
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to import programs', message);
  }
}

export async function updateProgram(program: Program): Promise<void> {
  if (program.Id === undefined) {
    showError('Program neexistuje');
    return;
  }

  try {
    const db = await getDatabase();
    const columns = await getSaveableColumns();

    // Process file columns
    await processFileColumns(program, columns);

    // Build dynamic UPDATE
    const setClauses = columns.map((c, i) => `${c.key} = $${i + 1}`);
    const values = program.toValues(columns.map((c) => c.key));
    values.push(program.Id);

    const sql = `UPDATE programs SET updatedAt = CURRENT_TIMESTAMP, ${setClauses.join(', ')} WHERE id = $${values.length}`;
    const result = await db.execute(sql, values);

    if (result.rowsAffected > 0) {
      const item = await getProgramById(program.Id);
      if (item) {
        PROGRAMS.splice(
          PROGRAMS.findIndex((p) => p.Id === program.Id),
          1,
          item
        );
      }
      DATA_VARS.refresh = {};
      showSuccess('Program byl úspěšně aktualizován');
    }
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to update program', message);
  }
}

export async function removeProgram(program: Program): Promise<void> {
  try {
    const db = await getDatabase();
    const result = await db.execute(program.toSqlDelete(), [program.Id]);
    if (result.rowsAffected > 0) {
      PROGRAMS.splice(
        PROGRAMS.findIndex((p) => p.Id === program.Id),
        1
      );
      DATA_VARS.refresh = {};
      showSuccess('Program byl úspěšně smazán');
    }
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to delete program', message);
  }
}

/**
 * Copies (duplicates) a program row
 * - Respects copyable column setting (skips columns marked as not copyable)
 * - Generates new values for incremental columns
 * - Keeps same file references for file columns
 */
export async function copyProgram(source: Program): Promise<void> {
  try {
    const db = await getDatabase();

    // Get all column settings
    const columns = await db.select<
      Array<{
        key: string;
        type: string;
        copyable: number;
        incrementalPattern: string | null;
      }>
    >(
      `SELECT key, type, copyable, incrementalPattern FROM table_columns
       WHERE type != 'computed'
       AND key NOT IN ('id', 'createdAt', 'updatedAt', 'actions')
       ORDER BY position`
    );

    // Create new program instance
    const newProgram = new Program();

    for (const col of columns) {
      // Skip non-copyable columns
      if (!col.copyable) {
        continue;
      }

      // Handle incremental columns - generate new value
      if (col.type === 'incremental' && col.incrementalPattern) {
        const newValue = await generateIncrementalValue(col.incrementalPattern, col.key);
        newProgram.set(col.key, newValue);
        continue;
      }

      // Copy the value from source
      const sourceValue = source.get(col.key);
      if (sourceValue !== undefined && sourceValue !== null) {
        newProgram.set(col.key, sourceValue);
      }
    }

    // Use existing addProgram function to insert
    await addProgram(newProgram);

    showSuccess('Program byl úspěšně zkopírován');
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to copy program', message);
  }
}

export function getDisplayValue(program: Program, header: TableColumn): string {
  if (header.Key === 'actions') {
    return '';
  }

  const value = program.get(header.Key);

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      return value.toFixed(2);
    }
    return value.toString();
  }
  if (value instanceof Date) {
    // Use custom format if specified, otherwise use defaults
    if (header.DateFormat) {
      return formatWithCustomFormat(value, header.DateFormat, header.Type === 'datetime');
    }
    if (header.Type === 'date') {
      return formatDate(value);
    }
    return formatDateTime(value);
  }
  // Handle string dates (ISO format from database) for date/datetime columns
  if (typeof value === 'string' && (header.Type === 'date' || header.Type === 'datetime')) {
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime())) {
      if (header.DateFormat) {
        return formatWithCustomFormat(dateValue, header.DateFormat, header.Type === 'datetime');
      }
      if (header.Type === 'date') {
        return formatDate(dateValue);
      }
      return formatDateTime(dateValue);
    }
    // Invalid date string - return as is
    return value;
  }
  if (value instanceof File) {
    return value.Name;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export async function findCurrentYearLastItem(columnKey: string): Promise<Program | null> {
  try {
    const currentYear = new Date().getFullYear().toString().substring(2, 4);

    const db = await getDatabase();

    // Check if the column exists
    const programsTableInfo = await db.select<Array<{ name: string }>>(
      'PRAGMA table_info(programs)'
    );
    const existingColumnNames = programsTableInfo.map((col) => col.name);

    if (!existingColumnNames.includes(columnKey)) {
      return null;
    }

    const result = await db.select<Array<DbProgram>>(
      `SELECT * FROM programs WHERE ${columnKey} LIKE $1 || '___' ORDER BY ${columnKey} DESC LIMIT 1`,
      [currentYear]
    );
    if (result.length === 0) {
      return null;
    }

    return new Program(result[0]);
  } catch (error) {
    logger.error('Failed to find current year last item', error);
    return null;
  }
}

/**
 * Generates an incremental value based on a pattern
 * Pattern placeholders:
 * - {YY} = 2-digit year
 * - {YYYY} = 4-digit year
 * - {MM} = 2-digit month (01-12)
 * - {DD} = 2-digit day (01-31)
 * - {###} = 3-digit sequence (001, 002, etc.)
 * - {####} = 4-digit sequence
 * - {#####} = 5-digit sequence
 */
export async function generateIncrementalValue(
  pattern: string,
  columnKey: string
): Promise<string> {
  try {
    const db = await getDatabase();
    const now = new Date();
    const year2 = now.getFullYear().toString().slice(-2);
    const year4 = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Replace date placeholders first
    let patternForSearch = pattern
      .replace(/\{YYYY\}/g, year4)
      .replace(/\{YY\}/g, year2)
      .replace(/\{MM\}/g, month)
      .replace(/\{DD\}/g, day);

    // Find sequence placeholder and its length
    const seqMatch = pattern.match(/\{(#+)\}/);
    if (!seqMatch) {
      // No sequence placeholder, just return the pattern with year replaced
      return patternForSearch;
    }

    const seqLength = seqMatch[1].length;
    const seqPlaceholder = seqMatch[0];

    // Build SQL LIKE pattern to find existing values
    const sqlPattern = patternForSearch.replace(seqPlaceholder, '%');

    // Check if column exists
    const programsTableInfo = await db.select<Array<{ name: string }>>(
      'PRAGMA table_info(programs)'
    );
    const existingColumnNames = programsTableInfo.map((col) => col.name);

    if (!existingColumnNames.includes(columnKey)) {
      // Column doesn't exist, start at 1
      return patternForSearch.replace(seqPlaceholder, '1'.padStart(seqLength, '0'));
    }

    // Find the highest existing value matching the pattern
    const result = await db.select<Array<{ val: string }>>(
      `SELECT ${columnKey} as val FROM programs WHERE ${columnKey} LIKE $1 ORDER BY ${columnKey} DESC LIMIT 1`,
      [sqlPattern]
    );

    if (result.length === 0 || !result[0].val) {
      // No existing values, start at 1
      return patternForSearch.replace(seqPlaceholder, '1'.padStart(seqLength, '0'));
    }

    // Extract the sequence number from the existing value
    const existingValue = result[0].val;
    const prefix = patternForSearch.split(seqPlaceholder)[0];
    const suffix = patternForSearch.split(seqPlaceholder)[1] || '';

    // Extract numeric part
    const numericPart = existingValue
      .replace(prefix, '')
      .replace(suffix, '');

    const currentSeq = parseInt(numericPart, 10);
    const nextSeq = isNaN(currentSeq) ? 1 : currentSeq + 1;

    return patternForSearch.replace(seqPlaceholder, nextSeq.toString().padStart(seqLength, '0'));
  } catch (error) {
    logger.error('Failed to generate incremental value', error);
    // Return a safe default
    const now = new Date();
    return pattern
      .replace(/\{YYYY\}/g, now.getFullYear().toString())
      .replace(/\{YY\}/g, now.getFullYear().toString().slice(-2))
      .replace(/\{MM\}/g, (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace(/\{DD\}/g, now.getDate().toString().padStart(2, '0'))
      .replace(/\{#+\}/g, '001');
  }
}

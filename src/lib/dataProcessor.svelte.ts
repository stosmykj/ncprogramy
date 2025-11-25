import { Program } from '../models/program';
import type { DbProgram } from '../models/dbProgram';
import type { TableColumn } from '../models/tableColumn';
import { File } from '../models/file';
import { DatabaseError, handleError } from './errorHandler';
import { showError, showSuccess } from './toast.svelte';
import { getDatabase } from './database';
import { formatDate, formatDateTime } from './dateFormatter.svelte';
import { copyFileToStorageIfNeeded } from './fileStorageProcessor';

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
    if (col.type === 'file') {
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

    if (!DATA_VARS.isImporting) {
      const whereParts: Array<string> = [];

      if (DATA_VARS.quickSearch) {
        const allColumns = await db.select<Array<{ key: string; type: string; visible: number }>>(
          'SELECT key, type, visible FROM table_columns WHERE visible = 1 AND key NOT IN ("id", "createdAt", "updatedAt", "actions")'
        );

        // Get actual columns from programs table
        const programsTableInfo = await db.select<Array<{ name: string }>>(
          'PRAGMA table_info(programs)'
        );
        const existingColumnNames = programsTableInfo.map((col) => col.name);

        const quickSearchParts = allColumns
          .filter((col) => col.type === 'computed' || existingColumnNames.includes(col.key))
          .map((col) => {
            params.push(`%${DATA_VARS.quickSearch}%`);

            if (col.type === 'file') {
              return `json_extract(${col.key}, '$.name') LIKE $${params.length}`;
            } else if (col.type === 'number') {
              return `CAST(${col.key} AS TEXT) LIKE $${params.length}`;
            } else if (col.type === 'date' || col.type === 'datetime') {
              return `date(${col.key}) LIKE $${params.length}`;
            }

            return `${col.key} LIKE $${params.length}`;
          });

        if (quickSearchParts.length > 0) {
          whereParts.push(`(${quickSearchParts.join(' OR ')})`);
        }
      }

      const filterColumns = await db.select<Array<{ key: string; filter: string; type: string }>>(
        'SELECT key, filter, type FROM table_columns WHERE filter IS NOT NULL AND filter != ""'
      );

      if (filterColumns.length > 0) {
        const filterParts = filterColumns
          .map((col) => {
            const filter = col.filter;
            const columnName = col.type === 'file' ? `json_extract(${col.key}, '$.name')` : col.key;

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

      const sortColumns = await db.select<Array<{ key: string; sort: number; type: string }>>(
        'SELECT key, sort, type FROM table_columns WHERE sort != 0 ORDER BY sortPosition ASC'
      );

      if (sortColumns.length > 0) {
        const sortParts = sortColumns.map((col) => {
          const direction = col.sort === 1 ? 'ASC' : 'DESC';

          if (col.type === 'file') {
            return `json_extract(${col.key}, '$.name') ${direction}`;
          }

          return `${col.key} ${direction}`;
        });

        orderByClause = ` ORDER BY ${sortParts.join(', ')}`;
      }
    }

    DATA_VARS.count = await getProgramsCount(whereClause, params);
    console.warn('Total programs count with filters:', DATA_VARS.count);

    const allTableColumns = await db.select<
      Array<{ key: string; type: string; computeExpression: string | null }>
    >('SELECT key, type, computeExpression FROM table_columns');

    const programsTableInfo = await db.select<Array<{ name: string }>>(
      'PRAGMA table_info(programs)'
    );
    const existingColumnNames = programsTableInfo.map((col) => col.name);

    const uiOnlyColumns = ['actions'];

    const selectParts = ['id', 'createdAt', 'updatedAt'];

    for (const col of allTableColumns) {
      if (uiOnlyColumns.includes(col.key)) continue;
      if (selectParts.includes(col.key)) continue;

      if (col.type === 'computed' && col.computeExpression) {
        selectParts.push(`(${col.computeExpression}) AS ${col.key}`);
      } else if (existingColumnNames.includes(col.key)) {
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
    console.error('Failed to get programs count:', error);
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
      console.warn(`Imported ${processedCount}/${totalCount} programs`);
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
    if (header.Type === 'date') {
      return formatDate(value);
    }
    return formatDateTime(value);
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
    console.error('Failed to find current year last item:', error);
    return null;
  }
}

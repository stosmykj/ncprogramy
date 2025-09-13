import { Program } from '../models/program';
import type { DbProgram } from '../models/dbProgram';
import computationService from '../lib/computationService';
import type { TableColumn } from '../models/tableColumn';
import { File } from '../models/file';
import { DatabaseError, handleError } from './errorHandler';
import { showError, showSuccess } from './toast.svelte';
import { getDatabase } from './database';
import { validateProgram } from './validation/programValidator';
import { formatDate, formatDateTime } from './dateFormatter.svelte';

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
  selectedRows: new Set<string>(),
  bulkSelectMode: false,
});

export async function getProgramsWithDateRange(
  dateRangeStart?: Date | null,
  dateRangeEnd?: Date | null
): Promise<Array<Program>> {
  try {
    const db = await getDatabase();
    const whereParts: Array<string> = [];
    const params: Array<string> = [];

    // Date range filter
    if (dateRangeStart || dateRangeEnd) {
      if (dateRangeStart && dateRangeEnd) {
        params.push(dateRangeStart.toISOString(), dateRangeEnd.toISOString());
        whereParts.push(
          `COALESCE(createdAt, doneAt, arrivedAt, deadlineAt) BETWEEN $${params.length - 1} AND $${params.length}`
        );
      } else if (dateRangeStart) {
        params.push(dateRangeStart.toISOString());
        whereParts.push(`COALESCE(createdAt, doneAt, arrivedAt, deadlineAt) >= $${params.length}`);
      } else if (dateRangeEnd) {
        params.push(dateRangeEnd.toISOString());
        whereParts.push(`COALESCE(createdAt, doneAt, arrivedAt, deadlineAt) <= $${params.length}`);
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
          'SELECT key, type, visible FROM table_columns WHERE visible = 1 AND key NOT IN ("id", "createdAt", "updatedAt" ,"actions") AND computeFunctionName IS NULL'
        );

        const quickSearchParts = allColumns.map((col) => {
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

      // Column-specific filters
      const filterColumns = await db.select<Array<{ key: string; filter: string; type: string }>>(
        'SELECT key, filter, type FROM table_columns WHERE filter IS NOT NULL AND filter != ""'
      );

      if (filterColumns.length > 0) {
        const filterParts = filterColumns
          .map((col) => {
            const filter = col.filter;
            const columnName = col.type === 'file' ? `json_extract(${col.key}, '$.name')` : col.key;

            // Parse filter operator and value(s)
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
              // Default: contains (LIKE)
              params.push(`%${filter}%`);

              // Handle different column types for LIKE
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

      // Combine all WHERE conditions
      if (whereParts.length > 0) {
        whereClause = ` WHERE ${whereParts.join(' AND ')}`;
      }

      // Get sorting configuration
      const sortColumns = await db.select<Array<{ key: string; sort: number; type: string }>>(
        'SELECT key, sort, type FROM table_columns WHERE sort != 0 ORDER BY sortPosition ASC'
      );

      if (sortColumns.length > 0) {
        const sortParts = sortColumns.map((col) => {
          const direction = col.sort === 1 ? 'ASC' : 'DESC';

          // Handle File type columns - sort by JSON property 'name'
          if (col.type === 'file') {
            return `json_extract(${col.key}, '$.name') ${direction}`;
          }

          return `${col.key} ${direction}`;
        });

        orderByClause = ` ORDER BY ${sortParts.join(', ')}`;
      }
    }

    // Update count with filters applied
    DATA_VARS.count = await getProgramsCount(whereClause, params);
    console.warn('Total programs count with filters:', DATA_VARS.count);
    // Add pagination params
    params.push(pageSize, (page - 1) * pageSize);

    const query = `SELECT * FROM programs${whereClause}${orderByClause} LIMIT $${params.length - 1} OFFSET $${params.length}`;
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
    validateProgram(program);

    const db = await getDatabase();
    const result = await db.execute(program.toSqlInsert(), program.toArray());
    if (result.rowsAffected > 0) {
      PROGRAMS.splice(0, 0, program);
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
    const totalCount = programs.length;
    let processedCount = 0;

    while (programs.length !== 0) {
      const sliced = programs.splice(0, 50);
      let sql = `INSERT INTO programs (
        createdAt,
        updatedAt,
        programId,
        name,
        orderNumber,
        deadlineAt,
        arrivedAt,
        doneAt,
        count,
        design,
        drawing,
        clamping,
        preparing,
        programing,
        machineWorking,
        extraTime,
        note
      ) VALUES `;
      const values: Array<string | number | Date | undefined> = [];
      for (const program of sliced) {
        let itemSql = '(';
        for (let i = 0; i < Object.keys(program).filter((v) => v !== 'id').length; i++) {
          itemSql += `$${values.length + i + 1},`;
        }
        itemSql = itemSql.substring(0, itemSql.length - 1);
        itemSql += '),';
        sql += itemSql;
        values.push(...program.toArrayImport());
      }
      sql = sql.substring(0, sql.length - 1);
      await db.execute(sql, values);

      processedCount += sliced.length;
      console.warn(`Imported ${processedCount}/${totalCount} programs`);
    }

    DATA_VARS.refresh = {};
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
    validateProgram(program);

    const db = await getDatabase();
    const result = await db.execute(program.toSqlUpdate(), [...program.toArray(), program.Id]);

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

export async function bulkDeletePrograms(programIds: Array<string>): Promise<void> {
  try {
    if (programIds.length === 0) {
      return;
    }

    const db = await getDatabase();
    const placeholders = programIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `DELETE FROM programs WHERE programId IN (${placeholders})`;

    await db.execute(query, programIds);

    // Remove from local state
    for (const programId of programIds) {
      const index = PROGRAMS.findIndex((p) => p.ProgramId === programId);
      if (index !== -1) {
        PROGRAMS.splice(index, 1);
      }
    }

    // Clear selection
    DATA_VARS.selectedRows.clear();
    DATA_VARS.refresh = {};
    showSuccess(`Úspěšně odstraněno ${programIds.length} záznamů`);
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to bulk delete programs', message);
  }
}

export async function bulkUpdatePrograms(
  programIds: Array<string>,
  updates: Partial<Program>
): Promise<void> {
  try {
    if (programIds.length === 0 || Object.keys(updates).length === 0) {
      return;
    }

    const db = await getDatabase();
    const setClauses: Array<string> = [];
    const values: Array<string | number | Date | null> = [];

    // Build SET clause
    for (const [key, value] of Object.entries(updates)) {
      values.push(value as string | number | Date | null);
      setClauses.push(`${key} = $${values.length}`);
    }

    // Add programIds to parameters
    const placeholders = programIds.map((_, i) => `$${values.length + i + 1}`).join(',');
    values.push(...programIds);

    const query = `UPDATE programs SET ${setClauses.join(', ')}, updatedAt = datetime('now') WHERE programId IN (${placeholders})`;

    await db.execute(query, values);

    // Update local state
    for (const program of PROGRAMS) {
      if (programIds.includes(program.ProgramId)) {
        Object.assign(program, updates);
        program.UpdatedAt = new Date();
      }
    }

    DATA_VARS.refresh = {};
    showSuccess(`Úspěšně aktualizováno ${programIds.length} záznamů`);
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to bulk update programs', message);
  }
}

export function getDisplayValue(program: Program, header: TableColumn) {
  if (header.Key === 'totalTime') {
    return computationService[header.ComputeFunctionName!](program).toString();
  }

  if (header.Key === 'actions') {
    return '';
  }

  const value = program[header.Key as keyof Program];
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      return value.toFixed(2);
    }
    return value.toString();
  }
  if (value instanceof Date) {
    // Format dates based on column type
    if (header.Type === 'date') {
      return formatDate(value);
    } else if (header.Type === 'datetime') {
      return formatDateTime(value);
    }
    // Fallback for columns without explicit type (like createdAt, updatedAt)
    return formatDateTime(value);
  }
  if (value instanceof File) {
    return value.Name;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined) {
    return '';
  }
  return '';
}

export async function findCurrentYearLastItem(): Promise<Program | null> {
  try {
    const currentYear = new Date().getFullYear().toString().substring(2, 4);

    const db = await getDatabase();
    const result = await db.select<Array<DbProgram>>(
      "SELECT * FROM programs WHERE programId LIKE $1 || '___' ORDER BY programId DESC LIMIT 1",
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

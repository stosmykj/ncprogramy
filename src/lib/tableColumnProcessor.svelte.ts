import { TableColumn, type ColumnKeys } from '../models/tableColumn';
import type { DbTableColumn } from '../models/dbTableColumn';
import { DatabaseError, handleError } from './errorHandler';
import { showError } from './toast.svelte';
import { getDatabase } from './database';
import { DATA_VARS } from './dataProcessor.svelte';

export const TABLECOLUMNS = $state<Array<TableColumn>>([]);

export async function initTableColumns(): Promise<void> {
  try {
    const db = await getDatabase();
    TABLECOLUMNS.push(
      ...(
        await db.select<Array<DbTableColumn>>('SELECT * FROM table_columns ORDER BY position')
      ).map((row: DbTableColumn) => new TableColumn(row))
    );
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to initialize table columns', message);
  }
}

export async function getTableColumnByKey(key: string): Promise<TableColumn | null> {
  const db = await getDatabase();
  const result = await db.select<Array<DbTableColumn>>(
    'SELECT * FROM table_columns WHERE key = ?',
    [key]
  );
  return result.length > 0 ? new TableColumn(result[0]) : null;
}

export async function updateTableColumn(tableColumn: TableColumn): Promise<void> {
  try {
    const db = await getDatabase();
    await db.execute(tableColumn.toSqlUpdate(), tableColumn.toArray());
    const updated = await getTableColumnByKey(tableColumn.Key);
    if (updated === null) {
      return;
    }
    const index = TABLECOLUMNS.findIndex((p) => p.Key === updated.Key);
    if (index === -1) {
      return;
    }
    TABLECOLUMNS.splice(index, 1, updated);
    DATA_VARS.reloadData = true;
  } catch (error) {
    const message = handleError(error);
    showError(message);
    throw new DatabaseError('Failed to update table column', message);
  }
}

export async function showHeader(key: ColumnKeys): Promise<void> {
  const index = TABLECOLUMNS.findIndex((c) => c.Key === key);
  TABLECOLUMNS[index].Visible = true;
  await updateTableColumn(TABLECOLUMNS[index]);
}

export async function hideHeader(key: ColumnKeys): Promise<void> {
  const index = TABLECOLUMNS.findIndex((c) => c.Key === key);
  TABLECOLUMNS[index].Visible = false;
  await updateTableColumn(TABLECOLUMNS[index]);
}

export async function toggleSort(key: ColumnKeys): Promise<void> {
  const index = TABLECOLUMNS.findIndex((c) => c.Key === key);
  const column = TABLECOLUMNS[index];

  // Toggle through: none (0) -> asc (1) -> desc (-1) -> none (0)
  if (column.Sort === 0) {
    // Set to ascending
    column.Sort = 1;
    column.SortPosition = (await getLastSortNumber()) + 1;
  } else if (column.Sort === 1) {
    // Set to descending
    column.Sort = -1;
  } else {
    // Remove sorting
    await removeSortInternal(key);
    return;
  }

  await updateTableColumn(column);
}

export async function addSort(key: ColumnKeys): Promise<void> {
  const index = TABLECOLUMNS.findIndex((c) => c.Key === key);
  TABLECOLUMNS[index].SortPosition = (await getLastSortNumber()) + 1;
  TABLECOLUMNS[index].Sort = 1;

  await updateTableColumn(TABLECOLUMNS[index]);
}

export async function applyFilter(key: ColumnKeys, filter: string | undefined): Promise<void> {
  const index = TABLECOLUMNS.findIndex((c) => c.Key === key);
  TABLECOLUMNS[index].Filter = filter;
  await updateTableColumn(TABLECOLUMNS[index]);
}

async function removeSortInternal(key: ColumnKeys): Promise<void> {
  const sorted = TABLECOLUMNS.filter((v) => v.SortPosition !== 0).toSorted(
    (a, b) => a.SortPosition - b.SortPosition
  );
  let removeSort = TABLECOLUMNS.find((c) => c.Key === key)?.SortPosition ?? 0;
  if (removeSort == 0) {
    return;
  }
  for (const item of sorted) {
    const index = TABLECOLUMNS.findIndex((c) => c.Key === item.Key);
    if (item.Key === key) {
      TABLECOLUMNS[index].Sort = 0;
      TABLECOLUMNS[index].SortPosition = 0;
    }
    if (item.SortPosition > removeSort) {
      TABLECOLUMNS[index].SortPosition--;
    }

    await updateTableColumn(TABLECOLUMNS[index]);
  }
}

async function getLastSortNumber(): Promise<number> {
  const db = await getDatabase();
  const result = await db.select<Array<DbTableColumn>>(
    'SELECT sortPosition FROM table_columns WHERE sort <> 0 ORDER BY sortPosition DESC LIMIT 1'
  );
  return result.length > 0 ? result[0].sortPosition : 0;
}

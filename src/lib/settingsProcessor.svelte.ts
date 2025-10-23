import Database, { type QueryResult } from '@tauri-apps/plugin-sql';
import { Settings } from '../models/settings';
import type { DbSettings } from '../models/dbSettings';

export const SETTINGS_VARS = $state({
  menuOpened: false,
  formatterOpened: false,
  columnManagerOpened: false,
});

export async function getSettings(): Promise<Array<Settings>> {
  const db = await Database.load('sqlite:data.db');
  return (await db.select<Array<DbSettings>>('SELECT * FROM settings')).map(
    (row: DbSettings) => new Settings(row)
  );
}

export async function getSettingsByKey(key: string): Promise<Settings | null> {
  const db = await Database.load('sqlite:data.db');
  const result = await db.select<Array<DbSettings>>('SELECT * FROM settings WHERE key = ?', [key]);
  return result.length > 0 ? new Settings(result[0]) : null;
}

export async function addSettings(settings: Settings): Promise<QueryResult> {
  const db = await Database.load('sqlite:data.db');
  const result = await db.execute(settings.toSqlInsert(), settings.toArray());
  return result;
}

export async function updateSettings(settings: Settings): Promise<QueryResult> {
  const db = await Database.load('sqlite:data.db');
  const result = await db.execute(settings.toSqlUpdate(), [...settings.toArray(), settings.Id]);
  return result;
}

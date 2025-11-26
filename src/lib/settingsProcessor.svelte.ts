import Database, { type QueryResult } from '@tauri-apps/plugin-sql';
import { Settings } from '../models/settings';
import type { DbSettings } from '../models/dbSettings';
import type { File } from '../models/file';

export const SETTINGS_VARS = $state({
  menuOpened: false,
  formatterOpened: false,
  columnManagerOpened: false,
  backupManagerOpened: false,
  logManagerOpened: false,
  gcodeEditorOpened: false,
  gcodeEditorFile: null as File | null,
  gcodeEditorProgramId: null as number | null,
  gcodeEditorColumnKey: null as string | null,
  isAppInitialized: false,
});

const APP_INITIALIZED_KEY = 'app_initialized';

export async function checkAppInitialized(): Promise<boolean> {
  const db = await Database.load('sqlite:data.db');
  const result = await db.select<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ?',
    [APP_INITIALIZED_KEY]
  );
  const isInitialized = result.length > 0 && result[0].value === 'true';
  SETTINGS_VARS.isAppInitialized = isInitialized;
  return isInitialized;
}

export async function markAppAsInitialized(): Promise<void> {
  const db = await Database.load('sqlite:data.db');
  await db.execute('INSERT OR REPLACE INTO settings (key, type, value) VALUES (?, ?, ?)', [
    APP_INITIALIZED_KEY,
    'boolean',
    'true',
  ]);
  SETTINGS_VARS.isAppInitialized = true;
}

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

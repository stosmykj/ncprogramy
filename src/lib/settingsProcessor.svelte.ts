import { type QueryResult } from '@tauri-apps/plugin-sql';
import { Settings } from '../models/settings';
import type { DbSettings } from '../models/dbSettings';
import type { File } from '../models/file';
import { getDatabase } from './database';
import { logger } from './logger';

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
  snippetsManagerOpened: false,
  isAppInitialized: false,
  textZoomLevel: 100, // Zoom level in percent (50-200)
});

const APP_INITIALIZED_KEY = 'app_initialized';

export async function checkAppInitialized(): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.select<Array<{ value: string }>>(
    'SELECT value FROM settings WHERE key = ?',
    [APP_INITIALIZED_KEY]
  );
  const isInitialized = result.length > 0 && result[0].value === 'true';
  SETTINGS_VARS.isAppInitialized = isInitialized;
  return isInitialized;
}

export async function markAppAsInitialized(): Promise<void> {
  const db = await getDatabase();
  await db.execute('INSERT OR REPLACE INTO settings (key, type, value) VALUES (?, ?, ?)', [
    APP_INITIALIZED_KEY,
    'boolean',
    'true',
  ]);
  SETTINGS_VARS.isAppInitialized = true;
}

export async function getSettings(): Promise<Array<Settings>> {
  const db = await getDatabase();
  return (await db.select<Array<DbSettings>>('SELECT * FROM settings')).map(
    (row: DbSettings) => new Settings(row)
  );
}

export async function getSettingsByKey(key: string): Promise<Settings | null> {
  const db = await getDatabase();
  const result = await db.select<Array<DbSettings>>('SELECT * FROM settings WHERE key = ?', [key]);
  return result.length > 0 ? new Settings(result[0]) : null;
}

export async function addSettings(settings: Settings): Promise<QueryResult> {
  const db = await getDatabase();
  const result = await db.execute(settings.toSqlInsert(), settings.toArray());
  return result;
}

export async function updateSettings(settings: Settings): Promise<QueryResult> {
  const db = await getDatabase();
  const result = await db.execute(settings.toSqlUpdate(), [...settings.toArray(), settings.Id]);
  return result;
}

// Zoom level settings
const ZOOM_LEVEL_KEY = 'text_zoom_level';
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

export async function loadTextZoomLevel(): Promise<number> {
  try {
    const db = await getDatabase();
    const result = await db.select<Array<{ value: string }>>(
      'SELECT value FROM settings WHERE key = ?',
      [ZOOM_LEVEL_KEY]
    );
    if (result.length > 0) {
      const level = parseInt(result[0].value, 10);
      if (!isNaN(level) && level >= MIN_ZOOM && level <= MAX_ZOOM) {
        SETTINGS_VARS.textZoomLevel = level;
        return level;
      }
    }
  } catch (error) {
    logger.warn('Failed to load zoom level, using default', error);
  }
  SETTINGS_VARS.textZoomLevel = 100;
  return 100;
}

export async function saveTextZoomLevel(level: number): Promise<void> {
  const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
  SETTINGS_VARS.textZoomLevel = clampedLevel;

  try {
    const db = await getDatabase();
    await db.execute('INSERT OR REPLACE INTO settings (key, type, value) VALUES (?, ?, ?)', [
      ZOOM_LEVEL_KEY,
      'number',
      clampedLevel.toString(),
    ]);
  } catch (error) {
    logger.warn('Failed to save zoom level to database', error);
  }
}

export function zoomIn(): void {
  const newLevel = Math.min(MAX_ZOOM, SETTINGS_VARS.textZoomLevel + ZOOM_STEP);
  saveTextZoomLevel(newLevel);
  applyZoomLevel(newLevel);
}

export function zoomOut(): void {
  const newLevel = Math.max(MIN_ZOOM, SETTINGS_VARS.textZoomLevel - ZOOM_STEP);
  saveTextZoomLevel(newLevel);
  applyZoomLevel(newLevel);
}

export function zoomReset(): void {
  saveTextZoomLevel(100);
  applyZoomLevel(100);
}

export function applyZoomLevel(level: number): void {
  const factor = level / 100;
  document.documentElement.style.setProperty('--zoom-factor', factor.toString());
  // Apply zoom to root font-size so all rem-based sizes scale
  document.documentElement.style.fontSize = `${level}%`;
}

import { save, open } from '@tauri-apps/plugin-dialog';
import {
  writeTextFile,
  readTextFile,
  readDir,
  remove,
  exists,
  mkdir,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';
import { getProgramsWithDateRange, DATA_VARS } from './dataProcessor.svelte';
import { showSuccess, showError } from './toast.svelte';
import { Program } from '../models/program';
import { File } from '../models/file';
import { getDatabase } from './database';
import { initTableColumns } from './tableColumnProcessor.svelte';
import { initFormattingRules } from './formattingProcessor.svelte';

const BACKUP_FOLDER = 'backups';
const BACKUP_RETENTION_DAYS = 3;

async function ensureBackupDirectoryExists(): Promise<void> {
  const dirExists = await exists(BACKUP_FOLDER, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(BACKUP_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

function generateBackupFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `backup_${timestamp}.json`;
}

async function getBackupFiles(): Promise<string[]> {
  try {
    const entries = await readDir(BACKUP_FOLDER, { baseDir: BaseDirectory.AppData });
    return entries
      .filter((entry) => entry.name?.endsWith('.json'))
      .map((entry) => entry.name!)
      .sort()
      .reverse(); // Most recent first
  } catch {
    return [];
  }
}

export interface BackupInfo {
  filename: string;
  createdAt: Date | null;
  programCount: number | null;
}

export async function getBackupList(): Promise<BackupInfo[]> {
  await ensureBackupDirectoryExists();
  const files = await getBackupFiles();
  const backups: BackupInfo[] = [];

  for (const filename of files) {
    const date = parseBackupDate(filename);
    let programCount: number | null = null;

    try {
      const content = await readTextFile(`${BACKUP_FOLDER}/${filename}`, {
        baseDir: BaseDirectory.AppData,
      });
      const data = JSON.parse(content);
      programCount = data.programCount ?? data.programs?.length ?? null;
    } catch {
      // Ignore parse errors
    }

    backups.push({
      filename,
      createdAt: date,
      programCount,
    });
  }

  return backups;
}

async function getAllTableColumns(): Promise<BackupTableColumn[]> {
  const db = await getDatabase();
  return await db.select<BackupTableColumn[]>('SELECT * FROM table_columns ORDER BY position');
}

async function getAllFormattingRules(): Promise<BackupFormattingRule[]> {
  const db = await getDatabase();
  return await db.select<BackupFormattingRule[]>(
    'SELECT * FROM formatting_rules ORDER BY priority'
  );
}

async function getAllSettings(): Promise<BackupSetting[]> {
  const db = await getDatabase();
  return await db.select<BackupSetting[]>('SELECT * FROM settings');
}

// Get all programs as raw database records
async function getAllProgramsRaw(): Promise<Record<string, unknown>[]> {
  const db = await getDatabase();
  return await db.select<Record<string, unknown>[]>('SELECT * FROM programs ORDER BY id');
}

async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM programs');
  await db.execute('DELETE FROM formatting_rules');
  await db.execute('DELETE FROM table_columns');
}

async function restoreTableColumns(columns: BackupTableColumn[]): Promise<void> {
  if (!columns || columns.length === 0) return;

  const db = await getDatabase();

  for (const col of columns) {
    // Insert column metadata
    await db.execute(
      `INSERT OR REPLACE INTO table_columns (
        key, type, position, sort, sortPosition, visible, width, align,
        filter, archived, label, computeExpression
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        col.key,
        col.type,
        col.position,
        col.sort ?? 0,
        col.sortPosition ?? 0,
        col.visible ?? 1,
        col.width ?? 'auto',
        col.align ?? 'left',
        col.filter ?? null,
        col.archived ?? 0,
        col.label ?? null,
        col.computeExpression ?? null,
      ]
    );

    // Add column to programs table if it doesn't exist and is not computed/actions
    if (col.type !== 'computed' && col.key !== 'actions') {
      const systemColumns = ['id', 'createdAt', 'updatedAt'];
      if (!systemColumns.includes(col.key)) {
        try {
          let sqlType = 'TEXT';
          if (col.type === 'number') sqlType = 'REAL';

          await db.execute(`ALTER TABLE programs ADD COLUMN ${col.key} ${sqlType}`);
        } catch {
          // Column might already exist, ignore error
        }
      }
    }
  }
}

async function restoreFormattingRules(rules: BackupFormattingRule[]): Promise<void> {
  if (!rules || rules.length === 0) return;

  const db = await getDatabase();

  for (const rule of rules) {
    await db.execute(
      `INSERT INTO formatting_rules (
        name, target, columnKey, conditionTree, enabled, priority,
        backgroundColor, textColor, fontWeight
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.name,
        rule.target,
        rule.columnKey ?? null,
        rule.conditionTree ?? rule.condition ?? '{}',
        rule.enabled ?? 1,
        rule.priority ?? 0,
        rule.backgroundColor ?? null,
        rule.textColor ?? null,
        rule.fontWeight ?? null,
      ]
    );
  }
}

async function restoreSettings(settings: BackupSetting[]): Promise<void> {
  if (!settings || settings.length === 0) return;

  const db = await getDatabase();

  for (const setting of settings) {
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, type, value) VALUES (?, ?, ?)`,
      [setting.key, setting.type ?? 'string', setting.value]
    );
  }
}

async function restorePrograms(programs: BackupProgram[], columns: BackupTableColumn[]): Promise<void> {
  if (!programs || programs.length === 0) return;

  const db = await getDatabase();
  const totalCount = programs.length;
  let processedCount = 0;

  // Get saveable column keys (non-computed, non-actions, non-system)
  const systemColumns = ['id', 'createdAt', 'updatedAt', 'actions'];
  const saveableColumns = columns
    .filter((c) => c.type !== 'computed' && !systemColumns.includes(c.key))
    .map((c) => c.key);

  // Include system columns for insert
  const allColumns = ['createdAt', 'updatedAt', ...saveableColumns];

  // Process in batches of 50
  const batches: BackupProgram[][] = [];
  for (let i = 0; i < programs.length; i += 50) {
    batches.push(programs.slice(i, i + 50));
  }

  for (const batch of batches) {
    const valuePlaceholders: string[] = [];
    const values: (string | number | null)[] = [];

    for (const p of batch) {
      const programValues: (string | number | null)[] = [];

      // Add system columns
      programValues.push((p.createdAt as string) ?? new Date().toISOString());
      programValues.push((p.updatedAt as string) ?? new Date().toISOString());

      // Add dynamic columns
      for (const key of saveableColumns) {
        const value = p[key];
        if (value === undefined || value === null) {
          programValues.push(null);
        } else if (typeof value === 'object') {
          // Serialize objects (like File) to JSON
          programValues.push(JSON.stringify(value));
        } else {
          programValues.push(value as string | number);
        }
      }

      const startIndex = values.length;
      const placeholders = programValues.map((_, i) => `$${startIndex + i + 1}`);
      valuePlaceholders.push(`(${placeholders.join(', ')})`);
      values.push(...programValues);
    }

    const sql = `INSERT INTO programs (${allColumns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    await db.execute(sql, values);

    processedCount += batch.length;
    console.warn(`Restored ${processedCount}/${totalCount} programs`);
  }
}

export async function restoreBackup(filename: string): Promise<boolean> {
  try {
    const content = await readTextFile(`${BACKUP_FOLDER}/${filename}`, {
      baseDir: BaseDirectory.AppData,
    });
    const backupData: BackupData = JSON.parse(content);

    if (!backupData.version) {
      showError('Neplatný formát zálohy');
      return false;
    }

    DATA_VARS.isImporting = true;

    // Clear existing data
    await clearAllData();

    // Restore all data (columns first, then programs)
    await restoreTableColumns(backupData.tableColumns || []);
    await restoreFormattingRules(backupData.formattingRules || []);
    await restoreSettings(backupData.settings || []);
    await restorePrograms(backupData.programs || [], backupData.tableColumns || []);

    // Reload UI state
    await initTableColumns();
    await initFormattingRules();

    DATA_VARS.isImporting = false;
    DATA_VARS.reloadData = true;

    showSuccess(`Záloha obnovena (${backupData.programs?.length || 0} záznamů)`);
    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    DATA_VARS.isImporting = false;
    showError('Nepodařilo se obnovit zálohu');
    return false;
  }
}

export async function deleteBackup(filename: string): Promise<boolean> {
  try {
    await remove(`${BACKUP_FOLDER}/${filename}`, { baseDir: BaseDirectory.AppData });
    showSuccess('Záloha byla smazána');
    return true;
  } catch (error) {
    console.error('Failed to delete backup:', error);
    showError('Nepodařilo se smazat zálohu');
    return false;
  }
}

function parseBackupDate(filename: string): Date | null {
  // Format: backup_YYYY-MM-DDTHH-MM-SS.json
  const match = filename.match(/backup_(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})\.json/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

async function cleanOldBackups(): Promise<void> {
  const backupFiles = await getBackupFiles();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

  for (const file of backupFiles) {
    const backupDate = parseBackupDate(file);
    if (backupDate && backupDate < cutoffDate) {
      await remove(`${BACKUP_FOLDER}/${file}`, { baseDir: BaseDirectory.AppData });
      console.log(`Deleted old backup: ${file}`);
    }
  }
}

async function createBackupData(): Promise<BackupData> {
  const programsRaw = await getAllProgramsRaw();
  const tableColumns = await getAllTableColumns();
  const formattingRules = await getAllFormattingRules();
  const settings = await getAllSettings();

  return {
    version: 3,
    createdAt: new Date().toISOString(),
    programCount: programsRaw.length,
    programs: programsRaw as BackupProgram[],
    tableColumns,
    formattingRules,
    settings,
  };
}

export async function createBackup(silent: boolean = false): Promise<boolean> {
  try {
    await ensureBackupDirectoryExists();

    const backupData = await createBackupData();
    const filename = generateBackupFilename();
    const filePath = `${BACKUP_FOLDER}/${filename}`;

    await writeTextFile(filePath, JSON.stringify(backupData, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
    await cleanOldBackups();

    if (!silent) {
      showSuccess(`Záloha vytvořena: ${filename}`);
    }
    console.log(`Backup created: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Failed to create backup:', error);
    if (!silent) {
      showError('Nepodařilo se vytvořit zálohu');
    }
    return false;
  }
}

export async function exportBackup(): Promise<void> {
  try {
    const backupData = await createBackupData();

    const filename = await save({
      title: 'Exportovat zálohu',
      defaultPath: `ncprogramy_backup_${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (filename) {
      await writeTextFile(filename, JSON.stringify(backupData, null, 2));
      showSuccess('Záloha byla úspěšně exportována');
    }
  } catch (error) {
    console.error('Failed to export backup:', error);
    showError('Nepodařilo se exportovat zálohu');
  }
}

// Backup data types - dynamic structure
type BackupProgram = Record<string, unknown>;

interface BackupTableColumn {
  key: string;
  type: string;
  position: number;
  sort?: number;
  sortPosition?: number;
  visible?: number;
  width?: string;
  align?: string;
  filter?: string | null;
  archived?: number;
  label?: string | null;
  computeExpression?: string | null;
}

interface BackupFormattingRule {
  id?: number;
  name: string;
  target: string;
  columnKey?: string | null;
  conditionTree?: string;
  condition?: string; // Legacy field name
  enabled?: number;
  priority?: number;
  backgroundColor?: string | null;
  textColor?: string | null;
  fontWeight?: string | null;
}

interface BackupSetting {
  id?: number;
  key: string;
  type?: string;
  value: string;
}

interface BackupData {
  version: number;
  createdAt: string;
  programCount: number;
  programs: BackupProgram[];
  tableColumns?: BackupTableColumn[];
  formattingRules?: BackupFormattingRule[];
  settings?: BackupSetting[];
}

export async function importBackup(): Promise<void> {
  try {
    const filepath = await open({
      title: 'Importovat zálohu',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });

    if (!filepath) return;

    const content = await readTextFile(filepath as string);
    const backupData: BackupData = JSON.parse(content);

    if (!backupData.version) {
      showError('Neplatný formát zálohy');
      return;
    }

    DATA_VARS.isImporting = true;

    // Clear existing data
    await clearAllData();

    // Restore all data (columns first, then programs)
    await restoreTableColumns(backupData.tableColumns || []);
    await restoreFormattingRules(backupData.formattingRules || []);
    await restoreSettings(backupData.settings || []);
    await restorePrograms(backupData.programs || [], backupData.tableColumns || []);

    // Reload UI state
    await initTableColumns();
    await initFormattingRules();

    DATA_VARS.isImporting = false;
    DATA_VARS.reloadData = true;

    showSuccess(`Importováno ${backupData.programs?.length || 0} záznamů ze zálohy`);
  } catch (error) {
    console.error('Failed to import backup:', error);
    DATA_VARS.isImporting = false;
    showError('Nepodařilo se importovat zálohu');
  }
}

let backupInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicBackup(intervalMinutes: number = 60): void {
  if (backupInterval) {
    clearInterval(backupInterval);
  }

  // Create initial backup
  createBackup(true);

  // Set up periodic backup
  backupInterval = setInterval(
    () => {
      createBackup(true);
    },
    intervalMinutes * 60 * 1000
  );

  console.log(`Periodic backup started (every ${intervalMinutes} minutes)`);
}

export function stopPeriodicBackup(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('Periodic backup stopped');
  }
}

export async function createExitBackup(): Promise<void> {
  console.log('Creating exit backup...');
  await createBackup(true);
}

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
import { showSuccess, showError, showWarning } from './toast.svelte';
import { Program } from '../models/program';
import { File, type FileExtension } from '../models/file';
import { getDatabase } from './database';
import { initTableColumns, TABLECOLUMNS } from './tableColumnProcessor.svelte';
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

async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM programs');
  await db.execute('DELETE FROM formatting_rules');
  // Don't delete table_columns, just reset their state
  await db.execute('UPDATE table_columns SET filter = NULL, sort = 0, sortPosition = 0');
}

async function restoreTableColumns(columns: BackupTableColumn[]): Promise<void> {
  if (!columns || columns.length === 0) return;

  const db = await getDatabase();

  for (const col of columns) {
    // Check if column exists
    const existing = await db.select<{ key: string }[]>(
      'SELECT key FROM table_columns WHERE key = ?',
      [col.key]
    );

    if (existing.length > 0) {
      // Update existing column
      await db.execute(
        `UPDATE table_columns SET
          name = ?, type = ?, visible = ?, position = ?, width = ?,
          filter = ?, sort = ?, sortPosition = ?, archived = ?,
          computeExpression = ?
        WHERE key = ?`,
        [
          col.name,
          col.type,
          col.visible,
          col.position,
          col.width,
          col.filter,
          col.sort,
          col.sortPosition,
          col.archived,
          col.computeExpression,
          col.key,
        ]
      );
    }
  }
}

async function restoreFormattingRules(rules: BackupFormattingRule[]): Promise<void> {
  if (!rules || rules.length === 0) return;

  const db = await getDatabase();

  for (const rule of rules) {
    await db.execute(
      `INSERT INTO formatting_rules (
        name, target, columnKey, condition, enabled, priority,
        backgroundColor, textColor, fontWeight, fontStyle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.name,
        rule.target,
        rule.columnKey,
        rule.condition,
        rule.enabled,
        rule.priority,
        rule.backgroundColor,
        rule.textColor,
        rule.fontWeight,
        rule.fontStyle,
      ]
    );
  }
}

async function restoreSettings(settings: BackupSetting[]): Promise<void> {
  if (!settings || settings.length === 0) return;

  const db = await getDatabase();

  for (const setting of settings) {
    const existing = await db.select<{ key: string }[]>('SELECT key FROM settings WHERE key = ?', [
      setting.key,
    ]);

    if (existing.length > 0) {
      await db.execute('UPDATE settings SET value = ? WHERE key = ?', [setting.value, setting.key]);
    } else {
      await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', [
        setting.key,
        setting.value,
      ]);
    }
  }
}

async function restorePrograms(programs: BackupProgram[]): Promise<void> {
  if (!programs || programs.length === 0) return;

  const db = await getDatabase();
  const totalCount = programs.length;
  let processedCount = 0;

  // Process in batches of 50
  const batches = [];
  for (let i = 0; i < programs.length; i += 50) {
    batches.push(programs.slice(i, i + 50));
  }

  for (const batch of batches) {
    let sql = `INSERT INTO programs (
      createdAt, updatedAt, programId, name, orderNumber,
      deadlineAt, arrivedAt, doneAt, count, design, drawing,
      clamping, preparing, programing, machineWorking, extraTime, note
    ) VALUES `;

    const values: (string | number | null | undefined)[] = [];

    for (const p of batch) {
      const program = programFromBackup(p);
      const importValues = program.toArrayImport();
      let itemSql = '(';
      for (let i = 0; i < importValues.length; i++) {
        itemSql += `$${values.length + i + 1},`;
      }
      itemSql = itemSql.substring(0, itemSql.length - 1);
      itemSql += '),';
      sql += itemSql;
      values.push(...importValues);
    }

    sql = sql.substring(0, sql.length - 1);
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

    // Restore all data
    await restoreTableColumns(backupData.tableColumns || []);
    await restoreFormattingRules(backupData.formattingRules || []);
    await restoreSettings(backupData.settings || []);
    await restorePrograms(backupData.programs || []);

    // Reload UI state
    await initTableColumns();
    await initFormattingRules();

    DATA_VARS.isImporting = false;
    DATA_VARS.reloadData = true;

    showSuccess(`Záloha obnovena (${backupData.programs?.length || 0} programů)`);
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
  const programs = await getProgramsWithDateRange();
  const tableColumns = await getAllTableColumns();
  const formattingRules = await getAllFormattingRules();
  const settings = await getAllSettings();

  return {
    version: 2,
    createdAt: new Date().toISOString(),
    programCount: programs.length,
    programs: programs.map((p) => ({
      id: p.Id,
      createdAt: p.CreatedAt?.toISOString(),
      updatedAt: p.UpdatedAt?.toISOString(),
      programId: p.ProgramId,
      name: p.Name,
      orderNumber: p.OrderNumber,
      deadlineAt: p.DeadlineAt?.toISOString(),
      arrivedAt: p.ArrivedAt?.toISOString(),
      doneAt: p.DoneAt?.toISOString(),
      count: p.Count,
      design: p.Design
        ? {
            name: p.Design.Name,
            path: p.Design.Path,
            extension: p.Design.Extension,
          }
        : null,
      drawing: p.Drawing
        ? {
            name: p.Drawing.Name,
            path: p.Drawing.Path,
            extension: p.Drawing.Extension,
          }
        : null,
      clamping: p.Clamping
        ? {
            name: p.Clamping.Name,
            path: p.Clamping.Path,
            extension: p.Clamping.Extension,
          }
        : null,
      preparing: p.Preparing,
      programing: p.Programing,
      machineWorking: p.MachineWorking,
      extraTime: p.ExtraTime,
      note: p.Note,
    })),
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

// Backup data types
interface BackupProgram {
  id?: number;
  createdAt?: string;
  updatedAt?: string;
  programId: string;
  name?: string;
  orderNumber?: string;
  deadlineAt?: string;
  arrivedAt?: string;
  doneAt?: string;
  count?: number;
  design?: { name: string; path: string; extension: FileExtension } | null;
  drawing?: { name: string; path: string; extension: FileExtension } | null;
  clamping?: { name: string; path: string; extension: FileExtension } | null;
  preparing?: number;
  programing?: number;
  machineWorking?: number;
  extraTime?: string;
  note?: string;
}

interface BackupTableColumn {
  key: string;
  name: string;
  type: string;
  visible: number;
  position: number;
  width: number | null;
  filter: string | null;
  sort: number;
  sortPosition: number;
  archived: number;
  computeExpression: string | null;
}

interface BackupFormattingRule {
  id?: number;
  name: string;
  target: string;
  columnKey: string | null;
  condition: string;
  enabled: number;
  priority: number;
  backgroundColor: string | null;
  textColor: string | null;
  fontWeight: string | null;
  fontStyle: string | null;
}

interface BackupSetting {
  id?: number;
  key: string;
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

function programFromBackup(data: BackupProgram): Program {
  const program = new Program({
    programId: data.programId,
  });
  program.CreatedAt = data.createdAt ? new Date(data.createdAt) : new Date();
  program.UpdatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  program.Name = data.name;
  program.OrderNumber = data.orderNumber;
  program.DeadlineAt = data.deadlineAt ? new Date(data.deadlineAt) : undefined;
  program.ArrivedAt = data.arrivedAt ? new Date(data.arrivedAt) : undefined;
  program.DoneAt = data.doneAt ? new Date(data.doneAt) : undefined;
  program.Count = data.count;
  program.Design = data.design
    ? new File({ name: data.design.name, path: data.design.path, extension: data.design.extension })
    : undefined;
  program.Drawing = data.drawing
    ? new File({
        name: data.drawing.name,
        path: data.drawing.path,
        extension: data.drawing.extension,
      })
    : undefined;
  program.Clamping = data.clamping
    ? new File({
        name: data.clamping.name,
        path: data.clamping.path,
        extension: data.clamping.extension,
      })
    : undefined;
  program.Preparing = data.preparing;
  program.Programing = data.programing;
  program.MachineWorking = data.machineWorking;
  program.ExtraTime = data.extraTime;
  program.Note = data.note;
  return program;
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

    // Restore all data
    await restoreTableColumns(backupData.tableColumns || []);
    await restoreFormattingRules(backupData.formattingRules || []);
    await restoreSettings(backupData.settings || []);
    await restorePrograms(backupData.programs || []);

    // Reload UI state
    await initTableColumns();
    await initFormattingRules();

    DATA_VARS.isImporting = false;
    DATA_VARS.reloadData = true;

    showSuccess(`Importováno ${backupData.programs?.length || 0} programů ze zálohy`);
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

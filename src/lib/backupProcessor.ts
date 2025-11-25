import { save } from '@tauri-apps/plugin-dialog';
import {
  writeTextFile,
  readDir,
  remove,
  exists,
  mkdir,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';
import { getProgramsWithDateRange } from './dataProcessor.svelte';
import { showSuccess, showError } from './toast.svelte';

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

export async function createBackup(silent: boolean = false): Promise<boolean> {
  try {
    await ensureBackupDirectoryExists();

    const programs = await getProgramsWithDateRange();
    const backupData = {
      version: 1,
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
    };

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
    const programs = await getProgramsWithDateRange();
    const backupData = {
      version: 1,
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
    };

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

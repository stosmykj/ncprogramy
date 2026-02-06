import {
  writeTextFile,
  readDir,
  remove,
  exists,
  mkdir,
  stat,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';

const LOG_FOLDER = 'logs';
const MAX_LOG_AGE_DAYS = 60;
const LOG_ROTATION_DAYS = 7;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

let currentLogFile: string | null = null;
let logBuffer: string[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
const FLUSH_INTERVAL = 1000; // Flush every 1 second
const BUFFER_SIZE = 50; // Or when buffer reaches 50 entries

// Use window to persist initialization state across HMR
declare global {
  interface Window {
    __loggerInitialized?: boolean;
  }
}

async function ensureLogDirectoryExists(): Promise<void> {
  const dirExists = await exists(LOG_FOLDER, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(LOG_FOLDER, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

function getLogFileName(): string {
  const now = new Date();
  // Get the start of the current week (Monday)
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  const dateStr = weekStart.toISOString().split('T')[0];
  return `log_${dateStr}.txt`;
}

function formatLogEntry(entry: LogEntry): string {
  const dataStr = entry.data !== undefined ? ` | ${JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}\n`;
}

async function flushBuffer(): Promise<void> {
  if (logBuffer.length === 0 || isFlushing) return;

  isFlushing = true;
  try {
    await ensureLogDirectoryExists();
    const logFile = getLogFileName();
    // Grab current entries and clear buffer atomically
    const entries = logBuffer;
    logBuffer = [];
    const content = entries.join('');

    // Append to log file
    const filePath = `${LOG_FOLDER}/${logFile}`;
    let existingContent = '';

    try {
      const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
      if (fileExists) {
        const { readTextFile: readFile } = await import('@tauri-apps/plugin-fs');
        existingContent = await readFile(filePath, { baseDir: BaseDirectory.AppData });
      }
    } catch {
      // File doesn't exist yet, that's fine
    }

    await writeTextFile(filePath, existingContent + content, {
      baseDir: BaseDirectory.AppData,
    });

    currentLogFile = logFile;
  } catch (error) {
    // Fallback to console if logging fails
    console.error('Failed to write to log file:', error);
  } finally {
    isFlushing = false;
    // If new entries accumulated during flush, schedule another flush
    if (logBuffer.length > 0) {
      scheduleFlush();
    }
  }
}

function scheduleFlush(): void {
  if (flushTimeout !== null) return;

  flushTimeout = setTimeout(async () => {
    flushTimeout = null;
    await flushBuffer();
  }, FLUSH_INTERVAL);
}

async function writeLog(level: LogLevel, message: string, data?: unknown): Promise<void> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };

  const formattedEntry = formatLogEntry(entry);
  logBuffer.push(formattedEntry);

  // Also log to console in development
  if (import.meta.env.DEV) {
    const consoleMethod =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log;
    consoleMethod(`[${level.toUpperCase()}]`, message, data ?? '');
  }

  // Flush if buffer is full or schedule a flush
  if (logBuffer.length >= BUFFER_SIZE) {
    await flushBuffer();
  } else {
    scheduleFlush();
  }
}

export const logger = {
  debug: (message: string, data?: unknown) => writeLog('debug', message, data),
  info: (message: string, data?: unknown) => writeLog('info', message, data),
  warn: (message: string, data?: unknown) => writeLog('warn', message, data),
  error: (message: string, data?: unknown) => writeLog('error', message, data),

  // Force flush (call before app exit)
  flush: flushBuffer,
};

export async function getLogFiles(): Promise<Array<{ name: string; size: number; date: Date }>> {
  try {
    await ensureLogDirectoryExists();
    const entries = await readDir(LOG_FOLDER, { baseDir: BaseDirectory.AppData });
    const logFiles: Array<{ name: string; size: number; date: Date }> = [];

    for (const entry of entries) {
      if (entry.name?.endsWith('.txt')) {
        try {
          const stats = await stat(`${LOG_FOLDER}/${entry.name}`, {
            baseDir: BaseDirectory.AppData,
          });

          // Parse date from filename (log_YYYY-MM-DD.txt)
          const match = entry.name.match(/log_(\d{4}-\d{2}-\d{2})\.txt/);
          const date = match ? new Date(match[1]) : new Date();

          logFiles.push({
            name: entry.name,
            size: Number(stats.size),
            date,
          });
        } catch {
          // Ignore files we can't stat
        }
      }
    }

    return logFiles.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    return [];
  }
}

export async function getTotalLogSize(): Promise<number> {
  const files = await getLogFiles();
  return files.reduce((sum, file) => sum + file.size, 0);
}

export async function cleanOldLogs(): Promise<number> {
  try {
    const files = await getLogFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_LOG_AGE_DAYS);

    let deletedCount = 0;
    for (const file of files) {
      if (file.date < cutoffDate) {
        await remove(`${LOG_FOLDER}/${file.name}`, { baseDir: BaseDirectory.AppData });
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old log files`);
    }

    return deletedCount;
  } catch (error) {
    console.error('Failed to clean old logs:', error);
    return 0;
  }
}

export async function clearAllLogs(): Promise<boolean> {
  try {
    const files = await getLogFiles();
    for (const file of files) {
      await remove(`${LOG_FOLDER}/${file.name}`, { baseDir: BaseDirectory.AppData });
    }
    logger.info('All logs cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear logs:', error);
    return false;
  }
}

export async function exportLogs(): Promise<string | null> {
  try {
    const files = await getLogFiles();
    let allLogs = '';

    for (const file of files) {
      try {
        const { readTextFile: readFile } = await import('@tauri-apps/plugin-fs');
        const content = await readFile(`${LOG_FOLDER}/${file.name}`, {
          baseDir: BaseDirectory.AppData,
        });
        allLogs += `\n=== ${file.name} ===\n${content}`;
      } catch {
        // Skip files we can't read
      }
    }

    return allLogs;
  } catch {
    return null;
  }
}

// Initialize logger - clean old logs on startup
export async function initLogger(): Promise<void> {
  // Skip during SSR
  if (typeof window === 'undefined') return;

  if (window.__loggerInitialized) return;
  window.__loggerInitialized = true;

  await ensureLogDirectoryExists();
  await cleanOldLogs();
  logger.info('Application started');
}

// Cleanup function for app exit
export async function shutdownLogger(): Promise<void> {
  await flushBuffer();
  logger.info('Application shutting down');
  await flushBuffer();
}

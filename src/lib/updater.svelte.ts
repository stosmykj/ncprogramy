import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { showError, showInfo, showSuccess } from './toast.svelte';
import { logger } from './logger';

export interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  installing: boolean;
  error: string | null;
  currentVersion: string;
  latestVersion: string | null;
  update: Update | null;
  showDialog: boolean;
  progress: number;
}

export const UPDATE_STATE = $state<UpdateState>({
  checking: false,
  available: false,
  downloading: false,
  installing: false,
  error: null,
  currentVersion: '',
  latestVersion: null,
  update: null,
  showDialog: false,
  progress: 0,
});

export async function checkForUpdates(silent: boolean = false): Promise<boolean> {
  try {
    UPDATE_STATE.checking = true;
    UPDATE_STATE.error = null;

    if (!silent) {
      showInfo('Kontroluji aktualizace...');
    }

    logger.info('[Updater] Checking for updates...');
    logger.info('[Updater] Current version: ' + UPDATE_STATE.currentVersion);

    const update = await check();

    logger.info('[Updater] Check result', update);

    if (update) {
      UPDATE_STATE.available = true;
      UPDATE_STATE.latestVersion = update.version;
      UPDATE_STATE.update = update;

      logger.info('[Updater] Update available', update);

      if (!silent) {
        showSuccess(`Nová verze ${update.version} je k dispozici!`, 5000);
      }

      return true;
    } else {
      UPDATE_STATE.available = false;

      logger.info('[Updater] No updates available');

      if (!silent) {
        showInfo('Používáte nejnovější verzi aplikace');
      }

      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba';
    UPDATE_STATE.error = errorMessage;

    logger.error('[Updater] Update check failed', error);
    logger.error('[Updater] Error details', {
      message: errorMessage,
      error: error,
    });

    if (!silent) {
      showError(`Chyba při kontrole aktualizací: ${errorMessage}`);
    }

    return false;
  } finally {
    UPDATE_STATE.checking = false;
  }
}

export async function downloadAndInstall(): Promise<void> {
  if (!UPDATE_STATE.update) {
    showError('Žádná aktualizace k instalaci');
    return;
  }

  try {
    UPDATE_STATE.downloading = true;
    UPDATE_STATE.error = null;

    showInfo('Stahuji aktualizaci...', 0);

    let downloaded = 0;
    let contentLength = 0;

    await UPDATE_STATE.update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0;
          logger.info(`Started downloading ${contentLength} bytes`);
          break;
        case 'Progress': {
          downloaded += event.data.chunkLength;
          const progress = contentLength > 0 ? (downloaded / contentLength) * 100 : 0;
          UPDATE_STATE.progress = progress;
          logger.debug(`Download progress: ${progress.toFixed(1)}%`);
          break;
        }
        case 'Finished':
          logger.info('Download finished');
          break;
      }
    });

    UPDATE_STATE.downloading = false;
    UPDATE_STATE.installing = true;

    showSuccess('Aktualizace nainstalována! Restartování aplikace...', 3000);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await relaunch();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba';
    UPDATE_STATE.error = errorMessage;
    UPDATE_STATE.downloading = false;
    UPDATE_STATE.installing = false;

    showError(`Chyba při instalaci aktualizace: ${errorMessage}`, 8000);
    logger.error('Update installation failed', error);
  }
}

export function skipUpdate(): void {
  UPDATE_STATE.available = false;
  UPDATE_STATE.update = null;
  UPDATE_STATE.latestVersion = null;
  showInfo('Aktualizace přeskočena');
}

export async function initializeUpdater(): Promise<void> {
  UPDATE_STATE.checking = true;
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await checkForUpdates(true);
}

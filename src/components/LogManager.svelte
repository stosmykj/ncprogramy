<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import { getLogFiles, getTotalLogSize, clearAllLogs, exportLogs, logger } from '$lib/logger';
  import { formatFileSize } from '$lib/backupProcessor';
  import { formatDate } from '$lib/dateFormatter.svelte';
  import { save } from '@tauri-apps/plugin-dialog';
  import { writeTextFile } from '@tauri-apps/plugin-fs';
  import { showSuccess, showError } from '$lib/toast.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  let logFiles = $state<Array<{ name: string; size: number; date: Date }>>([]);
  let loading = $state(false);
  let showClearConfirm = $state(false);

  let totalSize = $derived(logFiles.reduce((acc, f) => acc + f.size, 0));

  async function loadLogs() {
    loading = true;
    logFiles = await getLogFiles();
    loading = false;
  }

  async function handleClearLogs() {
    if (showClearConfirm) {
      const success = await clearAllLogs();
      if (success) {
        showSuccess('Všechny logy byly smazány');
        showClearConfirm = false;
        await loadLogs();
      } else {
        showError('Nepodařilo se smazat logy');
      }
    } else {
      showClearConfirm = true;
    }
  }

  async function handleExportLogs() {
    try {
      const logs = await exportLogs();
      if (!logs) {
        showError('Žádné logy k exportu');
        return;
      }

      const filePath = await save({
        title: 'Exportovat logy',
        defaultPath: `ncprogramy_logs_${new Date().toISOString().split('T')[0]}.txt`,
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, logs);
        showSuccess('Logy byly exportovány');
      }
    } catch (error) {
      logger.error('Failed to export logs', error);
      showError('Nepodařilo se exportovat logy');
    }
  }

  function close() {
    SETTINGS_VARS.logManagerOpened = false;
    showClearConfirm = false;
  }

  $effect(() => {
    if (SETTINGS_VARS.logManagerOpened) {
      loadLogs();
    }
  });
</script>

{#if SETTINGS_VARS.logManagerOpened}
  <div class="modal-overlay" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <div class="header-left">
          <h2>Správa logů</h2>
          {#if logFiles.length > 0}
            <span class="log-count">{logFiles.length} souborů</span>
            <span class="total-size">{formatFileSize(totalSize)}</span>
          {/if}
        </div>
        <button class="close-btn" onclick={close} aria-label="Zavřít">
          <Icon name="mdiClose" size={24} color="var(--color-text-secondary)" />
        </button>
      </div>

      <div class="modal-content">
        <div class="actions-bar">
          <Button onClick={handleExportLogs} primary icon="mdiExport">
            <span>Exportovat vše</span>
          </Button>
          <div class="spacer"></div>
          {#if logFiles.length > 0}
            {#if showClearConfirm}
              <Button onClick={handleClearLogs} danger icon="mdiCheck">
                <span>Potvrdit smazání</span>
              </Button>
              <Button onClick={() => (showClearConfirm = false)} icon="mdiClose">
                <span>Zrušit</span>
              </Button>
            {:else}
              <Button onClick={handleClearLogs} danger icon="mdiTrashCan">
                <span>Smazat vše</span>
              </Button>
            {/if}
          {/if}
        </div>

        {#if loading && logFiles.length === 0}
          <div class="loading">Načítání logů...</div>
        {:else if logFiles.length === 0}
          <div class="empty">Žádné logy nejsou k dispozici</div>
        {:else}
          <div class="log-list">
            {#each logFiles as logFile}
              <div class="log-item">
                <div class="log-info">
                  <div class="log-name">
                    <Icon name="mdiFileDocument" size={20} color="var(--color-primary)" />
                    <span>{logFile.name}</span>
                  </div>
                  <div class="log-meta">
                    <span class="log-date">{formatDate(logFile.date)}</span>
                    <span class="log-size">{formatFileSize(logFile.size)}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="info-box">
          <Icon name="mdiInformation" size={18} color="var(--color-primary)" />
          <p>
            Logy jsou uchovávány po dobu 30 dní. Starší logy jsou automaticky mazány. Každý týden je
            vytvořen nový soubor logu.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }

  .modal {
    background: var(--color-bg);
    border-radius: var(--radius-xl);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-xl);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) var(--space-8);
    border-bottom: 1px solid var(--color-border-light);

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    h2 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--color-primary-dark);
    }

    .log-count {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
      background: var(--color-primary-lighter);
      padding: var(--space-1) var(--space-4);
      border-radius: var(--radius-md);
      font-weight: 500;
    }

    .total-size {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      background: var(--color-bg-muted);
      padding: var(--space-1) var(--space-4);
      border-radius: var(--radius-md);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background var(--transition-base);

      &:hover {
        background: var(--color-bg-muted);
      }
    }
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-8);
  }

  .actions-bar {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-8);

    .spacer {
      flex: 1;
    }
  }

  .loading,
  .empty {
    text-align: center;
    padding: var(--space-10) var(--space-8);
    color: var(--color-text-secondary);
  }

  .log-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .log-item {
    display: flex;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
  }

  .log-info {
    flex: 1;
  }

  .log-name {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    font-weight: 500;
    color: var(--color-primary-dark);
    margin-bottom: var(--space-1);
  }

  .log-meta {
    display: flex;
    gap: var(--space-8);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    padding-left: 1.75rem;
  }

  .log-size {
    color: var(--color-success);
    font-weight: 500;
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    margin-top: var(--space-8);
    padding: var(--space-4) var(--space-6);
    background: var(--color-primary-lighter);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-primary-light);

    p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-primary-dark);
      line-height: 1.5;
    }
  }
</style>

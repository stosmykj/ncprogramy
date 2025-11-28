<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import { getLogFiles, getTotalLogSize, clearAllLogs, exportLogs, logger } from '$lib/logger';
  import { formatFileSize } from '$lib/backupProcessor';
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

  function formatDate(date: Date): string {
    return date.toLocaleDateString('cs-CZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
  <div class="modal-overlay" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()}>
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="header-left">
          <h2>Správa logů</h2>
          {#if logFiles.length > 0}
            <span class="log-count">{logFiles.length} souborů</span>
            <span class="total-size">{formatFileSize(totalSize)}</span>
          {/if}
        </div>
        <button class="close-btn" onclick={close} aria-label="Zavřít">
          <Icon name="mdiClose" size={24} color="#666" />
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
                    <Icon name="mdiFileDocument" size={20} color="#285597" />
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
          <Icon name="mdiInformation" size={18} color="#285597" />
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
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #fff;
    border-radius: 0.75rem;
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 2.5rem rgba(0, 0, 0, 0.2);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e5e7eb;

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #183868;
    }

    .log-count {
      font-size: 0.8125rem;
      color: #285597;
      background: #eff6ff;
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
      font-weight: 500;
    }

    .total-size {
      font-size: 0.8125rem;
      color: #6b7280;
      background: #f3f4f6;
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: #f3f4f6;
      }
    }
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
  }

  .actions-bar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.25rem;

    .spacer {
      flex: 1;
    }
  }

  .loading,
  .empty {
    text-align: center;
    padding: 2.5rem;
    color: #6b7280;
  }

  .log-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .log-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  .log-info {
    flex: 1;
  }

  .log-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: #183868;
    margin-bottom: 0.25rem;
  }

  .log-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8125rem;
    color: #6b7280;
    padding-left: 1.75rem;
  }

  .log-size {
    color: #059669;
    font-weight: 500;
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding: 0.75rem 1rem;
    background: #eff6ff;
    border-radius: 0.5rem;
    border: 1px solid #bfdbfe;

    p {
      margin: 0;
      font-size: 0.8125rem;
      color: #1e40af;
      line-height: 1.5;
    }
  }
</style>

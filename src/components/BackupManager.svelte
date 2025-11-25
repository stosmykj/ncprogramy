<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import {
    getBackupList,
    restoreBackup,
    deleteBackup,
    createBackup,
    importBackup,
    type BackupInfo,
  } from '$lib/backupProcessor';
  import { formatDateTime } from '$lib/dateFormatter.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  let backups = $state<BackupInfo[]>([]);
  let loading = $state(false);
  let confirmDelete = $state<string | null>(null);

  async function loadBackups() {
    loading = true;
    backups = await getBackupList();
    loading = false;
  }

  async function handleRestore(filename: string) {
    const success = await restoreBackup(filename);
    if (success) {
      close();
    }
  }

  async function handleDelete(filename: string) {
    if (confirmDelete === filename) {
      const success = await deleteBackup(filename);
      if (success) {
        confirmDelete = null;
        await loadBackups();
      }
    } else {
      confirmDelete = filename;
    }
  }

  async function handleCreateBackup() {
    await createBackup();
    await loadBackups();
  }

  async function handleImportBackup() {
    await importBackup();
    close();
  }

  function close() {
    SETTINGS_VARS.backupManagerOpened = false;
    confirmDelete = null;
  }

  function formatDate(date: Date | null): string {
    if (!date) return 'Neznámé datum';
    return formatDateTime(date);
  }

  $effect(() => {
    if (SETTINGS_VARS.backupManagerOpened) {
      loadBackups();
    }
  });
</script>

{#if SETTINGS_VARS.backupManagerOpened}
  <div class="modal-overlay" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()}>
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>Správa záloh</h2>
        <button class="close-btn" onclick={close} aria-label="Zavřít">
          <Icon name="mdiClose" size={24} color="#666" />
        </button>
      </div>

      <div class="modal-content">
        <div class="actions-bar">
          <Button onClick={handleCreateBackup} primary icon="mdiBackupRestore">
            <span>Vytvořit zálohu</span>
          </Button>
          <Button onClick={handleImportBackup} icon="mdiArchiveArrowUp">
            <span>Importovat ze souboru</span>
          </Button>
        </div>

        {#if loading}
          <div class="loading">Načítání záloh...</div>
        {:else if backups.length === 0}
          <div class="empty">Žádné zálohy nejsou k dispozici</div>
        {:else}
          <div class="backup-list">
            {#each backups as backup}
              <div class="backup-item">
                <div class="backup-info">
                  <div class="backup-date">{formatDate(backup.createdAt)}</div>
                  <div class="backup-meta">
                    {#if backup.programCount !== null}
                      <span class="program-count">{backup.programCount} programů</span>
                    {/if}
                    <span class="filename">{backup.filename}</span>
                  </div>
                </div>
                <div class="backup-actions">
                  <Button onClick={() => handleRestore(backup.filename)} primary small>
                    <span>Obnovit</span>
                  </Button>
                  {#if confirmDelete === backup.filename}
                    <Button onClick={() => handleDelete(backup.filename)} danger small>
                      <span>Potvrdit</span>
                    </Button>
                    <Button onClick={() => (confirmDelete = null)} small>
                      <span>Zrušit</span>
                    </Button>
                  {:else}
                    <Button onClick={() => handleDelete(backup.filename)} danger small>
                      <Icon name="mdiTrashCan" size={16} color="#fff" />
                    </Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
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
    border-radius: 12px;
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #183868;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 6px;
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
    padding: 20px;
  }

  .actions-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .loading,
  .empty {
    text-align: center;
    padding: 40px;
    color: #6b7280;
  }

  .backup-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .backup-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: border-color 0.15s;

    &:hover {
      border-color: #285597;
    }
  }

  .backup-info {
    flex: 1;
    min-width: 0;
  }

  .backup-date {
    font-weight: 600;
    color: #183868;
    margin-bottom: 4px;
  }

  .backup-meta {
    display: flex;
    gap: 12px;
    font-size: 13px;
    color: #6b7280;
  }

  .program-count {
    color: #285597;
    font-weight: 500;
  }

  .filename {
    color: #9ca3af;
    font-family: monospace;
    font-size: 12px;
  }

  .backup-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
</style>

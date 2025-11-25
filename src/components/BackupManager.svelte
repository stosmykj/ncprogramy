<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import {
    getBackupList,
    getBackupProgramCount,
    restoreBackup,
    deleteBackup,
    clearAllBackups,
    clearDuplicateBackups,
    createBackup,
    importBackup,
    formatFileSize,
    type BackupInfo,
  } from '$lib/backupProcessor';
  import { formatDateTime } from '$lib/dateFormatter.svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  const PAGE_SIZE = 20;

  let allBackups = $state<BackupInfo[]>([]);
  let programCounts = $state<Map<string, number | null>>(new Map());
  let displayCount = $state(PAGE_SIZE);
  let loading = $state(false);
  let confirmDelete = $state<string | null>(null);
  let listElement: HTMLDivElement | null = $state(null);

  // Clear dialog state
  let showClearDialog = $state(false);
  let clearAction = $state<'all' | 'duplicates' | null>(null);

  let totalSize = $derived(allBackups.reduce((acc, b) => acc + b.size, 0));
  let visibleBackups = $derived(allBackups.slice(0, displayCount));
  let hasMore = $derived(displayCount < allBackups.length);

  // Lazily load program counts for visible backups
  $effect(() => {
    const visible = visibleBackups;
    for (const backup of visible) {
      if (!programCounts.has(backup.filename)) {
        // Mark as loading
        programCounts.set(backup.filename, null);
        programCounts = new Map(programCounts);
        // Load in background
        getBackupProgramCount(backup.filename).then((count) => {
          programCounts.set(backup.filename, count);
          programCounts = new Map(programCounts);
        });
      }
    }
  });

  async function loadBackups() {
    loading = true;
    displayCount = PAGE_SIZE;
    programCounts = new Map();
    allBackups = await getBackupList();
    loading = false;
  }

  function handleScroll(e: Event) {
    const target = e.target as HTMLDivElement;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (scrollBottom < 100 && hasMore && !loading) {
      displayCount = Math.min(displayCount + PAGE_SIZE, allBackups.length);
    }
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

  function openClearDialog() {
    showClearDialog = true;
    clearAction = null;
  }

  function closeClearDialog() {
    showClearDialog = false;
    clearAction = null;
  }

  async function executeClear() {
    let success = false;
    if (clearAction === 'all') {
      success = await clearAllBackups();
    } else if (clearAction === 'duplicates') {
      success = await clearDuplicateBackups();
    }

    if (success) {
      closeClearDialog();
      await loadBackups();
    }
  }

  function close() {
    SETTINGS_VARS.backupManagerOpened = false;
    confirmDelete = null;
    closeClearDialog();
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
        <div class="header-left">
          <h2>Správa záloh</h2>
          {#if allBackups.length > 0}
            <span class="backup-count">{allBackups.length} záloh</span>
            <span class="total-size">{formatFileSize(totalSize)}</span>
          {/if}
        </div>
        <button class="close-btn" onclick={close} aria-label="Zavřít">
          <Icon name="mdiClose" size={24} color="#666" />
        </button>
      </div>

      <div class="modal-content" bind:this={listElement} onscroll={handleScroll}>
        <div class="actions-bar">
          <Button onClick={handleCreateBackup} primary icon="mdiBackupRestore">
            <span>Vytvořit zálohu</span>
          </Button>
          <Button onClick={handleImportBackup} icon="mdiArchiveArrowUp">
            <span>Importovat ze souboru</span>
          </Button>
          <div class="spacer"></div>
          {#if allBackups.length > 0}
            <Button onClick={openClearDialog} danger icon="mdiTrashCan">
              <span>Vyčistit zálohy</span>
            </Button>
          {/if}
        </div>

        {#if loading && allBackups.length === 0}
          <div class="loading">Načítání záloh...</div>
        {:else if allBackups.length === 0}
          <div class="empty">Žádné zálohy nejsou k dispozici</div>
        {:else}
          <div class="backup-list">
            {#each visibleBackups as backup}
              <div class="backup-item">
                <div class="backup-info">
                  <div class="backup-date">{formatDate(backup.createdAt)}</div>
                  <div class="backup-meta">
                    {#if programCounts.get(backup.filename) !== null && programCounts.get(backup.filename) !== undefined}
                      <span class="program-count">{programCounts.get(backup.filename)} programů</span>
                    {/if}
                    <span class="backup-size">{formatFileSize(backup.size)}</span>
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
            {#if hasMore}
              <div class="load-more">Posouvejte pro načtení dalších...</div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Clear Confirmation Dialog -->
  {#if showClearDialog}
    <div class="dialog-overlay" onclick={closeClearDialog}>
      <div class="dialog" onclick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div class="dialog-header">
          <Icon name="mdiAlertCircle" size={24} color="#ef4444" />
          <h3>Vyčistit zálohy</h3>
        </div>

        <div class="dialog-content">
          <p>Vyberte způsob vyčištění záloh:</p>

          <div class="dialog-options">
            <button
              class="option-btn"
              class:selected={clearAction === 'duplicates'}
              onclick={() => (clearAction = 'duplicates')}
            >
              <Icon name="mdiCalendarRemove" size={20} color={clearAction === 'duplicates' ? '#285597' : '#6b7280'} />
              <div class="option-text">
                <strong>Ponechat 1 za den</strong>
                <span>Smaže duplicitní zálohy, ponechá nejnovější zálohu z každého dne</span>
              </div>
            </button>

            <button
              class="option-btn danger"
              class:selected={clearAction === 'all'}
              onclick={() => (clearAction = 'all')}
            >
              <Icon name="mdiTrashCan" size={20} color={clearAction === 'all' ? '#ef4444' : '#6b7280'} />
              <div class="option-text">
                <strong>Smazat vše</strong>
                <span>Smaže všechny zálohy ({allBackups.length})</span>
              </div>
            </button>
          </div>
        </div>

        <div class="dialog-actions">
          <Button onClick={closeClearDialog}>
            <span>Zrušit</span>
          </Button>
          <Button onClick={executeClear} danger disabled={!clearAction}>
            <span>Potvrdit</span>
          </Button>
        </div>
      </div>
    </div>
  {/if}
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
    width: 800px;
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

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #183868;
    }

    .backup-count {
      font-size: 13px;
      color: #285597;
      background: #eff6ff;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 500;
    }

    .total-size {
      font-size: 13px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 4px 10px;
      border-radius: 6px;
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

    .spacer {
      flex: 1;
    }
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

  .backup-size {
    color: #059669;
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

  .load-more {
    text-align: center;
    padding: 16px;
    color: #9ca3af;
    font-size: 13px;
  }

  // Dialog styles
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .dialog {
    background: #fff;
    border-radius: 12px;
    width: 450px;
    max-width: 90vw;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
  }

  .dialog-content {
    padding: 20px;

    p {
      margin: 0 0 16px;
      color: #6b7280;
      font-size: 14px;
    }
  }

  .dialog-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .option-btn {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;

    &:hover {
      border-color: #285597;
      background: #f8fafc;
    }

    &.selected {
      border-color: #285597;
      background: #eff6ff;
    }

    &.danger.selected {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .option-text {
      flex: 1;

      strong {
        display: block;
        color: #1f2937;
        font-size: 14px;
        margin-bottom: 2px;
      }

      span {
        display: block;
        color: #6b7280;
        font-size: 12px;
      }
    }
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    border-radius: 0 0 12px 12px;
  }
</style>

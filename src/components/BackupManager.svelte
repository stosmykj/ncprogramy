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
  <div class="modal-overlay" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <div class="header-left">
          <h2>Správa záloh</h2>
          {#if allBackups.length > 0}
            <span class="backup-count">{allBackups.length} záloh</span>
            <span class="total-size">{formatFileSize(totalSize)}</span>
          {/if}
        </div>
        <button class="close-btn" onclick={close} aria-label="Zavřít">
          <Icon name="mdiClose" size={24} color="var(--color-text-secondary)" />
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
    <div class="dialog-overlay" onclick={closeClearDialog} onkeydown={(e) => e.key === 'Escape' && closeClearDialog()} role="presentation">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="dialog" onclick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" tabindex="-1">
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
              <Icon name="mdiCalendarRemove" size={20} color={clearAction === 'duplicates' ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
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
              <Icon name="mdiTrashCan" size={20} color={clearAction === 'all' ? 'var(--color-danger)' : 'var(--color-text-secondary)'} />
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
    background: var(--color-bg-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }

  .modal {
    background: var(--color-white);
    border-radius: var(--radius-xl);
    width: 800px;
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
    padding: var(--space-6);
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

    .backup-count {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
      background: var(--color-primary-lighter);
      padding: var(--space-2) var(--space-5);
      border-radius: var(--radius-md);
      font-weight: 500;
    }

    .total-size {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      background: var(--color-bg-muted);
      padding: var(--space-2) var(--space-5);
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
    padding: var(--space-6);
  }

  .actions-bar {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-6);

    .spacer {
      flex: 1;
    }
  }

  .loading,
  .empty {
    text-align: center;
    padding: 2.5rem;
    color: var(--color-text-secondary);
  }

  .backup-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .backup-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6);
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    transition: border-color var(--transition-base);

    &:hover {
      border-color: var(--color-primary);
    }
  }

  .backup-info {
    flex: 1;
    min-width: 0;
  }

  .backup-date {
    font-weight: 600;
    color: var(--color-primary-dark);
    margin-bottom: var(--space-2);
  }

  .backup-meta {
    display: flex;
    gap: var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .program-count {
    color: var(--color-primary);
    font-weight: 500;
  }

  .backup-size {
    color: var(--color-success);
    font-weight: 500;
  }

  .filename {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .backup-actions {
    display: flex;
    gap: var(--space-4);
    flex-shrink: 0;
  }

  .load-more {
    text-align: center;
    padding: var(--space-6);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  // Dialog styles
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-overlay-blur);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal-nested);
  }

  .dialog {
    background: var(--color-white);
    border-radius: var(--radius-xl);
    width: 450px;
    max-width: 90vw;
    box-shadow: var(--shadow-xl);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-6);
    border-bottom: 1px solid var(--color-border-light);

    h3 {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text);
    }
  }

  .dialog-content {
    padding: var(--space-6);

    p {
      margin: 0 0 var(--space-6);
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
    }
  }

  .dialog-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .option-btn {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-6);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    background: var(--color-white);
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-base);

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-bg-subtle);
    }

    &.selected {
      border-color: var(--color-primary);
      background: var(--color-primary-lighter);
    }

    &.danger.selected {
      border-color: var(--color-danger);
      background: var(--color-danger-light);
    }

    .option-text {
      flex: 1;

      strong {
        display: block;
        color: var(--color-text);
        font-size: var(--font-size-base);
        margin-bottom: var(--space-1);
      }

      span {
        display: block;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }
    }
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-5);
    padding: var(--space-6);
    border-top: 1px solid var(--color-border-light);
    background: var(--color-bg-subtle);
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }
</style>

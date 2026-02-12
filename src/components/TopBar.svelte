<script lang="ts">
  import { SETTINGS_VARS, zoomIn, zoomOut, zoomReset } from '$lib/settingsProcessor.svelte';
  import { UPDATE_STATE, initializeUpdater } from '$lib/updater.svelte';
  import { getTotalBackupSize, formatFileSize } from '$lib/backupProcessor';
  import { getTotalLogSize } from '$lib/logger';
  import Button from './Button.svelte';
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';
  import QuickSearch from './QuickSearch.svelte';
  import UpdateDialog from './UpdateDialog.svelte';
  import Icon from './Icon.svelte';

  let backupSize = $state(0);
  let logSize = $state(0);

  // Size thresholds in bytes
  const SIZE_THRESHOLD_YELLOW = 100 * 1024 * 1024; // 100 MB
  const SIZE_THRESHOLD_RED = 500 * 1024 * 1024; // 500 MB
  const LOG_SHOW_THRESHOLD = 100 * 1024 * 1024; // 100 MB

  let backupColor = $derived(
    backupSize >= SIZE_THRESHOLD_RED
      ? 'var(--color-danger)'
      : backupSize >= SIZE_THRESHOLD_YELLOW
        ? 'var(--color-warning)'
        : 'var(--color-success)'
  );

  let logColor = $derived(
    logSize >= SIZE_THRESHOLD_RED
      ? 'var(--color-danger)'
      : logSize >= SIZE_THRESHOLD_YELLOW
        ? 'var(--color-warning)'
        : 'var(--color-success)'
  );

  let showLogIndicator = $derived(logSize >= LOG_SHOW_THRESHOLD);

  // Initialize updater on component mount
  $effect(() => {
    initializeUpdater();
    loadBackupSize();
    loadLogSize();
  });

  async function loadBackupSize() {
    backupSize = await getTotalBackupSize();
  }

  async function loadLogSize() {
    logSize = await getTotalLogSize();
  }

  function openBackupManager() {
    SETTINGS_VARS.backupManagerOpened = true;
  }

  function openLogManager() {
    SETTINGS_VARS.logManagerOpened = true;
  }

  function handleUpdateCheck() {
    UPDATE_STATE.showDialog = true;
  }

  // Refresh backup size when backup manager closes
  $effect(() => {
    if (!SETTINGS_VARS.backupManagerOpened) {
      loadBackupSize();
    }
  });

  // Refresh log size when log manager closes
  $effect(() => {
    if (!SETTINGS_VARS.logManagerOpened) {
      loadLogSize();
    }
  });
</script>

<div class="top-bar">
  <div class="section">
    <Button
      icon={SETTINGS_VARS.menuOpened ? 'mdiClose' : 'mdiMenu'}
      onClick={() => (SETTINGS_VARS.menuOpened = !SETTINGS_VARS.menuOpened)}
      primary
    ></Button>
  </div>
  <div class="section">
    <QuickSearch />
  </div>
  <div class="section">
    <div class="zoom-controls">
      <button class="zoom-btn" onclick={zoomOut} title="Zmenšit (Ctrl+-)">
        <Icon name="mdiMagnifyMinusOutline" size={14} color="var(--color-text-on-primary)" />
      </button>
      <button class="zoom-display" onclick={zoomReset} title="Obnovit 100% (Ctrl+0)">
        {SETTINGS_VARS.textZoomLevel}%
      </button>
      <button class="zoom-btn" onclick={zoomIn} title="Zvětšit (Ctrl++)">
        <Icon name="mdiMagnifyPlusOutline" size={14} color="var(--color-text-on-primary)" />
      </button>
    </div>
    <KeyboardShortcuts />
    {#if showLogIndicator}
      <button class="indicator-btn" onclick={openLogManager} title="Správa logů">
        <Icon name="mdiTextBoxOutline" size={14} color={logColor} />
        <span class="indicator-size" style="color: {logColor}">{formatFileSize(logSize)}</span>
      </button>
    {/if}
    <button class="indicator-btn" onclick={openBackupManager} title="Správa záloh">
      <Icon name="mdiBackupRestore" size={14} color={backupColor} />
      <span class="indicator-size" style="color: {backupColor}">{formatFileSize(backupSize)}</span>
    </button>
    <Button
      onClick={handleUpdateCheck}
      icon="mdiDownloadCircleOutline"
      iconColor={UPDATE_STATE.available ? 'var(--color-success)' : 'var(--color-text-on-primary)'}
      iconSize={22}
      onlyIcon
      primary
    >
      {#if UPDATE_STATE.available}
        <span class="update-badge"></span>
      {/if}
    </Button>
  </div>
</div>

<UpdateDialog />

<style lang="scss" scoped>
  .top-bar {
    display: grid;
    height: var(--topbar-height);
    padding-left: var(--space-6);
    grid-template-columns: 1fr 1fr 1fr;
    background: var(--color-primary-dark);

    .section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-6);

      &:first-of-type {
        justify-content: start;
      }

      &:last-of-type {
        justify-content: end;
        padding: 0 var(--space-6);
      }
    }
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    overflow: hidden;

    .zoom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      transition: background var(--transition-base);

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }

    .zoom-display {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 1.5rem;
      background: none;
      border: none;
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--color-text-on-primary);
      font-size: var(--font-size-2xs);
      font-weight: 500;
      cursor: pointer;
      transition: background var(--transition-base);

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }
  }

  .indicator-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-base);

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .indicator-size {
      font-size: var(--font-size-2xs);
      font-weight: 500;
    }
  }

  .update-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 0.5rem;
    height: 0.5rem;
    background: var(--color-danger);
    border: 2px solid var(--color-primary-dark);
    border-radius: 50%;
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  @keyframes ping {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    75%,
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }
</style>

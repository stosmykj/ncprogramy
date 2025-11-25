<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
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
      ? '#ef4444' // red
      : backupSize >= SIZE_THRESHOLD_YELLOW
        ? '#f59e0b' // yellow/orange
        : '#10b981' // green
  );

  let logColor = $derived(
    logSize >= SIZE_THRESHOLD_RED
      ? '#ef4444' // red
      : logSize >= SIZE_THRESHOLD_YELLOW
        ? '#f59e0b' // yellow/orange
        : '#10b981' // green
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
    <KeyboardShortcuts />
    {#if showLogIndicator}
      <button class="log-indicator" onclick={openLogManager} title="Správa logů">
        <Icon name="mdiTextBoxOutline" size={18} color={logColor} />
        <span class="log-size" style="color: {logColor}">{formatFileSize(logSize)}</span>
      </button>
    {/if}
    <button class="backup-indicator" onclick={openBackupManager} title="Správa záloh">
      <Icon name="mdiBackupRestore" size={18} color={backupColor} />
      <span class="backup-size" style="color: {backupColor}">{formatFileSize(backupSize)}</span>
    </button>
    <Button
      onClick={handleUpdateCheck}
      icon="mdiDownloadCircleOutline"
      iconColor={UPDATE_STATE.available ? '#10b981' : '#fff'}
      iconSize={28}
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
    height: 4rem;
    padding-left: 16px;
    grid-template-columns: 1fr 1fr 1fr;
    background: #183868;

    .section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;

      &:first-of-type {
        justify-content: start;
      }

      &:last-of-type {
        justify-content: end;
        padding: 0 16px;
      }
    }
  }

  .backup-indicator,
  .log-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .backup-size,
    .log-size {
      font-size: 12px;
      color: #a0aec0;
      font-weight: 500;
    }
  }

  .update-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
    background: #ef4444;
    border: 2px solid #183868;
    border-radius: 50%;
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
    }
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

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }
</style>

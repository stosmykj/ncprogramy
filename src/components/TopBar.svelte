<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import { UPDATE_STATE, checkForUpdates, initializeUpdater } from '$lib/updater.svelte';
  import Button from './Button.svelte';
  import Dashboard from './Dashboard.svelte';
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';
  import QuickSearch from './QuickSearch.svelte';
  import UpdateDialog from './UpdateDialog.svelte';

  // Initialize updater on component mount
  $effect(() => {
    initializeUpdater();
  });

  function handleUpdateCheck() {
    UPDATE_STATE.showDialog = true;
  }
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
    <Dashboard />
    <KeyboardShortcuts />
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

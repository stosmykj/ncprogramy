<script lang="ts">
  import { onMount } from 'svelte';
  import Table from '../components/Table.svelte';
  import TopBar from '../components/TopBar.svelte';
  import Menu from '../components/Menu.svelte';
  import FormattingRulesEditor from '../components/FormattingRulesEditor.svelte';
  import ColumnManagerDialog from '../components/ColumnManager/ColumnManagerDialog.svelte';
  import BackupManager from '../components/BackupManager.svelte';
  import LogManager from '../components/LogManager.svelte';
  import GCodeEditorDialog from '../components/GCodeEditorDialog.svelte';
  import SnippetsManagerDialog from '../components/SnippetsManager/SnippetsManagerDialog.svelte';
  import InitialSetup from '../components/InitialSetup.svelte';
  import { initTableColumns } from '$lib/tableColumnProcessor.svelte';
  import { SETTINGS_VARS, checkAppInitialized } from '$lib/settingsProcessor.svelte';
  import { loadSnippets } from '$lib/snippetsProcessor.svelte';

  const preventedKeys = ['ArrowUp', 'ArrowDown'];
  let isLoading = $state(true);

  onMount(async () => {
    await checkAppInitialized();
    await initTableColumns();
    await loadSnippets();
    isLoading = false;
  });

  // Watch for column manager close to refresh column state
  $effect(() => {
    if (!SETTINGS_VARS.columnManagerOpened && !isLoading) {
      initTableColumns();
    }
  });

  function preventScrolling(e: KeyboardEvent) {
    const target = e.target as HTMLElement;

    if (['BODY', 'TD'].includes(target.tagName) && preventedKeys.includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleSetupComplete() {
    initTableColumns();
  }
</script>

<svelte:window
  onkeydown={preventScrolling}
  oncontextmenu={(e) => (e.ctrlKey ? null : e.preventDefault())}
/>

<main class="container">
  <div>
    <TopBar />
    <Menu />
  </div>
  {#if isLoading}
    <div class="loading">Načítání...</div>
  {:else if !SETTINGS_VARS.isAppInitialized}
    <InitialSetup onComplete={handleSetupComplete} />
  {:else}
    <div class="table-container">
      <Table />
    </div>
  {/if}
</main>
<FormattingRulesEditor />
<ColumnManagerDialog />
<BackupManager />
<LogManager />
<GCodeEditorDialog />
<SnippetsManagerDialog />

<style lang="scss">
  .container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .table-container {
    flex: 1;
    max-width: 100%;
    background: #fff;
    overflow: auto;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    font-size: 1.25rem;
    color: #667085;
  }
</style>

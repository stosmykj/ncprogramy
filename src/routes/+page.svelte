<script lang="ts">
  import Table from '../components/Table.svelte';
  import TopBar from '../components/TopBar.svelte';
  import Menu from '../components/Menu.svelte';
  import FormattingRulesEditor from '../components/FormattingRulesEditor.svelte';
  import ColumnManagerDialog from '../components/ColumnManager/ColumnManagerDialog.svelte';
  import BackupManager from '../components/BackupManager.svelte';

  const preventedKeys = ['ArrowUp', 'ArrowDown'];

  function preventScrolling(e: KeyboardEvent) {
    const target = e.target as HTMLElement;

    if (['BODY', 'TD'].includes(target.tagName) && preventedKeys.includes(e.key)) {
      e.preventDefault();
    }
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
  <div class="table-container">
    <Table />
  </div>
</main>
<FormattingRulesEditor />
<ColumnManagerDialog />
<BackupManager />

<style lang="scss">
  .table-container {
    max-width: 100%;
    background: #fff;
    overflow-x: auto;
  }
</style>

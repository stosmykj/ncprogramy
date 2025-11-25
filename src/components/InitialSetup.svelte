<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import Icon from './Icon.svelte';
  import LegacyImportDialog from './LegacyImportDialog.svelte';

  let { onComplete }: { onComplete: () => void } = $props();
  let importDialogOpen = $state(false);

  function openColumnManager() {
    SETTINGS_VARS.columnManagerOpened = true;
  }

  function openImportDialog() {
    importDialogOpen = true;
  }

  function openBackupManager() {
    SETTINGS_VARS.backupManagerOpened = true;
  }
</script>

<div class="initial-setup">
  <div class="setup-card">
    <div class="header">
      <Icon name="mdiTableLarge" size={48} color="#285597" />
      <h1>Vítejte v NC Programy</h1>
      <p>Pro začátek je potřeba nastavit strukturu tabulky</p>
    </div>

    <div class="options">
      <button class="option-card" onclick={openColumnManager}>
        <div class="option-icon">
          <Icon name="mdiViewColumn" size={32} color="#285597" />
        </div>
        <div class="option-content">
          <h3>Vytvořit novou strukturu</h3>
          <p>Definujte vlastní sloupce a začněte s prázdnou databází</p>
        </div>
        <div class="option-arrow">
          <Icon name="mdiChevronRight" size={24} color="#667085" />
        </div>
      </button>

      <button class="option-card" onclick={openImportDialog}>
        <div class="option-icon">
          <Icon name="mdiImport" size={32} color="#285597" />
        </div>
        <div class="option-content">
          <h3>Import ze staré aplikace</h3>
          <p>Importujte sloupce a data z původní verze NC Programy</p>
        </div>
        <div class="option-arrow">
          <Icon name="mdiChevronRight" size={24} color="#667085" />
        </div>
      </button>

      <button class="option-card" onclick={openBackupManager}>
        <div class="option-icon">
          <Icon name="mdiBackupRestore" size={32} color="#285597" />
        </div>
        <div class="option-content">
          <h3>Obnovit ze zálohy</h3>
          <p>Obnovte data z dříve vytvořené zálohy aplikace</p>
        </div>
        <div class="option-arrow">
          <Icon name="mdiChevronRight" size={24} color="#667085" />
        </div>
      </button>
    </div>

    <div class="footer">
      <p>Strukturu tabulky můžete kdykoliv upravit v menu "Správa sloupců"</p>
    </div>
  </div>
</div>

<LegacyImportDialog bind:open={importDialogOpen} {onComplete} />

<style lang="scss">
  .initial-setup {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 7rem);
    padding: 2rem;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  }

  .setup-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    width: 100%;
    overflow: hidden;
  }

  .header {
    text-align: center;
    padding: 2.5rem 2rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;

    h1 {
      margin: 1rem 0 0.5rem;
      font-size: 1.75rem;
      font-weight: 600;
      color: #1d2939;
    }

    p {
      margin: 0;
      color: #667085;
      font-size: 1rem;
    }
  }

  .options {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .option-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;

    &:hover:not(:disabled) {
      border-color: #285597;
      background: #f0f4ff;
    }

    .option-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }

    .option-content {
      flex: 1;

      h3 {
        margin: 0 0 0.25rem;
        font-size: 1.1rem;
        font-weight: 600;
        color: #1d2939;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        color: #667085;
      }
    }

    .option-arrow {
      flex-shrink: 0;
    }
  }

  .footer {
    padding: 1rem 2rem 1.5rem;
    text-align: center;
    background: #f9fafb;

    p {
      margin: 0;
      font-size: 0.875rem;
      color: #98a2b3;
    }
  }

</style>

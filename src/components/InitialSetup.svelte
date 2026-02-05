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
      <Icon name="mdiTableLarge" size={48} color="var(--color-primary)" />
      <h1>Vítejte v NC Programy</h1>
      <p>Pro začátek je potřeba nastavit strukturu tabulky</p>
    </div>

    <div class="options">
      <button class="option-card" onclick={openColumnManager}>
        <div class="option-icon">
          <Icon name="mdiViewColumn" size={32} color="var(--color-primary)" />
        </div>
        <div class="option-content">
          <h3>Vytvořit novou strukturu</h3>
          <p>Definujte vlastní sloupce a začněte s prázdnou databází</p>
        </div>
        <div class="option-arrow">
          <Icon name="mdiChevronRight" size={24} color="var(--color-text-secondary)" />
        </div>
      </button>

      <button class="option-card" onclick={openImportDialog}>
        <div class="option-icon">
          <Icon name="mdiImport" size={32} color="var(--color-primary)" />
        </div>
        <div class="option-content">
          <h3>Import ze staré aplikace</h3>
          <p>Importujte sloupce a data z původní verze NC Programy</p>
        </div>
        <div class="option-arrow">
          <Icon name="mdiChevronRight" size={24} color="var(--color-text-secondary)" />
        </div>
      </button>

      <button class="option-card" onclick={openBackupManager}>
        <div class="option-icon">
          <Icon name="mdiBackupRestore" size={32} color="var(--color-primary)" />
        </div>
        <div class="option-content">
          <h3>Obnovit ze zálohy</h3>
          <p>Obnovte data z dříve vytvořené zálohy aplikace</p>
        </div>
        <div class="option-arrow">
          <Icon name="mdiChevronRight" size={24} color="var(--color-text-secondary)" />
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
    padding: var(--space-10);
    background: linear-gradient(135deg, var(--color-bg-subtle) 0%, var(--color-bg-muted) 100%);
  }

  .setup-card {
    background: var(--color-bg);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    max-width: 600px;
    width: 100%;
    overflow: hidden;
  }

  .header {
    text-align: center;
    padding: var(--space-10) var(--space-10) var(--space-8);
    border-bottom: 1px solid var(--color-border-light);

    h1 {
      margin: var(--space-6) 0 var(--space-3);
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--color-text);
    }

    p {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: var(--font-size-md);
    }
  }

  .options {
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .option-card {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-8);
    background: var(--color-bg-subtle);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all var(--transition-base);
    text-align: left;

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: var(--color-primary-lighter);
    }

    .option-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--color-bg);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
      flex-shrink: 0;
    }

    .option-content {
      flex: 1;

      h3 {
        margin: 0 0 var(--space-2);
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--color-text);
      }

      p {
        margin: 0;
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
      }
    }

    .option-arrow {
      flex-shrink: 0;
    }
  }

  .footer {
    padding: var(--space-6) var(--space-10) var(--space-8);
    text-align: center;
    background: var(--color-bg-subtle);

    p {
      margin: 0;
      font-size: var(--font-size-base);
      color: var(--color-text-muted);
    }
  }

</style>

<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import { exportBackup, importBackup } from '$lib/backupProcessor';
  import Button from './Button.svelte';

  async function btn_import() {
    SETTINGS_VARS.menuOpened = false;
    await importBackup();
  }

  async function btn_export() {
    SETTINGS_VARS.menuOpened = false;
    await exportBackup();
  }

  function btn_backupManager() {
    SETTINGS_VARS.menuOpened = false;
    SETTINGS_VARS.backupManagerOpened = true;
  }

  function btn_formattingRules() {
    SETTINGS_VARS.menuOpened = false;
    SETTINGS_VARS.formatterOpened = true;
  }

  function btn_columnManager() {
    SETTINGS_VARS.menuOpened = false;
    SETTINGS_VARS.columnManagerOpened = true;
  }

  function btn_gcodeEditor() {
    SETTINGS_VARS.menuOpened = false;
    SETTINGS_VARS.gcodeEditorOpened = true;
  }
</script>

<div class="menu" class:opened={SETTINGS_VARS.menuOpened}>
  <Button onClick={btn_import} primary icon="mdiImport" class="full-total"
    ><span>Import</span></Button
  >
  <Button onClick={btn_export} primary icon="mdiExport" class="full-total"
    ><span>Export</span></Button
  >
  <Button onClick={btn_backupManager} primary icon="mdiBackupRestore" class="full-total"
    ><span>Správa záloh</span></Button
  >
  <Button onClick={btn_formattingRules} primary icon="mdiAlertCircle" class="full-total"
    ><span>Pravidla formátování</span></Button
  >
  <Button onClick={btn_columnManager} primary icon="mdiViewColumn" class="full-total"
    ><span>Správa sloupců</span></Button
  >
  <Button onClick={btn_gcodeEditor} primary icon="mdiFileCodeOutline" class="full-total"
    ><span>G-code Editor</span></Button
  >
</div>

<style lang="scss">
  .menu {
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: absolute;
    left: -20rem;
    top: 4rem;
    width: 20rem;
    padding: 1rem;
    background: #183868;
    border-top: 2px solid #285597;
    border-bottom-right-radius: 8px;
    color: #fff;
    transition: 0.4s;
    z-index: 10;

    &.opened {
      left: 0;
    }
  }
</style>

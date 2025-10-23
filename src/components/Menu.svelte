<script lang="ts">
  import { IMPORT_VARS } from '$lib/importProcessor.svelte';
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import Button from './Button.svelte';

  function btn_import() {
    IMPORT_VARS.dialog = true;
    SETTINGS_VARS.menuOpened = false;
  }

  function btn_formattingRules() {
    SETTINGS_VARS.menuOpened = false;
    SETTINGS_VARS.formatterOpened = true;
  }

  function btn_columnManager() {
    SETTINGS_VARS.menuOpened = false;
    SETTINGS_VARS.columnManagerOpened = true;
  }
</script>

<div class="menu" class:opened={SETTINGS_VARS.menuOpened}>
  <Button onClick={btn_import} primary icon="mdiImport" class="full-total"
    ><span>Import</span></Button
  >
  <!-- <Button onClick={btn_gcodeEditor} primary icon="mdiFileCodeOutline" class="full-total"
    ><span>G-code Editor</span></Button
  > -->
  <Button onClick={btn_formattingRules} primary icon="mdiAlertCircle" class="full-total"
    ><span>Pravidla formátování</span></Button
  >
  <Button onClick={btn_columnManager} primary icon="mdiViewColumn" class="full-total"
    ><span>Správa sloupců</span></Button
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

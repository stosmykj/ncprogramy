<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import { factoryResetDatabase, getProgramCount } from '$lib/backupProcessor';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  const CONFIRM_WORD = 'SMAZAT';

  let programCount = $state<number | null>(null);
  let confirmText = $state('');
  let busy = $state(false);

  // Enable the no-backup path only once the user types the confirmation word.
  let canDeleteWithoutBackup = $derived(confirmText.trim().toUpperCase() === CONFIRM_WORD);

  $effect(() => {
    if (SETTINGS_VARS.deleteDatabaseOpened) {
      programCount = null;
      confirmText = '';
      busy = false;
      getProgramCount().then((count) => (programCount = count));
    }
  });

  function close() {
    if (busy) return;
    SETTINGS_VARS.deleteDatabaseOpened = false;
  }

  async function runReset(createBackupFirst: boolean) {
    if (busy) return;
    busy = true;
    const success = await factoryResetDatabase(createBackupFirst);
    busy = false;
    if (success) {
      SETTINGS_VARS.deleteDatabaseOpened = false;
    }
  }
</script>

{#if SETTINGS_VARS.deleteDatabaseOpened}
  <div
    class="dialog-overlay"
    onclick={close}
    onkeydown={(e) => e.key === 'Escape' && close()}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      role="alertdialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="dialog-header">
        <Icon name="mdiAlertCircle" size={24} color="#ef4444" />
        <h3>Vymazat databázi</h3>
      </div>

      <div class="dialog-content">
        <p>
          Tato akce <strong>nevratně smaže</strong> všechny programy, sloupce a pravidla formátování
          {#if programCount !== null}
            ({programCount} {programCount === 1 ? 'záznam' : programCount >= 2 && programCount <= 4 ? 'záznamy' : 'záznamů'})
          {/if}
          a vrátí aplikaci do výchozího stavu jako po čisté instalaci.
        </p>

        <p class="hint">
          Doporučujeme nejprve zálohovat. Pokud chcete mazat bez zálohy, napište pro
          potvrzení slovo <code>{CONFIRM_WORD}</code>.
        </p>

        <input
          class="confirm-input"
          type="text"
          bind:value={confirmText}
          placeholder={CONFIRM_WORD}
          disabled={busy}
          aria-label="Potvrzovací slovo"
        />
      </div>

      <div class="dialog-actions">
        <Button onClick={close} disabled={busy}>
          <span>Zrušit</span>
        </Button>
        <Button onClick={() => runReset(false)} danger disabled={busy || !canDeleteWithoutBackup}>
          <span>Smazat bez zálohy</span>
        </Button>
        <Button onClick={() => runReset(true)} primary disabled={busy} icon="mdiBackupRestore">
          <span>Zálohovat a smazat</span>
        </Button>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
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
    z-index: var(--z-modal);
  }

  .dialog {
    background: var(--color-white);
    border-radius: var(--radius-xl);
    width: 480px;
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
      margin: 0 0 var(--space-5);
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);

      strong {
        color: var(--color-danger);
      }
    }

    .hint {
      font-size: var(--font-size-sm);

      code {
        font-family: var(--font-mono);
        background: var(--color-bg-muted);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        color: var(--color-text);
      }
    }
  }

  .confirm-input {
    width: 100%;
    height: var(--input-height);
    padding: var(--input-padding);
    border: var(--input-border);
    border-radius: var(--input-radius);
    font-size: var(--font-size-base);
    color: var(--color-text);
    background: var(--color-bg);
    box-sizing: border-box;
    transition: all var(--transition-base);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: var(--input-focus-ring);
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

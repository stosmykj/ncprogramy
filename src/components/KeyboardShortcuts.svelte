<script lang="ts">
  import { onMount } from 'svelte';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import Button from './Button.svelte';
  import KeyboardShortcut from './KeyboardShortcut.svelte';

  let showHelp = $state(false);

  const shortcuts = [
    { keys: ['Ctrl', 'F'], description: 'Zaměřit globální vyhledávání' },
    { keys: ['Ctrl', 'N'], description: 'Vytvořit nový program' },
    { keys: ['Ctrl', 'D'], description: 'Duplikovat vybraný řádek' },
    { keys: ['Enter'], description: 'Začít editovat vybranou buňku' },
    { keys: ['Escape'], description: 'Zrušit editaci / Zavřít modály' },
    { keys: ['↑', '↓', '←', '→'], description: 'Navigace v tabulce' },
    { keys: ['Ctrl', 'C'], description: 'Kopírovat obsah buňky' },
    { keys: ['Ctrl', '+'], description: 'Zvětšit zobrazení' },
    { keys: ['Ctrl', '-'], description: 'Zmenšit zobrazení' },
    { keys: ['Ctrl', '0'], description: 'Obnovit velikost zobrazení' },
    { keys: ['?'], description: 'Zobrazit tuto nápovědu' },
  ];

  onMount(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      // ? key to show help
      if (event.key === '?' && !DATA_VARS.isEditing) {
        event.preventDefault();
        showHelp = !showHelp;
      }

      // Escape to close help (only if help is shown)
      if (event.key === 'Escape' && showHelp) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showHelp = false;
      }
    };

    // Use capture phase to handle ESC with high priority
    window.addEventListener('keydown', handleGlobalKeydown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeydown, true);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if showHelp}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="shortcuts-modal-overlay" onclick={() => (showHelp = false)}>
    <div class="shortcuts-modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Klávesové zkratky</h2>
        <Button onClick={() => (showHelp = false)} icon="mdiClose" iconColor="#fff" onlyIcon />
      </div>

      <div class="shortcuts-list">
        {#each shortcuts as shortcut}
          <div class="shortcut-item">
            <div class="shortcut-keys">
              {#each shortcut.keys as key, i}
                <kbd class="key">{key}</kbd>
                {#if i < shortcut.keys.length - 1}
                  <span class="plus">+</span>
                {/if}
              {/each}
            </div>
            <div class="shortcut-description">{shortcut.description}</div>
          </div>
        {/each}
      </div>

      <div class="modal-footer">
        <p class="help-text">Stiskněte <kbd>?</kbd> kdykoli pro zobrazení této nápovědy</p>
      </div>
    </div>
  </div>
{/if}

<Button onClick={() => (showHelp = true)} icon="mdiKeyboard" primary>
  <KeyboardShortcut keys={'Shift+?'} />
</Button>

<style lang="scss">
  .shortcuts-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-6);
    background: var(--color-primary);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    color: var(--color-text-on-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      background: var(--color-primary-hover);
      border-color: var(--color-primary);
      color: var(--color-text-on-primary);
    }

    kbd {
      padding: var(--space-1) var(--space-3);
      background: var(--color-primary-hover);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-family: var(--font-mono);
      color: var(--color-text-on-primary);
      box-shadow: var(--shadow-sm);
    }
  }

  .shortcuts-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-overlay-blur);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-top);
    animation: fadeIn var(--transition-base);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .shortcuts-modal {
    background: var(--color-primary);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: var(--shadow-xl);
    animation: slideUp var(--transition-slow);
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-8) var(--space-10);
    border-bottom: 1px solid var(--color-primary);

    h2 {
      margin: 0;
      font-size: var(--font-size-xl);
      color: var(--color-text-on-primary);
      font-weight: 600;
    }

    .close-btn {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--color-text-on-primary);
      cursor: pointer;
      transition: all var(--transition-base);

      &:hover {
        background: var(--color-primary-hover);
        color: var(--color-text-on-primary);
      }
    }
  }

  .shortcuts-list {
    padding: var(--space-10);
    max-height: 60vh;
    overflow-y: auto;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) 0;
    border-bottom: 1px solid var(--color-primary);

    &:last-child {
      border-bottom: none;
    }

    .shortcut-keys {
      display: flex;
      align-items: center;
      gap: var(--space-3);

      .key {
        padding: var(--space-3) var(--space-5);
        background: var(--color-primary-hover);
        border: 1px solid var(--color-primary);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-family: var(--font-mono);
        color: var(--color-text-on-primary);
        font-weight: 500;
        min-width: 2rem;
        text-align: center;
        box-shadow: var(--shadow-sm);
      }

      .plus {
        color: var(--color-text-on-primary);
        font-size: var(--font-size-xs);
        font-weight: 600;
      }
    }

    .shortcut-description {
      flex: 1;
      text-align: right;
      font-size: var(--font-size-base);
      color: var(--color-border-light);
      padding-left: var(--space-10);
    }
  }

  .modal-footer {
    padding: var(--space-8) var(--space-10);
    background: var(--color-primary);
    border-top: 1px solid var(--color-primary);

    .help-text {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-on-primary);
      text-align: center;

      kbd {
        padding: var(--space-1) var(--space-3);
        background: var(--color-primary-hover);
        border: 1px solid var(--color-primary);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-family: var(--font-mono);
        color: var(--color-text-on-primary);
      }
    }
  }

  /* Scrollbar styling */
  .shortcuts-list::-webkit-scrollbar {
    width: var(--space-4);
  }

  .shortcuts-list::-webkit-scrollbar-track {
    background: var(--color-primary);
  }

  .shortcuts-list::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: var(--radius-sm);

    &:hover {
      background: var(--color-primary-hover);
    }
  }
</style>

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
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: #285597;
    border: 1px solid #285597;
    border-radius: 0.375rem;
    color: #fff;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: #1e4177;
      border-color: #285597;
      color: #fff;
    }

    kbd {
      padding: 0.125rem 0.375rem;
      background: #1e4177;
      border: 1px solid #285597;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-family: monospace;
      color: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
  }

  .shortcuts-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
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
    background: #285597;
    border-radius: 1rem;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
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
    padding: 1.5rem 1.75rem;
    border-bottom: 1px solid #285597;

    h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #fff;
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
      border-radius: 0.375rem;
      color: #fff;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #1e4177;
        color: #fff;
      }
    }
  }

  .shortcuts-list {
    padding: 1.25rem 1.75rem;
    max-height: 60vh;
    overflow-y: auto;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 0;
    border-bottom: 1px solid #285597;

    &:last-child {
      border-bottom: none;
    }

    .shortcut-keys {
      display: flex;
      align-items: center;
      gap: 0.375rem;

      .key {
        padding: 0.375rem 0.625rem;
        background: #1e4177;
        border: 1px solid #285597;
        border-radius: 0.375rem;
        font-size: 0.8125rem;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        color: #fff;
        font-weight: 500;
        min-width: 2rem;
        text-align: center;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .plus {
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
      }
    }

    .shortcut-description {
      flex: 1;
      text-align: right;
      font-size: 0.875rem;
      color: #eee;
      padding-left: 1.25rem;
    }
  }

  .modal-footer {
    padding: 1rem 1.75rem;
    background: #285597;
    border-top: 1px solid #285597;

    .help-text {
      margin: 0;
      font-size: 0.8125rem;
      color: #fff;
      text-align: center;

      kbd {
        padding: 3px 0.375rem;
        background: #1e4177;
        border: 1px solid #285597;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-family: monospace;
        color: #fff;
      }
    }
  }

  /* Scrollbar styling */
  .shortcuts-list::-webkit-scrollbar {
    width: 0.5rem;
  }

  .shortcuts-list::-webkit-scrollbar-track {
    background: #285597;
  }

  .shortcuts-list::-webkit-scrollbar-thumb {
    background: #285597;
    border-radius: 0.25rem;

    &:hover {
      background: #1e4177;
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import Button from './Button.svelte';
  import KeyboardShortcut from './KeyboardShortcut.svelte';

  let showHelp = $state(false);

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Zaměřit globální vyhledávání' },
    { keys: ['Ctrl', 'N'], description: 'Vytvořit nový program' },
    { keys: ['Enter'], description: 'Začít editovat vybranou buňku' },
    { keys: ['Escape'], description: 'Zrušit editaci / Zavřít modály' },
    { keys: ['Tab'], description: 'Přesunout se na další buňku' },
    { keys: ['Shift', 'Tab'], description: 'Přesunout se na předchozí buňku' },
    { keys: ['↑', '↓', '←', '→'], description: 'Navigace v tabulce' },
    { keys: ['Ctrl', 'C'], description: 'Kopírovat obsah buňky' },
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
    gap: 6px;
    padding: 6px 12px;
    background: #285597;
    border: 1px solid #285597;
    border-radius: 6px;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: #1e4177;
      border-color: #285597;
      color: #fff;
    }

    kbd {
      padding: 2px 6px;
      background: #1e4177;
      border: 1px solid #285597;
      border-radius: 4px;
      font-size: 12px;
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
    border-radius: 16px;
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
    padding: 24px 28px;
    border-bottom: 1px solid #285597;

    h2 {
      margin: 0;
      font-size: 20px;
      color: #fff;
      font-weight: 600;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      border-radius: 6px;
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
    padding: 20px 28px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid #285597;

    &:last-child {
      border-bottom: none;
    }

    .shortcut-keys {
      display: flex;
      align-items: center;
      gap: 6px;

      .key {
        padding: 6px 10px;
        background: #1e4177;
        border: 1px solid #285597;
        border-radius: 6px;
        font-size: 13px;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        color: #fff;
        font-weight: 500;
        min-width: 32px;
        text-align: center;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .plus {
        color: #fff;
        font-size: 12px;
        font-weight: 600;
      }
    }

    .shortcut-description {
      flex: 1;
      text-align: right;
      font-size: 14px;
      color: #eee;
      padding-left: 20px;
    }
  }

  .modal-footer {
    padding: 16px 28px;
    background: #285597;
    border-top: 1px solid #285597;

    .help-text {
      margin: 0;
      font-size: 13px;
      color: #fff;
      text-align: center;

      kbd {
        padding: 3px 6px;
        background: #1e4177;
        border: 1px solid #285597;
        border-radius: 4px;
        font-size: 12px;
        font-family: monospace;
        color: #fff;
      }
    }
  }

  /* Scrollbar styling */
  .shortcuts-list::-webkit-scrollbar {
    width: 8px;
  }

  .shortcuts-list::-webkit-scrollbar-track {
    background: #285597;
  }

  .shortcuts-list::-webkit-scrollbar-thumb {
    background: #285597;
    border-radius: 4px;

    &:hover {
      background: #1e4177;
    }
  }
</style>

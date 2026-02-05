<script lang="ts">
  import {
    UPDATE_STATE,
    checkForUpdates,
    downloadAndInstall,
    skipUpdate,
  } from '$lib/updater.svelte';
  import { getVersion } from '@tauri-apps/api/app';
  import { onMount } from 'svelte';
  import Button from './Button.svelte';

  onMount(async () => {
    UPDATE_STATE.currentVersion = await getVersion();
  });

  $effect(() => {
    if (UPDATE_STATE.available) {
      UPDATE_STATE.showDialog = true;
    } else if (!UPDATE_STATE.available) {
      UPDATE_STATE.showDialog = false;
    }
  });

  async function handleInstall() {
    await downloadAndInstall();
  }

  function handleSkip() {
    UPDATE_STATE.showDialog = false;
    skipUpdate();
  }

  function handleLater() {
    UPDATE_STATE.showDialog = false;
  }

  async function handleCheck() {
    await checkForUpdates();
  }
</script>

{#if UPDATE_STATE.showDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={handleLater}>
    <div class="update-modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="icon-container">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="var(--color-primary)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <h2>
          {#if UPDATE_STATE.checking}
            Kontroluji aktualizace...
          {:else if UPDATE_STATE.available}
            Aktualizace k dispozici
          {:else}
            Máte nejnovější verzi aplikace
          {/if}
        </h2>
        <p class="subtitle">
          {#if UPDATE_STATE.available}
            Nová verze aplikace je připravena ke stažení
          {:else if UPDATE_STATE.downloading}
            Stahuji aktualizaci...
          {:else if UPDATE_STATE.installing}
            Instaluji aktualizaci...
          {:else if UPDATE_STATE.checking}
            &nbsp;
          {:else}
            Nebyla nalezena žádná nová verze
          {/if}
        </p>
      </div>

      <div class="modal-content">
        <div class="version-info">
          <div class="version-box current">
            <div class="label">Současná verze</div>
            <div class="version">{UPDATE_STATE.currentVersion}</div>
          </div>
          <div class="arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14m0 0l-7-7m7 7l-7 7"
                stroke="var(--color-text-secondary)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="version-box latest">
            <div class="label">Nová verze</div>
            <div class="version">{UPDATE_STATE.latestVersion}</div>
          </div>
        </div>

        {#if UPDATE_STATE.update?.body}
          <div class="release-notes">
            <h4>Co je nového</h4>
            <div class="notes-content">
              {@html UPDATE_STATE.update.body}
            </div>
          </div>
        {/if}

        {#if UPDATE_STATE.downloading}
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-text">{UPDATE_STATE.progress}%</div>
              <div class="progress-fill" style="width: {UPDATE_STATE.progress}%"></div>
            </div>
            <p class="progress-text">Stahuji aktualizaci...</p>
          </div>
        {:else if UPDATE_STATE.installing}
          <div class="progress-container">
            <div class="spinner"></div>
            <p class="progress-text">Instaluji aktualizaci...</p>
          </div>
        {/if}
      </div>

      <div class="modal-actions">
        {#if UPDATE_STATE.available}
          <div class="update-avail">
            <Button
              onClick={handleSkip}
              disabled={UPDATE_STATE.downloading || UPDATE_STATE.installing}
              style="height: 60px"
            >
              Přeskočit tuto verzi
            </Button>
            <Button
              onClick={handleLater}
              disabled={UPDATE_STATE.downloading || UPDATE_STATE.installing}
              style="height: 60px"
            >
              Připomenout později
            </Button>
            <Button
              onClick={handleInstall}
              disabled={UPDATE_STATE.downloading || UPDATE_STATE.installing}
              primary
              style="height: 60px"
            >
              {#if UPDATE_STATE.downloading}
                Stahuji...
              {:else if UPDATE_STATE.installing}
                Instaluji...
              {:else}
                Nainstalovat nyní
              {/if}
            </Button>
          </div>
        {/if}
        <div>
          <Button
            onClick={handleCheck}
            disabled={UPDATE_STATE.downloading || UPDATE_STATE.installing}
            primary
            class="full-total"
            style="height: 60px"
          >
            Zkontrolovat aktualizace
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .modal-overlay {
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
    backdrop-filter: blur(4px);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .update-modal {
    background: var(--color-bg);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 768px;
    overflow: hidden;
    box-shadow: var(--shadow-xl);
    animation: slideUp var(--transition-slow);
    display: flex;
    flex-direction: column;
  }

  @keyframes slideUp {
    from {
      transform: translateY(40px) scale(0.96);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .modal-header {
    padding: var(--space-10) var(--space-10) var(--space-8);
    text-align: center;
    border-bottom: 1px solid var(--color-border-light);

    .icon-container {
      margin: 0 auto var(--space-8);
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-lighter) 100%);
      border-radius: var(--radius-xl);
    }

    h2 {
      margin: 0 0 var(--space-4) 0;
      font-size: var(--font-size-xl);
      color: var(--color-text);
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
    }
  }

  .modal-content {
    padding: var(--space-8) var(--space-10);
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
  }

  .version-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    margin-bottom: var(--space-10);
  }

  .version-box {
    flex: 1;
    padding: var(--space-8);
    border-radius: var(--radius-xl);
    text-align: center;

    &.current {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border-light);
    }

    &.latest {
      background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-lighter) 100%);
      border: 1px solid var(--color-primary-light);
    }

    .label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--space-4);
      font-weight: 600;
    }

    .version {
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--color-text);
    }
  }

  .arrow {
    flex-shrink: 0;
  }

  .release-notes {
    background: var(--color-bg-subtle);
    border-radius: var(--radius-xl);
    padding: var(--space-8);
    margin-top: var(--space-8);

    h4 {
      margin: 0 0 var(--space-6) 0;
      font-size: var(--font-size-base);
      color: var(--color-text);
      font-weight: 600;
    }

    .notes-content {
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
      line-height: 1.6;
      max-height: 200px;
      overflow-y: auto;

      :global(h2) {
        color: #3498db;
        font-size: var(--font-size-md);
        margin: var(--space-6) 0 var(--space-4) 0;
      }

      :global(h3) {
        color: #27ae60;
        font-size: var(--font-size-base);
        margin: var(--space-5) 0 var(--space-3) 0;
      }

      :global(h4) {
        color: #8e44ad;
        font-size: var(--font-size-sm);
        margin: var(--space-4) 0 var(--space-2) 0;
      }

      :global(ul) {
        margin: var(--space-4) 0;
        padding-left: var(--space-10);
      }

      :global(li) {
        margin-bottom: var(--space-2);
      }

      :global(strong) {
        color: #2c3e50;
      }

      :global(p) {
        margin: var(--space-3) 0;
      }

      :global(hr) {
        border: none;
        border-top: 1px solid var(--color-border);
        margin: var(--space-6) 0;
      }
    }
  }

  .progress-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-8) 0;
  }

  .progress-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 1.5rem;
    background: var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;

    .progress-text {
      color: var(--color-text-on-primary);
      z-index: 1;
    }
  }

  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
    border-radius: 3px;
  }

  .spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 4px solid var(--color-border-light);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .progress-text {
    margin: 0;
    color: var(--color-primary);
    font-size: var(--font-size-base);
    font-weight: 500;
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-10);
    border-top: 1px solid var(--color-border-light);
    background: var(--color-bg-subtle);

    div {
      display: flex;
      gap: var(--space-6);

      button {
        height: 60px;
      }
    }
  }
</style>

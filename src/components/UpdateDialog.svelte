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
              stroke="#285597"
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
                stroke="#667085"
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
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
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
    background: white;
    border-radius: 1rem;
    width: 90%;
    max-width: 768px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: slideUp 0.3s ease;
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
    padding: 2rem 32px 1.5rem;
    text-align: center;
    border-bottom: 1px solid #e4e7ec;

    .icon-container {
      margin: 0 auto 1rem;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
      border-radius: 1rem;
    }

    h2 {
      margin: 0 0 8px 0;
      font-size: 1.5rem;
      color: #1d2939;
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      color: #667085;
      font-size: 0.875rem;
    }
  }

  .modal-content {
    padding: 1.5rem 2rem;
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
  }

  .version-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .version-box {
    flex: 1;
    padding: 1rem;
    border-radius: 0.75rem;
    text-align: center;

    &.current {
      background: #f9fafb;
      border: 1px solid #e4e7ec;
    }

    &.latest {
      background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
      border: 1px solid #bfdbfe;
    }

    .label {
      font-size: 0.75rem;
      color: #667085;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .version {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1d2939;
    }
  }

  .arrow {
    flex-shrink: 0;
  }

  .release-notes {
    background: #f9fafb;
    border-radius: 0.75rem;
    padding: 1rem;
    margin-top: 1rem;

    h4 {
      margin: 0 0 12px 0;
      font-size: 0.875rem;
      color: #1d2939;
      font-weight: 600;
    }

    .notes-content {
      color: #667085;
      font-size: 0.875rem;
      line-height: 1.6;
      max-height: 200px;
      overflow-y: auto;

      :global(h2) {
        color: #3498db;
        font-size: 1rem;
        margin: 0.75rem 0 8px 0;
      }

      :global(h3) {
        color: #27ae60;
        font-size: 0.875rem;
        margin: 0.625rem 0 6px 0;
      }

      :global(h4) {
        color: #8e44ad;
        font-size: 0.8125rem;
        margin: 0.5rem 0 4px 0;
      }

      :global(ul) {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
      }

      :global(li) {
        margin-bottom: 0.25rem;
      }

      :global(strong) {
        color: #2c3e50;
      }

      :global(p) {
        margin: 0.375rem 0;
      }

      :global(hr) {
        border: none;
        border-top: 1px solid #ddd;
        margin: 0.75rem 0;
      }
    }
  }

  .progress-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem 0;
  }

  .progress-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 1.5rem;
    background: #c5c5c5;
    border-radius: 0.5rem;
    overflow: hidden;

    .progress-text {
      color: #ffffff;
      z-index: 1;
    }
  }

  .progress-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, #285597, #183868);
    border-radius: 3px;
  }

  .spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 4px solid #e4e7ec;
    border-top-color: #285597;
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
    color: #285597;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.5rem 2rem;
    border-top: 1px solid #e4e7ec;
    background: #f9fafb;

    div {
      display: flex;
      gap: 0.75rem;

      button {
        height: 60px;
      }
    }
  }
</style>

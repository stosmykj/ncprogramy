<script lang="ts">
  import { File } from '../models/file';
  import Button from './Button.svelte';
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { exists } from '@tauri-apps/plugin-fs';
  import { logger } from '$lib/logger';

  let {
    file,
    isOpen = $bindable(false),
  }: {
    file: File | null;
    isOpen?: boolean;
  } = $props();

  let fileContent = $state<string | null>(null);
  let isLoadingContent = $state(false);

  function isImage(extension: string): boolean {
    const ext = extension.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext);
  }

  function isPDF(extension: string): boolean {
    return extension.toLowerCase() === 'pdf';
  }

  function shouldShowPreview(extension: string): boolean {
    return isImage(extension) || isPDF(extension);
  }

  $effect(() => {
    if (isOpen && file) {
      loadFileContent();
    } else {
      fileContent = null;
    }
  });

  $effect(() => {
    if (isOpen) {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
        }
      };
      // Use capture phase to intercept before other listeners
      window.addEventListener('keydown', handleKeydown, true);
      return () => {
        window.removeEventListener('keydown', handleKeydown, true);
      };
    }
  });

  async function loadFileContent() {
    if (!file || !file.Path || !file.Extension) {
      fileContent = null;
      return;
    }

    if (!shouldShowPreview(file.Extension)) {
      fileContent = null;
      return;
    }

    try {
      isLoadingContent = true;
      const fileExists = await exists(file.Path);

      if (!fileExists) {
        fileContent = null;
        return;
      }

      const assetUrl = convertFileSrc(file.Path);
      fileContent = assetUrl;
    } catch (error) {
      logger.error('Failed to load file content', error);
      fileContent = null;
    } finally {
      isLoadingContent = false;
    }
  }

  function close() {
    isOpen = false;
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }
</script>

{#if isOpen && file}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="dialog-backdrop"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="dialog-content">
      <div class="dialog-header">
        <div class="file-info">
          <span class="extension-badge">{file.Extension.toUpperCase()}</span>
          <span class="file-name">{file.Name}</span>
        </div>
        <Button icon="mdiClose" onClick={close} onlyIcon />
      </div>

      <div class="dialog-body">
        {#if isLoadingContent}
          <div class="loading">Načítání náhledu...</div>
        {:else if fileContent}
          {#if isImage(file.Extension)}
            <img src={fileContent} alt={file.Name} class="full-image" />
          {:else if isPDF(file.Extension)}
            <iframe src={fileContent} title={file.Name} class="full-pdf"></iframe>
          {/if}
        {:else}
          <div class="no-preview">Náhled není k dispozici</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .dialog-backdrop {
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
    padding: var(--space-8);
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog-content {
    background: var(--color-bg);
    border-radius: var(--radius-xl);
    width: 100%;
    height: 100%;
    max-width: 80vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-xl);
    animation: slideUp 0.2s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) var(--space-8);
    border-bottom: 1px solid var(--color-border-lighter);
    flex-shrink: 0;

    .file-info {
      display: flex;
      align-items: center;
      gap: var(--space-6);

      .extension-badge {
        display: inline-block;
        padding: var(--space-2) var(--space-4);
        background: var(--color-primary);
        color: var(--color-text-on-primary);
        font-size: var(--font-size-2xs);
        font-weight: 700;
        border-radius: var(--radius-sm);
        text-transform: uppercase;
      }

      .file-name {
        font-size: var(--font-size-md);
        font-weight: 600;
        color: var(--color-text);
      }
    }
  }

  .dialog-body {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-subtle);
    padding: var(--space-8);

    .loading,
    .no-preview {
      padding: 2rem;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
    }

    .full-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
    }

    .full-pdf {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: var(--radius-lg);
      background: var(--color-bg);
      box-shadow: var(--shadow-md);
    }
  }
</style>

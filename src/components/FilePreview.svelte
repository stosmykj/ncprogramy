<script lang="ts">
  import { File } from '../models/file';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import KeyboardShortcut from './KeyboardShortcut.svelte';
  import FullFilePreviewDialog from './FullFilePreviewDialog.svelte';
  import { revealItemInDir } from '@tauri-apps/plugin-opener';
  import { open as shellOpen } from '@tauri-apps/plugin-shell';
  import { exists, stat } from '@tauri-apps/plugin-fs';
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { logger } from '$lib/logger';
  import { formatFileSize } from '$lib/backupProcessor';

  let {
    file,
    anchorElement,
  }: {
    file: File | null;
    anchorElement: HTMLElement | null;
  } = $props();

  let position = $state({ top: 0, left: 0 });
  let fileStats = $state<{ size: string; modified: string; exists: boolean } | null>(null);
  let isLoadingContent = $state(false);
  let isFullPreviewOpen = $state(false);
  const showPreview = $derived.by(() => file && (isImage(file.Extension) || isPDF(file.Extension)));

  $effect(() => {
    if (file && anchorElement) {
      loadFileMetadata();
      updatePosition();
    }
  });

  function isImage(extension: string): boolean {
    const ext = extension.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext);
  }

  function isPDF(extension: string): boolean {
    return extension.toLowerCase() === 'pdf';
  }

  function updatePosition() {
    if (!anchorElement) return;

    const rect = anchorElement.getBoundingClientRect();

    const popoverWidth = 400;
    const popoverHeight =
      document.getElementById('file-preview')?.getBoundingClientRect().height ?? 300;

    // Position below and to the right of the anchor
    let top = rect.height - 2;
    let left = rect.width / 2 - popoverWidth / 2;

    // Adjust if popover goes off-screen
    if (left + popoverWidth > window.innerWidth) {
      left = rect.width - popoverWidth;
    }

    if (top + popoverHeight > window.innerHeight) {
      top = rect.height - popoverHeight;
    }

    position = { top, left };
  }

  async function loadFileMetadata() {
    if (!file || !file.Path) {
      fileStats = null;
      return;
    }

    try {
      const fileExists = await exists(file.Path);

      if (!fileExists) {
        fileStats = { size: 'N/A', modified: 'N/A', exists: false };
        return;
      }

      const stats = await stat(file.Path);

      const size = formatFileSize(Number(stats.size));
      const modified = stats.mtime ? new Date(stats.mtime).toLocaleString('cs-CZ') : 'N/A';

      fileStats = { size, modified, exists: true };
    } catch (error) {
      logger.error('Failed to load file metadata', error);
      fileStats = { size: 'N/A', modified: 'N/A', exists: false };
    }
  }

  function getFileIcon(extension: string) {
    const ext = extension.toLowerCase();
    if (ext === 'pdf') return 'mdiFilePdfBox';
    if (ext === 'docx' || ext === 'doc') return 'mdiFileDocumentOutline';
    if (ext === 'txt') return 'mdiFileDocumentOutline';
    if (ext === 'odg') return 'mdiFileImageOutline';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext)) return 'mdiFileImageOutline';
    return 'mdiFile';
  }

  export function openFullPreview() {
    isFullPreviewOpen = true;
  }

  export async function openFile() {
    if (!file?.Path) return;

    try {
      await shellOpen(file.Path);
    } catch (error) {
      logger.error('Failed to open file', error);
    }
  }

  export async function openFileLocation() {
    if (!file?.Path) return;

    try {
      await revealItemInDir(file.Path);
    } catch (error) {
      logger.error('Failed to open file location', error);
    }
  }
</script>

{#if file}
  <div
    id="file-preview"
    class="file-preview"
    style="top: {position.top}px; left: {position.left}px;"
  >
    <div class="preview-header">
      <div class="file-icon">
        <Icon name={getFileIcon(file.Extension)} size={32} color="var(--color-primary)" />
      </div>
      <div class="file-info">
        <div class="file-name" title={file.Name}>
          <span class="extension-badge">{file.Extension.toUpperCase()}</span>
          {file.Name}
        </div>
        <div class="file-path" title={file.Path}>
          {file.Path}
        </div>
      </div>
    </div>

    {#if fileStats}
      <!-- File Content Preview -->
      {#if fileStats.exists && showPreview}
        <div class="preview-content">
          {#if isLoadingContent}
            <div class="content-loading">Načítání náhledu...</div>
          {:else if isImage(file.Extension)}
            <img src={convertFileSrc(file.Path)} alt={file.Name} class="image-preview" />
          {:else if isPDF(file.Extension)}
            <iframe src={convertFileSrc(file.Path)} title={file.Name} class="pdf-preview"></iframe>
          {/if}
        </div>
      {/if}
      <div class="preview-body">
        <div class="stat-row">
          <span class="stat-label">Status:</span>
          <span
            class="stat-value"
            class:exists={fileStats.exists}
            class:missing={!fileStats.exists}
          >
            {fileStats.exists ? 'Existuje' : 'Soubor nenalezen'}
          </span>
        </div>
        {#if fileStats.exists}
          <div class="stat-row">
            <span class="stat-label">Velikost:</span>
            <span class="stat-value">{fileStats.size}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Změněno:</span>
            <span class="stat-value">{fileStats.modified}</span>
          </div>
        {/if}
      </div>

      {#if fileStats.exists}
        <div class="preview-footer">
          <div class="footer-button">
            <Button icon="mdiFileEye" onClick={openFullPreview} onlyIcon primary />
            <KeyboardShortcut keys="P" class="shortcut-hint" />
          </div>
          <div class="footer-buttons-right">
            <div class="footer-button">
              <Button icon="mdiOpenInNew" onClick={openFile} onlyIcon primary />
              <KeyboardShortcut keys="O" class="shortcut-hint" />
            </div>
            <div class="footer-button">
              <Button icon="mdiFolder" onClick={openFileLocation} onlyIcon primary />
              <KeyboardShortcut keys="F" class="shortcut-hint" />
            </div>
          </div>
        </div>
      {/if}
    {:else}
      <div class="preview-loading">Načítání...</div>
    {/if}
  </div>
{/if}

<FullFilePreviewDialog {file} bind:isOpen={isFullPreviewOpen} />

<style lang="scss">
  .file-preview {
    position: absolute;
    z-index: var(--z-modal-nested);
    width: 400px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    animation: slideIn var(--transition-base) ease-out;
    pointer-events: auto;

  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .preview-content {
    z-index: var(--z-modal-nested);
    height: auto;
    overflow: hidden;
    background: var(--color-bg-subtle);
    border-bottom: 1px solid var(--color-border-lighter);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);

    .content-loading {
      padding: var(--space-10);
      text-align: center;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .image-preview {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
    }

    .pdf-preview {
      width: 100%;
      height: 300px;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--color-bg);
    }
  }

  .preview-header {
    display: flex;
    gap: var(--space-6);
    padding: var(--space-8);
    border-bottom: 1px solid var(--color-border-lighter);

    .file-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      background: var(--color-primary-lighter);
      border-radius: var(--radius-lg);
    }

    .file-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);

      .file-name {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--font-size-base);
        font-weight: 600;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        .extension-badge {
          display: inline-block;
          padding: var(--space-1) var(--space-3);
          background: var(--color-primary);
          color: var(--color-text-on-primary);
          font-size: var(--font-size-2xs);
          font-weight: 700;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          flex-shrink: 0;
        }
      }

      .file-path {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .preview-body {
    padding: var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--font-size-sm);

      .stat-label {
        color: var(--color-text-secondary);
        font-weight: 500;
      }

      .stat-value {
        color: var(--color-text);
        font-weight: 400;

        &.exists {
          color: var(--color-success);
          font-weight: 500;
        }

        &.missing {
          color: var(--color-danger);
          font-weight: 500;
        }
      }
    }
  }

  .preview-loading {
    padding: var(--space-10);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .preview-footer {
    display: flex;
    justify-content: space-between;
    padding: var(--space-6) var(--space-8);
    border-top: 1px solid var(--color-border-lighter);

    .footer-button {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .footer-buttons-right {
      display: flex;
      gap: var(--space-4);
    }

    :global(.shortcut-hint) {
      background: var(--color-border-light);
      border-color: var(--color-border);
      color: var(--color-text);
      font-size: var(--font-size-2xs);
      padding: var(--space-1) var(--space-2);
    }
  }
</style>

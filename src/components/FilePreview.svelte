<script lang="ts">
  import { File } from '../models/file';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import KeyboardShortcut from './KeyboardShortcut.svelte';
  import FullFilePreviewDialog from './FullFilePreviewDialog.svelte';
  import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
  import { exists, stat } from '@tauri-apps/plugin-fs';
  import { convertFileSrc } from '@tauri-apps/api/core';
  import { logger } from '$lib/logger';

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

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
      await openPath(file.Path);
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
        <Icon name={getFileIcon(file.Extension)} size={32} color="#4a90e2" />
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
    z-index: 1001;
    width: 400px;
    background: white;
    border: 1px solid #d0d5dd;
    border-radius: 0.5rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.15s ease-out;
    pointer-events: auto;

    &.preview {
      border-top-right-radius: 0;
    }
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
    z-index: 1001;
    height: auto;
    overflow: hidden;
    background: #f9fafb;
    border-bottom: 1px solid #eaecf0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;

    .content-loading {
      padding: 1.5rem;
      text-align: center;
      color: #667085;
      font-size: 0.8125rem;
    }

    .image-preview {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 0.25rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .pdf-preview {
      width: 100%;
      height: 300px;
      border: none;
      border-radius: 0.25rem;
      background: white;
    }
  }

  .preview-header {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    border-bottom: 1px solid #eaecf0;

    .file-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      background: rgba(74, 144, 226, 0.1);
      border-radius: 0.5rem;
    }

    .file-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .file-name {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #101828;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        .extension-badge {
          display: inline-block;
          padding: 0.125rem 0.375rem;
          background: #4a90e2;
          color: white;
          font-size: 0.625rem;
          font-weight: 700;
          border-radius: 3px;
          text-transform: uppercase;
          flex-shrink: 0;
        }
      }

      .file-path {
        font-size: 0.75rem;
        color: #667085;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .preview-body {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;

      .stat-label {
        color: #667085;
        font-weight: 500;
      }

      .stat-value {
        color: #101828;
        font-weight: 400;

        &.exists {
          color: #16a34a;
          font-weight: 500;
        }

        &.missing {
          color: #dc2626;
          font-weight: 500;
        }
      }
    }
  }

  .preview-loading {
    padding: 1.5rem;
    text-align: center;
    color: #667085;
    font-size: 0.8125rem;
  }

  .preview-footer {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-top: 1px solid #eaecf0;

    .footer-button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .footer-buttons-right {
      display: flex;
      gap: 0.5rem;
    }

    :global(.shortcut-hint) {
      background: #e5e7eb;
      border-color: #d1d5db;
      color: #374151;
      font-size: 0.625rem;
      padding: 0.125rem 0.25rem;
    }
  }
</style>

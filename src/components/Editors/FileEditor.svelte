<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog';
  import { exists } from '@tauri-apps/plugin-fs';
  import { File } from '../../models/file';
  import type { FileExtension } from '../../models/file';
  import { showError, showWarning } from '$lib/toast.svelte';
  import Button from '../Button.svelte';
  import KeyboardShortcut from '../KeyboardShortcut.svelte';
  import { logger } from '$lib/logger';

  let {
    value = $bindable(),
    onSave,
    onCancel,
    inDialog = false,
  }: {
    value: File | null | undefined;
    onSave: (file: File | null) => void;
    onCancel: () => void;
    inDialog?: boolean;
  } = $props();

  let selectedFile = $state<File | null>(value || null);
  let isNewValueSelected = false;

  $effect(() => {
    if (!isNewValueSelected) {
      selectedFile = value ?? null;
      if (selectedFile) {
        setTimeout(() => {
          document.getElementById('filename-input')?.focus();
        }, 1);
      } else {
        setTimeout(() => {
          document.getElementById('file-container')?.focus();
        }, 1);
      }
    }
    isNewValueSelected = false;
  });

  $effect(() => {
    if (selectedFile) {
      document.getElementById('filename-input')?.focus();
    }
  });

  async function handleFileSelect() {
    try {
      const result = await open({
        multiple: false,
        filters: [
          {
            name: 'Dokumenty',
            extensions: ['pdf', 'docx', 'doc', 'txt', 'odg'],
          },
          {
            name: 'Obrázky',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
          },
          {
            name: 'Videa',
            extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv'],
          },
          {
            name: 'Archivy',
            extensions: ['zip', 'rar', '7z'],
          },
          {
            name: 'Tabulky',
            extensions: ['xlsx', 'xls', 'csv'],
          },
        ],
      });

      if (result && typeof result === 'string') {
        const fileExists = await exists(result);
        if (!fileExists) {
          showError('Vybraný soubor neexistuje');
          return;
        }

        const fileName = result.split('/').pop() || result.split('\\').pop() || '';
        const extension = fileName.split('.').pop()?.toUpperCase() as FileExtension;

        const validExtensions: FileExtension[] = [
          'PDF',
          'DOCX',
          'DOC',
          'TXT',
          'ODG',
          'JPG',
          'JPEG',
          'PNG',
          'GIF',
          'BMP',
          'MP4',
          'AVI',
          'MKV',
          'MOV',
          'WMV',
          'ZIP',
          'RAR',
          '7Z',
          'XLSX',
          'XLS',
          'CSV',
        ];
        if (!extension || !validExtensions.includes(extension)) {
          showError(
            'Nepodporovaný typ souboru. Povolené: PDF, DOCX, DOC, TXT, ODG, JPG, JPEG, PNG, GIF, BMP, MP4, AVI, MKV, MOV, WMV, ZIP, RAR, 7Z, XLSX, XLS, CSV'
          );
          return;
        }
        isNewValueSelected = true;

        selectedFile = new File({
          name: fileName,
          path: result,
          extension: extension,
        });

        // In dialog mode, auto-save when file is selected
        if (inDialog) {
          onSave(selectedFile);
        }

        // Focus the filename input after file is loaded
        setTimeout(() => {
          document.getElementById('filename-input')?.focus();
        }, 50);
      }
    } catch (error) {
      logger.error('Failed to select file', error);
      showError('Chyba při výběru souboru');
    }
  }

  async function handleSave() {
    if (selectedFile) {
      const fileExists = await exists(selectedFile.Path);
      if (!fileExists) {
        showWarning('Upozornění: Soubor již neexistuje na zadané cestě');
      }
    }
    isNewValueSelected = false;
    onSave(selectedFile);
  }

  async function handleRemove() {
    isNewValueSelected = false;
    onSave(null);
  }

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSave();
        break;
      case 'Escape':
        e.preventDefault();
        onCancel();
        break;
      case 'o':
      case 'O':
        if (e.ctrlKey) {
          e.preventDefault();
          handleFileSelect();
        }
        break;
      case 'Delete':
        if (e.ctrlKey && selectedFile) {
          e.preventDefault();
          handleRemove();
        }
        break;
    }
  }

  function shortenPath(path: string): string {
    if (!path) return '';

    return '...' + path.slice(path.length - 37);
  }
</script>

<div class="file-editor">
  <div
    id="file-container"
    class="file-info-container"
    onclick={handleFileSelect}
    onkeydown={handleKeyDown}
    role="button"
    tabindex={selectedFile ? -1 : 0}
  >
    {#if selectedFile}
      <div class="file-details">
        <div class="file-name-row">
          <span class="file-extension-badge">{selectedFile.Extension.toUpperCase()}</span>
          <input
            id="filename-input"
            class="file-name-text"
            onclick={(e) => e.stopPropagation()}
            onkeydown={handleKeyDown}
            bind:value={selectedFile.Name}
          />
        </div>
        <div class="file-path-row" title={selectedFile.Path}>
          <span class="path-value">{shortenPath(selectedFile.Path)}</span>
        </div>
      </div>
    {:else}
      <div class="file-placeholder">
        <span>Klikněte pro výběr souboru...</span>
      </div>
    {/if}
  </div>
  <div class="file-actions">
    {#if selectedFile}
      <Button onClick={handleRemove} icon="mdiClose" iconSize={24} primary onlyIcon tabIndex={-1}>
        <KeyboardShortcut keys="Ctrl+Del" />
      </Button>
    {/if}
    <Button onClick={handleFileSelect} icon="mdiFileUpload" iconSize={24} primary onlyIcon tabIndex={-1}>
      <KeyboardShortcut keys="Ctrl+O" />
    </Button>
  </div>
</div>

<style lang="scss">
  .file-editor {
    display: flex;
    width: 100%;
    height: 100%;
    padding: var(--space-4);
    align-items: center;
    gap: var(--space-2);
  }

  .file-info-container {
    display: flex;
    border-radius: var(--radius-sm);
    transition: var(--transition-base);
    width: 100%;
    max-width: calc(100% - 95px);
    min-height: 50px;
    align-items: center;
    cursor: pointer;
    border: 2px solid transparent;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: var(--input-focus-ring);
    }

    &:hover {
      background: rgba(40, 85, 151, 0.05);
    }
  }

  .file-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;

    .file-name-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: 500;

      .file-extension-badge {
        background: var(--color-primary);
        color: var(--color-text-on-primary);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
      }

      .file-name-text {
        flex: 1;
        height: 1.75rem;
        padding: 0 var(--space-2);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--font-size-sm);
        color: var(--color-text);
        border: var(--input-border);
        border-radius: var(--radius-sm);
      }
    }

    .file-path-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-2xs);
      color: var(--color-primary);

      .path-value {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--font-mono);
      }
    }
  }

  .file-placeholder {
    color: var(--color-text-muted);
    font-style: italic;
    font-size: var(--font-size-sm);
  }

  .file-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>

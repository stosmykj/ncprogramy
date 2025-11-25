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
  }: {
    value: File | null | undefined;
    onSave: (file: File | null) => void;
    onCancel: () => void;
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
    tabindex="0"
  >
    {#if selectedFile}
      <div class="file-details">
        <div class="file-name-row">
          <span class="file-extension-badge">{selectedFile.Extension.toUpperCase()}</span>
          <input
            id="filename-input"
            class="file-name-text"
            onclick={(e) => e.stopPropagation()}
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
      <Button onClick={handleRemove} icon="mdiClose" iconSize={24} primary onlyIcon>
        <KeyboardShortcut keys="Ctrl+Del" />
      </Button>
    {/if}
    <Button onClick={handleFileSelect} icon="mdiFileUpload" iconSize={24} primary onlyIcon>
      <KeyboardShortcut keys="Ctrl+O" />
    </Button>
  </div>
</div>

<style lang="scss">
  .file-editor {
    display: flex;
    width: 100%;
    height: 100%;
    padding: 10px;
    align-items: center;
    gap: 4px;
  }

  .file-info-container {
    display: flex;
    border-radius: 4px;
    transition: 0.15s ease;
    width: 100%;
    max-width: calc(100% - 95px);
    min-height: 50px;
    align-items: center;
  }

  .file-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;

    .file-name-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;

      .file-extension-badge {
        background: #285597;
        color: white;
        padding: 5px 5px;
        border-radius: 4px;
      }

      .file-name-text {
        flex: 1;
        height: 30px;
        padding: 0 5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 16px;
        color: #1f2937;
        border: 1px solid #1f2937;
        border-radius: 5px;
      }
    }

    .file-path-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #285597;

      .path-value {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: 'Courier New', monospace;
      }
    }
  }

  .file-placeholder {
    color: #9ca3af;
    font-style: italic;
    font-size: 14px;
  }

  .file-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>

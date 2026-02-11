<script lang="ts">
  import { untrack } from 'svelte';
  import { TABLECOLUMNS } from '$lib/tableColumnProcessor.svelte';
  import {
    addProgram,
    updateProgram,
    generateIncrementalValue,
  } from '$lib/dataProcessor.svelte';
  import { PROGRAM_DIALOG } from '$lib/programDialogState.svelte';
  import { Program } from '../models/program';
  import { File } from '../models/file';
  import type { TableColumn } from '../models/tableColumn';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import DatePicker from './DatePicker.svelte';
  import FileEditor from './Editors/FileEditor.svelte';
  import GCodeFileEditor from './Editors/GCodeFileEditor.svelte';
  import { logger } from '$lib/logger';

  // Form data keyed by column key
  let formData = $state<Record<string, string | number | Date | File | null>>({});
  let saving = $state(false);

  // Get editable columns (exclude system, actions, computed columns)
  const editableColumns = $derived.by(() => {
    return TABLECOLUMNS.filter(
      (col) =>
        !['id', 'createdAt', 'updatedAt', 'actions'].includes(col.Key) &&
        col.Type !== 'computed'
    );
  });

  // Initialize form data when dialog opens
  let lastOpenState = false;
  let focusTimeout: number | null = null;
  $effect(() => {
    const isOpen = PROGRAM_DIALOG.isOpen;
    if (isOpen && !lastOpenState) {
      // Dialog just opened - initialize form
      untrack(() => {
        initFormData();
      });
      // Focus the appropriate input after a short delay for DOM to render
      if (focusTimeout !== null) clearTimeout(focusTimeout);
      focusTimeout = window.setTimeout(() => {
        focusTimeout = null;
        if (PROGRAM_DIALOG.isOpen) {
          focusInput();
        }
      }, 100);
    } else if (!isOpen && lastOpenState) {
      // Dialog closing - clean up timeout
      if (focusTimeout !== null) {
        clearTimeout(focusTimeout);
        focusTimeout = null;
      }
    }
    lastOpenState = isOpen;
  });

  function focusInput() {
    const focusColumn = PROGRAM_DIALOG.focusColumn;

    if (focusColumn) {
      // Focus the specific column input
      const input = document.getElementById(`field_${focusColumn}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
      // Clear focusColumn after use
      PROGRAM_DIALOG.focusColumn = null;
    } else {
      // Focus first editable input
      const firstCol = editableColumns[0];
      if (firstCol) {
        const input = document.getElementById(`field_${firstCol.Key}`) as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      }
    }
  }

  async function initFormData() {
    formData = {};
    const sourceProgram = PROGRAM_DIALOG.program;
    const isEditing = PROGRAM_DIALOG.mode === 'edit';
    const isCopying = PROGRAM_DIALOG.mode === 'create' && sourceProgram !== null;

    for (const col of editableColumns) {
      if (isEditing && sourceProgram) {
        // Editing existing program - populate with existing values
        const value = sourceProgram.get(col.Key);
        if (value instanceof File) {
          formData[col.Key] = value;
        } else if (value instanceof Date) {
          formData[col.Key] = value;
        } else if ((col.Type === 'date' || col.Type === 'datetime') && typeof value === 'string') {
          // Date stored as ISO string in database
          formData[col.Key] = value;
        } else if (typeof value === 'number') {
          formData[col.Key] = value;
        } else if (typeof value === 'string') {
          formData[col.Key] = value;
        } else {
          formData[col.Key] = null;
        }
      } else if (isCopying && sourceProgram) {
        // Copying from existing program
        if (col.Type === 'incremental' && col.IncrementalPattern) {
          // Generate new incremental value for copies
          try {
            formData[col.Key] = await generateIncrementalValue(col.IncrementalPattern, col.Key);
          } catch (e) {
            logger.error('Failed to generate incremental value', e);
            formData[col.Key] = '';
          }
        } else if (col.Copyable !== false) {
          // Copy value from source if column is copyable
          const value = sourceProgram.get(col.Key);
          if (value instanceof File) {
            formData[col.Key] = value;
          } else if (value instanceof Date) {
            formData[col.Key] = value;
          } else if ((col.Type === 'date' || col.Type === 'datetime') && typeof value === 'string') {
            // Date stored as ISO string in database
            formData[col.Key] = value;
          } else if (typeof value === 'number') {
            formData[col.Key] = value;
          } else if (typeof value === 'string') {
            formData[col.Key] = value;
          } else {
            formData[col.Key] = null;
          }
        } else {
          // Non-copyable column - use default
          formData[col.Key] = col.Type === 'number' ? null : '';
        }
      } else {
        // Creating new program - initialize with defaults
        if (col.Type === 'incremental' && col.IncrementalPattern) {
          // Generate incremental value
          try {
            formData[col.Key] = await generateIncrementalValue(col.IncrementalPattern, col.Key);
          } catch (e) {
            logger.error('Failed to generate incremental value', e);
            formData[col.Key] = '';
          }
        } else if (col.Type === 'date' || col.Type === 'datetime') {
          formData[col.Key] = null;
        } else if (col.Type === 'number') {
          formData[col.Key] = null;
        } else {
          formData[col.Key] = '';
        }
      }
    }
  }

  function closeDialog() {
    PROGRAM_DIALOG.isOpen = false;
    PROGRAM_DIALOG.program = null;
    PROGRAM_DIALOG.focusColumn = null;
  }

  async function handleSave() {
    saving = true;
    try {
      if (PROGRAM_DIALOG.mode === 'edit' && !PROGRAM_DIALOG.program) {
        logger.error('Edit mode requires a program reference');
        return;
      }
      const program = PROGRAM_DIALOG.mode === 'edit' && PROGRAM_DIALOG.program
        ? PROGRAM_DIALOG.program
        : new Program();

      // Set all form values to the program
      for (const col of editableColumns) {
        const value = formData[col.Key];

        if (value === null || value === undefined || value === '') {
          program.set(col.Key, undefined);
        } else if (col.Type === 'number') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          if (!isNaN(numValue as number)) {
            program.set(col.Key, numValue);
          }
        } else if (col.Type === 'date' || col.Type === 'datetime') {
          if (value instanceof Date) {
            program.set(col.Key, value);
          } else if (typeof value === 'string') {
            // Convert string date back to Date object
            const dateValue = new Date(value);
            if (!isNaN(dateValue.getTime())) {
              program.set(col.Key, dateValue);
            }
          }
        } else if ((col.Type === 'file' || col.Type === 'gcode') && value instanceof File) {
          program.set(col.Key, value);
        } else {
          program.set(col.Key, value);
        }
      }

      if (PROGRAM_DIALOG.mode === 'edit') {
        await updateProgram(program);
      } else {
        await addProgram(program);
      }

      closeDialog();
    } catch (error) {
      logger.error('Failed to save program', error);
    } finally {
      saving = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Only handle keys when dialog is open
    if (!PROGRAM_DIALOG.isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
    }
  }

  function formatDateForInput(date: Date | string | null, type: 'date' | 'datetime'): string {
    if (!date) return '';
    // Convert string to Date if needed (database stores dates as ISO strings)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    if (type === 'date') {
      return dateObj.toISOString().split('T')[0];
    }
    return dateObj.toISOString().slice(0, 16);
  }

  function handleDateChange(col: TableColumn, value: string) {
    if (!value) {
      formData[col.Key] = null;
    } else {
      formData[col.Key] = new Date(value);
    }
  }

  function getDateValue(key: string): Date | null {
    const val = formData[key];
    if (val instanceof Date) return val;
    if (typeof val === 'string' && val) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  function handleFileChange(col: TableColumn, file: File | null) {
    formData[col.Key] = file;
  }

  function getColumnLabel(col: TableColumn): string {
    return col.Label || col.Key;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if PROGRAM_DIALOG.isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeDialog}>
    <div class="program-modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>
          {#if PROGRAM_DIALOG.mode === 'edit'}
            Upravit záznam #{PROGRAM_DIALOG.program?.Id}
          {:else if PROGRAM_DIALOG.program}
            Kopírovat záznam #{PROGRAM_DIALOG.program?.Id}
          {:else}
            Nový záznam
          {/if}
        </h2>
        <button class="close-btn" onclick={closeDialog} title="Zavřít (Esc)">
          <Icon name="mdiClose" size={24} color="var(--color-text-secondary)" />
        </button>
      </div>

      <div class="modal-content">
        <div class="form-grid">
          {#each editableColumns as col}
            <div class="form-field">
              <label for="field_{col.Key}">
                {getColumnLabel(col)}
                {#if col.Type === 'incremental'}
                  <span class="badge incremental">Auto</span>
                {/if}
              </label>

              {#if col.Type === 'number'}
                <input
                  id="field_{col.Key}"
                  type="number"
                  step="any"
                  value={formData[col.Key] ?? ''}
                  oninput={(e) => formData[col.Key] = e.currentTarget.value}
                  disabled={saving}
                />
              {:else if col.Type === 'date'}
                <DatePicker
                  value={getDateValue(col.Key)}
                  type="date"
                  disabled={saving}
                  placeholder="Vyberte datum..."
                  onchange={(date) => { formData[col.Key] = date; }}
                />
              {:else if col.Type === 'datetime'}
                <DatePicker
                  value={getDateValue(col.Key)}
                  type="datetime"
                  disabled={saving}
                  placeholder="Vyberte datum a čas..."
                  onchange={(date) => { formData[col.Key] = date; }}
                />
              {:else if col.Type === 'file'}
                <div class="file-editor-wrapper">
                  <FileEditor
                    value={formData[col.Key] as File | null}
                    onSave={(file) => handleFileChange(col, file as File | null)}
                    onCancel={() => {}}
                    inDialog
                  />
                </div>
              {:else if col.Type === 'gcode'}
                <div class="file-editor-wrapper">
                  <GCodeFileEditor
                    value={formData[col.Key] as File | null}
                    programId={PROGRAM_DIALOG.program?.Id ?? undefined}
                    columnKey={col.Key}
                    onSave={(file) => handleFileChange(col, file as File | null)}
                    onCancel={() => {}}
                    inDialog
                  />
                </div>
              {:else if col.Type === 'incremental'}
                <input
                  id="field_{col.Key}"
                  type="text"
                  value={formData[col.Key] ?? ''}
                  oninput={(e) => formData[col.Key] = e.currentTarget.value}
                  disabled={saving || (!col.IncrementalRewritable && PROGRAM_DIALOG.mode === 'edit')}
                  class:readonly={!col.IncrementalRewritable && PROGRAM_DIALOG.mode === 'edit'}
                />
              {:else}
                <input
                  id="field_{col.Key}"
                  type="text"
                  value={formData[col.Key] ?? ''}
                  oninput={(e) => formData[col.Key] = e.currentTarget.value}
                  disabled={saving}
                />
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="modal-actions">
        <Button onClick={closeDialog} disabled={saving}>
          Zrušit
        </Button>
        <Button onClick={handleSave} primary disabled={saving}>
          {#if saving}
            Ukládám...
          {:else if PROGRAM_DIALOG.mode === 'edit'}
            Uložit změny
          {:else}
            Vytvořit
          {/if}
        </Button>
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
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .program-modal {
    background: var(--color-bg);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) var(--space-8);
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg-subtle);

    h2 {
      margin: 0;
      font-size: var(--font-size-xl);
      color: var(--color-text);
      font-weight: 600;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: none;
      border: none;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: background var(--transition-base);

      &:hover {
        background: var(--color-border-light);
      }
    }
  }

  .modal-content {
    padding: var(--space-8);
    flex: 1;
    overflow-y: auto;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6) var(--space-8);

    @media (max-width: 500px) {
      grid-template-columns: 1fr;
    }
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    label {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      font-size: var(--font-size-base);
      font-weight: 500;
      color: var(--color-text);
    }

    .badge {
      padding: var(--space-1) var(--space-4);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-2xs);
      font-weight: 600;
      text-transform: uppercase;

      &.incremental {
        background: var(--color-primary-light);
        color: var(--color-primary-dark);
      }
    }

    input {
      padding: var(--space-5) 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      font-size: var(--font-size-base);
      color: var(--color-text);
      transition: border-color var(--transition-base), box-shadow var(--transition-base);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }

      &:disabled {
        background: var(--color-bg-subtle);
        color: var(--color-text-secondary);
        cursor: not-allowed;
      }

      &.readonly {
        background: var(--color-bg-muted);
      }
    }
  }

  .file-editor-wrapper {
    position: relative;
    min-height: 60px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-8);
    border-top: 1px solid var(--color-border-light);
    background: var(--color-bg-subtle);
  }
</style>

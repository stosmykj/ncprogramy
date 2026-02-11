<script lang="ts">
  import { untrack } from 'svelte';
  import { TABLECOLUMNS } from '$lib/tableColumnProcessor.svelte';
  import {
    addProgram,
    updateProgram,
    generateIncrementalValue,
  } from '$lib/dataProcessor.svelte';
  import { PROGRAM_DIALOG } from '$lib/programDialogState.svelte';
  import { getSettingsByKey, addSettings, updateSettings } from '$lib/settingsProcessor.svelte';
  import { Settings } from '../models/settings';
  import { Program } from '../models/program';
  import { File } from '../models/file';
  import type { TableColumn } from '../models/tableColumn';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import DatePicker from './DatePicker.svelte';
  import FileEditor from './Editors/FileEditor.svelte';
  import GCodeFileEditor from './Editors/GCodeFileEditor.svelte';
  import { logger } from '$lib/logger';

  const LAYOUT_SETTINGS_KEY = 'dialog_field_layout';

  // Form data keyed by column key
  let formData = $state<Record<string, string | number | Date | File | null>>({});
  let saving = $state(false);
  let layoutMode = $state(false);
  let fieldLayout = $state<string[]>([]); // Ordered list of visible field keys
  let layoutLoaded = $state(false);
  let draggedKey = $state<string | null>(null);
  let dropTargetKey = $state<string | null>(null);
  let dropTargetSidebar = $state(false);

  // Get editable columns (exclude system, actions, computed columns)
  const editableColumns = $derived.by(() => {
    return TABLECOLUMNS.filter(
      (col) =>
        !['id', 'createdAt', 'updatedAt', 'actions'].includes(col.Key) &&
        col.Type !== 'computed'
    );
  });

  // Active fields based on layout order
  const activeFields = $derived.by(() => {
    if (!layoutLoaded || fieldLayout.length === 0) {
      return editableColumns;
    }
    return fieldLayout
      .map((key) => editableColumns.find((col) => col.Key === key))
      .filter((col): col is TableColumn => col !== undefined);
  });

  // Sidebar fields - editable columns not in the active layout
  const sidebarFields = $derived.by(() => {
    if (!layoutLoaded || fieldLayout.length === 0) return [];
    const activeKeys = new Set(fieldLayout);
    return editableColumns.filter((col) => !activeKeys.has(col.Key));
  });

  // Load field layout from settings
  async function loadFieldLayout() {
    try {
      const setting = await getSettingsByKey(LAYOUT_SETTINGS_KEY);
      if (setting?.Value) {
        const keys = JSON.parse(setting.Value) as string[];
        // Filter to only include keys that still exist as editable columns
        const validKeys = keys.filter((k) => editableColumns.some((col) => col.Key === k));
        fieldLayout = validKeys;
      }
    } catch (error) {
      logger.error('Failed to load field layout', error);
    }
    layoutLoaded = true;
  }

  // Save field layout to settings
  async function saveFieldLayout() {
    try {
      const existing = await getSettingsByKey(LAYOUT_SETTINGS_KEY);
      const value = JSON.stringify(fieldLayout);
      if (existing) {
        existing.Value = value;
        await updateSettings(existing);
      } else {
        const setting = new Settings({ key: LAYOUT_SETTINGS_KEY, type: 'json', value });
        await addSettings(setting);
      }
    } catch (error) {
      logger.error('Failed to save field layout', error);
    }
  }

  // Initialize form data when dialog opens
  let lastOpenState = false;
  let focusTimeout: number | null = null;
  $effect(() => {
    const isOpen = PROGRAM_DIALOG.isOpen;
    if (isOpen && !lastOpenState) {
      // Dialog just opened - initialize form and load layout
      untrack(() => {
        loadFieldLayout();
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
      // Dialog closing - clean up
      if (focusTimeout !== null) {
        clearTimeout(focusTimeout);
        focusTimeout = null;
      }
      layoutMode = false;
    }
    lastOpenState = isOpen;
  });

  function focusInput() {
    const focusColumn = PROGRAM_DIALOG.focusColumn;

    if (focusColumn) {
      const input = document.getElementById(`field_${focusColumn}`) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
      PROGRAM_DIALOG.focusColumn = null;
    } else {
      const firstCol = activeFields[0];
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
        const value = sourceProgram.get(col.Key);
        if (value instanceof File) {
          formData[col.Key] = value;
        } else if (value instanceof Date) {
          formData[col.Key] = value;
        } else if ((col.Type === 'date' || col.Type === 'datetime') && typeof value === 'string') {
          formData[col.Key] = value;
        } else if (typeof value === 'number') {
          formData[col.Key] = value;
        } else if (typeof value === 'string') {
          formData[col.Key] = value;
        } else {
          formData[col.Key] = null;
        }
      } else if (isCopying && sourceProgram) {
        if (col.Type === 'incremental' && col.IncrementalPattern) {
          try {
            formData[col.Key] = await generateIncrementalValue(col.IncrementalPattern, col.Key);
          } catch (e) {
            logger.error('Failed to generate incremental value', e);
            formData[col.Key] = '';
          }
        } else if (col.Copyable !== false) {
          const value = sourceProgram.get(col.Key);
          if (value instanceof File) {
            formData[col.Key] = value;
          } else if (value instanceof Date) {
            formData[col.Key] = value;
          } else if ((col.Type === 'date' || col.Type === 'datetime') && typeof value === 'string') {
            formData[col.Key] = value;
          } else if (typeof value === 'number') {
            formData[col.Key] = value;
          } else if (typeof value === 'string') {
            formData[col.Key] = value;
          } else {
            formData[col.Key] = null;
          }
        } else {
          formData[col.Key] = col.Type === 'number' ? null : '';
        }
      } else {
        if (col.Type === 'incremental' && col.IncrementalPattern) {
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

      // Set all form values to the program (use editableColumns to save all fields, not just visible)
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
    if (!PROGRAM_DIALOG.isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (layoutMode) {
        layoutMode = false;
      } else {
        closeDialog();
      }
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

  // --- Drag and Drop ---

  function handleDragStart(event: DragEvent, key: string) {
    draggedKey = key;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', key);
  }

  function handleDragOverField(event: DragEvent, targetKey: string) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    dropTargetKey = targetKey;
    dropTargetSidebar = false;
  }

  function handleDragOverSidebar(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    dropTargetKey = null;
    dropTargetSidebar = true;
  }

  function handleDragLeave() {
    dropTargetKey = null;
    dropTargetSidebar = false;
  }

  function handleDropOnField(event: DragEvent, targetKey: string) {
    event.preventDefault();
    dropTargetKey = null;
    dropTargetSidebar = false;
    if (!draggedKey || draggedKey === targetKey) {
      draggedKey = null;
      return;
    }

    // Ensure we have a layout to work with
    if (fieldLayout.length === 0) {
      fieldLayout = editableColumns.map((c) => c.Key);
    }

    const newLayout = fieldLayout.filter((k) => k !== draggedKey);
    const targetIndex = newLayout.indexOf(targetKey);
    if (targetIndex !== -1) {
      newLayout.splice(targetIndex, 0, draggedKey);
    } else {
      // Target is not in layout yet - add dragged before it
      newLayout.push(draggedKey);
    }

    // If dragged from sidebar, it's now added to layout
    if (!fieldLayout.includes(draggedKey)) {
      // Already handled by the splice above
    }

    fieldLayout = newLayout;
    draggedKey = null;
    void saveFieldLayout();
  }

  function handleDropOnSidebar(event: DragEvent) {
    event.preventDefault();
    dropTargetKey = null;
    dropTargetSidebar = false;
    if (!draggedKey) return;

    // Remove from active layout
    if (fieldLayout.length === 0) {
      fieldLayout = editableColumns.map((c) => c.Key);
    }
    fieldLayout = fieldLayout.filter((k) => k !== draggedKey);
    draggedKey = null;
    void saveFieldLayout();
  }

  function handleDragEnd() {
    draggedKey = null;
    dropTargetKey = null;
    dropTargetSidebar = false;
  }

  function addFieldToLayout(key: string) {
    if (fieldLayout.length === 0) {
      fieldLayout = editableColumns.map((c) => c.Key);
    }
    if (!fieldLayout.includes(key)) {
      fieldLayout = [...fieldLayout, key];
      void saveFieldLayout();
    }
  }

  function removeFieldFromLayout(key: string) {
    if (fieldLayout.length === 0) {
      fieldLayout = editableColumns.map((c) => c.Key);
    }
    fieldLayout = fieldLayout.filter((k) => k !== key);
    void saveFieldLayout();
  }

  function resetLayout() {
    fieldLayout = [];
    void saveFieldLayout();
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if PROGRAM_DIALOG.isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeDialog}>
    <div class="program-modal" class:with-sidebar={layoutMode} onclick={(e) => e.stopPropagation()}>
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
        <div class="header-actions">
          <button
            class="layout-btn"
            class:active={layoutMode}
            onclick={() => { layoutMode = !layoutMode; }}
            title={layoutMode ? 'Ukončit úpravu rozložení' : 'Upravit rozložení polí'}
          >
            <Icon name={layoutMode ? 'mdiCheck' : 'mdiViewDashboardEdit'} size={20} color={layoutMode ? 'var(--color-success)' : 'var(--color-text-secondary)'} />
          </button>
          <button class="close-btn" onclick={closeDialog} title="Zavřít (Esc)">
            <Icon name="mdiClose" size={24} color="var(--color-text-secondary)" />
          </button>
        </div>
      </div>

      <div class="modal-body">
        <div class="modal-content">
          {#if layoutMode}
            <div class="layout-hint">
              <Icon name="mdiInformationOutline" size={16} color="var(--color-primary)" />
              <span>Přetáhněte pole pro změnu pořadí. Přetáhněte do postranního panelu pro skrytí.</span>
            </div>
          {/if}
          <div class="form-grid">
            {#each activeFields as col (col.Key)}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="form-field"
                class:dragging={draggedKey === col.Key}
                class:drop-target={dropTargetKey === col.Key}
                class:layout-mode={layoutMode}
                draggable={layoutMode ? 'true' : 'false'}
                ondragstart={(e) => handleDragStart(e, col.Key)}
                ondragover={(e) => handleDragOverField(e, col.Key)}
                ondragleave={handleDragLeave}
                ondrop={(e) => handleDropOnField(e, col.Key)}
                ondragend={handleDragEnd}
              >
                <label for="field_{col.Key}">
                  {#if layoutMode}
                    <span class="drag-handle">
                      <Icon name="mdiDragVertical" size={16} color="var(--color-text-muted)" />
                    </span>
                  {/if}
                  {getColumnLabel(col)}
                  {#if col.Type === 'incremental'}
                    <span class="badge incremental">Auto</span>
                  {/if}
                  {#if layoutMode}
                    <button class="remove-field-btn" onclick={() => removeFieldFromLayout(col.Key)} title="Skrýt pole">
                      <Icon name="mdiClose" size={14} color="var(--color-text-muted)" />
                    </button>
                  {/if}
                </label>

                {#if !layoutMode}
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
                {:else}
                  <div class="field-placeholder">
                    <span class="field-type-badge">{col.Type}</span>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        {#if layoutMode}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="sidebar"
            class:drop-highlight={dropTargetSidebar}
            ondragover={handleDragOverSidebar}
            ondragleave={handleDragLeave}
            ondrop={handleDropOnSidebar}
          >
            <div class="sidebar-header">
              <span class="sidebar-title">Skrytá pole</span>
              <button class="reset-btn" onclick={resetLayout} title="Obnovit výchozí rozložení">
                <Icon name="mdiRestore" size={16} color="var(--color-text-secondary)" />
                <span>Reset</span>
              </button>
            </div>
            <div class="sidebar-fields">
              {#if sidebarFields.length === 0}
                <div class="sidebar-empty">
                  <Icon name="mdiCheckAll" size={24} color="var(--color-text-muted)" />
                  <span>Všechna pole jsou zobrazena</span>
                </div>
              {:else}
                {#each sidebarFields as col (col.Key)}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="sidebar-field"
                    draggable="true"
                    ondragstart={(e) => handleDragStart(e, col.Key)}
                    ondragend={handleDragEnd}
                  >
                    <Icon name="mdiDragVertical" size={14} color="var(--color-text-muted)" />
                    <span class="sidebar-field-label">{getColumnLabel(col)}</span>
                    <span class="sidebar-field-type">{col.Type}</span>
                    <button class="add-field-btn" onclick={() => addFieldToLayout(col.Key)} title="Zobrazit pole">
                      <Icon name="mdiPlus" size={14} color="var(--color-primary)" />
                    </button>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-actions">
        <Button onClick={closeDialog} disabled={saving}>
          Zrušit
        </Button>
        <Button onClick={handleSave} primary disabled={saving || layoutMode}>
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
    transition: max-width var(--transition-base);

    &.with-sidebar {
      max-width: 1050px;
    }
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .layout-btn, .close-btn {
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

      &.active {
        background: var(--color-success-light, rgba(40, 167, 69, 0.1));
      }
    }
  }

  .modal-body {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .modal-content {
    padding: var(--space-8);
    flex: 1;
    overflow-y: auto;
    min-width: 0;
  }

  .layout-hint {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    margin-bottom: var(--space-6);
    background: var(--color-primary-lighter, rgba(40, 85, 151, 0.06));
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
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
    transition: all var(--transition-fast);
    border-radius: var(--radius-lg);

    &.layout-mode {
      padding: var(--space-4);
      border: 1px dashed var(--color-border);
      cursor: grab;

      &:hover {
        border-color: var(--color-primary);
        background: rgba(40, 85, 151, 0.02);
      }
    }

    &.dragging {
      opacity: 0.4;
    }

    &.drop-target {
      border-color: var(--color-primary);
      background: rgba(40, 85, 151, 0.06);
      box-shadow: inset 0 0 0 2px var(--color-primary);
    }

    label {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--font-size-base);
      font-weight: 500;
      color: var(--color-text);
    }

    .drag-handle {
      display: flex;
      cursor: grab;
      opacity: 0.5;
    }

    .remove-field-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      width: 22px;
      height: 22px;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-danger-light);
        border-color: var(--color-danger);
      }
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

    .field-placeholder {
      padding: var(--space-4);
      background: var(--color-bg-subtle);
      border-radius: var(--radius-md);
      text-align: center;

      .field-type-badge {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        text-transform: uppercase;
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

  // Sidebar
  .sidebar {
    width: 220px;
    flex-shrink: 0;
    border-left: 1px solid var(--color-border-light);
    background: var(--color-bg-subtle);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    transition: background var(--transition-fast);

    &.drop-highlight {
      background: rgba(40, 85, 151, 0.06);
    }
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6);
    border-bottom: 1px solid var(--color-border-lighter);

    .sidebar-title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
    }

    .reset-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-2xs);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-bg);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }
    }
  }

  .sidebar-fields {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .sidebar-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8) var(--space-4);
    text-align: center;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .sidebar-field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
    border: 1px solid var(--color-border-lighter);
    border-radius: var(--radius-md);
    cursor: grab;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }

    .sidebar-field-label {
      flex: 1;
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-field-type {
      font-size: var(--font-size-2xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .add-field-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      flex-shrink: 0;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-light);
        border-color: var(--color-primary);
      }
    }
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

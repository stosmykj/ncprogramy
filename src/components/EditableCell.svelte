<script lang="ts">
  import type { Program } from '../models/program';
  import type { TableColumn } from '../models/tableColumn';
  import { updateProgram, PROGRAMS } from '$lib/dataProcessor.svelte';
  import { File } from '../models/file';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import FileEditor from './Editors/FileEditor.svelte';
  import GCodeFileEditor from './Editors/GCodeFileEditor.svelte';
  import TextEditor from './Editors/TextEditor.svelte';
  import NumberEditor from './Editors/NumberEditor.svelte';
  import DateEditor from './Editors/DateEditor.svelte';
  import DateTimeEditor from './Editors/DateTimeEditor.svelte';
  import { logger } from '$lib/logger';

  const { program, header }: { program: Program; header: TableColumn } = $props();

  let editValue = $state<string | number | File | null | Date>(null);
  let dateValue = $state<Date | null>(null);
  let fileValue = $state<File | null>(null);
  let suggestions = $state<string[]>([]);

  $effect(() => {
    const currentValue = program.get(header.Key);
    if (currentValue instanceof File) {
      fileValue = currentValue;
    } else if (header.Type === 'date' || header.Type === 'datetime') {
      // Handle date/datetime columns - convert string to Date if needed
      if (currentValue instanceof Date) {
        dateValue = currentValue;
      } else if (typeof currentValue === 'string' && currentValue) {
        const parsedDate = new Date(currentValue);
        dateValue = isNaN(parsedDate.getTime()) ? null : parsedDate;
      } else {
        dateValue = null;
      }
    } else if (typeof currentValue === 'number') {
      editValue = currentValue.toString();
    } else if (typeof currentValue === 'string' || currentValue instanceof Date) {
      editValue = currentValue;
    } else {
      editValue = null;
    }

    // Prepare suggestions for text fields
    if (header.Type === 'string') {
      prepareSuggestions();
    }
  });

  function prepareSuggestions() {
    const key = header.Key;
    const uniqueValues = new Set<string>();

    for (const p of PROGRAMS) {
      const value = p.get(key);
      if (typeof value === 'string' && value) {
        uniqueValues.add(value);
      }
    }

    suggestions = Array.from(uniqueValues).slice(0, 10);
  }

  async function handleSave(value?: string | number | Date | File | null) {
    if (!DATA_VARS.isEditing) return;

    try {
      const key = header.Key;

      if (value === undefined || value === null || value === '') {
        program.set(key, undefined);
        await updateProgram(program);
        return;
      }

      if (header.Type === 'number') {
        const numValue = parseFloat(value as string);
        if (!isNaN(numValue)) {
          program.set(key, numValue);
        }
      } else if (header.Type === 'date' || header.Type === 'datetime') {
        if (value && value instanceof Date) {
          program.set(key, new Date(value));
        } else {
          program.set(key, undefined);
        }
      } else if ((header.Type === 'file' || header.Type === 'gcode') && value instanceof File) {
        const currentFile = new File({
          extension: value.Extension,
          name: value.Name,
          path: value.Path,
        });
        program.set(key, currentFile);
      } else if (header.Type === 'string') {
        program.set(key, value);
      }
      await updateProgram(program);
    } catch (error) {
      logger.error('Failed to save edit', error);
    } finally {
      DATA_VARS.isEditing = false;
    }
  }

  function handleCancel() {
    DATA_VARS.isEditing = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Prevent Tab except for date/datetime editors where it's needed for navigation
    if (e.key === 'Tab' && header.Type !== 'date' && header.Type !== 'datetime') {
      e.preventDefault();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="editable-cell" class:file={header.Type === 'file' || header.Type === 'gcode'} onkeydown={handleKeyDown}>
  {#if header.Type === 'number' && (typeof editValue === 'string' || editValue === null)}
    <NumberEditor bind:value={editValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if header.Type === 'date'}
    <DateEditor bind:value={dateValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if header.Type === 'datetime'}
    <DateTimeEditor bind:value={dateValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if header.Type === 'file' && (fileValue instanceof File || fileValue === null)}
    <FileEditor bind:value={fileValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if header.Type === 'gcode' && (fileValue instanceof File || fileValue === null)}
    <GCodeFileEditor bind:value={fileValue} programId={program.Id} columnKey={header.Key} onSave={handleSave} onCancel={handleCancel} />
  {:else if typeof editValue === 'string' || editValue === null}
    <TextEditor bind:value={editValue} {suggestions} onSave={handleSave} onCancel={handleCancel} />
  {/if}
</div>

<style lang="scss">
  .editable-cell {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% + 30px);
    min-height: calc(100% + 12px);
    background: var(--color-bg);
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    z-index: 10;

    &.file {
      left: 50%;
      width: 375px;
      min-height: calc(100% + 2.5rem);
    }
  }
</style>

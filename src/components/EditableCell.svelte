<script lang="ts">
  import type { Program } from '../models/program';
  import type { TableColumn } from '../models/tableColumn';
  import { updateProgram, PROGRAMS } from '$lib/dataProcessor.svelte';
  import { File } from '../models/file';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import FileEditor from './Editors/FileEditor.svelte';
  import TextEditor from './Editors/TextEditor.svelte';
  import NumberEditor from './Editors/NumberEditor.svelte';
  import DateEditor from './Editors/DateEditor.svelte';
  import DateTimeEditor from './Editors/DateTimeEditor.svelte';
  import TextAreaEditor from './Editors/TextAreaEditor.svelte';

  const { program, header }: { program: Program; header: TableColumn } = $props();

  let editValue = $state<string | number | File | null | Date>(null);
  let fileValue = $state<File | null>(null);
  let suggestions = $state<string[]>([]);

  $effect(() => {
    const currentValue = program[header.Key as keyof Program];
    if (currentValue instanceof File) {
      fileValue = currentValue;
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
    const key = header.Key as keyof Program;
    const uniqueValues = new Set<string>();

    for (const p of PROGRAMS) {
      const value = p[key];
      if (typeof value === 'string' && value) {
        uniqueValues.add(value);
      }
    }

    suggestions = Array.from(uniqueValues).slice(0, 10);
  }

  // Validation rules based on database schema
  const requiredFields = ['programId'];
  const nonNegativeFields = ['count', 'preparing', 'programing', 'machineWorking'];

  const isRequired = requiredFields.includes(String(header.Key));
  const isNonNegative = nonNegativeFields.includes(String(header.Key));

  async function handleSave(value?: string | number | Date | File | null) {
    if (!DATA_VARS.isEditing) return;

    try {
      const key = header.Key as keyof Program;

      if (!value) {
        program[key] = undefined;
        await updateProgram(program);
        return;
      }

      if (header.Type === 'number') {
        const numValue = parseFloat(value as string);
        if (!isNaN(numValue)) {
          program[key] = numValue;
        }
      } else if (header.Type === 'date' || header.Type === 'datetime') {
        if (value && value instanceof Date) {
          program[key] = new Date(value);
        } else {
          program[key] = undefined;
        }
      } else if (header.Type === 'file' && value instanceof File) {
        const currentFile = new File({
          extension: value.Extension,
          name: value.Name,
          path: value.Path,
        });
        program[key] = currentFile;
      } else if (header.Type === 'string') {
        program[key] = value;
      }
      await updateProgram(program);
    } catch (error) {
      console.error('Failed to save edit:', error);
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
<div class="editable-cell" class:file={header.Type === 'file'} onkeydown={handleKeyDown}>
  {#if header.Type === 'string' && String(header.Key) === 'note' && (typeof editValue === 'string' || editValue === null)}
    <TextAreaEditor bind:value={editValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if header.Type === 'number' && (typeof editValue === 'number' || editValue === null)}
    <NumberEditor
      bind:value={editValue}
      onSave={handleSave}
      onCancel={handleCancel}
      min={isNonNegative ? 0 : undefined}
    />
  {:else if header.Type === 'date' && (editValue instanceof Date || editValue === null)}
    <DateEditor bind:value={editValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if header.Type === 'datetime' && (editValue instanceof Date || editValue === null)}
    <DateTimeEditor bind:value={editValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if header.Type === 'file' && (editValue instanceof File || editValue === null)}
    <FileEditor bind:value={fileValue} onSave={handleSave} onCancel={handleCancel} />
  {:else if typeof editValue === 'string' || editValue === null}
    <TextEditor
      bind:value={editValue}
      {suggestions}
      onSave={handleSave}
      onCancel={handleCancel}
      required={isRequired}
    />
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
    background: #fff;
    border: 2px solid #285597;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;

    &.file {
      left: 50%;
      width: 375px;
      min-height: calc(100% + 40px);
    }
  }
</style>

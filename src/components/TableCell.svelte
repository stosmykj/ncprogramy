<script lang="ts">
  import type { Program } from '../models/program';
  import type { TableColumn } from '../models/tableColumn';
  import { DATA_VARS, getDisplayValue, removeProgram } from '$lib/dataProcessor.svelte';
  import type { BodyContextMenuData } from '../interfaces/BodyContextMenuData';
  import EditableCell from './EditableCell.svelte';
  import FilePreview from './FilePreview.svelte';
  import Button from './Button.svelte';
  import { confirm } from '@tauri-apps/plugin-dialog';
  import { File } from '../models/file';
  import { buildStyleString, getCellStyles } from '$lib/formattingProcessor.svelte';

  let {
    program,
    header,
    focused,
    position,
    cxMenuData = $bindable(),
  }: {
    program: Program;
    header: TableColumn;
    focused: boolean;
    position: { column: number; row: number };
    cxMenuData: BodyContextMenuData;
  } = $props();

  let columnWidth = $state(document.querySelector(`#header_${header.Key}`)?.clientWidth);
  const editable = !['actions', 'id', 'createdAt', 'editedAt', 'totalTime'].includes(header.Key);
  let showFilePreview = $state(false);
  let cellElement: HTMLElement | null = $state(null);
  let hoverTimeout: number | null = $state(null);
  let filePreviewRef: FilePreview | null = $state(null);

  const cellStyles = getCellStyles(program, header.Key);
  const isFileColumn = $derived(header.Type === 'file');
  const fileValue = $derived(
    isFileColumn && program[header.Key as keyof Program] instanceof File
      ? (program[header.Key as keyof Program] as File)
      : null
  );

  $effect(() => {
    if (focused && !editable && DATA_VARS.isEditing) {
      DATA_VARS.isEditing = false;
    }
  });

  $effect(() => {
    if (header.Width) {
      columnWidth = document.querySelector(`#header_${header.Key}`)?.clientWidth;
    }
  });

  // Close file preview when cell loses focus
  $effect(() => {
    if (!focused && !hoverTimeout && showFilePreview) {
      showFilePreview = false;
    }
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (!focused || DATA_VARS.isEditing) return;

    // Space toggles file preview for file columns
    if (event.key === ' ' && isFileColumn && fileValue) {
      event.preventDefault();
      showFilePreview = !showFilePreview;
      return;
    }

    // Keyboard shortcuts when file preview is open
    if (showFilePreview && filePreviewRef) {
      switch (event.key.toLowerCase()) {
        case 'p':
          event.preventDefault();
          filePreviewRef.openFullPreview();
          break;
        case 'o':
          event.preventDefault();
          filePreviewRef.openFile();
          break;
        case 'f':
          event.preventDefault();
          filePreviewRef.openFileLocation();
          break;
        case 'escape':
          event.preventDefault();
          showFilePreview = false;
          break;
      }
    }
  }

  function changeFocus() {
    if (header.Key === 'actions' || DATA_VARS.isEditing) {
      return;
    }

    DATA_VARS.columnPosition = position.column;
    DATA_VARS.rowPosition = position.row;

    cxMenuData.opened = false;
  }

  function toggleContextMenu(e: MouseEvent) {
    if (!e.shiftKey) {
      e.preventDefault();
    }
    changeFocus();
    cxMenuData.cursorPosition.x = e.pageX;
    cxMenuData.cursorPosition.y = e.pageY;
    cxMenuData.opened = true;
  }

  function handleDoubleClick() {
    if (editable) {
      // If editing a different cell, close it first by updating focus
      if (DATA_VARS.isEditing && !focused) {
        DATA_VARS.isEditing = false;
        // Change focus to this cell
        DATA_VARS.columnPosition = position.column;
        DATA_VARS.rowPosition = position.row;
        cxMenuData.opened = false;
      }
      // Enter edit mode
      DATA_VARS.isEditing = true;
    }
  }

  async function tryDeleteItem() {
    const result = await confirm('Opravdu smazat program?', {
      title: `Smazání programu č. ${program.ProgramId}`,
      kind: 'warning',
    });
    if (result) {
      await removeProgram(program);
    }
  }

  function handleMouseEnter() {
    if (isFileColumn && fileValue && !DATA_VARS.isEditing) {
      hoverTimeout = window.setTimeout(() => {
        console.log('mouse enter');
        showFilePreview = true;
      }, 500);
    }
  }

  function handleMouseLeave() {
    if (hoverTimeout) {
      console.log('mouse leave');
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    showFilePreview = false;
  }
</script>

<td
  bind:this={cellElement}
  id="cell_{position.row}_{position.column}"
  class:focused
  class:editable
  class:editing={DATA_VARS.isEditing && focused}
  class:preview={showFilePreview}
  data-name={header.Key}
  style="width: {columnWidth}px; {buildStyleString(cellStyles)}"
  onclick={changeFocus}
  ondblclick={handleDoubleClick}
  oncontextmenu={toggleContextMenu}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="gridcell"
  tabindex={focused ? 0 : -1}
  aria-label={header.Key === 'actions' ? 'Akce' : getDisplayValue(program, header)}
  aria-readonly={!editable}
  aria-selected={focused}
>
  <div class="content" style="justify-content: ${header.Align};">
    {#if header.Key === 'actions'}
      <Button icon="mdiTrashCan" onClick={tryDeleteItem} danger onlyIcon></Button>
    {:else}
      {getDisplayValue(program, header)}
    {/if}
  </div>
  {#if DATA_VARS.isEditing && focused}
    <EditableCell {program} {header} />
  {/if}
  {#if showFilePreview && fileValue}
    <FilePreview file={fileValue} anchorElement={cellElement} bind:this={filePreviewRef} />
  {/if}
</td>

<svelte:window onkeydown={handleKeyDown} />

<style lang="scss">
  $primary-color: #4a90e2;
  $border-color: #a8a8a8;

  td {
    display: flex;
    position: relative;
    width: 100%;
    height: 2rem;
    padding: 0 0.5rem;
    text-align: left;
    align-items: center;
    white-space: nowrap;
    border-right: 1px solid $border-color;
    overflow: hidden;

    &:first-of-type {
      padding: 0;
    }

    &.preview {
      overflow: unset;
    }

    &.focused {
      border: 2px solid $border-color;
      &.editable {
        border: 2px solid $primary-color;
        background: rgba($primary-color, 0.05);
      }
    }

    &.editing {
      overflow: unset;
      z-index: 2;
    }

    .content {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  }
</style>

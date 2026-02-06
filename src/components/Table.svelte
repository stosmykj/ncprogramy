<script lang="ts">
  import TableRow from './TableRow.svelte';
  import { onMount } from 'svelte';
  import { getPrograms, PROGRAMS, DATA_VARS, removeProgram } from '$lib/dataProcessor.svelte';
  import TableHeader from './TableHeader.svelte';
  import { writeText as clipWrite } from '@tauri-apps/plugin-clipboard-manager';
  import type { BodyContextMenuData } from '../interfaces/BodyContextMenuData';
  import Icon from './Icon.svelte';
  import { initTableColumns, TABLECOLUMNS } from '$lib/tableColumnProcessor.svelte';
  import { initFormattingRules } from '$lib/formattingProcessor.svelte';
  import ProgramDialog from './ProgramDialog.svelte';
  import { PROGRAM_DIALOG } from '$lib/programDialogState.svelte';
  import { confirm } from '@tauri-apps/plugin-dialog';

  let page: number = $state(1);
  let pageSize: number = $state(50);
  let tableRef: HTMLTableElement | null = $state(null);

  let tableBodyContextMenuData: BodyContextMenuData = $state({
    opened: false,
    key: null,
    row: 0,
    column: 0,
    cursorPosition: { x: 0, y: 0 },
  });

  const pages: number = $derived(Math.ceil(DATA_VARS.count / pageSize));
  const visiblePages: Array<number | string> = $derived.by(() => {
    let avPages = [];
    for (let i = 0; i < pages; i++) {
      if (i < 3 || (i > page - 4 && i < page + 2) || i > pages - 4) {
        avPages.push(i);
      } else {
        avPages.push('d');
      }
    }
    let indexPage = avPages.indexOf(page);
    let sliced = avPages.slice(0, indexPage);
    let sliced1 = avPages.slice(indexPage);
    return [
      ...sliced.filter((v, i, a) => a.indexOf(v) == i),
      ...sliced1.filter((v, i, a) => a.indexOf(v) == i),
    ];
  });

  const visibleColumns = $derived.by(() => {
    return TABLECOLUMNS.filter((header) => header.Visible);
  });

  // Get the currently focused program
  const focusedProgram = $derived.by(() => {
    if (DATA_VARS.rowPosition >= 0 && DATA_VARS.rowPosition < PROGRAMS.length) {
      return PROGRAMS[DATA_VARS.rowPosition];
    }
    return null;
  });

  async function pageChange(pageNumber: number) {
    page = pageNumber;
    DATA_VARS.reloadData = true;
  }

  async function refreshData() {
    const newPrograms = await getPrograms(page, pageSize);
    PROGRAMS.splice(0, PROGRAMS.length, ...newPrograms);
    DATA_VARS.refresh = {};
  }

  $effect(() => {
    if (DATA_VARS.reloadData) {
      DATA_VARS.reloadData = false;
      refreshData();
    }
  });

  onMount(async () => {
    PROGRAMS.splice(0, PROGRAMS.length);
    PROGRAMS.push(...(await getPrograms(page, pageSize)));
    await initTableColumns();
    await initFormattingRules();
  });

  async function processKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const isInputElement = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

    // Don't process if dialog is open
    if (PROGRAM_DIALOG.isOpen) {
      return;
    }

    // Allow Ctrl+N to work even when an input is focused
    if (event.ctrlKey && event.key === 'n') {
      newRow(event);
      return;
    }

    // Block other keys when an input element is focused (unless editing a table cell)
    if (isInputElement && !DATA_VARS.isEditing) {
      return;
    }

    changeCellPosition(event.key);
    handleEdit(event);
    await copyContent(event);
  }

  function changeCellPosition(key: string) {
    if (DATA_VARS.isEditing) {
      return;
    }

    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
    if (!isArrowKey) {
      return;
    }

    switch (key) {
      case 'ArrowUp':
        DATA_VARS.rowPosition -= DATA_VARS.rowPosition > 0 ? 1 : 0;
        break;
      case 'ArrowDown':
        DATA_VARS.rowPosition += DATA_VARS.rowPosition < PROGRAMS.length - 1 ? 1 : 0;
        break;
      case 'ArrowLeft':
        DATA_VARS.columnPosition -= DATA_VARS.columnPosition > 0 ? 1 : 0;
        break;
      case 'ArrowRight':
        DATA_VARS.columnPosition += DATA_VARS.columnPosition < visibleColumns.length - 1 ? 1 : 0;
        break;
    }

    // Scroll when cell is near the edge of visible area
    requestAnimationFrame(() => {
      scrollCellIntoViewIfNeeded();
    });
  }

  function scrollCellIntoViewIfNeeded() {
    if (!tableRef) return;

    const cell = document.getElementById(
      `cell_${DATA_VARS.rowPosition}_${DATA_VARS.columnPosition}`
    );
    if (!cell) return;

    const edgeThreshold = 50; // pixels from edge to trigger scroll
    const tableRect = tableRef.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    // Get thead height to account for sticky header
    const thead = tableRef.querySelector('thead');
    const theadHeight = thead ? thead.getBoundingClientRect().height : 0;

    // Vertical scrolling
    const visibleTop = tableRect.top + theadHeight;
    const visibleBottom = tableRect.bottom;

    if (cellRect.top < visibleTop + edgeThreshold) {
      // Cell is near or above the top edge
      tableRef.scrollTop -= visibleTop + edgeThreshold - cellRect.top;
    } else if (cellRect.bottom > visibleBottom - edgeThreshold) {
      // Cell is near or below the bottom edge
      tableRef.scrollTop += cellRect.bottom - (visibleBottom - edgeThreshold);
    }

    // Horizontal scrolling
    if (cellRect.left < tableRect.left + edgeThreshold) {
      // Cell is near or past the left edge
      tableRef.scrollLeft -= tableRect.left + edgeThreshold - cellRect.left;
    } else if (cellRect.right > tableRect.right - edgeThreshold) {
      // Cell is near or past the right edge
      tableRef.scrollLeft += cellRect.right - (tableRect.right - edgeThreshold);
    }
  }

  async function copyContent(event: KeyboardEvent) {
    if (!event.ctrlKey || event.key !== 'c') {
      return;
    }

    await copyCurrentCell();
  }

  async function copyCurrentCell() {
    const elm = document.getElementById(
      `cell_${DATA_VARS.rowPosition}_${DATA_VARS.columnPosition}`
    );

    if (elm?.textContent) {
      await clipWrite(elm.textContent);
    }
    tableBodyContextMenuData.opened = false;
  }

  function handleEdit(event: KeyboardEvent, force: boolean = false) {
    if (event.key !== 'Enter' && !force) {
      return;
    }
    // Ctrl+Enter opens edit dialog, don't start inline editing
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    DATA_VARS.isEditing = true;
  }

  function newRow(event: KeyboardEvent) {
    if (event.key !== 'n' || !event.ctrlKey) {
      return;
    }

    event.preventDefault();
    // Open program dialog in create mode
    PROGRAM_DIALOG.mode = 'create';
    PROGRAM_DIALOG.program = null;
    PROGRAM_DIALOG.isOpen = true;
  }

  // Row action functions for context menu
  function openEditDialog() {
    if (!focusedProgram) return;
    PROGRAM_DIALOG.mode = 'edit';
    PROGRAM_DIALOG.program = focusedProgram;
    // Focus the column that was selected when context menu was opened
    PROGRAM_DIALOG.focusColumn = visibleColumns[DATA_VARS.columnPosition]?.Key ?? null;
    PROGRAM_DIALOG.isOpen = true;
    tableBodyContextMenuData.opened = false;
  }

  function openCopyDialog() {
    if (!focusedProgram) return;
    PROGRAM_DIALOG.mode = 'create';
    PROGRAM_DIALOG.program = focusedProgram; // Pass source for copying
    PROGRAM_DIALOG.isOpen = true;
    tableBodyContextMenuData.opened = false;
  }

  async function deleteRow() {
    // Capture reference before async operation to avoid stale derived value
    const programToDelete = focusedProgram;
    if (!programToDelete) return;
    tableBodyContextMenuData.opened = false;

    const result = await confirm('Opravdu smazat záznam?', {
      title: `Smazání záznamu #${programToDelete.Id}`,
      kind: 'warning',
    });
    if (result) {
      await removeProgram(programToDelete);
    }
  }

  function closeContextMenu() {
    tableBodyContextMenuData.opened = false;
  }
</script>

<svelte:window
  onkeydown={processKeyDown}
  onclick={() => (tableBodyContextMenuData.opened = false)}
/>

<table role="grid" bind:this={tableRef}>
  <thead>
    <tr>
      {#each visibleColumns as header}
        <TableHeader {header} />
      {/each}
    </tr>
  </thead>
  <tbody>
    {#if visibleColumns.length !== 0}
      {#key DATA_VARS.refresh}
        {#each PROGRAMS as program, i}
          <TableRow
            {program}
            headers={visibleColumns}
            index={i}
            bind:cxMenuData={tableBodyContextMenuData}
          />
        {/each}
      {/key}
    {:else}
      <tr>
        <td colspan={visibleColumns.length} role="gridcell"> Žádné záznamy </td>
      </tr>
    {/if}
  </tbody>
</table>
<div class="table-foot" role="navigation">
  <div class="pages" role="group">
    {#each visiblePages as pageNumber}
      {#if typeof pageNumber !== 'string'}
        <button
          class="page"
          class:selected={pageNumber + 1 == page}
          onclick={() => pageChange(pageNumber + 1)}
        >
          {pageNumber + 1}
        </button>
      {:else}
        <button class="page divide" disabled>...</button>
      {/if}
    {/each}
  </div>
  <div class="info" role="status" aria-live="polite">
    Záznamů: {PROGRAMS.length} / {DATA_VARS.count}
  </div>
</div>
{#if tableBodyContextMenuData.opened && focusedProgram}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="context-menu-overlay" onclick={closeContextMenu}></div>
  <div
    class="context-menu"
    style="top: {tableBodyContextMenuData.cursorPosition.y}px; left: {tableBodyContextMenuData.cursorPosition.x}px;"
    role="menu"
  >
    <button class="menu-item" onclick={openEditDialog}>
      <Icon name="mdiPencil" size={16} color="var(--color-text)" />
      <span>Upravit</span>
      <span class="shortcut">Enter</span>
    </button>
    <button class="menu-item" onclick={openCopyDialog}>
      <Icon name="mdiContentCopy" size={16} color="var(--color-text)" />
      <span>Duplikovat</span>
      <span class="shortcut">Ctrl+D</span>
    </button>
    <button class="menu-item" onclick={copyCurrentCell}>
      <Icon name="mdiContentSave" size={16} color="var(--color-text)" />
      <span>Kopírovat hodnotu</span>
      <span class="shortcut">Ctrl+C</span>
    </button>
    <div class="menu-divider"></div>
    <button class="menu-item danger" onclick={deleteRow}>
      <Icon name="mdiTrashCan" size={16} color="#dc2626" />
      <span>Smazat</span>
      <span class="shortcut">Del</span>
    </button>
  </div>
{/if}

<ProgramDialog />

<style lang="scss">
  table {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100vh - var(--topbar-height) - var(--table-footer-height));
    border-collapse: separate;
    border-spacing: 0;
    overflow-y: auto;
    overflow-x: auto;
  }

  thead {
    background: var(--color-primary);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    color: var(--color-text-on-primary);

    tr {
      display: flex;
      min-width: max-content;
    }
  }

  .table-foot {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    height: var(--table-footer-height);
    font-size: var(--font-size-sm);
    background: var(--color-primary);
    color: var(--color-text-on-primary);

    .pages {
      display: flex;
      min-width: 1rem;
      margin: var(--space-3) var(--space-2);

      .page {
        margin: 0 var(--space-1);
        background: transparent;
        border: none;
        color: #8aa4cc;
        font-size: var(--font-size-sm);

        &.selected {
          font-size: var(--font-size-base);
          color: var(--color-text-on-primary);
          font-weight: 600;
        }

        &:hover {
          cursor: pointer;
          color: var(--color-text-on-primary);
        }
      }
    }

    .info {
      display: flex;
      align-items: center;
      margin: 0 var(--space-6);
    }
  }

  .context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-overlay);
  }

  .context-menu {
    position: fixed;
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: var(--space-2);
    min-width: 170px;
    z-index: var(--z-modal);
    animation: fadeIn var(--transition-fast);

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      border: none;
      background: none;
      font-size: var(--font-size-sm);
      color: var(--color-text);
      cursor: pointer;
      border-radius: var(--radius-sm);
      text-align: left;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-bg-muted);
      }

      &.danger {
        color: var(--color-danger);

        &:hover {
          background: var(--color-danger-light);
        }
      }

      .shortcut {
        margin-left: auto;
        font-size: var(--font-size-2xs);
        color: var(--color-text-muted);
      }
    }

    .menu-divider {
      height: 1px;
      background: var(--color-border-light);
      margin: var(--space-2) 0;
    }
  }
</style>

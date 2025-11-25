<script lang="ts">
  import TableRow from './TableRow.svelte';
  import { onMount } from 'svelte';
  import {
    getPrograms,
    PROGRAMS,
    DATA_VARS,
    findCurrentYearLastItem,
    addProgram,
  } from '$lib/dataProcessor.svelte';
  import TableHeader from './TableHeader.svelte';
  import { writeText as clipWrite } from '@tauri-apps/plugin-clipboard-manager';
  import type { BodyContextMenuData } from '../interfaces/BodyContextMenuData';
  import Button from './Button.svelte';
  import { slide } from 'svelte/transition';
  import { initTableColumns, TABLECOLUMNS } from '$lib/tableColumnProcessor.svelte';
  import { initFormattingRules } from '$lib/formattingProcessor.svelte';
  import { Program } from '../models/program';
  import KeyboardShortcut from './KeyboardShortcut.svelte';

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

  const visibleColumns = $derived(TABLECOLUMNS.filter((header) => header.Visible));

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

    if (isInputElement && !DATA_VARS.isEditing) {
      return;
    }

    changeCellPosition(event.key);
    handleEdit(event);
    await newRow(event);
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
        DATA_VARS.columnPosition -= DATA_VARS.columnPosition > 1 ? 1 : 0;
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

  async function copyContent(event: KeyboardEvent, force: boolean = false) {
    if (!event.ctrlKey || (event.key !== 'c' && !force)) {
      return;
    }

    const elm = document.getElementById(
      `cell_${DATA_VARS.rowPosition}_${DATA_VARS.columnPosition}`
    );

    if (elm?.textContent) {
      await clipWrite(elm.textContent);
    }
  }

  function handleEdit(event: KeyboardEvent, force: boolean = false) {
    if (event.key !== 'Enter' && !force) {
      return;
    }
    DATA_VARS.isEditing = true;
  }

  async function newRow(event: KeyboardEvent) {
    if (event.key !== 'n' || !event.ctrlKey) {
      return;
    }

    const yy = new Date().getFullYear().toString().substring(2, 4);
    const lastItem = await findCurrentYearLastItem();

    const programId = lastItem !== null ? (Number(lastItem.ProgramId) + 1).toString() : yy + '001';
    addProgram(new Program({ programId: programId }));
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
{#if tableBodyContextMenuData.opened}
  <div
    class="body-cx-menu"
    style="top: {tableBodyContextMenuData.cursorPosition.y}px; left: {tableBodyContextMenuData
      .cursorPosition.x}px;"
    transition:slide={{ duration: 250 }}
    role="menu"
  >
    <Button onClick={(e: KeyboardEvent) => handleEdit(e, true)} primary>
      <span class="text">Upravit</span><KeyboardShortcut keys="Enter" /></Button
    >
    <Button onClick={(e: KeyboardEvent) => copyContent(e, true)} primary>
      <span class="text">Kopírovat</span><KeyboardShortcut keys="Ctrl+C" /></Button
    >
  </div>
{/if}

<style lang="scss">
  $primary-bg: #285597;

  table {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100vh - 7rem);
    border-collapse: separate;
    border-spacing: 0;
    overflow-y: auto;
    overflow-x: auto;
  }

  thead {
    background: $primary-bg;
    position: sticky;
    top: 0;
    z-index: 1;
    color: #fff;

    tr {
      display: flex;
      min-width: max-content;
    }

    .checkbox-header {
      width: 50px;
      flex-shrink: 0;
      background: $primary-bg;
    }
  }

  .table-foot {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    height: 3rem;
    font-size: 1.2rem;
    background: $primary-bg;
    color: #fff;
    .pages {
      display: flex;
      min-width: 1rem;
      margin: 0.8rem 0.4rem;
      .page {
        margin: 0 0.3rem;
        background: transparent;
        border: none;
        color: #8aa4cc;
        font-size: 1.2rem;
        &.selected {
          font-size: 1.3rem;
          color: #fff;
        }
        &:hover {
          cursor: pointer;
          color: #fff;
        }
      }
    }
    .info {
      display: flex;
      margin: 0.8rem;
    }
  }
  .body-cx-menu {
    position: absolute;
    display: flex;
    flex-direction: column;
    top: 0;
    left: 0;
    height: auto;
    padding: 10px;
    background: #183868;
    border-radius: 1rem;
    box-shadow: 0.25rem 0.2rem 0.7rem #444;
    z-index: 1;
    transition: 0.2s;

    .text {
      margin-right: 20px;
    }
  }
</style>

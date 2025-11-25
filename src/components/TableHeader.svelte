<script lang="ts">
  import type { TableColumn } from '../models/tableColumn';
  import { toggleSort, updateTableColumn } from '$lib/tableColumnProcessor.svelte';
  import FilterPopover from './FilterPopover.svelte';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import Button from './Button.svelte';
  import { logger } from '$lib/logger';

  const { header = $bindable() }: { header: TableColumn } = $props();

  let columnWidth = $state(0);
  let expectedColumnWidth = $state(0);
  let isColumnWidthInitialized = $state(false);
  let pad: Array<ResizeObserverSize> = $state([]);
  let filterPopoverOpen = $state(false);
  let headerElement: HTMLElement | null = $state(null);
  let isResizing = $state(false);
  let resizeStartX = $state(0);
  let resizeStartWidth = $state(0);
  let isDragging = $state(false);
  let showDropIndicator = $state(false);
  let newWidth: number | null = $state(null);

  $effect(() => {
    if (!pad.length) return;

    if (columnWidth !== expectedColumnWidth && !isColumnWidthInitialized) {
      expectedColumnWidth = pad[0].blockSize;
      isColumnWidthInitialized = true;
    }
  });

  async function changeSort(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Don't sort if clicking filter button or resize handle
    if (target.closest('.filter-button') || target.closest('.resize-handle') || isResizing) {
      return;
    }

    await toggleSort(header.Key);
    DATA_VARS.reloadData = true;
  }

  function toggleFilterPopover(event: MouseEvent) {
    event.stopPropagation();
    filterPopoverOpen = !filterPopoverOpen;
  }

  // Resize functionality
  function startResize(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    isResizing = true;
    resizeStartX = event.clientX;
    resizeStartWidth = typeof header.Width === 'number' ? header.Width : columnWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      const diff = e.clientX - resizeStartX;
      newWidth = Math.max(50, resizeStartWidth + diff);
      header.Width = newWidth;

      // Apply cursor globally during resize
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseUp = async () => {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Save to database
      try {
        await updateTableColumn(header);
      } catch (error) {
        logger.error('Failed to save column width', error);
      } finally {
        newWidth = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Drag and drop for reordering
  function handleDragStart(event: DragEvent) {
    if (header.Key === 'actions') return;
    isDragging = true;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', header.Key);
  }

  function handleDragOver(event: DragEvent) {
    if (header.Key === 'actions') return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    showDropIndicator = true;
  }

  function handleDragLeave() {
    showDropIndicator = false;
  }

  async function handleDrop(event: DragEvent) {
    if (header.Key === 'actions') return;
    event.preventDefault();
    showDropIndicator = false;

    const draggedKey = event.dataTransfer!.getData('text/plain');
    if (draggedKey === header.Key) return;

    // Reorder columns
    const { TABLECOLUMNS } = await import('$lib/tableColumnProcessor.svelte');
    const draggedIndex = TABLECOLUMNS.findIndex((col) => col.Key === draggedKey);
    const targetIndex = TABLECOLUMNS.findIndex((col) => col.Key === header.Key);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedColumn] = TABLECOLUMNS.splice(draggedIndex, 1);
    TABLECOLUMNS.splice(targetIndex, 0, draggedColumn);

    // Update positions in database
    try {
      const { getDatabase } = await import('$lib/database');
      const db = await getDatabase();

      for (let i = 0; i < TABLECOLUMNS.length; i++) {
        TABLECOLUMNS[i].Position = i;
        await db.execute('UPDATE table_columns SET position = $1 WHERE key = $2', [
          i,
          TABLECOLUMNS[i].Key,
        ]);
      }

      DATA_VARS.refresh = true;
    } catch (error) {
      logger.error('Failed to save column order', error);
    }
  }

  function handleDragEnd() {
    isDragging = false;
  }
</script>

{#if header.Key === 'actions'}
  <th
    bind:clientWidth={columnWidth}
    bind:borderBoxSize={pad}
    id="header_{header.Key}"
    class="actions"
    role="columnheader"
    scope="col"
    aria-label="Akce"
  >
  </th>
{:else}
  <th
    bind:this={headerElement}
    bind:clientWidth={columnWidth}
    bind:borderBoxSize={pad}
    id="header_{header.Key}"
    style="width: {header.Width === 'auto' ? 'auto' : `${newWidth ?? header.Width}px`}"
    role="columnheader"
    scope="col"
    aria-label={header.Label || header.Key}
    aria-sort={header.Sort === 1 ? 'ascending' : header.Sort === -1 ? 'descending' : 'none'}
    draggable="true"
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    ondragend={handleDragEnd}
    class:dragging={isDragging}
    class:drop-target={showDropIndicator}
  >
    <div class="header-content">
      <div class="title-row">
        <span class="title">{header.Label || header.Key}</span>
      </div>
      <div class="actions-row">
        <Button
          class="sort-button"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            changeSort(e);
          }}
          icon={header.Sort === 1
            ? 'mdiChevronDown'
            : header.Sort === -1
              ? 'mdiChevronUp'
              : 'mdiUnfoldMoreHorizontal'}
          iconColor="#fff"
          color="#fff"
          style="background: {header.Sort !== 0
            ? '#22aa44'
            : 'none'}; padding: 3px; border: none; height: 22px;"
        >
          {#if header.SortPosition > 0}<span class="sort-number">{header.SortPosition}</span>{/if}
        </Button>

        <Button
          class="filter-button"
          warning={!!header.Filter}
          primary={!header.Filter}
          onClick={toggleFilterPopover}
          icon={header.Filter ? 'mdiFilter' : 'mdiFilterOutline'}
          onlyIcon={!!header.Filter}
        />
      </div>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="resize-handle" onmousedown={startResize}></div>
  </th>

  <FilterPopover column={header} bind:isOpen={filterPopoverOpen} anchorElement={headerElement} />
{/if}

<style lang="scss">
  $border-color: #dfe3e8;

  th {
    position: relative;
    height: 3.5rem;
    padding: 0.3rem 0.5rem;
    font-weight: bold;
    background: #285597;
    color: white;
    user-select: none;
    cursor: grab;
    transition: background-color 0.2s;

    &:hover {
      background: #1e4177;
    }

    &:active {
      cursor: grabbing;
    }

    &.dragging {
      opacity: 0.5;
      cursor: grabbing;
    }

    &.drop-target {
      background: #1e4177;
      box-shadow: inset 3px 0 0 #4a90e2;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 1px;
        background: #4a90e2;
        animation: pulse 0.8s ease-in-out infinite;
      }
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
        transform: scaleX(1);
      }
      50% {
        opacity: 0.7;
        transform: scaleX(1.5);
      }
    }

    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 1px;
      height: 100%;
      background: #fff;
    }

    &.actions {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      padding: 0;
    }

    .header-content {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      gap: 2px;
    }

    .title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 24px;

      .title {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
      }
    }

    .actions-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }

    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 3px;
      height: 3.5rem;
      cursor: col-resize;
      z-index: 2;

      &:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.9);
      }
    }
  }
</style>

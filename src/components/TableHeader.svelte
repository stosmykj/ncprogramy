<script lang="ts">
  import type { TableColumn } from '../models/tableColumn';
  import { toggleSort, updateTableColumn, clearSort } from '$lib/tableColumnProcessor.svelte';
  import FilterPopover from './FilterPopover.svelte';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import Icon from './Icon.svelte';
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
  let showContextMenu = $state(false);
  let contextMenuPos = $state({ x: 0, y: 0 });

  // Tooltip text for sort badge
  const sortTooltip = $derived.by(() => {
    if (header.Sort === 0) return '';
    const direction = header.Sort === 1 ? 'Vzestupně' : 'Sestupně';
    const position = header.SortPosition > 0 ? ` (pořadí ${header.SortPosition})` : '';
    return `Řazení: ${direction}${position}`;
  });

  // Tooltip text for filter badge
  const filterTooltip = $derived.by(() => {
    if (!header.Filter) return '';
    return `Filtr aktivní`;
  });

  $effect(() => {
    if (!pad.length) return;

    if (columnWidth !== expectedColumnWidth && !isColumnWidthInitialized) {
      expectedColumnWidth = pad[0].blockSize;
      isColumnWidthInitialized = true;
    }
  });

  async function handleSort() {
    if (!header.Sortable) return;
    await toggleSort(header.Key);
    DATA_VARS.reloadData = true;
    showContextMenu = false;
  }

  async function handleClearSort() {
    await clearSort(header.Key);
    DATA_VARS.reloadData = true;
    showContextMenu = false;
  }

  function openFilterPopover() {
    filterPopoverOpen = true;
    showContextMenu = false;
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    contextMenuPos = { x: event.clientX, y: event.clientY };
    showContextMenu = true;
  }

  function closeContextMenu() {
    showContextMenu = false;
  }

  // Click on header to toggle sort (simple click)
  async function handleHeaderClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.resize-handle') || isResizing) return;
    if (!header.Sortable) return;

    await toggleSort(header.Key);
    DATA_VARS.reloadData = true;
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
      newWidth = Math.max(40, resizeStartWidth + diff);
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

<!-- svelte-ignore a11y_click_events_have_key_events -->
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
    onclick={handleHeaderClick}
    oncontextmenu={handleContextMenu}
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    ondragend={handleDragEnd}
    class:dragging={isDragging}
    class:drop-target={showDropIndicator}
    class:sorted={header.Sort !== 0}
    class:filtered={!!header.Filter}
  >
    <div class="header-content">
      <span class="title">{header.Label || header.Key}</span>

      <!-- Indicator badges - positioned at the end -->
      {#if header.Sort !== 0 || header.Filter}
        <div class="indicators">
          {#if header.Sort !== 0}
            <span class="indicator sort-indicator" title={sortTooltip}>
              <Icon
                name={header.Sort === 1 ? 'mdiArrowDown' : 'mdiArrowUp'}
                size={10}
                color="#22aa44"
              />
              {#if header.SortPosition > 0}
                <span class="indicator-number">{header.SortPosition}</span>
              {/if}
            </span>
          {/if}
          {#if header.Filter}
            <span class="indicator filter-indicator" title={filterTooltip}>
              <Icon name="mdiFilter" size={8} color="#f59e0b" />
            </span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="resize-handle" onmousedown={startResize}></div>
  </th>

  <!-- Context Menu -->
  {#if showContextMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="context-menu-overlay" onclick={closeContextMenu}></div>
    <div
      class="context-menu"
      style="top: {contextMenuPos.y}px; left: {contextMenuPos.x}px;"
    >
      {#if header.Sortable}
        <button class="menu-item" onclick={handleSort}>
          <Icon
            name={header.Sort === 0 ? 'mdiSortAscending' : header.Sort === 1 ? 'mdiSortDescending' : 'mdiSortAscending'}
            size={16}
            color="var(--color-text)"
          />
          <span>
            {#if header.Sort === 0}
              Seřadit vzestupně
            {:else if header.Sort === 1}
              Seřadit sestupně
            {:else}
              Seřadit vzestupně
            {/if}
          </span>
        </button>
        {#if header.Sort !== 0}
          <button class="menu-item" onclick={handleClearSort}>
            <Icon name="mdiSortVariantRemove" size={16} color="var(--color-text)" />
            <span>Zrušit řazení</span>
          </button>
        {/if}
        <div class="menu-divider"></div>
      {/if}
      <button class="menu-item" onclick={openFilterPopover}>
        <Icon name={header.Filter ? 'mdiFilterOff' : 'mdiFilter'} size={16} color="var(--color-text)" />
        <span>{header.Filter ? 'Upravit filtr' : 'Filtrovat'}</span>
      </button>
    </div>
  {/if}

  <FilterPopover column={header} bind:isOpen={filterPopoverOpen} anchorElement={headerElement} />

<style lang="scss">
  th {
    position: relative;
    height: var(--table-header-height);
    padding: 0 var(--space-3);
    font-weight: 600;
    background: var(--color-primary);
    color: var(--color-text-on-primary);
    user-select: none;
    cursor: pointer;
    transition: background-color var(--transition-base);

    &:hover {
      background: var(--color-primary-hover);
    }

    &.dragging {
      opacity: 0.5;
      cursor: grabbing;
    }

    &.drop-target {
      background: var(--color-primary-hover);
      box-shadow: inset 3px 0 0 var(--color-primary-light);
    }

    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 1px;
      height: 100%;
      background: rgba(255, 255, 255, 0.25);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: var(--space-1);
      min-width: 0;
    }

    .title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
      text-align: center;
    }

    .indicators {
      display: flex;
      align-items: center;
      gap: 1px;
      flex-shrink: 0;
    }

    .indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 1px;
      line-height: 1;

      .indicator-number {
        font-size: 0.5rem;
        font-weight: 700;
        color: var(--color-success);
      }
    }

    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: var(--space-2);
      height: 100%;
      cursor: col-resize;
      z-index: 2;

      &:hover {
        background: rgba(255, 255, 255, 0.5);
      }
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
    min-width: 150px;
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
    }

    .menu-divider {
      height: 1px;
      background: var(--color-border-light);
      margin: var(--space-2) 0;
    }
  }
</style>

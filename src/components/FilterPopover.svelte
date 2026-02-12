<script lang="ts">
  import type { TableColumn } from '../models/tableColumn';
  import { applyFilter } from '$lib/tableColumnProcessor.svelte';
  import Button from './Button.svelte';
  import DatePicker from './DatePicker.svelte';
  import { logger } from '$lib/logger';
  import { format } from 'date-fns';

  let {
    column,
    isOpen = $bindable(),
    anchorElement,
  }: {
    column: TableColumn;
    isOpen: boolean;
    anchorElement: HTMLElement | null;
  } = $props();

  type FilterOperator =
    | 'contains'
    | 'equals'
    | 'notEquals'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'between'
    | 'empty'
    | 'notEmpty';

  let filterOperator = $state<FilterOperator>(getDefaultOperator());
  let filterValue = $state<Date | string | null>(null);
  let filterValue2 = $state<Date | string | null>(null);
  let position = $state({ top: 0, left: 0 });
  let justOpened = $state(false);

  // Parse existing filter when opening
  $effect(() => {
    if (column.Filter) {
      const parsed = parseFilter(column.Filter);
      filterOperator = parsed.operator;
      filterValue = parsed.value;
      filterValue2 = parsed.value2;
    } else {
      filterOperator = getDefaultOperator();
      filterValue = null;
      filterValue2 = null;
    }
  });

  $effect(() => {
    if (isOpen && anchorElement) {
      updatePosition();
      // Skip the first click-outside check to prevent immediate closing
      // when opened from a context menu button
      justOpened = true;
      requestAnimationFrame(() => {
        justOpened = false;
      });
    }
  });

  function getDefaultOperator() {
    return ['number', 'date'].includes(column.Type) ? 'equals' : 'contains';
  }

  function parseFilter(filter: string): {
    operator: FilterOperator;
    value: string | Date | null;
    value2: string | Date | null;
  } {
    const isDateType = column.Type === 'date' || column.Type === 'datetime';
    const parseValue = (val: string) => (isDateType ? new Date(val) : val);

    // Parse filter string to extract operator and values
    switch (true) {
      case filter === 'empty:':
        return { operator: 'empty', value: null, value2: null };
      case filter === 'notEmpty:':
        return { operator: 'notEmpty', value: null, value2: null };
      case filter.startsWith('>=:'):
        return { operator: 'gte', value: parseValue(filter.slice(3)), value2: null };
      case filter.startsWith('<=:'):
        return { operator: 'lte', value: parseValue(filter.slice(3)), value2: null };
      case filter.startsWith('!=:'):
        return { operator: 'notEquals', value: parseValue(filter.slice(3)), value2: null };
      case filter.startsWith('>:'):
        return { operator: 'gt', value: parseValue(filter.slice(2)), value2: null };
      case filter.startsWith('<:'):
        return { operator: 'lt', value: parseValue(filter.slice(2)), value2: null };
      case filter.startsWith('=:'):
        return { operator: 'equals', value: parseValue(filter.slice(2)), value2: null };
      case filter.startsWith('between:'): {
        const values = filter.slice(8).split(':');
        return {
          operator: 'between',
          value: values[0] ? parseValue(values[0]) : null,
          value2: values[1] ? parseValue(values[1]) : null,
        };
      }
      default:
        return { operator: 'contains', value: filter, value2: null };
    }
  }

  function buildFilterString(): string {
    const toString = (val: Date | string | null) =>
      val instanceof Date ? format(val, 'yyyy-MM-dd') : val;
    // Build filter string with operator prefix
    if (filterOperator === 'empty') {
      return 'empty:';
    } else if (filterOperator === 'notEmpty') {
      return 'notEmpty:';
    } else if (
      filterOperator === 'between' &&
      filterValue instanceof Date &&
      filterValue2 instanceof Date
    ) {
      return `between:${toString(filterValue)}:${toString(filterValue2)}`;
    } else if (filterOperator === 'equals') {
      return `=:${toString(filterValue)}`;
    } else if (filterOperator === 'notEquals') {
      return `!=:${toString(filterValue)}`;
    } else if (filterOperator === 'gt') {
      return `>:${toString(filterValue)}`;
    } else if (filterOperator === 'gte') {
      return `>=:${toString(filterValue)}`;
    } else if (filterOperator === 'lt') {
      return `<:${toString(filterValue)}`;
    } else if (filterOperator === 'lte') {
      return `<=:${toString(filterValue)}`;
    }
    return toString(filterValue) ?? '';
  }

  function getAvailableOperators(): Array<{ value: FilterOperator; label: string }> {
    const type = column.Type;

    if (type === 'number') {
      return [
        { value: 'equals', label: 'Rovná se' },
        { value: 'notEquals', label: 'Nerovná se' },
        { value: 'gt', label: 'Větší než' },
        { value: 'gte', label: 'Větší nebo rovno' },
        { value: 'lt', label: 'Menší než' },
        { value: 'lte', label: 'Menší nebo rovno' },
        { value: 'between', label: 'Mezi' },
        { value: 'empty', label: 'Prázdné' },
        { value: 'notEmpty', label: 'Není prázdné' },
      ];
    } else if (type === 'date' || type === 'datetime') {
      return [
        { value: 'equals', label: 'Rovná se' },
        { value: 'notEquals', label: 'Nerovná se' },
        { value: 'gt', label: 'Po' },
        { value: 'gte', label: 'Po nebo v' },
        { value: 'lt', label: 'Před' },
        { value: 'lte', label: 'Před nebo v' },
        { value: 'between', label: 'Mezi' },
        { value: 'empty', label: 'Prázdné' },
        { value: 'notEmpty', label: 'Není prázdné' },
      ];
    } else {
      return [
        { value: 'contains', label: 'Obsahuje' },
        { value: 'equals', label: 'Rovná se' },
        { value: 'notEquals', label: 'Nerovná se' },
        { value: 'empty', label: 'Prázdné' },
        { value: 'notEmpty', label: 'Není prázdné' },
      ];
    }
  }

  function updatePosition() {
    if (!anchorElement) return;

    const rect = anchorElement.getBoundingClientRect();
    position = {
      top: 70,
      left: rect.left + window.scrollX,
    };
  }

  async function handleApply() {
    try {
      const filterString = buildFilterString();
      await applyFilter(column.Key, filterString || undefined);
      isOpen = false;
    } catch (error) {
      logger.error('Failed to apply filter', error);
    }
  }

  async function handleClear() {
    try {
      filterValue = '';
      filterValue2 = '';
      filterOperator = column.Type === 'number' ? 'equals' : 'contains';
      await applyFilter(column.Key, undefined);
      isOpen = false;
    } catch (error) {
      logger.error('Failed to clear filter', error);
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (!isOpen || !anchorElement || justOpened) return;

    const target = event.target as Node;
    const popover = document.querySelector('.filter-popover');

    if (popover && !popover.contains(target) && !anchorElement.contains(target)) {
      isOpen = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleApply();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      isOpen = false;
    }
  }

  function getInputType(): string {
    if (column.Type === 'date') return 'date';
    if (column.Type === 'datetime') return 'datetime-local';
    if (column.Type === 'number') return 'number';
    return 'text';
  }

  function needsInput(): boolean {
    return filterOperator !== 'empty' && filterOperator !== 'notEmpty';
  }

  function needsTwoInputs(): boolean {
    return filterOperator === 'between';
  }
</script>

<svelte:window onclick={handleClickOutside} />

{#if isOpen}
  <div
    class="filter-popover"
    style="top: {position.top}px; left: {position.left}px;"
    role="dialog"
    aria-label="Filtr pro {column.Label || column.Key}"
  >
    <div class="filter-header">
      <span class="filter-title">
        {column.Label || column.Key}
      </span>
      <Button onClick={() => (isOpen = false)} icon="mdiClose" onlyIcon />
    </div>

    <div class="filter-body">
      <div class="operator-select">
        <label for="operator-{column.Key}">Operátor:</label>
        <select id="operator-{column.Key}" bind:value={filterOperator} class="filter-select">
          {#each getAvailableOperators() as op}
            <option value={op.value}>{op.label}</option>
          {/each}
        </select>
      </div>

      {#if needsInput()}
        {#if column.Type === 'date' && typeof filterValue !== 'string' && typeof filterValue2 !== 'string'}
          <DatePicker bind:value={filterValue} type="date" class="filter-input" />
          {#if needsTwoInputs()}
            <div class="between-separator">a</div>
            <DatePicker bind:value={filterValue2} type="date" class="filter-input" />
          {/if}
        {:else if column.Type === 'datetime' && typeof filterValue !== 'string' && typeof filterValue2 !== 'string'}
          <DatePicker bind:value={filterValue} type="datetime" class="filter-input" />
          {#if needsTwoInputs()}
            <div class="between-separator">a</div>
            <DatePicker bind:value={filterValue2} type="datetime" class="filter-input" />
          {/if}
        {:else}
          <input
            type={getInputType()}
            class="filter-input"
            bind:value={filterValue}
            onkeydown={handleKeydown}
            placeholder="Zadejte hodnotu..."
          />
          {#if needsTwoInputs()}
            <div class="between-separator">a</div>
            <input
              type={getInputType()}
              class="filter-input"
              bind:value={filterValue2}
              onkeydown={handleKeydown}
              placeholder="Konečná hodnota..."
            />
          {/if}
        {/if}
      {/if}

      {#if filterOperator === 'contains'}
        <div class="filter-hint">
          <small>Tip: Použijte * jako zástupný znak</small>
        </div>
      {/if}
    </div>

    <div class="filter-footer">
      <Button onClick={handleClear}>Vymazat</Button>
      <Button onClick={handleApply} primary>Použít</Button>
    </div>
  </div>
{/if}

<style lang="scss">
  .filter-popover {
    position: absolute;
    z-index: var(--z-modal);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    width: 260px;
    animation: slideDown var(--transition-base);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-lighter);

    .filter-title {
      font-weight: 600;
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }

  }

  .filter-body {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);

    .operator-select {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);

      label {
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--color-text);
      }
    }

    .filter-select {
      width: 100%;
      padding: var(--input-padding);
      border: var(--input-border);
      border-radius: var(--input-radius);
      font-size: var(--font-size-sm);
      font-family: inherit;
      background: var(--color-bg);
      cursor: pointer;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }
    }

    .filter-input {
      width: 100%;
      padding: var(--input-padding);
      border: var(--input-border);
      border-radius: var(--input-radius);
      font-size: var(--font-size-sm);
      font-family: inherit;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }

      &::placeholder {
        color: var(--color-text-muted);
      }
    }

    .between-separator {
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: calc(-1 * var(--space-2)) 0;
    }

    .filter-hint {
      margin-top: -4px;
      color: var(--color-text-secondary);
      font-size: var(--font-size-xs);
    }
  }

  .filter-footer {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-lighter);
    justify-content: flex-end;
  }
</style>

<script lang="ts">
  import type { TableColumn } from '../models/tableColumn';
  import { applyFilter } from '$lib/tableColumnProcessor.svelte';
  import Button from './Button.svelte';
  import DatePicker from './DatePicker.svelte';
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
    const filterString = buildFilterString();
    await applyFilter(column.Key, filterString || undefined);
    isOpen = false;
  }

  async function handleClear() {
    filterValue = '';
    filterValue2 = '';
    filterOperator = column.Type === 'number' ? 'equals' : 'contains';
    await applyFilter(column.Key, undefined);
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (isOpen && anchorElement) {
      const target = event.target as Node;
      const popover = document.querySelector('.filter-popover');

      if (popover && !popover.contains(target) && !anchorElement.contains(target)) {
        isOpen = false;
      }
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
    z-index: 1000;
    background: white;
    border: 1px solid #d0d5dd;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 280px;
    animation: slideDown 0.15s ease-out;
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
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #eaecf0;

    .filter-title {
      font-weight: 600;
      font-size: 0.875rem;
      color: #101828;
    }

    .close-button {
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      border: none;
      background: transparent;
      color: #667085;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      border-radius: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: #f2f4f7;
        color: #344054;
      }
    }
  }

  .filter-body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    .operator-select {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: #344054;
      }
    }

    .filter-select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d0d5dd;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: inherit;
      background: white;
      cursor: pointer;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }
    }

    .filter-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d0d5dd;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: inherit;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }

      &::placeholder {
        color: #98a2b3;
      }
    }

    .between-separator {
      text-align: center;
      font-size: 0.8125rem;
      color: #667085;
      margin: -0.375rem 0;
    }

    .filter-hint {
      margin-top: -4px;
      color: #667085;
      font-size: 0.75rem;
    }
  }

  .filter-footer {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid #eaecf0;
    justify-content: flex-end;

    .btn {
      padding: 0.5rem 0.875rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid;
      transition: all 0.15s ease;

      &:active {
        transform: scale(0.98);
      }
    }

    .btn-secondary {
      background: white;
      border-color: #d0d5dd;
      color: #344054;

      &:hover {
        background: #f9fafb;
        border-color: #98a2b3;
      }
    }

    .btn-primary {
      background: #4a90e2;
      border-color: #4a90e2;
      color: white;

      &:hover {
        background: #3b7bc7;
        border-color: #3b7bc7;
      }
    }
  }
</style>

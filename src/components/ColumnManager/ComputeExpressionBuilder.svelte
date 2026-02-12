<script lang="ts">
  import { TABLECOLUMNS } from '$lib/tableColumnProcessor.svelte';
  import { logger } from '$lib/logger';

  let { expression = $bindable(''), columnKey }: { expression?: string; columnKey?: string } =
    $props();

  type ExpressionPart = {
    type: 'column' | 'operator' | 'constant' | 'function';
    value: string;
    useCoalesce?: boolean;
    coalesceDefault?: string;
    isComputed?: boolean;
    computeExpression?: string;
  };

  type ValidationError = {
    message: string;
    indices: number[];
  };

  let parts = $state<ExpressionPart[]>([]);
  let parseError = $state<string | null>(null);
  let lastParsedExpression = $state('');
  let validationErrors = $state<ValidationError[]>([]);

  function validateExpression(): ValidationError[] {
    const errors: ValidationError[] = [];

    if (parts.length === 0) {
      errors.push({ message: 'Výraz je prázdný', indices: [] });
      return errors;
    }

    // Check for unbalanced parentheses
    let parenCount = 0;
    const unmatchedOpenParens: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.type === 'function' && part.value === '(') {
        parenCount++;
        unmatchedOpenParens.push(i);
      }
      if (part.type === 'function' && part.value === ')') {
        parenCount--;
        if (parenCount >= 0) {
          unmatchedOpenParens.pop();
        } else {
          errors.push({
            message: 'Zavírací závorka bez odpovídající otevírací závorky',
            indices: [i],
          });
          parenCount = 0;
        }
      }
    }
    if (unmatchedOpenParens.length > 0) {
      errors.push({
        message: `Neuzavřené závorky: chybí ${unmatchedOpenParens.length} zavírací ${unmatchedOpenParens.length === 1 ? 'závorka' : 'závorky'}`,
        indices: unmatchedOpenParens,
      });
    }

    // Check first element - should not be an operator (except open paren)
    const firstPart = parts[0];
    if (firstPart.type === 'operator') {
      errors.push({ message: 'Výraz nemůže začínat operátorem', indices: [0] });
    }
    if (firstPart.type === 'function' && firstPart.value === ')') {
      errors.push({ message: 'Výraz nemůže začínat zavírací závorkou', indices: [0] });
    }

    // Check last element - should not be an operator (except close paren)
    const lastIndex = parts.length - 1;
    const lastPart = parts[lastIndex];
    if (lastPart.type === 'operator') {
      errors.push({ message: 'Výraz nemůže končit operátorem', indices: [lastIndex] });
    }
    if (lastPart.type === 'function' && lastPart.value === '(') {
      errors.push({ message: 'Výraz nemůže končit otevírací závorkou', indices: [lastIndex] });
    }

    // Check for consecutive operators and other pair issues
    for (let i = 0; i < parts.length - 1; i++) {
      const current = parts[i];
      const next = parts[i + 1];

      if (current.type === 'operator' && next.type === 'operator') {
        errors.push({
          message: `Dva operátory za sebou: "${current.value}" a "${next.value}"`,
          indices: [i, i + 1],
        });
      }

      // Check for missing operator between values
      const isValue = (p: ExpressionPart) => p.type === 'column' || p.type === 'constant';
      if (isValue(current) && isValue(next)) {
        errors.push({ message: 'Chybí operátor mezi hodnotami', indices: [i, i + 1] });
      }

      // Check for operator after open paren
      if (current.type === 'function' && current.value === '(' && next.type === 'operator') {
        errors.push({
          message: 'Operátor nemůže následovat hned po otevírací závorce',
          indices: [i, i + 1],
        });
      }

      // Check for operator before close paren
      if (current.type === 'operator' && next.type === 'function' && next.value === ')') {
        errors.push({
          message: 'Operátor nemůže být těsně před zavírací závorkou',
          indices: [i, i + 1],
        });
      }

      // Check for empty parentheses
      if (
        current.type === 'function' &&
        current.value === '(' &&
        next.type === 'function' &&
        next.value === ')'
      ) {
        errors.push({ message: 'Prázdné závorky', indices: [i, i + 1] });
      }
    }

    // Check for division by zero
    for (let i = 0; i < parts.length - 1; i++) {
      if (
        parts[i].type === 'operator' &&
        parts[i].value === '/' &&
        parts[i + 1].type === 'constant' &&
        parseFloat(parts[i + 1].value) === 0
      ) {
        errors.push({ message: 'Dělení nulou', indices: [i, i + 1] });
      }
    }

    // Check for empty constants
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.type === 'constant' && (part.value === '' || isNaN(parseFloat(part.value)))) {
        errors.push({ message: 'Konstanta musí být platné číslo', indices: [i] });
      }
    }

    return errors;
  }

  const isValid = $derived(validationErrors.length === 0 && parts.length > 0);
  const errorIndices = $derived(new Set(validationErrors.flatMap((e) => e.indices)));

  const availableColumns = $derived(
    TABLECOLUMNS.filter(
      (col) =>
        col.Key !== 'actions' &&
        (col.Type === 'number' || col.Type === 'computed') &&
        col.Key !== columnKey
    )
  );

  const columnKeys = $derived(availableColumns.map((col) => col.Key));

  $effect(() => {
    if (expression && expression !== lastParsedExpression) {
      parseExpression(expression);
      lastParsedExpression = expression;
    }
  });

  $effect(() => {
    if (parts.length > 0 && lastParsedExpression) {
      expression = generateExpression();
    }
    validationErrors = validateExpression();
  });

  function parseExpression(expr: string) {
    try {
      const parsed: ExpressionPart[] = [];
      let remaining = expr.trim();

      while (remaining.length > 0) {
        remaining = remaining.trim();

        const coalesceMatch = remaining.match(/^COALESCE\s*\(\s*(\w+)\s*,\s*([^)]+)\)/i);
        if (coalesceMatch) {
          const columnName = coalesceMatch[1];
          const defaultValue = coalesceMatch[2].trim();

          if (columnKeys.includes(columnName)) {
            parsed.push({
              type: 'column',
              value: columnName,
              useCoalesce: true,
              coalesceDefault: defaultValue,
            });
          } else {
            throw new Error(`Unknown column: ${columnName}`);
          }

          remaining = remaining.slice(coalesceMatch[0].length);
          continue;
        }

        let foundColumn = false;
        for (const colKey of columnKeys) {
          if (remaining.startsWith(colKey)) {
            parsed.push({
              type: 'column',
              value: colKey,
              useCoalesce: true,
              coalesceDefault: '0',
            });
            remaining = remaining.slice(colKey.length);
            foundColumn = true;
            break;
          }
        }
        if (foundColumn) continue;

        const operatorMatch = remaining.match(/^\s*([+\-*/])\s*/);
        if (operatorMatch) {
          parsed.push({
            type: 'operator',
            value: operatorMatch[1],
          });
          remaining = remaining.slice(operatorMatch[0].length);
          continue;
        }

        if (remaining[0] === '(' || remaining[0] === ')') {
          parsed.push({
            type: 'function',
            value: remaining[0],
          });
          remaining = remaining.slice(1);
          continue;
        }

        const numberMatch = remaining.match(/^\s*(\d+(?:\.\d+)?)\s*/);
        if (numberMatch) {
          parsed.push({
            type: 'constant',
            value: numberMatch[1],
          });
          remaining = remaining.slice(numberMatch[0].length);
          continue;
        }

        throw new Error(`Cannot parse: "${remaining.slice(0, 20)}..."`);
      }

      parts = parsed;
      parseError = null;
    } catch (error) {
      logger.error('Failed to parse expression', error);
      parseError = error instanceof Error ? error.message : 'Nepodařilo se analyzovat výraz';
      parts = [];
    }
  }

  function generateExpression(): string {
    return parts
      .map((part) => {
        if (part.type === 'column') {
          if (part.isComputed && part.computeExpression) {
            // Wrap computed column expression in parentheses
            return `(${part.computeExpression})`;
          } else if (part.useCoalesce) {
            return `COALESCE(${part.value}, ${part.coalesceDefault || 0})`;
          }
          return part.value;
        } else if (part.type === 'operator') {
          return ` ${part.value} `;
        } else if (part.type === 'constant') {
          return part.value;
        } else if (part.type === 'function') {
          return part.value;
        }
        return '';
      })
      .join('');
  }

  function addColumn(columnKey: string) {
    const column = TABLECOLUMNS.find((col) => col.Key === columnKey);
    if (!column) return;

    const isComputed = (column.Type as string) === 'computed';

    parts.push({
      type: 'column',
      value: columnKey,
      useCoalesce: !isComputed,
      coalesceDefault: '0',
      isComputed: isComputed,
      computeExpression: isComputed ? column.ComputeExpression : undefined,
    });
    parts = [...parts];
  }

  function addOperator(op: string) {
    parts.push({
      type: 'operator',
      value: op,
    });
    parts = [...parts];
  }

  function addConstant() {
    parts.push({
      type: 'constant',
      value: '0',
    });
    parts = [...parts];
  }

  function addParenthesis(type: 'open' | 'close') {
    parts.push({
      type: 'function',
      value: type === 'open' ? '(' : ')',
    });
    parts = [...parts];
  }

  function removePart(index: number) {
    parts.splice(index, 1);
    parts = [...parts];
  }

  function updatePartValue(index: number, value: string) {
    parts[index].value = value;
    parts = [...parts];
  }

  // Drag and drop state
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let isOverTrash = $state(false);

  function handleDragStart(index: number, e: DragEvent) {
    draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
    isOverTrash = false;
  }

  function handleDragOver(index: number, e: DragEvent) {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      dragOverIndex = index;
    }
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(index: number, e: DragEvent) {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      const draggedPart = parts[draggedIndex];
      parts.splice(draggedIndex, 1);
      const newIndex = draggedIndex < index ? index - 1 : index;
      parts.splice(newIndex, 0, draggedPart);
      parts = [...parts];
    }
    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleTrashDragOver(e: DragEvent) {
    e.preventDefault();
    isOverTrash = true;
  }

  function handleTrashDragLeave() {
    isOverTrash = false;
  }

  function handleTrashDrop(e: DragEvent) {
    e.preventDefault();
    if (draggedIndex !== null) {
      removePart(draggedIndex);
    }
    draggedIndex = null;
    isOverTrash = false;
  }

  function clearAll() {
    parts = [];
    expression = '';
    lastParsedExpression = '';
  }

  function getColumnLabel(key: string): string {
    const col = TABLECOLUMNS.find((c) => c.Key === key);
    return col?.Label || key;
  }

  function getColumnType(key: string): string {
    const col = TABLECOLUMNS.find((c) => c.Key === key);
    return (col?.Type as string) || 'unknown';
  }
</script>

<div class="expression-builder">
  <div class="builder-header">
    <h4>Editor výpočtu</h4>
    {#if isValid}
      <span class="validation-valid">✓ Výpočet je validní</span>
    {/if}
  </div>

  {#if parseError}
    <div class="validation-error-box">
      <span class="error-title">⚠ Chyba při analýze výrazu</span>
      <span class="error-detail">{parseError}</span>
    </div>
  {/if}

  {#if !isValid && validationErrors.length > 0 && !parseError}
    <div class="validation-error-box">
      <span class="error-title">⚠ Výpočet musí být validní</span>
      <ul class="error-list">
        {#each validationErrors as error}
          <li>{error.message}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Simple mode: Visual builder -->
  <div class="simple-mode">
    <div class="button-group">
      <span class="group-label">Přidat sloupec:</span>
      <div class="column-buttons">
        {#each availableColumns as column}
          <button
            class="add-button"
            class:is-computed={getColumnType(column.Key) === 'computed'}
            onclick={() => addColumn(column.Key)}
            type="button"
          >
            + {getColumnLabel(column.Key)}
            {#if getColumnType(column.Key) === 'computed'}
              <span class="computed-badge">vypočítaný</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="button-group">
      <span class="group-label">Operace:</span>
      <div class="operator-buttons">
        <button class="operator-button" onclick={() => addOperator('+')} type="button">+</button>
        <button class="operator-button" onclick={() => addOperator('-')} type="button">-</button>
        <button class="operator-button" onclick={() => addOperator('*')} type="button">×</button>
        <button class="operator-button" onclick={() => addOperator('/')} type="button">÷</button>
        <button class="operator-button" onclick={() => addParenthesis('open')} type="button"
          >(</button
        >
        <button class="operator-button" onclick={() => addParenthesis('close')} type="button"
          >)</button
        >
        <button class="operator-button" onclick={() => addConstant()} type="button">123</button>
      </div>
    </div>
  </div>

  <!-- Expression parts display -->
  {#if parts.length > 0}
    <div class="parts-display">
      <div class="parts-list">
        {#each parts as part, index}
          <div
            class="part-item"
            class:is-column={part.type === 'column' && !part.isComputed}
            class:is-computed-column={part.type === 'column' && part.isComputed}
            class:has-error={errorIndices.has(index)}
            class:is-dragging={draggedIndex === index}
            class:drag-over={dragOverIndex === index}
            draggable="true"
            ondragstart={(e) => handleDragStart(index, e)}
            ondragend={handleDragEnd}
            ondragover={(e) => handleDragOver(index, e)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(index, e)}
            role="listitem"
          >
            <span class="drag-handle">
              {#if part.type === 'column'}
                <div class="column-part">
                  <span class="column-name">{getColumnLabel(part.value)}</span>
                  {#if part.isComputed}
                    <span class="computed-indicator">vypočítaný</span>
                  {/if}
                </div>
              {:else if part.type === 'operator'}
                <span class="operator">{part.value}</span>
              {:else if part.type === 'constant'}
                <input
                  type="number"
                  class="constant-input"
                  value={part.value}
                  oninput={(e) => updatePartValue(index, e.currentTarget.value)}
                />
              {:else if part.type === 'function'}
                <span class="function">{part.value}</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
      <button
        class="clear-all"
        class:is-trash-mode={draggedIndex !== null}
        class:is-over={isOverTrash}
        onclick={clearAll}
        ondragover={handleTrashDragOver}
        ondragleave={handleTrashDragLeave}
        ondrop={handleTrashDrop}
        type="button"
      >
        {#if draggedIndex !== null}
          <span class="trash-icon">🗑</span>
          <span>Přetáhněte sem pro smazání</span>
        {:else}
          Vymazat vše
        {/if}
      </button>
    </div>
  {/if}
</div>

<style lang="scss">
  .expression-builder {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-6);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-light);
  }

  .builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h4 {
      margin: 0;
      color: var(--color-primary);
      font-size: var(--font-size-md);
    }

    .validation-valid {
      font-size: var(--font-size-base);
      color: #16a34a;
      font-weight: 500;
    }
  }

  .validation-error-box {
    padding: var(--space-4) var(--space-6);
    background: var(--color-danger-light);
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    color: #991b1b;

    .error-title {
      font-weight: 600;
      font-size: var(--font-size-base);
      display: block;
      margin-bottom: var(--space-3);
    }

    .error-detail {
      font-size: var(--font-size-sm);
      display: block;
    }

    .error-list {
      margin: 0;
      padding-left: var(--space-10);
      font-size: var(--font-size-sm);

      li {
        margin-bottom: var(--space-1);

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .simple-mode {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    .group-label {
      font-weight: 600;
      font-size: var(--font-size-base);
      color: var(--color-text);
    }
  }

  .column-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .add-button {
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    cursor: pointer;
    transition: all var(--transition-base);
    display: flex;
    align-items: center;
    gap: var(--space-3);

    &:hover {
      background: #e0f2fe;
      border-color: #0284c7;
      color: #0284c7;
    }

    &.is-computed {
      background: #fef3c7;
      border-color: #fbbf24;

      &:hover {
        background: #fde68a;
        border-color: #f59e0b;
      }
    }

    .computed-badge {
      font-size: var(--font-size-xs);
      padding: var(--space-1) var(--space-3);
      background: #f59e0b;
      color: var(--color-text-on-primary);
      border-radius: var(--radius-sm);
      font-weight: 600;
    }
  }

  .operator-buttons {
    display: flex;
    gap: var(--space-3);
  }

  .operator-button {
    width: 2.5rem;
    height: 2.5rem;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xl);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      background: #fef3c7;
      border-color: #f59e0b;
      color: #f59e0b;
    }
  }

  .parts-display {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-6);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-light);
  }

  .parts-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }

  .part-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-muted);
    border-radius: var(--radius-md);
    position: relative;

    &.is-column {
      background: var(--color-primary-light);
      border: 1px solid #93c5fd;
    }

    &.is-computed-column {
      background: #fef3c7;
      border: 1px solid #fbbf24;
    }

    &.has-error {
      background: var(--color-danger-light);
      border: 2px solid #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    &.is-dragging {
      opacity: 0.5;
      transform: scale(0.95);
    }

    &.drag-over {
      border-left: 3px solid #3b82f6;
    }

    .drag-handle {
      cursor: grab;
      color: var(--color-text-muted);
      user-select: none;

      &:active {
        cursor: grabbing;
      }
    }
  }

  .column-part {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);

    .column-name {
      font-weight: 600;
      color: #1e40af;
      font-size: var(--font-size-base);
    }

    .computed-indicator {
      font-size: var(--font-size-2xs);
      color: #92400e;
      font-style: italic;
    }
  }

  .operator {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: #f59e0b;
  }

  .constant-input {
    width: 60px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    text-align: center;
    font-weight: 600;
  }

  .function {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: #8b5cf6;
  }

  .clear-all {
    align-self: flex-start;
    padding: var(--space-3) var(--space-6);
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-base);
    display: flex;
    align-items: center;
    gap: var(--space-3);

    &:hover {
      background: #fecaca;
    }

    &.is-trash-mode {
      background: var(--color-bg-muted);
      border: 2px dashed #d1d5db;
      color: var(--color-text-secondary);
      cursor: default;

      .trash-icon {
        font-size: var(--font-size-xl);
        transition: transform var(--transition-base);
      }
    }

    &.is-over {
      border-color: #ef4444;
      background: var(--color-danger-light);
      color: #ef4444;

      .trash-icon {
        transform: scale(1.2);
      }
    }
  }
</style>

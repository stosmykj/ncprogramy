<script lang="ts">
  import type {
    RuleCondition,
    RuleConditionGroup,
    RuleConditionOperator,
  } from '../models/dbFormattingRule';
  import ConditionBuilder from './ConditionBuilder.svelte';
  import Button from './Button.svelte';
  import DatePicker from './DatePicker.svelte';

  let {
    group = $bindable(),
    availableColumns = [],
    level = 0,
    onRemove,
  }: {
    group: RuleConditionGroup;
    availableColumns: Array<{ key: string; label: string; type: string }>;
    level?: number;
    onRemove?: () => void;
  } = $props();

  const operators: Array<{ value: RuleConditionOperator; label: string; needsValue: boolean }> = [
    { value: 'equals', label: 'Rovná se', needsValue: true },
    { value: 'notEquals', label: 'Nerovná se', needsValue: true },
    { value: 'gt', label: 'Větší než', needsValue: true },
    { value: 'gte', label: 'Větší nebo rovno', needsValue: true },
    { value: 'lt', label: 'Menší než', needsValue: true },
    { value: 'lte', label: 'Menší nebo rovno', needsValue: true },
    { value: 'contains', label: 'Obsahuje', needsValue: true },
    { value: 'empty', label: 'Je prázdné', needsValue: false },
    { value: 'notEmpty', label: 'Není prázdné', needsValue: false },
  ];

  function addCondition(): void {
    const newCondition: RuleCondition = {
      column: availableColumns[0]?.key || '',
      operator: 'equals',
      value: null,
    };
    group.conditions = [...group.conditions, newCondition];
  }

  function removeCondition(index: number): void {
    group.conditions = group.conditions.filter((_, i) => i !== index);
  }

  function addGroup(): void {
    const newGroup: RuleConditionGroup = {
      logic: 'AND',
      conditions: [
        {
          column: availableColumns[0]?.key || '',
          operator: 'equals',
          value: null,
        },
      ],
      groups: [],
    };
    group.groups = [...(group.groups || []), newGroup];
  }

  function removeGroup(index: number): void {
    group.groups = (group.groups || []).filter((_, i) => i !== index);
  }

  function toggleLogic(): void {
    group.logic = group.logic === 'AND' ? 'OR' : 'AND';
  }

  function operatorNeedsValue(operator: RuleConditionOperator): boolean {
    return operators.find((op) => op.value === operator)?.needsValue ?? true;
  }

  function getColumnType(columnKey: string): string {
    return availableColumns.find((col) => col.key === columnKey)?.type || 'text';
  }

  function handleColumnChange(condition: RuleCondition, newColumn: string): void {
    const oldType = getColumnType(condition.column);
    const newType = getColumnType(newColumn);

    condition.column = newColumn;

    // Reset value if column type changes
    if (oldType !== newType) {
      if (newType === 'date') {
        condition.value = null;
      } else if (newType === 'number') {
        condition.value = null;
      } else {
        condition.value = '';
      }
    }
  }
</script>

<div class="condition-group" data-level={level}>
  <div class="group-header">
    <Button onClick={toggleLogic} icon="mdiArrowDown" primary onlyIcon />

    {#if level > 0 && onRemove}
      <Button onClick={onRemove} icon="mdiClose" danger onlyIcon />
    {/if}
  </div>

  <div class="conditions-list">
    {#each group.conditions as condition, index}
      <div class="condition-row">
        {#if index > 0}
          <div class="logic-label">{group.logic}</div>
        {/if}

        <select
          value={condition.column}
          onchange={(e) => handleColumnChange(condition, e.currentTarget.value)}
          class="condition-select"
          title="Sloupec"
        >
          {#each availableColumns as column}
            <option value={column.key}>{column.label}</option>
          {/each}
        </select>

        <select bind:value={condition.operator} class="condition-select" title="Operátor">
          {#each operators as operator}
            <option value={operator.value}>{operator.label}</option>
          {/each}
        </select>

        <div>
          {#if operatorNeedsValue(condition.operator)}
            {#if getColumnType(condition.column) === 'number'}
              <input
                type="number"
                bind:value={condition.value}
                class="condition-input"
                placeholder="Hodnota"
              />
            {:else if getColumnType(condition.column) === 'date'}
              <DatePicker bind:value={condition.value as Date | null} type="date" class="condition-input" />
            {:else}
              <input
                type="text"
                bind:value={condition.value}
                class="condition-input"
                placeholder="Hodnota"
              />
            {/if}
          {/if}
        </div>

        <Button onClick={() => removeCondition(index)} icon="mdiTrashCan" danger />
      </div>
    {/each}
  </div>

  <div class="group-actions">
    <Button onClick={addCondition} icon="mdiAlertCircle" primary>Přidat podmínku</Button>

    {#if level < 3}
      <Button onClick={addGroup} icon="mdiAlertCircle" primary>Přidat skupinu</Button>
    {/if}
  </div>

  {#if group.groups && group.groups.length > 0}
    <div class="nested-groups">
      {#each group.groups as _, index (index)}
        <div class="logic-connector">{group.logic}</div>
        <ConditionBuilder
          bind:group={group.groups[index]}
          {availableColumns}
          level={level + 1}
          onRemove={() => removeGroup(index)}
        />
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .condition-group {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    background: var(--color-bg);
    margin-bottom: var(--space-3);

    &[data-level='1'] {
      background: var(--color-bg-subtle);
      border-color: var(--color-border);
    }

    &[data-level='2'] {
      background: var(--color-bg-muted);
      border-color: var(--color-border);
    }

    &[data-level='3'] {
      background: var(--color-border-light);
      border-color: var(--color-border);
    }
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);

  }

  .conditions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .condition-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-sm);

    .logic-label {
      padding: var(--space-1) var(--space-3);
      background: var(--color-primary-dark);
      color: var(--color-text-on-primary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-2xs);
      font-weight: bold;
      min-width: 2.5rem;
      text-align: center;
    }

    .condition-select {
      flex: 1;
      min-width: 120px;
      padding: var(--space-2) var(--space-3);
      border: var(--input-border);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }
    }

    .condition-input {
      flex: 1;
      min-width: 150px;
      padding: var(--space-2) var(--space-3);
      border: var(--input-border);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }
    }
  }

  .group-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }

  .nested-groups {
    margin-top: var(--space-4);
    margin-left: var(--space-8);
    padding-left: var(--space-4);
    border-left: 2px solid var(--color-primary-dark);

    .logic-connector {
      padding: var(--space-1) var(--space-3);
      margin-bottom: var(--space-3);
      background: var(--color-primary-dark);
      color: var(--color-text-on-primary);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-2xs);
      font-weight: bold;
      display: inline-block;
    }
  }
</style>

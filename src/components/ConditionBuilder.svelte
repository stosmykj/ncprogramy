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
              <DatePicker bind:value={condition.value} type="date" class="condition-input" />
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
    border: 1px solid #ddd;
    border-radius: 0.375rem;
    padding: 0.75rem;
    background: #fff;
    margin-bottom: 0.5rem;

    &[data-level='1'] {
      background: #f8f9fa;
      border-color: #ccc;
    }

    &[data-level='2'] {
      background: #f0f0f0;
      border-color: #bbb;
    }

    &[data-level='3'] {
      background: #e8e8e8;
      border-color: #aaa;
    }
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;

    .logic-toggle {
      padding: 0.25rem 0.75rem;
      background: #183868;
      color: white;
      border: none;
      border-radius: 0.25rem;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #0d2847;
      }
    }
  }

  .conditions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .condition-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 0.25rem;

    .logic-label {
      padding: 0.25rem 0.5rem;
      background: #183868;
      color: white;
      border-radius: 3px;
      font-size: 0.6875rem;
      font-weight: bold;
      min-width: 2.5rem;
      text-align: center;
    }

    .condition-select {
      flex: 1;
      min-width: 120px;
      padding: 0.375rem 0.5rem;
      border: 1px solid #ccc;
      border-radius: 0.25rem;
      font-size: 0.8125rem;

      &:focus {
        outline: none;
        border-color: #183868;
      }
    }

    .condition-input {
      flex: 1;
      min-width: 150px;
      padding: 0.375rem 0.5rem;
      border: 1px solid #ccc;
      border-radius: 0.25rem;
      font-size: 0.8125rem;

      &:focus {
        outline: none;
        border-color: #183868;
      }
    }
  }

  .group-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .btn-small {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.625rem;
    background: white;
    border: 1px solid #ccc;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f5f5f5;
      border-color: #183868;
    }
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;

    &.btn-danger {
      color: #dc3545;

      &:hover {
        background: #dc3545;
        color: white;
        border-color: #dc3545;
      }
    }
  }

  .nested-groups {
    margin-top: 0.75rem;
    margin-left: 1.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid #183868;

    .logic-connector {
      padding: 0.25rem 0.5rem;
      margin-bottom: 0.5rem;
      background: #183868;
      color: white;
      border-radius: 3px;
      font-size: 0.6875rem;
      font-weight: bold;
      display: inline-block;
    }
  }
</style>

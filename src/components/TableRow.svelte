<script lang="ts">
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import { buildStyleString, getRowStyles } from '$lib/formattingProcessor.svelte';
  import type { BodyContextMenuData } from '../interfaces/BodyContextMenuData';
  import type { Program } from '../models/program';
  import type { TableColumn } from '../models/tableColumn';
  import TableColumnComponent from './TableCell.svelte';

  let {
    cxMenuData = $bindable(),
    ...props
  }: {
    program: Program;
    headers: Array<TableColumn>;
    index: number;
    cxMenuData: BodyContextMenuData;
  } = $props();

  const { program, headers, index } = props;

  const isSelected = $derived(DATA_VARS.selectedRows.has(program.ProgramId));
  const rowStyles = getRowStyles(program);

  function getIsFocused(i: number): boolean {
    return DATA_VARS.columnPosition === i && DATA_VARS.rowPosition === index;
  }

  function toggleSelection() {
    if (DATA_VARS.selectedRows.has(program.ProgramId)) {
      DATA_VARS.selectedRows.delete(program.ProgramId);
    } else {
      DATA_VARS.selectedRows.add(program.ProgramId);
    }
    DATA_VARS.reloadData = true;
  }
</script>

<tr id="row_{index}" class:selected={isSelected} style={buildStyleString(rowStyles)}>
  {#if DATA_VARS.bulkSelectMode}
    <td class="checkbox-cell">
      <input type="checkbox" checked={isSelected} onchange={toggleSelection} />
    </td>
  {/if}
  {#each headers as header, i}
    <TableColumnComponent
      {program}
      {header}
      focused={getIsFocused(i)}
      position={{ column: i, row: index }}
      bind:cxMenuData
    />
  {/each}
</tr>

<style lang="scss">
  $row-hover: #f0f4f8;

  tr {
    display: flex;
    align-items: center;

    &.selected {
      background: #dbeafe !important;
      border-left: 3px solid #3b82f6;
    }

    .checkbox-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      width: 50px;
      flex-shrink: 0;

      input[type='checkbox'] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
    }
  }

  tr:nth-child(even) {
    background: #f6f6f6;
  }

  tr:hover {
    background: $row-hover;
  }
</style>

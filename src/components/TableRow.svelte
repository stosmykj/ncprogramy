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

  const rowStyles = getRowStyles(program);

  function getIsFocused(i: number): boolean {
    return DATA_VARS.columnPosition === i && DATA_VARS.rowPosition === index;
  }
</script>

<tr id="row_{index}" style={buildStyleString(rowStyles)}>
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
    min-width: max-content;
  }

  tr:nth-child(even) {
    background: #f6f6f6;
  }

  tr:hover {
    background: $row-hover;
  }
</style>

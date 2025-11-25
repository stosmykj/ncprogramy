<script lang="ts">
  import { SETTINGS_VARS, markAppAsInitialized } from '$lib/settingsProcessor.svelte';
  import { initTableColumns } from '$lib/tableColumnProcessor.svelte';
  import { TableColumn, type ColumnType } from '$models/tableColumn';
  import type { DbTableColumn } from '$models/dbTableColumn';
  import { getDatabase } from '$lib/database';
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import Button from '$components/Button.svelte';
  import Icon from '$components/Icon.svelte';
  import ComputeExpressionBuilder from './ComputeExpressionBuilder.svelte';
  import { logger } from '$lib/logger';

  let dialog = $state<HTMLDialogElement | null>(null);
  let columns = $state<Array<TableColumn>>([]);
  let showArchived = $state(false);
  let draggedIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);
  let dropPosition = $state<'before' | 'after'>('before');
  let editingIndex: number | null = $state(null);
  let editFormData = $state<{
    key: string;
    type: ColumnType;
    label: string;
    computeExpression?: string;
  }>({
    key: '',
    type: 'string',
    label: '',
    computeExpression: undefined,
  });
  let isCreatingNew = $state(false);
  let refreshColumns = $state({});
  let pendingNewColumns = $state<Set<string>>(new Set());

  const protectedColumns = ['createdAt', 'updatedAt', 'actions', 'id'];

  $effect(() => {
    if (SETTINGS_VARS.columnManagerOpened) {
      loadColumns();
      dialog?.showModal();
    } else {
      dialog?.close();
      editingIndex = null;
      isCreatingNew = false;
    }
  });

  async function loadColumns() {
    const db = await getDatabase();
    const query = showArchived
      ? 'SELECT * FROM table_columns ORDER BY archived ASC, position ASC'
      : 'SELECT * FROM table_columns WHERE archived = 0 ORDER BY position ASC';
    const rows = await db.select<Array<DbTableColumn>>(query);
    columns = rows.map((row) => new TableColumn(row));
    pendingNewColumns = new Set();
  }

  function closeDialog() {
    SETTINGS_VARS.columnManagerOpened = false;
  }

  async function saveChanges() {
    try {
      const db = await getDatabase();

      const nonArchivedColumns = columns.filter((c) => !c.Archived);
      for (let i = 0; i < nonArchivedColumns.length; i++) {
        nonArchivedColumns[i].Position = i;
      }

      for (const col of columns) {
        if (pendingNewColumns.has(col.Key)) {
          // Insert new column
          await db.execute(
            `INSERT INTO table_columns (key, type, position, sort, sortPosition, visible, width, align, archived, label, computeExpression)
             VALUES ($1, $2, $3, 0, 0, $4, 'auto', 'left', 0, $5, $6)`,
            [
              col.Key,
              col.Type,
              col.Position,
              col.Visible ? 1 : 0,
              col.Label || null,
              col.ComputeExpression || null,
            ]
          );

          // Add column to programs table if not computed
          if (col.Type !== 'computed') {
            let sqlType = 'TEXT';
            if (col.Type === 'number') {
              sqlType = 'REAL';
            }

            await db.execute(`ALTER TABLE programs ADD COLUMN ${col.Key} ${sqlType}`);
          }
        } else {
          // Update existing column
          await db.execute(
            'UPDATE table_columns SET visible = $1, position = $2, archived = $3, label = $4, computeExpression = $5 WHERE key = $6',
            [
              col.Visible ? 1 : 0,
              col.Position,
              col.Archived ? 1 : 0,
              col.Label || null,
              col.ComputeExpression || null,
              col.Key,
            ]
          );
        }
      }

      pendingNewColumns = new Set();
      await markAppAsInitialized();
      await initTableColumns();
      DATA_VARS.reloadData = true;
      closeDialog();
    } catch (error) {
      logger.error('Failed to save column changes', error);
      alert('Chyba při ukládání změn sloupců');
    }
  }

  function toggleVisibility(index: number) {
    columns[index].Visible = !columns[index].Visible;
    refreshColumns = {};
  }

  async function toggleArchived(index: number) {
    columns[index].Archived = !columns[index].Archived;
    if (columns[index].Archived) {
      columns[index].Visible = false;
    }
    refreshColumns = {};
  }

  function toggleShowArchived() {
    showArchived = !showArchived;
    loadColumns();
  }

  function startEdit(index: number) {
    const col = columns[index];
    if (col.Archived) return;

    editingIndex = index;
    editFormData = {
      key: col.Key,
      type: col.Type,
      label: col.Label || '',
      computeExpression: col.ComputeExpression,
    };

    isCreatingNew = false;
  }

  function startNewColumn() {
    isCreatingNew = true;
    editingIndex = null;
    editFormData = { key: '', type: 'string', label: '', computeExpression: undefined };
  }

  function cancelEdit() {
    editingIndex = null;
    isCreatingNew = false;
  }

  function saveEdit() {
    if (editingIndex !== null) {
      // Update existing column in local state
      const col = columns[editingIndex];
      col.Label = editFormData.label || undefined;
      col.ComputeExpression = editFormData.computeExpression || undefined;
      refreshColumns = {};
    } else if (isCreatingNew && editFormData.key) {
      // Check if key already exists in local columns
      const existing = columns.find((c) => c.Key === editFormData.key);
      if (existing) {
        alert('Sloupec s tímto klíčem již existuje');
        return;
      }

      const maxPosition = columns.length > 0 ? Math.max(...columns.map((c) => c.Position)) : 0;

      // Create new column in local state
      const now = new Date();
      const newColumn = new TableColumn({
        key: editFormData.key,
        type: editFormData.type,
        position: maxPosition + 1,
        sort: 0,
        sortPosition: 0,
        visible: true,
        width: 'auto',
        align: 'left',
        archived: false,
        label: editFormData.label || undefined,
        computeExpression: editFormData.computeExpression || undefined,
        createdAt: now,
        updatedAt: now,
      });

      columns = [...columns, newColumn];
      pendingNewColumns = new Set([...pendingNewColumns, editFormData.key]);
    }

    cancelEdit();
  }

  function handleDragStart(event: DragEvent, index: number) {
    const col = columns[index];
    if (protectedColumns.includes(col.Key) || col.Archived) {
      event.preventDefault();
      return;
    }
    draggedIndex = index;
    event.dataTransfer!.effectAllowed = 'move';
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    const col = columns[index];
    if (protectedColumns.includes(col.Key) || col.Archived || draggedIndex === null) return;

    const draggedCol = columns[draggedIndex];
    if (draggedCol.Archived) return;

    event.dataTransfer!.dropEffect = 'move';
    dropTargetIndex = index;

    // Determine if dropping before or after based on mouse position
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    dropPosition = event.clientY < midpoint ? 'before' : 'after';
  }

  function handleDragLeave() {
    dropTargetIndex = null;
  }

  function handleDrop(event: DragEvent, index: number) {
    event.preventDefault();
    const targetCol = columns[index];
    if (draggedIndex === null || protectedColumns.includes(targetCol.Key) || targetCol.Archived)
      return;

    const draggedCol = columns[draggedIndex];
    if (draggedCol.Archived) return;

    const draggedColumn = columns[draggedIndex];
    const newColumns = [...columns];
    newColumns.splice(draggedIndex, 1);

    // Calculate new index based on drop position
    let newIndex = index;
    if (draggedIndex < index) {
      newIndex = dropPosition === 'after' ? index : index - 1;
    } else {
      newIndex = dropPosition === 'after' ? index + 1 : index;
    }

    newColumns.splice(newIndex, 0, draggedColumn);
    columns = newColumns;

    draggedIndex = null;
    dropTargetIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dropTargetIndex = null;
  }

  function getColumnLabel(col: TableColumn): string {
    return col.Label || col.Key;
  }

  function isProtected(key: string): boolean {
    return protectedColumns.includes(key);
  }

  function isComputed(col: TableColumn): boolean {
    return col.Type === 'computed' || !!col.ComputeExpression;
  }
</script>

<dialog bind:this={dialog} class="column-manager-dialog">
  <div class="dialog-header">
    <h2>Správa sloupců</h2>
    <div class="header-actions">
      <Button
        icon="mdiPlus"
        onClick={startNewColumn}
        primary
        style="height: 2rem; padding: 0.25rem 0.5rem;"
      >
        <span>Nový sloupec</span>
      </Button>
      <Button
        icon={showArchived ? 'mdiArchive' : 'mdiArchiveArrowUp'}
        onClick={toggleShowArchived}
        style="height: 2rem; padding: 0.25rem 0.5rem;"
      >
        <span>{showArchived ? 'Skrýt archivované' : 'Zobrazit archivované'}</span>
      </Button>
      <Button icon="mdiClose" onClick={closeDialog} onlyIcon />
    </div>
  </div>

  <div class="dialog-body">
    {#if isCreatingNew}
      <div class="edit-form">
        <h3>Nový sloupec</h3>
        <div class="form-row">
          <label>
            Klíč sloupce:
            <input type="text" bind:value={editFormData.key} placeholder="např. customField" />
          </label>
        </div>
        <div class="form-row">
          <label>
            Název sloupce (label):
            <input type="text" bind:value={editFormData.label} placeholder="Vlastní pole" />
          </label>
        </div>
        <div class="form-row">
          <label>
            Typ:
            <select bind:value={editFormData.type}>
              <option value="string">Text</option>
              <option value="number">Číslo</option>
              <option value="date">Datum</option>
              <option value="datetime">Datum a čas</option>
              <option value="file">Soubor</option>
              <option value="computed">Vypočítaný</option>
            </select>
          </label>
        </div>
        {#if editFormData.type === 'computed'}
          <ComputeExpressionBuilder
            bind:expression={editFormData.computeExpression}
            columnKey={editFormData.key}
          />
        {/if}
        <div class="form-actions">
          <Button onClick={cancelEdit}><span>Zrušit</span></Button>
          <Button onClick={saveEdit} success><span>Vytvořit</span></Button>
        </div>
      </div>
    {/if}

    <div class="instructions">
      <Icon name="mdiInformationOutline" size={20} color="#285597" />
      <span>Přetáhněte sloupce pro změnu pořadí. Klikněte na ikony pro úpravy.</span>
    </div>

    {#key refreshColumns}
      <div class="columns-list" role="list">
        {#each columns as column, index}
          {#if editingIndex === index}
            <div class="edit-form-inline">
              <div class="form-header">
                <strong>{column.Key}</strong>
                {#if isComputed(column)}
                  <span class="computed-badge">Vypočítaný</span>
                {/if}
              </div>
              <div class="form-row">
                <label>
                  Název sloupce (label):
                  <input type="text" bind:value={editFormData.label} placeholder={column.Key} />
                </label>
              </div>
              {#if isComputed(column)}
                <ComputeExpressionBuilder bind:expression={editFormData.computeExpression} />
              {/if}
              <div class="form-row">
                <small><strong>Typ:</strong> {column.Type} (nelze změnit po vytvoření)</small>
              </div>
              <div class="form-actions">
                <Button icon="mdiCancel" onClick={cancelEdit} onlyIcon />
                <Button icon="mdiCheck" onClick={saveEdit} success onlyIcon />
              </div>
            </div>
          {:else}
            <div
              class="column-item"
              class:dragging={draggedIndex === index}
              class:drop-target={dropTargetIndex === index && dropPosition === 'before'}
              class:drop-target-after={dropTargetIndex === index && dropPosition === 'after'}
              class:hidden={!column.Visible}
              class:archived={column.Archived}
              class:locked={isProtected(column.Key)}
              class:computed={isComputed(column)}
              role="listitem"
              draggable="true"
              ondragstart={(e) => handleDragStart(e, index)}
              ondragover={(e) => handleDragOver(e, index)}
              ondragleave={handleDragLeave}
              ondrop={(e) => handleDrop(e, index)}
              ondragend={handleDragEnd}
            >
              <div class="drag-handle">
                {#if !isProtected(column.Key) && !column.Archived}
                  <Icon name="mdiDragVertical" size={20} color="#666" />
                {:else}
                  <div style="width: 20px;"></div>
                {/if}
              </div>

              <div class="column-info">
                <div class="column-name-row">
                  <span class="column-name">{getColumnLabel(column)}</span>
                  {#if isComputed(column)}
                    <span class="computed-badge">Vypočítaný</span>
                  {/if}
                </div>
                <span class="column-key">{column.Key} ({column.Type})</span>
              </div>

              <div class="column-actions">
                {#if !isProtected(column.Key) && !column.Archived}
                  <button
                    class="action-button"
                    onclick={() => startEdit(index)}
                    title="Upravit sloupec"
                  >
                    <Icon name="mdiPencil" size={20} color="#285597" />
                  </button>
                {/if}

                <button
                  class="visibility-toggle"
                  class:visible={column.Visible}
                  onclick={() => toggleVisibility(index)}
                  disabled={isProtected(column.Key) || column.Archived}
                  title={column.Visible ? 'Skrýt sloupec' : 'Zobrazit sloupec'}
                >
                  <Icon
                    name={column.Visible ? 'mdiEye' : 'mdiEyeOff'}
                    size={20}
                    color={column.Visible ? '#22aa44' : '#999'}
                  />
                </button>

                {#if !isProtected(column.Key)}
                  <button
                    class="archive-toggle"
                    class:archived={column.Archived}
                    onclick={() => toggleArchived(index)}
                    title={column.Archived ? 'Obnovit z archivu' : 'Archivovat'}
                  >
                    <Icon
                      name={column.Archived ? 'mdiArchiveArrowUp' : 'mdiArchive'}
                      size={20}
                      color={column.Archived ? '#ff9800' : '#666'}
                    />
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/key}
  </div>

  <div class="dialog-footer">
    <Button onClick={closeDialog}>Zrušit</Button>
    <Button onClick={saveChanges} primary>Uložit změny</Button>
  </div>
</dialog>

<style lang="scss">
  .column-manager-dialog {
    border: none;
    border-radius: 12px;
    padding: 0;
    width: 750px;
    max-width: 90vw;
    max-height: 85vh;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);

    &::backdrop {
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #dfe3e8;
    background: #f8f9fa;
    border-radius: 12px 12px 0 0;

    h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #285597;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  }

  .dialog-body {
    padding: 1.5rem;
    overflow-y: auto;
    max-height: calc(85vh - 200px);
  }

  .edit-form,
  .edit-form-inline {
    background: #e3f2fd;
    border: 2px solid #285597;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .computed-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #4caf50;
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .form-row {
    margin-bottom: 1rem;

    label {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    input[type='text'],
    select {
      padding: 0.5rem;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: #285597;
      }
    }

    small {
      color: #666;
      font-size: 0.85rem;
      font-weight: normal;
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .instructions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #fff3cd;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    color: #856404;
  }

  .columns-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .column-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover:not(.locked):not(.archived) {
      border-color: #285597;
      box-shadow: 0 2px 8px rgba(40, 85, 151, 0.1);
      cursor: grab;
    }

    &.dragging {
      opacity: 0.5;
      cursor: grabbing;
    }

    &.drop-target {
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: -4px;
        height: 4px;
        background: #4a90e2;
        border-radius: 2px;
      }
    }

    &.drop-target-after {
      position: relative;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -4px;
        height: 4px;
        background: #4a90e2;
        border-radius: 2px;
      }
    }

    &.hidden {
      opacity: 0.6;
      background: #f5f5f5;
    }

    &.archived {
      background: #fff3e0;
      border-color: #ff9800;
      opacity: 0.7;
    }

    &.locked {
      cursor: default;
      background: #fafafa;
    }

    &.computed {
      border-left: 4px solid #4caf50;
    }
  }

  .drag-handle {
    display: flex;
    align-items: center;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .column-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .column-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .column-name {
    font-weight: 600;
    font-size: 1rem;
    color: #333;
  }

  .column-key {
    font-size: 0.85rem;
    color: #666;
    font-family: monospace;
  }

  .column-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-button,
  .visibility-toggle,
  .archive-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #dfe3e8;
    background: #f8f9fa;
    border-radius: 0 0 12px 12px;
  }
</style>

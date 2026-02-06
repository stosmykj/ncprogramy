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
    sortable: boolean;
    dateFormat?: string;
    copyable: boolean;
    inlineEditable: boolean;
    incrementalPattern?: string;
    incrementalRewritable: boolean;
  }>({
    key: '',
    type: 'string',
    label: '',
    computeExpression: undefined,
    sortable: true,
    dateFormat: undefined,
    copyable: true,
    inlineEditable: true,
    incrementalPattern: undefined,
    incrementalRewritable: false,
  });
  let showDateFormatHelp = $state(false);
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
            `INSERT INTO table_columns (key, type, position, sort, sortPosition, visible, width, align, archived, label, computeExpression, sortable, dateFormat, copyable, inlineEditable, incrementalPattern, incrementalRewritable)
             VALUES ($1, $2, $3, 0, 0, $4, 'auto', 'left', 0, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              col.Key,
              col.Type,
              col.Position,
              col.Visible ? 1 : 0,
              col.Label || null,
              col.ComputeExpression || null,
              col.Sortable ? 1 : 0,
              col.DateFormat || null,
              col.Copyable ? 1 : 0,
              col.InlineEditable ? 1 : 0,
              col.IncrementalPattern || null,
              col.IncrementalRewritable ? 1 : 0,
            ]
          );

          // Add column to programs table if not computed
          if (col.Type !== 'computed') {
            let sqlType = 'TEXT';
            if (col.Type === 'number') {
              sqlType = 'REAL';
            }

            try {
              await db.execute(`ALTER TABLE programs ADD COLUMN ${col.Key} ${sqlType}`);
            } catch {
              // Column may already exist in the programs table, ignore
            }
          }
        } else {
          // Update existing column
          await db.execute(
            'UPDATE table_columns SET type = $1, visible = $2, position = $3, archived = $4, label = $5, computeExpression = $6, sortable = $7, dateFormat = $8, copyable = $9, inlineEditable = $10, incrementalPattern = $11, incrementalRewritable = $12 WHERE key = $13',
            [
              col.Type,
              col.Visible ? 1 : 0,
              col.Position,
              col.Archived ? 1 : 0,
              col.Label || null,
              col.ComputeExpression || null,
              col.Sortable ? 1 : 0,
              col.DateFormat || null,
              col.Copyable ? 1 : 0,
              col.InlineEditable ? 1 : 0,
              col.IncrementalPattern || null,
              col.IncrementalRewritable ? 1 : 0,
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
      sortable: col.Sortable,
      dateFormat: col.DateFormat,
      copyable: col.Copyable,
      inlineEditable: col.InlineEditable,
      incrementalPattern: col.IncrementalPattern,
      incrementalRewritable: col.IncrementalRewritable,
    };

    isCreatingNew = false;
  }

  function startNewColumn() {
    isCreatingNew = true;
    editingIndex = null;
    editFormData = {
      key: '',
      type: 'string',
      label: '',
      computeExpression: undefined,
      sortable: true,
      dateFormat: undefined,
      copyable: true,
      inlineEditable: true,
      incrementalPattern: undefined,
      incrementalRewritable: false,
    };
  }

  function cancelEdit() {
    editingIndex = null;
    isCreatingNew = false;
  }

  function saveEdit() {
    if (editingIndex !== null) {
      // Update existing column in local state
      const col = columns[editingIndex];
      col.Type = editFormData.type;
      col.Label = editFormData.label || undefined;
      col.ComputeExpression = editFormData.computeExpression || undefined;
      col.Sortable = editFormData.sortable;
      col.DateFormat = editFormData.dateFormat || undefined;
      col.Copyable = editFormData.copyable;
      col.InlineEditable = editFormData.inlineEditable;
      col.IncrementalPattern = editFormData.incrementalPattern || undefined;
      col.IncrementalRewritable = editFormData.incrementalRewritable;
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
        sortable: editFormData.sortable,
        dateFormat: editFormData.dateFormat || undefined,
        copyable: editFormData.copyable,
        inlineEditable: editFormData.inlineEditable,
        incrementalPattern: editFormData.incrementalPattern || undefined,
        incrementalRewritable: editFormData.incrementalRewritable,
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
              <option value="gcode">G-code soubor</option>
              <option value="computed">Vypočítaný</option>
              <option value="incremental">Inkrementální</option>
            </select>
          </label>
        </div>
        {#if editFormData.type === 'computed'}
          <ComputeExpressionBuilder
            bind:expression={editFormData.computeExpression}
            columnKey={editFormData.key}
          />
        {/if}
        {#if editFormData.type === 'incremental'}
          <div class="form-row">
            <label>
              Vzor (pattern):
              <input
                type="text"
                bind:value={editFormData.incrementalPattern}
                placeholder="např. {'{YY}{###}'}"
              />
              <small class="help-text">
                Použijte: {'{YY}'} = rok (2 číslice), {'{YYYY}'} = rok (4 číslice), {'{MM}'} = měsíc (01-12), {'{DD}'} = den (01-31), {'{###}'} = pořadí (3 číslice)
              </small>
            </label>
          </div>
          <div class="form-row checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={editFormData.incrementalRewritable} />
              <span>Hodnotu lze přepisovat</span>
            </label>
          </div>
        {/if}
        {#if editFormData.type === 'date' || editFormData.type === 'datetime'}
          <div class="form-row">
            <label>
              Formát data:
              <input
                type="text"
                bind:value={editFormData.dateFormat}
                placeholder="dd. MM. yyyy"
              />
              <button type="button" class="help-toggle" onclick={() => showDateFormatHelp = !showDateFormatHelp}>
                {showDateFormatHelp ? 'Skrýt nápovědu' : 'Zobrazit nápovědu formátu'}
              </button>
            </label>
            {#if showDateFormatHelp}
              <div class="date-format-help">
                <p><strong>Běžné tokeny:</strong></p>
                <ul>
                  <li><code>dd</code> - den (01-31)</li>
                  <li><code>MM</code> - měsíc (01-12)</li>
                  <li><code>yyyy</code> - rok (4 číslice)</li>
                  <li><code>yy</code> - rok (2 číslice)</li>
                  <li><code>HH</code> - hodina (00-23)</li>
                  <li><code>mm</code> - minuta (00-59)</li>
                  <li><code>ss</code> - sekunda (00-59)</li>
                </ul>
                <p><strong>Příklady:</strong></p>
                <ul>
                  <li><code>dd. MM. yyyy</code> → 28. 11. 2025</li>
                  <li><code>yyyy-MM-dd</code> → 2025-11-28</li>
                  <li><code>dd/MM/yyyy HH:mm</code> → 28/11/2025 14:30</li>
                </ul>
              </div>
            {/if}
          </div>
        {/if}
        <div class="form-row-group">
          <div class="form-row checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={editFormData.sortable} />
              <span>Řaditelný</span>
            </label>
          </div>
          <div class="form-row checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={editFormData.copyable} />
              <span>Kopírovat při duplikaci řádku</span>
            </label>
          </div>
          <div class="form-row checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={editFormData.inlineEditable} />
              <span>Inline editace</span>
            </label>
          </div>
        </div>
        <div class="form-actions">
          <Button onClick={cancelEdit}><span>Zrušit</span></Button>
          <Button onClick={saveEdit} success><span>Vytvořit</span></Button>
        </div>
      </div>
    {/if}

    <div class="instructions">
      <Icon name="mdiInformationOutline" size={20} color="var(--color-primary)" />
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
                {:else if column.Type === 'incremental'}
                  <span class="incremental-badge">Inkrementální</span>
                {/if}
              </div>
              <div class="form-row">
                <label>
                  Název sloupce (label):
                  <input type="text" bind:value={editFormData.label} placeholder={column.Key} />
                </label>
              </div>
              <div class="form-row">
                <label>
                  Typ:
                  {#if column.Type === 'computed'}
                    <select bind:value={editFormData.type} disabled>
                      <option value="computed">Vypočítaný</option>
                    </select>
                    <small class="help-text">Vypočítané sloupce nelze změnit na jiný typ</small>
                  {:else}
                    <select bind:value={editFormData.type}>
                      <option value="string">Text</option>
                      <option value="number">Číslo</option>
                      <option value="date">Datum</option>
                      <option value="datetime">Datum a čas</option>
                      <option value="file">Soubor</option>
                      <option value="gcode">G-code soubor</option>
                      <option value="incremental">Inkrementální</option>
                    </select>
                    {#if editFormData.type !== column.Type}
                      <small class="type-warning">Změna typu může ovlivnit zobrazení stávajících dat</small>
                    {/if}
                  {/if}
                </label>
              </div>
              {#if editFormData.type === 'computed'}
                <ComputeExpressionBuilder bind:expression={editFormData.computeExpression} columnKey={column.Key} />
              {/if}
              {#if editFormData.type === 'date' || editFormData.type === 'datetime'}
                <div class="form-row">
                  <label>
                    Formát data:
                    <input
                      type="text"
                      bind:value={editFormData.dateFormat}
                      placeholder="dd. MM. yyyy"
                    />
                    <button type="button" class="help-toggle" onclick={() => showDateFormatHelp = !showDateFormatHelp}>
                      {showDateFormatHelp ? 'Skrýt nápovědu' : 'Zobrazit nápovědu formátu'}
                    </button>
                  </label>
                  {#if showDateFormatHelp}
                    <div class="date-format-help">
                      <p><strong>Běžné tokeny:</strong></p>
                      <ul>
                        <li><code>dd</code> - den (01-31)</li>
                        <li><code>MM</code> - měsíc (01-12)</li>
                        <li><code>yyyy</code> - rok (4 číslice)</li>
                        <li><code>HH</code> - hodina (00-23)</li>
                        <li><code>mm</code> - minuta (00-59)</li>
                      </ul>
                      <p><strong>Příklady:</strong></p>
                      <ul>
                        <li><code>dd. MM. yyyy</code> → 28. 11. 2025</li>
                        <li><code>yyyy-MM-dd</code> → 2025-11-28</li>
                      </ul>
                    </div>
                  {/if}
                </div>
              {/if}
              {#if editFormData.type === 'incremental'}
                <div class="form-row">
                  <label>
                    Vzor (pattern):
                    <input
                      type="text"
                      bind:value={editFormData.incrementalPattern}
                      placeholder="např. {'{YY}{###}'}"
                    />
                    <small class="help-text">
                      Použijte: {'{YY}'} = rok (2 číslice), {'{YYYY}'} = rok (4 číslice), {'{MM}'} = měsíc (01-12), {'{DD}'} = den (01-31), {'{###}'} = pořadí (3 číslice)
                    </small>
                  </label>
                </div>
                <div class="form-row checkbox-row">
                  <label class="checkbox-label">
                    <input type="checkbox" bind:checked={editFormData.incrementalRewritable} />
                    <span>Hodnotu lze přepisovat</span>
                  </label>
                </div>
              {/if}
              <div class="form-row-group inline">
                <div class="form-row checkbox-row">
                  <label class="checkbox-label">
                    <input type="checkbox" bind:checked={editFormData.sortable} />
                    <span>Řaditelný</span>
                  </label>
                </div>
                <div class="form-row checkbox-row">
                  <label class="checkbox-label">
                    <input type="checkbox" bind:checked={editFormData.copyable} />
                    <span>Kopírovat</span>
                  </label>
                </div>
                <div class="form-row checkbox-row">
                  <label class="checkbox-label">
                    <input type="checkbox" bind:checked={editFormData.inlineEditable} />
                    <span>Inline editace</span>
                  </label>
                </div>
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
                  <Icon name="mdiDragVertical" size={20} color="var(--color-text-secondary)" />
                {:else}
                  <div style="width: 1.25rem;"></div>
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
                    <Icon name="mdiPencil" size={20} color="var(--color-primary)" />
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
                      color={column.Archived ? '#ff9800' : 'var(--color-text-secondary)'}
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
    border-radius: var(--radius-xl);
    padding: 0;
    width: 750px;
    max-width: 90vw;
    max-height: 85vh;
    box-shadow: var(--shadow-xl);

    &::backdrop {
      background: var(--color-bg-overlay);
      backdrop-filter: blur(4px);
    }
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-6) var(--space-8);
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;

    h2 {
      margin: 0;
      font-size: var(--font-size-xl);
      color: var(--color-primary);
    }

    .header-actions {
      display: flex;
      gap: var(--space-3);
      align-items: center;
    }
  }

  .dialog-body {
    padding: var(--space-6) var(--space-8);
    overflow-y: auto;
    max-height: calc(85vh - 200px);
  }

  .edit-form,
  .edit-form-inline {
    background: var(--color-primary-light);
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin-bottom: var(--space-6);
  }

  .computed-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    background: var(--color-success);
    color: var(--color-text-on-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
  }

  .incremental-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    background: var(--color-warning);
    color: var(--color-text-on-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
  }

  .form-row-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
    padding: var(--space-4);
    background: rgba(40, 85, 151, 0.05);
    border-radius: var(--radius-md);

    &.inline {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-6);
    }
  }

  .checkbox-row {
    margin-bottom: 0 !important;
  }

  .checkbox-label {
    display: flex !important;
    flex-direction: row !important;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;

    input[type='checkbox'] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--color-primary);
    }

    span {
      font-weight: 500;
    }
  }

  .help-toggle {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    font-size: var(--font-size-sm);
    text-decoration: underline;
    padding: 0;
    margin-top: var(--space-2);

    &:hover {
      color: var(--color-primary-hover);
    }
  }

  .help-text {
    display: block;
    margin-top: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .type-warning {
    display: block;
    margin-top: var(--space-2);
    font-size: var(--font-size-sm);
    color: #d97706;
    font-weight: 500;
  }

  .date-format-help {
    margin-top: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);

    p {
      margin: 0 0 var(--space-3) 0;
    }

    ul {
      margin: 0 0 var(--space-4) 0;
      padding-left: var(--space-10);
    }

    li {
      margin-bottom: var(--space-1);
    }

    code {
      background: var(--color-primary-light);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }
  }

  .form-row {
    margin-bottom: var(--space-6);

    label {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      font-weight: 600;
      color: var(--color-text);
    }

    input[type='text'],
    select {
      padding: var(--space-3);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-md);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }
    }

    small {
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      font-weight: normal;
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }

  .instructions {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6);
    background: #fff3cd;
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-8);
    font-size: var(--font-size-base);
    color: #856404;
  }

  .columns-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .column-item {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4) var(--space-6);
    background: var(--color-bg);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    transition: all var(--transition-base);

    &:hover:not(.locked):not(.archived) {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
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
        height: var(--space-2);
        background: var(--color-primary);
        border-radius: var(--space-1);
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
        height: var(--space-2);
        background: var(--color-primary);
        border-radius: var(--space-1);
      }
    }

    &.hidden {
      opacity: 0.6;
      background: var(--color-bg-muted);
    }

    &.archived {
      background: #fff3e0;
      border-color: var(--color-warning);
      opacity: 0.7;
    }

    &.locked {
      cursor: default;
      background: var(--color-bg-subtle);
    }

    &.computed {
      border-left: 4px solid var(--color-success);
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
    gap: var(--space-1);
  }

  .column-name-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .column-name {
    font-weight: 600;
    font-size: var(--font-size-md);
    color: var(--color-text);
  }

  .column-key {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
  }

  .column-actions {
    display: flex;
    gap: var(--space-3);
  }

  .action-button,
  .visibility-toggle,
  .archive-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-base);

    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-8);
    border-top: 1px solid var(--color-border-light);
    background: var(--color-bg-subtle);
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }
</style>

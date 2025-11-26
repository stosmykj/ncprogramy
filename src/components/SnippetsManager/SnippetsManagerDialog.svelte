<script lang="ts">
  import { SETTINGS_VARS } from '$lib/settingsProcessor.svelte';
  import {
    SNIPPETS,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    reorderSnippets,
    resetToDefaults,
  } from '$lib/snippetsProcessor.svelte';
  import type { Snippet } from '../../models/snippet';
  import Button from '../Button.svelte';
  import Icon from '../Icon.svelte';
  import SnippetEditor from './SnippetEditor.svelte';
  import { confirm } from '@tauri-apps/plugin-dialog';

  let dialog = $state<HTMLDialogElement | null>(null);
  let draggedIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);
  let dropPosition = $state<'before' | 'after'>('before');
  let editingSnippet = $state<Snippet | null>(null);
  let isCreatingNew = $state(false);

  $effect(() => {
    if (SETTINGS_VARS.snippetsManagerOpened) {
      dialog?.showModal();
    } else {
      dialog?.close();
      editingSnippet = null;
      isCreatingNew = false;
    }
  });

  function closeDialog() {
    SETTINGS_VARS.snippetsManagerOpened = false;
  }

  function startNew() {
    isCreatingNew = true;
    editingSnippet = null;
  }

  function startEdit(snippet: Snippet) {
    editingSnippet = snippet;
    isCreatingNew = false;
  }

  function cancelEdit() {
    editingSnippet = null;
    isCreatingNew = false;
  }

  async function handleSave(data: { name: string; code: string; description: string }) {
    if (editingSnippet) {
      await updateSnippet(editingSnippet.id, data);
    } else {
      await addSnippet(data);
    }
    cancelEdit();
  }

  async function handleDelete(snippet: Snippet) {
    const result = await confirm(`Opravdu smazat snippet "${snippet.name}"?`, {
      title: 'Smazat snippet',
      kind: 'warning',
    });
    if (result) {
      await deleteSnippet(snippet.id);
    }
  }

  async function handleResetToDefaults() {
    const result = await confirm(
      'Tím se smažou všechny vlastní snippety a obnoví se výchozí. Pokračovat?',
      {
        title: 'Obnovit výchozí snippety',
        kind: 'warning',
      }
    );
    if (result) {
      await resetToDefaults();
    }
  }

  function handleDragStart(event: DragEvent, index: number) {
    draggedIndex = index;
    event.dataTransfer!.effectAllowed = 'move';
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (draggedIndex === null) return;

    event.dataTransfer!.dropEffect = 'move';
    dropTargetIndex = index;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    dropPosition = event.clientY < midpoint ? 'before' : 'after';
  }

  function handleDragLeave() {
    dropTargetIndex = null;
  }

  async function handleDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (draggedIndex === null) return;

    let newIndex = index;
    if (draggedIndex < index) {
      newIndex = dropPosition === 'after' ? index : index - 1;
    } else {
      newIndex = dropPosition === 'after' ? index + 1 : index;
    }

    if (newIndex !== draggedIndex) {
      await reorderSnippets(draggedIndex, newIndex);
    }

    draggedIndex = null;
    dropTargetIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dropTargetIndex = null;
  }
</script>

<dialog bind:this={dialog} class="snippets-manager-dialog">
  <div class="dialog-header">
    <h2>Správa snippetů</h2>
    <div class="header-actions">
      <Button
        icon="mdiPlus"
        onClick={startNew}
        primary
        style="height: 2rem; padding: 0.25rem 0.5rem;"
      >
        <span>Nový snippet</span>
      </Button>
      <Button
        icon="mdiBackupRestore"
        onClick={handleResetToDefaults}
        style="height: 2rem; padding: 0.25rem 0.5rem;"
      >
        <span>Obnovit výchozí</span>
      </Button>
      <Button icon="mdiClose" onClick={closeDialog} onlyIcon />
    </div>
  </div>

  <div class="dialog-body">
    {#if isCreatingNew}
      <SnippetEditor snippet={null} onSave={handleSave} onCancel={cancelEdit} />
    {/if}

    <div class="instructions">
      <Icon name="mdiInformationOutline" size={20} color="#285597" />
      <span>Přetáhněte snippety pro změnu pořadí. Klikněte pro úpravu.</span>
    </div>

    <div class="snippets-list" role="list">
      {#each SNIPPETS as snippet, index (snippet.id)}
        {#if editingSnippet?.id === snippet.id}
          <SnippetEditor {snippet} onSave={handleSave} onCancel={cancelEdit} />
        {:else}
          <div
            class="snippet-item"
            class:dragging={draggedIndex === index}
            class:drop-target={dropTargetIndex === index && dropPosition === 'before'}
            class:drop-target-after={dropTargetIndex === index && dropPosition === 'after'}
            role="listitem"
            draggable="true"
            ondragstart={(e) => handleDragStart(e, index)}
            ondragover={(e) => handleDragOver(e, index)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(e, index)}
            ondragend={handleDragEnd}
          >
            <div class="drag-handle">
              <Icon name="mdiDragVertical" size={20} color="#666" />
            </div>

            <div
              class="snippet-info"
              onclick={() => startEdit(snippet)}
              onkeydown={(e) => e.key === 'Enter' && startEdit(snippet)}
              role="button"
              tabindex="0"
            >
              <div class="snippet-name-row">
                <span class="snippet-name">{snippet.name}</span>
                {#if snippet.id.startsWith('default-')}
                  <span class="default-badge">Výchozí</span>
                {/if}
              </div>
              <span class="snippet-code">{snippet.code}</span>
              {#if snippet.description}
                <span class="snippet-description">{snippet.description}</span>
              {/if}
            </div>

            <div class="snippet-actions">
              <button
                class="action-button"
                onclick={() => startEdit(snippet)}
                title="Upravit snippet"
              >
                <Icon name="mdiPencil" size={20} color="#285597" />
              </button>
              <button
                class="action-button delete"
                onclick={() => handleDelete(snippet)}
                title="Smazat snippet"
              >
                <Icon name="mdiTrashCan" size={20} color="#dc3545" />
              </button>
            </div>
          </div>
        {/if}
      {/each}

      {#if SNIPPETS.length === 0}
        <div class="empty-state">
          <Icon name="mdiFileCodeOutline" size={48} color="#ccc" />
          <p>Žádné snippety. Klikněte na "Nový snippet" pro vytvoření.</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="dialog-footer">
    <Button onClick={closeDialog} primary>Zavřít</Button>
  </div>
</dialog>

<style lang="scss">
  .snippets-manager-dialog {
    border: none;
    border-radius: 12px;
    padding: 0;
    width: 600px;
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

  .snippets-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .snippet-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      border-color: #285597;
      box-shadow: 0 2px 8px rgba(40, 85, 151, 0.1);
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
  }

  .drag-handle {
    display: flex;
    align-items: center;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .snippet-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    cursor: pointer;

    &:hover {
      .snippet-name {
        color: #285597;
      }
    }
  }

  .snippet-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .snippet-name {
    font-weight: 600;
    font-size: 1rem;
    color: #333;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    transition: color 0.2s;
  }

  .default-badge {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    background: #e3f2fd;
    color: #285597;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .snippet-code {
    font-size: 0.85rem;
    color: #666;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    background: #f5f5f5;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 350px;
  }

  .snippet-description {
    font-size: 0.85rem;
    color: #888;
    font-style: italic;
  }

  .snippet-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f0f0f0;
    }

    &.delete:hover {
      background: #ffe0e0;
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #999;
    text-align: center;

    p {
      margin-top: 1rem;
      font-size: 0.95rem;
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

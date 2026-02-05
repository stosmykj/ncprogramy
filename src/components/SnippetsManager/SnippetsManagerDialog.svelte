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
      <Icon name="mdiInformationOutline" size={20} color="var(--color-primary)" />
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
              <Icon name="mdiDragVertical" size={20} color="var(--color-text-secondary)" />
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
                <Icon name="mdiPencil" size={20} color="var(--color-primary)" />
              </button>
              <button
                class="action-button delete"
                onclick={() => handleDelete(snippet)}
                title="Smazat snippet"
              >
                <Icon name="mdiTrashCan" size={20} color="var(--color-danger)" />
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
    border-radius: var(--radius-xl);
    padding: 0;
    width: 600px;
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
    padding: var(--space-8);
    border-bottom: 1px solid var(--color-border-lighter);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;

    h2 {
      margin: 0;
      font-size: var(--font-size-xl);
      color: var(--color-primary);
    }

    .header-actions {
      display: flex;
      gap: var(--space-4);
      align-items: center;
    }
  }

  .dialog-body {
    padding: var(--space-8);
    overflow-y: auto;
    max-height: calc(85vh - 200px);
  }

  .instructions {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6);
    background: #fff3cd;
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-8);
    font-size: var(--font-size-base);
    color: #856404;
  }

  .snippets-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .snippet-item {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6);
    background: var(--color-bg);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    transition: all var(--transition-base);

    &:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
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
    gap: var(--space-2);
    cursor: pointer;

    &:hover {
      .snippet-name {
        color: var(--color-primary);
      }
    }
  }

  .snippet-name-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .snippet-name {
    font-weight: 600;
    font-size: var(--font-size-md);
    color: var(--color-text);
    font-family: var(--font-mono);
    transition: color var(--transition-base);
  }

  .default-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-2xs);
    font-weight: 600;
    text-transform: uppercase;
  }

  .snippet-code {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    background: var(--color-bg-muted);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 350px;
  }

  .snippet-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .snippet-actions {
    display: flex;
    gap: var(--space-4);
  }

  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-base);

    &:hover {
      background: var(--color-bg-muted);
    }

    &.delete:hover {
      background: var(--color-danger-light);
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--color-text-muted);
    text-align: center;

    p {
      margin-top: var(--space-6);
      font-size: var(--font-size-base);
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-6);
    padding: var(--space-8);
    border-top: 1px solid var(--color-border-lighter);
    background: var(--color-bg-subtle);
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }
</style>

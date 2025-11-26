<script lang="ts">
  import type { Snippet } from '../../models/snippet';
  import Button from '../Button.svelte';

  let {
    snippet = null,
    onSave,
    onCancel,
  }: {
    snippet: Snippet | null;
    onSave: (data: { name: string; code: string; description: string }) => void;
    onCancel: () => void;
  } = $props();

  let name = $state(snippet?.name ?? '');
  let code = $state(snippet?.code ?? '');
  let description = $state(snippet?.description ?? '');

  const isEditing = $derived(snippet !== null);
  const isValid = $derived(name.trim().length > 0 && code.trim().length > 0);

  function handleSave() {
    if (!isValid) return;
    onSave({
      name: name.trim(),
      code: code.trim(),
      description: description.trim(),
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey && isValid) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="snippet-editor" onkeydown={handleKeyDown}>
  <h3>{isEditing ? 'Upravit snippet' : 'Nový snippet'}</h3>

  <div class="form-row">
    <label>
      Název (zobrazí se na tlačítku):
      <input
        type="text"
        bind:value={name}
        placeholder="např. G00, M06, Tool Change"
        maxlength="20"
      />
    </label>
  </div>

  <div class="form-row">
    <label>
      G-code:
      <textarea bind:value={code} placeholder="G00 X0 Y0 Z0" rows="3"></textarea>
    </label>
  </div>

  <div class="form-row">
    <label>
      Popis (tooltip):
      <input type="text" bind:value={description} placeholder="např. Rychloposuv" />
    </label>
  </div>

  <div class="form-actions">
    <Button onClick={onCancel}><span>Zrušit</span></Button>
    <Button onClick={handleSave} success disabled={!isValid}>
      <span>{isEditing ? 'Uložit' : 'Vytvořit'}</span>
    </Button>
  </div>
</div>

<style lang="scss">
  .snippet-editor {
    background: #e3f2fd;
    border: 2px solid #285597;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;

    h3 {
      margin: 0 0 1rem 0;
      color: #285597;
      font-size: 1.1rem;
    }
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
    textarea {
      padding: 0.5rem;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: #285597;
      }
    }

    textarea {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      resize: vertical;
      min-height: 60px;
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>

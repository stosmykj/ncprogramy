<script lang="ts">
  let {
    value = $bindable(null),
    onSave,
    onCancel,
    autoFocus = true,
    rows = 3,
  }: {
    value: string | null;
    onSave: (value: string | null) => void;
    onCancel: () => void;
    autoFocus?: boolean;
    rows?: number;
  } = $props();

  let textareaRef: HTMLTextAreaElement | undefined = $state();

  $effect(() => {
    if (autoFocus && textareaRef) {
      textareaRef.focus();
      textareaRef.select();
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }
</script>

<div class="textarea-editor">
  <textarea
    bind:this={textareaRef}
    bind:value
    onkeydown={handleKeyDown}
    {rows}
    aria-label="Poznámka"
  ></textarea>
</div>

<style lang="scss">
  .textarea-editor {
    width: 100%;
    height: 100%;

    textarea {
      width: 100%;
      height: 100%;
      padding: var(--space-4);
      border: none;
      outline: none;
      font-family: inherit;
      font-size: inherit;
      background: transparent;
      resize: none;
      min-height: 80px;

      &:focus {
        outline: none;
      }
    }
  }
</style>

<script lang="ts">
  let {
    value = $bindable(null),
    onSave,
    onCancel,
    autoFocus = true,
  }: {
    value: number | null;
    onSave: (value: number | null) => void;
    onCancel: () => void;
    autoFocus?: boolean;
  } = $props();

  let inputRef: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (autoFocus && inputRef) {
      inputRef.focus();
      inputRef.select();
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

<div class="number-editor">
  <input
    bind:this={inputRef}
    type="number"
    bind:value
    onkeydown={handleKeyDown}
    aria-label="Číselná hodnota"
  />
</div>

<style lang="scss">
  .number-editor {
    width: 100%;
    height: 100%;

    input {
      width: 100%;
      height: 100%;
      padding: 8px;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: inherit;
      background: transparent;

      &:focus {
        outline: none;
      }
    }
  }
</style>

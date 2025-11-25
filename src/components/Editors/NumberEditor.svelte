<script lang="ts">
  let {
    value = $bindable(null),
    onSave,
    onCancel,
    autoFocus = true,
    min,
    max,
    required = false,
  }: {
    value: number | null;
    onSave: (value: number | null) => void;
    onCancel: () => void;
    autoFocus?: boolean;
    min?: number;
    max?: number;
    required?: boolean;
  } = $props();

  let inputRef: HTMLInputElement | undefined = $state();
  let hasError = $state(false);
  let errorMessage = $state('');

  $effect(() => {
    if (autoFocus && inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  });

  function validate(): boolean {
    if (required && (value === null || value === undefined)) {
      hasError = true;
      errorMessage = 'Toto pole je povinné';
      return false;
    }

    if (value !== null && value !== undefined) {
      if (min !== undefined && value < min) {
        hasError = true;
        errorMessage = `Minimální hodnota je ${min}`;
        return false;
      }

      if (max !== undefined && value > max) {
        hasError = true;
        errorMessage = `Maximální hodnota je ${max}`;
        return false;
      }
    }

    hasError = false;
    errorMessage = '';
    return true;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (validate()) {
        onSave(value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }
</script>

<div class="number-editor" class:has-error={hasError}>
  <input
    bind:this={inputRef}
    type="number"
    bind:value
    onkeydown={handleKeyDown}
    aria-label="Číselná hodnota"
    aria-invalid={hasError}
    {min}
    {max}
  />
  {#if hasError && errorMessage}
    <div class="error-message">{errorMessage}</div>
  {/if}
</div>

<style lang="scss">
  .number-editor {
    position: relative;
    width: 100%;
    height: 100%;

    &.has-error {
      input {
        background: #fef2f2;
        color: #991b1b;
      }
    }

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

    .error-message {
      position: absolute;
      bottom: -20px;
      left: 0;
      font-size: 11px;
      color: #dc2626;
      white-space: nowrap;
    }
  }
</style>

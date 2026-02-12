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
    value: string | null;
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

  // Convert string to number for validation
  const numericValue = $derived.by(() => {
    if (value === null || value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  });

  $effect(() => {
    if (autoFocus && inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  });

  function validate(): boolean {
    if (required && numericValue === null) {
      hasError = true;
      errorMessage = 'Toto pole je povinné';
      return false;
    }

    if (numericValue !== null) {
      if (min !== undefined && numericValue < min) {
        hasError = true;
        errorMessage = `Minimální hodnota je ${min}`;
        return false;
      }

      if (max !== undefined && numericValue > max) {
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
        onSave(numericValue);
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
    type="text"
    inputmode="decimal"
    bind:value
    onkeydown={handleKeyDown}
    aria-label="Číselná hodnota"
    aria-invalid={hasError}
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
        background: var(--color-danger-light);
        color: #991b1b;
      }
    }

    input {
      width: 100%;
      height: 100%;
      padding: var(--space-3);
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
      font-size: var(--font-size-2xs);
      color: var(--color-danger);
      white-space: nowrap;
    }
  }
</style>

<script lang="ts">
  import Button from '../Button.svelte';

  let {
    value = $bindable(null),
    onSave,
    onCancel,
    suggestions = [],
    autoFocus = true,
    placeholder = '',
    required = false,
  }: {
    value: string | null;
    onSave: (value: string | null) => void;
    onCancel: () => void;
    suggestions?: string[];
    autoFocus?: boolean;
    placeholder?: string;
    required?: boolean;
  } = $props();

  let inputRef: HTMLInputElement | undefined = $state();
  let showSuggestions = $state(false);
  let selectedSuggestionIndex = $state(-1);
  let filteredSuggestions = $state<string[]>([]);
  let hasError = $state(false);
  let errorMessage = $state('');

  function validate(): boolean {
    if (required && (!value || value.trim() === '')) {
      hasError = true;
      errorMessage = 'Toto pole je povinné';
      return false;
    }
    hasError = false;
    errorMessage = '';
    return true;
  }

  $effect(() => {
    if (autoFocus && inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  });

  function handleInput() {
    if (!value || value.length < 2) {
      showSuggestions = false;
      return;
    }

    filteredSuggestions = suggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(value?.toLowerCase() ?? '')
    );

    showSuggestions = filteredSuggestions.length > 0;
    selectedSuggestionIndex = -1;
  }

  function selectSuggestion(suggestion: string) {
    value = suggestion;
    showSuggestions = false;
    selectedSuggestionIndex = -1;
    inputRef?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestionIndex = Math.min(
          selectedSuggestionIndex + 1,
          filteredSuggestions.length - 1
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (validate()) {
        onSave(value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (showSuggestions) {
        showSuggestions = false;
      } else {
        onCancel();
      }
    }
  }
</script>

<div class="text-editor" class:has-error={hasError}>
  <input
    bind:this={inputRef}
    type="text"
    bind:value
    oninput={handleInput}
    onkeydown={handleKeyDown}
    {placeholder}
    autocomplete="off"
    aria-label="Textová hodnota"
    aria-invalid={hasError}
  />
  {#if hasError && errorMessage}
    <div class="error-message">{errorMessage}</div>
  {/if}
  {#if showSuggestions && filteredSuggestions.length > 0}
    <div class="suggestions-dropdown">
      {#each filteredSuggestions as suggestion, index}
        <Button
          onClick={() => selectSuggestion(suggestion)}
          class="full-total"
          primary
          selected={index === selectedSuggestionIndex}
          style="border-radius: 0"
        >
          {suggestion}
        </Button>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .text-editor {
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

    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: var(--space-2);
      background: var(--color-bg);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      max-height: 200px;
      overflow-y: auto;
      z-index: var(--z-dropdown);

    }
  }
</style>

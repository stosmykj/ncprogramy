<script lang="ts">
  import Button from '../Button.svelte';

  let {
    value = $bindable(null),
    onSave,
    onCancel,
    suggestions = [],
    autoFocus = true,
    placeholder = '',
  }: {
    value: string | null;
    onSave: (value: string | null) => void;
    onCancel: () => void;
    suggestions?: string[];
    autoFocus?: boolean;
    placeholder?: string;
  } = $props();

  let inputRef: HTMLInputElement | undefined = $state();
  let showSuggestions = $state(false);
  let selectedSuggestionIndex = $state(-1);
  let filteredSuggestions = $state<string[]>([]);

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
      onSave(value);
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

<div class="text-editor">
  <input
    bind:this={inputRef}
    type="text"
    bind:value
    oninput={handleInput}
    onkeydown={handleKeyDown}
    {placeholder}
    autocomplete="off"
    aria-label="Textová hodnota"
  />
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

    .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid #e4e7ec;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 200px;
      overflow-y: auto;
      z-index: 100;

      .suggestion-item {
        width: 100%;
        padding: 8px 12px;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        color: #344054;
        transition: 0.1s ease;

        &:hover,
        &.selected {
          background: #f0f9ff;
          color: #285597;
        }

        &:not(:last-child) {
          border-bottom: 1px solid #f2f4f7;
        }
      }
    }
  }
</style>

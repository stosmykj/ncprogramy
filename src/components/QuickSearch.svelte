<script lang="ts">
  import { DATA_VARS } from '$lib/dataProcessor.svelte';
  import { onMount } from 'svelte';
  import KeyboardShortcut from './KeyboardShortcut.svelte';
  import Button from './Button.svelte';

  let inputElement: HTMLInputElement | null = $state(null);
  let searchValue = $state('');

  // Debounce search to avoid excessive queries
  $effect(() => {
    // Track searchValue changes
    const currentValue = searchValue;

    const timeoutId = setTimeout(() => {
      DATA_VARS.quickSearch = currentValue;
      DATA_VARS.reloadData = true;
    }, 300);

    // Cleanup function to clear timeout when effect re-runs
    return () => {
      clearTimeout(timeoutId);
    };
  });

  function clearSearch() {
    searchValue = '';
    DATA_VARS.quickSearch = '';
    DATA_VARS.reloadData = true;
    inputElement?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      clearSearch();
    } else if (event.key === 'Enter') {
      // Prevent Enter from triggering cell edit when typing in search
      event.preventDefault();
      event.stopPropagation();

      // Execute search immediately (the effect will handle the update)
      DATA_VARS.quickSearch = searchValue;
      DATA_VARS.reloadData = true;
    }
  }

  onMount(() => {
    // Global keyboard shortcut: Ctrl+F to focus search
    const globalHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        inputElement?.focus();
      }
    };

    window.addEventListener('keydown', globalHandler);
    return () => window.removeEventListener('keydown', globalHandler);
  });
</script>

<div class="quick-search">
  <div class="search-icon">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
      <path d="M16 16L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </div>

  <input
    bind:this={inputElement}
    bind:value={searchValue}
    onkeydown={handleKeydown}
    type="text"
    class="search-input"
    placeholder="Vyhledat ve všech sloupcích..."
  />

  {#if searchValue}
    <Button
      onClick={clearSearch}
      icon="mdiClose"
      primary
      style="background: var(--color-primary-hover); margin-right: var(--space-4); border-radius: var(--radius-sm); padding: var(--space-1); height: 23px"
    />
  {/if}

  <KeyboardShortcut keys="Ctrl+F" />
</div>

<style lang="scss">
  .quick-search {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 500px;
    margin: 0;
    background: var(--color-primary);
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-lg);
    padding: 0 var(--space-4);
    transition: all var(--transition-base);

    &:focus-within {
      border-color: #3c8be6;
      box-shadow: var(--input-focus-ring);
    }

    .search-icon {
      display: flex;
      align-items: center;
      color: var(--color-text-on-primary);
      margin-right: var(--space-3);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      padding: var(--space-3) 0;
      font-size: var(--font-size-base);
      font-family: inherit;
      background: transparent;
      color: var(--color-text-on-primary);

      &::placeholder {
        color: var(--color-text-on-primary);
      }
    }
  }
</style>

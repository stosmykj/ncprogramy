<script lang="ts">
  import { DateInput, localeFromDateFnsLocale } from 'date-picker-svelte';
  import { cs } from 'date-fns/locale';
  import Button from './Button.svelte';

  let {
    value = $bindable(null),
    type = 'date',
    placeholder = '',
    class: className = '',
    disabled = false,
    autoFocus = false,
  }: {
    value: Date | null;
    type?: 'date' | 'datetime';
    placeholder?: string;
    class?: string;
    disabled?: boolean;
    autoFocus?: boolean;
  } = $props();

  const format = type === 'date' ? 'dd. MM. yyyy' : 'dd. MM. yyyy HH:mm';
  const timePrecision = type === 'datetime' ? 'minute' : null;

  let wrapperRef: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (autoFocus && wrapperRef) {
      // Use setTimeout to ensure the DateInput component has rendered its internal input
      setTimeout(() => {
        const input = wrapperRef?.querySelector('input');
        if (input) {
          input.focus();
          input.select();
          // Also click to open the picker
          input.click();
        }
      }, 50);
    }
  });

  function clearDateTime() {
    value = null;
  }
</script>

<div class="date-picker-wrapper {className}" bind:this={wrapperRef}>
  <DateInput
    bind:value
    {format}
    {timePrecision}
    {placeholder}
    {disabled}
    locale={localeFromDateFnsLocale(cs)}
  />
  {#if value}
    <div class="clear-button">
      <Button onClick={clearDateTime} icon="mdiClose" onlyIcon />
    </div>
  {/if}
</div>

<style lang="scss">
  .date-picker-wrapper {
    position: relative;
    width: 100%;

    // Style the input field
    :global(.date-time-field) {
      width: 100%;
      height: var(--input-height);
      border: var(--input-border);
      border-radius: var(--input-radius);
      font-size: var(--font-size-base);
      font-family: inherit;
      background: var(--color-bg);
      box-sizing: border-box;
      transition: all var(--transition-base);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }

      &:disabled {
        background: var(--color-bg-subtle);
        color: var(--color-text-muted);
        cursor: not-allowed;
      }

      &::placeholder {
        color: var(--color-text-muted);
      }
    }

    :global(.date-time-field input) {
      width: 100%;
      height: 100%;
    }

    // Style the calendar popup
    :global(.date-time-picker) {
      height: 100%;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: var(--space-6);
      z-index: var(--z-modal-nested);
    }

    // Calendar header (month/year navigation)
    :global(.picker-header) {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-4) 4px var(--space-6);
      border-bottom: 1px solid var(--color-border-lighter);
      margin-bottom: var(--space-6);
    }

    :global(.picker-header button) {
      background: transparent;
      border: none;
      color: var(--color-text);
      cursor: pointer;
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-base);
      font-weight: 500;
      transition: all var(--transition-base);

      &:hover {
        background: var(--color-bg-muted);
        color: var(--color-primary);
      }
    }

    // Day names (Mon, Tue, etc.)
    :global(.weekdays) {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    :global(.weekday) {
      text-align: center;
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-secondary);
      padding: var(--space-2);
    }

    // Calendar days
    :global(.days) {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: var(--space-1);
    }

    :global(.day) {
      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      color: var(--color-text);
      cursor: pointer;
      transition: all var(--transition-base);
      font-weight: 400;

      &:hover {
        background: var(--color-bg-muted);
        color: var(--color-primary);
      }

      &.selected {
        background: var(--color-primary) !important;
        color: var(--color-text-on-primary) !important;
        font-weight: 600;
      }

      &.today {
        border: 1px solid var(--color-primary);
        font-weight: 600;
      }

      &.disabled {
        color: var(--color-border);
        cursor: not-allowed;
        &:hover {
          background: transparent;
        }
      }

      &.outside-month {
        color: var(--color-text-muted);
      }
    }

    // Time picker section
    :global(.time-picker) {
      border-top: 1px solid var(--color-border-lighter);
      padding-top: var(--space-6);
      margin-top: var(--space-6);
      display: flex;
      gap: var(--space-4);
      align-items: center;
      justify-content: center;
    }

    :global(.time-picker input) {
      width: 60px;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-base);
      text-align: center;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: var(--input-focus-ring);
      }
    }

    :global(.time-separator) {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .clear-button {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      right: var(--space-4);
      height: 100%;
      z-index: 10;
    }
  }
</style>
